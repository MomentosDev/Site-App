(function () {
  'use strict';

  const SUPPORTED = ['pt-BR', 'en'];
  const DEFAULT_LANG = 'pt-BR';
  const STORAGE_KEY = 'lang';

  const isDebug = (() => {
    try {
      return ['localhost', '127.0.0.1'].includes(window.location.hostname);
    } catch {
      return false;
    }
  })();

  const originalTextByNode = new WeakMap();
  const originalAttrsByEl = new WeakMap();

  const localesByLang = new Map();
  let currentLang = DEFAULT_LANG;

  function debugWarn(...args) {
    if (!isDebug) return;
    // eslint-disable-next-line no-console
    console.warn(...args);
  }

  function normalizeLang(raw) {
    if (!raw) return null;
    const v = String(raw).trim().toLowerCase();
    if (v === 'pt' || v === 'pt-br' || v === 'pt_br' || v === 'ptbr') return 'pt-BR';
    if (v === 'en' || v === 'en-us' || v === 'en_us') return 'en';
    return null;
  }

  function getUrlLang() {
    try {
      const url = new URL(window.location.href);
      return normalizeLang(url.searchParams.get('lang'));
    } catch {
      return null;
    }
  }

  function setUrlLang(lang, { replace } = { replace: true }) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    if (replace) window.history.replaceState({}, '', url.toString());
    else window.history.pushState({}, '', url.toString());
  }

  function getStoredLang() {
    try {
      return normalizeLang(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function setStoredLang(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }

  function detectBrowserLang() {
    const candidates = [];
    try {
      if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
      if (navigator.language) candidates.push(navigator.language);
    } catch {
      // ignore
    }

    const normalized = candidates
      .filter(Boolean)
      .map((l) => String(l).trim().toLowerCase());

    const isPortuguese = normalized.some((l) => l === 'pt' || l.startsWith('pt-') || l.startsWith('pt_'));
    return isPortuguese ? 'pt-BR' : 'en';
  }

  function pickInitialLang() {
    return getUrlLang() || getStoredLang() || detectBrowserLang() || DEFAULT_LANG;
  }

  async function loadLocale(lang) {
    if (localesByLang.has(lang)) return localesByLang.get(lang);

    const res = await fetch(`/locales/${lang}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load locale ${lang}: ${res.status}`);

    const json = await res.json();
    localesByLang.set(lang, json);
    return json;
  }

  function getLocale() {
    return localesByLang.get(currentLang) || { lang: currentLang, strings: {}, meta: {} };
  }

  function isIgnoredTextNode(textNode) {
    const parent = textNode.parentNode;
    if (!parent || parent.nodeType !== Node.ELEMENT_NODE) return false;

    const tag = parent.tagName ? parent.tagName.toLowerCase() : '';
    if (tag === 'script' || tag === 'style' || tag === 'noscript') return true;
    if (tag === 'svg' || tag === 'path') return true;
    return false;
  }

  function translateTextNodes(root) {
    const { strings } = getLocale();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      if (isIgnoredTextNode(node)) continue;

      if (!originalTextByNode.has(node)) originalTextByNode.set(node, node.nodeValue);
      const original = originalTextByNode.get(node);
      const trimmed = original.trim();

      if (currentLang === DEFAULT_LANG) {
        node.nodeValue = original;
        continue;
      }

      const translated = strings && Object.prototype.hasOwnProperty.call(strings, trimmed) ? strings[trimmed] : null;
      if (translated == null) {
        node.nodeValue = original;
        continue;
      }

      node.nodeValue = original.replace(trimmed, translated);
    }
  }

  function getOriginalAttrValue(el, attr) {
    if (!originalAttrsByEl.has(el)) originalAttrsByEl.set(el, {});
    const store = originalAttrsByEl.get(el);
    if (!(attr in store)) store[attr] = el.getAttribute(attr);
    return store[attr];
  }

  function setAttrTranslated(el, attr, translatedValue) {
    if (translatedValue == null) el.removeAttribute(attr);
    else el.setAttribute(attr, translatedValue);
  }

  function translateAttributes(root, attrs) {
    const { strings } = getLocale();

    for (const attr of attrs) {
      const els = root.querySelectorAll ? root.querySelectorAll(`[${attr}]`) : [];
      for (const el of els) {
        const original = getOriginalAttrValue(el, attr);
        if (original == null) continue;

        if (currentLang === DEFAULT_LANG) {
          setAttrTranslated(el, attr, original);
          continue;
        }

        const key = String(original).trim();
        const translated = strings && Object.prototype.hasOwnProperty.call(strings, key) ? strings[key] : null;
        setAttrTranslated(el, attr, translated == null ? original : translated);
      }
    }
  }

  function translateMetaDescription() {
    const meta = document.querySelector('meta[name="description"]');
    if (!meta) return;

    const original = getOriginalAttrValue(meta, 'content') || '';
    if (!original) return;

    const locale = getLocale();
    const descriptionMap = locale.meta && locale.meta.description ? locale.meta.description : {};

    if (currentLang === DEFAULT_LANG) {
      meta.setAttribute('content', original);
      return;
    }

    const translated = Object.prototype.hasOwnProperty.call(descriptionMap, original) ? descriptionMap[original] : null;
    if (translated) meta.setAttribute('content', translated);
  }

  function applyAll(root = document) {
    translateTextNodes(root);
    translateAttributes(root, ['alt', 'aria-label', 'title', 'placeholder']);
    translateMetaDescription();
  }

  function isExternalUrl(url) {
    try {
      return url.origin !== window.location.origin;
    } catch {
      return true;
    }
  }

  function withLang(href, lang = currentLang) {
    if (!href) return href;
    const raw = String(href);
    const trimmed = raw.trim();

    if (
      trimmed.startsWith('#') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('sms:') ||
      trimmed.startsWith('javascript:')
    ) {
      return href;
    }

    let url;
    try {
      url = new URL(trimmed, window.location.href);
    } catch {
      return href;
    }

    if (isExternalUrl(url)) return href;

    url.searchParams.set('lang', lang);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function patchLinks(root = document) {
    const anchors = root.querySelectorAll ? root.querySelectorAll('a[href]') : [];
    for (const a of anchors) {
      const href = a.getAttribute('href');
      const next = withLang(href);
      if (next && next !== href) a.setAttribute('href', next);
    }
  }

  function installLinkInterceptor() {
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!target) return;
        const href = target.getAttribute('href');
        const next = withLang(href);
        if (!next || next === href) return;
        target.setAttribute('href', next);
      },
      true
    );
  }

  function createLanguageSwitcher() {
    if (document.getElementById('i18n-switcher')) return;

    const styleId = 'i18n-switcher-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #i18n-switcher{position:fixed;top:12px;right:12px;z-index:9999;display:flex;gap:8px}
        #i18n-switcher button{appearance:none;border:1px solid rgba(255,255,255,.45);background:rgba(0,0,0,.45);color:#fff;padding:6px 10px;border-radius:999px;font:600 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:pointer}
        #i18n-switcher button[aria-pressed=\"true\"]{border-color:rgba(255,255,255,.9);background:rgba(255,255,255,.15)}
      `;
      document.head.appendChild(style);
    }

    const container = document.createElement('div');
    container.id = 'i18n-switcher';

    const ptBtn = document.createElement('button');
    ptBtn.type = 'button';
    ptBtn.textContent = 'PT';
    ptBtn.addEventListener('click', () => window.i18n.setLang('pt-BR'));

    const enBtn = document.createElement('button');
    enBtn.type = 'button';
    enBtn.textContent = 'EN';
    enBtn.addEventListener('click', () => window.i18n.setLang('en'));

    container.appendChild(ptBtn);
    container.appendChild(enBtn);
    document.body.appendChild(container);

    window.i18n._updateSwitcherState();
  }

  function updateSwitcherState() {
    const container = document.getElementById('i18n-switcher');
    if (!container) return;
    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      const isPt = btn.textContent === 'PT';
      const isPressed = isPt ? currentLang === 'pt-BR' : currentLang === 'en';
      btn.setAttribute('aria-pressed', String(isPressed));
    }
  }

  function observeDomInsertions() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
          applyAll(node);
          patchLinks(node);
        }
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function setLang(lang, { replaceUrl = true } = {}) {
    const normalized = normalizeLang(lang) || DEFAULT_LANG;
    currentLang = normalized;

    setStoredLang(normalized);
    setUrlLang(normalized, { replace: replaceUrl });
    document.documentElement.lang = normalized;

    try {
      await loadLocale(normalized);
    } catch (err) {
      debugWarn('[i18n] locale load failed:', err);
    }

    applyAll(document);
    patchLinks(document);
    updateSwitcherState();
  }

  window.i18n = {
    getLang: () => currentLang,
    setLang,
    withLang,
    apply: applyAll,
    _updateSwitcherState: updateSwitcherState
  };

  const initial = pickInitialLang();
  currentLang = initial;
  document.documentElement.lang = initial;
  setUrlLang(initial, { replace: true });

  installLinkInterceptor();

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await loadLocale(currentLang);
    } catch (err) {
      debugWarn('[i18n] locale load failed:', err);
    }

    createLanguageSwitcher();
    applyAll(document);
    patchLinks(document);
    observeDomInsertions();
  });
})();

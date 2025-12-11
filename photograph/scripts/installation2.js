/**
 * installation.js
 * Versão completa: detecção iOS + botão único + toggle de versão dentro das instruções
 * - IDs esperados no HTML:
 *   android-btn, ios-btn, insta-btn
 *   android-instructions, ios-instructions, ios-old-instructions, instagram-instructions
 *   instalCelMenu (opcional - local do menu)
 *   install-btn (opcional)
 *
 * Notas:
 * - Se o bloco #ios-version-container não existir no HTML, o script cria dinamicamente
 *   e insere dentro da coluna de instruções (próximo às divs de instrução iOS).
 * - Animação "hide -> show" feita com classes .fade-in / .fade-out + .hidden.
 * - Se o userAgent não trouxer versão do iOS (comum em emuladores), o script mostra
 *   aviso e pede que o usuário escolha manualmente.
 */

(function () {
  'use strict';

  // ---------- CONFIG (IDs) ----------
  const IDS = {
    btnAndroid: 'android-btn',
    btnIOS: 'ios-btn',
    btnInsta: 'insta-btn',
    secAndroid: 'android-instructions',
    secIOS: 'ios-instructions',
    secIOSOld: 'ios-old-instructions',
    secInsta: 'instagram-instructions',
    installBtn: 'install-btn',
    menuContainer: 'instalCelMenu', // opcional local onde o menu fica
    iosVersionContainer: 'ios-version-container'
  };

  // ---------- CACHE DOM ----------
  const $btnAndroid = document.getElementById(IDS.btnAndroid);
  const $btnIOS = document.getElementById(IDS.btnIOS);
  const $btnInsta = document.getElementById(IDS.btnInsta);
  const $secAndroid = document.getElementById(IDS.secAndroid);
  const $secIOS = document.getElementById(IDS.secIOS);
  const $secIOSOld = document.getElementById(IDS.secIOSOld);
  const $secInsta = document.getElementById(IDS.secInsta);
  const $installBtn = document.getElementById(IDS.installBtn);
  const $menuContainer = document.getElementById(IDS.menuContainer);

  // agrupados para iterações
  const allButtons = [$btnAndroid, $btnIOS, $btnInsta].filter(Boolean);
  const allSections = [$secAndroid, $secIOS, $secIOSOld, $secInsta].filter(Boolean);

  // ---------- UTILIDADES ----------
  function safeInt(v, fallback = null) {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : n;
  }

  function isIOS() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    // iPadOS on desktop Safari reports MacIntel + touchpoints
    if (platform === 'MacIntel' && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true;
    return false;
  }

  function getIOSMajorVersion() {
    const ua = navigator.userAgent || '';
    // Match "OS 26" or "OS 26_3"
    const m = ua.match(/OS (\d+)(?:[_\.]\d+)?/i);
    if (!m) return null;
    return safeInt(m[1], null);
  }

  function isInstagramWebView() {
    return /Instagram/i.test(navigator.userAgent || '');
  }

  function isSafariOnIOS() {
    const ua = navigator.userAgent || '';
    // Safari contains "Safari" but not "CriOS" (Chrome iOS), not "FxiOS" (Firefox), not "Instagram"
    if (!/Safari/i.test(ua)) return false;
    if (/CriOS|FxiOS|Instagram|Chrome/i.test(ua)) return false;
    return true;
  }

  // ---------- ANIMAÇÕES / VISUAL ----------

  // As seguintes classes são assumidas no CSS:
  // .hidden { display: none; } .fade-in { animation: fadeIn .22s ease }
  // .fade-out { animation: fadeOut .18s ease }
  // Se não possuir essas classes, o script ainda funcionará, só sem animação.

  function hideSectionImmediate(sec) {
    if (!sec || sec.classList.contains('hidden')) return;
    sec.classList.remove('fade-in');
    sec.classList.add('fade-out');
    sec.setAttribute('aria-hidden', 'true');

    // espera animação acabar antes de adicionar hidden definitivamente
    setTimeout(() => {
      sec.classList.add('hidden');
      sec.classList.remove('fade-out');
    }, 200);
  }

  function showSection(targetEl) {
    if (!targetEl) return;

    // se já visível e sem fade-out, não faz nada
    if (!targetEl.classList.contains('hidden') && !targetEl.classList.contains('fade-out')) return;

    // esconder todas as outras com animação
    allSections.forEach((sec) => {
      if (!sec || sec === targetEl) return;
      hideSectionImmediate(sec);
    });

    // aguarda a saída antes de mostrar nova (evita sobreposição)
    setTimeout(() => {
      targetEl.classList.remove('hidden');
      // forçar reflow para garantir animação
      // eslint-disable-next-line no-unused-expressions
      targetEl.offsetWidth;
      targetEl.classList.remove('fade-out');
      targetEl.classList.add('fade-in');
      targetEl.setAttribute('aria-hidden', 'false');

      // limpar classe de animação após terminar
      setTimeout(() => {
        targetEl.classList.remove('fade-in');
      }, 240);
    }, 220);
  }

  // Gerencia estado visual de botão ativo no menu
  function setActiveMenuButton(activeBtn) {
    allButtons.forEach((btn) => {
      if (!btn) return;
      if (btn === activeBtn) {
        btn.classList.add('device-btn-active');
        btn.classList.remove('device-btn-inactive');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('device-btn-active');
        btn.classList.add('device-btn-inactive');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // ---------- iOS version selector (dentro da coluna de instruções) ----------
  // O script tenta localizar #ios-version-container; se não existir, cria e insere junto às instruções iOS.
  function ensureIosVersionContainer() {
    let container = document.getElementById(IDS.iosVersionContainer);
    if (container) return container;

    // tenta inserir próximo à primeira seção iOS encontrada
    const insertAfter = $secIOS || $secIOSOld || allSections[0] || document.body;
    container = document.createElement('div');
    container.id = IDS.iosVersionContainer;
    container.className = 'ml-0 hidden'; // escondido por padrão; mostrado quando fluxo iOS estiver ativo

    // HTML do toggle (underline será controlado por aria-pressed)
    container.innerHTML = `
      <div id="ios-detect-warning" class="text-sm text-yellow-400 mb-2 hidden" role="status" aria-live="polite">
        Não foi possível detectar a versão do iOS no seu navegador. Escolha a opção correta abaixo.
      </div>
      <nav aria-label="Escolha versão iOS" class="flex gap-3 items-end justify-start pb-2">
        <button id="ios-version-new" class="ios-version-btn text-base font-semibold pb-2 relative" aria-pressed="false" type="button">
          iOS 26+
          <span class="ios-underline absolute left-0 right-0 bottom-0 h-1 opacity-0"></span>
        </button>
        <button id="ios-version-old" class="ios-version-btn text-base font-semibold pb-2 relative" aria-pressed="false" type="button">
          iOS 26 e anteriores
          <span class="ios-underline absolute left-0 right-0 bottom-0 h-1 opacity-0"></span>
        </button>
      </nav>
    `;

    // se encontramos um container de menu para colocar (menuContainer), vamos anexar lá; senão após a primeira seção iOS
    if ($menuContainer) {
      $menuContainer.appendChild(container);
    } else {
      // inserir antes da primeira seção iOS (ou no insertAfter)
      insertAfter.parentNode && insertAfter.parentNode.insertBefore(container, insertAfter);
    }

    return container;
  }

function showIosVersionContainer(show) {
  const container = ensureIosVersionContainer();
  if (show) {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}


  function setIosVersionActive(key) {
    const container = ensureIosVersionContainer();
    const newBtn = container.querySelector('#ios-version-new');
    const oldBtn = container.querySelector('#ios-version-old');
    if (!newBtn || !oldBtn) return;

    if (key === 'old') {
      newBtn.setAttribute('aria-pressed', 'false');
      oldBtn.setAttribute('aria-pressed', 'true');
      // underline visibility control via aria in CSS
      showSection($secIOSOld || $secIOS);
    } else {
      newBtn.setAttribute('aria-pressed', 'true');
      oldBtn.setAttribute('aria-pressed', 'false');
      showSection($secIOS || $secIOSOld);
    }
  }

  function attachIosVersionEvents() {
    const container = ensureIosVersionContainer();
    const newBtn = container.querySelector('#ios-version-new');
    const oldBtn = container.querySelector('#ios-version-old');
    if (!newBtn || !oldBtn) return;

    newBtn.addEventListener('click', () => {
      setIosVersionActive('new');
      newBtn.focus();
    });
    oldBtn.addEventListener('click', () => {
      setIosVersionActive('old');
      oldBtn.focus();
    });

    // keyboard accessibility
    [newBtn, oldBtn].forEach((btn) => {
      btn.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') btn.click();
      });
    });
  }

  // ---------- Fluxo de abertura iOS (chamado ao clicar botão iOS / auto-detect) ----------
 function openIosFlow() {
  setActiveMenuButton($btnIOS);
  showIosVersionContainer(true);
  attachIosVersionEvents();

  const v = getIOSMajorVersion();
  const couldDetect = v !== null;

  if (!couldDetect) {
    // sem aviso → apenas escolha visual padrão (novo)
    setIosVersionActive('new');
    return;
  }

  // regra real: <26 = antigo, >=26 = novo
  if (v < 26 && $secIOSOld) {
    setIosVersionActive('old');
  } else {
    setIosVersionActive('new');
  }
}


  // ---------- Eventos dos botões principais ----------
  function attachMainButtonEvents() {
    if ($btnAndroid) {
      $btnAndroid.addEventListener('click', () => {
        setActiveMenuButton($btnAndroid);
        showIosVersionContainer(false);
        if ($secAndroid) showSection($secAndroid);
        $btnAndroid.focus();
      });
      $btnAndroid.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') $btnAndroid.click();
      });
    }

    if ($btnIOS) {
      $btnIOS.addEventListener('click', () => {
        openIosFlow();
        $btnIOS.focus();
      });
      $btnIOS.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') $btnIOS.click();
      });
    }

    if ($btnInsta) {
      $btnInsta.addEventListener('click', () => {
        setActiveMenuButton($btnInsta);
        showIosVersionContainer(false);
        if ($secInsta) showSection($secInsta);
        $btnInsta.focus();
      });
      $btnInsta.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') $btnInsta.click();
      });
    }

    if ($installBtn) {
      $installBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        // Placeholder: customize com o fluxo de instalação real
        $installBtn.setAttribute('aria-disabled', 'true');
        $installBtn.classList.add('opacity-70', 'pointer-events-none');
        setTimeout(() => {
          $installBtn.removeAttribute('aria-disabled');
          $installBtn.classList.remove('opacity-70', 'pointer-events-none');
        }, 1000);
      });
    }
  }

  // ---------- Auto-detect e inicialização ----------
  function autoDetectAndShow() {
    // Prioridade: Instagram in-app -> iOS (versão + Safari) -> Android -> fallback Android
    if (isInstagramWebView() && $secInsta) {
      setActiveMenuButton($btnInsta);
      showIosVersionContainer(false);
      showSection($secInsta);
      return;
    }

    if (isIOS()) {
      // abrir flow iOS e tentar detectar versão
      openIosFlow();
      return;
    }

    // fallback: mostrar Android (ou primeira seção disponível)
    if ($secAndroid) {
      setActiveMenuButton($btnAndroid);
      showIosVersionContainer(false);
      showSection($secAndroid);
    } else if (allSections.length) {
      // exibir primeira seção como fallback
      const first = allSections[0];
      setActiveMenuButton($btnAndroid || $btnIOS || $btnInsta);
      showIosVersionContainer(false);
      showSection(first);
    }
  }

  // ---------- Inicial setup ----------
  function init() {
    // garante aria-hidden e hidden iniciais nas sections se existirem
    allSections.forEach((sec) => {
      if (!sec) return;
      if (!sec.classList.contains('hidden')) {
        sec.setAttribute('aria-hidden', 'false');
      } else {
        sec.setAttribute('aria-hidden', 'true');
      }
    });

    // init nos botões
    allButtons.forEach((btn) => {
      if (!btn) return;
      btn.setAttribute('role', 'button');
      if (!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex', '0');
      if (!btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', 'false');
    });

    // cria container de versão iOS se não existir (mas fica hidden até necessário)
    ensureIosVersionContainer();

    attachMainButtonEvents();
    autoDetectAndShow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // export simples para debugging / testes
  window._installSection = {
    isIOS,
    getIOSMajorVersion,
    isSafariOnIOS,
    isInstagramWebView,
    openIosFlow,
    showSection,
    setActiveMenuButton
  };
}());


// Injeta underline nos botões principais, se não existirem
(function ensureMainUnderlines() {
  const ids = ['android-btn', 'ios-btn', 'insta-btn'];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    // garante position: relative (caso CSS não carregue)
    if (getComputedStyle(btn).position === 'static') {
      btn.style.position = 'relative';
    }
    // cria span se não existir
    if (!btn.querySelector('.main-underline')) {
      const s = document.createElement('span');
      s.className = 'main-underline';
      btn.appendChild(s);
    }
  });
})();

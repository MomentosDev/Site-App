// ====================================================================================
// Install section controller - Versão ajustada conforme solicitado (iOS 26 e anteriores)
// ====================================================================================
(function () {
  'use strict';

  // ---------- Config (IDs dos elementos) ----------
  const SELECTORS = {
    buttons: {
      android: 'android-btn',
      ios: 'ios-btn',
      insta: 'insta-btn'
    },
    sections: {
      android: 'android-instructions',
      ios: 'ios-instructions',
      iosOld: 'ios-old-instructions',
      instagram: 'instagram-instructions'
    },
    installBtn: 'install-btn',
    instalMenu: 'instalCelMenu'
  };

  // ---------- Cache DOM ----------
  const $btnAndroid = document.getElementById(SELECTORS.buttons.android);
  const $btnIOS = document.getElementById(SELECTORS.buttons.ios);
  const $btnInsta = document.getElementById(SELECTORS.buttons.insta);
  const $menu = document.getElementById(SELECTORS.instalMenu);

  const $secAndroid = document.getElementById(SELECTORS.sections.android);
  const $secIOS = document.getElementById(SELECTORS.sections.ios);
  const $secIOSOld = document.getElementById(SELECTORS.sections.iosOld);
  const $secInsta = document.getElementById(SELECTORS.sections.instagram);

  const $installBtn = document.getElementById(SELECTORS.installBtn);

  const allButtons = [$btnAndroid, $btnIOS, $btnInsta].filter(Boolean);
  const allSections = [$secAndroid, $secIOS, $secIOSOld, $secInsta].filter(Boolean);

  // ---------- Helpers ----------
  function safeParseInt(v, fallback = null) {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : n;
  }

  function isIOS() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    if (platform === 'MacIntel' && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true;
    return false;
  }

  function getIOSMajorVersion() {
    const ua = navigator.userAgent || '';
    const match = ua.match(/OS (\d+)(?:[_\.](\d+))?/i);
    if (!match) return null;
    return safeParseInt(match[1], null);
  }

  function isInstagramWebView() {
    const ua = navigator.userAgent || '';
    return /Instagram/i.test(ua);
  }

  // Fade helpers: coloca fade-out na visível, depois oculta; mostra target com fade-in.
  function hideSectionImmediate(sec) {
    if (!sec || sec.classList.contains('hidden')) return;
    sec.classList.remove('fade-in');
    sec.classList.add('fade-out');
    sec.setAttribute('aria-hidden', 'true');

    setTimeout(() => {
      sec.classList.add('hidden');
      sec.classList.remove('fade-out');
    }, 220);
  }

  function showSection(targetEl) {
    if (!targetEl) return;

    // Se já visível e sem fade-out, nada a fazer
    if (!targetEl.classList.contains('hidden') && !targetEl.classList.contains('fade-out')) return;

    // Esconder todas as outras seções primeiro (com animação)
    allSections.forEach((sec) => {
      if (!sec || sec === targetEl) return;
      hideSectionImmediate(sec);
    });

    // Se já está visível mas com fade-out, espera um tick e reabre
    // Mostrar target com fade-in após garantir que está hidden
    // Garante que a instrução atual suma antes de aparecer a nova
    setTimeout(() => {
      targetEl.classList.remove('hidden');
      // Força reflow
      // eslint-disable-next-line no-unused-expressions
      targetEl.offsetWidth;
      targetEl.classList.remove('fade-out');
      targetEl.classList.add('fade-in');
      targetEl.setAttribute('aria-hidden', 'false');

      setTimeout(() => {
        targetEl.classList.remove('fade-in');
      }, 260);
    }, 230);
  }

  // Gerencia classes 'ativo' dos botões e aria-pressed
  function setActiveButton(activeBtn) {
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

    // Se o usuário escolher outro botão que não seja iOS, removemos o mini-toggle (se existir)
    if (activeBtn !== $btnIOS) {
      removeIosToggle();
    }
  }

  // Retorna elemento de seção por key
  function sectionElForKey(key) {
    switch (key) {
      case 'android': return $secAndroid;
      case 'ios': return $secIOS;
      case 'ios-old': return $secIOSOld;
      case 'instagram': return $secInsta;
      default: return null;
    }
  }

  // ---------- Mini-toggle para iOS 26+ / 26 e anteriores ----------
  const TOGGLE_ID = 'mini-ios-toggle';
  function createIosToggle() {
    // se já existe, mostra (não recria)
    if (!document.getElementById(TOGGLE_ID) && $menu) {
      const wrapper = document.createElement('div');
      wrapper.id = TOGGLE_ID;
      wrapper.className = 'mini-ios-toggle flex gap-2 items-center ml-4 md:ml-0 mt-2';
      // estilo básico; se preferir, aplique classes Tailwind existentes
      wrapper.innerHTML = `
        <button id="ios-new-btn" class="mini-toggle-btn py-1 px-3 rounded-full device-btn-inactive text-sm" aria-pressed="false" type="button">iOS 26+</button>
        <button id="ios-old-btn" class="mini-toggle-btn py-1 px-3 rounded-full device-btn-inactive text-sm" aria-pressed="false" type="button">iOS 26 e anteriores</button>
      `;
      // inserir após o botão iOS
      $menu.appendChild(wrapper);

      const $iosNewBtn = document.getElementById('ios-new-btn');
      const $iosOldBtn = document.getElementById('ios-old-btn');

      // comportamentos
      $iosNewBtn.addEventListener('click', () => {
        setMiniToggleActive($iosNewBtn);
        showSection(sectionElForKey('ios'));
        $iosNewBtn.focus();
      });
      $iosOldBtn.addEventListener('click', () => {
        setMiniToggleActive($iosOldBtn);
        showSection(sectionElForKey('ios-old'));
        $iosOldBtn.focus();
      });

      // accessibility keyboard
      [$iosNewBtn, $iosOldBtn].forEach(btn => {
        btn.addEventListener('keyup', (e) => {
          if (e.key === 'Enter' || e.key === ' ') btn.click();
        });
      });
    }
  }

  function removeIosToggle() {
    const el = document.getElementById(TOGGLE_ID);
    if (el) el.remove();
  }

  function setMiniToggleActive(activeEl) {
    const toggles = Array.from(document.querySelectorAll(`#${TOGGLE_ID} .mini-toggle-btn`));
    toggles.forEach(btn => {
      if (btn === activeEl) {
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

  // ---------- Eventos de clique / teclado (a11y) ----------
  function attachButtonBehaviors() {
    if ($btnAndroid) {
      $btnAndroid.addEventListener('click', () => {
        setActiveButton($btnAndroid);
        showSection(sectionElForKey('android'));
        $btnAndroid.focus();
      });
      $btnAndroid.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') $btnAndroid.click();
      });
    }

    if ($btnIOS) {
      $btnIOS.addEventListener('click', () => {
        setActiveButton($btnIOS);

        // cria mini-toggle (se necessário) para permitir escolher manualmente
        createIosToggle();

        // comportamento padrão: se detectamos iOS e versão <=26 -> selecionar automaticamente "26 e anteriores"
        if (isIOS()) {
          const v = getIOSMajorVersion();
          if (v !== null && v <= 26 && $secIOSOld) {
            // ativa mini-toggle no antigo
            const oldBtn = document.getElementById('ios-old-btn');
            if (oldBtn) setMiniToggleActive(oldBtn);
            showSection(sectionElForKey('ios-old'));
          } else {
            const newBtn = document.getElementById('ios-new-btn');
            if (newBtn) setMiniToggleActive(newBtn);
            showSection(sectionElForKey('ios'));
          }
        } else {
          // Caso não seja iOS, exibimos iOS padrão e deixamos o usuário escolher
          const newBtn = document.getElementById('ios-new-btn');
          if (newBtn) setMiniToggleActive(newBtn);
          showSection(sectionElForKey('ios'));
        }

        $btnIOS.focus();
      });
      $btnIOS.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') $btnIOS.click();
      });
    }

    if ($btnInsta) {
      $btnInsta.addEventListener('click', () => {
        setActiveButton($btnInsta);
        showSection(sectionElForKey('instagram'));
        $btnInsta.focus();
      });
      $btnInsta.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') $btnInsta.click();
      });
    }

    // Install button - comportamento por padrão (você pode alterar)
    if ($installBtn) {
      $installBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        console.log('Install button clicked — customize this handler to trigger a download/flow.');
        $installBtn.setAttribute('aria-disabled', 'true');
        $installBtn.classList.add('opacity-70', 'pointer-events-none');
        setTimeout(() => {
          $installBtn.removeAttribute('aria-disabled');
          $installBtn.classList.remove('opacity-70', 'pointer-events-none');
        }, 1200);
      });
    }
  }

  // ---------- Inicialização automática com detecção de ambiente ----------
  function autoDetectAndShow() {
    // Prioridade: Instagram in-app -> iOS (versão) -> Android -> fallback Android
    if (isInstagramWebView() && $secInsta) {
      setActiveButton($btnInsta);
      showSection(sectionElForKey('instagram'));
      return;
    }

    if (isIOS()) {
      setActiveButton($btnIOS);
      createIosToggle();

      const v = getIOSMajorVersion();
      if (v !== null && v <= 26 && $secIOSOld) {
        // ativa mini-toggle no antigo
        const oldBtn = document.getElementById('ios-old-btn');
        if (oldBtn) setMiniToggleActive(oldBtn);
        showSection(sectionElForKey('ios-old'));
        return;
      } else if ($secIOS) {
        const newBtn = document.getElementById('ios-new-btn');
        if (newBtn) setMiniToggleActive(newBtn);
        showSection(sectionElForKey('ios'));
        return;
      }
    }

    // fallback: Android / web
    if ($secAndroid) {
      setActiveButton($btnAndroid);
      showSection(sectionElForKey('android'));
    }
  }

  // ---------- Inicial setup ----------
  function init() {
    if (!allSections.length || !allButtons.length) {
      console.warn('Install section: alguns elementos não encontrados — verifique IDs no HTML.');
    }

    // Inicializa aria-hidden de acordo com a classe 'hidden' no HTML
    allSections.forEach((sec) => {
      if (!sec.classList.contains('hidden')) {
        sec.setAttribute('aria-hidden', 'false');
      } else {
        sec.setAttribute('aria-hidden', 'true');
      }
    });

    // Inicializa atributos dos botões
    allButtons.forEach((btn) => {
      btn.setAttribute('role', 'button');
      if (!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex', '0');
      if (!btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', 'false');
    });

    attachButtonBehaviors();
    autoDetectAndShow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export simples para depuração
  window._installSection = {
    isIOS,
    getIOSMajorVersion,
    isInstagramWebView,
    showSection,
    setActiveButton,
    createIosToggle,
    removeIosToggle
  };
}());

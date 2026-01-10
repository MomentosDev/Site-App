function onLoadPwa() {
  const installButton = document.getElementById("install-btn");
  onLoadInstallButton(installButton);
}

async function openMyPWA(path = 'app') {
  const base = `${location.protocol}//${location.host}${location.port ? ":" + location.port : ""}`;
  const langParam = new URLSearchParams(location.search).get('lang');
  const pwaUrl = (() => {
    try {
      const url = new URL(`${base}/${path}`);
      if (langParam) url.searchParams.set('lang', langParam);
      return url.toString();
    } catch {
      return `${base}/${path}`;
    }
  })();

  // Verifica se já está rodando como PWA
  if (isRunningAsPWA()) {
    window.location.href = pwaUrl;
    return;
  }

  // Tenta usar getInstalledRelatedApps()
  try {
    const relatedApps = await navigator.getInstalledRelatedApps();
    const myApp = relatedApps.find(app =>
      app.id === `${base}/manifest.json`
    );

    if (myApp) {
      // PWA está instalado - abrir
      window.location.href = pwaUrl;
      return;
    }
  } catch (error) {
    console.log('API getInstalledRelatedApps não suportada');
  }
}

function isRunningAsPWA() {
  return (window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator.standalone) ||
    (document.referrer.includes('android-app://'));
}


function onLoadInstallButton(installButton) {
  const withLang = (href) => {
    try {
      if (window.i18n && typeof window.i18n.withLang === 'function') return window.i18n.withLang(href);
      const url = new URL(String(href), window.location.href);
      const lang = new URLSearchParams(window.location.search).get('lang');
      if (lang) url.searchParams.set('lang', lang);
      return url.toString();
    } catch {
      return href;
    }
  };

  // Verificar se já está instalado
  window.addEventListener('load', () => {
    if (isRunningAsPWA()) {
      installButton.style.display = 'none';
    }
  });

  // Capturar evento de instalação
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.style.display = 'inline-flex';
  });

  // Ouvir o evento de instalação concluída
  window.addEventListener('appinstalled', (event) => {
    console.log('PWA foi instalado com sucesso!');

    // Recarregar após um pequeno delay
    setTimeout(() => {
      window.location = withLang("/")
    }, 1000);
  });

  // Botão de instalação
  installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installButton.style.display = 'none';
        deferredPrompt = null;
      }
    }
  });
}

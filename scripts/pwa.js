function onLoadPwa() {
  const installButton = document.getElementById("install-btn");
  onLoadInstallButton(installButton);
}

async function openMyPWA(path = 'app') {
  const base = `${location.protocol}//${location.host}${location.port ? ":" + location.port : ""}`;
  const pwaUrl = `${base}/${path}`;

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
      window.location = "/"
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

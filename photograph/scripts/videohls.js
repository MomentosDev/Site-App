document.addEventListener('DOMContentLoaded', () => {
        const video = document.getElementById('hls-video');
        const videoSourceDisplay = document.getElementById('video-source');

        function isMobileDevice() {
          return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }

        const mobileSrc = 'videos/hls_mobile/master_mobile.m3u8';
        const desktopSrc = 'videos/hls_web/master_web.m3u8';
        const videoSrc = isMobileDevice() ? mobileSrc : desktopSrc;
        if (videoSourceDisplay) videoSourceDisplay.textContent = isMobileDevice() ? 'Mobile' : 'Desktop/Web';

        // Checa se o arquivo existe (útil para debug)
        fetch(videoSrc, { method: 'HEAD' })
          .then(res => {
            if (!res.ok) throw new Error('Playlist não encontrada: ' + res.status);
            console.log('Playlist encontrada:', videoSrc);
          })
          .catch(err => {
            console.warn('Aviso fetch .m3u8:', err);
          });

        // Inicializa HLS
        if (window.Hls && Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(videoSrc);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('Manifest HLS carregado.');
            // não chama play diretamente — observer decide
          });
          hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS error', data);
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = videoSrc;
          console.log('Usando HLS nativo (Safari).');
        } else {
          console.error('HLS não suportado neste navegador.');
          return;
        }

        // IntersectionObserver para play/pause on-demand
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
              console.log('Vídeo visível -> play');
              video.muted = true; // garantir autoplay
              video.play().catch(e => console.warn('play falhou:', e));
            } else {
              if (!video.paused) {
                console.log('Vídeo fora -> pause');
                video.pause();
              }
            }
          });
        }, { threshold: [0.1, 0.5] });

        observer.observe(video);
      });
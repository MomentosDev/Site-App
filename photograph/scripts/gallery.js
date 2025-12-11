   
      class AnimationController {
        constructor(container) {
            this.container = container;
            this.image = container.querySelector('.animation-image');
            this.svg = container.querySelector('.animation-svg');
            this.isRunning = false;
            this.timeouts = [];

            this.init();
        }

        init() {
            this.resume();
            this.startAnimationCycle();
        }

        clearTimeouts() {
            this.timeouts.forEach(timeout => clearTimeout(timeout));
            this.timeouts = [];
        }

        pause() {
            this.isRunning = false;
            this.clearTimeouts();
            this.svg.classList.add('paused');
            this.container.style.opacity = '0.7';
        }

        resume() {
            this.isRunning = true;
            this.svg.classList.remove('paused');
            this.container.style.opacity = '1';
            this.startAnimationCycle();
        }

        startAnimationCycle() {
            if (!this.isRunning) return;

            this.image.classList.remove('blurred');
            this.svg.classList.remove('rotating');

            const timeout1 = setTimeout(() => {
                if (!this.isRunning) return;

                this.svg.classList.add('rotating');
                this.image.classList.add('blurred');

                const timeout2 = setTimeout(() => {
                    if (!this.isRunning) return;

                    this.svg.classList.remove('rotating');

                    const timeout3 = setTimeout(() => {
                        if (!this.isRunning) return;

                        this.svg.classList.add('rotating');
                        this.image.classList.remove('blurred');

                        const timeout4 = setTimeout(() => {
                            if (!this.isRunning) return;

                            this.svg.classList.remove('rotating');

                            const timeout5 = setTimeout(() => {
                                if (!this.isRunning) return;
                                this.startAnimationCycle();
                            }, 1000);

                            this.timeouts.push(timeout5);
                        }, 1000);

                        this.timeouts.push(timeout4);
                    }, 2000);

                    this.timeouts.push(timeout3);
                }, 1000);

                this.timeouts.push(timeout2);
            }, 1000);

            this.timeouts.push(timeout1);
        }
    }

    // Inicialização quando o DOM estiver carregado
    document.addEventListener('DOMContentLoaded', () => {
        const existingContainers = document.querySelectorAll('.animation-container');
        existingContainers.forEach(container => new AnimationController(container));
    });

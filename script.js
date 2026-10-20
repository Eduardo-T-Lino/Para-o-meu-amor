document.addEventListener('DOMContentLoaded', () => {
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    scrollIndicator.setAttribute('role', 'scrollbar');
    scrollIndicator.setAttribute('aria-label', 'Indicador de rolagem da página');
    scrollIndicator.setAttribute('aria-orientation', 'vertical');
    scrollIndicator.setAttribute('aria-valuemin', '0');
    scrollIndicator.setAttribute('aria-valuemax', '100');
    scrollIndicator.setAttribute('aria-valuenow', '0');
    scrollIndicator.tabIndex = 0;
    document.body.append(scrollIndicator);

    const indicatorHeight = 34;
    const indicatorMargin = 22;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let scheduledIndicatorUpdate = false;

    function getScrollMetrics() {
        const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        const maxScroll = Math.max(0, pageHeight - window.innerHeight);
        const progress = maxScroll ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
        const availableTrack = Math.max(0, window.innerHeight - indicatorHeight - indicatorMargin * 2);
        return { maxScroll, progress, top: indicatorMargin + progress * availableTrack };
    }

    function updateScrollIndicator() {
        scheduledIndicatorUpdate = false;
        const metrics = getScrollMetrics();
        scrollIndicator.style.display = metrics.maxScroll > 0 ? 'block' : 'none';
        scrollIndicator.style.setProperty('--scroll-y', `${metrics.top}px`);
        scrollIndicator.setAttribute('aria-valuenow', String(Math.round(metrics.progress * 100)));
    }

    function scheduleIndicatorUpdate() {
        if (scheduledIndicatorUpdate) return;
        scheduledIndicatorUpdate = true;
        window.requestAnimationFrame(updateScrollIndicator);
    }

    window.addEventListener('scroll', scheduleIndicatorUpdate, { passive: true });
    window.addEventListener('resize', scheduleIndicatorUpdate);
    window.addEventListener('load', scheduleIndicatorUpdate, { once: true });

    document.addEventListener('pointermove', event => {
        if (event.pointerType === 'mouse') {
            scrollIndicator.classList.toggle('is-expanded', dragStart !== null || event.clientX >= window.innerWidth - 36);
        }
    }, { passive: true });
    document.addEventListener('pointerleave', event => {
        if (event.relatedTarget === null) scrollIndicator.classList.remove('is-expanded');
    });
    scrollIndicator.addEventListener('focus', () => scrollIndicator.classList.add('is-expanded'));
    scrollIndicator.addEventListener('blur', () => scrollIndicator.classList.remove('is-expanded'));

    let dragStart = null;
    scrollIndicator.addEventListener('pointerdown', event => {
        scrollIndicator.classList.add('is-expanded');
        dragStart = { pointerY: event.clientY, thumbTop: getScrollMetrics().top };
        scrollIndicator.setPointerCapture(event.pointerId);
        event.preventDefault();
    });
    scrollIndicator.addEventListener('pointermove', event => {
        if (!dragStart) return;
        const { maxScroll } = getScrollMetrics();
        const availableTrack = Math.max(1, window.innerHeight - indicatorHeight - indicatorMargin * 2);
        const nextTop = dragStart.thumbTop + event.clientY - dragStart.pointerY;
        const progress = Math.min(1, Math.max(0, (nextTop - indicatorMargin) / availableTrack));
        window.scrollTo({ top: progress * maxScroll, behavior: 'auto' });
    });
    const stopDragging = () => { dragStart = null; };
    scrollIndicator.addEventListener('pointerup', stopDragging);
    scrollIndicator.addEventListener('pointercancel', stopDragging);
    scrollIndicator.addEventListener('keydown', event => {
        const pageStep = window.innerHeight * 0.85;
        const keySteps = { ArrowUp: -48, ArrowDown: 48, PageUp: -pageStep, PageDown: pageStep };
        const behavior = reduceMotion.matches ? 'auto' : 'smooth';
        if (event.key === 'Home') {
            window.scrollTo({ top: 0, behavior });
        } else if (event.key === 'End') {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
        } else if (keySteps[event.key]) {
            event.preventDefault();
            window.scrollBy({ top: keySteps[event.key], behavior });
        }
    });
    updateScrollIndicator();

    const loginForm = document.querySelector('#nome')?.closest('form');

    if (loginForm) {
        const nameField = loginForm.querySelector('#nome');
        const dateField = loginForm.querySelector('#data-especial');
        const expectedName = 'ana beatriz de oliveira ribeiro' || 'Ana Beatriz de Oliveira Ribeiro' || 'ANA BEATRIZ DE OLIVEIRA RIBEIRO';

        const normalizeName = value => value
            .trim()
            .replace(/\s+/g, ' ')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('pt-BR');

        loginForm.addEventListener('submit', event => {
            nameField.setCustomValidity('');
            dateField.setCustomValidity('');

            if (normalizeName(nameField.value) !== expectedName) {
                event.preventDefault();
                nameField.setCustomValidity('Este nome não está liberado para acessar o site.');
                nameField.reportValidity();
                return;
            }

            if (dateField.value !== '21/09/2025') {
                event.preventDefault();
                dateField.setCustomValidity('Confira a data especial.');
                dateField.reportValidity();
                return;
            }

            event.preventDefault();
            sessionStorage.removeItem('ana-identidade-verificada');
            sessionStorage.setItem('ana-login-confirmado', 'true');
            window.location.assign('verificacao.html');
        });

        nameField.addEventListener('input', () => nameField.setCustomValidity(''));
        dateField.addEventListener('input', () => dateField.setCustomValidity(''));
    }

    const identityForm = document.querySelector('#identity-form');
    if (identityForm) {
        if (sessionStorage.getItem('ana-login-confirmado') !== 'true') {
            window.location.replace('index.html');
            return;
        }

        if (sessionStorage.getItem('ana-identidade-verificada') === 'true') {
            window.location.replace('principal.html');
            return;
        }

        const questions = [
            {
                text: 'Qual foi a cantada que eu usei para chegar em você?',
                correct: 'É tão linda que o story nem carregou',
                similar: 'Você é tão linda que até o story travou',
                random: [
                    'Você vem sempre aqui?',
                    'Seu pai é padeiro?',
                    'Acredita em amor à primeira vista?',
                    'Você deixou cair alguma coisa: meu queixo'
                ]
            },
            {
                text: 'Qual é o nosso apelido criado recentemente?',
                correct: 'Diva(o) Divônica(o)',
                similar: 'Meu xuxu',
                random: ['Casal 20', 'Mozão', 'Dupla dinâmica', 'Princesa e príncipe']
            },
            {
                text: 'Como seu contato está salvo no meu celular?',
                correct: 'Minha princesa ❤️',
                similar: 'Minha vida ❤️',
                random: ['Meu amor ❤️', 'Ana Beatriz', 'Amorzinho 💕', 'Meu bem']
            },
            {
                text: 'O que eu mais comento sobre quando nos encontramos pela primeira vez?',
                correct: 'A quantidade de água que você bebeu por causa do nervosismo',
                similar: 'O tempo que você enrolou para chegar por nervosismo',
                random: [
                    'A música que estava tocando',
                    'O lugar onde sentamos',
                    'A roupa que você estava usando',
                    'O horário em que chegamos'
                ]
            }
        ];

        const questionCard = identityForm.querySelector('#question-card');
        const questionTitle = identityForm.querySelector('#question-title');
        const questionCounter = identityForm.querySelector('#question-counter');
        const progressBar = identityForm.querySelector('#quiz-progress-bar');
        const optionsContainer = identityForm.querySelector('#answer-options');
        const feedback = identityForm.querySelector('.identity-feedback');
        const successPanel = document.querySelector('#identity-success');
        const verificationHeader = document.querySelector('#verification-header');
        const confettiContainer = document.querySelector('#confetti-container');
        let currentQuestion = 0;
        let isTransitioning = false;

        const shuffle = items => {
            const shuffled = [...items];
            for (let index = shuffled.length - 1; index > 0; index -= 1) {
                const randomIndex = Math.floor(Math.random() * (index + 1));
                [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
            }
            return shuffled;
        };

        const createOptions = question => {
            const randomOptions = shuffle(question.random).slice(0, 2);
            return shuffle([
                { label: question.correct, isCorrect: true },
                { label: question.similar, isCorrect: false },
                ...randomOptions.map(label => ({ label, isCorrect: false }))
            ]);
        };

        const launchConfetti = () => {
            if (reduceMotion.matches) return;

            const colors = ['#c84b68', '#e2b87f', '#f7d6df', '#8f5ca8', '#ffffff'];
            const fragment = document.createDocumentFragment();

            for (let index = 0; index < 90; index += 1) {
                const piece = document.createElement('span');
                piece.className = 'confetti-piece';
                piece.style.setProperty('--confetti-left', `${Math.random() * 100}vw`);
                piece.style.setProperty('--confetti-drift', `${(Math.random() - 0.5) * 34}vw`);
                piece.style.setProperty('--confetti-rise', `${-(78 + Math.random() * 42)}vh`);
                piece.style.setProperty('--confetti-delay', `${Math.random() * 900}ms`);
                piece.style.setProperty('--confetti-duration', `${2600 + Math.random() * 1800}ms`);
                piece.style.setProperty('--confetti-rotation', `${540 + Math.random() * 900}deg`);
                piece.style.backgroundColor = colors[index % colors.length];
                fragment.append(piece);
            }

            confettiContainer.append(fragment);
            window.setTimeout(() => confettiContainer.replaceChildren(), 5600);
        };

        const showSuccess = () => {
            sessionStorage.setItem('ana-identidade-verificada', 'true');
            sessionStorage.removeItem('ana-login-confirmado');
            identityForm.hidden = true;
            verificationHeader.hidden = true;
            successPanel.hidden = false;
            successPanel.classList.add('is-visible');
            launchConfetti();
            successPanel.querySelector('a').focus({ preventScroll: true });
        };

        const renderQuestion = () => {
            const question = questions[currentQuestion];
            const options = createOptions(question);

            questionCounter.textContent = `Pergunta ${currentQuestion + 1} de ${questions.length}`;
            progressBar.style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;
            questionTitle.textContent = question.text;
            optionsContainer.replaceChildren();
            feedback.textContent = '';
            feedback.className = 'identity-feedback';

            options.forEach((option, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'answer-option';
                button.dataset.correct = String(option.isCorrect);
                button.innerHTML = `<span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${option.label}</span>`;
                optionsContainer.append(button);
            });

            questionCard.classList.remove('is-leaving');
            questionCard.classList.add('is-entering');
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => questionCard.classList.remove('is-entering'));
            });
            optionsContainer.querySelector('button')?.focus({ preventScroll: true });
        };

        optionsContainer.addEventListener('click', event => {
            const selectedOption = event.target.closest('.answer-option');
            if (!selectedOption || isTransitioning) return;

            const optionButtons = Array.from(optionsContainer.querySelectorAll('.answer-option'));
            const isCorrect = selectedOption.dataset.correct === 'true';

            if (!isCorrect) {
                selectedOption.classList.add('is-incorrect');
                feedback.textContent = 'Quase! Essa não é a resposta. Tenta mais uma vez 💕';
                feedback.classList.add('is-error');
                window.setTimeout(() => selectedOption.classList.remove('is-incorrect'), 650);
                return;
            }

            isTransitioning = true;
            feedback.classList.remove('is-error');
            optionButtons.forEach(button => {
                button.disabled = true;
                if (button.dataset.correct === 'true') button.classList.add('is-correct');
            });
            feedback.textContent = 'Acertou! Indo para a próxima...';
            feedback.classList.add('is-success');

            window.setTimeout(() => {
                questionCard.classList.add('is-leaving');
                window.setTimeout(() => {
                    currentQuestion += 1;
                    if (currentQuestion === questions.length) {
                        showSuccess();
                        return;
                    }
                    renderQuestion();
                    isTransitioning = false;
                }, reduceMotion.matches ? 0 : 340);
            }, reduceMotion.matches ? 0 : 620);
        });

        identityForm.addEventListener('submit', event => event.preventDefault());
        renderQuestion();
    }

    const musicPanel = document.querySelector('#music-player');
    const musicFrame = document.querySelector('#perfect-player');
    const musicToggle = document.querySelector('#music-toggle');
    const musicLabel = document.querySelector('#music-label');
    const musicCollapse = document.querySelector('#music-collapse');
    const musicVideo = document.querySelector('#music-video');
    if (musicPanel && musicFrame && musicToggle && musicLabel && musicCollapse && musicVideo) {
        let musicPlayer = null;
        let musicReady = false;
        let musicPlaying = false;
        let musicCollapsed = false;
        let musicPausedByUser = sessionStorage.getItem('ana-music-paused') === 'true';
        let waitingForMusicGesture = false;
        const frameUrl = new URL(musicFrame.src);
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            frameUrl.searchParams.set('origin', window.location.origin);
            musicFrame.src = frameUrl.href;
        }

        function syncMusicControl() {
            musicToggle.setAttribute('aria-pressed', String(musicPlaying));
            musicToggle.setAttribute('aria-label', musicPlaying ? 'Pausar Perfect' : 'Tocar Perfect');
            musicLabel.textContent = musicPlaying ? 'Perfect tocando' : 'Tocar Perfect';
            musicCollapse.textContent = musicCollapsed ? '+' : '\u2212';
            musicCollapse.setAttribute('aria-expanded', String(!musicCollapsed));
            musicCollapse.setAttribute('aria-label', musicCollapsed
                ? 'Mostrar o player de Perfect'
                : 'Recolher e pausar a m\u00fasica');
            musicPanel.classList.toggle('is-collapsed', musicCollapsed);
            musicVideo.hidden = musicCollapsed;
        }

        function stopWaitingForMusicGesture() {
            waitingForMusicGesture = false;
            document.removeEventListener('pointerdown', startMusicFromGesture, true);
            document.removeEventListener('keydown', startMusicFromGesture, true);
        }

        function startMusicFromGesture(event) {
            if (musicPanel.contains(event.target) || musicCollapsed || musicPausedByUser) return;
            if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
            if (musicReady) musicPlayer.playVideo();
        }

        function waitForMusicGesture() {
            if (waitingForMusicGesture || musicPausedByUser || musicCollapsed) return;
            waitingForMusicGesture = true;
            document.addEventListener('pointerdown', startMusicFromGesture, true);
            document.addEventListener('keydown', startMusicFromGesture, true);
        }

        function createMusicPlayer() {
            if (musicPlayer) return;
            musicPlayer = new window.YT.Player('perfect-player', {
                events: {
                    onReady(event) {
                        musicReady = true;
                        musicToggle.disabled = false;
                        event.target.setVolume(35);
                        const savedPosition = Number(sessionStorage.getItem('ana-music-position'));
                        if (savedPosition > 0 && savedPosition < event.target.getDuration()) {
                            event.target.seekTo(savedPosition, true);
                        }
                        syncMusicControl();
                        if (!musicPausedByUser && !musicCollapsed) event.target.playVideo();
                        else event.target.pauseVideo();
                    },
                    onStateChange(event) {
                        const wasPlaying = musicPlaying;
                        musicPlaying = event.data === window.YT.PlayerState.PLAYING;
                        if (musicPlaying && musicCollapsed) {
                            event.target.pauseVideo();
                            musicPlaying = false;
                        }
                        if (musicPlaying) {
                            musicPausedByUser = false;
                            sessionStorage.setItem('ana-music-paused', 'false');
                            stopWaitingForMusicGesture();
                        }
                        if (event.data === window.YT.PlayerState.PAUSED && wasPlaying) {
                            musicPausedByUser = true;
                            sessionStorage.setItem('ana-music-paused', 'true');
                            stopWaitingForMusicGesture();
                        }
                        syncMusicControl();
                    },
                    onAutoplayBlocked() {
                        musicPlaying = false;
                        syncMusicControl();
                        waitForMusicGesture();
                    },
                    onError() {
                        musicPlaying = false;
                        musicToggle.disabled = true;
                        musicLabel.textContent = 'Perfect indispon\u00edvel';
                        const musicFallback = document.querySelector('#music-fallback');
                        if (musicFallback) musicFallback.hidden = false;
                        stopWaitingForMusicGesture();
                    }
                }
            });
        }

        musicToggle.addEventListener('click', () => {
            if (!musicReady) return;
            if (musicPlaying) {
                musicPausedByUser = true;
                sessionStorage.setItem('ana-music-paused', 'true');
                musicPlayer.pauseVideo();
                stopWaitingForMusicGesture();
            } else {
                musicPausedByUser = false;
                musicCollapsed = false;
                sessionStorage.setItem('ana-music-paused', 'false');
                syncMusicControl();
                musicPlayer.playVideo();
            }
        });
        musicCollapse.addEventListener('click', () => {
            musicCollapsed = !musicCollapsed;
            if (musicCollapsed) {
                musicPausedByUser = true;
                sessionStorage.setItem('ana-music-paused', 'true');
                if (musicReady) musicPlayer.pauseVideo();
                musicPlaying = false;
                stopWaitingForMusicGesture();
            }
            syncMusicControl();
        });
        window.addEventListener('pagehide', () => {
            if (musicReady) sessionStorage.setItem('ana-music-position', String(musicPlayer.getCurrentTime()));
        });
        if (window.YT?.Player) createMusicPlayer();
        else {
            const previousYouTubeReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                previousYouTubeReady?.();
                createMusicPlayer();
            };
            const api = document.createElement('script');
            api.src = 'https://www.youtube.com/iframe_api';
            api.async = true;
            document.head.append(api);
        }
    }

    const hero = document.querySelector('#hero');
    if (!hero) return;

    const slides = Array.from(hero.querySelectorAll(':scope > article'));
    if (slides.length < 2) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    hero.classList.add('is-carousel');
    hero.setAttribute('role', 'region');
    hero.setAttribute('aria-roledescription', 'carrossel');
    hero.setAttribute('aria-label', 'Mensagens para Ana');

    const track = document.createElement('div');
    track.className = 'carousel-track';
    slides.forEach((slide, index) => {
        slide.classList.add('carousel-slide');
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-roledescription', 'slide');
        slide.setAttribute('aria-label', `${index + 1} de ${slides.length}`);
        track.append(slide);
    });
    hero.append(track);

    const previousButton = document.createElement('button');
    previousButton.type = 'button';
    previousButton.className = 'carousel-arrow carousel-arrow-previous';
    previousButton.textContent = '‹';
    previousButton.setAttribute('aria-label', 'Mensagem anterior');

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'carousel-arrow carousel-arrow-next';
    nextButton.textContent = '›';
    nextButton.setAttribute('aria-label', 'Próxima mensagem');

    const pauseButton = document.createElement('button');
    pauseButton.type = 'button';
    pauseButton.className = 'carousel-pause';
    pauseButton.setAttribute('aria-label', 'Pausar troca automática de mensagens');

    const pagination = document.createElement('div');
    pagination.className = 'carousel-pagination';
    pagination.setAttribute('role', 'group');
    pagination.setAttribute('aria-label', 'Selecionar mensagem');
    const slideDots = slides.map((slide, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot';
        dot.setAttribute('aria-label', `Ir para a mensagem ${index + 1}`);
        const dotMark = document.createElement('span');
        dotMark.setAttribute('aria-hidden', 'true');
        dot.append(dotMark);
        dot.addEventListener('click', () => goToSlide(index));
        pagination.append(dot);
        return dot;
    });
    const slideCounter = document.createElement('span');
    slideCounter.className = 'carousel-counter';
    slideCounter.setAttribute('aria-hidden', 'true');
    pagination.append(slideCounter);
    hero.append(previousButton, nextButton, pauseButton, pagination);
    hero.setAttribute('tabindex', '0');

    let currentSlide = 0;
    let rotationTimer = null;
    let touchStartX = null;
    let pointerIsOver = false;
    let focusIsInside = false;
    let manuallyPaused = reducedMotion.matches;

    function showSlide(index) {
        currentSlide = (index + slides.length) % slides.length;
        slideDots.forEach((dot, dotIndex) => {
            if (dotIndex === currentSlide) dot.setAttribute('aria-current', 'true');
            else dot.removeAttribute('aria-current');
        });
        slideCounter.textContent = `${String(currentSlide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
        slides.forEach((slide, slideIndex) => {
            const active = slideIndex === currentSlide;
            slide.classList.toggle('is-active', active);
            slide.setAttribute('aria-hidden', String(!active));
            if ('inert' in slide) slide.inert = !active;
        });
    }

    function stopRotation() {
        window.clearInterval(rotationTimer);
        rotationTimer = null;
    }

    function startRotation() {
        if (reducedMotion.matches || manuallyPaused || pointerIsOver || focusIsInside || rotationTimer) return;
        rotationTimer = window.setInterval(() => showSlide(currentSlide + 1), 8000);
    }

    function updatePauseButton() {
        const isPaused = manuallyPaused || reducedMotion.matches;
        pauseButton.innerHTML = isPaused
            ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"></path></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h4v14H7zM13 5h4v14h-4z"></path></svg>';
        pauseButton.setAttribute('aria-label', isPaused
            ? 'Iniciar troca automática de mensagens'
            : 'Pausar troca automática de mensagens');
        pauseButton.disabled = reducedMotion.matches;
        pauseButton.title = reducedMotion.matches
            ? 'A reprodução automática está desativada pela preferência de movimento reduzido.'
            : '';
    }

    function goToSlide(index) {
        showSlide(index);
        manuallyPaused = true;
        stopRotation();
        updatePauseButton();
    }

    previousButton.addEventListener('click', () => goToSlide(currentSlide - 1));
    nextButton.addEventListener('click', () => goToSlide(currentSlide + 1));
    pauseButton.addEventListener('click', () => {
        manuallyPaused = !manuallyPaused;
        if (manuallyPaused) stopRotation();
        else startRotation();
        updatePauseButton();
    });

    hero.addEventListener('pointerenter', () => {
        pointerIsOver = true;
        stopRotation();
    });
    hero.addEventListener('pointerleave', () => {
        pointerIsOver = false;
        startRotation();
    });
    hero.addEventListener('focusin', () => {
        focusIsInside = true;
        stopRotation();
    });
    hero.addEventListener('focusout', event => {
        if (!hero.contains(event.relatedTarget)) {
            focusIsInside = false;
            startRotation();
        }
    });

    hero.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goToSlide(currentSlide - 1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            goToSlide(currentSlide + 1);
        }
    });

    hero.addEventListener('touchstart', event => {
        touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    hero.addEventListener('touchend', event => {
        if (touchStartX === null) return;
        const distance = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(distance) > 45) goToSlide(currentSlide + (distance < 0 ? 1 : -1));
        touchStartX = null;
    }, { passive: true });

    reducedMotion.addEventListener?.('change', event => {
        manuallyPaused = event.matches;
        if (event.matches) stopRotation();
        else startRotation();
        updatePauseButton();
    });

    showSlide(0);
    updatePauseButton();
    startRotation();

    if ('IntersectionObserver' in window) {
        const storySection = document.querySelector('#main-context');
        if (storySection) {
            storySection.classList.add('story-overlay');
            const storyObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.05, rootMargin: '0px 0px -15% 0px' });
            storyObserver.observe(storySection);
        }

        const revealItems = document.querySelectorAll('#main-context .story-card');
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });

        revealItems.forEach((item, index) => {
            item.classList.add('reveal-on-scroll');
            item.style.setProperty('--reveal-delay', `${index * 120}ms`);
            revealObserver.observe(item);
        });
    } else {
        document.querySelector('#main-context')?.classList.add('story-overlay', 'is-visible');
        document.querySelectorAll('#main-context .story-card').forEach(item => item.classList.add('is-visible'));
    }


});

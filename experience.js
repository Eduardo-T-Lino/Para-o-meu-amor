(() => {
    'use strict';

    const appRoot = new URL('.', document.currentScript.src);
    const chapters = ['porque-amo', 'conheci', 'viver', 'data-especial', 'weg', 'viagens'];
    // Only this recording opens externally; there is no embedded music player.
    const musicURL = 'https://www.youtube.com/watch?v=KrAlYZGz9f8&autoplay=1';
    const musicAttemptKey = 'ana-mil-anos-attempted-v1';
    const progressKey = 'ana-chapters-completed-v1';
    const pageSelector = ':scope > header, :scope > main, :scope > footer, :scope > #confetti-container';
    const routes = new Set(['index.html', 'verificacao.html', 'principal.html', 'final.html',
        ...chapters.map(id => `historia/${id}.html`)]);
    let pageCleanup = () => {};
    let navigationRequest = null;

    // Storage may be unavailable in private browsing; keep the journey usable.
    const memory = new Map();
    function read(storage, key) {
        try { return storage.getItem(key) ?? memory.get(key); }
        catch { return memory.get(key); }
    }
    function write(storage, key, value) {
        memory.set(key, value);
        try { storage.setItem(key, value); } catch { /* Keep the in-memory value. */ }
    }
    function completedChapters() {
        try {
            const saved = JSON.parse(read(localStorage, progressKey) || '[]');
            return new Set(Array.isArray(saved) ? saved.filter(id => chapters.includes(id)) : []);
        } catch { return new Set(); }
    }
    function routeFor(url) {
        return url.origin === appRoot.origin && url.pathname.startsWith(appRoot.pathname)
            ? url.pathname.slice(appRoot.pathname.length) || 'index.html' : null;
    }
    function authorizedURL(url) {
        const route = routeFor(url);
        const verified = read(sessionStorage, 'ana-identidade-verificada') === 'true';
        if (route === 'verificacao.html') {
            if (verified) return new URL('principal.html', appRoot);
            if (read(sessionStorage, 'ana-login-confirmado') !== 'true') return new URL('index.html', appRoot);
        } else if (route !== 'index.html' && !verified) {
            return new URL('index.html', appRoot);
        }
        return url;
    }

    async function navigate(destination, { pop = false, scrollY = 0 } = {}) {
        const target = authorizedURL(new URL(destination, location.href));
        if (!routes.has(routeFor(target))) return;
        // file:// has no fetch support; the same files also work on a static host.
        if (!['http:', 'https:'].includes(location.protocol)) {
            location.assign(target.href);
            return;
        }
        navigationRequest?.abort();
        const request = new AbortController();
        navigationRequest = request;
        document.body.setAttribute('aria-busy', 'true');
        try {
            const response = await fetch(target.href, { signal: request.signal });
            if (!response.ok) throw new Error(`Navigation failed: ${response.status}`);
            const page = new DOMParser().parseFromString(await response.text(), 'text/html');
            if (request.signal.aborted) return;
            if (!page.querySelector('main')) throw new Error('Page content not found');
            // Resolve relative links before importing content from another directory.
            page.querySelectorAll('[href], [src], [action], [poster]').forEach(element => {
                for (const attribute of ['href', 'src', 'action', 'poster']) {
                    const value = element.getAttribute(attribute);
                    if (value) element.setAttribute(attribute, new URL(value, target).href);
                }
            });
            if (!pop) {
                history.replaceState({ ...history.state, scrollY: window.scrollY }, '', location.href);
                history.pushState({ scrollY: 0 }, '', target.href);
            } else if (target.href !== location.href) {
                history.replaceState({ scrollY: 0 }, '', target.href);
            }
            pageCleanup();
            document.dispatchEvent(new Event('story:before-navigate'));
            document.body.querySelectorAll(pageSelector).forEach(element => element.remove());
            const fragment = document.createDocumentFragment();
            page.body.querySelectorAll(pageSelector).forEach(element => fragment.append(document.importNode(element, true)));
            document.body.prepend(fragment);
            document.body.className = page.body.className;
            document.title = page.title;
            document.dispatchEvent(new Event('story:navigate'));
            setupPage();
            restoreScroll(target, scrollY);
            const heading = document.querySelector('main h1, main h2, #nome, #question-title');
            if (heading) {
                if (!heading.matches('input')) heading.tabIndex = -1;
                heading.focus({ preventScroll: true });
            }
        } catch (error) {
            if (error.name !== 'AbortError') location.assign(target.href);
        } finally {
            if (navigationRequest === request) {
                navigationRequest = null;
                document.body.removeAttribute('aria-busy');
            }
        }
    }

    function restoreScroll(url, top) {
        requestAnimationFrame(() => {
            const anchor = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
            if (anchor && !top) anchor.scrollIntoView({ behavior: 'instant' });
            else window.scrollTo({ top, behavior: 'instant' });
            window.dispatchEvent(new Event('scroll'));
        });
    }

    function openMusic() {
        // Called synchronously from a user action, at most once per session.
        // Even if pop-ups are blocked, the ordinary header link stays available.
        if (read(sessionStorage, musicAttemptKey) === 'true') return;
        write(sessionStorage, musicAttemptKey, 'true');
        try { window.open(musicURL, '_blank', 'noopener,noreferrer'); }
        catch { /* The user can open the music through the header link. */ }
    }

    function setupMusicLink() {
        const navigation = document.querySelector('body > header nav');
        if (!navigation || navigation.querySelector('#music-link')) return;
        const link = document.createElement('a');
        link.id = 'music-link';
        link.href = musicURL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Mil Anos ↗';
        link.setAttribute('aria-label', 'Ouvir Mil Anos no YouTube (nova aba)');
        link.title = 'Pause e retome a música na aba do YouTube';
        link.addEventListener('click', () => write(sessionStorage, musicAttemptKey, 'true'));
        navigation.append(link);
    }

    function setupPage() {
        pageCleanup = () => {};
        const completed = completedChapters();
        setupMusicLink();
        const route = routeFor(new URL(location.href));
        const chapter = chapters.find(id => route === `historia/${id}.html`);
        if (chapter) setupChapter(chapter, completed);
        if (route === 'final.html') setupFinal(completed);
        window.dispatchEvent(new Event('resize'));
    }

    function setupChapter(chapter, completed) {
        // Completed chapters stay freely accessible, without reopening the finale.
        if (completed.has(chapter)) return;
        const article = document.querySelector('.story-body');
        const pagination = document.querySelector('.story-pagination');
        if (!article || !pagination) return;
        const blocks = Array.from(article.querySelectorAll('p, h2, figure'));
        const images = Array.from(article.querySelectorAll('img'));
        const seen = new Set();
        let reachedEnd = false;
        let active = true;
        let scheduledFrame = null;

        function observeVisibleBlocks() {
            scheduledFrame = null;
            if (!active || document.visibilityState === 'hidden') return;
            blocks.forEach(block => {
                const rect = block.getBoundingClientRect();
                const visibleHeight = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0);
                if (rect.width > 0 && visibleHeight >= Math.min(rect.height * 0.5, innerHeight * 0.5)) seen.add(block);
            });
            const rect = pagination.getBoundingClientRect();
            if (rect.top < innerHeight && rect.bottom > 0) reachedEnd = true;
            if (!blocks.length || !reachedEnd || !blocks.every(block => seen.has(block))) return;

            const finished = completedChapters();
            finished.add(chapter);
            write(localStorage, progressKey, JSON.stringify([...finished]));
            stopTracking();
            if (finished.size === chapters.length) navigate(new URL('final.html', appRoot));
        }
        function scheduleRead() {
            if (!active || scheduledFrame !== null) return;
            scheduledFrame = requestAnimationFrame(observeVisibleBlocks);
        }
        function stopTracking() {
            active = false;
            if (scheduledFrame !== null) cancelAnimationFrame(scheduledFrame);
            window.removeEventListener('scroll', scheduleRead);
            window.removeEventListener('resize', scheduleRead);
            document.removeEventListener('visibilitychange', scheduleRead);
            images.forEach(image => image.removeEventListener('load', scheduleRead));
        }
        window.addEventListener('scroll', scheduleRead, { passive: true });
        window.addEventListener('resize', scheduleRead);
        document.addEventListener('visibilitychange', scheduleRead);
        images.forEach(image => image.addEventListener('load', scheduleRead));
        pageCleanup = stopTracking;
        scheduleRead();
    }

    function setupFinal(completed) {
        const locked = document.querySelector('#final-locked');
        const unlocked = document.querySelector('#final-unlocked');
        if (completed.size !== chapters.length) {
            locked.hidden = false;
            unlocked.hidden = true;
            document.querySelector('#continue-chapters').href = new URL(`historia/${chapters.find(id => !completed.has(id))}.html`, appRoot).href;
            return;
        }
        locked.hidden = true;
        unlocked.hidden = false;
        const source = window.LOVE_STORY_CONFIG?.finalVideoSrc?.trim();
        if (!source) return;
        const video = document.querySelector('#final-video');
        const placeholder = document.querySelector('#final-placeholder');
        const status = document.querySelector('#final-video-status');
        let active = true;
        placeholder.hidden = true;
        video.hidden = false;
        video.src = new URL(source, appRoot).href;
        video.addEventListener('play', () => { status.textContent = ''; });
        video.addEventListener('ended', () => navigate(new URL('principal.html', appRoot)));
        video.addEventListener('error', () => {
            status.textContent = 'Não foi possível abrir a mensagem agora. Tente recarregar ou volte ao início.';
        });
        pageCleanup = () => {
            active = false;
            video.pause();
            video.removeAttribute('src');
            video.load();
        };
        // A previous click may allow this. Native controls remain available if blocked.
        video.play().catch(error => {
            if (!active) return;
            status.textContent = error.name === 'NotAllowedError'
                ? 'Sua mensagem está pronta. Toque no vídeo para assistir. ♥'
                : 'Não foi possível abrir a mensagem agora. Tente recarregar ou volte ao início.';
        });
    }

    window.LoveStory = { navigate, openMusic };
    document.addEventListener('DOMContentLoaded', () => {
        setupPage();
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        document.addEventListener('click', event => {
            const link = event.target.closest('a[href]');
            if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
                || link.target || link.hasAttribute('download')) return;
            const target = new URL(link.href, location.href);
            if (!routes.has(routeFor(target))) return;
            // Also support an already-verified visit that skipped the login form.
            if (read(sessionStorage, 'ana-identidade-verificada') === 'true') openMusic();
            event.preventDefault();
            if (target.pathname === location.pathname && target.hash) {
                history.replaceState({ ...history.state, scrollY: window.scrollY }, '', location.href);
                history.pushState({ scrollY: 0 }, '', target.href);
                restoreScroll(target, 0);
            } else navigate(target);
        });
        window.addEventListener('popstate', event => navigate(location.href, { pop: true, scrollY: event.state?.scrollY || 0 }));
        window.addEventListener('storage', event => {
            if (event.key === progressKey) { pageCleanup(); setupPage(); }
        });
    });
})();

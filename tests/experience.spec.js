const { test, expect } = require('@playwright/test');

const chapters = ['porque-amo', 'conheci', 'viver', 'data-especial', 'weg', 'viagens'];

const musicURL = 'https://www.youtube.com/watch?v=KrAlYZGz9f8&autoplay=1';

async function prepareApp(page, { verified = true, mockOpen = true } = {}) {
    await page.addInitScript(({ verified, mockOpen }) => {
        if (verified) sessionStorage.setItem('ana-identidade-verificada', 'true');
        window.musicOpens = [];
        if (mockOpen) {
            // Simulate a blocked popup: the manual link must still work.
            window.open = (...args) => { window.musicOpens.push(args); return null; };
        }
    }, { verified, mockOpen });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
}

async function readChapter(page) {
    await page.evaluate(async () => {
        const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const blocks = Array.from(document.querySelectorAll('.story-body p, .story-body h2, .story-body figure'));
        for (const block of blocks) {
            block.scrollIntoView({ block: 'center', behavior: 'instant' });
            await nextFrame();
        }
        document.querySelector('.story-pagination')?.scrollIntoView({ block: 'center', behavior: 'instant' });
        await nextFrame();
    });
}

test('login opens only Mil Anos once, without a music player or finale teaser', async ({ page }) => {
    await prepareApp(page, { verified: false });
    await page.goto('/index.html');
    await expect(page.locator('#music-player, iframe')).toHaveCount(0);
    await page.locator('#nome').fill('Outro nome');
    await page.locator('#data-especial').fill('21/09/2025');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    expect(await page.evaluate(() => window.musicOpens)).toEqual([]);
    await page.locator('#nome').fill('Ana Beatriz de Oliveira Ribeiro');
    await page.locator('#data-especial').fill('data incorreta');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    expect(await page.evaluate(() => window.musicOpens)).toEqual([]);
    await page.locator('#data-especial').fill('21/09/2025');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.locator('#identity-form')).toBeVisible();
    expect(await page.evaluate(() => window.musicOpens)).toEqual([[musicURL, '_blank', 'noopener,noreferrer']]);
    for (let index = 0; index < 4; index++) {
        await expect(page.locator('#question-counter')).toHaveText(`Pergunta ${index + 1} de 4`);
        await page.locator('.answer-option[data-correct="true"]').click();
    }
    await page.getByRole('link', { name: 'Abrir sua surpresa' }).click();
    await expect(page).toHaveURL(/principal\.html$/);
    await expect(page.locator('#music-player, iframe, script[src*="iframe_api"], .final-teaser, #final-link')).toHaveCount(0);
    await expect(page.locator('#music-link')).toHaveAttribute('href', musicURL);
    await expect(page.locator('#music-link')).toHaveAttribute('target', '_blank');
    await expect(page.locator('#music-link')).toHaveAttribute('rel', 'noopener noreferrer');
    await page.locator('.story-card').first().click();
    await expect(page.locator('#music-link')).toHaveCount(1);
    await expect(page.locator('.scroll-indicator')).toBeHidden();
    await page.goBack();
    await expect(page.locator('#hero')).toBeVisible();
    expect(await page.evaluate(() => window.musicOpens.length)).toBe(1);
    await page.reload();
    await page.locator('.story-card').first().click();
    await expect(page).toHaveURL(/historia\/porque-amo\.html$/);
    expect(await page.evaluate(() => window.musicOpens.length)).toBe(0);
});

test('chapters complete automatically without progress UI, and remain freely accessible after the video', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await prepareApp(page);
    await page.goto('/principal.html');
    await expect(page.locator('.final-teaser, #final-link')).toHaveCount(0);
    await page.evaluate(() => window.LoveStory.navigate('final.html'));
    await expect(page.locator('#final-locked')).toBeVisible();
    await expect(page.locator('#final-video')).not.toHaveAttribute('src');
    await page.locator('#continue-chapters').click();
    await page.locator('.story-pagination').evaluate(element => element.scrollIntoView({ behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ana-chapters-completed-v1') || '[]').length)).toBe(0);
    await expect(page.locator('.chapter-completion, .chapter-progress, .chapter-finish, .chapter-badge, #chapters-count, #final-progress')).toHaveCount(0);
    await expect(page.locator('.scroll-indicator')).toBeHidden();
    await expect(page.locator('.story-pagination a')).toHaveCount(2);
    for (const [index, chapter] of chapters.entries()) {
        await expect(page).toHaveURL(new RegExp(`/historia/${chapter}\\.html$`));
        if (index === 5) {
            // Create a real local video for the native playback and ended events.
            await page.evaluate(async () => {
                const canvas = document.createElement('canvas');
                canvas.width = 320; canvas.height = 180;
                const context = canvas.getContext('2d');
                const stream = canvas.captureStream(10);
                const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
                const chunks = [];
                recorder.ondataavailable = event => chunks.push(event.data);
                const recorded = new Promise(resolve => { recorder.onstop = resolve; });
                recorder.start();
                const animation = setInterval(() => {
                    context.fillStyle = '#c84b68'; context.fillRect(0, 0, 320, 180);
                }, 50);
                await new Promise(resolve => setTimeout(resolve, 650));
                recorder.stop();
                await recorded;
                clearInterval(animation);
                stream.getTracks().forEach(track => track.stop());
                window.LOVE_STORY_CONFIG.finalVideoSrc = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
                const originalPlay = HTMLMediaElement.prototype.play;
                HTMLMediaElement.prototype.play = function () { this.playbackRate = 0.25; return originalPlay.call(this); };
            });
        }
        await readChapter(page);
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ana-chapters-completed-v1')).length)).toBe(index + 1);
        if (index < 5) {
            await expect(page).toHaveURL(new RegExp(`/historia/${chapter}\\.html$`));
            await page.locator('.story-pagination a').last().click();
        }
    }
    await expect(page).toHaveURL(/final\.html$/);
    await expect(page.locator('#final-unlocked')).toBeVisible();
    await expect(page.locator('#final-video')).toBeVisible();
    await expect(page.locator('#music-player, iframe')).toHaveCount(0);
    await page.locator('#final-video').evaluate(video => { video.playbackRate = 4; });
    await expect(page).toHaveURL(/principal\.html$/);
    await expect(page.locator('.final-teaser, #final-link')).toHaveCount(0);
    await expect(page.locator('.chapter-badge, #chapters-count')).toHaveCount(0);
    await page.locator('.story-card').first().click();
    for (const chapter of chapters) {
        await expect(page).toHaveURL(new RegExp(`/historia/${chapter}\\.html$`));
        await readChapter(page);
        await expect(page).toHaveURL(new RegExp(`/historia/${chapter}\\.html$`));
        await expect(page.locator('.story-pagination a')).toHaveCount(2);
        if (chapter !== chapters.at(-1)) await page.locator('.story-pagination a').last().click();
    }
    await page.locator('.story-site-header nav a').first().click();
    await expect(page).toHaveURL(/principal\.html$/);
    await page.reload();
    await expect(page.locator('.final-teaser, #final-link')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('mobile layout and unavailable final video remain usable without a player', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareApp(page);
    await page.route('**/config.js', route => route.fulfill({
        contentType: 'application/javascript',
        body: "window.LOVE_STORY_CONFIG = { finalVideoSrc: '' };"
    }));
    await page.addInitScript(chapters => localStorage.setItem('ana-chapters-completed-v1', JSON.stringify(chapters)), chapters);
    await page.goto('/principal.html');
    await expect(page.locator('.final-teaser, #final-link, #music-player, iframe')).toHaveCount(0);
    await expect(page.locator('#music-link')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true });
    await page.evaluate(() => window.LoveStory.navigate('final.html'));
    await expect(page.locator('#final-placeholder')).toBeVisible();
    await page.evaluate(() => {
        window.LOVE_STORY_CONFIG.finalVideoSrc = 'assets/missing-video.mp4';
        return window.LoveStory.navigate('final.html');
    });
    await expect(page.locator('#final-video-status')).toContainText('Não foi possível');
    await expect(page.locator('#music-link')).toBeVisible();
    await expect(page.locator('#music-link')).toHaveCount(1);
    await expect(page.locator('#music-player, iframe')).toHaveCount(0);
    await page.getByRole('link', { name: 'Voltar ao início', exact: true }).click();
    await expect(page).toHaveURL(/principal\.html$/);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = await page.locator('footer').boundingBox();
    expect(footer.height).toBeLessThan(140);
    expect(footer.y + footer.height).toBeLessThanOrEqual(845);
});

test('manual music link opens a separate tab and its pause is never changed by the site', async ({ page, context }) => {
    await prepareApp(page, { mockOpen: false });
    await page.addInitScript(chapters => {
        sessionStorage.setItem('ana-mil-anos-attempted-v1', 'true');
        localStorage.setItem('ana-chapters-completed-v1', JSON.stringify(chapters));
    }, chapters);
    await context.route('https://www.youtube.com/**', route => route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><meta charset="UTF-8"><title>Mil Anos fixture</title><button onclick="document.body.dataset.paused = \'true\'">Pausar música</button>'
    }));
    await page.goto('/principal.html');
    const newTab = context.waitForEvent('page');
    await page.locator('#music-link').click();
    const music = await newTab;
    await expect(music).toHaveURL(musicURL);
    await expect(page).toHaveURL(/principal\.html$/);
    expect(await music.evaluate(() => window.opener)).toBeNull();
    await music.getByRole('button', { name: 'Pausar música' }).click();
    await page.bringToFront();
    await page.locator('.story-card').first().click();
    await expect(page).toHaveURL(/historia\/porque-amo\.html$/);
    await page.evaluate(() => window.LoveStory.navigate('/final.html'));
    await expect(page.locator('#final-video')).toBeVisible();
    await expect(page.locator('#final-unlocked')).toContainText('pause na aba do YouTube');
    expect(await music.locator('body').getAttribute('data-paused')).toBe('true');
    await page.locator('#final-video').evaluate(video => video.dispatchEvent(new Event('ended')));
    await expect(page).toHaveURL(/principal\.html$/);
    expect(await music.locator('body').getAttribute('data-paused')).toBe('true');
    expect(context.pages()).toHaveLength(2);
    await music.close();
});

test('the video included in the project opens directly after the last unread chapter', async ({ page }) => {
    await prepareApp(page);
    await page.addInitScript(chapters => {
        localStorage.setItem('ana-chapters-completed-v1', JSON.stringify(chapters.slice(0, -1)));
    }, chapters);
    await page.goto('/principal.html');
    await page.locator('.story-card').last().click();
    await expect(page).toHaveURL(/historia\/viagens\.html$/);
    await readChapter(page);
    await expect(page).toHaveURL(/final\.html$/);
    const video = page.locator('#final-video');
    await expect(video).toHaveAttribute('src', /\/assets\/video-final\.mp4$/);
    await expect.poll(() => video.evaluate(element => ({
        loaded: element.readyState >= 2,
        hasDuration: Number.isFinite(element.duration) && element.duration > 0,
        playing: !element.paused,
        error: element.error?.code || null
    })), { timeout: 20000 }).toEqual({ loaded: true, hasDuration: true, playing: true, error: null });
    await expect(page.locator('#music-player, iframe')).toHaveCount(0);
});

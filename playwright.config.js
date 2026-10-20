const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    workers: 1,
    use: {
        baseURL: 'http://127.0.0.1:8000',
        viewport: { width: 1280, height: 800 },
        reducedMotion: 'reduce',
        headless: true,
        channel: process.env.PLAYWRIGHT_CHANNEL
    },
    webServer: {
        command: 'python -m http.server 8000 --bind 127.0.0.1',
        url: 'http://127.0.0.1:8000',
        reuseExistingServer: true
    }
});

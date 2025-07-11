import playwright from 'playwright';
import 'dotenv/config';

export const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;

const WAIT_TIMEOUT = 500;

export default async function launchBrowserWithProxy(browserType: typeof BROWSERS[number]) {
    try {
        console.log(`Launching browser: ${browserType}`);
        return await playwright[browserType].launch({
            proxy: {
                server: process.env.PROXY_SERVER!,
                username: process.env.PROXY_USER,
                password: process.env.PROXY_PASS
            }
        });
    } catch (error) {
        console.error(`Failed to launch ${browserType}:`, error);
        return null;
    }
}

export async function navigateToPage(browser: playwright.Browser, url: string) {
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(WAIT_TIMEOUT);
        return page;
    } catch (error) {
        console.error('Navigation failed:', error);
        return null;
    }
}
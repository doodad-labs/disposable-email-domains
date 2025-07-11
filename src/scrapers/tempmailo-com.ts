import playwright from 'playwright';
import validateDomain from '../utils/validate-domain';
import extractDomain from '../utils/extract-domain';

import processDomainsResults from './utils/process';
import launchBrowserWithProxy, { BROWSERS, navigateToPage } from './utils/launch';

const URL = "https://tempmailo.com/";
const CHANGES = 30; // Number of times to change the email
const WAIT_TIMEOUT = {
    navigation: 500,
    interaction: 500,
    emailChange: 1000,
    waitFor: 5000
};

export default async function scrapeTempMailoDomains() {
    console.log('Starting parallel scraping for tempmailo.com...');
    const domains = new Set<string>();

    // Process all browsers in parallel
    const results = await Promise.allSettled(
        BROWSERS.map(browserType => processBrowser(browserType))
    );

    // Combine results from all browsers
    for (const result of results) {
        if (result.status === 'fulfilled') {
            result.value.forEach(domain => domains.add(domain));
        }
    }

    processDomainsResults(domains, URL);
}

async function processBrowser(browserType: typeof BROWSERS[number]) {
    const browserDomains = new Set<string>();
    const browser = await launchBrowserWithProxy(browserType);
    if (!browser) return browserDomains;

    try {
        const page = await navigateToPage(browser, URL);
        if (!page) return browserDomains;

        await handleConsent(page, browserType);
        
        if (!await verifyInitialState(page, browserType)) {
            return browserDomains;
        }

        const extractedDomains = await performEmailChanges(page, browserType);
        extractedDomains.forEach(domain => browserDomains.add(domain));
    } catch (error) {
        console.error(`Error processing ${browserType}:`, error);
    } finally {
        await browser.close();
    }

    return browserDomains;
}

async function handleConsent(page: playwright.Page, browserType: string) {
    const consentButton = await page.$('div.fc-consent-root button[aria-label="Consent"]');
    if (!consentButton) {
        console.error(`Consent button not found on ${browserType}`);
        return;
    }
    console.log(`Clicking consent button on ${browserType}`);
    await consentButton.click();
    await page.waitForTimeout(WAIT_TIMEOUT.interaction);
}

async function verifyInitialState(page: playwright.Page, browserType: string) {
    const changeEmailButton = await page.$('div.primaryCommands div.prim-btn-wrap:last-child button.prim-btn');
    if (!changeEmailButton) {
        console.error(`Change email button not found on ${browserType}`);
        return false;
    }

    const email = await page.$('input#i-email[readonly="readonly"]');
    if (!email) {
        console.error(`Email input not found on ${browserType}`);
        return false;
    }

    return true;
}

async function performEmailChanges(page: playwright.Page, browserType: string) {
    const domains = new Set<string>();

    for (let i = 0; i < CHANGES; i++) {
        await page.waitForTimeout(WAIT_TIMEOUT.emailChange);

        await page.waitForSelector('input#i-email[readonly="readonly"]', { timeout: WAIT_TIMEOUT.waitFor });
        const email = await page.$('input#i-email[readonly="readonly"]');
        if (!email) {
            console.error(`Email input not found on ${browserType}`);
            break;
        }

        const emailText = await email.inputValue();
        console.log(`[${browserType}] Found email:`, emailText);

        if (emailText?.trim()) {
            try {
                const domain = await extractDomain(emailText);
                const normalizedDomain = domain.trim().toLowerCase().replace('\\n', '');
                if (validateDomain(normalizedDomain)) {
                    domains.add(normalizedDomain);
                }
            } catch (error) {
                console.error(`Error processing email ${emailText} on ${browserType}:`, error);
            }
        }

        if (await checkRateLimit(page, browserType)) {
            break;
        }

        await page.waitForSelector('div.primaryCommands div.prim-btn-wrap:last-child button.prim-btn', { timeout: WAIT_TIMEOUT.waitFor });
        const changeEmailButton = await page.$('div.primaryCommands div.prim-btn-wrap:last-child button.prim-btn');
        if (!changeEmailButton) {
            console.error(`Change email button not found on ${browserType}`);
            break;
        }

        await changeEmailButton.click();

        await page.waitForSelector('button.pure-button-primary:has-text("Ok")', { timeout: WAIT_TIMEOUT.waitFor });
        const confirmButton = await page.$('button.pure-button-primary:has-text("Ok")');
        if (!confirmButton) {
            console.error(`Confirm button not found after changing email on ${browserType}`);
            break;
        }

        await confirmButton.click();
        await page.waitForTimeout(WAIT_TIMEOUT.interaction);

        if (await checkRateLimit(page, browserType)) {
            break;
        }
    }

    return domains;
}

async function checkRateLimit(page: playwright.Page, browserType: string) {
    if (await page.$('h3:has-text("Rate limit exceeded! Try again later.")')) {
        console.error(`Rate limit exceeded on ${browserType}. Stopping further changes.`);
        return true;
    }
    return false;
}

if (require.main === module) {
    scrapeTempMailoDomains().catch(error => {
        console.error('Scraping process failed:', error);
        process.exit(1);
    });
}
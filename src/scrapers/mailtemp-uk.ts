import playwright from 'playwright';
import validateDomain from '../utils/validate-domain';

import processDomainsResults from './utils/process';
import launchBrowserWithProxy, { BROWSERS, navigateToPage } from './utils/launch';

const URL = "https://mailtemp.uk/";
const WAIT_TIMEOUT = { navigation: 1000, interaction: 500, waitFor: 5000 };

async function extractDomainsFromPage(page: playwright.Page) {
    const domains = new Set<string>();

    try {
        await page.waitForSelector('div[x-data="{ open: false }"]', { timeout: WAIT_TIMEOUT.waitFor });
        const changeEmailButton = await page.$('div[x-data="{ open: false }"]');
        if (!changeEmailButton) {
            console.error('Change email button not found');
            return domains;
        }

        await changeEmailButton.click();
        await page.waitForTimeout(WAIT_TIMEOUT.interaction);

        const options = await page.$$('div[x-show="open"] a');
        if (!options.length) {
            console.error('No options found in the change selector');
            return domains;
        }

        for (const option of options) {
            const domainText = await option.innerText();
            const domain = domainText?.trim().toLowerCase();
            if (domain && validateDomain(domain)) {
                domains.add(domain);
            }
        }
    } catch (error) {
        console.error('Domain extraction failed:', error);
    }

    return domains;
}

export default async function scrapeMailTempDomains() {
    console.log('Starting parallel scraping for mailtemp.uk...');
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

        const extractedDomains = await extractDomainsFromPage(page);
        extractedDomains.forEach(domain => browserDomains.add(domain));
    } catch (error) {
        console.error(`Error processing ${browserType}:`, error);
    } finally {
        await browser.close();
    }

    return browserDomains;
}

if (require.main === module) {
    scrapeMailTempDomains().catch(error => {
        console.error('Scraping process failed:', error);
        process.exit(1);
    });
}
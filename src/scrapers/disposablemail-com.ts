import playwright from 'playwright';
import validateDomain from '../utils/validate-domain';
import extractDomain from '../utils/extract-domain';

import processDomainsResults from './utils/process';
import launchBrowserWithProxy, { BROWSERS, navigateToPage } from './utils/launch';

const URL = "https://disposablemail.com/";
const CHANGES = 5; // Number of times to change the email

export default async function scrapeTempMailDomains() {
    console.log('Starting parallel scraping for disposablemail.com...');
    const domains = new Set<string>();

    // Process all browsers in parallel
    const results: {status: string, value?: any, reason?: any}[] = [];
    for (const browserType of BROWSERS) {
        try {
            const result = await processBrowser(browserType);
            results.push({ status: 'fulfilled', value: result });
        } catch (error) {
            results.push({ status: 'rejected', reason: error });
        }
    }

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

        const extractedDomains = await extractDomainsFromPage(page, browserType);
        extractedDomains.forEach(domain => browserDomains.add(domain));
    } catch (error) {
        console.error(`Error processing ${browserType}:`, error);
    } finally {
        await browser.close();
    }

    return browserDomains;
}

async function extractDomainsFromPage(page: playwright.Page, browserType: string) {
    const domains = new Set<string>();

    try {
        const emailInput = await page.$('span#email');
        if (!emailInput) {
            console.error('Email input not found');
            return domains;
        }

        let lastEmailText = '';
        for (let _ = 0; _ < CHANGES; _++) {

            const emailInput = await page.$('span#email');
            if (!emailInput) {
                console.error('Email input not found');
                continue;
            }

            let emailText = 'loading...';
            while (emailText === 'loading...') {
                emailText = await emailInput.innerText();
            }

            if (!emailText || emailText === '') {
                console.error(`[${browserType}] Email input is empty or not found.`);
                continue;
            }

            console.log(`[${browserType}] Found email:`, emailText);

            // Check if the email text has changed to avoid processing the same email multiple times
            if (emailText === lastEmailText) {
                console.log(`[${browserType}] Email has not changed, rate limited.`);
                break;
            }

            lastEmailText = emailText;

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

            await page.goto(`${URL}delete`);
        }

    } catch (error) {
        console.error('Domain extraction failed:', error);
    }

    return domains;
}

if (require.main === module) {
    scrapeTempMailDomains().catch(error => {
        console.error('Scraping process failed:', error);
        process.exit(1);
    });
}
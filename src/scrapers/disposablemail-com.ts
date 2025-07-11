import playwright from 'playwright';
import validateDomain from '../utils/validate-domain';
import extractDomain from '../utils/extract-domain';
import processDomainsResults from './utils/process';
import launchBrowserWithProxy, { BROWSERS, navigateToPage } from './utils/launch';

// Constants
const DISPOSABLE_MAIL_URL = "https://disposablemail.com/";
const MAX_EMAIL_CHANGES = 5; // Maximum number of email changes to attempt
const EMAIL_LOAD_TIMEOUT = 10000; // 10 seconds timeout for email to load
const EMAIL_CHANGE_DELAY = 2000; // 2 second delay between email changes
const MAX_RETRIES = 3; // Maximum retries for failed operations

/**
 * Main scraping function that coordinates the domain collection process
 */
export default async function scrapeTempMailDomains(): Promise<void> {
    console.log('Starting parallel scraping for disposablemail.com...');
    const domains = new Set<string>();
    const startTime = Date.now();

    try {
        // Process all browsers in parallel with error handling
        const results = await Promise.allSettled(
            BROWSERS.map(browserType => scrapeWithBrowser(browserType))
        );

        // Process results from all browsers
        for (const result of results) {
            if (result.status === 'fulfilled') {
                result.value.forEach(domain => domains.add(domain));
            } else {
                console.error('Browser scraping failed:', result.reason);
            }
        }

        console.log(`Scraping completed in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
        processDomainsResults(domains, DISPOSABLE_MAIL_URL);
    } catch (error) {
        console.error('Scraping process failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

/**
 * Scrapes domains using a specific browser type
 * @param browserType - The browser to use for scraping
 * @returns Set of discovered domains
 */
async function scrapeWithBrowser(browserType: typeof BROWSERS[number]): Promise<Set<string>> {
    const domains = new Set<string>();
    let retryCount = 0;
    let success = false;

    // Retry mechanism for browser operations
    while (retryCount < MAX_RETRIES && !success) {
        try {
            const browser = await launchBrowserWithProxy(browserType);
            if (!browser) throw new Error('Browser failed to launch');

            try {
                const page = await navigateToPage(browser, DISPOSABLE_MAIL_URL);
                if (!page) throw new Error('Page navigation failed');

                const extractedDomains = await extractDomainsFromPage(page, browserType);
                extractedDomains.forEach(domain => domains.add(domain));
                success = true;
            } finally {
                await browser.close().catch(error => {
                    console.error(`Error closing ${browserType} browser:`, error);
                });
            }
        } catch (error) {
            retryCount++;
            if (retryCount >= MAX_RETRIES) {
                throw new Error(`Failed after ${MAX_RETRIES} attempts with ${browserType}: ${error instanceof Error ? error.message : error}`);
            }
            console.warn(`Retry ${retryCount}/${MAX_RETRIES} for ${browserType}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
        }
    }

    return domains;
}

/**
 * Extracts domains from the disposable email page
 * @param page - Playwright page instance
 * @param browserType - Browser type for logging
 * @returns Set of validated domains
 */
async function extractDomainsFromPage(page: playwright.Page, browserType: string): Promise<Set<string>> {
    const domains = new Set<string>();
    let lastEmailText = '';
    let changeAttempts = 0;

    try {
        while (changeAttempts < MAX_EMAIL_CHANGES) {
            changeAttempts++;

            try {
                const emailElement = await page.waitForSelector('span#email', { timeout: EMAIL_LOAD_TIMEOUT });
                if (!emailElement) {
                    console.error(`[${browserType}] Email element not found`);
                    continue;
                }

                let emailText = await waitForEmailText(emailElement, browserType);
                if (!emailText) continue;

                // Skip processing if email hasn't changed
                if (emailText === lastEmailText) {
                    console.log(`[${browserType}] Email unchanged, possible rate limit`);
                    break;
                }

                lastEmailText = emailText;
                console.log(`[${browserType}] Processing email: ${emailText}`);

                // Extract and validate domain
                const domain = await extractAndValidateDomain(emailText, browserType);
                if (domain) domains.add(domain);

                // Change to a new email
                await changeEmail(page, browserType);
                await page.waitForTimeout(EMAIL_CHANGE_DELAY); // Be polite with delays
            } catch (error) {
                console.error(`[${browserType}] Error during email change #${changeAttempts}:`, error instanceof Error ? error.message : error);
                break;
            }
        }
    } catch (error) {
        console.error(`[${browserType}] Page processing failed:`, error instanceof Error ? error.message : error);
    }

    return domains;
}

/**
 * Waits for email text to load and become valid
 * @param element - Playwright element handle
 * @param browserType - Browser type for logging
 * @returns Valid email text or null
 */
async function waitForEmailText(element: playwright.ElementHandle, browserType: string): Promise<string | null> {
    const startTime = Date.now();
    let emailText = '';

    while (Date.now() - startTime < EMAIL_LOAD_TIMEOUT) {
        emailText = (await element.innerText()).trim();
        
        if (emailText && emailText !== 'loading...') {
            return emailText;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.error(`[${browserType}] Timed out waiting for email to load`);
    return null;
}

/**
 * Extracts and validates a domain from an email address
 * @param emailText - The email address text
 * @param browserType - Browser type for logging
 * @returns Validated domain or null
 */
async function extractAndValidateDomain(emailText: string, browserType: string): Promise<string | null> {
    try {
        const domain = await extractDomain(emailText);
        const normalizedDomain = domain
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '') // Remove any whitespace
            .replace(/\\n/g, ''); // Remove newline characters

        if (validateDomain(normalizedDomain)) {
            return normalizedDomain;
        }
        
        console.warn(`[${browserType}] Invalid domain format: ${normalizedDomain}`);
    } catch (error) {
        console.error(`[${browserType}] Error processing email ${emailText}:`, error instanceof Error ? error.message : error);
    }
    
    return null;
}

/**
 * Changes to a new disposable email
 * @param page - Playwright page instance
 * @param browserType - Browser type for logging
 */
async function changeEmail(page: playwright.Page, browserType: string): Promise<void> {
    try {
        /* await page.goto(`${DISPOSABLE_MAIL_URL}delete`, { waitUntil: 'domcontentloaded' }).catch(error => {
            console.error(`[${browserType}] Failed to navigate to delete page:`, error instanceof Error ? error.message : error);
        }); */

        // Clear cookies to reset the session
        await page.context().clearCookies().catch(error => {
            console.error(`[${browserType}] Failed to clear cookies:`, error instanceof Error ? error.message : error);
        })

        // Refresh the page to get a new email
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(error => {
            console.error(`[${browserType}] Failed to reload page for new email:`, error instanceof Error ? error.message : error);
        });

    } catch (error) {
        console.error(`[${browserType}] Failed to change email:`, error instanceof Error ? error.message : error);
        throw error;
    }
}

// Execute if run directly
if (require.main === module) {
    scrapeTempMailDomains().catch(error => {
        console.error('Scraping process failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    });
}
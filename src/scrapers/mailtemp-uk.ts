import playwright from 'playwright';
import validateDomain from '../utils/validate-domain';
import processDomainsResults from './utils/process';
import launchBrowserWithProxy, { BROWSERS, navigateToPage } from './utils/launch';

// Constants
const MAILTEMP_URL = "https://mailtemp.uk/";
const MAX_RETRIES = 3;
const DELAY_BETWEEN_RETRIES = 2000; // 2 seconds

// Timeout configurations
const WAIT_TIMEOUT = {
    navigation: 10000, // Increased from 1s to 10s for more reliability
    interaction: 1000, // Increased from 500ms
    selector: 15000,   // Increased from 5s to 15s for slow pages
    action: 5000       // New timeout for actions
};

// Selector constants
const SELECTORS = {
    changeEmailButton: 'form div[x-data="{ open: false }"]',
    emailOptions: 'form div[x-data="{ open: false }"] div[x-show="open"] a'
};

/**
 * Main scraping function that coordinates the domain collection process
 */
export default async function scrapeMailTempDomains(): Promise<void> {
    console.log('Starting parallel scraping for mailtemp.uk...');
    const startTime = Date.now();
    const domains = new Set<string>();

    try {
        // Process all browsers in parallel with error handling
        const results = await Promise.allSettled(
            BROWSERS.map(browserType => scrapeWithBrowser(browserType))
        );

        // Process results from all browsers
        let successCount = 0;
        for (const result of results) {
            if (result.status === 'fulfilled') {
                result.value.forEach(domain => domains.add(domain));
                successCount++;
            } else {
                console.error('Browser scraping failed:', result.reason?.message || result.reason);
            }
        }

        console.log(`Scraping completed in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
        console.log(`Successfully scraped from ${successCount}/${BROWSERS.length} browsers`);
        processDomainsResults(domains, MAILTEMP_URL);
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
    let lastError: Error | null = null;

    while (retryCount < MAX_RETRIES) {
        try {
            const browser = await launchBrowserWithProxy(browserType);
            if (!browser) {
                throw new Error('Browser failed to launch');
            }

            try {
                const page = await navigateToPage(browser, MAILTEMP_URL);
                if (!page) {
                    throw new Error('Page navigation failed');
                }

                const extractedDomains = await extractDomainsFromPage(page, browserType);
                extractedDomains.forEach(domain => domains.add(domain));
                return domains;
            } finally {
                await browser.close().catch(error => {
                    console.error(`Error closing ${browserType} browser:`, error.message);
                });
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            retryCount++;
            console.warn(`Attempt ${retryCount}/${MAX_RETRIES} failed for ${browserType}: ${lastError.message}`);
            
            if (retryCount < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_RETRIES * retryCount));
            }
        }
    }

    throw lastError || new Error(`Failed after ${MAX_RETRIES} attempts with ${browserType}`);
}

/**
 * Extracts domains from the MailTemp.uk page
 * @param page - Playwright page instance
 * @param browserType - Browser type for logging
 * @returns Set of validated domains
 */
async function extractDomainsFromPage(page: playwright.Page, browserType: string): Promise<Set<string>> {
    const domains = new Set<string>();

    try {
        // Wait for and click the domain selector
        await page.waitForSelector(SELECTORS.changeEmailButton, { timeout: WAIT_TIMEOUT.selector });
        
        const changeEmailButton = await page.$(SELECTORS.changeEmailButton);
        if (!changeEmailButton) {
            throw new Error('Change email button not found');
        }

        await changeEmailButton.click({ timeout: WAIT_TIMEOUT.action });
        await page.waitForTimeout(WAIT_TIMEOUT.interaction);

        // Extract all domain options
        const options = await page.$$(SELECTORS.emailOptions);
        if (!options.length) {
            throw new Error('No domain options found in the selector');
        }

        // Process each domain option
        for (const [index, option] of options.entries()) {
            try {
                const domainText = await option.innerText();
                const domain = domainText?.trim().toLowerCase();
                
                if (!domain) {
                    console.warn(`[${browserType}] Empty domain text at index ${index}`);
                    continue;
                }

                if (validateDomain(domain)) {
                    domains.add(domain);
                    console.log(`[${browserType}] Valid domain found: ${domain}`);
                } else {
                    console.warn(`[${browserType}] Invalid domain format: ${domain}`);
                }
            } catch (error) {
                console.error(`[${browserType}] Error processing domain option ${index}:`, 
                    error instanceof Error ? error.message : error);
            }
        }
    } catch (error) {
        console.error(`[${browserType}] Domain extraction failed:`, 
            error instanceof Error ? error.message : error);
    }

    return domains;
}

// Execute if run directly
if (require.main === module) {
    scrapeMailTempDomains().catch(error => {
        console.error('Scraping process failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    });
}
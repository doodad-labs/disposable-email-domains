import playwright from 'playwright';
import validateDomain from '../utils/validate-domain';
import extractDomain from '../utils/extract-domain';
import processDomainsResults from './utils/process';
import launchBrowserWithProxy, { BROWSERS, navigateToPage } from './utils/launch';

// Constants
const SMAILPRO_URL = "https://smailpro.com/";
const MAX_EMAIL_CHANGES = 15;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Timeout configurations (in milliseconds)
const WAIT_TIMEOUT = {
    navigation: 10000,    // Page navigation
    interaction: 1000,    // UI interactions
    emailChange: 3000,    // Email generation delay
    selector: 15000,      // Element selection
    action: 5000          // User actions
};

// Selector constants
const SELECTORS = {
    changeEmailButton: 'button[title="Create temporary email"]',
    emailDisplay: 'div[x-text="getTemporaryEmailAddress()"]',
    popupConfirm: 'button:has-text("Create")'
};

/**
 * Main scraping function that coordinates the domain collection process
 */
export default async function scrapeTempMailDomains(): Promise<void> {
    console.log('Starting parallel scraping for smailpro.com...');
    const startTime = Date.now();
    const domains = new Set<string>();

    try {
        // Process all browsers in parallel with error handling
        const results = await Promise.allSettled(
            BROWSERS.map(browserType => scrapeWithBrowser(browserType))
        );

        // Process results and statistics
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
        processDomainsResults(domains, SMAILPRO_URL);
    } catch (error) {
        console.error('Scraping process failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

/**
 * Scrapes domains using a specific browser type with retry logic
 * @param browserType - The browser to use for scraping
 * @returns Set of discovered domains
 */
async function scrapeWithBrowser(browserType: typeof BROWSERS[number]): Promise<Set<string>> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const browser = await launchBrowserWithProxy(browserType);
        if (!browser) {
            lastError = new Error('Browser failed to launch');
            continue;
        }

        try {
            const page = await navigateToPage(browser, SMAILPRO_URL);
            if (!page) {
                throw new Error('Page navigation failed');
            }

            const domains = await extractDomainsFromPage(page, browserType);
            return domains;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`Attempt ${attempt}/${MAX_RETRIES} failed for ${browserType}: ${lastError.message}`);
            
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            }
        } finally {
            await browser.close().catch(err => {
                console.error(`Error closing ${browserType} browser:`, err.message);
            });
        }
    }

    throw lastError || new Error(`Failed after ${MAX_RETRIES} attempts with ${browserType}`);
}

/**
 * Extracts domains from the SmailPro page
 * @param page - Playwright page instance
 * @param browserType - Browser type for logging
 * @returns Set of validated domains
 */
async function extractDomainsFromPage(page: playwright.Page, browserType: string): Promise<Set<string>> {
    const domains = new Set<string>();
    let successfulChanges = 0;

    try {
        // Initialize email change process
        await initializeEmailChange(page, browserType);

        while (successfulChanges < MAX_EMAIL_CHANGES) {
            try {
                // Get current email and extract domain
                const emailText = await getCurrentEmail(page, browserType);
                if (!emailText) continue;

                const domain = await processEmailDomain(emailText, browserType);
                if (domain) {
                    domains.add(domain);
                    successfulChanges++;
                }

                // Generate new email
                await generateNewEmail(page, browserType);
            } catch (error) {
                console.error(`[${browserType}] Error during email change #${successfulChanges + 1}:`, 
                    error instanceof Error ? error.message : error);
                break;
            }
        }
    } catch (error) {
        console.error(`[${browserType}] Page processing failed:`, 
            error instanceof Error ? error.message : error);
    }

    console.log(`[${browserType}] Successfully processed ${successfulChanges}/${MAX_EMAIL_CHANGES} email changes`);
    return domains;
}

/**
 * Gets the current email address from the page
 */
async function getCurrentEmail(page: playwright.Page, browserType: string): Promise<string | null> {
    try {
        const emailElement = await page.waitForSelector(SELECTORS.emailDisplay, { 
            timeout: WAIT_TIMEOUT.selector 
        });
        if (!emailElement) {
            console.error(`[${browserType}] Email display element not found`);
            return null;
        }

        const emailText = await emailElement.innerText();
        if (!emailText?.trim()) {
            console.error(`[${browserType}] Empty email text`);
            return null;
        }

        console.log(`[${browserType}] Current email: ${emailText.trim()}`);
        return emailText.trim();
    } catch (error) {
        console.error(`[${browserType}] Error getting current email:`, 
            error instanceof Error ? error.message : error);
        return null;
    }
}

/**
 * Processes and validates an email domain
 */
async function processEmailDomain(emailText: string, browserType: string): Promise<string | null> {
    try {
        const domain = await extractDomain(emailText);
        const normalizedDomain = domain
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/\\n/g, '');

        if (validateDomain(normalizedDomain)) {
            return normalizedDomain;
        }

        console.warn(`[${browserType}] Invalid domain format: ${normalizedDomain}`);
        return null;
    } catch (error) {
        console.error(`[${browserType}] Error processing email domain:`, 
            error instanceof Error ? error.message : error);
        return null;
    }
}

/**
 * Initializes the email change process
 */
async function initializeEmailChange(page: playwright.Page, browserType: string): Promise<void> {
    try {
        await page.waitForSelector(SELECTORS.changeEmailButton, { timeout: WAIT_TIMEOUT.selector });
        const button = await page.$(SELECTORS.changeEmailButton);
        if (!button) throw new Error('Initial change email button not found');
        
        await button.click({ timeout: WAIT_TIMEOUT.action });
        await page.waitForTimeout(WAIT_TIMEOUT.interaction);
    } catch (error) {
        throw new Error(`Initialization failed: ${error instanceof Error ? error.message : error}`);
    }
}

/**
 * Generates a new temporary email
 */
async function generateNewEmail(page: playwright.Page, browserType: string): Promise<void> {
    try {
        // Click change email button
        const changeButton = await page.$(SELECTORS.changeEmailButton);
        if (!changeButton) throw new Error('Change email button not found');
        
        await changeButton.click({ timeout: WAIT_TIMEOUT.action });
        await page.waitForTimeout(WAIT_TIMEOUT.interaction);

        // Confirm the change in popup if it appears
        const confirmButton = await page.$(SELECTORS.popupConfirm);
        if (confirmButton) {
            await confirmButton.click({ timeout: WAIT_TIMEOUT.action });
            await page.waitForTimeout(WAIT_TIMEOUT.interaction);
        }

        // Wait for new email to generate
        await page.waitForTimeout(WAIT_TIMEOUT.emailChange);
    } catch (error) {
        throw new Error(`Email generation failed: ${error instanceof Error ? error.message : error}`);
    }
}

// Execute if run directly
if (require.main === module) {
    scrapeTempMailDomains().catch(error => {
        console.error('Scraping process failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    });
}
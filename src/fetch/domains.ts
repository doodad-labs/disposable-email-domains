import { allowlist_txt, blacklists_txt, blacklists_json, blacklists_csv } from './aggregate-domains';
import fs from 'fs';
import validateDomain from '../utils/validate-domain';
import { addToDisposableList, addToAllowlist } from '../utils/add-to-list';

// Constants
const INPUT_ALLOWLIST_PATH = './data/allow_list.txt'; // Path to the local allowlist file
const MAX_CONCURRENT_REQUESTS = 5; // Limit concurrent network requests to avoid rate limiting

// Domain collections
const allowlistSet: Set<string> = new Set();
const disposables: Set<string> = new Set();

/**
 * Fetches data from a URL and processes it based on the provided parameters
 * @param url - The URL to fetch data from
 * @param key - For JSON responses, the key to extract data from (null for non-JSON)
 * @param col - For CSV responses, the column index to extract (null for non-CSV)
 * @returns Array of processed strings (domains)
 */
async function fetchData(url: string, key: string | null, col: number | null): Promise<string[]> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        // Process JSON responses
        if (key !== null) {
            const json = await response.json();
            const data = key === '.' ? json : json[key];
            return Array.isArray(data) ? data : [];
        }

        const textData = await response.text();

        // Process CSV responses
        if (col !== null) {
            return textData
                .split('\n')
                .map(line => {
                    const parts = line.split(',');
                    return parts[col]?.trim().toLowerCase().replaceAll(/"/g, '') || '';
                })
                .filter(line => line && !line.startsWith('#'));
        }

        // Process plain text responses
        return textData
            .split('\n')
            .map(line => line.trim().toLowerCase())
            .filter(line => line && !line.startsWith('#'));

    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error instanceof Error ? error.message : error);
        return [];
    }
}

/**
 * Processes a batch of domains, adding them to the appropriate set
 * @param domains - Array of domains to process
 * @param isAllowlist - Whether these domains are for the allowlist
 */
function processDomains(domains: string[], isAllowlist: boolean): void {
    for (const domain of domains) {
        if (validateDomain(domain)) {
            if (isAllowlist) {
                allowlistSet.add(domain);
            } else if (!allowlistSet.has(domain)) {
                disposables.add(domain);
            }
        }
    }
}

/**
 * Limits concurrent execution of promises
 * @param tasks - Array of functions that return promises
 * @param limit - Maximum number of concurrent promises
 */
async function throttlePromises<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
        const p = task().then(result => {
            results.push(result);
            executing.splice(executing.indexOf(p), 1);
        });
        executing.push(p);

        if (executing.length >= limit) {
            await Promise.race(executing);
        }
    }

    return Promise.all(executing).then(() => results);
}

/**
 * Loads and processes all domain lists from various sources
 */
async function fetchDomains(): Promise<void> {
    // Load local allowlist file if it exists
    try {
        if (fs.existsSync(INPUT_ALLOWLIST_PATH)) {
            const allowlistContent = fs.readFileSync(INPUT_ALLOWLIST_PATH, 'utf-8');
            const allowlistLines = allowlistContent
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => line.trim().toLowerCase());
            
            allowlistLines.forEach(domain => allowlistSet.add(domain));
            console.log(`Loaded ${allowlistLines.length} domains from local allowlist`);
        }
    } catch (error) {
        console.error('Error reading allowlist file:', error instanceof Error ? error.message : error);
    }

    // Create tasks for all fetch operations
    const fetchTasks = [
        // Allowlist tasks
        ...allowlist_txt.map(url => async () => {
            const domains = await fetchData(url, null, null);
            processDomains(domains, true);
            console.log(`Fetched ${domains.length} domains from ${url}`);
            return domains.length;
        }),
        
        // Blacklist tasks (txt)
        ...blacklists_txt.map(url => async () => {
            const domains = await fetchData(url, null, null);
            processDomains(domains, false);
            console.log(`Fetched ${domains.length} domains from ${url}`);
            return domains.length;
        }),
        
        // Blacklist tasks (json)
        ...blacklists_json.map(({ url, key }) => async () => {
            const domains = await fetchData(url, key, null);
            processDomains(domains, false);
            console.log(`Fetched ${domains.length} domains from ${url}`);
            return domains.length;
        }),
        
        // Blacklist tasks (csv)
        ...blacklists_csv.map(({ url, col }) => async () => {
            const domains = await fetchData(url, null, col);
            processDomains(domains, false);
            console.log(`Fetched ${domains.length} domains from ${url}`);
            return domains.length;
        })
    ];

    // Execute all fetch tasks with concurrency control
    await throttlePromises(fetchTasks, MAX_CONCURRENT_REQUESTS);

    console.log(`Allowlist contains ${allowlistSet.size} domains`);
    console.log(`Disposable list contains ${disposables.size} domains`);
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    try {
        console.time('Domain aggregation');
        await fetchDomains();
        
        console.log('Writing results to files...');
        await Promise.all([
            addToDisposableList([...disposables]),
            addToAllowlist([...allowlistSet])
        ]);
        
        console.timeEnd('Domain aggregation');
        console.log('Operation completed successfully');
    } catch (error) {
        console.error('Fatal error in main execution:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

// Execute the main function
main();
import fs from 'fs/promises';
import path from 'path';

// Constants
const IANA_TLDS_URL = 'https://data.iana.org/TLD/tlds-alpha-by-domain.txt';
const TSD_OUTPUT_PATH = './src/data/tlds.ts';
const TXT_OUTPUT_PATH = './data/tlds.txt';
const TLD_VALIDATION_REGEX = /^[a-z0-9-]+$/i; // Case-insensitive regex for TLD validation
const MAX_TLD_LENGTH = 63; // Maximum length of a TLD per RFC 1034

// Directories that need to exist
const REQUIRED_DIRECTORIES = [
    path.dirname(TSD_OUTPUT_PATH),
    path.dirname(TXT_OUTPUT_PATH)
];

/**
 * Validates a TLD against IANA standards
 * @param tld - The TLD to validate
 * @returns boolean indicating if the TLD is valid
 */
function isValidTld(tld: string): boolean {
    return (
        tld.length > 0 &&
        tld.length <= MAX_TLD_LENGTH &&
        TLD_VALIDATION_REGEX.test(tld) &&
        !tld.startsWith('-') &&
        !tld.endsWith('-')
    );
}

/**
 * Generates TypeScript file content with TLD data
 * @param tlds - Array of valid TLDs
 * @returns Formatted TypeScript file content
 */
function generateTsFileContent(tlds: string[]): string {
    return `// AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
// Data sourced from IANA's official TLD list
// Last updated: ${new Date().toISOString()}

/**
 * Array of all valid top-level domains (TLDs).
 * Sorted alphabetically for consistency.
 * @type {string[]}
 * @constant
 */
export const tldArray: string[] = [
${tlds.map(tld => `    "${tld.toLowerCase()}"`).join(',\n')}
];

/** 
 * Set of all valid top-level domains (TLDs) in lowercase.
 * This is used for quick O(1) lookups.
 * @type {Set<string>}
 * @constant
 */
export const tldSet: Set<string> = new Set(tldArray);

/**
 * Checks if a string is a valid TLD
 * @param domain - The domain or TLD to check
 * @returns boolean indicating if the input is a valid TLD
 */
export function isValidTld(domain: string): boolean {
    return tldSet.has(domain.toLowerCase());
}
`.trim();
}

/**
 * Processes TLDs and generates output files
 * @param tlds - Raw TLDs from IANA
 * @throws Error if validation fails or file writing fails
 */
async function processTlds(tlds: string[]): Promise<void> {
    // Validate and normalize TLDs
    const validTlds = tlds
        .map(tld => tld.trim())
        .filter(tld => tld && !tld.startsWith('#'))
        .filter(isValidTld)
        .sort((a, b) => a.localeCompare(b)); // Sort alphabetically

    // Security validation
    if (validTlds.length === 0) {
        throw new Error('No valid TLDs found - possible data corruption');
    }

    if (validTlds.length !== tlds.filter(t => t && !t.startsWith('#')).length) {
        console.warn('Warning: Some TLDs were filtered out during validation');
    }

    // Ensure output directories exist
    await Promise.all(
        REQUIRED_DIRECTORIES.map(dir => 
            fs.mkdir(dir, { recursive: true })
    ));

    // Generate and write files
    await Promise.all([
        fs.writeFile(
            TSD_OUTPUT_PATH,
            generateTsFileContent(validTlds)
        ),
        fs.writeFile(
            TXT_OUTPUT_PATH,
            validTlds.join('\n')
        )
    ]);

    console.log(`Successfully generated:
- TypeScript file: ${TSD_OUTPUT_PATH}
- Text file: ${TXT_OUTPUT_PATH}
With ${validTlds.length} valid TLDs`);
}

/**
 * Fetches the current TLD list from IANA
 * @returns Array of valid TLDs
 * @throws Error if fetch fails or data is invalid
 */
async function fetchTldList(): Promise<string[]> {
    const response = await fetch(IANA_TLDS_URL);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    const data = await response.text();
    return data.split('\n');
}

/**
 * Main execution function with error handling and logging
 */
async function updateTldList(): Promise<void> {
    try {
        console.time('TLD Update');
        console.log('Starting TLD list update from IANA...');
        
        const rawTlds = await fetchTldList();
        await processTlds(rawTlds);
        
        console.timeEnd('TLD Update');
        console.log('TLD list successfully updated');
    } catch (error) {
        console.error('Failed to update TLD list:');
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

// Execute the update process
updateTldList();
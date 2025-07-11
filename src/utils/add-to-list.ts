import fs from 'fs';
import validateDomain from './validate-domain';
import { allowlist_txt, blacklists_txt, blacklists_json, blacklists_csv } from '../fetch/aggregate-domains';

const OUTPUT_LIST_PATH = './data/domains.txt'; // Output path for the generated plain text file
const INPUT_ALLOWLIST_PATH = './data/allow_list.txt'; // Path to the allowlist file

let allowlistSet: Set<string> = new Set<string>();
let disposables: Set<string> = new Set<string>();
let current_list_size = 0; // Variable to track the current size of the disposable email list

function updateReadme(domains: string[]) {

    const readmePath = './README.md';


    if (!fs.existsSync(readmePath)) {
        console.error(`${readmePath} not found at ${readmePath}`);
        return;
    }

    let readmeContent = fs.readFileSync(readmePath, 'utf-8');
    const lines = readmeContent.split('\n');
    const disposableCount = domains.length;

    // Update the disposable email database size in the README
    const marker = '<!-- disposable database size: the number between the backticks on the next line will be automatically updated -->';
    const markerIndex = lines.findIndex(line => line.includes(marker));
    if (markerIndex !== -1) {
        // simply replace the number between the backticks
        const regex = /`(\d+)`|`([\d,]+)`/g;

        if (lines[markerIndex + 1].match(regex)) {
            lines[markerIndex + 1] = lines[markerIndex + 1].replace(regex, `\`${disposableCount.toLocaleString()}\``);
        }
    }

    // Write the updated content back to the README file
    
    try {
        fs.writeFileSync(readmePath, lines.join('\n'), 'utf-8');
        console.log(`${readmePath} updated with disposable email database size: ${disposableCount}`);
    } catch (error) {
        console.error(`Failed to update ${readmePath}:`, error);
        return;
    }
    
}

export async function addToAllowlist(domains: string[]) {
    // Load allowlist from file if it exists
    if (fs.existsSync(INPUT_ALLOWLIST_PATH)) {
        const allowlistContent = fs.readFileSync(INPUT_ALLOWLIST_PATH, 'utf-8');
        const allowlistLines = allowlistContent.split('\n').filter(line => line.trim() && !line.startsWith('#')).map(line => line.trim().toLowerCase());
        allowlistSet = new Set(allowlistLines);
    }

    // Add new domains to the allowlist set
    for (const domain of domains) {
        const normalizedDomain = domain.trim().toLowerCase();
        if (await validateDomain(normalizedDomain)) {
            allowlistSet.add(normalizedDomain);
        }
    }

    domains = [...allowlistSet].sort((a, b) => a.localeCompare(b));

    console.log(`${domains.length} domains added to the allowlist.`);

    
    const txtContent = `
# a manual allow list, this allows contributors to add domains that may be false flagged
# some domains may have been sourced from external lists, but this is primarily for manual additions
${allowlist_txt.map(url => `# - ${url}`).join('\n')}

${domains.join('\n')}`;

    try {
        // Ensure the directory exists before writing
        await fs.promises.mkdir('./data', { recursive: true });
        // Write the generated content to file
        await fs.promises.writeFile(INPUT_ALLOWLIST_PATH, txtContent);
        console.log(`Successfully generated Domain file at ${INPUT_ALLOWLIST_PATH}`);
    } catch (error) {
        console.error('Failed to write Domain file:', error);
        throw error;
    }
}

export async function addToDisposableList(domains: string[]) {

    // Load allowlist from file if it exists
    if (fs.existsSync(INPUT_ALLOWLIST_PATH)) {
        const allowlistContent = fs.readFileSync(INPUT_ALLOWLIST_PATH, 'utf-8');
        const allowlistLines = allowlistContent.split('\n').filter(line => line.trim() && !line.startsWith('#')).map(line => line.trim().toLowerCase());
        allowlistSet = new Set(allowlistLines);
    }

    // Load the predefined allowlist and blacklists
    if (fs.existsSync(OUTPUT_LIST_PATH)) {
        const disposablesListContent = fs.readFileSync(OUTPUT_LIST_PATH, 'utf-8');
        const disposablesListLines = disposablesListContent.split('\n').filter(line => line.trim() && !line.startsWith('#')).map(line => line.trim().toLowerCase());
        disposables = new Set(disposablesListLines);
        current_list_size = disposablesListLines.length;
    }

    // Add new domains to the disposables set
    for (const domain of domains) {
        const normalizedDomain = domain.trim().toLowerCase();
        if (await validateDomain(normalizedDomain) && !allowlistSet.has(normalizedDomain)) {
            disposables.add(normalizedDomain);
        }
    }

    domains = [...disposables].sort((a, b) => a.localeCompare(b));

    console.log(`${domains.length - current_list_size} disposable email domains added.`);

    const txtContent = `# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
# Data sourced from various disposable email domain lists
${blacklists_txt.map(url => `# - ${url}`).join('\n')}
${blacklists_json.map(url => `# - ${url.url}`).join('\n')}
${blacklists_csv.map(url => `# - ${url.url}`).join('\n')}
# Last updated: ${new Date().toISOString()}

${domains.join('\n')}`;

    try {
        // Ensure the directory exists before writing
        await fs.promises.mkdir('./data', { recursive: true });
        // Write the generated content to file
        await fs.promises.writeFile(OUTPUT_LIST_PATH, txtContent);
        console.log(`Successfully generated Domain file at ${OUTPUT_LIST_PATH}`);
    } catch (error) {
        console.error('Failed to write Domain file:', error);
        throw error;
    }

    // Update the README file with the new size
    updateReadme(domains);

}
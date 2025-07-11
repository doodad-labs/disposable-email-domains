import { tldSet } from '../data/tlds';

export default function validateDomain(domain: string): boolean {
    if (!domain || domain.length > 253) {
        return false;
    }

    // Check for leading/trailing dots or whitespace
    if (domain.startsWith('.') || domain.endsWith('.') || domain.trim() !== domain) {
        return false;
    }

    // Split domain into labels
    const labels = domain.split('.');
    if (labels.length < 2) {
        return false; // At least one subdomain and TLD required
    }

    // Validate TLD (last label)
    const tld = labels[labels.length - 1].toLowerCase();
    if (!tldSet.has(tld)) {
        return false;
    }

    // Validate each label
    const labelRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
    for (const label of labels) {
        if (label.length > 63 || !labelRegex.test(label)) {
            return false;
        }
    }

    // Check for consecutive dots
    if (domain.includes('..')) {
        return false;
    }

    // Check for invalid characters
    if (/[^a-z0-9.-]/i.test(domain)) {
        return false;
    }

    return true;
}

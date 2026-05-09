import dns from 'node:dns/promises';

/**
 * Filters a list of domains, returning only those that have at least one MX record.
 * Handles concurrency with a limit and timeouts to avoid overwhelming DNS servers.
 * Logs progress every 1000 domains processed.
 *
 * @param domains - Array of domain strings (e.g., ['example.com', 'google.com'])
 * @param concurrency - Maximum number of concurrent DNS queries (default: 50)
 * @param timeoutMs - Timeout per domain in milliseconds (default: 5000)
 * @returns Promise resolving to an array of domains with MX records
 */
export async function filterDomainsWithMX(
    domains: string[],
    concurrency = 64,
    timeoutMs = 5000
): Promise<string[]> {
    const results: string[] = [];
    let index = 0;
    let processed = 0; // counter for processed domains

    // Helper to process a single domain with a timeout
    const checkDomain = async (domain: string): Promise<string | null> => {
        try {
            // Race the DNS query against a timeout
            const mxRecords = await Promise.race([
                dns.resolveMx(domain),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('DNS timeout')), timeoutMs)
                ),
            ]);

            // If we got any MX records, the domain can receive email
            return mxRecords.length > 0 ? domain : null;
        } catch (error: any) {
            // Common errors: ENOTFOUND (domain nonexistent), ENODATA (no MX),
            // ETIMEOUT, or our custom timeout. All mean the domain is invalid for email.
            return null;
        }
    };

    // Run up to `concurrency` workers in parallel
    const workers = new Array(concurrency).fill(null).map(async () => {
        while (index < domains.length) {
            const currentIndex = index++;
            const domain = domains[currentIndex];
            const result = await checkDomain(domain);

            // Update progress counter
            processed++;
            if (processed % 1000 === 0) {
                console.log(`Progress: processed ${processed} / ${domains.length} domains`);
            }

            if (result) {
                results.push(result);
            }
        }
    });

    await Promise.all(workers);

    console.log(`Finished: processed ${processed} domains, found ${results.length} with MX records.`);
    
    return results;
}
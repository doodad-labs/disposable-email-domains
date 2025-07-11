
import { addToDisposableList } from '../../utils/add-to-list';

export default function processDomainsResults(domains: Set<string>, url: string) {
    if (domains.size === 0) {
        console.error('No valid domains found.');
        return;
    }

    const domainList = [...domains];
    console.log(`Found ${domainList.length} valid domains from ${url}.`);
    console.log(`Domains: ${domainList.join(', ')}`);
    addToDisposableList(domainList);
}
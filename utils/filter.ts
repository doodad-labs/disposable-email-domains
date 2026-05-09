import psl from 'psl'

export function createWhitelistFilter(whitelist: Set<string>, tld_whitelist: Set<string>): (domain: string) => boolean {
    
    return (domain: string): boolean => {
        if (whitelist.has(domain)) return false
        
        const parsed = psl.parse(domain);
        if (parsed.tld && tld_whitelist.has(parsed.tld)) return false

        return true
    }

}
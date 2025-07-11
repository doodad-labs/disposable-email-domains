export default async function (email: string): Promise<string> {
    // Normalize the email by trimming whitespace and converting to lowercase
    const normalizedEmail = email.trim().toLowerCase();
    
    // Extract the domain part of the email
    const atIndex = normalizedEmail.indexOf('@');
    if (atIndex === -1) {
        throw new Error('Invalid email format: missing "@" symbol');
    }   

    const domain = normalizedEmail.slice(atIndex + 1);
    if (!domain) {
        throw new Error('Invalid email format: empty domain');
    }

    // Validate the domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i;
    if (!domainRegex.test(domain)) {
        throw new Error('Invalid domain format');
    }

    // Remove any trailing dot from the domain
    const cleanedDomain = domain.endsWith('.') ? domain.slice(0, -1) : domain;
    return cleanedDomain;
}
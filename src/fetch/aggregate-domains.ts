export const allowlist_txt = [
    'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/refs/heads/main/allowlist.conf'
]

export const blacklists_txt = [
    'https://raw.githubusercontent.com/disposable/disposable-email-domains/refs/heads/master/domains.txt',
    'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/refs/heads/main/disposable_email_blocklist.conf',
    'https://raw.githubusercontent.com/7c/fakefilter/refs/heads/main/txt/data.txt',
    'https://raw.githubusercontent.com/wesbos/burner-email-providers/refs/heads/master/emails.txt',
    'https://www.stopforumspam.com/downloads/toxic_domains_whole.txt',
    'https://www.stopforumspam.com/downloads/toxic_domains_whole_filtered.txt'
]

export const blacklists_json = [
    {
        'url': 'https://deviceandbrowserinfo.com/api/emails/disposable',
        'key': '.' // The key '.' indicates that the JSON structure is a flat array of strings
    },
    {
        'url': 'https://raw.githubusercontent.com/Propaganistas/Laravel-Disposable-Email/refs/heads/master/domains.json',
        'key': '.'
    }
]

export const blacklists_csv = [
    {
        'url': 'https://raw.githubusercontent.com/infiniteloopltd/TempEmailDomainMXRecords/refs/heads/master/TempEmailDomainMXRecords.csv',
        'col': 1
    }
]
import fs from 'fs/promises'
import path from 'path'
import sources from '../sources.json'
import { createWhitelistFilter } from '../utils/filter'
import { fetchListText, fetchListJson, fetchListCsv } from '../utils/fetch'
import psl from 'psl';

const CURRENT_DOMAINS_BLACKLIST = "https://raw.githubusercontent.com/doodad-labs/disposable-email-domains/refs/heads/main/data/domains.txt"

const OUTPUT_DIR = path.join(__dirname, '..', 'out')
const OUTPUT_DOMAIN_FILE = path.join(OUTPUT_DIR, 'data', 'domains.txt')
const OUTPUT_ROOT_FILE = path.join(OUTPUT_DIR, 'data', 'root.txt')
const STATS_FILE = path.join(OUTPUT_DIR, 'stats', 'badge.json')
const STATS_ROOT_FILE = path.join(OUTPUT_DIR, 'stats', 'badge-root.json')

const whitelist = new Set<string>()
const tld_whitelist = new Set<string>()
const blacklist = new Set<string>()
const root_blacklist = new Set<string>()

const header = [
    '# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY',
    '# Data sourced from various disposable email domain lists',
    sources.blacklist.txt.map(x => `# - ${x}`).join('\n'),
    sources.blacklist.json.map(x => `# - ${x.url}`).join('\n'),
    sources.blacklist.csv.map(x => `# - ${x.url}`).join('\n'),
    `# Aggregated blacklist generated on ${new Date().toISOString()}`,
    " " // Add an extra newline after the header for readability
].join('\n')

async function main() {

    try {
        console.log(`Fetching current blacklist ${CURRENT_DOMAINS_BLACKLIST}`)
        const lines = await fetchListText(CURRENT_DOMAINS_BLACKLIST)
        for (const line of lines) {
            blacklist.add(line)
        }
    } catch (error) {
        console.warn(`Failed to fetch current blacklist: ${error}`)
        throw error
    }

    try {

        const txt = await Promise.all(
            sources.whitelist.txt.map(async (url) => {
                try {
                    console.log(`Fetching ${url}`)
                    return await fetchListText(url)
                } catch (err) {
                    console.warn(String(err))
                    throw err
                }
            })
        )

        for (const lines of txt) {
            console.log(lines.length)
            for (const entry of lines) tld_whitelist.add(entry)
        }

    } catch (err) {
        console.error(err)
        process.exit(1)
    }

    try {

        const txt = await Promise.all(
            sources.whitelist_tld.txt.map(async (url) => {
                try {
                    console.log(`Fetching ${url}`)
                    return await fetchListText(url)
                } catch (err) {
                    console.warn(String(err))
                    throw err
                }
            })
        )

        for (const lines of txt) {
            console.log(lines.length)
            for (const entry of lines) whitelist.add(entry)
        }

    } catch (err) {
        console.error(err)
        process.exit(1)
    }

    try {

        const txt = await Promise.all(
            sources.whitelist.txt.map(async (url) => {
                try {
                    console.log(`Fetching ${url}`)
                    return await fetchListText(url)
                } catch (err) {
                    console.warn(String(err))
                    throw err
                }
            })
        )

        for (const lines of txt) {
            console.log(lines.length)
            for (const entry of lines) whitelist.add(entry)
        }

    } catch (err) {
        console.error(err)
        process.exit(1)
    }

    try {
        const txt = await Promise.all(
            sources.blacklist.txt.map(async (url) => {
                try {
                    console.log(`Fetching ${url}`)
                    return await fetchListText(url)
                } catch (err) {
                    console.warn(String(err))
                    return []
                }
            })
        )

        for (const lines of txt) {
            console.log(lines.length, 'entries')
            for (const entry of lines) blacklist.add(entry)
        }
    } catch (error) {
        console.warn(`Failed to fetch some blacklists: ${error}`)
    }

    try {
        const json = await Promise.all(
            sources.blacklist.json.map(async ({url, key}) => {
                try {
                    console.log(`Fetching ${url}`)
                    return await fetchListJson(url, key)
                } catch (err) {
                    console.warn(String(err))
                    return []
                }
            })
        )

        for (const lines of json) {
            console.log(lines.length, 'entries')
            for (const entry of lines) blacklist.add(entry)
        }
    } catch (error) {
        console.warn(`Failed to fetch some blacklists: ${error}`)
    }

    try {
        const csv = await Promise.all(
            sources.blacklist.csv.map(async ({url, col}) => {
                try {
                    console.log(`Fetching ${url}`)
                    return await fetchListCsv(url, col)
                } catch (err) {
                    console.warn(String(err))
                    return []
                }
            })
        )

        for (const lines of csv) {
            console.log(lines.length, 'entries')
            for (const entry of lines) blacklist.add(entry)
        }
    } catch (error) {
        console.warn(`Failed to fetch some blacklists: ${error}`);
    }

    const whitelist_filter = createWhitelistFilter(whitelist, tld_whitelist)

    const filtered_blacklist: string[] = Array.from(blacklist).filter((domain) => psl.isValid(domain))
    const blacklist_after_whitelist: string[] = filtered_blacklist.filter((domain) => whitelist_filter(domain))
    const sorted_blacklist: string[] = blacklist_after_whitelist.sort()

    await fs.mkdir(path.dirname(OUTPUT_DOMAIN_FILE), { recursive: true })
    await fs.writeFile(OUTPUT_DOMAIN_FILE, [header, ...sorted_blacklist].join('\n'), 'utf-8')    
    
    for (const domain of sorted_blacklist) {
        const parsed = psl.get(domain);
        if (parsed) {
            root_blacklist.add(parsed)
        }
    }

    const sorted_root_blacklist: string[] = Array.from(root_blacklist).sort()

    await fs.mkdir(path.dirname(OUTPUT_ROOT_FILE), { recursive: true })
    await fs.writeFile(OUTPUT_ROOT_FILE, [header, ...sorted_root_blacklist].join('\n'), 'utf-8')
    await fs.mkdir(path.dirname(STATS_FILE), { recursive: true })

    await fs.writeFile(STATS_FILE, JSON.stringify({
        "schemaVersion":1,
        "label":"Blacklisted Domains",
        "message": sorted_blacklist.length.toLocaleString(),
        "color":"#56bda4"
    }), 'utf-8')

    await fs.writeFile(STATS_ROOT_FILE, JSON.stringify({
        "schemaVersion":1,
        "label":"Blacklisted Root Domains",
        "message": sorted_root_blacklist.length.toLocaleString(),
        "color":"#56bda4"
    }), 'utf-8')


    console.log({
        total_fetched: blacklist.size,
        after_whitelist: blacklist_after_whitelist.length,

        domains: sorted_blacklist.length,
        root_domains: sorted_root_blacklist.length
    })

}

void main().catch((err) => {
    console.error(err)
    process.exit(1)
})
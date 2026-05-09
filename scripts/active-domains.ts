import fs from 'fs/promises'
import path from 'path'
import { filterDomainsWithMX } from '../utils/active'
import { fetchListText} from '../utils/fetch'

const CURRENT_BLACKLIST = "https://raw.githubusercontent.com/doodad-labs/disposable-email-domains/refs/heads/main/data/root.txt"

const OUTPUT_DIR = path.join(__dirname, '..', 'out')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'data', 'active.txt')
const STATS_FILE = path.join(OUTPUT_DIR, 'stats', 'badge-active.json')

const blacklist = new Set()

async function main() {

    try {
        console.log(`Fetching current blacklist ${CURRENT_BLACKLIST}`)
        const lines = await fetchListText(CURRENT_BLACKLIST)
        for (const line of lines) {
            blacklist.add(line)
        }
    } catch (error) {
        console.warn(`Failed to fetch current blacklist: ${error}`)
        throw error
    }


    console.log(`Filtering ${blacklist.size} domains for active MX records...`)
    const active_blacklist = await filterDomainsWithMX(Array.from(blacklist) as string[])
    console.log(`Found ${active_blacklist.length} active domains`)

    const header = [
        '# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY',
        '# Root domains with active MX records from the full list of known disposable email root domains. Updated every day.',
        " " // Add an extra newline after the header for readability
    ].join('\n')

    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
    await fs.writeFile(OUTPUT_FILE, [header, ...active_blacklist].join('\n'), 'utf-8')    

    const stats = {
        "schemaVersion":1,
        "label":"Active Blacklisted Domains",
        "message": active_blacklist.length.toLocaleString(),
        "color":"#56bda4"
    }

    await fs.mkdir(path.dirname(STATS_FILE), { recursive: true })
    await fs.writeFile(STATS_FILE, JSON.stringify(stats), 'utf-8')

}

void main().catch((err) => {
    console.error(err)
    process.exit(1)
})
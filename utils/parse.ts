function standardiseDomain(domain: string): string | null {
    try {
        const url = domain.includes('://') ? new URL(domain) : new URL(`http://${domain}`)
        return url.hostname.toLowerCase()
    } catch {
        return null
    }
}

export function parseListText(text: string): string[] {
    const out = []
    
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        if (!line || line.startsWith('#')) continue
        const standardised = standardiseDomain(line)
        if (!standardised) continue
        out.push(standardised)
    }

    return out
}

export function parseListJson(json: any, key: string): string[] {
    if (key === '.') {
        if (!Array.isArray(json)) throw new Error(`Expected JSON array but got ${typeof json}`)
        return json.map(item => typeof item === 'string' ? standardiseDomain(item) : null).filter(Boolean) as string[]
    }

    const parts = key.split('.')
    let current = json

    for (const part of parts) {
        if (typeof current !== 'object' || current === null || !(part in current)) {
            throw new Error(`Key "${key}" not found in JSON`)
        }

        current = current[part]
    }

    if (!Array.isArray(current)) throw new Error(`Expected JSON array at key "${key}" but got ${typeof current}`)
    return current.map(item => typeof item === 'string' ? standardiseDomain(item) : null).filter(Boolean) as string[]
}

export function parseListCsv(text: string, col: number): string[] {
    
    const lines = parseListText(text)

    if (col === 0) {
        return lines.flatMap(line => line.split(',').map(part => part.trim()).filter(Boolean))
    }

    const out = []
    for (const line of lines) {
        const parts = line.split(',').map(part => part.trim())
        if (isNaN(col)) throw new Error(`Invalid CSV key "${col}" (must be an integer index or ".")`)
        if (col < 0 || col >= parts.length) continue
        out.push(parts[col])
    }

    // remove any " wrapping the domain (some lists wrap domains in quotes)
    for (let i = 0; i < out.length; i++) {
        if (out[i].startsWith('"') && out[i].endsWith('"')) {
            out[i] = out[i].slice(1, -1)
        }
    }

    return out.map(standardiseDomain).filter(Boolean) as string[]

}
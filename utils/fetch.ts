
import { parseListText, parseListJson, parseListCsv } from './parse'

export async function fetchListText(url: string) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status} ${res.statusText})`)
    return parseListText(await res.text())
}

export async function fetchListJson(url: string, key: string) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status} ${res.statusText})`)
    const json = await res.json()
    return parseListJson(json, key)
}

export async function fetchListCsv(url: string, col: number) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status} ${res.statusText})`)
    return parseListCsv(await res.text(), col)
}
import * as monaco from 'monaco-editor'
import { ILeafConfKvItem, ILeafConfSection, ILeafConfTextSpan, parseKvLine, parseStruct, splitByComma, trimComment } from './parse'
import * as facts from './facts'

function provideGeneralSectionSymbols(
    lineId: number,
    line: string,
): monaco.languages.DocumentSymbol | undefined {
    const kv = parseKvLine(line, lineId, 1)
    if (kv === undefined) {
        return undefined
    }
    return {
        kind: monaco.languages.SymbolKind.Key,
        detail: 'setting',
        name: kv.key,
        range: new monaco.Range(kv.lineId, kv.keyStartCol, kv.lineId, kv.valueStartCol + kv.value.length),
        selectionRange: new monaco.Range(kv.lineId, kv.keyStartCol, kv.lineId, kv.keyStartCol + kv.key.length),
        tags: [],
    }
}

function provideProxySectionSymbols(
    lineId: number,
    line: string,
): monaco.languages.DocumentSymbol | undefined {
    const kv = parseKvLine(line, lineId, 1)
    if (kv === undefined) {
        return undefined
    }
    const segs = splitByComma(kv.value, kv.valueStartCol)
    let kvSegs: ILeafConfTextSpan[] = []
    const protocol = segs[0].text
    if (facts.PROXY_PROTOCOLS_REQUIRING_HOST_SET.has(protocol)) {
        kvSegs = segs.slice(1)
    } else {
        kvSegs = segs.slice(3)
    }
    return {
        kind: monaco.languages.SymbolKind.Variable,
        detail: 'proxy',
        name: kv.key,
        range: new monaco.Range(kv.lineId, kv.keyStartCol, kv.lineId, kv.valueStartCol + kv.value.length),
        selectionRange: new monaco.Range(kv.lineId, kv.keyStartCol, kv.lineId, kv.keyStartCol + kv.key.length),
        tags: [],
        children: kvSegs.map(s => parseKvLine(s.text, lineId, s.startCol))
            .filter((argKv): argKv is ILeafConfKvItem => argKv !== undefined)
            .map(argKv => ({
                kind: monaco.languages.SymbolKind.Property,
                detail: 'property',
                name: argKv.key,
                range: new monaco.Range(argKv.lineId, argKv.keyStartCol, argKv.lineId, argKv.valueStartCol + argKv.value.length),
                selectionRange: new monaco.Range(argKv.lineId, argKv.keyStartCol, argKv.lineId, argKv.keyStartCol + argKv.key.length),
                tags: [],
            })),
    }
}

function provideProxyGroupSectionSymbols(
    lineId: number,
    line: string,
): monaco.languages.DocumentSymbol | undefined {
    const kv = parseKvLine(line, lineId, 1)
    if (kv === undefined) {
        return undefined
    }
    const segs = splitByComma(kv.value, kv.valueStartCol)
    let firstKvArgId = segs.findIndex(s => s.text.includes('='))
    if (firstKvArgId === -1) {
        firstKvArgId = segs.length
    }
    const actorChildren: monaco.languages.DocumentSymbol[] = segs.slice(1, firstKvArgId)
        .map(a => ({
            kind: monaco.languages.SymbolKind.Variable,
            detail: 'actor',
            name: a.text,
            range: new monaco.Range(lineId, a.startCol, lineId, a.startCol + a.text.length),
            selectionRange: new monaco.Range(lineId, a.startCol, lineId, a.startCol + a.text.length),
            tags: [],
        }))
    const kvChildren: monaco.languages.DocumentSymbol[] = segs.slice(firstKvArgId)
        .map(s => parseKvLine(s.text, lineId, s.startCol))
        .filter((argKv): argKv is ILeafConfKvItem => argKv !== undefined)
        .map(argKv => ({
            kind: monaco.languages.SymbolKind.Property,
            detail: 'property',
            name: argKv.key,
            range: new monaco.Range(argKv.lineId, argKv.keyStartCol, argKv.lineId, argKv.valueStartCol + argKv.value.length),
            selectionRange: new monaco.Range(argKv.lineId, argKv.keyStartCol, argKv.lineId, argKv.keyStartCol + argKv.key.length),
            tags: [],
        }))
    return {
        kind: monaco.languages.SymbolKind.Variable,
        detail: 'proxy group',
        name: kv.key,
        range: new monaco.Range(kv.lineId, kv.keyStartCol, kv.lineId, kv.valueStartCol + kv.value.length),
        selectionRange: new monaco.Range(kv.lineId, kv.keyStartCol, kv.lineId, kv.keyStartCol + kv.key.length),
        tags: [],
        children: [...actorChildren, ...kvChildren],
    }
}

function provideRuleSectionSymbols(
    lineId: number,
    line: string,
): monaco.languages.DocumentSymbol | undefined {
    const segs = splitByComma(line, 1)
    const ruleType = segs[0].text
    if (
        (ruleType === facts.RULE_TYPE_FINAL && segs.length !== 2)
        || (ruleType !== facts.RULE_TYPE_FINAL && segs.length !== 3)
    ) {
        return undefined
    }
    const lastSeg = segs[segs.length - 1]
    return {
        kind: monaco.languages.SymbolKind.Function,
        detail: 'rule',
        name: ruleType,
        range: new monaco.Range(lineId, segs[0].startCol, lineId, lastSeg.startCol + lastSeg.text.length),
        selectionRange: new monaco.Range(lineId, segs[0].startCol, lineId, segs[0].startCol + segs[0].text.length),
        tags: [],
        children: [{
            kind: monaco.languages.SymbolKind.Variable,
            detail: 'outbound',
            name: lastSeg.text,
            range: new monaco.Range(lineId, lastSeg.startCol, lineId, lastSeg.startCol + lastSeg.text.length),
            selectionRange: new monaco.Range(lineId, lastSeg.startCol, lineId, lastSeg.startCol + lastSeg.text.length),
            tags: [],
        }]
    }
}

function provideHostSectionSymbols(
    lineId: number,
    line: string,
): monaco.languages.DocumentSymbol | undefined {
    const kv = parseKvLine(line, lineId, 1)
    if (kv === undefined) {
        return undefined
    }
    const segs = splitByComma(kv.value, kv.valueStartCol)
    return {
        kind: monaco.languages.SymbolKind.String,
        detail: 'host name',
        name: kv.key,
        range: new monaco.Range(kv.lineId, kv.keyStartCol, kv.lineId, kv.valueStartCol + kv.value.length),
        selectionRange: new monaco.Range(kv.lineId, kv.keyStartCol, kv.lineId, kv.keyStartCol + kv.key.length),
        tags: [],
        children: segs.map(s => ({
            kind: monaco.languages.SymbolKind.Number,
            detail: 'IP address',
            name: s.text,
            range: new monaco.Range(lineId, s.startCol, lineId, s.startCol + s.text.length),
            selectionRange: new monaco.Range(lineId, s.startCol, lineId, s.startCol + s.text.length),
            tags: [],
        }))
    }
}

export const documentSymbolProvider: monaco.languages.DocumentSymbolProvider = {
    provideDocumentSymbols(model, _token) {
        const symbols: monaco.languages.DocumentSymbol[] = []
        const struct = parseStruct(model)
        for (const section of struct.sections) {
            let symbolFn: (lineId: number, line: string) => monaco.languages.DocumentSymbol | undefined
            switch (section.sectionName) {
                case facts.SECTION_GENERAL:
                    symbolFn = provideGeneralSectionSymbols
                    break
                case facts.SECTION_PROXY:
                    symbolFn = provideProxySectionSymbols
                    break
                case facts.SECTION_PROXY_GROUP:
                    symbolFn = provideProxyGroupSectionSymbols
                    break
                case facts.SECTION_RULE:
                    symbolFn = provideRuleSectionSymbols
                    break
                case facts.SECTION_HOST:
                    symbolFn = provideHostSectionSymbols
                    break
                default:
                    continue
            }
            symbols.push({
                kind: monaco.languages.SymbolKind.Namespace,
                detail: 'section',
                name: section.sectionName,
                range: new monaco.Range(section.startLine, 1, section.endLine, model.getLineMaxColumn(section.endLine)),
                selectionRange: new monaco.Range(section.startLine, 1, section.startLine, model.getLineMaxColumn(section.startLine)),
                tags: [],
                children: Array.from({ length: section.endLine - section.startLine + 1 }, (_, i) => section.startLine + i)
                    .flatMap(lineId => symbolFn(lineId, trimComment(model.getLineContent(lineId))))
                    .filter((s): s is monaco.languages.DocumentSymbol => s !== undefined),
            })
        }
        return symbols
    }
}

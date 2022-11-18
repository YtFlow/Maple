import * as monaco from 'monaco-editor'
import { findIndexOfSections, ILeafConfKvItem, ILeafConfStruct, ILeafConfTextSpan, parseKvLine, parseStruct, splitByComma, trimComment } from './parse'
import * as facts from './facts'

function formatKvArgs(args: ILeafConfTextSpan[], lineId: number): string {
    return args.flatMap(a => {
        const kv = parseKvLine(a.text, lineId, a.startCol)
        if (kv === undefined) {
            return []
        }
        return [`${kv.key}=${kv.value}`]
    }).join('\n\n')
}

function provideProxyNameHover(kv: ILeafConfKvItem, range: monaco.Range): monaco.languages.Hover | undefined {
    const name = kv.key
    const args = splitByComma(kv.value, kv.valueStartCol)
    const protocol = args[0].text
    if (!facts.PROXY_PROTOCOLS_MAP.has(protocol)) {
        return undefined
    }
    const firstArgIdWithKv = args.findIndex(a => a.text.includes('='))
    const argsWithoutKv = args.slice(1, firstArgIdWithKv)
    const argsWithKv = args.slice(firstArgIdWithKv)
    if (!facts.PROXY_PROTOCOLS_REQUIRING_HOST_SET.has(protocol)) {
        return {
            range,
            contents: [
                { value: `(proxy) ${name} = ${protocol}` },
                { value: formatKvArgs(argsWithKv, kv.lineId) },
            ],
        }
    }
    return {
        range,
        contents: [
            { value: `(proxy) ${name} = ${protocol}` },
            {
                value: `host=${argsWithoutKv[0]?.text}

port=${argsWithoutKv[1]?.text}

${formatKvArgs(argsWithKv, kv.lineId)}`
            },
        ],
    }
}
function provideProxyGroupNameHover(kv: ILeafConfKvItem, range: monaco.Range): monaco.languages.Hover | undefined {
    const name = kv.key
    const args = splitByComma(kv.value, kv.valueStartCol)
    const groupType = args[0].text

    const firstArgIdWithKv = args.findIndex(a => a.text.includes('='))
    const argsWithoutKv = args.slice(1, firstArgIdWithKv)
    const argsWithKv = args.slice(firstArgIdWithKv)

    return {
        range,
        contents: [
            { value: `(proxy) ${name} = ${groupType}` },
            {
                value: `${formatKvArgs(argsWithKv, kv.lineId)}

actors=(${argsWithoutKv.length}) ${argsWithoutKv.map(a => a.text).join(', ')}`
            },
        ],
    }
}
function provideProxyOrGroupNameHover(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    name: string,
    range: monaco.Range,
): monaco.languages.Hover | undefined {
    const proxyKvs = struct.sections.filter(s => s.sectionName === facts.SECTION_PROXY)
        .flatMap(s => Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i))
        .map(lineId => parseKvLine(model.getLineContent(lineId), lineId, 1))
        .filter((kv): kv is ILeafConfKvItem => kv !== undefined)
    for (const kv of proxyKvs) {
        if (kv.key === name) {
            return provideProxyNameHover(kv, range)
        }
    }
    const groupKvs = struct.sections.filter(s => s.sectionName === facts.SECTION_PROXY_GROUP)
        .flatMap(s => Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i))
        .map(lineId => parseKvLine(model.getLineContent(lineId), lineId, 1))
        .filter((kv): kv is ILeafConfKvItem => kv !== undefined)
    for (const kv of groupKvs) {
        if (kv.key === name) {
            return provideProxyGroupNameHover(kv, range)
        }
    }
    return undefined
}

function hoverGeneral(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.Hover | undefined {
    const lineId = position.lineNumber
    const colId = position.column
    const line = trimComment(model.getLineContent(lineId))
    if (colId - 1 >= line.length) {
        return undefined
    }
    const kv = parseKvLine(line, lineId, 1)
    if (!kv) {
        return undefined
    }
    if (colId >= kv.keyStartCol && colId <= kv.keyStartCol + kv.key.length) {
        const settingKeyDesc = facts.GENERAL_SETTING_KEYS_MAP.get(kv.key)
        if (settingKeyDesc === undefined) {
            return undefined
        }
        return {
            range: new monaco.Range(lineId, kv.keyStartCol, lineId, kv.keyStartCol + kv.key.length),
            contents: [
                { value: settingKeyDesc.name },
                { value: settingKeyDesc.desc },
            ],
        }
    }
    return undefined
}

function provideProxyHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
): monaco.languages.Hover | undefined {
    const lineId = position.lineNumber
    const colId = position.column
    const line = trimComment(model.getLineContent(lineId))
    if (colId - 1 >= line.length) {
        return undefined
    }
    const kv = parseKvLine(line, lineId, 1)
    if (!kv) {
        return undefined
    }
    if (colId >= kv.keyStartCol && colId <= kv.keyStartCol + kv.key.length) {
        return provideProxyNameHover(kv, new monaco.Range(
            lineId,
            kv.keyStartCol,
            lineId,
            kv.keyStartCol + kv.key.length,
        ))
    }

    const args = splitByComma(kv.value, kv.valueStartCol)
    const currentArgId = args.findIndex(a => colId >= a.startCol && colId <= a.startCol + a.text.length)
    if (currentArgId === -1) {
        return undefined
    }
    const currentArg = args[currentArgId]
    if (currentArgId === 0) {
        const protocolDef = facts.PROXY_PROTOCOLS_MAP.get(currentArg.text)
        if (protocolDef === undefined) {
            return undefined
        }
        return {
            range: new monaco.Range(lineId, currentArg.startCol, lineId, currentArg.startCol + currentArg.text.length),
            contents: [
                { value: '(protocol) ' + protocolDef.name },
                { value: protocolDef.desc },
            ],
        }
    }
    const argKv = parseKvLine(currentArg.text, lineId, currentArg.startCol)
    if (argKv !== undefined) {
        if (colId < argKv.keyStartCol || colId > argKv.keyStartCol + argKv.key.length) {
            return undefined
        }
        const desc = facts.PROXY_PROPERTY_KEYS_DESC_MAP.get(argKv.key)
        if (desc === undefined) {
            return {
                range: new monaco.Range(lineId, argKv.keyStartCol, lineId, argKv.keyStartCol + argKv.key.length),
                contents: [
                    { value: '(property) ' + argKv.key },
                ],
            }
        }
        return {
            range: new monaco.Range(lineId, argKv.keyStartCol, lineId, argKv.keyStartCol + argKv.key.length),
            contents: [
                { value: '(property) ' + argKv.key },
                { value: desc },
            ],
        }
    }
    const protocolType = args[0].text
    if (facts.PROXY_PROTOCOLS_REQUIRING_HOST_SET.has(protocolType)) {
        if (currentArgId === 1) {
            return {
                range: new monaco.Range(lineId, currentArg.startCol, lineId, currentArg.startCol + currentArg.text.length),
                contents: [{ value: '(host)' },],
            }
        }
        if (currentArgId === 2) {
            return {
                range: new monaco.Range(lineId, currentArg.startCol, lineId, currentArg.startCol + currentArg.text.length),
                contents: [{ value: '(port)' },],
            }
        }
    }
    return undefined
}

function provideProxyGroupHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    struct: ILeafConfStruct,
): monaco.languages.Hover | undefined {
    const lineId = position.lineNumber
    const colId = position.column
    const line = trimComment(model.getLineContent(lineId))
    if (colId - 1 >= line.length) {
        return undefined
    }
    const kv = parseKvLine(line, lineId, 1)
    if (!kv) {
        return undefined
    }
    if (colId >= kv.keyStartCol && colId <= kv.keyStartCol + kv.key.length) {
        return provideProxyGroupNameHover(kv, new monaco.Range(
            lineId,
            kv.keyStartCol,
            lineId,
            kv.keyStartCol + kv.key.length,
        ))
    }

    const args = splitByComma(kv.value, kv.valueStartCol)
    const currentArgId = args.findIndex(a => colId >= a.startCol && colId <= a.startCol + a.text.length)
    if (currentArgId === -1) {
        return undefined
    }
    const currentArg = args[currentArgId]
    if (currentArgId === 0) {
        const groupTypeDef = facts.GROUP_TYPES_MAP.get(currentArg.text)
        const range = new monaco.Range(lineId, currentArg.startCol, lineId, currentArg.startCol + currentArg.text.length)
        if (groupTypeDef === undefined) {
            return {
                range,
                contents: [
                    { value: '(group type) ' + currentArg.text },
                ],
            }
        }
        return {
            range,
            contents: [
                { value: '(group type) ' + groupTypeDef.name },
                { value: groupTypeDef.desc },
            ],
        }
    }
    const argKv = parseKvLine(currentArg.text, lineId, currentArg.startCol)
    if (argKv === undefined) {
        return provideProxyOrGroupNameHover(model, struct, currentArg.text, new monaco.Range(
            lineId,
            currentArg.startCol,
            lineId,
            currentArg.startCol + currentArg.text.length,
        ))
    }
    if (colId < argKv.keyStartCol || colId > argKv.keyStartCol + argKv.key.length) {
        return undefined
    }
    const desc = facts.GROUP_PROPERTY_KEYS_DESC_MAP.get(argKv.key)
    if (desc === undefined) {
        return {
            range: new monaco.Range(lineId, argKv.keyStartCol, lineId, argKv.keyStartCol + argKv.key.length),
            contents: [
                { value: '(property) ' + argKv.key },
            ],
        }
    }
    return {
        range: new monaco.Range(lineId, argKv.keyStartCol, lineId, argKv.keyStartCol + argKv.key.length),
        contents: [
            { value: '(property) ' + argKv.key },
            { value: desc },
        ],
    }
}

function provideRuleHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    struct: ILeafConfStruct,
): monaco.languages.Hover | undefined {
    const lineId = position.lineNumber
    const colId = position.column
    const line = trimComment(model.getLineContent(lineId))
    if (colId - 1 >= line.length) {
        return undefined
    }
    const args = splitByComma(line, 1)
    const currentArgId = args.findIndex(a => colId >= a.startCol && colId <= a.startCol + a.text.length)
    if (currentArgId === -1) {
        return undefined
    }
    const currentArg = args[currentArgId]
    let range = new monaco.Range(
        lineId,
        currentArg.startCol,
        lineId,
        currentArg.startCol + currentArg.text.length,
    )
    if (currentArgId === 0) {
        const ruleDef = facts.RULE_TYPES_MAP.get(args[0].text)
        if (ruleDef === undefined) {
            return {
                range,
                contents: [{ value: '(rule type) ' + currentArg.text },],
            }
        }
        return {
            range,
            contents: [
                { value: '(rule type) ' + currentArg.text },
                { value: ruleDef.desc },
            ],
        }
    }
    const ruleType = args[0]?.text
    if (
        (ruleType === facts.RULE_TYPE_FINAL && currentArgId === 1)
        || (ruleType !== facts.RULE_TYPE_FINAL && currentArgId === 2)
    ) {
        return provideProxyOrGroupNameHover(model, struct, args[currentArgId].text, new monaco.Range(
            lineId,
            args[currentArgId].startCol,
            lineId,
            args[currentArgId].startCol + args[currentArgId].text.length,
        ))
    }
    return undefined
}

export const hoverProvider: monaco.languages.HoverProvider = {
    provideHover(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
    ): monaco.languages.Hover | undefined {
        const lineId = position.lineNumber
        const struct = parseStruct(model)
        const sectionId = findIndexOfSections(struct.sections, lineId)
        if (sectionId === -1) {
            return undefined
        }
        const section = struct.sections[sectionId]
        switch (section.sectionName) {
            case facts.SECTION_GENERAL:
                return hoverGeneral(model, position)
            case facts.SECTION_PROXY:
                return provideProxyHover(model, position)
            case facts.SECTION_PROXY_GROUP:
                return provideProxyGroupHover(model, position, struct)
            case facts.SECTION_RULE:
                return provideRuleHover(model, position, struct)
        }
        return undefined
    }
}

import * as monaco from 'monaco-editor'
import * as facts from './facts'
import { findIndexOfSections, ILeafConfKvItem, ILeafConfStruct, parseKvLine, parseSectionGeneral, parseStruct, splitByComma, trimComment, trimWithPos } from './parse'

function collectProxyOrGroupSuggestions(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    range: monaco.Range,
) {
    return struct.sections.filter(s =>
        s.sectionName === facts.SECTION_PROXY || s.sectionName === facts.SECTION_PROXY_GROUP
    )
        .flatMap(s => Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i))
        .map(lineId => parseKvLine(model.getLineContent(lineId), lineId, 1))
        .filter((kv): kv is ILeafConfKvItem => kv !== undefined)
        .map(kv => ({
            label: kv.key,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: kv.key,
            range,
        }))
}

function generateBoolCandidates(range: monaco.Range): monaco.languages.CompletionItem[] {
    return ['true', 'false'].map(l => ({
        label: l,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: l,
        range,
    }))
}

function completeSectionHeader(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    struct: ILeafConfStruct,
): monaco.languages.CompletionItem[] {
    const appearedSections = new Set(struct.sections.map(s => s.sectionName))
    const suggestedSections = facts.KNOWN_SECTION_NAMES.filter(s => !appearedSections.has(s))
    const { trimmed: line, startCol } = trimWithPos(trimComment(model.getLineContent(position.lineNumber)), 1)
    if (!line.startsWith('[')) {
        return []
    }
    return suggestedSections.map(sectionName => ({
        label: `[${sectionName}]`,
        kind: monaco.languages.CompletionItemKind.Module,
        insertText: sectionName + ']',
        range: {
            startLineNumber: position.lineNumber,
            startColumn: startCol + 1,
            endLineNumber: position.lineNumber,
            endColumn: startCol + line.length,
        }
    }))
}

function completeGeneralSection(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    struct: ILeafConfStruct,
): monaco.languages.CompletionItem[] {
    const lineId = position.lineNumber
    const line = trimComment(model.getLineContent(lineId))
    const { startCol } = trimWithPos(line, 1)
    const eqPos = line.indexOf('=')
    let eqCol = eqPos + 1
    if (eqPos === -1) {
        eqCol = line.length + 1
    }
    if (position.column <= eqCol) {
        const filledKeys = new Set(parseSectionGeneral(model, struct).map(i => i.key))
        const range = new monaco.Range(lineId, startCol, lineId, eqCol)

        return facts.GENERAL_SETTING_KEYS.filter(k => !filledKeys.has(k.name)).map(k => {
            switch (k.name) {
                case facts.SETTING_TUN:
                    return {
                        label: k.name,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        range,
                        insertText: eqPos === -1 ? `${k.name} = auto` : k.name + ' ',
                        documentation: k.desc,
                    }
                case facts.SETTING_LOGLEVEL:
                    return {
                        label: k.name,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        range,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: eqPos === -1 ? `${k.name} = \${1|${facts.LOG_LEVELS.join(',')}|}` : k.name + ' ',
                        documentation: k.desc,
                    }
                case facts.SETTING_ROUTING_DOMAIN_RESOLVE:
                    return {
                        label: k.name,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        range,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: eqPos === -1 ? `${k.name} = \${1|true,false|}` : k.name + ' ',
                        documentation: k.desc,
                    }
            }
            return {
                label: k.name,
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: eqPos === -1 ? k.name + ' = ' : k.name + ' ',
                documentation: k.desc,
            }
        })
    }

    const kv = parseKvLine(line, lineId, 1)!
    const range = new monaco.Range(lineId, kv.valueStartCol, lineId, kv.valueStartCol + kv.value.length)
    switch (kv.key) {
        case facts.SETTING_TUN:
            return [{
                label: 'auto',
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: 'auto',
                documentation: 'TODO: doc',
            }]
        case facts.SETTING_LOGLEVEL:
            return facts.LOG_LEVELS.map(l => ({
                label: l,
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: l,
                documentation: 'TODO: doc',
            }))
        case facts.SETTING_ROUTING_DOMAIN_RESOLVE:
            return [{
                label: 'true',
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: 'true',
                documentation: 'TODO: doc',
            }, {
                label: 'false',
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: 'false',
                documentation: 'TODO: doc',
            },]
    }
    return []
}

function completeProxy(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    struct: ILeafConfStruct,
): monaco.languages.CompletionItem[] {
    const lineId = position.lineNumber
    const line = trimComment(model.getLineContent(lineId))
    const eqPos = line.indexOf('=')
    let eqCol = eqPos + 1
    if (eqPos === -1) {
        return []
    }
    if (position.column <= eqCol) {
        return []
    }
    const argsText = line.slice(eqPos + 1)

    const args = splitByComma(argsText, eqCol + 1)
    const protocolItem = args[0]
    if (protocolItem === undefined || args.length === 1) {
        const range = protocolItem === undefined
            ? new monaco.Range(lineId, position.column, lineId, position.column)
            : new monaco.Range(
                lineId,
                Math.min(position.column, protocolItem.startCol),
                lineId,
                Math.max(position.column, protocolItem.startCol + protocolItem.text.length))
        return facts.PROXY_PROTOCOLS.map(p => ({
            label: p.name,
            kind: monaco.languages.CompletionItemKind.Constructor,
            insertText: p.snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: p.desc,
            range,
        }))
    } else if (position.column <= protocolItem.startCol + protocolItem.text.length) {
        const range = new monaco.Range(lineId, protocolItem.startCol, lineId, protocolItem.startCol + protocolItem.text.length)
        return facts.PROXY_PROTOCOLS.map(p => ({
            label: p.name,
            kind: monaco.languages.CompletionItemKind.Constructor,
            insertText: p.name,
            documentation: p.desc,
            range,
        }))
    }
    let expectedNonKvArgs = 3
    if (
        protocolItem.text === facts.PROTOCOL_DIRECT
        || protocolItem.text === facts.PROTOCOL_REJECT
        || protocolItem.text === facts.PROTOCOL_REJECT_DROP
    ) {
        expectedNonKvArgs = 1
    }
    const currentArgId = argsText.slice(0, position.column - eqCol - 1).split(',').length - 1
    if (currentArgId < expectedNonKvArgs) {
        return []
    }

    const currentArg = args[currentArgId]
    const currentKv = parseKvLine(currentArg.text, lineId, currentArg.startCol)
    if (currentKv === undefined || position.column <= currentKv.keyStartCol + currentKv.key.length) {
        let protocolKeyMap = facts.PROXY_PROTOCOL_PROPERTY_KEY_MAP[protocolItem.text]
        if (protocolKeyMap === undefined) {
            return []
        }
        protocolKeyMap = {
            required: new Set(protocolKeyMap.required),
            allowed: new Set(protocolKeyMap.allowed),
        }
        let firstKvArgId = args.findIndex(i => i.text.indexOf('=') !== -1)
        if (firstKvArgId === -1) {
            firstKvArgId = args.length
        }
        for (const kvArg of args.slice(firstKvArgId)) {
            const kv = parseKvLine(kvArg.text, lineId, kvArg.startCol)
            if (kv === undefined) {
                continue
            }
            protocolKeyMap.allowed.delete(kv.key)
            protocolKeyMap.required.delete(kv.key)
        }
        return [...protocolKeyMap.required, ...protocolKeyMap.allowed].map(k => ({
            label: k,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: k,
            documentation: 'TODO: doc',
            range: currentKv === undefined
                ? new monaco.Range(lineId, currentArg.startCol, lineId, currentArg.startCol + currentArg.text.length)
                : new monaco.Range(lineId, currentKv.keyStartCol, lineId, currentKv.keyStartCol + currentKv.key.length),
        }))
    }

    const range = new monaco.Range(lineId, currentKv.valueStartCol, lineId, currentKv.valueStartCol + currentKv.value.length)
    switch (currentKv.key) {
        case facts.PROXY_PROPERTY_KEY_METHOD:
            return facts.KNOWN_AEAD_CIPHERS.map(c => ({
                label: c,
                kind: monaco.languages.CompletionItemKind.EnumMember,
                insertText: c,
                range,
            }))
        case facts.PROXY_PROPERTY_KEY_WS:
        case facts.PROXY_PROPERTY_KEY_TLS:
        case facts.PROXY_PROPERTY_KEY_AMUX:
        case facts.PROXY_PROPERTY_KEY_QUIC:
            return generateBoolCandidates(range)
        case facts.PROXY_PROPERTY_KEY_TLS_CERT:
            // TODO: complete cert files
            break
        case facts.PROXY_PROPERTY_KEY_INTERFACE:
            // TODO: complete interfaces
            break
    }

    return []
}
function completeProxyGroup(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    struct: ILeafConfStruct,
): monaco.languages.CompletionItem[] {
    const lineId = position.lineNumber
    const line = trimComment(model.getLineContent(lineId))
    const eqPos = line.indexOf('=')
    let eqCol = eqPos + 1
    if (eqPos === -1) {
        return []
    }
    if (position.column <= eqCol) {
        return []
    }
    const argsText = line.slice(eqPos + 1)

    const args = splitByComma(argsText, eqCol + 1)
    const groupTypeItem = args[0]
    if (groupTypeItem === undefined || args.length === 1) {
        const range = groupTypeItem === undefined
            ? new monaco.Range(lineId, position.column, lineId, position.column)
            : new monaco.Range(
                lineId,
                Math.min(position.column, groupTypeItem.startCol),
                lineId,
                Math.max(position.column, groupTypeItem.startCol + groupTypeItem.text.length))
        return facts.GROUP_TYPES.map(p => ({
            label: p.name,
            kind: monaco.languages.CompletionItemKind.Constructor,
            insertText: p.snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: p.desc,
            range,
        }))
    } else if (position.column <= groupTypeItem.startCol + groupTypeItem.text.length) {
        const range = new monaco.Range(lineId, groupTypeItem.startCol, lineId, groupTypeItem.startCol + groupTypeItem.text.length)
        return facts.GROUP_TYPES.map(p => ({
            label: p.name,
            kind: monaco.languages.CompletionItemKind.Constructor,
            insertText: p.name,
            documentation: p.desc,
            range,
        }))
    }

    const currentArgId = argsText.slice(0, position.column - eqCol - 1).split(',').length - 1
    const currentArg = args[currentArgId]
    const currentKv = parseKvLine(currentArg.text, lineId, currentArg.startCol)

    if (currentKv !== undefined && position.column >= currentKv.valueStartCol) {
        // Want a property value
        const range = new monaco.Range(lineId, currentKv.valueStartCol, lineId, currentKv.valueStartCol + currentKv.value.length)
        switch (currentKv.value) {
            case facts.GROUP_PROPERTY_KEY_METHOD:
                return facts.KNOWN_GROUP_METHODS.map(m => ({
                    label: m,
                    kind: monaco.languages.CompletionItemKind.EnumMember,
                    insertText: m,
                    range,
                    documentation: 'TODO: doc',
                }))
            case facts.GROUP_PROPERTY_KEY_FAILOVER:
            case facts.GROUP_PROPERTY_KEY_FALLBACK_CACHE:
            case facts.GROUP_PROPERTY_KEY_HEALTH_CHECK:
                return generateBoolCandidates(range)
        }
        return []
    }

    let firstKvArgId = args.findIndex(i => i.text.indexOf('=') !== -1)
    if (firstKvArgId === -1) {
        firstKvArgId = args.length
    }
    let groupTypeKeyMap = facts.PROXY_GROUP_PROPERTY_KEY_MAP[groupTypeItem.text]
    if (groupTypeKeyMap === undefined) {
        return []
    }

    let proxyOrGroupNameSuggestions: monaco.languages.CompletionItem[] = []
    if (currentKv === undefined && currentArgId < firstKvArgId) {
        const range = new monaco.Range(lineId, currentArg.startCol, lineId, currentArg.startCol + currentArg.text.length)
        proxyOrGroupNameSuggestions = collectProxyOrGroupSuggestions(model, struct, range)
        if (currentArgId < firstKvArgId - 1) {
            return proxyOrGroupNameSuggestions
        }
    }

    groupTypeKeyMap = {
        required: new Set(groupTypeKeyMap.required),
        allowed: new Set(groupTypeKeyMap.allowed),
    }
    for (const kvArg of args.slice(firstKvArgId)) {
        const kv = parseKvLine(kvArg.text, lineId, kvArg.startCol)
        if (kv === undefined) {
            continue
        }
        groupTypeKeyMap.allowed.delete(kv.key)
        groupTypeKeyMap.required.delete(kv.key)
    }
    const propertyKeySuggestions: monaco.languages.CompletionItem[] = [...groupTypeKeyMap.required, ...groupTypeKeyMap.allowed].map(k => ({
        label: k,
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: k,
        documentation: 'TODO: doc',
        range: currentKv === undefined
            ? new monaco.Range(lineId, currentArg.startCol, lineId, currentArg.startCol + currentArg.text.length)
            : new monaco.Range(lineId, currentKv.keyStartCol, lineId, currentKv.keyStartCol + currentKv.key.length),
    }))
    return propertyKeySuggestions.concat(proxyOrGroupNameSuggestions)
}

export const completionProvider: monaco.languages.CompletionItemProvider = {
    triggerCharacters: [' ', '[', ',', '='],
    provideCompletionItems(model, position) {
        const textUntilPosition = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        })
        if (textUntilPosition.includes('#')) {
            // Inside a comment
            return { suggestions: [] }
        }
        const struct = parseStruct(model)

        const sectionHeaderOpenMatch = textUntilPosition.match(/^(\s*)\[(\s*)/)
        if (sectionHeaderOpenMatch) {
            return { suggestions: completeSectionHeader(model, position, struct) }
        }

        const sectionIndex = findIndexOfSections(struct.sections, position.lineNumber)
        if (sectionIndex === -1) {
            return { suggestions: [] }
        }
        let suggestions: monaco.languages.CompletionItem[] = []
        switch (struct.sections[sectionIndex].sectionName) {
            case facts.SECTION_GENERAL:
                suggestions = completeGeneralSection(model, position, struct)
                break
            case facts.SECTION_PROXY:
                suggestions = completeProxy(model, position, struct)
                break
            case facts.SECTION_PROXY_GROUP:
                suggestions = completeProxyGroup(model, position, struct)
                break
        }
        return { suggestions, incomplete: true }
    },
}

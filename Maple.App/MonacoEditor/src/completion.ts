import * as monaco from 'monaco-editor'
import * as facts from './facts'
import { findIndexOfSections, ILeafConfKvItem, ILeafConfStruct, parseKvLine, parseSectionGeneral, parseStruct, splitByComma, trimComment, trimWithPos } from './parse'

function collectProxyOrGroupSuggestions(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    range: monaco.Range,
) {
    return struct.sections.filter(s => s.sectionName === facts.SECTION_PROXY)
        .flatMap(s => Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i))
        .map(lineId => parseKvLine(model.getLineContent(lineId), lineId, 1))
        .filter((kv): kv is ILeafConfKvItem => kv !== undefined)
        .map(kv => ({
            label: kv.key,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: kv.key,
            detail: 'proxy',
            range,
        })).concat(struct.sections.filter(s => s.sectionName === facts.SECTION_PROXY_GROUP)
            .flatMap(s => Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i))
            .map(lineId => parseKvLine(model.getLineContent(lineId), lineId, 1))
            .filter((kv): kv is ILeafConfKvItem => kv !== undefined)
            .map(kv => ({
                label: kv.key,
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText: kv.key,
                detail: 'proxy group',
                range,
            })))
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
                        documentation: { value: k.desc },
                    }
                case facts.SETTING_LOGLEVEL:
                    return {
                        label: k.name,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        range,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: eqPos === -1 ? `${k.name} = \${1|${facts.LOG_LEVELS.join(',')}|}` : k.name + ' ',
                        documentation: { value: k.desc },
                    }
                case facts.SETTING_ROUTING_DOMAIN_RESOLVE:
                    return {
                        label: k.name,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        range,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: eqPos === -1 ? `${k.name} = \${1|true,false|}` : k.name + ' ',
                        documentation: { value: k.desc },
                    }
            }
            return {
                label: k.name,
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: eqPos === -1 ? k.name + ' = ' : k.name + ' ',
                documentation: { value: k.desc },
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
            }]
        case facts.SETTING_LOGLEVEL:
            return facts.LOG_LEVELS.map(l => ({
                label: l,
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: l,
            }))
        case facts.SETTING_ROUTING_DOMAIN_RESOLVE:
            return generateBoolCandidates(range)
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
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: p.snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: { value: p.desc },
            range,
        }))
    } else if (position.column <= protocolItem.startCol + protocolItem.text.length) {
        const range = new monaco.Range(lineId, protocolItem.startCol, lineId, protocolItem.startCol + protocolItem.text.length)
        return facts.PROXY_PROTOCOLS.map(p => ({
            label: p.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: p.name,
            documentation: { value: p.desc },
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
            documentation: { value: facts.PROXY_PROPERTY_KEYS_DESC_MAP.get(k)! },
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
        case facts.PROXY_PROPERTY_KEY_OBFS:
            return facts.KNOWN_OBFS_METHODS.map(o => ({
                label: o,
                kind: monaco.languages.CompletionItemKind.EnumMember,
                insertText: o,
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
            documentation: { value: p.desc },
            range,
        }))
    } else if (position.column <= groupTypeItem.startCol + groupTypeItem.text.length) {
        const range = new monaco.Range(lineId, groupTypeItem.startCol, lineId, groupTypeItem.startCol + groupTypeItem.text.length)
        return facts.GROUP_TYPES.map(p => ({
            label: p.name,
            kind: monaco.languages.CompletionItemKind.Constructor,
            insertText: p.name,
            documentation: { value: p.desc },
            range,
        }))
    }

    const currentArgId = argsText.slice(0, position.column - eqCol - 1).split(',').length - 1
    const currentArg = args[currentArgId]
    const currentKv = parseKvLine(currentArg.text, lineId, currentArg.startCol)

    if (currentKv !== undefined && position.column >= currentKv.valueStartCol) {
        // Want a property value
        const range = new monaco.Range(lineId, currentKv.valueStartCol, lineId, currentKv.valueStartCol + currentKv.value.length)
        switch (currentKv.key) {
            case facts.GROUP_PROPERTY_KEY_METHOD:
                return facts.KNOWN_GROUP_METHODS.map(m => ({
                    label: m,
                    kind: monaco.languages.CompletionItemKind.EnumMember,
                    insertText: m,
                    range,
                    documentation: { value: facts.GROUP_METHOD_DESC_MAP.get(m)! },
                }))
            case facts.GROUP_PROPERTY_KEY_FAILOVER:
            case facts.GROUP_PROPERTY_KEY_FALLBACK_CACHE:
            case facts.GROUP_PROPERTY_KEY_HEALTH_CHECK:
                return generateBoolCandidates(range)
            case facts.GROUP_PROPERTY_KEY_LAST_RESORT:
                return collectProxyOrGroupSuggestions(model, struct, range)
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
        documentation: { value: facts.GROUP_PROPERTY_KEYS_DESC_MAP.get(k)! },
        range: currentKv === undefined
            ? new monaco.Range(lineId, currentArg.startCol, lineId, currentArg.startCol + currentArg.text.length)
            : new monaco.Range(lineId, currentKv.keyStartCol, lineId, currentKv.keyStartCol + currentKv.key.length),
    }))
    return propertyKeySuggestions.concat(proxyOrGroupNameSuggestions)
}

function completeRule(model: monaco.editor.ITextModel,
    position: monaco.Position,
    struct: ILeafConfStruct,
): monaco.languages.CompletionItem[] {
    const lineId = position.lineNumber
    const line = trimComment(model.getLineContent(lineId))
    const args = splitByComma(line, 1)
    const currentArgId = line.slice(0, position.column - 1).split(',').length - 1

    if (currentArgId === 0) {
        if (args.length > 1) {
            const range = new monaco.Range(
                lineId,
                Math.min(position.column, args[0].startCol),
                lineId,
                Math.max(position.column, args[0].startCol + args[0].text.length),
            )
            return facts.RULE_TYPES.map(p => ({
                label: p.name,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: p.name,
                documentation: { value: p.desc },
                range,
            }))
        } else {
            const range = new monaco.Range(
                lineId,
                Math.min(args[0].startCol),
                lineId,
                args[0].startCol + args[0].text.length,
            )
            return facts.RULE_TYPES.map(p => ({
                label: p.name,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: p.snippet,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: { value: p.desc },
                range,
            }))
        }
    }

    const ruleType = args[0].text.trim()
    if (ruleType === facts.RULE_TYPE_FINAL && currentArgId === 1 || currentArgId === 2) {
        const range = new monaco.Range(lineId, args[currentArgId].startCol, lineId, args[currentArgId].startCol + args[currentArgId].text.length)
        return collectProxyOrGroupSuggestions(model, struct, range)
    }

    if (ruleType === facts.RULE_TYPE_FINAL && currentArgId > 1 || currentArgId > 2) {
        return []
    }

    if (ruleType === facts.RULE_TYPE_EXTERNAL) {
        let colonPos = args[currentArgId].text.indexOf(':')
        if (colonPos === -1) {
            const range = new monaco.Range(
                lineId,
                Math.min(position.column, args[currentArgId].startCol),
                lineId,
                Math.max(position.column, args[currentArgId].startCol + args[currentArgId].text.length),
            )
            return [facts.RULE_EXTERNAL_SOURCE_SITE, facts.RULE_EXTERNAL_SOURCE_MMDB].map(p => ({
                label: p,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: p + ':',
                documentation: { value: facts.RULE_EXTERNAL_SOURCE_DESC_MAP.get(p)! },
                range,
            }))
        }
        const colonCol = args[currentArgId].startCol + colonPos
        if (position.column > colonCol) {
            return []
        }

        const range = new monaco.Range(
            lineId,
            Math.min(position.column, args[currentArgId].startCol),
            lineId,
            Math.max(colonCol),
        )
        return [facts.RULE_EXTERNAL_SOURCE_SITE, facts.RULE_EXTERNAL_SOURCE_MMDB].map(p => ({
            label: p,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: p,
            documentation: { value: facts.RULE_EXTERNAL_SOURCE_DESC_MAP.get(p)! },
            range,
        }))
    }

    if (ruleType === facts.RULE_TYPE_NETWORK) {
        const range = new monaco.Range(
            lineId,
            Math.min(position.column, args[currentArgId].startCol),
            lineId,
            Math.max(position.column, args[currentArgId].startCol + args[currentArgId].text.length),
        )
        return [facts.RULE_NETWORK_TCP, facts.RULE_NETWORK_UDP].map(p => ({
            label: p,
            kind: monaco.languages.CompletionItemKind.EnumMember,
            insertText: p,
            range,
        }))
    }

    return []
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
            case facts.SECTION_RULE:
                suggestions = completeRule(model, position, struct)
                break
        }
        return { suggestions, incomplete: true }
    },
}

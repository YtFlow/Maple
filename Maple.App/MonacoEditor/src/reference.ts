import * as monaco from 'monaco-editor'
import { findIndexOfSections, ILeafConfKvItem, ILeafConfStruct, parseKvLine, parseStruct, splitByComma, trimComment } from './parse'
import * as facts from './facts'


function findProxyOrGroupReferenceLocations(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    targetName: string,
    includeDeclaration: boolean,
): monaco.languages.Location[] {
    if (targetName.includes('=')) {
        return []
    }
    const proxyLocations = includeDeclaration ? struct.sections.filter(s => s.sectionName === facts.SECTION_PROXY)
        .flatMap(s => Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i))
        .map(lineId => parseKvLine(model.getLineContent(lineId), lineId, 1))
        .filter((kv): kv is ILeafConfKvItem => kv !== undefined && kv.key === targetName)
        .map<monaco.languages.Location>(kv => ({
            uri: model.uri,
            range: new monaco.Range(kv.lineId, kv.keyStartCol, kv.lineId, kv.keyStartCol + kv.key.length),
        }))
        : []
    const proxyGroupLocations = struct.sections.filter(s => s.sectionName === facts.SECTION_PROXY_GROUP)
        .flatMap(s => Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i))
        .map(lineId => parseKvLine(model.getLineContent(lineId), lineId, 1))
        .filter((kv): kv is ILeafConfKvItem => kv !== undefined)
        .flatMap(kv => {
            const args = splitByComma(kv.value, kv.valueStartCol)
            const ret = args.slice(1)
                .filter(a => !a.text.includes('=') && a.text === targetName)
                .map<monaco.languages.Location>(a => ({
                    uri: model.uri,
                    range: new monaco.Range(kv.lineId, a.startCol, kv.lineId, a.startCol + a.text.length),
                }))
            if (includeDeclaration && kv.key === targetName) {
                ret.push({
                    uri: model.uri,
                    range: new monaco.Range(kv.lineId, kv.keyStartCol, kv.lineId, kv.keyStartCol + kv.key.length),
                })
            }
            for (const arg of args
                .map(a => parseKvLine(a.text, kv.lineId, a.startCol))
                .filter((kv): kv is ILeafConfKvItem =>
                    kv?.key === facts.GROUP_PROPERTY_KEY_LAST_RESORT
                    && kv.value === targetName)
            ) {
                ret.push({
                    uri: model.uri,
                    range: new monaco.Range(
                        arg.lineId,
                        arg.valueStartCol,
                        arg.lineId,
                        arg.valueStartCol + arg.value.length,
                    ),
                })
            }
            return ret
        })
    const ruleLocations = struct.sections.filter(s => s.sectionName === facts.SECTION_RULE)
        .flatMap(s => Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i))
        .map(lineId => [lineId, splitByComma(model.getLineContent(lineId), 1)] as const)
        .flatMap(([lineId, args]) => {
            let targetArgId = 2
            if (args[0].text === facts.RULE_TYPE_FINAL && args.length > 1) {
                targetArgId = 1
            }
            const targetArg = args[targetArgId]
            if (targetArg === undefined || targetArg.text !== targetName) {
                return []
            }
            return [{
                uri: model.uri,
                range: new monaco.Range(lineId, targetArg.startCol, lineId, targetArg.startCol + targetArg.text.length),
            }]
        })
    return proxyLocations.concat(proxyGroupLocations).concat(ruleLocations)
}

function provideNameUnderCursorForProxy(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    struct: ILeafConfStruct,
    includeDeclaration: boolean,
): monaco.languages.Location | undefined {
    if (!includeDeclaration) {
        return undefined
    }
    const lineId = position.lineNumber
    const kv = parseKvLine(model.getLineContent(lineId), lineId, 1)
    if (kv === undefined) {
        return undefined
    }
    if (position.column > kv.keyStartCol + kv.key.length) {
        return undefined
    }
    return {
        uri: model.uri,
        range: new monaco.Range(lineId, kv.keyStartCol, lineId, kv.keyStartCol + kv.key.length),
    }
}

function provideNameUnderCursorForProxyGroup(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    struct: ILeafConfStruct,
    includeDeclaration: boolean,
): monaco.languages.Location | undefined {
    const lineId = position.lineNumber
    const kv = parseKvLine(model.getLineContent(lineId), lineId, 1)
    if (kv === undefined) {
        return undefined
    }
    if (includeDeclaration && position.column <= kv.keyStartCol + kv.key.length) {
        return {
            uri: model.uri,
            range: new monaco.Range(lineId, kv.keyStartCol, lineId, kv.keyStartCol + kv.key.length),
        }
    }

    const args = splitByComma(kv.value, kv.valueStartCol)
    const currentArgId = kv.value.substring(0, position.column - kv.valueStartCol).split(',').length - 1
    const currentArg = args[currentArgId]
    if (currentArgId === 0 || currentArg.text.includes('=')) {
        return undefined
    }
    return {
        uri: model.uri,
        range: new monaco.Range(lineId, currentArg.startCol, lineId, currentArg.startCol + currentArg.text.length),
    }
}

function provideNameUnderCursorForRule(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    struct: ILeafConfStruct,
    includeDeclaration: boolean,
): monaco.languages.Location | undefined {
    const lineId = position.lineNumber
    const line = model.getLineContent(lineId)
    const args = splitByComma(trimComment(line), 1)
    const currentArgId = line.substring(0, position.column - 1).split(',').length - 1
    if (currentArgId === 0) {
        return undefined
    }
    const ruleType = args[0].text
    if (
        (ruleType === facts.RULE_TYPE_FINAL && currentArgId !== 1)
        || (ruleType !== facts.RULE_TYPE_FINAL && currentArgId !== 2)
    ) {
        return undefined
    }
    const currentArg = args[currentArgId]
    return {
        uri: model.uri,
        range: new monaco.Range(lineId, currentArg.startCol, lineId, currentArg.startCol + currentArg.text.length),
    }
}

function provideReferences(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    includeDeclaration: boolean,
): monaco.languages.Location[] | undefined {
    const lineId = position.lineNumber
    const struct = parseStruct(model)
    const sectionId = findIndexOfSections(struct.sections, lineId)
    if (sectionId === -1) {
        return undefined
    }
    const section = struct.sections[sectionId]
    let range: monaco.IRange | undefined = undefined
    switch (section.sectionName) {
        case facts.SECTION_PROXY:
            range = provideNameUnderCursorForProxy(model, position, struct, includeDeclaration)?.range
            break
        case facts.SECTION_PROXY_GROUP:
            range = provideNameUnderCursorForProxyGroup(model, position, struct, includeDeclaration)?.range
            break
        case facts.SECTION_RULE:
            range = provideNameUnderCursorForRule(model, position, struct, includeDeclaration)?.range
            break
    }
    if (range) {
        return findProxyOrGroupReferenceLocations(model, struct, model.getValueInRange(range), includeDeclaration)
    }
    return undefined
}

export const referenceProvider: monaco.languages.ReferenceProvider = {
    provideReferences(model, position, context, token) {
        return provideReferences(model, position, context.includeDeclaration)
    },
}

export const renameProvider: monaco.languages.RenameProvider = {
    provideRenameEdits(model, position, newName, token) {
        const ret: (monaco.languages.WorkspaceEdit & monaco.languages.Rejection) = {
            edits: [],
        }
        if (newName.includes('=') || newName.includes(',')) {
            ret.rejectReason = 'Invalid name'
            return ret
        }
        const references = provideReferences(model, position, true)
        if (!references?.length) {
            ret.rejectReason = 'Cannot rename the current element'
            return ret
        }

        ret.edits = references.map(r => ({
            resource: model.uri,
            edit: {
                range: r.range,
                text: newName
            }
        }))
        return ret
    },
    resolveRenameLocation(model, position, token) {
        const ret: monaco.languages.RenameLocation & monaco.languages.Rejection = {
            range: new monaco.Range(1, 1, 1, 1),
            text: ''
        }
        const lineId = position.lineNumber
        const struct = parseStruct(model)
        const sectionId = findIndexOfSections(struct.sections, lineId)
        if (sectionId === -1) {
            ret.rejectReason = 'Cannot rename the current element'
            return ret
        }
        const section = struct.sections[sectionId]
        let range: monaco.IRange | undefined = undefined
        switch (section.sectionName) {
            case facts.SECTION_PROXY:
                range = provideNameUnderCursorForProxy(model, position, struct, true)?.range
                break
            case facts.SECTION_PROXY_GROUP:
                range = provideNameUnderCursorForProxyGroup(model, position, struct, true)?.range
                break
            case facts.SECTION_RULE:
                range = provideNameUnderCursorForRule(model, position, struct, true)?.range
                break
        }
        if (range === undefined) {
            ret.rejectReason = 'Cannot rename the current element'
            return ret
        }
        ret.range = range
        ret.text = model.getValueInRange(range)
        return ret
    },
}

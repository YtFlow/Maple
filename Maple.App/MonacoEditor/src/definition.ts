import * as monaco from 'monaco-editor'
import { findIndexOfSections, ILeafConfKvItem, ILeafConfStruct, parseKvLine, parseStruct, splitByComma, trimComment } from './parse'
import * as facts from './facts'

function findProxyOrGroupKeyLocation(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    targetName: string,
): monaco.languages.Location | undefined {
    const defKv = struct.sections.filter(s =>
        s.sectionName === facts.SECTION_PROXY || s.sectionName === facts.SECTION_PROXY_GROUP
    )
        .flatMap(s => Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i))
        .map(lineId => parseKvLine(model.getLineContent(lineId), lineId, 1))
        .filter((kv): kv is ILeafConfKvItem => kv !== undefined)
        .find(kv => kv.key === targetName)
    if (defKv === undefined) {
        return undefined
    }
    return {
        uri: model.uri,
        range: new monaco.Range(
            defKv.lineId,
            defKv.keyStartCol,
            defKv.lineId,
            defKv.keyStartCol + defKv.key.length,
        ),
    }
}

function provideDefinitionForProxy(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
): monaco.languages.Location | undefined {
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

function provideDefinitionForProxyGroup(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    position: monaco.Position,
): monaco.languages.Location | undefined {
    const lineId = position.lineNumber
    const kv = parseKvLine(model.getLineContent(lineId), lineId, 1)
    if (kv === undefined) {
        return undefined
    }
    if (position.column <= kv.keyStartCol + kv.key.length) {
        return {
            uri: model.uri,
            range: new monaco.Range(lineId, kv.keyStartCol, lineId, kv.keyStartCol + kv.key.length),
        }
    }

    const args = splitByComma(kv.value, kv.valueStartCol)
    const currentArgId = kv.value.substring(0, position.column - kv.valueStartCol).split(',').length - 1
    const targetName = args[currentArgId].text
    if (targetName.includes('=')) {
        return undefined
    }
    return findProxyOrGroupKeyLocation(model, struct, targetName)
}

function provideDefinitionForRule(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    position: monaco.Position,
): monaco.languages.Location | undefined {
    const lineId = position.lineNumber
    const line = trimComment(model.getLineContent(lineId))

    const args = splitByComma(line, 1)
    const currentArgId = line.substring(0, position.column - 1).split(',').length - 1
    if (currentArgId === 0) {
        return undefined
    }
    const ruleType = args[0].text
    let targetName = args[currentArgId].text
    if (
        (ruleType === facts.RULE_TYPE_FINAL && currentArgId === 1)
        || (ruleType !== facts.RULE_TYPE_FINAL && currentArgId === 2)
    ) {
        targetName = args[currentArgId].text
    } else {
        return undefined
    }
    if (targetName.includes('=')) {
        return undefined
    }
    return findProxyOrGroupKeyLocation(model, struct, targetName)
}

export const definitionProvider: monaco.languages.DefinitionProvider = {
    provideDefinition(model, position, token) {
        const lineId = position.lineNumber
        const struct = parseStruct(model)
        const sectionId = findIndexOfSections(struct.sections, lineId)
        if (sectionId === -1) {
            return undefined
        }
        const section = struct.sections[sectionId]
        switch (section.sectionName) {
            case facts.SECTION_PROXY:
                return provideDefinitionForProxy(model, position)
            case facts.SECTION_PROXY_GROUP:
                return provideDefinitionForProxyGroup(model, struct, position)
            case facts.SECTION_RULE:
                return provideDefinitionForRule(model, struct, position)
        }
        return undefined
    },
}

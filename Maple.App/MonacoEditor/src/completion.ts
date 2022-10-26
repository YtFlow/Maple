import * as monaco from 'monaco-editor'
import * as facts from './facts'
import { findIndexOfSections, ILeafConfStruct, parseSectionGeneral, parseStruct, trimComment } from './parse'

function completeGeneralSection(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    textUntilPosition: string,
    struct: ILeafConfStruct,
): monaco.languages.CompletionItem[] {
    const lineId = position.lineNumber
    const lineLen = model.getLineLength(lineId)
    const eqPos = textUntilPosition.indexOf('=')
    if (eqPos === -1) {
        const filledKeys = new Set(parseSectionGeneral(model, struct).map(i => i.key))
        const range = new monaco.Range(lineId, model.getLineFirstNonWhitespaceColumn(lineId), lineId, lineLen + 1)

        return facts.GENERAL_SETTING_KEYS.filter(k => !filledKeys.has(k.name)).map(k => {
            switch (k.name) {
                case facts.SETTING_TUN:
                    return {
                        label: k.name,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        range,
                        insertText: `${k.name} = auto`,
                        documentation: k.desc,
                    }
                case facts.SETTING_LOGLEVEL:
                    return {
                        label: k.name,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        range,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: `${k.name} = \${1|${facts.LOG_LEVELS.join(',')}|}`,
                        documentation: k.desc,
                    }
                case facts.SETTING_ROUTING_DOMAIN_RESOLVE:
                    return {
                        label: k.name,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        range,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: `${k.name} = \${1|true,false|}`,
                        documentation: k.desc,
                    }
            }
            return {
                label: k.name,
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: k.name + ' = ',
                documentation: k.desc,
            }
        })
    }

    const settingKey = textUntilPosition.substring(0, eqPos).trim()
    const range = new monaco.Range(lineId, eqPos + 2, lineId, lineLen + 1)
    switch (settingKey) {
        case facts.SETTING_TUN:
            return [{
                label: 'auto',
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: ' auto',
                documentation: 'TODO: doc',
            }]
        case facts.SETTING_LOGLEVEL:
            return facts.LOG_LEVELS.map(l => ({
                label: l,
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: ' ' + l,
                documentation: 'TODO: doc',
            }))
        case facts.SETTING_ROUTING_DOMAIN_RESOLVE:
            return [{
                label: 'true',
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: ' true',
                documentation: 'TODO: doc',
            }, {
                label: 'false',
                kind: monaco.languages.CompletionItemKind.Keyword,
                range,
                insertText: ' false',
                documentation: 'TODO: doc',
            },]
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
            endColumn: position.column
        })
        if (textUntilPosition.includes('#')) {
            // Inside a comment
            return { suggestions: [] }
        }
        const sectionHeaderOpenMatch = textUntilPosition.match(/^(\s*)\[(\s*)/)
        if (sectionHeaderOpenMatch) {
            const sectionHeaderPos = sectionHeaderOpenMatch[1].length + 2
            const textAfterPosition = trimComment(model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: position.column + 1,
                endLineNumber: position.lineNumber,
                endColumn: model.getLineLength(position.lineNumber) + 1
            }))
            let completionRangeEndCol = sectionHeaderPos
            const sectionNameEndBracketPos = textAfterPosition.lastIndexOf(']')
            if (sectionNameEndBracketPos !== -1) {
                completionRangeEndCol = position.column + sectionNameEndBracketPos + 2
            }
            const suggestions = facts.KNOWN_SECTION_NAMES.map(sectionName => ({
                label: `[${sectionName}]`,
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: sectionName + ']',
                range: {
                    startLineNumber: position.lineNumber,
                    startColumn: sectionHeaderPos,
                    endLineNumber: position.lineNumber,
                    endColumn: completionRangeEndCol,
                }
            }))
            return { suggestions }
        }

        const struct = parseStruct(model)
        const sectionIndex = findIndexOfSections(struct.sections, position.lineNumber)
        if (sectionIndex === -1) {
            return { suggestions: [] }
        }
        let suggestions: monaco.languages.CompletionItem[] = [];
        switch (struct.sections[sectionIndex].sectionName) {
            case facts.SECTION_GENERAL:
                suggestions = completeGeneralSection(model, position, textUntilPosition, struct)
                break;
        }
        return { suggestions }
    },
}

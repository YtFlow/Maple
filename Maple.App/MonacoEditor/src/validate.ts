import * as monaco from 'monaco-editor'
import { KNOWN_SECTION_NAMES, KNOWN_SECTION_NAMES_SET } from './facts'
import { parseStruct, trimComment, trimWithPos } from './parse'

export function validateModel(model: monaco.editor.ITextModel) {
    const lineCount = model.getLineCount()
    const { sections } = parseStruct(model)
    const errors: monaco.editor.IMarkerData[] = []
    const firstSectionLineId = sections?.[0].startLine ?? lineCount + 1
    let currLineId = 1
    while (currLineId < firstSectionLineId) {
        const { trimmed, startCol } = trimWithPos(trimComment(model.getLineContent(currLineId)), 1)
        if (trimmed.length > 0) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                message: `Content does not belong to any section`,
                startLineNumber: currLineId,
                startColumn: startCol,
                endLineNumber: currLineId,
                endColumn: startCol + trimmed.length,
            })
        }
        currLineId++
    }
    for (const section of sections) {
        const sectionHeader = trimComment(model.getLineContent(section.startLine)).trimEnd()
        const sectionNameEndMarkPos = sectionHeader.lastIndexOf(']') + 1
        if (sectionNameEndMarkPos !== sectionHeader.length) {
            const { trimmed: extraContent, startCol: extraContentStartCol } =
                trimWithPos(sectionHeader.substring(sectionNameEndMarkPos), sectionNameEndMarkPos + 1)
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                message: `Unexpected content after section header`,
                startLineNumber: section.startLine,
                startColumn: extraContentStartCol,
                endLineNumber: section.startLine,
                endColumn: extraContentStartCol + extraContent.length,
            })
        }

        if (!KNOWN_SECTION_NAMES_SET.has(section.sectionName)) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                message: `Unknown section name: ${section.sectionName}
Section names can only be one of: ${KNOWN_SECTION_NAMES.join(', ')}`,
                startLineNumber: section.startLine,
                startColumn: section.sectionNameStartCol,
                endLineNumber: section.startLine,
                endColumn: section.sectionNameStartCol + section.sectionName.length,
            })
        }
        currLineId = section.startLine + 1
    }
    // const [doc, errors] = parseModel(model)
    monaco.editor.setModelMarkers(model, 'Maple', errors)
}

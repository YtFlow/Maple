import * as monaco from 'monaco-editor'
import { SECTION_GENERAL } from './facts'

export interface ILeafConfSection {
    sectionName: string,
    sectionNameStartCol: number,
    startLine: number,
    endLine: number,
}

export interface ILeafConfStruct {
    sections: ILeafConfSection[]
}

export interface ILeafConfKvItem {
    lineId: number,
    key: string,
    keyStartCol: number,
    value: string,
    valueStartCol: number,
}

export type ILeafConfTextSpan = { text: string, startCol: number }

export function trimWithPos(s: string, startCol: number) {
    const matches = s.match(/^(\s*)([^\s].*)$/)
    if (!matches) {
        return { trimmed: '', startCol }
    }
    const [_, whitespace, text] = matches
    return { trimmed: text.trimEnd(), startCol: startCol + whitespace.length }
}

export function trimComment(s: string): string {
    const commentPos = s.indexOf('#')
    if (commentPos === -1) {
        return s
    }
    return s.slice(0, commentPos)
}

export function splitByComma(s: string, startCol: number): ILeafConfTextSpan[] {
    const ret: ILeafConfTextSpan[] = []
    let commaPos = s.indexOf(',')
    while (commaPos !== -1) {
        const trimmed = trimWithPos(s.slice(0, commaPos), startCol)
        ret.push({ text: trimmed.trimmed, startCol: trimmed.startCol })
        s = s.slice(commaPos + 1)
        startCol += commaPos + 1
        commaPos = s.indexOf(',')
    }
    const trimmed = trimWithPos(s, startCol)
    ret.push({ text: trimmed.trimmed, startCol: trimmed.startCol })
    return ret
}

export function parseStruct(model: monaco.editor.ITextModel): ILeafConfStruct {
    const ret: ILeafConfStruct = { sections: [] }
    const sectionHeaderMatches = model.findMatches(`^(\\s*)\\[([^\\]#]+)\\]`, true, true, true, null, true)
    const [firstSectionHeaderMatch, ...remainingSectionHeaderMatches] = sectionHeaderMatches
    if (!firstSectionHeaderMatch) {
        return ret
    }
    let { trimmed: sectionName, startCol: sectionNameStartCol } = trimWithPos(
        firstSectionHeaderMatch.matches?.[2] || '',
        (firstSectionHeaderMatch.matches?.[1].length ?? 0) + 2,
    )
    let lastSection = {
        sectionName,
        sectionNameStartCol,
        startLine: firstSectionHeaderMatch.range.startLineNumber,
        endLine: firstSectionHeaderMatch.range.startLineNumber
    }
    for (const sectionHeaderMatch of remainingSectionHeaderMatches) {
        const currentLineId = sectionHeaderMatch.range.startLineNumber
        let lastSectionLastLineId = currentLineId - 1
        while (
            lastSectionLastLineId > 1
            && model.getLineFirstNonWhitespaceColumn(lastSectionLastLineId) === model.getLineLastNonWhitespaceColumn(lastSectionLastLineId)
        ) {
            lastSectionLastLineId--
        }
        lastSection.endLine = lastSectionLastLineId
        ret.sections.push(lastSection)
        const trimmedSectionName = trimWithPos(
            sectionHeaderMatch.matches?.[2] || '',
            (sectionHeaderMatch.matches?.[1].length ?? 0) + 2,
        )
        sectionName = trimmedSectionName.trimmed
        sectionNameStartCol = trimmedSectionName.startCol
        lastSection = {
            sectionName,
            sectionNameStartCol,
            startLine: currentLineId,
            endLine: currentLineId,
        }
    }
    lastSection.endLine = model.getLineCount()
    ret.sections.push(lastSection)
    return ret
}

export function findIndexOfSections(sections: ILeafConfSection[], lineId: number): number {
    // TODO: binary search
    const pos = [...sections].reverse().findIndex(s => s.startLine < lineId)
    if (pos === -1) {
        return -1
    }
    return sections.length - pos - 1
}

export function parseKvLine(s: string, lineId: number, startCol: number): ILeafConfKvItem | undefined {
    s = trimComment(s)
    const eqPos = s.indexOf('=')
    if (eqPos === -1) {
        return undefined
    }

    const { trimmed: key, startCol: keyStartCol } = trimWithPos(s.substring(0, eqPos), startCol)
    const { trimmed: value, startCol: valueStartCol } = trimWithPos(s.substring(eqPos + 1), startCol + eqPos + 1)
    return { lineId, key, keyStartCol, value, valueStartCol }
}

export function parseSectionGeneral(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
): ILeafConfKvItem[] {
    let ret: ILeafConfKvItem[] = []
    for (const lineId of struct.sections
        .filter(s => s.sectionName === SECTION_GENERAL)
        .flatMap(s => Array.from({ length: s.endLine - s.startLine }, (_, i) => i + s.startLine + 1))) {

        const line = model.getLineContent(lineId)
        const item = parseKvLine(line, lineId, 1)
        if (item !== undefined) {
            ret.push(item)
        }
    }
    return ret
}

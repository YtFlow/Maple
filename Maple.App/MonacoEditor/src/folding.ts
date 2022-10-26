import { languages } from 'monaco-editor'
import { parseStruct } from './parse'

export const foldingRangeProvider: languages.FoldingRangeProvider = {
    provideFoldingRanges(model, _context, _token) {
        const { sections } = parseStruct(model)
        return sections.map(section => ({
            start: section.startLine,
            end: section.endLine,
        }))
    }
}

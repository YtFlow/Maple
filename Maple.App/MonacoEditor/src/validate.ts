import * as monaco from 'monaco-editor'
import * as facts from './facts'
import {
    ILeafConfKvItem,
    ILeafConfStruct,
    parseKvLine,
    parseStruct,
    splitByComma,
    trimComment,
    trimWithPos,
} from './parse'
import { isValid as isValidIpAddr } from 'ipaddr.js'

function validateGeneral(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    errors: monaco.editor.IMarkerData[],
) {
    const visitedKeyItem: Map<string, ILeafConfKvItem> = new Map()
    let fakeIpFilterMode = ''
    for (const section of struct.sections.filter(s => s.sectionName === facts.SECTION_GENERAL)) {
        let currLineId = section.startLine
        while (++currLineId <= section.endLine) {
            const { trimmed: line, startCol } = trimWithPos(trimComment(model.getLineContent(currLineId)), 1)
            if (line.length === 0) {
                continue
            }
            const item = parseKvLine(line, currLineId, startCol)
            if (item === undefined) {
                errors.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: currLineId,
                    startColumn: startCol,
                    endLineNumber: currLineId,
                    endColumn: startCol + line.length,
                    message: `Expected "=".`,
                })
                continue
            }

            const firstVisitedSameKeyItem = visitedKeyItem.get(item.key)
            if (firstVisitedSameKeyItem === undefined) {
                visitedKeyItem.set(item.key, item)
            } else {
                errors.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: item.lineId,
                    startColumn: item.keyStartCol,
                    endLineNumber: item.lineId,
                    endColumn: item.keyStartCol + item.key.length,
                    message: `Duplicate setting "${item.key}".`,
                    relatedInformation: [{
                        startLineNumber: firstVisitedSameKeyItem.lineId,
                        startColumn: firstVisitedSameKeyItem.keyStartCol,
                        endLineNumber: firstVisitedSameKeyItem.lineId,
                        endColumn: firstVisitedSameKeyItem.keyStartCol + firstVisitedSameKeyItem.key.length,
                        message: `First definition of "${item.key}" is here.`,
                        resource: model.uri,
                    }],
                })
            }

            switch (item.key) {
                case facts.SETTING_TUN_FD:
                    if (Number.isNaN(Number.parseInt)) {
                        errors.push({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: currLineId,
                            startColumn: item.valueStartCol,
                            endLineNumber: currLineId,
                            endColumn: item.valueStartCol + item.value.length,
                            message: `tun-fd must be a number.`,
                        })
                    }
                    errors.push({
                        severity: monaco.MarkerSeverity.Info,
                        startLineNumber: currLineId,
                        startColumn: item.valueStartCol,
                        endLineNumber: currLineId,
                        endColumn: item.valueStartCol + item.value.length,
                        message: `tun-fd is only a dummy option for Leaf core to enable TUN inbound on UWP VPN Platform. "tun = auto" has the same effect with better semantics.`,
                    })
                    break
                case facts.SETTING_TUN:
                    if (item.value !== 'auto') {
                        errors.push({
                            severity: monaco.MarkerSeverity.Warning,
                            startLineNumber: currLineId,
                            startColumn: item.valueStartCol,
                            endLineNumber: currLineId,
                            endColumn: item.valueStartCol + item.value.length,
                            message: `Any value for "tun" except "auto" has no effect in Maple.`,
                        })
                    }
                    break
                case facts.SETTING_LOGLEVEL:
                    if (!facts.LOG_LEVELS_SET.has(item.value)) {
                        errors.push({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: currLineId,
                            startColumn: item.valueStartCol,
                            endLineNumber: currLineId,
                            endColumn: item.valueStartCol + item.value.length,
                            message: `Invalid log level. Valid values are "${facts.LOG_LEVELS.join('", "')}".`,
                        })
                    }
                    break
                case facts.SETTING_LOGOUTPUT:
                    break
                case facts.SETTING_DNS_SERVER:
                    errors.push(...splitByComma(item.value, item.valueStartCol)
                        .filter(s => !isValidIpAddr(s.text))
                        .map(s => ({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: currLineId,
                            startColumn: s.startCol,
                            endLineNumber: currLineId,
                            endColumn: s.startCol + s.text.length,
                            message: `Invalid IP address.`,
                        })))
                    break
                case facts.SETTING_ALWAYS_REAL_IP:
                    if (fakeIpFilterMode === 'fake') {
                        errors.push({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: currLineId,
                            startColumn: item.valueStartCol,
                            endLineNumber: currLineId,
                            endColumn: item.valueStartCol + item.value.length,
                            message: `Cannot set "always-real-ip" when "always-fake-ip" is present.`,
                        })
                    } else {
                        fakeIpFilterMode = 'real'
                    }
                    break
                case facts.SETTING_ALWAYS_FAKE_IP:
                    if (fakeIpFilterMode === 'real') {
                        errors.push({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: currLineId,
                            startColumn: item.keyStartCol,
                            endLineNumber: currLineId,
                            endColumn: item.valueStartCol + item.value.length,
                            message: `Cannot set "always-fake-ip" when "always-real-ip" is present.`,
                        })
                    } else {
                        fakeIpFilterMode = 'fake'
                    }
                    break
                case facts.SETTING_ROUTING_DOMAIN_RESOLVE:
                    if (item.value !== 'true' && item.value !== 'false') {
                        errors.push({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: currLineId,
                            startColumn: item.keyStartCol,
                            endLineNumber: currLineId,
                            endColumn: item.valueStartCol + item.value.length,
                            message: `"true" or "false" expected.`,
                        })
                    }
                    break
                case facts.SETTING_DNS_INTERFACE:
                case facts.SETTING_HTTP_INTERFACE:
                case facts.SETTING_INTERFACE:
                case facts.SETTING_SOCKS_INTERFACE:
                case facts.SETTING_API_INTERFACE:
                    break
                case facts.SETTING_HTTP_PORT:
                case facts.SETTING_PORT:
                case facts.SETTING_SOCKS_PORT:
                case facts.SETTING_API_PORT:
                    const portNumber = Number.parseInt(item.value)
                    if (Number.isNaN(portNumber)) {
                        errors.push({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: currLineId,
                            startColumn: item.valueStartCol,
                            endLineNumber: currLineId,
                            endColumn: item.valueStartCol + item.value.length,
                            message: `Invalid port number.`,
                        })
                    }
                    if (portNumber < 0 || portNumber > 65535) {
                        errors.push({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: currLineId,
                            startColumn: item.valueStartCol,
                            endLineNumber: currLineId,
                            endColumn: item.valueStartCol + item.value.length,
                            message: `Port number must be in range 0-65535.`,
                        })
                    }
                    break
                default:
                    errors.push({
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: currLineId,
                        startColumn: item.keyStartCol,
                        endLineNumber: currLineId,
                        endColumn: item.keyStartCol + item.key.length,
                        message: `Unknown setting entry "${item.key}".`,
                    })
            }
        }
    }
}

function validateHost(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    errors: monaco.editor.IMarkerData[],
) {
    const visitedDomain: Map<string, ILeafConfKvItem> = new Map()
    for (const section of struct.sections.filter(s => s.sectionName === facts.SECTION_HOST)) {
        let currLineId = section.startLine
        while (++currLineId <= section.endLine) {
            const { trimmed: line, startCol } = trimWithPos(trimComment(model.getLineContent(currLineId)), 1)
            if (line.length === 0) {
                continue
            }
            const item = parseKvLine(line, currLineId, startCol)
            if (item === undefined) {
                errors.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: currLineId,
                    startColumn: startCol,
                    endLineNumber: currLineId,
                    endColumn: startCol + line.length,
                    message: `Expected "=".`,
                })
                continue
            }

            const firstVisitedSameDomainItem = visitedDomain.get(item.key)
            if (firstVisitedSameDomainItem === undefined) {
                visitedDomain.set(item.key, item)
            } else {
                errors.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: item.lineId,
                    startColumn: item.keyStartCol,
                    endLineNumber: item.lineId,
                    endColumn: item.keyStartCol + item.key.length,
                    message: `Duplicate host name "${item.key}".`,
                    relatedInformation: [{
                        startLineNumber: firstVisitedSameDomainItem.lineId,
                        startColumn: firstVisitedSameDomainItem.keyStartCol,
                        endLineNumber: firstVisitedSameDomainItem.lineId,
                        endColumn: firstVisitedSameDomainItem.keyStartCol + firstVisitedSameDomainItem.key.length,
                        message: `First definition of "${item.key}" is here.`,
                        resource: model.uri,
                    }],
                })
            }

            errors.push(...splitByComma(item.value, item.valueStartCol)
                .filter(s => !isValidIpAddr(s.text))
                .map(s => ({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: currLineId,
                    startColumn: s.startCol,
                    endLineNumber: currLineId,
                    endColumn: s.startCol + s.text.length,
                    message: `Invalid IP address.`,
                })))
        }
    }
}

export function validateModel(model: monaco.editor.ITextModel) {
    const lineCount = model.getLineCount()
    const struct = parseStruct(model)
    const { sections } = struct
    const errors: monaco.editor.IMarkerData[] = []
    const firstSectionLineId = sections?.[0].startLine ?? lineCount + 1
    let currLineId = 1
    while (currLineId < firstSectionLineId) {
        const { trimmed, startCol } = trimWithPos(trimComment(model.getLineContent(currLineId)), 1)
        if (trimmed.length > 0) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                message: `Content does not belong to any section.`,
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
                message: `Unexpected content after section header.`,
                startLineNumber: section.startLine,
                startColumn: extraContentStartCol,
                endLineNumber: section.startLine,
                endColumn: extraContentStartCol + extraContent.length,
            })
        }

        if (!facts.KNOWN_SECTION_NAMES_SET.has(section.sectionName)) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                message: `Unknown section name: ${section.sectionName}.
Section names can only be one of: ${facts.KNOWN_SECTION_NAMES.join(', ')}`,
                startLineNumber: section.startLine,
                startColumn: section.sectionNameStartCol,
                endLineNumber: section.startLine,
                endColumn: section.sectionNameStartCol + section.sectionName.length,
            })
        }
        currLineId = section.startLine + 1
    }
    validateGeneral(model, struct, errors)
    validateHost(model, struct, errors)
    monaco.editor.setModelMarkers(model, 'Maple', errors)
}

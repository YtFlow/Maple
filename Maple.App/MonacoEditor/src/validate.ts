import * as monaco from 'monaco-editor'
import * as facts from './facts'
import {
    ILeafConfKvItem,
    ILeafConfSection,
    ILeafConfStruct,
    ILeafConfTextSpan,
    parseKvLine,
    parseStruct,
    splitByComma,
    trimComment,
    trimWithPos,
} from './parse'
import { isValid as isValidIpAddr, parseCIDR } from 'ipaddr.js'

const possiblyMistakenPositiveValues = new Set(['true', 'on', 'yes', '1', 'enable', 'enabled', 'allow'])

function validatePortNumber(val: string, lineId: number, startCol: number, errors: monaco.editor.IMarkerData[]) {
    for (let i = 0; i < val.length; i++) {
        const charCode = val.charCodeAt(i)
        if (charCode < 48 || charCode > 57) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: lineId,
                startColumn: startCol,
                endLineNumber: lineId,
                endColumn: startCol + val.length,
                message: 'Invalid port number',
            })
            return
        }
    }
    const portNumber = Number.parseInt(val)
    if (portNumber < 0 || portNumber > 65535) {
        errors.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: lineId,
            startColumn: startCol,
            endLineNumber: lineId,
            endColumn: startCol + val.length,
            message: `Port number must be in range 0-65535.`,
        })
    }
}

function validateBoolLike(val: string, lineId: number, startCol: number, errors: monaco.editor.IMarkerData[]) {
    if (val === 'true' || val === 'false') {
        return
    }
    let suggestion = 'false'
    if (possiblyMistakenPositiveValues.has(val.toLowerCase())) {
        suggestion = 'true'
    }
    errors.push({
        severity: monaco.MarkerSeverity.Warning,
        startLineNumber: lineId,
        startColumn: startCol,
        endLineNumber: lineId,
        endColumn: startCol + val.length,
        message: `Any value except "true" is treated as "false". Do you mean "${suggestion}"?`,
    })
}

function validateI32(val: string, lineId: number, startCol: number, errors: monaco.editor.IMarkerData[]) {
    if (val === '' || isNaN(+val)) {
        errors.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: lineId,
            startColumn: startCol,
            endLineNumber: lineId,
            endColumn: startCol + val.length,
            message: `Expected number.`,
        })
    }
}

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
                    validateI32(item.value, currLineId, item.valueStartCol, errors)
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
                            startColumn: item.valueStartCol,
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
                    validatePortNumber(item.value, currLineId, item.valueStartCol, errors)
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

function validateProxyItem(
    model: monaco.editor.ITextModel,
    item: ILeafConfKvItem,
    errors: monaco.editor.IMarkerData[],
) {
    const args = splitByComma(item.value, item.valueStartCol)
    if (args.length < 1 || args[0].text === '') {
        errors.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: item.lineId,
            startColumn: item.valueStartCol,
            endLineNumber: item.lineId,
            endColumn: item.valueStartCol + item.value.length,
            message: `Expected proxy protocol.`,
        })
        return
    }
    const protocol = args[0].text
    let firstKvArgId = args.findIndex(s => s.text.includes('='))
    if (firstKvArgId === -1) {
        firstKvArgId = args.length
    }
    const protocolKeyDef = facts.PROXY_PROTOCOL_PROPERTY_KEY_MAP[protocol]
    if (protocolKeyDef === undefined) {
        const allowedProtocols = facts.PROXY_PROTOCOLS.map(p => p.name).join('", "')
        errors.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: item.lineId,
            startColumn: args[0].startCol,
            endLineNumber: item.lineId,
            endColumn: args[0].startCol + args[0].text.length,
            message: `Unknown proxy protocol "${protocol}". Allowed values are "${allowedProtocols}".`,
        })
        return
    }
    const argsWithKv = args.slice(firstKvArgId)
    const visitedKvs: Map<string, ILeafConfKvItem> = new Map()
    const requiredVisited = new Map([...protocolKeyDef.required].map(k => [k, false]))
    for (const arg of argsWithKv) {
        const kv = parseKvLine(arg.text, item.lineId, arg.startCol)
        if (kv === undefined) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: arg.startCol,
                endLineNumber: item.lineId,
                endColumn: arg.startCol + arg.text.length,
                message: `Expected key=value pair.`,
            })
            continue
        }
        const firstVisitedSameKeyItem = visitedKvs.get(kv.key)
        if (firstVisitedSameKeyItem === undefined) {
            visitedKvs.set(kv.key, kv)
            if (requiredVisited.has(kv.key)) {
                requiredVisited.set(kv.key, true)
            }
        } else {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: kv.keyStartCol,
                endLineNumber: item.lineId,
                endColumn: kv.keyStartCol + kv.key.length,
                message: `Duplicate key "${kv.key}".`,
                relatedInformation: [{
                    startLineNumber: firstVisitedSameKeyItem.lineId,
                    startColumn: firstVisitedSameKeyItem.keyStartCol,
                    endLineNumber: firstVisitedSameKeyItem.lineId,
                    endColumn: firstVisitedSameKeyItem.keyStartCol + firstVisitedSameKeyItem.key.length,
                    message: `First definition of "${item.key}" is here.`,
                    resource: undefined!,// model.uri,
                }]
            })
        }
        let isUnknownKey = false
        switch (kv.key) {
            case facts.PROXY_PROPERTY_KEY_METHOD:
                if (!facts.KNOWN_AEAD_CIPHERS_SET.has(kv.value)) {
                    const allowedCiphers = facts.KNOWN_AEAD_CIPHERS.join('", "')
                    errors.push({
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: item.lineId,
                        startColumn: kv.valueStartCol,
                        endLineNumber: item.lineId,
                        endColumn: kv.valueStartCol + kv.value.length,
                        message: `Unknown encryption method "${kv.value}". `
                            + `Allowed values are "${allowedCiphers}".`,
                    })
                }
                break
            case facts.PROXY_PROPERTY_KEY_USERNAME:
            case facts.PROXY_PROPERTY_KEY_PASSWORD:
            case facts.PROXY_PROPERTY_KEY_WS_PATH:
            case facts.PROXY_PROPERTY_KEY_WS_HOST:
            case facts.PROXY_PROPERTY_KEY_TLS_CERT: // TODO: check cert
            case facts.PROXY_PROPERTY_KEY_SNI:
                break
            case facts.PROXY_PROPERTY_KEY_WS:
            case facts.PROXY_PROPERTY_KEY_TLS:
            case facts.PROXY_PROPERTY_KEY_AMUX:
            case facts.PROXY_PROPERTY_KEY_QUIC:
                validateBoolLike(kv.value, item.lineId, kv.valueStartCol, errors)
                break
            case facts.PROXY_PROPERTY_KEY_AMUX_MAX:
            case facts.PROXY_PROPERTY_KEY_AMUX_CON:
                validateI32(kv.value, item.lineId, kv.valueStartCol, errors)
                break
            case facts.PROXY_PROPERTY_KEY_INTERFACE:
                continue
            default:
                isUnknownKey = true
                errors.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: item.lineId,
                    startColumn: kv.keyStartCol,
                    endLineNumber: item.lineId,
                    endColumn: kv.keyStartCol + kv.key.length,
                    message: `Unknown key "${kv.key}".`,
                })
                break
        }
        if (!isUnknownKey && !protocolKeyDef.required.has(kv.key) && !protocolKeyDef.allowed.has(kv.key)) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: kv.keyStartCol,
                endLineNumber: item.lineId,
                endColumn: kv.keyStartCol + kv.key.length,
                message: `Key "${kv.key}" is not allowed in "${protocol}" protocol.`,
            })
        }
    }
    for (const [key, visited] of requiredVisited) {
        if (!visited) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: item.valueStartCol,
                endLineNumber: item.lineId,
                endColumn: item.valueStartCol + item.value.length,
                message: `Missing key "${key}".`,
            })
        }
    }

    let expectedArgsWithoutKv = 0
    const argsWithoutKv = args.slice(1, firstKvArgId)
    if (facts.PROXY_PROTOCOLS_REQUIRING_HOST_SET.has(protocol)) {
        expectedArgsWithoutKv += 2
        if (argsWithoutKv.length === 0 || argsWithoutKv[0].text === '') {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: item.valueStartCol,
                endLineNumber: item.lineId,
                endColumn: item.valueStartCol + item.value.length,
                message: `Expected host name.`,
            })
        }
        // TODO: validate host names
        if (argsWithoutKv.length <= 1 || argsWithoutKv[1].text === '') {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: item.valueStartCol,
                endLineNumber: item.lineId,
                endColumn: item.valueStartCol + item.value.length,
                message: `Expected port number.`,
            })
        } else {
            const port = argsWithoutKv[1].text
            validatePortNumber(port, item.lineId, argsWithoutKv[1].startCol, errors)
        }
    }
    for (const arg of argsWithoutKv.slice(expectedArgsWithoutKv)) {
        errors.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: item.lineId,
            startColumn: arg.startCol,
            endLineNumber: item.lineId,
            endColumn: arg.startCol + arg.text.length,
            message: `Unexpected argument.`,
        })
    }
}

function validateProxyGroupItem(
    model: monaco.editor.ITextModel,
    item: ILeafConfKvItem,
    allProxyLikeNames: Set<string>,
    errors: monaco.editor.IMarkerData[],
) {
    const args = splitByComma(item.value, item.valueStartCol)
    if (args.length < 1 || args[0].text === '') {
        errors.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: item.lineId,
            startColumn: item.valueStartCol,
            endLineNumber: item.lineId,
            endColumn: item.valueStartCol + item.value.length,
            message: `Expected proxy group type.`,
        })
        return
    }
    const type = args[0].text
    let firstKvArgId = args.findIndex(s => s.text.includes('='))
    if (firstKvArgId === -1) {
        firstKvArgId = args.length
    }
    const typeKeyDef = facts.PROXY_GROUP_PROPERTY_KEY_MAP[type]
    if (typeKeyDef === undefined) {
        if (type === 'random') {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: args[0].startCol,
                endLineNumber: item.lineId,
                endColumn: args[0].startCol + args[0].text.length,
                message: `Proxy group type "random" has been replaced by "static" with "method=random".`,
            })
        } else {
            const allowedTypes = facts.GROUP_TYPES.map(p => p.name).join('", "')
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: args[0].startCol,
                endLineNumber: item.lineId,
                endColumn: args[0].startCol + args[0].text.length,
                message: `Unknown group type "${type}". Allowed values are "${allowedTypes}".`,
            })
        }
        return
    }
    const argsWithKv = args.slice(firstKvArgId)
    const visitedKvs: Map<string, ILeafConfKvItem> = new Map()
    const requiredVisited = new Map([...typeKeyDef.required].map(k => [k, false]))
    for (const arg of argsWithKv) {
        const kv = parseKvLine(arg.text, item.lineId, arg.startCol)
        if (kv === undefined) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: arg.startCol,
                endLineNumber: item.lineId,
                endColumn: arg.startCol + arg.text.length,
                message: `Expected key=value pair.`,
            })
            continue
        }
        const firstVisitedSameKeyItem = visitedKvs.get(kv.key)
        if (firstVisitedSameKeyItem === undefined) {
            visitedKvs.set(kv.key, kv)
            if (requiredVisited.has(kv.key)) {
                requiredVisited.set(kv.key, true)
            }
        } else {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: kv.keyStartCol,
                endLineNumber: item.lineId,
                endColumn: kv.keyStartCol + kv.key.length,
                message: `Duplicate key "${kv.key}".`,
                relatedInformation: [{
                    startLineNumber: firstVisitedSameKeyItem.lineId,
                    startColumn: firstVisitedSameKeyItem.keyStartCol,
                    endLineNumber: firstVisitedSameKeyItem.lineId,
                    endColumn: firstVisitedSameKeyItem.keyStartCol + firstVisitedSameKeyItem.key.length,
                    message: `First definition of "${item.key}" is here.`,
                    resource: undefined!,// model.uri,
                }]
            })
        }
        let isUnknownKey = false
        switch (kv.key) {
            case facts.GROUP_PROPERTY_KEY_FAILOVER:
                if (type === facts.GROUP_TYPE_FAILOVER_URL_TEST) {
                    errors.push({
                        severity: monaco.MarkerSeverity.Warning,
                        startLineNumber: item.lineId,
                        startColumn: arg.startCol,
                        endLineNumber: item.lineId,
                        endColumn: arg.startCol + arg.text.length,
                        message: `"url-test" means "failover" with "failover=false". Use "failover" as group type to customize "failover" option.`,
                    })
                }
                validateBoolLike(kv.value, item.lineId, kv.valueStartCol, errors)
                break
            case facts.GROUP_PROPERTY_KEY_HEALTH_CHECK:
            case facts.GROUP_PROPERTY_KEY_FALLBACK_CACHE:
                validateBoolLike(kv.value, item.lineId, kv.valueStartCol, errors)
                break
            case facts.GROUP_PROPERTY_KEY_CHECK_INTERVAL:
            case facts.GROUP_PROPERTY_KEY_FAIL_TIMEOUT:
            case facts.GROUP_PROPERTY_KEY_CACHE_SIZE:
            case facts.GROUP_PROPERTY_KEY_CACHE_TIMEOUT:
            case facts.GROUP_PROPERTY_KEY_HEALTH_CHECK_TIMEOUT:
            case facts.GROUP_PROPERTY_KEY_HEALTH_CHECK_DELAY:
            case facts.GROUP_PROPERTY_KEY_HEALTH_CHECK_ACTIVE:
            case facts.GROUP_PROPERTY_KEY_DELAY_BASE:
                validateI32(kv.value, item.lineId, kv.valueStartCol, errors)
                break
            case facts.GROUP_PROPERTY_KEY_LAST_RESORT:
                break
            case facts.GROUP_PROPERTY_KEY_METHOD:
                if (!facts.KNOWN_GROUP_METHODS_SET.has(kv.value)) {
                    const methods = facts.KNOWN_GROUP_METHODS.join('", "')
                    errors.push({
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: item.lineId,
                        startColumn: kv.valueStartCol,
                        endLineNumber: item.lineId,
                        endColumn: kv.valueStartCol + kv.value.length,
                        message: `Unknown method "${kv.value}". Allowed values are "${methods}".`,
                    })
                }
                break
            default:
                isUnknownKey = true
                errors.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: item.lineId,
                    startColumn: kv.keyStartCol,
                    endLineNumber: item.lineId,
                    endColumn: kv.keyStartCol + kv.key.length,
                    message: `Unknown key "${kv.key}".`,
                })
                break
        }
        if (!isUnknownKey && !typeKeyDef.required.has(kv.key) && !typeKeyDef.allowed.has(kv.key)) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: kv.keyStartCol,
                endLineNumber: item.lineId,
                endColumn: kv.keyStartCol + kv.key.length,
                message: `Key "${kv.key}" is not allowed in a "${type}" group.`,
            })
        }
    }
    for (const [key, visited] of requiredVisited) {
        if (!visited) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: item.valueStartCol,
                endLineNumber: item.lineId,
                endColumn: item.valueStartCol + item.value.length,
                message: `Missing key "${key}".`,
            })
        }
    }

    const argsWithoutKv = args.slice(1, firstKvArgId)
    if (argsWithoutKv.length === 0) {
        errors.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: item.lineId,
            startColumn: item.valueStartCol,
            endLineNumber: item.lineId,
            endColumn: item.valueStartCol + item.value.length,
            message: `A proxy group must have at least one actor.`,
        })
    }
    for (const arg of argsWithoutKv) {
        if (arg.text === '') {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: arg.startCol,
                endLineNumber: item.lineId,
                endColumn: arg.startCol + arg.text.length,
                message: `Empty actor.`,
            })
            continue
        }
        if (!allProxyLikeNames.has(arg.text)) {
            errors.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: item.lineId,
                startColumn: arg.startCol,
                endLineNumber: item.lineId,
                endColumn: arg.startCol + arg.text.length,
                message: `Cannot find actor "${arg.text}" as a proxy or proxy group.`,
            })
        }
    }
}

function validateProxyAndGroup(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    errors: monaco.editor.IMarkerData[],
) {
    const visitedProxyItems: Map<string, ILeafConfKvItem> = new Map()
    const visitedGroupItems: Map<string, ILeafConfKvItem> = new Map()
    const allProxyLikeNames: Set<string> = new Set()
    const proxyGroupItems: ILeafConfKvItem[] = []
    for (const section of struct.sections) {
        if (section.sectionName !== facts.SECTION_PROXY && section.sectionName !== facts.SECTION_PROXY_GROUP) {
            continue
        }
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

            const firstVisitedSameKeyProxy = visitedProxyItems.get(item.key)
            const firstVisitedSameKeyGroup = visitedGroupItems.get(item.key)
            if (section.sectionName === facts.SECTION_PROXY) {
                if (firstVisitedSameKeyProxy !== undefined) {
                    errors.push({
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: currLineId,
                        startColumn: item.keyStartCol,
                        endLineNumber: currLineId,
                        endColumn: item.keyStartCol + item.key.length,
                        message: `Duplicate definition of "${item.key}".`,
                        relatedInformation: [{
                            startLineNumber: firstVisitedSameKeyProxy.lineId,
                            startColumn: firstVisitedSameKeyProxy.keyStartCol,
                            endLineNumber: firstVisitedSameKeyProxy.lineId,
                            endColumn: firstVisitedSameKeyProxy.keyStartCol + firstVisitedSameKeyProxy.key.length,
                            message: `First definition of "${item.key}" is here.`,
                            resource: model.uri,
                        }]
                    })
                } else if (firstVisitedSameKeyGroup !== undefined) {
                    errors.push({
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: currLineId,
                        startColumn: item.keyStartCol,
                        endLineNumber: currLineId,
                        endColumn: item.keyStartCol + item.key.length,
                        message: `Conflict definition of proxy group "${item.key}".`,
                        relatedInformation: [{
                            startLineNumber: firstVisitedSameKeyGroup.lineId,
                            startColumn: firstVisitedSameKeyGroup.keyStartCol,
                            endLineNumber: firstVisitedSameKeyGroup.lineId,
                            endColumn: firstVisitedSameKeyGroup.keyStartCol + firstVisitedSameKeyGroup.key.length,
                            message: `Proxy group "${item.key}" is defined here.`,
                            resource: model.uri,
                        }]
                    })
                } else {
                    visitedProxyItems.set(item.key, item)
                    allProxyLikeNames.add(item.key)
                }

                validateProxyItem(model, item, errors)
            }

            if (section.sectionName === facts.SECTION_PROXY_GROUP) {
                if (firstVisitedSameKeyGroup !== undefined) {
                    errors.push({
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: currLineId,
                        startColumn: item.keyStartCol,
                        endLineNumber: currLineId,
                        endColumn: item.keyStartCol + item.key.length,
                        message: `Duplicate definition of proxy group "${item.key}".`,
                        relatedInformation: [{
                            startLineNumber: firstVisitedSameKeyGroup.lineId,
                            startColumn: firstVisitedSameKeyGroup.keyStartCol,
                            endLineNumber: firstVisitedSameKeyGroup.lineId,
                            endColumn: firstVisitedSameKeyGroup.keyStartCol + firstVisitedSameKeyGroup.key.length,
                            message: `First definition of proxy group "${item.key}" is here.`,
                            resource: model.uri,
                        }]
                    })
                } else if (firstVisitedSameKeyProxy !== undefined) {
                    errors.push({
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: currLineId,
                        startColumn: item.keyStartCol,
                        endLineNumber: currLineId,
                        endColumn: item.keyStartCol + item.key.length,
                        message: `Conflict definition of proxy "${item.key}".`,
                        relatedInformation: [{
                            startLineNumber: firstVisitedSameKeyProxy.lineId,
                            startColumn: firstVisitedSameKeyProxy.keyStartCol,
                            endLineNumber: firstVisitedSameKeyProxy.lineId,
                            endColumn: firstVisitedSameKeyProxy.keyStartCol + firstVisitedSameKeyProxy.key.length,
                            message: `Proxy "${item.key}" is defined here.`,
                            resource: model.uri,
                        }]
                    })
                } else {
                    visitedGroupItems.set(item.key, item)
                    allProxyLikeNames.add(item.key)
                }
                proxyGroupItems.push(item)
            }
        }
    }

    for (const proxyGroupItem of proxyGroupItems) {
        validateProxyGroupItem(model, proxyGroupItem, allProxyLikeNames, errors)
    }
    return allProxyLikeNames
}

function validateRules(
    model: monaco.editor.ITextModel,
    struct: ILeafConfStruct,
    allProxyLikeNames: Set<string>,
    errors: monaco.editor.IMarkerData[],
): boolean {
    let finalItem: [span: ILeafConfTextSpan, lineId: number] | undefined
    for (const section of struct.sections.filter(s => s.sectionName === facts.SECTION_RULE)) {
        let currLineId = section.startLine
        while (++currLineId <= section.endLine) {
            const { trimmed: line, startCol } = trimWithPos(trimComment(model.getLineContent(currLineId)), 1)
            if (line.length === 0) {
                continue
            }

            const items = splitByComma(line, startCol)
            if (items.length === 0) {
                // This cannot happen?
                errors.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: currLineId,
                    startColumn: startCol,
                    endLineNumber: currLineId,
                    endColumn: startCol + line.length,
                    message: `Expected item.`,
                })
                continue
            }
            const ruleType = items[0].text
            let ruleItem: ILeafConfTextSpan | undefined
            let targetItem: ILeafConfTextSpan
            if (ruleType === facts.RULE_TYPE_FINAL) {
                if (items.length !== 2) {
                    errors.push({
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: currLineId,
                        startColumn: startCol,
                        endLineNumber: currLineId,
                        endColumn: startCol + line.length,
                        message: `Expected 1 arguments for "${facts.RULE_TYPE_FINAL}" rules, found ${items.length - 1}.`,
                    })
                    continue
                }
                if (finalItem === undefined) {
                    finalItem = [items[0], currLineId]
                } else {
                    errors.push({
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: currLineId,
                        startColumn: startCol,
                        endLineNumber: currLineId,
                        endColumn: startCol + line.length,
                        message: `Multiple "${facts.RULE_TYPE_FINAL}" rules found.`,
                        relatedInformation: [{
                            startLineNumber: finalItem[1],
                            startColumn: finalItem[0].startCol,
                            endLineNumber: finalItem[1],
                            endColumn: finalItem[0].startCol + finalItem[0].text.length,
                            message: `First "${facts.RULE_TYPE_FINAL}" rule is here.`,
                            resource: model.uri,
                        }]
                    })
                }
                targetItem = items[1]
            } else {
                if (items.length !== 3) {
                    errors.push({
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: currLineId,
                        startColumn: startCol,
                        endLineNumber: currLineId,
                        endColumn: startCol + line.length,
                        message: `Expected 2 arguments, found ${items.length - 1}.`,
                    })
                    continue
                }
                ruleItem = items[1]
                targetItem = items[2]
            }
            if (ruleItem !== undefined) {
                switch (ruleType) {
                    case facts.RULE_TYPE_IP_CIDR:
                        try {
                            parseCIDR(ruleItem.text)
                        } catch (_) {
                            errors.push({
                                severity: monaco.MarkerSeverity.Error,
                                startLineNumber: currLineId,
                                startColumn: ruleItem.startCol,
                                endLineNumber: currLineId,
                                endColumn: ruleItem.startCol + ruleItem.text.length,
                                message: `Invalid CIDR.`,
                            })
                            continue
                        }
                        break
                    case facts.RULE_TYPE_DOMAIN:
                    // TODO: validate domain
                    case facts.RULE_TYPE_DOMAIN_SUFFIX:
                    // TODO: validate domain suffix
                    case facts.RULE_TYPE_DOMAIN_KEYWORD:
                    // TODO: validate domain keyword
                    case facts.RULE_TYPE_GEOIP:
                        if (ruleItem.text === '') {
                            errors.push({
                                severity: monaco.MarkerSeverity.Error,
                                startLineNumber: currLineId,
                                startColumn: ruleItem.startCol,
                                endLineNumber: currLineId,
                                endColumn: ruleItem.startCol + ruleItem.text.length,
                                message: `Expected non-empty string.`,
                            })
                            continue
                        }
                        break
                    case facts.RULE_TYPE_EXTERNAL:
                        {
                            if (ruleItem.text.includes(' :') || ruleItem.text.includes(': ')) {
                                errors.push({
                                    severity: monaco.MarkerSeverity.Warning,
                                    startLineNumber: currLineId,
                                    startColumn: ruleItem.startCol,
                                    endLineNumber: currLineId,
                                    endColumn: ruleItem.startCol + ruleItem.text.length,
                                    message: `Spaces in external rules will not be trimmed. Please remove spaces around the colons.`,
                                })
                                continue
                            }
                            const segs = ruleItem.text.split(':')
                            if (segs.length < 2) {
                                errors.push({
                                    severity: monaco.MarkerSeverity.Error,
                                    startLineNumber: currLineId,
                                    startColumn: ruleItem.startCol,
                                    endLineNumber: currLineId,
                                    endColumn: ruleItem.startCol + ruleItem.text.length,
                                    message: `An external rule must have at least two components, separated by colons.`,
                                })
                                continue
                            }
                            if (segs[0] === facts.RULE_EXTERNAL_SOURCE_MMDB) {
                                if (segs.length > 2) {
                                    errors.push({
                                        severity: monaco.MarkerSeverity.Error,
                                        startLineNumber: currLineId,
                                        startColumn: ruleItem.startCol,
                                        endLineNumber: currLineId,
                                        endColumn: ruleItem.startCol + ruleItem.text.length,
                                        message: `An external MMDB rule cannot have more than two components.`,
                                    })
                                }
                                if (segs[1] === '') {
                                    errors.push({
                                        severity: monaco.MarkerSeverity.Error,
                                        startLineNumber: currLineId,
                                        startColumn: ruleItem.startCol,
                                        endLineNumber: currLineId,
                                        endColumn: ruleItem.startCol + ruleItem.text.length,
                                        message: `An external MMDB rule must have a non-empty country code.`,
                                    })
                                }
                            } else if (segs[0] === facts.RULE_EXTERNAL_SOURCE_SITE) {
                                if (segs.length > 3) {
                                    errors.push({
                                        severity: monaco.MarkerSeverity.Error,
                                        startLineNumber: currLineId,
                                        startColumn: ruleItem.startCol,
                                        endLineNumber: currLineId,
                                        endColumn: ruleItem.startCol + ruleItem.text.length,
                                        message: `An external site rule cannot have more than three components.`,
                                    })
                                }
                                if (segs.length === 3 && segs[1] === '') {
                                    errors.push({
                                        severity: monaco.MarkerSeverity.Error,
                                        startLineNumber: currLineId,
                                        startColumn: ruleItem.startCol,
                                        endLineNumber: currLineId,
                                        endColumn: ruleItem.startCol + ruleItem.text.length,
                                        message: `An external site rule must have a non-empty database file name.`,
                                    })
                                }
                                if (segs.length === 2 && segs[1] === '' || segs.length === 3 && segs[2] === '') {
                                    errors.push({
                                        severity: monaco.MarkerSeverity.Error,
                                        startLineNumber: currLineId,
                                        startColumn: ruleItem.startCol,
                                        endLineNumber: currLineId,
                                        endColumn: ruleItem.startCol + ruleItem.text.length,
                                        message: `An external site rule must have a non-empty domain group.`,
                                    })
                                }
                            } else {
                                errors.push({
                                    severity: monaco.MarkerSeverity.Error,
                                    startLineNumber: currLineId,
                                    startColumn: ruleItem.startCol,
                                    endLineNumber: currLineId,
                                    endColumn: ruleItem.startCol + ruleItem.text.length,
                                    message: `Unknown external rule source "${segs[0]}".`,
                                })
                            }
                        }
                        break
                    case facts.RULE_TYPE_PORT_RANGE:
                        {
                            const hypenPos = ruleItem.text.indexOf('-')
                            if (hypenPos === -1) {
                                errors.push({
                                    severity: monaco.MarkerSeverity.Error,
                                    startLineNumber: currLineId,
                                    startColumn: ruleItem.startCol,
                                    endLineNumber: currLineId,
                                    endColumn: ruleItem.startCol + ruleItem.text.length,
                                    message: `A port range must have two components, separated by a hyphen ("-").`,
                                })
                            } else {
                                validatePortNumber(
                                    ruleItem.text.substring(0, hypenPos),
                                    currLineId,
                                    ruleItem.startCol,
                                    errors,
                                )
                                validatePortNumber(
                                    ruleItem.text.substring(hypenPos + 1),
                                    currLineId,
                                    ruleItem.startCol + hypenPos + 1,
                                    errors,
                                )
                            }
                        }
                        break
                    case facts.RULE_TYPE_NETWORK:
                        if (ruleItem.text !== facts.RULE_NETWORK_TCP && ruleItem.text !== facts.RULE_NETWORK_UDP) {
                            errors.push({
                                severity: monaco.MarkerSeverity.Error,
                                startLineNumber: currLineId,
                                startColumn: ruleItem.startCol,
                                endLineNumber: currLineId,
                                endColumn: ruleItem.startCol + ruleItem.text.length,
                                message: `Unknown network type "${ruleItem.text}". Allowed values are "TCP" and "UDP".`,
                            })
                        }
                        break
                    case facts.RULE_TYPE_INBOUND_TAG:
                        // ???
                        break
                    default:
                        break
                }
            }
            if (!allProxyLikeNames.has(targetItem.text)) {
                errors.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: currLineId,
                    startColumn: targetItem.startCol,
                    endLineNumber: currLineId,
                    endColumn: targetItem.startCol + targetItem.text.length,
                    message: `Proxy or proxy group "${targetItem.text}" is not defined.`,
                })
            }
        }
    }

    return finalItem !== undefined
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
    const sectionsVisited: Map<string, ILeafConfSection | undefined>
        = new Map(facts.KNOWN_SECTION_NAMES.map(s => [s, undefined]))
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

        const sameNameSectionVisited = sectionsVisited.get(section.sectionName)
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
        } else if (sameNameSectionVisited !== undefined) {
            errors.push({
                severity: monaco.MarkerSeverity.Warning,
                message: `Duplicate section name: ${section.sectionName}`,
                startLineNumber: section.startLine,
                startColumn: section.sectionNameStartCol,
                endLineNumber: section.startLine,
                endColumn: section.sectionNameStartCol + section.sectionName.length,
                relatedInformation: [{
                    startLineNumber: sameNameSectionVisited.startLine ?? 0,
                    startColumn: sameNameSectionVisited.sectionNameStartCol ?? 0,
                    endLineNumber: sameNameSectionVisited.startLine ?? 0,
                    endColumn: sameNameSectionVisited.sectionNameStartCol ?? 0,
                    message: `First definition of "${section.sectionName}" is here.`,
                    resource: model.uri,
                }],
            })
        } else {
            sectionsVisited.set(section.sectionName, section)
        }
        currLineId = section.startLine + 1
    }
    validateGeneral(model, struct, errors)
    validateHost(model, struct, errors)
    const allProxyLikeNames = validateProxyAndGroup(model, struct, errors)
    if (!validateRules(model, struct, allProxyLikeNames, errors)) {
        const firstRuleSection = struct.sections.find(s => s.sectionName === facts.SECTION_RULE) ?? {
            startLine: 1,
            endLine: 1,
            sectionNameStartCol: 1,
            sectionName: '',
        }
        errors.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: firstRuleSection.startLine,
            startColumn: firstRuleSection.sectionNameStartCol,
            endLineNumber: firstRuleSection.startLine,
            endColumn: firstRuleSection.sectionNameStartCol + firstRuleSection.sectionName.length,
            message: `A "${facts.RULE_TYPE_FINAL}" rule is missing.`,
        })
    }
    monaco.editor.setModelMarkers(model, 'Maple', errors)
}

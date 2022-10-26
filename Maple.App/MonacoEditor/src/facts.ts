export const SECTION_ENV = 'Env'
export const SECTION_GENERAL = 'General'
export const SECTION_PROXY = 'Proxy'
export const SECTION_PROXY_GROUP = 'Proxy Group'
export const SECTION_RULE = 'Rule'
export const SECTION_HOST = 'Host'
export const KNOWN_SECTION_NAMES = [
    SECTION_ENV,
    SECTION_GENERAL,
    SECTION_PROXY,
    SECTION_PROXY_GROUP,
    SECTION_RULE,
    SECTION_HOST,
]
export const KNOWN_SECTION_NAMES_SET = new Set(KNOWN_SECTION_NAMES)

export interface IGeneralSettingDef {
    name: string,
    desc: string,
    kind: 'port' | 'interface' | 'other'
}
export const SETTING_TUN_FD = 'tun-fd'
export const SETTING_TUN = 'tun'
export const SETTING_LOGLEVEL = 'loglevel'
export const SETTING_LOGOUTPUT = 'logoutput'
export const SETTING_DNS_SERVER = 'dns-server'
export const SETTING_DNS_INTERFACE = 'dns-interface'
export const SETTING_ALWAYS_REAL_IP = 'always-real-ip'
export const SETTING_ALWAYS_FAKE_IP = 'always-fake-ip'
export const SETTING_ROUTING_DOMAIN_RESOLVE = 'routing-domain-resolve'
export const SETTING_HTTP_INTERFACE = 'http-interface'
export const SETTING_INTERFACE = 'interface'
export const SETTING_HTTP_PORT = 'http-port'
export const SETTING_PORT = 'port'
export const SETTING_SOCKS_INTERFACE = 'socks-interface'
export const SETTING_SOCKS_PORT = 'socks-port'
export const SETTING_API_INTERFACE = 'api-interface'
export const SETTING_API_PORT = 'api-port'

export const GENERAL_SETTING_KEYS: IGeneralSettingDef[] = [
    { name: SETTING_TUN_FD, desc: '', kind: 'other' },
    { name: SETTING_TUN, desc: '', kind: 'other' },
    { name: SETTING_LOGLEVEL, desc: '', kind: 'other' },
    { name: SETTING_LOGOUTPUT, desc: '', kind: 'other' },
    { name: SETTING_DNS_SERVER, desc: '', kind: 'other' },
    { name: SETTING_DNS_INTERFACE, desc: '', kind: 'interface' },
    { name: SETTING_ALWAYS_REAL_IP, desc: '', kind: 'other' },
    { name: SETTING_ALWAYS_FAKE_IP, desc: '', kind: 'other' },
    { name: SETTING_ROUTING_DOMAIN_RESOLVE, desc: '', kind: 'other' },
    { name: SETTING_HTTP_INTERFACE, desc: '', kind: 'interface' },
    { name: SETTING_INTERFACE, desc: '', kind: 'interface' },
    { name: SETTING_HTTP_PORT, desc: '', kind: 'port' },
    { name: SETTING_PORT, desc: '', kind: 'port' },
    { name: SETTING_SOCKS_INTERFACE, desc: '', kind: 'interface' },
    { name: SETTING_SOCKS_PORT, desc: '', kind: 'port' },
    { name: SETTING_API_INTERFACE, desc: '', kind: 'interface' },
    { name: SETTING_API_PORT, desc: '', kind: 'port' },
]
export const GENERAL_SETTINGS_KEYS_SET = new Set(GENERAL_SETTING_KEYS.map(k => k.name))

export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error']

export const SECTION_ENV = 'Env'
export const SECTION_GENERAL = 'General'
export const SECTION_PROXY = 'Proxy'
export const SECTION_PROXY_GROUP = 'Proxy Group'
export const SECTION_RULE = 'Rule'
export const SECTION_HOST = 'Host'
export const SECTION_ON_DEMAND = 'On Demand'
export const KNOWN_SECTION_NAMES = [
    SECTION_ENV,
    SECTION_GENERAL,
    SECTION_PROXY,
    SECTION_PROXY_GROUP,
    SECTION_RULE,
    SECTION_HOST,
    SECTION_ON_DEMAND,
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

export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error']
export const LOG_LEVELS_SET = new Set(LOG_LEVELS)

export interface IProxyProtocolDef {
    name: string,
    desc: string,
    snippet: string,
}

export const PROTOCOL_DIRECT = 'direct'
export const PROTOCOL_REJECT = 'reject'
export const PROTOCOL_REJECT_DROP = 'drop'
export const PROTOCOL_REDIRECT = 'redirect'
export const PROTOCOL_SOCKS = 'socks'
export const PROTOCOL_SHADOWSOCKS = 'shadowsocks'
export const PROTOCOL_SHADOWSOCKS_SS = 'ss'
export const PROTOCOL_TROJAN = 'trojan'
export const PROTOCOL_VMESS = 'vmess'

export const KNOWN_AEAD_CIPHERS = ['chacha20-poly1305', 'chacha20-ietf-poly1305', 'aes-256-gcm', 'aes-128-gcm']
export const KNOWN_AEAD_CIPHERS_SET = new Set(KNOWN_AEAD_CIPHERS)

export const PROXY_PROTOCOLS: IProxyProtocolDef[] = [
    { name: PROTOCOL_DIRECT, desc: '', snippet: 'direct' },
    { name: PROTOCOL_REJECT, desc: '', snippet: 'reject' },
    { name: PROTOCOL_REJECT_DROP, desc: '', snippet: 'drop' },
    { name: PROTOCOL_REDIRECT, desc: '', snippet: 'redirect, ${1:host}, ${2:port}' },
    { name: PROTOCOL_SOCKS, desc: '', snippet: 'socks, ${1:host}, ${2:port}' },
    { name: PROTOCOL_SHADOWSOCKS, desc: '', snippet: `shadowsocks, \${1:host}, \${2:port}, encrypt-method=\${3|${KNOWN_AEAD_CIPHERS.join(',')}|}, password=\${4:password}` },
    { name: PROTOCOL_SHADOWSOCKS_SS, desc: '', snippet: `ss, \${1:host}, \${2:port}, encrypt-method=\${3|${KNOWN_AEAD_CIPHERS.join(',')}|}, password=\${4:password}` },
    { name: PROTOCOL_TROJAN, desc: '', snippet: 'trojan, ${1:ip}, ${2:port}, password=${3:password}, sni=${4:hostname}' },
    { name: PROTOCOL_VMESS, desc: '', snippet: 'vmess, ${1:host}, ${2:port}, username=${3:username}' },
]

export const PROXY_PROTOCOLS_REQUIRING_HOST_SET = new Set([
    PROTOCOL_REDIRECT,
    PROTOCOL_SOCKS,
    PROTOCOL_SHADOWSOCKS,
    PROTOCOL_SHADOWSOCKS_SS,
    PROTOCOL_TROJAN,
    PROTOCOL_VMESS,
])

export const PROXY_PROPERTY_KEY_METHOD = 'encrypt-method'
export const PROXY_PROPERTY_KEY_USERNAME = 'username'
export const PROXY_PROPERTY_KEY_PASSWORD = 'password'
export const PROXY_PROPERTY_KEY_WS = 'ws'
export const PROXY_PROPERTY_KEY_WS_PATH = 'ws-path'
export const PROXY_PROPERTY_KEY_WS_HOST = 'ws-host'
export const PROXY_PROPERTY_KEY_TLS = 'tls'
export const PROXY_PROPERTY_KEY_TLS_CERT = 'tls-cert'
export const PROXY_PROPERTY_KEY_SNI = 'sni'
export const PROXY_PROPERTY_KEY_QUIC = 'quic'
export const PROXY_PROPERTY_KEY_AMUX = 'amux'
export const PROXY_PROPERTY_KEY_AMUX_MAX = 'amux-max'
export const PROXY_PROPERTY_KEY_AMUX_CON = 'amux-con'
export const PROXY_PROPERTY_KEY_INTERFACE = 'interface'

export interface IProxyPropertyKeyDef {
    required: Set<string>
    allowed: Set<string>
}

export const PROXY_PROTOCOL_PROPERTY_KEY_MAP: Record<string, IProxyPropertyKeyDef> = {
    [PROTOCOL_DIRECT]: { required: new Set(), allowed: new Set() },
    [PROTOCOL_REJECT]: { required: new Set(), allowed: new Set() },
    [PROTOCOL_REJECT_DROP]: { required: new Set(), allowed: new Set() },
    [PROTOCOL_REDIRECT]: { required: new Set(), allowed: new Set() },
    [PROTOCOL_SOCKS]: { required: new Set(), allowed: new Set() },
    [PROTOCOL_SHADOWSOCKS]: {
        required: new Set([
            PROXY_PROPERTY_KEY_METHOD,
            PROXY_PROPERTY_KEY_PASSWORD,
        ]),
        allowed: new Set(),
    },
    [PROTOCOL_SHADOWSOCKS_SS]: {
        required: new Set([
            PROXY_PROPERTY_KEY_METHOD,
            PROXY_PROPERTY_KEY_PASSWORD,
        ]),
        allowed: new Set(),
    },
    [PROTOCOL_TROJAN]: {
        required: new Set([PROXY_PROPERTY_KEY_PASSWORD]),
        allowed: new Set([
            PROXY_PROPERTY_KEY_METHOD,
            PROXY_PROPERTY_KEY_WS,
            PROXY_PROPERTY_KEY_WS_PATH,
            PROXY_PROPERTY_KEY_WS_HOST,
            PROXY_PROPERTY_KEY_TLS,
            PROXY_PROPERTY_KEY_TLS_CERT,
            PROXY_PROPERTY_KEY_SNI,
            PROXY_PROPERTY_KEY_QUIC,
            PROXY_PROPERTY_KEY_AMUX,
            PROXY_PROPERTY_KEY_AMUX_MAX,
            PROXY_PROPERTY_KEY_AMUX_CON,
        ])
    },
    [PROTOCOL_VMESS]: {
        required: new Set([PROXY_PROPERTY_KEY_USERNAME]),
        allowed: new Set([
            PROXY_PROPERTY_KEY_METHOD,
            PROXY_PROPERTY_KEY_WS,
            PROXY_PROPERTY_KEY_WS_PATH,
            PROXY_PROPERTY_KEY_WS_HOST,
            PROXY_PROPERTY_KEY_TLS,
            PROXY_PROPERTY_KEY_TLS_CERT,
            PROXY_PROPERTY_KEY_SNI,
            PROXY_PROPERTY_KEY_QUIC,
            PROXY_PROPERTY_KEY_AMUX,
            PROXY_PROPERTY_KEY_AMUX_MAX,
            PROXY_PROPERTY_KEY_AMUX_CON,
        ])
    },
}

export const GROUP_TYPE_CHAIN = 'chain'
export const GROUP_TYPE_TRYALL = 'tryall'
export const GROUP_TYPE_STATIC = 'static'
export const GROUP_TYPE_FAILOVER = 'failover'
export const GROUP_TYPE_FALLBACK = 'fallback'
export const GROUP_TYPE_FAILOVER_URL_TEST = 'url-test'
export const GROUP_TYPE_SELECT = 'select'

export const GROUP_TYPES: IProxyProtocolDef[] = [
    { name: GROUP_TYPE_CHAIN, desc: '', snippet: 'chain, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}' },
    { name: GROUP_TYPE_TRYALL, desc: '', snippet: 'tryall, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}' },
    { name: GROUP_TYPE_STATIC, desc: '', snippet: 'static, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}' },
    { name: GROUP_TYPE_FAILOVER, desc: '', snippet: 'failover, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}, health-check=${4|true,false|}, check-interval=${5:600}, fail-timeout=${6:5}, failover=${7|true,false|}' },
    { name: GROUP_TYPE_FALLBACK, desc: '', snippet: 'fallback, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}, check-interval=${4:600}, fail-timeout=${5:5}' },
    { name: GROUP_TYPE_FAILOVER_URL_TEST, desc: '', snippet: 'url-test, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}, check-interval=${4:600}, fail-timeout=${5:5}' },
    { name: GROUP_TYPE_SELECT, desc: '', snippet: 'select, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}' },
]

export const GROUP_PROPERTY_KEY_DELAY_BASE = 'delay-base'
export const GROUP_PROPERTY_KEY_METHOD = 'method'
export const GROUP_PROPERTY_KEY_FAIL_TIMEOUT = 'fail-timeout'
export const GROUP_PROPERTY_KEY_HEALTH_CHECK = 'health-check'
export const GROUP_PROPERTY_KEY_HEALTH_CHECK_TIMEOUT = 'health-check-timeout'
export const GROUP_PROPERTY_KEY_HEALTH_CHECK_DELAY = 'health-check-delay'
export const GROUP_PROPERTY_KEY_HEALTH_CHECK_ACTIVE = 'health-check-active'
export const GROUP_PROPERTY_KEY_CHECK_INTERVAL = 'check-interval'
export const GROUP_PROPERTY_KEY_FAILOVER = 'failover'
export const GROUP_PROPERTY_KEY_FALLBACK_CACHE = 'fallback-cache'
export const GROUP_PROPERTY_KEY_CACHE_SIZE = 'cache-size'
export const GROUP_PROPERTY_KEY_CACHE_TIMEOUT = 'cache-timeout'
export const GROUP_PROPERTY_KEY_LAST_RESORT = 'last-resort'

export const GROUP_METHOD_RANDOM = 'random'
export const GROUP_METHOD_RANDOM_ONCE = 'random-once'
export const GROUP_METHOD_ROUND_ROBIN = 'rr'

export const KNOWN_GROUP_METHODS = [GROUP_METHOD_RANDOM, GROUP_METHOD_RANDOM_ONCE, GROUP_METHOD_ROUND_ROBIN]
export const KNOWN_GROUP_METHODS_SET = new Set(KNOWN_GROUP_METHODS)

export const PROXY_GROUP_PROPERTY_KEY_MAP: Record<string, IProxyPropertyKeyDef> = {
    [GROUP_TYPE_CHAIN]: { required: new Set(), allowed: new Set() },
    [GROUP_TYPE_TRYALL]: { required: new Set(), allowed: new Set([GROUP_PROPERTY_KEY_DELAY_BASE]) },
    [GROUP_TYPE_STATIC]: { required: new Set(), allowed: new Set([GROUP_PROPERTY_KEY_METHOD]) },
    [GROUP_TYPE_FAILOVER]: {
        required: new Set(), allowed: new Set([
            GROUP_PROPERTY_KEY_FAIL_TIMEOUT,
            GROUP_PROPERTY_KEY_HEALTH_CHECK,
            GROUP_PROPERTY_KEY_HEALTH_CHECK_TIMEOUT,
            GROUP_PROPERTY_KEY_HEALTH_CHECK_DELAY,
            GROUP_PROPERTY_KEY_HEALTH_CHECK_ACTIVE,
            GROUP_PROPERTY_KEY_CHECK_INTERVAL,
            GROUP_PROPERTY_KEY_FAILOVER,
            GROUP_PROPERTY_KEY_FALLBACK_CACHE,
            GROUP_PROPERTY_KEY_CACHE_SIZE,
            GROUP_PROPERTY_KEY_CACHE_TIMEOUT,
            GROUP_PROPERTY_KEY_LAST_RESORT,
        ])
    },
    [GROUP_TYPE_FALLBACK]: {
        required: new Set(), allowed: new Set([
            GROUP_PROPERTY_KEY_FAIL_TIMEOUT,
            GROUP_PROPERTY_KEY_HEALTH_CHECK,
            GROUP_PROPERTY_KEY_HEALTH_CHECK_TIMEOUT,
            GROUP_PROPERTY_KEY_HEALTH_CHECK_DELAY,
            GROUP_PROPERTY_KEY_HEALTH_CHECK_ACTIVE,
            GROUP_PROPERTY_KEY_CHECK_INTERVAL,
            GROUP_PROPERTY_KEY_FAILOVER,
            GROUP_PROPERTY_KEY_FALLBACK_CACHE,
            GROUP_PROPERTY_KEY_CACHE_SIZE,
            GROUP_PROPERTY_KEY_CACHE_TIMEOUT,
            GROUP_PROPERTY_KEY_LAST_RESORT,
        ])
    },
    [GROUP_TYPE_FAILOVER_URL_TEST]: {
        required: new Set(), allowed: new Set([
            GROUP_PROPERTY_KEY_FAIL_TIMEOUT,
            GROUP_PROPERTY_KEY_HEALTH_CHECK,
            GROUP_PROPERTY_KEY_HEALTH_CHECK_TIMEOUT,
            GROUP_PROPERTY_KEY_HEALTH_CHECK_DELAY,
            GROUP_PROPERTY_KEY_HEALTH_CHECK_ACTIVE,
            GROUP_PROPERTY_KEY_CHECK_INTERVAL,
            GROUP_PROPERTY_KEY_FAILOVER,
            GROUP_PROPERTY_KEY_FALLBACK_CACHE,
            GROUP_PROPERTY_KEY_CACHE_SIZE,
            GROUP_PROPERTY_KEY_CACHE_TIMEOUT,
            GROUP_PROPERTY_KEY_LAST_RESORT,
        ])
    },
    [GROUP_TYPE_SELECT]: { required: new Set(), allowed: new Set() },
}

export interface IRuleTypeDef {
    name: string,
    desc: string,
}

export const RULE_TYPE_IP_CIDR = 'IP-CIDR'
export const RULE_TYPE_DOMAIN = 'DOMAIN'
export const RULE_TYPE_DOMAIN_SUFFIX = 'DOMAIN-SUFFIX'
export const RULE_TYPE_DOMAIN_KEYWORD = 'DOMAIN-KEYWORD'
export const RULE_TYPE_GEOIP = 'GEOIP'
export const RULE_TYPE_EXTERNAL = 'EXTERNAL'
export const RULE_TYPE_FINAL = 'FINAL'

export const RULE_TYPES: IRuleTypeDef[] = [
    { name: RULE_TYPE_IP_CIDR, desc: '' },
    { name: RULE_TYPE_DOMAIN, desc: '' },
    { name: RULE_TYPE_DOMAIN_SUFFIX, desc: '' },
    { name: RULE_TYPE_DOMAIN_KEYWORD, desc: '' },
    { name: RULE_TYPE_GEOIP, desc: '' },
    { name: RULE_TYPE_EXTERNAL, desc: '' },
    { name: RULE_TYPE_FINAL, desc: '' },
]

export const RULE_EXTERNAL_SOURCE_MMDB = 'mmdb'
export const RULE_EXTERNAL_SOURCE_SITE = 'site'

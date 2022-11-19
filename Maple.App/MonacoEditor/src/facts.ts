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

export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error']
export const LOG_LEVELS_SET = new Set(LOG_LEVELS)

export const GENERAL_SETTING_KEYS: IGeneralSettingDef[] = [
    { name: SETTING_TUN_FD, desc: 'Specify the file discriptor number for TUN interface.\n\nThis option is automatically injected during VPN initialization and not intended to be set manually.', kind: 'other' },
    { name: SETTING_TUN, desc: 'Enable TUN inbound. Values can be either `auto` or a comma separated list of `name`, `address`, `netmask`, `gateway` and `mtu`.', kind: 'other' },
    { name: SETTING_LOGLEVEL, desc: 'Logging level. Values can be `' + LOG_LEVELS.join('`, `') + '`.\n\nDefaults to `INFO`.', kind: 'other' },
    { name: SETTING_LOGOUTPUT, desc: 'Path to the log file.\n\nSet to `console` to print logs to the terminal.', kind: 'other' },
    { name: SETTING_DNS_SERVER, desc: 'A comma separated list of DNS servers.', kind: 'other' },
    { name: SETTING_DNS_INTERFACE, desc: 'Specify on which interface DNS requests will be routed.', kind: 'interface' },
    { name: SETTING_ALWAYS_REAL_IP, desc: 'A comma separated list of domain name keywords that will always be resolved to real IP addresses.\n\nThis option conflicts with `' + SETTING_ALWAYS_FAKE_IP + '`', kind: 'other' },
    { name: SETTING_ALWAYS_FAKE_IP, desc: 'A comma separated list of domain name keywords that will always be resolved to fake IP addresses.\n\nThis option conflicts with `' + SETTING_ALWAYS_REAL_IP + '`', kind: 'other' },
    { name: SETTING_ROUTING_DOMAIN_RESOLVE, desc: 'Specify whether Leaf should resolve IP addresses for routing.\n\nFor `GEOIP` and `IP-CIDR` rules to match domain name requests, this should be enabled.\n\nDefaults to `false`.', kind: 'other' },
    { name: SETTING_HTTP_INTERFACE, desc: `Specify on which interface HTTP inbound will be listening on.\n\nSet \`${SETTING_HTTP_PORT}\` or \`${SETTING_PORT}\` to enable HTTP inbound.`, kind: 'interface' },
    { name: SETTING_INTERFACE, desc: `Specify on which interface HTTP inbound will be listening on.\n\nSet \`${SETTING_HTTP_PORT}\` or \`${SETTING_PORT}\` to enable HTTP inbound.\n\nAlias for \`${SETTING_HTTP_INTERFACE}\`.`, kind: 'interface' },
    { name: SETTING_HTTP_PORT, desc: `Specify on which port HTTP inbound will be listening on.\n\nSet \`${SETTING_HTTP_INTERFACE}\` or \`${SETTING_INTERFACE}\` to enable HTTP inbound.`, kind: 'port' },
    { name: SETTING_PORT, desc: `Specify on which port HTTP inbound will be listening on.\n\nSet \`${SETTING_HTTP_INTERFACE}\` or \`${SETTING_INTERFACE}\` to enable HTTP inbound.\n\nAlias for \`${SETTING_HTTP_PORT}\`.`, kind: 'port' },
    { name: SETTING_SOCKS_INTERFACE, desc: 'Specify on which interface SOCKS5 inbound will be listening on.', kind: 'interface' },
    { name: SETTING_SOCKS_PORT, desc: 'Specify on which port SOCKS5 inbound will be listening on.', kind: 'port' },
    { name: SETTING_API_INTERFACE, desc: 'Specify on which interface Leaf control API will be listening on.', kind: 'interface' },
    { name: SETTING_API_PORT, desc: 'Specify on which port Leaf control API will be listening on.', kind: 'port' },
]
export const GENERAL_SETTING_KEYS_MAP = new Map(GENERAL_SETTING_KEYS.map(s => [s.name, s]))

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
    { name: PROTOCOL_DIRECT, desc: 'Forward requests directly without going through any proxies.', snippet: 'direct' },
    { name: PROTOCOL_REJECT, desc: 'Close connections immediately.', snippet: 'reject' },
    { name: PROTOCOL_REJECT_DROP, desc: 'Close connections immediately. Alias for `' + PROTOCOL_REJECT + '`.', snippet: 'drop' },
    { name: PROTOCOL_REDIRECT, desc: 'Rewrite connection destinations to a pre-defined address.', snippet: 'redirect, ${1:host}, ${2:port}' },
    { name: PROTOCOL_SOCKS, desc: 'A SOCKS5 proxy.', snippet: 'socks, ${1:host}, ${2:port}' },
    { name: PROTOCOL_SHADOWSOCKS, desc: 'A Shadowsocks proxy.', snippet: `shadowsocks, \${1:host}, \${2:port}, encrypt-method=\${3|${KNOWN_AEAD_CIPHERS.join(',')}|}, password=\${4:password}` },
    { name: PROTOCOL_SHADOWSOCKS_SS, desc: 'A Shadowsocks proxy. Alias for `' + PROTOCOL_SHADOWSOCKS + '`.', snippet: `ss, \${1:host}, \${2:port}, encrypt-method=\${3|${KNOWN_AEAD_CIPHERS.join(',')}|}, password=\${4:password}` },
    { name: PROTOCOL_TROJAN, desc: 'A Trojan proxy.\n\nCompatible with Trojan-GFW and Trojan-Go with `ws` enabled.', snippet: 'trojan, ${1:ip}, ${2:port}, password=${3:password}, sni=${4:hostname}' },
    { name: PROTOCOL_VMESS, desc: 'A VMess proxy with optional WebSocket and TLS transports.', snippet: 'vmess, ${1:host}, ${2:port}, username=${3:username}' },
]
export const PROXY_PROTOCOLS_MAP: Map<string, IProxyProtocolDef> = new Map(PROXY_PROTOCOLS.map(p => [p.name, p]))

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

export const PROXY_PROPERTY_KEYS_DESC_MAP = new Map([
    [PROXY_PROPERTY_KEY_METHOD, `Encryption method for Shadowsocks and VMess. Possible values are \`${KNOWN_AEAD_CIPHERS.join('`, `')}\`.\n\nDefaults to \`chacha20-ietf-poly1305\`.`],
    [PROXY_PROPERTY_KEY_USERNAME, 'User name for VMess.'],
    [PROXY_PROPERTY_KEY_PASSWORD, 'Password of the proxy server.'],
    [PROXY_PROPERTY_KEY_WS, 'Specify whether WebSocket transport should be enabled.\n\nDefaults to \`false\`.'],
    [PROXY_PROPERTY_KEY_WS_PATH, 'Path for WebSocket transport.'],
    [PROXY_PROPERTY_KEY_WS_HOST, 'Host for WebSocket transport.'],
    [PROXY_PROPERTY_KEY_TLS, 'Specify whether TLS transport should be enabled.\n\nDefaults to \`false\`.'],
    [PROXY_PROPERTY_KEY_TLS_CERT, 'Certificate file for TLS transport.'],
    [PROXY_PROPERTY_KEY_SNI, 'Server name (SNI), or host name for TLS transport.\n\nIf omitted, the host name of the proxy server will be used.'],
    [PROXY_PROPERTY_KEY_QUIC, 'Specify whether QUIC transport should be enabled.\n\nDefaults to \`false\`.'],
    [PROXY_PROPERTY_KEY_AMUX, 'Specify whether AMUX transport should be enabled.\n\nDefaults to \`false\`.'],
    [PROXY_PROPERTY_KEY_AMUX_MAX, 'Maximum number of streams per AMUX session.\n\nDefaults to \`8\`.'],
    [PROXY_PROPERTY_KEY_AMUX_CON, 'Maximum number of concurrent connections per AMUX session.\n\nDefaults to \`2\`.'],
    [PROXY_PROPERTY_KEY_INTERFACE, 'Specify the interface proxy requests should bind to.'],
])

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

export interface IProxyGroupDef {
    name: string,
    desc: string,
    snippet: string,
}

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
const GROUP_METHOD_RANDOM_DESC = 'Randomly choose an actor for each request.'
const GROUP_METHOD_RANDOM_ONCE_DESC = 'Randomly choose an actor when Leaf starts.'
const GROUP_METHOD_ROUND_ROBIN_DESC = 'Round robin.'
export const GROUP_METHOD_DESC_MAP: Map<string, string> = new Map([
    [GROUP_METHOD_RANDOM, GROUP_METHOD_RANDOM_DESC],
    [GROUP_METHOD_RANDOM_ONCE, GROUP_METHOD_RANDOM_ONCE_DESC],
    [GROUP_METHOD_ROUND_ROBIN, GROUP_METHOD_ROUND_ROBIN_DESC],
])

export const KNOWN_GROUP_METHODS = [GROUP_METHOD_RANDOM, GROUP_METHOD_RANDOM_ONCE, GROUP_METHOD_ROUND_ROBIN]
export const KNOWN_GROUP_METHODS_SET = new Set(KNOWN_GROUP_METHODS)

export const GROUP_PROPERTY_KEYS_DESC_MAP = new Map([
    [GROUP_PROPERTY_KEY_DELAY_BASE, 'Specify the interval (in **milliseconds**) before starting the next connection attempt when all previous attemps are pending.\n\nDefaults to \`0\`.'],
    [GROUP_PROPERTY_KEY_METHOD, `Selection method.\n\n\`${GROUP_METHOD_RANDOM}\`: ${GROUP_METHOD_RANDOM_DESC}\n\n\`${GROUP_METHOD_RANDOM_ONCE}\`: ${GROUP_METHOD_RANDOM_ONCE_DESC}\n\n\`${GROUP_METHOD_ROUND_ROBIN}\`: ${GROUP_METHOD_ROUND_ROBIN_DESC}\n\n\nDefaults to \`${GROUP_METHOD_RANDOM}\`.`],
    [GROUP_PROPERTY_KEY_FAIL_TIMEOUT, 'Timeout (in **seconds**) for an actor to establish a connection, including TCP handshake and TLS handshake and protocol-specific initialization.\n\nDefaults to \`4\`.'],
    [GROUP_PROPERTY_KEY_HEALTH_CHECK, 'Specify whether a health check should be performed periodically to measure latencies of the actors.\n\nDefaults to \`true\`.'],
    [GROUP_PROPERTY_KEY_HEALTH_CHECK_TIMEOUT, 'Timeout (in **seconds**) for an actor to establish a connection during a health check, including TCP handshake and TLS handshake and protocol-specific initialization.\n\nDefaults to \`4\`.'],
    [GROUP_PROPERTY_KEY_HEALTH_CHECK_DELAY, 'Upper limit of random delay (in **milliseconds**) before starting a health check.\n\nDefaults to \`200\`.'],
    [GROUP_PROPERTY_KEY_HEALTH_CHECK_ACTIVE, 'Specify the interval (in **seconds**) where health checks are skipped if there is no new connections.\n\nDefaults to \`900\`.'],
    [GROUP_PROPERTY_KEY_CHECK_INTERVAL, 'Specify the interval (in **seconds**) between health checks.\n\nDefaults to \`300\`.'],
    [GROUP_PROPERTY_KEY_FAILOVER, `Specify whether to switch to the next actor when the current actor fails.\n\nDefaults to \`false\` for \`${GROUP_TYPE_FAILOVER_URL_TEST}\`, otherwise \`true\`.`],
    [GROUP_PROPERTY_KEY_FALLBACK_CACHE, 'Specify whether previous succeeded actors should be cached for future connections.\n\nDefaults to \`false\`.'],
    [GROUP_PROPERTY_KEY_CACHE_SIZE, 'Maximum number of actors to cache.\n\nDefaults to \`256\`.'],
    [GROUP_PROPERTY_KEY_CACHE_TIMEOUT, 'Cache timeout in **minutes**.\n\nDefaults to \`60\`.'],
    [GROUP_PROPERTY_KEY_LAST_RESORT, 'Specify the actor to use when all actors in the list fail.'],
])

export const GROUP_TYPES: IProxyGroupDef[] = [
    { name: GROUP_TYPE_CHAIN, desc: 'Chaining proxies.', snippet: 'chain, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}' },
    { name: GROUP_TYPE_TRYALL, desc: 'Concurrently initiate connection attempts to all proxies in order with an optional delay.', snippet: 'tryall, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}' },
    { name: GROUP_TYPE_STATIC, desc: 'Select a proxy from the list by random or round robin.', snippet: 'static, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}' },
    { name: GROUP_TYPE_FAILOVER, desc: 'Try all proxies one-by-one until success. Periodic health checks are performed in background to monitor the status of the proxies.', snippet: 'failover, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}, health-check=${4|true,false|}, check-interval=${5:600}, fail-timeout=${6:5}, failover=${7|true,false|}' },
    { name: GROUP_TYPE_FALLBACK, desc: 'Try all proxies one-by-one until success. Periodic health checks are performed in background to monitor the status of the proxies.\n\nAlias for `' + GROUP_TYPE_FAILOVER + '`.', snippet: 'fallback, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}, check-interval=${4:600}, fail-timeout=${5:5}' },
    { name: GROUP_TYPE_FAILOVER_URL_TEST, desc: 'Select the best proxy from periodic health checks.\n\nEquivalent to `' + GROUP_TYPE_FAILOVER + '` with `' + GROUP_PROPERTY_KEY_FAILOVER + '`=`false`.', snippet: 'url-test, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}, check-interval=${4:600}, fail-timeout=${5:5}' },
    { name: GROUP_TYPE_SELECT, desc: 'Select a proxy through Leaf control API.', snippet: 'select, ${1:proxy1}, ${2:proxy2}, ${3:proxy3}' },
]
export const GROUP_TYPES_MAP: Map<string, IProxyGroupDef> = new Map(GROUP_TYPES.map(g => [g.name, g]))

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
    snippet: string,
}

export const RULE_TYPE_IP_CIDR = 'IP-CIDR'
export const RULE_TYPE_DOMAIN = 'DOMAIN'
export const RULE_TYPE_DOMAIN_SUFFIX = 'DOMAIN-SUFFIX'
export const RULE_TYPE_DOMAIN_KEYWORD = 'DOMAIN-KEYWORD'
export const RULE_TYPE_GEOIP = 'GEOIP'
export const RULE_TYPE_EXTERNAL = 'EXTERNAL'
export const RULE_TYPE_PORT_RANGE = 'PORT-RANGE'
export const RULE_TYPE_NETWORK = 'NETWORK'
export const RULE_TYPE_INBOUND_TAG = 'INBOUND-TAG'
export const RULE_TYPE_FINAL = 'FINAL'

export const RULE_TYPES: IRuleTypeDef[] = [
    { name: RULE_TYPE_IP_CIDR, desc: 'Match connections with destination IP addresses within the specified IP CIDR range.\n\nTo match domain name requests, enable `' + SETTING_ROUTING_DOMAIN_RESOLVE + '` in General section.', snippet: 'IP-CIDR, ${1:8.8.8.8/24}, ${2:proxy}' },
    { name: RULE_TYPE_DOMAIN, desc: 'Match connections with destination domain names identical to the specified value.', snippet: 'DOMAIN, ${1:www.google.com}, ${2:proxy}' },
    { name: RULE_TYPE_DOMAIN_SUFFIX, desc: 'Match connections with destination domain names that end with the specified string.', snippet: 'DOMAIN-SUFFIX, ${1:example.com}, ${2:proxy}' },
    { name: RULE_TYPE_DOMAIN_KEYWORD, desc: 'Match connections with destination domain names that contain the specified keyword.', snippet: 'DOMAIN-KEYWORD, ${1:keyword}, ${2:proxy}' },
    { name: RULE_TYPE_GEOIP, desc: 'Match connections with destination IP addresses located within the specified country.\n\nMake sure a valid GeoIP database file `geo.mmdb` exists in the configuration folder.\n\nTo match domain name requests, enable `' + SETTING_ROUTING_DOMAIN_RESOLVE + '` in General section.', snippet: 'GEOIP, ${1:us}, ${2:proxy}' },
    { name: RULE_TYPE_EXTERNAL, desc: 'Match connections using an external GeoIP or V2Ray geosite database file.\n\nV2Ray geosite: `site:<file>:<group>` or `site:<group>` with database file defaults to "site.dat".\n\nGeoIP: `mmdb:<file>:<country code>` or `mmdb:<country code>` with GeoIP database file defaults to `geo.mmdb`.', snippet: 'EXTERNAL, ${1|site:geolocation-cn,site:geosite.dat:category-ads-all,mmdb:cn,mmdb:geo.mmdb:cn|}, ${2:proxy}' },
    { name: RULE_TYPE_PORT_RANGE, desc: 'Match connections with destination ports within the range.\n\nThe port range is specified by a lower bound and a upper bound, separated by a dash ("`").', snippet: 'PORT-RANGE, ${1:8000-9000}, ${2:proxy}' },
    { name: RULE_TYPE_NETWORK, desc: 'Match TCP or UDP requests.', snippet: 'NETWORK, ${1|TCP,UDP|}, ${2:proxy}' },
    { name: RULE_TYPE_INBOUND_TAG, desc: 'Match connections with the specified inbound tag.', snippet: 'INBOUND-TAG, ${1:inbound-tag}, ${2:proxy}' },
    { name: RULE_TYPE_FINAL, desc: 'If none of the other rules match a connection, the proxy or proxy group specified in this rule will be used.', snippet: 'FINAL, ${1:proxy}' },
]
export const RULE_TYPES_MAP: Map<string, IRuleTypeDef> = new Map(RULE_TYPES.map(r => [r.name, r]))

export const RULE_NETWORK_TCP = 'TCP'
export const RULE_NETWORK_UDP = 'UDP'

export const RULE_EXTERNAL_SOURCE_MMDB = 'mmdb'
export const RULE_EXTERNAL_SOURCE_SITE = 'site'
export const RULE_EXTERNAL_SOURCE_DESC_MAP: Map<string, string> = new Map([
    [RULE_EXTERNAL_SOURCE_MMDB, 'GeoIP database (.mmdb)'],
    [RULE_EXTERNAL_SOURCE_SITE, 'V2Ray geosite domain name list database (.dat)'],
])

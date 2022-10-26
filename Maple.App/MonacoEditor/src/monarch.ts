import { languages } from 'monaco-editor'

export const monarchTokenProvider: languages.IMonarchLanguage = {
    defaultToken: 'invalid',
    tokenPostfix: '.ini',
    includeLF: true,

    typeKeywords: ['loglevel', 'tun', 'tun-fd', 'dns-server', 'dns-interface', 'always-real-ip', 'always-fake-ip', 'routing-domain-resolve', 'http-interface', 'interface', 'http-port', 'port', 'socks-interface', 'socks-port', 'api-interface', 'api-port', 'logoutput', 'auto', 'console',
        'error', 'info', 'warn', 'trace', 'debug',
        'true', 'false'],

    // The main tokenizer for our languages
    tokenizer: {
        root: [
            // whitespace
            { include: '@whitespace' },

            [/\n/, ''],

            // section
            [/\[[^\]#\n]+]/, { token: 'metatag', next: '@afterSection' }],

            // before =
            [/([\w-.:]+)(\s*)(=)/, [
                {
                    cases: {
                        '@typeKeywords': 'keyword',
                        '.*[\\\\\\./].*': 'string',
                        '@default': 'key',
                    }
                },
                '',
                { token: 'delimiter', next: '@paramGroup' }
            ]],

            // rules
            [/(?=.)/, { token: '', next: '@paramGroup' }],
        ],

        afterSection: [
            { include: '@whitespace' },
            [/\n/, 'metatag', '@pop'],
        ],

        paramGroup: [
            { include: '@whitespace' },
            [/\n/, '', '@pop'],
            [/[\d:\/\.]+(?=[ \t,\n])/, 'number'],
            [/([^\n#,]+)([ \t]*)(?=,|\n|#)/, [{
                cases: {
                    '@typeKeywords': 'keyword',
                    '.*[\\\\\\./].*': 'string',
                    '@default': 'type',
                }
            }, '']],
            [/,/, { token: 'delimiter', switchTo: 'paramGroupRem' }]
        ],

        paramGroupRem: [
            // site:category-ads-all
            ['(site|mmdb)(:)([^#:,]+)(:?)([^#,\n]*)', ['keyword', 'delimiter', 'string', 'delimiter', 'string']],
            // health-check=true
            [/([^#=,]+)([ \t]*)(=)/, ['keyword', '', {
                token: 'delimiter',
                switchTo: '@paramValue',
            }]],
            { include: '@paramValue' },
        ],

        paramValue: [
            { include: '@whitespace' },
            [/(?=\n)/, '', '@pop'],
            [/,/, { token: 'delimiter', switchTo: 'paramGroupRem' }],
            [/[\d:\/\.]+(?=[ \t,\n])/, 'number'],
            [/([^\n#,]+)([ \t]*)(?=,|\n|#)/, [{
                cases: {
                    '@typeKeywords': 'keyword',
                    '.*[\\\\\\./-].*': 'string',
                    '@default': 'key',
                }
            }, '']],
        ],

        comment: [
            [/(?=\n)/, '', '@pop'],
            [/./, 'comment'],
        ],

        whitespace: [
            [/[ \t\r]+/, ''],
            [/#/, 'comment', '@comment'],
        ],
    }
}

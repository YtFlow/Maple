import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js'
import { monarchTokenProvider } from './monarch'
import { foldingRangeProvider } from './folding'
import { completionProvider } from './completion'
import { validateModel } from './validate'
import { definitionProvider } from './definition'
import { referenceProvider, renameProvider } from './reference'
import { hoverProvider } from './hover'

declare global {
    interface Window {
        pendingLoadFile: string | undefined
        mapleHostApi: {
            loadFile: (path: string) => void
            triggerSave: () => void
        }
        MonacoEnvironment?: monaco.Environment | undefined,
        chrome: {
            webview: {
                postMessage: typeof postMessage
            }
        }
    }
}

function webviewInitPrelude() {
    window.pendingLoadFile = undefined;
    window.mapleHostApi = {
        loadFile(url) {
            console.log('pending loader triggered')
            window.pendingLoadFile = url
        },
        triggerSave() { }
    }
    console.log('pending loader injected')
}

function initLang() {
    self.MonacoEnvironment = {
        getWorkerUrl: function (moduleId, label) {
            if (label === 'json') {
                return '/MonacoEditor/json.worker.js'
            }
            return '/MonacoEditor/editor.worker.js'
        }
    };

    document.getElementById('loading')!.style.display = 'none'
    monaco.languages.register({ id: 'leafConf' })
    monaco.languages.setMonarchTokensProvider('leafConf', monarchTokenProvider)
    monaco.languages.registerCompletionItemProvider('leafConf', completionProvider)
    monaco.languages.registerFoldingRangeProvider('leafConf', foldingRangeProvider)
    monaco.languages.registerDefinitionProvider('leafConf', definitionProvider)
    monaco.languages.registerReferenceProvider('leafConf', referenceProvider)
    monaco.languages.registerRenameProvider('leafConf', renameProvider)
    monaco.languages.registerHoverProvider('leafConf', hoverProvider)

    const editor = monaco.editor.create(document.getElementById('container')!, {
        wordBasedSuggestions: false,
    })
    const editorStates = new Map()

    window.addEventListener('resize', _ => {
        window.requestAnimationFrame(() => {
            editor.layout()
        })
    })

    let currentFile = ''
    async function loadFile(url) {
        triggerSave()
        if (currentFile) {
            editorStates.set(currentFile, editor.saveViewState())
        }

        // FIXME: destroy previous model?
        const parsedUri = monaco.Uri.parse(url)
        let maybeModel = monaco.editor.getModel(parsedUri)
        do {
            if (maybeModel) {
                editor.setModel(maybeModel)
                editor.restoreViewState(editorStates.get(url))
            } else {
                const res = await fetch(url)
                const text = await res.text()
                // Race condition
                maybeModel = monaco.editor.getModel(parsedUri)
                if (maybeModel) {
                    continue
                }

                let model: monaco.editor.ITextModel
                if (url.endsWith('.json')) {
                    model = monaco.editor.createModel(text, 'json', parsedUri)
                } else {
                    model = monaco.editor.createModel(text, 'leafConf', parsedUri)
                }
                editor.setModel(model)
                validateModel(model)
                model.onDidChangeContent(() => validateModel(model))
                console.log('loaded url: ' + url)
            }
        } while (false)
        currentFile = url
    }
    function triggerSave() {
        if (!currentFile) {
            return
        }
        const text = editor.getValue()

        window.chrome.webview.postMessage({
            cmd: 'save',
            path: currentFile,
            text,
        })
    }
    window.mapleHostApi.loadFile = loadFile
    window.mapleHostApi.triggerSave = triggerSave

    if (window.pendingLoadFile) {
        loadFile(window.pendingLoadFile)
    }
    window.addEventListener('focusout', () => {
        triggerSave()
    })

    editor.addAction({
        id: 'save-action',
        label: 'Save Current File',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => void triggerSave(),
    })
}

webviewInitPrelude()
initLang()

import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js'
import { monarchTokenProvider } from './monarch'
import { foldingRangeProvider } from './folding'
import { completionProvider } from './completion'
import { validateModel } from './validate'
import { definitionProvider } from './definition'
import { referenceProvider, renameProvider } from './reference'
import { hoverProvider } from './hover'
import { reportEditorReady, saveFile } from './rpc'
import { Mutex } from './mutex'
import { documentSymbolProvider } from './symbol'

declare global {
    interface Window {
        mapleHostApi: {
            loadFile: (url: string) => void
            requestSaveCurrent: () => void
        }
        MonacoEnvironment?: monaco.Environment | undefined,
        chrome: {
            webview: {
                postMessage: typeof postMessage
            }
        }
    }
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

    const leafConfLangId = 'leafConf'
    monaco.languages.register({ id: leafConfLangId })
    monaco.languages.setMonarchTokensProvider(leafConfLangId, monarchTokenProvider)
    monaco.languages.registerCompletionItemProvider(leafConfLangId, completionProvider)
    monaco.languages.registerFoldingRangeProvider(leafConfLangId, foldingRangeProvider)
    monaco.languages.registerDefinitionProvider(leafConfLangId, definitionProvider)
    monaco.languages.registerReferenceProvider(leafConfLangId, referenceProvider)
    monaco.languages.registerRenameProvider(leafConfLangId, renameProvider)
    monaco.languages.registerHoverProvider(leafConfLangId, hoverProvider)
    monaco.languages.registerDocumentSymbolProvider(leafConfLangId, documentSymbolProvider)

    const editor = monaco.editor.create(document.getElementById('container')!, {
        wordBasedSuggestions: false,
    })
    const editorStates: Map<string, monaco.editor.ICodeEditorViewState> = new Map()

    window.addEventListener('resize', _ => {
        window.requestAnimationFrame(() => {
            editor.layout()
        })
    })

    let currentFileLock = new Mutex('')
    async function loadFile(url: string) {
        requestSaveCurrent()
        await currentFileLock.withLock((currentFile, setCurrentFile) => {
            return loadFileInner(url, currentFile, setCurrentFile)
        })
    }
    async function loadFileInner(url: string, currentFile: string, setCurrentFile: (f: string) => void) {
        if (currentFile) {
            const state = editor.saveViewState()
            if (state) {
                editorStates.set(currentFile, state)
            }
        }

        // FIXME: destroy previous model?
        const parsedUri = monaco.Uri.parse(url)
        let maybeModel = monaco.editor.getModel(parsedUri)
        if (maybeModel) {
            editor.setModel(maybeModel)
            const state = editorStates.get(url)
            if (state) {
                editor.restoreViewState(state)
            }
        } else {
            const res = await fetch(url)
            const text = await res.text()

            let model: monaco.editor.ITextModel
            if (url.endsWith('.json')) {
                model = monaco.editor.createModel(text, 'json', parsedUri)
            } else {
                model = monaco.editor.createModel(text, 'leafConf', parsedUri)
                validateModel(model)
                model.onDidChangeContent(() => validateModel(model))
            }
            editor.setModel(model)
            console.log('loaded url: ' + url)
        }
        setCurrentFile(url)
    }
    function getCurrent(): Promise<{ url: string, text: string } | undefined> {
        return currentFileLock.withLock((currentFile, _) => {
            if (!currentFile) {
                return
            }
            const text = editor.getValue()
            return { url: currentFile, text }
        })
    }
    async function requestSaveCurrent() {
        const current = await getCurrent()
        if (current === undefined) {
            return
        }
        saveFile(current.url, current.text)
    }
    window.mapleHostApi = { loadFile, requestSaveCurrent }

    window.addEventListener('focusout', () => {
        requestSaveCurrent()
    })

    editor.addAction({
        id: 'save-action',
        label: 'Save Current File',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => requestSaveCurrent(),
    })
}

initLang()
reportEditorReady()

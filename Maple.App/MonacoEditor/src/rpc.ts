export function reportEditorReady() {
    window.chrome.webview.postMessage({
        cmd: 'editorReady',
    })
}

export function saveFile(url: string, text: string) {
    window.chrome.webview.postMessage({
        cmd: 'save',
        path: url,
        text,
    })
}

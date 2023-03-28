#include "pch.h"
#include "MonacoEditPage.h"
#if __has_include("MonacoEditPage.g.cpp")
#include "MonacoEditPage.g.cpp"
#endif

#include <winrt/Windows.Storage.Streams.h>
#include <winrt/Microsoft.Web.WebView2.Core.h>
#include <nlohmann/json.hpp>

#include "UI.h"
#include "ConfigUtil.h"

using namespace winrt;
using namespace Windows::Storage;
using namespace Windows::Storage::Streams;
using namespace Windows::UI::Xaml;
using namespace Microsoft::Web::WebView2::Core;

namespace winrt::Maple_App::implementation
{
    MonacoEditPage::MonacoEditPage()
    {
        InitializeComponent();
    }

    fire_and_forget MonacoEditPage::Page_Loaded(IInspectable const&, RoutedEventArgs const&)
    {
        try {
            auto const lifetime{ get_strong() };
            co_await initializeWebView();
        }
        catch (...)
        {
            UI::NotifyException(L"Initializing WebView");
        }
    }
    IAsyncAction MonacoEditPage::initializeWebView() {
        auto const lifetime{ get_strong() };
        auto const webview = WebView();
        if (m_webviewState != MonacoEditPageWebViewState::Uninitialized)
        {
            co_return;
        }
        m_webviewState = MonacoEditPageWebViewState::AwaitingEditorReady;
        co_await webview.EnsureCoreWebView2Async();
        if (!m_webviewResourceRequestedEventHandle)
        {
            webview.CoreWebView2().AddWebResourceRequestedFilter(
                hstring(CONFIG_ROOT_VIRTUAL_HOSTW) + L"*",
                CoreWebView2WebResourceContext::Fetch
            );
            webview.CoreWebView2().AddWebResourceRequestedFilter(
                hstring(CONFIG_ROOT_VIRTUAL_HOSTW) + L"*",
                CoreWebView2WebResourceContext::XmlHttpRequest
            );
            webview.CoreWebView2().AddWebResourceRequestedFilter(
                hstring(CONFIG_ROOT_VIRTUAL_HOSTW) + L"*",
                CoreWebView2WebResourceContext::Document
            );
            m_webviewResourceRequestedEventHandle = webview.CoreWebView2().WebResourceRequested(
                [weak = weak_ref(lifetime)](auto const webview, CoreWebView2WebResourceRequestedEventArgs const e) -> fire_and_forget
                {
                    auto const deferral = e.GetDeferral();
                    try {
                        if (auto const self{ weak.get() }) {
                            auto const configDir = co_await ConfigUtil::GetConfigFolder();
                            if (configDir.Path() != self->m_lastConfigFolderPath)
                            {
                                co_return;
                            }
                            auto path = to_string(Uri::UnescapeComponent(e.Request().Uri()));
                            if (auto const pos{ path.find(CONFIG_ROOT_VIRTUAL_HOST) }; pos != std::string::npos)
                            {
                                path = path.replace(pos, strlen(CONFIG_ROOT_VIRTUAL_HOST), "");
                            }

                            auto const file = co_await configDir.GetFileAsync(to_hstring(path));
                            auto const fstream = co_await file.OpenReadAsync();
                            e.Response(webview.Environment().CreateWebResourceResponse(
                                std::move(fstream),
                                200,
                                L"OK",
                                hstring(L"Content-Length: ") + to_hstring(fstream.Size()) + L"\nContent-Type: text/plain\nAccess-Control-Allow-Origin: http://maple-monaco-editor-app-root.com"
                            ));
                        }
                    }
                    catch (...)
                    {
                        UI::NotifyException(L"Handling web requests");
                    }
                    deferral.Complete();
                });
        }
        webview.CoreWebView2().SetVirtualHostNameToFolderMapping(
            L"maple-monaco-editor-app-root.com",
            packagePath,
            CoreWebView2HostResourceAccessKind::DenyCors
        );
        webview.Source(Uri{ WEBVIEW_EDITOR_URL });
    }

    fire_and_forget MonacoEditPage::OnNavigatedTo(NavigationEventArgs const& e) {
        try {
            auto const lifetime{ get_strong() };
            auto const param = e.Parameter().as<Maple_App::ConfigViewModel>();
            hstring fileName;
            try
            {
                fileName = param.File().Name();
            }
            catch (...) {}
            if (fileName.empty())
            {
                co_return;
            }
            auto const parent = co_await param.File().GetParentAsync();
            if (!parent)
            {
                UI::NotifyUser("Failed to load config folder.", L"Error: loading file");
                co_return;
            }
            auto const parentPath = parent.Path();
            if (parentPath != m_lastConfigFolderPath)
            {
                m_lastConfigFolderPath = parentPath;
                m_webviewState = MonacoEditPageWebViewState::Uninitialized;
            }
            m_currentFileName = fileName;
            switch (m_webviewState)
            {
            case MonacoEditPageWebViewState::Uninitialized:
                co_await initializeWebView();
                co_await lifetime->WebView().ExecuteScriptAsync(L"window.mapleHostApi.resetFiles()");
                break;
            case MonacoEditPageWebViewState::AwaitingEditorReady:
                break;
            case MonacoEditPageWebViewState::EditorReady:
                co_await lifetime->WebView().ExecuteScriptAsync(hstring{ L"window.mapleHostApi.loadFile(`http://maple-monaco-editor-config-root.com/" } +
                    fileName +
                    L"`)");
                break;
            }
        }
        catch (...)
        {
            UI::NotifyException(L"Loading WebView page");
        }
    }

    fire_and_forget MonacoEditPage::WebView_WebMessageReceived(
        MUXC::WebView2 const& sender,
        CoreWebView2WebMessageReceivedEventArgs const& args
    )
    {
        try {
            auto const lifetime{ get_strong() };

            auto const source = args.Source();
            if (source != WEBVIEW_EDITOR_URL)
            {
                co_return;
            }

            nlohmann::json doc;
            bool hasError{};
            try {
                doc = nlohmann::json::parse(to_string(args.WebMessageAsJson()));
            }
            catch (...)
            {
                hasError = true;
            }
            if (hasError)
            {
                co_return;
            }

            std::string const& cmd = doc["cmd"];
            if (cmd == "editorReady")
            {
                m_webviewState = MonacoEditPageWebViewState::EditorReady;
                co_await WebView().ExecuteScriptAsync(hstring{ L"window.mapleHostApi.loadFile(`" } +
                    CONFIG_ROOT_VIRTUAL_HOSTW +
                    m_currentFileName +
                    L"`)");
                SaveModifiedContent = [weak = weak_ref{ lifetime }]()->IAsyncAction
                {
                    if (auto const lifetime{ weak.get() })
                    {
                        struct awaiter : std::suspend_always
                        {
                            void await_suspend(
                                std::coroutine_handle<> handle)
                            {
                                lifetime->m_fileSaveHandle = handle;
                            }

                            com_ptr<MonacoEditPage> lifetime;
                        };
                        lifetime->WebView().ExecuteScriptAsync(hstring{ L"window.mapleHostApi.requestSaveCurrent()" });
                        co_await awaiter{ .lifetime = lifetime };
                    }
                    co_return;
                };
            }
            else if (cmd == "save")
            {
                if (m_webviewState != MonacoEditPageWebViewState::EditorReady)
                {
                    co_return;
                }
                std::string path{ doc["path"] };
                if (path == m_currentSavingFileName)
                {
                    co_return;
                }
                m_currentSavingFileName = path;

                auto const configDir = co_await ConfigUtil::GetConfigFolder();
                if (configDir.Path() != m_lastConfigFolderPath)
                {
                    co_return;
                }
                if (auto const pos{ path.find(CONFIG_ROOT_VIRTUAL_HOST) }; pos != std::string::npos)
                {
                    path = path.replace(pos, strlen(CONFIG_ROOT_VIRTUAL_HOST), "");
                }
                hstring fileName = to_hstring(path);
                StorageFile file{ nullptr };
                try {
                    file = co_await configDir.GetFileAsync(fileName);
                }
                catch (hresult_error const& hr)
                {
                    if (hr.code().value == 0x80070002)
                    {
                        co_return;
                    }
                    throw;
                }
                std::string const data{ doc["text"] };
                auto const fstream = co_await file.OpenAsync(FileAccessMode::ReadWrite, StorageOpenOptions::AllowOnlyReaders);
                try {
                    DataWriter const wr(fstream);
                    try {
                        wr.WriteBytes(array_view(reinterpret_cast <uint8_t const*>(data.data()), data.size()));
                        co_await wr.StoreAsync();
                        co_await fstream.FlushAsync().as<IAsyncOperation<bool>>();
                        fstream.Size(data.size());
                        wr.Close();
                    }
                    catch (...)
                    {
                        wr.Close();
                        throw;
                    }
                    fstream.Close();
                }
                catch (...)
                {
                    fstream.Close();
                    throw;
                }
                co_await resume_foreground(Dispatcher());
                if (auto const fileSaveHandle{ std::exchange(m_fileSaveHandle, nullptr) }) {
                    fileSaveHandle();
                }
            }
            m_currentSavingFileName = "";
            co_return;
        }
        catch (...)
        {
            m_currentSavingFileName = "";
            UI::NotifyException(L"Processing web messages");
        }
    }

}


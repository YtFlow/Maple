#include "pch.h"
#include "MonacoEditPage.h"
#if __has_include("MonacoEditPage.g.cpp")
#include "MonacoEditPage.g.cpp"
#endif

#include <winrt/Microsoft.Web.WebView2.Core.h>
#include <nlohmann/json.hpp>

using namespace winrt;
using namespace Windows::Storage;
using namespace Windows::UI::Xaml;

namespace winrt::Maple_App::implementation
{
    MonacoEditPage::MonacoEditPage()
    {
        InitializeComponent();
    }

    fire_and_forget MonacoEditPage::Page_Loaded(IInspectable const& sender, RoutedEventArgs const& e)
    {
        auto const lifetime{ get_strong() };
        co_await initializeWebView();
    }
    void MonacoEditPage::Page_Unloaded(IInspectable const& sender, RoutedEventArgs const& e)
    {
        //
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
        webview.CoreWebView2().SetVirtualHostNameToFolderMapping(
            L"maple-monaco-editor-app-root.com",
            packagePath,
            Microsoft::Web::WebView2::Core::CoreWebView2HostResourceAccessKind::DenyCors
        );
        webview.CoreWebView2().SetVirtualHostNameToFolderMapping(
            L"maple-monaco-editor-config-root.com",
            configPath,
            Microsoft::Web::WebView2::Core::CoreWebView2HostResourceAccessKind::Allow
        );
        webview.Source(Uri{ L"http://maple-monaco-editor-app-root.com/MonacoEditor/editor.html" });
    }

    fire_and_forget MonacoEditPage::OnNavigatedTo(NavigationEventArgs const& e) {
        auto const lifetime{ get_strong() };
        auto const param = e.Parameter().as<Maple_App::ConfigViewModel>();
        hstring fileName;
        try
        {
            fileName = param.File().Name();
        }
        catch (...) {}
        if (fileName == L"")
        {
            co_return;
        }
        m_currentFileName = fileName;
        switch (m_webviewState)
        {
        case MonacoEditPageWebViewState::Uninitialized:
            co_await initializeWebView();
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

    fire_and_forget MonacoEditPage::OnNavigatedFrom(NavigationEventArgs const& e)
    {
        // Although editor page will trigger a save before loading new files, there are cases where it does not load a
        // new file, e.g. user selected a .mmdb file.
        // TODO: trigger save
        co_return;
    }

    fire_and_forget MonacoEditPage::WebView_WebMessageReceived(
        MUXC::WebView2 const& sender,
        CoreWebView2WebMessageReceivedEventArgs const& args
    )
    {
        auto const lifetime{ get_strong() };
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
            try {
                auto const configDir{ co_await ApplicationData::Current().LocalFolder().CreateFolderAsync(L"config", CreationCollisionOption::OpenIfExists) };
                auto const configDirPath{ to_string(configDir.Path()) + "\\" };
                std::string path{ doc["path"] };
                if (auto const pos{ path.find(CONFIG_ROOT_VIRTUAL_HOST) }; pos != std::string::npos)
                {
                    path = path.replace(pos, strlen(CONFIG_ROOT_VIRTUAL_HOST), configDirPath);
                }
                auto const file{ co_await StorageFile::GetFileFromPathAsync(to_hstring(path)) };
                std::string const data{ doc["text"] };
                co_await FileIO::WriteBytesAsync(file, array_view{
                    reinterpret_cast<uint8_t const*>(data.data()),
                    static_cast<uint32_t>(data.size())
                    });
            }
            catch (...) {}
            co_await resume_foreground(Dispatcher());
            if (auto const fileSaveHandle{ std::exchange(m_fileSaveHandle, nullptr) }) {
                fileSaveHandle();
            }
        }
        co_return;

    }

}


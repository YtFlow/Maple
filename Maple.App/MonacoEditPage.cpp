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
        co_await webview.EnsureCoreWebView2Async();
        if (std::exchange(m_webviewInitialized, true))
        {
            co_return;
        }
        auto const packagePath = Windows::ApplicationModel::Package::Current().InstalledPath();
        auto const configPath = Windows::Storage::ApplicationData::Current().LocalFolder().Path() + L"\\config";
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
        co_await initializeWebView();
        SaveModifiedContent = [weak = weak_ref{ lifetime }]()->IAsyncAction
        {
            if (auto const lifetime{ weak.get() })
            {
                lifetime->WebView().ExecuteScriptAsync(hstring{ L"window.mapleHostApi.triggerSave()" });
            }
            co_return;
        };

        if (m_webviewDOMLoaded)
        {
            co_await lifetime->WebView().ExecuteScriptAsync(hstring{ L"window.mapleHostApi.loadFile(`http://maple-monaco-editor-config-root.com/" } +
                param.File().Name() +
                L"`)");
        }
        else {
            if (!m_webviewDOMLoadedToken) {
                m_webviewDOMLoadedToken = WebView().CoreWebView2().DOMContentLoaded([=](auto, auto)
                    {
                        lifetime->m_webviewDOMLoaded = true;
                        lifetime->WebView().CoreWebView2().DOMContentLoaded(lifetime->m_webviewDOMLoadedToken);
                        lifetime->WebView().ExecuteScriptAsync(hstring{ L"window.mapleHostApi.loadFile(`" } +
                            CONFIG_ROOT_VIRTUAL_HOSTW +
                            lifetime->m_initialFileName +
                            L"`)");
                        lifetime->WebView().WebMessageReceived([](auto const&, auto const& args)
                            {
                                auto const json{ args.WebMessageAsJson() };
                                handleEvent(json);
                            });
                    });
            }
            m_initialFileName = param.File().Name();
        }
    }

    fire_and_forget MonacoEditPage::OnNavigatedFrom(NavigationEventArgs const& e)
    {
        // Although editor page will trigger a save before loading new files, there are cases where it does not load a
        // new file, e.g. user selected a .mmdb file.
        // TODO: trigger save
        co_return;
    }

    IAsyncAction MonacoEditPage::handleEvent(hstring const& eventJson)
    {
        nlohmann::json doc;
        try {
            doc = nlohmann::json::parse(to_string(eventJson));
        }
        catch (...) {}

        if (doc["cmd"] == "save")
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
        }
        co_return;
    }
}

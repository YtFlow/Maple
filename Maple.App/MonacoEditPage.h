#pragma once

#include "MonacoEditPage.g.h"

#include <functional>

using namespace winrt::Windows::Foundation;
using namespace winrt::Windows::UI::Xaml;
using namespace winrt::Windows::UI::Xaml::Navigation;
namespace MUXC = winrt::Microsoft::UI::Xaml::Controls;
using winrt::Microsoft::Web::WebView2::Core::CoreWebView2WebMessageReceivedEventArgs;

namespace winrt::Maple_App::implementation
{
    constexpr wchar_t const* CONFIG_ROOT_VIRTUAL_HOSTW = L"http://maple-monaco-editor-config-root.com/";
    constexpr char const* CONFIG_ROOT_VIRTUAL_HOST = "http://maple-monaco-editor-config-root.com/";
    enum class MonacoEditPageWebViewState
    {
        Uninitialized,
        AwaitingEditorReady,
        EditorReady,
    };
    struct MonacoEditPage : MonacoEditPageT<MonacoEditPage>
    {
        MonacoEditPage();

        fire_and_forget OnNavigatedTo(NavigationEventArgs const& e);
        fire_and_forget OnNavigatedFrom(NavigationEventArgs const& e);
        fire_and_forget Page_Loaded(IInspectable const& sender, RoutedEventArgs const& e);
        void Page_Unloaded(IInspectable const& sender, RoutedEventArgs const& e);
        fire_and_forget WebView_WebMessageReceived(MUXC::WebView2 const& sender, CoreWebView2WebMessageReceivedEventArgs const& args);

        inline static std::function<IAsyncAction()> SaveModifiedContent{ nullptr };
    private:
        auto const static inline packagePath = Windows::ApplicationModel::Package::Current().InstalledPath();
        auto const static inline configPath = Windows::Storage::ApplicationData::Current().LocalFolder().Path() + L"\\config";

        IAsyncAction initializeWebView();

        MonacoEditPageWebViewState m_webviewState{ MonacoEditPageWebViewState::Uninitialized };
        std::coroutine_handle<> m_fileSaveHandle{ nullptr };
        hstring m_currentFileName{};
    };
}

namespace winrt::Maple_App::factory_implementation
{
    struct MonacoEditPage : MonacoEditPageT<MonacoEditPage, implementation::MonacoEditPage>
    {
    };
}

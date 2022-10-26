#pragma once

#include "MonacoEditPage.g.h"

#include <functional>

using namespace winrt::Windows::Foundation;
using namespace winrt::Windows::UI::Xaml;
using namespace winrt::Windows::UI::Xaml::Navigation;

namespace winrt::Maple_App::implementation
{
    constexpr wchar_t const *CONFIG_ROOT_VIRTUAL_HOSTW = L"http://maple-monaco-editor-config-root.com/";
    constexpr char const *CONFIG_ROOT_VIRTUAL_HOST = "http://maple-monaco-editor-config-root.com/";
    struct MonacoEditPage : MonacoEditPageT<MonacoEditPage>
    {
        MonacoEditPage();

        fire_and_forget OnNavigatedTo(NavigationEventArgs const& e);
        fire_and_forget OnNavigatedFrom(NavigationEventArgs const& e);
        fire_and_forget Page_Loaded(IInspectable const& sender, RoutedEventArgs const& e);
        void Page_Unloaded(IInspectable const& sender, RoutedEventArgs const& e);

        inline static std::function<IAsyncAction()> SaveModifiedContent{ nullptr };
    private:
        static IAsyncAction handleEvent(hstring const& eventJson);
        IAsyncAction initializeWebView();

        bool m_webviewInitialized{};
        bool m_webviewDOMLoaded{};
        event_token m_webviewDOMLoadedToken{};
        hstring m_initialFileName{};
    };
}

namespace winrt::Maple_App::factory_implementation
{
    struct MonacoEditPage : MonacoEditPageT<MonacoEditPage, implementation::MonacoEditPage>
    {
    };
}

#pragma once

#include <functional>

#include <winrt/Windows.System.h>

#include "EditPage.g.h"
#include "leaf.h"

using namespace winrt::Windows::Foundation;
using namespace winrt::Windows::Storage;
using namespace winrt::Windows::UI::Xaml;
using namespace winrt::Windows::UI::Xaml::Controls;
using namespace winrt::Windows::UI::Xaml::Navigation;

namespace winrt::Maple_App::implementation
{
    struct EditPage : EditPageT<EditPage>
    {
        EditPage();

        fire_and_forget OnNavigatedTo(NavigationEventArgs const& e);
        void OnNavigatingFrom(NavigatingCancelEventArgs const& e);

        void EditBox_TextChanging(IInspectable const& sender, RichEditBoxTextChangingEventArgs const& e);
        fire_and_forget SaveButton_Click(IInspectable const& sender, RoutedEventArgs const& e);
        void HelpButton_Click(IInspectable const& sender, RoutedEventArgs const& e);
        void ValidateButton_Click(IInspectable const& sender, RoutedEventArgs const& e);

        inline static std::function<IAsyncAction()> SaveModifiedContent{ nullptr };

    private:
        StorageFile m_file{ nullptr };
        uint8_t m_loaded{}; // TextChanging will be triggered twice before actual user inputs
        std::function<IAsyncAction()> m_saveModifiedContent{ nullptr };
        uint8_t validateRequest{};

        IAsyncAction SaveDocument();
    };
}

namespace winrt::Maple_App::factory_implementation
{
    struct EditPage : EditPageT<EditPage, implementation::EditPage>
    {
    };
}

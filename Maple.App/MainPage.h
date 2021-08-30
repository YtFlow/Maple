#pragma once

#include "MainPage.g.h"
#include "Model/ConfigViewModel.h"

using namespace winrt;
using namespace Windows::ApplicationModel::DataTransfer;
using namespace Windows::Foundation;
using namespace Windows::Foundation::Collections;
using namespace Windows::Storage;
using namespace Windows::UI::Core;
using namespace Windows::UI::Xaml;
using namespace Windows::UI::Xaml::Controls;
using namespace Windows::UI::Xaml::Input;

namespace winrt::Maple_App::implementation
{
    template<typename T>
    concept ConvertableToIStorageItem = std::convertible_to<T, IStorageItem>;

    static const hstring CONFIG_PATH_SETTING_KEY = L"CONFIG_PATH";
    static const hstring NETIF_SETTING_KEY = L"NETIF";
    std::string getNormalizedExtentionFromPath(const winrt::hstring& path);
    struct MainPage : MainPageT<MainPage>
    {
        MainPage();

        static DependencyProperty ConfigItemsProperty();
        IObservableVector<Maple_App::ConfigViewModel> ConfigItems();

        void Page_Loaded(IInspectable const& sender, RoutedEventArgs const& e);
        void ConfigSetAsDefaultMenuItem_Click(IInspectable const& sender, RoutedEventArgs const& e);
        void ConfigRenameMenuItem_Click(IInspectable const& sender, RoutedEventArgs const& e);
        fire_and_forget ConfigDeleteMenuItem_Click(IInspectable const& sender, RoutedEventArgs const& e);
        void RenameDialogPrimaryButton_Click(IInspectable const& sender, ContentDialogButtonClickEventArgs const& e);
        void RenameDialogText_KeyDown(IInspectable const& sender, KeyRoutedEventArgs const& e);
        fire_and_forget ConfigCreateMenuItem_Click(IInspectable const& sender, RoutedEventArgs const& e);
        fire_and_forget ConfigImportMenuItem_Click(IInspectable const& sender, RoutedEventArgs const& e);
        fire_and_forget ConfigDuplicateMenuItem_Click(IInspectable const& sender, RoutedEventArgs const& e);
        void MainPivot_PivotItemLoaded(Pivot const& sender, PivotItemEventArgs const& args);
        void NetifCombobox_SelectionChanged(IInspectable const& sender, SelectionChangedEventArgs const& e);
        void ConfigListView_SelectionChanged(IInspectable const& sender, SelectionChangedEventArgs const& e);
        void ConfigListView_DragItemsStarting(IInspectable const& sender, DragItemsStartingEventArgs const& e);
        void ConfigListView_DragOver(IInspectable const& sender, DragEventArgs const& e);
        fire_and_forget ConfigListView_Drop(IInspectable const& sender, DragEventArgs const& e);
        void ConfigItem_DoubleTapped(IInspectable const& sender, DoubleTappedRoutedEventArgs const& e);
        void WindowWidth_CurrentStateChanged(IInspectable const& sender, VisualStateChangedEventArgs const& e);
        void MainSplitView_PaneClosing(SplitView const& sender, SplitViewPaneClosingEventArgs const& args);
        fire_and_forget GenerateProfileButton_Click(IInspectable const& sender, RoutedEventArgs const& e);

    private:
        inline static DependencyProperty m_configItemsProperty =
            DependencyProperty::Register(
                L"ConfigItems",
                xaml_typename<IObservableVector<Maple_App::ConfigViewModel>>(),
                xaml_typename<Maple_App::MainPage>(),
                nullptr
            );
        inline static DependencyProperty m_renamedNameProperty =
            DependencyProperty::Register(
                L"RenamedName",
                xaml_typename<winrt::hstring>(),
                xaml_typename<Maple_App::MainPage>(),
                nullptr
            );
        inline static SystemNavigationManager NavigationManager{ nullptr };

        IStorageFolder m_configFolder{ nullptr };
        Maple_App::ConfigViewModel m_defaultConfig{ nullptr };

        static IAsyncAction NotifyUser(const hstring& message);
        static IAsyncOperation<IStorageFolder> InitializeConfigFolder();
        static IAsyncOperation<StorageFile> CopyDefaultConfig(const IStorageFolder& configFolder, const hstring& desiredName);
        static IAsyncOperation<StorageFile> CopyDefaultJsonConfig(const IStorageFolder& configFolder, const hstring& desiredName);

        void RequestRenameItem(const Maple_App::ConfigViewModel& item);
        void SetAsDefault(const Maple_App::ConfigViewModel& item);
        fire_and_forget ConfirmRename();
        IAsyncAction LoadConfigs();

        template<ConvertableToIStorageItem T>
        IAsyncAction ImportFiles(const IVectorView<T>& items) {
            const auto lifetime = get_strong();
            const auto& targetDir = co_await InitializeConfigFolder();
            // TODO: concurrency
            for (const auto& item : items) {
                const auto& file = item.try_as<IStorageFile>();
                if (file == nullptr) {
                    continue;
                }
                auto ext = getNormalizedExtentionFromPath(file.Path());
                if (ext != ".json" && ext != ".conf" && ext != ".mmdb" && ext != ".dat" && ext != ".cer" && ext != ".crt") {
                    continue;
                }
                const auto& newFile = co_await file.CopyAsync(targetDir, file.Name(), NameCollisionOption::GenerateUniqueName);
                ConfigItems().Append(co_await ConfigViewModel::FromFile(newFile, false));
            }
        }
    };
}

namespace winrt::Maple_App::factory_implementation
{
    struct MainPage : MainPageT<MainPage, implementation::MainPage>
    {
    };
}

#include "pch.h"
#include "MainPage.h"
#include "MainPage.g.cpp"
#include <winrt/Windows.Networking.Vpn.h>
#include "Model\Netif.h"

namespace winrt::Maple_App::implementation
{
    MainPage::MainPage()
    {
        InitializeComponent();
    }

    DependencyProperty MainPage::ConfigItemsProperty()
    {
        return m_configItemsProperty;
    }
    IObservableVector<Maple_App::ConfigViewModel> MainPage::ConfigItems()
    {
        return GetValue(m_configItemsProperty).as<IObservableVector<Maple_App::ConfigViewModel>>();
    }

    void MainPage::Page_Loaded(IInspectable const&, RoutedEventArgs const&)
    {
        const auto _ = LoadConfigs();
        NavigationManager = SystemNavigationManager::GetForCurrentView();
        NavigationManager.AppViewBackButtonVisibility(MainSplitView().IsPaneOpen()
            ? AppViewBackButtonVisibility::Collapsed
            : AppViewBackButtonVisibility::Visible);

        const auto weakThis = get_weak();
        NavigationManager.BackRequested([weakThis](const auto&, const auto&) {
            if (const auto self{ weakThis.get() }) {
                self->MainSplitView().IsPaneOpen(true);
                const auto currentVisibility = NavigationManager.AppViewBackButtonVisibility();
                if (currentVisibility == AppViewBackButtonVisibility::Visible) {
                    NavigationManager.AppViewBackButtonVisibility(AppViewBackButtonVisibility::Disabled);
                }
            }
            });
    }

    IAsyncAction MainPage::NotifyUser(const hstring& message) {
        ContentDialog dialog;
        dialog.Content(box_value(message));
        dialog.PrimaryButtonCommand(StandardUICommand{ StandardUICommandKind::Close });
        co_await dialog.ShowAsync();
    }

    IAsyncOperation<IStorageFolder> MainPage::InitializeConfigFolder()
    {
        const auto& appData = ApplicationData::Current();
        const auto& localFolder = appData.LocalFolder();
        auto configItem = co_await localFolder.TryGetItemAsync(L"config");
        if (configItem == nullptr || configItem.IsOfType(StorageItemTypes::File)) {
            configItem = co_await localFolder.CreateFolderAsync(L"config", CreationCollisionOption::ReplaceExisting);
        }
        co_return configItem.as<IStorageFolder>();
    }

    IAsyncOperation<StorageFile> MainPage::CopyDefaultConfig(const IStorageFolder& configFolder, const hstring& desiredName)
    {
        const auto& defaultConfigSrc = co_await StorageFile::GetFileFromApplicationUriAsync(Uri{ L"ms-appx:///Config/default.conf" });
        co_return co_await defaultConfigSrc.CopyAsync(configFolder, desiredName, NameCollisionOption::GenerateUniqueName);
    }
    IAsyncOperation<StorageFile> MainPage::CopyDefaultJsonConfig(const IStorageFolder& configFolder, const hstring& desiredName)
    {
        const auto& defaultConfigSrc = co_await StorageFile::GetFileFromApplicationUriAsync(Uri{ L"ms-appx:///Config/default.json" });
        co_return co_await defaultConfigSrc.CopyAsync(configFolder, desiredName, NameCollisionOption::GenerateUniqueName);
    }

    IAsyncAction MainPage::LoadConfigs()
    {
        const auto lifetime = get_strong();
        const auto& appData = ApplicationData::Current();
        m_configFolder = co_await InitializeConfigFolder();
        auto configFiles = co_await m_configFolder.GetFilesAsync();
        if (configFiles.Size() == 0) {
            const auto& defaultConfigDst = co_await CopyDefaultConfig(m_configFolder, L"default.conf");
            appData.LocalSettings().Values().Insert(CONFIG_PATH_SETTING_KEY, box_value(defaultConfigDst.Path()));
            configFiles = co_await m_configFolder.GetFilesAsync();
        }

        std::vector<Maple_App::ConfigViewModel> configModels;
        configModels.reserve(static_cast<size_t>(configFiles.Size()));

        const auto& defaultConfigPath = appData.LocalSettings().Values().TryLookup(CONFIG_PATH_SETTING_KEY).try_as<hstring>();
        for (const auto& file : configFiles) {
            const auto isDefault = file.Path() == defaultConfigPath;
            const auto& instance = configModels.emplace_back(co_await ConfigViewModel::FromFile(file, isDefault));
            if (isDefault) {
                m_defaultConfig = instance;
            }
        }

        SetValue(m_configItemsProperty, single_threaded_observable_vector<Maple_App::ConfigViewModel>(std::move(configModels)));
        ConfigListView().SelectedItem(m_defaultConfig);
    }

    void MainPage::ConfigSetAsDefaultMenuItem_Click(IInspectable const& sender, RoutedEventArgs const&)
    {
        auto item = sender.as<FrameworkElement>().DataContext().as<Maple_App::ConfigViewModel>();
        if (item == nullptr) {
            item = ConfigListView().SelectedItem().as<Maple_App::ConfigViewModel>();
        }
        SetAsDefault(item);
    }

    void MainPage::ConfigItem_DoubleTapped(IInspectable const& sender, DoubleTappedRoutedEventArgs const&)
    {
        const auto& item = sender.as<FrameworkElement>().DataContext().as<Maple_App::ConfigViewModel>();
        SetAsDefault(item);
    }

    void MainPage::SetAsDefault(const Maple_App::ConfigViewModel& item)
    {
        ApplicationData::Current().LocalSettings().Values().Insert(CONFIG_PATH_SETTING_KEY, box_value(item.File().Path()));
        m_defaultConfig.IsDefault(false);
        item.IsDefault(true);
        m_defaultConfig = item;
    }

    void MainPage::ConfigRenameMenuItem_Click(IInspectable const& sender, RoutedEventArgs const&)
    {
        auto item = sender.as<FrameworkElement>().DataContext().as<Maple_App::ConfigViewModel>();
        if (item == nullptr) {
            item = ConfigListView().SelectedItem().as<Maple_App::ConfigViewModel>();
        }
        RequestRenameItem(item);
    }

    void MainPage::RequestRenameItem(const Maple_App::ConfigViewModel& item)
    {
        const auto& name = item.Name();
        const auto& renameDialog = RenameDialog();
        const auto& renameDialogText = RenameDialogText();
        renameDialogText.Text(name);
        auto it = std::find(name.rbegin(), name.rend(), '.');
        if (it != name.rend()) {
            RenameDialogText().Select(0, static_cast<int32_t>(name.rend() - it) - 1);
        }
        renameDialog.DataContext(item);
        renameDialog.ShowAsync();
    }

    fire_and_forget MainPage::ConfigDeleteMenuItem_Click(IInspectable const& sender, RoutedEventArgs const& e)
    {
        const auto lifetime = get_strong();
        auto item = sender.as<FrameworkElement>().DataContext().as<Maple_App::ConfigViewModel>();
        if (item == nullptr) {
            item = ConfigListView().SelectedItem().as<Maple_App::ConfigViewModel>();
        }
        if (item.IsDefault()) {
            co_await NotifyUser(L"Default configuration cannot be deleted.");
            co_return;
        }
        uint32_t index;
        auto configItems = ConfigItems();
        if (!configItems.IndexOf(item, index)) {
            co_return;
        }
        ContentDialog c{};
        c.Title(box_value(L"Delete this configuration file?"));
        c.Content(box_value(L"This operation cannot be undone."));
        c.PrimaryButtonCommand(StandardUICommand{ StandardUICommandKind::Delete });
        c.SecondaryButtonCommand(StandardUICommand{ StandardUICommandKind::Close });
        const auto& result = co_await c.ShowAsync();
        if (result != ContentDialogResult::Primary) {
            co_return;
        }

        if (ConfigListView().SelectedItem() == item) {
            ConfigListView().SelectedIndex(!ConfigListView().SelectedIndex());
        }
        configItems.RemoveAt(index);
        co_await item.Delete();
        if (configItems.Size() == 0) {
            LoadConfigs();
        }
    }

    void MainPage::RenameDialogPrimaryButton_Click(IInspectable const&, ContentDialogButtonClickEventArgs const&)
    {
        ConfirmRename();
    }

    void MainPage::RenameDialogText_KeyDown(IInspectable const&, KeyRoutedEventArgs const& e)
    {
        if (e.Key() == Windows::System::VirtualKey::Enter) {
            ConfirmRename();
            RenameDialog().Hide();
        }
    }

    fire_and_forget MainPage::ConfirmRename() {
        const auto lifetime = get_strong();
        const auto& renameDialog = RenameDialog();
        const auto& item = renameDialog.DataContext().as<Maple_App::ConfigViewModel>();
        if (item == nullptr) {
            return;
        }
        co_await item.Rename(RenameDialogText().Text());
        if (item == m_defaultConfig) {
            ApplicationData::Current().LocalSettings().Values().Insert(CONFIG_PATH_SETTING_KEY, box_value(item.File().Path()));
        }
    }

    fire_and_forget MainPage::ConfigCreateMenuItem_Click(IInspectable const& sender, RoutedEventArgs const&)
    {
        const auto lifetime = get_strong();
        const auto& buttonText = sender.as<MenuFlyoutItem>().Text();
        StorageFile newFile{ nullptr };
        if (buttonText == L"Conf") {
            newFile = co_await CopyDefaultConfig(m_configFolder, L"New Config.conf");
        }
        else if (buttonText == L"JSON") {
            newFile = co_await CopyDefaultJsonConfig(m_configFolder, L"New Config.json");
        }
        else {
            co_return;
        }
        const auto& item = co_await ConfigViewModel::FromFile(newFile, false);
        ConfigItems().Append(item);
        RequestRenameItem(item);
    }

    fire_and_forget MainPage::ConfigDuplicateMenuItem_Click(IInspectable const& sender, RoutedEventArgs const&)
    {
        const auto lifetime = get_strong();
        auto item = sender.as<FrameworkElement>().DataContext().as<Maple_App::ConfigViewModel>();
        if (item == nullptr) {
            item = ConfigListView().SelectedItem().as<Maple_App::ConfigViewModel>();
        }
        const auto& file = item.File();
        const auto& parent = co_await file.GetParentAsync();
        const auto& newFile = co_await file.CopyAsync(parent, file.Name(), NameCollisionOption::GenerateUniqueName);
        ConfigItems().Append(co_await ConfigViewModel::FromFile(newFile, false));
    }

    void MainPage::MainPivot_PivotItemLoaded(Pivot const&, PivotItemEventArgs const& args)
    {
        if (args.Item().Header().as<hstring>() == L"Setting") {
            const auto& netifs = Netif::EnumerateInterfaces();
            std::vector<IInspectable> boxed_netifs;
            boxed_netifs.reserve(netifs.size());
            std::transform(netifs.begin(), netifs.end(), std::back_inserter(boxed_netifs), [](const auto& netif) -> auto {
                return netif;
            });
            NetifCombobox().ItemsSource(single_threaded_vector(std::move(boxed_netifs)));

            const auto& currentNetif = ApplicationData::Current().LocalSettings().Values().TryLookup(NETIF_SETTING_KEY).try_as<hstring>();
            if (currentNetif.has_value()) {
                NetifCombobox().SelectedValue(box_value(currentNetif.value()));
            }
            else {
                const auto it = std::find_if(netifs.begin(), netifs.end(), [](const auto& netif) -> bool {
                    return netif.Desc().size() > 0 && netif.Desc()[0] == L'★';
                    });
                if (it != netifs.end()) {
                    NetifCombobox().SelectedItem(*it);
                }
            }
        }
    }
    void MainPage::NetifCombobox_SelectionChanged(IInspectable const&, SelectionChangedEventArgs const& e)
    {
        const auto it = e.AddedItems().First();
        if (!it.HasCurrent() || it.Current().try_as<Maple_App::Netif>() == nullptr) {
            return;
        }

        const auto& netif = it.Current().as<Maple_App::Netif>();
        ApplicationData::Current().LocalSettings().Values().Insert(NETIF_SETTING_KEY, box_value(netif.Addr()));
    }

    void MainPage::ConfigListView_SelectionChanged(IInspectable const&, SelectionChangedEventArgs const& e)
    {
        MainContentFrame().BackStack().Clear();
        MainContentFrame().Navigate(xaml_typename<EditPage>(), e.AddedItems().First().Current());
    }

    void MainPage::WindowWidth_CurrentStateChanged(IInspectable const&, VisualStateChangedEventArgs const& e)
    {
        const auto& state = e.NewState();

        NavigationManager.AppViewBackButtonVisibility(state == nullptr
            ? AppViewBackButtonVisibility::Visible
            : AppViewBackButtonVisibility::Collapsed);
    }

    void MainPage::MainSplitView_PaneClosing(SplitView const&, SplitViewPaneClosingEventArgs const&)
    {
        NavigationManager.AppViewBackButtonVisibility(AppViewBackButtonVisibility::Visible);
    }

    fire_and_forget MainPage::GenerateProfileButton_Click(IInspectable const& sender, RoutedEventArgs const& e)
    {
        const auto lifetime = get_strong();
        using namespace winrt::Windows::Networking::Vpn;
        const auto& agent = VpnManagementAgent{};
        const auto& profile = VpnPlugInProfile{};
        profile.AlwaysOn(false);
        profile.ProfileName(L"Maple");
        profile.RequireVpnClientAppUI(true);
        profile.VpnPluginPackageFamilyName(Windows::ApplicationModel::Package::Current().Id().FamilyName());
        profile.RememberCredentials(false);
        profile.ServerUris().Append(Uri{ L"https://github.com/YtFlow/Maple" });
        const auto& result = co_await agent.AddProfileFromObjectAsync(profile);
        if (result == VpnManagementErrorStatus::Ok) {
            co_await NotifyUser(L"Profile generated.");
        }
        else {
            co_await NotifyUser(L"Failed to generate a profile (" + to_hstring(static_cast<int32_t>(result)) + L").");
        }
    }
}


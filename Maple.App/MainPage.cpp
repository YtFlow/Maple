#include "pch.h"
#include "MainPage.h"
#include "MainPage.g.cpp"
#include <filesystem>
#include <winrt/Windows.ApplicationModel.Core.h>
#include <winrt/Windows.UI.ViewManagement.h>
#include <winrt/Windows.UI.Xaml.Media.h>
#include "Model\Netif.h"
#include "UI.h"

namespace winrt::Maple_App::implementation
{
    using namespace std::chrono_literals;

    using namespace winrt::Windows::UI::ViewManagement;
    using namespace winrt::Windows::UI::Xaml;
    using namespace winrt::Windows::UI::Xaml::Media;

    std::string getNormalizedExtentionFromPath(const winrt::hstring& path) {
        auto ext = std::filesystem::path(std::wstring_view(path)).extension().string();
        std::transform(ext.begin(), ext.end(), ext.begin(), [](const auto ch) {
            return static_cast<char>(std::tolower(ch));
            });
        return ext;
    }

    MainPage::MainPage()
    {
        InitializeComponent();

        const auto coreTitleBar{ CoreApplication::GetCurrentView().TitleBar() };
        const auto window{ Window::Current() };
        coreTitleBar.ExtendViewIntoTitleBar(true);
        window.SetTitleBar(CustomTitleBar());

        coreTitleBar.LayoutMetricsChanged({ this,&MainPage::CoreTitleBar_LayoutMetricsChanged });
        window.Activated({ this, &MainPage::CoreWindow_Activated });
    }

    void MainPage::CoreTitleBar_LayoutMetricsChanged(CoreApplicationViewTitleBar const& coreTitleBar, IInspectable const&)
    {
        LeftPaddingColumn().Width(GridLength{ .Value = coreTitleBar.SystemOverlayLeftInset(), .GridUnitType = GridUnitType::Pixel });
        RightPaddingColumn().Width(GridLength{ .Value = coreTitleBar.SystemOverlayRightInset(), .GridUnitType = GridUnitType::Pixel });
    }
    void MainPage::CoreWindow_Activated(IInspectable const&, WindowActivatedEventArgs const& args)
    {
        UISettings settings{};
        if (args.WindowActivationState() == CoreWindowActivationState::Deactivated)
        {
            AppTitleTextBlock().Foreground(
                SolidColorBrush{ settings.UIElementColor(UIElementType::GrayText) });
        }
        else
        {
            AppTitleTextBlock().Foreground(
                SolidColorBrush{ settings.GetColorValue(UIColorType::Foreground) });
        }
    }

    DependencyProperty MainPage::ConfigItemsProperty()
    {
        return m_configItemsProperty;
    }
    DependencyProperty MainPage::UsingDefaultConfigFolderProperty()
    {
        return m_usingDefaultConfigFolderProperty;
    }
    IObservableVector<Maple_App::ConfigViewModel> MainPage::ConfigItems()
    {
        return GetValue(m_configItemsProperty).as<IObservableVector<Maple_App::ConfigViewModel>>();
    }
    bool MainPage::UsingDefaultConfigFolder()
    {
        return GetValue(m_usingDefaultConfigFolderProperty).try_as<bool>().value_or(false);
    }

    fire_and_forget MainPage::Page_Loaded(IInspectable const&, RoutedEventArgs const&)
    {
        try {
            const auto loadConfigsTask = LoadConfigs();
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

            StartConnectionCheck();
            co_await loadConfigsTask;
        }
        catch (...)
        {
            UI::NotifyException(L"Loading MainPage");
        }
    }

    IAsyncAction MainPage::NotifyUser(const hstring& message) {
        ContentDialog dialog;
        dialog.Content(box_value(message));
        dialog.PrimaryButtonCommand(StandardUICommand{ StandardUICommandKind::Close });
        co_await dialog.ShowAsync();
    }

    IAsyncOperation<StorageFile> MainPage::CopyDefaultConfig(const IStorageFolder& configFolder, std::wstring_view path, const hstring& desiredName)
    {
        const auto& defaultConfigSrc = co_await StorageFile::GetFileFromApplicationUriAsync(Uri{ path });
        co_return co_await defaultConfigSrc.CopyAsync(configFolder, desiredName, NameCollisionOption::GenerateUniqueName);
    }

    IAsyncAction MainPage::LoadConfigs()
    {
        const auto lifetime = get_strong();
        const auto& appData = ApplicationData::Current();
        m_configFolder = co_await ConfigUtil::GetConfigFolder();
        SetValue(m_usingDefaultConfigFolderProperty, box_value(ConfigUtil::UsingDefaultConfigFolder()));
        CustomConfigFolderPathText().Text(m_configFolder.Path());
        auto configFiles = co_await m_configFolder.GetFilesAsync();
        if (configFiles.Size() == 0) {
            const auto& defaultConfigDst = co_await CopyDefaultConfig(m_configFolder, DEFAULT_CONF_FILE_PATH, L"default.conf");
            appData.LocalSettings().Values().Insert(CONFIG_PATH_SETTING_KEY, box_value(defaultConfigDst.Path()));
            configFiles = co_await m_configFolder.GetFilesAsync();
        }

        std::vector<Maple_App::ConfigViewModel> configModels;
        configModels.reserve(static_cast<size_t>(configFiles.Size()));

        m_defaultConfig = nullptr;
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
        try {
            auto item = sender.as<FrameworkElement>().DataContext().as<Maple_App::ConfigViewModel>();
            if (item == nullptr) {
                item = ConfigListView().SelectedItem().as<Maple_App::ConfigViewModel>();
            }
            SetAsDefault(item);
        }
        catch (...)
        {
            UI::NotifyException(L"Setting default");
        }
    }

    void MainPage::ConfigItem_DoubleTapped(IInspectable const& sender, DoubleTappedRoutedEventArgs const&)
    {
        const auto& item = sender.as<FrameworkElement>().DataContext().as<Maple_App::ConfigViewModel>();
        SetAsDefault(item);
    }

    void MainPage::SetAsDefault(const Maple_App::ConfigViewModel& item)
    {
        try {
            const auto name = getNormalizedExtentionFromPath(item.Name());
            if (name != ".conf" && name != ".json") {
                NotifyUser(L"A valid configuration file must end with .conf or .json.");
                return;
            }
            ApplicationData::Current().LocalSettings().Values().Insert(CONFIG_PATH_SETTING_KEY, box_value(item.File().Path()));
            item.IsDefault(true);
            if (auto const oldConfig{ std::exchange(m_defaultConfig, item) }) {
                oldConfig.IsDefault(false);
            }
        }
        catch (...)
        {
            UI::NotifyException(L"Setting default");
        }
    }

    void MainPage::ConfigRenameMenuItem_Click(IInspectable const& sender, RoutedEventArgs const&)
    {
        try {
            auto item = sender.as<FrameworkElement>().DataContext().as<Maple_App::ConfigViewModel>();
            if (item == nullptr) {
                item = ConfigListView().SelectedItem().as<Maple_App::ConfigViewModel>();
            }
            RequestRenameItem(item);
        }
        catch (...)
        {
            UI::NotifyException(L"Requesting rename");
        }
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
        try {
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
                ConfigListView().SelectedIndex(ConfigListView().SelectedIndex() == 0 ? 1 : 0);
            }
            co_await item.Delete();
            configItems.RemoveAt(index);
            if (configItems.Size() == 0) {
                LoadConfigs();
            }
        }
        catch (...)
        {
            UI::NotifyException(L"Deleting file");
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
        try {
            const auto lifetime = get_strong();
            const auto& renameDialog = RenameDialog();
            const auto& item = renameDialog.DataContext().as<Maple_App::ConfigViewModel>();
            if (item == nullptr) {
                co_return;
            }
            co_await item.Rename(RenameDialogText().Text());
            if (item == m_defaultConfig) {
                ApplicationData::Current().LocalSettings().Values().Insert(CONFIG_PATH_SETTING_KEY, box_value(item.File().Path()));
            }
        }
        catch (...)
        {
            UI::NotifyException(L"Renaming");
        }
    }

    fire_and_forget MainPage::ConfigCreateMenuItem_Click(IInspectable const& sender, RoutedEventArgs const&)
    {
        try {
            const auto lifetime = get_strong();
            const auto& buttonText = sender.as<MenuFlyoutItem>().Text();
            StorageFile newFile{ nullptr };
            if (buttonText == L"Conf") {
                newFile = co_await CopyDefaultConfig(m_configFolder, DEFAULT_CONF_FILE_PATH, L"New Config.conf");
            }
            else if (buttonText == L"JSON") {
                newFile = co_await CopyDefaultConfig(m_configFolder, DEFAULT_JSON_FILE_PATH, L"New Config.json");
            }
            else if (buttonText == L"Minimal")
            {
                newFile = co_await CopyDefaultConfig(m_configFolder, DEFAULT_MINIMAL_FILE_PATH, L"New Config.conf");
            }
            else {
                co_return;
            }
            const auto& item = co_await ConfigViewModel::FromFile(newFile, false);
            ConfigItems().Append(item);
            RequestRenameItem(item);
        }
        catch (...)
        {
            UI::NotifyException(L"Creating file");
        }
    }

    fire_and_forget MainPage::ConfigImportMenuItem_Click(IInspectable const& sender, RoutedEventArgs const& e)
    {
        try {
            const auto lifetime = get_strong();
            bool unsnapped = ((ApplicationView::Value() != ApplicationViewState::Snapped) || ApplicationView::TryUnsnap());
            if (!unsnapped)
            {
                co_await NotifyUser(L"Cannot unsnap the app.");
                co_return;
            }
            ImportFilePicker().FileTypeFilter().ReplaceAll({ L".conf", L".json", L".mmdb", L".dat", L".cer", L".crt" });
            const auto& files = co_await ImportFilePicker().PickMultipleFilesAsync();
            co_await ImportFiles(files);
        }
        catch (...)
        {
            UI::NotifyException(L"Importing files");
        }
    }

    fire_and_forget MainPage::ConfigDuplicateMenuItem_Click(IInspectable const& sender, RoutedEventArgs const&)
    {
        try {
            const auto lifetime = get_strong();
            auto item = sender.as<FrameworkElement>().DataContext().as<Maple_App::ConfigViewModel>();
            if (item == nullptr) {
                item = ConfigListView().SelectedItem().as<Maple_App::ConfigViewModel>();
            }
            const auto file = item.File();
            const auto parent = co_await file.GetParentAsync();
            if (!parent)
            {
                UI::NotifyUser("Failed to load config folder.", L"Error: duplicating");
                co_return;
            }
            const auto newFile = co_await file.CopyAsync(parent, file.Name(), NameCollisionOption::GenerateUniqueName);
            ConfigItems().Append(co_await ConfigViewModel::FromFile(newFile, false));
        }
        catch (...)
        {
            UI::NotifyException(L"Duplicating");
        }
    }

    void MainPage::MainPivot_PivotItemLoaded(Pivot const&, PivotItemEventArgs const& args)
    {
        try {
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
        catch (...)
        {
            UI::NotifyException(L"Loading settings");
        }
    }
    void MainPage::NetifCombobox_SelectionChanged(IInspectable const&, SelectionChangedEventArgs const& e)
    {
        try {
            const auto it = e.AddedItems().First();
            if (!it.HasCurrent() || it.Current().try_as<Maple_App::Netif>() == nullptr) {
                return;
            }

            const auto& netif = it.Current().as<Maple_App::Netif>();
            ApplicationData::Current().LocalSettings().Values().Insert(NETIF_SETTING_KEY, box_value(netif.Addr()));
        }
        catch (...)
        {
            UI::NotifyException(L"Setting interface");
        }
    }

    void MainPage::ConfigListView_SelectionChanged(IInspectable const&, SelectionChangedEventArgs const& e)
    {
        try {
            if (e.AddedItems().Size() == 0 && e.RemovedItems().Size() > 0)
            {
                MainContentFrame().BackStack().Clear();
                MainContentFrame().Content(nullptr);
                return;
            }
            const auto& item = e.AddedItems().First().Current();
            auto targetPage = xaml_typename<MonacoEditPage>();
            const auto& config = item.try_as<Maple_App::ConfigViewModel>();
            if (config != nullptr) {
                const auto ext = getNormalizedExtentionFromPath(config.Name());
                if (ext == ".mmdb") {
                    targetPage = xaml_typename<MmdbPage>();
                }
                else if (ext == ".dat") {
                    targetPage = xaml_typename<DatPage>();
                }
                else if (ext == ".cer" || ext == ".crt") {
                    targetPage = xaml_typename<CertPage>();
                }
            }
            if (targetPage.Name != xaml_typename<MonacoEditPage>().Name)
            {
                MainContentFrame().BackStack().Clear();
            }
            MainContentFrame().Navigate(targetPage, item);
        }
        catch (...)
        {
            UI::NotifyException(L"Opening file");
        }
    }

    void MainPage::ConfigListView_DragItemsStarting(IInspectable const&, DragItemsStartingEventArgs const& e)
    {
        try {
            std::vector<IStorageItem> files;
            files.reserve(static_cast<size_t>(e.Items().Size()));
            for (const auto& obj : e.Items()) {
                const auto& item = obj.try_as<Maple_App::ConfigViewModel>();
                if (item == nullptr) {
                    continue;
                }
                files.push_back(item.File());
            }
            const auto& data = e.Data();
            data.SetStorageItems(files);
            data.RequestedOperation(DataPackageOperation::Copy);
        }
        catch (...)
        {
            UI::NotifyException(L"Preparing drag items");
        }
    }

    void MainPage::ConfigListView_DragOver(IInspectable const&, DragEventArgs const& e)
    {
        try {
            if (static_cast<uint32_t>(e.AllowedOperations() & DataPackageOperation::Copy) == 0
                || !e.DataView().Contains(StandardDataFormats::StorageItems())) {
                e.AcceptedOperation(DataPackageOperation::None);
                return;
            }
            e.AcceptedOperation(DataPackageOperation::Copy);
        }
        catch (...)
        {
            UI::NotifyException(L"Dragging");
        }
    }
    fire_and_forget MainPage::ConfigListView_Drop(IInspectable const&, DragEventArgs const& e)
    {
        try {
            const auto lifetime = get_strong();
            const auto& dataView = e.DataView();
            if (static_cast<uint32_t>(e.AllowedOperations() & DataPackageOperation::Copy) == 0
                || !dataView.Contains(StandardDataFormats::StorageItems())) {
                co_return;
            }

            const auto& items = co_await dataView.GetStorageItemsAsync();
            co_await ImportFiles(items);
        }
        catch (...)
        {
            UI::NotifyException(L"Pasting files");
        }
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
        try {
            const auto lifetime = get_strong();
            const auto& profile = VpnPlugInProfile{};
            profile.AlwaysOn(false);
            profile.ProfileName(L"Maple");
            profile.RequireVpnClientAppUI(true);
            profile.VpnPluginPackageFamilyName(Windows::ApplicationModel::Package::Current().Id().FamilyName());
            profile.RememberCredentials(false);
            profile.ServerUris().Append(Uri{ L"https://github.com/YtFlow/Maple" });
            const auto& result = co_await VpnMgmtAgent.AddProfileFromObjectAsync(profile);
            if (result == VpnManagementErrorStatus::Ok) {
                co_await NotifyUser(L"Profile generated.");
            }
            else {
                co_await NotifyUser(L"Failed to generate a profile (" + to_hstring(static_cast<int32_t>(result)) + L").");
            }
        }
        catch (...)
        {
            UI::NotifyException(L"Generating profile");
        }
    }

    fire_and_forget MainPage::ConnectionToggleSwitch_Toggled(IInspectable const&, RoutedEventArgs const&)
    {
        try {
            const auto lifetime{ get_strong() };

            if (!ApplicationData::Current().LocalSettings().Values().HasKey(NETIF_SETTING_KEY)) {
                MainPivot().SelectedIndex(1);
                co_await 400ms;
                co_await resume_foreground(Dispatcher());
                NetifCombobox().IsDropDownOpen(true);
                co_return;
            }

            const auto connect = ConnectionToggleSwitch().IsOn();
            ConnectionToggleSwitch().IsEnabled(false);
            VpnManagementErrorStatus status = VpnManagementErrorStatus::Ok;
            if (connect) {
                status = co_await VpnMgmtAgent.ConnectProfileAsync(m_vpnProfile);
            }
            else {
                status = co_await VpnMgmtAgent.DisconnectProfileAsync(m_vpnProfile);
            }
            if (status == VpnManagementErrorStatus::Ok)
            {
                ConnectionToggleSwitch().IsEnabled(true);
            }
            else {
                NotifyUser(L"Could not perform the requested operation. Please try again from system VPN settings for detailed error messages.");
            }
        }
        catch (...)
        {
            UI::NotifyException(L"Connecting");
        }
    }
    fire_and_forget MainPage::StartConnectionCheck()
    {
        try {
            const auto lifetime{ get_strong() };
            IVectorView<IVpnProfile> profiles{ nullptr };

            auto event_token{ ConnectionToggleSwitch().Toggled({ this, &MainPage::ConnectionToggleSwitch_Toggled }) };
            while (true) {
                if (m_vpnProfile == nullptr) {
                    profiles = co_await VpnMgmtAgent.GetProfilesAsync();
                    for (auto const p : profiles) {
                        if (p.ProfileName() == L"Maple" || p.ProfileName() == L"maple") {
                            m_vpnProfile = p.try_as<VpnPlugInProfile>();
                            break;
                        }
                    }
                }
                if (m_vpnProfile == nullptr) {
                    ConnectionToggleSwitch().IsEnabled(false);
                }
                else {
                    ToolTipService::SetToolTip(ConnectionToggleSwitchContainer(), nullptr);
                    auto status = VpnManagementConnectionStatus::Disconnected;
                    try {
                        status = m_vpnProfile.ConnectionStatus();
                    }
                    catch (...) {}

                    ConnectionToggleSwitch().IsEnabled(status == VpnManagementConnectionStatus::Connected
                        || status == VpnManagementConnectionStatus::Disconnected);
                    ConnectionToggleSwitch().Toggled(event_token);
                    ConnectionToggleSwitch().IsOn(status == VpnManagementConnectionStatus::Connected
                        || status == VpnManagementConnectionStatus::Connecting);
                    event_token = ConnectionToggleSwitch().Toggled({ this, &MainPage::ConnectionToggleSwitch_Toggled });
                }
                co_await 1s;
                co_await resume_foreground(Dispatcher());
            }
        }
        catch (...)
        {
            UI::NotifyException(L"Checking VPN status");
        }
    }

    fire_and_forget MainPage::ConfigFolderSelectButton_Click(IInspectable const&, RoutedEventArgs const&)
    {
        try
        {
            m_configFolderPicker.FileTypeFilter().Clear();
            m_configFolderPicker.FileTypeFilter().Append(L"*");
            auto folder = co_await m_configFolderPicker.PickSingleFolderAsync();
            if (!folder)
            {
                co_return;
            }
            co_await folder.GetItemsAsync(); // Try to read something to see if is OK
            ConfigUtil::SetConfigFolder(std::move(folder));
            LoadConfigs();
        }
        catch (...)
        {
            UI::NotifyException(L"Select Config Folder");
        }
    }

    void MainPage::ConfigFolderResetButton_Click(IInspectable const&, RoutedEventArgs const&)
    {
        try
        {
            ConfigUtil::SetConfigFolder(nullptr);
            LoadConfigs();
        }
        catch (...)
        {
            UI::NotifyException(L"Reset Config Folder");
        }
    }

}


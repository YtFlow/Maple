#include "pch.h"
#include "ConfigUtil.h"

#include <winrt\Windows.Storage.AccessCache.h>

namespace winrt::Maple_App::implementation {

    using namespace Windows::Foundation;
    using namespace Windows::Storage;
    using namespace Windows::Storage::AccessCache;

    ApplicationData ConfigUtil::GetCurrentAppData()
    {
        static ApplicationData currentAppData{ ApplicationData::Current() };
        return currentAppData;
    }
    IAsyncOperation<StorageFolder> ConfigUtil::GetDefaultConfigFolder()
    {
        auto configItem = co_await LocalFolder.TryGetItemAsync(LocalFolderConfigDirName);
        if (configItem == nullptr || configItem.IsOfType(StorageItemTypes::File)) {
            configItem = co_await LocalFolder.CreateFolderAsync(LocalFolderConfigDirName, CreationCollisionOption::ReplaceExisting);
        }
        co_return configItem.as<StorageFolder>();
    }
    IAsyncOperation<IStorageFolder> ConfigUtil::GetConfigFolder()
    {
        if (cachedConfigFolder)
        {
            co_return cachedConfigFolder;
        }

        StorageFolder folder{ nullptr };
        try {
            folder = co_await StorageApplicationPermissions::FutureAccessList().GetFolderAsync(ConfigFolderAccessListKey);
        }
        catch (hresult_invalid_argument const&) {}
        usingDefaultConfigFolder = !static_cast<bool>(folder);
        if (!folder)
        {
            folder = co_await GetDefaultConfigFolder();
        }
        cachedConfigFolder = folder;
        co_return folder;
    }

    void ConfigUtil::SetConfigFolder(IStorageFolder folder)
    {
        if (folder) {
            StorageApplicationPermissions::FutureAccessList().AddOrReplace(ConfigFolderAccessListKey, folder);
        }
        else
        {
            StorageApplicationPermissions::FutureAccessList().Remove(ConfigFolderAccessListKey);
        }
        cachedConfigFolder = nullptr;
        usingDefaultConfigFolder = !static_cast<bool>(folder);
    }

    bool ConfigUtil::UsingDefaultConfigFolder() noexcept {
        return usingDefaultConfigFolder;
    }
}


#pragma once

namespace winrt::Maple_App::implementation {
    struct ConfigUtil
    {
        static Windows::Storage::ApplicationData GetCurrentAppData();
        static Windows::Foundation::IAsyncOperation<Windows::Storage::IStorageFolder> GetConfigFolder();
        static Windows::Foundation::IAsyncOperation<Windows::Storage::StorageFolder> GetDefaultConfigFolder();
        static void SetConfigFolder(Windows::Storage::IStorageFolder folder);
        static bool UsingDefaultConfigFolder() noexcept;

        inline const static auto LocalFolder{ GetCurrentAppData().LocalFolder() };

    private:
        constexpr static std::wstring_view ConfigFolderAccessListKey = L"configFolder";
        constexpr static std::wstring_view LocalFolderConfigDirName = L"config";

        static inline Windows::Storage::IStorageFolder cachedConfigFolder{ nullptr };
        static inline bool usingDefaultConfigFolder{};
    };
}


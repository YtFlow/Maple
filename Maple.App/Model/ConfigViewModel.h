#pragma once
#include "ConfigViewModel.g.h"

using namespace winrt::Windows::Foundation;
using namespace winrt::Windows::Storage;
using namespace winrt::Windows::UI::Xaml::Data;

namespace winrt::Maple_App::implementation
{
    struct ConfigViewModel : ConfigViewModelT<ConfigViewModel>
    {
        ConfigViewModel(const StorageFile& file, DateTime dateUpdated, bool isDefault);

        static IAsyncOperation<Maple_App::ConfigViewModel> FromFile(const StorageFile& file, bool isDefault);

        StorageFile File();
        hstring Name();
        DateTime DateUpdated();
        bool IsDefault();
        void IsDefault(bool value);
        winrt::event_token PropertyChanged(PropertyChangedEventHandler const& handler);
        void PropertyChanged(winrt::event_token const& token) noexcept;
        IAsyncAction Delete();
        IAsyncAction Rename(hstring const& newName);

    private:

        StorageFile m_file;
        Windows::Foundation::DateTime m_dateUpdated;
        bool m_isDefault;
        event<PropertyChangedEventHandler> m_propertyChanged;
    };
}

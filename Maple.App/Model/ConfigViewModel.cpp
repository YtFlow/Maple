#include "pch.h"
#include "ConfigViewModel.h"
#include "ConfigViewModel.g.cpp"

namespace winrt::Maple_App::implementation
{
    IAsyncOperation<Maple_App::ConfigViewModel> ConfigViewModel::FromFile(const StorageFile& file, bool isDefault) {
        const auto& properties = co_await file.GetBasicPropertiesAsync();
        const auto& modified = properties.DateModified();
        co_return winrt::make<ConfigViewModel>(file, modified, isDefault);
    }
    ConfigViewModel::ConfigViewModel(const StorageFile& file, DateTime dateUpdated, bool isDefault)
        : m_file(file), m_dateUpdated(dateUpdated), m_isDefault(isDefault)
    {
    }
    StorageFile ConfigViewModel::File()
    {
        return m_file;
    }
    hstring ConfigViewModel::Name()
    {
        return m_file.Name();
    }
    Windows::Foundation::DateTime ConfigViewModel::DateUpdated()
    {
        return m_dateUpdated;
    }
    bool ConfigViewModel::IsDefault()
    {
        return m_isDefault;
    }
    void ConfigViewModel::IsDefault(bool value)
    {
        m_isDefault = value;
        m_propertyChanged(*this, PropertyChangedEventArgs(L"IsDefault"));
    }
    winrt::event_token ConfigViewModel::PropertyChanged(Windows::UI::Xaml::Data::PropertyChangedEventHandler const& handler)
    {
        return m_propertyChanged.add(handler);
    }
    void ConfigViewModel::PropertyChanged(winrt::event_token const& token) noexcept
    {
        m_propertyChanged.remove(token);
    }
    IAsyncAction ConfigViewModel::Delete() {
        return m_file.DeleteAsync();
    }
    IAsyncAction ConfigViewModel::Rename(hstring const& newName) {
        co_await m_file.RenameAsync(newName, NameCollisionOption::GenerateUniqueName);
        m_propertyChanged(*this, PropertyChangedEventArgs(L"Name"));
    }
}

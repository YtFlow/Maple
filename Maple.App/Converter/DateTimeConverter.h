#pragma once
#include "DateTimeConverter.g.h"
#include <winrt/Windows.Globalization.DateTimeFormatting.h>

using namespace winrt::Windows::Foundation;
using namespace winrt::Windows::Globalization::DateTimeFormatting;
using namespace winrt::Windows::UI::Xaml::Interop;

namespace winrt::Maple_App::implementation
{
    struct DateTimeConverter : DateTimeConverterT<DateTimeConverter>
    {
        DateTimeConverter() = default;

        IInspectable Convert(IInspectable const& value, TypeName const& targetType, IInspectable const& parameter, hstring const& language);
        IInspectable ConvertBack(IInspectable const& value, TypeName const& targetType, IInspectable const& parameter, hstring const& language);

    private:
        DateTimeFormatter DateFormatter{ DateTimeFormatter::LongDate() };
        DateTimeFormatter TimeFormatter{ DateTimeFormatter::LongTime() };
    };
}
namespace winrt::Maple_App::factory_implementation
{
    struct DateTimeConverter : DateTimeConverterT<DateTimeConverter, implementation::DateTimeConverter>
    {
    };
}

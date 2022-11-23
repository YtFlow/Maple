#include "pch.h"
#include "Converter/BoolToVisibilityConverter.h"
#include "BoolToVisibilityConverter.g.cpp"

namespace winrt::Maple_App::implementation
{
    using namespace Windows::Foundation;
    using winrt::Windows::UI::Xaml::Interop::TypeName;

    IInspectable BoolToVisibilityConverter::Convert(
        IInspectable const& value,
        [[maybe_unused]] TypeName const& targetType,
        IInspectable const& parameter,
        [[maybe_unused]] hstring const& language
    )
    {
        bool const rev = parameter.try_as<bool>().value_or(false);
        bool const val = value.try_as<bool>().value_or(false);
        return box_value(val ^ rev);
    }
    IInspectable BoolToVisibilityConverter::ConvertBack(
        [[maybe_unused]] IInspectable const& value,
        [[maybe_unused]] TypeName const& targetType,
        [[maybe_unused]] IInspectable const& parameter,
        [[maybe_unused]] hstring const& language
    )
    {
        throw hresult_not_implemented();
    }
}

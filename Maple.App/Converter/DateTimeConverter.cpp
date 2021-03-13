#include "pch.h"
#include "Converter/DateTimeConverter.h"
#include "DateTimeConverter.g.cpp"

namespace winrt::Maple_App::implementation
{
    IInspectable DateTimeConverter::Convert(IInspectable const& value, TypeName const&, IInspectable const&, hstring const&)
    {
        const auto &opt_val = value.try_as<DateTime>();
        if (!opt_val.has_value()) {
            return nullptr;
        }

        return box_value(DateFormatter.Format(opt_val.value()) + L" " + TimeFormatter.Format(opt_val.value()));
    }
    IInspectable DateTimeConverter::ConvertBack(IInspectable const&, TypeName const&, IInspectable const&, hstring const&)
    {
        throw hresult_not_implemented();
    }
}

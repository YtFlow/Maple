#pragma once

#include "DatPage.g.h"

namespace winrt::Maple_App::implementation
{
    struct DatPage : DatPageT<DatPage>
    {
        DatPage();

    };
}

namespace winrt::Maple_App::factory_implementation
{
    struct DatPage : DatPageT<DatPage, implementation::DatPage>
    {
    };
}

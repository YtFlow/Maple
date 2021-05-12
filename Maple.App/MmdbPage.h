#pragma once

#include "MmdbPage.g.h"

namespace winrt::Maple_App::implementation
{
    struct MmdbPage : MmdbPageT<MmdbPage>
    {
        MmdbPage();

    };
}

namespace winrt::Maple_App::factory_implementation
{
    struct MmdbPage : MmdbPageT<MmdbPage, implementation::MmdbPage>
    {
    };
}

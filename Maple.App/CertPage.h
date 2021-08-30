#pragma once

#include "CertPage.g.h"

namespace winrt::Maple_App::implementation
{
    struct CertPage : CertPageT<CertPage>
    {
        CertPage();
   };
}

namespace winrt::Maple_App::factory_implementation
{
    struct CertPage : CertPageT<CertPage, implementation::CertPage>
    {
    };
}

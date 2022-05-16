#pragma once

#include "Netif.g.h"

namespace winrt::Maple_App::implementation
{
    struct Netif : NetifT<Netif>
    {
        Netif() = default;
        Netif(const hstring& desc, const hstring& Addr);

        hstring Desc();
        hstring Addr();

        static std::vector<Maple_App::Netif> EnumerateInterfaces();
        static std::optional<DWORD> SniffBestInterface();

    private:
        hstring m_desc;
        hstring m_addr;
    };
}

namespace winrt::Maple_App::factory_implementation
{
    struct Netif : NetifT<Netif, implementation::Netif>
    {
    };
}

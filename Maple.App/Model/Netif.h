#pragma once

#include "Netif.g.h"

namespace winrt::Maple_App::implementation
{
    struct Netif : NetifT<Netif>
    {
        using addresses_t = std::vector<std::pair<unsigned short, hstring>>;

        Netif() = default;
        Netif(const hstring& desc, addresses_t addresses);

        hstring Desc();
        hstring Addr();
        addresses_t& Addresses();
        hstring IpSummary();
        hstring IpLines();

        static std::vector<Maple_App::Netif> EnumerateInterfaces();
        static std::optional<DWORD> SniffBestInterface();

    private:
        hstring m_desc;
        hstring m_addr;
        addresses_t m_addresses;
    };
}

namespace winrt::Maple_App::factory_implementation
{
    struct Netif : NetifT<Netif, implementation::Netif>
    {
    };
}

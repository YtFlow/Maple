#include "pch.h"
#include <WinSock2.h>
#include <iphlpapi.h>
#include "Netif.h"
#if __has_include("Netif.g.cpp")
#include "Netif.g.cpp"
#endif

constexpr auto WORKING_BUFFER_SIZE = 15000;
constexpr auto ADDR_BUFFER_SIZE = 64;
constexpr auto MAX_TRIES = 3;

#define MALLOC(x) HeapAlloc(GetProcessHeap(), 0, (x))
#define FREE(x) HeapFree(GetProcessHeap(), 0, (x))

namespace winrt::Maple_App::implementation
{
    Netif::Netif(const hstring& desc, const hstring& Addr)
        : m_desc(desc), m_addr(Addr)
    {
    }
    hstring Netif::Desc()
    {
        return m_desc;
    }

    hstring Netif::Addr()
    {
        return m_addr;
    }

    std::vector<Maple_App::Netif> Netif::EnumerateInterfaces() {

        /* Declare and initialize variables */

        DWORD dwRetVal = 0;

        unsigned int i = 0;

        // Set the flags to pass to GetAdaptersAddresses
        ULONG flags =
            GAA_FLAG_SKIP_ANYCAST
            | GAA_FLAG_SKIP_MULTICAST
            | GAA_FLAG_SKIP_DNS_SERVER
            | GAA_FLAG_SKIP_FRIENDLY_NAME;

        // default to unspecified address family (both)
        ULONG family = AF_INET;


        PIP_ADAPTER_ADDRESSES pAddresses = NULL;
        ULONG outBufLen = 0;
        ULONG Iterations = 0;

        PIP_ADAPTER_ADDRESSES pCurrAddresses = NULL;
        PIP_ADAPTER_UNICAST_ADDRESS pUnicast = NULL;

        // Allocate a 15 KB buffer to start with.
        outBufLen = WORKING_BUFFER_SIZE;
        std::array<WCHAR, ADDR_BUFFER_SIZE> addrBuf{};
        auto sniffed = Netif::SniffBestInterface();

        do {

            pAddresses = (IP_ADAPTER_ADDRESSES*)MALLOC(outBufLen);
            if (pAddresses == NULL) {
                throw std::bad_alloc{};
            }

            dwRetVal =
                GetAdaptersAddresses(family, flags, NULL, pAddresses, &outBufLen);

            if (dwRetVal == ERROR_BUFFER_OVERFLOW) {
                FREE(pAddresses);
                pAddresses = NULL;
            }
            else {
                break;
            }

            Iterations++;

        } while ((dwRetVal == ERROR_BUFFER_OVERFLOW) && (Iterations < MAX_TRIES));

        if (dwRetVal != NO_ERROR) {
            if (pAddresses) {
                FREE(pAddresses);
            }

            return {};
        }

        // If successful, output some information from the data we received
        std::vector<Maple_App::Netif> ret;
        pCurrAddresses = pAddresses;
        while (pCurrAddresses) {
            if (!(pCurrAddresses->Flags & IP_ADAPTER_IPV4_ENABLED)) {
                pCurrAddresses = pCurrAddresses->Next;
                continue;
            }
            const auto& friendlyName = to_hstring(pCurrAddresses->FriendlyName);

            pUnicast = pCurrAddresses->FirstUnicastAddress;
            if (pUnicast != NULL) {
                for (i = 0; pUnicast != NULL; i++) {
                    // pUnicast->Address.lpSockaddr->sa_family;
                    auto bufSize = static_cast<DWORD>(addrBuf.size());
                    if (FAILED(WSAAddressToStringW(pUnicast->Address.lpSockaddr, pUnicast->Address.iSockaddrLength, nullptr, addrBuf.data(), &bufSize))) {
                        pUnicast = pUnicast->Next;
                        continue;
                    }
                    if (bufSize > 0) {
                        bufSize--;
                    }
                    hstring addr(addrBuf.data(), bufSize);
                    hstring desc{ L"" };
                    if (friendlyName != L"Maple" && std::make_optional(pCurrAddresses->IfIndex) == sniffed) {
                        desc = L"★";
                    }
                    desc = desc + friendlyName + L" (" + addr + L")";
                    ret.emplace_back(winrt::make<Netif>(desc, addr));
                    pUnicast = pUnicast->Next;
                }
            }

            pCurrAddresses = pCurrAddresses->Next;
        }

        FREE(pAddresses);
        return ret;
    }

    std::optional<DWORD> Netif::SniffBestInterface()
    {
        sockaddr saddr{};
        saddr.sa_family = AF_INET;
        saddr.sa_data[0] = 0;
        saddr.sa_data[1] = 53;
        memset(&saddr.sa_data[2], 8, 4);

        DWORD bestIfInd;
        if (FAILED(GetBestInterfaceEx(&saddr, &bestIfInd))) {
            return std::nullopt;
        }
        return { bestIfInd };
    }

}

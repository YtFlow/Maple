#pragma once
#include <queue>
#include <mutex>
#include "leaf.h"
#include "CustomBuffer.h"
#include "winrt/Windows.Networking.Sockets.h"
#include "winrt/Windows.Networking.Vpn.h"

namespace winrt::Maple_Task::implementation
{
    static const hstring CONFIG_PATH_SETTING_KEY = L"CONFIG_PATH";
    static const hstring NETIF_SETTING_KEY = L"NETIF";
    struct VpnPlugin : implements<VpnPlugin, Windows::Networking::Vpn::IVpnPlugIn>
    {
        VpnPlugin() = default;

        void Connect(Windows::Networking::Vpn::VpnChannel const& channel);
        void Disconnect(Windows::Networking::Vpn::VpnChannel const& channel);
        void GetKeepAlivePayload(Windows::Networking::Vpn::VpnChannel const& channel, Windows::Networking::Vpn::VpnPacketBuffer& keepAlivePacket);
        void Encapsulate(Windows::Networking::Vpn::VpnChannel const& channel, Windows::Networking::Vpn::VpnPacketBufferList const& packets, Windows::Networking::Vpn::VpnPacketBufferList const& encapulatedPackets);
        void Decapsulate(Windows::Networking::Vpn::VpnChannel const& channel, Windows::Networking::Vpn::VpnPacketBuffer const& encapBuffer, Windows::Networking::Vpn::VpnPacketBufferList const& decapsulatedPackets, Windows::Networking::Vpn::VpnPacketBufferList const& controlPacketsToSend);

    private:
        void StopLeaf();

        Leaf* m_leaf{};
        NetStackHandle* m_netStackHandle{};
        Windows::Networking::Sockets::DatagramSocket m_backTransport{ nullptr };
        std::mutex m_decapQueueLock{};
        std::queue<std::vector<uint8_t>> m_decapQueue{};
    };
    static const uint8_t dummyArr[] = { 0 };
    static const auto dummyBuffer = winrt::make<CustomBuffer>(const_cast<uint8_t *>(static_cast<const uint8_t *>(dummyArr)), static_cast<uint32_t>(sizeof(dummyArr)));
    static auto VpnPluginInstance = winrt::make_self<VpnPlugin>();
}

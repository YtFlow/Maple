#pragma once

extern "C" {
    typedef void Leaf;
    Leaf* uwp_run_leaf(const char* path, void on_dns(const char*));
    Leaf* uwp_run_leaf_with_config_content(const char* config, size_t len, void on_dns(const char*));
    void uwp_stop_leaf(Leaf* leaf);

    typedef void NetStackHandle;
    typedef int32_t NetStackSendResult;
    NetStackHandle* netstack_register(void on_receive(uint8_t*, size_t, void*), void* context);
    NetStackSendResult netstack_send(NetStackHandle*, uint8_t*, size_t);
    void* netstack_release(NetStackHandle* ptr);
}


#pragma once

extern "C" {
    typedef void Leaf;
    Leaf* run_leaf(const char* path, void on_dns(const char*));
    void stop_leaf(Leaf* leaf);

    typedef void NetStackHandle;
    typedef int32_t NetStackSendResult;
    NetStackHandle* netstack_register(void on_receive(uint8_t*, size_t, void*), void* context);
    NetStackSendResult netstack_send(NetStackHandle*, uint8_t*, size_t);
    void* netstack_release(NetStackHandle* ptr);
}


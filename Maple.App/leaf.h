#pragma once

#include <cstdint>

extern "C" {
    const int32_t LEAF_ERR_OK = 0;
    const int32_t LEAF_ERR_CONFIG = 2;
    int32_t leaf_test_config(const char* config_path);
}

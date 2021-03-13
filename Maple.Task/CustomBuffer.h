#pragma once
#include "pch.h"
#include "unknwnbase.h"
#include "winrt/Windows.Storage.Streams.h"

struct __declspec(uuid("905a0fef-bc53-11df-8c49-001e4fc686da")) IBufferByteAccess : ::IUnknown
{
    virtual HRESULT __stdcall Buffer(uint8_t** value) = 0;
};

struct CustomBuffer : winrt::implements<CustomBuffer, winrt::Windows::Storage::Streams::IBuffer, IBufferByteAccess>
{
    uint8_t* m_buffer;
    uint32_t m_length{};

    CustomBuffer(uint8_t *buffer, uint32_t size) :
        m_buffer(buffer), m_length(size)
    {
    }

    uint32_t Capacity() const
    {
        return m_length;
    }

    uint32_t Length() const
    {
        return m_length;
    }

    void Length(uint32_t value)
    {
        if (value > m_length)
        {
            throw winrt::hresult_invalid_argument();
        }

        m_length = value;
    }

    HRESULT __stdcall Buffer(uint8_t** value) final
    {
        *value = m_buffer;
        return S_OK;
    }
};

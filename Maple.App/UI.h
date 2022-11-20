#pragma once

namespace winrt::Maple_App::implementation
{
    struct UI
    {
        static void NotifyUser(hstring msg, hstring title);
        static void NotifyUser(char const* msg, hstring title);
        static void NotifyException(std::wstring_view context);
    };
}


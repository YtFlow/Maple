#include "pch.h"
#include "MmdbPage.h"
#if __has_include("MmdbPage.g.cpp")
#include "MmdbPage.g.cpp"
#endif

using namespace winrt;
using namespace Windows::UI::Xaml;

namespace winrt::Maple_App::implementation
{
    MmdbPage::MmdbPage()
    {
        InitializeComponent();
    }

}

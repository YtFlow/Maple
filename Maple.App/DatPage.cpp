#include "pch.h"
#include "DatPage.h"
#if __has_include("DatPage.g.cpp")
#include "DatPage.g.cpp"
#endif

using namespace winrt;
using namespace Windows::UI::Xaml;

namespace winrt::Maple_App::implementation
{
    DatPage::DatPage()
    {
        InitializeComponent();
    }

}

#include "pch.h"
#include "CertPage.h"
#if __has_include("CertPage.g.cpp")
#include "CertPage.g.cpp"
#endif

using namespace winrt;
using namespace Windows::UI::Xaml;

namespace winrt::Maple_App::implementation
{
    CertPage::CertPage()
    {
        InitializeComponent();
    }
}

#include "pch.h"
#include "EditPage.h"
#if __has_include("EditPage.g.cpp")
#include "EditPage.g.cpp"
#endif

using namespace winrt;
using namespace winrt::Windows::Storage::Streams;
using namespace winrt::Windows::UI::Text;

namespace winrt::Maple_App::implementation
{
    EditPage::EditPage()
    {
        InitializeComponent();
    }

    fire_and_forget EditPage::OnNavigatedTo(NavigationEventArgs const& e) {
        const auto lifetime = get_strong();
        const auto& param = e.Parameter().as<Maple_App::ConfigViewModel>();

        m_file = param.File();
        try {
            const auto& text = co_await FileIO::ReadTextAsync(param.File(), UnicodeEncoding::Utf8);
            EditBox().Document().SetText(TextSetOptions::None, text);
        }
        catch (const winrt::hresult_error&) {
            EditBox().Document().SetText(TextSetOptions::None, L"Invalid configuration file");
        }
        const auto weakThis = lifetime->get_weak();
        m_saveModifiedContent = [weakThis]() -> IAsyncAction {
            if (const auto self{ weakThis.get() }) {
                return self->SaveDocument();
            }
            return {};
        };
    }
    void EditPage::OnNavigatingFrom(NavigatingCancelEventArgs const&) {
        if (m_file == nullptr || !m_file.IsAvailable()) {
            return;
        }
        SaveDocument();
    }

    void EditPage::EditBox_TextChanging(IInspectable const&, RichEditBoxTextChangingEventArgs const&)
    {
        if (m_loaded == 2) {
            SaveModifiedContent = m_saveModifiedContent;
            SaveButton().IsEnabled(true);
        }
        else {
            m_loaded++;
        }
    }
    void EditPage::SaveButton_Click(IInspectable const&, RoutedEventArgs const&) {
        SaveDocument();
    }
    void EditPage::HelpButton_Click(IInspectable const&, RoutedEventArgs const&) {
        const auto _ = winrt::Windows::System::Launcher::LaunchUriAsync(Uri{ L"https://github.com/eycorsican/leaf/blob/master/README.zh.md" });
    }
    IAsyncAction EditPage::SaveDocument()
    {
        if (!SaveButton().IsEnabled()) {
            co_return;
        }
        SaveModifiedContent = nullptr;
        SaveButton().IsEnabled(false);
        hstring content{};
        EditBox().Document().GetText(TextGetOptions::NoHidden | TextGetOptions::UseCrlf | TextGetOptions::AllowFinalEop, content);
        const auto data = to_string(content);
        co_return co_await FileIO::WriteBytesAsync(
            m_file,
            std::vector<uint8_t>(data.begin(), data.end()));
    }
}




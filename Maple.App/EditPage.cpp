#include "pch.h"
#include "EditPage.h"
#if __has_include("EditPage.g.cpp")
#include "EditPage.g.cpp"
#endif

using namespace std::literals::chrono_literals;
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
    fire_and_forget EditPage::SaveButton_Click(IInspectable const& sender, RoutedEventArgs const&) {
        const auto lifetime = get_strong();
        const auto& placementTarget = sender.try_as<FrameworkElement>();
        const auto currentValidateRequest = ++validateRequest;
        ValidConfigFlyout().Hide();
        InvalidConfigFlyout().Hide();
        co_await SaveDocument();
        if (validateRequest != currentValidateRequest) {
            co_return;
        }

        // Validate
        const auto& path = winrt::to_string(m_file.Path());
        co_await winrt::resume_background();
        const auto result = leaf_test_config(path.data());
        co_await winrt::resume_foreground(Dispatcher());
        if (validateRequest != currentValidateRequest) {
            co_return;
        }
        switch (result)
        {
        case LEAF_ERR_OK:
            ValidConfigFlyout().ShowAt(placementTarget);
            break;
        case LEAF_ERR_CONFIG:
            InvalidConfigFlyout().ShowAt(placementTarget);
            break;
        default:
            // TODO: handle errors
            break;
        }
        co_await winrt::resume_after(2s);
        co_await winrt::resume_foreground(Dispatcher());
        if (validateRequest != currentValidateRequest) {
            co_return;
        }
        ValidConfigFlyout().Hide();
        InvalidConfigFlyout().Hide();
    }
    void EditPage::HelpButton_Click(IInspectable const&, RoutedEventArgs const&) {
        const auto _ = winrt::Windows::System::Launcher::LaunchUriAsync(Uri{ L"https://github.com/eycorsican/leaf/blob/master/README.zh.md" });
    }
    IAsyncAction EditPage::SaveDocument()
    {
        const auto lifetime = get_strong();
        if (!SaveButton().IsEnabled()) {
            co_return;
        }
        SaveModifiedContent = nullptr;
        SaveButton().IsEnabled(false);
        hstring content{};
        EditBox().Document().GetText(TextGetOptions::NoHidden | TextGetOptions::UseCrlf, content);
        const auto data = to_string(content);
        co_return co_await FileIO::WriteBytesAsync(
            m_file,
            std::vector<uint8_t>(data.begin(), data.end()));
    }
}


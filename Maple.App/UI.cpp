#include "pch.h"
#include "UI.h"

namespace winrt::Maple_App::implementation
{
    using Windows::UI::Xaml::Controls::ContentDialog;
    using Windows::UI::Xaml::Input::StandardUICommand;
    using Windows::UI::Xaml::Input::StandardUICommandKind;
    using Windows::Foundation::Metadata::ApiInformation;

    void UI::NotifyUser(hstring msg, hstring title)
    {
        static Windows::UI::Core::CoreDispatcher dispatcher{ Windows::UI::Xaml::Window::Current().Dispatcher() };
        static std::vector<std::pair<hstring, hstring>> messages{};
        dispatcher.RunAsync(Windows::UI::Core::CoreDispatcherPriority::Normal,
            [msg = std::move(msg), title = std::move(title)]() -> fire_and_forget {
                messages.push_back(std::make_pair(msg, title));

        static bool isQueueRunning{ false };
        if (std::exchange(isQueueRunning, true))
        {
            co_return;
        }

        // Display all messages until the queue is drained.
        while (messages.size() > 0)
        {
            auto it = messages.begin();
            auto [message, messageTitle] = std::move(*it);
            messages.erase(it);
            ContentDialog dialog;
            if (messageTitle.size() > 0)
            {
                dialog.Title(box_value(std::move(messageTitle)));
            }
            if (ApiInformation::IsTypePresent(L"Windows.UI.Xaml.Input.StandardUICommand"))
            {
                dialog.CloseButtonCommand(StandardUICommand(StandardUICommandKind::Close));
            }
            else if (ApiInformation::IsPropertyPresent(
                L"Windows.UI.Xaml.Controls.ContentDialog", L"CloseButtonText"))
            {
                dialog.CloseButtonText(L"Close");
            }
            else
            {
                dialog.SecondaryButtonText(L"Close");
            }
            dialog.Content(box_value(message));

            co_await dialog.ShowAsync();
        }
        isQueueRunning = false;
            });
    }

    void UI::NotifyUser(char const* msg, hstring title)
    {
        NotifyUser(to_hstring(msg), std::move(title));
    }

    void UI::NotifyException(std::wstring_view context)
    {
        try
        {
            throw;
        }
        catch (hresult_error const& hr)
        {
            NotifyUser(hr.message(), hstring{ L"Error occurred: " } + context);
        }
        catch (std::exception const& ex)
        {
            NotifyUser(ex.what(), hstring{ L"Unexpected exception: " } + context);
        }
    }
}

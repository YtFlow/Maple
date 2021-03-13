#pragma once
#include "VpnTask.g.h"

namespace winrt::Maple_Task::implementation
{
    struct VpnTask : VpnTaskT<VpnTask>
    {
        VpnTask() = default;

        void Run(Windows::ApplicationModel::Background::IBackgroundTaskInstance const& taskInstance);
    };
}
namespace winrt::Maple_Task::factory_implementation
{
    struct VpnTask : VpnTaskT<VpnTask, implementation::VpnTask>
    {
    };
}

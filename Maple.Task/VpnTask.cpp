#include "pch.h"
#include "VpnTask.h"
#include "VpnTask.g.cpp"
#include "VpnPlugin.h"

namespace winrt::Maple_Task::implementation
{
    void VpnTask::Run(Windows::ApplicationModel::Background::IBackgroundTaskInstance const& taskInstance)
    {
        Windows::Networking::Vpn::VpnChannel::ProcessEventAsync(*VpnPluginInstance, taskInstance.TriggerDetails());
    }
}

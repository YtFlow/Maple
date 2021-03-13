# Maple
A lightweight Universal Windows proxy app based on https://github.com/eycorsican/leaf

## Features

- Configuration management
- Outbound network adapter selection
- UWP VPN Platform as TUN provider

## TODO

- Log collection (currently logs are sent to Visual Studio Output window for debugging only)
- `external` entries
- VPN On Demand
- Configurable routing entries

## Screenshots

![Settings Page](image/screenshot-setting1.png?raw=true)


## Build

To build Leaf and Maple, a Rust nightly toolchain, Windows 10 SDK 10.0.19041 and Visual Studio 2019 with C++ Development Workflow is required.

1. **Recursively** clone this repository.
2. Open an *x64 Native Tools Command Prompt for VS 2019*.
3. Change working directory to `leaf/leaf-mobile`.
4. Build `leaf.lib` with target `x86_64-uwp-windows-msvc` and Cargo command line flag `-Z build-std=std,panic_abort`.  
   For Release builds, use `--release`.  
   See also https://github.com/eycorsican/leaf#build .
5. Open `Maple.sln` in Visual Studio.
6. Build Solution.


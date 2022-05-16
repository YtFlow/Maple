# Maple
A lightweight Universal Windows proxy app based on https://github.com/eycorsican/leaf

## Features

- Comes with Leaf core:
   - Domain name resolution with built-in DNS processor
   - `tun`/`shadowsocks`/`socks`/`trojan`/`ws` chainable inbounds
   - `direct`/`drop`/`tls`/`ws`/`h2`/`shadowsocks`/`vmess`/`trojan`/`socks` chainable outbounds
   - `failover`/`tryall`/`static` composed outbounds
   - `amux` multiplexing
   - Rule system based on IP, GeoIP and domain name
   - External rules from GeoIP database and V2Ray [Domain List Community](https://github.com/v2fly/domain-list-community)
- Configuration management
- Outbound network adapter selection
- UWP VPN Platform as TUN provider

## Screenshots

![Settings Page](image/screenshot-setting1.png?raw=true)

## Getting Started

Maple as a UWP app is distributed for sideloading only. When installed, it acts as a VPN provider which you will find in the VPN Settings. Use Maple app for configuration management, as well as adding external databases.

### Install

1. Grab the latest package from [Release](https://github.com/YtFlow/Maple/releases) page.
2. Extract everything from the package.
3. Right click the certificate (named `Maple.App_x.y.z.0_x64.cer`) and select Install Certificate.
4. On the Certificate Import Wizard, select **Local Machine**. Administrator privileges may be required to proceed.
5. Import the certificate to the **Trusted Root Certification Authorities** folder. *Note: failure to import the certificate or choosing a wrong certificate store will prevent you from installing the app.*
6. Open the AppxBundle (named `Maple.App_x.y.z.0_x64.appxbundle`) and follow the instructions until Maple is successfully installed on your computer.

### Set up

1. Launch Maple from the Start menu.
2. Edit configuration. Refer to https://github.com/eycorsican/leaf/blob/master/README.zh.md for further explanation.
3. Save the configuration file.
4. If any `EXTERNAL` or `GEOIP` directive is used, drag external database files into `Config` area. V2Ray Domain List Community database can be fetched at https://github.com/v2ray/domain-list-community/releases/latest/download/dlc.dat . For GeoIP database, please go to [MaxMind Developer Portal](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data) and sign up for free download.
5. Rename these databases accordingly (if applicable). By default, GeoIP database is `geo.mmdb` and V2Ray Domain List Community database is `site.dat`.
6. Go to Setting page in Maple. Choose your network adapter such as `Ethernet` or `WLAN`.
7. Launch [Windows Settings](	ms-settings:network-vpn) app.
8. Add a VPN connection.
   - For VPN provider, choose **Maple**.
   - In the Connection name box, enter **Maple**.
   - In the Server name or address box, enter https://github.com/YtFlow/Maple .
   - Select Save.
9. If any Proxy Server has a loopback address (`127.0.0.1` or `::1`), make sure Loopback Exemption is enabled for Maple. See https://docs.microsoft.com/en-us/previous-versions/windows/apps/hh770532(v=win.10) .

### Connect

- Simply click the toggle button on the title bar, or
- In Windows 11, select the battery, network, or volume icon to open the Quick Settings panel. Find **Maple** in VPN panel and connect, or
- In Windows 10, select the Network  icon on the taskbar, and click Maple. In [Windows Settings](	ms-settings:network-vpn) app, select **Maple**, and then Connect.  

*Note: Modifying the current configuration file while VPN is connected will take effect immediately.*

## TODO

- <del>VPN lifecycle management on Maple UI</del>
- Better editing experience
- Log collection (currently logs are sent to Visual Studio Output window for debugging only)
- <del>`external` entries</del>
- VPN On Demand
- Configurable routing entries
- IPv6 support

## Build

To build Leaf and Maple, a Rust `nightly-x86_64-pc-windows-msvc` toolchain, Windows 10 SDK 10.0.22000 and Visual Studio 2022 with C++ Development Workflow are required. [C++/WinRT Visual Studio extension](https://marketplace.visualstudio.com/items?itemName=CppWinRTTeam.cppwinrt101804264) must be installed to generate Windows Metadata.

1. **Recursively** clone this repository.
2. Open a PowerShell Prompt.
3. Change working directory to `leaf`.
4. `cargo build -p leaf-ffi -Z build-std=std,panic_abort --target x86_64-uwp-windows-msvc`.  
   For Release builds, use `cargo build -p leaf-ffi -Z build-std=std,panic_abort --target x86_64-uwp-windows-msvc --release`.  
   See also https://github.com/eycorsican/leaf#build .
5. Open `Maple.sln` in Visual Studio.
6. Build Solution.


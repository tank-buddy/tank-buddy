# Tank Buddy

Tank Buddy is a MicroPython-based project for the ESP32 that monitors the water level in a tank using a TOF200C (VL53L0X) infrared distance sensor. It features a web-based interface and API, runs directly on the ESP32, and supports configuration via Wi-Fi.

## Features

🚰 Real-time tank level monitoring using a VL53L0X sensor
🌐 Built-in web server (API + Web UI)
📶 Wi-Fi configuration via browser (Access Point or Client mode)
📊 Live-updating graph showing percentage fill level (updates every 5 seconds)
🌍 Multilingual UI (English and German, auto-detected via browser language)
🖨️ Printable 3D cases available on Thingiverse for ESP32 and sensor
🧠 Configurable tank height and sensor offset via web interface

## Getting Started

### Prerequisites

Before installation, make sure the following tools are available on your system:
- [`Node.js`](https://nodejs.org/)
- [`pnpm`](https://pnpm.io/)
- [`mpr`](https://github.com/bulletmark/mpr)


### Installation
To upload the source code and web interface to the ESP32, simply run:

```bash
git clone https://github.com/tank-buddy/tank-buddy
cd tank-buddy
make upload
```
The device will start in Access Point mode with the SSID:

```
TankBuddy
```

Connect to it and open a browser to http://192.168.1.1 to access the web UI.

### Configuration

In the Settings tab of the web interface, you can:

- Switch between Access Point and Wi-Fi Client mode
- Set SSID and password
- Adjust tank height and minimum sensor distance

In the Home tab, you'll see the current water level graph, which updates every 5 seconds.

## Web UI
The frontend is built with Preact and served directly from the ESP32. The language is automatically selected based on the browser settings (English or German).

## 3D Printed Case
You can find printable 3D models for the ESP32 and TOF sensor enclosure on Thingiverse — ideal for durable and weatherproof installations.

## File Structure
src/ – MicroPython backend (sensor logic, server, config)
web-ui/ – Preact frontend (builds into static files for the ESP32)
Makefile – Build and upload automation

## License
This project is licensed under the MIT License.

## Links
🔗 GitHub Repository
📦 VL53L0X MicroPython driver
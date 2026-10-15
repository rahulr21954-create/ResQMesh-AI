# RescueMesh Hardware Architecture & Wiring Guide

This guide details the hardware assembly for the **RescueMesh MVP Sensor Node** based on an ESP32 microcontroller, MPU6050 6-axis IMU, and an analog/I2S MEMS acoustic sensor.

---

## 1. Bill of Materials (BOM) per Node

| Component | Specification | Approximate Cost | Role |
| :--- | :--- | :--- | :--- |
| **ESP32 Dev Module** | ESP-WROOM-32 (30/38 pin) | \$3.50 | Node Controller, ADC sampling, Wi-Fi / LoRa transmission |
| **Vibration Sensor** | MPU6050 (GY-521) 6-DOF IMU | \$1.20 | Structural vibration, peak acceleration, crest factor |
| **Acoustic Sensor** | MAX9814 / INMP441 MEMS Mic | \$1.80 | Acoustic survivor tapping / vocalization sensing |
| **Status Indicators** | Red & Green 5mm LEDs + 330Ω resistors | \$0.20 | Visual beacon for search-and-rescue teams |
| **Audio Buzzer** | 3.3V Active Buzzer | \$0.30 | Acoustic homing beacon |
| **Power Supply** | 18650 Li-Ion Cell + TP4056 + 3.3V LDO | \$3.00 | Portable autonomous field operation |
| **Total per Node** | | **~\$10.00** | Ultra-low cost, rapidly expendable search nodes |

---

## 2. Pinout & Connection Matrix

### A. MPU6050 (GY-521) to ESP32 (I2C)
| MPU6050 Pin | ESP32 Pin | Function | Notes |
| :--- | :--- | :--- | :--- |
| **VCC** | 3.3V | Power (3.3V) | Do not connect to 5V if onboard LDO is absent |
| **GND** | GND | Ground | Common Ground |
| **SCL** | GPIO 22 | I2C Clock | Hardware I2C Clock |
| **SDA** | GPIO 21 | I2C Data | Hardware I2C Data |
| **AD0** | GND | I2C Address select | Sets address to `0x68` (or 3.3V for `0x69`) |
| **INT** | Optional (GPIO 19) | Motion interrupt | Can wake ESP32 from Deep Sleep on vibration |

---

### B. Acoustic Sensor (MAX9814 or Analog MEMS)
| Microphone Pin | ESP32 Pin | Function | Notes |
| :--- | :--- | :--- | :--- |
| **VCC** | 3.3V | Power | Filter with 10µF capacitor for clean audio ADC |
| **GND** | GND | Ground | Common Ground |
| **OUT / MIC** | GPIO 34 | Analog Signal (ADC1_CH6) | ADC1 does not conflict with Wi-Fi |
| **GAIN** | 3.3V or GND | Gain selection | Leave floating for 60dB, connect to GND for 50dB |

---

### C. Actuators & Indicators
| Actuator | ESP32 Pin | Logic | Notes |
| :--- | :--- | :--- | :--- |
| **Green Status LED** | GPIO 2 | Active HIGH | Blinks during Wi-Fi pairing; Solid when active |
| **Red Alert LED** | GPIO 4 | Active HIGH | Flashes during verified survivor tapping / anomaly |
| **Active Buzzer** | GPIO 15 | Active HIGH | Sound pulse to assist rescuers locating node |

---

## 3. Flashing the Firmware

1. Install the **Arduino IDE** (or VS Code + PlatformIO).
2. Install the **ESP32 Board Package** in Boards Manager:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Required Libraries:
   - `WiFi.h` (Built-in)
   - `HTTPClient.h` (Built-in)
   - `Wire.h` (Built-in)
4. Open `RescueMesh_Node.ino`.
5. Update your Wi-Fi credentials (`WIFI_SSID` and `WIFI_PASSWORD`).
6. Set the `GATEWAY_URL` to your computer's local IP address (e.g. `http://192.168.1.100:5000/api/telemetry`).
7. Select **ESP32 Dev Module**, choose your COM port, and click **Upload**.

---

## 4. Field Mesh Architecture (LoRa Expansion)

For actual rubble operations where 2.4 GHz Wi-Fi might suffer high absorption through wet concrete:
- **SX1278 (433/868/915 MHz) SPI Module**:
  - `SCK` -> GPIO 18
  - `MISO` -> GPIO 19
  - `MOSI` -> GPIO 23
  - `NSS` -> GPIO 5
  - `DIO0` -> GPIO 26
- Penetrates concrete rubble and provides 1-2 km sub-GHz mesh range back to the command center Raspberry Pi.

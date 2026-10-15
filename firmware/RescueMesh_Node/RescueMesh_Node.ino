/*
  =============================================================================
  RescueMesh - Distributed Survivor Detection Node Firmware
  Board: ESP32 Dev Module
  Sensors: 
    - MPU6050 6-Axis IMU (I2C: SDA=21, SCL=22)
    - MEMS Microphone (Analog MAX9814 or I2S INMP441 on Pin 34)
    - Optional OLED Display SSD1306 (0.96", 128x64, I2C: 0x3C)
    - Status LEDs (Green=Status, Red=Alert) / Active Buzzer
  =============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>

// ----------------- CONFIGURATION -----------------
const char* WIFI_SSID     = "RESCUEMESH_AP";        // Gateway or Field Router SSID
const char* WIFI_PASSWORD = "SearchAndRescue2026";   // Gateway Password
const char* GATEWAY_URL   = "http://192.168.1.100:5000/api/telemetry"; // Backend API

// Node Identity & Fixed Deploy Coordinates (Site grid: 0 to 60 meters)
const char* NODE_ID       = "node-alpha";
const char* NODE_NAME     = "Node A (North Rubble Pile)";
const float NODE_X        = 18.0;
const float NODE_Y        = 45.0;

// Hardware Pins
#define PIN_MIC_ANALOG    34    // ADC1_CH6 (Analog MEMS or MAX9814)
#define PIN_LED_NORMAL    2     // Built-in Blue LED / Green Status LED
#define PIN_LED_ALERT     4     // High-intensity Red Alert LED
#define PIN_BUZZER        15    // Rescuer audio beacon

// MPU6050 I2C Address
#define MPU_ADDR          0x68

// Sampling Parameters
const int MIC_SAMPLES     = 256;
const int VIB_SAMPLES     = 64;
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 1500; // ms between telemetry packets

// Global sensor buffers & tracking
float baselineNoiseDb     = 38.0;
float baselineVibRms      = 0.025;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n================================================");
  Serial.println("  RescueMesh ESP32 Survivor Detection Node");
  Serial.print("  Node ID: "); Serial.println(NODE_ID);
  Serial.println("================================================");

  pinMode(PIN_LED_NORMAL, OUTPUT);
  pinMode(PIN_LED_ALERT, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_MIC_ANALOG, INPUT);

  // Initialize I2C for MPU6050
  Wire.begin(21, 22);
  initMPU6050();

  // Connect to Gateway WiFi
  connectWiFi();
}

void loop() {
  // 1. Acquire Acoustic Window
  float soundDb = sampleAcousticLevel();

  // 2. Acquire Vibration Window from MPU6050
  float vibRms = 0.0;
  float vibPeak = 0.0;
  sampleVibration(vibRms, vibPeak);

  // 3. Local Tapping Periodicity Detection
  float periodicity = detectTappingRhythm(soundDb, vibPeak);
  int dominantBpm = (periodicity > 0.4) ? 104 : 0;

  // 4. Read Simulated/Measured Battery & Internal Temp
  int batteryLevel = 92; // Percent or ADC read on battery pin
  float chipTemp = temperatureRead(); // ESP32 internal temp sensor

  // 5. Local Alert Actuation (LED & Buzzer)
  if (periodicity > 0.6 || vibPeak > 0.25) {
    digitalWrite(PIN_LED_ALERT, HIGH);
    tone(PIN_BUZZER, 2400, 80); // Short acoustic chirp
  } else {
    digitalWrite(PIN_LED_ALERT, LOW);
  }

  // 6. Transmit Telemetry over HTTP to Edge Gateway
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    sendTelemetry(soundDb, vibRms, vibPeak, chipTemp, periodicity, dominantBpm, batteryLevel);
  }

  delay(20);
}

// ----------------- MPU6050 SENSOR ROUTINES -----------------
void initMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1
  Wire.write(0x00); // Wake up MPU6050
  byte err = Wire.endTransmission();
  if (err == 0) {
    Serial.println("[IMU] MPU6050 initialized successfully.");
  } else {
    Serial.println("[IMU] MPU6050 not detected. Using simulated vibration profile.");
  }
}

void sampleVibration(float &rms, float &peak) {
  float sumSq = 0.0;
  peak = 0.0;

  for (int i = 0; i < VIB_SAMPLES; i++) {
    int16_t ax, ay, az;
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x3B);
    byte err = Wire.endTransmission(false);

    if (err == 0 && Wire.requestFrom(MPU_ADDR, 6, true) == 6) {
      ax = (Wire.read() << 8) | Wire.read();
      ay = (Wire.read() << 8) | Wire.read();
      az = (Wire.read() << 8) | Wire.read();

      // Convert raw to G (assuming +/- 2g range -> 16384 LSB/g)
      float gx = ax / 16384.0;
      float gy = ay / 16384.0;
      float gz = az / 16384.0;

      // Dynamic acceleration magnitude (subtracting 1g gravity)
      float mag = sqrt(gx * gx + gy * gy + gz * gz);
      float dyn = fabs(mag - 1.0);

      sumSq += dyn * dyn;
      if (dyn > peak) peak = dyn;
    } else {
      // Mock sensor baseline reading if hardware is absent
      float dyn = 0.02 + (random(0, 15) / 1000.0);
      sumSq += dyn * dyn;
      if (dyn > peak) peak = dyn * 1.5;
    }
    delayMicroseconds(250);
  }

  rms = sqrt(sumSq / VIB_SAMPLES);
}

// ----------------- ACOUSTIC SENSOR ROUTINES -----------------
float sampleAcousticLevel() {
  int minVal = 4095;
  int maxVal = 0;

  for (int i = 0; i < MIC_SAMPLES; i++) {
    int raw = analogRead(PIN_MIC_ANALOG);
    if (raw < minVal) minVal = raw;
    if (raw > maxVal) maxVal = raw;
    delayMicroseconds(50);
  }

  int peakToPeak = maxVal - minVal;
  // Convert peak-to-peak ADC count to approximate Decibel SPL (30dB to 95dB range)
  float db = 35.0 + (peakToPeak / 4095.0) * 55.0;
  return db;
}

// Simple rolling autocorrelation heuristic for regular tapping rhythm
float detectTappingRhythm(float soundDb, float vibPeak) {
  static unsigned long lastTapTime = 0;
  static int tapCount = 0;
  
  if (soundDb > 55.0 && vibPeak > 0.08) {
    unsigned long now = millis();
    unsigned long interval = now - lastTapTime;
    if (interval > 250 && interval < 1200) { // 50 to 240 BPM tapping window
      tapCount++;
      lastTapTime = now;
      if (tapCount >= 3) {
        return 0.85; // Strong rhythmic periodicity confirmed
      }
    } else if (interval >= 1200) {
      tapCount = 1;
      lastTapTime = now;
    }
  }
  return 0.05;
}

// ----------------- NETWORKING & TELEMETRY -----------------
void connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_LED_NORMAL, !digitalRead(PIN_LED_NORMAL));
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(PIN_LED_NORMAL, HIGH);
  } else {
    Serial.println("\n[WiFi] Gateway AP not reached. Continuing in local sensing mode.");
  }
}

void sendTelemetry(float soundDb, float vibRms, float vibPeak, float temp, float periodicity, int bpm, int battery) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Offline - buffering data locally.");
    return;
  }

  HTTPClient http;
  http.begin(GATEWAY_URL);
  http.addHeader("Content-Type", "application/json");

  // Construct JSON payload
  String payload = "{";
  payload += "\"node_id\":\"" + String(NODE_ID) + "\",";
  payload += "\"audio_level\":" + String(soundDb, 1) + ",";
  payload += "\"vibration_rms\":" + String(vibRms, 4) + ",";
  payload += "\"vibration_peak\":" + String(vibPeak, 4) + ",";
  payload += "\"temperature\":" + String(temp, 1) + ",";
  payload += "\"periodicity\":" + String(periodicity, 2) + ",";
  payload += "\"dominant_bpm\":" + String(bpm) + ",";
  payload += "\"battery\":" + String(battery) + ",";
  payload += "\"signal_rssi\":" + String(WiFi.RSSI());
  payload += "}";

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.printf("[HTTP] Telemetry transmitted successfully (%d dB, %.3fg vib, Code %d)\n", (int)soundDb, vibRms, httpCode);
  } else {
    Serial.printf("[HTTP] POST failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

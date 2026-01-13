---
title: Voice-Controlled Home Automation System
description: ESP32-based voice automation with TinyML wake-word detection
img: https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop
importance: 4
category: Embedded Systems
technologies: [C/C++, Python, TensorFlow Lite, ESP32, JavaScript]
status: Completed
links:
  github: "#"
---

This project brings voice control to home automation through an embedded system built around the ESP32 microcontroller with on-device wake-word detection using TinyML.

## TinyML Wake-Word Detection

- **Privacy**: Audio processing happens entirely on-device
- **Latency**: Sub-100ms wake-word detection
- **Reliability**: Operates independently of internet connectivity
- **Accuracy**: >90% detection in typical household noise conditions

## WiFi-Enabled Device Control

- HTTP REST APIs for device control
- MQTT messaging for event coordination
- WebSocket connections for real-time status updates

## Web Interface

Mobile-responsive web interface with real-time device status, manual override controls, and system health monitoring.

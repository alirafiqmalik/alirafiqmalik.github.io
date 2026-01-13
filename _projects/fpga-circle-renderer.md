---
title: FPGA Real-Time Circle Renderer
description: Hardware-accelerated graphics using Bresenham's Circle Algorithm
img: https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop
importance: 5
category: Hardware Design
technologies: [Verilog, FPGA, VGA, Digital Logic]
status: Completed
links:
  github: "#"
---

This project implements hardware-accelerated graphics rendering on an FPGA, demonstrating how geometric algorithms can be translated into parallel digital logic for real-time visual effects.

## Bresenham's Circle Algorithm in Hardware

The hardware implementation exploits the eight-way symmetry of circles, calculating only one octant and mirroring pixels to the other seven octants simultaneously.

## VGA Driver Integration

The circle renderer connects to a custom VGA driver module with:

- Horizontal sync pulses at 31.5 kHz
- Vertical sync pulses at 60 Hz
- Pixel clock signals at 25.175 MHz
- RGB color signals for each pixel

## Real-Time Animation

- **Position interpolation**: Circles move smoothly across the screen
- **Radius animation**: Circles grow and shrink organically
- **Color transitions**: Smooth color gradients and pulsing effects
- **60 FPS performance** regardless of scene complexity

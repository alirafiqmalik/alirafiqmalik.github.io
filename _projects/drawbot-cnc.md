---
title: 2D CNC Machine (Drawbot)
description: G-code controlled drawing robot with motion planning algorithms
img: https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop
importance: 6
category: Embedded Systems
technologies: [C/C++, Python, Arduino, G-code]
status: Completed
links:
  github: "#"
---

This project brings digital designs into the physical world through a custom-built CNC drawing machine. By implementing G-code parsing and motion control algorithms from scratch, the system translates vector graphics into precise mechanical movements.

## System Architecture

The drawbot consists of three main subsystems:

**Mechanical**: XY gantry system using timing belts and linear rails for smooth, accurate motion. A servo-controlled pen lift mechanism enables drawing and positioning moves.

**Electrical**: Stepper motor drivers providing the current and control signals needed to drive NEMA 17 motors. An Arduino microcontroller orchestrates all motion.

**Software**: Embedded C/C++ firmware parsing G-code commands and generating precisely timed step pulses.

## G-Code Parsing

The firmware implements a G-code interpreter supporting standard commands:

- **G00/G01**: Rapid positioning and linear interpolation moves
- **G02/G03**: Circular interpolation (clockwise and counterclockwise arcs)
- **M03/M05**: Pen up and pen down commands
- **G90/G91**: Absolute and relative positioning modes

## Motion Planning

**Bresenham Line Algorithm**: Determines which steps to take on each axis, ensuring the mechanical path closely approximates the desired line.

**Acceleration Profiles**: Trapezoidal velocity profiles for smooth motion.

**Positioning Resolution**: ±0.1mm accuracy across 300mm × 300mm work area.

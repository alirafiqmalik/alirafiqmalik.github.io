---
title: ENIGMA Logic Locking Framework
description: Automated hardware IP protection through logic obfuscation
img: https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop
importance: 2
category: Hardware Security
technologies: [Python, Verilog, RISC-V, EDA Tools]
status: Completed
links:
  github: "#"
---

During my internship at the IC Design Lab, I led the development of ENIGMA, a Python framework designed to automatically insert logic-locking defenses into hardware designs. This project addresses one of the semiconductor industry's most pressing concerns: protecting intellectual property from unauthorized use and reverse engineering.

## The Hardware Security Challenge

Modern integrated circuits represent significant investments in design time and intellectual property. However, the globalized semiconductor supply chain introduces vulnerabilities where designs can be stolen, overproduced, or reverse-engineered. Logic locking emerged as a promising countermeasure by inserting additional logic that renders a chip non-functional without the correct key.

## Framework Architecture

ENIGMA automates the complex process of inserting logic-locking mechanisms into hardware designs. The framework accepts synthesized netlists and applies various locking algorithms, inserting key gates at strategic locations throughout the circuit. The system is highly parametrized, supporting key sizes ranging from 64 to 256 bits depending on the desired security level.

One of ENIGMA's key innovations is its flexibility with user-defined cell libraries. This allows designers to work with different process technologies and vendor-specific components while maintaining compatibility across various design flows.

## Performance Analysis and Optimization

A critical aspect of any security feature is its overhead cost. Through ENIGMA, I conducted extensive analysis on the impact of logic obfuscation on three key metrics: chip area, propagation delay, and power consumption.

Working with proprietary RISC-V processor designs, I optimized the locking algorithms to achieve less than 3% area overhead while maintaining strong security properties. This low overhead makes the technology practical for commercial deployment, where cost constraints are paramount.

## Parametrized Key Insertion

The framework's parametrized approach allows designers to balance security requirements against overhead constraints. Key insertion points are selected using intelligent algorithms that consider both security effectiveness and implementation cost. The system supports various locking techniques including:

- Random logic locking for baseline protection
- Fault analysis-resistant locking for enhanced security
- Strong logic locking against SAT-based attacks
- Hybrid approaches combining multiple techniques

## Real-World Validation

Testing on proprietary RISC-V designs validated ENIGMA's practical applicability. The framework successfully processed complex processor architectures while maintaining the functional correctness of the original design. The sub-3% overhead demonstrated that robust security could be achieved without significantly impacting commercial viability.

This work contributes to making hardware IP protection accessible to design houses of all sizes, not just large corporations with dedicated security teams. The automated nature of ENIGMA significantly reduces the expertise and time required to implement effective logic locking.

## Project Details

- **Duration:** June 2022 - September 2022
- **Institution:** National University of Sciences & Technology, Pakistan
- **Lab:** IC Design Lab

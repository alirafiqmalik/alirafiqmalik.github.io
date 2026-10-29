---
title: Logic Locking Lab
description: Gate-level logic locking, netlist conversion, and oracle-guided SAT attacks
img: https://images.unsplash.com/photo-1518773553398-650c184e0bb3?w=800&h=400&fit=crop
importance: 2
category: Hardware Security
domain: [Security & Privacy, Hardware & Silicon]
stack: [RTL & FPGA, Tooling & Automation]
setting: Coursework
track: Silicon & RTL
technologies: [Python, Verilog, Z3, Yosys]
status: Active
links:
  github: https://github.com/alirafiqmalik/logic-locking-lab
  docs: https://github.com/alirafiqmalik/logic-locking-lab/blob/main/README.md
---

Logic Locking Lab is a Python toolkit for gate-level logic locking and for recovering keys with an oracle-guided SAT attack. It started as my final-year project and now has a small, tested entry point for locking a circuit, attacking it, and checking that the recovered key matches the oracle.

[ENIGMA](/projects/enigma-logic-locking/) is the internship framework that inserts locks into processor designs and measures area, delay, and power. This repository is the public toolkit for the locking methods and the attack.

## Locking and conversion

Circuits are BENCH netlists represented as directed graphs. Random logic locking and strong logic locking insert XOR and XNOR key gates. Separate Verilog generators emit AntiSAT and Hamming-distance SFLL modules. Helpers convert between BENCH and gate-level Verilog. Optional synthesis commands call Yosys when it is on `PATH`.

## The attack

The SAT attack searches for a distinguishing input: a pattern on which two candidate keys produce different outputs. That input is evaluated on an unlocked reference circuit, both candidates are constrained to agree with the reference, and the search repeats. When the candidates can no longer be told apart, the solver returns a key. A Z3 miter then checks whether the recovered circuit can still disagree with the oracle.

The included AND-gate example is small enough to read by hand. One XOR key gate locks `y = a AND b`, and the attack recovers the key in a single iteration. The oracle is a local circuit model.

## Scope

The tested attack covers combinational circuits and the Boolean gates in the circuit builder. Parsers expect the BENCH and gate-level Verilog shapes used by the fixtures. A recovered key can be functionally equivalent to the inserted key without repeating the original bit pattern. Spreadsheets kept from the original experiments are historical artifacts; they are not a validated performance comparison.

## Project Details

- **Origin:** Final-year project
- **Attack:** Distinguishing-input SAT attack with a Z3 equivalence miter

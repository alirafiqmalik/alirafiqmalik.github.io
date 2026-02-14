---
title: Scalar RISC-V Microprocessor
description: 5-stage pipelined processor with hazard detection and forwarding
img: https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop
importance: 4
category: Hardware Design
technologies: [Verilog, Python, RISC-V, Digital Logic]
status: Completed
links:
  github: "#"
---

This project implements a complete RISC-V processor core from scratch, demonstrating the principles of pipelined computer architecture. The design achieves instruction-level parallelism through a classic 5-stage pipeline while maintaining correctness through sophisticated hazard detection and data forwarding mechanisms.

## Pipeline Architecture

The processor implements the traditional five-stage pipeline:

1. **Instruction Fetch (IF)**: Retrieves instructions from memory
2. **Instruction Decode (ID)**: Decodes instructions and reads register file
3. **Execute (EX)**: Performs ALU operations and address calculations
4. **Memory (MEM)**: Accesses data memory for loads and stores
5. **Write Back (WB)**: Writes results back to register file

## Hazard Detection and Resolution

Pipelining introduces data, control, and structural hazards that must be resolved to maintain program correctness:

**Data Hazards**: Detected when an instruction depends on results from previous instructions still in the pipeline. The forwarding unit resolves most hazards by routing data directly from pipeline registers, avoiding stalls.

**Control Hazards**: Branch and jump instructions require special handling. The design implements branch prediction and uses the ALU in the EX stage for early branch resolution, minimizing pipeline flushes.

**Load-Use Hazards**: When a load instruction is immediately followed by an instruction using the loaded data, a pipeline stall is unavoidable. The hazard detection unit identifies these cases and inserts bubbles appropriately.

## Testing and Verification

A comprehensive verification strategy ensures processor correctness:

**Randomized Test Generation**: Python scripts generate randomized instruction sequences covering all instruction types, edge cases, and hazard scenarios. This approach reveals corner cases that manual test writing might miss.

**Waveform Analysis**: Detailed signal tracing through simulation enables verification of control signals, data paths, and timing at the cycle level. Each pipeline stage's behavior is validated against expected results.

**ISA Compliance**: The processor is verified against RISC-V ISA specifications, ensuring correct execution of the RV32I base integer instruction set.

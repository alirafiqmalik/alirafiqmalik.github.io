---
title: Certified Qubit Confinement
description: Lean 4 confinement checks for untrusted quantum-cloud transpiler output
img: https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=400&fit=crop
importance: 1
category: Formal Verification
domain: [Security & Privacy]
stack: [Tooling & Automation]
setting: Research & Lab Work
track: ML & Security
technologies: [Lean 4, Python, OpenQASM, Qiskit]
status: Published
links:
  github: https://github.com/alirafiqmalik/certified-confinement-acm-pqqs-26-artifacts
  paper: https://doi.org/10.1145/3839338.3857240
  docs: https://github.com/alirafiqmalik/certified-confinement-acm-pqqs-26-artifacts/blob/main/docs/USAGE.md
---

This repository is the research artifact for *Certified Confinement: Kernel-Checked Validation of Untrusted Quantum-Cloud Transpiler Output*, with Muhammad Taqi Raza, at ACM PQQS 2026.

A circuit can obey every device connectivity rule and still touch another tenant's qubits. The artifact checks untrusted transpiler output against both the device coupling graph and a tenant-defined forbidden region. A Lean 4 soundness theorem, checked by the kernel, states that an accepted result entails hardware legality and support confinement for the represented circuit.

## What the checker decides

The front end parses a restricted OpenQASM subset and rejects unsupported statements. The validator then applies two checks:

- **Hardware legality** against the device coupling graph
- **Support confinement**, so no non-identity gate touches the forbidden region

Buffered policies expand that region by a chosen number of graph hops, then run the same check. Validation does not simulate the quantum state. The executable pipeline also includes routing and optimization passes with their own proved properties.

## Evidence shipped with the artifact

The repository keeps the published records under `harness/` and reproduces them with `run_artifact.sh`. A core run needs no IBM account. It covers:

- Proofs and axiom dependencies
- Eleven device topologies, with verdicts recomputed independently of the Lean checker
- Four sample circuits with known accept and reject outcomes
- A QASMBench-small confinement sweep on a 12-node ring
- A front-end fuzzing comparison between the old parser and the safe parser
- Reconciliation of the published IBM hardware counts from raw measurement records

## Scope

Acceptance is a structural guarantee for the circuit the checker represents. Physical crosstalk sits outside that claim. The driver accepts an OpenQASM subset, and the hardware measurements motivate the policy rather than forming part of the proof.

## Project Details

- **Venue:** ACM PQQS 2026
- **Paper:** [doi.org/10.1145/3839338.3857240](https://doi.org/10.1145/3839338.3857240)

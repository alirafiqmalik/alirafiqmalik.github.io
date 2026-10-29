---
title: eSIM Research Lab
description: Toolkit for eUICC inspection, RSP capture, and eSIM protocol analysis
img: https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop
importance: 2
category: Mobile Security
domain: [Security & Privacy, Networks & Distributed Systems]
stack: [Networking & Protocols, Tooling & Automation]
setting: Research & Lab Work
track: ML & Security
technologies: [Python, Android, ADB, SGP.22]
status: Active
links:
  github: https://github.com/alirafiqmalik/esim-research-tools
  docs: https://github.com/alirafiqmalik/esim-research-tools/blob/main/docs/README.md
---

eSIM Research Lab is a Python toolkit for inspecting Android eUICCs, capturing Remote SIM Provisioning traffic, and exploring how the protocol behaves. The core CLI talks to a phone over ADB. Offline analysis reads a saved session. The simulator and the fuzzers are separate entry points.

## What the toolkit covers

- **Device inspection.** Read the eUICC identifier, list subscriptions, and snapshot device state.
- **Capture.** Record proxy traffic, filtered logcat, and eUICC snapshots, then extract ES9+ and ES11 calls and profile packages from the bundle.
- **eUICC control.** OpenEUICC-backed commands, APDU transport, and BER-TLV handling.
- **Sequence diagrams.** Turn an OpenEUICC capture log into a Graphviz message sequence.
- **Local simulation.** `ecosim` models an MNO → SM-DP+ → LPA → eUICC flow, including channel inspection and message mutation.
- **Fuzzing.** Separate harnesses explore APDU inputs and local SM-DS responses.
- **Modem traces.** A documented Pixel 7a setup captures and decodes NAS/RRC attach traces.

A capture session stores the proxy flows, the filtered Android log, start and end eUICC snapshots, and device metadata. Analysis can be run from the `esim` CLI or from the same Python API.

## Scope

This is a research testbed. Live results depend on the phone, the Android build, the LPA, and the network path recorded with each experiment. `ecosim` is a software model of the provisioning flow; its reports are about that model. Device captures and subscriber data stay in local session directories.

## Project Details

- **Package:** `esim` CLI and Python API
- **Protocols:** GSMA Remote SIM Provisioning (SGP.22), ES9+, ES11

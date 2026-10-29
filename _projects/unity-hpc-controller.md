---
title: Unity HPC Controller
description: Headless campaign controller for reproducible jobs on Unity Slurm
img: https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=400&fit=crop
importance: 2
category: Research Computing
domain: [Networks & Distributed Systems]
stack: [Tooling & Automation, Networking & Protocols]
setting: Research & Lab Work
track: ML & Security
technologies: [Python, Slurm, SQLite, OpenSSH]
status: Active
links:
  github: https://github.com/alirafiqmalik/unity-hpc-controller
  docs: https://github.com/alirafiqmalik/unity-hpc-controller/blob/main/docs/README.md
---

Unity HPC Controller is a headless Python service for research campaigns on the Unity Slurm cluster. A project declares commands, resources, dependencies, and the files it expects back. The controller freezes that bundle, places the tasks, reconciles attempts, and retrieves results after the submitting client has exited.

The scientific method stays in the project. The controller checks declared outputs and hardware evidence. Slurm owns allocation and start times.

## What a campaign can rely on

- **Frozen source.** The experiment bundle is snapshotted before execution. An identical declaration reuses the same campaign identity.
- **Hardware consistency.** A model class stores a GPU fingerprint, and assigned-device evidence is checked before a result is accepted.
- **Recoverable attempts.** Submission intent is written before SSH. Uncertain outcomes are reconciled before anything is submitted again.
- **Bounded recovery.** Declared infrastructure failures retry inside a durable budget. Transfer retries do not repeat the compute.
- **Incremental results.** Declared output files are required, and clients resume from a durable result cursor.
- **Evidence-aware placement.** Hardware and policy are filtered first. Compatible partitions are then ranked with measured wait history.

State lives outside the install: a SQLite campaign journal, immutable bundles, retrieved artifacts, and a separate telemetry archive. The service itself uses the Python standard library.

## How you drive it

`scripts/hpc-controller` runs the HTTP API. `scripts/hpc-campaign` configures cluster access, plans a declaration, submits it, watches the campaign, and reads results. Planning is read-only. Submission is what permits cluster work.

The same HTTP operations are exposed to agent clients through an MCP server. Skills for connecting, dispatching, and diagnosing the backend are published in the PhD Agentic Tools marketplace under the install id `unity-hpc`.

## Project Details

- **Cluster:** Unity (Slurm)
- **License:** MIT

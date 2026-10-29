---
title: Agent Eval HPC
description: Configurable agent evaluation on Unity HPC with isolated sandboxes
img: https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=400&fit=crop
importance: 2
category: Agent Evaluation
domain: [Machine Learning]
stack: [ML & Data Pipelines, Tooling & Automation]
setting: Research & Lab Work
track: ML & Security
technologies: [Python, Harbor, Apptainer, vLLM, Slurm]
status: Active
links:
  github: https://github.com/alirafiqmalik/agent-eval-hpc
  docs: https://github.com/alirafiqmalik/agent-eval-hpc/blob/main/README.md
---

Agent Eval HPC is a modular evaluation framework for running agent experiments on the Unity cluster. An experiment folder collects the dataset, agent settings, prompts, resource request, and scoring tools. [Harbor](https://github.com/harbor-framework/harbor) supplies the job and task formats. This repository connects those jobs to cluster execution and to artifacts you can inspect afterward.

The CLI validates a job, plans it against a Unity HPC controller, submits it, and retrieves trajectories and scores. The same interface can run a job locally when a sandbox image and a model endpoint are already available.

## What a cluster run does

The Unity runner builds or reuses an Apptainer image, starts a local model server, and launches Harbor inside that allocation. Trials share the inference server and keep separate agent workspaces. The runner records execution identity, the resource budget, source attestation, and a receipt for every downloaded artifact.

Two experiments ship with the repository:

- **HumanEval starter.** 164 Python tasks, graded against hidden tests, with a two-task smoke job and a per-trial trajectory.
- **Verus SpecGym.** 581 specification tasks. Scoring covers syntax, precondition and postcondition soundness and completeness, and verifier controls. Long campaigns can be sharded and resumed from completed-trial checkpoints.

Dataset composition for SpecGym is generated from the committed task metadata. Model scores stay with a finished campaign; the repository does not treat an unscored checkout as a benchmark result.

## Traceability

Each run lands in `experiments/<name>/output/<run-id>/` with Harbor logs, a combined trajectory, and score summaries. Collection checks that the run finished and that the hardware receipt matches the request. A new submission uses a new run id.

## Project Details

- **Cluster path:** Unity HPC controller, Apptainer, vLLM
- **Job format:** Harbor

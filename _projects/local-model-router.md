---
title: Local Model Router
description: OpenAI-compatible local router for Ollama and Hugging Face
img: https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=400&fit=crop
importance: 2
category: Local Inference
domain: [Machine Learning]
stack: [ML & Data Pipelines, Tooling & Automation]
setting: Personal Build
track: ML & Security
technologies: [Python, FastAPI, Ollama, Hugging Face]
status: Active
links:
  github: https://github.com/alirafiqmalik/local-model-router
  docs: https://github.com/alirafiqmalik/local-model-router/blob/main/docs/guides/usage.md
---

Local Model Router is a single-machine FastAPI service in front of local inference. Chat requests go to Ollama or an optional Hugging Face engine. Callers name a model directly, or send `model="auto"` and let a small heuristic table pick one.

The router is the piece of local inference I wanted in front of several backends: one OpenAI-compatible API, one CLI, and a dashboard that shows which model actually served the request.

## Routing

Five complexity tiers classify a prompt with no extra model call. Virtual tags (`local:fast`, `local:code`, `local:general`) alias specific Ollama models. Any other Ollama tag is forwarded as-is. `hf:` routes go to the optional engine, which serves Transformers model ids and local GGUF files.

Before a request runs, the router asks the other backend to unload so the two stacks are less likely to occupy the GPU together. That coordination is best-effort. There is no global scheduler, and concurrent requests can still exhaust memory.

Non-streaming responses include `_router` metadata: the selected model, the reason, the provider, and the latency. A live dashboard streams system metrics and recent requests. The `./llm` CLI starts the services, pulls models, and tails logs.

## Scope

The implemented surface is chat completions, SSE streaming, and an embeddings proxy. Tool calling, image inputs, and `/v1/models` are outside it. The sample configuration binds the router to loopback, and the API has no authentication layer. Inference runs locally after the model download.

## Project Details

- **API:** OpenAI-compatible chat on `localhost:8000`
- **Backends:** Ollama and an optional Hugging Face engine

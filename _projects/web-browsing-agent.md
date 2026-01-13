---
title: Web-Browsing Task Agent with Memory
description: A tiny AI agent that browses the web, remembers what it learns, and self-checks answers with a lightweight formal model.
img: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop
importance: 1
category: AI Agents
technologies: [Python, SQLite, OpenAI API, BeautifulSoup, LLM]
status: Completed
links:
  github: "#"
---

A lightweight AI agent that takes a natural-language goal, browses for answers, remembers prior results, supports follow-ups, and checks its final output against a small formal model.

## Features

- Natural-language goals (e.g., "Find the latest average gas price in Newark, NJ")
- Browser/search tool via `requests + BeautifulSoup`
- Memory of prior queries and results for follow-ups
- Answer synthesis with citations (titles + URLs)
- Formal-checker gate before returning answers

## Architecture

The observe → plan → act → reflect loop:

1. **Observe**: Gather context from previous memory and current goal
2. **Plan**: Use LLM to determine search queries
3. **Act**: Execute searches and scrape relevant content
4. **Reflect/Save**: Store results in SQLite, synthesize answer

## Formal Checker

The checker catches common failure modes: hallucinated citations, illegal phase jumps, and unsupported claims. It validates that all cited URLs were actually observed during the search phase.

---
date: 2026-08-07
title: IEEE Quantum Week 2026 Paper
type: Research
organization: IEEE Quantum Week
publication: beyond-quantum-promise-qkd
---
{% assign pub = site.publications | where: 'slug', page.publication | first %}
{{ pub.venue }} accepted our paper, [{{ pub.title }}]({{ pub.detail_url }}). It presents a formal security analysis of classical control in QKD protocols.

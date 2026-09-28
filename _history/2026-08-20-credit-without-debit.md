---
date: 2026-08-20
title: ACM CCS 2026 Paper
type: Research
organization: ACM CCS
publication: credit-without-debit
---
{% assign pub = site.publications | where: 'slug', page.publication | first %}
{{ pub.venue }} accepted our paper, [{{ pub.title }}]({{ pub.links.doi }}).

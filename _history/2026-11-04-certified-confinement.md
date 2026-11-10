---
date: 2026-11-04
title: ACM PQQS 2026 Presentation
type: Research
organization: ACM PQQS
publication: certified-confinement
---
{% assign pub = site.publications | where: 'slug', page.publication | first %}
We presented our paper, [{{ pub.title }}]({{ pub.links.doi }}), at {{ pub.venue }} in San Jose, CA, alongside an autoPQC poster.

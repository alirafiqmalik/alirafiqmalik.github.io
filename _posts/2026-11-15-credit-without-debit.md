---
title: "Credit Without Debit: Formal Verification of Banking Payment Systems"
publication: credit-without-debit
redirect: https://khwarizmilab.github.io/credit-without-debit/
img: /assets/img/papers/acm-ccs-2026-cwd/figure-2-framework.png
description: >-
  A formal verification of U.S. ACH bank transfers that breaks all three core
  security invariants and reveals Credit-Without-Debit (CWD), a new class of
  attacks validated in live banks, card issuers, and payment apps.
technologies: [Payment Security, ACH, Formal Verification, Model Checking, nuXmv]
links:
  paper: https://dl.acm.org/doi/10.1145/3830454.3846614
---

{% assign pub = site.publications | where: 'slug', page.publication | first %}
Our paper on the formal verification of U.S. ACH payment systems was published at {{ pub.venue }}. Read the full write-up on the [Khwarizmi Lab blog]({{ page.redirect }}).

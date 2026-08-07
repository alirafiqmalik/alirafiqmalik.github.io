---
layout: project
permalink: /papers/ieee-quantum-week-2026-qkd/
title: "Beyond the Quantum Promise: A Security Analysis of Classical Control in Quantum Key Distribution"
venue: IEEE Quantum Week 2026
category: IEEE Quantum Week 2026
status: Accepted
img: /assets/img/papers/ieee-quantum-week-2026-qkd/figure-1-architecture.png
hero_image_fit: contain
description: Security analysis of the classical control plane surrounding quantum key distribution protocols.
technologies: [Quantum Security, QKD, Formal Verification, Model Checking, Tamarin]
links:
  paper: "https://www.researchgate.net/publication/403682108_Beyond_the_Quantum_Promise_A_Security_Analysis_of_Classical_Control_in_Quantum_Key_Distribution"
  code: ""
  artifact: ""
---

## Abstract

Quantum Key Distribution (QKD) protocols provide information-theoretic security by using quantum mechanical principles. Yet QKD is fundamentally a <em>hybrid</em> protocol: its security depends on the correct integration of the quantum phase with classical post-processing. While ETSI and ITU-T specifications standardize QKD architectures and interfaces, they evaluate protocol security in isolation, leaving cross-layer interactions as an underexplored attack surface.

This paper introduces a formal verification framework that holistically models QKD protocols based on ETSI and ITU-T QKD specifications. Our model is the first hybrid QKD protocol model that supports automated analysis of protocol-level security focusing on how classical operations influence the security guarantees provided by the quantum phase of the QKD protocol. We formalize a comprehensive symbolic model of QKD protocols, based on ETSI and ITU-T QKD specifications, in Tamarin, an automated protocol verifier.

Applying this framework, we obtain formal evidence of three specification-level vulnerabilities in ETSI- and ITU-T-grounded protocol models under adversary <em>Eve<sup>+</sup></em>: subverted entanglement injection, basis-deferred measurement, and message reflection. Each arises from a classical control-plane omission in the procedure text and is established under a symbolic abstraction rather than as a claim about all practical deployments. We introduce two protocol improvements: measurement commitment and identity-bound message authentication codes (MACs). Tamarin verification confirms that these countermeasures eliminate the identified vulnerabilities under <em>Eve<sup>+</sup></em>. We have communicated our results and recommendations to relevant standardization organizations.

## Introduction

Quantum Key Distribution (QKD) targets information-theoretic security through quantum mechanical principles. QKD is also a hybrid protocol: a quantum phase establishes raw key material, while classical post-processing performs sifting, error estimation, error correction, and privacy amplification. This work examines how gaps in the classical control plane can affect the security of both prepare-and-measure and entanglement-based QKD models grounded in ETSI and ITU-T specifications.

## Methodology

The study extracts procedures and variants from ETSI and ITU-T QKD documents and encodes them in a unified symbolic model. Probabilistic measurement is abstracted with property-driven symbolic functions, and the Dolev–Yao threat model is extended with quantum knowledge. The Tamarin Prover checks session-key secrecy and entity-authentication properties across nine protocol configurations under adversary <em>Eve<sup>+</sup></em>.

<figure>
  <img src="/assets/img/papers/ieee-quantum-week-2026-qkd/figure-3-methodology.png" alt="Figure 3: Overview of the QKD security analysis methodology">
  <figcaption>Figure 3. Overview of the methodology.</figcaption>
</figure>

## Analysis

The verification traces identify three specification-level vulnerability classes: subverted entanglement injection, basis-deferred measurement, and message reflection. The V1 attack exploits control of entanglement distribution and timing. After a basis announcement, <em>Eve<sup>+</sup></em> measures retained qubits, reconstructs the correlated key material, and re-encodes a qubit stream for the honest party.

<figure>
  <img src="/assets/img/papers/ieee-quantum-week-2026-qkd/v1-attack.png" alt="V1 subverted entanglement injection attack sequence">
  <figcaption>V1. Subverted entanglement injection attack. <em>Eve<sup>+</sup></em> controls the entanglement source, uses a basis announcement to measure retained qubits, and re-encodes a qubit stream for the other party.</figcaption>
</figure>

## Results

Under <em>Eve<sup>+</sup></em>, the symbolic analysis falsifies secrecy or agreement checks in the configurations shown below. The reported failures map to V1, V2, and V3; the source study then proposes measurement commitment and identity-bound message authentication codes as protocol-level countermeasures.

<figure>
  <figcaption>Table 1. Verification under <em>Eve<sup>+</sup></em>. ✓ verified; ✗ falsified.</figcaption>
  <div>
    <table>
      <thead>
        <tr><th>Model</th><th>Exec</th><th>Sec</th><th>Alive</th><th>Weak agreement</th><th>Non-injective agreement</th><th>Time</th></tr>
      </thead>
      <tbody>
        <tr><th colspan="7">EB-QKD</th></tr>
        <tr><td><em>Eve<sup>+</sup></em>_TWEC</td><td>✓</td><td>✗ V1</td><td>✓</td><td>✓</td><td>✗ V3</td><td>13m31s</td></tr>
        <tr><td><em>Eve<sup>+</sup></em>_REC</td><td>✓</td><td>✗ V1</td><td>✓</td><td>✓</td><td>✓ / ✗ V3</td><td>2m12s</td></tr>
        <tr><td><em>Eve<sup>+</sup></em>_FEC</td><td>✓</td><td>✗ V1</td><td>✓</td><td>✓</td><td>✗ V3</td><td>3m58s</td></tr>
        <tr><th colspan="7">PM-QKD</th></tr>
        <tr><td><em>Eve<sup>+</sup></em>_B2A_TWEC</td><td>✓</td><td>✗ V2 / ✓</td><td>✗ V3</td><td>✗ V3</td><td>✗ V3</td><td>7m30s</td></tr>
        <tr><td><em>Eve<sup>+</sup></em>_B2A_REC</td><td>✓</td><td>✓</td><td>✓ / ✗ V3</td><td>✓ / ✗ V3</td><td>✓ / ✗ V3</td><td>59.50s</td></tr>
        <tr><td><em>Eve<sup>+</sup></em>_B2A_FEC</td><td>✓</td><td>✗ V2 / ✓</td><td>✗ V3 / ✓</td><td>✗ V3 / ✓</td><td>✗ V3 / ✓</td><td>30.38s</td></tr>
        <tr><td><em>Eve<sup>+</sup></em>_A2B_TWEC</td><td>✓</td><td>✗ V2</td><td>✗ V3</td><td>✗ V3</td><td>✗ V3</td><td>7m59s</td></tr>
        <tr><td><em>Eve<sup>+</sup></em>_A2B_REC</td><td>✓</td><td>✗ V2</td><td>✓ / ✗ V3</td><td>✓ / ✗ V3</td><td>✓ / ✗ V3</td><td>1m31s</td></tr>
        <tr><td><em>Eve<sup>+</sup></em>_A2B_FEC</td><td>✓</td><td>✗ V2</td><td>✗ V3 / ✓</td><td>✗ V3 / ✓</td><td>✗ V3 / ✓</td><td>45.38s</td></tr>
      </tbody>
    </table>
  </div>
</figure>

In the source study, re-verification with both countermeasures restores the target secrecy and agreement properties across the modeled configurations under <em>Eve<sup>+</sup></em>.

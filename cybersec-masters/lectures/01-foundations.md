# Lecture 01 — Foundations & threat landscape

*Master’s seminar style: definitions first, then models, then critique.*

## 1. What “security” means

Security is **risk management under adversarial conditions**, not “unbreakable systems.”

**CIA triad (classical):**
- **Confidentiality** — only authorized parties learn the data
- **Integrity** — data/systems are not improperly altered
- **Availability** — services remain usable when needed

**Extensions you will meet in literature:** authenticity, non-repudiation, accountability, privacy (distinct from confidentiality), safety.

**Seminar prompt:** Give an example where maximizing confidentiality hurts availability (and vice versa). Trade-offs are the point of master’s work.

## 2. Assets, threats, vulnerabilities, controls

| Term | Meaning |
| --- | --- |
| Asset | Something of value (data, identity, uptime, reputation, safety) |
| Threat | Potential cause of unwanted incident |
| Vulnerability | Weakness that a threat can exploit *in principle* |
| Control / countermeasure | Process, tech, or people measure that reduces risk |
| Risk | Effect of uncertainty on objectives (often ≈ likelihood × impact, with caveats) |

Academic caution: “Likelihood × impact” is a teaching scaffold, not physics. Modern risk practice uses scenarios, uncertainty, and decision theory.

## 3. Adversary model (how researchers speak)

Before analyzing a system, state:

1. **Who** is the adversary? (script kiddie, insider, nation-state, criminal SaaS)
2. **Goals** (theft, disruption, persistence, influence)
3. **Capabilities** (network position, compute, 0-days, social access)
4. **What is in/out of scope** for the analysis

Without an adversary model, “secure” is meaningless.

## 4. Threat landscape (2020s shape)

High-level themes (not a how-to):

- Identity as the new perimeter (phishing, token theft, MFA fatigue as *categories*)
- Supply-chain compromise of dependencies and build systems
- Ransomware as a business model (affiliates, leak sites)
- Cloud misconfiguration and excessive privilege
- AI-assisted social engineering and code suggestion risks

Your networking background helps you see **where trust boundaries sit** (LAN, VPN, SaaS IdP, API gateway).

## 5. Mapping to your skills

| You know | Defensive use in this track |
| --- | --- |
| Bash | Inventory, config drift checks, log grepping, secure defaults scripts |
| Python | Parsers for configs/logs, small policy checkers, API clients for security tools |
| Networking | Segment design, firewall policy review, interpreting captures *for incident response* |

## 6. Required reading before Lab 01

- NIST CSF overview (any current CSF 2.0 executive summary)
- OWASP Top 10 *as a risk taxonomy*, not a cookbook
- One survey paper from [readings/SCHOLAR.md](../readings/SCHOLAR.md) § Foundations

## 7. Exit ticket (write ½ page)

Define CIA for a mobile banking app under a “stolen phone” adversary. Which control fails first if the user is coerced? (Connects to duress/panic features discussed elsewhere — analyze as *defender*.)

# Cybersecurity Master’s Side Track

**Audience:** You already know **Bash**, **Python**, and **networking**.  
**Stance:** Ethical, defensive, academic. This track teaches how systems fail and how to **defend**, **detect**, and **govern** — not how to break into systems you do not own.

> **Hard rule:** No exploit code, payloads, attack playbooks, or step-by-step intrusion procedures appear in this repo. “Lab,” “CTF,” or “authorized pentest” framing does **not** unlock offensive how-tos here. Practice attacks only on platforms that explicitly authorize you (e.g. TryHackMe, Hack The Box, your own VMs), and learn offense from those platforms’ own materials and licensed courses (OSCP, PNPT, etc.).

## Learning outcomes (master’s level)

By the end of this track you should be able to:

1. Reason with the **CIA triad**, risk, and threat modeling (STRIDE / attack trees at conceptual level).
2. Map controls to **NIST CSF**, **ISO 27001** themes, and **OWASP** risk categories.
3. Explain the **penetration-testing lifecycle** (scope → recon → analysis → report) as a *professional service*, without performing unauthorized access.
4. Use Bash/Python for **defensive** automation: inventory, hardening checks, log triage helpers, secure config diffs.
5. Discuss **legal/ethical** boundaries (consent, CFAA-like regimes, POPIA in SA, responsible disclosure).
6. Write a short **security assessment report** a client or examiner would recognize as graduate-level.

## Syllabus map

| Week | Lecture | Lab (defensive) | Assessment |
| --- | --- | --- | --- |
| 1 | [01 Foundations & threat landscape](lectures/01-foundations.md) | [Lab 01 inventory & baseline](labs/01-defensive-inventory.md) | Concept quiz (self) |
| 2 | [02 Risk, governance, law & ethics](lectures/02-risk-governance-ethics.md) | Ethics case write-up | [A1 Ethics memo](assessments/A1-ethics-memo.md) |
| 3 | [03 Crypto & identity (conceptual)](lectures/03-crypto-identity.md) | TLS/cert inspection (read-only) | — |
| 4 | [04 Network defense & monitoring](lectures/04-network-defense.md) | [Lab 02 packet sense-making](labs/02-network-defense.md) | — |
| 5 | [05 AppSec & secure coding](lectures/05-appsec-secure-coding.md) | [Lab 03 Python hardening helpers](labs/03-python-defense.md) | — |
| 6 | [06 Pentest as a profession](lectures/06-pentest-profession.md) | Scoped rules-of-engagement draft | [A2 RoE + threat model](assessments/A2-roe-threat-model.md) |
| 7 | [07 Detection, IR, blue team](lectures/07-detection-ir.md) | [Lab 04 log triage](labs/04-log-triage.md) | — |
| 8 | [08 Research methods & career](lectures/08-research-career.md) | Paper notes | [A3 mini dissertation plan](assessments/A3-research-plan.md) |

## How a master’s lecturer expects you to study

1. **Read before you script.** One lecture → one reading → one lab.
2. **Prefer primary sources.** NIST, OWASP, ISO summaries, peer-reviewed surveys (see [readings/](readings/SCHOLAR.md)).
3. **Defend by default.** Every Bash/Python exercise should answer: *What control does this implement or verify?*
4. **Separate “knowing that” from “knowing how to attack.”** Understanding buffer overflows as a class of flaw is academic; shipping a working exploit is out of scope for this track.
5. **Journal.** Keep `notes/` locally (gitignored if secrets) with “claim → evidence → implication.”

## Legal practice arenas (authorized only)

Use these for hands-on *offensive* skill growth under their terms of service — this repo will not mirror their exploit content:

- [TryHackMe](https://tryhackme.com/)
- [Hack The Box](https://www.hackthebox.com/)
- [OverTheWire](https://overthewire.org/wargames/) (bandit for Bash discipline)
- Your own isolated lab VMs you created and own

## Relationship to other work in this monorepo

This folder is an independent **study side project**. It is not part of the voice-assistant runtime or the Vintly wine demo.

## Start here

1. Read [lectures/01-foundations.md](lectures/01-foundations.md)
2. Skim [readings/SCHOLAR.md](readings/SCHOLAR.md)
3. Complete [labs/01-defensive-inventory.md](labs/01-defensive-inventory.md)

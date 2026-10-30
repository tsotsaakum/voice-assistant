# Lecture 02 — Risk, governance, law & ethics

## 1. Governance vs security engineering

- **Governance:** who decides acceptable risk, policy, accountability
- **Management:** how programs run (SOC, vuln management, IR)
- **Engineering:** how systems are built and operated securely

Master’s graduates are expected to speak all three languages.

## 2. Frameworks (conceptual map)

| Framework | Role |
| --- | --- |
| NIST CSF | Organize Identify–Protect–Detect–Respond–Recover (+ Govern in CSF 2.0) |
| ISO/IEC 27001 | ISMS certification-oriented management system |
| CIS Controls | Prioritized practical safeguard list |
| FAIR (optional) | Quantitative risk analysis school |

You do not memorize every control. You learn to **map a scenario → framework function → control objective**.

## 3. Ethics of “hacking”

**Ethical hacking** means testing with **informed authorization**, clear **scope**, and a duty to **minimize harm** and **report**.

Without authorization, the same techniques are typically **computer crime**.

Principles for this track:

1. **Consent** — written Rules of Engagement (RoE) before any active test
2. **Necessity & proportionality** — least intrusive method that answers the question
3. **Non-maleficence** — no collateral damage to production or third parties
4. **Transparency** — findings reported to the system owner, not the internet first
5. **Competence** — do not run tests you cannot safely reverse or contain

## 4. Law (orientation, not legal advice)

You are in **South Africa** (Africa/Johannesburg). Orient yourself to:

- **Cybercrimes Act** (and related electronic communications law)
- **POPIA** — personal information processing, security safeguards
- Contract + RoE for professional assessments
- Compare conceptually with CFAA (US) / Computer Misuse Act (UK) when reading US/UK papers

Seminar rule: *If you would not show the activity to a magistrate and your client, do not do it.*

## 5. Responsible disclosure

High-level process academics and vendors expect:

1. Confirm issue privately with owner/vendor
2. Allow reasonable remediation window
3. Coordinate publication; avoid weaponized detail that enables mass harm
4. Respect bug-bounty program rules when present

## 6. Exit ticket

Draft five RoE clauses for testing a web app **you own** on a home lab VM (scope, hours, forbidden actions, data handling, emergency stop).

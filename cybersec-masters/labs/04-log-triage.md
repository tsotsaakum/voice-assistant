# Lab 04 — Log triage with Bash + Python

**Objective:** Practice IR **analysis** on synthetic or public sample logs.

## Setup

Create `sample-auth.log` with fictional lines, for example failed then successful SSH-style messages for user `alice` from two IPs. **Do not** use real production logs containing personal data unless you have clearance and a POPIA basis.

## Tasks

1. Count failed vs successful auth events (Bash `awk`/`grep` or Python).
2. Rank source IPs by failure count.
3. Flag “failures then success from new IP within 10 minutes” as a **hypothesis** for analyst review (simple time parse — teaching logic, not an IDS product).
4. Write the containment questions you would ask next (disable account? reset sessions? check MFA?).

## Deliverable

Script + short analyst narrative. No exploitation steps.

# Lecture 07 — Detection, blue team & incident response

## 1. Why detection matters more than “perfect prevention”

Assumptions of modern defense: **breach is possible**. Success metrics shift to:

- Mean time to detect (MTTD)
- Mean time to respond (MTTR)
- Completeness of eradication & recovery

## 2. Detection engineering (concepts)

- Telemetry sources (EDR, IdP, cloud audit, email, DNS, proxy)
- Analytics: signatures, behavioral baselines, threat intel matching
- Alert fatigue & tuning as a research-worthy problem
- Purple teaming: red objectives used to improve blue visibility (under authorization)

## 3. Incident response phases (NIST-like)

1. Preparation  
2. Detection & analysis  
3. Containment  
4. Eradication  
5. Recovery  
6. Post-incident activity (lessons learned)

Your Bash/Python skills shine in **triage automation** on log exports you are allowed to handle.

## 4. Forensics awareness (high level)

Chain of custody, volatile vs non-volatile evidence, imaging vs live response trade-offs. Deep forensics is its own module; here you only need literacy.

## 5. Exit ticket

Given failed SSH logins then a successful login then a new cron entry (hypothetical log lines), outline IR questions you would ask — not exploits to recreate the incident.

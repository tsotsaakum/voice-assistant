# Lecture 08 — Research methods & career craft

## 1. How security research is done

Master’s-quality work usually includes:

- Clear research question
- Related work (Scholar surveys)
- Method (experiment, measurement, case study, formal model)
- Threats to validity
- Ethics board / responsible disclosure plan when humans or live systems involved
- Reproducibility of **defensive** measurements

## 2. Reading papers efficiently

For each paper in [readings/SCHOLAR.md](../readings/SCHOLAR.md):

1. Question & claim  
2. Method  
3. Evidence  
4. Limitations  
5. What you would do next  

## 3. Building skill without crossing lines

| Do | Don’t |
| --- | --- |
| Own-lab VMs, official vulnerable images you host | Scanning random IPs “for practice” |
| TryHackMe / HTB under ToS | Sharing weaponized exploits from those boxes publicly as “tutorials” without care |
| Defensive automation portfolio | Credential stuffing or password lists against real users |
| Write-ups focused on remediation | “How to hack X company” content |

## 4. Portfolio ideas (defensive)

- Hardening baseline scripts (CIS-inspired checks) for Linux
- Log triage notebooks on public sample datasets
- Threat models for open-source apps (STRIDE tables)
- Secure coding PR reviews (documented)
- Detection rules expressed as **logic**, tested on benign + synthetic event samples you generate yourself

## 5. Capstone direction prompts

- Measure misconfiguration rates in a synthetic cloud Terraform corpus
- Evaluate password-store policies across student projects (with consent)
- Survey SA SME readiness against a NIST CSF subset
- Design a duress-aware banking UX threat model (ethics heavy)

## 6. Exit ticket

One paragraph: your 12-month plan (courses + labs + cert + portfolio piece).

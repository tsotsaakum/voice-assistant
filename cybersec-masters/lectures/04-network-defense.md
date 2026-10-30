# Lecture 04 — Network defense & monitoring

*You already know networking. We reframe it as **control design** and **detection**.*

## 1. Trust boundaries

Draw the system. Mark where packets cross:

- Internet → edge (WAF/CDN/LB)
- DMZ → internal
- User device → IdP / VPN
- Workload → cloud metadata / control plane

Every boundary needs: authentication story, encryption story, logging story.

## 2. Defensive patterns (concepts)

- Segmentation & microsegmentation
- Deny-by-default firewalling
- Egress filtering (underrated)
- Zero Trust *as architecture theme*: authenticate/authorize continuously; don’t trust network location alone
- DNS security awareness (filtering, logging) without offensive tunneling recipes

## 3. Observability for security

- Flow logs, DNS logs, auth logs, proxy logs
- Packet capture for **incident response** on systems you own
- Baseline “normal” before you can spot “weird”

## 4. What we will not do in this track

- Crafting attack packets, scanning playbooks against third-party networks
- Exploit-driven “pivot” tutorials

## 5. Exit ticket

For a home lab with `router — firewall VM — app VM — db VM`, list three monitoring signals that would indicate credential misuse **without** describing how an attacker obtains credentials.

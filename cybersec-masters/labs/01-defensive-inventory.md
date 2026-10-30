# Lab 01 — Defensive host inventory (Bash)

**Objective:** Produce an asset/baseline snapshot of a machine **you own** (laptop or VM).  
**Not in scope:** Scanning other people’s hosts; privilege escalation exploits.

## Tasks

1. Record identity: hostname, kernel, uptime.
2. List listening ports **locally** (`ss`/`netstat`) and annotate expected services.
3. List users with login shells; flag UID 0 accounts beyond root.
4. Check firewall state (e.g. `ufw status` or `firewall-cmd --state`) — document only.
5. Save output under `cybersec-masters/notes/lab01-YYYYMMDD.txt` (create `notes/` locally; optional gitignore).

## Starter sketch (complete and harden yourself)

```bash
#!/usr/bin/env bash
# inventory.sh — run only on systems you own
set -euo pipefail
echo "=== host ==="
hostnamectl 2>/dev/null || hostname
uname -a
echo "=== listeners ==="
ss -tulpen 2>/dev/null || netstat -tulpen
echo "=== human users ==="
awk -F: '$3 >= 1000 {print $1,$3,$7}' /etc/passwd
```

## Deliverable

One page: what surprised you, what you would change (disable service, restrict bind address, enable firewall), mapped to NIST CSF **Identify** / **Protect**.

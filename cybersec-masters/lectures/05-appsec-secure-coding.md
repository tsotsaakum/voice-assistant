# Lecture 05 — Application security & secure coding

## 1. OWASP as a syllabus, not a weapon list

Treat the OWASP Top 10 as **risk categories** (injection, broken authZ, SSRF, etc.). In this track you learn to:

- Recognize the *class* of bug in code review
- Apply **secure defaults** and frameworks’ protected APIs
- Write **regression tests that assert safe behavior** (no exploit payloads)

Example of allowed defensive test mindset: “unauthenticated request to `/admin` returns 401/403.”  
Disallowed: publishing PoC payloads that demonstrate RCE.

## 2. Secure development lifecycle (SDL)

1. Threat model early (Lecture 06 tools)
2. Secure coding standards
3. Dependency hygiene (SCA)
4. SAST/DAST as *process* (vendor-neutral)
5. Code review checklists
6. Secrets management (no keys in git)

## 3. Your Python edge

Defensive Python habits:

- Parameterized queries / ORM — never string-built SQL
- Path canonicalization and allowlists for file access
- Explicit timeouts and TLS verification on HTTP clients
- Least privilege for service accounts
- Structured logging without secrets

## 4. Exit ticket

Take 20 lines of Python that builds a filesystem path from user input. Rewrite the threat model: what can go wrong, and which control (allowlist, `realpath` jail, chroot, capability drop) you would require in a design review — **without** providing a malicious path PoC.

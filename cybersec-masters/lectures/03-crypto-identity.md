# Lecture 03 — Cryptography & identity (conceptual)

*Goal: correct mental models. We will not implement cryptanalysis or “break TLS” procedures.*

## 1. Crypto is a tool, not magic

Cryptography provides **mathematical** confidentiality, integrity, and authenticity **when keys and protocols are used correctly**. Most real failures are:

- Wrong algorithm/mode choice
- Key mismanagement
- Trusting the wrong endpoint (phishing, rogue CA stories as history)
- Side channels and implementation bugs (awareness level)

## 2. Primitives you must name correctly

| Primitive | Typical job |
| --- | --- |
| Symmetric encryption (AES-GCM, ChaCha20-Poly1305) | Confidentiality + integrity of data at rest/in transit (with AEAD) |
| Hash (SHA-256, SHA-3) | Fingerprints, commitments — **not** encryption |
| MAC / HMAC | Integrity/authenticity with shared key |
| Public-key (RSA, ECC) | Key exchange, signatures — expensive, carefully applied |
| KDF / password hashing (Argon2, bcrypt, scrypt) | Storing passwords **never** as reversible crypto or raw SHA |

Password storage seminar point: hashing ≠ encryption; salts; work factors; never invent your own.

## 3. TLS as a protocol story

At master’s level, explain:

1. Who is authenticated (server cert; optional mTLS)
2. How keys are agreed (handshake / modern TLS 1.3 sketch)
3. What is protected (application data)
4. What TLS does **not** fix (XSS in the browser, compromised endpoint, bad authZ)

Defensive lab skill: **inspect** certificates and cipher suites with standard tools in read-only mode — see Lab 02/03 cross-links.

## 4. Identity & access management (IAM)

- Authentication (something you know/have/are / passkeys)
- Authorization (RBAC, ABAC, least privilege)
- Federation (SAML/OIDC concepts)
- Session & token security (lifetime, binding, theft *as risk category*)

## 5. Exit ticket

Explain why “we encrypt the database” alone does not satisfy confidentiality if application servers hold decryption keys and are breached.

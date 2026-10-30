# Lab 03 — Python for defense (no exploit code)

**Objective:** Automate **policy checks** and safe parsing.

## Exercise A — Secrets hygiene gate

Write a Python script that scans a directory tree **you specify** for high-entropy or keyword patterns like `API_KEY=`, `BEGIN PRIVATE KEY`, and exits non-zero if found. Use it as a pre-commit style guard on your own repos.

## Exercise B — Dependency awareness

Using `pip list` / `requirements.txt` on a project you own, produce a Markdown table of packages. Optionally call a **legal** advisory API you have keys for (e.g. OSV) to list known vulnerable versions — remediation-focused output only.

## Exercise C — AuthZ regression mindset

In a tiny Flask/FastAPI toy app **you write**, add tests that assert:

- anonymous client cannot read `/admin`
- user A cannot read user B’s resource by ID

Do **not** add offensive fuzz payloads aimed at RCE; stick to authorization assertions.

## Deliverable

Repo folder `labs/solutions/` (local is fine) with scripts + README explaining which control each check implements.

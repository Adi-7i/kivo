# ADR-001: Technology Stack and Pinned Dependency Versions

* **Status:** Accepted
* **Date:** 2026-10-16
* **Deciders:** Backend Architect, Security Engineer, QA Engineer

---

## 1. Context and Problem Statement

Kivo requires a reliable, production-ready, testable, and maintainable backend foundation. The technology document mandates a Django-based modular monolith with Django REST Framework, remote Supabase PostgreSQL, and modern Python tooling.

We must record the exact installed versions, verify compatibility against official PyPI metadata and upstream package matrices, document installation decisions, explain deviations, and define reproducibility boundaries.

---

## 2. Selected Versions and Compatibility Evidence

| Component / Library | Pinned Version | Python Requirement | Upstream Framework Compatibility | Source / Evidence |
|---|---|---|---|---|
| **Python** | **3.14.4** | System / Venv | Platform interpreter on Ubuntu 26.04.1 LTS | `python3 --version` |
| **Django** | **6.1.2** | `>=3.12` | Latest stable Django 6.x release | PyPI metadata (`Django==6.1.2`) |
| **Django REST Framework** | **3.18.3** | `>=3.10` | Supports Django 6.0, 6.1 (PyPI classifiers) | PyPI metadata (`djangorestframework==3.18.3`) |
| **psycopg** | **3.3.6** | `>=3.10` | psycopg 3 with binary wheels & pool support | PyPI metadata (`psycopg[binary,pool]==3.3.6`) |
| **drf-spectacular** | **0.30.0** | `>=3.8` | Supports modern DRF & OpenAPI 3.0/3.1 | PyPI metadata (`drf-spectacular==0.30.0`) |
| **django-filter** | **26.2** | `>=3.11` | Supports Django 5.x / 6.x | PyPI metadata (`django-filter==26.2`) |
| **pytest** | **9.1.1** | `>=3.8` | Test runner | PyPI metadata (`pytest==9.1.1`) |
| **pytest-django** | **4.14.0** | `>=3.10` | Pytest integration for Django 5.x / 6.x | PyPI metadata (`pytest-django==4.14.0`) |
| **Ruff** | **0.17.1** | `>=3.7` | Fast linter & formatter | PyPI metadata (`ruff==0.17.1`) |

---

## 3. Deviation Rationale: Python 3.14.4 vs Specified Python 3.13

### Observation
The Kivo specification mentions Python 3.13 as the target runtime. However, the execution environment (Ubuntu 26.04.1 LTS "Resolute Raccoon") natively provides Python **3.14.4** as `/usr/bin/python3`. Python 3.13 is neither installed nor available in the standard system package repositories.

### Analysis & Resolution
1. **Compatibility Verification:**
   - Django 6.1.2 officially declares support for `requires-python = ">=3.12"`, which encompasses Python 3.14.
   - DRF 3.18.3 requires `>=3.10`.
   - psycopg 3.3.6 provides native `cp314` prebuilt binary wheels for Linux x86_64, eliminating any C compilation dependencies.
   - All auxiliary packages (`PyYAML`, `rpds-py`, `jsonschema`) possess precompiled wheels for Python 3.14 (`cp314`).
2. **Security & Stability:**
   - Python 3.14 is the current stable release on this system, receiving active maintenance and security updates.
   - Installing Python 3.13 via unauthorized PPA or custom source compilation would require root/sudo access and violate the principle of reproducible local environments without global system pollution.
3. **Decision:**
   - Adopt Python 3.14.4 inside an isolated project virtual environment (`backend/.venv`).
   - All type annotations, syntax, and features adhere to modern standard library practices.

---

## 4. Installation & Reproducibility Decisions

1. **Virtual Environment Isolation:**
   - Created at `backend/.venv` using standard library `venv`.
   - Symlinked to `.venv` in the workspace root for developer convenience and tooling auto-detection.
   - Completely excluded from Git via `.gitignore`.
2. **Pinned Lockfile:**
   - Complete dependency graph locked in `requirements.lock` using `pip freeze`.
   - Declarative package boundaries maintained in `pyproject.toml`.
3. **PostgreSQL Driver Choice:**
   - `psycopg[binary,pool]==3.3.6` selected over legacy `psycopg2`.
   - `psycopg3` is the modern default recommended by Django 5.x / 6.x and Supabase for async-capable, pool-friendly, type-safe PostgreSQL communication.
4. **Zero-Dependency Database URL Parser:**
   - `urllib.parse` from the Python standard library is used to parse `SUPABASE_DB_URL`.
   - Avoids adding brittle third-party database URL parsing packages that may lag behind Django 6.x or psycopg 3 parameter specifications.

---

## 5. Consequences

* **Positive:**
  - Fast, reproducible, deterministic builds via `requirements.lock`.
  - Zero global package pollution.
  - Full compatibility with Django 6.1.2 and modern DRF.
  - Native binary wheels for all dependencies on Linux x86_64.
* **Negative / Limitations:**
  - If deploying to a runtime strictly limited to Python 3.13 in later production phases, minor verification of stdlib features will be required (though Python 3.13 code is backwards compatible with 3.14).

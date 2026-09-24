<div align="center">

# Anaesthetic Night Roster

**A restricted-access operational PWA for the anaesthetic night team**

`Private roster data` · `Mobile-first PWA` · `Supabase` · `Proprietary`

</div>

> [!IMPORTANT]
> **This repository is publicly viewable, but the project is not open source.**  
> No licence is granted to copy, redistribute, rebrand, publish, deploy, commercialise, or create derivative versions of this project without the copyright owner's prior written permission.

## Overview

Anaesthetic Night Roster is a mobile-first roster application designed to give authorised anaesthetic staff a single shared view of the selected night's staffing, allocations, changes, breaks, and team coordination information.

The application is intended for **staff rostering and operational coordination only**. It is not a patient record, clinical documentation system, or clinical decision-support tool.

> **Patient-identifiable or clinical information must never be entered into the application, repository, issues, pull requests, screenshots, or test data.**

## What the app provides

| Area | Purpose |
| --- | --- |
| **Night** | Clear view of the selected night's team and current allocation |
| **Changes** | Controlled staffing updates and reviewed night adjustments |
| **Breaks** | Shared break planning based on the effective roster |
| **Team Chat** | Staff coordination through group and private conversations |
| **Account** | Personal profile, appearance, sign-in security, and device settings |
| **Roster management** | Restricted administrative controls for authorised users |

The interface is designed primarily for installed mobile use while remaining usable in a standard browser.

## Security model

Roster information is not stored in the public GitHub repository. Shared application data is held in Supabase and protected through authenticated access, authorised membership, database Row Level Security, and least-privilege application flows.

The repository must never contain:

- database passwords or privileged Supabase keys
- GitHub or service access tokens
- private encryption keys
- local environment files containing secrets
- patient information
- live confidential operational data

The browser publishable key is public configuration and is **not** treated as a security boundary.

Security concerns should be reported privately. See [SECURITY.md](SECURITY.md).

## Technology

The production client is a lightweight progressive web application using:

- HTML, CSS, and browser JavaScript
- Supabase Authentication, Database, Realtime, Storage, and Edge Functions
- GitHub Actions for automated testing and controlled deployment
- GitHub Pages for the current static application shell

Database changes are maintained as forward-only migrations under `supabase/migrations/`.

## Development

The project intentionally uses a small browser-native architecture rather than a large frontend build framework.

To run the repository checks locally:

```sh
npm test
```

The test suite covers roster invariants, staffing behaviour, startup recovery, security hardening, chat, notifications, and production health expectations.

Before changing application logic, read [AGENTS.md](AGENTS.md). It contains safety-critical maintenance rules that must be preserved.

## Release process

Changes are developed on focused branches and reviewed through pull requests. A production merge to `main` must pass the automated test suite before the database migration and GitHub Pages deployment stages can complete.

Already-deployed database migrations are immutable. New schema changes must use a new timestamped file in `supabase/migrations/`.

For operational deployment details, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Ownership and reuse

**Copyright © 2026 Anaesthetic Night Roster repository owner. All rights reserved.**

Public visibility on GitHub is not an invitation to reuse the project and does not place the code in the public domain. No open-source licence is granted.

See [LICENSE](LICENSE) and [COPYRIGHT.md](COPYRIGHT.md) for the repository's proprietary-use notice.

---

<sub>Access to the application does not imply permission to access, copy, reuse, or redistribute its source code or documentation.</sub>

# Security Policy

## Reporting a concern

Do not post confidential security details in a public issue, pull request, discussion, commit, or other public channel.

Contact the repository owner privately through GitHub's **Report a vulnerability** / private security advisory feature when it is available. If that feature is unavailable, use an established private contact channel for the repository owner and disclose only enough information to arrange a secure follow-up. Do not create a public issue containing the vulnerability details.

Reports should describe the affected component, impact, and safe reproduction steps without including live credentials or sensitive operational data.

## Sensitive information

Never include credentials, access tokens, database passwords, service-role or secret keys, private keys, personal information, or patient information in a report, issue, screenshot, test fixture, commit, or repository file. Revoke and rotate any credential that may have been exposed, then notify the repository owner privately.

This roster must not be used to store patient information.

## Required controls

Supabase Row Level Security and the active authorised-account model are essential security boundaries for roster data and actions. The browser publishable key is public configuration and must never be treated as a substitute for those controls. Changes must preserve authentication, authorisation, private storage policies, and least-privilege deployment credentials.

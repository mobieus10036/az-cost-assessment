# Security Policy

## Supported versions

Security fixes are provided for the latest `main` branch and the most recent release.

## Reporting a vulnerability

Please do not file public issues for suspected vulnerabilities.

Use GitHub private vulnerability reporting:

- [Repository Security Advisories](https://github.com/mobieus10036/az-cost-assessment/security/advisories)

If private reporting is unavailable, contact the maintainer directly and include:

- Reproduction steps
- Impact and affected scope
- Proposed mitigation (if known)

## Response targets

- Initial acknowledgment: within 3 business days
- Triage status update: within 7 business days
- Fix target: based on severity and exploitability

## Security expectations for contributors

- Never commit credentials, secrets, or tenant-sensitive exports
- Keep generated reports and logs out of version control
- Prefer least-privilege Azure roles during testing
- Ensure dependencies are updated and scanned in pull requests

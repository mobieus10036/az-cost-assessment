# Release Go/No-Go Checklist

Use this checklist for any public release.

## Governance and policy

- [ ] `README.md` includes current trust badges (CI, CodeQL, Dependabot, Security Policy)
- [ ] `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md` are current
- [ ] `.github/CODEOWNERS` matches active maintainers

## Repository hygiene

- [ ] No generated artifacts are tracked (`reports/`, `logs/`, temp cost query files)
- [ ] `.gitignore` excludes local credentials, generated output, and transient files
- [ ] No secrets or sensitive identifiers are present in code or docs

## Automation and security

- [ ] CI passes on supported Node.js versions
- [ ] CodeQL workflow is enabled and last run is green
- [ ] Dependabot configuration is active for npm and GitHub Actions
- [ ] Commit signature check workflow passes on pull requests

## Quality gates

- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm audit --audit-level=high` reviewed (no unapproved high/critical findings)

## Branch and merge protection

- [ ] Branch protection is enabled for `main`
- [ ] Required checks include CI and commit signature verification
- [ ] Pull request reviews are required (minimum 1)
- [ ] Force pushes and branch deletion are blocked
- [ ] Signed commits are required

## Release decision

- [ ] GO: all items above completed and validated
- [ ] NO-GO: any required check missing, failing, or unreviewed

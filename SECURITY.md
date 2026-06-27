# Security Policy

## Supported Versions

Plainsight is frontend-first geospatial analysis app. Only the latest deployed version and the current `master` branch are supported for security fixes.

| Version                                      | Supported |
| -------------------------------------------- | --------- |
| Latest deployed version                      | Yes       |
| `master` branch                              | Yes       |
| Older commits, forks, or local modifications | No        |

## Project Scope

Plainsight is a frontend-first short-term-rental market explorer built with public data snapshots.

The application does not provide:

- user accounts or authentication
- payments
- private user data storage
- user-generated content
- public write APIs
- admin dashboards

The main security areas for this project are:

- dependency and supply-chain security
- CI/CD and deployment secret protection
- browser security headers and Content Security Policy
- accidental exposure of build or deployment secrets
- safe handling of public data and URLs

## Reporting a Vulnerability

Please do not open a public GitHub issue for security vulnerabilities.

If you believe you found a security issue, report it privately using GitHub’s private vulnerability reporting feature if it is available for this repository.

If private vulnerability reporting is not available, contact the maintainer directly through GitHub.

When reporting, please include:

- a clear description of the issue
- steps to reproduce it
- the affected URL, file, dependency, or workflow
- the potential impact
- any suggested fix, if known

Please do not include secrets, access tokens, private data, or destructive proof-of-concept payloads in the report.

## Expected Response

This is a solo-maintained case study project, so response times may vary. I will make a best effort to:

- acknowledge valid reports within a reasonable time
- investigate reproducible issues
- patch confirmed vulnerabilities when they affect the supported version
- disclose fixes through normal commits or pull requests when appropriate

## Out of Scope

The following are generally out of scope unless they demonstrate a real exploitable vulnerability:

- reports for unsupported forks or old commits
- missing security headers that do not create an exploitable issue
- dependency findings without an actual vulnerable version or reachable impact
- denial-of-service claims based only on high traffic volume
- social engineering or physical attacks
- issues in third-party services outside this repository’s control
- public data quality issues in the source dataset

## Secrets

If you accidentally discover or receive a secret related to this project, do not use it. Report it privately so it can be revoked and rotated.

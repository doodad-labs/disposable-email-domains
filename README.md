> [!WARNING]
> This project is in an early stage. Some domains may be incorrectly flagged as disposable. We actively welcome contributors to help improve accuracy, particularly by maintaining the whitelists.

# Real-time Disposable Email Domains

[![All Flagged Domains](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdoodad-labs%2Fdisposable-email-domains%2Frefs%2Fheads%2Fmain%2Fstats%2Fbadge.json\&style=flat-square\&cache=1)](https://github.com/doodad-labs/disposable-email-domains/blob/main/data/domains.txt)
[![Active Domains](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdoodad-labs%2Fdisposable-email-domains%2Frefs%2Fheads%2Fmain%2Fstats%2Fbadge-active.json\&style=flat-square\&cache=1)](https://github.com/doodad-labs/disposable-email-domains/blob/main/data/active.txt)

This project automatically aggregates disposable email domains using curated public lists, third-party sources, and internally collected intelligence. All ingestion, validation, and publishing workflows are fully automated. *All domains are normalised and validated before inclusion.*

## Data Update Frequency

The dataset is continuously maintained:

* `data/domains.txt` is updated every hour
* `data/active.txt` is updated once per day

`active.txt` contains only domains that currently resolve with a valid MX record.

## Data Sources

Domains are sourced from:

* established public disposable email domain lists
* open-source intelligence feeds
* internal discovery and monitoring systems
* community contributions

Sources are aggregated, cleaned, validated, and standardised before publication.

## Reporting Incorrectly Flagged Domains

If you believe a legitimate domain has been incorrectly classified as disposable, you can help improve accuracy by contributing to the whitelist.

To contribute:

1. Confirm that the domain provides a legitimate, non-disposable email service
2. Add the domain to `domain_whitelist.txt`, or add a TLD to `tld_whitelist.txt`
3. Submit a pull request

The allow list acts as a manual override to prevent false positives.

## Repository Structure

```
├── data/
│   ├── domains.txt        # All flagged disposable domains (plain text)
│   └── active.txt         # Flagged domains with active MX records (plain text)
│
├── domain_whitelist.txt      # Manual domain whitelist (plain text)
└── tld_whitelist.txt         # Manual TLD whitelist (plain text)
```

## Contributions

Although the project is automatically maintained through scraping and aggregation, domain ecosystems change frequently. Providers appear, disappear, and repurpose infrastructure.

Community input is essential to:

* reduce false positives
* identify new disposable providers
* maintain data freshness
* improve validation logic

First-time contributors are welcome. Even small corrections significantly improve dataset reliability.

Every contribution directly strengthens the integrity and usefulness of this resource.

![](https://contrib.nn.ci/api?repo=doodad-labs/disposable-email-domains)

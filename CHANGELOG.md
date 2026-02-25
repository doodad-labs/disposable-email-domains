# Changelog

All notable changes to the data, validation methodology, and repository behaviour are documented in this file. Automation logic is maintained separately to ensure a clean separation of concerns.

This project follows Keep a Changelog and Semantic Versioning.

---

## [1.0.0] - 2026-02-25

### Added
- Added regulated TLD whitelist support ([`#44`](https://github.com/doodad-labs/disposable-email-domains/issues/44))
- Added a third data source file for root domains ([`#44`](https://github.com/doodad-labs/disposable-email-domains/issues/44))

### Changed
- Refactored domain filtering and validation
- Introduced and enforced strict formatting, ordering, and validation rules for whitelist entries.

# Leaf Sap One Up (ls-oneup)

Prototype repository for probe-based capture workflows (admin-issued one-time links and farmer submissions).

## Quick Start

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

App routes:

- Admin: `http://localhost:8787/admin`
- Farmer form (example): `http://localhost:8787/p/example-token`

## Local Quality Gate

```bash
npm run format
npm run lint
npm run typecheck
npm run test:integration
npm run test:e2e
npm run crypto:run
npm run ci:local
```

## Documentation

Start at the docs hub and pick the lane for your role:

- [Documentation hub](docs/README.md)
- [Contributor local development guide](docs/maintainers/local-development.md)
- [Maintainer production release guide](docs/maintainers/production-release.md)
- [Requirements and contracts index](docs/requirements/README.md)
- [Security documentation index](docs/security/README.md)

# Passion OS Documentation

This directory contains all documentation for the Passion OS project, organized by domain.

## 📚 Documentation Structure

The documentation is organized into the following categories:

### 🧠 Behavioral & Logic (`docs/behavioral/`)
- System invariants and behavior contracts
- Implementation details for complex features (e.g., Auth, Ignition)
- `ISSUES_AND_TODOS.md` - Active tracking of technical debt and todos

### 📦 Product & Features (`docs/product/`)
- **features/** - Feature specifications and summaries
- **design/** - Design guidelines, brand assets
- **business/** - Business logic and gamification loops
- **user/** - User guides and documentation

### 🛠️ Technical & Architecture (`docs/technical/`)
- **backend/** - Backend architecture, Rust services
- **frontend/** - Frontend architecture, Next.js components
- **database/** - Database schema (`DATABASE_SCHEMA.md`), migrations, and data mo- **database/** - Database schema (`DATABASEtions and agent docs

### 🚀 Operations & Deployment (`docs/ops/`)
- Deployment guides (Cloudflare, Fly.io)
- Runbooks and operational procedures
- Performance reports

### 🏛️ Meta & Governance (`docs/meta/`)
- `CONTRIBUTING.md` - Guide for contributors
- `CODE_OF_CONDUCT.md` - Community standards
- License information

### 🗄️ Archive (`docs/archive/`)
- **completed/** - Documentation for completed milestones
- **legacy-user/** - Old user documentation
- **legacy-ops/** - Deprecated operational docs
- Audits and historical reports

---

## Quick Links

- [Contributing Guide](./meta/CONTRIBUTING.md)
- [Architecture Overview](./technical/architecture.md)
- [Deployment Guide](./ops/DEPLOYMENT_TARGET.md) (Check specific files in `ops/`)
- [Database Schema](./technical/database/DATABASE_SCHEMA.md)

## Key Concepts

### Authentication
OAuth authentication via Auth.js with Google and Microsoft Entra ID. Sessions are stored in the D1 database.
See `docs/behavioral/auth-and-d1-invariants.md` for detailed invariants.

### Architecture
See `docs/technical/architecture.md` for the high-level system design.

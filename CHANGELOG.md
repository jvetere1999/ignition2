# Changelog

All notable changes to Passion OS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Root-level CHANGELOG.md for version tracking
- Code review and cleanup instructions in `.github/instructions/`
- Compilation error fixes and schema regeneration process

### Changed
- Reorganized root-level markdown files (35 → 2 core files)
- Moved session summaries and reports to debug/archive/
- Consolidated technical documentation to docs/technical/

### Fixed
- Fixed 6 compilation errors blocking GitHub Actions deployment
- Fixed AppError::Unauthorized signature mismatch (all 11 callsites)
- Fixed OAuth authorization_url methods with incorrect error handling
- Fixed unused variable warnings in backend code
- Syntax errors in auth.rs and error.rs

---

## Recent Production Releases

### [2026-01-13] - Compilation Fixes

**Hash**: `c45d592` (production branch)

**Changes**:
- Ran mandatory schema regeneration (generate_all.py)
- Fixed AppError::Unauthorized to accept String parameter
- Updated 11+ callsites with descriptive error messages
- Fixed OAuth methods to use correct error handling patterns
- Fixed unused variables with underscore prefix
- Cleared build cache and validated with cargo check (0 errors)

**Validation**:
- ✅ cargo check: 0 errors, 204 pre-existing warnings
- ✅ All compilation errors resolved
- ✅ Backend ready for production deployment

### [2026-01-12] - Pitfall Fixes Deployment

**Hash**: `94ea8a1` (production branch)

**Changes**:
- Comprehensive updates and improvements (pitfall fixes PR #61)
- Session termination on 401 errors with safeFetch wrapper
- Updated fetch requests with credentials for session authentication
- Enhanced FocusClient to handle active session and pause state
- Added comprehensive data consistency tests
- Code structure refactoring for readability
- Schema code generation and migration verification

### [2026-01-11] - Session Rotation & Auth Improvements

**Changes**:
- Implemented session termination on 401 errors
- Added session rotation mechanism for privilege escalation
- Enhanced authentication middleware with better error handling
- Improved error classification and logging

### [2026-01-10] - API Response Format Standardization

**Changes**:
- Standardized API response formats across multiple routes
- Updated response to use resource-specific keys
- Added comprehensive E2E test coverage
- Enhanced test infrastructure and validation scripts

---

## Version History

### Phase Releases

- **Phase 00**: Initial setup and architecture
- **Phase 01**: Core authentication and session management
- **Phase 02**: API endpoints and response handling
- **Phase 03**: Frontend build and deployment pipeline
- **Phase 04**: Database schema and migrations
- **Phase 05**: Focus timer and productivity features
- **Phase 06**: Music production utilities (DAW shortcuts, templates)
- **Phase 07**: Reference library with audio analysis
- **Phase 08**: Admin dashboard (in progress)
- **Phase 09**: Performance optimization and cleanup (current)

---

## Deployment Status

### Current Production (2026-01-13)

- **Backend**: Fly.io (api.ecent.online) - Ready to deploy
- **Frontend**: Cloudflare Workers (ignition.ecent.online) - Ready to deploy
- **Admin**: Cloudflare Workers (admin.ecent.online) - Ready to deploy
- **Database**: Neon PostgreSQL - Up to date

### Recent Deployments

| Date | Target | Status | Changes |
|------|--------|--------|---------|
| 2026-01-13 | Backend | ✅ Ready | Compilation fixes |
| 2026-01-13 | Frontend | ✅ Current | No changes |
| 2026-01-13 | Admin | ✅ Current | No changes |
| 2026-01-12 | All | ✅ Deployed | Pitfall fixes |

---

## Known Issues & Roadmap

See [SOLUTION_SELECTION.md](debug/SOLUTION_SELECTION.md) for pending decisions and roadmap items.

Current priorities (P0-P5):
- P0: Session termination and auth flows
- P1: Plan My Day generation optimization
- P2: Onboarding modal implementation
- P3: Focus library storage strategy
- P4: Focus persistence improvements
- P5: Zen browser compatibility

---

## Contributing

See [CONTRIBUTING.md](docs/meta/CONTRIBUTING.md) for development setup, git workflow, and testing guidelines.

---

## License

Passion OS is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

**Last Updated**: 2026-01-13  
**Next Review**: 2026-01-20

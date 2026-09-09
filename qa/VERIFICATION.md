# Hoiku Poppy admin unification — verification status

Base main: `c69711347a5e8263509438dd9a51f7abf371c63d`

The shared shell uses Hoiku Office geometry and typography, with each service's own logo/color. Service switches in the sidebar and dashboard use full-document canonical links. Business repositories, API calls, permissions and individual service menus remain service-specific.

Local verification:
- Application build succeeded (npm run build).
- `npm run test:poppy-ui`: 11/11 passed (390, 850, 1440px sidebar/touch/current-service tests and 8 canonical document transfers).
- Cross-service visual inspection: 12/12 viewports without horizontal document overflow; all dashboard logo images loaded; no uncaught browser errors.
- Business UI fixtures: Office staff/shifts, Finance books/billing, Color jobs/applicants/handoff opened; all 9 Market feature-card routes retained.

The UI fixture uses synthetic/empty context and stubs canonical transfer destinations. These results do not verify real account SSO, persistence or production authorization.

Outstanding before main:
- Authenticated cross-service E2E on actual deployments.
- Production Finance and Color canonical entrypoints currently redirect unauthenticated visitors to Vercel login. The connected Vercel account does not expose those projects; CLI authentication is invalid. Public routing/protection must be verified by an account with access.
- Production post-deployment PC/mobile link crawl.

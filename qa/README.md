# Hoiku Poppy UI verification

Run `npm ci`, then `npm run qa:serve` in one terminal and `npm run test:poppy-ui` in another.
On Windows the tests use installed Microsoft Edge. On Linux install the browser with `npx playwright install chromium`.

The fixture imports the actual service shell, navigation, and dashboard components. Office uses its existing demo mode. Market replaces facility/account context; Finance replaces session/account context with an empty read-only fixture; Color uses its existing sample data mode. No production credentials or writes are used. These files are not part of the production entry graph.

Checks: sidebar service links and current service at 390/850/1440px, 44px touch targets, removal of obsolete status labels, and all eight sidebar/dashboard document transfers to the canonical domain. Transfer destinations are stubbed; this does not establish production login, cross-service SSO, data persistence, or successful deployment. Authenticated staging/production E2E remains required before merging.

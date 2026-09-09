## Change
Unify Finance with the Hoiku Poppy admin design and canonical cross-service navigation while preserving its business screens. Sidebar and dashboard show the four official logos, per-service colors and current service. Market removes legacy plan/trial/sidebar pricing displays; Office Finance links load the real Finance app instead of a coming-soon view.

## Validation
Application build passed. UI fixture checks: 11/11 at 390/850/1440px plus sidebar/dashboard document navigation. See qa/README.md and qa/VERIFICATION.md for reproduction and limits.

## Merge gate
Draft: authenticated cross-service E2E and production verification are incomplete. Finance/Color canonical URLs currently redirect to Vercel login, and the connected account cannot inspect those Vercel projects. Do not merge until these gates are resolved. Login implementation and backend business logic are not modified.

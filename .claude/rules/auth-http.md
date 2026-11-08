---
paths:
  - 'backend/src/lib/auth.ts'
  - 'backend/src/lib/authz.ts'
  - 'backend/src/app.ts'
  - 'backend/src/config/**'
  - 'backend/src/middleware/**'
  - 'backend/src/routes/**'
  - 'shared/src/**'
  - 'vercel.json'
---

# Authentication And HTTP Security

These rules govern authentication, ownership checks, and the HTTP surface.

## Authentication And Access Control

OWASP A01:2025 Broken Access Control is still the number one risk, and object-level authorization is where APIs lose it.

- Auth is better-auth on the Prisma adapter (`backend/src/lib/auth.ts`). `BETTER_AUTH_SECRET` is `min(32)` and required; generate with `openssl rand -base64 32`. Never commit one.
- `trustedOrigins` is `[env.CORS_ORIGIN]`. Never add localhost to a production value.
- Cookies are `httpOnly`, `secure` in production, and `sameSite: 'lax'`. `lax` is only correct because the browser reaches the API on the SPA's own origin (below); it was `none` while those were separate origins. Do not widen it back without also undoing that, and note that `none` costs the CSRF protection `SameSite` exists to give, leaving origin trust resting entirely on the single-origin CORS policy plus `trustedOrigins`. Widening `CORS_ORIGIN` to a list, a wildcard, or a reflected origin removes the only remaining control.
- **The browser must reach the API on the SPA's own origin.** `vercel.json` rewrites `/api/*` to Render, which is what makes the session cookie first-party; calling Render directly made it third-party and iOS discarded it, locking every mobile browser out of sign-in (#156). Setting `VITE_API_URL` in the Vercel project, or removing that rewrite, reintroduces the lockout with a green deploy and no error anywhere. Both are guarded in `ci.yml`. `'none'` is now looser than needed and `lax` would restore CSRF protection, but that swap is deliberately not bundled with #156.
- **Every route that accepts an `:id` must resolve it through `assertOwnedConsultation(id, doctorId)`** (`backend/src/lib/authz.ts`). It scopes on `doctorId` and `erasedAt: null`, and returns **404, never 403**, so the API is not an existence oracle. Do not "improve" that to 403.
- New protected routes must sit under a prefix in `PROTECTED_PREFIXES` (`backend/src/app.ts`) or mount `requireSession` explicitly. Authentication is per-prefix, not global; a new top-level prefix is unauthenticated by default.
- There is **no role model and no tenant scoping**. `User` has no `role` column, and `Consultation.doctorId` is the only scoping axis. Any feature needing an admin or clinic boundary needs a schema change and a migration first; do not fake it with a hardcoded email or env var.
- **Not built today:** no email verification (`requireEmailVerification: false`) with open self-service sign-up, and `POST /api/auth/guest` is limited by neither `express-rate-limit` nor better-auth (it is registered ahead of the better-auth catch-all). Treat both as known exposure when adding anything that costs money or writes data.

## HTTP Surface

- Already registered in `backend/src/app.ts` and not to be removed: `trust proxy`, `requestContext`, `helmet()`, `cors({ origin: env.CORS_ORIGIN, credentials: true })`, `express.json({ limit: '1mb' })`, and `errorHandler` last.
- **Zod at every boundary.** Request bodies parse before the first DB call; responses parse before they are sent. Types come from `z.infer`, never hand-written alongside a schema. Shared contracts live in `shared/`; never redeclare one locally.
- Errors leave through `ErrorEnvelopeSchema` shape only. `errorHandler` collapses any non-`HttpError` to a generic 500 and never reads `err.message` or `err.stack`. Do not add a branch that forwards a raw error, a Prisma message, or a stack to the client, in any environment (OWASP A10:2025 Mishandling of Exceptional Conditions).
- **There is no global rate limiter.** Only `POST /api/consultations/:id/analyze` is limited (`analyzeRateLimit`, 10/min, `backend/src/middleware/rate-limit.ts`). Any new route that writes, costs money, or calls the LLM must register its own limiter. Key on `clientKey`, which reads the address `middleware/client-ip.ts` resolved. That module is the only place allowed to decide which forwarding header to believe: `cf-connecting-ip` cannot be forged and wins by default, and `x-forwarded-for` is read only when the peer is in `TRUSTED_PROXY_IPS`, because the API is publicly reachable and a direct caller can otherwise forge it to get a fresh bucket per request. Never re-derive a caller address anywhere else.
- Client-supplied `x-request-id` is echoed only when it matches `SAFE_REQUEST_ID`. Never relax that pattern; it is what stops log-line forgery.
- `TranscriptSchema` has no `.max()` on turn count or text length, so the 1 MB body limit is the only bound. Add explicit caps before accepting any untrusted upload path.
- `GET /api/health` is unauthenticated and returns the configured provider name. Do not add anything else to it.

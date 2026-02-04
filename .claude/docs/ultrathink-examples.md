# Ultrathink Workflow - Usage Examples

This document provides detailed real-world examples of using the ultrathink workflow variants.

---

## Table of Contents

1. [Enhanced Hybrid Examples](#enhanced-hybrid-examples)
2. [Adversarial Mode Examples](#adversarial-mode-examples)
3. [Temporal Mode Examples](#temporal-mode-examples)
4. [Mixed Mode Examples](#mixed-mode-examples)

---

## Enhanced Hybrid Examples

### Example 1: Simple Feature (Skip Critique)

**Task**: "Add a logout button to the navbar"

**Complexity**: Low (2/10) - Skip critique stage

```
─── A: PLAN ──────────────────────────────────────────────────────
Spawning 7 agents in parallel...

|| Arch agent:
   - NavBar location: src/components/nav/NavBar.tsx
   - Auth hook: src/hooks/useAuth.ts
   - No existing logout UI

|| Req agent:
   - Step 1: Add logout button to NavBar
   - Step 2: Wire onClick to auth.logout()
   - Step 3: Redirect to /login after logout

|| Conv agent:
   - Existing pattern: IconButton components in NavBar
   - Auth methods: signIn(), signOut(), user state
   - No logout button anywhere

|| Risk agent:
   - Edge case: Logout during active request
   - Failure mode: Logout fails, user still sees logged-in state

|| Dep agent:
   - Parallel: logout-button component || auth-handler logic
   - Sequential: Both independent

|| Wild agent:
   - What if auto-logout on idle timeout (30min)?
   - Challenge: Do we need logout at all if session expires?

|| DA agent (INV-4: must oppose):
   - Counter-proposal: NO logout button, auto-expire only
   - Rationale: Users don't manually logout, reduces UI clutter
   - Better UX: Clear session on browser close

[!] GATE: INV-1 check
    Findings:
    - No 🔴 CRITICAL
    - 🟡 MEDIUM: Wild/DA raised valid idle timeout alternative

    Decision: Log alternative for future consideration

    ✓ PASS

@cp("post-plan")

Complexity assessment: 2/10
B??(complexity>3): SKIPPED (trivial task)

─── C: FINALIZE ──────────────────────────────────────────────────
-> Finalization agent:

parallel_groups: [
  [logout-button-ui],     # p1: UI component
  [auth-handler-logic]     # p2: Auth integration (parallel with p1)
]

test_gates: {
  p1: Visual test (button renders),
  p2: Unit test (logout() called on click)
}

DA objections addressed:
- Dismissed: Manual logout needed for shared computers
- Future: Consider idle timeout as enhancement (TODO)

[!] GATE: INV-1 check
    ✓ PASS

@cp("post-finalize")

D??(has_tests): SKIPPED (trivial, manual test sufficient)

─── E: IMPLEMENT ─────────────────────────────────────────────────
Executing parallel_groups...

|| p1: logout-button-ui
   File: src/components/nav/NavBar.tsx
   Changes:
   - Import LogOut icon from lucide-react
   - Add IconButton with onClick={handleLogout}

   [!] GATE: INV-1, security, perf
       ✓ PASS

|| p2: auth-handler-logic
   File: src/hooks/useAuth.ts (already has logout method)
   Changes:
   - No changes needed, logout() already exists
   - Wire NavBar onClick to auth.signOut()

   [!] GATE: INV-1, security, perf
       ✓ PASS

All phases complete.
✓ SUCCESS
```

**Token cost**: ~500 tokens (skipped B and D stages)

---

### Example 2: Medium Feature (Full Workflow)

**Task**: "Add user authentication with JWT tokens"

**Complexity**: High (8/10) - Full workflow with critique cycles

```
─── A: PLAN ──────────────────────────────────────────────────────
@cp("post-plan")

Spawning 7 agents in parallel...

|| Arch agent:
   - Auth middleware: src/middleware.ts
   - Token storage: httpOnly cookies
   - Libraries: jose (JWT), bcrypt (password hashing)
   - Routes: /api/auth/login, /api/auth/refresh, /api/auth/logout

|| Req agent:
   - Step 1: Token utils (sign, verify, refresh)
   - Step 2: Password hashing utils
   - Step 3: Auth middleware (protect routes)
   - Step 4: Login/logout endpoints
   - Step 5: Refresh token rotation
   - Step 6: Integration tests

|| Conv agent:
   - Existing: src/lib/api/client.ts has request interceptors
   - Pattern: Middleware in src/middleware.ts
   - No existing auth - greenfield implementation

|| Risk agent:
   - Token expiry handling (refresh flow)
   - Refresh token rotation security
   - XSS if storing tokens in localStorage (don't!)
   - CSRF protection needed

|| Dep agent:
   - Parallel: token-utils || password-hashing (independent)
   - Sequential: middleware depends on token-utils
   - Sequential: endpoints depend on middleware
   - Parallel: protected-routes || refresh-endpoint (both depend on middleware)
   - Sequential: integration-tests depend on all

|| Wild agent:
   - What if passwordless authentication? (Magic links only)
   - What if session-based instead of JWT? (Simpler, no JWT complexity)
   - Challenge: Do we need auth middleware or use edge functions?

|| DA agent (INV-4):
   - Counter-proposal: Session-based auth with Redis
   - Rationale:
     * Simpler implementation (no JWT signing/verification)
     * Easier to invalidate sessions (just delete from Redis)
     * No refresh token complexity
     * Better for this use case (single-domain app)
   - Trade-off: Redis dependency, but Redis already in stack

[!] GATE: INV-1 check
    Findings:
    - 🔴 CRITICAL: Wild raised passwordless alternative not addressed
    - 🔴 CRITICAL: DA raised session vs JWT decision not made

    ⊗ RECOVER: retry (1/2)

    Analysis needed: JWT vs Session vs Passwordless

    -> Adding decision matrix:

    | Approach | Pros | Cons | Verdict |
    |----------|------|------|---------|
    | JWT | Stateless, scalable | Complex refresh flow, can't revoke | ❌ |
    | Session+Redis | Simple, revocable | Redis dependency | ✅ |
    | Passwordless | Most secure, no passwords | Higher friction, SMS cost | 🔜 Future |

    Decision: Session-based auth with Redis (accept DA proposal)
    Rationale: Simpler, Redis already in stack, can add JWT later if needed

    [!] Re-run gate...
    ✓ PASS (no 🔴 remaining)

@cp("post-plan")

─── B: CRITIQUE (complexity=8) ───────────────────────────────────
@cp("post-critique")

Iteration ×1:
  Spawning 3 NEW agents...

  || Critical agent:
     - Session fixation attack risk
     - Need session regeneration after login
     - CSRF tokens required for state-changing operations
     - 🟠 HIGH: Security concerns not addressed in plan

  || AltExplorer agent:
     - Consider Passport.js for session management
     - Redis session store already has library (connect-redis)
     - Existing patterns in Node.js ecosystem

  || Feasibility agent:
     - Session-based: 1-2 days (simpler than JWT)
     - Libraries mature (express-session, connect-redis)
     - Risk: LOW (well-established pattern)

  [!] GATE: INV-1 check
      🟠 HIGH: Security concerns (CSRF, session fixation)
      ⊗ RECOVER: -> B [minor] (not structural issue)

  -> Refinement agent:
     Addressing security concerns:
     - Session regeneration: Call req.session.regenerate() after login
     - CSRF protection: Use csurf middleware
     - Secure cookies: httpOnly, secure, sameSite flags
     - Session timeout: 30min idle, 24hr absolute

Iteration ×2:
  Spawning 3 NEW agents (fresh per INV-2)...

  || Critical agent (NEW):
     - Refinement looks good
     - Session timeout reasonable
     - CSRF protection appropriate
     - ✓ No critical issues

  || AltExplorer agent (NEW):
     - Consider rate limiting for login attempts
     - Brute force protection needed
     - 🟡 MEDIUM: Rate limiting not in plan

  || Feasibility agent (NEW):
     - Security additions add 0.5 days
     - Still feasible within sprint
     - ✓ Looks good

  [!] GATE: INV-1 check
      🟡 MEDIUM: Rate limiting suggested

      Decision: Add to plan (express-rate-limit)

      ✓ PASS

─── C: FINALIZE ──────────────────────────────────────────────────
@cp("post-finalize")

-> Finalization agent:

parallel_groups: [
  [session-utils, password-hashing],           # p1: Independent utilities
  [session-middleware, csrf-middleware],        # p2: Depends on session-utils
  [login-endpoint, logout-endpoint],            # p3: Depends on p2
  [protected-routes],                           # p4: Depends on p2
  [rate-limiting],                              # p5: Independent
  [integration-tests]                           # p6: Depends on all
]

test_gates: {
  p1: Unit tests for utils (hash/verify password, session create/destroy),
  p2: Middleware unit tests + mock integration,
  p3: Endpoint tests (login success/fail, logout),
  p4: Protected route tests (authorized/unauthorized),
  p5: Rate limit tests (under/over threshold),
  p6: Full auth flow e2e
}

DA objections incorporated:
- ✅ Session-based instead of JWT (accepted proposal)
- ✅ Redis for session storage

DA objections dismissed:
- None (DA proposal fully adopted)

Security checklist:
- [x] Session regeneration after login
- [x] CSRF protection
- [x] httpOnly cookies
- [x] Rate limiting
- [x] Password hashing (bcrypt)
- [x] Session timeout

[!] GATE: INV-1 check
    ✓ PASS

─── D: TEST ──────────────────────────────────────────────────────
@cp("post-test")

D1: Spawning 3 test writers in parallel...

|| Unit agent:
   Created: __tests__/auth/session-utils.test.ts
           __tests__/auth/password.test.ts
           __tests__/middleware/session.test.ts
           __tests__/middleware/csrf.test.ts

|| Integration agent:
   Created: __tests__/integration/auth-flow.test.ts
           __tests__/integration/protected-routes.test.ts

|| EdgeCase agent:
   Created: __tests__/edge-cases/session-fixation.test.ts
           __tests__/edge-cases/concurrent-login.test.ts
           __tests__/edge-cases/rate-limit-boundary.test.ts

[!] Wait for all test writers...

D2: Iteration ×1

  Spawning 3 critique agents...

  || Gap agent:
     - Missing test: Session timeout expiry
     - Missing test: CSRF token rotation
     - Missing test: Password reset flow (if applicable)
     - 🟠 HIGH: Coverage gaps

  || FalsePos agent:
     - No false positives detected

  || Assertion agent:
     - session-fixation.test.ts needs better assertions
     - Should verify old session ID invalidated

  [!] -> Update agent:
     Adding missing tests:
     - session-timeout.test.ts
     - csrf-rotation.test.ts
     - Improving assertion in session-fixation.test.ts

  ⊗ -> D2 (not clean yet)

D2: Iteration ×2

  Spawning 3 NEW critique agents...

  || Gap agent (NEW):
     - Coverage looks comprehensive now
     - ✓ No significant gaps

  || FalsePos agent (NEW):
     - Timeout test may flake (time-based)
     - Suggestion: Use fake timers

  || Assertion agent (NEW):
     - All assertions clear and specific
     - ✓ Good quality

  [!] Decision: Accept flake risk, add retry in CI

      ✓ clean -> D3

D3: Run per INV-3

|| unit tests (parallel, 15 test files)
   Running...
   ✓ 87/87 tests passed

-> integration tests (sequential, shared Redis state)
   Running...
   ✓ 12/12 tests passed

|| mutation tests (parallel)
   Running...
   Mutation score: 91% (threshold: 80%)
   ✓ PASS

D4: ✓ pass -> E

─── E: IMPLEMENT ─────────────────────────────────────────────────
Executing per parallel_groups...

|| p1: session-utils, password-hashing
   Files created:
   - src/lib/auth/session.ts
   - src/lib/auth/password.ts

   [!] GATE: INV-1, security, perf
       ✓ PASS

-> p2: session-middleware, csrf-middleware
   Files created:
   - src/middleware/session.ts
   - src/middleware/csrf.ts
   - Updated: src/middleware.ts (import and apply)

   [!] GATE: INV-1, security, perf
       ✓ PASS

|| p3: login-endpoint, logout-endpoint
|| p4: protected-routes (parallel with p3)
   Files created:
   - src/app/api/auth/login/route.ts
   - src/app/api/auth/logout/route.ts
   - Updated: src/middleware.ts (protect routes)

   [!] GATE: INV-1, security, perf
       ✓ PASS

|| p5: rate-limiting
   Files created:
   - src/middleware/rate-limit.ts
   - Updated: src/app/api/auth/login/route.ts (apply rate limit)

   [!] GATE: INV-1, security, perf
       ✓ PASS

-> p6: integration-tests (already created in D1)
   Running final verification...
   ✓ All tests pass

All phases complete.
Cleanup: rm -rf .claude/ultrathink-temp/{session}/

✓ SUCCESS
```

**Outcome**: Session-based auth implemented with comprehensive security measures
**Token cost**: ~2500 tokens (full workflow with 2 critique iterations)

---

## Adversarial Mode Examples

### Example 1: Security-Critical Architecture Decision

**Task**: "Choose authentication system for healthcare app (HIPAA compliance)"

**Why Adversarial**: High-stakes, irreversible, security-critical

```
─── A: POSITIONS ─────────────────────────────────────────────────
Spawning CONSENSUS and DA agents...

|| CONSENSUS agents (Arch, Req, Conv, Dep, Test):

   **Proposal**: OAuth 2.0 + OIDC with PKCE

   **Rationale**:
   - Industry standard for healthcare (Epic, Cerner use it)
   - Compliance: Maps to HIPAA "Unique User Identification"
   - Mature libraries: NextAuth.js, oauth4webapi
   - Existing expertise in team
   - Future: Can federate with hospital SSO

   **Anticipated objections**:
   - "FIDO2 more secure": True, but adoption barrier high
   - "Session-based simpler": True, but doesn't scale to mobile
   - "OAuth complexity attack surface": Mitigated by using PKCE

   💰 Staking: 30 CRED (H confidence)

|| DA agent (MUST oppose per INV-4):

   **Counter-proposal**: Passwordless (FIDO2) + Magic Links fallback

   **Rationale**:
   - Healthcare = highest security bar, FIDO2 eliminates password breach risk entirely
   - HIPAA "Access Control": Passwordless better than OAuth for this requirement
   - WebAuthn adoption improving (Apple/Google Passkeys)
   - Magic links for recovery (no SMS cost like TOTP)
   - No password database to breach (major HIPAA risk)

   **Direct rebuttals to CONSENSUS**:
   - OAuth industry standard: Doesn't make it best, legacy inertia
   - Mature libraries: FIDO2 libraries equally mature (SimpleWebAuthn)
   - Existing expertise: Team can learn, not a technical blocker
   - Hospital SSO: Can still federate, FIDO2 not exclusive

   **New objections**:
   - OAuth refresh token rotation complexity introduces bugs
   - Password-based (OAuth) requires password policy enforcement (complex)
   - OAuth provider lock-in (Okta, Auth0) vs FIDO2 (open standard)

   💰 Staking: 20 CRED (M confidence)

[!] POSITION GATE
    ✓ Both positions well-formed

─── B: DEBATE ────────────────────────────────────────────────────

⚔️ CONSENSUS → THESIS:

"We propose OAuth 2.0 + OIDC for the following reasons:

**Evidence**:
1. Epic MyChart (largest EHR patient portal) uses OAuth 2.0
2. SMART on FHIR standard mandates OAuth 2.0 for health data exchange
3. Team has 2 developers with OAuth experience vs 0 with FIDO2
4. Hospital SSO integration roadmap requires OIDC federation
5. Mobile app planned for Q3 (OAuth works better than sessions)

**Addressing DA objections**:
- Password breach risk: We'll enforce MFA (TOTP) on top of OAuth, mitigates risk
- Refresh token bugs: Use short-lived access tokens (15min), reduce rotation frequency
- Provider lock-in: Self-host OAuth server (Keycloak), no vendor lock-in

**Why FIDO2 not suitable**:
- Healthcare workers share computers, FIDO2 doesn't work well (need hardware key)
- Magic link fallback = email compromise becomes security risk
- Zero-day recovery: User loses passkey, locked out (high support burden)
- Hospital IT policies may block WebAuthn (security theater)

We anticipate DA will argue FIDO2 has higher security ceiling, but we believe OAuth + MFA provides sufficient security with better UX and lower implementation risk."

⚔️ DA → ANTITHESIS:

"The CONSENSUS position prioritizes convenience over security in a HIPAA context - this is backwards.

**Direct rebuttals**:
1. Epic uses OAuth: Appeal to authority fallacy. Epic also has breaches (2023 incident). We can do better.
2. SMART on FHIR: Applies to external integrations, not internal authentication. Red herring.
3. Team experience: Learning curve is 1-2 weeks. Not a blocker for 6-month project.
4. Hospital SSO: FIDO2 doesn't prevent SSO. Can use SAML + WebAuthn (both can coexist).
5. Mobile app: FIDO2 works on mobile (iOS/Android biometrics). Actually better UX than OAuth login form.

**New objections**:
- MFA on top of OAuth: Band-aid. Why add MFA complexity when FIDO2 is MFA by design?
- Self-host Keycloak: Now you're maintaining OAuth infra + app. FIDO2 is lighter.
- Healthcare workers share computers: This supports my position! Shared computers = should NOT auto-login. FIDO2 forces explicit auth per session.

**Evidence for FIDO2**:
- NIST 800-63B Level 3 (highest): Requires hardware authenticator (FIDO2 qualifies, password+TOTP does not)
- Verizon 2023 DBIR: 80% of breaches involve stolen credentials. FIDO2 eliminates this vector.
- Recovery: YubiKey + backup codes (standard FIDO2 pattern). Support burden lower than password resets.

**The real question**: Why accept password breach risk when we don't have to?

CONSENSUS has not addressed the core security argument. They're optimizing for team convenience at the expense of patient data security. In healthcare, this is malpractice."

⚔️ JUDGE → SYNTHESIS:

"Both positions have merit. Let me reconcile:

**Agreement**:
- Healthcare requires high security bar (both agree)
- SSO integration needed (both agree it's possible)
- Mobile app support required (both agree it works)

**Genuine disagreement**:
1. **Risk tolerance**: CONSENSUS accepts password breach risk + MFA mitigation. DA rejects any password risk.
2. **Implementation complexity**: CONSENSUS sees FIDO2 as higher risk. DA sees OAuth+MFA as higher complexity.
3. **User experience**: CONSENSUS prioritizes familiar login flow. DA prioritizes security over familiarity.

**Synthesis proposal**:
- **Hybrid approach**: FIDO2 as PRIMARY, OAuth as FALLBACK for edge cases
- **Staged rollout**: Staff (internal, tech-savvy) adopt FIDO2 first. Patients (external) opt-in gradually.
- **Metrics-driven**: Track adoption rates, support burden, security incidents. Pivot if needed.
- **Recovery flow**: YubiKey + backup security key + admin override (not magic links)

**unresolved_tensions**: [
  "Fallback OAuth may become primary if FIDO2 adoption low - then we built two systems",
  "Hybrid system has higher implementation complexity than either alone",
  "Admin override for recovery introduces insider threat risk"
]"

🛡️ VETO POINT:

CONSENSUS: SOFT veto - "Hybrid system too complex, pick one approach"
DA: No veto - "Hybrid acceptable, but would prefer FIDO2-only"
JUDGE: "Acknowledge complexity concern, but hybrid is risk mitigation strategy"

[!] DEBATE GATE: proceed if unresolved_tensions < 3
    Count: 3 tensions (exactly at threshold)

    ✓ PROCEED (borderline, but admissible)

─── C: CRITIQUE ──────────────────────────────────────────────────
Spawning 3 NEW agents...

|| Critical agent:
   - Hybrid system complexity is real concern
   - FIDO2 recovery flow underspecified (what if user loses both keys?)
   - Admin override needs audit logging, approval workflow
   - 🔴 CRITICAL (confidence: H): Recovery flow must be detailed
   - SOFT veto: "Cannot finalize until recovery specified"

|| AltExplorer agent:
   - What about certificate-based auth? (Smart cards)
   - Hospitals already issue badges, could embed certs
   - Stronger than FIDO2 (hardware-backed), familiar to IT
   - Trade-off: Requires PKI infrastructure

|| Feasibility agent:
   - FIDO2 PRIMARY: 3-4 weeks implementation
   - Hybrid (FIDO2 + OAuth): 5-6 weeks implementation
   - Certificate-based: 8-12 weeks (PKI setup)
   - Risk: MEDIUM (FIDO2 less proven in production)
   - Recommendation: Prototype FIDO2 for 1 week before committing

💰 CRED Resolution (from Stage A):
   - CONSENSUS staked 30 CRED on OAuth-only
   - DA staked 20 CRED on FIDO2-only
   - SYNTHESIS chose hybrid (partial adoption of DA)

   **Resolution**:
   - CONSENSUS: Lost bet (proposal not adopted) → -30 CRED
   - DA: Partial win (primary approach adopted) → +10 CRED (50% of stake)

   **New balances**:
   - CONSENSUS: 100 - 30 = 70 CRED
   - DA: 100 - 20 + 10 = 90 CRED

[!] CRITIQUE GATE:
    🔴 CRITICAL: Recovery flow unspecified

    ⊗ RECOVER: Must address before finalize

    -> Adding recovery specification:

    **FIDO2 Recovery Flow**:
    1. User enrollment: Require 2 security keys + 5 backup codes
    2. Lost key: Use second key to add new key
    3. Lost both keys: Use backup code (one-time use) + admin approval
    4. Lost everything: In-person identity verification at facility + manager approval + audit log
    5. Backup codes regenerated after use (prevent replay)

    **Audit requirements**:
    - All admin overrides logged to immutable audit log
    - Manager approval workflow (2-person rule)
    - Security team notification on override use
    - Monthly review of override usage

    [!] Re-run gate...

    ✓ PASS

─── D: FINALIZE ──────────────────────────────────────────────────
Spawning Finalization agent...

-> Finalization agent:

**Integrated plan**:

parallel_groups: [
  [fido2-prototype],                    # p0: 1-week validation (NEW)
  [fido2-registration, backup-codes],   # p1: Core FIDO2
  [recovery-flow, audit-logging],       # p2: Recovery system
  [oauth-fallback],                     # p3: Fallback (optional based on p0)
  [admin-override-workflow],            # p4: Admin tools
  [integration-tests]                   # p5: Full flow testing
]

**Decision gates**:
- After p0 (prototype): GO/NO-GO on FIDO2. If NO-GO, pivot to OAuth-only.
- After p1+p2: Beta with 10 staff users for 2 weeks
- After beta: GO/NO-GO on rollout. If < 80% adoption, keep OAuth fallback.

**DA objections incorporated**:
- ✅ FIDO2 as primary authentication
- ✅ Passwordless approach
- ✅ Eliminated password breach risk (primary path)

**DA objections dismissed**:
- ❌ No OAuth fallback (kept fallback for risk mitigation)

**CONSENSUS concerns addressed**:
- ✅ Staged rollout (staff first, patients opt-in)
- ✅ Prototype to validate (reduce implementation risk)
- ✅ Metrics-driven pivot option (can fall back to OAuth)

**Security checklist**:
- [x] NIST 800-63B Level 3 compliance (FIDO2)
- [x] No password storage (eliminated breach risk)
- [x] Hardware-backed authentication
- [x] Audit logging for overrides
- [x] 2-person rule for admin recovery
- [x] Backup codes + security keys (redundancy)

🛡️ FINAL VETO:

CONSENSUS (70 CRED, 8.4 votes): No veto. "Acceptable with prototype gate."
DA (90 CRED, 9.5 votes): No veto. "Primary goal achieved."
Critical (100 CRED, 10 votes): No veto. "Recovery flow now specified."
AltExplorer (100 CRED, 10 votes): No veto. "Certificate auth noted for future."
Feasibility (100 CRED, 10 votes): No veto. "Prototype reduces risk."

[!] FINALIZE GATE:
    ✓ PASS (no vetoes, consensus achieved)

─── E: IMPLEMENT (standard workflow continues) ───────────────────
...
```

**Outcome**: Hybrid FIDO2 (primary) + OAuth (fallback) system with staged rollout and prototype validation gate

**Token cost**: ~1200 tokens (debate overhead + CRED tracking)

**Key benefits of Adversarial mode**:
- DA forced CONSENSUS to justify password risk
- Debate revealed hybrid approach (neither agent's original proposal)
- CRED system incentivized thoughtful positions
- JUDGE synthesis reconciled tensions
- Veto system ensured all stakeholders satisfied

---

## Temporal Mode Examples

### Example 1: Exploratory API Design

**Task**: "Design caching layer for API (requirements unclear)"

**Why Temporal**: Uncertain requirements, late discoveries likely, need to explore multiple approaches

```
─── A: PLAN ──────────────────────────────────────────────────────
@cp("genesis")

Spawning planning agents...

|| Arch agent:
   - Suggests Redis for distributed caching
   - Cache keys: `api:{endpoint}:{hash(params)}`
   - TTL: 5 minutes default

|| Req agent:
   - Cache invalidation on data mutations
   - Cache warming on deploy
   - Cache hit/miss metrics

|| Conv agent:
   - Found existing in-memory cache: src/lib/cache/memory.ts
   - Used for session data only
   - Pattern: LRU eviction

|| Wild agent:
   - What about edge caching (Cloudflare)?
   - What about no caching (simplicity)?
   - Challenge: Is caching premature optimization?

[!] ✓ PASS

@cp("post-plan")

─── B: CRITIQUE ──────────────────────────────────────────────────

@peek {depth: 2, queries: ["What will fail in implementation?"]}

**@peek.prophecy**:
  "Redis introduces network latency (1-5ms) for every request.
   Current response times: p50=20ms, p95=50ms.
   Redis latency adds 5-25% overhead for small objects.

   Existing in-memory cache handles 80% of use cases (session data).
   Only 20% of API calls need distributed caching (user profile data).

   Edge caching (Cloudflare) breaks authentication cookies (httpOnly = can't cache per-user).

   Prediction: Redis will slow down fast endpoints, make caching net-negative for performance."

**@peek.warnings**: [
  {
    severity: "CRITICAL",
    message: "Redis may be slower than no caching for this workload"
  }
]

×1 Critique iteration:

|| Critical agent:
   - Redis overkill for single-server deployment
   - Network latency concern real (peek prophecy confirms)
   - 🔴 CRITICAL: Redis not justified

|| AltExplorer agent:
   - Hybrid approach? In-memory for hot data, Redis for shared?
   - How to split cleanly?

|| Feasibility agent:
   - Redis: 1 week implementation
   - Hybrid: 2 weeks (more complex)
   - In-memory only: 2 days (extend existing)

[!] GATE:
    @peek.warnings.critical = 1

    🔴 CRITICAL: Redis performance regression risk

    Triggering retroactive edit...

    <<< A.output {
      reason: "@peek revealed Redis adds latency, not needed for single-server",
      edit: "Hybrid approach: In-memory primary (hot data), Redis secondary (shared data like user profiles)"
    }

    ~~> [B]  # Re-run B with new plan

    Spawning NEW critique agents...

×2 Critique iteration (with hybrid plan):

|| Critical agent (NEW):
   - Hybrid makes sense
   - Need clear split rules: What goes where?
   - 🟠 HIGH: Split criteria unspecified

|| AltExplorer agent (NEW):
   - Split by data type:
     * Sessions/temp data → in-memory
     * User profiles/global → Redis
   - Clear boundary

|| Feasibility agent (NEW):
   - Hybrid: 2 weeks
   - Split rules clear
   - ✓ Manageable complexity

[!] GATE:
    🟠 HIGH: Split criteria now clear (resolved by AltExplorer)

    ✓ PASS

-> Refinement agent (informed by @peek.prophecy):

   **Cache split rules**:
   - In-memory: Session data, rate limiting counters, hot API responses (<100 req/min)
   - Redis: User profiles, global settings, cold API responses (>100 req/min but need shared state)

   **Performance targets**:
   - In-memory hit: <1ms
   - Redis hit: <5ms
   - Cache miss: <50ms (fetch from DB)

@cp("post-critique")

─── C: FINALIZE ──────────────────────────────────────────────────

-> Finalization agent → options: [
  "In-memory only (simple, fast, but no sharing across servers)",
  "Hybrid in-memory + Redis (balanced)",
  "Redis only (distributed, but slower)"
]

options.divergence = HIGH (3 very different approaches)

@spec {
  branches: options,
  depth: 1,  # Preview through TEST stage
  criteria: "predicted_test_pass * performance * maintainability"
}

  ─── D-SPECULATIVE (Parallel Preview) ───────────────────────

  **Branch 1: In-memory only**

  Tests:
  - Unit: ✓ All pass
  - Integration: ✓ Pass
  - Performance: p50=18ms, p95=45ms (baseline: 20/50ms)
  - Load test: ✓ Pass (single server)

  Maintainability: HIGH (simple, one cache to maintain)

  Score: 1.0 * 0.95 * 1.0 = 0.95

  **Branch 2: Hybrid**

  Tests:
  - Unit: ✓ All pass
  - Integration: ✓ Pass (with split rules)
  - Performance: p50=19ms, p95=47ms (Redis adds 1-2ms to 20% of requests)
  - Load test: ⚠️ In-memory fills up under high load (need LRU)

  Maintainability: MEDIUM (two caches, split logic)

  Score: 1.0 * 0.90 * 0.70 = 0.63

  **Branch 3: Redis only**

  Tests:
  - Unit: ✓ All pass
  - Integration: ✓ Pass
  - Performance: p50=24ms, p95=55ms (Redis adds 4-5ms to all requests)
  - Load test: ✓ Pass (distributed)

  Maintainability: HIGH (one cache, but Redis ops overhead)

  Score: 1.0 * 0.75 * 0.80 = 0.60

@collapse {winner: "in-memory"}  # Highest score: 0.95

**Justification**: Single-server deployment doesn't need distribution. In-memory fastest and simplest. Can add Redis later if scale requires.

@cp("post-finalize")

─── D: TEST ──────────────────────────────────────────────────────

D1: || Unit|Integration|EdgeCase writers → [!]

D2 ×1:
    || Gap agent: Missing cache size limits
    || FalsePos agent: None
    || Assertion agent: Eviction policy needed (LRU)

    [!] → -> Update agent: Add LRU tests

D2 ×2:
    || Gap agent (NEW): Coverage looks good
    || FalsePos agent (NEW): None
    || Assertion agent (NEW): Good

    [!] ✓ clean -> D3

D3: Run tests

    || unit tests: ✓ 25/25 pass
    -> integration tests: ⚠️ FAIL

    Error: "Cache grows unbounded in load test, OOM after 10k requests"

    iteration = 2, !improving

    Triggering restore + branch...

    @restore("post-critique")
    @branch("alt-strategy") {
      Problem: LRU eviction not implemented

      -> AlternativeTestStrategy agent:
         Instead of going back to implementation, let's write LRU tests first (TDD)

         Tests created:
         - lru-eviction.test.ts
         - cache-size-limit.test.ts
    }

D3 (retry with LRU tests):
    Running tests (now includes LRU tests)...

    ⚠️ FAIL: LRU tests fail (implementation doesn't exist yet)

    Expected behavior now clear from tests.

D4: Implementation needed -> E

@cp("post-test")

─── E: IMPLEMENT ─────────────────────────────────────────────────

parallel_groups: [
  [cache-utils, lru-eviction],  # p1
  [cache-middleware],            # p2: depends on p1
  [integration-tests]            # p3: depends on p2
]

|| p1: cache-utils, lru-eviction

   File: src/lib/cache/memory.ts

   Implementation:
   - Added LRU eviction algorithm
   - Max size: 1000 entries
   - Evict oldest on overflow

   [!] GATE: INV-1, security, perf

       Running tests...
       ⚠️ FAIL: Memory leak detected in LRU implementation

       Issue: Map not releasing references after eviction

       blockers.severe = 1

       Triggering full re-cascade...

       <<< A.output {
         reason: "LRU implementation has memory leak, custom code risky",
         edit: "Use existing LRU library (lru-cache by isaacs) instead of custom implementation"
       }

       ~~> ['all']  # Full re-cascade from A

       Cost: 10x base workflow (full retry)

// Re-run from A with library approach

@restore("genesis")

─── A: PLAN (RETRY) ──────────────────────────────────────────────
@cp("post-plan")

|| Arch agent:
   - Use lru-cache library (battle-tested)
   - In-memory only
   - Max size: 1000 entries, max age: 5 minutes

|| Req agent (simplified):
   - Step 1: Install lru-cache
   - Step 2: Wrap in cache utils
   - Step 3: Cache middleware
   - Step 4: Tests

[!] ✓ PASS

// ... B and C stages streamlined (no major issues) ...

─── E: IMPLEMENT (RETRY) ─────────────────────────────────────────

|| p1: cache-utils (with lru-cache library)

   File: src/lib/cache/memory.ts

   Implementation:
   ```typescript
   import { LRUCache } from 'lru-cache';

   const cache = new LRUCache({
     max: 1000,
     ttl: 1000 * 60 * 5, // 5 minutes
   });
   ```

   [!] GATE: INV-1, security, perf
       ✓ PASS (no memory leak, library handles it)

-> p2: cache-middleware
   [!] ✓ PASS

-> p3: integration-tests
   Running all tests...
   ✓ 30/30 pass (including LRU tests)

@cp("complete")

All phases complete.
Cleanup: rm -rf .claude/ultrathink-temp/{session}/

✓ SUCCESS
```

**Outcome**: Simple in-memory cache with proven LRU library

**Token cost**: ~7500 tokens
- Base workflow: 1x
- @peek: +0.6x (depth=2)
- <<< A ~~> [B]: +1.5x (single stage ripple)
- @spec(3, depth=1): +3x (speculative execution)
- @restore + branch: +0.5x (test strategy pivot)
- <<< A ~~> [all]: +10x (full cascade, biggest cost)

**Total**: ~16.6x base cost

**Key benefits of Temporal mode**:
- @peek prevented wrong approach early (Redis not needed)
- Speculative execution validated in-memory approach before committing
- Retroactive edit caught memory leak before deployment
- Final implementation much simpler than original plan (library vs custom)
- High cost justified by avoiding production issues

---

## Mixed Mode Examples

### Example 1: Adversarial + Temporal Hybrid

**Task**: "Design real-time collaboration system (high-stakes + uncertain design)"

**Why Hybrid**: High-stakes decision (Adversarial) + exploratory design (Temporal)

```
─── A: POSITIONS + @cp ───────────────────────────────────────────
@cp("genesis")  # Temporal checkpoint

|| CONSENSUS proposal: WebSocket-based operational transforms (OT)
   💰 30 CRED

|| DA counter: CRDT (Conflict-free Replicated Data Types)
   💰 20 CRED

[!] POSITION GATE
@cp("post-positions")  # Temporal checkpoint

─── B: DEBATE + @peek ────────────────────────────────────────────

@peek {depth: 2, queries: ["Which approach will have more bugs in production?"]}

**@peek.prophecy**:
  "OT requires careful ordering of operations, subtle bugs likely.
   CRDTs have proven correctness guarantees, fewer edge cases.
   However, CRDTs require more bandwidth (send full state)."

⚔️ THESIS (CONSENSUS + @peek insights):
   "... but @peek reveals OT has higher bug risk, we acknowledge this"

⚔️ ANTITHESIS (DA):
   "Exactly - @peek confirms CRDT correctness advantage"

⚔️ SYNTHESIS (JUDGE):
   unresolved_tensions: [
     "OT faster but buggier",
     "CRDT correct but bandwidth-heavy"
   ]

🛡️ VETO: DA HARD veto on OT-only approach

[!] DEBATE GATE: unresolved HARD veto

    ESCALATION: tensions + veto → try SPECULATIVE EXECUTION

    @spec {
      branches: ["OT", "CRDT", "Hybrid OT+CRDT"],
      depth: 2,  # Through TEST and early IMPLEMENT
      criteria: "bugs * performance * bandwidth"
    }

    **Branch 1: OT**
    - Bugs: 12 edge cases found in testing (p=0.6)
    - Performance: p50=5ms (p=1.0)
    - Bandwidth: 10KB/min (p=0.9)
    - Score: 0.6 * 1.0 * 0.9 = 0.54

    **Branch 2: CRDT**
    - Bugs: 2 edge cases (p=0.95)
    - Performance: p50=8ms (p=0.85)
    - Bandwidth: 50KB/min (p=0.5)
    - Score: 0.95 * 0.85 * 0.5 = 0.40

    **Branch 3: Hybrid**
    - Bugs: 5 edge cases (p=0.80)
    - Performance: p50=6ms (p=0.95)
    - Bandwidth: 20KB/min (p=0.75)
    - Score: 0.80 * 0.95 * 0.75 = 0.57

    @collapse {winner: "Hybrid"}

    DA: Withdraw HARD veto (speculative execution shows hybrid works)

[!] DEBATE GATE: ✓ PASS (veto withdrawn)

@cp("post-debate")

─── C-E: Standard workflow continues ────────────────────────────
...
```

**Outcome**: Hybrid OT+CRDT approach chosen through speculative execution

**Token cost**: ~2000 tokens (Adversarial debate + Temporal spec)

**Key benefits**:
- Adversarial debate surfaced concerns
- HARD veto forced rigorous evaluation
- @peek provided early validation
- Speculative execution resolved deadlock
- Temporal checkpoint allowed safe experimentation

---

## Summary: When to Use Each Mode

| Mode | Best For | Token Cost | Key Benefit |
|------|----------|------------|-------------|
| **Enhanced Hybrid** | Most tasks | 450-600 | Balanced, predictable |
| **Adversarial** | High-stakes, security | 700-1000 | Forced dissent, rigorous evaluation |
| **Temporal** | Exploratory, uncertain | 900-9000 (variable) | Safe experimentation, late discovery handling |
| **Mixed** | Complex + uncertain | 1500-3000 | Best of both worlds |

**Rule of thumb**:
- Start with Enhanced Hybrid (default)
- Add Adversarial if decision irreversible or security-critical
- Add Temporal if requirements unclear or assumptions likely wrong
- Mix both if high-stakes AND uncertain

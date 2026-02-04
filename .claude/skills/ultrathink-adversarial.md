---
name: ultrathink-adversarial
description: Adversarial mode workflow with debate, veto systems, and credibility betting for high-stakes decisions
---

# ULTRATHINK: ADVERSARIAL MODE

## Overview

Use this variant for high-stakes, irreversible decisions where groupthink is dangerous and multiple perspectives are critical.

**Use when**:
- Security-critical architecture decisions
- Irreversible choices (migrations, framework changes)
- Novel problem spaces with no established patterns
- Decisions affecting multiple teams/systems

**Skip when**:
- Routine feature implementation
- Time-constrained tasks
- Well-established problem patterns

---

## Workflow Structure

```
ULTRATHINK: ADVERSARIAL MODE
══════════════════════════════════════════════════════════════════

LEGEND: || parallel  -> sequential  [!] gate  ⚔️ debate  🛡️ veto
        💰 bet  H/M/L confidence

AGENTS:
  CONSENSUS: Arch|Req|Conv|Dep|Test (cooperative)
  DA: Devil's Advocate (MUST oppose)
  JUDGE: Synthesis (reconciliation)

CRED SYSTEM:
  Start: 100 CRED each
  Stake: H=20-40, M=10-20, L=1-10
  Resolve: correct=1.5x, wrong=lose stake
  Influence: vote_weight = sqrt(CRED)

─── A: POSITIONS ─────────────────────────────────────────────────
|| CONSENSUS agents → majority proposal
|| DA agent → counter-proposal (💰 20 CRED staked)
[!] POSITION GATE

─── B: DEBATE ────────────────────────────────────────────────────
⚔️ CONSENSUS → THESIS: position + evidence + anticipated objections
⚔️ DA → ANTITHESIS: counter + direct rebuttals + new objections
⚔️ JUDGE → SYNTHESIS: reconciliation + unresolved_tensions[]

🛡️ VETO POINT:
   Any agent may HARD veto (max 2 per session)
   Counter-veto allowed
   Unresolved → human review

[!] DEBATE GATE: proceed if unresolved_tensions < 3

─── C: CRITIQUE ──────────────────────────────────────────────────
|| NEW Critical|AltExplorer|Feasibility agents
   Review SYNTHESIS, may SOFT veto claims
💰 Resolve bets from A (DA wins/loses based on counter merit)
[!] CRITIQUE GATE

─── D: FINALIZE ──────────────────────────────────────────────────
-> Finalization agent: integrate SYNTHESIS + critique
🛡️ FINAL VETO: high-CRED minority may issue last HARD veto
[!] FINALIZE GATE (no skip, can extend)

─── E: TEST + IMPLEMENT ──────────────────────────────────────────
(standard workflow from base ultrathink)

ESCALATION TRIGGERS:
  - unresolved_tensions > 3 → human
  - unresolved HARD veto → human
  - high-CRED minority dissent → human
```

---

## Key Mechanisms

### Credibility (CRED) System

**Starting state**: Each agent begins with 100 CRED tokens

**Staking**:
- **High confidence** (H): Stake 20-40 CRED
- **Medium confidence** (M): Stake 10-20 CRED
- **Low confidence** (L): Stake 1-10 CRED

**Resolution**:
- **Correct**: Gain 1.5x stake back
- **Wrong**: Lose stake entirely

**Influence**: Vote weight = sqrt(CRED)
- 100 CRED → 10 votes
- 25 CRED → 5 votes
- 1 CRED → 1 vote

### Debate Structure

**THESIS** (from CONSENSUS agents):
- State position clearly
- Provide supporting evidence
- Anticipate and pre-address objections

**ANTITHESIS** (from DA agent):
- State counter-position
- Provide direct rebuttals to THESIS
- Raise new objections not anticipated

**SYNTHESIS** (from JUDGE agent):
- Reconcile positions where possible
- Identify areas of genuine disagreement
- List unresolved_tensions[] for tracking

### Veto System

**HARD veto**:
- Blocks workflow progression
- Limited to 2 per agent per session
- Requires strong justification
- Can be counter-vetoed by majority

**SOFT veto**:
- Flags issue for review
- Does not block progression
- Unlimited uses
- Recorded for audit trail

**Counter-veto**:
- Majority can override HARD veto
- Requires 2/3 vote weighted by CRED
- Must provide counter-justification

---

## Escalation Rules

Workflow escalates to human review if:

1. **unresolved_tensions > 3** after DEBATE
2. **Unresolved HARD veto** after counter-veto attempt
3. **High-CRED minority dissent** (>30% CRED opposed)

---

## Usage Example

### Security-Critical Decision

```
Task: "Choose authentication system for healthcare app"

─── A: POSITIONS ─────────────────────────────────────────────────
|| CONSENSUS agents:
   Arch: Recommend OAuth 2.0 + OIDC
   Reason: Industry standard, battle-tested
   💰 Stake: 30 CRED (H confidence)

|| DA agent:
   Counter: Recommend passwordless (FIDO2)
   Reason: Better security, no password DB risk
   💰 Stake: 20 CRED (M confidence)

[!] ✓ POSITION GATE

─── B: DEBATE ────────────────────────────────────────────────────
⚔️ THESIS (CONSENSUS):
   - OAuth 2.0 widely understood by developers
   - Existing libraries and tooling mature
   - Compliance frameworks recognize it
   - Anticipated objection: "FIDO2 more secure"
     Response: Security sufficient, UX/adoption better

⚔️ ANTITHESIS (DA):
   - FIDO2 eliminates password breach risk entirely
   - Healthcare requires highest security bar
   - Passwordless improving adoption (Apple/Google)
   - Rebuttal: OAuth complexity introduces attack surface
   - New objection: Vendor lock-in with OAuth providers

⚔️ SYNTHESIS (JUDGE):
   Reconciliation:
   - Use FIDO2 as PRIMARY with OAuth FALLBACK
   - Staged rollout: staff first, patients opt-in
   - Monitor adoption metrics

   unresolved_tensions: [
     "Fallback may become primary if adoption low",
     "Dual system increases complexity",
     "FIDO2 recovery flow not fully specified"
   ]

🛡️ VETO POINT:
   CONSENSUS: SOFT veto - "Dual system too complex"
   DA: No veto - synthesis acceptable
   JUDGE: Proceed with tensions logged

[!] DEBATE GATE: unresolved_tensions = 3 (threshold met)
    ✓ Proceed (exactly at limit)

─── C: CRITIQUE ──────────────────────────────────────────────────
|| NEW Critical agent:
   - FIDO2 recovery critical for healthcare (locked out = life risk)
   - SOFT veto: "Recovery flow must be detailed before finalize"

|| NEW AltExplorer agent:
   - What about magic links as fallback vs OAuth?
   - Simpler than OAuth, still secure

|| NEW Feasibility agent:
   - FIDO2 libraries less mature than OAuth
   - Implementation risk: M (manageable with prototyping)

💰 CRED Resolution:
   - DA counter-proposal partially adopted
   - DA gains: 20 * 0.5 = 10 CRED (partial credit)
   - DA total: 100 - 20 + 10 = 90 CRED

[!] CRITIQUE GATE
    🟠 HIGH: Recovery flow needed
    ⊗ RECOVER: Must address before finalize

─── D: FINALIZE ──────────────────────────────────────────────────
-> Finalization agent:
   Integrated plan:
   1. Prototype FIDO2 + magic link fallback (simpler than OAuth)
   2. Design recovery flow with security team
   3. Staged rollout with adoption metrics
   4. Hard requirement: recovery SLA < 1 hour

   DA objections incorporated:
   - FIDO2 as primary ✓
   - Eliminated password risk ✓

   DA objections dismissed:
   - No OAuth fallback (replaced with magic links)

🛡️ FINAL VETO:
   CONSENSUS: No veto (90 CRED, satisfied with magic links)
   DA: No veto (90 CRED, primary objections met)
   Critical: No veto (recovery flow now specified)

[!] FINALIZE GATE: ✓ PASS

─── E: IMPLEMENT ─────────────────────────────────────────────────
(Standard workflow continues...)
```

---

## CRED Tracking Example

```
Agent       | Start | Stage A | Stage C | Final | Notes
------------|-------|---------|---------|-------|------------------
CONSENSUS   | 100   | -30     | 0       | 70    | Lost bet
DA          | 100   | -20     | +10     | 90    | Partial win
Critical    | 100   | 0       | 0       | 100   | No bets
AltExplorer | 100   | 0       | 0       | 100   | No bets
Feasibility | 100   | 0       | 0       | 100   | No bets

Vote weights at Final:
  CONSENSUS:   sqrt(70)  ≈ 8.4 votes
  DA:          sqrt(90)  ≈ 9.5 votes
  Others:      sqrt(100) = 10 votes each
```

---

## Review Protocol

Same as base ultrathink:

### Scan Order
1. Parse → 2. Structure → 3. Refs → 4. Logic → 5. Consist → 6. Clarity

### Severity
🔴 crit → 🟠 high → 🟡 med → 🟢 low

### Confidence
H (report) | M/L (flag for human)

---

## Integration Notes

**Memory Management**:
- Track CRED balances in Memory section of CLAUDE.md
- Record unresolved_tensions for audit trail
- Document escalation decisions

**Checkpoint Strategy**:
- `@cp("post-positions")` after A
- `@cp("post-debate")` after B
- `@cp("post-critique")` after C
- `@cp("post-finalize")` after D

**When to Restore**:
- If SYNTHESIS rejected by majority → `@restore("post-positions")`
- If FINALIZE fails → `@restore("post-debate")`

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│ ULTRATHINK: ADVERSARIAL                              ~400 tok  │
├─────────────────────────────────────────────────────────────────┤
│ ⚔️ debate  🛡️ veto  💰 bet  CRED=credibility tokens             │
│ CONSENSUS (coop) vs DA (oppose) → JUDGE (synth)                │
├─────────────────────────────────────────────────────────────────┤
│ 💰 Start:100  Stake:H=20-40,M=10-20,L=1-10  Win:1.5x Lose:stake│
│ 🛡️ HARD:2/session SOFT:∞  Counter-veto allowed                 │
├─────────────────────────────────────────────────────────────────┤
│ A: || CONSENSUS→proposal || DA→counter(💰20) → [!]             │
│ B: ⚔️THESIS ⚔️ANTITHESIS ⚔️SYNTHESIS 🛡️veto → [!]              │
│ C: || NEW Crit|Alt|Feas  💰resolve  SOFT veto → [!]            │
│ D: -> Finalize  🛡️FINAL veto → [!]                             │
│ E: standard                                                     │
├─────────────────────────────────────────────────────────────────┤
│ ESCALATE: tensions>3 | unresolved🛡️ | hi-CRED minority        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Token Cost

Approximately **400 tokens** for the core workflow prompt.

Additional overhead:
- CRED tracking: +50 tokens
- Debate transcripts: +200-400 tokens per round
- Veto documentation: +50-100 tokens per veto

**Total estimated**: 700-1000 tokens for full adversarial workflow.

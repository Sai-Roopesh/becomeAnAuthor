---
name: ai-platform-readiness-audit
description: Evaluate AI product/platform readiness across architecture, reliability, UX consistency, security posture, and release operations. Use when deciding if an AI feature set is production-ready or needs remediation milestones.
---

# AI Platform Readiness Audit

## Workflow
1. Define readiness criteria by domain: functionality, reliability, security, observability, release maturity.
2. Score each criterion with evidence from code, tests, and runtime behavior.
3. Identify blockers vs non-blockers with concrete remediation actions.
4. Prioritize fixes into short-term and release-gating tracks.
5. Produce a go/no-go recommendation with explicit confidence.

## Deliverable Structure
- Current state snapshot.
- Blocking risks and impact.
- Recommended remediation order.
- Final readiness verdict.

## Project Lessons Encoded
- Readiness evaluation was an explicit recurring task (`thread: Evaluate AI novel platform readiness`).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.

---
name: spec
description: Interview the user into a short, self-contained SPEC.md before any code is written.
argument-hint: "One line: the feature or change the client asked for"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, AskUserQuestion, Skill, Agent, Write(SPEC.md), Bash(git log:*), Bash(git diff:*), Bash(git status:*), Bash(rg:*), Bash(ls:*), Bash(cat:*), Bash(sed -n:*)
---

Turn a vague client request into a short spec that a fresh agent can implement and a human can read in two minutes.

Run this in the main thread. A subagent cannot interview the user.

## Iron Law

**No code, no file edits, no branch until SPEC.md exists and the user has approved it.** `allowed-tools` enforces this: the only writable path is `SPEC.md`.

## Step 1: Orient (shallow)

Answer three things, then stop reading:

- Does this already exist, in whole or in part?
- Which workspaces are in play (`apps/web`, `apps/api`, `packages/contracts`, `packages/database`, `packages/ui`)?
- Does an ADR in `docs/decisions/` or a doc in `docs/` already settle part of it? Read it; do not re-ask what it decided.

Never ask the user something the code can answer. No line numbers or caller graphs yet; that is Step 3.

## Step 2: Interview (few questions)

Ask only decisions that change **what gets built or what a caller sees**. Everything else, pick a sensible default yourself and list it as an assumption in Decisions; the user vetoes it at review.

- **Budget: one `AskUserQuestion` call, max 4 questions.** A second call only if an answer opened a new decision that changes the Contract. Never a third.
- Recommended answer first, labelled `(Recommended)`. Each option's `description` says the tradeoff in one line.
- Options are real, mutually exclusive answers. Never `Yes` / `No` / `Not sure`.
- Use `preview` only when the user must see a shape (response body, Prisma model).
- Do not ask about things the user clearly already said, standard repo conventions, or edge cases with one obvious handling.

Before asking, check these axes in your head and pick the 4 most consequential open points: contract shape (zod schema in `@haggle/contracts`), who can see it (consumer, partner, HQ, demo-only), data and Prisma migration of existing rows, failure behaviour, handling of service addresses and other PII, blast radius on existing callers.

### Implementation path

After the interview rounds end, ask one more `AskUserQuestion` (single question, outside the interview budget): which implementation path? Put the fitting one first as `(Recommended)` - TDD for new observable behaviour, tests-after for changes inside code with no tests yet.

- `TDD` - red tests from the Contract before any code, then green one `it` at a time. Slowest, strongest proof.
- `tests-after` - implement first, then extend an existing vitest suite that already reaches the change. No new test scaffolding.
- `manual` - no automated tests. The user verifies by hand from the Verification section. Fastest, no regression net.

The answer becomes the `Test policy:` line in Decisions.

## Step 3: Map the change

Spawn the `researcher` agent once. Brief: the settled decisions and contract, not the original request. If it names an unsettled decision, ask it (counts against the Step 2 budget), then re-spawn.

## Step 4: Write SPEC.md

Write `SPEC.md` at repo root. Standalone: the implementer has not seen this conversation.

**Readability rules:**

- Whole file target: under ~120 lines. Sections 1–3 fit on one screen.
- Bullets and code blocks, not paragraphs. One line per bullet.
- No restating the same fact in two sections. No filler ("as appropriate", "handle gracefully", "TBD").
- Omit a section's content with `None.` rather than padding it.

**Sections, in this order:**

1. **Goal** - max 5 lines. The end result an actor sees, written as if it already works: who (consumer, mortgage partner, HQ operator), what they do, what they get, what they see on failure. No table names or route paths here. Last line: `Why:` one sentence.
2. **Decisions** - one line each: `<question> → <answer>`. Mark defaults you chose without asking as `(assumed)`. Last line: `Test policy: <TDD | tests-after | manual>` - the user's implementation-path answer.
3. **Open questions for the client** - only what the user could not settle. `None.` is fine; a fake answer is not.
4. **Contract** - literal code blocks only: route + method, zod schema or request/response JSON, Prisma model change, env key, changed signature. No prose beyond a one-line caption per block.
5. **Change plan** - condensed from the `researcher` report. Keep every path; drop its prose.
   - Ordered list, one line per file: `path/file.ext:line` - what changes.
   - One line: `Callers checked:` names only.
   - One line: `Workspaces checked clean:` names only.
   - One line: `Build order:` pnpm commands, contracts first (`pnpm --filter @haggle/contracts build`), then database, then the apps.
6. **Out of scope** - max 5 bullets. Name the tempting adjacent things.
7. **Risks** - max 3 bullets, `risk - mitigation`. `None.` if none are real.
8. **Verification** - numbered, runnable: command or request, then expected result (status code, row, rendered state). Include `pnpm typecheck` and the `pnpm --filter <workspace> test` runs that cover the change. Must prove the Goal, not just that it compiles.

## Step 5: Hand back

Show the user Goal, Decisions and Open questions, then stop. They approve, amend, or take open questions to the client. Implementation is a separate turn.

## Red flags

- An editor is about to open and SPEC.md is not approved.
- A question asked in prose instead of `AskUserQuestion`, or more than 8 interview questions total (the implementation-path question is extra).
- SPEC.md written without asking the implementation-path question.
- A question whose every answer builds the same thing.
- Goal describes work ("add an endpoint that…") instead of the result an actor sees.
- Change plan written by you instead of from `researcher`, or missing paths.
- Contract that puts a full service address in a URL, log line or analytics event.
- Verification cannot be run by someone outside this conversation.
- SPEC.md over ~150 lines. Cut prose until it is not.

---
name: being-human
description: Use when writing or editing any prose that ships with the code - README and docs/*.md, ADRs, migration notes, PR descriptions, commit bodies, CHANGELOG entries, JSDoc/TSDoc, inline comments. Also use when prose reads as machine-generated, sounds like marketing copy, or a reviewer says the docs are bloated, generic, or get skimmed.
---

# Writing in human tone

## Overview

Prose that reads as machine-generated gets skimmed, and once a reader starts skimming they skim past the one paragraph that mattered. Write as a working engineer explaining something to the colleague who will maintain it next.

The audience is a human. Assume they are competent, busy, and already have the code in front of them.

## The contract

Every piece of prose you write has three parts, in this order:

1. **The point, first sentence.** What this is, what changed, or why the reader is here.
2. **What the reader cannot get from the code.** Constraints, ordering requirements, failure modes, the obvious approach you rejected and why.
3. **Stop.** The last fact is the last sentence. No wrap-up.

If a paragraph does not fit one of the first two parts, cut it.

## Voice

- Present tense, active voice, direct address. "Call `build:shared` first" beats "It is recommended that the shared package be built first".
- Concrete nouns from this codebase: `companyId`, `ResultCodeInterceptor`, `softDelete` — not "the relevant identifier" or "the appropriate handler".
- Ordinary words. Use _use_, not _utilize_. Use _so_, not _in order to_. Use _help_, not _facilitate_.
- Vary sentence length. A short one after two long ones lands.
- State opinions flatly when they are true: "Don't retry this endpoint — Stripe double-charges on replay."
- Admitting you don't know is human. "Not sure why the upstream returns 200 on failure. It does, so we check the body."
- Contractions are fine.

## Tells to cut

| Tell                                                                   | Write instead                                         |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| "This document provides a comprehensive overview of..."                | "How invoicing works."                                |
| "It's important to note that X"                                        | X                                                     |
| leverage / utilize / facilitate / robust / seamless / delve / holistic | use / use / help / (name the actual property)         |
| "In today's fast-paced environment..."                                 | Delete the opener, start at the point.                |
| "fast, reliable, and scalable" (the rule of three)                     | One accurate adjective, or none.                      |
| "Whether you're a new dev or a seasoned engineer..."                   | Delete.                                               |
| "not just X, but Y"                                                    | Say Y.                                                |
| Em-dash every third sentence                                           | Full stops.                                           |
| Bold on half the phrases                                               | At most one bolded phrase per paragraph.              |
| Emoji headings, ✅/❌ decoration, 🚀                                   | Plain headings.                                       |
| "In conclusion" / "Overall" / a closing summary paragraph              | End at the last fact.                                 |
| "Feel free to..." / "Happy coding!" / "Let's dive in"                  | Delete.                                               |
| "may potentially sometimes"                                            | Pick one hedge, or state it plainly.                  |
| Every section padded to the same length                                | Uneven sections are fine. Some things need two lines. |

## Structure

- Headings only when the piece runs longer than a screen. Three headings over four paragraphs is worse than no headings.
- Bullets only for genuinely parallel items. Prose that has been shredded into bullets loses its connective tissue — that tissue is usually the reasoning.
- Don't open a section by restating its heading.
- Don't write a section because the template has one. An empty "Prerequisites" heading is worse than no heading.

## Comments

`.claude/rules/code-comments.md` decides _whether_ a comment earns its place. This skill decides how it reads once it does.

- One line. State the constraint, not the narrative.
- No step narration: `// Step 1: fetch the user` is noise.
- A `TODO` names a person or a condition. `// TODO(ahnaf): drop once the v2 webhook is live` is useful; `// TODO: improve` is not.

```ts
// ❌ Reads as generated
/**
 * This function is responsible for retrieving the user data from the database.
 * It takes a userId parameter and returns a Promise that resolves to the user.
 * It's important to note that this function will throw if the user is not found.
 */
async function getUser(userId: string): Promise<User> { ... }

// ✅ Reads as written by someone who hit the problem
/** Throws on a missing user — callers in the job flow rely on that to abort the batch. */
async function getUser(userId: string): Promise<User> { ... }
```

## Don't overcorrect

Sounding human is not sounding chatty. Slang, jokes, first-person storytelling ("I spent an hour on this one"), and forced casualness are their own kind of noise. Plain and direct is the target.

## Self-check before you save

- Read the first sentence alone. Does it carry the point?
- Delete the last paragraph. Did the piece lose anything?
- Count the adjectives. Can any of them be a number or a fact instead?
- Would you send this to a colleague in a message, or would you trim it first? Trim it first.

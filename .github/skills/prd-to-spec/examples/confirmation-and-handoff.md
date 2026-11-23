# Scenario: recap, confirmation, handoff

Not a PRD. The agent has already read a feature file and finished frontier rounds.

## Recap the agent should state

- Ledger: each supplied feature as included, deferred, or rejected
- Users, problem, core flow
- Decisions and scope
- Observable acceptance criteria
- Explicit deferrals

Then ask for confirmation. Silence is not confirmation.

## What counts as yes

After that recap, "yes" or "just write the spec" (or equivalent) is confirmation.

The same "just write the spec" *before* a recap, while material blockers remain, is not permission to invent. Name the blockers.

## Handoff package (after yes)

Pass to `to-spec` (or tell the user to run `/to-spec` with this package):

- source path or content
- decisions, scope, and criteria
- explicit deferrals
- relevant repo facts
- the confirmed recap

Do not write the spec in `prd-to-spec`. Do not open an issue. Do not start coding unless the user asked.

# Backlog proposal: verify-change

Not applied. Not approved. A skill edit that was never exercised is a draft, and this one has not been exercised.

## Evidence used

- `.github/skills/verify-change/SKILL.md`, added in `e81dcfb`. The `description` is: `Run before /code-review during /implement. For every mapped feature the diff touches, run verify-<app> and keep the evidence file. Unit tests passing is not done. No evidence file, not done.`
- `evidence/verify-pinboard/add-pin.json` shows one proved `add-pin` drive. It does not show an agent loading or following `verify-change`.

## Missing

No Copilot chat, attached transcript, or in-repo agent log shows `verify-change` being loaded, skipped, or followed. Nothing below claims a session failure.

## Evaluation

The description restates the procedure. An agent can satisfy that sentence and never read the body (which feature files to open, when a shared UI change still counts, when to stop before `/code-review`). That is a description problem visible in the file. It is not a proved runtime miss.

## Proposed description

```yaml
description: "Use when /implement is about to run /code-review, or when a diff may affect a mapped feature under .github/skills/verify-*/."
```

The body already holds the steps. Do not add prose. Do not change `verify-change` until this item is accepted.

## Lists

### Accepted

None.

### Rejected

None.

### Backlog

- Replace the `verify-change` description with the when-to-use line above. Leave the body as it is.

After an accept, prove it with a task that previously acted on the old description and skipped a body step (for example, treating a green unit test as done). No such session is in this repo, so the proof cannot be run yet.

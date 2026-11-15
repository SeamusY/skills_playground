---
name: verify-change
description: "Run before /code-review during /implement. For every mapped feature the diff touches, run verify-<app> and keep the evidence file. Unit tests passing is not done. No evidence file, not done."
---

# Verify a change

`/implement` drives `/tdd`, then this skill, then `/code-review`. Run it for any change that can affect a mapped feature. Do not wait for someone to remember.

A green unit test is not done. A feature is done only when its `verify-<app>` skill has written an evidence file and that file is still there after cleanup.

## Steps

1. Find `.github/skills/verify-*/features/README.md`. Skip `verify-change`. If none exist, stop and use `/create-verification-skill`. Do not invent a pass.
2. Read the diff (the branch against its base, plus uncommitted work).
3. A mapped feature is in scope when the diff touches a route, command, label, or path that feature file names, or when the diff changes shared launch, storage, or UI that every feature uses. For each in-scope feature, follow that verify skill: launch, doctor, drive the feature, evidence, cleanup. Confirm the evidence path still exists.
4. Say which features you proved and which evidence files remain. If a drive fails, stop. Do not start `/code-review`.
5. Run `/code-review` only after those evidence files exist.

Do not edit a feature file to turn a failure into a pass. A product bug stays a bug. Map drift goes to `/maintain-verification-skill`.

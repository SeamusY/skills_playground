# Illustration: requirements and a reference

Not a backlog item. Not accepted. Not an edit.

## Filled requirements

Path: `.github/skills/skill-refiner/requirements.md`

What the refined skill should do: `verify-pinboard` loads when proving Pinboard or when `verify-change` selects it. The description does not list launch, drive, or evidence steps.

Constraints: When-to-use description only. Leave the body as it is.

Success criteria: An agent that read only the description still opens the body before driving the app.

Out of scope: Changing `pinboard-verify.mjs`. Treating a missing evidence file as a pass.

## Reference

Path: `.github/skills/skill-refiner/references/when-to-use.md`

A style example. Its text:

```yaml
description: "Use when a session used project skills and you are reviewing that use, when a skill was skipped or followed badly, or when the user asks to refine or improve skills."
```

## Proposal it shapes

The reference is a when-to-use line and does not list steps, so the proposal is only:

```yaml
description: "Use when proving the Pinboard demo, or when verify-change selects verify-pinboard."
```

No body steps are added. This illustration includes no session that shows `verify-pinboard` being skipped. If a later run's evidence conflicts with the reference, follow the evidence. Do not apply this file.

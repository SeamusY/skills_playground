---
name: skill-refiner
description: "Use when a session used project skills and you are reviewing that use, when a skill was skipped or followed badly, or when the user asks to refine or improve skills from notes or references."
---

# Refine a skill

Make a skill that was actually used sharper, so the next run fails less often and spends fewer tokens. Sharper means less text. Do not add a second process framework.

This skill edits skills under `.github/skills/`. `/maintain-verification-skill` owns the feature map. Run this one after an implement or verify session, not instead of that skill. Invoke it with `/skill-refiner`.

It is a VS Code Copilot project skill. It does not assume Cursor, Grok Bot, Dr Eggbot, or any transcript directory.

## Start

Check these paths before Evidence. Settle requirements before any proposal.

| | Path |
| --- | --- |
| Requirements | `.github/skills/skill-refiner/requirements.md` — copy [requirements-template.md](requirements-template.md). The template is not the user's requirements. |
| References | `.github/skills/skill-refiner/references/` — see [references/README.md](references/README.md). That README is not a reference. |

If `requirements.md` is missing, or any of its four sections is missing or still `-`, name that path. Reply with a filled draft: keep text the user already wrote, and for each empty section write one sentence from the chat and the Evidence sources. Where those sources do not decide, ask one question and include a candidate sentence they can accept or replace. Do not return the blank template as the whole reply. Stop until the user confirms the draft, edits it, or tells you to go on without requirements. On confirm, save it to `requirements.md` if that file is not already the confirmed text.

If `references/` has no file besides `README.md`, name that path and one reference that would change this run, then continue. A missing reference does not stop the loop.

## 1. Evidence

Gather use, not a vibe. "Evidence" here is how a skill was loaded, skipped, or followed. That may be only the chat you are in now — do not require a code diff, a commit, or a `verify-*` proof file when the chat already shows the use. Take whatever this environment actually has:

- the current chat (enough on its own when it shows the use)
- files the user attaches
- `git log` and `git blame` for `.github/skills/`
- evidence files a `verify-*` skill names (in this repo, `evidence/`) — those prove an app drive, not skill load or follow, unless the chat ties them to one
- Copilot or agent logs that are present in the repo

Name each source you used. If one is missing, say so and continue with the rest. Do not look for `agent-transcripts/` or a Grok transcript path.

Skip a skill that this evidence never shows in use. Do not refine it from a guess.

## 2. Evaluate

For each used skill, answer from the evidence:

- Did the `description` load it when it should, and leave it unloaded when it should not?
- Did the agent follow the body, skip a step, or talk around a step?
- Are paths, commands, or selectors stale against the tree you have now?
- Is the skill long, repeating another skill, or summarizing the workflow in `description`? Agents obey that summary and skip the body. A `description` is when-to-use only.

## 3. Propose

Offer a concrete edit, not a theme:

- a tighter `description` (trigger only, no steps)
- a missing or wrong step
- lines to delete
- one example, when the current example caused the miss
- a lint, script, or test when that would hold the lesson better than more markdown

Requirements narrow what the edit is for. They do not make an unused skill eligible.

When `references/` has a file other than `README.md`, shape the edit toward it: match a gold-standard skill, a prior good run, a verify evidence file, or a style or format example, and do not repeat a rejected draft. If that file conflicts with evidence of actual use, follow the evidence and name both.

If requirements and that evidence disagree, show both and leave the item on Backlog until the user picks.

Do not edit a skill to make a failed run or a bad demo look successful. A product bug stays a bug. Feature-map drift goes to `/maintain-verification-skill`.

## 4. Wait

Do not apply edits. Present three lists and stop:

- **Accepted** — the user approved these
- **Rejected** — the user turned these down
- **Backlog** — proposed, not decided

Wait for an explicit approval of specific items. [examples/verify-change.md](examples/verify-change.md) is a backlog proposal from this repo. [examples/requirements-and-reference.md](examples/requirements-and-reference.md) shows a filled requirements file and a reference shaping a proposal. Neither file is an approval, and neither is an edit.

After approval, change only `.github/skills/<name>/`. Do not edit an installed plugin in place, including a `mattpocock/skills` install. If a local override is required, copy that skill into `.github/skills/` and say it is an override.

## 5. Prove

An approved edit is not done until you run a representative task that previously failed or skipped the skill, and that failure mode is gone. If it is not gone, say so. An edit that was never exercised is a draft.

An item still on Backlog has nothing to prove.

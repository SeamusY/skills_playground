# skills_playground

A VS Code GitHub Copilot skills playground. Three layers, kept separate. This is not a Grok Bot, Dr Eggbot, or Cursor cloud agent project.

Project skills live in `.github/skills/<name>/SKILL.md`. The frontmatter `name` matches the directory (lowercase letters, numbers, hyphens). Copilot discovers those files from the repo. Nothing here is installed into `.cursor/skills/`.

## Layer 1 — Ponytail, always on

`.github/copilot-instructions.md` is the VS Code Copilot Chat rules file, adapted from [DietrichGebert/ponytail `.github/copilot-instructions.md`](https://github.com/DietrichGebert/ponytail/blob/main/.github/copilot-instructions.md). That file is the smallest-complete-change constraint for every chat in this repo. The rest of the ponytail repo is not vendored. The MIT notice for the adapted text is in `NOTICE`.

## Layer 2 — Matt Pocock's SDLC, installed as a plugin

Do not copy [mattpocock/skills](https://github.com/mattpocock/skills) into this repo.

In VS Code:

1. Command Palette → **Chat: Install Plugin From Source** → `https://github.com/mattpocock/skills`
2. Once per repo, run `/setup-matt-pocock-skills`

Lifecycle:

`/grill-with-docs` or `/to-spec` → `/to-tickets` → `/implement` (drives `/tdd`, finishes with `/code-review`) → `/pr`

`/implement` is the installed plugin and is not patched here. This repo's Copilot instructions and the [`verify-change`](.github/skills/verify-change/SKILL.md) skill tell the agent to run `/verify-change` after `/tdd` and before `/code-review`.

## Layer 3 — Verification skills

Ported from the pstack create/maintain verification skills onto Copilot project skills. Generated verify skills go to `.github/skills/verify-<app>/`, never `.cursor/skills/`.

| Skill | What it does |
| --- | --- |
| [`create-verification-skill`](.github/skills/create-verification-skill/SKILL.md) | Interviews the repo and generates `verify-<app>`, including launch, doctor, a drive CLI, evidence, cleanup, helpers, and a `features/` map. One mapped feature must be proved end to end or the skill is still a draft. |
| [`maintain-verification-skill`](.github/skills/maintain-verification-skill/SKILL.md) | Compares the feature map to source and exercises the features live. It may update the map. It may not hide a product bug by editing docs. |
| [`verify-change`](.github/skills/verify-change/SKILL.md) | For every mapped feature a change touches, runs `verify-<app>`. Unit tests going green is not done. No evidence file, not done. |
| [`verify-pinboard`](.github/skills/verify-pinboard/SKILL.md) | The generated skill for the demo. Proved once on add-pin. |
| [`skill-refiner`](.github/skills/skill-refiner/SKILL.md) | `/skill-refiner`. After an implement or verify session, proposes sharper edits to skills that were actually used. Template: [`.github/skills/skill-refiner/requirements-template.md`](.github/skills/skill-refiner/requirements-template.md). References: [`.github/skills/skill-refiner/references/`](.github/skills/skill-refiner/references/). |

Each feature file uses the headings `Sub-features`, `How to get to it (user POV)`, `Driving it with <cli>`, and `Gotchas`.

Run `/skill-refiner` after an implement or verify session, when you want the skills themselves tightened. Copy [requirements-template.md](.github/skills/skill-refiner/requirements-template.md) to `.github/skills/skill-refiner/requirements.md`, and put references in [references/](.github/skills/skill-refiner/references/). It does not replace `/maintain-verification-skill`: that skill owns the feature map, and this one owns the skills. It lists Accepted, Rejected, and Backlog, and it does not edit until you accept an item. A backlog example that has not been applied is [`.github/skills/skill-refiner/examples/verify-change.md`](.github/skills/skill-refiner/examples/verify-change.md).

## Demo

Pinboard is a local page for saving a short pin (a title and a note).

```bash
node demo/pinboard.mjs
```

Open the URL in the `pinboard ready` line. The default is `http://127.0.0.1:4173`. Data goes under `.verify-runtime/` (gitignored).

### Verify loop

```bash
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs launch --port 0 --json
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs doctor --json
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs drive add-pin --title "Release checklist" --note "Tag and publish" --json
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs cleanup --json
test -f evidence/verify-pinboard/add-pin.json && echo evidence survived
```

`cleanup` kills only the server `launch` started. It does not delete `evidence/`. The checked-in proof is [`evidence/verify-pinboard/add-pin.json`](evidence/verify-pinboard/add-pin.json).

App checks and the same loop:

```bash
node --test demo/pinboard.test.mjs demo/verify-loop.test.mjs
```

Those tests can pass and the change can still be unfinished. `/verify-change` wants the evidence file.

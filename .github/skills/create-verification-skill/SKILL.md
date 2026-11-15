---
name: create-verification-skill
description: "Interview this repo and generate a VS Code Copilot project skill at .github/skills/verify-<app>/ that launches the app, drives it with a small CLI, and saves evidence. Use for /create-verification-skill. Never write .cursor/skills/."
disable-model-invocation: true
---

# Create a verification skill

Generate a project-local verification skill for VS Code Copilot. The next reader is an agent that has never seen the app. Write steps it can run cold.

Write the skill to `.github/skills/verify-<app>/SKILL.md`. The frontmatter `name` is `verify-<app>` and matches that directory (lowercase, hyphens). Never write `.cursor/skills/`. A generated skill that was never executed is a draft, not a deliverable.

## 1. Interview the repo, not the user

Answer these from the checkout. Ask the user only what you cannot observe.

- **Surface.** What does a user touch? Web UI, CLI/TUI, desktop, API, mobile, library. A repo can have several. Pick the primary one and name the rest.
- **Run.** The repo's own dev command. Ports, env, seed data, auth. Prefer the documented command.
- **Drive.** An existing harness first (browser specs, HTTP, a PTY helper). If none can prove a user path, you will add a small CLI. Do not invent a test-only endpoint and call it the user path.
- **Observe.** Screenshots, transcripts, response bodies, files, rows, exit codes. Name the side effect a mutation leaves.
- **Isolate.** Can two instances run at once (port, data dir, profile)? If not, the generated skill refuses to drive a shared instance.

If the checkout does not start, fix that before generating. A skill written against a broken base teaches the wrong steps. Verification scaffolding that the app never serves (a sample config, an empty data dir) may be created by the skill and removed in cleanup. Mark it as scaffolding.

## 2. Generate the skill

`.github/skills/verify-<app>/SKILL.md` needs YAML frontmatter (`name`, `description`) and these sections. Ground every command in what the interview found. Leave no placeholders.

### Launch

The exact command that starts the app for verification, the ready signal (a log line or prompt), and the isolated data dir. Ready means usable from an empty data dir, including migrations and seed. A health check can pass while init is still running; do not call that ready. Include how to tear it down. For a short-lived CLI there is no server: build once, then start each drive in its own process.

### Doctor

One read-only check: process up, this build, port owned by this run, auth valid when the app has auth. The agent runs it before the first drive and again after anything surprising.

### Drive

Ship a small CLI under the skill directory (for example `bin/<app>-verify`). It is the only drive path the skill teaches.

- Composable subcommands: `launch`, `doctor`, `drive <feature>`, `cleanup`. Evidence may be its own subcommand or part of `drive`.
- `--help` lists subcommands, flags, and one example.
- `--json` prints one JSON object on stdout and no other stdout.
- `--dry-run` on destructive commands (`cleanup`, and any `drive` that mutates). It prints the plan and changes nothing: no process killed, no data deleted, no evidence written.
- Prefer stable handles (ARIA names, routes, command names) over coordinates and tab order.
- Drive the real user path. Do not call internal setters. When the safe path is a dry-run, observe what it skips (files, network, git refs) instead of trusting the name.

### Evidence

Capture the action and the resulting state, including side effects (file written, row inserted, message sent), not only the final screen. Write it outside the scratch dir. Name the path. Cleanup must not delete that path.

### Cleanup

Kill only the process this run started (the recorded pid whose command is this app). Never kill by process name. Remove scratch state and the isolated data dir. Leave the evidence file. Run cleanup after a failed attempt too, so a broken loop does not keep the port.

### Helpers

Every script the skill ships is executable. The skill body shows the invocation, copy-pasteable, relative to the repo root. A helper the reader has to reverse-engineer is not a helper.

## 3. Seed the feature map

Create `.github/skills/verify-<app>/features/README.md` plus one file per user-facing feature (start with the top few, from routes, commands, menus, or docs). The README is the index: baseline preconditions, driving conventions, and a link to each feature.

Each feature file has an H1, one paragraph of user-visible behavior, then these H2 headings in order:

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with <cli>` — use the real CLI name. Start with `Preconditions:`. Pair each user action with the exact command and the observable result.
4. `Gotchas`

Keep implementation details out of the map. Name user paths, stable handles, required state, commands, and observable proof. If seed data lacks a precondition, the journey fails and the reason goes in `Gotchas`. Do not weaken the journey to make it pass.

## 4. Prove one mapped feature

Run the generated skill once: launch, doctor, drive one mapped feature, capture evidence, clean up. Then confirm the evidence file still exists at the named path. A cleanup that deletes the proof fails this step. Fix failures and clean up after every failed attempt.

One feature is enough. The map exists so later runs can cover the rest. If you proved it on a stand-in (a local process instead of the real host), list every setup step the stand-in did that the target will not. Those steps stay unverified.

## 5. Point at maintenance

Tell the user to run `/maintain-verification-skill` when the app changes. Do not invent a cadence.

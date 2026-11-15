---
name: verify-pinboard
description: "Launch the local Pinboard web app on an isolated data dir, drive add-pin or list-pins with pinboard-verify, and write evidence under evidence/verify-pinboard/. Use when proving Pinboard or when verify-change selects it."
---

# Verify Pinboard

Pinboard is the demo web UI in `demo/pinboard.mjs`. A user opens the page, adds a pin with the form, and sees it in the Pins list. Pins are stored in `pins.json` inside the data dir.

The helper is executable and lives at `.github/skills/verify-pinboard/bin/pinboard-verify.mjs`. Invoke it from the repo root:

```bash
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs --help
```

`--json` prints one object on stdout. `--dry-run` on `cleanup` and `drive` prints the plan and does not kill a process, delete data, post a form, or write evidence.

This skill was executed once against `add-pin`. The proof is `evidence/verify-pinboard/add-pin.json`. It was captured before cleanup and was still present after cleanup. A copy of this skill with no evidence file is a draft.

## Launch

Start a fresh instance. Launch deletes and recreates the data dir, so the board starts empty. The default data dir is `.verify-runtime/pinboard/data`, which is gitignored. The CLI returns only after the server prints its ready line.

```bash
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs launch --port 0 --json
```

Ready signal: stdout JSON has `"ok": true` and `readyLine` matches `pinboard ready url=http://127.0.0.1:<port> dataDir=<abs-dir>`. The page at that URL is the empty board (`No pins yet.`).

One instance at a time. If launch says pinboard is already running, clean it up first. Do not drive a Pinboard this run did not start. `--data-dir` must stay inside `.verify-runtime/pinboard`.

Manual use of the app, outside this loop:

```bash
node demo/pinboard.mjs
```

That listens on `127.0.0.1:4173` and stores pins in `.verify-runtime/pinboard/manual`. Prefer the CLI for proof.

## Doctor

Read-only. Run it before the first drive and after any surprise.

```bash
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs doctor --json
```

It passes only when the recorded pid is alive, `GET /` returns 200 with `<title>Pinboard</title>`, and `pins.json` in the recorded data dir parses. On Linux it also checks `/proc/<pid>/cmdline` for `pinboard.mjs` and that `PINBOARD_DATA_DIR` matches the state file. It does not write pins.

## Drive

Drive the form the page posts. `POST /pins` with `application/x-www-form-urlencoded` is the Add pin button, not a test endpoint.

```bash
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs drive add-pin --title "Release checklist" --note "Tag and publish" --json
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs drive list-pins --json
```

`drive add-pin` requires `--title`. It treats a non-303 response as failure. It then `GET /` and requires the title in a Pins heading and the same title and note in `pins.json`.

`drive list-pins` is read-only. It fails if `pins.json` changes during the GET.

`--dry-run` does not send the request and does not write evidence.

## Evidence

`drive` writes `evidence/verify-pinboard/<feature>.json` unless `--evidence` is set. The file records the action (method, URL, form), the resulting page (status, visible titles and notes), and the side effect (`pins.json` contents). Pass `--evidence` to keep a scratch proof out of the sample path.

The checked-in sample is `evidence/verify-pinboard/add-pin.json`.

## Cleanup

```bash
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs cleanup --dry-run --json
node .github/skills/verify-pinboard/bin/pinboard-verify.mjs cleanup --json
```

Cleanup sends `SIGTERM` (then `SIGKILL` if needed) only to the pid in `.verify-runtime/pinboard/state.json`, and only when `/proc` shows that pid is `pinboard.mjs` (or when `/proc` is unavailable). It deletes that data dir, the state file, and the server log. It does not delete `evidence/`. `--dry-run` prints `wouldKill` and `wouldRemove` and leaves the process up.

Run cleanup after a failed attempt too.

## Helpers

`node .github/skills/verify-pinboard/bin/pinboard-verify.mjs --help`

The script is the only helper. Subcommands are `launch`, `doctor`, `drive`, and `cleanup`.

## Feature map

Read [features/README.md](features/README.md) before choosing a feature. One file per feature, with the headings `Sub-features`, `How to get to it (user POV)`, `Driving it with pinboard-verify`, and `Gotchas`.

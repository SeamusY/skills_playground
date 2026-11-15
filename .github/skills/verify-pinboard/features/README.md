# Pinboard verification map

This directory is the map for Pinboard's user-facing behavior. Read it before driving the app, then follow the feature file.

## Baseline preconditions

- Launch with `node .github/skills/verify-pinboard/bin/pinboard-verify.mjs launch --port 0`.
- The ready line is `pinboard ready url=http://127.0.0.1:<port> dataDir=<dir>`.
- The data dir is empty of pins. Launch recreates `.verify-runtime/pinboard/data`.
- `doctor` reports the same URL and a live pid before any drive.
- Drive only the instance this run launched.

## Driving conventions

- Start each recipe from the baseline unless it says otherwise.
- The user path for adding a pin is the form: `POST /pins` as `application/x-www-form-urlencoded`, then `GET /`.
- Treat commands as literal. Keep flags and quoted titles.
- `--json` is for the agent. `--dry-run` changes nothing.
- Proof is the evidence file plus the pins still listed on the page. A 303 alone is not proof.
- Cleanup removes `.verify-runtime/pinboard` state and the data dir. It leaves `evidence/verify-pinboard/`.

## Features

- [Add a pin](add-pin.md) — form submit, persistence in `pins.json`, and the Pins list.
- [List pins](list-pins.md) — empty board and the board after a pin exists.

# Add a pin

Add a pin lets a user type a title and a note, press Add pin, and see that pin in the list after the page reloads. The same pin is stored in `pins.json`.

## Sub-features

- `add-open` shows the Add pin form on the board.
- `add-save` stores a trimmed title and note and shows them in the Pins section.
- `add-reject-blank` refuses a blank title and leaves the list unchanged.

## How to get to it (user POV)

- Open the Pinboard URL from the ready line.
- Fill the Title and Note fields in the Add pin form.
- Press the Add pin button.
- The browser follows the redirect back to the board. The new pin is a heading in the Pins section.

## Driving it with pinboard-verify

Preconditions:

- `doctor` is healthy for the instance `launch` started.
- The data dir has no pin titled `Release checklist`. A fresh launch satisfies this.

- **Open the form.** `GET /` returns the Add pin form. The Title and Note fields are labeled `Title` and `Note`. The button is named `Add pin`.
- **Dry-run.** `node .github/skills/verify-pinboard/bin/pinboard-verify.mjs drive add-pin --dry-run --title "Release checklist" --note "Tag and publish" --json`. `dryRun` is true, no evidence file is written, and `pins.json` stays empty.
- **Save.** `node .github/skills/verify-pinboard/bin/pinboard-verify.mjs drive add-pin --title "Release checklist" --note "Tag and publish" --json`. The command exits 0. Evidence shows `postStatus` 303, `location` `/`, and `visibleTitles` containing `Release checklist`.
- **Side effect.** The evidence `sideEffects.pins` array includes that title and note. That array is the snapshot of `pins.json` after the POST.
- **Blank title.** `node .github/skills/verify-pinboard/bin/pinboard-verify.mjs drive add-pin --title " " --note "x" --json`. Exit code is 1, the JSON `error` is `POST /pins returned 400`, no evidence file is written, and `pins.json` does not grow. The page alert is `Title is required`. Do not treat that failure as success.

## Gotchas

- Titles and notes are trimmed. Assert the heading text, not the raw form body.
- A 303 without the following GET is not proof. The title has to be in the Pins section and in `pins.json`.
- HTML in a title is escaped on the page and stored raw in `pins.json`.
- A form body over 16 KB is rejected and not saved.
- `drive add-pin` overwrites `evidence/verify-pinboard/add-pin.json`. Pass `--evidence` to write somewhere else. Cleanup never deletes `evidence/`.
- Launch wipes the data dir. A pin from a previous launch is gone.

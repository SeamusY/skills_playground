# List pins

List pins is the board itself. A user opens Pinboard and reads every saved pin, or the empty state when there are none.

## Sub-features

- `list-empty` shows `No pins yet.` when `pins.json` is `[]`.
- `list-saved` shows each saved title and note in the Pins section.
- `list-stable` does not change `pins.json`.

## How to get to it (user POV)

- Open the Pinboard URL from the ready line.
- Read the Pins section under the form.
- An empty board says `No pins yet.`
- After Add pin, the new pin's title is a heading in that section.

## Driving it with pinboard-verify

Preconditions:

- `doctor` is healthy for the instance `launch` started.
- For the empty state, do this before any `drive add-pin` on that instance.
- For the populated state, run the add-pin recipe first.

- **Empty board.** `node .github/skills/verify-pinboard/bin/pinboard-verify.mjs drive list-pins --json`. Evidence `result.empty` is true, `visibleTitles` is `[]`, and `sideEffects.pins` is `[]`.
- **Populated board.** After a successful add-pin, run `drive list-pins` again. `visibleTitles` matches the titles in `sideEffects.pins`.
- **No mutation.** `drive list-pins` fails if `pins.json` changes during the GET.

## Gotchas

- `No pins yet.` is the empty state, not a failed drive.
- Notes are escaped on the page. A search for a raw `<` in the HTML misses a note that was saved with that character.
- `drive list-pins` overwrites `evidence/verify-pinboard/list-pins.json`. The checked-in sample for this repo is the add-pin proof, not a list-pins file.
- Listing does not create a pin. If the file gains a pin, the run is invalid.

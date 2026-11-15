# Requirements

Copy this file to `.github/skills/skill-refiner/requirements.md`. Replace each `-` with a note. Incomplete notes are enough; leave a section as `-` if you do not know it yet.

## What the refined skill should do

-

## Constraints

-

## Success criteria

-

## Out of scope

-

# Shape only

Not the user's requirements. Do not copy this part into `requirements.md`. A filled file looks like this:

## What the refined skill should do

`verify-pinboard` loads when proving Pinboard or when `verify-change` selects it. The description does not list launch, drive, or evidence steps.

## Constraints

When-to-use description only. Leave the body as it is.

## Success criteria

An agent that read only the description still opens the body before driving the app.

## Out of scope

Changing `pinboard-verify.mjs`. Treating a missing evidence file as a pass.

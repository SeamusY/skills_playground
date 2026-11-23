# Scenario: allowed invocation vs blocked or missing `to-spec`

Not a PRD. After confirmation, `prd-to-spec` must hand off to installed `to-spec` from the [mattpocock/skills](https://github.com/mattpocock/skills) plugin. Do not vendor that plugin here.

## Allowed

The runtime lets this skill load another skill. Load installed `to-spec` (or fetch the canonical file / a user-supplied copy) and follow that text. Do not depend on a bundled snapshot path in this repo.

## Blocked

Upstream `to-spec` sets `disable-model-invocation: true`. If chained invocation is disallowed, prepare the handoff package and tell the user to run `/to-spec`. Do not claim `/to-spec` or `to-spec` ran.

## Missing dependency

The plugin is not installed, the skill cannot be loaded, and no user-supplied copy exists. Say you cannot invoke `to-spec`. Do not invent a substitute workflow. Do not claim it ran.

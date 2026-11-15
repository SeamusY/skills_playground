---
name: maintain-verification-skill
description: "Keep a .github/skills/verify-* feature map honest. Compare each feature to source and exercise it live. Update the map when it drifts. Do not edit product code, and do not hide a product bug by editing docs. Use for /maintain-verification-skill."
disable-model-invocation: true
---

# Maintain a verification skill

A feature map rots when the app changes. This is the upkeep loop for a skill from `/create-verification-skill`, or any project skill under `.github/skills/verify-*/` with a `features/` map.

The unit of rigor is the feature, not every sentence. Cover every feature file from source and exercise every feature live.

## Outcomes

Pick one and say which:

- **clean** — every feature got source and live coverage. Nothing to ship.
- **changed** — one PR of proven doc, harness, or map corrections.
- **blocked** — coverage could not finish, or a proven fix could not ship safely. Say what blocked it.

## Edit scope

Edit only the verification skill directory (`SKILL.md`, `features/`, and helpers it owns). Do not edit product code on this run.

A behavior the map describes that the app no longer does is either doc drift (fix the map) or a product bug (report it). Do not hide a product bug by editing docs. If the source still implements the old behavior and the running app does not, that is a bug: leave the map, name the bug. Update the map only for behavior the source and the live app both show.

## Pass

0. **Locate the target.** Find `.github/skills/verify-*/` whose body has launch, doctor, drive, evidence, and cleanup, plus `features/README.md`. Several candidates: ask which one. None: stop and point at `/create-verification-skill`. Never look in `.cursor/skills/` and never invent a target.

1. **Index hygiene.** Read the feature README and its sibling files. Fix missing, extra, duplicate, or dead links. Do not generate a second inventory.

2. **Source wave.** For each feature file, read the source and answer how the user-facing feature works. Fan out only if the host can run parallel read-only agents; otherwise read them one at a time. Do not start a Cursor cloud agent or a Grok bot. Each read returns: feature summary, source entry points, likely drift or none, and one live recipe. Readers never drive the app and never edit files.

3. **Reconcile.** Every feature file has a summary. Merge overlapping recipes into as few app states as you can. Spot-check cited drift. Sweep recent changes for a user-facing surface missing from the map, and require a concrete source path before calling one missing.

4. **Live pass.** Required even when source looks clean. Follow the skill's own Launch section: one long-lived instance for a server or UI, or a fresh process per drive for a short-lived CLI. Exercise every feature at least once. Hold three invariants:

   - Doctor before the first drive, doctor on each fresh session, and doctor again after a failed drive. If doctor cannot see the failure, relaunch. Do not keep driving a wedged instance.
   - Evidence captured so far survives every cleanup. Check the path. Do not assume.
   - Nothing a drive started outlives that drive. Clean failed residue. On a shared instance, clean the residue, not the instance.

   A doctor failure caused by skill drift is drift: fix it inside the skill directory and retry once. Restart only what the fix invalidated. A feature that cannot be reached is `verified-unreachable` only with the concrete prerequisite and the route you tried. If the map omits that prerequisite, that is drift. Re-drive any harness fix before it ships. Final teardown runs after the last drive. Evidence stays.

5. **Triage.** Wrong user-facing description: doc drift, fix the map. Working behavior the harness cannot drive: harness gap, fix the helper, keep it executable, and show the invocation in the skill body. Broken app behavior: product bug, report it, leave it out of the doc edit.

6. **Ship or stop.** For **changed**, one PR of proven corrections. Re-read every changed file first. For **clean** or **blocked**, no PR. Report the outcome and the coverage.

Keep run notes under `.verify-runtime/`. Do not commit them.

# prd-to-spec desk-check fixtures

These files are sample inputs and scenario cards for [`../SKILL.md`](../SKILL.md). The node test reads them and checks that the skill text still encodes the matching rule.

They are **desk checks**. They do not launch GitHub Copilot, load `/prd-to-spec`, or prove an agent followed the skill. A live Copilot session against a fixture is a manual exercise, not what `prd-to-spec.test.mjs` runs.

| Case | File | Kind |
| --- | --- | --- |
| Feature coverage | [feature-coverage.md](feature-coverage.md) | PRD you can pass to `/prd-to-spec` |
| Contradictory requirements | [contradictory.md](contradictory.md) | PRD |
| Explicit deferral | [explicit-deferral.md](explicit-deferral.md) | PRD |
| Missing file | [missing-file.md](missing-file.md) | Scenario card (not a PRD) |
| Confirmation and handoff | [confirmation-and-handoff.md](confirmation-and-handoff.md) | Scenario card |
| Allowed vs blocked vs missing `to-spec` | [invocation.md](invocation.md) | Scenario card |

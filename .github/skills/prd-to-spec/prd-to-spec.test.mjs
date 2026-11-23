import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(skillDir, "../../..");
const skillPath = path.join(skillDir, "SKILL.md");
const examplesDir = path.join(skillDir, "examples");
const readmePath = path.join(repoRoot, "README.md");

const skillText = fs.readFileSync(skillPath, "utf8");
const readme = fs.readFileSync(readmePath, "utf8");

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, "SKILL.md needs YAML frontmatter");
  const fields = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    assert.notEqual(idx, -1, `frontmatter line is not key: value: ${line}`);
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return fields;
}

function readExample(name) {
  return fs.readFileSync(path.join(examplesDir, name), "utf8");
}

const cases = [
  {
    id: "feature-coverage",
    fixture: "feature-coverage.md",
    fixtureMustMatch: [/Add a pin/, /List pins/, /Delete a pin/],
    skillMustMatch: [/Map every supplied feature to included, deferred, or rejected/],
  },
  {
    id: "contradictory-requirements",
    fixture: "contradictory.md",
    fixtureMustMatch: [/board is public/, /board is private/],
    skillMustMatch: [/Do not silently pick a side of a contradiction: put the conflict on the frontier/],
  },
  {
    id: "missing-file",
    fixture: "missing-file.md",
    fixtureMustMatch: [/with no path and no attached file/],
    skillMustMatch: [
      /If no file or path was supplied, ask for it and stop/,
      /Do not invent a feature list/,
    ],
  },
  {
    id: "explicit-deferral",
    fixture: "explicit-deferral.md",
    fixtureMustMatch: [/Email a pin/, /May be deferred/],
    skillMustMatch: [
      /If the user explicitly defers an item, record it as out of scope or labeled unresolved and stop interviewing that branch/,
    ],
  },
  {
    id: "confirmation",
    fixture: "confirmation-and-handoff.md",
    fixtureMustMatch: [/Silence is not confirmation/, /just write the spec/],
    skillMustMatch: [
      /Hand off only after an explicit yes/,
      /Silence is not confirmation/,
      /"Just write the spec"/,
    ],
  },
  {
    id: "invocation-allowed",
    fixture: "invocation.md",
    fixtureMustMatch: [/## Allowed/],
    skillMustMatch: [/If the runtime permits, load installed `to-spec`/],
  },
  {
    id: "invocation-blocked",
    fixture: "invocation.md",
    fixtureMustMatch: [/disable-model-invocation: true/],
    skillMustMatch: [
      /disable-model-invocation: true/,
      /tell the user to run `\/to-spec`/,
      /Do not claim that command ran/,
    ],
  },
  {
    id: "invocation-missing-dependency",
    fixture: "invocation.md",
    fixtureMustMatch: [/## Missing dependency/],
    skillMustMatch: [
      /Otherwise say you cannot invoke it/,
      /Do not invent a substitute workflow or claim `to-spec` ran/,
    ],
  },
];

test("desk-check only: this file reads SKILL.md and fixtures; it does not run Copilot or prove agent behavior", () => {
  assert.match(readExample("README.md"), /desk checks/i);
  assert.match(readExample("README.md"), /do not launch GitHub Copilot/i);
});

test("skill lives at .github/skills/prd-to-spec/SKILL.md and is named prd-to-spec", () => {
  assert.equal(path.relative(repoRoot, skillPath), path.join(".github", "skills", "prd-to-spec", "SKILL.md"));
  assert.equal(path.basename(skillDir), "prd-to-spec");
  const meta = frontmatter(skillText);
  assert.equal(meta.name, "prd-to-spec");
  assert.ok(meta.description.length > 0);
  assert.equal(meta["disable-model-invocation"], undefined);
});

test("does not vendor mattpocock/skills; to-spec stays a plugin handoff", () => {
  const pluginCopy = path.join(repoRoot, "skills", "engineering", "to-spec", "SKILL.md");
  assert.equal(fs.existsSync(pluginCopy), false);
  assert.doesNotMatch(skillText, /## Problem Statement/);
  assert.doesNotMatch(skillText, /ready-for-agent/);
  assert.doesNotMatch(skillText, /As an, I want a, so that/);
  assert.match(skillText, /Do not duplicate `to-spec`'s template/);
  assert.match(skillText, /do not publish, label, or implement unless the user explicitly asked/);
  assert.match(
    skillText,
    /https:\/\/github\.com\/mattpocock\/skills\/blob\/main\/skills\/productivity\/grilling\/SKILL\.md/,
  );
  assert.match(
    skillText,
    /https:\/\/github\.com\/mattpocock\/skills\/blob\/main\/skills\/engineering\/to-spec\/SKILL\.md/,
  );
});

for (const c of cases) {
  test(`desk-check case ${c.id}`, () => {
    const fixture = readExample(c.fixture);
    for (const re of c.fixtureMustMatch) assert.match(fixture, re, `${c.fixture} missing ${re}`);
    for (const re of c.skillMustMatch) assert.match(skillText, re, `SKILL.md missing ${re} for ${c.id}`);
  });
}

test("README documents /prd-to-spec usage, confirmation, handoff, and the runtime limit", () => {
  assert.match(readme, /\/prd-to-spec /);
  assert.match(readme, /prd-to-spec/);
  assert.match(readme, /disable-model-invocation/);
  assert.match(readme, /\/to-spec/);
  assert.match(readme, /grilling/);
  assert.match(readme, /mattpocock\/skills/);
  assert.match(readme, /Desk-check/);
});

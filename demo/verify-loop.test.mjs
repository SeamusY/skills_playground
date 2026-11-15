import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, ".github/skills/verify-pinboard/bin/pinboard-verify.mjs");

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  let payload = null;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    payload = null;
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, payload };
}

test("help lists the drive commands and the safety flags", () => {
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /drive add-pin/);
  assert.match(help.stdout, /--json/);
  assert.match(help.stdout, /--dry-run/);
});

test("doctor fails closed when nothing is running", () => {
  run(["cleanup"]);
  const doctor = run(["--json", "doctor"]);
  assert.equal(doctor.status, 1);
  assert.equal(doctor.payload.ok, false);
});

test("add-pin evidence survives cleanup", () => {
  const evidence = path.join(os.tmpdir(), `pinboard-add-${process.pid}.json`);
  const listEvidence = path.join(os.tmpdir(), `pinboard-list-${process.pid}.json`);
  fs.rmSync(evidence, { force: true });
  fs.rmSync(listEvidence, { force: true });
  run(["cleanup"]);
  let pid = null;
  try {
    const launch = run(["--json", "launch", "--port", "0"]);
    assert.equal(launch.status, 0, launch.stderr + launch.stdout);
    pid = launch.payload.pid;
    assert.match(launch.payload.readyLine, /^pinboard ready url=http:\/\/127\.0\.0\.1:\d+ dataDir=/);

    const doctor = run(["--json", "doctor"]);
    assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);
    if (fs.existsSync("/proc")) assert.equal(doctor.payload.proc, "pinboard.mjs");

    const dry = run([
      "--json",
      "--dry-run",
      "drive",
      "add-pin",
      "--title",
      "Release checklist",
      "--note",
      "Tag and publish",
      "--evidence",
      evidence,
    ]);
    assert.equal(dry.status, 0, dry.stderr + dry.stdout);
    assert.equal(dry.payload.dryRun, true);
    assert.equal(fs.existsSync(evidence), false);

    const blank = run([
      "--json",
      "drive",
      "add-pin",
      "--title",
      " ",
      "--note",
      "x",
      "--evidence",
      evidence,
    ]);
    assert.equal(blank.status, 1);
    assert.equal(blank.payload.error, "POST /pins returned 400");
    assert.equal(fs.existsSync(evidence), false);

    const listed = run(["--json", "drive", "list-pins", "--evidence", listEvidence]);
    assert.equal(listed.status, 0, listed.stderr + listed.stdout);
    const empty = JSON.parse(fs.readFileSync(listEvidence, "utf8"));
    assert.equal(empty.result.empty, true);
    assert.deepEqual(empty.sideEffects.pins, []);

    const drive = run([
      "--json",
      "drive",
      "add-pin",
      "--title",
      "Release checklist",
      "--note",
      "Tag and publish",
      "--evidence",
      evidence,
    ]);
    assert.equal(drive.status, 0, drive.stderr + drive.stdout);
    const proof = JSON.parse(fs.readFileSync(evidence, "utf8"));
    assert.equal(proof.feature, "add-pin");
    assert.equal(proof.action.method, "POST");
    assert.equal(proof.action.form.title, "Release checklist");
    assert.equal(proof.result.postStatus, 303);
    assert.deepEqual(proof.result.visibleTitles, ["Release checklist"]);
    assert.equal(proof.sideEffects.pins[0].title, "Release checklist");
    assert.equal(proof.sideEffects.pins[0].note, "Tag and publish");

    const preview = run(["--json", "cleanup", "--dry-run"]);
    assert.equal(preview.status, 0, preview.stderr + preview.stdout);
    assert.deepEqual(preview.payload.wouldKill, [pid]);
    assert.equal(run(["--json", "doctor"]).status, 0);

    const cleanup = run(["--json", "cleanup"]);
    assert.equal(cleanup.status, 0, cleanup.stderr + cleanup.stdout);
    assert.equal(fs.existsSync(evidence), true);
    assert.equal(fs.existsSync(listEvidence), true);
    assert.equal(fs.existsSync(path.join(root, ".verify-runtime", "pinboard", "state.json")), false);
    let stillAlive = true;
    try {
      process.kill(pid, 0);
    } catch {
      stillAlive = false;
    }
    assert.equal(stillAlive, false);
  } finally {
    run(["cleanup"]);
    fs.rmSync(evidence, { force: true });
    fs.rmSync(listEvidence, { force: true });
  }
});

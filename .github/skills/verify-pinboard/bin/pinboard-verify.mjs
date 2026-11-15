#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FEATURES = new Set(["add-pin", "list-pins"]);

const HELP = `pinboard-verify — drive the local Pinboard demo

Usage:
  pinboard-verify [--json] <command> [flags]

Commands:
  launch [--port N] [--data-dir PATH]
  doctor
  drive add-pin --title TEXT [--note TEXT] [--evidence PATH]
  drive list-pins [--evidence PATH]
  cleanup [--dry-run]

Flags:
  --json       print one JSON object on stdout
  --dry-run    cleanup and drive: print the plan and change nothing
  --help       show this text

Examples:
  pinboard-verify launch --port 0 --json
  pinboard-verify doctor --json
  pinboard-verify drive add-pin --title "Release checklist" --note "Tag and publish"
  pinboard-verify cleanup --dry-run
  pinboard-verify cleanup
`;

function repoRoot() {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "demo", "pinboard.mjs"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("repo root not found (demo/pinboard.mjs)");
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function parseArgs(argv) {
  const flags = { json: false, dryRun: false, help: false };
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") flags.json = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--help" || arg === "-h") flags.help = true;
    else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`missing value for --${key}`);
      }
      opts[key] = value;
      i++;
    } else positional.push(arg);
  }
  return { flags, positional, opts };
}

function runtimeDir(root) {
  return path.join(root, ".verify-runtime", "pinboard");
}

function statePath(root) {
  return path.join(runtimeDir(root), "state.json");
}

function logPath(root) {
  return path.join(runtimeDir(root), "server.log");
}

function defaultDataDir(root) {
  return path.join(runtimeDir(root), "data");
}

function defaultEvidence(root, feature) {
  return path.join(root, "evidence", "verify-pinboard", `${feature}.json`);
}

function relativeTo(root, abs) {
  const rel = path.relative(root, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return abs;
  return rel.split(path.sep).join("/");
}

function readState(root) {
  const file = statePath(root);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeState(root, state) {
  fs.mkdirSync(runtimeDir(root), { recursive: true });
  fs.writeFileSync(statePath(root), `${JSON.stringify(state, null, 2)}\n`);
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function procInfo(pid) {
  if (!fs.existsSync("/proc")) return { available: false };
  let cmdline = "";
  try {
    cmdline = fs.readFileSync(`/proc/${pid}/cmdline`).toString("utf8").replaceAll("\0", " ");
  } catch {
    return { available: true, readable: false };
  }
  let env = null;
  try {
    env = {};
    const raw = fs.readFileSync(`/proc/${pid}/environ`).toString("utf8");
    for (const entry of raw.split("\0")) {
      const eq = entry.indexOf("=");
      if (eq > 0) env[entry.slice(0, eq)] = entry.slice(eq + 1);
    }
  } catch {
    env = null;
  }
  return {
    available: true,
    readable: true,
    cmdline,
    isPinboard: cmdline.includes("pinboard.mjs"),
    env,
  };
}

function safeToDelete(root, dataDir) {
  const owned = path.resolve(runtimeDir(root));
  const target = path.resolve(dataDir);
  return target === owned || target.startsWith(`${owned}${path.sep}`);
}

function request(urlString, options = {}) {
  const url = new URL(urlString);
  const body = options.body;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function decode(text) {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function visiblePins(html) {
  const section = html.split('<section aria-label="Pins">')[1]?.split("</section>")[0] ?? "";
  const titles = [];
  const notes = [];
  for (const match of section.matchAll(/<article>([\s\S]*?)<\/article>/g)) {
    const title = match[1].match(/<h2>([\s\S]*?)<\/h2>/);
    const note = match[1].match(/<p>([\s\S]*?)<\/p>/);
    if (title) titles.push(decode(title[1]));
    if (note) notes.push(decode(note[1]));
  }
  return { titles, notes, empty: section.includes("No pins yet.") };
}

function keptEvidence(root) {
  const evidenceDir = path.join(root, "evidence", "verify-pinboard");
  if (!fs.existsSync(evidenceDir)) return [];
  return fs
    .readdirSync(evidenceDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => relativeTo(root, path.join(evidenceDir, name)));
}

function emit(flags, payload) {
  const code = payload.ok ? 0 : 1;
  if (flags.json) process.stdout.write(`${JSON.stringify(payload)}\n`);
  else if (payload.ok) process.stdout.write(`${payload.message}\n`);
  else process.stderr.write(`${payload.error}\n`);
  process.exit(code);
}

async function launch(root, opts) {
  const existing = readState(root);
  if (existing && alive(existing.pid)) {
    const info = procInfo(existing.pid);
    if (!info.available || info.isPinboard !== false) {
      throw new Error(`pinboard already running pid=${existing.pid}; run cleanup first`);
    }
  }
  const port = opts.port === undefined ? 0 : Number(opts.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("--port must be an integer from 0 to 65535");
  }
  const dataDir = path.resolve(opts["data-dir"] || defaultDataDir(root));
  if (!safeToDelete(root, dataDir)) {
    throw new Error("--data-dir must be inside .verify-runtime/pinboard");
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(runtimeDir(root), { recursive: true });
  const log = logPath(root);
  const fd = fs.openSync(log, "w");
  const child = spawn(process.execPath, [path.join(root, "demo", "pinboard.mjs")], {
    cwd: root,
    detached: true,
    stdio: ["ignore", fd, fd],
    env: {
      ...process.env,
      PINBOARD_HOST: "127.0.0.1",
      PINBOARD_PORT: String(port),
      PINBOARD_DATA_DIR: dataDir,
    },
  });
  child.unref();
  fs.closeSync(fd);
  const started = Date.now();
  let readyLine = "";
  while (Date.now() - started < 5000) {
    if (!alive(child.pid)) break;
    if (fs.existsSync(log)) {
      const text = fs.readFileSync(log, "utf8");
      const line = text.split("\n").find((entry) => entry.startsWith("pinboard ready "));
      if (line) {
        readyLine = line.trim();
        break;
      }
      if (text.includes("pinboard failed")) break;
    }
    sleep(50);
  }
  if (!readyLine) {
    if (alive(child.pid)) {
      try {
        process.kill(child.pid, "SIGKILL");
      } catch {
        // The child already exited.
      }
    }
    const logText = fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim() : "";
    throw new Error(`launch failed: ${logText || "no ready line"}`);
  }
  const match = /^pinboard ready url=(\S+) dataDir=(.+)$/.exec(readyLine);
  if (!match) throw new Error(`unreadable ready line: ${readyLine}`);
  const state = {
    pid: child.pid,
    url: match[1],
    dataDir: match[2],
    readyLine,
    startedAt: new Date().toISOString(),
  };
  writeState(root, state);
  return {
    ok: true,
    command: "launch",
    message: `ready ${state.url} pid=${state.pid}`,
    pid: state.pid,
    url: state.url,
    dataDir: state.dataDir,
    readyLine: state.readyLine,
  };
}

async function doctor(root) {
  const state = readState(root);
  if (!state) throw new Error("no pinboard instance; run launch first");
  if (!alive(state.pid)) throw new Error(`pid ${state.pid} is not running`);
  const info = procInfo(state.pid);
  if (info.available && info.readable && !info.isPinboard) {
    throw new Error(`pid ${state.pid} is not pinboard.mjs`);
  }
  if (info.env) {
    if (path.resolve(info.env.PINBOARD_DATA_DIR) !== path.resolve(state.dataDir)) {
      throw new Error("process data dir does not match state");
    }
    const port = new URL(state.url).port;
    if (info.env.PINBOARD_PORT !== port && info.env.PINBOARD_PORT !== "0") {
      throw new Error("process port does not match state");
    }
  }
  const response = await request(`${state.url}/`);
  if (response.status !== 200 || !response.body.includes("<title>Pinboard</title>")) {
    throw new Error(`GET / returned ${response.status}`);
  }
  const file = path.join(state.dataDir, "pins.json");
  if (!fs.existsSync(file)) throw new Error("pins.json is missing");
  JSON.parse(fs.readFileSync(file, "utf8"));
  return {
    ok: true,
    command: "doctor",
    message: `healthy ${state.url} pid=${state.pid}`,
    pid: state.pid,
    url: state.url,
    dataDir: relativeTo(root, state.dataDir),
    httpStatus: response.status,
    proc: !info.available ? "unavailable" : info.isPinboard ? "pinboard.mjs" : "unreadable",
  };
}

function requireTitle(opts) {
  if (opts.title === undefined) throw new Error("--title is required");
}

async function drive(root, flags, positional, opts) {
  const feature = positional[1];
  if (!FEATURES.has(feature)) throw new Error("drive requires add-pin or list-pins");
  const state = readState(root);
  if (feature === "add-pin") requireTitle(opts);
  if (flags.dryRun) {
    const wouldRequest =
      feature === "add-pin"
        ? {
            method: "POST",
            url: state ? `${state.url}/pins` : "http://127.0.0.1:<port>/pins",
            form: { title: String(opts.title), note: String(opts.note ?? "") },
          }
        : { method: "GET", url: state ? `${state.url}/` : "http://127.0.0.1:<port>/" };
    return {
      ok: true,
      command: "drive",
      feature,
      dryRun: true,
      message: `dry-run ${feature} would ${wouldRequest.method} ${wouldRequest.url}`,
      wouldRequest,
      wouldWriteEvidence: relativeTo(
        root,
        path.resolve(opts.evidence || defaultEvidence(root, feature)),
      ),
    };
  }
  if (!state) throw new Error("no pinboard instance; run launch first");
  if (!alive(state.pid)) throw new Error(`pid ${state.pid} is not running`);
  if (feature === "add-pin") return addPin(root, state, opts);
  return listPins(root, state, opts);
}

async function addPin(root, state, opts) {
  const form = { title: String(opts.title), note: String(opts.note ?? "") };
  const savedTitle = form.title.trim();
  const savedNote = form.note.trim();
  const body = new URLSearchParams(form).toString();
  const post = await request(`${state.url}/pins`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "content-length": Buffer.byteLength(body),
    },
    body,
  });
  if (post.status !== 303) {
    throw new Error(`POST /pins returned ${post.status}`);
  }
  const get = await request(`${state.url}/`);
  if (get.status !== 200) throw new Error(`GET / returned ${get.status}`);
  const visible = visiblePins(get.body);
  const pins = JSON.parse(fs.readFileSync(path.join(state.dataDir, "pins.json"), "utf8"));
  const saved = pins.some((pin) => pin.title === savedTitle && pin.note === savedNote);
  if (!savedTitle || !visible.titles.includes(savedTitle) || !saved) {
    throw new Error("pin was not saved and shown");
  }
  const evidence = writeEvidence(root, opts.evidence, {
    feature: "add-pin",
    ok: true,
    action: {
      command: "drive add-pin",
      method: "POST",
      url: `${state.url}/pins`,
      form,
    },
    result: {
      postStatus: post.status,
      location: post.headers.location || "",
      getStatus: get.status,
      visibleTitles: visible.titles,
      visibleNotes: visible.notes,
    },
    sideEffects: {
      pinsFile: relativeTo(root, path.join(state.dataDir, "pins.json")),
      pins,
    },
    capturedAt: new Date().toISOString(),
  });
  return {
    ok: true,
    command: "drive",
    feature: "add-pin",
    message: `proved add-pin evidence=${relativeTo(root, evidence)}`,
    evidence: relativeTo(root, evidence),
  };
}

async function listPins(root, state, opts) {
  const before = fs.readFileSync(path.join(state.dataDir, "pins.json"), "utf8");
  const get = await request(`${state.url}/`);
  if (get.status !== 200) throw new Error(`GET / returned ${get.status}`);
  const after = fs.readFileSync(path.join(state.dataDir, "pins.json"), "utf8");
  if (before !== after) throw new Error("list-pins changed pins.json");
  const visible = visiblePins(get.body);
  const pins = JSON.parse(after);
  const evidence = writeEvidence(root, opts.evidence, {
    feature: "list-pins",
    ok: true,
    action: { command: "drive list-pins", method: "GET", url: `${state.url}/` },
    result: {
      getStatus: get.status,
      visibleTitles: visible.titles,
      visibleNotes: visible.notes,
      empty: visible.empty,
    },
    sideEffects: {
      pinsFile: relativeTo(root, path.join(state.dataDir, "pins.json")),
      pins,
    },
    capturedAt: new Date().toISOString(),
  });
  return {
    ok: true,
    command: "drive",
    feature: "list-pins",
    message: `proved list-pins evidence=${relativeTo(root, evidence)}`,
    evidence: relativeTo(root, evidence),
  };
}

function writeEvidence(root, evidenceOpt, payload) {
  const target = path.resolve(evidenceOpt || defaultEvidence(root, payload.feature));
  if (safeToDelete(root, target) || safeToDelete(root, path.dirname(target))) {
    throw new Error("evidence path must not be inside .verify-runtime");
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`);
  fs.renameSync(tmp, target);
  return target;
}

function killOwned(pid) {
  const info = procInfo(pid);
  if (info.available && info.readable && !info.isPinboard) {
    throw new Error(`pid ${pid} is not pinboard.mjs; refusing to kill`);
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
    return;
  }
  const started = Date.now();
  while (Date.now() - started < 2000) {
    if (!alive(pid)) return;
    sleep(50);
  }
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // The process exited between the checks.
  }
}

function removeEmptyRuntime(root) {
  for (const dir of [runtimeDir(root), path.join(root, ".verify-runtime")]) {
    try {
      fs.rmdirSync(dir);
    } catch {
      // Leave the directory when another run still has files in it.
    }
  }
}

function cleanup(root, flags) {
  const state = readState(root);
  const kept = keptEvidence(root);
  if (!state) {
    removeEmptyRuntime(root);
    return {
      ok: true,
      command: "cleanup",
      dryRun: Boolean(flags.dryRun),
      message: flags.dryRun ? "dry-run cleanup: nothing to stop" : "nothing to stop",
      wouldKill: [],
      keptEvidence: kept,
    };
  }
  const running = alive(state.pid);
  const remove = [];
  if (safeToDelete(root, state.dataDir)) remove.push(relativeTo(root, path.resolve(state.dataDir)));
  remove.push(relativeTo(root, statePath(root)));
  if (fs.existsSync(logPath(root))) remove.push(relativeTo(root, logPath(root)));
  if (flags.dryRun) {
    return {
      ok: true,
      command: "cleanup",
      dryRun: true,
      message: running
        ? `dry-run cleanup would kill pid=${state.pid}`
        : "dry-run cleanup: process already stopped",
      wouldKill: running ? [state.pid] : [],
      wouldRemove: remove,
      keptEvidence: kept,
    };
  }
  if (running) killOwned(state.pid);
  if (safeToDelete(root, state.dataDir)) fs.rmSync(state.dataDir, { recursive: true, force: true });
  fs.rmSync(statePath(root), { force: true });
  fs.rmSync(logPath(root), { force: true });
  removeEmptyRuntime(root);
  return {
    ok: true,
    command: "cleanup",
    message: `stopped pid=${state.pid}`,
    killed: running ? state.pid : null,
    removed: remove,
    keptEvidence: kept,
  };
}

async function main() {
  const wantsJson = process.argv.includes("--json");
  let flags = { json: wantsJson, dryRun: false, help: false };
  try {
    const parsed = parseArgs(process.argv.slice(2));
    flags = parsed.flags;
    if (parsed.flags.help || parsed.positional.length === 0 || parsed.positional[0] === "help") {
      process.stdout.write(HELP);
      process.exit(0);
    }
    const root = repoRoot();
    const command = parsed.positional[0];
    let payload;
    if (command === "launch") payload = await launch(root, parsed.opts);
    else if (command === "doctor") payload = await doctor(root);
    else if (command === "drive") payload = await drive(root, flags, parsed.positional, parsed.opts);
    else if (command === "cleanup") payload = cleanup(root, flags);
    else throw new Error(`unknown command ${command}; run --help`);
    emit(flags, payload);
  } catch (error) {
    const command = process.argv.slice(2).find((arg) => !arg.startsWith("-")) || "pinboard-verify";
    const payload = { ok: false, command, error: error.message || String(error) };
    if (flags.json) process.stdout.write(`${JSON.stringify(payload)}\n`);
    else process.stderr.write(`${payload.error}\n`);
    process.exit(1);
  }
}

main();

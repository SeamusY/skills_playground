#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BODY = 16 * 1024;

export function pinsFile(dataDir) {
  return path.join(dataDir, "pins.json");
}

export function readPins(dataDir) {
  const file = pinsFile(dataDir);
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("pins.json must be an array");
  }
  return parsed;
}

export function writePins(dataDir, pins) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = pinsFile(dataDir);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(pins, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

export function addPin(dataDir, input) {
  const title = String(input.title ?? "").trim();
  const note = String(input.note ?? "").trim();
  if (!title) {
    const error = new Error("Title is required");
    error.status = 400;
    throw error;
  }
  const pins = readPins(dataDir);
  const pin = {
    id: `${Date.now().toString(36)}-${pins.length + 1}`,
    title,
    note,
    createdAt: new Date().toISOString(),
  };
  pins.push(pin);
  writePins(dataDir, pins);
  return pin;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderPage(pins, options = {}) {
  const articles = pins
    .map(
      (pin) =>
        `<article><h2>${escapeHtml(pin.title)}</h2><p>${escapeHtml(pin.note)}</p></article>`,
    )
    .join("\n");
  const list = articles || `<p role="status">No pins yet.</p>`;
  const alert = options.error ? `<p role="alert">${escapeHtml(options.error)}</p>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Pinboard</title>
</head>
<body>
<h1>Pinboard</h1>
${alert}
<form action="/pins" method="post" aria-label="Add pin">
<label for="pin-title">Title</label>
<input id="pin-title" name="title" autocomplete="off">
<label for="pin-note">Note</label>
<input id="pin-note" name="note" autocomplete="off">
<button type="submit">Add pin</button>
</form>
<section aria-label="Pins">
${list}
</section>
</body>
</html>
`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        fail(Object.assign(new Error("Form body is too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", fail);
  });
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(html);
}

export function createHandler(dataDir) {
  return async function handler(req, res) {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (req.method === "GET" && url.pathname === "/") {
        sendHtml(res, 200, renderPage(readPins(dataDir)));
        return;
      }
      if (req.method === "POST" && url.pathname === "/pins") {
        const type = String(req.headers["content-type"] || "");
        if (!type.includes("application/x-www-form-urlencoded")) {
          sendHtml(res, 415, renderPage(readPins(dataDir), { error: "Use the Add pin form" }));
          return;
        }
        const body = await readBody(req);
        const form = new URLSearchParams(body);
        try {
          addPin(dataDir, { title: form.get("title"), note: form.get("note") });
        } catch (error) {
          sendHtml(res, error.status || 500, renderPage(readPins(dataDir), { error: error.message }));
          return;
        }
        res.writeHead(303, { Location: "/" });
        res.end();
        return;
      }
      sendHtml(res, 404, renderPage(readPins(dataDir), { error: "Not found" }));
    } catch (error) {
      if (!res.headersSent) {
        sendHtml(res, error.status || 500, renderPage([], { error: error.message || "Error" }));
      }
    }
  };
}

export function startPinboard({ host, port, dataDir }) {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(pinsFile(dataDir))) writePins(dataDir, []);
  const server = http.createServer(createHandler(dataDir));
  server.on("error", (error) => {
    fs.writeSync(2, `pinboard failed ${error.message}\n`);
    process.exit(1);
  });
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const address = server.address();
      const readyLine = `pinboard ready url=http://${host}:${address.port} dataDir=${dataDir}`;
      fs.writeSync(1, `${readyLine}\n`);
      resolve({ server, readyLine, port: address.port });
    });
  });
}

function main() {
  const host = process.env.PINBOARD_HOST || "127.0.0.1";
  const port = Number(process.env.PINBOARD_PORT ?? 4173);
  const dataDir = path.resolve(
    process.env.PINBOARD_DATA_DIR || path.join(".verify-runtime", "pinboard", "manual"),
  );
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    fs.writeSync(2, "PINBOARD_PORT must be an integer from 0 to 65535\n");
    process.exit(1);
  }
  startPinboard({ host, port, dataDir }).then(({ server }) => {
    const shutdown = () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 500).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  });
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) main();

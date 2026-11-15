import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { addPin, readPins, renderPage, startPinboard } from "./pinboard.mjs";

test("addPin trims, persists, and rejects a blank title", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pinboard-unit-"));
  assert.throws(() => addPin(dir, { title: "  ", note: "x" }), /Title is required/);
  assert.deepEqual(readPins(dir), []);
  const pin = addPin(dir, { title: "  Hello ", note: "  there " });
  assert.equal(pin.title, "Hello");
  assert.equal(pin.note, "there");
  assert.equal(readPins(dir)[0].title, "Hello");
});

test("the page escapes pin text", () => {
  const html = renderPage([{ title: "A <b>&", note: 'say "hi"' }]);
  assert.match(html, /<h2>A &lt;b&gt;&amp;<\/h2>/);
  assert.match(html, /<p>say &quot;hi&quot;<\/p>/);
  assert.doesNotMatch(html, /<h2>A <b>/);
});

test("POST /pins redirects and the next GET shows the pin", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pinboard-http-"));
  const { server, port } = await startPinboard({ host: "127.0.0.1", port: 0, dataDir: dir });
  try {
    const empty = await fetch(`http://127.0.0.1:${port}/`);
    assert.match(await empty.text(), /No pins yet/);

    const blank = await fetch(`http://127.0.0.1:${port}/pins`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "title=+&note=x",
      redirect: "manual",
    });
    assert.equal(blank.status, 400);
    assert.equal(readPins(dir).length, 0);

    const body = new URLSearchParams({ title: "A <b>", note: "n" }).toString();
    const post = await fetch(`http://127.0.0.1:${port}/pins`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
    });
    assert.equal(post.status, 303);
    assert.equal(post.headers.get("location"), "/");
    const page = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    assert.match(page, /<title>Pinboard<\/title>/);
    assert.match(page, /<h2>A &lt;b&gt;<\/h2>/);
    assert.equal(readPins(dir)[0].title, "A <b>");
    assert.equal(readPins(dir)[0].note, "n");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

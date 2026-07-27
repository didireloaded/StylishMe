import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("manifest exposes installable StylishMe standalone metadata", async () => {
  const manifest = JSON.parse(await readFile(new URL("public/manifest.webmanifest", root), "utf8"));
  assert.equal(manifest.name, "StylishMe Namibia");
  assert.equal(manifest.short_name, "StylishMe");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.theme_color, "#0b1218");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
});

test("layout advertises the manifest, Apple mode and covered viewport", async () => {
  const source = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(source, /manifest:\s*["']\/manifest\.webmanifest["']/);
  assert.match(source, /appleWebApp/);
  assert.match(source, /viewportFit:\s*["']cover["']/);
});

test("declared install icons are generated", async () => {
  for (const name of ["stylishme-192.png", "stylishme-512.png", "stylishme-maskable-512.png"]) {
    const icon = await stat(new URL(`public/icons/${name}`, root));
    assert.ok(icon.size > 1_000, `${name} should contain a real PNG image`);
  }
});

test("root layout registers the service worker from a client boundary", async () => {
  const [layout, registration] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/PwaRegistration.tsx", root), "utf8"),
  ]);
  assert.match(layout, /<PwaRegistration\s*\/>/);
  assert.match(registration, /navigator\.serviceWorker\s*\.register\("\/sw\.js", \{ scope: "\/" \}\)/s);
  assert.match(registration, /document\.readyState === "complete"/);
});

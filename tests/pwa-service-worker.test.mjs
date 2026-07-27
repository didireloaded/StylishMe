import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

function loadWorker({ fetchImpl = fetch, matchImpl = async () => undefined } = {}) {
  const listeners = {};
  const context = {
    URL,
    Request,
    Response,
    fetch: fetchImpl,
    caches: {
      open: async () => ({ addAll: async () => undefined, put: async () => undefined }),
      keys: async () => [],
      delete: async () => true,
      match: matchImpl,
    },
    self: {
      location: { origin: "https://stylishme.test" },
      addEventListener(type, callback) { listeners[type] = callback; },
      skipWaiting() {},
      clients: { claim() {} },
    },
  };
  vm.runInNewContext(source, context, { filename: "public/sw.js" });
  return listeners.fetch;
}

test("does not intercept commerce API requests", () => {
  const fetchHandler = loadWorker();
  let responded = false;
  fetchHandler({
    request: new Request("https://stylishme.test/api/state"),
    respondWith() { responded = true; },
  });
  assert.equal(responded, false);
});

test("does not intercept non-GET mutations", () => {
  const fetchHandler = loadWorker();
  let responded = false;
  fetchHandler({
    request: new Request("https://stylishme.test/checkout", { method: "POST" }),
    respondWith() { responded = true; },
  });
  assert.equal(responded, false);
});

test("does not cache uncategorized same-origin data requests", () => {
  const fetchHandler = loadWorker();
  let responded = false;
  fetchHandler({
    request: {
      url: "https://stylishme.test/catalogue-data",
      method: "GET",
      mode: "cors",
      destination: "",
    },
    respondWith() { responded = true; },
  });
  assert.equal(responded, false);
});

test("falls back to the branded offline document for failed navigation", async () => {
  const offline = new Response("offline", { status: 200 });
  const fetchHandler = loadWorker({
    fetchImpl: async () => { throw new Error("offline"); },
    matchImpl: async (key) => key === "/offline.html" ? offline : undefined,
  });
  let responsePromise;
  fetchHandler({
    request: { url: "https://stylishme.test/shop", method: "GET", mode: "navigate" },
    respondWith(value) { responsePromise = value; },
  });
  assert.equal(await responsePromise, offline);
});

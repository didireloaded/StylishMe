import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("production schedules reservation cleanup and due account deletion", async () => {
  const [worker, vite] = await Promise.all([
    read("../worker/index.ts"),
    read("../vite.config.ts"),
  ]);
  assert.match(worker, /async scheduled/);
  assert.match(worker, /releaseExpiredReservations/);
  assert.match(worker, /processDueAccountDeletions/);
  assert.match(worker, /revokeAccountProviderCredentials/);
  assert.match(vite, /crons:\s*\["\*\/15 \* \* \* \*"\]/);
});

test("catalogue reads also release expired holds before showing stock", async () => {
  const route = await read("../app/api/catalog/route.ts");
  assert.match(route, /releaseExpiredReservations/);
  assert.match(route, /await releaseExpiredReservations\(env\.DB/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("lifecycle scheduling applies a seven-day recovery window", async () => {
  const { recoveryDeadline } = await import("../app/account-lifecycle.ts");
  assert.equal(
    recoveryDeadline(new Date("2026-08-12T08:00:00.000Z")),
    "2026-08-19T08:00:00.000Z",
  );
});

test("lifecycle blockers expose a useful customer route and message", async () => {
  const { publicBlockerMessage } = await import("../app/account-lifecycle.ts");
  assert.deepEqual(
    publicBlockerMessage({ code: "active_seller_store", count: 1, route: "/seller/settings" }),
    {
      code: "active_seller_store",
      count: 1,
      route: "/seller/settings",
      message: "Close your seller store before deleting your StylishMe account.",
    },
  );
});

test("the lifecycle migration stores recoverable seller closures", async () => {
  const migration = await readFile(new URL("../drizzle/0012_account_lifecycle.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE `seller_store_closure_requests`/);
  assert.match(migration, /previous_product_statuses_json/);
  assert.match(migration, /scheduled_for/);
  assert.match(migration, /cancelled_at/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../drizzle/0007_production_commerce.sql", import.meta.url);
const schemaUrl = new URL("../db/schema.ts", import.meta.url);

const requiredTables = [
  "catalog_products",
  "inventory_variants",
  "inventory_reservations",
  "commerce_orders",
  "commerce_order_items",
  "seller_orders",
  "payment_attempts",
  "refunds",
  "ledger_entries",
  "payout_batches",
  "shipments",
  "shipment_events",
  "auth_identities",
  "auth_action_tokens",
  "account_deletion_requests",
];

test("production commerce migration creates every normalized table", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  for (const table of requiredTables) {
    assert.match(migration, new RegExp(`CREATE TABLE [` + "`\"" + `]?${table}[` + "`\"" + `]?`, "i"), `missing ${table}`);
  }
});

test("money, inventory, idempotency and expiry constraints are explicit", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  for (const column of ["price_cents", "subtotal_cents", "delivery_cents", "total_cents", "unit_price_cents", "line_total_cents", "amount_cents"]) {
    assert.match(migration, new RegExp(`[` + "`\"" + `]?${column}[` + "`\"" + `]?\\s+integer`, "i"), `${column} must use integer cents`);
  }

  assert.match(migration, /CHECK\s*\(\s*`?available_quantity`?\s*>=\s*0\s*\)/i);
  assert.match(migration, /CHECK\s*\(\s*`?reserved_quantity`?\s*>=\s*0\s*\)/i);
  assert.match(migration, /CHECK\s*\(\s*`?reserved_quantity`?\s*<=\s*`?available_quantity`?\s*\)/i);
  assert.match(migration, /UNIQUE\s*\(\s*`?idempotency_key`?\s*\)/i);
  assert.match(migration, /inventory_reservations_expires_at_idx/i);
  assert.match(migration, /auth_action_tokens_expiry_idx/i);
});

test("orders, sellers and immutable ledger records keep relational links", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /REFERENCES\s+`?catalog_products`?\s*\(\s*`?id`?\s*\)/i);
  assert.match(migration, /REFERENCES\s+`?inventory_variants`?\s*\(\s*`?id`?\s*\)/i);
  assert.match(migration, /REFERENCES\s+`?commerce_orders`?\s*\(\s*`?id`?\s*\)/i);
  assert.match(migration, /REFERENCES\s+`?seller_orders`?\s*\(\s*`?id`?\s*\)/i);
  assert.match(migration, /ledger_entries.*source_type.*source_id/is);
  assert.doesNotMatch(migration, /ON\s+DELETE\s+CASCADE[\s\S]{0,200}ledger_entries/i);
});

test("the typed schema exports every production commerce table", async () => {
  const schema = await readFile(schemaUrl, "utf8");

  const requiredExports = [
    "catalogProducts",
    "inventoryVariants",
    "inventoryReservations",
    "commerceOrders",
    "commerceOrderItems",
    "sellerOrders",
    "paymentAttempts",
    "refunds",
    "ledgerEntries",
    "payoutBatches",
    "shipments",
    "shipmentEvents",
    "authIdentities",
    "authActionTokens",
    "accountDeletionRequests",
  ];

  for (const exportName of requiredExports) {
    assert.match(schema, new RegExp(`export const ${exportName}\\s*=`), `missing ${exportName}`);
  }
});

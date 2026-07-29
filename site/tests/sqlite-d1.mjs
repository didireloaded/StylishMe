import { DatabaseSync } from "node:sqlite";

class BoundStatement {
  constructor(database, sql, args = []) {
    this.database = database;
    this.sql = sql;
    this.args = args;
  }

  bind(...args) { return new BoundStatement(this.database, this.sql, args); }
  async first() { return this.database.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.database.prepare(this.sql).all(...this.args) }; }
  async run() {
    const result = this.database.prepare(this.sql).run(...this.args);
    return { success: true, meta: { changes: Number(result.changes ?? 0) } };
  }
}

export class SqliteD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    this.database.exec("PRAGMA foreign_keys = ON");
  }

  prepare(sql) { return new BoundStatement(this.database, sql); }
  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
  close() { this.database.close(); }
}

export function createCommerceTables(db) {
  db.database.exec(`
    CREATE TABLE customer_state (
      email TEXT PRIMARY KEY, cart_json TEXT NOT NULL DEFAULT '[]', wishlist_json TEXT NOT NULL DEFAULT '[]',
      orders_json TEXT NOT NULL DEFAULT '[]', profile_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL
    );
    CREATE TABLE seller_state (
      invite_token TEXT PRIMARY KEY, owner_email TEXT UNIQUE, approved INTEGER NOT NULL,
      store_name TEXT NOT NULL, state_json TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE catalog_products (
      id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, store_slug TEXT NOT NULL, product_slug TEXT NOT NULL,
      name TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, currency TEXT NOT NULL,
      price_cents INTEGER NOT NULL, status TEXT NOT NULL, image_url TEXT NOT NULL, metadata_json TEXT NOT NULL,
      published_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE inventory_variants (
      id TEXT PRIMARY KEY, product_id TEXT NOT NULL, size TEXT NOT NULL, colour TEXT NOT NULL, sku TEXT,
      available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
      reserved_quantity INTEGER NOT NULL CHECK (reserved_quantity >= 0) CHECK (reserved_quantity <= available_quantity),
      version INTEGER NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE commerce_orders (
      id TEXT PRIMARY KEY, customer_email TEXT, idempotency_key TEXT NOT NULL UNIQUE, currency TEXT NOT NULL,
      subtotal_cents INTEGER NOT NULL, delivery_cents INTEGER NOT NULL, total_cents INTEGER NOT NULL,
      status TEXT NOT NULL, payment_status TEXT NOT NULL, fulfilment_method TEXT NOT NULL,
      address_snapshot_json TEXT, collection_point_id TEXT, reservation_expires_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE seller_orders (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL, seller_id TEXT NOT NULL, subtotal_cents INTEGER NOT NULL,
      commission_cents INTEGER NOT NULL, seller_net_cents INTEGER NOT NULL, status TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(order_id, seller_id)
    );
    CREATE TABLE commerce_order_items (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL, seller_order_id TEXT NOT NULL, seller_id TEXT NOT NULL,
      product_id TEXT NOT NULL, variant_id TEXT NOT NULL, product_name_snapshot TEXT NOT NULL,
      seller_name_snapshot TEXT NOT NULL, variant_snapshot_json TEXT NOT NULL, unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL, line_total_cents INTEGER NOT NULL
    );
    CREATE TABLE inventory_reservations (
      id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, order_id TEXT NOT NULL, variant_id TEXT NOT NULL,
      quantity INTEGER NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
  `);
}

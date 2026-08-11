import type { D1DatabaseLike } from "./inventory-reservations";
import { recoveryDeadline, type AccountLifecycleBlocker, type LifecycleEligibility } from "./account-lifecycle";

type MediaStore = { delete: (key: string) => Promise<unknown> };

export async function checkAccountDeletionEligibility(db: D1DatabaseLike, email: string): Promise<LifecycleEligibility> {
  const normalized = email.trim().toLowerCase();
  const [store, orders] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS count FROM seller_state WHERE owner_email = ? AND approved = 1").bind(normalized).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM commerce_orders WHERE customer_email = ? AND status NOT IN ('completed', 'cancelled', 'refunded')").bind(normalized).first<{ count: number }>(),
  ]);
  const blockers: AccountLifecycleBlocker[] = [];
  if (Number(store?.count ?? 0)) blockers.push({ code: "active_seller_store", count: Number(store?.count), route: "/seller/settings" });
  if (Number(orders?.count ?? 0)) blockers.push({ code: "active_order", count: Number(orders?.count), route: "/orders" });
  return blockers.length ? { allowed: false, blockers } : { allowed: true, blockers: [] };
}

export async function scheduleAccountDeletion(db: D1DatabaseLike, email: string, now = new Date()) {
  const normalized = email.trim().toLowerCase();
  const eligibility = await checkAccountDeletionEligibility(db, normalized);
  if (!eligibility.allowed) throw new Error("Resolve account obligations before deleting your account");
  const scheduledFor = recoveryDeadline(now);
  const requestedAt = now.toISOString();
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO account_deletion_requests (id, account_email, status, requested_at, scheduled_for, completed_at)
      VALUES (?, ?, 'pending', ?, ?, NULL)
      ON CONFLICT(account_email, status) DO UPDATE SET requested_at = excluded.requested_at, scheduled_for = excluded.scheduled_for, completed_at = NULL`)
      .bind(id, normalized, requestedAt, scheduledFor),
    db.prepare("DELETE FROM auth_sessions WHERE email = ?").bind(normalized),
  ]);
  return { scheduledFor };
}

export async function cancelAccountDeletion(db: D1DatabaseLike, email: string) {
  await db.prepare("UPDATE account_deletion_requests SET status = 'cancelled' WHERE account_email = ? AND status = 'pending'")
    .bind(email.trim().toLowerCase()).run();
  const row = await db.prepare("SELECT status FROM account_deletion_requests WHERE account_email = ? ORDER BY requested_at DESC LIMIT 1")
    .bind(email.trim().toLowerCase()).first<{ status: string }>();
  return row?.status === "cancelled";
}

export async function pendingAccountDeletion(db: D1DatabaseLike, email: string) {
  return db.prepare("SELECT scheduled_for FROM account_deletion_requests WHERE account_email = ? AND status = 'pending' LIMIT 1")
    .bind(email.trim().toLowerCase()).first<{ scheduled_for: string }>();
}

export async function processDueAccountDeletions(db: D1DatabaseLike, media: MediaStore, now = new Date(), beforeDelete?: (email: string) => Promise<void>) {
  const due = await db.prepare(`SELECT d.account_email, a.avatar_key FROM account_deletion_requests d
    JOIN auth_accounts a ON a.email = d.account_email WHERE d.status = 'pending' AND d.scheduled_for <= ? LIMIT 25`)
    .bind(now.toISOString()).all<{ account_email: string; avatar_key: string }>();
  let processed = 0; let failed = 0;
  for (const account of due.results ?? []) {
    try {
      await beforeDelete?.(account.account_email);
      const stories = await db.prepare("SELECT id, image_key FROM customer_outfit_stories WHERE owner_email = ?")
        .bind(account.account_email).all<{ id: string; image_key: string }>();
      const mediaKeys = [account.avatar_key, ...(stories.results ?? []).map(story => story.image_key)].filter(Boolean);
      await Promise.all(mediaKeys.map(key => media.delete(key)));
      await db.batch([
        db.prepare("DELETE FROM customer_outfit_story_products WHERE story_id IN (SELECT id FROM customer_outfit_stories WHERE owner_email = ?)").bind(account.account_email),
        db.prepare("DELETE FROM customer_outfit_story_likes WHERE story_id IN (SELECT id FROM customer_outfit_stories WHERE owner_email = ?)").bind(account.account_email),
        db.prepare("DELETE FROM customer_outfit_story_reports WHERE story_id IN (SELECT id FROM customer_outfit_stories WHERE owner_email = ?)").bind(account.account_email),
        db.prepare("DELETE FROM customer_outfit_stories WHERE owner_email = ?").bind(account.account_email),
        db.prepare("DELETE FROM customer_state WHERE email = ?").bind(account.account_email),
        db.prepare("DELETE FROM try_on_usage WHERE email = ?").bind(account.account_email),
        db.prepare("UPDATE catalog_products SET status = 'archived', updated_at = ? WHERE seller_id IN (SELECT invite_token FROM seller_state WHERE owner_email = ?)").bind(now.toISOString(), account.account_email),
        db.prepare("UPDATE seller_state SET owner_email = NULL, approved = 0, state_json = '{}', updated_at = ? WHERE owner_email = ?").bind(now.toISOString(), account.account_email),
        db.prepare("UPDATE commerce_orders SET customer_email = NULL WHERE customer_email = ?").bind(account.account_email),
        db.prepare("DELETE FROM auth_sessions WHERE email = ?").bind(account.account_email),
        db.prepare("DELETE FROM auth_provider_credentials WHERE identity_id IN (SELECT id FROM auth_identities WHERE account_email = ?)").bind(account.account_email),
        db.prepare("DELETE FROM auth_identities WHERE account_email = ?").bind(account.account_email),
        db.prepare("DELETE FROM auth_action_tokens WHERE account_email = ?").bind(account.account_email),
        db.prepare("DELETE FROM seller_store_closure_requests WHERE account_email = ?").bind(account.account_email),
        db.prepare("DELETE FROM account_deletion_requests WHERE account_email = ?").bind(account.account_email),
        db.prepare("DELETE FROM auth_accounts WHERE email = ?").bind(account.account_email),
      ]);
      processed += 1;
    } catch { failed += 1; }
  }
  return { processed, failed };
}

export const ACCOUNT_RECOVERY_DAYS = 7;

export type AccountLifecycleBlocker = {
  code: "active_seller_store" | "active_order" | "open_return" | "pending_refund" | "reserved_stock" | "uncollected_order";
  count: number;
  route: string;
};

export type LifecycleEligibility =
  | { allowed: true; blockers: [] }
  | { allowed: false; blockers: AccountLifecycleBlocker[] };

const blockerMessages: Record<AccountLifecycleBlocker["code"], string> = {
  active_seller_store: "Close your seller store before deleting your StylishMe account.",
  active_order: "Complete your active orders before continuing.",
  open_return: "Resolve your open returns before continuing.",
  pending_refund: "Wait for pending refunds to finish before continuing.",
  reserved_stock: "Resolve active stock reservations before closing your store.",
  uncollected_order: "Complete outstanding collections before continuing.",
};

export function recoveryDeadline(now = new Date()) {
  return new Date(now.getTime() + ACCOUNT_RECOVERY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function publicBlockerMessage(blocker: AccountLifecycleBlocker) {
  return { ...blocker, message: blockerMessages[blocker.code] };
}

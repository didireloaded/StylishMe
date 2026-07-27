type ShoppingLine = { productId: string; size: string; color: string; quantity: number };
type ShoppingState = { cart?: ShoppingLine[]; wishlist?: string[] };

export function mergeGuestShoppingState(account: ShoppingState, guest: ShoppingState) {
  const cart = (account.cart ?? []).map(line => ({ ...line }));
  for (const line of guest.cart ?? []) {
    if (!line || typeof line.productId !== "string" || typeof line.size !== "string" || typeof line.color !== "string") continue;
    const quantity = Math.max(0, Math.floor(Number(line.quantity) || 0));
    const match = cart.find(item => item.productId === line.productId && item.size === line.size && item.color === line.color);
    if (match) match.quantity += quantity;
    else if (quantity) cart.push({ ...line, quantity });
  }
  return {
    cart,
    wishlist: [...new Set([...(account.wishlist ?? []), ...(guest.wishlist ?? [])])],
  };
}

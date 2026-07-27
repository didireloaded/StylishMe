"use client";

import { useEffect, useMemo, useState } from "react";

type View = "overview" | "customers" | "sellers" | "orders" | "products" | "collections" | "revenue" | "payouts" | "promotions" | "reports" | "traffic" | "reviews" | "support" | "notifications" | "staff" | "settings";
type Seller = { storeName: string; type: string; city: string; approved: boolean; products: number; liveProducts: number; stock: number; lowStock: number; orderValue: number; orders: number; updatedAt: string };
type Order = { id: string; date: string; status: string; total: number; fulfilment: string; itemCount: number; city: string; sellerNames: string[] };
type ProductSignal = { id: string; name: string; seller: string; views: number; saves: number; cartAdds: number; interest: number };
type Feed = {
  generatedAt: string;
  privacy: { message: string; excludes: string[] };
  metrics: Record<string, number>;
  analytics: {
    daily: Array<{ date: string; visits: number; signups: number; orders: number; productViews: number; cartAdds: number; errors: number }>;
    sources: Array<{ source: string; events: number }>;
    funnel: Array<{ label: string; value: number }>;
    customerStories: { published: number; views: number; likes: number; unlikes: number; shares: number; reports: number };
    topProducts: ProductSignal[];
    activityByCity: Array<{ city: string; customers: number }>;
  };
  customerSegments: { registeredCustomers: number; purchasingCustomers: number; repeatPurchasers: number; abandonedCarts: number; wishlistOnly: number };
  revenueSummary: { recordedOrderValue: number; cancelledOrderValue: number; averageOrderValue: number; paymentProviderConnected: boolean; platformRevenueAvailable: boolean };
  fulfilment: { delivery: number; collection: number };
  alerts: { pendingSellers: number; lowStockProducts: number; ordersToPrepare: number };
  sellers: Seller[];
  orders: Order[];
  activity: Array<{ id: string; event: string; actorKind: string; createdAt: string }>;
};

const EMPTY: Feed = {
  generatedAt: "", privacy: { message: "Private information is intentionally excluded.", excludes: [] }, metrics: {},
  analytics: { daily: [], sources: [], funnel: [], customerStories: { published: 0, views: 0, likes: 0, unlikes: 0, shares: 0, reports: 0 }, topProducts: [], activityByCity: [] },
  customerSegments: { registeredCustomers: 0, purchasingCustomers: 0, repeatPurchasers: 0, abandonedCarts: 0, wishlistOnly: 0 },
  revenueSummary: { recordedOrderValue: 0, cancelledOrderValue: 0, averageOrderValue: 0, paymentProviderConnected: false, platformRevenueAvailable: false },
  fulfilment: { delivery: 0, collection: 0 }, alerts: { pendingSellers: 0, lowStockProducts: 0, ordersToPrepare: 0 }, sellers: [], orders: [], activity: [],
};

const nav: Array<{ label: string; items: Array<[View, string]> }> = [
  { label: "MARKETPLACE", items: [["overview", "Overview"], ["customers", "Customers"], ["sellers", "Sellers"], ["orders", "Orders"], ["products", "Products"], ["collections", "Collections"]] },
  { label: "BUSINESS", items: [["revenue", "Revenue"], ["payouts", "Payouts"], ["promotions", "Promotions"], ["reports", "Reports"]] },
  { label: "EXPERIENCE", items: [["traffic", "Traffic & Discovery"], ["reviews", "Reviews"], ["support", "Support"], ["notifications", "Notifications"]] },
  { label: "MANAGEMENT", items: [["staff", "Staff"], ["settings", "Settings"]] },
];

const titles: Record<View, [string, string]> = {
  overview: ["Marketplace overview", "Monitor the signals that need an owner decision."], customers: ["Customers", "Privacy-safe shopping and retention patterns."], sellers: ["Sellers", "Store health, stock and marketplace contribution."], orders: ["Orders", "Delivery and collection activity across every seller."], products: ["Products", "Catalogue health and customer interest."], collections: ["Collections", "Curated customer merchandising."], revenue: ["Revenue", "Recorded order value, clearly separated from verified payments."], payouts: ["Payouts", "Seller settlement readiness."], promotions: ["Promotions", "Marketplace-funded and seller-funded offers."], reports: ["Reports", "Privacy-safe operational exports."], traffic: ["Traffic & Discovery", "Acquisition, shopping funnel and city activity."], reviews: ["Reviews", "Marketplace feedback signals."], support: ["Support", "Customer and seller case oversight."], notifications: ["Notifications", "Operational alerts that require attention."], staff: ["Staff", "Owner access and future team permissions."], settings: ["Settings", "Marketplace controls and privacy boundaries."],
};

const money = (value = 0) => `N$${Math.round(value).toLocaleString("en-NA")}`;
const pct = (part = 0, total = 0) => total ? `${Math.round(part / total * 100)}%` : "0%";
const relative = (value: string) => { const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000)); return minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`; };
const labelEvent = (value: string) => value.replaceAll("_", " ").replace(/^./, character => character.toUpperCase());

function Metric({ label, value, note, alert = false }: { label: string; value: string | number; note: string; alert?: boolean }) {
  return <article className={`metric-card ${alert ? "alert" : ""}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
function Blank({ title, copy }: { title: string; copy: string }) {
  return <section className="blank panel"><span className="blank-mark">SM</span><div><h3>{title}</h3><p>{copy}</p></div></section>;
}
function Bars({ rows, max }: { rows: Array<{ date: string; visits: number; orders: number }>; max: number }) {
  return <div className="bars">{rows.map(row => <div key={row.date}><div className="bar-stack"><i style={{ height: `${Math.max(4, row.visits / max * 100)}%` }} /><b style={{ height: `${Math.max(2, row.orders / max * 100)}%` }} /></div><small>{new Date(row.date).toLocaleDateString("en-NA", { day: "numeric", month: "short" })}</small></div>)}</div>;
}

export default function AdminDashboard({ operatorName }: { operatorName: string }) {
  const [view, setView] = useState<View>("overview");
  const [feed, setFeed] = useState<Feed>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("30");
  const [location, setLocation] = useState("all");
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false);

  const refresh = async () => {
    setError("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const body = await response.json() as Feed & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to load business data");
      setFeed(body);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load business data"); }
    finally { setLoading(false); }
  };
  useEffect(() => { const first = window.setTimeout(() => void refresh(), 0); const timer = window.setInterval(() => void refresh(), 60000); return () => { clearTimeout(first); clearInterval(timer); }; }, []);

  const days = useMemo(() => feed.analytics.daily.slice(-Number(range)), [feed.analytics.daily, range]);
  const maxActivity = Math.max(1, ...days.map(day => Math.max(day.visits, day.orders)));
  const locations = useMemo(() => ["all", ...new Set([...feed.analytics.activityByCity.map(row => row.city), ...feed.sellers.map(item => item.city)])], [feed]);
  const visibleOrders = useMemo(() => feed.orders.filter(order => location === "all" || order.city === location), [feed.orders, location]);
  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return [
      ...feed.sellers.filter(item => `${item.storeName} ${item.type} ${item.city}`.toLowerCase().includes(needle)).map(item => ({ kind: "Seller", title: item.storeName, detail: `${item.type} · ${item.city}`, target: "sellers" as View })),
      ...feed.orders.filter(item => `${item.id} ${item.status} ${item.sellerNames.join(" ")}`.toLowerCase().includes(needle)).map(item => ({ kind: "Order", title: item.id, detail: `${item.status} · ${money(item.total)}`, target: "orders" as View })),
      ...feed.analytics.topProducts.filter(item => `${item.name} ${item.seller}`.toLowerCase().includes(needle)).map(item => ({ kind: "Product", title: item.name, detail: item.seller, target: "products" as View })),
    ].slice(0, 8);
  }, [feed, query]);
  const go = (next: View) => { setView(next); setDrawer(false); setQuery(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const download = () => { const rows = [["Order", "Date", "Status", "Fulfilment", "Town", "Sellers", "Recorded value"], ...visibleOrders.map(order => [order.id, order.date, order.status, order.fulfilment, order.city, order.sellerNames.join(" | "), order.total])]; const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n"); const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); anchor.download = `stylishme-orders-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(anchor.href); };

  let content: React.ReactNode;
  if (view === "overview") content = <>
    <section className="metric-strip">
      <Metric label="RECORDED ORDER VALUE" value={money(feed.revenueSummary.recordedOrderValue)} note="Payment provider not connected" />
      <Metric label="ORDERS" value={feed.metrics.orders ?? 0} note={`${feed.metrics.activeOrders ?? 0} still active`} />
      <Metric label="CUSTOMERS" value={feed.customerSegments.registeredCustomers} note={`${feed.customerSegments.purchasingCustomers} purchasers`} />
      <Metric label="ACTIVE SELLERS" value={feed.metrics.approvedSellers ?? 0} note={`${feed.metrics.sellers ?? 0} seller records`} />
      <Metric label="CHECKOUT CONVERSION" value={`${feed.metrics.checkoutConversion ?? 0}%`} note="Starts that became orders" />
    </section>
    <section className="dashboard-grid">
      <article className="panel trend-panel"><header><div><span>PERFORMANCE</span><h3>Visits and orders</h3></div><div className="legend"><i />Visits <b />Orders</div></header><Bars rows={days} max={maxActivity} /></article>
      <article className="panel funnel-panel"><header><div><span>CUSTOMER JOURNEY</span><h3>Shopping funnel</h3></div></header>{feed.analytics.funnel.map((item, index) => <div className="funnel-row" key={item.label}><span>{item.label}</span><i><b style={{ width: `${item.value / Math.max(1, feed.analytics.funnel[0]?.value ?? 1) * 100}%` }} /></i><strong>{item.value}</strong><small>{index ? pct(item.value, feed.analytics.funnel[index - 1].value) : "100%"}</small></div>)}</article>
      <article className="panel attention"><header><div><span>NEEDS ATTENTION</span><h3>Operational queue</h3></div></header><button onClick={() => go("orders")}><i className="danger"/><div><strong>{feed.alerts.ordersToPrepare} orders need progress</strong><small>Open delivery and collection work</small></div><b>→</b></button><button onClick={() => go("products")}><i className="warning"/><div><strong>{feed.alerts.lowStockProducts} low-stock products</strong><small>Automatic quality validation remains active</small></div><b>→</b></button><button onClick={() => go("traffic")}><i className="info"/><div><strong>{feed.metrics.errors ?? 0} application errors</strong><small>Privacy-safe system signal</small></div><b>→</b></button></article>
      <article className="panel ranked"><header><div><span>SELLER PERFORMANCE</span><h3>Top sellers</h3></div><button onClick={() => go("sellers")}>View all</button></header>{feed.sellers.slice().sort((a,b) => b.orderValue - a.orderValue).slice(0,5).map((seller, index) => <div key={seller.storeName}><b>{index + 1}</b><span><strong>{seller.storeName}</strong><small>{seller.orders} orders · {seller.city}</small></span><em>{money(seller.orderValue)}</em></div>)}{!feed.sellers.length && <p className="no-data">No seller activity recorded.</p>}</article>
      <article className="panel ranked"><header><div><span>PRODUCT INTEREST</span><h3>Top products</h3></div><button onClick={() => go("products")}>View all</button></header>{feed.analytics.topProducts.slice(0,5).map((product, index) => <div key={product.id}><b>{index + 1}</b><span><strong>{product.name}</strong><small>{product.seller} · {product.views} views</small></span><em>{product.cartAdds} carts</em></div>)}{!feed.analytics.topProducts.length && <p className="no-data">Product interest will appear after real shopping activity.</p>}</article>
      <article className="panel city-panel"><header><div><span>MARKETPLACE MIX</span><h3>Activity by city</h3></div></header>{feed.analytics.activityByCity.slice(0,6).map(item => <div key={item.city}><span>{item.city}</span><i><b style={{ width: `${item.customers / Math.max(1, feed.analytics.activityByCity[0]?.customers ?? 1) * 100}%` }} /></i><strong>{item.customers}</strong></div>)}</article>
      <article className="panel activity-panel"><header><div><span>LIVE MARKETPLACE</span><h3>Recent activity</h3></div></header>{feed.activity.slice(0,7).map(item => <div key={item.id}><i/><span><strong>{labelEvent(item.event)}</strong><small>{item.actorKind}</small></span><time>{relative(item.createdAt)}</time></div>)}{!feed.activity.length && <p className="no-data">No marketplace activity recorded.</p>}</article>
    </section>
  </>;
  else if (view === "customers") content = <><section className="metric-strip four"><Metric label="REGISTERED" value={feed.customerSegments.registeredCustomers} note="Customer accounts"/><Metric label="PURCHASERS" value={feed.customerSegments.purchasingCustomers} note={pct(feed.customerSegments.purchasingCustomers, feed.customerSegments.registeredCustomers)}/><Metric label="REPEAT" value={feed.customerSegments.repeatPurchasers} note="More than one order"/><Metric label="SAVED ONLY" value={feed.customerSegments.wishlistOnly} note="Saved products, no order"/></section><section className="privacy-card"><span>PRIVATE BY DESIGN</span><h3>Patterns, not private profiles.</h3><p>{feed.privacy.message} Names, contact details and individual browsing histories stay outside this analytics workspace.</p></section></>;
  else if (view === "sellers") content = <section className="panel data-table"><div className="table-header sellers"><span>Seller</span><span>Status</span><span>Products</span><span>Stock</span><span>Orders</span><span>Recorded value</span></div>{feed.sellers.map(seller => <article className="table-row sellers" key={seller.storeName}><div><strong>{seller.storeName}</strong><small>{seller.type} · {seller.city}</small></div><span className={seller.approved ? "status live" : "status held"}>{seller.approved ? "Active" : "Paused"}</span><span>{seller.liveProducts} / {seller.products}</span><span>{seller.stock}<small>{seller.lowStock} low</small></span><span>{seller.orders}</span><b>{money(seller.orderValue)}</b></article>)}{!feed.sellers.length && <Blank title="No sellers yet" copy="Seller organisations will appear after they create a store."/>}</section>;
  else if (view === "orders") content = <section className="panel data-table"><div className="table-header orders"><span>Order</span><span>Seller</span><span>Fulfilment</span><span>Status</span><span>Items</span><span>Value</span></div>{visibleOrders.map(order => <article className="table-row orders" key={order.id}><div><strong>{order.id}</strong><small>{order.date || "Date unavailable"}</small></div><span>{order.sellerNames.join(", ") || "Seller unavailable"}</span><span>{order.fulfilment}</span><span className="status neutral">{order.status}</span><span>{order.itemCount}</span><b>{money(order.total)}</b></article>)}{!visibleOrders.length && <Blank title="No recorded orders" copy="Orders matching this location will appear here."/>}</section>;
  else if (view === "products") content = <><section className="metric-strip four"><Metric label="PRODUCTS" value={feed.metrics.products ?? 0} note="Seller catalogue records"/><Metric label="LOW STOCK" value={feed.alerts.lowStockProducts} note="Needs seller action" alert/><Metric label="PRODUCT VIEWS" value={feed.analytics.funnel.find(item => item.label === "Product views")?.value ?? 0} note="Recorded views"/><Metric label="CART ADDITIONS" value={feed.analytics.funnel.find(item => item.label === "Cart additions")?.value ?? 0} note="Recorded intent"/></section><section className="panel data-table"><div className="table-header products"><span>Product</span><span>Seller</span><span>Views</span><span>Saves</span><span>Cart adds</span></div>{feed.analytics.topProducts.map(product => <article className="table-row products" key={product.id}><div><strong>{product.name}</strong><small>{product.id}</small></div><span>{product.seller}</span><span>{product.views}</span><span>{product.saves}</span><b>{product.cartAdds}</b></article>)}{!feed.analytics.topProducts.length && <Blank title="No product activity yet" copy="Automatic quality validation publishes complete, safe, in-stock listings. No manual listing approval queue."/>}</section></>;
  else if (view === "revenue") content = <><section className="metric-strip four"><Metric label="RECORDED ORDER VALUE" value={money(feed.revenueSummary.recordedOrderValue)} note="Cancelled orders excluded"/><Metric label="AVERAGE ORDER" value={money(feed.revenueSummary.averageOrderValue)} note="Recorded order value"/><Metric label="CANCELLED VALUE" value={money(feed.revenueSummary.cancelledOrderValue)} note="Excluded from total"/><Metric label="PLATFORM REVENUE" value="Unavailable" note="Commission accounting not connected"/></section><section className="truth-card"><span>FINANCIAL TRUTH</span><h3>Payment provider not connected.</h3><p>Paid sales, fees, refunds and payouts will remain unavailable until verified settlement records and commission rules are connected.</p></section></>;
  else if (view === "traffic") content = <section className="two-column"><article className="panel funnel-panel"><header><div><span>ACQUISITION</span><h3>Traffic sources</h3></div></header>{feed.analytics.sources.map(item => <div className="funnel-row" key={item.source}><span>{item.source}</span><i><b style={{ width: `${item.events / Math.max(1, feed.analytics.sources[0]?.events ?? 1) * 100}%` }}/></i><strong>{item.events}</strong></div>)}</article><article className="panel story-metrics"><header><div><span>OUTFIT STORIES</span><h3>Community shopping signal</h3></div></header>{Object.entries(feed.analytics.customerStories).filter(([key]) => key !== "unlikes").map(([key,value]) => <div key={key}><span>{labelEvent(key)}</span><strong>{value}</strong></div>)}</article></section>;
  else if (view === "reports") content = <section className="action-card"><span>PRIVACY-SAFE EXPORT</span><h3>Download the current order record.</h3><p>The export follows the location filter and excludes names, contact details, addresses, payment details and private images.</p><button onClick={download}>Download report</button></section>;
  else if (view === "collections") content = <Blank title="Collection management needs a shared publishing source" copy="The customer catalogue currently has no owner-editable collection records. This control will only be enabled when changes can safely publish to the storefront and be tracked end to end."/>;
  else if (view === "payouts") content = <Blank title="Payouts are not connected" copy="Verified payments, commission rules, refunds and seller settlements are required before payout balances can be shown truthfully."/>;
  else if (view === "promotions") content = <Blank title="Promotion controls are not connected" copy="A shared promotion record and checkout discount engine are required before offers can be safely published."/>;
  else if (view === "reviews") content = <Blank title="Review reporting is not connected" copy="No verified review source is available, so ratings and moderation counts are intentionally not invented."/>;
  else if (view === "support") content = <Blank title="Support cases are not connected" copy="A shared customer and seller support source is required before case queues and response times can appear here."/>;
  else if (view === "notifications") content = <section className="panel notice-list"><header><div><span>OPERATIONAL ALERTS</span><h3>Current signals</h3></div></header><button onClick={() => go("orders")}><span>Orders needing progress</span><strong>{feed.alerts.ordersToPrepare}</strong></button><button onClick={() => go("products")}><span>Low-stock products</span><strong>{feed.alerts.lowStockProducts}</strong></button><button onClick={() => go("traffic")}><span>Application errors</span><strong>{feed.metrics.errors ?? 0}</strong></button></section>;
  else if (view === "staff") content = <Blank title="Owner-only access" copy={`${operatorName} is the only active owner workspace. Role-scoped staff access will be added only with audited permissions.`}/>;
  else content = <section className="settings-grid"><article className="panel"><span>LISTING POLICY</span><h3>Automatic quality validation</h3><p>Complete, safe and in-stock listings may publish automatically. The owner can monitor marketplace health without a routine approval queue.</p></article><article className="panel"><span>ANALYTICS PRIVACY</span><h3>Private information stays out</h3><p>{feed.privacy.excludes.join(", ") || "Personal and payment information"} are excluded from this workspace.</p></article></section>;

  return <main className="admin-shell">
    <button className={`sidebar-backdrop ${drawer ? "show" : ""}`} aria-label="Close navigation" onClick={() => setDrawer(false)} />
    <aside className={`sidebar ${drawer ? "open" : ""}`}>
      <button className="brand" onClick={() => go("overview")}><strong>STYLISHME</strong><span>ADMIN</span></button>
      <nav>{nav.map(group => <section key={group.label}><small>{group.label}</small>{group.items.map(([target,label]) => <button key={target} className={view === target ? "active" : ""} onClick={() => go(target)}><i>{label.slice(0,1)}</i><span>{label}</span>{target === "orders" && feed.alerts.ordersToPrepare > 0 ? <b>{feed.alerts.ordersToPrepare}</b> : null}</button>)}</section>)}</nav>
      <div className="owner"><span>{operatorName.slice(0,1).toUpperCase()}</span><div><strong>{operatorName}</strong><small>Marketplace owner</small></div><a href="/signout-with-chatgpt?return_to=/" aria-label="Sign out">↗</a></div>
    </aside>
    <section className="workspace">
      <header className="command-bar">
        <button className="menu-button" aria-label="Open navigation" onClick={() => setDrawer(true)}>☰</button>
        <label className="global-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search sellers, products or orders..." aria-label="Global search" />{query ? <button aria-label="Clear search" onClick={() => setQuery("")}>×</button> : null}<div className={`search-results ${searchResults.length ? "show" : ""}`}>{searchResults.map(result => <button key={`${result.kind}-${result.title}`} onClick={() => go(result.target)}><span>{result.kind}</span><strong>{result.title}</strong><small>{result.detail}</small></button>)}</div></label>
        <div className="command-actions"><select value={range} onChange={event => setRange(event.target.value)} aria-label="Date range"><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select><select value={location} onChange={event => setLocation(event.target.value)} aria-label="Marketplace location"><option value="all">All locations</option>{locations.slice(1).map(city => <option key={city}>{city}</option>)}</select><button className="icon-button" aria-label="Notifications" onClick={() => go("notifications")}>●</button><button className="quick-button" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing" : "Refresh data"}</button></div>
      </header>
      <div className="page-heading"><div><small>STYLISHME ADMIN / {titles[view][0].toUpperCase()}</small><h1>{titles[view][0]}</h1><p>{titles[view][1]}</p></div><div className="freshness"><i/><span>{feed.generatedAt ? `Updated ${relative(feed.generatedAt)}` : "Connecting to marketplace"}</span></div></div>
      {error ? <div className="error"><div><strong>Marketplace connection paused</strong><span>{error}</span></div><button onClick={() => void refresh()}>Try again</button></div> : null}
      <div className="content">{content}</div>
      <footer><span>Private StylishMe marketplace command centre</span><small>Personal data and private images excluded</small></footer>
    </section>
  </main>;
}

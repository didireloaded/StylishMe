import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/AdminDashboard.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var EMPTY = {
	generatedAt: "",
	privacy: {
		message: "Private information is intentionally excluded.",
		excludes: []
	},
	metrics: {},
	analytics: {
		daily: [],
		sources: [],
		funnel: []
	},
	fulfilment: {
		delivery: 0,
		collection: 0
	},
	alerts: {
		lowStockProducts: 0,
		ordersToPrepare: 0
	},
	activity: []
};
var nav = [
	[
		"overview",
		"Overview",
		"⌂"
	],
	[
		"acquisition",
		"Acquisition",
		"↗"
	],
	[
		"funnel",
		"Funnel",
		"◇"
	],
	[
		"engagement",
		"Engagement",
		"◎"
	],
	[
		"commerce",
		"Commerce",
		"▤"
	],
	[
		"reliability",
		"Reliability",
		"●"
	]
];
var money = (value = 0) => `N$${Math.round(value).toLocaleString("en-NA")}`;
var relative = (value) => {
	const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 6e4));
	return minutes < 1 ? "Now" : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
};
var copy = {
	page_viewed: "A page was viewed",
	demo_viewed: "The demo was opened",
	role_selected: "A role was selected",
	signup_started: "A signup was started",
	customer_joined: "A customer account was created",
	seller_joined: "A seller account was created",
	product_viewed: "A product was viewed",
	designer_viewed: "A designer was explored",
	outfit_viewed: "A look was opened",
	wishlist_saved: "A piece was saved",
	cart_added: "A piece was added to cart",
	checkout_started: "Checkout was started",
	order_placed: "An order was placed",
	try_on_opened: "A private preview was opened",
	app_error: "An application error occurred",
	seller_updated: "A seller updated their store",
	product_submitted: "A seller published a piece"
};
function Metric({ label, value, note, accent }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: `metric-card ${accent ? "accent" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: label }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: note })
		]
	});
}
function Empty({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "empty-state",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "SM" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Real activity will appear here as the marketplace is used." })
		]
	});
}
function AdminDashboard({ operatorName }) {
	const [view, setView] = (0, import_react.useState)("overview");
	const [feed, setFeed] = (0, import_react.useState)(EMPTY);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)("");
	const refresh = async () => {
		setError("");
		try {
			const response = await fetch("/api/dashboard", { cache: "no-store" });
			const body = await response.json();
			if (!response.ok) throw new Error(body.error ?? "Unable to load analytics");
			setFeed(body);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to load analytics");
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		const initial = window.setTimeout(() => void refresh(), 0);
		const timer = window.setInterval(() => void refresh(), 6e4);
		return () => {
			window.clearTimeout(initial);
			window.clearInterval(timer);
		};
	}, []);
	const maxDaily = Math.max(1, ...feed.analytics.daily.map((day) => day.visits));
	const maxFunnel = Math.max(1, feed.analytics.funnel[0]?.value ?? 1);
	const engagement = (0, import_react.useMemo)(() => feed.activity.filter((event) => [
		"product_viewed",
		"designer_viewed",
		"outfit_viewed",
		"wishlist_saved",
		"cart_added",
		"try_on_opened"
	].includes(event.event)), [feed.activity]);
	const go = (next) => {
		setView(next);
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const titles = {
		overview: "Product health, at a glance.",
		acquisition: "How people find StylishMe.",
		funnel: "From visit to order.",
		engagement: "What people find valuable.",
		commerce: "Marketplace outcomes.",
		reliability: "Errors and operational health.",
		privacy: "Analytics without private lives."
	};
	let content;
	if (view === "overview") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "overview-hero",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "LIVE PRODUCT ANALYTICS" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: feed.metrics.sessions ? `${feed.metrics.sessions} sessions recorded.` : "Ready for truthful product signals." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Understand growth, conversion and reliability without opening customer profiles." })
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hero-number",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Revenue recorded" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(feed.metrics.revenue) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [feed.metrics.orders ?? 0, " orders"] })
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "metrics-grid",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
					label: "VISITORS",
					value: feed.metrics.visitors ?? 0,
					note: `${feed.metrics.sessions ?? 0} sessions`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
					label: "SIGNUPS",
					value: feed.metrics.signups ?? 0,
					note: `${feed.metrics.signupConversion ?? 0}% of attempts`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
					label: "CHECKOUT",
					value: `${feed.metrics.checkoutConversion ?? 0}%`,
					note: `${feed.metrics.checkoutStarts ?? 0} starts`,
					accent: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
					label: "ORDERS",
					value: feed.metrics.orders ?? 0,
					note: money(feed.metrics.revenue)
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "overview-grid",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "panel activity-chart",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "panel-title",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "LAST 14 DAYS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Visits" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Real events only" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bars",
					children: feed.analytics.daily.map((day) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: { height: `${Math.max(6, day.visits / maxDaily * 100)}%` },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: day.visits || "" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: new Date(day.date).toLocaleDateString("en-NA", { weekday: "short" }) })] }, day.date))
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "panel recent-panel",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "panel-title",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "HAPPENING NOW" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Recent signals" })] })
					}),
					feed.activity.slice(0, 6).map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "activity-row",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: copy[event.event] ?? event.event }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: relative(event.createdAt) })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: event.actorKind })
						]
					}, event.id)),
					!feed.activity.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No activity yet" })
				]
			})]
		})
	] });
	else if (view === "acquisition") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "section-lead",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ACQUISITION" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Visits by source." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Only campaign labels and referring hostnames are collected—never full browsing histories." })
		] })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "panel stock-panel",
		children: [feed.analytics.sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: source.source }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Privacy-safe acquisition label" })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "health-bar",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${Math.min(100, source.events / Math.max(1, feed.analytics.sources[0]?.events ?? 1) * 100)}%` } })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: source.events })
		] }, source.source)), !feed.analytics.sources.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No acquisition data yet" })]
	})] });
	else if (view === "funnel") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "section-lead",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "CONVERSION FUNNEL" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Where momentum builds or stops." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Signup and checkout attempts are measured as anonymous product events." })
		] })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "panel stock-panel",
		children: feed.analytics.funnel.map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: step.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [step.value, " recorded"] })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "health-bar",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${step.value / maxFunnel * 100}%` } })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [maxFunnel ? Math.round(step.value / maxFunnel * 100) : 0, "%"] })
		] }, step.label))
	})] });
	else if (view === "engagement") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "metrics-grid",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "PRODUCT VIEWS",
				value: engagement.filter((e) => e.event === "product_viewed").length,
				note: "Catalogue interest"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "SAVED",
				value: feed.metrics.savedPieces ?? 0,
				note: "Wishlist intent"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "CARTS",
				value: feed.metrics.cartsInProgress ?? 0,
				note: "In progress"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "PREVIEWS",
				value: feed.metrics.tryOns ?? 0,
				note: "Images excluded"
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "panel activity-log",
		children: [engagement.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { children: relative(event.createdAt) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: copy[event.event] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: event.targetType ?? "StylishMe" })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: event.actorKind })
		] }, event.id)), !engagement.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No engagement signals yet" })]
	})] });
	else if (view === "commerce") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "metrics-grid",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "ORDERS",
				value: feed.metrics.orders ?? 0,
				note: `${feed.metrics.activeOrders ?? 0} active`,
				accent: true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "REVENUE",
				value: money(feed.metrics.revenue),
				note: "Cancelled excluded"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "DELIVERY",
				value: feed.fulfilment.delivery,
				note: "Trackable timeline"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "COLLECTION",
				value: feed.fulfilment.collection,
				note: "Pickup, no courier map"
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "privacy-hero",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "MARKETPLACE INTEGRITY" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Commerce remains server-authoritative." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Products publish only after deterministic completeness, stock, delivery, return and image checks pass. Payments remain clearly labelled as sandbox until a verified provider is connected." })
		]
	})] });
	else if (view === "reliability") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "metrics-grid",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "ERROR EVENTS",
				value: feed.metrics.errors ?? 0,
				note: "Last captured window",
				accent: true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "LOW STOCK",
				value: feed.alerts.lowStockProducts,
				note: "Needs seller attention"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "ORDERS MOVING",
				value: feed.alerts.ordersToPrepare,
				note: "Active fulfilment"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
				label: "LAST UPDATE",
				value: feed.generatedAt ? relative(feed.generatedAt) : "—",
				note: "Dashboard freshness"
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "privacy-hero",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "TRUTHFUL HEALTH" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "No green lights without evidence." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Empty metrics stay empty. Failed services report an error instead of showing invented charts or fake courier positions." })
		]
	})] });
	else content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "privacy-hero",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "PRIVATE BY DESIGN" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "The dashboard sees the product, not the person." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: feed.privacy.message })
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "privacy-grid",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "VISIBLE" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Aggregated product signals" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: [
				"Visits and sessions",
				"Signup and seller funnels",
				"Campaign labels",
				"Engagement and conversion",
				"Orders and revenue totals",
				"Errors and system health"
			].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: item }, item)) })
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "excluded",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "NEVER VISIBLE HERE" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Private customer information" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: feed.privacy.excludes.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: item }, item)) })
			]
		})]
	})] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "admin-stage",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "side-nav",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "admin-brand",
						onClick: () => go("overview"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "STYLISHME" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "PRODUCT" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { children: nav.map(([target, label, icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: view === target ? "active" : "",
						onClick: () => go(target),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: icon }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
					}, target)) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: `privacy-nav ${view === "privacy" ? "active" : ""}`,
						onClick: () => go("privacy"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "●" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Privacy" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "operator",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: operatorName.slice(0, 1).toUpperCase() }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: operatorName }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Private developer access" })] })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "admin-main",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
						className: "topbar",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: view.toUpperCase() }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: titles[view] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "top-actions",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "live-dot",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Live"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => void refresh(),
									disabled: loading,
									children: loading ? "Refreshing…" : "Refresh"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "/signout-with-chatgpt?return_to=/",
									children: "Sign out"
								})
							]
						})]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "error-banner",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Live analytics paused" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => void refresh(),
								children: "Try again"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "content",
						children: content
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
						className: "admin-footer",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Private StylishMe product analytics" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Personal data excluded by design" })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "mobile-nav",
				children: nav.slice(0, 5).map(([target, label, icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => go(target),
					className: view === target ? "active" : "",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: icon }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
				}, target))
			})
		]
	});
}
//#endregion
export { AdminDashboard as default };

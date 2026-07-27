import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
import { i as matchesStoreSlug, n as buildProduct, r as SellerApp, t as StylishMeApp } from "./StylishMeApp-DnmL4EcL.js";
//#region app/StorefrontView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var seededProducts = Array.from({ length: 41 }, (_, index) => buildProduct(index));
var money = (value) => `N$${value.toLocaleString("en-US")}`;
var slug = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
var isLiveSellerProduct = (product) => Boolean(product && "store" in product);
function StorefrontView({ storeSlug, onExit }) {
	const [remote, setRemote] = (0, import_react.useState)([]);
	const [linkedProduct] = (0, import_react.useState)(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("product") ?? "");
	const seeded = (0, import_react.useMemo)(() => seededProducts.filter((product) => matchesStoreSlug(product.designer, storeSlug)), [storeSlug]);
	const [selected, setSelected] = (0, import_react.useState)(() => seeded.find((product) => slug(product.name) === linkedProduct || product.id === linkedProduct) ?? null);
	(0, import_react.useEffect)(() => {
		fetch(`/api/catalog?store=${encodeURIComponent(storeSlug)}`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
			const products = Array.isArray(data.products) ? data.products : [];
			setRemote(products);
			const match = products.find((product) => slug(product.name) === linkedProduct || product.id === linkedProduct);
			if (match) setSelected(match);
		}).catch(() => setRemote([]));
	}, [linkedProduct, storeSlug]);
	const pieces = remote.length ? remote : seeded;
	const first = pieces[0];
	const storeName = isLiveSellerProduct(first) ? first.store?.name : first?.designer;
	const city = isLiveSellerProduct(first) ? first.store?.city : first?.location;
	const story = isLiveSellerProduct(first) ? first.store?.story : "A considered collection created for modern Namibian life.";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "storefront-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "storefront-shell",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onExit,
						children: "← Explore StylishMe"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "STYLISHME" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "♡" })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "storefront-hero",
					children: [first && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "images" in first ? first.images[0] : first.image,
						alt: ""
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "VISITING A STYLISHME STORE" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: storeName || "StylishMe Store" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [city ? `${city}, Namibia` : "Namibia", " · Verified seller"] })
					] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "storefront-story",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "THE STORE" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { children: [
							"Only pieces from ",
							storeName || "this seller",
							"."
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: story || "A local collection available through StylishMe." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					className: "storefront-grid",
					"aria-label": `Products from ${storeName || "this store"}`,
					children: pieces.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "storefront-image",
							onClick: () => setSelected(product),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "images" in product ? product.images[0] : product.image,
								alt: product.name
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "collection" in product ? product.collection || product.category : product.category }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setSelected(product),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: product.name })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: money(product.price) })
					] }, product.id))
				}),
				!pieces.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "storefront-empty",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "This store is preparing its first collection." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Come back soon or continue exploring StylishMe." })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "storefront-exit",
					onClick: onExit,
					children: "Explore StylishMe"
				}),
				selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "storefront-sheet",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": selected.name,
					onClick: () => setSelected(null),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						onClick: (event) => event.stopPropagation(),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-label": "Close product",
								onClick: () => setSelected(null),
								children: "×"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "images" in selected ? selected.images[0] : selected.image,
								alt: selected.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: storeName }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: selected.name }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(selected.price) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "description" in selected ? selected.description : "A considered wardrobe piece from this StylishMe store." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "storefront-shop-button",
								onClick: onExit,
								children: "Continue in StylishMe to choose options"
							})
						]
					})
				})
			]
		})
	});
}
//#endregion
//#region app/AppEntry.tsx
function AppEntry({ user }) {
	const [stage, setStage] = (0, import_react.useState)("welcome");
	const [role, setRole] = (0, import_react.useState)(null);
	const [storeSlug, setStoreSlug] = (0, import_react.useState)(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("store") ?? "");
	const [checkingRole, setCheckingRole] = (0, import_react.useState)(true);
	const roleKey = (0, import_react.useMemo)(() => `stylishme-account-role:${user?.email ?? "guest"}`, [user?.email]);
	const joinIntent = (0, import_react.useMemo)(() => {
		if (typeof window === "undefined") return null;
		const value = new URLSearchParams(window.location.search).get("join");
		return value === "customer" || value === "seller" ? value : null;
	}, []);
	const track = (event, targetType, targetId) => {
		const sessionKey = "stylishme-session-id";
		let sessionId = sessionStorage.getItem(sessionKey);
		if (!sessionId) {
			sessionId = crypto.randomUUID();
			sessionStorage.setItem(sessionKey, sessionId);
		}
		const params = new URLSearchParams(window.location.search);
		const context = {
			source: params.get("utm_source") ?? "direct",
			medium: params.get("utm_medium") ?? "none",
			campaign: params.get("utm_campaign") ?? "none",
			referrerHost: document.referrer ? new URL(document.referrer).hostname : "direct",
			path: window.location.pathname
		};
		fetch("/api/activity", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				event,
				targetType,
				targetId,
				context,
				sessionId
			}),
			keepalive: true
		}).catch(() => void 0);
	};
	(0, import_react.useEffect)(() => {
		track("page_viewed", "page", window.location.pathname === "/demo" ? "demo" : "home");
	}, []);
	(0, import_react.useEffect)(() => {
		const saved = localStorage.getItem(roleKey);
		fetch("/api/account").then((response) => response.ok ? response.json() : Promise.reject()).then(async (account) => {
			if (user && joinIntent) {
				if ((await fetch("/api/account", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ role: joinIntent })
				})).ok) {
					localStorage.setItem(roleKey, joinIntent);
					setRole(joinIntent);
					window.history.replaceState({}, "", window.location.pathname);
					return;
				}
			}
			const persisted = account?.role;
			if (persisted === "customer" || persisted === "seller") {
				localStorage.setItem(roleKey, persisted);
				setRole(persisted);
			} else if (saved === "customer" || saved === "seller" && user) setRole(saved);
		}).catch(() => {
			if (saved === "customer" || saved === "seller" && user) setRole(saved);
		}).finally(() => setCheckingRole(false));
	}, [
		joinIntent,
		roleKey,
		user
	]);
	const chooseRole = async (next) => {
		track("role_selected", "role", next);
		if (next === "seller" && !user) {
			track("signup_started", "flow", "seller");
			setStage("auth");
			return;
		}
		if (!(await fetch("/api/account", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ role: next })
		})).ok && next === "seller") {
			setStage("auth");
			return;
		}
		localStorage.setItem(roleKey, next);
		setRole(next);
	};
	if (storeSlug) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorefrontView, {
		storeSlug,
		onExit: () => {
			window.history.pushState({}, "", window.location.pathname);
			setStoreSlug("");
		}
	});
	if (checkingRole) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "entry-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "entry-shell entry-loading",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "STYLISHME" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Namibian fashion, personally yours." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "WELCOME BACK" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Preparing your StylishMe." })] })]
		})
	});
	if (role === "seller" && user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SellerApp, { user });
	if (role === "customer") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StylishMeApp, { user });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "entry-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "entry-shell",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "STYLISHME" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Namibian fashion, personally yours." })] }),
				stage === "welcome" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "entry-art",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "FIND" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "THE" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "LOOK." })
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "entry-copy",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "WELCOME TO STYLISHME" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Your personal guide to Namibian fashion." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Discover local designers, shop complete looks and see how pieces could work for you." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setStage("highlights"),
							children: "Begin"
						})
					]
				})] }),
				stage === "highlights" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "role-copy",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "MADE FOR YOUR STYLE" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "One place to discover, style and shop." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Everything supports a simple journey from inspiration to a confident order." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "onboarding-highlights",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "01" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Discover what is new" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Outfits of the day, local designers and fresh collections." })] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "02" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Build the complete look" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Style Me creates shoppable outfits for your occasion and budget." })] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "03" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Shop with confidence" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Save your fit, preview looks and choose delivery or collection." })] })] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "entry-primary",
						onClick: () => setStage(user ? "role" : "auth"),
						children: "Continue"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "entry-back",
						onClick: () => setStage("welcome"),
						children: "Back"
					})
				] }),
				stage === "auth" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "role-copy",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "YOUR STYLISHME" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Save your style across devices." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Sign in to keep orders, your wardrobe, private previews and seller tools connected to you." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "auth-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "entry-primary",
								href: "/signin-with-chatgpt?return_to=/",
								onClick: () => track("signup_started", "flow", "account"),
								children: "Sign in securely"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
								"or",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "auth-guest",
								onClick: () => void chooseRole("customer"),
								children: "Continue as guest"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Guests can browse and shop in this preview. Sign-in is required for seller tools and private try-on." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "entry-back",
						onClick: () => setStage("highlights"),
						children: "Back"
					})
				] }),
				stage === "role" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "role-copy",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "MAKE IT YOURS" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "How will you use StylishMe?" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Your choice opens a dedicated experience. Customer and seller tools stay separate." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "role-cards",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => void chooseRole("customer"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "01" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Shop fashion" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Discover looks, stores and designers. Save, style and order." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Continue as customer →" })
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => void chooseRole("seller"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "02" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Sell on StylishMe" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Create your store, publish collections and manage customer orders." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Continue as seller →" })
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "entry-back",
						onClick: () => setStage("highlights"),
						children: "Back"
					})
				] })
			]
		})
	});
}
//#endregion
export { AppEntry as default };

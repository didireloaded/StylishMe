import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/seller-domain.ts
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function totalStock(variants) {
	return variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.quantity) || 0), 0);
}
function productReadiness(product) {
	const missing = [];
	if (!product.name.trim()) missing.push("name");
	if (!product.description.trim()) missing.push("description");
	if (!product.category.trim()) missing.push("category");
	if (!(product.price > 0)) missing.push("price");
	if (!product.images.length) missing.push("image");
	if (!product.colours.length) missing.push("colour");
	if (!product.variants.length || totalStock(product.variants) < 1) missing.push("stock");
	return {
		ready: missing.length === 0,
		missing
	};
}
function storeShareUrl(storeName) {
	return `${typeof window === "undefined" ? "https://stylishme-namibia.didireloaded.chatgpt.site" : window.location.origin}/?store=${storeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}
function productShareUrl(storeName, productName) {
	const slug = productName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
	return `${storeShareUrl(storeName)}&product=${slug}`;
}
//#endregion
//#region app/unified-domain.ts
var slug = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
function matchesStoreSlug(storeName, storeSlug) {
	return slug(storeName) === slug(storeSlug);
}
function filterSellerProducts(products, filter) {
	if (filter === "All") return products;
	if (filter === "Live") return products.filter((product) => product.status === "Live");
	if (filter === "Needs details") return products.filter((product) => product.status === "Changes requested");
	return products.filter((product) => product.status === "Changes requested" || product.variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.quantity) || 0), 0) < 1);
}
function filterSellerOrders(orders, filter) {
	return orders.filter((order) => order.status === filter);
}
function checkoutDestinationHeading(fulfilment) {
	return fulfilment === "Store collection" ? "Choose a collection store" : "Delivery address";
}
//#endregion
//#region app/SellerApp.tsx
var import_jsx_runtime = require_jsx_runtime();
var images = [
	"https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=84",
	"https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=84",
	"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=84"
];
var initialState = {
	store: {
		name: "Omutima Studio",
		type: "Designer",
		owner: "Maria",
		city: "Windhoek",
		story: "Soft tailoring and expressive colour, designed for modern Namibian life.",
		approved: true
	},
	products: [
		{
			id: "sp1",
			name: "Ondelela Evening Dress",
			description: "A fluid ceremony dress cut and finished in Windhoek.",
			category: "Women",
			collection: "Modern Ceremony",
			price: 2450,
			material: "Viscose satin",
			fit: "Regular",
			colours: ["Coral", "Black"],
			variants: [
				{
					size: "S",
					colour: "Coral",
					quantity: 2
				},
				{
					size: "M",
					colour: "Coral",
					quantity: 4
				},
				{
					size: "L",
					colour: "Black",
					quantity: 1
				}
			],
			images: [images[0]],
			delivery: ["Nationwide delivery", "Store collection"],
			returns: "14 days",
			madeToOrder: true,
			status: "Live"
		},
		{
			id: "sp2",
			name: "Walvis Linen Co-ord",
			description: "Breathable tailoring designed for relaxed weekends along the coast.",
			category: "Women",
			collection: "Coastline Weekend",
			price: 1399,
			salePrice: 1199,
			material: "Linen blend",
			fit: "Relaxed",
			colours: ["Sand"],
			variants: [{
				size: "S",
				colour: "Sand",
				quantity: 1
			}, {
				size: "M",
				colour: "Sand",
				quantity: 2
			}],
			images: [images[1]],
			delivery: ["Nationwide delivery"],
			returns: "14 days",
			madeToOrder: false,
			status: "Live"
		},
		{
			id: "sp3",
			name: "Lilac Ceremony Set",
			description: "A polished two-piece set for celebrations.",
			category: "Women",
			collection: "Modern Ceremony",
			price: 2190,
			material: "Crepe",
			fit: "Tailored",
			colours: ["Lilac"],
			variants: [{
				size: "M",
				colour: "Lilac",
				quantity: 0
			}],
			images: [images[2]],
			delivery: ["Store collection"],
			returns: "Made-to-order pieces are final sale",
			madeToOrder: true,
			status: "Changes requested"
		}
	]
};
var sellerOrders = [
	{
		id: "SM-2058",
		name: "Ondelela Evening Dress",
		fulfilment: "Store collection",
		timing: "Ready by 15:00",
		image: images[0],
		status: "To prepare"
	},
	{
		id: "SM-2053",
		name: "Walvis Linen Co-ord",
		fulfilment: "Standard delivery",
		timing: "Pack by tomorrow",
		image: images[1],
		status: "Ready"
	},
	{
		id: "SM-2049",
		name: "Ondelela Evening Dress",
		fulfilment: "Express delivery",
		timing: "Courier collection today",
		image: images[0],
		status: "Completed"
	}
];
var blank = () => ({
	id: "",
	name: "",
	description: "",
	category: "Women",
	collection: "",
	price: 0,
	material: "",
	fit: "Regular",
	colours: ["Coral"],
	variants: [{
		size: "M",
		colour: "Coral",
		quantity: 1
	}],
	images: [],
	delivery: ["Nationwide delivery"],
	returns: "14 days",
	madeToOrder: false,
	status: "Draft"
});
function Icon$1({ name }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 24 24",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: {
			home: "M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7",
			collection: "M4 5h16v14H4zM8 5V3h8v2M8 10h8M8 14h5",
			plus: "M12 5v14M5 12h14",
			orders: "M5 3h14v18H5zM8 8h8M8 12h8M8 16h5",
			store: "M4 9h16l-1 12H5L4 9ZM7 9l1-5h8l1 5",
			share: "M12 16V3m0 0L7 8m5-5 5 5M5 12v9h14v-9"
		}[name] })
	});
}
function SellerApp({ user = {
	name: "Maria",
	email: "preview@stylishme.na"
}, demoMode = false }) {
	const [view, setView] = (0, import_react.useState)("today");
	const [state, setState] = (0, import_react.useState)(initialState);
	const [draft, setDraft] = (0, import_react.useState)(blank);
	const [step, setStep] = (0, import_react.useState)(0);
	const [toast, setToast] = (0, import_react.useState)("");
	const [productFilter, setProductFilter] = (0, import_react.useState)("All");
	const [orderFilter, setOrderFilter] = (0, import_react.useState)("To prepare");
	const [needsSetup, setNeedsSetup] = (0, import_react.useState)(false);
	const [loading, setLoading] = (0, import_react.useState)(!demoMode);
	const [newStore, setNewStore] = (0, import_react.useState)({
		name: "",
		type: "Designer",
		owner: user.name,
		city: "Windhoek",
		email: user.email,
		phone: ""
	});
	(0, import_react.useEffect)(() => {
		if (demoMode) return;
		fetch("/api/seller-state").then(async (response) => {
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? "Unable to open your store");
			return data;
		}).then((data) => {
			if (data.state) setState(data.state);
			else setNeedsSetup(true);
		}).catch((error) => {
			setNeedsSetup(true);
			setToast(error instanceof Error ? error.message : "Unable to open your store");
		}).finally(() => setLoading(false));
	}, [demoMode]);
	(0, import_react.useEffect)(() => {
		if (!toast) return;
		const timer = window.setTimeout(() => setToast(""), 2200);
		return () => clearTimeout(timer);
	}, [toast]);
	const save = async (next) => {
		setState(next);
		if (demoMode) {
			setToast("Saved inside this preview");
			return true;
		}
		try {
			const response = await fetch("/api/seller-state", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ state: next })
			});
			const body = await response.json();
			if (!response.ok) throw new Error(body.error ?? "Unable to save your store");
			if (body.state) setState(body.state);
			return true;
		} catch (error) {
			setToast(error instanceof Error ? error.message : "Unable to save your store");
			return false;
		}
	};
	const finishSetup = async (event) => {
		event.preventDefault();
		if (!newStore.name.trim() || !newStore.owner.trim() || !newStore.email.trim()) return setToast("Add your name, store and email");
		if (await save({
			store: {
				...newStore,
				story: "",
				approved: false
			},
			products: []
		})) {
			setNeedsSetup(false);
			setToast("Your store is ready to complete");
		}
	};
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "seller-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "seller-app onboarding-app",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "seller-header",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "wordmark",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "STYLISHME" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "SELLER" })]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "onboarding-copy",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "YOUR STORE" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Preparing your seller space." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Loading your collection and store details securely." })
				]
			})]
		})
	});
	if (needsSetup) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "seller-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "seller-app onboarding-app",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
					className: "seller-header",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "wordmark",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "STYLISHME" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "SELLER" })]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "onboarding-copy",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "YOUR INVITATION" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Welcome to StylishMe Seller" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Create the store customers will discover inside StylishMe." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "form-card onboarding-form",
					onSubmit: finishSetup,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Set up your store" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Your name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: newStore.owner,
							onChange: (e) => setNewStore({
								...newStore,
								owner: e.target.value
							})
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Store or brand name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: newStore.name,
							onChange: (e) => setNewStore({
								...newStore,
								name: e.target.value
							})
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-pair",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["What do you sell?", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: newStore.type,
								onChange: (e) => setNewStore({
									...newStore,
									type: e.target.value
								}),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Designer" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Brand or boutique" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Merch" })
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Location", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: newStore.city,
								onChange: (e) => setNewStore({
									...newStore,
									city: e.target.value
								})
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-pair",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Email", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "email",
								value: newStore.email,
								onChange: (e) => setNewStore({
									...newStore,
									email: e.target.value
								})
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Phone number", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: newStore.phone,
								onChange: (e) => setNewStore({
									...newStore,
									phone: e.target.value
								})
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "primary",
							type: "submit",
							children: "Continue to your store"
						})
					]
				}),
				toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "seller-toast",
					role: "status",
					children: toast
				})
			]
		})
	});
	const live = state.products.filter((p) => p.status === "Live");
	const low = state.products.filter((p) => totalStock(p.variants) < 3);
	const pieces = state.products.reduce((sum, p) => sum + totalStock(p.variants), 0);
	const visibleProducts = filterSellerProducts(state.products, productFilter);
	const visibleOrders = filterSellerOrders(sellerOrders, orderFilter);
	const ready = productReadiness(draft);
	const go = (next) => {
		setView(next);
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const copy = async (value, message) => {
		try {
			await navigator.clipboard.writeText(value);
		} catch {}
		setToast(message);
	};
	const uploadImages = async (files) => {
		if (!files.length) return;
		if (demoMode) {
			const uploaded = files.slice(0, 5).map((file) => URL.createObjectURL(file));
			setDraft((current) => ({
				...current,
				images: uploaded
			}));
			setToast(`${uploaded.length} ${uploaded.length === 1 ? "photo" : "photos"} added to the preview`);
			return;
		}
		setToast("Adding your photos…");
		try {
			const uploaded = await Promise.all(files.slice(0, 5).map(async (file) => {
				const form = new FormData();
				form.append("image", file);
				const response = await fetch("/api/seller-images", {
					method: "POST",
					body: form
				});
				const result = await response.json();
				if (!response.ok || !result.url) throw new Error(result.error ?? "Unable to add photo");
				return result.url;
			}));
			setDraft((current) => ({
				...current,
				images: uploaded
			}));
			setToast(`${uploaded.length} ${uploaded.length === 1 ? "photo" : "photos"} added`);
		} catch (error) {
			setToast(error instanceof Error ? error.message : "Unable to add photos");
		}
	};
	const submit = (event) => {
		event.preventDefault();
		if (!ready.ready) return setToast("Complete the missing details first");
		const next = {
			...draft,
			id: draft.id || `seller-${Date.now()}`,
			status: "Live"
		};
		save({
			...state,
			products: draft.id ? state.products.map((p) => p.id === draft.id ? next : p) : [next, ...state.products]
		});
		setDraft(blank());
		setStep(0);
		go("collection");
		setToast("Quality checks passed — your piece is live");
	};
	const header = (title) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "seller-header",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "wordmark",
				onClick: () => go("today"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "STYLISHME" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "SELLER" })]
			}),
			title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: title }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "avatar",
				onClick: () => go("store"),
				"aria-label": "Open store profile",
				children: "OS"
			})
		]
	});
	let content;
	if (view === "today") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header(),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "welcome",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "GOOD MORNING" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
					"Good morning, ",
					state.store.owner,
					"."
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Your collection is looking considered. Here is what needs your attention today." })
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: state.store.approved ? "Store ready" : "Finish setup" })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "editorial-hero",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: (live[0] ?? state.products[0])?.images[0] ?? images[0],
				alt: ""
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "YOUR SHOP TODAY" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { children: [pieces, " pieces ready to be discovered."] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					live.length,
					" live products · ",
					low.length,
					" need stock attention"
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => go("add"),
					children: "Add a new piece"
				})
			] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "seller-performance",
			"aria-labelledby": "seller-performance-title",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "THIS WEEK" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "seller-performance-title",
					children: "Your store is moving."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "+18%" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Sales" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "N$12,640" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "24 orders" })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Store visits" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "1,482" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "312 returned" })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Saved pieces" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "182" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "96 added to bags" })
				] })
			] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "section-title",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "AT A GLANCE" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Your collection" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => go("collection"),
				children: "View all"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "status-stories",
			children: [
				["Live", live.length],
				["Needs details", state.products.filter((p) => p.status === "Changes requested").length],
				["Low stock", low.length],
				["Orders", 3]
			].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => go(label === "Orders" ? "orders" : "collection"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: value }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: label })]
			}, label))
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "section-title",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "NEEDS YOU" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Small actions, beautifully handled." })] })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "attention-list",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => go("collection"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "coral" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Lilac Ceremony Set" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Add stock before it can return to the shop." })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "→" })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => go("orders"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "lilac" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Order SM-2058" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Confirm collection is ready by 15:00." })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "→" })
				]
			})]
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "share-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "YOUR STOREFRONT" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Share your store" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Send customers directly to your StylishMe collection." })
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => copy(storeShareUrl(state.store.name), "Store link copied"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon$1, { name: "share" }), " Copy link"]
			})]
		})
	] });
	else if (view === "collection") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header("Your collection"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "page-intro",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "YOUR PIECES" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Your collection" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Published pieces and anything that still needs a detail before it can go live." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "primary",
					onClick: () => go("add"),
					children: "Add a new piece"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "filter-chips",
			children: [
				"All",
				"Live",
				"Needs details",
				"Needs attention"
			].map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: productFilter === label ? "active" : "",
				"aria-pressed": productFilter === label,
				onClick: () => setProductFilter(label),
				children: label
			}, label))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "seller-product-grid",
			children: visibleProducts.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "seller-product-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "product-photo",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: product.images[0] || images[0],
							alt: product.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `status ${product.status.toLowerCase().replaceAll(" ", "-")}`,
							children: product.status
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "product-copy",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: product.collection || product.category }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: product.name }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["N$", product.price.toLocaleString()] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [totalStock(product.variants), " in stock"] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "product-actions",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => copy(productShareUrl(state.store.name, product.name), "Product link copied"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon$1, { name: "share" }), " Share"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setDraft(product);
								setStep(0);
								go("add");
							},
							children: "Edit"
						})]
					})
				]
			}, product.id))
		})
	] });
	else if (view === "add") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header(draft.id ? "Edit piece" : "Add a new piece"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "page-intro compact",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "BUILD THE PRODUCT PAGE" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: draft.id ? "Refine this piece" : "Add a new piece" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Give customers everything they need to choose confidently." })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "form-progress",
			children: [
				"The piece",
				"Options & stock",
				"Delivery",
				"Review"
			].map((label, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: index === step ? "active" : index < step ? "done" : "",
				onClick: () => setStep(index),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: index + 1 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: label })]
			}, label))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "piece-form",
			onSubmit: submit,
			children: [
				step === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "form-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Tell the story of this piece" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Product photos", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "file",
							accept: "image/jpeg,image/png,image/webp",
							multiple: true,
							onChange: (e) => void uploadImages([...e.target.files ?? []])
						})] }),
						draft.images.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "photo-preview",
							children: draft.images.slice(0, 3).map((image) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: image,
								alt: ""
							}, image))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Product name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: draft.name,
							onChange: (e) => setDraft({
								...draft,
								name: e.target.value
							}),
							placeholder: "e.g. Ondelela Evening Dress"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Description", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: draft.description,
							onChange: (e) => setDraft({
								...draft,
								description: e.target.value
							}),
							placeholder: "Describe the shape, feeling and details."
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-pair",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Category", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: draft.category,
								onChange: (e) => setDraft({
									...draft,
									category: e.target.value
								}),
								children: [
									"Women",
									"Men",
									"Kids",
									"Shoes",
									"Accessories",
									"Traditional wear",
									"Merch"
								].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: v }, v))
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Collection", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: draft.collection,
								onChange: (e) => setDraft({
									...draft,
									collection: e.target.value
								}),
								placeholder: "Collection name"
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-pair",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Price (N$)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								value: draft.price || "",
								onChange: (e) => setDraft({
									...draft,
									price: Number(e.target.value)
								})
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Sale price", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								value: draft.salePrice || "",
								onChange: (e) => setDraft({
									...draft,
									salePrice: Number(e.target.value) || void 0
								})
							})] })]
						})
					]
				}),
				step === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "form-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Sizes, colours and stock" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-pair",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Material", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: draft.material,
								onChange: (e) => setDraft({
									...draft,
									material: e.target.value
								})
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Fit", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: draft.fit,
								onChange: (e) => setDraft({
									...draft,
									fit: e.target.value
								}),
								children: [
									"Regular",
									"Relaxed",
									"Tailored",
									"Oversized",
									"Close fit"
								].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: v }, v))
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Colours", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: draft.colours.join(", "),
							onChange: (e) => setDraft({
								...draft,
								colours: e.target.value.split(",").map((v) => v.trim()).filter(Boolean)
							})
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "variant-head",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Stock by size" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setDraft((current) => ({
									...current,
									variants: [...current.variants, {
										size: "M",
										colour: current.colours[0] || "Default",
										quantity: 1
									}]
								})),
								children: "+ Add size"
							})]
						}),
						draft.variants.map((variant, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "variant-row",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: variant.size,
									"aria-label": `Size ${index + 1}`,
									onChange: (e) => setDraft((current) => ({
										...current,
										variants: current.variants.map((v, i) => i === index ? {
											...v,
											size: e.target.value
										} : v)
									}))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: variant.colour,
									onChange: (e) => setDraft((current) => ({
										...current,
										variants: current.variants.map((v, i) => i === index ? {
											...v,
											colour: e.target.value
										} : v)
									})),
									children: draft.colours.map((colour) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: colour }, colour))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									min: "0",
									value: variant.quantity,
									"aria-label": `Quantity ${index + 1}`,
									onChange: (e) => setDraft((current) => ({
										...current,
										variants: current.variants.map((v, i) => i === index ? {
											...v,
											quantity: Number(e.target.value)
										} : v)
									}))
								})
							]
						}, index)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "stock-total",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total available" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: totalStock(draft.variants) })]
						})
					]
				}),
				step === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "form-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Delivery and returns" }),
						[
							"Nationwide delivery",
							"Windhoek delivery",
							"Store collection"
						].map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "check-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: draft.delivery.includes(option),
								onChange: () => setDraft((current) => ({
									...current,
									delivery: current.delivery.includes(option) ? current.delivery.filter((v) => v !== option) : [...current.delivery, option]
								}))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: option })]
						}, option)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "check-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: draft.madeToOrder,
								onChange: (e) => setDraft({
									...draft,
									madeToOrder: e.target.checked
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "This piece can be made to order" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Return information", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: draft.returns,
							onChange: (e) => setDraft({
								...draft,
								returns: e.target.value
							})
						})] })
					]
				}),
				step === 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "form-card review-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "READY FOR STYLISHME" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: draft.name || "Untitled piece" }),
						draft.images[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: draft.images[0],
							alt: ""
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Price" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", { children: ["N$", draft.price.toLocaleString()] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Stock" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", { children: [totalStock(draft.variants), " pieces"] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Delivery" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: draft.delivery.join(", ") })] })
						] }),
						!ready.ready && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "missing",
							children: [
								"Still needed: ",
								ready.missing.join(", "),
								"."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "StylishMe will review the details before this piece becomes visible to customers." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "form-actions",
					children: [step > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setStep((v) => v - 1),
						children: "Back"
					}), step < 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "primary",
						onClick: () => setStep((v) => v + 1),
						children: "Continue"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "primary",
						disabled: !ready.ready,
						children: "Submit for review"
					})]
				})
			]
		})
	] });
	else if (view === "orders") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header("Orders"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "page-intro",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "FROM CUSTOMERS" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Orders" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Prepare every piece with care and keep customers informed." })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "filter-chips",
			children: [
				"To prepare",
				"Ready",
				"Completed"
			].map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: orderFilter === label ? "active" : "",
				"aria-pressed": orderFilter === label,
				onClick: () => setOrderFilter(label),
				children: label
			}, label))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "order-list",
			children: visibleOrders.map((order) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: order.image,
					alt: ""
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: order.id }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: order.name }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						order.fulfilment,
						" · ",
						order.timing
					] })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setToast(order.fulfilment === "Store collection" ? "Marked ready for collection" : "Marked ready for delivery"),
					children: "Mark ready"
				})
			] }, order.id))
		})
	] });
	else content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header("Your store"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "store-cover",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: images[2],
				alt: ""
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
				"MADE IN",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
				"NAMIBIA"
			] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "store-profile",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: state.store.type.toUpperCase() }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: state.store.name }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					state.store.city,
					", Namibia · ",
					state.store.approved ? "Approved seller" : "Approval pending"
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [live.length, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Live pieces" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["4.9", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Customer rating" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["2–4 days", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Delivery" })] })
				] })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "form-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Your story" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: state.store.story,
					onChange: (e) => setState((current) => ({
						...current,
						store: {
							...current.store,
							story: e.target.value
						}
					}))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "primary",
					onClick: () => {
						save(state);
						setToast("Store story saved");
					},
					children: "Save changes"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "share-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "CUSTOMER LINK" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Share your store" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: storeShareUrl(state.store.name) })
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => copy(storeShareUrl(state.store.name), "Store link copied"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon$1, { name: "share" }), " Copy link"]
			})]
		})
	] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "seller-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "seller-app",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "seller-content",
					children: content
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "seller-bottom-nav",
					children: [
						[
							"Today",
							"today",
							"home"
						],
						[
							"Collection",
							"collection",
							"collection"
						],
						[
							"Add",
							"add",
							"plus"
						],
						[
							"Orders",
							"orders",
							"orders"
						],
						[
							"Store",
							"store",
							"store"
						]
					].map(([label, target, icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: view === target ? "active" : "",
						"aria-current": view === target ? "page" : void 0,
						onClick: () => go(target),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon$1, { name: icon }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
					}, target))
				}),
				toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "seller-toast",
					role: "status",
					children: toast
				})
			]
		})
	});
}
//#endregion
//#region app/product-catalog.ts
var pexelsStock = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900&h=1200&fit=crop`;
var IMG = [
	29717200,
	29718556,
	29644656,
	29664770,
	29651848,
	24783996,
	1661837,
	4977270,
	4890733,
	10679167,
	15571643,
	27948344,
	29708191,
	29707603,
	29654666,
	29594648,
	15968866,
	36446483,
	14945580,
	32498761,
	20862358,
	35501782,
	29271917,
	14633139,
	13012412,
	30115291,
	14663487,
	7778888,
	27460861,
	31589335,
	18036897,
	16268679,
	10482937,
	34713100,
	35374302,
	3095442,
	14079121,
	35187763,
	35666033,
	9327162,
	5352628
].map(pexelsStock);
var EDITORIAL_IMG = [
	135620,
	7165636,
	8685526,
	7543637,
	27516985,
	1027130,
	1102776
].map(pexelsStock);
var bases = [
	[
		"Oversized Coral Hoodie",
		"Omutima Studio",
		"Clothing",
		899,
		"Cotton fleece",
		"Oversized"
	],
	[
		"Kalahari Street Sneaker",
		"Desert Thread",
		"Shoes",
		1299,
		"Leather and mesh",
		"True to size"
	],
	[
		"Ondelela Evening Dress",
		"Selma K Couture",
		"Women",
		2450,
		"Satin blend",
		"Fitted"
	],
	[
		"Swakop Crossbody Bag",
		"Coastline Atelier",
		"Bags",
		799,
		"Vegan leather",
		"Compact"
	],
	[
		"Oshiwambo Print Jacket",
		"Heritage House",
		"Traditional",
		1850,
		"Cotton print",
		"Regular"
	],
	[
		"Windhoek Utility Shirt",
		"North 22",
		"Men",
		749,
		"Cotton twill",
		"Relaxed"
	],
	[
		"Midnight Cargo Trousers",
		"Street Veld",
		"Clothing",
		999,
		"Ripstop cotton",
		"Relaxed"
	],
	[
		"Etosha Essential Tee",
		"Desert Thread",
		"Clothing",
		399,
		"Organic cotton",
		"Regular"
	],
	[
		"Dune Structured Tote",
		"Coastline Atelier",
		"Bags",
		1190,
		"Pebbled leather",
		"Medium"
	],
	[
		"Savanna Tailored Suit",
		"Mvula Menswear",
		"Men",
		3299,
		"Wool blend",
		"Tailored"
	],
	[
		"Lilac Ceremony Set",
		"Selma K Couture",
		"Traditional",
		2190,
		"Jacquard",
		"Fitted"
	],
	[
		"Walvis Linen Co-ord",
		"Omutima Studio",
		"Women",
		1399,
		"Stonewashed linen",
		"Relaxed"
	]
];
function buildProduct(index) {
	if (index === 40) return {
		id: "p41",
		name: "Etosha Woven Belt",
		designer: "Desert Thread",
		location: "Swakopmund",
		category: "Accessories",
		price: 499,
		image: IMG[40],
		badge: "New Arrival",
		material: "Woven cotton and leather",
		fit: "Adjustable",
		description: "A considered wardrobe piece made for Namibia's climate, everyday movement and modern style.",
		colors: [
			"#e9d6bd",
			"#17171d",
			"#988ee8"
		],
		sizes: [
			"XS",
			"S",
			"M",
			"L",
			"XL"
		],
		stock: [
			2,
			4,
			5,
			3,
			1
		],
		delivery: "2–4 days nationwide",
		pickup: true,
		madeLocal: true,
		sellerType: "Designer"
	};
	const base = bases[index % bases.length];
	const round = Math.floor(index / bases.length);
	const name = round ? `${base[0]} ${round + 1}` : base[0];
	const madeLocal = index % 4 === 0;
	const madeToOrder = index % 9 === 0;
	const sellerType = /tee|hoodie/i.test(name) ? "Merch" : madeLocal || madeToOrder ? "Designer" : "Brand & boutique";
	return {
		id: `p${index + 1}`,
		name,
		designer: base[1],
		location: [
			"Windhoek",
			"Swakopmund",
			"Ongwediva",
			"Walvis Bay"
		][index % 4],
		category: base[2],
		price: base[3] + round * 120,
		oldPrice: index % 5 === 1 ? base[3] + 400 : void 0,
		image: IMG[index],
		badge: index % 7 === 0 ? "Limited Drop" : index % 4 === 0 ? "Made in Namibia" : index % 3 === 0 ? "New Arrival" : void 0,
		material: base[4],
		fit: base[5],
		description: "A considered wardrobe piece made for Namibia's climate, everyday movement and modern style.",
		colors: [
			"#f3a4b8",
			"#988ee8",
			"#83afd9",
			"#d6b4dd",
			"#e9d6bd"
		],
		sizes: [
			"XS",
			"S",
			"M",
			"L",
			"XL"
		],
		stock: [
			3,
			5,
			1,
			index % 4 === 0 ? 0 : 4,
			2
		],
		delivery: index % 3 === 0 ? "1–2 days to Windhoek" : "2–4 days nationwide",
		pickup: index % 2 === 0,
		madeLocal,
		madeToOrder,
		sellerType
	};
}
//#endregion
//#region app/OutfitsView.tsx
var money$3 = (value) => `N$${value.toLocaleString("en-US")}`;
function OutfitsView({ outfits, selectedId, products, savedOutfitIds, replacements, onSelect, onSave, onAddAll, onTryOn, onReplace, onOpenProduct }) {
	const selected = outfits.find((outfit) => outfit.id === selectedId) ?? outfits[0];
	if (!selected) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "outfit-view",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No curated outfits are available yet." })
	});
	const items = selected.productIds.flatMap((originalId) => {
		const currentId = replacements[originalId] ?? originalId;
		const product = products.find((item) => item.id === currentId);
		return product ? [{
			...product,
			originalId
		}] : [];
	});
	const total = items.reduce((sum, product) => sum + product.price, 0);
	const availableCount = items.filter((product) => product.available).length;
	const saved = savedOutfitIds.includes(selected.id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "outfit-view",
		"aria-labelledby": "outfit-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "outfit-view-heading",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "CURATED FOR NAMIBIA" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Outfits" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "outfit-stage",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: selected.image,
					alt: selected.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: selected.location }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "outfit-title",
						children: selected.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Curated by ", selected.curator] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.note })
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "outfit-selector",
				"aria-label": "Choose a curated outfit",
				children: outfits.map((outfit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: outfit.id === selected.id ? "active" : "",
					"aria-pressed": outfit.id === selected.id,
					onClick: () => onSelect(outfit.id),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: outfit.image,
						alt: ""
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: outfit.title })]
				}, outfit.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "outfit-total",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					"Combined total · ",
					items.length,
					" pieces"
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money$3(total) })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "outfit-items",
				"aria-label": `Pieces in ${selected.title}`,
				children: items.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: `outfit-item-card ${product.available ? "" : "unavailable"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "outfit-item",
						onClick: () => onOpenProduct(product.id),
						"aria-label": `Open ${product.name}${product.available ? "" : ", unavailable"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "outfit-item-image",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: product.image,
									alt: ""
								}), !product.available && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Unavailable" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: product.name }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: money$3(product.price) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "outfit-item-link",
								children: "View item"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "outfit-replace",
						"aria-label": `Replace ${product.name}`,
						onClick: () => onReplace(product.originalId, product.id),
						children: "Replace"
					})]
				}, product.originalId))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "outfit-actions",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: `outline-button ${saved ? "saved" : ""}`,
						"aria-pressed": saved,
						onClick: () => onSave(selected.id),
						children: saved ? "Saved Outfit" : "Save Outfit"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "outline-button try-look",
						disabled: !availableCount,
						onClick: () => onTryOn(items.filter((item) => item.available).map((item) => item.id)),
						children: "Try On This Look"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "gradient-button",
						disabled: !availableCount,
						onClick: () => onAddAll(selected.id, items.map((item) => item.id)),
						children: availableCount ? "Add All to Cart" : "All items unavailable"
					})
				]
			})
		]
	});
}
//#endregion
//#region app/outfit-story-behavior.ts
var STORY_DURATION = 5e3;
function getStoryIndex(index, storyCount) {
	if (storyCount <= 0) return 0;
	return (index % storyCount + storyCount) % storyCount;
}
function canAutoAdvance(documentHidden, prefersReducedMotion) {
	return !documentHidden && !prefersReducedMotion;
}
function getFocusWrapIndex(activeIndex, focusableCount, reverse) {
	if (focusableCount <= 0) return null;
	if (activeIndex < 0) return reverse ? focusableCount - 1 : 0;
	if (reverse && activeIndex === 0) return focusableCount - 1;
	if (!reverse && activeIndex === focusableCount - 1) return 0;
	return null;
}
//#endregion
//#region app/OutfitStoryViewer.tsx
var money$2 = (value) => `N$${value.toLocaleString("en-US")}`;
function OutfitStoryViewer({ stories, outfits, products, initialStoryId, restoreFocusTo, savedOutfitIds, onSave, onAddAll, onViewOutfit, onClose }) {
	const requestedInitialIndex = stories.findIndex((story) => story.id === initialStoryId);
	const [activeIndex, setActiveIndex] = (0, import_react.useState)(requestedInitialIndex >= 0 ? requestedInitialIndex : 0);
	const [progressCycle, setProgressCycle] = (0, import_react.useState)(0);
	const dialogRef = (0, import_react.useRef)(null);
	const closeButtonRef = (0, import_react.useRef)(null);
	const currentStory = stories[activeIndex] ?? stories[0];
	const currentOutfit = outfits.find((outfit) => outfit.id === currentStory?.outfitId);
	const outfitProducts = (0, import_react.useMemo)(() => currentOutfit?.productIds.flatMap((id) => {
		const product = products.find((item) => item.id === id);
		return product ? [product] : [];
	}) ?? [], [currentOutfit, products]);
	(0, import_react.useEffect)(() => {
		const fallbackPreviouslyFocused = restoreFocusTo ? null : document.activeElement instanceof HTMLElement ? document.activeElement : null;
		closeButtonRef.current?.focus();
		return () => {
			(restoreFocusTo ?? fallbackPreviouslyFocused)?.focus();
		};
	}, [restoreFocusTo]);
	(0, import_react.useEffect)(() => {
		if (stories.length <= 1) return;
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		let timer;
		const scheduleNextStory = (resetProgress = false) => {
			if (timer !== void 0) window.clearTimeout(timer);
			timer = void 0;
			if (!canAutoAdvance(document.hidden, reducedMotion.matches)) return;
			if (resetProgress) setProgressCycle((cycle) => cycle + 1);
			timer = window.setTimeout(() => {
				setActiveIndex((index) => getStoryIndex(index + 1, stories.length));
			}, STORY_DURATION);
		};
		scheduleNextStory();
		const handleEnvironmentChange = () => scheduleNextStory(true);
		document.addEventListener("visibilitychange", handleEnvironmentChange);
		reducedMotion.addEventListener("change", handleEnvironmentChange);
		return () => {
			if (timer !== void 0) window.clearTimeout(timer);
			document.removeEventListener("visibilitychange", handleEnvironmentChange);
			reducedMotion.removeEventListener("change", handleEnvironmentChange);
		};
	}, [activeIndex, stories.length]);
	if (!currentStory || !currentOutfit) return null;
	const goToStory = (index) => {
		setActiveIndex(getStoryIndex(index, stories.length));
	};
	const handleDialogKeyDown = (event) => {
		if (event.key === "Escape") {
			event.preventDefault();
			onClose();
			return;
		}
		if (event.key !== "Tab") return;
		const dialog = dialogRef.current;
		if (!dialog) return;
		const focusable = Array.from(dialog.querySelectorAll("button:not([disabled])"));
		if (!focusable.length) {
			event.preventDefault();
			dialog.focus();
			return;
		}
		const focusTargetIndex = getFocusWrapIndex(focusable.indexOf(document.activeElement), focusable.length, event.shiftKey);
		if (focusTargetIndex === null) return;
		event.preventDefault();
		focusable[focusTargetIndex].focus();
	};
	const total = outfitProducts.reduce((sum, product) => sum + product.price, 0);
	const availableCount = outfitProducts.filter((product) => product.available).length;
	const isSaved = savedOutfitIds.includes(currentOutfit.id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "story-viewer",
		ref: dialogRef,
		role: "dialog",
		"aria-modal": "true",
		"aria-label": `${currentOutfit.title} outfit story`,
		tabIndex: -1,
		onKeyDown: handleDialogKeyDown,
		style: { backgroundImage: `url(${currentStory.image})` },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "story-viewer-content",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "story-progress",
					"aria-label": "Outfit story progress",
					children: stories.map((story, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: index === activeIndex ? "active" : index < activeIndex ? "complete" : "",
						onClick: () => goToStory(index),
						"aria-label": `View ${story.label}`,
						"aria-current": index === activeIndex ? "step" : void 0,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}, `${currentStory.id}-${progressCycle}`) })
					}, story.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					ref: closeButtonRef,
					className: "story-close",
					onClick: onClose,
					"aria-label": "Close outfit stories",
					children: "×"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "story-hit-area previous",
					onClick: () => goToStory(activeIndex - 1),
					"aria-label": "Previous outfit story"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "story-hit-area next",
					onClick: () => goToStory(activeIndex + 1),
					"aria-label": "Next outfit story"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "story-copy-panel",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
							currentStory.label.toUpperCase(),
							" · ",
							currentOutfit.location.toUpperCase()
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: currentOutfit.title }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: currentOutfit.note })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "story-commerce",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "story-product-tray",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "story-product-thumbnails",
							"aria-label": "Products in this outfit",
							children: outfitProducts.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: product.available ? "" : "unavailable",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: product.image,
									alt: product.name
								}), !product.available && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Unavailable" })]
							}, product.id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [outfitProducts.length, " pieces"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money$2(total) })] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "story-actions",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "story-save",
								"aria-pressed": isSaved,
								onClick: () => onSave(currentOutfit.id),
								children: isSaved ? "Saved Outfit" : "Save Outfit"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "story-add",
								onClick: () => availableCount ? onAddAll(currentOutfit.id) : onViewOutfit(currentOutfit.id),
								children: availableCount ? "Add All to Cart" : "View Similar"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "story-view",
								onClick: () => onViewOutfit(currentOutfit.id),
								children: "View Outfit"
							})
						]
					})]
				})
			]
		})
	});
}
//#endregion
//#region app/try-on-domain.ts
var TRY_ON_DISCLAIMER = "This is a visual style preview. It does not guarantee exact sizing, tailoring, material behaviour, or real-world fit.";
var TRY_ON_CONSENT_VERSION = "2026-07-19";
function validateTryOnConsent(consent) {
	return Object.values(consent).every(Boolean) ? {
		ok: true,
		message: ""
	} : {
		ok: false,
		message: "Confirm every consent statement to continue."
	};
}
function validateTryOnFile(file) {
	if (![
		"image/jpeg",
		"image/png",
		"image/webp"
	].includes(file.type)) return {
		ok: false,
		message: "Choose a JPG, PNG, or WebP image."
	};
	if (!file.size || file.size > 10485760) return {
		ok: false,
		message: "Choose an image smaller than 10 MB."
	};
	return {
		ok: true,
		message: "Photo ready"
	};
}
function progressMessage(status) {
	return {
		queued: "Preparing your preview",
		validating: "Checking your images",
		preparing: "Preparing the outfit",
		generating: "Creating your preview",
		completed: "Finishing the details"
	}[status] ?? "Preparing your preview";
}
function parseTryOnResponse(value) {
	if (!value || typeof value !== "object") return null;
	const response = value;
	if (typeof response.imageBase64 !== "string" || !response.imageBase64 || typeof response.mimeType !== "string" || !response.mimeType.startsWith("image/") || typeof response.model !== "string" || !response.model) return null;
	return {
		imageBase64: response.imageBase64,
		mimeType: response.mimeType,
		model: response.model
	};
}
//#endregion
//#region app/TryOnView.tsx
var emptyConsent = {
	ownsImage: false,
	understandsAi: false,
	acceptsPrivacy: false,
	confirmsAdult: false
};
var defaultSettings = {
	transfer: "outfit-only",
	background: "preserve",
	styling: "natural"
};
var defaultBrief = {
	occasion: "Dinner",
	location: "Windhoek",
	timing: "This weekend",
	budget: "N$1,500",
	colours: ["Warm neutrals"],
	style: "Modern",
	ownedItems: ""
};
var money$1 = (value) => `N$${value.toLocaleString("en-US")}`;
var consentRows = [
	["ownsImage", "I confirm this is my image or I have permission to use it."],
	["understandsAi", "I understand this preview is digitally created and may differ from real clothing."],
	["acceptsPrivacy", "I accept the privacy and image-processing terms."],
	["confirmsAdult", "I confirm I am 18 or older."]
];
function TryOnView({ products, initialProductIds, onOpenProduct, onAddProduct, onAddLook, onContinueShopping, initialIntent = "try-on", isSignedIn = true, signInUrl = "/signin-with-chatgpt?return_to=/" }) {
	const validInitialIds = (0, import_react.useMemo)(() => {
		const ids = initialProductIds.filter((id) => products.some((product) => product.id === id));
		return ids.length ? ids : products[0] ? [products[0].id] : [];
	}, [initialProductIds, products]);
	const [step, setStep] = (0, import_react.useState)(initialIntent === "style" ? "style-brief" : "intro");
	const [consent, setConsent] = (0, import_react.useState)(emptyConsent);
	const [photo, setPhoto] = (0, import_react.useState)(null);
	const [photoPreview, setPhotoPreview] = (0, import_react.useState)("");
	const [referencePhoto, setReferencePhoto] = (0, import_react.useState)(null);
	const [selectedProductIds, setSelectedProductIds] = (0, import_react.useState)(validInitialIds);
	const [settings, setSettings] = (0, import_react.useState)(defaultSettings);
	const [status, setStatus] = (0, import_react.useState)("queued");
	const [result, setResult] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	const [photoMessage, setPhotoMessage] = (0, import_react.useState)("");
	const [brief, setBrief] = (0, import_react.useState)(defaultBrief);
	const requestController = (0, import_react.useRef)(null);
	const selectedProducts = selectedProductIds.flatMap((id) => {
		const product = products.find((item) => item.id === id);
		return product ? [product] : [];
	});
	const outfitTotal = selectedProducts.reduce((total, product) => total + product.price, 0);
	const consentReady = validateTryOnConsent(consent).ok;
	const reset = () => {
		setStep(initialIntent === "style" ? "style-brief" : "intro");
		setConsent(emptyConsent);
		setPhoto(null);
		setPhotoPreview("");
		setReferencePhoto(null);
		setSelectedProductIds(validInitialIds);
		setSettings(defaultSettings);
		setStatus("queued");
		setResult(null);
		setError("");
		setPhotoMessage("");
	};
	const toggleBriefColour = (colour) => {
		setBrief((current) => ({
			...current,
			colours: current.colours.includes(colour) ? current.colours.filter((item) => item !== colour) : [...current.colours, colour]
		}));
	};
	const buildStyledLook = () => {
		const budget = brief.budget === "Flexible" ? Number.POSITIVE_INFINITY : Number(brief.budget.replace(/\D/g, "")) || 1500;
		const preferredCategories = /wedding|dinner|occasion/i.test(brief.occasion) ? [
			"Women",
			"Traditional",
			"Shoes",
			"Bags"
		] : /office|work/i.test(brief.occasion) ? [
			"Clothing",
			"Men",
			"Women",
			"Shoes"
		] : [
			"Clothing",
			"Women",
			"Men",
			"Shoes",
			"Accessories"
		];
		const ranked = [...products].sort((a, b) => {
			const aPreferred = preferredCategories.includes(a.category);
			if (aPreferred !== preferredCategories.includes(b.category)) return aPreferred ? -1 : 1;
			return Number(Boolean(b.madeLocal)) - Number(Boolean(a.madeLocal));
		});
		const picked = [];
		let total = 0;
		for (const product of ranked) {
			if (picked.some((item) => item.category === product.category)) continue;
			if (total + product.price > budget) continue;
			picked.push(product);
			total += product.price;
			if (picked.length === 4) break;
		}
		const fallback = [...products].sort((a, b) => a.price - b.price).slice(0, 1);
		setSelectedProductIds((picked.length ? picked : fallback).map((product) => product.id));
		setStep("style-result");
	};
	const handlePhoto = (file) => {
		if (!file) return;
		const validation = validateTryOnFile(file);
		setPhotoMessage(validation.message);
		if (!validation.ok) {
			setPhoto(null);
			setPhotoPreview("");
			return;
		}
		setPhoto(file);
		const reader = new window.FileReader();
		reader.addEventListener("load", () => setPhotoPreview(typeof reader.result === "string" ? reader.result : ""));
		reader.readAsDataURL(file);
	};
	const handleReference = (file) => {
		if (!file) return;
		const validation = validateTryOnFile(file);
		setError(validation.ok ? "" : validation.message);
		setReferencePhoto(validation.ok ? file : null);
		if (validation.ok) setSelectedProductIds([]);
	};
	const toggleProduct = (productId) => {
		setReferencePhoto(null);
		setSelectedProductIds((current) => {
			if (current.includes(productId)) return current.filter((id) => id !== productId);
			if (current.length >= 4) {
				setError("Choose up to four pieces for one clear preview.");
				return current;
			}
			setError("");
			return [...current, productId];
		});
	};
	const generatePreview = async () => {
		if (!isSignedIn) {
			setStep("sign-in");
			return;
		}
		if (!photo || !selectedProducts.length && !referencePhoto) return;
		setError("");
		setStatus("validating");
		setStep("generating");
		try {
			const form = new window.FormData();
			form.set("person", photo);
			if (referencePhoto) form.set("reference", referencePhoto);
			if (!referencePhoto && selectedProducts[0]) form.set("referenceUrl", selectedProducts[0].image);
			form.set("productIds", JSON.stringify(selectedProductIds));
			form.set("settings", JSON.stringify(settings));
			form.set("consent", JSON.stringify(consent));
			form.set("consentVersion", TRY_ON_CONSENT_VERSION);
			form.set("consentedAt", (/* @__PURE__ */ new Date()).toISOString());
			setStatus("generating");
			requestController.current = new AbortController();
			const response = await fetch("/api/try-on", {
				method: "POST",
				body: form,
				signal: requestController.current.signal
			});
			const body = await response.json();
			if (!response.ok) {
				const apiError = body.error && typeof body.error === "object" ? body.error : null;
				if (apiError?.code === "AUTH_REQUIRED") {
					setStep("sign-in");
					return;
				}
				throw new Error(typeof apiError?.message === "string" ? apiError.message : "We could not create your preview. Please try again.");
			}
			const parsed = parseTryOnResponse(body);
			if (!parsed) throw new Error("The preview response was incomplete. Please try again.");
			setStatus("completed");
			setResult(parsed);
			setStep("result");
		} catch (generationError) {
			if (generationError instanceof DOMException && generationError.name === "AbortError") {
				setStatus("cancelled");
				setStep("review");
				return;
			}
			setStatus("failed");
			setError(generationError instanceof Error ? generationError.message : "We could not create your preview. Please try again.");
			setStep("review");
		} finally {
			requestController.current = null;
		}
	};
	if (step === "style-brief") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view style-me-brief",
		"aria-labelledby": "style-me-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "YOUR PERSONAL STYLE EDIT" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				id: "style-me-title",
				children: "What are you dressing for?"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Tell us a little about the moment. We will build a complete shoppable look from pieces available on StylishMe." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: "Occasion" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "setting-grid style-options",
				children: [
					"Dinner",
					"Casual office",
					"Wedding guest",
					"Weekend",
					"Festival",
					"Sunday lunch"
				].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: brief.occasion === value ? "selected" : "",
					"aria-pressed": brief.occasion === value,
					onClick: () => setBrief((current) => ({
						...current,
						occasion: value
					})),
					children: value
				}, value))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "style-form-pair",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Location" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					value: brief.location,
					onChange: (event) => setBrief((current) => ({
						...current,
						location: event.target.value
					})),
					children: [
						"Windhoek",
						"Swakopmund",
						"Walvis Bay",
						"Ongwediva",
						"Elsewhere in Namibia"
					].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: value }, value))
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "When?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					value: brief.timing,
					onChange: (event) => setBrief((current) => ({
						...current,
						timing: event.target.value
					})),
					children: [
						"Today",
						"Tomorrow",
						"This weekend",
						"Choose later"
					].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: value }, value))
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: "Budget for the full look" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "setting-grid two",
				children: [
					"N$1,500",
					"N$2,500",
					"N$4,000",
					"Flexible"
				].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: brief.budget === value ? "selected" : "",
					"aria-pressed": brief.budget === value,
					onClick: () => setBrief((current) => ({
						...current,
						budget: value
					})),
					children: value
				}, value))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: "Preferred colours" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "style-colours",
				children: [
					"Warm neutrals",
					"Black",
					"Bold colour",
					"Pastels"
				].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: brief.colours.includes(value) ? "selected" : "",
					"aria-pressed": brief.colours.includes(value),
					onClick: () => toggleBriefColour(value),
					children: value
				}, value))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: "Your style" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "setting-grid two",
				children: [
					"Modern",
					"Minimal",
					"Statement",
					"Relaxed"
				].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: brief.style === value ? "selected" : "",
					"aria-pressed": brief.style === value,
					onClick: () => setBrief((current) => ({
						...current,
						style: value
					})),
					children: value
				}, value))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "owned-items",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Something you already own? ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Optional" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: brief.ownedItems,
					onChange: (event) => setBrief((current) => ({
						...current,
						ownedItems: event.target.value
					})),
					placeholder: "e.g. black trousers or white sneakers"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "gradient-button full",
				onClick: buildStyledLook,
				children: "Create my look"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "outline-button full",
				onClick: () => setStep("intro"),
				children: "I already have a look to try"
			})
		]
	});
	if (step === "style-result") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view style-me-result",
		"aria-labelledby": "style-result-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "text-back",
				onClick: () => setStep("style-brief"),
				children: "Refine my brief"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["STYLED FOR ", brief.location.toUpperCase()] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				id: "style-result-title",
				children: [brief.occasion, ", made yours."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				"A ",
				brief.style.toLowerCase(),
				" edit for ",
				brief.timing.toLowerCase(),
				", kept close to your ",
				brief.budget === "Flexible" ? "flexible budget" : `${brief.budget} budget`,
				"."
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "styled-look-collage",
				children: selectedProducts.map((product, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: index === 0 ? "lead" : "",
					onClick: () => onOpenProduct(product.id),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: product.image,
						alt: product.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: product.designer }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: product.name }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: money$1(product.price) })
					] })]
				}, product.id))
			}),
			brief.ownedItems && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "owned-item-note",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "WORKING WITH YOUR WARDROBE" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Keep your ",
					brief.ownedItems,
					". This edit is built to complete it."
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "try-on-result-total",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [selectedProducts.length, " piece look"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money$1(outfitTotal) })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "gradient-button full",
				onClick: () => onAddLook(selectedProductIds),
				children: "Add full look to cart"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "outline-button full",
				onClick: () => setStep(isSignedIn ? "consent" : "sign-in"),
				children: "See this look on me"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "style-shop-more",
				onClick: onContinueShopping,
				children: "Keep shopping"
			})
		]
	});
	if (step === "intro") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view try-on-intro",
		"aria-labelledby": "try-on-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "DIGITAL OUTFIT PREVIEW" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				id: "try-on-title",
				children: "Try On"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "try-on-lead",
				children: "See how a look could appear on you with a private digital preview."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "try-on-intro-art",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: products[0]?.image,
					alt: "Fashion look available for try-on"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Private preview" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "try-on-disclaimer",
				children: TRY_ON_DISCLAIMER
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "gradient-button full",
				onClick: () => setStep(isSignedIn ? "consent" : "sign-in"),
				children: "Start Try-On"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "outline-button full",
				onClick: () => setStep("style-brief"),
				children: "Style me instead"
			})
		]
	});
	if (step === "sign-in") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view try-on-intro",
		"aria-labelledby": "try-on-sign-in-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "text-back",
				onClick: () => setStep("intro"),
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "PRIVATE PREVIEW" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				id: "try-on-sign-in-title",
				children: "Sign in before adding your photo."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "try-on-lead",
				children: "A secure account keeps this personal preview connected only to you and helps protect the feature from misuse."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				className: "gradient-button full try-on-sign-in",
				href: signInUrl,
				children: "Sign in securely"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "outline-button full",
				onClick: onContinueShopping,
				children: "Continue shopping as guest"
			})
		]
	});
	if (step === "consent") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view",
		"aria-labelledby": "try-on-consent-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "text-back",
				onClick: () => setStep("intro"),
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "YOUR PHOTO, YOUR CONTROL" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				id: "try-on-consent-title",
				children: "Before we begin"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Confirm each statement before uploading a photo. You can delete your preview at any time." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "consent-list",
				children: consentRows.map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: consent[key],
					onChange: (event) => setConsent((current) => ({
						...current,
						[key]: event.target.checked
					}))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })] }, key))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "gradient-button full",
				disabled: !consentReady,
				onClick: () => setStep("photo"),
				children: "Continue to photo"
			})
		]
	});
	if (step === "photo") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view",
		"aria-labelledby": "try-on-photo-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "text-back",
				onClick: () => setStep("consent"),
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "STEP 1 OF 4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				id: "try-on-photo-title",
				children: "Add a full-length photo"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "photo-guide",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "For the clearest preview" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Face the camera" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Keep head and feet visible" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Use even lighting" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Include only one person" })
				] })] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "upload-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					"aria-label": "Upload full-length photo",
					type: "file",
					accept: "image/jpeg,image/png,image/webp",
					capture: "environment",
					onChange: (event) => handlePhoto(event.target.files?.[0] ?? null)
				}), photoPreview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: photoPreview,
					alt: "Selected full-length photo"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Take or upload a photo" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "JPG, PNG or WebP · up to 10 MB" })] })]
			}),
			photoMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: photo ? "form-success" : "form-error",
				role: "status",
				children: photoMessage
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "gradient-button full",
				disabled: !photo,
				onClick: () => setStep("source"),
				children: "Choose outfit"
			})
		]
	});
	if (step === "source") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view",
		"aria-labelledby": "try-on-source-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "text-back",
				onClick: () => setStep("photo"),
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "STEP 2 OF 4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				id: "try-on-source-title",
				children: "Choose what to try"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Select up to four StylishMe pieces, or add one outfit reference of your own." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "try-on-product-picker",
				children: products.slice(0, 8).map((product) => {
					const selected = selectedProductIds.includes(product.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: selected ? "selected" : "",
						"aria-pressed": selected,
						onClick: () => toggleProduct(product.id),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: product.image,
								alt: ""
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: product.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: money$1(product.price) })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: selected ? "Selected" : "Select" })
						]
					}, product.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "reference-upload",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Upload an external reference" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Screenshot or outfit inspiration" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					"aria-label": "Upload outfit reference",
					type: "file",
					accept: "image/jpeg,image/png,image/webp",
					onChange: (event) => handleReference(event.target.files?.[0] ?? null)
				})]
			}),
			referencePhoto && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "form-success",
				children: ["Reference ready · ", referencePhoto.name]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "form-error",
				role: "alert",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "gradient-button full",
				disabled: !selectedProductIds.length && !referencePhoto,
				onClick: () => setStep("settings"),
				children: "Continue to settings"
			})
		]
	});
	if (step === "settings") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view",
		"aria-labelledby": "try-on-settings-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "text-back",
				onClick: () => setStep("source"),
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "STEP 3 OF 4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				id: "try-on-settings-title",
				children: "Preview settings"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: "Transfer from the look" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "setting-grid",
				children: [
					"outfit-only",
					"outfit-and-shoes",
					"complete-look"
				].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: settings.transfer === value ? "selected" : "",
					"aria-pressed": settings.transfer === value,
					onClick: () => setSettings((current) => ({
						...current,
						transfer: value
					})),
					children: value === "outfit-only" ? "Outfit only" : value === "outfit-and-shoes" ? "Outfit and shoes" : "Complete look"
				}, value))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: "Background" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "setting-grid two",
				children: ["preserve", "studio"].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: settings.background === value ? "selected" : "",
					"aria-pressed": settings.background === value,
					onClick: () => setSettings((current) => ({
						...current,
						background: value
					})),
					children: value === "preserve" ? "Keep my background" : "Clean studio"
				}, value))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "privacy-note",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Private by design" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Your photo is used only to prepare this preview and is not added to your wardrobe." })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "gradient-button full",
				onClick: () => setStep("review"),
				children: "Review preview"
			})
		]
	});
	if (step === "generating") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view try-on-progress",
		"aria-live": "polite",
		"aria-labelledby": "try-on-progress-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "progress-orbit",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSparkles, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "DIGITAL OUTFIT PREVIEW" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				id: "try-on-progress-title",
				children: progressMessage(status)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Keep this screen open while your private preview is prepared. Detailed looks can take up to two minutes." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "outline-button full",
				onClick: () => requestController.current?.abort(),
				children: "Cancel preview"
			})
		]
	});
	if (step === "result" && result) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view try-on-result",
		"aria-labelledby": "try-on-result-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Digitally created outfit preview" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				id: "try-on-result-title",
				children: "Your preview is ready"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "try-on-comparison",
				children: [photoPreview && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: photoPreview,
					alt: "Original upload"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", { children: "Original" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: `data:${result.mimeType};base64,${result.imageBase64}`,
					alt: "Digitally created outfit preview"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", { children: "Preview" })] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "try-on-disclaimer",
				children: TRY_ON_DISCLAIMER
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "try-on-result-total",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					selectedProducts.length,
					" ",
					selectedProducts.length === 1 ? "piece" : "pieces"
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money$1(outfitTotal) })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "try-on-products",
				children: selectedProducts.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: "try-on-product-main",
					onClick: () => onOpenProduct(product.id),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: product.image,
						alt: ""
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: product.designer }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: product.name }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: money$1(product.price) })
					] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "outline-button",
					onClick: () => onAddProduct(product.id),
					"aria-label": `Add ${product.name} to cart`,
					children: "Add"
				})] }, product.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "gradient-button full",
				onClick: () => onAddLook(selectedProductIds),
				children: "Add full look to cart"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "result-actions",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							setResult(null);
							setStep("settings");
						},
						children: "Remix"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: reset,
						children: "Try another outfit"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: reset,
						children: "Delete preview"
					})
				]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "try-on-view",
		"aria-labelledby": "try-on-review-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "text-back",
				onClick: () => setStep("settings"),
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "STEP 4 OF 4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				id: "try-on-review-title",
				children: "Review your preview"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "review-photo",
				children: [photoPreview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: photoPreview,
					alt: "Full-length photo ready for preview"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: photo?.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Processed privately for this preview" })] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "try-on-review-products",
				children: selectedProducts.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: product.image,
					alt: ""
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: product.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: money$1(product.price) })] })] }, product.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "privacy-note",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Your photo stays private" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delete the preview at any time and it disappears from this session." })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "try-on-disclaimer",
				children: TRY_ON_DISCLAIMER
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "try-on-error",
				role: "alert",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Preview unavailable" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: error }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "outline-button",
						onClick: onContinueShopping,
						children: "Continue shopping"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "gradient-button full",
				disabled: !photo || !selectedProducts.length && !referencePhoto,
				onClick: generatePreview,
				children: "Create Preview"
			})
		]
	});
}
function IconSparkles() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "30",
		height: "30",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.5",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m12 3 1.35 4.15L17.5 8.5l-4.15 1.35L12 14l-1.35-4.15L6.5 8.5l4.15-1.35L12 3Z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m18.5 14 .72 2.28L21.5 17l-2.28.72L18.5 20l-.72-2.28L15.5 17l2.28-.72L18.5 14Z" })]
	});
}
//#endregion
//#region app/cart-commerce.ts
function getSizeStock(product, size) {
	const index = product.sizes.indexOf(size);
	return index < 0 ? 0 : product.stock[index] ?? 0;
}
function getFirstStockedSize(product) {
	const index = product.stock.findIndex((quantity) => quantity > 0);
	return index < 0 ? null : product.sizes[index];
}
function mergeCartLinesWithinStock(current, requested, productById) {
	let lines = current.map((line) => ({ ...line }));
	let added = 0;
	let capped = 0;
	let invalid = 0;
	for (const request of requested) {
		const product = productById.get(request.productId);
		if (!product || !product.colors.includes(request.color) || !product.sizes.includes(request.size)) {
			invalid += request.quantity;
			continue;
		}
		const stock = getSizeStock(product, request.size);
		const matchIndex = lines.findIndex((line) => line.productId === request.productId && line.size === request.size && line.color === request.color);
		const existing = matchIndex >= 0 ? lines[matchIndex].quantity : 0;
		const quantityToAdd = Math.max(0, Math.min(request.quantity, stock - existing));
		const quantityCapped = request.quantity - quantityToAdd;
		if (quantityToAdd > 0) {
			if (matchIndex >= 0) lines[matchIndex] = {
				...lines[matchIndex],
				quantity: existing + quantityToAdd
			};
			else lines = [...lines, {
				...request,
				quantity: quantityToAdd
			}];
			added += quantityToAdd;
		}
		capped += quantityCapped;
	}
	return {
		lines,
		added,
		capped,
		invalid
	};
}
//#endregion
//#region app/outfit-catalog.ts
var OUTFITS = [
	{
		id: "windhoek-soft-power",
		title: "Soft Power in Windhoek",
		note: "Coral fleece, utility tailoring and a clean street sneaker.",
		curator: "Omutima Studio",
		location: "Windhoek, Namibia",
		image: EDITORIAL_IMG[0],
		productIds: [
			"p1",
			"p7",
			"p2",
			"p4"
		]
	},
	{
		id: "coastline-weekend",
		title: "Coastline Weekend",
		note: "Relaxed linen and structured accessories for the Atlantic coast.",
		curator: "Coastline Atelier",
		location: "Swakopmund, Namibia",
		image: EDITORIAL_IMG[1],
		productIds: [
			"p12",
			"p9",
			"p4",
			"p2"
		]
	},
	{
		id: "ceremony-modern",
		title: "Modern Ceremony",
		note: "A refined Namibian occasion edit with confident colour.",
		curator: "Selma K Couture",
		location: "Ongwediva, Namibia",
		image: EDITORIAL_IMG[2],
		productIds: [
			"p3",
			"p11",
			"p9"
		]
	},
	{
		id: "desert-after-dark",
		title: "Desert After Dark",
		note: "Sharp monochrome layers softened with a warm accessory.",
		curator: "Street Veld",
		location: "Windhoek, Namibia",
		image: EDITORIAL_IMG[3],
		productIds: [
			"p10",
			"p7",
			"p2",
			"p9"
		]
	}
];
var OUTFIT_STORIES = OUTFITS.map((outfit, index) => ({
	id: `story-${outfit.id}`,
	label: index === 0 ? "Today" : outfit.title.split(" ").slice(0, 2).join(" "),
	outfitId: outfit.id,
	image: outfit.image,
	accent: [
		"#ff8178",
		"#7eb8c8",
		"#c683c9",
		"#d1a273"
	][index % 4]
}));
function getOutfitTotal(outfit, priceById) {
	return outfit.productIds.reduce((total, id) => total + (priceById[id] ?? 0), 0);
}
//#endregion
//#region app/shop-filter.ts
var DEFAULT_SHOP_FILTERS = {
	size: "Any size",
	color: "Any colour",
	price: "Any price",
	designer: "Any designer",
	location: "Any location",
	delivery: "Any delivery"
};
function matchesPrice(price, priceFilter) {
	if (priceFilter === "Under N$800") return price < 800;
	if (priceFilter === "N$800 to N$1,500") return price >= 800 && price <= 1500;
	if (priceFilter === "Over N$1,500") return price > 1500;
	return true;
}
function filterShopProducts(products, category, seededDesignerNames, filters = DEFAULT_SHOP_FILTERS) {
	return products.filter((product) => {
		const matchesCategory = category === "All" ? true : category === "Sale" ? product.oldPrice !== void 0 : category === "Designer" ? seededDesignerNames.includes(product.designer) : product.category === category;
		const sizeIndex = product.sizes.indexOf(filters.size);
		const matchesSize = filters.size === DEFAULT_SHOP_FILTERS.size || sizeIndex >= 0 && product.stock[sizeIndex] > 0;
		const matchesColor = filters.color === DEFAULT_SHOP_FILTERS.color || product.colors.includes(filters.color);
		const matchesDesigner = filters.designer === DEFAULT_SHOP_FILTERS.designer || product.designer === filters.designer;
		const matchesLocation = filters.location === DEFAULT_SHOP_FILTERS.location || product.location === filters.location;
		const matchesDelivery = filters.delivery === DEFAULT_SHOP_FILTERS.delivery || filters.delivery === "Nationwide" && product.delivery.toLowerCase().includes("nationwide") || filters.delivery === "Store collection" && product.pickup || filters.delivery === "Fast delivery" && /^1\D+2 days/i.test(product.delivery);
		return matchesCategory && matchesSize && matchesColor && matchesPrice(product.price, filters.price) && matchesDesigner && matchesLocation && matchesDelivery;
	});
}
//#endregion
//#region app/StylishMeApp.tsx
var profileViews = [
	"profile",
	"wardrobe",
	"orders",
	"tracking",
	"addresses",
	"notifications",
	"support",
	"settings"
];
var designerSummaries = {
	"Omutima Studio": {
		location: "Windhoek, Khomas",
		rating: "4.9",
		followers: "12.8k",
		delivery: "Nationwide",
		storyTitle: "Quiet confidence, made locally.",
		story: "Founded in Windhoek, Omutima Studio creates modern essentials inspired by Namibia's tones, textures and movement.",
		image: IMG[11]
	},
	"Desert Thread": {
		location: "Swakopmund, Erongo",
		rating: "4.8",
		followers: "9.6k",
		delivery: "2–4 days",
		storyTitle: "Built for movement across Namibia.",
		story: "Desert Thread pairs relaxed coastal energy with durable materials for everyday journeys from Swakopmund to Windhoek.",
		image: IMG[1]
	},
	"Selma K Couture": {
		location: "Ongwediva, Oshana",
		rating: "4.9",
		followers: "18.4k",
		delivery: "Nationwide",
		storyTitle: "Occasion dressing with Oshana soul.",
		story: "Selma K Couture shapes expressive ceremony pieces in Ongwediva, balancing contemporary silhouettes with Namibian colour.",
		image: IMG[2]
	},
	"Coastline Atelier": {
		location: "Walvis Bay, Erongo",
		rating: "4.7",
		followers: "7.9k",
		delivery: "2–4 days",
		storyTitle: "Atlantic restraint, thoughtfully crafted.",
		story: "From Walvis Bay, Coastline Atelier makes structured bags and quiet wardrobe pieces informed by the Atlantic landscape.",
		image: IMG[8]
	},
	"Heritage House": {
		location: "Oshakati, Oshana",
		rating: "4.9",
		followers: "15.1k",
		delivery: "Nationwide",
		storyTitle: "Print traditions, tailored for today.",
		story: "Heritage House works with Namibian print and local makers to carry familiar patterns into modern, wearable forms.",
		image: IMG[4]
	},
	"North 22": {
		location: "Windhoek, Khomas",
		rating: "4.6",
		followers: "6.3k",
		delivery: "1–3 days",
		storyTitle: "Utility refined in Windhoek.",
		story: "North 22 develops practical menswear with clean lines, breathable cloth and details suited to life in the capital.",
		image: IMG[9]
	},
	"Street Veld": {
		location: "Katutura, Windhoek",
		rating: "4.8",
		followers: "11.7k",
		delivery: "Nationwide",
		storyTitle: "Katutura energy after dark.",
		story: "Street Veld translates Windhoek street culture into confident layers, limited drops and relaxed Namibian tailoring.",
		image: IMG[10]
	},
	"Mvula Menswear": {
		location: "Rundu, Kavango East",
		rating: "4.7",
		followers: "5.8k",
		delivery: "3–5 days",
		storyTitle: "Modern tailoring from the Kavango.",
		story: "Mvula Menswear cuts polished suiting in Rundu with a lightness and ease designed for Namibia's climate.",
		image: IMG[5]
	}
};
var seededDesignerNames = Object.keys(designerSummaries);
var shopCategories = [
	"All",
	"Women",
	"Men",
	"Clothing",
	"Shoes",
	"Accessories",
	"Bags",
	"Designer",
	"Traditional",
	"Sale"
];
var products = Array.from({ length: 41 }, (_, index) => buildProduct(index));
var productById = new Map(products.map((product) => [product.id, product]));
var shopLocations = [...new Set(products.map((product) => product.location))];
var filterColors = [
	["Pink", "#f3a4b8"],
	["Lilac", "#988ee8"],
	["Blue", "#83afd9"],
	["Mauve", "#d6b4dd"],
	["Sand", "#e9d6bd"],
	["Black", "#17171d"]
];
var sellerLaneDetails = {
	Designers: {
		heading: "Namibian designers",
		description: "Original collections, atelier stories and made-to-order pieces."
	},
	"Brands & boutiques": {
		heading: "Brands & boutiques",
		description: "Curated stores, independent labels and fashion retailers."
	},
	Merch: {
		heading: "Merch drops",
		description: "Creator, artist and event collections in one place."
	}
};
var sellerLaneNames = {
	Designers: [
		"Omutima Studio",
		"Selma K Couture",
		"Heritage House",
		"Coastline Atelier"
	],
	"Brands & boutiques": [
		"Desert Thread",
		"North 22",
		"Street Veld",
		"Mvula Menswear"
	],
	Merch: ["Omutima Studio", "Desert Thread"]
};
var priceById = Object.fromEntries(products.map((product) => [product.id, product.price]));
var storyProducts = products.map(({ id, name, image, price, stock }) => ({
	id,
	name,
	image,
	price,
	available: stock.some((quantity) => quantity > 0)
}));
var defaultOrders = [
	{
		id: "SM-2026-1048",
		date: "12 Jul 2026",
		status: "In transit",
		total: 2098,
		fulfilment: "Standard delivery",
		items: [{
			productId: "p1",
			size: "M",
			color: "#f3a4b8",
			quantity: 1
		}, {
			productId: "p2",
			size: "42",
			color: "#83afd9",
			quantity: 1
		}]
	},
	{
		id: "SM-2026-1032",
		date: "08 Jul 2026",
		status: "Ready to collect",
		total: 799,
		fulfilment: "Store collection",
		items: [{
			productId: "p4",
			size: "One size",
			color: "#17171d",
			quantity: 1
		}]
	},
	{
		id: "SM-2026-1017",
		date: "30 Jun 2026",
		status: "Delivered",
		total: 2450,
		fulfilment: "Express delivery",
		items: [{
			productId: "p3",
			size: "M",
			color: "#988ee8",
			quantity: 1
		}]
	},
	{
		id: "SM-2026-0982",
		date: "18 Jun 2026",
		status: "Delivered",
		total: 1190,
		fulfilment: "Standard delivery",
		items: [{
			productId: "p9",
			size: "One size",
			color: "#e9d6bd",
			quantity: 1
		}]
	},
	{
		id: "SM-2026-0931",
		date: "02 Jun 2026",
		status: "Cancelled",
		total: 749,
		fulfilment: "Standard delivery",
		items: [{
			productId: "p6",
			size: "L",
			color: "#83afd9",
			quantity: 1
		}]
	}
];
var money = (value) => `N$${value.toLocaleString("en-US")}`;
var defaultAddresses = [
	{
		label: "Home",
		street: "12 Independence Avenue",
		city: "Windhoek, Khomas"
	},
	{
		label: "Ongwediva collection",
		street: "Main Road",
		city: "Ongwediva"
	},
	{
		label: "Swakopmund holiday",
		street: "Sam Nujoma Avenue",
		city: "Swakopmund"
	}
];
var supportTopics = {
	"Delivery and collection": "Compare standard, express and store-collection delivery options, including fees and estimated arrival times, before checkout.",
	"Returns and refunds": "Eligible items can be returned within 14 days when unworn, unwashed and returned with their original tags.",
	Payments: "Checkout currently uses a clearly labelled sandbox. No real payment is collected in this release.",
	"Product authenticity": "Verified designer profiles and catalogue attribution help customers identify each item's maker and origin.",
	"Contact support": "For order help, use the order number shown in My Orders when contacting the StylishMe support team.",
	"Terms and privacy": "Your shopping state is stored securely. Try On photos are processed for the preview and are not saved by StylishMe."
};
function Icon({ name }) {
	const common = {
		width: 18,
		height: 18,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.7,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": true
	};
	if (name === "search") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		...common,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "11",
			cy: "11",
			r: "6"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m16 16 4 4" })]
	});
	if (name === "bell") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		...common,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 21h4" })]
	});
	if (name === "bag") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		...common,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 8h14l-1 13H6L5 8Z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 9V6a3 3 0 0 1 6 0v3" })]
	});
	if (name === "home") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		...common,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m3 11 9-8 9 8" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 10v11h14V10M9 21v-7h6v7" })]
	});
	if (name === "shop") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		...common,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 9h16l-1 12H5L4 9Z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 9a4 4 0 0 1 8 0" })]
	});
	if (name === "sparkles") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		...common,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m12 3 1.35 4.15L17.5 8.5l-4.15 1.35L12 14l-1.35-4.15L6.5 8.5l4.15-1.35L12 3Z" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m18.5 14 .72 2.28L21.5 17l-2.28.72L18.5 20l-.72-2.28L15.5 17l2.28-.72L18.5 14Z" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m5 13 .5 1.5L7 15l-1.5.5L5 17l-.5-1.5L3 15l1.5-.5L5 13Z" })
		]
	});
	if (name === "heart") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		...common,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" })
	});
	if (name === "profile") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		...common,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "8",
			r: "4"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 21a8 8 0 0 1 16 0" })]
	});
	if (name === "share") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		...common,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 16V3m0 0L7 8m5-5 5 5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 12v9h14v-9" })]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		...common,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 4h16v16H4z" })
	});
}
function ProductCard({ product, open, saved, toggle }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "product-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "product-image",
				onClick: open,
				"aria-label": `Open ${product.name}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: product.image,
					alt: product.name
				}), product.badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "badge",
					children: product.badge
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: `heart ${saved ? "saved" : ""}`,
				onClick: toggle,
				"aria-label": saved ? "Remove from wishlist" : "Save to wishlist",
				children: saved ? "♥" : "♡"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "product-copy",
				onClick: open,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: product.designer }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: product.name }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						money(product.price),
						" ",
						product.oldPrice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("s", { children: money(product.oldPrice) })
					] })
				]
			})
		]
	});
}
function StylishMeApp({ user, demoMode = false }) {
	const [view, setView] = (0, import_react.useState)("home");
	const [selectedId, setSelectedId] = (0, import_react.useState)("p1");
	const [productReturnView, setProductReturnView] = (0, import_react.useState)("shop");
	const [wishlist, setWishlist] = (0, import_react.useState)([
		"p2",
		"p4",
		"p7",
		"p9",
		"p11",
		"p14"
	]);
	const [cart, setCart] = (0, import_react.useState)([]);
	const [orders, setOrders] = (0, import_react.useState)(user ? [] : defaultOrders);
	const [selectedOrderId, setSelectedOrderId] = (0, import_react.useState)(user ? "" : defaultOrders[0].id);
	const [orderFilter, setOrderFilter] = (0, import_react.useState)("Active");
	const [savedOutfits, setSavedOutfits] = (0, import_react.useState)([]);
	const [activeStoryId, setActiveStoryId] = (0, import_react.useState)(null);
	const storyTriggerRef = (0, import_react.useRef)(null);
	const [selectedOutfitId, setSelectedOutfitId] = (0, import_react.useState)(OUTFITS[0].id);
	const [selectedDesigner, setSelectedDesigner] = (0, import_react.useState)("Omutima Studio");
	const [designerReturnView, setDesignerReturnView] = (0, import_react.useState)("home");
	const [query, setQuery] = (0, import_react.useState)("");
	const [storeQuery, setStoreQuery] = (0, import_react.useState)("");
	const [category, setCategory] = (0, import_react.useState)("All");
	const [sort, setSort] = (0, import_react.useState)("Recommended");
	const [sellerLane, setSellerLane] = (0, import_react.useState)("Designers");
	const [shopFilters, setShopFilters] = (0, import_react.useState)({ ...DEFAULT_SHOP_FILTERS });
	const [filtersOpen, setFiltersOpen] = (0, import_react.useState)(false);
	const [selectedSize, setSelectedSize] = (0, import_react.useState)("M");
	const [selectedColor, setSelectedColor] = (0, import_react.useState)("#f3a4b8");
	const [selectedProductImage, setSelectedProductImage] = (0, import_react.useState)(products[0].image);
	const [checkoutStep, setCheckoutStep] = (0, import_react.useState)(0);
	const [delivery, setDelivery] = (0, import_react.useState)("Standard delivery");
	const [toast, setToast] = (0, import_react.useState)("");
	const [dataLight, setDataLight] = (0, import_react.useState)(false);
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	const [profile, setProfile] = (0, import_react.useState)({
		city: "Windhoek",
		size: "M",
		shoe: "39",
		fit: "Regular"
	});
	const [pendingOutfitAdd, setPendingOutfitAdd] = (0, import_react.useState)(null);
	const [outfitSizeSelections, setOutfitSizeSelections] = (0, import_react.useState)({});
	const [savedOutfitMode, setSavedOutfitMode] = (0, import_react.useState)(false);
	const [tryOnProductIds, setTryOnProductIds] = (0, import_react.useState)(["p1"]);
	const [tryOnIntent, setTryOnIntent] = (0, import_react.useState)("try-on");
	const [outfitReplacements, setOutfitReplacements] = (0, import_react.useState)({});
	const [sizeGuideOpen, setSizeGuideOpen] = (0, import_react.useState)(false);
	const [followedDesigners, setFollowedDesigners] = (0, import_react.useState)([]);
	const [addresses, setAddresses] = (0, import_react.useState)(defaultAddresses);
	const [addressesReturnView, setAddressesReturnView] = (0, import_react.useState)("profile");
	const [addressEditor, setAddressEditor] = (0, import_react.useState)(null);
	const [supportTopic, setSupportTopic] = (0, import_react.useState)(null);
	const stateStorageKey = demoMode ? "stylishme-demo-customer-state" : `stylishme-state:${user?.email ?? "guest"}`;
	const selected = products.find((p) => p.id === selectedId) ?? products[0];
	const designerProducts = products.filter((product) => product.designer === selectedDesigner);
	const selectedDesignerSummary = designerSummaries[selectedDesigner] ?? designerSummaries["Omutima Studio"];
	const sellerDirectoryDetails = sellerLaneDetails[sellerLane];
	const sellerDirectoryNames = sellerLaneNames[sellerLane];
	const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
	const subtotal = cart.reduce((sum, line) => sum + (products.find((p) => p.id === line.productId)?.price ?? 0) * line.quantity, 0);
	const fee = delivery === "Store collection" ? 0 : delivery === "Express delivery" ? 120 : 65;
	const filteredOrders = orders.filter((order) => orderFilter === "Active" ? !["Delivered", "Cancelled"].includes(order.status) : order.status === orderFilter);
	const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
	const isCollectionOrder = selectedOrder?.fulfilment === "Store collection";
	const selectedIndex = Math.max(0, products.findIndex((product) => product.id === selected.id));
	const selectedGallery = [
		selected.image,
		IMG[(selectedIndex + 3) % IMG.length],
		IMG[(selectedIndex + 7) % IMG.length]
	].filter((image, index, list) => list.indexOf(image) === index);
	const completeTheLook = products.filter((product) => product.id !== selected.id && product.designer !== selected.designer).slice(selectedIndex % 5, selectedIndex % 5 + 3);
	(0, import_react.useEffect)(() => {
		fetch("/api/state").then((r) => r.ok ? r.json() : Promise.reject()).then(({ state }) => {
			if (state) {
				setCart(state.cart ?? []);
				setWishlist(state.wishlist ?? []);
				setOrders(Array.isArray(state.orders) ? state.orders : []);
				setProfile((current) => ({
					...current,
					city: state.profile?.city ?? current.city,
					size: state.profile?.size ?? current.size,
					shoe: state.profile?.shoe ?? current.shoe,
					fit: state.profile?.fit ?? current.fit
				}));
				setSavedOutfits(state.savedOutfits ?? state.profile?.savedOutfits ?? []);
				if (Array.isArray(state.profile?.addresses)) setAddresses(state.profile.addresses);
				if (Array.isArray(state.profile?.followedDesigners)) setFollowedDesigners(state.profile.followedDesigners);
				if (typeof state.profile?.dataLight === "boolean") setDataLight(state.profile.dataLight);
			}
		}).catch(() => {
			const saved = localStorage.getItem(stateStorageKey);
			if (saved) try {
				const state = JSON.parse(saved);
				setCart(state.cart ?? []);
				setWishlist(state.wishlist ?? []);
				setOrders(state.orders ?? defaultOrders);
				setProfile((current) => ({
					...current,
					...state.profile ?? {}
				}));
				setSavedOutfits(state.savedOutfits ?? []);
				setAddresses(state.addresses ?? defaultAddresses);
				setFollowedDesigners(state.followedDesigners ?? []);
				setDataLight(Boolean(state.dataLight));
			} catch {}
		}).finally(() => setHydrated(true));
	}, [stateStorageKey]);
	(0, import_react.useEffect)(() => {
		if (!hydrated) return;
		const state = {
			cart,
			wishlist,
			orders,
			profile,
			savedOutfits,
			addresses,
			followedDesigners,
			dataLight
		};
		localStorage.setItem(stateStorageKey, JSON.stringify(state));
		const serverState = {
			...state,
			profile: {
				...profile,
				addresses,
				followedDesigners,
				dataLight
			}
		};
		const timer = window.setTimeout(() => fetch("/api/state", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(serverState)
		}).catch(() => void 0), 500);
		return () => window.clearTimeout(timer);
	}, [
		addresses,
		cart,
		dataLight,
		followedDesigners,
		hydrated,
		orders,
		profile,
		savedOutfits,
		stateStorageKey,
		wishlist
	]);
	(0, import_react.useEffect)(() => {
		if (!toast) return;
		const timer = window.setTimeout(() => setToast(""), 2200);
		return () => window.clearTimeout(timer);
	}, [toast]);
	(0, import_react.useEffect)(() => {
		const productId = new URLSearchParams(window.location.search).get("product");
		const linkedProduct = productId ? productById.get(productId) : null;
		if (!linkedProduct) return;
		setSelectedId(linkedProduct.id);
		setSelectedSize(linkedProduct.sizes[2] ?? linkedProduct.sizes[0]);
		setSelectedColor(linkedProduct.colors[0]);
		setSelectedProductImage(linkedProduct.image);
		setProductReturnView("shop");
		setView("product");
	}, []);
	const navigate = (next) => {
		setView(next);
		setFiltersOpen(false);
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const trackActivity = (event, targetType, targetId) => {
		if (demoMode) return;
		fetch("/api/activity", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				event,
				targetType,
				targetId
			})
		}).catch(() => void 0);
	};
	const openSellerDirectory = (lane) => {
		setSellerLane(lane);
		navigate("seller-directory");
	};
	const openDesigner = (name, returnView = view) => {
		trackActivity("designer_viewed", "designer", name);
		setSelectedDesigner(name);
		setDesignerReturnView(returnView);
		navigate("designer");
	};
	const openProduct = (id, returnView = view) => {
		trackActivity("product_viewed", "product", id);
		setProductReturnView(returnView);
		setSelectedId(id);
		const p = products.find((item) => item.id === id);
		setSelectedSize(p.sizes[2]);
		setSelectedColor(p.colors[0]);
		setSelectedProductImage(p.image);
		navigate("product");
	};
	const openOutfit = (id) => {
		trackActivity("outfit_viewed", "outfit", id);
		setSavedOutfitMode(false);
		setSelectedOutfitId(id);
		setActiveStoryId(null);
		navigate("outfits");
	};
	const openSavedOutfits = () => {
		setSavedOutfitMode(true);
		if (savedOutfits.length) setSelectedOutfitId(savedOutfits[0]);
		navigate("outfits");
	};
	const startTryOn = (productIds, intent = "try-on") => {
		const validIds = [...new Set(productIds)].filter((id) => productById.has(id));
		setTryOnProductIds(validIds.length ? validIds : [selected.id]);
		setTryOnIntent(intent);
		trackActivity("try_on_opened", "product", validIds[0] ?? selected.id);
		navigate("try-on");
	};
	const toggleWishlist = (id) => {
		setWishlist((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
		setToast(wishlist.includes(id) ? "Removed from wishlist" : "Saved to wishlist");
	};
	const toggleSavedOutfit = (id) => {
		setSavedOutfits((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
		setToast(savedOutfits.includes(id) ? "Removed from saved outfits" : "Outfit saved");
	};
	const addProductVariantToCart = (product, size, color) => {
		const result = mergeCartLinesWithinStock(cart, [{
			productId: product.id,
			size,
			color,
			quantity: 1
		}], productById);
		if (result.invalid) {
			setToast("Choose an available size and colour");
			return;
		}
		if (!result.added) {
			setToast(`${product.name} is at its stock limit`);
			return;
		}
		setCart(result.lines);
		setToast("Added to cart");
	};
	const addToCart = (product = selected) => addProductVariantToCart(product, selectedSize, selectedColor);
	const quickAddWishlistItem = (product) => {
		const recommendation = product.category === "Shoes" ? profile.shoe : profile.size;
		const size = getSizeStock(product, recommendation) > 0 ? recommendation : getFirstStockedSize(product);
		if (!size || !product.colors[0]) {
			setToast(`${product.name} is unavailable`);
			return;
		}
		addProductVariantToCart(product, size, product.colors[0]);
	};
	const addTryOnProductsToCart = (productIds) => {
		const result = mergeCartLinesWithinStock(cart, productIds.flatMap((productId) => {
			const product = productById.get(productId);
			if (!product) return [];
			const recommendation = product.category === "Shoes" ? profile.shoe : profile.size;
			const size = getSizeStock(product, recommendation) > 0 ? recommendation : getFirstStockedSize(product);
			return size && product.colors[0] ? [{
				productId: product.id,
				size,
				color: product.colors[0],
				quantity: 1
			}] : [];
		}), productById);
		if (!result.added) {
			setToast("Selected pieces are unavailable or already at their stock limit");
			return;
		}
		setCart(result.lines);
		setToast(`Added ${result.added} ${result.added === 1 ? "piece" : "pieces"} to cart`);
	};
	const getOutfitProducts = (outfitId, overrideProductIds) => {
		const outfit = OUTFITS.find((item) => item.id === outfitId);
		return (overrideProductIds ?? outfit?.productIds ?? []).flatMap((productId) => {
			const product = productById.get(productId);
			return product ? [product] : [];
		});
	};
	const commitOutfitAdd = (outfitId, sizeSelections, productIds) => {
		const outfitProducts = getOutfitProducts(outfitId, productIds);
		const unavailableCount = outfitProducts.filter((product) => !getFirstStockedSize(product)).length;
		const result = mergeCartLinesWithinStock(cart, outfitProducts.flatMap((product) => {
			if (!getFirstStockedSize(product)) return [];
			const recommendation = product.category === "Shoes" ? profile.shoe : profile.size;
			const size = getSizeStock(product, recommendation) > 0 ? recommendation : sizeSelections[product.id];
			if (!size || !product.colors[0]) return [];
			return [{
				productId: product.id,
				size,
				color: product.colors[0],
				quantity: 1
			}];
		}), productById);
		setCart(result.lines);
		setPendingOutfitAdd(null);
		setOutfitSizeSelections({});
		const addedCopy = `Added ${result.added} ${result.added === 1 ? "item" : "items"}`;
		const notes = [unavailableCount ? `${unavailableCount} unavailable` : "", result.capped ? `${result.capped} at stock limit` : ""].filter(Boolean);
		setToast(notes.length ? `${addedCopy} · ${notes.join(" · ")}` : `${addedCopy} to cart`);
	};
	const addOutfitToCart = (outfitId, productIds) => {
		const outfitProducts = getOutfitProducts(outfitId, productIds);
		const unavailableCount = outfitProducts.filter((product) => !getFirstStockedSize(product)).length;
		const selectionProductIds = outfitProducts.filter((product) => {
			if (!getFirstStockedSize(product)) return false;
			return getSizeStock(product, product.category === "Shoes" ? profile.shoe : profile.size) < 1;
		}).map((product) => product.id);
		if (!outfitProducts.length || unavailableCount === outfitProducts.length) {
			setToast("This outfit is currently unavailable");
			return;
		}
		if (selectionProductIds.length) {
			setActiveStoryId(null);
			setOutfitSizeSelections({});
			setPendingOutfitAdd({
				outfitId,
				productIds: outfitProducts.map((product) => product.id),
				selectionProductIds,
				unavailableCount
			});
			return;
		}
		commitOutfitAdd(outfitId, {}, productIds);
	};
	const replaceOutfitProduct = (originalProductId, currentProductId) => {
		const currentProduct = productById.get(currentProductId);
		if (!currentProduct) return;
		const selectedIds = new Set(OUTFITS.find((outfit) => outfit.id === selectedOutfitId)?.productIds.map((id) => outfitReplacements[selectedOutfitId]?.[id] ?? id) ?? []);
		const replacement = products.filter((product) => product.category === currentProduct.category && getFirstStockedSize(product) && !selectedIds.has(product.id)).find((product) => product.id !== currentProductId);
		if (!replacement) {
			setToast(`No alternative ${currentProduct.category.toLowerCase()} is available right now`);
			return;
		}
		setOutfitReplacements((current) => ({
			...current,
			[selectedOutfitId]: {
				...current[selectedOutfitId],
				[originalProductId]: replacement.id
			}
		}));
		setToast(`Replaced ${currentProduct.name} with ${replacement.name}`);
	};
	const updateQty = (index, delta) => {
		const line = cart[index];
		if (!line) return;
		if (delta > 0) {
			const product = productById.get(line.productId);
			if (!product) return;
			const result = mergeCartLinesWithinStock(cart, [{
				...line,
				quantity: 1
			}], productById);
			if (!result.added) {
				setToast(`${product.name} is at its stock limit`);
				return;
			}
			setCart(result.lines);
			return;
		}
		setCart(cart.map((item, itemIndex) => itemIndex === index ? {
			...item,
			quantity: item.quantity - 1
		} : item).filter((item) => item.quantity > 0));
	};
	const placeOrder = () => {
		const fulfilment = delivery;
		const order = {
			id: `SM-2026-${1100 + orders.length}`,
			date: "15 Jul 2026",
			status: fulfilment === "Store collection" ? "Preparing for collection" : "Order confirmed",
			total: subtotal + fee,
			fulfilment,
			items: cart
		};
		setSelectedOrderId(order.id);
		setOrders((current) => [order, ...current]);
		setCart([]);
		setCheckoutStep(0);
		navigate("confirmation");
	};
	const toggleDesignerFollow = () => {
		setFollowedDesigners((current) => current.includes(selectedDesigner) ? current.filter((designer) => designer !== selectedDesigner) : [...current, selectedDesigner]);
	};
	const shareProduct = async (product) => {
		const url = new URL(window.location.href);
		url.search = "";
		url.searchParams.set("product", product.id);
		const payload = {
			title: product.name,
			text: `${product.name} by ${product.designer} on StylishMe`,
			url: url.toString()
		};
		const canShare = typeof navigator.share === "function";
		try {
			if (canShare) await navigator.share(payload);
			else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(payload.url);
			else {
				const input = document.createElement("textarea");
				input.value = payload.url;
				document.body.appendChild(input);
				input.select();
				document.execCommand("copy");
				input.remove();
			}
			setToast(canShare ? "Share sheet opened" : "Product link copied");
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;
			setToast("Unable to share this product right now");
		}
	};
	const saveAddress = () => {
		if (!addressEditor) return;
		const clean = {
			label: addressEditor.label.trim(),
			street: addressEditor.street.trim(),
			city: addressEditor.city.trim()
		};
		if (!clean.label || !clean.street || !clean.city) return;
		setAddresses((current) => addressEditor.index === null ? [...current, clean] : current.map((address, index) => index === addressEditor.index ? clean : address));
		setAddressEditor(null);
		setToast(addressEditor.index === null ? "Address added" : "Address updated");
	};
	const filtered = (0, import_react.useMemo)(() => {
		let list = filterShopProducts(products, category, seededDesignerNames, shopFilters).filter((product) => {
			return `${product.name} ${product.designer} ${product.category} ${product.location}`.toLowerCase().includes(query.toLowerCase());
		});
		if (sort === "Price low to high") list = [...list].sort((a, b) => a.price - b.price);
		if (sort === "Price high to low") list = [...list].sort((a, b) => b.price - a.price);
		return list;
	}, [
		category,
		query,
		shopFilters,
		sort
	]);
	const resetShopFilters = () => {
		setCategory("All");
		setSort("Recommended");
		setShopFilters({ ...DEFAULT_SHOP_FILTERS });
	};
	const clearShopDiscovery = () => {
		setQuery("");
		resetShopFilters();
	};
	const activeFilterCount = Object.entries(shopFilters).filter(([key, value]) => value !== DEFAULT_SHOP_FILTERS[key]).length;
	const cartButton = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		className: "circle-btn",
		onClick: () => navigate("cart"),
		"aria-label": `Open cart, ${cartCount} items`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "bag" }), cartCount ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: cartCount }) : null]
	});
	const header = (title, back) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "page-header",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => navigate(back ?? "home"),
				className: "circle-btn",
				"aria-label": "Go back",
				children: "‹"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: title }),
			!["My Cart", "Checkout"].includes(title) && cartButton()
		]
	});
	const grid = (list) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "product-grid",
		children: list.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, {
			product,
			open: () => openProduct(product.id),
			saved: wishlist.includes(product.id),
			toggle: () => toggleWishlist(product.id)
		}, product.id))
	});
	let content;
	if (view === "home") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "brand-header",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "STYLISHME" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => navigate("search"),
					className: "circle-btn",
					"aria-label": "Search",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "search" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => navigate("notifications"),
					className: "circle-btn",
					"aria-label": "Notifications",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "bell" })
				}),
				cartButton()
			] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			className: "home-search",
			onClick: () => navigate("search"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "search" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Search products, stores and designers" })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "story-row outfit-story-row",
			"aria-label": "Outfit stories",
			children: OUTFIT_STORIES.map((story) => {
				const outfit = OUTFITS.find((item) => item.id === story.outfitId);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "story-identity",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "story-trigger",
						onClick: (event) => {
							storyTriggerRef.current = event.currentTarget;
							setActiveStoryId(story.id);
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
							backgroundImage: `url(${story.image})`,
							borderColor: story.accent
						} }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: story.label })]
					}), outfit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "story-curator",
						onClick: () => openDesigner(outfit.curator),
						children: outfit.curator
					})]
				}, story.id);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "hero-card ootd-hero",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: OUTFITS[0].image,
				alt: OUTFITS[0].title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Outfit of the day" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: OUTFITS[0].title }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: OUTFITS[0].note }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(getOutfitTotal(OUTFITS[0], priceById)) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => openOutfit(OUTFITS[0].id),
					className: "soft-button",
					children: "Explore the edit"
				})
			] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			"aria-labelledby": "new-arrivals-title",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "new-arrivals-title",
					children: "New arrivals"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => navigate("shop"),
					children: "View all"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "compact-product-row",
				children: products.slice(0, 4).map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, {
					product,
					open: () => openProduct(product.id),
					saved: wishlist.includes(product.id),
					toggle: () => toggleWishlist(product.id)
				}, product.id))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "home-look-edit",
			"aria-labelledby": "shop-look-title",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "shop-look-title",
					children: "Shop the Look"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => openOutfit(OUTFITS[0].id),
					children: "View looks"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "look-card home-look-card",
				onClick: () => openOutfit(OUTFITS[1].id),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: OUTFITS[1].image,
					alt: OUTFITS[1].title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: OUTFITS[1].location }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: OUTFITS[1].title }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: OUTFITS[1].note }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(getOutfitTotal(OUTFITS[1], priceById)) })
				] })]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "made-local-edit",
			"aria-labelledby": "made-local-title",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: products[4].image,
				alt: "Made in Namibia collection"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "LOCAL CRAFT" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "made-local-title",
					children: "Made in Namibia"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Modern pieces designed across Namibia, ready to shop." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => {
						setCategory("Designer");
						navigate("shop");
					},
					className: "soft-button",
					children: "Explore local fashion"
				})
			] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			"aria-labelledby": "trending-title",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "trending-title",
					children: "Trending products"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => navigate("shop"),
					children: "View all"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "compact-product-row",
				children: products.slice(4, 8).map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, {
					product,
					open: () => openProduct(product.id),
					saved: wishlist.includes(product.id),
					toggle: () => toggleWishlist(product.id)
				}, product.id))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "home-designers",
			"aria-labelledby": "home-designers-title",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "home-designers-title",
					children: "Designer spotlight"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => {
						setCategory("Designer");
						navigate("shop");
					},
					children: "View all"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "home-designer-grid",
				children: seededDesignerNames.slice(0, 4).map((name) => {
					const designer = designerSummaries[name];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "home-designer-card",
						onClick: () => openDesigner(name),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: designer.image,
								alt: ""
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: name }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [designer.location, ", Namibia"] })
						]
					}, name);
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "try-on-promo",
			"aria-labelledby": "try-on-promo-title",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "DIGITAL OUTFIT PREVIEW" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "try-on-promo-title",
					children: "See it on you"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Upload a full-length photo and preview selected outfits before choosing your size." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "gradient-button",
					onClick: () => startTryOn([
						"p1",
						"p7",
						"p2",
						"p4"
					], "try-on"),
					children: "Try an Outfit"
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "try-on-promo-art",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: products[0].image,
					alt: "Oversized coral hoodie try-on preview"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "sparkles" }) })]
			})]
		})
	] });
	else if (view === "shop" || view === "search") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header(view === "search" ? "Search" : "Shop"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "search-wrap",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				autoFocus: view === "search",
				value: query,
				onChange: (e) => setQuery(e.target.value),
				placeholder: "Search products, stores and designers"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: activeFilterCount ? "active" : "",
				onClick: () => setFiltersOpen(true),
				children: ["Filter", activeFilterCount ? ` · ${activeFilterCount}` : ""]
			})]
		}),
		view === "search" && !query && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "suggestions",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Trending searches" }), [
				"White sneakers",
				"Wedding guest dress",
				"Oversized hoodie",
				"Namibian designer"
			].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => setQuery(item),
				children: item
			}, item))]
		}),
		view === "shop" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "shop-discovery",
			"aria-label": "Shop discovery",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "shop-category-edit",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "section-title",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Shop by category" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "category-edit-grid",
						children: [
							"Women",
							"Men",
							"Shoes",
							"Accessories"
						].map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							"aria-pressed": category === item,
							onClick: () => setCategory(item),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: products[[
									2,
									5,
									1,
									8
								][index]].image,
								alt: ""
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item })]
						}, item))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "seller-lanes",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "section-title",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Explore sellers" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Enter a dedicated seller destination" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "seller-lane-grid",
						children: [
							[
								"Designers",
								"Original collections & made-to-order",
								products[2].image
							],
							[
								"Brands & boutiques",
								"Curated local and imported fashion",
								products[5].image
							],
							[
								"Merch",
								"Creator, artist and event drops",
								products[10].image
							]
						].map(([label, note, image]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => openSellerDirectory(label),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: image,
								alt: ""
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: label }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: note }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Explore →" })
							] })]
						}, label))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "designer-lookbooks",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "section-title",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Designer lookbooks" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => openOutfit(OUTFITS[0].id),
							children: "View all looks"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "lookbook-row",
						children: OUTFITS.slice(0, 3).map((outfit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => openOutfit(outfit.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: outfit.image,
								alt: ""
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: outfit.curator }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: outfit.title }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [outfit.productIds.length, " pieces"] })
							] })]
						}, outfit.id))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "shop-shortcuts",
					"aria-label": "Shop shortcuts",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setShopFilters((current) => ({
								...current,
								location: profile.city
							})),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Near you" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
									products.filter((product) => product.location === profile.city).length,
									" pieces in ",
									profile.city
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "→" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								setSort("Recommended");
								setShopFilters({ ...DEFAULT_SHOP_FILTERS });
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Recommended" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Picked around your style" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "→" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => openProduct(selectedId),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Recently viewed" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: selected.name }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "→" })
							]
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "chip-row",
			children: shopCategories.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: category === item ? "active" : "",
				onClick: () => setCategory(item),
				children: item
			}, item))
		}),
		activeFilterCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "active-filter-row",
			"aria-label": "Active filters",
			children: [Object.entries(shopFilters).flatMap(([key, value]) => value === DEFAULT_SHOP_FILTERS[key] ? [] : [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => setShopFilters((current) => ({
					...current,
					[key]: DEFAULT_SHOP_FILTERS[key]
				})),
				children: [value, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "×" })]
			}, key)]), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "clear-filters",
				onClick: resetShopFilters,
				children: "Clear all"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "result-line",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
				filtered.length,
				" ",
				filtered.length === 1 ? "piece" : "pieces"
			] }), shopFilters.location !== DEFAULT_SHOP_FILTERS.location ? ` · ${shopFilters.location}` : ""] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => setFiltersOpen(true),
				children: ["Sort & filter · ", sort]
			})]
		}),
		filtered.length ? grid(filtered) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "empty",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "No pieces found" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Try a broader search or clear your filters." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: clearShopDiscovery,
					className: "gradient-button",
					children: "Clear all filters"
				})
			]
		})
	] });
	else if (view === "stores") {
		const visibleStores = seededDesignerNames.filter((name) => `${name} ${designerSummaries[name].location}`.toLowerCase().includes(storeQuery.toLowerCase().trim()));
		content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			header("Stores"),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "stores-intro",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "SHOP THEIR WORLD" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Stores on StylishMe" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Discover selected Namibian designers, boutiques, brands and merch collections." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "search-wrap",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: storeQuery,
							onChange: (event) => setStoreQuery(event.target.value),
							placeholder: "Search stores and designers"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "stores-featured",
				"aria-label": "StylishMe stores",
				children: visibleStores.map((name) => {
					const summary = designerSummaries[name];
					const count = products.filter((product) => product.designer === name).length;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => openDesigner(name, "stores"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: summary.image,
							alt: ""
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [summary.location, ", Namibia"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: name }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [count, " pieces · View store →"] })
						] })]
					}, name);
				})
			}),
			!visibleStores.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "empty",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "No store found" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Try searching the seller’s full name." })]
			})
		] });
	} else if (view === "seller-directory") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header(sellerDirectoryDetails.heading, "shop"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "seller-directory-hero",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "EXPLORE SELLERS" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: sellerDirectoryDetails.heading }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: sellerDirectoryDetails.description })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "seller-directory-list",
			"aria-label": `${sellerDirectoryDetails.heading} directory`,
			children: sellerDirectoryNames.map((name) => {
				const sellerProducts = products.filter((product) => product.designer === name && (sellerLane === "Merch" ? product.sellerType === "Merch" : true));
				const summary = designerSummaries[name] ?? designerSummaries["Omutima Studio"];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "seller-directory-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "seller-directory-main",
						"aria-label": `Explore ${name}`,
						onClick: () => openDesigner(name, "seller-directory"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: summary.image,
							alt: ""
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [summary.location, ", Namibia"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: name }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								sellerProducts.length,
								" ",
								sellerProducts.length === 1 ? "piece" : "pieces",
								" in this edit"
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "View profile →" })
						] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "seller-product-preview",
						children: sellerProducts.slice(0, 3).map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							"aria-label": `Open ${product.name}`,
							onClick: () => openProduct(product.id, "seller-directory"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: product.image,
								alt: ""
							})
						}, product.id))
					})]
				}, name);
			})
		})
	] });
	else if (view === "product") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "product-hero",
			style: { background: `radial-gradient(circle at 50% 20%, ${selectedColor}88, #17171d 66%)` },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "floating-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => navigate(productReturnView),
						className: "circle-btn",
						"aria-label": "Go back",
						children: "‹"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => toggleWishlist(selected.id),
							className: "circle-btn",
							"aria-label": wishlist.includes(selected.id) ? "Remove from wishlist" : "Save to wishlist",
							children: wishlist.includes(selected.id) ? "♥" : "♡"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "circle-btn",
							"aria-label": "Share product",
							onClick: () => void shareProduct(selected),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "share" })
						}),
						cartButton()
					] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: selectedProductImage,
					alt: selected.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "product-gallery-strip",
					"aria-label": "Product images",
					children: selectedGallery.map((image, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: selectedProductImage === image ? "active" : "",
						"aria-label": `View product image ${index + 1}`,
						onClick: () => setSelectedProductImage(image),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: image,
							alt: ""
						})
					}, image))
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "product-details",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "badge-row",
					children: [selected.badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "badge",
						children: selected.badge
					}), selected.madeToOrder && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "badge lilac",
						children: "Made to order"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: "designer-link",
					onClick: () => openDesigner(selected.designer, "product"),
					children: [selected.designer, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [designerSummaries[selected.designer]?.location ?? selected.location, " · Verified"] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: selected.name }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "price-line",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(selected.price) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "★ 4.8 (128)" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Colour" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "swatches",
					children: selected.colors.map((color) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						"aria-label": `Select ${color}`,
						onClick: () => setSelectedColor(color),
						className: selectedColor === color ? "active" : "",
						style: { background: color }
					}, color))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "size-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Size" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setSizeGuideOpen(true),
						children: "Size guide"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "sizes",
					children: selected.sizes.map((size, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						disabled: !selected.stock[i],
						className: selectedSize === size ? "active" : "",
						onClick: () => setSelectedSize(size),
						children: [size, !selected.stock[i] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Sold" })]
					}, size))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "fit-note",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["Fit Passport recommends ", profile.size] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"Based on your saved size and this item's ",
						selected.fit.toLowerCase(),
						" fit. Recommendation only."
					] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "info-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Delivering to ", profile.city] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [selected.delivery, " · N$65"] }),
						selected.pickup && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Free store collection available" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.description }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "details-list",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Material ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selected.material })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Fit ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selected.fit })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Model wears ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selected.category === "Shoes" ? "EU 39" : "Size M · 174 cm" })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Care ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Cold gentle wash" })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Returns ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Eligible within 14 days" })] })
					]
				}),
				selected.stock[selected.sizes.indexOf(selectedSize)] === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "request-box",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Your size is unavailable" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setToast("Size request saved"),
						children: "Request this size"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "product-reviews",
					"aria-labelledby": "product-reviews-title",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "section-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "VERIFIED CUSTOMERS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								id: "product-reviews-title",
								children: "Loved for the fit"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "4.8" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rating-summary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { style: { width: "92%" } }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "128 reviews · 94% recommend" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "ND" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Ndeshi" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Verified purchase · Size M" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "★★★★★" })
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Beautiful weight and colour. The Fit Passport recommendation was right for the relaxed shape I wanted." })] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "complete-look",
					"aria-labelledby": "complete-look-title",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "section-title",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "complete-look-title",
							children: "Complete the Look"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => startTryOn([selected.id, ...completeTheLook.map((product) => product.id)], "style"),
							children: "Style this piece"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: completeTheLook.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, {
						product,
						open: () => openProduct(product.id, "shop"),
						saved: wishlist.includes(product.id),
						toggle: () => toggleWishlist(product.id)
					}, product.id)) })]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "sticky-action product-sticky-action",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => startTryOn([selected.id], "try-on"),
				className: "outline-button",
				children: "Try On this piece"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => addToCart(),
				className: "gradient-button",
				children: ["Add to cart · ", money(selected.price)]
			})]
		})
	] });
	else if (view === "designer") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header(selectedDesigner, designerReturnView),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "designer-cover",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: selectedDesignerSummary.image,
					alt: `${selectedDesigner} studio`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "seal",
					children: [
						"MADE IN",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"NAMIBIA"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: selectedDesigner }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [selectedDesignerSummary.location, ", Namibia · Verified designer"] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [designerProducts.length, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Pieces" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [selectedDesignerSummary.rating, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Rating" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [selectedDesignerSummary.followers, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Followers" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [selectedDesignerSummary.delivery, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Delivery" })] })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					"aria-pressed": followedDesigners.includes(selectedDesigner),
					onClick: toggleDesignerFollow,
					children: followedDesigners.includes(selectedDesigner) ? "Following" : "Follow"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "story-copy",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "THE STORY" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: selectedDesignerSummary.storyTitle }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selectedDesignerSummary.story })
			]
		}),
		grid(designerProducts)
	] });
	else if (view === "try-on") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [header(tryOnIntent === "style" ? "Style Me" : "Try On"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TryOnView, {
		products,
		initialProductIds: tryOnProductIds,
		initialIntent: tryOnIntent,
		onOpenProduct: (id) => openProduct(id, "try-on"),
		onAddProduct: (id) => {
			const product = productById.get(id);
			if (product) quickAddWishlistItem(product);
		},
		onAddLook: addTryOnProductsToCart,
		onContinueShopping: () => navigate("shop"),
		isSignedIn: Boolean(user),
		signInUrl: "/signin-with-chatgpt?return_to=/"
	}, `${tryOnIntent}-${tryOnProductIds.join("-")}`)] });
	else if (view === "wishlist") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header("Wishlist"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			"aria-labelledby": "saved-pieces-title",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section-title wishlist-section-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "YOUR PERSONAL EDIT" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "saved-pieces-title",
					children: "Saved pieces"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: wishlist.length })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "wishlist-grid",
				children: [wishlist.flatMap((id) => {
					const p = productById.get(id);
					if (!p) return [];
					return [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "wishlist-product-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: "wishlist-product-image",
								"aria-label": `Open ${p.name}`,
								onClick: () => openProduct(id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: p.image,
									alt: p.name
								}), p.badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "badge",
									children: p.badge
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "wishlist-remove",
								onClick: () => toggleWishlist(id),
								"aria-label": `Remove ${p.name} from wishlist`,
								children: "♥"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "wishlist-product-copy",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: p.designer }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => openProduct(id),
										children: p.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(p.price) })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "wishlist-actions",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => startTryOn([p.id]),
									"aria-label": `Try on ${p.name}`,
									children: "Try On"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => quickAddWishlistItem(p),
									"aria-label": `Add ${p.name} to cart`,
									children: "Add to bag"
								})]
							})
						]
					}, id)];
				}), !wishlist.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "empty compact-empty",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Your wishlist is waiting" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "gradient-button",
						onClick: () => navigate("shop"),
						children: "Discover pieces"
					})]
				})]
			})]
		}),
		savedOutfits.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "saved-look-section",
			"aria-labelledby": "saved-looks-title",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section-title wishlist-section-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "saved-looks-title",
					children: "Saved looks"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: savedOutfits.length })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "saved-look-list",
				children: savedOutfits.flatMap((id) => {
					const outfit = OUTFITS.find((item) => item.id === id);
					if (!outfit) return [];
					return [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "saved-look-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "saved-look-main",
							"aria-label": `Open ${outfit.title}`,
							onClick: () => openOutfit(outfit.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: outfit.image,
								alt: ""
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: outfit.location }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: outfit.title }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [outfit.productIds.length, " pieces"] })
							] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "outline-button",
							"aria-label": `Try on ${outfit.title}`,
							onClick: () => startTryOn(outfit.productIds),
							children: "Try On"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							"aria-label": `Remove ${outfit.title} from saved looks`,
							onClick: () => toggleSavedOutfit(outfit.id),
							children: "♥"
						})] })]
					}, outfit.id)];
				})
			})]
		})
	] });
	else if (view === "cart") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header("My Cart"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "list-stack",
			children: cart.flatMap((line, index) => {
				const p = productById.get(line.productId);
				if (!p) return [];
				const atStockLimit = line.quantity >= getSizeStock(p, line.size);
				return [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "list-item cart-line",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: p.image,
							alt: p.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => openProduct(p.id),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: p.name }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
									line.size,
									" · ",
									p.designer
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: money(p.price) })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "quantity",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => updateQty(index, -1),
									"aria-label": `Decrease ${p.name} quantity`,
									children: "−"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									"aria-label": `${p.name} quantity`,
									children: line.quantity
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									disabled: atStockLimit,
									onClick: () => updateQty(index, 1),
									"aria-label": `Increase ${p.name} quantity`,
									children: "+"
								})
							]
						}),
						atStockLimit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
							className: "stock-limit",
							children: "Maximum available"
						})
					]
				}, `${line.productId}-${line.size}-${line.color}`)];
			})
		}),
		cart.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "summary-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Subtotal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(subtotal) })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delivery estimate" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(fee) })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "total",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(subtotal + fee) })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "gradient-button",
					onClick: () => navigate("checkout"),
					children: "Checkout"
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "empty",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Your cart is empty" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Discover something made for you." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "gradient-button",
					onClick: () => navigate("shop"),
					children: "Start shopping"
				})
			]
		})
	] });
	else if (view === "checkout") {
		const steps = [
			"Delivery",
			delivery === "Store collection" ? "Collection" : "Address",
			"Payment",
			"Review"
		];
		content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			header("Checkout", "cart"),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "stepper",
				children: steps.map((step, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: i <= checkoutStep ? "active" : "",
					children: [i + 1, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: step })]
				}, step))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "checkout-panel",
				children: [
					checkoutStep === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "How should we get it to you?" }), [
						"Standard delivery",
						"Express delivery",
						"Store collection"
					].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "radio",
						name: "delivery",
						checked: delivery === item,
						onChange: () => setDelivery(item)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item === "Store collection" ? "Free · ready in 1–2 days" : item === "Express delivery" ? "N$120 · next working day" : "N$65 · 2–4 days" })] })] }, item))] }),
					checkoutStep === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: checkoutDestinationHeading(delivery) }), delivery === "Store collection" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "address-option",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "radio",
							name: "collection-store",
							defaultChecked: true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Omutima Studio" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "12 Independence Avenue, Windhoek · Free collection" })] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "sandbox-note",
						children: "We will notify you when the order is ready. Collection orders do not use delivery tracking."
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "address-option",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "radio",
							checked: true,
							readOnly: true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: addresses[0]?.label ?? "Home" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: addresses[0] ? `${addresses[0].street}, ${addresses[0].city}` : "Add a delivery address" })] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "outline-button",
						onClick: () => {
							setAddressesReturnView("checkout");
							navigate("addresses");
						},
						children: "Add another address"
					})] })] }),
					checkoutStep === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Payment method" }), [
						"Card ending 2048",
						"Electronic funds transfer",
						"Mobile payment",
						"Cash on delivery"
					].map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "radio",
						name: "pay",
						defaultChecked: !i
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: i ? "Available in sandbox" : "Sandbox card · no real charge" })] })] }, item))] }),
					checkoutStep === 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Review your order" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "sandbox-note",
							children: "Sandbox checkout — no real payment will be processed."
						}),
						cart.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "review-line",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								products.find((p) => p.id === line.productId)?.name,
								" × ",
								line.quantity
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money((products.find((p) => p.id === line.productId)?.price ?? 0) * line.quantity) })]
						}, line.productId)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "review-line total",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(subtotal + fee) })]
						})
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "checkout-actions",
				children: [checkoutStep > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setCheckoutStep((s) => s - 1),
					className: "outline-button",
					children: "Back"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => checkoutStep < 3 ? setCheckoutStep((s) => s + 1) : placeOrder(),
					className: "gradient-button",
					children: checkoutStep < 3 ? "Continue" : "Place sandbox order"
				})]
			})
		] });
	} else if (view === "confirmation") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "success-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✓" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: isCollectionOrder ? "COLLECTION CONFIRMED" : "ORDER CONFIRMED" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: isCollectionOrder ? "We’ll have it ready." : "It’s officially yours." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: isCollectionOrder ? "We will notify you when your order is ready to collect in store." : "Your order is being prepared. Estimated delivery: 18–20 July." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selectedOrder?.id }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "gradient-button",
				onClick: () => navigate("tracking"),
				children: isCollectionOrder ? "View collection status" : "Track delivery"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "outline-button",
				onClick: () => navigate("home"),
				children: "Continue shopping"
			})
		]
	});
	else if (view === "orders") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header("My Orders", "profile"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "chip-row",
			children: [
				"Active",
				"Delivered",
				"Cancelled"
			].map((filter) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: orderFilter === filter ? "active" : "",
				"aria-pressed": orderFilter === filter,
				onClick: () => setOrderFilter(filter),
				children: filter
			}, filter))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "order-list",
			children: [filteredOrders.map((order) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => {
					setSelectedOrderId(order.id);
					navigate("tracking");
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: order.date }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: order.id }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						order.status,
						" · ",
						order.fulfilment ?? "Standard delivery",
						" · ",
						money(order.total)
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: order.items.slice(0, 3).map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: products.find((p) => p.id === line.productId)?.image,
						alt: ""
					}, line.productId)) })
				]
			}, order.id)), !filteredOrders.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "empty compact-empty",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { children: [
					"No ",
					orderFilter.toLowerCase(),
					" orders"
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Your matching orders will appear here." })]
			})]
		})
	] });
	else if (view === "tracking") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header(isCollectionOrder ? "Collection details" : "Order tracking", "orders"),
		isCollectionOrder ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "tracking-head collection-head",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: selectedOrder?.id }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Collection status" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: selectedOrder?.status ?? "Preparing for collection" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "We will notify you as soon as the store marks your order ready." })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "collection-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "COLLECTION STORE" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "StylishMe · Independence Avenue" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "12 Independence Avenue" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Windhoek, Khomas" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Mon–Sat" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "09:00–18:00" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Collection code" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "SM-4826" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Bring your collection code and a photo ID. No courier tracking is needed for this order." })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "timeline",
				children: [
					"Order confirmed",
					"Store preparing order",
					"Ready to collect",
					"Collected"
				].map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: i < (selectedOrder?.status === "Ready to collect" ? 3 : 2) ? "done" : "",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: i < 2 ? ["21 Jul · 10:12", "21 Jul · 10:46"][i] : "Pending" })] })]
				}, item))
			})
		] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "tracking-head",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: selectedOrder?.id ?? "SM-2026-1048" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Delivery tracking" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: selectedOrder?.status ?? "In transit" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Estimated delivery 18–20 July" })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "timeline",
			children: [
				"Order confirmed",
				"Store preparing order",
				"Collected by courier",
				"In transit",
				"Out for delivery",
				"Delivered"
			].map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: i < 4 ? "done" : "",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: i < 4 ? [
						"15 Jul · 09:42",
						"15 Jul · 12:18",
						"16 Jul · 08:06",
						"16 Jul · 14:20"
					][i] : "Pending" })] })
				]
			}, item))
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "outline-button full",
			onClick: () => navigate("support"),
			children: "Contact support"
		})
	] });
	else if (view === "profile") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header("Profile"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "profile-head",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "avatar",
					children: user?.name?.slice(0, 1) ?? "S"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: user?.name ?? "StylishMe Guest" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [profile.city, ", Namibia"] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [orders.length, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Orders" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [wishlist.length, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Wishlist" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [profile.size, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Fit size" })] })
				] }),
				user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/signout-with-chatgpt?return_to=/",
					children: "Sign out"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/signin-with-chatgpt?return_to=/",
					children: "Sign in securely"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "profile-menu profile-collections",
			children: [
				["Style Me", "try-on"],
				["My wardrobe", "wardrobe"],
				["Wishlist", "wishlist"],
				["Saved outfits", "outfits"]
			].map(([label, target]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => target === "outfits" ? openSavedOutfits() : target === "try-on" ? startTryOn([selected.id], "style") : navigate(target),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: label === "Wishlist" ? wishlist.length : label === "Saved outfits" ? savedOutfits.length : label === "Style Me" ? "Your personal edit" : "Your edit" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "›" })
				]
			}, label))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "profile-menu",
			children: [
				["My orders", "orders"],
				["Saved addresses", "addresses"],
				["Fit Passport", "settings"],
				["Notifications", "notifications"],
				["Help & support", "support"],
				["Settings", "settings"]
			].map(([label, target]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => {
					if (target === "addresses") setAddressesReturnView("profile");
					navigate(target);
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "›" })]
			}, label))
		})
	] });
	else if (view === "wardrobe") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header("My Wardrobe", "profile"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "wardrobe-intro",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "YOUR STYLE, IN ONE PLACE" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "My Wardrobe" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Return to the pieces and complete looks you love, then use them to shape what comes next." })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "wardrobe-grid",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => navigate("wishlist"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: wishlist.length }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Saved pieces" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Your favourites and try-on starting points" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: openSavedOutfits,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: savedOutfits.length }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Saved looks" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Complete edits ready to revisit" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => navigate("orders"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: orders.length }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Previous purchases" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Pieces from your StylishMe orders" })
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "wardrobe-later",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "DIGITAL WARDROBE" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Your own clothes, later" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Owned-item uploads and mix-and-match recommendations are planned after the core shopping and try-on experience is proven." })
			]
		})
	] });
	else if (view === "addresses") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header("Saved Addresses", addressesReturnView),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "address-list",
			children: addresses.map((address, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "info-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [address.label, index === 0 ? " · Default" : ""] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: address.street }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: address.city }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						"aria-label": `Edit ${address.label}`,
						onClick: () => setAddressEditor({
							...address,
							index
						}),
						children: "Edit"
					})
				]
			}, `${address.label}-${index}`))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "gradient-button full",
			onClick: () => setAddressEditor({
				index: null,
				label: "",
				street: "",
				city: profile.city
			}),
			children: "Add address"
		})
	] });
	else if (view === "notifications") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [header("Notifications", "profile"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "notification-list",
		children: Array.from({ length: 10 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: () => i < 3 ? navigate("tracking") : navigate("shop"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: i < 3 ? "unread" : "" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: i < 3 ? "Order update" : i < 6 ? "Back in stock" : "New local collection" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: i < 3 ? "Your StylishMe order moved to the next stage." : "A saved piece is ready to discover." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [i + 1, "h ago"] })
			] })]
		}, i))
	})] });
	else if (view === "support") content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [header("Help & Support", "profile"), supportTopic ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "support-detail",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "text-back",
				onClick: () => setSupportTopic(null),
				children: "All help topics"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "HELP TOPIC" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: supportTopic }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: supportTopics[supportTopic] })
		]
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "story-copy",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "WE'RE HERE TO HELP" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "What do you need?" })]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "profile-menu",
		children: Object.keys(supportTopics).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: () => setSupportTopic(item),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "›" })]
		}, item))
	})] })] });
	else content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		header("Settings", "profile"),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "settings-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Fit Passport" }),
				[
					["Normal clothing size", "size"],
					["Shoe size", "shoe"],
					["Preferred fit", "fit"]
				].map(([label, key]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: profile[key],
					onChange: (e) => setProfile((p) => ({
						...p,
						[key]: e.target.value
					}))
				})] }, key)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Recommendations are suggestions, not a fit guarantee." })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "settings-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "switch-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Data-light mode" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Reduce imagery and motion" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: dataLight,
					onChange: (e) => setDataLight(e.target.checked)
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "switch-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Order notifications" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Delivery and collection updates" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					defaultChecked: true
				})]
			})]
		})
	] });
	if (view === "outfits") {
		const outfitCatalogue = savedOutfitMode ? OUTFITS.filter((outfit) => savedOutfits.includes(outfit.id)) : OUTFITS;
		content = savedOutfitMode && !outfitCatalogue.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "empty saved-outfits-empty",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "No saved outfits yet" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Save a story or curated look and it will appear here." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "gradient-button",
					onClick: () => setSavedOutfitMode(false),
					children: "Browse curated outfits"
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [header("Shop the Look", "home"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OutfitsView, {
			outfits: outfitCatalogue,
			selectedId: selectedOutfitId,
			products: storyProducts,
			savedOutfitIds: savedOutfits,
			replacements: outfitReplacements[selectedOutfitId] ?? {},
			onSelect: setSelectedOutfitId,
			onSave: toggleSavedOutfit,
			onAddAll: addOutfitToCart,
			onTryOn: startTryOn,
			onReplace: replaceOutfitProduct,
			onOpenProduct: (id) => openProduct(id, "outfits")
		})] });
	}
	const mainTabs = [
		[
			"Home",
			"home",
			"home"
		],
		[
			"Shop",
			"shop",
			"shop"
		],
		[
			"Stores",
			"stores",
			"shop"
		],
		[
			"Try On",
			"try-on",
			"sparkles"
		],
		[
			"Wishlist",
			"wishlist",
			"heart"
		],
		[
			"Profile",
			"profile",
			"profile"
		]
	];
	const designerOrigin = designerReturnView === "product" ? productReturnView : designerReturnView;
	const isMainTabActive = (target) => target === view || target === "shop" && view === "seller-directory" || target === "stores" && view === "designer" && designerOrigin === "stores" || target === "home" && view === "designer" && designerOrigin === "home" || target === "shop" && view === "designer" && ["shop", "search"].includes(designerOrigin) || target === "wishlist" && view === "designer" && designerOrigin === "wishlist" || target === "profile" && view === "designer" && profileViews.includes(designerOrigin) || target === "profile" && profileViews.includes(view);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: `site-stage ${dataLight ? "data-light" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "app-shell",
				inert: activeStoryId !== null,
				"aria-hidden": activeStoryId ? true : void 0,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "screen-content",
					children: content
				}), ![
					"product",
					"checkout",
					"confirmation"
				].includes(view) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "bottom-nav",
					children: mainTabs.map(([label, target, icon]) => {
						const active = isMainTabActive(target);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => target === "try-on" ? startTryOn([selected.id], "try-on") : navigate(target),
							className: active ? "active" : "",
							"aria-current": active ? "page" : void 0,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: icon }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
						}, target);
					})
				})]
			}),
			activeStoryId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OutfitStoryViewer, {
				stories: OUTFIT_STORIES,
				outfits: OUTFITS,
				products: storyProducts,
				initialStoryId: activeStoryId,
				restoreFocusTo: storyTriggerRef.current,
				savedOutfitIds: savedOutfits,
				onSave: toggleSavedOutfit,
				onAddAll: addOutfitToCart,
				onViewOutfit: openOutfit,
				onClose: () => setActiveStoryId(null)
			}, activeStoryId),
			filtersOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sheet-backdrop",
				onClick: () => setFiltersOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "filter-sheet",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": "Shop filters",
					onClick: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sheet-handle" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "sheet-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Sort & filters" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: resetShopFilters,
								children: "Reset"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Sort by" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: "sheet-select",
							"aria-label": "Sort products",
							value: sort,
							onChange: (e) => setSort(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Recommended" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Price low to high" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Price high to low" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Category" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "chip-row",
							children: shopCategories.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-pressed": category === item,
								className: category === item ? "active" : "",
								onClick: () => setCategory(item),
								children: item
							}, item))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Size" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "chip-row",
							children: [
								"XS",
								"S",
								"M",
								"L",
								"XL"
							].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-pressed": shopFilters.size === item,
								className: shopFilters.size === item ? "active" : "",
								onClick: () => setShopFilters((current) => ({
									...current,
									size: current.size === item ? DEFAULT_SHOP_FILTERS.size : item
								})),
								children: item
							}, item))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Colour" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "filter-swatches",
							children: filterColors.map(([label, color]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-label": label,
								"aria-pressed": shopFilters.color === color,
								className: shopFilters.color === color ? "active" : "",
								style: { background: color },
								onClick: () => setShopFilters((current) => ({
									...current,
									color: current.color === color ? DEFAULT_SHOP_FILTERS.color : color
								}))
							}, color))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Price" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "chip-row",
							children: [
								"Under N$800",
								"N$800 to N$1,500",
								"Over N$1,500"
							].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-pressed": shopFilters.price === item,
								className: shopFilters.price === item ? "active" : "",
								onClick: () => setShopFilters((current) => ({
									...current,
									price: current.price === item ? DEFAULT_SHOP_FILTERS.price : item
								})),
								children: item
							}, item))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Designer" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "chip-row",
							children: seededDesignerNames.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-pressed": shopFilters.designer === item,
								className: shopFilters.designer === item ? "active" : "",
								onClick: () => setShopFilters((current) => ({
									...current,
									designer: current.designer === item ? DEFAULT_SHOP_FILTERS.designer : item
								})),
								children: item
							}, item))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Location" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "chip-row",
							children: shopLocations.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-pressed": shopFilters.location === item,
								className: shopFilters.location === item ? "active" : "",
								onClick: () => setShopFilters((current) => ({
									...current,
									location: current.location === item ? DEFAULT_SHOP_FILTERS.location : item
								})),
								children: item
							}, item))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Delivery" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "chip-row",
							children: [
								"Nationwide",
								"Store collection",
								"Fast delivery"
							].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-pressed": shopFilters.delivery === item,
								className: shopFilters.delivery === item ? "active" : "",
								onClick: () => setShopFilters((current) => ({
									...current,
									delivery: current.delivery === item ? DEFAULT_SHOP_FILTERS.delivery : item
								})),
								children: item
							}, item))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "gradient-button full",
							onClick: () => setFiltersOpen(false),
							children: [
								"Show ",
								filtered.length,
								" ",
								filtered.length === 1 ? "piece" : "pieces"
							]
						})
					]
				})
			}),
			pendingOutfitAdd && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sheet-backdrop",
				onClick: () => setPendingOutfitAdd(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "filter-sheet outfit-size-sheet",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": "Choose outfit sizes",
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sheet-handle" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "sheet-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "FIT PASSPORT CHECK" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Choose outfit sizes" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setPendingOutfitAdd(null),
								children: "Cancel"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"Your saved size is unavailable for ",
							pendingOutfitAdd.selectionProductIds.length,
							" ",
							pendingOutfitAdd.selectionProductIds.length === 1 ? "piece" : "pieces",
							". Choose a stocked size before adding the look."
						] }),
						pendingOutfitAdd.selectionProductIds.map((productId) => {
							const product = productById.get(productId);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: product.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "chip-row",
								children: product.sizes.map((size, index) => product.stock[index] > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-label": `Select ${size} for ${product.name}`,
									"aria-pressed": outfitSizeSelections[product.id] === size,
									className: outfitSizeSelections[product.id] === size ? "active" : "",
									onClick: () => setOutfitSizeSelections((current) => ({
										...current,
										[product.id]: size
									})),
									children: [size, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [product.stock[index], " left"] })]
								}, size))
							})] }, productId);
						}),
						pendingOutfitAdd.unavailableCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "selection-warning",
							children: [
								pendingOutfitAdd.unavailableCount,
								" unavailable ",
								pendingOutfitAdd.unavailableCount === 1 ? "piece will" : "pieces will",
								" be skipped."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "gradient-button full",
							disabled: pendingOutfitAdd.selectionProductIds.some((productId) => !outfitSizeSelections[productId]),
							onClick: () => commitOutfitAdd(pendingOutfitAdd.outfitId, outfitSizeSelections, pendingOutfitAdd.productIds),
							children: "Add selected items"
						})
					]
				})
			}),
			sizeGuideOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sheet-backdrop",
				onClick: () => setSizeGuideOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "filter-sheet utility-sheet",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": "Size guide",
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "sheet-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "FIT PASSPORT" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Size guide" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-label": "Close size guide",
								onClick: () => setSizeGuideOpen(false),
								children: "Close"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Find your best starting size" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Compare your usual size with the product fit, then use the stock buttons on the product page. Fit Passport recommendations are guidance, not a guarantee." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "size-guide-grid",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "XS–S" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Closer fit" })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "M" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Regular fit" })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "L–XL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Roomier fit" })] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "gradient-button full",
							onClick: () => setSizeGuideOpen(false),
							children: [
								"Use ",
								profile.size,
								" as my starting size"
							]
						})
					]
				})
			}),
			addressEditor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sheet-backdrop",
				onClick: () => setAddressEditor(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "filter-sheet utility-sheet address-editor",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": addressEditor.index === null ? "Add address" : "Edit address",
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "sheet-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: addressEditor.index === null ? "Add address" : "Edit address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-label": "Close address editor",
								onClick: () => setAddressEditor(null),
								children: "Cancel"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Address label" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							"aria-label": "Address label",
							value: addressEditor.label,
							onChange: (event) => setAddressEditor((current) => current ? {
								...current,
								label: event.target.value
							} : current)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Street address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							"aria-label": "Street address",
							value: addressEditor.street,
							onChange: (event) => setAddressEditor((current) => current ? {
								...current,
								street: event.target.value
							} : current)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Town or city" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							"aria-label": "Town or city",
							value: addressEditor.city,
							onChange: (event) => setAddressEditor((current) => current ? {
								...current,
								city: event.target.value
							} : current)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "gradient-button full",
							disabled: !addressEditor.label.trim() || !addressEditor.street.trim() || !addressEditor.city.trim(),
							onClick: saveAddress,
							children: "Save address"
						})
					]
				})
			}),
			toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "toast",
				role: "status",
				"aria-live": "polite",
				"aria-atomic": "true",
				children: toast
			})
		]
	});
}
//#endregion
export { matchesStoreSlug as i, buildProduct as n, SellerApp as r, StylishMeApp as t };

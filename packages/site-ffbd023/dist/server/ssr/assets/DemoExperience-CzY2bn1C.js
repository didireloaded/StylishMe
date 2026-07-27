import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
import { r as SellerApp, t as StylishMeApp } from "./StylishMeApp-DnmL4EcL.js";
//#region app/DemoExperience.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var tours = {
	customer: [
		{
			eyebrow: "DISCOVER",
			title: "Start with inspiration, not a crowded catalogue.",
			copy: "Browse outfit stories, new arrivals, local designers and carefully chosen edits from Namibia.",
			image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=84"
		},
		{
			eyebrow: "STYLE ME",
			title: "Turn an occasion into a complete look.",
			copy: "Choose where you are going, your budget and preferences. StylishMe brings together pieces you can actually shop.",
			image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=84"
		},
		{
			eyebrow: "SHOP CONFIDENTLY",
			title: "Find the right piece, fit and fulfilment.",
			copy: "Compare sizes, colours and stock, then choose delivery or store collection before placing an order.",
			image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=84"
		},
		{
			eyebrow: "YOUR STYLISHME",
			title: "Keep outfits, favourites and orders together.",
			copy: "Your wardrobe remembers saved looks and purchases, while delivery orders show progress clearly.",
			image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=84"
		}
	],
	seller: [
		{
			eyebrow: "YOUR STOREFRONT",
			title: "Bring your brand story into StylishMe.",
			copy: "Create a dedicated store for your label, boutique or merch and share it directly with customers.",
			image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=84"
		},
		{
			eyebrow: "YOUR COLLECTION",
			title: "Add pieces with every detail customers need.",
			copy: "Publish photography, descriptions, sizes, colours, stock, prices and delivery choices from one guided flow.",
			image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=84"
		},
		{
			eyebrow: "DIRECT LINKS",
			title: "Share only your store or a single product.",
			copy: "A customer opening your link lands inside your collection, with a clear route back to the wider marketplace.",
			image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=84"
		},
		{
			eyebrow: "THE DAY AT A GLANCE",
			title: "See what is selling and what needs attention.",
			copy: "Follow orders, collection readiness, delivery fulfilment and stock without the experience feeling technical.",
			image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=84"
		}
	]
};
var joinUrl = (role) => `/signin-with-chatgpt?return_to=${encodeURIComponent(`/?join=${role}`)}`;
function DemoExperience() {
	const [role, setRole] = (0, import_react.useState)(null);
	const [stage, setStage] = (0, import_react.useState)("choose");
	const [slide, setSlide] = (0, import_react.useState)(0);
	const choose = (next) => {
		setRole(next);
		setSlide(0);
		setStage("tour");
		window.scrollTo({ top: 0 });
	};
	if (stage === "explore" && role) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "demo-explore-shell",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "demo-explore-bar",
			"aria-label": `${role} demo controls`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [role.toUpperCase(), " DEMO"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Explore safely — changes stay inside this preview." })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setStage("choose"),
					children: "Switch view"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: joinUrl(role),
					children: ["Sign up as ", role === "seller" ? "a vendor" : "a customer"]
				})
			]
		}), role === "seller" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SellerApp, { demoMode: true }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StylishMeApp, {
			user: null,
			demoMode: true
		})]
	});
	if (stage === "choose" || !role) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "demo-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "demo-shell demo-choice",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => window.location.assign("/"),
					children: "STYLISHME"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "INTERACTIVE PREVIEW" })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "demo-intro",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "SEE IT FROM BOTH SIDES" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Meet StylishMe before you join." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Choose the experience that matters to you. You can take a short guided tour, explore the working preview and switch sides at any time." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "demo-role-grid",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => choose("customer"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: tours.customer[0].image,
								alt: ""
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "01" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "I’M HERE TO SHOP" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Explore as a customer" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Discover looks, stores and designers, then try the shopping journey." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Start customer tour →" })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => choose("seller"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: tours.seller[0].image,
								alt: ""
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "02" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "I SELL FASHION" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Explore as a seller" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "See how a store, collection, orders and shareable links come together." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Start seller tour →" })
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "demo-note",
					children: "No account is needed for the preview. Nothing you change here is published."
				})
			]
		})
	});
	const item = tours[role][slide];
	const last = slide === tours[role].length - 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "demo-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "demo-shell demo-tour",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => setStage("choose"),
				children: "← Choose another view"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [role.toUpperCase(), " TOUR"] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "demo-tour-photo",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: item.image,
					alt: ""
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: String(slide + 1).padStart(2, "0") })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "demo-tour-copy",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.eyebrow }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: item.title }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: item.copy }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "demo-progress",
						"aria-label": `Step ${slide + 1} of ${tours[role].length}`,
						children: tours[role].map((step, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: index <= slide ? "active" : "" }, step.eyebrow))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "demo-actions",
						children: [
							slide > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setSlide((value) => value - 1),
								children: "Back"
							}),
							!last && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary",
								onClick: () => setSlide((value) => value + 1),
								children: "Next"
							}),
							last && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary",
								onClick: () => setStage("explore"),
								children: "Explore the working demo"
							})
						]
					}),
					!last ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "demo-skip",
						onClick: () => setStage("explore"),
						children: "Skip to the demo"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						className: "demo-join",
						href: joinUrl(role),
						children: ["Ready? Sign up as ", role === "seller" ? "a vendor" : "a customer"]
					})
				]
			})] })]
		})
	});
}
//#endregion
export { DemoExperience as default };

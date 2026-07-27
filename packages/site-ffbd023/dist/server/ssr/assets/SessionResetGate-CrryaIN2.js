import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/session-reset.ts
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var ACCOUNT_RESET_MARKER = `stylishme-session-reset:2026-07-23-v1`;
function clearStylishMeSession(storage) {
	if (storage.getItem(ACCOUNT_RESET_MARKER) === "complete") return false;
	Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key) => Boolean(key?.startsWith("stylishme-"))).forEach((key) => storage.removeItem(key));
	storage.setItem(ACCOUNT_RESET_MARKER, "complete");
	return true;
}
//#endregion
//#region app/SessionResetGate.tsx
var import_jsx_runtime = require_jsx_runtime();
function SessionResetGate({ children, signedIn, returnTo }) {
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (clearStylishMeSession(window.localStorage) && signedIn) {
			window.location.replace(`/signout-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`);
			return;
		}
		const timer = window.setTimeout(() => setReady(true), 0);
		return () => window.clearTimeout(timer);
	}, [returnTo, signedIn]);
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "entry-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "entry-shell entry-loading",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "STYLISHME" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Namibian fashion, personally yours." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ONE MOMENT" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Preparing a fresh StylishMe." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Your previous app session is being cleared safely." })
			] })]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		"data-session-reset": ACCOUNT_RESET_MARKER,
		children
	});
}
//#endregion
export { SessionResetGate as default };

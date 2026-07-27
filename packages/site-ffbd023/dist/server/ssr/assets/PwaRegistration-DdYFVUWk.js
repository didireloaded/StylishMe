import { a as require_react, o as __toESM } from "../index.js";
//#region app/PwaRegistration.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function PwaRegistration() {
	(0, import_react.useEffect)(() => {
		if (!("serviceWorker" in navigator)) return;
		const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => void 0);
		if (document.readyState === "complete") {
			register();
			return;
		}
		window.addEventListener("load", register, { once: true });
		return () => window.removeEventListener("load", register);
	}, []);
	return null;
}
//#endregion
export { PwaRegistration };

(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "68276d29-354b-42f6-84cd-f9a0bcb537da", e._sentryDebugIdIdentifier = "sentry-dbid-68276d29-354b-42f6-84cd-f9a0bcb537da");
	} catch {}
})();
import { ShellActionsContext as e, __toESM as t, require_react as n } from "./peach-app.js";
// src/react/settings/use-check-receipt.ts
var r = /* @__PURE__ */ t(n(), 1);
function i() {
	let t = (0, r.useContext)(e);
	return {
		checked: (e) => t?.receipt(e),
		checkFailed: (e, n) => t?.failure(e, Error(n))
	};
}
export { i as useCheckReceipt };

//# debugId=68276d29-354b-42f6-84cd-f9a0bcb537da
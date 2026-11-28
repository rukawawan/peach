(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "11272977-e7cd-491d-893b-caa5a74e0737", e._sentryDebugIdIdentifier = "sentry-dbid-11272977-e7cd-491d-893b-caa5a74e0737");
	} catch {}
})();
import { require_jsx_runtime as e, spinnerHtml as t } from "./peach-app.js";
// src/react/components/action-spinner.tsx
var n = e(), r = { __html: t("") };
function i({ className: e }) {
	return /* @__PURE__ */ (0, n.jsx)("span", {
		className: e,
		"aria-hidden": !0,
		dangerouslySetInnerHTML: r
	});
}
export { i as ActionSpinner };

//# debugId=11272977-e7cd-491d-893b-caa5a74e0737
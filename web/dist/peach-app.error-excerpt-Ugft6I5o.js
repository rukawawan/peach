(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "744b989b-be24-4168-9991-650587f49f70", e._sentryDebugIdIdentifier = "sentry-dbid-744b989b-be24-4168-9991-650587f49f70");
	} catch {}
})();
import { Button as e, __toESM as t, cardClass as n, readableErrorHeadline as r, require_jsx_runtime as i, require_react as a, t as o, useOverlayScrollbar as s } from "./peach-app.js";
// src/react/activity/error-excerpt.tsx
var c = /* @__PURE__ */ t(a(), 1), l = i();
function u({ children: e, label: t, id: r }) {
	let i = s();
	return /* @__PURE__ */ (0, l.jsx)("div", {
		"data-error-details": "",
		className: n({
			bordered: "soft",
			radius: "surface",
			padding: "none",
			className: "relative w-full min-w-0 overflow-hidden bg-background-tertiary-default"
		}),
		children: /* @__PURE__ */ (0, l.jsx)("div", {
			ref: i,
			id: r,
			role: "region",
			"aria-label": t,
			tabIndex: 0,
			className: "max-h-80 overflow-y-auto overscroll-contain p-3 text-body-2-regular whitespace-pre-line wrap-anywhere text-text-primary",
			children: e
		})
	});
}
function d({ text: t, className: n = "" }) {
	let [i, a] = (0, c.useState)(!1), s = (0, c.useId)(), d = String(t || "").trim(), f = r(d);
	if (!f) return null;
	let p = f !== d;
	return /* @__PURE__ */ (0, l.jsxs)("div", {
		"data-error-excerpt": "",
		className: `flex min-w-0 max-w-full flex-col items-start gap-1 ${n}`,
		children: [i ? /* @__PURE__ */ (0, l.jsx)(u, {
			id: s,
			label: o("manage:errorExcerpt.fullDetails"),
			children: d
		}) : /* @__PURE__ */ (0, l.jsx)("p", {
			className: "w-full wrap-anywhere",
			children: f
		}), p ? /* @__PURE__ */ (0, l.jsx)(e, {
			variant: "ghost",
			size: "small",
			"data-error-details-toggle": "",
			className: "-ml-2",
			"aria-expanded": i,
			"aria-controls": i ? s : void 0,
			onClick: () => a(!i),
			children: o(i ? "manage:errorExcerpt.hideDetails" : "manage:errorExcerpt.showDetails")
		}) : null]
	});
}
export { u as ErrorDetails, d as ErrorExcerpt };

//# debugId=744b989b-be24-4168-9991-650587f49f70
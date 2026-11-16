(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "628b0393-a428-4b7b-8d09-2c335aa95877", e._sentryDebugIdIdentifier = "sentry-dbid-628b0393-a428-4b7b-8d09-2c335aa95877");
	} catch {}
})();
import { Button as e, __toESM as t, cardClass as n, cx as r, require_jsx_runtime as i, require_react as a, showToast$1 as o, t as s, useOverlayScrollbar as c } from "./peach-app.js";
// src/react/components/code-block.tsx
var l = /* @__PURE__ */ t(a(), 1), u = i();
function d({ code: t, language: i, label: a, maxCharacters: d, bounded: f = !0, copyLabel: p, onCopy: m }) {
	let h = c(), [g, _] = (0, l.useState)(""), [v, y] = (0, l.useState)(!1);
	(0, l.useEffect)(() => {
		_(""), y(!1);
	}, [t]);
	let b = d !== void 0 && t.length > d, x = async () => {
		try {
			await navigator.clipboard.writeText(t), y(!1), _(s("shell:shared.copied")), m?.(), o("code-copy", {
				html: s("shell:shared.copied"),
				alert: !1,
				timeout: 4e3,
				action: null
			});
		} catch {
			y(!0), _(s("shell:codeBlock.copyFailed"));
		}
	};
	return /* @__PURE__ */ (0, u.jsxs)("div", {
		className: r(n({
			bordered: "soft",
			radius: "plain",
			padding: "none"
		}), "overflow-hidden bg-background-tertiary-default"),
		"data-code-block": !0,
		children: [
			/* @__PURE__ */ (0, u.jsxs)("div", {
				className: "flex min-w-0 items-center justify-between gap-3 border-b border-separator-border px-3 py-2",
				children: [/* @__PURE__ */ (0, u.jsx)("span", {
					className: "text-caption-1-medium text-text-secondary",
					children: i.toUpperCase()
				}), /* @__PURE__ */ (0, u.jsx)(e, {
					variant: "secondary",
					size: "small",
					onClick: () => void x(),
					children: p || s(b ? "shell:codeBlock.copyAll" : "shell:codeBlock.copyCode")
				})]
			}),
			/* @__PURE__ */ (0, u.jsx)("div", {
				className: "relative min-w-0",
				children: /* @__PURE__ */ (0, u.jsx)("pre", {
					ref: h,
					tabIndex: 0,
					"aria-label": a,
					className: r("m-0 overflow-auto overscroll-contain p-3 font-mono text-caption-1-regular whitespace-pre text-text-primary", f && "max-h-80"),
					children: /* @__PURE__ */ (0, u.jsx)("code", { children: d === void 0 ? t : t.slice(0, d) })
				})
			}),
			g ? /* @__PURE__ */ (0, u.jsx)("p", {
				role: v ? "alert" : "status",
				className: "m-0 px-3 pb-2 text-caption-1-regular text-text-secondary",
				children: g
			}) : null
		]
	});
}
export { d as CodeBlock };

//# debugId=628b0393-a428-4b7b-8d09-2c335aa95877
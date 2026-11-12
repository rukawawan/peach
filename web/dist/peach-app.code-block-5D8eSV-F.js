(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "11ae844c-eb83-4e62-ab86-aca9f1df9dc5", e._sentryDebugIdIdentifier = "sentry-dbid-11ae844c-eb83-4e62-ab86-aca9f1df9dc5");
	} catch {}
})();
import { Button as e, __toESM as t, cardClass as n, cx as r, require_jsx_runtime as i, require_react as a, showToast$1 as o, useOverlayScrollbar as s } from "./peach-app.js";
// src/react/components/code-block.tsx
var c = /* @__PURE__ */ t(a(), 1), l = i();
function u({ code: t, language: i, label: a, maxCharacters: u, bounded: d = !0, copyLabel: f, onCopy: p }) {
	let m = s(), [h, g] = (0, c.useState)(""), [_, v] = (0, c.useState)(!1);
	(0, c.useEffect)(() => {
		g(""), v(!1);
	}, [t]);
	let y = u !== void 0 && t.length > u, b = async () => {
		try {
			await navigator.clipboard.writeText(t), v(!1), g("已复制"), p?.(), o("code-copy", {
				html: "已复制",
				alert: !1,
				timeout: 4e3,
				action: null
			});
		} catch {
			v(!0), g("复制失败，请选中文本复制。");
		}
	};
	return /* @__PURE__ */ (0, l.jsxs)("div", {
		className: r(n({
			bordered: "soft",
			radius: "plain",
			padding: "none"
		}), "overflow-hidden bg-background-tertiary-default"),
		"data-code-block": !0,
		children: [
			/* @__PURE__ */ (0, l.jsxs)("div", {
				className: "flex min-w-0 items-center justify-between gap-3 border-b border-separator-border px-3 py-2",
				children: [/* @__PURE__ */ (0, l.jsx)("span", {
					className: "text-caption-1-medium text-text-secondary",
					children: i.toUpperCase()
				}), /* @__PURE__ */ (0, l.jsx)(e, {
					variant: "secondary",
					size: "small",
					onClick: () => void b(),
					children: f || (y ? "复制完整内容" : "复制代码")
				})]
			}),
			/* @__PURE__ */ (0, l.jsx)("div", {
				className: "relative min-w-0",
				children: /* @__PURE__ */ (0, l.jsx)("pre", {
					ref: m,
					tabIndex: 0,
					"aria-label": a,
					className: r("m-0 overflow-auto overscroll-contain p-3 font-mono text-caption-1-regular whitespace-pre text-text-primary", d && "max-h-80"),
					children: /* @__PURE__ */ (0, l.jsx)("code", { children: u === void 0 ? t : t.slice(0, u) })
				})
			}),
			h ? /* @__PURE__ */ (0, l.jsx)("p", {
				role: _ ? "alert" : "status",
				className: "m-0 px-3 pb-2 text-caption-1-regular text-text-secondary",
				children: h
			}) : null
		]
	});
}
export { u as CodeBlock };

//# debugId=11ae844c-eb83-4e62-ab86-aca9f1df9dc5
(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "53705dcd-74f2-42db-9de1-5b6aca191738", e._sentryDebugIdIdentifier = "sentry-dbid-53705dcd-74f2-42db-9de1-5b6aca191738");
	} catch {}
})();
import { Button as e, __toESM as t, cardClass as n, cx as r, require_jsx_runtime as i, require_react as a, t as o, useOverlayScrollbar as s } from "./peach-app.js";
// src/react/components/code-block.tsx
var c = /* @__PURE__ */ t(a(), 1), l = i();
function u({ code: t, language: i, label: a, maxCharacters: u, bounded: d = !0, copyLabel: f, onCopy: p }) {
	let m = s(), [h, g] = (0, c.useState)(!1), [_, v] = (0, c.useState)(!1), y = (0, c.useRef)(void 0);
	(0, c.useEffect)(() => (g(!1), v(!1), () => clearTimeout(y.current)), [t]);
	let b = u !== void 0 && t.length > u, x = async () => {
		try {
			await navigator.clipboard.writeText(t), v(!1), g(!0), p?.(), clearTimeout(y.current), y.current = setTimeout(() => g(!1), 4e3);
		} catch {
			clearTimeout(y.current), g(!1), v(!0);
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
				}), /* @__PURE__ */ (0, l.jsxs)("div", {
					className: "flex min-w-0 flex-wrap items-center justify-end gap-x-2",
					children: [/* @__PURE__ */ (0, l.jsx)("span", {
						role: "status",
						className: "text-caption-1-regular text-text-secondary empty:sr-only",
						children: h ? o("shell:shared.copied") : null
					}), /* @__PURE__ */ (0, l.jsx)(e, {
						variant: "secondary",
						size: "small",
						onClick: () => void x(),
						children: f || o(b ? "shell:codeBlock.copyAll" : "shell:codeBlock.copyCode")
					})]
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
			_ ? /* @__PURE__ */ (0, l.jsx)("p", {
				role: "alert",
				className: "m-0 px-3 pb-2 text-caption-1-regular text-text-secondary",
				children: o("shell:codeBlock.copyFailed")
			}) : null
		]
	});
}
export { u as CodeBlock };

//# debugId=53705dcd-74f2-42db-9de1-5b6aca191738
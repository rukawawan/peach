(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "244feddb-c16c-4894-b4aa-b44532e034c1", e._sentryDebugIdIdentifier = "sentry-dbid-244feddb-c16c-4894-b4aa-b44532e034c1");
	} catch {}
})();
import { PillTabList as e, __toESM as t, cx as n, require_jsx_runtime as r, require_react as i, useHorizontalScroller as a } from "./peach-app.js";
// src/react/components/section-toc.css
var o = /* @__PURE__ */ t(i(), 1), s = r();
function c({ label: t, entries: r, children: i, inline: c = !1 }) {
	let l = (0, o.useRef)(null), u = a(), [d, f] = (0, o.useState)(r[0]?.id ?? ""), p = JSON.stringify(r.map((e) => e.id));
	return (0, o.useEffect)(() => {
		let e = 0, t = JSON.parse(p).map((e) => document.getElementById(e)).filter((e) => !!e), n = () => {
			e = 0;
			let n = t[0]?.id ?? "";
			for (let e of t) {
				let t = parseFloat(getComputedStyle(e).scrollMarginTop) + parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
				e.getBoundingClientRect().top <= t + 1 && (n = e.id);
			}
			window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2 && (n = t.at(-1)?.id ?? n), f(n);
		}, r = () => {
			e ||= requestAnimationFrame(n);
		}, i = document.getElementById(location.hash.slice(1));
		i && l.current?.contains(i) && i.scrollIntoView({ block: "start" }), n(), window.addEventListener("scroll", r, { passive: !0 }), window.addEventListener("resize", r);
		let a = new ResizeObserver(r);
		return a.observe(l.current), () => {
			window.removeEventListener("scroll", r), window.removeEventListener("resize", r), a.disconnect(), cancelAnimationFrame(e);
		};
	}, [p]), (0, o.useEffect)(() => {
		let e = l.current?.querySelector("nav"), t = e?.querySelector("[aria-current]");
		e && t && (t.offsetTop < e.scrollTop ? e.scrollTop = t.offsetTop : t.offsetTop + t.offsetHeight > e.scrollTop + e.clientHeight && (e.scrollTop = t.offsetTop + t.offsetHeight - e.clientHeight), t.offsetLeft < e.scrollLeft ? e.scrollLeft = t.offsetLeft : t.offsetLeft + t.offsetWidth > e.scrollLeft + e.clientWidth && (e.scrollLeft = t.offsetLeft + t.offsetWidth - e.clientWidth));
	}, [d]), /* @__PURE__ */ (0, s.jsxs)("div", {
		ref: l,
		"data-section-page": c ? "inline" : "",
		children: [/* @__PURE__ */ (0, s.jsx)("nav", {
			ref: u,
			"aria-label": t,
			"data-section-toc": "",
			children: /* @__PURE__ */ (0, s.jsx)(e, {
				"data-section-toc-items": "",
				"data-pill-nav": "",
				children: r.map((e) => /* @__PURE__ */ (0, s.jsxs)("a", {
					href: `#${e.id}`,
					"aria-current": d === e.id ? "location" : void 0,
					"data-pill-selected": d === e.id ? "" : void 0,
					"data-pill-variant": "gray",
					className: n("relative z-1 flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-body-regular text-text-secondary", "outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring", d === e.id && "text-text-primary"),
					children: [e.icon, /* @__PURE__ */ (0, s.jsx)("span", { children: e.label })]
				}, e.id))
			})
		}), /* @__PURE__ */ (0, s.jsx)("div", {
			"data-toc-content": "",
			className: "flex min-w-0 flex-col gap-8",
			children: i
		})]
	});
}
export { c as SectionToc };

//# debugId=244feddb-c16c-4894-b4aa-b44532e034c1
// node_modules/@zumer/snapdom/dist/snapdom.mjs
(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "e36ba388-e926-494a-a4dc-fea192dc6332", e._sentryDebugIdIdentifier = "sentry-dbid-e36ba388-e926-494a-a4dc-fea192dc6332");
	} catch {}
})();
var e = Object.defineProperty, t = (e, t, n) => () => {
	if (n) throw n[0];
	try {
		return e && (t = e(e = 0)), t;
	} catch (e) {
		throw n = [e], e;
	}
}, n = (t, n) => {
	for (var r in n) e(t, r, {
		get: n[r],
		enumerable: !0
	});
};
function r(e) {
	return e === !1 || typeof e == "string" && e.toLowerCase().trim() === "disabled" ? "disabled" : "soft";
}
function i(e = "soft") {
	e === "disabled" && (o.computedStyle = /* @__PURE__ */ new WeakMap(), o.measureHints = /* @__PURE__ */ new WeakMap(), o.baseStyle = new a(50), o.defaultStyle = new a(64), o.image = new a(100), o.background = new a(100), o.resource = new a(150), o.compress = /* @__PURE__ */ new Map());
}
var a, o, s = t(() => {
	a = class extends Map {
		constructor(e = 100, ...t) {
			super(...t), this._maxSize = e;
		}
		set(e, t) {
			if (this.size >= this._maxSize && !this.has(e)) {
				let e = this.keys().next().value;
				e !== void 0 && this.delete(e);
			}
			return super.set(e, t);
		}
	}, o = {
		image: new a(100),
		background: new a(100),
		resource: new a(150),
		defaultStyle: new a(64),
		baseStyle: new a(50),
		compress: /* @__PURE__ */ new Map(),
		computedStyle: /* @__PURE__ */ new WeakMap(),
		measureHints: /* @__PURE__ */ new WeakMap(),
		warnedReconcile: !1
	};
});
function c(e) {
	let t = e.match(/url\((['"]?)(.*?)(\1)\)/);
	if (!t) return null;
	let n = t[2].trim();
	return n.startsWith("#") ? null : n;
}
function l(e) {
	let t = [], n = 0, r = 0, i = "";
	for (let a = 0; a < e.length; a++) {
		let o = e[a];
		o === "\\" ? a++ : i ? o === i && (i = "") : o === "\"" || o === "'" ? i = o : o === "(" ? r++ : o === ")" ? r-- : o === "," && r === 0 && (t.push(e.slice(n, a)), n = a + 1);
	}
	return t.push(e.slice(n)), t;
}
function u(e, t = 1) {
	let n = e.match(/^\s*-?(?:webkit-)?image-set\(([\s\S]*)\)\s*$/i);
	if (!n) return null;
	let r = [];
	for (let e of l(n[1])) {
		let t = e.match(/url\((['"]?)(.*?)(\1)\)/);
		if (!t) continue;
		let n = e.match(/type\(\s*["']([^"']+)["']\s*\)/i);
		if (n && !w.test(n[1].trim())) continue;
		let i = e.replace(/url\((['"]?)[\s\S]*?\1\)/, " ").match(/(\d+(?:\.\d+)?)\s*(x|dpi|dppx)\b/i), a = 1;
		if (i) {
			let e = parseFloat(i[1]);
			a = /dpi/i.test(i[2]) ? e / 96 : e;
		}
		r.push({
			url: t[2].trim(),
			dppx: a
		});
	}
	return r.length ? (r.sort((e, t) => e.dppx - t.dppx), (r.find((e) => e.dppx >= t) || r[r.length - 1]).url) : null;
}
function d(e) {
	if (!e || e === "none") return "";
	let t = e.replace(/translate[XY]?\([^)]*\)/g, "");
	return t = t.replace(/matrix\(([^)]+)\)/g, (e, t) => {
		let n = t.split(",").map((e) => e.trim());
		return n.length === 6 ? (n[4] = "0", n[5] = "0", `matrix(${n.join(", ")})`) : `matrix(${t})`;
	}), t = t.replace(/matrix3d\(([^)]+)\)/g, (e, t) => {
		let n = t.split(",").map((e) => e.trim());
		return n.length === 16 ? (n[12] = "0", n[13] = "0", `matrix3d(${n.join(", ")})`) : `matrix3d(${t})`;
	}), t.trim().replace(/\s{2,}/g, " ");
}
function f(e, t) {
	if (!t) return e;
	let [n, r, i] = t.zoomed, a = e.indexOf("</style>") + 8;
	if (a < 8 || !e.startsWith(n) || !e.startsWith(r, a) || !e.endsWith(i)) return e;
	let [o, s, c] = t.flat;
	return o + e.slice(n.length, a) + s + e.slice(a + r.length, e.length - i.length) + c;
}
function p(e) {
	if (/%[0-9A-Fa-f]{2}/.test(e)) return e;
	try {
		return encodeURI(e);
	} catch {
		return e;
	}
}
function m(e, t) {
	if (!e || /^(data|blob|about|#)/i.test(e.trim())) return e;
	try {
		let n = t || typeof document < "u" && (document.baseURI || document.location?.href) || "http://localhost/";
		return new URL(e, n).href;
	} catch {
		return e;
	}
}
function h(e) {
	return !!e && e.tagName === "INPUT" && (e.getAttribute("type") || "").toLowerCase() === "password";
}
function g(e) {
	return "•".repeat(String(e ?? "").length);
}
function _(e, t) {
	return e?.nodeType === 1 && e.localName === t;
}
function v(e) {
	return e?.nodeType === 1 && e.namespaceURI === T;
}
function y(e) {
	return e?.nodeType === 1 && e.namespaceURI === E;
}
function b(e) {
	return e?.nodeType === 11 && !!e.host;
}
function x(e) {
	let t = e?.parentNode;
	return t?.nodeType === 11 ? t.host : null;
}
function S(e) {
	return e?.nodeType === 9;
}
var C, w, T, E, D = t(() => {
	C = /^image\/(jpeg|jpg|png|gif|webp|avif|apng|svg\+xml|bmp|x-icon|vnd\.microsoft\.icon)\s*(;|$)/i, w = C, T = "http://www.w3.org/1999/xhtml", E = "http://www.w3.org/2000/svg";
});
function O(e = "[SnapDOM]", { ttlMs: t = 3e5, maxEntries: n = 12 } = {}) {
	let r = /* @__PURE__ */ new Map(), i = 0;
	function a(a, o, s) {
		if (i >= n) return;
		let c = Date.now();
		(r.get(o) || 0) > c || (r.set(o, c + t), i++, a === "warn" && console && console.warn ? console.warn(`${e} ${s}`) : console && console.error && console.error(`${e} ${s}`));
	}
	return {
		warnOnce(e, t) {
			a("warn", e, t);
		},
		errorOnce(e, t) {
			a("error", e, t);
		},
		reset() {
			r.clear(), i = 0;
		}
	};
}
function k(e, t, n) {
	if (ie.size >= re) {
		let e = Date.now();
		for (let [t, n] of ie) n.until <= e && ie.delete(t);
		for (; ie.size >= re;) ie.delete(ie.keys().next().value);
	}
	ie.set(e, {
		until: Date.now() + n,
		result: t
	});
}
function A(e) {
	return /^data:|^blob:|^about:blank$/i.test(e);
}
function j(e, t) {
	try {
		let n = typeof location < "u" && location.href ? location.href : "http://localhost/", r = t.split(/\{url(?:Raw)?\}/)[0], i = new URL(r || ".", n);
		if (new URL(e, n).origin === i.origin) return !0;
	} catch {}
	return !1;
}
function M(e, t) {
	if (!t || A(e) || j(e, t)) return !1;
	try {
		let t = typeof location < "u" && location.href ? location.href : "http://localhost/", n = new URL(e, t);
		return typeof location < "u" ? n.origin !== location.origin : !0;
	} catch {
		return !!t;
	}
}
function ee(e, t) {
	return t ? /\{url(?:Raw)?\}/.test(t) ? t.replace("{urlRaw}", () => p(e)).replace("{url}", () => encodeURIComponent(e)) : /[?&]url=?$/.test(t) ? `${t}${encodeURIComponent(e)}` : t.endsWith("?") ? `${t}url=${encodeURIComponent(e)}` : t.endsWith("/") ? `${t}${p(e)}` : `${t}${t.includes("?") ? "&" : "?"}url=${encodeURIComponent(e)}` : e;
}
function N(e) {
	return new Promise((t, n) => {
		let r = new FileReader();
		r.onload = () => t(String(r.result || "").replace(/^data:[^,]*/, (e) => e.replace(/\s+/g, ""))), r.onerror = () => n(/* @__PURE__ */ Error("read_failed")), r.readAsDataURL(e);
	});
}
function P(e, t) {
	return new Headers(t.headers || {}).keys().next().done ? JSON.stringify([
		t.as || "blob",
		t.timeout ?? 3e3,
		t.useProxy || "",
		t.errorTTL ?? 8e3,
		t.credentials || "",
		e
	]) : null;
}
function F(e) {
	try {
		return new URL(e, globalThis.location?.href || "http://localhost/").origin;
	} catch {
		return "invalid-url";
	}
}
function I(e, t) {
	try {
		e.onError?.(t);
	} catch {}
}
async function L(e, t = {}) {
	let n = t.as ?? "blob", r = t.timeout ?? 3e3, i = t.useProxy || "", a = t.errorTTL ?? 8e3, o = t.headers || {}, s = !!t.debug;
	if (/^data:/i.test(e)) try {
		if (n === "text") return {
			ok: !0,
			data: String(e),
			status: 200,
			url: e,
			fromCache: !1
		};
		if (n === "dataURL") return {
			ok: !0,
			data: String(e),
			status: 200,
			url: e,
			fromCache: !1,
			mime: String(e).slice(5).split(";")[0] || ""
		};
		let [, t = "", r = ""] = String(e).match(/^data:([^,]*),(.*)$/) || [], i = /;base64/i.test(t) ? atob(r) : decodeURIComponent(r), a = new Uint8Array([...i].map((e) => e.charCodeAt(0))), o = new Blob([a], { type: (t || "").split(";")[0] || "" });
		return {
			ok: !0,
			data: o,
			status: 200,
			url: e,
			fromCache: !1,
			mime: o.type || ""
		};
	} catch {
		return {
			ok: !1,
			data: null,
			status: 0,
			url: e,
			fromCache: !1,
			reason: "special_url_error"
		};
	}
	if (/^blob:/i.test(e)) try {
		let t = await fetch(e);
		if (!t.ok) return {
			ok: !1,
			data: null,
			status: t.status,
			url: e,
			fromCache: !1,
			reason: "http_error"
		};
		let r = await t.blob(), i = r.type || t.headers.get("content-type") || "";
		return n === "dataURL" ? {
			ok: !0,
			data: await N(r),
			blob: r,
			status: t.status,
			url: e,
			fromCache: !1,
			mime: i
		} : n === "text" ? {
			ok: !0,
			data: await r.text(),
			status: t.status,
			url: e,
			fromCache: !1,
			mime: i
		} : {
			ok: !0,
			data: r,
			status: t.status,
			url: e,
			fromCache: !1,
			mime: i
		};
	} catch {
		return {
			ok: !1,
			data: null,
			status: 0,
			url: e,
			fromCache: !1,
			reason: "network"
		};
	}
	if (/^about:blank$/i.test(e)) return n === "dataURL" ? {
		ok: !0,
		data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
		status: 200,
		url: e,
		fromCache: !1,
		mime: "image/png"
	} : {
		ok: !0,
		data: n === "text" ? "" : new Blob([]),
		status: 200,
		url: e,
		fromCache: !1
	};
	let c, l;
	try {
		c = P(e, {
			as: n,
			timeout: r,
			useProxy: i,
			errorTTL: a,
			credentials: t.credentials,
			headers: o
		}), l = M(e, i) ? ee(e, i) : e;
	} catch {
		let n = {
			ok: !1,
			data: null,
			status: 0,
			url: e,
			fromCache: !1,
			reason: "network"
		};
		return I(t, n), n;
	}
	let u = ie.get(c);
	if (u && u.until > Date.now()) return {
		...u.result,
		fromCache: !0
	};
	u && ie.delete(c);
	let d = ne.get(c);
	if (d) return d;
	let f = t.credentials;
	if (!f) try {
		let t = typeof location < "u" && location.href ? location.href : "http://localhost/", n = new URL(e, t);
		f = typeof location < "u" && n.origin === location.origin ? "same-origin" : "omit";
	} catch {
		f = "omit";
	}
	let p = new AbortController(), m = setTimeout(() => p.abort("timeout"), r), h = (async () => {
		try {
			let r = await fetch(l, {
				signal: p.signal,
				credentials: f,
				headers: o
			});
			if (!r.ok) {
				let i = {
					ok: !1,
					data: null,
					status: r.status,
					url: l,
					fromCache: !1,
					reason: "http_error"
				};
				if (c !== null && a > 0 && k(c, i, a), s) {
					let t = `${r.status} ${r.statusText || ""}`.trim();
					te.warnOnce(`http:${r.status}:${n}:${F(e)}`, `Couldn't load ${e} (HTTP ${t}).`);
				}
				return I(t, i), i;
			}
			if (n === "text") return {
				ok: !0,
				data: await r.text(),
				status: r.status,
				url: l,
				fromCache: !1
			};
			let i = await r.blob(), u = i.type || r.headers.get("content-type") || "";
			return n === "dataURL" ? {
				ok: !0,
				data: await N(i),
				blob: i,
				status: r.status,
				url: l,
				fromCache: !1,
				mime: u
			} : {
				ok: !0,
				data: i,
				status: r.status,
				url: l,
				fromCache: !1,
				mime: u
			};
		} catch (i) {
			let o = p.signal.aborted ? p.signal.reason === "timeout" ? "timeout" : "abort" : i && typeof i == "object" && i.name === "AbortError" ? "abort" : "network", u = {
				ok: !1,
				data: null,
				status: 0,
				url: l,
				fromCache: !1,
				reason: o
			};
			if (c !== null && !/^blob:/i.test(e) && a > 0 && k(c, u, a), s) {
				let t = `${o}:${n}:${F(e)}`, i = o === "timeout" ? `Timed out loading ${e} after ${r}ms. Raise the timeout option or set useProxy.` : o === "abort" ? `Loading ${e} was cancelled.` : `Couldn't load ${e} (network or CORS). Try the useProxy option.`;
				te.errorOnce(t, i);
			}
			return I(t, u), u;
		} finally {
			clearTimeout(m), ne.delete(c);
		}
	})();
	return c !== null && ne.set(c, h), h;
}
var te, ne, re, ie, R = t(() => {
	D(), te = O("[SnapDOM]", {
		ttlMs: 18e4,
		maxEntries: 10
	}), ne = /* @__PURE__ */ new Map(), re = 50, ie = /* @__PURE__ */ new Map();
});
async function ae(e, t = {}) {
	if (/^\s*url\(\s*['"]?data:/i.test(e) || /^((repeating-)?(linear|radial|conic)-gradient)\(/i.test(e) || e.trim() === "none") return e;
	let n = u(e, typeof devicePixelRatio < "u" && devicePixelRatio || 1) ?? c(e);
	if (!n) return e;
	let r = p(m(n)), i = (t.useProxy || "") + "|" + r, a = o.background.get(i);
	if (a) return `url("${a}")`;
	let s = await L(r, {
		as: "dataURL",
		useProxy: t.useProxy,
		debug: t.debug
	});
	return s.ok ? (o.background.set(i, s.data), `url("${s.data}")`) : "none";
}
var oe = t(() => {
	s(), D(), R();
});
function se(e, t) {
	if (Ce.has(t)) e.add(t);
	else if (t.startsWith("transform-origin-")) e.add("transform-origin");
	else return !1;
	return !0;
}
function ce(e) {
	let t = e.replace(Le, "$1").trim();
	return t ? t.replace(/(^|,)(\s*)(?=,|$)/g, "$1$2*") : "*";
}
function le(e, t, n, r) {
	for (let i = 0; i < e.length; i++) {
		if (--r.budget < 0) return !1;
		let a = e[i], o = a.style, s = a.selectorText, c = !1, l = !1, u = !1, d = !1, f = !1, p = !1, m = !1, h = r.siblingFn && o ? o.cssText : null, g = h === null || h.includes("!important");
		if (o) {
			let e = !!s && Oe.test(s);
			e && a.cssRules?.length && (f = !0);
			for (let n = 0; n < o.length; n++) {
				let i = o[n];
				if (t.add(i), d ||= je.has(i), (i.charCodeAt(0) === 98 ? Ae.test(i) : i === "all") && (p = !0, i.endsWith("-color") && i.charCodeAt(1) === 111 && !ke.test(o.getPropertyValue(i)) && (m = !0)), r.svgGeometry && (se(r.svgGeometry, i) ? c = !0 : we.test(i) && (l = !0)), e && (r.pseudoProps.add(i), f ||= Re.test(i)), i === "container-type" && o.getPropertyValue(i) !== "normal" && (u = !0), g && o.getPropertyPriority(i) && r.importantProps.add(i), !r.leaksAcrossSubtrees && (i === "all" || i[0] === "c" && (i.startsWith("counter-") || i === "content" && o.getPropertyValue("content").includes("counter"))) && (r.leaksAcrossSubtrees = !0), i.length > 5 && (i[0] === "m" || i[0] === "p")) {
					let e = i.startsWith("margin") ? "marginUnstable" : i.startsWith("padding") ? "paddingUnstable" : null;
					e && !r[e] && Fe.test(o.getPropertyValue(i)) && (r[e] = !0);
				}
			}
		}
		let _ = s;
		if (_ && _.includes(":has(") && (r.usesHas = !0), !r.leaksAcrossSubtrees && _ && ze.test(_) && (r.leaksAcrossSubtrees = !0), _ && _.includes("&")) for (let e = a.parentRule; e && _.includes("&"); e = e.parentRule) e.selectorText && (_ = _.replace(/&/g, `:is(${e.selectorText})`));
		let v = h !== null && h.includes("sibling-");
		if (_ && (v || u || r.inContainer || Ve.test(_) || _.includes("+") || _.includes("~"))) for (let e of ye(_, ",")) {
			let t = e.trim();
			if (t && (v || u || r.inContainer || Ve.test(t) || t.includes("+") || t.includes("~"))) {
				let e = t.replace(/::part\([^)]*\)/g, "") || "*";
				r.shareUnsafeSels.add(Oe.test(e) ? ce(e) : e);
			}
		}
		if ((c || l) && ue(a, _, c, r), p && r.chromeSels && !r.mediaOff && a.keyText === void 0 && (!_ || r.inScope ? r.chromeAll = !0 : (pe(_, r.chromeSels), m && pe(_, r.borderColorSels))), d && r.scrollSels && (!_ || r.inScope ? r.scrollAll = !0 : de(_, r.scrollSels)), _ && _.includes(":")) for (let e in Ie) (e === "before" || e === "after") && !f || Ie[e].test(_) && n[e].push(ce(_));
		if (a.styleSheet) {
			if (!he(a.styleSheet, t, n, r)) return !1;
		} else if (a.cssRules && a.cssRules.length) {
			let e = a.constructor?.name === "CSSContainerRule", i = a.constructor?.name === "CSSScopeRule";
			e && (r.inContainer++, r.leaksAcrossSubtrees = !0), i && (r.inScope = (r.inScope || 0) + 1);
			let o = fe(a, r);
			o && r.mediaOff++;
			let s = le(a.cssRules, t, n, r);
			if (o && r.mediaOff--, e && r.inContainer--, i && r.inScope--, !s) return !1;
		}
	}
	return !0;
}
function ue(e, t, n, r) {
	n && e.constructor?.name === "CSSKeyframeRule" ? r.svgKeyframes = !0 : !t || r.inScope ? n && (r.svgGeometryAll = !0) : de(t, n ? r.svgGeometrySels : r.svgAnimSels);
}
function de(e, t) {
	for (let n of ye(e, ",")) {
		let e = n.trim();
		e && t.add(Oe.test(e) ? ce(e) : e);
	}
}
function fe(e, t) {
	if (!t.view) return !1;
	let n = e.media?.mediaText;
	try {
		return !!e.disabled || !!n && !t.view.matchMedia(n).matches;
	} catch {
		return !1;
	}
}
function pe(e, t) {
	for (let n of ye(e, ",")) {
		let e = n.trim();
		e && !e.includes("::") && !Oe.test(e) && t.add(e);
	}
}
function me(e, t) {
	try {
		return e.cssRules;
	} catch {
		return t?.(e);
	}
}
function he(e, t, n, r) {
	let i = me(e, r.crossOriginRules);
	if (!i) return !1;
	let a = r.siblingFn, o = e.ownerNode;
	r.siblingFn = r.siblingSupport && (o?.localName !== "style" || o.textContent.includes("sibling-"));
	let s = fe(e, r);
	s && r.mediaOff++;
	let c = le(i, t, n, r);
	return s && r.mediaOff--, r.siblingFn = a, c;
}
function ge(e, t) {
	for (let n of e) {
		let e = n.effect?.getKeyframes?.() || [];
		for (let n of e) for (let e of Object.keys(n)) e === "offset" || e === "easing" || e === "composite" || e === "computedOffset" || t.add(e.replace(/[A-Z]/g, (e) => "-" + e.toLowerCase()));
	}
}
function _e(e) {
	let t = /* @__PURE__ */ new Set();
	return he(e, t, {
		before: [],
		after: [],
		firstLetter: [],
		marker: [],
		firstLine: []
	}, {
		budget: Pe,
		usesHas: !1,
		leaksAcrossSubtrees: !1,
		shareUnsafeSels: /* @__PURE__ */ new Set(),
		inContainer: 0,
		marginUnstable: !1,
		paddingUnstable: !1,
		importantProps: /* @__PURE__ */ new Set(),
		pseudoProps: /* @__PURE__ */ new Set()
	}) ? t : null;
}
function ve(e, t) {
	let n = [], r = e.adoptedStyleSheets;
	for (let i of [e.styleSheets, Array.isArray(r) ? r : []]) for (let e of i) {
		let r = me(e, t);
		if (!r) return null;
		let i = r.length;
		for (let e = 0; e < i; e++) {
			let t = r[e].type;
			if (t === 3) return null;
			if (t !== 0) break;
		}
		if (n.push(r, i, r[0], r[i - 1]), i <= Be) for (let e = 0; e < i; e++) n.push(r[e].cssRules?.length);
	}
	if (typeof e.getAnimations == "function") {
		let t = /* @__PURE__ */ new Set();
		ge(e.getAnimations(), t), n.push(Array.from(t).sort().join());
	}
	return n;
}
function ye(e, t) {
	if (!e.includes(t)) return [e];
	let n = [], r = 0, i = null, a = 0;
	for (let o = 0; o < e.length; o++) {
		let s = e[o];
		s === "\\" ? o++ : i ? s === i && (i = null) : s === "\"" || s === "'" ? i = s : s === "(" || s === "[" ? r++ : s === ")" || s === "]" ? r-- : r === 0 && s === t && (n.push(e.slice(a, o)), a = o + 1);
	}
	return n.push(e.slice(a)), n;
}
function be(e) {
	let t = 0, n = null, r = 0;
	for (let i = 0; i < e.length; i++) {
		let a = e[i];
		n ? a === n && e[i - 1] !== "\\" && (n = null) : a === "\"" || a === "'" ? n = a : a === "(" || a === "[" ? t++ : a === ")" || a === "]" ? t-- : t === 0 && (a === " " || a === ">" || a === "+" || a === "~") && (r = i + 1);
	}
	let i = "", a = 0;
	for (let t of e.slice(r)) t === "(" || t === "[" ? a++ : t === ")" || t === "]" ? a-- : a === 0 && (i += t);
	let o = (e) => !e || /\\[0-9a-fA-F]/.test(e) ? null : e.replace(/\\(.)/g, "$1"), s = o((i.match(/\.((?:\\.|[\w-])+)/) || [])[1]);
	if (s) return "c" + s;
	let c = o((i.match(/#((?:\\.|[\w-])+)/) || [])[1]);
	if (c) return "i" + c;
	let l = (i.match(/^([a-zA-Z][\w-]*)/) || [])[1];
	return l ? "t" + l.toLowerCase() : null;
}
function xe(e, t) {
	if (!t.length) return "";
	if (t.some((e) => e.includes("&"))) return null;
	let n = t.join(",");
	try {
		return e.matches(n), n;
	} catch {
		return null;
	}
}
function z(e, t) {
	let n = {};
	for (let r in t) {
		let i = t[r];
		(r === "before" || r === "after") && i.push("q"), n[r] = i.some((e) => e.includes(":scope")) ? null : xe(e, i);
	}
	return n;
}
function Se(e, t, n = Pe) {
	let r = {
		universe: null,
		pseudoUniverse: null,
		svgGeometry: null,
		svgGeometrySel: null,
		usesHas: !0,
		leaksAcrossSubtrees: !0,
		shareGate: null,
		marginUnstable: !0,
		paddingUnstable: !0,
		importantProps: null,
		scrollGate: null,
		chromeGate: null,
		borderColorGate: null,
		pseudoGates: {
			before: null,
			after: null,
			firstLetter: null,
			marker: null,
			firstLine: null
		}
	};
	try {
		let i = new Set(Te), a = {
			before: [],
			after: [],
			firstLetter: [],
			marker: [],
			firstLine: []
		}, o = {
			budget: Pe,
			usesHas: !1,
			leaksAcrossSubtrees: !1,
			shareUnsafeSels: /* @__PURE__ */ new Set(),
			inContainer: 0,
			marginUnstable: !1,
			paddingUnstable: !1,
			importantProps: /* @__PURE__ */ new Set(),
			pseudoProps: /* @__PURE__ */ new Set(),
			svgGeometry: /* @__PURE__ */ new Set(),
			svgGeometrySels: /* @__PURE__ */ new Set(),
			svgAnimSels: /* @__PURE__ */ new Set(),
			svgKeyframes: !1,
			svgGeometryAll: !1,
			scrollSels: /* @__PURE__ */ new Set(),
			scrollAll: !1,
			chromeSels: /* @__PURE__ */ new Set(),
			borderColorSels: /* @__PURE__ */ new Set(),
			chromeAll: !1,
			mediaOff: 0,
			view: e.defaultView,
			inScope: 0,
			crossOriginRules: t,
			siblingSupport: CSS.supports("opacity", "calc(sibling-index() / 2)")
		}, s = e.adoptedStyleSheets, c = Array.isArray(s) ? [...e.styleSheets, ...s] : Array.from(e.styleSheets), l = 0;
		for (let e of c) {
			let n = me(e, t);
			if (!n) return r;
			l += n.length;
		}
		if (l > Pe) return r;
		if (l > n) return {
			...r,
			declined: l
		};
		for (let e of c) if (!he(e, i, a, o)) return r;
		if (typeof e.getAnimations == "function") {
			let t = /* @__PURE__ */ new Set();
			ge(e.getAnimations(), t);
			for (let e of t) i.add(e), se(o.svgGeometry, e) && (o.svgGeometryAll = !0), je.has(e) && (o.scrollAll = !0);
		}
		if (o.svgKeyframes) for (let e of o.svgAnimSels) o.svgGeometrySels.add(e);
		let u = e.createElement("div"), d = o.svgGeometryAll ? null : xe(u, Array.from(o.svgGeometrySels)), f = Array.from(o.shareUnsafeSels), p = xe(u, f) === null ? null : f.map((e) => ({
			sel: e,
			key: be(e)
		})), m = new Set(De);
		for (let e of Ee) i.has(e) && m.add(e);
		for (let e of o.pseudoProps) m.add(e);
		(o.pseudoProps.has("transform") || o.pseudoProps.has("rotate") || o.pseudoProps.has("scale")) && m.add("transform-origin"), o.pseudoProps.has("perspective") && m.add("perspective-origin");
		let h = o.scrollAll ? null : xe(u, [...Ne, ...o.scrollSels]), g = o.chromeAll ? null : xe(u, [...o.chromeSels]), _ = o.chromeAll ? null : xe(u, [...o.borderColorSels]);
		return {
			universe: i,
			pseudoUniverse: m,
			svgGeometry: o.svgGeometry,
			svgGeometrySel: d,
			pseudoGates: z(u, a),
			usesHas: o.usesHas,
			leaksAcrossSubtrees: o.leaksAcrossSubtrees,
			shareGate: p,
			marginUnstable: o.marginUnstable,
			paddingUnstable: o.paddingUnstable,
			importantProps: o.importantProps,
			scrollGate: h,
			chromeGate: g,
			borderColorGate: _
		};
	} catch {
		return r;
	}
}
var Ce, we, Te, Ee, De, Oe, ke, Ae, je, Me, Ne, Pe, Fe, Ie, Le, Re, ze, Be, Ve, He, Ue = t(() => {
	Ce = /* @__PURE__ */ new Set([
		"r",
		"cx",
		"cy",
		"rx",
		"ry",
		"x",
		"y",
		"width",
		"height",
		"d",
		"transform",
		"translate",
		"rotate",
		"scale",
		"transform-origin",
		"transform-box",
		"vector-effect"
	]), we = /^(?:animation|transition)/, Te = /* @__PURE__ */ "display.position.top.right.bottom.left.float.clear.z-index.box-sizing.width.height.min-width.min-height.max-width.max-height.margin-top.margin-right.margin-bottom.margin-left.padding-top.padding-right.padding-bottom.padding-left.overflow-x.overflow-y.visibility.opacity.content-visibility.vertical-align.border-top-width.border-right-width.border-bottom-width.border-left-width.border-top-style.border-right-style.border-bottom-style.border-left-style.border-top-color.border-right-color.border-bottom-color.border-left-color.border-top-left-radius.border-top-right-radius.border-bottom-right-radius.border-bottom-left-radius.flex-direction.flex-wrap.flex-grow.flex-shrink.flex-basis.order.align-items.align-self.align-content.justify-content.justify-items.justify-self.row-gap.column-gap.grid-template-columns.grid-template-rows.grid-auto-flow.grid-auto-columns.grid-auto-rows.grid-column-start.grid-column-end.grid-row-start.grid-row-end.color.font-family.font-size.font-weight.font-style.font-stretch.line-height.letter-spacing.word-spacing.white-space.text-align.text-transform.text-indent.text-overflow.text-shadow.direction.unicode-bidi.writing-mode.text-orientation.word-break.overflow-wrap.tab-size.list-style-type.list-style-position.list-style-image.counter-reset.counter-increment.counter-set.background-color.background-image.background-size.background-position.background-repeat.background-clip.background-origin.background-attachment.box-shadow.outline-width.outline-style.outline-color.outline-offset.transform.transform-origin.rotate.scale.translate.filter.mix-blend-mode.clip-path.object-fit.object-position.border-collapse.border-spacing.table-layout.caption-side.empty-cells".split("."), Ee = /* @__PURE__ */ "color.font-family.font-size.font-weight.font-style.font-stretch.font-variant.font-kerning.font-feature-settings.font-variation-settings.line-height.letter-spacing.word-spacing.white-space.text-align.text-align-last.text-indent.text-transform.text-shadow.text-rendering.direction.unicode-bidi.word-break.overflow-wrap.writing-mode.text-orientation.hyphens.tab-size.visibility.list-style-type.list-style-position.list-style-image.border-collapse.border-spacing.caption-side.empty-cells.quotes.color-scheme.-webkit-text-fill-color.-webkit-font-smoothing.image-rendering".split("."), De = [
		"display",
		"width",
		"height",
		"min-width",
		"min-height"
	], Oe = /(?:^|[^\\])::?(?:before|after|first-letter|first-line|marker)/, ke = /^(?:currentcolor|initial|unset|revert|revert-layer)?$/i, Ae = /^(?:background|border)(?:$|-(?!collapse|spacing))/, je = /* @__PURE__ */ new Set([
		"overflow",
		"overflow-x",
		"overflow-y",
		"overflow-block",
		"overflow-inline",
		"all"
	]), Me = /* @__PURE__ */ new Set([
		"input",
		"textarea",
		"select",
		"dialog",
		"foreignObject",
		"body",
		"marquee"
	]), Ne = [
		...Me,
		"[popover]",
		"[overflow]",
		"[style*=\"overflow\" i]",
		"[style*=\"all\" i]"
	], Pe = 2e4, Fe = /%|\bauto\b|calc\(|var\(/i, Ie = {
		before: /(?:^|[^\\])::?before\b/,
		after: /(?:^|[^\\])::?after\b/,
		firstLetter: /(?:^|[^\\])::?first-letter\b/,
		marker: /(?:^|[^\\])::marker\b/,
		firstLine: /(?:^|[^\\])::?first-line\b/
	}, Le = /(\\.)|::?(?:before|after|first-letter|first-line|marker)\b/g, Re = /^(?:content|all|(?:animation|transition)(?:-.*)?)$/, ze = /[+~]|:has\(|:nth-(?:last-)?child\([^)]*\bof\b/i, Be = 64, Ve = /:(nth-|first-child|last-child|only-|first-of-type|last-of-type|empty|hover|focus|active|target|checked|indeterminate|disabled|enabled|read-only|read-write|placeholder-shown|autofill|valid|invalid|user-valid|user-invalid|in-range|out-of-range|required|optional|default|link|any-link|scope|defined|modal|fullscreen|picture-in-picture|playing|paused|muted|seeking|buffering|stalled|volume-locked|open|popover-open|state\(|dir\(|lang\(|has\()/, He = RegExp(Ve.source.replace("hover|focus|active|", "") + "|[+~]|@container|container-|\\dcq[whibm]|:host(?:-context)?\\(|::slotted\\(|sibling-|random\\(");
});
function B(e) {
	return qe.add(e), e.setAttribute("data-snapdom-internal", ""), e;
}
function We(e) {
	return qe.has(e);
}
function Ge(e, t, n) {
	let r = Je.get(e);
	r ? r[1] = n : Je.set(e, [t, n]);
}
function Ke(e, t) {
	let n = Je.get(e);
	return n ? t === n[0] || t === n[1] || (Je.delete(e), !1) : !1;
}
var qe, Je, V = t(() => {
	qe = /* @__PURE__ */ new WeakSet(), Je = /* @__PURE__ */ new WeakMap();
});
function Ye(e, t = null) {
	if (e = String(e).toLowerCase(), _t.has(e)) {
		let t = {};
		return o.defaultStyle.set(e, t), t;
	}
	let n = o.defaultStyle.get(e);
	if (n) {
		let e = vt.get(n);
		if (e) {
			if (!t) $e(n, e.probe, null), vt.delete(n);
			else if (e.done.get(t) !== t.size) {
				for (let r of t) if (!(r in n) && yt.has(r)) {
					$e(n, e.probe, t);
					break;
				}
				e.done.set(t, t.size);
			}
		}
		return n;
	}
	let r = document.createElement(e.includes("-") ? "span" : e);
	return r.style.all = "initial", n = {}, $e(n, r, t), t && vt.set(n, {
		probe: r,
		done: new WeakMap([[t, t.size]])
	}), o.defaultStyle.set(e, n), n;
}
function Xe() {
	let e = [...document.querySelectorAll("#snapdom-sandbox")].find(We);
	return e || (e = document.createElement("div"), B(e), e.id = "snapdom-sandbox", e.setAttribute("data-snapdom-sandbox", "true"), e.setAttribute("aria-hidden", "true"), e.style.position = "absolute", e.style.left = "-9999px", e.style.top = "-9999px", e.style.width = "0px", e.style.height = "0px", e.style.overflow = "hidden", document.body.appendChild(e)), e;
}
function Ze(e, t) {
	let n = `${e.localName} ${e.type} ${e.disabled} ${t}`, r = o.defaultStyle.get(n);
	if (!r) {
		let i = document.createElement(e.localName);
		e.localName === "input" && (i.type = e.type), i.disabled = e.disabled, i.style.cssText = `all:revert;color-scheme:${t}`;
		let a = Xe();
		a.appendChild(i);
		let s = getComputedStyle(i);
		r = {};
		for (let e of s) Ae.test(e) && (r[e] = s.getPropertyValue(e));
		a.removeChild(i), o.defaultStyle.set(n, r);
	}
	return r;
}
function Qe(e) {
	let t = `${e.localName} ${e.type} border`, n = o.defaultStyle.get(t);
	if (n === void 0) {
		let r = document.createElement(e.localName.includes("-") ? "span" : e.localName);
		e.localName === "input" && (r.type = e.type), r.style.cssText = "all:revert;color:rgb(1, 2, 3)";
		let i = Xe();
		i.appendChild(r), n = getComputedStyle(r).getPropertyValue("border-top-color") === "rgb(1, 2, 3)", i.removeChild(r), o.defaultStyle.set(t, n);
	}
	return n;
}
function $e(e, t, n) {
	let r = Xe();
	r.appendChild(t);
	let i = getComputedStyle(t);
	if (!yt) {
		yt = /* @__PURE__ */ new Set();
		for (let e of i) et(e) || yt.add(e);
		for (let e of Te) et(e) || yt.add(e);
	}
	let a = (t) => {
		!(t in e) && yt.has(t) && (e[t] = i.getPropertyValue(t));
	};
	if (!n) yt.forEach(a);
	else if (bt.forEach(a), jt.forEach(a), n instanceof Set) n.forEach(a);
	else for (let e in n) a(e);
	r.removeChild(t);
}
function et(e) {
	let t = wt.get(e);
	if (t === void 0) {
		let n = String(e).toLowerCase();
		t = Ct.has(n) || St.test(n) || xt.test(n), wt.set(e, t);
	}
	return t;
}
function tt(e, t) {
	let n = jt.get(e);
	if (n === void 0 || t[n] !== t[e]) return !1;
	let r = t["writing-mode"];
	if (r && r !== "horizontal-tb") return !1;
	let i = t.direction;
	return !(i && i !== "ltr");
}
function nt(e, t) {
	return !Dt.has(e) && (t === "inline" || Tt.has(e) || Et.has(e));
}
function rt(e, t, n) {
	let r = (t.display || "").toLowerCase();
	if (r === "inline" || Et.has(e)) return !1;
	if (n) return !0;
	if ((t.float || "none").toLowerCase() !== "none") return !1;
	let i = (t.position || "static").toLowerCase();
	return i === "absolute" || i === "fixed" ? !1 : !Nt.has(r);
}
function it(e) {
	return Vt.set(e, (et(e) ? Pt : 0) | (jt.has(e) ? Ft : 0) | (Ot.has(e) ? It : 0) | (At.has(e) ? Lt : 0) | (e === "height" || e === "block-size" ? Rt : 0) | (e === "width" || e === "inline-size" ? zt : 0)), Ht.push(e), Vt.get(e);
}
function at(e, t) {
	let n = Ut[e >> 6];
	Ut[e >> 6] = n === void 0 ? t : n < t ? n + ";" + t : t + ";" + n;
}
function ot(e, t, n = !0, r = !1, i = "", a = null) {
	if (t = String(t || "").toLowerCase(), _t.has(t)) return "";
	let o = Ht.length, s = Ye(t, a), c = vt.get(s), l = (t) => {
		let n = s[t];
		return n !== void 0 || !c || !yt.has(t) ? n : ($e(s, c.probe, e), s[t]);
	}, u = (e.display || "").toLowerCase(), d = u === "inline", f = nt(t, u), p = e["text-wrap-mode"] || e["white-space"] || "", m = p === "nowrap" || p === "pre", h = f && n && !(f && n && !d && m), g = !1, _ = h || kt.has(t);
	for (let t in e) {
		let n = Vt.get(t);
		if (n === void 0 && Vt.set(t, n = it(t)), (n & Bt) === 0) {
			let r = e[t];
			r && r !== l(t) && (Ut[n >> 6] = `${t}:${r}`);
			continue;
		}
		if (n & Pt || n & Ft && tt(t, e)) continue;
		let r = i && t === "min-width" ? i : e[t];
		if (!(n & It && _)) {
			if (h && n & Lt) {
				r && r !== l(t) && (at(n, `${t}:${r}`), r !== "auto" && (g = !0));
				continue;
			}
			if (r && r !== l(t)) {
				if ((n & Rt || n & zt && !m) && r.endsWith("px") && r.includes(".")) {
					let e = parseFloat(r);
					if (Number.isFinite(e)) {
						at(n, `${t}:${(e + Mt).toFixed(3)}px`);
						continue;
					}
				}
				at(n, `${t}:${r}`);
			}
		}
	}
	let v = Vt.get("min-width") ?? it("min-width");
	if (h && !d && !r && !g) {
		let t = e.width;
		t && t !== "auto" && t !== s.width && at(v, `min-width:${t}`);
	}
	i && !("min-width" in e) && i !== s["min-width"] && at(v, `min-width:${i}`);
	let y = [];
	for (let e = 0; e < Ut.length; e++) Ut[e] !== void 0 && (y.push(Ut[e]), Ut[e] = void 0);
	if (Ht.length !== o) {
		Ht.sort((e, t) => e + ":" < t + ":" ? -1 : 1);
		for (let e = 0; e < Ht.length; e++) Vt.set(Ht[e], Vt.get(Ht[e]) & Bt | e << 6);
		return ot(e, t, n, r, i, a);
	}
	return y.join(";");
}
function st(e) {
	let t = /* @__PURE__ */ new Set();
	return e.nodeType !== Node.ELEMENT_NODE && e.nodeType !== Node.DOCUMENT_FRAGMENT_NODE ? [] : (e.tagName && t.add(e.tagName.toLowerCase()), typeof e.querySelectorAll == "function" && e.querySelectorAll("*").forEach((e) => t.add(e.tagName.toLowerCase())), Array.from(t));
}
function ct(e, t = null) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = Ye(r, t);
		if (!e) continue;
		let i = (t ? Object.entries(e).filter(([e]) => t.has(e)) : Object.entries(e)).filter(([t]) => !tt(t, e)).map(([e, t]) => `${e}:${t};`).sort(), a = i.join("");
		a && (n.has(a) || n.set(a, {
			tagList: [],
			declarations: i
		}), n.get(a).tagList.push(r));
	}
	let r = [...n.values()], i = null;
	for (let { declarations: e } of r) {
		let t = new Set(e);
		if (!i) i = t;
		else for (let e of i) t.has(e) || i.delete(e);
	}
	i ??= /* @__PURE__ */ new Set();
	let a = "";
	if (i.size && r.length > 1) {
		let e = r.flatMap((e) => e.tagList);
		a += `${e.join(",")} { ${[...i].join("")} }
`;
	}
	for (let { tagList: e, declarations: t } of r) {
		let n = r.length > 1 ? t.filter((e) => !i.has(e)) : t;
		if (!n.length) continue;
		let o = n.join("");
		a += `${e.join(",")} { ${o} }
`;
	}
	return a;
}
function lt(e) {
	let t = Array.from(new Set(e.values())).filter(Boolean).sort(), n = /* @__PURE__ */ new Map(), r = 1;
	for (let e of t) n.set(e, `c${r++}`);
	return n;
}
function ut(e) {
	try {
		let t = e?.ownerDocument;
		if (!t) return typeof window < "u" ? window : null;
		let n = t.defaultView;
		if (n && typeof n.getComputedStyle == "function") return n;
		if (typeof window < "u" && window.frames) for (let e = 0; e < window.frames.length; e++) try {
			if (window.frames[e]?.document === t) return window.frames[e];
		} catch {}
	} catch {}
	return typeof window < "u" ? window : null;
}
function dt() {
	let e = {
		length: 0,
		getPropertyValue: () => "",
		item: () => ""
	};
	return e[Symbol.iterator] = function* () {}, e;
}
function ft(e, t) {
	let n = ut(e), r = null;
	try {
		r = n && typeof n.getComputedStyle == "function" ? n.getComputedStyle(e, t) : null;
	} catch {}
	if (!r && typeof window < "u" && typeof window.getComputedStyle == "function") try {
		e.ownerDocument === document && (r = window.getComputedStyle(e, t));
	} catch {}
	return r || dt();
}
function H(e, t = null) {
	if (e?.nodeType !== 1) {
		let n = typeof window < "u" ? window : null;
		if (n && typeof n.getComputedStyle == "function") try {
			return n.getComputedStyle(e, t) || dt();
		} catch {
			return dt();
		}
		return dt();
	}
	let n = o.computedStyle.get(e);
	if (n || o.computedStyle.set(e, n = ft(e, null)), t === null) return n;
	let r = o.computedStyle.get(n);
	r || o.computedStyle.set(n, r = /* @__PURE__ */ new Map());
	let i = r.get(t);
	return i || r.set(t, i = ft(e, t)), i;
}
function pt(e) {
	if (Gt) return Gt;
	let t = Array.from(e).filter((e) => !et(e));
	return t.length ? Gt = t : t;
}
function mt(e, t = null) {
	let n = {};
	for (let r of t || pt(e)) {
		let t = e.getPropertyValue(r);
		t && (n[r] = t);
	}
	for (let e of Wt) {
		let t = n[`border-${e}-style`], r = n[`border-${e}-width`];
		(t === "none" || t === "hidden" || r === "0px") && (delete n[`border-${e}-style`], delete n[`border-${e}-width`], delete n[`border-${e}-color`]);
	}
	return n;
}
function ht(e) {
	let t = [], n = 0, r = 0, i = "";
	for (let a = 0; a < e.length; a++) {
		let o = e[a];
		o === "\\" ? a++ : i ? o === i && (i = "") : ((o === "\"" || o === "'") && (i = o), o === "(" && n++, o === ")" && n--, o === "," && n === 0 && (t.push(e.slice(r, a).trim()), r = a + 1));
	}
	return t.push(e.slice(r).trim()), t;
}
var gt, _t, vt, yt, bt, xt, St, Ct, wt, Tt, Et, Dt, Ot, kt, At, jt, Mt, Nt, Pt, Ft, It, Lt, Rt, zt, Bt, Vt, Ht, Ut, Wt, Gt, Kt = t(() => {
	s(), Ue(), V(), gt = /* @__PURE__ */ new Set([
		"meta",
		"script",
		"noscript",
		"title",
		"link",
		"template"
	]), _t = /* @__PURE__ */ new Set(/* @__PURE__ */ "meta.link.style.title.noscript.script.template.g.defs.use.marker.mask.clipPath.pattern.symbol.path.polygon.polyline.line.circle.ellipse.rect.filter.lineargradient.radialgradient.stop".split(".")), vt = /* @__PURE__ */ new WeakMap(), yt = null, bt = [
		...Te,
		"text-decoration-line",
		"text-decoration-color",
		"text-decoration-style",
		"text-decoration-thickness",
		"text-underline-offset",
		"text-decoration-skip-ink",
		"-webkit-text-stroke",
		"-webkit-text-stroke-width",
		"-webkit-text-stroke-color",
		"paint-order",
		"font-feature-settings",
		"font-variation-settings",
		"font-kerning",
		"font-variant",
		"font-variant-ligatures",
		"font-optical-sizing",
		"-webkit-text-fill-color",
		"text-wrap-mode"
	], xt = /(?:^|-)(animation|transition)(?:-|$)/i, St = /^(--.+|view-timeline|scroll-timeline|animation-trigger|offset-|position-try|app-region|interactivity|overlay|view-transition|-webkit-locale|-webkit-user-(?:drag|modify)|-webkit-tap-highlight-color|-webkit-text-security)$/i, Ct = /* @__PURE__ */ new Set([
		"cursor",
		"pointer-events",
		"touch-action",
		"user-select",
		"print-color-adjust",
		"speak",
		"reading-flow",
		"reading-order",
		"anchor-name",
		"anchor-scope",
		"container-name",
		"container-type",
		"timeline-scope",
		"stroke-color"
	]), wt = /* @__PURE__ */ new Map(), Tt = /* @__PURE__ */ new Set([
		"span",
		"small",
		"em",
		"strong",
		"b",
		"i",
		"u",
		"s",
		"code",
		"cite",
		"mark",
		"sub",
		"sup"
	]), Et = /* @__PURE__ */ new Set([
		"table",
		"thead",
		"tbody",
		"tfoot",
		"tr",
		"td",
		"th"
	]), Dt = /* @__PURE__ */ new Set([
		"img",
		"video",
		"canvas",
		"svg",
		"iframe",
		"embed",
		"object",
		"input",
		"textarea",
		"select"
	]), Ot = /* @__PURE__ */ new Set([
		"width",
		"max-width",
		"inline-size",
		"max-inline-size"
	]), kt = /* @__PURE__ */ new Set([
		"mi",
		"mn",
		"mo",
		"ms",
		"mtext"
	]), At = /* @__PURE__ */ new Set(["min-width", "min-inline-size"]), jt = new Map(Object.entries({
		"block-size": "height",
		"inline-size": "width",
		"min-block-size": "min-height",
		"min-inline-size": "min-width",
		"max-block-size": "max-height",
		"max-inline-size": "max-width",
		"margin-block-start": "margin-top",
		"margin-block-end": "margin-bottom",
		"margin-inline-start": "margin-left",
		"margin-inline-end": "margin-right",
		"padding-block-start": "padding-top",
		"padding-block-end": "padding-bottom",
		"padding-inline-start": "padding-left",
		"padding-inline-end": "padding-right",
		"inset-block-start": "top",
		"inset-block-end": "bottom",
		"inset-inline-start": "left",
		"inset-inline-end": "right",
		"border-block-start-width": "border-top-width",
		"border-block-start-style": "border-top-style",
		"border-block-start-color": "border-top-color",
		"border-block-end-width": "border-bottom-width",
		"border-block-end-style": "border-bottom-style",
		"border-block-end-color": "border-bottom-color",
		"border-inline-start-width": "border-left-width",
		"border-inline-start-style": "border-left-style",
		"border-inline-start-color": "border-left-color",
		"border-inline-end-width": "border-right-width",
		"border-inline-end-style": "border-right-style",
		"border-inline-end-color": "border-right-color",
		"border-start-start-radius": "border-top-left-radius",
		"border-start-end-radius": "border-top-right-radius",
		"border-end-start-radius": "border-bottom-left-radius",
		"border-end-end-radius": "border-bottom-right-radius",
		"overflow-block": "overflow-y",
		"overflow-inline": "overflow-x",
		"overscroll-behavior-block": "overscroll-behavior-y",
		"overscroll-behavior-inline": "overscroll-behavior-x",
		"contain-intrinsic-block-size": "contain-intrinsic-height",
		"contain-intrinsic-inline-size": "contain-intrinsic-width"
	})), Mt = .001, Nt = /* @__PURE__ */ new Set([
		"inline-block",
		"inline-flex",
		"inline-grid",
		"inline-table",
		"inline-flow-root",
		"table"
	]), Pt = 1, Ft = 2, It = 4, Lt = 8, Rt = 16, zt = 32, Bt = 63, Vt = /* @__PURE__ */ new Map(), Ht = [], Ut = [], Wt = [
		"top",
		"right",
		"bottom",
		"left"
	], Gt = null;
});
function qt(e = 1e3) {
	return typeof requestAnimationFrame != "function" || typeof document < "u" && document.visibilityState === "hidden" ? Promise.resolve() : new Promise((t) => {
		let n = !1, r = () => {
			n || (n = !0, t());
		};
		try {
			requestAnimationFrame(r);
		} catch {
			r();
			return;
		}
		setTimeout(r, e);
	});
}
async function Jt(e = document) {
	let t = e.fonts, n = !1, r = t.ready.then(() => {
		n = !0;
	}, () => {
		n = !0;
	});
	for (; !n && t.status === "loading";) {
		let e = [...t].filter((e) => e.status === "loading");
		if (!e.length) return;
		await Promise.race([r, Promise.allSettled(e.map((e) => e.loaded))]);
	}
}
function Yt(e) {
	if (e !== !1 && e !== "auto") return null;
	let t = performance.now() + (e === "auto" ? en : $t), n = null, r = {
		yielded: !1,
		due: () => performance.now() >= t,
		pause: () => n ||= Xt().then(() => {
			n = null, r.yielded = !0, t = performance.now() + $t;
		})
	};
	return r;
}
function Xt() {
	return new Promise((e) => {
		let t = new MessageChannel();
		t.port1.onmessage = () => e(), t.port2.postMessage(0);
	});
}
async function Zt() {
	tn >= 0 && performance.now() - tn > $t && await Xt(), tn < 0 && (tn = performance.now(), Xt().then(() => {
		tn = -1;
	}));
}
function Qt() {
	if (typeof navigator > "u") return !1;
	if (navigator.userAgentData) return navigator.userAgentData.platform === "iOS";
	let e = navigator.userAgent || "", t = /iPhone|iPad|iPod/.test(e), n = navigator.maxTouchPoints > 2 && /Macintosh/.test(e);
	return t || n;
}
function U() {
	if (typeof navigator > "u") return !1;
	let e = navigator.userAgent || "";
	if (e === nn) return rn;
	nn = e;
	let t = e.toLowerCase(), n = t.includes("safari") && !t.includes("chrome") && !t.includes("crios") && !t.includes("fxios") && !t.includes("android"), r = /applewebkit/i.test(e), i = /mobile/i.test(e), a = !/safari/i.test(e), o = r && i && a, s = /(micromessenger|wxwork|wecom|windowswechat|macwechat)/i.test(e), c = /(baiduboxapp|baidubrowser|baidusearch|baiduboxlite)/i.test(t), l = /ipad|iphone|ipod/.test(t) && r;
	return rn = n || o || s || c || l;
}
function W() {
	if (typeof navigator > "u") return !1;
	let e = navigator.userAgent || "";
	return e === an ? on : (an = e, on = e.toLowerCase().includes("firefox"));
}
var $t, en, tn, nn, rn, an, on, G = t(() => {
	$t = 16, en = 40, tn = -1;
});
function K(e, t, n) {
	let r = e && typeof e == "object" && (e.options || e);
	r && r.debug && (n === void 0 ? console.warn("[SnapDOM]", t) : console.warn("[SnapDOM]", t, n));
}
function q(e, t, n, r) {
	let i = e && e.warnings;
	i && i.length < sn && i.push(r === void 0 ? {
		code: t,
		message: n
	} : {
		code: t,
		message: n,
		detail: r
	});
}
var sn, cn = t(() => {
	sn = 50;
}), J = t(() => {
	oe(), Kt(), G(), D(), cn();
});
function ln() {
	Vn = ++Y;
}
function un(e) {
	let t = e && (e.nodeType === 1 ? e : e.parentElement);
	for (; t;) {
		if (We(t)) return !0;
		t = t.parentElement ? t.parentElement : x(t);
	}
	return !1;
}
function dn(e) {
	for (let t of e) if (fn(t)) return !0;
	return !1;
}
function fn(e) {
	if (un(e.target)) return !1;
	if (e.type === "characterData" ? Ke(e.target, e.target.data) : e.attributeName === "style" && Ke(e.target, e.target.style.cssText)) return Y++, !1;
	if (e.type === "childList") {
		let t = !0;
		for (let n of e.addedNodes) if (!un(n)) {
			t = !1;
			break;
		}
		if (t) {
			for (let n of e.removedNodes) if (!un(n)) {
				t = !1;
				break;
			}
		}
		if (t) return !1;
	}
	return !0;
}
function pn(e) {
	for (let t of e) {
		let e = t.target.ownerDocument || document;
		Hn.set(e, (Hn.get(e) || 0) + 1);
		let n = t.target.nodeType === 1 ? t.target : t.target.parentElement || t.target.host;
		for (; n; n = n.parentElement || x(n)) Hn.set(n, (Hn.get(n) || 0) + 1);
	}
}
function mn(e) {
	let t = e.ownerDocument || document;
	return Nn(t), (Hn.get(t) || 0) - (Hn.get(e) || 0);
}
function hn() {
	Vn = Un = ++Y;
}
function gn(e = document) {
	return Nn(e), Un;
}
function _n() {
	return Nn(), Vn;
}
function vn(e) {
	return e ? (Nn(e.ownerDocument || document), Tn(e, En(e))) : 0;
}
function yn() {
	hn();
}
function bn() {
	Y++;
}
function xn() {
	Gn = ++Y;
}
function Sn(e) {
	Wn.set(e, ++Y);
}
function Cn(e) {
	if (!e || e.nodeType !== 1) return;
	let t = ++Y;
	Wn.set(e, t);
	let n = e.querySelectorAll("*");
	for (let e = 0; e < n.length; e++) Wn.set(n[e], t);
}
function wn(e) {
	Cn(e.parentElement || e);
	for (let t = e.parentElement; t; t = t.parentElement) Sn(t);
}
function Tn(e, t = null) {
	let n = Math.max(Un, Gn, Wn.get(e) || 0);
	if (t) for (let e of t) n = Math.max(n, Wn.get(e) || 0);
	return n;
}
function En(e) {
	let t = e.getRootNode?.();
	if (!t?.host) return null;
	let n = [];
	for (; t?.host;) t.mode === "open" && An(t), n.push(t.host), t = t.host.getRootNode?.();
	return n;
}
function Dn(e) {
	e ||= document;
	let t = Kn.get(e);
	if (!t || t.env !== Un) {
		let n = !0;
		try {
			n = zn(e).usesHas;
		} catch {}
		t = {
			env: Un,
			usesHas: n
		}, Kn.set(e, t);
	}
	return !t.usesHas;
}
function On(e) {
	let t = (e) => e?.nodeType === 1 && (e.matches?.("style,link") || e.querySelector?.("style,link"));
	for (let n of e) {
		let e = n.target, r = e && (e.nodeType === 1 ? e : e.parentElement);
		if (r && (r.tagName === "STYLE" || r.tagName === "LINK")) return r.ownerDocument || document;
		for (let e of n.addedNodes) if (t(e)) return e.ownerDocument || document;
		for (let r of n.removedNodes) if (t(r)) return r.ownerDocument || e && e.ownerDocument || document;
	}
	return null;
}
function kn(e) {
	let t = e.filter(fn);
	if (!t.length) return;
	pn(t), ln();
	let n = /* @__PURE__ */ new Set();
	for (let e of t) {
		let t = e.target.getRootNode && e.target.getRootNode();
		if (!t || t.nodeType !== 11 || n.has(t)) continue;
		n.add(t), t.host ? Cn(t.host) : Y++;
		let r = t.querySelectorAll("*");
		for (let e = 0; e < r.length; e++) Wn.set(r[e], Y);
	}
}
function An(e) {
	if (e && !qn.has(e)) {
		qn.add(e);
		try {
			let t = new MutationObserver(kn);
			t.observe(e, {
				subtree: !0,
				childList: !0,
				characterData: !0,
				attributes: !0
			}), Jn.push({
				o: t,
				root: e
			});
		} catch {}
	}
}
function jn(e, t) {
	for (let { root: n } of Jn) {
		let r = n.host;
		for (; r && r !== e && !e.contains(r);) r = r.getRootNode().host;
		if (r) for (let e of n.getAnimations?.() || []) t.add(e);
	}
}
function Mn(e) {
	let t = e.filter(fn);
	if (!t.length) return;
	pn(t), ln();
	let n = On(e);
	if (n) {
		Kn.delete(n), hn();
		return;
	}
	let r = /* @__PURE__ */ new Set();
	for (let e of t) {
		let t = e.target.nodeType === 1 ? e.target : e.target.parentElement;
		if (!t) continue;
		let n = t.ownerDocument || document;
		if (!Dn(n) || t === n.documentElement || t === n.body) {
			xn();
			return;
		}
		let i = t.parentElement || t;
		r.has(i) || (r.add(i), wn(t));
	}
}
function Nn(e = document) {
	if (e === Xn || !e || e.nodeType !== 9) return;
	if (Yn.has(e)) {
		Xn = e;
		return;
	}
	Yn.add(e), Xn = e;
	let t = e.defaultView, n = (e) => {
		dn(e) && hn();
	}, r = hn;
	try {
		let t = new MutationObserver(Mn);
		t.observe(e.documentElement, {
			subtree: !0,
			childList: !0,
			characterData: !0,
			attributes: !0
		}), Zn.push({
			o: t,
			head: !1,
			doc: e
		});
	} catch {}
	try {
		let t = new MutationObserver(n);
		t.observe(e.head, {
			subtree: !0,
			childList: !0,
			characterData: !0,
			attributes: !0
		}), Zn.push({
			o: t,
			head: !0,
			doc: e
		});
	} catch {}
	try {
		t?.addEventListener("resize", r, { passive: !0 });
	} catch {}
	try {
		let n = (t) => {
			ln();
			let n = t.composedPath?.()[0] || t.target;
			n && n.nodeType === 1 && !un(n) && Dn(n.ownerDocument || e) ? wn(n) : xn();
		};
		e.addEventListener("focusin", n, {
			capture: !0,
			passive: !0
		}), e.addEventListener("focusout", n, {
			capture: !0,
			passive: !0
		}), e.addEventListener("change", n, {
			capture: !0,
			passive: !0
		}), e.addEventListener("pointerdown", n, {
			capture: !0,
			passive: !0
		}), e.addEventListener("pointerup", n, {
			capture: !0,
			passive: !0
		}), e.addEventListener("pointercancel", n, {
			capture: !0,
			passive: !0
		}), e.addEventListener("keydown", n, {
			capture: !0,
			passive: !0
		}), e.addEventListener("keyup", n, {
			capture: !0,
			passive: !0
		}), e.addEventListener("beforetoggle", n, {
			capture: !0,
			passive: !0
		}), e.addEventListener("toggle", n, {
			capture: !0,
			passive: !0
		}), t?.addEventListener("hashchange", () => {
			ln(), xn();
		}, { passive: !0 }), e.addEventListener("load", (e) => {
			un(e.target) || Y++;
		}, {
			capture: !0,
			passive: !0
		});
	} catch {}
	try {
		let t = e.fonts;
		t && (t.addEventListener?.("loadingdone", r), t.status === "loading" && t.ready?.then(r).catch(() => {}));
	} catch {}
}
function Pn(e, t) {
	if (!e?.querySelectorAll) return;
	let n;
	try {
		n = Array.from(e.querySelectorAll(":hover"));
	} catch {
		return;
	}
	let r = Qn.get(e) || [];
	if (r.length === n.length && r.every((e, t) => e === n[t])) return;
	if (Qn.set(e, n), ln(), e.nodeType === 11) {
		e.host ? Cn(e.host) : Y++;
		for (let t of e.querySelectorAll("*")) Wn.set(t, Y);
		return;
	}
	let i = r.filter((e) => !n.includes(e)).concat(n.filter((e) => !r.includes(e)));
	for (let e of i) if (e.isConnected) {
		if (Dn(t)) wn(e);
		else {
			xn();
			return;
		}
	}
}
function Fn(e, t = null) {
	if (!e) return;
	Pn(e, e);
	let n = t || Jn.filter(({ root: e }) => e.host?.isConnected).map(({ root: e }) => e);
	for (let t of n) Pn(t, e);
}
function In() {
	Nn();
	try {
		for (let e = Zn.length - 1; e >= 0; e--) {
			let { o: t, head: n, doc: r } = Zn[e];
			if (r !== document && !r.defaultView) {
				try {
					t.disconnect();
				} catch {}
				Yn.delete(r), Xn === r && (Xn = null), Zn.splice(e, 1);
				continue;
			}
			let i = t.takeRecords();
			i.length && (n ? dn(i) && hn() : Mn(i));
		}
		for (let e = Jn.length - 1; e >= 0; e--) {
			let { o: t, root: n } = Jn[e];
			if (!n.host || !n.host.isConnected) {
				try {
					t.disconnect();
				} catch {}
				qn.delete(n), Jn.splice(e, 1);
				continue;
			}
			let r = t.takeRecords();
			r.length && kn(r);
		}
	} catch {}
}
function Ln(e) {
	let t = e.href;
	return !t || typeof CSSStyleSheet != "function" ? null : er.has(t) ? er.get(t) : (er.set(t, null), L(t, { as: "text" }).then((e) => {
		if (!e.ok || typeof e.data != "string" || /@import/i.test(e.data)) return;
		let n = new CSSStyleSheet();
		n.replaceSync(e.data), er.set(t, n.cssRules), hn();
	}).catch(() => {}), null);
}
function Rn(e, t) {
	let n = (rr.get(e) || 0) + t + nr;
	rr.set(e, n), $n.get(e)?.declined <= n * tr && ($n.delete(e), Kn.delete(e));
}
function zn(e) {
	let t = $n.get(e);
	if (!t || t.epoch !== Vn) {
		let n = ve(e, Ln);
		if (t && n && t.env === Un && t.census && t.census.length === n.length && n.every((e, n) => e === t.census[n])) return t.epoch = Vn, t;
		let r = t && t.universe;
		t = {
			epoch: Vn,
			env: Un,
			census: n,
			...Se(e, Ln, (rr.get(e) || 0) * tr)
		};
		let i = t.universe;
		if (r && i && r.size === i.size) {
			let e = !0;
			for (let t of i) if (!r.has(t)) {
				e = !1;
				break;
			}
			e && (t.universe = r);
		}
		$n.set(e, t);
	}
	return t;
}
function Bn(e, t) {
	return t ? (t.scan || (t.scan = zn(e), t.scanEnv = Un), t.scan) : zn(e);
}
var Y, Vn, Hn, Un, Wn, Gn, Kn, qn, Jn, Yn, Xn, Zn, Qn, $n, er, tr, nr, rr, ir = t(() => {
	J(), Ue(), V(), R(), Y = 0, Vn = 0, Hn = /* @__PURE__ */ new WeakMap(), Un = 0, Wn = /* @__PURE__ */ new WeakMap(), Gn = 0, Kn = /* @__PURE__ */ new WeakMap(), qn = /* @__PURE__ */ new WeakSet(), Jn = [], Yn = /* @__PURE__ */ new WeakSet(), Xn = null, Zn = [], Qn = /* @__PURE__ */ new WeakMap(), $n = /* @__PURE__ */ new WeakMap(), er = /* @__PURE__ */ new Map(), tr = 12, nr = 10, rr = /* @__PURE__ */ new WeakMap();
});
function ar(e) {
	return sr(e.boxShadow);
}
function or(e) {
	return sr(e.textShadow);
}
function sr(e) {
	if (!e || e === "none") return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	};
	let t = [], n = "", r = 0;
	for (let i = 0; i < e.length; i++) {
		let a = e[i];
		a === "(" ? r++ : a === ")" && (r = Math.max(0, r - 1)), a === "," && r === 0 ? (t.push(n), n = "") : n += a;
	}
	n.trim() && t.push(n);
	let i = 0, a = 0, o = 0, s = 0;
	for (let e of t) {
		if (/\binset\b/i.test(e)) continue;
		let t = e.match(/-?\d+(\.\d+)?px/g)?.map((e) => parseFloat(e)) || [];
		if (t.length < 2) continue;
		let [n, r, c = 0, l = 0] = t, u = Math.abs(n) + c + l, d = Math.abs(r) + c + l;
		a = Math.max(a, u + Math.max(n, 0)), s = Math.max(s, u + Math.max(-n, 0)), o = Math.max(o, d + Math.max(r, 0)), i = Math.max(i, d + Math.max(-r, 0));
	}
	return {
		top: Math.ceil(i),
		right: Math.ceil(a),
		bottom: Math.ceil(o),
		left: Math.ceil(s)
	};
}
function cr(e) {
	let t = e.filter && e.filter !== "none" ? e.filter : e.webkitFilter || "", n = /blur\(\s*([0-9.]+)px\s*\)/gi, r = 0, i;
	for (; i = n.exec(t);) r += parseFloat(i[1]) || 0;
	let a = Math.ceil(r * 2);
	return {
		top: a,
		right: a,
		bottom: a,
		left: a
	};
}
function lr(e) {
	if ((e.outlineStyle || "none") === "none") return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	};
	let t = Math.ceil(parseFloat(e.outlineWidth || "0") || 0), n = parseFloat(e.outlineOffset || "0") || 0, r = t + Math.max(0, Math.ceil(n));
	return {
		top: r,
		right: r,
		bottom: r,
		left: r
	};
}
function ur(e) {
	let t = `${e.filter || ""} ${e.webkitFilter || ""}`.trim();
	if (!t || t === "none") return {
		bleed: {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		},
		has: !1
	};
	let n = t.match(/drop-shadow\((?:[^()]|\([^()]*\))*\)/gi) || [], r = 0, i = 0, a = 0, o = 0, s = !1;
	for (let e of n) {
		s = !0;
		let [t = 0, n = 0, c = 0] = e.match(/-?\d+(?:\.\d+)?px/gi)?.map((e) => parseFloat(e)) || [], l = Math.abs(t) + c, u = Math.abs(n) + c;
		i = Math.max(i, l + Math.max(t, 0)), o = Math.max(o, l + Math.max(-t, 0)), a = Math.max(a, u + Math.max(n, 0)), r = Math.max(r, u + Math.max(-n, 0));
	}
	return {
		bleed: {
			top: X(r),
			right: X(i),
			bottom: X(a),
			left: X(o)
		},
		has: s
	};
}
function dr(e) {
	let t = ar(e), n = or(e), r = cr(e), i = lr(e), a = ur(e);
	return {
		top: Math.max(t.top, n.top) + r.top + i.top + a.bleed.top,
		right: Math.max(t.right, n.right) + r.right + i.right + a.bleed.right,
		bottom: Math.max(t.bottom, n.bottom) + r.bottom + i.bottom + a.bleed.bottom,
		left: Math.max(t.left, n.left) + r.left + i.left + a.bleed.left
	};
}
function fr(e) {
	return e.boxShadow && e.boxShadow !== "none" || e.textShadow && e.textShadow !== "none" || (e.outlineStyle || "none") !== "none" || e.filter && e.filter !== "none" ? !0 : !!e.webkitFilter && e.webkitFilter !== "none";
}
function pr(e) {
	let t = e.overflowX || e.overflow || "visible", n = e.overflowY || e.overflow || "visible", r = !!e.contain && /\b(paint|content|strict)\b/.test(e.contain) || !!e.clipPath && e.clipPath !== "none";
	return {
		x: r || t !== "visible",
		y: r || n !== "visible"
	};
}
function mr(e, t, n, r = 1, i = 1) {
	let a = 0, o = 0, s = 0, c = 0, l = pr(n.get(e) || H(e));
	if (l.x && l.y) return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	};
	let u = e.getBoundingClientRect();
	for (let d of t.values()) {
		if (d === e || d.nodeType !== 1 || d.ownerDocument !== e.ownerDocument) continue;
		let t = n.get(d);
		if (!t || !fr(t)) continue;
		let f = dr(t);
		if (!(f.top || f.right || f.bottom || f.left)) continue;
		let p = d.getBoundingClientRect(), m = {
			left: p.left - f.left / r,
			top: p.top - f.top / i,
			right: p.right + f.right / r,
			bottom: p.bottom + f.bottom / i
		};
		for (let t = d.parentElement; t; t = t.parentElement) {
			let r = pr(n.get(t) || H(t));
			if (r.x || r.y) {
				let e = t.getBoundingClientRect();
				r.x && (m.left = Math.max(m.left, e.left), m.right = Math.min(m.right, e.right)), r.y && (m.top = Math.max(m.top, e.top), m.bottom = Math.min(m.bottom, e.bottom));
			}
			if (t === e) break;
		}
		l.x || (c = Math.max(c, (u.left - m.left) * r), o = Math.max(o, (m.right - u.right) * r)), l.y || (a = Math.max(a, (u.top - m.top) * i), s = Math.max(s, (m.bottom - u.bottom) * i));
	}
	return {
		top: Math.max(0, Math.ceil(a)),
		right: Math.max(0, Math.ceil(o)),
		bottom: Math.max(0, Math.ceil(s)),
		left: Math.max(0, Math.ceil(c))
	};
}
function hr(e, t) {
	if (!e || !t || !t.style) return null;
	let n = getComputedStyle(e);
	try {
		t.style.transformOrigin = "0 0";
	} catch {}
	try {
		"translate" in t.style && (t.style.translate = "none"), "rotate" in t.style && (t.style.rotate = "none");
	} catch {}
	let r = n.transform || "none";
	if (!r || r === "none") {
		let n = null;
		try {
			n = vr(e).scale;
		} catch {}
		try {
			t.style.transform = "none";
		} catch {}
		if (!n) return {
			a: 1,
			b: 0,
			c: 0,
			d: 1
		};
		let r = br({ scale: n });
		return {
			a: r.a,
			b: r.b,
			c: r.c,
			d: r.d
		};
	}
	function i(e, t, n, r) {
		let i = Math.sqrt(e * e + t * t) || 0, a = 0, o = 0;
		if (i > 0) {
			let s = e / i, c = t / i;
			a = s * n + c * r;
			let l = n - s * a, u = r - c * a;
			o = Math.sqrt(l * l + u * u) || 0, o > 0 ? a /= o : a = 0;
		}
		return {
			a: i,
			b: 0,
			c: a * o,
			d: o
		};
	}
	let a = (t) => {
		let n = vr(e).scale;
		if (!n) return t;
		let r = br({
			scale: n,
			baseTransform: `matrix(${t.a},${t.b},${t.c},${t.d},0,0)`
		});
		return {
			a: r.a,
			b: r.b,
			c: r.c,
			d: r.d
		};
	}, o = r.match(/^matrix\(\s*([^)]+)\)$/i);
	if (o) {
		let e = o[1].split(",").map((e) => parseFloat(e.trim()));
		if (e.length === 6 && e.every(Number.isFinite)) {
			let [n, r, o, s] = e, c = i(n, r, o, s);
			try {
				t.style.transform = `matrix(${c.a}, ${c.b}, ${c.c}, ${c.d}, 0, 0)`;
			} catch {}
			return a(c);
		}
	}
	let s = r.match(/^matrix3d\(\s*([^)]+)\)$/i);
	if (s) {
		let e = s[1].split(",").map((e) => parseFloat(e.trim()));
		if (e.length === 16 && e.every(Number.isFinite)) {
			let n = i(e[0], e[1], e[4], e[5]);
			try {
				t.style.transform = `matrix(${n.a}, ${n.b}, ${n.c}, ${n.d}, 0, 0)`;
			} catch {}
			return a(n);
		}
	}
	try {
		let e = new DOMMatrix(r), n = i(e.a, e.b, e.c, e.d);
		try {
			t.style.transform = `matrix(${n.a}, ${n.b}, ${n.c}, ${n.d}, 0, 0)`;
		} catch {}
		return a(n);
	} catch {
		return null;
	}
}
function gr(e, t, n, r, i) {
	let a = n.a, o = n.b, s = n.c, c = n.d, l = n.e || 0, u = n.f || 0;
	function d(e, t) {
		let n = e - r, d = t - i, f = a * n + s * d, p = o * n + c * d;
		return f += r + l, p += i + u, [f, p];
	}
	let f = [
		d(0, 0),
		d(e, 0),
		d(0, t),
		d(e, t)
	], p = 1 / 0, m = 1 / 0, h = -1 / 0, g = -1 / 0;
	for (let [e, t] of f) e < p && (p = e), t < m && (m = t), e > h && (h = e), t > g && (g = t);
	return {
		minX: p,
		minY: m,
		maxX: h,
		maxY: g,
		width: h - p,
		height: g - m
	};
}
function _r(e, t, n) {
	let r = (e.transformOrigin || "0 0").trim().split(/\s+/), [i, a] = [r[0] || "0", r[1] || "0"], o = (e, t) => {
		let n = e.toLowerCase();
		return n === "left" || n === "top" ? 0 : n === "center" ? t / 2 : n === "right" || n === "bottom" ? t : n.endsWith("px") ? parseFloat(n) || 0 : n.endsWith("%") ? (parseFloat(n) || 0) * t / 100 : /^-?\d+(\.\d+)?$/.test(n) && parseFloat(n) || 0;
	};
	return {
		ox: o(i, t),
		oy: o(a, n)
	};
}
function vr(e) {
	let t = {
		rotate: "0deg",
		scale: null,
		translate: null
	}, n = null;
	try {
		n = typeof e.computedStyleMap == "function" ? e.computedStyleMap() : null;
	} catch {}
	if (n) {
		let r = (e) => {
			try {
				return typeof n.has == "function" && !n.has(e) || typeof n.get != "function" ? null : n.get(e);
			} catch {
				return null;
			}
		}, i = r("rotate");
		if (i) {
			if (i.angle) {
				let e = i.angle;
				t.rotate = e.unit === "rad" ? e.value * 180 / Math.PI + "deg" : e.value + e.unit, i.is2D === !1 && i.x && i.y && i.z && (t.rotate = `${i.x.value} ${i.y.value} ${i.z.value} ${t.rotate}`);
			} else t.rotate = i.unit ? i.unit === "rad" ? i.value * 180 / Math.PI + "deg" : i.value + i.unit : String(i);
		} else {
			let n = getComputedStyle(e);
			t.rotate = n.rotate && n.rotate !== "none" ? n.rotate : "0deg";
		}
		let a = r("scale");
		if (a) {
			let e = (e) => e && e.value != null ? `${e.value}${e.unit === "percent" ? "%" : ""}` : null;
			t.scale = "x" in a && a.x?.value != null ? [
				e(a.x),
				e(a.y) ?? e(a.x),
				...a.is2D === !1 ? [e(a.z) ?? "1"] : []
			].join(" ") : Array.isArray(a) ? a.map(e).join(" ") : String(a);
		} else {
			let n = getComputedStyle(e);
			t.scale = n.scale && n.scale !== "none" ? n.scale : null;
		}
		let o = r("translate");
		if (o) {
			let e = (e) => e && e.value != null ? `${e.value}${e.unit === "percent" ? "%" : e.unit || "px"}` : null;
			t.translate = "x" in o && o.x?.value != null ? [
				e(o.x),
				e(o.y) ?? "0px",
				...o.is2D === !1 ? [e(o.z) ?? "0px"] : []
			].join(" ") : Array.isArray(o) ? o.map(e).join(" ") : String(o);
		} else {
			let n = getComputedStyle(e);
			t.translate = n.translate && n.translate !== "none" ? n.translate : null;
		}
		return t.rotate && t.rotate !== "none" || (t.rotate = "0deg"), t.scale && t.scale !== "none" || (t.scale = null), t.translate && t.translate !== "none" || (t.translate = null), t;
	}
	let r = getComputedStyle(e);
	return t.rotate = r.rotate && r.rotate !== "none" ? r.rotate : "0deg", t.scale = r.scale && r.scale !== "none" ? r.scale : null, t.translate = r.translate && r.translate !== "none" ? r.translate : null, t;
}
function yr() {
	if (Cr?.isConnected) return Cr;
	let e = document.createElement("div");
	return e.id = "snapdom-measure-slot", e.setAttribute("aria-hidden", "true"), B(e), Object.assign(e.style, {
		position: "absolute",
		left: "-99999px",
		top: "0px",
		width: "0px",
		height: "0px",
		overflow: "hidden",
		opacity: "0",
		pointerEvents: "none",
		contain: "size layout style"
	}), document.documentElement.appendChild(e), Cr = e, e;
}
function br(e) {
	let t = (e) => {
		let t = [], n = 0, r = 0, i = String(e).trim();
		for (let e = 0; e < i.length; e++) i[e] === "(" ? n++ : i[e] === ")" ? n-- : /\s/.test(i[e]) && !n && (e > r && t.push(i.slice(r, e)), r = e + 1);
		return r < i.length && t.push(i.slice(r)), t;
	}, n = (e) => e && e !== "none", r = [];
	if (n(e.translate)) {
		let n = t(e.translate);
		for (let t = 0; t < 2 && t < n.length; t++) {
			let r = t === 0 ? e.width : e.height;
			/^[+-]?(?:\d*\.)?\d+%$/.test(n[t]) && Number.isFinite(r) && (n[t] = `${parseFloat(n[t]) * r / 100}px`);
		}
		r.push(n.length > 2 ? `translate3d(${n.join(",")})` : `translate(${n.join(",")})`);
	}
	if (n(e.rotate) && e.rotate !== "0deg") {
		let n = t(e.rotate);
		n.length === 4 ? r.push(`rotate3d(${n.join(",")})`) : n.length === 2 && /^[xyz]$/i.test(n[0]) ? r.push(`rotate${n[0].toUpperCase()}(${n[1]})`) : r.push(`rotate(${n.join(" ")})`);
	}
	if (n(e.scale)) {
		let n = t(e.scale).map((e) => /%$/.test(e) ? String(parseFloat(e) / 100) : e);
		r.push(n.length > 2 ? `scale3d(${n.join(",")})` : `scale(${n.join(",")})`);
	}
	if (n(e.baseTransform) && r.push(e.baseTransform), !r.length) return new DOMMatrix();
	let i = r.join(" ");
	try {
		if (i.includes("%")) throw Error("Transform needs a reference box");
		return new DOMMatrix(i);
	} catch {
		let t = yr(), n = document.createElement("div");
		if (n.style.cssText = "all:initial!important;display:block!important;transform-origin:0 0!important", n.style.setProperty("width", `${Number.isFinite(e.width) ? e.width : 0}px`, "important"), n.style.setProperty("height", `${Number.isFinite(e.height) ? e.height : 0}px`, "important"), n.style.setProperty("transform", i, "important"), !n.style.transform) throw Error("[SnapDOM] Couldn't read the transform of an element.");
		t.appendChild(n);
		try {
			return Sr(n);
		} finally {
			n.remove();
		}
	}
}
function xr(e) {
	let t = H(e), n = t.transform || "none";
	if (n !== "none" && !/^matrix\(\s*1\s*,\s*0\s*,\s*0\s*,\s*1\s*,\s*0\s*,\s*0\s*\)$/i.test(n)) return !0;
	let r = t.rotate && t.rotate !== "none" && t.rotate !== "0deg", i = t.scale && t.scale !== "none" && t.scale !== "1", a = t.translate && t.translate !== "none" && t.translate !== "0px 0px";
	return !!(r || i || a);
}
function Sr(e) {
	let t = getComputedStyle(e).transform;
	if (!t || t === "none") return new DOMMatrix();
	try {
		return new DOMMatrix(t);
	} catch {
		return new WebKitCSSMatrix(t);
	}
}
var Cr, wr = t(() => {
	hi(), Kt(), V(), Cr = null;
});
function Tr(e, t) {
	if (!t) return null;
	let n = e.ownerDocument || document, r = n.defaultView || window, i, a, o, s;
	if (t === "viewport") i = 0, a = 0, o = n.documentElement?.clientWidth || r.innerWidth, s = n.documentElement?.clientHeight || r.innerHeight;
	else if (typeof t == "object") i = (Number(t.x) || 0) - (r.scrollX || 0), a = (Number(t.y) || 0) - (r.scrollY || 0), o = Number(t.width), s = Number(t.height);
	else return null;
	return o > 0 && s > 0 ? {
		left: i,
		top: a,
		width: o,
		height: s,
		right: i + o,
		bottom: a + s
	} : null;
}
function Er(e) {
	if (e.parentElement) return e.parentElement;
	let t = e.getRootNode && e.getRootNode();
	return b(t) ? t.host : null;
}
function Dr(e, t) {
	for (let n = t; n; n = Er(n)) if (n === e) return !0;
	return !1;
}
function Or(e, t) {
	for (let n = Er(e); n && n !== t && n?.nodeType === 1; n = Er(n)) {
		let e = H(n);
		if (e.position !== "static" || kr(e)) return n;
	}
	return null;
}
function kr(e) {
	return e.transform && e.transform !== "none" || e.filter && e.filter !== "none" || e.backdropFilter && e.backdropFilter !== "none" || e.perspective && e.perspective !== "none" || /transform|perspective|filter/.test(e.willChange || "") || /layout|paint|strict|content/.test(e.contain || "");
}
function Ar(e, t, n, r, i, a) {
	if (e.scrollTop || e.scrollLeft) return;
	let o = r.get(e) || H(e);
	if (kr(o)) return;
	let s = o.position !== "static", c = /* @__PURE__ */ new Map();
	for (let [o, l] of t) {
		let t = n.get(o);
		if (!t) continue;
		let u = c.get(t);
		if (u === void 0 && c.set(t, u = ri.exec(t)?.[1] || ""), !u || u === "absolute" && s || ni.has(o)) continue;
		let d = !1;
		for (let t = Er(l); t && t !== e && t.nodeType === 1; t = Er(t)) {
			let e = r.get(t) || H(t);
			if (u === "absolute" && e.position !== "static" || kr(e)) {
				d = !0;
				break;
			}
		}
		if (d) continue;
		let f = r.get(l) || H(l), p = parseFloat(f.left), m = parseFloat(f.top);
		i && Number.isFinite(p) && (o.style.left = `${p + i}px`), a && Number.isFinite(m) && (o.style.top = `${m + a}px`);
	}
}
function jr(e, t) {
	try {
		return br({
			baseTransform: e,
			rotate: t?.rotate,
			scale: t?.scale
		});
	} catch {
		return null;
	}
}
function Mr(e, t, n, r, i) {
	let a = e.getBoundingClientRect();
	v(t) && H(e).position === "static" && (t.style.position = "relative");
	let o = [];
	for (let [t, s] of n) {
		if (s?.nodeType !== 1) continue;
		let n = t.localName === "svg" && y(t) && !y(s.parentNode);
		if (!v(t) && !n || s === e || !Dr(e, s)) continue;
		let c = r.get(s) || H(s), l = c.position;
		if (l !== "fixed" && l !== "sticky" && l !== "-webkit-sticky" || t.style.position === "absolute") continue;
		let u = s.getBoundingClientRect();
		if (!(u.width > 0 && u.height > 0)) continue;
		ni.add(t);
		let d = c.transform && c.transform !== "none" ? c.transform : "", f = vr(s), p = !!(d || f.rotate !== "0deg" || f.scale || f.translate), m = p ? jr(d, f) : null, h = !m || !m.is2D || m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1, g = u.width, _ = u.height;
		h || (g = s.offsetWidth || u.width, _ = s.offsetHeight || u.height);
		let x = s.getRootNode && b(s.getRootNode()), S = a, C = e.clientLeft || 0, w = e.clientTop || 0;
		if (x) {
			let t = Or(s, e);
			t && (S = t.getBoundingClientRect(), C = t.clientLeft || 0, w = t.clientTop || 0);
		}
		let T = u.left - S.left - C, E = u.top - S.top - w;
		if (p) {
			if (t.style.translate = "none", t.style.rotate = "none", t.style.scale = "none", h) t.style.transform = "none";
			else {
				t.style.transform = `matrix(${m.a},${m.b},${m.c},${m.d},0,0)`;
				let { ox: e, oy: n } = _r(c, g, _), r = gr(g, _, {
					a: m.a,
					b: m.b,
					c: m.c,
					d: m.d,
					e: 0,
					f: 0
				}, e, n);
				T -= r.minX, E -= r.minY;
			}
		}
		if (l !== "fixed") {
			let e = t.cloneNode(!1);
			e.setAttribute("data-snap-ph", "1"), e.style.position = "static", e.style.visibility = "hidden", e.style.width = `${g}px`, e.style.height = `${_}px`, e.style.boxSizing = "border-box", t.parentElement?.insertBefore(e, t);
		}
		let D = n ? g : g + 2, O = _;
		i && (Math.abs(E - i.y) < .5 && (--E, O += 1), Math.abs(T - i.x) < .5 && (--T, D += 1)), t.style.position = "absolute", t.style.left = `${T}px`, t.style.top = `${E}px`, t.style.right = "auto", t.style.bottom = "auto", t.style.margin = "0", t.style.width = `${D}px`, t.style.height = `${O}px`, t.style.boxSizing = "border-box", x || o.push(t);
	}
	for (let e of o) t.appendChild(e);
}
function Nr(e, t, n = {}) {
	if (!e || !t || !t.style) return;
	let r = getComputedStyle(e);
	try {
		t.style.boxShadow = "none";
	} catch (e) {
		K(n, "Couldn't remove the root box-shadow.", e);
	}
	try {
		t.style.textShadow = "none";
	} catch (e) {
		K(n, "Couldn't remove the root text-shadow.", e);
	}
	try {
		t.style.outline = "none";
	} catch (e) {
		K(n, "Couldn't remove the root outline.", e);
	}
	let i = (r.filter || "").replace(/\bdrop-shadow\((?:[^()]|\([^()]*\))*\)\s*/gi, "").trim().replace(/\s+/g, " ");
	try {
		t.style.filter = i.length ? i : "none";
	} catch (e) {
		K(n, "Couldn't remove the root drop-shadow filter.", e);
	}
}
function Pr(e, t) {
	if (!e || !t || !t.style) return;
	let n = 1;
	try {
		n = parseFloat(getComputedStyle(e).zoom);
	} catch {
		return;
	}
	if (t.style.getPropertyValue("zoom") || Number.isFinite(n) && n !== 1) try {
		t.style.setProperty("zoom", "1", "important");
	} catch {}
}
function Fr(e) {
	let t = e.display || "";
	if (t.includes("flex") || t.includes("grid") || t.startsWith("table") || t === "inline-block" || t === "flow-root" || e.position === "absolute" || e.position === "fixed" || e.float && e.float !== "none") return !0;
	let n = e.overflowX || e.overflow || "visible", r = e.overflowY || e.overflow || "visible";
	return !!(n !== "visible" || r !== "visible" || e.contain && /\b(layout|content|paint|strict)\b/.test(e.contain));
}
function Ir(e, t) {
	let n = Array.from(e.childNodes), r = t === "top" ? n : n.reverse();
	for (let e of r) {
		if (e.nodeType === Node.TEXT_NODE) {
			if (/\S/.test(e.textContent || "")) return null;
			continue;
		}
		if (e.nodeType !== Node.ELEMENT_NODE) continue;
		let n = getComputedStyle(e), r = String(n.display || "");
		if (r !== "none") {
			if (r === "contents") {
				let n = Ir(e, t);
				if (n !== void 0) return n;
				continue;
			}
			if (n.position !== "absolute" && n.position !== "fixed") return n.float && n.float !== "none" || r.startsWith("inline") ? null : e;
		}
	}
}
function Lr(e, t, n, r = null) {
	let i = [];
	if (!e) return i;
	let a = getComputedStyle(e);
	if (Fr(a)) return i;
	for (let o of ["top", "bottom"]) {
		let s = o === "top" ? "Top" : "Bottom";
		if (o === "bottom" && i.push(null), (parseFloat(a[`border${s}Width`]) || 0) > 0 || (parseFloat(a[`padding${s}`]) || 0) > 0) continue;
		let c = e, l = t;
		for (; c;) {
			let e = Ir(c, o);
			if (!e) break;
			let t = l ? n ? Array.from(l.children).find((t) => n.get(t) === e) || r?.get(e) || null : l.children[Array.from(c.children).indexOf(e)] || null : null, a = getComputedStyle(e);
			if ((parseFloat(a[`margin${s}`]) || 0) > 0 && (i.push(e), t?.style && (t.style[`margin${s}`] = "0px")), Fr(a) || (parseFloat(a[`border${s}Width`]) || 0) > 0 || (parseFloat(a[`padding${s}`]) || 0) > 0) break;
			c = e, l = t;
		}
	}
	return i;
}
function Rr(e, t) {
	if (!ai.test(e) || e === "xmlns") return !0;
	if (e.includes(":")) {
		let t = e.split(":", 1)[0];
		if (!ii.has(t)) return !0;
	}
	return t ? e.startsWith("x-") || e.startsWith("v-") || e.startsWith(":") || e.startsWith("on:") || e.startsWith("bind:") || e.startsWith("let:") || e.startsWith("class:") : !1;
}
function zr(e, t = {}) {
	if (!e) return;
	let { stripFrameworkDirectives: n = !0 } = t, r = /* @__PURE__ */ new Map(), i = (e) => {
		for (let t of e.getAttributeNames()) {
			let i = r.get(t);
			if (i === void 0 && r.set(t, i = Rr(t, n)), i) {
				e.removeAttribute(t);
				continue;
			}
			let a = e.getAttribute(t);
			if (a === null || li.test(a) || !si.test(a)) continue;
			let o = ci(a);
			if (o !== a) try {
				e.setAttribute(t, o);
			} catch {}
		}
	};
	e.nodeType === Node.ELEMENT_NODE && i(e);
	let a = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT), s;
	for (; s = o.nextNode();) if (s.nodeType === Node.ELEMENT_NODE) i(s);
	else if (s.nodeType === Node.COMMENT_NODE) a.push(s);
	else {
		let e = s.data;
		if (si.test(e)) {
			let t = ci(e);
			t !== e && (s.data = t);
		}
	}
	for (let e of a) e.remove();
}
function Br(e) {
	try {
		let t = e.getAttribute?.("style") || "";
		return /\b(height|width|block-size|inline-size)\s*:/.test(t);
	} catch {
		return !1;
	}
}
function Vr(e) {
	return y(e) || ui.has(e?.localName);
}
function Hr(e, t) {
	if (e?.nodeType !== 1 || Br(e) || Vr(e)) return !1;
	let n = t.position;
	if (n === "absolute" || n === "fixed" || n === "sticky") return !1;
	let r = t.display || "";
	return !(r.includes("flex") || r.includes("grid") || r.startsWith("table") || t.transform && t.transform !== "none");
}
function Ur(e, t, n = /* @__PURE__ */ new Map(), r = null) {
	function i(e, t) {
		if (e?.nodeType !== 1 || t?.nodeType !== 1) return;
		let a = [];
		if (r) {
			let e = (t) => {
				for (let n of t.children) {
					let t = r.get(n);
					t ? t.nodeType === 1 && a.push([t, n]) : e(n);
				}
			};
			e(t);
		} else {
			let n = e.children, r = t.children;
			for (let e = 0; e < Math.min(n.length, r.length); e++) a.push([n[e], r[e]]);
		}
		let o = e.childElementCount > (r ? a.length : t.childElementCount), s = n.get(e) || getComputedStyle(e);
		if (n.has(e) || n.set(e, s), o && Hr(e, s)) {
			t.style.height || (t.style.height = "auto"), t.style.width || (t.style.width = "auto"), t.style.removeProperty("block-size"), t.style.removeProperty("inline-size"), t.style.minHeight || (t.style.minHeight = "0"), t.style.minWidth || (t.style.minWidth = "0"), t.style.maxHeight || (t.style.maxHeight = "none"), t.style.maxWidth || (t.style.maxWidth = "none");
			let e = s.overflowY || s.overflowBlock || "visible", n = s.overflowX || s.overflowInline || "visible";
			(e !== "visible" || n !== "visible") && (t.style.overflow = "visible");
		}
		for (let [e, t] of a) i(e, t);
	}
	i(e, t);
}
function Wr(e) {
	let t = getComputedStyle(e);
	return t.display !== "none" && t.position !== "absolute" && t.position !== "fixed";
}
function Gr(e, t) {
	if (e?.nodeType !== 1) return !1;
	if (e.getAttribute("data-capture") === "exclude") return t?.excludeMode === "remove";
	if (Array.isArray(t?.exclude)) for (let n of t.exclude) try {
		if (e.matches(n)) return t.excludeMode === "remove";
	} catch (e) {
		K(t, "Invalid exclude selector; ignored.", e);
	}
	if (Array.isArray(t?.excludePredicates)) for (let n of t.excludePredicates) try {
		if (n(e)) return t.excludeMode === "remove";
	} catch (e) {
		K(t, "Your exclude function threw; ignored.", e);
	}
	if (typeof t?.filter == "function" && t.filterMode === "remove") try {
		if (!t.filter(e)) return !0;
	} catch (e) {
		K(t, "Your filter function threw; ignored.", e);
	}
	return !1;
}
function Kr(e, t) {
	let n = getComputedStyle(e), r = e.getBoundingClientRect(), i = 1 / 0, a = -1 / 0, o = !1, s = Array.from(e.children);
	for (let e of s) {
		if (Gr(e, t) || !Wr(e)) continue;
		let n = e.getBoundingClientRect(), s = n.top - r.top, c = n.bottom - r.top;
		c <= s || (s < i && (i = s), c > a && (a = c), o = !0);
	}
	let c = o ? Math.max(0, a - i) : 0, l = parseFloat(n.borderTopWidth) || 0, u = parseFloat(n.borderBottomWidth) || 0, d = parseFloat(n.paddingTop) || 0, f = parseFloat(n.paddingBottom) || 0;
	return l + u + d + f + c;
}
function qr(e) {
	let t = document.implementation.createHTMLDocument(""), n = t.importNode(e, !0);
	for (let e of [n, ...n.querySelectorAll("*")]) {
		let r = e.localName.includes("-");
		if (!v(e) || !(r || e.hasAttribute("is"))) continue;
		let i = t.createElement(r ? "span" : e.localName);
		for (let t of e.attributes) t.name !== "is" && i.setAttribute(t.name, t.value);
		i.append(...e.childNodes), e === n ? n = i : e.replaceWith(i);
	}
	return n;
}
function Jr(e, t) {
	try {
		let n = new e.ownerDocument.defaultView.CSSStyleSheet();
		n.replaceSync(t), e.adoptedStyleSheets = [n];
	} catch {
		let n = e.ownerDocument.createElement("style");
		n.textContent = t, e.appendChild(n);
	}
}
function Yr(e, t, n, r, i, a) {
	let o = e.ownerDocument || document, s = e.getBoundingClientRect(), c = i > 0 && s.width > 0 ? s.width / i : 1, l = a > 0 && s.height > 0 ? s.height / a : 1;
	if (Math.abs(c - l) > .02) return 0;
	let u = o.createElement("div");
	B(u), u.style.cssText = "position:absolute!important;left:-9999px!important;top:0!important;width:" + i + "px!important;overflow:visible!important;visibility:hidden!important;";
	let d = u.attachShadow({ mode: "open" });
	Jr(d, n);
	let f = qr(t);
	d.appendChild(f), o.body.appendChild(u);
	let p = 0, m = [
		"paddingLeft",
		"paddingRight",
		"borderLeftWidth",
		"borderRightWidth"
	], h = [
		"paddingTop",
		"paddingBottom",
		"borderTopWidth",
		"borderBottomWidth"
	], g = (e, t, n) => {
		let r = H(e), i = r.boxSizing === "border-box", a = (e, t, n) => {
			let a = parseFloat(e);
			if (!Number.isFinite(a)) return t;
			let o = 0;
			if (!i) for (let e of n) o += parseFloat(r[e]) || 0;
			let s = a + o;
			return Math.abs(s - t) <= .51 ? s : t;
		};
		return {
			width: a(r.width, t, m),
			height: a(r.height, n, h)
		};
	};
	try {
		let e = f.getBoundingClientRect(), n = f.offsetWidth || i, o = f.offsetHeight || a, s = n > 0 && e.width > 0 ? e.width / n : 1, u = o > 0 && e.height > 0 ? e.height / o : 1, d = (e, t, n = !1) => {
			let i = e.children, a = t.children, o = Math.min(i.length, a.length);
			for (let e = 0; e < o; e++) {
				let t = i[e], o = a[e], f = r.get(t), m = n || ni.has(t);
				if (f?.nodeType === 1 && v(t) && t.style && f.isConnected) {
					let e = f.getBoundingClientRect();
					if (e.width > 0 && e.height > 0) {
						let n = o.getBoundingClientRect(), r = e.width / c, i = e.height / l, a = n.width, d = n.height, h = f.offsetWidth || r, _ = f.offsetHeight || i, v = o.offsetWidth || a, y = o.offsetHeight || d, b = Math.abs(r - h) > di || Math.abs(i - _) > di || Math.abs(a - v) > di || Math.abs(d - y) > di;
						if (m) {
							let e = g(o, v, y);
							r = a > 0 ? r * s * e.width / a : r, i = d > 0 ? i * u * e.height / d : i, a = e.width, d = e.height;
						} else if (b) {
							let e = g(f, h, _), t = g(o, v, y);
							r = e.width, i = e.height, a = t.width, d = t.height;
						}
						let x = a - r, S = d - i;
						(Math.abs(x) > di || Math.abs(S) > di) && (t.style.boxSizing = "border-box", t.style.width = `${X(r)}px`, t.style.height = `${X(i)}px`, p++);
					}
				}
				d(t, o, m);
			}
		};
		d(t, f);
	} finally {
		u.remove();
	}
	return p;
}
function Xr(e, t = /* @__PURE__ */ new Set()) {
	let n = "";
	if (!e) return n;
	for (let r = 0; r < e.length; r++) {
		let i = e[r];
		try {
			if (i.type === CSSRule.IMPORT_RULE && i.styleSheet) {
				n += Xr(i.styleSheet.cssRules, t);
				continue;
			}
			if (i.type === CSSRule.MEDIA_RULE && i.cssRules) {
				let e = Xr(i.cssRules, t);
				e && (n += `@media ${i.conditionText}{${e}}`);
				continue;
			}
			if (i.type === CSSRule.STYLE_RULE) {
				let e = i.selectorText || "";
				if (fi.test(e)) {
					let r = i.cssText, a = ye(e, ","), o = a.filter((e) => fi.test(e));
					o.length < a.length && r.startsWith(e) && (r = o.join(",") + r.slice(e.length)), r && !t.has(r) && (t.add(r), n += r);
				}
			}
		} catch {}
	}
	return n;
}
function Zr(e) {
	let t = "";
	for (let n of e.styleSheets) {
		let e = -1;
		try {
			e = n.cssRules ? n.cssRules.length : -1;
		} catch {}
		t += (n.href || "inline") + ":" + e + "|";
	}
	return t;
}
function Qr(e) {
	if (!e || !e.styleSheets) return "";
	let t = Zr(e), n = pi.get(e);
	if (n && n.fp === t && n.env === Un) return n.css;
	let r = /* @__PURE__ */ new Set(), i = "";
	for (let t of Array.from(e.styleSheets)) try {
		let e = t.cssRules;
		e && (i += Xr(e, r));
	} catch {}
	return pi.set(e, {
		fp: t,
		env: Un,
		css: i
	}), i;
}
function $r(e, t, n) {
	let r = st(e.clone).sort(), i = r.join(","), a = o.baseStyle.get(i), s;
	a && a.universe === n ? s = a.css : (s = ct(r, n), o.baseStyle.set(i, {
		universe: n,
		css: s
	}));
	let c = Qr(e.element?.ownerDocument || document);
	return e.fontsCSS = t, e.baseCSS = s, e.scrollbarCSS = c, {
		baseCSS: s,
		scrollbarCSS: c,
		fontsCSS: t
	};
}
function ei(e, t, n) {
	let r = null;
	for (let [i, a] of mi) {
		let o = n.getPropertyValue(i);
		if (!o.includes("%")) continue;
		if (n.writingMode !== "horizontal-tb") return;
		r ||= ti(e, n);
		let s = a === "x" ? r.w : r.h, c = o.replace(/(-?\d*\.?\d+(?:e[+-]?\d+)?)%/gi, (e, t) => `${s * t / 100}px`), l = parseFloat(a === "x" ? n.width : n.height);
		t.style.setProperty(i, Number.isFinite(l) ? `${i.slice(0, 3)}(${c}, ${l}px)` : c);
	}
}
function ti(e, t) {
	let n = e.ownerDocument, r = n.documentElement, i = {
		w: r.clientWidth,
		h: r.clientHeight
	};
	if (t.position === "fixed") return i;
	if (t.position === "absolute") {
		let t = e.offsetParent;
		return !t || (t === n.body || t === r) && getComputedStyle(t).position === "static" ? i : {
			w: t.clientWidth,
			h: t.clientHeight
		};
	}
	let a = e.parentElement;
	if (!a) return i;
	let o = getComputedStyle(a), s = (e) => parseFloat(o.getPropertyValue(e)) || 0;
	return {
		w: a.clientWidth - s("padding-left") - s("padding-right"),
		h: a.clientHeight - s("padding-top") - s("padding-bottom")
	};
}
var ni, ri, ii, ai, oi, si, ci, li, ui, X, di, fi, pi, mi, hi = t(() => {
	J(), s(), ir(), V(), Ue(), wr(), ni = /* @__PURE__ */ new WeakSet(), ri = /(?:^|;)position:(absolute|fixed)(?:;|$)/, ii = /* @__PURE__ */ new Set(["xml", "xlink"]), ai = /^[A-Za-z_:][\w.:-]*$/, oi = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\x00-\x08\x0B\x0C\x0E-\x1F\uD800-\uDFFF\uFFFE\uFFFF]/g, si = /[\x00-\x08\x0B\x0C\x0E-\x1F\uD800-\uDFFF\uFFFE\uFFFF]/, ci = (e) => e.replace(oi, (e) => e.length === 2 ? e : ""), li = /^data:[^,]{0,120};base64,/, ui = /* @__PURE__ */ new Set([
		"img",
		"canvas",
		"video",
		"iframe",
		"object",
		"embed"
	]), X = (e, t = 3) => Number.isFinite(e) ? Math.round(e * 10 ** t) / 10 ** t : e, di = .75, fi = /::-(?:webkit-(?:scrollbar|meter|progress|slider)|moz-(?:meter|progress))/i, pi = /* @__PURE__ */ new WeakMap(), mi = [
		["max-width", "x"],
		["min-width", "x"],
		["max-height", "y"],
		["min-height", "y"]
	];
}), gi = {};
n(gi, {
	detectDrawApi: () => _i,
	tryCanvasEngine: () => yi
});
function _i() {
	try {
		let e = document.createElement("canvas").getContext("2d");
		if (e && typeof e.drawElementImage == "function") return "drawElementImage";
	} catch {}
	return null;
}
function vi(e, t, n, r) {
	let i = document.createElement("canvas");
	i.setAttribute("layoutsubtree", ""), i.setAttribute("content", "drawable"), B(i), i.style.cssText = "position:fixed;top:0;left:0;z-index:-2147483647;pointer-events:none";
	let a = document.createElement("div");
	a.setAttribute("drawable", ""), a.style.cssText = `all:initial;box-sizing:border-box;display:block;overflow:visible;width:${n}px;height:${r}px`;
	let o = a.attachShadow({ mode: "open" });
	return Jr(o, t), o.appendChild(e), i.appendChild(a), {
		canvas: i,
		wrapper: a
	};
}
async function yi(e, t, n) {
	let r = _i();
	if (!r) return null;
	let i = e.element, a = e.clone;
	if (!i || !a) return null;
	let o = i.ownerDocument || document;
	if (!i.isConnected || o !== document || i === o.body || i === o.documentElement || i.scrollTop || i.scrollLeft || t.outerShadows || t.clip || t.excludeMode === "remove" || typeof t.filter == "function" && t.filterMode === "remove" || t.width != null || t.height != null) return null;
	try {
		for (let e = i; e; e = e.assignedSlot || e.parentElement || e.getRootNode?.().host) {
			let t = getComputedStyle(e);
			if (t.transform && t.transform !== "none" || t.rotate && t.rotate !== "none" || t.scale && t.scale !== "none" || t.translate && t.translate !== "none" || e === i && t.filter && t.filter !== "none") return null;
			let n = t.getPropertyValue("zoom");
			if (n && Number.isFinite(parseFloat(n)) && Math.abs(parseFloat(n) - 1) > 1e-4) return null;
		}
	} catch {
		return null;
	}
	let s = i.getBoundingClientRect(), c = Math.max(1, s.width || i.offsetWidth || 1), l = Math.max(1, s.height || i.offsetHeight || 1), u = i.offsetWidth || Math.ceil(c), d = i.offsetHeight || Math.ceil(l), f = Number.isFinite(t.scale) && t.scale > 0 ? t.scale : 1, p = Number.isFinite(t.dpr) && t.dpr > 0 ? t.dpr : window.devicePixelRatio || 1, m = Math.max(1, Math.round(u * f * p)), h = Math.max(1, Math.round(d * f * p)), { canvas: g, wrapper: _ } = vi(a, (e.scrollbarCSS || "") + (e.baseCSS || "") + (e.fontsCSS || "") + (e.classCSS || ""), c, l);
	g.width = m, g.height = h, document.body.appendChild(g);
	let v;
	try {
		g.getBoundingClientRect(), await new Promise((e) => {
			requestAnimationFrame(() => setTimeout(e, 0)), setTimeout(e, 50);
		});
		let e = g.getContext("2d"), n = e && e[r];
		if (typeof n != "function") return null;
		e.save(), e.scale(p * f, p * f), n.call(e, _, 0, 0, c, l), e.restore();
		let i;
		try {
			i = e.getImageData(0, 0, Math.min(64, m), Math.min(64, h)).data;
		} catch {
			return K(t, `html-in-canvas: ${r} tainted the canvas; used the SVG engine.`), null;
		}
		let a = !1;
		for (let e = 3; e < i.length; e += 4) if (i[e] > 0) {
			a = !0;
			break;
		}
		if (!a) {
			let t = e.getImageData(0, 0, m, h).data, n = !1;
			for (let e = 3; e < t.length; e += 4) if (t[e] > 0) {
				n = !0;
				break;
			}
			if (!n) return null;
		}
		v = document.createElement("canvas"), v.width = m, v.height = h, v.getContext("2d").drawImage(g, 0, 0), v.style.width = `${u * f}px`, v.style.height = `${d * f}px`;
	} catch (e) {
		return K(t, "html-in-canvas: the browser couldn't paint it; used the SVG engine.", e), null;
	} finally {
		try {
			g.remove();
		} catch {}
	}
	let y = Object.freeze({
		w0: c,
		h0: l,
		vbW: u,
		vbH: d,
		targetW: c,
		targetH: l,
		contentX: 0,
		contentY: 0,
		clip: null
	});
	Object.defineProperty(t, "meta", {
		value: y,
		enumerable: !0,
		writable: !1,
		configurable: !0
	}), n.artifacts = {
		classCSS: e.classCSS || "",
		fontsCSS: e.fontsCSS || "",
		baseCSS: e.baseCSS || "",
		scrollbarCSS: e.scrollbarCSS || ""
	}, e.clone = e.nodeMap = e.styleCache = e.svgString = null;
	let b = [...document.querySelectorAll("#snapdom-sandbox")].find(We);
	return b && b.style.position === "absolute" && b.remove(), v;
}
var bi = t(() => {
	cn(), V(), hi();
}), xi = {};
n(xi, {
	cropSvgText: () => Si,
	decodeSvgFromDataURL: () => Ei,
	encodeSvgToDataURL: () => ki,
	isSvgDataURL: () => Ti,
	patchSvgHeader: () => Oi,
	peekSvgHeader: () => Di,
	zoomSvgText: () => wi
});
function Si(e, t, { shiftContent: n = U() } = {}) {
	let r = [
		"x",
		"y",
		"width",
		"height"
	].map((e) => Number(t?.[e]));
	if (!r.every(Number.isFinite) || r[2] <= 0 || r[3] <= 0) throw RangeError("[SnapDOM] crop needs finite x/y and a positive width/height.");
	let i = e.match(/<svg\b[^>]*>/i);
	if (!i) throw Error("[SnapDOM] Only SVG captures can be cropped.");
	let a = i[0], o = (a.match(/\bviewBox="([^"]+)"/i) || [])[1], s = String(o || "").trim().split(/[\s,]+/).map(Number);
	if (s.length !== 4 || !s.every(Number.isFinite) || s[2] <= 0 || s[3] <= 0) throw Error("[SnapDOM] Can't crop: the SVG has no valid viewBox.");
	let [c, l, u, d] = s, f = Math.max(c, r[0]), p = Math.max(l, r[1]), m = Math.min(c + u, r[0] + r[2]), h = Math.min(l + d, r[1] + r[3]);
	if (!(m > f) || !(h > p)) throw RangeError("[SnapDOM] The crop area does not intersect the capture.");
	let g = parseFloat((a.match(/\bwidth="([\d.]+)/i) || [])[1]), _ = parseFloat((a.match(/\bheight="([\d.]+)/i) || [])[1]), v = Number.isFinite(g) && g > 0 ? g / u : 1, y = Number.isFinite(_) && _ > 0 ? _ / d : 1, b = Math.max(1, (m - f) * v), x = Math.max(1, (h - p) * y), S = a.replace(/(\bwidth=")[^"]*/i, `$1${b}`).replace(/(\bheight=")[^"]*/i, `$1${x}`), C = n ? Ci(e, a, f, p) : null;
	if (C) return S.replace(/(\bviewBox=")[^"]*/i, (e, t) => `${t}0 0 ${m - f} ${h - p}`) + C.slice(a.length);
	let w = S.replace(/(\bviewBox=")[^"]*/i, `$1${f} ${p} ${m - f} ${h - p}`);
	return e.replace(a, w);
}
function Ci(e, t, n, r) {
	if (!e.startsWith(t)) return null;
	let i = /^\s*<foreignObject\b[^>]*>/i.exec(e.slice(t.length, t.length + 2048));
	if (!i) return null;
	let a = i[0], o = (e, t, n) => {
		let r = RegExp(`(\\s${t}=")([^"]*)`), i = e.match(r), a = i ? parseFloat(i[2]) : 0;
		return Number.isFinite(a) ? i ? e.replace(r, (e, t) => `${t}${a - n}`) : e.replace(/^(\s*<foreignObject\b)/i, (e, r) => `${r} ${t}="${-n}"`) : null;
	}, s = o(a, "x", n), c = s && o(s, "y", r);
	return c ? t + c + e.slice(t.length + a.length) : null;
}
function wi(e, t, n) {
	let r = e.match(/<svg\b[^>]*>/i);
	if (!r) return null;
	let i = r[0], a = String((i.match(/\bviewBox="([^"]+)"/i) || [])[1] || "").trim().split(/[\s,]+/).map(Number);
	if (a.length !== 4 || !a.every(Number.isFinite) || a[2] <= 0 || a[3] <= 0) return null;
	let o = Math.min(t / a[2], n / a[3]), s = /^\s*<foreignObject\b[^>]*>/i.exec(e.slice(i.length, i.length + 2048));
	if (!s) return null;
	let c = s[0], l = {
		x: (t - o * a[2]) / 2,
		y: (n - o * a[3]) / 2
	};
	for (let e of [
		"x",
		"y",
		"width",
		"height"
	]) {
		let t = RegExp(`(\\s${e}=")([^"]*)`), n = c.match(t), r = n ? parseFloat(n[2]) : 0;
		if (!Number.isFinite(r)) return null;
		let i = r * o + (l[e] || 0);
		c = n ? c.replace(t, (e, t) => `${t}${i}`) : c.replace(/^(\s*<foreignObject\b)/i, (t, n) => `${n} ${e}="${i}"`);
	}
	let u = e.slice(i.length + s[0].length), d = u.indexOf("</style>"), f = /<div\b[^>]*?( style=")([^"]*)"/i.exec(u.slice(d < 0 ? 0 : d));
	if (!f) return null;
	let p = (d < 0 ? 0 : d) + f.index, m = u.slice(0, p) + f[0].slice(0, -1) + `;zoom:${o} !important"` + u.slice(p + f[0].length);
	return i.replace(/(\bwidth=")[^"]*/i, `$1${t}`).replace(/(\bheight=")[^"]*/i, `$1${n}`).replace(/(\bviewBox=")[^"]*/i, `$10 0 ${t} ${n}`) + c + m;
}
function Ti(e) {
	return typeof e == "string" && /^data:image\/svg\+xml/i.test(e);
}
function Ei(e) {
	let t = e.indexOf(",");
	return t >= 0 ? decodeURIComponent(e.slice(t + 1)) : "";
}
function Di(e) {
	let t = e.indexOf(",");
	if (t < 0) return "";
	let n = e.slice(t + 1, t + 1201).replace(/%[0-9A-Fa-f]?$/, "");
	try {
		return decodeURIComponent(n);
	} catch {
		return "";
	}
}
function Oi(e, t) {
	let n = e.indexOf(",") + 1, r = Di(e).match(/<svg\b[^>]*>/i)?.[0], i = r && encodeURIComponent(r);
	return !i || !e.startsWith(i, n) ? null : e.slice(0, n) + encodeURIComponent(t(r)) + e.slice(n + i.length);
}
function ki(e) {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(e)}`;
}
var Ai = t(() => {
	G();
});
function ji(e) {
	let t = [], n = "", r = 0;
	for (let i = 0; i < e.length; i++) {
		let a = e[i];
		a === "(" && r++, a === ")" && (r = Math.max(0, r - 1)), a === ";" && r === 0 ? (t.push(n), n = "") : n += a;
	}
	return n.trim() && t.push(n), t.map((e) => e.trim()).filter(Boolean);
}
function Mi(e) {
	let t = [], n = "", r = 0;
	for (let i = 0; i < e.length; i++) {
		let a = e[i];
		a === "(" && r++, a === ")" && (r = Math.max(0, r - 1)), a === "," && r === 0 ? (t.push(n.trim()), n = "") : n += a;
	}
	n.trim() && t.push(n.trim());
	let i = [];
	for (let e of t) {
		if (/\binset\b/i.test(e)) continue;
		let [t = "0px", n = "0px", r = "0px"] = e.match(/-?\d+(?:\.\d+)?px/gi) || [];
		r = `${parseFloat(r) / 2}px`;
		let a = e.replace(/-?\d+(?:\.\d+)?px/gi, "").replace(/\binset\b/gi, "").trim().replace(/\s{2,}/g, " "), o = !!a && a !== ",";
		i.push(`drop-shadow(${t} ${n} ${r}${o ? ` ${a}` : ""})`);
	}
	return i.join(" ");
}
function Ni(e) {
	let t = ji(e), n = null, r = null, i = null, a = [];
	for (let e of t) {
		let t = e.indexOf(":");
		if (t < 0) continue;
		let o = e.slice(0, t).trim().toLowerCase(), s = e.slice(t + 1).trim();
		o === "box-shadow" ? i = s : o === "filter" ? n = s : o === "-webkit-filter" ? r = s : a.push([o, s]);
	}
	if (i) {
		let e = Mi(i);
		e && (n = n ? `${n} ${e}` : e, r = r ? `${r} ${e}` : e);
	}
	let o = [...a];
	return n && o.push(["filter", n]), r && o.push(["-webkit-filter", r]), o.map(([e, t]) => `${e}:${t}`).join(";");
}
function Pi(e) {
	return e.replace(/([^{}]+)\{([^}]*)\}/g, (e, t, n) => `${t}{${Ni(n)}}`);
}
function Fi(e) {
	return e = e.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (e, t) => e.replace(t, () => Pi(t))), e = e.replace(/style=(['"])([\s\S]*?)\1/gi, (e, t, n) => `style=${t}${Ni(n)}${t}`), e;
}
function Ii() {
	return Bi || (Bi = (async () => {
		try {
			let e = new Image();
			e.decoding = "sync", e.src = "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%228%22%20height%3D%2220%22%3E%3CforeignObject%20width%3D%228%22%20height%3D%2220%22%3E%3Cdiv%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%20style%3D%22width%3A4px%3Bheight%3A4px%3Bmargin-top%3A8px%3Bbackground%3A%23000%3Bbox-shadow%3A0%208px%200%200%20%23000%22%3E%3C%2Fdiv%3E%3C%2FforeignObject%3E%3C%2Fsvg%3E", await e.decode();
			let t = document.createElement("canvas");
			t.width = 8, t.height = 20;
			let n = t.getContext("2d", { willReadFrequently: !0 });
			n.drawImage(e, 0, 0);
			let r = n.getImageData(2, 18, 1, 1).data[3] > 128, i = n.getImageData(2, 2, 1, 1).data[3] > 128;
			return {
				native: r || i,
				flippedY: i && !r
			};
		} catch {
			return {
				native: !1,
				flippedY: !1
			};
		}
	})(), Bi);
}
function Li(e) {
	let t = [], n = 0, r = 0;
	for (let i = 0; i < e.length; i++) {
		let a = e[i];
		a === "(" ? n++ : a === ")" ? n = Math.max(0, n - 1) : a === "," && n === 0 && (t.push(e.slice(r, i)), r = i + 1);
	}
	return t.push(e.slice(r)), t.map((e) => {
		let t = 0, n = 0, r = "", i = 0;
		for (; i < e.length;) {
			let a = e[i];
			if (a === "(" ? t++ : a === ")" && (t = Math.max(0, t - 1)), t === 0 && (i === 0 || e[i - 1] === " ")) {
				let t = /^-?\d*\.?\d+px/.exec(e.slice(i));
				if (t) {
					n++, r += n === 2 ? `${-parseFloat(t[0])}px` : t[0], i += t[0].length;
					continue;
				}
			}
			r += a, i++;
		}
		return r;
	}).join(",");
}
function Ri(e, t) {
	let n = (e) => ji(e).map((e) => {
		let n = e.indexOf(":");
		if (n < 0) return e;
		let r = e.slice(0, n).trim().toLowerCase();
		return r === "text-shadow" || t && r === "box-shadow" ? `${r}:${Li(e.slice(n + 1))}` : e;
	}).join(";");
	return e = e.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (e, t) => e.replace(t, () => t.replace(/([^{}]+)\{([^}]*)\}/g, (e, t, r) => `${t}{${n(r)}}`))), e = e.replace(/style=(['"])([\s\S]*?)\1/gi, (e, t, r) => `style=${t}${n(r)}${t}`), e;
}
async function zi(e) {
	if (!/(?:box-shadow|text-shadow)\s*:[^;"}]*px/i.test(e)) return {
		svg: e,
		naturalOnly: !1
	};
	let { native: t, flippedY: n } = await Ii();
	try {
		let r = e;
		return t || (r = Fi(r)), n && (r = Ri(r, t)), {
			svg: r,
			naturalOnly: !0
		};
	} catch {
		return {
			svg: e,
			naturalOnly: !0
		};
	}
}
var Bi, Vi = t(() => {
	Bi = null;
}), Hi = {};
n(Hi, {
	MAX_RASTER_AREA: () => ta,
	MAX_RASTER_SIDE: () => ea,
	WEBP_MAX_SIDE: () => na,
	__setDecodeFrameIdleMs: () => qi,
	toCanvas: () => $i
});
function Ui(e, t, n) {
	try {
		let r = e.match(/<svg\b[^>]*>/i);
		if (!r) return e;
		let i = r[0], a = parseFloat((i.match(/\bwidth="([\d.]+)/i) || [])[1]), o = parseFloat((i.match(/\bheight="([\d.]+)/i) || [])[1]);
		if (!Number.isFinite(a) || !Number.isFinite(o) || a <= 0 || o <= 0) return e;
		let s = Math.min(1, ea / a, ea / o, Math.sqrt(ta / (a * o)));
		if (s >= 1) return e;
		let c = Math.max(1, Math.floor(a * s)), l = Math.max(1, Math.floor(o * s));
		return q(n, "raster-clamp", `capture ${Math.round(a)}x${Math.round(o)}px exceeds decode limits; downscaled to ${c}x${l}px`), K(t, `${Math.round(a)}\xD7${Math.round(o)}px is too large for the browser to draw; scaled down to ${c}\xD7${l}px. For full size, export ${typeof CompressionStream == "function" ? "a PNG or JPEG" : "a JPEG"} blob, an SVG, or crop.`), e.replace(i, i.replace(/(\bwidth=")[\d.]+/i, `$1${c}`).replace(/(\bheight=")[\d.]+/i, `$1${l}`));
	} catch {
		return e;
	}
}
function Wi(e, t, n) {
	let r = e.naturalWidth, i = e.naturalHeight, a = Math.min(8, i), o = document.createElement("canvas");
	o.width = Math.max(1, Math.ceil(r * t)), o.height = Math.max(1, Math.ceil(a * 6 * n));
	let s = o.getContext("2d", { willReadFrequently: !0 });
	return !s || !(r > 0 && i > 0) ? null : () => {
		s.clearRect(0, 0, o.width, o.height);
		for (let o = 0; o < 6; o++) {
			let c = Math.floor((i - a) * o / 5);
			s.drawImage(e, 0, c, r, a, 0, o * a * n, r * t, a * n);
		}
		let c = s.getImageData(0, 0, o.width, o.height).data, l = !1, u = 0;
		for (let e = 3; e < c.length; e += 4) c[e] > 0 && (l = !0), u = u * 31 + c[e - 3] + c[e - 2] * 7 + c[e - 1] * 13 + c[e] | 0;
		return {
			ink: l,
			sig: u
		};
	};
}
async function Gi(e, t, n) {
	B(e), e.style.cssText = "position:fixed;left:-99999px;top:-99999px;pointer-events:none", document.body.appendChild(e);
	try {
		if (!n) return await ra(), await ra(), !1;
		let e = performance.now() + (t ? 600 : 150), r = null;
		for (;;) {
			let i;
			try {
				i = n();
			} catch {
				return !1;
			}
			if (i.ink && (!t || i.sig === r)) return !0;
			if (r = i.sig, performance.now() > e) return i.ink;
			await ra();
		}
	} finally {
		try {
			e.remove();
		} catch {}
	}
}
function Ki() {
	clearTimeout(da), oa?.remove(), oa = null, sa = 0;
}
function qi(e) {
	ua = e ?? aa;
}
function Ji(e) {
	if (typeof document > "u" || !document.body) return new Image();
	if (clearTimeout(da), oa && !oa.contentDocument && Ki(), oa && sa > ia && ca === 0 && Ki(), !oa) {
		let e = document.createElement("iframe");
		B(e), e.setAttribute("aria-hidden", "true"), e.style.cssText = "position:absolute;left:-9999px;top:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none";
		try {
			document.body.appendChild(e);
		} catch {}
		if (e.contentDocument) oa = e, sa = 0;
		else {
			try {
				e.remove();
			} catch {}
			return new Image();
		}
	}
	sa += e.length, ca += 1;
	let t = oa.contentDocument.createElement("img");
	return t.__snapdomDecodeFrame = !0, t;
}
function Yi(e, t = !1) {
	!e || !e.__snapdomDecodeFrame || (e.__snapdomDecodeFrame = !1, ca = Math.max(0, ca - 1), t && (la = !0), !(ca > 0) && (la ? (la = !1, Ki()) : da = setTimeout(Ki, ua)));
}
function Xi(e, t) {
	return e.loading = "eager", e.decoding = "sync", e.crossOrigin = "anonymous", e.src = t, e.decode();
}
function Zi(e) {
	if (typeof e != "string") return !1;
	let t = e.indexOf(",") + 1, n = Math.max(48, Math.floor((e.length - t) / 200)), r = 0, i = 0;
	for (let a = t; a + 48 <= e.length; a += n) {
		let t = e.slice(a, a + 48);
		r++, ha.some((e) => t.includes(e)) || i++;
	}
	return i * 2 > r;
}
function Qi(e, t, n, r, i) {
	if (!t.naturalWidth) {
		e.drawImage(t, 0, 0, n, r);
		return;
	}
	let a = n * r, o = a > fa && !Zi(i) ? Math.min(ma, Math.ceil(a / pa)) : 1;
	if (o === 1) {
		e.drawImage(t, 0, 0, n, r);
		return;
	}
	let s = t.naturalWidth, c = t.naturalHeight / r;
	for (let i = 0; i < o; i++) {
		let a = Math.round(i * r / o), l = i === o - 1 ? r : Math.round((i + 1) * r / o);
		e.drawImage(t, 0, a * c, s, (l - a) * c, 0, a, n, l - a);
	}
}
async function $i(e, t, n = {}) {
	let { width: r, height: i, scale: a = 1, dpr: o = 1, meta: s = {}, backgroundColor: c, crop: l = null } = t, u = typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement ? e : null, d = e, f = !1, p = !1;
	if (l && !Ti(e)) throw RangeError("[SnapDOM] Only SVG captures can be cropped.");
	if (Ti(e)) {
		let r = (Di(e).match(/<svg\b[^>]*>/i) || [])[0] || "", i = parseFloat((r.match(/\bwidth="([\d.]+)/i) || [])[1]), a = parseFloat((r.match(/\bheight="([\d.]+)/i) || [])[1]), o = Number.isFinite(i) && Number.isFinite(a) && i > 0 && a > 0 && Math.min(1, ea / i, ea / a, Math.sqrt(ta / (i * a))) < 1, s = U();
		if (l || o || s) try {
			let r = !s && Oi(e, (e) => Ui(l ? Si(e, l, { shiftContent: !1 }) : e, t, n));
			if (r) d = r;
			else {
				let r = Ei(e);
				if (l && (r = Si(r, l)), s) {
					let e = await zi(r);
					r = e.svg, f = e.naturalOnly, p = /@font-face|data:image\//i.test(r);
				}
				(o || l) && (r = Ui(r, t, n)), d = ki(r);
			}
		} catch (t) {
			if (l) throw t;
			d = e;
		}
	}
	let m = u || Ji(d);
	try {
		u || await Xi(m, d);
	} catch (e) {
		if (!m.__snapdomDecodeFrame) throw e;
		let t = m;
		m = Ji(d), Yi(t);
		try {
			await Xi(m, d);
		} catch (e) {
			throw Yi(m, n.retireDecodeFrame), e;
		}
	}
	try {
		!u && !U() && Ti(d) && (W() ? /.data(?:%3A|:)image(?:%2F|\/)svg/i : /(?:%40|@)font-face/i).test(d) && await new Promise((e) => {
			let t = new MessageChannel();
			t.port1.onmessage = () => {
				t.port1.close(), t.port2.close(), e();
			}, t.port2.postMessage(0);
		});
		let e = u ? u.width : m.naturalWidth, h = u ? u.height : m.naturalHeight, g = l ? e : Number.isFinite(s.vbW) ? s.vbW : Number.isFinite(s.w0) ? s.w0 : e, y = l ? h : Number.isFinite(s.vbH) ? s.vbH : Number.isFinite(s.h0) ? s.h0 : h, b, x, S = Number.isFinite(r), C = Number.isFinite(i);
		if (S && C) b = Math.max(1, r), x = Math.max(1, i);
		else if (S) {
			let e = r / Math.max(1, g);
			b = r, x = y * e;
		} else if (C) {
			let e = i / Math.max(1, y);
			x = i, b = g * e;
		} else {
			let t = u && Number.isFinite(s.vbW) && Number.isFinite(s.vbH);
			b = t ? s.vbW : e, x = t ? s.vbH : h;
		}
		!S && !C && (b *= a, x *= a);
		let w = b * o, T = x * o, E = Math.max(w / ea, T / ea, Math.sqrt(w * T / ta)), D = n.codec === "webp" ? Math.max(w, T) / na : 0, O = Math.max(E, D);
		if (O > 1) {
			let e = E <= 1;
			q(n, "canvas-clamp", `output ${Math.round(w)}x${Math.round(T)}px exceeds ${e ? "WebP" : "canvas"} limits; downscaled`), K(t, e ? `${Math.round(w)}\xD7${Math.round(T)}px is larger than WebP can encode (${na}px per side); scaled down. For full size, export a PNG, an SVG, or crop.` : `${Math.round(w)}\xD7${Math.round(T)}px is larger than a canvas allows; scaled down. For full size, export ${typeof CompressionStream == "function" ? "a PNG or JPEG" : "a JPEG"} blob, an SVG, or crop.`), b /= O, x /= O;
		}
		let k = v(t.canvas) && _(t.canvas, "canvas") ? t.canvas : document.createElement("canvas");
		k.width = Math.max(1, b * o), k.height = Math.max(1, x * o), k.style.width = `${b}px`, k.style.height = `${x}px`;
		let A = k.getContext("2d");
		if (!A) throw Error("[SnapDOM] The canvas you passed has no 2D context (is it already used for WebGL?).");
		let j = null, M = n.layoutZoom || 1;
		if (!u && W()) {
			let e = M * g / (b * o), t = Math.round(b * o * e), n = Math.round(x * o * e);
			e > 1.01 && t <= ea && n <= ea && t * n <= ta && (j = {
				w: t,
				h: n
			});
		}
		let ee = f && (Math.round(b * o) !== e || Math.round(x * o) !== h), N = ee ? e : j ? j.w : b * o, P = ee ? h : j ? j.h : x * o, F = U() && !u ? Wi(m, N / Math.max(1, e), P / Math.max(1, h)) : null, I = !1;
		F && (I = await Gi(m, p, F));
		let L = () => {
			if (A.save(), o !== 1 && A.scale(o, o), c && (A.save(), A.fillStyle = c, A.fillRect(0, 0, b, x), A.restore()), ee) {
				let t = document.createElement("canvas");
				t.width = e, t.height = h, Qi(t.getContext("2d"), m, e, h, d), A.drawImage(t, 0, 0, b, x);
			} else {
				if (A.save(), A.setTransform(1, 0, 0, 1, 0, 0), j) {
					let e = document.createElement("canvas");
					for (e.width = j.w, e.height = j.h, Qi(e.getContext("2d"), m, j.w, j.h, d); e.width > b * o * 2;) {
						let t = document.createElement("canvas");
						t.width = Math.ceil(e.width / 2), t.height = Math.ceil(e.height / 2), t.getContext("2d").drawImage(e, 0, 0, t.width, t.height), e = t;
					}
					A.imageSmoothingQuality = "high", A.drawImage(e, 0, 0, b * o, x * o);
				} else Qi(A, m, b * o, x * o, d);
				A.restore();
			}
			A.restore();
		};
		if (L(), F && I && p) {
			let e = !0;
			try {
				e = F().ink;
			} catch {}
			if (!e) {
				let t = performance.now() + 600;
				do {
					await ra();
					try {
						e = F().ink;
					} catch {
						break;
					}
				} while (!e && performance.now() < t);
				k.width = k.width, L();
			}
		}
		return k;
	} finally {
		Yi(m, n.retireDecodeFrame);
	}
}
var ea, ta, na, ra, ia, aa, oa, sa, ca, la, ua, da, fa, pa, ma, ha, ga = t(() => {
	G(), cn(), D(), V(), Ai(), Vi(), ea = U() ? 16384 : 32767, ta = 268435456, na = 16383, ra = () => new Promise((e) => {
		requestAnimationFrame(e), setTimeout(e, 50);
	}), ia = 25165824, aa = 5e3, oa = null, sa = 0, ca = 0, la = !1, ua = aa, da = 0, fa = 4e6, pa = 2e6, ma = 8, ha = [
		"%3C",
		"%3E",
		"%20",
		"%7B",
		"%7D",
		"%3B"
	];
}), _a = {};
n(_a, { rasterize: () => va });
async function va(e, t, n = {}) {
	let r = await $i(e, t, {
		...n,
		codec: t.format
	}), i = r.width * r.height <= 2e6 ? r.toDataURL(`image/${t.format}`, t.quality) : await new Promise((e) => {
		let n = () => e(r.toDataURL(`image/${t.format}`, t.quality));
		try {
			r.toBlob((t) => {
				if (!t) return n();
				let r = new FileReader();
				r.onload = () => e(String(r.result || "")), r.onerror = n, r.readAsDataURL(t);
			}, `image/${t.format}`, t.quality);
		} catch {
			n();
		}
	}), a = new Image();
	return a.src = i, U() ? await a.decode() : await new Promise((e, t) => {
		if (a.complete && a.naturalWidth) return e();
		a.onload = e, a.onerror = t;
	}), a.style.width = `${r.width / t.dpr}px`, a.style.height = `${r.height / t.dpr}px`, a;
}
var ya = t(() => {
	ga(), G();
}), ba = {};
n(ba, {
	toImg: () => xa,
	toSvg: () => xa
});
async function xa(e, t, n = {}) {
	let { scale: r = 1, width: i, height: a, meta: o = {} } = t, s = Number.isFinite(i), c = Number.isFinite(a), l = Number.isFinite(r) && r !== 1 || s || c;
	if (U() && l) try {
		let { svg: t } = await zi(Ei(e)), n = (t.match(/<svg\b[^>]*>/i) || [])[0] || "", l = parseFloat((n.match(/\bwidth="([\d.]+)/i) || [])[1]), u = parseFloat((n.match(/\bheight="([\d.]+)/i) || [])[1]);
		if (!Number.isFinite(l) || !Number.isFinite(u)) throw Error("The SVG has no size.");
		let d = Number.isFinite(o.vbW) ? o.vbW : Number.isFinite(o.w0) ? o.w0 : l, f = Number.isFinite(o.vbH) ? o.vbH : Number.isFinite(o.h0) ? o.h0 : u, p, m;
		s && c ? (p = i, m = a) : s ? (p = i, m = Math.max(1, Math.round(i / Math.max(1, d) * f))) : c ? (m = a, p = Math.max(1, Math.round(a / Math.max(1, f) * d))) : (p = Math.max(1, Math.round(l * r)), m = Math.max(1, Math.round(u * r)));
		let h = wi(t, p, m) || t.replace(/width="[^"]*"/, `width="${p}"`).replace(/height="[^"]*"/, `height="${m}"`), g = new Image();
		return g.decoding = "sync", g.loading = "eager", g.src = ki(h), await g.decode(), g.style.width = `${p}px`, g.style.height = `${m}px`, g;
	} catch (r) {
		return q(n, "safari-png-fallback", "Safari vector toImg failed; using PNG", r), K(t, "Safari couldn't show the SVG; used a PNG.", r), va(e, {
			...t,
			format: "png",
			quality: 1,
			meta: o
		}, n);
	}
	let u = e, d = !1;
	if (!s && !c && r !== 1 && typeof e == "string" && e.startsWith("data:image/svg+xml")) try {
		let t = (e) => {
			let t = Number((e.match(/\bwidth="([\d.]+)"/i) || [])[1]), n = Number((e.match(/\bheight="([\d.]+)"/i) || [])[1]);
			return t > 0 && n > 0 ? (d = !0, e.replace(/\bwidth="[^"]*"/i, `width="${Math.max(1, Math.round(t * r))}"`).replace(/\bheight="[^"]*"/i, `height="${Math.max(1, Math.round(n * r))}"`)) : e;
		}, n = Oi(e, t);
		if (n) u = n;
		else {
			let n = Ei(e), r = (n.match(/<svg\b[^>]*>/i) || [])[0] || "", i = t(r);
			d && (u = ki(n.replace(r, i)));
		}
	} catch {}
	let f = new Image();
	f.decoding = "sync", f.loading = "eager", f.src = u;
	try {
		await f.decode();
	} catch (t) {
		if (!d) throw t;
		f.src = e, d = !1, await f.decode();
	}
	if (s && c) f.style.width = `${i}px`, f.style.height = `${a}px`;
	else if (s) {
		let e = Number.isFinite(o.vbW) ? o.vbW : Number.isFinite(o.w0) ? o.w0 : f.naturalWidth, t = Number.isFinite(o.vbH) ? o.vbH : Number.isFinite(o.h0) ? o.h0 : f.naturalHeight, n = i / Math.max(1, e);
		f.style.width = `${i}px`, f.style.height = `${Math.max(1, Math.round(t * n))}px`;
	} else if (c) {
		let e = Number.isFinite(o.vbW) ? o.vbW : Number.isFinite(o.w0) ? o.w0 : f.naturalWidth, t = Number.isFinite(o.vbH) ? o.vbH : Number.isFinite(o.h0) ? o.h0 : f.naturalHeight, n = a / Math.max(1, t);
		f.style.height = `${a}px`, f.style.width = `${Math.max(1, Math.round(e * n))}px`;
	} else {
		let n = Math.max(1, Math.round(f.naturalWidth * (d ? 1 : r))), i = Math.max(1, Math.round(f.naturalHeight * (d ? 1 : r)));
		if (f.style.width = `${n}px`, f.style.height = `${i}px`, !d && r !== 1 && typeof e == "string" && e.startsWith("data:image/svg+xml")) try {
			let t = decodeURIComponent(e.split(",")[1]).replace(/width="[^"]*"/, `width="${n}"`).replace(/height="[^"]*"/, `height="${i}"`);
			f.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(t)}`, await f.decode();
		} catch (n) {
			K(t, "Couldn't size the SVG image.", n), f.src !== e && (f.src = e, await f.decode().catch(() => {}));
		}
	}
	return f;
}
var Sa = t(() => {
	J(), cn(), ya(), Ai(), Vi();
}), Ca = {};
n(Ca, { encodePng: () => Ta });
function wa(e, t = /* @__PURE__ */ new Uint8Array()) {
	let n = new Uint8Array(t.length + 12), r = new DataView(n.buffer);
	r.setUint32(0, t.length);
	for (let t = 0; t < 4; t++) n[t + 4] = e.charCodeAt(t);
	n.set(t, 8);
	let i = 0xffffffff;
	for (let e = 4; e < n.length - 4; e++) i = Ea[(i ^ n[e]) & 255] ^ i >>> 8;
	return r.setUint32(n.length - 4, (i ^ 0xffffffff) >>> 0), n;
}
async function Ta(e, t, n) {
	if (![e, t].every((e) => Number.isInteger(e) && e > 0 && e <= 0x7fffffff)) throw RangeError("[SnapDOM] PNG dimensions must be integers from 1 to 2147483647");
	let r = /* @__PURE__ */ new Uint8Array(13), i = new DataView(r.buffer);
	i.setUint32(0, e), i.setUint32(4, t), r[8] = 8, r[9] = 6;
	let a = [
		new Uint8Array([
			137,
			80,
			78,
			71,
			13,
			10,
			26,
			10
		]),
		wa("IHDR", r),
		wa("sRGB", new Uint8Array([0]))
	], o = e * 4, s = Math.max(1, Math.floor(65536 / (o + 1))), c = new Uint8Array(o), l = 0, u = new CompressionStream("deflate"), d = u.writable.getWriter(), f = u.readable.getReader(), p, m = (async () => {
		try {
			for (;;) {
				let { done: e, value: t } = await f.read();
				if (e) return;
				a.push(wa("IDAT", t));
			}
		} catch (e) {
			p = e, await d.abort(e).catch(() => {});
		}
	})();
	try {
		for await (let e of n) {
			if (!(e instanceof Uint8Array || e instanceof Uint8ClampedArray) || !e.length || e.length % o) throw RangeError("[SnapDOM] PNG input must contain complete RGBA rows");
			let n = e.length / o;
			if (l + n > t) throw RangeError("[SnapDOM] PNG input exceeds the declared height");
			for (let t = 0; t < n; t += s) {
				let r = Math.min(n, t + s), i = new Uint8Array((r - t) * (o + 1));
				for (let n = t; n < r; n++) {
					let r = e.subarray(n * o, (n + 1) * o), a = (n - t) * (o + 1), s = 0, l = 0;
					for (let e = 0; e < o; e++) {
						let t = r[e] - (e < 4 ? 0 : r[e - 4]) & 255, n = r[e] - c[e] & 255;
						s += Math.min(t, 256 - t), l += Math.min(n, 256 - n), i[a + e + 1] = n;
					}
					if (i[a] = l <= s ? 2 : 1, s < l) for (let e = 0; e < o; e++) i[a + e + 1] = r[e] - (e < 4 ? 0 : r[e - 4]);
					c = r;
				}
				await d.write(i);
			}
			c = c.slice(), l += n;
		}
		if (l !== t) throw RangeError("[SnapDOM] PNG input does not match the declared height");
		if (await d.close(), await m, p) throw p;
		return a.push(wa("IEND")), new Blob(a, { type: "image/png" });
	} catch (e) {
		throw await Promise.allSettled([d.abort(e), f.cancel(e)]), await m, e;
	} finally {
		d.releaseLock(), f.releaseLock();
	}
}
var Ea, Da = t(() => {
	Ea = /* @__PURE__ */ new Uint32Array(256);
	for (let e = 0; e < 256; e++) {
		let t = e;
		for (let e = 0; e < 8; e++) t = t & 1 ? 0xedb88320 ^ t >>> 1 : t >>> 1;
		Ea[e] = t;
	}
}), Oa = {};
n(Oa, { encodeJpeg: () => Ma });
function ka(e) {
	let t = [0, 240];
	for (let e = 0; e < 16; e++) for (let n = 1; n <= 10; n++) t.push(e << 4 | n);
	return e.concat(t.filter((t) => !e.includes(t)).sort((e, t) => e - t));
}
function Aa(e) {
	for (let t = 0; t < 64; t += 8) ja(e, t, 1);
	for (let t = 0; t < 8; t++) ja(e, t, 8);
}
function ja(e, t, n) {
	let r = e[t] + e[t + 7 * n], i = e[t] - e[t + 7 * n], a = e[t + n] + e[t + 6 * n], o = e[t + n] - e[t + 6 * n], s = e[t + 2 * n] + e[t + 5 * n], c = e[t + 2 * n] - e[t + 5 * n], l = e[t + 3 * n] + e[t + 4 * n], u = e[t + 3 * n] - e[t + 4 * n], d = r + l, f = r - l, p = a + s, m = a - s;
	e[t] = d + p, e[t + 4 * n] = d - p;
	let h = (m + f) * .707106781;
	e[t + 2 * n] = f + h, e[t + 6 * n] = f - h, d = u + c, p = c + o, m = o + i;
	let g = (d - m) * .382683433, _ = .5411961 * d + g, v = 1.306562965 * m + g, y = p * .707106781, b = i + y, x = i - y;
	e[t + 5 * n] = x + _, e[t + 3 * n] = x - _, e[t + n] = b + v, e[t + 7 * n] = b - v;
}
async function Ma(e, t, n, r) {
	if (![e, t].every((e) => Number.isInteger(e) && e > 0 && e <= 65535)) throw RangeError("[SnapDOM] JPEG dimensions must be integers from 1 to 65535");
	let i = Math.min(100, Math.max(1, Math.round((typeof r == "number" && r >= 0 && r <= 1 ? r : .92) * 100))), a = i < 50 ? 5e3 / i : 200 - i * 2, o = +(i < 90), s = 8 << o, c = [0], l = [Pa, Fa].map((e, t) => {
		let n = /* @__PURE__ */ new Uint8Array(64), r = /* @__PURE__ */ new Float32Array(64);
		for (let t = 0; t < 64; t++) {
			let i = Math.min(255, Math.max(1, Math.floor((e[t] * a + 50) / 100)));
			n[Na[t]] = i, r[t] = 1 / (i * Ia[t >> 3] * Ia[t & 7] * 8);
		}
		return c.push(...t ? [1] : [], ...n), r;
	}), u = (e, t) => [
		255,
		e,
		t.length + 2 >> 8,
		t.length + 2 & 255,
		...t
	], d = [
		255,
		216,
		...u(224, [
			74,
			70,
			73,
			70,
			0,
			1,
			1,
			0,
			0,
			1,
			0,
			1,
			0,
			0
		]),
		...u(219, c),
		...u(192, [
			8,
			t >> 8,
			t & 255,
			e >> 8,
			e & 255,
			3,
			1,
			o ? 34 : 17,
			0,
			2,
			17,
			1,
			3,
			17,
			1
		]),
		...u(196, Ra.flatMap(([e, , t, n]) => [
			e,
			...t,
			...n
		])),
		...u(218, [
			3,
			1,
			0,
			2,
			17,
			3,
			17,
			0,
			63,
			0
		])
	], f = [new Uint8Array(d)], p = /* @__PURE__ */ new Uint8Array(65536), m = 0, h = 0, g = 0;
	function _(e, t) {
		for (h = h << t | e, g += t; g >= 8;) {
			g -= 8;
			let e = h >>> g & 255;
			m >= p.length - 1 && (f.push(p.subarray(0, m)), p = /* @__PURE__ */ new Uint8Array(65536), m = 0), p[m++] = e, e === 255 && (p[m++] = 0);
		}
		h &= (1 << g) - 1;
	}
	let v = /* @__PURE__ */ new Float32Array(64), y = /* @__PURE__ */ new Int32Array(64), b = [
		0,
		0,
		0
	];
	function x(e, t) {
		let n = l[t];
		Aa(v);
		for (let e = 0; e < 64; e++) y[Na[e]] = Math.round(v[e] * n[e]);
		let r = za[t * 2], i = za[t * 2 + 1], a = y[0] - b[e];
		b[e] = y[0];
		let o = a ? 32 - Math.clz32(Math.abs(a)) : 0;
		_(r[o][0], r[o][1]), o && _((a < 0 ? a - 1 : a) & (1 << o) - 1, o);
		let s = 0;
		for (let e = 1; e < 64; e++) {
			if (a = y[e], !a) {
				s++;
				continue;
			}
			for (; s > 15; s -= 16) _(i[240][0], i[240][1]);
			o = 32 - Math.clz32(Math.abs(a));
			let t = i[s << 4 | o];
			_(t[0], t[1]), _((a < 0 ? a - 1 : a) & (1 << o) - 1, o), s = 0;
		}
		s && _(i[0][0], i[0][1]);
	}
	let S = e * 4, C = new Uint8Array(S * s), w = new Float32Array(s * s), T = /* @__PURE__ */ new Float32Array(64), E = /* @__PURE__ */ new Float32Array(64), D = o ? .25 : 1;
	function O(t) {
		for (let n = 0; n < e; n += s) {
			T.fill(0), E.fill(0);
			for (let r = 0; r < s; r++) {
				let i = Math.min(r, t - 1) * S;
				for (let t = 0; t < s; t++) {
					let a = i + Math.min(n + t, e - 1) * 4, c = C[a], l = C[a + 1], u = C[a + 2];
					w[r * s + t] = .299 * c + .587 * l + .114 * u - 128;
					let d = (r >> o) * 8 + (t >> o);
					T[d] += (-.168736 * c - .331264 * l + .5 * u) * D, E[d] += (.5 * c - .418688 * l - .081312 * u) * D;
				}
			}
			for (let e = 0; e < (o ? 4 : 1); e++) {
				let t = (e >> 1) * 128 + (e & 1) * 8;
				for (let e = 0; e < 64; e++) v[e] = w[t + (e >> 3) * s + (e & 7)];
				x(0, 0);
			}
			v.set(T), x(1, 1), v.set(E), x(2, 1);
		}
	}
	let k = 0, A = 0;
	for await (let e of n) {
		if (!(e instanceof Uint8Array || e instanceof Uint8ClampedArray) || !e.length || e.length % S) throw RangeError("[SnapDOM] JPEG input must contain complete RGBA rows");
		let n = e.length / S;
		if (k + n > t) throw RangeError("[SnapDOM] JPEG input exceeds the declared height");
		for (let t = 0; t < n;) {
			let r = Math.min(s - A, n - t);
			C.set(e.subarray(t * S, (t + r) * S), A * S), A += r, t += r, A === s && (O(s), A = 0);
		}
		k += n;
	}
	if (k !== t) throw RangeError("[SnapDOM] JPEG input does not match the declared height");
	return A && O(A), g && _((1 << 8 - g) - 1, 8 - g), f.push(p.subarray(0, m), new Uint8Array([255, 217])), new Blob(f, { type: "image/jpeg" });
}
var Na, Pa, Fa, Ia, La, Ra, za, Ba = t(() => {
	Na = [
		0,
		1,
		5,
		6,
		14,
		15,
		27,
		28,
		2,
		4,
		7,
		13,
		16,
		26,
		29,
		42,
		3,
		8,
		12,
		17,
		25,
		30,
		41,
		43,
		9,
		11,
		18,
		24,
		31,
		40,
		44,
		53,
		10,
		19,
		23,
		32,
		39,
		45,
		52,
		54,
		20,
		22,
		33,
		38,
		46,
		51,
		55,
		60,
		21,
		34,
		37,
		47,
		50,
		56,
		59,
		61,
		35,
		36,
		48,
		49,
		57,
		58,
		62,
		63
	], Pa = [
		16,
		11,
		10,
		16,
		24,
		40,
		51,
		61,
		12,
		12,
		14,
		19,
		26,
		58,
		60,
		55,
		14,
		13,
		16,
		24,
		40,
		57,
		69,
		56,
		14,
		17,
		22,
		29,
		51,
		87,
		80,
		62,
		18,
		22,
		37,
		56,
		68,
		109,
		103,
		77,
		24,
		35,
		55,
		64,
		81,
		104,
		113,
		92,
		49,
		64,
		78,
		87,
		103,
		121,
		120,
		101,
		72,
		92,
		95,
		98,
		112,
		100,
		103,
		99
	], Fa = Array.from({ length: 64 }, (e, t) => (t & 7) < 4 && t < 32 ? [
		17,
		18,
		24,
		47,
		18,
		21,
		26,
		66,
		24,
		26,
		56,
		99,
		47,
		66,
		99,
		99
	][(t >> 3) * 4 + (t & 7)] : 99), Ia = [
		1,
		1.387039845,
		1.306562965,
		1.175875602,
		1,
		.785694958,
		.5411961,
		.275899379
	], La = [
		0,
		1,
		2,
		3,
		4,
		5,
		6,
		7,
		8,
		9,
		10,
		11
	], Ra = [
		[
			0,
			0,
			[
				0,
				1,
				5,
				1,
				1,
				1,
				1,
				1,
				1,
				0,
				0,
				0,
				0,
				0,
				0,
				0
			],
			La
		],
		[
			16,
			0,
			[
				0,
				2,
				1,
				3,
				3,
				2,
				4,
				3,
				5,
				5,
				4,
				4,
				0,
				0,
				1,
				125
			],
			ka([
				1,
				2,
				3,
				0,
				4,
				17,
				5,
				18,
				33,
				49,
				65,
				6,
				19,
				81,
				97,
				7,
				34,
				113,
				20,
				50,
				129,
				145,
				161,
				8,
				35,
				66,
				177,
				193,
				21,
				82,
				209,
				240,
				36,
				51,
				98,
				114,
				130
			])
		],
		[
			1,
			1,
			[
				0,
				3,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				0,
				0,
				0,
				0,
				0
			],
			La
		],
		[
			17,
			1,
			[
				0,
				2,
				1,
				2,
				4,
				4,
				3,
				4,
				7,
				5,
				4,
				4,
				0,
				1,
				2,
				119
			],
			ka([
				0,
				1,
				2,
				3,
				17,
				4,
				5,
				33,
				49,
				6,
				18,
				65,
				81,
				7,
				97,
				113,
				19,
				34,
				50,
				129,
				8,
				20,
				66,
				145,
				161,
				177,
				193,
				9,
				35,
				51,
				82,
				240,
				21,
				98,
				114,
				209,
				10,
				22,
				36,
				52,
				225,
				37,
				241
			])
		]
	], za = Ra.map(([, , e, t]) => {
		let n = [], r = 0, i = 0;
		for (let a = 1; a <= 16; a++, r <<= 1) for (let o = 0; o < e[a - 1]; o++) n[t[i++]] = [r++, a];
		return n;
	});
});
function Va(e, t, n, r = {}) {
	if (typeof e != "string" || !e.startsWith("data:image/svg+xml")) return null;
	let i = Di(e).match(/<svg\b[^>]*>/i)?.[0];
	if (!i) return null;
	let a = t.crop ? Si(i, t.crop) : i, o = parseFloat(a.match(/\bwidth="([^"]+)/i)?.[1]), s = parseFloat(a.match(/\bheight="([^"]+)/i)?.[1]), c = (a.match(/\bviewBox="([^"]+)/i)?.[1] || "").trim().split(/[\s,]+/).map(Number);
	if (!(o > 0 && s > 0) || c.length !== 4 || !c.every(Number.isFinite) || !(c[2] > 0 && c[3] > 0)) return null;
	let l = Number.isFinite(t.width), u = Number.isFinite(t.height), d = t.meta || {}, f = Math.max(1, Math.floor(o)), p = Math.max(1, Math.floor(s)), m = t.crop ? f : Number.isFinite(d.vbW) ? d.vbW : Number.isFinite(d.w0) ? d.w0 : f, h = t.crop ? p : Number.isFinite(d.vbH) ? d.vbH : Number.isFinite(d.h0) ? d.h0 : p, g = t.dpr ?? 1, _ = t.scale ?? 1, v = (l && u ? Math.max(1, t.width) : l ? t.width : u ? t.height * m / Math.max(1, h) : f * _) * g, y = (l && u ? Math.max(1, t.height) : u ? t.height : l ? t.width * h / Math.max(1, m) : p * _) * g;
	return Math.max(o, s, v, y) <= ea && o * s <= ta && v * y <= ta || (n === "png" ? typeof CompressionStream != "function" : Math.max(v, y) >= 65536) ? null : b();
	async function b() {
		let l = Math.max(1, Math.floor(v)), u = Math.max(1, Math.floor(y)), d = e.indexOf(",") + 1, m = encodeURIComponent(i), h = e.lastIndexOf("%3C%2Fsvg%3E"), g;
		if (e.startsWith(m, d) && h >= d + m.length) g = e.slice(d + m.length, h);
		else {
			let t = Ei(e);
			g = encodeURIComponent(t.slice(t.indexOf(i) + i.length, t.lastIndexOf("</svg>")));
		}
		let _ = a.match(/\bpreserveAspectRatio="([^"]*)"/i)?.[1] || "xMidYMid meet", b = o / c[2], x = s / c[3], S = 0, C = 0;
		/\bnone\b/.test(_) || (b = x = /\bslice\b/.test(_) ? Math.max(b, x) : Math.min(b, x), S = (o - c[2] * b) * (/xMin/.test(_) ? 0 : /xMax/.test(_) ? 1 : .5), C = (s - c[3] * x) * (/YMin/.test(_) ? 0 : /YMax/.test(_) ? 1 : .5)), S -= c[0] * b, C -= c[1] * x;
		let w = a.replace(/\s(?:width|height|preserveAspectRatio)="[^"]*"/gi, "").slice(0, -1), T = U() && /(?:box-shadow|text-shadow)\s*:[^;"}]*px/i.test(Ei(e)), E = o / v, D = s / y, O = Math.max(1, Math.min(8192, Math.floor(4194304 / l), T ? Math.floor(2046 / D) : 8192)), k = Math.max(1, Math.min(8192, l, T ? Math.floor(2046 / E) : 8192)), A = n !== "png";
		if (A && t.backgroundColor) {
			let e = document.createElement("canvas").getContext("2d");
			e.fillStyle = t.backgroundColor, e.fillRect(0, 0, 1, 1), A = e.getImageData(0, 0, 1, 1).data[3] < 255;
		}
		async function* j() {
			for (let e = 0; e < u; e += O) {
				let n = Math.min(O, u - e), i = new Uint8Array(l * n * 4);
				for (let a = 0; a < l; a += k) {
					let o = Math.min(k, l - a), s = T ? Math.max(0, Math.floor(a * E) - 1) : a * E, u = T ? Math.max(0, Math.floor(e * D) - 1) : e * D, d = T ? Math.min(f, Math.ceil((a + o) * E) + 1) - s : o, m = T ? Math.min(p, Math.ceil((e + n) * D) + 1) - u : n, h = d / c[2], _ = m / c[3], v = T ? 1 : 1 / E, y = T ? 1 : 1 / D, O = `matrix(${b * v / h},0,0,${x * y / _},${(S - s) * v / h + c[0]},${(C - u) * y / _ + c[1]})`, j = await $i("data:image/svg+xml;charset=utf-8," + encodeURIComponent(`${w} width="${d}" height="${m}" preserveAspectRatio="none"><g style="all:unset!important;transform:${O}!important;transform-origin:0 0!important">`) + g + "%3C%2Fg%3E%3C%2Fsvg%3E", {
						width: d,
						height: m,
						dpr: 1,
						backgroundColor: T ? null : t.backgroundColor
					}, {
						warnings: r.warnings,
						retireDecodeFrame: !0
					}), M = j;
					try {
						if (T) {
							M = document.createElement("canvas"), M.width = o, M.height = n;
							let r = M.getContext("2d");
							t.backgroundColor && (r.fillStyle = t.backgroundColor, r.fillRect(0, 0, o, n)), r.drawImage(j, a * E - s, e * D - u, o * E, n * D, 0, 0, o, n);
						}
						let r = M.getContext("2d");
						A && (r.globalCompositeOperation = "destination-over", r.fillStyle = "#000", r.fillRect(0, 0, o, n));
						let c = r.getImageData(0, 0, o, n).data;
						for (let e = 0; e < n; e++) i.set(c.subarray(e * o * 4, (e + 1) * o * 4), (e * l + a) * 4);
					} finally {
						j.width = j.height = 0, M !== j && (M.width = M.height = 0);
					}
				}
				yield i;
			}
		}
		return n === "png" ? (await Promise.resolve().then(() => (Da(), Ca))).encodePng(l, u, j()) : (await Promise.resolve().then(() => (Ba(), Oa))).encodeJpeg(l, u, j(), t.quality);
	}
}
var Ha = t(() => {
	ga(), Ai(), G();
}), Ua = {};
n(Ua, { toBlob: () => Wa });
async function Wa(e, t, n = {}) {
	let r = t.format || t.type || "svg";
	if (r === "svg") {
		if (typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement) throw Error("[SnapDOM] html-in-canvas makes a raster capture, not an SVG; ask for png, jpeg or webp.");
		let t = f(decodeURIComponent(e.split(",")[1]), n.fileSvg);
		return new Blob([t], { type: "image/svg+xml" });
	}
	let i = r === "jpg" ? "jpeg" : r, a = (i === "png" || i === "jpeg") && Va(e, t, i, n);
	if (a) return a;
	let o = await $i(e, t, {
		...n,
		codec: i
	});
	return new Promise((e) => o.toBlob((t) => e(t), `image/${i}`, t.quality));
}
var Ga = t(() => {
	ga(), Ha(), D();
}), Ka = {};
n(Ka, { download: () => Ja });
async function qa(e, t) {
	let n = new File([e], t, { type: e.type });
	if (!navigator.canShare?.({ files: [n] })) return !1;
	try {
		await navigator.share({
			files: [n],
			title: t
		});
	} catch (e) {
		if (e.name !== "AbortError") return !1;
	}
	return !0;
}
async function Ja(e, t, n = {}) {
	let r = /* @__PURE__ */ new Set([
		"png",
		"jpeg",
		"jpg",
		"webp",
		"svg"
	]), i = (t?.type || "").toLowerCase(), a = r.has(i) ? i : "", o = (t?.format || a || "").toLowerCase(), s = o === "jpg" ? "jpeg" : o || "png", c = t?.filename || "snapdom", l = /\.(png|jpe?g|webp|svg)$/i.test(c) ? c : `${c}.${s}`, u = {
		...t || {},
		format: s,
		type: s
	};
	u.dpr = 1;
	let d = Qt(), f = (s === "png" || s === "jpeg") && Va(e, u, s, n);
	if (s === "svg" || f) {
		let t = f ? await f : await Wa(e, {
			...u,
			type: "svg"
		}, n);
		if (d && await qa(t, l)) return;
		let r = URL.createObjectURL(t), i = document.createElement("a");
		i.href = r, i.download = l, document.body.appendChild(i), i.click(), setTimeout(() => URL.revokeObjectURL(r), 1e3), i.remove();
		return;
	}
	let p = await $i(e, u, {
		...n,
		codec: s
	});
	if (d) {
		let e = `image/${s}`, n = await new Promise((n) => p.toBlob(n, e, t?.quality));
		if (n && await qa(n, l)) return;
	}
	let m = document.createElement("a");
	m.href = p.toDataURL(`image/${s}`, t?.quality), m.download = l, document.body.appendChild(m), m.click(), m.remove();
}
var Ya = t(() => {
	Ga(), ga(), Ha(), G();
});
J(), J(), G(), ir(), J(), Ue(), ir();
function Xa(e) {
	return zn(e).leaksAcrossSubtrees;
}
function Za(e) {
	let t = e.ownerDocument || document;
	return e.getRootNode && e.getRootNode() !== t ? null : zn(t).importantProps;
}
function Qa(e, t) {
	let n = e.ownerDocument || document, r = e.getRootNode ? e.getRootNode() : n;
	return r === n ? Bn(n, t).universe : t && b(r) ? eo(e, r, n, t) : null;
}
var $a = /* @__PURE__ */ new WeakMap();
function eo(e, t, n, r) {
	let i = r.shadowUniverse;
	if (i === null) return null;
	if (!i) {
		let e = Bn(n, r).universe;
		if (!e) return r.shadowUniverse = null;
		i = r.shadowUniverse = {
			universe: new Set(e),
			roots: /* @__PURE__ */ new Set()
		};
	}
	let a = (e) => {
		for (; b(e) && !i.roots.has(e); e = e.host.getRootNode()) {
			i.roots.add(e);
			for (let t of [...e.styleSheets, ...e.adoptedStyleSheets || []]) {
				let e = $a.get(t);
				if (e && e.epoch === Vn || $a.set(t, e = {
					epoch: Vn,
					props: _e(t)
				}), !e.props) return !1;
				for (let t of e.props) i.universe.add(t);
			}
			ge(e.getAnimations(), i.universe);
		}
		return !0;
	}, o = a(t) && (!e.shadowRoot || a(e.shadowRoot));
	for (let t = e.assignedSlot; o && t; t = t.assignedSlot) o = a(t.getRootNode());
	return o ? i.universe : r.shadowUniverse = null;
}
function to(e, t) {
	let n = e.ownerDocument || document;
	return e.getRootNode && e.getRootNode() !== n ? null : Bn(n, t).pseudoUniverse;
}
function no(e) {
	let t = e.ownerDocument || document;
	return e.getRootNode && e.getRootNode() !== t ? null : zn(t).svgGeometry;
}
function ro(e) {
	let t = zn(e.ownerDocument || document).svgGeometrySel;
	if (t == null) return !0;
	if (!t) return !1;
	try {
		return e.matches(t);
	} catch {
		return !0;
	}
}
function io(e, t) {
	let n = e.style;
	for (let e = 0; n && e < n.length; e++) {
		let r = n[e];
		if (Ae.test(r) && (!t || r.endsWith("-color") && r.startsWith("border") && !ke.test(n.getPropertyValue(r)))) return !0;
	}
	let r = e.ownerDocument || document;
	if (e.getRootNode && e.getRootNode() !== r) return null;
	let i = zn(r)[t ? "borderColorGate" : "chromeGate"];
	if (i == null) return null;
	if (!i) return !1;
	try {
		return e.matches(i);
	} catch {
		return null;
	}
}
function ao(e) {
	let t = e.ownerDocument || document;
	return e.getRootNode && e.getRootNode() !== t ? null : zn(t).scrollGate;
}
var oo = {
	before: null,
	after: null,
	firstLetter: null,
	marker: null,
	firstLine: null
};
function so(e) {
	let t = e.ownerDocument || document;
	return e.getRootNode && e.getRootNode() !== t ? oo : zn(t).pseudoGates;
}
J(), ir();
function co(e) {
	try {
		let t = zn(e.ownerDocument || document).shareGate;
		if (t === null) return !1;
		if (!t.length) return !0;
		let n = /* @__PURE__ */ new Set(), r = (e) => {
			n.add("t" + e.localName), e.id && n.add("i" + e.id);
			let t = e.classList;
			for (let e = 0; e < t.length; e++) n.add("c" + t[e]);
		};
		r(e);
		for (let t of e.querySelectorAll("*")) r(t);
		let i = [];
		for (let { sel: e, key: r } of t) (r === null || n.has(r)) && i.push(e);
		if (!i.length) return !0;
		let a = i.join(",");
		return !e.matches(a) && e.querySelector(a) === null;
	} catch {
		return !1;
	}
}
var lo = /^(width|height|inline-size|block-size|transform-origin|perspective-origin)$/, uo = /^(top|right|bottom|left)$|^inset-/, fo = /(margin|padding)[a-z-]*\s*:[^;]*(%|\bauto\b|calc\(|var\()/i, po = /* @__PURE__ */ new Set([
	"INPUT",
	"TEXTAREA",
	"SELECT",
	"OPTION",
	"OPTGROUP",
	"PROGRESS",
	"METER",
	"BUTTON",
	"DATALIST"
]);
function mo(e) {
	let t = e.share;
	return t ||= e.share = {
		ids: /* @__PURE__ */ new WeakMap(),
		intern: /* @__PURE__ */ new Map(),
		snaps: /* @__PURE__ */ new Map(),
		rootSeen: !1,
		pass: e
	}, t;
}
function ho(e, t) {
	let n = t.ids.get(e);
	if (n !== void 0) return n;
	let r = e.parentElement, i;
	if (!t.rootSeen) i = e.getRootNode() === (e.ownerDocument || document) ? "R" : -1;
	else if (r) i = t.ids.get(r), i === void 0 && (i = -1);
	else {
		let n = e.getRootNode(), r = n.host, a = r && t.pass.shadowShare?.has(n) && !r.matches(":hover,:focus-within,:active") ? ho(r, t) : -1;
		i = a === -1 ? -1 : a + "~" + t.pass.shadowScopes.get(n);
	}
	if (t.rootSeen = !0, i === -1) return t.ids.set(e, -1), -1;
	let a = "", o = e.attributes;
	if (o && o.length) {
		if (o.length === 1) a = o[0].name + "=" + o[0].value;
		else {
			let e = [];
			for (let t = 0; t < o.length; t++) e.push(o[t].name + "=" + o[t].value);
			e.sort(), a = e.join("");
		}
	}
	let s = i + "|" + e.tagName + "|" + a;
	return n = t.intern.get(s), n === void 0 && (n = t.intern.size, t.intern.set(s, n)), t.ids.set(e, n), n;
}
function go(e, t, n) {
	let r = e.snap, i = e.snap = { ...r };
	Object.defineProperty(i, "__needsBgInline", {
		value: r.__needsBgInline,
		enumerable: !1
	}), r.__bgClipTextFix !== void 0 && Object.defineProperty(i, "__bgClipTextFix", {
		value: r.__bgClipTextFix,
		enumerable: !1
	});
	let a = zn(t.ownerDocument || document), o = t.getAttribute && t.getAttribute("style") || "", s = o && fo.test(o), c = n.pass.shadowShare?.get(t.getRootNode()), l = c || !!a.marginUnstable || s && /margin/i.test(o), u = c || !!a.paddingUnstable || s && /padding/i.test(o), d = i.display !== void 0 && i.display.includes("grid"), f = i.transform !== void 0 && i.transform !== "none", p = i.position !== "static", m = [];
	for (let e in i) (lo.test(e) || p && uo.test(e) || d && (e === "grid-template-columns" || e === "grid-template-rows") || f && e === "transform" || l && e.charCodeAt(0) === 109 && e.startsWith("margin-") || u && e.charCodeAt(0) === 112 && e.startsWith("padding-")) && m.push(e);
	return e.rr = m, m;
}
function _o(e, t, n, r) {
	let i = r && r.styleShare ? r.share : null, a = i ? i.ids.get(e) : void 0;
	if (a === void 0 || a === -1 || e.shadowRoot || e.assignedSlot) return mt(n, to(e, r));
	let o = a + t, s = i.pseudo ||= /* @__PURE__ */ new Map(), c = s.get(o);
	if (c) {
		let t = { ...c.snap }, r = c.rr || go(c, e, i);
		for (let e = 0; e < r.length; e++) {
			let i = n.getPropertyValue(r[e]);
			i ? t[r[e]] = i : delete t[r[e]];
		}
		return t;
	}
	let l = mt(n, to(e, r));
	return s.set(o, {
		snap: l,
		rr: null
	}), l;
}
J(), G(), Ue();
function vo(e, t, n) {
	let r = t.getPropertyValue("overflow-x"), i = t.getPropertyValue("overflow-y");
	if ((r === "visible" || !r) && (i === "visible" || !i) || t.getPropertyValue("box-sizing") === "border-box" || typeof e.clientWidth != "number" || !e.offsetWidth) return;
	let a = (e) => parseFloat(e) || 0, o = e.offsetWidth - e.clientWidth - a(t.getPropertyValue("border-left-width")) - a(t.getPropertyValue("border-right-width")), s = e.offsetHeight - e.clientHeight - a(t.getPropertyValue("border-top-width")) - a(t.getPropertyValue("border-bottom-width")), c = (e, t) => {
		let r = n[e];
		if (!r || !r.endsWith("px")) return;
		let i = parseFloat(r);
		Number.isFinite(i) && (n[e] = `${Math.round((i + t) * 1e3) / 1e3}px`);
	};
	return o >= 2 && (c("width", o), c("inline-size", o)), s >= 2 && (c("height", s), c("block-size", s)), o >= 2 || s >= 2;
}
var yo = [
	"border-top-width",
	"border-right-width",
	"border-bottom-width",
	"border-left-width"
], bo = [
	"width",
	"inline-size",
	"height",
	"block-size"
];
function xo(e, t, n) {
	if (!yo.some((e) => n[e]?.includes(".")) || t.getPropertyValue("box-sizing") === "border-box" || n.display === "inline") return "";
	for (let e of ["width", "height"]) {
		let t = n[`min-${e}`], r = n[`max-${e}`];
		if (t && t !== "0px" && t !== "auto" || r && r !== "none") return "";
	}
	let r = (e) => parseFloat(n[e]) || 0, i = n["border-collapse"] === "collapse" && n.display === "table-cell" ? .5 : 1, a = r("padding-left") + r("padding-right") + (r("border-left-width") + r("border-right-width")) * i, o = r("padding-top") + r("padding-bottom") + (r("border-top-width") + r("border-bottom-width")) * i, s = (n["writing-mode"] || "horizontal-tb") !== "horizontal-tb";
	for (let e of bo) {
		let t = n[e];
		t && t.endsWith("px") && (n[e] = `${Math.round((parseFloat(t) + (e === "width" || e === "inline-size" && !s || e === "block-size" && s ? a : o)) * 1e3) / 1e3}px`);
	}
	n["box-sizing"] = "border-box";
	let c = "";
	if (t.getPropertyValue("overflow-x") === "auto") {
		let t = e.scrollWidth <= e.clientWidth;
		n["overflow-x"] = t ? "hidden" : "auto", t && (c += "x");
	}
	if (t.getPropertyValue("overflow-y") === "auto") {
		let t = e.scrollHeight <= e.clientHeight;
		n["overflow-y"] = t ? "hidden" : "auto", t && (c += "y");
	}
	return c;
}
var So = [
	"box-sizing",
	...bo,
	"overflow-x",
	"overflow-y"
], Co = /(?:box-sizing|width|height|inline-size|block-size|overflow(?:-[xy])?)\s*:/i;
function wo(e, t, n) {
	if (Co.test(e.getAttribute("style"))) for (let e of So) t.style.getPropertyValue(e) && n[e] && t.style.setProperty(e, n[e], t.style.getPropertyPriority(e));
}
function To(e) {
	return e.backgroundImage && e.backgroundImage !== "none" || e.backgroundColor && e.backgroundColor !== "rgba(0, 0, 0, 0)" && e.backgroundColor !== "transparent" || (parseFloat(e.borderTopWidth) || 0) > 0 || (parseFloat(e.borderBottomWidth) || 0) > 0 || (parseFloat(e.paddingTop) || 0) > 0 || (parseFloat(e.paddingBottom) || 0) > 0 ? !0 : (e.overflowBlock || e.overflowY || "visible") !== "visible";
}
var Eo = typeof CSS < "u" && CSS.supports?.("text-wrap-mode", "nowrap") ? "text-wrap-mode" : "white-space";
function Do(e, t, n, r, i) {
	let a = n["text-wrap-mode"] || n["white-space"] || "", o = a === "nowrap" || a === "pre" || Eo === "white-space" && a !== "normal", s = i.oneLine ||= /* @__PURE__ */ new WeakSet();
	if (s.has(e.parentElement)) {
		s.add(e), !o && t.style && t.style.setProperty(Eo, "nowrap");
		return;
	}
	let c = n.display || "";
	!r && !c.startsWith("inline-") && (n.float || "none") === "none" && n.position !== "absolute" && n.position !== "fixed" || o || (n["writing-mode"] || "horizontal-tb") !== "horizontal-tb" || !t.style || ko(e, n, i) && (s.add(e), t.style.setProperty(Eo, "nowrap"));
}
var Oo = /^[\w\u00C0-\u024F.,:;!?'"()%]*$/;
function ko(e, t, n) {
	let r = e.clientHeight - (parseFloat(t["padding-top"]) || 0) - (parseFloat(t["padding-bottom"]) || 0);
	if (r > 3 * (parseFloat(t["font-size"]) || 16) || t["word-break"] === "normal" && t["overflow-wrap"] === "normal" && Oo.test(e.textContent.trim())) return !1;
	let i = e.ownerDocument || document, a = i.createTreeWalker(e, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT), o = i.createRange(), s = null, c = 0, l = 0, u = 0;
	for (let e = a.nextNode(); e; e = a.nextNode()) if (e.nodeType === 1) {
		if (e.shadowRoot || e.localName === "br" || e.localName === "textarea") return !1;
	} else if (/\S/.test(e.data)) {
		if (++l > 64) return !1;
		o.selectNodeContents(e);
		for (let e of o.getClientRects()) if (e.height) {
			if (u++, s ||= e, Math.min(s.bottom, e.bottom) - Math.max(s.top, e.top) < Math.min(s.height, e.height) / 2) return !1;
			c = Math.max(c, e.height);
		}
	}
	if (!s) return !1;
	let d = No(e, n.axes ||= /* @__PURE__ */ new WeakMap());
	return d === Ao ? l === 1 && u === 1 && !e.childElementCount : r * (d === Mo && e.offsetHeight ? e.getBoundingClientRect().height / e.offsetHeight : 1) <= 2 * c;
}
var Ao = 0, jo = 1, Mo = 2;
function No(e, t) {
	let n = t.get(e);
	if (n !== void 0) return n;
	let r = H(e), i = r.transform, a = i && i !== "none" ? i.slice(i.indexOf("(") + 1, -1).split(",").map(parseFloat) : null;
	if (r.rotate && r.rotate !== "none" || a && (i.startsWith("matrix3d") ? a[1] || a[4] : a[1] || a[2])) n = Ao;
	else {
		let o = e.parentElement || x(e);
		n = o ? No(o, t) : jo, n === jo && (r.scale && r.scale !== "none" || r.zoom && r.zoom !== "1" || a && (i.startsWith("matrix3d") ? a[0] !== 1 || a[5] !== 1 : a[0] !== 1 || a[3] !== 1)) && (n = Mo);
	}
	return t.set(e, n), n;
}
function Po(e) {
	let t = e.parentElement;
	if (!t) return !1;
	let n = H(t).display || "";
	return n.includes("flex") || n.includes("grid");
}
function Fo(e) {
	for (let t = e.firstChild; t; t = t.nextSibling) if (t.nodeType === 3 && /\S/.test(t.nodeValue)) return !0;
	let t = e.firstElementChild, n = e.lastElementChild;
	if (t && t.tagName === "BR" || n && n.tagName === "BR") return !0;
	for (let t = e.firstElementChild; t; t = t.nextElementSibling) {
		let e = H(t);
		if (e.display === "none") continue;
		let n = e.position;
		if (n !== "absolute" && n !== "fixed") return !0;
	}
	return !1;
}
function Io(e, t) {
	let n = -1 / 0, r = null;
	for (let t = e.firstChild; t; t = t.nextSibling) {
		if (t.nodeType === 3) {
			if (!/\S/.test(t.nodeValue || "")) continue;
			r ||= document.createRange(), r.selectNode(t);
			let e = r.getBoundingClientRect();
			(e.width || e.height) && (n = Math.max(n, e.bottom));
			continue;
		}
		if (t.nodeType !== 1) continue;
		let e = H(t);
		if (e.display === "none") continue;
		let i = e.position;
		i === "absolute" || i === "fixed" || e.float && e.float !== "none" || (e.display === "contents" ? (r ||= document.createRange(), r.selectNodeContents(t), n = Math.max(n, r.getBoundingClientRect().bottom)) : n = Math.max(n, t.getBoundingClientRect().bottom));
	}
	return n === -1 / 0 ? NaN : n - t;
}
function Lo(e, t) {
	let n;
	try {
		n = e.computedStyleMap().get("width").toString();
	} catch {}
	t.width = t["inline-size"] = n && n !== "auto" ? n : void 0;
}
var Ro = /* @__PURE__ */ new Set([
	"inset",
	"outset",
	"ridge",
	"groove"
]), zo = [
	"top",
	"right",
	"bottom",
	"left"
].map((e) => [`border-${e}-style`, `border-${e}-color`]);
function Bo(e, t) {
	let n;
	for (let [r, i] of zo) if (Ro.has(t[r]) && t[i] === t.color) {
		if (n === void 0 && (n = io(e, !0) === !0 || !Qe(e)), n) return;
		t[i] = "currentcolor";
	}
}
var Vo = /* @__PURE__ */ new Set([
	"col",
	"colgroup",
	"table",
	"input",
	"button",
	"select",
	"textarea",
	"progress",
	"meter"
]), Ho = /^(?:checkbox|radio|range|color|hidden|image)$/;
function Uo(e, t, n) {
	let r = e.localName;
	if (r === "colgroup" || r === "col") {
		(r === "colgroup" || e.span > 1) && Lo(e, n);
		return;
	}
	if (r === "table") {
		e.caption && (n.height = n["block-size"] = void 0);
		return;
	}
	if (Ho.test(e.type)) return;
	let i = Ze(e, t.colorScheme);
	for (let e in i) if (t.getPropertyValue(e) !== i[e]) return;
	if (!io(e, !1)) {
		for (let e in n) Ae.test(e) && (n[e] = void 0);
		return n.background = n.border = n["border-radius"] = "revert", !0;
	}
}
var Wo = /* @__PURE__ */ new Set([
	"div",
	"section",
	"article",
	"main",
	"aside",
	"header",
	"footer",
	"nav"
]);
function Go(e, t, n) {
	if (!e.tagName) return;
	if (!Wo.has(e.tagName.toLowerCase())) {
		if (n.display !== "block") return;
		let t = e.lastElementChild;
		if (!t || H(t).marginBottom === "0px") return;
	}
	if (v(e) && e.style && e.style.height || t.aspectRatio && t.aspectRatio !== "none" && t.aspectRatio !== "auto") return;
	let r = t.display || "";
	if (r.includes("flex") || r.includes("grid")) return;
	let i = t.position;
	if (i === "absolute" || i === "fixed" || i === "sticky" || t.transform !== "none" || To(t) || Po(e)) return;
	let a = t.overflowX || t.overflow || "visible", o = t.overflowY || t.overflow || "visible";
	if (a !== "visible" || o !== "visible") return;
	let s = t.clip;
	if (s && s !== "auto" && s !== "rect(auto, auto, auto, auto)" || t.visibility === "hidden" || t.opacity === "0" || !Fo(e)) return;
	let c = parseFloat(t.height), l = e.getBoundingClientRect(), u = e.offsetWidth ? l.width / e.offsetWidth : 1, d = Io(e, l.top) / (Math.abs(u - 1) < .01 ? 1 : u);
	if (!(Number.isFinite(c) && Number.isFinite(d) && Math.abs(c - d) > 2)) {
		if (e.localName === "details" && W()) {
			let t = H(e.lastElementChild).marginBottom;
			parseFloat(t) > (parseFloat(n["margin-bottom"]) || 0) && (n["margin-bottom"] = t);
			return;
		}
		n.height = void 0, n["block-size"] = void 0;
	}
}
var Ko = /* @__PURE__ */ new WeakMap(), qo = [
	"margin-top",
	"margin-right",
	"margin-bottom",
	"margin-left",
	"margin-block-start",
	"margin-block-end",
	"margin-inline-start",
	"margin-inline-end"
];
function Jo(e) {
	if (e && e.nodeType === 1) {
		bn(), Ko.delete(e);
		try {
			let t = (e.ownerDocument || document).createTreeWalker(e, NodeFilter.SHOW_ELEMENT);
			for (; t.nextNode();) Ko.delete(t.currentNode);
		} catch {}
	}
}
function Yo(e) {
	let t = null;
	for (let n of e) {
		let e = n.effect?.target;
		if (!e || n.effect.pseudoElement) continue;
		let r = (t ||= /* @__PURE__ */ new Map()).get(e);
		r || t.set(e, r = /* @__PURE__ */ new Set());
		let i = e.ownerDocument.createElement("div").style;
		for (let e of n.effect.getKeyframes()) for (let t in e) t === "offset" || t === "easing" || t === "composite" || t === "computedOffset" || (t.startsWith("--") ? r.add(t) : i[t] = e[t]);
		for (let e = 0; e < i.length; e++) r.add(i[e]);
	}
	return t;
}
var Xo = [
	"mask",
	"mask-image",
	"-webkit-mask",
	"-webkit-mask-image",
	"mask-source",
	"mask-box-image-source",
	"mask-border-source",
	"-webkit-mask-box-image-source",
	"border-image",
	"border-image-source"
];
function Zo(e) {
	let t = Ko.get(e);
	if (t && gs(t, e)) {
		let e = t.snapshot && t.snapshot.__needsBgInline;
		if (e !== void 0) return e;
	}
	return !0;
}
function Qo(e) {
	let t = Ko.get(e);
	if (!t || !gs(t, e)) return null;
	let n = t.snapshot;
	return !n || n.__bgClipTextFix ? null : n;
}
var $o = /* @__PURE__ */ new WeakMap();
function es(e) {
	let t = $o.get(e);
	return t && t.size === e.size || $o.set(e, t = {
		size: e.size,
		list: [...e].filter((e) => !et(e))
	}), t.list;
}
function ts(e, t = {}, n = null, r = null) {
	let i = {}, a = t.excludeStyleProps, o = (t) => {
		if (a && (a instanceof RegExp && a.test(t) || typeof a == "function" && a(t))) return;
		let n = e.getPropertyValue(t);
		n && ((t === "background-image" || t === "content") && n.includes("url(") && !n.includes("data:") && (n = "none"), i[t] = n);
	}, s = (e) => {
		i[e] !== void 0 || et(e) || o(e);
	};
	if (r) {
		let e = es(r);
		for (let t = 0; t < e.length; t++) o(e[t]);
		let t = n && n.style;
		if (t && t.length) for (let e = 0; e < t.length; e++) s(t[e]);
	} else {
		let t = pt(e);
		for (let e = 0; e < t.length; e++) o(t[e]);
	}
	for (let t of [
		"text-decoration-line",
		"text-decoration-color",
		"text-decoration-style",
		"text-decoration-thickness",
		"text-underline-offset",
		"text-decoration-skip-ink"
	]) if (!i[t]) try {
		let n = e.getPropertyValue(t);
		n && (i[t] = n);
	} catch {}
	for (let t of [
		"-webkit-text-stroke",
		"-webkit-text-stroke-width",
		"-webkit-text-stroke-color",
		"paint-order"
	]) if (!i[t]) try {
		let n = e.getPropertyValue(t);
		n && (i[t] = n);
	} catch {}
	if (t.embedFonts) {
		for (let t of [
			"font-feature-settings",
			"font-variation-settings",
			"font-kerning",
			"font-variant",
			"font-variant-ligatures",
			"font-optical-sizing"
		]) if (!i[t]) try {
			let n = e.getPropertyValue(t);
			n && (i[t] = n);
		} catch {}
	}
	try {
		(i["content-visibility"] || e.getPropertyValue("content-visibility")) === "hidden" && (i["content-visibility"] = "hidden");
	} catch {}
	Object.defineProperty(i, "__needsBgInline", {
		value: cs(e),
		enumerable: !1
	});
	let c = parseFloat(e.getPropertyValue("border-top-width") || 0) || 0, l = parseFloat(e.getPropertyValue("border-right-width") || 0) || 0, u = parseFloat(e.getPropertyValue("border-bottom-width") || 0) || 0, d = parseFloat(e.getPropertyValue("border-left-width") || 0) || 0;
	if (c === 0 && l === 0 && u === 0 && d === 0) {
		let t = (e.getPropertyValue("border-image-source") || "").trim(), n = t && t !== "none";
		for (let e of /* @__PURE__ */ "border.border-top.border-right.border-bottom.border-left.border-width.border-style.border-color.border-top-width.border-top-style.border-top-color.border-right-width.border-right-style.border-right-color.border-bottom-width.border-bottom-style.border-bottom-color.border-left-width.border-left-style.border-left-color.border-block.border-block-width.border-block-style.border-block-color.border-inline.border-inline-width.border-inline-style.border-inline-color.border-block-start.border-block-start-width.border-block-start-style.border-block-start-color.border-block-end.border-block-end-width.border-block-end-style.border-block-end-color.border-inline-start.border-inline-start-width.border-inline-start-style.border-inline-start-color.border-inline-end.border-inline-end-width.border-inline-end-style.border-inline-end-color".split(".")) delete i[e];
		n || (i.border = "none");
	}
	return ns(i), i;
}
function ns(e) {
	if (!W()) return;
	let t = e["background-clip"] || e["-webkit-background-clip"];
	if (!t || !t.includes("text")) return;
	let n = (e) => e === "transparent" || e === "rgba(0, 0, 0, 0)", r = e["-webkit-text-fill-color"];
	if (!n(r === void 0 ? e.color : r)) return;
	let i = ss(e["background-image"], e["background-color"]);
	i && (n(e.color) && (e.color = i), r !== void 0 && (e["-webkit-text-fill-color"] = i), e["background-image"] = "none", e["background-color"] = "transparent", delete e["background-clip"], delete e["-webkit-background-clip"], Object.defineProperty(e, "__bgClipTextFix", {
		value: i,
		enumerable: !1
	}));
}
function rs(e, t, n) {
	let r = n.textShadow;
	if (!r || r === "none" || !(parseFloat(n.webkitTextStrokeWidth) > 0) || e.firstElementChild || n.backgroundImage !== "none" || n.boxShadow !== "none" || os(n.backgroundColor)[3] !== 0 || [
		"Top",
		"Right",
		"Bottom",
		"Left"
	].some((e) => parseFloat(n[`border${e}Width`]) > 0) || r.replace(/\([^)]*\)/g, "").includes(",")) return;
	let i = (r.match(/(?:rgba?|hsla?|color|oklch|oklab|lab|lch)\([^)]*\)|#[\da-f]+|\b[a-z]+\b/i) || [])[0], [a = 0, o = 0, s = 0] = (r.match(/-?[\d.]+px/g) || []).map(parseFloat);
	if (!i) return;
	let c = n.filter && n.filter !== "none" ? `${n.filter} ` : "";
	t.style.setProperty("text-shadow", "none", "important"), t.style.setProperty("filter", `${c}drop-shadow(${a}px ${o}px ${s / 2}px ${i})`, "important");
}
var is = /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)/g, as;
function os(e) {
	if (!as) {
		let e = document.createElement("canvas");
		e.width = e.height = 1, as = e.getContext("2d", { willReadFrequently: !0 });
	}
	return as.clearRect(0, 0, 1, 1), as.fillStyle = "transparent", as.fillStyle = e, as.fillRect(0, 0, 1, 1), as.getImageData(0, 0, 1, 1).data;
}
function ss(e, t) {
	let n = (e) => {
		let t = [];
		for (let n of (e || "").match(is) || []) {
			let [e, r, i, a] = os(n);
			a > 13 && t.push([
				e,
				r,
				i
			]);
		}
		return t;
	}, r = n(e);
	if (r.length || (r = n(t)), !r.length) return null;
	let i = [
		0,
		0,
		0
	];
	for (let [e, t, n] of r) i[0] += e, i[1] += t, i[2] += n;
	return `rgb(${i.map((e) => Math.round(e / r.length)).join(", ")})`;
}
function cs(e) {
	let t = e.getPropertyValue("background-image");
	if (t && t !== "none") return !0;
	let n = e.getPropertyValue("background-color");
	if (n && n !== "rgba(0, 0, 0, 0)" && n !== "transparent") return !0;
	for (let t of Xo) {
		let n = e.getPropertyValue(t);
		if (n && n !== "none") return !0;
	}
	let r = e.getPropertyValue("background");
	return !!(r && /url\s*\(/i.test(r));
}
function ls(e) {
	for (let t = e.firstChild; t; t = t.nextSibling) {
		if (t.nodeType === 3 && /\S/.test(t.nodeValue || "")) return !0;
		if (t.nodeType === 1) {
			let e = H(t).position;
			if (e !== "absolute" && e !== "fixed") return !0;
		}
	}
	return !1;
}
function us(e, t, n) {
	try {
		if (typeof e.computedStyleMap == "function") {
			let t = e.computedStyleMap().get("width");
			if (t != null) return !fs(String(t).trim().toLowerCase());
		}
	} catch {}
	let r = e.style && (e.style.width || e.style.inlineSize);
	return r && !fs(String(r).trim().toLowerCase()) ? !0 : ps(e, t) ? n || ms(e, t) : !1;
}
var ds = /* @__PURE__ */ new Set([
	"auto",
	"min-content",
	"max-content",
	"stretch",
	"fill-available",
	"-webkit-fill-available"
]);
function fs(e) {
	return ds.has(e) || e.startsWith("fit-content");
}
function ps(e, t) {
	let n = e.getBoundingClientRect().width - (parseFloat(t.paddingLeft) || 0) - (parseFloat(t.paddingRight) || 0) - (parseFloat(t.borderLeftWidth) || 0) - (parseFloat(t.borderRightWidth) || 0);
	if (!(n > 0)) return !1;
	let r = 1 / 0, i = -1 / 0, a = null;
	for (let t = e.firstChild; t; t = t.nextSibling) {
		let e;
		if (t.nodeType === 3) {
			if (!/\S/.test(t.nodeValue || "") || (a ||= document.createRange(), a.selectNode(t), e = a.getBoundingClientRect(), !e.width && !e.height)) continue;
		} else if (t.nodeType === 1) {
			let n = H(t);
			if (n.display === "none" || n.position === "absolute" || n.position === "fixed") continue;
			e = t.getBoundingClientRect();
		} else continue;
		e.left < r && (r = e.left), e.right > i && (i = e.right);
	}
	return i !== -1 / 0 && i - r < n - .5;
}
function ms(e, t) {
	let n = e.parentElement;
	if (!n) return !1;
	let r = H(n), i = n.getBoundingClientRect().width - (parseFloat(r.paddingLeft) || 0) - (parseFloat(r.paddingRight) || 0) - (parseFloat(r.borderLeftWidth) || 0) - (parseFloat(r.borderRightWidth) || 0) - (parseFloat(t.marginLeft) || 0) - (parseFloat(t.marginRight) || 0);
	return i > 0 && Math.abs(e.getBoundingClientRect().width - i) > .5;
}
var hs = /* @__PURE__ */ new WeakMap();
function gs(e, t) {
	return e.v === Tn(t, e.hosts);
}
function _s(e) {
	let t = e.split(" ");
	return t.length === 4 ? e : `${t[0]} ${t[1] ?? t[0]} ${t[2] ?? t[0]} ${t[3] ?? t[1] ?? t[0]}`;
}
var vs = [
	"top",
	"right",
	"bottom",
	"left"
], ys = "0px 0px 0px 0px";
function bs(e, t) {
	let n = e[t[0]], r = e[t[1]], i = e[t[2]], a = e[t[3]];
	return n === void 0 || r === void 0 || i === void 0 || a === void 0 ? null : `${n} ${r} ${i} ${a}`;
}
function xs(e, t, n, r) {
	return _s(e.getPropertyValue(n)) === t || `${e.getPropertyValue(r[0])} ${e.getPropertyValue(r[1])} ${e.getPropertyValue(r[2])} ${e.getPropertyValue(r[3])}` === t;
}
function Ss(e, t) {
	let n = Ko.get(e)?.used;
	return !n || n.box === !1 || t.getPropertyValue("width") === n.w && t.getPropertyValue("height") === n.h;
}
function Cs(e, t) {
	let n = Ko.get(e)?.used?.margin;
	return !n || xs(t, n, "margin", qo);
}
function ws(e, t, n) {
	let r = e.width, i = e.height, a = {
		w: r,
		h: i,
		box: r === void 0 || i === void 0 || r === "auto" && i === "auto" ? !1 : null,
		inset: null,
		margin: null,
		tracks: null
	}, o = e.position, s = o === "absolute" || o === "fixed";
	if (s || o === "relative" || o === "sticky") {
		let t = bs(e, vs);
		t && (s || t !== ys) && (a.inset = t);
	}
	let c = typeof t.computedStyleMap == "function";
	if (s || n || !c) {
		let t = bs(e, qo);
		t && (t !== ys || !c) && (a.margin = t);
	}
	if ((e.display || "").includes("grid")) {
		let t = e["grid-template-columns"], n = e["grid-template-rows"];
		t !== void 0 && n !== void 0 && (a.tracks = t + "/" + n);
	}
	return a;
}
function Ts(e, t, n) {
	if (e.box !== !1) {
		let r = t.getBoundingClientRect();
		if (e.box) {
			if (r.width !== e.box[0] || r.height !== e.box[1]) return !1;
		} else {
			if (n.getPropertyValue("width") !== e.w || n.getPropertyValue("height") !== e.h) return !1;
			e.box = [r.width, r.height];
		}
	}
	return (!e.inset || xs(n, e.inset, "inset", vs)) && (!e.margin || xs(n, e.margin, "margin", qo)) && (!e.tracks || n.getPropertyValue("grid-template-columns") + "/" + n.getPropertyValue("grid-template-rows") === e.tracks);
}
function Es(e, t = null, n = {}, r = null, i = null, a = !1) {
	let o = Ko.get(e), s = !!(n && n.embedFonts), c = n && n.excludeStyleProps || null, l = t || getComputedStyle(e);
	if (typeof c != "function" && o && gs(o, e) && o.embedFonts === s && o.excludeStyleProps === c && (o.checked === Y || Ts(o.used, e, l))) return o.checked = Y, o.snapshot;
	let u, d = null, f = r && r.st.snaps.get(r.id);
	if (f) {
		let t = f.rr || go(f, e, r.st);
		u = Object.create(f.snap), d = [];
		for (let e = 0; e < t.length; e++) {
			let n = l.getPropertyValue(t[e]);
			u[t[e]] = n || void 0, d.push(n);
		}
	} else u = ts(l, n, e, Qa(e, i)), r && r.st.snaps.set(r.id, {
		snap: u,
		rr: null
	});
	let p = ws(u, e, a), m = !1;
	if (typeof e.computedStyleMap == "function") {
		let t = f || (r ? r.st.snaps.get(r.id) : null), n;
		for (let r of qo) {
			if (u[r] !== "0px") continue;
			let i = t?.auto?.[r];
			if (i === void 0) {
				try {
					n ||= e.computedStyleMap(), i = n.get(r)?.toString() === "auto";
				} catch {
					i = !1;
				}
				t && ((t.auto ||= {})[r] = i);
			}
			i && (u[r] = "auto", m = !0);
		}
	}
	Go(e, l, u), Bo(e, u);
	let h = xo(e, l, u), g = vo(e, l, u), _ = Vo.has(e.localName) && Uo(e, l, u);
	d !== null && (_ && d.push("\b"), m && d.push("", ...qo.map((e) => u[e])), h && d.push("" + h), g && d.push("\x07" + u.width, u.height), r.tail = d.join("") + (u.height === void 0 ? "" : "") + (u["block-size"] === void 0 ? "" : ""), r.rec = f);
	let v = En(e), y = o && o.used;
	if (y && (y.w !== p.w || y.h !== p.h || y.tracks !== p.tracks)) {
		let t = (y.w !== p.w || y.h !== p.h) && l.getPropertyValue("container-type"), [n, r] = /^(?:vertical|sideways)/.test(u["writing-mode"]) ? ["h", "w"] : ["w", "h"];
		if (t && t !== "normal") Cn(e);
		else if (y[n] !== p[n] || y.tracks !== p.tracks || y[r] === "0px") {
			Sn(e);
			for (let t = e.firstElementChild; t; t = t.nextElementSibling) if (Sn(t), t.localName === "slot") for (let e of t.assignedElements({ flatten: !0 })) Sn(e);
		}
	}
	let b = (i?.scanEnv ?? Un) === Un ? Tn(e, v) : -1;
	return Ko.set(e, {
		v: b,
		checked: Y,
		hosts: v,
		snapshot: u,
		embedFonts: s,
		excludeStyleProps: c,
		used: p
	}), u;
}
function Ds(e, t) {
	let n = t.flexOverflow ||= /* @__PURE__ */ new WeakMap(), r = n.get(e);
	if (r === void 0) {
		if (r = e.scrollWidth > e.clientWidth, !r) {
			let n = H(e), i = (e) => parseFloat(n.getPropertyValue(e)) || 0, a = i("width") - (n.boxSizing === "border-box" ? i("padding-left") + i("padding-right") + i("border-left-width") + i("border-right-width") : 0), o = n.flexDirection.startsWith("row") === (n.writingMode === "horizontal-tb") && n.flexWrap === "nowrap", s = 0, c = 0;
			for (let n of e.children) {
				t.styleCache.has(n) || t.styleCache.set(n, getComputedStyle(n));
				let e = t.styleCache.get(n);
				if (e.display === "none" || e.position === "absolute" || e.position === "fixed") continue;
				let r = (t) => parseFloat(e.getPropertyValue(t)) || 0, i = r("width") + r("margin-left") + r("margin-right") + (e.boxSizing === "border-box" ? 0 : r("padding-left") + r("padding-right") + r("border-left-width") + r("border-right-width"));
				s = o ? s + i : Math.max(s, i), c++;
			}
			r = s + (o ? Math.max(0, c - 1) * i("column-gap") : 0) > a + c / 60;
		}
		n.set(e, r);
	}
	return r;
}
function Os(e, t) {
	if (e && e.session) return e;
	if (e && (e.styleMap || e.styleCache || e.nodeMap)) {
		let n = e.stylesCtx;
		return n && e.stylesCtxOpts === t || (n = {
			session: e,
			options: t || {}
		}, e.stylesCtx = n, e.stylesCtxOpts = t), n;
	}
	return {
		session: {
			styleMap: /* @__PURE__ */ new Map(),
			styleCache: /* @__PURE__ */ new WeakMap(),
			nodeMap: /* @__PURE__ */ new Map()
		},
		options: e || t || {}
	};
}
var ks = /%|[\d.](?:em|rem|ex|ch|cap|ic|lh|rlh|v[whib]|vmin|vmax|cq[whbi]|cqmin|cqmax)\b|\b(?:calc|var|min|max|clamp|env|attr)\(|\b(?:auto|inherit|initial|unset|revert|currentcolor|-webkit-fill-available|fit-content|min-content|max-content)\b/i, As = (e) => e.tagName === "INPUT" || e.tagName === "TEXTAREA", js;
function Ms(e, t, n, r, i) {
	let a = e.style;
	if (!a || a.length === 0) return;
	let o = Za(e), s = o != null && !ks.test(r), c = s && o.size === 0 && !i && !As(e);
	if (c && !/border|\ball\s*:/i.test(r)) return;
	let l;
	for (let r = 0, u = a.length; r < u; r++) {
		let u = a[r], d = u.startsWith("border-") && u.endsWith("-width");
		if (s && d && l === void 0) {
			let t = a.borderWidth, r = Ko.get(e);
			if (l = r && gs(r, e) && yo.every((e) => r.snapshot[e] === t) || n.borderWidth === t, l && c) return;
		}
		if (s && !o.has(u) && !i?.has(u) && (!d || l) && !(u.startsWith("background") && As(e))) continue;
		let f = n.getPropertyValue(u);
		f && (!d || f !== a.getPropertyValue(u)) && t.style.setProperty(u, f, a.getPropertyPriority(u));
	}
}
function Ns(e, t, n, r) {
	if (e.tagName === "STYLE") return;
	let i = Os(n, r), a = i.options && i.options.cache || "soft";
	a !== "disabled" && Nn(e.ownerDocument), a === "disabled" && !i.session.bumpedForDisabled && (ln(), i.session.bumpedForDisabled = !0);
	let { session: o } = i;
	if (!o.styleCache.has(e)) {
		let t = null;
		try {
			t = getComputedStyle(e);
		} catch {}
		o.styleCache.set(e, t || getComputedStyle((e.ownerDocument || document).documentElement));
	}
	let s = o.styleCache.get(e);
	(js ??= W()) && s.display?.includes("grid") && s.getPropertyValue("grid-template-columns");
	let c = e.getAttribute?.("style");
	c && Ms(e, t, s, c, o.animated?.get(e));
	let l = s.getPropertyValue("animation-name");
	t && t.style && l && l !== "none" && t.style.setProperty("animation", "none", "important");
	let u = e.tagName?.toLowerCase() || "div";
	if (_t.has(u)) {
		let n = {};
		Object.defineProperty(n, "__needsBgInline", {
			value: cs(s),
			enumerable: !1
		});
		let r = En(e);
		Ko.set(e, {
			v: Tn(e, r),
			hosts: r,
			snapshot: n,
			embedFonts: !!(i.options && i.options.embedFonts),
			excludeStyleProps: i.options && i.options.excludeStyleProps || null
		}), o.styleMap.set(t, "");
		return;
	}
	let d = null;
	if (o.styleShare && o.styleMap) {
		let t = mo(o), n = ho(e, t), r = e.ownerDocument || document, i = r.activeElement;
		n === -1 || po.has(e.tagName) || i && i !== r.body && i !== r.documentElement && i === e || e.shadowRoot || e.assignedSlot || (d = {
			st: t,
			id: n
		});
	}
	let f = Po(e), p = Es(e, s, i.options, d, o, f);
	if (c) for (let e = 0; e < 4; e++) {
		let n = qo[e];
		p[n] === "auto" && t.style.setProperty(n, "auto", "important");
	}
	p.__bgClipTextFix && t && t.style && (t.style.setProperty("background-image", "none", "important"), t.style.setProperty("background-color", "transparent", "important"), t.style.setProperty("color", p.__bgClipTextFix, "important"), t.style.setProperty("-webkit-text-fill-color", p.__bgClipTextFix, "important"), (o.bgClipText ||= []).push([e, t])), i.safari ??= U(), i.safari && rs(e, t, s), t.style?.length && p["box-sizing"] === "border-box" && s.getPropertyValue("box-sizing") !== "border-box" && wo(e, t, p), Do(e, t, p, f, o);
	let m = "";
	if (f) {
		let t = s.getPropertyValue("min-width");
		if (!t || t === "auto" || t === "0px") {
			m = "0px";
			let n = s.getPropertyValue("overflow-x"), r = e.parentElement;
			t === "auto" && (n === "visible" || n === "clip") && r && H(r).display.includes("flex") && Ds(r, o) && (m = p.width), p["min-width"] === m && (m = "");
		}
	}
	let h = !0, g = m && "|m" + m;
	if (nt(u, (p.display || "").toLowerCase())) {
		h = ls(e), h && rt(u, p, f) && us(e, s, f) && (h = !1), g += (h ? "|c" : "") + (f ? "|f" : "");
		let t = p["text-wrap-mode"] || p["white-space"] || "";
		h && t !== "nowrap" && t !== "pre" && (o.reconcileRisk = (o.reconcileRisk || 0) + 1);
	}
	let _ = d && d.tail !== void 0 ? d.rec.keys ||= /* @__PURE__ */ new Map() : null, v = _ && d.tail + g, y = _ ? null : hs.get(p), b = _ ? _.get(v) : y && y.flags === g ? y.key : void 0;
	b === void 0 && (b = ot(p, u, h, f, m, Qa(e, o)), _ ? _.set(v, b) : hs.set(p, {
		flags: g,
		key: b
	})), o.styleMap.set(t, b);
}
ir(), Ue(), Kt(), ir();
var Ps = /* @__PURE__ */ new Set(["symbol", "defs"]), Fs = /* @__PURE__ */ new Set([
	"mask",
	"clipPath",
	"linearGradient",
	"radialGradient",
	"pattern",
	"marker",
	"filter"
]), Is = /* @__PURE__ */ new WeakMap(), Ls = -1;
function Rs(e) {
	let t = _n();
	return t !== Ls && (Is = /* @__PURE__ */ new WeakMap(), Ls = t), zs(e);
}
function zs(e) {
	let t = Is.get(e);
	if (t !== void 0) return t;
	let n;
	if (e.namespaceURI === "http://www.w3.org/2000/svg" && (Fs.has(e.localName) ? n = !1 : Ps.has(e.localName) && (n = !0)), n === void 0) {
		let t = e.parentNode;
		n = !!(t && t.nodeType === 1) && zs(t);
	}
	return Is.set(e, n), n;
}
function Bs(e, t) {
	if (e?.nodeType !== 1 || t?.nodeType !== 1 || Rs(e)) return;
	let n = e.getAttribute?.("style"), r = !!(n && n.includes("var("));
	if (!r && e.attributes?.length) {
		let t = e.attributes;
		for (let e = 0; e < t.length; e++) {
			let n = t[e];
			if (n && typeof n.value == "string" && !n.value.startsWith("data:") && n.value.includes("var(")) {
				r = !0;
				break;
			}
		}
	}
	let i = null;
	if (r) try {
		i = getComputedStyle(e);
	} catch {}
	if (r) {
		let n = e.style;
		if (n && n.length) {
			let e = /* @__PURE__ */ new Set();
			for (let r = 0; r < n.length; r++) {
				let a = n[r];
				if (e.has(a)) continue;
				e.add(a);
				let o = n.getPropertyValue(a);
				if (!o || !o.includes("var(")) continue;
				let s = i && i.getPropertyValue(a);
				if (s) try {
					t.style.setProperty(a, s.trim(), n.getPropertyPriority(a));
				} catch {}
			}
		}
	}
	if (r && e.attributes?.length) {
		let n = e.attributes;
		for (let e = 0; e < n.length; e++) {
			let r = n[e];
			if (!r || typeof r.value != "string" || r.value.startsWith("data:") || !r.value.includes("var(")) continue;
			let a = r.name, o = i && i.getPropertyValue(a);
			if (o) try {
				t.style.setProperty(a, o.trim());
			} catch {}
		}
	}
}
J(), J(), s(), R(), Ue(), D();
function Vs(e) {
	return !!(!e || e.startsWith("data:") || e.startsWith("blob:"));
}
function Hs(e, t) {
	if (!e) return null;
	let n = 0;
	try {
		n = t ? t.getBoundingClientRect().width || t.width : 0;
	} catch {}
	n ||= window.innerWidth || 1e3;
	let r = [];
	for (let t of e.split(",")) {
		let e = t.trim().split(/\s+/);
		if (!e[0]) continue;
		let i = e[1] || "", a = 1;
		/^\d*\.?\d+x$/i.test(i) ? a = parseFloat(i) : /^\d+w$/i.test(i) && (a = parseInt(i, 10) / n), r.push({
			url: e[0],
			d: a
		});
	}
	if (!r.length) return null;
	r.sort((e, t) => e.d - t.d);
	let i = window.devicePixelRatio || 1;
	return (r.find((e) => e.d >= i) || r[r.length - 1]).url;
}
function Us(e, t) {
	let n = e.currentSrc || "";
	if (n && !Vs(n)) return n;
	let r = t.querySelectorAll("source[srcset]"), i = null;
	for (let t of r) {
		let n = t.getAttribute("srcset");
		if (!n || Vs(n)) continue;
		let r = t.getAttribute("type");
		if (r && !C.test(r.trim())) continue;
		let a = t.getAttribute("media");
		if (a) try {
			if (window.matchMedia(a).matches) return Hs(n, e);
		} catch {}
		i ||= Hs(n, e);
	}
	return i;
}
function Ws(e) {
	let t = [
		e.getAttribute("data-src"),
		e.getAttribute("data-lazy-src"),
		e.getAttribute("data-original"),
		e.getAttribute("data-hi-res-src")
	];
	for (let e of t) if (e && !Vs(e)) return e;
	let n = e.getAttribute("data-srcset") || e.getAttribute("data-lazy-srcset");
	if (n) {
		let e = n.split(",")[0].trim().split(/\s+/)[0];
		if (e && !Vs(e)) return e;
	}
	return null;
}
V(), G();
function Gs(e, t) {
	if (e = e.trim(), !e) return e;
	let n = t ? `[data-sd-slotted~="${t}"]` : "[data-sd-slotted]";
	return e.endsWith(":not([data-sd-slotted])") || e.endsWith(`:not(${n})`) ? e : `${e}:not(${n})`;
}
var Ks = /::[a-zA-Z-]+(?:\([^)]*\))?$|:(?:before|after|first-letter|first-line)$/, qs = /^::?(?:before|after|first-letter)$/;
function Js(e, t, n = !0, r) {
	return ye(e, ",").map((e) => e.trim()).filter(Boolean).map((e) => {
		if (e.startsWith(":where(") && e.includes("data-sd")) return e;
		let i = e.match(Ks);
		if (i && i[0][1] !== ":" && e[i.index - 1] === "\\" && (i = null), i && qs.test(i[0])) return ":not(*)";
		let a = i ? e.slice(0, i.index).trim() : e;
		return `:where(${t} ${n ? Gs(a, r) : a})${i ? i[0] : ""}`;
	}).join(", ");
}
function Ys(e, t, n) {
	return e ? (e = e.replace(/:host-context\(([^)]+)\)/g, (e, n) => `:where(:where(${n.trim()}) ${t})`), e = e.replace(/:host\(([^)]+)\)/g, (e, n) => `:where(${t}:is(${n.trim()}))`), e = e.replace(/:host\b/g, `:where(${t})`), e = e.replace(/::slotted\(([^)]+)\)/g, (e, n) => `:where(${t} ${n.trim()})`), e = e.replace(/(^|})(\s*)([^@}{]+){/g, (e, r, i, a) => `${r}${i}${Js(a, t, !0, n)}{`), e = e.replace(/(^|})(\s*@(?:supports|container|layer|scope|media)\b[^{};]*{\s*)([^@}{;]+){/g, (e, r, i, a) => `${r}${i}${Js(a, t, !0, n)}{`), e) : "";
}
function Xs(e) {
	let t = "";
	for (let n of e) if (n.media && n.cssRules) {
		let e = !1;
		try {
			e = window.matchMedia(n.conditionText || n.media.mediaText).matches;
		} catch {}
		e && (t += Xs(n.cssRules));
	} else if (n.constructor?.name === "CSSSupportsRule") t += `@supports ${n.conditionText}{${Xs(n.cssRules)}}`;
	else if (n.cssRules && n.cssRules.length && /@media/i.test(n.cssText)) {
		let e = n.cssText.slice(0, n.cssText.indexOf("{") + 1);
		t += e + (n.style ? n.style.cssText : "") + Xs(n.cssRules) + "}";
	} else t += n.cssText + "\n";
	return t;
}
function Zs(e, t) {
	let n = "";
	try {
		e.querySelectorAll("style").forEach((e) => {
			let t = null;
			try {
				t = e.sheet && e.sheet.cssRules;
			} catch {}
			n += (t ? Xs(t) : e.textContent || "") + "\n";
		});
		let r = e.adoptedStyleSheets || [];
		for (let e of r) try {
			let r = t.get(e);
			r === void 0 && t.set(e, r = e.cssRules ? Xs(e.cssRules) : ""), n += r;
		} catch {}
	} catch {}
	return n;
}
function Qs(e, t, n) {
	if (!t) return;
	let r = document.createElement("style");
	r.setAttribute("data-sd", n), r.textContent = t, e.insertBefore(r, e.firstChild || null);
}
function $s(e, t, n = {}) {
	try {
		let r = null, i = H(e).content;
		if (i && i.includes("url(")) {
			let e = i.match(/url\(["']?([^"')]+)["']?\)/);
			e && (r = e[1]);
		}
		let a = e.closest?.("picture"), o = e.getAttribute("src") || "", s = e.getAttribute("srcset") || "", c = r || (a ? Us(e, a) : !s.trim() && o.startsWith("data:") ? o : e.currentSrc) || Hs(s, e) || e.src || "";
		if ((!c || Vs(c)) && n.resolvePicturePlaceholders !== !1) {
			let t = Ws(e);
			t && (c = t);
		}
		if (!c) return;
		t.getAttribute("src") !== c && t.setAttribute("src", c), t.removeAttribute("srcset"), t.removeAttribute("sizes"), t.loading = "eager", t.decoding = "sync";
	} catch {}
}
function ec(e) {
	let t = /* @__PURE__ */ new Set();
	if (!e) return t;
	let n = /var\(\s*(--[A-Za-z0-9_-]+)\b/g, r;
	for (; r = n.exec(e);) t.add(r[1]);
	return t;
}
function tc(e, t, n) {
	let r = [];
	for (let n of t) {
		let t = "";
		try {
			t = getComputedStyle(e).getPropertyValue(n).trim() || getComputedStyle(document.documentElement).getPropertyValue(n).trim();
		} catch {}
		t && r.push(`${n}: ${t};`);
	}
	return r.length ? `${n}{${r.join("")}}
` : "";
}
function nc(e, t) {
	if (!e) return;
	let n = (e) => {
		let n = e.getAttribute("data-sd-slotted") || "";
		t ? ` ${n} `.includes(` ${t} `) || e.setAttribute("data-sd-slotted", n ? `${n} ${t}` : t) : e.setAttribute("data-sd-slotted", n);
	};
	e.nodeType === Node.ELEMENT_NODE && n(e), e.querySelectorAll?.("*").forEach(n);
}
var rc = (e) => (e = parseFloat(e)) > 0 ? e : 0;
function ic(e) {
	let t = e.offsetWidth > 0 ? e.offsetWidth : 0, n = e.offsetHeight > 0 ? e.offsetHeight : 0;
	if (!t || !n) {
		let r = getComputedStyle(e);
		t ||= rc(r.width) || rc(e.getAttribute("width")) || rc(e.naturalWidth), n ||= rc(r.height) || rc(e.getAttribute("height")) || rc(e.naturalHeight);
	}
	return {
		width: t,
		height: n
	};
}
var ac = /* @__PURE__ */ new WeakMap();
function oc(e, t, n) {
	let r = e.defaultView, i = r ? r.scrollX : 0, a = r ? r.scrollY : 0, o = e.body ? e.body.scrollLeft : 0, s = e.body ? e.body.scrollTop : 0, c = e.documentElement ? e.documentElement.scrollLeft : 0, l = e.documentElement ? e.documentElement.scrollTop : 0, u = 0, d = 0, f = 0, p = 0;
	try {
		let t = r && e.body ? r.getComputedStyle(e.body) : null;
		t && (u = (parseFloat(t.marginTop) || 0) + (parseFloat(t.paddingTop) || 0), d = (parseFloat(t.marginRight) || 0) + (parseFloat(t.paddingRight) || 0), f = (parseFloat(t.marginBottom) || 0) + (parseFloat(t.paddingBottom) || 0), p = (parseFloat(t.marginLeft) || 0) + (parseFloat(t.paddingLeft) || 0));
	} catch {}
	let m = `html {margin: 0 !important;padding: 0 !important;width: ${t}px !important;height: ${n}px !important;min-width: ${t}px !important;min-height: ${n}px !important;box-sizing: border-box !important;overflow: hidden !important;background-clip: border-box !important;}body {margin: 0 !important;padding: ${u}px ${d}px ${f}px ${p}px !important;width: ${t}px !important;height: ${n}px !important;min-width: ${t}px !important;min-height: ${n}px !important;box-sizing: border-box !important;overflow: hidden !important;background-clip: border-box !important;}`, h;
	try {
		let t = ac.get(e);
		t || ac.set(e, t = new r.CSSStyleSheet()), t.replaceSync(m), e.adoptedStyleSheets = [...e.adoptedStyleSheets, t], h = () => {
			e.adoptedStyleSheets = e.adoptedStyleSheets.filter((e) => e !== t);
		};
	} catch {
		let t = e.createElement("style");
		t.setAttribute("data-sd-iframe-pin", ""), B(t), t.textContent = m, (e.head || e.documentElement).appendChild(t), h = () => t.remove();
	}
	if (Jo(e.documentElement), i || a) try {
		e.body && (e.body.scrollLeft = i, e.body.scrollTop = a), e.documentElement && (e.documentElement.scrollLeft || (e.documentElement.scrollLeft = i), e.documentElement.scrollTop || (e.documentElement.scrollTop = a));
	} catch {}
	return () => {
		try {
			h();
		} catch {}
		try {
			r && typeof r.scrollTo == "function" && r.scrollTo(i, a), e.body && (e.body.scrollLeft = o, e.body.scrollTop = s), e.documentElement && (e.documentElement.scrollLeft = c, e.documentElement.scrollTop = l);
		} catch {}
		Jo(e.documentElement);
	};
}
function sc(e) {
	try {
		if (e.localName !== "embed") return e.contentDocument || e.contentWindow?.document || null;
	} catch {
		return null;
	}
	let t = e.ownerDocument.defaultView;
	for (let n = 0; t && n < t.length; n++) try {
		if (t[n].frameElement === e) return t[n].document;
	} catch {}
	return null;
}
async function cc(e, t, n) {
	let r = sc(e);
	for (let t = 0; t < 3 && !r?.documentElement; t++) await new Promise((e) => setTimeout(e, 0)), r = sc(e);
	if (!r?.documentElement) throw Error("The iframe document isn't ready.");
	let i = e.getBoundingClientRect(), a = getComputedStyle(e), o = (e) => parseFloat(a[`border${e}Width`]) || 0, s = Math.max(0, Math.round(i.width - (o("Left") + o("Right")))), c = Math.max(0, Math.round(i.height - (o("Top") + o("Bottom")))), l = n?.snap;
	if (!l || typeof l.toPng != "function") throw Error("Iframes are only captured through snapdom(el).");
	let u = {
		...n,
		scale: 1,
		clip: null,
		__pinned: !0,
		__styleShare: t.styleShare
	}, d = oc(r, s, c), f;
	try {
		f = await l.toPng(r.documentElement, u);
	} finally {
		d();
	}
	f.style.display = "block", f.style.width = `${s}px`, f.style.height = `${c}px`;
	let p = document.createElement("div");
	t.nodeMap.set(p, e), Ns(e, p, t, n), p.style.overflow = "hidden", H(e).display === "inline" && (p.style.display = "inline-block");
	let m = H(e);
	return p.style.width || (p.style.width = m.width), p.style.height || (p.style.height = m.height), p.appendChild(f), p;
}
function lc(e) {
	return e && !W() && !U() ? {
		fill: "#99c8ff",
		mark: "Field"
	} : !pc("AccentColor") || !pc("AccentColorText") ? {
		fill: "#0a6ed1",
		mark: "white"
	} : {
		fill: "AccentColor",
		mark: "AccentColorText"
	};
}
function uc(e) {
	try {
		let t = (e) => {
			let t = e / 255;
			return t <= .04045 ? t / 12.92 : ((t + .055) / 1.055) ** 2.4;
		}, [n, r, i] = os(e);
		return 1.05 / (.2126 * t(n) + .7152 * t(r) + .0722 * t(i) + .05) < 2.4 ? "black" : "white";
	} catch {
		return "white";
	}
}
function dc(e) {
	try {
		let t = e && e.colorScheme || "";
		return t && t !== "normal" || (t = document.querySelector("meta[name=\"color-scheme\"]")?.content || ""), /\bdark\b/.test(t) ? !/\blight\b/.test(t) || matchMedia("(prefers-color-scheme: dark)").matches : !1;
	} catch {
		return !1;
	}
}
function fc(e) {
	return `;color-scheme:${dc(e) ? "dark" : "light"}`;
}
function pc(e) {
	try {
		return CSS.supports("color", e);
	} catch {
		return !1;
	}
}
function mc(e) {
	let t = "", n = "";
	try {
		t = e && e.accentColor || "", n = e && e.color || "";
	} catch {}
	let { fill: r, mark: i } = t && t !== "auto" && t !== "none" ? {
		fill: t,
		mark: uc(t)
	} : lc(dc(e));
	return {
		fill: r,
		mark: i,
		rim: W() && pc("ButtonBorder") ? "ButtonBorder" : n || r,
		text: n || r
	};
}
function hc(e) {
	let { width: t, height: n } = ic(e), r = e.getBoundingClientRect(), i;
	try {
		i = window.getComputedStyle(e);
	} catch {}
	let a = i ? parseFloat(i.width) : NaN, o = i ? parseFloat(i.height) : NaN, s = Number.isFinite(a) && a > 0 ? a : t || r.width || 128, c = Number.isFinite(o) && o > 0 ? o : n || r.height || 16, l = Number.parseFloat(e.min) || 0, u = Number.isFinite(Number.parseFloat(e.max)) ? Number.parseFloat(e.max) : 100, d = Number.parseFloat(e.value), f = u - l, p = f > 0 && Number.isFinite(d) ? Math.min(1, Math.max(0, (d - l) / f)) : .5, m = "middle";
	try {
		i && i.verticalAlign && (m = i.verticalAlign);
	} catch {}
	let h = document.createElement("div");
	h.setAttribute("data-snapdom-input-replacement", "range"), h.style.cssText = `display:inline-block;width:${s}px;height:${c}px;vertical-align:${m};flex-shrink:0;line-height:0;`;
	let g = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	g.setAttribute("width", String(s)), g.setAttribute("height", String(c)), g.setAttribute("viewBox", `0 0 ${s} ${c}`), g.style.cssText = `width:${s}px;height:${c}px;overflow:visible${fc(i)}`, h.appendChild(g);
	function _() {
		let t = mc(i).fill, n = !!e.disabled, r = Math.max(2, Math.min(4, c)), a = (c - r) / 2, o = Math.max(10, Math.min(14, Math.max(c, 10))), l = o / 2, u = l + p * Math.max(0, s - o);
		g.innerHTML = "";
		let d = (e, t, n, i) => {
			let o = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			o.setAttribute("x", String(e)), o.setAttribute("y", String(a)), o.setAttribute("width", String(Math.max(0, t))), o.setAttribute("height", String(r)), o.setAttribute("rx", String(r / 2)), o.setAttribute("fill", n), i && o.setAttribute("fill-opacity", i), g.appendChild(o);
		};
		d(0, s, "#808080", "0.4"), d(0, u, t);
		let f = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		f.setAttribute("cx", String(u)), f.setAttribute("cy", String(c / 2));
		let m = W();
		f.setAttribute("r", String(m ? l - 1 : l)), f.setAttribute("fill", m ? "#676774" : t), m && (f.setAttribute("stroke", "white"), f.setAttribute("stroke-width", "2")), g.appendChild(f), n && g.setAttribute("opacity", "0.5"), h.style.setProperty("width", `${s}px`, "important"), h.style.setProperty("height", `${c}px`, "important"), h.style.setProperty("min-width", `${s}px`, "important"), h.style.setProperty("min-height", `${c}px`, "important");
	}
	return _(), {
		el: h,
		applyVisual: _
	};
}
function gc(e) {
	let { width: t, height: n } = ic(e), r = e.getBoundingClientRect(), i;
	try {
		i = window.getComputedStyle(e);
	} catch {}
	let a = i ? parseFloat(i.width) : NaN, o = i ? parseFloat(i.height) : NaN, s = Math.round(t || r.width || 0), c = Math.round(n || r.height || 0), l = Number.isFinite(a) && a > 0 ? Math.round(a) : Math.max(12, s || 16), u = Number.isFinite(o) && o > 0 ? Math.round(o) : Math.max(12, c || 16), d = (e.type || "text").toLowerCase() === "checkbox", f = d && !!e.indeterminate, p = !!e.checked && !f, m = Math.max(Math.min(l, u), 12), h = Math.max(l, m), g = Math.max(u, m), _ = "middle";
	try {
		i && i.verticalAlign && (_ = i.verticalAlign);
	} catch {}
	let v = document.createElement("div");
	v.setAttribute("data-snapdom-input-replacement", e.type || "checkbox"), v.style.cssText = `display:inline-block;width:${h}px;height:${g}px;vertical-align:${_};flex-shrink:0;line-height:0;`;
	let y = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	y.setAttribute("width", String(h)), y.setAttribute("height", String(g)), y.setAttribute("viewBox", `0 0 ${m} ${m}`), y.style.cssText = `width:${h}px;height:${g}px${fc(i)}`, v.appendChild(y);
	function b() {
		let t = mc(i), n = e.matches(":disabled"), r = n ? t.text : t.fill, a = n ? "white" : t.mark, o = (e, t) => {
			let n = document.createElementNS("http://www.w3.org/2000/svg", e);
			for (let e in t) n.setAttribute(e, String(t[e]));
			y.appendChild(n);
		}, s = p || f, c = s ? 0 : .5, l = s ? { fill: r } : {
			fill: pc("Field") ? "Field" : "none",
			stroke: t.rim,
			"stroke-width": 1
		};
		if (y.innerHTML = "", d) {
			if (o("rect", {
				x: c,
				y: c,
				width: m - c * 2,
				height: m - c * 2,
				rx: 2,
				ry: 2,
				...l
			}), p) o("path", {
				d: `M ${m * .2} ${m * .53} L ${m * .4} ${m * .72} L ${m * .78} ${m * .3}`,
				stroke: a,
				"stroke-width": Math.max(1.5, m * .12),
				fill: "none",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			});
			else if (f) {
				let e = m * (W() ? .82 : .6), t = W() ? Math.max(1, m / 16) : Math.max(2, m / 8);
				o("rect", {
					x: (m - e) / 2,
					y: (m - t) / 2,
					width: e,
					height: t,
					fill: a
				});
			}
		} else o("circle", {
			cx: m / 2,
			cy: m / 2,
			r: m / 2 - c,
			...l
		}), p && o("circle", {
			cx: m / 2,
			cy: m / 2,
			r: m / 2 - 2,
			fill: "none",
			stroke: a,
			"stroke-width": 2
		});
		n && y.setAttribute("opacity", "0.5"), v.style.setProperty("width", `${h}px`, "important"), v.style.setProperty("height", `${g}px`, "important"), v.style.setProperty("min-width", `${h}px`, "important"), v.style.setProperty("min-height", `${g}px`, "important");
	}
	return b(), {
		el: v,
		applyVisual: b
	};
}
var _c = new a(80);
async function vc(e) {
	if (o.resource?.has(e)) return o.resource.get(e);
	if (_c.has(e)) return _c.get(e);
	let t = (async () => {
		let t = await L(e, { as: "dataURL" });
		if (!t.ok || typeof t.data != "string") throw Error(`Couldn't read ${e}`);
		return o.resource?.set(e, t.data), t.data;
	})();
	_c.set(e, t);
	try {
		let n = await t;
		return _c.set(e, n), n;
	} catch (t) {
		throw _c.delete(e), t;
	}
}
var yc = /\bblob:[^)"'\s]+/g;
function bc(e) {
	return typeof e == "string" && e.startsWith("blob:");
}
function xc(e) {
	return (e || "").split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
		let t = e.match(/^(\S+)(\s+.+)?$/);
		return t ? {
			url: t[1],
			desc: t[2] || ""
		} : null;
	}).filter(Boolean);
}
function Sc(e) {
	return e.map((e) => e.desc ? `${e.url} ${e.desc.trim()}` : e.url).join(", ");
}
function Cc(e, t) {
	let n = e.querySelectorAll ? Array.from(e.querySelectorAll(t)) : [];
	return e.matches?.(t) && n.unshift(e), n;
}
async function wc(e, t = null) {
	if (!e) return;
	let n = /* @__PURE__ */ new Set(), r = [], i = /* @__PURE__ */ new Map(), a = (e, t, a, o) => {
		n.add(a), r.push(() => {
			i.has(a) && (e.setAttribute(t, i.get(a)), o?.());
		});
	}, o = (e, t) => {
		if (!e || !e.includes("blob:")) return;
		let a = e.match(yc) || [];
		if (a.length) {
			for (let e of a) n.add(e);
			r.push(() => {
				let n = e.replace(yc, (e) => i.get(e) || e);
				n !== e && t(n);
			});
		}
	};
	for (let t of Cc(e, "img")) {
		let e = t.getAttribute("src") || t.currentSrc || "";
		bc(e) && a(t, "src", e);
		let o = t.getAttribute("srcset");
		if (o && o.includes("blob:")) {
			let e = xc(o);
			for (let t of e) bc(t.url) && n.add(t.url);
			r.push(() => {
				let n = !1;
				for (let t of e) i.has(t.url) && (t.url = i.get(t.url), n = !0);
				n && t.setAttribute("srcset", Sc(e));
			});
		}
	}
	let s = "http://www.w3.org/1999/xlink";
	for (let t of Cc(e, "image")) {
		let e = t.getAttribute("href") || t.getAttributeNS?.(s, "href");
		bc(e) && a(t, "href", e, () => t.removeAttributeNS?.(s, "href"));
	}
	for (let t of Cc(e, "[style*='blob:']")) o(t.getAttribute("style"), (e) => t.setAttribute("style", e));
	for (let t of Cc(e, "style")) o(t.textContent || "", (e) => {
		t.textContent = e;
	});
	for (let t of Cc(e, "[poster^='blob:']")) a(t, "poster", t.getAttribute("poster"));
	if (!n.size) return;
	let c = [...n], l = 0;
	await Promise.all(Array.from({ length: Math.min(4, c.length) }, async () => {
		for (; l < c.length;) {
			let e = c[l++];
			try {
				i.set(e, await vc(e));
			} catch (e) {
				K(t, "Couldn't read a blob: URL; kept it as is.", e);
			}
		}
	}));
	for (let e of r) e();
}
var Tc = [
	"font-family",
	"font-size",
	"font-style",
	"font-weight",
	"font-stretch",
	"font-variant",
	"font-feature-settings",
	"font-variation-settings",
	"font-kerning",
	"letter-spacing",
	"text-transform"
], Ec = /* @__PURE__ */ new Set([
	"text",
	"search",
	"email",
	"url",
	"tel",
	"number",
	"submit",
	"reset",
	"button"
]), Dc = /[^\s\uD800-\uDFFF]{2,}/;
function Oc(e, t = document) {
	let n = t.defaultView || window;
	if (!W() || !t.body || !(n.visualViewport?.scale < 1 || n.screen.width < t.documentElement.clientWidth)) return;
	let r = B(t.createElement("div"));
	r.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden";
	let i = [];
	for (let [a, o] of e) {
		if (a.nodeType !== 1 || o.nodeType !== 1) continue;
		let e = n.getComputedStyle(o), s = o.localName === "textarea" || o.localName === "input" && Ec.has(o.type) ? jc(o, e, t) : Ac(o, e.textAlign === "justify" || e.textAlignLast === "justify");
		if (!s) continue;
		let c = o.getBoundingClientRect(), l = o.offsetWidth && c.width ? c.width / o.offsetWidth : 1, u = t.createElement("span");
		u.style.whiteSpace = "pre";
		for (let t of Tc) u.style.setProperty(t, e.getPropertyValue(t));
		u.textContent = s.word, r.appendChild(u), i.push({
			clone: a,
			cs: e,
			span: u,
			live: s.distance / l,
			centers: s.centers,
			height: s.height
		});
	}
	if (i.length) {
		t.body.appendChild(r);
		try {
			for (let { clone: e, cs: n, span: r, live: a, centers: o, height: s } of i) {
				let i = r.firstChild, c = (parseFloat(n.letterSpacing) || 0) * (o ? i.length - 1 : i.length), l = s ? t.createRange() : null;
				l && l.selectNodeContents(r);
				let u = s ? l.getBoundingClientRect().height : o ? Math.abs(kc(i, i.length - 1) - kc(i, 0)) : r.getBoundingClientRect().width, d = (a - (s ? 0 : c)) / (u - (s ? 0 : c));
				if (d > 1.005 && Number.isFinite(d)) {
					if (s) {
						let e = [];
						for (let t of [!1, !0]) {
							let i = parseFloat(n.fontSize), o = i * (d + 1);
							for (let e = 0; e < 10; e++) {
								let e = (i + o) / 2;
								r.style.fontSize = `${e}px`;
								let n = l.getBoundingClientRect().height;
								(t ? n > a : n >= a) ? o = e : i = e;
							}
							e.push((i + o) / 2);
						}
						d = (e[0] + e[1]) / 2 / parseFloat(n.fontSize);
					}
					e.style.setProperty("font-size", `${parseFloat(n.fontSize) * d}px`), n.lineHeight !== "normal" && e.style.setProperty("line-height", `${parseFloat(n.lineHeight) * d}px`);
				}
			}
		} finally {
			r.remove();
		}
	}
}
function kc(e, t) {
	let n = e.ownerDocument.createRange();
	n.setStart(e, t), n.setEnd(e, t + 1);
	let r = n.getBoundingClientRect();
	return r.left + r.width / 2;
}
function Ac(e, t = !1) {
	for (let n = e.firstChild; n; n = n.nextSibling) {
		if (n.nodeType !== 3) continue;
		let r = /\S+/.exec(n.data);
		if (!r) continue;
		let i = e.ownerDocument.createRange();
		i.setStart(n, r.index), i.setEnd(n, r.index + r[0].length);
		let a = i.getClientRects();
		return a.length === 1 ? {
			word: r[0],
			distance: t ? a[0].height : a[0].width,
			centers: !1,
			height: t
		} : null;
	}
	return null;
}
function jc(e, t, n) {
	let r = Dc.exec(e.value.split("\n")[0]);
	if (!r || e.scrollLeft || e.scrollTop || !n.caretPositionFromPoint) return null;
	let i = e.getBoundingClientRect(), a = e.localName === "textarea" ? i.top + (parseFloat(t.borderTopWidth) || 0) + (parseFloat(t.paddingTop) || 0) + 3 : i.top + i.height / 2, o = (t) => {
		let r = n.caretPositionFromPoint(t, a);
		return r && r.offsetNode === e ? r.offset : -1;
	}, s = i.width / 16, c = (e) => {
		let t = i.left;
		for (; t <= i.right && o(t) < e;) t += s;
		if (t > i.right) return NaN;
		let n = t - s;
		for (let r = 0; r < 16; r++) {
			let r = (n + t) / 2;
			o(r) >= e ? t = r : n = r;
		}
		return t;
	}, l = Math.abs(c(r.index + r[0].length) - c(r.index + 1));
	return Number.isFinite(l) ? {
		word: r[0],
		distance: l,
		centers: !0
	} : null;
}
G();
var Mc = /* @__PURE__ */ new Set(["rgba(0, 0, 0, 0)", "transparent"]), Nc = "Highlight";
function Pc(e) {
	let t = (e.ownerDocument || document).getSelection?.();
	if (!t || t.isCollapsed || t.rangeCount === 0) return null;
	let n = [];
	for (let r = 0; r < t.rangeCount; r += 1) {
		let i = t.getRangeAt(r);
		if (!i.collapsed) try {
			i.intersectsNode(e) && n.push(i);
		} catch {}
	}
	return n.length ? {
		ranges: n,
		styles: /* @__PURE__ */ new Map()
	} : null;
}
function Fc(e, t) {
	if (t.styles.has(e)) return t.styles.get(e);
	let n;
	try {
		let r = getComputedStyle(e);
		if (r.userSelect === "none" || r.webkitUserSelect === "none" || r.getPropertyValue("-webkit-user-select") === "none") return t.styles.set(e, null), null;
		let i = getComputedStyle(e, "::selection"), a = [], o = i.backgroundColor, s = o && !Mc.has(o) && o !== r.backgroundColor;
		a.push(`background-color:${s ? o : Nc}`), i.color && i.color !== r.color && a.push(`color:${i.color}`, `-webkit-text-fill-color:${i.color}`), i.textShadow && i.textShadow !== r.textShadow && a.push(`text-shadow:${i.textShadow}`), i.textDecorationLine && i.textDecorationLine !== "none" && i.textDecorationLine !== r.textDecorationLine && a.push(`text-decoration:${i.textDecorationLine} ${i.textDecorationStyle || "solid"} ${i.textDecorationColor || "currentcolor"}`), n = a.join(";");
	} catch {
		n = `background-color:${Nc}`;
	}
	return t.styles.set(e, n), n;
}
function Ic(e, t) {
	let n = e.data;
	if (!n) return null;
	let r = e.parentElement;
	if (!r) return null;
	let i = [];
	for (let r of t.ranges) {
		let t = !1;
		try {
			t = r.intersectsNode(e);
		} catch {}
		if (!t) continue;
		let a = r.startContainer === e ? r.startOffset : 0, o = r.endContainer === e ? r.endOffset : n.length;
		o > a && i.push([a, o]);
	}
	if (i.length === 0) return null;
	let a = Fc(r, t);
	if (!a) return null;
	i.sort((e, t) => e[0] - t[0]);
	let o = e.ownerDocument || document, s = o.createDocumentFragment(), c = 0;
	for (let [e, t] of i) {
		e > c && s.append(o.createTextNode(n.slice(c, e)));
		let r = o.createElement("span");
		r.setAttribute("data-snapdom-selection", ""), r.setAttribute("style", `all:unset;${a}`), r.textContent = n.slice(e, t), s.append(r), c = t;
	}
	return c < n.length && s.append(o.createTextNode(n.slice(c))), s;
}
var Lc = (e) => Number.parseFloat(e) || 0, Rc = [
	"font-family",
	"font-size",
	"font-weight",
	"font-style",
	"font-variant",
	"font-stretch",
	"letter-spacing",
	"word-spacing",
	"text-transform",
	"text-indent",
	"text-align",
	"line-height",
	"tab-size",
	"direction"
];
function zc(e, t) {
	try {
		let n = getComputedStyle(e, "::selection").backgroundColor;
		if (n && !Mc.has(n) && n !== t.backgroundColor) return n;
	} catch {}
	return Nc;
}
function Bc(e, t) {
	let n = e.ownerDocument || document;
	if (n.activeElement !== e) return;
	let r = null, i = null;
	try {
		r = e.selectionStart, i = e.selectionEnd;
	} catch {
		return;
	}
	if (r == null || i == null || r === i) return;
	let a = e.value || "";
	if (e.localName === "input" && e.type === "password" && (a = "•".repeat(a.length)), !a) return;
	let o = getComputedStyle(e), s = e.localName === "textarea", c = Lc(o.paddingLeft), l = Lc(o.paddingTop), u = e.clientWidth - c - Lc(o.paddingRight), d = e.clientHeight - l - Lc(o.paddingBottom), f = n.createElement("div");
	f.style.cssText = "position:absolute;top:0;left:-99999px;visibility:hidden;margin:0;border:0;padding:0;box-sizing:content-box;";
	for (let e of Rc) f.style.setProperty(e, o.getPropertyValue(e));
	s ? (f.style.whiteSpace = "pre-wrap", f.style.overflowWrap = "break-word", f.style.width = `${Math.max(0, u)}px`) : f.style.whiteSpace = "pre";
	let p = n.createElement("span");
	p.textContent = a.slice(r, i), f.append(n.createTextNode(a.slice(0, r)), p, n.createTextNode(a.slice(i))), n.body.appendChild(f);
	let m = [];
	try {
		let t = f.getBoundingClientRect(), n = -e.scrollLeft, r = -e.scrollTop;
		if (!s) {
			r += Math.max(0, (d - t.height) / 2);
			let e = o.direction === "rtl", i = o.textAlign;
			i === "start" ? i = e ? "right" : "left" : i === "end" && (i = e ? "left" : "right");
			let a = u - t.width;
			a > 0 && (i === "right" ? n += a : i === "center" && (n += a / 2));
		}
		for (let e of p.getClientRects()) e.width <= 0 || e.height <= 0 || m.push({
			x: c + (e.left - t.left) + n,
			y: l + (e.top - t.top) + r,
			width: e.width,
			height: e.height
		});
	} finally {
		f.remove();
	}
	if (m.length === 0) return;
	let h = zc(e, o);
	t.__snapdomFieldSelection = {
		images: m.map(() => `linear-gradient(${h},${h})`),
		positions: m.map((e) => `${e.x}px ${e.y}px`),
		sizes: m.map((e) => `${e.width}px ${e.height}px`),
		repeats: m.map(() => "no-repeat"),
		origins: m.map(() => "padding-box"),
		clips: m.map(() => "padding-box"),
		base: {
			image: o.backgroundImage,
			position: o.backgroundPosition,
			size: o.backgroundSize,
			repeat: o.backgroundRepeat,
			origin: o.backgroundOrigin,
			clip: o.backgroundClip
		}
	};
}
function Vc(e) {
	for (let t of e.keys()) {
		let e = t.__snapdomFieldSelection;
		if (!e) continue;
		delete t.__snapdomFieldSelection;
		let { images: n, positions: r, sizes: i, repeats: a, origins: o, clips: s, base: c } = e, l = t.style.backgroundImage || c.image;
		l && l !== "none" ? (n.push(l), r.push(t.style.backgroundPosition || c.position), i.push(t.style.backgroundSize || c.size), a.push(t.style.backgroundRepeat || c.repeat), o.push(t.style.backgroundOrigin || c.origin), s.push(t.style.backgroundClip || c.clip)) : (n.push("linear-gradient(transparent,transparent)"), r.push("0% 0%"), i.push("auto"), a.push("repeat"), o.push(c.origin || "padding-box"), s.push(c.clip || "border-box")), t.style.backgroundImage = n.join(","), t.style.backgroundPosition = r.join(","), t.style.backgroundSize = i.join(","), t.style.backgroundRepeat = a.join(","), t.style.backgroundOrigin = o.join(","), t.style.backgroundClip = s.join(",");
	}
}
V(), cn();
var Hc = [
	"transform",
	"translate",
	"rotate",
	"scale",
	"transform-origin",
	"transform-box"
], Uc = {
	circle: [
		"cx",
		"cy",
		"r",
		"vector-effect"
	],
	ellipse: [
		"cx",
		"cy",
		"rx",
		"ry",
		"vector-effect"
	],
	rect: [
		"x",
		"y",
		"width",
		"height",
		"rx",
		"ry",
		"vector-effect"
	],
	path: ["d", "vector-effect"],
	line: ["vector-effect"],
	polyline: ["vector-effect"],
	polygon: ["vector-effect"],
	use: [
		"x",
		"y",
		"width",
		"height",
		"vector-effect"
	],
	g: [],
	clipPath: []
}, Wc = {
	r: "0px",
	cx: "0px",
	cy: "0px",
	x: "0px",
	y: "0px",
	rx: "auto",
	ry: "auto",
	width: "auto",
	height: "auto",
	d: "none",
	"vector-effect": "none",
	transform: "none",
	translate: "none",
	rotate: "none",
	scale: "none",
	"transform-origin": "0px 0px",
	"transform-box": "view-box"
}, Gc = /* @__PURE__ */ new Set([
	"transform",
	"translate",
	"rotate",
	"scale"
]), Kc = /* @__PURE__ */ new WeakMap(), qc = /* @__PURE__ */ new Map();
function Jc(e) {
	let t = e.localName, n = Uc[t];
	if (!n) return null;
	let r = no(e);
	if (r && (r.size === 0 || !ro(e))) return null;
	let i = r ? Kc.get(r) : qc;
	i || Kc.set(r, i = /* @__PURE__ */ new Map());
	let a = i.get(t);
	return a || (a = [...n, ...Hc].filter((e) => !r || r.has(e)), i.set(t, a)), a.length ? a : null;
}
var Yc = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i;
function Xc(e, t) {
	let n = e.trim();
	if (!Yc.test(n) || !Yc.test(t)) return !1;
	let r = parseFloat(n);
	return Math.abs(r - parseFloat(t)) <= 1e-4 * Math.max(1, Math.abs(r));
}
function Zc(e) {
	let t = e.transform?.baseVal;
	if (!t?.numberOfItems) return null;
	let n = new DOMMatrix();
	for (let e = 0; e < t.numberOfItems; e++) {
		let r = t.getItem(e).matrix;
		n = n.multiply(new DOMMatrix([
			r.a,
			r.b,
			r.c,
			r.d,
			r.e,
			r.f
		]));
	}
	return n;
}
function Qc(e, t) {
	let n = Zc(e), r = t === "none" ? [
		1,
		0,
		0,
		1,
		0,
		0
	] : t.startsWith("matrix(") ? t.slice(7, -1).split(",").map(Number) : null;
	if (!r || r.length !== 6) return !1;
	if (!n) return r.join() === "1,0,0,1,0,0";
	let i = [
		n.a,
		n.b,
		n.c,
		n.d,
		n.e,
		n.f
	];
	for (let e = 0; e < 6; e++) if (Math.abs(i[e] - r[e]) > 1e-4 * Math.max(1, Math.abs(i[e]))) return !1;
	return !0;
}
function $c(e, t, n, r) {
	let i = !1;
	for (let a of r) {
		if (!i && (a === "transform-origin" || a === "transform-box") && !e.hasAttribute("transform")) continue;
		let r = n.getPropertyValue(a);
		if (!r) continue;
		Gc.has(a) && r !== "none" && (i = !0);
		let o = Gc.has(a) && a !== "transform" ? null : e.getAttribute(a);
		if (o != null) {
			if (r === o || r === o + "px" || a === "d" || a === "transform" && (r === "none" || Qc(e, r)) || Xc(o, r)) continue;
		} else if (r === Wc[a]) continue;
		t.style.setProperty(a, r);
	}
}
function el(e) {
	let t = H(e), n = t.display;
	if (n === "none" || t.position === "absolute" || t.position === "fixed") return null;
	let r = /^(block|inline-block|flow-root|flex|inline-flex|grid|inline-grid|list-item)$/.test(n), i = (e) => parseFloat(e) || 0, a = (e, n, i, a, o) => {
		if (!r || !e?.endsWith("px")) return null;
		let s = parseFloat(e);
		if (!Number.isFinite(s) || s < 0) return null;
		if (t.boxSizing === "border-box") return s;
		let c = a - o - i;
		return s + n + i + (c > 0 && s + n < o + c / 2 ? c : 0);
	}, [o, s, c, l] = /scroll|auto/.test(t.overflow) ? [
		e.offsetWidth,
		e.clientWidth,
		e.offsetHeight,
		e.clientHeight
	] : [
		0,
		0,
		0,
		0
	], u = a(t.width, i(t.paddingLeft) + i(t.paddingRight), i(t.borderLeftWidth) + i(t.borderRightWidth), o, s), d = a(t.height, i(t.paddingTop) + i(t.paddingBottom), i(t.borderTopWidth) + i(t.borderBottomWidth), c, l);
	if (u === null || d === null) {
		let { width: t, height: n } = ic(e), r = t, i = n;
		if (u === null && !r || d === null && !i) {
			let t = e.getBoundingClientRect();
			r ||= t.width || 0, i ||= t.height || 0;
		}
		u ??= r, d ??= i;
	}
	let f = document.createElement("div"), p = t.float === "none" ? "" : `float:${t.float};clear:${t.clear};margin:${t.margin};`;
	return f.style.cssText = `display:${n === "inline" ? "inline-block" : n};box-sizing:border-box;width:${u}px;height:${d}px;visibility:hidden;${p}`, f;
}
var tl = /* @__PURE__ */ new Set([
	"style",
	"option",
	"optgroup"
]), nl = 200, rl = /* @__PURE__ */ new Set([
	"img",
	"canvas",
	"video",
	"iframe",
	"object",
	"embed"
]);
function il(e) {
	let t = 0;
	for (let n of e.matchAll(/-?[\d.]+px/g)) t += Math.abs(parseFloat(n[0]));
	return t;
}
function al(e) {
	let t = e.filter;
	return !t || t === "none" ? 0 : t.includes("url(") ? nl : 3 * il(t);
}
function ol(e, t) {
	if (!e) return 0;
	let n = t.filterReach ||= /* @__PURE__ */ new WeakMap(), r = n.get(e);
	return r === void 0 && (r = al(H(e)) + (e === t.root ? 0 : ol(e.parentElement, t)), n.set(e, r)), r;
}
function sl(e, t, n) {
	try {
		if (!t || !e.matches(t)) return !1;
	} catch {
		return !0;
	}
	let r = H(e, n).content;
	return !!r && r !== "none" && r !== "normal";
}
function cl(e, t, n) {
	let { before: r, after: i } = so(e);
	if (r === null || i === null || sl(e, r, "::before") || sl(e, i, "::after") || t.borderImageSource && t.borderImageSource !== "none" || t.webkitBoxReflect && t.webkitBoxReflect !== "none") return nl;
	let a = parseFloat(t.fontSize) || 16, o = t.outlineStyle === "none" ? 0 : il(t.outlineWidth) + il(t.outlineOffset);
	return Math.max(a * (t.display === "list-item" ? 3 : 1), o, il(t.boxShadow), il(t.textShadow), al(t)) + ol(e.parentElement, n);
}
function ll(e, t, n, r) {
	let i = r.rect, a = Math.max(i.left - n.right, n.left - i.right, i.top - n.bottom, n.top - i.bottom);
	if (a <= 0) return !0;
	if (a > nl) return !1;
	let o = r.inkReach ||= /* @__PURE__ */ new WeakMap(), s = o.get(e);
	return s === void 0 && o.set(e, s = cl(e, t || H(e), r)), a <= s;
}
function ul(e, t) {
	if (e === t.root) return !1;
	let n = e.getBoundingClientRect();
	if (n.width === 0 && n.height === 0) return !1;
	let r = H(e);
	if (r.display === "inline" && !rl.has((e.localName || "").toLowerCase())) return !1;
	let i = e.scrollWidth || 0, a = e.scrollHeight || 0, o = {
		left: r.direction === "rtl" ? Math.min(n.left, n.right - i) : n.left,
		top: n.top,
		right: Math.max(n.right, n.left + i),
		bottom: Math.max(n.bottom, n.top + a)
	}, s = r.writingMode || "";
	if ((s.startsWith("vertical") || s.startsWith("sideways")) && (o.top = Math.min(n.top, n.bottom - a), o.left = Math.min(o.left, n.right - i)), ll(e, r, o, t)) return !1;
	let c = (e.ownerDocument || document).createTreeWalker(e, NodeFilter.SHOW_ELEMENT);
	for (; c.nextNode();) {
		let e = c.currentNode, n = e.getBoundingClientRect();
		if ((n.width > 0 || n.height > 0) && ll(e, null, n, t)) return !1;
	}
	return !0;
}
function dl(e, t) {
	let n = e.cloneNode(!1);
	return e.tagName === "IMG" && (n.removeAttribute("src"), n.removeAttribute("srcset"), n.removeAttribute("sizes")), t.husks ||= /* @__PURE__ */ new Map(), t.husks.set(n, e), n;
}
var fl = /^(block|flow-root|list-item|inline-block)$/, pl = /^(block|flow-root|flex|grid|table)$/;
function ml(e) {
	if (!e) return !1;
	let t = H(e);
	return fl.test(t.display) && t.writingMode === "horizontal-tb" && t.columnCount === "auto" && t.columnWidth === "auto";
}
function hl(e) {
	if (e.localName === "summary" || e.localName === "legend") return !1;
	let t = H(e);
	return pl.test(t.display) && t.float === "none" && t.clear === "none" && (t.position === "static" || t.position === "relative") && t.counterReset === "none" && t.counterIncrement === "none" && (t.counterSet || "none") === "none";
}
function gl(e, t) {
	let n = H(e);
	return n.display !== "contents" && (n.position === "static" || n.position === "relative" && n.top === "0px") && (n.transform === "none" || n.transform === "matrix(1, 0, 0, 1, 0, 0)") && (n.translate || "none") === "none" && (n.rotate || "none") === "none" && (n.scale || "none") === "none" && Math.abs(t.width - e.offsetWidth) < 1 && Math.abs(t.height - e.offsetHeight) < 1;
}
function _l(e, t) {
	for (let n = e.nextElementSibling; n; n = n.nextElementSibling) {
		if (n === t) return !0;
		if (H(n).display !== "none") return !1;
	}
	return !1;
}
function vl(e, t, n) {
	let r = n < 0 ? e.previousSibling : e.nextSibling;
	for (; r; r = n < 0 ? r.previousSibling : r.nextSibling) {
		if (r.nodeType === 3 && !/^[ \t\n\r\f]*$/.test(r.data)) return null;
		if (r.nodeType !== 1) continue;
		let e = H(r);
		if (e.display !== "none" && e.position !== "absolute" && e.position !== "fixed" && e.float === "none") {
			if (e.display.startsWith("inline")) return null;
			break;
		}
	}
	if (!r) return null;
	let i = r.getBoundingClientRect();
	if (!gl(r, i)) return null;
	let a = n < 0 ? t.top - i.bottom : i.top - t.bottom;
	return a >= 0 ? a : null;
}
function yl(e, t, n, r) {
	let i = [...e.childNodes];
	for (let e = 0; e < i.length; e++) {
		let a = t.get(i[e]);
		if (!a || !ml(a.parentElement) || !hl(a)) continue;
		let o = [i[e]], s = e, c = a;
		for (let n = e + 1; n < i.length; n++) {
			let e = t.get(i[n]);
			if (e) {
				if (!hl(e) || !_l(c, e)) break;
				o.push(i[n]), c = e, s = n;
			} else if (i[n].nodeType !== 8 && (i[n].nodeType !== 3 || !/^[ \t\n\r\f]*$/.test(i[n].data))) break;
		}
		if (o.length < 2) continue;
		let l = a.getBoundingClientRect(), u = c.getBoundingClientRect();
		if (gl(a, l) && gl(c, u)) {
			let d = 0;
			for (let e of o) {
				let n = t.get(e), r = H(n);
				d = Math.max(d, n.offsetWidth + (parseFloat(r.marginLeft) || 0) + (parseFloat(r.marginRight) || 0)), t.delete(e);
			}
			r.set(a, o[0]).set(c, o[0]);
			let f = u.bottom - l.top, p = vl(a, l, -1) ?? (parseFloat(H(a).marginTop) || 0), m = vl(c, u, 1) ?? (parseFloat(H(c).marginBottom) || 0);
			o[0].style.cssText = `display:block;position:static;float:none;box-sizing:border-box;padding:0;border:0;width:${d}px;min-width:${d}px;max-width:${d}px;height:${f}px;min-height:${f}px;max-height:${f}px;margin:${p}px 0 ${m}px;overflow:visible;contain:none;clear:none;visibility:hidden`;
			for (let e = 1; e < o.length; e++) n ? o[e].style.cssText = "display:none!important" : o[e].remove();
			for (let t = e + 1; t < s; t++) i[t].nodeType !== 1 && i[t].remove();
		}
		e = s;
	}
}
function bl(e, t, n) {
	let r = t.clip?.husks;
	if (!r) return null;
	let i = !!e?.querySelector?.("style"), a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Set();
	for (let e of r.keys()) e.parentNode && o.add(e.parentNode);
	for (let e of o) yl(e, r, i, a);
	for (let [e, i] of r) Sl(e, i, t, n), a.set(i, e);
	return r.clear(), a;
}
var xl = /^(block|flow-root|list-item|flex|grid|inline-block|inline-flex|inline-grid|inline)$/;
function Sl(e, t, n, r) {
	let i = H(t);
	if (!y(t) && t.localName !== "legend" && xl.test(i.display) && i.float === "none" && i.clear === "none" && i.position !== "absolute" && i.position !== "fixed" && i.writingMode === "horizontal-tb" && i.counterReset === "none" && i.counterIncrement === "none" && (i.counterSet || "none") === "none" && (i.anchorName || "none") === "none" && (i.zoom || "1") === "1") {
		let t = `display:${i.display};width:0;height:0;margin:${i.marginTop} ${i.marginRight} ${i.marginBottom} ${i.marginLeft};padding:0;border:0;`;
		(i.overflowX !== "visible" || i.overflowY !== "visible") && (t += `overflow:${i.overflowX} ${i.overflowY};`), i.contain !== "none" && (t += `contain:${i.contain};`), (i.columnCount !== "auto" || i.columnWidth !== "auto") && (t += `columns:${i.columnWidth} ${i.columnCount};`), i.verticalAlign !== "baseline" && (t += `vertical-align:${i.verticalAlign};`), i.order !== "0" && (t += `order:${i.order};`), i.alignSelf !== "auto" && (t += `align-self:${i.alignSelf};`), i.justifySelf !== "auto" && (t += `justify-self:${i.justifySelf};`);
		let n = `${i.gridRowStart} / ${i.gridColumnStart} / ${i.gridRowEnd} / ${i.gridColumnEnd}`;
		n !== "auto / auto / auto / auto" && (t += `grid-area:${n};`), e.style.cssText = t;
	} else Ns(t, e, n, r);
	let { width: a, height: o } = ic(t);
	a > 0 && (e.style.width = `${a}px`, e.style.minWidth = `${a}px`, e.style.maxWidth = `${a}px`), o > 0 && (e.style.height = `${o}px`, e.style.minHeight = `${o}px`, e.style.maxHeight = `${o}px`), e.style.visibility = "hidden";
	let s = t.parentElement ? H(t.parentElement).display : "";
	if (!/flex|grid|table/.test(s) && !i.display.startsWith("inline") && i.float === "none" && (i.position === "static" || i.position === "relative")) {
		let n = t.getBoundingClientRect(), r = vl(t, n, -1);
		r !== null && (e.style.marginTop = `${r}px`);
		let i = vl(t, n, 1);
		i !== null && (e.style.marginBottom = `${i}px`);
	}
	e.style.boxSizing = "border-box";
}
async function Cl(e, t, n) {
	if (!e) throw Error("[SnapDOM] The element cannot be null or undefined.");
	for (; t.slicer?.due();) await t.slicer.pause();
	let r = null, i = null;
	if (e.nodeType === Node.ELEMENT_NODE) {
		let r = (e.localName || e.tagName || "").toLowerCase(), i = We(e);
		if (i && (e.id === "snapdom-sandbox" || e.hasAttribute("data-snapdom-sandbox")) || e !== n.element && i || gt.has(r)) return null;
		if (r === "foreignobject" && e.parentElement?.closest?.("foreignObject")) return K(t, "Skipped a nested <foreignObject>; it can't be captured."), null;
		if (r === "source" && e.parentElement?.localName === "picture") return null;
	}
	if (e.nodeType === Node.TEXT_NODE) {
		if (t.selection) {
			let n = Ic(e, t.selection);
			if (n) return n;
		}
		return e.cloneNode(!0);
	}
	if (e.nodeType !== Node.ELEMENT_NODE) return e.cloneNode(!0);
	if (e.getAttribute("data-capture") === "exclude") {
		if (n.excludeMode === "hide") return el(e);
		if (n.excludeMode === "remove") return null;
	}
	if (n.exclude && Array.isArray(n.exclude)) for (let t of n.exclude) try {
		if (e.matches?.(t)) {
			if (n.excludeMode === "hide") return el(e);
			if (n.excludeMode === "remove") return null;
		}
	} catch {
		K(n, `Invalid exclude selector "${t}"; ignored.`);
	}
	if (n.excludePredicates) for (let t of n.excludePredicates) try {
		if (t(e)) return n.excludeMode === "remove" ? null : el(e);
	} catch (e) {
		K(n, "Your exclude function threw; the element was kept.", e);
	}
	if (typeof n.filter == "function") try {
		if (!n.filter(e)) {
			if (n.filterMode === "hide") return el(e);
			if (n.filterMode === "remove") return null;
		}
	} catch (e) {
		K(n, "Your filter function threw; the element was kept.", e);
	}
	if (e !== n.element && !tl.has(e.localName) && !y(e) && H(e).display === "none") {
		let r = e.cloneNode(!1);
		e.tagName === "IMG" && (r.removeAttribute("src"), r.removeAttribute("srcset")), r.style.setProperty("display", "none", "important");
		for (let i of e.querySelectorAll("style")) {
			let e = await Cl(i, t, n);
			e && r.appendChild(e);
		}
		return r;
	}
	if (t.clip && ul(e, t.clip)) return dl(e, t.clip);
	if (t.resolveNodeHooks) for (let r of t.resolveNodeHooks) {
		let i;
		try {
			i = await r(e, n);
		} catch (e) {
			K(t, "A plugin's resolveNode hook threw; ignored it.", e);
		}
		if (i === null) return null;
		if (i?.nodeType) return i.nodeType === Node.ELEMENT_NODE && (t.nodeMap.set(i, e), Ns(e, i, t, n)), i;
	}
	let a = Nl.get(e.tagName);
	if (a && (e.tagName === "IFRAME" || e.getAttribute("data-capture") !== "placeholder")) {
		let r = await a(e, t, n);
		if (r !== void 0) return r;
	}
	if (e.getAttribute("data-capture") === "placeholder") {
		let r = e.cloneNode(!1);
		t.nodeMap.set(r, e), Ns(e, r, t, n);
		let i = document.createElement("div");
		return i.textContent = e.getAttribute("data-placeholder-text") || "", i.style.cssText = "color:#666;font-size:12px;text-align:center;line-height:1.4;padding:0.5em;box-sizing:border-box;", r.appendChild(i), r;
	}
	let o;
	try {
		if (o = e.cloneNode(!1), Bs(e, o), t.nodeMap.set(o, e), e.tagName === "IMG") {
			$s(e, o, n);
			try {
				let t = window.getComputedStyle(e), n = parseFloat(t.width), r = parseFloat(t.height);
				if (!(n > 0) || !(r > 0)) {
					let i = ic(e), a = (e) => parseFloat(t.getPropertyValue(e)) || 0, o = t.getPropertyValue("box-sizing") === "border-box";
					n > 0 || (n = i.width - (o ? 0 : a("padding-left") + a("padding-right") + a("border-left-width") + a("border-right-width"))), r > 0 || (r = i.height - (o ? 0 : a("padding-top") + a("padding-bottom") + a("border-top-width") + a("border-bottom-width")));
				}
				let i = Math.round((n || 0) * 1e3) / 1e3, a = Math.round((r || 0) * 1e3) / 1e3;
				i && (o.dataset.snapdomWidth = String(i)), a && (o.dataset.snapdomHeight = String(a));
			} catch (e) {
				K(t, "Couldn't measure an image; kept its own size.", e);
			}
			try {
				let t = e.getAttribute("style") || "", n = window.getComputedStyle(e), r = (e) => {
					let r = t.match(RegExp(`${e}\\s*:\\s*([^;]+)`, "i")), i = r ? r[1].trim() : n.getPropertyValue(e);
					return /%|auto/i.test(String(i || ""));
				}, i = parseFloat(o.dataset.snapdomWidth || "0") || 0, a = parseFloat(o.dataset.snapdomHeight || "0") || 0, s = r("width") || !(i > 0), c = r("height") || !(a > 0);
				s && i > 0 && (o.style.width = `${i}px`), c && a > 0 && (o.style.height = `${a}px`);
				let l = n.getPropertyValue("object-fit"), u = n.getPropertyValue("object-position");
				l && l !== "fill" ? (o.style.objectFit = l, u && (o.style.objectPosition = u)) : (i > 0 && (o.style.minWidth = `${i}px`), a > 0 && (o.style.minHeight = `${a}px`));
			} catch (e) {
				K(t, "Couldn't fix the size of an image.", e);
			}
		}
	} catch (t) {
		throw K(n, "Couldn't copy this element:", [e, t]), t;
	}
	let s = null, c = e.localName, l = c === "input", u = c === "textarea", d = l || u || c === "select";
	if (u) {
		let { width: t, height: n } = ic(e), r = t || e.getBoundingClientRect().width || 0, i = n || e.getBoundingClientRect().height || 0;
		r && (o.style.width = `${r}px`), i && (o.style.height = `${i}px`), (r || i) && (o.style.boxSizing = "border-box");
	}
	if (l) {
		let n = (e.type || "text").toLowerCase();
		if ((n === "checkbox" || n === "radio") && (W() || e.indeterminate)) {
			let { el: n, applyVisual: r } = gc(e);
			t.nodeMap.set(n, e), s = r, o = n;
		} else if (n === "range" && (W() || U())) {
			let { el: n, applyVisual: r } = hc(e);
			t.nodeMap.set(n, e), s = r, o = n;
		} else if (n === "color" && U()) {
			let t = o, n = e.value || "#000000";
			s = () => {
				t.style.setProperty("background-color", n, "important"), t.style.setProperty("color", "transparent", "important"), t.style.setProperty("-webkit-text-fill-color", "transparent", "important"), t.style.setProperty("appearance", "none", "important"), t.style.setProperty("-webkit-appearance", "none", "important");
			}, t.removeAttribute("value");
		} else if ((n === "date" || n === "time" || n === "datetime-local") && (W() || U())) {
			o.setAttribute("type", "text");
			let t = e.value;
			n === "date" && e.valueAsDate && (t = e.valueAsDate.toLocaleDateString(void 0, { timeZone: "UTC" })), o.value = t, o.setAttribute("value", t);
		} else {
			let t = h(e) ? g(e.value) : e.value;
			(t || e.hasAttribute("value")) && (o.value = t, o.setAttribute("value", t)), e.checked !== void 0 && (o.checked = e.checked, e.checked ? o.setAttribute("checked", "") : o.removeAttribute("checked"), e.indeterminate && (o.indeterminate = e.indeterminate));
		}
	}
	if ((l || u) && !e.value && e.placeholder) try {
		let n = window.getComputedStyle(e, "::placeholder"), r = n && n.color;
		r && r !== "rgba(0, 0, 0, 0)" && (t.usesPlaceholder = !0, o.setAttribute("data-sd-ph", ""), o.style.setProperty("--sd-ph", r), o.style.setProperty("--sd-ph-o", n.opacity || "1"));
	} catch {}
	if (c === "select" && (r = new Set(Array.from(e.options).filter((e) => e.selected))), u && (i = e.value), d) {
		e.disabled && o.setAttribute("disabled", ""), e.required && o.setAttribute("required", ""), e.readOnly && o.setAttribute("readonly", "");
		let t = e;
		t.min !== void 0 && t.min !== "" && o.setAttribute("min", t.min), t.max !== void 0 && t.max !== "" && o.setAttribute("max", t.max), t.pattern !== void 0 && t.pattern !== "" && o.setAttribute("pattern", t.pattern);
		let n = e.getAttribute("aria-invalid");
		n !== null && o.setAttribute("aria-invalid", n);
	}
	if (Rs(e) || Ns(e, o, t, n), s && s(), n.captureSelection && (l || u)) try {
		Bc(e, o);
	} catch (e) {
		K(t, "Couldn't copy the selection of a text field.", e);
	}
	if (y(e) && !Rs(e)) {
		let t = [
			"fill",
			"stroke",
			"stroke-width",
			"stroke-dasharray",
			"stroke-dashoffset",
			"stroke-linecap",
			"stroke-linejoin",
			"stroke-miterlimit",
			"opacity",
			"fill-opacity",
			"stroke-opacity",
			"fill-rule",
			"clip-rule",
			"marker",
			"marker-start",
			"marker-mid",
			"marker-end",
			"visibility",
			"display",
			"color"
		];
		try {
			let n = window.getComputedStyle(e);
			for (let e of t) {
				let t = n.getPropertyValue(e);
				t && o.style.setProperty(e, t);
			}
			e.localName === "stop" && (o.style.setProperty("stop-color", n.getPropertyValue("stop-color")), o.style.setProperty("stop-opacity", n.getPropertyValue("stop-opacity")));
			let r = Jc(e);
			r && $c(e, o, n, r);
		} catch {}
	}
	let f = e.shadowRoot, p = null;
	if (f) {
		p = /* @__PURE__ */ new Set(), An(f);
		for (let e of f.querySelectorAll("slot")) for (let t of e.assignedNodes?.() || []) p.add(t);
		let r = t.shadowScopes ||= /* @__PURE__ */ new WeakMap(), i = 0;
		for (let t = e; t = t.assignedSlot || t.parentNode || (t.nodeType === 11 ? t.host : null);) t.shadowRoot && r.has(t.shadowRoot) && i++;
		let a = `s${t.shadowScopeSeq = (t.shadowScopeSeq || 0) + 1}`, s = Zs(f, t.shadowSheets ||= /* @__PURE__ */ new WeakMap()), c = (t.shadowGroups ||= [])[i] ||= /* @__PURE__ */ new Map(), l = s && c.get(s), u = "";
		l || (l = {
			id: a,
			vars: ec(s),
			share: !He.test(s),
			unstable: fo.test(s)
		}, s && c.set(s, l), !t.shadowPseudo && /::?(?:before|after|first-l|marker)|counter/.test(s) && (t.shadowPseudo = !0), u = Ys(s, `[data-sd~="${a}"]`, a));
		let d = l.id === a ? a : `${a} ${l.id}`;
		r.set(f, l.id), l.share && (t.shadowShare ||= /* @__PURE__ */ new WeakMap()).set(f, l.unstable), o.setAttribute("data-sd", d);
		let m = tc(e, l.vars, `[data-sd="${d}"]`);
		Qs(o, m + u, i);
		let h = [], g = !1;
		for (let e of Array.from(f.childNodes)) if (e.nodeType !== Node.ELEMENT_NODE || e.tagName !== "STYLE") {
			if (e.nodeType !== Node.ELEMENT_NODE && (e.nodeType !== Node.TEXT_NODE || !t.selection)) {
				h.push(e.cloneNode(!0));
				continue;
			}
			h.push(Cl(e, t, n).catch(() => null)), g = !0;
		}
		for (let e of g ? await Promise.all(h) : h) e && o.appendChild(e);
	}
	if (e.tagName === "SLOT") {
		let r = t.shadowScopes?.get(e.getRootNode()), i = e.assignedNodes?.() || [], a = i.length ? e.assignedNodes?.({ flatten: !0 }) || i : [], o = a.length ? a : Array.from(e.childNodes), s = document.createDocumentFragment(), c = await Promise.all(o.map((e) => Cl(e, t, n).then((e) => (e && i.length && nc(e, r), e || null)).catch(() => null)));
		return s.append(...c.filter((e) => !!e)), s;
	}
	let m = [], v = !1;
	for (let r of Array.from(e.childNodes)) if (!f || !p.has(r) && r.assignedSlot) {
		if (r.nodeType !== Node.ELEMENT_NODE && (r.nodeType !== Node.TEXT_NODE || !t.selection)) {
			m.push(r.cloneNode(!0));
			continue;
		}
		m.push(Cl(r, t, n).catch(() => null)), v = !0;
	}
	for (let e of v ? await Promise.all(m) : m) e && o.appendChild(e);
	if (r && _(o, "select")) {
		let e = !1;
		for (let n of o.options) {
			let i = r.has(t.nodeMap.get(n));
			n.selected = i, i ? n.setAttribute("selected", "") : n.removeAttribute("selected"), e ||= i;
		}
		if (!e && !o.multiple) {
			let e = o.ownerDocument.createElement("option");
			e.hidden = !0, e.style.setProperty("display", "none", "important"), e.setAttribute("selected", ""), e.value = "", o.appendChild(e);
		}
	}
	return i !== null && _(o, "textarea") && (o.textContent = i), o;
}
async function wl(e, t, n) {
	let r = !1;
	try {
		r = !!(e.contentDocument || e.contentWindow?.document);
	} catch (e) {
		K(t, "Couldn't tell if an iframe is same-origin; treated it as cross-origin.", e);
	}
	if (r) try {
		return await cc(e, t, n);
	} catch (e) {
		q(t, "iframe-failed", "same-origin iframe failed to rasterize", e), K(n, "Couldn't capture an iframe, so it was left out.", e);
	}
	r || (q(t, "iframe-cross-origin", `cross-origin iframe replaced by ${n.placeholders ? "a placeholder" : "a spacer"}`, e), K(n, n.placeholders ? "Can't capture a cross-origin iframe; showing a placeholder. Set placeholders: false to hide it." : "Can't capture a cross-origin iframe; left it out.", e));
	let { width: i, height: a } = ic(e), o = document.createElement("div");
	return o.style.cssText = n.placeholders ? `width:${i}px;height:${a}px;background-image:repeating-linear-gradient(45deg,#ddd,#ddd 5px,#f9f9f9 5px,#f9f9f9 10px);display:flex;align-items:center;justify-content:center;font-size:12px;color:#555;border:1px solid #aaa;` : `display:inline-block;width:${i}px;height:${a}px;visibility:hidden;`, Ns(e, o, t, n), o;
}
function Tl(e) {
	try {
		let t = Math.max(1, Math.min(32, e.width)), n = Math.max(1, Math.min(32, e.height)), r = document.createElement("canvas");
		r.width = t, r.height = n;
		let i = r.getContext("2d", { willReadFrequently: !0 });
		if (!i) return !1;
		i.drawImage(e, 0, 0, t, n);
		let a = i.getImageData(0, 0, t, n).data;
		for (let e = 3; e < a.length; e += 4) if (a[e] !== 0) return !1;
		return !0;
	} catch {
		return !1;
	}
}
var El = .95;
function Dl(e, t, n) {
	try {
		let r = e.getImageData(0, 0, t, n).data;
		for (let e = 3; e < r.length; e += 4) if (r[e] !== 255) return !1;
		return !0;
	} catch {
		return !1;
	}
}
function Ol(e) {
	try {
		let t = e.getContext("webgl2") || e.getContext("webgl");
		return !!t && !t.getContextAttributes()?.preserveDrawingBuffer;
	} catch {
		return !1;
	}
}
async function kl(e, t, n) {
	let r = "";
	try {
		let t = Tl(e);
		t ? (await qt(), t = Tl(e)) : Ol(e) && await qt();
		let n = null;
		if (!t) {
			n = e.getContext("2d", { willReadFrequently: !0 });
			try {
				n && n.getImageData(0, 0, 1, 1);
			} catch {}
			U() && await qt();
		}
		if (r = e.toDataURL("image/png"), !r || r === "data:,") {
			try {
				n && n.getImageData(0, 0, 1, 1);
			} catch {}
			if (await qt(), r = e.toDataURL("image/png"), !r || r === "data:,") {
				let t = document.createElement("canvas");
				t.width = e.width, t.height = e.height;
				let n = t.getContext("2d");
				n && (n.drawImage(e, 0, 0), r = t.toDataURL("image/png"));
			}
		}
	} catch (n) {
		q(t, "canvas-tainted", "a canvas tainted by cross-origin images cannot be read; it renders blank", e), K(t, "Couldn't read the pixels of a canvas; used its fallback content.", n);
	}
	n && n.debug && r && Tl(e) && K(t, "Empty canvas; capture after its first frame", e);
	let i = document.createElement("img");
	i.decoding = "sync", i.loading = "eager", r && (i.src = r), i.width = e.width, i.height = e.height;
	let { width: a, height: o } = ic(e);
	a > 0 && (i.style.width = `${a}px`), o > 0 && (i.style.height = `${o}px`), i.style.boxSizing = "border-box";
	let s = H(e), c = (e) => parseFloat(e) || 0;
	return i.dataset.snapdomWidth = String(a - c(s.paddingLeft) - c(s.paddingRight) - c(s.borderLeftWidth) - c(s.borderRightWidth)), i.dataset.snapdomHeight = String(o - c(s.paddingTop) - c(s.paddingBottom) - c(s.borderTopWidth) - c(s.borderBottomWidth)), t.nodeMap.set(i, e), Ns(e, i, t, n), i;
}
async function Al(e, t, n) {
	let r = "", i = e.poster && e.paused && !e.currentTime && !e.played.length, a = document.createElement("img");
	try {
		a.decoding = "sync", a.loading = "eager";
	} catch {}
	if (!i) try {
		let t = document.createElement("canvas");
		t.width = e.videoWidth || e.offsetWidth || 320, t.height = e.videoHeight || e.offsetHeight || 240;
		let n = t.getContext("2d");
		n && (n.drawImage(e, 0, 0, t.width, t.height), r = t.toDataURL(Dl(n, t.width, t.height) ? "image/jpeg" : "image/png", El), r && r !== "data:," || (r = ""));
	} catch (e) {
		K(t, "Couldn't capture a video frame; used its poster.", e);
	}
	r ? a.src = r : e.poster && (a.src = e.poster), a.width = e.videoWidth || e.offsetWidth || 0, a.height = e.videoHeight || e.offsetHeight || 0;
	let { width: o, height: s } = ic(e);
	return o > 0 && (a.style.width = `${o}px`), s > 0 && (a.style.height = `${s}px`), a.style.boxSizing = "border-box", a.style.objectFit = "contain", t.nodeMap.set(a, e), Ns(e, a, t, n), a;
}
async function jl(e, t, n) {
	if (!e.controls) return;
	let { width: r, height: i } = ic(e), a = Math.round(r || e.offsetWidth || 300), o = Math.round(i || e.offsetHeight || 54), s = o / 2, c = Math.max(4, o * .16), l = o * .34, u = a - o * .34, d = l + c + o * .55, f = Math.max(0, u - o * .7 - d), p = Math.max(9, Math.round(o * .24)), m = `<svg xmlns="http://www.w3.org/2000/svg" width="${a}" height="${o}" viewBox="0 0 ${a} ${o}"><rect width="${a}" height="${o}" rx="${Math.min(o / 2, 10)}" fill="#f1f3f4"/><path d="M ${l} ${s - c} L ${l + c} ${s} L ${l} ${s + c} Z" fill="#5f6368"/><rect x="${d}" y="${s - 1.5}" width="${f}" height="3" rx="1.5" fill="#bdc1c6"/><circle cx="${d}" cy="${s}" r="${Math.max(3, o * .09)}" fill="#5f6368"/><text x="${u}" y="${s}" fill="#5f6368" font-family="sans-serif" font-size="${p}" text-anchor="end" dominant-baseline="central">0:00</text></svg>`, h = document.createElement("img");
	try {
		h.decoding = "sync", h.loading = "eager";
	} catch {}
	return h.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(m)}`, h.width = a, h.height = o, h.style.width = `${a}px`, h.style.height = `${o}px`, t.nodeMap.set(h, e), Ns(e, h, t, n), h;
}
async function Ml(e, t, n) {
	let r = e.getAttribute("data") || e.getAttribute("src") || "", i = (e.getAttribute("type") || "").toLowerCase(), a = /^image\//.test(i) || /\.(png|jpe?g|gif|webp|avif|bmp|ico|svg)(\?|#|$)/i.test(r);
	if (r && a) {
		let i = document.createElement("img");
		try {
			i.decoding = "sync", i.loading = "eager";
		} catch {}
		i.src = r;
		let { width: a, height: o } = ic(e);
		return a > 0 && (i.style.width = `${a}px`), o > 0 && (i.style.height = `${o}px`), i.style.boxSizing = "border-box", t.nodeMap.set(i, e), Ns(e, i, t, n), i;
	}
	if (sc(e)) try {
		let r = await cc(e, t, n);
		if (r) return r;
	} catch {}
	r && (q(t, "embed-fallback", `<${e.localName}> not capturable, using its fallback content: ${r}`), K(n, `Couldn't capture <${e.localName}>${i ? ` (${i})` : ""}; showing its fallback content.`));
}
var Nl = /* @__PURE__ */ new Map([
	["IFRAME", wl],
	["CANVAS", kl],
	["VIDEO", Al],
	["AUDIO", jl],
	["OBJECT", Ml],
	["EMBED", Ml]
]);
cn();
function Pl(e = {}, t = null) {
	return {
		styleMap: t ? t.styleMap : /* @__PURE__ */ new Map(),
		styleCache: t ? t.styleCache : /* @__PURE__ */ new WeakMap(),
		nodeMap: t ? t.nodeMap : /* @__PURE__ */ new Map(),
		warnings: t ? null : [],
		resolveNodeHooks: null,
		animated: null,
		styleShare: e.__styleShare,
		slicer: null,
		fontUsage: null,
		tornSinceStart: null,
		retain: null,
		rootBox: null,
		compressedAssets: t ? t.compressedAssets : null,
		compressionDensity: t ? t.compressionDensity : void 0,
		compressedSnapshot: null,
		layoutZoom: 1,
		fileSvg: null,
		artifacts: null
	};
}
function Fl(e, t, n) {
	return {
		options: t,
		styleMap: e.styleMap,
		styleCache: e.styleCache,
		nodeMap: n,
		warnings: e.warnings,
		styleShare: e.styleShare,
		resolveNodeHooks: e.resolveNodeHooks,
		animated: e.animated,
		slicer: e.slicer,
		clip: null,
		selection: null,
		shadowScopes: null,
		shadowShare: null,
		shadowSheets: null,
		shadowGroups: null,
		shadowScopeSeq: 0,
		shadowPseudo: !1,
		pseudoCSS: "",
		pseudoRuleSeq: 0,
		counterCtx: null,
		siblingCounters: null,
		usesPlaceholder: !1,
		scan: null,
		scanEnv: null,
		shadowUniverse: void 0,
		share: null,
		oneLine: null,
		axes: null,
		flexOverflow: null,
		stylesCtx: null,
		stylesCtxOpts: null,
		bumpedForDisabled: !1,
		bgClipText: null,
		reconcileRisk: 0
	};
}
J(), V(), G(), cn();
var Il = [
	/font\s*awesome/i,
	/material\s*icons/i,
	/ionicons/i,
	/glyphicons/i,
	/feather/i,
	/bootstrap\s*icons/i,
	/remix\s*icons/i,
	/heroicons/i,
	/layui/i,
	/lucide/i
], Ll = Object.assign({
	materialIconsFilled: "https://fonts.gstatic.com/s/materialicons/v48/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2",
	materialIconsOutlined: "https://fonts.gstatic.com/s/materialiconsoutlined/v110/gok-H7zzDkdnRel8-DQ6KAXJ69wP1tGnf4ZGhUcel5euIg.woff2",
	materialIconsRound: "https://fonts.gstatic.com/s/materialiconsround/v109/LDItaoyNOAY6Uewc665JcIzCKsKc_M9flwmPq_HTTw.woff2",
	materialIconsSharp: "https://fonts.gstatic.com/s/materialiconssharp/v110/oPWQ_lt5nv4pWNJpghLP75WiFR4kLh3kvmvRImcycg.woff2"
}, typeof window < "u" && window.__SNAPDOM_ICON_FONTS__ || {});
function Rl(e) {
	return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function zl(e, t) {
	let n = Array.isArray(e) ? e : e ? [e] : [], r = [];
	for (let e of n) e instanceof RegExp ? r.push(e.global || e.sticky ? new RegExp(e.source, e.flags.replace(/[gy]/g, "")) : e) : typeof e == "string" ? r.push(new RegExp(Rl(e), "i")) : K(t, "Ignored an iconFonts entry: use a string or a RegExp.", e);
	return r;
}
function Bl(e, t) {
	let n = typeof e == "string" ? e : "";
	for (let e of Il) if (e.test(n)) return !0;
	if (t) {
		for (let e of t) if (e instanceof RegExp && e.test(n)) return !0;
	}
	return !!(/icon/i.test(n) || /glyph/i.test(n) || /symbols/i.test(n) || /feather/i.test(n) || /fontawesome/i.test(n));
}
function Vl(e, t) {
	if (typeof e != "string" || !e) return !1;
	let n;
	try {
		n = new URL(e, typeof location < "u" ? location.href : void 0);
	} catch {
		return Bl(e, t);
	}
	let r = n.searchParams.getAll("family").flatMap((e) => e.split("|")).map((e) => e.split(":")[0].trim()).filter(Boolean);
	return r.length ? r.every((e) => Bl(e, t)) : Bl(e, t);
}
async function Hl(e, t, n, r = 32, i = "#000", a = "normal") {
	t = t.replace(/^['"]+|['"]+$/g, "");
	let o = window.devicePixelRatio || 1;
	try {
		await Jt();
	} catch {}
	let s = document.createElement("span");
	B(s), s.textContent = e, s.style.position = "absolute", s.style.visibility = "hidden", s.style.fontFamily = `"${t}"`, s.style.fontWeight = n || "normal", s.style.fontStyle = a || "normal", s.style.fontSize = `${r}px`, s.style.lineHeight = "1", s.style.whiteSpace = "nowrap", s.style.padding = "0", s.style.margin = "0", document.body.appendChild(s);
	let c = s.getBoundingClientRect(), l = Math.ceil(c.width), u = Math.ceil(c.height);
	document.body.removeChild(s);
	let d = document.createElement("canvas");
	d.width = Math.max(1, l * o), d.height = Math.max(1, u * o);
	let f = d.getContext("2d");
	f.scale(o, o), f.font = `${a || "normal"} ${n || "normal"} ${r}px "${t}"`, f.textAlign = "left", f.textBaseline = "top", f.fillStyle = i, f.fillText(e, 0, 0);
	let p = f.measureText(e).actualBoundingBoxAscent;
	f.textBaseline = "alphabetic";
	let m = u - (f.measureText(e).actualBoundingBoxAscent - p);
	return {
		dataUrl: d.toDataURL(),
		width: l,
		height: u,
		advance: c.width,
		descent: Number.isFinite(m) ? m : 0
	};
}
function Ul(e = "") {
	let t = String(e).toLowerCase();
	return /\bmaterial\s*icons\b/.test(t) || /\bmaterial\s*symbols\b/.test(t);
}
var Wl = /* @__PURE__ */ new Map();
function Gl(e = "") {
	let t = Object.create(null), n = String(e || ""), r = /['"]?\s*([A-Za-z]{3,4})\s*['"]?\s*([+-]?\d+(?:\.\d+)?)\s*/g, i;
	for (; i = r.exec(n);) t[i[1].toUpperCase()] = Number(i[2]);
	return t;
}
async function Kl(e, t, n) {
	let r = String(e || ""), i = r.toLowerCase(), a = String(t || "").toLowerCase();
	if (/\bmaterial\s*icons\b/.test(i) && !/\bsymbols\b/.test(i) || !/\bmaterial\s*symbols\b/.test(i)) return {
		familyForMeasure: r,
		familyForCanvas: r
	};
	let o = n && (n.FILL ?? n.fill), s = "outlined";
	/\brounded\b/.test(a) || /\bround\b/.test(a) ? s = "rounded" : /\bsharp\b/.test(a) ? s = "sharp" : /\boutlined\b/.test(a) && (s = "outlined");
	let c = o === 1, l = null;
	if (c && (s === "outlined" && Ll.materialIconsFilled ? l = {
		url: Ll.materialIconsFilled,
		alias: "snapdom-mi-filled"
	} : s === "rounded" && Ll.materialIconsRound ? l = {
		url: Ll.materialIconsRound,
		alias: "snapdom-mi-round"
	} : s === "sharp" && Ll.materialIconsSharp && (l = {
		url: Ll.materialIconsSharp,
		alias: "snapdom-mi-sharp"
	})), !l) return {
		familyForMeasure: r,
		familyForCanvas: r
	};
	if (!Wl.has(l.alias)) try {
		let e = new FontFace(l.alias, `url(${l.url})`, {
			style: "normal",
			weight: "400"
		});
		await e.load(), document.fonts.add(e), Wl.set(l.alias, !0);
	} catch {
		return Wl.set(l.alias, !1), {
			familyForMeasure: r,
			familyForCanvas: r
		};
	}
	if (Wl.get(l.alias) === !1) return {
		familyForMeasure: r,
		familyForCanvas: r
	};
	let u = `"${l.alias}"`;
	return {
		familyForMeasure: u,
		familyForCanvas: u
	};
}
async function ql(e = "Material Icons", t = 24) {
	try {
		await Promise.all([document.fonts.load(`400 ${t}px "${String(e).replace(/["']/g, "")}"`), Jt()]);
	} catch {}
}
function Jl(e) {
	let t = e.getPropertyValue("-webkit-text-fill-color")?.trim() || "", n = /^transparent$/i.test(t) || /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(t);
	if (t && !n && t.toLowerCase() !== "currentcolor") return t;
	let r = e.color?.trim();
	return r && r !== "inherit" ? r : "#000";
}
async function Yl(e, { family: t = "Material Icons", weight: n = "normal", fontSize: r = 32, color: i = "#000", variation: a = "", className: o = "" } = {}) {
	let s = String(t || "").replace(/^['"]+|['"]+$/g, ""), c = window.devicePixelRatio || 1, { familyForMeasure: l, familyForCanvas: u } = await Kl(s, o, Gl(a));
	await ql(u.replace(/^["']+|["']+$/g, ""), r);
	let d = document.createElement("span");
	B(d), d.textContent = e, d.style.position = "absolute", d.style.visibility = "hidden", d.style.left = "-99999px", d.style.whiteSpace = "nowrap", d.style.fontFamily = l, d.style.fontWeight = String(n || "normal"), d.style.fontSize = `${r}px`, d.style.lineHeight = "1", d.style.margin = "0", d.style.padding = "0", d.style.fontFeatureSettings = "'liga' 1", d.style.fontVariantLigatures = "normal", d.style.color = i, document.body.appendChild(d);
	let f = d.getBoundingClientRect(), p = Math.max(1, Math.ceil(f.width)), m = Math.max(1, Math.ceil(f.height));
	document.body.removeChild(d);
	let h = document.createElement("canvas");
	h.width = p * c, h.height = m * c;
	let g = h.getContext("2d");
	g.scale(c, c), g.font = `${n ? `${n} ` : ""}${r}px ${u}`, g.textAlign = "left", g.textBaseline = "top", g.fillStyle = i;
	try {
		g.fontKerning = "normal";
	} catch {}
	return g.fillText(e, 0, 0), {
		dataUrl: h.toDataURL(),
		width: p,
		height: m
	};
}
async function Xl(e, t, n = /* @__PURE__ */ new Map()) {
	if (e?.nodeType !== 1) return 0;
	let r = ".material-icons, [class*=\"material-symbols\"]", i = Array.from(e.querySelectorAll(r)).filter((e) => e && e.textContent && e.textContent.trim());
	if (e.matches?.(r) && e.textContent && e.textContent.trim() && i.unshift(e), i.length === 0) return 0;
	let a = t?.nodeType === 1 ? Array.from(t.querySelectorAll(r)).filter((e) => e && e.textContent && e.textContent.trim()) : [];
	t?.nodeType === 1 && t.matches?.(r) && t.textContent && t.textContent.trim() && a.unshift(t);
	let o = 0;
	for (let e = 0; e < i.length; e++) {
		let t = i[e], r = n && n.get(t) || a[e] || null;
		try {
			let e = getComputedStyle(r || t), n = e.fontFamily || "Material Icons";
			if (!Ul(n)) continue;
			let i = (r || t).textContent.trim();
			if (!i) continue;
			let a = parseInt(e.fontSize, 10) || 24, { dataUrl: s, width: c, height: l } = await Yl(i, {
				family: n,
				weight: e.fontWeight && e.fontWeight !== "normal" ? e.fontWeight : "normal",
				fontSize: a,
				color: Jl(e),
				variation: e.fontVariationSettings && e.fontVariationSettings !== "normal" ? e.fontVariationSettings : "",
				className: (r || t).className || ""
			});
			t.textContent = "";
			let u = t.ownerDocument.createElement("img");
			u.src = s, u.alt = i, u.style.height = `${a}px`, u.style.width = `${Math.max(1, Math.round(c / l * a))}px`, u.style.objectFit = "contain", u.style.verticalAlign = getComputedStyle(t).verticalAlign || "baseline", t.appendChild(u), o++;
		} catch {}
	}
	return o;
}
var Zl = /(?:^|;)font-family:([^;]*)/, Ql = /* @__PURE__ */ new WeakSet();
function $l(e, t, n, r) {
	if (!t?.size) return 0;
	let i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = 0;
	for (let c of e) {
		let e = t.get(c);
		if (!e || c.nodeType !== 1 || Ql.has(c.firstChild)) continue;
		let l = i.get(e);
		if (l === void 0) {
			let t = Zl.exec(e)?.[1];
			l = !1, t && (l = a.get(t)) === void 0 && a.set(t, l = Bl(t, r)), i.set(e, l);
		}
		if (!l) continue;
		let u = c.dataset?.snapdomPseudo, d = u ? n.get(c.parentNode) : n.get(c);
		if (d?.nodeType !== 1) continue;
		let f = getComputedStyle(d, u || null);
		if (f.display !== "inline" && f.display !== "inline-block") continue;
		let p = `${f.fontFamily}|${f.fontSize}|${f.fontWeight}|${f.fontStyle}|${f.fontStretch}|${f.lineHeight}`, m = o.get(p);
		if (m === void 0 && o.set(p, m = tu(d.ownerDocument, f)), !m) continue;
		let h = c.ownerDocument.createElement("span");
		Ql.add(h), h.style.cssText = `display:inline-block;width:0;height:${m.height}px;vertical-align:${-m.descent}px`, c.style.lineHeight = "0", c.insertBefore(h, c.firstChild), h.nextSibling === null && eu(c, d), s++;
	}
	return s;
}
function eu(e, t) {
	let n = getComputedStyle(t.parentElement || t).whiteSpace;
	if (n !== "normal" && n !== "nowrap" && n !== "pre-line") return;
	let r = e.previousSibling, i = e.nextSibling;
	r?.nodeType !== 3 || i?.nodeType !== 3 || /[ \t\n]$/.test(r.data) && (i.data = i.data.replace(/^[ \t\n]+/, ""));
}
function tu(e, t) {
	let n = e.createElement("div");
	B(n), n.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;margin:0;padding:0;border:0;font-family:${t.fontFamily};font-size:${t.fontSize};font-weight:${t.fontWeight};font-style:${t.fontStyle};font-stretch:${t.fontStretch};line-height:${t.lineHeight}`;
	let r = e.createElement("span");
	r.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline", n.appendChild(r), (e.body || e.documentElement).appendChild(n);
	try {
		let e = n.getBoundingClientRect().height, t = r.getBoundingClientRect().top - n.getBoundingClientRect().top;
		return e > 0 ? {
			height: e,
			descent: e - t
		} : null;
	} finally {
		n.remove();
	}
}
cn(), D();
function nu(e) {
	return /\bcounter\s*\(|\bcounters\s*\(/.test(e || "");
}
function ru(e, t = !1) {
	let n = "", r = Math.max(1, e);
	for (; r > 0;) r--, n = String.fromCharCode(97 + r % 26) + n, r = Math.floor(r / 26);
	return t ? n.toUpperCase() : n;
}
function iu(e, t = !0) {
	let n = [
		[1e3, "M"],
		[900, "CM"],
		[500, "D"],
		[400, "CD"],
		[100, "C"],
		[90, "XC"],
		[50, "L"],
		[40, "XL"],
		[10, "X"],
		[9, "IX"],
		[5, "V"],
		[4, "IV"],
		[1, "I"]
	], r = Math.max(1, Math.min(3999, e)), i = "";
	for (let [e, t] of n) for (; r >= e;) i += t, r -= e;
	return t ? i : i.toLowerCase();
}
function au(e, t) {
	switch ((t || "decimal").toLowerCase()) {
		case "decimal": return String(e);
		case "decimal-leading-zero": {
			let t = Math.abs(e);
			return (e < 0 ? "-" : "") + (t < 10 ? "0" : "") + String(t);
		}
		case "lower-alpha":
		case "lower-latin": return ru(e, !1);
		case "upper-alpha":
		case "upper-latin": return ru(e, !0);
		case "lower-roman": return iu(e, !1);
		case "upper-roman": return iu(e, !0);
		case "none": return "";
		case "disc": return "•";
		case "circle": return "◦";
		case "square": return "▪";
		default: return String(e);
	}
}
function ou(e, t) {
	let n = (e || "").trim().split(/[\s,]+/).filter(Boolean), r = [];
	for (let e = 0; e < n.length; e++) {
		let i = n[e];
		if (i === "none") continue;
		let a = n[e + 1], o = a !== void 0 && Number.isFinite(Number(a));
		r.push([i, o ? Number(a) : t]), o && e++;
	}
	return r;
}
function su(e) {
	let t = /* @__PURE__ */ new WeakMap(), n = S(e) ? e.documentElement : e, r = (e) => e && e.tagName === "LI", i = /* @__PURE__ */ new WeakMap(), a = (e) => {
		let t = /* @__PURE__ */ new Map();
		for (let [n, r] of e) t.set(n, r.slice());
		return t;
	}, o = (e, t, n) => {
		let o = a(e), s;
		try {
			s = getComputedStyle(n);
		} catch {
			s = n.style;
		}
		let c;
		try {
			c = s?.counterReset;
		} catch {}
		if (c && c !== "none") for (let [e, n] of ou(c, 0)) {
			let r = t.get(e);
			if (r && r.length) {
				let t = r.slice();
				t.push(n), o.set(e, t);
			} else o.set(e, [n]);
		}
		let l;
		try {
			l = s?.counterSet;
		} catch {}
		if (l && l !== "none") for (let [e, t] of ou(l, 0)) {
			let n = o.get(e) || [];
			n.length === 0 && n.push(0), n[n.length - 1] = t, o.set(e, n);
		}
		let u;
		try {
			u = s?.counterIncrement;
		} catch {}
		if (u && u !== "none") for (let [e, t] of ou(u, 1)) {
			let n = o.get(e) || [];
			n.length === 0 && n.push(0), n[n.length - 1] += t, o.set(e, n);
		}
		try {
			if (s?.display === "list-item" && r(n)) {
				let e = n.parentElement, t = e && i.get(e), r = e?.tagName === "OL" ? parseInt(e.getAttribute("start"), 10) : NaN, a = t === void 0 ? Number.isFinite(r) ? r : 1 : t + 1, s = e?.tagName === "OL" ? parseInt(n.getAttribute("value"), 10) : NaN;
				Number.isFinite(s) && (a = s), e && i.set(e, a);
				let c = o.get("list-item") || [];
				c.length === 0 && c.push(0), c[c.length - 1] = a, o.set("list-item", c);
			}
		} catch {}
		return o;
	}, s = (e, n, r) => {
		let i = o(r, n, e);
		t.set(e, i);
		let a = i;
		for (let t of e.children) a = s(t, i, a);
		let c = /* @__PURE__ */ new Map();
		for (let [e, t] of r) {
			let n = t.length, r = a.get(e);
			c.set(e, r && r.length ? r.slice(0, n) : t.slice());
		}
		for (let [e, t] of a) !c.has(e) && t.length && !n.has(e) && c.set(e, t.slice(0, 1));
		return c;
	}, c = /* @__PURE__ */ new Map();
	return s(n, c, c), {
		get(e, n) {
			let r = t.get(e)?.get(n);
			return r && r.length ? r[r.length - 1] : 0;
		},
		getStack(e, n) {
			let r = t.get(e)?.get(n);
			return r ? r.slice() : [];
		}
	};
}
var cu = /\b(counter|counters)\s*\(((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^)"'])+)\)/g, lu = /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^,"'])+/g;
function uu(e, t, n) {
	if (!e || e === "none") return e;
	try {
		return e.replace(cu, (e, r, i) => {
			let a = (String(i).match(lu) || []).map((e) => e.trim());
			if (r === "counter") {
				let e = a[0]?.replace(/^["']|["']$/g, ""), r = (a[1] || "decimal").toLowerCase();
				return au(n.get(t, e), r);
			}
			{
				let e = a[0]?.replace(/^["']|["']$/g, ""), r = a[1]?.replace(/^["']|["']$/g, "") ?? "", i = (a[2] || "decimal").toLowerCase(), o = n.getStack(t, e);
				return o.length ? o.map((e) => au(e, i)).join(r) : "";
			}
		});
	} catch {
		return "- ";
	}
}
R(), ir();
var du = /* @__PURE__ */ new WeakMap();
function fu(e) {
	let t = e.adoptedStyleSheets;
	if (!Array.isArray(t)) return;
	let n = t.length + "/";
	for (let e of t) n += e.cssRules.length + ",";
	let r = du.get(e);
	du.set(e, n), r !== void 0 && r !== n && yn();
}
function pu(e) {
	let t;
	return !!((t = e.borderTopStyle) && t !== "none" && t !== "hidden" && parseFloat(e.borderTopWidth) > 0 || (t = e.borderRightStyle) && t !== "none" && t !== "hidden" && parseFloat(e.borderRightWidth) > 0 || (t = e.borderBottomStyle) && t !== "none" && t !== "hidden" && parseFloat(e.borderBottomWidth) > 0 || (t = e.borderLeftStyle) && t !== "none" && t !== "hidden" && parseFloat(e.borderLeftWidth) > 0);
}
function mu(e, t) {
	let n = null, r = () => {
		if (!n) try {
			n = su(e);
		} catch (e) {
			K(t, "Couldn't compute CSS counters; list numbers may be off.", e), n = {
				get: () => 0,
				getStack: () => []
			};
		}
		return n;
	};
	return {
		get(e, t) {
			return r().get(e, t);
		},
		getStack(e, t) {
			return r().getStack(e, t);
		}
	};
}
function hu(e) {
	let t = !1;
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		if (r === "\"") t = !t;
		else if (r === "/" && !t) return e.slice(0, n).trim();
	}
	return e;
}
function gu(e) {
	return e.replace(/\\(?:([0-9a-fA-F]{1,6})[ \t\n]?|([\s\S]))/g, (e, t, n) => {
		if (t) {
			let e = parseInt(t, 16);
			return e === 0 || e > 1114111 ? "�" : String.fromCodePoint(e);
		}
		return n === "\n" ? "" : n;
	});
}
function _u(e) {
	if (!e) return "";
	let t = [], n = /"((?:\\[\s\S]|[^"\\])*)"|'((?:\\[\s\S]|[^'\\])*)'/g, r = 0, i;
	for (; i = n.exec(e);) {
		let a = e.slice(r, i.index).trim();
		a && t.push(a), t.push(gu(i[1] === void 0 ? i[2] : i[1])), r = n.lastIndex;
	}
	let a = e.slice(r).trim();
	return a && t.push(a), t.join("");
}
function vu(e, t, n) {
	let r = e.parentElement, i = r && n ? n.get(r) : null;
	return i ? {
		get(e, n) {
			let r = t.get(e, n), a = i.get(n);
			return typeof a == "number" ? Math.max(r, a) : r;
		},
		getStack(e, n) {
			let r = t.getStack(e, n);
			if (!r.length) return r;
			let a = i.get(n);
			if (typeof a == "number") {
				let e = r.slice();
				return e[e.length - 1] = Math.max(e[e.length - 1], a), e;
			}
			return r;
		}
	} : t;
}
function yu(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = (e, t) => ou(e, t).map(([e, t]) => ({
		name: e,
		num: t
	})), a = i(t?.counterReset, 0), o = i(t?.counterSet, 0), s = i(t?.counterIncrement, 1);
	function c(t) {
		if (r.has(t)) return r.get(t).slice();
		let i = n.getStack(e, t);
		i = i.length ? i.slice() : [];
		let c = a.find((e) => e.name === t);
		if (c) {
			let e = Number.isFinite(c.num) ? c.num : 0;
			i = i.length ? [...i, e] : [e];
		}
		let l = o.find((e) => e.name === t);
		if (l) {
			let e = Number.isFinite(l.num) ? l.num : 0;
			i.length === 0 && (i = [0]), i[i.length - 1] = e;
		}
		let u = s.find((e) => e.name === t);
		if (u) {
			let e = Number.isFinite(u.num) ? u.num : 1;
			i.length === 0 && (i = [0]), i[i.length - 1] += e;
		}
		return r.set(t, i.slice()), i;
	}
	return {
		get(e, t) {
			let n = c(t);
			return n.length ? n[n.length - 1] : 0;
		},
		getStack(e, t) {
			return c(t);
		},
		incs: s
	};
}
var bu = [
	"color",
	"-webkit-text-fill-color",
	"font-family",
	"font-size",
	"font-weight",
	"font-style",
	"letter-spacing",
	"line-height"
], xu = [
	"color",
	"-webkit-text-fill-color",
	"font-family",
	"font-size",
	"font-weight",
	"font-style",
	"font-variant",
	"letter-spacing",
	"word-spacing",
	"text-transform",
	"text-decoration-line",
	"text-decoration-color",
	"text-decoration-style",
	"line-height",
	"background-color",
	"vertical-align"
];
function Su(e, t, n, r, i, a) {
	try {
		if (r === null) {
			if (e.getRootNode() !== (e.ownerDocument || document)) return;
			let t = H(e).display || "";
			if (i === "::marker" ? !t.includes("list-item") : t !== "block" && t !== "flow-root" && t !== "list-item" && t !== "inline-block" && t !== "table-cell" && t !== "table-caption") return;
		} else if (!e.matches(r)) return;
		if (i === "::marker" && !(H(e).display || "").includes("list-item")) return;
		let o = H(e, i), s = H(e);
		if (!o) return;
		let c = "";
		for (let e of a) {
			let t = o.getPropertyValue(e);
			!t || t === s.getPropertyValue(e) || e === "background-color" && t === "rgba(0, 0, 0, 0)" || e === "vertical-align" && t === "baseline" || (c += `${e}:${t};`);
		}
		if (i === "::marker") {
			let e = o.getPropertyValue("content");
			e && e !== "normal" && e !== "none" && (c += `content:${e};`);
		}
		if (!c) return;
		let l = `data-sd-p${n.pseudoRuleSeq = (n.pseudoRuleSeq || 0) + 1}`;
		t.setAttribute(l, ""), n.pseudoCSS = (n.pseudoCSS || "") + `[${l}]${i}{${c}}`;
	} catch {}
}
function Cu(e, t) {
	if (!/\b(?:no-)?(?:open|close)-quote\b/.test(e)) return e;
	let n = "“", r = "”";
	try {
		let e = H(t).quotes;
		if (e === "none") n = "", r = "";
		else if (e && e !== "auto") {
			let t = e.match(/"[^"]*"|'[^']*'/g);
			t && t.length >= 2 && (n = t[0].slice(1, -1), r = t[1].slice(1, -1));
		}
	} catch {}
	return n = n.replace(/"/g, ""), r = r.replace(/"/g, ""), e.replace(/"[^"]*"|\b(no-open-quote|no-close-quote|open-quote|close-quote)\b/g, (e, t) => t ? t === "open-quote" ? `"${n}"` : t === "close-quote" ? `"${r}"` : "\"\"" : e);
}
function wu(e, t, n, r) {
	let i = t.content;
	if (!i || i === "none" || i === "normal") return {
		text: "",
		incs: []
	};
	i = hu(i), i = Cu(i, e);
	let a = t.counterIncrement;
	if (!nu(i) && (!a || a === "none")) return {
		text: _u(i),
		incs: []
	};
	let o = yu(e, t, vu(e, n, r));
	return {
		text: _u(nu(i) ? uu(i, e, o) : i),
		incs: o.incs || [],
		derived: o
	};
}
function Tu(e, t) {
	if (t.shadowPseudo) return !1;
	let n = so(e), r = [];
	for (let e of [
		"before",
		"after",
		"firstLetter",
		"marker",
		"firstLine"
	]) {
		let t = n[e];
		if (t === null) return !1;
		t && r.push(t);
	}
	if (!r.length) return !0;
	let i = r.join(",");
	try {
		return !e.matches(i) && e.querySelector(i) === null;
	} catch {
		return !1;
	}
}
async function Eu(e, t, n, r, i = !1) {
	if (e?.nodeType !== 1 || t?.nodeType !== 1 || (n.slicer?.due() && await n.slicer.pause(), e.tagName === "TEXTAREA") || !i && (In(), fu(e.ownerDocument || document), Tu(e, n))) return;
	n.siblingCounters ||= /* @__PURE__ */ new WeakMap(), n.counterCtx ||= mu(e.ownerDocument || document, n);
	let a = n.counterCtx, o = so(e);
	o.marker !== "" && Su(e, t, n, o.marker, "::marker", bu), o.firstLine !== "" && Su(e, t, n, o.firstLine, "::first-line", xu);
	for (let i of [
		"::before",
		"::after",
		"::first-letter"
	]) {
		let s = o[i === "::before" ? "before" : i === "::after" ? "after" : "firstLetter"];
		if (s !== null) {
			if (s === "") continue;
			try {
				if (!e.matches(s)) continue;
			} catch {}
		}
		let l = null;
		if (i === "::first-letter") {
			for (let e = t.firstChild; e && !l; e = e.nextSibling) e.nodeType === 3 && e.data.trim() && (l = e);
			if (!l) continue;
		}
		try {
			let o = H(e, i);
			if (!o) continue;
			let s = o.content, d = o.display;
			if (s === "-moz-alt-content" || s === "none" && o.backgroundImage === "none" && (o.backgroundColor === "transparent" || o.backgroundColor === "rgba(0, 0, 0, 0)") && !pu(o) && (!o.transform || o.transform === "none") && d === "inline") continue;
			if (d === "none" || i !== "::first-letter" && (s === "none" || s === "normal")) {
				i === "::before" && t.setAttribute("data-snapdom-has-before", "1"), i === "::after" && t.setAttribute("data-snapdom-has-after", "1");
				continue;
			}
			if (i === "::first-letter") {
				let r = H(e), i = (r?.display || "").toLowerCase();
				if (i.includes("flex") || i.includes("grid")) continue;
				let a = (e) => o[e] !== r[e] && (parseFloat(o[e]) || 0) !== 0;
				if (!(o.color !== r.color || o.fontSize !== r.fontSize || o.fontWeight !== r.fontWeight || o.fontFamily !== r.fontFamily || o.fontStyle !== r.fontStyle || o.textTransform !== r.textTransform || o.float !== r.float && o.float !== "none" || a("paddingTop") || a("paddingRight") || a("paddingBottom") || a("paddingLeft") || a("marginTop") || a("marginRight") || a("marginBottom") || a("marginLeft"))) continue;
				let s = l.textContent, c = /^\s*/.exec(s)[0], u = s.slice(c.length), d = u.match(/^([^\p{L}\p{N}\s]*[\p{L}\p{N}](?:['\u2019])?)/u)?.[0], f = u.slice(d?.length || 0);
				if (!d || /[\uD800-\uDFFF]/.test(d)) continue;
				let p = document.createElement("span");
				p.textContent = d, p.setAttribute("data-snapdom-pseudo", "::first-letter");
				let m = to(e, n), h = ot(mt(o, m), "span", !0, !1, "", m);
				n.styleMap.set(p, h);
				let g = document.createTextNode(f);
				t.replaceChild(g, l), t.insertBefore(p, g), c && t.insertBefore(document.createTextNode(c), p);
				continue;
			}
			let f = s ?? "", m = f === "" || f === "none" || f === "normal", { text: h, incs: g, derived: _ } = wu(e, o, a, n.siblingCounters), v = o.backgroundImage, y = o.backgroundColor, b = o.fontFamily, x = parseInt(o.fontSize) || 32, S = parseInt(o.fontWeight) || !1, C = o.fontStyle || "normal", w = o.color || "#000", T = o.transform, E = Bl(b, r?.__iconMatchers), D = !m && h !== "", O = v && v !== "none", k = y && y !== "transparent" && y !== "rgba(0, 0, 0, 0)", A = pu(o), j = T && T !== "none", M = f !== "none" && f !== "normal", ee = /^inline-/.test(d || ""), N = M && ((parseFloat(o.width) || 0) > 0 || (parseFloat(o.height) || 0) > 0 || ee), P = o.boxShadow, F = o.outlineStyle, I = M && P && P !== "none", te = M && F && F !== "none" && (parseFloat(o.outlineWidth) || 0) > 0;
			if (!(D || O || k || A || j || N || I || te)) {
				if (g && g.length && e.parentElement) {
					let t = n.siblingCounters.get(e.parentElement) || /* @__PURE__ */ new Map();
					for (let { name: n } of g) n && t.set(n, _.get(e, n));
					n.siblingCounters.set(e.parentElement, t);
				}
				continue;
			}
			let ne = h.startsWith("url(") || /^-?(?:webkit-)?image-set\(/i.test(h), re = d === "inline" && o.cssFloat === "none" && o.position !== "absolute" && o.position !== "fixed", ie = !1;
			if (D && !E && h.length > 1 && !ne && re) {
				let n = H(e), r = parseFloat(n.fontSize) || 16, i = parseFloat(n.lineHeight);
				Number.isFinite(i) || (i = r * 1.5), e.getBoundingClientRect().height < i * 1.6 && (t.style.whiteSpace = "nowrap", ie = !0);
			}
			let R = document.createElement("span");
			R.setAttribute("data-snapdom-pseudo", i), R.style.pointerEvents = "none", ie ? R.style.whiteSpace = "nowrap" : t.style.getPropertyValue(Eo) === "nowrap" && R.style.setProperty(Eo, "nowrap");
			let oe = _o(e, i, o, n), se = (H(e).display || "").toLowerCase(), ce = se.includes("flex") || se.includes("grid");
			if (ce) {
				let e = oe["min-width"];
				e && e !== "auto" && e !== "0px" || (oe["min-width"] = "0px");
			}
			let le = D;
			le && !re && parseFloat(o.height) >= 1.5 * (parseFloat(o.lineHeight) || (parseFloat(o.fontSize) || 16) * 1.2) && (le = !1, R.style.whiteSpace = o.whiteSpace);
			let ue = ot(oe, "span", le, ce, "", to(e, n));
			if (n.styleMap.set(R, ue), E && h && [...h].length === 1) {
				let { dataUrl: e, height: t, advance: n, descent: r } = await Hl(h, b, S, x, w, C), i = document.createElement("img");
				i.src = e, i.style = `height:${x}px;width:${n / t * x}px;object-fit:contain;vertical-align:${-r}px;`, R.appendChild(i);
			} else if (h && ne) {
				let t = u(h, typeof devicePixelRatio < "u" && devicePixelRatio || 1) ?? c(h);
				if (t?.trim()) try {
					let e = await L(p(t), {
						as: "dataURL",
						useProxy: r.useProxy,
						debug: r.debug
					});
					if (e?.ok && typeof e.data == "string") {
						let t = document.createElement("img");
						t.src = e.data, t.style = `width:${x}px;height:auto;object-fit:contain;`, R.appendChild(t);
					}
				} catch (t) {
					K(r, `Couldn't draw the ${i} icon of`, [e, t]);
				}
			} else !E && D && (R.textContent = h);
			R.style.backgroundImage = "none", "maskImage" in R.style && (R.style.maskImage = "none"), "webkitMaskImage" in R.style && (R.style.webkitMaskImage = "none");
			try {
				R.style.backgroundClip = o.backgroundClip, O && (R.style.backgroundRepeat = o.backgroundRepeat, R.style.backgroundSize = o.backgroundSize, o.backgroundPositionX && o.backgroundPositionY ? (R.style.backgroundPositionX = o.backgroundPositionX, R.style.backgroundPositionY = o.backgroundPositionY) : R.style.backgroundPosition = o.backgroundPosition, R.style.backgroundOrigin = o.backgroundOrigin, R.style.backgroundAttachment = o.backgroundAttachment, R.style.backgroundBlendMode = o.backgroundBlendMode);
			} catch {}
			if (O) try {
				let e = ht(v), t = await Promise.all(e.map((e) => ae(e, r)));
				R.style.backgroundImage = t.join(", ");
			} catch (e) {
				K(r, `Couldn't load the ${i} background image.`, e);
			}
			k && (R.style.backgroundColor = y);
			let de = o.maskImage || o.webkitMaskImage;
			if (de && de !== "none") try {
				let e = (await Promise.all(ht(de).map((e) => ae(e, r)))).join(", ");
				R.style.maskImage = e, R.style.webkitMaskImage = e;
				for (let e of [
					"maskSize",
					"maskRepeat",
					"maskPosition",
					"maskMode",
					"maskComposite",
					"maskOrigin",
					"maskClip"
				]) o[e] && (R.style[e] = o[e]);
			} catch (e) {
				K(r, `Couldn't load the ${i} mask image.`, e);
			}
			let fe = R.childNodes.length > 0 || R.textContent?.trim() !== "" || O || k || A || j || N || I || te;
			if (g && g.length && e.parentElement) {
				let t = n.siblingCounters.get(e.parentElement) || /* @__PURE__ */ new Map();
				for (let { name: n } of g) {
					if (!n) continue;
					let r = _.get(e, n);
					t.set(n, r);
				}
				n.siblingCounters.set(e.parentElement, t);
			}
			if (!fe) continue;
			i === "::before" ? (t.setAttribute("data-snapdom-has-before", "1"), t.insertBefore(R, t.firstChild)) : (t.setAttribute("data-snapdom-has-after", "1"), t.appendChild(R));
		} catch (t) {
			q(n, "pseudo-failed", `${i} could not be copied`, e), K(r, `Couldn't copy the ${i} of`, [e, t]);
		}
	}
	if (n.nodeMap) for (let e = t.firstElementChild; e; e = e.nextElementSibling) {
		let t = n.nodeMap.get(e);
		t?.nodeType === 1 && !e.hasAttribute("data-snapdom-pseudo") && await Eu(t, e, n, r, !0);
	}
	else {
		let i = Array.from(t.children).filter((e) => !e.hasAttribute("data-snapdom-pseudo")), a = Array.from(e.children);
		for (let e = 0; e < Math.min(a.length, i.length); e++) await Eu(a[e], i[e], n, r, !0);
	}
}
var Du = "http://www.w3.org/2000/svg", Ou = [
	"background-color",
	"background-image",
	"background-size",
	"background-position",
	"background-repeat",
	"background-origin"
];
function ku(e) {
	for (let [t, n] of e) try {
		Au(t, n);
	} catch {}
}
function Au(e, t) {
	let n = e.ownerDocument.defaultView, r = n.getComputedStyle(e), i = [...e.getClientRects()];
	if (!i.length) return;
	let a = i[0].left + parseFloat(r.borderLeftWidth), o = i[0].top + parseFloat(r.borderTopWidth), s;
	if (r.display === "inline") {
		let e = i.reduce((e, t) => e + t.width, 0), t = 0;
		s = i.map((n) => {
			let r = {
				x: n.left - a - t,
				y: n.top - o,
				w: e,
				h: n.height,
				top: n.top,
				bottom: n.bottom
			};
			return t += n.width, r;
		});
	} else s = [{
		x: 0,
		y: 0,
		w: e.clientWidth || i[0].width,
		h: e.clientHeight || i[0].height,
		top: -1 / 0,
		bottom: 1 / 0
	}];
	let c = t.ownerDocument, l = `sd-bct-${Math.random().toString(36).slice(2, 9)}`, u = Ou.map((e) => `${e}:${r.getPropertyValue(e)}`).join(";").replace(/"/g, "'"), d = "";
	s.forEach((e, t) => {
		let n = `<svg xmlns="${Du}" width="${e.w}" height="${e.h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${e.w}px;height:${e.h}px;${u}"></div></foreignObject></svg>`;
		d += `<pattern id="${l}-${t}" patternUnits="userSpaceOnUse" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}"><image width="${e.w}" height="${e.h}" preserveAspectRatio="none" href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(n)}"/></pattern>`;
	});
	let f = "", p = c.createElement("canvas").getContext("2d"), m = e.ownerDocument.createTreeWalker(e, NodeFilter.SHOW_TEXT), h = e.ownerDocument.createRange();
	for (let e = m.nextNode(); e; e = m.nextNode()) {
		let t = n.getComputedStyle(e.parentElement);
		p.font = t.font;
		let r = p.measureText("X").fontBoundingBoxAscent;
		if (!Number.isFinite(r)) return;
		let i = t.font.replace(/"/g, "'"), c = s.map(() => ({
			xs: [],
			ys: [],
			chars: ""
		})), u = e.data;
		for (let t = 0; t < u.length; t++) {
			let n = u.charCodeAt(t) >= 55296 && u.charCodeAt(t) <= 56319 ? 2 : 1;
			h.setStart(e, t), h.setEnd(e, t + n);
			let i = h.getClientRects()[0], l = u.slice(t, t + n);
			if (t += n - 1, !i || !l.trim()) continue;
			let d = (i.top + i.bottom) / 2, f = s.findIndex((e) => d >= e.top && d <= e.bottom);
			f < 0 && (f = 0), c[f].xs.push(+(i.left - a).toFixed(2)), c[f].ys.push(+(i.top - o + r).toFixed(2)), c[f].chars += l;
		}
		c.forEach((e, t) => {
			if (!e.chars) return;
			let n = e.chars.replace(/&/g, "&amp;").replace(/</g, "&lt;");
			f += `<text x="${e.xs.join(" ")}" y="${e.ys.join(" ")}" fill="url(#${l}-${t})" style="font:${i};font-kerning:none;letter-spacing:0;white-space:pre">${n}</text>`;
		});
	}
	if (!f) return;
	let g = c.createElementNS(Du, "svg");
	g.setAttribute("style", "position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none"), g.innerHTML = `<defs>${d}</defs>${f}`, r.position === "static" && t.style.setProperty("position", "relative", "important"), t.style.setProperty("color", "transparent", "important"), t.style.setProperty("-webkit-text-fill-color", "transparent", "important"), t.insertBefore(g, t.firstChild);
}
ir(), D();
function ju(e, t, n) {
	if (!e || e?.nodeType !== 1) return;
	let r = e.ownerDocument || document, i = t || r, a = y(e) && e.localName === "svg" ? [e] : Array.from(e.querySelectorAll("svg")), o = /url\(\s*["']?\s*#([^)"']+)/g, s = [
		"fill",
		"stroke",
		"filter",
		"clip-path",
		"mask",
		"marker",
		"marker-start",
		"marker-mid",
		"marker-end"
	], c = (e) => window.CSS && CSS.escape ? CSS.escape(e) : e.replace(/[^a-zA-Z0-9_-]/g, "\\$&"), l = (e) => {
		if (!e || !e.getAttribute) return null;
		let t = e.getAttribute("href") || e.getAttribute("xlink:href") || (typeof e.getAttributeNS == "function" ? e.getAttributeNS("http://www.w3.org/1999/xlink", "href") : null);
		if (t) return t;
		let n = e.attributes;
		if (!n) return null;
		for (let e = 0; e < n.length; e++) {
			let t = n[e];
			if (!t || !t.name) continue;
			if (t.name === "href") return t.value;
			let r = t.name.indexOf(":");
			if (r !== -1 && t.name.slice(r + 1) === "href") return t.value;
		}
		return null;
	}, u = new Set(Array.from(e.querySelectorAll("[id]")).map((e) => e.id)), d = /* @__PURE__ */ new Set(), f = !1, p = (e, t = null) => {
		if (!e) return;
		o.lastIndex = 0;
		let n;
		for (; n = o.exec(e);) {
			f = !0;
			let e = (n[1] || "").trim();
			e && (u.has(e) || (d.add(e), t && !t.has(e) && t.add(e)));
		}
	}, m = (e) => {
		let t = e.querySelectorAll("use");
		for (let e of t) {
			let t = l(e);
			if (!t || !t.startsWith("#")) continue;
			f = !0;
			let n = t.slice(1).trim();
			n && !u.has(n) && d.add(n);
		}
		p(e.getAttribute("style") || "");
		for (let t of s) p(e.getAttribute(t));
		let n = e.querySelectorAll("*[style*=\"url(\"],*[fill^=\"url(\"], *[stroke^=\"url(\"],*[filter^=\"url(\"],*[clip-path^=\"url(\"],*[mask^=\"url(\"],*[marker^=\"url(\"],*[marker-start^=\"url(\"],*[marker-mid^=\"url(\"],*[marker-end^=\"url(\"]");
		for (let e of n) {
			p(e.getAttribute("style") || "");
			for (let t of s) p(e.getAttribute(t));
		}
	}, h = (e) => {
		if (!e || e.nodeType !== 1 || !e.querySelectorAll) return;
		let t = !1;
		try {
			t = !!(i.querySelector && i.querySelector("filter[id],clipPath[id],mask[id],linearGradient[id],radialGradient[id],pattern[id]"));
		} catch {
			return;
		}
		if (!t) return;
		let n = [
			"filter",
			"clipPath",
			"mask",
			"maskImage",
			"webkitMaskImage"
		], r = (e) => {
			if (y(e)) return;
			let t;
			try {
				t = getComputedStyle(e);
			} catch {
				return;
			}
			for (let e of n) {
				let n = t[e];
				n && n.includes("url(") && p(n);
			}
		};
		r(e);
		for (let t of e.querySelectorAll("*")) r(t);
	};
	for (let e of a) m(e);
	if (h(n), !f) return;
	let g = e.querySelector("svg.inline-defs-container");
	g || (g = r.createElementNS("http://www.w3.org/2000/svg", "svg"), g.classList.add("inline-defs-container"), g.setAttribute("aria-hidden", "true"), g.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden"), e.insertBefore(g, e.firstChild || null));
	let _ = g.querySelector("defs") || null, v = (t) => {
		if (!t || u.has(t)) return null;
		let n = c(t), r = (t) => {
			let n = i.querySelector(t);
			return n && !e.contains(n) ? n : null;
		};
		return r(`svg defs > *#${n}`) || r(`svg > symbol#${n}`) || r(`*#${n}`);
	};
	if (!d.size) return;
	let b = new Set(d), x = /* @__PURE__ */ new Set();
	for (; b.size;) {
		let e = b.values().next().value;
		if (b.delete(e), !e || u.has(e) || x.has(e)) continue;
		let t = v(e);
		if (!t) {
			x.add(e);
			continue;
		}
		_ || (_ = r.createElementNS("http://www.w3.org/2000/svg", "defs"), g.appendChild(_));
		let n = t.cloneNode(!0);
		n.id || n.setAttribute("id", e), _.appendChild(n), x.add(e), u.add(e);
		let i = [n, ...n.querySelectorAll("*")];
		for (let e of i) {
			let t = l(e);
			if (t && t.startsWith("#")) {
				let e = t.slice(1).trim();
				e && !u.has(e) && !x.has(e) && b.add(e);
			}
			let n = e.getAttribute?.("style") || "";
			n && p(n, b);
			for (let t of s) {
				let n = e.getAttribute?.(t);
				n && p(n, b);
			}
		}
	}
}
D(), V();
var Mu = /* @__PURE__ */ new WeakMap();
function Nu(e, t) {
	let n = Mu.get(e), r = e.style;
	if (!n) {
		let i = r.cssText, a = e.hasAttribute("style");
		n = {
			users: 0,
			saved: t.map(([e, t]) => {
				let n = {
					property: e,
					value: r.getPropertyValue(e),
					priority: r.getPropertyPriority(e)
				};
				return r.setProperty(e, t, "important"), n.forcedValue = r.getPropertyValue(e), n;
			}),
			originalCSS: i,
			forcedCSS: r.cssText,
			hadStyle: a
		}, Ge(e, i, n.forcedCSS), Mu.set(e, n);
	}
	n.users++;
	let i = !1;
	return () => {
		if (!i && (i = !0, !--n.users)) {
			if (Mu.delete(e), r.cssText === n.forcedCSS) r.cssText = n.originalCSS;
			else for (let e of n.saved) r.getPropertyValue(e.property) !== e.forcedValue || r.getPropertyPriority(e.property) !== "important" || (e.value ? r.setProperty(e.property, e.value, e.priority) : r.removeProperty(e.property));
			!n.hadStyle && !r.length && (e.getAttribute("style"), e.removeAttribute("style"));
		}
	};
}
var Pu = "[style*=\"content-visibility\"]";
function Fu(e, t = null, n = null) {
	let r = [], i = (e) => {
		if (!v(e)) return;
		if (Mu.has(e)) {
			r.push(Nu(e, []));
			return;
		}
		let t = getComputedStyle(e);
		(t.contentVisibility || t.getPropertyValue("content-visibility") || "") === "auto" && r.push(Nu(e, [["content-visibility", "visible"]]));
	};
	try {
		if (n) for (let e of n) i(e);
		else if (t) {
			let n = (e) => {
				let r;
				try {
					r = e.getBoundingClientRect();
				} catch {
					return;
				}
				if (!((r.width > 0 || r.height > 0) && (r.right < t.left - 200 || r.left > t.right + 200 || r.bottom < t.top - 200 || r.top > t.bottom + 200))) {
					i(e);
					for (let t = e.firstElementChild; t; t = t.nextElementSibling) n(t);
				}
			};
			n(e);
		} else {
			for (let t of e.querySelectorAll("*")) i(t);
			i(e);
		}
	} catch {}
	return () => {
		for (let e of r) try {
			e();
		} catch {}
	};
}
hi(), G(), s(), Kt(), R(), wr();
var Iu = "data-snapdom-asset", Lu = "http://www.w3.org/1999/xlink", Ru = 0;
function zu(e, t, n, r, i, a) {
	let o = a.compressedAssets ||= /* @__PURE__ */ new WeakMap(), s = o.get(e);
	s || (s = {
		token: String(++Ru),
		properties: []
	}, o.set(e, s), e.setAttribute(Iu, s.token));
	let c = s.properties.find((e) => e.kind === t && e.name === n);
	c ? (c.compressed !== r && (c.original = r), c.compressed = i) : s.properties.push({
		kind: t,
		name: n,
		original: r,
		compressed: i
	});
}
var Bu = (e, t) => t.kind === "style" ? e.style?.getPropertyValue(t.name) : e.getAttribute(t.name);
function Vu(e, t) {
	let n = /* @__PURE__ */ new Map();
	if (!e || !t) return n;
	let r = [e, ...e.querySelectorAll(`[${Iu}]`)];
	for (let e of r) {
		let r = t.get(e);
		if (!r || e.getAttribute(Iu) !== r.token) continue;
		let i = r.properties.filter((t) => Bu(e, t) === t.compressed).map((e) => Object.freeze({ ...e }));
		i.length && n.set(r.token, Object.freeze(i));
	}
	return n;
}
function Hu(e, t) {
	if (!e || !t) return;
	let n = 0;
	for (let r of [e, ...e.querySelectorAll(`[${Iu}]`)]) {
		let e = t.get(r);
		e && (e.token = String(++n), r.setAttribute(Iu, e.token));
	}
}
async function Uu(e, t) {
	if (!t?.size || typeof e != "string" || !e.startsWith("data:image/svg+xml")) return e;
	let n = e.indexOf(","), r = new DOMParser().parseFromString(decodeURIComponent(e.slice(n + 1)), "image/svg+xml");
	if (r.querySelector("parsererror")) return e;
	let i = !1;
	for (let e of r.querySelectorAll(`[${Iu}]`)) for (let n of t.get(e.getAttribute(Iu)) || []) {
		if (Bu(e, n) !== n.compressed) continue;
		let t = await n.original;
		if (t != null) {
			if (typeof t != "string") {
				let e = t;
				if (t = await new Promise((t) => {
					let n = new FileReader();
					n.onload = () => t(n.result), n.onerror = () => t(null), n.readAsDataURL(e);
				}), t == null) continue;
			}
			n.kind === "style" ? e.style.setProperty(n.name, t, e.style.getPropertyPriority(n.name)) : n.name === "xlink:href" ? e.setAttributeNS(Lu, n.name, t) : e.setAttribute(n.name, t), i = !0;
		}
	}
	return i ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(r))}` : e;
}
function Wu(e) {
	if (e.is2D === !1) return 1 / 0;
	let t = e.a * e.a + e.b * e.b + e.c * e.c + e.d * e.d, n = e.a * e.d - e.b * e.c;
	return Math.sqrt((t + Math.sqrt(Math.max(0, t * t - 4 * n * n))) / 2);
}
function Gu(e, t, n) {
	let r = t.element || e, i = r.isConnected ? H(r) : r.style, a = n.clip, o = (e, t) => {
		try {
			return e[t]?.baseVal?.value || 0;
		} catch {
			return 0;
		}
	}, s = a?.width || r.offsetWidth || parseFloat(i?.width) || o(r, "width"), c = a?.height || r.offsetHeight || parseFloat(i?.height) || o(r, "height"), l = Number.isFinite(t.width), u = Number.isFinite(t.height);
	if (!a && (l || u) && s && c) try {
		let e = t.outerTransforms === !1 && n.rootTransform ? n.rootTransform : br({
			baseTransform: i?.transform,
			rotate: i?.rotate,
			scale: i?.scale,
			width: s,
			height: c
		});
		if (e.is2D === !1) s = 0, c = 0;
		else {
			let t = Math.abs(e.a) * s + Math.abs(e.c) * c, n = Math.abs(e.b) * s + Math.abs(e.d) * c;
			s = Math.min(s, t), c = Math.min(c, n);
		}
	} catch {
		s = 0, c = 0;
	}
	let d = (l || u ? Math.max(l ? s ? t.width / s : 1 / 0 : 0, u ? c ? t.height / c : 1 / 0 : 0) : t.scale || 1) * (t.dpr || 1);
	n.session.compressionDensity = d;
	let f = /* @__PURE__ */ new WeakMap(), p = (e) => {
		if (!e || e.nodeType !== 1) return 1;
		if (f.has(e)) return f.get(e);
		let t = e.isConnected ? H(e) : e.style, n = 1;
		try {
			t?.perspective && t.perspective !== "none" && (n = 1 / 0);
			let i = t?.transform;
			if (i && i !== "none") n *= Wu(new DOMMatrix(i));
			else if (e.transform?.baseVal?.numberOfItems) {
				let t = new DOMMatrix();
				for (let n = 0; n < e.transform.baseVal.numberOfItems; n++) {
					let r = e.transform.baseVal.getItem(n).matrix;
					t = t.multiply(new DOMMatrix([
						r.a,
						r.b,
						r.c,
						r.d,
						r.e,
						r.f
					]));
				}
				n *= Wu(t);
			}
			if (t?.scale && t.scale !== "none") {
				let e = t.scale.trim().split(/\s+/).map((e) => parseFloat(e) / (e.endsWith("%") ? 100 : 1));
				n *= Math.max(...e.map(Math.abs));
			}
			if (e !== r && t?.zoom && t.zoom !== "normal" && (n *= parseFloat(t.zoom) || 1), e.localName === "svg" && e.viewBox?.baseVal?.width > 0 && e.viewBox.baseVal.height > 0) {
				let r = e.viewBox.baseVal, i = (n) => /^\d+(?:\.\d+)?px$/.test(t?.[n] || "") ? parseFloat(t[n]) : o(e, n), a = i("width"), s = i("height");
				n *= a > 0 && s > 0 ? Math.max(a / r.width, s / r.height) : 1 / 0;
			}
		} catch {
			n = 1 / 0;
		}
		return Number.isFinite(n) || (n = 1 / 0), e !== r && (n *= p(e.parentElement || e.getRootNode?.().host)), f.set(e, n), n;
	};
	return {
		density: d,
		stretch: p
	};
}
var Ku = .92, qu = 1;
async function Ju(e) {
	let t = new Image();
	return t.decoding = "sync", t.src = e, typeof t.decode == "function" ? (await t.decode(), t) : (await new Promise((e, n) => {
		t.onload = () => e(), t.onerror = n;
	}), t);
}
function Yu(e) {
	let t = /^data:([^;,]+)/.exec(e);
	return t ? t[1] : "";
}
var Xu = 65536, Zu = 33554432, Qu = 50, $u = /* @__PURE__ */ new Map(), ed = 0, td = 0;
function nd(e, t) {
	let n = e.indexOf(",");
	if (n < 0 || !/;base64/i.test(e.slice(0, n))) return null;
	let r = Math.ceil(t / 3) * 4, i = e.length - n - 1, a = Math.min(i, r);
	try {
		let t = atob(e.slice(n + 1, n + 1 + a - a % 4)), r = new Uint8Array(t.length);
		for (let e = 0; e < t.length; e++) r[e] = t.charCodeAt(e);
		return r;
	} catch {
		return null;
	}
}
function rd(e) {
	let t = nd(e, 4096);
	if (!t || t.length < 16) return null;
	let n = (e) => t[e] << 8 | t[e + 1];
	if (t[0] === 137 && t[1] === 80 && t.length >= 24) return {
		w: (t[16] << 24 | t[17] << 16 | t[18] << 8 | t[19]) >>> 0,
		h: (t[20] << 24 | t[21] << 16 | t[22] << 8 | t[23]) >>> 0
	};
	if (t[0] === 71 && t[1] === 73 && t[2] === 70) return {
		w: t[6] | t[7] << 8,
		h: t[8] | t[9] << 8
	};
	if (t[0] === 82 && t[1] === 73 && t[8] === 87 && t.length >= 30) {
		let e = t[15];
		if (e === 32 && t[23] === 157) return {
			w: (t[26] | t[27] << 8) & 16383,
			h: (t[28] | t[29] << 8) & 16383
		};
		if (e === 76) return {
			w: (t[21] | (t[22] & 63) << 8) + 1,
			h: ((t[22] >> 6 | t[23] << 2 | (t[24] & 15) << 10) & 16383) + 1
		};
		if (e === 88) return {
			w: (t[24] | t[25] << 8 | t[26] << 16) + 1,
			h: (t[27] | t[28] << 8 | t[29] << 16) + 1
		};
	}
	if (t[0] === 255 && t[1] === 216) {
		let e = 2;
		for (; e + 9 < t.length;) {
			if (t[e] !== 255) {
				e++;
				continue;
			}
			let r = t[e + 1];
			if (r === 216 || r === 1 || r >= 208 && r <= 215) {
				e += 2;
				continue;
			}
			if (r >= 192 && r <= 207 && r !== 196 && r !== 200 && r !== 204) return {
				h: n(e + 5),
				w: n(e + 7)
			};
			let i = n(e + 2);
			if (i < 2) break;
			e += 2 + i;
		}
	}
	return null;
}
function id(e, t, n, r) {
	let i = Math.min(1, Math.max(n / e, r / t));
	return !(i > 0) || i >= .95 ? 0 : i;
}
var ad = "self.onmessage = async (e) => {\n  const { id, dataURL, blob: given, srcLength, targetW, targetH, resFactor, quality, mime } = e.data\n  try {\n    const blob = given || await (await fetch(dataURL)).blob()\n    const bmp = await createImageBitmap(blob)\n    const nw = bmp.width, nh = bmp.height\n    if (!nw || !nh) { bmp.close(); self.postMessage({ id, url: null }); return }\n    const raw = Math.min(1, Math.max(targetW / nw, targetH / nh))\n    if (!(raw > 0) || raw >= 0.95) { bmp.close(); self.postMessage({ id, url: null }); return }\n    const factor = raw * resFactor\n    const ow = Math.max(1, Math.round(nw * factor))\n    const oh = Math.max(1, Math.round(nh * factor))\n    const canvas = new OffscreenCanvas(ow, oh)\n    const ctx = canvas.getContext('2d')\n    ctx.imageSmoothingEnabled = true\n    ctx.imageSmoothingQuality = 'high'\n    ctx.drawImage(bmp, 0, 0, ow, oh)\n    bmp.close()\n    const out = await canvas.convertToBlob({ type: mime, quality })\n    const url = new FileReaderSync().readAsDataURL(out)\n    self.postMessage({ id, url: (url && url.length < srcLength) ? url : null })\n  } catch (err) {\n    self.postMessage({ id, error: String(err) })\n  }\n}", od = Math.max(1, Math.min(4, (typeof navigator < "u" && navigator.hardwareConcurrency || 2) - 1)), sd = null, cd = 0, ld = 0, ud = /* @__PURE__ */ new Map();
function dd() {
	for (let e of ud.values()) e(void 0);
	if (ud.clear(), Array.isArray(sd)) for (let e of sd) try {
		e?.terminate();
	} catch {}
	sd = !1;
}
function fd() {
	let e, t = null;
	try {
		e = URL.createObjectURL(new Blob([ad], { type: "text/javascript" })), t = new Worker(e), t.onmessage = (e) => {
			let t = ud.get(e.data.id);
			t && (ud.delete(e.data.id), t(e.data.error ? void 0 : e.data.url ?? null));
		}, t.onerror = dd;
	} catch {
		t = null;
	}
	return e && URL.revokeObjectURL(e), t;
}
function pd() {
	if (sd === !1) return !1;
	if (sd === null) {
		if (typeof Worker > "u" || typeof OffscreenCanvas > "u") return sd = !1;
		sd = [];
	}
	let e = cd++ % od;
	if (!sd[e]) {
		let t = fd();
		if (!t) return dd(), !1;
		sd[e] = t;
	}
	return sd[e];
}
var md = 5e3;
function hd(e, t, n, r, i) {
	let a = pd();
	return a ? new Promise((o) => {
		let s = ++ld, c = setTimeout(() => {
			ud.delete(s), o(void 0);
		}, md);
		ud.set(s, (e) => {
			clearTimeout(c), o(e);
		});
		try {
			a.postMessage({
				id: s,
				dataURL: i ? "" : e,
				blob: i,
				srcLength: e.length,
				targetW: t,
				targetH: n,
				resFactor: qu,
				quality: Ku,
				mime: r
			});
		} catch {
			clearTimeout(c), ud.delete(s), o(void 0);
		}
	}) : Promise.resolve(void 0);
}
async function gd(e, t, n, r) {
	if (typeof e != "string" || !e.startsWith("data:image") || e.startsWith("data:image/svg")) return null;
	t = Math.ceil(t), n = Math.ceil(n);
	let i = e.length + ":" + e.slice(0, 64) + e.slice(-64) + ":" + t + "x" + n, a = o.compress, s = a.get(i);
	if (s?.source === e) return s.pass = ed, s.result;
	let c = $u.get(i);
	if (c?.source === e && c.cache === a) return c.promise;
	let l = (async () => {
		let i = Yu(e), a = i === "image/jpeg" ? "image/jpeg" : i === "image/webp" ? "image/webp" : "image/png", o = rd(e);
		if (o && o.w > 0 && o.h > 0 && !id(o.w, o.h, t, n)) return null;
		if (e.length >= Xu) {
			let i = await hd(e, t, n, a, r);
			if (i !== void 0) return i;
		}
		let s;
		try {
			s = await Ju(e);
		} catch {
			return null;
		}
		let c = s.naturalWidth || s.width, l = s.naturalHeight || s.height;
		if (!c || !l) return null;
		let u = id(c, l, t, n);
		if (!u) return null;
		let d = u * qu, f = Math.max(1, Math.round(c * d)), p = Math.max(1, Math.round(l * d)), m = document.createElement("canvas");
		m.width = f, m.height = p;
		let h = m.getContext("2d");
		if (!h) return null;
		h.imageSmoothingEnabled = !0, h.imageSmoothingQuality = "high", h.drawImage(s, 0, 0, f, p);
		try {
			let t = m.toDataURL(a, Ku);
			if (typeof t == "string" && t.startsWith("data:image") && t.length < e.length) return t;
		} catch {}
		return null;
	})(), u = {
		source: e,
		promise: l,
		cache: a
	};
	$u.set(i, u);
	try {
		let t = await l;
		return e.length + (t?.length || 0) <= Zu && (a.set(i, {
			source: e,
			result: t,
			pass: ed
		}), td++), t;
	} finally {
		$u.get(i) === u && $u.delete(i);
	}
}
function _d(e, t) {
	let n = parseFloat(e.dataset.snapdomWidth) || parseFloat(e.style.width) || e.width || 0, r = parseFloat(e.dataset.snapdomHeight) || parseFloat(e.style.height) || e.height || 0;
	return !n || !r || t?.isConnected && H(t).objectFit === "none" ? null : {
		w: n,
		h: r
	};
}
function vd(e) {
	let t = /^data:image\/(jpe?g|png|webp)[;,]|\.(jpe?g|png|webp)(?:$|[?#])/i.exec(e);
	if (!t) return null;
	let n = (t[1] || t[2]).toLowerCase();
	return `image/${n === "jpg" ? "jpeg" : n}`;
}
async function yd(e, t, n, r) {
	if (!t.compress || !n || r.session?.slicer || t.outerTransforms === !1 && (Number.isFinite(t.width) || Number.isFinite(t.height))) return;
	let i = Array.from(e.querySelectorAll("img"));
	e.tagName === "IMG" && i.unshift(e);
	let a = [];
	for (let o of i) {
		let i = n.get(o);
		if (!i || i.localName !== "img" || !i.complete || !(i.naturalWidth > 0)) continue;
		let s = i.currentSrc || i.src || "", c = vd(s), l = /^blob:/i.test(s);
		if (!c && !l) continue;
		let u = _d(o, i);
		if (!u) continue;
		let { w: d, h: f } = u, p = r.value ||= Gu(e, t, r), m = p.density * p.stretch(i), h = id(i.naturalWidth, i.naturalHeight, Math.ceil(d * m), Math.ceil(f * m));
		if (!h || H(i).content.includes("url(")) continue;
		if (!/^(?:data|blob):/i.test(s) && i.crossOrigin == null) try {
			if (new URL(s, i.baseURI).origin !== i.ownerDocument.defaultView.location.origin) continue;
		} catch {
			continue;
		}
		let g = c ? null : new AbortController(), _ = g && fetch(s, { signal: g.signal }).then((e) => (g.abort(), e.headers), () => null), v = /^data:/i.test(s) ? s : L(s, {
			as: "blob",
			useProxy: t.useProxy
		}).then((e) => e.ok && e.data ? e.data : null), y = document.createElement("canvas");
		y.width = Math.max(1, Math.round(i.naturalWidth * h * qu)), y.height = Math.max(1, Math.round(i.naturalHeight * h * qu));
		let b = y.getContext("2d");
		if (!b) return;
		b.imageSmoothingEnabled = !0, b.imageSmoothingQuality = "high", b.drawImage(i, 0, 0, y.width, y.height), a.push({
			img: o,
			canvas: y,
			type: c,
			head: _,
			original: v,
			src: s
		});
	}
	for (let { img: e, canvas: t, type: n, head: i, original: o, src: s } of a) {
		let a = typeof o == "string" ? o.length * .75 : performance.getEntriesByName(s).pop()?.decodedBodySize;
		if (i) {
			let e = await i;
			if (n = vd(`data:${e?.get("content-type")},`), !n) continue;
			a = +e.get("content-length");
		}
		let c;
		try {
			c = t.toDataURL(n, Ku);
		} catch {
			continue;
		}
		a && c.length * .75 >= a || (e.setAttribute("src", c), zu(e, "attribute", "src", o, c, r.session));
	}
}
async function bd(e, t, n = /* @__PURE__ */ new Map(), r = { session: {} }) {
	if (!t.compress) return {
		count: 0,
		before: 0,
		after: 0
	};
	let i = Array.from(e.querySelectorAll("img"));
	e.tagName === "IMG" && i.unshift(e);
	let a = 0, o = 0, s = 0, c = async (i) => {
		let c = i.getAttribute("src") || "";
		if (!c.startsWith("data:image") || c.startsWith("data:image/svg")) return;
		let l = _d(i, n.get(i));
		if (!l) return;
		let { w: u, h: d } = l, f = r.value ||= Gu(e, t, r), p = f.density * f.stretch(n.get(i) || i), m = await gd(c, u * p, d * p, i.__snapdomBlob);
		m && (a++, o += c.length, s += m.length, i.setAttribute("src", m), zu(i, "attribute", "src", c, m, r.session));
	};
	for (let e = 0; e < i.length; e += 6) await Promise.allSettled(i.slice(e, e + 6).map(c));
	return {
		count: a,
		before: o,
		after: s
	};
}
var xd = /^(cover|contain|(\d+(\.\d+)?%(\s+\d+(\.\d+)?%)?))$/;
function Sd(e) {
	return {
		w: e.offsetWidth || e.getBoundingClientRect().width || 0,
		h: e.offsetHeight || e.getBoundingClientRect().height || 0
	};
}
async function Cd(e, t, n = /* @__PURE__ */ new Map(), r = { session: {} }) {
	if (!t.compress) return { count: 0 };
	let i = [], a = [e, ...e.querySelectorAll("[style*=\"data:image\"]")];
	for (let e of a) {
		let t = e.style && e.style.backgroundImage;
		t && t.includes("data:image") && i.push(e);
	}
	let o = 0, s = async (i) => {
		let a = n.get(i);
		if (!a || !a.isConnected) return;
		let s;
		try {
			s = getComputedStyle(a);
		} catch {
			return;
		}
		if ((s.backgroundRepeat || "repeat").toLowerCase().split(",").some((e) => e.trim() !== "no-repeat")) return;
		let c = (i.style.backgroundSize || s.backgroundSize || "auto").toLowerCase();
		if (c.split(",").some((e) => !xd.test(e.trim()))) return;
		let { w: l, h: u } = Sd(a);
		if (!l || !u) return;
		let d = Math.max(1, ...(c.match(/\d+(?:\.\d+)?%/g) || []).map((e) => parseFloat(e) / 100)), f = r.value ||= Gu(e, t, r), p = f.density * f.stretch(a) * d, m = l * p, h = u * p, g = i.style.backgroundImage, _ = [...g.matchAll(/url\((['"]?)(data:image\/[^)'"]+)\1\)/gi)], v = g;
		for (let e of _) {
			let t = e[2];
			if (t.startsWith("data:image/svg")) continue;
			let n = await gd(t, m, h);
			n && (v = v.split(t).join(n), o++);
		}
		v !== g && (i.style.setProperty("background-image", v, i.style.getPropertyPriority("background-image")), zu(i, "style", "background-image", g, i.style.backgroundImage, r.session));
	};
	for (let e = 0; e < i.length; e += 6) await Promise.allSettled(i.slice(e, e + 6).map(s));
	return { count: o };
}
async function wd(e, t, n = /* @__PURE__ */ new Map(), r = { session: {} }) {
	if (!t.compress) return { count: 0 };
	let i = Array.from(e.querySelectorAll("image"));
	e.localName === "image" && i.unshift(e);
	let a = 0, o = async (i) => {
		let o = i.getAttribute("href") || (typeof i.getAttributeNS == "function" ? i.getAttributeNS("http://www.w3.org/1999/xlink", "href") : null);
		if (!o || !o.startsWith("data:image") || o.startsWith("data:image/svg")) return;
		let s = i.getAttribute("width") || "", c = i.getAttribute("height") || "";
		if (s.includes("%") || c.includes("%")) return;
		let l = n.get(i), u = l ? H(l) : i.style, d = (e, t) => {
			if (/^\d+(?:\.\d+)?px$/.test(u?.[e] || "")) return parseFloat(u[e]);
			if (/^\d+(?:\.\d+)?(?:px)?$/.test(t.trim())) return parseFloat(t);
			try {
				return l?.[e]?.baseVal?.value || 0;
			} catch {
				return 0;
			}
		}, f = d("width", s), p = d("height", c);
		if (!f || !p) return;
		let m = r.value ||= Gu(e, t, r), h = m.density * m.stretch(l || i), g = await gd(o, f * h, p * h);
		g && (i.setAttribute("href", g), zu(i, "attribute", "href", o, g, r.session), i.hasAttribute("xlink:href") && (i.setAttributeNS(Lu, "xlink:href", g), zu(i, "attribute", "xlink:href", o, g, r.session)), a++);
	};
	for (let e = 0; e < i.length; e += 6) await Promise.allSettled(i.slice(e, e + 6).map(o));
	return { count: a };
}
async function Td(e, t, n, r = { session: {} }) {
	if (!t.compress) return;
	let i = ++ed, a = td;
	if (await bd(e, t, n, r), await Cd(e, t, n, r), await wd(e, t, n, r), td === a) return;
	let s = o.compress, c = 0;
	for (let e of s.values()) c += e.source.length + (e.result?.length || 0);
	for (let [e, t] of s) {
		if (c <= Zu && s.size <= Qu) break;
		t.pass >= i || (c -= t.source.length + (t.result?.length || 0), s.delete(e));
	}
}
var Ed = /* @__PURE__ */ new Set(), Dd = /^(?:IMG|VIDEO|CANVAS|IFRAME|EMBED|OBJECT|SVG|svg|INPUT|SELECT|TEXTAREA|BUTTON)$/, Od = "[data-sd-ph]::placeholder{color:var(--sd-ph)!important;opacity:var(--sd-ph-o)!important;-webkit-text-fill-color:var(--sd-ph)!important}";
async function kd(e, t = {}, n = Pl(t)) {
	In(), Fn(e.ownerDocument || document);
	let r = Fl(n, t, n.nodeMap), i = null, a = null, o = null;
	if (t.clip && (a = Tr(e, t.clip), a && (r.clip = {
		rect: a,
		root: e
	})), t.captureSelection) try {
		r.selection = Pc(e);
	} catch (e) {
		K(r, "Couldn't read the text selection.", e);
	}
	let s, c = "", l = "";
	if (Ed.size) {
		let t = (e, t) => {
			for (let n = t; n; n = n.assignedSlot || n.parentElement || x(n)) if (n === e) return !0;
			return !1;
		};
		for (;;) {
			let n = [...Ed].filter(({ root: n }) => t(n, e) || t(e, n)).map(({ promise: e }) => e.catch(() => {}));
			if (!n.length) break;
			await Promise.all(n);
		}
	}
	if (!r.clip && e.isConnected && e.ownerDocument?.visibilityState !== "hidden") try {
		let t = e.getBoundingClientRect(), n = e.ownerDocument?.defaultView || window, r = t.right <= 0 || t.bottom <= 0 || t.left >= n.innerWidth || t.top >= n.innerHeight, i = [];
		if (r && (() => {
			let t = [];
			e.shadowRoot && t.push(e.shadowRoot);
			for (let n of e.querySelectorAll("*")) n.shadowRoot && t.push(n.shadowRoot);
			for (; t.length;) {
				let e = t.pop(), n = e.host?.localName === "calcite-icon";
				for (let r of e.querySelectorAll("*")) {
					if (r.shadowRoot && t.push(r.shadowRoot), !n || r.localName !== "svg") continue;
					let e = r.querySelectorAll("path");
					if (!e.length || [...e].some((e) => e.getAttribute("d")?.trim())) continue;
					let a = r.getBoundingClientRect();
					a.width && a.height && i.push(r);
				}
			}
		})(), i.length) {
			let t = (async () => {
				let t = e.style, r = e.hasAttribute("style"), a = /* @__PURE__ */ new Map(), o = (e, n) => {
					a.has(e) || a.set(e, {
						value: t.getPropertyValue(e),
						priority: t.getPropertyPriority(e)
					}), t.setProperty(e, n, "important");
					let r = a.get(e);
					r.forcedValue = t.getPropertyValue(e), r.forcedPriority = t.getPropertyPriority(e);
				};
				try {
					o("left", "0"), o("top", "0"), o("right", "auto"), o("bottom", "auto"), o("margin-top", "0"), o("margin-right", "0"), o("margin-bottom", "0"), o("margin-left", "0"), o("transform", "none"), o("translate", "none"), o("opacity", "0"), o("pointer-events", "none");
					let t = e.getBoundingClientRect();
					if (t.right <= 0 || t.bottom <= 0 || t.left >= n.innerWidth || t.top >= n.innerHeight) {
						let t = e.parentElement?.getBoundingClientRect(), r = t && t.right > 0 && t.left < n.innerWidth ? Math.max(0, t.left) : 0, i = t && t.bottom > 0 && t.top < n.innerHeight ? Math.max(0, t.top) : 0;
						o("position", "fixed"), o("left", `${r}px`), o("top", `${i}px`);
					}
					await qt(100);
					let r = Date.now() + 1500, a = () => i.some((e) => {
						if ([...e.querySelectorAll("path")].some((e) => e.getAttribute("d")?.trim())) return !1;
						let t = e.getBoundingClientRect();
						return t.width && t.height && t.right > 0 && t.bottom > 0 && t.left < n.innerWidth && t.top < n.innerHeight;
					});
					for (; Date.now() < r && a();) await new Promise((e) => setTimeout(e, 25));
					await qt(100);
				} finally {
					for (let [e, n] of a) t.getPropertyValue(e) !== n.forcedValue || t.getPropertyPriority(e) !== n.forcedPriority || (n.value ? t.setProperty(e, n.value, n.priority) : t.removeProperty(e));
					!r && !t.length && e.removeAttribute("style"), await qt(100);
				}
			})(), r = {
				root: e,
				promise: t
			};
			Ed.add(r);
			try {
				await t;
			} finally {
				Ed.delete(r);
			}
		}
	} catch {}
	let u = Fu(e, a);
	if (a) {
		let t = e.getBoundingClientRect(), n = e.offsetWidth || t.width, r = e.offsetHeight || t.height, o = t.width && Math.abs(n - t.width) >= 1 ? n / t.width : 1, s = t.height && Math.abs(r - t.height) >= 1 ? r / t.height : 1;
		i = {
			x: (a.left - t.left) * o,
			y: (a.top - t.top) * s,
			width: a.width * o,
			height: a.height * s
		};
	}
	try {
		s = await Cl(e, r, t), o = bl(s, r, t);
	} catch (e) {
		throw K(r, "Capture failed while copying the element.", e), e;
	} finally {
		n && (n.rootBox = e.matches(Pu) || e.querySelector(Pu) ? [e.offsetWidth, e.offsetHeight] : null), u();
	}
	Oc(r.nodeMap, e.ownerDocument || document), r.slicer?.due() && await r.slicer.pause();
	try {
		ju(s, void 0, e);
	} catch (e) {
		q(n, "svg-defs-failed", "external <use> references failed to inline", e), K(r, "Couldn't copy external SVG icons; some may be missing.", e);
	}
	try {
		await Eu(e, s, r, t);
	} catch (e) {
		q(n, "pseudo-failed", "::before/::after pass failed", e), K(r, "Couldn't copy ::before/::after content; some decorations may be missing.", e);
	}
	r.bgClipText && ku(r.bgClipText), await yd(s, t, r.nodeMap, {
		session: n,
		clip: i
	}), await wc(s, r);
	for (let [e, t] of r.nodeMap.entries()) if (t?.tagName === "STYLE" && e?.tagName === "STYLE" && !e.hasAttribute("data-sd")) {
		let n = e.textContent || "";
		try {
			let e = t.sheet && t.sheet.cssRules;
			e && /@media/i.test(n) && (n = Xs(e));
		} catch {}
		/@(?:import|namespace)\b/i.test(n) || (n = `@layer{${n}}`), e.textContent = n;
	}
	try {
		let e = [...s.querySelectorAll("style[data-sd]")].sort((e, t) => e.getAttribute("data-sd") - t.getAttribute("data-sd"));
		for (let t of e) l += t.textContent || "", t.remove();
	} catch (e) {
		K(r, "Couldn't copy shadow DOM styles.", e);
	}
	r.slicer?.due() && await r.slicer.pause();
	let f = lt(r.styleMap);
	c = Array.from(f.entries()).map(([e, t]) => `.${t}{${e}}`).join("");
	let p = l + "[data-snapdom-has-after]::after,[data-snapdom-has-before]::before{content:none!important;display:none!important}" + (r.usesPlaceholder ? Od : "") + (r.pseudoCSS || "");
	c = p + c;
	for (let [e, t] of r.styleMap.entries()) jd(e, t, f);
	try {
		Ad(e, s, r.nodeMap);
	} catch (e) {
		K(r, "Couldn't bring an open dialog or popover into the capture.", e);
	}
	let m = e.ownerDocument.defaultView, h = e === e.ownerDocument.body && m && (m.scrollX || m.scrollY);
	if ((r.clip || e.scrollTop || e.scrollLeft || h) && s?.nodeType === 1) try {
		let t = r.clip && i ? {
			x: i.x,
			y: i.y
		} : {
			x: 0,
			y: 0
		};
		Mr(e, s, r.nodeMap, r.styleCache, t);
	} catch (e) {
		K(r, "Couldn't keep fixed-position elements in place.", e);
	}
	for (let [t, n] of r.nodeMap.entries()) n === e && e === e.ownerDocument.scrollingElement || Nd(t, n, r.nodeMap, r.styleCache);
	let g = e.ownerDocument;
	if ((e === g.body || e === g.documentElement) && g.documentElement.localName === "html") {
		let t = r.styleCache.get(g.documentElement) || H(g.documentElement);
		e === g.documentElement && (s.style.overflow = "visible");
		let n = e === g.body ? s : s.querySelector("body");
		if (n && t.overflowX === "visible" && t.overflowY === "visible" && t.contain === "none" && !t.containerType?.includes("size") && t.contentVisibility !== "auto" && t.contentVisibility !== "hidden") {
			let e = r.styleCache.get(g.body) || H(g.body);
			e.contain === "none" && !e.containerType?.includes("size") && e.contentVisibility !== "auto" && e.contentVisibility !== "hidden" && e.display !== "none" && (n.style.overflow = "visible");
		}
	}
	if (e === r.nodeMap.get(s)) {
		let t = r.styleCache.get(e) || H(e);
		r.styleCache.set(e, t);
		let n = d(t.transform);
		if (s.style.margin = "0", s.style.top = "auto", s.style.left = "auto", s.style.right = "auto", s.style.bottom = "auto", s.style.animation = "none", s.style.transition = "none", s.style.willChange = "auto", s.style.float = "none", s.style.clear = "none", s.style.placeSelf = "normal", s.style.transform = n || "", s.style.translate = "none", (/^inline-/.test(t.display) || t.display === "inline" && Dd.test(e.tagName)) && (s.style.verticalAlign = "top"), ei(e, s, t), !s.hasAttribute("lang")) {
			let t = e.closest?.("[lang]")?.getAttribute("lang") ?? e.ownerDocument?.documentElement?.getAttribute("lang");
			t && s.setAttribute("lang", t);
		}
	}
	return {
		clone: s,
		classCSS: c,
		classPrefixCSS: p,
		shadowCSS: !!l,
		styleCache: r.styleCache,
		nodeMap: r.nodeMap,
		reconcileRisk: r.reconcileRisk || 0,
		clipWindow: i,
		standIns: o,
		universe: Qa(e, r)
	};
}
function Ad(e, t, n) {
	let r = [];
	for (let t of [":modal", ":popover-open"]) try {
		r.push(...e.querySelectorAll(t));
	} catch {}
	if (!r.length) return;
	let i = /* @__PURE__ */ new Map();
	for (let [e, t] of n.entries()) i.set(t, e);
	let a = 214748e4;
	for (let e of r) {
		let n = i.get(e);
		if (n && n !== t && n.parentNode != null) {
			try {
				let n = getComputedStyle(e, "::backdrop"), r = n.backgroundColor, i = n.backgroundImage;
				if (r && r !== "rgba(0, 0, 0, 0)" && r !== "transparent" || i && i !== "none") {
					let e = document.createElement("div");
					e.setAttribute("data-sd-backdrop", ""), e.style.cssText = `position:fixed;inset:0;z-index:${a};background-color:${r};` + (i && i !== "none" && i.includes("data:") ? `background-image:${i};` : ""), t.appendChild(e);
				}
			} catch {}
			a += 1, n.style.zIndex = String(a), t.appendChild(n), a += 1;
		}
	}
}
function jd(e, t, n) {
	if (e.tagName === "STYLE") return;
	let r = n.get(t);
	r && e.classList.add(r);
	let i = e.style?.backgroundImage;
	i && i !== "none" && (e.style.backgroundImage = i);
}
var Md = [
	"grid-template-columns",
	"grid-template-rows",
	"grid-template-areas",
	"grid-auto-columns",
	"grid-auto-rows",
	"grid-auto-flow",
	"row-gap",
	"column-gap",
	"align-items",
	"justify-items",
	"align-content",
	"justify-content",
	"flex-direction",
	"flex-wrap"
];
function Nd(e, t, n, r) {
	let i = t.scrollLeft, a = t.scrollTop;
	if (!(i || a) || e?.nodeType !== 1 || e.namespaceURI !== "http://www.w3.org/1999/xhtml") return;
	e.style.overflow = "hidden", e.style.scrollbarWidth = "none", e.style.msOverflowStyle = "none";
	try {
		let o = e.querySelectorAll("*");
		for (let e of o) {
			if (e.nodeType !== 1 || e.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;
			let o = n?.get(e), s = o && (r?.get(o) || H(o)), c = e.style.position || s?.position;
			if (c !== "fixed" && c !== "absolute") continue;
			let l = s && s.position !== "absolute" && c === "absolute", u = null;
			if (o && !l) for (let e = o.parentElement || x(o); e; e = e.parentElement || x(e)) {
				let n = r?.get(e) || H(e);
				if (c === "absolute" && n.position !== "static" || n.transform && n.transform !== "none" || n.translate && n.translate !== "none" || n.rotate && n.rotate !== "none" || n.scale && n.scale !== "none" || n.filter && n.filter !== "none" || n.backdropFilter && n.backdropFilter !== "none" || n.perspective && n.perspective !== "none" || /transform|perspective|filter/.test(n.willChange || "") || /layout|paint|strict|content/.test(n.contain || "")) {
					u = e;
					break;
				}
				if (e === t) break;
			}
			if (u) {
				u === t && (e.style.top = s.top, e.style.left = s.left, e.style.right = s.right, e.style.bottom = s.bottom);
				continue;
			}
			let d = parseFloat(e.style.top || s?.top) || 0, f = parseFloat(e.style.left || s?.left) || 0;
			e.style.top = `${d + a}px`, e.style.left = `${f + i}px`, c === "fixed" && (e.style.position = "absolute");
		}
	} catch {}
	let o = document.createElement("div");
	o.style.all = "unset", o.style.direction = "inherit", o.style.transform = `translate(${-i}px, ${-a}px)`, o.style.willChange = "transform";
	let s = (r?.get(t) || H(t)).display, c = s.includes("grid") ? "grid" : s.includes("flex") ? "flex" : "";
	if (c) {
		e.style.display = s.startsWith("inline") ? "inline-block" : "block", o.style.display = c;
		for (let e of Md) o.style.setProperty(e, "inherit");
	} else o.style.display = "inline-block";
	for (o.style.width = "100%"; e.firstChild;) o.appendChild(e.firstChild);
	e.appendChild(o);
}
R(), cn(), s();
var Pd = "http://www.w3.org/1999/xlink";
function Fd(e) {
	return e.getAttribute("href") || e.getAttribute("xlink:href") || (typeof e.getAttributeNS == "function" ? e.getAttributeNS(Pd, "href") : null);
}
function Id(e) {
	let t = parseFloat(e.dataset?.snapdomWidth || "") || 0, n = parseFloat(e.dataset?.snapdomHeight || "") || 0, r = parseInt(e.getAttribute("width") || "", 10) || 0, i = parseInt(e.getAttribute("height") || "", 10) || 0, a = parseFloat(e.style?.width || "") || 0, o = parseFloat(e.style?.height || "") || 0;
	return {
		width: t || a || r || e.width || e.naturalWidth || 100,
		height: n || o || i || e.height || e.naturalHeight || 100
	};
}
async function Ld(e, t = {}, n = null) {
	let r = Array.from(e.querySelectorAll("img"));
	e.tagName === "IMG" && r.unshift(e);
	let i = async (e) => {
		if (!e.getAttribute("src")) {
			let t = e.currentSrc || e.src || Hs(e.getAttribute("srcset"), e) || "";
			t && e.setAttribute("src", t);
		}
		if (e.removeAttribute("srcset"), e.removeAttribute("sizes"), (e.getAttribute("src") || "").startsWith("data:")) {
			e.width ||= e.naturalWidth || 100, e.height ||= e.naturalHeight || 100;
			return;
		}
		let r = e.src || "";
		if (!r) return;
		let i = o.image?.get(r);
		if (i) {
			e.src = i, e.width ||= e.naturalWidth || 100, e.height ||= e.naturalHeight || 100;
			return;
		}
		let a = await L(r, {
			as: "dataURL",
			useProxy: t.useProxy,
			debug: t.debug
		});
		if (a.ok && typeof a.data == "string" && a.data.startsWith("data:")) {
			o.image?.set(r, a.data), e.src = a.data, a.blob && (e.__snapdomBlob = a.blob), e.width ||= e.naturalWidth || 100, e.height ||= e.naturalHeight || 100;
			return;
		}
		let { width: s, height: c } = Id(e), { fallbackURL: l } = t || {};
		if (l) try {
			let n = typeof l == "function" ? await l({
				width: s,
				height: c,
				src: r,
				element: e
			}) : l;
			if (n) {
				let r = await L(n, {
					as: "dataURL",
					useProxy: t.useProxy,
					debug: t.debug
				});
				if (r?.ok && typeof r.data == "string") {
					e.src = r.data, e.width ||= s, e.height ||= c;
					return;
				}
			}
		} catch {}
		let u = "";
		t.placeholders !== !1 && (q(n, "image-fallback", `image failed to inline, using placeholder: ${r}`), u = "<rect width=\"100%\" height=\"100%\" fill=\"#ccc\"/><text x=\"50%\" y=\"50%\" fill=\"#666\" font-family=\"sans-serif\" font-size=\"12\" text-anchor=\"middle\" dominant-baseline=\"central\">img</text>"), e.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${c}">${u}</svg>`)}`, e.width ||= s, e.height ||= c;
	};
	for (let e = 0; e < r.length; e += 6) {
		let t = r.slice(e, e + 6).map(i);
		await Promise.allSettled(t);
	}
	let a = Array.from(e.querySelectorAll("image"));
	e.localName === "image" && a.unshift(e);
	let s = async (e) => {
		let n = Fd(e);
		if (!n || n.startsWith("data:") || n.startsWith("blob:")) return;
		let r = await L(n, {
			as: "dataURL",
			useProxy: t.useProxy,
			debug: t.debug
		});
		r.ok && typeof r.data == "string" && r.data.startsWith("data:") && (e.setAttribute("href", r.data), e.removeAttribute("xlink:href"), typeof e.removeAttributeNS == "function" && e.removeAttributeNS(Pd, "href"));
	};
	for (let e = 0; e < a.length; e += 6) {
		let t = a.slice(e, e + 6).map(s);
		await Promise.allSettled(t);
	}
}
G(), J();
var Rd = [
	"background-image",
	"mask",
	"mask-image",
	"-webkit-mask",
	"-webkit-mask-image",
	"mask-source",
	"mask-box-image-source",
	"mask-border-source",
	"-webkit-mask-box-image-source",
	"border-image",
	"border-image-source"
], zd = [
	"mask-position",
	"mask-size",
	"mask-repeat",
	"mask-mode",
	"mask-composite",
	"-webkit-mask-position",
	"-webkit-mask-size",
	"-webkit-mask-repeat",
	"-webkit-mask-composite",
	"mask-origin",
	"mask-clip",
	"-webkit-mask-origin",
	"-webkit-mask-clip",
	"-webkit-mask-position-x",
	"-webkit-mask-position-y"
], Bd = [
	"background-position",
	"background-position-x",
	"background-position-y",
	"background-size",
	"background-repeat",
	"background-origin",
	"background-clip",
	"background-attachment",
	"background-blend-mode"
], Vd = [
	"border-image-slice",
	"border-image-width",
	"border-image-outset",
	"border-image-repeat"
];
async function Hd(e, t, n, r) {
	let i = n.get(e) || H(e);
	n.has(e) || n.set(e, i);
	let a = Qo(e), o = a ? (e) => e in a ? a[e] : "" : (e) => i.getPropertyValue(e), s = o("border-image"), c = o("border-image-source"), l = s && s !== "none" || c && c !== "none", u = i.getPropertyValue("background-image"), d = o("background-color"), f = u && u !== "none" || d && d !== "rgba(0, 0, 0, 0)" && d !== "transparent" || /url\s*\(|gradient\s*\(/i.test(i.getPropertyValue("background") || ""), p = W() && (o("background-clip") || o("-webkit-background-clip") || "").includes("text");
	if (f && !p) for (let e of Bd) {
		let n = o(e);
		n && t.style.setProperty(e, n);
	}
	for (let e of Rd) {
		if (p && e === "background-image") continue;
		let n = i.getPropertyValue(e);
		if (e === "background-image" && (!n || n === "none")) {
			let e = i.getPropertyValue("background");
			e && /url\s*\(/.test(e) && (n = ht(e).filter((e) => /url\s*\(/.test(e)).join(", ") || n);
		}
		if (!n || n === "none") continue;
		let a = ht(n), o = await Promise.all(a.map((e) => ae(e, r)));
		o.some((e) => e && e !== "none" && !/^url\(undefined/.test(e)) && t.style.setProperty(e, o.join(", "));
	}
	for (let e of zd) {
		let n = o(e);
		!n || n === "initial" || t.style.setProperty(e, n);
	}
	if (l) for (let e of Vd) {
		let n = o(e);
		!n || n === "initial" || t.style.setProperty(e, n);
	}
	if (f && /fixed/.test(o("background-attachment") || "")) try {
		await Wd(e, t, i);
	} catch {}
}
function Ud(e, t, n, r, i) {
	let a = (e || "auto").trim();
	if (a === "cover" || a === "contain") {
		if (!t || !n) return {
			w: r,
			h: i
		};
		let e = a === "cover" ? Math.max(r / t, i / n) : Math.min(r / t, i / n);
		return {
			w: t * e,
			h: n * e
		};
	}
	let o = a.split(/\s+/), s = (e, t) => {
		if (e === "auto" || e === void 0) return null;
		if (e.endsWith("px")) return parseFloat(e);
		if (e.endsWith("%")) return t * parseFloat(e) / 100;
	}, c = s(o[0], r), l = s(o[1], i);
	if (c === void 0 || l === void 0) return null;
	let u = c, d = l;
	return u == null && d == null ? (u = t || r, d = n || i) : u == null ? u = t && n ? t / n * d : r : d ??= t && n ? n / t * u : i, !u || !d ? null : {
		w: u,
		h: d
	};
}
async function Wd(e, t, n) {
	let r = (n.getPropertyValue("background-attachment") || "").split(",").map((e) => e.trim()), i = Qt();
	if (!i) for (let t = e.parentElement; t && !i; t = t.parentElement) {
		let e = H(t);
		(e.transform && e.transform !== "none" || e.filter && e.filter !== "none") && (i = !0);
	}
	if (i) {
		t.style.setProperty("background-attachment", r.map(() => "scroll").join(", "));
		return;
	}
	let a = e.getBoundingClientRect(), o = e.ownerDocument?.defaultView || window, s = o.innerWidth, c = o.innerHeight, l = ht(t.style.backgroundImage || n.getPropertyValue("background-image") || ""), u = (t.style.backgroundSize || n.getPropertyValue("background-size") || "auto").split(",").map((e) => e.trim()), d = (t.style.backgroundPosition || n.getPropertyValue("background-position") || "0% 0%").split(",").map((e) => e.trim()), f = [], p = [];
	for (let e = 0; e < l.length; e++) {
		let t = r[e % r.length] || "scroll", n = u[e % u.length], i = d[e % d.length];
		if (t !== "fixed") {
			f.push(n), p.push(i);
			continue;
		}
		let o = 0, m = 0, h = l[e] && l[e].match(/url\(["']?([^"')]+)["']?\)/);
		if (h) try {
			let e = new Image();
			e.src = h[1], await e.decode(), o = e.naturalWidth, m = e.naturalHeight;
		} catch {
			f.push(n), p.push(i);
			continue;
		}
		let g = Ud(n, o, m, s, c);
		if (!g) {
			f.push(n), p.push(i);
			continue;
		}
		let _ = i.split(/\s+/), v = (e, t, n) => {
			if (!e) return 0;
			if (e.endsWith("px")) return parseFloat(e);
			if (e.endsWith("%")) return (t - n) * parseFloat(e) / 100;
		}, y = v(_[0] || "0%", s, g.w), b = v(_[1] || _[0] || "0%", c, g.h);
		y === void 0 || b === void 0 ? (f.push(n), p.push(i)) : (f.push(`${Gd(g.w)}px ${Gd(g.h)}px`), p.push(`${Gd(y - a.left)}px ${Gd(b - a.top)}px`));
	}
	t.style.setProperty("background-size", f.join(", ")), t.style.setProperty("background-position", p.join(", ")), t.style.setProperty("background-attachment", r.map(() => "scroll").join(", "));
}
var Gd = (e) => Math.round(e * 100) / 100;
async function Kd(e, t, n, r = {}, i = /* @__PURE__ */ new Map(), a = !1) {
	if (!t) return;
	let o = [], s = (e, t) => {
		if (Zo(e)) {
			if (a && Qo(e)) {
				let t = n.get(e) || H(e);
				if (Rd.every((e) => (t.getPropertyValue(e) || "none") === "none") && !/url\s*\(/.test(t.getPropertyValue("background") || "")) return;
			}
			o.push([e, t]);
		}
	};
	e && s(e, t);
	let c = [t];
	for (; c.length;) {
		let e = c.pop();
		if (e.children) for (let t of e.children) {
			if (t.tagName === "STYLE") continue;
			let e = i.get(t);
			e && s(e, t), c.push(t);
		}
	}
	for (let e = 0; e < o.length; e += 6) await Promise.allSettled(o.slice(e, e + 6).map(([e, t]) => Hd(e, t, n, r)));
}
J();
function qd(e, t, n = /* @__PURE__ */ new Map()) {
	let r = [], i = document.createTreeWalker(t, NodeFilter.SHOW_ELEMENT);
	for (let e = i.currentNode; e; e = i.nextNode()) {
		let i = n.get(e);
		if (i?.nodeType !== 1) continue;
		let a = H(i), o = a.getPropertyValue("backdrop-filter") || a.getPropertyValue("-webkit-backdrop-filter");
		o && o !== "none" && e !== t && r.push({
			cloneEl: e,
			orig: i,
			bf: o,
			path: Qd(t, e)
		});
	}
	if (!r.length) return;
	let a = e.getBoundingClientRect(), o = r.length > 1 ? /* @__PURE__ */ new Map() : null, s = r.map((e, i) => {
		let a = t.cloneNode(!0);
		Zd(a, t, e.orig.getBoundingClientRect(), n, o), ef($d(a, e.path));
		for (let e = 0; e < i; e++) {
			let t = $d(a, r[e].path);
			t && (t.style.setProperty("backdrop-filter", "none", "important"), t.style.setProperty("-webkit-backdrop-filter", "none", "important"));
		}
		return {
			...e,
			copy: a
		};
	});
	for (let { cloneEl: e, orig: t, bf: n, copy: r } of s) Jd.has(e.tagName) || Yd(e, t, n, r, a);
}
var Jd = /* @__PURE__ */ new Set([
	"IMG",
	"INPUT",
	"TEXTAREA",
	"SELECT",
	"CANVAS",
	"VIDEO",
	"AUDIO",
	"IFRAME",
	"EMBED",
	"OBJECT",
	"PROGRESS",
	"METER",
	"HR",
	"BR"
]);
function Yd(e, t, n, r, i) {
	let a = t.getBoundingClientRect();
	if (!a.width || !a.height) return;
	let o = H(t), s = t.offsetWidth ? a.width / t.offsetWidth : 1, c = Math.abs(s - 1) > .001 ? 1 / s : 1;
	r.style.position = "absolute", r.style.left = `${(i.left - a.left) * c}px`, r.style.top = `${(i.top - a.top) * c}px`, r.style.width = `${i.width}px`, r.style.height = `${i.height}px`, r.style.margin = "0", r.style.filter = n, c !== 1 && (r.style.transform = `scale(${c})`, r.style.transformOrigin = "top left");
	let l = document.createElement("div");
	l.style.cssText = "position:absolute;inset:0;overflow:hidden;border-radius:inherit;z-index:-2", l.appendChild(r);
	let u = document.createElement("div");
	u.style.cssText = "position:absolute;inset:0;border-radius:inherit;z-index:-1", u.style.backgroundColor = o.backgroundColor, u.style.backgroundImage = e.style.backgroundImage || o.backgroundImage;
	for (let e of [
		"background-size",
		"background-position",
		"background-repeat",
		"background-origin",
		"background-clip"
	]) u.style.setProperty(e, o.getPropertyValue(e));
	e.style.setProperty("background-color", "transparent", "important"), e.style.setProperty("background-image", "none", "important"), e.style.setProperty("backdrop-filter", "none", "important"), e.style.setProperty("-webkit-backdrop-filter", "none", "important"), o.position === "static" && (e.style.position = "relative"), e.style.isolation = "isolate", e.prepend(u), e.prepend(l);
}
var Xd = 128;
function Zd(e, t, n, r, i) {
	let a = [[e, t]];
	for (; a.length;) {
		let [e, t] = a.pop(), o = r.get(t);
		if (o?.nodeType === 1) {
			let t = i?.get(o);
			t || (t = o.getBoundingClientRect(), i?.set(o, t)), (t.left > n.right + Xd || t.right < n.left - Xd || t.top > n.bottom + Xd || t.bottom < n.top - Xd) && (e.tagName === "IMG" && e.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="), e.style && (e.style.backgroundImage = "none"));
		}
		let s = e.children, c = t.children;
		for (let e = 0; e < s.length; e++) a.push([s[e], c[e]]);
	}
}
function Qd(e, t) {
	let n = [];
	for (let r = t; r !== e; r = r.parentElement) {
		if (!r?.parentElement) return null;
		n.push([...r.parentElement.children].indexOf(r));
	}
	return n.reverse();
}
function $d(e, t) {
	if (!t) return null;
	let n = e;
	for (let e of t) if (n = n.children[e], !n) return null;
	return n;
}
function ef(e) {
	if (e) for (let t = e; t && t.parentNode;) {
		let n = t.parentNode;
		for (; t.nextSibling;) t.nextSibling.remove();
		t === e && t.remove(), t = n;
	}
}
J(), G(), D(), Kt(), s(), R(), ir(), G(), V(), cn();
var tf = /* @__PURE__ */ new Set([
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui",
	"emoji",
	"math",
	"fangsong",
	"ui-serif",
	"ui-sans-serif",
	"ui-monospace",
	"ui-rounded"
]), nf = [
	"katex",
	"mathjax",
	"mathml"
], rf = [
	"size-adjust",
	"ascent-override",
	"descent-override",
	"line-gap-override"
];
function af(e) {
	if (!e) return [];
	let t = [];
	for (let n of e.split(",")) {
		let e = n.trim().replace(/^['"]+|['"]+$/g, "");
		e && (tf.has(e.toLowerCase()) || t.push(e));
	}
	return t;
}
function of(e) {
	let t = String(e ?? "400").trim().toLowerCase();
	if (t === "normal") return 400;
	if (t === "bold") return 700;
	let n = parseInt(t, 10);
	return Number.isFinite(n) ? Math.min(900, Math.max(100, n)) : 400;
}
function sf(e) {
	let t = String(e ?? "normal").trim().toLowerCase();
	return t.startsWith("italic") ? "italic" : t.startsWith("oblique") ? "oblique" : "normal";
}
function cf(e) {
	let t = String(e ?? "100%").match(/(\d+(?:\.\d+)?)\s*%/);
	return t ? Math.max(50, Math.min(200, parseFloat(t[1]))) : 100;
}
function lf(e) {
	let t = String(e || "400").trim(), n = t.match(/^(\d{2,3})\s+(\d{2,3})$/);
	if (n) {
		let e = of(n[1]), t = of(n[2]);
		return {
			min: Math.min(e, t),
			max: Math.max(e, t)
		};
	}
	let r = of(t);
	return {
		min: r,
		max: r
	};
}
function uf(e) {
	let t = String(e || "normal").trim().toLowerCase();
	return t === "italic" ? { kind: "italic" } : t.startsWith("oblique") ? { kind: "oblique" } : { kind: "normal" };
}
function df(e) {
	let t = String(e || "100%").trim(), n = t.match(/(\d+(?:\.\d+)?)\s*%\s+(\d+(?:\.\d+)?)\s*%/);
	if (n) {
		let e = parseFloat(n[1]), t = parseFloat(n[2]);
		return {
			min: Math.min(e, t),
			max: Math.max(e, t)
		};
	}
	let r = t.match(/(\d+(?:\.\d+)?)\s*%/), i = r ? parseFloat(r[1]) : 100;
	return {
		min: i,
		max: i
	};
}
function ff(e) {
	return !e || typeof e != "string" ? "" : e.replace(/\s+(variable|vf|v[0-9]+)$/i, "").trim().toLowerCase().replace(/\s+/g, "-");
}
function pf(e, t, n = []) {
	if (!e) return !1;
	try {
		let r = new URL(e, location.href);
		if (r.origin === location.origin) return !0;
		let i = r.host.toLowerCase(), a = [
			"fonts.googleapis.com",
			"fonts.gstatic.com",
			"use.typekit.net",
			"p.typekit.net",
			"kit.fontawesome.com",
			"use.fontawesome.com",
			"cdn.jsdelivr.net",
			"unpkg.com",
			"cdnjs.cloudflare.com",
			"esm.sh"
		], o = i === "fonts.googleapis.com" ? r.searchParams.getAll("family").flatMap((e) => e.split("|")) : [];
		if (o.length) {
			let e = new Set(t);
			return o.some((t) => e.has(t.split(":")[0].trim().toLowerCase()));
		}
		if (a.some((e) => i.endsWith(e)) || n.some((e) => i === e.toLowerCase() || i.endsWith("." + e.toLowerCase()))) return !0;
		let s = (r.pathname + r.search).toLowerCase();
		if (/\bfont(s)?\b/.test(s) || /\.woff2?(\b|$)/.test(s) || nf.some((e) => s.includes(e))) return !0;
		for (let e of t) {
			let t = e.toLowerCase().replace(/\s+/g, "+"), n = e.toLowerCase().replace(/\s+/g, "-"), r = ff(e);
			if (s.includes(t) || s.includes(n) || r && s.includes(r)) return !0;
		}
		return !1;
	} catch {
		return !1;
	}
}
var mf = "";
function hf(e) {
	return String(e).split(mf)[0];
}
function gf(e) {
	let t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
	try {
		for (let r of e.fonts) {
			let e = String(r.family).replace(/["']/g, "").toLowerCase();
			t.add(e), (r.status === "loading" || r.status === "loaded") && n.add(e);
		}
	} catch {}
	return {
		declared: t,
		drawn: n
	};
}
function _f(e, t) {
	try {
		return new URL(e, t || location.href).href;
	} catch {
		return e;
	}
}
function vf(e, t) {
	return e && e.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (e, n, r) => {
		let i = (r || "").trim();
		return !i || /^data:|^blob:|^https?:|^file:|^about:/i.test(i) ? e : `url("${_f(i, t)}")`;
	});
}
var yf = /@import\s+(?:url\(\s*(['"]?)([^)"']+)\1\s*\)|(['"])([^"']+)\3)([^;]*);/g, bf = 4;
async function xf(e, t, n, r) {
	if (!e) return e;
	let i = /* @__PURE__ */ new Set();
	async function a(e, t, o = 0) {
		if (o > bf) return K({ debug: r }, `Too many nested @import rules in ${t}; stopped at ${bf} levels.`), e;
		let s = "", c = 0, l, u = new RegExp(yf.source, "g");
		for (; l = u.exec(e);) {
			s += e.slice(c, l.index), c = u.lastIndex;
			let d = _f((l[2] || l[4] || "").trim(), t);
			if (i.has(d)) {
				K({ debug: r }, `Skipped an @import that loops back: ${d}`);
				continue;
			}
			i.add(d);
			let f = "";
			try {
				let e = await L(d, {
					as: "text",
					useProxy: n
				});
				e.ok && typeof e.data == "string" && (f = e.data);
			} catch {}
			f ? (f = vf(f, d), f = await a(f, d, o + 1), s += `
/* inlined: ${d} */
${f}
`) : s += l[0];
		}
		return s += e.slice(c), s;
	}
	let o = vf(e, t || location.href);
	return o = await a(o, t || location.href, 0), o;
}
var Sf = /url\((["']?)([^"')]+)\1\)/g, Cf = /@font-face[^{}]*\{[^}]*\}/g;
function wf(e, t, n = "") {
	return (e.match(RegExp(`${t}\\s*:\\s*([^;}]+)[;}]`, "i"))?.[1] || n).trim();
}
function Tf(e) {
	let t = [];
	for (let n of (e || "").split(",")) {
		let e = n.trim().match(/^U\+([0-9A-Fa-f?]+)(?:-([0-9A-Fa-f?]+))?$/);
		if (!e) continue;
		let r = parseInt(e[1].replace(/\?/g, "0"), 16), i = parseInt((e[2] || e[1]).replace(/\?/g, "F"), 16);
		t.push([Math.min(r, i), Math.max(r, i)]);
	}
	return t;
}
function Ef(e, t) {
	if (!t.length || !e || e.size === 0) return !0;
	for (let n of e) for (let [e, r] of t) if (n >= e && n <= r) return !0;
	return !1;
}
function Df(e, t) {
	let n = [];
	if (!e) return n;
	for (let r of e.matchAll(Sf)) {
		let e = (r[2] || "").trim();
		!e || e.startsWith("data:") || (/^https?:/i.test(e) || (e = _f(e, t)), n.push(e));
	}
	return n;
}
async function Of(e, t, n) {
	if (o.resource?.has(e)) return o.resource.get(e);
	try {
		let n = await L(e, {
			as: "dataURL",
			useProxy: t
		});
		if (n.ok && typeof n.data == "string") return o.resource?.set(e, n.data), n.data;
	} catch {
		K({ debug: n }, "Couldn't load font file:", e);
	}
	return null;
}
async function kf(e, t, n = "", r = !1) {
	let i = e;
	for (let a of e.matchAll(Sf)) {
		let e = c(a[0]);
		if (!e) continue;
		let o = await Of(e.startsWith("http") || e.startsWith("data:") ? e : _f(e, t), n, r);
		o != null && (i = i.replace(a[0], `url(${o})`));
	}
	return i;
}
function Af(e) {
	let t = (t, n) => e.some(([e, r]) => !(r < t || e > n)), n = t(0, 255) || t(305, 305), r = t(256, 591) || t(7680, 7935), i = t(880, 1023), a = t(1024, 1279);
	return t(7840, 7929) || t(258, 259) || t(416, 417) || t(431, 432) ? "vietnamese" : a ? "cyrillic" : i ? "greek" : r ? "latin-ext" : n ? "latin" : null;
}
function jf(e = {}) {
	let t = new Set((e.families || []).map((e) => String(e).toLowerCase())), n = new Set((e.domains || []).map((e) => String(e).toLowerCase())), r = new Set((e.subsets || []).map((e) => String(e).toLowerCase()));
	return (e, i) => {
		if (t.size && t.has(e.family.toLowerCase())) return !0;
		if (n.size) for (let t of e.srcUrls) try {
			if (n.has(new URL(t).host.toLowerCase())) return !0;
		} catch {}
		if (r.size) {
			let e = Af(i);
			if (e && r.has(e)) return !0;
		}
		return !1;
	};
}
function Mf(e) {
	let t = /* @__PURE__ */ new Set(), n = [];
	for (let r of e.match(Cf) || []) {
		let e = af(wf(r, "font-family"))[0], i = wf(r, "font-weight", "400"), a = wf(r, "font-style", "normal"), o = wf(r, "font-stretch", "100%"), s = wf(r, "unicode-range"), c = wf(r, "src"), l = Df(c, location.href), u = l.length ? l.map((e) => String(e).toLowerCase()).sort().join("|") : c.toLowerCase(), d = [
			String(e || "").toLowerCase(),
			i,
			a,
			o,
			s.toLowerCase(),
			u
		].join("|");
		t.has(d) || (t.add(d), n.push(r));
	}
	let r = 0;
	return e.replace(Cf, () => n[r++] || "");
}
var Nf = /* @__PURE__ */ new WeakMap(), Pf = 0;
function Ff(e) {
	let t = Nf.get(e);
	return t === void 0 && Nf.set(e, t = Pf++), t;
}
function If(e, t, n, r, i, a, o, s, c) {
	let l = Array.from(e || []).sort().join("|"), u = 0, d = 0;
	for (let e of o || []) {
		let t = Math.imul(e, 0x9e3779b1);
		t ^= t >>> 15, t = Math.imul(t, 0x85ebca6b), t ^= t >>> 13, u = u + t | 0, d++;
	}
	let f = t ? JSON.stringify({
		families: (t.families || []).map((e) => String(e).toLowerCase()).sort(),
		domains: (t.domains || []).map((e) => String(e).toLowerCase()).sort(),
		subsets: (t.subsets || []).map((e) => String(e).toLowerCase()).sort()
	}) : "", p = (n || []).map((e) => `${(e.family || "").toLowerCase()}::${e.weight || "normal"}::${e.style || "normal"}::${e.stretchPct ?? 100}::${e.src || ""}`).sort().join("|"), m = r || "", h = (i || []).map((e) => String(e).toLowerCase()).sort().join("|"), g = Ff(a || document), _ = (s || []).map((e) => String(e)).sort().join("|");
	return `fonts-embed-css::req=${l}::ex=${f}::lf=${p}::px=${m}::fd=${h}::doc=${g}::cp=${u}::n=${d}::ic=${_}::env=${c}`;
}
async function Lf({ required: e, usedCodepoints: t, exclude: n = void 0, localFonts: r = [], useProxy: i = "", fontStylesheetDomains: a = [], iconMatchers: s = [], doc: c = document, debug: l = !1 } = {}) {
	e instanceof Set || (e = /* @__PURE__ */ new Set()), t instanceof Set || (t = /* @__PURE__ */ new Set());
	let u = /* @__PURE__ */ new Map();
	for (let t of e) {
		let [e, n, r, i] = String(t).split(mf);
		if (!e) continue;
		let a = e.toLowerCase(), o = u.get(a) || [];
		o.push({
			w: parseInt(n, 10),
			s: r,
			st: parseInt(i, 10)
		}), u.set(a, o);
	}
	function d(e, t, n, r) {
		let i = String(e).toLowerCase();
		if (!u.has(i)) return null;
		let a = u.get(i), o = lf(n), s = uf(t), c = df(r), l = o.min !== o.max, d = o.min, f = (e) => s.kind === "normal" && e === "normal" || s.kind !== "normal" && (e === "italic" || e === "oblique"), p = a.filter((e) => (l ? e.w >= o.min && e.w <= o.max : e.w === d) && f(sf(e.s)) && e.st >= c.min && e.st <= c.max);
		if (p.length) return {
			exact: p,
			near: []
		};
		if (!l) {
			let e = a.filter((e) => Math.abs(d - e.w) <= 300 && f(sf(e.s)) && e.st >= c.min && e.st <= c.max);
			if (e.length) return {
				exact: p,
				near: e
			};
		}
		return !l && s.kind === "normal" && a.some((e) => Math.abs(d - e.w) <= 300 && e.st >= c.min && e.st <= c.max) ? {
			exact: p,
			near: []
		} : null;
	}
	let f = jf(n);
	gn(c), In();
	let p = If(e, n, r, i, a, c, t, s, gn(c));
	if (o.resource?.has(p)) return o.resource.get(p);
	let m = [];
	for (let e of c.querySelectorAll("style")) {
		let t = e.textContent || "";
		for (let e of t.matchAll(yf)) {
			let t = (e[2] || e[4] || "").trim();
			t && !Vl(t, s) && (c.querySelector(`link[rel="stylesheet"][href="${t}"]`) || m.push(t));
		}
	}
	let h = [];
	m.length && await Promise.all(m.map((e) => new Promise((t) => {
		if (c.querySelector(`link[rel="stylesheet"][href="${e}"]`)) return t(null);
		let n = c.createElement("link");
		n.rel = "stylesheet", n.href = e, B(n), n.setAttribute("data-snapdom", "injected-import");
		let r = setTimeout(() => t(null), 3e3), i = (e) => {
			clearTimeout(r), t(e);
		};
		n.onload = () => i(n), n.onerror = () => i(null), c.head.appendChild(n), h.push(n);
	})));
	let g = "", _ = /* @__PURE__ */ new Set(), v = [], y = [], b = /* @__PURE__ */ new Map(), x = (e, t) => t.some(([t, n]) => e >= t && e <= n), S = (e, n) => {
		if (n.length) for (let r of e) {
			let e = b.get(r) || /* @__PURE__ */ new Set();
			for (let r of t) x(r, n) && e.add(r);
			b.set(r, e);
		}
	}, C = Array.from(c.querySelectorAll("link[rel=\"stylesheet\"]")).filter((e) => !!e.href);
	for (let e of h) try {
		e.remove();
	} catch {}
	for (let e of C) try {
		if (Vl(e.href, s)) continue;
		let r = "", o = !1;
		try {
			o = new URL(e.href, location.href).origin === location.origin;
		} catch {}
		if (!o) {
			let t = Array.isArray(a) ? a : [];
			if (!pf(e.href, u.keys(), t)) continue;
		}
		if (o) {
			let t = Array.from(c.styleSheets).find((t) => t.href === e.href);
			if (t) try {
				let e = t.cssRules || [];
				r = Array.from(e).map((e) => e.cssText).join("");
			} catch {}
		}
		if (!r) {
			let t = await L(e.href, {
				as: "text",
				useProxy: i,
				debug: l
			});
			t?.ok && typeof t.data == "string" && (r = t.data);
		}
		r = await xf(r, e.href, i, l);
		let p = "";
		for (let a of r.match(Cf) || []) {
			let r = af(wf(a, "font-family"))[0];
			if (!r || Bl(r, s)) continue;
			let o = wf(a, "font-weight", "400"), c = wf(a, "font-style", "normal"), m = wf(a, "font-stretch", "100%"), h = wf(a, "unicode-range"), g = wf(a, "src"), b = Df(g, e.href), x = d(r, c, o, m);
			if (!x && !u.has(r.toLowerCase())) continue;
			let C = Tf(h);
			if (!Ef(t, C)) continue;
			let w = {
				family: r,
				weightSpec: o,
				styleSpec: c,
				stretchSpec: m,
				unicodeRange: h,
				srcRaw: g,
				srcUrls: b,
				href: e.href
			};
			if (n && f(w, C)) continue;
			let T = {
				family: r.toLowerCase(),
				block: a,
				srcRaw: g,
				baseHref: e.href
			};
			if (!x) {
				v.push(T);
				continue;
			}
			if (x.near.length) {
				y.push({
					...T,
					near: x.near,
					ranges: C
				});
				continue;
			}
			S(x.exact, C), _.add(r.toLowerCase());
			let E = /url\(/i.test(g) ? await kf(a, e.href, i, l) : a;
			p += E;
		}
		p.trim() && (g += p);
	} catch {
		K({ debug: l }, "Couldn't read stylesheet:", e.href);
	}
	let w = /* @__PURE__ */ new Set();
	async function T(e, r, a = 0) {
		let o = c?.defaultView || window;
		if (e.disabled || e.media?.mediaText && !o.matchMedia(e.media.mediaText).matches) return;
		let p;
		try {
			p = e.cssRules || [];
		} catch {
			return;
		}
		for (let e of p) if (e.type === CSSRule.IMPORT_RULE && e.styleSheet) {
			let t = e.href ? _f(e.href, r) : r;
			if (a >= bf) {
				K({ debug: l }, `Too many nested @import rules in ${t}; stopped at ${bf} levels.`);
				continue;
			}
			if (t && w.has(t)) {
				K({ debug: l }, `Skipped an @import that loops back: ${t}`);
				continue;
			}
			t && w.add(t), await T(e.styleSheet, t, a + 1);
		} else if (e.cssRules?.length) {
			if (e.type === CSSRule.MEDIA_RULE && !o.matchMedia(e.conditionText).matches || e.type === CSSRule.SUPPORTS_RULE && !o.CSS.supports(e.conditionText)) continue;
			await T(e, r, a);
		} else if (e.type === CSSRule.FONT_FACE_RULE) {
			let a = af((e.style.getPropertyValue("font-family") || "").trim())[0];
			if (!a || Bl(a, s)) continue;
			let o = (e.style.getPropertyValue("font-weight") || "").trim(), c = (e.style.getPropertyValue("font-style") || "").trim(), p = (e.style.getPropertyValue("font-stretch") || "").trim(), m = (e.style.getPropertyValue("font-variation-settings") || "").trim(), h = (e.style.getPropertyValue("src") || "").trim(), b = (e.style.getPropertyValue("unicode-range") || "").trim(), x = o || "400", C = c || "normal", w = p || "100%", T = (c ? `font-style:${c};` : "") + (o ? `font-weight:${o};` : "") + (p ? `font-stretch:${p};` : "") + (m ? `font-variation-settings:${m};` : "") + (b ? `unicode-range:${b};` : "") + rf.map((t) => {
				let n = e.style.getPropertyValue(t);
				return n ? `${t}:${n};` : "";
			}).join(""), E = d(a, C, x, w);
			if (!E && !u.has(a.toLowerCase())) continue;
			let D = Tf(b);
			if (!Ef(t, D)) continue;
			let O = {
				family: a,
				weightSpec: x,
				styleSpec: C,
				stretchSpec: w,
				unicodeRange: b,
				srcRaw: h,
				srcUrls: Df(h, r || location.href),
				href: r || location.href
			};
			if (n && f(O, D)) continue;
			let k = `"${String(a).replace(/^\s*["']|["']\s*$/g, "").replace(/(["\\])/g, "\\$1")}"`;
			if (!E) {
				v.push({
					family: a.toLowerCase(),
					block: `@font-face{font-family:${k};src:${h};${T}}`,
					srcRaw: h,
					baseHref: r || location.href
				});
				continue;
			}
			if (E.near.length) {
				y.push({
					family: a.toLowerCase(),
					block: `@font-face{font-family:${k};src:${h};${T}}`,
					srcRaw: h,
					baseHref: r || location.href,
					near: E.near,
					ranges: D
				});
				continue;
			}
			if (S(E.exact, D), _.add(a.toLowerCase()), /url\(/i.test(h)) {
				let e = await kf(h, r || location.href, i, l);
				g += `@font-face{font-family:${k};src:${e};${T}}`;
			} else g += `@font-face{font-family:${k};src:${h};${T}}`;
		}
	}
	let E = /* @__PURE__ */ new Set([...c.styleSheets, ...c.adoptedStyleSheets || []]);
	for (let e of E) if (!(e.href && C.some((t) => t.href === e.href))) try {
		let t = e.href || c.baseURI || location.origin + "/";
		t && w.add(t), await T(e, t);
	} catch {}
	for (let e of y) e.near.some((n) => {
		let r = b.get(n);
		if (!r || !t.size) return !0;
		for (let n of t) if (!r.has(n) && (!e.ranges.length || x(n, e.ranges))) return !0;
		return !1;
	}) && (_.add(e.family), g += /url\(/i.test(e.srcRaw) ? await kf(e.block, e.baseHref, i, l) : e.block);
	for (let e of v) _.has(e.family) || (g += /url\(/i.test(e.srcRaw) ? await kf(e.block, e.baseHref, i, l) : e.block);
	try {
		for (let e of c.fonts || []) {
			if (!e || !e.family || e.status !== "loaded" || !e._snapdomSrc) continue;
			let t = String(e.family).replace(/^['"]+|['"]+$/g, "");
			if (Bl(t, s) || !u.has(t.toLowerCase()) || n?.families && n.families.some((e) => String(e).toLowerCase() === t.toLowerCase())) continue;
			let r = String(e._snapdomSrc).startsWith("data:") ? e._snapdomSrc : await Of(e._snapdomSrc, i, l);
			r != null && (g += `@font-face{font-family:'${t}';src:url(${r});font-style:${e.style || "normal"};font-weight:${e.weight || "normal"};}`);
		}
	} catch {}
	for (let e of r) {
		if (!e || typeof e != "object") continue;
		let t = String(e.family || "").replace(/^['"]+|['"]+$/g, "");
		if (!t || Bl(t, s) || !u.has(t.toLowerCase()) || n?.families && n.families.some((e) => String(e).toLowerCase() === t.toLowerCase())) continue;
		let r = e.weight == null ? "normal" : String(e.weight), a = e.style == null ? "normal" : String(e.style), o = e.stretchPct == null ? "100%" : `${e.stretchPct}%`, c = String(e.src || ""), d = c.startsWith("data:") ? c : await Of(c, i, l);
		d != null && (g += `@font-face{font-family:'${t}';src:url(${d});font-style:${a};font-weight:${r};font-stretch:${o};}`);
	}
	return g && (g = Mf(g), o.resource?.set(p, g)), g;
}
function Rf(e, t) {
	let n = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
	if (!e) return {
		required: n,
		usedCodepoints: r
	};
	let i = (e) => {
		if (e) for (let t of e) r.add(t.codePointAt(0));
	}, a = /* @__PURE__ */ new Set(), o = (e) => {
		let t = e.fontFamily, r = e.fontWeight, i = e.fontStyle, o = e.fontStretch, s = t + mf + r + mf + i + mf + o;
		if (a.has(s)) return;
		a.add(s);
		let c = af(t);
		if (!c.length) return;
		let l = mf + of(r) + mf + sf(i) + mf + cf(o);
		for (let e of c) n.add(e + l);
	}, s = so(e), c = e.getRootNode(), l = (e) => {
		o(H(e));
		let t = e.getRootNode() === c ? s : so(e);
		for (let n of ["::before", "::after"]) {
			let a = n === "::before" ? t.before : t.after;
			if (a !== null) {
				if (a === "") continue;
				try {
					if (!e.matches(a)) continue;
				} catch {}
			}
			let s = H(e, n), c = s && s.content;
			if (c && c !== "none" && c !== "normal") {
				if (o(s), /^["']/.test(c)) i(c.slice(1, -1));
				else for (let e of c.match(/\\[0-9A-Fa-f]{1,6}/g) || []) r.add(parseInt(e.slice(1), 16));
			}
		}
	}, u = [e];
	for (let n = 0; n < u.length; n++) {
		let r = u[n];
		r.nodeType === Node.ELEMENT_NODE && l(r), r.shadowRoot && u.push(r.shadowRoot);
		let a = (e.ownerDocument || document).createTreeWalker(r, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
		for (; a.nextNode();) {
			let e = a.currentNode;
			if (e.nodeType === Node.TEXT_NODE) {
				if (t && e.parentElement && !t(e.parentElement)) continue;
				i(e.nodeValue || "");
			} else {
				if (t && !t(e)) continue;
				l(e), e.shadowRoot && u.push(e.shadowRoot);
			}
		}
	}
	return {
		required: n,
		usedCodepoints: r
	};
}
async function zf(e, t, n = document) {
	try {
		await Jt(n);
	} catch {}
	if (!e.size) return;
	let r = Array.from(t, (e) => e <= 1114111 ? String.fromCodePoint(e) : "").join(""), i = n.createElement("div");
	B(i), i.style.cssText = "position:absolute!important;left:-9999px!important;top:0!important;opacity:0!important;pointer-events:none!important;contain:layout size style;";
	for (let t of e) {
		let [e, a, o, s] = t.split(mf), c = n.createElement("span");
		c.textContent = r, c.style.fontFamily = `"${e}"`, c.style.fontWeight = a, c.style.fontStyle = o, c.style.fontStretch = `${s}%`, c.style.fontSize = "32px", c.style.lineHeight = "1", c.style.whiteSpace = "nowrap", c.style.margin = "0", c.style.padding = "0", i.appendChild(c);
	}
	n.body.appendChild(i), i.offsetWidth, n.body.removeChild(i), await qt(), await qt();
}
s(), cn(), G(), V();
var Bf = () => {};
function Vf(e, t) {
	if (!e) return Bf;
	let n = [];
	function r(e) {
		if (t) {
			let n = e.getBoundingClientRect();
			if (n.width > 0 || n.height > 0) {
				let r = Math.max(n.right, n.left + (e.scrollWidth || 0)), i = Math.max(n.bottom, n.top + (e.scrollHeight || 0));
				if (r < t.left - 200 || n.left > t.right + 200 || i < t.top - 200 || n.top > t.bottom + 200) return;
			}
		}
		if (e.firstElementChild === null && e.firstChild !== null) {
			let t = getComputedStyle(e), r = Hf(e, t);
			r !== Bf && n.push(r);
			let i = Uf(e, t);
			i !== Bf && n.push(i);
		}
		for (let t = e.firstElementChild; t; t = t.nextElementSibling) r(t);
	}
	return r(e), () => n.forEach((e) => e());
}
function Hf(e, t) {
	if (!e) return Bf;
	t ||= getComputedStyle(e);
	let n = Zf(t);
	if (n <= 0 || !ep(e)) return Bf;
	let r = Gf(e), i = r.text, a = $f(t);
	r.write("X");
	let o = e.scrollHeight - a;
	r.restore();
	let s = o > 0 ? o : Qf(t), c = Math.round(s * n + a), l = .5 * (n + 1);
	if (e.scrollHeight <= c + l) return Bf;
	let u = 0, d = i.length, f = -1;
	for (; u <= d;) {
		let t = u + d >> 1;
		r.write(i.slice(0, Kf(i, t)) + "…"), e.scrollHeight <= c + l ? (f = t, u = t + 1) : d = t - 1;
	}
	let p = (f >= 0 ? i.slice(0, Kf(i, f)) : "") + "…";
	return r.write(p), Wf(e, p, r);
}
function Uf(e, t) {
	if (!e || (t ||= getComputedStyle(e), t.textOverflow !== "ellipsis") || t.whiteSpace !== "nowrap" && t.whiteSpace !== "pre" || t.overflowX !== "hidden" && t.overflowX !== "clip" || !ep(e) || e.scrollWidth <= e.clientWidth + .5) return Bf;
	let n = Gf(e), r = n.text, i = Xf(e, t, n.nodes), a = (e) => {
		if (!i) {
			let t = Kf(r, e);
			return r.slice(0, t) + Yf(r, t) + "…";
		}
		let t = qf(r, r.length - e);
		return Yf(r, t) + r.slice(t) + "…";
	}, o = 0, s = r.length, c = -1;
	for (; o <= s;) {
		let t = o + s >> 1;
		n.write(a(t)), e.scrollWidth <= e.clientWidth + .5 ? (c = t, o = t + 1) : s = t - 1;
	}
	let l = c >= 0 ? a(c) : "…";
	return n.write(l), Wf(e, l, n);
}
function Wf(e, t, n) {
	return () => {
		e.textContent === t && n.restore();
	};
}
function Gf(e) {
	let t = [];
	for (let n = e.firstChild; n; n = n.nextSibling) n.nodeType === Node.TEXT_NODE && t.push(n);
	let n = t.map((e) => e.data);
	return {
		nodes: t,
		text: n.join(""),
		write(e) {
			t[0].data = e;
			for (let e = 1; e < t.length; e++) t[e].data = "";
			for (let e = 0; e < t.length; e++) Ge(t[e], n[e], t[e].data);
		},
		restore() {
			for (let e = 0; e < t.length; e++) t[e].data = n[e];
		}
	};
}
function Kf(e, t) {
	if (t <= 0 || t >= e.length) return t;
	let n = e.charCodeAt(t - 1);
	return n >= 55296 && n <= 56319 ? t - 1 : t;
}
function qf(e, t) {
	if (t <= 0 || t >= e.length) return t;
	let n = e.charCodeAt(t);
	return n >= 56320 && n <= 57343 ? t - 1 : t;
}
var Jf = /[\u0600-\u08FF\u1800-\u18AF\uFB50-\uFDFF\uFE70-\uFEFF]/;
function Yf(e, t) {
	return t > 0 && t < e.length && Jf.test(e[t - 1]) && Jf.test(e[t]) && !U() ? "‍" : "";
}
function Xf(e, t, n) {
	let r = null, i = null;
	for (let e of n) {
		let t = e.data.search(/\S/);
		t < 0 || (r ||= [e, t], i = [e, e.data.length - e.data.trimEnd().length]);
	}
	if (!r) return !1;
	let a = e.ownerDocument.createRange(), o = (e, t, n) => (a.setStart(e, t), a.setEnd(e, n), a.getBoundingClientRect()), [s, c] = r, [l, u] = i, d = l.data.length - u, f = o(s, c, Math.min(s.data.length, c + 1)), p = o(l, Math.max(0, d - 1), d), m = e.getBoundingClientRect();
	if (t.direction === "rtl") {
		let e = m.right - (parseFloat(t.borderRightWidth) || 0) - (parseFloat(t.paddingRight) || 0);
		return Math.abs(p.right - e) < Math.abs(f.right - e);
	}
	let h = m.left + (parseFloat(t.borderLeftWidth) || 0) + (parseFloat(t.paddingLeft) || 0);
	return Math.abs(p.left - h) < Math.abs(f.left - h);
}
function Zf(e) {
	let t = e.getPropertyValue("-webkit-line-clamp") || e.getPropertyValue("line-clamp");
	t = (t || "").trim();
	let n = parseInt(t, 10);
	return Number.isFinite(n) && n > 0 ? n : 0;
}
function Qf(e) {
	let t = (e.lineHeight || "").trim(), n = parseFloat(e.fontSize) || 16;
	return !t || t === "normal" ? Math.round(n * 1.2) : t.endsWith("px") ? parseFloat(t) : /^\d+(\.\d+)?$/.test(t) ? Math.round(parseFloat(t) * n) : t.endsWith("%") ? Math.round(parseFloat(t) / 100 * n) : Math.round(n * 1.2);
}
function $f(e) {
	return (parseFloat(e.paddingTop) || 0) + (parseFloat(e.paddingBottom) || 0);
}
function ep(e) {
	return e.childElementCount > 0 ? !1 : Array.from(e.childNodes).some((e) => e.nodeType === Node.TEXT_NODE);
}
var tp = ["clone", "render"], np = {
	clone: 0,
	render: 1
}, rp = "render";
function ip(e) {
	let t = Array.isArray(e && e.plugins) ? e.plugins : [];
	if (!t.length) return {
		stage: rp,
		loweredBy: []
	};
	let n = -1, r = [];
	for (let e of t) {
		if (!e || typeof e != "object") continue;
		let t = e.needs === void 0 ? rp : e.needs;
		if (!Object.prototype.hasOwnProperty.call(np, t)) throw Error(`[SnapDOM] Plugin '${e.name || "(unnamed)"}' declares needs: ${JSON.stringify(t)}, expected one of ${tp.join(", ")}.`);
		r.push({
			name: e.name || "(unnamed)",
			needs: t
		}), n = Math.max(n, np[t]);
	}
	if (n < 0) return {
		stage: rp,
		loweredBy: []
	};
	let i = tp[n];
	return {
		loweredBy: i === "render" ? [] : r.filter((e) => e.needs === i).map((e) => e.name),
		stage: i
	};
}
function ap(e, t) {
	return np[e] >= np[t];
}
function op(e, t, n = tp) {
	let r = n[n.length - 1];
	if (t == null) return r;
	if (!Object.prototype.hasOwnProperty.call(np, t)) throw Error(`[SnapDOM] ${e}: needs must be one of ${tp.join(", ")}, got ${JSON.stringify(t)}.`);
	if (!n.includes(t)) throw Error(`[SnapDOM] ${e} cannot run at stage '${t}'; it supports ${n.join(", ")}.`);
	return t;
}
function sp(e, t, n) {
	let r = t.length ? t.map((e) => `'${e}'`).join(", ") : "the attached plugins";
	return /* @__PURE__ */ Error(`[SnapDOM] No ${n}: this capture stopped at '${e}' because ${r} asked for needs: '${e}'. It is not re-captured, since that would be a different instant. Ask the plugin for needs: 'render', or capture without it.`);
}
var cp = [];
function lp(e) {
	if (!e) return null;
	if (Array.isArray(e)) {
		let [t, n] = e;
		return typeof t == "function" ? t(n) : t;
	}
	if (typeof e == "object" && "plugin" in e) {
		let { plugin: t, options: n } = e;
		return typeof t == "function" ? t(n) : t;
	}
	return typeof e == "function" ? e() : e;
}
function up(...e) {
	let t = e.flat();
	for (let e of t) {
		let t = lp(e);
		if (t) {
			if (t.needs !== void 0 && t.needs !== "render") throw Error(`[SnapDOM] '${t.name || "(unnamed)"}' declares needs: ${JSON.stringify(t.needs)}, so it can't be a global plugin (it would stop every capture before '${rp}'). Pass it per capture: snapdom(el, { plugins: [...] }).`);
			cp.some((e) => e && e.name && t.name && e.name === t.name) || cp.push(t);
		}
	}
}
function dp(e) {
	return e && Array.isArray(e.plugins) ? e.plugins : cp;
}
async function fp(e, t, n) {
	let r = n, i = dp(t);
	for (let n of i) {
		let i = n && typeof n[e] == "function" ? n[e] : null;
		if (!i) continue;
		let a = await i(t, r);
		typeof a < "u" && (r = a);
	}
	return r;
}
async function pp(e, t, n) {
	let r = [], i = dp(t);
	for (let a of i) {
		let i = a && typeof a[e] == "function" ? a[e] : null;
		if (!i) continue;
		let o = await i(t, n);
		typeof o < "u" && r.push(o);
	}
	return r;
}
function mp() {
	cp.length = 0;
}
var hp = 0;
function gp(e) {
	let t = [];
	if (Array.isArray(e)) for (let n of e) {
		let e = lp(n);
		if (!e) continue;
		e.name ||= `anonymous-${++hp}`;
		let r = t.findIndex((t) => t && t.name === e.name);
		r >= 0 && t.splice(r, 1), t.push(e);
	}
	for (let e of cp) e && e.name && !t.some((t) => t.name === e.name) && t.push(e);
	return Object.freeze(t);
}
function _p(e, t, n = !1) {
	return !e || e.plugins && !n || (e.plugins = gp(t)), e;
}
function vp() {
	return cp.slice();
}
var yp = [
	"resolveNode",
	"beforeSnap",
	"beforeClone",
	"afterClone",
	"beforeRender",
	"afterRender"
];
function bp(e) {
	let t = Array.isArray(e && e.plugins) ? e.plugins : [];
	for (let e of t) {
		let t = lp(e);
		if (t && t.pure !== !0) {
			for (let e of yp) if (typeof t[e] == "function") return !0;
		}
	}
	return !1;
}
ir(), V(), J(), G(), s(), cn(), V(), J(), G(), V();
var xp = "http://www.w3.org/1999/xhtml", Sp = `all:unset;${Eo}:nowrap;word-break:normal;line-break:auto`, Cp = [
	[Eo, "nowrap"],
	["word-break", "normal"],
	["line-break", "auto"]
], wp = "⁠", Tp = /[\w\u00C0-\u024F]/, Ep = /* @__PURE__ */ new Set([
	"inline",
	"contents",
	"ruby",
	"ruby-base",
	"ruby-base-container"
]), Dp = /* @__PURE__ */ new Set([
	"img",
	"picture",
	"video",
	"audio",
	"canvas",
	"iframe",
	"object",
	"embed",
	"input",
	"textarea",
	"select",
	"script",
	"style",
	"template",
	"noscript",
	"title"
]), Op = /* @__PURE__ */ new Set([
	"script",
	"style",
	"template",
	"noscript",
	"title"
]), kp = Object.freeze([]), Ap = /^[ \t\n\r\f!-~\u00A0-\u00AC\u00AE-\u024F\u0370-\u03FF\u0400-\u04FF\u1E00-\u1EFF\u2010-\u2027\u2030-\u205E\u20A0-\u20CF\u2100-\u22FF\u25A0-\u25FC\u2713-\u2717]*$/, jp = /[0-9A-Za-z_'\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u1E00-\u1EFF\u2019]/, Mp = /[-/,.:;!?)\]}%\u2010\u2013\u201D]/, Np = /* @__PURE__ */ new Set([
	"none",
	"uppercase",
	"lowercase",
	"capitalize"
]), Pp = /* @__PURE__ */ new Set([
	"block",
	"inline-block",
	"list-item",
	"flow-root",
	"table-caption"
]), Fp = /* @__PURE__ */ new Set([
	"button",
	"fieldset",
	"legend",
	"details",
	"summary",
	"marquee"
]), Ip = {
	start: 0,
	left: 0,
	"-webkit-left": 0,
	"-moz-left": 0,
	center: 1,
	"-webkit-center": 1,
	"-moz-center": 1,
	end: 2,
	right: 2,
	"-webkit-right": 2,
	"-moz-right": 2
}, Lp = { forced: !0 }, Rp = 6, zp = .25;
function Z(e) {
	return e === 32 || e === 9 || e === 10 || e === 12 || e === 13 || e === 5760 || e >= 8192 && e <= 8202 && e !== 8199 || e === 8287 || e === 12288;
}
function Bp(e, t) {
	let n = e.node.data;
	return Z(n.charCodeAt(t ? 0 : n.length - 1));
}
function Vp(e, t) {
	return Math.min(e.bottom, t.bottom) - Math.max(e.top, t.top) > Math.min(e.height, t.height) / 2;
}
var Q = (e) => parseFloat(e) || 0;
function Hp(e, t) {
	if (!Oo.test(e) || t.overflowWrap !== "normal" || t.hyphens === "auto") return !0;
	let n = t.wordBreak;
	return n !== "normal" && n !== "keep-all" || t.lineBreak === "anywhere";
}
function Up(e) {
	if (e.loose === void 0) {
		let t = e.node.data, n = 0;
		for (; n < t.length && Z(t.charCodeAt(n));) n++;
		let r = t.length;
		for (; r > n && Z(t.charCodeAt(r - 1));) r--;
		e.loose = Hp(t.slice(n, r), e.cs);
	}
	return e.loose;
}
function Wp(e) {
	let t = e.whiteSpaceCollapse;
	if (!t) {
		let n = e.whiteSpace;
		t = n === "normal" || n === "nowrap" ? "collapse" : "";
	}
	let n = t === "collapse" && e.wordBreak;
	return (n === "normal" || n === "keep-all") && e.overflowWrap === "normal" && e.lineBreak !== "anywhere" && e.hyphens !== "auto" && Np.has(e.textTransform || "none") && e.direction === "ltr";
}
function Gp(e, t) {
	let n = e.data, r = [];
	for (let e = 0; e < n.length; e++) {
		let t = n.charCodeAt(e);
		t >= 56320 && t <= 57343 && e > 0 || Z(t) || r.push(e);
	}
	let i = /* @__PURE__ */ new Map(), a = (a) => {
		let o = i.get(a);
		if (o === void 0) {
			let s = r[a], c = n.charCodeAt(s);
			t.setStart(e, s), t.setEnd(e, Math.min(n.length, s + (c >= 55296 && c <= 56319 ? 2 : 1)));
			let l = t.getClientRects();
			o = null;
			for (let e = l.length - 1; e >= 0 && !o; e--) l[e].width && l[e].height && (o = l[e]);
			i.set(a, o);
		}
		return o;
	}, o = 0;
	for (; o < r.length && !a(o);) o++;
	if (o === r.length) return null;
	let s = r.length - 1;
	for (; s > o && !a(s);) s--;
	let c = [], l = (e, t) => {
		if (Vp(a(e), a(t))) return;
		let n = e + t >> 1, i = n > e ? n : t;
		for (; i < t && !a(i);) i++;
		if (i === t) for (i = n - 1; i > e && !a(i);) i--;
		i <= e ? c.push(r[t]) : (l(e, i), l(i, t));
	};
	return s > o && l(o, s), {
		breaks: c,
		start: a(o),
		end: a(s)
	};
}
function Kp(e, t) {
	if (e.rl) return e.rl;
	t.selectNodeContents(e.live);
	let n = t.getClientRects(), r = [], i = null;
	for (let e = 0; e < n.length; e++) {
		let t = n[e];
		!t.width || !t.height || (i && Vp(i, t) ? (i.left = Math.min(i.left, t.left), i.right = Math.max(i.right, t.right)) : r.push(i = {
			top: t.top,
			bottom: t.bottom,
			height: t.height,
			left: t.left,
			right: t.right
		}));
	}
	return e.rl = r;
}
function qp(e, t, n, r) {
	r.setStart(e, t), r.setEnd(e, n);
	let i = r.getClientRects(), a = null;
	for (let e = i.length - 1; e >= 0; e--) {
		let t = i[e];
		if (t.width && t.height) {
			if (!a) a = {
				top: t.top,
				bottom: t.bottom,
				height: t.height,
				left: t.left,
				right: t.right
			};
			else if (Vp(a, t)) a.left = Math.min(a.left, t.left);
			else return null;
		}
	}
	return a;
}
function Jp(e, t) {
	if (e) {
		for (let n = 0; n < t.length; n++) if (Vp(e, t[n])) return n;
	}
	return -1;
}
function Yp(e, t) {
	for (; t < e.length && !Z(e.charCodeAt(t));) t++;
	return t;
}
function Xp(e, t) {
	let n = Yp(e, t);
	for (let r = t; r < n; r++) if (!jp.test(e[r])) return Mp.test(e[r]) ? r + 1 : Math.max(r, t + 1);
	return n;
}
function Zp(e, t) {
	for (t--; t >= 0 && Z(e.charCodeAt(t));) t--;
	return t;
}
function Qp(e, t) {
	for (; t > 0 && !Z(e.charCodeAt(t - 1));) t--;
	return t;
}
function $p(e, t) {
	return !Z(e.charCodeAt(t)) && Z(e.charCodeAt(t - 1));
}
function em(e, t, n, r) {
	t = Math.min(Math.max(t, n + 1), r - 1);
	for (let i = 0; t - i > n || t + i < r; i++) {
		if (t + i < r && $p(e, t + i)) return t + i;
		if (t - i > n && $p(e, t - i)) return t - i;
	}
	return -1;
}
function tm(e, t) {
	let n = e.rl, r = e.live, i = r.data, a = 0;
	for (; a < i.length && Z(i.charCodeAt(a));) a++;
	let o = i.length;
	for (; o > a && Z(i.charCodeAt(o - 1));) o--;
	let s = 0;
	for (let e of n) s += e.right - e.left;
	let c = [], l = [], u = a, d = 0;
	for (let e = 1; e < n.length; e++) {
		d += n[e - 1].right - n[e - 1].left;
		let f = em(i, a + Math.round((o - a) * d / s), u, o);
		if (f < 0) return null;
		let p = -1, m = -1, h = -1, g = null;
		for (let a = 0;; a++) {
			if (a > Rp) return null;
			if (h < 0 && (g = qp(r, f, Yp(i, f), t), h = Jp(g, n), h === e && g.left - n[e].left < zp)) break;
			if (m < 0 && (p = Zp(i, f), m = Jp(qp(r, p, p + 1, t), n)), m < 0 || h < 0) return null;
			if (m === e - 1 && h === e) break;
			if (h < e) {
				let e = Yp(i, f), t = e;
				for (; t < o && Z(i.charCodeAt(t));) t++;
				if (t >= o) return null;
				p = e - 1, m = h, f = t, h = -1;
			} else if (m >= e) {
				let e = Qp(i, p);
				if (e <= u) return null;
				h = m, g = null, f = e, m = -1;
			} else return null;
		}
		if (!g && (g = qp(r, f, Yp(i, f), t), Jp(g, n) !== e)) return null;
		c.push(f), l.push(g), u = f;
	}
	return {
		breaks: c,
		words: l
	};
}
function nm(e, t) {
	if (e.found === void 0 && (e.found = tm(e, t), !e.found)) {
		let n = Gp(e.live, t);
		e.found = n && {
			breaks: n.breaks,
			words: null
		};
	}
	return e.found;
}
function rm(e, t) {
	if (e.start !== void 0) return e.start !== null;
	if (e.start = e.end = null, e.atom) {
		let t = e.atom.getBoundingClientRect();
		return t.height && (e.start = e.end = t), e.start !== null;
	}
	if (e.simple) {
		let n = Kp(e, t);
		if (!n.length) return !1;
		if (n.length > 1 && e.wraps) {
			let n = nm(e, t);
			if (!n) return !1;
			e.breaks = n.breaks;
		}
		return e.start = n[0], e.end = n[n.length - 1], !0;
	}
	t.selectNodeContents(e.live);
	let n = t.getClientRects(), r = null, i = null, a = 1;
	for (let e = 0; e < n.length; e++) {
		let t = n[e];
		t.height && (r ? a === 1 && !Vp(r, t) && (a = 2) : r = t, i = t);
	}
	if (!r) return !1;
	if (a > 1 && e.wraps) {
		let n = Gp(e.live, t);
		if (!n) return !1;
		e.breaks = n.breaks, e.start = n.start, e.end = n.end;
	} else e.start = r, e.end = i;
	return !0;
}
function im(e, t, n) {
	if (!t || t.nodeType !== 1) return null;
	let r = [];
	for (let e = t.firstChild; e; e = e.nextSibling) e.nodeType === 3 && r.push(e);
	let i = 0;
	for (let t = e.firstChild; t; t = t.nextSibling) if (t.nodeType === 3) {
		if (i === r.length || r[i].data !== t.data) return null;
		i++;
	}
	if (i !== r.length) return null;
	let a = H(t);
	return (a.writingMode || "horizontal-tb") !== "horizontal-tb" || am(t, a, n) === Ao ? null : {
		live: r,
		at: 0,
		cs: a,
		wraps: a.textWrapMode !== "nowrap" && e.style?.getPropertyValue(Eo) !== "nowrap",
		plain: Wp(a)
	};
}
function am(e, t, n) {
	let r = n.get(e);
	if (r !== void 0) return r;
	let i = e.parentElement;
	if (!i || t.display !== "inline") return No(e, n);
	r = No(i, n);
	let a = t.zoom;
	return r === jo && a && a !== "1" && (r = Mo), n.set(e, r), r;
}
function om(e, t = W() ? "gecko" : "blink") {
	if (t === "gecko") {
		let t = 1.1 * (e + 1) / (120 * e), n = 1 / (60 * e) + .01, r = (e) => n + e * t;
		return {
			zoom: e,
			starts: !0,
			optical: !0,
			early: r,
			pull: r
		};
	}
	let n = 1 / (64 * e);
	return {
		zoom: e,
		starts: !1,
		optical: !1,
		early: (e, t) => .05 + t * n,
		pull: null
	};
}
function sm(e, t) {
	let n = t.spaceMemo.get(e);
	if (n !== void 0) return n;
	let r = e.font || `${e.fontStyle} ${e.fontWeight} ${e.fontSize} ${e.fontFamily}`, i = `${r}|${e.wordSpacing}|${e.letterSpacing}`;
	if (n = t.spaceMemo.get(i), n === void 0) {
		n = 0;
		try {
			let i = t.ctx ||= t.doc.createElement("canvas").getContext("2d");
			i.font = "1px serif", i.font = r, i.font !== "1px serif" && (n = i.measureText("x x").width - i.measureText("xx").width + Q(e.wordSpacing) + Q(e.letterSpacing), n = Math.max(0, n - .05));
		} catch {
			n = 0;
		}
		t.spaceMemo.set(i, n);
	}
	return t.spaceMemo.set(e, n), n;
}
function cm(e, t) {
	let n = t.faces.get(e);
	if (n === void 0) {
		let r = e.fontOpticalSizing === "auto" ? e.fontVariationSettings || "" : "opsz";
		n = /opsz/.test(r) ? "" : `${e.fontStyle}|${e.fontWeight}|${e.fontStretch}|${e.fontFamily}|${r}`, t.faces.set(e, n);
	}
	return n;
}
function lm(e, t) {
	let n = t.doc, r = /* @__PURE__ */ new Set(), i = fm(n), a = i === null ? null : dm.get(n);
	i !== null && a?.stamp !== i && dm.set(n, a = {
		stamp: i,
		faces: /* @__PURE__ */ new Map()
	});
	let o = /* @__PURE__ */ new Map();
	for (let n of e) if (!n.why) for (let e of n.items) {
		if (!e.node) continue;
		let n = e.cs, i = cm(n, t);
		if (!i) continue;
		let s = a?.faces.get(i);
		s === void 0 ? o.has(i) || o.set(i, {
			cs: n,
			text: `${um} ${e.node.data.trim().slice(0, 40).trim()}`
		}) : s && r.add(i);
	}
	if (!o.size) return r;
	let s = B(n.createElement("div"));
	s.style.cssText = "all:initial;position:absolute!important;left:-99999px!important;top:0!important;visibility:hidden!important;white-space:nowrap!important;pointer-events:none!important;font-size:16px";
	let c = [];
	for (let [e, { cs: t, text: r }] of o) {
		let i = t.fontVariationSettings && t.fontVariationSettings !== "normal" ? `${t.fontVariationSettings}, ` : "", a = [];
		for (let e of ["\"opsz\" 1", "\"opsz\" 1000"]) {
			let o = n.createElement("span"), c = o.style;
			c.setProperty("font-style", t.fontStyle, "important"), c.setProperty("font-weight", t.fontWeight, "important"), c.setProperty("font-stretch", t.fontStretch, "important"), c.setProperty("font-family", t.fontFamily, "important"), c.setProperty("font-variation-settings", i + e, "important"), o.textContent = r, s.append(o, n.createElement("br")), a.push(o);
		}
		c.push([e, a]);
	}
	(n.body || n.documentElement).appendChild(s);
	try {
		for (let [e, [t, n]] of c) {
			let i = Math.abs(t.getBoundingClientRect().width - n.getBoundingClientRect().width) > .001;
			i && r.add(e), a?.faces.set(e, i);
		}
	} finally {
		s.remove();
	}
	return r;
}
var um = "Hamburgefonstiv 0123456789", dm = /* @__PURE__ */ new WeakMap();
function fm(e) {
	let t = e.fonts;
	if (!t) return "";
	if (t.status !== "loaded") return null;
	let n = 0;
	return t.forEach((e) => {
		e.status === "loaded" && n++;
	}), `${t.size}|${n}`;
}
function pm(e, t) {
	if (e.why) return e.why;
	let n = e.root;
	if (!n) return "root";
	let r = H(n), i = r.display || "";
	if (!Pp.has(i) || Fp.has(n.localName) || nt(n.localName, i)) return "box";
	if ((r.writingMode || "horizontal-tb") !== "horizontal-tb" || r.direction !== "ltr") return "direction";
	let a = Ip[r.textAlign], o = r.textAlignLast;
	if (a === void 0 || o && o !== "auto" && Ip[o] !== a) return "align";
	let s = r.textWrapStyle;
	if (s === "balance" || s === "pretty") return "balance";
	let c = r.columnCount, l = r.columnWidth;
	if (c && c !== "auto" || l && l !== "auto") return "columns";
	if (a && (Q(r.textIndent) || i === "list-item" && r.listStylePosition === "inside")) return "indent";
	if (No(n, t.axes) !== jo) return "scaled";
	for (let n of e.items) if (n.node) {
		if (!n.plain || n.wraps && !n.simple) return "text";
		if (t.optical?.size && t.optical.has(cm(n.cs, t))) return "optical";
	}
	let u = n.getClientRects();
	if (u.length !== 1) return "fragmented";
	let d = u[0], f = Q(r.borderLeftWidth), p = Q(r.borderRightWidth), m = (e) => e === "visible" || e === "clip";
	if ((!m(r.overflowX) || !m(r.overflowY)) && (n.scrollLeft || n.offsetWidth - n.clientWidth - f - p >= 2)) return "scrollbar";
	let h = d.left + f + Q(r.paddingLeft), g = d.right - p - Q(r.paddingRight);
	for (let e of t.floats) {
		if (e === n || e.contains(n)) continue;
		let r = t.floatBoxes.get(e);
		if (!r) {
			let n = e.getBoundingClientRect(), i = H(e);
			t.floatBoxes.set(e, r = {
				top: n.top - Q(i.marginTop),
				bottom: n.bottom + Q(i.marginBottom),
				left: n.left - Q(i.marginLeft),
				right: n.right + Q(i.marginRight)
			});
		}
		if (r.bottom > d.top && r.top < d.bottom && r.right > d.left && r.left < d.right) return "float";
	}
	let _ = t.risk.starts, v = [], y = null, b = [], x = !1, S = null;
	for (let n of e.items) {
		if (n === Lp) {
			x = !0;
			continue;
		}
		if (n.space) {
			b.push(n.space);
			continue;
		}
		let e;
		if (n.atom) {
			let t = n.atom.getBoundingClientRect();
			if (n.start = n.end = t.height ? t : null, !t.width || !t.height) continue;
			e = [{
				top: t.top,
				bottom: t.bottom,
				height: t.height,
				left: t.left - Q(n.cs.marginLeft),
				right: t.right + Q(n.cs.marginRight)
			}];
		} else {
			if (e = Kp(n, t.range), !e.length) continue;
			if (_ && n.wraps && e.length > 1 && !nm(n, t.range)) return "unmeasured";
			Bp(n, !0) && b.push(n.cs);
		}
		S && S.node && Bp(S, !1) && b.push(S.cs);
		for (let t = 0; t < e.length; t++) {
			let r = e[t];
			if (!y || !Vp(y, r)) {
				if (y && r.top < y.top) return "order";
				v.push(y = {
					top: r.top,
					bottom: r.bottom,
					height: r.height,
					left: r.left,
					right: r.right,
					n: 0,
					edges: 0,
					first: n,
					at: t,
					spaces: t ? [n.cs] : b,
					forced: !t && x
				});
			} else y.top = Math.min(y.top, r.top), y.bottom = Math.max(y.bottom, r.bottom), y.height = y.bottom - y.top, y.left = Math.min(y.left, r.left), y.right = Math.max(y.right, r.right);
			n.atom ? (_ && (y.n += hm(n)), y.edges++) : _ && (y.n += mm(n, t));
		}
		b = [], x = !1, S = n;
	}
	for (let t of e.boxes) {
		let e = t.el.getClientRects(), n = null, r = null;
		for (let t = 0; t < e.length; t++) e[t].height && (n ||= e[t], r = e[t]);
		if (n) for (let [e, i] of [[n, 0], [r, 1]]) {
			if (!(i ? t.end : t.start)) continue;
			let n = v.find((t) => Vp(t, e));
			if (!n) return "order";
			i ? n.right = Math.max(n.right, e.right + t.mr) : n.left = Math.min(n.left, e.left - t.ml), n.n++, n.edges++;
		}
	}
	for (let e of v) if (e.room = a === 0 ? g - e.right : a === 2 ? e.left - h : g - h - (e.right - e.left), e.room < t.risk.early(e.n, e.edges)) return "early";
	if (!t.risk.pull) return "";
	for (let e = 0; e + 1 < v.length; e++) {
		let n = v[e], r = v[e + 1];
		if (r.forced) continue;
		let i = r.first, a, o, s = !1;
		if (i.atom) a = i.start.width + Q(i.cs.marginLeft) + Q(i.cs.marginRight), o = hm(i);
		else if (!i.wraps) a = i.rl[r.at].right - i.rl[r.at].left, o = i.node.data.length;
		else {
			let e = i.node.data, n, c = null;
			if (r.at) {
				let e = nm(i, t.range);
				if (!e) return "unmeasured";
				n = e.breaks[r.at - 1], c = e.words ? e.words[r.at - 1] : null;
			} else for (n = 0; n < e.length && Z(e.charCodeAt(n));) n++;
			let l = Xp(e, n);
			if (l !== Yp(e, n) && (c = null), r.at && !Z(e.charCodeAt(n - 1)) && (s = !0), !c) {
				let a = e.length;
				for (; a > l && Z(e.charCodeAt(a - 1));) a--;
				c = !r.at && i.rl.length === 1 && l === a ? i.rl[0] : qp(i.live, n, l, t.range);
			}
			if (!c) return "unmeasured";
			a = c.right - c.left, o = l - n;
		}
		let c = a - n.room, l = t.risk.pull(n.n + 1 + o, n.edges);
		if (c >= l) continue;
		let u = 1 / 0;
		if (!s) for (let e of r.spaces) u = Math.min(u, sm(e, t));
		if (u === 1 / 0 && (u = 0), u + c < l) return "pull";
	}
	return "";
}
function mm(e, t) {
	let n = e.node.data, r = e.found ? e.found.breaks : kp, i = t && r.length >= t ? r[t - 1] : 0, a = t < r.length ? r[t] : n.length;
	return e.k === void 0 && (e.k = 1 + +!!Q(e.cs.letterSpacing) + +!!Q(e.cs.wordSpacing)), (a - i) * e.k;
}
function hm(e) {
	return e.n === void 0 && (e.n = 2 + (nt(e.atom.localName, e.cs.display || "") ? e.atom.textContent.length : 0)), e.n;
}
function gm(e, t) {
	let n = e.createElementNS(xp, "span");
	return n.setAttribute("style", Sp), n.textContent = t, n;
}
function _m(e, t) {
	let { breaks: n } = e, r = t.data, i = t.ownerDocument, a = i.createDocumentFragment();
	for (let t = 0; t <= n.length; t++) {
		let o = t ? n[t - 1] : 0, s = t < n.length ? n[t] : r.length, c = t === n.length, l = o;
		for (; l < s && Z(r.charCodeAt(l));) l++;
		let u = s;
		for (; u > l && Z(r.charCodeAt(u - 1));) u--;
		!c && u === s && r.charCodeAt(u - 1) === 173 && u--;
		let d = !t && e.before ? o : l, f = c && e.after ? s : u;
		if (d > o && a.append(r.slice(o, d)), a.append(gm(i, r.slice(d, f))), f < s) a.append(r.slice(f, s));
		else if (!c) {
			let t = e.cs.hyphens === "auto" && !/[-\u2010]/.test(r[u - 1]);
			a.append(t ? "­" : i.createElementNS(xp, "wbr"));
		}
	}
	let o = a.lastChild;
	return t.replaceWith(a), o;
}
var vm = /* @__PURE__ */ new WeakMap();
function ym(e) {
	let t = vm.get(e);
	return t || vm.set(e, t = e.implementation.createHTMLDocument("")), t;
}
function bm(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = e.ownerDocument.createTreeWalker(e, NodeFilter.SHOW_ALL), a = t.ownerDocument.createTreeWalker(t, NodeFilter.SHOW_ALL);
	for (let o = e, s = t; o && r.size < n.size; o = i.nextNode(), s = a.nextNode()) n.has(o) && r.set(o, s);
	if (r.size < n.size) throw Error("a node to pin is not in the serialized tree");
	return r;
}
function xm(e, t = e.position) {
	if (t !== "relative" && t !== "sticky") return !1;
	for (let t of [
		e.left,
		e.right,
		e.top,
		e.bottom
	]) if (t !== "auto" && Q(t)) return !0;
	return !1;
}
function Sm(e, t, n, r, i = null) {
	if (Eo !== "text-wrap-mode" || !e || !t || !n || !r) return null;
	let a = r.createRange(), o = /* @__PURE__ */ new WeakMap(), s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = [], u = (e) => {
		let t = s.get(e);
		return t || s.set(e, t = {
			root: e,
			items: [],
			links: [],
			runs: [],
			boxes: [],
			last: null,
			gap: [],
			why: ""
		}), t;
	}, d = (e, t) => {
		let n = u(e);
		n.why ||= t;
	}, f = (e, t) => {
		let n = e.last;
		if (n) {
			let r = e.gap.length || n.wraps && Bp(n, !1) || t.wraps && Bp(t, !0), i = !r && n.node && t.node && (n.wraps || t.wraps) && !(Tp.test(n.node.data[n.node.data.length - 1]) && Tp.test(t.node.data[0]));
			(r || i || n.atom || t.atom) && e.links.push({
				prev: n,
				run: t,
				gap: e.gap.slice(),
				seam: i
			}), e.gap.length = 0;
		}
		e.last = t, e.items.push(t);
	}, p = (e, t, n, r) => {
		let i = n.transform, a = n.translate;
		(xm(n) || i && i !== "none" || a && a !== "none") && d(e.root, "shifted"), (Q(n.marginLeft) < 0 || Q(n.marginRight) < 0) && d(e.root, "margin"), f(e, {
			atom: t,
			el: r,
			cs: n,
			start: void 0,
			end: null
		});
	}, m = [t, null];
	for (; m.length;) {
		let e = m.pop(), t = m.pop();
		if (t.nodeType === 3) {
			let r = t.parentNode, i = c.get(r);
			i === void 0 && c.set(r, i = im(r, n.get(r), o));
			let a = t.data, s = 0;
			for (; s < a.length && Z(a.charCodeAt(s));) s++;
			if (!i) {
				s < a.length && d(e, "unpaired");
				continue;
			}
			let l = i.live[i.at++], p = u(e);
			if (s === a.length) {
				i.wraps && p.last && (p.gap.push(t), p.items.push({ space: i.cs }));
				continue;
			}
			let m = {
				node: t,
				live: l,
				cs: i.cs,
				wraps: i.wraps,
				plain: i.plain,
				simple: i.plain && Ap.test(a),
				loose: void 0,
				breaks: kp,
				start: void 0,
				end: null
			};
			f(p, m), m.wraps && p.runs.push(m);
			continue;
		}
		if (t.nodeType !== 1) continue;
		let r = e, i = n.get(t);
		if (i) {
			let n = H(i), a = n.display || "";
			if (a === "none") continue;
			let o = a !== "contents" && (Ep.has(a) || a.startsWith("inline") || a === "math"), c = n.position, f = c === "absolute" || c === "fixed", m = o ? "" : n.float;
			if (m && m !== "none" ? l.push(i) : !o && !f && a !== "contents" && s.has(e) && s.get(e).items.push(Lp), i.namespaceURI !== xp || Dp.has(i.localName)) {
				o && p(u(e), i, n, t);
				continue;
			}
			if (i.localName === "wbr") {
				s.get(e)?.last && s.get(e).gap.push(t);
				continue;
			}
			if (i.localName === "br") {
				s.has(e) && s.get(e).items.push(Lp);
				continue;
			}
			if (Ep.has(a)) {
				if (a === "inline") {
					n.direction !== "ltr" && d(e, "direction"), xm(n, c) && d(e, "shifted");
					let t = Q(n.marginLeft), r = Q(n.marginRight);
					(t < 0 || r < 0) && d(e, "margin");
					let a = t + Q(n.paddingLeft) + Q(n.borderLeftWidth), o = r + Q(n.paddingRight) + Q(n.borderRightWidth);
					(a || o) && ((n.boxDecorationBreak === "clone" || n.webkitBoxDecorationBreak === "clone") && d(e, "clone"), u(e).boxes.push({
						el: i,
						start: a > 0,
						end: o > 0,
						ml: t,
						mr: r
					}));
				} else a !== "contents" && d(e, "ruby");
			} else {
				if (o && p(u(e), i, n, t), !i.childElementCount && nt(i.localName, a) && i.clientHeight - Q(n.paddingTop) - Q(n.paddingBottom) < 1.5 * (Q(n.lineHeight) || 1.2 * Q(n.fontSize))) continue;
				r = i;
			}
		} else {
			if (Op.has(t.localName)) continue;
			{
				let r = t.getAttribute?.("data-snapdom-pseudo"), i = r && n.get(t.parentNode), a = i ? H(i, r) : null;
				(!a || a.position !== "absolute" && a.position !== "fixed") && d(e, r ? "pseudo" : "wrapper");
			}
		}
		for (let e = t.lastChild; e; e = e.previousSibling) m.push(e, r);
	}
	let h = [];
	for (let e of s.values()) (e.links.length || e.runs.some(Up)) && h.push(e);
	let g = {
		risk: i,
		range: a,
		axes: o,
		floats: l,
		floatBoxes: /* @__PURE__ */ new Map(),
		doc: r,
		ctx: null,
		spaceMemo: /* @__PURE__ */ new Map(),
		faces: /* @__PURE__ */ new Map(),
		optical: null
	};
	i && i.optical && (g.optical = lm(h, g));
	let _ = [], v = [], y = /* @__PURE__ */ new Set(), b = [];
	for (let e of h) if (!i || pm(e, g)) {
		for (let { prev: t, run: n, gap: r, seam: i } of e.links) if (rm(t, a) && rm(n, a) && Vp(t.end, n.start)) {
			t.after = !0, n.before = !0;
			for (let e of r) _.push(e);
			i && v.push(t), t.atom && y.add(t), n.atom && y.add(n);
		}
		for (let t of e.runs) {
			let e = t.node.data, n = 0;
			for (; n < e.length && Z(e.charCodeAt(n));) n++;
			let r = e.length;
			for (; r > n && Z(e.charCodeAt(r - 1));) r--;
			!(t.before && n > 0 || t.after && r < e.length) && !Up(t) || rm(t, a) && b.push(t);
		}
	}
	if (!b.length && !_.length && !v.length && !y.size) return null;
	let x = ym(r), S = x.importNode(e, !0), C = bm(e, S, /* @__PURE__ */ new Set([
		...b.map((e) => e.node),
		..._,
		...v.map((e) => e.node),
		...[...y].map((e) => e.el)
	]));
	for (let e of b) e.tail = _m(e, C.get(e.node));
	for (let e of _) {
		let t = C.get(e);
		if (t.nodeType === 1) t.replaceWith(wp);
		else {
			let e = gm(x, "");
			t.replaceWith(e), e.append(t);
		}
	}
	for (let e of v) (e.tail || C.get(e.node)).after(wp);
	for (let e of y) {
		let t = C.get(e.el), n = gm(x, "");
		t.replaceWith(n), n.append(t);
		for (let [n, r] of Cp) {
			let i = e.cs.getPropertyValue(n);
			i && i !== r && t.style?.setProperty(n, i);
		}
	}
	return S;
}
hi(), wr();
function Cm(e, t, n, r) {
	return e > t + .5 ? e - n : r - n;
}
function wm(e) {
	let t = (e) => e && e !== "transparent" && !/^rgba\(.*,\s*0\)$/.test(e), n = H(e.documentElement).backgroundColor, r = t(n) ? n : H(e.body).backgroundColor;
	return t(r) ? `;background-color:${r} !important` : "";
}
var Tm = /(?:^|;)(?:box-shadow|text-shadow|outline-style|filter|-webkit-filter):/;
function Em(e, t) {
	if (U()) return e;
	let n = e.indexOf("</style>");
	if (n === -1) return e;
	let r = [], i = n;
	if (e.indexOf("<style", n) !== -1) {
		let t = /<style\b[^>]*>[\s\S]*?<\/style>/g, a;
		for (t.lastIndex = n; a = t.exec(e);) r.push({
			text: e.slice(i, a.index),
			intern: !0
		}), r.push({
			text: a[0],
			intern: !1
		}), i = t.lastIndex;
	}
	r.push({
		text: e.slice(i),
		intern: !0
	});
	let a = /* @__PURE__ */ new Map(), o = / style="([^"]*)"/g, s;
	for (let e of r) if (e.intern) for (o.lastIndex = 0; s = o.exec(e.text);) a.set(s[1], (a.get(s[1]) || 0) + 1);
	let c = 0;
	for (let [e, t] of a) t > 1 && (c += (t - 1) * e.length);
	if (c < 2048 || e.includes(" data-sdi=")) return e;
	let l = km(t, r.some((e) => !e.intern), e.includes("data-snapdom-asset"));
	if (l === null) return e;
	let u = /* @__PURE__ */ new Map(), d = 0, f = [], p = (e, t) => {
		if ((a.get(t) || 0) < 2 || l.has(t)) return e;
		let n = u.get(t);
		return n === void 0 && (n = "i" + (d++).toString(36), u.set(t, n), f.push(`[data-sdi="${n}"]{${t}}`)), ` data-sdi="${n}"`;
	}, m = "";
	for (let e of r) m += e.intern ? e.text.replace(o, p) : e.text;
	return e.slice(0, n) + f.join("") + m;
}
function Dm(e) {
	if (/@import\b/i.test(e)) return null;
	let t = [], n = (e) => {
		for (let r of e) {
			if (r.type === CSSRule.IMPORT_RULE || r.type === CSSRule.NAMESPACE_RULE) throw Error("External or namespaced CSS");
			if (r.selectorText) {
				if (/\[\s*style\b|data-sdi|\[[^\]]*\\|&/i.test(r.selectorText)) throw Error("Attribute-dependent or nested CSS");
				t.push(r.selectorText);
			}
			r.cssRules && n(r.cssRules);
		}
	};
	try {
		let t = new CSSStyleSheet();
		t.replaceSync(e), n(t.cssRules);
	} catch {
		return null;
	}
	return t;
}
var Om = /* @__PURE__ */ new Map();
function km(e, t, n) {
	let r = /* @__PURE__ */ new Set();
	if (!t && !n) return r;
	if (!e || e.querySelector("[data-sdi]")) return null;
	let i = (e) => {
		let t = e.getAttribute("style");
		t && r.add(t);
	};
	if (n && e.querySelectorAll("[data-snapdom-asset][style]").forEach(i), t) try {
		let t = [], n = /* @__PURE__ */ new Map();
		for (let r of [...e.querySelectorAll("style")].slice(1)) {
			let e = r.textContent || "";
			n.has(e) || n.set(e, Om.has(e) ? Om.get(e) : Dm(e));
			let i = n.get(e);
			if (!i) return Om = n, null;
			for (let e of i) t.push(e);
		}
		Om = n;
		let a = [];
		for (let n of t) /:scope\b/i.test(n) ? e.querySelectorAll(n).forEach(i) : a.push(n);
		let o = a.join(",");
		if (o) for (let t of e.querySelectorAll("[style]")) {
			let e = t.getAttribute("style");
			e && !r.has(e) && t.matches(o) && r.add(e);
		}
	} catch {
		return null;
	}
	let a = /* @__PURE__ */ new Set(), o = document.createElement("div"), s = new XMLSerializer();
	for (let e of r) {
		o.setAttribute("style", e);
		let t = s.serializeToString(o).match(/ style="([^"]*)"/);
		t && a.add(t[1]);
	}
	return a;
}
async function Am(e, t) {
	let { clipWindow: n, outerTransforms: r, outerShadows: i, rootTransform2D: a, fontsCSS: s, universe: c, session: l, signatures: u } = t, d = e.options;
	if (e !== d) {
		let { options: t, ...n } = e;
		e = Object.assign(d, n), Object.defineProperty(e, "options", {
			value: e,
			configurable: !0
		});
	}
	let f, p;
	$r(e, s, c), await fp("beforeRender", e);
	let m = H(e.element), h = e.element.getBoundingClientRect(), g = l?.rootBox, _ = Math.max(1, X(g?.[0] || e.element.offsetWidth || parseFloat(m.width) || h.width || 1)), v = Math.max(1, X(g?.[1] || e.element.offsetHeight || parseFloat(m.height) || h.height || 1)), y = e.element.ownerDocument || document, b = !n && (e.element === y.body || e.element === y.documentElement) && !e.__pinned, x = null, S = null, C = 0;
	if (b) {
		let t = Math.max(e.element.scrollHeight || 0, y.documentElement?.scrollHeight || 0, y.body?.scrollHeight || 0), n = Math.max(e.element.scrollWidth || 0, y.documentElement?.scrollWidth || 0, y.body?.scrollWidth || 0), r = Math.max(_, X(n)), a = e.element === y.body, s = a && H(y.documentElement).direction === "rtl", c = (e) => {
			e > 0 && (s ? C = Math.max(C, X(e - h.width)) : _ = Math.max(_, X(e)));
		};
		if (a && y.documentElement) {
			let r = y.documentElement.getBoundingClientRect(), a = e.element.currentCSSZoom || 1, o = {
				top: Math.max(0, h.top - r.top) / a,
				right: Math.max(0, r.right - h.right) / a,
				bottom: Math.max(0, r.bottom - h.bottom) / a,
				left: Math.max(0, h.left - r.left) / a
			};
			if (x = o, i !== "subtree" && (o.top || o.right || o.bottom || o.left)) {
				let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map();
				for (let [r, i] of e.nodeMap) {
					let e = u?.get(r);
					if (e) {
						let n = t.get(e);
						if (n === void 0 && t.set(e, n = Tm.test(e)), !n) continue;
					}
					n.set(r, i);
				}
				let r = mr(e.element, n, e.styleCache, h.width > 0 ? _ / h.width : 1, h.height > 0 ? v / h.height : 1);
				S = {
					top: Math.min(r.top, o.top),
					right: Math.min(r.right, o.right),
					bottom: Math.min(r.bottom, o.bottom),
					left: Math.min(r.left, o.left)
				};
			}
			t = Math.max(e.element.scrollHeight || 0, Cm(t, r.height, h.top - r.top, h.bottom - r.top)), n = Math.max(e.element.scrollWidth || 0, s ? Cm(n, r.width, r.right - h.right, r.right - h.left) : Cm(n, r.width, h.left - r.left, h.right - r.left));
		}
		t > 0 && (v = Math.max(v, X(t))), c(n);
		try {
			let i = (e.scrollbarCSS || "").length + (e.baseCSS || "").length + (e.fontsCSS || "").length + (e.classCSS || "").length, l = o.measureHints.get(e.element);
			if (l && l.cssLen === i && l.w0 === r && l.docH === t && l.docW === n) l.csh > 0 && (v = Math.max(v, X(l.csh))), c(l.csw);
			else {
				let l = y.createElement("div");
				B(l), l.style.cssText = "position:absolute!important;left:-9999px!important;top:0!important;width:" + r + "px!important;overflow:visible!important;visibility:hidden!important;";
				let u = l.attachShadow({ mode: "open" });
				Jr(u, (e.scrollbarCSS || "") + e.baseCSS + "svg{overflow:visible;} foreignObject{overflow:visible;}" + e.classCSS);
				let d = u.appendChild(qr(e.clone));
				y.body.appendChild(l);
				let f = l.scrollHeight, p = l.scrollWidth;
				if (a) {
					let e = l.getBoundingClientRect(), t = d.getBoundingClientRect();
					f = Cm(f, e.height, t.top - e.top, t.bottom - e.top), p = s ? Cm(p, e.width, e.right - t.right, e.right - t.left) : Cm(p, e.width, t.left - e.left, t.right - e.left);
				}
				y.body.removeChild(l), o.measureHints.set(e.element, {
					cssLen: i,
					w0: r,
					docH: t,
					docW: n,
					csh: f,
					csw: p
				}), f > 0 && (v = Math.max(v, X(f))), c(p);
			}
		} catch {}
	}
	if (e.options?.excludeMode === "remove" || typeof e.options?.filter == "function" && e.options.filterMode === "remove") {
		let t = Kr(e.element, e.options), n = Kr(e.element, {}), r = Math.max(2, v * .15);
		Number.isFinite(n) && n >= v - r && Number.isFinite(t) && t > 0 && (v = Math.max(1, Math.min(v, X(t + 1))));
	}
	if (e.options?.reconcile) try {
		let t = (e.scrollbarCSS || "") + e.baseCSS + "svg{overflow:visible;} foreignObject{overflow:visible;}" + e.classCSS;
		Yr(e.element, e.clone, t, e.nodeMap, _, v);
	} catch (t) {
		q(l, "reconcile-failed", "reconcile pass failed", t), K(e.options, "reconcile couldn't run; captured without it.", t);
	}
	let w = (e, t = NaN) => {
		let n = typeof e == "string" ? parseFloat(e) : e;
		return Number.isFinite(n) ? n : t;
	}, T = w(e.options.width), E = w(e.options.height), D = n ? X(n.width) : _, O = n ? X(n.height) : v, k = D, A = O, j = Number.isFinite(T), M = Number.isFinite(E), ee = O > 0 ? D / O : 1;
	j && M ? (k = Math.max(1, X(T)), A = Math.max(1, X(E))) : j ? (k = Math.max(1, X(T)), A = Math.max(1, X(k / (ee || 1)))) : M && (A = Math.max(1, X(E)), k = Math.max(1, X(A * (ee || 1))));
	let N = 0, P = 0, F = _, I = v;
	if (n) {
		let t = 0, i = 0;
		if (xr(e.element)) {
			let n = null;
			if (!r && a && Number.isFinite(a.a)) n = {
				a: a.a,
				b: a.b || 0,
				c: a.c || 0,
				d: a.d || 1,
				e: 0,
				f: 0
			};
			else {
				let t = vr(e.element), r = jr(m.transform && m.transform !== "none" ? m.transform : "", t);
				r && r.is2D && (n = {
					a: r.a,
					b: r.b,
					c: r.c,
					d: r.d,
					e: 0,
					f: 0
				});
			}
			if (n && (n.a !== 1 || n.b !== 0 || n.c !== 0 || n.d !== 1)) {
				let { ox: e, oy: r } = _r(m, _, v), a = gr(_, v, n, e, r);
				t = a.minX, i = a.minY;
			}
		}
		let o = U() ? 0 : (d.dpr || 1) * (j || M ? k / D : d.scale || 1);
		N = X(o ? Math.round((n.x + t) * o) / o : n.x + t), P = X(o ? Math.round((n.y + i) * o) / o : n.y + i), F = X(N + n.width), I = X(P + n.height);
	} else if (!r && a && Number.isFinite(a.a)) {
		let e = {
			a: a.a,
			b: a.b || 0,
			c: a.c || 0,
			d: a.d || 1,
			e: 0,
			f: 0
		}, t = gr(_, v, e, 0, 0);
		N = X(t.minX), P = X(t.minY), F = X(t.maxX), I = X(t.maxY);
	} else if (r && xr(e.element)) {
		let t = m.transform && m.transform !== "none" ? m.transform : "", n = vr(e.element), r = br({
			baseTransform: t,
			rotate: n.rotate || "0deg",
			scale: n.scale,
			translate: n.translate,
			width: _,
			height: v
		}), { ox: i, oy: a } = _r(m, _, v), o = r.is2D ? r : new DOMMatrix(r.toString()), s = {
			a: o.a,
			b: o.b,
			c: o.c,
			d: o.d,
			e: 0,
			f: 0
		}, c = gr(_, v, s, i, a);
		N = X(c.minX), P = X(c.minY), F = X(c.maxX), I = X(c.maxY);
	}
	let L = ar(m), te = or(m), ne = cr(m), re = lr(m), ie = ur(m), R = h.width > 0 ? (F - N) / h.width : 1, ae = h.height > 0 ? (I - P) / h.height : 1, oe = i === "subtree" && !n ? mr(e.element, e.nodeMap, e.styleCache, R, ae) : {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	};
	S && (oe = {
		top: S.top,
		right: Math.max(0, S.right - (_ - h.width)),
		bottom: Math.max(0, S.bottom - (v - h.height)),
		left: S.left
	}), C > 0 && (oe = {
		...oe,
		left: Math.max(oe.left, C)
	});
	let se = n ? {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	} : i ? {
		top: X(Math.max(L.top, te.top, oe.top) + ne.top + re.top + ie.bleed.top),
		right: X(Math.max(L.right, te.right, oe.right) + ne.right + re.right + ie.bleed.right),
		bottom: X(Math.max(L.bottom, te.bottom, oe.bottom) + ne.bottom + re.bottom + ie.bleed.bottom),
		left: X(Math.max(L.left, te.left, oe.left) + ne.left + re.left + ie.bleed.left)
	} : {
		top: X(ne.top + oe.top),
		right: X(ne.right + oe.right),
		bottom: X(ne.bottom + oe.bottom),
		left: X(ne.left + oe.left)
	};
	N = X(N - se.left), P = X(P - se.top), F = X(F + se.right), I = X(I + se.bottom);
	let ce = Math.max(1, X(F - N)), le = Math.max(1, X(I - P)), ue = "http://www.w3.org/2000/svg", de = xr(e.element) ? 2 : 0, fe = X(de + +!r), pe = d.__subpixel?.x || 0, me = d.__subpixel?.y || 0, he = Math.ceil(ce + fe * 2 + pe), ge = Math.ceil(le + fe * 2 + me), _e = X(-(X(N) - fe)), ve = X(-(X(P) - fe)), ye = y.defaultView || window, be = !U() && CSS.supports("zoom", "2"), xe = be ? jm(ye) : 1, z = be ? (W() && Number.isInteger(xe) ? 1 : xe) * (e.element.currentCSSZoom || 1) : 1;
	l.layoutZoom = z;
	let Se = n && !U(), Ce = Se ? X(_e - Math.floor(_e * z + .01) / z) : 0, we = Se ? X(ve - Math.floor(ve * z + .01) / z) : 0, Te = Math.min(0, _e - Ce) - (Ce ? 1 / z : 0), Ee = Math.min(0, ve - we) - (we ? 1 / z : 0), De = _e - Ce - Te + pe, Oe = ve - we - Ee + me, ke = X(he - Te), Ae = X(ge - Ee), je = document.createElementNS(ue, "foreignObject");
	je.setAttribute("x", String(Te * z)), je.setAttribute("y", String(Ee * z)), je.setAttribute("width", String(ke * z)), je.setAttribute("height", String(Ae * z)), je.style.overflow = "visible";
	let Me = document.createElement("style");
	Me.textContent = (e.scrollbarCSS || "") + e.baseCSS + e.fontsCSS + "svg{overflow:visible;} foreignObject{overflow:visible;} foreignObject>div{-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important;}" + e.classCSS, je.appendChild(Me);
	let Ne = document.createElement("div");
	Ne.setAttribute("xmlns", "http://www.w3.org/1999/xhtml"), Ne.style.cssText = `all:initial;box-sizing:border-box;display:block;overflow:visible;width:${d.__subpixel ? X(De + h.width) : ke}px;height:${Ae}px` + (De !== 0 || Oe !== 0 ? `;padding:${Oe}px 0 0 ${De}px !important` : "") + (z === 1 ? "" : `;zoom:${z} !important`) + ";direction:ltr !important" + (x ? wm(y) : ""), x && (De !== x.left || Oe !== x.top) && u && Ar(e.element, e.nodeMap, u, e.styleCache, De - x.left, Oe - x.top), Ne.appendChild(e.clone), je.appendChild(Ne);
	let Pe = new XMLSerializer(), Fe = je;
	if (!Number.isInteger(z)) try {
		Fe = Sm(je, e.clone, e.nodeMap, y, om(z)) || je;
	} catch (e) {
		q(l, "line-breaks-failed", "line break pass failed", e);
	}
	let Ie = Pe.serializeToString(Fe), Le = j || M, Re = Object.freeze({
		w0: D,
		h0: O,
		vbW: he,
		vbH: ge,
		targetW: k,
		targetH: A,
		contentX: X(_e + (n ? N : 0)),
		contentY: X(ve + (n ? P : 0)),
		clip: n ? Object.freeze({
			x: X(N),
			y: X(P),
			width: D,
			height: O
		}) : null
	});
	Object.defineProperty(d, "meta", {
		value: Re,
		enumerable: !0,
		writable: !1,
		configurable: !0
	});
	let ze = !Le || U() ? he : j ? k : X(A / ge * he), Be = !Le || U() ? ge : M ? A : X(k / he * ge), Ve = parseFloat(H(y.documentElement)?.fontSize) || 16, He = [Ce || we ? `translate(${Ce} ${we})` : "", z === 1 ? "" : `scale(${1 / z})`].join(" ").trim(), Ue = `<svg xmlns="${ue}" width="${ze}" height="${Be}" viewBox="0 0 ${he} ${ge}" font-size="${Ve}px">${He ? `<g transform="${He}">` : ""}`, Ge = He ? "</g></svg>" : "</svg>";
	if (p = Ue + Em(Ie, Fe) + Ge, z !== 1) {
		let e = (e) => {
			let t = Pe.serializeToString(e.cloneNode(!1));
			return t.slice(0, t.indexOf(">") + 1).replace(/\/>$/, ">");
		}, t = je.cloneNode(!1);
		t.setAttribute("x", String(Te)), t.setAttribute("y", String(Ee)), t.setAttribute("width", String(ke)), t.setAttribute("height", String(Ae));
		let n = Ne.cloneNode(!1);
		n.style.removeProperty("zoom");
		let r = Ce || we ? `translate(${Ce} ${we})` : "", i = Ue.slice(0, Ue.indexOf(">") + 1) + (r ? `<g transform="${r}">` : "");
		l.fileSvg = {
			zoomed: [
				Ue + e(je),
				e(Ne),
				Ge
			],
			flat: [
				i + e(t),
				e(n),
				r ? "</g></svg>" : "</svg>"
			]
		};
	}
	f = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p)}`, e.svgString = p, e.dataURL = f, l.artifacts = {
		classCSS: e.classCSS || "",
		fontsCSS: e.fontsCSS || "",
		baseCSS: e.baseCSS || "",
		scrollbarCSS: e.scrollbarCSS || ""
	}, await fp("afterRender", e), e.clone = e.nodeMap = e.styleCache = e.svgString = null;
	let Ke = [...document.querySelectorAll("#snapdom-sandbox")].find(We);
	return Ke && Ke.style.position === "absolute" && Ke.remove(), e.dataURL;
}
function jm(e) {
	let t = e.devicePixelRatio || 1;
	if (t === 1) return 1;
	let n = e.document, r = t;
	try {
		let i = n.createElement("div");
		B(i), i.style.cssText = "position:absolute!important;left:-9999px!important;top:0!important;width:0!important;height:0!important;visibility:hidden!important;pointer-events:none!important;border:0 solid transparent!important;border-top-width:0.5px!important", (n.body || n.documentElement).appendChild(i);
		let a = parseFloat(e.getComputedStyle(i).borderTopWidth);
		i.remove(), a >= 1 && (W() || Math.abs(a - 1 / t) > .01) && (r = 1);
	} catch {}
	return r;
}
hi(), wr();
function Mm(e) {
	let t = Array.isArray(e.plugins) ? e.plugins : vp(), n = [];
	for (let e of t) {
		let t = lp(e);
		t && typeof t.resolveNode == "function" && n.push(t.resolveNode.bind(t));
	}
	return n.length ? n : null;
}
async function Nm(e, t, n = Pl(t)) {
	if (!e) throw Error("[SnapDOM] The element cannot be null or undefined.");
	i(t.cache), t.__session = n, t.__ownNode = B, n.resolveNodeHooks = Mm(t);
	let r = t;
	r.element = e, Object.defineProperty(r, "options", {
		value: r,
		configurable: !0
	});
	let a, s, c, l, u, d, f, p, m, h, g, _ = "", v = null, y = t.needs || "render", b = r.format, x = r.type;
	await fp("beforeSnap", r);
	let S = r.format !== b && /^(?:png|jpe?g|webp|svg)$/i.test(r.format), C = r.type !== x && /^(?:png|jpe?g|webp|svg)$/i.test(r.type);
	if (S || C) {
		let e = String(S ? r.format : r.type).toLowerCase();
		r.format = e === "jpg" ? "jpeg" : e, r.type = r.format, r.__explicitFormat = r.format, /^(?:jpeg|webp)$/.test(r.format) && (r.backgroundColor == null || r.backgroundColor === "transparent") && (r.backgroundColor = "#ffffff");
	}
	await fp("beforeClone", r), Rn(e.ownerDocument, e.getElementsByTagName("*").length + 1);
	let w = r.outerTransforms !== !1, T = r.outerShadows === "subtree" ? "subtree" : !!r.outerShadows, E = r.clip ? Tr(r.element, r.clip) : null, D = [];
	try {
		typeof r.element.getAnimations == "function" && (D = r.element.getAnimations({ subtree: !0 }));
	} catch {
		D = null;
	}
	let O = new Set(D), k = () => {
		jn(r.element, O);
		for (let e of O) Jo(e.effect?.target);
	};
	k(), n.animated = Yo(O);
	let A = t.__styleShare;
	if (A === void 0) try {
		A = co(r.element) && D?.length === 0;
	} catch {
		A = !1;
	}
	n.styleShare = A;
	let j = Yt(t.fast);
	for (;;) {
		n.slicer = j;
		let e = Vf(r.element, E);
		try {
			({clone: a, classCSS: s, classPrefixCSS: c, shadowCSS: l, styleCache: u, nodeMap: d, reconcileRisk: f, clipWindow: p, standIns: m, universe: h} = await kd(r.element, r.options, n)), f > 0 && !t.reconcile && (q(n, "reconcile-risk", "text in inline/table-cell elements kept natural width and may re-wrap; pass { reconcile: true } for pixel-exact layout"), t.debug && !o.warnedReconcile && (o.warnedReconcile = !0, K(t, "Some text may wrap differently in the capture. Pass { reconcile: true } to fix it (about 2x slower)."))), !w && a && (v = hr(r.element, a)), !T && a && Nr(r.element, a, r.options), a && (g = Lr(r.element, a, d, m), Pr(r.element, a));
		} finally {
			e();
		}
		if (!j?.yielded || !n.tornSinceStart?.()) break;
		j = null, i(t.cache), n.styleMap = /* @__PURE__ */ new Map(), n.styleCache = /* @__PURE__ */ new WeakMap(), n.nodeMap = /* @__PURE__ */ new Map(), n.warnings = [];
	}
	if (n.slicer = null, r.clone = a, r.classCSS = s, r.styleCache = u, r.nodeMap = d, await fp("afterClone", r), !ap(y, "render")) return k(), null;
	if (j?.due() && await j.pause(), zr(r.clone), r.options?.excludeMode === "remove" || typeof r.options?.filter == "function" && r.options.filterMode === "remove") try {
		Ur(r.element, r.clone, r.styleCache, r.nodeMap);
	} catch (e) {
		q(n, "shrink-failed", "shrink pass failed", e), K(t, "Couldn't close the gaps left by removed elements.", e);
	}
	try {
		await Xl(r.clone, r.element, r.nodeMap);
	} catch {}
	try {
		let e = n.styleMap;
		$l(e.keys(), e, r.nodeMap, r.options.__iconMatchers);
	} catch {}
	let M = (e) => Promise.resolve().then(e), ee = !l && r.classCSS === s && !r.clone?.querySelector("style"), N = (async () => {
		await Promise.all([M(() => Ld(r.clone, r.options, n)), M(() => Kd(r.element, r.clone, r.styleCache, r.options, r.nodeMap, ee))]);
		try {
			qd(r.element, r.clone, r.nodeMap);
		} catch (e) {
			q(n, "backdrop-filter-failed", "backdrop-filter emulation failed", e), K(t, "Couldn't reproduce a backdrop-filter; captured without it.", e);
		}
		if (t.compress) {
			let e = {
				session: n,
				clip: p,
				rootTransform: v
			};
			await M(() => Td(r.clone, r.options, r.nodeMap, e));
		}
		if (t.captureSelection) try {
			Vc(r.nodeMap);
		} catch (e) {
			q(n, "selection-compose-failed", "field selection compose failed", e);
		}
	})(), P = Promise.resolve();
	(t.embedFonts === "auto" ? ((r.element.ownerDocument || document).fonts?.size || 0) > 0 : t.embedFonts) && (P = M(async () => {
		let e = r.element.ownerDocument || document, i = E ? (e) => {
			try {
				let t = e.getBoundingClientRect();
				return t.right >= E.left - 200 && t.left <= E.right + 200 && t.bottom >= E.top - 200 && t.top <= E.bottom + 200;
			} catch {
				return !0;
			}
		} : null, { required: a, usedCodepoints: o } = !E && n.fontUsage || Rf(r.element, i), s = a, c = a;
		if (t.embedFonts === "auto") {
			let { declared: t, drawn: n } = gf(e), r = (e) => hf(e).toLowerCase();
			if (s = new Set(Array.from(a).filter((e) => n.has(r(e)))), !s.size) return;
			c = new Set(Array.from(a).filter((e) => n.has(r(e)) || !t.has(r(e))));
		}
		U() && await zf(s, o, e), _ = await Lf({
			required: c,
			usedCodepoints: o,
			exclude: r.options.excludeFonts,
			localFonts: r.options.localFonts,
			useProxy: r.options.useProxy,
			fontStylesheetDomains: r.options.fontStylesheetDomains,
			iconMatchers: r.options.__iconMatchers,
			doc: e,
			debug: r.options.debug
		});
	})), await Promise.all([N, P]), k();
	let F = (r.options.plugins || []).some((e) => e && (typeof e.beforeRender == "function" || typeof e.afterRender == "function"));
	if (r.options.engine === "html-in-canvas" && !F) {
		let { tryCanvasEngine: e } = await Promise.resolve().then(() => (bi(), gi));
		$r(r, _, h);
		let t = await e(r, r.options, n);
		if (t) return t;
	}
	j?.due() && await j.pause();
	let I = r.clone;
	Hu(I, n.compressedAssets);
	let L = await Am(r, {
		clipWindow: p,
		outerTransforms: w,
		outerShadows: T,
		rootTransform2D: v,
		fontsCSS: _,
		universe: h,
		session: n,
		signatures: n.styleMap
	});
	if (n.compressedSnapshot = Vu(I, n.compressedAssets), n.retain) try {
		n.retain({
			clone: a,
			nodeMap: d,
			styleCache: u,
			styleMap: n.styleMap,
			classPrefixCSS: c,
			plainBg: ee,
			fontsCSS: _,
			clipWindow: p,
			outerTransforms: w,
			outerShadows: T,
			rootTransform2D: v,
			marginZeroed: g,
			compressedAssets: n.compressedAssets,
			compressionDensity: n.compressionDensity
		});
	} catch {}
	return L;
}
s(), D(), cn();
var Pm = /* @__PURE__ */ new Set([
	"png",
	"jpeg",
	"jpg",
	"webp",
	"svg"
]);
function Fm(e = {}) {
	let t = typeof e.type == "string" && Pm.has(e.type.toLowerCase()) ? e.type.toLowerCase() : null, n = e.format ?? t ?? "png";
	n === "jpg" && (n = "jpeg");
	let i = e.format == null ? t === "jpg" ? "jpeg" : t : n, a = r(e.cache), o = e.exclude == null ? [] : Array.isArray(e.exclude) ? e.exclude : [e.exclude], s = [], c = [];
	for (let t of o) if (typeof t == "string") try {
		document.createDocumentFragment().querySelector(t), s.push(t);
	} catch {
		K(e, `Invalid exclude selector "${t}"; ignored.`);
	}
	else typeof t == "function" ? c.push(t) : t != null && K(e, "Ignored an exclude entry: use a CSS selector or a function.", t);
	let l = e.excludeMode ?? "hide", u = {
		debug: e.debug ?? !1,
		scale: e.scale ?? 1,
		exclude: s,
		excludePredicates: c.length ? c : null,
		excludeMode: l,
		filter: e.filter ?? null,
		filterMode: e.filterMode ?? "hide",
		shouldExclude: (e) => {
			if (!e || e.nodeType !== 1) return !1;
			if (e.getAttribute("data-capture") === "exclude") return !0;
			for (let t of Array.isArray(u.exclude) ? u.exclude : []) try {
				if (e.matches(t)) return !0;
			} catch {}
			for (let t of Array.isArray(u.excludePredicates) ? u.excludePredicates : []) try {
				if (t(e)) return !0;
			} catch {}
			if (typeof u.filter == "function") try {
				if (!u.filter(e)) return !0;
			} catch {}
			return !1;
		},
		placeholders: e.placeholders !== !1,
		captureSelection: e.captureSelection ?? !1,
		canvas: _(e.canvas, "canvas") ? e.canvas : null,
		embedFonts: e.embedFonts ?? "auto",
		iconFonts: Array.isArray(e.iconFonts) ? e.iconFonts : e.iconFonts ? [e.iconFonts] : [],
		__iconMatchers: zl(e.iconFonts, e),
		localFonts: Array.isArray(e.localFonts) ? e.localFonts : [],
		excludeFonts: e.excludeFonts ?? void 0,
		fontStylesheetDomains: Array.isArray(e.fontStylesheetDomains) ? e.fontStylesheetDomains : [],
		fallbackURL: e.fallbackURL ?? void 0,
		cache: a,
		__styleShare: e.__styleShare,
		useProxy: typeof e.useProxy == "string" ? e.useProxy : "",
		width: e.width ?? null,
		height: e.height ?? null,
		format: n,
		__explicitFormat: i,
		type: n,
		quality: e.quality ?? .92,
		dpr: e.dpr ?? (window.devicePixelRatio || 1),
		backgroundColor: e.backgroundColor ?? (["jpeg", "webp"].includes(n) ? "#ffffff" : null),
		filename: e.filename ?? "snapDOM",
		outerTransforms: e.outerTransforms ?? !0,
		outerShadows: e.outerShadows ?? !1,
		reconcile: e.reconcile ?? !1,
		burst: e.burst,
		fast: e.fast === !1 || e.fast === "auto" ? e.fast : !0,
		engine: e.engine,
		invalidate: e.invalidate ?? !1,
		__pinned: e.__pinned === !0,
		__subpixel: e.__subpixel ?? null,
		clip: e.clip ?? null,
		compress: e.compress !== !1,
		excludeStyleProps: e.excludeStyleProps ?? null,
		resolvePicturePlaceholders: e.resolvePicturePlaceholders !== !1
	};
	return u;
}
G(), cn(), ir(), ir(), Ue(), J(), Kt(), hi();
var Im = "svg,iframe,canvas,video,audio,object,embed,slot,template,picture,style", Lm = /(?:^|;)position:(?:absolute|fixed)(?:;|$)/;
function Rm(e) {
	try {
		return e.matches?.("dialog,[popover]") || !!e.querySelector?.("dialog,[popover]");
	} catch {
		return !0;
	}
}
var zm = /(?:^|;)\s*(?:-webkit-)?backdrop-filter:\s*(?!none(?:\s*!important)?(?:;|$))[^;]+/i;
function Bm(e) {
	if (e.usesBackdropFilter !== void 0) return e.usesBackdropFilter;
	let t = !1;
	for (let n of e.styleMap.values()) if (zm.test(n)) {
		t = !0;
		break;
	}
	return e.usesBackdropFilter = t, t;
}
function Vm(e, t) {
	let n = t.has("backdrop-filter") || t.has("-webkit-backdrop-filter");
	if (!n && (n = ((e) => /(?:^|;)\s*(?:-webkit-)?backdrop-filter\s*:/i.test(e.getAttribute?.("style") || ""))(e), !n)) try {
		n = !!e.querySelector?.("[style*=\"backdrop-filter\" i]");
	} catch {
		n = !0;
	}
	if (!n) return !1;
	let r = [e];
	e.querySelectorAll && r.push(...e.querySelectorAll("*"));
	for (let e of r) {
		let t = getComputedStyle(e), n = t.getPropertyValue("backdrop-filter") || t.getPropertyValue("-webkit-backdrop-filter");
		if (n && n !== "none") return !0;
	}
	return !1;
}
var Hm = 2 * Mt;
function Um(e, t) {
	if (e === t) return !0;
	if (!e.endsWith("px") || !t.endsWith("px") || t.includes(" ")) return !1;
	let n = parseFloat(e), r = parseFloat(t);
	return Number.isFinite(n) && Number.isFinite(r) && Math.abs(n - r) <= Hm;
}
var Wm = /* @__PURE__ */ new Map(), Gm = [
	"width",
	"height",
	"min-width",
	"min-height",
	"top",
	"right",
	"bottom",
	"left",
	"margin-top",
	"margin-right",
	"margin-bottom",
	"margin-left",
	"grid-template-columns",
	"grid-template-rows"
];
function Km(e) {
	let t = Wm.get(e);
	if (t === void 0) {
		t = null;
		for (let n of Gm) {
			let r = e.match(RegExp("(?:^|;)" + n + ":([^;]+)"));
			r && r[1].endsWith("px") && ((t ||= {})[n] = r[1]);
		}
		Wm.size > 5e3 && Wm.clear(), Wm.set(e, t);
	}
	return t;
}
function qm(e) {
	if (e.classList && e.classList.length) for (let t of Array.from(e.classList)) /^c\d+$/.test(t) && e.classList.remove(t);
}
function Jm(e, t) {
	let n = [e];
	for (; n.length;) {
		let e = n.pop();
		if (e.nodeType === 1) {
			let n = t.nodeMap.get(e);
			n !== void 0 && (t.nodeMap.delete(e), t.srcToClone.get(n) === e && t.srcToClone.delete(n)), t.styleMap.delete(e);
		}
		for (let t = e.firstChild; t; t = t.nextSibling) n.push(t);
	}
}
function Ym(e, t) {
	t.style.getPropertyValue(Eo) === "nowrap" && e.style.getPropertyValue(Eo) !== "nowrap" && t.parentElement?.style.getPropertyValue(Eo) !== "nowrap" && t.style.removeProperty(Eo);
}
var Xm = {
	attempts: 0,
	served: 0,
	reconciled: 0
};
async function Zm(e, t, n, r = null) {
	Xm.attempts++;
	let i = t.retained, a = [];
	if (i?.clone && i.nodeMap) {
		i.clone.matches(Pu) && a.push(e);
		for (let e of i.clone.querySelectorAll(Pu)) {
			let t = i.nodeMap.get(e);
			t?.isConnected && a.push(t);
		}
	}
	let o = a.length ? Fu(e, null, a) : null;
	try {
		let i = await Qm(e, t, n, r);
		return i && Xm.served++, i;
	} catch {
		return null;
	} finally {
		o?.();
	}
}
async function Qm(e, t, n, r) {
	let i = t.retained;
	if (!i || !i.clone || !i.styleMap || !i.srcToClone || n.reconcile || n.clip || n.captureSelection || i.clipWindow || e.scrollTop || e.scrollLeft || Rm(e) || Bm(i) || i.fontsCSS || bp(n)) return null;
	for (let e of n.plugins || []) if (e && (typeof e.beforeSnap == "function" || typeof e.beforeClone == "function" || typeof e.resolveNode == "function" || typeof e.afterClone == "function")) return null;
	if (i.classPrefixCSS && (i.classPrefixCSS.includes("::marker") || i.classPrefixCSS.includes("::first-line")) || n.excludeMode === "remove") return null;
	let a = e.ownerDocument || document, o = Qa(e);
	if (!o || Xa(a)) return null;
	let s = [];
	e: for (let n of t.dirtyRoots) {
		if (!n.isConnected || n === e || !e.contains(n)) return null;
		for (let r of t.dirtyRoots) if (r !== n && r !== e && r.contains(n)) continue e;
		s.push(n);
	}
	if (!s.length) return null;
	let c = i.marginZeroed;
	if (!c) return null;
	let l = s.filter((e) => !(Lm.test(i.styleMap.get(i.srcToClone.get(e)) || "") && /^(?:absolute|fixed)$/.test(getComputedStyle(e).position)));
	if (l.length) {
		if (l.some((t) => t.parentElement === e)) return null;
		let t = Lr(e, null);
		if (t.length !== c.length || t.some((e, t) => e !== c[t])) return null;
	}
	let u = c.indexOf(null), d = Pl(n, i);
	d.animated = r;
	let f = [];
	for (let e of s) {
		if (e.matches?.(Im) || e.querySelector?.(Im) || Vm(e, o)) return null;
		let t = i.srcToClone.get(e);
		if (!t || !t.parentNode) return null;
		let r = /* @__PURE__ */ new Map(), a = Fl(d, n, r), s = Vf(e, null), l = Fu(e), p;
		try {
			p = await Cl(e, a, n);
		} finally {
			l(), s();
		}
		if (!p || p.nodeType !== 1 || p.querySelector?.("style[data-sd]") || (await Eu(e, p, a, n), a.pseudoCSS) || a.usesPlaceholder && !i.classPrefixCSS?.includes("[data-sd-ph]")) return null;
		if (await yd(p, n, r, {
			session: d,
			rootTransform: i.rootTransform2D
		}), await wc(p, a), c.length > 1) for (let [e, t] of r) {
			let n = c.indexOf(t);
			n !== -1 && (n < u && (e.style.marginTop = "0px"), c.lastIndexOf(t) > u && (e.style.marginBottom = "0px"));
		}
		zr(p);
		try {
			await Xl(p, e, r);
		} catch {}
		try {
			$l([p, ...p.querySelectorAll("*")], i.styleMap, r, n.__iconMatchers);
		} catch {}
		if (await Promise.all([Ld(p, n, d), Kd(e, p, i.styleCache, n, r, i.plainBg)]), n.compress) try {
			await Td(p, n, r, {
				session: d,
				rootTransform: i.rootTransform2D
			});
		} catch {}
		for (let [e, t] of r.entries()) Nd(e, t, r, i.styleCache);
		t.replaceWith(p), Jm(t, i), f.push(p, ...p.querySelectorAll("*"));
		for (let [e, t] of r.entries()) i.nodeMap.set(e, t), i.srcToClone.set(t, e);
	}
	let p = Fl(d, n, d.nodeMap), m = /* @__PURE__ */ new WeakSet(), h = /* @__PURE__ */ new Set(), g = (t) => {
		for (let n = t.parentElement; n && !h.has(n) && (h.add(n), n !== e); n = n.parentElement);
	};
	s.forEach(g);
	let _ = new Set(s), v = !1;
	for (let [t, r] of i.nodeMap.entries()) {
		if (!r || r.nodeType !== 1 || !r.isConnected) continue;
		let a = i.styleMap.get(t);
		if (!a) continue;
		let o = Km(a);
		if (!o) continue;
		let s = null, l = !1;
		for (let e in o) {
			s ||= getComputedStyle(r);
			let t = s.getPropertyValue(e);
			if (e === "min-width" && (t === "auto" || t === "0px" && o[e] !== "0px" && s.display.startsWith("table") && !Lm.test(a)) && !m.has(r.parentElement)) {
				let e = parseFloat(s.width);
				s.boxSizing !== "border-box" && a.includes("box-sizing:border-box") && (e += [
					"padding-left",
					"padding-right",
					"border-left-width",
					"border-right-width"
				].reduce((e, t) => e + (parseFloat(s.getPropertyValue(t)) || 0), 0)), t = `${e}px`;
			}
			if (!Um(t, o[e])) {
				l = !0;
				break;
			}
		}
		if (!l && !Cs(r, s || getComputedStyle(r)) && (l = !0), l || o.width || o["min-width"] || Ss(r, s || getComputedStyle(r)) || (l = !0), l) {
			if (d.compressedAssets?.has(t)) return null;
			m.add(r), h.add(r), g(r), _.add(r), Xm.reconciled++;
			let i = r === e ? t.style.cssText : null;
			if (Ym(r, t), f.push(t), await Ns(r, t, p, n), i !== null && t.style.cssText !== i) return null;
			c.includes(r) && (v = !0);
		}
	}
	for (let e of h) {
		if (!e.isConnected || !getComputedStyle(e).display.includes("flex")) continue;
		let t = [], r = !1;
		for (let n = e.firstElementChild; n; n = n.nextElementSibling) {
			let e = i.srcToClone.get(n), a = e && !_.has(n) && i.styleMap.get(e);
			if (!a) continue;
			t.push(n);
			let o = !r && Km(a)?.["min-width"];
			o && o !== "0px" && getComputedStyle(n).minWidth === "auto" && (r = !0);
		}
		if (r !== Ds(e, p)) for (let e of t) Ym(e, i.srcToClone.get(e)), f.push(i.srcToClone.get(e)), await Ns(e, i.srcToClone.get(e), p, n), c.includes(e) && (v = !0);
	}
	v && Lr(e, i.clone, i.nodeMap);
	let y = i.keyToClass, b = i.classCSS, x = !y;
	for (let e = 0; !x && e < f.length; e++) {
		let t = i.styleMap.get(f[e]);
		t && !y.has(t) && (x = !0);
	}
	x && (y = i.keyToClass = lt(i.styleMap), b = i.classCSS = (i.classPrefixCSS || "") + Array.from(y.entries()).map(([e, t]) => `.${t}{${e}}`).join(""));
	for (let e of x ? i.styleMap.keys() : f) {
		let t = i.styleMap.get(e);
		t !== void 0 && (qm(e), jd(e, t, y));
	}
	if (Qa(e) !== o) return null;
	Hu(i.clone, d.compressedAssets);
	let S = await Am({
		element: e,
		options: n,
		plugins: n.plugins,
		clone: i.clone,
		classCSS: b,
		styleCache: i.styleCache,
		nodeMap: i.nodeMap
	}, {
		clipWindow: null,
		outerTransforms: i.outerTransforms,
		outerShadows: i.outerShadows,
		rootTransform2D: i.rootTransform2D,
		fontsCSS: i.fontsCSS || "",
		universe: o,
		session: d,
		signatures: null
	});
	return d.compressedSnapshot = Vu(i.clone, d.compressedAssets), i.compressedAssets = d.compressedAssets, i.compressionDensity = d.compressionDensity, S ? {
		url: S,
		session: d
	} : null;
}
D(), G(), V();
var $m = /* @__PURE__ */ new WeakMap(), eh = /* @__PURE__ */ new WeakMap(), th = /* @__PURE__ */ new WeakSet(), nh = /* @__PURE__ */ new WeakMap(), rh = 64, ih = /* @__PURE__ */ new Map(), ah = [
	"scroll",
	"input",
	"change",
	"focusin",
	"focusout",
	"pointerdown",
	"pointerup",
	"pointercancel",
	"keydown",
	"keyup",
	"beforetoggle",
	"toggle"
], oh = [
	"(prefers-color-scheme: dark)",
	"(prefers-reduced-motion: reduce)",
	"(prefers-contrast: more)",
	"(forced-colors: active)",
	"(inverted-colors: inverted)",
	"(prefers-reduced-transparency: reduce)",
	"(hover: hover)",
	"(any-hover: hover)",
	"(pointer: coarse)",
	"(any-pointer: coarse)",
	"(color-gamut: p3)",
	"(dynamic-range: high)"
];
function sh(e) {
	let t = e?.defaultView;
	return typeof t?.matchMedia == "function" ? oh.map((e) => {
		try {
			return t.matchMedia(e).matches ? "1" : "0";
		} catch {
			return "?";
		}
	}).join("") : "";
}
function ch(e) {
	let t = [];
	for (let n = e; n;) {
		try {
			let e = n.getBoundingClientRect();
			t.push(e.x, e.y, e.width, e.height);
		} catch {
			t.push("?");
		}
		n = n.parentElement ? n.parentElement : x(n) || null;
	}
	return t.join("|");
}
function lh(e, t) {
	if (t.disposed || (ih.delete(e), ih.set(e, t), ih.size <= rh)) return;
	let [n, r] = ih.entries().next().value;
	uh(n, r);
}
function uh(e, t) {
	t.disposed = !0, ih.delete(e), $m.delete(e);
	for (let e of t.observers) try {
		e.disconnect();
	} catch {}
	for (let n of ah) e.removeEventListener(n, t.onMediaDirty, !0);
	for (let e of t.trackedShadowRoots.keys()) for (let n of ph) e.removeEventListener(n, t.onMediaDirty, !0);
	for (let [e, n] of t.trackedImages) e.removeEventListener("load", n), e.removeEventListener("error", n);
	t.trackedImages.clear(), t.trackedShadowRoots.clear(), t.images.length = 0, t.controls.length = 0, t.scrollNodes.length = 0, t.observers.length = 0, t.last = null, t.retained = null, t.retainedFrameDriven = !1;
}
function dh(e) {
	if (th.has(e)) return !1;
	eh.delete(e);
	let t = [e], n = [], r = [];
	for (let e = 0; e < t.length; e++) {
		let i = t[e], a = [];
		i?.nodeType === 1 && a.push(i);
		try {
			a.push(...i.querySelectorAll("*"));
		} catch {
			return !1;
		}
		for (let e of a) {
			if (We(e)) continue;
			e.shadowRoot && t.push(e.shadowRoot);
			let i = String(e.localName || e.tagName || "").toLowerCase();
			if (/^(?:iframe|canvas|video|audio|object|embed|marquee|blink)$/.test(i) || i === "progress" && !e.hasAttribute("value") || /^(?:animate|animatetransform|animatemotion|set)$/.test(i)) return !1;
			let a = "";
			if (i === "img") {
				r.push(e);
				try {
					a = e.currentSrc || e.src || "";
				} catch {}
			}
			/^(?:input|textarea|select|option)$/.test(i) && n.push(e);
			let o = e.getAttribute?.("style") || "", s = nh.get(e);
			if (a || o) {
				if (s && s.src === a && s.style === o || (s = {
					src: a,
					style: o,
					animated: Sh(a) || Sh(o)
				}, nh.set(e, s)), s.animated) return !1;
			} else s && nh.delete(e);
		}
	}
	return eh.set(e, {
		roots: t.slice(1),
		controls: n,
		images: r
	}), !0;
}
function fh(e, t) {
	if (!e.querySelectorAll) return !1;
	let n = eh.get(e), r = new Set(n?.roots || []);
	if (n && (t.controls = n.controls, t.scannedImages = n.images), !n) {
		let t = [e];
		for (let e = 0; e < t.length; e++) {
			let n = t[e];
			n.shadowRoot && !r.has(n.shadowRoot) && (r.add(n.shadowRoot), t.push(n.shadowRoot));
			for (let e of n.querySelectorAll("*")) e.shadowRoot && !r.has(e.shadowRoot) && (r.add(e.shadowRoot), t.push(e.shadowRoot));
		}
	}
	for (let [e, n] of t.trackedShadowRoots) if (!r.has(e)) {
		try {
			n.disconnect();
		} catch {}
		for (let n of ph) e.removeEventListener(n, t.onMediaDirty, !0);
		t.trackedShadowRoots.delete(e);
		let r = t.observers.indexOf(n);
		r >= 0 && t.observers.splice(r, 1);
	}
	for (let e of r) if (!t.trackedShadowRoots.has(e)) try {
		let n = new MutationObserver(t.markDirty);
		n.observe(e, {
			subtree: !0,
			childList: !0,
			attributes: !0,
			characterData: !0,
			attributeOldValue: !0,
			characterDataOldValue: !0
		}), n.__flush = t.markDirty, t.observers.push(n), t.trackedShadowRoots.set(e, n);
		for (let n of ph) e.addEventListener(n, t.onMediaDirty, {
			capture: !0,
			passive: !0
		});
		t.retained && t.dirtyAll();
	} catch {}
	return !!n;
}
var ph = [
	"scroll",
	"change",
	"beforetoggle",
	"toggle"
];
function mh(e, t) {
	return [e, ...t.trackedShadowRoots.keys()];
}
function hh(e, t) {
	let n = t.scannedImages;
	if (t.scannedImages = null, !n) {
		n = [], e.tagName === "IMG" && n.push(e);
		for (let r of mh(e, t)) r.querySelectorAll && n.push(...r.querySelectorAll("img"));
	}
	if (t.images = n, t.trackedImages.size) {
		let e = new Set(n);
		for (let [n, r] of t.trackedImages) e.has(n) || (n.removeEventListener("load", r), n.removeEventListener("error", r), t.trackedImages.delete(n));
	}
	for (let e of n) {
		if (e.complete || t.trackedImages.has(e)) continue;
		let n = () => {
			t.capturing && (t.torn = !0), t.dirty = !0, t.dirtyRoots = null, e.removeEventListener("load", n), e.removeEventListener("error", n), t.trackedImages.delete(e);
		};
		t.trackedImages.set(e, n), e.addEventListener("load", n), e.addEventListener("error", n);
	}
}
function gh(e) {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
	for (let i of e) if (fn(i)) {
		if (i.type === "attributes") {
			let e = t.get(i.target);
			e || t.set(i.target, e = /* @__PURE__ */ new Map()), e.has(i.attributeName) || e.set(i.attributeName, i.oldValue);
		} else if (i.type === "characterData") n.has(i.target) || n.set(i.target, i.oldValue);
		else if (i.type === "childList") {
			let e = r.get(i.target);
			e || r.set(i.target, e = /* @__PURE__ */ new Map());
			for (let t of i.addedNodes) {
				if (t.nodeType !== 3) return !0;
				e.set(t.data, (e.get(t.data) || 0) + 1);
			}
			for (let t of i.removedNodes) {
				if (t.nodeType !== 3) return !0;
				e.set(t.data, (e.get(t.data) || 0) - 1);
			}
		} else return !0;
	}
	for (let [e, n] of t) for (let [t, r] of n) if (e.getAttribute(t) !== r) return !0;
	for (let [e, t] of n) if (e.data !== t) return !0;
	for (let e of r.values()) for (let t of e.values()) if (t !== 0) return !0;
	return !1;
}
var _h = /(?:^data:image\/(?:gif|apng)|\.(?:gif|apng)(?=[?#)'"\s;]|$))/i, vh = (e) => e && (typeof e == "object" || typeof e == "function") ? Bh(e) : "-";
function yh(e, t = 131072) {
	if (e = String(e || "").trim(), !/^data:/i.test(e)) return "";
	let n = e.indexOf(",");
	if (n < 0) return "";
	let r = e.slice(0, n), i = e.slice(n + 1);
	try {
		if (/;base64/i.test(r)) {
			let e = Math.ceil(t / 3) * 4;
			return atob(i.slice(0, e - e % 4));
		}
		return i.slice(0, t * 3).replace(/%([0-9a-f]{2})/gi, (e, t) => String.fromCharCode(parseInt(t, 16))).slice(0, t);
	} catch {
		return "";
	}
}
function bh(e) {
	let t = (e.match(/^data:([^;,]+)/i)?.[1] || "").toLowerCase();
	if (t === "image/gif" || t === "image/apng") return !0;
	if (!/image\/(?:png|webp|avif|svg\+xml)/.test(t)) return !1;
	let n = yh(e);
	return t === "image/png" ? n.includes("acTL") : t === "image/webp" ? n.includes("ANIM") || n.includes("ANMF") || n.includes("VP8X") && !!(n.charCodeAt(n.indexOf("VP8X") + 8) & 2) : t === "image/avif" ? n.includes("avis") : /<(?:animate|animateTransform|animateMotion|set)\b|@keyframes\b|animation(?:-name)?\s*:/i.test(n);
}
function xh(e) {
	let t = String(e || "").trim();
	if (!t) return !1;
	let n = /^data:[^,]*;base64,/i.exec(t);
	return _h.test(n ? n[0] : t) ? !0 : /^data:/i.test(t) ? bh(t) : !1;
}
function Sh(e) {
	if (!e) return !1;
	let t = String(e);
	if (xh(t)) return !0;
	if (/^\s*data:[^,]*;base64,/i.test(t) || !/url\(/i.test(t)) return !1;
	for (let e of t.matchAll(/url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^)]*))\s*\)/gi)) if (xh(e[1] ?? e[2] ?? e[3])) return !0;
	return !1;
}
function Ch(e, t = null) {
	let n = e && e.clone;
	if (!n) return !1;
	let r = t ? t.map((t) => e.srcToClone?.get(t)).filter(Boolean) : [n], i = /* @__PURE__ */ new Set(), a = (t) => {
		if (Sh(t.getAttribute?.("src")) || Sh(t.getAttribute?.("href")) || Sh(t.getAttribute?.("style"))) return !0;
		let n = e.styleMap?.get(t);
		return !n || i.has(n) ? !1 : (i.add(n), Sh(n));
	};
	for (let e of r) {
		if (e.nodeType === 1 && a(e)) return !0;
		let t;
		try {
			t = e.querySelectorAll("*");
		} catch {
			continue;
		}
		for (let e of t) if (a(e)) return !0;
	}
	return !1;
}
function wh(e, t) {
	let n = [], r = /* @__PURE__ */ new Set(), i = (e) => {
		e && !r.has(e) && (r.add(e), n.push(e));
	};
	e.matches?.("input,textarea,select,option") && i(e);
	for (let n of mh(e, t)) try {
		for (let e of n.querySelectorAll("input,textarea,select,option")) i(e);
	} catch {}
	t.controls = n;
}
var Th = /^(?:INPUT|TEXTAREA|SELECT)$/, Eh = /^(?:visible|clip)$/, Dh = /(?:^|;)overflow(?:-[xy])?:(?!visible|clip)/;
function Oh(e, t) {
	let n = [], r = t.retained, i = mh(e, t), a = i.length === 1 ? ao(e) : null, o = !r && !a && !W() && !U(), s = (e, t = !1) => {
		try {
			if (t) {
				n.push(e);
				return;
			}
			let i = Th.test(e.tagName);
			if (r && !i) {
				let t = r.styleMap.get(r.srcToClone.get(e));
				if (t !== void 0 && !Dh.test(t)) return;
			}
			if (o && !Me.has(e.localName)) {
				let t = getComputedStyle(e);
				if (Eh.test(t.overflowX) && Eh.test(t.overflowY)) return;
			}
			if (e.scrollLeft || e.scrollTop) {
				n.push(e);
				return;
			}
			if ((e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight) && (e.clientWidth || e.clientHeight || getComputedStyle(e).display !== "inline")) {
				let t = i ? null : getComputedStyle(e);
				t && Eh.test(t.overflowX) && Eh.test(t.overflowY) || n.push(e);
			}
		} catch {}
	};
	for (let t = e; t; t = t.parentElement) s(t, !0);
	for (let e of i) try {
		for (let t of e.querySelectorAll(a || "*")) s(t);
	} catch {}
	t.scrollNodes = n;
}
function kh(e, t) {
	let n = e.ownerDocument || document, r = n.defaultView, i = [
		r?.location?.hash || "",
		sh(n),
		r?.innerWidth || 0,
		r?.innerHeight || 0,
		r?.devicePixelRatio || 1,
		r?.screen?.orientation?.type || ""
	];
	try {
		i.push(...[...n.adoptedStyleSheets || []].map(vh));
	} catch {}
	for (let e of t.trackedShadowRoots.keys()) try {
		i.push("#shadow", ...[...e.adoptedStyleSheets || []].map(vh));
	} catch {}
	let a = n.activeElement, o = n.fullscreenElement;
	(a?.contains(e) || e.contains(a)) && i.push(vh(a)), (o?.contains(e) || e.contains(o)) && i.push(vh(o));
	let s = [r?.scrollX || 0, r?.scrollY || 0];
	for (let e of t.scrollNodes) s.push(e.scrollLeft || 0, e.scrollTop || 0);
	let c = [];
	for (let e of t.controls) Ah(e, c);
	let l = [];
	for (let e of t.images) {
		let t = "";
		try {
			t = e.currentSrc || e.src || "";
		} catch {}
		l.push(t, +!!e.complete, e.naturalWidth || 0, e.naturalHeight || 0);
	}
	return {
		style: i.join("|"),
		scroll: s.join("|"),
		controls: c,
		images: l,
		frameDriven: t.retainedFrameDriven
	};
}
function Ah(e, t) {
	let n = String(e.localName || "").toLowerCase();
	n === "input" ? t.push(e.type, h(e) ? e.value.length : e.value, +!!e.checked, +!!e.indeterminate) : n === "textarea" ? t.push(e.value) : n === "select" ? t.push(e.selectedIndex, e.value) : t.push(+!!e.selected);
}
var jh = /* @__PURE__ */ new WeakMap();
function Mh(e) {
	let t = [];
	e.matches?.("input,textarea,select,option") && Ah(e, t);
	for (let n of e.querySelectorAll?.("input,textarea,select,option") || []) Ah(n, t);
	let n = jh.get(e);
	jh.set(e, t), t.length && (!n || n.length !== t.length || n.some((e, n) => e !== t[n])) && Jo(e);
}
function Nh(e, t, n) {
	if (!e) return !1;
	let r = e[n], i = t[n];
	if (r === i) return !0;
	if (!Array.isArray(r) || r.length !== i.length) return !1;
	for (let e = 0; e < r.length; e++) if (r[e] !== i[e]) return !1;
	return !0;
}
function Ph(e, t) {
	let n = /* @__PURE__ */ new Set();
	for (let r of mh(e, t)) try {
		let e = r.getAnimations?.(r.nodeType === 1 ? { subtree: !0 } : void 0) || [];
		for (let t of e) n.add(t);
	} catch {}
	return [...n];
}
function Fh(e) {
	return e.map((e) => [
		vh(e),
		e.playState,
		Math.round((Number(e.currentTime) || 0) * 10),
		e.playbackRate
	].join(":")).join("|");
}
function Ih(e, t, n) {
	if (!n || n.nodeType !== 1) return null;
	if (n === e || e.contains(n)) return e;
	for (let e of t.trackedShadowRoots.keys()) if (e.contains(n)) return e;
	return null;
}
function Lh(e) {
	let t = {
		dirty: !0,
		pending: [],
		torn: !1,
		dirtyRoots: /* @__PURE__ */ new Set(),
		retained: null,
		retainedFrameDriven: !1,
		disposed: !1,
		capturing: !1,
		last: null,
		inflight: Promise.resolve(),
		observers: [],
		trackedShadowRoots: /* @__PURE__ */ new Map(),
		trackedImages: /* @__PURE__ */ new Map(),
		images: [],
		scannedImages: null,
		scrollNodes: [],
		controls: [],
		envEpoch: gn(),
		styleEpoch: _n(),
		styleStamp: vn(e),
		outsideMutations: mn(e),
		geometry: null,
		renderState: null
	}, n = () => {
		t.dirty = !0, t.dirtyRoots = null;
	}, r = (n) => {
		if (!t.dirtyRoots) return;
		let r = n && (n.nodeType === 1 ? n : n.parentElement);
		!r || r === e || !e.contains(r) || t.dirtyRoots.size >= 12 ? t.dirtyRoots = null : t.dirtyRoots.add(r);
	}, i = (e) => {
		if (t.capturing) for (let n of e) t.pending.push(n);
		else for (let n of e) fn(n) && (t.dirty = !0, r(n.target));
	}, a = () => {
		t.capturing ? t.torn = !0 : n();
	};
	t.dirtyAll = n;
	try {
		let n = new MutationObserver(i);
		n.observe(e, {
			subtree: !0,
			childList: !0,
			attributes: !0,
			characterData: !0,
			attributeOldValue: !0,
			characterDataOldValue: !0
		}), n.__flush = i, t.observers.push(n);
	} catch {}
	t.markDirty = i, t.onMediaDirty = a;
	try {
		for (let t of ah) e.addEventListener(t, a, {
			capture: !0,
			passive: !0
		});
	} catch {}
	return fh(e, t) || wh(e, t), Oh(e, t), hh(e, t), t;
}
var Rh = 0, zh = /* @__PURE__ */ new WeakMap();
function Bh(e) {
	let t = zh.get(e);
	return t || (t = "@" + ++Rh, zh.set(e, t)), t;
}
function Vh(e, t) {
	let n = typeof e;
	if (n === "undefined") return null;
	if (e === null || n === "boolean" || n === "number" || n === "string") return JSON.stringify(e);
	if (n === "function" || n === "symbol") return n === "symbol" ? null : JSON.stringify(Bh(e));
	if (n !== "object") return null;
	if (typeof e.nodeType == "number") return JSON.stringify(Bh(e));
	if (t.has(e)) return null;
	t.add(e);
	try {
		if (Array.isArray(e)) {
			let n = [];
			for (let r of e) {
				let e = Vh(r, t);
				if (e === null) return null;
				n.push(e);
			}
			return "[" + n.join(",") + "]";
		}
		let n = Object.getPrototypeOf(e);
		if (n !== Object.prototype && n !== null) return JSON.stringify(Bh(e));
		let r = [];
		for (let n of Object.keys(e).sort()) {
			let i = e[n];
			if (i === void 0) continue;
			let a = Vh(i, t);
			if (a === null) return null;
			r.push(JSON.stringify(n) + ":" + a);
		}
		return "{" + r.join(",") + "}";
	} finally {
		t.delete(e);
	}
}
function Hh(e, t) {
	let { burst: n, invalidate: r, ...i } = e || {};
	try {
		let e = Vh(i, /* @__PURE__ */ new Set());
		return e === null ? null : `${(t || []).map(vh).join(",")}:${e}`;
	} catch {
		return null;
	}
}
function Uh(e, t, n, r, i = null) {
	let a = $m.get(e);
	a || (a = Lh(e), a.baselineSignature = Hh(t, n.plugins), $m.set(e, a));
	let o = Hh(t, n.plugins), s = async () => {
		if (await Zt(), a.disposed) return r();
		let t = o === null || o !== a.baselineSignature;
		t && o !== null ? a.pendingSig === o ? (a.baselineSignature = o, a.last = null, a.dirty = !0, a.dirtyRoots = null, a.pendingSig = null, t = !1) : a.pendingSig = o : a.pendingSig = null, fh(e, a), eh.delete(e), hh(e, a);
		for (let e of a.observers) e.__flush(e.takeRecords());
		In();
		let s = mn(e);
		a.dirty && a.outsideMutations !== s && a.dirtyAll(), a.outsideMutations = s;
		let c = e.getRootNode?.(), l = [...a.trackedShadowRoots.keys()];
		c?.nodeType === 11 && !l.includes(c) && l.push(c), Fn(e.ownerDocument || document, l);
		let u = vn(e);
		a.styleStamp !== u && (a.styleStamp = u, a.dirty || a.dirtyAll());
		let d = kh(e, a), f = Ph(e, a);
		d.animation = Fh(f), a.renderState && (!Nh(a.renderState, d, "style") && (yn(), a.dirtyAll()), Nh(a.renderState, d, "scroll") || a.dirtyAll(), Nh(a.renderState, d, "controls") || (Jo(e), a.dirtyAll()), !Nh(a.renderState, d, "images") && !a.dirty && a.dirtyAll());
		let p = gn();
		a.envEpoch !== p && (a.dirtyAll(), a.envEpoch = p);
		let m = _n();
		if (a.styleEpoch !== m && (a.styleEpoch = m, !a.dirty)) {
			let t = ch(e);
			a.geometry !== null && t !== a.geometry && (Jo(e), a.dirtyAll()), a.geometry = t;
		}
		n.invalidate && a.dirtyAll();
		let h = !1, g = null, _ = !!a.renderState && !Nh(a.renderState, d, "animation");
		try {
			let t = /* @__PURE__ */ new Set();
			_ && f.length === 0 && (t = null);
			for (let n of f) {
				let r = n.playState === "running";
				if (!r && !_) continue;
				r && (h = !0), _ = !0;
				let i = n.effect?.target;
				if (Ih(e, a, i) === e) t.add(i);
				else {
					t = null;
					break;
				}
			}
			if (_ && t && t.size && a.retained) {
				a.dirty = !0, g = t;
				for (let e of t) a.dirtyRoots && a.dirtyRoots.add(e), Jo(e);
			} else _ && !t && a.dirtyAll();
		} catch {}
		let v = d.frameDriven, y = h || v;
		if (y && (a.last = null), v && a.dirtyAll(), !t && !y && !a.dirty && a.last) return lh(e, a), a.last;
		a.capturing = !0;
		let b = null, x = null;
		try {
			let o = null, c = !1, l = null;
			if (!t && a.dirty && a.retained && a.dirtyRoots && a.dirtyRoots.size && i) {
				l = [...a.dirtyRoots];
				let t = await Zm(e, a, n, Yo(f));
				t && (o = await i(t.url, t.session), c = !0);
			}
			if (o ||= (x = Pl(n), t || (x.retain = (e) => {
				let t = /* @__PURE__ */ new Map();
				for (let [n, r] of e.nodeMap.entries()) t.set(r, n);
				b = {
					...e,
					srcToClone: t,
					usesBackdropFilter: void 0
				};
			}), x.tornSinceStart = () => {
				for (let e of a.observers) for (let t of e.takeRecords()) a.pending.push(t);
				return In(), a.torn || gh(a.pending) || mn(e) !== s;
			}, await r(x)), !t && !a.disposed) {
				if (a.dirty = !1, a.dirtyRoots = /* @__PURE__ */ new Set(), b) a.retained = b, a.retainedFrameDriven = Ch(b), wh(e, a), Oh(e, a);
				else if (c) {
					a.retainedFrameDriven ||= Ch(a.retained, l), wh(e, a), Oh(e, a);
					for (let e of g || []) Jo(e);
				}
				let t = kh(e, a);
				t.animation = Fh(Ph(e, a));
				let n = [
					"style",
					"scroll",
					"controls",
					"images"
				];
				h || n.push("animation");
				let r = n.every((e) => Nh(d, t, e));
				a.renderState = t, a.styleEpoch = _n(), a.styleStamp = vn(e), a.geometry = ch(e), a.renderState.frameDriven ? (th.add(e), uh(e, a)) : r ? !y && !a.renderState.frameDriven && (a.last = o, lh(e, a)) : (a.dirtyAll(), a.last = null);
			}
			return o;
		} finally {
			x && (x.retain = null, x.tornSinceStart = null);
			for (let e of a.observers) for (let t of e.takeRecords()) a.pending.push(t);
			In();
			let t = mn(e);
			(a.torn || gh(a.pending) || t !== s) && (a.dirtyAll(), a.last = null), a.outsideMutations = t, a.styleEpoch = _n(), a.styleStamp = vn(e), a.pending.length = 0, a.torn = !1, a.capturing = !1, a.disposed || hh(e, a);
		}
	}, c = a.inflight.then(s, s);
	return a.inflight = c.catch(() => {}), c;
}
var Wh = null;
function Gh(e) {
	Wh = e;
}
var Kh = "button, a[href], [role=\"button\"], input, select, summary, label, [tabindex]", qh = !1, Jh = null, Yh = /* @__PURE__ */ new WeakMap(), Xh = !1;
function Zh(e, t) {
	!qh || !Jh || t && t.burst === !1 || Yh.set(Jh.control, {
		element: e,
		options: t && typeof t == "object" ? { ...t } : t
	});
}
function Qh(e) {
	let t = { control: e };
	Jh = t, setTimeout(() => {
		Jh === t && (Jh = null);
	}, 0);
}
function $h(e) {
	let t = e.target, n = t && (t.nodeType === 1 ? t : t.parentElement);
	return n && n.closest ? n.closest(Kh) : null;
}
function eg(e) {
	if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
	let t = $h(e);
	t && (Qh(t), ng(e, !1));
}
function tg(e) {
	let t = $h(e);
	t && Qh(t);
}
function ng(e, t = !0) {
	if (!Wh || document.visibilityState === "hidden") return;
	let n = $h(e);
	if (!n || e.type === "pointerenter" && e.target !== n) return;
	let r = Yh.get(n);
	if (r) {
		if (!r.element.isConnected) {
			Yh.delete(n);
			return;
		}
		Wh(r.element, r.options).catch(() => {});
	} else t && !Xh && (Xh = !0, Wh(document.body, {
		clip: "viewport",
		burst: !1
	}).catch(() => {}));
}
function rg() {
	if (qh || typeof document > "u" || typeof document.addEventListener != "function") return;
	qh = !0;
	let e = {
		capture: !0,
		passive: !0
	};
	document.addEventListener("pointerdown", eg, e), document.addEventListener("keydown", eg, e), document.addEventListener("click", tg, e), document.addEventListener("pointerenter", ng, e), document.addEventListener("focusin", ng, e);
}
V(), D();
function ig(...e) {
	return up(...e), $;
}
async function ag(e, t) {
	if (typeof e != "string" || !e.trim()) throw Error("[SnapDOM] fromString() needs an HTML string.");
	let n = document.createElement("div");
	B(n), n.style.cssText = "position:fixed;left:-99999px;top:0;pointer-events:none;", n.innerHTML = e, document.body.appendChild(n);
	try {
		await qt();
		let e = Array.from(n.childNodes).some((e) => e.nodeType === 3 && e.textContent.trim());
		return await cg(n.children.length === 1 && !e ? n.firstElementChild : n, {
			...t || {},
			burst: !1
		});
	} finally {
		n.remove();
	}
}
var $ = Object.assign(cg, {
	plugins: ig,
	fromString: ag,
	version: "3.8.3",
	preCapture: rg
});
Gh(cg);
var og = Symbol("snapdom.internal"), sg = /* @__PURE__ */ new Set([
	"png",
	"jpeg",
	"jpg",
	"webp",
	"svg"
]);
async function cg(e, t) {
	if (!e) throw Error("[SnapDOM] The element cannot be null or undefined.");
	let n = Fm(t);
	n.element = e, n.invalidate && yn(), _p(n, t && t.plugins);
	let { stage: r, loweredBy: i } = ip(n);
	n.needs = r, n.__needsLoweredBy = i;
	let a = ap(r, "render"), o = n.burst === !0 || !bp(n), s = typeof n.filter == "function" || !!n.excludePredicates || typeof n.excludeStyleProps == "function" || typeof n.fallbackURL == "function", c = a && !n.captureSelection && n.burst !== !1 && o && !s && dh(e);
	return c && Zh(e, t), n.snap ||= {
		toPng: (e, t) => $.toPng(e, t),
		toSvg: (e, t) => $.toSvg(e, t)
	}, c ? Uh(e, t, n, (t) => $.capture(e, n, og, t), (e, t) => ug(e, n, t)) : (await Zt(), Mh(e), $.capture(e, n, og));
}
$.capture = async (e, t, n, r = Pl(t)) => {
	if (n !== og) throw Error("[SnapDOM] snapdom.capture() is internal; use snapdom(el).");
	if (ap(t.needs || "render", "render") && U()) {
		if (t.embedFonts) try {
			let n = e.ownerDocument || document, i = null;
			if (t.embedFonts === "auto" && (e.getBoundingClientRect(), i = gf(n).drawn, i.size === 0)) throw null;
			let a = Rf(e);
			t.clip || (r.fontUsage = a);
			let o = a.required;
			if (i && (o = new Set([...o].filter((e) => i.has(hf(e).toLowerCase()))), o.size === 0)) throw null;
			await zf(o, a.usedCodepoints, n);
		} catch {}
		let n = Array.from(e.querySelectorAll("canvas"));
		e.tagName === "CANVAS" && n.unshift(e);
		for (let e of n) try {
			if (Tl(e)) continue;
			let t = e.getContext("2d", { willReadFrequently: !0 });
			t && t.getImageData(0, 0, 1, 1);
		} catch (e) {
			K(t, "Couldn't prepare canvases for Safari.", e);
		}
	}
	return ug(await Nm(e, t, r), t, r);
};
var lg = Symbol("editSvg");
async function ug(e, t, n) {
	let r = t.needs || "render", i = ap(r, "render"), a = (e) => sp(r, t.__needsLoweredBy || [], e), o = typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement ? e : null, s = o ? null : e, c = () => s ??= o.toDataURL(), l = o || e;
	o && (e = "");
	let u = n.compressedSnapshot, d = n.compressionDensity;
	n.compressedAssets = null;
	let p, m = t.meta || {}, h = (Number.isFinite(t.width) || Number.isFinite(t.height)) && !U(), g = h ? Number.isFinite(t.width) ? m.targetW / m.vbW : m.targetH / m.vbH : 1, _ = h ? Number.isFinite(t.height) ? m.targetH / m.vbH : m.targetW / m.vbW : 1, v = async (e) => {
		let t = await y(e), n = e[lg];
		if (typeof n != "function" || typeof t != "string") return t;
		let { isSvgDataURL: r, decodeSvgFromDataURL: i, encodeSvgToDataURL: a } = await Promise.resolve().then(() => (Ai(), xi));
		if (!r(t)) return t;
		let o = await n(i(t));
		return typeof o == "string" && o ? a(o) : t;
	}, y = async (e) => {
		if (o || !u?.size) return l;
		let t = m.vbW, n = m.vbH, r = e.crop;
		r && (t = Math.max(1, Math.min(t, r.x + r.width) - Math.max(0, r.x)), n = Math.max(1, Math.min(n, r.y + r.height) - Math.max(0, r.y)));
		let i = Number.isFinite(e.width), a = Number.isFinite(e.height);
		return (i && a ? Math.max(e.width / t, e.height / n) : i ? e.width / t * (r ? Math.max(1, _ / g) : 1) : a ? e.height / n * (r ? Math.max(1, g / _) : 1) : (e.scale || 1) * Math.max(g, _)) * (e.dpr || 1) <= d ? l : p ??= Uu(c(), u);
	}, b = {
		warnings: n.warnings,
		layoutZoom: n.layoutZoom,
		fileSvg: n.fileSvg
	}, x = n.artifacts, S = async (e, t) => {
		let { rasterize: n } = await Promise.resolve().then(() => (ya(), _a));
		return n(l, {
			...e,
			...t || {},
			format: "png"
		}, b);
	}, C = () => {
		if (!i) throw a("svgString");
		if (o) throw Error("[SnapDOM] html-in-canvas makes a raster capture; there is no SVG string.");
		let t = e.indexOf(",");
		return t >= 0 ? f(decodeURIComponent(e.slice(t + 1)), b.fileSvg) : "";
	}, w = (e) => Object.defineProperty({
		...e || {},
		svgString: C
	}, "url", i ? {
		get: c,
		enumerable: !0
	} : {
		get() {
			throw a("export.url");
		},
		enumerable: !1,
		configurable: !0
	}), T = {
		img: async (e, t) => {
			if (o) return S(e, t);
			let { toImg: n } = await Promise.resolve().then(() => (Sa(), ba)), r = {
				...e,
				...t || {}
			};
			return n(await v(r), r, b);
		},
		svg: async (e, t) => {
			if (o) return S(e, t);
			let { toSvg: n } = await Promise.resolve().then(() => (Sa(), ba)), r = {
				...e,
				...t || {}
			};
			return n(await v(r), r, b);
		},
		canvas: async (e, t) => {
			let { toCanvas: n } = await Promise.resolve().then(() => (ga(), Hi)), r = {
				...e,
				...t || {}
			};
			return n(await v(r), r, b);
		},
		blob: async (e, t) => {
			let { toBlob: n } = await Promise.resolve().then(() => (Ga(), Ua)), r = {
				...e,
				...t || {}
			};
			return n(await v(r), r, b);
		},
		png: async (e, t) => {
			let { rasterize: n } = await Promise.resolve().then(() => (ya(), _a)), r = {
				...e,
				...t || {},
				format: "png"
			};
			return n(await v(r), r, b);
		},
		jpeg: async (e, t) => {
			let { rasterize: n } = await Promise.resolve().then(() => (ya(), _a)), r = {
				...e,
				...t || {},
				format: "jpeg"
			};
			return n(await v(r), r, b);
		},
		webp: async (e, t) => {
			let { rasterize: n } = await Promise.resolve().then(() => (ya(), _a)), r = {
				...e,
				...t || {},
				format: "webp"
			};
			return n(await v(r), r, b);
		},
		download: async (e, t) => {
			let { download: n } = await Promise.resolve().then(() => (Ya(), Ka)), r = {
				...e,
				...t || {}
			};
			return n(await v(r), r, b);
		}
	};
	if (!i) for (let e of Object.keys(T)) {
		let t = e === "download" ? "download()" : `to${e.charAt(0).toUpperCase()}${e.slice(1)}()`;
		T[e] = async () => {
			throw a(t);
		};
	}
	let E = {};
	for (let e of [
		"img",
		"svg",
		"canvas",
		"blob",
		"png",
		"jpeg",
		"webp"
	]) E[e] = async (n) => {
		let r = j(e, n || {});
		return delete r.editSvg, typeof n?.editSvg == "function" && (r[lg] = n.editSvg), T[e](t, r);
	};
	E.jpg = E.jpeg, Object.defineProperty(E, "editSvg", { value: !0 });
	let D = (e) => Object.defineProperty({
		...t,
		...e
	}, "options", {
		value: t,
		configurable: !0
	}), O = await pp("defineExports", D({
		artifacts: x,
		export: w(),
		exports: E
	})), k = Object.assign({}, ...O.filter((e) => e && typeof e == "object").reverse()), A = {
		...T,
		...k
	};
	A.jpeg && !A.jpg && (A.jpg = (e, t) => A.jpeg(e, t));
	function j(e, n) {
		let r = n || {}, i = {
			...t,
			...r
		}, a = typeof r.type == "string" ? r.type.toLowerCase() : "", s = typeof r.format == "string" ? r.format.toLowerCase() : sg.has(a) ? a : "";
		return s && (i.format = s === "jpg" ? "jpeg" : s), i.__explicitFormat = s ? i.format : t.__explicitFormat ?? null, e === "blob" && !i.__explicitFormat && (i.format = o ? "png" : "svg"), i.type = i.format, [
			e,
			i.format,
			a
		].map((e) => typeof e == "string" ? e.toLowerCase() : "").find((e) => e === "jpeg" || e === "jpg" || e === "webp") && (i.backgroundColor == null || i.backgroundColor === "transparent") && (i.backgroundColor = "#ffffff"), i.scale !== 1 && (Number.isFinite(i.width) || Number.isFinite(i.height)) && K(i, "scale ignored: width/height already set the size."), i;
	}
	let M = !1, ee = Promise.resolve();
	async function N(e, n) {
		let r = Object.freeze(n && typeof n == "object" ? { ...n } : {}), i = ee.then(async () => {
			let n = A[e];
			if (!n) throw Error(`[SnapDOM] Unknown export type: ${e}`);
			let i = j(e, r), a = D({
				artifacts: x,
				export: w({
					type: e,
					options: i,
					requestedOptions: r
				})
			}), o = i.format, s = i.type;
			await pp("beforeExport", a, {
				format: e,
				options: i
			});
			let c = i.format === o ? i.type === s ? "" : i.type : i.format, l = typeof c == "string" ? c.toLowerCase() : "";
			sg.has(l) && (i.format = l === "jpg" ? "jpeg" : l, i.type = i.format, i.__explicitFormat = i.format, /^(?:jpeg|webp)$/.test(i.format) && (i.backgroundColor == null || i.backgroundColor === "transparent") && (i.backgroundColor = "#ffffff"));
			let u = await n(a, i);
			return await pp("afterExport", a, {
				format: e,
				options: i,
				result: u
			}), M || (M = !0, await fp("afterSnap", t)), u;
		});
		return ee = i.catch(() => {}), i;
	}
	let P = {
		url: e,
		needs: r,
		warnings: b.warnings || [],
		toRaw: () => {
			if (!i) throw a("toRaw()");
			return c();
		},
		to: (e, t) => N(e, t),
		toImg: (e) => N("img", e),
		toSvg: (e) => N("svg", e),
		toCanvas: (e) => N("canvas", e),
		toBlob: (e) => N("blob", e),
		toPng: (e) => N("png", e),
		toJpg: (e) => N("jpg", e),
		toWebp: (e) => N("webp", e),
		download: (e) => N("download", e)
	};
	i ? o && Object.defineProperty(P, "url", {
		get: c,
		enumerable: !0,
		configurable: !0
	}) : Object.defineProperty(P, "url", {
		get() {
			throw a("url");
		},
		enumerable: !1,
		configurable: !0
	}), Object.defineProperty(P, "meta", i ? {
		value: t.meta,
		enumerable: !0
	} : {
		get() {
			throw a("meta");
		},
		enumerable: !1,
		configurable: !0
	});
	for (let e of Object.keys(A)) {
		let t = "to" + e.charAt(0).toUpperCase() + e.slice(1);
		P[t] || (P[t] = (t) => N(e, t));
	}
	return P;
}
$.toRaw = (e, t) => $(e, t).then((e) => e.toRaw()), $.toImg = (e, t) => $(e, t).then((e) => e.toImg()), $.toSvg = (e, t) => $(e, t).then((e) => e.toSvg()), $.toCanvas = (e, t) => $(e, t).then((e) => e.toCanvas()), $.toBlob = (e, t) => $(e, t).then((e) => e.toBlob()), $.toPng = (e, t) => $(e, {
	...t,
	format: "png"
}).then((e) => e.toPng()), $.toJpg = (e, t) => $(e, {
	...t,
	format: "jpeg"
}).then((e) => e.toJpg()), $.toWebp = (e, t) => $(e, {
	...t,
	format: "webp"
}).then((e) => e.toWebp()), $.download = (e, t) => $(e, t).then((e) => e.download());
export { rp as DEFAULT_STAGE, tp as STAGES, op as assertNeeds, mp as clearPlugins, vp as getGlobalPlugins, lp as normalizePlugin, up as registerPlugins, $ as snapdom };

//# debugId=e36ba388-e926-494a-a4dc-fea192dc6332
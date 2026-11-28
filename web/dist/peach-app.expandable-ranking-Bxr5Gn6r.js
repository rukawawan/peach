(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "478b789d-3dc5-4370-8db5-f13d95db0ef0", e._sentryDebugIdIdentifier = "sentry-dbid-478b789d-3dc5-4370-8db5-f13d95db0ef0");
	} catch {}
})();
import { CHART_CARD as e, CategoryTick as t, ChartEmpty as n, ChartHead as r, ChartTip as i, Dot as a, EvilBarChart as o, FillObjectPaint as s, Layer as c, TIP_SURFACE as l, TIP_SWATCH as u, Text as d, TipRow as f, ZIndexLayer as p, __toESM as m, adaptEventsOfChild as h, addAngleAxis as ee, categoryAxisWidth as g, clsx as _, combineAxisTicks as v, combineCategoricalDomain as y, combineConfiguredScale as b, combineGraphicalItemTicks as x, createSelector as S, defaultPolarAngleAxisProps as C, degreeToRadian as w, f1 as T, getAxisTypeBasedOnLayout as E, getClassNameFromUnknown as te, interfaceLanguage as ne, noop as re, pickAxisType as D, polarToCartesian as O, rechartsScaleFactory as ie, removeAngleAxis as ae, require_jsx_runtime as oe, require_react as se, resolveDefaultProps as ce, roundTemplateLiteral as le, selectAngleAxis as k, selectAngleAxisRangeWithReversed as ue, selectChartLayout as A, selectDuplicateDomain as de, selectPolarViewBox as fe, selectRadiusAxis as pe, selectRadiusAxisRangeWithReversed as me, selectRealScaleType as he, selectRenderableAxisSettings as ge, svgPropertiesAndEvents as j, svgPropertiesNoEvents as M, svgPropertiesNoEventsFromUnknown as _e, t as N, tone as ve, useAppDispatch as ye, useAppSelector as P, useIsPanorama as be, usePolarChartLayout as xe, useRechartsTheme as Se } from "./peach-app.js";
import { selectPolarAppliedValues as Ce, selectPolarAxisCheckedDomain as we, selectPolarNiceTicks as Te } from "./peach-app.PolarChart-CeCYLBHr.js";
// node_modules/recharts/es6/shape/Polygon.js
var F = /* @__PURE__ */ m(se()), Ee = [
	"points",
	"className",
	"baseLinePoints",
	"connectNulls"
], De;
function I() {
	return I = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, I.apply(null, arguments);
}
function Oe(e, t) {
	if (e == null) return {};
	var n, r, i = ke(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function ke(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function Ae(e, t) {
	return t ||= e.slice(0), Object.freeze(Object.defineProperties(e, { raw: { value: Object.freeze(t) } }));
}
var L = (e) => e != null && e.x === +e.x && e.y === +e.y, je = function() {
	var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], t = [[]];
	e.forEach((e) => {
		var n = t[t.length - 1];
		L(e) ? n && n.push(e) : n && n.length > 0 && t.push([]);
	});
	var n = e[0], r = t[t.length - 1];
	L(n) && r && r.push(n);
	var i = t[t.length - 1];
	return i && i.length <= 0 && (t = t.slice(0, -1)), t;
}, R = (e, t) => {
	var n = je(e);
	t && (n = [n.reduce((e, t) => [...e, ...t], [])]);
	var r = n.map((e) => e.reduce((e, t, n) => le(De ||= Ae([
		"",
		"",
		"",
		",",
		""
	]), e, n === 0 ? "M" : "L", t.x, t.y), "")).join("");
	return n.length === 1 ? `${r}Z` : r;
}, Me = (e, t, n) => {
	var r = R(e, n);
	return `${r.slice(-1) === "Z" ? r.slice(0, -1) : r}L${R(Array.from(t).reverse(), n).slice(1)}`;
}, z = (e) => {
	var t = e.points, n = e.className, r = e.baseLinePoints, i = e.connectNulls, a = Oe(e, Ee);
	if (!t || !t.length) return null;
	var o = _("recharts-polygon", n);
	if (r && r.length) {
		var s = a.stroke && a.stroke !== "none", c = Me(t, r, i);
		return /*#__PURE__*/ F.createElement("g", { className: o }, /*#__PURE__*/ F.createElement("path", I({}, j(a), {
			fill: c.slice(-1) === "Z" ? a.fill : "none",
			stroke: "none",
			d: c
		})), s ? /*#__PURE__*/ F.createElement("path", I({}, j(a), {
			fill: "none",
			d: R(t, i)
		})) : null, s ? /*#__PURE__*/ F.createElement("path", I({}, j(a), {
			fill: "none",
			d: R(r, i)
		})) : null);
	}
	var l = R(t, i);
	return /*#__PURE__*/ F.createElement("path", I({}, j(a), {
		fill: l.slice(-1) === "Z" ? a.fill : "none",
		className: o,
		d: l
	}));
}, B = (e) => {
	var t = e.fill;
	return typeof t == "object" && t ? /*#__PURE__*/ F.createElement(s, { fill: t }, (t) => /*#__PURE__*/ F.createElement(z, I({}, e, { fill: t }))) : /*#__PURE__*/ F.createElement(z, I({}, e, { fill: t }));
}, V = (e, t, n) => {
	switch (t) {
		case "angleAxis": return k(e, n);
		case "radiusAxis": return pe(e, n);
		default: throw Error(`Unexpected axis type: ${t}`);
	}
}, H = (e, t, n) => {
	switch (t) {
		case "angleAxis": return ue(e, n);
		case "radiusAxis": return me(e, n);
		default: throw Error(`Unexpected axis type: ${t}`);
	}
}, Ne = S([
	V,
	he,
	we,
	H
], b), U = S([Ne], ie), W = S([
	A,
	Ce,
	ge,
	D
], y), G = S([
	A,
	V,
	he,
	U,
	Te,
	H,
	de,
	W,
	D
], v), K = S([G], (e) => {
	if (e) {
		var t = /* @__PURE__ */ new Map();
		return e.forEach((e) => {
			var n = (e.coordinate + 360) % 360;
			t.has(n) || t.set(n, e);
		}), Array.from(t.values());
	}
}), Pe = S([
	A,
	V,
	U,
	H,
	de,
	W,
	D
], x), Fe = ["children", "type"], Ie = ["ref"];
function q() {
	return q = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, q.apply(null, arguments);
}
function J(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Y(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? J(Object(n), !0).forEach(function(t) {
			Le(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : J(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Le(e, t, n) {
	return (t = Re(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Re(e) {
	var t = ze(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function ze(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Be(e, t) {
	if (e == null) return {};
	var n, r, i = Ve(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function Ve(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var He = 1e-5, Ue = Math.cos(w(45)), We = "angleAxis";
function Ge(e) {
	var t = ye(), n = xe(), r = (0, F.useMemo)(() => {
		e.children;
		var t = e.type, r = Be(e, Fe), i = E(n, "angleAxis", t);
		if (i != null) return Y(Y({}, r), {}, { type: i });
	}, [e, n]), i = r === P((e) => k(e, r?.id));
	return (0, F.useEffect)(() => r == null ? re : (t(ee(r)), () => {
		t(ae(r));
	}), [t, r]), i ? e.children : null;
}
var Ke = (e, t) => {
	var n = t.cx, r = t.cy, i = t.radius, a = t.orientation, o = t.tickSize || 8, s = O(n, r, i, e.coordinate), c = O(n, r, i + (a === "inner" ? -1 : 1) * o, e.coordinate);
	return {
		x1: s.x,
		y1: s.y,
		x2: c.x,
		y2: c.y
	};
}, qe = (e, t) => {
	var n = Math.cos(w(-e.coordinate));
	return n > He ? t === "outer" ? "start" : "end" : n < -He ? t === "outer" ? "end" : "start" : "middle";
}, Je = (e) => {
	var t = Math.cos(w(-e.coordinate)), n = Math.sin(w(-e.coordinate));
	return Math.abs(t) <= Ue ? n > 0 ? "start" : "end" : "middle";
}, Ye = (e) => {
	var t = e.cx, n = e.cy, r = e.radius, i = e.axisLineType, o = e.axisLine, s = e.ticks;
	if (!o) return null;
	var c = Y(Y({}, M(e)), {}, { fill: "none" }, M(o));
	if (i === "circle") return /*#__PURE__*/ F.createElement(a, q({ className: "recharts-polar-angle-axis-line" }, c, {
		cx: t,
		cy: n,
		r
	}));
	var l = s.map((e) => O(t, n, r, e.coordinate));
	return /*#__PURE__*/ F.createElement(B, q({ className: "recharts-polar-angle-axis-line" }, c, { points: l }));
}, Xe = (e) => {
	var t = e.tick, n = e.tickProps, r = e.value;
	return t ? /*#__PURE__*/ F.isValidElement(t) ? /*#__PURE__*/ F.cloneElement(t, n) : typeof t == "function" ? t(n) : /*#__PURE__*/ F.createElement(d, q({}, n, { className: "recharts-polar-angle-axis-tick-value" }), r) : null;
}, Ze = (e) => {
	var t = e.tick, n = e.tickLine, r = e.tickFormatter, i = e.stroke, a = e.ticks, o = M(e);
	o.ref;
	var s = Be(o, Ie), l = _e(t), u = Y(Y({}, s), {}, { fill: "none" }, M(n)), d = a.map((a, o) => {
		var d = Ke(a, e), f = qe(a, e.orientation), p = Je(a), m = Y(Y(Y({}, s), {}, {
			textAnchor: f,
			verticalAnchor: p,
			stroke: "none",
			fill: i
		}, l), {}, {
			index: o,
			payload: a,
			x: d.x2,
			y: d.y2
		});
		return /*#__PURE__*/ F.createElement(c, q({
			className: _("recharts-polar-angle-axis-tick", te(t)),
			key: `tick-${a.coordinate}`
		}, h(e, a, o)), n && /*#__PURE__*/ F.createElement("line", q({ className: "recharts-polar-angle-axis-tick-line" }, u, d)), /*#__PURE__*/ F.createElement(Xe, {
			tick: t,
			tickProps: m,
			value: r ? r(a.value, o) : a.value
		}));
	});
	return /*#__PURE__*/ F.createElement(c, { className: "recharts-polar-angle-axis-ticks" }, d);
}, Qe = (e) => {
	var t = e.angleAxisId, n = P(fe), r = P((e) => U(e, "angleAxis", t)), i = be(), a = P((e) => K(e, "angleAxis", t, i)), o = Se();
	if (n == null || !a || !a.length || r == null) return null;
	var s = Y(Y(Y({}, e), {}, { scale: r }, n), {}, {
		radius: n.outerRadius,
		ticks: a
	});
	return /*#__PURE__*/ F.createElement(p, { zIndex: s.zIndex }, /*#__PURE__*/ F.createElement(c, { className: _("recharts-polar-angle-axis", We, s.className) }, /*#__PURE__*/ F.createElement(Ye, q({}, o?.axis, s)), /*#__PURE__*/ F.createElement(Ze, q({}, o?.axis, s))));
};
function $e(e) {
	var t = ce(e, C);
	return /*#__PURE__*/ F.createElement(Ge, {
		id: t.angleAxisId,
		scale: t.scale,
		type: t.type,
		dataKey: t.dataKey,
		unit: void 0,
		name: t.name,
		allowDuplicatedCategory: !1,
		allowDataOverflow: !1,
		reversed: t.reversed,
		includeHidden: !1,
		allowDecimals: t.allowDecimals,
		tickCount: t.tickCount,
		niceTicks: t.niceTicks ?? "auto",
		ticks: t.ticks,
		tick: t.tick,
		domain: t.domain
	}, /*#__PURE__*/ F.createElement(Qe, t));
}
$e.displayName = "PolarAngleAxis";
// src/react/charts/bar-card.tsx
var X = oe(), Z = [0, (e) => e * 1.2], et = new Intl.NumberFormat(ne, {
	notation: "compact",
	maximumSignificantDigits: 3
});
function tt(e) {
	return Math.abs(e) >= 1e5 ? et.format(e) : e.toLocaleString();
}
var nt = (e) => ({
	position: e,
	className: "fill-text-secondary",
	formatter: (e) => tt(Number(e))
});
function rt({ title: a, unit: s, series: c, rows: l, color: u, empty: d, layout: f = "vertical" }) {
	let p = l.filter((e) => Number.isFinite(e.value) && e.value >= 0).map((e) => ({
		name: e.name,
		value: e.value
	})), m = p.reduce((e, t) => e + t.value, 0);
	if (!m) return /* @__PURE__ */ (0, X.jsx)(n, {
		title: a,
		children: d
	});
	let h = f === "horizontal";
	return /* @__PURE__ */ (0, X.jsxs)("section", {
		className: e,
		"aria-label": a,
		children: [/* @__PURE__ */ (0, X.jsx)(r, {
			title: a,
			figure: m.toLocaleString(),
			note: s(m)
		}), /* @__PURE__ */ (0, X.jsxs)(o, {
			data: p,
			config: { value: {
				label: c,
				colors: ve(u)
			} },
			layout: f,
			barRadius: 4,
			chartProps: h ? { margin: {
				top: 5,
				right: 56,
				bottom: 5,
				left: 5
			} } : void 0,
			className: h ? "aspect-auto h-64 flex-none text-text-secondary" : "aspect-auto h-56 flex-none text-text-secondary",
			children: [
				/* @__PURE__ */ (0, X.jsx)(o.Grid, {}),
				h ? /* @__PURE__ */ (0, X.jsx)(o.YAxis, {
					dataKey: "name",
					interval: 0,
					tick: /* @__PURE__ */ (0, X.jsx)(t, { along: "y" }),
					width: g(p.map((e) => e.name))
				}) : /* @__PURE__ */ (0, X.jsx)(o.XAxis, {
					dataKey: "name",
					interval: 0,
					tick: /* @__PURE__ */ (0, X.jsx)(t, { along: "x" })
				}),
				h ? /* @__PURE__ */ (0, X.jsx)(o.XAxis, {
					hide: !0,
					domain: Z
				}) : /* @__PURE__ */ (0, X.jsx)(o.YAxis, {
					hide: !0,
					domain: Z
				}),
				/* @__PURE__ */ (0, X.jsx)(o.Bar, {
					dataKey: "value",
					enableHoverHighlight: !0,
					barProps: {
						dataKey: "value",
						label: nt(h ? "right" : "top")
					}
				}),
				/* @__PURE__ */ (0, X.jsx)(i, {})
			]
		})]
	});
}
// src/react/charts/heat.ts
var it = [
	N("manage:heatChart.monday"),
	N("manage:heatChart.tuesday"),
	N("manage:heatChart.wednesday"),
	N("manage:heatChart.thursday"),
	N("manage:heatChart.friday"),
	N("manage:heatChart.saturday"),
	N("manage:heatChart.sunday")
], at = (e, t) => e ? Math.max(.12, e / t) : 0;
function ot(e) {
	let t = Array.from({ length: 7 }, () => Array(24).fill(0));
	for (let n of e?.hours || []) {
		let { weekday: e, hour: r, count: i } = n;
		!Number.isInteger(e) || e < 0 || e > 6 || !Number.isInteger(r) || r < 0 || r > 23 || !Number.isFinite(i) || i < 0 || (t[e][r] = (t[e][r] || 0) + i);
	}
	let n = t.flat(), r = Math.max(1, ...n);
	return {
		cells: t.flatMap((e, t) => e.map((e, n) => ({
			key: `${t}-${n}`,
			label: `${it[t]} ${n}:00`,
			count: e,
			share: at(e, r)
		}))),
		total: n.reduce((e, t) => e + t, 0)
	};
}
function st(e) {
	let t = (e?.days || []).filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && Number.isFinite(e.count) && e.count >= 0).slice().sort((e, t) => e.date.localeCompare(t.date)), n = {
		cells: [],
		total: 0,
		start: "",
		end: ""
	};
	if (!t.length) return n;
	let r = /* @__PURE__ */ new Date(`${t.at(-1).date}T00:00:00Z`), i = new Date(r);
	i.setUTCDate(i.getUTCDate() - 90);
	let a = new Map(t.map((e) => [e.date, e.count])), o = Math.max(1, ...t.map((e) => e.count)), s = Array.from({ length: 91 }, (e, t) => {
		let n = new Date(i);
		n.setUTCDate(i.getUTCDate() + t);
		let r = n.toISOString().slice(0, 10), s = a.get(r) || 0;
		return {
			key: r,
			label: r,
			count: s,
			share: at(s, o)
		};
	});
	return {
		cells: s,
		total: s.reduce((e, t) => e + t.count, 0),
		start: i.toISOString().slice(0, 10),
		end: t.at(-1).date
	};
}
// src/react/charts/heat-card.tsx
var Q = 14, $ = 17, ct = {
	4: {
		fill: "fill-chart-4",
		dot: "bg-chart-4"
	},
	5: {
		fill: "fill-chart-5",
		dot: "bg-chart-5"
	}
}, lt = {
	start: "translate-x-0",
	center: "-translate-x-1/2",
	end: "-translate-x-full"
};
function ut({ cell: e, series: t, tone: n, left: r, top: i, anchor: a }) {
	return /* @__PURE__ */ (0, X.jsxs)("div", {
		"aria-hidden": !0,
		style: {
			left: `${r}%`,
			top: `${i}%`
		},
		className: `pointer-events-none absolute z-10 -mt-2 -translate-y-full ${l} ${lt[a]}`,
		children: [/* @__PURE__ */ (0, X.jsx)("div", {
			className: "font-medium text-foreground",
			children: e.label
		}), /* @__PURE__ */ (0, X.jsx)(f, {
			name: t,
			value: e.count,
			swatch: /* @__PURE__ */ (0, X.jsx)("i", { className: `${u} ${ct[n].dot}` })
		})]
	});
}
function dt({ title: t, words: n, cells: i, total: a, columns: o, rows: s, axis: c, footer: l, tone: u }) {
	let [d, f] = (0, F.useState)(-1), [p, m] = (0, F.useState)(0), h = (0, F.useRef)(null), ee = p < i.length ? p : 0, g = c ? 30 : 0, _ = c ? 18 : 0, v = g + o * $, y = _ + s * $, b = (e) => ({
		x: g + e % o * $,
		y: _ + Math.floor(e / o) * $
	}), x = i[d], S = x ? b(d) : null, C = S ? (S.x + Q / 2) / v : 0, w = C < .1 ? "start" : C > .9 ? "end" : "center", T = S ? {
		start: S.x,
		center: S.x + Q / 2,
		end: S.x + Q
	}[w] : 0, E = (e, t) => {
		let n = t - t % o, r = {
			ArrowLeft: t - 1,
			ArrowRight: t + 1,
			ArrowUp: t - o,
			ArrowDown: t + o,
			Home: n,
			End: Math.min(n + o, i.length) - 1
		}[e.key];
		r !== void 0 && (e.preventDefault(), r < 0 || r >= i.length || (m(r), h.current?.querySelector(`rect[data-cell="${r}"]`)?.focus()));
	};
	return /* @__PURE__ */ (0, X.jsxs)("section", {
		className: e,
		children: [
			/* @__PURE__ */ (0, X.jsx)(r, {
				title: t,
				figure: (x ? x.count : a).toLocaleString(),
				note: x ? x.label : n.unit(a)
			}),
			/* @__PURE__ */ (0, X.jsxs)("div", {
				className: "relative",
				children: [/* @__PURE__ */ (0, X.jsx)("div", {
					className: "min-w-0 overflow-x-auto",
					children: /* @__PURE__ */ (0, X.jsxs)("svg", {
						ref: h,
						role: "img",
						"aria-label": t,
						onPointerLeave: () => f(-1),
						viewBox: `0 0 ${v} ${y}`,
						className: c ? "block h-auto min-w-80 w-full" : "block h-auto w-full",
						children: [c, i.map((e, t) => {
							let { x: r, y: i } = b(t);
							return /* @__PURE__ */ (0, X.jsx)("rect", {
								"data-cell": t,
								tabIndex: t === ee ? 0 : -1,
								role: "img",
								"aria-label": `${e.label}${N("shell:format.clauseSeparator")}${n.cell(e.count)}`,
								x: r,
								y: i,
								width: Q,
								height: Q,
								rx: 3,
								fillOpacity: e.share || 1,
								opacity: d >= 0 && d !== t ? .4 : 1,
								className: e.share ? `outline-none transition-opacity duration-200 focus-visible:stroke-border-focus-ring ${ct[u].fill}` : "fill-chart-track outline-none transition-opacity duration-200 focus-visible:stroke-border-focus-ring",
								onPointerEnter: () => f(t),
								onFocus: () => {
									f(t), m(t);
								},
								onBlur: () => f(-1),
								onKeyDown: (e) => E(e, t)
							}, e.key);
						})]
					})
				}), x && S ? /* @__PURE__ */ (0, X.jsx)(ut, {
					cell: x,
					series: n.series,
					tone: u,
					anchor: w,
					left: T / v * 100,
					top: S.y / y * 100
				}) : null]
			}),
			/* @__PURE__ */ (0, X.jsx)("footer", {
				className: "flex flex-wrap justify-between gap-3 text-caption-1-regular text-text-secondary",
				children: l
			})
		]
	});
}
var ft = /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [it.map((e, t) => /* @__PURE__ */ (0, X.jsx)("text", {
	x: 0,
	y: 18 + t * $ + 7,
	dominantBaseline: "middle",
	className: "fill-text-secondary text-caption-1-regular",
	children: e
}, e)), Array.from({ length: 24 }, (e, t) => t % 2 ? null : /* @__PURE__ */ (0, X.jsx)("text", {
	x: 30 + t * $,
	y: 8,
	dominantBaseline: "middle",
	className: "fill-text-secondary text-caption-1-regular",
	children: t
}, t))] });
function pt({ activity: e, title: t, dailyTitle: r, words: i, tone: a, empty: o }) {
	let s = ot(e), c = st(e);
	return c.cells.length ? /* @__PURE__ */ (0, X.jsxs)("div", {
		className: "inline-grid w-full items-start gap-5 lg:grid-cols-2",
		children: [/* @__PURE__ */ (0, X.jsx)(dt, {
			title: t,
			words: i,
			tone: a,
			cells: s.cells,
			total: s.total,
			columns: 24,
			rows: 7,
			axis: ft,
			footer: /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [/* @__PURE__ */ (0, X.jsx)("span", { children: N("manage:charts.dayByHour") }), /* @__PURE__ */ (0, X.jsx)("span", { children: e?.timezone || "UTC+08:00" })] })
		}), /* @__PURE__ */ (0, X.jsx)(dt, {
			title: r,
			words: i,
			tone: a,
			cells: c.cells,
			total: c.total,
			columns: 13,
			rows: 7,
			footer: /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [/* @__PURE__ */ (0, X.jsx)("span", { children: c.start }), /* @__PURE__ */ (0, X.jsx)("span", { children: c.end })] })
		})]
	}) : /* @__PURE__ */ (0, X.jsx)(n, {
		title: t,
		children: o
	});
}
// src/react/components/expandable-ranking.tsx
function mt({ children: e, className: t = "", previewCount: n = 10 }) {
	let r = (0, F.useId)(), i = (0, F.useRef)(null), [a, o] = (0, F.useState)(!1), [s, c] = (0, F.useState)(!1), l = F.Children.toArray(e), u = l.length > n;
	(0, F.useLayoutEffect)(() => {
		let e = i.current;
		if (!e || !u) return;
		let t = () => {
			let t = e.children[Math.min(n, e.children.length) - 1];
			t && e.offsetWidth && (e.style.setProperty("--ranking-collapsed-height", `${t.offsetTop - e.offsetTop + t.offsetHeight}px`), e.style.setProperty("--ranking-expanded-height", `${e.scrollHeight}px`));
		};
		t();
		let r = new ResizeObserver(t);
		return r.observe(e), () => r.disconnect();
	}, [
		u,
		n,
		l.length
	]);
	let d = l.map((e, t) => !(0, F.isValidElement)(e) || t < n ? e : (0, F.cloneElement)(e, { inert: !a || void 0 }));
	return /* @__PURE__ */ (0, X.jsxs)("div", {
		"data-expandable-ranking": !0,
		"data-expandable": u || void 0,
		"data-expanded": a || void 0,
		"data-animating": s || void 0,
		children: [/* @__PURE__ */ (0, X.jsx)("ol", {
			id: r,
			ref: i,
			"data-expandable-ranking-list": !0,
			className: t,
			onTransitionEnd: (e) => {
				e.target === i.current && e.propertyName === "max-height" && c(!1);
			},
			children: d
		}), u ? /* @__PURE__ */ (0, X.jsx)("button", {
			type: "button",
			"data-ranking-toggle": !0,
			"aria-controls": r,
			"aria-expanded": a,
			"aria-label": N(a ? "shell:expandableRanking.collapse" : "shell:expandableRanking.expand"),
			onClick: () => {
				c(!0), o((e) => !e);
			},
			children: /* @__PURE__ */ (0, X.jsx)(T, { "aria-hidden": !0 })
		}) : null]
	});
}
export { pt as ActivityHeat, Z as BAR_DOMAIN, rt as BarCard, mt as ExpandableRanking, $e as PolarAngleAxis, B as Polygon, nt as barLabel, K as selectPolarAngleAxisTicks, U as selectPolarAxisScale, G as selectPolarAxisTicks, Pe as selectPolarGraphicalItemAxisTicks };

//# debugId=478b789d-3dc5-4370-8db5-f13d95db0ef0
(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "50082b41-272c-44d5-a222-494f8bc12f4d", e._sentryDebugIdIdentifier = "sentry-dbid-50082b41-272c-44d5-a222-494f8bc12f4d");
	} catch {}
})();
import { ActivePoints as e, AnimatedItems as t, CHART_CARD as n, CHART_COLORS as r, CartesianLabelListContextProvider as i, CategoryTick as a, ChartBackground as o, ChartContainer as s, ChartHead as c, ChartLegend as l, ChartLegendContent as u, ChartTip as d, ChartTooltip as f, ChartTooltipContent as p, DefaultZIndexes as m, Dots as h, EvilBarChart as g, LabelListFromLabelProp as _, Layer as v, LoadingIndicator as y, PolarChart as b, PolarLabelContextProvider as x, PolarLabelFromLabelProp as S, RegisterGraphicalItemId as C, SetPolarGraphicalItem as ee, SetPolarLegendPayload as w, SetTooltipEntrySettings as T, Text as E, ZIndexLayer as D, adaptEventsOfChild as te, addRadiusAxis as ne, arrayTooltipSearcher as re, categoryAxisWidth as ie, cn as ae, createSelector as O, defaultPolarChartProps as oe, defaultPolarRadiusAxisProps as se, fitLabel as ce, getAxisTypeBasedOnLayout as le, getBandSizeOfAxis as ue, getClassNameFromUnknown as de, getColorsCount as fe, getTooltipNameProp as pe, getValueByDataKey as me, identity as he, interpolate as ge, isArrayLike as _e, isCategoricalAxis as ve, isNullish as ye, iteratee as be, matchAnimationItems as xe, matchByIndex as Se, noop as Ce, polarToCartesian as k, removeRadiusAxis as we, resolveDefaultProps as A, selectAngleAxis as Te, selectChartDataAndAlwaysIgnoreIndexes as Ee, selectChartLayout as De, selectPolarViewBox as Oe, selectRadiusAxis as ke, selectUnfilteredPolarItems as Ae, svgPropertiesAndEvents as je, svgPropertiesNoEvents as j, svgPropertiesNoEventsFromUnknown as Me, tone as Ne, useAnimationCallbacks as Pe, useAnimationStartSnapshot as Fe, useAppDispatch as Ie, useAppSelector as M, useIsPanorama as Le, usePolarChartLayout as Re } from "./peach-app.chart-tip-CRxYp6KT.js";
import { $542a13ca2fa5b484$export$5b6b19405a83ff9d as ze, $b4f18e3395fe64d7$export$3d96ec278d3efce4 as Be, $b4f18e3395fe64d7$export$3e41faf802a29e71 as Ve, $b4f18e3395fe64d7$export$b2539bed5023c21c as He, Button as N, ButtonLink as Ue, Disclosure as We, E3 as Ge, EmptyState as P, FLOW_LABEL_X as Ke, FLOW_VIEWBOX as qe, Gg as Je, IDLE_POLL_MS as Ye, Input as Xe, M6 as Ze, MENU_ITEM as Qe, MENU_ITEM_INTERACTIVE as $e, MENU_POPOVER_SURFACE as et, MenuDialog as tt, Note as F, OV as nt, Progress as rt, Rf as it, SEGMENT as at, SEGMENTED_TRACK as ot, STAT_STRIP as st, SegmentedTabList as ct, Select$1 as lt, SelectItem as ut, StatCard as dt, TASTE_REFRESH_KEY as ft, TASTE_WINDOWS as pt, TaskProgress as mt, Wt as ht, Xt as gt, _8 as _t, __toESM as vt, aB as yt, avatarInner as bt, busyProps as I, cB as xt, cardClass as L, clsx as R, configureTasteBrowser as St, confirmModal as Ct, cx as wt, errorMessage as z, f1 as Tt, fetchTaste as Et, fetchTasteJob as Dt, firstGrapheme as Ot, flowGraph as kt, flowLabel as At, fmtSize as jt, g4 as Mt, historySpan as Nt, importTasteExport as Pt, keepPreviousData as Ft, mM as It, pv as B, queryClient as V, r2 as Lt, radarRows as Rt, rankDetail as zt, rankShares as Bt, removeTasteSource as Vt, require_jsx_runtime as Ht, require_react as Ut, siteMarkUrl as Wt, startTasteRefresh as Gt, statCardClass as Kt, tasteDate as qt, tasteDimensions as Jt, tasteHours as Yt, tasteKey as H, tasteRefetchInterval as Xt, tasteTime as Zt, topScores as Qt, uo as $t, useBackgroundJob as en, useMutation as tn, useQuery as nn } from "./peach-app.js";
import { Page as rn } from "./peach-app.page-QAncjzM1.js";
import { LEGACY_AVATAR_IMG as an } from "./peach-app.legacy-avatar-NSITxLRS.js";
import { ActivityHeat as on, BAR_DOMAIN as sn, ExpandableRanking as cn, PolarAngleAxis as ln, Polygon as un, barLabel as dn, selectPolarAxisScale as fn, selectPolarAxisTicks as U } from "./peach-app.expandable-ranking-DrIZgDjz.js";
import { BrowserIcon as pn } from "./peach-app.browser-icon-N9Od-bAf.js";
var mn = O([(e, t) => U(e, "angleAxis", t, !1)], (e) => {
	if (e) return e.map((e) => e.coordinate);
}), hn = O([(e, t) => U(e, "radiusAxis", t, !1)], (e) => {
	if (e) return e.map((e) => e.coordinate);
}), W = /* @__PURE__ */ vt(Ut()), gn = [
	"gridType",
	"radialLines",
	"angleAxisId",
	"radiusAxisId",
	"cx",
	"cy",
	"innerRadius",
	"outerRadius",
	"polarAngles",
	"polarRadius",
	"zIndex"
];
function _n(e, t) {
	if (e == null) return {};
	var n, r, i = vn(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function vn(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function G() {
	return G = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, G.apply(null, arguments);
}
function yn(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function bn(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? yn(Object(n), !0).forEach(function(t) {
			xn(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : yn(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function xn(e, t, n) {
	return (t = Sn(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Sn(e) {
	var t = Cn(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Cn(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var wn = (e, t, n, r) => {
	var i = "";
	return r.forEach((r, a) => {
		var o = k(t, n, e, r);
		i += a ? `L ${o.x},${o.y}` : `M ${o.x},${o.y}`;
	}), i += "Z", i;
}, Tn = (e) => {
	var t = e.cx, n = e.cy, r = e.innerRadius, i = e.outerRadius, a = e.polarAngles, o = e.radialLines;
	if (!a || !a.length || !o) return null;
	var s = bn({}, j(e));
	return /*#__PURE__*/ W.createElement("g", { className: "recharts-polar-grid-angle" }, a.map((e) => {
		var a = k(t, n, r, e), o = k(t, n, i, e);
		return /*#__PURE__*/ W.createElement("line", G({ key: `line-${e}` }, s, {
			x1: a.x,
			y1: a.y,
			x2: o.x,
			y2: o.y
		}));
	}));
}, En = (e) => {
	var t = e.cx, n = e.cy, r = e.radius, i = bn({}, j(e));
	return /*#__PURE__*/ W.createElement("circle", G({}, i, {
		className: R("recharts-polar-grid-concentric-circle", e.className),
		cx: t,
		cy: n,
		r
	}));
}, Dn = (e) => {
	var t = e.radius, n = bn({}, j(e));
	return /*#__PURE__*/ W.createElement("path", G({}, n, {
		className: R("recharts-polar-grid-concentric-polygon", e.className),
		d: wn(t, e.cx, e.cy, e.polarAngles)
	}));
}, On = (e) => {
	var t = e.polarRadius, n = e.gridType;
	if (!t || !t.length) return null;
	var r = Math.max(...t), i = e.fill && e.fill !== "none";
	return /*#__PURE__*/ W.createElement("g", { className: "recharts-polar-grid-concentric" }, i && n === "circle" && /*#__PURE__*/ W.createElement(En, G({}, e, { radius: r })), i && n !== "circle" && /*#__PURE__*/ W.createElement(Dn, G({}, e, { radius: r })), t.map((t, r) => {
		var i = r;
		return n === "circle" ? /*#__PURE__*/ W.createElement(En, G({ key: i }, e, {
			fill: "none",
			radius: t
		})) : /*#__PURE__*/ W.createElement(Dn, G({ key: i }, e, {
			fill: "none",
			radius: t
		}));
	}));
}, kn = {
	angleAxisId: 0,
	radiusAxisId: 0,
	gridType: "polygon",
	radialLines: !0,
	zIndex: m.grid,
	stroke: "#ccc",
	strokeWidth: 1,
	fill: "none"
}, An = (e) => {
	var t = A(e, kn), n = t.gridType, r = t.radialLines, i = t.angleAxisId, a = t.radiusAxisId, o = t.cx, s = t.cy, c = t.innerRadius, l = t.outerRadius, u = t.polarAngles, d = t.polarRadius, f = t.zIndex, p = _n(t, gn), m = M(Oe), h = M((e) => mn(e, i)), g = M((e) => hn(e, a)), _ = Array.isArray(u) ? u : h, v = Array.isArray(d) ? d : g;
	if (_ == null || v == null) return null;
	var y = bn({
		cx: m?.cx ?? o ?? 0,
		cy: m?.cy ?? s ?? 0,
		innerRadius: m?.innerRadius ?? c ?? 0,
		outerRadius: m?.outerRadius ?? l ?? 0,
		polarAngles: _,
		polarRadius: v,
		zIndex: f
	}, p);
	return y.outerRadius <= 0 ? null : /*#__PURE__*/ W.createElement(D, { zIndex: y.zIndex }, /*#__PURE__*/ W.createElement("g", { className: "recharts-polar-grid" }, /*#__PURE__*/ W.createElement(On, G({
		gridType: n,
		radialLines: r
	}, y, {
		polarAngles: _,
		polarRadius: v
	})), /*#__PURE__*/ W.createElement(Tn, G({
		gridType: n,
		radialLines: r
	}, y, {
		polarAngles: _,
		polarRadius: v
	}))));
};
An.displayName = "PolarGrid";
// node_modules/es-toolkit/dist/compat/_internal/toArray.mjs
function jn(e) {
	return Array.isArray(e) ? e : Array.from(e);
}
// node_modules/es-toolkit/dist/compat/math/maxBy.mjs
function Mn(e, t = he) {
	if (e == null) return;
	let n = jn(e);
	if (n.length === 0) return;
	let r = be(t), i, a;
	for (let e = 0; e < n.length; e++) {
		let t = n[e], o = r(t, e, n);
		o == null || Number.isNaN(o) || typeof o == "symbol" || (a === void 0 || o > a) && (a = o, i = t);
	}
	return i;
}
// node_modules/es-toolkit/dist/compat/math/minBy.mjs
function Nn(e, t = he) {
	if (e == null) return;
	let n = jn(e);
	if (n.length === 0) return;
	let r = be(t), i, a;
	for (let e = 0; e < n.length; e++) {
		let t = n[e], o = r(t, e, n);
		o == null || Number.isNaN(o) || typeof o == "symbol" || (a === void 0 || o < a) && (a = o, i = t);
	}
	return i;
}
// node_modules/recharts/es6/polar/PolarRadiusAxis.js
var Pn = ["type"], Fn = [
	"cx",
	"cy",
	"angle",
	"axisLine"
], In = [
	"angle",
	"tickFormatter",
	"stroke",
	"tick"
];
function K() {
	return K = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, K.apply(null, arguments);
}
function Ln(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function q(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Ln(Object(n), !0).forEach(function(t) {
			Rn(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Ln(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Rn(e, t, n) {
	return (t = zn(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function zn(e) {
	var t = Bn(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Bn(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Vn(e, t) {
	if (e == null) return {};
	var n, r, i = Hn(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function Hn(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var Un = "radiusAxis";
function Wn(e) {
	var t = Ie(), n = Re(), r = (0, W.useMemo)(() => {
		var t = e.type, r = Vn(e, Pn), i = le(n, "radiusAxis", t);
		if (i != null) return q(q({}, r), {}, { type: i });
	}, [e, n]);
	return (0, W.useEffect)(() => r == null ? Ce : (t(ne(r)), () => {
		t(we(r));
	}), [t, r]), null;
}
var Gn = (e, t, n, r) => {
	var i = e.coordinate;
	return k(n, r, i, t);
}, Kn = (e) => {
	var t;
	switch (e) {
		case "left":
			t = "end";
			break;
		case "right":
			t = "start";
			break;
		default: t = "middle";
	}
	return t;
}, qn = (e, t, n, r) => {
	var i = Mn(r, (e) => e.coordinate || 0);
	return {
		cx: t,
		cy: n,
		startAngle: e,
		endAngle: e,
		innerRadius: Nn(r, (e) => e.coordinate || 0)?.coordinate || 0,
		outerRadius: i?.coordinate || 0,
		clockWise: !1
	};
}, Jn = (e, t) => {
	var n = e.cx, r = e.cy, i = e.angle, a = e.axisLine, o = Vn(e, Fn), s = t.reduce((e, t) => [Math.min(e[0], t.coordinate), Math.max(e[1], t.coordinate)], [Infinity, -Infinity]), c = k(n, r, s[0], i), l = k(n, r, s[1], i), u = q(q(q({}, j(o)), {}, { fill: "none" }, j(a)), {}, {
		x1: c.x,
		y1: c.y,
		x2: l.x,
		y2: l.y
	});
	return /*#__PURE__*/ W.createElement("line", K({ className: "recharts-polar-radius-axis-line" }, u));
}, Yn = (e, t, n) => /*#__PURE__*/ W.isValidElement(e) ? /*#__PURE__*/ W.cloneElement(e, t) : typeof e == "function" ? e(t) : /*#__PURE__*/ W.createElement(E, K({}, t, { className: "recharts-polar-radius-axis-tick-value" }), n), Xn = (e, t) => {
	var n = e.angle, r = e.tickFormatter, i = e.stroke, a = e.tick, o = Vn(e, In), s = Kn(e.orientation), c = j(o), l = Me(a), u = t.map((t, o) => {
		var u = Gn(t, e.angle, e.cx, e.cy), d = q(q(q(q({
			textAnchor: s,
			transform: `rotate(${90 - n}, ${u.x}, ${u.y})`
		}, c), {}, {
			stroke: "none",
			fill: i
		}, l), {}, { index: o }, u), {}, { payload: t });
		return /*#__PURE__*/ W.createElement(v, K({
			className: R("recharts-polar-radius-axis-tick", de(a)),
			key: `tick-${t.coordinate}`
		}, te(e, t, o)), Yn(a, d, r ? r(t.value, o) : t.value));
	});
	return /*#__PURE__*/ W.createElement(v, { className: "recharts-polar-radius-axis-ticks" }, u);
}, Zn = (e) => {
	var t = e.radiusAxisId, n = M(Oe), r = M((e) => fn(e, "radiusAxis", t)), i = M((e) => U(e, "radiusAxis", t, !1));
	if (n == null || !i || !i.length || r == null) return null;
	var a = q(q({}, e), {}, { scale: r }, n), o = a.tick, s = a.axisLine;
	return /*#__PURE__*/ W.createElement(D, { zIndex: a.zIndex }, /*#__PURE__*/ W.createElement(v, { className: R("recharts-polar-radius-axis", Un, a.className) }, s && Jn(a, i), o && Xn(a, i), /*#__PURE__*/ W.createElement(x, qn(a.angle, a.cx, a.cy, i), /*#__PURE__*/ W.createElement(S, { label: a.label }), a.children)));
};
function Qn(e) {
	var t = A(e, se);
	return /*#__PURE__*/ W.createElement(W.Fragment, null, /*#__PURE__*/ W.createElement(Wn, {
		domain: t.domain,
		id: t.radiusAxisId,
		scale: t.scale,
		type: t.type,
		dataKey: t.dataKey,
		unit: void 0,
		name: t.name,
		allowDuplicatedCategory: t.allowDuplicatedCategory,
		allowDataOverflow: t.allowDataOverflow,
		reversed: t.reversed,
		includeHidden: t.includeHidden,
		allowDecimals: t.allowDecimals,
		niceTicks: t.niceTicks ?? "auto",
		ticks: t.ticks,
		tickCount: t.tickCount,
		tick: t.tick
	}), /*#__PURE__*/ W.createElement(Zn, t));
}
Qn.displayName = "PolarRadiusAxis";
// node_modules/es-toolkit/dist/array/last.mjs
function $n(e) {
	return e[e.length - 1];
}
// node_modules/es-toolkit/dist/compat/array/last.mjs
function er(e) {
	if (_e(e) && e.length !== 0) return $n(jn(e));
}
// node_modules/recharts/es6/state/selectors/radarSelectors.js
function tr(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function nr(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? tr(Object(n), !0).forEach(function(t) {
			rr(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : tr(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function rr(e, t, n) {
	return (t = ir(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function ir(e) {
	var t = ar(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function ar(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var or = (e, t) => fn(e, "radiusAxis", t), sr = O([or], (e) => {
	if (e != null) return { scale: e };
}), cr = O([ke, or], (e, t) => {
	if (e != null && t != null) return nr(nr({}, e), {}, { scale: t });
}), lr = (e, t, n, r) => U(e, "radiusAxis", t, r), ur = (e, t, n) => Te(e, n), dr = (e, t, n) => fn(e, "angleAxis", n), fr = O([ur, dr], (e, t) => {
	if (e != null && t != null) return nr(nr({}, e), {}, { scale: t });
}), pr = (e, t, n, r) => U(e, "angleAxis", n, r), mr = O([
	ur,
	dr,
	Oe
], (e, t, n) => {
	if (n != null && t != null) return {
		scale: t,
		type: e.type,
		dataKey: e.dataKey,
		cx: n.cx,
		cy: n.cy
	};
}), hr = (e, t, n, r, i) => i, gr = O([
	De,
	cr,
	lr,
	fr,
	pr
], (e, t, n, r, i) => ve(e, "radiusAxis") ? ue(t, n, !1) : ue(r, i, !1)), _r = O([Ae, hr], (e, t) => {
	if (e != null) return e.find((e) => e.type === "radar" && t === e.id)?.dataKey;
}), vr = O([
	sr,
	mr,
	Ee,
	_r,
	gr
], (e, t, n, r, i) => {
	var a = n.chartData, o = n.dataStartIndex, s = n.dataEndIndex;
	if (e != null && t != null && a != null && i != null && r != null) return Ar({
		radiusAxis: e,
		angleAxis: t,
		displayedData: a.slice(o, s + 1),
		dataKey: r,
		bandSize: i
	});
}), yr = ["id"];
function J() {
	return J = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, J.apply(null, arguments);
}
function br(e, t) {
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
		t % 2 ? br(Object(n), !0).forEach(function(t) {
			xr(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : br(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function xr(e, t, n) {
	return (t = Sr(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Sr(e) {
	var t = Cr(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Cr(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function wr(e, t) {
	if (e == null) return {};
	var n, r, i = Tr(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function Tr(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function Er(e, t) {
	return e && e !== "none" ? e : t;
}
var Dr = (e) => {
	var t = e.dataKey, n = e.name, r = e.stroke, i = e.fill, a = e.legendType;
	return [{
		inactive: e.hide,
		dataKey: t,
		type: a,
		color: Er(r, i),
		value: pe(n, t),
		payload: e
	}];
}, Or = /*#__PURE__*/ W.memo((e) => {
	var t = e.dataKey, n = e.stroke, r = e.strokeWidth, i = e.fill, a = e.name, o = e.hide, s = e.tooltipType, c = e.id, l = {
		dataDefinedOnItem: void 0,
		getPosition: Ce,
		settings: {
			stroke: n,
			strokeWidth: r,
			fill: i,
			nameKey: void 0,
			dataKey: t,
			name: pe(a, t),
			hide: o,
			type: s,
			color: Er(n, i),
			unit: "",
			graphicalItemId: c
		}
	};
	return /*#__PURE__*/ W.createElement(T, { tooltipEntrySettings: l });
});
function kr(e) {
	var t = e.points, n = e.props, r = n.dot, i = n.dataKey;
	n.id;
	var a = wr(n, yr), o = j(a);
	return /*#__PURE__*/ W.createElement(h, {
		points: t,
		dot: r,
		className: "recharts-radar-dots",
		dotClassName: "recharts-radar-dot",
		dataKey: i,
		baseProps: o
	});
}
function Ar(e) {
	var t = e.radiusAxis, n = e.angleAxis, r = e.displayedData, i = e.dataKey, a = e.bandSize, o = n.cx, s = n.cy, c = !1, l = [], u = n.type === "number" ? 0 : a ?? 0;
	r.forEach((e, r) => {
		var a = me(e, n.dataKey, r), d = me(e, i), f = (n.scale.map(a) ?? 0) + u, p = Array.isArray(d) ? er(d) : d, m = ye(p) ? 0 : t.scale.map(p) ?? 0;
		Array.isArray(d) && d.length >= 2 && (c = !0), l.push(Y(Y({}, k(o, s, m, f)), {}, {
			name: a,
			value: d,
			cx: o,
			cy: s,
			radius: m,
			angle: f,
			payload: e
		}));
	});
	var d = [];
	return c && l.forEach((e) => {
		if (Array.isArray(e.value)) {
			var n = e.value[0], r = ye(n) ? 0 : t.scale.map(n) ?? 0;
			d.push(Y(Y({}, e), {}, { radius: r }, k(o, s, r, e.angle)));
		} else d.push(e);
	}), {
		points: l,
		isRange: c,
		baseLinePoints: d
	};
}
function jr(e) {
	var t = e.showLabels, n = e.points, r = e.children, a = n.map((e) => {
		var t = {
			x: e.x,
			y: e.y,
			width: 0,
			lowerWidth: 0,
			upperWidth: 0,
			height: 0
		};
		return Y(Y({}, t), {}, {
			value: e.value ?? "",
			payload: e.payload,
			parentViewBox: void 0,
			viewBox: t,
			fill: void 0
		});
	});
	return /*#__PURE__*/ W.createElement(i, { value: t ? a : void 0 }, r);
}
function Mr(e) {
	var t = e.points, n = e.baseLinePoints, r = e.props;
	if (t == null) return null;
	var i = r.shape, a = r.isRange, o = r.connectNulls, s = /*#__PURE__*/ W.isValidElement(i) ? /*#__PURE__*/ W.cloneElement(i, Y(Y({}, r), {}, { points: t })) : typeof i == "function" ? i(Y(Y({}, r), {}, { points: t })) : /*#__PURE__*/ W.createElement(un, J({}, je(r), {
		onMouseEnter: (e) => {
			var t = r.onMouseEnter;
			t && t(r, e);
		},
		onMouseLeave: (e) => {
			var t = r.onMouseLeave;
			t && t(r, e);
		},
		points: t,
		baseLinePoints: a ? n : void 0,
		connectNulls: o
	}));
	return /*#__PURE__*/ W.createElement(v, { className: "recharts-radar-polygon" }, s, /*#__PURE__*/ W.createElement(kr, {
		props: r,
		points: t
	}));
}
var Nr = (e, t) => e == null ? [] : t === 1 ? e.flatMap((e) => e.status === "removed" ? [] : [e.next]) : e.flatMap((e) => e.status === "removed" ? [] : e.status === "matched" ? [Y(Y({}, e.next), {}, {
	x: ge(e.prev.x, e.next.x, t),
	y: ge(e.prev.y, e.next.y, t)
})] : [Y(Y({}, e.next), {}, {
	x: ge(e.next.cx, e.next.x, t),
	y: ge(e.next.cy, e.next.y, t)
})]);
function Pr(e) {
	var n = e.props, r = e.previousPointsRef, i = e.previousBaseLinePointsRef, a = n.points, o = n.baseLinePoints, s = n.isAnimationActive, c = n.animationBegin, l = n.animationDuration, u = n.animationEasing, d = n.animationMatchBy, f = n.animationInterpolateFn, p = n.onAnimationStart, m = n.onAnimationEnd, h = Fe(n, i), g = h.startValue, v = xe(g ?? null, o, d), y = Pe(p, m), b = y.isAnimating, x = y.handleAnimationStart, S = y.handleAnimationEnd, C = Re();
	return C == null ? null : /*#__PURE__*/ W.createElement(jr, {
		showLabels: !b,
		points: a
	}, /*#__PURE__*/ W.createElement(t, {
		animationInput: n,
		animationIdPrefix: "recharts-radar-",
		items: a,
		previousItemsRef: r,
		isAnimationActive: s,
		animationBegin: c,
		animationDuration: l,
		animationEasing: u,
		onAnimationStart: x,
		onAnimationEnd: S,
		animationInterpolateFn: f,
		animationMatchBy: d,
		layout: C
	}, (e, t) => {
		var r = t === 1 ? o : f(v, t, C);
		return h.syncStepValue(r, t), /*#__PURE__*/ W.createElement(Mr, {
			points: e,
			baseLinePoints: r,
			props: n
		});
	}), /*#__PURE__*/ W.createElement(_, { label: n.label }), n.children);
}
function Fr(e) {
	var t = (0, W.useRef)(void 0), n = (0, W.useRef)(void 0);
	return /*#__PURE__*/ W.createElement(Pr, {
		props: e,
		previousPointsRef: t,
		previousBaseLinePointsRef: n
	});
}
var Ir = {
	activeDot: !0,
	angleAxisId: 0,
	animationBegin: 0,
	animationDuration: 1500,
	animationEasing: "ease",
	animationMatchBy: Se,
	animationInterpolateFn: Nr,
	dot: !1,
	hide: !1,
	isAnimationActive: "auto",
	label: !1,
	legendType: "rect",
	radiusAxisId: 0,
	zIndex: m.area
};
function Lr(t) {
	var n = t.hide, r = t.className, i = t.points;
	if (n) return null;
	var a = R("recharts-radar", r);
	return /*#__PURE__*/ W.createElement(D, { zIndex: t.zIndex }, /*#__PURE__*/ W.createElement(v, { className: a }, /*#__PURE__*/ W.createElement(Fr, t)), /*#__PURE__*/ W.createElement(e, {
		points: i,
		mainColor: Er(t.stroke, t.fill),
		itemDataKey: t.dataKey,
		activeDot: t.activeDot
	}));
}
function Rr(e) {
	var t = Le(), n = M((n) => vr(n, e.radiusAxisId, e.angleAxisId, t, e.id));
	return n?.points == null ? null : /*#__PURE__*/ W.createElement(Lr, J({}, e, {
		points: n?.points,
		baseLinePoints: n?.baseLinePoints,
		isRange: n?.isRange
	}));
}
function zr(e) {
	var t = A(e, Ir);
	return /*#__PURE__*/ W.createElement(C, {
		id: t.id,
		type: "radar"
	}, (e) => /*#__PURE__*/ W.createElement(W.Fragment, null, /*#__PURE__*/ W.createElement(ee, {
		type: "radar",
		id: e,
		data: void 0,
		dataKey: t.dataKey,
		hide: t.hide,
		angleAxisId: t.angleAxisId,
		radiusAxisId: t.radiusAxisId
	}), /*#__PURE__*/ W.createElement(w, { legendPayload: Dr(t) }), /*#__PURE__*/ W.createElement(Or, {
		dataKey: t.dataKey,
		stroke: t.stroke,
		strokeWidth: t.strokeWidth,
		fill: t.fill,
		name: t.name,
		hide: t.hide,
		tooltipType: t.tooltipType,
		id: e
	}), /*#__PURE__*/ W.createElement(Rr, J({}, t, { id: e }))));
}
zr.displayName = "Radar";
// node_modules/recharts/es6/chart/RadarChart.js
function Br(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Vr(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Br(Object(n), !0).forEach(function(t) {
			Hr(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Br(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Hr(e, t, n) {
	return (t = Ur(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Ur(e) {
	var t = Wr(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Wr(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var Gr = ["axis"], Kr = Vr(Vr({}, oe), {}, {
	layout: "centric",
	startAngle: 90,
	endAngle: -270
}), qr = /*#__PURE__*/ (0, W.forwardRef)((e, t) => {
	var n = A(e, Kr);
	return /*#__PURE__*/ W.createElement(b, {
		chartName: "RadarChart",
		defaultTooltipEventType: "axis",
		validateTooltipEventTypes: Gr,
		tooltipPayloadSearcher: re,
		categoricalChartProps: n,
		ref: t
	});
}), X = Ht(), Jr = W.memo(function({ cx: e, cy: t, dataKey: n, chartId: r, className: i, fillOpacity: a = 1, type: o = "default", maskId: s }) {
	let c = W.useId().replace(/:/g, ""), l = `url(#${r}-colors-${String(n)})`;
	if (e === void 0 || t === void 0) return null;
	switch (o) {
		case "border": return /* @__PURE__ */ (0, X.jsx)(Xr, {
			cx: e,
			cy: t,
			dotId: c,
			fillOpacity: a,
			gradientUrl: l,
			className: i,
			maskId: s
		});
		case "colored-border": return /* @__PURE__ */ (0, X.jsx)(Zr, {
			cx: e,
			cy: t,
			dotId: c,
			fillOpacity: a,
			gradientUrl: l,
			className: i,
			maskId: s
		});
		default: return /* @__PURE__ */ (0, X.jsx)(Yr, {
			cx: e,
			cy: t,
			dotId: c,
			fillOpacity: a,
			gradientUrl: l,
			className: i,
			maskId: s
		});
	}
}), Yr = W.memo(({ cx: e, cy: t, dotId: n, fillOpacity: r, gradientUrl: i, className: a, maskId: o }) => /* @__PURE__ */ (0, X.jsxs)("g", {
	className: a,
	mask: o ? `url(#${o})` : void 0,
	children: [/* @__PURE__ */ (0, X.jsx)("defs", { children: /* @__PURE__ */ (0, X.jsx)("clipPath", {
		id: `dot-clip-${n}`,
		children: /* @__PURE__ */ (0, X.jsx)("circle", {
			cx: e,
			cy: t,
			r: 3
		})
	}) }), /* @__PURE__ */ (0, X.jsx)("rect", {
		x: "0",
		y: t - 3,
		width: "100%",
		height: 6,
		fill: i,
		fillOpacity: r,
		clipPath: `url(#dot-clip-${n})`
	})]
}));
Yr.displayName = "DefaultDot";
var Xr = W.memo(({ cx: e, cy: t, dotId: n, fillOpacity: r, gradientUrl: i, className: a, maskId: o }) => /* @__PURE__ */ (0, X.jsxs)("g", {
	className: ae(a, "text-background"),
	mask: o ? `url(#${o})` : void 0,
	children: [
		/* @__PURE__ */ (0, X.jsx)("defs", { children: /* @__PURE__ */ (0, X.jsx)("clipPath", {
			id: `dot-clip-${n}`,
			children: /* @__PURE__ */ (0, X.jsx)("circle", {
				cx: e,
				cy: t,
				r: 6
			})
		}) }),
		/* @__PURE__ */ (0, X.jsx)("circle", {
			cx: e,
			cy: t,
			r: 6,
			fill: "currentColor"
		}),
		/* @__PURE__ */ (0, X.jsx)("rect", {
			x: "0",
			y: t - (6 - 5 / 2),
			width: "100%",
			height: 7,
			fill: i,
			fillOpacity: r,
			clipPath: `url(#dot-clip-inner-${n})`
		}),
		/* @__PURE__ */ (0, X.jsx)("defs", { children: /* @__PURE__ */ (0, X.jsx)("clipPath", {
			id: `dot-clip-inner-${n}`,
			children: /* @__PURE__ */ (0, X.jsx)("circle", {
				cx: e,
				cy: t,
				r: 6 - 5 / 2
			})
		}) })
	]
}));
Xr.displayName = "PrimaryBorderDot";
var Zr = W.memo(({ cx: e, cy: t, dotId: n, fillOpacity: r, gradientUrl: i, className: a, maskId: o }) => /* @__PURE__ */ (0, X.jsxs)("g", {
	className: ae(a, "text-background"),
	mask: o ? `url(#${o})` : void 0,
	children: [
		/* @__PURE__ */ (0, X.jsx)("defs", { children: /* @__PURE__ */ (0, X.jsx)("clipPath", {
			id: `dot-clip-${n}`,
			children: /* @__PURE__ */ (0, X.jsx)("circle", {
				cx: e,
				cy: t,
				r: 3.5
			})
		}) }),
		/* @__PURE__ */ (0, X.jsx)("rect", {
			x: "0",
			y: t - 3 - 1 / 2,
			width: "100%",
			height: 7,
			fill: i,
			fillOpacity: r,
			clipPath: `url(#dot-clip-${n})`
		}),
		/* @__PURE__ */ (0, X.jsx)("circle", {
			cx: e,
			cy: t,
			r: 3 - 1 / 2,
			fill: "currentColor"
		})
	]
}));
Zr.displayName = "ColoredBorderDot";
// src/react/evilcharts/registry/charts/recharts-radar-chart.tsx
var Qr = 1, $r = .3, ei = 6, ti = 1500, ni = "value", ri = (0, W.createContext)(null);
function Z() {
	let e = (0, W.use)(ri);
	if (!e) throw Error("Radar chart parts (<Radar />, <PolarAngleAxis />, …) must be used within <EvilRadarChart />");
	return e;
}
function Q({ config: e, data: t, children: n, className: r, chartProps: i, backgroundVariant: a, defaultSelectedDataKey: c = null, onSelectionChange: l, isLoading: u = !1, loadingPoints: d }) {
	let f = (0, W.useId)().replace(/:/g, ""), [p, m] = (0, W.useState)(c), h = yi(u, d), g = (0, W.useCallback)((e) => {
		m(e), l?.(e);
	}, [l]), _ = (0, W.useMemo)(() => ({
		config: e,
		isLoading: u,
		selectedDataKey: p,
		selectDataKey: g
	}), [
		e,
		u,
		p,
		g
	]);
	return /* @__PURE__ */ (0, X.jsx)(ri, {
		value: _,
		children: /* @__PURE__ */ (0, X.jsxs)(s, {
			className: r,
			config: e,
			children: [/* @__PURE__ */ (0, X.jsx)(y, { isLoading: u }), /* @__PURE__ */ (0, X.jsxs)(qr, {
				id: f,
				data: u ? h : t,
				...i,
				children: [
					a && /* @__PURE__ */ (0, X.jsx)(o, { variant: a }),
					n,
					u && /* @__PURE__ */ (0, X.jsx)(bi, {})
				]
			})]
		})
	});
}
function ii({ dataKey: e, variant: t = "filled", fillOpacity: n = $r, isGlowing: r = !1, isClickable: i = !1, children: a, radarProps: o }) {
	let { config: s, isLoading: c, selectedDataKey: l, selectDataKey: u } = Z(), d = (0, W.useId)().replace(/:/g, "");
	if (c) return null;
	let f = i && l !== null && l !== e, p = {
		stroke: f ? .2 : 1,
		fill: f ? .1 : 1,
		dot: f ? .2 : 1
	}, m = t === "filled", { dot: h, activeDot: g } = fi(a, d, e, p.dot);
	return /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [/* @__PURE__ */ (0, X.jsx)(zr, {
		dataKey: e,
		stroke: `url(#${d}-radar-stroke-${e})`,
		strokeOpacity: p.stroke,
		strokeWidth: Qr,
		fill: m ? `url(#${d}-radar-fill-${e})` : "none",
		fillOpacity: m ? n * p.fill : 0,
		dot: h,
		activeDot: g,
		filter: r ? `url(#${d}-radar-glow-${e})` : void 0,
		className: "transition-opacity duration-200",
		style: i ? { cursor: "pointer" } : void 0,
		onClick: () => {
			i && u(l === e ? null : e);
		},
		...o
	}), /* @__PURE__ */ (0, X.jsxs)("defs", { children: [
		/* @__PURE__ */ (0, X.jsx)(mi, {
			id: d,
			dataKey: e,
			config: s
		}),
		/* @__PURE__ */ (0, X.jsx)(hi, {
			id: d,
			dataKey: e,
			config: s
		}),
		m && /* @__PURE__ */ (0, X.jsx)(gi, {
			id: d,
			dataKey: e,
			config: s
		}),
		r && /* @__PURE__ */ (0, X.jsx)(_i, {
			id: d,
			dataKey: e
		})
	] })] });
}
var ai = () => null, oi = () => null;
function si({ gridType: e = "polygon", stroke: t = "currentColor", strokeOpacity: n = .2, strokeDasharray: r = "3 4", ...i }) {
	return /* @__PURE__ */ (0, X.jsx)(An, {
		gridType: e,
		stroke: t,
		strokeOpacity: n,
		strokeDasharray: r,
		...i
	});
}
function ci({ tick: e = {
	fill: "currentColor",
	fontSize: 12
}, tickLine: t = !1, ...n }) {
	let { isLoading: r } = Z();
	return r ? null : /* @__PURE__ */ (0, X.jsx)(ln, {
		tick: e,
		tickLine: t,
		...n
	});
}
function li({ tick: e = {
	fill: "currentColor",
	fontSize: 10
}, tickLine: t = !1, axisLine: n = !1, ...r }) {
	let { isLoading: i } = Z();
	return i ? null : /* @__PURE__ */ (0, X.jsx)(Qn, {
		tick: e,
		tickLine: t,
		axisLine: n,
		...r
	});
}
function ui({ variant: e, roundness: t, defaultIndex: n }) {
	let { isLoading: r, selectedDataKey: i } = Z();
	return r ? null : /* @__PURE__ */ (0, X.jsx)(f, {
		defaultIndex: n,
		cursor: !1,
		content: /* @__PURE__ */ (0, X.jsx)(p, {
			selected: i,
			roundness: t,
			variant: e
		})
	});
}
function di({ variant: e, align: t = "center", verticalAlign: n = "bottom", isClickable: r = !1 }) {
	let { isLoading: i, selectedDataKey: a, selectDataKey: o } = Z();
	return i ? null : /* @__PURE__ */ (0, X.jsx)(l, {
		verticalAlign: n,
		align: t,
		content: /* @__PURE__ */ (0, X.jsx)(u, {
			selected: a,
			onSelectChange: o,
			isClickable: r,
			variant: e
		})
	});
}
var fi = (e, t, n, r) => {
	let i = !1, a = !1;
	return W.Children.forEach(e, (e) => {
		if ((0, W.isValidElement)(e)) {
			if (e.type === ai) {
				let { variant: a } = e.props;
				i = /* @__PURE__ */ (0, X.jsx)(Jr, {
					type: a,
					dataKey: n,
					chartId: t,
					fillOpacity: r
				});
			}
			if (e.type === oi) {
				let { variant: i } = e.props;
				a = /* @__PURE__ */ (0, X.jsx)(Jr, {
					type: i,
					dataKey: n,
					chartId: t,
					fillOpacity: r
				});
			}
		}
	}), {
		dot: i,
		activeDot: a
	};
}, pi = ({ dataKey: e, colorsCount: t, opacities: n }) => t === 1 ? /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [/* @__PURE__ */ (0, X.jsx)("stop", {
	offset: "0%",
	stopColor: `var(--color-${e}-0)`,
	stopOpacity: n?.[0]
}), /* @__PURE__ */ (0, X.jsx)("stop", {
	offset: "100%",
	stopColor: `var(--color-${e}-0)`,
	stopOpacity: n?.[n.length - 1]
})] }) : /* @__PURE__ */ (0, X.jsx)(X.Fragment, { children: Array.from({ length: t }, (r, i) => {
	let a = `${i / (t - 1) * 100}%`;
	return /* @__PURE__ */ (0, X.jsx)("stop", {
		offset: a,
		stopColor: `var(--color-${e}-${i}, var(--color-${e}-0))`,
		stopOpacity: n?.[i]
	}, a);
}) }), mi = ({ id: e, dataKey: t, config: n }) => {
	let r = fe(n[t] ?? {});
	return /* @__PURE__ */ (0, X.jsx)("linearGradient", {
		id: `${e}-colors-${t}`,
		x1: "0",
		y1: "0",
		x2: "1",
		y2: "0",
		children: /* @__PURE__ */ (0, X.jsx)(pi, {
			dataKey: t,
			colorsCount: r
		})
	});
}, hi = ({ id: e, dataKey: t, config: n }) => {
	let r = fe(n[t] ?? {});
	return /* @__PURE__ */ (0, X.jsx)("linearGradient", {
		id: `${e}-radar-stroke-${t}`,
		x1: "0",
		y1: "0",
		x2: "1",
		y2: "1",
		children: /* @__PURE__ */ (0, X.jsx)(pi, {
			dataKey: t,
			colorsCount: r
		})
	});
}, gi = ({ id: e, dataKey: t, config: n }) => {
	let r = fe(n[t] ?? {}), i = r === 1 ? [.8, .3] : Array.from({ length: r }, (e, t) => t === 0 ? .8 : .3);
	return /* @__PURE__ */ (0, X.jsx)("radialGradient", {
		id: `${e}-radar-fill-${t}`,
		cx: "50%",
		cy: "50%",
		r: "50%",
		children: /* @__PURE__ */ (0, X.jsx)(pi, {
			dataKey: t,
			colorsCount: r,
			opacities: i
		})
	});
}, _i = ({ id: e, dataKey: t }) => /* @__PURE__ */ (0, X.jsxs)("filter", {
	id: `${e}-radar-glow-${t}`,
	x: "-50%",
	y: "-50%",
	width: "200%",
	height: "200%",
	children: [
		/* @__PURE__ */ (0, X.jsx)("feGaussianBlur", {
			in: "SourceGraphic",
			stdDeviation: "4",
			result: "blur"
		}),
		/* @__PURE__ */ (0, X.jsx)("feColorMatrix", {
			in: "blur",
			type: "matrix",
			values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.6 0",
			result: "glow"
		}),
		/* @__PURE__ */ (0, X.jsxs)("feMerge", { children: [/* @__PURE__ */ (0, X.jsx)("feMergeNode", { in: "glow" }), /* @__PURE__ */ (0, X.jsx)("feMergeNode", { in: "SourceGraphic" })] })
	]
}), vi = (e) => [
	"A",
	"B",
	"C",
	"D",
	"E",
	"F"
].slice(0, e).map((e) => ({
	skill: e,
	[ni]: 30 + Math.random() * 70
}));
function yi(e, t = ei) {
	let [n, r] = (0, W.useState)(0);
	return (0, W.useEffect)(() => {
		if (!e) return;
		let t = setInterval(() => {
			r((e) => e + 1);
		}, ti);
		return () => clearInterval(t);
	}, [e]), (0, W.useMemo)(() => vi(t), [t, n]);
}
var bi = () => /* @__PURE__ */ (0, X.jsx)(zr, {
	dataKey: ni,
	stroke: "currentColor",
	strokeOpacity: .3,
	strokeWidth: 2,
	fill: "currentColor",
	fillOpacity: .1,
	dot: !1,
	isAnimationActive: !0,
	animationDuration: ti,
	animationEasing: "ease-in-out"
});
Q.Radar = ii, Q.Dot = ai, Q.ActiveDot = oi, Q.PolarGrid = si, Q.PolarAngleAxis = ci, Q.PolarRadiusAxis = li, Q.Tooltip = ui, Q.Legend = di;
// src/react/taste/charts.tsx
function xi(e) {
	let { x: t = 0, cx: n, textAnchor: r, payload: i, ...a } = e, o = String(i?.value ?? ""), s = typeof n == "number" ? n * 2 : 0, c = s ? r === "start" ? s - t : r === "end" ? t : 2 * Math.min(t, s - t) : 56;
	return /* @__PURE__ */ (0, X.jsxs)("g", { children: [/* @__PURE__ */ (0, X.jsx)("title", { children: o }), /* @__PURE__ */ (0, X.jsx)(E, {
		...a,
		x: t,
		textAnchor: r,
		fill: "currentColor",
		fontSize: 12,
		children: ce(o, c - 4)
	})] });
}
var Si = [
	"stroke-chart-1",
	"stroke-chart-2",
	"stroke-chart-3",
	"stroke-chart-4",
	"stroke-chart-5",
	"stroke-chart-6"
], Ci = [
	"fill-chart-1",
	"fill-chart-2",
	"fill-chart-3",
	"fill-chart-4",
	"fill-chart-5",
	"fill-chart-6"
], wi = { value: {
	label: "标签出现次数",
	colors: Ne(r[3])
} }, Ti = [
	"min-h-24",
	"min-h-24",
	"min-h-24",
	"min-h-32",
	"min-h-40",
	"min-h-48",
	"min-h-52",
	"min-h-60",
	"min-h-64"
], Ei = 26, Di = { radius: wi.value }, Oi = (e, t) => Math.sqrt(e / t);
function ki({ rows: e, label: t }) {
	let n = Rt(e);
	if (!n.length) return null;
	let r = n[0].value, i = n.map((e) => ({
		...e,
		radius: Oi(e.value, r)
	}));
	return /* @__PURE__ */ (0, X.jsx)("div", {
		role: "img",
		"aria-label": `${t}：${i.map((e) => e.name).join("，")}`,
		children: /* @__PURE__ */ (0, X.jsxs)(Q, {
			data: i,
			config: Di,
			chartProps: { outerRadius: "58%" },
			className: "aspect-auto h-70 text-text-secondary",
			children: [
				/* @__PURE__ */ (0, X.jsx)(Q.PolarGrid, {}),
				/* @__PURE__ */ (0, X.jsx)(Q.PolarAngleAxis, {
					dataKey: "name",
					tick: /* @__PURE__ */ (0, X.jsx)(xi, {})
				}),
				/* @__PURE__ */ (0, X.jsx)(Q.PolarRadiusAxis, {
					domain: [0, 1],
					allowDecimals: !0,
					tick: !1
				}),
				/* @__PURE__ */ (0, X.jsx)(Q.Radar, { dataKey: "radius" }),
				/* @__PURE__ */ (0, X.jsx)(d, { valueKey: "value" })
			]
		})
	});
}
function Ai({ rows: e, label: t }) {
	let n = Qt(e, 8);
	return n.length ? /* @__PURE__ */ (0, X.jsx)("section", {
		"aria-label": t,
		className: `flex grow flex-col ${Ti[n.length]}`,
		children: /* @__PURE__ */ (0, X.jsxs)(g, {
			data: n,
			config: wi,
			layout: "horizontal",
			barRadius: 4,
			chartProps: {
				maxBarSize: Ei,
				margin: {
					top: 5,
					right: 56,
					bottom: 5,
					left: 5
				}
			},
			className: "aspect-auto text-text-secondary",
			children: [
				/* @__PURE__ */ (0, X.jsx)(g.YAxis, {
					dataKey: "name",
					interval: 0,
					tick: /* @__PURE__ */ (0, X.jsx)(a, { along: "y" }),
					width: ie(n.map((e) => e.name))
				}),
				/* @__PURE__ */ (0, X.jsx)(g.XAxis, {
					hide: !0,
					domain: sn
				}),
				/* @__PURE__ */ (0, X.jsx)(g.Bar, {
					dataKey: "value",
					enableHoverHighlight: !0,
					barProps: {
						dataKey: "value",
						label: dn("right")
					}
				}),
				/* @__PURE__ */ (0, X.jsx)(d, {})
			]
		})
	}) : null;
}
function ji({ flows: e }) {
	let [t, r] = (0, W.useState)(null), i = kt(e);
	if (!i) return null;
	let a = t?.node ?? null, o = (e, n) => t ? a === null ? t.label === n : e.source === a || e.target === a : !0;
	return /* @__PURE__ */ (0, X.jsxs)("section", {
		className: n,
		children: [
			/* @__PURE__ */ (0, X.jsx)(c, {
				title: "创作者线索来源",
				figure: (t ? t.value : i.total).toLocaleString(),
				note: t ? t.label : "条线索"
			}),
			/* @__PURE__ */ (0, X.jsx)("ol", {
				"aria-label": "来源网站与创作者线索",
				className: "flex flex-col sm:hidden",
				children: [...i.links].sort((e, t) => t.value - e.value).map((e) => /* @__PURE__ */ (0, X.jsxs)("li", {
					className: "flex items-baseline justify-between gap-3 border-b border-separator-border py-2 text-body-2-regular text-text-primary last:border-b-0",
					children: [/* @__PURE__ */ (0, X.jsx)("span", {
						className: "min-w-0 wrap-anywhere",
						children: e.label
					}), /* @__PURE__ */ (0, X.jsx)("b", {
						className: "shrink-0 tabular-nums",
						children: e.value.toLocaleString()
					})]
				}, e.key))
			}),
			/* @__PURE__ */ (0, X.jsx)("div", {
				className: "min-w-0 max-sm:hidden",
				children: /* @__PURE__ */ (0, X.jsxs)("svg", {
					viewBox: `0 0 ${qe.width} ${i.height}`,
					fill: "none",
					role: "img",
					"aria-label": "来源网站与创作者线索",
					className: "block h-auto w-full",
					onPointerLeave: () => r(null),
					children: [/* @__PURE__ */ (0, X.jsx)("g", { children: i.links.map((e) => /* @__PURE__ */ (0, X.jsx)("path", {
						d: e.d,
						strokeWidth: e.width,
						tabIndex: 0,
						role: "img",
						"aria-label": `${e.label}：${e.value} 条线索`,
						fillOpacity: 0,
						strokeOpacity: o(e, e.label) ? .55 : .08,
						className: `outline-none transition-opacity ${Si[e.color]}`,
						onPointerEnter: () => r({
							value: e.value,
							label: e.label,
							node: null
						}),
						onFocus: () => r({
							value: e.value,
							label: e.label,
							node: null
						}),
						onBlur: () => r(null)
					}, e.key)) }), /* @__PURE__ */ (0, X.jsx)("g", { children: i.nodes.map((e) => /* @__PURE__ */ (0, X.jsxs)("g", {
						tabIndex: 0,
						role: "img",
						"aria-label": `${e.name}：${e.value} 条线索`,
						className: "outline-none focus-visible:opacity-100",
						onPointerEnter: () => r({
							value: e.value,
							label: e.name,
							node: e.index
						}),
						onFocus: () => r({
							value: e.value,
							label: e.name,
							node: e.index
						}),
						onBlur: () => r(null),
						children: [/* @__PURE__ */ (0, X.jsx)("rect", {
							x: e.x,
							y: e.y,
							width: 10,
							height: e.height,
							rx: 5,
							className: e.side === "source" ? Ci[e.color] : "fill-text-secondary"
						}), /* @__PURE__ */ (0, X.jsxs)("text", {
							x: Ke[e.side],
							y: e.y + e.height / 2,
							textAnchor: e.side === "source" ? "end" : "start",
							dominantBaseline: "middle",
							className: "fill-text-secondary text-caption-1-regular",
							children: [At(e.name), /* @__PURE__ */ (0, X.jsx)("tspan", {
								x: Ke[e.side],
								dy: 15,
								children: e.side === "source" ? e.value.toLocaleString() : `${e.share.toFixed(1)}%`
							})]
						})]
					}, e.id)) })]
				})
			}),
			/* @__PURE__ */ (0, X.jsxs)("footer", {
				className: "flex justify-between gap-3 text-caption-1-regular text-text-secondary max-sm:hidden",
				children: [/* @__PURE__ */ (0, X.jsx)("span", { children: "来源网站" }), /* @__PURE__ */ (0, X.jsx)("span", { children: "创作者 · 线索占比" })]
			})
		]
	});
}
// src/react/taste/browser-sources.tsx
var Mi = "flex min-w-0 items-center gap-3 rounded-xl bg-background-primary-default p-3";
function Ni({ browsers: e, sources: t, range: n, children: r }) {
	let [i, a] = (0, W.useState)(!1), [o, s] = (0, W.useState)(""), [c, l] = (0, W.useState)(""), u = tn({
		mutationFn: (e) => St(e, n),
		onSuccess: (e) => {
			V.setQueryData(H(n), e.dashboard), a(!1), s(""), l("");
		}
	});
	return /* @__PURE__ */ (0, X.jsxs)("section", {
		className: `${L()} flex flex-col gap-4`,
		"aria-label": "数据源",
		children: [
			/* @__PURE__ */ (0, X.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, X.jsx)("h3", {
					className: "text-title-2-medium text-text-primary",
					children: "数据源"
				}), /* @__PURE__ */ (0, X.jsx)(N, {
					variant: "secondary",
					onClick: () => a(!0),
					disabled: i,
					children: "添加浏览器"
				})]
			}),
			u.error ? /* @__PURE__ */ (0, X.jsx)(F, {
				tone: "error",
				children: z(u.error)
			}) : null,
			i ? /* @__PURE__ */ (0, X.jsxs)("form", {
				className: "flex flex-col gap-3",
				onSubmit: (e) => {
					e.preventDefault(), u.isPending || u.mutate({
						operation: "add",
						name: o,
						path: c
					});
				},
				children: [
					/* @__PURE__ */ (0, X.jsx)(Xe, {
						label: "浏览器名称",
						value: o,
						onChange: s,
						maxLength: 80,
						isRequired: !0,
						isDisabled: u.isPending
					}),
					/* @__PURE__ */ (0, X.jsx)(Xe, {
						label: "资料目录或历史文件",
						value: c,
						onChange: l,
						maxLength: 1024,
						isRequired: !0,
						isDisabled: u.isPending,
						hint: "请选择运行 Peach 的电脑上的浏览器资料。"
					}),
					/* @__PURE__ */ (0, X.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, X.jsx)(N, {
							variant: "ghost",
							disabled: u.isPending,
							onClick: () => {
								a(!1), u.reset();
							},
							children: "取消"
						}), /* @__PURE__ */ (0, X.jsx)(N, {
							type: "submit",
							variant: "secondary",
							disabled: !o.trim() || !c.trim(),
							...I(u.isPending),
							children: "添加"
						})]
					})
				]
			}) : null,
			/* @__PURE__ */ (0, X.jsxs)("div", {
				className: "inline-grid w-full min-w-0 gap-2 sm:grid-cols-2",
				children: [r, e.map((e) => {
					let n = t.filter((t) => e.source_keys?.includes(t.source_key)), r = n.reduce((e, t) => e + (t.visits || 0), 0), i = n.reduce((e, t) => e + (t.bookmarks || 0), 0);
					return /* @__PURE__ */ (0, X.jsxs)("div", {
						"data-taste-source": "browser",
						className: Mi,
						children: [
							/* @__PURE__ */ (0, X.jsx)("span", {
								className: "inline-grid size-8 shrink-0 place-items-center rounded-lg text-text-secondary",
								children: /* @__PURE__ */ (0, X.jsx)(pn, { name: e.name })
							}),
							/* @__PURE__ */ (0, X.jsxs)("div", {
								className: "flex min-w-0 grow flex-col gap-0.5",
								children: [
									/* @__PURE__ */ (0, X.jsx)("b", {
										className: "text-body-2-medium break-words text-text-primary",
										children: e.name
									}),
									/* @__PURE__ */ (0, X.jsx)("span", {
										className: "break-all text-caption-1-regular text-text-secondary",
										children: e.path
									}),
									/* @__PURE__ */ (0, X.jsx)("span", {
										className: "text-caption-1-regular text-text-secondary",
										children: e.enabled ? e.available ? `历史与书签 · ${e.profiles} 个资料` : "资料目录不可用" : "已停止读取"
									}),
									n.length ? /* @__PURE__ */ (0, X.jsxs)("span", {
										className: "text-caption-1-regular text-text-secondary",
										children: [
											r.toLocaleString(),
											" 条历史 · ",
											i.toLocaleString(),
											" 枚书签"
										]
									}) : null
								]
							}),
							/* @__PURE__ */ (0, X.jsxs)("span", {
								className: "flex shrink-0 gap-1",
								children: [/* @__PURE__ */ (0, X.jsx)(N, {
									variant: "secondary",
									size: "small",
									...I(u.isPending),
									iconOnly: !0,
									leadingIcon: e.enabled ? nt : Je,
									"aria-label": `${e.enabled ? "停止读取" : "启用"} ${e.name}`,
									onClick: () => {
										e.enabled ? Ct({
											title: `停止读取 ${e.name}`,
											body: "已导入的历史与书签仍用于口味分析。",
											confirmLabel: "停止读取",
											onConfirm: () => u.mutateAsync({
												operation: "disable",
												id: e.id
											})
										}) : u.mutate({
											operation: "enable",
											id: e.id
										});
									}
								}), /* @__PURE__ */ (0, X.jsx)(N, {
									variant: "secondary",
									size: "small",
									iconOnly: !0,
									leadingIcon: Ze,
									...I(u.isPending),
									"aria-label": `删除 ${e.name}`,
									onClick: () => {
										Ct({
											title: `删除 ${e.name}`,
											body: "移除该浏览器的读取配置和已导入历史、书签，浏览器原文件保留。可以通过添加浏览器重新接入。",
											confirmLabel: "删除浏览器来源",
											danger: !0,
											onConfirm: () => u.mutateAsync({
												operation: "delete_browser",
												id: e.id
											})
										});
									}
								})]
							})
						]
					}, e.id);
				})]
			})
		]
	});
}
// src/react/taste/taste-page.tsx
var Pi = 10, Fi = wt(Qe, $e, "text-body-2-medium"), Ii = `${L()} flex flex-col gap-4`, Li = "rounded-xl bg-background-primary-default p-3", Ri = "读取运行 Peach 的这台电脑上的浏览历史与书签", zi = "导入或读取浏览记录后，这里会列出记录来自哪些设备。", Bi = "馆藏中暂时没有与你浏览过的内容相符的标签。", Vi = "读取浏览记录后，这里会按类别汇总你浏览过的内容。", Hi = "这些标签出现在浏览记录中，Peach 的观看或评价记录中尚未出现这些标签", Ui = "采集浏览记录后，这里会列出浏览过的标签。", Wi = "采集浏览记录后，这里会列出浏览过的创作者。", Gi = "采集浏览记录后，这里会列出常访问的网站。", Ki = "在 Peach 里播放或评价作品后，这里会列出对应的标签。", qi = "在 Peach 里播放或评价作品后，这里会列出对应的创作者。", Ji = "在 Peach 里播放或评价作品后，这里会列出对应的女优。", Yi = "在运行 Peach 的电脑上使用浏览器：点上面的「读取浏览器记录」。", Xi = "记录在其他设备上：导出文件后，选择「导入历史文件」或「导入书签文件」。书签支持浏览器导出的 HTML 文件和 Chromium Bookmarks JSON 文件。", Zi = "需要刷新时再次读取或导入；数据源可在页面底部移除。", Qi = "删除这个来源的已导入记录，原始文件保留。若浏览器仍启用，下次读取会再次导入。", $i = "peach-taste-guide-dismissed", ea = (0, W.createContext)(/* @__PURE__ */ (0, X.jsx)(Ue, {
	size: "small",
	href: "/",
	children: "浏览馆藏"
}));
function ta() {
	return (0, W.useContext)(ea);
}
function $({ icon: e, term: t, figure: n, detail: r, detailTitle: i, accent: a }) {
	return /* @__PURE__ */ (0, X.jsx)("div", {
		className: Kt(),
		children: /* @__PURE__ */ (0, X.jsx)(dt, {
			label: t,
			icon: e,
			accent: a,
			figure: n,
			footer: /* @__PURE__ */ (0, X.jsx)("span", {
				className: "block min-w-0 truncate",
				title: i || r,
				children: r ?? ""
			})
		})
	});
}
function na({ name: e, domain: t }) {
	return /* @__PURE__ */ (0, X.jsxs)("span", {
		className: "relative inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-background-tertiary-default text-caption-1-medium text-text-secondary",
		children: [Ot(e).toUpperCase(), /* @__PURE__ */ (0, X.jsx)("img", {
			src: Wt({ domain: t }),
			alt: "",
			loading: "lazy",
			width: 20,
			height: 20,
			onError: (e) => e.currentTarget.remove(),
			className: "absolute size-5 object-contain"
		})]
	});
}
function ra({ html: e }) {
	return /* @__PURE__ */ (0, X.jsx)("span", {
		className: `relative inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-background-tertiary-default text-caption-1-medium text-text-secondary ${an}`,
		dangerouslySetInnerHTML: { __html: e }
	});
}
function ia({ rows: e, kind: t, visual: n, empty: r, onSignal: i }) {
	if (!e.length) return /* @__PURE__ */ (0, X.jsx)(P, {
		size: "compact",
		icon: B,
		title: "记录还不够",
		actions: /* @__PURE__ */ (0, X.jsx)(ta, {}),
		children: r
	});
	let a = Bt(e);
	return /* @__PURE__ */ (0, X.jsx)(cn, {
		previewCount: Pi,
		className: "inline-grid w-full gap-x-7 gap-y-2 sm:grid-cols-2",
		children: e.map((e, r) => {
			let o = !!t && !!e.peach_items, s = String(e.source_domain || ""), c = /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [
				/* @__PURE__ */ (0, X.jsx)("svg", {
					viewBox: "0 0 100 1",
					preserveAspectRatio: "none",
					"aria-hidden": !0,
					className: "absolute inset-0 -z-10 size-full overflow-hidden rounded-lg opacity-15",
					children: /* @__PURE__ */ (0, X.jsx)("rect", {
						width: a[r],
						height: 1,
						className: "fill-chart-4"
					})
				}),
				/* @__PURE__ */ (0, X.jsx)("span", {
					className: "w-6 shrink-0 text-caption-1-regular tabular-nums text-text-secondary",
					children: r + 1
				}),
				n === "domain" ? /* @__PURE__ */ (0, X.jsx)(na, {
					name: e.name,
					domain: e.name
				}) : null,
				n === "creator" && !e.entity_id && !e.has_avatar && s ? /* @__PURE__ */ (0, X.jsx)(na, {
					name: e.name,
					domain: s
				}) : null,
				n !== "none" && n !== "domain" && (e.entity_id || e.has_avatar || !s) ? /* @__PURE__ */ (0, X.jsx)(ra, { html: bt(e.name, e.entity_id ? {
					id: e.entity_id,
					has_image: !!e.has_image,
					image_version: e.image_version,
					avatar_focus: e.avatar_focus,
					avatar_stand_in: e.avatar_stand_in
				} : null, e.has_avatar ? e.representative_asset_id ?? null : null, n === "creator" ? "creator" : t || "performer") }) : null,
				/* @__PURE__ */ (0, X.jsxs)("span", {
					className: "flex min-w-0 grow flex-col gap-0.5",
					children: [/* @__PURE__ */ (0, X.jsx)("b", {
						className: "min-w-0 text-body-medium break-words text-text-primary",
						children: e.name
					}), /* @__PURE__ */ (0, X.jsx)("small", {
						className: "text-caption-1-regular text-text-secondary",
						children: zt(e)
					})]
				}),
				o ? /* @__PURE__ */ (0, X.jsx)(Lt, {
					"aria-hidden": !0,
					className: "size-4 shrink-0 text-text-tertiary"
				}) : null
			] }), l = "relative isolate flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left";
			return /* @__PURE__ */ (0, X.jsx)("li", {
				className: "min-w-0",
				children: o ? /* @__PURE__ */ (0, X.jsx)("button", {
					type: "button",
					onClick: () => i(t, e.name),
					className: `${l} cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring`,
					children: c
				}) : /* @__PURE__ */ (0, X.jsx)("div", {
					className: l,
					children: c
				})
			}, `${e.name}:${r}`);
		})
	});
}
function aa({ label: e, panels: t, onSignal: n }) {
	return /* @__PURE__ */ (0, X.jsxs)(He, {
		className: `${L({ padding: "none" })} flex flex-col`,
		children: [/* @__PURE__ */ (0, X.jsx)("div", {
			className: "px-4 pt-3",
			children: /* @__PURE__ */ (0, X.jsx)(ct, {
				"aria-label": e,
				className: ot,
				children: t.map((e) => /* @__PURE__ */ (0, X.jsx)(Ve, {
					id: e.id,
					className: at,
					children: e.name
				}, e.id))
			})
		}), t.map((e) => /* @__PURE__ */ (0, X.jsx)(Be, {
			id: e.id,
			className: "px-4 pt-3.5 pb-4",
			children: /* @__PURE__ */ (0, X.jsx)(ia, {
				...e.props,
				onSignal: n
			})
		}, e.id))]
	});
}
function oa({ data: e, onSignal: t, navigate: n }) {
	let r = e.analysis;
	if (!r?.headline) return null;
	let i = r.confidence || {}, a = [...(r.explore || []).map((e) => ({
		key: `tag:${e.tag}`,
		title: e.title,
		detail: e.detail,
		act: () => t("tag", e.tag)
	})), ...(r.next_steps || []).map((e) => ({
		key: `route:${e.route}`,
		title: e.title,
		detail: e.detail,
		act: () => n(e.route)
	}))];
	return /* @__PURE__ */ (0, X.jsxs)("section", {
		className: Ii,
		"aria-label": "口味总结",
		children: [
			/* @__PURE__ */ (0, X.jsxs)("header", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, X.jsx)("h3", {
						className: "text-title-2-medium text-text-primary",
						children: "口味总结"
					}),
					/* @__PURE__ */ (0, X.jsx)("p", {
						className: "max-w-prose text-title-2-regular wrap-anywhere text-text-primary",
						children: r.headline
					}),
					/* @__PURE__ */ (0, X.jsxs)("p", {
						className: "flex flex-wrap items-center gap-2 text-body-2-regular text-text-secondary",
						children: [/* @__PURE__ */ (0, X.jsx)("i", {
							"aria-hidden": !0,
							className: `size-2 shrink-0 rounded-full ${i.level === "high" ? "bg-status-lime-text" : i.level === "medium" ? "bg-status-yellow-text" : "bg-text-tertiary"}`
						}), /* @__PURE__ */ (0, X.jsx)("span", {
							className: "min-w-0 wrap-anywhere",
							children: i.label || "仍在学习"
						})]
					})
				]
			}),
			r.points?.length ? /* @__PURE__ */ (0, X.jsx)("div", {
				className: "inline-grid w-full gap-3 sm:grid-cols-2",
				children: r.points.map((e) => /* @__PURE__ */ (0, X.jsxs)("div", {
					className: `flex min-w-0 flex-col gap-1 ${Li}`,
					children: [/* @__PURE__ */ (0, X.jsx)("span", {
						className: "text-caption-1-regular text-text-secondary",
						children: e.label
					}), /* @__PURE__ */ (0, X.jsx)("b", {
						className: "text-body-2-medium break-words text-text-primary",
						children: e.text
					})]
				}, e.label))
			}) : null,
			a.length ? /* @__PURE__ */ (0, X.jsx)("div", {
				className: "flex flex-col gap-2",
				children: a.map((e) => /* @__PURE__ */ (0, X.jsxs)("button", {
					type: "button",
					onClick: e.act,
					className: `flex w-full min-w-0 cursor-pointer items-center gap-3 ${Li} text-left outline-none hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring`,
					children: [/* @__PURE__ */ (0, X.jsxs)("span", {
						className: "flex min-w-0 grow flex-col gap-1",
						children: [/* @__PURE__ */ (0, X.jsx)("b", {
							className: "text-body-2-medium wrap-anywhere text-text-primary",
							children: e.title
						}), /* @__PURE__ */ (0, X.jsx)("small", {
							className: "text-caption-1-regular wrap-anywhere text-text-secondary",
							children: e.detail
						})]
					}), /* @__PURE__ */ (0, X.jsx)(Lt, {
						"aria-hidden": !0,
						className: "size-4 shrink-0 text-text-tertiary"
					})]
				}, e.key))
			}) : /* @__PURE__ */ (0, X.jsx)(P, {
				size: "compact",
				icon: B,
				title: "还没有可探索的入口",
				actions: /* @__PURE__ */ (0, X.jsx)(Ue, {
					size: "small",
					href: "/",
					children: "浏览馆藏"
				}),
				children: Bi
			})
		]
	});
}
function sa({ onboarding: e, done: t }) {
	let [n, r] = (0, W.useState)(() => {
		try {
			return localStorage.getItem($i) === "1";
		} catch {
			return !1;
		}
	});
	return t || n ? null : /* @__PURE__ */ (0, X.jsx)("div", {
		className: L({
			padding: "none",
			className: "p-4"
		}),
		children: /* @__PURE__ */ (0, X.jsxs)(We, {
			summary: "浏览器历史记录导入指南",
			defaultOpen: e,
			children: [
				/* @__PURE__ */ (0, X.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: Yi
				}),
				/* @__PURE__ */ (0, X.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: Xi
				}),
				/* @__PURE__ */ (0, X.jsxs)("ul", {
					className: "flex list-disc flex-col gap-1 pl-5 text-body-2-regular text-text-secondary",
					children: [/* @__PURE__ */ (0, X.jsxs)("li", { children: [
						"Chrome：在 ",
						/* @__PURE__ */ (0, X.jsxs)("a", {
							href: "https://takeout.google.com/",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "text-text-primary underline-offset-4 hover:underline",
							children: ["Google Takeout", /* @__PURE__ */ (0, X.jsx)(ht, {
								"aria-hidden": !0,
								className: "size-(--icon-inline) shrink-0"
							})]
						}),
						" ",
						"选择 Chrome 历史记录，下载 ZIP 后直接导入。"
					] }), /* @__PURE__ */ (0, X.jsxs)("li", { children: [
						"其他浏览器：用 ",
						/* @__PURE__ */ (0, X.jsxs)("a", {
							href: "https://github.com/purarue/browserexport",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "text-text-primary underline-offset-4 hover:underline",
							children: ["browserexport", /* @__PURE__ */ (0, X.jsx)(ht, {
								"aria-hidden": !0,
								className: "size-(--icon-inline) shrink-0"
							})]
						}),
						" ",
						"导出历史记录，再导入导出文件。"
					] })]
				}),
				/* @__PURE__ */ (0, X.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: Zi
				}),
				/* @__PURE__ */ (0, X.jsx)("span", {
					className: "self-start",
					children: /* @__PURE__ */ (0, X.jsx)(N, {
						variant: "secondary",
						size: "small",
						onClick: () => {
							try {
								localStorage.setItem($i, "1");
							} catch {}
							r(!0);
						},
						children: "跳过"
					})
				})
			]
		})
	});
}
function ca({ busy: e, onRefresh: t, onImport: n, onImportBookmarks: r }) {
	let i = (0, W.useRef)(null), [a, o] = (0, W.useState)(!1), s = (e) => {
		o(!1), e();
	};
	return /* @__PURE__ */ (0, X.jsxs)(X.Fragment, { children: [/* @__PURE__ */ (0, X.jsxs)("span", {
		"data-guide-target": "history-import",
		"data-button-group": !0,
		"data-split-button": !0,
		"data-variant": "primary",
		children: [/* @__PURE__ */ (0, X.jsx)(N, {
			leadingIcon: Ge,
			title: Ri,
			onClick: t,
			...I(e),
			children: "读取浏览器记录"
		}), /* @__PURE__ */ (0, X.jsx)(N, {
			ref: i,
			iconOnly: !0,
			leadingIcon: Tt,
			"aria-label": "更多取得浏览记录的方式",
			"aria-haspopup": "dialog",
			"aria-expanded": a,
			...I(e),
			onClick: () => {
				e || o(!0);
			}
		})]
	}), /* @__PURE__ */ (0, X.jsx)(ze, {
		triggerRef: i,
		isOpen: a,
		onOpenChange: o,
		placement: "bottom end",
		offset: 4,
		className: et,
		children: /* @__PURE__ */ (0, X.jsxs)(tt, {
			"aria-label": "更多取得浏览记录的方式",
			className: "flex w-52 flex-col gap-1 outline-none",
			children: [
				/* @__PURE__ */ (0, X.jsxs)("button", {
					type: "button",
					className: Fi,
					onClick: () => s(t),
					children: [/* @__PURE__ */ (0, X.jsx)(Ge, {
						"aria-hidden": !0,
						className: "size-4 shrink-0"
					}), "读取浏览器记录"]
				}),
				/* @__PURE__ */ (0, X.jsxs)("button", {
					type: "button",
					className: Fi,
					onClick: () => s(n),
					children: [/* @__PURE__ */ (0, X.jsx)(it, {
						"aria-hidden": !0,
						className: "size-4 shrink-0"
					}), "导入历史文件"]
				}),
				/* @__PURE__ */ (0, X.jsxs)("button", {
					type: "button",
					className: Fi,
					onClick: () => s(r),
					children: [/* @__PURE__ */ (0, X.jsx)(Mt, {
						"aria-hidden": !0,
						className: "size-4 shrink-0"
					}), "导入书签文件"]
				})
			]
		})
	})] });
}
function la({ sources: e, browsers: t, window: n, toast: r, emptyActions: i }) {
	let a = tn({
		mutationFn: (e) => Vt(e, n),
		onSuccess: (e) => {
			V.setQueryData(H(n), e.dashboard), r("已移除口味数据源");
		}
	});
	return /* @__PURE__ */ (0, X.jsxs)(Ni, {
		browsers: t,
		sources: e,
		range: n,
		children: [a.error ? /* @__PURE__ */ (0, X.jsx)("div", {
			className: "sm:col-span-2",
			children: /* @__PURE__ */ (0, X.jsx)(F, {
				tone: "error",
				children: z(a.error)
			})
		}) : null, e.length ? /* @__PURE__ */ (0, X.jsx)(X.Fragment, { children: e.filter((e) => !t.some((t) => t.source_keys?.includes(e.source_key))).map((e) => /* @__PURE__ */ (0, X.jsxs)("div", {
			"data-taste-source": "import",
			className: Mi,
			children: [
				/* @__PURE__ */ (0, X.jsx)("span", {
					className: "inline-grid size-8 shrink-0 place-items-center rounded-lg text-text-secondary",
					children: e.browser === "browserexport" ? /* @__PURE__ */ (0, X.jsx)(it, {
						"aria-hidden": !0,
						className: "size-4"
					}) : /* @__PURE__ */ (0, X.jsx)(_t, {
						"aria-hidden": !0,
						className: "size-4"
					})
				}),
				/* @__PURE__ */ (0, X.jsxs)("span", {
					className: "flex min-w-0 grow flex-col gap-0.5",
					children: [/* @__PURE__ */ (0, X.jsx)("b", {
						className: "min-w-0 text-body-2-medium break-words text-text-primary",
						children: e.profile
					}), /* @__PURE__ */ (0, X.jsx)("small", {
						className: "min-w-0 text-caption-1-regular break-words text-text-secondary",
						children: `导入文件 · ${e.host} · ${Number(e.visits || e.bookmarks || 0).toLocaleString()} ${e.bookmarks ? "枚书签" : "条历史"}`
					})]
				}),
				/* @__PURE__ */ (0, X.jsx)(N, {
					variant: "secondary",
					size: "small",
					"aria-label": `移除 ${e.profile}`,
					className: "shrink-0",
					iconOnly: !0,
					leadingIcon: Ze,
					...I(a.isPending),
					onClick: () => {
						a.isPending || Ct({
							title: "移除口味数据源",
							body: Qi,
							confirmLabel: "移除口味数据源",
							onConfirm: () => a.mutateAsync(e.source_key)
						});
					}
				})
			]
		}, e.source_key)) }) : t.length ? null : /* @__PURE__ */ (0, X.jsx)(P, {
			size: "compact",
			icon: _t,
			title: "还没有数据源",
			actions: i,
			children: zi
		})]
	});
}
function ua(e) {
	let { onSignal: t, navigate: n, toast: r, onboarding: i } = e, [a, o] = (0, W.useState)("all"), [s, c] = (0, W.useState)("browser"), l = (0, W.useRef)(null), u = (0, W.useRef)(null), d = nn({
		queryKey: H(a),
		queryFn: ({ signal: e }) => Et(a, e),
		placeholderData: Ft,
		refetchInterval: (e) => Xt(e.state.data)
	}), { job: f, running: p, outcome: m, start: h } = en({
		queryKey: ft,
		queryFn: ({ signal: e }) => Dt(e),
		start: () => Gt(a),
		idlePollMs: Ye,
		onFinish: (e) => {
			e.status !== "failed" && (V.invalidateQueries({ queryKey: ["taste"] }), r(e.warnings?.length ? "部分浏览记录未取得" : "已更新口味分析"));
		}
	}), g = tn({
		mutationFn: (e) => Et(e, void 0, !0),
		onSuccess: (e, t) => {
			V.setQueryData(H(t), e);
		}
	}), _ = tn({
		mutationFn: (e) => Pt(e),
		onSuccess: (e) => {
			V.setQueryData(H("all"), e.dashboard), o("all"), r("已导入口味数据");
		}
	}), v = (e) => {
		let t = e.currentTarget.files?.[0];
		e.currentTarget.value = "", t && !_.isPending && (_.reset(), _.mutate(t));
	}, y = () => {
		p || h.isPending || (h.reset(), h.mutate());
	}, b = d.data;
	if (!b) return /* @__PURE__ */ (0, X.jsx)(rn, { children: /* @__PURE__ */ (0, X.jsx)(F, {
		tone: "error",
		title: "口味分析读取失败",
		children: d.error ? z(d.error) : "读取口味分析失败"
	}) });
	let x = b.summary || {}, S = b.coverage || {}, C = b.rankings || {}, ee = b.storage || {}, w = Jt(C.browser_categories || []), T = Rt(w).length > 0, E = b.gaps || [], D = S.tagged || 0, te = S.identified || 0, ne = h.error ? z(h.error) : _.error ? z(_.error) : g.error ? z(g.error) : m?.status === "failed" ? m.error || "读取未取得" : "", re = /* @__PURE__ */ (0, X.jsxs)("div", {
		className: "flex flex-wrap justify-center gap-2",
		children: [/* @__PURE__ */ (0, X.jsx)(N, {
			variant: "secondary",
			...I(p || h.isPending || _.isPending),
			onClick: y,
			children: "读取浏览器记录"
		}), /* @__PURE__ */ (0, X.jsx)(N, {
			variant: "secondary",
			...I(_.isPending),
			onClick: () => l.current?.click(),
			children: "导入历史文件"
		})]
	});
	return /* @__PURE__ */ (0, X.jsx)(rn, { children: /* @__PURE__ */ (0, X.jsxs)(ea, {
		value: a === "all" ? s === "peach" ? /* @__PURE__ */ (0, X.jsx)(Ue, {
			size: "small",
			variant: "secondary",
			href: "/",
			children: "浏览馆藏"
		}) : re : /* @__PURE__ */ (0, X.jsx)(N, {
			size: "small",
			variant: "secondary",
			onClick: () => o("all"),
			children: "查看全部时间"
		}),
		children: [
			/* @__PURE__ */ (0, X.jsxs)(He, {
				selectedKey: s,
				onSelectionChange: (e) => c(String(e)),
				className: "flex flex-col gap-5",
				children: [
					/* @__PURE__ */ (0, X.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, X.jsxs)(ct, {
							"aria-label": "口味分析的数据来源",
							className: ot,
							children: [/* @__PURE__ */ (0, X.jsx)(Ve, {
								id: "browser",
								className: at,
								children: "浏览器记录"
							}), /* @__PURE__ */ (0, X.jsx)(Ve, {
								id: "peach",
								className: at,
								children: "Peach 观看与评价"
							})]
						}), /* @__PURE__ */ (0, X.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, X.jsx)(lt, {
									"aria-label": "分析范围",
									selectedKey: a,
									onSelectionChange: (e) => {
										e !== null && o(String(e));
									},
									children: pt.map(([e, t]) => /* @__PURE__ */ (0, X.jsx)(ut, {
										id: e,
										children: t
									}, e))
								}),
								/* @__PURE__ */ (0, X.jsx)(ca, {
									busy: p || h.isPending || _.isPending,
									onRefresh: y,
									onImport: () => l.current?.click(),
									onImportBookmarks: () => u.current?.click()
								}),
								/* @__PURE__ */ (0, X.jsx)("input", {
									ref: l,
									type: "file",
									tabIndex: -1,
									"aria-hidden": !0,
									className: "hidden",
									onChange: v
								}),
								/* @__PURE__ */ (0, X.jsx)("input", {
									ref: u,
									type: "file",
									tabIndex: -1,
									"aria-hidden": !0,
									className: "hidden",
									"data-bookmark-import": !0,
									onChange: v
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, X.jsx)(sa, {
						onboarding: i,
						done: !!(x.history_sources || b.updated_at)
					}),
					/* @__PURE__ */ (0, X.jsxs)("div", {
						"aria-live": "polite",
						className: "flex flex-col gap-3 empty:hidden",
						children: [
							p ? /* @__PURE__ */ (0, X.jsx)(mt, {
								label: f?.message || "正在读取浏览记录并更新口味分析",
								value: f?.checked,
								total: f?.total
							}) : null,
							_.isPending ? /* @__PURE__ */ (0, X.jsx)(mt, { label: "正在导入口味数据" }) : null,
							b.stale && b.error ? /* @__PURE__ */ (0, X.jsx)(F, {
								tone: "error",
								action: /* @__PURE__ */ (0, X.jsx)(N, {
									variant: "secondary",
									size: "small",
									...I(g.isPending),
									onClick: () => g.mutate(a),
									children: "立即重试"
								}),
								children: `口味分析更新失败，当前显示 ${Zt(b.computed_at)} 的结果。${b.error}`
							}) : b.stale ? /* @__PURE__ */ (0, X.jsx)(mt, { label: `正在更新口味分析，当前显示 ${Zt(b.computed_at)} 的结果` }) : null,
							ne ? /* @__PURE__ */ (0, X.jsx)(F, {
								tone: "error",
								children: ne
							}) : null,
							m?.warnings?.length ? /* @__PURE__ */ (0, X.jsx)(F, {
								tone: "warning",
								children: m.warnings.join("；")
							}) : null
						]
					}),
					/* @__PURE__ */ (0, X.jsxs)(Be, {
						id: "browser",
						className: "flex flex-col gap-5",
						children: [
							/* @__PURE__ */ (0, X.jsxs)("div", {
								className: st,
								children: [
									/* @__PURE__ */ (0, X.jsx)($, {
										accent: 0,
										icon: $t,
										term: "浏览记录",
										figure: Number(x.history_visits || 0).toLocaleString(),
										detail: Nt(x),
										detailTitle: `${qt(x.range_start)}—${qt(x.range_end)}`
									}),
									/* @__PURE__ */ (0, X.jsx)($, {
										accent: 1,
										icon: It,
										term: "口味维度",
										figure: w.length.toLocaleString(),
										detail: w[0]?.name || "尚无主维度"
									}),
									/* @__PURE__ */ (0, X.jsx)($, {
										accent: 2,
										icon: B,
										term: "浏览线索",
										figure: E.length.toLocaleString()
									}),
									/* @__PURE__ */ (0, X.jsx)($, {
										accent: 3,
										icon: Mt,
										term: "浏览器书签",
										figure: Number(x.bookmarks || 0).toLocaleString(),
										detail: `${Number(ee.exports || 0).toLocaleString()} 份私有导出 · ${jt(ee.bytes || 0)}`
									})
								]
							}),
							/* @__PURE__ */ (0, X.jsxs)("section", {
								className: T ? `${Ii} md:flex-row md:gap-6` : Ii,
								"aria-label": "浏览器画像",
								children: [/* @__PURE__ */ (0, X.jsxs)("div", {
									className: T ? "flex shrink-0 flex-col gap-2 pb-5 md:w-80 md:pr-6 md:pb-0" : "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1",
									children: [
										/* @__PURE__ */ (0, X.jsx)("span", {
											className: "text-caption-1-regular text-text-secondary",
											children: "浏览器画像"
										}),
										T ? /* @__PURE__ */ (0, X.jsx)(ki, {
											rows: w,
											label: "主要口味维度"
										}) : null,
										/* @__PURE__ */ (0, X.jsx)("small", {
											className: "text-caption-1-regular text-text-secondary",
											children: b.updated_at ? `更新于 ${qt(b.updated_at)}` : "尚未采集浏览记录"
										})
									]
								}), /* @__PURE__ */ (0, X.jsx)("div", {
									className: "flex min-w-0 grow flex-col",
									children: w.length ? /* @__PURE__ */ (0, X.jsx)(Ai, {
										rows: w,
										label: "口味维度排名"
									}) : /* @__PURE__ */ (0, X.jsx)(P, {
										size: "compact",
										icon: B,
										title: "暂无口味维度",
										actions: /* @__PURE__ */ (0, X.jsx)(ta, {}),
										children: Vi
									})
								})]
							}),
							/* @__PURE__ */ (0, X.jsx)(on, {
								activity: b.activity,
								title: "浏览活跃时间",
								dailyTitle: "每日活跃",
								words: {
									unit: "口味网站访问",
									series: "访问",
									cellUnit: "次访问"
								},
								tone: 4,
								empty: "还没有可用于分析的口味网站访问记录。"
							}),
							/* @__PURE__ */ (0, X.jsx)(ji, { flows: b.creator_flows }),
							/* @__PURE__ */ (0, X.jsx)(aa, {
								label: "浏览器口味维度",
								onSignal: t,
								panels: [
									{
										id: "tags",
										name: "标签",
										props: {
											rows: C.browser_tags || [],
											kind: "tag",
											visual: "none",
											empty: Ui
										}
									},
									{
										id: "creators",
										name: "创作者",
										props: {
											rows: C.browser_creators || [],
											kind: "creator",
											visual: "creator",
											empty: Wi
										}
									},
									{
										id: "performers",
										name: "女优",
										props: {
											rows: C.browser_performers || [],
											kind: "performer",
											visual: "entity",
											empty: "还没有与已建档女优关联的浏览记录。"
										}
									},
									{
										id: "domains",
										name: "常访问网站",
										props: {
											rows: C.domains || [],
											kind: "",
											visual: "domain",
											empty: Gi
										}
									},
									{
										id: "gaps",
										name: "浏览线索",
										props: {
											rows: E,
											kind: "",
											visual: "none",
											empty: Hi
										}
									}
								]
							})
						]
					}),
					/* @__PURE__ */ (0, X.jsxs)(Be, {
						id: "peach",
						className: "flex flex-col gap-5",
						children: [
							/* @__PURE__ */ (0, X.jsxs)("div", {
								className: st,
								children: [
									/* @__PURE__ */ (0, X.jsx)($, {
										accent: 0,
										icon: gt,
										term: "Peach 看过",
										figure: Number(x.peach_items || 0).toLocaleString(),
										detail: Yt(x.peach_seconds || 0)
									}),
									/* @__PURE__ */ (0, X.jsx)($, {
										accent: 1,
										icon: yt,
										term: "喜欢",
										figure: Number(x.liked || 0).toLocaleString()
									}),
									/* @__PURE__ */ (0, X.jsx)($, {
										accent: 2,
										icon: xt,
										term: "不合口味",
										figure: Number(x.disliked || 0).toLocaleString()
									}),
									/* @__PURE__ */ (0, X.jsx)($, {
										accent: 3,
										icon: It,
										term: "有标签",
										figure: D.toLocaleString()
									})
								]
							}),
							/* @__PURE__ */ (0, X.jsxs)("section", {
								className: `${Ii} md:flex-row md:gap-6`,
								"aria-label": "Peach 观看",
								children: [/* @__PURE__ */ (0, X.jsxs)("div", {
									className: "flex shrink-0 flex-col gap-0.5 pb-5 md:w-72 md:pr-6 md:pb-0",
									children: [
										/* @__PURE__ */ (0, X.jsx)("span", {
											className: "text-caption-1-regular text-text-secondary",
											children: "Peach 观看"
										}),
										/* @__PURE__ */ (0, X.jsx)("b", {
											className: "text-display-4-medium tabular-nums text-text-primary",
											children: Number(x.peach_items || 0).toLocaleString()
										}),
										/* @__PURE__ */ (0, X.jsx)("span", {
											className: "text-body-2-regular text-text-secondary",
											children: "部作品有观看或评价记录"
										})
									]
								}), /* @__PURE__ */ (0, X.jsxs)("div", {
									className: "flex min-w-0 grow flex-col",
									children: [/* @__PURE__ */ (0, X.jsx)(da, {
										term: "有标签",
										value: D,
										rest: S.untagged || 0
									}), /* @__PURE__ */ (0, X.jsx)(da, {
										term: "有身份",
										value: te,
										rest: S.unidentified || 0
									})]
								})]
							}),
							/* @__PURE__ */ (0, X.jsx)(aa, {
								label: "Peach 口味维度",
								onSignal: t,
								panels: [
									{
										id: "tags",
										name: "标签",
										props: {
											rows: C.peach_tags || [],
											kind: "tag",
											visual: "none",
											empty: Ki
										}
									},
									{
										id: "creators",
										name: "创作者",
										props: {
											rows: C.peach_creators || [],
											kind: "creator",
											visual: "creator",
											empty: qi
										}
									},
									{
										id: "performers",
										name: "女优",
										props: {
											rows: C.peach_performers || [],
											kind: "performer",
											visual: "entity",
											empty: Ji
										}
									}
								]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, X.jsx)(oa, {
				data: b,
				onSignal: t,
				navigate: n
			}),
			/* @__PURE__ */ (0, X.jsx)(la, {
				sources: b.sources || [],
				browsers: b.browsers || [],
				window: a,
				toast: r,
				emptyActions: re
			})
		]
	}) });
}
function da({ term: e, value: t, rest: n }) {
	let r = Math.max(t + n, 1);
	return /* @__PURE__ */ (0, X.jsxs)("div", {
		className: "flex flex-col gap-1.5 border-b border-separator-border py-3 last:border-b-0",
		children: [/* @__PURE__ */ (0, X.jsxs)("p", {
			className: "flex items-baseline justify-between gap-3 text-body-2-regular text-text-primary",
			children: [/* @__PURE__ */ (0, X.jsx)("span", { children: e }), /* @__PURE__ */ (0, X.jsxs)("b", {
				className: "tabular-nums",
				children: [t.toLocaleString(), /* @__PURE__ */ (0, X.jsx)("span", {
					className: "ml-1.5 text-caption-1-regular text-text-secondary",
					children: `${n.toLocaleString()} 项待补`
				})]
			})]
		}), /* @__PURE__ */ (0, X.jsx)(rt, {
			meter: !0,
			label: `${e}：${t.toLocaleString()} / ${r.toLocaleString()}`,
			value: t,
			max: r
		})]
	});
}
export { $i as TASTE_GUIDE_KEY, ua as TastePage };

//# debugId=50082b41-272c-44d5-a222-494f8bc12f4d
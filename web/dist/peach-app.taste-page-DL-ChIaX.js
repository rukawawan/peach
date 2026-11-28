(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "a87a367a-d962-4490-99fa-4f1816b03fb7", e._sentryDebugIdIdentifier = "sentry-dbid-a87a367a-d962-4490-99fa-4f1816b03fb7");
	} catch {}
})();
import { $542a13ca2fa5b484$export$5b6b19405a83ff9d as e, $b4f18e3395fe64d7$export$3d96ec278d3efce4 as t, $b4f18e3395fe64d7$export$3e41faf802a29e71 as n, $b4f18e3395fe64d7$export$b2539bed5023c21c as r, ActivePoints as i, AnimatedItems as a, Button as o, ButtonLink as s, CHART_CARD as c, CHART_COLORS as l, CartesianLabelListContextProvider as u, CategoryTick as d, ChartBackground as f, ChartContainer as p, ChartHead as m, ChartLegend as h, ChartLegendContent as g, ChartTip as _, ChartTooltip as v, ChartTooltipContent as y, DataLabelColorsContextProvider as b, DataLabelThemeContextProvider as x, DefaultZIndexes as S, Disclosure as C, Dots as w, E3 as T, EmptyState as E, EvilBarChart as D, FLOW_LABEL_X as O, FLOW_VIEWBOX as k, FillObjectDefinition as ee, Gg as A, Input as j, LEGACY_AVATAR_IMG as te, LabelListFromLabelProp as ne, Layer as M, LoadingIndicator as re, M6 as ie, MENU_ITEM as ae, MENU_ITEM_INTERACTIVE as oe, MENU_POPOVER_SURFACE as se, MenuDialog as ce, Note as N, OV as le, PolarLabelContextProvider as ue, PolarLabelFromLabelProp as de, Progress as fe, RegisterGraphicalItemId as pe, Rf as me, SEGMENT as he, SEGMENTED_TRACK as ge, STAT_STRIP as _e, SegmentedTabList as ve, Select$1 as ye, SelectItem as be, SetPolarGraphicalItem as xe, SetPolarLegendPayload as Se, SetTooltipEntrySettings as Ce, StatCard as we, TASTE_REFRESH_KEY as Te, TASTE_REFRESH_TASK as Ee, TASTE_WINDOWS as De, TaskProgress as Oe, Text as ke, Wt as Ae, Xt as je, ZIndexLayer as Me, _8 as Ne, __toESM as Pe, aB as Fe, activityKind as Ie, adaptEventsOfChild as Le, addRadiusAxis as Re, arrayTooltipSearcher as ze, avatarInner as Be, busyProps as P, cB as Ve, cardClass as He, categoryAxisWidth as Ue, clsx as We, cn as Ge, codedText as F, configureTasteBrowser as Ke, confirmModal as qe, createSelector as I, cx as Je, defaultPolarRadiusAxisProps as Ye, errorMessage as L, f1 as Xe, fetchTaste as Ze, fetchTasteJob as Qe, firstGrapheme as $e, fitLabel as et, flowGraph as tt, flowLabel as nt, fmtSize as rt, g4 as it, getAxisTypeBasedOnLayout as at, getBandSizeOfAxis as ot, getClassNameFromUnknown as st, getColorsCount as ct, getDotSymbol as lt, getFillUrl as ut, getLegendPayloadDot as dt, getPercentValue as ft, getSeriesFillId as pt, getTooltipNameProp as mt, getValueByDataKey as ht, historySpan as gt, identity as _t, importTasteExport as vt, interpolate as yt, isArrayLike as bt, isCategoricalAxis as xt, isNullish as St, iteratee as Ct, jobText as wt, joinList as Tt, keepPreviousData as Et, mM as Dt, matchAnimationItems as Ot, matchByIndex as kt, noop as At, polarToCartesian as R, pv as jt, queryClient as z, r2 as Mt, radarRows as Nt, rankDetail as Pt, rankShares as Ft, removeRadiusAxis as It, removeTasteSource as Lt, require_jsx_runtime as Rt, require_react as zt, resolveDefaultProps as Bt, selectAngleAxis as Vt, selectAngleAxisRangeWithReversed as Ht, selectChartDataAndAlwaysIgnoreIndexes as Ut, selectChartLayout as Wt, selectPolarViewBox as Gt, selectRadiusAxis as Kt, serverLabel as qt, serverLabelList as Jt, siteMarkUrl as Yt, splitFill as Xt, startTasteRefresh as Zt, statCardClass as Qt, svgPropertiesAndEvents as $t, svgPropertiesNoEvents as B, svgPropertiesNoEventsFromUnknown as en, t as V, tasteDate as tn, tasteDimensions as nn, tasteHours as rn, tasteKey as H, tasteRefetchInterval as an, tasteTime as on, tone as sn, topScores as cn, uo as ln, useAnimationCallbacks as un, useAnimationStartSnapshot as dn, useAppDispatch as fn, useAppSelector as U, useBackgroundJob as pn, useBackwardsCompatibleTheme as mn, useEffectiveDataKey as hn, useFillPaint as gn, useGraphicalItemIdentity as _n, useGraphicalItemThemeFill as vn, useIsPanorama as yn, useMutation as bn, usePolarChartLayout as xn, useQuery as Sn, useRechartsTheme as Cn, useSeriesDataLabelColors as wn, useSeriesLabelThemeResolver as Tn, useThemeFillObject as En, useThemedActiveStyles as Dn, useUnthemedColors as On, withFillColor as kn } from "./peach-app.js";
import { ActivityHeat as An, BAR_DOMAIN as jn, ExpandableRanking as Mn, PolarAngleAxis as Nn, Polygon as Pn, barLabel as Fn, selectPolarAngleAxisTicks as In, selectPolarAxisScale as Ln, selectPolarAxisTicks as Rn } from "./peach-app.expandable-ranking-Bxr5Gn6r.js";
import { Page as zn } from "./peach-app.page-QAncjzM1.js";
import { PolarChart as Bn, defaultPolarChartProps as Vn, selectUnfilteredPolarItems as Hn } from "./peach-app.PolarChart-CeCYLBHr.js";
import { BrowserIcon as Un } from "./peach-app.browser-icon-N9Od-bAf.js";
var Wn = I([(e, t) => In(e, "angleAxis", t, !1)], (e) => {
	if (e) return e.map((e) => e.coordinate);
}), Gn = I([(e, t) => Rn(e, "radiusAxis", t, !1)], (e) => {
	if (e) return e.map((e) => e.coordinate);
}), W = /* @__PURE__ */ Pe(zt()), Kn = [
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
function qn(e, t) {
	if (e == null) return {};
	var n, r, i = Jn(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function Jn(e, t) {
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
function Yn(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function K(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Yn(Object(n), !0).forEach(function(t) {
			Xn(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Yn(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Xn(e, t, n) {
	return (t = Zn(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Zn(e) {
	var t = Qn(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Qn(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var $n = (e, t, n, r) => {
	var i = "";
	return r.forEach((r, a) => {
		var o = R(t, n, e, r);
		i += a ? `L ${o.x},${o.y}` : `M ${o.x},${o.y}`;
	}), i += "Z", i;
}, er = (e) => {
	var t = e.cx, n = e.cy, r = e.innerRadius, i = e.outerRadius, a = e.polarAngles, o = e.radialLines;
	if (!a || !a.length || !o) return null;
	var s = K({}, B(e));
	return /*#__PURE__*/ W.createElement("g", { className: "recharts-polar-grid-angle" }, a.map((e) => {
		var a = R(t, n, r, e), o = R(t, n, i, e);
		return /*#__PURE__*/ W.createElement("line", G({ key: `line-${e}` }, s, {
			x1: a.x,
			y1: a.y,
			x2: o.x,
			y2: o.y
		}));
	}));
}, tr = (e) => {
	var t = e.cx, n = e.cy, r = e.radius, i = K({}, B(e));
	return /*#__PURE__*/ W.createElement("circle", G({}, i, {
		className: We("recharts-polar-grid-concentric-circle", e.className),
		cx: t,
		cy: n,
		r
	}));
}, nr = (e) => {
	var t = e.radius, n = K({}, B(e));
	return /*#__PURE__*/ W.createElement("path", G({}, n, {
		className: We("recharts-polar-grid-concentric-polygon", e.className),
		d: $n(t, e.cx, e.cy, e.polarAngles)
	}));
}, rr = (e) => {
	var t = e.polarRadius, n = e.gridType;
	if (!t || !t.length) return null;
	var r = Math.max(...t), i = e.fill && e.fill !== "none";
	return /*#__PURE__*/ W.createElement("g", { className: "recharts-polar-grid-concentric" }, i && n === "circle" && /*#__PURE__*/ W.createElement(tr, G({}, e, { radius: r })), i && n !== "circle" && /*#__PURE__*/ W.createElement(nr, G({}, e, { radius: r })), t.map((t, r) => {
		var i = r;
		return n === "circle" ? /*#__PURE__*/ W.createElement(tr, G({ key: i }, e, {
			fill: "none",
			radius: t
		})) : /*#__PURE__*/ W.createElement(nr, G({ key: i }, e, {
			fill: "none",
			radius: t
		}));
	}));
}, ir = {
	stroke: "#ccc",
	strokeWidth: 1,
	fill: "none"
}, ar = {
	angleAxisId: 0,
	radiusAxisId: 0,
	gridType: "polygon",
	radialLines: !0,
	zIndex: S.grid
}, or = (e) => {
	var t = K(K({}, e), {}, { fill: Xt(e.fill).color }), n = mn((e) => kn(e.grid), t, ir), r = En((e) => e.grid), i = gn(e.fill ?? r, n.fill, "recharts-polar-grid-fill"), a = K(K(K({}, t), n), {}, { fill: i.paint }), o = Bt(a, ar), s = o.gridType, c = o.radialLines, l = o.angleAxisId, u = o.radiusAxisId, d = o.cx, f = o.cy, p = o.innerRadius, m = o.outerRadius, h = o.polarAngles, g = o.polarRadius, _ = o.zIndex, v = qn(o, Kn), y = U(Gt), b = U((e) => Wn(e, l)), x = U((e) => Gn(e, u)), S = Array.isArray(h) ? h : b, C = Array.isArray(g) ? g : x;
	if (S == null || C == null) return null;
	var w = y?.outerRadius ?? m ?? 0;
	if (w <= 0) return null;
	var T = C.map((e) => ft(e, w)), E = K({
		cx: y?.cx ?? d ?? 0,
		cy: y?.cy ?? f ?? 0,
		innerRadius: y?.innerRadius ?? p ?? 0,
		outerRadius: w,
		polarAngles: S,
		polarRadius: T,
		zIndex: _
	}, v);
	return /*#__PURE__*/ W.createElement(Me, { zIndex: E.zIndex }, /*#__PURE__*/ W.createElement("g", { className: "recharts-polar-grid" }, i.definition != null && /*#__PURE__*/ W.createElement("defs", null, i.definition), /*#__PURE__*/ W.createElement(rr, G({
		gridType: s,
		radialLines: c
	}, E, {
		polarAngles: S,
		polarRadius: T
	})), /*#__PURE__*/ W.createElement(er, G({
		gridType: s,
		radialLines: c
	}, E, {
		polarAngles: S,
		polarRadius: T
	}))));
};
or.displayName = "PolarGrid";
// node_modules/es-toolkit/dist/compat/_internal/toArray.mjs
function sr(e) {
	return Array.isArray(e) ? e : Array.from(e);
}
// node_modules/es-toolkit/dist/compat/math/maxBy.mjs
function cr(e, t = _t) {
	if (e == null) return;
	let n = sr(e);
	if (n.length === 0) return;
	let r = Ct(t), i, a;
	for (let e = 0; e < n.length; e++) {
		let t = n[e], o = r(t, e, n);
		o == null || Number.isNaN(o) || typeof o == "symbol" || (a === void 0 || o > a) && (a = o, i = t);
	}
	return i;
}
// node_modules/es-toolkit/dist/compat/math/minBy.mjs
function lr(e, t = _t) {
	if (e == null) return;
	let n = sr(e);
	if (n.length === 0) return;
	let r = Ct(t), i, a;
	for (let e = 0; e < n.length; e++) {
		let t = n[e], o = r(t, e, n);
		o == null || Number.isNaN(o) || typeof o == "symbol" || (a === void 0 || o < a) && (a = o, i = t);
	}
	return i;
}
// node_modules/recharts/es6/polar/PolarRadiusAxis.js
var ur = ["type"], dr = [
	"cx",
	"cy",
	"angle",
	"axisLine"
], fr = [
	"angle",
	"tickFormatter",
	"stroke",
	"tick"
];
function q() {
	return q = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, q.apply(null, arguments);
}
function pr(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function J(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? pr(Object(n), !0).forEach(function(t) {
			mr(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : pr(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function mr(e, t, n) {
	return (t = hr(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function hr(e) {
	var t = gr(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function gr(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function _r(e, t) {
	if (e == null) return {};
	var n, r, i = vr(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function vr(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var yr = "radiusAxis", br = { stroke: "#ccc" };
function xr(e) {
	var t = fn(), n = xn(), r = (0, W.useMemo)(() => {
		var t = e.type, r = _r(e, ur), i = at(n, "radiusAxis", t);
		if (i != null) return J(J({}, r), {}, { type: i });
	}, [e, n]);
	return (0, W.useEffect)(() => r == null ? At : (t(Re(r)), () => {
		t(It(r));
	}), [t, r]), null;
}
var Sr = (e, t, n, r) => {
	var i = e.coordinate;
	return R(n, r, i, t);
}, Cr = (e) => {
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
}, wr = (e, t, n, r) => {
	var i = cr(r, (e) => e.coordinate || 0);
	return {
		cx: t,
		cy: n,
		startAngle: e,
		endAngle: e,
		innerRadius: lr(r, (e) => e.coordinate || 0)?.coordinate || 0,
		outerRadius: i?.coordinate || 0,
		clockWise: !1
	};
}, Tr = (e, t) => {
	var n = e.cx, r = e.cy, i = e.angle, a = e.axisLine, o = _r(e, dr), s = t.reduce((e, t) => [Math.min(e[0], t.coordinate), Math.max(e[1], t.coordinate)], [1e400, -1e400]), c = R(n, r, s[0], i), l = R(n, r, s[1], i), u = J(J(J({}, B(o)), {}, { fill: "none" }, B(a)), {}, {
		x1: c.x,
		y1: c.y,
		x2: l.x,
		y2: l.y
	});
	return /*#__PURE__*/ W.createElement("line", q({ className: "recharts-polar-radius-axis-line" }, u));
}, Er = (e, t, n) => /*#__PURE__*/ W.isValidElement(e) ? /*#__PURE__*/ W.cloneElement(e, t) : typeof e == "function" ? e(t) : /*#__PURE__*/ W.createElement(ke, q({}, t, { className: "recharts-polar-radius-axis-tick-value" }), n), Dr = (e, t) => {
	var n = e.angle, r = e.tickFormatter, i = e.stroke, a = e.tick, o = _r(e, fr), s = Cr(e.orientation), c = B(o), l = en(a), u = t.map((t, o) => {
		var u = Sr(t, e.angle, e.cx, e.cy), d = J(J(J(J({
			textAnchor: s,
			transform: `rotate(${90 - n}, ${u.x}, ${u.y})`
		}, c), {}, {
			stroke: "none",
			fill: i
		}, l), {}, { index: o }, u), {}, { payload: t });
		return /*#__PURE__*/ W.createElement(M, q({
			className: We("recharts-polar-radius-axis-tick", st(a)),
			key: `tick-${t.coordinate}`
		}, Le(e, t, o)), Er(a, d, r ? r(t.value, o) : t.value));
	});
	return /*#__PURE__*/ W.createElement(M, { className: "recharts-polar-radius-axis-ticks" }, u);
}, Or = (e) => {
	var t = e.radiusAxisId, n = mn((e) => e.axis, {
		stroke: e.stroke,
		strokeWidth: e.strokeWidth,
		strokeOpacity: e.strokeOpacity,
		strokeDasharray: e.strokeDasharray
	}, br), r = U(Gt), i = U((e) => Ln(e, "radiusAxis", t)), a = U((e) => Rn(e, "radiusAxis", t, !1));
	if (r == null || !a || !a.length || i == null) return null;
	var o = J(J(J({}, e), n), {}, { scale: i }, r), s = o.tick, c = o.axisLine;
	return /*#__PURE__*/ W.createElement(Me, { zIndex: o.zIndex }, /*#__PURE__*/ W.createElement(M, { className: We("recharts-polar-radius-axis", yr, o.className) }, c && Tr(o, a), s && Dr(o, a), /*#__PURE__*/ W.createElement(ue, wr(o.angle, o.cx, o.cy, a), /*#__PURE__*/ W.createElement(de, { label: o.label }), o.children)));
};
function kr(e) {
	var t = Bt(e, Ye);
	return /*#__PURE__*/ W.createElement(W.Fragment, null, /*#__PURE__*/ W.createElement(xr, {
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
	}), /*#__PURE__*/ W.createElement(Or, t));
}
kr.displayName = "PolarRadiusAxis";
// node_modules/es-toolkit/dist/array/last.mjs
function Ar(e) {
	return e[e.length - 1];
}
// node_modules/es-toolkit/dist/compat/array/last.mjs
function jr(e) {
	if (bt(e) && e.length !== 0) return Ar(sr(e));
}
// node_modules/recharts/es6/state/selectors/radarSelectors.js
function Mr(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Nr(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Mr(Object(n), !0).forEach(function(t) {
			Pr(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Mr(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Pr(e, t, n) {
	return (t = Fr(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Fr(e) {
	var t = Ir(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Ir(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var Lr = (e, t) => Ln(e, "radiusAxis", t), Rr = I([Lr], (e) => {
	if (e != null) return { scale: e };
}), zr = I([Kt, Lr], (e, t) => {
	if (e != null && t != null) return Nr(Nr({}, e), {}, { scale: t });
}), Br = (e, t, n, r) => Rn(e, "radiusAxis", t, r), Vr = (e, t, n) => Vt(e, n), Hr = (e, t, n) => Ln(e, "angleAxis", n), Ur = I([Vr, Hr], (e, t) => {
	if (e != null && t != null) return Nr(Nr({}, e), {}, { scale: t });
}), Wr = (e, t, n, r) => Rn(e, "angleAxis", n, r), Gr = I([
	Vr,
	Hr,
	Gt,
	(e, t, n) => Ht(e, n)
], (e, t, n, r) => {
	if (n != null && t != null && r != null) return {
		scale: t,
		type: e.type,
		dataKey: e.dataKey,
		cx: n.cx,
		cy: n.cy,
		range: r
	};
}), Kr = (e, t, n, r, i) => i, qr = I([
	Wt,
	zr,
	Br,
	Ur,
	Wr
], (e, t, n, r, i) => xt(e, "radiusAxis") ? ot(t, n, !1) : ot(r, i, !1)), Jr = I([Hn, Kr], (e, t) => {
	if (e != null) return e.find((e) => e.type === "radar" && t === e.id)?.dataKey;
}), Yr = I([
	Rr,
	Gr,
	Ut,
	Jr,
	qr
], (e, t, n, r, i) => {
	var a = n.chartData, o = n.dataStartIndex, s = n.dataEndIndex;
	if (e != null && t != null && a != null && i != null && r != null) return ci({
		radiusAxis: e,
		angleAxis: t,
		displayedData: a.slice(o, s + 1),
		dataKey: r,
		bandSize: i
	});
}), Xr = [
	"id",
	"dotFill",
	"unthemedColors"
], Zr = [
	"shape",
	"isRange",
	"connectNulls",
	"dotFill",
	"fillObject"
];
function Y() {
	return Y = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, Y.apply(null, arguments);
}
function Qr(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function X(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Qr(Object(n), !0).forEach(function(t) {
			$r(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Qr(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function $r(e, t, n) {
	return (t = ei(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function ei(e) {
	var t = ti(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function ti(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function ni(e, t) {
	if (e == null) return {};
	var n, r, i = ri(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function ri(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function ii(e, t) {
	return e && e !== "none" ? e : t;
}
var ai = (e, t, n) => {
	var r = e.dataKey, i = e.name, a = e.stroke, o = e.fill, s = e.legendType, c = e.hide, l = e.dot;
	return [{
		inactive: c,
		dataKey: r,
		type: s,
		dot: dt(l, {
			fill: t ?? o,
			stroke: a
		}, !1),
		color: ii(a, o),
		fill: n,
		value: mt(i, r),
		payload: e
	}];
}, oi = /*#__PURE__*/ W.memo((e) => {
	var t = e.dataKey, n = e.stroke, r = e.strokeWidth, i = e.fill, a = e.name, o = e.hide, s = e.tooltipType, c = e.id, l = {
		dataDefinedOnItem: void 0,
		getPosition: At,
		settings: {
			stroke: n,
			strokeWidth: r,
			fill: i,
			nameKey: void 0,
			dataKey: t,
			name: mt(a, t),
			hide: o,
			type: s,
			color: ii(n, i),
			unit: "",
			graphicalItemId: c,
			ignoreDataEntryColors: !0
		}
	};
	return /*#__PURE__*/ W.createElement(Ce, { tooltipEntrySettings: l });
});
function si(e) {
	var t = e.points, n = e.props, r = n.dot, i = n.dataKey;
	n.id;
	var a = n.dotFill, o = n.unthemedColors, s = ni(n, Xr), c = B(s);
	return /*#__PURE__*/ W.createElement(w, {
		points: t,
		dot: r,
		className: "recharts-radar-dots",
		dotClassName: "recharts-radar-dot",
		dataKey: i,
		baseProps: X(X({}, c), {}, { fill: a ?? c.fill }),
		unthemedColors: o
	});
}
function ci(e) {
	var t = e.radiusAxis, n = e.angleAxis, r = e.displayedData, i = e.dataKey, a = e.bandSize, o = n.cx, s = n.cy, c = !1, l = [], u = n.range[0] > n.range[1], d = n.type !== "number" && u ? a ?? 0 : 0;
	r.forEach((e, r) => {
		var a = ht(e, n.dataKey, r), u = ht(e, i), f = (n.scale.map(a) ?? 0) + d, p = Array.isArray(u) ? jr(u) : u, m = St(p) ? NaN : t.scale.map(p) ?? 0;
		Array.isArray(u) && u.length >= 2 && (c = !0), l.push(X(X({}, R(o, s, m, f)), {}, {
			name: a,
			value: u,
			cx: o,
			cy: s,
			radius: m,
			angle: f,
			payload: e
		}));
	});
	var f = [];
	return c && l.forEach((e) => {
		if (Array.isArray(e.value)) {
			var n = e.value[0], r = St(n) ? NaN : t.scale.map(n) ?? 0;
			f.push(X(X({}, e), {}, { radius: r }, R(o, s, r, e.angle)));
		} else f.push(e);
	}), {
		points: l,
		isRange: c,
		baseLinePoints: f
	};
}
function li(e) {
	var t = e.showLabels, n = e.points, r = e.children, i = n.map((e) => {
		var t = {
			x: e.x,
			y: e.y,
			width: 0,
			lowerWidth: 0,
			upperWidth: 0,
			height: 0
		};
		return X(X({}, t), {}, {
			value: e.value ?? "",
			payload: e.payload,
			parentViewBox: void 0,
			viewBox: t,
			fill: void 0
		});
	});
	return /*#__PURE__*/ W.createElement(u, { value: t ? i : void 0 }, r);
}
function ui(e) {
	var t = e.points, n = e.baseLinePoints, r = e.props;
	if (t == null) return null;
	var i = r.shape, a = r.isRange, o = r.connectNulls;
	r.dotFill;
	var s = r.fillObject, c = ni(r, Zr), l = s == null ? r.fill : ut(pt(r.id)), u = /*#__PURE__*/ W.isValidElement(i) ? /*#__PURE__*/ W.cloneElement(i, X(X({}, c), {}, {
		fill: l,
		points: t
	})) : typeof i == "function" ? i(X(X({}, c), {}, {
		fill: l,
		points: t
	})) : /*#__PURE__*/ W.createElement(Pn, Y({}, $t(r), {
		fill: l,
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
	return /*#__PURE__*/ W.createElement(M, { className: "recharts-radar-polygon" }, u, /*#__PURE__*/ W.createElement(si, {
		props: r,
		points: t
	}));
}
var di = (e, t) => e == null ? [] : t === 1 ? e.flatMap((e) => e.status === "removed" ? [] : [e.next]) : e.flatMap((e) => e.status === "removed" ? [] : e.status === "matched" ? [X(X({}, e.next), {}, {
	x: yt(e.prev.x, e.next.x, t),
	y: yt(e.prev.y, e.next.y, t)
})] : [X(X({}, e.next), {}, {
	x: yt(e.next.cx, e.next.x, t),
	y: yt(e.next.cy, e.next.y, t)
})]);
function fi(e) {
	var t = e.props, n = e.previousPointsRef, r = e.previousBaseLinePointsRef, i = t.points, o = t.baseLinePoints, s = t.isAnimationActive, c = t.animationBegin, l = t.animationDuration, u = t.animationEasing, d = t.animationMatchBy, f = t.animationInterpolateFn, p = t.onAnimationStart, m = t.onAnimationEnd, h = dn(t, r), g = h.startValue, _ = Ot(g ?? null, o, d), v = un(p, m), y = v.isAnimating, b = v.handleAnimationStart, x = v.handleAnimationEnd, S = xn();
	return S == null ? null : /*#__PURE__*/ W.createElement(li, {
		showLabels: !y,
		points: i
	}, /*#__PURE__*/ W.createElement(a, {
		animationInput: t,
		animationIdPrefix: "recharts-radar-",
		items: i,
		previousItemsRef: n,
		isAnimationActive: s,
		animationBegin: c,
		animationDuration: l,
		animationEasing: u,
		onAnimationStart: b,
		onAnimationEnd: x,
		animationInterpolateFn: f,
		animationMatchBy: d,
		layout: S
	}, (e, n) => {
		var r = n === 1 ? o : f(_, n, S);
		return h.syncStepValue(r, n), /*#__PURE__*/ W.createElement(ui, {
			points: e,
			baseLinePoints: r,
			props: t
		});
	}), /*#__PURE__*/ W.createElement(ne, { label: t.label }), t.children);
}
function pi(e) {
	var t = (0, W.useRef)(void 0), n = (0, W.useRef)(void 0);
	return /*#__PURE__*/ W.createElement(fi, {
		props: e,
		previousPointsRef: t,
		previousBaseLinePointsRef: n
	});
}
var mi = {
	activeDot: !0,
	angleAxisId: 0,
	animationBegin: 0,
	animationDuration: 1500,
	animationEasing: "ease",
	animationMatchBy: kt,
	animationInterpolateFn: di,
	dot: !1,
	hide: !1,
	isAnimationActive: "auto",
	label: !1,
	legendType: "rect",
	radiusAxisId: 0,
	zIndex: S.area
};
function hi(e) {
	var t = e.hide, n = e.className, r = e.points;
	if (t) return null;
	var a = We("recharts-radar", n);
	return /*#__PURE__*/ W.createElement(Me, { zIndex: e.zIndex }, /*#__PURE__*/ W.createElement(M, { className: a }, e.fillObject != null && /*#__PURE__*/ W.createElement("defs", null, /*#__PURE__*/ W.createElement(ee, {
		id: pt(e.id),
		fillObject: e.fillObject,
		color: e.fill
	})), /*#__PURE__*/ W.createElement(pi, e)), /*#__PURE__*/ W.createElement(i, {
		points: r,
		mainColor: ii(e.stroke, e.fill),
		itemDataKey: e.dataKey,
		activeDot: e.activeDot,
		themedActiveStyles: e.themedActiveStyles
	}));
}
function gi(e) {
	var t = yn(), n = U((n) => Yr(n, e.radiusAxisId, e.angleAxisId, t, e.id));
	return n?.points == null ? null : /*#__PURE__*/ W.createElement(hi, Y({}, e, {
		points: n?.points,
		baseLinePoints: n?.baseLinePoints,
		isRange: n?.isRange
	}));
}
function _i(e) {
	var t = Xt(e.fill), n = t.color, r = t.fillObject, i = X(X({}, e), {}, { fill: n }), a = Cn(), o = hn({
		dataKey: i.dataKey,
		angleAxisId: i.angleAxisId ?? mi.angleAxisId,
		radiusAxisId: i.radiusAxisId ?? mi.radiusAxisId
	}), s = _n(o, i), c = vn(o, i), l = r ?? c, u = Tn(s), d = mn(s, i, void 0), f = d?.strokeDasharray, p = On(i), m = Dn(s, i), h = X(X({}, i), {}, {
		dataKey: o,
		activeDot: i.activeDot,
		legendType: i.legendType ?? lt(i.dot),
		fill: i.fill ?? d?.fill,
		fillOpacity: i.fillOpacity ?? d?.fillOpacity,
		stroke: i.stroke ?? d?.stroke,
		strokeOpacity: i.strokeOpacity ?? d?.strokeOpacity,
		strokeWidth: i.strokeWidth ?? d?.strokeWidth,
		strokeDasharray: i.strokeDasharray ?? (Array.isArray(f) ? f.join(",") : f)
	}), g = Bt(h, mi), _ = i.fill ?? (a == null ? g.fill : ii(g.stroke, d?.fill)), v = wn(ii(g.stroke, g.fill));
	return /*#__PURE__*/ W.createElement(pe, {
		id: g.id,
		type: "radar"
	}, (e) => /*#__PURE__*/ W.createElement(W.Fragment, null, /*#__PURE__*/ W.createElement(xe, {
		type: "radar",
		id: e,
		data: void 0,
		dataKey: g.dataKey,
		hide: g.hide,
		angleAxisId: g.angleAxisId,
		radiusAxisId: g.radiusAxisId
	}), /*#__PURE__*/ W.createElement(Se, { legendPayload: ai(g, _, l) }), /*#__PURE__*/ W.createElement(oi, {
		dataKey: g.dataKey,
		stroke: g.stroke,
		strokeWidth: g.strokeWidth,
		fill: g.fill,
		name: g.name,
		hide: g.hide,
		tooltipType: g.tooltipType,
		id: e
	}), /*#__PURE__*/ W.createElement(x, { value: u }, /*#__PURE__*/ W.createElement(b, { value: v }, /*#__PURE__*/ W.createElement(gi, Y({}, g, {
		id: e,
		dotFill: _,
		fillObject: l,
		unthemedColors: p,
		themedActiveStyles: m
	}))))));
}
_i.displayName = "Radar";
// node_modules/recharts/es6/chart/RadarChart.js
function vi(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function yi(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? vi(Object(n), !0).forEach(function(t) {
			bi(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : vi(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function bi(e, t, n) {
	return (t = xi(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function xi(e) {
	var t = Si(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Si(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var Ci = ["axis"], wi = yi(yi({}, Vn), {}, {
	layout: "centric",
	startAngle: 90,
	endAngle: -270
}), Ti = /*#__PURE__*/ (0, W.forwardRef)((e, t) => {
	var n = Bt(e, wi);
	return /*#__PURE__*/ W.createElement(Bn, {
		chartName: "RadarChart",
		defaultTooltipEventType: "axis",
		validateTooltipEventTypes: Ci,
		tooltipPayloadSearcher: ze,
		categoricalChartProps: n,
		ref: t
	});
}), Z = Rt(), Ei = W.memo(function({ cx: e, cy: t, dataKey: n, chartId: r, className: i, fillOpacity: a = 1, type: o = "default", maskId: s }) {
	let c = W.useId().replace(/:/g, ""), l = `url(#${r}-colors-${String(n)})`;
	if (e === void 0 || t === void 0) return null;
	switch (o) {
		case "border": return /* @__PURE__ */ (0, Z.jsx)(Oi, {
			cx: e,
			cy: t,
			dotId: c,
			fillOpacity: a,
			gradientUrl: l,
			className: i,
			maskId: s
		});
		case "colored-border": return /* @__PURE__ */ (0, Z.jsx)(ki, {
			cx: e,
			cy: t,
			dotId: c,
			fillOpacity: a,
			gradientUrl: l,
			className: i,
			maskId: s
		});
		default: return /* @__PURE__ */ (0, Z.jsx)(Di, {
			cx: e,
			cy: t,
			dotId: c,
			fillOpacity: a,
			gradientUrl: l,
			className: i,
			maskId: s
		});
	}
}), Di = W.memo(({ cx: e, cy: t, dotId: n, fillOpacity: r, gradientUrl: i, className: a, maskId: o }) => /* @__PURE__ */ (0, Z.jsxs)("g", {
	className: a,
	mask: o ? `url(#${o})` : void 0,
	children: [/* @__PURE__ */ (0, Z.jsx)("defs", { children: /* @__PURE__ */ (0, Z.jsx)("clipPath", {
		id: `dot-clip-${n}`,
		children: /* @__PURE__ */ (0, Z.jsx)("circle", {
			cx: e,
			cy: t,
			r: 3
		})
	}) }), /* @__PURE__ */ (0, Z.jsx)("rect", {
		x: "0",
		y: t - 3,
		width: "100%",
		height: 6,
		fill: i,
		fillOpacity: r,
		clipPath: `url(#dot-clip-${n})`
	})]
}));
Di.displayName = "DefaultDot";
var Oi = W.memo(({ cx: e, cy: t, dotId: n, fillOpacity: r, gradientUrl: i, className: a, maskId: o }) => /* @__PURE__ */ (0, Z.jsxs)("g", {
	className: Ge(a, "text-background"),
	mask: o ? `url(#${o})` : void 0,
	children: [
		/* @__PURE__ */ (0, Z.jsx)("defs", { children: /* @__PURE__ */ (0, Z.jsx)("clipPath", {
			id: `dot-clip-${n}`,
			children: /* @__PURE__ */ (0, Z.jsx)("circle", {
				cx: e,
				cy: t,
				r: 6
			})
		}) }),
		/* @__PURE__ */ (0, Z.jsx)("circle", {
			cx: e,
			cy: t,
			r: 6,
			fill: "currentColor"
		}),
		/* @__PURE__ */ (0, Z.jsx)("rect", {
			x: "0",
			y: t - 3.5,
			width: "100%",
			height: 7,
			fill: i,
			fillOpacity: r,
			clipPath: `url(#dot-clip-inner-${n})`
		}),
		/* @__PURE__ */ (0, Z.jsx)("defs", { children: /* @__PURE__ */ (0, Z.jsx)("clipPath", {
			id: `dot-clip-inner-${n}`,
			children: /* @__PURE__ */ (0, Z.jsx)("circle", {
				cx: e,
				cy: t,
				r: 3.5
			})
		}) })
	]
}));
Oi.displayName = "PrimaryBorderDot";
var ki = W.memo(({ cx: e, cy: t, dotId: n, fillOpacity: r, gradientUrl: i, className: a, maskId: o }) => /* @__PURE__ */ (0, Z.jsxs)("g", {
	className: Ge(a, "text-background"),
	mask: o ? `url(#${o})` : void 0,
	children: [
		/* @__PURE__ */ (0, Z.jsx)("defs", { children: /* @__PURE__ */ (0, Z.jsx)("clipPath", {
			id: `dot-clip-${n}`,
			children: /* @__PURE__ */ (0, Z.jsx)("circle", {
				cx: e,
				cy: t,
				r: 3.5
			})
		}) }),
		/* @__PURE__ */ (0, Z.jsx)("rect", {
			x: "0",
			y: t - 3 - .5,
			width: "100%",
			height: 7,
			fill: i,
			fillOpacity: r,
			clipPath: `url(#dot-clip-${n})`
		}),
		/* @__PURE__ */ (0, Z.jsx)("circle", {
			cx: e,
			cy: t,
			r: 2.5,
			fill: "currentColor"
		})
	]
}));
ki.displayName = "ColoredBorderDot";
// src/react/evilcharts/registry/charts/recharts-radar-chart.tsx
var Ai = 1, ji = .3, Mi = 6, Ni = 1500, Pi = "value", Fi = (0, W.createContext)(null);
function Ii() {
	let e = (0, W.use)(Fi);
	if (!e) throw Error("Radar chart parts (<Radar />, <PolarAngleAxis />, …) must be used within <EvilRadarChart />");
	return e;
}
function Q({ config: e, data: t, children: n, className: r, chartProps: i, backgroundVariant: a, defaultSelectedDataKey: o = null, onSelectionChange: s, isLoading: c = !1, loadingPoints: l }) {
	let u = (0, W.useId)().replace(/:/g, ""), [d, m] = (0, W.useState)(o), h = Ki(c, l), g = (0, W.useCallback)((e) => {
		m(e), s?.(e);
	}, [s]), _ = (0, W.useMemo)(() => ({
		config: e,
		isLoading: c,
		selectedDataKey: d,
		selectDataKey: g
	}), [
		e,
		c,
		d,
		g
	]);
	return /* @__PURE__ */ (0, Z.jsx)(Fi, {
		value: _,
		children: /* @__PURE__ */ (0, Z.jsxs)(p, {
			className: r,
			config: e,
			children: [/* @__PURE__ */ (0, Z.jsx)(re, { isLoading: c }), /* @__PURE__ */ (0, Z.jsxs)(Ti, {
				id: u,
				data: c ? h : t,
				...i,
				children: [
					a && /* @__PURE__ */ (0, Z.jsx)(f, { variant: a }),
					n,
					c && /* @__PURE__ */ (0, Z.jsx)(qi, {})
				]
			})]
		})
	});
}
var Li = () => null, Ri = () => null, zi = (e, t, n, r) => {
	let i = !1, a = !1;
	return W.Children.forEach(e, (e) => {
		if ((0, W.isValidElement)(e)) {
			if (e.type === Li) {
				let { variant: a } = e.props;
				i = /* @__PURE__ */ (0, Z.jsx)(Ei, {
					type: a,
					dataKey: n,
					chartId: t,
					fillOpacity: r
				});
			}
			if (e.type === Ri) {
				let { variant: i } = e.props;
				a = /* @__PURE__ */ (0, Z.jsx)(Ei, {
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
}, Bi = ({ dataKey: e, colorsCount: t, opacities: n }) => t === 1 ? /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [/* @__PURE__ */ (0, Z.jsx)("stop", {
	offset: "0%",
	stopColor: `var(--color-${e}-0)`,
	stopOpacity: n?.[0]
}), /* @__PURE__ */ (0, Z.jsx)("stop", {
	offset: "100%",
	stopColor: `var(--color-${e}-0)`,
	stopOpacity: n?.[n.length - 1]
})] }) : /* @__PURE__ */ (0, Z.jsx)(Z.Fragment, { children: Array.from({ length: t }, (r, i) => {
	let a = `${i / (t - 1) * 100}%`;
	return /* @__PURE__ */ (0, Z.jsx)("stop", {
		offset: a,
		stopColor: `var(--color-${e}-${i}, var(--color-${e}-0))`,
		stopOpacity: n?.[i]
	}, a);
}) }), Vi = ({ id: e, dataKey: t, config: n }) => {
	let r = ct(n[t] ?? {});
	return /* @__PURE__ */ (0, Z.jsx)("linearGradient", {
		id: `${e}-colors-${t}`,
		x1: "0",
		y1: "0",
		x2: "1",
		y2: "0",
		children: /* @__PURE__ */ (0, Z.jsx)(Bi, {
			dataKey: t,
			colorsCount: r
		})
	});
}, Hi = ({ id: e, dataKey: t, config: n }) => {
	let r = ct(n[t] ?? {});
	return /* @__PURE__ */ (0, Z.jsx)("linearGradient", {
		id: `${e}-radar-stroke-${t}`,
		x1: "0",
		y1: "0",
		x2: "1",
		y2: "1",
		children: /* @__PURE__ */ (0, Z.jsx)(Bi, {
			dataKey: t,
			colorsCount: r
		})
	});
}, Ui = ({ id: e, dataKey: t, config: n }) => {
	let r = ct(n[t] ?? {}), i = r === 1 ? [.8, .3] : Array.from({ length: r }, (e, t) => t === 0 ? .8 : .3);
	return /* @__PURE__ */ (0, Z.jsx)("radialGradient", {
		id: `${e}-radar-fill-${t}`,
		cx: "50%",
		cy: "50%",
		r: "50%",
		children: /* @__PURE__ */ (0, Z.jsx)(Bi, {
			dataKey: t,
			colorsCount: r,
			opacities: i
		})
	});
}, Wi = ({ id: e, dataKey: t }) => /* @__PURE__ */ (0, Z.jsxs)("filter", {
	id: `${e}-radar-glow-${t}`,
	x: "-50%",
	y: "-50%",
	width: "200%",
	height: "200%",
	children: [
		/* @__PURE__ */ (0, Z.jsx)("feGaussianBlur", {
			in: "SourceGraphic",
			stdDeviation: "4",
			result: "blur"
		}),
		/* @__PURE__ */ (0, Z.jsx)("feColorMatrix", {
			in: "blur",
			type: "matrix",
			values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.6 0",
			result: "glow"
		}),
		/* @__PURE__ */ (0, Z.jsxs)("feMerge", { children: [/* @__PURE__ */ (0, Z.jsx)("feMergeNode", { in: "glow" }), /* @__PURE__ */ (0, Z.jsx)("feMergeNode", { in: "SourceGraphic" })] })
	]
}), Gi = (e) => [
	"A",
	"B",
	"C",
	"D",
	"E",
	"F"
].slice(0, e).map((e) => ({
	skill: e,
	[Pi]: 30 + Math.random() * 70
}));
function Ki(e, t = Mi) {
	let [n, r] = (0, W.useState)(0);
	return (0, W.useEffect)(() => {
		if (!e) return;
		let t = setInterval(() => {
			r((e) => e + 1);
		}, Ni);
		return () => clearInterval(t);
	}, [e]), (0, W.useMemo)(() => Gi(t), [t, n]);
}
var qi = () => /* @__PURE__ */ (0, Z.jsx)(_i, {
	dataKey: Pi,
	stroke: "currentColor",
	strokeOpacity: .3,
	strokeWidth: 2,
	fill: "currentColor",
	fillOpacity: .1,
	dot: !1,
	isAnimationActive: !0,
	animationDuration: Ni,
	animationEasing: "ease-in-out"
});
Q.Radar = function({ dataKey: e, variant: t = "filled", fillOpacity: n = ji, isGlowing: r = !1, isClickable: i = !1, children: a, radarProps: o }) {
	let { config: s, isLoading: c, selectedDataKey: l, selectDataKey: u } = Ii(), d = (0, W.useId)().replace(/:/g, "");
	if (c) return null;
	let f = i && l !== null && l !== e, p = {
		stroke: f ? .2 : 1,
		fill: f ? .1 : 1,
		dot: f ? .2 : 1
	}, m = t === "filled", { dot: h, activeDot: g } = zi(a, d, e, p.dot);
	return /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [/* @__PURE__ */ (0, Z.jsx)(_i, {
		dataKey: e,
		stroke: `url(#${d}-radar-stroke-${e})`,
		strokeOpacity: p.stroke,
		strokeWidth: Ai,
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
	}), /* @__PURE__ */ (0, Z.jsxs)("defs", { children: [
		/* @__PURE__ */ (0, Z.jsx)(Vi, {
			id: d,
			dataKey: e,
			config: s
		}),
		/* @__PURE__ */ (0, Z.jsx)(Hi, {
			id: d,
			dataKey: e,
			config: s
		}),
		m && /* @__PURE__ */ (0, Z.jsx)(Ui, {
			id: d,
			dataKey: e,
			config: s
		}),
		r && /* @__PURE__ */ (0, Z.jsx)(Wi, {
			id: d,
			dataKey: e
		})
	] })] });
}, Q.Dot = Li, Q.ActiveDot = Ri, Q.PolarGrid = function({ gridType: e = "polygon", stroke: t = "currentColor", strokeOpacity: n = .2, strokeDasharray: r = "3 4", ...i }) {
	return /* @__PURE__ */ (0, Z.jsx)(or, {
		gridType: e,
		stroke: t,
		strokeOpacity: n,
		strokeDasharray: r,
		...i
	});
}, Q.PolarAngleAxis = function({ tick: e = {
	fill: "currentColor",
	fontSize: 12
}, tickLine: t = !1, ...n }) {
	let { isLoading: r } = Ii();
	return r ? null : /* @__PURE__ */ (0, Z.jsx)(Nn, {
		tick: e,
		tickLine: t,
		...n
	});
}, Q.PolarRadiusAxis = function({ tick: e = {
	fill: "currentColor",
	fontSize: 10
}, tickLine: t = !1, axisLine: n = !1, ...r }) {
	let { isLoading: i } = Ii();
	return i ? null : /* @__PURE__ */ (0, Z.jsx)(kr, {
		tick: e,
		tickLine: t,
		axisLine: n,
		...r
	});
}, Q.Tooltip = function({ variant: e, roundness: t, defaultIndex: n }) {
	let { isLoading: r, selectedDataKey: i } = Ii();
	return r ? null : /* @__PURE__ */ (0, Z.jsx)(v, {
		defaultIndex: n,
		cursor: !1,
		content: /* @__PURE__ */ (0, Z.jsx)(y, {
			selected: i,
			roundness: t,
			variant: e
		})
	});
}, Q.Legend = function({ variant: e, align: t = "center", verticalAlign: n = "bottom", isClickable: r = !1 }) {
	let { isLoading: i, selectedDataKey: a, selectDataKey: o } = Ii();
	return i ? null : /* @__PURE__ */ (0, Z.jsx)(h, {
		verticalAlign: n,
		align: t,
		content: /* @__PURE__ */ (0, Z.jsx)(g, {
			selected: a,
			onSelectChange: o,
			isClickable: r,
			variant: e
		})
	});
};
// src/react/taste/charts.tsx
function Ji(e) {
	let { x: t = 0, cx: n, textAnchor: r, payload: i, ...a } = e, o = String(i?.value ?? ""), s = typeof n == "number" ? n * 2 : 0, c = s ? r === "start" ? s - t : r === "end" ? t : 2 * Math.min(t, s - t) : 56;
	return /* @__PURE__ */ (0, Z.jsxs)("g", { children: [/* @__PURE__ */ (0, Z.jsx)("title", { children: o }), /* @__PURE__ */ (0, Z.jsx)(ke, {
		...a,
		x: t,
		textAnchor: r,
		fill: "currentColor",
		fontSize: 12,
		children: et(o, c - 4)
	})] });
}
var Yi = [
	"stroke-chart-1",
	"stroke-chart-2",
	"stroke-chart-3",
	"stroke-chart-4",
	"stroke-chart-5",
	"stroke-chart-6"
], Xi = [
	"fill-chart-1",
	"fill-chart-2",
	"fill-chart-3",
	"fill-chart-4",
	"fill-chart-5",
	"fill-chart-6"
], Zi = { value: {
	label: V("manage:tasteCharts.tagOccurrences"),
	colors: sn(l[3])
} }, Qi = [
	"min-h-24",
	"min-h-24",
	"min-h-24",
	"min-h-32",
	"min-h-40",
	"min-h-48",
	"min-h-52",
	"min-h-60",
	"min-h-64"
], $i = 26, ea = { radius: Zi.value }, ta = (e, t) => Math.sqrt(e / t);
function na({ rows: e, label: t }) {
	let n = Nt(e);
	if (!n.length) return null;
	let r = n[0].value, i = n.map((e) => ({
		...e,
		radius: ta(e.value, r)
	}));
	return /* @__PURE__ */ (0, Z.jsx)("div", {
		role: "img",
		"aria-label": V("manage:tasteCharts.radarSummary", {
			label: t,
			items: Tt(i.map((e) => e.name))
		}),
		children: /* @__PURE__ */ (0, Z.jsxs)(Q, {
			data: i,
			config: ea,
			chartProps: { outerRadius: "58%" },
			className: "aspect-auto h-70 text-text-secondary",
			children: [
				/* @__PURE__ */ (0, Z.jsx)(Q.PolarGrid, {}),
				/* @__PURE__ */ (0, Z.jsx)(Q.PolarAngleAxis, {
					dataKey: "name",
					tick: /* @__PURE__ */ (0, Z.jsx)(Ji, {})
				}),
				/* @__PURE__ */ (0, Z.jsx)(Q.PolarRadiusAxis, {
					domain: [0, 1],
					allowDecimals: !0,
					tick: !1
				}),
				/* @__PURE__ */ (0, Z.jsx)(Q.Radar, { dataKey: "radius" }),
				/* @__PURE__ */ (0, Z.jsx)(_, { valueKey: "value" })
			]
		})
	});
}
function ra({ rows: e, label: t }) {
	let n = cn(e, 8);
	return n.length ? /* @__PURE__ */ (0, Z.jsx)("section", {
		"aria-label": t,
		className: `flex grow flex-col ${Qi[n.length]}`,
		children: /* @__PURE__ */ (0, Z.jsxs)(D, {
			data: n,
			config: Zi,
			layout: "horizontal",
			barRadius: 4,
			chartProps: {
				maxBarSize: $i,
				margin: {
					top: 5,
					right: 56,
					bottom: 5,
					left: 5
				}
			},
			className: "aspect-auto text-text-secondary",
			children: [
				/* @__PURE__ */ (0, Z.jsx)(D.YAxis, {
					dataKey: "name",
					interval: 0,
					tick: /* @__PURE__ */ (0, Z.jsx)(d, { along: "y" }),
					width: Ue(n.map((e) => e.name))
				}),
				/* @__PURE__ */ (0, Z.jsx)(D.XAxis, {
					hide: !0,
					domain: jn
				}),
				/* @__PURE__ */ (0, Z.jsx)(D.Bar, {
					dataKey: "value",
					enableHoverHighlight: !0,
					barProps: {
						dataKey: "value",
						label: Fn("right")
					}
				}),
				/* @__PURE__ */ (0, Z.jsx)(_, {})
			]
		})
	}) : null;
}
function ia({ flows: e }) {
	let [t, n] = (0, W.useState)(null), r = tt(e);
	if (!r) return null;
	let i = t?.node ?? null, a = (e, n) => t ? i === null ? t.label === n : e.source === i || e.target === i : !0;
	return /* @__PURE__ */ (0, Z.jsxs)("section", {
		className: c,
		children: [
			/* @__PURE__ */ (0, Z.jsx)(m, {
				title: V("manage:tasteCharts.creatorLeadSources"),
				figure: (t ? t.value : r.total).toLocaleString(),
				note: t ? t.label : V("manage:tasteCharts.leadsUnit", { count: r.total })
			}),
			/* @__PURE__ */ (0, Z.jsx)("ol", {
				"aria-label": V("manage:tasteCharts.sitesAndCreatorLeads"),
				className: "flex flex-col sm:hidden",
				children: [...r.links].sort((e, t) => t.value - e.value).map((e) => /* @__PURE__ */ (0, Z.jsxs)("li", {
					className: "flex items-baseline justify-between gap-3 border-b border-separator-border py-2 text-body-2-regular text-text-primary last:border-b-0",
					children: [/* @__PURE__ */ (0, Z.jsx)("span", {
						className: "min-w-0 wrap-anywhere",
						children: e.label
					}), /* @__PURE__ */ (0, Z.jsx)("b", {
						className: "shrink-0 tabular-nums",
						children: e.value.toLocaleString()
					})]
				}, e.key))
			}),
			/* @__PURE__ */ (0, Z.jsx)("div", {
				className: "min-w-0 max-sm:hidden",
				children: /* @__PURE__ */ (0, Z.jsxs)("svg", {
					viewBox: `0 0 ${k.width} ${r.height}`,
					fill: "none",
					role: "img",
					"aria-label": V("manage:tasteCharts.sitesAndCreatorLeads"),
					className: "block h-auto w-full",
					onPointerLeave: () => n(null),
					children: [/* @__PURE__ */ (0, Z.jsx)("g", { children: r.links.map((e) => /* @__PURE__ */ (0, Z.jsx)("path", {
						d: e.d,
						strokeWidth: e.width,
						tabIndex: 0,
						role: "img",
						"aria-label": V("manage:tasteCharts.leadCount", {
							name: e.label,
							count: e.value
						}),
						fillOpacity: 0,
						strokeOpacity: a(e, e.label) ? .55 : .08,
						className: `outline-none transition-opacity ${Yi[e.color]}`,
						onPointerEnter: () => n({
							value: e.value,
							label: e.label,
							node: null
						}),
						onFocus: () => n({
							value: e.value,
							label: e.label,
							node: null
						}),
						onBlur: () => n(null)
					}, e.key)) }), /* @__PURE__ */ (0, Z.jsx)("g", { children: r.nodes.map((e) => /* @__PURE__ */ (0, Z.jsxs)("g", {
						tabIndex: 0,
						role: "img",
						"aria-label": V("manage:tasteCharts.leadCount", {
							name: e.name,
							count: e.value
						}),
						className: "outline-none focus-visible:opacity-100",
						onPointerEnter: () => n({
							value: e.value,
							label: e.name,
							node: e.index
						}),
						onFocus: () => n({
							value: e.value,
							label: e.name,
							node: e.index
						}),
						onBlur: () => n(null),
						children: [/* @__PURE__ */ (0, Z.jsx)("rect", {
							x: e.x,
							y: e.y,
							width: 10,
							height: e.height,
							rx: 5,
							className: e.side === "source" ? Xi[e.color] : "fill-text-secondary"
						}), /* @__PURE__ */ (0, Z.jsxs)("text", {
							x: O[e.side],
							y: e.y + e.height / 2,
							textAnchor: e.side === "source" ? "end" : "start",
							dominantBaseline: "middle",
							className: "fill-text-secondary text-caption-1-regular",
							children: [nt(e.name), /* @__PURE__ */ (0, Z.jsx)("tspan", {
								x: O[e.side],
								dy: 15,
								children: e.side === "source" ? e.value.toLocaleString() : `${e.share.toFixed(1)}%`
							})]
						})]
					}, e.id)) })]
				})
			}),
			/* @__PURE__ */ (0, Z.jsxs)("footer", {
				className: "flex justify-between gap-3 text-caption-1-regular text-text-secondary max-sm:hidden",
				children: [/* @__PURE__ */ (0, Z.jsx)("span", { children: V("manage:tasteCharts.sourceSites") }), /* @__PURE__ */ (0, Z.jsx)("span", { children: V("manage:tasteCharts.creatorsLeadShare") })]
			})
		]
	});
}
// src/react/taste/browser-sources.tsx
var aa = "flex min-w-0 items-center gap-3 rounded-xl bg-background-primary-default p-3";
function oa({ browsers: e, sources: t, range: n, children: r }) {
	let [i, a] = (0, W.useState)(!1), [s, c] = (0, W.useState)(""), [l, u] = (0, W.useState)(""), d = bn({
		mutationFn: (e) => Ke(e, n),
		onSuccess: (e) => {
			z.setQueryData(H(n), e.dashboard), a(!1), c(""), u("");
		}
	});
	return /* @__PURE__ */ (0, Z.jsxs)("section", {
		className: `${He()} flex flex-col gap-4`,
		"aria-label": V("manage:tasteSources.dataSources"),
		children: [
			/* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, Z.jsx)("h3", {
					className: "text-title-2-medium text-text-primary",
					children: V("manage:tasteSources.dataSources")
				}), /* @__PURE__ */ (0, Z.jsx)(o, {
					variant: "secondary",
					onClick: () => a(!0),
					disabled: i,
					children: V("manage:tasteSources.addBrowser")
				})]
			}),
			d.error ? /* @__PURE__ */ (0, Z.jsx)(N, {
				tone: "error",
				children: L(d.error)
			}) : null,
			i ? /* @__PURE__ */ (0, Z.jsxs)("form", {
				className: "flex flex-col gap-3",
				onSubmit: (e) => {
					e.preventDefault(), d.isPending || d.mutate({
						operation: "add",
						name: s,
						path: l
					});
				},
				children: [
					/* @__PURE__ */ (0, Z.jsx)(j, {
						label: V("manage:tasteSources.browserName"),
						value: s,
						onChange: c,
						maxLength: 80,
						isRequired: !0,
						isDisabled: d.isPending
					}),
					/* @__PURE__ */ (0, Z.jsx)(j, {
						label: V("manage:tasteSources.profilePath"),
						value: l,
						onChange: u,
						maxLength: 1024,
						isRequired: !0,
						isDisabled: d.isPending,
						hint: V("manage:tasteSources.profilePathHint")
					}),
					/* @__PURE__ */ (0, Z.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, Z.jsx)(o, {
							variant: "ghost",
							disabled: d.isPending,
							onClick: () => {
								a(!1), d.reset();
							},
							children: V("manage:shared.cancel")
						}), /* @__PURE__ */ (0, Z.jsx)(o, {
							type: "submit",
							variant: "secondary",
							disabled: !s.trim() || !l.trim(),
							...P(d.isPending),
							children: V("manage:shared.add")
						})]
					})
				]
			}) : null,
			/* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "inline-grid w-full min-w-0 gap-2 sm:grid-cols-2",
				children: [r, e.map((e) => {
					let n = t.filter((t) => e.source_keys?.includes(t.source_key)), r = n.reduce((e, t) => e + (t.visits || 0), 0), i = n.reduce((e, t) => e + (t.bookmarks || 0), 0);
					return /* @__PURE__ */ (0, Z.jsxs)("div", {
						"data-taste-source": "browser",
						className: aa,
						children: [
							/* @__PURE__ */ (0, Z.jsx)("span", {
								className: "inline-grid size-8 shrink-0 place-items-center rounded-lg text-text-secondary",
								children: /* @__PURE__ */ (0, Z.jsx)(Un, { name: e.name })
							}),
							/* @__PURE__ */ (0, Z.jsxs)("div", {
								className: "flex min-w-0 grow flex-col gap-0.5",
								children: [
									/* @__PURE__ */ (0, Z.jsx)("b", {
										className: "text-body-2-medium break-words text-text-primary",
										children: e.name
									}),
									/* @__PURE__ */ (0, Z.jsx)("span", {
										className: "break-all text-caption-1-regular text-text-secondary",
										children: e.path
									}),
									/* @__PURE__ */ (0, Z.jsx)("span", {
										className: "text-caption-1-regular text-text-secondary",
										children: e.enabled ? e.available ? V("manage:tasteSources.profileCount", { count: e.profiles }) : V("manage:tasteSources.profileUnavailable") : V("manage:tasteSources.readingStopped")
									}),
									n.length ? /* @__PURE__ */ (0, Z.jsxs)("span", {
										className: "text-caption-1-regular text-text-secondary",
										children: [
											V("manage:tasteSources.historyCount", { count: r }),
											" · ",
											V("manage:tasteSources.bookmarkCount", { count: i })
										]
									}) : null
								]
							}),
							/* @__PURE__ */ (0, Z.jsxs)("span", {
								className: "flex shrink-0 gap-1",
								children: [/* @__PURE__ */ (0, Z.jsx)(o, {
									variant: "secondary",
									size: "small",
									...P(d.isPending),
									iconOnly: !0,
									leadingIcon: e.enabled ? le : A,
									"aria-label": `${e.enabled ? V("manage:tasteSources.stopReading") : V("manage:customSources.enable")} ${e.name}`,
									onClick: () => {
										e.enabled ? qe({
											title: V("manage:tasteSources.stopReadingTitle", { browser: e.name }),
											body: V("manage:tasteSources.stopReadingBody"),
											confirmLabel: V("manage:tasteSources.stopReading"),
											onConfirm: () => d.mutateAsync({
												operation: "disable",
												id: e.id
											})
										}) : d.mutate({
											operation: "enable",
											id: e.id
										});
									}
								}), /* @__PURE__ */ (0, Z.jsx)(o, {
									variant: "secondary",
									size: "small",
									iconOnly: !0,
									leadingIcon: ie,
									...P(d.isPending),
									"aria-label": V("manage:tasteSources.deleteBrowserTitle", { browser: e.name }),
									onClick: () => {
										qe({
											title: V("manage:tasteSources.deleteBrowserTitle", { browser: e.name }),
											body: V("manage:tasteSources.deleteBrowserBody"),
											confirmLabel: V("manage:tasteSources.deleteBrowser"),
											danger: !0,
											holdToConfirm: !0,
											onConfirm: () => d.mutateAsync({
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
var sa = 10, ca = Je(ae, oe, "text-body-2-medium"), la = `${He()} flex flex-col gap-4`, ua = "rounded-xl bg-background-primary-default p-3", da = V("manage:taste.readHistoryTooltip"), fa = V("manage:taste.noSourceHint"), pa = V("manage:taste.noLeadHint"), ma = V("manage:taste.noCategoryHint"), ha = V("manage:taste.gapHint"), ga = V("manage:taste.noBrowserTagHint"), _a = V("manage:taste.noBrowserCreatorHint"), va = V("manage:taste.noDomainHint"), ya = V("manage:taste.noPeachTagHint"), ba = V("manage:taste.noPeachCreatorHint"), xa = V("manage:taste.noPeachActressHint"), Sa = V("manage:taste.guideLocal"), Ca = V("manage:taste.guideRemote"), wa = V("manage:taste.guideRefresh"), Ta = V("manage:taste.removeSourceBody"), Ea = "peach-taste-guide-dismissed", Da = "\0", Oa = (e, t) => {
	let [n = "", r = ""] = e.split(Da);
	return /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [
		n,
		t,
		r
	] });
}, ka = (0, W.createContext)(/* @__PURE__ */ (0, Z.jsx)(s, {
	size: "small",
	href: "/",
	children: V("manage:shared.browseCollection")
}));
function Aa() {
	return (0, W.useContext)(ka);
}
function $({ icon: e, term: t, figure: n, detail: r, detailTitle: i, accent: a }) {
	return /* @__PURE__ */ (0, Z.jsx)("div", {
		className: Qt(),
		children: /* @__PURE__ */ (0, Z.jsx)(we, {
			label: t,
			icon: e,
			accent: a,
			figure: n,
			footer: /* @__PURE__ */ (0, Z.jsx)("span", {
				className: "block min-w-0 truncate",
				title: i || r,
				children: r ?? ""
			})
		})
	});
}
function ja({ name: e, domain: t }) {
	return /* @__PURE__ */ (0, Z.jsxs)("span", {
		className: "relative inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-background-tertiary-default text-caption-1-medium text-text-secondary",
		children: [$e(e).toUpperCase(), /* @__PURE__ */ (0, Z.jsx)("img", {
			src: Yt({ domain: t }),
			alt: "",
			loading: "lazy",
			width: 20,
			height: 20,
			onError: (e) => e.currentTarget.remove(),
			className: "absolute size-5 object-contain"
		})]
	});
}
function Ma({ html: e }) {
	return /* @__PURE__ */ (0, Z.jsx)("span", {
		className: `relative inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-media-placeholder text-caption-1-medium text-text-secondary ${te}`,
		dangerouslySetInnerHTML: { __html: e }
	});
}
function Na({ rows: e, kind: t, visual: n, empty: r, onSignal: i }) {
	if (!e.length) return /* @__PURE__ */ (0, Z.jsx)(E, {
		size: "compact",
		icon: jt,
		title: V("manage:taste.notEnoughData"),
		actions: /* @__PURE__ */ (0, Z.jsx)(Aa, {}),
		children: r
	});
	let a = Ft(e);
	return /* @__PURE__ */ (0, Z.jsx)(Mn, {
		previewCount: sa,
		className: "inline-grid w-full gap-x-7 gap-y-2 sm:grid-cols-2",
		children: e.map((e, r) => {
			let o = !!t && !!e.peach_items, s = String(e.source_domain || ""), c = /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [
				/* @__PURE__ */ (0, Z.jsx)("svg", {
					viewBox: "0 0 100 1",
					preserveAspectRatio: "none",
					"aria-hidden": !0,
					className: "absolute inset-0 -z-10 size-full overflow-hidden rounded-lg opacity-15",
					children: /* @__PURE__ */ (0, Z.jsx)("rect", {
						width: a[r],
						height: 1,
						className: "fill-chart-4"
					})
				}),
				/* @__PURE__ */ (0, Z.jsx)("span", {
					className: "w-6 shrink-0 text-caption-1-regular tabular-nums text-text-secondary",
					children: r + 1
				}),
				n === "domain" ? /* @__PURE__ */ (0, Z.jsx)(ja, {
					name: e.name,
					domain: e.name
				}) : null,
				n === "creator" && !e.entity_id && !e.has_avatar && s ? /* @__PURE__ */ (0, Z.jsx)(ja, {
					name: e.name,
					domain: s
				}) : null,
				n !== "none" && n !== "domain" && (e.entity_id || e.has_avatar || !s) ? /* @__PURE__ */ (0, Z.jsx)(Ma, { html: Be(e.name, e.entity_id ? {
					id: e.entity_id,
					has_image: !!e.has_image,
					image_version: e.image_version,
					avatar_focus: e.avatar_focus,
					avatar_stand_in: e.avatar_stand_in
				} : null, e.has_avatar ? e.representative_asset_id ?? null : null, n === "creator" ? "creator" : t || "performer") }) : null,
				/* @__PURE__ */ (0, Z.jsxs)("span", {
					className: "flex min-w-0 grow flex-col gap-0.5",
					children: [/* @__PURE__ */ (0, Z.jsx)("b", {
						className: "min-w-0 text-body-medium break-words text-text-primary",
						children: e.name
					}), /* @__PURE__ */ (0, Z.jsx)("small", {
						className: "text-caption-1-regular text-text-secondary",
						children: Pt(e)
					})]
				}),
				o ? /* @__PURE__ */ (0, Z.jsx)(Mt, {
					"aria-hidden": !0,
					className: "size-4 shrink-0 text-text-tertiary"
				}) : null
			] }), l = "relative isolate flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left";
			return /* @__PURE__ */ (0, Z.jsx)("li", {
				className: "min-w-0",
				children: o ? /* @__PURE__ */ (0, Z.jsx)("button", {
					type: "button",
					onClick: () => i(t, e.name),
					className: `${l} cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring`,
					children: c
				}) : /* @__PURE__ */ (0, Z.jsx)("div", {
					className: l,
					children: c
				})
			}, `${e.name}:${r}`);
		})
	});
}
function Pa({ label: e, panels: i, onSignal: a }) {
	return /* @__PURE__ */ (0, Z.jsxs)(r, {
		className: `${He({ padding: "none" })} flex flex-col`,
		children: [/* @__PURE__ */ (0, Z.jsx)("div", {
			className: "px-4 pt-3",
			children: /* @__PURE__ */ (0, Z.jsx)(ve, {
				"aria-label": e,
				className: ge,
				children: i.map((e) => /* @__PURE__ */ (0, Z.jsx)(n, {
					id: e.id,
					className: he,
					children: e.name
				}, e.id))
			})
		}), i.map((e) => /* @__PURE__ */ (0, Z.jsx)(t, {
			id: e.id,
			className: "px-4 pt-3.5 pb-4",
			children: /* @__PURE__ */ (0, Z.jsx)(Na, {
				...e.props,
				onSignal: a
			})
		}, e.id))]
	});
}
function Fa({ data: e, onSignal: t, navigate: n }) {
	let r = e.analysis;
	if (!r?.headline) return null;
	let i = r.confidence || {}, a = [...(r.explore || []).map((e) => ({
		key: `tag:${e.tag}`,
		title: F(e, "title"),
		detail: F(e, "detail"),
		act: () => t("tag", e.tag)
	})), ...(r.next_steps || []).map((e) => ({
		key: `route:${e.route}`,
		title: F(e, "title"),
		detail: F(e, "detail"),
		act: () => n(e.route)
	}))];
	return /* @__PURE__ */ (0, Z.jsxs)("section", {
		className: la,
		"aria-label": V("manage:taste.summary"),
		children: [
			/* @__PURE__ */ (0, Z.jsxs)("header", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, Z.jsx)("h3", {
						className: "text-title-2-medium text-text-primary",
						children: V("manage:taste.summary")
					}),
					/* @__PURE__ */ (0, Z.jsx)("p", {
						className: "max-w-prose text-title-2-regular wrap-anywhere text-text-primary",
						children: F(r, "headline")
					}),
					/* @__PURE__ */ (0, Z.jsxs)("p", {
						className: "flex flex-wrap items-center gap-2 text-body-2-regular text-text-secondary",
						children: [/* @__PURE__ */ (0, Z.jsx)("i", {
							"aria-hidden": !0,
							className: `size-2 shrink-0 rounded-full ${i.level === "high" ? "bg-status-lime-text" : i.level === "medium" ? "bg-status-yellow-text" : "bg-text-tertiary"}`
						}), /* @__PURE__ */ (0, Z.jsx)("span", {
							className: "min-w-0 wrap-anywhere",
							children: F(i, "label") || V("manage:taste.stillLearning")
						})]
					})
				]
			}),
			r.points?.length ? /* @__PURE__ */ (0, Z.jsx)("div", {
				className: "inline-grid w-full gap-3 sm:grid-cols-2",
				children: r.points.map((e) => /* @__PURE__ */ (0, Z.jsxs)("div", {
					className: `flex min-w-0 flex-col gap-1 ${ua}`,
					children: [/* @__PURE__ */ (0, Z.jsx)("span", {
						className: "text-caption-1-regular text-text-secondary",
						children: F(e, "label")
					}), /* @__PURE__ */ (0, Z.jsx)("b", {
						className: "text-body-2-medium break-words text-text-primary",
						children: F(e, "text")
					})]
				}, e.label))
			}) : null,
			a.length ? /* @__PURE__ */ (0, Z.jsx)("div", {
				className: "flex flex-col gap-2",
				children: a.map((e) => /* @__PURE__ */ (0, Z.jsxs)("button", {
					type: "button",
					onClick: e.act,
					className: `flex w-full min-w-0 cursor-pointer items-center gap-3 ${ua} text-left outline-none hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring`,
					children: [/* @__PURE__ */ (0, Z.jsxs)("span", {
						className: "flex min-w-0 grow flex-col gap-1",
						children: [/* @__PURE__ */ (0, Z.jsx)("b", {
							className: "text-body-2-medium wrap-anywhere text-text-primary",
							children: e.title
						}), /* @__PURE__ */ (0, Z.jsx)("small", {
							className: "text-caption-1-regular wrap-anywhere text-text-secondary",
							children: e.detail
						})]
					}), /* @__PURE__ */ (0, Z.jsx)(Mt, {
						"aria-hidden": !0,
						className: "size-4 shrink-0 text-text-tertiary"
					})]
				}, e.key))
			}) : /* @__PURE__ */ (0, Z.jsx)(E, {
				size: "compact",
				icon: jt,
				title: V("manage:taste.nothingToExplore"),
				actions: /* @__PURE__ */ (0, Z.jsx)(s, {
					size: "small",
					href: "/",
					children: V("manage:shared.browseCollection")
				}),
				children: pa
			})
		]
	});
}
function Ia({ onboarding: e, done: t }) {
	let [n, r] = (0, W.useState)(() => {
		try {
			return localStorage.getItem(Ea) === "1";
		} catch {
			return !1;
		}
	});
	return t || n ? null : /* @__PURE__ */ (0, Z.jsx)("div", {
		className: He({
			padding: "none",
			className: "p-4"
		}),
		children: /* @__PURE__ */ (0, Z.jsxs)(C, {
			summary: V("manage:taste.importGuide"),
			defaultOpen: e,
			children: [
				/* @__PURE__ */ (0, Z.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: Sa
				}),
				/* @__PURE__ */ (0, Z.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: Ca
				}),
				/* @__PURE__ */ (0, Z.jsxs)("ul", {
					className: "flex list-disc flex-col gap-1 pl-5 text-body-2-regular text-text-secondary",
					children: [/* @__PURE__ */ (0, Z.jsx)("li", { children: Oa(V("manage:taste.guideChrome", { link: Da }), /* @__PURE__ */ (0, Z.jsxs)("a", {
						href: "https://takeout.google.com/",
						target: "_blank",
						rel: "noopener noreferrer",
						className: "text-text-primary underline-offset-4 hover:underline",
						children: ["Google Takeout", /* @__PURE__ */ (0, Z.jsx)(Ae, {
							"aria-hidden": !0,
							className: "size-(--icon-inline) shrink-0"
						})]
					})) }), /* @__PURE__ */ (0, Z.jsx)("li", { children: Oa(V("manage:taste.guideOther", { link: Da }), /* @__PURE__ */ (0, Z.jsxs)("a", {
						href: "https://github.com/purarue/browserexport",
						target: "_blank",
						rel: "noopener noreferrer",
						className: "text-text-primary underline-offset-4 hover:underline",
						children: ["browserexport", /* @__PURE__ */ (0, Z.jsx)(Ae, {
							"aria-hidden": !0,
							className: "size-(--icon-inline) shrink-0"
						})]
					})) })]
				}),
				/* @__PURE__ */ (0, Z.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: wa
				}),
				/* @__PURE__ */ (0, Z.jsx)("span", {
					className: "self-start",
					children: /* @__PURE__ */ (0, Z.jsx)(o, {
						variant: "secondary",
						size: "small",
						onClick: () => {
							try {
								localStorage.setItem(Ea, "1");
							} catch {}
							r(!0);
						},
						children: V("manage:shared.skip")
					})
				})
			]
		})
	});
}
function La({ busy: t, onRefresh: n, onImport: r, onImportBookmarks: i }) {
	let a = (0, W.useRef)(null), [s, c] = (0, W.useState)(!1), l = (e) => {
		c(!1), e();
	};
	return /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [/* @__PURE__ */ (0, Z.jsxs)("span", {
		"data-guide-target": "history-import",
		"data-button-group": !0,
		"data-split-button": !0,
		"data-variant": "primary",
		children: [/* @__PURE__ */ (0, Z.jsx)(o, {
			leadingIcon: T,
			title: da,
			onClick: n,
			...P(t),
			children: V("manage:taste.readBrowserHistory")
		}), /* @__PURE__ */ (0, Z.jsx)(o, {
			ref: a,
			iconOnly: !0,
			leadingIcon: Xe,
			"aria-label": V("manage:taste.moreHistoryOptions"),
			"aria-haspopup": "dialog",
			"aria-expanded": s,
			...P(t),
			onClick: () => {
				t || c(!0);
			}
		})]
	}), /* @__PURE__ */ (0, Z.jsx)(e, {
		triggerRef: a,
		isOpen: s,
		onOpenChange: c,
		placement: "bottom end",
		offset: 4,
		className: se,
		children: /* @__PURE__ */ (0, Z.jsxs)(ce, {
			"aria-label": V("manage:taste.moreHistoryOptions"),
			className: "flex w-52 flex-col gap-1 outline-none",
			children: [
				/* @__PURE__ */ (0, Z.jsxs)("button", {
					type: "button",
					className: ca,
					onClick: () => l(n),
					children: [/* @__PURE__ */ (0, Z.jsx)(T, {
						"aria-hidden": !0,
						className: "size-4 shrink-0"
					}), V("manage:taste.readBrowserHistory")]
				}),
				/* @__PURE__ */ (0, Z.jsxs)("button", {
					type: "button",
					className: ca,
					onClick: () => l(r),
					children: [/* @__PURE__ */ (0, Z.jsx)(me, {
						"aria-hidden": !0,
						className: "size-4 shrink-0"
					}), V("manage:taste.importHistoryFile")]
				}),
				/* @__PURE__ */ (0, Z.jsxs)("button", {
					type: "button",
					className: ca,
					onClick: () => l(i),
					children: [/* @__PURE__ */ (0, Z.jsx)(it, {
						"aria-hidden": !0,
						className: "size-4 shrink-0"
					}), V("manage:taste.importBookmarksFile")]
				})
			]
		})
	})] });
}
function Ra({ sources: e, browsers: t, window: n, toast: r, emptyActions: i }) {
	let a = bn({
		mutationFn: (e) => Lt(e, n),
		onSuccess: (e) => {
			z.setQueryData(H(n), e.dashboard), r(V("manage:taste.sourceRemoved"));
		}
	});
	return /* @__PURE__ */ (0, Z.jsxs)(oa, {
		browsers: t,
		sources: e,
		range: n,
		children: [a.error ? /* @__PURE__ */ (0, Z.jsx)("div", {
			className: "sm:col-span-2",
			children: /* @__PURE__ */ (0, Z.jsx)(N, {
				tone: "error",
				children: L(a.error)
			})
		}) : null, e.length ? /* @__PURE__ */ (0, Z.jsx)(Z.Fragment, { children: e.filter((e) => !t.some((t) => t.source_keys?.includes(e.source_key))).map((e) => /* @__PURE__ */ (0, Z.jsxs)("div", {
			"data-taste-source": "import",
			className: aa,
			children: [
				/* @__PURE__ */ (0, Z.jsx)("span", {
					className: "inline-grid size-8 shrink-0 place-items-center rounded-lg text-text-secondary",
					children: e.browser === "browserexport" ? /* @__PURE__ */ (0, Z.jsx)(me, {
						"aria-hidden": !0,
						className: "size-4"
					}) : /* @__PURE__ */ (0, Z.jsx)(Ne, {
						"aria-hidden": !0,
						className: "size-4"
					})
				}),
				/* @__PURE__ */ (0, Z.jsxs)("span", {
					className: "flex min-w-0 grow flex-col gap-0.5",
					children: [/* @__PURE__ */ (0, Z.jsx)("b", {
						className: "min-w-0 text-body-2-medium break-words text-text-primary",
						children: e.profile
					}), /* @__PURE__ */ (0, Z.jsx)("small", {
						className: "min-w-0 text-caption-1-regular break-words text-text-secondary",
						children: V(e.bookmarks ? "manage:taste.importedBookmarks" : "manage:taste.importedHistory", {
							host: e.host,
							count: Number(e.visits || e.bookmarks || 0)
						})
					})]
				}),
				/* @__PURE__ */ (0, Z.jsx)(o, {
					variant: "secondary",
					size: "small",
					"aria-label": V("manage:taste.removeSourceLabel", { source: e.profile }),
					className: "shrink-0",
					iconOnly: !0,
					leadingIcon: ie,
					...P(a.isPending),
					onClick: () => {
						a.isPending || qe({
							title: V("manage:taste.removeSource"),
							body: Ta,
							confirmLabel: V("manage:taste.removeSource"),
							holdToConfirm: !0,
							onConfirm: () => a.mutateAsync(e.source_key)
						});
					}
				})
			]
		}, e.source_key)) }) : t.length ? null : /* @__PURE__ */ (0, Z.jsx)(E, {
			size: "compact",
			icon: Ne,
			title: V("manage:taste.noSourcesTitle"),
			actions: i,
			children: fa
		})]
	});
}
function za(e) {
	let { onSignal: i, navigate: a, toast: c, onboarding: l } = e, [u, d] = (0, W.useState)("all"), [f, p] = (0, W.useState)("browser"), m = (0, W.useRef)(null), h = (0, W.useRef)(null), g = Sn({
		queryKey: H(u),
		queryFn: ({ signal: e }) => Ze(u, e),
		placeholderData: Et,
		refetchInterval: an
	}), { job: _, running: v, outcome: y, start: b } = pn({
		queryKey: Te,
		queryFn: ({ signal: e }) => Qe(e),
		start: () => Zt(u),
		taskKey: Ee,
		onFinish: (e) => {
			e.status !== "failed" && (z.invalidateQueries({ queryKey: ["taste"] }), c(e.warnings?.length ? V("manage:taste.partialHistory") : V("manage:taste.analysisUpdated")));
		}
	}), x = bn({
		mutationFn: (e) => Ze(e, void 0, !0),
		onSuccess: (e, t) => {
			z.setQueryData(H(t), e);
		}
	}), S = bn({
		mutationFn: (e) => vt(e),
		onSuccess: (e) => {
			z.setQueryData(H("all"), e.dashboard), d("all"), c(V("manage:taste.dataImported"));
		}
	}), C = (e) => {
		let t = e.currentTarget.files?.[0];
		e.currentTarget.value = "", t && !S.isPending && (S.reset(), S.mutate(t));
	}, w = () => {
		v || b.isPending || (b.reset(), b.mutate());
	}, T = g.data;
	if (!T) return /* @__PURE__ */ (0, Z.jsx)(zn, { children: /* @__PURE__ */ (0, Z.jsx)(N, {
		tone: "error",
		title: V("manage:taste.loadFailedTitle"),
		children: g.error ? L(g.error) : V("manage:taste.loadFailedBody")
	}) });
	let D = T.summary || {}, O = T.coverage || {}, k = T.rankings || {}, ee = T.storage || {}, A = nn(k.browser_categories || []), j = Nt(A).length > 0, te = T.gaps || [], ne = O.tagged || 0, M = O.identified || 0, re = b.error ? L(b.error) : S.error ? L(S.error) : x.error ? L(x.error) : y?.status === "failed" ? wt(y, "error") || V("manage:taste.readNotFound") : "", ie = /* @__PURE__ */ (0, Z.jsxs)("div", {
		className: "flex flex-wrap justify-center gap-2",
		children: [/* @__PURE__ */ (0, Z.jsx)(o, {
			variant: "secondary",
			...P(v || b.isPending || S.isPending),
			onClick: w,
			children: V("manage:taste.readBrowserHistory")
		}), /* @__PURE__ */ (0, Z.jsx)(o, {
			variant: "secondary",
			...P(S.isPending),
			onClick: () => m.current?.click(),
			children: V("manage:taste.importHistoryFile")
		})]
	});
	return /* @__PURE__ */ (0, Z.jsx)(zn, { children: /* @__PURE__ */ (0, Z.jsxs)(ka, {
		value: u === "all" ? f === "peach" ? /* @__PURE__ */ (0, Z.jsx)(s, {
			size: "small",
			variant: "secondary",
			href: "/",
			children: V("manage:shared.browseCollection")
		}) : ie : /* @__PURE__ */ (0, Z.jsx)(o, {
			size: "small",
			variant: "secondary",
			onClick: () => d("all"),
			children: V("manage:taste.viewAllTime")
		}),
		children: [
			/* @__PURE__ */ (0, Z.jsxs)(r, {
				selectedKey: f,
				onSelectionChange: (e) => p(String(e)),
				className: "flex flex-col gap-5",
				children: [
					/* @__PURE__ */ (0, Z.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, Z.jsxs)(ve, {
							"aria-label": V("manage:taste.evidenceLabel"),
							className: ge,
							children: [/* @__PURE__ */ (0, Z.jsx)(n, {
								id: "peach",
								className: he,
								children: V("manage:taste.peachActivity")
							}), /* @__PURE__ */ (0, Z.jsx)(n, {
								id: "browser",
								className: he,
								children: V("manage:taste.browserHistory")
							})]
						}), /* @__PURE__ */ (0, Z.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, Z.jsx)(ye, {
									"aria-label": V("manage:taste.rangeLabel"),
									selectedKey: u,
									onSelectionChange: (e) => {
										e !== null && d(String(e));
									},
									children: De.map(([e, t]) => /* @__PURE__ */ (0, Z.jsx)(be, {
										id: e,
										children: t
									}, e))
								}),
								/* @__PURE__ */ (0, Z.jsx)(La, {
									busy: v || b.isPending || S.isPending,
									onRefresh: w,
									onImport: () => m.current?.click(),
									onImportBookmarks: () => h.current?.click()
								}),
								/* @__PURE__ */ (0, Z.jsx)("input", {
									ref: m,
									type: "file",
									tabIndex: -1,
									"aria-hidden": !0,
									className: "hidden",
									onChange: C
								}),
								/* @__PURE__ */ (0, Z.jsx)("input", {
									ref: h,
									type: "file",
									tabIndex: -1,
									"aria-hidden": !0,
									className: "hidden",
									"data-bookmark-import": !0,
									onChange: C
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, Z.jsx)(Ia, {
						onboarding: l,
						done: !!(D.history_sources || T.updated_at)
					}),
					/* @__PURE__ */ (0, Z.jsxs)("div", {
						"aria-live": "polite",
						className: "flex flex-col gap-3 empty:hidden",
						children: [
							v ? /* @__PURE__ */ (0, Z.jsx)(Oe, {
								kind: Ie("taste-refresh"),
								label: wt(_, "message") || V("manage:taste.refreshing"),
								value: _?.checked,
								total: _?.total
							}) : null,
							S.isPending ? /* @__PURE__ */ (0, Z.jsx)(Oe, {
								kind: "gather",
								label: V("manage:taste.importing")
							}) : null,
							T.stale && T.error ? /* @__PURE__ */ (0, Z.jsx)(N, {
								tone: "error",
								action: /* @__PURE__ */ (0, Z.jsx)(o, {
									variant: "secondary",
									size: "small",
									...P(x.isPending),
									onClick: () => x.mutate(u),
									children: V("manage:shared.retryNow")
								}),
								children: V("manage:taste.updateFailedStale", {
									time: on(T.computed_at),
									error: qt(T.message_code ?? "", T.error, T.message_params)
								})
							}) : T.stale ? /* @__PURE__ */ (0, Z.jsx)(Oe, {
								kind: Ie("taste-refresh"),
								label: V("manage:taste.updatingStale", { time: on(T.computed_at) })
							}) : null,
							re ? /* @__PURE__ */ (0, Z.jsx)(N, {
								tone: "error",
								children: re
							}) : null,
							y?.warnings?.length ? /* @__PURE__ */ (0, Z.jsx)(N, {
								tone: "warning",
								children: Jt(y.warnings, y.warning_codes, y.warning_params).join(V("shell:format.semicolonSeparator"))
							}) : null
						]
					}),
					/* @__PURE__ */ (0, Z.jsxs)(t, {
						id: "browser",
						className: "flex flex-col gap-5",
						children: [
							/* @__PURE__ */ (0, Z.jsxs)("div", {
								className: _e,
								children: [
									/* @__PURE__ */ (0, Z.jsx)($, {
										accent: 0,
										icon: ln,
										term: V("manage:tasteSkeleton.browsingHistory"),
										figure: Number(D.history_visits || 0).toLocaleString(),
										detail: gt(D),
										detailTitle: `${tn(D.range_start)}—${tn(D.range_end)}`
									}),
									/* @__PURE__ */ (0, Z.jsx)($, {
										accent: 1,
										icon: Dt,
										term: V("manage:tasteSkeleton.tasteDimensions"),
										figure: A.length.toLocaleString(),
										detail: A[0]?.name || V("manage:taste.noTopDimension")
									}),
									/* @__PURE__ */ (0, Z.jsx)($, {
										accent: 2,
										icon: jt,
										term: V("manage:tasteSkeleton.browsingLeads"),
										figure: te.length.toLocaleString()
									}),
									/* @__PURE__ */ (0, Z.jsx)($, {
										accent: 3,
										icon: it,
										term: V("manage:taste.bookmarks"),
										figure: Number(D.bookmarks || 0).toLocaleString(),
										detail: V("manage:taste.privateExports", {
											count: Number(ee.exports || 0),
											size: rt(ee.bytes || 0)
										})
									})
								]
							}),
							/* @__PURE__ */ (0, Z.jsxs)("section", {
								className: j ? `${la} md:flex-row md:gap-6` : la,
								"aria-label": V("manage:taste.browsingProfile"),
								children: [/* @__PURE__ */ (0, Z.jsxs)("div", {
									className: j ? "flex shrink-0 flex-col gap-2 pb-5 md:w-80 md:pr-6 md:pb-0" : "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1",
									children: [
										/* @__PURE__ */ (0, Z.jsx)("span", {
											className: "text-caption-1-regular text-text-secondary",
											children: V("manage:taste.browsingProfile")
										}),
										j ? /* @__PURE__ */ (0, Z.jsx)(na, {
											rows: A,
											label: V("manage:taste.topDimensions")
										}) : null,
										/* @__PURE__ */ (0, Z.jsx)("small", {
											className: "text-caption-1-regular text-text-secondary",
											children: T.updated_at ? V("manage:taste.updatedAt", { date: tn(T.updated_at) }) : V("manage:taste.historyNotFetched")
										})
									]
								}), /* @__PURE__ */ (0, Z.jsx)("div", {
									className: "flex min-w-0 grow flex-col",
									children: A.length ? /* @__PURE__ */ (0, Z.jsx)(ra, {
										rows: A,
										label: V("manage:taste.dimensionRanking")
									}) : /* @__PURE__ */ (0, Z.jsx)(E, {
										size: "compact",
										icon: jt,
										title: V("manage:taste.noDimensions"),
										actions: /* @__PURE__ */ (0, Z.jsx)(Aa, {}),
										children: ma
									})
								})]
							}),
							/* @__PURE__ */ (0, Z.jsx)(An, {
								activity: T.activity,
								title: V("manage:taste.browsingActivity"),
								dailyTitle: V("manage:taste.dailyActivity"),
								words: {
									unit: (e) => V("manage:taste.siteVisitsUnit", { count: e }),
									series: V("manage:taste.visitsSeries"),
									cell: (e) => V("manage:taste.visitsCell", { count: e })
								},
								tone: 4,
								empty: V("manage:taste.noVisitsHint")
							}),
							/* @__PURE__ */ (0, Z.jsx)(ia, { flows: T.creator_flows }),
							/* @__PURE__ */ (0, Z.jsx)(Pa, {
								label: V("manage:taste.browserDimensions"),
								onSignal: i,
								panels: [
									{
										id: "tags",
										name: V("manage:shared.tags"),
										props: {
											rows: k.browser_tags || [],
											kind: "tag",
											visual: "none",
											empty: ga
										}
									},
									{
										id: "creators",
										name: V("manage:shared.creators"),
										props: {
											rows: k.browser_creators || [],
											kind: "creator",
											visual: "creator",
											empty: _a
										}
									},
									{
										id: "performers",
										name: V("manage:shared.actresses"),
										props: {
											rows: k.browser_performers || [],
											kind: "performer",
											visual: "entity",
											empty: V("manage:taste.noActressHistory")
										}
									},
									{
										id: "domains",
										name: V("manage:taste.topSites"),
										props: {
											rows: k.domains || [],
											kind: "",
											visual: "domain",
											empty: va
										}
									},
									{
										id: "gaps",
										name: V("manage:tasteSkeleton.browsingLeads"),
										props: {
											rows: te,
											kind: "",
											visual: "none",
											empty: ha
										}
									}
								]
							})
						]
					}),
					/* @__PURE__ */ (0, Z.jsxs)(t, {
						id: "peach",
						className: "flex flex-col gap-5",
						children: [
							/* @__PURE__ */ (0, Z.jsxs)("div", {
								className: _e,
								children: [
									/* @__PURE__ */ (0, Z.jsx)($, {
										accent: 0,
										icon: je,
										term: V("manage:taste.watchedInPeach"),
										figure: Number(D.peach_items || 0).toLocaleString(),
										detail: rn(D.peach_seconds || 0)
									}),
									/* @__PURE__ */ (0, Z.jsx)($, {
										accent: 1,
										icon: Fe,
										term: V("manage:shared.like"),
										figure: Number(D.liked || 0).toLocaleString()
									}),
									/* @__PURE__ */ (0, Z.jsx)($, {
										accent: 2,
										icon: Ve,
										term: V("manage:taste.disliked"),
										figure: Number(D.disliked || 0).toLocaleString()
									}),
									/* @__PURE__ */ (0, Z.jsx)($, {
										accent: 3,
										icon: Dt,
										term: V("manage:taste.tagged"),
										figure: ne.toLocaleString()
									})
								]
							}),
							/* @__PURE__ */ (0, Z.jsxs)("section", {
								className: `${la} md:flex-row md:gap-6`,
								"aria-label": V("manage:taste.peachViewing"),
								children: [/* @__PURE__ */ (0, Z.jsxs)("div", {
									className: "flex shrink-0 flex-col gap-0.5 pb-5 md:w-72 md:pr-6 md:pb-0",
									children: [
										/* @__PURE__ */ (0, Z.jsx)("span", {
											className: "text-caption-1-regular text-text-secondary",
											children: V("manage:taste.peachViewing")
										}),
										/* @__PURE__ */ (0, Z.jsx)("b", {
											className: "text-display-4-medium tabular-nums text-text-primary",
											children: Number(D.peach_items || 0).toLocaleString()
										}),
										/* @__PURE__ */ (0, Z.jsx)("span", {
											className: "text-body-2-regular text-text-secondary",
											children: V("manage:taste.watchedOrRatedUnit", { count: Number(D.peach_items || 0) })
										})
									]
								}), /* @__PURE__ */ (0, Z.jsxs)("div", {
									className: "flex min-w-0 grow flex-col",
									children: [/* @__PURE__ */ (0, Z.jsx)(Ba, {
										term: V("manage:taste.tagged"),
										value: ne,
										rest: O.untagged || 0
									}), /* @__PURE__ */ (0, Z.jsx)(Ba, {
										term: V("manage:taste.identified"),
										value: M,
										rest: O.unidentified || 0
									})]
								})]
							}),
							/* @__PURE__ */ (0, Z.jsx)(Pa, {
								label: V("manage:taste.peachDimensions"),
								onSignal: i,
								panels: [
									{
										id: "tags",
										name: V("manage:shared.tags"),
										props: {
											rows: k.peach_tags || [],
											kind: "tag",
											visual: "none",
											empty: ya
										}
									},
									{
										id: "creators",
										name: V("manage:shared.creators"),
										props: {
											rows: k.peach_creators || [],
											kind: "creator",
											visual: "creator",
											empty: ba
										}
									},
									{
										id: "performers",
										name: V("manage:shared.actresses"),
										props: {
											rows: k.peach_performers || [],
											kind: "performer",
											visual: "entity",
											empty: xa
										}
									}
								]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, Z.jsx)(Fa, {
				data: T,
				onSignal: i,
				navigate: a
			}),
			/* @__PURE__ */ (0, Z.jsx)(Ra, {
				sources: T.sources || [],
				browsers: T.browsers || [],
				window: u,
				toast: c,
				emptyActions: ie
			})
		]
	}) });
}
function Ba({ term: e, value: t, rest: n }) {
	let r = Math.max(t + n, 1);
	return /* @__PURE__ */ (0, Z.jsxs)("div", {
		className: "flex flex-col gap-1.5 border-b border-separator-border py-3 last:border-b-0",
		children: [/* @__PURE__ */ (0, Z.jsxs)("p", {
			className: "flex items-baseline justify-between gap-3 text-body-2-regular text-text-primary",
			children: [/* @__PURE__ */ (0, Z.jsx)("span", { children: e }), /* @__PURE__ */ (0, Z.jsxs)("b", {
				className: "tabular-nums",
				children: [t.toLocaleString(), /* @__PURE__ */ (0, Z.jsx)("span", {
					className: "ml-1.5 text-caption-1-regular text-text-secondary",
					children: V("manage:taste.remainingCount", { count: n })
				})]
			})]
		}), /* @__PURE__ */ (0, Z.jsx)(fe, {
			meter: !0,
			label: V("manage:shared.termProgress", {
				term: e,
				value: t.toLocaleString(),
				total: r.toLocaleString()
			}),
			value: t,
			max: r
		})]
	});
}
export { Ea as TASTE_GUIDE_KEY, za as TastePage };

//# debugId=a87a367a-d962-4490-99fa-4f1816b03fb7
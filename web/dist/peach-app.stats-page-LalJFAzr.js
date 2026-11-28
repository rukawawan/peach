(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "06c83bb5-b466-4a6a-b0fa-faa5561433c3", e._sentryDebugIdIdentifier = "sentry-dbid-06c83bb5-b466-4a6a-b0fa-faa5561433c3");
	} catch {}
})();
import { $b4f18e3395fe64d7$export$3d96ec278d3efce4 as e, $b4f18e3395fe64d7$export$3e41faf802a29e71 as t, $b4f18e3395fe64d7$export$b2539bed5023c21c as n, $b4f18e3395fe64d7$export$e51a686c67fdaa2d as r, AnimatedItems as i, ButtonLink as a, CHART_CARD as o, CHART_COLORS as s, Cell as c, ChartBackground as l, ChartContainer as u, ChartEmpty as d, ChartLegend as f, ChartLegendContent as p, ChartTip as m, ChartTooltip as h, ChartTooltipContent as g, DataLabelColorsContextProvider as _, DataLabelThemeContextProvider as v, DefaultZIndexes as y, EmptyState as b, EntryFillDefinitions as x, FillObjectDefinition as S, LOC as C, LabelListFromLabelProp as w, Layer as T, LoadingIndicator as E, MEDIA_SOURCE_ICONS as D, NR as ee, Note as O, PolarLabelListContextProvider as te, Progress as k, RegisterGraphicalItemId as A, SEGMENT as j, SEGMENTED_TRACK as ne, STATS_KEY as re, STAT_STRIP as ie, Sector as M, SegmentedTabList as ae, SetPolarGraphicalItem as oe, SetPolarLegendPayload as se, SetTooltipEntrySettings as ce, Shape as le, SourceMark as ue, StatCard as de, StatusLabel as fe, Xc as pe, Xt as me, ZIndexLayer as he, _8 as ge, __toESM as _e, adaptEventsOfChild as ve, arrayTooltipSearcher as ye, bandRows as be, cardClass as xe, clsx as Se, codedText as Ce, combineAllBarPositions as we, combineBarPosition as Te, combineBarSizeList as Ee, combineStackedData as De, createSelector as N, errorMessage as Oe, fetchStats as ke, findAllByType as Ae, fmtCount as P, fmtSize as F, getActiveStyleOverrides as je, getBandSizeOfAxis as I, getBaseValueOfBar as Me, getCateCoordinateOfBar as Ne, getColorsCount as Pe, getEntryColor as Fe, getEntryFillId as Ie, getEntryFillObject as Le, getEntryShapeColors as Re, getEntryStyleOverrides as ze, getFillUrl as Be, getNormalizedStackId as Ve, getSeriesFillId as He, getTooltipNameProp as Ue, getValueByDataKey as We, getZIndexFromUnknown as Ge, hasEntryFillObjects as Ke, interpolate as qe, isCategoricalAxis as Je, isNullish as Ye, known as Xe, lengthRows as Ze, mM as Qe, matchAppend as $e, mathSign as et, mediumRows as tt, noop as nt, omit as rt, omitEntrySvgProps as it, percentText as at, playedFor as ot, playedItemUrl as st, radialArc as ct, radialBarSize as lt, radialCeiling as ut, radialSlices as dt, reachedShare as ft, readEntryFill as pt, replayRows as mt, require_jsx_runtime as ht, require_react as gt, resolveDefaultProps as _t, selectActiveTooltipIndex as vt, selectAngleAxis as yt, selectBarCategoryGap as bt, selectBarGap as xt, selectChartDataAndAlwaysIgnoreIndexes as St, selectChartDataWithIndexes as Ct, selectChartLayout as L, selectPolarViewBox as wt, selectRadiusAxis as Tt, selectRootBarSize as Et, selectRootMaxBarSize as Dt, settingsPath as Ot, sliceConfig as kt, sliceKey as At, splitFill as jt, statCardClass as Mt, svgPropertiesNoEvents as Nt, svgPropertiesNoEventsFromUnknown as Pt, t as R, truncateByDomain as Ft, uo as It, useAnimationCallbacks as Lt, useAppSelector as Rt, useBackwardsCompatibleTheme as zt, useEffectiveDataKey as Bt, useGraphicalItemIdentity as Vt, useGraphicalItemThemeFill as Ht, useMouseClickItemDispatch as Ut, useMouseEnterItemDispatch as Wt, useMouseLeaveItemDispatch as Gt, usePolarChartLayout as Kt, useQuery as qt, useSeriesLabelThemeResolver as Jt, useThemedActiveStyles as Yt, useUnthemedColors as Xt, watchNote as Zt, watchedShare as Qt, withEntryFillColor as $t } from "./peach-app.js";
import { ActivityHeat as en, BarCard as z, ExpandableRanking as tn, PolarAngleAxis as nn, selectPolarAxisScale as rn, selectPolarAxisTicks as an, selectPolarGraphicalItemAxisTicks as on } from "./peach-app.expandable-ranking-Bxr5Gn6r.js";
import { ConnectionStatus as sn } from "./peach-app.connection-status-BrXhLGSm.js";
import { Page as cn } from "./peach-app.page-QAncjzM1.js";
import { PolarChart as ln, defaultPolarChartProps as un, selectPolarStackGroups as dn, selectUnfilteredPolarItems as fn } from "./peach-app.PolarChart-CeCYLBHr.js";
// node_modules/recharts/es6/util/RadialBarUtils.js
var B = /* @__PURE__ */ _e(gt()), pn = ["option"];
function mn(e, t) {
	if (e == null) return {};
	var n, r, i = hn(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function hn(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var gn = M;
function _n(e) {
	return typeof e == "string" ? parseInt(e, 10) : e;
}
function vn(e) {
	var t = e.option, n = mn(e, pn);
	return /*#__PURE__*/ B.createElement(le, {
		option: t,
		DefaultShape: gn,
		shapeProps: n
	});
}
// node_modules/recharts/es6/state/selectors/radialBarSelectors.js
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
function V(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? yn(Object(n), !0).forEach(function(t) {
			bn(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : yn(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function bn(e, t, n) {
	return (t = xn(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function xn(e) {
	var t = Sn(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Sn(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var H = N([(e, t) => Tt(e, t), (e, t) => rn(e, "radiusAxis", t)], (e, t) => {
	if (e != null && t != null) return V(V({}, e), {}, { scale: t });
}), Cn = (e, t) => on(e, "radiusAxis", t, !1), U = N([(e, t, n) => yt(e, n), (e, t, n) => rn(e, "angleAxis", n)], (e, t) => {
	if (e != null && t != null) return V(V({}, e), {}, { scale: t });
}), W = (e, t, n) => an(e, "angleAxis", n, !1), wn = N([fn, (e, t, n, r) => r], (e, t) => {
	if (e.some((e) => e.type === "radialBar" && t.dataKey === e.dataKey && t.stackId === e.stackId)) return t;
}), Tn = N([
	L,
	H,
	Cn,
	U,
	W
], (e, t, n, r, i) => Je(e, "radiusAxis") ? I(t, n, !1) : I(r, i, !1)), En = N([
	U,
	H,
	L
], (e, t, n) => {
	var r = n === "radial" ? e : t;
	if (r != null && r.scale != null) return Me({ numericAxis: r });
}), Dn = (e, t, n, r, i) => i, On = (e, t, n, r, i) => n, kn = (e, t, n, r, i) => t, An = (e, t, n, r, i) => r.maxBarSize, jn = (e) => e.type === "radialBar", Mn = N([
	L,
	fn,
	On,
	kn
], (e, t, n, r) => t.filter((t) => e === "centric" ? t.angleAxisId === n : t.radiusAxisId === r).filter((e) => e.hide === !1).filter(jn)), Nn = N([
	Mn,
	Et,
	() => void 0
], Ee), Pn = N([
	L,
	Dt,
	U,
	W,
	H,
	Cn,
	An
], (e, t, n, r, i, a, o) => {
	var s = Ye(o) ? t : o;
	return e === "centric" ? I(n, r, !0) ?? s ?? 0 : I(i, a, !0) ?? s ?? 0;
}), Fn = N([
	Nn,
	Dt,
	xt,
	bt,
	Pn,
	Tn,
	An
], we), In = N([Fn, wn], Te), Ln = N([(e, t, n) => L(e) === "centric" ? dn(e, "radiusAxis", t) : dn(e, "angleAxis", n), wn], De), Rn = N([
	U,
	W,
	H,
	Cn,
	Ct,
	wn,
	Tn,
	L,
	En,
	wt,
	Dn,
	In,
	Ln
], (e, t, n, r, i, a, o, s, c, l, u, d, f) => {
	var p = i.chartData, m = i.dataStartIndex, h = i.dataEndIndex;
	if (a == null || n == null || e == null || p == null || o == null || d == null || s !== "centric" && s !== "radial" || r == null || l == null) return [];
	var g = a.dataKey, _ = a.minAngle, v = a.minPointSize, y = l.cx, b = l.cy, x = l.startAngle, S = l.endAngle;
	return sr({
		angleAxis: e,
		angleAxisTicks: t,
		bandSize: o,
		baseValue: c,
		cells: u,
		cx: y,
		cy: b,
		dataKey: g,
		dataStartIndex: m,
		displayedData: p.slice(m, h + 1),
		endAngle: S,
		layout: s,
		minAngle: _,
		minPointSize: v,
		pos: d,
		radiusAxis: n,
		radiusAxisTicks: r,
		stackedData: f,
		stackedDomain: f ? (s === "centric" ? n : e).scale.domain() : null,
		startAngle: x
	});
}), zn = N([St, (e, t) => t], (e, t) => {
	var n = e.chartData, r = e.dataStartIndex, i = e.dataEndIndex;
	if (n == null) return [];
	var a = n.slice(r, i + 1);
	return a.length === 0 ? [] : a.map((e) => ({
		type: t,
		value: e.name,
		payload: e
	}));
}), Bn = [
	"shape",
	"activeShape",
	"cornerRadius",
	"id",
	"unthemedColors",
	"themedActiveStyles",
	"fillObject"
], Vn = [
	"onMouseEnter",
	"onClick",
	"onMouseLeave"
], Hn = ["value", "background"];
function G() {
	return G = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, G.apply(null, arguments);
}
function Un(e, t) {
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
		t % 2 ? Un(Object(n), !0).forEach(function(t) {
			Wn(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Un(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Wn(e, t, n) {
	return (t = Gn(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Gn(e) {
	var t = Kn(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Kn(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
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
var Yn = [];
function Xn(e) {
	var t = e.showLabels, n = e.sectors, r = e.fill, i = e.stroke, a = e.unthemedColors, o = e.children, s = B.useMemo(() => ({
		hasFilledShapes: !0,
		getShapeColors: (e) => Re(n[e], r, i, a)
	}), [
		n,
		r,
		i,
		a
	]), c = n.map((e) => ({
		value: e.value,
		payload: e.payload,
		parentViewBox: void 0,
		clockWise: !1,
		viewBox: {
			cx: e.cx,
			cy: e.cy,
			innerRadius: e.innerRadius,
			outerRadius: e.outerRadius,
			startAngle: e.startAngle,
			endAngle: e.endAngle,
			clockWise: !1
		},
		fill: e.fill
	}));
	return /*#__PURE__*/ B.createElement(te, { value: t ? c : void 0 }, /*#__PURE__*/ B.createElement(_, { value: s }, o));
}
function Zn(e) {
	var t = e.sectors, n = e.allOtherRadialBarProps, r = e.showLabels, i = e.animationElapsedTime, a = e.isAnimating, o = e.isEntrance, s = n.shape, c = n.activeShape, l = n.cornerRadius, u = n.id, d = n.unthemedColors, f = n.themedActiveStyles, p = n.fillObject, m = qn(n, Bn), h = Nt(m), g = p == null ? h : K(K({}, h), {}, { fill: Be(He(u)) }), _ = Rt(vt), v = n.onMouseEnter, b = n.onClick, x = n.onMouseLeave, S = qn(n, Vn), C = Wt(v, n.dataKey, u), T = Gt(x), E = Ut(b, n.dataKey, u);
	return t == null ? null : /*#__PURE__*/ B.createElement(Xn, {
		showLabels: r,
		sectors: t,
		fill: m.fill,
		stroke: m.stroke,
		unthemedColors: d
	}, t.map((e, t) => {
		var n = !!(c && _ === String(t)), r = C(e, t), p = T(e, t), h = E(e, t), v = K(K(K(K(K(K(K({}, g), {}, { cornerRadius: _n(l) }, ze(e, d)), e), pt(e.payload).fillObject == null ? void 0 : { fill: Be(Ie(u, t)) }), n ? je(c, f, e) : void 0), ve(S, e, t)), {}, {
			onMouseEnter: r,
			onMouseLeave: p,
			onClick: h,
			className: Se("recharts-radial-bar-sector", e.className),
			forceCornerRadius: m.forceCornerRadius,
			cornerIsExternal: m.cornerIsExternal,
			animationElapsedTime: i,
			isAnimating: a,
			isEntrance: o,
			isActive: n,
			option: n && c != null ? c : s,
			index: t
		});
		return n ? /*#__PURE__*/ B.createElement(he, {
			zIndex: y.activeBar,
			key: `sector-${t}`
		}, /*#__PURE__*/ B.createElement(vn, v)) : /*#__PURE__*/ B.createElement(vn, G({ key: `sector-${t}` }, v));
	}), /*#__PURE__*/ B.createElement(w, { label: n.label }), n.children);
}
var Qn = (e, t) => e == null ? [] : t === 1 ? e.flatMap((e) => e.status === "removed" ? [] : [e.next]) : e.flatMap((e) => e.status === "removed" ? [] : e.status === "matched" ? [K(K({}, e.next), {}, {
	startAngle: qe(e.prev.startAngle, e.next.startAngle, t),
	endAngle: qe(e.prev.endAngle, e.next.endAngle, t)
})] : [K(K({}, e.next), {}, { endAngle: qe(e.next.startAngle, e.next.endAngle, t) })]);
function $n(e) {
	var t = e.props, n = e.previousSectorsRef, r = t.sectors, a = t.isAnimationActive, o = t.animationBegin, s = t.animationDuration, c = t.animationEasing, l = t.onAnimationStart, u = t.onAnimationEnd, d = Lt(l, u), f = d.isAnimating, p = d.handleAnimationStart, m = d.handleAnimationEnd, h = Kt();
	return h == null ? null : /*#__PURE__*/ B.createElement(i, {
		animationInput: t,
		animationIdPrefix: "recharts-radialbar-",
		items: r,
		previousItemsRef: n,
		isAnimationActive: a,
		animationBegin: o,
		animationDuration: s,
		animationEasing: c,
		onAnimationStart: p,
		onAnimationEnd: m,
		animationInterpolateFn: t.animationInterpolateFn,
		animationMatchBy: t.animationMatchBy,
		layout: h
	}, (e, n, r) => /*#__PURE__*/ B.createElement(Zn, {
		sectors: e,
		allOtherRadialBarProps: t,
		showLabels: !f,
		animationElapsedTime: n,
		isAnimating: f || n < 1,
		isEntrance: r
	}));
}
function er(e) {
	var t = (0, B.useRef)(null);
	return /*#__PURE__*/ B.createElement($n, {
		props: e,
		previousSectorsRef: t
	});
}
function tr(e) {
	var t = e.legendType, n = e.fill, r = e.stroke, i = e.unthemedColors, a = e.fillObject, o = e.children, s = B.useMemo(() => Ae(o, c), [o]), l = Rt((e) => zn(e, t))?.map((e, t) => {
		var o = K(K({}, e.payload), s[t]?.props);
		return K(K({}, e), {}, {
			color: Fe(o, n, r, i),
			fill: Le(o, a)
		});
	});
	return /*#__PURE__*/ B.createElement(se, { legendPayload: l ?? [] });
}
var nr = /*#__PURE__*/ B.memo((e) => {
	var t = e.dataKey, n = e.sectors, r = e.stroke, i = e.strokeWidth, a = e.name, o = e.hide, s = e.fill, c = e.tooltipType, l = e.formatter, u = e.id, d = e.unthemedColors, f = {
		dataDefinedOnItem: n,
		getPosition: nt,
		getEntryColor: (e) => Fe(e, s, r, d),
		settings: {
			graphicalItemId: u,
			stroke: r,
			strokeWidth: i,
			fill: s,
			nameKey: void 0,
			dataKey: t,
			name: Ue(a, t),
			hide: o,
			type: c,
			color: s,
			unit: "",
			formatter: l
		}
	};
	return /*#__PURE__*/ B.createElement(ce, { tooltipEntrySettings: f });
}), rr = { fill: "#eee" };
function ir(e) {
	var t = e.sectors, n = e.allOtherRadialBarProps, r = n.cornerRadius, i = n.background, a = Pt(i), o = zt((e) => e.barBackground, a ?? {}, rr);
	return t == null ? null : /*#__PURE__*/ B.createElement(he, { zIndex: Ge(i, y.barBackground) }, t.map((e, t) => {
		e.value;
		var s = e.background, c = qn(e, Hn);
		if (!s) return null;
		var l = K(K(K(K(K(K({ cornerRadius: _n(r) }, it(c)), o), s), a), ve(n, e, t)), {}, {
			index: t,
			className: Se("recharts-radial-bar-background-sector", a?.className == null ? void 0 : String(a.className)),
			option: /*#__PURE__*/ B.isValidElement(i) || typeof i == "function" ? i : s,
			isActive: !1
		});
		return /*#__PURE__*/ B.createElement(vn, G({ key: `background-${c.cx}-${c.cy}-${c.innerRadius}-${c.outerRadius}-${c.startAngle}-${c.endAngle}-${t}` }, l));
	}));
}
var ar = class extends B.PureComponent {
	renderBackground(e) {
		return /*#__PURE__*/ B.createElement(ir, {
			sectors: e,
			allOtherRadialBarProps: this.props
		});
	}
	render() {
		var e = this.props, t = e.hide, n = e.sectors, r = e.className, i = e.background, a = e.fillObject, o = e.id, s = e.fill, c = e.stroke, l = e.unthemedColors;
		if (t) return null;
		var u = Se("recharts-area", r), d = Ke(n.map((e) => e.payload));
		return /*#__PURE__*/ B.createElement(he, { zIndex: this.props.zIndex }, /*#__PURE__*/ B.createElement(T, { className: u }, (a != null || d) && /*#__PURE__*/ B.createElement("defs", null, a != null && /*#__PURE__*/ B.createElement(S, {
			id: He(o),
			fillObject: a,
			color: s
		}), d && /*#__PURE__*/ B.createElement(x, {
			id: o,
			entries: n.map((e, t) => ({
				index: t,
				payload: e.payload,
				color: Re(e.payload, s, c, l).fill
			}))
		})), i && /*#__PURE__*/ B.createElement(T, { className: "recharts-radial-bar-background" }, this.renderBackground(n)), /*#__PURE__*/ B.createElement(T, { className: "recharts-radial-bar-sectors" }, /*#__PURE__*/ B.createElement(er, this.props))));
	}
};
function or(e) {
	var t = B.useMemo(() => Ae(e.children, c), [e.children]), n = B.useMemo(() => ({
		data: void 0,
		hide: !1,
		id: e.id,
		dataKey: e.dataKey,
		minAngle: e.minAngle,
		minPointSize: e.minPointSize,
		stackId: Ve(e.stackId),
		maxBarSize: e.maxBarSize,
		barSize: e.barSize,
		type: "radialBar",
		angleAxisId: e.angleAxisId,
		radiusAxisId: e.radiusAxisId
	}), [
		e.id,
		e.dataKey,
		e.minAngle,
		e.minPointSize,
		e.stackId,
		e.maxBarSize,
		e.barSize,
		e.angleAxisId,
		e.radiusAxisId
	]), r = Rt((r) => Rn(r, e.radiusAxisId, e.angleAxisId, n, t)) ?? Yn;
	return /*#__PURE__*/ B.createElement(B.Fragment, null, /*#__PURE__*/ B.createElement(nr, {
		dataKey: e.dataKey,
		sectors: r,
		stroke: e.stroke,
		strokeWidth: e.strokeWidth,
		name: e.name,
		hide: e.hide,
		fill: e.fill,
		tooltipType: e.tooltipType,
		formatter: e.formatter,
		id: e.id,
		unthemedColors: e.unthemedColors
	}), /*#__PURE__*/ B.createElement(ar, G({}, e, { sectors: r })));
}
var q = {
	angleAxisId: 0,
	animationBegin: 0,
	animationDuration: 1500,
	animationEasing: "ease",
	animationMatchBy: $e,
	animationInterpolateFn: Qn,
	background: !1,
	cornerIsExternal: !1,
	cornerRadius: 0,
	forceCornerRadius: !1,
	hide: !1,
	isAnimationActive: "auto",
	label: !1,
	legendType: "rect",
	minAngle: 0,
	minPointSize: 0,
	radiusAxisId: 0,
	shape: gn,
	zIndex: y.bar
};
function sr(e) {
	var t = e.displayedData, n = e.stackedData, r = e.dataStartIndex, i = e.stackedDomain, a = e.dataKey, o = e.baseValue, s = e.layout, c = e.radiusAxis, l = e.radiusAxisTicks, u = e.bandSize, d = e.pos, f = e.angleAxis, p = e.minAngle, m = e.minPointSize, h = e.cx, g = e.cy, _ = e.angleAxisTicks, v = e.cells, y = e.startAngle, b = e.endAngle;
	return _ == null || l == null ? Yn : (t ?? []).map((e, t) => {
		var x = typeof e == "object" && e ? rt(e, ["id"]) : e, S, C, w, T, E, D;
		if (n ? S = Ft(n[r + t], i) : (S = We(e, a), Array.isArray(S) || (S = [o, S])), s === "radial") {
			T = f.scale.map(S[0]) ?? y;
			var ee = f.scale.map(S[1]);
			if (E = ee ?? T, C = Ne({
				axis: c,
				ticks: l,
				bandSize: u,
				offset: d.offset,
				entry: e,
				index: t
			}), C != null && E != null && T != null) {
				w = C + d.size;
				var O = E - T;
				if (ee != null && Math.abs(m) > 0 && Math.abs(O) < Math.abs(m)) {
					var te = et(O || m) * (Math.abs(m) - Math.abs(O));
					E += te, O = E - T;
				}
				if (Math.abs(p) > 0 && O !== 0 && Math.abs(O) < Math.abs(p)) {
					var k = et(O) * (Math.abs(p) - Math.abs(O));
					E += k;
				}
				D = { background: {
					cx: h,
					cy: g,
					innerRadius: C,
					outerRadius: w,
					startAngle: y,
					endAngle: b
				} };
			}
		} else if (C = c.scale.map(S[0]), w = c.scale.map(S[1]), T = Ne({
			axis: f,
			ticks: _,
			bandSize: u,
			offset: d.offset,
			entry: e,
			index: t
		}), C != null && w != null && T != null) {
			E = T + d.size;
			var A = w - C;
			if (Math.abs(m) > 0 && Math.abs(A) < Math.abs(m)) {
				var j = et(A || m) * (Math.abs(m) - Math.abs(A));
				w += j;
			}
		}
		return $t(K(K(K({}, x), D), {}, {
			payload: e,
			value: n ? S : S[1],
			cx: h,
			cy: g,
			innerRadius: C,
			outerRadius: w,
			startAngle: T,
			endAngle: E
		}, v && v[t] && v[t].props), e);
	});
}
function cr(e) {
	var t = jt(e.fill), n = t.color, r = t.fillObject, i = K(K({}, e), {}, { fill: n }), a = Bt({
		dataKey: i.dataKey,
		angleAxisId: i.angleAxisId ?? q.angleAxisId,
		radiusAxisId: i.radiusAxisId ?? q.radiusAxisId
	}), o = Vt(a, i), s = Ht(a, i), c = r ?? s, l = Jt(o), u = Xt(i), d = Yt(o, i), f = zt(o, i, void 0), p = _t(K(K({}, i), {}, { dataKey: a }), q), m = i.fill ?? f?.fill, h = i.stroke ?? f?.stroke, g = i.strokeWidth ?? f?.strokeWidth, _ = i.strokeOpacity ?? f?.strokeOpacity, y = i.strokeDasharray ?? f?.strokeDasharray, b = i.fillOpacity ?? f?.fillOpacity, x = {};
	return m !== void 0 && (x.fill = m), h !== void 0 && (x.stroke = h), g !== void 0 && (x.strokeWidth = g), _ !== void 0 && (x.strokeOpacity = _), y !== void 0 && (x.strokeDasharray = y), b !== void 0 && (x.fillOpacity = b), /*#__PURE__*/ B.createElement(A, {
		id: p.id,
		type: "radialBar"
	}, (e) => /*#__PURE__*/ B.createElement(B.Fragment, null, /*#__PURE__*/ B.createElement(oe, {
		type: "radialBar",
		id: e,
		data: void 0,
		dataKey: p.dataKey,
		hide: p.hide ?? q.hide,
		angleAxisId: p.angleAxisId ?? q.angleAxisId,
		radiusAxisId: p.radiusAxisId ?? q.radiusAxisId,
		stackId: Ve(p.stackId),
		barSize: p.barSize,
		minAngle: p.minAngle,
		minPointSize: p.minPointSize,
		maxBarSize: p.maxBarSize
	}), /*#__PURE__*/ B.createElement(tr, {
		legendType: p.legendType,
		fill: x.fill,
		stroke: x.stroke,
		unthemedColors: u,
		fillObject: c
	}, p.children), /*#__PURE__*/ B.createElement(v, { value: l }, /*#__PURE__*/ B.createElement(or, G({}, p, x, {
		id: e,
		fillObject: c,
		unthemedColors: u,
		themedActiveStyles: d
	})))));
}
cr.displayName = "RadialBar";
// node_modules/recharts/es6/chart/RadialBarChart.js
function lr(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function ur(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? lr(Object(n), !0).forEach(function(t) {
			dr(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : lr(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function dr(e, t, n) {
	return (t = fr(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function fr(e) {
	var t = pr(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function pr(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var mr = ["axis", "item"], hr = ur(ur({}, un), {}, {
	layout: "radial",
	startAngle: 0,
	endAngle: 360
}), gr = /*#__PURE__*/ (0, B.forwardRef)((e, t) => {
	var n = _t(e, hr);
	return /*#__PURE__*/ B.createElement(ln, {
		chartName: "RadialBarChart",
		defaultTooltipEventType: "axis",
		validateTooltipEventTypes: mr,
		tooltipPayloadSearcher: ye,
		categoricalChartProps: n,
		ref: t
	});
}), J = ht(), _r = "30%", vr = "100%", yr = 5, br = 14, xr = 5, Sr = 1500, Cr = (0, B.createContext)(null);
function wr() {
	let e = (0, B.use)(Cr);
	if (!e) throw Error("Radial chart parts (<RadialBar />, <Tooltip />, …) must be used within <EvilRadialChart />");
	return e;
}
function Y({ config: e, data: t, nameKey: n, children: r, className: i, chartProps: a, variant: o = "full", max: s, innerRadius: c = _r, outerRadius: d = vr, defaultSelectedDataKey: f = null, onSelectionChange: p, isLoading: m = !1, backgroundVariant: h }) {
	let g = (0, B.useId)().replace(/:/g, ""), [_, v] = (0, B.useState)(f), y = Or(m), b = Tr(o), x = (0, B.useCallback)((e, t) => {
		v(e), p?.(e === null ? null : {
			dataKey: e,
			value: t ?? 0
		});
	}, [p]), S = (0, B.useMemo)(() => t.map((e) => ({
		...e,
		fill: `url(#${g}-radial-colors-${e[n]})`
	})), [
		t,
		n,
		g
	]), C = (0, B.useMemo)(() => ({
		config: e,
		nameKey: n,
		chartId: g,
		isLoading: m,
		selectedBar: _,
		selectBar: x
	}), [
		e,
		n,
		g,
		m,
		_,
		x
	]);
	return /* @__PURE__ */ (0, J.jsx)(Cr, {
		value: C,
		children: /* @__PURE__ */ (0, J.jsxs)(u, {
			className: i,
			config: e,
			children: [/* @__PURE__ */ (0, J.jsx)(E, { isLoading: m }), /* @__PURE__ */ (0, J.jsxs)(gr, {
				id: g,
				data: m ? y : S,
				innerRadius: c,
				outerRadius: d,
				startAngle: b.startAngle,
				endAngle: b.endAngle,
				cx: b.cx,
				cy: b.cy,
				...a,
				children: [
					s != null && s > 0 && /* @__PURE__ */ (0, J.jsx)(nn, {
						type: "number",
						domain: [0, s],
						tick: !1,
						axisLine: !1
					}),
					h && /* @__PURE__ */ (0, J.jsx)(l, { variant: h }),
					r,
					m && /* @__PURE__ */ (0, J.jsx)(kr, {}),
					/* @__PURE__ */ (0, J.jsx)("defs", { children: /* @__PURE__ */ (0, J.jsx)(Er, {
						config: e,
						chartId: g
					}) })
				]
			})]
		})
	});
}
function Tr(e) {
	return e === "semi" ? {
		startAngle: 180,
		endAngle: 0,
		cx: "50%",
		cy: "70%"
	} : {
		startAngle: 90,
		endAngle: -270,
		cx: "50%",
		cy: "50%"
	};
}
var Er = ({ config: e, chartId: t }) => /* @__PURE__ */ (0, J.jsx)(J.Fragment, { children: Object.entries(e).map(([e, n]) => {
	let r = Pe(n);
	return /* @__PURE__ */ (0, J.jsx)("linearGradient", {
		id: `${t}-radial-colors-${e}`,
		x1: "0",
		y1: "0",
		x2: "1",
		y2: "1",
		children: r === 1 ? /* @__PURE__ */ (0, J.jsxs)(J.Fragment, { children: [/* @__PURE__ */ (0, J.jsx)("stop", {
			offset: "0%",
			stopColor: `var(--color-${e}-0)`
		}), /* @__PURE__ */ (0, J.jsx)("stop", {
			offset: "100%",
			stopColor: `var(--color-${e}-0)`
		})] }) : Array.from({ length: r }, (t, n) => {
			let i = `${n / (r - 1) * 100}%`;
			return /* @__PURE__ */ (0, J.jsx)("stop", {
				offset: i,
				stopColor: `var(--color-${e}-${n}, var(--color-${e}-0))`
			}, i);
		})
	}, `${t}-radial-colors-${e}`);
}) });
function Dr() {
	return Array.from({ length: xr }, (e, t) => ({
		name: `loading${t}`,
		value: 40 + Math.random() * 60
	}));
}
function Or(e) {
	let [t, n] = (0, B.useState)(0);
	return (0, B.useEffect)(() => {
		if (!e) return;
		let t = setInterval(() => {
			n((e) => e + 1);
		}, Sr);
		return () => clearInterval(t);
	}, [e]), (0, B.useMemo)(() => Dr(), [t]);
}
var kr = () => /* @__PURE__ */ (0, J.jsx)(cr, {
	dataKey: "value",
	cornerRadius: yr,
	barSize: br,
	background: !0,
	isAnimationActive: !0,
	animationDuration: Sr,
	animationEasing: "ease-in-out",
	shape: (e) => /* @__PURE__ */ (0, J.jsx)(M, {
		...e,
		fill: "currentColor",
		fillOpacity: .25
	})
});
Y.RadialBar = function({ dataKey: e, cornerRadius: t = yr, barSize: n = br, showBackground: r = !0, isClickable: i = !1, radialBarProps: a }) {
	let { nameKey: o, isLoading: s, selectedBar: c, selectBar: l } = wr();
	return s ? null : /* @__PURE__ */ (0, J.jsx)(cr, {
		dataKey: e,
		cornerRadius: t,
		barSize: n,
		background: r,
		className: "drop-shadow-sm",
		style: i ? { cursor: "pointer" } : void 0,
		onClick: (t, n) => {
			if (!i) return;
			let r = t, a = r?.[o] ?? String(n), s = Number(r?.[e] ?? 0);
			l(c === a ? null : a, s);
		},
		shape: (e) => {
			let t = e[o], n = c === null || c === t;
			return /* @__PURE__ */ (0, J.jsx)(M, {
				...e,
				opacity: i && !n ? .15 : 1,
				className: "transition-opacity duration-200"
			});
		},
		...a
	});
}, Y.Tooltip = function({ variant: e, roundness: t, defaultIndex: n }) {
	let { nameKey: r, isLoading: i } = wr();
	return i ? null : /* @__PURE__ */ (0, J.jsx)(h, {
		defaultIndex: n,
		cursor: !1,
		content: /* @__PURE__ */ (0, J.jsx)(g, {
			nameKey: r,
			hideLabel: !0,
			roundness: t,
			variant: e
		})
	});
}, Y.Legend = function({ variant: e, align: t = "center", verticalAlign: n = "bottom", isClickable: r = !1 }) {
	let { nameKey: i, isLoading: a, selectedBar: o, selectBar: s } = wr();
	return a ? null : /* @__PURE__ */ (0, J.jsx)(f, {
		verticalAlign: n,
		align: t,
		content: /* @__PURE__ */ (0, J.jsx)(p, {
			selected: o,
			onSelectChange: s,
			isClickable: r,
			nameKey: i,
			variant: e
		})
	});
};
// src/react/stats/radial-card.tsx
var Ar = [
	"bg-chart-1",
	"bg-chart-2",
	"bg-chart-3",
	"bg-chart-4",
	"bg-chart-5",
	"bg-chart-6"
], jr = [
	"aria-pressed:bg-chart-1/10 aria-pressed:ring-chart-1",
	"aria-pressed:bg-chart-2/10 aria-pressed:ring-chart-2",
	"aria-pressed:bg-chart-3/10 aria-pressed:ring-chart-3",
	"aria-pressed:bg-chart-4/10 aria-pressed:ring-chart-4",
	"aria-pressed:bg-chart-5/10 aria-pressed:ring-chart-5",
	"aria-pressed:bg-chart-6/10 aria-pressed:ring-chart-6"
];
function Mr({ title: e, rows: t, empty: n, unit: r = (e) => R("manage:radialCard.videoUnit", { count: e }) }) {
	let [i, a] = (0, B.useState)(-1), [s, c] = (0, B.useState)(-1), l = dt(t);
	if (!l.length) return /* @__PURE__ */ (0, J.jsx)(d, {
		title: e,
		children: n
	});
	let u = s >= 0 ? s : i, f = l.reduce((e, t) => e + t.value, 0), p = l[u], h = (e) => a((t) => t === e ? -1 : e), g = ut(l.map((e) => e.value)), _ = l.map((e, t) => ({
		slice: At(t),
		count: e.value,
		arc: ct(e.value, g)
	}));
	return /* @__PURE__ */ (0, J.jsxs)("section", {
		className: o,
		children: [
			/* @__PURE__ */ (0, J.jsxs)("header", {
				className: "flex flex-wrap items-end justify-between gap-x-4 gap-y-1",
				children: [/* @__PURE__ */ (0, J.jsxs)("span", {
					className: "flex min-w-0 flex-col gap-1",
					children: [/* @__PURE__ */ (0, J.jsxs)("h3", {
						className: "flex items-center gap-1.5 text-title-2-medium wrap-anywhere text-text-primary",
						children: [p?.mark ? /* @__PURE__ */ (0, J.jsx)(ue, { mark: p.mark }) : null, p ? p.name : e]
					}), /* @__PURE__ */ (0, J.jsx)("b", {
						className: "text-display-4-medium tabular-nums text-text-primary",
						children: (p ? p.value : f).toLocaleString()
					})]
				}), /* @__PURE__ */ (0, J.jsx)("small", {
					className: "text-caption-1-regular text-text-secondary",
					children: r(p ? p.value : f)
				})]
			}),
			/* @__PURE__ */ (0, J.jsx)("div", {
				role: "img",
				"aria-label": e,
				onPointerLeave: () => c(-1),
				children: /* @__PURE__ */ (0, J.jsxs)(Y, {
					data: _,
					nameKey: "slice",
					config: kt(l.map((e) => e.name)),
					max: g,
					innerRadius: "22%",
					className: "aspect-auto h-75 max-sm:h-65",
					children: [/* @__PURE__ */ (0, J.jsx)(Y.RadialBar, {
						dataKey: "arc",
						barSize: lt(l.length),
						radialBarProps: {
							shape: (e) => /* @__PURE__ */ (0, J.jsx)(M, {
								...e,
								opacity: u >= 0 && u !== e.index ? .3 : 1,
								className: "cursor-pointer transition-opacity duration-200"
							}),
							onClick: (e, t) => h(t),
							onMouseEnter: (e, t) => c(t)
						}
					}), /* @__PURE__ */ (0, J.jsx)(m, {
						nameKey: "slice",
						valueKey: "count",
						hideLabel: !0
					})]
				})
			}),
			/* @__PURE__ */ (0, J.jsx)("div", {
				className: "inline-grid w-full grid-cols-3 gap-2 max-sm:grid-cols-2",
				children: l.map((e, t) => /* @__PURE__ */ (0, J.jsxs)("button", {
					type: "button",
					"aria-pressed": i === t,
					onClick: () => h(t),
					onPointerEnter: () => c(t),
					onPointerLeave: () => c(-1),
					onFocus: () => c(t),
					onBlur: () => c(-1),
					className: `flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-xl bg-background-tertiary-default p-2.5 text-left outline-none aria-pressed:ring-1 aria-pressed:ring-inset focus-visible:ring-2 focus-visible:ring-border-focus-ring ${jr[t % 6]}`,
					children: [
						/* @__PURE__ */ (0, J.jsxs)("span", {
							className: "flex min-w-0 max-w-full items-start gap-1.5 text-caption-1-regular text-text-secondary",
							children: [/* @__PURE__ */ (0, J.jsx)("i", {
								"aria-hidden": !0,
								className: `mt-0.5 size-3 shrink-0 rounded-sm ${Ar[t % 6]}`
							}), /* @__PURE__ */ (0, J.jsxs)("span", {
								className: "inline-flex min-w-0 items-start gap-1.5 wrap-anywhere",
								children: [e.mark ? /* @__PURE__ */ (0, J.jsx)(ue, { mark: e.mark }) : null, e.name]
							})]
						}),
						/* @__PURE__ */ (0, J.jsx)("b", {
							className: "text-title-2-medium tabular-nums text-text-primary",
							children: e.value.toLocaleString()
						}),
						e.bytes == null ? null : /* @__PURE__ */ (0, J.jsx)("small", {
							className: "text-caption-1-regular text-text-secondary",
							children: F(e.bytes)
						})
					]
				}, At(t)))
			})
		]
	});
}
// src/react/stats/stats-page.tsx
var Nr = Ot("library"), Pr = 10, Fr = s[5], Ir = s[4], Lr = `${xe()} flex flex-col gap-4`, Rr = (e) => R("manage:radialCard.videoUnit", { count: e }), zr = (e) => R("manage:stats.viewingUnit", { count: e }), Br = R("manage:stats.noVideoHint"), Vr = R("manage:stats.noTagHint"), Hr = R("manage:stats.noWatchHint"), Ur = R("manage:stats.noTagSourceHint"), Wr = R("manage:stats.noVolumeHint"), Gr = R("manage:stats.noLibraryHint"), Kr = R("manage:stats.noLengthHint"), qr = R("manage:stats.noQualityHint"), Jr = R("manage:stats.noPlayTimeHint"), Yr = R("manage:stats.noReplayHint"), Xr = (e, t) => Math.min(Math.max(e, 0), t);
function X({ term: e, value: t }) {
	return /* @__PURE__ */ (0, J.jsxs)("div", {
		className: "flex min-h-16 min-w-0 flex-col gap-1.5 rounded-2lg bg-background-primary-default p-3",
		children: [/* @__PURE__ */ (0, J.jsx)("span", {
			className: "text-caption-1-regular text-text-secondary",
			children: e
		}), /* @__PURE__ */ (0, J.jsx)("b", {
			className: "text-title-3-medium tabular-nums text-text-primary",
			children: P(t)
		})]
	});
}
function Z({ term: e, value: t, total: n }) {
	let r = Math.max(n, 1);
	return /* @__PURE__ */ (0, J.jsxs)("div", {
		className: "flex flex-col gap-1.5 border-b border-separator-border py-3 last:border-b-0",
		children: [/* @__PURE__ */ (0, J.jsxs)("p", {
			className: "flex items-baseline justify-between gap-3 text-body-2-regular text-text-primary",
			children: [/* @__PURE__ */ (0, J.jsx)("span", { children: e }), /* @__PURE__ */ (0, J.jsxs)("b", {
				className: "tabular-nums",
				children: [P(t), Xe(t) ? /* @__PURE__ */ (0, J.jsx)("span", {
					className: "ml-1.5 text-caption-1-regular text-text-secondary",
					children: at(t, n)
				}) : null]
			})]
		}), /* @__PURE__ */ (0, J.jsx)(k, {
			meter: !0,
			label: R("manage:shared.termProgress", {
				term: e,
				value: P(t),
				total: n.toLocaleString()
			}),
			value: Xe(t) ? Xr(t, r) : 0,
			max: r
		})]
	});
}
function Zr({ term: e, figure: t, unit: n }) {
	return /* @__PURE__ */ (0, J.jsxs)("div", {
		className: "flex shrink-0 flex-col gap-0.5 pb-5 md:w-64 md:pr-6 md:pb-0",
		children: [
			/* @__PURE__ */ (0, J.jsx)("span", {
				className: "text-caption-1-regular text-text-secondary",
				children: e
			}),
			/* @__PURE__ */ (0, J.jsx)("b", {
				className: "text-display-4-medium tabular-nums text-text-primary",
				children: t
			}),
			/* @__PURE__ */ (0, J.jsx)("span", {
				className: "text-body-2-regular text-text-secondary",
				children: n
			})
		]
	});
}
function Q({ headline: e, children: t }) {
	return /* @__PURE__ */ (0, J.jsxs)("div", {
		className: `${Lr} md:flex-row md:gap-6`,
		children: [e, /* @__PURE__ */ (0, J.jsx)("div", {
			className: "min-w-0 grow",
			children: t
		})]
	});
}
function Qr({ data: e }) {
	return e.by_loc.reduce((e, t) => e + t.videos, 0) ? /* @__PURE__ */ (0, J.jsxs)("div", {
		className: "flex flex-col gap-5",
		children: [/* @__PURE__ */ (0, J.jsxs)("div", {
			className: "inline-grid w-full gap-5 md:grid-cols-2",
			children: [/* @__PURE__ */ (0, J.jsx)(Mr, {
				title: R("manage:stats.cloudAndLocal"),
				empty: Br,
				rows: e.by_loc.map((e) => ({
					name: C[e.k] ?? e.k,
					value: e.videos,
					bytes: e.bytes,
					mark: D[e.k] || "database"
				}))
			}), /* @__PURE__ */ (0, J.jsx)(Mr, {
				title: R("manage:shared.library"),
				empty: Gr,
				rows: e.by_library.map((e) => ({
					name: e.name,
					value: e.videos,
					bytes: e.bytes,
					mark: D[e.icon] || e.icon || "database"
				}))
			})]
		}), /* @__PURE__ */ (0, J.jsxs)("div", {
			className: "inline-grid w-full gap-5 md:grid-cols-2 xl:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, J.jsx)(z, {
					title: R("manage:shared.duration"),
					unit: Rr,
					series: R("manage:processingTraffic.sourceVideos"),
					color: Fr,
					rows: Ze(e.by_length),
					empty: Kr
				}),
				/* @__PURE__ */ (0, J.jsx)(z, {
					title: R("manage:shared.quality"),
					unit: Rr,
					series: R("manage:processingTraffic.sourceVideos"),
					color: Fr,
					rows: be(e.by_quality),
					empty: qr
				}),
				/* @__PURE__ */ (0, J.jsx)(z, {
					title: R("manage:stats.fileTypes"),
					unit: (e) => R("manage:stats.itemsUnit", { count: e }),
					series: R("manage:stats.itemsSeries"),
					color: Fr,
					layout: "horizontal",
					rows: tt(e.by_medium),
					empty: Br
				})
			]
		})]
	}) : /* @__PURE__ */ (0, J.jsx)(b, {
		icon: ee,
		title: R("manage:stats.noVideosTitle"),
		actions: /* @__PURE__ */ (0, J.jsxs)(J.Fragment, { children: [/* @__PURE__ */ (0, J.jsx)(a, {
			variant: "secondary",
			href: "/subscriptions?tab=add",
			size: "small",
			children: R("manage:stats.newFollow")
		}), /* @__PURE__ */ (0, J.jsx)(a, {
			variant: "primary",
			href: Nr,
			size: "small",
			children: R("manage:shared.addMedia")
		})] }),
		children: Br
	});
}
function $r({ data: e }) {
	return /* @__PURE__ */ (0, J.jsxs)(J.Fragment, { children: [/* @__PURE__ */ (0, J.jsx)(en, {
		activity: e.play_activity,
		title: R("manage:stats.playTimes"),
		dailyTitle: R("manage:stats.dailyPlays"),
		words: {
			unit: zr,
			series: R("manage:shared.video"),
			cell: (e) => R("manage:stats.viewingCell", { count: e })
		},
		tone: 5,
		empty: Jr
	}), /* @__PURE__ */ (0, J.jsx)(z, {
		title: R("manage:stats.plays"),
		unit: zr,
		series: R("manage:shared.video"),
		color: Ir,
		rows: mt(e.replays),
		empty: Yr
	})] });
}
function ei({ attribution: e }) {
	let t = e.videos;
	return /* @__PURE__ */ (0, J.jsxs)("div", {
		className: "flex flex-col",
		children: [
			/* @__PURE__ */ (0, J.jsx)(Z, {
				term: R("manage:stats.hasCreator"),
				value: e.creator,
				total: t
			}),
			/* @__PURE__ */ (0, J.jsx)(Z, {
				term: R("manage:stats.hasCode"),
				value: e.code,
				total: t
			}),
			/* @__PURE__ */ (0, J.jsx)(Z, {
				term: R("manage:stats.hasLabel"),
				value: e.studio,
				total: t
			}),
			/* @__PURE__ */ (0, J.jsx)(Z, {
				term: R("manage:stats.framesExtracted"),
				value: e.thumb,
				total: t
			}),
			/* @__PURE__ */ (0, J.jsx)(Z, {
				term: R("manage:stats.durationProbed"),
				value: e.duration,
				total: t
			})
		]
	});
}
function ti({ volume: e }) {
	let t = e.total, n = e.used ?? 0, r = Ce(e, "label");
	return /* @__PURE__ */ (0, J.jsxs)("article", {
		className: "flex min-w-0 flex-col gap-1.5 border-b border-separator-border py-3 last:border-b-0",
		children: [
			/* @__PURE__ */ (0, J.jsxs)("header", {
				className: "flex items-baseline justify-between gap-3 text-body-2-regular text-text-primary",
				children: [/* @__PURE__ */ (0, J.jsx)("h3", {
					className: "min-w-0 break-words",
					children: r
				}), t == null ? e.online ? /* @__PURE__ */ (0, J.jsx)(fe, { children: R("manage:stats.capacityNotFound") }) : /* @__PURE__ */ (0, J.jsx)(sn, { online: !1 }) : /* @__PURE__ */ (0, J.jsxs)("b", {
					className: "whitespace-nowrap tabular-nums",
					children: [F(n), /* @__PURE__ */ (0, J.jsx)("span", {
						className: "ml-1.5 text-caption-1-regular text-text-secondary",
						children: at(n, t)
					})]
				})]
			}),
			t == null ? null : /* @__PURE__ */ (0, J.jsx)(k, {
				meter: !0,
				label: R("manage:stats.volumeUsage", { volume: r }),
				value: Xr(n, Math.max(t, 1)),
				max: Math.max(t, 1)
			}),
			/* @__PURE__ */ (0, J.jsxs)("p", {
				className: "flex justify-between gap-3 text-caption-1-regular text-text-secondary",
				children: [/* @__PURE__ */ (0, J.jsx)("span", {
					className: "min-w-0 break-words",
					children: e.root ?? R("manage:stats.notMapped")
				}), t == null ? null : /* @__PURE__ */ (0, J.jsx)("span", {
					className: "whitespace-nowrap tabular-nums",
					children: R("manage:stats.volumeFreeTotal", {
						free: F(e.free ?? 0),
						total: F(t)
					})
				})]
			})
		]
	});
}
function ni({ volumes: e }) {
	return e.length ? /* @__PURE__ */ (0, J.jsx)("div", {
		className: "flex flex-col",
		children: e.map((e) => /* @__PURE__ */ (0, J.jsx)(ti, { volume: e }, `${e.kind}:${e.label}`))
	}) : /* @__PURE__ */ (0, J.jsx)(b, {
		icon: pe,
		title: R("manage:stats.noStorageTitle"),
		actions: /* @__PURE__ */ (0, J.jsx)(a, {
			variant: "primary",
			href: Nr,
			size: "small",
			children: R("manage:shared.addMedia")
		}),
		children: Wr
	});
}
function ri({ tags: e, tagLabel: t, onTag: n, hasMedia: r }) {
	return e.length ? /* @__PURE__ */ (0, J.jsx)(tn, {
		previewCount: Pr,
		className: "inline-grid w-full gap-x-6 gap-y-1 sm:grid-cols-2",
		children: e.map((e, r) => /* @__PURE__ */ (0, J.jsx)("li", {
			className: "min-w-0",
			children: /* @__PURE__ */ (0, J.jsxs)("button", {
				type: "button",
				onClick: () => n(e.k),
				className: "flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
				children: [
					/* @__PURE__ */ (0, J.jsx)("span", {
						className: "w-6 shrink-0 text-caption-1-regular tabular-nums text-text-secondary",
						children: r + 1
					}),
					/* @__PURE__ */ (0, J.jsx)("span", {
						className: "min-w-0 grow text-body-2-regular break-words text-text-primary",
						children: t(e.k)
					}),
					/* @__PURE__ */ (0, J.jsx)("b", {
						className: "text-body-2-medium tabular-nums text-text-secondary",
						children: e.n.toLocaleString()
					})
				]
			})
		}, `${e.k}:${r}`))
	}) : /* @__PURE__ */ (0, J.jsx)(b, {
		icon: Qe,
		title: R("manage:stats.noContentTagsTitle"),
		actions: /* @__PURE__ */ (0, J.jsx)(a, {
			variant: "secondary",
			href: r ? "/data-cleanup" : "/settings/library",
			size: "small",
			children: R(r ? "manage:shared.fillInMetadata" : "manage:shared.addMedia")
		}),
		children: Vr
	});
}
function ii({ rows: e, hasMedia: t }) {
	return e.length ? /* @__PURE__ */ (0, J.jsx)("div", {
		className: "flex flex-col gap-5",
		children: e.map((e) => {
			let t = Qt(e);
			return /* @__PURE__ */ (0, J.jsxs)("article", {
				className: "flex flex-wrap items-center gap-x-6 gap-y-2",
				children: [/* @__PURE__ */ (0, J.jsxs)("div", {
					className: "min-w-0 grow basis-64",
					children: [/* @__PURE__ */ (0, J.jsx)("h3", {
						className: "min-w-0 text-body-2-medium text-text-primary",
						children: /* @__PURE__ */ (0, J.jsx)("a", {
							href: st(e),
							"data-middle-truncate": !0,
							className: "block max-w-full overflow-hidden whitespace-nowrap hover:underline",
							children: e.name
						})
					}), /* @__PURE__ */ (0, J.jsxs)("p", {
						className: "flex flex-wrap gap-3 text-caption-1-regular text-text-secondary",
						children: [e.creator ? /* @__PURE__ */ (0, J.jsx)("span", {
							className: "min-w-0 wrap-anywhere",
							children: e.creator
						}) : null, /* @__PURE__ */ (0, J.jsx)("span", { children: Zt(e) })]
					})]
				}), /* @__PURE__ */ (0, J.jsxs)("div", {
					className: "min-w-0 basis-40",
					children: [/* @__PURE__ */ (0, J.jsx)(k, {
						meter: !0,
						label: R("manage:stats.watchedShare", { percent: t.toFixed(0) }),
						value: t
					}), /* @__PURE__ */ (0, J.jsx)("small", {
						className: "mt-1.5 block text-caption-1-regular text-text-secondary",
						children: R("manage:stats.watchedReached", {
							watched: t.toFixed(0),
							reached: ft(e).toFixed(0)
						})
					})]
				})]
			}, `${e.kind}:${e.id}`);
		})
	}) : /* @__PURE__ */ (0, J.jsx)(b, {
		icon: It,
		title: R("manage:stats.noWatchHistoryTitle"),
		actions: /* @__PURE__ */ (0, J.jsx)(a, {
			variant: "secondary",
			href: t ? "/" : "/settings/library",
			size: "small",
			children: R(t ? "manage:shared.browseCollection" : "manage:shared.addMedia")
		}),
		children: Hr
	});
}
function ai({ sources: e, videos: t }) {
	return e.length ? /* @__PURE__ */ (0, J.jsx)("div", {
		className: "inline-grid w-full gap-x-8 gap-y-6 sm:grid-cols-2",
		children: e.map((e) => /* @__PURE__ */ (0, J.jsxs)("article", {
			className: "flex min-w-0 flex-col gap-1.5",
			children: [
				/* @__PURE__ */ (0, J.jsxs)("header", {
					className: "flex items-baseline justify-between gap-3",
					children: [/* @__PURE__ */ (0, J.jsx)("h3", {
						className: "min-w-0 text-body-2-medium break-words text-text-primary",
						children: e.k
					}), /* @__PURE__ */ (0, J.jsxs)("b", {
						className: "text-body-2-medium whitespace-nowrap text-text-primary",
						children: [e.assets.toLocaleString(), /* @__PURE__ */ (0, J.jsx)("small", {
							className: "ml-1 text-caption-1-regular font-normal text-text-secondary",
							children: Rr(e.assets)
						})]
					})]
				}),
				/* @__PURE__ */ (0, J.jsx)(k, {
					meter: !0,
					label: R("manage:stats.tagSourceCoverage", { source: e.k }),
					value: Xr(e.assets, Math.max(t, 1)),
					max: Math.max(t, 1)
				}),
				/* @__PURE__ */ (0, J.jsx)("small", {
					className: "text-caption-1-regular text-text-secondary",
					children: R("manage:stats.tagsCount", { count: e.n })
				})
			]
		}, e.k))
	}) : /* @__PURE__ */ (0, J.jsx)(b, {
		icon: Qe,
		title: R("manage:stats.noTagSourcesTitle"),
		actions: /* @__PURE__ */ (0, J.jsx)(a, {
			variant: "secondary",
			href: t ? "/data-cleanup" : "/settings/library",
			size: "small",
			children: R(t ? "manage:shared.fillInMetadata" : "manage:shared.addMedia")
		}),
		children: Ur
	});
}
function $({ id: e, label: n, figure: r, detail: i, icon: a, accent: o }) {
	return /* @__PURE__ */ (0, J.jsx)(t, {
		id: e,
		className: Mt({
			interactive: !0,
			selectable: !0
		}),
		children: /* @__PURE__ */ (0, J.jsx)(de, {
			label: n,
			icon: a,
			accent: o,
			figure: r,
			footer: i
		})
	});
}
function oi(i) {
	let a = qt({
		queryKey: re,
		queryFn: ({ signal: e }) => ke(e)
	}), o = a.data;
	if (!o) return /* @__PURE__ */ (0, J.jsx)(cn, { children: /* @__PURE__ */ (0, J.jsx)(O, {
		tone: "error",
		title: R("manage:stats.loadFailedTitle"),
		children: a.error ? Oe(a.error) : R("manage:stats.loadFailedHint")
	}) });
	let s = o.consumption, c = o.storage_summary, l = o.by_loc.reduce((e, t) => e + t.videos, 0), u = o.by_loc.reduce((e, t) => e + t.bytes, 0), d = Xe(o.tag_cov) ? at(o.tag_cov, o.attribution.videos) : R("manage:shared.notFound"), f = `${P(o.tag_cov)} / ${o.attribution.videos.toLocaleString()}`, p = l > 0 || o.top_tags.length > 0 || o.recent.length > 0 || o.tag_source.length > 0;
	return /* @__PURE__ */ (0, J.jsxs)(cn, { children: [/* @__PURE__ */ (0, J.jsxs)(n, {
		defaultSelectedKey: "inventory",
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, J.jsxs)(r, {
				"aria-label": R("manage:stats.viewsLabel"),
				className: ie,
				children: [
					/* @__PURE__ */ (0, J.jsx)($, {
						id: "inventory",
						label: R("manage:statsSkeleton.collection"),
						icon: ge,
						accent: 0,
						figure: l.toLocaleString(),
						detail: F(u)
					}),
					/* @__PURE__ */ (0, J.jsx)($, {
						id: "viewing",
						label: R("manage:shared.watched"),
						icon: me,
						accent: 1,
						figure: P(s.played),
						detail: ot(s.play_seconds)
					}),
					/* @__PURE__ */ (0, J.jsx)($, {
						id: "coverage",
						label: R("manage:statsSkeleton.contentTags"),
						icon: Qe,
						accent: 2,
						figure: d,
						detail: f
					}),
					/* @__PURE__ */ (0, J.jsx)($, {
						id: "storage",
						label: R("manage:statsSkeleton.spaceUsed"),
						icon: pe,
						accent: 3,
						figure: R("manage:stats.volumeCount", { count: c.online }),
						detail: c.measured ? R("manage:stats.usedSize", { size: F(c.used) }) : R("manage:stats.capacityNotFound")
					})
				]
			}),
			/* @__PURE__ */ (0, J.jsx)(e, {
				id: "inventory",
				children: /* @__PURE__ */ (0, J.jsx)(Qr, {
					data: o,
					...i
				})
			}),
			/* @__PURE__ */ (0, J.jsxs)(e, {
				id: "viewing",
				className: "flex flex-col gap-5",
				children: [/* @__PURE__ */ (0, J.jsx)(Q, {
					headline: /* @__PURE__ */ (0, J.jsx)(Zr, {
						term: R("manage:stats.watchedTerm"),
						figure: P(s.played),
						unit: R("manage:stats.videosWithPlays", { count: s.played ?? 0 })
					}),
					children: /* @__PURE__ */ (0, J.jsxs)("div", {
						className: "inline-grid w-full gap-3 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, J.jsx)(X, {
								term: R("manage:stats.watchedInCollection"),
								value: s.library_played
							}),
							/* @__PURE__ */ (0, J.jsx)(X, {
								term: R("manage:stats.watchedOnline"),
								value: s.online_played
							}),
							/* @__PURE__ */ (0, J.jsx)(X, {
								term: R("manage:stats.climaxCount"),
								value: s.o_total
							}),
							/* @__PURE__ */ (0, J.jsx)(X, {
								term: R("manage:stats.skimmed"),
								value: s.skimmed
							}),
							/* @__PURE__ */ (0, J.jsx)(X, {
								term: R("manage:shared.like"),
								value: s.liked
							}),
							/* @__PURE__ */ (0, J.jsx)(X, {
								term: R("manage:stats.disliked"),
								value: s.dislike
							}),
							/* @__PURE__ */ (0, J.jsx)(X, {
								term: R("manage:stats.seenIt"),
								value: s.seen
							}),
							/* @__PURE__ */ (0, J.jsx)(X, {
								term: R("manage:managePages.trash"),
								value: s.trash
							})
						]
					})
				}), /* @__PURE__ */ (0, J.jsx)($r, { data: o })]
			}),
			/* @__PURE__ */ (0, J.jsx)(e, {
				id: "coverage",
				children: /* @__PURE__ */ (0, J.jsx)(Q, {
					headline: /* @__PURE__ */ (0, J.jsx)(Zr, {
						term: R("manage:stats.contentTagCoverage"),
						figure: d,
						unit: f
					}),
					children: /* @__PURE__ */ (0, J.jsx)(ei, { attribution: o.attribution })
				})
			}),
			/* @__PURE__ */ (0, J.jsx)(e, {
				id: "storage",
				children: /* @__PURE__ */ (0, J.jsx)(Q, {
					headline: /* @__PURE__ */ (0, J.jsx)(Zr, {
						term: R("manage:statsSkeleton.spaceUsed"),
						figure: c.measured.toLocaleString(),
						unit: R("manage:stats.volumesMeasured", { count: c.measured })
					}),
					children: /* @__PURE__ */ (0, J.jsx)(ni, {
						volumes: o.storage_volumes,
						...i
					})
				})
			})
		]
	}), p ? /* @__PURE__ */ (0, J.jsxs)(n, {
		defaultSelectedKey: "tags",
		className: `${xe({ padding: "none" })} flex flex-col`,
		children: [
			/* @__PURE__ */ (0, J.jsx)("div", {
				className: "px-4 pt-3",
				children: /* @__PURE__ */ (0, J.jsxs)(ae, {
					"aria-label": R("manage:stats.breakdownsLabel"),
					className: ne,
					children: [
						/* @__PURE__ */ (0, J.jsx)(t, {
							id: "tags",
							className: j,
							children: R("manage:statsSkeleton.contentTags")
						}),
						/* @__PURE__ */ (0, J.jsx)(t, {
							id: "recent",
							className: j,
							children: R("manage:stats.recentlyWatched")
						}),
						/* @__PURE__ */ (0, J.jsx)(t, {
							id: "sources",
							className: j,
							children: R("manage:stats.tagSources")
						})
					]
				})
			}),
			/* @__PURE__ */ (0, J.jsx)(e, {
				id: "tags",
				className: "px-4 pt-3.5 pb-4",
				children: /* @__PURE__ */ (0, J.jsx)(ri, {
					tags: o.top_tags,
					hasMedia: l > 0,
					...i
				})
			}),
			/* @__PURE__ */ (0, J.jsx)(e, {
				id: "recent",
				className: "px-4 pt-3.5 pb-4",
				children: /* @__PURE__ */ (0, J.jsx)(ii, {
					rows: o.recent,
					hasMedia: l > 0
				})
			}),
			/* @__PURE__ */ (0, J.jsx)(e, {
				id: "sources",
				className: "px-4 pt-3.5 pb-4",
				children: /* @__PURE__ */ (0, J.jsx)(ai, {
					sources: o.tag_source,
					videos: o.attribution.videos
				})
			})
		]
	}) : null] });
}
export { oi as StatsPage };

//# debugId=06c83bb5-b466-4a6a-b0fa-faa5561433c3
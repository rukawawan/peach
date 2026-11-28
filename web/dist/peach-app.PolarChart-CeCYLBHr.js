(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "96296f43-9e1c-4f77-9538-7f1bb20ea288", e._sentryDebugIdIdentifier = "sentry-dbid-96296f43-9e1c-4f77-9538-7f1bb20ea288");
	} catch {}
})();
import { CategoricalChart as e, ChartDataContextProvider as t, RechartsStoreProvider as n, ReportChartProps as r, ReportEventSettings as i, ReportMainChartProps as a, __toESM as o, combineAppliedValues as s, combineAxisDomain as c, combineAxisDomainWithNiceTicks as l, combineCheckedDomain as u, combineDisplayedData as d, combineDisplayedStackedData as f, combineDomainOfAllAppliedNumericalValuesIncludingErrorValues as p, combineDomainOfStackGroups as m, combineGraphicalItemsData as h, combineGraphicalItemsSettings as g, combineNiceTicks as ee, combineNumericalDomain as te, combineStackGroups as _, combineStackOffsetTypeOfAxis as ne, createSelector as v, getDataKeyOnAxis as y, getValueByDataKey as b, initialEventSettingsState as x, isStackedGraphicalItem as re, itemAxisPredicate as ie, numberDomainEqualityCheck as ae, pickAxisId as S, pickAxisType as C, require_react as w, resolveDefaultProps as T, selectAllErrorBarSettings as E, selectBaseAxis as D, selectChartDataAndAlwaysIgnoreIndexes as O, selectChartDataSliceIgnoringIndexes as oe, selectChartDataWithIndexes as se, selectChartLayout as k, selectDomainDefinition as A, selectDomainFromUserPreference as j, selectRealScaleType as M, selectRenderableAxisSettings as N, selectReverseStackOrder as P, selectStackOffsetType as F, selectTooltipAxis as I, updatePolarOptions as L, useAppDispatch as R } from "./peach-app.js";
// node_modules/recharts/es6/state/selectors/polarSelectors.js
var z = (e) => e.graphicalItems.polarItems, B = v([C, S], ie), V = v([
	z,
	D,
	B
], g), H = v([V], h), U = v([H, O], d), W = v([
	U,
	D,
	V,
	k,
	C
], s);
v([
	U,
	D,
	V,
	k,
	C
], (e, t, n, r, i) => n.length > 0 ? e.flatMap((e) => n.flatMap((n) => ({
	value: b(e, y(n.dataKey, t.dataKey, r, i)),
	errorDomain: []
}))).filter(Boolean) : t?.dataKey == null ? e.map((e) => ({
	value: e,
	errorDomain: []
})) : e.map((e) => ({
	value: b(e, t.dataKey),
	errorDomain: []
})));
var G = () => void 0, K = v([V], (e) => e.filter(re)), ce = v([
	K,
	O,
	I
], f), q = v([
	ce,
	K,
	F,
	P
], _), le = v([
	q,
	se,
	C,
	j,
	E
], m, { memoizeOptions: { resultEqualityCheck: ae } }), ue = v([
	U,
	D,
	V,
	E,
	C,
	oe,
	k
], p), de = v([
	D,
	A,
	j,
	le,
	ue,
	G,
	k,
	C
], te), fe = v([
	F,
	z,
	B
], ne), J = v([
	D,
	k,
	U,
	W,
	fe,
	C,
	de
], c), Y = v([
	J,
	N,
	M
], ee), pe = v([
	D,
	J,
	Y,
	C
], l), me = v([M, pe], u), X = /* @__PURE__ */ o(w());
function he(e) {
	var t = R();
	return (0, X.useEffect)(() => {
		t(L(e));
	}, [t, e]), null;
}
// node_modules/recharts/es6/chart/PolarChart.js
var ge = ["layout"];
function Z() {
	return Z = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, Z.apply(null, arguments);
}
function _e(e, t) {
	if (e == null) return {};
	var n, r, i = ve(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function ve(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function Q(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function ye(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Q(Object(n), !0).forEach(function(t) {
			be(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Q(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function be(e, t, n) {
	return (t = xe(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function xe(e) {
	var t = Se(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Se(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var $ = ye({
	accessibilityLayer: !0,
	stackOffset: "none",
	barCategoryGap: "10%",
	barGap: 4,
	margin: {
		top: 5,
		right: 5,
		bottom: 5,
		left: 5
	},
	reverseStackOrder: !1,
	syncMethod: "index",
	layout: "radial",
	responsive: !1,
	cx: "50%",
	cy: "50%",
	innerRadius: 0,
	outerRadius: "80%"
}, x), Ce = /*#__PURE__*/ (0, X.forwardRef)(function(o, s) {
	var c = T(o.categoricalChartProps, $), l = c.layout, u = _e(c, ge), d = o.chartName, f = {
		chartName: d,
		defaultTooltipEventType: o.defaultTooltipEventType,
		validateTooltipEventTypes: o.validateTooltipEventTypes,
		tooltipPayloadSearcher: o.tooltipPayloadSearcher,
		eventEmitter: void 0
	};
	return /*#__PURE__*/ X.createElement(n, {
		preloadedState: { options: f },
		reduxStoreName: c.id ?? d
	}, /*#__PURE__*/ X.createElement(t, { chartData: c.data }), /*#__PURE__*/ X.createElement(a, {
		layout: l,
		margin: c.margin
	}), /*#__PURE__*/ X.createElement(i, {
		throttleDelay: c.throttleDelay,
		throttledEvents: c.throttledEvents
	}), /*#__PURE__*/ X.createElement(r, {
		baseValue: void 0,
		accessibilityLayer: c.accessibilityLayer,
		barCategoryGap: c.barCategoryGap,
		maxBarSize: c.maxBarSize,
		stackOffset: c.stackOffset,
		barGap: c.barGap,
		barSize: c.barSize,
		syncId: c.syncId,
		syncMethod: c.syncMethod,
		className: c.className,
		reverseStackOrder: c.reverseStackOrder
	}), /*#__PURE__*/ X.createElement(he, {
		cx: c.cx,
		cy: c.cy,
		startAngle: c.startAngle,
		endAngle: c.endAngle,
		innerRadius: c.innerRadius,
		outerRadius: c.outerRadius
	}), /*#__PURE__*/ X.createElement(e, Z({}, u, { ref: s })));
});
export { Ce as PolarChart, $ as defaultPolarChartProps, W as selectPolarAppliedValues, me as selectPolarAxisCheckedDomain, Y as selectPolarNiceTicks, q as selectPolarStackGroups, z as selectUnfilteredPolarItems };

//# debugId=96296f43-9e1c-4f77-9538-7f1bb20ea288
(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "401a8dee-a6a3-4b65-94e3-6b97878fac3d", e._sentryDebugIdIdentifier = "sentry-dbid-401a8dee-a6a3-4b65-94e3-6b97878fac3d");
	} catch {}
})();
import { $2ec61d1d4f780267$export$a8a3e93435678ff9 as e, $43a3b93638fe5db9$export$b04be29aa201d4f5 as t, $49319ee1285aa241$export$2ce376c2cc3355c8 as n, $49319ee1285aa241$export$4b1545b4f2016d26 as r, $49319ee1285aa241$export$d9b273488cd8ce6f as i, $53e61d82d8b8611d$export$8b251419efc915eb as a, $542a13ca2fa5b484$export$5b6b19405a83ff9d as o, $806e559d0c2c64a0$export$105594979f116971 as s, $806e559d0c2c64a0$export$2c1b491743890dec as c, $806e559d0c2c64a0$export$472062a354075cee as l, $e28ab3efe3e87743$export$1ff3c3f08ae963c0 as u, $fe21c36db05242bb$export$a98f0dcb43a68a25 as d, $fe21c36db05242bb$export$d7b12c4107be0d61 as f, ACCOUNT_DASHBOARDS as p, AIProviderLabel as m, AIProviderLogo as h, AI_ASSET_TASKS as g, AI_CONNECTIONS_KEY as _, AI_CONNECTIONS_URL as v, ApiError as y, Button as b, ButtonLink as x, CUSTOM_TASKS_URL as S, CUSTOM_TASK_EDITOR_URL as C, Checkbox as w, ColumnFilterAvatar as ee, DUPLICATES_KEY as T, DUPLICATES_URL as E, DURATION_TAGS as D, Disclosure as O, ES as te, Ea as k, EffortFlow as A, ErrorText as j, ExternalLink as ne, HN as M, Help as N, IconButton as P, Input as re, InputBase as ie, ItemEditDialog as ae, JZ as F, K1 as I, LibraryAIPanel as L, LibraryLabel as R, LinkButton as oe, M6 as se, MEDIA_SOURCE_ICONS as ce, MENU_ITEM as le, MENU_ITEMS_CONTAINER as z, MENU_ITEM_INTERACTIVE as B, MENU_POPOVER_SURFACE as ue, MENU_POPOVER_WIDTH as de, MenuChevron as fe, MenuDialog as pe, ModalFrame as me, Note as he, Ov as ge, P7 as _e, Pf as ve, R5 as ye, RB as be, RadioDot as V, Rt as H, Select$1 as xe, SelectItem as Se, SourceMark as U, TableDateBound as Ce, Textarea as we, UB as Te, Xt as Ee, Yt as De, __toESM as Oe, aiConnectionLabel as ke, aiModelLabel as Ae, aiSearchModelsKey as je, apiGet as Me, apiSend as Ne, appSettingsStore as Pe, applySavedItem as Fe, b1 as Ie, busyProps as Le, cardClass as Re, composingKey as W, coverUrl as ze, cx as G, detailPosterUrl as Be, e0 as Ve, entityDisplayName as He, errorMessage as Ue, fetchItem as K, h2 as We, hN as Ge, iE as Ke, interfaceLanguage as qe, itemKey as Je, l5 as Ye, mM as Xe, matchesAIModel as Ze, modelIsVisible as Qe, motion as $e, o2 as et, onLibraries as tt, outsideTableDateBound as nt, p as rt, preferredAIConnection as it, publishedLibraries as at, remoteCoverUrl as ot, require_jsx_runtime as st, require_react as ct, s7 as lt, t as q, tagLabel as ut, uo as dt, useAIConnectionModels as ft, useAIModelVisibility as pt, useAccountUsage as mt, useAction as ht, useCustomTasks as gt, useEntityNames as _t, useOverlayScrollbar as vt, useQuery as yt, useQueryClient as bt, useReducedMotion as xt, validRange as St, visibleAIModels as Ct, writeColumnFilters as wt } from "./peach-app.js";
// src/react/boardui/components/foundations/template-copy/template-copy.tsx
var J = /* @__PURE__ */ Oe(ct(), 1), Y = st(), Tt = (0, J.createContext)(null);
(0, J.createContext)(null);
var Et = /* @__PURE__ */ new Set([
	"children",
	"title",
	"subtitle",
	"description",
	"label",
	"textValue",
	"placeholder",
	"alt",
	"aria-label",
	"aria-description",
	"metricLabel",
	"emptyMessage",
	"caption",
	"heading",
	"text",
	"content",
	"renderValue"
]), Dt = /* @__PURE__ */ new Set([
	"items",
	"options",
	"tabs",
	"columns",
	"series",
	"ranges",
	"stats",
	"data",
	"nodes",
	"bar",
	"line"
]), Ot = /* @__PURE__ */ new Set([
	"label",
	"title",
	"description",
	"subtitle",
	"header",
	"role",
	"joined"
]), kt = /* @__PURE__ */ new Set([
	"children",
	"cell",
	"header",
	"formatter",
	"tickFormatter",
	"labelFormatter",
	"renderItem",
	"node",
	"link",
	"tick",
	"label",
	"content",
	"renderValue"
]);
function At(e, t) {
	function n(e, r = !1) {
		if (typeof e == "string") return r ? e : t(e);
		if (Array.isArray(e)) {
			let t = e.map((e) => n(e, r));
			return t.every((t, n) => t === e[n]) ? e : t;
		}
		if ((0, J.isValidElement)(e)) {
			if (typeof e.type == "string" && [
				"pre",
				"code",
				"kbd",
				"script",
				"style"
			].includes(e.type)) return e;
			let t = {};
			for (let [r, i] of Object.entries(e.props)) Et.has(r) ? t[r] = kt.has(r) && typeof i == "function" ? (...e) => n(i(...e)) : n(i) : Dt.has(r) ? t[r] = n(i, !0) : kt.has(r) && typeof i == "function" && (t[r] = (...e) => n(i(...e)));
			return Object.entries(t).some(([t, n]) => n !== e.props[t]) ? (0, J.cloneElement)(e, t) : e;
		}
		if (r && e && typeof e == "object" && Object.getPrototypeOf(e) === Object.prototype) {
			let t = { ...e };
			for (let [e, r] of Object.entries(t)) kt.has(e) && typeof r == "function" ? t[e] = (...e) => n(r(...e)) : Ot.has(e) ? t[e] = n(r) : r && typeof r == "object" && (t[e] = n(r, !0));
			return Object.entries(t).some(([t, n]) => n !== e[t]) ? t : e;
		}
		return e;
	}
	return n(e);
}
function jt() {
	let e = (0, J.useContext)(Tt);
	return (0, J.useMemo)(() => (t) => e?.render ? e.render(t) : e ? At(t, e.translate) : t, [e]);
}
// src/react/boardui/components/application/composer-loader/composer-loader.tsx
var Mt = [
	"#5eead4",
	"#46baec",
	"#e633a4",
	"#00faa7"
];
function Nt(e) {
	return [
		parseInt(e.slice(1, 3), 16),
		parseInt(e.slice(3, 5), 16),
		parseInt(e.slice(5, 7), 16)
	];
}
function Pt({ children: e, active: t = !0, colors: n = Mt, speed: r = 4.5, intensity: i = .7, bloom: a = 16, bloomStrength: o = .3, arc: s = 120, reverse: c = !1, radius: l, line: u = 2.5, bloomOnly: d = !1, surface: f = !0, taper: p = 0, blend: m, offset: h = 0, className: g }) {
	let _ = jt(), v = `bui-cl-${(0, J.useId)().replace(/[^a-zA-Z0-9]/g, "")}`, y = (0, J.useRef)(null), [b, x] = (0, J.useState)({
		w: 640,
		h: 52
	});
	(0, J.useEffect)(() => {
		let e = y.current;
		if (!e) return;
		let t = new ResizeObserver(() => x({
			w: Math.max(1, e.clientWidth),
			h: Math.max(1, e.clientHeight)
		}));
		return t.observe(e), () => t.disconnect();
	}, []);
	let [S, C, w, ee] = n, T = `rgb(${Nt(C).map((e, t) => Math.round((e + Nt(w)[t]) / 2)).join(",")})`, E = s / 360 * 100, D = l ?? b.h / 2, O = l ?? 9999, te = c ? "reverse" : "normal", k = Math.min(D, b.w / 2, b.h / 2), A = Math.max(1, 2 * (b.w + b.h) - 8 * k + 2 * Math.PI * k), j = (e) => e * 100 / A, ne = (e, t) => (c ? j(t) : e - E + j(t)) - h * 100, M = p > 0 ? Math.max(.5, u * .8) : .5, N = (e, t, n, i, a) => {
		let o = p > 0 ? 14 : 1;
		return Array.from({ length: o }, (s, c) => {
			let l = i * (1 - p * c / o), u = ne(i, a) - (i - l) / 2;
			return /* @__PURE__ */ (0, Y.jsx)("rect", {
				x: 0,
				y: 0,
				width: b.w,
				height: b.h,
				rx: D,
				pathLength: 100,
				fill: "none",
				stroke: `url(#${v})`,
				strokeWidth: e,
				strokeLinecap: "round",
				strokeDasharray: `${l} ${100 - l}`,
				className: "bui-composer-loader-rect",
				filter: t > 0 ? `url(#${v}-b${String(t).replace(".", "_")})` : void 0,
				style: {
					opacity: n / o,
					animation: `bui-composer-loader-dash ${r}s linear ${u * r / 100}s infinite ${te}`
				}
			}, c);
		});
	};
	return _(/* @__PURE__ */ (0, Y.jsxs)("div", {
		className: G("relative", g),
		children: [
			f && /* @__PURE__ */ (0, Y.jsx)("span", {
				"aria-hidden": !0,
				className: "absolute inset-0 bg-background-primary-default shadow-xs",
				style: { borderRadius: O }
			}),
			/* @__PURE__ */ (0, Y.jsx)("span", {
				ref: y,
				"aria-hidden": !0,
				className: "pointer-events-none absolute inset-0 overflow-hidden",
				style: {
					borderRadius: O,
					opacity: +!!t,
					transition: "opacity 450ms ease",
					mixBlendMode: m
				},
				children: /* @__PURE__ */ (0, Y.jsxs)("svg", {
					width: "100%",
					height: "100%",
					viewBox: `0 0 ${b.w} ${b.h}`,
					preserveAspectRatio: "none",
					style: { opacity: i },
					children: [
						/* @__PURE__ */ (0, Y.jsxs)("defs", { children: [/* @__PURE__ */ (0, Y.jsxs)("linearGradient", {
							id: v,
							x1: "0",
							y1: "0",
							x2: "1",
							y2: "0",
							children: [
								/* @__PURE__ */ (0, Y.jsx)("stop", {
									offset: "0%",
									stopColor: S
								}),
								/* @__PURE__ */ (0, Y.jsx)("stop", {
									offset: "30%",
									stopColor: C
								}),
								/* @__PURE__ */ (0, Y.jsx)("stop", {
									offset: "50%",
									stopColor: T
								}),
								/* @__PURE__ */ (0, Y.jsx)("stop", {
									offset: "70%",
									stopColor: w
								}),
								/* @__PURE__ */ (0, Y.jsx)("stop", {
									offset: "100%",
									stopColor: ee
								})
							]
						}), [
							14,
							6,
							M
						].map((e) => /* @__PURE__ */ (0, Y.jsx)("filter", {
							id: `${v}-b${String(e).replace(".", "_")}`,
							x: "-50%",
							y: "-50%",
							width: "200%",
							height: "200%",
							children: /* @__PURE__ */ (0, Y.jsx)("feGaussianBlur", { stdDeviation: e })
						}, e))] }),
						a > 0 && N(a * 2, 14, o, E * .9, a + 16),
						!d && N(u * 3.2, 6, .8, E * .95, 10),
						!d && N(u, M, 1, E, 0)
					]
				})
			}),
			/* @__PURE__ */ (0, Y.jsx)("div", {
				className: "relative",
				children: e
			})
		]
	}));
}
// src/react/search/assistant-mascot.tsx
var Ft = "(prefers-reduced-motion: reduce)", It = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", X = "cubic-bezier(.23, 1, .32, 1)", Z = "cubic-bezier(.77, 0, .175, 1)", Q = "translate(0, 0) rotate(0deg) scale(1)", Lt = [
	{
		transform: Q,
		easing: X
	},
	{
		transform: "translateY(-8px) scale(.96, 1.07)",
		offset: .42,
		easing: Z
	},
	{
		transform: "translateY(2px) scale(1.07, .94)",
		offset: .76,
		easing: X
	},
	{ transform: Q }
], Rt = [
	{
		transform: Q,
		easing: X
	},
	{
		transform: "translate(6px, -2px) rotate(27deg) scale(1.06, .96)",
		offset: .32
	},
	{
		transform: "translate(6px, -2px) rotate(27deg) scale(1.06, .96)",
		offset: .63,
		easing: Z
	},
	{
		transform: "translateX(-2px) rotate(-6deg)",
		offset: .86,
		easing: X
	},
	{ transform: Q }
], zt = [
	{
		id: "peach-mascot-roll",
		duration: 640,
		frames: [
			{
				transform: Q,
				easing: X
			},
			{
				transform: "translate(-8px, 3px) rotate(-18deg) scale(1.11, .86)",
				offset: .18,
				easing: Z
			},
			{
				transform: "translate(14px, -8px) rotate(170deg) scale(.94, 1.04)",
				offset: .55,
				easing: Z
			},
			{
				transform: "translate(0, 3px) rotate(360deg) scale(1.12, .86)",
				offset: .82,
				easing: X
			},
			{ transform: "translate(0, 0) rotate(360deg) scale(1)" }
		]
	},
	{
		id: "peach-mascot-hop",
		duration: 540,
		frames: [
			{
				transform: Q,
				easing: X
			},
			{
				transform: "translateY(4px) scale(1.12, .84)",
				offset: .18,
				easing: X
			},
			{
				transform: "translateY(-17px) scale(.9, 1.13)",
				offset: .43,
				easing: Z
			},
			{
				transform: "translateY(3px) scale(1.12, .85)",
				offset: .71,
				easing: X
			},
			{
				transform: "translateY(-3px) scale(.98, 1.04)",
				offset: .86,
				easing: X
			},
			{ transform: Q }
		]
	},
	{
		id: "peach-mascot-wobble",
		duration: 570,
		frames: [
			{
				transform: Q,
				easing: X
			},
			{
				transform: "translateX(-7px) rotate(-21deg)",
				offset: .24,
				easing: Z
			},
			{
				transform: "translateX(6px) rotate(17deg)",
				offset: .51,
				easing: Z
			},
			{
				transform: "translateX(-3px) rotate(-8deg)",
				offset: .74,
				easing: X
			},
			{ transform: Q }
		]
	},
	{
		id: "peach-mascot-squish",
		duration: 450,
		frames: [
			{
				transform: Q,
				easing: X
			},
			{
				transform: "translateY(7px) scale(1.23, .72)",
				offset: .28,
				easing: X
			},
			{
				transform: "translateY(-4px) scale(.91, 1.13)",
				offset: .58,
				easing: X
			},
			{
				transform: "translateY(1px) scale(1.04, .97)",
				offset: .8,
				easing: X
			},
			{ transform: Q }
		]
	}
];
function Bt({ label: e }) {
	let t = (0, J.useRef)(null), n = (0, J.useRef)(null), r = (0, J.useRef)(null), i = (0, J.useRef)(null), a = (0, J.useRef)(null), o = (0, J.useRef)(null), s = (0, J.useRef)(null), c = (0, J.useRef)(0), l = (0, J.useRef)(-1e400), u = (0, J.useId)();
	(0, J.useEffect)(() => {
		let e = t.current, i = n.current, u = r.current, d = a.current;
		if (!e || !i || !u || !d) return;
		let f = matchMedia(It), p = matchMedia(Ft), m = 0, h = 0, g = 0, _ = () => {
			cancelAnimationFrame(m), m = 0, u.style.translate = "";
		}, v = (t) => {
			t.pointerType !== "touch" && f.matches && (l.current = performance.now(), h = t.clientX, g = t.clientY, m ||= requestAnimationFrame(() => {
				m = 0;
				let { left: t, top: n, width: r, height: i } = e.getBoundingClientRect(), a = h - t - r / 2, o = g - n - i / 2, s = Math.max(110, Math.hypot(a, o));
				u.style.translate = `${4.8 * a / s}px ${3.8 * o / s}px`;
			}));
		}, y = () => {
			o.current?.cancel(), s.current?.cancel(), d.getAnimations().forEach((e) => e.cancel());
		}, b = (e, t, n) => {
			p.matches || document.hidden || o.current?.playState === "running" || (s.current = i.animate(e, {
				id: t,
				duration: n,
				easing: Z
			}));
		}, x = window.setTimeout(() => {
			c.current === 0 && b(Lt, "peach-mascot-greeting", 850);
		}, 550), S = window.setInterval(() => {
			performance.now() - l.current >= 3500 && b(Rt, "peach-mascot-idle", 1350);
		}, 11e3);
		return document.addEventListener("pointermove", v, { passive: !0 }), document.documentElement.addEventListener("pointerleave", _), window.addEventListener("blur", _), f.addEventListener("change", _), p.addEventListener("change", y), () => {
			_(), y(), clearTimeout(x), clearInterval(S), document.removeEventListener("pointermove", v), document.documentElement.removeEventListener("pointerleave", _), window.removeEventListener("blur", _), f.removeEventListener("change", _), p.removeEventListener("change", y);
		};
	}, []);
	function d() {
		l.current = performance.now();
		let e = n.current;
		if (!e || !i.current || o.current?.playState === "running") return;
		if (matchMedia(Ft).matches) {
			o.current = i.current.animate([
				{ opacity: 1 },
				{ opacity: .25 },
				{ opacity: 1 }
			], 140);
			return;
		}
		let { id: t, duration: r, frames: u } = zt[c.current];
		c.current = (c.current + 1) % zt.length;
		let d = getComputedStyle(e).transform;
		s.current?.cancel(), o.current = e.animate([{
			...u[0],
			transform: d
		}, ...u.slice(1)], {
			id: t,
			duration: r
		}), t === "peach-mascot-hop" && a.current?.animate([
			{
				opacity: 0,
				transform: "scale(.9)"
			},
			{
				opacity: .65,
				transform: "scale(1)",
				offset: .26
			},
			{
				opacity: 0,
				transform: "scale(1.55)"
			}
		], {
			delay: 130,
			duration: 390,
			easing: X
		});
	}
	return /* @__PURE__ */ (0, Y.jsxs)("button", {
		ref: t,
		type: "button",
		"data-ai-assistant-mascot": "",
		"aria-label": e,
		"data-copy-interact": "",
		onClick: d,
		children: [/* @__PURE__ */ (0, Y.jsx)("svg", {
			"data-ai-assistant-mascot-ripple": "",
			viewBox: "0 0 64 64",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, Y.jsx)("circle", {
				ref: a,
				cx: "32",
				cy: "34",
				r: "25"
			})
		}), /* @__PURE__ */ (0, Y.jsxs)("svg", {
			ref: n,
			"data-ai-assistant-mascot-body": "",
			viewBox: "0 0 64 64",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, Y.jsx)("defs", { children: /* @__PURE__ */ (0, Y.jsxs)("radialGradient", {
					id: u,
					cx: "34%",
					cy: "22%",
					r: "77%",
					children: [/* @__PURE__ */ (0, Y.jsx)("stop", { "data-ai-assistant-mascot-light": "" }), /* @__PURE__ */ (0, Y.jsx)("stop", {
						"data-ai-assistant-mascot-shade": "",
						offset: "100%"
					})]
				}) }),
				/* @__PURE__ */ (0, Y.jsx)("circle", {
					"data-ai-assistant-mascot-shell": "",
					cx: "32",
					cy: "32",
					r: "25",
					fill: `url(#${u})`
				}),
				/* @__PURE__ */ (0, Y.jsx)("g", {
					ref: r,
					"data-ai-assistant-mascot-gaze": "",
					children: /* @__PURE__ */ (0, Y.jsx)("g", {
						ref: i,
						"data-ai-assistant-mascot-lids": "",
						children: /* @__PURE__ */ (0, Y.jsx)("path", { d: "M24 29v6m16-6v6" })
					})
				})
			]
		})]
	});
}
// src/react/search/assistant-results.tsx
function Vt(e) {
	let t = /* @__PURE__ */ new Set();
	return e.filter((e) => {
		let n = e.is_jav && e.code?.trim().toUpperCase(), r = n ? "release:" + n : e.edition_group?.key ? "edition:" + e.edition_group.key : e.part_group?.key ? "part:" + e.part_group.key : "asset:" + e.id;
		return !t.has(r) && (t.add(r), !0);
	});
}
function Ht({ items: e, error: t }) {
	return {
		error: t,
		items: e.map((e) => ({
			id: e.id,
			code: e.code,
			display_code: e.display_code,
			title: e.display_title || e.title || e.catalog_title || e.original_title || e.name,
			studio: e.studio,
			release_date: e.release_date,
			tags: e.tags?.slice(0, 5),
			performer_refs: Ut(e).slice(0, 3).map((e) => ({
				id: e.id,
				name: e.name,
				has_image: e.has_image,
				image_version: e.image_version,
				has_avatar: e.has_avatar,
				rep: e.rep,
				avatar_focus: e.avatar_focus
			})),
			performer_total: e.performer_total ?? Ut(e).length,
			has_cover: e.has_cover,
			cover_key: e.cover_key,
			cover_version: e.cover_version,
			has_local_poster: e.has_local_poster,
			has_thumb: e.has_thumb
		}))
	};
}
function Ut(e) {
	let t = e.performer_entities?.length ? e.performer_entities : e.performer_refs;
	if (t?.length) return t;
	let n = Array.isArray(e.performers) ? e.performers : (e.performers || "").split(/[,，、;/]/);
	return [...new Set(n.map((e) => e.trim()).filter(Boolean))].map((e) => ({ name: e }));
}
var Wt = (e) => e.display_title || e.title || e.catalog_title || e.original_title || e.name || e.display_code || e.code || "";
function Gt(e, t, n) {
	return e.demoCover || (e.has_cover ? ze(e, 2) : t === "library" && e.id && (e.has_local_poster || e.has_thumb) ? Be({
		...e,
		id: e.id
	}, void 0) : !n && t === "external" && (e.has_remote_cover || e.cover_url) ? ot(e) : "");
}
function Kt({ item: e }) {
	let t = Gt(e, "library", !0), n = Ut(e).slice(0, 2);
	return /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [/* @__PURE__ */ (0, Y.jsxs)("span", {
		className: "relative inline-grid aspect-4/3 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-background-tertiary-default text-foreground-icon-tertiary",
		children: [/* @__PURE__ */ (0, Y.jsx)(k, {
			className: "size-4",
			"aria-hidden": !0
		}), t ? /* @__PURE__ */ (0, Y.jsx)("img", {
			src: t,
			alt: "",
			className: "absolute inset-0 size-full object-cover",
			onError: (e) => {
				e.currentTarget.hidden = !0;
			}
		}) : null]
	}), /* @__PURE__ */ (0, Y.jsxs)("span", {
		className: "flex min-w-0 flex-1 flex-col gap-1",
		children: [/* @__PURE__ */ (0, Y.jsxs)("span", {
			className: "truncate",
			children: [/* @__PURE__ */ (0, Y.jsx)("span", {
				className: "mr-1.5",
				children: e.display_code || e.code
			}), Wt(e)]
		}), n.length ? /* @__PURE__ */ (0, Y.jsx)("span", {
			className: "flex min-w-0 gap-2 text-caption-1-regular text-text-secondary",
			children: n.map((e) => /* @__PURE__ */ (0, Y.jsxs)("span", {
				className: "flex min-w-0 items-center gap-1",
				children: [/* @__PURE__ */ (0, Y.jsx)(ee, { person: e }), /* @__PURE__ */ (0, Y.jsx)("span", {
					className: "truncate",
					children: He("performer", e.name, e.id)
				})]
			}, e.id || e.name))
		}) : null]
	})] });
}
function qt({ item: e, source: t, localOnly: n, actions: r }) {
	let i = e.display_code || e.code, a = Wt(e), o = e.demoSource ?? (t === "library" ? "/assets/" + e.id : "/works/" + encodeURIComponent(e.code || "")), s = Gt(e, t, n), c = Ut(e), l = c.slice(0, 3), u = Math.max(c.length, e.performer_total || 0) - l.length;
	return /* @__PURE__ */ (0, Y.jsxs)("article", {
		"data-ai-search-work": "",
		className: Re({
			variant: "outlined",
			radius: "plain",
			padding: "none"
		}),
		children: [/* @__PURE__ */ (0, Y.jsxs)("a", {
			href: o,
			"aria-label": a,
			target: e.demoSource ? "_blank" : void 0,
			rel: e.demoSource ? "noreferrer" : void 0,
			"data-work-card-link": "",
			className: "group flex min-w-0 items-start gap-3 rounded-2xl p-3 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring sm:gap-4",
			children: [/* @__PURE__ */ (0, Y.jsxs)("span", {
				className: G("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-lg bg-background-tertiary-default text-foreground-icon-tertiary", e.demoCover ? "aspect-3/4 w-14 sm:w-20" : "aspect-4/3 w-20 sm:w-28"),
				children: [/* @__PURE__ */ (0, Y.jsx)(k, {
					"aria-hidden": "true",
					className: "size-5"
				}), s ? /* @__PURE__ */ (0, Y.jsx)("img", {
					src: s,
					loading: n ? "eager" : "lazy",
					decoding: "async",
					alt: q("catalog:libraryAssistant.cover", { title: a }),
					className: "absolute inset-0 size-full object-cover",
					onError: (e) => {
						e.currentTarget.hidden = !0;
					}
				}) : null]
			}), /* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "flex min-w-0 flex-1 flex-col gap-1.5",
				children: [
					/* @__PURE__ */ (0, Y.jsxs)("div", {
						className: "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption-1-medium text-text-secondary",
						children: [
							i ? /* @__PURE__ */ (0, Y.jsx)("span", { children: i }) : null,
							e.release_date ? /* @__PURE__ */ (0, Y.jsx)("time", {
								dateTime: e.release_date,
								children: e.release_date
							}) : null,
							e.studio ? /* @__PURE__ */ (0, Y.jsx)("span", {
								className: "max-w-full truncate",
								children: e.studio
							}) : null
						]
					}),
					/* @__PURE__ */ (0, Y.jsxs)("span", {
						className: "flex min-w-0 items-start gap-2 text-body-medium text-text-primary",
						children: [/* @__PURE__ */ (0, Y.jsx)("span", {
							"data-ai-search-work-title": "",
							className: "line-clamp-2 flex-1 wrap-anywhere group-hover:underline group-focus-visible:underline",
							title: a,
							children: a
						}), /* @__PURE__ */ (0, Y.jsx)(et, {
							"aria-hidden": "true",
							className: "mt-0.5 size-4 shrink-0 text-foreground-icon-secondary"
						})]
					}),
					l.length ? /* @__PURE__ */ (0, Y.jsxs)("ul", {
						className: "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1",
						children: [l.map((t) => /* @__PURE__ */ (0, Y.jsxs)("li", {
							"data-ai-search-person": "",
							className: "flex min-w-0 items-center gap-1.5 text-caption-1-medium text-text-secondary",
							children: [/* @__PURE__ */ (0, Y.jsx)(ee, { person: {
								...t,
								source_avatar: !n && t.source_avatar,
								avatar_code: e.code
							} }), /* @__PURE__ */ (0, Y.jsx)("span", {
								className: "min-w-0 truncate",
								children: He("performer", t.name, t.id)
							})]
						}, t.id || t.name)), u > 0 ? /* @__PURE__ */ (0, Y.jsxs)("li", {
							className: "text-caption-1-regular text-text-secondary",
							children: ["+", u]
						}) : null]
					}) : null,
					e.tags?.length ? /* @__PURE__ */ (0, Y.jsx)("ul", {
						className: "flex min-w-0 flex-wrap gap-1",
						"data-ai-search-tags": "",
						children: e.tags.slice(0, 5).map((e) => /* @__PURE__ */ (0, Y.jsx)("li", {
							className: "max-w-full rounded-md px-1.5 py-0.5 text-caption-1-regular text-text-primary wrap-anywhere",
							children: e
						}, e))
					}) : null
				]
			})]
		}), r ? /* @__PURE__ */ (0, Y.jsx)("div", {
			className: "flex min-w-0 justify-end px-2.5 pb-2.5 sm:px-3 sm:pb-3",
			children: r
		}) : null]
	});
}
function Jt({ result: e, source: t, localOnly: n = !1, historical: r = !1, actions: i, title: a }) {
	_t();
	let o = a ?? $(n && t === "external" ? "cachedExternal" : "scopes." + t);
	return /* @__PURE__ */ (0, Y.jsxs)("section", {
		"aria-label": o,
		"data-ai-search-source": r ? void 0 : t,
		className: "flex min-w-0 flex-col gap-2.5",
		"data-ai-search-reveal": "",
		children: [/* @__PURE__ */ (0, Y.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, Y.jsx)("h2", {
				className: "text-body-medium! text-text-primary",
				children: o
			}), e.items.length ? /* @__PURE__ */ (0, Y.jsx)("span", {
				className: "text-caption-1-regular text-text-secondary",
				children: q("catalog:libraryAssistant.resultCount", { count: e.items.length })
			}) : null]
		}), e.error ? /* @__PURE__ */ (0, Y.jsx)(j, { children: e.error }) : e.items.length ? /* @__PURE__ */ (0, Y.jsx)("ul", {
			className: "flex min-w-0 flex-col gap-2.5",
			children: e.items.map((e, r) => /* @__PURE__ */ (0, Y.jsx)("li", {
				"data-ai-search-reveal": "",
				"data-ai-search-reveal-order": r === 1 ? "second" : r === 2 ? "third" : void 0,
				children: /* @__PURE__ */ (0, Y.jsx)(qt, {
					item: e,
					source: t,
					localOnly: n,
					actions: i?.(e)
				})
			}, e.id ?? e.code))
		}) : /* @__PURE__ */ (0, Y.jsx)(N, { children: $(n && t === "external" ? "cachedExternalEmpty" : "empty") })]
	});
}
function Yt({ source: e }) {
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		"aria-hidden": "true",
		"data-ai-search-results-loading": e,
		"data-ai-search-source": e,
		"data-ai-search-reveal": "",
		className: Re({
			variant: "outlined",
			radius: "plain",
			padding: "none",
			className: "flex items-start gap-3 p-3"
		}),
		children: [/* @__PURE__ */ (0, Y.jsx)("span", { className: "skeleton-sheen aspect-4/3 w-20 shrink-0 rounded-lg sm:w-28" }), /* @__PURE__ */ (0, Y.jsxs)("div", {
			className: "flex min-w-0 flex-1 flex-col gap-2",
			children: [
				/* @__PURE__ */ (0, Y.jsx)("span", { className: "skeleton-sheen h-3 w-16 rounded-md" }),
				/* @__PURE__ */ (0, Y.jsx)("span", { className: "skeleton-sheen h-5 w-3/4 rounded-md" }),
				/* @__PURE__ */ (0, Y.jsx)("span", { className: "skeleton-sheen h-4 w-2/5 rounded-md" })
			]
		})]
	});
}
// src/react/search/assistant-suggest.tsx
function Xt({ value: e, onChange: t, label: n, placeholder: r, kind: i, composer: a, disabled: o, workLibrary: s, onWorkPick: c, suggestions: l = !0 }) {
	let u = (0, J.useId)(), d = vt(), [f, p] = (0, J.useState)(!1), [m, h] = (0, J.useState)(!1), [g, _] = (0, J.useState)(null), [v, y] = (0, J.useState)(""), [b, x] = (0, J.useState)(!1), S = (i === "tag" ? e.split(",").at(-1) ?? "" : e).trim();
	(0, J.useEffect)(() => {
		let e = window.setTimeout(() => y(S), 160);
		return () => window.clearTimeout(e);
	}, [S]);
	let C = l && f && !o && !m && !b && !!S && S === v, w = s !== void 0, T = yt({
		queryKey: [
			"assistant-suggest",
			i,
			v
		],
		queryFn: ({ signal: e }) => Me("/api/suggest?" + new URLSearchParams({
			q: v,
			limit: "8",
			...i ? { kind: i === "work" ? "asset" : i } : {}
		}), e),
		enabled: C && !w,
		staleTime: 3e4
	}), E = yt({
		queryKey: [
			"assistant-work-suggest",
			s,
			v
		],
		queryFn: ({ signal: e }) => Me("/api/items?" + new URLSearchParams({
			q: v,
			sort: "new",
			limit: "24",
			count: "0",
			...s ? { library: s } : {}
		}), e),
		enabled: C && w,
		staleTime: 3e4
	}), D = (T.data?.groups ?? []).flatMap((e) => e.items.map((t) => ({
		kind: e.kind,
		item: t
	}))).slice(0, 8), O = Vt(E.data?.items ?? []).slice(0, 6), te = w ? O.length : D.length, k = C && te > 0, A = (n) => {
		let r = O[n], a = w ? r?.code || r && Wt(r) : D[n]?.item.value;
		a !== void 0 && t((i === "tag" ? e.slice(0, e.lastIndexOf(",") + 1) : "") + a), w && r && c?.(r), _(null), x(!0);
	}, j = (e) => {
		if (m || W(e.nativeEvent)) e.key === "Enter" && e.preventDefault();
		else if (k && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
			e.preventDefault();
			let t = e.key === "ArrowUp" ? -1 : 1, n = ((g ?? (t < 0 ? 0 : -1)) + t + te) % te;
			_(n), document.getElementById(u + "-" + n)?.scrollIntoView({ block: "nearest" });
		} else k && g !== null && e.key === "Enter" ? (e.preventDefault(), A(g)) : k && e.key === "Escape" && (e.preventDefault(), e.stopPropagation(), x(!0), _(null));
	}, ne = a ? "input" : ie;
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		"data-ai-search-suggest": "",
		"data-ai-search-suggest-composer": a || void 0,
		className: G(w && "relative"),
		children: [/* @__PURE__ */ (0, Y.jsx)(ne, {
			type: "text",
			...l && {
				role: "combobox",
				"aria-autocomplete": "list",
				"aria-expanded": k,
				"aria-controls": k ? u : void 0,
				"aria-activedescendant": k && g !== null ? u + "-" + g : void 0
			},
			"aria-label": n,
			placeholder: r,
			"data-ai-search-input": a ? "" : void 0,
			...a ? {
				"data-ai-search-suggest-input": "",
				className: "text-body-regular text-text-primary"
			} : { fieldClassName: w ? "h-9" : void 0 },
			value: e,
			readOnly: o,
			autoComplete: "off",
			maxLength: a ? 500 : i === "tag" ? 180 : 100,
			onFocus: () => {
				p(!0), x(!1);
			},
			onBlur: () => {
				p(!1), _(null);
			},
			onCompositionStart: () => h(!0),
			onCompositionEnd: () => h(!1),
			onKeyDown: j,
			onChange: (e) => {
				t(e.currentTarget.value), _(null), x(!1);
			}
		}), k ? /* @__PURE__ */ (0, Y.jsx)("ul", {
			ref: d,
			id: u,
			role: "listbox",
			"aria-label": n,
			"data-ai-search-suggestions": "",
			className: G(w && "absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-dropdown"),
			children: w ? O.map((e, t) => /* @__PURE__ */ (0, Y.jsx)("li", {
				id: u + "-" + t,
				role: "option",
				"aria-selected": g === t,
				className: "flex min-w-0 cursor-pointer items-center gap-2 rounded-lg p-2 text-body-2-medium text-text-primary hover:bg-dropdown-item-hover-background aria-selected:bg-dropdown-item-hover-background",
				onMouseDown: (e) => e.preventDefault(),
				onClick: () => A(t),
				children: /* @__PURE__ */ (0, Y.jsx)(Kt, { item: e })
			}, e.id)) : D.map(({ kind: e, item: t }, n) => {
				let r = e === "performer" || e === "creator" || e === "studio" || e === "agency";
				return /* @__PURE__ */ (0, Y.jsxs)("li", {
					id: u + "-" + n,
					role: "option",
					"aria-selected": g === n,
					className: "flex min-w-0 cursor-pointer items-center gap-2 px-2 py-1.5 text-body-2-medium text-text-primary",
					onMouseDown: (e) => e.preventDefault(),
					onClick: () => A(n),
					children: [
						r ? /* @__PURE__ */ (0, Y.jsx)(ee, {
							kind: e,
							person: {
								name: t.value,
								id: t.entity_id,
								has_image: !!t.has_image,
								has_avatar: !!t.has_avatar,
								image_version: t.image_version,
								logo_version: t.logo_version,
								avatar_focus: t.avatar_focus,
								rep: t.rep
							},
							logo: t.has_logo ? t.value : void 0
						}) : null,
						/* @__PURE__ */ (0, Y.jsx)("span", {
							className: "min-w-0 flex-1 truncate",
							children: t.value
						}),
						t.matched && t.matched !== t.value ? /* @__PURE__ */ (0, Y.jsx)("span", {
							className: "truncate text-caption-1-regular text-text-secondary",
							children: t.matched
						}) : null
					]
				}, e + ":" + (t.id ?? t.entity_id ?? t.value));
			})
		}) : null]
	});
}
// src/react/search/assistant-workspace.tsx
var $ = (e) => q("catalog:libraryAssistant." + e);
function Zt({ focusKey: t, resultKey: n, active: r, compose: i, history: a, children: o, onBack: s }) {
	let c = vt(), l = vt(), u = (0, J.useRef)(null), d = (0, J.useRef)(null), [f, p] = (0, J.useState)(!1);
	return (0, J.useLayoutEffect)(() => {
		let e = u.current;
		if (!e) return;
		let t = () => {
			e.style.setProperty("--ai-workspace-top", `${Math.max(0, e.getBoundingClientRect().top + window.scrollY)}px`);
		};
		t(), window.addEventListener("resize", t);
		let n = new ResizeObserver(t);
		for (let e of document.querySelectorAll(".top, [data-network-banner]")) n.observe(e);
		return () => {
			window.removeEventListener("resize", t), n.disconnect();
		};
	}, []), (0, J.useEffect)(() => {
		if (!f || !u.current) return;
		let e = new ResizeObserver(() => {
			d.current?.getClientRects().length || p(!1);
		});
		return e.observe(u.current), () => e.disconnect();
	}, [f]), (0, J.useEffect)(() => {
		let e = c.current, t = e?.querySelector("[data-ai-search-current]");
		e && (e.scrollTop = t ? t.getBoundingClientRect().top - e.getBoundingClientRect().top + e.scrollTop - 12 : 0);
	}, [t, c]), (0, J.useEffect)(() => {
		let e = c.current, t = n.split(",").at(-1), r = t === "library" || t === "external" ? e?.querySelector(`[data-ai-search-source="${t}"]`) : null;
		n && e && r && (e.scrollTop += r.getBoundingClientRect().top - e.getBoundingClientRect().top - 12);
	}, [n, c]), /* @__PURE__ */ (0, Y.jsxs)("div", {
		ref: u,
		className: "@container w-full min-w-0",
		"data-ai-search-workspace": "",
		children: [/* @__PURE__ */ (0, Y.jsxs)("div", {
			"data-ai-search-layout": "",
			children: [/* @__PURE__ */ (0, Y.jsxs)("section", {
				"data-ai-search-pane": "",
				className: "rounded-3xl",
				children: [
					/* @__PURE__ */ (0, Y.jsxs)("header", {
						className: "flex min-h-14 min-w-0 shrink-0 items-center justify-between gap-3 px-4 py-2.5 sm:px-5",
						children: [/* @__PURE__ */ (0, Y.jsxs)("div", {
							className: "flex min-w-0 items-center gap-2",
							children: [s ? /* @__PURE__ */ (0, Y.jsx)(P, {
								icon: I,
								size: "small",
								"data-ai-button": "round",
								"aria-label": $("backToAssistant"),
								title: $("backToAssistant"),
								onClick: s
							}) : null, /* @__PURE__ */ (0, Y.jsx)("h1", {
								className: "text-headline-medium text-text-primary",
								"data-copy-key": "catalog.libraryAssistant.title",
								children: $("title")
							})]
						}), /* @__PURE__ */ (0, Y.jsx)(b, {
							ref: d,
							size: "small",
							variant: "secondary",
							iconOnly: !0,
							leadingIcon: te,
							"data-ai-button": "round",
							className: "@min-[52rem]:hidden",
							"aria-haspopup": "dialog",
							"aria-expanded": f,
							"aria-label": $("openHistory"),
							title: $("openHistory"),
							onClick: () => p(!0)
						})]
					}),
					/* @__PURE__ */ (0, Y.jsx)("div", {
						ref: c,
						"data-ai-search-scroll": "",
						"data-ai-search-transcript": "",
						children: /* @__PURE__ */ (0, Y.jsx)("div", {
							"data-ai-search-content": "",
							className: G("flex flex-col gap-4 py-4", !r && "min-h-full justify-center"),
							children: o
						})
					}),
					i ? /* @__PURE__ */ (0, Y.jsx)("div", {
						"data-ai-search-content": "",
						"data-ai-search-compose": "",
						children: i
					}) : null
				]
			}), /* @__PURE__ */ (0, Y.jsx)("aside", {
				ref: l,
				"aria-label": $("history"),
				"data-ai-search-rail": "",
				className: "rounded-3xl",
				children: a()
			})]
		}), /* @__PURE__ */ (0, Y.jsxs)(me, {
			width: "form",
			side: "right",
			isOpen: f,
			onOpenChange: p,
			fitVisualViewport: !0,
			children: [/* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "flex items-center justify-between gap-3 px-4 pt-4",
				children: [/* @__PURE__ */ (0, Y.jsx)(e, {
					slot: "title",
					className: "text-title-2-medium text-text-primary",
					children: $("history")
				}), /* @__PURE__ */ (0, Y.jsx)(b, {
					size: "small",
					variant: "ghost",
					iconOnly: !0,
					leadingIcon: _e,
					"aria-label": q("catalog:shared.close"),
					onClick: () => p(!1)
				})]
			}), /* @__PURE__ */ (0, Y.jsx)("div", {
				className: "min-w-0 p-4",
				children: a(() => p(!1))
			})]
		})]
	});
}
function Qt({ query: e, setQuery: t, busy: n, stop: r, submit: i, conditions: a, model: o, status: s, loading: c, canSubmit: l, fixedTask: u, demo: d = !1 }) {
	let f = $(u ? "steps.fixedTask" : "sendSearch");
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		className: "flex min-w-0 flex-col gap-1.5",
		children: [/* @__PURE__ */ (0, Y.jsx)("div", {
			"data-ai-search-composer-motion": c ? "active" : "idle",
			children: /* @__PURE__ */ (0, Y.jsx)(Pt, {
				active: c,
				children: /* @__PURE__ */ (0, Y.jsxs)("form", {
					"aria-busy": c,
					"data-ai-search-composer": "",
					className: "flex min-w-0 items-center gap-2 rounded-full border border-transparent focus-within:border-border-focus-ring",
					onSubmit: (e) => {
						e.preventDefault(), !n && !d && l && i();
					},
					children: [
						a,
						/* @__PURE__ */ (0, Y.jsx)(Xt, {
							label: $(u ? "fixedTaskInput" : "prompt"),
							placeholder: $(u ? "fixedTaskInput" : "prompt"),
							value: e,
							onChange: t,
							disabled: n || d,
							composer: !0,
							suggestions: !u
						}),
						o,
						n || c ? /* @__PURE__ */ (0, Y.jsx)(b, {
							type: "button",
							iconOnly: !0,
							variant: "secondary",
							leadingIcon: Ge,
							"data-ai-composer-send": "",
							"data-ai-composer-stop": "",
							className: "shrink-0",
							"aria-label": $("stop"),
							title: $("stop"),
							onClick: r
						}) : /* @__PURE__ */ (0, Y.jsx)(b, {
							type: "submit",
							iconOnly: !0,
							leadingIcon: We,
							"data-ai-composer-send": "",
							disabled: d || !l,
							className: "shrink-0",
							"aria-label": f,
							title: f
						})
					]
				})
			})
		}), /* @__PURE__ */ (0, Y.jsx)($t, { children: s })]
	});
}
function $t({ children: e }) {
	return /* @__PURE__ */ (0, Y.jsx)("footer", {
		className: "flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2",
		children: e
	});
}
function en() {
	return /* @__PURE__ */ (0, Y.jsx)(x, {
		href: "/settings/ai",
		variant: "primary",
		size: "small",
		leadingIcon: ge,
		children: /* @__PURE__ */ (0, Y.jsx)("span", {
			"data-copy-key": "catalog.aiLibrary.configure",
			children: q("catalog:aiLibrary.configure")
		})
	});
}
function tn({ demoCases: e, setupAction: t }) {
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		className: "flex min-w-0 flex-col items-center gap-4 text-center",
		children: [
			/* @__PURE__ */ (0, Y.jsx)(Bt, { label: $("playMascot") }),
			/* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "flex min-w-0 flex-col gap-1.5",
				children: [/* @__PURE__ */ (0, Y.jsx)("h2", {
					className: "text-title-1-medium text-text-primary",
					"data-copy-key": "catalog.libraryAssistant.welcome",
					children: $("welcome")
				}), /* @__PURE__ */ (0, Y.jsx)("p", {
					className: "text-body-regular text-text-secondary",
					"data-copy-key": "catalog.libraryAssistant.description",
					children: $("description")
				})]
			}),
			e,
			t
		]
	});
}
// src/react/search/assistant-footer.tsx
var nn = {
	requests: 0,
	measured: 0,
	input_tokens: 0,
	output_tokens: 0
};
function rn() {
	return /* @__PURE__ */ (0, Y.jsx)("span", {
		className: "text-caption-1-regular text-text-secondary",
		"data-copy-key": "catalog.libraryAssistant.demoMode",
		children: $("demoMode")
	});
}
function an({ onReplay: e }) {
	return /* @__PURE__ */ (0, Y.jsx)(b, {
		type: "button",
		size: "xs",
		variant: "ghost",
		leadingIcon: F,
		"data-ai-button": "footer",
		"data-copy-interact": "",
		onClick: (t) => {
			t.altKey || e();
		},
		children: /* @__PURE__ */ (0, Y.jsx)("span", {
			"data-copy-key": "catalog.libraryAssistant.replayDemo",
			children: $("replayDemo")
		})
	});
}
function on({ libraries: e, library: t, disabled: n, change: r }) {
	let i = q("shell:libraryPicker.allLibraries"), a = e?.find((e) => e.id === t), o = (e) => e ? /* @__PURE__ */ (0, Y.jsx)(R, { library: {
		id: e.id,
		name: e.name,
		icon: ce[e.icon || ""] || e.icon || "database"
	} }) : /* @__PURE__ */ (0, Y.jsxs)("span", {
		className: "flex min-w-0 items-center gap-2",
		children: [/* @__PURE__ */ (0, Y.jsx)(U, { mark: "database" }), /* @__PURE__ */ (0, Y.jsx)("span", {
			className: "truncate",
			"data-copy-key": "shell.libraryPicker.allLibraries",
			children: i
		})]
	});
	return /* @__PURE__ */ (0, Y.jsx)("div", {
		"data-ai-library-picker": "",
		className: "min-w-0 assistant-library-width",
		children: /* @__PURE__ */ (0, Y.jsxs)(xe, {
			"aria-label": q("shell:shared.library"),
			size: "sm",
			selectedKey: a?.id || "*",
			isDisabled: n,
			onSelectionChange: (e) => {
				e !== null && r(e === "*" ? "" : String(e));
			},
			renderValue: o(a),
			children: [/* @__PURE__ */ (0, Y.jsx)(Se, {
				id: "*",
				textValue: i,
				children: o()
			}), e?.map((e) => /* @__PURE__ */ (0, Y.jsx)(Se, {
				id: e.id,
				textValue: e.name,
				children: o(e)
			}, e.id))]
		})
	});
}
function sn({ usage: e, demo: t = !1, pending: n = !1, provider: r }) {
	let i = (0, J.useRef)(null), [a, s] = (0, J.useState)(!1), [c, l] = (0, J.useState)(!1), u = (e) => {
		s(e), e || l(!1);
	}, d = $("usage"), f = new Intl.NumberFormat(), m = new Intl.NumberFormat(void 0, {
		style: "percent",
		maximumFractionDigits: 1
	}), g = e.input_tokens + e.output_tokens, _ = [{
		key: "usageInput",
		tokens: e.input_tokens,
		color: "bg-chart-4"
	}, {
		key: "usageOutput",
		tokens: e.output_tokens,
		color: "bg-chart-5"
	}], v = e.requests ? n ? "usagePending" : e.measured < e.requests ? "usageIncomplete" : null : "noUsage";
	return /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [/* @__PURE__ */ (0, Y.jsx)(b, {
		ref: i,
		type: "button",
		size: "xs",
		variant: "ghost",
		leadingIcon: Ve,
		"data-ai-button": "footer",
		"aria-haspopup": "dialog",
		"aria-expanded": a,
		onClick: () => u(!a),
		children: /* @__PURE__ */ (0, Y.jsx)("span", {
			"data-copy-key": "catalog.libraryAssistant.usage",
			children: d
		})
	}), /* @__PURE__ */ (0, Y.jsx)(o, {
		triggerRef: i,
		isOpen: a,
		onOpenChange: u,
		placement: "top end",
		offset: 8,
		className: G(ue, "w-72 p-3.5"),
		children: /* @__PURE__ */ (0, Y.jsxs)(pe, {
			"aria-label": d,
			"data-copy-choice-host": "",
			className: "flex min-w-0 flex-col gap-3 outline-none",
			children: [
				/* @__PURE__ */ (0, Y.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-x-2 gap-y-1",
					children: [/* @__PURE__ */ (0, Y.jsx)("p", {
						className: "text-body-2-medium text-text-primary",
						"data-copy-key": "catalog.libraryAssistant.conversationUsage",
						children: $("conversationUsage")
					}), e.requests ? /* @__PURE__ */ (0, Y.jsxs)("dl", {
						className: "flex items-baseline gap-1 rounded-full bg-background-tertiary-default px-2 py-0.5 text-caption-1-regular text-text-secondary",
						children: [/* @__PURE__ */ (0, Y.jsx)("dt", {
							"data-copy-key": "catalog.libraryAssistant.usageRequests",
							children: $("usageRequests")
						}), /* @__PURE__ */ (0, Y.jsx)("dd", {
							className: "text-text-primary tabular-nums",
							children: f.format(e.requests)
						})]
					}) : null]
				}),
				e.measured ? /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [
					/* @__PURE__ */ (0, Y.jsx)("dl", { children: /* @__PURE__ */ (0, Y.jsxs)("div", {
						className: "flex flex-wrap items-baseline gap-x-2 gap-y-1",
						children: [/* @__PURE__ */ (0, Y.jsx)("dt", {
							className: "text-caption-1-regular text-text-secondary",
							"data-copy-key": "catalog.libraryAssistant.usageTotal",
							children: $("usageTotal")
						}), /* @__PURE__ */ (0, Y.jsx)("dd", {
							className: "order-first text-title-1-medium text-text-primary tabular-nums",
							children: f.format(g)
						})]
					}) }),
					/* @__PURE__ */ (0, Y.jsx)("div", {
						"aria-hidden": "true",
						"data-conversation-token-bar": "",
						className: "flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-background-tertiary-default",
						children: _.filter((e) => e.tokens > 0).map((e) => /* @__PURE__ */ (0, Y.jsx)("span", {
							className: G("min-w-0 basis-0", e.color),
							style: { "--conversation-token-weight": e.tokens }
						}, e.key))
					}),
					/* @__PURE__ */ (0, Y.jsx)("dl", {
						className: "inline-grid w-full grid-cols-2 gap-3",
						children: _.map((e) => /* @__PURE__ */ (0, Y.jsxs)("div", {
							className: "flex min-w-0 flex-col gap-0.5",
							children: [/* @__PURE__ */ (0, Y.jsxs)("dt", {
								className: "flex min-w-0 items-center gap-1.5 text-caption-1-regular text-text-secondary",
								children: [/* @__PURE__ */ (0, Y.jsx)("span", {
									className: G("size-2 shrink-0 rounded-full", e.color),
									"aria-hidden": "true"
								}), /* @__PURE__ */ (0, Y.jsx)("span", {
									"data-copy-key": "catalog.libraryAssistant." + e.key,
									children: $(e.key)
								})]
							}), /* @__PURE__ */ (0, Y.jsxs)("dd", {
								className: "flex flex-wrap items-baseline gap-x-1.5 text-body-2-medium text-text-primary tabular-nums",
								children: [f.format(e.tokens), g > 0 ? /* @__PURE__ */ (0, Y.jsx)("span", {
									className: "text-caption-1-regular text-text-secondary",
									children: m.format(e.tokens / g)
								}) : null]
							})]
						}, e.key))
					})
				] }) : null,
				v ? /* @__PURE__ */ (0, Y.jsx)("p", {
					className: "text-caption-1-regular text-text-secondary",
					"data-copy-key": "catalog.libraryAssistant." + v,
					children: $(v)
				}) : null,
				e.requests > 0 ? /* @__PURE__ */ (0, Y.jsx)(O, {
					summary: /* @__PURE__ */ (0, Y.jsx)("span", {
						"data-copy-key": "catalog.libraryAssistant.usageDetail",
						children: $("usageDetail")
					}),
					children: /* @__PURE__ */ (0, Y.jsx)("p", {
						className: "text-caption-1-regular text-text-secondary",
						"data-copy-key": "catalog.libraryAssistant.usageMeasured",
						children: q("catalog:libraryAssistant.usageMeasured", {
							measured: f.format(e.measured),
							requests: f.format(e.requests)
						})
					})
				}) : null,
				!t && r && p[r] ? /* @__PURE__ */ (0, Y.jsx)("div", {
					className: "border-t border-separator-border pt-2",
					children: /* @__PURE__ */ (0, Y.jsx)(O, {
						onOpenChange: l,
						summary: /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [/* @__PURE__ */ (0, Y.jsx)(h, { provider: r }), /* @__PURE__ */ (0, Y.jsx)("span", {
							"data-copy-key": "catalog.libraryAssistant.usageAccount",
							children: $("usageAccount")
						})] }),
						children: /* @__PURE__ */ (0, Y.jsx)(cn, {
							provider: r,
							enabled: a && c,
							format: f.format
						})
					})
				}) : null,
				t ? /* @__PURE__ */ (0, Y.jsx)("p", {
					className: "border-t border-separator-border pt-2 text-caption-1-regular text-text-secondary",
					"data-copy-key": "catalog.libraryAssistant.demoUsage",
					children: $("demoUsage")
				}) : null
			]
		})
	})] });
}
function cn({ provider: e, enabled: t, format: n }) {
	let { organization: r, balance: i, note: a } = mt(e, 30, t), o = "settings:aiLibrary.usage.";
	return /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [
		r !== null || i ? /* @__PURE__ */ (0, Y.jsxs)("div", {
			className: "flex flex-col gap-1 text-caption-1-regular text-text-secondary",
			children: [/* @__PURE__ */ (0, Y.jsxs)("span", { children: [q(o + (i ? "balance" : "organizationUsed")), i ? null : " · " + q(o + "rangeDays", { days: 30 })] }), /* @__PURE__ */ (0, Y.jsx)("strong", {
				className: "text-body-2-medium text-text-primary",
				children: r === null ? i : q(o + "tokens", { count: n(r) })
			})]
		}) : null,
		a !== "organizationHelp" && a !== "balanceHelp" ? /* @__PURE__ */ (0, Y.jsx)(N, { children: q(o + a, { key: e === "openai" ? "OPENAI_ADMIN_KEY" : "ANTHROPIC_ADMIN_KEY" }) }) : null,
		/* @__PURE__ */ (0, Y.jsx)(ne, {
			href: p[e],
			children: q(o + (e === "openai-oauth" ? "planLink" : "accountDashboard"))
		})
	] });
}
// src/react/boardui/components/application/agent-thinking/agent-thinking.tsx
var ln = {
	subtle: "var(--color-text-tertiary)",
	default: "var(--color-text-secondary)",
	primary: "var(--color-text-primary)",
	accent: "var(--color-blue-500)"
}, un = {
	wave: "default",
	spin: "default",
	stars: "subtle",
	infinity: "default"
}, dn = 3, fn = 4, pn = 2, mn = 80, hn = 220, gn = .3, _n = .12, vn = 1 / 8, yn = [
	.55,
	.3,
	.15,
	.85,
	.55,
	.3,
	1,
	.85,
	.55
];
function bn(e, t, n) {
	return e === "wave" ? (t + n) / 4 * (dn / 4) : (Math.atan2(n - 1, t - 1) / (2 * Math.PI) + 1) % 1;
}
function xn(e, t) {
	return Array.from({ length: 9 }, (n, r) => {
		let i = (t - bn(e, r % dn, Math.floor(r / dn)) + 1) % 1;
		return _n + .88 * Math.max(0, 1 - i / gn) ** 1.5;
	});
}
function Sn({ variant: e }) {
	let t = jt(), [n, r] = (0, J.useState)(yn);
	return (0, J.useEffect)(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		let t = 0, n = window.setInterval(() => {
			t = (t + vn) % 1, r(xn(e, t));
		}, mn);
		return () => window.clearInterval(n);
	}, [e]), t(/* @__PURE__ */ (0, Y.jsx)("span", {
		"aria-hidden": !0,
		className: "grid shrink-0",
		style: {
			gridTemplateColumns: `repeat(${dn}, ${fn}px)`,
			gap: pn
		},
		children: n.map((e, t) => /* @__PURE__ */ (0, Y.jsx)("span", {
			className: "rounded-[1px] bg-current",
			style: {
				width: fn,
				height: fn,
				opacity: e,
				transition: `opacity ${hn}ms ease`
			}
		}, t))
	}));
}
var Cn = 1.4, wn = 14, Tn = 5, En = [
	{
		x: 50,
		y: 46,
		scale: 1
	},
	{
		x: 18,
		y: 22,
		scale: .55
	},
	{
		x: 82,
		y: 26,
		scale: .45
	},
	{
		x: 78,
		y: 76,
		scale: .55
	},
	{
		x: 22,
		y: 78,
		scale: .4
	}
], Dn = "M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z";
function On() {
	let e = jt(), t = wn * 1.5;
	return e(/* @__PURE__ */ (0, Y.jsx)("span", {
		"aria-hidden": !0,
		className: "bui-agent-thinking-stars relative block shrink-0",
		style: {
			width: t,
			height: t
		},
		children: En.slice(0, Tn).map((e, t) => {
			let n = wn * e.scale;
			return /* @__PURE__ */ (0, Y.jsx)("svg", {
				viewBox: "0 0 24 24",
				className: "bui-agent-thinking-star absolute",
				style: {
					width: n,
					height: n,
					left: `${e.x}%`,
					top: `${e.y}%`,
					marginLeft: -n / 2,
					marginTop: -n / 2,
					animationDuration: `${Cn}s`,
					animationDelay: `${t * Cn * .7 / Tn}s`
				},
				children: /* @__PURE__ */ (0, Y.jsx)("path", {
					d: Dn,
					fill: "currentColor"
				})
			}, t);
		})
	}));
}
var kn = 32, An = 11, jn = 2.75, Mn = 1.2, Nn = "M28 14C33 5 47 5 47 14C47 23 33 23 28 14C23 5 9 5 9 14C9 23 23 23 28 14Z";
function Pn() {
	return jt()(/* @__PURE__ */ (0, Y.jsxs)("svg", {
		"aria-hidden": !0,
		viewBox: "0 0 56 28",
		className: "shrink-0",
		style: {
			width: kn,
			height: kn / 2,
			margin: "0 -4px"
		},
		children: [/* @__PURE__ */ (0, Y.jsx)("path", {
			d: Nn,
			fill: "none",
			stroke: "currentColor",
			strokeWidth: jn,
			opacity: .15
		}), /* @__PURE__ */ (0, Y.jsx)("path", {
			d: Nn,
			pathLength: 100,
			fill: "none",
			stroke: "currentColor",
			strokeWidth: jn,
			strokeLinecap: "round",
			strokeDasharray: `${An} 89`,
			className: "bui-agent-thinking-comet",
			style: { animationDuration: `${Mn}s` }
		})]
	}));
}
function Fn() {
	let e = jt(), [t, n] = (0, J.useState)(0);
	return (0, J.useEffect)(() => {
		let e = performance.now(), t = window.setInterval(() => n((performance.now() - e) / 1e3), 100);
		return () => window.clearInterval(t);
	}, []), e(/* @__PURE__ */ (0, Y.jsxs)("span", {
		className: "font-mono text-caption-1-regular text-text-tertiary tabular-nums",
		children: [t.toFixed(1), "s"]
	}));
}
function In({ variant: e = "wave", label: t = "Thinking", tone: n, shimmer: r = !0, showTimer: i = !0, className: a }) {
	let o = jt(), s = ln[n ?? un[e]];
	return o(/* @__PURE__ */ (0, Y.jsxs)("div", {
		role: "status",
		className: G("flex items-center gap-2.5", a),
		style: {
			color: s,
			"--bui-agent-thinking-tone": s
		},
		children: [
			(e === "wave" || e === "spin") && /* @__PURE__ */ (0, Y.jsx)(Sn, { variant: e }),
			e === "stars" && /* @__PURE__ */ (0, Y.jsx)(On, {}),
			e === "infinity" && /* @__PURE__ */ (0, Y.jsx)(Pn, {}),
			/* @__PURE__ */ (0, Y.jsx)("span", {
				"aria-label": t,
				className: G("text-body-medium", r && "bui-agent-thinking-label"),
				children: t
			}),
			i && /* @__PURE__ */ (0, Y.jsx)(Fn, {})
		]
	}));
}
// src/react/boardui/components/application/agent-log/agent-log.tsx
var Ln = [
	.22,
	1,
	.36,
	1
], Rn = "--bui-reveal-fade", zn = `linear-gradient(to bottom, #000 calc(100% - var(${Rn}, 0px)), transparent calc(100% + 1px))`, Bn = {
	WebkitMaskImage: zn,
	maskImage: zn
}, Vn = {
	opacity: 0,
	height: 0,
	y: 4,
	filter: "blur(6px)",
	[Rn]: "22px"
}, Hn = {
	opacity: 1,
	height: "auto",
	y: 0,
	filter: "blur(0px)",
	[Rn]: "0px"
}, Un = {
	height: {
		duration: .38,
		ease: Ln
	},
	opacity: {
		duration: .42,
		ease: Ln
	},
	filter: {
		duration: .42,
		ease: Ln
	},
	y: {
		duration: .42,
		ease: Ln
	},
	[Rn]: {
		duration: .44,
		ease: Ln
	}
};
function Wn(e) {
	let [t, n] = (0, J.useState)(!e);
	return {
		style: t ? Bn : void 0,
		onAnimationComplete: () => n(!1)
	};
}
var Gn = 14, Kn = 12, qn = `M0.5 0 V8 Q0.5 ${Gn} 6.5 ${Gn} H11.5`, Jn = {
	duration: .12,
	ease: "linear",
	delay: 0
}, Yn = (e) => ({
	duration: .14,
	ease: "linear",
	delay: e ? 0 : .12
});
function Xn({ first: e, last: t, reduce: n }) {
	return /* @__PURE__ */ (0, Y.jsxs)("span", {
		"aria-hidden": !0,
		className: "pointer-events-none absolute inset-y-0 start-0 w-3 text-foreground-icon-quaternary",
		children: [/* @__PURE__ */ (0, Y.jsx)("svg", {
			width: Kn,
			height: 15,
			viewBox: `0 0 ${Kn} 15`,
			fill: "none",
			className: "absolute top-0 start-0 rtl:-scale-x-100",
			children: /* @__PURE__ */ (0, Y.jsx)($e.path, {
				d: qn,
				stroke: "currentColor",
				strokeWidth: "1",
				initial: !n && { pathLength: 0 },
				animate: { pathLength: 1 },
				transition: Yn(e)
			})
		}), !t && /* @__PURE__ */ (0, Y.jsx)($e.span, {
			className: "absolute start-0 w-px origin-top bg-current",
			style: {
				top: 8,
				bottom: 0
			},
			initial: !n && { scaleY: 0 },
			animate: { scaleY: 1 },
			transition: Jn
		})]
	});
}
function Zn() {
	return xt() ?? !1;
}
function Qn({ first: e, last: t, reduce: n, className: r, children: i }) {
	let a = Wn(n);
	return /* @__PURE__ */ (0, Y.jsxs)($e.li, {
		initial: !n && Vn,
		animate: Hn,
		transition: Un,
		...a,
		className: G("relative overflow-hidden ps-4", r),
		children: [/* @__PURE__ */ (0, Y.jsx)(Xn, {
			first: e,
			last: t,
			reduce: n
		}), i]
	});
}
// ../resources/assistant-demo-covers/idpc032.webp?inline
var $n = "data:image/webp;base64,UklGRpxlAABXRUJQVlA4IJBlAAAQNwGdASoLAW0BPl0okEYjoiGhKJQMMHALiUAXOmVqlnBLoPKQ5j8ho0f+bsN+D/8Hmse1d9X/t+t3+wejV0gPNx+4fq2+nT+1+ox/c/8Z65XrO/4z1SP2z9Zr1lf8D+WmHGedTxV/H/lP5r/k/z/+g/uf+g/6f+R+QH7o/4PBD1r/5/Qr+Z/hP99/iv3c/OD5W/7HiH8kf9H7nfkR/Lv6t/t/Tt/H7lzf/9z6Efv393/6P+h/Kf9Zvce/1/TD9P/yvsDfzn+x/8r/DfvX/l/nb/o+SX+Q/6nsG/0r/I/+X/N/kx9OH+R/8v9t+Y/vU+rv/b/q/gR/n/98/7frz+yz95v//7qf7bf+4T8eXS6KDiWjLRyKK0yXvHvF26p3mgxrc1dJNAeAMWIOY2Jt03mZ/X1Kd+wpk7yymYUBBydwDJJZhFgB6UuVHyqhVuFFD2vSYMtV/Ui8K8YiCQF0cjFFqQKnluu7JjXQ+q15Sosx0f5l/uykxO5RH9aa89v8RSCrlYeTeVHMvrmdeoZHhPwzUrPsqJZ0OnXoY4tAaevv4aZx+6bh8xBtdwL68T5hUJ5aii9gurLLrf4neriYLRegM8vp2jcrogZ6m1EBbZEYTSCmRURXz4vJFO8QukaxHkWsSFVbgoatxKpYTc74cyKl/nf4AXcN3UEiixYXx9b8GwtY9zPTeNWr+qmJNubaNlRriqo1LPmHHZ0mN1qvw9E5A0wnGoSBK9KqfveuHyq11oB5W8yVAXCQ72GwEsMBqSiVCR/nHhi7SwfH4LMc3n3NvB6ZwW2QD5VV+q+Z8mrspKAS23k5avHm8z4JmtzFseRpoiBhjwRnzdf75Mm+h75Wh+xdziKH9zm3/O43raIEWdlreDFeMCkgObLm3W6j9PTfOP7xyRMt2QJi/qG9bJuR6Du4u6GkzMOw+95nxZ9fggN7aE1EIoCtPeEl/qy2pwiJ70ucpF7mub2BM2fPsXyJWWkH9EVHJD2qJ7VAI99A2DTH+0vKwe8x0syOaYj/WzeEOOLuF1Je/hNdG+jDFvO47FkCVm/nwka4WJKD9ce0Jxlwg7/l0wrOybsodxWaflPkiFrazCKi5nuCIBMNo/leB6SUvUQPD5vogDW5C2qyz+oWm9JABmXMNnYz2gIMNBsyfGXR7gx1K5GOYy/m/OJZgh723m3Aecz61/KJz8c9oE9t0E+RuBa61lV1fYKiMQa0nrPUb8xKPQBnglMt0VI6kQq4b6hQoSKQp+RbTCyardh+QJyStbnyNQ6voX9oLyW/L8oZuIzy9UzRtE27j+tQHbgPbNUbQEhlJnL8p35N96VlP6L6YfBd4e07W4MIzxHdsABGFlOz3D8sVv2KI/6+/w29anFFTy9ArymW9CiaGXnTnDEitSumFmuVM2hwKkTIlQktV/uE7wDFkqOaKgPvgnNAKQNeSGTosvz9aCIUs6QDPhaKk8gxn70LrofoJpVOZXEezbsY9/Xxo+9nOGCTz86r0MR1gf6kaYodiLMa+5hstcZABmWWnhV66qGAVMib+ynsSxPwTwU3N60/xTXV4k9L2VKf8Ddg2YsbnUGjJWUpTZX/dRB1kAAv+Ks+vUYMAoE37MjGH++A40MILUnTBqvSWSGjsPAZfe2nRps476ZyNoEnEt6RSUjhGeaSrMetCqYtpqTjAdsMb9d6lMgs2C16uv39pqDd1qeOADZ4zSTSOYLK2zk7civMboG/8ZGn+r3+ETmtlWuFZblbevnsQx2m0k1CIka12VLSs51oAO4MugSqXhF/9ofRgqb6HYR22viNc/Q/FbOIAtfmuqf1R+X9midsJDfOMyFhjKlXcfKfG6tuYWAJG6x3iLwvB8s743XFLOEuFIcHJV0yQvVGanSnXiV02hT0Zu0tA5puDmX4c0EOsKNaqhJtN8m9v0R+7dYcMNGH8ya98GZJC+Av7EB+2f6S/3+ARycZis4Qq7X8pFD6g6fNX6FSPbz3Rjk/VyHPRpjuPB6bdi+CpDb2Ij46e5w74FTR81cl91gLuD78+Npdonr9RQvaxhvARdeDpQuxM/pMEbEZrZ7JL34x5pHxd6QyY/ruKg5K9hYYX0H+PIq2kA+mUWTVac1dCDQxmZiZdhW9xHZt0wKdYNHngUuQ04FG1H6nOgyoV6eeAJE5BbWLDb27z6ZyCDWn27mMpnbkQDjHngAsZPeQ3CgP4FOgzs9WD3SjkRSBjy7oREqXnOXgX5XAq+MRMDycUPzJg8kX1SOfiVLOLUMw1Ykic45b24ee+QeY0pAbuF5q0w+4miQ2CLyBpa+r8+1FWpi94C6UBiVKYLBduPAsThtACB2ikTdvhcUAKR7RSwL8m0IO3Zc1N2kpVJOxZehHr55vJAeTSUBEqy8tSUttZAsolwprsBJESoAVFotOAS9V6ID8y/nuvI59pZy7xNuK26nhg9gDfty+m/o88VEV2J/zv4g3B9dWjrwu7ZxxlEAldTAj2Abn+oG79hznENbm7XncQsybRnihzj8hSI5CXproJLg9soFyqWQWluKBVzWfS7LpMHM6dSTPfqn1AOynnw3/jfiRt6fwBEgz/6SZQz9sdfcBWJgKfik8XSVFyk09NxJ0ArxgGf2Up2nb0AJgohvWD8lj0zKGPieTeJLxz++HJTUw/8F7W94urFvSU8q+ZugV+ksGOmfSq9FkxnNik4LMQoDhN9rdJC2/Eev0lmv0KY+K+rWBbbisydbaUCgbWE8y37ql2xwKgpd8ik8+NBh6E9rdG6sUp37X79LbemI2c1rRwRjXDwpvZpNBfEgog3+2i7q168xEavw0Y1cvxJ8a230Nh+5mcP7Kf48MyAuq6pOGxBxoF76+2Kwx2wJsn9OPnSEXnAE39qeiwW9CjSAdHXI1hwAU/623URsyROgezcusnZyEXXl/s0y1rLk+ntzhvD4guhTgCQ409JrjZLfeBM4lT2NEDlRfb13uQK3hQNByAgjE7PXlqD8HpzWhxdTLIphq0WG04wSJMINub7IhG3BYhnywNn9EM2bT6L5yDz/2UbyGUPq06Rg+W5ix2NdH4mo2dEkvEIPyZtDyQDymoXiMztJIRerAHJ6cWNs0sw0P3pcgjbFkpkxcyizvpn5zgz1PM8uua+HR0NDFO69EDTUH1Rq/Ee7GhO7vWiyqyJGYcKQYTILzkdNlxa+n4nkwreTih2UCa7YYmKyi0u5SqS6oym13GkZE80e9DdwRt0Qiwj8kx70b9meDSNRdiG/U3PWunHqjIZNjwjMP53/Lf8A1LZsM1UO8hnVBgfp0uJQ2wzJq+G/kSeOAH+rkahq2AMWJj2RalsQX0rUDvqOAAPsXefTNCDt4/43hcsXF7RoND0FiRkdnMhCERQo7Ui/VA/PeeYmfw/usMOnLULLqUsCf/6EUc+O/V3PfpyX/2S8++MVk8UVq8TDRB//26/WCfVX/Yb8lsv/8m591/Kouyd6bzj+7LynXPdXskoRLsGwqMIimMM/StTUvYCfz0rSksrkL7WH5qtsPoDezBUyA1b9d3m6cmGu1unjTs7Nd/USDdfDJHqt2LYf9YnYHvM2KH7lp9hpwYDpOr5kPn0/eVGNec+u5WDNilWr6VfWoZ/ACe/TEbjXHzqAB1TehGHVMzVma1ULgw6lL8UDGSu1lffnlRiUOUZgS1ATIvhVk4OMq1aIz5xKdME+vY3mf57cCOgLz1NXfdnJE1DJa2hqfYQ59redEPt3HBv2NWSpDMDI9p5UFYBNIBD2PoJPLFW/bCdqg/nff/dWKzrMF+OOzY4iZHoQGT288sUH/Gl7C8DVLlX7pFR1KvjgNKyv2zbVDade7XP39oSNg1VxOxmAxms64f1h5wrAZxxWcSsZbiZ8ALLT/NxhY3Jq0oXafMppV0J6Q7EW3FcQC+qpt/cegeAfJRkMJtIqDpasM/77cDNCELaaul+5/n/Ycxr1VrmaPyEMHRaSb5BkzPQISDGUdSJAOeojBqGrGPlG30Hx0NCvYB+/wJMDZdiyaZteJ15H4P+uLWQKfCw83eVXqOKRLQb9AdhlPqfLgE1Bj+EwpSJT2OLNmqRrff6E8betUlW/m8kf+kGy8t628tCEyHKtMRosf2FXEKOBQwmXSngSWwc546hslOFWGkaxS0gyOp3dWyY6YP8vFWGNgcIlIfj3sR9LMcHhfaoEHpgFXasFpdSrAkHdp8QWdaco4+KbGvLs3iwxSEBtLRr58GToOS5zWSvfG7RZ9vlkM3KgbS8QH4AzAhXga6Gb8GU8G8nWXlD0JlsoxEMrKmJhpRkrY0wcy5tEoxpweGlFoqmUw7mSOkJb/GUkHVAHqbt8NVS48pCr/jYURZE2wtexAHNe3A2MceK6hjR4Q+W5l2NB48t5N0E1FGFKKwlwwTDuJnpax16T/tu8IuOT/exHUH8n5fQXViuaf0cbWHt96uE9RBXM8tKDYTCpmbxDdovihF3gWa83zPAoSluPiVgTYHZX8izG0lvGFwAd0qB3cWiMFEO5t7BUeKpCRnyCF0+nSFDlt1J/qnDG75etk3IiW7aJo19otRcxvZNOadJi3ZPHOWSo4Gv3QHlH4Z2vyrUSNz8pyLL7/EHvxUATvSpFPFz/u/cYsBB4dEhUCrgdBU/m/WgC3LFs8wFt1wU7p49+pNOcqob7vuvZKehBKEPw3CLZUylIPfZzhTexEZwRxOoeuDE4ZQOO7iYeyVjgj6a/0G25JGx39rkY/XLS/M4VfrGr7Xe4N+DfPca+FERmAnvh/J/Ki96JmHuE7Oagk8DNnY6Ygy6WP87ijoEioLMbBicRmg8X7mzn6Tw7W8tlNCSPewemibRY7oQaWZM6/y3rzsUFciiTYpeXvKSIOP1T5w9xTG4SjfAo/v74lV3hsvhEjkvN6vaKfEH6ZbMdkRId90KZlYMZI+PpRh92zRaUcupK8NxLCrZIMlvVO1Vdj6jj8DesQU9FiKRdWsExU4o5zn0o5Kkhw9emSJHljtBRsEWN7T4Pzc2vIPmUwTmAse3ON5+MCiSJfqMqE/sdk7P8JVDq3eUoUV9R+wEHB4O/3EtaOYknTEvQOGT8eyOTGkd0YF9NGdX7PbCKzcCE6Yhb0gVGd85yxxvVTV41L1JcPkyPFfwyx/tlTc3wnwUfnvfG/bV7csda/0LN9vJ/Rp+Ym345rj9aiE4YKxBknZsv5g5M4/va6gldiGyG7A/AUB1KbSWq/waNGp7y7TtSmsqjx/TUQpBr5sA3fIeUTo8D+IVwQCuJ9+JTX5/4dh3m59NQ04iID44KVrS80V9I2zKhanFeG7MVDOrnfm3Axb7OSJfPCvGwZSQJHDXdVFe421eH/Q6ltBFRXhgzaodmlPXwn3MvoiJoI7j6lWFzARw7OjtSmFV1zisLo0JnB/fcKMuf/o/VeQBtsgE0xv95XvRiQN7R6/FMWSh3uSJ5nJsXLiPLsbxL8aSn8rnoz+hyGxAWfOXcaE0fkGM/eRe2OWFC00wCDDkpNmZvtDaYv8IKNgAFPi2XD7o/NEhJLFcc1ji+hr04iom7qQJb9FG2bsJ8UKr4EW0Zki5lrCCshGNac78Vy4KuMB5Y4noctmUpeBtm4ZIpLHubItVb+H1g4lPQl28UfmeMEbkJ3fZPMmlCb7zt6xkCxXcCoPSWJmiObyzr4PHL6ZM8fp4/zwFcavSf2HUpb+nluerEr129aY23v1XQHu7MWPu2YzTtIkcz6yRwIyzs8RrG5+DDgdyDTH2VlU4rRm7bJj3T1d2FDk5aY/t0YjID43W/09fpKK14g610AnwPaPKm9gJk0gax+ev6WOyVOQCzQiZGv5xV7TK/i1+oYCEqsqOYPnramnC5/D88ZdYHS9cttIY3U/lVztR8NkMA+bfDqCnuMUsXmDX4CO83f8P4pQRXVjqeUQzNKRaO30qlPT97Mr+tCf1XKTjWbwAepuelPPeTB+yJ/G/VJcSzXw936BKZxlz0psyOFuwLy2IQW9JRVaOqUnNJ9QuZ0u/qczV8UmlE+jrhGd81f8IB1qA02vlVqtrCds90r4w5A0EE69xhk7O6/clEptX0wYBFoMr7UYCejOv+v6o8EG1LDn3dcW2stp2C8toWkw9ScSQO8W8Ai4RO/Ddhdo1H78Yt1q4L3Uj6gu+0jmxQPH6pfezsb5vhCsoCHzLpbTbuzbOFloCQsX3fey8et5cZMRnbAgZue6tZLmyw2ixMxoAq7mg8flxM+5BQkfHq5WaIIRYnfCPCgc/i1vT0EABvJ1UpJGeCK5qqqRTkwVBXeaEvvO295YyY8MYP/F0FHJ5r1CSFm7aH+d/xtmpK/1WX0Rvz/ESSTO484bGpNG5RnkaLcaC/tyhgV5T/tZ7fFuaC9WcODQGUBKknERIOH3Uh6woZr43fTlCqd2HWTaS3Xcjc9qlYierMIAiAlj/YDpuEsrCE5TN7EF/fNrhUL1Q8ueLykSSTo2SRK/SD62fM7s2Zqe+6JpSPtPFZy/vRD2jvFtmRWYYFVwOyXd/f2OQGVNkU/Ca5Sn8d0WZzzyj2GJMG6noup6q5xMe+YGv4+ymtippsJWG/65OgNFtdZYNQvbqR41qOkFDs+7l7mh14AhCLTjQiuPmv0CsnX6L+E5C2EEFd8FpyKk6WJm+pLzE8nW0n7WlTNHCK2SOixt7JfFi37gGz89pfly9H9ByGEHVJcLBl5b5X4FsQjCaykqiCfwIBgBxrkjaBVkrLYJH5aDb7p6KB4oioQ14sixg/I9RSa8LBAuD/C/fBeMucjXqix+pTND9O1/TKF4IpU7toJypK+7hohGaXTyX6Hjv2CmOqMMIdxHXG3c9n5IJMAT1jdJD+742sxJYE+vVMYPN1NQy+Z6kA9iy/7ycGGm84zL49cB+9WSJB/tqlkgKbevlGYD9+PLY7/6UCwqSjEyfXNZydKd5h+AYkPR8+ccNTl6r9O4TUC3GSPfap2XxS3IMyZCj3GRcARei34REcBu0kU44o8vmOIiDH+oDBulusDRTm4JwWvkWLU/p8eLhv9y9K8TY+p7BnHID+Wk/d0Pwdz0QiSf4AxD0Bf+mlWGK9TsfnrPBUtwTBOiBkyfcwosEsIiU/acGIIqp9qu8P1MR6/7woMdoJHy+eh1jRt+um0ZnDRBlucjB30PI3+ADVVgETLNcdZGQp9aJdTEx2qgDAuKCsfE1iwCD8S6A5eb2r+97LR9GKvDmjP5EnaevuMDupBQR6iDqCQVrIlHsa8cf7JcspSIXt+JfI/24DaPNMMrq3etgLEhYckqlmOKGddyk2EwXRIJ2AnEnf6y8ueQ2M+xN9/6Cv0xRfmFtmkHpZ3qjJz7tC1Cp1LKpOKLmvVxLJ+oY3zhA9wDGaYx5e1mTIvC4BprXybCYT9y8ySv3ROhBCeW0XbxvfjVGT2rj8r99HIuAFknZOT3fRl3kjm/qXxF1cgBWJz+Qbttzt+dr1VIyrkTW3Ad5NkP/COzRokc3U+tJq5dIElziyhGMhB3+aTb8FFvxLvKeOC3Gyl10uxnSIie6KTh2H6533zzdb8DpFOytnLGtqc9LiQnm90+boDdPDxHR8y7BEB2QkAOCmXYNAE47UbksuEtTeFms95e++1/oLoufIkjbT2sgaeTLEnJvTl/FoMXXqns+Fk0M1eK7nJNPW3fNm+vNVhieswmnQ9J3PclzKXPLs4rm6WGt5IIldYkRrhqJ8GphGp5UQD2iwQOmYF2IxVmpGiYi8tzCpxaJpsd34ux6DZHyRGYNxi72nCCpzZycTaV2AGXLojjH+nheBY2tuK0bG9ET5YzCNe6VUXUN/Nuw/bAxMXtBLPX3i6QsuyXnNh0n32zduqBGIWhzxztakV/LOvaFsEEHyozYF9M/JqvZLjZKJ9rrDJ40yasHI9bO2vySfWK2C1Jqq+6EFyqFCwT/rcLmyUH5SXfEuxu7RQrHjCPJdhjRyQckTte1BFvc2Qzr+y8xc3bqkb4HydUgX+GEb66z96KghqTCMr2RZjvPjEfQKMtjpHjtfhDxB7UZ6FpN1fTnw6DAVYdHU9Y4Tfg5oViSYRICjutlhuFE2ui2pJAEscI8wq1YJhLRrCeQIlM9gS9MGtUyvNjhqyMDq3F8WTUQ0YnnlCQSLqc3/RduLHpeL5lAKLw/EOjT2GYQ6/bFerH5DQAft3o7gtbCszLdjug7gBLNEkjXPggsM4wA6lqqHxwEwj8RXH+DuqrHQJoZQdDya483kKCOYq2m95rLR6u3j0Mil3SnFJL0VgeRZezbcsAhxvqJ2IjuFOAjWsOiRLnG7+iSYh/yosw2DgvT4i9r4pQq7AWc5uhrCv5jOtrUJEOABeJUCTYXol0kGzEdz82/JxZyM5CaxjUlUCLd4IrkxaoF09CnJmAMZ8tRuXH0JKIqN3lKaNlbqNzppI04kvFUUyATwjsZPWFkEIe8aS0mCu7CUvG33WbL5OwC7irRduB00AkYsHRrLT/5E9MSXQ0HZ0FhVaZKRn6IxwTIi08pUDzUg6+EN/LiMVfPPx1uKuGLI16sTQ2acx1kl5pHnadfdD90H+g1vnxtGvYMaad6j65jeoP5a0xIHEgR5Sd1OjKyUsfxn2z8yMelwSLvSE0/Nx55CqIzyYEF1JJ4zMaPtwJDjGwCrpkRLBBECUxviBD8ju9OtwY1L49ncKjR4JXaXpxfdTjhV1voKq8drS/rG378fBvEbawtIReC7NUGQjyOYGkBgzSV0m6CwayA0dFbBET0MLrQJeZ+uLVI0oblgFI3QzM7OL6C/x8cCgIxelrcSZxpHQrR8SaNwgaQS0ZpxgsDzn08ENtkIzeL2r4ABVSSmufvo+2uhnu8sjZDC5nYejqqU6+0TcPxKaN011ssJH7Y4enEqBnR6q0DWC2VtvfbM+n6/lVviIDATTqMq5qyIkmsER3TejHcpgFJn3d3XDPebb86kVX4XMdtTQn3X2NQCK1Q/2iWEQxK4Mym2iP/6yMP/4oXNIjXBRnoF0SXJvviCVjkJsY97LZgOc58g4/YKT3Bjl98AvQDrnbQE8xbG6/iMQj6dJGutQJ+rfQ78lgO6sJ1BTwpurcm1bOfBZ7g7PmGmCPTJhz6oc2+fKdO8dUtdd2pMqSHaU6tbuUSpipxMD5lYFv7V5STXro8w09hiPkDNPuWdqV1hJFoFuNTP5fittTCK5t3LxfF1gSCtPWdL7N+hSH8rWw4hyQPE2ekN/XhtOokZwy/o8+rOy0Pr+Dggr6Mga7PXniuqiOIZY0cPe+P0qx/uhhrDXwq8nmlEgI6EUTTskZpSlOvhXXneJL10+W698oYskwlbpDYbT6KixMQPV94fQUrp+f6ut3PFhFj1DqMW/Z+Er1Wuwy5NpjpTzAok2Jy27KIVn8fVP9xKmyx9Yf+mNFvPTnOAzzvnKlZYeVdUV0frUUOJ94imOXUKiywqsfqN0GDr8LZS3vJB5Xuo9dxUbLWFqP7ZOjy5YLLLdXC+j21HqPGU0RMqrFrPkeA84hedLUva6J1AueG6jys0mg4fru0j2NCb2oyob9p0OP3/nw2bFx9bCqI4XdH5clCXPFHP1Khvj7Lok8vGsgpJLemokiwD36MT4YsBytbA7tL18dj6dNj0a9vqb/QI16lIHkE3/3/BTEGZXRs7UZW0pPQtTLqeeQECwXbJfhPPUjnAbn6gVWHxIFbQVtIaMj/p+mmP/LJ1skPe/cTuoahVX+c+az/U9v5lr7/W9kLfoY0QyxKkaf6K+YjtW+yFPAzNRNagIl19jaDwp9bgADEQ1iV9JwsxvIl4JgyjDcmMdZan6rAYNxBbDLZpWl22jNoP5DxsAEXdfQmizX8ikD+18dz8gAEaAs7Q6CgO03jBgAvcCSUI5/pton/GU5EHEchuTb3eGHCZbQ1TBUSC6aAe4mGxXAWfF9wgx2poiPJ3SeHhUxlbHa/rpLQzeyvAY79WKWNlp1VvZrtG2mgm8fki8kF/XiRzKsJ7jpRFr1R0DSc1tvPBptKFsoXFx8KEv0qWOoMaJUwAnP9FiFRvqMU7T6M/xWZSpNxkdiqmn2tDrOVQoIp2d+B5GA39PU5E0WXxQe/hXtKr4LsfRX6keHlcQ6qZS1CJ/o4RjA2UzqKl9J6sZO7vCj781qZ7hW9gzD97PUMG1jXR9fjhwQj2frnueloVnEvdeSAD2HqTddp2Vdoq9z7v/4nyJocEPL9CstVEjZdloXRGQ5aKZ7B4V9y/8Oa83gEHTEpTHaur/wxx1KCdxs8dZ49EiT9DWIT3qELBq/yLffl14F4BLG9Un/hMHKOp0AhsTXhu1DRJWLGDuMRntNFoAOEgNXi1R8JrTe0Bph/TuTTrUBNicbTdeQ7eoFDpzKTTgsccki52hecuRwsTsX5YYsndQTR9oKstBKf/bUwd/RPKMJirkLYQLp2ZenAuhvtPpWGWIYljszoGFrXcIzaFcxWqYkIEbgBuuvzbIQys0g7tRCTFnGtUw9MYHt9ElLn18Bwi7jgnj3ytzMJeSz3ZLtJY7sFPXewqzGZOyOvo0r07ME+fY+AvRTI7HGarbq6HNbzKNZCxIx2tgEoymYxZA9xjRKftvdtUYjcjzHkM6ZEERd4Y0oj8aRgwwfrRNCzpRoRdQBtCFLRaGzWZckv4iiKF5g0YQ85VHeC16sRW/YDEuQvZEUyxw7fXt8ju8Lvu/g2+u2tR8PyhkvZs94cAMamMGgxBI9VjVEwAqaOgJrcyxLGH+sZfWpgxZ7ED4jUrY+7jDuMkLrqj8mrIrEkS1EamhtsUbIKdqqoHchlMaNAe1XxqsMedVp6ctRNOuw6FCd+sY5bC1lFqw1q3IduwkhF8gAR3c0zHYR9QiHDO7z3/tIFd2cAhc7qD/mg2PVwdmiASv+NRkyG2qKKItVBmfWQ0XK2oI4TlL2JjeezpLi38OthAqM8mp7HAHigubMimXdbscSsWGgN/jZ3KvfnGQMYQkmwYbPU+sDDU21OFnA9t5OI1VgCFb463VeqZiXASWw4wdEJiEXbivtZmjILp/LMkAhyCRvYnZWk+aHiOfyF7t89XfK2qOziw2kQBDo2AAX/gk/ZBpcCHU5Ie1Wgbrg/Sm8R9Qz18aXPoia6XDLxEYUX5Xig6MDQstCOJ5iMsC7iX/hZjuMnmMntS5ILvKtNykNOpbOzfquBMvxya6XzkkLhdF+pvdEAbvJJ1+jTpfuHQ7AHu+KAN6HovtHg0+mohjY+i4XzXE2SvTWQS3MeJTN1IPXIBdgoVXa7Kot71a18yBWebFrSOomkxFzl7i7VNhL3tS3w26dVO+G/rYZTVE2NaClu6aLlISGiuQBt6ky8LVaj11nSEmkdr/wA0XhEfY2+TXhqzvpFckUe4gRNO5yI262zRYmF7V1BrerULg/On2FtEcQ1JOdP6C7kZIoI00XoOWWBm2XvyruGHyckxQcva4crtzo/+qxL1d0GrZzRFdagb1hKZMMMObMQebOsf32oXdwVO1MiLSCxtGI4sQxoaf7ExZX6kcbvYzDUYE9lCkoIKA3l8ye2SomIv2sNjwzIhGWIxf+U34KopTc6s74i7v6XiUjAOgIsQdzX5prIBmq9ke+MDmx2RVE1rWlxB+nV/TQUwL+26yiOY/W60j9XTxYGiMYbnwr9LlAeZ3N8/uarCRLSjID7Fni1el5HSdjXeQMpNVsmV3eRMtnLegauVVPBlamMJpYzZEvVx/777dy6tWdQpagSk0UJe1WPwIr4YU/QIWLk9H2wT1frfBuDebiNHrx3AKhZMz0yLL5+Qfi18apCycOrNjnrVpul+cXDk7af13jpqozdV+rhbwmBDVBUpsJ1eMebTaGSpuTiD2pBjmI7mCFa226+CIhUjIkTtnewXm5FeYOiUj0uM9CNHq7YRZzie2XUJA+Tlwf1wziF0b5HAqge8OAmxebeHoE7IS7gRpnnuKKEycbu4LyQHolipCJ9Eysf8BrAdRkZ6glb9HdaMnCMYmto/L2Yd4TrsBGWwudUIOuPxerBiJAe3/rhFj6yOP6/aJfZm/Zk7zy1ygOojPoF6Jvl6T79hPk0jgfofGUZ51ynXZOWUfwy/XUBupkc8t8/vuoXNthL76rk6oObrBgOs2PGpzi6Vt5ZYrQZ/DRme96oQvFcif3SL4ghTERmAqoIqtNEhsnerfHsJUSwdLHkqSDcsg2PySWC4bnS3yKKWBQ5AjO5H+drcbsHzXC3UIDEeIEQjyCFRI4skGZ4rx0PzZ9sZIFOyQRZbh1iiX81Pnf8ExTOD/E8icyvIPso0JlmWSj/JYOjPAJTWvT1byA3Gm4L9Ll/8l24QRULf0u8hZJQmNYfvlQkJkpqh+8eu8DT+i+JMVHYsvNuOAwFJSirrE2CQa0uhJZImtMWUJH1Sq2g2RavU3e5NHddk6jKmeXApV/NDTZHh65eczY/ZNxibNorS99OZqnBXm+7cwQV4Jex+TVS5jcCwiBriXqWSglrrVKgeeH+FTHed5DvvzpZGSpUOghNbSJa2rjhhVdtvx7VxyJxVJDbtXiov7zMR0Ke4x1AHuGAHeAu6f/O5zJJ5OJvjFdmrZIXF4R6lB0MBjFUzhNKoelBrZO+e5fbdxc3z/IOx1blqiP7DgjZep9pQjTTuZIbakcKdZ3q9Db/j5Z0BJbJxZA52PvA2EBCLra5hsQnc4/sFQ9WsrhWGmgV1Vji2bvpHYcbwbUjWOvjjBjrbWemHM2fHPl2LQC9NTs/hpEDFEbLbDTdPVPWV5aM3YlH6C2stzVXQeFQQfBMPt45T/Qx6E1hey1K6HOw6qeJ7VxNs52/urf68vEhdVgblIQeXB7wGdsLLMh+/c+kluczB73soK4BcvI6wAl4Y1Gpcv17VYrsBWeOCbN0tr1a+1XDI++C78h/QmCj+jKE7cElW9mqiYSiXkQf2zeuAoiQhhktPkCrAdmCLIUO/O3nWY27QIB3OP40jFGEFIUyBznuVwvhuxtv+0c1AVqd+RD/Q73qOq6kIvvKbF4kENxaR7TVhH/o8QM8NuHC14i9rzbz3F46Uy4ny9lxVuByE/oE9WKx3cmr3odwWoeWJ2RfbRcaQuY6YR48JOBXfN0r4M7iU7NV+XuMJXLN/9zn/3CSimq7SUSnhYDe4sLfZm5Tj8wd1TDjD0Zg6X5NCqoMz8aXjGryMmRI43WnsytVMMRVdpf57gMELzl7jqtRU6pwp3td/GQqG4Er8Apnb8yF+Kz4tCGbGrgV+Uv44KVjGyL3vFzTce8S51y6qdQ0DrAHsRvkBaSPEkQ+YXNN2AJZQSc0eF67TCvMKgJIOHupXBPc9IbNcPYlyzGwrXORbzWiDri6VFBMKPMyaAxj8WdeaH1TVMoJykD7md4uzbaYJb3qQWfIbr8I/5PzAY5mF9LHKr3r0miAHFIImbl5nHCu3MuNrs13pKBUfx3v5JEHYzxDcaTEamyHum9uXHTvRgffYckXmAj/eWRtSR88NGrkuCZhWWTdvSjCHsSMghH7R4eZGibXSFNFvDJATWAwxhrUb9tIAVqRU9d5MKneOrHQhA9UYq2AXZaS/Iwd7hYGnHtZpx5pQU9Z7AYTfEQgVAly4Lh1E2jr9aqgFvWys6KlZfyeEFJw5WzH/dLmojo0LHdXBks3eAmkuJg24i9/sDP8VS0cezDv2lkCpuPgvtmxNrcoesKsT+yF+iZjr0J3DCaP/gygo3t/yi2FV2W3eOE9WUhDRWEjqzEBRw8Q/Ti3HiZdGry6LpAtfgaThgRwmtyk9PbComVT8nUR/4RHpUWYFmHuIo8Stez/71VIaO7e8kU2JOE6CGnhjzcXxRv9q2XPxBmwLUOCRQyE5wQksegDSfUyepPSm+W/3p5xtP8d7+ULN7MLhlwig2upOp1wnKvut1ceD9nEHVUl8psneWV9e0DPmd8ZCUcpaX+Af8FWkdgZq1JYmSpmUfDMYpdz1vzdHslilBLhp7eSP1v1TMhnT+M4OXcoJdgeYAxPDlQFoUoQcjRkd9LMdIKpg9mcVIwvOdJXP4c6NHyJdqMK5LfCUy0bnKlqpvxB4Ao5TGDYjcufsnQyfESdad5N57cnznmUWoRIikLq3j48dnRkSEz99q2CoZWtPhLKqdVOJefPQv1YELjYrEgGhIVgsynhWsI+SWwh6OUrRFuHNMDHVxIUwploAL/+TVb2ptQPmYdRyD83bt95liJesqCn4DX4nG9IFQM/zysISpj4oMxa09geL+eLHeLvb3hrflFcelxOhSWuLoUPzKD0c1a3QtVtlLjybcBH7JMcV2yllx3f6lJVbO2K+XXliUVrVLgxOQBXoGUIaYSTnGdhUPUXk6BoAGmUKbxML8+nWtRlp24+JjUjp89nq/9h+p4JrbpFG28xx2WB0EdEmg8fHCcwmEM5CV+/v11Bh4TgEAAslWFVdxFJumyyYroeHAdidDeo8mVwlvjs9G788tZUhNQA7F+btYI//yAsqCQvnkrqLaPImwx2zkUbLFV63BpGfv7hqVOiWDPNbXLxQAyU6cACAsUgaX0lOFWrvwkEEtMYKfS3las3TDRGpQUsf1uoTtKx1g1nsrpsuZUuYuwDiQ+QIqDtrYpC22ioJAuyWW3oA7VsSw54BCBszm8NB56e0RwPGYErPJWmbmpSHxd6OKk/6e9Gv7LPP7Cnryt3WzESMdjOGS4fJjqxUQsk2/KpKbvDEmncAdob29IXsuBo5+5n4WqL4lXwDLoHd2M3DXo9f8FRNPx/DXwKYcqGA89FJJ8Kj+PABuHm+jdpGKFOsHP4UGMtDX2eNJroemlrHvAoUVg4a8iN5G5+dma7QMKE4tR6IWxYk+Ijl6hrA5FQXNmKS784Q+U4Ycim2WR5CUsy9FiVnOaZnLFGft4RCPuyesX3hgg82N3S9BjkbjWWl2H7K1zJC3D4eNHfDTyk9Tpk24VeOkjGW7wbmnKjUYPtu4XiYtWve3dyvQJbrC2/zLK7JbTxLyWfr5aAL4BLJYxrp/S25u4pqVfNy/Uc+6089H7gx3isNKdJ466I1PCfWyh8jXg63iPZsSiHC7tIYzQnO6ggsWSsCIyeMfjB6hiJfUeb6lp5MJo8yAw+Q17AD7QKb6PO7/Is8Fa1b0368lfSX5c0QtEyV4QpNbdIYxxcnBSH+CsRZGnwgeSvbuZvFyrt54pS63ytFG08DLXnbeckDWKL60j50R+koIOKopwVWpdSTreXJBMfUizhXM0AB8cm9rqQw3/NGphi8EIOZyBXSFgp9OIeeZP0Ufkwi3CGFV1e3q9cNI35qF4Qd7K4sOpr6E9UCCzOvOhUwz7xcn1BiLcWSANt3DN+UhVGK3jFbLwZWDxF4rcbaVLP2zHc0uq3+p/qQbHw1RZzq2plNzfpNUPM+vP9DbjbD4GbsK0Jden843n9guiBRjdVcnMW87LHZed2HZcefWwBziQ6FakWyLrhgPtq2y+SsQMonoaPCPQuQ5TJBlXZ6gBj98NWuwlG6pEJC8vHzI8EMMSbn/sU7Dtlt3yzuxK1mHWb+BheTD2o01GKBZBdGKdfllN9LQIyu8XUJHOvagtkhzBCgbL7c07EngPR8oGd9iBho9I6Qmm4JnOmJfrxdFrn/VyFhQz3LcD7GQyIQ+LtAfaIQYUB+LX0AeYLBSMQTDByBu6+1HCbScdGlNhHDGuh1gNOT5bl0nk3ExqUVvK90yy9AfGI73blSgkHOiObOarzGnRqrf0o9Euo4nzIdC09aXPPZCL/OmvtCPLUTqPHHBaNCVlj1JZT4L5MvUKXAlAHA3gsaPJPgLC1Gg0eSCepgGBt/mve1icG06uGxkwOjQX2cCIwZz427DlPt8yHZ56zgm44Og84FaS0jQkC3DXKl2UNRVKaO14XmwSDmpYR3rMycNvNSqWLq4mfDBquruQxziRkKNbBqRzeext/4OZdo4KoSUKovvhJvD+ywn/3dtBqXaEoevBLqMPfq2YrZc3fkNdzYzqULE/6qfWyLWUFtI17ZbZpRWFwbSuy7M4WmgF2ieBbzl1FehrrNlscaa6OOIKTYiW2vDYsbD891+GLQFdOevY1OKBT1L/0XrkMeLv7xFs61WKHosmhA66mlAJx//XjX2CK5WhzodQjMEMFO0oftgokBhY9zIuRYJ3LqSUb7CoR5X7/o37CRUzJKlB9lBrtFxSzwVyrXC48FGpFfZ+0thsFXcHKIKu/V3P7oXMtkewx8h0WuEHs1kutvf3hEBYARmJ8WkIdpxDIlyFO37Xk/E4DBJWOcVDmLxEth15HDy8k66H+WXkKckpR7GA8ihcEWFKkpzZMqdtWTp1zFV8ATNlnUX2dyY0kMNjKXu7BBYU0uamzH8GxfjlbYIDsnJMlBtk0jhRXwiahSoL922bBBX27qoFnju0V0rN5g/k+RNLk48ew4poIQbpNgI+8Z2BCN1wwn60kJtKQ9TNX44ohX8PN+Dnrw5cNLwnrPrYvRsFY7TY6UlVQwNO3B34MvlnC1pFADi7LKRNYcFe71T/9ku/QNNB9YJxfZ+s6KQxgvbLxPyXlIBSxmiXD9l7diol0bgASieKQySS/AaeM/6lpgqgZPNk5XtOuGUKTOrxT4kWJ8hhHMIrSTGHbRpiaSP7VZqewDV1hFwV/HtjXKsnEWhClLYMoVn2bNREV9hfGuUR4lakZEmoRCXjo/JmR4GpP9pVAFRoZXRX66cwzQj/tzBD+ApVcVFozN3r5l2Zx3moasqcXufkMhhDjpelB82zMKlPvekGee3Ur9zKQI6XtXsVFUZ7byONjwQlUduD4FYY6oAcXoNqtu/8Qu9EMXGp39jAdSq9Q9lCL9U/GZl4KSHo8s8cv6+6uyN1UG9zCW1V1UPoovEXTAYgrrRpUpymcKnmCKNEtdL9I8uVAuLK6F2ZpMJpyQV41Sr4gfx0PqW5xzYwqocYdzPDy6nlcL2Sl2GYIzjgXxExoCFiqWCrQiplpmgB4zOsqOAUPqjRBSbXx5Rno7epsOp/bo7r/owIgpzfnnkI2SxakCIJjNLE5QiGPgsM1NBAbiS3JFbrwU6+ydXyLsqYxKWKmJ5le95ayvAEVnE9/rUZ3F9XOxpBJniHvosFySPrsf4OPkaHJE4aZNWoA82w8IxyBaPow0Rk0MEf8D6bH/psQQZuho7G/znSiZB4w5KNSWDkThAfFNOWFFrSiC2f+oIyKD6YGTXeGOyI2JpEGfosB6ek3ZeplAwHptfVNCFcDmN6dJ++p/mO0BES/RCDEuMNgwMYN9gZw8JM/iJL7QEa9Sgwjc1n4IJsAEAgdDLpFDSZk1iB3Y7MtBGQ48SftTcGgTe2hpzFBh0bnInjYs4WxOaU3tslexj/ZU0ntEg5VkeVi8aVpI6t5oHvtLlBM6jWEBRQd/at+U2zKzRltq1RDeDkHDB5zZbfiq6txKetL7cVv6gpYZqSob2VZrHHdsL6TR1orkfFt4xATAcX2nxnKzQJ6gjM9B5f6ib/uMF4yxlpk9lYEmxPneGDBZAivqAIW4q5eoygZByhP5iTXTOHsYSN1ATyBnOC3/vyw170oNoUiXdia3zbR6rogAHfruG0nd0KcSrTfm5vmQ0KPm0o2oxExubAZzIFN1r36JurLPYnaZPCQVHnUtK9VdBpPMpxvq6ALllDzolrf5h274a9M51rlYZjib34TcLlBLjDvRpXJtCfv/ht5/lUOPW8nAFVGluMu/JDhT51TMltzbF5Up6+SgJMOMcj02w7DZxR5HQa+DcHJimqZJXHDYjFjUgpQ1iyWSifT8M85fbrL2UQPO5vqJsnhf+fx25lB1s2ts+gCYnVpA+vWl6oJjA40LtTWsgcS9uqpcVEupGy0+vhcugqe3utHGHJ5icxJ6fUgH3BKyLfVAchFiC0FACEp7fNJI+iZlwuhhQvzU0WkHuaiVTMyidIeouD2aYVtl+tkvhUdA1gmJ0BovQNQliIivNhImz7P/muxivTJmvZJir/3TNPqhRc2TqUp8oTmX3SC3xbHV+JetkDsm1VHbt6qVchrF2CbSMVPyN198/HfOuHq3bOK7bwMtRNVaX3ogE/AtRRJ6ubZAKg9EMdLCxqPqal5GV05wmGdjNIUEuww+J7OY7OpGs4RvNWYHehRsFbTVbZy59IVkLDs4Tmb9Ql6CtrHsBSyxfszhPtfdp8Lu9GAPAqjKhz+UVr1YRlhudQXjVmS2vn/7Kh40E1aaouqv+1Wb6GiZE3EKD7cyFA2zmeY3086oxBmRev+U01cdqgC1FBmYP7/JDQV6jWoqd1CXm7J17iiMFBhw/lO2DWuDeWBlNL/Mgu+LqgNjJltVOWqyPrj4mYkkos+zKXNkp57JyKEJ1mlsLo4GbWXBVvnz6Kt6BtNoGu9cICfklrg55k6Qj8RgB0abdzE0Xy5kTE4IppPKEKMxauLJAgEewBTNDJw1l21o1ag0b89lo7SL9LyEcX27ymRCOeogYDzD9VpmucKRMvqN+FzZI5j7PdBB65Q2Vf/7yaWq1e5UIQ4Ig0Go0re6Tc58KyUJyP+BKGfby3HMuFu/Aa8iof5Yg82xBnBYEbtzHycvnqat4jWppjjqppNa4ZN15TNREQY9DaQ9X2hGLQdPCDtm5Tv7aCoD6eCIX6YPweASo5CgoP8S7smLCanxYiSa/yuyyJJS2imPVl7Q2Iw2KEsBsqVjt4G65CRpPmCG1x/BFMKra3q6KaF/bC5z6G+r/SB4yFTVh09HhmuzzPY2wd6BiWciTo97v/AkNKivhR2cydUbmcayY6pXmnMg6gXC75nGJZc4Vngj31oujxYj0sPt7YXPb+QvPjFFWLJaVd8UbzQR2Z/cErcYI41o0pkvJu08eGeANSQVc5GtyQz93Tmco7t6ymk/rh6VCaO164IC+dWDrfwJbF4zpQ8tbyXMucQPJ2BHj7xahMZxmPWmyznxO7+ysJdFnNsZDJ4l2Wrnu3KnXZnzRaORhTXuEhlrH+a4ny2t9DtbsUSqpR9UJsrxi6+Sqj/PMlHKGLpAK/dczLo8nFi4B+MMFeFMgrA0K0bFIk2WyL9pGnFExnpsZiGY/vIWh8PCgoQ6Etw/gT6gEZLos7Cat68KDgcW62+7qk8q+eT7j7VopDO3HFGifWf/RqZ6Y1mVFAjMBX9WtNLOh31lIakv9Q84+GotPv8GJZQpfQOEvWNA0Fi/LdESecJBOAM8NRAA0k7hkG23+ynl7c1hfqJ+HOxRvqEQYlSNEWeZiDsvdwRHZvarNPPf4nXsCh1jz46hI9InGJ3RyflRw2sTppvw5SejJPbOgCVs3XLjEADWlRG4cbVCznOYleBzRuaEqb6P4Vj8cyUw9JJJrNHxi+hvSrFzoFMtc12l/Sw6kJtMod7/yuKGHbfnMNRm1s81iPVtc2ZBt576SwmB0DuhiJ4M0N8AJdoRjCJXXjAyvghDVNijPlsQRR5+llw08E02Eja9gA2CQl7k26StJ+K8LIUtsHxxC01ts9PmgSqOQuNOU0R0+2ocorrDJUiL5CYjpsKLj9ZETyu+maitXOQ+QU7DrCBbci8wolVwUgK2yaM74rUjFNc3I+JXH1MHT9M8fCRBASQl0OBjZk/bNEmP2hmGKa1fak52AT+3wkbi7/xGe5tnOXOQnBRPAqHqhl4zYZ0KXCrr7nb5qjUlq0ZTwZIDLOAcYQ5tpHHS27LG5VopXHRPMSOKJ2EVCUpViDUreyz0PlGRitOUjZwA19rjiylY0hYJFiflKsHBHSmDIMyJg5oOh3Fdjb68nAgAafzvgnnL26X233TKExLVWuuN24l8S3OBkWuKqhAaEiKv+dWeHzkt+e0XNZH2FvWt0SJawYeZ9rIz03vMfB47u6qxXfbBix/rX3z4w45hpxxEWathBWtVqiWqaArcfs7FOAwIv329/pIOtJTmUUhQhZCCmtPKaIPhNKjZzw643d7yMJhy+4SA5iXovtD+dzSIWNqgOdG5beKGePbTetTD2zJJVgPpLMLe1SrkzPds35JBvitVdbt6P2SBze5kgnqAdDka2m4Rza5ZwHTaIE0RYh/+yaNAq331oVg6Z6HYgP49es3OmDNfv9IXqwGs18cqjXrMwvhzMZSjmW3V9nBNZuca0Pqq/0DDeEYUr/AFFpA2O09JTyoTcrtoQFOfz6hWDc8OFi3Oc4VotS7dZrE7RXhdRWUdDydrI80FVw9/IPWOw+R3gYV96+74GZbq0dY06+JdOZgZnUTIHdGlYjZT3K/2VbDZRUZeNUuGiYKoIiQJ565CfbDmGQc0cUHz3vhWRodCiIaI1kxGFWTml7zeDQ6GsPEIotgPNMlG1lzP0SrUZbwD6T/btZ20vIwi4nBMaMDJpN/V8P9aIdpqECOKEQ2DBzqAczhc2wftpXIUBMK1f3VX1u+D0phtnR5GyHbCLKqoq74v4sHG09BZxFXTiyn6dndxwdL1gv93/LKMl4EQQvV9UvvsKNSkWt4joo+aBVpxgEX6HKsSxCkFZwTzdMI6ZI8Im7Fx1d7L1ohCNkfgQBfywRkBuDL+XfYG8WvAGL4Wr+FYyniu+KtdqFt3OUdcBwPVOYSmQUeZm4i4H/0yYyn2UdPnOy7DXblD1toBZrRoAnUYuKdodVNgNn5hlnsBV5knnLy08xJdpbQvgcV+WI8GTpAijGm4MNZYEjnXfJhsYr+DTcIRMG4gPUd4oa/j2WQqCrxqWha1RvPD/zbJ9ZIkYHlIoWSL9+QVGv4pZ+GIL4OkCBPx68bc2JaptF/9QfXXoHAWXEQ246/RQQgui/bI3Op+SJ9pphgbsBH5y9mnPxmkJDFpV8Xnbs80QmFDRoTVn269ZuiADn6Sk5dHjxWje8Nv71GTqXAKWTMUuUG/5fRqmdO3+cDVaRt3pQDRW+iNITZEyf0PG7X3pr9bjKvBk6wZpqCV2ar/b9+vYGq3DjsSBUYDBC9IGK5tNm9LhDhdYCq2wOmpdeZOBqZ5q7CL9U/9tvw9SAYz/WO+UsKaDtJKwNaqqNRXPzJbHCZ/ELr3T9IhSP+wy5n/3mgu2Kak23An2AtS7g3JGBY5gwemZRnAeLC/7On4+QhnZSQGfwJo7r54I8cL+yr9TMHPcgoHH/IXs2WOcIHm4A7RkWIbjDeeJtAo0SyAxsiEReNnzdnOuU0HFWd4zlyOHYJ9kTPRsKKwM7IX61dprXgwMhBYCJ+DBQCRGB/uE9OQoti/YeP7MULVi4XY/QKeHfWCvoVp6LxZ9ErPP5w/YvguoulRVdlTNVH4kccUcHARSsOybbmNe1ZZofWl0fOwPtzxOEbKLN7HI4BJYUr3yVspvcL7ljrKQ5YM+hIgfkP2cgVTXfHFl9lVrq4V0GPAgag/nu9GQT8kAqL8pKVCjYBaQuC4UBDADBqxR76nPVwFdR3P0n9FhquLIlpnLpNUDTqKmo1M0aTs3Iu+LNVN5xkD+MouANaCDArRt5+7zBeihNvN54Bw7Oqwph/qAXxo9LXm0C44qAF7qGn20V99MQA2HOvLHsAEKxvrE+q15GPlS18aEQEu8N+22sXiH+jzhPHhIgQ57bzzm/UTWcEMLXvN1tBzp6K0nCmPEn0BnLSgJhBUEwUECSzASZQ8odnl70kawFQi1oKyNuVATiZUg3jmCKXbj0L358F19nJRwZe70C/YXJlJn9eAKmGEDMwNbOR/s6aMxrrilcuA0sF5we5EUYCxJ7ynbtdBBOfEXhYCKLyfcZuL0ABspbhFOOBX5xKkKuxXtVqUMHaoV8kaCzOPwaltC5glp4smK8C08gvHu15cGfKFpoykxezWTmnJxdotY6sW8Vyb6JRSO3TEZ1QacoboXWVX0N1VW0eegP5RBs/mbD01OaKfuVfcm61TZgw9CwoKwVb9FunAMULheNCbpt0Zl6oPTPLWAPPw9C5PwBPRWu+YMdeXya/y4So1vUsvHSGRfQhowcFZYFisZdJt5+UoJ9HmUQfl5ufYBerGyUZe+nPXwgmyHN41G/DzrlKJjMBUQq+xL5H23Z08VvWHQ4YL4K8J3he9BbxdeMstXrzlBtUefpApsH5fv5NujQnHgNHTmrzplUMGyCi75kSl6Ci0BcM9MMJZ4LiS7fRU3fsRpLWJlc8chrpIxIvRHm1TxdOgEcRqi1TzjR/vlOUkKHGYnRP2/JO7EWkKDc3xSNF/ZGwVdF8N/MAOu9yjy0JGVRRgkQJMYC3RGtPZyKfybn1QPovFY2ZYeFIHGz8PEnQ0CJg1sXZUMY6K0L7W6L30aHr4pLeO6NFKYO2QvtEL7cXaWLVBBSImr8I7UWEyV/jXkMHlMzh4y3cHi85Ti3q/7jgVUopv4I00SitS3WCmi6pUe5MhVKqo2xZ6+q5zR/ELERbibV7nPWsdP2lMQB/rMYIuLGMwpQ1B1GOuX1ZApIlNfY758i32Hu0u2pf2P3/0+hxOb3ya3wqo4pLWbKHhyxJhRoi2flkMj2uIDY9I5lDEfJmQOdooUA8I2k/UhXEnhEZV3me58GxFUrZMfxpjvxmwS94c4zEg4hQJxNtQbGvo9IcnovnbItkhXgaPNMINlAMcoSDOLoGyWiLi4su2W3XwNJiD+yqf7qGyDXc2J/DSopqZKK5zZgb9VB3Sz9ZtEcA99LE/ulLhbS9ZTvnP9Y8Cl9rIrQKn/Q06vmSW7HlgKJChqclYC63f+zIaDqLfDRnvTiipgSb/11F05bYkpK4PD3Xju2Q3h0e59Ov0uoIOCEr4OYLbzkieodGG2W15gpxDNvKl4M/yMyV//FUZJi7lScu8eI1teNYYDpgqMqav84DihnSsA4wiAun562FRN3wCgbSoB1cu2T1IxpiRYEpC4F6KZ/NpZ+SBFA51vUJrsC/r/FLqLNthD3nN92UKBJMRu9VA8pQow6y7+t7NDwE0RoIInWdSkp7mOf3OX1HFxLmbZ0mfOnHSdRE+qQMSN0zcdXPtmprEiHWRGBmkhZYtsxgb9tdnYxIzfhyAdGEK2bFqbF6pDkMJRahDtriWuzUsp0lT78YUUQfod/S2kUnn7S5k5gHuVeP2o6SHGw22t29HYAa67FGUW+keKDBCfF6IvvK/zVSFAwfnSAaktAgaOlQ++IAz62kI8V4+H9ls1LgbDfNfxQUjChkGLreoZip4XC77sUe06Zp2wyW5DUmkaJfbuUeUW8WOyvE6pVRGn/eXYMratodyGaEygj1kY3KQ71h2AJaI631cUnMWG2SXrmFCfWhxLvuld9VJu3QI7xxP2r6JyDa9Pjmqt8/AT0TzeL60PQ8wb8G13Rkc/6TgyupoBPM3mEcUv5ayNhmw67H5yVJMuNrB7xwp6h9QwXIDT3QS4QE2fFNjioBIeIKC6iwMi+rZHukfQYyu3VxOTX0xD/mVh+IDrtyrYCG4iMuHOA/GPCz0zFfIz0eliABLnUzmDlEqorGFBdqKu42xbYkVSjTqqcGQXPZouC/vRDhmzDp744KR8BhK1q+MGy0VvUDVQ4k4Gr3cCtglaUjzzRlumf16AClfRzlovOme1SCmjtU2rIdt2O5WVBjTkj1VY2lkzAsA+9FAK5A53tj5mhdVQuCXdzz0dr2DwO84+VoWPcCXQfipQxFK92Fsa2HAd9a5AAepbMwMNzmMmVoNCyrsydT2E6fesM+0zKb/ups+XQMDKyfKUM4FjNIHt9gtiFubM6x5YPl9vcKCoRBD4DzTdEyMGTBjrdu7IARLLrUHGcJ/vYeForL6jofJyvUq5AWP1QCvvFCT0Z90VC2MhXaBdDcdjSvYKTV210SJVis1qMCyLKCmJp2tA02GvPpKqT7ZB37B3LHsb0DpNW8g+CuXWnUav6+7LsDDVZyNPhV+8knCzYQCXEqIrA/trtJI0VbRPduSD9Pt5MaXFlQ/mF5kh5NVCkPVbO6yZURtZwRVGnX2YUKTDrp1hgM+Nf8RAO+/0i73yTY3oyEGl17R1fLQA2OnioMEOhEPUbypC9XUEXykoMs40LG7NzV+frqNIVAEW+RXF5sMDVfxCaVe1fkJLmAEGppRv/LmKZWlC/AZJkMYA7X79hsXaLTeV8zJi7aLciqftkvY5lEc4hvFWA/bib9X4J5sVGYI9RibHn/27Xzi1kDL1GpIQ7Mrv6Jew+QXAzx/gOSqocL9GfROtlsXvIqoenL3+qRGv4meunsZfvqcwayNM6lroVxS2kT/TsKRNevN6Kp4rgaKz6/s3hNzazp1cBdHJBtlsLKWJHp7zDU/pVhPERZfgU57K2G5E16TJshGVfExXZ9rdZTVPJn8u72ZvscSqt3oRxlIhvaIy9MwyiF92LXKfCDFVBDnSgyq1tmUNE+Jb/JYTNSYtizzjz+pjeym3wfBGc5BSrmHpbRkqd0PIu/K/xPP/nT5sa8nZQpYxC5FASKSyJhmURym01GebSU89tjavb6QSppJ+lLeyAQF/QTFfosZLjK8TFZ7mlu1l6PCX12GZXUZuT4Pn3RZkARGYUAKsfHotpuIOgTOThuS/acwEYlAZmRkpgr5ii3n184RMMYubt6PJNdaVTchAAmC6FuK8qnFCjdESJVIxhAYGH1CI5E35GFQI8VT+KlZJPHp0VIxonDaFPQO9m28PpwaS5SewsW4ege6h8s67AbB81xLHYTfNIPOvbMaZaI0PRrufjvKB/lqJxS0P827hbbRFoJ9TC2vUa9hfW2vA3CVSpIulkd9SPHvnzEFq9n7xVbmweLPeqSngFBG7hc+7dweb4m3jV1QT6EoWAKwFdrW/Nj4CYgWDC/U77ZgAXr58luH3Dw4FvnrAY6E+g1lU9XO7H+vxbJOaniRqCkwFYnNQunbzMViYTvYwugdxO0rVvAuoPrfTaU0pKJ4C5qJcthUlKkrlPv7IWe0VyZ/MViSUwKVCaEj2NqZsFrGeKKT66/SZbmaib9V9sed1LtB1Fbs9vExvuCwsPULPGvgFWu1crOCsXtlcmjNyXdJ7qdBdZb1lNh+Suxc+LWVUQJCFeklyR5pre+tA16c83R37T687Qwy9SZYpwwGJhzgs4WdejywsRj+/k4ijsbMGm8e5JU8H8gsc0X56+T0d3kn7GdTXDHyRAPn9n67dwAfuX38OQd07UCRsu3KM30/TV7c+U04sOmrPYuticMwDvU3Jbi3/lZLbAjH9livkGgpUMCQNaAXy6wK41NKMCXQrfaEhDXvCiOh/po9EV8kMCaHmu8yEsGBVQneOX+18+X3G4EEaKEm3u3SYrT7npyjM8OiZpNb998E4fL1mT6qBTL3xKgwrd08UP/jyEsH8k/TCybTvIAVvhdyeX920WHfLt1YIewjN4S1NgPRSfjDeoX0U72sLGMuwBHYlzAV64Qv9boWzZ3Kp37haS5e1/cHS2ojN23+c5a6t7uFvO2yMRNdvJFY3Y/jUywSaH0vUE3tmih4GMArmPK+Jp9QaO9iIX3bFQtOjJdRwXaTl2jfdsVpsQ49Lh4uDtPuTfiZwi6tuo2uvYbKV0gYd07deISRI1UbVW5dHHLscMR5aoRqekgHYWG32QFBMEDKnxF6QnxsTxQX8oPQPOSnbrruNstYzDq2ygvN+ROsh/1WLrL4tJkjYYOsZ2Rohib8BRUFLaLitasFRocVMRJsdlCC67FI/kld89BIkvdwI8Hw0N1de9+deoLQJ7TrFt8ztYcF9WKJEHOG7Ii5+BAD3GD3htxpHM6+yw0x1IlKf9PJVsf3YxGSt3lSR/NJ2YbOXdljlsT1FWkdap/YtGhvYQsEtmjBMnwf6/HsbE/WwpL6a2U/hRNjlpLTPsPNueYT25L3gfoP01W89xHVNYlP+DKBrqpvg4Fau99tJrelMW35dabR8fISpzOFZgS069JwgyGMZY7/ihLzRSwE9JKYzc9tQlWFPpa2dQD7ewsIoT+OiT/tBVsJKfzAIU3Xgfp5aZs5wYSMg8XrBE/kvyqc0ocCjqFe9cZpY8ghlhj3d1iiSxxO/0oKq+SwSd9qv0aUMgELm7lwjuk30St4HrArjwo0ieQV7jTwPugnw+Q2Is+yW1HuS2JpbSaGYqT7Yh5eCUWmr8B1RpqtsTapb4IcwCqyhJU+Bh30kxbsnB9/45nnxn1NdJphZMktf6RbjtQXasCly1ob2xCcC/7eAq/LTiq+DtVxzGNxA2dJtq0bn/ULEW23ZwxbGtfV627o5jiFPUmtmBrHxrOulaoQyip/eRxypH48eEzoi86lBBEJLlNh+CmSBZcCpDID7bGGPRC1tQTkrIHaNvQhNfPSvE2iX8o9uHwyFmjrG4jvQimt27psoKA85WD3wm97g+4hjSk7mEapof8+Xo2h6VVMZM86XJhQWr3QoHVLKJHC3rbYGR5Zsw879+u7b11ZdVGJugWjwHvUDVK9YLd73n/49HzELnXslKopQdI/Za5QA2ejpSziMY/2eo5YhIOSEBHxlQ7JfxNB3owGG1c60/egmDEz12tJY7N4Y74RbxUMEjsDJbn1qZMpzFC8hJCaORdEa78iYpa0htj1U4y+5qsU5ZdZkQsmMJyTr24l4aG6iFdnWqtE4eVOlxrnAxWcAStTsOTs0wBK35L/z/LFx33G0tjREtwyyPDMjxkGXxNA0cMUlSrj50LwZ+3fI6osWu84k/8bUDmzIhZK/ASpa3JjK3hLAxQl72omcVf3hrjNvQ5dk2EneDrGkvUQiCQ93UxunhHJfnKsiw4L+iQtnLbGuZmMVLW/ybOeMEbDRvNFC87Pj6gsS4aa6c3UiG3KshdnYlV6sZ5uziW3F5i5izThEGkiesoScNUcrp4jU6UhWcol23kcQiBJMMMVp8FuqEsGaGqSxI0FU4uo/9z6pXCX853ljk6OEncEKleCP2h79Ei6tJwNCwHH/rAjE379aCUkEvGm+gWSw0OziPcnMlrryjSqDgmDPBS53dVtU4Y8oSkN/mMs+4RvBe41zBA9f2IlC+w9isN6spyWlnVuEFr+sajo5utA8nHY7EMenqtQg6e78tO7WmszTHIMhxAbflCjXRaFugj3tUF5qo8/XuTEUH8ZZdBKmc6Xk9sgjb3Nw84tEeB/9wy0UIFALogegB5QaFtKj8JQPONu+1fyNYfrN8Ckf6BD0o7FNEOXZ65cf4WdFWqcDHmZq22iMSFhSW5W4WU62RzBLAWiap5d5F98r5pqimxKGXqJ1cfRq3Vx8oxk4JzDKK2nLpCcy4sWt6po0LguLY5Nf4QVtqmZcsxhW+mDD+b096tMo4pseMr+0J69ZPTEdYRAc7wayRUhAsbhQDmZut+ZJKnz48h2ThlQ7mntyCf7571dfzKPQGoj2BdQVLBMt/FMH6hLcGw9/pxmjqSnE/OIR5MsxT5EuAgq0e7aKnzRMHv9YitgPex+HSYSHmoxcn1oNv3jBgxXbFR+W3lYYjQVWlOOfz1Na8cevM+CveR7pjXpEygtGoaCXBAQ8tTtlIM8NVpn4X540lGoF6Xh/o3XP7QUDGKOB0mlFiLpfF1qTKrBn3EL3MFxEAhCdkMygPG7lEwmSTW3p/CLEMVbxvrT+21EAEnZN0HliDbp+a6xbKd1ICMI5537J2Th+L1rZzwSh3P91wwo2V2tGVNFH7VNVYec8Z6AGFVMkWUzWKmRVSI2a6tMBHjdQSdyLHPa9ikxN8J8sRP9j9HpHKA0cDeTHaOcxCQe3XKlfiB/oRcP2LzVtKUsmQfYCmC+Ycv8fW9XZ4Kzz14RFejSmDUZfLpMSEBlccoYiLnpAnr6Z1OCNxiG6GzYOlgrNR7WhXSTC5tNPdbkOcwP28AVXv4h/3k7CZYuHiA7ahcY2QLeUPZfgtAgJU7OUQ36enAIDv3hDkaz7sj1K/ow4rFiZiHX+4ZatezwYYHhfLvtI4Pm9ArJUe/LQLFGPbJHcb+0NmglfHFWlTwJ8HGST0CBd+Xobqyh2JPc7gMY4yDG9SOFNu1JKf+DgHPnoMdhbLYvv/BR+GPhyJR2T6Mm3xtoo+7TDsqXgQYtTw43bz/tSX9LFHq3QSOUgI/gZcl5IQXudtcU5m2pIdIsEKDThlzhVySm4hFR1Ma0FDG7gSAKOyPNtAAGFm+iVFD388adfNsbhpzZkoEgaAu7EgGj9N1zwt7UKCQ4IaEq57+dcIZlXKnxQmzCbk37gXJ5wVIQ21lUJSbHStEXzxc9/YSsRTnLN7HyYla+p/ROvL6HNCO7bczhSlebpC4l3PpTulYgvdwaoxWCA6gx252me2vgdmcEwWX1mIBniArWvqlyoN6244l0B4qn5MRaEPGcZtxbWpilEX6RTZ18idaBuY/Oo+kApTkeQ7zXV2VHuv5U4Rei9Z0H9TP+dr1kvRStfawdluUkPZ7mBrG7qYWfejYockzFvQv7Xj4pMztlmnN8FbFKWby4A7Hd97SWVyGUe+w9NNcSXVjzulp7iIAyZnL7YfwmVG9rQfyOjMHxvBC9T20kHlqjX6if/ux1iK9LfB8853Gmby0pNDQtmxO80o0oU9QM7nlJ+obxt5MqA08JRP7L+CWFoKhfyFKfmJMB3iqIA3OxMpvETReH+Cv9ecJldEVxgou5pqHex0ah9aM1OPOPdkbvV4lxPAjyAXP6vwewS0gJIgtGw5vyp13gNC5j6RT3hU4FZP9+a6FwqV+UMDGRRn/slzaUC/UkRlVyWBIEvyuAlIClOBeg9o4yE7zSBtlXI897Bh5gDCAIjv3rnpqQSoUkJyKqB6pHJeLHlW5JOCfph09hex6HqZsR6mrddSPFbDVsruqLwOJ/7le7NS46MUrvowko6noKgLFwY5Ge6q7IiqWPuQy8iIzps39el6dwiD2trKiMipHMcpvfrh/PA6NCMfmE6oRa5qym1An3crFMhB4GJsjJiO/tAADUewPdB6DcLsMRPC/iEN0TJf6j9hxejP1PGVIavqQNHeKpqASPxDGy3e3o96d5VAGHjhTqRZPO+FC7A1W8d/d7ymhO96FYvfJRdFdylNx/TherHxdOQhLaI88hsBSZL0NTm1R18Rkt7Cu/9JHe2vmDktQlQZg/Y6+9/6QEpYkQkCCmd7b74F+uMdBCpU6VY+KB9EzkcxSre7O6OpOl2IcwXsqpi8YanHfb4P49UB7qlTGVNPJ/shO/depWq03FNN14C+PheaGb0a1uIIKLUXnbu0ixsr1vOw9oaZ43tklp10P3fP1J0BCuiIgYSVZ8OPfCw/QrNC+Nl4N755jrutQH7mwy1Y8wM0gQHyet1mXdiIgRSWTATznSNukeZhdItqjY2QypitzOIYmS3Ae1sNQjA1lcmewBpaBxF6EgELzTtAyNawV/iHjykdsvFG8pkXlJ8RrrSmilmEcs9MZYKoxrwLDoFhv+t2lQ64V0m9JGE42OZwkNvcolWv/wajY28vZkABJ5exp4RJ44fX4+hiOowJ8O84otWHhamjE1fGA1u8r+tFjmD6o43fuQepWy3CEsuKRRtOWCx94JgKJxpLnqHYp9IEuYf9ZfhJ7Fi6pbd1RbXWnBHkTwrWIt82rLBHEuvz3bYEHV3zdA0+e7jQe5v3vFcoz4Jm41KtWyNMRCxqeSicD7xMoJDkKStkWWiHKVJhK3us/jtXHMtgvCpXj5TkwF3drJdVuEJnuC8WrIAxBHclqUVNEecmSUNEaJQwBgrpX+Tw+LFBT33OZ1GjJPWRbWL/EhX6bkt/1ArqUh+nCuPJg8R3i63uzz8mlbnPskxAaPQP7mDIsd2VxzBXNrwSJ1o3lzCNMUp5hqgW1gsfKWJgRyHCwZEglthS8O6NKw5LrFtAwg9DwlgXW7j+YJ2flOy6cDYNtQI66IZZuP47Woj7BKxLx9uJYt2QD38CFNjYHf03AnrPKVGenpc+jKN6w88/Xb2PiB4YenMSkjCQxDVgRovB6ptIOisW+d1Sgx6Y4wt5UPfX0ih/JCxBzlQGv3Rn9lQaFZUUbnt4gOPH5jovdepK+lcPIiFq483syTW61Bd9f7fStZBGc64PNPm+jp6kD28C8LAwyGUjWbveWi2LKgF4XQudkizxAx4lrWJfyUeVfVoXCrVONaOJmy/Lh50AnvGJa+bsdZjXkoTWPwXfDXqPYnbRLr4Xky4BvbF1/OLmRFcXhyUsHlEOmLVYbW293N4M7da1XtoGmdlz/1UqE50x5II5EHQFMw4VhCKER3EHBgz8SLcBKHjlhfx8BtnOOz7jFJPzcm0FY7WICiv54FtkfpOXZSPFoPjLInyE86UjtLLwgAG4YJci5G+h+ARYsfg4b8ioTXIaxrj7t2XpR28CgQN8pkp0jko+dxHO3eICaa1QMhY3+geXDCGPneahBFcWT3fTZmz6P0b6KKTj8dc+FWNmWYPMGXKlAEHYjr3T8QezIDGgh4unlGkEg6A2ATYMQX/Nlsi8FmganQwZtph1hJ3HW0XRvRxKrgppG2NvygC7DtgwXAcBpay6zB915nZP2IqpmE3pCotzVPP8xqriZnmrWMf4cWocbbkQwPj1r2unNUFYCqek98SO/aQhdswzWijzJaE7b+qPes5E3C8Yp62t9dq6C52zmiSuYND1haAV89ewGZtROBAf2zjj9IidPOCdFYO//uKLSUTjsCiItRzu7niMezpAO1p3CBashl5gluQ6C3KTtiucQi4KIUD23NNVYWmwNuBiR0t9Fl0/7FCYJoPgJKpqz31vXB36sUN8Ni0RLbPfG++GMSzQdsQJqWbqZ4hupPkH6m6Vni1JhkcjeC0FiJpXhxgA2ccz69b+kW4KFU5W0thxdMrnddRHU0iZFIkzZ0NGGAQvDZDfv81twrgnBWYd3X1itLDHUmbw6qHguN63DEBdrlequbUj/v27Pu6MkRXxvUqMO+OVxRgN5s3bdCiLAClvujLOh0o8QAmwulWkw3e/0K3cbyiCvfHAXEmm/30Geh4RyN6z+2r1KZJ2E+Hmk9xOSoreTzlY78kFdflBuVVdTCSJL1Mdok9QpuWcsrhMcKeAcA4dbxHM8IDyIa/YZ5a/vXyqyRayDqg3cCI1RL2oWvJ1jE7sm3E7FLj8Gxw6tAFus+fXnaGQR4GgIuespg+5kOcNk0zQvmX8L6h3wSOQIZCm8ec9aGsnpcp6NKycNLYJ0lOxrtm9MPJu5sDlgu3SpHTD/VdNHMnXbTkx/wVbC97AABhYchCmFuFlpU+M7fWdxZKFftVP8x7w1/G8Yp4G0QQbAX3PMec5SEe/UQP+kvk3CZRqfhQEd65X+i4CHHmjT3Pnnt3BfveueomdFQRl/39//4gtytzb/tmcAEGdVIrq8nzZajdPjrVsyjYYSX4lgvO1pBlSkVUckzmAR1bVPQIxATgPnOttKuoo9i2qXFoPu2qF1x1LLGC//e8XeTVnbO3kkOnRbSTILOi4S8GpeHj5moPUKvJZNq+qku4H3d5IqPSm8LlskAP4WpLliVflgW17Ebm7HfoPOPDtOAAVRIX5lZE2cN5rwbS2fQiWzxm5FDDbC486FkEsBH8KnGXgLu4xkLo2ZNshlIXZQvmiKe8myKFSUxdXIGITPGpnu3DU2snJozB2RHB8mwFgHmGEkZcfi0YPelWur+jysN/zzarCFF4tlYPFGKFsk1Crh5zlKtu99G2XC0giACjxvca14koSjittOON9Ss+tY5WMtzINGsGw3V9lwIoxJJNOJtbJOl6qWJPbdZixA2vsTDnDXO9+B4i74Yrfbwyh/a9tXjTIzCAap7IOlettscPy51ppP9C0z0ifEwBQ7Y0rvo0/BfuqC76WqDitsPy2NJ6C/rsPGBN8KmerK6rGhgbgbU2YQ5VtuUwWf4ZkU5VMLY2Kv6MRFKxkyUMzPX/+CSS7ogbzbQMybs1morwLrj+tgxN6QtXIs44bqs1hw2hBfdcHC9m+xQdVt2ZV/jYi3kuMHVb2XSx1yLM83EYRO5aGdIs/YqQKsEXbaxLYgJH5ObVXIXXHyMd8ZdDj5s3PepmgSKw7DYYlZsdp5eI9LdlN0x1CvU34Fwx/1H21gI5tkQFPeiCSnPHdUGlaH/YJ4w8MPMgAs1o/T8vOGyFtLR6t3nnPEJCdlPAu3MJ+fN2M4YvHsSia31+nxnrLRg0GI46M1zebFSyelC1YUa5zQv3cf6jR/zCsoGModlt7HFE4rfV+ATxjQ9hWr9+/50R/J0F+X5pXLx+OKUlnUgvWpxx/zDXU+iiUGPZRLF8HKgZCzWEI7Q/8HPAx6xC6L0rHpS0RAqPLKRGf3WfDmh3+AJU3bQL1j0/l/no5o3hwL/Y50JrnIfiwvR8ete/xmSVKPihu2yxRnuGUT9mWM5RLtzty+mg2HyR7fR8EAYzCn4vXoFAz5xGE4pmh8HLhOY0WP7rgR/GeV95DbjfD5URHNJZaouVCxJ5HQHF2yIGC8UxfXBW+GokcAWJAJKlkbsO7iYbNeiVrTJwIXpuB5pQhLT0q4qwWPQfKzSaIglNKG2YK+MAeV7a07hL+35e0HyCcqL6KoIHLZYvSZfQMzEXOhz9cAKt64yHpJFNyevWBIkYcjttETTB7LW7j4YBjnvB+pIKU6O/+cuPgQPAdBYL3+8YrfwB68M6gjxS5+TfOF0IgoQf8dzZF0LAGCDTfTvN6ggMLuQgU45WTWCHga5lrwMsKlcBVW+an9LLnJDODq1CzIOLimO6S80uvSHpJr1hHmcgJki9d/z7dmYwe/M73/xRecvDQEtCnRiMPTgZnzJaOMAecBRv5K6pVwQT30uqm8nP6LYxaeRJOBjitz2iYaPZlVNAWOeQ1nM6tSUNa4OLWkzCDNTDWqm17u8PlHB4dzw0HbbX3mc6MzdlwKwAodtRshBYsVhRhDi9BW2xLiENpsVkyfkLNT6JLL4cBSc6y+i3hJi5WCExFzv6t4IzJMgue+dzjM6lHoLBzeIS4XUAkxmHjDpXSPcHHw/rYfAS9wPG0enXLY0lLbDKE2e8sUoT0oE3EcdbxwWPRmauGB0lU70tr4pPBXGqlW036EFMZWCNZI1V4geVJMyIN+Vr3DpadfbB3uQE85FgVGa0CyZr+a+cmuNY8h54j60BPCBpluNP7jtx1PY4pvSNkKGgEVJs3+Qh9QObBn/0h1+FHOwYqd8+KU6dKOvOcRpl+wqKgtJFJWAWMLfj9Ekxb2Glz8X8lTa+QzT4aZv9Btl3hO4MEjQiYSSHR15Z+CdJKLIa/Bgh90voBHxDDEdrF4l0nzElYGvHiiP7GRyGDNSkkp3xcCBNWgMtZdnrYmvxJ8bHXhAxNmq0HVIx7H+W/mWdqueO91bXnIA4xc45jlQfYo3dpZv048WwFq5VEDXxsBwW4K0yM59vnuZPjIIp6wRplIkAl6Aunu0UDfqHKuFwl03nIp4+1BiUe/j7HbxD105dFU9o+cy/1A81y/Drm/AHyQhDuV7APgk2ipIYps7f774Zjo7E6DjGyY8smg9k4vhVbqxAOiF8l84wqDNxRXM285KiYSgwmJucxK3Mhjs5rXk9yI2HGJMdz2Fy+FgeWjQFCBpq1gwScI5BI/V1WZVWUJBk4NoiDUF8OlHynXOn+8zZEJP76eRcEQtzAIapVPaylz4Iuq8q+oP05RG1syhI6tdQoxmNcgSQ/4HVLktG5B1kdMi2rNyS8SOTiC5WBvnil/sNnVNsB07xdSxcOLJlKFB2E0Ezv3VKhoVYzwruAjFiiRbomCeJFkJRBpeIIcQZsct5+NzNM6hLZc4/8wC1BDKfk1bRQDH+27PoLJvUWPM/pwiW6/iEpbjjzcdc6dwMueKgkr2GEQbamJJsjHUNfTs/Wn2KYVDartGZqQOI75oLPLPu+K8BsfAXCs0vOvIiAAR9k3aSjJIVeCpeCBda+MEVpNmwbuAitoglJqQosnSZ5FYNTPlEMyll4nfILmwDRm0SqjjaAV9GiR0vBDHOUfRj/z8bv4GYiLKz3L6+hIay+Cn4kUXVKvThCiiLaUGiVN6pCeWw1r05RIzp6wyYyo8gyPBxfZM5pLZP/i3hbliLeNRXhLM/bDNdr9N3uYr3XdxttRcn8aTmKqZIzgJcZs35vmIaSeqxJMrlsGS+JSq4Q06X1li2AN/3nOLmDoS859x+QtVc3+6RQRw0qd8uZ2W1+FiWa/DFWuxofRAS3DokbnMJUemxhE6uaPLfzk1g1ofVpfnc9zlRJcYxgLyPfzUp1pWZMaKoMHWYECM7fGGrJd5OxMpTG26vjJmkcvxERZ0GM/8xqp2X31N302CmviQmBD2Z7qzFw01ISw5dLVJ5d/FIJfKehzgvCBRYB/gebctqwAqb7bicJy8OPpgxO6ZW2WijftoHj3dvGhIpqwj2Dr1ps0AMiq7eKKZAyauSI6WG1JRmQkF+hP/1OX/BLmPf6fUnjbS6tpWZThEs2QeIiWqw0MwRQojoJ6oDRbHuqpkuutdKXZaLheK/aSaxykd3XRw4KvdrnXetlQyBwrNCbmokiaKT7S8AzQsc40cwcXuK9t0mA9kbFu8iKIf3+/VA7KWybZxlkB7haeTHBY0NcwXGg0/1quTVwBhklF17WrJ87TUgaAUqBYlEdVzItvKbY3//+oPguTRYSYU+AA06tTM8HMzz3nejVZNG6T8rsrs8DKmu/c++dDoo0OOsOu555adgrDAUy8v/9QYWitDASTJmYrRYk6NnNjl6CglwhuQHfknM6e2V/RZiyImWCsfmgcgQ7ECgTdFWhDV3uv/ZjdcbBLSDVwrwYVepHGGtr2+YDsKNDpBEOmbkeSCt+cQ9w8C8rVbegFe5axKJDaG65j23OO4Q1OD1dztYfnhUknBm7NlOUsUh6cAAAA==", er = "data:image/webp;base64,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", tr = "data:image/webp;base64,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", nr = "IDEA POCKET", rr = "https://ideapocket.com", ir = rr + "/search/list?countup=0&keyword=IPZZ690", ar = q("catalog:libraryAssistant.demoDebutTag");
function or(e, t, n, r, i) {
	return {
		code: e,
		title: t,
		performers: [n],
		release_date: r,
		studio: nr,
		demoCover: i,
		demoSource: rr + "/works/detail/" + e.replace("-", ""),
		tags: ["FIRST IMPRESSION", ar]
	};
}
var sr = {
	"IPZZ-690": or("IPZZ-690", "FIRST IMPRESSION 184 178cm脚長色白の本物海外モデルボディ 世界で活躍した北欧ハーフ美女 天音ミシェル 来日AVデビュー！！", "天音ミシェル", "2025-08-12", er),
	"IPZZ-893": or("IPZZ-893", "FIRST IMPRESSION 193 天性の愛らしさと洗練された気品 元芸能人お姉さん AV DEBUT", "白石るな", "2026-07-14", tr),
	"IDPC-032": or("IDPC-032", "FIRST IMPRESSION 197 ライヴとグラビアに青春を捧げてきた正統派アイドル 元芸能人が大大大緊張、決意のAV出演ソロデビュー", "橘春花", "2026-11-10", $n)
}, cr = "北欧ノルウェー生まれ・178㎝脚長色白の本物海外モデルが衝撃の来日AVデビュー！", lr = [{
	work: sr["IPZZ-893"],
	unwatched: !0,
	marked: !1,
	translated: ["en"]
}, {
	work: sr["IPZZ-690"],
	unwatched: !1,
	marked: !0,
	translated: ["zh-CN"]
}], ur = {
	interpret: "wave",
	fixedTask: "wave",
	library: "spin",
	external: "infinity"
};
function dr({ steps: e, demo: t = !1 }) {
	let n = Zn(), r = e.filter((e) => e.state !== "waiting");
	if (!r.length) return null;
	let i = e.every((e) => e.state === "done"), a = /* @__PURE__ */ (0, Y.jsx)("ol", {
		className: "min-w-0",
		"aria-label": $("process"),
		children: r.map(({ key: e, state: i }, a) => {
			if (i === "waiting") return null;
			let o = i === "done" ? lt : i === "stopped" ? M : H, s = t && e === "library" ? "demoSearchLibrary" : t && e === "external" ? "checkingCache" : "steps." + e;
			return /* @__PURE__ */ (0, Y.jsx)(Qn, {
				first: a === 0,
				last: a === r.length - 1,
				reduce: n,
				children: /* @__PURE__ */ (0, Y.jsx)("div", {
					"data-search-step": e,
					"data-search-state": i,
					className: "flex min-w-0 items-center gap-2 py-1",
					children: i === "running" ? /* @__PURE__ */ (0, Y.jsx)("div", {
						className: "min-w-0",
						"data-ai-search-thinking": ur[e],
						"data-copy-key": "catalog.libraryAssistant." + s,
						children: /* @__PURE__ */ (0, Y.jsx)(In, {
							variant: ur[e],
							label: $(s)
						})
					}) : /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [
						/* @__PURE__ */ (0, Y.jsx)(o, {
							className: G("size-4 shrink-0", i === "done" ? "text-notification-success-foreground" : i === "failed" ? "text-text-error-primary" : "text-text-secondary"),
							"aria-hidden": !0
						}),
						/* @__PURE__ */ (0, Y.jsx)("span", {
							className: "min-w-0 flex-1 text-body-2-regular text-text-primary",
							"data-copy-key": "catalog.libraryAssistant." + s,
							children: $(s)
						}),
						/* @__PURE__ */ (0, Y.jsx)("span", {
							className: "shrink-0 text-caption-1-regular text-text-secondary",
							children: $("stepStates." + i)
						})
					] })
				})
			}, e);
		})
	});
	return i ? /* @__PURE__ */ (0, Y.jsx)(O, {
		summary: /* @__PURE__ */ (0, Y.jsx)("span", {
			"data-copy-key": "catalog.libraryAssistant.processDone",
			children: $("processDone")
		}),
		children: a
	}) : a;
}
var fr = {
	combined: {
		matches: () => !0,
		external: !0
	},
	unwatched: {
		matches: (e) => e.unwatched,
		external: !1
	},
	marked: {
		matches: (e) => e.marked,
		external: !1
	},
	translation: {
		matches: (e) => !e.translated.includes(qe),
		external: !1
	}
};
function pr({ choose: e, children: t, visible: n, toggle: r }) {
	return n ? /* @__PURE__ */ (0, Y.jsxs)("div", {
		className: "flex w-full flex-col items-center gap-2",
		children: [/* @__PURE__ */ (0, Y.jsxs)("div", {
			className: "flex items-center gap-1",
			children: [/* @__PURE__ */ (0, Y.jsx)("p", {
				className: "text-caption-1-medium text-text-secondary",
				"data-copy-key": "catalog.libraryAssistant.demoCases",
				children: $("demoCases")
			}), /* @__PURE__ */ (0, Y.jsx)(b, {
				type: "button",
				size: "xs",
				variant: "ghost",
				iconOnly: !0,
				leadingIcon: De,
				"data-ai-button": "round",
				onClick: r,
				"aria-label": $("hideDemoCases"),
				title: $("hideDemoCases")
			})]
		}), /* @__PURE__ */ (0, Y.jsxs)("div", {
			role: "group",
			"aria-label": $("demoCases"),
			className: "flex w-full flex-wrap justify-center gap-2",
			children: [Object.keys(fr).map((t) => {
				let n = "demos." + t + ".prompt";
				return /* @__PURE__ */ (0, Y.jsx)(b, {
					size: "small",
					variant: "secondary",
					"data-copy-interact": "",
					"data-ai-button": "example",
					className: "min-w-0 max-w-full text-left [&>span]:min-w-0 [&>span]:shrink",
					onClick: (n) => {
						n.altKey || e(t);
					},
					children: /* @__PURE__ */ (0, Y.jsx)("span", {
						className: "whitespace-normal wrap-anywhere",
						"data-copy-key": "catalog.libraryAssistant." + n,
						children: $(n)
					})
				}, t);
			}), t]
		})]
	}) : /* @__PURE__ */ (0, Y.jsx)(b, {
		type: "button",
		size: "xs",
		variant: "ghost",
		onClick: r,
		children: /* @__PURE__ */ (0, Y.jsx)("span", {
			"data-copy-key": "catalog.libraryAssistant.showDemoCases",
			children: $("showDemoCases")
		})
	});
}
function mr(e, t, n) {
	let r = ["interpret", "library"];
	fr[e].external && r.push("external");
	let i = t === "done" ? r.length : r.indexOf(t);
	return r.map((e, t) => ({
		key: e,
		state: t < i ? "done" : t > i ? "waiting" : n ? "stopped" : "running"
	}));
}
function hr(e) {
	let [t, n] = (0, J.useState)("interpret"), [r, i] = (0, J.useState)(!1), [a, o] = (0, J.useState)(0);
	(0, J.useEffect)(() => {
		if (!e || t === "done" || r) return;
		let i = t === "interpret" ? "library" : t === "library" && fr[e].external ? "external" : "done", a = window.setTimeout(() => n(i), {
			interpret: 2300,
			library: 2100,
			external: 2650
		}[t]);
		return () => window.clearTimeout(a);
	}, [
		e,
		t,
		a,
		r
	]);
	let s = {};
	if (e && (t === "external" || t === "done")) {
		let n = lr.filter(fr[e].matches).map((e) => e.work);
		e === "translation" && n.sort((e, t) => t.release_date.localeCompare(e.release_date)), s.library = { items: n }, t === "done" && fr[e].external && (s.external = { items: [sr["IDPC-032"]] });
	}
	return {
		phase: t,
		results: s,
		run: a,
		stopped: r,
		stop: () => i(!0),
		restart: () => {
			n("interpret"), i(!1), o((e) => e + 1);
		}
	};
}
function gr({ id: e, simulation: t }) {
	let { phase: n, results: r } = t, i = "demos." + e + ".prompt";
	return /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [
		/* @__PURE__ */ (0, Y.jsx)("p", {
			className: "ml-auto assistant-message-width rounded-2xl rounded-br-md bg-background-primary-default px-4 py-2.5 text-body-regular text-text-primary",
			"data-copy-key": "catalog.libraryAssistant." + i,
			"data-ai-search-reveal": "",
			children: $(i)
		}),
		/* @__PURE__ */ (0, Y.jsx)("p", {
			className: "text-caption-1-regular text-text-secondary",
			"data-copy-key": "catalog.libraryAssistant.demoCatalogueStatus",
			children: $("demoCatalogueStatus")
		}),
		/* @__PURE__ */ (0, Y.jsx)(dr, {
			steps: mr(e, n, t.stopped),
			demo: !0
		}),
		r.library || r.external ? /* @__PURE__ */ (0, Y.jsxs)("div", {
			"data-ai-search-results": "",
			className: "flex flex-col gap-4",
			children: [r.library ? /* @__PURE__ */ (0, Y.jsx)(Jt, {
				result: r.library,
				source: "library",
				localOnly: !0,
				title: $("demoCollection")
			}) : null, r.external ? /* @__PURE__ */ (0, Y.jsx)(Jt, {
				result: r.external,
				source: "external",
				localOnly: !0
			}) : null]
		}) : null
	] });
}
// src/react/search/assistant-recorded-demo.tsx
var _r = {
	model: "gpt-6-luna",
	results: {
		"zh-CN": {
			translation: {
				title: "FIRST IMPRESSION 184：178厘米长腿白皙、拥有真正海外模特身材，曾活跃于世界舞台的北欧混血美女 天音ミシェル 来日AV出道！！",
				summary: "出生于北欧挪威、身高178厘米、长腿白皙的真正海外模特，震撼来日AV出道！"
			},
			tags: [{
				label: "国际模特",
				evidence: "标题称她是“本物海外モデル”，并称其“世界で活躍”。"
			}, {
				label: "高挑身材",
				evidence: "标题标明身高178厘米，并提到“脚長”。"
			}],
			vision: [{
				label: "格纹连衣裙",
				evidence: "封面人物穿着蓝灰色格纹连衣裙。"
			}, {
				label: "封面文字排版",
				evidence: "封面上方有大型日文标题，人物姓名和系列编号排在下方。"
			}],
			metadata: [
				{
					field: "code",
					before: "IPZZ690",
					after: "IPZZ-690",
					evidence: "DVD编号为IPZZ690；Peach展示编号采用连字符格式IPZZ-690。"
				},
				{
					field: "releaseDate",
					before: "",
					after: "2025-08-12",
					evidence: "官方详情页的DVD发行日期为2025-08-12。"
				},
				{
					field: "duration",
					before: "",
					after: "150分钟",
					evidence: "官方详情页的DVD时长为150分钟。"
				}
			],
			organize: [
				{
					id: "IPZZ-690",
					decision: "将官方关键词搜索结果IPZZ690与其指向的官方详情页关联为同一发行版本的两个参考；二者都不是用户文件。",
					evidence: "关键词搜索结果IPZZ690指向官方详情页IPZZ-690。"
				},
				{
					id: "IPZZ-893",
					decision: "将DVD IPZZ893与Blu-ray 9IPZZ893归入同一发行版本，同时保留各自的格式信息；不推断两者文件相同。",
					evidence: "官方详情页将DVD和Blu-ray列为两个格式，时长均为170分钟。"
				},
				{
					id: "IDPC-032",
					decision: "与IPZZ-893分开归档；同属FIRST IMPRESSION系列不足以证明是同一发行版本。",
					evidence: "IDPC032为系列第197号、橘春花；IPZZ893为第193号、白石るな。"
				}
			]
		},
		en: {
			translation: {
				title: "FIRST IMPRESSION 184: 178 cm, long-legged and fair-skinned, with a genuine international model’s physique—Nordic beauty 天音ミシェル, who has worked around the world, makes her Japanese AV debut!!",
				summary: "Born in Norway in Northern Europe, this 178 cm, long-legged and fair-skinned international model makes a stunning Japanese AV debut!"
			},
			tags: [{
				label: "International model",
				evidence: "The title calls her a “genuine international model” and says she has worked around the world."
			}, {
				label: "Tall stature",
				evidence: "The title gives her height as 178 cm and describes her as long-legged."
			}],
			vision: [{
				label: "Plaid dress",
				evidence: "The person on the cover wears a blue-gray plaid dress."
			}, {
				label: "Cover text layout",
				evidence: "Large Japanese title text appears at the top, with the subject’s name and series number below."
			}],
			metadata: [
				{
					field: "code",
					before: "IPZZ690",
					after: "IPZZ-690",
					evidence: "The DVD code is IPZZ690; the Peach display code uses a hyphen: IPZZ-690."
				},
				{
					field: "releaseDate",
					before: "",
					after: "2025-08-12",
					evidence: "The official detail page lists the DVD release date as 2025-08-12."
				},
				{
					field: "duration",
					before: "",
					after: "150 minutes",
					evidence: "The official detail page lists the DVD duration as 150 minutes."
				}
			],
			organize: [
				{
					id: "IPZZ-690",
					decision: "Link the official keyword-search result for IPZZ690 to the official detail page it points to as two references to one release; neither is a user file.",
					evidence: "The keyword-search result IPZZ690 points to the official IPZZ-690 detail page."
				},
				{
					id: "IPZZ-893",
					decision: "Group DVD IPZZ893 and Blu-ray 9IPZZ893 under the same release while retaining their distinct format information; do not infer that their files are identical.",
					evidence: "The official detail page lists DVD and Blu-ray as separate formats, both 170 minutes."
				},
				{
					id: "IDPC-032",
					decision: "Keep separate from IPZZ-893; sharing the FIRST IMPRESSION series does not establish that they are the same release.",
					evidence: "IDPC032 is number 197 with 橘春花; IPZZ893 is number 193 with 白石るな."
				}
			]
		}
	}
}.results[qe], vr = sr["IPZZ-690"], yr = sr["IDPC-032"], br = sr["IPZZ-893"];
function xr(e) {
	let [t, n] = (0, J.useState)("reading"), [r, i] = (0, J.useState)(0);
	return (0, J.useEffect)(() => {
		if (!e) return;
		let t = window.setTimeout(() => n("analyzing"), 650), r = window.setTimeout(() => n("complete"), 1900);
		return () => {
			window.clearTimeout(t), window.clearTimeout(r);
		};
	}, [e, r]), {
		phase: t,
		run: r,
		restart: () => {
			n("reading"), i((e) => e + 1);
		}
	};
}
function Sr({ task: e, phase: t, run: n }) {
	return /* @__PURE__ */ (0, Y.jsxs)("section", {
		"aria-label": $("demoCases"),
		className: "flex min-w-0 flex-col gap-4",
		children: [/* @__PURE__ */ (0, Y.jsx)(Cr, { task: e }), t === "complete" ? /* @__PURE__ */ (0, Y.jsxs)("div", {
			"data-ai-search-reveal": "",
			className: "flex min-w-0 flex-col gap-2",
			children: [/* @__PURE__ */ (0, Y.jsx)("h2", {
				className: "text-body-medium! text-text-primary",
				"data-copy-key": "catalog.libraryAssistant.demoResult",
				children: $("demoResult")
			}), e === "translate" ? /* @__PURE__ */ (0, Y.jsx)(Tr, {}) : /* @__PURE__ */ (0, Y.jsx)(Er, { task: e })]
		}, n) : /* @__PURE__ */ (0, Y.jsx)("div", {
			"aria-live": "polite",
			children: /* @__PURE__ */ (0, Y.jsx)(In, {
				variant: t === "reading" ? "spin" : "wave",
				label: $(t === "reading" ? "demoReading" : "demoAnalyzing." + e)
			}, t)
		})]
	});
}
function Cr({ task: e }) {
	return /* @__PURE__ */ (0, Y.jsxs)("section", {
		className: "flex min-w-0 flex-col gap-3 rounded-xl bg-background-primary-default p-3 wrap-anywhere",
		children: [/* @__PURE__ */ (0, Y.jsx)("h2", {
			className: "text-body-medium! text-text-primary",
			"data-copy-key": "catalog.libraryAssistant.demoSource",
			children: $("demoSource")
		}), e === "organize" ? /* @__PURE__ */ (0, Y.jsxs)("ul", {
			className: "flex flex-col gap-2",
			children: [
				/* @__PURE__ */ (0, Y.jsx)("li", { children: /* @__PURE__ */ (0, Y.jsx)(wr, {
					work: vr,
					children: /* @__PURE__ */ (0, Y.jsx)("a", {
						href: ir,
						target: "_blank",
						rel: "noreferrer",
						className: "underline-offset-2 hover:underline",
						children: $("demoOfficialListing")
					})
				}) }),
				/* @__PURE__ */ (0, Y.jsx)("li", { children: /* @__PURE__ */ (0, Y.jsx)(wr, {
					work: br,
					children: "DVD IPZZ893 · Blu-ray 9IPZZ893"
				}) }),
				/* @__PURE__ */ (0, Y.jsx)("li", { children: /* @__PURE__ */ (0, Y.jsx)(wr, {
					work: yr,
					children: "FIRST IMPRESSION 197"
				}) })
			]
		}) : /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [
			/* @__PURE__ */ (0, Y.jsx)(wr, {
				work: e === "vision" ? yr : vr,
				preview: e === "vision",
				children: e === "vision" ? $("demoOfficialCover") : null
			}),
			e === "metadata" ? /* @__PURE__ */ (0, Y.jsxs)("ul", {
				className: "flex flex-col gap-1.5 text-body-2-regular text-text-secondary",
				children: [/* @__PURE__ */ (0, Y.jsxs)("li", { children: [
					/* @__PURE__ */ (0, Y.jsx)("strong", {
						className: "text-text-primary",
						children: $("demoLocalRecord")
					}),
					" · IPZZ690 · ",
					$("demoMetadataMissing")
				] }), /* @__PURE__ */ (0, Y.jsxs)("li", { children: [
					/* @__PURE__ */ (0, Y.jsx)("strong", {
						className: "text-text-primary",
						children: $("demoStudioRecord")
					}),
					" · DVD IPZZ690 · ",
					vr.release_date,
					" · ",
					$("demoDuration")
				] })]
			}) : null,
			e === "translate" || e === "tags" ? /* @__PURE__ */ (0, Y.jsx)("p", {
				lang: "ja",
				className: "text-body-2-regular text-text-secondary",
				children: cr
			}) : null,
			e === "tags" ? /* @__PURE__ */ (0, Y.jsxs)(N, { children: [
				$("demoExistingTags"),
				" · ",
				ar
			] }) : null
		] })]
	});
}
function wr({ work: e, preview: t = !1, children: n }) {
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		"data-ai-demo-identity": "",
		className: "flex min-w-0 items-start gap-3 rounded-lg bg-background-secondary-default p-2",
		children: [/* @__PURE__ */ (0, Y.jsx)("img", {
			src: e.demoCover,
			alt: q("catalog:libraryAssistant.cover", { title: e.title }),
			className: G("h-auto shrink-0 rounded-md", t ? "w-24 sm:w-36" : "w-12")
		}), /* @__PURE__ */ (0, Y.jsxs)("div", {
			className: "flex min-w-0 flex-col gap-1",
			children: [
				/* @__PURE__ */ (0, Y.jsxs)("p", {
					className: "text-caption-1-medium text-text-secondary",
					children: [
						e.code,
						" · ",
						e.release_date,
						" · ",
						e.studio
					]
				}),
				/* @__PURE__ */ (0, Y.jsxs)("a", {
					href: e.demoSource,
					target: "_blank",
					rel: "noreferrer",
					"data-work-card-link": "",
					className: "group flex min-w-0 items-start gap-1.5 text-body-2-medium text-text-primary",
					children: [/* @__PURE__ */ (0, Y.jsx)("span", {
						lang: "ja",
						className: "group-hover:underline group-focus-visible:underline",
						children: e.title
					}), /* @__PURE__ */ (0, Y.jsx)(et, {
						className: "mt-0.5 size-4 shrink-0 text-foreground-icon-secondary",
						"aria-hidden": !0
					})]
				}),
				/* @__PURE__ */ (0, Y.jsx)("p", {
					lang: "ja",
					className: "text-caption-1-medium text-text-secondary",
					children: e.performers.join(" · ")
				}),
				n ? /* @__PURE__ */ (0, Y.jsx)("p", {
					className: "text-caption-1-regular text-text-secondary",
					children: n
				}) : null
			]
		})]
	});
}
function Tr() {
	let [e, t] = (0, J.useState)(_r.translation.title), [n, r] = (0, J.useState)(_r.translation.summary), [i, a] = (0, J.useState)(!1);
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		className: "flex min-w-0 flex-col gap-3 rounded-xl bg-background-primary-default p-3",
		children: [
			/* @__PURE__ */ (0, Y.jsx)(re, {
				label: q("catalog:aiLibrary.translatedTitle"),
				value: e,
				onChange: (e) => {
					t(e), a(!1);
				}
			}),
			/* @__PURE__ */ (0, Y.jsx)(we, {
				"aria-label": q("catalog:aiLibrary.translatedSummary"),
				rows: 3,
				value: n,
				onChange: (e) => {
					r(e), a(!1);
				}
			}),
			/* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, Y.jsx)(b, {
					size: "small",
					variant: "secondary",
					disabled: i || !e.trim() || !n.trim(),
					onClick: () => a(!0),
					children: $("demoAcceptTranslation")
				}), i ? /* @__PURE__ */ (0, Y.jsx)(N, {
					role: "status",
					children: $("demoTranslationAccepted")
				}) : null]
			})
		]
	});
}
function Er({ task: e }) {
	let [t, n] = (0, J.useState)([]), [r, i] = (0, J.useState)(null), a = e === "metadata" ? _r.metadata.map((e) => ({
		id: e.field,
		title: $("demoField." + e.field),
		change: [e.before || $("demoFieldEmpty"), e.after],
		evidence: e.evidence
	})) : e === "organize" ? _r.organize.map((e) => ({
		id: e.id,
		title: e.id + " · " + e.decision,
		evidence: e.evidence
	})) : (e === "vision" ? _r.vision : _r.tags).map((e) => ({
		id: e.label,
		title: e.label,
		evidence: e.evidence
	}));
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		className: "flex min-w-0 flex-col gap-2",
		children: [a.map((e) => /* @__PURE__ */ (0, Y.jsxs)("div", {
			className: "flex min-w-0 flex-col gap-1 rounded-xl bg-background-primary-default p-3 wrap-anywhere",
			children: [
				/* @__PURE__ */ (0, Y.jsx)(w, {
					isSelected: t.includes(e.id),
					onChange: (t) => {
						n((n) => t ? [...n, e.id] : n.filter((t) => t !== e.id)), i(null);
					},
					children: /* @__PURE__ */ (0, Y.jsx)("span", {
						className: "text-body-2-medium text-text-primary",
						children: e.title
					})
				}),
				e.change ? /* @__PURE__ */ (0, Y.jsxs)("div", {
					className: "flex flex-wrap items-baseline gap-x-2 gap-y-1 pl-6 text-body-2-regular",
					children: [
						/* @__PURE__ */ (0, Y.jsx)("del", {
							className: "text-text-secondary",
							children: e.change[0]
						}),
						/* @__PURE__ */ (0, Y.jsx)("span", {
							className: "text-caption-1-medium text-text-secondary",
							"aria-hidden": "true",
							children: "→"
						}),
						/* @__PURE__ */ (0, Y.jsx)("span", {
							className: "text-text-primary",
							children: e.change[1]
						})
					]
				}) : null,
				/* @__PURE__ */ (0, Y.jsx)("p", {
					className: "pl-6 text-caption-1-regular text-text-secondary",
					children: e.evidence
				})
			]
		}, e.id)), /* @__PURE__ */ (0, Y.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2",
			children: [/* @__PURE__ */ (0, Y.jsx)(b, {
				size: "small",
				variant: "secondary",
				disabled: !t.length || r !== null,
				onClick: () => i(t.length),
				children: $("demoAcceptSuggestions")
			}), r === null ? null : /* @__PURE__ */ (0, Y.jsx)(N, {
				role: "status",
				children: q("catalog:libraryAssistant.demoSuggestionsAccepted", { count: r })
			})]
		})]
	});
}
// src/react/search/assistant-work-tasks.tsx
var Dr = [
	...g,
	"metadata",
	"organize"
];
function Or({ choose: e }) {
	return /* @__PURE__ */ (0, Y.jsx)(Y.Fragment, { children: Dr.map((t) => /* @__PURE__ */ (0, Y.jsx)(b, {
		size: "small",
		variant: "secondary",
		"data-copy-interact": "",
		"data-ai-button": "example",
		className: "min-w-0 max-w-full [&>span]:min-w-0 [&>span]:shrink",
		onClick: (n) => {
			n.altKey || e(t);
		},
		children: /* @__PURE__ */ (0, Y.jsx)("span", {
			className: "whitespace-normal wrap-anywhere",
			"data-copy-key": "catalog.libraryAssistant.workTask." + t,
			children: $("workTask." + t)
		})
	}, t)) });
}
function kr({ choose: e, chooseFixed: t, fixedTasks: s, selected: c, disabled: l }) {
	let d = (0, J.useRef)(null), f = (0, J.useRef)(!1), [p, m] = (0, J.useState)(!1), h = $("workTools");
	return /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [/* @__PURE__ */ (0, Y.jsx)(b, {
		ref: d,
		size: "xs",
		variant: "ghost",
		leadingIcon: be,
		trailingIcon: fe,
		"data-ai-button": "footer",
		disabled: l,
		"aria-haspopup": "menu",
		"aria-expanded": p,
		onClick: (e) => {
			e.altKey || m(!p);
		},
		children: /* @__PURE__ */ (0, Y.jsx)("span", {
			"data-copy-key": "catalog.libraryAssistant.workTools",
			children: h
		})
	}), /* @__PURE__ */ (0, Y.jsx)(o, {
		triggerRef: d,
		isOpen: p,
		onOpenChange: m,
		placement: "top end",
		offset: 8,
		className: G(ue, de),
		isNonModal: new URLSearchParams(location.search).has("edit"),
		shouldCloseOnInteractOutside: (e) => !e.closest("[data-copy-editor]"),
		children: /* @__PURE__ */ (0, Y.jsx)("div", {
			onPointerDownCapture: (e) => {
				f.current = e.altKey;
			},
			onKeyDownCapture: (e) => {
				f.current = e.altKey;
			},
			children: /* @__PURE__ */ (0, Y.jsxs)(i, {
				"aria-label": h,
				autoFocus: "first",
				className: z,
				"data-copy-interact": "",
				children: [Dr.map((t) => {
					let r = "workTask." + t;
					return /* @__PURE__ */ (0, Y.jsx)(n, {
						id: t,
						textValue: $(r),
						className: G(le, B),
						onAction: () => {
							f.current || (m(!1), e(t));
						},
						children: /* @__PURE__ */ (0, Y.jsx)("span", {
							"data-copy-key": "catalog.libraryAssistant." + r,
							children: $(r)
						})
					}, t);
				}), s ? /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [/* @__PURE__ */ (0, Y.jsx)(u, { className: "my-1 border-t border-separator-border" }), /* @__PURE__ */ (0, Y.jsxs)(r, {
					className: "flex flex-col gap-1",
					children: [
						/* @__PURE__ */ (0, Y.jsx)(a, {
							className: "px-2 pt-1 text-caption-1-medium text-text-secondary",
							"data-copy-key": "catalog.libraryAssistant.fixedTasks",
							children: $("fixedTasks")
						}),
						s.map((e) => /* @__PURE__ */ (0, Y.jsx)(n, {
							id: e.id,
							textValue: e.name,
							className: G(le, B, c === e.id && "bg-dropdown-item-hover-background"),
							onAction: () => {
								f.current || (m(!1), t(e.id));
							},
							children: /* @__PURE__ */ (0, Y.jsx)("span", {
								className: "min-w-0 wrap-anywhere",
								children: e.name
							})
						}, e.id)),
						/* @__PURE__ */ (0, Y.jsx)(n, {
							id: "manage-fixed-tasks",
							href: C,
							onAction: () => m(!1),
							className: G(le, B),
							children: /* @__PURE__ */ (0, Y.jsx)("span", {
								"data-copy-key": "catalog.libraryAssistant.manageFixedTasks",
								children: $("manageFixedTasks")
							})
						})
					]
				})] }) : null]
			})
		})
	})] });
}
function Ar({ task: e, library: t, children: n }) {
	return /* @__PURE__ */ (0, Y.jsxs)("section", {
		"data-ai-search-current": "",
		className: "flex min-w-0 flex-col gap-4",
		children: [/* @__PURE__ */ (0, Y.jsx)("p", {
			className: "ml-auto assistant-message-width rounded-2xl rounded-br-md bg-background-primary-default px-4 py-2.5 text-body-regular text-text-primary",
			"data-copy-key": "catalog.libraryAssistant.workTask." + e,
			children: $("workTask." + e)
		}), n ?? /* @__PURE__ */ (0, Y.jsx)(Mr, {
			plan: {
				kind: e,
				target: ""
			},
			library: t
		})]
	});
}
var jr = ["assistant-work-results"];
function Mr({ plan: e, library: t }) {
	return e.kind === "organize" ? /* @__PURE__ */ (0, Y.jsx)(Ir, {}) : /* @__PURE__ */ (0, Y.jsx)(Nr, {
		task: e.kind,
		library: t,
		target: e.target,
		language: e.language,
		metadata: e.metadata
	});
}
function Nr({ task: e, library: t, target: n, language: r, metadata: i }) {
	let [a, o] = (0, J.useState)(n), [s, c] = (0, J.useState)(n), [l, u] = (0, J.useState)(null), d = bt(), f = new URLSearchParams({
		sort: "new",
		limit: "24",
		count: "0"
	});
	s && f.set("q", s), t && f.set("library", t);
	let p = yt({
		queryKey: [
			...jr,
			t,
			s
		],
		queryFn: ({ signal: e }) => Me("/api/items?" + f, e)
	}), m = (e) => {
		d.invalidateQueries({ queryKey: Je(e) }), d.invalidateQueries({ queryKey: jr });
	}, h = l ? p.data?.items.find((e) => e.id === l.id) ?? l : null, g = h ? { items: [h] } : p.data && {
		...p.data,
		items: Vt(p.data.items).slice(0, 6)
	};
	return /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [
		/* @__PURE__ */ (0, Y.jsxs)("div", {
			className: "relative z-10 flex flex-col gap-2",
			children: [/* @__PURE__ */ (0, Y.jsx)("p", {
				className: "text-body-2-medium text-text-primary",
				"data-copy-key": "catalog.libraryAssistant.chooseWork",
				children: $("chooseWork")
			}), /* @__PURE__ */ (0, Y.jsxs)("form", {
				className: "flex min-w-0 items-start gap-2",
				onSubmit: (e) => {
					e.preventDefault(), u(null), c(a.trim());
				},
				children: [/* @__PURE__ */ (0, Y.jsx)("div", {
					className: "min-w-0 flex-1",
					children: /* @__PURE__ */ (0, Y.jsx)(Xt, {
						kind: "work",
						label: $("fields.q"),
						placeholder: $("fields.q"),
						value: a,
						onChange: o,
						workLibrary: t,
						onWorkPick: (e) => {
							u(e), c(e.code || Wt(e));
						}
					})
				}), /* @__PURE__ */ (0, Y.jsx)(b, {
					type: "submit",
					size: "medium",
					variant: "secondary",
					className: "h-9 shrink-0",
					children: $("sendSearch")
				})]
			})]
		}),
		p.isPending && !h ? /* @__PURE__ */ (0, Y.jsx)(Yt, { source: "library" }) : null,
		p.error ? /* @__PURE__ */ (0, Y.jsx)(j, { children: Ue(p.error) }) : null,
		g ? /* @__PURE__ */ (0, Y.jsx)(Jt, {
			result: g,
			source: "library",
			actions: (t) => {
				let n = t.id;
				return n ? e === "metadata" ? /* @__PURE__ */ (0, Y.jsx)(Fr, {
					id: n,
					suggestion: i
				}) : /* @__PURE__ */ (0, Y.jsx)(L, {
					id: n,
					code: t.code,
					cover: t.has_cover ? ze(t, 2) : "",
					initialTask: e,
					initialLanguage: r ?? qe,
					inlineLabel: q("catalog:aiLibrary." + e),
					onSaved: () => m(n)
				}) : null;
			}
		}) : null
	] });
}
var Pr = {
	tagLabel: ut,
	isDurationTag: (e) => D.has(e),
	tagCandidates: () => []
};
function Fr({ id: e, suggestion: t }) {
	let n = ht(), [r, i] = (0, J.useState)(null);
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		className: "flex min-w-0 flex-col items-end gap-1",
		children: [
			/* @__PURE__ */ (0, Y.jsx)(b, {
				size: "small",
				variant: "secondary",
				disabled: !!n.busy,
				...Le(n.busy === "load"),
				onClick: () => void n.run("load", (t) => K(e, t), i),
				children: $("editMetadata")
			}),
			n.error ? /* @__PURE__ */ (0, Y.jsx)(j, { children: n.error }) : null,
			r ? /* @__PURE__ */ (0, Y.jsx)(ae, {
				item: r,
				helpers: Pr,
				suggestion: t,
				close: () => i(null),
				onSaved: Fe
			}) : null
		]
	});
}
function Ir() {
	let e = yt({
		queryKey: T,
		queryFn: ({ signal: e }) => Me(E, e)
	}), t = e.data?.groups?.slice(0, 3) ?? [];
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		className: "flex flex-col gap-2",
		children: [
			e.isPending ? /* @__PURE__ */ (0, Y.jsx)("span", { className: "skeleton-sheen h-4 w-40" }) : null,
			e.error ? /* @__PURE__ */ (0, Y.jsx)(j, { children: Ue(e.error) }) : null,
			e.data ? /* @__PURE__ */ (0, Y.jsx)(N, { children: q("catalog:libraryAssistant.duplicateCount", { count: e.data.total }) }) : null,
			t.length ? /* @__PURE__ */ (0, Y.jsx)("ul", {
				className: "flex flex-col gap-2",
				children: t.map((e) => /* @__PURE__ */ (0, Y.jsxs)("li", {
					className: "rounded-xl bg-background-primary-default px-3 py-2",
					children: [/* @__PURE__ */ (0, Y.jsx)("p", {
						className: "text-body-2-medium text-text-primary",
						children: e.code
					}), /* @__PURE__ */ (0, Y.jsx)("p", {
						className: "text-caption-1-regular text-text-secondary",
						"data-copy-key": "catalog.libraryAssistant." + (e.identical ? "duplicateExact" : "duplicateCompare"),
						children: q("catalog:libraryAssistant." + (e.identical ? "duplicateExact" : "duplicateCompare"), { count: e.count })
					})]
				}, e.files.map((e) => e.id).join(",")))
			}) : null,
			/* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, Y.jsx)(x, {
						size: "small",
						variant: "secondary",
						href: "/duplicates",
						children: $("openDuplicates")
					}),
					/* @__PURE__ */ (0, Y.jsx)(x, {
						size: "small",
						variant: "secondary",
						href: "/data-cleanup/organize",
						children: $("openOrganization")
					}),
					/* @__PURE__ */ (0, Y.jsx)(x, {
						size: "small",
						variant: "secondary",
						href: "/review",
						children: $("openReview")
					})
				]
			})
		]
	});
}
// src/react/search/assistant-options.tsx
var Lr = [
	"library",
	"external",
	"both"
], Rr = [
	"q",
	"performer",
	"studio",
	"tag",
	"year",
	"period",
	"state",
	"sort",
	"translation_missing"
], zr = [
	"q",
	"performer",
	"studio",
	"tag",
	"year",
	"state",
	"sort",
	"translation_missing",
	"releaseFrom",
	"releaseTo",
	"outside"
], Br = {
	q: Xe,
	outside: Xe,
	performer: ve,
	studio: Ye,
	tag: Xe,
	year: ye,
	period: ye,
	state: Ee,
	sort: Ke,
	translation_missing: Te
}, Vr = Array.from({ length: (/* @__PURE__ */ new Date()).getFullYear() - 1898 }, (e, t) => (/* @__PURE__ */ new Date()).getFullYear() + 1 - t), Hr = {
	state: [
		"fresh",
		"played",
		"flagged",
		"later"
	],
	sort: [
		"new",
		"release",
		"rating",
		"dur"
	],
	translation_missing: [
		"zh-TW",
		"zh-CN",
		"en"
	]
}, Ur = "flex w-full min-w-0 cursor-pointer items-center gap-2 px-2 text-text-primary outline-none transition-colors";
function Wr({ label: e, title: t, mark: n, count: r, side: i, disabled: a, children: s, expanded: c, onExpanded: l }) {
	let u = (0, J.useRef)(null), [d, f] = (0, J.useState)(!1), p = c ?? d, m = l ?? f, h = i === "start";
	return /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [/* @__PURE__ */ (0, Y.jsx)(b, {
		ref: u,
		type: "button",
		size: "small",
		variant: "ghost",
		leadingIcon: h ? p ? _e : rt : void 0,
		trailingIcon: h ? void 0 : fe,
		iconOnly: h,
		"data-ai-composer-trigger": i,
		"data-has-filters": h && !!r || void 0,
		className: "shrink-0",
		"aria-label": e,
		title: t,
		disabled: a,
		"aria-haspopup": "dialog",
		"aria-expanded": p && !a,
		onClick: () => m(!p),
		children: /* @__PURE__ */ (0, Y.jsxs)("span", {
			className: "flex min-w-0 items-center gap-1.5",
			children: [n, /* @__PURE__ */ (0, Y.jsx)("span", {
				className: "truncate",
				children: t
			})]
		})
	}), /* @__PURE__ */ (0, Y.jsx)(o, {
		triggerRef: u,
		isOpen: p && !a,
		onOpenChange: m,
		placement: h ? "top start" : "top end",
		shouldCloseOnInteractOutside: h ? nt : void 0,
		offset: 8,
		"data-ai-composer-menu": i,
		className: G(ue, "overscroll-contain"),
		children: /* @__PURE__ */ (0, Y.jsx)(pe, {
			"aria-label": e,
			"data-copy-choice-host": "",
			className: "flex min-w-0 flex-col outline-none",
			children: s
		})
	})] });
}
function Gr({ field: e, value: t, onChange: n }) {
	let r = $("fields." + e);
	if (e === "state" || e === "sort" || e === "translation_missing" || e === "year") {
		let i = e === "year" ? [.../* @__PURE__ */ new Set([...t ? [t] : [], ...Vr.map(String)])] : Hr[e];
		return /* @__PURE__ */ (0, Y.jsx)("div", {
			className: "flex min-w-0 flex-col gap-1.5",
			children: /* @__PURE__ */ (0, Y.jsxs)(xe, {
				"aria-label": r,
				selectedKey: t || "any",
				triggerClassName: "w-full",
				onSelectionChange: (e) => n(e && e !== "any" ? String(e) : ""),
				children: [/* @__PURE__ */ (0, Y.jsx)(Se, {
					id: "any",
					children: $("any")
				}), i.map((t) => /* @__PURE__ */ (0, Y.jsx)(Se, {
					id: t,
					children: Kr(e, t)
				}, t))]
			})
		});
	}
	return e === "outside" ? /* @__PURE__ */ (0, Y.jsx)(re, {
		"aria-label": r,
		placeholder: r,
		value: t,
		maxLength: 100,
		onChange: n
	}) : /* @__PURE__ */ (0, Y.jsx)(Xt, {
		label: r,
		placeholder: r,
		value: t,
		onChange: n,
		kind: e === "q" ? "work" : e === "performer" || e === "studio" || e === "tag" ? e : void 0
	});
}
function Kr(e, t) {
	return e === "translation_missing" ? q("catalog:aiLibrary." + t) : e === "state" || e === "sort" ? $("options." + t) : t;
}
function qr({ scope: e, filters: t, disabled: n, onScope: r, onChange: i, clear: a, open: o, setOpen: s, actions: c }) {
	let l = Object.entries(t).filter(([t, n]) => n?.trim() && (e === "external" ? t === "outside" : e !== "library" || t !== "outside")).length, u = $("conditions");
	return /* @__PURE__ */ (0, Y.jsxs)(Wr, {
		label: u,
		title: $("scopes." + e) + (l ? " · " + l : ""),
		count: l,
		side: "start",
		disabled: n,
		expanded: o,
		onExpanded: s,
		children: [
			/* @__PURE__ */ (0, Y.jsx)(Jr, {
				copyKey: "catalog.libraryAssistant.scope",
				children: $("scope")
			}),
			/* @__PURE__ */ (0, Y.jsx)(d, {
				className: "flex flex-col gap-0.5",
				"aria-label": $("scope"),
				value: e,
				onChange: (e) => r(e),
				children: Lr.map((e) => /* @__PURE__ */ (0, Y.jsx)(ei, {
					id: e,
					label: $("scopes." + e)
				}, e))
			}),
			/* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "mt-2 border-t border-separator-border pt-1",
				children: [/* @__PURE__ */ (0, Y.jsxs)("div", {
					className: "flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, Y.jsx)(Jr, {
						copyKey: "catalog.libraryAssistant.conditions",
						children: u
					}), l ? /* @__PURE__ */ (0, Y.jsx)(b, {
						type: "button",
						size: "small",
						variant: "ghost",
						className: "shrink-0",
						onClick: a,
						children: /* @__PURE__ */ (0, Y.jsx)("span", {
							"data-copy-key": "catalog.libraryAssistant.clearConditions",
							children: $("clearConditions")
						})
					}) : null]
				}), /* @__PURE__ */ (0, Y.jsx)(Yr, {
					scope: e,
					filters: t,
					onChange: i
				})]
			}),
			/* @__PURE__ */ (0, Y.jsx)("div", {
				className: "mt-2 flex flex-col gap-2 border-t border-separator-border px-2 pt-2",
				children: c
			})
		]
	});
}
function Jr({ copyKey: e, children: t }) {
	return /* @__PURE__ */ (0, Y.jsx)("p", {
		"data-ai-search-menu-heading": "",
		className: "min-w-0 text-body-2-medium text-text-secondary",
		children: /* @__PURE__ */ (0, Y.jsx)("span", {
			"data-copy-key": e,
			children: t
		})
	});
}
function Yr({ scope: e, filters: t, onChange: n }) {
	let [r, i] = (0, J.useState)(), a = e === "external" ? ["outside"] : e === "library" ? Rr : ["outside", ...Rr];
	return /* @__PURE__ */ (0, Y.jsx)("div", {
		className: "flex flex-col gap-0.5",
		children: a.map((e) => {
			let a = Br[e], o = r === e, s = e === "period" ? [t.releaseFrom, t.releaseTo].filter(Boolean).join(" – ") : t[e] || "";
			return /* @__PURE__ */ (0, Y.jsxs)("div", { children: [/* @__PURE__ */ (0, Y.jsxs)(b, {
				type: "button",
				variant: "ghost",
				size: "small",
				leadingIcon: a,
				trailingIcon: fe,
				"data-ai-search-menu-row": "",
				"data-ai-search-filter-row": "",
				className: "w-full justify-start text-left",
				"aria-expanded": o,
				onClick: () => i(o ? void 0 : e),
				children: [/* @__PURE__ */ (0, Y.jsx)("span", {
					"data-copy-key": "catalog.libraryAssistant.fields." + e,
					children: $("fields." + e)
				}), s ? /* @__PURE__ */ (0, Y.jsx)("span", {
					className: "ml-2 truncate text-caption-1-regular text-text-secondary",
					children: e === "period" ? s : Kr(e, s)
				}) : null]
			}), o ? /* @__PURE__ */ (0, Y.jsx)("div", {
				className: "px-2 py-2",
				children: e === "period" ? /* @__PURE__ */ (0, Y.jsx)("div", {
					className: "inline-grid w-full grid-cols-2 gap-2",
					children: ["releaseFrom", "releaseTo"].map((e) => /* @__PURE__ */ (0, Y.jsx)(Ce, {
						label: $("fields." + e),
						value: t[e] || "",
						years: Vr,
						latest: "",
						loading: !1,
						onChange: (t) => n(e, t)
					}, e))
				}) : /* @__PURE__ */ (0, Y.jsx)(Gr, {
					field: e,
					value: s,
					onChange: (t) => n(e, t)
				})
			}) : null] }, e);
		})
	});
}
var Xr = (e) => q("settings:aiLibrary.effortOptions." + e);
function Zr({ providers: e, fallback: t, value: n, onChange: r, disabled: i }) {
	let a = n ?? t, o = bt(), s = a && o.getQueryData(je(a.provider)), c = a && Ae(a.model, s?.models.find((e) => e.id === a.model)?.label), l = e.filter((e) => e.configured), u = e.filter((e) => !e.configured);
	return /* @__PURE__ */ (0, Y.jsxs)(Wr, {
		label: $("modelPicker"),
		title: c || $("modelPicker"),
		mark: a ? /* @__PURE__ */ (0, Y.jsx)(h, { provider: a.provider }) : void 0,
		side: "end",
		disabled: i,
		children: [l.length ? /* @__PURE__ */ (0, Y.jsx)($r, {
			connections: l,
			fallback: t,
			value: n,
			onChange: r
		}) : /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [/* @__PURE__ */ (0, Y.jsx)(Jr, {
			copyKey: "catalog.libraryAssistant.modelPicker",
			children: $("modelPicker")
		}), /* @__PURE__ */ (0, Y.jsx)("div", {
			className: "px-2 py-1.5",
			children: /* @__PURE__ */ (0, Y.jsx)(N, { children: /* @__PURE__ */ (0, Y.jsx)("span", {
				"data-copy-key": "settings.aiLibrary.taskConnectFirst",
				children: q("settings:aiLibrary.taskConnectFirst")
			}) })
		})] }), u.length || !l.length ? /* @__PURE__ */ (0, Y.jsxs)("div", {
			"data-ai-provider-setup": "",
			className: "mt-1 flex min-h-8 items-center justify-between gap-2 border-t border-separator-border px-2 py-1.5",
			children: [u.length ? /* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "flex min-w-0 items-center gap-2 text-text-secondary",
				children: [/* @__PURE__ */ (0, Y.jsx)("span", {
					role: "img",
					"aria-label": u.map(ke).join(" · "),
					className: "flex shrink-0 items-center gap-1",
					children: u.map((e) => /* @__PURE__ */ (0, Y.jsx)("span", {
						title: ke(e),
						className: "flex",
						children: /* @__PURE__ */ (0, Y.jsx)(h, {
							provider: e.id,
							className: "size-3.5"
						})
					}, e.id))
				}), /* @__PURE__ */ (0, Y.jsx)("span", {
					className: "truncate text-caption-1-regular",
					"data-copy-key": "settings.aiLibrary.keyMissing",
					children: q("settings:aiLibrary.keyMissing")
				})]
			}) : null, /* @__PURE__ */ (0, Y.jsx)(oe, {
				href: "/settings/ai",
				size: "xs",
				variant: "secondary",
				className: "ml-auto shrink-0",
				"data-copy-interact": "",
				children: /* @__PURE__ */ (0, Y.jsx)("span", {
					"data-copy-key": "catalog.aiLibrary.configure",
					children: q("catalog:aiLibrary.configure")
				})
			})]
		}) : null]
	});
}
function Qr({ connections: e, value: t, onChange: n }) {
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		className: "border-b border-separator-border pb-1.5",
		children: [/* @__PURE__ */ (0, Y.jsx)(Jr, {
			copyKey: "catalog.aiLibrary.provider",
			children: q("catalog:aiLibrary.provider")
		}), /* @__PURE__ */ (0, Y.jsx)(d, {
			"aria-label": q("catalog:aiLibrary.provider"),
			value: t,
			onChange: n,
			className: "flex flex-col gap-0.5 px-1",
			children: e.map((e) => /* @__PURE__ */ (0, Y.jsx)(f, {
				value: e.id,
				"data-ai-search-menu-row": "",
				"aria-label": ke(e),
				className: G(Ur, "py-1 text-body-2-medium"),
				children: /* @__PURE__ */ (0, Y.jsx)(m, {
					provider: e.id,
					label: ke(e)
				})
			}, e.id))
		})]
	});
}
function $r({ connections: e, fallback: t, value: n, onChange: r }) {
	let [i, a] = (0, J.useState)(), [o, s] = (0, J.useState)(""), c = e.find((e) => e.id === (i ?? n?.provider ?? t?.provider)) ?? e[0], l = ft(c.id), u = pt(c), f = {
		id: c.model,
		label: c.model,
		efforts: c.efforts,
		default_efforts: c.default_efforts,
		effort_reported: c.effort_reported
	}, p = l.data?.models ?? [], h = f.id && !p.some((e) => e.id === f.id) ? [f, ...p] : p, g = Ct(h, u), _ = g.filter((e) => Ze(e, o)), v = n ?? t, y = v?.provider === c.id ? h.find((e) => e.id === v.model) : void 0, x = y?.efforts ?? [], S = v && x.includes(v.effort) ? v.effort : y?.default_efforts?.search ?? "default";
	return /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [
		e.length > 1 ? /* @__PURE__ */ (0, Y.jsx)(Qr, {
			connections: e,
			value: c.id,
			onChange: (e) => {
				a(e), s("");
			}
		}) : null,
		/* @__PURE__ */ (0, Y.jsxs)("div", {
			className: "flex min-h-9 items-center justify-between gap-1 pr-1",
			children: [/* @__PURE__ */ (0, Y.jsx)(Jr, {
				copyKey: "catalog.libraryAssistant.modelPicker",
				children: $("modelPicker")
			}), /* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "flex min-w-0 items-center gap-1",
				children: [e.length === 1 ? /* @__PURE__ */ (0, Y.jsx)("span", {
					className: "px-1 text-caption-1-regular text-text-secondary",
					children: /* @__PURE__ */ (0, Y.jsx)(m, {
						provider: c.id,
						label: ke(c)
					})
				}) : null, t && n ? /* @__PURE__ */ (0, Y.jsx)(b, {
					type: "button",
					iconOnly: !0,
					leadingIcon: F,
					size: "small",
					variant: "ghost",
					"aria-label": $("useConfiguredModel"),
					title: $("useConfiguredModel"),
					onClick: () => {
						r(null), a(void 0), s("");
					}
				}) : null]
			})]
		}),
		g.length > 10 || o ? /* @__PURE__ */ (0, Y.jsx)("div", {
			className: "px-2 pb-2",
			children: /* @__PURE__ */ (0, Y.jsx)(re, {
				"aria-label": $("filterModels"),
				placeholder: $("filterModels"),
				value: o,
				onChange: s
			})
		}) : null,
		/* @__PURE__ */ (0, Y.jsx)(d, {
			"aria-label": $("modelPicker"),
			value: v?.provider === c.id ? v.model : "",
			className: "flex max-h-48 flex-col gap-0.5 overflow-y-auto",
			onChange: (e) => {
				let t = h.find((t) => t.id === e);
				t && r({
					provider: c.id,
					model: t.id,
					effort: t.default_efforts?.search ?? "default"
				});
			},
			children: _.map((e) => /* @__PURE__ */ (0, Y.jsx)(ei, {
				id: e.id,
				label: Ae(e.id, e.label)
			}, e.id))
		}),
		!l.isPending && !l.error && !_.length ? /* @__PURE__ */ (0, Y.jsx)(N, { children: $(h.length && !g.length ? "noVisibleModels" : "noModelsFound") }) : null,
		y && !Qe(u, y.id) ? /* @__PURE__ */ (0, Y.jsx)(N, { children: $("currentModelHidden") }) : null,
		l.isPending ? /* @__PURE__ */ (0, Y.jsx)("div", {
			className: "px-2 py-1.5",
			children: /* @__PURE__ */ (0, Y.jsx)(In, {
				variant: "spin",
				showTimer: !1,
				label: q("settings:aiLibrary.modelsLoading")
			})
		}) : null,
		l.error ? /* @__PURE__ */ (0, Y.jsx)(he, {
			tone: "error",
			action: /* @__PURE__ */ (0, Y.jsx)(b, {
				type: "button",
				size: "small",
				variant: "secondary",
				disabled: l.isFetching,
				onClick: () => void l.refetch(),
				children: $("retryModels")
			}),
			children: Ue(l.error)
		}) : null,
		y && v && x.length > 1 ? /* @__PURE__ */ (0, Y.jsx)(ti, {
			efforts: x,
			value: S,
			onChange: (e) => r({
				...v,
				effort: e
			})
		}) : null,
		y?.effort_reported === !1 ? /* @__PURE__ */ (0, Y.jsx)(N, { children: q("settings:aiLibrary.effortUnreported") }) : null
	] });
}
function ei({ id: e, label: t }) {
	return /* @__PURE__ */ (0, Y.jsx)(f, {
		value: e,
		"data-ai-search-menu-row": "",
		className: Ur,
		children: ({ isSelected: e }) => /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [/* @__PURE__ */ (0, Y.jsx)("span", {
			className: "min-w-0 flex-1 wrap-anywhere text-body-medium",
			children: t
		}), /* @__PURE__ */ (0, Y.jsx)(V, { selected: e })] })
	});
}
function ti({ efforts: e, value: n, onChange: r }) {
	let i = q("settings:aiLibrary.effort"), a = Math.max(0, e.indexOf(n)), o = a === e.length - 1, u = (t) => `${t / (e.length - 1) * 100}%`;
	return /* @__PURE__ */ (0, Y.jsxs)(l, {
		"data-ai-search-effort": "",
		value: a,
		minValue: 0,
		maxValue: e.length - 1,
		onChange: (t) => r(e[t]),
		children: [
			/* @__PURE__ */ (0, Y.jsxs)(t, {
				className: "text-body-medium text-text-primary",
				children: [
					/* @__PURE__ */ (0, Y.jsx)("span", {
						"data-copy-key": "settings.aiLibrary.effort",
						className: "text-text-secondary",
						children: i
					}),
					" ",
					Xr(n)
				]
			}),
			/* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "flex justify-between text-caption-1-regular text-text-secondary",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, Y.jsx)("span", {
					"data-copy-key": "catalog.libraryAssistant.effortFaster",
					children: $("effortFaster")
				}), /* @__PURE__ */ (0, Y.jsx)("span", {
					"data-copy-key": "catalog.libraryAssistant.effortDeeper",
					children: $("effortDeeper")
				})]
			}),
			/* @__PURE__ */ (0, Y.jsxs)("div", {
				"data-ai-search-effort-surface": "",
				children: [o ? /* @__PURE__ */ (0, Y.jsx)(A, {}) : null, /* @__PURE__ */ (0, Y.jsxs)(s, {
					"data-ai-search-effort-track": "",
					children: [o ? null : /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [/* @__PURE__ */ (0, Y.jsx)("span", {
						"data-ai-search-effort-fill": "",
						style: { "--effort-fill-position": u(a) },
						"aria-hidden": !0
					}), /* @__PURE__ */ (0, Y.jsx)("span", {
						"data-ai-search-effort-stops": "",
						"aria-hidden": !0,
						children: e.map((e, t) => /* @__PURE__ */ (0, Y.jsx)("i", {
							"data-filled": t < a || void 0,
							style: { "--effort-stop-position": u(t) }
						}, e))
					})] }), /* @__PURE__ */ (0, Y.jsx)(c, {
						"aria-label": i,
						"data-ai-search-effort-thumb": ""
					})]
				})]
			})
		]
	});
}
// src/react/search/library-assistant.tsx
var ni = "peach.ai-assistant.demos-hidden", ri = "peach.ai-search.presets.v1", ii = "peach.ai-search.recent.v1", ai = 15e5, oi = {
	requests: 1,
	measured: 1,
	input_tokens: 672,
	output_tokens: 94
};
function si(e = !1) {
	try {
		let t = JSON.parse(localStorage.getItem(e ? ii : ri) || "[]"), n = ["zh-CN", "en"].map((e) => q("catalog:libraryAssistant.conditions", { lng: e }));
		return Array.isArray(t) ? t.filter((t) => typeof t?.name == "string" && Lr.includes(t.scope) && t.filters && typeof t.filters == "object" && (!e || typeof t.id == "string" && (!n.includes(t.name) || Array.isArray(t.messages)))).slice(0, e ? 50 : 12) : [];
	} catch {
		return [];
	}
}
var ci = () => sessionStorage.getItem("peach.library") || "", li = (e, t, n) => ({
	id: globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + "-" + Math.random().toString(36).slice(2),
	text: e,
	scope: t,
	library: n
});
function ui(e, t, n) {
	let r = new URLSearchParams();
	if (e !== "external") {
		for (let e of zr) {
			let n = t[e];
			e !== "outside" && e !== "releaseFrom" && e !== "releaseTo" && typeof n == "string" && n.trim() && r.set(e, n.trim());
		}
		let e = {
			min: t.releaseFrom || void 0,
			max: t.releaseTo || void 0
		};
		St("date", e) && r.set("column_filters", wt({}, "release", { range: e })), r.size && r.set("library", n);
	}
	return {
		params: r,
		outside: e !== "library" && typeof t.outside == "string" ? t.outside.trim() : ""
	};
}
function di(e, t, n, r) {
	if (!e) return [];
	let i = [];
	if (e.automatic && i.push({
		key: e.fixedTask ? "fixedTask" : "interpret",
		state: t ? "done" : r === "busy" ? "running" : r === "stopped" ? "stopped" : r === "error" ? "failed" : "waiting"
	}), !t) return i;
	let { params: a, outside: o } = ui(e.scope, t, e.library ?? "");
	for (let e of ["library", "external"]) {
		let t = n[e];
		(t || (e === "library" ? a.size : o)) && i.push({
			key: e,
			state: t ? t.error ? "failed" : "done" : r === "busy" ? "running" : r === "stopped" ? "stopped" : "waiting"
		});
	}
	return i;
}
function fi() {
	let [e, t] = (0, J.useState)(() => new URLSearchParams(location.search).get("ask")?.slice(0, 500) || ""), [n, r] = (0, J.useState)("library"), [i, a] = (0, J.useState)(ci), o = (0, J.useSyncExternalStore)(tt, at), s = o && !o.some((e) => e.id === i) ? "" : i, [c, l] = (0, J.useState)({}), [u, d] = (0, J.useState)(!1), [f, p] = (0, J.useState)(null), [m, h] = (0, J.useState)([]), [g, C] = (0, J.useState)(nn), [w, ee] = (0, J.useState)(null), [T, E] = (0, J.useState)(null), [D, te] = (0, J.useState)(() => {
		try {
			return localStorage.getItem(ni) !== "1";
		} catch {
			return !0;
		}
	}), [k, A] = (0, J.useState)(""), ne = gt(), M = ne.data?.tasks.find((e) => e.id === k), [P, re] = (0, J.useState)(null), [ie, ae] = (0, J.useState)(!0), F = xr(P !== null && ie), I = T !== null, L = hr(T), [R, oe] = (0, J.useState)(null), [ce, le] = (0, J.useState)(null), [z, B] = (0, J.useState)({}), [ue, de] = (0, J.useState)(), [fe, pe] = (0, J.useState)(!1), [me, he] = (0, J.useState)(() => si()), [ge, ve] = (0, J.useState)(() => si(!0)), ye = Pe();
	(0, J.useSyncExternalStore)(ye.subscribe, ye.version);
	let be = ye.value.searchHistoryLimit, V = ht(), H = yt({
		queryKey: _,
		queryFn: ({ signal: e }) => Me(v, e)
	}), xe = H.data?.task_profiles?.search, Se = H.data?.providers ?? [], U = Se.filter((e) => e.configured), Ce = xe?.provider ? U.find((e) => e.id === xe.provider) : it(U), we = Ce && {
		provider: Ce.id,
		model: xe?.model || Ce.model,
		effort: xe?.effort ?? Ce.default_efforts?.search ?? "default"
	}, Te = w && U.some((e) => e.id === w.provider) ? w : null, Ee = !H.isPending && !U.length ? /* @__PURE__ */ (0, Y.jsxs)("div", {
		className: "flex flex-col items-center gap-2",
		children: [H.error ? /* @__PURE__ */ (0, Y.jsx)("p", {
			role: "status",
			className: "text-body-regular text-text-secondary",
			"data-copy-key": H.error instanceof y && H.error.status === 403 ? "api.aiLibrary.privateAccess" : void 0,
			children: Ue(H.error)
		}) : null, /* @__PURE__ */ (0, Y.jsx)(en, {})]
	}) : null, De = !!(Te || we), Oe = Object.fromEntries(Object.entries(c).filter(([, e]) => e?.trim())), ke = ui(n, Oe, s), Ae = (e) => !!(e.releaseFrom && e.releaseTo && e.releaseFrom > e.releaseTo), je = !e.trim() && !!(ke.params.size || ke.outside), Fe = M?.provider ? U.find((e) => e.id === M.provider) : it(U), Le = M ? !!Fe : (n === "external" || !Ae(Oe)) && (je || !H.isPending && !!e.trim() && (De || n === "library")), W = !!V.busy, ze = W && !!R?.automatic && ce === null, G = W && ce !== null && !R?.fixedTask, Be = m.find((e) => e.turn.id === R?.id)?.answer, Ve = Object.keys(z).join(","), He = m.filter((e) => e.turn.id !== R?.id), K = {
		...R?.scope === n ? ce : {},
		...c
	}, We = ui(n, K, s), Ge = !!(We.params.size || We.outside) && (n === "external" || !Ae(K)), Ke = (e) => {
		let t = [...e], n = JSON.stringify(t);
		for (; n.length > ai && t.length > 1;) t.pop(), n = JSON.stringify(t);
		try {
			localStorage.setItem(ii, n);
		} catch {}
		ve(t);
	}, Je = (e, t) => {
		if (!e.turn.text) return;
		let n = f ?? e.turn.id, r = Object.fromEntries(Object.entries(e.results).map(([e, t]) => [e, Ht(t)])), i = [...m, {
			...e,
			results: r
		}].slice(-12);
		if (p(n), h(i), !be) return;
		let a = ge.find((e) => e.id === n)?.name ?? e.turn.text;
		Ke([{
			id: n,
			name: a,
			scope: e.turn.scope,
			filters: e.filters ?? {},
			messages: i,
			usage: t
		}, ...ge.filter((e) => e.id !== n)].slice(0, be));
	}, Ye = () => {
		re(null), A(""), E(null), oe(null), t(""), r("library"), l({}), ee(null), a(ci()), C(nn), pe(!1), de(void 0), le(null), B({}), p(null), h([]), d(!1), V.setError("");
	}, Xe = (e) => {
		e !== n && r(e);
	}, Ze = (e, t) => {
		oe(e), le(null), B({}), pe(!1), de(void 0);
		let n = g, r = (e) => {
			n = e, C(e), f && be && Ke(ge.map((t) => t.id === f ? {
				...t,
				usage: e
			} : t));
		};
		V.run("search", async (i) => {
			e.automatic && r({
				...g,
				requests: g.requests + 1
			});
			let a = await t(i, (e) => {
				e && !i.aborted && r({
					...n,
					measured: n.measured + 1,
					input_tokens: n.input_tokens + e.input_tokens,
					output_tokens: n.output_tokens + e.output_tokens
				});
			});
			i.throwIfAborted();
			let { filters: o, work: s, answer: c } = a;
			if (le(o), c !== void 0) return {
				turn: e,
				filters: o,
				results: {},
				answer: c
			};
			if (s) return {
				turn: e,
				filters: o,
				results: {},
				work: s
			};
			let { params: l, outside: u } = ui(e.scope, o, e.library ?? ""), d = [];
			return l.size && (l.set("limit", "20"), l.set("count", "0"), d.push({
				key: "library",
				url: "/api/items?" + l
			})), u && d.push({
				key: "external",
				url: "/api/ai-library/external-search?" + new URLSearchParams({ q: u })
			}), {
				turn: e,
				filters: o,
				results: Object.fromEntries(await Promise.all(d.map(async ({ key: e, url: t }) => {
					let n = await Me(t, i).catch((e) => ({
						items: [],
						error: Ue(e)
					}));
					return i.aborted || B((t) => ({
						...t,
						[e]: n
					})), [e, n];
				})))
			};
		}, (e) => {
			B(e.results), de(e.work), Je(e, n);
		}, (e) => {
			V.setError(Ue(e));
		});
	}, Qe = () => {
		let r = e.trim();
		!W && Le && (M ? (t(""), Ze({
			...li(r || M.name, n, s),
			automatic: !0,
			fixedTask: M.name
		}, async (e, t) => {
			let n = await Ne(S + "/run", {
				id: M.id,
				text: r,
				prompt_language: qe
			}, "POST", e).catch((e) => {
				throw e instanceof y && t(e.body?.usage), e;
			});
			return t(n.usage), {
				filters: {},
				answer: n.answer
			};
		})) : je ? Ze(li("", n, s), () => ({ filters: Oe })) : (t(""), De ? Ze({
			...li(r, n, s),
			automatic: !0
		}, async (e, t) => {
			let i = [...m].reverse().find((e) => !e.work && !e.stopped && e.filters && Object.keys(e.filters).length && (e.turn.library ?? "") === s)?.filters, a = await Ne("/api/ai-library/search-plan", {
				prompt_language: qe,
				query: r,
				scope: n,
				...Te && { connection: Te },
				...i && { previous_filters: i }
			}, "POST", e).catch((e) => {
				throw e instanceof y && t(e.body?.usage), e;
			});
			return t(a.usage), a.work ? {
				filters: {},
				work: a.work
			} : { filters: n === "external" ? a.filters : {
				...a.filters,
				...Oe
			} };
		}) : Ze(li(r, n, s), () => ({ filters: {
			...Oe,
			q: r
		} }))));
	}, $e = () => {
		!W && Ge && (d(!1), Ze(li("", n, s), () => ({ filters: K })));
	}, et = () => {
		I ? L.stop() : R && W && (V.cancel(), pe(!0), Je({
			turn: R,
			filters: ce,
			results: z,
			stopped: !0
		}, g));
	}, nt = (e) => {
		A(""), re(null), E(null);
		let n = Array.isArray(e.messages) ? e.messages : [{
			turn: {
				id: e.id,
				text: e.name,
				scope: e.scope
			},
			filters: e.filters,
			results: {}
		}], i = n.at(-1);
		i && (p(e.id), h(n), oe(i.turn), r(i.turn.scope), l({}), le(i.filters), t(""), B(i.results), a(i.turn.library ?? ci()), de(i.work), pe(!!i.stopped), C(e.usage ?? {
			...nn,
			requests: n.filter((e) => e.turn.automatic).length
		}), d(!1), V.setError(""));
	}, rt = (e) => {
		try {
			localStorage.setItem(ri, JSON.stringify(e));
		} catch {
			V.setError($("saveFailed"));
			return;
		}
		he(e);
	}, ot = me.some((e) => e.scope === n && JSON.stringify(e.filters) === JSON.stringify(K)), st = (e, t) => l((n) => ({
		...n,
		[e]: t
	})), ct = () => l(Object.fromEntries(zr.map((e) => [e, ""]))), lt = (e) => {
		L.restart(), E(e);
	}, ut = (e, t) => {
		t && F.restart(), ae(t), re(e);
	}, dt = () => {
		let e = !D;
		te(e);
		try {
			localStorage.setItem(ni, e ? "0" : "1");
		} catch {}
	}, ft = /* @__PURE__ */ (0, Y.jsx)(Qt, {
		fixedTask: I ? void 0 : M?.name,
		query: I ? "" : e,
		setQuery: t,
		busy: W,
		submit: Qe,
		stop: et,
		demo: I,
		loading: I ? !L.stopped && L.phase !== "done" : ze || G,
		canSubmit: Le,
		conditions: M && !I ? /* @__PURE__ */ (0, Y.jsx)(b, {
			type: "button",
			size: "xs",
			variant: "secondary",
			trailingIcon: _e,
			"data-ai-button": "round",
			className: "min-w-0 max-w-2/5 [&>span]:min-w-0",
			"aria-label": $("clearFixedTask"),
			title: M.name,
			disabled: W,
			onClick: () => A(""),
			children: /* @__PURE__ */ (0, Y.jsx)("span", {
				className: "block truncate",
				children: M.name
			})
		}) : /* @__PURE__ */ (0, Y.jsx)(qr, {
			scope: I ? "both" : n,
			filters: I ? {} : K,
			disabled: W || I,
			open: u,
			setOpen: d,
			onScope: Xe,
			onChange: st,
			clear: ct,
			actions: /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [
				n !== "external" && Ae(K) ? /* @__PURE__ */ (0, Y.jsx)(j, { children: $("invalidPeriod") }) : null,
				/* @__PURE__ */ (0, Y.jsxs)("div", {
					className: "flex flex-wrap gap-1",
					children: [
						/* @__PURE__ */ (0, Y.jsx)(b, {
							size: "small",
							disabled: !Ge,
							onClick: $e,
							children: $("execute")
						}),
						/* @__PURE__ */ (0, Y.jsx)(b, {
							size: "small",
							variant: "ghost",
							disabled: ot || !Ge,
							onClick: () => rt([{
								name: e.trim() || K.q || K.outside || $("scopes." + n),
								scope: n,
								filters: K
							}, ...me].slice(0, 12)),
							children: $(ot ? "saved" : "save")
						}),
						We.params.size ? /* @__PURE__ */ (0, Y.jsx)(x, {
							href: "/?" + new URLSearchParams({
								...Object.fromEntries(We.params),
								loc: "",
								thumb: "0"
							}),
							size: "small",
							variant: "ghost",
							children: $("openLibrary")
						}) : null
					]
				}),
				me.length ? /* @__PURE__ */ (0, Y.jsxs)("div", {
					className: "flex flex-col gap-1",
					children: [/* @__PURE__ */ (0, Y.jsx)("p", {
						className: "text-caption-1-medium text-text-secondary",
						"data-copy-key": "catalog.libraryAssistant.presets",
						children: $("presets")
					}), me.map((e, t) => /* @__PURE__ */ (0, Y.jsxs)("div", {
						className: "flex min-w-0 items-center gap-1",
						children: [/* @__PURE__ */ (0, Y.jsx)(b, {
							size: "small",
							variant: "ghost",
							className: "min-w-0 flex-1 justify-start",
							onClick: () => {
								r(e.scope), l({
									...Object.fromEntries(zr.map((e) => [e, ""])),
									...e.filters
								});
							},
							children: /* @__PURE__ */ (0, Y.jsx)("span", {
								className: "truncate",
								children: e.name
							})
						}), /* @__PURE__ */ (0, Y.jsx)(b, {
							size: "xs",
							variant: "ghost",
							iconOnly: !0,
							leadingIcon: se,
							"aria-label": $("removeEntry") + " " + e.name,
							onClick: () => rt(me.filter((e, n) => n !== t))
						})]
					}, t))]
				}) : null
			] })
		}),
		model: M && !I ? null : /* @__PURE__ */ (0, Y.jsx)(Zr, {
			providers: Se,
			fallback: we,
			value: Te,
			onChange: ee,
			disabled: W || I || H.isPending
		}),
		status: I ? /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [/* @__PURE__ */ (0, Y.jsx)(rn, {}), /* @__PURE__ */ (0, Y.jsxs)("div", {
			className: "ml-auto flex flex-wrap items-center gap-1",
			children: [
				L.phase === "done" || L.stopped ? /* @__PURE__ */ (0, Y.jsx)(an, { onReplay: L.restart }) : null,
				/* @__PURE__ */ (0, Y.jsx)(b, {
					type: "button",
					size: "xs",
					variant: "ghost",
					leadingIcon: Ie,
					"data-ai-button": "footer",
					onClick: () => E(null),
					children: /* @__PURE__ */ (0, Y.jsx)("span", {
						"data-copy-key": "catalog.libraryAssistant.exitDemo",
						children: $("exitDemo")
					})
				}),
				/* @__PURE__ */ (0, Y.jsx)(sn, {
					usage: L.phase === "interpret" ? {
						...nn,
						requests: 1
					} : oi,
					demo: !0,
					pending: L.phase === "interpret" && !L.stopped
				})
			]
		})] }) : /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [
			M ? null : /* @__PURE__ */ (0, Y.jsx)(on, {
				libraries: o,
				library: s,
				change: a,
				disabled: W || n === "external"
			}),
			/* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "ml-auto flex flex-wrap items-center gap-1",
				children: [/* @__PURE__ */ (0, Y.jsx)(kr, {
					choose: (e) => {
						A(""), ut(e, !1);
					},
					disabled: W,
					fixedTasks: ne.data?.tasks,
					selected: M?.id,
					chooseFixed: (e) => {
						A(e), d(!1), V.setError("");
					}
				}), /* @__PURE__ */ (0, Y.jsx)(sn, {
					usage: g,
					pending: ze,
					provider: M ? Fe?.id : (Te ?? we)?.provider
				})]
			}),
			R && Ee ? /* @__PURE__ */ (0, Y.jsx)("div", {
				className: "basis-full px-1.5",
				children: Ee
			}) : null,
			M && !Fe ? /* @__PURE__ */ (0, Y.jsx)("p", {
				className: "basis-full px-1.5 text-caption-1-regular text-text-secondary",
				children: q("settings:aiLibrary.taskConnectionMissing")
			}) : !M && De ? /* @__PURE__ */ (0, Y.jsx)("p", {
				className: "basis-full px-1.5 text-caption-1-regular text-text-secondary",
				"data-copy-key": n === "library" ? "catalog.libraryAssistant.share" : "catalog.libraryAssistant.shareExternal",
				children: $(n === "library" ? "share" : "shareExternal")
			}) : null
		] })
	}), pt = (e) => /* @__PURE__ */ (0, Y.jsx)(hi, {
		recent: ge.slice(0, be),
		historyEnabled: be > 0,
		active: f ?? void 0,
		busy: W,
		create: () => {
			Ye(), e?.();
		},
		openRecent: (t) => {
			nt(t), e?.();
		},
		removeRecent: (e) => {
			Ke(ge.filter((t) => t.id !== e.id)), f === e.id && Ye();
		}
	}), mt = di(R, ce, z, fe ? "stopped" : V.error ? "error" : W ? "busy" : "settled"), _t = L.phase === "done" ? L.results.external ? "external" : "library" : "", vt = ie ? /* @__PURE__ */ (0, Y.jsxs)($t, { children: [/* @__PURE__ */ (0, Y.jsx)(rn, {}), F.phase === "complete" ? /* @__PURE__ */ (0, Y.jsx)(an, { onReplay: F.restart }) : null] }) : null;
	return /* @__PURE__ */ (0, Y.jsx)(Zt, {
		active: !!(R || P) || I,
		focusKey: P ? P + "-" + F.run : I ? "demo-" + L.run : R?.id || "",
		resultKey: P ? "" : I ? _t : G ? "" : Be ? "fixed-answer" : Ve,
		compose: P ? vt : ft,
		history: pt,
		onBack: P || I ? () => {
			re(null), E(null);
		} : void 0,
		children: P ? /* @__PURE__ */ (0, Y.jsx)(Ar, {
			task: P,
			library: s,
			children: ie ? /* @__PURE__ */ (0, Y.jsx)(Sr, {
				task: P,
				phase: F.phase,
				run: F.run
			}) : null
		}, P) : T ? /* @__PURE__ */ (0, Y.jsx)(gr, {
			id: T,
			simulation: L
		}, L.run) : /* @__PURE__ */ (0, Y.jsxs)(Y.Fragment, { children: [
			R ? null : /* @__PURE__ */ (0, Y.jsx)(tn, {
				setupAction: Ee,
				demoCases: /* @__PURE__ */ (0, Y.jsx)(pr, {
					choose: lt,
					visible: D,
					toggle: dt,
					children: /* @__PURE__ */ (0, Y.jsx)(Or, { choose: (e) => ut(e, !0) })
				})
			}),
			He.map((e) => /* @__PURE__ */ (0, Y.jsxs)("div", {
				className: "flex min-w-0 flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, Y.jsx)(pi, {
						text: e.turn.text,
						task: e.turn.fixedTask
					}),
					/* @__PURE__ */ (0, Y.jsx)(dr, { steps: di(e.turn, e.filters, e.results, e.stopped ? "stopped" : "settled") }),
					e.answer ? /* @__PURE__ */ (0, Y.jsx)(mi, { answer: e.answer }) : null,
					e.work ? /* @__PURE__ */ (0, Y.jsx)(O, {
						summary: /* @__PURE__ */ (0, Y.jsx)("span", {
							"data-copy-key": "catalog.libraryAssistant.workTask." + e.work.kind,
							children: $("workTask." + e.work.kind)
						}),
						children: /* @__PURE__ */ (0, Y.jsx)(Mr, {
							plan: e.work,
							library: e.turn.library ?? ""
						})
					}) : null,
					Object.entries(e.results).map(([e, t]) => /* @__PURE__ */ (0, Y.jsx)(Jt, {
						source: e,
						result: t,
						historical: !0
					}, e))
				]
			}, e.turn.id)),
			R ? /* @__PURE__ */ (0, Y.jsxs)("div", {
				"data-ai-search-current": "",
				className: "flex min-w-0 flex-col gap-4",
				children: [
					R.text ? /* @__PURE__ */ (0, Y.jsx)(pi, {
						text: R.text,
						task: R.fixedTask
					}) : null,
					/* @__PURE__ */ (0, Y.jsx)(dr, { steps: mt }, R.id),
					Be ? /* @__PURE__ */ (0, Y.jsx)(mi, { answer: Be }) : null,
					ue ? /* @__PURE__ */ (0, Y.jsx)(Mr, {
						plan: ue,
						library: R.library ?? ""
					}, R.id) : null
				]
			}) : null,
			V.error ? /* @__PURE__ */ (0, Y.jsx)("div", {
				className: Re({
					variant: "outlined",
					padding: "none",
					className: "p-3"
				}),
				children: /* @__PURE__ */ (0, Y.jsx)(j, { children: V.error })
			}) : null,
			fe ? /* @__PURE__ */ (0, Y.jsx)(N, {
				role: "status",
				children: /* @__PURE__ */ (0, Y.jsx)("span", {
					"data-copy-key": "catalog.libraryAssistant.stopped",
					children: $("stopped")
				})
			}) : null,
			Ve ? /* @__PURE__ */ (0, Y.jsxs)("div", {
				"data-ai-search-results": "",
				className: "flex min-w-0 flex-col gap-4",
				children: [z.library ? /* @__PURE__ */ (0, Y.jsx)(Jt, {
					result: z.library,
					source: "library"
				}) : null, z.external ? /* @__PURE__ */ (0, Y.jsx)(Jt, {
					result: z.external,
					source: "external"
				}) : null]
			}) : null
		] })
	});
}
function pi({ text: e, task: t }) {
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		"data-ai-chat-message": "",
		className: "ml-auto assistant-message-width rounded-2xl rounded-br-md bg-background-primary-default px-4 py-2.5 text-body-regular wrap-anywhere text-text-primary",
		children: [t && t !== e ? /* @__PURE__ */ (0, Y.jsx)("p", {
			className: "text-caption-1-medium text-text-secondary",
			children: t
		}) : null, /* @__PURE__ */ (0, Y.jsx)("p", { children: e })]
	});
}
function mi({ answer: e }) {
	return /* @__PURE__ */ (0, Y.jsx)("p", {
		"data-ai-fixed-answer": "",
		className: "text-body-regular whitespace-pre-wrap wrap-anywhere text-text-primary",
		children: e
	});
}
function hi({ recent: e, historyEnabled: t, active: n, busy: r, create: i, openRecent: a, removeRecent: o }) {
	let s = (e, t, n, i, a) => /* @__PURE__ */ (0, Y.jsxs)("li", {
		className: "group flex min-w-0 items-center gap-1 rounded-lg",
		children: [/* @__PURE__ */ (0, Y.jsx)(b, {
			size: "small",
			variant: "ghost",
			leadingIcon: dt,
			className: "min-w-0 flex-1 justify-start",
			title: e,
			"aria-current": n ? "true" : void 0,
			disabled: r,
			onClick: i,
			children: /* @__PURE__ */ (0, Y.jsx)("span", {
				className: "truncate",
				children: e
			})
		}), /* @__PURE__ */ (0, Y.jsx)(b, {
			size: "xs",
			variant: "ghost",
			iconOnly: !0,
			leadingIcon: se,
			"data-ai-search-history-remove": "",
			"aria-label": $("removeEntry") + " " + e,
			title: $("removeEntry"),
			disabled: r,
			onClick: a
		})]
	}, t);
	return /* @__PURE__ */ (0, Y.jsxs)("div", {
		"data-ai-search-history": "",
		className: "flex min-w-0 flex-col gap-4",
		children: [/* @__PURE__ */ (0, Y.jsx)(b, {
			size: "small",
			variant: "ghost",
			leadingIcon: rt,
			className: "w-full justify-start",
			disabled: r,
			onClick: i,
			children: /* @__PURE__ */ (0, Y.jsx)("span", {
				"data-copy-key": "catalog.libraryAssistant.newSearch",
				children: $("newSearch")
			})
		}), t ? /* @__PURE__ */ (0, Y.jsxs)("section", {
			"aria-label": $("recent"),
			className: "flex min-w-0 flex-col gap-2",
			children: [/* @__PURE__ */ (0, Y.jsx)("h2", {
				className: "px-2 text-caption-1-medium! text-text-secondary",
				"data-copy-key": "catalog.libraryAssistant.recent",
				children: $("recent")
			}), e.length ? /* @__PURE__ */ (0, Y.jsx)("ul", {
				className: "flex min-w-0 flex-col gap-1",
				children: e.map((e) => s(e.name, e.id, n === e.id, () => a(e), () => o(e)))
			}) : /* @__PURE__ */ (0, Y.jsx)("p", {
				className: "px-2 text-caption-1-regular text-text-secondary",
				"data-copy-key": "catalog.libraryAssistant.historyEmpty",
				children: $("historyEmpty")
			})]
		}) : null]
	});
}
export { fi as LibraryAssistant };

//# debugId=401a8dee-a6a3-4b65-94e3-6b97878fac3d
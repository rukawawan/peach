(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "674b25f6-536a-4708-aaf8-bcd20af2a392", e._sentryDebugIdIdentifier = "sentry-dbid-674b25f6-536a-4708-aaf8-bcd20af2a392");
	} catch {}
})();
import { createPaginatedRowModel as e } from "./peach-app.createPaginatedRowModel-ClHnhG_T.js";
import { createSortedRowModel as t, useTableSelection as n } from "./peach-app.use-table-selection-BSdXI_Nc.js";
import { $2ec61d1d4f780267$export$a8a3e93435678ff9 as r, $542a13ca2fa5b484$export$5b6b19405a83ff9d as i, $76d00c5a4edb230a$export$76ccd210b9029917 as a, $76d00c5a4edb230a$export$816b5d811295e6bc as o, $76d00c5a4edb230a$export$b59bdbef9ce70de2 as s, $76d00c5a4edb230a$export$f6f0c3fe4ec306ea as c, $76d00c5a4edb230a$export$f850895b287ef28e as l, $b4f18e3395fe64d7$export$3d96ec278d3efce4 as u, $b4f18e3395fe64d7$export$3e41faf802a29e71 as d, $b4f18e3395fe64d7$export$b2539bed5023c21c as f, $ea3928288112382f$export$439d29a4e110a164 as p, $l as m, Button as h, ButtonLink as g, Bx as _, Checkbox as v, ChevronSortDown as ee, Chip as y, DataTableFooter as b, DataTableFrame as te, DataTableSort as x, EmptyFocusButton as S, EmptyState as C, ErrorText as w, ExternalLink as T, FEEDS_KEY as ne, FOLLOW_CREDENTIALS_KEY as re, FOLLOW_MANAGE_KEY as E, FOLLOW_MANAGE_NAV as D, FOLLOW_RESOLVE_KEY as O, FieldLabel as k, Help as A, Input as j, LoadingDots as M, M6 as N, MENU_ITEM as P, MENU_ITEM_INTERACTIVE as F, MENU_POPOVER_SURFACE as I, ModalFrame as L, Note as R, P7 as ie, SORT_DEFAULT_DIR as z, STAT_STRIP_SIX as B, SelectionDock as V, SelectionPopover as H, SiteLabel as ae, Switch as oe, Table as se, TableColumnControls as ce, TableColumnResizer as le, TableSelectionHeader as ue, TagManager as U, TaskProgress as W, Wt as de, Xf as fe, __toESM as pe, addAlias as me, addSource as he, avatarInner as G, busyProps as K, cardClass as ge, checkFeeds as _e, columnVisibilityFeature as ve, composingKey as q, confirmModal as ye, createColumnHelper as be, credentialDone as xe, cx as J, dZ as Y, errorHeadline as Se, errorMessage as X, feedIntervalText as Ce, fetchCredentials as we, fetchFeeds as Te, fetchFollow as Ee, fetchResolveJob as De, fetchSuggestions as Oe, flexRender as ke, followFeedByName as Ae, followFeedEntity as je, followSuggestKey as Me, groupByAuthor as Ne, isBroken as Pe, isLayout as Fe, keepSelected as Ie, localTime as Le, lookupFeedActor as Re, mapLimit as ze, pageSizeOf as Be, pageWindow as Ve, pv as He, queryClient as Ue, reloadFollowManage as We, removeAlias as Ge, removeFeed as Ke, renameAliasGroup as qe, require_jsx_runtime as Je, require_react as Ye, resolveFollowSort as Xe, rowPaginationFeature as Ze, rowSelectionFeature as Qe, rowSortingFeature as $e, setFeedEnabled as et, startCheck as tt, startResolve as nt, tableFeatures as rt, useAction as it, useBackgroundJob as at, useMutation as ot, useQuery as st, useTable as ct, useTablePreferences as lt } from "./peach-app.js";
import { Page as ut } from "./peach-app.page-QAncjzM1.js";
import { LEGACY_AVATAR_IMG as dt } from "./peach-app.legacy-avatar-NSITxLRS.js";
import { PillAriaTabList as ft } from "./peach-app.pill-aria-tab-list-BMY1ZEv1.js";
import { AuthorAvatar as pt, SourceIcon as mt } from "./peach-app.source-view-DalWfDkm.js";
import { SourceList as ht } from "./peach-app.source-list-ri5fRK2E.js";
// src/react/follow-manage/add-source.tsx
var Z = /* @__PURE__ */ pe(Ye(), 1), Q = Je(), gt = J(P, F, "text-body-2-medium"), _t = "粘贴来源链接，或输入创作者名、id…", vt = "添加创作者关注", yt = "查找中（首次按名字查要下载创作者索引，可能几十秒）", bt = "识别中", xt = "站内没有查到来源", St = "/settings/subscriptions", Ct = (e, t) => `${e}:${t.url}`;
function wt({ field: e, menu: t, options: n, active: r, busy: a, onPick: o, onClose: s }) {
	return (0, Z.useEffect)(() => {
		t.current?.querySelector("[aria-current=\"true\"]")?.scrollIntoView({ block: "nearest" });
	}, [t, r]), /* @__PURE__ */ (0, Q.jsxs)(i, {
		ref: t,
		triggerRef: e,
		isOpen: !0,
		isNonModal: !0,
		shouldFlip: !1,
		onOpenChange: (e) => {
			e || s();
		},
		placement: "bottom start",
		offset: 4,
		"aria-label": "来源建议",
		className: J(I, "flex w-(--trigger-width) flex-col gap-1 overscroll-contain"),
		children: [a && !n.length ? /* @__PURE__ */ (0, Q.jsx)("div", {
			className: "px-2 py-1.5",
			children: /* @__PURE__ */ (0, Q.jsx)(M, { label: "正在查找建议" })
		}) : null, n.map((e, t) => /* @__PURE__ */ (0, Q.jsxs)(Z.Fragment, { children: [e.group === n[t - 1]?.group ? null : /* @__PURE__ */ (0, Q.jsx)("div", {
			className: "px-2 pt-1 text-caption-1-regular text-text-tertiary",
			children: e.group
		}), /* @__PURE__ */ (0, Q.jsxs)("button", {
			type: "button",
			"aria-current": t === r ? "true" : void 0,
			className: t === r ? J(gt, "bg-background-secondary-default") : gt,
			onMouseDown: (e) => e.preventDefault(),
			onClick: () => o(e.value),
			children: [
				/* @__PURE__ */ (0, Q.jsx)("span", {
					className: "min-w-0 grow truncate text-left",
					children: e.value
				}),
				e.matched ? /* @__PURE__ */ (0, Q.jsx)("span", {
					className: "shrink-0 text-caption-1-regular text-text-tertiary",
					children: e.matched
				}) : null,
				e.n ? /* @__PURE__ */ (0, Q.jsx)("span", {
					className: "shrink-0 text-caption-1-regular tabular-nums text-text-tertiary",
					children: e.n.toLocaleString()
				}) : null
			]
		})] }, `${e.group}-${e.value}`))]
	});
}
function Tt({ credentials: e, hidden: t, onHidden: n }) {
	let r = (e.providers || []).filter((e) => e.followable), i = r.filter((e) => !t.has(e.provider_label)).length, a = i === r.length ? "全部来源" : `${i}/${r.length} 个来源`;
	return /* @__PURE__ */ (0, Q.jsx)(H, {
		label: "来源筛选",
		triggerLabel: a,
		leadingIcon: m,
		empty: "暂无可用来源",
		items: r.map((e) => ({
			id: e.provider_label,
			selected: !t.has(e.provider_label),
			label: /* @__PURE__ */ (0, Q.jsxs)("span", {
				className: "flex min-w-0 items-center gap-1.5",
				children: [/* @__PURE__ */ (0, Q.jsx)(mt, { provider: e.provider }), e.provider_label]
			})
		})),
		onChange: (e, r) => {
			let i = new Set(t);
			r ? i.delete(e) : i.add(e), n(i);
		},
		actions: [
			{
				label: "全选",
				disabled: !r.length,
				onPress: () => n(/* @__PURE__ */ new Set())
			},
			{
				label: "全不选",
				disabled: !r.length,
				onPress: () => n(new Set(r.map((e) => e.provider_label)))
			},
			{
				label: "凭据设置",
				href: St
			}
		]
	});
}
function Et({ row: e, at: t, hidden: n, unpicked: r, onPick: i }) {
	if (e.kind === "error") return /* @__PURE__ */ (0, Q.jsx)(R, {
		tone: "error",
		title: e.line,
		children: e.error || "查找失败"
	});
	let a = (e.candidates || []).filter((e) => !n.has(e.provider_label || "")), o = Object.entries(e.failures || {});
	return /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: ge({
			variant: "outlined",
			padding: "none",
			className: "flex flex-col gap-2 p-4"
		}),
		children: [
			/* @__PURE__ */ (0, Q.jsx)("b", {
				className: "text-body-medium text-text-primary",
				children: e.line
			}),
			a.length ? a.map((e) => {
				let n = Ct(t, e);
				return /* @__PURE__ */ (0, Q.jsx)(v, {
					isSelected: !e.known && !r.has(n),
					isDisabled: e.known,
					onChange: (e) => i(n, e),
					children: /* @__PURE__ */ (0, Q.jsxs)("span", {
						className: "flex min-w-0 flex-wrap items-center gap-1.5",
						children: [
							/* @__PURE__ */ (0, Q.jsx)(mt, { provider: e.provider }),
							/* @__PURE__ */ (0, Q.jsx)("b", {
								className: "text-body-medium",
								children: e.provider_label
							}),
							/* @__PURE__ */ (0, Q.jsx)("span", {
								className: "min-w-0 break-words",
								children: e.label
							}),
							/* @__PURE__ */ (0, Q.jsx)("small", {
								className: "text-caption-1-regular text-text-secondary",
								children: e.known ? "已经关注" : e.evidence
							})
						]
					})
				}, n);
			}) : /* @__PURE__ */ (0, Q.jsx)(A, { children: xt }),
			(e.external_searches || []).map((e) => /* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, Q.jsx)("small", {
					className: "text-caption-1-regular text-text-secondary",
					children: e.evidence
				}), /* @__PURE__ */ (0, Q.jsx)(T, {
					href: e.url,
					children: `${e.label}：${e.query}`
				})]
			}, e.url)),
			o.length ? /* @__PURE__ */ (0, Q.jsx)(A, { children: o.map(([e, t]) => `${e}：${t}`).join("；") }) : null
		]
	});
}
function Dt({ data: e, credentials: t, readOnly: n, toast: r }) {
	let [i, a] = (0, Z.useState)(""), [o, s] = (0, Z.useState)(!1), [c, l] = (0, Z.useState)(""), [u, d] = (0, Z.useState)(""), [f, p] = (0, Z.useState)(!1), [m, g] = (0, Z.useState)(null), [_, v] = (0, Z.useState)(-1), ee = (0, Z.useRef)(null), y = (0, Z.useRef)(null), [b, te] = (0, Z.useState)(/* @__PURE__ */ new Set()), [x, S] = (0, Z.useState)(/* @__PURE__ */ new Set()), [C, w] = (0, Z.useState)(""), [T, ne] = (0, Z.useState)(0);
	(0, Z.useEffect)(() => {
		let e = i.trim();
		if (o || !e || e.includes("/")) {
			d("");
			return;
		}
		let t = setTimeout(() => d(e), 250);
		return () => clearTimeout(t);
	}, [i, o]);
	let re = st({
		queryKey: Me(u),
		queryFn: ({ signal: e }) => Oe(u, e),
		enabled: u.length > 0 && f && !o && m !== i
	}), E = (0, Z.useMemo)(() => (re.data?.groups || []).flatMap((e) => e.items.map((t) => ({
		value: t.value,
		matched: t.matched || "",
		n: t.n || 0,
		group: e.label
	}))), [re.data]), { job: D, running: A, outcome: M, start: N, dismiss: P } = at({
		queryKey: O,
		queryFn: ({ signal: e }) => De(e),
		start: (e) => nt([e]),
		onStarted: () => S(/* @__PURE__ */ new Set()),
		onError: (e) => w(X(e)),
		onFinish: (e) => {
			e.status === "failed" && w(e.error || "查找失败");
		}
	}), F = (e) => {
		let t = e.trim();
		!t || n || o || A || N.isPending || (w(""), v(-1), l(t), a(t), d(""), g(t), N.mutate(t));
	}, I = re.isFetching, L = f && !o && m !== i && (E.length > 0 || I), ie = () => {
		v(-1), g(i);
	}, z = (e) => {
		if (!(o || q(e.nativeEvent))) {
			if (e.key === "Escape" && L) ie();
			else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				if (!E.length) return;
				if (e.preventDefault(), !L) {
					g(null);
					return;
				}
				let t = e.key === "ArrowDown" ? 1 : -1;
				v((e) => {
					let n = e + t;
					return n < 0 ? E.length - 1 : n >= E.length ? 0 : n;
				});
			} else e.key === "Enter" && (e.preventDefault(), F(E[_]?.value || i));
		}
	}, B = M?.results || [], V = B.flatMap((e, t) => (e.candidates || []).filter((e) => !e.known && !b.has(e.provider_label || "")).map((e) => ({
		candidate: e,
		key: Ct(t, e)
	})).filter((e) => !x.has(e.key))), H = ot({
		mutationFn: async (e) => {
			let t = [], n = [];
			ne(0);
			for (let r of e) {
				try {
					let e = await he(r.candidate);
					n.push(e.source);
				} catch (e) {
					t.push(`${r.candidate.label}：${X(e)}`);
				}
				ne((e) => e + 1);
			}
			if (n.length) try {
				await tt(n);
			} catch (e) {
				t.push(X(e));
			}
			return {
				failures: t,
				sources: n
			};
		},
		onSuccess: (e) => {
			We(), e.failures.length ? w(e.failures.join("；")) : (w(""), P(), r(`已添加 ${e.sources.length} 个关注来源`));
		},
		onError: (e) => w(X(e))
	}), ae = e.suggestions || [], oe = !c.includes("/");
	return /* @__PURE__ */ (0, Q.jsxs)("section", {
		"aria-label": vt,
		className: ge({
			padding: "none",
			className: "flex flex-col gap-4 px-6 py-5 max-sm:px-4"
		}),
		children: [
			/* @__PURE__ */ (0, Q.jsx)("h3", {
				className: "text-title-2-medium text-text-primary",
				children: vt
			}),
			/* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-wrap items-end gap-2",
				children: [
					/* @__PURE__ */ (0, Q.jsxs)("div", {
						ref: ee,
						className: "min-w-64 grow",
						onFocus: () => p(!0),
						onBlur: (e) => {
							let t = e.relatedTarget;
							!e.currentTarget.contains(t) && !y.current?.contains(t) && p(!1);
						},
						children: [/* @__PURE__ */ (0, Q.jsx)(j, {
							"aria-label": "来源链接、名字或 id",
							placeholder: _t,
							value: i,
							leadingIcon: He,
							enterKeyHint: "search",
							isDisabled: n,
							onChange: a,
							onCompositionStart: () => {
								s(!0), v(-1);
							},
							onCompositionEnd: (e) => {
								s(!1), a(e.currentTarget.value);
							},
							onKeyDown: z
						}), L ? /* @__PURE__ */ (0, Q.jsx)(wt, {
							field: ee,
							menu: y,
							options: E,
							active: _,
							busy: I,
							onPick: F,
							onClose: ie
						}) : null]
					}),
					/* @__PURE__ */ (0, Q.jsx)(Tt, {
						credentials: t,
						hidden: b,
						onHidden: te
					}),
					/* @__PURE__ */ (0, Q.jsx)(h, {
						variant: "primary",
						disabled: n || !i.trim(),
						...K(A || N.isPending),
						onClick: () => F(i),
						children: "查找"
					})
				]
			}),
			/* @__PURE__ */ (0, Q.jsxs)("div", {
				"aria-live": "polite",
				className: "flex flex-col gap-3 empty:hidden",
				children: [A || N.isPending ? /* @__PURE__ */ (0, Q.jsx)(W, {
					embedded: !0,
					label: D?.message || (D?.total ? `查找中：${D.checked || 0}/${D.total}` : oe ? yt : bt),
					value: D?.checked,
					total: D?.total
				}) : null, C ? /* @__PURE__ */ (0, Q.jsx)(R, {
					tone: "error",
					title: "这一次没有完成",
					children: C
				}) : null]
			}),
			B.length ? /* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, Q.jsx)(k, { children: "查找结果" }),
					B.map((e, t) => /* @__PURE__ */ (0, Q.jsx)(Et, {
						row: e,
						at: t,
						hidden: b,
						unpicked: x,
						onPick: (e, t) => {
							let n = new Set(x);
							t ? n.delete(e) : n.add(e), S(n);
						}
					}, `${e.line}-${t}`)),
					/* @__PURE__ */ (0, Q.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ (0, Q.jsx)(h, {
								variant: "secondary",
								size: "small",
								onClick: () => P(),
								children: "关闭"
							}),
							/* @__PURE__ */ (0, Q.jsx)(h, {
								variant: "primary",
								size: "small",
								disabled: n || !V.length,
								...K(H.isPending),
								onClick: () => H.mutate(V),
								children: `添加选中（${V.length}）`
							}),
							H.isPending ? /* @__PURE__ */ (0, Q.jsx)("span", {
								role: "status",
								className: "text-body-2-regular text-text-secondary",
								children: `添加中… ${T}/${V.length}`
							}) : null
						]
					})
				]
			}) : null,
			ae.length ? /* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, Q.jsx)("span", {
					className: "text-body-2-regular text-text-secondary",
					children: "猜你喜欢"
				}), ae.map((e) => /* @__PURE__ */ (0, Q.jsx)(h, {
					variant: "secondary",
					size: "small",
					disabled: n,
					title: `浏览历史里出现 ${e.visits} 次${e.origin ? ` · ${e.origin}` : ""}`,
					onClick: () => F(e.name),
					children: e.name
				}, e.name))]
			}) : null
		]
	});
}
// src/react/follow-manage/add-feed.tsx
var Ot = "输入女优名，到 JavDB 找她的演员页", kt = "添加 JAV 订阅";
function At(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e.candidates) t.has(r.id) && r.held_by && n.set(r.held_by.id, r.held_by.name);
	if (n.size > 1) return {
		text: `所勾的卡分属数据库里不同的人：${[...n.values()].join("、")}，先去合并再订`,
		blocked: !0
	};
	let [r] = n.values();
	return r ? {
		text: `会登记到「${r}」名下`,
		blocked: !1
	} : e.known ? {
		text: `会登记到数据库里的「${e.known.name}」名下`,
		blocked: !1
	} : {
		text: `数据库里还没有「${e.q}」，会新建一位`,
		blocked: !1
	};
}
function jt({ card: e, picked: t, onPick: n }) {
	return /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: "flex flex-wrap items-center gap-2",
		children: [/* @__PURE__ */ (0, Q.jsx)(v, {
			isSelected: t,
			onChange: n,
			children: /* @__PURE__ */ (0, Q.jsxs)("span", {
				className: "flex min-w-0 flex-wrap items-center gap-1.5",
				children: [
					/* @__PURE__ */ (0, Q.jsx)("span", {
						className: "min-w-0 break-words",
						children: e.names.join("、")
					}),
					e.record ? /* @__PURE__ */ (0, Q.jsx)(y, {
						variant: "caption",
						color: "neutral",
						children: e.record
					}) : null,
					e.held_by ? /* @__PURE__ */ (0, Q.jsx)("small", {
						className: "text-caption-1-regular text-text-secondary",
						children: `已在「${e.held_by.name}」名下`
					}) : null
				]
			})
		}), /* @__PURE__ */ (0, Q.jsx)(T, {
			href: e.url,
			children: e.id
		})]
	});
}
function Mt({ readOnly: e, toast: t, onAdded: n }) {
	let [r, i] = (0, Z.useState)(""), [a, o] = (0, Z.useState)(null), [s, c] = (0, Z.useState)(/* @__PURE__ */ new Set()), l = it(), u = () => {
		let t = r.trim();
		t && !e && l.run("lookup", (e) => Re(t, e), (e) => {
			o(e), c(new Set(e.suggested));
		});
	}, d = (e) => {
		e.key === "Enter" && !q(e.nativeEvent) && (e.preventDefault(), u());
	}, f = () => {
		o(null), c(/* @__PURE__ */ new Set()), l.setError("");
	}, p = () => {
		a && l.run("follow", (e) => Ae(a.q, [...s], e), (e) => {
			t(e.created ? `已新建「${e.entity_name}」并订阅她的新作` : `已订阅「${e.entity_name}」的新作`), i(""), f(), n();
		});
	}, m = () => {
		let e = a?.known;
		e && l.run("known", (t) => je(e.id, t), () => {
			t(`已订阅「${e.name}」的新作`), i(""), f(), n();
		});
	}, g = a ? At(a, s) : null, _ = a && !a.candidates.length && a.known?.subscribable ? a.known : null;
	return /* @__PURE__ */ (0, Q.jsxs)("section", {
		"aria-label": kt,
		className: ge({
			padding: "none",
			className: "flex flex-col gap-4 px-6 py-5 max-sm:px-4"
		}),
		children: [
			/* @__PURE__ */ (0, Q.jsx)("h3", {
				className: "text-title-2-medium text-text-primary",
				children: kt
			}),
			/* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-wrap items-end gap-2",
				children: [/* @__PURE__ */ (0, Q.jsx)("div", {
					className: "min-w-64 grow",
					children: /* @__PURE__ */ (0, Q.jsx)(j, {
						"aria-label": "女优名",
						placeholder: Ot,
						value: r,
						leadingIcon: He,
						enterKeyHint: "search",
						isDisabled: e,
						onChange: i,
						onKeyDown: d
					})
				}), /* @__PURE__ */ (0, Q.jsx)(h, {
					variant: "primary",
					disabled: e || !r.trim(),
					...K(l.busy === "lookup"),
					onClick: u,
					children: "查找"
				})]
			}),
			l.error ? /* @__PURE__ */ (0, Q.jsx)(R, {
				tone: "error",
				title: "这一次没有完成",
				children: l.error
			}) : null,
			a ? /* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-col gap-3",
				children: [
					a.unavailable ? /* @__PURE__ */ (0, Q.jsx)(R, {
						tone: "warning",
						title: "JavDB 这一次没有搜成",
						children: a.unavailable
					}) : null,
					/* @__PURE__ */ (0, Q.jsx)(k, { children: "JavDB 上的演员卡" }),
					a.candidates.length ? a.candidates.map((e) => /* @__PURE__ */ (0, Q.jsx)(jt, {
						card: e,
						picked: s.has(e.id),
						onPick: (t) => c((n) => {
							let r = new Set(n);
							return t ? r.add(e.id) : r.delete(e.id), r;
						})
					}, e.id)) : /* @__PURE__ */ (0, Q.jsx)(A, { children: a.unavailable ? "这一次没有拿到演员卡。" : "JavDB 上没有搜到这个名字。" }),
					a.candidates.length ? /* @__PURE__ */ (0, Q.jsx)(A, {
						role: "status",
						children: s.size ? g.text : "勾选她的演员卡；有碼与無碼两条记录都是她的话，两张都勾。"
					}) : null,
					_ ? /* @__PURE__ */ (0, Q.jsx)(A, {
						role: "status",
						children: _.following ? `数据库里的「${_.name}」已经在订阅新作。` : `数据库里的「${_.name}」已有 JavDB 或 DMM 编号，可以直接订阅。`
					}) : null,
					/* @__PURE__ */ (0, Q.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ (0, Q.jsx)(h, {
								variant: "secondary",
								size: "small",
								onClick: f,
								children: "关闭"
							}),
							a.candidates.length ? /* @__PURE__ */ (0, Q.jsx)(h, {
								variant: "primary",
								size: "small",
								disabled: e || !s.size || g.blocked,
								...K(l.busy === "follow"),
								onClick: p,
								children: `添加订阅（${s.size}）`
							}) : null,
							_ && !_.following ? /* @__PURE__ */ (0, Q.jsx)(h, {
								variant: "primary",
								size: "small",
								disabled: e,
								...K(l.busy === "known"),
								onClick: m,
								children: `订阅「${_.name}」`
							}) : null
						]
					})
				]
			}) : null
		]
	});
}
// src/react/follow-manage/alias-rename-dialog.tsx
function Nt({ group: e, close: t, receipt: n }) {
	return /* @__PURE__ */ (0, Q.jsx)(L, {
		isOpen: !!e,
		onOpenChange: (e) => {
			e || t();
		},
		width: "form",
		label: "修改统一名称",
		children: e ? /* @__PURE__ */ (0, Q.jsx)(Pt, {
			group: e,
			close: t,
			receipt: n
		}, e.canonical_key) : null
	});
}
function Pt({ group: e, close: t, receipt: n }) {
	let [i, a] = (0, Z.useState)(e.canonical_name), o = it();
	return /* @__PURE__ */ (0, Q.jsxs)("form", {
		onSubmit: (r) => {
			r.preventDefault(), i.trim() && i.trim() !== e.canonical_name && o.run("rename", (t) => qe(e.canonical_key, i.trim(), t), () => {
				We(), n(`已把统一名称改为 ${i.trim()}`), t();
			});
		},
		className: "flex min-h-0 flex-col gap-4 p-5",
		children: [
			/* @__PURE__ */ (0, Q.jsx)(r, {
				slot: "title",
				className: "text-title-2-semibold text-text-primary",
				children: "修改统一名称"
			}),
			/* @__PURE__ */ (0, Q.jsxs)("p", {
				className: "text-body-2-regular wrap-anywhere text-text-secondary",
				children: ["当前名称：", e.canonical_name]
			}),
			/* @__PURE__ */ (0, Q.jsx)(j, {
				"aria-label": "统一名称",
				autoFocus: !0,
				value: i,
				onChange: a
			}),
			/* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, Q.jsx)(k, { children: "选择已有别名" }), /* @__PURE__ */ (0, Q.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: e.aliases.map((e) => /* @__PURE__ */ (0, Q.jsx)(h, {
						variant: "secondary",
						size: "small",
						onClick: () => a(e.name),
						children: e.name
					}, e.key))
				})]
			}),
			/* @__PURE__ */ (0, Q.jsx)("p", {
				className: "text-body-2-regular text-text-secondary",
				children: "原名称保留为别名，关联档案和作品署名会同步更新。"
			}),
			o.error ? /* @__PURE__ */ (0, Q.jsx)(R, {
				tone: "error",
				children: o.error
			}) : null,
			/* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-wrap justify-end gap-2",
				children: [/* @__PURE__ */ (0, Q.jsx)(h, {
					variant: "secondary",
					onClick: t,
					children: "取消"
				}), /* @__PURE__ */ (0, Q.jsx)(h, {
					type: "submit",
					variant: "primary",
					disabled: !i.trim() || i.trim() === e.canonical_name,
					...K(!!o.busy),
					children: "修改统一名称"
				})]
			})
		]
	});
}
// src/react/follow-manage/alias-manager.tsx
var Ft = (e) => `将移除别名「${e}」，对应来源恢复为独立创作者组。`, It = rt({
	rowSelectionFeature: Qe,
	rowSortingFeature: $e,
	rowPaginationFeature: Ze,
	columnVisibilityFeature: ve,
	sortedRowModel: t(),
	paginatedRowModel: e()
}), Lt = It, Rt = {
	id: "select",
	label: "选择",
	width: 48,
	min: 48,
	max: 48,
	required: !0
}, zt = {
	id: "canonical",
	label: "统一名称",
	width: 280,
	min: 240,
	required: !0,
	flex: !0
}, Bt = [
	Rt,
	zt,
	{
		id: "alias",
		label: "平台别名",
		width: 240
	},
	{
		id: "evidence",
		label: "依据",
		width: 320
	},
	{
		id: "actions",
		label: "操作",
		width: 112
	}
], Vt = [
	Rt,
	zt,
	{
		id: "aliases",
		label: "平台别名",
		width: 400
	},
	{
		id: "actions",
		label: "操作",
		width: 184,
		min: 168
	}
], Ht = (e) => e.alias;
function Ut(e, t, n) {
	let r = n ? `name:${n}` : "", i = r && e.find((e) => e.author_key === r) || e.find((e) => e.author_name === t || e.entity_name === t);
	return i ? e.filter((e) => e.author_key === i.author_key) : [];
}
function Wt({ sources: e, name: t, canonicalKey: n }) {
	return /* @__PURE__ */ (0, Q.jsxs)("span", {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ (0, Q.jsx)(pt, {
			group: Ut(e, t, n),
			name: t
		}), /* @__PURE__ */ (0, Q.jsx)("b", {
			className: "text-body-medium",
			children: t
		})]
	});
}
function Gt({ groups: e, suggestions: t, sources: r = [], readOnly: i, toast: u }) {
	let d = lt("alias-suggestions", Bt), f = lt("alias-saved", Vt), [p, m] = (0, Z.useState)(null), [g, _] = (0, Z.useState)({}), [y, T] = (0, Z.useState)({}), ne = n(() => _({})), re = n(() => T({})), [E, D] = (0, Z.useState)([]), [O, A] = (0, Z.useState)([]), [M, N] = (0, Z.useState)({
		pageIndex: 0,
		pageSize: 20
	}), [P, F] = (0, Z.useState)({
		pageIndex: 0,
		pageSize: 20
	}), I = {
		...M,
		pageIndex: Math.min(M.pageIndex, Math.max(0, Math.ceil(t.length / M.pageSize) - 1))
	}, L = {
		...P,
		pageIndex: Math.min(P.pageIndex, Math.max(0, Math.ceil(e.length / P.pageSize) - 1))
	}, [R, z] = (0, Z.useState)(""), [B, H] = (0, Z.useState)(""), [ae, oe] = (0, Z.useState)(""), U = ot({
		mutationFn: async (e) => {
			let t = 0;
			for (let n of e) {
				try {
					await me(n.canonical, n.alias);
				} catch (n) {
					throw t && We(), Error(`${X(n)}（还有 ${e.length - t} 组没有合并）`);
				}
				t += 1;
			}
			return {
				done: t,
				items: e
			};
		},
		onSuccess: (e) => {
			z(""), _({}), We(), u(`已合并 ${e.done} 组创作者别名`);
		},
		onError: (e) => z(X(e))
	}), W = ot({
		mutationFn: (e) => me(e.canonical, e.alias),
		onSuccess: () => {
			z(""), H(""), oe(""), We(), u("已保存创作者别名");
		},
		onError: (e) => z(X(e))
	}), de = ot({
		mutationFn: async (e) => {
			let t = typeof e == "string" ? [e] : e, n = 0;
			try {
				for (let e of t) await Ge(e), n += 1;
			} catch (e) {
				throw Error(`${X(e)}（已移除 ${n} 个别名，还有 ${t.length - n} 个未移除）`);
			} finally {
				We();
			}
		},
		onSuccess: () => {
			z(""), T({}), u("已移除创作者别名");
		},
		onError: (e) => z(X(e))
	}), pe = (e, t) => {
		e.length && ye({
			title: t ? "合并全部创作者别名" : "合并所选创作者别名",
			body: `将合并以下 ${e.length} 组创作者：${e.map((e) => `「${e.alias}」归入「${e.canonical}」`).join("；")}。`,
			confirmLabel: t ? "合并全部别名" : "合并所选别名",
			onConfirm: () => U.mutateAsync(e)
		});
	}, he = (e) => void ye({
		title: "移除创作者别名",
		body: Ft(e),
		confirmLabel: "移除创作者别名",
		onConfirm: () => de.mutateAsync(e)
	}), G = (0, Z.useRef)({
		sources: r,
		readOnly: i,
		merging: U.isPending,
		removing: de.isPending,
		merge: pe,
		remove: he,
		rename: m
	});
	G.current = {
		sources: r,
		readOnly: i,
		merging: U.isPending,
		removing: de.isPending,
		merge: pe,
		remove: he,
		rename: m
	};
	let _e = (0, Z.useMemo)(() => {
		let e = be();
		return e.columns([
			e.display({
				id: "select",
				header: (e) => /* @__PURE__ */ (0, Q.jsx)(ue, {
					table: e.table,
					label: "全选待合并别名"
				}),
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)(v, {
					slot: null,
					isSelected: e.row.getIsSelected(),
					"aria-label": `选择别名 ${e.row.original.alias}，归入 ${e.row.original.canonical}`,
					onChange: (t) => e.row.toggleSelected(t)
				})
			}),
			e.accessor("canonical", {
				header: "统一名称",
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)(Wt, {
					sources: G.current.sources,
					name: e.getValue()
				})
			}),
			e.accessor("alias", {
				header: "平台别名",
				cell: (e) => e.getValue()
			}),
			e.accessor("evidence", {
				header: "依据",
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)("span", {
					className: "text-body-2-regular text-text-secondary",
					children: e.getValue()
				})
			}),
			e.display({
				id: "actions",
				header: "操作",
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)(h, {
					variant: "secondary",
					size: "small",
					disabled: G.current.readOnly,
					...K(G.current.merging),
					onClick: () => G.current.merge([e.row.original], !1),
					children: "合并"
				})
			})
		]);
	}, []), ve = (0, Z.useMemo)(() => {
		let e = be();
		return e.columns([
			e.display({
				id: "select",
				header: ({ table: e }) => /* @__PURE__ */ (0, Q.jsx)(ue, {
					table: e,
					label: "全选已保存别名"
				}),
				cell: ({ row: e }) => /* @__PURE__ */ (0, Q.jsx)(v, {
					slot: null,
					"aria-label": `选择已保存别名 ${e.original.canonical_name}`,
					isSelected: e.getIsSelected(),
					onChange: (t) => e.toggleSelected(t)
				})
			}),
			e.accessor("canonical_name", {
				id: "canonical",
				header: "统一名称",
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)(Wt, {
					sources: G.current.sources,
					name: e.getValue(),
					canonicalKey: e.row.original.canonical_key
				})
			}),
			e.accessor("aliases", {
				header: "平台别名",
				sortFn: (e, t) => e.original.aliases.map((e) => e.name).join(" ").localeCompare(t.original.aliases.map((e) => e.name).join(" "), "zh-CN"),
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)("span", {
					className: "flex flex-wrap items-center gap-1.5",
					children: e.getValue().map((e) => /* @__PURE__ */ (0, Q.jsxs)("span", {
						className: "inline-flex items-center gap-1 rounded-md bg-background-secondary-default px-1.5 py-1 text-caption-1-medium text-text-secondary",
						children: [e.name, /* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "ghost",
							size: "xs",
							iconOnly: !0,
							leadingIcon: ie,
							"aria-label": `移除别名 ${e.name}`,
							disabled: G.current.readOnly,
							...K(G.current.removing),
							onClick: () => G.current.remove(e.name)
						})]
					}, e.key))
				})
			}),
			e.display({
				id: "actions",
				header: "操作",
				cell: ({ row: e }) => /* @__PURE__ */ (0, Q.jsx)(h, {
					variant: "secondary",
					size: "small",
					disabled: G.current.readOnly,
					"aria-label": `修改 ${e.original.canonical_name} 的统一名称`,
					onClick: () => G.current.rename(e.original),
					children: "修改统一名称"
				})
			})
		]);
	}, []), q = ct({
		features: It,
		data: t,
		columns: _e,
		getRowId: Ht,
		state: {
			rowSelection: g,
			sorting: E,
			pagination: I,
			columnVisibility: d.visibility
		},
		onColumnVisibilityChange: d.change,
		onRowSelectionChange: (e) => {
			ne(), _(e);
		},
		onSortingChange: (e) => {
			D(e), N((e) => ({
				...e,
				pageIndex: 0
			}));
		},
		onPaginationChange: N,
		enableRowSelection: !0
	}), xe = ct({
		features: Lt,
		data: e,
		columns: ve,
		getRowId: (e) => e.canonical_key,
		state: {
			rowSelection: y,
			sorting: O,
			pagination: L,
			columnVisibility: f.visibility
		},
		onColumnVisibilityChange: f.change,
		onRowSelectionChange: (e) => {
			re(), T(e);
		},
		enableRowSelection: !0,
		onSortingChange: (e) => {
			A(e), F((e) => ({
				...e,
				pageIndex: 0
			}));
		},
		onPaginationChange: F
	}), J = q.getSelectedRowModel().rows.map((e) => e.original), Y = xe.getSelectedRowModel().rows.flatMap((e) => e.original.aliases.map((e) => e.name)), Se = K(U.isPending);
	return /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: ge({
			padding: "none",
			className: "flex flex-col gap-4 px-6 py-5 max-sm:px-4"
		}),
		children: [
			/* @__PURE__ */ (0, Q.jsx)("h3", {
				className: "text-title-2-medium text-text-primary",
				children: "创作者别名"
			}),
			/* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, Q.jsx)(k, { children: "手动添加别名" }), /* @__PURE__ */ (0, Q.jsxs)("div", {
					className: "flex flex-wrap items-end gap-2",
					children: [
						/* @__PURE__ */ (0, Q.jsx)(j, {
							"aria-label": "统一名称",
							placeholder: "在 Peach 中统一显示的名称",
							value: B,
							onChange: H,
							isDisabled: i,
							className: "w-56"
						}),
						/* @__PURE__ */ (0, Q.jsx)(j, {
							"aria-label": "平台别名",
							placeholder: "平台别名",
							value: ae,
							onChange: oe,
							isDisabled: i,
							className: "w-56"
						}),
						/* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "primary",
							disabled: i || !B.trim() || !ae.trim(),
							...K(W.isPending),
							onClick: () => W.mutate({
								canonical: B.trim(),
								alias: ae.trim()
							}),
							children: "保存别名"
						})
					]
				})]
			}),
			R ? /* @__PURE__ */ (0, Q.jsx)(w, { children: R }) : null,
			t.length ? /* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, Q.jsxs)("div", {
						"data-responsive-toolbar": "",
						children: [/* @__PURE__ */ (0, Q.jsxs)("div", {
							"data-toolbar-heading": "",
							children: [/* @__PURE__ */ (0, Q.jsx)(k, { children: "待合并" }), /* @__PURE__ */ (0, Q.jsx)("span", {
								className: "text-body-2-regular text-text-secondary",
								children: `${t.length} 组`
							})]
						}), /* @__PURE__ */ (0, Q.jsxs)("div", {
							"data-toolbar-actions": "",
							children: [
								/* @__PURE__ */ (0, Q.jsx)(h, {
									variant: "primary",
									size: "small",
									disabled: i,
									...Se,
									onClick: () => pe(t, !0),
									children: `全部合并（${t.length}）`
								}),
								/* @__PURE__ */ (0, Q.jsx)(x, {
									label: "待合并创作者别名",
									sorting: E,
									options: [
										{
											id: "canonical",
											label: "统一名称"
										},
										{
											id: "alias",
											label: "平台别名"
										},
										{
											id: "evidence",
											label: "依据"
										}
									],
									onChange: (e) => {
										D(e), N((e) => ({
											...e,
											pageIndex: 0
										}));
									}
								}),
								/* @__PURE__ */ (0, Q.jsx)(ce, {
									preferences: d,
									label: "待合并创作者别名"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, Q.jsxs)(V, {
						label: "待合并别名批量操作",
						visible: J.length > 0,
						count: `已选 ${J.length} 组`,
						children: [/* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "secondary",
							size: "small",
							disabled: i,
							...Se,
							onClick: () => pe(J, !1),
							children: `合并所选（${J.length}）`
						}), /* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "ghost",
							size: "small",
							onClick: () => _({}),
							children: "取消选择"
						})]
					}),
					/* @__PURE__ */ (0, Q.jsx)(te, {
						follow: !0,
						preferences: d,
						onRowClick: (e) => q.getRow(e)?.toggleSelected(),
						children: /* @__PURE__ */ (0, Q.jsxs)(se, {
							"aria-label": "待合并创作者别名",
							size: "sm",
							sortDescriptor: E[0] ? {
								column: E[0].id,
								direction: E[0].desc ? "descending" : "ascending"
							} : void 0,
							onSortChange: (e) => q.getColumn(String(e.column))?.toggleSorting(e.direction === "descending"),
							children: [/* @__PURE__ */ (0, Q.jsxs)(l, { children: [q.getHeaderGroups()[0].headers.map((e) => /* @__PURE__ */ (0, Q.jsx)(o, {
								id: e.id,
								isRowHeader: e.column.id === "canonical",
								allowsSorting: e.column.getCanSort(),
								...d.columnProps(e.id),
								children: ({ sortDirection: t }) => /* @__PURE__ */ (0, Q.jsxs)(Q.Fragment, { children: [/* @__PURE__ */ (0, Q.jsxs)("span", {
									className: "flex items-center gap-0.5",
									children: [ke(e.column.columnDef.header, e.getContext()), e.column.getCanSort() ? /* @__PURE__ */ (0, Q.jsx)("span", {
										"data-sort-indicator": !0,
										"data-direction": t || void 0,
										children: /* @__PURE__ */ (0, Q.jsx)(ee, {})
									}) : null]
								}), /* @__PURE__ */ (0, Q.jsx)(le, {
									preferences: d,
									id: e.id
								})] })
							}, e.id)), /* @__PURE__ */ (0, Q.jsx)(o, {
								id: "remaining-space",
								"aria-label": "行空白区域",
								"data-table-space": "",
								width: d.spaceWidth,
								minWidth: 0
							})] }), /* @__PURE__ */ (0, Q.jsx)(a, { children: q.getRowModel().rows.map((e) => /* @__PURE__ */ (0, Q.jsxs)(s, {
								id: e.id,
								"data-board-selected": e.getIsSelected() || void 0,
								children: [e.getVisibleCells().map((e) => /* @__PURE__ */ (0, Q.jsx)(c, { children: ke(e.column.columnDef.cell, e.getContext()) }, e.id)), /* @__PURE__ */ (0, Q.jsx)(c, { "data-table-space": "" })]
							}, e.id)) })]
						})
					}),
					/* @__PURE__ */ (0, Q.jsx)(b, {
						label: "待合并创作者别名",
						unit: "组",
						total: t.length,
						pagination: I,
						onChange: N
					})
				]
			}) : null,
			/* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, Q.jsxs)("div", {
						"data-responsive-toolbar": "",
						children: [/* @__PURE__ */ (0, Q.jsxs)("div", {
							"data-toolbar-heading": "",
							children: [/* @__PURE__ */ (0, Q.jsx)(k, { children: "已保存别名" }), /* @__PURE__ */ (0, Q.jsx)("span", {
								className: "text-body-2-regular text-text-secondary",
								children: `${e.length} 组`
							})]
						}), /* @__PURE__ */ (0, Q.jsxs)("div", {
							"data-toolbar-actions": "",
							children: [/* @__PURE__ */ (0, Q.jsx)(x, {
								label: "已保存创作者别名",
								sorting: O,
								options: [{
									id: "canonical",
									label: "统一名称"
								}, {
									id: "aliases",
									label: "平台别名"
								}],
								onChange: (e) => {
									A(e), F((e) => ({
										...e,
										pageIndex: 0
									}));
								}
							}), /* @__PURE__ */ (0, Q.jsx)(ce, {
								preferences: f,
								label: "已保存创作者别名"
							})]
						})]
					}),
					/* @__PURE__ */ (0, Q.jsxs)(V, {
						label: "已保存别名批量操作",
						visible: Y.length > 0,
						count: `已选 ${Y.length} 个别名`,
						children: [/* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "secondary",
							size: "small",
							disabled: i,
							...K(de.isPending),
							onClick: () => void ye({
								title: "移除所选创作者别名",
								body: `将移除以下 ${Y.length} 个别名，对应来源恢复为独立创作者组。`,
								items: Y,
								confirmLabel: "移除所选别名",
								onConfirm: () => de.mutateAsync(Y)
							}),
							children: `移除所选别名（${Y.length}）`
						}), /* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "ghost",
							size: "small",
							onClick: () => T({}),
							children: "取消选择"
						})]
					}),
					e.length ? /* @__PURE__ */ (0, Q.jsxs)(Q.Fragment, { children: [/* @__PURE__ */ (0, Q.jsx)(te, {
						follow: !0,
						preferences: f,
						onRowClick: (e) => xe.getRow(e)?.toggleSelected(),
						children: /* @__PURE__ */ (0, Q.jsxs)(se, {
							"aria-label": "已保存创作者别名",
							size: "sm",
							sortDescriptor: O[0] ? {
								column: O[0].id,
								direction: O[0].desc ? "descending" : "ascending"
							} : void 0,
							onSortChange: (e) => xe.getColumn(String(e.column))?.toggleSorting(e.direction === "descending"),
							children: [/* @__PURE__ */ (0, Q.jsxs)(l, { children: [xe.getHeaderGroups()[0].headers.map((e) => /* @__PURE__ */ (0, Q.jsx)(o, {
								id: e.id,
								isRowHeader: e.column.id === "canonical",
								allowsSorting: e.column.getCanSort(),
								...f.columnProps(e.id),
								children: ({ sortDirection: t }) => /* @__PURE__ */ (0, Q.jsxs)(Q.Fragment, { children: [/* @__PURE__ */ (0, Q.jsxs)("span", {
									className: "flex items-center gap-0.5",
									children: [ke(e.column.columnDef.header, e.getContext()), e.column.getCanSort() ? /* @__PURE__ */ (0, Q.jsx)("span", {
										"data-sort-indicator": !0,
										"data-direction": t || void 0,
										children: /* @__PURE__ */ (0, Q.jsx)(ee, {})
									}) : null]
								}), /* @__PURE__ */ (0, Q.jsx)(le, {
									preferences: f,
									id: e.id
								})] })
							}, e.id)), /* @__PURE__ */ (0, Q.jsx)(o, {
								id: "remaining-space",
								"aria-label": "行空白区域",
								"data-table-space": "",
								width: f.spaceWidth,
								minWidth: 0
							})] }), /* @__PURE__ */ (0, Q.jsx)(a, { children: xe.getRowModel().rows.map((e) => /* @__PURE__ */ (0, Q.jsxs)(s, {
								id: e.id,
								"data-board-selected": e.getIsSelected() || void 0,
								children: [e.getVisibleCells().map((e) => /* @__PURE__ */ (0, Q.jsx)(c, { children: ke(e.column.columnDef.cell, e.getContext()) }, e.id)), /* @__PURE__ */ (0, Q.jsx)(c, { "data-table-space": "" })]
							}, e.id)) })]
						})
					}), /* @__PURE__ */ (0, Q.jsx)(b, {
						label: "已保存创作者别名",
						unit: "组",
						total: e.length,
						pagination: L,
						onChange: F
					})] }) : /* @__PURE__ */ (0, Q.jsx)(C, {
						size: "compact",
						icon: fe,
						title: "还没有保存创作者别名",
						actions: i ? void 0 : /* @__PURE__ */ (0, Q.jsx)(S, {
							target: "input[aria-label=\"统一名称\"]",
							children: "添加别名"
						}),
						children: "填写统一名称，以及该创作者在其他平台使用的名字。"
					})
				]
			}),
			/* @__PURE__ */ (0, Q.jsx)(Nt, {
				group: p,
				close: () => m(null),
				receipt: u
			})
		]
	});
}
// src/react/follow-manage/feed-sources.tsx
var Kt = rt({
	rowPaginationFeature: Ze,
	rowSelectionFeature: Qe,
	rowSortingFeature: $e,
	columnVisibilityFeature: ve,
	sortedRowModel: t(),
	paginatedRowModel: e()
}), qt = {
	select: "选择",
	name: "名称",
	kind: "类型",
	origin: "来源",
	status: "状态",
	interval: "频率",
	fetched: "上次拉取",
	fresh: "上次新增",
	actions: "操作"
}, Jt = /* @__PURE__ */ new Set(["actions"]), Yt = Object.entries(qt).map(([e, t]) => ({
	id: e,
	label: t,
	width: e === "select" ? 48 : e === "name" ? 300 : e === "actions" ? 208 : e === "fetched" ? 200 : e === "origin" ? 184 : 160,
	min: e === "select" ? 48 : e === "actions" ? 200 : e === "name" ? 300 : 112,
	max: e === "select" ? 48 : e === "name" ? 2e3 : 800,
	flex: e === "name",
	required: e === "select" || e === "name"
})), Xt = () => Ue.invalidateQueries({
	queryKey: ne,
	exact: !0
}), $ = (e) => e.name || e.url;
function Zt(e) {
	try {
		return new URL(e).hostname.replace(/^www\./, "");
	} catch {
		return e;
	}
}
function Qt({ source: e }) {
	return e.enabled ? e.last_error ? /* @__PURE__ */ (0, Q.jsx)(y, {
		variant: "caption",
		color: "rose",
		children: "拉取失败"
	}) : e.last_fetched_at ? /* @__PURE__ */ (0, Q.jsx)(y, {
		variant: "caption",
		color: "lime",
		children: "正常"
	}) : /* @__PURE__ */ (0, Q.jsx)(y, {
		variant: "caption",
		color: "gray",
		children: "未检查"
	}) : /* @__PURE__ */ (0, Q.jsx)(y, {
		variant: "caption",
		color: "gray",
		children: "已暂停"
	});
}
function $t({ source: e }) {
	let t = e.entity_id ? {
		id: e.entity_id,
		has_image: !!e.has_image,
		image_version: e.image_version,
		avatar_focus: e.avatar_focus
	} : null;
	return /* @__PURE__ */ (0, Q.jsx)("span", {
		"aria-hidden": !0,
		className: `relative inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-background-tertiary-default text-caption-1-semibold text-text-secondary ${dt}`,
		dangerouslySetInnerHTML: { __html: G($(e), t, null, "performer") }
	});
}
var en = (e, t) => e.entity_id !== null && t.has(e.entity_id) && e.page_name && e.page_name !== e.name ? e.page_name : "";
function tn(e) {
	let t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
	for (let { entity_id: r } of e) r !== null && (t.has(r) ? n.add(r) : t.add(r));
	return n;
}
function nn(e, t) {
	let n = e.length === 1 ? e[0] : null;
	return ye({
		title: n ? "移除订阅源" : `移除 ${e.length} 条订阅源`,
		body: n ? `将移除订阅源「${$(n)}」，之后不再拉取它的新作；已经拉到的新作保留。` : "将移除所选订阅源，之后不再拉取它们的新作；已经拉到的新作保留。",
		confirmLabel: n ? "移除订阅源" : "移除所选订阅源",
		danger: !0,
		onConfirm: t
	});
}
function rn({ readOnly: e, toast: t, onAdd: n, selection: r }) {
	let i = st({
		queryKey: ne,
		queryFn: ({ signal: e }) => Te(e)
	}), u = it(), d = lt("jav-feeds", Yt), f = i.data, m = (0, Z.useMemo)(() => f?.sources ?? [], [f]), [g, y] = (0, Z.useState)(/* @__PURE__ */ new Set()), S = r?.ids ?? g, T = r?.onChange ?? y, [re, E] = (0, Z.useState)(1), [D, O] = (0, Z.useState)(20), [k, j] = (0, Z.useState)([]), M = Ve(m.length, D, re);
	(0, Z.useEffect)(() => {
		E((e) => Math.min(e, M.pages));
	}, [M.pages]), (0, Z.useEffect)(() => {
		T((e) => {
			let t = new Set(m.map((e) => e.id)), n = new Set([...e].filter((e) => t.has(e)));
			return n.size === e.size ? e : n;
		});
	}, [m, T]);
	let P = ot({
		mutationFn: async (e) => {
			let t = await ze(e.ids, 4, async (t) => {
				e.action === "remove" ? await Ke(t) : await et(t, e.action === "enabled");
			});
			return {
				...e,
				results: t
			};
		},
		onSuccess: (e) => {
			let n = e.results.filter((e) => !e.ok), r = e.ids.length - n.length;
			if (T(/* @__PURE__ */ new Set()), Xt(), e.action === "remove" && r && t(`已移除 ${r} 条订阅源`), n.length) {
				let e = n[0];
				u.setError(`${n.length} 条没有写入：${e.ok ? "" : X(e.error)}`);
			}
		},
		onError: (e) => u.setError(X(e))
	}), F = (0, Z.useMemo)(() => tn(m), [m]), I = (0, Z.useRef)({
		readOnly: e,
		shared: F,
		busy: null,
		toggle: () => {},
		fetch: () => {},
		remove: () => {}
	});
	I.current = {
		readOnly: e,
		shared: F,
		busy: u.busy,
		toggle: (e, t) => void u.run(`enabled-${e.id}`, (n) => et(e.id, t, n), () => void Xt()),
		fetch: (e) => void u.run(`check-${e.id}`, (t) => _e(t, [e.id]), () => void Xt()),
		remove: (e) => void nn([e], async () => {
			await Ke(e.id), t(`已移除订阅源「${$(e)}」`), Xt();
		})
	};
	let L = (0, Z.useMemo)(() => {
		let e = be(), t = (e) => () => qt[e] || e;
		return e.columns([
			e.display({
				id: "select",
				header: (e) => /* @__PURE__ */ (0, Q.jsx)(ue, {
					table: e.table,
					label: "全选本页订阅源",
					page: !0
				}),
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)(v, {
					slot: null,
					isSelected: e.row.getIsSelected(),
					onChange: (t) => e.row.toggleSelected(t),
					"aria-label": `选择 ${$(e.row.original)}`
				})
			}),
			e.accessor($, {
				id: "name",
				header: t("name"),
				cell: (e) => {
					let t = en(e.row.original, I.current.shared);
					return /* @__PURE__ */ (0, Q.jsxs)("span", {
						className: "flex items-center gap-2 whitespace-nowrap text-body-medium text-text-primary",
						children: [
							/* @__PURE__ */ (0, Q.jsx)($t, { source: e.row.original }),
							e.getValue(),
							t ? /* @__PURE__ */ (0, Q.jsx)("span", {
								className: "text-body-2-regular text-text-secondary",
								title: `站上这一页挂在「${t}」名下`,
								children: t
							}) : null
						]
					});
				}
			}),
			e.accessor((e) => e.kind_label, {
				id: "kind",
				header: t("kind"),
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)("span", {
					className: "whitespace-nowrap",
					children: e.getValue()
				})
			}),
			e.accessor((e) => e.url, {
				id: "origin",
				header: t("origin"),
				cell: (e) => /* @__PURE__ */ (0, Q.jsxs)("a", {
					href: e.getValue(),
					target: "_blank",
					rel: "noopener noreferrer",
					title: "打开来源页面",
					className: "max-w-full text-text-primary underline-offset-2 hover:underline",
					children: [/* @__PURE__ */ (0, Q.jsx)(ae, {
						site: e.row.original.kind.startsWith("javdb") ? "javdb" : e.row.original.kind.startsWith("dmm") ? "dmm" : Zt(e.getValue()),
						label: Zt(e.getValue())
					}), /* @__PURE__ */ (0, Q.jsx)(de, {
						"aria-hidden": !0,
						className: "size-(--icon-inline) shrink-0"
					})]
				})
			}),
			e.accessor((e) => e.last_error ? "拉取失败" : e.enabled ? "已启用" : "已暂停", {
				id: "status",
				header: t("status"),
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)(Qt, { source: e.row.original })
			}),
			e.accessor((e) => e.interval_minutes, {
				id: "interval",
				header: t("interval"),
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)("span", {
					className: "whitespace-nowrap",
					children: Ce(e.getValue())
				})
			}),
			e.accessor((e) => e.last_fetched_at && Date.parse(e.last_fetched_at) || 0, {
				id: "fetched",
				header: t("fetched"),
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)("span", {
					className: "whitespace-nowrap tabular-nums",
					children: e.row.original.last_fetched_at ? Le(e.row.original.last_fetched_at) : "还没拉过"
				})
			}),
			e.accessor((e) => e.last_new_count, {
				id: "fresh",
				header: t("fresh"),
				cell: (e) => /* @__PURE__ */ (0, Q.jsx)("span", {
					className: "whitespace-nowrap tabular-nums",
					children: `${e.getValue()} 条`
				})
			}),
			e.display({
				id: "actions",
				header: t("actions"),
				cell: (e) => /* @__PURE__ */ (0, Q.jsxs)("span", {
					className: "flex items-center gap-1",
					children: [
						/* @__PURE__ */ (0, Q.jsx)(oe, {
							"aria-label": `启用 ${$(e.row.original)}`,
							isSelected: e.row.original.enabled,
							isDisabled: I.current.readOnly,
							onChange: (t) => I.current.toggle(e.row.original, t)
						}),
						/* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "secondary",
							size: "small",
							iconOnly: !0,
							leadingIcon: Y,
							"aria-label": `拉取 ${$(e.row.original)}`,
							disabled: I.current.readOnly,
							...K(I.current.busy === `check-${e.row.original.id}`),
							onClick: () => I.current.fetch(e.row.original)
						}),
						/* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "secondary",
							size: "small",
							iconOnly: !0,
							leadingIcon: N,
							"aria-label": `移除 ${$(e.row.original)}`,
							disabled: I.current.readOnly,
							onClick: () => I.current.remove(e.row.original)
						})
					]
				})
			})
		]);
	}, []), ie = (0, Z.useMemo)(() => Object.fromEntries([...S].map((e) => [String(e), !0])), [S]), z = ct({
		features: Kt,
		data: m,
		columns: L,
		getRowId: (e) => String(e.id),
		state: {
			rowSelection: ie,
			sorting: k,
			pagination: {
				pageIndex: M.page - 1,
				pageSize: D
			},
			columnVisibility: d.visibility
		},
		onColumnVisibilityChange: d.change,
		onSortingChange: (e) => {
			j(e), E(1);
		},
		enableRowSelection: !0,
		onRowSelectionChange: (e) => {
			r?.onActivate();
			let t = typeof e == "function" ? e(ie) : e;
			T(new Set(Object.entries(t).filter(([, e]) => e).map(([e]) => Number(e))));
		}
	});
	if (!f) return i.error ? /* @__PURE__ */ (0, Q.jsx)(R, {
		tone: "error",
		title: "打不开订阅源",
		children: X(i.error)
	}) : /* @__PURE__ */ (0, Q.jsx)(A, { children: "正在读订阅源。" });
	let B = () => void u.run("check", (e) => _e(e), () => void Xt()), H = (e) => {
		r?.onActivate(), T((t) => {
			let n = new Set(t);
			return n.has(e) ? n.delete(e) : n.add(e), n;
		});
	}, U = m.filter((e) => S.has(e.id)), W = m.filter((e) => e.last_error);
	return /* @__PURE__ */ (0, Q.jsx)("div", {
		className: "flex flex-col gap-3",
		children: /* @__PURE__ */ (0, Q.jsxs)("section", {
			"aria-label": "JAV 订阅列表",
			className: ge({
				padding: "none",
				className: "flex flex-col gap-4 px-6 py-5 max-sm:px-4"
			}),
			children: [
				/* @__PURE__ */ (0, Q.jsxs)("div", {
					"data-responsive-toolbar": "",
					children: [/* @__PURE__ */ (0, Q.jsxs)("div", {
						"data-toolbar-heading": "",
						children: [/* @__PURE__ */ (0, Q.jsx)("h3", {
							className: "text-title-2-medium text-text-primary",
							children: "JAV 订阅源"
						}), /* @__PURE__ */ (0, Q.jsx)("span", {
							className: "text-body-2-regular text-text-secondary",
							children: `${m.length.toLocaleString()} 个订阅源 · ${(Number(f.unread) || 0).toLocaleString()} 条未看`
						})]
					}), /* @__PURE__ */ (0, Q.jsxs)("div", {
						"data-toolbar-actions": "",
						children: [
							/* @__PURE__ */ (0, Q.jsx)(h, {
								onClick: B,
								disabled: e,
								...K(u.busy === "check"),
								children: "立即拉取"
							}),
							/* @__PURE__ */ (0, Q.jsx)(ce, {
								preferences: d,
								label: "JAV 订阅源"
							}),
							/* @__PURE__ */ (0, Q.jsx)(x, {
								label: "JAV 订阅源",
								sorting: k,
								onChange: (e) => {
									j(e), E(1);
								},
								options: [
									"name",
									"kind",
									"origin",
									"status",
									"interval",
									"fetched",
									"fresh"
								].map((e) => ({
									id: e,
									label: qt[e]
								}))
							})
						]
					})]
				}),
				W.length || u.error ? /* @__PURE__ */ (0, Q.jsxs)("div", {
					className: "flex flex-col gap-3",
					children: [W.length ? /* @__PURE__ */ (0, Q.jsx)(R, {
						tone: "error",
						title: `${W.length.toLocaleString()} 条订阅源拉取失败`,
						extra: /* @__PURE__ */ (0, Q.jsx)("ul", {
							className: "flex flex-col gap-0.5 text-body-2-regular",
							children: W.map((e) => /* @__PURE__ */ (0, Q.jsx)("li", {
								className: "min-w-0 truncate",
								title: e.last_error || "",
								children: `${$(e)}：${Se(e.last_error || "") || "未说明原因"}`
							}, e.id))
						}),
						children: "这些订阅源这一轮没有取到新条目。"
					}) : null, u.error ? /* @__PURE__ */ (0, Q.jsx)(w, { children: u.error }) : null]
				}) : null,
				/* @__PURE__ */ (0, Q.jsxs)(V, {
					visible: U.length > 0,
					label: "订阅源批量操作",
					count: `已选 ${U.length} 条订阅源`,
					children: [
						/* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "secondary",
							size: "small",
							disabled: e,
							...K(P.isPending),
							onClick: () => P.mutate({
								ids: U.map((e) => e.id),
								action: "enabled"
							}),
							children: "启用"
						}),
						/* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "secondary",
							size: "small",
							disabled: e,
							...K(P.isPending),
							onClick: () => P.mutate({
								ids: U.map((e) => e.id),
								action: "paused"
							}),
							children: "暂停"
						}),
						/* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "danger",
							size: "small",
							disabled: e,
							...K(P.isPending),
							onClick: () => void nn(U, () => P.mutateAsync({
								ids: U.map((e) => e.id),
								action: "remove"
							})),
							children: "移除"
						}),
						/* @__PURE__ */ (0, Q.jsx)(h, {
							variant: "ghost",
							size: "small",
							onClick: () => T(/* @__PURE__ */ new Set()),
							children: "取消选择"
						})
					]
				}),
				m.length ? /* @__PURE__ */ (0, Q.jsx)(te, {
					follow: !0,
					preferences: d,
					onRowClick: (e) => H(Number(e)),
					children: /* @__PURE__ */ (0, Q.jsxs)(se, {
						"aria-label": "JAV 订阅源",
						size: "sm",
						sortDescriptor: k[0] ? {
							column: k[0].id,
							direction: k[0].desc ? "descending" : "ascending"
						} : void 0,
						onSortChange: (e) => z.getColumn(String(e.column))?.toggleSorting(e.direction === "descending"),
						children: [/* @__PURE__ */ (0, Q.jsxs)(l, { children: [z.getHeaderGroups()[0].headers.map((e) => {
							let t = ke(e.column.columnDef.header, e.getContext());
							return /* @__PURE__ */ (0, Q.jsx)(o, {
								id: e.id,
								isRowHeader: e.column.id === "name",
								allowsSorting: e.column.getCanSort(),
								...d.columnProps(e.id),
								children: ({ sortDirection: n }) => /* @__PURE__ */ (0, Q.jsxs)(Q.Fragment, { children: [Jt.has(e.column.id) ? /* @__PURE__ */ (0, Q.jsx)(p, { children: t }) : /* @__PURE__ */ (0, Q.jsxs)("span", {
									className: "flex items-center gap-0.5",
									children: [t, e.column.getCanSort() ? /* @__PURE__ */ (0, Q.jsx)("span", {
										"data-sort-indicator": !0,
										"data-direction": n || void 0,
										children: /* @__PURE__ */ (0, Q.jsx)(ee, {})
									}) : null]
								}), /* @__PURE__ */ (0, Q.jsx)(le, {
									preferences: d,
									id: e.id
								})] })
							}, e.id);
						}), /* @__PURE__ */ (0, Q.jsx)(o, {
							id: "remaining-space",
							"aria-label": "行空白区域",
							"data-table-space": "",
							width: d.spaceWidth,
							minWidth: 0
						})] }), /* @__PURE__ */ (0, Q.jsx)(a, { children: z.getRowModel().rows.map((e) => /* @__PURE__ */ (0, Q.jsxs)(s, {
							id: e.id,
							"data-follow-selected": e.getIsSelected() || void 0,
							children: [e.getVisibleCells().map((e) => /* @__PURE__ */ (0, Q.jsx)(c, { children: ke(e.column.columnDef.cell, e.getContext()) }, e.id)), /* @__PURE__ */ (0, Q.jsx)(c, { "data-table-space": "" })]
						}, e.id)) })]
					})
				}) : /* @__PURE__ */ (0, Q.jsx)(C, {
					icon: _,
					title: "还没有订阅源",
					size: "compact",
					actions: e ? void 0 : /* @__PURE__ */ (0, Q.jsx)(h, {
						variant: "secondary",
						onClick: n,
						children: "添加订阅"
					}),
					children: "在「添加关注」按女优名添加，或在人物页点「订阅新作」。"
				}),
				m.length ? /* @__PURE__ */ (0, Q.jsx)(b, {
					label: "JAV 订阅",
					total: M.total,
					unit: "个订阅源",
					pagination: {
						pageIndex: M.page - 1,
						pageSize: D
					},
					onChange: (e) => {
						O(e.pageSize), E(e.pageIndex + 1);
					}
				}) : null,
				/* @__PURE__ */ (0, Q.jsx)("footer", {
					className: "-mx-6 -mb-5 flex flex-wrap items-center gap-2 border-t border-separator-border rounded-b-2xl bg-card-footer px-6 py-4 max-sm:-mx-4 max-sm:px-4",
					children: /* @__PURE__ */ (0, Q.jsx)("span", {
						role: "status",
						className: "mr-auto text-body-2-regular text-text-secondary",
						children: `未看 ${(Number(f.unread) || 0).toLocaleString()} · 已启用 ${m.filter((e) => e.enabled).length.toLocaleString()} / ${m.length.toLocaleString()}`
					})
				})
			]
		})
	});
}
// src/react/follow-manage/follow-manage-page.tsx
var an = (e) => D.some(([t]) => t === e);
function on({ term: e, figure: t, unit: n }) {
	return /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: ge({
			padding: "none",
			className: "flex flex-col gap-3 px-6 py-5 max-sm:gap-2 max-sm:p-4"
		}),
		children: [/* @__PURE__ */ (0, Q.jsx)("span", {
			className: "text-body-medium text-text-secondary",
			children: e
		}), /* @__PURE__ */ (0, Q.jsxs)("b", {
			"data-follow-reading": "",
			className: `flex min-w-0 flex-wrap items-baseline gap-x-1 tabular-nums text-text-primary ${t >= 1e6 ? "text-headline-medium" : t >= 1e5 ? "text-title-3-medium" : "text-title-1-medium"}`,
			children: [/* @__PURE__ */ (0, Q.jsx)("span", {
				className: "min-w-0 wrap-anywhere",
				children: t.toLocaleString()
			}), /* @__PURE__ */ (0, Q.jsx)("small", {
				className: "whitespace-nowrap text-body-2-regular text-text-secondary",
				children: ` ${n}`
			})]
		})]
	});
}
function sn(e) {
	let { route: t, savePreference: n, toast: r, openFollow: i, readOnly: a, readOnlyMessage: o, writerUrl: s } = e, [c, l] = (0, Z.useState)(an(e.tab) ? e.tab : "list"), [p, m] = (0, Z.useState)(Math.max(1, Math.floor(e.page) || 1)), [h, _] = (0, Z.useState)(() => Xe(e.sort, e.dir).sort), [v, ee] = (0, Z.useState)(() => Xe(e.sort, e.dir).dir), [y, b] = (0, Z.useState)(Fe(e.layout) ? e.layout : "default"), [te, x] = (0, Z.useState)(Be(e.pageSize)), [S, C] = (0, Z.useState)(/* @__PURE__ */ new Set()), [w, O] = (0, Z.useState)(/* @__PURE__ */ new Set()), k = st({
		queryKey: E,
		queryFn: ({ signal: e }) => Ee(e)
	}), A = st({
		queryKey: re,
		queryFn: ({ signal: e }) => we(e)
	}), j = st({
		queryKey: ne,
		queryFn: ({ signal: e }) => Te(e)
	}), M = k.data || { sources: [] }, N = A.data || {
		root: "",
		providers: []
	}, P = M.sources;
	(0, Z.useEffect)(() => {
		C((e) => {
			let t = Ie(e, P);
			return t.size === e.size ? e : t;
		});
	}, [P]);
	let F = (e) => {
		let n = e.sort ?? h, r = e.dir ?? v;
		t({
			tab: e.tab ?? c,
			page: e.page ?? p,
			sort: n === "checked" ? "" : n,
			dir: r === z[n] ? "" : r
		});
	}, I = Ne(P), L = P.filter(Pe).length, ie = P.filter((e) => e.enabled).length, V = (N.providers || []).filter((e) => e.requirement === "required" && !xe(e)).length, H = new Set((j.data?.sources || []).map((e) => e.entity_id ?? `source-${e.id}`)).size;
	return /* @__PURE__ */ (0, Q.jsxs)(ut, { children: [
		a ? /* @__PURE__ */ (0, Q.jsx)(R, {
			tone: "warning",
			title: "本机只能浏览",
			extra: s ? /* @__PURE__ */ (0, Q.jsx)("p", {
				className: "text-body-2-regular",
				children: /* @__PURE__ */ (0, Q.jsx)(T, {
					href: s,
					children: "前往写入端管理关注"
				})
			}) : void 0,
			children: o
		}) : null,
		/* @__PURE__ */ (0, Q.jsxs)("div", {
			className: B,
			"aria-label": "关注概览",
			children: [
				/* @__PURE__ */ (0, Q.jsx)(on, {
					term: "关注创作者",
					figure: I.length,
					unit: "位"
				}),
				/* @__PURE__ */ (0, Q.jsx)(on, {
					term: "启用来源",
					figure: ie,
					unit: `/ ${P.length}`
				}),
				/* @__PURE__ */ (0, Q.jsx)(on, {
					term: "检查失败",
					figure: L,
					unit: "个来源"
				}),
				/* @__PURE__ */ (0, Q.jsx)(on, {
					term: "未看更新",
					figure: M.counts?.new || 0,
					unit: "条"
				}),
				/* @__PURE__ */ (0, Q.jsx)(on, {
					term: "JAV 订阅",
					figure: H,
					unit: "位"
				}),
				/* @__PURE__ */ (0, Q.jsx)(on, {
					term: "未看新作",
					figure: j.data?.unread || 0,
					unit: "条"
				})
			]
		}),
		/* @__PURE__ */ (0, Q.jsxs)(f, {
			selectedKey: c,
			onSelectionChange: (e) => {
				let t = String(e);
				an(t) && (C(/* @__PURE__ */ new Set()), O(/* @__PURE__ */ new Set()), l(t), F({ tab: t }));
			},
			className: "flex flex-col gap-6",
			children: [
				/* @__PURE__ */ (0, Q.jsx)(ft, {
					"aria-label": "关注管理区域",
					"data-section-nav": !0,
					"data-section-items": !0,
					className: "flex max-w-full flex-nowrap overflow-x-auto",
					children: D.map(([e, t]) => /* @__PURE__ */ (0, Q.jsx)(d, {
						id: e,
						"data-pill-selected": c === e ? "" : void 0,
						"data-pill-variant": "gray",
						className: "cursor-pointer whitespace-nowrap",
						children: t
					}, e))
				}),
				/* @__PURE__ */ (0, Q.jsxs)(u, {
					id: "list",
					className: "flex flex-col gap-4",
					children: [/* @__PURE__ */ (0, Q.jsx)(rn, {
						readOnly: a,
						toast: r,
						onAdd: () => {
							l("add"), F({ tab: "add" });
						},
						selection: {
							ids: w,
							onChange: O,
							onActivate: () => C(/* @__PURE__ */ new Set())
						}
					}), /* @__PURE__ */ (0, Q.jsx)(ht, {
						data: M,
						sort: h,
						dir: v,
						page: p,
						layout: y,
						pageSize: te,
						selected: S,
						readOnly: a,
						toast: r,
						openFollow: i,
						onAdd: () => {
							l("add"), F({ tab: "add" });
						},
						onSort: (e, t) => {
							_(e), ee(t), m(1), F({
								sort: e,
								dir: t,
								page: 1
							});
						},
						onPage: (e) => {
							m(e), F({ page: e });
						},
						onSelected: (e) => {
							C(e), O(/* @__PURE__ */ new Set());
						},
						onLayout: (e) => {
							b(e), m(1), n({ layout: e }), F({ page: 1 });
						},
						onPageSize: (e) => {
							x(e), m(1), n({ pageSize: e }), F({ page: 1 });
						}
					})]
				}),
				/* @__PURE__ */ (0, Q.jsxs)(u, {
					id: "add",
					className: "flex flex-col gap-8",
					children: [
						/* @__PURE__ */ (0, Q.jsx)(Dt, {
							data: M,
							credentials: N,
							readOnly: a,
							toast: r
						}),
						/* @__PURE__ */ (0, Q.jsx)(Mt, {
							readOnly: a,
							toast: r,
							onAdded: () => {
								j.refetch(), l("list"), F({ tab: "list" });
							}
						}),
						/* @__PURE__ */ (0, Q.jsx)(Gt, {
							groups: M.author_aliases || [],
							readOnly: a,
							toast: r,
							suggestions: M.alias_suggestions || [],
							sources: M.sources
						})
					]
				}),
				/* @__PURE__ */ (0, Q.jsx)(u, {
					id: "tags",
					className: "flex flex-col gap-4",
					children: /* @__PURE__ */ (0, Q.jsx)(U, { scope: "online" })
				})
			]
		}),
		/* @__PURE__ */ (0, Q.jsx)("div", { children: /* @__PURE__ */ (0, Q.jsxs)(g, {
			variant: "secondary",
			href: "/settings/subscriptions",
			children: ["来源与订阅设置", V ? `（${V}）` : ""]
		}) })
	] });
}
export { sn as FollowManagePage };

//# debugId=674b25f6-536a-4708-aaf8-bcd20af2a392
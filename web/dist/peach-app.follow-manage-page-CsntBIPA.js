(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "915c9081-9c54-4d62-9869-27f9f1d9a0ad", e._sentryDebugIdIdentifier = "sentry-dbid-915c9081-9c54-4d62-9869-27f9f1d9a0ad");
	} catch {}
})();
import { $2ec61d1d4f780267$export$a8a3e93435678ff9 as e, $76d00c5a4edb230a$export$76ccd210b9029917 as t, $76d00c5a4edb230a$export$816b5d811295e6bc as n, $76d00c5a4edb230a$export$b59bdbef9ce70de2 as r, $76d00c5a4edb230a$export$f6f0c3fe4ec306ea as i, $76d00c5a4edb230a$export$f850895b287ef28e as a, $ea3928288112382f$export$439d29a4e110a164 as o, $l as s, Button as c, ButtonLink as l, Bx as u, COLUMN_SORT as d, Checkbox as f, ChevronSortDown as p, Chip as m, CollapseChevron as h, CollapseRegion as g, ColumnFilterAvatar as _, ColumnFilterChips as v, Ct as y, DataTableFooter as b, DataTableFrame as ee, DataTableSort as x, EmptyFocusButton as S, EmptyState as te, ErrorText as C, ExternalLink as w, FEEDS_KEY as ne, FOLLOW_CHECK_KEY as re, FOLLOW_CHECK_TASK as ie, FOLLOW_CREDENTIALS_KEY$1 as T, FOLLOW_MANAGE_KEY as E, FOLLOW_MANAGE_NAV as ae, FOLLOW_RESOLVE_KEY as oe, FieldLabel as D, FollowSearch as O, Gg as k, H7 as A, Help as j, IndexSearch as M, Input as N, LAYOUTS as se, LEGACY_AVATAR_IMG as ce, LinkButton as P, M6 as le, ModalFrame as F, Note as I, OV as ue, P7 as L, SORT_DEFAULT_DIR as R, SORT_OPTIONS as de, STAT_STRIP_SIX as z, Select as fe, SelectItem as pe, SelectionDock as me, SelectionPopover as he, SiteIcon as B, SiteLabel as ge, SortDirectionIcon as _e, SortableBoardTabs as ve, Switch as ye, Table as be, TableColumnControls as xe, TableColumnResizer as Se, TableSelectionHeader as Ce, TaskProgress as we, Un as Te, Wt as V, Xf as Ee, __toESM as H, activityKind as De, addAlias as Oe, addSource as ke, apiGet as Ae, authorGroups as je, authorName as Me, avatarInner as Ne, busyProps as U, cardClass as Pe, checkEvidenceGap as Fe, checkFailures as Ie, checkFeeds as Le, checkReceipt as Re, checkSummary as ze, checkedText as Be, clickedBlank as Ve, codedText as He, columnOrderingFeature as Ue, columnVisibilityFeature as We, confirmModal as Ge, createColumnHelper as Ke, createPaginatedRowModel as qe, createSortedRowModel as Je, credentialDone as Ye, dZ as Xe, dropSources as Ze, du as Qe, enterPageSelection as $e, errorHeadline as et, errorMessage as W, exitPageSelection as tt, feedIntervalText as nt, fetchCheckJob as rt, fetchCredentials as it, fetchFeeds as at, fetchFollow as ot, fetchResolveJob as st, fetchSuggestions as G, flexRender as ct, followFeedPages as lt, followListSurfaceSkeleton as ut, groupByAuthor as dt, isBroken as ft, isLayout as K, jobText as pt, joinList as q, keepSelected as mt, l7 as ht, localTime as gt, lookupFeedActor as _t, mapLimit as vt, markAllPending as yt, pageSizeOf as bt, pageWindow as xt, patchSource as St, queryClient as Ct, quoted as wt, reloadFollowManage as J, removeAlias as Tt, removeFeed as Et, removeSource as Dt, renameAliasGroup as Ot, require_jsx_runtime as kt, require_react as At, resolveFollowSort as jt, rowPaginationFeature as Mt, rowSelectionFeature as Nt, rowSelectionOperation as Pt, rowSortingFeature as Ft, runBulkAction as It, selectionState as Lt, serverLabel as Rt, setFeedEnabled as zt, setSourceEnabled as Bt, skeletonHtml as Vt, sortLabel as Ht, startCheck as Ut, startResolve as Wt, statusText as Gt, suggestFeedActors as Kt, t as Y, tableFeatures as qt, tableRows as Jt, th as Yt, toggleGroup as Xt, unmarkItems as Zt, useAction as Qt, useBackgroundJob as $t, useMutation as en, usePageSelection as tn, useQuery as nn, useRectangleSelection as rn, useRememberedPageSize as an, useRememberedPagination as on, useRowWorkContext as sn, useTable as cn, useTableFilters as ln, useTablePreferences as un, useTableSelection as dn, useWorkContextMenu as fn, utcDate as pn } from "./peach-app.js";
import { Page as mn } from "./peach-app.page-QAncjzM1.js";
import { AuthorAvatar as hn, ErrorLine as gn, FeedPageAlias as _n, SourceIcon as vn, SourceLink as yn, StatusBadge as bn } from "./peach-app.source-view-D-Xir163.js";
// src/react/follow-manage/search-results.tsx
var X = /* @__PURE__ */ H(At(), 1), Z = kt(), xn = qt({ rowSelectionFeature: Nt }), Sn = Ke(), Cn = Sn.columns([
	Sn.display({
		id: "select",
		cell: ({ row: e }) => /* @__PURE__ */ (0, Z.jsx)(f, {
			slot: null,
			"aria-label": Y("follow:shared.selectNamed", { name: `${e.original.providerLabel} · ${e.original.selectionName ?? e.original.name}` }),
			isSelected: e.getIsSelected(),
			isDisabled: !e.getCanSelect(),
			onChange: (t) => e.toggleSelected(t)
		})
	}),
	Sn.display({
		id: "name",
		header: () => Y("follow:searchResults.name"),
		cell: ({ row: { original: e } }) => /* @__PURE__ */ (0, Z.jsxs)("div", {
			className: "flex min-w-0 items-center gap-2",
			children: [/* @__PURE__ */ (0, Z.jsx)(_, {
				size: "medium",
				person: {
					...e.portrait,
					name: e.name,
					source_avatar_url: e.avatar ?? void 0
				}
			}), /* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "flex min-w-0 flex-col gap-0.5",
				children: [/* @__PURE__ */ (0, Z.jsx)("span", {
					className: "text-body-medium wrap-anywhere text-text-primary",
					children: e.name
				}), e.details ? /* @__PURE__ */ (0, Z.jsx)("div", {
					className: "text-caption-1-regular wrap-anywhere text-text-secondary",
					children: e.details
				}) : null]
			})]
		})
	}),
	Sn.display({
		id: "provider",
		header: () => Y("follow:searchResults.source"),
		cell: ({ row: { original: e } }) => /* @__PURE__ */ (0, Z.jsxs)("span", {
			className: "inline-flex items-center gap-1.5 whitespace-nowrap",
			children: [e.provider === "javdb" || e.provider === "dmm" ? /* @__PURE__ */ (0, Z.jsx)(B, { site: e.provider }) : /* @__PURE__ */ (0, Z.jsx)(vn, { provider: e.provider }), e.providerLabel]
		})
	}),
	Sn.display({
		id: "address",
		header: () => Y("follow:searchResults.address"),
		cell: ({ row: { original: { url: e } } }) => /* @__PURE__ */ (0, Z.jsx)(P, {
			href: e,
			target: "_blank",
			rel: "noopener noreferrer",
			size: "small",
			trailingIcon: V,
			title: e,
			"aria-label": e,
			className: "min-w-0 justify-start [&>span]:min-w-0",
			children: /* @__PURE__ */ (0, Z.jsx)("span", {
				"data-middle-truncate": "",
				className: "block truncate",
				children: e.replace(/^https?:\/\//, "")
			})
		})
	})
]);
function wn({ label: e, items: o, onPick: s }) {
	let c = Object.fromEntries(o.filter((e) => e.picked).map((e) => [e.id, !0])), l = cn({
		features: xn,
		data: o,
		columns: Cn,
		getRowId: (e) => e.id,
		state: { rowSelection: c },
		enableRowSelection: (e) => e.original.selectable !== !1,
		onRowSelectionChange: (e) => {
			let t = typeof e == "function" ? e(c) : e;
			for (let e of o) {
				let n = !!t[e.id];
				e.selectable !== !1 && n !== !!c[e.id] && s?.(e.id, n);
			}
		}
	}), u = o.some((e) => e.selectable !== !1);
	return /* @__PURE__ */ (0, Z.jsx)(ee, {
		follow: !0,
		onRowClick: s ? (e) => l.getRow(e).toggleSelected() : void 0,
		onRectangle: s && u ? (e, t) => l.setRowSelection({
			...t ? c : {},
			...Object.fromEntries(e.map((e) => [e, !0]))
		}) : void 0,
		children: /* @__PURE__ */ (0, Z.jsxs)(be, {
			"aria-label": e,
			size: "sm",
			className: "min-w-144 table-fixed",
			children: [/* @__PURE__ */ (0, Z.jsx)(a, { children: l.getHeaderGroups()[0].headers.filter((e) => s || e.id !== "select").map((t) => /* @__PURE__ */ (0, Z.jsx)(n, {
				id: t.id,
				isRowHeader: t.id === "name",
				className: t.id === "select" ? "w-12" : t.id === "provider" ? "w-36" : t.id === "address" ? "w-52" : void 0,
				children: t.id === "select" ? /* @__PURE__ */ (0, Z.jsx)(Ce, {
					table: l,
					label: Y("shell:dataTable.selectAll", { label: e }),
					disabled: !u
				}) : /* @__PURE__ */ (0, Z.jsx)("span", {
					className: "text-body-2-semibold",
					children: ct(t.column.columnDef.header, t.getContext())
				})
			}, t.id)) }), /* @__PURE__ */ (0, Z.jsx)(t, { children: l.getRowModel().rows.map((e) => /* @__PURE__ */ (0, Z.jsx)(r, {
				id: e.id,
				"data-board-selected": e.getIsSelected() || void 0,
				"data-rectangle-disabled": !e.getCanSelect() || void 0,
				children: e.getAllCells().filter((e) => s || e.column.id !== "select").map((e) => /* @__PURE__ */ (0, Z.jsx)(i, { children: ct(e.column.columnDef.cell, e.getContext()) }, e.id))
			}, e.id)) })]
		})
	});
}
// src/react/follow-manage/add-source.tsx
var Tn = Y("follow:addCreatorSource.placeholder"), En = Y("follow:addCreatorSource.title"), Dn = Y("follow:addCreatorSource.searchingByName"), On = Y("follow:addCreatorSource.recognizing"), kn = Y("follow:addCreatorSource.noSourceFound"), An = "/settings/subscriptions", jn = (e, t) => `${e}:${t.url}`;
async function Mn(e, t) {
	let { groups: n } = await G(e, t);
	return n.flatMap((e) => e.items.map((t) => ({
		value: t.value,
		matched: Rt(t.matched_code ?? "", t.matched || ""),
		n: t.n,
		group: Rt(e.label_code ?? "", e.label),
		portrait: e.kind === "tag" ? void 0 : { source_avatar_url: t.avatar_url ?? void 0 }
	})));
}
function Nn({ credentials: e, hidden: t, onHidden: n }) {
	let r = (e.providers || []).filter((e) => e.followable), i = r.filter((e) => !t.has(e.provider)).length, a = i === r.length ? Y("follow:addCreatorSource.allSources") : Y("follow:addCreatorSource.shownSources", {
		shown: i,
		count: r.length
	});
	return /* @__PURE__ */ (0, Z.jsx)(he, {
		label: Y("follow:addCreatorSource.sourceFilter"),
		triggerLabel: a,
		leadingIcon: s,
		empty: Y("follow:addCreatorSource.noSources"),
		items: r.map((e) => ({
			id: e.provider,
			selected: !t.has(e.provider),
			label: /* @__PURE__ */ (0, Z.jsxs)("span", {
				className: "flex min-w-0 items-center gap-1.5",
				children: [/* @__PURE__ */ (0, Z.jsx)(vn, { provider: e.provider }), e.provider_label]
			})
		})),
		onChange: (e, r) => {
			let i = new Set(t);
			r ? i.delete(e) : i.add(e), n(i);
		},
		actions: [
			{
				label: Y("follow:shared.selectAll"),
				disabled: !r.length,
				onPress: () => n(/* @__PURE__ */ new Set())
			},
			{
				label: Y("follow:shared.selectNone"),
				disabled: !r.length,
				onPress: () => n(new Set(r.map((e) => e.provider)))
			},
			{
				label: Y("follow:addCreatorSource.credentialSettings"),
				href: An
			}
		]
	});
}
function Pn({ row: e, at: t, hidden: n, unpicked: r, onPick: i }) {
	if (e.kind === "error") return /* @__PURE__ */ (0, Z.jsx)(I, {
		tone: "error",
		title: e.line,
		children: pt(e, "error") || Y("follow:addCreatorSource.searchFailed")
	});
	let a = (e.candidates || []).filter((e) => !n.has(e.provider)), o = (e.external_searches || []).filter((e) => !n.has(e.provider)), s = Object.entries(e.failures || {}), c = s.filter(([e]) => !n.has(e) && !o.some((t) => t.provider === e)), l = e.candidates?.length || e.external_searches?.length || s.length, u = (t, n) => Rt(e.failure_codes?.[t]?.code ?? "", n, e.failure_codes?.[t]?.params);
	return /* @__PURE__ */ (0, Z.jsxs)("div", {
		className: "flex min-w-0 flex-col gap-2",
		children: [
			/* @__PURE__ */ (0, Z.jsx)("b", {
				className: "text-body-medium text-text-primary",
				children: e.line
			}),
			a.length ? /* @__PURE__ */ (0, Z.jsx)(wn, {
				label: Y("follow:addCreatorSource.results"),
				items: a.map((e) => {
					let n = jn(t, e);
					return {
						id: n,
						name: He(e, "label"),
						provider: e.provider,
						providerLabel: e.provider_label,
						url: e.url,
						avatar: e.avatar_url,
						selectable: !e.known,
						picked: !e.known && !r.has(n),
						details: e.known ? Y("follow:addCreatorSource.alreadyFollowing") : He(e, "evidence")
					};
				}),
				onPick: i
			}) : null,
			!a.length && !o.length && !c.length ? /* @__PURE__ */ (0, Z.jsx)(j, { children: l ? Y("follow:searchResults.hiddenByFilter") : kn }) : null,
			o.map((t) => {
				let n = e.failures?.[t.provider];
				return /* @__PURE__ */ (0, Z.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [/* @__PURE__ */ (0, Z.jsx)(j, { children: n ? u(t.provider, n) : He(t, "evidence") }), /* @__PURE__ */ (0, Z.jsx)(w, {
						href: t.url,
						children: Y("follow:shared.labeled", {
							label: He(t, "label"),
							value: t.query
						})
					})]
				}, t.url);
			}),
			c.map(([e, t]) => /* @__PURE__ */ (0, Z.jsx)(j, { children: Y("follow:shared.labeled", {
				label: e,
				value: u(e, t)
			}) }, e))
		]
	});
}
function Fn({ data: e, credentials: t, readOnly: n, toast: r }) {
	let [i, a] = (0, X.useState)(""), [o, s] = (0, X.useState)(""), [l, u] = (0, X.useState)(/* @__PURE__ */ new Set()), [d, f] = (0, X.useState)(/* @__PURE__ */ new Set()), [p, m] = (0, X.useState)(""), [h, g] = (0, X.useState)(0), { job: _, running: v, outcome: y, start: b, dismiss: ee } = $t({
		queryKey: oe,
		queryFn: ({ signal: e }) => st(e),
		start: (e) => Wt([e]),
		onStarted: () => f(/* @__PURE__ */ new Set()),
		onError: (e) => m(W(e)),
		onFinish: (e) => {
			e.status === "failed" && m(pt(e, "error") || Y("follow:addCreatorSource.searchFailed"));
		}
	}), x = (e) => {
		n || v || b.isPending || (m(""), s(e), a(e), b.mutate(e));
	}, S = y?.results || [], te = S.flatMap((e, t) => (e.candidates || []).filter((e) => !e.known && !l.has(e.provider)).map((e) => ({
		candidate: e,
		key: jn(t, e)
	})).filter((e) => !d.has(e.key))), C = en({
		mutationFn: async (e) => {
			let t = [], n = [];
			g(0);
			for (let r of e) {
				try {
					let e = await ke(r.candidate);
					n.push(e.source);
				} catch (e) {
					t.push(Y("follow:shared.labeled", {
						label: r.candidate.label,
						value: W(e)
					}));
				}
				g((e) => e + 1);
			}
			if (n.length) try {
				await Ut(n);
			} catch (e) {
				t.push(W(e));
			}
			return {
				failures: t,
				sources: n
			};
		},
		onSuccess: (e) => {
			J(), e.failures.length ? m(q(e.failures)) : (m(""), ee(), r(Y("follow:addCreatorSource.sourcesAdded", { count: e.sources.length })));
		},
		onError: (e) => m(W(e))
	}), w = e.suggestions || [], ne = !o.includes("/");
	return /* @__PURE__ */ (0, Z.jsxs)("section", {
		"aria-label": En,
		className: Pe({
			padding: "none",
			className: "flex flex-col gap-4 px-6 py-5 max-sm:px-4"
		}),
		children: [
			/* @__PURE__ */ (0, Z.jsx)("h3", {
				className: "text-title-2-medium text-text-primary",
				children: En
			}),
			/* @__PURE__ */ (0, Z.jsx)(O, {
				label: Y("follow:addCreatorSource.inputLabel"),
				placeholder: Tn,
				suggestionsLabel: Y("follow:addCreatorSource.suggestions"),
				value: i,
				setValue: a,
				search: x,
				kind: "creator",
				suggest: Mn,
				readOnly: n,
				busy: v || b.isPending,
				actions: /* @__PURE__ */ (0, Z.jsx)(Nn, {
					credentials: t,
					hidden: l,
					onHidden: u
				})
			}),
			/* @__PURE__ */ (0, Z.jsxs)("div", {
				"aria-live": "polite",
				className: "flex flex-col gap-3 empty:hidden",
				children: [v || b.isPending ? /* @__PURE__ */ (0, Z.jsx)(we, {
					embedded: !0,
					kind: De("follow-resolve"),
					label: pt(_) || (_?.total ? Y("follow:addCreatorSource.searchProgress", {
						checked: _.checked || 0,
						count: _.total
					}) : ne ? Dn : On),
					value: _?.checked,
					total: _?.total
				}) : null, p ? /* @__PURE__ */ (0, Z.jsx)(I, {
					tone: "error",
					title: Y("follow:addJavFeed.notCompleted"),
					children: p
				}) : null]
			}),
			S.length ? /* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, Z.jsx)(D, { children: Y("follow:addCreatorSource.results") }),
					S.map((e, t) => /* @__PURE__ */ (0, Z.jsx)(Pn, {
						row: e,
						at: t,
						hidden: l,
						unpicked: d,
						onPick: (e, t) => f((n) => {
							let r = new Set(n);
							return t ? r.delete(e) : r.add(e), r;
						})
					}, `${e.line}-${t}`)),
					/* @__PURE__ */ (0, Z.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ (0, Z.jsx)(c, {
								variant: "secondary",
								size: "small",
								onClick: () => ee(),
								children: Y("follow:shared.close")
							}),
							/* @__PURE__ */ (0, Z.jsx)(c, {
								variant: "primary",
								size: "small",
								disabled: n || !te.length,
								...U(C.isPending),
								onClick: () => C.mutate(te),
								children: Y("follow:addCreatorSource.addSelected", { count: te.length })
							}),
							C.isPending ? /* @__PURE__ */ (0, Z.jsx)("span", {
								role: "status",
								className: "text-body-2-regular text-text-secondary",
								children: Y("follow:addCreatorSource.addingProgress", {
									added: h,
									count: te.length
								})
							}) : null
						]
					})
				]
			}) : null,
			w.length ? /* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, Z.jsx)("span", {
					className: "text-body-2-regular text-text-secondary",
					children: Y("follow:addCreatorSource.suggested")
				}), w.map((e) => /* @__PURE__ */ (0, Z.jsx)(c, {
					variant: "secondary",
					size: "small",
					disabled: n,
					title: e.origin ? Y("follow:addCreatorSource.historyVisitsFrom", {
						count: e.visits,
						origin: e.origin
					}) : Y("follow:addCreatorSource.historyVisits", { count: e.visits }),
					onClick: () => x(e.name),
					children: e.name
				}, e.name))]
			}) : null
		]
	});
}
// src/react/follow-manage/add-feed.tsx
var In = Y("follow:addJavFeed.placeholder"), Ln = Y("follow:addJavFeed.title");
function Rn(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let { owner: e } of t) e && n.set(e.id, e.name);
	if (n.size > 1) return {
		text: Y("follow:addJavFeed.cardsSplitAcrossPeople", { names: q([...n.values()]) }),
		blocked: !0
	};
	let [r] = n.values();
	return r ? {
		text: Y("follow:addJavFeed.willAddUnder", { name: r }),
		blocked: !1
	} : e.known ? {
		text: Y("follow:addJavFeed.willAddUnderKnown", { name: e.known.name }),
		blocked: !1
	} : {
		text: Y("follow:addJavFeed.willCreate", { name: e.q }),
		blocked: !1
	};
}
async function zn(e, t) {
	let n = new URLSearchParams({
		q: e,
		kind: "performer",
		limit: "8"
	}), { groups: r } = await Ae(`/api/suggest?${n}`, t);
	return r.flatMap((e) => e.items.map((e) => ({
		group: Y("follow:addJavFeed.librarySuggestions"),
		value: e.value,
		matched: e.matched,
		portrait: {
			...e,
			id: e.entity_id
		}
	})));
}
async function Bn(e, t) {
	let { items: n } = await Kt(e, t);
	return n.map((e) => ({
		group: Y("follow:addJavFeed.onlineSuggestions"),
		value: e.name,
		matched: e.provider,
		portrait: {
			source_avatar_url: e.avatar_url,
			name: e.name
		}
	}));
}
function Vn({ name: e, names: t, record: n, subscription: r }) {
	let i = t.filter((t) => t !== e), a = Y(r === "enabled" ? "follow:addJavFeed.sourceSubscribed" : r === "paused" ? "follow:shared.paused" : "follow:addJavFeed.sourceNotSubscribed");
	return /* @__PURE__ */ (0, Z.jsxs)("div", {
		className: "flex flex-wrap items-center gap-x-2 gap-y-1",
		children: [
			i.length ? /* @__PURE__ */ (0, Z.jsx)(_n, { name: q(i) }) : null,
			n ? /* @__PURE__ */ (0, Z.jsx)(m, {
				variant: "caption",
				color: "neutral",
				children: n
			}) : null,
			/* @__PURE__ */ (0, Z.jsx)(m, {
				variant: "caption",
				color: r === "enabled" ? "lime" : "neutral",
				children: a
			})
		]
	});
}
function Hn(e, t) {
	let n = e.known, r = new Map((n?.sources || []).map((e) => [e.url, e])), i = [], a = [], o = [...e.candidates.map((e) => ({
		...e,
		provider: "javdb",
		providerLabel: "JavDB"
	})), ...(e.dmm_candidates ?? []).map((e) => ({
		...e,
		provider: "dmm",
		providerLabel: "DMM",
		record: ""
	}))];
	for (let e of o) {
		let o = `${e.provider}:${e.id}`, s = e.held_by?.name || e.names[0] || e.id, c = e.names.length ? e.names : r.get(e.url)?.names || [];
		(r.delete(e.url) || n && e.held_by?.id === n.id ? i : a).push({
			id: o,
			sourceId: e.id,
			owner: e.held_by ?? void 0,
			name: s,
			selectionName: [c[0] || s, e.record].filter(Boolean).join(" · "),
			provider: e.provider,
			providerLabel: e.providerLabel,
			url: e.url,
			avatar: e.avatar_url,
			portrait: e.portrait ?? void 0,
			selectable: e.subscription !== "enabled",
			picked: e.subscription === "enabled" || t.has(o),
			details: /* @__PURE__ */ (0, Z.jsx)(Vn, {
				name: s,
				names: c,
				record: e.record,
				subscription: e.subscription
			})
		});
	}
	if (n) for (let e of r.values()) {
		let r = `${e.provider}:${e.id}`;
		i.push({
			...e,
			id: r,
			sourceId: e.id,
			owner: n,
			name: n.name,
			selectionName: e.names[0] || e.id,
			portrait: n.portrait,
			providerLabel: e.provider === "dmm" ? "DMM" : "JavDB",
			selectable: e.subscription !== "enabled",
			picked: e.subscription === "enabled" || t.has(r),
			details: /* @__PURE__ */ (0, Z.jsx)(Vn, {
				name: n.name,
				names: e.names,
				subscription: e.subscription
			})
		});
	}
	return [...i, ...a];
}
function Un({ readOnly: e, toast: t, onAdded: n, initialName: r = "" }) {
	let [i, a] = (0, X.useState)(r), [o, s] = (0, X.useState)(null), [l, u] = (0, X.useState)(/* @__PURE__ */ new Set()), d = Qt(), f = (0, X.useRef)(null), p = (0, X.useRef)(""), m = (e) => {
		s(null), u(/* @__PURE__ */ new Set()), d.run("lookup", (t) => _t(e, t), (e) => {
			s(e);
			let t = new Set(e.suggested), n = e.known?.sources.filter((e) => e.provider === "javdb") ?? [];
			u(new Set(e.candidates.filter((r) => r.subscription !== "enabled" && t.has(r.id) && (!n.length || r.held_by?.id === e.known?.id || n.some((e) => e.url === r.url))).map((e) => `javdb:${e.id}`)));
		});
	}, h = () => {
		s(null), u(/* @__PURE__ */ new Set()), d.setError("");
	};
	(0, X.useEffect)(() => {
		r && p.current !== r && (p.current = r, f.current?.scrollIntoView({ block: "start" }), a(r), m(r));
	}, [r]);
	let g = () => {
		if (!o || !y || y.blocked) return;
		let e = v.filter((e) => e.provider === "javdb").map((e) => e.sourceId), r = v.filter((e) => e.provider === "dmm").map((e) => e.sourceId);
		d.run("follow", (t) => lt(o.q, e, r, o.dmm_selection, t), (e) => {
			t(e.created ? Y("follow:addJavFeed.createdAndSubscribed", { name: e.entity_name }) : Y("follow:addJavFeed.subscribed", { name: e.entity_name })), a(""), h(), n();
		});
	}, _ = o ? Hn(o, l) : [], v = _.filter((e) => e.selectable && e.picked), y = o && v.length ? Rn(o, v) : null, b = _.some((e) => e.selectable);
	return /* @__PURE__ */ (0, Z.jsxs)("section", {
		id: "add-jav-subscription",
		ref: f,
		"aria-label": Ln,
		className: Pe({
			padding: "none",
			className: "flex scroll-mt-24 flex-col gap-4 px-6 py-5 max-sm:px-4"
		}),
		children: [
			/* @__PURE__ */ (0, Z.jsx)("h3", {
				className: "text-title-2-medium text-text-primary",
				children: Ln
			}),
			/* @__PURE__ */ (0, Z.jsx)(O, {
				label: Y("follow:addJavFeed.actressName"),
				placeholder: In,
				suggestionsLabel: Y("follow:addJavFeed.suggestions"),
				value: i,
				setValue: a,
				search: m,
				kind: "performer",
				suggest: zn,
				suggestOnline: Bn,
				readOnly: e,
				busy: !!d.busy
			}),
			d.busy === "lookup" ? /* @__PURE__ */ (0, Z.jsx)(we, {
				embedded: !0,
				kind: "radar",
				label: Y("follow:addJavFeed.searching")
			}) : null,
			d.error ? /* @__PURE__ */ (0, Z.jsx)(I, {
				tone: "error",
				title: Y("follow:addJavFeed.notCompleted"),
				children: d.error
			}) : null,
			o ? /* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "flex flex-col gap-3",
				children: [
					o.unavailable ? /* @__PURE__ */ (0, Z.jsx)(I, {
						tone: "warning",
						title: Y("follow:addJavFeed.javdbSearchFailed"),
						children: Rt(o.unavailable_code ?? "", o.unavailable, o.unavailable_params)
					}) : null,
					o.dmm_unavailable ? /* @__PURE__ */ (0, Z.jsx)(I, {
						tone: "warning",
						title: Y("follow:addJavFeed.dmmSearchFailed"),
						children: Rt(o.dmm_unavailable.error_code ?? "", o.dmm_unavailable.error, o.dmm_unavailable.error_params)
					}) : null,
					_.length ? /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [/* @__PURE__ */ (0, Z.jsx)(D, { children: Y("follow:addCreatorSource.results") }), /* @__PURE__ */ (0, Z.jsx)(wn, {
						label: Y("follow:addJavFeed.searchResults"),
						items: _,
						onPick: (e, t) => u((n) => {
							let r = new Set(n);
							return t ? r.add(e) : r.delete(e), r;
						})
					})] }) : !o.unavailable && !o.dmm_unavailable ? /* @__PURE__ */ (0, Z.jsx)(j, { children: Y("follow:addJavFeed.noMatch") }) : null,
					b ? /* @__PURE__ */ (0, Z.jsx)(j, {
						role: "status",
						children: y?.text ?? Y("follow:addJavFeed.pickCardsHint")
					}) : null,
					/* @__PURE__ */ (0, Z.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							size: "small",
							onClick: h,
							children: Y("follow:shared.close")
						}), b ? /* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "primary",
							size: "small",
							disabled: e || !y || y.blocked,
							...U(d.busy === "follow"),
							onClick: g,
							children: Y("follow:addJavFeed.subscribePicked", { count: v.length })
						}) : null]
					})
				]
			}) : null
		]
	});
}
// src/react/follow-manage/alias-rename-dialog.tsx
function Wn({ group: e, close: t, receipt: n }) {
	return /* @__PURE__ */ (0, Z.jsx)(F, {
		isOpen: !!e,
		onOpenChange: (e) => {
			e || t();
		},
		width: "form",
		label: Y("follow:creatorAliases.rename"),
		children: e ? /* @__PURE__ */ (0, Z.jsx)(Gn, {
			group: e,
			close: t,
			receipt: n
		}, e.canonical_key) : null
	});
}
function Gn({ group: t, close: n, receipt: r }) {
	let [i, a] = (0, X.useState)(t.canonical_name), o = Qt();
	return /* @__PURE__ */ (0, Z.jsxs)("form", {
		onSubmit: (e) => {
			e.preventDefault(), i.trim() && i.trim() !== t.canonical_name && o.run("rename", (e) => Ot(t.canonical_key, i.trim(), e), () => {
				J(), r(Y("follow:creatorAliases.renamed", { name: i.trim() })), n();
			});
		},
		className: "flex min-h-0 flex-col gap-4 p-5",
		children: [
			/* @__PURE__ */ (0, Z.jsx)(e, {
				slot: "title",
				className: "text-title-2-semibold text-text-primary",
				children: Y("follow:creatorAliases.rename")
			}),
			/* @__PURE__ */ (0, Z.jsxs)("p", {
				className: "text-body-2-regular wrap-anywhere text-text-secondary",
				children: [Y("follow:creatorAliases.currentName"), t.canonical_name]
			}),
			/* @__PURE__ */ (0, Z.jsx)(N, {
				"aria-label": Y("follow:creatorAliases.displayName"),
				autoFocus: !0,
				value: i,
				onChange: a
			}),
			/* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, Z.jsx)(D, { children: Y("follow:creatorAliases.chooseExisting") }), /* @__PURE__ */ (0, Z.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: t.aliases.map((e) => /* @__PURE__ */ (0, Z.jsx)(c, {
						variant: "secondary",
						size: "small",
						onClick: () => a(e.name),
						children: e.name
					}, e.key))
				})]
			}),
			/* @__PURE__ */ (0, Z.jsx)("p", {
				className: "text-body-2-regular text-text-secondary",
				children: Y("follow:creatorAliases.renameHint")
			}),
			o.error ? /* @__PURE__ */ (0, Z.jsx)(I, {
				tone: "error",
				children: o.error
			}) : null,
			/* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "flex flex-wrap justify-end gap-2",
				children: [/* @__PURE__ */ (0, Z.jsx)(c, {
					variant: "secondary",
					onClick: n,
					children: Y("follow:shared.cancel")
				}), /* @__PURE__ */ (0, Z.jsx)(c, {
					type: "submit",
					variant: "primary",
					disabled: !i.trim() || i.trim() === t.canonical_name,
					...U(!!o.busy),
					children: Y("follow:creatorAliases.rename")
				})]
			})
		]
	});
}
// src/react/follow-manage/alias-manager.tsx
var Kn = (e) => Y("follow:creatorAliases.removeBody", { alias: e }), qn = qt({
	rowSelectionFeature: Nt,
	rowSortingFeature: Ft,
	rowPaginationFeature: Mt,
	columnVisibilityFeature: We,
	columnOrderingFeature: Ue,
	sortedRowModel: Je(),
	paginatedRowModel: qe()
}), Jn = qn, Yn = {
	id: "select",
	label: Y("follow:shared.select"),
	width: 48,
	min: 48,
	max: 48,
	required: !0
}, Xn = {
	id: "canonical",
	label: Y("follow:creatorAliases.displayName"),
	width: 280,
	min: 240,
	required: !0,
	flex: !0
}, Zn = [
	Yn,
	Xn,
	{
		id: "alias",
		label: Y("follow:creatorAliases.platformAlias"),
		width: 240
	},
	{
		id: "evidence",
		label: Y("follow:creatorAliases.evidence"),
		width: 320
	},
	{
		id: "actions",
		label: Y("follow:shared.actions"),
		width: 112
	}
], Qn = [
	Yn,
	Xn,
	{
		id: "aliases",
		label: Y("follow:creatorAliases.platformAlias"),
		width: 400
	},
	{
		id: "actions",
		label: Y("follow:shared.actions"),
		width: 184,
		min: 168
	}
], $n = (e) => e.alias;
function er(e, t, n) {
	let r = n ? `name:${n}` : "", i = r && e.find((e) => e.author_key === r) || e.find((e) => e.author_name === t || e.entity_name === t);
	return i ? e.filter((e) => e.author_key === i.author_key) : [];
}
function tr({ sources: e, name: t, canonicalKey: n }) {
	return /* @__PURE__ */ (0, Z.jsxs)("span", {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ (0, Z.jsx)(hn, {
			group: er(e, t, n),
			name: t
		}), /* @__PURE__ */ (0, Z.jsx)("b", {
			className: "text-body-medium",
			children: t
		})]
	});
}
function nr({ groups: e, suggestions: o, sources: s = [], readOnly: l, toast: u }) {
	let d = un("alias-suggestions", Zn), m = un("alias-saved", Qn), [h, g] = (0, X.useState)(null), [_, v] = (0, X.useState)({}), [w, ne] = (0, X.useState)({}), re = tn(() => {
		v({}), ne({});
	});
	(0, X.useEffect)(() => {
		(Object.values(_).some(Boolean) || Object.values(w).some(Boolean)) && $e();
	}, [_, w]);
	let ie = dn(() => v({})), T = dn(() => ne({})), [E, ae] = (0, X.useState)([]), [oe, O] = (0, X.useState)([]), [k, A] = on("alias-suggestions"), [j, M] = on("alias-saved"), se = (0, X.useRef)(null), ce = (0, X.useRef)(null), P = ln(o, {
		canonical: {
			values: (e) => e.canonical,
			option: (e) => ({ leading: () => /* @__PURE__ */ (0, Z.jsx)(hn, {
				group: er(s, e),
				name: e,
				small: !0
			}) })
		},
		alias: {
			values: (e) => e.alias,
			option: (e, t) => ({ leading: () => /* @__PURE__ */ (0, Z.jsx)(hn, {
				group: er(s, t?.canonical ?? e),
				name: e,
				small: !0
			}) })
		},
		evidence: { values: (e) => Rt(e.evidence_code ?? "", e.evidence, e.evidence_params) }
	}, () => A((e) => ({
		...e,
		pageIndex: 0
	}))), F = ln(e, {
		canonical: {
			values: (e) => e.canonical_name,
			option: (e, t) => ({ leading: () => /* @__PURE__ */ (0, Z.jsx)(hn, {
				group: er(s, e, t?.canonical_key),
				name: e,
				small: !0
			}) })
		},
		aliases: {
			values: (e) => e.aliases.map((e) => e.name),
			option: (e, t) => ({ leading: () => /* @__PURE__ */ (0, Z.jsx)(hn, {
				group: er(s, t?.canonical_name ?? e, t?.canonical_key),
				name: e,
				small: !0
			}) })
		}
	}, () => M((e) => ({
		...e,
		pageIndex: 0
	}))), I = {
		...k,
		pageIndex: Math.min(k.pageIndex, Math.max(0, Math.ceil(P.items.length / k.pageSize) - 1))
	}, ue = {
		...j,
		pageIndex: Math.min(j.pageIndex, Math.max(0, Math.ceil(F.items.length / j.pageSize) - 1))
	}, [R, de] = (0, X.useState)(""), [z, fe] = (0, X.useState)(""), [pe, he] = (0, X.useState)(""), B = en({
		mutationFn: async (e) => {
			let t = 0;
			for (let n of e) {
				try {
					await Oe(n.canonical, n.alias);
				} catch (n) {
					throw t && J(), Error(Y("follow:creatorAliases.mergePartialError", {
						error: W(n),
						count: e.length - t
					}));
				}
				t += 1;
			}
			return {
				done: t,
				items: e
			};
		},
		onSuccess: () => {
			de(""), v({}), J();
		},
		onError: (e) => de(W(e))
	}), ge = en({
		mutationFn: (e) => Oe(e.canonical, e.alias),
		onSuccess: () => {
			de(""), fe(""), he(""), J(), u(Y("follow:creatorAliases.saved"));
		},
		onError: (e) => de(W(e))
	}), _e = en({
		mutationFn: async (e) => {
			let t = typeof e == "string" ? [e] : e, n = 0;
			try {
				for (let e of t) await Tt(e), n += 1;
			} catch (e) {
				throw Error(Y("follow:creatorAliases.removePartialError", {
					error: W(e),
					removed: n,
					count: t.length - n
				}));
			} finally {
				J();
			}
		},
		onSuccess: (e, t) => {
			de(""), ne({}), typeof t == "string" && u(Y("follow:creatorAliases.removed"));
		},
		onError: (e) => de(W(e))
	}), ve = {
		receipt: u,
		failure: (e) => de(W(e))
	}, ye = (e, t) => ({
		key: e ? "merge-all" : "merge",
		reversal: "undo",
		label: Y(e ? "follow:creatorAliases.mergeAllCount" : "follow:creatorAliases.mergeSelectedCount", { count: t }),
		confirm: (t) => ({
			title: Y(e ? "follow:creatorAliases.mergeAllTitle" : "follow:creatorAliases.mergeSelectedTitle"),
			body: Y("follow:creatorAliases.mergeBody", {
				count: t.length,
				pairs: q(t.map((e) => Y("follow:creatorAliases.mergePair", {
					alias: wt(e.alias),
					canonical: wt(e.canonical)
				})))
			}),
			confirmLabel: Y(e ? "follow:creatorAliases.mergeAllConfirm" : "follow:creatorAliases.mergeSelectedConfirm")
		}),
		run: async (e) => {
			let { done: t } = await B.mutateAsync([...e]);
			return async () => {
				for (let n of e.slice(0, t)) await Tt(n.alias);
				await J();
			};
		},
		receipt: (e) => Y("follow:creatorAliases.merged", { count: e.length })
	}), we = (e, t) => {
		e.length && It(ye(t, e.length), e, ve).catch(ve.failure);
	}, Te = {
		key: "remove",
		reversal: "undo",
		label: Y("follow:creatorAliases.removeSelectedCount", { count: 0 }),
		confirm: (e) => ({
			title: Y("follow:creatorAliases.removeSelectedTitle"),
			body: Y("follow:creatorAliases.removeSelectedBody", { count: e.length }),
			items: e.map((e) => e.name),
			confirmLabel: Y("follow:creatorAliases.removeSelectedConfirm")
		}),
		run: async (e) => (await _e.mutateAsync(e.map((e) => e.name)), async () => {
			for (let t of e) await Oe(t.canonical, t.name);
			await J();
		}),
		receipt: () => Y("follow:creatorAliases.removed")
	}, V = (e) => void Ge({
		title: Y("follow:creatorAliases.removeTitle"),
		body: Kn(e),
		confirmLabel: Y("follow:creatorAliases.removeTitle"),
		onConfirm: () => _e.mutateAsync(e)
	}), H = (0, X.useRef)({
		sources: s,
		readOnly: l,
		merging: B.isPending,
		removing: _e.isPending,
		merge: we,
		remove: V,
		rename: g
	});
	H.current = {
		sources: s,
		readOnly: l,
		merging: B.isPending,
		removing: _e.isPending,
		merge: we,
		remove: V,
		rename: g
	};
	let De = (0, X.useMemo)(() => {
		let e = Ke();
		return e.columns([
			e.display({
				id: "select",
				header: (e) => /* @__PURE__ */ (0, Z.jsx)(Ce, {
					table: e.table,
					label: Y("follow:creatorAliases.selectAllPending")
				}),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)(f, {
					slot: null,
					isSelected: e.row.getIsSelected(),
					"aria-label": Y("follow:creatorAliases.selectPendingRow", {
						alias: e.row.original.alias,
						name: e.row.original.canonical
					}),
					onChange: (t) => e.row.toggleSelected(t)
				})
			}),
			e.accessor("canonical", {
				header: Y("follow:creatorAliases.displayName"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)(tr, {
					sources: H.current.sources,
					name: e.getValue()
				})
			}),
			e.accessor("alias", {
				header: Y("follow:creatorAliases.platformAlias"),
				cell: (e) => e.getValue()
			}),
			e.accessor((e) => Rt(e.evidence_code ?? "", e.evidence, e.evidence_params), {
				id: "evidence",
				header: Y("follow:creatorAliases.evidence"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)("span", {
					className: "text-body-2-regular text-text-secondary",
					children: e.getValue()
				})
			}),
			e.display({
				id: "actions",
				header: Y("follow:shared.actions"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)(c, {
					variant: "secondary",
					size: "small",
					disabled: H.current.readOnly,
					...U(H.current.merging),
					onClick: () => H.current.merge([e.row.original], !1),
					children: Y("follow:shared.merge")
				})
			})
		]);
	}, []), ke = (0, X.useMemo)(() => {
		let e = Ke();
		return e.columns([
			e.display({
				id: "select",
				header: ({ table: e }) => /* @__PURE__ */ (0, Z.jsx)(Ce, {
					table: e,
					label: Y("follow:creatorAliases.selectAllSaved")
				}),
				cell: ({ row: e }) => /* @__PURE__ */ (0, Z.jsx)(f, {
					slot: null,
					"aria-label": Y("follow:creatorAliases.selectSavedRow", { name: e.original.canonical_name }),
					isSelected: e.getIsSelected(),
					onChange: (t) => e.toggleSelected(t)
				})
			}),
			e.accessor("canonical_name", {
				id: "canonical",
				header: Y("follow:creatorAliases.displayName"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)(tr, {
					sources: H.current.sources,
					name: e.getValue(),
					canonicalKey: e.row.original.canonical_key
				})
			}),
			e.accessor("aliases", {
				header: Y("follow:creatorAliases.platformAlias"),
				sortFn: (e, t) => e.original.aliases.map((e) => e.name).join(" ").localeCompare(t.original.aliases.map((e) => e.name).join(" "), "zh-CN"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)("span", {
					className: "flex flex-wrap items-center gap-1.5",
					children: e.getValue().map((e) => /* @__PURE__ */ (0, Z.jsxs)("span", {
						className: "inline-flex items-center gap-1 rounded-md bg-background-secondary-default px-1.5 py-1 text-caption-1-medium text-text-secondary",
						children: [e.name, /* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "ghost",
							size: "xs",
							iconOnly: !0,
							leadingIcon: L,
							"aria-label": Y("follow:creatorAliases.removeAliasNamed", { name: e.name }),
							disabled: H.current.readOnly,
							...U(H.current.removing),
							onClick: () => H.current.remove(e.name)
						})]
					}, e.key))
				})
			}),
			e.display({
				id: "actions",
				header: Y("follow:shared.actions"),
				cell: ({ row: e }) => /* @__PURE__ */ (0, Z.jsx)(c, {
					variant: "secondary",
					size: "small",
					disabled: H.current.readOnly,
					"aria-label": Y("follow:creatorAliases.renameRowLabel", { name: e.original.canonical_name }),
					onClick: () => H.current.rename(e.original),
					children: Y("follow:creatorAliases.rename")
				})
			})
		]);
	}, []), Ae = cn({
		features: qn,
		data: P.items,
		columns: De,
		getRowId: $n,
		state: {
			rowSelection: _,
			sorting: E,
			pagination: I,
			columnOrder: d.columnOrder,
			columnVisibility: d.visibility
		},
		onColumnVisibilityChange: d.change,
		onRowSelectionChange: (e) => {
			ie(), v(e);
		},
		onSortingChange: (e) => {
			ae(e), A((e) => ({
				...e,
				pageIndex: 0
			}));
		},
		onPaginationChange: A,
		enableRowSelection: !0
	}), je = cn({
		features: Jn,
		data: F.items,
		columns: ke,
		getRowId: (e) => e.canonical_key,
		state: {
			rowSelection: w,
			sorting: oe,
			pagination: ue,
			columnOrder: m.columnOrder,
			columnVisibility: m.visibility
		},
		onColumnVisibilityChange: m.change,
		onRowSelectionChange: (e) => {
			T(), ne(e);
		},
		enableRowSelection: !0,
		onSortingChange: (e) => {
			O(e), M((e) => ({
				...e,
				pageIndex: 0
			}));
		},
		onPaginationChange: M
	}), Me = o.filter((e) => _[$n(e)]), Ne = e.filter((e) => w[e.canonical_key]).flatMap((e) => e.aliases.map((t) => ({
		name: t.name,
		canonical: e.canonical_name
	}))), Fe = sn((e) => o.find((t) => $n(t) === e), (e) => {
		let t = Ae.getRow($n(e));
		return [Pt(t.getIsSelected(), () => t.toggleSelected()), {
			id: "merge",
			label: Y("follow:shared.merge"),
			icon: Yt,
			disabled: l || B.isPending,
			run: () => we([e], !1)
		}];
	}), Ie = sn((t) => e.find((e) => e.canonical_key === t), (e) => {
		let t = je.getRow(e.canonical_key), n = e.aliases.map((t) => ({
			name: t.name,
			canonical: e.canonical_name
		}));
		return [
			{
				id: "rename",
				label: Y("follow:creatorAliases.rename"),
				icon: y,
				disabled: l,
				run: () => g(e)
			},
			Pt(t.getIsSelected(), () => t.toggleSelected()),
			{
				id: "remove",
				label: Y("follow:creatorAliases.removeRowAliases", { count: n.length }),
				icon: le,
				danger: !0,
				disabled: l || _e.isPending || !n.length,
				run: async () => {
					await It(Te, n, ve);
				}
			}
		];
	}), Le = U(B.isPending);
	return /* @__PURE__ */ (0, Z.jsxs)("div", {
		className: Pe({
			padding: "none",
			className: "flex flex-col gap-4 px-6 py-5 max-sm:px-4"
		}),
		children: [
			/* @__PURE__ */ (0, Z.jsx)("h3", {
				className: "text-title-2-medium text-text-primary",
				children: Y("follow:creatorAliases.title")
			}),
			/* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, Z.jsx)(D, { children: Y("follow:creatorAliases.addManually") }), /* @__PURE__ */ (0, Z.jsxs)("div", {
					className: "flex flex-wrap items-end gap-2",
					children: [
						/* @__PURE__ */ (0, Z.jsx)(N, {
							"aria-label": Y("follow:creatorAliases.displayName"),
							placeholder: Y("follow:creatorAliases.displayNamePlaceholder"),
							value: z,
							onChange: fe,
							isDisabled: l,
							className: "w-56"
						}),
						/* @__PURE__ */ (0, Z.jsx)(N, {
							"aria-label": Y("follow:creatorAliases.platformAlias"),
							placeholder: Y("follow:creatorAliases.platformAlias"),
							value: pe,
							onChange: he,
							isDisabled: l,
							className: "w-56"
						}),
						/* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "primary",
							disabled: l || !z.trim() || !pe.trim(),
							...U(ge.isPending),
							onClick: () => ge.mutate({
								canonical: z.trim(),
								alias: pe.trim()
							}),
							children: Y("follow:creatorAliases.saveAlias")
						})
					]
				})]
			}),
			R ? /* @__PURE__ */ (0, Z.jsx)(C, { children: R }) : null,
			o.length ? /* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "flex flex-col gap-2",
				onKeyDown: Fe.onKeyDown,
				children: [
					Fe.menu,
					/* @__PURE__ */ (0, Z.jsxs)("div", {
						"data-responsive-toolbar": "",
						children: [/* @__PURE__ */ (0, Z.jsxs)("div", {
							"data-toolbar-heading": "",
							children: [/* @__PURE__ */ (0, Z.jsx)(D, { children: Y("follow:creatorAliases.pending") }), /* @__PURE__ */ (0, Z.jsx)("span", {
								className: "text-body-2-regular text-text-secondary",
								children: Y("follow:creatorAliases.groupCount", { count: P.items.length })
							})]
						}), /* @__PURE__ */ (0, Z.jsxs)("div", {
							"data-toolbar-actions": "",
							children: [
								/* @__PURE__ */ (0, Z.jsx)(c, {
									variant: "primary",
									size: "small",
									disabled: l,
									...Le,
									onClick: () => we(P.items, !0),
									children: Y("follow:creatorAliases.mergeAllCount", { count: P.items.length })
								}),
								/* @__PURE__ */ (0, Z.jsx)(x, {
									label: Y("follow:creatorAliases.pendingTable"),
									sorting: E,
									options: [
										{
											id: "canonical",
											label: Y("follow:creatorAliases.displayName")
										},
										{
											id: "alias",
											label: Y("follow:creatorAliases.platformAlias")
										},
										{
											id: "evidence",
											label: Y("follow:creatorAliases.evidence")
										}
									],
									onChange: (e) => {
										ae(e), A((e) => ({
											...e,
											pageIndex: 0
										}));
									}
								}),
								/* @__PURE__ */ (0, Z.jsx)(xe, {
									preferences: d,
									label: Y("follow:creatorAliases.pendingTable")
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, Z.jsx)(me, {
						label: Y("follow:creatorAliases.pendingBulkActions"),
						visible: Me.length > 0,
						count: Y("follow:creatorAliases.groupsSelected", { count: Me.length }),
						actions: [{
							action: ye(!1, Me.length),
							items: Me,
							host: ve,
							disabled: l || B.isPending
						}],
						children: /* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "ghost",
							size: "small",
							onClick: tt,
							children: Y("follow:shared.clearSelection")
						})
					}),
					/* @__PURE__ */ (0, Z.jsx)(ee, {
						ref: se,
						follow: !0,
						preferences: d,
						onRowClick: (e) => Ae.getRow(e)?.toggleSelected(),
						rectangleSelecting: re,
						onRectangle: B.isPending ? void 0 : (e, t) => Ae.setRowSelection({
							...t ? _ : {},
							...Object.fromEntries(e.map((e) => [e, !0]))
						}),
						children: /* @__PURE__ */ (0, Z.jsxs)(be, {
							"aria-label": Y("follow:creatorAliases.pendingTable"),
							size: "sm",
							sortDescriptor: E[0] ? {
								column: E[0].id,
								direction: E[0].desc ? "descending" : "ascending"
							} : void 0,
							onSortChange: (e) => Ae.getColumn(String(e.column))?.toggleSorting(e.direction === "descending"),
							children: [/* @__PURE__ */ (0, Z.jsxs)(a, { children: [Ae.getHeaderGroups()[0].headers.map((e) => /* @__PURE__ */ (0, Z.jsx)(n, {
								id: e.id,
								isRowHeader: e.column.id === "canonical",
								allowsSorting: e.column.getCanSort(),
								...d.columnProps(e.id),
								children: ({ sortDirection: t }) => /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [/* @__PURE__ */ (0, Z.jsxs)("span", {
									className: "flex items-center gap-0.5",
									children: [P.header(e.id, String(e.column.columnDef.header)) ?? ct(e.column.columnDef.header, e.getContext()), e.column.getCanSort() ? /* @__PURE__ */ (0, Z.jsx)("span", {
										"data-sort-indicator": !0,
										"data-direction": t || void 0,
										children: /* @__PURE__ */ (0, Z.jsx)(p, {})
									}) : null]
								}), /* @__PURE__ */ (0, Z.jsx)(Se, {
									preferences: d,
									id: e.id
								})] })
							}, e.id)), /* @__PURE__ */ (0, Z.jsx)(n, {
								id: "remaining-space",
								"aria-label": Y("follow:shared.rowSpacer"),
								"data-table-space": "",
								width: d.spaceWidth,
								minWidth: 0
							})] }), /* @__PURE__ */ (0, Z.jsx)(t, {
								renderEmptyState: () => Y("shell:dataTable.empty"),
								children: Ae.getRowModel().rows.map((e) => /* @__PURE__ */ (0, Z.jsxs)(r, {
									id: e.id,
									"data-board-selected": e.getIsSelected() || void 0,
									"data-work-context-row": e.id,
									onContextMenu: (t) => Fe.onContextMenu?.(t, e.original, e.id),
									children: [e.getVisibleCells().map((e) => /* @__PURE__ */ (0, Z.jsx)(i, { children: ct(e.column.columnDef.cell, e.getContext()) }, e.id)), /* @__PURE__ */ (0, Z.jsx)(i, { "data-table-space": "" })]
								}, e.id))
							})]
						})
					}),
					/* @__PURE__ */ (0, Z.jsx)(b, {
						label: Y("follow:creatorAliases.pendingTable"),
						unit: Y("follow:creatorAliases.groupUnit"),
						total: P.items.length,
						pagination: I,
						onChange: A,
						scrollTarget: se
					})
				]
			}) : null,
			/* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "flex flex-col gap-2",
				onKeyDown: Ie.onKeyDown,
				children: [
					Ie.menu,
					/* @__PURE__ */ (0, Z.jsxs)("div", {
						"data-responsive-toolbar": "",
						children: [/* @__PURE__ */ (0, Z.jsxs)("div", {
							"data-toolbar-heading": "",
							children: [/* @__PURE__ */ (0, Z.jsx)(D, { children: Y("follow:creatorAliases.savedAliases") }), /* @__PURE__ */ (0, Z.jsx)("span", {
								className: "text-body-2-regular text-text-secondary",
								children: Y("follow:creatorAliases.groupCount", { count: F.items.length })
							})]
						}), /* @__PURE__ */ (0, Z.jsxs)("div", {
							"data-toolbar-actions": "",
							children: [/* @__PURE__ */ (0, Z.jsx)(x, {
								label: Y("follow:creatorAliases.saved"),
								sorting: oe,
								options: [{
									id: "canonical",
									label: Y("follow:creatorAliases.displayName")
								}, {
									id: "aliases",
									label: Y("follow:creatorAliases.platformAlias")
								}],
								onChange: (e) => {
									O(e), M((e) => ({
										...e,
										pageIndex: 0
									}));
								}
							}), /* @__PURE__ */ (0, Z.jsx)(xe, {
								preferences: m,
								label: Y("follow:creatorAliases.saved")
							})]
						})]
					}),
					/* @__PURE__ */ (0, Z.jsx)(me, {
						label: Y("follow:creatorAliases.savedBulkActions"),
						visible: Ne.length > 0,
						count: Y("follow:creatorAliases.aliasesSelected", { count: Ne.length }),
						actions: [{
							action: {
								...Te,
								label: Y("follow:creatorAliases.removeSelectedCount", { count: Ne.length })
							},
							items: Ne,
							host: ve,
							disabled: l || _e.isPending
						}],
						children: /* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "ghost",
							size: "small",
							onClick: tt,
							children: Y("follow:shared.clearSelection")
						})
					}),
					e.length ? /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [/* @__PURE__ */ (0, Z.jsx)(ee, {
						ref: ce,
						follow: !0,
						preferences: m,
						onRowClick: (e) => je.getRow(e)?.toggleSelected(),
						rectangleSelecting: re,
						onRectangle: _e.isPending ? void 0 : (e, t) => je.setRowSelection({
							...t ? w : {},
							...Object.fromEntries(e.map((e) => [e, !0]))
						}),
						children: /* @__PURE__ */ (0, Z.jsxs)(be, {
							"aria-label": Y("follow:creatorAliases.saved"),
							size: "sm",
							sortDescriptor: oe[0] ? {
								column: oe[0].id,
								direction: oe[0].desc ? "descending" : "ascending"
							} : void 0,
							onSortChange: (e) => je.getColumn(String(e.column))?.toggleSorting(e.direction === "descending"),
							children: [/* @__PURE__ */ (0, Z.jsxs)(a, { children: [je.getHeaderGroups()[0].headers.map((e) => /* @__PURE__ */ (0, Z.jsx)(n, {
								id: e.id,
								isRowHeader: e.column.id === "canonical",
								allowsSorting: e.column.getCanSort(),
								...m.columnProps(e.id),
								children: ({ sortDirection: t }) => /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [/* @__PURE__ */ (0, Z.jsxs)("span", {
									className: "flex items-center gap-0.5",
									children: [F.header(e.id, String(e.column.columnDef.header)) ?? ct(e.column.columnDef.header, e.getContext()), e.column.getCanSort() ? /* @__PURE__ */ (0, Z.jsx)("span", {
										"data-sort-indicator": !0,
										"data-direction": t || void 0,
										children: /* @__PURE__ */ (0, Z.jsx)(p, {})
									}) : null]
								}), /* @__PURE__ */ (0, Z.jsx)(Se, {
									preferences: m,
									id: e.id
								})] })
							}, e.id)), /* @__PURE__ */ (0, Z.jsx)(n, {
								id: "remaining-space",
								"aria-label": Y("follow:shared.rowSpacer"),
								"data-table-space": "",
								width: m.spaceWidth,
								minWidth: 0
							})] }), /* @__PURE__ */ (0, Z.jsx)(t, {
								renderEmptyState: () => Y("shell:dataTable.empty"),
								children: je.getRowModel().rows.map((e) => /* @__PURE__ */ (0, Z.jsxs)(r, {
									id: e.id,
									"data-board-selected": e.getIsSelected() || void 0,
									"data-work-context-row": e.id,
									onContextMenu: (t) => Ie.onContextMenu?.(t, e.original, e.id),
									children: [e.getVisibleCells().map((e) => /* @__PURE__ */ (0, Z.jsx)(i, { children: ct(e.column.columnDef.cell, e.getContext()) }, e.id)), /* @__PURE__ */ (0, Z.jsx)(i, { "data-table-space": "" })]
								}, e.id))
							})]
						})
					}), /* @__PURE__ */ (0, Z.jsx)(b, {
						label: Y("follow:creatorAliases.saved"),
						unit: Y("follow:creatorAliases.groupUnit"),
						total: F.items.length,
						pagination: ue,
						onChange: M,
						scrollTarget: ce
					})] }) : /* @__PURE__ */ (0, Z.jsx)(te, {
						size: "compact",
						icon: Ee,
						title: Y("follow:creatorAliases.emptyTitle"),
						actions: l ? void 0 : /* @__PURE__ */ (0, Z.jsx)(S, {
							target: `input[aria-label="${Y("follow:creatorAliases.displayName")}"]`,
							children: Y("follow:creatorAliases.addAlias")
						}),
						children: Y("follow:creatorAliases.emptyBody")
					})
				]
			}),
			/* @__PURE__ */ (0, Z.jsx)(Wn, {
				group: h,
				close: () => g(null),
				receipt: u
			})
		]
	});
}
// src/react/follow-manage/feed-sources.tsx
var rr = qt({
	rowPaginationFeature: Mt,
	rowSelectionFeature: Nt,
	rowSortingFeature: Ft,
	columnVisibilityFeature: We,
	columnOrderingFeature: Ue,
	sortedRowModel: Je(),
	paginatedRowModel: qe()
}), ir = {
	select: Y("follow:shared.select"),
	name: Y("follow:shared.name"),
	kind: Y("follow:shared.type"),
	origin: Y("follow:followFeed.filterKindSource"),
	status: Y("follow:shared.status"),
	interval: Y("follow:feedSources.colInterval"),
	fetched: Y("follow:feedSources.colLastFetched"),
	fresh: Y("follow:feedSources.colLastAdded"),
	actions: Y("follow:shared.actions")
}, ar = Object.entries(ir).map(([e, t]) => ({
	id: e,
	label: t,
	width: e === "select" ? 48 : e === "name" ? 300 : e === "actions" ? 208 : e === "fetched" ? 200 : e === "origin" ? 184 : 160,
	min: e === "select" ? 48 : e === "actions" ? 200 : e === "name" ? 300 : 112,
	max: e === "select" ? 48 : e === "name" ? 2e3 : 800,
	flex: e === "name",
	required: e === "select" || e === "name"
})), or = () => Ct.invalidateQueries({
	queryKey: ne,
	exact: !0
}), Q = (e) => e.name || e.url, sr = (e) => e.kind.startsWith("javdb") ? "javdb" : e.kind.startsWith("dmm") ? "dmm" : cr(e.url);
function cr(e) {
	try {
		return new URL(e).hostname.replace(/^www\./, "");
	} catch {
		return e;
	}
}
function lr({ source: e }) {
	return e.enabled ? e.last_error ? /* @__PURE__ */ (0, Z.jsx)(m, {
		variant: "caption",
		color: "rose",
		children: Y("follow:feedSources.fetchFailed")
	}) : e.last_fetched_at ? /* @__PURE__ */ (0, Z.jsx)(m, {
		variant: "caption",
		color: "lime",
		children: Y("follow:shared.ok")
	}) : /* @__PURE__ */ (0, Z.jsx)(m, {
		variant: "caption",
		color: "gray",
		children: Y("follow:feedSources.notChecked")
	}) : /* @__PURE__ */ (0, Z.jsx)(m, {
		variant: "caption",
		color: "gray",
		children: Y("follow:shared.paused")
	});
}
function ur({ source: e }) {
	let t = e.entity_id ? {
		id: e.entity_id,
		has_image: !!e.has_image,
		image_version: e.image_version,
		avatar_focus: e.avatar_focus
	} : null;
	return /* @__PURE__ */ (0, Z.jsx)("span", {
		"aria-hidden": !0,
		className: `relative inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-media-placeholder text-caption-1-semibold text-text-secondary ${ce}`,
		dangerouslySetInnerHTML: { __html: Ne(Q(e), t, null, "performer") }
	});
}
var dr = (e, t) => e.entity_id !== null && t.has(e.entity_id) && e.page_name && e.page_name !== e.name ? e.page_name : "";
function fr(e) {
	let t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
	for (let { entity_id: r } of e) r !== null && (t.has(r) ? n.add(r) : t.add(r));
	return n;
}
function pr(e, t) {
	let n = e.length === 1 ? e[0] : null;
	return Ge({
		title: n ? Y("follow:feedSources.removeOne") : Y("follow:feedSources.removeMany", { count: e.length }),
		body: n ? Y("follow:feedSources.removeOneBody", { name: Q(n) }) : Y("follow:feedSources.removeManyBody"),
		confirmLabel: Y(n ? "follow:feedSources.removeOne" : "follow:feedSources.removeSelected"),
		danger: !0,
		holdToConfirm: !0,
		onConfirm: t
	});
}
function mr({ readOnly: e, toast: o, selection: s }) {
	let l = nn({
		queryKey: ne,
		queryFn: ({ signal: e }) => at(e)
	}), u = Qt(), d = un("jav-feeds", ar), m = l.data, h = (0, X.useMemo)(() => m?.sources ?? [], [m]), [g, v] = (0, X.useState)(/* @__PURE__ */ new Set()), y = s?.ids ?? g, S = s?.onChange ?? v, [te, w] = (0, X.useState)(1), [re, ie] = an("jav-feeds"), [T, E] = (0, X.useState)([]), [ae, oe] = (0, X.useState)(""), D = (0, X.useMemo)(() => {
		let e = ae.toLocaleLowerCase();
		return e ? h.filter((t) => [
			Q(t),
			t.name,
			t.page_name || "",
			t.entity_name || "",
			t.url
		].join(" ").toLocaleLowerCase().includes(e)) : h;
	}, [h, ae]), O = ln(D, {
		name: {
			values: Q,
			option: (e, t) => ({ leading: t && /* @__PURE__ */ (0, Z.jsx)(_, { person: {
				...t,
				id: t.entity_id,
				name: e
			} }) })
		},
		kind: {
			values: (e) => He(e, "kind_label"),
			option: (e, t) => ({ leading: t && /* @__PURE__ */ (0, Z.jsx)(B, { site: sr(t) }) })
		},
		origin: {
			values: (e) => cr(e.url),
			option: (e, t) => ({ leading: /* @__PURE__ */ (0, Z.jsx)(B, { site: t ? sr(t) : e }) })
		},
		status: { values: (e) => e.enabled ? e.last_error ? Y("follow:feedSources.fetchFailed") : e.last_fetched_at ? Y("follow:shared.ok") : Y("follow:feedSources.notChecked") : Y("follow:shared.paused") },
		interval: { values: (e) => nt(e.interval_minutes) },
		fetched: {
			range: "timestamp",
			value: (e) => e.last_fetched_at ? pn(e.last_fetched_at).getTime() / 1e3 : null
		},
		fresh: {
			range: "count",
			value: (e) => e.last_new_count
		}
	}, () => w(1)), j = xt(O.items.length, re, te);
	(0, X.useEffect)(() => {
		w((e) => Math.min(e, j.pages));
	}, [j.pages]), (0, X.useEffect)(() => {
		S((e) => {
			let t = new Set(h.map((e) => e.id)), n = new Set([...e].filter((e) => t.has(e)));
			return n.size === e.size ? e : n;
		});
	}, [h, S]);
	let N = en({
		mutationFn: async (e) => {
			let t = await vt(e.ids, 4, async (t) => {
				e.action === "remove" ? await Et(t) : await zt(t, e.action === "enabled");
			});
			return {
				...e,
				results: t
			};
		},
		onSuccess: (e) => {
			let t = e.results.filter((e) => !e.ok);
			if (S(/* @__PURE__ */ new Set()), or(), t.length) {
				let e = t[0];
				u.setError(Y("follow:feedSources.writeFailed", {
					count: t.length,
					error: e.ok ? "" : W(e.error)
				}));
			}
		},
		onError: (e) => u.setError(W(e))
	}), se = {
		receipt: o,
		failure: (e) => u.setError(W(e))
	}, ce = (e) => ({
		key: e ? "enable" : "pause",
		label: Y(e ? "follow:shared.enable" : "follow:shared.pause"),
		reversal: "undo",
		confirm: (t) => ({
			title: Y(e ? "follow:feedSources.enableMany" : "follow:feedSources.pauseMany"),
			body: Y(e ? "follow:feedSources.enableManyBody" : "follow:feedSources.pauseManyBody", { count: t.length })
		}),
		run: async (t) => {
			let n = t.filter((t) => t.enabled !== e), { results: r } = await N.mutateAsync({
				ids: n.map((e) => e.id),
				action: e ? "enabled" : "paused"
			}), i = n.filter((e, t) => r[t]?.ok);
			return async () => {
				await vt(i.map((e) => e.id), 4, (t) => zt(t, !e)), await or();
			};
		},
		receipt: (t) => Y(e ? "follow:feedSources.enabledMany" : "follow:feedSources.pausedMany", { count: t.length })
	}), P = {
		key: "remove",
		label: Y("follow:shared.remove"),
		reversal: "irreversible",
		danger: !0,
		holdToConfirm: !0,
		confirm: (e) => ({
			title: Y("follow:feedSources.removeMany", { count: e.length }),
			danger: !0,
			body: Y("follow:feedSources.removeManyBody"),
			confirmLabel: Y("follow:feedSources.removeSelected")
		}),
		run: async (e) => {
			await N.mutateAsync({
				ids: e.map((e) => e.id),
				action: "remove"
			});
		},
		receipt: (e) => Y("follow:feedSources.removedMany", { count: e.length })
	}, F = (0, X.useMemo)(() => fr(h), [h]), L = (0, X.useRef)(null), R = (0, X.useRef)({
		readOnly: e,
		shared: F,
		busy: null,
		toggle: () => {},
		fetch: () => {},
		remove: () => {}
	});
	R.current = {
		readOnly: e,
		shared: F,
		busy: u.busy,
		toggle: (e, t) => void u.run(`enabled-${e.id}`, (n) => zt(e.id, t, n), () => void or()),
		fetch: (e) => void u.run(`check-${e.id}`, (t) => Le(t, [e.id]), () => void or()),
		remove: (e) => void pr([e], async () => {
			await Et(e.id), o(Y("follow:feedSources.removedOne", { name: Q(e) })), or();
		})
	};
	let de = (0, X.useMemo)(() => {
		let e = Ke(), t = (e) => () => ir[e] || e;
		return e.columns([
			e.display({
				id: "select",
				header: (e) => /* @__PURE__ */ (0, Z.jsx)(Ce, {
					table: e.table,
					label: Y("follow:feedSources.selectPage"),
					page: !0
				}),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)(f, {
					slot: null,
					isSelected: e.row.getIsSelected(),
					onChange: (t) => e.row.toggleSelected(t),
					"aria-label": Y("follow:shared.selectNamed", { name: Q(e.row.original) })
				})
			}),
			e.accessor(Q, {
				id: "name",
				header: t("name"),
				cell: (e) => {
					let t = dr(e.row.original, R.current.shared);
					return /* @__PURE__ */ (0, Z.jsxs)("span", {
						className: "flex items-center gap-2 whitespace-nowrap text-body-medium text-text-primary",
						children: [
							/* @__PURE__ */ (0, Z.jsx)(ur, { source: e.row.original }),
							e.getValue(),
							t ? /* @__PURE__ */ (0, Z.jsx)(_n, { name: t }) : null
						]
					});
				}
			}),
			e.accessor((e) => He(e, "kind_label"), {
				id: "kind",
				header: t("kind"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)("span", {
					className: "whitespace-nowrap",
					children: e.getValue()
				})
			}),
			e.accessor((e) => e.url, {
				id: "origin",
				header: t("origin"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsxs)("a", {
					href: e.getValue(),
					target: "_blank",
					rel: "noopener noreferrer",
					title: Y("follow:followDetail.viewOnSite"),
					className: "max-w-full text-text-primary underline-offset-2 hover:underline",
					children: [/* @__PURE__ */ (0, Z.jsx)(ge, {
						site: sr(e.row.original),
						label: cr(e.getValue())
					}), /* @__PURE__ */ (0, Z.jsx)(V, {
						"aria-hidden": !0,
						className: "size-(--icon-inline) shrink-0"
					})]
				})
			}),
			e.accessor((e) => e.last_error ? Y("follow:feedSources.fetchFailed") : e.enabled ? Y("follow:shared.enabled") : Y("follow:shared.paused"), {
				id: "status",
				header: t("status"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)(lr, { source: e.row.original })
			}),
			e.accessor((e) => e.interval_minutes, {
				id: "interval",
				header: t("interval"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)("span", {
					className: "whitespace-nowrap",
					children: nt(e.getValue())
				})
			}),
			e.accessor((e) => e.last_fetched_at && Date.parse(e.last_fetched_at) || 0, {
				id: "fetched",
				header: t("fetched"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)("span", {
					className: "whitespace-nowrap tabular-nums",
					children: e.row.original.last_fetched_at ? gt(e.row.original.last_fetched_at) : Y("follow:feedSources.neverFetched")
				})
			}),
			e.accessor((e) => e.last_new_count, {
				id: "fresh",
				header: t("fresh"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)("span", {
					className: "whitespace-nowrap tabular-nums",
					children: Y("follow:feedSources.itemCount", { count: e.getValue() })
				})
			}),
			e.display({
				id: "actions",
				header: t("actions"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsxs)("span", {
					className: "flex items-center gap-1",
					children: [
						/* @__PURE__ */ (0, Z.jsx)(ye, {
							"aria-label": Y("follow:shared.enableNamed", { name: Q(e.row.original) }),
							isSelected: e.row.original.enabled,
							isDisabled: R.current.readOnly,
							onChange: (t) => R.current.toggle(e.row.original, t)
						}),
						/* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							size: "small",
							iconOnly: !0,
							leadingIcon: Xe,
							"aria-label": Y("follow:feedSources.fetchNamed", { name: Q(e.row.original) }),
							disabled: R.current.readOnly,
							...U(R.current.busy === `check-${e.row.original.id}`),
							onClick: () => R.current.fetch(e.row.original)
						}),
						/* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							size: "small",
							iconOnly: !0,
							leadingIcon: le,
							"aria-label": Y("follow:shared.removeNamed", { name: Q(e.row.original) }),
							disabled: R.current.readOnly,
							onClick: () => R.current.remove(e.row.original)
						})
					]
				})
			})
		]);
	}, []), z = (0, X.useMemo)(() => Object.fromEntries([...y].map((e) => [String(e), !0])), [y]), fe = cn({
		features: rr,
		data: O.items,
		columns: de,
		getRowId: (e) => String(e.id),
		state: {
			rowSelection: z,
			sorting: T,
			pagination: {
				pageIndex: j.page - 1,
				pageSize: re
			},
			columnOrder: d.columnOrder,
			columnVisibility: d.visibility
		},
		onColumnVisibilityChange: d.change,
		onSortingChange: (e) => {
			E(e), w(1);
		},
		enableRowSelection: !0,
		onRowSelectionChange: (e) => {
			let t = typeof e == "function" ? e(z) : e, n = new Set(Object.entries(t).filter(([, e]) => e).map(([e]) => Number(e)));
			n.size && s?.onActivate(), S(n);
		}
	}), pe = () => void u.run("check", (e) => Le(e), () => void or()), he = (e) => {
		s?.onActivate(), S((t) => {
			let n = new Set(t);
			return n.has(e) ? n.delete(e) : n.add(e), n;
		});
	}, _e = h.filter((e) => y.has(e.id)), ve = h.filter((e) => e.last_error), we = sn((e) => h.find((t) => String(t.id) === e), (t) => {
		let n = [{
			id: "select",
			label: Y(y.has(t.id) ? "follow:shared.clearSelection" : "follow:shared.selectNamed", { name: Q(t) }),
			icon: A,
			run: () => he(t.id)
		}];
		return t.url && n.unshift({
			id: "open",
			label: Y("follow:sourceView.openSource"),
			icon: V,
			run: () => {
				window.open(t.url, "_blank", "noopener,noreferrer");
			}
		}), e || n.push({
			id: "fetch",
			label: Y("follow:feedSources.fetchNamed", { name: Q(t) }),
			icon: Xe,
			disabled: !!u.busy,
			run: () => R.current.fetch(t)
		}, {
			id: "enabled",
			label: Y(t.enabled ? "follow:shared.pause" : "follow:shared.enable"),
			icon: t.enabled ? ue : k,
			disabled: !!u.busy,
			run: () => R.current.toggle(t, !t.enabled)
		}, {
			id: "remove",
			label: Y("follow:shared.removeNamed", { name: Q(t) }),
			icon: le,
			danger: !0,
			run: () => R.current.remove(t)
		}), n;
	});
	return m ? /* @__PURE__ */ (0, Z.jsx)("div", {
		className: "flex flex-col gap-3",
		children: /* @__PURE__ */ (0, Z.jsxs)("section", {
			"aria-label": Y("follow:feedSources.listLabel"),
			className: Pe({
				padding: "none",
				className: "flex flex-col gap-4 px-6 py-5 max-sm:px-4"
			}),
			onKeyDown: we.onKeyDown,
			children: [
				we.menu,
				/* @__PURE__ */ (0, Z.jsxs)("div", {
					"data-responsive-toolbar": "",
					children: [/* @__PURE__ */ (0, Z.jsxs)("div", {
						"data-toolbar-heading": "",
						children: [/* @__PURE__ */ (0, Z.jsx)("h3", {
							className: "text-title-2-medium text-text-primary",
							children: Y("follow:feedSources.title")
						}), /* @__PURE__ */ (0, Z.jsx)("span", {
							className: "text-body-2-regular text-text-secondary",
							children: Y("follow:feedSources.summary", {
								count: h.length,
								unread: Number(m.unread) || 0
							})
						})]
					}), /* @__PURE__ */ (0, Z.jsxs)("div", {
						"data-toolbar-actions": "",
						children: [
							/* @__PURE__ */ (0, Z.jsx)(M, {
								label: Y("follow:feedSources.search"),
								value: ae,
								onQuery: (e) => {
									oe(e), w(1);
								}
							}),
							/* @__PURE__ */ (0, Z.jsx)(c, {
								onClick: pe,
								disabled: e,
								...U(u.busy === "check"),
								children: Y("follow:feedSources.fetchNow")
							}),
							/* @__PURE__ */ (0, Z.jsx)(xe, {
								preferences: d,
								label: Y("follow:feedSources.title")
							}),
							/* @__PURE__ */ (0, Z.jsx)(x, {
								label: Y("follow:feedSources.title"),
								sorting: T,
								onChange: (e) => {
									E(e), w(1);
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
									label: ir[e]
								}))
							})
						]
					})]
				}),
				ve.length || u.error ? /* @__PURE__ */ (0, Z.jsxs)("div", {
					className: "flex flex-col gap-3",
					children: [ve.length ? /* @__PURE__ */ (0, Z.jsx)(I, {
						tone: "error",
						title: Y("follow:feedSources.failedTitle", { count: ve.length }),
						extra: /* @__PURE__ */ (0, Z.jsx)("ul", {
							className: "flex flex-col gap-0.5 text-body-2-regular",
							children: ve.map((e) => /* @__PURE__ */ (0, Z.jsx)("li", {
								className: "min-w-0 truncate",
								title: He(e, "last_error"),
								children: Y("follow:shared.labeled", {
									label: Q(e),
									value: et(He(e, "last_error")) || Y("follow:shared.noReason")
								})
							}, e.id))
						}),
						children: Y("follow:feedSources.failedBody")
					}) : null, u.error ? /* @__PURE__ */ (0, Z.jsx)(C, { children: u.error }) : null]
				}) : null,
				/* @__PURE__ */ (0, Z.jsx)(me, {
					visible: _e.length > 0,
					label: Y("follow:feedSources.bulkActions"),
					count: Y("follow:feedSources.selectedCount", { count: _e.length }),
					actions: [
						ce(!0),
						ce(!1),
						P
					].map((t) => ({
						action: t,
						items: _e,
						host: se,
						disabled: e || N.isPending
					})),
					children: /* @__PURE__ */ (0, Z.jsx)(c, {
						variant: "ghost",
						size: "small",
						onClick: tt,
						children: Y("follow:shared.clearSelection")
					})
				}),
				h.length ? /* @__PURE__ */ (0, Z.jsx)(ee, {
					ref: L,
					follow: !0,
					preferences: d,
					onRowClick: (e) => he(Number(e)),
					rectangleSelecting: y.size > 0,
					onRectangle: N.isPending ? void 0 : (e, t) => fe.setRowSelection({
						...t ? z : {},
						...Object.fromEntries(e.map((e) => [e, !0]))
					}),
					children: /* @__PURE__ */ (0, Z.jsxs)(be, {
						"aria-label": Y("follow:feedSources.title"),
						size: "sm",
						sortDescriptor: T[0] ? {
							column: T[0].id,
							direction: T[0].desc ? "descending" : "ascending"
						} : void 0,
						onSortChange: (e) => fe.getColumn(String(e.column))?.toggleSorting(e.direction === "descending"),
						children: [/* @__PURE__ */ (0, Z.jsxs)(a, { children: [fe.getHeaderGroups()[0].headers.map((e) => {
							let t = ct(e.column.columnDef.header, e.getContext());
							return /* @__PURE__ */ (0, Z.jsx)(n, {
								id: e.id,
								isRowHeader: e.column.id === "name",
								allowsSorting: e.column.getCanSort(),
								...d.columnProps(e.id),
								children: ({ sortDirection: n }) => /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [/* @__PURE__ */ (0, Z.jsxs)("span", {
									className: "flex items-center gap-0.5",
									children: [O.header(e.id, ir[e.id] || e.id) ?? t, e.column.getCanSort() ? /* @__PURE__ */ (0, Z.jsx)("span", {
										"data-sort-indicator": !0,
										"data-direction": n || void 0,
										children: /* @__PURE__ */ (0, Z.jsx)(p, {})
									}) : null]
								}), /* @__PURE__ */ (0, Z.jsx)(Se, {
									preferences: d,
									id: e.id
								})] })
							}, e.id);
						}), /* @__PURE__ */ (0, Z.jsx)(n, {
							id: "remaining-space",
							"aria-label": Y("follow:shared.rowSpacer"),
							"data-table-space": "",
							width: d.spaceWidth,
							minWidth: 0
						})] }), /* @__PURE__ */ (0, Z.jsx)(t, {
							renderEmptyState: () => Y("shell:dataTable.empty"),
							children: fe.getRowModel().rows.map((e) => /* @__PURE__ */ (0, Z.jsxs)(r, {
								id: e.id,
								"data-follow-selected": e.getIsSelected() || void 0,
								"data-work-context-row": e.id,
								onContextMenu: (t) => we.onContextMenu?.(t, e.original, e.id),
								children: [e.getVisibleCells().map((e) => /* @__PURE__ */ (0, Z.jsx)(i, { children: ct(e.column.columnDef.cell, e.getContext()) }, e.id)), /* @__PURE__ */ (0, Z.jsx)(i, { "data-table-space": "" })]
							}, e.id))
						})]
					})
				}) : null,
				h.length ? /* @__PURE__ */ (0, Z.jsx)(b, {
					label: Y("follow:feedSources.footerLabel"),
					total: j.total,
					unit: Y("follow:feedSources.unit"),
					pagination: {
						pageIndex: j.page - 1,
						pageSize: re
					},
					scrollTarget: L,
					onChange: (e) => {
						ie(e.pageSize), w(e.pageIndex + 1);
					}
				}) : null,
				/* @__PURE__ */ (0, Z.jsx)("footer", {
					className: "-mx-6 -mb-5 flex flex-wrap items-center gap-2 border-t border-separator-border rounded-b-2xl bg-card-footer px-6 py-4 max-sm:-mx-4 max-sm:px-4",
					children: /* @__PURE__ */ (0, Z.jsx)("span", {
						role: "status",
						className: "mr-auto text-body-2-regular text-text-secondary",
						children: Y("follow:feedSources.footerSummary", {
							unread: Number(m.unread) || 0,
							enabled: h.filter((e) => e.enabled).length,
							total: h.length
						})
					})
				})
			]
		})
	}) : l.error ? /* @__PURE__ */ (0, Z.jsx)(I, {
		tone: "error",
		title: Y("follow:feedSources.loadFailed"),
		children: W(l.error)
	}) : /* @__PURE__ */ (0, Z.jsx)("div", { dangerouslySetInnerHTML: { __html: Vt(Y("follow:feedSources.loading"), { fill: !1 }) } });
}
// src/react/follow-manage/source-list.tsx
var hr = qt({
	rowPaginationFeature: Mt,
	rowSelectionFeature: Nt,
	rowSortingFeature: Ft,
	columnVisibilityFeature: We,
	columnOrderingFeature: Ue,
	paginatedRowModel: qe()
}), gr = Object.fromEntries(Object.entries(d).map(([e, t]) => [t, e])), _r = 740;
function vr() {
	let [e, t] = (0, X.useState)(!1), n = (0, X.useRef)(null), r = (0, X.useCallback)((e) => {
		if (n.current?.disconnect(), !e) {
			n.current = null;
			return;
		}
		let r = new ResizeObserver(() => t(e.clientWidth < _r));
		r.observe(e), n.current = r, t(e.clientWidth < _r);
	}, []);
	return (0, X.useEffect)(() => () => n.current?.disconnect(), []), [r, e];
}
var yr = {
	select: Y("follow:shared.select"),
	author: Y("follow:shared.creator"),
	source: Y("follow:followFeed.filterKindSource"),
	provider: Y("follow:shared.site"),
	status: Y("follow:shared.status"),
	checked: Y("follow:sourceList.colLastChecked"),
	actions: Y("follow:shared.actions")
}, br = Object.entries(yr).map(([e, t]) => ({
	id: e,
	label: t,
	width: e === "select" ? 48 : e === "source" ? 320 : e === "author" ? 240 : e === "actions" ? 208 : 184,
	min: e === "select" ? 48 : e === "actions" ? 200 : e === "source" ? 320 : 112,
	max: e === "select" ? 48 : e === "source" ? 2e3 : 800,
	flex: e === "source",
	required: e === "select" || e === "source"
})), xr = "timestamp", Sr = Object.entries(yr).map(([e, t]) => ({
	id: e,
	label: t,
	range: e === "checked" ? xr : void 0
}));
function Cr(e, t, n, r) {
	let i = [{
		id: "select",
		label: Y(t ? "follow:shared.clearSelection" : "follow:shared.selectNamed", { name: e.label }),
		icon: ht,
		run: () => n(!t)
	}];
	return e.url && i.unshift({
		id: "open",
		label: Y("follow:sourceView.openSource"),
		icon: V,
		run: () => {
			window.open(e.url, "_blank", "noopener,noreferrer");
		}
	}), r.readOnly || i.push({
		id: "check",
		label: Y("follow:sourceList.checkNamed", { name: e.label }),
		icon: Xe,
		disabled: !e.enabled || r.busy,
		run: () => r.check([e.id])
	}, {
		id: "enabled",
		label: Y(e.enabled ? "follow:shared.pause" : "follow:shared.enable"),
		icon: e.enabled ? ue : k,
		run: () => r.toggle(e, !e.enabled)
	}, {
		id: "remove",
		label: Y("follow:sourceList.unfollow"),
		icon: le,
		danger: !0,
		run: () => r.remove(e)
	}), i;
}
function wr({ source: e, selected: t, onToggle: n, handlers: r }) {
	let i = fn(), a = () => ({
		key: e.id,
		operations: Cr(e, t, n, r)
	});
	return /* @__PURE__ */ (0, Z.jsxs)("div", {
		"data-selected": t || void 0,
		"data-follow-source-row": "",
		"data-rectangle-key": e.id,
		className: "flex min-h-16 flex-wrap items-center gap-3 px-2 py-3 last:rounded-b-lg max-sm:gap-x-2",
		onContextMenu: (e) => i.onContextMenu(e, a()),
		onKeyDown: (e) => {
			(e.key === "ContextMenu" || e.shiftKey && e.key === "F10") && i.onKeyDown(e, a());
		},
		onClick: (e) => {
			Ve(e, e.currentTarget) && n(!t);
		},
		children: [
			i.menu,
			/* @__PURE__ */ (0, Z.jsx)(f, {
				isSelected: t,
				onChange: n,
				"aria-label": Y("follow:shared.selectNamed", { name: e.label })
			}),
			/* @__PURE__ */ (0, Z.jsxs)("span", {
				className: "flex min-w-0 grow basis-0 items-center gap-1.5",
				children: [/* @__PURE__ */ (0, Z.jsx)("span", {
					"data-follow-source-site": "",
					className: "flex shrink-0 items-center text-body-medium",
					children: /* @__PURE__ */ (0, Z.jsx)(vn, { provider: e.provider })
				}), /* @__PURE__ */ (0, Z.jsx)(yn, { source: e })]
			}),
			/* @__PURE__ */ (0, Z.jsx)(o, { children: e.provider_label }),
			/* @__PURE__ */ (0, Z.jsx)(bn, { source: e }),
			e.last_error ? /* @__PURE__ */ (0, Z.jsxs)("span", {
				"data-follow-source-error": "",
				className: "flex min-w-0 basis-full gap-3 max-sm:gap-x-2 sm:order-last",
				children: [/* @__PURE__ */ (0, Z.jsx)("span", {
					"aria-hidden": !0,
					className: "w-4 shrink-0"
				}), /* @__PURE__ */ (0, Z.jsxs)("span", {
					className: "flex min-w-0 grow gap-1.5",
					children: [/* @__PURE__ */ (0, Z.jsx)("span", {
						"aria-hidden": !0,
						className: "w-(--icon-inline) shrink-0 text-body-medium"
					}), /* @__PURE__ */ (0, Z.jsx)("span", {
						className: "min-w-0 grow",
						children: /* @__PURE__ */ (0, Z.jsx)(gn, { text: He(e, "last_error") })
					})]
				})]
			}) : null,
			/* @__PURE__ */ (0, Z.jsxs)("span", {
				"data-follow-source-controls": "",
				className: "flex w-max max-w-full flex-none flex-wrap items-center gap-1.5 max-sm:w-full",
				children: [
					/* @__PURE__ */ (0, Z.jsx)("span", {
						className: "shrink-0 text-body-2-regular whitespace-nowrap text-text-secondary max-sm:mr-auto max-sm:text-caption-1-regular",
						children: Be(e)
					}),
					/* @__PURE__ */ (0, Z.jsx)(ye, {
						"aria-label": Y("follow:shared.enableNamed", { name: e.label }),
						isSelected: e.enabled,
						isDisabled: r.readOnly,
						onChange: (t) => r.toggle(e, t)
					}),
					/* @__PURE__ */ (0, Z.jsxs)("span", {
						className: "flex shrink-0 items-center gap-1",
						children: [/* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							size: "small",
							iconOnly: !0,
							leadingIcon: Xe,
							"aria-label": Y("follow:sourceList.checkNamed", { name: e.label }),
							disabled: !e.enabled || r.readOnly,
							...U(r.busy),
							onClick: () => r.check([e.id])
						}), /* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							size: "small",
							iconOnly: !0,
							leadingIcon: le,
							"aria-label": Y("follow:shared.removeNamed", { name: e.label }),
							disabled: r.readOnly,
							onClick: () => r.remove(e)
						})]
					})
				]
			})
		]
	});
}
function Tr({ group: e, name: t, open: n, selected: r, handlers: i, onOpen: a, onToggleGroup: s, onToggle: l }) {
	let u = e.map((e) => e.id), d = e.filter((e) => e.enabled).map((e) => e.id), f = e.filter(ft).length, p = q([...new Set(e.map((e) => e.provider_label || e.provider))]), m = `follow-author-${e[0].id}`, _ = Lt(r, u);
	return /* @__PURE__ */ (0, Z.jsxs)("section", {
		"aria-label": Y("follow:sourceList.groupLabel", { name: t }),
		className: Pe({
			variant: "raised",
			padding: "none",
			className: "flex flex-col overflow-hidden p-2"
		}),
		children: [/* @__PURE__ */ (0, Z.jsxs)("div", {
			"data-follow-author-header": !0,
			"data-open": n || void 0,
			className: "flex flex-wrap items-center gap-3 px-2 py-2.5",
			children: [
				/* @__PURE__ */ (0, Z.jsx)(hn, {
					group: e,
					name: t
				}),
				/* @__PURE__ */ (0, Z.jsxs)("span", {
					className: "flex min-w-0 grow basis-0 flex-col gap-1",
					children: [/* @__PURE__ */ (0, Z.jsx)("b", {
						className: "min-w-0 text-body-medium wrap-anywhere text-text-primary",
						children: t
					}), /* @__PURE__ */ (0, Z.jsxs)("span", {
						"data-follow-author-sites": "",
						className: "flex min-w-0 flex-wrap items-center gap-1 text-body-2-regular",
						title: p,
						children: [
							e.map((e) => /* @__PURE__ */ (0, Z.jsx)(vn, { provider: e.provider }, e.id)),
							/* @__PURE__ */ (0, Z.jsx)(o, { children: Y("follow:sourceList.providers", { providers: p }) }),
							f ? /* @__PURE__ */ (0, Z.jsx)("span", {
								className: "ml-1 shrink-0 text-text-error-primary",
								children: Y("follow:shared.failedCount", { count: f })
							}) : null
						]
					})]
				}),
				/* @__PURE__ */ (0, Z.jsxs)("span", {
					"data-follow-author-controls": "",
					className: "flex flex-none items-center gap-2 max-sm:w-full max-sm:justify-end",
					children: [/* @__PURE__ */ (0, Z.jsx)(c, {
						variant: "secondary",
						size: "small",
						iconOnly: !0,
						leadingIcon: Xe,
						"aria-label": Y("follow:sourceList.checkGroup", { name: t }),
						disabled: !d.length || i.readOnly,
						...U(i.busy),
						onClick: () => i.check(d)
					}), /* @__PURE__ */ (0, Z.jsxs)("span", {
						className: "flex flex-none items-center gap-2",
						children: [/* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							size: "small",
							leadingIcon: ht,
							"aria-pressed": _.all ? "true" : _.some ? "mixed" : "false",
							"aria-label": Y(_.all ? "follow:sourceList.deselectGroup" : "follow:sourceList.selectGroup", { name: t }),
							onClick: () => s(!_.all),
							children: _.all ? Y("follow:shared.deselectAll") : Y("follow:shared.selectAll")
						}), /* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							size: "small",
							"aria-expanded": n,
							"aria-controls": m,
							leadingIcon: h,
							"aria-label": Y(n ? "follow:sourceList.collapseGroup" : "follow:sourceList.expandGroup", { name: t }),
							onClick: () => a(!n),
							children: Y(n ? "follow:shared.collapse" : "follow:shared.expand")
						})]
					})]
				})
			]
		}), /* @__PURE__ */ (0, Z.jsx)(g, {
			id: m,
			open: n,
			"data-source-divider": !0,
			children: e.map((e) => /* @__PURE__ */ (0, Z.jsx)(wr, {
				source: e,
				handlers: i,
				selected: r.has(e.id),
				onToggle: (t) => l(e.id, t)
			}, e.id))
		})]
	});
}
function Er(e) {
	let { data: o, sort: s, dir: l, page: m, layout: g, pageSize: _, selected: y, readOnly: x, onSort: S, onPage: C, onLayout: w, onPageSize: ne, onSelected: T, toast: E, openFollow: ae } = e, oe = (e, t) => T(/* @__PURE__ */ new Set([...t ? y : [], ...e.map(Number)])), D = rn(oe, {
		selecting: e.selecting,
		start: "[data-source-divider]"
	}), O = o.sources, k = (0, X.useMemo)(() => o.author_aliases || [], [o.author_aliases]), A = o.counts || {}, [j, N] = (0, X.useState)(/* @__PURE__ */ new Set()), ce = (0, X.useRef)(null), [P, F] = vr(), [ue, L] = (0, X.useState)(""), z = (0, X.useMemo)(() => je(O, s, l, k), [
		O,
		s,
		l,
		k
	]), he = (0, X.useMemo)(() => Jt(z, s, l, k), [
		z,
		s,
		l,
		k
	]), [B, ge] = (0, X.useState)(""), ve = (0, X.useMemo)(() => {
		let e = B.toLocaleLowerCase();
		return e ? he.filter((t) => [
			t.author,
			t.source.label,
			t.source.provider_label,
			t.source.url || ""
		].join(" ").toLocaleLowerCase().includes(e)) : he;
	}, [he, B]), V = ln(ve, {
		author: {
			values: (e) => e.author,
			option: (e, t) => ({ leading: t && /* @__PURE__ */ (0, Z.jsx)(hn, {
				group: t.group,
				name: e,
				small: !0
			}) })
		},
		source: {
			values: (e) => e.source.label,
			option: (e, t) => ({ leading: t && /* @__PURE__ */ (0, Z.jsx)(vn, { provider: t.source.provider }) })
		},
		provider: {
			values: (e) => e.source.provider_label,
			option: (e, t) => ({ leading: t && /* @__PURE__ */ (0, Z.jsx)(vn, { provider: t.source.provider }) })
		},
		status: { values: (e) => Gt(e.source) },
		checked: {
			range: xr,
			value: (e) => e.source.last_checked_at ? pn(e.source.last_checked_at).getTime() / 1e3 : null
		}
	}, () => C(1)), Ee = (0, X.useMemo)(() => {
		let e = new Set(V.items.map((e) => e.source.id));
		return z.flatMap((t) => {
			let n = t.filter((t) => e.has(t.id));
			return n.length ? [{
				key: String(t[0].author_key || t[0].id),
				name: Me(t, k),
				sources: n
			}] : [];
		});
	}, [
		k,
		V.items,
		z
	]), { job: H, running: Oe, outcome: ke, start: Ae } = $t({
		queryKey: re,
		taskKey: ie,
		queryFn: ({ signal: e }) => rt(e),
		start: (e) => Ut(e),
		onError: (e) => L(W(e)),
		onFinish: (e) => {
			J(), E(e.status === "failed" ? pt(e, "error") || Y("follow:followCheck.checkFailed") : Re(e));
		}
	}), Ne = (e) => {
		Oe || Ae.isPending || (L(""), Ae.mutate(e));
	}, Le = (e, t) => T(Xt(y, [e], t)), Ve = (e, t) => T(Xt(y, e, t)), Ue = en({
		mutationFn: (e) => Dt(e),
		onSuccess: (e, t) => {
			Ze([t]), T(Xt(y, [t], !1)), E(Y("follow:sourceList.unfollowed"));
		},
		onError: (e) => L(W(e))
	}), We = en({
		mutationFn: (e) => Bt(e.id, e.enabled),
		onSuccess: (e, t) => {
			St(t.id, { enabled: t.enabled }), L("");
		},
		onError: (e) => L(W(e))
	}), qe = (e) => void Ge({
		title: Y("follow:sourceList.unfollow"),
		body: Y("follow:sourceList.unfollowBody"),
		confirmLabel: Y("follow:sourceList.unfollow"),
		danger: !0,
		holdToConfirm: !0,
		onConfirm: () => Ue.mutateAsync(e.id)
	}), Je = en({
		mutationFn: async (e) => {
			let t = await vt(e.ids, 4, async (t) => {
				e.action === "remove" ? await Dt(t) : await Bt(t, e.action === "enabled");
			});
			return {
				...e,
				done: e.ids.filter((e, n) => t[n]?.ok),
				results: t
			};
		},
		onSuccess: (e) => {
			if (e.action === "remove") Ze(e.done);
			else for (let t of e.done) St(t, { enabled: e.action === "enabled" });
			T(Xt(y, e.done, !1));
			let t = e.results.filter((e) => !e.ok);
			t.length ? L(Y("follow:sourceList.bulkPartialFail", {
				failed: t.length,
				total: e.ids.length,
				error: W(t[0]?.error)
			})) : L("");
		},
		onError: (e) => L(W(e))
	}), Ye = en({
		mutationFn: yt,
		onSuccess: (e) => {
			J(), e.failed ? L(Y("follow:sourceList.bulkMarkFailed", {
				failed: e.failed,
				total: e.total,
				error: W(e.error)
			})) : L("");
		},
		onError: (e) => L(W(e))
	}), $e = {
		receipt: E,
		failure: (e) => L(W(e))
	}, nt = (e) => ({
		key: e ? "enable" : "pause",
		label: Y(e ? "follow:shared.enable" : "follow:shared.pause"),
		reversal: "undo",
		confirm: (t) => ({
			title: Y(e ? "follow:sourceList.enableMany" : "follow:sourceList.pauseMany"),
			body: Y(e ? "follow:sourceList.enableManyBody" : "follow:sourceList.pauseManyBody", { count: t.length })
		}),
		run: async (t) => {
			let n = t.filter((t) => O.find((e) => e.id === t)?.enabled !== e), { done: r } = await Je.mutateAsync({
				ids: n,
				action: e ? "enabled" : "paused"
			});
			return async () => {
				await vt(r, 4, (t) => Bt(t, !e));
				for (let t of r) St(t, { enabled: !e });
			};
		},
		receipt: (t) => Y(e ? "follow:sourceList.bulkEnabled" : "follow:sourceList.bulkPaused", { count: t.length })
	}), it = {
		key: "delete",
		label: Y("follow:shared.delete"),
		reversal: "irreversible",
		danger: !0,
		holdToConfirm: !0,
		confirm: (e) => ({
			title: Y("follow:sourceList.deleteManyTitle", { count: e.length }),
			danger: !0,
			body: Y("follow:sourceList.deleteManyBody"),
			confirmLabel: Y("follow:sourceList.deleteSelected")
		}),
		run: async (e) => {
			await Je.mutateAsync({
				ids: [...e],
				action: "remove"
			});
		},
		receipt: (e) => Y("follow:sourceList.bulkDeleted", { count: e.length })
	}, at = (e) => {
		let t = [];
		return {
			key: `mark-${e}`,
			label: Y(e === "seen" ? "follow:sourceList.markAllWatched" : "follow:sourceList.ignoreAll"),
			reversal: "undo",
			confirm: ([t]) => e === "seen" ? {
				title: Y("follow:followDetail.markSeen"),
				body: Y("follow:sourceList.markWatchedBody", { count: t })
			} : {
				title: Y("follow:sourceList.markIgnored"),
				body: Y("follow:sourceList.markIgnoredBody", { count: t }),
				recovery: Y("shell:batchFollow.ignoreRecovery")
			},
			run: async () => (t = (await Ye.mutateAsync(e)).marked, async () => {
				await Zt(t), await J();
			}),
			receipt: () => Y("follow:sourceList.bulkMarked", { count: t.length })
		};
	}, ot = (e, t) => We.mutate({
		id: e.id,
		enabled: t
	}), st = (0, X.useRef)({
		check: Ne,
		toggle: ot,
		remove: qe,
		busy: !1,
		readOnly: x
	});
	st.current = {
		check: Ne,
		toggle: ot,
		remove: qe,
		busy: Oe || Ae.isPending,
		readOnly: x
	};
	let G = st.current, lt = sn((e) => O.find((t) => String(t.id) === e), (e) => Cr(e, y.has(e.id), (t) => Le(e.id, t), G)), ut = (0, X.useMemo)(() => {
		let e = Ke(), t = (e) => () => yr[e] || e;
		return e.columns([
			e.display({
				id: "select",
				header: (e) => /* @__PURE__ */ (0, Z.jsx)(Ce, {
					table: e.table,
					label: Y("follow:sourceList.selectPage"),
					page: !0
				}),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)(f, {
					slot: null,
					isSelected: e.row.getIsSelected(),
					onChange: (t) => e.row.toggleSelected(t),
					"aria-label": Y("follow:shared.selectNamed", { name: e.row.original.source.label })
				})
			}),
			e.accessor((e) => e.author, {
				id: "author",
				header: t("author"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsxs)("span", {
					className: "flex min-w-0 items-center gap-2",
					children: [/* @__PURE__ */ (0, Z.jsx)(hn, {
						group: e.row.original.group,
						name: e.row.original.author
					}), /* @__PURE__ */ (0, Z.jsx)("span", {
						className: "min-w-0 break-words",
						children: e.row.original.author
					})]
				})
			}),
			e.accessor((e) => e.source.label, {
				id: "source",
				header: t("source"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsxs)("span", {
					className: "flex min-w-0 flex-col gap-0.5",
					children: [/* @__PURE__ */ (0, Z.jsx)(yn, { source: e.row.original.source }), e.row.original.source.last_error ? /* @__PURE__ */ (0, Z.jsx)(gn, { text: He(e.row.original.source, "last_error") }) : null]
				})
			}),
			e.accessor((e) => e.source.provider_label, {
				id: "provider",
				header: t("provider"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsxs)("span", {
					className: "flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, Z.jsx)(vn, { provider: e.row.original.source.provider }), e.row.original.source.provider_label]
				})
			}),
			e.display({
				id: "status",
				header: t("status"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsx)(bn, { source: e.row.original.source })
			}),
			e.accessor((e) => e.source.last_checked_at || "", {
				id: "checked",
				header: t("checked"),
				cell: (e) => Be(e.row.original.source)
			}),
			e.display({
				id: "actions",
				header: t("actions"),
				cell: (e) => /* @__PURE__ */ (0, Z.jsxs)("span", {
					className: "flex items-center gap-1",
					children: [
						/* @__PURE__ */ (0, Z.jsx)(ye, {
							"aria-label": Y("follow:shared.enableNamed", { name: e.row.original.source.label }),
							isSelected: e.row.original.source.enabled,
							isDisabled: G.readOnly,
							onChange: (t) => st.current.toggle(e.row.original.source, t)
						}),
						/* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							size: "small",
							iconOnly: !0,
							leadingIcon: Xe,
							"aria-label": Y("follow:sourceList.checkNamed", { name: e.row.original.source.label }),
							disabled: !e.row.original.source.enabled || G.readOnly,
							...U(G.busy),
							onClick: () => st.current.check([e.row.original.source.id])
						}),
						/* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							size: "small",
							iconOnly: !0,
							leadingIcon: le,
							"aria-label": Y("follow:shared.removeNamed", { name: e.row.original.source.label }),
							disabled: G.readOnly,
							onClick: () => st.current.remove(e.row.original.source)
						})
					]
				})
			})
		]);
	}, [G]), dt = (0, X.useMemo)(() => {
		let e = gr[s];
		return e ? [{
			id: e,
			desc: l === "desc"
		}] : [];
	}, [s, l]), ft = (0, X.useMemo)(() => Object.fromEntries([...y].map((e) => [String(e), !0])), [y]), K = g === "table", q = un("follow-sources", br), mt = xt(K ? V.items.length : Ee.length, _, m), ht = cn({
		features: hr,
		data: V.items,
		columns: ut,
		getRowId: (e) => String(e.source.id),
		state: {
			sorting: dt,
			rowSelection: ft,
			pagination: {
				pageIndex: mt.page - 1,
				pageSize: _
			},
			columnOrder: q.columnOrder,
			columnVisibility: q.visibility
		},
		onColumnVisibilityChange: q.change,
		manualSorting: !0,
		enableRowSelection: !0,
		onSortingChange: (e) => {
			let t = (typeof e == "function" ? e(dt) : e)[0];
			if (!t) return;
			let n = d[t.id];
			n && S(n, t.desc ? "desc" : "asc");
		},
		onRowSelectionChange: (e) => {
			let t = typeof e == "function" ? e(ft) : e;
			T(new Set(Object.entries(t).filter(([, e]) => e).map(([e]) => Number(e))));
		},
		onPaginationChange: (e) => {
			let t = {
				pageIndex: mt.page - 1,
				pageSize: _
			}, n = typeof e == "function" ? e(t) : e;
			n.pageSize === _ ? n.pageIndex !== t.pageIndex && C(n.pageIndex + 1) : ne(n.pageSize);
		}
	}), gt = ht.getRowModel().rows, _t = K ? gt.map((e) => e.original.source.id) : Ee.slice(mt.start, mt.end).flatMap(({ sources: e }) => e.map((e) => e.id)), bt = Lt(y, _t), Ct = [...y], wt = Ie(ke), Tt = O.filter((e) => e.enabled && (e.last_status === "error" || e.last_status === "unauthorized")).map((e) => e.id), Et = Fe(ke), Ot = Ee.length > 0 && Ee.every(({ key: e }) => j.has(e));
	return /* @__PURE__ */ (0, Z.jsxs)("div", {
		className: Pe({
			padding: "none",
			className: "flex flex-col gap-4 px-6 py-5 max-sm:px-4"
		}),
		onKeyDown: lt.onKeyDown,
		children: [
			lt.menu,
			/* @__PURE__ */ (0, Z.jsxs)("div", {
				ref: P,
				"data-follow-toolbar": "",
				"data-responsive-toolbar": "",
				children: [/* @__PURE__ */ (0, Z.jsxs)("span", {
					"data-follow-toolbar-heading": "",
					"data-toolbar-heading": "",
					children: [/* @__PURE__ */ (0, Z.jsx)("h3", {
						className: "text-title-2-medium text-text-primary",
						children: Y("follow:followManageNav.list")
					}), /* @__PURE__ */ (0, Z.jsx)("span", {
						className: "text-body-2-regular text-text-secondary",
						children: A.new ? Y("follow:sourceList.sourceCountUnseen", {
							count: O.length,
							unseen: Number(A.new) || 0
						}) : Y("follow:sourceList.sourceCount", { count: O.length })
					})]
				}), /* @__PURE__ */ (0, Z.jsxs)("div", {
					"data-follow-toolbar-actions": "",
					"data-toolbar-actions": "",
					children: [
						/* @__PURE__ */ (0, Z.jsx)(M, {
							label: Y("follow:sourceList.search"),
							value: B,
							onQuery: (e) => {
								ge(e), C(1);
							}
						}),
						Tt.length ? /* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							disabled: x,
							...U(G.busy),
							onClick: () => Ne(Tt),
							children: Y("follow:sourceList.checkFailed")
						}) : null,
						/* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "primary",
							leadingIcon: Xe,
							disabled: x,
							"aria-label": Y("follow:sourceList.checkAll"),
							iconOnly: F,
							...U(G.busy),
							onClick: () => Ne([]),
							children: Y("follow:sourceList.checkAll")
						}),
						/* @__PURE__ */ (0, Z.jsxs)("span", {
							"data-follow-toolbar-controls": "",
							className: "contents",
							children: [
								/* @__PURE__ */ (0, Z.jsxs)("span", {
									"data-button-group": !0,
									role: "group",
									"aria-label": Y("follow:sourceList.layout"),
									children: [/* @__PURE__ */ (0, Z.jsx)(c, {
										variant: "ghost",
										iconOnly: !0,
										leadingIcon: Te,
										"aria-label": se[0][1],
										"aria-pressed": !K,
										onClick: () => w("default")
									}), /* @__PURE__ */ (0, Z.jsx)(c, {
										variant: "ghost",
										iconOnly: !0,
										leadingIcon: Qe,
										"aria-label": se[1][1],
										"aria-pressed": K,
										onClick: () => w("table")
									})]
								}),
								K ? /* @__PURE__ */ (0, Z.jsx)(xe, {
									preferences: q,
									label: Y("follow:sourceList.tableLabel")
								}) : null,
								/* @__PURE__ */ (0, Z.jsxs)("span", {
									className: "flex flex-none items-center gap-2",
									children: [/* @__PURE__ */ (0, Z.jsx)(fe, {
										"aria-label": Y("follow:sourceList.sortLabel"),
										prefix: Y("follow:shared.sort"),
										selectedKey: s,
										onSelectionChange: (e) => {
											if (e === null) return;
											let t = String(e);
											S(t, R[t]);
										},
										children: de.map(([e, t]) => /* @__PURE__ */ (0, Z.jsx)(pe, {
											id: e,
											children: t
										}, e))
									}), /* @__PURE__ */ (0, Z.jsx)(c, {
										variant: "secondary",
										iconOnly: !0,
										leadingIcon: _e,
										"data-icon-state": l === "asc" ? "a" : "b",
										"aria-label": Ht(s, l),
										onClick: () => S(s, l === "asc" ? "desc" : "asc")
									})]
								}),
								K ? null : /* @__PURE__ */ (0, Z.jsx)(c, {
									variant: "secondary",
									iconOnly: F,
									leadingIcon: h,
									"aria-expanded": !Ot,
									"aria-label": Y(Ot ? "follow:shared.expandAll" : "follow:shared.collapseAll"),
									onClick: () => N(Ot ? /* @__PURE__ */ new Set() : new Set(Ee.map(({ key: e }) => e))),
									children: Y(Ot ? "follow:shared.expandAll" : "follow:shared.collapseAll")
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, Z.jsxs)("div", {
				"aria-live": "polite",
				className: "flex flex-col gap-3 empty:hidden",
				children: [
					Oe ? /* @__PURE__ */ (0, Z.jsx)(we, {
						embedded: !0,
						kind: H?.older ? De("feed-scrape") : De("follow-check"),
						label: pt(H) || (H?.total ? Y(H.older ? "follow:sourceList.backfillProgress" : "follow:sourceList.checkProgress", {
							checked: H.checked || 0,
							count: H.total
						}) : Y("follow:sourceList.preparingCheck")),
						value: H?.checked,
						total: H?.total
					}) : null,
					ue ? /* @__PURE__ */ (0, Z.jsx)(I, {
						tone: "error",
						title: Y("follow:shared.actionFailed"),
						children: ue
					}) : null,
					!Oe && ke?.results?.length ? /* @__PURE__ */ (0, Z.jsx)(I, {
						tone: "neutral",
						title: Y("follow:followFeed.checkResults"),
						children: ze(ke)
					}) : null,
					wt.length ? /* @__PURE__ */ (0, Z.jsx)(I, {
						tone: "error",
						title: Y("follow:sourceList.failedTitle", { count: wt.length }),
						extra: /* @__PURE__ */ (0, Z.jsx)("ul", {
							className: "flex flex-col gap-0.5 text-body-2-regular",
							children: wt.map((e, t) => /* @__PURE__ */ (0, Z.jsx)("li", { children: Y("follow:shared.labeled", {
								label: `${e.provider_label || e.provider || ""} ${e.author || e.label || e.ref || ""}`.trim(),
								value: et(e.error || "") || Y("follow:shared.noReason")
							}) }, `${e.provider || ""}-${e.ref || t}`))
						}),
						children: Y("follow:sourceList.failedBody")
					}) : null,
					Et ? /* @__PURE__ */ (0, Z.jsx)(I, {
						tone: "warning",
						children: Y("follow:sourceList.evidenceGap", { error: Et })
					}) : null
				]
			}),
			/* @__PURE__ */ (0, Z.jsx)(me, {
				label: Y("follow:sourceList.bulkActions"),
				visible: Ct.length > 0,
				count: Y("follow:sourceList.selectedCount", { count: Ct.length }),
				actions: [
					nt(!0),
					nt(!1),
					it
				].map((e) => ({
					action: e,
					items: Ct,
					host: $e,
					disabled: x || Je.isPending
				})),
				leading: /* @__PURE__ */ (0, Z.jsx)(c, {
					variant: "secondary",
					size: "small",
					disabled: x,
					...U(G.busy),
					onClick: () => Ne(Ct),
					children: Y("follow:sourceList.checkSelected")
				}),
				children: /* @__PURE__ */ (0, Z.jsx)(c, {
					variant: "ghost",
					size: "small",
					onClick: tt,
					children: Y("follow:shared.clearSelection")
				})
			}),
			K ? /* @__PURE__ */ (0, Z.jsx)(ee, {
				ref: ce,
				follow: !0,
				preferences: q,
				onRowClick: (e) => Le(Number(e), !y.has(Number(e))),
				rectangleSelecting: e.selecting,
				onRectangle: oe,
				children: /* @__PURE__ */ (0, Z.jsxs)(be, {
					"aria-label": Y("follow:sourceList.tableLabel"),
					size: "sm",
					sortDescriptor: dt[0] ? {
						column: dt[0].id,
						direction: dt[0].desc ? "descending" : "ascending"
					} : void 0,
					onSortChange: (e) => ht.setSorting([{
						id: String(e.column),
						desc: e.direction === "descending"
					}]),
					children: [/* @__PURE__ */ (0, Z.jsxs)(a, { children: [ht.getHeaderGroups()[0].headers.map((e) => {
						let t = e.column.id in d, r = ct(e.column.columnDef.header, e.getContext());
						return /* @__PURE__ */ (0, Z.jsx)(n, {
							id: e.id,
							allowsSorting: t,
							isRowHeader: e.column.id === "source",
							...q.columnProps(e.id),
							children: ({ sortDirection: n }) => /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [e.id === "select" ? r : t ? /* @__PURE__ */ (0, Z.jsxs)("span", {
								className: "flex items-center gap-0.5",
								children: [V.header(e.id, yr[e.id] || e.id) ?? r, /* @__PURE__ */ (0, Z.jsx)("span", {
									"data-sort-indicator": !0,
									"data-direction": n || void 0,
									children: /* @__PURE__ */ (0, Z.jsx)(p, {})
								})]
							}) : V.header(e.id, yr[e.id] || e.id) ?? r, /* @__PURE__ */ (0, Z.jsx)(Se, {
								preferences: q,
								id: e.id
							})] })
						}, e.id);
					}), /* @__PURE__ */ (0, Z.jsx)(n, {
						id: "remaining-space",
						"aria-label": Y("follow:shared.rowSpacer"),
						"data-table-space": "",
						width: q.spaceWidth,
						minWidth: 0
					})] }), /* @__PURE__ */ (0, Z.jsx)(t, {
						renderEmptyState: () => Y("follow:sourceList.pageEmpty"),
						children: gt.map((e) => /* @__PURE__ */ (0, Z.jsxs)(r, {
							id: e.id,
							"data-follow-selected": e.getIsSelected() || void 0,
							"data-work-context-row": e.original.source.id,
							onContextMenu: (t) => lt.onContextMenu?.(t, e.original.source, String(e.original.source.id)),
							children: [e.getVisibleCells().map((e) => /* @__PURE__ */ (0, Z.jsx)(i, { children: ct(e.column.columnDef.cell, e.getContext()) }, e.id)), /* @__PURE__ */ (0, Z.jsx)(i, { "data-table-space": "" })]
						}, e.id))
					})]
				})
			}) : /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [
				/* @__PURE__ */ (0, Z.jsx)(v, {
					filters: V.values,
					columns: Sr,
					onRemove: V.clear,
					valueLabel: (e, t) => t || Y("cleanup:shared.none")
				}),
				_t.length ? /* @__PURE__ */ (0, Z.jsx)(f, {
					isSelected: bt.all,
					isIndeterminate: bt.some,
					onChange: (e) => Ve(_t, e),
					"aria-label": Y("follow:sourceList.selectPage"),
					children: Y("follow:sourceList.selectPageShort")
				}) : null,
				Ee.length ? null : /* @__PURE__ */ (0, Z.jsx)(te, {
					icon: u,
					title: Y("follow:sourceList.pageEmpty"),
					children: null
				}),
				/* @__PURE__ */ (0, Z.jsx)("div", {
					"data-rectangle-gutter": Ee.length ? "" : void 0,
					className: "flex flex-col gap-3",
					...D,
					children: Ee.slice(mt.start, mt.end).map(({ key: e, name: t, sources: n }) => /* @__PURE__ */ (0, Z.jsx)(Tr, {
						group: n,
						name: t,
						handlers: G,
						selected: y,
						open: !j.has(e),
						onOpen: (t) => {
							let n = new Set(j);
							t ? n.delete(e) : n.add(e), N(n);
						},
						onToggleGroup: (e) => Ve(n.map((e) => e.id), e),
						onToggle: Le
					}, e))
				})
			] }),
			/* @__PURE__ */ (0, Z.jsx)(b, {
				label: Y("follow:followManageNav.list"),
				total: mt.total,
				pagination: {
					pageIndex: mt.page - 1,
					pageSize: _
				},
				scrollTarget: K ? ce : void 0,
				unit: Y(K ? "follow:followOverview.sourceUnit" : "follow:sourceList.creatorUnit"),
				pageUnit: Y(K ? "follow:followOverview.itemUnit" : "follow:followOverview.creatorUnit"),
				onChange: (e) => {
					e.pageSize === _ ? ht.setPageIndex(e.pageIndex) : ht.setPageSize(e.pageSize);
				}
			}),
			A.new ? /* @__PURE__ */ (0, Z.jsxs)("div", {
				className: "-mx-6 -mb-5 flex flex-wrap items-center gap-2 border-t border-separator-border rounded-b-2xl bg-card-footer px-6 py-4 max-sm:-mx-4 max-sm:px-4",
				children: [
					/* @__PURE__ */ (0, Z.jsx)("span", {
						className: "mr-auto text-body-2-regular text-text-secondary",
						children: Y("follow:sourceList.markSummary", {
							unwatched: Number(A.new) || 0,
							watched: Number(A.seen) || 0,
							saved: Number(A.saved) || 0,
							ignored: Number(A.ignored) || 0
						})
					}),
					/* @__PURE__ */ (0, Z.jsx)(c, {
						variant: "secondary",
						size: "small",
						onClick: ae,
						children: Y("follow:sourceList.seeUpdates")
					}),
					["seen", "ignored"].map((e) => {
						let t = at(e);
						return /* @__PURE__ */ (0, Z.jsx)(c, {
							variant: "secondary",
							size: "small",
							disabled: x,
							...U(Ye.isPending),
							onClick: () => void It(t, [Number(A.new) || 0], $e).catch($e.failure),
							children: t.label
						}, e);
					})
				]
			}) : null
		]
	});
}
// node_modules/skullet/dist/index.mjs
var Dr = "skullet-reveal", Or = "skullet-pane", kr = "skullet-loading", Ar = "skullet-ghost", jr = "skullet-snapshot", Mr = "skullet-layer", Nr = "skullet-rect", Pr = "skullet-bar", Fr = "skullet-inactive", Ir = "skullet-exiting", Lr = "skullet-covered", Rr = "skullet-own", zr = "skullet-ignore", Br = "skullet-block", Vr = Symbol.for("skullet.ghost"), Hr = Symbol.for("skullet.uncover"), Ur = "skullet-status", Wr = "skullet-xray", Gr = "skullet-debug", Kr = "var(--skullet-base, rgb(128 128 128 / 0.2))", qr = "var(--skullet-highlight, rgb(255 255 255 / 0.12))", Jr = 320, Yr = 280, Xr = 1e4, Zr = {
	shimmer: {
		slow: 4e3,
		fast: 2e3
	},
	pulse: {
		slow: 2400,
		fast: 1200
	}
}, Qr = [
	"a",
	"b",
	"code",
	"dd",
	"dt",
	"em",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"i",
	"label",
	"li",
	"p",
	"small",
	"span",
	"strong",
	"td",
	"th",
	"time"
], $r = [
	"audio",
	"canvas",
	"embed",
	"iframe",
	"img",
	"input",
	"object",
	"picture",
	"select",
	"svg",
	"textarea",
	"video"
], ei = $r.join(", "), ti = `
[${Dr}] {
  position: relative;
}

skullet-reveal {
  display: block;
}

skullet-reveal[loading]:not(:defined) {
  visibility: hidden;
}

[${Or}] {
  display: block;
}

[${kr}] {
  position: relative;
  -webkit-user-select: none;
  user-select: none;
  pointer-events: none;
}

[${Fr}] {
  display: none !important;
}

[${Mr}] {
  position: absolute;
  inset: 0;
  overflow: visible;
}

[${Pr}] {
  display: block;
  background-color: ${Kr};
  background-repeat: no-repeat;
}

/* Containers keep their surface; what they hold is drawn by bones, measured before the first paint */
@scope ([${kr}]) to ([${Rr}], [${Mr}]) {
  :scope,
  :scope * {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
    text-decoration-color: transparent !important;
  }

  :scope ::placeholder {
    color: transparent !important;
  }

  /* A line to measure in empty text; content only, never a size, or a dot-sized span would grow round it */
  :scope :is(${Qr.join(", ")}):empty:not(svg *)::before {
    content: "000000";
  }

  /* Leaves are drawn by bones, so their own paint never shows; visibility, as measuring reads it */
  :scope :is(:not(:has(*)), ${ei}, [${Lr}], [${Br}]):not(svg *) {
    visibility: hidden !important;
  }

  /* No script to measure: a bar struck through each line of text instead */
  @media (scripting: none) {
    :scope :not(:has(*)):not(svg *) {
      visibility: visible !important;
    }

    :scope,
    :scope * {
      text-decoration: line-through ${Kr} !important;
      text-decoration-thickness: 0.72em !important;
      text-decoration-skip-ink: none !important;
    }

    :scope :is(${ei}, [${Br}]):not(svg *) {
      visibility: visible !important;
      background: ${Kr} !important;
    }

    :scope svg * {
      fill: transparent !important;
      stroke: transparent !important;
    }

    :scope :is(img, video) {
      object-position: -100vw 0;
    }
  }
}

/* Read by screen readers in the skeleton's place, never seen */
[${Ur}] {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Debug x-ray: the ghost shown through its bones, to see what was measured */
[${Wr}] [${kr}] [${Ar}],
[${Wr}] [${kr}] [${Ar}] *:not(svg *) {
  visibility: visible !important;
  color: rgb(255 0 80 / 0.7) !important;
  -webkit-text-fill-color: rgb(255 0 80 / 0.7) !important;
}

/* Lets addStyles see a stylesheet already on the page, from styles.css or a server render */
:root {
  --skullet: 1;
}`, ni = null, ri = 0, ii;
function ai() {
	ri++, !ni && (ii ??= !!getComputedStyle(document.documentElement).getPropertyValue("--skullet"), !ii && (ni = document.createElement("style"), ni.dataset.skullet = "true", ni.textContent = ti, document.head.appendChild(ni)));
}
function oi() {
	ri--, !(ri > 0 || !ni) && (ni.remove(), ni = null);
}
var si = "\"use strict\";(()=>{var B=\"skullet-ghost\";var D=\"skullet-layer\",L=\"skullet-rect\";var R=\"skullet-covered\",$=\"skullet-own\",v=\"skullet-ignore\",H=\"skullet-block\",I=Symbol.for(\"skullet.ghost\"),G=Symbol.for(\"skullet.uncover\"),P=\"skullet.boot\";var W=\"var(--skullet-base, rgb(128 128 128 / 0.2))\",z=\"var(--skullet-highlight, rgb(255 255 255 / 0.12))\";var F={shimmer:{slow:4e3,fast:2e3},pulse:{slow:2400,fast:1200}},X=[\"a\",\"b\",\"code\",\"dd\",\"dt\",\"em\",\"h1\",\"h2\",\"h3\",\"h4\",\"h5\",\"h6\",\"i\",\"label\",\"li\",\"p\",\"small\",\"span\",\"strong\",\"td\",\"th\",\"time\"],U=[\"audio\",\"canvas\",\"embed\",\"iframe\",\"img\",\"input\",\"object\",\"picture\",\"select\",\"svg\",\"textarea\",\"video\"];var gt,V=()=>gt??(gt=/jsdom/.test(navigator.userAgent)?null:document.createElement(\"canvas\").getContext(\"2d\"));var J=(t,n)=>t?{left:Math.max(t.left,n.left),right:Math.min(t.right,n.right),top:Math.max(t.top,n.top),bottom:Math.min(t.bottom,n.bottom)}:n,A=t=>[[t.left,t.top],[t.right,t.top],[t.right,t.bottom],[t.left,t.bottom]],k=(t,n)=>Math.abs(t[0]-n[0])<1&&Math.abs(t[1]-n[1])<1;function Q(t,n){let e=Math.min(n.right-n.left,n.bottom-n.top),o=r=>r.endsWith(\"%\")?parseFloat(r)/100*e:parseFloat(r)||0;return[o(t.borderTopLeftRadius),o(t.borderTopRightRadius),o(t.borderBottomRightRadius),o(t.borderBottomLeftRadius)]}function bt(t,n,e){let o=J(t,n),r=Q(e,n),c=t?A(t):[],a=A(n),l=A(o).map((f,T)=>k(f,a[T])?r[T]:t&&k(f,c[T])?t.corners[T]:0),{left:s,right:i,top:u,bottom:h}=o;return{left:s,right:i,top:u,bottom:h,corners:l}}function Tt(t,n,e,o){if(!t)return e;let r=A(t),c=A(n).map((l,s)=>t.corners[s]>0&&k(l,r[s]));if(!c.some(Boolean))return e;let a=Q(o,n);return c.map((l,s)=>l?Math.max(a[s],t.corners[s]):a[s]).map(l=>`${l}px`).join(\" \")}var j=(t,n)=>{let e=J(n,t);return e.right-e.left>=2&&e.bottom-e.top>=2?e:null},q={top:\"ascender\",bottom:\"descender\"},C=new Map,tt=t=>[...t.getClientRects?.()??[]];function St(t){let n=`${t.fontStyle} ${t.fontWeight} ${t.fontSize} ${t.fontFamily}`;if(C.has(n))return C.get(n);let e=V(),o=null;if(e){e.font=n;let r=e.measureText(\"H\"),c=a=>e.measureText(a).actualBoundingBoxAscent;o={ascent:r.fontBoundingBoxAscent,descent:r.fontBoundingBoxDescent,ascender:c(\"bdfhkl\"),capHeight:r.actualBoundingBoxAscent,xHeight:c(\"xz\"),descender:e.measureText(\"gjpqy\").actualBoundingBoxDescent}}return C.set(n,o),o}var Y={ascender:\"ascender\",\"cap-height\":\"capHeight\",\"x-height\":\"xHeight\"},K=(t,n,e,o)=>{let r=t.getPropertyValue(n).trim();return e.includes(r)?r:o};function xt(t,n,e){let o=St(n);if(!o){let s=Math.min(e*.72,t.bottom-t.top),i=(t.top+t.bottom)/2;return{barTop:i-s/2,barBottom:i+s/2}}let r=K(n,\"--skullet-text-top\",Object.keys(Y),q.top),c=K(n,\"--skullet-text-bottom\",[\"baseline\",\"descender\"],q.bottom),a=o.ascent+o.descent,l=t.top+(t.bottom-t.top-a)/2+o.ascent;return{barTop:l-o[Y[r]],barBottom:l+(c===\"descender\"?o.descender:0)}}var Et=new Set(U),Rt=new Set(X),et=.4,At=/[,/]\\s*0\\)$/,y=(t,n)=>t!==\"\"&&t!==n,yt=[\"Top\",\"Right\",\"Bottom\",\"Left\"],Mt=t=>yt.every(n=>y(t[`border${n}Style`],\"none\")&&y(t[`border${n}Width`],\"0px\")),Ct=t=>{let[n=0,e=0,o=0,r=0]=(t.replace(/rgba?\\([^)]*\\)|#\\w+/g,\"\").match(/-?[\\d.]+px/g)??[]).map(parseFloat);return t.includes(\"inset\")&&!o&&!r&&n===0!=(e===0)&&Math.abs(n+e)<=2},kt=t=>y(t,\"none\")&&!t.split(/,(?![^(]*\\))/).every(Ct),Ot=t=>y(t.backgroundColor,\"transparent\")&&!At.test(t.backgroundColor)||y(t.backgroundImage,\"none\")||kt(t.boxShadow)||Mt(t),ot=t=>Et.has(t.localName),nt=t=>Rt.has(t.localName)&&!t.firstElementChild&&!t.textContent?.trim(),wt=t=>{let n=document.createTreeWalker(t,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT),e=document.createRange(),o=[],r=0;for(;n.nextNode();){let i=n.currentNode;if(i.nodeType===Node.TEXT_NODE){let u=i.parentElement;if(!i.textContent?.trim()||!u)continue;r++;let h=u.getBoundingClientRect();if(h.width<=1||h.height<=1)continue;e.selectNodeContents(i),o.push(tt(e).filter(f=>f.width||f.height))}else nt(i)&&(r++,o.push([...i.getClientRects()]))}if(!o.some(i=>i.length))return r;let c=(parseFloat(getComputedStyle(t).fontSize)||16)*et,a=(i,u)=>Math.min(i.bottom,u.bottom)-Math.max(i.top,u.top)>=Math.min(i.height,u.height)/2&&Math.max(i.left,u.left)-Math.min(i.right,u.right)<=c,l=o.map((i,u)=>u),s=i=>l[i]===i?i:l[i]=s(l[i]);for(let i=0;i<o.length;i++)for(let u=i+1;u<o.length;u++)o[i].some(h=>o[u].some(f=>a(h,f)))&&(l[s(u)]=s(i));return new Set(o.map((i,u)=>s(u))).size},Nt=(t,n)=>t.hasAttribute(H)||ot(t)||Ot(n)&&wt(t)<=1;function _t(t,n){if(parseFloat(n.borderRadius)||!t.parentElement)return n.borderRadius||\"0px\";let e=t.parentElement,o=getComputedStyle(e),r=t.getBoundingClientRect(),c=e.getBoundingClientRect();return Math.abs(r.width-c.width)<1&&Math.abs(r.height-c.height)<1&&o.overflow!==\"visible\"?o.borderRadius:n.borderRadius||\"0px\"}function Z(t){t.sort((e,o)=>e.left-o.left);let n=[];for(let e of t){let o=n.find(r=>{let c=Math.min(r.bottom,e.bottom)-Math.max(r.top,e.top),a=Math.min(r.bottom-r.top,e.bottom-e.top),l=e.left-r.right;return c>=a/2&&l<=Math.max(r.fontSize,e.fontSize)*et});o?(o.left=Math.min(o.left,e.left),o.right=Math.max(o.right,e.right),o.top=Math.min(o.top,e.top),o.bottom=Math.max(o.bottom,e.bottom),o.fontSize=Math.max(o.fontSize,e.fontSize),o.barTop=Math.min(o.barTop,e.barTop),o.barBottom=Math.max(o.barBottom,e.barBottom)):n.push({...e})}return n.map(e=>{let o=e.barBottom-e.barTop;return{x:e.left,y:e.barTop,width:e.right-e.left,height:o,radius:e.radius||`${Math.round(o/3)}px`}})}function rt(t,n,{mark:e=!0,onCovered:o}={}){let r=n.getBoundingClientRect(),c=n.offsetWidth?r.width/n.offsetWidth:1,a=n.offsetHeight?r.height/n.offsetHeight:1,l=m=>({left:(m.left-r.left)/c,right:(m.right-r.left)/c,top:(m.top-r.top)/a,bottom:(m.bottom-r.top)/a}),s=[],i=[],u=new Set,h=document.createRange(),f=(m,g,b)=>{let d=j(m,b);if(!d)return;let p=parseFloat(g.fontSize)||16,M=l(d);i.push({...M,fontSize:p,...xt(M,g,p),radius:g.getPropertyValue(\"--skullet-radius\").trim()})},T=(m,g)=>{let b=m.data.search(/\\S/);if(b<0||!m.parentElement)return;h.setStart(m,b),h.setEnd(m,m.data.trimEnd().length);let d=getComputedStyle(m.parentElement);for(let p of tt(h))f(p,d,g)},_=(m,g)=>{for(let b of m.childNodes){if(b.nodeType===Node.TEXT_NODE){T(b,g);continue}if(b.nodeType!==Node.ELEMENT_NODE)continue;let d=b;if(d.hasAttribute(v)||d.hasAttribute($))continue;let p=getComputedStyle(d);if(p.display===\"none\")continue;if(Nt(d,p)){let E=j(d.getBoundingClientRect(),g);if(E){let S=l(E);s.push({x:S.left,y:S.top,width:S.right-S.left,height:S.bottom-S.top,radius:Tt(g,E,_t(d,p),p)})}ot(d)||u.add(d);continue}if(nt(d)){for(let E of d.getClientRects())f(E,p,g);continue}let M=p.overflowX!==\"visible\"||p.overflowY!==\"visible\";_(d,M?bt(g,d.getBoundingClientRect(),p):g)}};if(_(t,null),o?.(u),!e)return[...s,...Z(i)];for(let m of t.querySelectorAll(`[${R}]`))u.has(m)||m.removeAttribute(R);for(let m of u)m.hasAttribute(R)||m.setAttribute(R,\"\");return[...s,...Z(i)]}var Bt=t=>typeof matchMedia<\"u\"&&matchMedia(t).matches,Dt=()=>typeof Element<\"u\"&&typeof Element.prototype.animate==\"function\",st=()=>!Dt()||Bt(\"(prefers-reduced-motion: reduce)\");var it=t=>t.getAnimations?.()??[];var Lt=.7,$t=1280,at=320,vt=2.5,Ht=.45,It=[\"shimmer\",\"group-shimmer\",\"pulse\",\"none\"];function lt(t){let n=getComputedStyle(t),e=(c,a,l)=>{let s=n.getPropertyValue(c).trim();return a.includes(s)?s:l},o=e(\"--skullet-animation\",It,\"shimmer\"),r=e(\"--skullet-speed\",[\"slow\",\"fast\"],\"slow\");return{animation:o,duration:F[o===\"pulse\"?\"pulse\":\"shimmer\"][r]}}var w=20,Gt=Math.sin(w*Math.PI/180),ut=Math.cos(w*Math.PI/180),Pt=Gt/ut;var Wt=`${90+w}deg`,O=.85,x=12,ct=t=>(1-Math.cos(Math.PI*t))/2;function zt(t){let n=t*vt,e=(r,c)=>`color-mix(in srgb, ${z} ${(c*100).toFixed(1)}%, transparent) ${(r*t).toFixed(2)}px`,o=[];for(let r=0;r<=x;r++)o.push(e(r/x*O,ct(r/x)));for(let r=1;r<=x;r++)o.push(e(O+r/x*(1-O),ct(1-r/x)));return{width:n/ut,image:`repeating-linear-gradient(${Wt}, ${o.join(\", \")}, transparent ${n.toFixed(2)}px)`}}function Ft(t,n,e=lt(t)){for(let f of it(t))f.cancel();if(t.style.backgroundImage=\"\",t.style.backgroundRepeat=\"\",st()||typeof t.animate!=\"function\"||e.animation===\"none\")return;let o={duration:e.duration,iterations:1/0};if(e.animation===\"pulse\"){t.animate([{opacity:1,easing:\"ease-in-out\"},{opacity:Ht,easing:\"ease-in-out\"},{opacity:1}],o).startTime=0;return}let r=t.getBoundingClientRect(),c=r.left+scrollX,a=e.animation===\"group-shimmer\"?n??{left:c,top:r.top,width:r.width,height:r.height}:{left:0,top:0,width:document.documentElement.clientWidth||innerWidth,height:innerHeight},l=Math.min(Math.max(a.width*.4,80),at),{width:s,image:i}=zt(l),u=c-a.left+(r.top-a.top)*Pt,h=e.duration*Lt/($t+at);t.style.backgroundImage=i,t.style.backgroundSize=`${s}px 100%`,t.style.backgroundRepeat=\"repeat-x\",t.animate([{backgroundPosition:`${-u}px 0`},{backgroundPosition:`${s-u}px 0`}],{duration:s*h,iterations:1/0}).startTime=0}var Xt=t=>t.shadowRoot??t.attachShadow({mode:\"open\"});function mt(t,n){let e=Xt(t),o=t.getBoundingClientRect(),r={left:o.left+scrollX,top:o.top,width:o.width,height:o.height},c=lt(t);for(n.forEach((a,l)=>{let s=e.children[l];s||(s=document.createElement(\"div\"),s.setAttribute(L,\"\"),s.style.cssText=`position:absolute;display:block;pointer-events:none;background-color:${W};background-repeat:no-repeat`,e.append(s)),Object.assign(s.style,{left:`${a.x}px`,top:`${a.y}px`,width:`${a.width}px`,height:`${a.height}px`,borderRadius:a.radius});let i=`${Math.round(r.left+a.x)}|${Math.round(a.y)}|${Math.round(a.height)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}|${document.documentElement.clientWidth}|${c.animation}|${c.duration}`;s.dataset.motion!==i&&(s.dataset.motion=i,Ft(s,r,c))});e.children.length>n.length;)e.lastElementChild.remove()}var pt=t=>t.parentElement?`${pt(t.parentElement)} > :nth-child(${[...t.parentElement.children].indexOf(t)+1})`:\":root\";function N(t){let n=t?.previousElementSibling,e=n?.querySelector(`:scope > [${B}]`),o=n?.querySelector(`:scope > [${D}]`);if(!n||!e||!o)return;let r=typeof CSSStyleSheet==\"function\"&&\"replaceSync\"in CSSStyleSheet.prototype?new CSSStyleSheet:null;r&&(document.adoptedStyleSheets=[...document.adoptedStyleSheets,r],n[G]=()=>{document.adoptedStyleSheets=document.adoptedStyleSheets.filter(s=>s!==r)});let c=s=>r?.replaceSync(s.size?`${[...s].map(pt).join(\", \")} { visibility: hidden !important; }`:\"\"),a=()=>{if(!o.isConnected||n[I])return l.disconnect();e.getClientRects().length&&mt(o,rt(e,o,{mark:!1,onCovered:c}))},l=new ResizeObserver(a);l.observe(n),document.fonts?.ready.then(a)}var ht=self,ft=Symbol.for(P),dt=ht[ft];ht[ft]=N;Array.isArray(dt)&&dt.forEach(N);N(document.currentScript);})();", ci = {
	light: {
		base: "rgb(0 0 0 / 0.07)",
		highlight: "rgb(255 255 255 / 0.6)"
	},
	dark: {
		base: "rgb(255 255 255 / 0.08)",
		highlight: "rgb(255 255 255 / 0.1)"
	}
};
({ ...ci });
function li(e = {}, t = null) {
	let n = {}, r = t && (e[t] ?? ci[t]);
	return r && (n["--skullet-base"] = r.base, n["--skullet-highlight"] = r.highlight), e.radius && (n["--skullet-radius"] = e.radius), e.animation && (n["--skullet-animation"] = e.animation), e.speed && (n["--skullet-speed"] = e.speed), e.text?.top && (n["--skullet-text-top"] = e.text.top), e.text?.bottom && (n["--skullet-text-bottom"] = e.text.bottom), n;
}
var ui = (e) => Object.entries(e).map(([e, t]) => `${e}: ${t};`).join(" ");
function di({ theme: e = {}, mode: t, text: n, selector: r = ":root" }) {
	let i = {
		...e,
		text: {
			...e.text,
			...n
		}
	}, a = t ?? (e.light || e.dark ? "system" : null), o = li(i, a === "dark" ? "dark" : a ? "light" : null), s = [];
	if (Object.keys(o).length && s.push(`${r} { ${ui(o)} }`), a === "system") {
		let t = li({ dark: e.dark }, "dark");
		s.push(`@media (prefers-color-scheme: dark) { ${r} { ${ui(t)} } }`);
	}
	return s.join("\n");
}
var fi = /* @__PURE__ */ new Map(), pi, mi = null, hi = 0;
function gi() {
	try {
		return new URLSearchParams(location.search).has("skullet-debug") || localStorage.getItem("skullet:debug") === "1";
	} catch {
		return !1;
	}
}
var _i = () => pi ??= typeof window < "u" && gi(), vi = (e) => _i() || !!e?.closest(`[${Gr}]`);
function yi(e) {
	pi = e, e ? wi() : Ti();
}
function bi(e, t) {
	!e || !vi(e) || (fi.set(e, {
		state: "loading",
		source: t
	}), Si());
}
function xi(e, t) {
	!e || !vi(e) || (fi.set(e, {
		...fi.get(e),
		state: "shown",
		moved: t
	}), Si());
}
function Si() {
	wi(), cancelAnimationFrame(hi), Di();
}
var Ci = "\n:host { all: initial; }\n.box { position: fixed; box-sizing: border-box; border: 1px dashed; border-radius: 4px; }\n.label {\n  position: absolute; left: -1px; bottom: 100%; margin-bottom: 2px;\n  padding: 1px 6px; border-radius: 4px; white-space: nowrap;\n  font: 500 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace; color: #fff;\n}\n.loading { border-color: #3b82f6; } .loading .label { background: #3b82f6; }\n.still { border-color: #22c55e; } .still .label { background: #16a34a; }\n.moved { border-color: #ef4444; border-style: solid; } .moved .label { background: #dc2626; }\n.panel {\n  position: fixed; right: 12px; bottom: 12px; display: flex; gap: 8px; align-items: center;\n  padding: 6px 10px; border-radius: 8px; background: #111; color: #fff; pointer-events: auto;\n  font: 500 12px/16px ui-sans-serif, system-ui, sans-serif; box-shadow: 0 4px 16px rgb(0 0 0 / 0.3);\n}\n.panel label { display: flex; gap: 4px; align-items: center; cursor: pointer; }\n";
function wi() {
	if (typeof document > "u") return;
	if (!mi?.isConnected) {
		mi = document.createElement("div"), mi.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
		let e = mi.attachShadow({ mode: "open" });
		e.innerHTML = `<style>${Ci}</style><div class="boxes"></div>`, document.body.append(mi);
	}
	let e = mi.shadowRoot;
	if (pi && !e.querySelector(".panel")) {
		let t = document.createElement("div");
		t.className = "panel", t.innerHTML = "skullet debug <label><input type=\"checkbox\" class=\"xray\"> x-ray</label>", t.querySelector(".xray").addEventListener("change", (e) => {
			document.documentElement.toggleAttribute(Wr, e.target.checked);
		}), e.append(t);
	}
	hi ||= requestAnimationFrame(Di);
}
function Ti() {
	mi?.shadowRoot?.querySelector(".panel")?.remove(), document.documentElement.removeAttribute(Wr), ![...fi.keys()].some((e) => vi(e)) && (cancelAnimationFrame(hi), hi = 0, mi?.remove(), mi = null);
}
var Ei = ({ state: e, source: t, moved: n }) => {
	let r = t ? ` \xB7 ${t}` : "";
	return e === "loading" ? {
		kind: "loading",
		text: `skeleton${r}`
	} : !n || n.width === 0 && n.height === 0 ? {
		kind: "still",
		text: `\u2713 no movement${r}`
	} : {
		kind: "moved",
		text: `\u2717 moved ${n.width}\xD7${n.height}px${r}`
	};
};
function Di() {
	if (hi = 0, !mi?.shadowRoot) return;
	let e = mi.shadowRoot.querySelector(".boxes");
	for (let e of fi.keys()) e.isConnected && vi(e) || fi.delete(e);
	let t = [...fi];
	for (; e.children.length > t.length;) e.lastElementChild.remove();
	t.forEach(([t, n], r) => {
		let i = e.children[r];
		i || (i = e.appendChild(document.createElement("div")), i.innerHTML = "<span class=\"label\"></span>");
		let a = t.getBoundingClientRect(), { kind: o, text: s } = Ei(n);
		i.className = `box ${o}`, Object.assign(i.style, {
			left: `${a.left - 2}px`,
			top: `${a.top - 2}px`,
			width: `${a.width + 4}px`,
			height: `${a.height + 4}px`
		}), i.firstElementChild.textContent = s;
	}), (pi || fi.size) && (hi = requestAnimationFrame(Di));
}
var Oi, ki = () => Oi ??= /jsdom/.test(navigator.userAgent) ? null : document.createElement("canvas").getContext("2d"), Ai = (e, t) => e ? {
	left: Math.max(e.left, t.left),
	right: Math.min(e.right, t.right),
	top: Math.max(e.top, t.top),
	bottom: Math.min(e.bottom, t.bottom)
} : t, ji = (e) => [
	[e.left, e.top],
	[e.right, e.top],
	[e.right, e.bottom],
	[e.left, e.bottom]
], Mi = (e, t) => Math.abs(e[0] - t[0]) < 1 && Math.abs(e[1] - t[1]) < 1;
function Ni(e, t) {
	let n = Math.min(t.right - t.left, t.bottom - t.top), r = (e) => e.endsWith("%") ? parseFloat(e) / 100 * n : parseFloat(e) || 0;
	return [
		r(e.borderTopLeftRadius),
		r(e.borderTopRightRadius),
		r(e.borderBottomRightRadius),
		r(e.borderBottomLeftRadius)
	];
}
function Pi(e, t, n) {
	let r = Ai(e, t), i = Ni(n, t), a = e ? ji(e) : [], o = ji(t), s = ji(r).map((t, n) => Mi(t, o[n]) ? i[n] : e && Mi(t, a[n]) ? e.corners[n] : 0), { left: c, right: l, top: u, bottom: d } = r;
	return {
		left: c,
		right: l,
		top: u,
		bottom: d,
		corners: s
	};
}
function Fi(e, t, n, r) {
	if (!e) return n;
	let i = ji(e), a = ji(t).map((t, n) => e.corners[n] > 0 && Mi(t, i[n]));
	if (!a.some(Boolean)) return n;
	let o = Ni(r, t);
	return a.map((t, n) => t ? Math.max(o[n], e.corners[n]) : o[n]).map((e) => `${e}px`).join(" ");
}
var Ii = (e, t) => {
	let n = Ai(t, e);
	return n.right - n.left >= 2 && n.bottom - n.top >= 2 ? n : null;
}, Li = {
	top: "ascender",
	bottom: "descender"
}, Ri = /* @__PURE__ */ new Map(), zi = (e) => [...e.getClientRects?.() ?? []];
function Bi(e) {
	let t = `${e.fontStyle} ${e.fontWeight} ${e.fontSize} ${e.fontFamily}`;
	if (Ri.has(t)) return Ri.get(t);
	let n = ki(), r = null;
	if (n) {
		n.font = t;
		let e = n.measureText("H"), i = (e) => n.measureText(e).actualBoundingBoxAscent;
		r = {
			ascent: e.fontBoundingBoxAscent,
			descent: e.fontBoundingBoxDescent,
			ascender: i("bdfhkl"),
			capHeight: e.actualBoundingBoxAscent,
			xHeight: i("xz"),
			descender: n.measureText("gjpqy").actualBoundingBoxDescent
		};
	}
	return Ri.set(t, r), r;
}
var Vi = {
	ascender: "ascender",
	"cap-height": "capHeight",
	"x-height": "xHeight"
}, Hi = (e, t, n, r) => {
	let i = e.getPropertyValue(t).trim();
	return n.includes(i) ? i : r;
};
function Ui(e, t, n) {
	let r = Bi(t);
	if (!r) {
		let t = Math.min(n * .72, e.bottom - e.top), r = (e.top + e.bottom) / 2;
		return {
			barTop: r - t / 2,
			barBottom: r + t / 2
		};
	}
	let i = Hi(t, "--skullet-text-top", Object.keys(Vi), Li.top), a = Hi(t, "--skullet-text-bottom", ["baseline", "descender"], Li.bottom), o = r.ascent + r.descent, s = e.top + (e.bottom - e.top - o) / 2 + r.ascent;
	return {
		barTop: s - r[Vi[i]],
		barBottom: s + (a === "descender" ? r.descender : 0)
	};
}
var Wi = new Set($r), Gi = new Set(Qr), Ki = .4, qi = /[,/]\s*0\)$/, Ji = (e, t) => e !== "" && e !== t, Yi = [
	"Top",
	"Right",
	"Bottom",
	"Left"
], Xi = (e) => Yi.every((t) => Ji(e[`border${t}Style`], "none") && Ji(e[`border${t}Width`], "0px")), Zi = (e) => {
	let [t = 0, n = 0, r = 0, i = 0] = (e.replace(/rgba?\([^)]*\)|#\w+/g, "").match(/-?[\d.]+px/g) ?? []).map(parseFloat);
	return e.includes("inset") && !r && !i && t === 0 != (n === 0) && Math.abs(t + n) <= 2;
}, Qi = (e) => Ji(e, "none") && !e.split(/,(?![^(]*\))/).every(Zi), $i = (e) => Ji(e.backgroundColor, "transparent") && !qi.test(e.backgroundColor) || Ji(e.backgroundImage, "none") || Qi(e.boxShadow) || Xi(e), ea = (e) => Wi.has(e.localName), ta = (e) => Gi.has(e.localName) && !e.firstElementChild && !e.textContent?.trim(), na = (e) => {
	let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n = document.createRange(), r = [], i = 0;
	for (; t.nextNode();) {
		let e = t.currentNode;
		if (e.nodeType === Node.TEXT_NODE) {
			let t = e.parentElement;
			if (!e.textContent?.trim() || !t) continue;
			i++;
			let a = t.getBoundingClientRect();
			if (a.width <= 1 || a.height <= 1) continue;
			n.selectNodeContents(e), r.push(zi(n).filter((e) => e.width || e.height));
		} else ta(e) && (i++, r.push([...e.getClientRects()]));
	}
	if (!r.some((e) => e.length)) return i;
	let a = (parseFloat(getComputedStyle(e).fontSize) || 16) * Ki, o = (e, t) => Math.min(e.bottom, t.bottom) - Math.max(e.top, t.top) >= Math.min(e.height, t.height) / 2 && Math.max(e.left, t.left) - Math.min(e.right, t.right) <= a, s = r.map((e, t) => t), c = (e) => s[e] === e ? e : s[e] = c(s[e]);
	for (let e = 0; e < r.length; e++) for (let t = e + 1; t < r.length; t++) r[e].some((e) => r[t].some((t) => o(e, t))) && (s[c(t)] = c(e));
	return new Set(r.map((e, t) => c(t))).size;
}, ra = (e, t) => e.hasAttribute(Br) || ea(e) || $i(t) && na(e) <= 1;
function ia(e, t) {
	if (parseFloat(t.borderRadius) || !e.parentElement) return t.borderRadius || "0px";
	let n = e.parentElement, r = getComputedStyle(n), i = e.getBoundingClientRect(), a = n.getBoundingClientRect();
	return Math.abs(i.width - a.width) < 1 && Math.abs(i.height - a.height) < 1 && r.overflow !== "visible" ? r.borderRadius : t.borderRadius || "0px";
}
function aa(e) {
	e.sort((e, t) => e.left - t.left);
	let t = [];
	for (let n of e) {
		let e = t.find((e) => {
			let t = Math.min(e.bottom, n.bottom) - Math.max(e.top, n.top), r = Math.min(e.bottom - e.top, n.bottom - n.top), i = n.left - e.right;
			return t >= r / 2 && i <= Math.max(e.fontSize, n.fontSize) * Ki;
		});
		e ? (e.left = Math.min(e.left, n.left), e.right = Math.max(e.right, n.right), e.top = Math.min(e.top, n.top), e.bottom = Math.max(e.bottom, n.bottom), e.fontSize = Math.max(e.fontSize, n.fontSize), e.barTop = Math.min(e.barTop, n.barTop), e.barBottom = Math.max(e.barBottom, n.barBottom)) : t.push({ ...n });
	}
	return t.map((e) => {
		let t = e.barBottom - e.barTop;
		return {
			x: e.left,
			y: e.barTop,
			width: e.right - e.left,
			height: t,
			radius: e.radius || `${Math.round(t / 3)}px`
		};
	});
}
function oa(e, t, { mark: n = !0, onCovered: r } = {}) {
	let i = t.getBoundingClientRect(), a = t.offsetWidth ? i.width / t.offsetWidth : 1, o = t.offsetHeight ? i.height / t.offsetHeight : 1, s = (e) => ({
		left: (e.left - i.left) / a,
		right: (e.right - i.left) / a,
		top: (e.top - i.top) / o,
		bottom: (e.bottom - i.top) / o
	}), c = [], l = [], u = /* @__PURE__ */ new Set(), d = document.createRange(), f = (e, t, n) => {
		let r = Ii(e, n);
		if (!r) return;
		let i = parseFloat(t.fontSize) || 16, a = s(r);
		l.push({
			...a,
			fontSize: i,
			...Ui(a, t, i),
			radius: t.getPropertyValue("--skullet-radius").trim()
		});
	}, p = (e, t) => {
		let n = e.data.search(/\S/);
		if (n < 0 || !e.parentElement) return;
		d.setStart(e, n), d.setEnd(e, e.data.trimEnd().length);
		let r = getComputedStyle(e.parentElement);
		for (let e of zi(d)) f(e, r, t);
	}, m = (e, t) => {
		for (let n of e.childNodes) {
			if (n.nodeType === Node.TEXT_NODE) {
				p(n, t);
				continue;
			}
			if (n.nodeType !== Node.ELEMENT_NODE) continue;
			let e = n;
			if (e.hasAttribute(zr) || e.hasAttribute(Rr)) continue;
			let r = getComputedStyle(e);
			if (r.display === "none") continue;
			if (ra(e, r)) {
				let n = Ii(e.getBoundingClientRect(), t);
				if (n) {
					let i = s(n);
					c.push({
						x: i.left,
						y: i.top,
						width: i.right - i.left,
						height: i.bottom - i.top,
						radius: Fi(t, n, ia(e, r), r)
					});
				}
				ea(e) || u.add(e);
				continue;
			}
			if (ta(e)) {
				for (let n of e.getClientRects()) f(n, r, t);
				continue;
			}
			let i = r.overflowX !== "visible" || r.overflowY !== "visible";
			m(e, i ? Pi(t, e.getBoundingClientRect(), r) : t);
		}
	};
	if (m(e, null), r?.(u), !n) return [...c, ...aa(l)];
	for (let t of e.querySelectorAll(`[${Lr}]`)) u.has(t) || t.removeAttribute(Lr);
	for (let e of u) e.hasAttribute(Lr) || e.setAttribute(Lr, "");
	return [...c, ...aa(l)];
}
var sa = (e) => typeof matchMedia < "u" && matchMedia(e).matches, ca = () => typeof Element < "u" && typeof Element.prototype.animate == "function", la = () => !ca() || sa("(prefers-reduced-motion: reduce)"), ua = () => sa("(prefers-reduced-transparency: reduce)"), da = (e) => e.getAnimations?.() ?? [], fa = .7, pa = 1280, ma = 320, ha = 2.5, ga = .45, _a = [
	"shimmer",
	"group-shimmer",
	"pulse",
	"none"
];
function va(e) {
	let t = getComputedStyle(e), n = (e, n, r) => {
		let i = t.getPropertyValue(e).trim();
		return n.includes(i) ? i : r;
	}, r = n("--skullet-animation", _a, "shimmer"), i = n("--skullet-speed", ["slow", "fast"], "slow");
	return {
		animation: r,
		duration: Zr[r === "pulse" ? "pulse" : "shimmer"][i]
	};
}
var ya = 20, ba = Math.sin(ya * Math.PI / 180), xa = Math.cos(ya * Math.PI / 180), Sa = ba / xa, Ca = xa, wa = `${90 + ya}deg`, Ta = .85, $ = 12, Ea = (e) => (1 - Math.cos(Math.PI * e)) / 2;
function Da(e) {
	let t = e * ha, n = (t, n) => `color-mix(in srgb, ${qr} ${(n * 100).toFixed(1)}%, transparent) ${(t * e).toFixed(2)}px`, r = [];
	for (let e = 0; e <= $; e++) r.push(n(e / $ * Ta, Ea(e / $)));
	for (let e = 1; e <= $; e++) r.push(n(Ta + e / $ * (1 - Ta), Ea(1 - e / $)));
	return {
		width: t / xa,
		image: `repeating-linear-gradient(${wa}, ${r.join(", ")}, transparent ${t.toFixed(2)}px)`
	};
}
function Oa(e, t, n = va(e)) {
	for (let t of da(e)) t.cancel();
	if (e.style.backgroundImage = "", e.style.backgroundRepeat = "", la() || typeof e.animate != "function" || n.animation === "none") return;
	let r = {
		duration: n.duration,
		iterations: 1 / 0
	};
	if (n.animation === "pulse") {
		e.animate([
			{
				opacity: 1,
				easing: "ease-in-out"
			},
			{
				opacity: ga,
				easing: "ease-in-out"
			},
			{ opacity: 1 }
		], r).startTime = 0;
		return;
	}
	let i = e.getBoundingClientRect(), a = i.left + scrollX, o = n.animation === "group-shimmer" ? t ?? {
		left: a,
		top: i.top,
		width: i.width,
		height: i.height
	} : {
		left: 0,
		top: 0,
		width: document.documentElement.clientWidth || innerWidth
	}, { width: s, image: c } = Da(Math.min(Math.max(o.width * .4, 80), ma)), l = a - o.left + (i.top - o.top) * Sa, u = n.duration * fa / (pa + ma);
	e.style.backgroundImage = c, e.style.backgroundSize = `${s}px 100%`, e.style.backgroundRepeat = "repeat-x", e.animate([{ backgroundPosition: `${-l}px 0` }, { backgroundPosition: `${s - l}px 0` }], {
		duration: s * u,
		iterations: 1 / 0
	}).startTime = 0;
}
function ka(e) {
	if (la()) return null;
	let t = va(e);
	return t.animation !== "shimmer" && t.animation !== "group-shimmer" ? null : t.duration * fa / (pa + ma);
}
var Aa = (e) => e.shadowRoot ?? e.attachShadow({ mode: "open" }), ja = (e) => e.shadowRoot ? [...e.shadowRoot.children] : [];
function Ma(e, t) {
	let n = Aa(e), r = e.getBoundingClientRect(), i = {
		left: r.left + scrollX,
		top: r.top,
		width: r.width,
		height: r.height
	}, a = va(e);
	for (t.forEach((e, t) => {
		let r = n.children[t];
		r || (r = document.createElement("div"), r.setAttribute(Nr, ""), r.style.cssText = `position:absolute;display:block;pointer-events:none;background-color:${Kr};background-repeat:no-repeat`, n.append(r)), Object.assign(r.style, {
			left: `${e.x}px`,
			top: `${e.y}px`,
			width: `${e.width}px`,
			height: `${e.height}px`,
			borderRadius: e.radius
		});
		let o = `${Math.round(i.left + e.x)}|${Math.round(e.y)}|${Math.round(e.height)}|${Math.round(i.left)}|${Math.round(i.width)}|${Math.round(i.height)}|${document.documentElement.clientWidth}|${a.animation}|${a.duration}`;
		r.dataset.motion !== o && (r.dataset.motion = o, Oa(r, i, a));
	}); n.children.length > t.length;) n.lastElementChild.remove();
}
var Na = 150, Pa = 120, Fa = 72, Ia = 3, La = 60, Ra = 150, za = 400, Ba = 1.5, Va = 1e3, Ha = 1e3, Ua = /* @__PURE__ */ new Set([
	"filter",
	"transform",
	"translate",
	"scale",
	"rotate",
	"clipPath",
	"easing",
	"composite"
]), Wa = -1 / 0, Ga = !1;
function Ka() {
	if (!(Ga || typeof addEventListener > "u")) {
		Ga = !0;
		for (let e of [
			"wheel",
			"touchmove",
			"keydown"
		]) addEventListener(e, () => Wa = performance.now(), {
			passive: !0,
			capture: !0
		});
	}
}
var qa = /* @__PURE__ */ new WeakMap();
function Ja(e, { served: t, refetch: n }) {
	Ka();
	let r = qa.get(e)?.since ?? performance.now();
	qa.set(e, {
		since: t ? -1 / 0 : r,
		refetch: n
	});
}
function Ya(e) {
	let t = [], n = (e) => {
		for (let r of e.children) {
			let e = [...r.childNodes].some((e) => e.nodeType === Node.TEXT_NODE && e.textContent?.trim());
			!r.firstElementChild || e || r.localName === "svg" ? t.push(r) : n(r);
		}
	};
	return n(e), t;
}
function Xa(e, t) {
	for (let n = e; n && n !== t; n = n.parentElement) {
		let e = n.parentElement;
		if (!e) break;
		if ([...e.children].filter((e) => e.localName === n.localName && e.className === n.className).length >= 3) return n;
	}
	return e;
}
var Za = (e, t) => {
	let n = t.left + t.width / 2, r = t.top + t.height / 2;
	return n >= e.left && n <= e.right && r >= e.top && r <= e.bottom;
};
function Qa(e) {
	let { left: t, top: n, right: r, bottom: i } = e.getBoundingClientRect();
	for (let a of e.querySelectorAll(`:scope > [${Ir}]`)) {
		let e = a.getBoundingClientRect();
		t = Math.min(t, e.left), n = Math.min(n, e.top), r = Math.max(r, e.right), i = Math.max(i, e.bottom);
	}
	return new DOMRect(t, n, r - t, i - n);
}
var $a = (e, t) => Math.min(Math.max(e, 0), t), eo = -1 / 0;
function to(e, t, n, r, i) {
	let a = performance.now();
	a - eo > Ra && (eo = a);
	let o = a - eo, s = t.getBoundingClientRect(), c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map(), u = (e) => parseFloat(getComputedStyle(e).fontSize) || 16;
	for (let t of Ya(e)) {
		let n = Xa(t, e), r = c.get(n);
		r || (r = {
			rect: n.getBoundingClientRect(),
			size: 0
		}, c.set(n, r));
		let i = u(t);
		r.size = Math.max(r.size, i), l.set(t, {
			unit: r,
			size: i
		});
	}
	let d = (e) => {
		let t = n(e);
		return t === null ? null : $a(t, Va) + Math.max(r.delay ?? 0, 0);
	};
	return {
		kind: "sequence",
		duration: i,
		enter: r.enter,
		pieceDelay: (e) => {
			let t = l.get(e);
			return t ? d({
				rect: e.getBoundingClientRect(),
				unit: t.unit.rect,
				secondary: t.size < t.unit.size,
				reveal: s,
				late: o
			}) : null;
		},
		boneDelay: (e) => {
			let t = [...c.values()].find((t) => Za(t.rect, e));
			return d({
				rect: e,
				unit: t?.rect ?? null,
				secondary: !!t && e.height < t.size * .8,
				reveal: s,
				late: o
			});
		}
	};
}
function no(e, t) {
	if (!e) return;
	let n = {};
	for (let [r, i] of Object.entries(e)) Ua.has(r) ? n[r] = i : r !== "opacity" && t(r);
	return n;
}
function ro(e, t, n, r = () => {}) {
	let i = qa.get(t);
	qa.delete(t);
	let a = n;
	for (; a.choose;) {
		let { choose: n, ...r } = a;
		a = {
			...r,
			...n({
				content: e,
				reveal: t,
				waited: i ? performance.now() - i.since : 1 / 0,
				input: performance.now() - Wa < za,
				refetch: !!i?.refetch,
				height: e.getBoundingClientRect().height,
				pieces: Ya(e).length
			})
		};
	}
	let o = $a(a.duration ?? 200, Ha);
	if (a = {
		...a,
		delay: Math.min(a.delay ?? 0, Va)
	}, !o) return { kind: "instant" };
	let s = no(a.enter, r);
	if (a.wipe) {
		let e = Qa(t);
		if (e.width * e.height <= innerWidth * innerHeight * Ba) return {
			kind: "wipe",
			wipe: a.wipe,
			start: performance.now() + (a.delay ?? 0),
			duration: o,
			reveal: e,
			enter: s
		};
	} else if (typeof a.order == "function") return to(e, t, a.order, {
		...a,
		enter: s
	}, o);
	return {
		kind: "together",
		delay: Math.max(a.delay ?? 0, 0),
		duration: o,
		enter: s
	};
}
var io = ({ rect: e, reveal: t }) => {
	let n = (e.top - t.top) / Math.max(t.height, 1), r = (e.left - t.left) / Math.max(t.width, 1);
	return $a(n * .8 + r * .2, 1) * Jr;
}, ao = (e) => e.bottom > 0 && e.top < innerHeight, oo = ({ rect: e, unit: t, secondary: n, late: r }) => {
	if (!t) return ao(e) ? 0 : null;
	if (!ao(t)) return null;
	let i = $a(t.top / innerHeight, 1) * Jr;
	return Math.max(i - r, 0) + (n ? La : 0);
}, so = { duration: 0 }, co = { order: "together" }, lo = { order: io }, uo = (e) => e.input || e.waited < Na ? so : e.refetch ? {
	order: "together",
	duration: Pa
} : null, fo = (e) => e.height < Fa || e.pieces <= Ia ? co : { order: oo }, po = {
	hold: Na,
	choose: (e) => uo(e) ?? fo(e)
}, mo = new Set($r), ho = "script, noscript, template, base, meta, link", go = /* @__PURE__ */ new Set([
	"iframe",
	"object",
	"embed"
]), _o = /* @__PURE__ */ new Set([
	"src",
	"srcset",
	"sizes",
	"poster",
	"data",
	"srcdoc",
	"action",
	"formaction",
	"value",
	"alt",
	Lr
]), vo = (e) => e.replace(/[A-Z]/g, "X").replace(/[a-z]/g, "x").replace(/\d/g, "0");
function yo(e, t) {
	let n = vo(t.data);
	t.data = n;
	let r = e.parentElement, i = ki();
	if (!r || !i || !n.trim()) return;
	let a = getComputedStyle(r);
	i.font = `${a.fontStyle} ${a.fontWeight} ${a.fontSize} ${a.fontFamily}`;
	let o = (e) => {
		let t = e.replace(/\s+/g, " ");
		return a.textTransform === "uppercase" ? t.toUpperCase() : a.textTransform === "lowercase" ? t.toLowerCase() : t;
	}, s = (i.measureText(o(e.data)).width - i.measureText(o(n)).width) / o(n).length;
	if (Math.abs(s) < .01) return;
	let c = document.createElement("span");
	c.style.letterSpacing = `${(parseFloat(a.letterSpacing) || 0) + s}px`, t.replaceWith(c), c.append(t);
}
function bo(e) {
	for (let t of e.querySelectorAll(ho)) t.remove();
	for (let t of e.querySelectorAll("*")) if (go.has(t.localName)) {
		let e = document.createElement("span");
		e.style.cssText = t.getAttribute("style") ?? "", e.style.display ||= "inline-block", t.replaceWith(e);
	} else {
		for (let { name: e, value: n } of [...t.attributes]) {
			let r = e.toLowerCase();
			(r.startsWith("on") || _o.has(r) || r.endsWith("href") && /^\s*javascript:/i.test(n)) && t.removeAttribute(e);
		}
		t.localName === "img" && t.setAttribute("alt", "");
	}
	for (let t of e.querySelectorAll("video source, picture source")) t.remove();
}
function xo(e, t) {
	let n = e.cloneNode(!0), r = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, i = document.createTreeWalker(e, r), a = document.createTreeWalker(n, r), o = [], s = [];
	for (; i.nextNode() && a.nextNode();) {
		let e = i.currentNode, n = a.currentNode;
		e.nodeType === Node.TEXT_NODE ? t && o.push([e, n]) : (mo.has(e.localName) || go.has(e.localName)) && s.push([e, n]);
	}
	for (let [e, t] of s) {
		let n = e.getBoundingClientRect();
		t.style.boxSizing = "border-box", t.style.width = `${n.width}px`, n.width && n.height ? (t.style.maxWidth = "100%", t.style.height = "auto", t.style.aspectRatio = `${n.width} / ${n.height}`) : t.style.height = `${n.height}px`;
	}
	for (let [e, t] of o) yo(e, t);
	return bo(n), n.innerHTML;
}
function So(e) {
	let t = document.createElement("template");
	return t.innerHTML = e, bo(t.content), t.content;
}
var Co = (e, t) => [...e.children].map((e) => {
	let n = [...e.classList].sort().join("."), r = t > 1 && e.firstElementChild ? `(${Co(e, t - 1)})` : "";
	return `${e.localName}${n ? `.${n}` : ""}${r}`;
}).join(","), wo = (e) => {
	let t = 5381;
	for (let n = 0; n < e.length; n++) t = t * 33 ^ e.charCodeAt(n);
	return (t >>> 0).toString(36);
};
function To(e) {
	let t = Co(e, 2);
	return t ? `${location.pathname}|${wo(t)}` : null;
}
var Eo = !1;
try {
	Eo = !1;
} catch {
	Eo = !1;
}
var Do = Eo, Oo = /* @__PURE__ */ new Set();
function ko(e, t) {
	!Do || Oo.has(e) || (Oo.add(e), console.warn(`[skullet] ${t}`));
}
var Ao = /^(https?:|\/|data:|blob:)/;
function jo(e) {
	return typeof e == "string" ? Ao.test(e) ? "" : vo(e) : Array.isArray(e) ? e.map(jo) : e instanceof Date ? e : e && typeof e == "object" ? Object.fromEntries(Object.entries(e).map(([e, t]) => [e, jo(t)])) : e;
}
var Mo = "skullet:shapes", No = 2, Po = 50, Fo = 2e4, Io = /* @__PURE__ */ new Map(), Lo = /* @__PURE__ */ new Map();
function Ro(e, t) {
	return Lo.has(e) || Lo.set(e, /* @__PURE__ */ new Set()), Lo.get(e).add(t), () => Lo.get(e)?.delete(t);
}
function zo(e) {
	for (let t of Lo.get(e) ?? []) t();
}
function Bo() {
	try {
		let e = JSON.parse(localStorage.getItem(Mo) ?? "null");
		return e?.v === No ? e.shapes : {};
	} catch {
		return {};
	}
}
function Vo(e) {
	try {
		localStorage.setItem(Mo, JSON.stringify({
			v: No,
			shapes: e
		}));
	} catch {}
}
function Ho(e, t) {
	Io.set(e, xo(t, !1));
	let n = xo(t, !0);
	if (n.length > Fo) return;
	let r = Bo();
	delete r[e], r[e] = n;
	let i = Object.keys(r);
	for (let e of i.slice(0, i.length - Po)) delete r[e];
	Vo(r);
}
function Uo(e) {
	return Io.get(e) ?? Bo()[e] ?? null;
}
var Wo = [
	100,
	90,
	60
].map((e) => `<div ${Br} style="width:${e}%;height:0.75em;margin:0.5em 0;border-radius:0.25em"></div>`).join(""), Go = new WeakSet(typeof document > "u" ? [] : document.querySelectorAll(`[${kr}]`)), Ko = /* @__PURE__ */ new WeakMap();
function qo(e) {
	if (!e) return;
	let t = Ko.get(e);
	return Ko.delete(e), t;
}
function Jo(e, t) {
	for (let n of e.children) if (n.hasAttribute(t)) return n;
	let n = document.createElement("div");
	return n.setAttribute(t, ""), e.append(n), n;
}
var Yo = (e) => !!e.firstElementChild || !!e.textContent?.trim(), Xo = class {
	constructor(e, t = {}) {
		this.root = e, this.options = t, ai(), e[Vr] = !0, e.setAttribute(kr, ""), e.setAttribute("aria-hidden", "true"), e.inert = !0, this.ghost = Jo(e, Ar), this.snapshot = Jo(e, jr), this.layer = Jo(e, Mr), this.hadContent = Yo(this.ghost);
		let n = e.closest(`[${Dr}]`);
		n && Ja(n, {
			served: Go.has(e),
			refetch: !!t.refetch && this.hadContent
		}), this.choose(), this.measure(), e[Hr]?.(), this.mutations = new MutationObserver(this.schedule), this.mutations.observe(this.ghost, {
			childList: !0,
			subtree: !0,
			characterData: !0,
			attributes: !0
		}), this.resize = typeof ResizeObserver > "u" ? null : new ResizeObserver(this.schedule), this.resize?.observe(e), e.addEventListener("load", this.schedule, !0), addEventListener("resize", this.schedule), document.fonts?.ready.then(this.schedule);
	}
	root;
	options;
	ghost;
	snapshot;
	layer;
	source = null;
	hadContent = !1;
	frame = 0;
	mutations;
	resize;
	schedule = () => {
		this.root.closest(`[${Ir}]`) || (cancelAnimationFrame(this.frame), this.frame = requestAnimationFrame(() => {
			let e = Yo(this.ghost);
			e !== this.hadContent && (this.hadContent = e, this.choose()), this.measure();
		}));
	};
	choose() {
		let e = "fallback", t = null, n = this.options.exact || Go.has(this.root), r = !!this.ghost.querySelector(`[${Rr}]`);
		if ((n || r) && this.hadContent) e = "ghost";
		else {
			let n = this.options.id ?? To(this.ghost);
			n && (zo(n), t = Uo(n)), t ? e = "recall" : this.hadContent && (e = "ghost");
		}
		e !== this.source && (e === "recall" && t ? this.snapshot.replaceChildren(So(t)) : e === "fallback" ? (this.snapshot.innerHTML = Wo, ko(`fallback:${this.options.id}`, `Nothing to draw a skeleton from${this.options.id ? ` for "${this.options.id}"` : ""}. Pass \`sample\` data, or an \`id\` so its shape is remembered after the first load. For a lone placeholder box, use \`SkeletonBox\`.`)) : this.snapshot.replaceChildren()), this.ghost.toggleAttribute(Fr, e !== "ghost"), this.snapshot.toggleAttribute(Fr, e === "ghost"), this.source = e, bi(this.root.closest(`[${Dr}]`), e === "recall" ? "remembered shape" : e === "fallback" ? "fallback" : this.options.exact ? "data" : Go.has(this.root) ? "server render" : "sample");
	}
	measure() {
		let e = this.source === "ghost" ? this.ghost : this.snapshot;
		Ma(this.layer, oa(e, this.layer));
		let t = this.root.closest(`[${Dr}]`);
		t && Ko.set(t, {
			width: this.root.offsetWidth,
			height: this.root.offsetHeight,
			guessed: !(this.options.exact && this.source === "ghost"),
			images: [...e.querySelectorAll("img")].map((e) => e.getBoundingClientRect().height)
		});
	}
	destroy() {
		cancelAnimationFrame(this.frame), this.mutations.disconnect(), this.resize?.disconnect(), this.root.removeEventListener("load", this.schedule, !0), removeEventListener("resize", this.schedule), oi();
	}
}, Zo = 250, Qo = class {
	constructor(e, t = {}) {
		this.element = e, this.options = t, this.key = t.id ?? To(e), this.untrack = this.key ? Ro(this.key, () => this.save()) : () => {}, (Do || vi(e)) && this.check(), this.save(), this.mutations = new MutationObserver(this.schedule), this.mutations.observe(e, {
			childList: !0,
			subtree: !0,
			characterData: !0
		}), this.resize = typeof ResizeObserver > "u" ? null : new ResizeObserver(this.schedule), this.resize?.observe(e), e.addEventListener("load", this.schedule, !0);
	}
	element;
	options;
	key;
	timer;
	mutations;
	resize;
	untrack;
	schedule = () => {
		clearTimeout(this.timer), this.timer = setTimeout(() => this.save(), Zo);
	};
	save() {
		clearTimeout(this.timer), this.key && this.element.isConnected && this.element.offsetHeight && Ho(this.key, this.element);
	}
	check() {
		let { data: e, id: t, rendered: n, sample: r } = this.options, i = t ? `<Skeleton id="${t}">` : "<Skeleton>", a = this.element.closest(`[${Dr}]`), o = qo(a);
		if (!o) return;
		o.guessed && n && !r && e != null && ko(`sample:${this.key}`, `${i} has no \`sample\`, so a first load guesses its shape${t ? "" : " and it can't be remembered"}. Pass this to make it exact:
  sample={${JSON.stringify(jo(e))}}`);
		let s = [...this.element.querySelectorAll("img")].filter((e) => !e.complete);
		Promise.all(s.map((e) => new Promise((t) => {
			e.addEventListener("load", t, { once: !0 }), e.addEventListener("error", t, { once: !0 });
		}))).then(() => {
			if (!this.element.isConnected) return;
			let e = this.element.offsetWidth, t = this.element.offsetHeight;
			if (xi(a, {
				width: e - o.width,
				height: t - o.height
			}), Math.abs(e - o.width) <= 1 && Math.abs(t - o.height) <= 1) return;
			let r = [...this.element.querySelectorAll("img")].filter((e, t) => (o.images[t] ?? 0) < 1 && e.getBoundingClientRect().height >= 1).map((e) => e.currentSrc.split("/").pop() || "an image");
			r.length ? ko(`unsized:${this.key}`, `${i}'s skeleton had no room for ${r.length === 1 ? "an image" : `${r.length} images`} (${r.slice(0, 3).join(", ")}${r.length > 3 ? ", …" : ""}), so the layout jumped when they loaded. Give each \`width\` and \`height\` attributes, or an \`aspect-ratio\`, so its space is known before it loads.`) : ko(`jump:${this.key}`, o.guessed ? `${i}'s skeleton was ${o.width}\xD7${o.height}px but its content is ${e}\xD7${t}px, so the layout jumped on reveal. ${n ? "Pass `sample` data shaped like the real thing" : "Pass an `id` so its shape is remembered"}, and give images a size.` : `${i}'s skeleton was drawn from the data on screen (${o.width}\xD7${o.height}px), but the new data is ${e}\xD7${t}px, so the layout jumped on reveal. When new data adds to what's shown \u2014 another page of a list \u2014 give the addition a reveal of its own.`);
		});
	}
	destroy() {
		this.save(), clearTimeout(this.timer), this.mutations.disconnect(), this.resize?.disconnect(), this.element.removeEventListener("load", this.schedule, !0), this.untrack();
	}
}, $o = () => {}, es = (e) => {
	if (e.loading !== "lazy") return !1;
	let t = e.getBoundingClientRect();
	return t.bottom < -innerHeight || t.top > innerHeight * 2;
}, ts = (e) => [...e.querySelectorAll("img")].filter((e) => !e.complete && !es(e));
function ns(e) {
	let t = e.complete ? Promise.resolve() : new Promise((t) => {
		e.addEventListener("load", () => t(), { once: !0 }), e.addEventListener("error", () => t(), { once: !0 });
	});
	return Promise.race([t.then(() => e.decode?.()).then($o, $o), new Promise((e) => setTimeout(e, Xr))]);
}
var rs = 360, is = 2, as = 600, os = 40, ss = os / Ca, cs = 320, ls = 120, us = .45, ds = (e) => e.left + e.top * Sa, fs = (e) => e.width + e.height * Sa, ps = (e, t) => ds(t) - ss + (fs(t) + 2 * ss) * e, ms = {
	start: -1 / 0,
	origin: 0,
	speed: 1
};
function hs(e) {
	let t = e.querySelector(`:scope > [${Ir}] [${Mr}]`), n = t && ka(t);
	if (!n) return null;
	let r = Qa(e);
	if (r.width * r.height > innerWidth * innerHeight * Ba) return null;
	let i = ds(r), a = i + fs(r), o = performance.now(), s = o - ms.start;
	s <= Ra && (i - ms.origin) / ms.speed >= s && (a - ms.origin) / ms.speed - s <= as || (ms = {
		start: o,
		origin: i,
		speed: Math.max(is / n, (a - i) / rs)
	});
	let { start: c, origin: l, speed: u } = ms;
	return {
		delay: (i - ss - l) / u - (o - c),
		duration: (a - i + 2 * ss) / u
	};
}
var gs = (e) => (t, { rect: n, reveal: r }) => {
	let i = (ps(t, r) - ds(n)) * Ca;
	return `linear-gradient(${wa}, ${Array.from({ length: $ + 1 }, (t, n) => {
		let r = e ? 1 - Ea(n / $) : Ea(n / $), a = -os + 2 * os * n / $;
		return `rgb(0 0 0 / ${r.toFixed(3)}) ${(i + a).toFixed(2)}px`;
	}).join(", ")})`;
}, _s = "http://www.w3.org/2000/svg", vs = null, ys = 0;
function bs() {
	return vs?.isConnected || (vs = document.createElementNS(_s, "svg"), vs.setAttribute("aria-hidden", "true"), vs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden", document.body.append(vs)), vs;
}
var xs = (e, t) => {
	let n = document.createElementNS(_s, e);
	for (let [e, r] of Object.entries(t)) n.setAttribute(e, String(r));
	return n;
}, Ss = {
	mask: gs(!0),
	out: gs(!1),
	effect: (e, { rect: t, reveal: n, progress: r }) => {
		if (ua()) return;
		let i = ds(t), a = fs(t), o = cs / 2 / Ca, s = () => ps(r(), n) - i - ls / Ca;
		if (s() - o > a) return;
		let c = 2 * o + t.height * Sa, l = c / 2, u = t.height / 2, d = cs / 2 * Ca, f = cs / 2 * Sa * Ca, p = document.createElement("canvas");
		p.width = Math.ceil(c), p.height = Math.ceil(t.height);
		let m = p.getContext("2d");
		if (!m) return;
		let h = m.createLinearGradient(l - d, u - f, l + d, u + f);
		for (let e = 0; e <= $; e++) {
			let t = e / $;
			h.addColorStop(t, `rgb(255 255 255 / ${Ea(1 - Math.abs(t * 2 - 1)).toFixed(3)})`);
		}
		m.fillStyle = h, m.fillRect(0, 0, p.width, p.height);
		let g = `skullet-gloss-${++ys}`, _ = xs("filter", {
			id: g,
			"color-interpolation-filters": "sRGB",
			primitiveUnits: "objectBoundingBox"
		}), v = xs("feComponentTransfer", {
			in: "SourceGraphic",
			result: "lit"
		});
		for (let e of [
			"R",
			"G",
			"B"
		]) v.append(xs(`feFunc${e}`, {
			type: "linear",
			slope: 1 - us,
			intercept: us
		}));
		let y = xs("feImage", {
			href: p.toDataURL(),
			y: 0,
			width: c / t.width,
			height: 1,
			preserveAspectRatio: "none",
			result: "band"
		});
		_.append(v, y, xs("feComposite", {
			in: "lit",
			in2: "band",
			operator: "in",
			result: "shine"
		}), xs("feComposite", {
			in: "shine",
			in2: "SourceGraphic",
			operator: "over"
		})), bs().append(_), e.style.filter = `url(#${g})`;
		let b = () => {
			let n = s();
			n - o > a || !e.isConnected ? (e.style.filter.includes(g) && (e.style.filter = ""), _.remove()) : (y.setAttribute("x", ((n - l - u * Sa) / t.width).toFixed(4)), requestAnimationFrame(b));
		};
		b();
	}
}, Cs = {
	together: co,
	sequence: lo,
	smart: po,
	sweep: {
		hold: Na,
		choose: (e) => {
			let t = uo(e);
			if (t) return t;
			let n = hs(e.reveal);
			return n ? {
				wipe: Ss,
				...n
			} : fo(e);
		}
	}
}, ws = (e = "smart") => typeof e == "string" ? Cs[e] : e, Ts = () => {}, Es = (e) => e.finished.then(Ts, Ts), Ds = /* @__PURE__ */ new WeakMap();
function Os(e, t = 0, n = 200, r = 0, i) {
	return la() ? Promise.resolve() : Es(e.animate([{
		...i,
		opacity: r
	}, { opacity: 1 }], {
		duration: n,
		delay: t,
		easing: "ease",
		fill: "backwards"
	}));
}
var ks = (e) => !!e.querySelector(`[${Mr}], [${Ar}], :scope > [${Rr}]`), As = (e, t) => Math.abs(e.left - t.left) < 2 && Math.abs(e.top - t.top) < 2 && Math.abs(e.width - t.width) < 2 && Math.abs(e.height - t.height) < 2, js = /* @__PURE__ */ new WeakMap();
function Ms(e) {
	for (let t of js.get(e) ?? []) t.remove();
	js.delete(e);
}
function Ns(e, t) {
	let n = ts(e), r = [...t.children].some((t) => t !== e && t.hasAttribute("skullet-pane") && ks(t));
	if (n.length && r) {
		for (let e of n) e.style.opacity = "0";
		queueMicrotask(() => {
			if (!e.isConnected) return;
			let r = t.getBoundingClientRect(), i = [...t.querySelectorAll(`:scope > [${Ir}] [${Mr}]`)].flatMap(ja), a = js.get(t) ?? /* @__PURE__ */ new Set();
			js.set(t, a);
			for (let e of n) {
				let n = e.getBoundingClientRect(), o = i.find((e) => As(e.getBoundingClientRect(), n)), s = o?.getBoundingClientRect() ?? n, c = document.createElement("div");
				c.setAttribute(Nr, ""), Object.assign(c.style, {
					position: "absolute",
					left: `${s.left - r.left - t.clientLeft}px`,
					top: `${s.top - r.top - t.clientTop}px`,
					width: `${s.width}px`,
					height: `${s.height}px`,
					borderRadius: o?.style.borderRadius || getComputedStyle(e).borderRadius,
					backgroundColor: Kr,
					backgroundRepeat: "no-repeat",
					pointerEvents: "none"
				}), t.append(c), a.add(c), o && (o.style.visibility = "hidden"), Oa(c), ns(e).then(() => {
					if (a.has(c)) {
						if (a.delete(c), e.style.opacity = "", Os(e), la()) return c.remove();
						Es(c.animate([{ opacity: 1 }, { opacity: 0 }], {
							duration: 200,
							easing: "ease",
							fill: "forwards"
						})).then(() => c.remove());
					}
				});
			}
		});
	}
}
function Ps(e, t) {
	return la() ? Promise.resolve() : Promise.all(Ya(e).map((e) => {
		let n = t.pieceDelay(e);
		if (n !== null) return Os(e, n, t.duration, 0, t.enter);
	})).then(Ts);
}
function Fs(e) {
	for (let t of e.querySelectorAll(`:scope > [${Ir}]`)) {
		for (let e of da(t)) e.finish();
		t.style.opacity = "0";
	}
}
function Is(e) {
	let t = 0;
	for (let n of e.querySelectorAll(`:scope > [${Ir}]`)) if (!ks(n)) {
		t = Math.max(t, parseFloat(getComputedStyle(n).opacity) || 0);
		for (let e of da(n)) e.finish();
		n.style.opacity = "0";
	}
	return t;
}
function Ls(e, t = "smart", { initial: n = !1 } = {}) {
	let r = Rs.get(e);
	return r || (r = zs(e, t, n), Rs.set(e, r)), r;
}
var Rs = /* @__PURE__ */ new WeakMap();
function zs(e, t, n) {
	let r = e.parentElement, i = ws(t);
	if (ks(e)) {
		r && Ms(r);
		let t = Math.max(i.hold ?? 0, 0);
		return t ? (r && Ds.set(r, {
			kind: "skeleton",
			hold: t
		}), n ? Promise.resolve() : Os(e, t)) : (r && Ds.delete(r), n ? Promise.resolve() : Os(e));
	}
	if (n || !r) return Promise.resolve();
	let a = Is(r);
	if (a > .01) {
		let t = 200 * (1 - a);
		return Ds.set(r, {
			kind: "together",
			delay: 0,
			duration: t
		}), Os(e, 0, t, a);
	}
	Ns(e, r);
	let o = ro(e, r, i, (e) => ko(`enter:${e}`, `\`enter\` can't set \`${e}\`: only properties that change nothing's layout animate, so the reveal never moves the page.`));
	return Ds.set(r, o), o.kind === "instant" ? (Fs(r), Promise.resolve()) : o.kind === "sequence" ? Ps(e, o) : o.kind === "wipe" ? Qs(e, o, !0) : Os(e, o.delay, o.duration, 0, o.enter);
}
function Bs(e) {
	let t = e.getBoundingClientRect(), n = e.offsetParent ?? document.documentElement, r = n.getBoundingClientRect();
	return {
		top: t.top - r.top - n.clientTop,
		left: t.left - r.left - n.clientLeft,
		width: t.width,
		height: t.height
	};
}
function Vs(e, t = Bs(e)) {
	return Object.assign(e.style, {
		position: "absolute",
		top: `${t.top}px`,
		left: `${t.left}px`,
		width: `${t.width}px`,
		height: `${t.height}px`,
		margin: "0",
		boxSizing: "border-box",
		pointerEvents: "none"
	}), e.inert = !0, e.setAttribute(Ir, ""), t;
}
var Hs = /* @__PURE__ */ new WeakMap();
function Us(e, t) {
	let n = e.querySelector(`:scope > [${Or}]:not([${Ir}])`);
	if (!n) return;
	let r = Hs.get(e), i = e.getBoundingClientRect().height;
	r?.animation.cancel();
	let a = e.getBoundingClientRect().height, o = r ? i : a - n.getBoundingClientRect().height + t.height;
	if (Math.abs(o - a) < .5) {
		r && Ws(e, r);
		return;
	}
	let { overflow: s, boxSizing: c } = r ?? e.style;
	Object.assign(e.style, {
		overflow: "clip",
		boxSizing: "border-box"
	});
	let l = e.animate([{ height: `${o}px` }, { height: `${a}px` }], {
		duration: Yr,
		easing: "cubic-bezier(0.2, 0, 0, 1)"
	}), u = {
		animation: l,
		overflow: s,
		boxSizing: c
	};
	Hs.set(e, u), Es(l).then(() => {
		Hs.get(e) === u && Ws(e, u);
	});
}
function Ws(e, { overflow: t, boxSizing: n }) {
	Hs.delete(e), Object.assign(e.style, {
		overflow: t,
		boxSizing: n
	});
}
function Gs(e, t) {
	let n = parseFloat(getComputedStyle(e).opacity), r = Number.isNaN(n) ? 1 : n;
	for (let t of da(e)) t.cancel();
	Zs(e), e.style.filter = "";
	let i = e.parentElement;
	i && !ks(e) && Ms(i);
	let a = Vs(e, t), o = (t, n) => ca() ? Es(e.animate([{ opacity: r }, { opacity: 0 }], {
		duration: n * r,
		delay: t,
		easing: "ease",
		fill: "forwards"
	})) : (e.style.opacity = "0", Promise.resolve());
	return Promise.resolve().then(() => {
		let t = i && Ds.get(i), n = la() || t?.kind === "instant";
		if (i && !n && Us(i, a), t?.kind === "skeleton") return o(t.hold, 200);
		if (n) e.style.opacity = "0";
		else return t?.kind === "sequence" && ks(e) ? Ks(e, t) : t?.kind === "wipe" && ks(e) ? Qs(e, t, !1) : t?.kind === "together" ? o(t.delay, t.duration) : o(0, 200);
	});
}
function Ks(e, t) {
	for (let t of e.querySelectorAll(`[${Ar}], [${jr}]`)) t.style.visibility = "hidden";
	let n = [...e.querySelectorAll(`[${Ar}] [${Rr}]`)].filter((e) => !e.parentElement?.closest(`[${Rr}]`));
	for (let e of n) e.style.visibility = "visible";
	let r = [...[...e.querySelectorAll(`[${Mr}]`)].flatMap(ja), ...n];
	return Promise.all(r.map((e) => {
		let n = e.getBoundingClientRect(), r = (n) => Es(e.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: t.duration,
			delay: n,
			easing: "ease",
			fill: "forwards"
		})), i = t.boneDelay(n);
		if (i === null) e.style.opacity = "0";
		else return r(i);
	})).then(Ts);
}
var qs = 100, Js = /* @__PURE__ */ new WeakMap();
function Ys(e, t) {
	e.style.setProperty("mask-image", t), e.style.setProperty("-webkit-mask-image", t);
}
function Xs(e, t) {
	Ys(e, `linear-gradient(#000 0 0), ${t}`), e.style.setProperty("-webkit-mask-composite", "xor"), e.style.setProperty("mask-composite", "exclude");
}
function Zs(e) {
	Js.get(e)?.();
	for (let t of [
		"mask-image",
		"-webkit-mask-image",
		"mask-composite",
		"-webkit-mask-composite"
	]) e.style.removeProperty(t);
}
function Qs(e, t, n) {
	let r = {
		rect: e.getBoundingClientRect(),
		reveal: t.reveal
	}, { mask: i, out: a } = t.wipe, o = (t) => {
		n ? Ys(e, i(t, r)) : a ? Ys(e, a(t, r)) : Xs(e, i(t, r));
	}, s = () => (performance.now() - t.start) / t.duration;
	return s() >= 1 ? (n || (e.style.opacity = "0"), Promise.resolve()) : (n && (t.wipe.effect?.(e, {
		...r,
		progress: s
	}), t.enter && e.animate([t.enter, {}], {
		duration: t.duration,
		delay: Math.max(t.start - performance.now(), 0),
		easing: "ease",
		fill: "backwards"
	})), new Promise((n) => {
		let r = 0, i = performance.now(), a = 0, c = () => {
			let e = performance.now();
			if (e - i > qs && (t.stalled = !0), i = e, t.stalled) return l(a);
			a = Math.min(Math.max(s(), 0), 1), o(a), a < 1 ? r = requestAnimationFrame(c) : l(null);
		}, l = (t = null) => {
			cancelAnimationFrame(r), clearTimeout(u), Js.delete(e), n(t);
		}, u = setTimeout(() => l(null), Math.max(t.start + t.duration - performance.now(), 0) + qs);
		Js.set(e, l), c();
	}).then((t) => {
		if (Zs(e), t === null) {
			n || (e.style.opacity = "0");
			return;
		}
		let r = 200 * (1 - t);
		return n ? Os(e, 0, r, t) : Es(e.animate([{ opacity: 1 - t }, { opacity: 0 }], {
			duration: r,
			easing: "ease",
			fill: "forwards"
		})).then(() => {
			e.style.opacity = "0";
		});
	}));
}
// node_modules/skullet/dist/react/index.mjs
var $s = X.createContext({}), ec = X.createContext(null), tc = () => X.useContext($s), nc = () => X.useContext(ec), rc = () => tc().reveal;
function ic({ children: e, ...t }) {
	let { debug: n, theme: r, mode: i, text: a, nonce: o } = t, s = di({
		theme: r,
		mode: i,
		text: a
	}), [c] = X.useState(() => ({ sent: !1 }));
	return X.useEffect(() => {
		n !== void 0 && yi(n);
	}, [n]), (0, Z.jsx)($s.Provider, {
		value: t,
		children: (0, Z.jsxs)(ec.Provider, {
			value: c,
			children: [s && (0, Z.jsx)("style", {
				nonce: o,
				children: s
			}), e]
		})
	});
}
var ac = typeof window > "u" ? X.useEffect : X.useLayoutEffect, oc = () => X.useInsertionEffect(() => (ai(), oi), []), sc = Number("19.3.1".split(".")[0]) >= 19, cc = () => {
	let { nonce: e } = tc();
	return sc ? (0, Z.jsx)("style", {
		href: "skullet",
		precedence: "medium",
		nonce: e,
		children: ti
	}) : null;
}, lc = sc ? { inert: !0 } : { inert: "" }, uc = (e) => X.Children.map(e, (e) => {
	if (!X.isValidElement(e)) return e;
	let t = e.type.Skeleton;
	return t ? (0, Z.jsx)("span", {
		[Rr]: "",
		children: (0, Z.jsx)(t, { ...e.props })
	}) : e.props.children && typeof e.props.children != "function" ? X.cloneElement(e, void 0, uc(e.props.children)) : e;
}), dc = () => () => {}, fc = () => X.useSyncExternalStore(dc, () => !1, () => !0), pc = ({ children: e, id: t, exact: n, refetch: r, label: i }) => {
	let a = X.useRef(null), { nonce: o } = tc(), s = nc(), c = fc(), l = si;
	return c && s && (s.sent && (l = "(s=>{let k=Symbol.for(\"skullet.boot\"),b=self[k];typeof b==\"function\"?b(s):(self[k]=b||[]).push(s)})(document.currentScript)"), s.sent = !0), ac(() => {
		if (!a.current) return;
		let e = new Xo(a.current, {
			id: t,
			exact: n,
			refetch: r
		});
		return () => e.destroy();
	}, [
		t,
		n,
		r
	]), (0, Z.jsxs)(Z.Fragment, { children: [
		i && (0, Z.jsx)("span", {
			"skullet-status": "",
			children: i
		}),
		(0, Z.jsxs)("div", {
			ref: a,
			[kr]: "",
			"aria-hidden": !0,
			...lc,
			children: [
				(0, Z.jsx)("div", {
					[Ar]: "",
					children: uc(e)
				}),
				(0, Z.jsx)("div", { [jr]: "" }),
				(0, Z.jsx)("div", { [Mr]: "" })
			]
		}),
		c && (0, Z.jsx)("script", {
			nonce: o,
			suppressHydrationWarning: !0,
			dangerouslySetInnerHTML: { __html: l }
		})
	] });
}, mc = ({ children: e, id: t, registry: n, enter: r, exiting: i, onExited: a, memory: o, onEntered: s }) => {
	let c = X.useRef(null), l = rc();
	return ac(() => {
		if (!c.current) return;
		let e = {
			element: c.current,
			memory: null
		};
		return n.set(t, e), Ls(c.current, l, { initial: !r }).then(s), o && (e.memory = new Qo(c.current, o)), () => {
			e.memory?.destroy(), n.delete(t);
		};
	}, []), ac(() => {
		!i || !c.current || Gs(c.current, n.get(t)?.box).then(a);
	}, [i]), (0, Z.jsx)("div", {
		ref: c,
		[Or]: "",
		children: e
	});
}, hc = class extends X.Component {
	getSnapshotBeforeUpdate(e) {
		for (let t of this.props.exiting) {
			if (e.exiting.includes(t)) continue;
			let n = this.props.registry.get(t);
			n && (n.memory?.save(), n.box = Bs(n.element));
		}
		return null;
	}
	componentDidUpdate() {}
	render() {
		return this.props.children;
	}
};
function gc(e) {
	let { id: t, label: n, skeleton: r, empty: i, emptyMessage: a, error: o, className: s, style: c } = e;
	oc();
	let l = typeof e.children == "function" ? e.children : null, u = l ? e.data : void 0, d = l ? e.sample : void 0, f = l ? null : e.children, p = X.useRef(null);
	ac(() => {
		u != null && (p.current = {
			id: t,
			data: u
		});
	});
	let m = (e) => l ? e == null ? null : l(e) : f, h = !!e.loading || !!l && u == null && !o && !i, g, _, v;
	if (h) {
		let e = p.current, i = u ?? (e && e.id === t ? e.data : null);
		g = "skeleton", _ = r ? (0, Z.jsx)("div", {
			[Rr]: "",
			"aria-hidden": !0,
			children: r
		}) : (0, Z.jsx)(pc, {
			id: t,
			exact: i != null,
			refetch: u != null,
			label: n,
			children: m(i ?? d)
		});
	} else o ? (g = "error", _ = o) : i ? (g = "empty", _ = a ?? m(u)) : (g = "content", _ = m(u), v = {
		id: t,
		data: u,
		rendered: !!l,
		sample: d !== void 0
	});
	let [y, b] = X.useState({
		id: 0,
		key: g
	}), [ee, x] = X.useState([]), S = X.useRef(/* @__PURE__ */ new Map()).current, te = X.useRef(_);
	if (ac(() => {
		te.current = _;
	}), y.key !== g) {
		let e = {
			id: y.id,
			node: te.current
		};
		x((t) => t.some((t) => t.id === e.id) ? t : [...t, e]), b({
			id: y.id + 1,
			key: g,
			from: y.key
		});
	}
	let C = X.useRef(e.onReveal);
	ac(() => {
		C.current = e.onReveal;
	});
	let w = y.key === "content" && y.from === "skeleton" ? () => C.current?.() : void 0, ne = (e) => x((t) => t.filter((t) => t.id !== e)), re = [...ee.map((e) => (0, Z.jsx)(mc, {
		id: e.id,
		registry: S,
		enter: !1,
		exiting: !0,
		onExited: () => ne(e.id),
		children: e.node
	}, e.id)), (0, Z.jsx)(mc, {
		id: y.id,
		registry: S,
		enter: y.id > 0,
		exiting: !1,
		onExited: () => {},
		memory: v,
		onEntered: w,
		children: _
	}, y.id)];
	return (0, Z.jsxs)("div", {
		[Dr]: "",
		"aria-busy": g === "skeleton" || void 0,
		className: s,
		style: c,
		children: [(0, Z.jsx)(cc, {}), (0, Z.jsx)(hc, {
			exiting: ee.map((e) => e.id),
			registry: S,
			children: re
		})]
	});
}
// src/react/follow-manage/measured-reading.tsx
var _c = {
	creators: [Y("follow:followOverview.creators"), Y("follow:followOverview.creatorUnit")],
	enabled: [Y("follow:followOverview.enabledSources"), ""],
	failed: [Y("follow:followCheck.checkFailed"), Y("follow:followOverview.sourceUnit")],
	updates: [Y("follow:followOverview.unwatchedUpdates"), Y("follow:followOverview.itemUnit")],
	subscriptions: [Y("follow:feedSources.footerLabel"), Y("follow:followOverview.actressUnit")],
	releases: [Y("follow:followOverview.unwatchedReleases"), Y("follow:followOverview.itemUnit")]
}, vc = {
	duration: 0,
	delay: 0,
	hold: 150
}, yc;
function bc() {
	return yc || (yc = new CSSStyleSheet(), yc.replaceSync("\n      @keyframes peach-skeleton-sweep { to { transform: translateX(-50%); } }\n      [skullet-rect] { overflow: hidden; }\n      [skullet-rect]::after {\n        content: ''; position: absolute; inset: 0; right: -200%; border-radius: inherit;\n        background: linear-gradient(to right, var(--skullet-base), var(--skullet-highlight) 50%, var(--skullet-base));\n        background-size: 50% 100%; animation: peach-skeleton-sweep 1.5s ease-in-out infinite reverse;\n      }\n      @media (prefers-reduced-motion: reduce) { [skullet-rect]::after { animation: none; } }\n    ")), yc;
}
function xc({ figure: e, unit: t }) {
	return /* @__PURE__ */ (0, Z.jsxs)("b", {
		"data-follow-reading": "",
		className: `flex min-w-0 flex-wrap items-baseline gap-x-1 tabular-nums text-text-primary ${e >= 1e6 ? "text-headline-medium" : e >= 1e5 ? "text-title-3-medium" : "text-title-1-medium"}`,
		children: [/* @__PURE__ */ (0, Z.jsx)("span", { children: e.toLocaleString() }), /* @__PURE__ */ (0, Z.jsx)("small", {
			className: "whitespace-nowrap text-body-2-regular text-text-secondary",
			children: ` ${t}`
		})]
	});
}
function Sc({ field: e, figure: t, total: n, failed: r = !1 }) {
	let [i, a] = _c[e], o = (0, X.useRef)(null);
	return (0, X.useLayoutEffect)(() => {
		let e = [...o.current.querySelectorAll("[skullet-layer]")].map((e) => e.shadowRoot).filter((e) => !!e);
		if (!e.length) return;
		let t = bc();
		for (let n of e) n.adoptedStyleSheets = [...n.adoptedStyleSheets, t];
		return () => {
			for (let n of e) n.adoptedStyleSheets = n.adoptedStyleSheets.filter((e) => e !== t);
		};
	}, [t, r]), /* @__PURE__ */ (0, Z.jsxs)("div", {
		ref: o,
		"data-measured-reading": e,
		className: Pe({
			padding: "none",
			className: "flex flex-col justify-between gap-3 px-6 py-5 max-sm:gap-2 max-sm:p-4"
		}),
		children: [/* @__PURE__ */ (0, Z.jsx)("span", {
			className: "text-body-medium text-text-secondary",
			children: i
		}), t === void 0 && r ? /* @__PURE__ */ (0, Z.jsx)("b", {
			"data-follow-reading": "",
			className: "text-title-1-medium text-text-primary",
			children: Y("follow:shared.notFound")
		}) : /* @__PURE__ */ (0, Z.jsx)(ic, {
			reveal: vc,
			children: /* @__PURE__ */ (0, Z.jsx)(gc, {
				id: `peach:follow-reading:v1:${e}`,
				data: t,
				sample: 12345,
				label: Y("follow:followOverview.loading", { term: i }),
				children: (t) => /* @__PURE__ */ (0, Z.jsx)(xc, {
					figure: t,
					unit: e === "enabled" ? `/ ${n ?? 0}` : a
				})
			})
		})]
	});
}
// src/react/follow-manage/follow-manage-page.tsx
var Cc = (e) => ae.some(([t]) => t === e);
function wc(e) {
	let { route: t, savePreference: n, toast: r, openFollow: i, readOnly: a, readOnlyMessage: o, writerUrl: s } = e, [d, f] = (0, X.useState)(Cc(e.tab) ? e.tab : "list"), [p, m] = (0, X.useState)(Math.max(1, Math.floor(e.page) || 1)), [h, g] = (0, X.useState)(() => jt(e.sort, e.dir).sort), [_, v] = (0, X.useState)(() => jt(e.sort, e.dir).dir), [y, b] = (0, X.useState)(K(e.layout) ? e.layout : "default"), [ee, x] = (0, X.useState)(bt(e.pageSize)), [S, C] = (0, X.useState)(/* @__PURE__ */ new Set()), [re, ie] = (0, X.useState)(/* @__PURE__ */ new Set()), oe = tn(() => {
		C(/* @__PURE__ */ new Set()), ie(/* @__PURE__ */ new Set());
	});
	(0, X.useEffect)(() => {
		(S.size || re.size) && $e();
	}, [S, re]);
	let D = nn({
		queryKey: E,
		queryFn: ({ signal: e }) => ot(e)
	}), O = nn({
		queryKey: T,
		queryFn: ({ signal: e }) => it(e)
	}), k = nn({
		queryKey: ne,
		queryFn: ({ signal: e }) => at(e)
	}), A = D.data || { sources: [] }, j = O.data || {
		root: "",
		providers: []
	}, M = A.sources;
	(0, X.useEffect)(() => {
		C((e) => {
			let t = mt(e, M);
			return t.size === e.size ? e : t;
		});
	}, [M]);
	let N = (e) => {
		let n = e.sort ?? h, r = e.dir ?? _;
		t({
			tab: e.tab ?? d,
			page: e.page ?? p,
			sort: n === "checked" ? "" : n,
			dir: r === R[n] ? "" : r
		});
	}, se = dt(M), ce = M.filter(ft).length, P = M.filter((e) => e.enabled).length, le = (j.providers || []).filter((e) => e.requirement === "required" && !Ye(e)).length, F = new Set((k.data?.sources || []).map((e) => e.entity_id ?? `source-${e.id}`)).size, ue = !(!D.data || !k.data || M.length || F);
	return /* @__PURE__ */ (0, Z.jsxs)(mn, { children: [
		a ? /* @__PURE__ */ (0, Z.jsx)(I, {
			tone: "warning",
			title: Y("follow:followManagePage.readOnly"),
			extra: s ? /* @__PURE__ */ (0, Z.jsx)("p", {
				className: "text-body-2-regular",
				children: /* @__PURE__ */ (0, Z.jsx)(w, {
					href: s,
					children: Y("follow:followManagePage.goToPrimary")
				})
			}) : void 0,
			children: o
		}) : null,
		/* @__PURE__ */ (0, Z.jsxs)("div", {
			className: z,
			"aria-label": Y("follow:followManagePage.overview"),
			children: [
				/* @__PURE__ */ (0, Z.jsx)(Sc, {
					field: "creators",
					figure: D.data ? se.length : void 0,
					failed: D.isError
				}),
				/* @__PURE__ */ (0, Z.jsx)(Sc, {
					field: "enabled",
					figure: D.data ? P : void 0,
					total: M.length,
					failed: D.isError
				}),
				/* @__PURE__ */ (0, Z.jsx)(Sc, {
					field: "failed",
					figure: D.data ? ce : void 0,
					failed: D.isError
				}),
				/* @__PURE__ */ (0, Z.jsx)(Sc, {
					field: "updates",
					figure: D.data ? A.counts?.new || 0 : void 0,
					failed: D.isError
				}),
				/* @__PURE__ */ (0, Z.jsx)(Sc, {
					field: "subscriptions",
					figure: k.data ? F : void 0,
					failed: k.isError
				}),
				/* @__PURE__ */ (0, Z.jsx)(Sc, {
					field: "releases",
					figure: k.data ? k.data.unread || 0 : void 0,
					failed: k.isError
				})
			]
		}),
		/* @__PURE__ */ (0, Z.jsxs)("div", {
			className: "flex flex-col gap-6",
			children: [
				/* @__PURE__ */ (0, Z.jsx)("div", {
					"data-section-nav": !0,
					children: /* @__PURE__ */ (0, Z.jsx)(ve, {
						group: "follow",
						label: Y("follow:followManagePage.sectionTabs"),
						value: d,
						panelPrefix: "follow",
						sectionItems: !0,
						tabs: ae.map(([e, t]) => ({
							value: e,
							label: t
						})),
						className: "",
						itemClassName: "cursor-pointer whitespace-nowrap",
						onChange: (e) => {
							C(/* @__PURE__ */ new Set()), ie(/* @__PURE__ */ new Set()), f(e), N({ tab: e });
						}
					})
				}),
				d === "list" ? /* @__PURE__ */ (0, Z.jsxs)("div", {
					role: "tabpanel",
					id: "follow-panel-list",
					"aria-labelledby": "follow-tab-list",
					className: "flex flex-col gap-4",
					children: [
						ue ? /* @__PURE__ */ (0, Z.jsx)(te, {
							icon: u,
							title: Y("follow:sourceList.empty"),
							actions: a ? void 0 : /* @__PURE__ */ (0, Z.jsx)(c, {
								variant: "primary",
								size: "small",
								onClick: () => {
									f("add"), N({ tab: "add" });
								},
								children: Y("follow:followFeed.addFollow")
							}),
							children: Y("follow:followManagePage.emptyBody")
						}) : null,
						!ue && D.data && (!k.data || F > 0) ? /* @__PURE__ */ (0, Z.jsx)(mr, {
							readOnly: a,
							toast: r,
							selection: {
								ids: re,
								onChange: ie,
								onActivate: () => C(/* @__PURE__ */ new Set())
							}
						}) : null,
						D.data ? M.length > 0 && /* @__PURE__ */ (0, Z.jsx)(Er, {
							data: A,
							sort: h,
							dir: _,
							page: p,
							layout: y,
							pageSize: ee,
							selected: S,
							selecting: oe,
							readOnly: a,
							toast: r,
							openFollow: i,
							onSort: (e, t) => {
								g(e), v(t), m(1), N({
									sort: e,
									dir: t,
									page: 1
								});
							},
							onPage: (e) => {
								m(e), N({ page: e });
							},
							onSelected: (e) => {
								C(e), ie(/* @__PURE__ */ new Set());
							},
							onLayout: (e) => {
								b(e), m(1), n({ layout: e }), N({ page: 1 });
							},
							onPageSize: (e) => {
								x(e), m(1), n({ pageSize: e }), N({ page: 1 });
							}
						}) : D.isError ? /* @__PURE__ */ (0, Z.jsx)(I, {
							tone: "error",
							title: Y("follow:followManagePage.listFailed"),
							action: /* @__PURE__ */ (0, Z.jsx)(c, {
								variant: "secondary",
								size: "small",
								onClick: () => void D.refetch(),
								children: Y("catalog:shared.retryNow")
							}),
							children: W(D.error)
						}) : /* @__PURE__ */ (0, Z.jsx)("div", {
							role: "status",
							"aria-label": Y("follow:followManagePage.listLoading"),
							"data-skeleton": "",
							children: /* @__PURE__ */ (0, Z.jsx)("div", {
								"aria-hidden": "true",
								inert: !0,
								dangerouslySetInnerHTML: { __html: ut({
									followLayout: y,
									followSort: h,
									followDir: _,
									followPageSize: ee
								}) }
							})
						})
					]
				}) : null,
				d === "add" ? /* @__PURE__ */ (0, Z.jsxs)("div", {
					role: "tabpanel",
					id: "follow-panel-add",
					"aria-labelledby": "follow-tab-add",
					className: "flex flex-col gap-8",
					children: [
						O.data && D.data ? /* @__PURE__ */ (0, Z.jsx)(Fn, {
							data: A,
							credentials: j,
							readOnly: a,
							toast: r
						}) : O.isError || D.isError ? /* @__PURE__ */ (0, Z.jsxs)(Z.Fragment, { children: [O.isError ? /* @__PURE__ */ (0, Z.jsx)(I, {
							tone: "error",
							title: Y("follow:followManagePage.credentialsFailed"),
							action: /* @__PURE__ */ (0, Z.jsx)(c, {
								variant: "secondary",
								size: "small",
								onClick: () => void O.refetch(),
								children: Y("catalog:shared.retryNow")
							}),
							children: W(O.error)
						}) : null, D.isError ? /* @__PURE__ */ (0, Z.jsx)(I, {
							tone: "error",
							title: Y("follow:followManagePage.listFailed"),
							action: /* @__PURE__ */ (0, Z.jsx)(c, {
								variant: "secondary",
								size: "small",
								onClick: () => void D.refetch(),
								children: Y("catalog:shared.retryNow")
							}),
							children: W(D.error)
						}) : null] }) : /* @__PURE__ */ (0, Z.jsx)("div", {
							role: "status",
							"aria-label": Y("follow:followManagePage.credentialsLoading"),
							"data-skeleton": "",
							className: "skeleton-sheen h-32 rounded-lg"
						}),
						/* @__PURE__ */ (0, Z.jsx)(Un, {
							readOnly: a,
							toast: r,
							initialName: new URLSearchParams(location.search).get("performer") || "",
							onAdded: () => {
								k.refetch(), f("list"), N({ tab: "list" });
							}
						}),
						D.data ? /* @__PURE__ */ (0, Z.jsx)(nr, {
							groups: A.author_aliases || [],
							readOnly: a,
							toast: r,
							suggestions: A.alias_suggestions || [],
							sources: A.sources
						}) : null
					]
				}) : null
			]
		}),
		/* @__PURE__ */ (0, Z.jsx)("div", { children: /* @__PURE__ */ (0, Z.jsx)(l, {
			variant: "secondary",
			href: "/settings/subscriptions",
			children: le ? Y("follow:followManagePage.feedSettingsPending", { count: le }) : Y("follow:followManagePage.feedSettings")
		}) })
	] });
}
export { wc as FollowManagePage };

//# debugId=915c9081-9c54-4d62-9869-27f9f1d9a0ad
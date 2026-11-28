(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "7a50a210-480c-465c-9767-46d4df835193", e._sentryDebugIdIdentifier = "sentry-dbid-7a50a210-480c-465c-9767-46d4df835193");
	} catch {}
})();
import { $ea3928288112382f$export$439d29a4e110a164 as e, $fe21c36db05242bb$export$d7b12c4107be0d61 as t, Button as n, ButtonLink as r, Checkbox as i, CheckboxGlyph as a, Chip as o, CollapseChevron as s, CollapseRegion as c, DEFAULT_CATEGORY as l, DataTable as u, DataTableFooter as d, ENTITY_REVIEW_KINDS as ee, Ea as te, EmptyState as f, ExternalLink as ne, FIELDSET_FOOT as re, FilterGlassRows as p, FilterSearch as m, Gg as h, InputBase as g, LEGACY_AVATAR_IMG as _, LinkButton as ie, Note as v, REVIEW_CATEGORIES as ae, REVIEW_DECISION_LABELS as oe, REVIEW_KEY as y, REVIEW_LABELS as b, REVIEW_QUEUES as x, REVIEW_QUEUE_LABELS as S, RadioDot as C, RadioGroup as w, Select as T, SelectItem as E, SelectionActions as D, SelectionDock as se, SortableBoardTabs as O, TextField as k, Wt as A, Xf as ce, Yt as le, __toESM as j, apiGet as M, apiSend as N, avatarInner as ue, b1 as P, busyProps as F, canApprove as de, cardClass as fe, codedText as I, commonReviewSources as pe, composingKey as me, currentReviewRow as he, cx as L, decisionPayload as ge, decisionReceipt as _e, defaultChoice as ve, enterPageSelection as ye, errorMessage as R, exitPageSelection as z, fetchReview as be, filterReviewRows as xe, gB as Se, groupReviewRows as Ce, isReviewCategory as we, joinList as Te, l7 as Ee, localTime as B, m7 as De, mirrorText as Oe, pendingGenres as V, queryClient as ke, quoted as H, recordGenre as Ae, reloadReview as je, require_jsx_runtime as Me, require_react as Ne, reviewGroupingOptions as Pe, reviewQueueData as Fe, reviewQueueOf as Ie, reviewWindow as Le, rowEvidence as Re, rowFieldName as U, rowSelectionOperation as ze, rowSubject as W, rowTags as Be, rowTitle as Ve, s7 as He, selectReviewRange as Ue, serverLabel as We, serverLabelList as Ge, settleReviewRows as Ke, submitDecision as qe, t as G, useMutation as Je, useNavigationOrder as Ye, useOverlayScrollbar as Xe, usePageSelection as Ze, useQuery as Qe, useRectangleSelection as $e, useViewGlide as et, useWorkContextMenu as tt } from "./peach-app.js";
import { Page as nt } from "./peach-app.page-QAncjzM1.js";
import { ComparisonText as K } from "./peach-app.comparison-text-CyF--PA8.js";
// src/react/review/auto-landings.ts
var q = /* @__PURE__ */ j(Ne(), 1), rt = "/api/review/auto-landings", J = "/api/review/auto-landings/revert", it = ["review", "auto-landings"], Y = (e) => We(e.field_code ?? "", e.field), X = (e) => We(e.label_code ?? "", e.label), at = (e) => M(rt, e), ot = (e) => M(`${rt}?items=${encodeURIComponent(e.join("\n"))}`), st = (e, t) => N(J, {
	items: e,
	token: t
}), Z = (e) => e.at === null ? "" : B((/* @__PURE__ */ new Date(e.at * 1e3)).toISOString()), Q = (e) => e.code || e.name || (e.asset_id ? `#${e.asset_id}` : G("manage:autoLandings.unknownVideo")), ct = (e) => e ? H(e) : G("manage:autoLandings.emptyValue"), lt = (e) => e.tags.length ? Te(e.tags) : e.value, ut = (e) => e.tags.length ? G("manage:autoLandings.existingTagsKept") : G("manage:autoLandings.previousValue", { value: e.previous.length ? Te(e.previous.map(ct)) : G("manage:autoLandings.emptyValue") });
function dt(e) {
	return [
		...e.restores.map((e) => G("manage:autoLandings.previewRestore", {
			video: Q(e),
			field: Y(e),
			current: ct(e.current),
			previous: ct(e.previous)
		})),
		...e.tags.map((e) => G("manage:autoLandings.previewRemoveTag", {
			video: Q(e),
			tag: e.tag
		})),
		...e.changed.map((e) => e.gone ? G("manage:autoLandings.previewGone", {
			video: Q(e),
			field: Y(e)
		}) : G("manage:autoLandings.previewEdited", {
			video: Q(e),
			field: Y(e)
		}))
	];
}
function ft(e) {
	let t = [e.restores.length ? G("manage:autoLandings.previewRestoreCount", { count: e.restores.length }) : "", e.tags.length ? G("manage:autoLandings.previewRemoveTags", { count: e.tags.length }) : ""].filter(Boolean);
	return [
		t.length ? G("manage:autoLandings.previewRevert", {
			count: e.decisions,
			details: t.join(G("shell:format.clauseSeparator"))
		}) : G("manage:autoLandings.previewRevertNothing", { count: e.decisions }),
		e.changed.length ? G("manage:autoLandings.previewUnchanged", { count: e.changed.length }) : "",
		G("manage:autoLandings.revertBackupNote")
	].filter(Boolean).join(G("shell:format.sentenceGap"));
}
function pt(e) {
	let t = [e.restored ? G("manage:autoLandings.resultRestoreCount", { count: e.restored }) : "", e.removed_tags ? G("manage:autoLandings.resultRemovedTags", { count: e.removed_tags }) : ""].filter(Boolean);
	return t.length ? G("manage:autoLandings.resultSummaryDetails", {
		count: e.decisions,
		details: t.join(G("shell:format.clauseSeparator"))
	}) : G("manage:autoLandings.resultSummary", { count: e.decisions });
}
// src/react/review/auto-landings-card.tsx
var $ = Me(), mt = G("manage:autoLandings.description");
function ht({ item: t, openItem: n }) {
	let r = t.asset_id && !t.gone ? () => n(t.asset_id) : void 0;
	return /* @__PURE__ */ (0, $.jsxs)("span", {
		className: "flex min-w-0 items-center gap-3",
		children: [/* @__PURE__ */ (0, $.jsxs)("button", {
			type: "button",
			disabled: !r,
			onClick: r,
			className: "flex aspect-card-cover w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-media-placeholder outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-default",
			children: [t.preview_url ? /* @__PURE__ */ (0, $.jsx)("img", {
				src: t.preview_url,
				alt: "",
				loading: "lazy",
				className: "size-full object-cover"
			}) : /* @__PURE__ */ (0, $.jsx)("span", {
				className: "text-caption-1-regular text-text-secondary",
				children: G("manage:shared.noCover")
			}), /* @__PURE__ */ (0, $.jsx)(e, { children: G("manage:autoLandings.openVideo", { name: Q(t) }) })]
		}), /* @__PURE__ */ (0, $.jsxs)("span", {
			className: "flex min-w-0 flex-1 flex-col gap-0.5",
			children: [/* @__PURE__ */ (0, $.jsxs)("span", {
				className: "truncate text-body-medium text-text-primary",
				children: [Q(t), t.assets > 1 ? /* @__PURE__ */ (0, $.jsx)("small", {
					className: "ml-1 text-caption-1-regular text-text-secondary",
					children: G("manage:autoLandings.fileCount", { count: t.assets })
				}) : null]
			}), /* @__PURE__ */ (0, $.jsx)("small", {
				title: t.name,
				className: "truncate text-caption-1-regular text-text-secondary",
				children: t.gone ? G("manage:autoLandings.videoGone") : t.name
			})]
		})]
	});
}
function gt({ item: e }) {
	return /* @__PURE__ */ (0, $.jsxs)("span", {
		className: "flex min-w-0 flex-col gap-0.5",
		children: [/* @__PURE__ */ (0, $.jsxs)("span", {
			title: lt(e),
			className: "truncate text-body-regular text-text-primary",
			children: [/* @__PURE__ */ (0, $.jsx)("span", {
				className: "text-text-secondary",
				children: G("shell:format.labelPrefix", { label: Y(e) })
			}), lt(e)]
		}), /* @__PURE__ */ (0, $.jsx)("small", {
			title: ut(e),
			className: "truncate text-caption-1-regular text-text-secondary",
			children: ut(e)
		})]
	});
}
function _t({ locked: e, openItem: t, toast: n }) {
	let [r, i] = (0, q.useState)([]), [a, o] = (0, q.useState)(null), s = Qe({
		queryKey: it,
		queryFn: ({ signal: e }) => at(e)
	}), c = s.data?.items ?? [], l = (e) => {
		let t = null, n = null;
		return {
			key: "revert",
			label: G("manage:autoLandings.revertSelected", { count: e }),
			reversal: "irreversible",
			confirm: async (e) => (t = await ot(e.map((e) => e.item_key)), {
				title: G("manage:autoLandings.revertTitle"),
				body: ft(t),
				items: dt(t),
				confirmLabel: G("manage:shared.revert")
			}),
			run: async () => {
				n = await st(t.items, t.token), o(n), ke.invalidateQueries({ queryKey: y });
			},
			receipt: () => n ? pt(n) : ""
		};
	}, d = {
		receipt: n,
		failure: (e) => n(R(e))
	};
	if (!c.length && !a && !s.isError) return null;
	let ee = [
		{
			id: "work",
			label: G("manage:shared.video"),
			width: 300,
			min: 240,
			value: (e) => Q(e),
			render: (e) => /* @__PURE__ */ (0, $.jsx)(ht, {
				item: e,
				openItem: t
			})
		},
		{
			id: "written",
			label: G("manage:autoLandings.columnWritten"),
			width: 320,
			min: 220,
			value: (e) => `${Y(e)}${lt(e)}`,
			filter: { values: Y },
			render: (e) => /* @__PURE__ */ (0, $.jsx)(gt, { item: e })
		},
		{
			id: "rule",
			label: G("manage:autoLandings.columnRule"),
			width: 142,
			min: 100,
			value: X,
			filter: { values: X },
			render: (e) => /* @__PURE__ */ (0, $.jsx)("span", {
				title: X(e),
				className: "block truncate text-body-2-regular text-text-secondary",
				children: X(e)
			})
		},
		{
			id: "at",
			label: G("manage:autoLandings.columnTime"),
			width: 152,
			min: 132,
			value: (e) => e.at ?? 0,
			filter: {
				range: "timestamp",
				value: (e) => e.at
			},
			render: (e) => /* @__PURE__ */ (0, $.jsx)("span", {
				title: e.batch,
				className: "whitespace-nowrap tabular-nums text-caption-1-regular text-text-secondary",
				children: Z(e) || G("manage:autoLandings.timeUnknown")
			})
		}
	];
	return /* @__PURE__ */ (0, $.jsxs)("section", {
		"aria-labelledby": "auto-landings-title",
		className: "flex flex-col gap-4",
		children: [a ? /* @__PURE__ */ (0, $.jsxs)(v, {
			tone: "success",
			title: pt(a),
			children: [/* @__PURE__ */ (0, $.jsx)("p", {
				className: "text-body-2-regular",
				children: G("manage:autoLandings.backupDone", { path: a.backup })
			}), a.changed.length ? /* @__PURE__ */ (0, $.jsxs)("p", {
				className: "flex flex-wrap items-center gap-x-2 gap-y-1 text-body-2-regular",
				children: [G("manage:autoLandings.leftUnchanged", { count: a.changed.length }), a.changed.map((e) => e.gone ? /* @__PURE__ */ (0, $.jsx)("span", {
					className: "text-text-secondary",
					children: G("manage:autoLandings.deletedAsset", { id: e.asset_id })
				}, `${e.asset_id}:${e.field}`) : /* @__PURE__ */ (0, $.jsx)(ie, {
					size: "small",
					onClick: () => t(e.asset_id),
					children: Q(e)
				}, `${e.asset_id}:${e.field}`))]
			}) : null]
		}) : null, s.isError ? /* @__PURE__ */ (0, $.jsx)(v, {
			tone: "error",
			title: G("manage:autoLandings.loadFailed"),
			children: R(s.error)
		}) : c.length ? /* @__PURE__ */ (0, $.jsx)(u, {
			preferenceId: "auto-landings",
			label: G("manage:autoLandings.title"),
			items: c,
			columns: ee,
			title: G("manage:autoLandings.title"),
			titleId: "auto-landings-title",
			unit: G("manage:autoLandings.unit"),
			description: mt,
			rowId: (e) => e.item_key,
			rowLabel: (e) => `${Q(e)} ${Y(e)}`,
			selected: r,
			onSelected: i,
			contextOperations: ({ asset_id: e, gone: n }) => e && !n ? [{
				id: "open",
				label: G("catalog:mediaActions.open"),
				icon: h,
				run: () => t(e)
			}] : [],
			actions: (t, n) => [{
				action: l(t.length),
				items: t,
				host: d,
				disabled: e,
				done: n,
				rowAction: {
					label: G("manage:shared.revert"),
					icon: P
				}
			}]
		}) : null]
	});
}
// src/react/review/bulk-toolbar.tsx
function vt(e) {
	let { groupOptions: t, groupBy: r, onGroupBy: i, groups: a, filter: o, onFilter: s, pageKeys: c, allKeys: l = c, selected: u, onSelected: d, selectedRows: ee, metadata: te, busy: f, feedback: ne, onUnifySource: re, actions: h, queueView: g = "pending", queueCounts: _, onQueueChange: ie, locked: v, fields: ae, fieldFilter: oe, onFieldFilter: y, search: b = "", onSearch: C } = e, w = c.length > 0 || !!C && !!b, D = c.filter((e) => u.has(e)), O = D.length > 0 && D.length === c.length, k = l.length > c.length && l.every((e) => u.has(e)), A = pe(ee), ce = te && ee.some((e) => (e.candidates?.length || 0) > 1), le = A.length ? G("manage:reviewToolbar.sourceForAll") : G("manage:reviewToolbar.noCommonSource"), j = (0, q.useRef)(null), M = (0, q.useRef)(null), N = (0, q.useRef)(null), [ue, P] = (0, q.useState)(!1), F = et(j, M, "[data-entity-state][aria-pressed=\"true\"]", g);
	return (0, q.useLayoutEffect)(() => {
		let e = M.current, t = N.current, n = e?.parentElement, r = e?.closest("[data-review-filter]");
		if (!e || !t || !n || !r) return;
		let i = () => P(t.offsetHeight > 0 && Math.abs(n.getBoundingClientRect().top - t.getBoundingClientRect().top) < 1), a = new ResizeObserver(i);
		for (let n of [
			r,
			e,
			t
		]) a.observe(n);
		return i(), () => a.disconnect();
	}, []), /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)(p, {
		label: G("manage:reviewToolbar.filters"),
		topLabel: G("manage:reviewToolbar.processingStatus"),
		attrs: { "data-review-filter": "" },
		className: "mb-0 flex-row flex-wrap",
		topClassName: "max-w-full flex-none",
		bottomClassName: w ? "min-h-12 max-w-full flex-none [&>*]:shrink-0" : "hidden",
		bottomRef: N,
		panes: /* @__PURE__ */ (0, $.jsx)("span", {
			ref: j,
			"data-view-glide": "",
			"aria-hidden": "true"
		}),
		top: /* @__PURE__ */ (0, $.jsxs)("div", {
			ref: M,
			role: "group",
			"aria-label": G("manage:reviewToolbar.reviewStatus"),
			"data-entity-states": "",
			onPointerLeave: F.leave,
			children: [x.map((e) => /* @__PURE__ */ (0, $.jsxs)("button", {
				type: "button",
				"data-entity-state": e,
				"data-entity-press": "",
				disabled: f,
				"aria-pressed": g === e,
				onPointerEnter: F.hover,
				onClick: () => {
					e !== g && ie(e);
				},
				children: [
					/* @__PURE__ */ (0, $.jsx)("span", {
						"data-copy-key": `review.queue.${e}`,
						children: S[e]
					}),
					" ",
					/* @__PURE__ */ (0, $.jsx)("span", {
						className: "ms-1.5 tabular-nums text-caption-1-medium text-text-secondary",
						children: _ ? _[e].toLocaleString() : "…"
					})
				]
			}, e)), /* @__PURE__ */ (0, $.jsx)("span", {
				"data-entity-sep": "",
				"aria-hidden": "true",
				className: ue ? void 0 : "invisible"
			})]
		}),
		bottom: w ? /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [C ? /* @__PURE__ */ (0, $.jsx)(m, {
			compact: !0,
			label: G("manage:reviewPage.search"),
			value: b,
			onQuery: C
		}) : null, c.length ? /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [
			te && ae.length ? /* @__PURE__ */ (0, $.jsxs)(T, {
				"aria-label": G("manage:reviewToolbar.filterField"),
				size: "sm",
				prefix: /* @__PURE__ */ (0, $.jsx)("span", {
					"data-copy-key": "review.filter.field",
					className: "pointer-events-auto",
					children: G("manage:reviewToolbar.field")
				}),
				selectedKey: oe || "*",
				isDisabled: f,
				onSelectionChange: (e) => {
					e !== null && y(String(e) === "*" ? "" : String(e));
				},
				children: [/* @__PURE__ */ (0, $.jsx)(E, {
					id: "*",
					children: G("manage:shared.all")
				}), ae.map((e) => /* @__PURE__ */ (0, $.jsx)(E, {
					id: e.key,
					children: `${e.title} · ${e.rows.length}`
				}, e.key))]
			}) : null,
			/* @__PURE__ */ (0, $.jsx)(T, {
				"aria-label": G("manage:reviewToolbar.groupBy"),
				size: "sm",
				selectedKey: r,
				onSelectionChange: (e) => {
					e !== null && i(String(e));
				},
				children: t.map(([e, t]) => /* @__PURE__ */ (0, $.jsx)(E, {
					id: e,
					children: t
				}, e))
			}),
			a.length > 1 ? /* @__PURE__ */ (0, $.jsxs)(T, {
				"aria-label": G(r === "field" ? "manage:reviewToolbar.filterFieldGroup" : "manage:reviewToolbar.filterGroup"),
				size: "sm",
				prefix: G("manage:reviewToolbar.group"),
				selectedKey: o || "*",
				onSelectionChange: (e) => {
					e !== null && s(String(e) === "*" ? "" : String(e));
				},
				children: [/* @__PURE__ */ (0, $.jsx)(E, {
					id: "*",
					children: G("manage:shared.all")
				}), a.map((e) => /* @__PURE__ */ (0, $.jsx)(E, {
					id: e.key,
					children: `${e.title} · ${e.rows.length}`
				}, e.key))]
			}) : null,
			v ? null : /* @__PURE__ */ (0, $.jsx)(n, {
				variant: "secondary",
				size: "small",
				leadingIcon: Ee,
				"aria-pressed": O,
				disabled: f,
				onClick: () => {
					let e = new Set(u);
					for (let t of c) O ? e.delete(t) : e.add(t);
					d(e);
				},
				children: G(O ? "manage:reviewToolbar.clearSelection" : o ? "manage:reviewToolbar.selectGroup" : "manage:reviewToolbar.selectPage")
			}),
			v || l.length <= c.length || k ? null : /* @__PURE__ */ (0, $.jsx)(n, {
				variant: "secondary",
				size: "small",
				disabled: f,
				onClick: () => d(/* @__PURE__ */ new Set([...u, ...l])),
				children: G("manage:reviewToolbar.selectAll", { count: l.length })
			})
		] }) : null] }) : null
	}), /* @__PURE__ */ (0, $.jsxs)(se, {
		label: G("manage:reviewToolbar.selectedDock"),
		visible: !v && u.size > 0,
		count: G("manage:reviewToolbar.selectedCount", { count: u.size }),
		actions: h,
		leading: ce && g !== "ignored" ? /* @__PURE__ */ (0, $.jsxs)(T, {
			"aria-label": G("manage:reviewToolbar.sourceForAll"),
			size: "sm",
			selectedKey: "",
			isDisabled: f || !A.length,
			onSelectionChange: (e) => {
				e !== null && e !== "" && re(String(e));
			},
			children: [/* @__PURE__ */ (0, $.jsx)(E, {
				id: "",
				children: le
			}), A.map((e) => /* @__PURE__ */ (0, $.jsx)(E, {
				id: e,
				children: e
			}, e))]
		}) : null,
		children: [/* @__PURE__ */ (0, $.jsx)(n, {
			variant: "ghost",
			size: "small",
			disabled: f,
			onClick: z,
			children: G("manage:reviewToolbar.deselect")
		}), ne ? /* @__PURE__ */ (0, $.jsx)("p", {
			role: "status",
			className: "w-full text-body-2-regular text-text-secondary",
			children: ne
		}) : null]
	})] });
}
// src/react/boardui/components/base/radio/radio-card.tsx
function yt({ className: e, title: n, description: r, ref: i, ...a }) {
	return /* @__PURE__ */ (0, $.jsx)(t, {
		ref: i,
		...a,
		className: (t) => L("group flex w-full items-center justify-between gap-3 rounded-2lg border border-border-button-default py-3 pe-5 ps-4 select-none", "transition-colors duration-150 ease", t.isHovered && !t.isDisabled ? "bg-background-primary-hover" : "bg-background-primary-default", t.isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer", typeof e == "function" ? e(t) : e),
		children: (e) => /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsxs)("span", {
			className: "flex min-w-0 flex-col gap-0.5",
			children: [/* @__PURE__ */ (0, $.jsx)("span", {
				className: "truncate text-body-medium text-text-primary",
				children: n
			}), r != null && /* @__PURE__ */ (0, $.jsx)("span", {
				className: "truncate text-body-regular text-text-secondary",
				children: r
			})]
		}), /* @__PURE__ */ (0, $.jsx)("span", {
			className: "flex shrink-0 items-center py-1",
			children: /* @__PURE__ */ (0, $.jsx)(C, {
				size: "md",
				selected: e.isSelected,
				focusVisible: e.isFocusVisible
			})
		})] })
	});
}
// src/react/review/candidate-form.tsx
var bt = {
	title: G("manage:shared.title"),
	original_title: G("manage:reviewCandidate.originalTitle"),
	runtime: G("manage:reviewCandidate.sourceRuntime"),
	director: G("manage:reviewCandidate.director"),
	label: "Label",
	poster_url: G("manage:reviewCandidate.poster"),
	cover_url: G("manage:shared.cover"),
	screenshot_urls: G("manage:reviewCandidate.screenshots"),
	trailer_url: G("manage:reviewCandidate.trailer")
}, xt = "reviewgenretags";
function St({ tags: e }) {
	return e.length ? /* @__PURE__ */ (0, $.jsx)("datalist", {
		id: xt,
		children: e.map((e) => /* @__PURE__ */ (0, $.jsx)("option", { value: e }, e))
	}) : null;
}
function Ct({ candidate: e, row: t }) {
	let [r, i] = (0, q.useState)(!1), a = (0, q.useId)(), o = Object.entries(e.catalog_evidence || {}).filter(([, e]) => e && e.display_value);
	return o.length ? /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "min-w-0",
		children: [/* @__PURE__ */ (0, $.jsxs)(n, {
			variant: "secondary",
			size: "small",
			leadingIcon: s,
			"aria-expanded": r,
			"aria-controls": a,
			"aria-label": G(r ? "manage:reviewCandidate.collapseEvidence" : "manage:reviewCandidate.expandEvidence", { source: e.source || G("manage:reviewCandidate.thisSource") }),
			onClick: () => i(!r),
			children: [/* @__PURE__ */ (0, $.jsx)("span", {
				"data-copy-key": "review.card.source_evidence",
				children: G("manage:reviewCandidate.sourceEvidence")
			}), ` · ${o.length}`]
		}), /* @__PURE__ */ (0, $.jsx)(c, {
			id: a,
			open: r,
			children: /* @__PURE__ */ (0, $.jsx)("dl", {
				className: "flex min-w-0 flex-col gap-2 px-3 pt-2 pb-1",
				children: o.map(([n, r]) => /* @__PURE__ */ (0, $.jsxs)("div", {
					className: "flex min-w-0 flex-wrap gap-x-2",
					children: [
						/* @__PURE__ */ (0, $.jsx)("dt", {
							className: "text-caption-1-regular text-text-tertiary",
							children: bt[n] || n
						}),
						/* @__PURE__ */ (0, $.jsx)("dd", {
							className: "min-w-0 text-body-2-regular break-words text-text-primary",
							children: /* @__PURE__ */ (0, $.jsx)(K, {
								value: I(r, "display_value"),
								reference: n === t.field && t.current_value ? t.current_value : I(t.candidates?.find((t) => t.candidate_key !== e.candidate_key && t.catalog_evidence?.[n]?.display_value)?.catalog_evidence?.[n], "display_value")
							})
						}),
						Ge(r.warnings, r.warning_codes, r.warning_params).map((e) => /* @__PURE__ */ (0, $.jsx)("small", {
							className: "w-full text-caption-1-regular text-status-yellow-text",
							children: e
						}, e))
					]
				}, n))
			})
		})]
	}) : null;
}
function wt(e) {
	let t = e.content_id || e.provider_id;
	return `${e.source || G("manage:reviewQueue.unspecifiedSource")}${e.official ? ` · ${G("manage:reviewCandidate.officialFirst")}` : ""}${t ? ` · ID ${t}` : ""}`;
}
function Tt({ candidate: e, reference: t }) {
	return /* @__PURE__ */ (0, $.jsxs)("span", {
		className: "flex min-w-0 flex-col gap-2 whitespace-normal wrap-anywhere",
		children: [/* @__PURE__ */ (0, $.jsx)("span", {
			className: "text-body-regular text-text-primary",
			children: /* @__PURE__ */ (0, $.jsx)(K, {
				value: e.display_value || "",
				reference: t
			})
		}), Ge(e.warnings, e.warning_codes, e.warning_params).map((e) => /* @__PURE__ */ (0, $.jsx)("span", {
			className: "text-body-2-regular text-status-yellow-text",
			children: e
		}, e))]
	});
}
function Et({ row: e, fieldName: t, value: n, onChange: r, locked: i }) {
	let a = e.candidates || [];
	return a.length ? a.length === 1 ? /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "flex min-w-0 flex-col gap-2",
		children: [/* @__PURE__ */ (0, $.jsxs)("div", {
			className: "flex min-w-0 flex-col gap-2 rounded-2lg bg-background-primary-default px-4 py-3",
			children: [/* @__PURE__ */ (0, $.jsx)("p", {
				className: "text-body-medium text-text-primary",
				children: wt(a[0])
			}), /* @__PURE__ */ (0, $.jsx)(Tt, {
				candidate: a[0],
				reference: e.current_value || void 0
			})]
		}), /* @__PURE__ */ (0, $.jsx)(Ct, {
			candidate: a[0],
			row: e
		})]
	}) : /* @__PURE__ */ (0, $.jsx)(w, {
		"aria-label": G("manage:reviewCandidate.sourceFor", { field: t || G("manage:scanFetch.slowWhatMetadata") }),
		value: n,
		isDisabled: i,
		onChange: r,
		children: /* @__PURE__ */ (0, $.jsx)("div", {
			className: "flex min-w-0 flex-col gap-3",
			children: a.map((t) => /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "flex min-w-0 flex-col gap-1",
				children: [/* @__PURE__ */ (0, $.jsx)(yt, {
					value: t.candidate_key,
					className: "relative items-start",
					title: /* @__PURE__ */ (0, $.jsx)("span", {
						title: wt(t),
						children: wt(t)
					}),
					description: /* @__PURE__ */ (0, $.jsx)(Tt, {
						candidate: t,
						reference: e.current_value || a.find((e) => e.candidate_key !== t.candidate_key)?.display_value
					})
				}), /* @__PURE__ */ (0, $.jsx)(Ct, {
					candidate: t,
					row: e
				})]
			}, t.candidate_key))
		})
	}) : null;
}
function Dt({ genre: e, tags: t, locked: r, toast: i }) {
	let [a, o] = (0, q.useState)(""), [s, c] = (0, q.useState)(""), l = Je({
		mutationFn: (t) => Ae(e, t),
		onSuccess: async (t, n) => {
			t.ok ? (i(n ? G("manage:reviewCandidate.mapped", {
				genre: e,
				tag: n
			}) : G("manage:reviewCandidate.markedNonContent", { genre: e })), await je()) : c(t.error || G("manage:reviewCandidate.mapRejected"));
		},
		onError: (e) => c(R(e))
	}), u = () => {
		let e = a.trim();
		e ? (c(""), l.mutate(e)) : c(G("manage:reviewCandidate.tagRequired"));
	};
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "flex flex-wrap items-center gap-2",
		children: [
			/* @__PURE__ */ (0, $.jsx)("b", {
				lang: "ja",
				className: "text-body-medium text-text-primary",
				children: e
			}),
			/* @__PURE__ */ (0, $.jsx)(k, {
				"aria-label": G("manage:reviewCandidate.tagFor", { genre: e }),
				value: a,
				onChange: o,
				maxLength: 40,
				isDisabled: r || l.isPending,
				className: "min-w-40 flex-1",
				children: /* @__PURE__ */ (0, $.jsx)(g, {
					size: "small",
					list: t.length ? xt : void 0,
					autoComplete: "off",
					placeholder: G("manage:reviewCandidate.tagPlaceholder"),
					onKeyDown: (e) => {
						e.key !== "Enter" || me(e.nativeEvent) || (e.preventDefault(), u());
					}
				})
			}),
			/* @__PURE__ */ (0, $.jsx)(n, {
				variant: "secondary",
				size: "small",
				disabled: r || l.isPending,
				onClick: u,
				children: G("manage:reviewCandidate.map")
			}),
			/* @__PURE__ */ (0, $.jsx)(n, {
				variant: "secondary",
				size: "small",
				disabled: r || l.isPending,
				onClick: () => {
					c(""), l.mutate("");
				},
				children: G("manage:reviewCandidate.notContent")
			}),
			s ? /* @__PURE__ */ (0, $.jsx)("p", {
				role: "status",
				className: "w-full text-body-2-regular text-text-error-primary",
				children: s
			}) : null
		]
	});
}
function Ot({ row: e, tags: t, locked: n, toast: r }) {
	let i = V(e);
	return i.length ? /* @__PURE__ */ (0, $.jsxs)("div", {
		role: "group",
		"aria-label": G("manage:reviewCandidate.unmappedGenres"),
		className: "flex flex-col gap-2 border-t border-separator-border pt-4",
		children: [/* @__PURE__ */ (0, $.jsx)("h5", {
			className: "text-body-2-medium text-text-secondary",
			children: G("manage:reviewCandidate.unmappedGenresCount", { count: i.length })
		}), /* @__PURE__ */ (0, $.jsx)("div", {
			role: "list",
			className: "flex flex-col",
			children: i.map((e, i) => /* @__PURE__ */ (0, $.jsx)("div", {
				role: "listitem",
				className: `py-3 first:pt-0 last:pb-0 ${i ? "border-t border-separator-border" : ""}`,
				children: /* @__PURE__ */ (0, $.jsx)(Dt, {
					genre: e,
					tags: t,
					locked: n,
					toast: r
				})
			}, e))
		})]
	}) : null;
}
// src/react/review/review-evidence.tsx
var kt = (e = "") => /^https?:\/\//i.test(e) ? e : "", At = (e = "") => kt(e) || (e.startsWith("/") && !e.startsWith("//") ? e : "");
function jt({ url: e }) {
	let t = At(e || "");
	return /* @__PURE__ */ (0, $.jsx)(Mt, { source: t }, t);
}
function Mt({ source: e }) {
	let [t, r] = (0, q.useState)("idle");
	return (0, q.useEffect)(() => {
		if (t !== "loading") return;
		let e = setTimeout(() => r("failed"), 3e4);
		return () => clearTimeout(e);
	}, [t]), /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "relative flex h-review-image items-center justify-center overflow-hidden rounded-surface bg-background-secondary-default",
		children: [t === "loading" ? /* @__PURE__ */ (0, $.jsx)("span", {
			role: "status",
			"aria-busy": "true",
			"aria-label": G("manage:reviewEvidence.loadingImage"),
			"data-skeleton": "",
			className: "absolute inset-0 skeleton-sheen"
		}) : null, e && (t === "loading" || t === "ready") ? /* @__PURE__ */ (0, $.jsx)("img", {
			src: e,
			alt: G("manage:reviewEvidence.candidateImageAlt"),
			referrerPolicy: "no-referrer",
			decoding: "async",
			className: `size-full object-contain ${t === "loading" ? "invisible" : ""}`,
			onLoad: () => r("ready"),
			onError: () => r("failed")
		}) : e ? /* @__PURE__ */ (0, $.jsxs)("div", {
			className: "flex flex-col items-center gap-2",
			children: [t === "failed" ? /* @__PURE__ */ (0, $.jsx)("span", {
				className: "text-body-2-regular text-text-secondary",
				children: G("manage:reviewEvidence.imageNotFound")
			}) : null, /* @__PURE__ */ (0, $.jsx)(n, {
				variant: "secondary",
				size: "small",
				"aria-label": t === "failed" ? G("manage:reviewEvidence.retryImage") : void 0,
				onClick: () => r("loading"),
				children: G(t === "failed" ? "manage:shared.retryNow" : "manage:reviewEvidence.viewImage")
			})]
		}) : /* @__PURE__ */ (0, $.jsx)("span", {
			className: "text-body-2-regular text-text-secondary",
			children: G("manage:reviewEvidence.imageNotFound")
		})]
	});
}
function Nt({ asset: t, openItem: r }) {
	let i = t.name || "";
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "flex min-w-0 items-center gap-3",
		children: [/* @__PURE__ */ (0, $.jsxs)("button", {
			type: "button",
			onClick: () => r(t.id),
			className: "flex aspect-card-cover w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2lg bg-media-placeholder outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
			children: [t.preview_url ? /* @__PURE__ */ (0, $.jsx)("img", {
				src: t.preview_url,
				alt: "",
				loading: "lazy",
				className: "size-full object-cover"
			}) : /* @__PURE__ */ (0, $.jsx)("span", {
				className: "text-caption-1-regular text-text-secondary",
				children: G("manage:shared.noCover")
			}), /* @__PURE__ */ (0, $.jsx)(e, { children: G("manage:reviewEvidence.openOriginalNamed", { name: i }) })]
		}), /* @__PURE__ */ (0, $.jsxs)("div", {
			className: "flex min-w-0 flex-col items-start gap-1",
			children: [/* @__PURE__ */ (0, $.jsx)("b", {
				title: i,
				className: "w-full truncate text-body-medium text-text-primary",
				children: t.code || i || G("manage:reviewEvidence.originalVideo")
			}), /* @__PURE__ */ (0, $.jsx)(n, {
				variant: "secondary",
				size: "small",
				leadingIcon: h,
				onClick: () => r(t.id),
				children: G("manage:reviewEvidence.openOriginal")
			})]
		})]
	});
}
function Pt({ kind: e, name: t, works: n, avatar: r, openEntity: i }) {
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "flex min-w-0 items-center gap-3",
		children: [/* @__PURE__ */ (0, $.jsx)("button", {
			type: "button",
			"aria-label": G("manage:reviewEvidence.openCreator", { name: t }),
			onClick: () => i(e, t),
			className: `relative inline-grid size-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-media-placeholder text-caption-1-medium text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring ${_}`,
			dangerouslySetInnerHTML: { __html: r }
		}), /* @__PURE__ */ (0, $.jsxs)("div", {
			className: "flex min-w-0 flex-col items-start",
			children: [/* @__PURE__ */ (0, $.jsx)("button", {
				type: "button",
				onClick: () => i(e, t),
				className: "max-w-full cursor-pointer truncate text-body-medium text-text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus-ring",
				children: t
			}), n ? /* @__PURE__ */ (0, $.jsx)("small", {
				className: "tabular-nums text-body-2-regular text-text-secondary",
				children: G("manage:reviewEvidence.videoCount", { count: n })
			}) : null]
		})]
	});
}
function Ft({ row: e, openItem: t, openEntity: i, onReveal: a, revealing: o, note: s }) {
	let c = kt(e.profile_url || ""), l = (e.preview_assets || []).slice(0, 6), u = Math.max(0, Number(e.video_count || e.videos || 0));
	return /* @__PURE__ */ (0, $.jsxs)("section", {
		className: "flex flex-col gap-3",
		children: [
			/* @__PURE__ */ (0, $.jsx)("h5", {
				className: "text-body-medium text-text-primary",
				children: G("manage:reviewEvidence.pendingPerson", { name: e.babepedia_name || G("manage:reviewEvidence.unlabeled") })
			}),
			/* @__PURE__ */ (0, $.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [c ? /* @__PURE__ */ (0, $.jsx)(r, {
					variant: "secondary",
					size: "small",
					trailingIcon: A,
					href: c,
					target: "_blank",
					rel: "noopener noreferrer",
					children: G("manage:reviewEvidence.sourceProfile")
				}) : null, /* @__PURE__ */ (0, $.jsx)(n, {
					variant: "secondary",
					size: "small",
					onClick: () => i("creator", e.creator || ""),
					children: G("manage:reviewEvidence.viewAllVideos", { count: u })
				})]
			}),
			/* @__PURE__ */ (0, $.jsx)(jt, { url: e.preview_url }),
			l.length ? /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)("h5", {
				className: "text-body-medium text-text-primary",
				children: G("manage:reviewEvidence.localSamples")
			}), /* @__PURE__ */ (0, $.jsx)("ul", {
				className: "flex flex-col gap-1",
				children: l.map((e) => /* @__PURE__ */ (0, $.jsxs)("li", {
					className: "flex min-w-0 items-center gap-2",
					children: [/* @__PURE__ */ (0, $.jsx)(n, {
						variant: "ghost",
						size: "small",
						className: "min-w-0",
						onClick: () => t(e.id),
						children: /* @__PURE__ */ (0, $.jsx)("span", {
							title: e.name,
							className: "block max-w-full truncate",
							children: e.name
						})
					}), /* @__PURE__ */ (0, $.jsx)(n, {
						variant: "ghost",
						size: "small",
						"aria-label": G("manage:reviewEvidence.revealNamed", { name: e.name }),
						...F(o === e.id),
						onClick: () => a(e.id),
						children: G("manage:reviewEvidence.fileLocation")
					})]
				}, e.id))
			})] }) : /* @__PURE__ */ (0, $.jsx)("p", {
				className: "text-body-2-regular text-text-secondary",
				children: G("manage:reviewEvidence.noLocalSamples")
			}),
			s ? /* @__PURE__ */ (0, $.jsx)("p", {
				role: "status",
				className: "text-body-2-regular text-text-error-primary",
				children: s
			}) : null
		]
	});
}
function It({ assets: t, picked: n, onPicked: r, locked: i }) {
	let [o, s] = (0, q.useState)(null), c = new Set(n), l = (e, n) => {
		if (i) return;
		let a = new Set(c);
		if (n && o !== null) {
			let [n, r] = [Math.min(o, e), Math.max(o, e)];
			for (let e = n; e <= r; e++) a.add(t[e].id);
		} else {
			let n = t[e].id;
			a.has(n) ? a.delete(n) : a.add(n);
		}
		s(e), r(t.filter((e) => a.has(e.id)).map((e) => e.id));
	};
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "flex flex-col gap-2",
		children: [/* @__PURE__ */ (0, $.jsx)(D, {
			prefix: /* @__PURE__ */ (0, $.jsx)("span", {
				className: "tabular-nums text-body-2-regular text-text-secondary",
				children: G("manage:reviewEvidence.selectedOfTotal", {
					count: c.size,
					total: t.length
				})
			}),
			actions: [{
				label: G("manage:shared.selectAll"),
				disabled: i,
				onPress: () => r(t.map((e) => e.id))
			}, {
				label: G("manage:reviewEvidence.clearSelection"),
				disabled: i,
				onPress: () => r([])
			}]
		}), /* @__PURE__ */ (0, $.jsx)("div", {
			className: "review-asset-grid gap-1.5",
			children: t.map((t, n) => {
				let r = c.has(t.id);
				return /* @__PURE__ */ (0, $.jsxs)("button", {
					type: "button",
					"aria-pressed": r,
					title: t.name,
					onClick: (e) => l(n, e.shiftKey),
					className: `relative aspect-card-cover cursor-pointer overflow-hidden rounded-surface bg-media-placeholder outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-border-focus-ring ${r ? "opacity-100 ring-2 ring-border-button-active ring-inset" : "opacity-50"}`,
					children: [
						/* @__PURE__ */ (0, $.jsx)("img", {
							src: `/poster?id=${t.id}&c=4`,
							alt: "",
							loading: "lazy",
							className: "size-full object-cover"
						}),
						/* @__PURE__ */ (0, $.jsx)("span", {
							className: "absolute top-1 right-1",
							children: /* @__PURE__ */ (0, $.jsx)(a, {
								size: "sm",
								state: {
									isSelected: r,
									isIndeterminate: !1,
									isFocusVisible: !1,
									isDisabled: i,
									isHovered: !1
								}
							})
						}),
						/* @__PURE__ */ (0, $.jsx)(e, { children: G(r ? "manage:reviewEvidence.assetSelected" : "manage:reviewEvidence.assetUnselected", { name: t.name || t.id }) })
					]
				}, t.id);
			})
		})]
	});
}
// src/react/review/review-card.tsx
var Lt = fe({
	variant: "filled",
	padding: "none",
	className: "flex flex-col overflow-hidden"
}), Rt = "flex min-h-6 min-w-0 items-center", zt = 2, Bt = (e) => e === "western_identity" ? "h-review-card-tall" : "h-review-card";
function Vt(e) {
	let { category: t, row: r, choice: a, onChoice: s, selected: c, onSelect: l, locked: u, busy: d, problem: ne, genreTags: p, onDecide: m, handlers: g, queueView: _ = "pending" } = e, v = (0, q.useRef)(!1), ae = Xe(), y = t === "metadata_fields", b = ee[t] || "", x = String(r.creator || "").trim(), S = !!b && !!x, C = Ve(t, r), w = U(t, r), T = W(t, r), E = Re(r), D = Be(r), se = de(t, r), O = r.comparison_assets || [], k = r.preview_assets || [], A = oe[r.decision || ""], j = O.length > 1 ? /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "flex flex-col gap-3",
		children: [O.slice(0, zt).map((e) => /* @__PURE__ */ (0, $.jsx)(Nt, {
			asset: e,
			openItem: g.openItem
		}, e.id)), O.length > zt ? /* @__PURE__ */ (0, $.jsx)("p", {
			className: "text-body-2-regular text-text-secondary",
			children: G("manage:reviewCard.moreComparison", { count: O.length - zt })
		}) : null]
	}) : S ? /* @__PURE__ */ (0, $.jsx)(Pt, {
		kind: b,
		name: x,
		works: Number(r.video_count || r.videos || 0),
		openEntity: g.openEntity,
		avatar: ue(x, r.entity_id ? {
			id: r.entity_id,
			has_image: !!r.has_image,
			image_version: r.image_version,
			avatar_focus: r.avatar_focus
		} : null, null, b)
	}) : r.asset_id ? /* @__PURE__ */ (0, $.jsx)(Nt, {
		openItem: g.openItem,
		asset: {
			id: r.asset_id,
			name: r.asset_name,
			code: r.code,
			preview_url: r.asset_preview_url
		}
	}) : null, M = y ? /* @__PURE__ */ (0, $.jsx)(Et, {
		row: r,
		fieldName: w,
		value: a.candidateKey,
		onChange: (e) => s({
			...a,
			candidateKey: e
		}),
		locked: u
	}) : t === "creator_tags" ? k.length ? /* @__PURE__ */ (0, $.jsx)(It, {
		assets: k,
		picked: a.assets,
		locked: u,
		onPicked: (e) => s({
			...a,
			assets: e
		})
	}) : /* @__PURE__ */ (0, $.jsx)(f, {
		size: "compact",
		icon: te,
		title: G("manage:reviewCard.noFramesTitle"),
		children: r.video_count ? G("manage:reviewCard.noFramesBody", { count: r.video_count }) : G("manage:reviewCard.noFramesBodyUncounted")
	}) : t === "fc2_similarity" ? null : t === "western_identity" ? /* @__PURE__ */ (0, $.jsx)(Ft, {
		row: r,
		openItem: g.openItem,
		openEntity: g.openEntity,
		onReveal: g.onReveal,
		revealing: g.revealing,
		note: g.revealNote
	}) : /* @__PURE__ */ (0, $.jsx)(jt, { url: r.preview_url }), N = S ? j : w ? /* @__PURE__ */ (0, $.jsxs)("h4", {
		className: L(Rt, "flex-wrap gap-2"),
		children: [/* @__PURE__ */ (0, $.jsx)("span", {
			title: w,
			className: "flex max-w-full min-w-0 overflow-hidden rounded-md",
			children: /* @__PURE__ */ (0, $.jsx)(o, {
				variant: "caption",
				color: "neutral",
				children: w
			})
		}), /* @__PURE__ */ (0, $.jsx)("span", {
			title: T,
			className: "min-w-0 truncate text-body-medium text-text-primary",
			children: T
		})]
	}) : /* @__PURE__ */ (0, $.jsx)("h4", {
		className: Rt,
		children: /* @__PURE__ */ (0, $.jsx)("span", {
			title: C,
			className: "min-w-0 truncate text-body-medium text-text-primary",
			children: C
		})
	}), fe = tt(), I = [];
	if (O.length <= 1) {
		if (S) I.push({
			id: "entity",
			label: x,
			icon: ce,
			run: () => g.openEntity(b, x)
		});
		else if (r.asset_id) {
			let e = r.asset_id;
			I.push({
				id: "open",
				label: G("catalog:mediaActions.open"),
				icon: h,
				run: () => g.openItem(e)
			});
		}
	}
	u || (I.push(ze(c, () => l(!1, !c))), _ !== "ignored" && I.push({
		id: "approve",
		label: G("manage:reviewDecision.approve"),
		icon: He,
		disabled: d || !se,
		run: () => m("approved")
	}), I.push(_ === "pending" ? {
		id: "later",
		label: G("manage:reviewDecision.later"),
		icon: Se,
		disabled: d,
		run: () => m("skipped")
	} : {
		id: "restore",
		label: G("manage:reviewDecision.moveToPending"),
		icon: P,
		disabled: d,
		run: () => m("restore")
	}), _ !== "ignored" && I.push({
		id: "ignore",
		label: G("manage:shared.ignore"),
		icon: le,
		disabled: d,
		run: () => m("rejected")
	}));
	let pe = {
		key: r.item_key,
		operations: I
	};
	return /* @__PURE__ */ (0, $.jsxs)("section", {
		"aria-label": C,
		"data-review-key": r.item_key,
		"data-rectangle-key": r.item_key,
		tabIndex: -1,
		className: L(Lt, Bt(t)),
		onContextMenu: (e) => {
			e.target.closest("input, textarea, select, [contenteditable]") || fe.onContextMenu(e, pe);
		},
		onKeyDown: (e) => {
			e.target.closest("input, textarea, select, [contenteditable]") || fe.onKeyDown(e, pe);
		},
		children: [
			fe.menu,
			/* @__PURE__ */ (0, $.jsxs)("header", {
				className: "flex min-w-0 shrink-0 items-center gap-2 border-b border-separator-border px-5 py-4",
				children: [
					u ? null : /* @__PURE__ */ (0, $.jsx)("span", {
						className: L(Rt, "shrink-0"),
						onPointerDownCapture: (e) => {
							v.current = e.shiftKey;
						},
						onKeyDownCapture: (e) => {
							v.current = e.shiftKey;
						},
						children: /* @__PURE__ */ (0, $.jsx)(i, {
							isSelected: c,
							"aria-label": G("manage:reviewCard.selectItem", { title: C }),
							onChange: (e) => l(v.current, e)
						})
					}),
					/* @__PURE__ */ (0, $.jsx)("div", {
						className: "min-w-0 flex-1",
						children: N
					}),
					A ? /* @__PURE__ */ (0, $.jsx)(o, {
						variant: "caption",
						color: "neutral",
						children: A
					}) : null
				]
			}),
			/* @__PURE__ */ (0, $.jsx)("div", {
				className: "relative mx-5 flex min-w-0 min-h-0 flex-1 flex-col",
				children: /* @__PURE__ */ (0, $.jsxs)("div", {
					ref: ae,
					className: "flex min-w-0 min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4",
					children: [
						r.source_name ? /* @__PURE__ */ (0, $.jsx)("p", {
							className: "text-body-2-regular text-text-secondary",
							children: G("manage:reviewCard.sourceSpelling", { name: r.source_name })
						}) : null,
						!S && (r.board || r.assets) ? /* @__PURE__ */ (0, $.jsx)("p", {
							className: "text-body-2-regular text-text-secondary",
							children: G("manage:reviewCard.comparisonFiles", { count: Number(r.video_count || r.assets || 0) })
						}) : null,
						!S && j ? j : null,
						y && (E || r.current_value !== void 0) ? /* @__PURE__ */ (0, $.jsxs)("div", {
							role: "region",
							"aria-label": G("manage:reviewCard.currentInfo"),
							className: "flex min-w-0 flex-col gap-1 border-b border-separator-border pb-4",
							children: [
								/* @__PURE__ */ (0, $.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2",
									children: [/* @__PURE__ */ (0, $.jsx)("h5", {
										"data-copy-key": "review.card.current_value",
										className: "text-caption-1-medium text-text-secondary",
										children: G("manage:reviewCard.currentValue")
									}), r.current_owner?.startsWith("user:") || r.current_owner?.startsWith("review:") ? /* @__PURE__ */ (0, $.jsx)(o, {
										variant: "caption",
										color: "neutral",
										children: G("manage:reviewCard.manuallyConfirmed")
									}) : null]
								}),
								/* @__PURE__ */ (0, $.jsx)("p", {
									className: "text-body-2-regular text-text-primary wrap-anywhere",
									children: r.current_value === void 0 ? E : r.current_value ? /* @__PURE__ */ (0, $.jsx)(K, {
										value: r.current_value,
										reference: (r.candidates?.find((e) => e.candidate_key === a.candidateKey) || r.candidates?.[0])?.display_value
									}) : G("manage:reviewCard.noMetadata")
								}),
								r.videos === void 0 ? null : /* @__PURE__ */ (0, $.jsx)("p", {
									className: "text-caption-1-regular text-text-secondary",
									children: G(r.asset_path ? "manage:reviewCard.matchingFiles" : "manage:reviewCard.sameCodeFiles", { count: Number(r.videos) })
								})
							]
						}) : null,
						D.length || t === "creator_tags" ? /* @__PURE__ */ (0, $.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: D.length ? D.map((e) => /* @__PURE__ */ (0, $.jsx)(o, {
								variant: "caption",
								color: "soft",
								children: e
							}, e)) : /* @__PURE__ */ (0, $.jsx)("small", {
								className: "text-body-2-regular text-text-secondary",
								children: G("manage:reviewCard.noPendingTags")
							})
						}) : null,
						y ? /* @__PURE__ */ (0, $.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, $.jsxs)("h5", {
								className: "text-caption-1-medium text-text-secondary",
								children: [/* @__PURE__ */ (0, $.jsx)("span", {
									"data-copy-key": "review.card.candidate_sources",
									children: G("manage:reviewCard.candidateSources")
								}), ` · ${r.candidates?.length || 0}`]
							}), r.current_value || (r.candidates?.length || 0) > 1 ? /* @__PURE__ */ (0, $.jsx)("span", {
								"data-copy-key": r.current_value ? "review.card.compare_current" : "review.card.compare_sources",
								className: "text-caption-1-regular text-text-tertiary",
								children: r.current_value ? G("manage:reviewCard.comparedToCurrent") : G("manage:reviewCard.sourceDifferences")
							}) : null]
						}) : null,
						M,
						/* @__PURE__ */ (0, $.jsx)(Ot, {
							row: r,
							tags: p,
							locked: u,
							toast: g.toast
						}),
						!y && E ? /* @__PURE__ */ (0, $.jsx)("p", {
							className: "text-body-2-regular text-text-secondary wrap-anywhere",
							children: E
						}) : null
					]
				})
			}),
			/* @__PURE__ */ (0, $.jsxs)("footer", {
				className: L(re.stack, "shrink-0"),
				children: [
					_ === "ignored" ? null : /* @__PURE__ */ (0, $.jsx)(ie, {
						variant: "secondary",
						size: "small",
						className: "me-auto",
						disabled: u,
						...F(d),
						onClick: () => m("rejected"),
						children: G("manage:shared.ignore")
					}),
					_ === "pending" ? /* @__PURE__ */ (0, $.jsx)(n, {
						variant: "secondary",
						size: "small",
						disabled: u,
						...F(d),
						onClick: () => m("skipped"),
						children: G("manage:reviewDecision.later")
					}) : /* @__PURE__ */ (0, $.jsx)(n, {
						variant: _ === "ignored" ? "primary" : "secondary",
						size: "small",
						disabled: u,
						...F(d),
						onClick: () => m("restore"),
						children: G("manage:reviewDecision.moveToPending")
					}),
					_ === "ignored" ? null : /* @__PURE__ */ (0, $.jsx)(n, {
						variant: "primary",
						size: "small",
						disabled: u || !se,
						...F(d),
						title: se ? void 0 : G("manage:reviewCard.cannotApproveHint"),
						onClick: () => m("approved"),
						children: G(se ? "manage:reviewDecision.approve" : "manage:reviewCard.cannotApprove")
					}),
					ne ? /* @__PURE__ */ (0, $.jsx)("p", {
						role: "status",
						className: "w-full text-body-2-regular text-text-error-primary",
						children: ne
					}) : null
				]
			})
		]
	});
}
// src/react/review/review-page.tsx
var Ht = "flex cursor-pointer items-center justify-between gap-2";
function Ut(e) {
	let t = Ye("review").keys.filter(we), [r, i] = (0, q.useState)(() => matchMedia("(max-width:900px)").matches);
	(0, q.useEffect)(() => {
		let e = matchMedia("(max-width:900px)"), t = () => i(e.matches);
		return e.addEventListener("change", t), () => e.removeEventListener("change", t);
	}, []);
	let { route: a, openItem: o, openEntity: s, revealSource: c, toast: u, readOnly: ee, readOnlyMessage: te, writerUrl: re } = e, [p, m] = (0, q.useState)(we(e.category) ? e.category : l), [h, g] = (0, q.useState)(() => Ie(e.queue)), [_, ie] = (0, q.useState)("candidates"), [oe, S] = (0, q.useState)(""), [C, w] = (0, q.useState)(""), [T, E] = (0, q.useState)(1), [D, se] = (0, q.useState)(20), [k, A] = (0, q.useState)(/* @__PURE__ */ new Set()), ce = Ze(() => A(/* @__PURE__ */ new Set()));
	(0, q.useEffect)(() => {
		k.size && ye();
	}, [k]);
	let [le, j] = (0, q.useState)(/* @__PURE__ */ new Map()), [M, N] = (0, q.useState)(/* @__PURE__ */ new Map()), [ue, P] = (0, q.useState)(""), F = (0, q.useRef)(null), [fe, I] = (0, q.useState)(0), [pe, me] = (0, q.useState)(""), L = (0, q.useRef)(!0);
	(0, q.useEffect)(() => () => {
		L.current = !1;
	}, []);
	let z = Qe({
		queryKey: y,
		queryFn: ({ signal: e }) => be(e)
	}), Se = z.data || {
		sections: {},
		counts: {},
		queues: {
			later: {
				sections: {},
				counts: {}
			},
			ignored: {
				sections: {},
				counts: {}
			}
		}
	}, Te = Fe(Se, h), Ee = z.data ? Object.fromEntries(x.map((e) => [e, ae.reduce((t, n) => t + Number(Fe(Se, e).counts[n] || 0), 0)])) : void 0, B = Te.sections[p] || [], V = p === "metadata_fields", H = ee;
	(0, q.useEffect)(() => {
		let e = new Set(B.map((e) => e.item_key));
		A((t) => {
			let n = [...t].filter((t) => e.has(t));
			return n.length === t.size ? t : new Set(n);
		}), j((t) => {
			let n = [...t].filter(([t]) => e.has(t));
			return n.length === t.size ? t : new Map(n);
		}), N((t) => {
			let n = [...t].filter(([t]) => e.has(t));
			return n.length === t.size ? t : new Map(n);
		});
	}, [B]);
	let [Ae, je] = (0, q.useState)(""), Me = (0, q.useMemo)(() => {
		let e = Ae.toLocaleLowerCase();
		return e ? B.filter((t) => Object.values(t).some((t) => typeof t == "string" && t.toLocaleLowerCase().includes(e))) : B;
	}, [B, Ae]), Ne = (0, q.useMemo)(() => V ? Ce(Me, "field") : [], [Me, V]), Re = Ne.some((e) => e.key === C) ? C : "", U = (0, q.useMemo)(() => V ? xe(Me, "field", Re) : Me, [
		Me,
		V,
		Re
	]), ze = (0, q.useMemo)(() => Pe(U, V), [U, V]), W = ze.some(([e]) => e === _) ? _ : "candidates", Be = (0, q.useMemo)(() => Ce(U, W), [U, W]), Ve = Be.some((e) => e.key === oe) ? oe : "", He = (0, q.useMemo)(() => xe(U, W, Ve), [
		U,
		W,
		Ve
	]), We = (0, q.useMemo)(() => Le(He, T, D), [
		He,
		T,
		D
	]), Ge = We.rows.map((e) => e.item_key), Xe = new Set(Ge), et = Be.map((e) => ({
		...e,
		rows: e.rows.filter((e) => Xe.has(e.item_key))
	})).filter((e) => e.rows.length), tt = (0, q.useRef)(null), K = (0, q.useRef)(null), rt = $e(H ? void 0 : (e, t) => A((n) => /* @__PURE__ */ new Set([...t ? n : [], ...e])), {
		selecting: ce,
		items: "[data-review-key]",
		start: ".review-grid"
	});
	(0, q.useLayoutEffect)(() => {
		let e = K.current;
		if (!e || e.card.isConnected || (K.current = null, document.activeElement !== document.body)) return;
		let t = [...tt.current?.querySelectorAll("[data-review-key]") ?? []];
		(e.following.map((e) => t.find((t) => t.dataset.reviewKey === e)).find(Boolean) ?? t[0] ?? tt.current)?.focus();
	});
	let J = (e) => le.get(e.item_key) || ve(e), it = (0, q.useMemo)(() => B.filter((e) => k.has(e.item_key)), [B, k]), Y = (e) => {
		let t = new Set(e);
		A((e) => new Set([...e].filter((e) => !t.has(e)))), j((e) => new Map([...e].filter(([e]) => !t.has(e)))), N((e) => new Map([...e].filter(([e]) => !t.has(e))));
	}, X = (e, t) => N((n) => new Map(n).set(e, t)), at = () => {
		K.current = null, ie("candidates"), S(""), w(""), E(1), A(/* @__PURE__ */ new Set()), j(/* @__PURE__ */ new Map()), N(/* @__PURE__ */ new Map()), P(""), F.current = null;
	}, ot = (e) => {
		m(e), at(), a({
			category: e === "metadata_fields" ? "" : e,
			queue: h === "pending" ? "" : h
		});
	}, st = (e) => {
		g(e), at(), a({
			category: p === "metadata_fields" ? "" : p,
			queue: e === "pending" ? "" : e
		});
	}, Z = Je({
		mutationFn: ({ row: e, status: t, category: n }) => qe(ge(n, he(n, e), t, J(e))),
		onSuccess: (e, { row: t, status: n, category: r }) => {
			if (!e.ok) {
				X(t.item_key, e.error || G("manage:reviewPage.decisionRejected"));
				return;
			}
			let i = document.activeElement?.closest("[data-review-key]");
			if (i?.dataset.reviewKey === t.item_key && tt.current?.contains(i)) {
				let e = [...tt.current.querySelectorAll("[data-review-key]")], t = e.indexOf(i), n = [...e.slice(t + 1), ...e.slice(0, t).reverse()].map((e) => e.dataset.reviewKey);
				K.current = {
					card: i,
					following: n
				};
			}
			Ke(r, [t.item_key], n), Y([t.item_key]), u(_e(n));
		},
		onError: (e, { row: t }) => X(t.item_key, R(e))
	}), Q = Je({
		mutationFn: async ({ status: e, category: t, rows: n }) => {
			let r = [], i = [];
			for (let [a, o] of n.entries()) {
				if (!L.current) break;
				P(G("manage:reviewPage.processingProgress", {
					current: a,
					total: n.length
				}));
				try {
					let n = await qe(ge(t, he(t, o), e, J(o)));
					if (!n.ok) throw Error(n.error || G("manage:reviewPage.itemNotAccepted"));
					r.push(o.item_key);
				} catch (e) {
					i.push([o.item_key, R(e)]);
				}
			}
			return {
				status: e,
				category: t,
				done: r,
				failures: i
			};
		},
		onSuccess: ({ status: e, category: t, done: n, failures: r }) => {
			Ke(t, n, e), Y(n), r.forEach(([e, t]) => X(e, t)), P("");
		},
		onError: (e) => {
			P(R(e));
		}
	}), ct = {
		receipt: u,
		failure: (e) => P(R(e))
	}, lt = {
		ignored: "rejected",
		later: "skipped"
	}, ut = (e, t) => {
		let n = {
			done: [],
			failures: []
		};
		return {
			key: e,
			label: t,
			reversal: e === "approved" ? "irreversible" : "undo",
			danger: !1,
			confirm: (n) => {
				if (e === "approved" && V && n.some((e) => !J(e).candidateKey)) throw Error(G("manage:reviewPage.chooseSourceFirst"));
				return P(""), {
					title: t,
					body: G(`manage:reviewPage.confirm.${e}`, { count: n.length })
				};
			},
			run: async (t) => {
				n = await Q.mutateAsync({
					status: e,
					category: p,
					rows: [...t]
				});
				let { done: r } = n;
				if (e === "approved") return;
				let i = p, a = t.filter((e) => r.includes(e.item_key)), o = e === "restore" ? lt[h] : "restore";
				return async () => {
					for (let e of a) await qe(ge(i, he(i, e), o, J(e)));
					await ke.invalidateQueries({ queryKey: y });
				};
			},
			receipt: () => G({
				approved: "manage:reviewPage.approvedCount",
				rejected: "manage:reviewPage.ignoredCount",
				skipped: "manage:reviewPage.laterCount",
				restore: "manage:reviewPage.pendingCount"
			}[e], { count: n.done.length }) + (n.failures.length ? G("manage:reviewPage.notCompletedSuffix", { count: n.failures.length }) : "")
		};
	}, dt = it.every((e) => de(p, e)), ft = [
		...h === "ignored" ? [] : [ut("rejected", G("manage:reviewToolbar.ignoreSelected"))],
		h === "pending" ? ut("skipped", G("manage:reviewToolbar.laterSelected")) : ut("restore", G("manage:reviewToolbar.restoreSelected")),
		...h === "ignored" ? [] : [ut("approved", G("manage:reviewToolbar.approveSelected"))]
	].map((e) => ({
		action: e,
		items: it,
		host: ct,
		variant: e.key === "approved" || h === "ignored" && e.key === "restore" ? "primary" : void 0,
		disabled: Q.isPending || Z.isPending || e.key === "approved" && !dt
	})), pt = (e) => {
		j((t) => {
			let n = new Map(t);
			for (let t of it) {
				let r = t.candidates?.find((t) => t.source === e);
				r && n.set(t.item_key, {
					...J(t),
					candidateKey: r.candidate_key
				});
			}
			return n;
		}), P(G("manage:reviewPage.sourceChosen", { source: e }));
	}, mt = async (e) => {
		if (fe) return;
		I(e), me("");
		let t = await c(e);
		L.current && (I(0), me(t));
	}, ht = Oe(Se.mirror, te), gt = Se.genre_tags || [], yt = {
		openItem: o,
		openEntity: s,
		onReveal: mt,
		revealing: fe,
		revealNote: pe,
		toast: u
	};
	return /* @__PURE__ */ (0, $.jsx)(nt, { children: /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "flex flex-col gap-5 pb-10",
		children: [
			H ? /* @__PURE__ */ (0, $.jsx)(v, {
				tone: "warning",
				title: G("manage:reviewPage.readOnly"),
				extra: re ? /* @__PURE__ */ (0, $.jsx)("p", {
					className: "text-body-2-regular",
					children: /* @__PURE__ */ (0, $.jsx)(ne, {
						href: re,
						children: G("manage:reviewPage.goToPrimary")
					})
				}) : void 0,
				children: ht
			}) : null,
			/* @__PURE__ */ (0, $.jsx)(St, { tags: gt }),
			/* @__PURE__ */ (0, $.jsxs)("div", {
				className: "flex flex-col gap-5 review-split:flex-row review-split:items-start review-split:gap-6",
				children: [/* @__PURE__ */ (0, $.jsxs)("div", {
					"data-section-nav": !0,
					className: "w-full min-w-0 review-split:sticky review-split:top-topbar review-split:w-review-tabs review-split:shrink-0",
					children: [/* @__PURE__ */ (0, $.jsx)("h2", {
						id: "reviewcategories",
						children: G("manage:reviewPage.categories")
					}), /* @__PURE__ */ (0, $.jsx)(O, {
						group: "review",
						label: G("manage:reviewPage.categories"),
						value: p,
						onChange: ot,
						orientation: r ? "horizontal" : "vertical",
						panelPrefix: "review",
						sectionItems: !0,
						className: "",
						itemClassName: Ht,
						disabled: Z.isPending || Q.isPending,
						tabs: ae.map((e) => {
							let t = Number(Te.counts[e] || 0);
							return {
								value: e,
								label: b[e],
								badge: t ? /* @__PURE__ */ (0, $.jsx)("span", {
									className: "tabular-nums text-caption-1-medium text-text-secondary",
									children: t.toLocaleString()
								}) : null
							};
						})
					})]
				}), /* @__PURE__ */ (0, $.jsxs)("div", {
					ref: tt,
					role: "tabpanel",
					id: `review-panel-${p}`,
					"aria-labelledby": `review-tab-${p}`,
					tabIndex: -1,
					className: "flex min-w-0 flex-1 flex-col gap-5",
					children: [
						/* @__PURE__ */ (0, $.jsx)(vt, {
							search: Ae,
							onSearch: (e) => {
								je(e), S(""), E(1);
							},
							queueView: h,
							queueCounts: Ee,
							onQueueChange: st,
							locked: H,
							fields: Ne,
							fieldFilter: Re,
							onFieldFilter: (e) => {
								w(e), S(""), E(1);
							},
							groupOptions: ze,
							groupBy: W,
							onGroupBy: (e) => {
								ie(e), S(""), E(1);
							},
							groups: Be,
							filter: Ve,
							onFilter: (e) => {
								S(e), E(1);
							},
							pageKeys: Ge,
							allKeys: He.map((e) => e.item_key),
							selected: k,
							onSelected: A,
							selectedRows: it,
							metadata: V,
							busy: Q.isPending || Z.isPending,
							feedback: ue,
							onUnifySource: pt,
							actions: ft
						}),
						We.rows.length ? /* @__PURE__ */ (0, $.jsx)("div", {
							"data-rectangle-gutter": "",
							...rt,
							className: "flex flex-col gap-5",
							children: et.map((e) => /* @__PURE__ */ (0, $.jsxs)("section", {
								"data-rectangle-gap": "",
								className: "flex flex-col gap-3",
								children: [et.length > 1 || W !== "candidates" ? /* @__PURE__ */ (0, $.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2",
									children: [/* @__PURE__ */ (0, $.jsx)("h3", {
										className: "text-body-medium text-text-primary",
										children: `${e.title} · ${e.rows.length}`
									}), H ? null : /* @__PURE__ */ (0, $.jsx)(n, {
										variant: "ghost",
										size: "small",
										onClick: () => {
											let t = e.rows.map((e) => e.item_key), n = t.every((e) => k.has(e)), r = new Set(k);
											for (let e of t) n ? r.delete(e) : r.add(e);
											A(r);
										},
										children: e.rows.every((e) => k.has(e.item_key)) ? G("manage:reviewPage.clearGroup") : G("manage:reviewPage.selectGroup")
									})]
								}) : null, /* @__PURE__ */ (0, $.jsx)("div", {
									className: "review-grid gap-5",
									children: e.rows.map((e) => /* @__PURE__ */ (0, $.jsx)(Vt, {
										category: p,
										row: e,
										queueView: h,
										choice: J(e),
										onChoice: (t) => j((n) => new Map(n).set(e.item_key, t)),
										selected: k.has(e.item_key),
										onSelect: (t, n) => A((r) => {
											let i = new Set(r);
											return F.current = Ue(i, Ge, F.current, e.item_key, t, n), i;
										}),
										locked: H,
										busy: Q.isPending || Z.isPending && Z.variables?.row.item_key === e.item_key,
										problem: M.get(e.item_key) || "",
										genreTags: gt,
										onDecide: (t) => {
											Z.isPending || Q.isPending || (N((t) => new Map([...t].filter(([t]) => t !== e.item_key))), Z.mutate({
												row: e,
												status: t,
												category: p
											}));
										},
										handlers: yt
									}, e.item_key))
								})]
							}, e.key))
						}) : z.isError && !z.data ? /* @__PURE__ */ (0, $.jsx)(v, {
							tone: "error",
							title: G("manage:reviewPage.queueLoadFailed"),
							action: /* @__PURE__ */ (0, $.jsx)(n, {
								variant: "secondary",
								size: "small",
								disabled: z.isFetching,
								onClick: () => void z.refetch(),
								children: G("manage:shared.retryNow")
							}),
							children: R(z.error)
						}) : /* @__PURE__ */ (0, $.jsx)(f, {
							icon: De,
							title: G({
								pending: "manage:reviewPage.emptyPending",
								later: "manage:reviewPage.emptyLater",
								ignored: "manage:reviewPage.emptyIgnored"
							}[h]),
							actions: ae.some((e) => e !== p && Number(Te.counts[e] || 0) > 0) ? /* @__PURE__ */ (0, $.jsx)(n, {
								size: "small",
								onClick: () => {
									let e = t.find((e) => e !== p && Number(Te.counts[e] || 0) > 0);
									e && ot(e);
								},
								children: G("manage:reviewPage.viewOtherCategories")
							}) : void 0,
							children: G(h === "pending" ? "manage:reviewPage.switchCategoryHint" : h === "later" ? "manage:reviewPage.laterKeptHint" : "manage:reviewPage.ignoredKeptHint")
						}),
						He.length ? /* @__PURE__ */ (0, $.jsx)(d, {
							label: G("manage:reviewPage.footerLabel"),
							total: He.length,
							pagination: {
								pageIndex: We.page - 1,
								pageSize: D
							},
							onChange: (e) => {
								E(e.pageIndex + 1), se(e.pageSize);
							}
						}) : null,
						V && h === "pending" ? /* @__PURE__ */ (0, $.jsx)(_t, {
							locked: H,
							openItem: o,
							toast: u
						}) : null
					]
				})]
			})
		]
	}) });
}
export { Ut as ReviewPage };

//# debugId=7a50a210-480c-465c-9767-46d4df835193
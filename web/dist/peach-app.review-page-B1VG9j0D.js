(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "3f268e66-ba55-4603-a484-c03e96069af0", e._sentryDebugIdIdentifier = "sentry-dbid-3f268e66-ba55-4603-a484-c03e96069af0");
	} catch {}
})();
import { $b4f18e3395fe64d7$export$3d96ec278d3efce4 as e, $b4f18e3395fe64d7$export$3e41faf802a29e71 as t, $b4f18e3395fe64d7$export$b2539bed5023c21c as n, $ea3928288112382f$export$439d29a4e110a164 as r, $fe21c36db05242bb$export$a98f0dcb43a68a25 as i, $fe21c36db05242bb$export$d7b12c4107be0d61 as a, Button as o, ButtonLink as s, Checkbox as c, CheckboxGlyph as l, Chip as u, CollapseChevron as d, CollapseRegion as f, DEFAULT_CATEGORY as p, ENTITY_REVIEW_KINDS as m, Ea as h, EmptyState as ee, ExternalLink as g, FIELDSET_FOOT as _, FilterGlassRows as v, Gg as y, InputBase as te, LinkButton as ne, Note as b, REVIEW_CATEGORIES as x, REVIEW_DECISION_LABELS as re, REVIEW_KEY as S, REVIEW_LABELS as C, REVIEW_QUEUES as w, REVIEW_QUEUE_LABELS as T, Select as E, SelectItem as D, SelectionActions as O, SelectionDock as k, TextField as A, Wt as j, __toESM as M, apiGet as N, apiSend as P, avatarInner as F, busyProps as I, canApprove as ie, cardClass as L, commonReviewSources as ae, composingKey as R, confirmModal as oe, currentReviewRow as se, cx as z, decisionPayload as ce, decisionReceipt as le, defaultChoice as ue, errorMessage as B, fetchReview as de, filterReviewRows as fe, groupReviewRows as pe, isReviewCategory as me, l7 as he, localTime as ge, m7 as _e, mirrorText as ve, paginationRange as ye, pendingGenres as be, queryClient as V, recordGenre as xe, reloadReview as Se, require_jsx_runtime as Ce, require_react as H, reviewGroupingOptions as we, reviewQueueData as Te, reviewQueueOf as Ee, reviewWindow as De, rowEvidence as U, rowFieldName as W, rowSubject as Oe, rowTags as ke, rowTitle as G, selectReviewRange as Ae, settleReviewRows as je, spinnerHtml as Me, submitDecision as Ne, useMutation as Pe, useOverlayScrollbar as K, useQuery as Fe, useViewGlide as Ie } from "./peach-app.js";
import { Page as Le } from "./peach-app.page-QAncjzM1.js";
import { DataTable as Re } from "./peach-app.data-table-aWN3V7mT.js";
import { LEGACY_AVATAR_IMG as ze } from "./peach-app.legacy-avatar-NSITxLRS.js";
import { PillAriaTabList as Be } from "./peach-app.pill-aria-tab-list-BMY1ZEv1.js";
// src/react/review/auto-landings.ts
var q = /* @__PURE__ */ M(H(), 1), Ve = "/api/review/auto-landings", He = "/api/review/auto-landings/revert", Ue = ["review", "auto-landings"], We = (e) => N(Ve, e), J = (e) => N(`${Ve}?items=${encodeURIComponent(e.join("\n"))}`), Ge = (e, t) => P(He, {
	items: e,
	token: t
}), Ke = (e) => e.at === null ? "" : ge((/* @__PURE__ */ new Date(e.at * 1e3)).toISOString()), Y = (e) => e.code || e.name || (e.asset_id ? `#${e.asset_id}` : "未知作品"), qe = (e) => e ? `「${e}」` : "空", Je = (e) => e.tags.length ? e.tags.join("、") : e.value, X = (e) => e.tags.length ? "原有标签保留" : `原为 ${e.previous.length ? e.previous.map(qe).join("、") : "空"}`;
function Z(e) {
	return [
		...e.restores.map((e) => `${Y(e)} ${e.field}：${qe(e.current)} 改回 ${qe(e.previous)}`),
		...e.tags.map((e) => `${Y(e)} 删除标签「${e.tag}」`),
		...e.changed.map((e) => e.gone ? `${Y(e)} ${e.field}：作品已不在账本中，跳过` : `${Y(e)} ${e.field}：之后已被修改，保留现值`)
	];
}
function Ye(e) {
	let t = [e.restores.length ? `改回 ${e.restores.length} 条资料` : "", e.tags.length ? `删除 ${e.tags.length} 个自动补上的标签` : ""].filter(Boolean);
	return [
		`将撤回 ${e.decisions} 条自动写入：${t.join("，") || "没有要改的资料"}。`,
		e.changed.length ? `${e.changed.length} 条资料写入后被修改过或作品已删除，不改动。` : "",
		"撤回前会自动备份账本。下一轮资料处理仍按同一判据判断，可能再次写入。"
	].filter(Boolean).join("");
}
function Xe(e) {
	let t = [e.restored ? `改回 ${e.restored} 条资料` : "", e.removed_tags ? `删除 ${e.removed_tags} 个标签` : ""].filter(Boolean);
	return `已撤回 ${e.decisions} 条自动写入${t.length ? `：${t.join("，")}` : ""}`;
}
// src/react/review/auto-landings-card.tsx
var Q = Ce(), Ze = "资料处理按确定判据自动写入的标题、发行日期与标签，一行一条。撤回会把覆盖的值改回写入前、删掉补上的标签；写入后又被修改过的作品保留现值。";
function Qe({ item: e, openItem: t }) {
	let n = e.asset_id && !e.gone ? () => t(e.asset_id) : void 0;
	return /* @__PURE__ */ (0, Q.jsxs)("span", {
		className: "flex min-w-0 items-center gap-3",
		children: [/* @__PURE__ */ (0, Q.jsxs)("button", {
			type: "button",
			disabled: !n,
			onClick: n,
			className: "flex aspect-card-cover w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-background-tertiary-default outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-default",
			children: [e.preview_url ? /* @__PURE__ */ (0, Q.jsx)("img", {
				src: e.preview_url,
				alt: "",
				loading: "lazy",
				className: "size-full object-cover"
			}) : /* @__PURE__ */ (0, Q.jsx)("span", {
				className: "text-caption-1-regular text-text-secondary",
				children: "无封面"
			}), /* @__PURE__ */ (0, Q.jsx)(r, { children: `打开作品 ${Y(e)}` })]
		}), /* @__PURE__ */ (0, Q.jsxs)("span", {
			className: "flex min-w-0 flex-1 flex-col gap-0.5",
			children: [/* @__PURE__ */ (0, Q.jsxs)("span", {
				className: "truncate text-body-medium text-text-primary",
				children: [Y(e), e.assets > 1 ? /* @__PURE__ */ (0, Q.jsx)("small", {
					className: "ml-1 text-caption-1-regular text-text-secondary",
					children: `${e.assets} 个文件`
				}) : null]
			}), /* @__PURE__ */ (0, Q.jsx)("small", {
				title: e.name,
				className: "truncate text-caption-1-regular text-text-secondary",
				children: e.gone ? "作品已不在账本中" : e.name
			})]
		})]
	});
}
function $e({ item: e }) {
	return /* @__PURE__ */ (0, Q.jsxs)("span", {
		className: "flex min-w-0 flex-col gap-0.5",
		children: [/* @__PURE__ */ (0, Q.jsxs)("span", {
			title: Je(e),
			className: "truncate text-body-regular text-text-primary",
			children: [/* @__PURE__ */ (0, Q.jsx)("span", {
				className: "text-text-secondary",
				children: `${e.field}：`
			}), Je(e)]
		}), /* @__PURE__ */ (0, Q.jsx)("small", {
			title: X(e),
			className: "truncate text-caption-1-regular text-text-secondary",
			children: X(e)
		})]
	});
}
function et({ locked: e, openItem: t, toast: n }) {
	let [r, i] = (0, q.useState)([]), [a, s] = (0, q.useState)(null), c = Fe({
		queryKey: Ue,
		queryFn: ({ signal: e }) => We(e)
	}), l = c.data?.items ?? [], u = Pe({
		mutationFn: async (e) => {
			let t = await J(e), { confirmed: n, result: r } = await oe({
				title: "撤回自动写入",
				body: Ye(t),
				items: Z(t),
				confirmLabel: "撤回",
				onConfirm: () => Ge(t.items, t.token)
			});
			return n ? r : null;
		},
		onSuccess: (e) => {
			e && (s(e), i([]), n(Xe(e)), V.invalidateQueries({ queryKey: S }));
		},
		onError: (e) => n(B(e))
	});
	return !l.length && !a && !c.isError ? null : /* @__PURE__ */ (0, Q.jsxs)("section", {
		"aria-labelledby": "auto-landings-title",
		className: "flex flex-col gap-4",
		children: [a ? /* @__PURE__ */ (0, Q.jsxs)(b, {
			tone: "success",
			title: Xe(a),
			children: [/* @__PURE__ */ (0, Q.jsx)("p", {
				className: "text-body-2-regular",
				children: `撤回前的账本已备份为 ${a.backup}。`
			}), a.changed.length ? /* @__PURE__ */ (0, Q.jsxs)("p", {
				className: "flex flex-wrap items-center gap-x-2 gap-y-1 text-body-2-regular",
				children: [`${a.changed.length} 条资料写入后被修改过或作品已删除，未改动：`, a.changed.map((e) => e.gone ? /* @__PURE__ */ (0, Q.jsx)("span", {
					className: "text-text-secondary",
					children: `#${e.asset_id}（已删除）`
				}, `${e.asset_id}:${e.field}`) : /* @__PURE__ */ (0, Q.jsx)(ne, {
					size: "small",
					onClick: () => t(e.asset_id),
					children: Y(e)
				}, `${e.asset_id}:${e.field}`))]
			}) : null]
		}) : null, c.isError ? /* @__PURE__ */ (0, Q.jsx)(b, {
			tone: "error",
			title: "读取自动写入的资料失败",
			children: B(c.error)
		}) : l.length ? /* @__PURE__ */ (0, Q.jsx)(Re, {
			label: "自动写入的资料",
			items: l,
			columns: [
				{
					id: "work",
					label: "作品",
					width: 300,
					min: 240,
					value: (e) => Y(e),
					render: (e) => /* @__PURE__ */ (0, Q.jsx)(Qe, {
						item: e,
						openItem: t
					})
				},
				{
					id: "written",
					label: "写入",
					width: 320,
					min: 220,
					value: (e) => `${e.field}${Je(e)}`,
					render: (e) => /* @__PURE__ */ (0, Q.jsx)($e, { item: e })
				},
				{
					id: "rule",
					label: "规则与时间",
					width: 176,
					min: 144,
					value: (e) => e.at ?? 0,
					render: (e) => /* @__PURE__ */ (0, Q.jsxs)("span", {
						title: e.batch,
						className: "flex min-w-0 flex-col gap-0.5 text-text-secondary",
						children: [/* @__PURE__ */ (0, Q.jsx)("span", {
							className: "truncate text-body-2-regular",
							children: e.label
						}), /* @__PURE__ */ (0, Q.jsx)("small", {
							className: "tabular-nums text-caption-1-regular",
							children: Ke(e) || "时间未知"
						})]
					})
				}
			],
			title: "自动写入的资料",
			titleId: "auto-landings-title",
			unit: "条",
			description: Ze,
			rowId: (e) => e.item_key,
			rowLabel: (e) => `${Y(e)} ${e.field}`,
			selected: r,
			onSelected: i,
			actions: (t) => /* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "secondary",
				size: "small",
				disabled: e || !t.length,
				...I(u.isPending),
				onClick: () => u.mutate(t.map((e) => e.item_key)),
				children: `撤回所选（${t.length}）`
			})
		}) : null]
	});
}
// src/react/review/bulk-toolbar.tsx
function tt(e) {
	let { groupOptions: t, groupBy: n, onGroupBy: r, groups: i, filter: a, onFilter: s, pageKeys: c, selected: l, onSelected: u, selectedRows: d, metadata: f, approvable: p, busy: m, feedback: h, onUnifySource: ee, onRun: g, queueView: _ = "pending", queueCounts: y, onQueueChange: te, locked: ne, fields: b, fieldFilter: x, onFieldFilter: re } = e, S = c.filter((e) => l.has(e)), C = S.length > 0 && S.length === c.length, O = ae(d), A = f && d.some((e) => (e.candidates?.length || 0) > 1), j = O.length ? "统一选择来源" : "所选项目无共同来源", M = (0, q.useRef)(null), N = (0, q.useRef)(null), P = (0, q.useRef)(null), [F, I] = (0, q.useState)(!1), ie = Ie(M, N, "[data-entity-state][aria-pressed=\"true\"]", _);
	return (0, q.useLayoutEffect)(() => {
		let e = N.current, t = P.current, n = e?.parentElement, r = e?.closest("[data-review-filter]");
		if (!e || !t || !n || !r) return;
		let i = () => I(t.offsetHeight > 0 && Math.abs(n.getBoundingClientRect().top - t.getBoundingClientRect().top) < 1), a = new ResizeObserver(i);
		for (let n of [
			r,
			e,
			t
		]) a.observe(n);
		return i(), () => a.disconnect();
	}, []), /* @__PURE__ */ (0, Q.jsxs)(Q.Fragment, { children: [/* @__PURE__ */ (0, Q.jsx)(v, {
		label: "复核筛选",
		topLabel: "处理状态",
		attrs: { "data-review-filter": "" },
		className: "mb-0 flex-row flex-wrap",
		topClassName: "max-w-full flex-none",
		bottomClassName: c.length ? "min-h-12 max-w-full flex-none flex-wrap" : "hidden",
		bottomRef: P,
		panes: /* @__PURE__ */ (0, Q.jsx)("span", {
			ref: M,
			"data-view-glide": "",
			"aria-hidden": "true"
		}),
		top: /* @__PURE__ */ (0, Q.jsxs)("div", {
			ref: N,
			role: "group",
			"aria-label": "复核状态",
			"data-entity-states": "",
			onPointerLeave: ie.leave,
			children: [w.map((e) => /* @__PURE__ */ (0, Q.jsxs)("button", {
				type: "button",
				"data-entity-state": e,
				"data-entity-press": "",
				disabled: m,
				"aria-pressed": _ === e,
				onPointerEnter: ie.hover,
				onClick: () => {
					e !== _ && te(e);
				},
				children: [
					/* @__PURE__ */ (0, Q.jsx)("span", {
						"data-copy-key": `review.queue.${e}`,
						children: T[e]
					}),
					" ",
					/* @__PURE__ */ (0, Q.jsx)("span", {
						className: "ms-1.5 tabular-nums text-caption-1-medium text-text-secondary",
						children: y ? y[e].toLocaleString() : "…"
					})
				]
			}, e)), /* @__PURE__ */ (0, Q.jsx)("span", {
				"data-entity-sep": "",
				"aria-hidden": "true",
				className: F ? void 0 : "invisible"
			})]
		}),
		bottom: c.length ? /* @__PURE__ */ (0, Q.jsxs)(Q.Fragment, { children: [
			f && b.length ? /* @__PURE__ */ (0, Q.jsxs)(E, {
				"aria-label": "筛选资料字段",
				size: "sm",
				prefix: /* @__PURE__ */ (0, Q.jsx)("span", {
					"data-copy-key": "review.filter.field",
					className: "pointer-events-auto",
					children: "字段"
				}),
				selectedKey: x || "*",
				isDisabled: m,
				onSelectionChange: (e) => {
					e !== null && re(String(e) === "*" ? "" : String(e));
				},
				children: [/* @__PURE__ */ (0, Q.jsx)(D, {
					id: "*",
					children: "全部"
				}), b.map((e) => /* @__PURE__ */ (0, Q.jsx)(D, {
					id: e.key,
					children: `${e.title} · ${e.rows.length}`
				}, e.key))]
			}) : null,
			/* @__PURE__ */ (0, Q.jsx)(E, {
				"aria-label": "筛选分组方式",
				size: "sm",
				selectedKey: n,
				onSelectionChange: (e) => {
					e !== null && r(String(e));
				},
				children: t.map(([e, t]) => /* @__PURE__ */ (0, Q.jsx)(D, {
					id: e,
					children: t
				}, e))
			}),
			i.length > 1 ? /* @__PURE__ */ (0, Q.jsxs)(E, {
				"aria-label": n === "field" ? "筛选字段分类" : "筛选当前分类",
				size: "sm",
				prefix: "分类",
				selectedKey: a || "*",
				onSelectionChange: (e) => {
					e !== null && s(String(e) === "*" ? "" : String(e));
				},
				children: [/* @__PURE__ */ (0, Q.jsx)(D, {
					id: "*",
					children: "全部"
				}), i.map((e) => /* @__PURE__ */ (0, Q.jsx)(D, {
					id: e.key,
					children: `${e.title} · ${e.rows.length}`
				}, e.key))]
			}) : null,
			ne ? null : /* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "secondary",
				size: "small",
				leadingIcon: he,
				"aria-pressed": C,
				disabled: m,
				onClick: () => {
					let e = new Set(l);
					for (let t of c) C ? e.delete(t) : e.add(t);
					u(e);
				},
				children: C ? "清空当前选择" : a ? "全选当前分类" : "全选本页"
			})
		] }) : null
	}), /* @__PURE__ */ (0, Q.jsxs)(k, {
		label: "复核所选项目",
		visible: !ne && l.size > 0,
		count: `已选 ${l.size} 项`,
		children: [
			A && _ !== "ignored" ? /* @__PURE__ */ (0, Q.jsxs)(E, {
				"aria-label": "统一选择来源",
				size: "sm",
				selectedKey: "",
				isDisabled: m || !O.length,
				onSelectionChange: (e) => {
					e !== null && e !== "" && ee(String(e));
				},
				children: [/* @__PURE__ */ (0, Q.jsx)(D, {
					id: "",
					children: j
				}), O.map((e) => /* @__PURE__ */ (0, Q.jsx)(D, {
					id: e,
					children: e
				}, e))]
			}) : null,
			_ === "ignored" ? null : /* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "ghost",
				size: "small",
				disabled: m || !l.size,
				onClick: () => g("rejected"),
				children: "忽略所选"
			}),
			_ === "pending" ? /* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "secondary",
				size: "small",
				disabled: m || !l.size,
				onClick: () => g("skipped"),
				children: "稍后处理所选"
			}) : /* @__PURE__ */ (0, Q.jsx)(o, {
				variant: _ === "ignored" ? "primary" : "secondary",
				size: "small",
				disabled: m || !l.size,
				onClick: () => g("restore"),
				children: "恢复所选"
			}),
			_ === "ignored" ? null : /* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "primary",
				size: "small",
				disabled: m || !l.size || !p,
				onClick: () => g("approved"),
				children: "通过所选"
			}),
			/* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "ghost",
				size: "small",
				disabled: m,
				onClick: () => u(/* @__PURE__ */ new Set()),
				children: "取消选择"
			}),
			h ? /* @__PURE__ */ (0, Q.jsx)("p", {
				role: "status",
				className: "w-full text-body-2-regular text-text-secondary",
				children: h
			}) : null
		]
	})] });
}
// src/react/boardui/components/base/radio/radio.tsx
var nt = {
	sm: {
		dot: "size-3.5",
		inner: "size-[5px]",
		selected: "bg-gradient-to-b from-accent-500 to-accent-600 shadow-[inset_0px_0px_0px_0.875px_var(--color-accent-500),inset_0px_1.75px_0px_0px_rgba(255,255,255,0.25)]",
		border: "border-[0.875px]",
		gap: "gap-2",
		label: "text-body-2-medium"
	},
	md: {
		dot: "size-4",
		inner: "size-1.5",
		selected: "bg-gradient-to-b from-accent-500 to-accent-600 shadow-[inset_0px_0px_0px_1px_var(--color-accent-500),inset_0px_2px_0px_0px_rgba(255,255,255,0.25)]",
		border: "border",
		gap: "gap-2",
		label: "text-body-medium"
	}
};
function rt({ selected: e = !1, size: t = "sm", focusVisible: n = !1, className: r }) {
	let i = nt[t];
	return /* @__PURE__ */ (0, Q.jsxs)("span", {
		"aria-hidden": !0,
		className: z("relative flex shrink-0 items-center justify-center rounded-full", i.dot, n && "ring-2 ring-border-focus-ring ring-offset-2", r),
		children: [
			/* @__PURE__ */ (0, Q.jsx)("span", { className: z("absolute inset-0 rounded-full border-border-checkbox-default bg-background-primary-default shadow-xs", "transition-opacity duration-200 ease", i.border, e && "opacity-0") }),
			/* @__PURE__ */ (0, Q.jsx)("span", { className: z("absolute inset-0 rounded-full", "transition-opacity duration-200 ease", i.selected, !e && "opacity-0") }),
			/* @__PURE__ */ (0, Q.jsx)("span", { className: z("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-control-indicator-background", "transition-[scale,opacity] duration-200 ease", i.inner, e ? "scale-100 opacity-100" : "scale-0 opacity-0") })
		]
	});
}
function it({ className: e, children: t, ref: n, ...r }) {
	return /* @__PURE__ */ (0, Q.jsx)(i, {
		ref: n,
		...r,
		className: (t) => z("flex flex-col gap-2", typeof e == "function" ? e(t) : e),
		children: t
	});
}
// src/react/boardui/components/base/radio/radio-card.tsx
function at({ className: e, title: t, description: n, ref: r, ...i }) {
	return /* @__PURE__ */ (0, Q.jsx)(a, {
		ref: r,
		...i,
		className: (t) => z("group flex w-full items-center justify-between gap-3 rounded-2lg border border-border-button-default py-3 pe-5 ps-4 select-none", "transition-colors duration-150 ease", t.isHovered && !t.isDisabled ? "bg-background-primary-hover" : "bg-background-primary-default", t.isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer", typeof e == "function" ? e(t) : e),
		children: (e) => /* @__PURE__ */ (0, Q.jsxs)(Q.Fragment, { children: [/* @__PURE__ */ (0, Q.jsxs)("span", {
			className: "flex min-w-0 flex-col gap-0.5",
			children: [/* @__PURE__ */ (0, Q.jsx)("span", {
				className: "truncate text-body-medium text-text-primary",
				children: t
			}), n != null && /* @__PURE__ */ (0, Q.jsx)("span", {
				className: "truncate text-body-regular text-text-secondary",
				children: n
			})]
		}), /* @__PURE__ */ (0, Q.jsx)("span", {
			className: "flex shrink-0 items-center py-1",
			children: /* @__PURE__ */ (0, Q.jsx)(rt, {
				size: "md",
				selected: e.isSelected,
				focusVisible: e.isFocusVisible
			})
		})] })
	});
}
// node_modules/diff/libesm/diff/base.js
var $ = class {
	diff(e, t, n = {}) {
		let r;
		typeof n == "function" ? (r = n, n = {}) : "callback" in n && (r = n.callback);
		let i = this.castInput(e, n), a = this.castInput(t, n), o = this.removeEmpty(this.tokenize(i, n)), s = this.removeEmpty(this.tokenize(a, n));
		return this.diffWithOptionsObj(o, s, n, r);
	}
	diffWithOptionsObj(e, t, n, r) {
		let i = (e) => {
			if (e = this.postProcess(e, n), r) setTimeout(function() {
				r(e);
			}, 0);
			else return e;
		}, a = t.length, o = e.length, s = 1, c = a + o;
		n.maxEditLength != null && (c = Math.min(c, n.maxEditLength));
		let l = n.timeout ?? Infinity, u = Date.now() + l, d = [{
			oldPos: -1,
			lastComponent: void 0
		}], f = this.extractCommon(d[0], t, e, 0, n);
		if (d[0].oldPos + 1 >= o && f + 1 >= a) return i(this.buildValues(d[0].lastComponent, t, e));
		let p = -Infinity, m = Infinity, h = () => {
			for (let r = Math.max(p, -s); r <= Math.min(m, s); r += 2) {
				let s, c = d[r - 1], l = d[r + 1];
				c && (d[r - 1] = void 0);
				let u = !1;
				if (l) {
					let e = l.oldPos - r;
					u = l && 0 <= e && e < a;
				}
				let h = c && c.oldPos + 1 < o;
				if (!u && !h) d[r] = void 0;
				else {
					if (s = !h || u && c.oldPos < l.oldPos ? this.addToPath(l, !0, !1, 0, n) : this.addToPath(c, !1, !0, 1, n), f = this.extractCommon(s, t, e, r, n), s.oldPos + 1 >= o && f + 1 >= a) return i(this.buildValues(s.lastComponent, t, e)) || !0;
					d[r] = s, s.oldPos + 1 >= o && (m = Math.min(m, r - 1)), f + 1 >= a && (p = Math.max(p, r + 1));
				}
			}
			s++;
		};
		if (r) (function e() {
			setTimeout(function() {
				if (s > c || Date.now() > u) return r(void 0);
				h() || e();
			}, 0);
		})();
		else for (; s <= c && Date.now() <= u;) {
			let e = h();
			if (e) return e;
		}
	}
	addToPath(e, t, n, r, i) {
		let a = e.lastComponent;
		return a && !i.oneChangePerToken && a.added === t && a.removed === n ? {
			oldPos: e.oldPos + r,
			lastComponent: {
				count: a.count + 1,
				added: t,
				removed: n,
				previousComponent: a.previousComponent
			}
		} : {
			oldPos: e.oldPos + r,
			lastComponent: {
				count: 1,
				added: t,
				removed: n,
				previousComponent: a
			}
		};
	}
	extractCommon(e, t, n, r, i) {
		let a = t.length, o = n.length, s = e.oldPos, c = s - r, l = 0;
		for (; c + 1 < a && s + 1 < o && this.equals(n[s + 1], t[c + 1], i);) c++, s++, l++, i.oneChangePerToken && (e.lastComponent = {
			count: 1,
			previousComponent: e.lastComponent,
			added: !1,
			removed: !1
		});
		return l && !i.oneChangePerToken && (e.lastComponent = {
			count: l,
			previousComponent: e.lastComponent,
			added: !1,
			removed: !1
		}), e.oldPos = s, c;
	}
	equals(e, t, n) {
		return n.comparator ? n.comparator(e, t) : e === t || !!n.ignoreCase && e.toLowerCase() === t.toLowerCase();
	}
	removeEmpty(e) {
		let t = [];
		for (let n = 0; n < e.length; n++) e[n] && t.push(e[n]);
		return t;
	}
	castInput(e, t) {
		return e;
	}
	tokenize(e, t) {
		return Array.from(e);
	}
	join(e) {
		return e.join("");
	}
	postProcess(e, t) {
		return e;
	}
	get useLongestToken() {
		return !1;
	}
	buildValues(e, t, n) {
		let r = [], i;
		for (; e;) r.push(e), i = e.previousComponent, delete e.previousComponent, e = i;
		r.reverse();
		let a = r.length, o = 0, s = 0, c = 0;
		for (; o < a; o++) {
			let e = r[o];
			if (e.removed) e.value = this.join(n.slice(c, c + e.count)), c += e.count;
			else {
				if (!e.added && this.useLongestToken) {
					let r = t.slice(s, s + e.count);
					r = r.map(function(e, t) {
						let r = n[c + t];
						return r.length > e.length ? r : e;
					}), e.value = this.join(r);
				} else e.value = this.join(t.slice(s, s + e.count));
				s += e.count, e.added || (c += e.count);
			}
		}
		return r;
	}
}, ot = new class extends $ {}();
function st(e, t, n) {
	return ot.diff(e, t, n);
}
// node_modules/diff/libesm/util/string.js
function ct(e, t) {
	let n = 0;
	for (; n < e.length && n < t.length; n++) if (e[n] != t[n]) return e.slice(0, n);
	return e.slice(0, n);
}
function lt(e, t) {
	let n;
	if (!e || !t || e[e.length - 1] != t[t.length - 1]) return "";
	for (n = 0; n < e.length && n < t.length; n++) if (e[e.length - (n + 1)] != t[t.length - (n + 1)]) return e.slice(-n);
	return e.slice(-n);
}
function ut(e, t, n) {
	if (e.slice(0, t.length) != t) throw Error(`string ${JSON.stringify(e)} doesn't start with prefix ${JSON.stringify(t)}; this is a bug`);
	return n + e.slice(t.length);
}
function dt(e, t, n) {
	if (!t) return e + n;
	if (e.slice(-t.length) != t) throw Error(`string ${JSON.stringify(e)} doesn't end with suffix ${JSON.stringify(t)}; this is a bug`);
	return e.slice(0, -t.length) + n;
}
function ft(e, t) {
	return ut(e, t, "");
}
function pt(e, t) {
	return dt(e, t, "");
}
function mt(e, t) {
	return t.slice(0, ht(e, t));
}
function ht(e, t) {
	let n = 0;
	e.length > t.length && (n = e.length - t.length);
	let r = t.length;
	e.length < t.length && (r = e.length);
	let i = Array(r), a = 0;
	i[0] = 0;
	for (let e = 1; e < r; e++) {
		for (t[e] == t[a] ? i[e] = i[a] : i[e] = a; a > 0 && t[e] != t[a];) a = i[a];
		t[e] == t[a] && a++;
	}
	a = 0;
	for (let r = n; r < e.length; r++) {
		for (; a > 0 && e[r] != t[a];) a = i[a];
		e[r] == t[a] && a++;
	}
	return a;
}
function gt(e, t) {
	let n = [];
	for (let r of Array.from(t.segment(e))) {
		let e = r.segment;
		n.length && /\s/.test(n[n.length - 1]) && /\s/.test(e) ? n[n.length - 1] += e : n.push(e);
	}
	return n;
}
function _t(e, t) {
	if (t) return yt(e, t)[1];
	let n;
	for (n = e.length - 1; n >= 0 && e[n].match(/\s/); n--);
	return e.substring(n + 1);
}
function vt(e, t) {
	if (t) return yt(e, t)[0];
	let n = e.match(/^\s*/);
	return n ? n[0] : "";
}
function yt(e, t) {
	if (!t) return [vt(e), _t(e)];
	if (t.resolvedOptions().granularity != "word") throw Error("The segmenter passed must have a granularity of \"word\"");
	let n = gt(e, t), r = n[0], i = n[n.length - 1];
	return [/\s/.test(r) ? r : "", /\s/.test(i) ? i : ""];
}
// node_modules/diff/libesm/diff/word.js
var bt = "a-zA-Z0-9_\\u{AD}\\u{C0}-\\u{D6}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}", xt = RegExp(`[${bt}]+|\\s+|[^${bt}]`, "ug");
new class extends $ {
	equals(e, t, n) {
		return n.ignoreCase && (e = e.toLowerCase(), t = t.toLowerCase()), e.trim() === t.trim();
	}
	tokenize(e, t = {}) {
		let n;
		if (t.intlSegmenter) {
			let r = t.intlSegmenter;
			if (r.resolvedOptions().granularity != "word") throw Error("The segmenter passed must have a granularity of \"word\"");
			n = gt(e, r);
		} else n = e.match(xt) || [];
		let r = [], i = null;
		return n.forEach((e) => {
			/\s/.test(e) ? i == null ? r.push(e) : r.push(r.pop() + e) : i != null && /\s/.test(i) ? r[r.length - 1] == i ? r.push(r.pop() + e) : r.push(i + e) : r.push(e), i = e;
		}), r;
	}
	join(e) {
		return e.map((e, t) => t == 0 ? e : e.replace(/^\s+/, "")).join("");
	}
	postProcess(e, t) {
		if (!e || t.oneChangePerToken) return e;
		let n = null, r = null, i = null;
		return e.forEach((e) => {
			e.added ? r = e : e.removed ? i = e : ((r || i) && St(n, i, r, e, t.intlSegmenter), n = e, r = null, i = null);
		}), (r || i) && St(n, i, r, null, t.intlSegmenter), e;
	}
}();
function St(e, t, n, r, i) {
	if (t && n) {
		let [a, o] = yt(t.value, i), [s, c] = yt(n.value, i);
		if (e) {
			let r = ct(a, s);
			e.value = dt(e.value, s, r), t.value = ft(t.value, r), n.value = ft(n.value, r);
		}
		if (r) {
			let e = lt(o, c);
			r.value = ut(r.value, c, e), t.value = pt(t.value, e), n.value = pt(n.value, e);
		}
	} else if (n) {
		if (e) {
			let e = vt(n.value, i);
			n.value = n.value.substring(e.length);
		}
		if (r) {
			let e = vt(r.value, i);
			r.value = r.value.substring(e.length);
		}
	} else if (e && r) {
		let n = vt(r.value, i), [a, o] = yt(t.value, i), s = ct(n, a);
		t.value = ft(t.value, s);
		let c = lt(ft(n, s), o);
		t.value = pt(t.value, c), r.value = ut(r.value, n, c), e.value = dt(e.value, n, n.slice(0, n.length - c.length));
	} else if (r) {
		let e = vt(r.value, i), n = mt(_t(t.value, i), e);
		t.value = pt(t.value, n);
	} else if (e) {
		let n = mt(_t(e.value, i), vt(t.value, i));
		t.value = ft(t.value, n);
	}
}
new class extends $ {
	tokenize(e) {
		let t = RegExp(`(\\r?\\n)|[${bt}]+|[^\\S\\n\\r]+|[^${bt}]`, "ug");
		return e.match(t) || [];
	}
}(), new class extends $ {
	constructor() {
		super(...arguments), this.tokenize = Ct;
	}
	equals(e, t, n) {
		return n.ignoreWhitespace ? (n.newlineIsToken && e.includes("\n") || (e = e.trim()), n.newlineIsToken && t.includes("\n") || (t = t.trim())) : n.ignoreNewlineAtEof && !n.newlineIsToken && (e.endsWith("\n") && (e = e.slice(0, -1)), t.endsWith("\n") && (t = t.slice(0, -1))), super.equals(e, t, n);
	}
}();
function Ct(e, t) {
	t.stripTrailingCr && (e = e.replace(/\r\n/g, "\n"));
	let n = [], r = e.split(/(\n|\r\n)/);
	r[r.length - 1] || r.pop();
	for (let e = 0; e < r.length; e++) {
		let i = r[e];
		e % 2 && !t.newlineIsToken ? n[n.length - 1] += i : n.push(i);
	}
	return n;
}
// node_modules/diff/libesm/diff/sentence.js
function wt(e) {
	return e == "." || e == "!" || e == "?";
}
new class extends $ {
	tokenize(e) {
		let t = [], n = 0;
		for (let r = 0; r < e.length; r++) {
			if (r == e.length - 1) {
				t.push(e.slice(n));
				break;
			}
			if (wt(e[r]) && e[r + 1].match(/\s/)) {
				for (t.push(e.slice(n, r + 1)), r = n = r + 1; e[r + 1]?.match(/\s/);) r++;
				t.push(e.slice(n, r + 1)), n = r + 1;
			}
		}
		return t;
	}
}(), new class extends $ {
	tokenize(e) {
		return e.split(/([{}:;,]|\s+)/);
	}
}(), new class extends $ {
	constructor() {
		super(...arguments), this.tokenize = Ct;
	}
	get useLongestToken() {
		return !0;
	}
	castInput(e, t) {
		let { undefinedReplacement: n, stringifyReplacer: r = (e, t) => t === void 0 ? n : t } = t;
		return typeof e == "string" ? e : JSON.stringify(Tt(e, null, null, r), null, "  ");
	}
	equals(e, t, n) {
		return super.equals(e.replace(/,([\r\n])/g, "$1"), t.replace(/,([\r\n])/g, "$1"), n);
	}
}();
function Tt(e, t, n, r, i) {
	t ||= [], n ||= [], r && (e = r(i === void 0 ? "" : i, e));
	let a = 0;
	for (; a < t.length; a += 1) if (t[a] === e) return n[a];
	let o;
	if (Object.prototype.toString.call(e) === "[object Array]") {
		for (t.push(e), o = Array(e.length), n.push(o), a = 0; a < e.length; a += 1) o[a] = Tt(e[a], t, n, r, String(a));
		return t.pop(), n.pop(), o;
	}
	if (e && e.toJSON && (e = e.toJSON()), typeof e == "object" && e) {
		t.push(e), o = {}, n.push(o);
		let i = [], s;
		for (s in e)
 /* istanbul ignore else */
		Object.prototype.hasOwnProperty.call(e, s) && i.push(s);
		for (i.sort(), a = 0; a < i.length; a += 1) s = i[a], o[s] = Tt(e[s], t, n, r, s);
		t.pop(), n.pop();
	} else o = e;
	return o;
}
new class extends $ {
	tokenize(e) {
		return e.slice();
	}
	join(e) {
		return e;
	}
	removeEmpty(e) {
		return e;
	}
}();
// src/react/review/comparison-text.tsx
function Et({ value: e, reference: t }) {
	let n = (0, q.useMemo)(() => t ? st(t, e).filter((e) => !e.removed) : [{
		value: e,
		added: !1
	}], [e, t]);
	return /* @__PURE__ */ (0, Q.jsx)(Q.Fragment, { children: n.map((e, t) => e.added ? /* @__PURE__ */ (0, Q.jsx)("mark", {
		"data-review-difference": "",
		className: "rounded-sm bg-status-yellow-background text-status-yellow-text",
		children: e.value
	}, t) : /* @__PURE__ */ (0, Q.jsx)("span", { children: e.value }, t)) });
}
// src/react/review/candidate-form.tsx
var Dt = {
	title: "标题",
	original_title: "原标题",
	runtime: "来源时长",
	director: "导演",
	label: "Label",
	poster_url: "海报",
	cover_url: "封面",
	screenshot_urls: "截图",
	trailer_url: "预告片"
}, Ot = "reviewgenretags";
function kt({ tags: e }) {
	return e.length ? /* @__PURE__ */ (0, Q.jsx)("datalist", {
		id: Ot,
		children: e.map((e) => /* @__PURE__ */ (0, Q.jsx)("option", { value: e }, e))
	}) : null;
}
function At({ candidate: e, row: t }) {
	let [n, r] = (0, q.useState)(!1), i = (0, q.useId)(), a = Object.entries(e.catalog_evidence || {}).filter(([, e]) => e && e.display_value);
	return a.length ? /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: "min-w-0",
		children: [/* @__PURE__ */ (0, Q.jsxs)(o, {
			variant: "secondary",
			size: "small",
			leadingIcon: d,
			"aria-expanded": n,
			"aria-controls": i,
			"aria-label": `${n ? "收起" : "展开"} ${e.source || "该来源"} 的来源依据`,
			onClick: () => r(!n),
			children: [/* @__PURE__ */ (0, Q.jsx)("span", {
				"data-copy-key": "review.card.source_evidence",
				children: "来源依据"
			}), ` · ${a.length}`]
		}), /* @__PURE__ */ (0, Q.jsx)(f, {
			id: i,
			open: n,
			children: /* @__PURE__ */ (0, Q.jsx)("dl", {
				className: "flex min-w-0 flex-col gap-2 px-3 pt-2 pb-1",
				children: a.map(([n, r]) => /* @__PURE__ */ (0, Q.jsxs)("div", {
					className: "flex min-w-0 flex-wrap gap-x-2",
					children: [
						/* @__PURE__ */ (0, Q.jsx)("dt", {
							className: "text-caption-1-regular text-text-tertiary",
							children: Dt[n] || n
						}),
						/* @__PURE__ */ (0, Q.jsx)("dd", {
							className: "min-w-0 text-body-2-regular break-words text-text-primary",
							children: /* @__PURE__ */ (0, Q.jsx)(Et, {
								value: r.display_value || "",
								reference: n === t.field && t.current_value ? t.current_value : t.candidates?.find((t) => t.candidate_key !== e.candidate_key && t.catalog_evidence?.[n]?.display_value)?.catalog_evidence?.[n]?.display_value
							})
						}),
						(r.warnings || []).map((e) => /* @__PURE__ */ (0, Q.jsx)("small", {
							className: "w-full text-caption-1-regular text-status-yellow-text",
							children: e
						}, e))
					]
				}, n))
			})
		})]
	}) : null;
}
function jt(e) {
	let t = e.content_id || e.provider_id;
	return `${e.source || "未标注来源"}${e.official ? " · 官方优先" : ""}${t ? ` · ID ${t}` : ""}`;
}
function Mt({ candidate: e, reference: t }) {
	return /* @__PURE__ */ (0, Q.jsxs)("span", {
		className: "flex min-w-0 flex-col gap-2 whitespace-normal wrap-anywhere",
		children: [/* @__PURE__ */ (0, Q.jsx)("span", {
			className: "text-body-regular text-text-primary",
			children: /* @__PURE__ */ (0, Q.jsx)(Et, {
				value: e.display_value || "",
				reference: t
			})
		}), (e.warnings || []).map((e) => /* @__PURE__ */ (0, Q.jsx)("span", {
			className: "text-body-2-regular text-status-yellow-text",
			children: e
		}, e))]
	});
}
function Nt({ row: e, fieldName: t, value: n, onChange: r, locked: i }) {
	let a = e.candidates || [];
	return a.length ? a.length === 1 ? /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: "flex min-w-0 flex-col gap-2",
		children: [/* @__PURE__ */ (0, Q.jsxs)("div", {
			className: "flex min-w-0 flex-col gap-2 rounded-2lg bg-background-primary-default px-4 py-3",
			children: [/* @__PURE__ */ (0, Q.jsx)("p", {
				className: "text-body-medium text-text-primary",
				children: jt(a[0])
			}), /* @__PURE__ */ (0, Q.jsx)(Mt, {
				candidate: a[0],
				reference: e.current_value || void 0
			})]
		}), /* @__PURE__ */ (0, Q.jsx)(At, {
			candidate: a[0],
			row: e
		})]
	}) : /* @__PURE__ */ (0, Q.jsx)(it, {
		"aria-label": `${t || "资料"}的来源`,
		value: n,
		isDisabled: i,
		onChange: r,
		children: /* @__PURE__ */ (0, Q.jsx)("div", {
			className: "flex min-w-0 flex-col gap-3",
			children: a.map((t) => /* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex min-w-0 flex-col gap-1",
				children: [/* @__PURE__ */ (0, Q.jsx)(at, {
					value: t.candidate_key,
					className: "relative items-start",
					title: /* @__PURE__ */ (0, Q.jsx)("span", {
						title: jt(t),
						children: jt(t)
					}),
					description: /* @__PURE__ */ (0, Q.jsx)(Mt, {
						candidate: t,
						reference: e.current_value || a.find((e) => e.candidate_key !== t.candidate_key)?.display_value
					})
				}), /* @__PURE__ */ (0, Q.jsx)(At, {
					candidate: t,
					row: e
				})]
			}, t.candidate_key))
		})
	}) : null;
}
function Pt({ genre: e, tags: t, locked: n, toast: r }) {
	let [i, a] = (0, q.useState)(""), [s, c] = (0, q.useState)(""), l = Pe({
		mutationFn: (t) => xe(e, t),
		onSuccess: async (t, n) => {
			t.ok ? (r(n ? `已把「${e}」收录为标签「${n}」` : `已把「${e}」判为非内容标签`), await Se()) : c(t.error || "服务端拒绝了这次收录");
		},
		onError: (e) => c(B(e))
	}), u = () => {
		let e = i.trim();
		e ? (c(""), l.mutate(e)) : c("先给它一个中文标签");
	};
	return /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: "flex flex-wrap items-center gap-2",
		children: [
			/* @__PURE__ */ (0, Q.jsx)("b", {
				lang: "ja",
				className: "text-body-medium text-text-primary",
				children: e
			}),
			/* @__PURE__ */ (0, Q.jsx)(A, {
				"aria-label": `「${e}」收录成的中文标签`,
				value: i,
				onChange: a,
				maxLength: 40,
				isDisabled: n || l.isPending,
				className: "min-w-40 flex-1",
				children: /* @__PURE__ */ (0, Q.jsx)(te, {
					size: "small",
					list: t.length ? Ot : void 0,
					autoComplete: "off",
					placeholder: "中文标签",
					onKeyDown: (e) => {
						e.key !== "Enter" || R(e.nativeEvent) || (e.preventDefault(), u());
					}
				})
			}),
			/* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "secondary",
				size: "small",
				disabled: n || l.isPending,
				onClick: u,
				children: "收录"
			}),
			/* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "secondary",
				size: "small",
				disabled: n || l.isPending,
				onClick: () => {
					c(""), l.mutate("");
				},
				children: "不是内容"
			}),
			s ? /* @__PURE__ */ (0, Q.jsx)("p", {
				role: "status",
				className: "w-full text-body-2-regular text-text-error-primary",
				children: s
			}) : null
		]
	});
}
function Ft({ row: e, tags: t, locked: n, toast: r }) {
	let i = be(e);
	return i.length ? /* @__PURE__ */ (0, Q.jsxs)("div", {
		role: "group",
		"aria-label": "未收录 genre",
		className: "flex flex-col gap-2 border-t border-separator-border pt-4",
		children: [/* @__PURE__ */ (0, Q.jsx)("h5", {
			className: "text-body-2-medium text-text-secondary",
			children: `未收录 genre · ${i.length}`
		}), /* @__PURE__ */ (0, Q.jsx)("div", {
			role: "list",
			className: "flex flex-col",
			children: i.map((e, i) => /* @__PURE__ */ (0, Q.jsx)("div", {
				role: "listitem",
				className: `py-3 first:pt-0 last:pb-0 ${i ? "border-t border-separator-border" : ""}`,
				children: /* @__PURE__ */ (0, Q.jsx)(Pt, {
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
var It = (e = "") => /^https?:\/\//i.test(e) ? e : "", Lt = (e = "") => It(e) || (e.startsWith("/") && !e.startsWith("//") ? e : "");
function Rt({ url: e }) {
	let t = Lt(e || "");
	return /* @__PURE__ */ (0, Q.jsx)(zt, { source: t }, t);
}
function zt({ source: e }) {
	let [t, n] = (0, q.useState)("idle");
	return (0, q.useEffect)(() => {
		if (t !== "loading") return;
		let e = setTimeout(() => n("failed"), 3e4);
		return () => clearTimeout(e);
	}, [t]), /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: "relative flex h-review-image items-center justify-center overflow-hidden rounded-surface bg-background-secondary-default",
		children: [t === "loading" ? /* @__PURE__ */ (0, Q.jsxs)("span", {
			role: "status",
			className: "absolute flex items-center gap-2 text-body-2-regular text-text-secondary",
			children: [/* @__PURE__ */ (0, Q.jsx)("span", { dangerouslySetInnerHTML: { __html: Me("正在加载图片") } }), "正在加载图片"]
		}) : null, e && (t === "loading" || t === "ready") ? /* @__PURE__ */ (0, Q.jsx)("img", {
			src: e,
			alt: "来源提供的备选图片",
			referrerPolicy: "no-referrer",
			decoding: "async",
			className: `size-full object-contain ${t === "loading" ? "invisible" : ""}`,
			onLoad: () => n("ready"),
			onError: () => n("failed")
		}) : e ? /* @__PURE__ */ (0, Q.jsxs)("div", {
			className: "flex flex-col items-center gap-2",
			children: [t === "failed" ? /* @__PURE__ */ (0, Q.jsx)("span", {
				className: "text-body-2-regular text-text-secondary",
				children: "未取得来源图片"
			}) : null, /* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "secondary",
				size: "small",
				"aria-label": t === "failed" ? "立即重试加载来源图片" : void 0,
				onClick: () => n("loading"),
				children: t === "failed" ? "立即重试" : "查看来源图片"
			})]
		}) : /* @__PURE__ */ (0, Q.jsx)("span", {
			className: "text-body-2-regular text-text-secondary",
			children: "未取得来源图片"
		})]
	});
}
function Bt({ asset: e, openItem: t }) {
	let n = e.name || "";
	return /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: "flex min-w-0 items-center gap-3",
		children: [/* @__PURE__ */ (0, Q.jsxs)("button", {
			type: "button",
			onClick: () => t(e.id),
			className: "flex aspect-card-cover w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2lg bg-background-tertiary-default outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
			children: [e.preview_url ? /* @__PURE__ */ (0, Q.jsx)("img", {
				src: e.preview_url,
				alt: "",
				loading: "lazy",
				className: "size-full object-cover"
			}) : /* @__PURE__ */ (0, Q.jsx)("span", {
				className: "text-caption-1-regular text-text-secondary",
				children: "无封面"
			}), /* @__PURE__ */ (0, Q.jsx)(r, { children: `打开原视频 ${n}` })]
		}), /* @__PURE__ */ (0, Q.jsxs)("div", {
			className: "flex min-w-0 flex-col items-start gap-1",
			children: [/* @__PURE__ */ (0, Q.jsx)("b", {
				title: n,
				className: "w-full truncate text-body-medium text-text-primary",
				children: e.code || n || "原视频"
			}), /* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "secondary",
				size: "small",
				leadingIcon: y,
				onClick: () => t(e.id),
				children: "打开原视频"
			})]
		})]
	});
}
function Vt({ kind: e, name: t, works: n, avatar: r, openEntity: i }) {
	return /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: "flex min-w-0 items-center gap-3",
		children: [/* @__PURE__ */ (0, Q.jsx)("button", {
			type: "button",
			"aria-label": `打开创作者页：${t}`,
			onClick: () => i(e, t),
			className: `relative inline-grid size-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-background-secondary-default text-caption-1-medium text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring ${ze}`,
			dangerouslySetInnerHTML: { __html: r }
		}), /* @__PURE__ */ (0, Q.jsxs)("div", {
			className: "flex min-w-0 flex-col items-start",
			children: [/* @__PURE__ */ (0, Q.jsx)("button", {
				type: "button",
				onClick: () => i(e, t),
				className: "max-w-full cursor-pointer truncate text-body-medium text-text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus-ring",
				children: t
			}), n ? /* @__PURE__ */ (0, Q.jsx)("small", {
				className: "tabular-nums text-body-2-regular text-text-secondary",
				children: `${n.toLocaleString()} 部作品`
			}) : null]
		})]
	});
}
function Ht({ row: e, openItem: t, openEntity: n, onReveal: r, revealing: i, note: a }) {
	let c = It(e.profile_url || ""), l = (e.preview_assets || []).slice(0, 6), u = Math.max(0, Number(e.video_count || e.videos || 0));
	return /* @__PURE__ */ (0, Q.jsxs)("section", {
		className: "flex flex-col gap-3",
		children: [
			/* @__PURE__ */ (0, Q.jsx)("h5", {
				className: "text-body-medium text-text-primary",
				children: `待确认人物：${e.babepedia_name || "未标注"}`
			}),
			/* @__PURE__ */ (0, Q.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [c ? /* @__PURE__ */ (0, Q.jsx)(s, {
					variant: "secondary",
					size: "small",
					trailingIcon: j,
					href: c,
					target: "_blank",
					rel: "noopener noreferrer",
					children: "来源资料"
				}) : null, /* @__PURE__ */ (0, Q.jsx)(o, {
					variant: "secondary",
					size: "small",
					onClick: () => n("creator", e.creator || ""),
					children: `查看全部 ${u.toLocaleString()} 部作品`
				})]
			}),
			/* @__PURE__ */ (0, Q.jsx)(Rt, { url: e.preview_url }),
			/* @__PURE__ */ (0, Q.jsx)("p", {
				className: "text-body-2-regular text-text-secondary",
				children: "通过后记录身份判断。"
			}),
			l.length ? /* @__PURE__ */ (0, Q.jsxs)(Q.Fragment, { children: [/* @__PURE__ */ (0, Q.jsx)("h5", {
				className: "text-body-medium text-text-primary",
				children: "本地作品样本"
			}), /* @__PURE__ */ (0, Q.jsx)("ul", {
				className: "flex flex-col gap-1",
				children: l.map((e) => /* @__PURE__ */ (0, Q.jsxs)("li", {
					className: "flex min-w-0 items-center gap-2",
					children: [/* @__PURE__ */ (0, Q.jsx)(o, {
						variant: "ghost",
						size: "small",
						className: "min-w-0",
						onClick: () => t(e.id),
						children: /* @__PURE__ */ (0, Q.jsx)("span", {
							title: e.name,
							className: "block max-w-full truncate",
							children: e.name
						})
					}), /* @__PURE__ */ (0, Q.jsx)(o, {
						variant: "ghost",
						size: "small",
						"aria-label": `打开 ${e.name} 的文件位置`,
						...I(i === e.id),
						onClick: () => r(e.id),
						children: "文件位置"
					})]
				}, e.id))
			})] }) : /* @__PURE__ */ (0, Q.jsx)("p", {
				className: "text-body-2-regular text-text-secondary",
				children: "暂无本地作品样本，打开全部作品核对。"
			}),
			a ? /* @__PURE__ */ (0, Q.jsx)("p", {
				role: "status",
				className: "text-body-2-regular text-text-error-primary",
				children: a
			}) : null
		]
	});
}
function Ut({ assets: e, picked: t, onPicked: n, locked: i }) {
	let [a, o] = (0, q.useState)(null), s = new Set(t), c = (t, r) => {
		if (i) return;
		let c = new Set(s);
		if (r && a !== null) {
			let [n, r] = [Math.min(a, t), Math.max(a, t)];
			for (let t = n; t <= r; t++) c.add(e[t].id);
		} else {
			let n = e[t].id;
			c.has(n) ? c.delete(n) : c.add(n);
		}
		o(t), n(e.filter((e) => c.has(e.id)).map((e) => e.id));
	};
	return /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: "flex flex-col gap-2",
		children: [/* @__PURE__ */ (0, Q.jsx)(O, {
			prefix: /* @__PURE__ */ (0, Q.jsx)("span", {
				className: "tabular-nums text-body-2-regular text-text-secondary",
				children: `已选 ${s.size} / ${e.length}`
			}),
			actions: [{
				label: "全选",
				disabled: i,
				onPress: () => n(e.map((e) => e.id))
			}, {
				label: "清空",
				disabled: i,
				onPress: () => n([])
			}]
		}), /* @__PURE__ */ (0, Q.jsx)("div", {
			className: "review-asset-grid gap-1.5",
			children: e.map((e, t) => {
				let n = s.has(e.id);
				return /* @__PURE__ */ (0, Q.jsxs)("button", {
					type: "button",
					"aria-pressed": n,
					title: e.name,
					onClick: (e) => c(t, e.shiftKey),
					className: `relative aspect-card-cover cursor-pointer overflow-hidden rounded-surface bg-background-tertiary-default outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-border-focus-ring ${n ? "opacity-100 ring-2 ring-border-button-active ring-inset" : "opacity-50"}`,
					children: [
						/* @__PURE__ */ (0, Q.jsx)("img", {
							src: `/poster?id=${e.id}&c=4`,
							alt: "",
							loading: "lazy",
							className: "size-full object-cover"
						}),
						/* @__PURE__ */ (0, Q.jsx)("span", {
							className: "absolute top-1 right-1",
							children: /* @__PURE__ */ (0, Q.jsx)(l, {
								size: "sm",
								state: {
									isSelected: n,
									isIndeterminate: !1,
									isFocusVisible: !1,
									isDisabled: i,
									isHovered: !1
								}
							})
						}),
						/* @__PURE__ */ (0, Q.jsx)(r, { children: `${n ? "已选" : "未选"} ${e.name || e.id}` })
					]
				}, e.id);
			})
		})]
	});
}
// src/react/review/review-card.tsx
var Wt = L({
	variant: "filled",
	padding: "none",
	className: "flex flex-col overflow-hidden"
}), Gt = "flex min-h-6 min-w-0 items-center", Kt = 2, qt = (e) => e === "western_identity" ? "h-review-card-tall" : "h-review-card";
function Jt(e) {
	let { category: t, row: n, choice: r, onChoice: i, selected: a, onSelect: s, locked: l, busy: d, problem: f, genreTags: p, onDecide: g, handlers: v, queueView: y = "pending" } = e, te = (0, q.useRef)(!1), b = K(), x = t === "metadata_fields", S = m[t] || "", C = String(n.creator || "").trim(), w = !!S && !!C, T = G(t, n), E = W(t, n), D = Oe(t, n), O = U(n), k = ke(n), A = ie(t, n), j = n.comparison_assets || [], M = n.preview_assets || [], N = re[n.decision || ""], P = j.length > 1 ? /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: "flex flex-col gap-3",
		children: [j.slice(0, Kt).map((e) => /* @__PURE__ */ (0, Q.jsx)(Bt, {
			asset: e,
			openItem: v.openItem
		}, e.id)), j.length > Kt ? /* @__PURE__ */ (0, Q.jsx)("p", {
			className: "text-body-2-regular text-text-secondary",
			children: `另有 ${(j.length - Kt).toLocaleString()} 部对照作品`
		}) : null]
	}) : w ? /* @__PURE__ */ (0, Q.jsx)(Vt, {
		kind: S,
		name: C,
		works: Number(n.video_count || n.videos || 0),
		openEntity: v.openEntity,
		avatar: F(C, n.entity_id ? {
			id: n.entity_id,
			has_image: !!n.has_image,
			image_version: n.image_version,
			avatar_focus: n.avatar_focus
		} : null, null, S)
	}) : n.asset_id ? /* @__PURE__ */ (0, Q.jsx)(Bt, {
		openItem: v.openItem,
		asset: {
			id: n.asset_id,
			name: n.asset_name,
			code: n.code,
			preview_url: n.asset_preview_url
		}
	}) : null, L = x ? /* @__PURE__ */ (0, Q.jsx)(Nt, {
		row: n,
		fieldName: E,
		value: r.candidateKey,
		onChange: (e) => i({
			...r,
			candidateKey: e
		}),
		locked: l
	}) : t === "creator_tags" ? M.length ? /* @__PURE__ */ (0, Q.jsx)(Ut, {
		assets: M,
		picked: r.assets,
		locked: l,
		onPicked: (e) => i({
			...r,
			assets: e
		})
	}) : /* @__PURE__ */ (0, Q.jsx)(ee, {
		size: "compact",
		icon: h,
		title: "这批作品尚未抽帧",
		children: `${n.video_count || ""} 条作品还没有可用预览；批准后仍会按所选资料写入标签。`
	}) : t === "fc2_similarity" ? null : t === "western_identity" ? /* @__PURE__ */ (0, Q.jsx)(Ht, {
		row: n,
		openItem: v.openItem,
		openEntity: v.openEntity,
		onReveal: v.onReveal,
		revealing: v.revealing,
		note: v.revealNote
	}) : /* @__PURE__ */ (0, Q.jsx)(Rt, { url: n.preview_url }), ae = w ? P : E ? /* @__PURE__ */ (0, Q.jsxs)("h4", {
		className: z(Gt, "flex-wrap gap-2"),
		children: [/* @__PURE__ */ (0, Q.jsx)("span", {
			title: E,
			className: "flex max-w-full min-w-0 overflow-hidden rounded-md",
			children: /* @__PURE__ */ (0, Q.jsx)(u, {
				variant: "caption",
				color: "neutral",
				children: E
			})
		}), /* @__PURE__ */ (0, Q.jsx)("span", {
			title: D,
			className: "min-w-0 truncate text-body-medium text-text-primary",
			children: D
		})]
	}) : /* @__PURE__ */ (0, Q.jsx)("h4", {
		className: Gt,
		children: /* @__PURE__ */ (0, Q.jsx)("span", {
			title: T,
			className: "min-w-0 truncate text-body-medium text-text-primary",
			children: T
		})
	});
	return /* @__PURE__ */ (0, Q.jsxs)("section", {
		"aria-label": T,
		"data-review-key": n.item_key,
		className: z(Wt, qt(t)),
		children: [
			/* @__PURE__ */ (0, Q.jsxs)("header", {
				className: "flex min-w-0 shrink-0 items-center gap-2 border-b border-separator-border px-5 py-4",
				children: [
					l ? null : /* @__PURE__ */ (0, Q.jsx)("span", {
						className: z(Gt, "shrink-0"),
						onPointerDownCapture: (e) => {
							te.current = e.shiftKey;
						},
						onKeyDownCapture: (e) => {
							te.current = e.shiftKey;
						},
						children: /* @__PURE__ */ (0, Q.jsx)(c, {
							isSelected: a,
							"aria-label": `选择 ${T}`,
							onChange: (e) => s(te.current, e)
						})
					}),
					/* @__PURE__ */ (0, Q.jsx)("div", {
						className: "min-w-0 flex-1",
						children: ae
					}),
					N ? /* @__PURE__ */ (0, Q.jsx)(u, {
						variant: "caption",
						color: "neutral",
						children: N
					}) : null
				]
			}),
			/* @__PURE__ */ (0, Q.jsx)("div", {
				className: "relative mx-5 flex min-w-0 min-h-0 flex-1 flex-col",
				children: /* @__PURE__ */ (0, Q.jsxs)("div", {
					ref: b,
					className: "flex min-w-0 min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4",
					children: [
						n.source_name ? /* @__PURE__ */ (0, Q.jsx)("p", {
							className: "text-body-2-regular text-text-secondary",
							children: `来源写法：${n.source_name}`
						}) : null,
						!w && (n.board || n.assets) ? /* @__PURE__ */ (0, Q.jsx)("p", {
							className: "text-body-2-regular text-text-secondary",
							children: `对照文件：${Number(n.video_count || n.assets || 0).toLocaleString()}`
						}) : null,
						!w && P ? P : null,
						x && (O || n.current_value !== void 0) ? /* @__PURE__ */ (0, Q.jsxs)("div", {
							role: "region",
							"aria-label": "当前信息",
							className: "flex min-w-0 flex-col gap-1 border-b border-separator-border pb-4",
							children: [
								/* @__PURE__ */ (0, Q.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2",
									children: [/* @__PURE__ */ (0, Q.jsx)("h5", {
										"data-copy-key": "review.card.current_value",
										className: "text-caption-1-medium text-text-secondary",
										children: "当前值"
									}), n.current_owner?.startsWith("user:") || n.current_owner?.startsWith("review:") ? /* @__PURE__ */ (0, Q.jsx)(u, {
										variant: "caption",
										color: "neutral",
										children: "人工确认"
									}) : null]
								}),
								/* @__PURE__ */ (0, Q.jsx)("p", {
									className: "text-body-2-regular text-text-primary wrap-anywhere",
									children: n.current_value === void 0 ? O : n.current_value ? /* @__PURE__ */ (0, Q.jsx)(Et, {
										value: n.current_value,
										reference: (n.candidates?.find((e) => e.candidate_key === r.candidateKey) || n.candidates?.[0])?.display_value
									}) : "尚无资料"
								}),
								n.videos === void 0 ? null : /* @__PURE__ */ (0, Q.jsx)("p", {
									className: "text-caption-1-regular text-text-secondary",
									children: `${Number(n.videos).toLocaleString()} 个${n.asset_path ? "匹配文件" : "同番号文件"}`
								})
							]
						}) : null,
						k.length || t === "creator_tags" ? /* @__PURE__ */ (0, Q.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: k.length ? k.map((e) => /* @__PURE__ */ (0, Q.jsx)(u, {
								variant: "caption",
								color: "soft",
								children: e
							}, e)) : /* @__PURE__ */ (0, Q.jsx)("small", {
								className: "text-body-2-regular text-text-secondary",
								children: "暂无待确认标签"
							})
						}) : null,
						x ? /* @__PURE__ */ (0, Q.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, Q.jsxs)("h5", {
								className: "text-caption-1-medium text-text-secondary",
								children: [/* @__PURE__ */ (0, Q.jsx)("span", {
									"data-copy-key": "review.card.candidate_sources",
									children: "候选来源"
								}), ` · ${n.candidates?.length || 0}`]
							}), n.current_value || (n.candidates?.length || 0) > 1 ? /* @__PURE__ */ (0, Q.jsx)("span", {
								"data-copy-key": n.current_value ? "review.card.compare_current" : "review.card.compare_sources",
								className: "text-caption-1-regular text-text-tertiary",
								children: n.current_value ? "与当前值比较" : "来源间差异"
							}) : null]
						}) : null,
						L,
						/* @__PURE__ */ (0, Q.jsx)(Ft, {
							row: n,
							tags: p,
							locked: l,
							toast: v.toast
						}),
						!x && O ? /* @__PURE__ */ (0, Q.jsx)("p", {
							className: "text-body-2-regular text-text-secondary wrap-anywhere",
							children: O
						}) : null
					]
				})
			}),
			/* @__PURE__ */ (0, Q.jsxs)("footer", {
				className: z(_.stack, "shrink-0"),
				children: [
					y === "ignored" ? null : /* @__PURE__ */ (0, Q.jsx)(ne, {
						variant: "secondary",
						size: "small",
						className: "me-auto",
						disabled: l,
						...I(d),
						onClick: () => g("rejected"),
						children: "忽略"
					}),
					y === "pending" ? /* @__PURE__ */ (0, Q.jsx)(o, {
						variant: "secondary",
						size: "small",
						disabled: l,
						...I(d),
						onClick: () => g("skipped"),
						children: "稍后处理"
					}) : /* @__PURE__ */ (0, Q.jsx)(o, {
						variant: y === "ignored" ? "primary" : "secondary",
						size: "small",
						disabled: l,
						...I(d),
						onClick: () => g("restore"),
						children: "恢复待处理"
					}),
					y === "ignored" ? null : /* @__PURE__ */ (0, Q.jsx)(o, {
						variant: "primary",
						size: "small",
						disabled: l || !A,
						...I(d),
						title: A ? void 0 : "没有可采用的资料，可先保留或忽略",
						onClick: () => g("approved"),
						children: A ? "通过" : "不可通过"
					}),
					f ? /* @__PURE__ */ (0, Q.jsx)("p", {
						role: "status",
						className: "w-full text-body-2-regular text-text-error-primary",
						children: f
					}) : null
				]
			})
		]
	});
}
// src/react/review/review-page.tsx
var Yt = "flex cursor-pointer items-center justify-between gap-2";
function Xt({ page: e, pages: t, onPage: n }) {
	return t <= 1 ? null : /* @__PURE__ */ (0, Q.jsxs)("nav", {
		"aria-label": "复核分页",
		"data-pagination-layout": "",
		className: "inline-grid w-full min-w-0 items-center gap-2",
		children: [
			/* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "secondary",
				size: "small",
				disabled: e <= 1,
				onClick: () => n(e - 1),
				children: "上一页"
			}),
			/* @__PURE__ */ (0, Q.jsx)("ul", {
				className: "flex min-w-0 flex-wrap items-center justify-center gap-1",
				children: ye(e, t).map((t, r) => /* @__PURE__ */ (0, Q.jsx)("li", { children: t === "…" ? /* @__PURE__ */ (0, Q.jsx)("span", {
					"aria-hidden": !0,
					className: "px-1 text-body-2-regular text-text-tertiary",
					children: "…"
				}) : /* @__PURE__ */ (0, Q.jsx)(o, {
					variant: t === e ? "secondary" : "ghost",
					size: "small",
					"aria-label": `第 ${t} 页`,
					"aria-current": t === e ? "page" : void 0,
					onClick: () => n(Number(t)),
					children: t
				}) }, t === "…" ? `dots-${r}` : t))
			}),
			/* @__PURE__ */ (0, Q.jsx)(o, {
				variant: "secondary",
				size: "small",
				disabled: e >= t,
				onClick: () => n(e + 1),
				children: "下一页"
			})
		]
	});
}
function Zt(r) {
	let [i, a] = (0, q.useState)(() => matchMedia("(max-width:900px)").matches);
	(0, q.useEffect)(() => {
		let e = matchMedia("(max-width:900px)"), t = () => a(e.matches);
		return e.addEventListener("change", t), () => e.removeEventListener("change", t);
	}, []);
	let { route: s, openItem: c, openEntity: l, revealSource: u, toast: d, readOnly: f, readOnlyMessage: m, writerUrl: h } = r, [_, v] = (0, q.useState)(me(r.category) ? r.category : p), [y, te] = (0, q.useState)(() => Ee(r.queue)), [ne, re] = (0, q.useState)("candidates"), [E, D] = (0, q.useState)(""), [O, k] = (0, q.useState)(""), [A, j] = (0, q.useState)(1), [M, N] = (0, q.useState)(/* @__PURE__ */ new Set()), [P, F] = (0, q.useState)(/* @__PURE__ */ new Map()), [I, L] = (0, q.useState)(/* @__PURE__ */ new Map()), [ae, R] = (0, q.useState)(""), oe = (0, q.useRef)(null), [z, he] = (0, q.useState)(0), [ge, ye] = (0, q.useState)(""), be = (0, q.useRef)(!0);
	(0, q.useEffect)(() => () => {
		be.current = !1;
	}, []);
	let V = Fe({
		queryKey: S,
		queryFn: ({ signal: e }) => de(e)
	}), xe = V.data || {
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
	}, Se = Te(xe, y), Ce = V.data ? Object.fromEntries(w.map((e) => [e, x.reduce((t, n) => t + Number(Te(xe, e).counts[n] || 0), 0)])) : void 0, H = Se.sections[_] || [], U = _ === "metadata_fields", W = f;
	(0, q.useEffect)(() => {
		let e = new Set(H.map((e) => e.item_key));
		N((t) => {
			let n = [...t].filter((t) => e.has(t));
			return n.length === t.size ? t : new Set(n);
		}), F((t) => {
			let n = [...t].filter(([t]) => e.has(t));
			return n.length === t.size ? t : new Map(n);
		}), L((t) => {
			let n = [...t].filter(([t]) => e.has(t));
			return n.length === t.size ? t : new Map(n);
		});
	}, [H]);
	let Oe = (0, q.useMemo)(() => U ? pe(H, "field") : [], [H, U]), ke = Oe.some((e) => e.key === O) ? O : "", G = (0, q.useMemo)(() => U ? fe(H, "field", ke) : H, [
		H,
		U,
		ke
	]), Me = (0, q.useMemo)(() => we(G, U), [G, U]), K = Me.some(([e]) => e === ne) ? ne : "candidates", Ie = (0, q.useMemo)(() => pe(G, K), [G, K]), Re = Ie.some((e) => e.key === E) ? E : "", ze = (0, q.useMemo)(() => De(fe(G, K, Re), A), [
		G,
		K,
		Re,
		A
	]), Ve = ze.rows.map((e) => e.item_key), He = new Set(Ve), Ue = Ie.map((e) => ({
		...e,
		rows: e.rows.filter((e) => He.has(e.item_key))
	})).filter((e) => e.rows.length), We = (e) => P.get(e.item_key) || ue(e), J = (0, q.useMemo)(() => H.filter((e) => M.has(e.item_key)), [H, M]), Ge = (e) => {
		let t = new Set(e);
		N((e) => new Set([...e].filter((e) => !t.has(e)))), F((e) => new Map([...e].filter(([e]) => !t.has(e)))), L((e) => new Map([...e].filter(([e]) => !t.has(e))));
	}, Ke = (e, t) => L((n) => new Map(n).set(e, t)), Y = () => {
		re("candidates"), D(""), k(""), j(1), N(/* @__PURE__ */ new Set()), F(/* @__PURE__ */ new Map()), L(/* @__PURE__ */ new Map()), R(""), oe.current = null;
	}, qe = (e) => {
		v(e), Y(), s({
			category: e === "metadata_fields" ? "" : e,
			queue: y === "pending" ? "" : y
		});
	}, Je = (e) => {
		te(e), Y(), s({
			category: _ === "metadata_fields" ? "" : _,
			queue: e === "pending" ? "" : e
		});
	}, X = Pe({
		mutationFn: ({ row: e, status: t, category: n }) => Ne(ce(n, se(n, e), t, We(e))),
		onSuccess: (e, { row: t, status: n, category: r }) => {
			e.ok ? (je(r, [t.item_key], n), Ge([t.item_key]), d(le(n))) : Ke(t.item_key, e.error || "服务端拒绝了这次判定");
		},
		onError: (e, { row: t }) => Ke(t.item_key, B(e))
	}), Z = Pe({
		mutationFn: async ({ status: e, category: t, rows: n }) => {
			let r = [], i = [];
			for (let [a, o] of n.entries()) {
				if (!be.current) break;
				R(`正在处理 ${a} / ${n.length}`);
				try {
					let n = await Ne(ce(t, se(t, o), e, We(o)));
					if (!n.ok) throw Error(n.error || "服务端未采用该项");
					r.push(o.item_key);
				} catch (e) {
					i.push([o.item_key, B(e)]);
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
			je(t, n, e), Ge(n), r.forEach(([e, t]) => Ke(e, t)), R("");
			let i = {
				approved: "通过",
				rejected: "忽略",
				skipped: "移至稍后处理",
				restore: "恢复待处理"
			}[e];
			d(`已${i} ${n.length} 项` + (r.length ? `，${r.length} 项未完成` : ""));
		},
		onError: (e) => {
			R(B(e));
		}
	}), Ye = (e) => {
		!Z.isPending && J.length && (e === "approved" && U && J.some((e) => !We(e).candidateKey) ? R("请先为所选资料选择要采用的来源。") : (R(""), Z.mutate({
			status: e,
			category: _,
			rows: J
		})));
	}, Xe = (e) => {
		F((t) => {
			let n = new Map(t);
			for (let t of J) {
				let r = t.candidates?.find((t) => t.source === e);
				r && n.set(t.item_key, {
					...We(t),
					candidateKey: r.candidate_key
				});
			}
			return n;
		}), R(`已选择 ${e}，点击通过所选采用。`);
	}, Ze = async (e) => {
		if (z) return;
		he(e), ye("");
		let t = await u(e);
		be.current && (he(0), ye(t));
	}, Qe = ve(xe.mirror, m), $e = xe.genre_tags || [], nt = {
		openItem: c,
		openEntity: l,
		onReveal: Ze,
		revealing: z,
		revealNote: ge,
		toast: d
	};
	return /* @__PURE__ */ (0, Q.jsx)(Le, { children: /* @__PURE__ */ (0, Q.jsxs)("div", {
		className: "flex flex-col gap-5 pb-10",
		children: [
			W ? /* @__PURE__ */ (0, Q.jsx)(b, {
				tone: "warning",
				title: "本机只能浏览",
				extra: h ? /* @__PURE__ */ (0, Q.jsx)("p", {
					className: "text-body-2-regular",
					children: /* @__PURE__ */ (0, Q.jsx)(g, {
						href: h,
						children: "前往写入端复核"
					})
				}) : void 0,
				children: Qe
			}) : null,
			/* @__PURE__ */ (0, Q.jsx)(kt, { tags: $e }),
			/* @__PURE__ */ (0, Q.jsxs)(n, {
				orientation: i ? "horizontal" : "vertical",
				selectedKey: _,
				onSelectionChange: (e) => {
					let t = String(e);
					me(t) && qe(t);
				},
				className: "flex flex-col gap-5 review-split:flex-row review-split:items-start review-split:gap-6",
				children: [/* @__PURE__ */ (0, Q.jsxs)("div", {
					"data-section-nav": !0,
					className: "w-full min-w-0 review-split:sticky review-split:top-topbar review-split:w-review-tabs review-split:shrink-0",
					children: [/* @__PURE__ */ (0, Q.jsx)("h2", {
						id: "reviewcategories",
						children: "复核分类"
					}), /* @__PURE__ */ (0, Q.jsx)(Be, {
						scrollable: i,
						"aria-labelledby": "reviewcategories",
						"data-section-items": !0,
						className: "flex review-split:flex-col review-split:items-stretch",
						children: x.map((e) => {
							let n = Number(Se.counts[e] || 0);
							return /* @__PURE__ */ (0, Q.jsxs)(t, {
								id: e,
								className: Yt,
								isDisabled: X.isPending || Z.isPending,
								"data-pill-selected": _ === e ? "" : void 0,
								"data-pill-variant": "gray",
								children: [C[e], n ? /* @__PURE__ */ (0, Q.jsx)("span", {
									className: "tabular-nums text-caption-1-medium text-text-secondary",
									children: n.toLocaleString()
								}) : null]
							}, e);
						})
					})]
				}), /* @__PURE__ */ (0, Q.jsxs)(e, {
					id: _,
					className: "flex min-w-0 flex-1 flex-col gap-5",
					children: [
						/* @__PURE__ */ (0, Q.jsx)(tt, {
							queueView: y,
							queueCounts: Ce,
							onQueueChange: Je,
							locked: W,
							fields: Oe,
							fieldFilter: ke,
							onFieldFilter: (e) => {
								k(e), D(""), j(1);
							},
							groupOptions: Me,
							groupBy: K,
							onGroupBy: (e) => {
								re(e), D(""), j(1);
							},
							groups: Ie,
							filter: Re,
							onFilter: (e) => {
								D(e), j(1);
							},
							pageKeys: Ve,
							selected: M,
							onSelected: N,
							selectedRows: J,
							metadata: U,
							approvable: J.every((e) => ie(_, e)),
							busy: Z.isPending || X.isPending,
							feedback: ae,
							onUnifySource: Xe,
							onRun: Ye
						}),
						ze.rows.length ? Ue.map((e) => /* @__PURE__ */ (0, Q.jsxs)("section", {
							className: "flex flex-col gap-3",
							children: [Ue.length > 1 || K !== "candidates" ? /* @__PURE__ */ (0, Q.jsxs)("div", {
								className: "flex flex-wrap items-center gap-2",
								children: [/* @__PURE__ */ (0, Q.jsx)("h3", {
									className: "text-body-medium text-text-primary",
									children: `${e.title} · ${e.rows.length}`
								}), W ? null : /* @__PURE__ */ (0, Q.jsx)(o, {
									variant: "ghost",
									size: "small",
									onClick: () => {
										let t = e.rows.map((e) => e.item_key), n = t.every((e) => M.has(e)), r = new Set(M);
										for (let e of t) n ? r.delete(e) : r.add(e);
										N(r);
									},
									children: e.rows.every((e) => M.has(e.item_key)) ? "清空本组" : "全选本组"
								})]
							}) : null, /* @__PURE__ */ (0, Q.jsx)("div", {
								className: "review-grid gap-5",
								children: e.rows.map((e) => /* @__PURE__ */ (0, Q.jsx)(Jt, {
									category: _,
									row: e,
									queueView: y,
									choice: We(e),
									onChoice: (t) => F((n) => new Map(n).set(e.item_key, t)),
									selected: M.has(e.item_key),
									onSelect: (t, n) => N((r) => {
										let i = new Set(r);
										return oe.current = Ae(i, Ve, oe.current, e.item_key, t, n), i;
									}),
									locked: W,
									busy: Z.isPending || X.isPending && X.variables?.row.item_key === e.item_key,
									problem: I.get(e.item_key) || "",
									genreTags: $e,
									onDecide: (t) => {
										X.isPending || Z.isPending || (L((t) => new Map([...t].filter(([t]) => t !== e.item_key))), X.mutate({
											row: e,
											status: t,
											category: _
										}));
									},
									handlers: nt
								}, e.item_key))
							})]
						}, e.key)) : V.isError && !V.data ? /* @__PURE__ */ (0, Q.jsx)(b, {
							tone: "error",
							title: "复核队列读取失败",
							action: /* @__PURE__ */ (0, Q.jsx)(o, {
								variant: "secondary",
								size: "small",
								disabled: V.isFetching,
								onClick: () => void V.refetch(),
								children: "立即重试"
							}),
							children: B(V.error)
						}) : /* @__PURE__ */ (0, Q.jsx)(ee, {
							icon: _e,
							title: `此分类没有${T[y]}项目`,
							actions: x.some((e) => e !== _ && Number(Se.counts[e] || 0) > 0) ? /* @__PURE__ */ (0, Q.jsx)(o, {
								size: "small",
								onClick: () => {
									let e = x.find((e) => e !== _ && Number(Se.counts[e] || 0) > 0);
									e && qe(e);
								},
								children: "查看其他分类"
							}) : void 0,
							children: y === "pending" ? "可切换分类查看其他待确认资料。" : `${T[y]}的资料会保留在这里，可恢复到待处理。`
						}),
						/* @__PURE__ */ (0, Q.jsx)(Xt, {
							page: ze.page,
							pages: ze.pages,
							onPage: j
						}),
						U && y === "pending" ? /* @__PURE__ */ (0, Q.jsx)(et, {
							locked: W,
							openItem: c,
							toast: d
						}) : null
					]
				})]
			})
		]
	}) });
}
export { Zt as ReviewPage };

//# debugId=3f268e66-ba55-4603-a484-c03e96069af0
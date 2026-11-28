(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "07f10e6a-e089-4630-ad67-00bf5fdb9eac", e._sentryDebugIdIdentifier = "sentry-dbid-07f10e6a-e089-4630-ad67-00bf5fdb9eac");
	} catch {}
})();
import { AnimatedNumber as e, BATCH_DELETE_TEXT as t, BC as n, Button as r, CLEANUP_ENTRY as i, CLEANUP_ENTRY_GRID as a, CLEANUP_HASH_REDIRECTS as o, CLEANUP_TOOLS as s, Chip as c, ColumnFilterAvatar as l, DIRECTORY_TEMPLATE_ERROR as u, DUPLICATES_KEY as d, DataTable as f, Fieldset as p, FieldsetTitle as m, IDLE_REPAIR as h, IconButton as g, IndexSearch as _, Input as v, JUNK_KEY as y, LEGACY_AVATAR_IMG as b, LINKS_KEY as x, LINK_CHECK_KEY as S, LINK_KINDS as C, LINK_PRUNE_KEY as w, LOC as T, LibraryLabel as E, LibraryProcessingCard as D, M6 as O, MEDIA_REPAIR_KEY as k, MEDIA_REPAIR_URL as A, MEDIA_SOURCES_KEY as ee, MEDIA_SOURCE_ICONS as te, Note as j, ORGANIZE_KEY as ne, ORGANIZE_PARAMETER_HINT as M, ORGANIZE_SCOPE_HINT as re, ORGANIZE_TEXT as ie, ORPHAN_RECORDS_KEY as N, ORPHAN_RECORDS_TEXT as ae, PERFORMER_DELETE_KEY as oe, PLAIN_STAT_STRIP as P, PlainStat as F, Progress as I, QUALITY_GOALS_KEY as L, RECORD_LABELS as se, REPAIR_CARD_TEXT as ce, REPAIR_LIBRARIES_KEY as le, RESOURCE_APPLY_KEY as ue, RESOURCE_SCAN_KEY as de, RESOURCE_SYNC_TEXT as fe, RESULT_PANEL as pe, RESULT_SECTION as me, REVIEW_COUNTS_KEY as he, SOURCE_LABELS as R, SectionHeading as ge, Select as _e, SelectItem as ve, SiteMark as z, SourceLabel as ye, SourceMark as be, StatusLabel as xe, TRASH_KEY as Se, TaskProgress as B, Wt as Ce, __toESM as we, activityKind as V, apiSend as Te, applyConfirmText as Ee, applyLeftovers as De, applyPlanText as Oe, applyText as ke, attachOrphan as Ae, baseName as je, busyProps as H, candidateText as Me, checkLine as Ne, cleanupToolSkeletonHtml as Pe, codedText as Fe, confirmModal as Ie, cx as Le, dZ as Re, deletePerformerVideos as ze, entityDisplayName as Be, entityFaceImg as Ve, entityPath as He, errorMessage as U, esc as Ue, fetchDeletePerformers as We, fetchDeletePlan as Ge, fetchDuplicates as Ke, fetchJunkSummary as qe, fetchLinkCheck as Je, fetchLinkPrune as Ye, fetchLinkStats as Xe, fetchMediaRepair as Ze, fetchMediaSources as Qe, fetchOrganize as $e, fetchOrganizeExample as et, fetchOrphanRecords as tt, fetchQualityGoals as nt, fetchRepairLibraries as rt, fetchResourceApply as it, fetchResourceScan as at, fetchReviewCounts as ot, fetchTrashSummary as st, firstGrapheme as ct, fmtSize as W, hasChanges as lt, hasResourceRoots as ut, jobText as G, junkBreakdown as dt, ks as ft, linkLabel as pt, missingToolText as mt, organizeOutcome as ht, peachHistory$1 as gt, pickOrganizeFolder as _t, plainStatClass as K, planSummary as vt, previewOrganize as yt, pruneText as bt, purgeCount as xt, purgeOrphan as St, queryClient as q, recordsText as Ct, rememberTemplates as wt, require_jsx_runtime as Tt, require_react as Et, reviewSummary as Dt, runBulkAction as Ot, scanLine as kt, serverLabel as At, sourceMeta as jt, spriteGlyph as J, stageText as Mt, startLinkCheck as Nt, startLinkPrune as Pt, startOrganize as Ft, startResourceApply as It, startResourceScan as Lt, statusLine as Rt, t as Y, useAction as zt, useBackgroundJob as X, useEntityNames as Bt, useMutation as Vt, useOrderedLibraries as Ht, useQuery as Z, withOrganizeJob as Ut } from "./peach-app.js";
import { Page as Wt } from "./peach-app.page-QAncjzM1.js";
import { ErrorExcerpt as Gt } from "./peach-app.error-excerpt-Ugft6I5o.js";
import { FolderSearchIcon as Kt } from "./peach-app.folder-rows-C3hhF_90.js";
import { ConnectionStatus as qt } from "./peach-app.connection-status-BrXhLGSm.js";
// src/react/data-cleanup/cleanup-entry-card.tsx
var Q = /* @__PURE__ */ we(Et(), 1), $ = Tt(), Jt = J("chevron-right");
function Yt({ label: e, icon: t, summary: n, detail: r, state: a, attributes: o, onOpen: s }) {
	return /* @__PURE__ */ (0, $.jsxs)("button", {
		type: "button",
		...o,
		className: i.face,
		onClick: s,
		"data-entry-state": a,
		"aria-busy": a === "loading" || void 0,
		children: [
			/* @__PURE__ */ (0, $.jsx)("span", {
				"aria-hidden": !0,
				className: i.icon,
				children: /* @__PURE__ */ (0, $.jsx)(t, {
					"aria-hidden": !0,
					className: "size-5"
				})
			}),
			/* @__PURE__ */ (0, $.jsxs)("span", {
				className: i.body,
				children: [
					/* @__PURE__ */ (0, $.jsx)("span", {
						className: i.title,
						children: e
					}),
					/* @__PURE__ */ (0, $.jsx)("span", {
						className: Le(i.summary, a === "error" && "text-text-error-primary"),
						children: n
					}),
					r ? /* @__PURE__ */ (0, $.jsx)("span", {
						className: i.detail,
						children: r
					}) : null
				]
			}),
			/* @__PURE__ */ (0, $.jsx)(Jt, {
				"aria-hidden": !0,
				className: i.arrow
			})
		]
	});
}
// src/react/media-repair/media-repair-card.tsx
var Xt = (e) => te[e] || e, Zt = (e) => q.setQueryData(k, e);
function Qt({ toast: e = () => {} }) {
	let t = X({
		queryKey: k,
		queryFn: ({ signal: e }) => Ze(e),
		start: (e) => Te(A, {
			library: e,
			restart: !0
		}),
		onFinish: (t) => {
			t.status === "complete" && !t.failed && !t.missing_tool && e(t.repaired ? Y("cleanup:mediaRepair.repaired", { count: t.repaired }) : Y("cleanup:mediaRepair.nothingToRepair"));
		}
	}), n = Z({
		queryKey: le,
		queryFn: ({ signal: e }) => rt(e)
	}), [i, a] = (0, Q.useState)(""), o = zt(), s = t.job ?? h, c = Ht(n.data ?? [], (e) => e.id), l = s.status === "running", u = c.find((e) => e.id === (l ? s.library : i)) ?? c.find((e) => e.id === s.library) ?? c[0], d = () => {
		u && Ie({
			title: Y("cleanup:mediaRepair.confirmTitle", { name: u.name }),
			body: [Y("cleanup:mediaRepair.body"), ...u.metered ? [Y("cleanup:mediaRepair.meteredWarning")] : []].join(Y("cleanup:shared.sentenceGap")),
			confirmLabel: Y("cleanup:mediaRepair.confirm"),
			onConfirm: async () => {
				await t.start.mutateAsync(u.id);
			}
		});
	}, f = () => void o.run("stop", (e) => Te(A, { stop: !0 }, "POST", e), Zt), g = t.outcome, _ = Rt(l ? s : g ?? h), v = o.error || G(g, "error") || (t.query.error ? Y("cleanup:mediaRepair.statusUnavailable") : "");
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [/* @__PURE__ */ (0, $.jsx)(p, {
			layout: "split",
			label: Y("cleanup:tools.mediaRepair"),
			footer: /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)(_e, {
				"aria-label": Y("cleanup:mediaRepair.library"),
				prefix: Y("cleanup:mediaRepair.library"),
				className: "w-48",
				selectedKey: u?.id ?? null,
				isDisabled: l || !c.length,
				"aria-busy": n.isPending || void 0,
				onSelectionChange: (e) => {
					e !== null && a(String(e));
				},
				children: c.map((e) => /* @__PURE__ */ (0, $.jsx)(ve, {
					id: e.id,
					textValue: e.name,
					children: /* @__PURE__ */ (0, $.jsx)(E, { library: {
						id: e.id,
						name: e.name,
						icon: Xt(e.icon)
					} })
				}, e.id))
			}), l ? /* @__PURE__ */ (0, $.jsx)(r, {
				onClick: f,
				...H(o.busy === "stop"),
				children: Y("cleanup:shared.stop")
			}) : /* @__PURE__ */ (0, $.jsx)(r, {
				onClick: d,
				disabled: !u,
				children: Y("cleanup:mediaRepair.start")
			})] }),
			children: /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, $.jsx)(m, { children: Y("cleanup:tools.mediaRepair") }),
					/* @__PURE__ */ (0, $.jsx)("p", {
						className: "text-body-2-regular text-text-secondary",
						children: ce
					}),
					l && s.total ? /* @__PURE__ */ (0, $.jsx)(I, {
						label: Y("cleanup:mediaRepair.progress"),
						value: s.checked,
						max: s.total
					}) : null,
					_ ? /* @__PURE__ */ (0, $.jsx)("p", {
						role: "status",
						className: "text-caption-1-regular text-text-secondary",
						children: _
					}) : null
				]
			})
		}), /* @__PURE__ */ (0, $.jsxs)("div", {
			"aria-live": "polite",
			className: "flex flex-col gap-4 empty:hidden",
			children: [
				g?.status === "complete" && g.missing_tool ? /* @__PURE__ */ (0, $.jsx)(j, {
					tone: "warning",
					title: Y("cleanup:mediaRepair.missingTool"),
					action: /* @__PURE__ */ (0, $.jsx)(r, {
						variant: "ghost",
						size: "small",
						onClick: t.dismiss,
						children: Y("cleanup:mediaRepair.dismiss")
					}),
					children: mt(g)
				}) : null,
				n.isError ? /* @__PURE__ */ (0, $.jsx)(j, {
					tone: "error",
					children: Y("cleanup:mediaRepair.librariesUnavailable")
				}) : null,
				v ? /* @__PURE__ */ (0, $.jsx)(j, {
					tone: "error",
					children: v
				}) : null
			]
		})]
	});
}
// src/react/data-cleanup/link-check-icon.tsx
function $t({ className: e }) {
	return /* @__PURE__ */ (0, $.jsxs)("svg", {
		"aria-hidden": !0,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		className: e,
		"data-link-check-icon": "",
		children: [
			/* @__PURE__ */ (0, $.jsx)("path", { d: "m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" }),
			/* @__PURE__ */ (0, $.jsx)("path", { d: "m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" }),
			/* @__PURE__ */ (0, $.jsxs)("g", {
				"data-link-check-rays": "",
				children: [
					/* @__PURE__ */ (0, $.jsx)("path", { d: "M8 2v3" }),
					/* @__PURE__ */ (0, $.jsx)("path", { d: "M2 8h3" }),
					/* @__PURE__ */ (0, $.jsx)("path", { d: "M16 19v3" }),
					/* @__PURE__ */ (0, $.jsx)("path", { d: "M19 16h3" })
				]
			})
		]
	});
}
// src/react/data-cleanup/link-manager.tsx
var en = J("rotate-cw"), tn = Y("cleanup:links.goneHint"), nn = Y("cleanup:links.unclearHint"), rn = Y("cleanup:links.pruneHint"), an = Y("cleanup:shared.reconnecting"), on = (e) => Number(e || 0).toLocaleString();
function sn({ label: e, value: t, note: n }) {
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "flex min-w-0 flex-col gap-0.5",
		children: [
			/* @__PURE__ */ (0, $.jsx)("span", {
				className: "text-caption-1-regular leading-5 text-text-secondary",
				children: e
			}),
			/* @__PURE__ */ (0, $.jsx)("b", {
				className: "text-title-2-semibold font-bold leading-5 tabular-nums text-text-primary",
				children: t
			}),
			n ? /* @__PURE__ */ (0, $.jsx)("small", {
				className: "text-caption-1-regular leading-5 text-text-secondary",
				children: n
			}) : null
		]
	});
}
function cn({ title: e, items: t, hint: r, picked: i, onPick: a, actions: o, controls: s, retry: c, retrying: u, footer: d, confirmed: p = !1 }) {
	if (!t.length) return null;
	let m = [
		{
			id: "entity",
			label: Y("cleanup:links.columnEntry"),
			width: 180,
			min: 128,
			value: (e) => e.entity,
			filter: {
				values: (e) => e.entity,
				option: (e, t) => ({ leading: t && /* @__PURE__ */ (0, $.jsx)(l, {
					person: {
						...t.face,
						id: t.entity_id,
						name: e
					},
					kind: t.entity_kind,
					markId: t.entity_kind === "studio" || t.entity_kind === "agency" ? t.id : null
				}) })
			},
			render: (e) => /* @__PURE__ */ (0, $.jsxs)("a", {
				className: "flex min-w-24 items-center gap-2 text-text-secondary hover:text-text-primary hover:underline",
				href: e.entity_id && e.entity_kind ? He(e.entity_kind, e.entity, e.entity_id) : void 0,
				"data-link-identity": "",
				children: [/* @__PURE__ */ (0, $.jsx)("span", {
					"data-link-avatar": "",
					className: `relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-media-placeholder text-caption-1-medium text-text-primary ${b}`,
					"aria-hidden": !0,
					dangerouslySetInnerHTML: { __html: `<span>${Ue(ct(e.entity))}</span>` + Ve({
						kind: e.entity_kind,
						id: e.entity_id,
						hasImage: e.face?.has_image,
						version: e.face?.image_version,
						focus: e.face?.avatar_focus,
						thumb: !0,
						mark: e.entity_kind === "studio" || e.entity_kind === "agency" ? e.id : null
					}) }
				}), /* @__PURE__ */ (0, $.jsx)("span", {
					className: "min-w-0 wrap-anywhere",
					children: e.entity
				})]
			})
		},
		{
			id: "kind",
			label: Y("cleanup:shared.type"),
			width: 128,
			value: (e) => C[e.link_kind] || e.link_kind,
			filter: {
				values: (e) => e.link_kind,
				option: (e) => ({ label: C[e] || e })
			},
			render: (e) => C[e.link_kind] || e.link_kind
		},
		{
			id: "label",
			label: Y("cleanup:links.columnName"),
			min: 128,
			value: (e) => pt(e.label),
			filter: {
				values: (e) => pt(e.label) || new URL(e.url).hostname,
				option: (e, t) => ({ leading: t && /* @__PURE__ */ (0, $.jsx)(z, { linkId: t.id }) })
			},
			render: (e) => /* @__PURE__ */ (0, $.jsx)("span", {
				className: "flex min-w-24 items-center gap-2",
				"data-link-name": "",
				children: /* @__PURE__ */ (0, $.jsx)("span", {
					className: "min-w-0 wrap-anywhere",
					children: pt(e.label) || new URL(e.url).hostname
				})
			})
		},
		{
			id: "note",
			label: Y("cleanup:links.columnResult"),
			width: 320,
			min: 192,
			value: (e) => e.note,
			filter: { values: (e) => At(e.note_code ?? "", e.note, e.note_params) },
			render: (e) => /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "min-w-0 w-full",
				"data-link-result": p ? "gone" : "unclear",
				children: [/^(?:HTTP\s+)?[1-5]\d{2}$/.test(e.note.trim()) ? /* @__PURE__ */ (0, $.jsx)(xe, {
					tone: p || /^(?:HTTP\s+)?5\d{2}$/.test(e.note.trim()) ? "error" : "warning",
					"data-link-code": "",
					children: e.note.trim()
				}) : /* @__PURE__ */ (0, $.jsxs)("div", {
					className: "flex flex-col items-start gap-1",
					children: [/* @__PURE__ */ (0, $.jsx)(xe, {
						tone: p ? "error" : "warning",
						children: Y(p ? "cleanup:links.dead" : "cleanup:links.inconclusive")
					}), /* @__PURE__ */ (0, $.jsx)(Gt, {
						text: At(e.note_code ?? "", e.note, e.note_params),
						className: "tabular-nums text-text-secondary"
					})]
				}), !p && e.temporary && e.attempts ? /* @__PURE__ */ (0, $.jsx)("span", {
					"data-link-rechecked": "",
					className: "mt-1 block text-body-2-regular text-text-secondary",
					children: Y("cleanup:links.rechecked", { count: e.attempts })
				}) : null]
			})
		},
		{
			id: "url",
			label: Y("cleanup:links.columnUrl"),
			width: 360,
			min: 180,
			value: (e) => e.url,
			filter: {
				values: (e) => new URL(e.url).hostname,
				option: (e, t) => ({ leading: t && /* @__PURE__ */ (0, $.jsx)(z, { linkId: t.id }) })
			},
			render: (e) => /* @__PURE__ */ (0, $.jsxs)("a", {
				href: e.url,
				target: "_blank",
				rel: "noopener noreferrer",
				title: e.url,
				"data-link-address": "",
				className: "flex min-w-0 items-center gap-1 text-text-secondary hover:text-text-primary",
				children: [
					/* @__PURE__ */ (0, $.jsx)(z, { linkId: e.id }),
					/* @__PURE__ */ (0, $.jsx)("span", {
						"data-middle-truncate": !0,
						className: "min-w-0 truncate",
						children: e.url
					}),
					/* @__PURE__ */ (0, $.jsx)(Ce, {
						"aria-hidden": !0,
						className: "size-(--icon-inline) shrink-0"
					})
				]
			})
		}
	];
	return /* @__PURE__ */ (0, $.jsx)("div", {
		className: me,
		"data-link-results": p ? "gone" : "unclear",
		children: /* @__PURE__ */ (0, $.jsx)(f, {
			preferenceId: p ? "links-dead" : "links-unreached",
			label: e,
			items: t,
			columns: m,
			rowId: (e) => String(e.id),
			description: r,
			unit: Y("cleanup:links.unit"),
			panel: !1,
			footerActions: d,
			rowLabel: (e) => Y("cleanup:links.rowLabel", {
				entity: e.entity,
				link: pt(e.label) || e.url
			}),
			selected: i.map(String),
			onSelected: (e) => a(e.map(Number)),
			contextOperations: (e) => [{
				id: "copy",
				label: Y("cleanup:links.copyLink"),
				icon: n,
				run: () => navigator.clipboard.writeText(e.url)
			}, ...c ? [{
				id: "retry",
				label: Y("manage:shared.retryNow"),
				icon: Re,
				disabled: u,
				run: () => c(e.id)
			}] : []],
			actions: (e) => o?.(e) ?? [],
			controls: () => s
		})
	});
}
function ln() {
	let t = Z({
		queryKey: x,
		queryFn: ({ signal: e }) => Xe(e)
	}), [n, i] = (0, Q.useState)([]), [a, o] = (0, Q.useState)([]), s = X({
		queryKey: w,
		queryFn: ({ signal: e }) => Ye(e),
		start: Pt,
		onFinish: () => {
			q.invalidateQueries({
				queryKey: x,
				exact: !0
			}), q.invalidateQueries({
				queryKey: S,
				exact: !0
			});
		}
	}), l = X({
		queryKey: S,
		queryFn: ({ signal: e }) => Je(e),
		start: Nt,
		onStarted: () => {
			s.dismiss(), i([]), o([]);
		}
	}), u = l.job, d = u?.check_id ?? "";
	(0, Q.useEffect)(() => {
		i([]), o([]);
	}, [d]);
	let f = l.running || l.start.isPending, h = s.running || s.start.isPending, g = s.running ? s.job : void 0, _ = !!l.job && !!s.job, v = u?.status === "complete", y = u?.gone ?? [], b = u?.unclear ?? [], T = v ? b : [], E = T.filter((e) => n.includes(e.id)).map((e) => e.id), D = t.data, k = (D?.top_hosts ?? []).slice(0, 3), A = (e) => {
		!_ || f || e && !e.length || l.start.mutate(e ? {
			retry: e,
			checkId: d
		} : {});
	}, ee = (e, t = !1) => ({
		key: t ? "prune-all" : "prune",
		label: e,
		reversal: "irreversible",
		danger: !0,
		holdToConfirm: !0,
		confirm: (e) => ({
			title: Y("cleanup:links.deleteDead"),
			danger: !0,
			body: Y("cleanup:links.deleteDeadBody", { count: e.length })
		}),
		run: async (e) => {
			await s.start.mutateAsync({
				checkId: d,
				ids: t ? void 0 : e.map((e) => e.id)
			});
		},
		receipt: () => ""
	}), te = { receipt: () => {} }, ne = () => {
		_ && !h && y.length && Ot(ee(Y("cleanup:links.deleteDead"), !0), y, te);
	}, M = h || s.start.isError ? null : s.outcome, re = l.start.error ?? s.start.error, ie = null, N = null;
	if (M?.status === "failed") N = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:links.pruneIncomplete"),
		children: G(M, "error") || Y("cleanup:links.checkTaskLog")
	});
	else if (M && !y.length && !b.length) N = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "success",
		title: Y("cleanup:links.pruneDone"),
		children: bt(M)
	});
	else if (re) N = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:links.checkFailed"),
		children: U(re)
	});
	else if (l.query.isError && u) N = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "neutral",
		title: Y("cleanup:shared.taskStatus"),
		children: an
	});
	else if (u?.status === "failed") N = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:links.checkFailed"),
		children: G(u, "error") || Y("cleanup:links.checkFailed")
	});
	else if (u && u.status !== "idle") {
		let t = Ne(u);
		ie = /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [u.status === "running" ? /* @__PURE__ */ (0, $.jsx)(B, {
			embedded: !0,
			kind: V("link-check"),
			label: t,
			labelContent: u.total ? /* @__PURE__ */ (0, $.jsx)(e, { value: t }) : t,
			value: Math.min(u.checked || 0, u.total || 0),
			total: u.total
		}) : null, h ? /* @__PURE__ */ (0, $.jsx)(B, {
			embedded: !0,
			kind: V("link-prune"),
			label: G(g) || Y("cleanup:links.pruning"),
			value: g?.checked,
			total: g?.total
		}) : null] });
		let s = Y("cleanup:links.retrySelected", { count: E.length });
		N = v || y.length || b.length ? /* @__PURE__ */ (0, $.jsxs)("div", {
			className: pe,
			children: [
				M?.status === "complete" ? /* @__PURE__ */ (0, $.jsx)(j, {
					tone: "success",
					title: Y("cleanup:links.pruneDone"),
					children: bt(M)
				}) : null,
				/* @__PURE__ */ (0, $.jsx)(cn, {
					title: Y("cleanup:links.dead"),
					items: y,
					hint: tn,
					picked: a,
					onPick: o,
					confirmed: !0,
					footer: v && y.length ? /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)("p", {
						className: "mr-auto min-w-0 text-caption-1-regular text-text-secondary",
						children: rn
					}), /* @__PURE__ */ (0, $.jsx)(r, {
						variant: "danger",
						...H(h),
						onClick: ne,
						children: Y("cleanup:links.deleteDeadCount", { count: y.length })
					})] }) : null,
					actions: (e) => [{
						action: ee(Y("cleanup:links.deleteSelected", { count: e.length })),
						items: e,
						host: te,
						disabled: !v || h,
						rowAction: {
							label: Y("cleanup:links.deleteDead"),
							icon: O
						}
					}]
				}),
				/* @__PURE__ */ (0, $.jsx)(cn, {
					title: Y("cleanup:links.unreached"),
					items: b,
					hint: nn,
					picked: n,
					onPick: i,
					retry: v ? (e) => A([e]) : void 0,
					retrying: f,
					footer: T.length ? /* @__PURE__ */ (0, $.jsx)(r, {
						variant: "primary",
						leadingIcon: en,
						...H(f),
						onClick: () => A(T.map((e) => e.id)),
						children: Y("cleanup:links.retryAll", { count: T.length })
					}) : null,
					controls: T.length ? /* @__PURE__ */ (0, $.jsx)(r, {
						variant: "secondary",
						leadingIcon: en,
						disabled: !E.length,
						...H(f),
						onClick: () => A(E),
						children: s
					}) : null
				}),
				v && !y.length && !b.length ? /* @__PURE__ */ (0, $.jsx)("p", {
					className: `${me} text-body-regular text-notification-success-foreground`,
					children: Y("cleanup:links.allReachable")
				}) : null
			]
		}) : null;
	}
	return /* @__PURE__ */ (0, $.jsxs)("section", {
		id: "link-manager",
		"aria-labelledby": "link-manager-title",
		className: "flex scroll-mt-20 flex-col gap-4",
		children: [/* @__PURE__ */ (0, $.jsxs)(p, {
			layout: "stack",
			labelledBy: "link-manager-title",
			footer: /* @__PURE__ */ (0, $.jsx)(r, {
				"data-link-check": "",
				leadingIcon: $t,
				disabled: !_,
				...H(f),
				onClick: () => A(),
				children: Y(f ? "cleanup:links.checking" : v ? "cleanup:links.checkAgain" : "cleanup:links.checkLinks")
			}),
			children: [
				/* @__PURE__ */ (0, $.jsx)(m, {
					id: "link-manager-title",
					gap: "small",
					children: Y("cleanup:tools.links")
				}),
				t.isError ? /* @__PURE__ */ (0, $.jsx)(j, {
					tone: "error",
					title: Y("cleanup:links.statsLoadFailed"),
					children: U(t.error)
				}) : D ? /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsxs)("div", {
					className: "link-stat-grid mt-4 gap-x-8 gap-y-3",
					children: [/* @__PURE__ */ (0, $.jsx)(sn, {
						label: Y("cleanup:links.totalLinks"),
						value: on(D.total),
						note: Y("cleanup:links.entitySpread", { count: Number(D.entities || 0) })
					}), Object.entries(D.by_kind ?? {}).map(([e, t]) => /* @__PURE__ */ (0, $.jsx)(sn, {
						label: C[e] || e,
						value: on(t)
					}, e))]
				}), k.length ? /* @__PURE__ */ (0, $.jsxs)("div", {
					className: "mt-4 flex min-w-0 flex-col gap-0.5",
					children: [/* @__PURE__ */ (0, $.jsx)("span", {
						className: "text-caption-1-regular text-text-secondary",
						children: Y("cleanup:links.topSites")
					}), /* @__PURE__ */ (0, $.jsx)("div", {
						className: "flex min-w-0 flex-wrap gap-x-5 gap-y-2",
						children: k.map(([e, t]) => /* @__PURE__ */ (0, $.jsxs)("span", {
							"data-top-host": "",
							className: "inline-flex min-w-0 max-w-full items-center gap-1.5",
							children: [/* @__PURE__ */ (0, $.jsxs)("a", {
								href: `https://${e}`,
								target: "_blank",
								rel: "noopener noreferrer",
								className: "inline-flex min-w-0 items-center gap-1.5 text-body-2-medium text-text-primary",
								children: [
									/* @__PURE__ */ (0, $.jsx)(z, { linkId: D.top_host_link_ids?.[e] }),
									/* @__PURE__ */ (0, $.jsx)("span", {
										className: "min-w-0 wrap-anywhere",
										children: e
									}),
									/* @__PURE__ */ (0, $.jsx)(Ce, {
										"aria-hidden": !0,
										className: "size-(--icon-inline) shrink-0"
									})
								]
							}), /* @__PURE__ */ (0, $.jsx)(c, {
								variant: "caption",
								color: "neutral",
								children: /* @__PURE__ */ (0, $.jsx)("span", {
									className: "tabular-nums",
									children: on(t)
								})
							})]
						}, e))
					})]
				}) : null] }) : null,
				/* @__PURE__ */ (0, $.jsx)("div", {
					"aria-live": "polite",
					className: "mt-4 flex flex-col gap-3 empty:hidden",
					children: ie
				})
			]
		}), /* @__PURE__ */ (0, $.jsx)("div", {
			"aria-live": "polite",
			className: "empty:hidden",
			children: N
		})]
	});
}
// src/react/data-cleanup/organize-card.tsx
var un = (e, t) => t ? Y("cleanup:organize.applyBodyPath", {
	name: e,
	path: t
}) : Y("cleanup:organize.applyBodyAll", { name: e }), dn = Y("cleanup:organize.rollbackBody"), fn = 8;
function pn({ plan: e }) {
	return /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)("ol", {
		className: "mt-2 flex min-w-0 flex-col gap-1",
		children: e.rows.slice(0, fn).map((e) => /* @__PURE__ */ (0, $.jsxs)("li", {
			className: "flex min-w-0 items-center gap-2 text-caption-1-regular text-text-secondary",
			children: [
				/* @__PURE__ */ (0, $.jsx)("span", {
					"data-middle-truncate": !0,
					title: e.current_path,
					className: "min-w-0 truncate",
					children: je(e.current_path)
				}),
				/* @__PURE__ */ (0, $.jsx)("span", {
					"aria-hidden": !0,
					children: "→"
				}),
				/* @__PURE__ */ (0, $.jsx)("span", {
					"data-middle-truncate": !0,
					title: e.target_path,
					className: "min-w-0 truncate text-text-primary",
					children: je(e.target_path)
				})
			]
		}, e.current_path))
	}), e.truncated || e.rows.length > fn ? /* @__PURE__ */ (0, $.jsx)("p", {
		className: "text-caption-1-regular text-text-secondary",
		children: Y("cleanup:organize.planTruncated")
	}) : null] });
}
function mn({ toast: e, failure: t }) {
	let n = Z({
		queryKey: ne,
		queryFn: ({ signal: e }) => $e(e)
	}), i = n.data, a = i?.locations ?? [], [o, s] = (0, Q.useState)(""), c = a.some((e) => e.location === o) ? o : a[0]?.location ?? "", l = i?.templates?.[c], [d, f] = (0, Q.useState)(null), h = d?.location === c ? d : {
		location: c,
		file: l?.file ?? "",
		dir: l?.dir ?? ""
	}, _ = (e) => {
		f({
			...h,
			...e
		}), P.reset();
	}, [y, b] = (0, Q.useState)({
		location: "",
		path: ""
	}), x = y.location === c ? y.path : "", S = (0, Q.useRef)({
		location: c,
		path: x
	});
	S.current = {
		location: c,
		path: x
	};
	let [C, w] = (0, Q.useState)(null), E = (0, Q.useRef)(null), D = (0, Q.useRef)(null), O = (0, Q.useRef)(null), k = Z({
		queryKey: [
			"organize-example",
			h.file,
			h.dir
		],
		queryFn: ({ signal: e }) => et(h.file, h.dir, e),
		enabled: !!i
	}), [A, ee] = (0, Q.useState)("file"), N = (0, Q.useRef)(!1), ae = (0, Q.useRef)(null);
	(0, Q.useLayoutEffect)(() => {
		let e = ae.current;
		if (!e) return;
		ae.current = null;
		let t = (e.field === "file" ? E : D).current;
		t?.focus(), t?.setSelectionRange(e.caret, e.caret);
	});
	let oe = () => ({
		location: c,
		path: x.trim(),
		file_template: h.file.trim(),
		dir_template: h.dir.trim()
	}), P = Vt({
		mutationFn: yt,
		onError: (e) => {
			let t = /整理路径/.test(U(e)) ? "path" : u.test(U(e)) ? "dir" : "file";
			w(t), (t === "path" ? O : t === "dir" ? D : E).current?.focus();
		}
	}), F = Vt({
		mutationFn: ({ initial: e }) => _t(e),
		onSuccess: (e, t) => {
			e.path && t.location === S.current.location && t.path === S.current.path && (b({
				location: t.location,
				path: e.path
			}), w(null), P.reset(), O.current?.focus());
		}
	}), I = X({
		queryKey: ne,
		queryFn: ({ signal: e }) => $e(e),
		start: Ft,
		jobOf: (e) => e,
		withJob: Ut,
		onStarted: () => P.reset(),
		onFinish: (n) => {
			if (q.invalidateQueries({
				queryKey: ne,
				exact: !0
			}), n.status !== "complete") return;
			let { text: r, failed: i } = ht(n);
			i ? t(Y("cleanup:tools.organize"), Error(Y("cleanup:organize.rowsFailed", { count: i }))) : e(r.replace(/。$/, ""));
		}
	}), L = I.running || I.start.isPending, se = JSON.stringify(P.variables) === JSON.stringify(oe()), ce = se ? P.data : void 0, le = Number(ce?.counts?.change || 0), ue = T[c] || c, de = (e) => {
		_(e), w(null), P.reset();
	}, fe = (e) => {
		let t = (A === "file" ? E : D).current, n = h[A], r = N.current ? t?.selectionStart ?? n.length : n.length, i = N.current ? t?.selectionEnd ?? r : r, a = `{${e}}`;
		ae.current = {
			field: A,
			caret: r + a.length
		}, de({ [A]: n.slice(0, r) + a + n.slice(i) });
	}, pe = () => {
		P.isPending || L || !c || (I.dismiss(), I.start.reset(), w(null), P.mutate(oe()));
	}, me = () => {
		let e = P.variables;
		e && ce && le && Ie({
			title: Y("cleanup:tools.organize"),
			body: un(ue, e.path),
			confirmLabel: Y("cleanup:tools.organize"),
			onConfirm: async () => {
				await I.start.mutateAsync({
					kind: "apply",
					request: e
				}), wt({
					...i?.templates ?? {},
					[e.location]: {
						file: e.file_template,
						dir: e.dir_template
					}
				});
			}
		});
	}, he = () => void Ie({
		title: Y("cleanup:organize.rollbackTitle"),
		body: dn,
		confirmLabel: Y("cleanup:organize.rollbackConfirm"),
		onConfirm: () => I.start.mutateAsync({ kind: "rollback" })
	}), R = null, ge = !!le && !L && !I.outcome, z = I.job, ye = I.outcome;
	if (z?.status === "running") {
		let e = G(z) || Mt(z) || Y("cleanup:organize.running");
		R = /* @__PURE__ */ (0, $.jsx)(B, {
			embedded: !0,
			kind: V("organize", z.stage_code),
			label: e,
			value: Math.min(z.checked || 0, z.total || 0),
			total: z.total
		});
	} else if (ye?.status === "failed") R = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:organize.incomplete"),
		children: G(ye, "error") || Y("cleanup:shared.checkTaskLogFiles")
	});
	else if (ye) {
		let { text: e, failed: t } = ht(ye);
		R = /* @__PURE__ */ (0, $.jsx)(j, {
			tone: t ? "warning" : "success",
			title: Y(t ? "cleanup:shared.partiallyCompleted" : "cleanup:organize.result"),
			children: e
		});
	} else I.start.isError ? R = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:organize.failed"),
		children: U(I.start.error)
	}) : P.isPending ? R = /* @__PURE__ */ (0, $.jsx)(B, {
		embedded: !0,
		kind: V("organize", "organize.checkingPlan"),
		label: Y("cleanup:organize.checkingPlan")
	}) : P.isError && se ? R = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:organize.previewFailed"),
		children: U(P.error)
	}) : ce && (R = /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)(j, {
		tone: "neutral",
		title: Y("cleanup:organize.previewResult"),
		children: vt(ce)
	}), le ? /* @__PURE__ */ (0, $.jsx)(pn, { plan: ce }) : null] }));
	return /* @__PURE__ */ (0, $.jsxs)(p, {
		layout: "stack",
		id: "organize",
		labelledBy: "cleanup-organize-title",
		attributes: { "data-cleanup-organize": "" },
		footer: /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [
			i?.last_batch ? /* @__PURE__ */ (0, $.jsx)(r, {
				variant: "secondary",
				...H(L),
				onClick: he,
				children: Y("cleanup:organize.rollbackLastBatch")
			}) : null,
			/* @__PURE__ */ (0, $.jsx)(r, {
				variant: ge ? "secondary" : "primary",
				disabled: !a.length || L,
				...H(P.isPending),
				onClick: pe,
				children: Y("cleanup:organize.preview")
			}),
			ge ? /* @__PURE__ */ (0, $.jsx)(r, {
				variant: "primary",
				onClick: me,
				children: Y("cleanup:organize.apply")
			}) : null
		] }),
		children: [
			/* @__PURE__ */ (0, $.jsx)(m, {
				id: "cleanup-organize-title",
				gap: "medium",
				children: Y("cleanup:organize.title")
			}),
			/* @__PURE__ */ (0, $.jsx)("p", {
				className: "text-body-regular text-text-secondary",
				children: ie
			}),
			n.isError ? /* @__PURE__ */ (0, $.jsx)("div", {
				className: "mt-3",
				children: /* @__PURE__ */ (0, $.jsx)(j, {
					tone: "error",
					title: Y("cleanup:organize.settingsLoadFailed"),
					children: U(n.error)
				})
			}) : null,
			/* @__PURE__ */ (0, $.jsxs)("div", {
				className: "mt-3 flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, $.jsxs)("div", {
						"data-organize-scope": !0,
						className: "flex min-w-0 flex-wrap items-start gap-2",
						children: [a.length ? /* @__PURE__ */ (0, $.jsx)(_e, {
							"aria-label": Y("cleanup:organize.storageLabel"),
							prefix: Y("cleanup:organize.storagePrefix"),
							className: "w-fit min-w-25",
							selectedKey: c || null,
							onSelectionChange: (e) => {
								e !== null && (s(String(e)), b({
									location: String(e),
									path: ""
								}), w(null), P.reset(), F.reset(), N.current = !1);
							},
							children: a.map((e) => /* @__PURE__ */ (0, $.jsxs)(ve, {
								id: e.location,
								textValue: T[e.location] || e.location,
								children: [/* @__PURE__ */ (0, $.jsx)(be, { mark: te[e.location] || "database" }), T[e.location] || e.location]
							}, e.location))
						}) : null, /* @__PURE__ */ (0, $.jsxs)("div", {
							className: "flex min-w-0 basis-64 flex-1 items-start gap-2",
							children: [/* @__PURE__ */ (0, $.jsx)(v, {
								"aria-label": Y("cleanup:organize.pathLabel"),
								className: "min-w-0 flex-1",
								placeholder: Y("cleanup:organize.pathPlaceholder"),
								name: "organize-path",
								autoComplete: "off",
								spellCheck: "false",
								value: x,
								ref: O,
								isInvalid: C === "path",
								onChange: (e) => {
									b({
										location: c,
										path: e
									}), w(null), P.reset(), F.reset();
								}
							}), /* @__PURE__ */ (0, $.jsx)(g, {
								icon: Kt,
								"aria-label": Y("cleanup:organize.choosePath"),
								...H(F.isPending),
								onClick: () => F.mutate({
									initial: x || a.find((e) => e.location === c)?.roots[0] || "",
									location: c,
									path: x
								})
							})]
						})]
					}),
					/* @__PURE__ */ (0, $.jsx)("p", {
						className: "text-caption-1-regular text-text-secondary",
						children: re
					}),
					F.isError ? /* @__PURE__ */ (0, $.jsxs)(j, {
						tone: "error",
						title: Y("cleanup:organize.pickerFailed"),
						children: [U(F.error), Y("cleanup:organize.pickerFallback")]
					}) : null,
					/* @__PURE__ */ (0, $.jsx)(v, {
						label: Y("cleanup:organize.fileTemplate"),
						placeholder: "{code}[ {title}]",
						value: h.file,
						ref: E,
						spellCheck: "false",
						isInvalid: C === "file",
						onFocus: () => {
							ee("file"), N.current = !0;
						},
						onChange: (e) => de({ file: e })
					}),
					/* @__PURE__ */ (0, $.jsx)(v, {
						label: Y("cleanup:organize.dirTemplate"),
						placeholder: Y("cleanup:organize.dirTemplatePlaceholder"),
						value: h.dir,
						ref: D,
						spellCheck: "false",
						isInvalid: C === "dir",
						onFocus: () => {
							ee("dir"), N.current = !0;
						},
						onChange: (e) => de({ dir: e })
					}),
					i?.presets?.length ? /* @__PURE__ */ (0, $.jsxs)("div", {
						className: "flex flex-col gap-2",
						role: "group",
						"aria-label": Y("cleanup:organize.applyPreset"),
						children: [/* @__PURE__ */ (0, $.jsx)("p", {
							className: "text-caption-1-medium text-text-secondary",
							children: Y("cleanup:organize.applyPreset")
						}), /* @__PURE__ */ (0, $.jsx)("div", {
							className: "flex flex-wrap gap-2",
							children: i.presets.map((e) => {
								let t = Fe(e, "label");
								return /* @__PURE__ */ (0, $.jsx)(r, {
									variant: "secondary",
									size: "small",
									title: e.example || t,
									className: "max-w-full [&>span]:min-w-0 [&>span]:shrink",
									onClick: () => {
										de({
											file: e.file,
											dir: e.dir
										}), N.current = !1;
									},
									children: /* @__PURE__ */ (0, $.jsx)("span", {
										className: "truncate",
										children: t
									})
								}, e.id || e.label);
							})
						})]
					}) : null,
					/* @__PURE__ */ (0, $.jsxs)("p", {
						"aria-live": "polite",
						"aria-busy": k.isFetching,
						"data-organize-example": "",
						className: "text-caption-1-regular text-text-secondary",
						children: [Y("cleanup:organize.examplePath"), /* @__PURE__ */ (0, $.jsx)("code", {
							className: "wrap-anywhere",
							children: k.data?.example || k.data?.error || (k.isError ? U(k.error) : Y("cleanup:organize.previewLoading"))
						})]
					}),
					i?.placeholders?.length ? /* @__PURE__ */ (0, $.jsxs)("div", {
						className: "flex flex-col gap-2",
						role: "group",
						"aria-label": Y("cleanup:organize.insertParameter"),
						children: [/* @__PURE__ */ (0, $.jsxs)("p", {
							className: "text-caption-1-regular text-text-secondary",
							"aria-live": "polite",
							children: [/* @__PURE__ */ (0, $.jsx)("strong", {
								className: "text-caption-1-semibold text-text-primary",
								children: Y("cleanup:organize.insertParameter")
							}), Y("cleanup:organize.insertTarget", { target: Y(A === "file" ? "cleanup:organize.fileTemplate" : "cleanup:organize.dirTemplate") })]
						}), /* @__PURE__ */ (0, $.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: i.placeholders.map((e) => {
								let t = At(`labels.organizeTemplates.placeholder.${e.key}`, e.label);
								return /* @__PURE__ */ (0, $.jsx)(r, {
									variant: "ghost",
									size: "small",
									"aria-label": `${t} {${e.key}}`,
									onClick: () => fe(e.key),
									children: /* @__PURE__ */ (0, $.jsxs)("span", {
										className: "inline-flex flex-wrap items-center gap-x-1.5",
										children: [/* @__PURE__ */ (0, $.jsx)("code", { children: `{${e.key}}` }), /* @__PURE__ */ (0, $.jsx)("span", {
											className: "text-text-secondary",
											children: t
										})]
									})
								}, e.key);
							})
						})]
					}) : null,
					/* @__PURE__ */ (0, $.jsx)("p", {
						className: "text-caption-1-regular leading-4.5 text-text-secondary",
						children: M
					})
				]
			}),
			/* @__PURE__ */ (0, $.jsx)("div", {
				"aria-live": "polite",
				className: "mt-3 flex flex-col gap-2 empty:hidden",
				children: R
			})
		]
	});
}
// src/react/data-cleanup/orphan-records-card.tsx
var hn = J("play"), gn = Object.fromEntries([
	...se,
	["rating", Y("catalog:shared.rating")],
	["play_count", Y("catalog:catalogList.plays")],
	["last_played", Y("catalog:catalogList.lastWatched")],
	["o_count", Y("catalog:catalogList.climaxCount")]
]), _n = () => q.invalidateQueries({
	queryKey: N,
	exact: !0
});
function vn(e, t) {
	return Ie({
		title: Y("cleanup:orphans.deleteRecord"),
		holdToConfirm: !0,
		body: Ct(e.records) ? Y("cleanup:orphans.deleteBodyWithActivity", {
			name: e.name,
			records: Ct(e.records)
		}) : Y("cleanup:orphans.deleteBody", { name: e.name }),
		confirmLabel: Y("cleanup:orphans.deleteRecord"),
		danger: !0,
		onConfirm: t
	});
}
async function yn(e, t) {
	t((await St(e.id)).blocked.length ? Y("cleanup:orphans.fileRestored", { name: e.name }) : Y("cleanup:orphans.recordDeleted", { name: e.name })), _n();
}
function bn({ item: e, toast: t }) {
	let [n, i] = (0, Q.useState)(e.candidates[0]?.id ?? null), a = Vt({
		mutationFn: () => Ae(e.id, Number(n)),
		onSuccess: () => {
			let r = e.candidates.find((e) => e.id === n);
			t(Y("cleanup:orphans.attached", {
				name: e.name,
				target: r?.name ?? Y("cleanup:orphans.selectedFile")
			})), _n();
		},
		onError: (e) => t(U(e))
	}), o = Vt({ mutationFn: () => yn(e, t) }), s = () => {
		vn(e, () => o.mutateAsync());
	}, c = a.isPending || o.isPending;
	return /* @__PURE__ */ (0, $.jsxs)("span", {
		className: "flex min-w-0 flex-wrap items-center gap-2",
		children: [
			/* @__PURE__ */ (0, $.jsx)(r, {
				variant: "danger",
				size: "small",
				...H(c),
				onClick: s,
				children: Y("cleanup:orphans.deleteRecord")
			}),
			e.candidates.length ? /* @__PURE__ */ (0, $.jsx)(_e, {
				"data-orphan-target": "",
				"aria-label": Y("cleanup:orphans.targetLabel", { name: e.name }),
				prefix: Y("cleanup:orphans.targetPrefix"),
				className: "w-52",
				selectedKey: n,
				onSelectionChange: (e) => {
					e !== null && i(Number(e));
				},
				children: e.candidates.map((e) => /* @__PURE__ */ (0, $.jsx)(ve, {
					id: e.id,
					textValue: Me(e),
					children: Me(e)
				}, e.id))
			}) : null,
			e.candidates.length ? /* @__PURE__ */ (0, $.jsx)(r, {
				variant: "primary",
				size: "small",
				disabled: n === null,
				...H(c),
				onClick: () => a.mutate(),
				children: Y("cleanup:orphans.moveActivity")
			}) : null
		]
	});
}
function xn({ item: e }) {
	return /* @__PURE__ */ (0, $.jsxs)("span", {
		className: "flex min-w-0 items-center gap-3",
		children: [/* @__PURE__ */ (0, $.jsxs)("span", {
			className: "relative inline-grid aspect-16/10 w-24 flex-none place-items-center max-cleanup-tight:hidden overflow-hidden rounded-lg border border-separator-border bg-media-placeholder text-text-tertiary",
			children: [/* @__PURE__ */ (0, $.jsx)(hn, {
				"aria-hidden": !0,
				className: "size-5"
			}), e.has_thumb ? /* @__PURE__ */ (0, $.jsx)("img", {
				src: `/thumb?id=${e.id}&c=4`,
				alt: "",
				loading: "lazy",
				onError: (e) => e.currentTarget.remove(),
				className: "absolute inset-0 size-full object-contain"
			}) : null]
		}), /* @__PURE__ */ (0, $.jsxs)("span", {
			className: "flex min-w-0 flex-1 flex-col gap-0.5",
			children: [/* @__PURE__ */ (0, $.jsx)("span", {
				title: e.name,
				className: "truncate text-body-regular text-text-primary",
				children: e.name
			}), /* @__PURE__ */ (0, $.jsxs)("small", {
				className: "flex min-w-0 items-center gap-1.5 text-caption-1-regular text-text-secondary",
				children: [
					e.code ? /* @__PURE__ */ (0, $.jsx)("span", {
						className: "shrink-0",
						children: e.code
					}) : null,
					e.code && e.location ? /* @__PURE__ */ (0, $.jsx)("span", {
						"aria-hidden": "true",
						children: "·"
					}) : null,
					e.location ? /* @__PURE__ */ (0, $.jsx)(ye, {
						source: e.location,
						label: T[e.location] || e.location
					}) : null
				]
			})]
		})]
	});
}
function Sn({ toast: e }) {
	let [t, n] = (0, Q.useState)([]), r = Z({
		queryKey: N,
		queryFn: ({ signal: e }) => tt(e)
	}), i = r.data?.items ?? [], a = { receipt: e }, o = (t) => {
		let n = [{
			id: "delete",
			label: Y("cleanup:orphans.deleteRecord"),
			icon: O,
			danger: !0,
			run: () => {
				vn(t, () => yn(t, e));
			}
		}];
		return t.candidates.length && n.unshift({
			id: "target",
			label: Y("cleanup:orphans.targetLabel", { name: t.name }),
			icon: ft,
			run: (e) => {
				e.querySelector("[data-orphan-target] button")?.click();
			}
		}), n;
	}, s = (e) => {
		let t = null;
		return {
			key: "purge",
			label: Y("cleanup:orphans.deleteSelectedCount", { count: e }),
			reversal: "irreversible",
			danger: !0,
			holdToConfirm: !0,
			confirm: (e) => ({
				title: Y("cleanup:orphans.deleteSelectedTitle"),
				danger: !0,
				body: Y("cleanup:orphans.deleteSelectedBody", { count: e.length }),
				items: e.map((e) => e.name)
			}),
			run: async (e) => {
				t = await St(e.map((e) => e.id));
			},
			receipt: () => t ? Y("cleanup:orphans.purged", { count: t.purged }) + (t.blocked.length ? Y("cleanup:orphans.purgedBlocked", { count: t.blocked.length }) : "") : ""
		};
	}, c = [
		{
			id: "item",
			label: Y("cleanup:shared.video"),
			width: 480,
			min: 320,
			value: (e) => e.name,
			render: (e) => /* @__PURE__ */ (0, $.jsx)(xn, { item: e })
		},
		{
			id: "records",
			label: Y("cleanup:orphans.columnActivity"),
			width: 176,
			min: 144,
			value: (e) => Ct(e.records),
			filter: {
				values: (e) => Object.keys(e.records).filter((t) => e.records[t]),
				option: (e) => ({ label: gn[e] || e })
			},
			render: (e) => /* @__PURE__ */ (0, $.jsx)("span", {
				className: "block min-w-0 whitespace-normal wrap-anywhere",
				children: Ct(e.records) || Y("cleanup:shared.none")
			})
		},
		{
			id: "target",
			label: Y("cleanup:shared.actions"),
			width: i.some((e) => e.candidates.length) ? 360 : 128,
			min: 128,
			value: (e) => e.candidates.length,
			render: (t) => /* @__PURE__ */ (0, $.jsx)(bn, {
				item: t,
				toast: e
			})
		}
	];
	return /* @__PURE__ */ (0, $.jsx)("section", {
		id: "orphan-records",
		"aria-labelledby": "orphan-records-title",
		className: "flex scroll-mt-20 flex-col gap-4",
		children: r.isError ? /* @__PURE__ */ (0, $.jsxs)(p, {
			layout: "stack",
			labelledBy: "orphan-records-title",
			children: [/* @__PURE__ */ (0, $.jsx)(m, {
				id: "orphan-records-title",
				children: Y("cleanup:tools.orphanRecords")
			}), /* @__PURE__ */ (0, $.jsx)(j, {
				tone: "error",
				title: Y("cleanup:orphans.loadFailed"),
				children: U(r.error)
			})]
		}) : /* @__PURE__ */ (0, $.jsx)(f, {
			preferenceId: "orphan-records",
			label: Y("cleanup:orphans.tableLabel"),
			items: i,
			columns: c,
			contextOperations: o,
			title: Y("cleanup:tools.orphanRecords"),
			titleId: "orphan-records-title",
			unit: Y("cleanup:orphans.unit"),
			description: ae,
			rowId: (e) => String(e.id),
			rowLabel: (e) => e.name,
			selected: t,
			onSelected: n,
			actions: (e) => [{
				items: e,
				host: a,
				action: s(e.length),
				done: () => {
					n([]), _n();
				}
			}]
		})
	});
}
// src/react/data-cleanup/performer-delete-card.tsx
function Cn({ person: e }) {
	let t = Be("performer", e.k, e.entity_id);
	return /* @__PURE__ */ (0, $.jsxs)("a", {
		href: He("performer", e.k, e.entity_id),
		title: t,
		className: "flex min-w-0 items-center gap-3 text-text-primary",
		children: [/* @__PURE__ */ (0, $.jsx)("span", {
			"aria-hidden": !0,
			className: Le("relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-media-placeholder text-caption-1-medium", b),
			dangerouslySetInnerHTML: { __html: `<span>${Ue(ct(t))}</span>` + Ve({
				kind: "performer",
				id: e.entity_id,
				hasImage: e.has_image,
				version: e.image_version,
				focus: e.avatar_focus,
				thumb: !0
			}) }
		}), /* @__PURE__ */ (0, $.jsx)("span", {
			className: "min-w-0 wrap-anywhere",
			children: t
		})]
	});
}
function wn(e, t, n) {
	let r = (e) => e.slice(0, 5).join(Y("cleanup:shared.listSeparator")), i = e.length > 5 ? Y("cleanup:performerDelete.moreNames", {
		names: r(e),
		total: e.length
	}) : r(e), a = t.length > 5 ? Y("cleanup:performerDelete.moreExamples", {
		examples: r(t),
		total: t.length
	}) : r(t);
	return [
		Y("cleanup:performerDelete.bodyScope", {
			names: i,
			count: n.total,
			size: W(n.bytes)
		}),
		Y("cleanup:performerDelete.bodyWarning"),
		...n.shared ? [Y("cleanup:performerDelete.sharedFiles", { count: n.shared })] : [],
		Y("cleanup:performerDelete.bodyExamples", { examples: a })
	].join(Y("cleanup:shared.sentenceGap"));
}
function Tn({ toast: e }) {
	Bt();
	let n = Z({
		queryKey: oe,
		queryFn: ({ signal: e }) => We(e)
	}), [i, a] = (0, Q.useState)([]), [o, s] = (0, Q.useState)(""), [c, u] = (0, Q.useState)(null), [d, h] = (0, Q.useState)(""), g = {
		receipt: e,
		failure: (e) => h(U(e))
	}, v = (0, Q.useMemo)(() => [
		{
			id: "name",
			label: Y("cleanup:shared.actress"),
			width: 280,
			min: 160,
			value: (e) => e.k,
			filter: {
				values: (e) => e.k,
				option: (e, t) => ({
					label: Be("performer", e, t?.entity_id),
					searchTerms: t?.aliases,
					leading: t && /* @__PURE__ */ (0, $.jsx)(l, { person: {
						...t,
						id: t.entity_id,
						name: e
					} })
				})
			},
			render: (e) => /* @__PURE__ */ (0, $.jsx)(Cn, { person: e })
		},
		{
			id: "works",
			label: Y("cleanup:shared.videos"),
			width: 104,
			min: 80,
			value: (e) => e.n,
			filter: {
				range: "count",
				value: (e) => e.n
			},
			render: (e) => Y("cleanup:performerDelete.videoCount", { count: e.n })
		},
		{
			id: "files",
			label: Y("cleanup:shared.files"),
			width: 104,
			min: 80,
			value: (e) => e.file_count,
			filter: {
				range: "count",
				value: (e) => e.file_count
			},
			render: (e) => Y("cleanup:performerDelete.fileCount", { count: e.file_count })
		},
		{
			id: "bytes",
			label: Y("cleanup:performerDelete.columnSize"),
			width: 136,
			min: 104,
			value: (e) => e.bytes,
			filter: {
				range: "size",
				value: (e) => e.bytes
			},
			render: (e) => W(e.bytes)
		}
	], []), y = o.toLocaleLowerCase(), b = (n.data?.items || []).filter((e) => !y || [
		e.k,
		Be("performer", e.k, e.entity_id),
		...e.aliases
	].some((e) => e.toLocaleLowerCase().includes(y))), x = () => {
		let e = null, t = null;
		return {
			key: "performer-delete",
			label: Y("cleanup:performerDelete.deleteSelected"),
			reversal: "irreversible",
			danger: !0,
			holdToConfirm: !0,
			confirm: async (t) => {
				h("");
				let n = await Ge(t.map((e) => e.entity_id));
				if (!n.total) throw Error(Y("cleanup:performerDelete.nothingToDelete"));
				e = n;
				let r = n.performers.map((e) => Be("performer", e.name, e.id)), i = [...new Set(n.items.map((e) => e.code || e.name || `#${e.id}`))];
				return {
					title: Y("cleanup:performerDelete.confirmTitle"),
					confirmLabel: Y("cleanup:performerDelete.confirm"),
					danger: !0,
					body: wn(r, i, n)
				};
			},
			run: async () => {
				t = await ze(e), u(t), await Promise.all([q.invalidateQueries({
					queryKey: oe,
					exact: !0
				}), q.invalidateQueries({
					queryKey: Se,
					exact: !0
				})]);
			},
			receipt: () => t ? Y("cleanup:performerDelete.purged", { count: t.purged }) + (t.blocked.length ? Y("cleanup:performerDelete.doneBlocked", { count: t.blocked.length }) : "") : ""
		};
	}, S = c ? [
		...c.blocked.map((e) => ({
			path: e.path,
			reason: At(e.reason_code ?? "", e.reason, e.reason_params)
		})),
		...c.cleanup_pending,
		...c.cache_blocked.map((e) => ({
			path: e.name,
			reason: e.reason
		}))
	] : [];
	return /* @__PURE__ */ (0, $.jsxs)("section", {
		id: "batch-delete",
		className: "flex min-w-0 scroll-mt-20 flex-col gap-3",
		"aria-label": Y("cleanup:tools.bulkDelete"),
		children: [
			n.isPending ? /* @__PURE__ */ (0, $.jsx)("div", { dangerouslySetInnerHTML: { __html: Pe("batch-delete") } }) : n.isError ? /* @__PURE__ */ (0, $.jsxs)(p, {
				layout: "stack",
				labelledBy: "batch-delete-title",
				children: [/* @__PURE__ */ (0, $.jsx)(m, {
					id: "batch-delete-title",
					children: Y("cleanup:tools.bulkDelete")
				}), /* @__PURE__ */ (0, $.jsx)(j, {
					tone: "error",
					title: Y("cleanup:performerDelete.loadFailed"),
					action: /* @__PURE__ */ (0, $.jsx)(r, {
						variant: "secondary",
						size: "small",
						onClick: () => void n.refetch(),
						children: Y("cleanup:shared.retry")
					}),
					children: U(n.error)
				})]
			}) : /* @__PURE__ */ (0, $.jsx)(f, {
				preferenceId: "performer-delete",
				label: Y("cleanup:performerDelete.tableLabel"),
				title: Y("cleanup:tools.bulkDelete"),
				titleId: "batch-delete-title",
				unit: Y("cleanup:performerDelete.unit"),
				description: t,
				items: b,
				columns: v,
				rowId: (e) => String(e.entity_id),
				rowLabel: (e) => Be("performer", e.k, e.entity_id),
				selected: i,
				onSelected: a,
				toolbarActions: /* @__PURE__ */ (0, $.jsx)(_, {
					label: Y("cleanup:performerDelete.search"),
					value: o,
					onQuery: (e) => {
						s(e), a([]);
					}
				}),
				actions: (e, t) => [{
					action: x(),
					items: e,
					host: g,
					done: t,
					rowAction: {
						label: Y("cleanup:performerDelete.deleteVideosForRow"),
						icon: O
					}
				}]
			}),
			d ? /* @__PURE__ */ (0, $.jsx)(j, {
				tone: "error",
				title: Y("cleanup:performerDelete.planFailed"),
				children: d
			}) : null,
			c ? /* @__PURE__ */ (0, $.jsx)(j, {
				tone: S.length ? "warning" : "info",
				title: Y("cleanup:performerDelete.purged", { count: c.purged }),
				extra: S.length ? /* @__PURE__ */ (0, $.jsx)("div", {
					className: "flex flex-col gap-2 text-body-2-regular wrap-anywhere",
					children: S.slice(0, 5).map((e, t) => /* @__PURE__ */ (0, $.jsx)("p", { children: Y("shell:format.withNote", {
						text: e.path,
						note: e.reason
					}) }, t))
				}) : null,
				children: S.length ? Y("cleanup:performerDelete.partialFailure", {
					count: c.blocked.length,
					quarantined: c.cleanup_pending.length,
					cacheFiles: c.cache_blocked.length
				}) : Y("cleanup:performerDelete.done")
			}) : null
		]
	});
}
// src/react/data-cleanup/resource-sync-card.tsx
var En = J("git-compare"), Dn = J("rotate-cw"), On = Y("cleanup:shared.reconnecting"), kn = Y("cleanup:resourceSync.cleanUpDead"), An = "inline-grid w-full grid-flow-col auto-cols-fr gap-4 max-plain-stat-pair:grid-flow-row max-plain-stat-pair:grid-cols-2 max-plain-stat-single:grid-cols-1", jn = (e) => Number(e || 0).toLocaleString();
function Mn({ scan: e, partial: t = !1 }) {
	let n = e.cache ?? {
		files: 0,
		bytes: 0
	};
	return /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)("div", {
		className: An,
		children: (e.sources ?? []).map((e) => /* @__PURE__ */ (0, $.jsxs)("article", {
			className: K(),
			children: [/* @__PURE__ */ (0, $.jsx)(F, {
				label: R[e.location] || Y("cleanup:resourceSync.storageFallback"),
				mark: /* @__PURE__ */ (0, $.jsx)(be, { mark: te[e.location] ?? "database" }),
				aside: /* @__PURE__ */ (0, $.jsx)(qt, {
					online: e.online,
					children: e.online ? Y("cleanup:resourceSync.online") : Y("cleanup:resourceSync.offline")
				}),
				figure: e.online ? Y("cleanup:resourceSync.missingCount", { count: Number(e.missing || 0) }) : "—",
				meta: e.online ? jt(e) : Y("cleanup:resourceSync.skipped", { summary: jt(e) }),
				wrapMeta: !0
			}), e.online && e.unreadable > 0 ? /* @__PURE__ */ (0, $.jsx)("span", {
				className: "self-start",
				children: /* @__PURE__ */ (0, $.jsxs)(xe, {
					tone: "warning",
					children: [
						jn(e.unreadable),
						" ",
						Y("cleanup:resourceSync.unreadableDirs")
					]
				})
			}) : null]
		}, e.location))
	}), !t && /* @__PURE__ */ (0, $.jsxs)("div", {
		className: An,
		children: [
			/* @__PURE__ */ (0, $.jsx)("article", {
				className: K(),
				children: /* @__PURE__ */ (0, $.jsx)(F, {
					label: Y("cleanup:resourceSync.toPurge"),
					figure: Y("cleanup:resourceSync.purgeCount", { count: Number(xt(e) || 0) }),
					meta: Y("cleanup:resourceSync.purgeHint")
				})
			}),
			/* @__PURE__ */ (0, $.jsx)("article", {
				className: K(),
				children: /* @__PURE__ */ (0, $.jsx)(F, {
					label: Y("cleanup:resourceSync.toVanish"),
					figure: Y("cleanup:resourceSync.vanishCount", { count: Number(e.vanish || 0) }),
					meta: Y("cleanup:resourceSync.vanishHint")
				})
			}),
			/* @__PURE__ */ (0, $.jsx)("article", {
				className: K(),
				children: /* @__PURE__ */ (0, $.jsx)(F, {
					label: Y("cleanup:resourceSync.emptyDirs"),
					figure: Y("cleanup:resourceSync.emptyDirCount", { count: Number(e.empty || 0) }),
					meta: Y("cleanup:resourceSync.emptyDirsHint")
				})
			}),
			/* @__PURE__ */ (0, $.jsx)("article", {
				className: K(),
				children: /* @__PURE__ */ (0, $.jsx)(F, {
					label: Y("cleanup:resourceSync.cache"),
					figure: Y("cleanup:resourceSync.cacheCount", { count: Number(n.files || 0) }),
					meta: n.files ? W(n.bytes) : ""
				})
			})
		]
	})] });
}
function Nn({ toast: t }) {
	let n = X({
		queryKey: ue,
		queryFn: ({ signal: e }) => it(e),
		start: It,
		onFinish: (e) => {
			if (q.invalidateQueries({
				queryKey: Se,
				exact: !0
			}), q.invalidateQueries({
				queryKey: de,
				exact: !0
			}), e.status !== "complete") return;
			let { done: n, left: r } = De(e);
			r ? t(Y("cleanup:resourceSync.applyLeftovers", {
				done: jn(n),
				count: Number(r || 0)
			}), { warning: !0 }) : t(Y("cleanup:resourceSync.cleaned"));
		}
	}), i = X({
		queryKey: de,
		queryFn: ({ signal: e }) => at(e),
		start: Lt,
		onStarted: () => n.dismiss()
	}), a = i.start.isPending ? void 0 : i.job, o = i.running || i.start.isPending, s = n.running || n.start.isPending, c = !!i.job && !!n.job, l = a?.status === "complete" || a?.status === "failed", u = Y(o ? "cleanup:resourceSync.scanning" : l ? "cleanup:resourceSync.scanAgain" : "cleanup:resourceSync.checkFiles"), d = (e) => void Ie({
		holdToConfirm: !0,
		title: kn,
		body: Ee(e),
		confirmLabel: kn,
		danger: !0,
		onConfirm: () => n.start.mutateAsync(e.scan_id || "")
	}), f = i.start.isPending || i.start.isError ? null : n.outcome, h = (e) => {
		let t = De(e).left > 0;
		return /* @__PURE__ */ (0, $.jsx)(j, {
			tone: t ? "warning" : "success",
			title: Y(t ? "cleanup:shared.partiallyCompleted" : "cleanup:resourceSync.cleanupResult"),
			children: ke(e, W)
		});
	}, g = null, _ = null;
	if (f?.status === "failed") _ = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:resourceSync.cleanupIncomplete"),
		children: G(f, "error") || Y("cleanup:shared.checkTaskLogFiles")
	});
	else if (f) _ = h(f);
	else if (n.running) g = /* @__PURE__ */ (0, $.jsx)(B, {
		embedded: !0,
		kind: V("resource-apply"),
		label: G(n.job) || Y("cleanup:resourceSync.applying")
	});
	else if (i.start.isError) _ = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:resourceSync.scanFailed"),
		children: U(i.start.error)
	});
	else if (i.query.isError && a) _ = /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "neutral",
		title: Y("cleanup:shared.taskStatus"),
		children: On
	});
	else if (a?.status === "running") {
		let t = kt(a);
		g = /* @__PURE__ */ (0, $.jsx)(B, {
			embedded: !0,
			kind: V("resource-scan"),
			label: t,
			labelContent: a.total_sources ? /* @__PURE__ */ (0, $.jsx)(e, { value: t }) : t,
			value: a.completed_sources,
			total: a.total_sources
		}), a.sources?.length && (_ = /* @__PURE__ */ (0, $.jsx)(Mn, {
			scan: a,
			partial: !0
		}));
	} else if (a?.status === "failed") _ = /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [a.sources?.length ? /* @__PURE__ */ (0, $.jsx)(Mn, {
		scan: a,
		partial: !0
	}) : null, /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:resourceSync.scanFailed"),
		children: G(a, "error") || Y("cleanup:resourceSync.backgroundScanFailed")
	})] });
	else if (a?.status === "complete" && a.applied) _ = n.job?.status === "complete" ? h(n.job) : /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "neutral",
		title: Y("cleanup:resourceSync.cleanupResult"),
		children: Y("cleanup:resourceSync.alreadyCleaned")
	});
	else if (a?.status === "complete") {
		let e = lt(a);
		_ = /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)(Mn, { scan: a }), e ? /* @__PURE__ */ (0, $.jsx)(j, {
			tone: "neutral",
			title: Y("cleanup:resourceSync.toClean"),
			action: /* @__PURE__ */ (0, $.jsx)(r, {
				variant: "danger",
				disabled: !c,
				...H(s),
				onClick: () => {
					c && d(a);
				},
				children: s ? Y("cleanup:resourceSync.applyingButton") : kn
			}),
			children: Oe(a)
		}) : /* @__PURE__ */ (0, $.jsx)("p", {
			className: "mr-auto text-body-regular text-notification-success-foreground",
			children: Y("cleanup:resourceSync.nothingToClean")
		})] });
	}
	return n.start.isError && !f && (_ = /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [_, /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:resourceSync.cleanupFailed"),
		children: U(n.start.error)
	})] })), /* @__PURE__ */ (0, $.jsxs)("section", {
		id: "resource-sync",
		"aria-labelledby": "resource-sync-title",
		className: "flex scroll-mt-20 flex-col gap-4",
		children: [/* @__PURE__ */ (0, $.jsxs)(p, {
			layout: "split",
			labelledBy: "resource-sync-title",
			footer: /* @__PURE__ */ (0, $.jsx)(r, {
				"data-resource-scan": !0,
				leadingIcon: l && !o ? Dn : En,
				disabled: !c,
				...H(o),
				onClick: () => {
					c && !o && i.start.mutate();
				},
				children: u
			}),
			children: [
				/* @__PURE__ */ (0, $.jsx)(m, {
					id: "resource-sync-title",
					gap: "small",
					children: Y("cleanup:tools.resourceSync")
				}),
				i.query.isPending || n.query.isPending ? /* @__PURE__ */ (0, $.jsx)("div", {
					role: "status",
					"aria-label": Y("cleanup:resourceSync.statusLoading"),
					"data-skeleton": "",
					className: "skeleton-sheen h-6 rounded-md"
				}) : null,
				!i.job && i.query.isError ? /* @__PURE__ */ (0, $.jsx)(j, {
					tone: "error",
					children: Y("cleanup:resourceSync.scanStatusUnavailable")
				}) : null,
				!n.job && n.query.isError ? /* @__PURE__ */ (0, $.jsx)(j, {
					tone: "error",
					children: Y("cleanup:resourceSync.applyStatusUnavailable")
				}) : null,
				/* @__PURE__ */ (0, $.jsx)("p", {
					className: "max-w-190 text-body-2-regular leading-5 text-text-secondary",
					children: fe
				}),
				/* @__PURE__ */ (0, $.jsx)("div", {
					"aria-live": "polite",
					className: "mt-4 empty:hidden",
					children: g
				})
			]
		}), /* @__PURE__ */ (0, $.jsx)("div", {
			"aria-live": "polite",
			className: "flex flex-col gap-4 empty:hidden",
			children: _
		})]
	});
}
// src/react/data-cleanup/data-cleanup-tool-page.tsx
function Pn({ toast: e }) {
	let t = Z({
		queryKey: ee,
		queryFn: ({ signal: e }) => Qe(e)
	});
	return t.isError ? /* @__PURE__ */ (0, $.jsx)(j, {
		tone: "error",
		title: Y("cleanup:resourceSync.storageLoadFailed"),
		children: U(t.error)
	}) : t.isPending ? /* @__PURE__ */ (0, $.jsx)("p", {
		role: "status",
		children: Y("cleanup:resourceSync.storageLoading")
	}) : ut(t.data) ? /* @__PURE__ */ (0, $.jsx)(Nn, { toast: e }) : /* @__PURE__ */ (0, $.jsxs)(p, {
		layout: "stack",
		label: Y("cleanup:tools.resourceSync"),
		children: [
			/* @__PURE__ */ (0, $.jsx)(m, { children: Y("cleanup:tools.resourceSync") }),
			/* @__PURE__ */ (0, $.jsx)("p", {
				className: "text-body-regular text-text-secondary",
				children: Y("cleanup:resourceSync.noDirectories")
			}),
			/* @__PURE__ */ (0, $.jsx)("a", {
				href: "/settings/library",
				className: "text-body-medium text-accent-600 underline",
				children: Y("cleanup:resourceSync.setUpLibrary")
			})
		]
	});
}
function Fn({ tool: e, toast: t, failure: n }) {
	let r = (e) => t(e), i;
	switch (e) {
		case "organize":
			i = /* @__PURE__ */ (0, $.jsx)(mn, {
				toast: r,
				failure: n
			});
			break;
		case "resource-sync":
			i = /* @__PURE__ */ (0, $.jsx)(Pn, { toast: t });
			break;
		case "orphan-records":
			i = /* @__PURE__ */ (0, $.jsx)(Sn, { toast: r });
			break;
		case "media-repair":
			i = /* @__PURE__ */ (0, $.jsx)(Qt, { toast: r });
			break;
		case "links":
			i = /* @__PURE__ */ (0, $.jsx)(ln, {});
			break;
		case "batch-delete": i = /* @__PURE__ */ (0, $.jsx)(Tn, { toast: r });
	}
	return /* @__PURE__ */ (0, $.jsx)(Wt, { children: i });
}
// src/react/data-cleanup/data-cleanup-page.tsx
function In(e, t) {
	return e.data === void 0 ? e.isError ? {
		figure: Y("cleanup:overview.loadFailed"),
		state: "error"
	} : {
		figure: Y("cleanup:overview.loading"),
		state: "loading"
	} : t(e.data);
}
function Ln({ section: e, label: t, icon: n, value: r, open: i }) {
	return /* @__PURE__ */ (0, $.jsx)("button", {
		type: "button",
		className: K({ interactive: !0 }),
		"data-cleanup-go": e,
		"data-entry-state": r.state,
		"aria-busy": r.state === "loading" || void 0,
		onClick: () => i(e),
		children: /* @__PURE__ */ (0, $.jsx)(F, {
			label: t,
			icon: n,
			figure: r.figure,
			meta: r.meta
		})
	});
}
function Rn({ tool: e, navigate: t }) {
	let n = J(e.icon);
	return /* @__PURE__ */ (0, $.jsx)(Yt, {
		label: e.title,
		icon: n,
		summary: e.description,
		attributes: { "data-cleanup-tool": e.key },
		onOpen: () => t(e.path + location.search)
	});
}
var zn = J("square-check-big"), Bn = J("sparkles"), Vn = J("file-stack"), Hn = J("file-archive"), Un = J("trash"), Wn = () => {
	for (let e of [
		he,
		L,
		d,
		y
	]) q.invalidateQueries({
		queryKey: e,
		exact: !0
	});
};
function Gn({ toast: e, open: t, navigate: n }) {
	let r = Z({
		queryKey: he,
		queryFn: ({ signal: e }) => ot(e)
	}), i = Z({
		queryKey: L,
		queryFn: ({ signal: e }) => nt(e)
	}), c = Z({
		queryKey: d,
		queryFn: ({ signal: e }) => Ke(e)
	}), l = Z({
		queryKey: y,
		queryFn: ({ signal: e }) => qe(e)
	}), u = Z({
		queryKey: Se,
		queryFn: ({ signal: e }) => st(e)
	});
	return (0, Q.useEffect)(() => {
		let e = o[location.hash];
		e && gt.replace(e + location.search);
	}, []), /* @__PURE__ */ (0, $.jsxs)(Wt, { children: [
		/* @__PURE__ */ (0, $.jsxs)("section", {
			"aria-labelledby": "cleanup-pending",
			className: "flex flex-col gap-4",
			children: [/* @__PURE__ */ (0, $.jsx)(ge, {
				id: "cleanup-pending",
				children: Y("cleanup:overview.needsAttention")
			}), /* @__PURE__ */ (0, $.jsxs)("div", {
				className: P,
				children: [
					/* @__PURE__ */ (0, $.jsx)(Ln, {
						section: "review",
						label: Y("cleanup:overview.review"),
						icon: zn,
						open: t,
						value: In(r, Dt)
					}),
					/* @__PURE__ */ (0, $.jsx)(Ln, {
						section: "duplicates",
						label: Y("cleanup:overview.duplicates"),
						icon: Vn,
						open: t,
						value: In(c, (e) => Number(e.total || 0) ? {
							figure: Y("cleanup:overview.duplicateGroups", {
								count: Number(e.total),
								files: Number(e.files || 0).toLocaleString()
							}),
							meta: Y("cleanup:overview.reclaimable", { size: W(e.reclaimable || 0) })
						} : { figure: Y("cleanup:overview.noDuplicates") })
					}),
					/* @__PURE__ */ (0, $.jsx)(Ln, {
						section: "ads",
						label: Y("cleanup:overview.junkFiles"),
						icon: Hn,
						open: t,
						value: In(l, (e) => ({
							figure: Y("cleanup:overview.junkUndecided", { count: Number(e.pending_total || 0) }),
							meta: dt(e)
						}))
					}),
					/* @__PURE__ */ (0, $.jsx)(Ln, {
						section: "quality",
						label: Y("cleanup:overview.hdUpgrades"),
						icon: Bn,
						open: t,
						value: In(i, (e) => ({ figure: Y("cleanup:overview.upgradesPending", { count: Number(e.total || 0) }) }))
					}),
					/* @__PURE__ */ (0, $.jsx)(Ln, {
						section: "trash",
						label: Y("cleanup:overview.trash"),
						icon: Un,
						open: t,
						value: In(u, (e) => ({
							figure: Y("cleanup:overview.trashCount", { count: Number(e.total || 0) }),
							meta: e.total ? Y("cleanup:overview.trashSize", { size: W(e.bytes || 0) }) : Y("cleanup:overview.trashEmptyHint")
						}))
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, $.jsx)("div", {
			id: "libraryProcessing",
			className: "scroll-mt-20",
			children: /* @__PURE__ */ (0, $.jsx)(D, {
				toast: (t) => e(t),
				onComplete: Wn
			})
		}),
		/* @__PURE__ */ (0, $.jsxs)("section", {
			"aria-labelledby": "cleanup-maintenance",
			className: "flex flex-col gap-4",
			children: [/* @__PURE__ */ (0, $.jsx)(ge, {
				id: "cleanup-maintenance",
				children: Y("cleanup:overview.maintenanceSection")
			}), /* @__PURE__ */ (0, $.jsx)("div", {
				className: a,
				children: s.filter((e) => e.key !== "batch-delete").map((e) => /* @__PURE__ */ (0, $.jsx)(Rn, {
					tool: e,
					navigate: n
				}, e.key))
			})]
		}),
		/* @__PURE__ */ (0, $.jsxs)("section", {
			"aria-labelledby": "cleanup-deletion",
			className: "flex flex-col gap-4",
			children: [/* @__PURE__ */ (0, $.jsx)(ge, {
				id: "cleanup-deletion",
				children: Y("cleanup:overview.deletionSection")
			}), /* @__PURE__ */ (0, $.jsx)("div", {
				className: a,
				children: s.filter((e) => e.key === "batch-delete").map((e) => /* @__PURE__ */ (0, $.jsx)(Rn, {
					tool: e,
					navigate: n
				}, e.key))
			})]
		})
	] });
}
export { Gn as DataCleanupPage, Fn as DataCleanupToolPage };

//# debugId=07f10e6a-e089-4630-ad67-00bf5fdb9eac
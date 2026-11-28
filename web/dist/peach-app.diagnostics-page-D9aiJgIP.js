(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "b98f68cc-8a6d-4c40-8a2a-5251d9379625", e._sentryDebugIdIdentifier = "sentry-dbid-b98f68cc-8a6d-4c40-8a2a-5251d9379625");
	} catch {}
})();
import { ApiError as e, BC as t, Button as n, ButtonLink as r, Chip as i, DIAGNOSTICS_KEY as a, DataTable as o, Disclosure as s, EmptyState as c, Fact as l, FactList as u, Fieldset as d, FieldsetTitle as f, Gg as p, Input as m, ItemLibrary as h, LOC as g, LinkButton as _, Note as v, Section as y, SectionToc as b, SettingsCard as x, SiteMark as S, Stack as C, TaskProgress as w, Xt as ee, Yt as te, __toESM as T, activityKind as E, apiGet as D, apiSend as O, busyProps as k, checkText$1 as A, codedText as j, configurationSection as M, cx as N, diagnosticHeaders as P, diagnosticsSkeleton as F, errorMessage as I, fetchDiagnostics as L, fmtDur as ne, fmtSize as re, interfaceLanguage as R, queryClient as z, require_jsx_runtime as ie, require_react as ae, settingsPath as oe, stageText as B, t as V, tl as se, useAction as H, useLibraryFilterOptions as ce, useLibraryTints as le, useQuery as U, useQueryClient as ue, withBackoff as de } from "./peach-app.js";
import { ErrorExcerpt as fe } from "./peach-app.error-excerpt-Ugft6I5o.js";
import { ActionSpinner as W } from "./peach-app.action-spinner-DMcPV-3U.js";
import { useCheckReceipt as pe } from "./peach-app.use-check-receipt-CVw_ZYdx.js";
// src/react/diagnostics/health-list.tsx
var G = /* @__PURE__ */ T(ae(), 1), K = ie(), q = (e) => e.title || e.name || e.code || V("manage:healthList.videoFallback", { id: e.id }), me = (e, t) => [[
	V("manage:shared.video"),
	V("manage:shared.code"),
	V("manage:shared.fileName"),
	V("manage:shared.library"),
	V("manage:shared.path"),
	V("manage:healthList.durationSeconds"),
	V("manage:healthList.sizeBytes")
], ...e.map((e) => [
	q(e),
	e.code ?? "",
	e.name,
	t(e),
	e.path,
	e.duration ?? "",
	e.size ?? ""
])].map((e) => e.map((e) => String(e ?? "").replace(/[\t\r\n]+/g, " ")).join("	")).join("\n");
function he({ group: e, groupKey: r, openItem: i, receipt: l }) {
	let [u, d] = (0, G.useState)({}), [f, m] = (0, G.useState)(!1), y = ue(), b = JSON.stringify(u), x = U({
		queryKey: [
			"diagnostics-library",
			r,
			b,
			f
		],
		enabled: f || b !== "{}",
		queryFn: ({ signal: e }) => D(`/api/diagnostics/library?${new URLSearchParams({
			group: r,
			column_filters: b,
			view: f ? "ignored" : "active"
		})}`, e)
	}), S = x.data ?? (f ? {
		...e,
		items: [],
		count: e.ignored_count ?? 0
	} : e), w = ce(), T = H(), E = j(S, "label"), [A, M] = (0, G.useState)([]), N = le({ names: !0 }), P = (e) => N.get(e.library_id || "")?.name || g[e.location] || e.location, F = (e) => void T.run("copy", () => navigator.clipboard.writeText(me(e, P)), () => l(V("manage:healthList.copied"))), I = (e) => void T.run("ignore", async (t) => {
		await O("/api/diagnostics/library/ignored", {
			group: r,
			ids: e.map((e) => e.id),
			ignore: !f
		}, "POST", t), M([]), await Promise.all([y.invalidateQueries({ queryKey: a }), y.invalidateQueries({ queryKey: ["diagnostics-library", r] })]);
	}, () => l(V(f ? "manage:healthList.restored" : "manage:healthList.ignored"))), L = V(f ? "manage:healthList.restoreIssue" : "manage:healthList.ignoreIssue"), R = [
		{
			id: "title",
			label: V("manage:shared.video"),
			value: q,
			width: 172,
			min: 160,
			render: (e) => /* @__PURE__ */ (0, K.jsxs)("span", {
				className: "flex min-w-0 flex-col items-start gap-1",
				children: [/* @__PURE__ */ (0, K.jsx)(_, {
					variant: "primary",
					title: q(e),
					"data-health-title": "",
					className: "max-w-full justify-start whitespace-normal text-left",
					onClick: () => i(e.id),
					children: /* @__PURE__ */ (0, K.jsx)("span", {
						className: "line-clamp-2 wrap-anywhere",
						children: q(e)
					})
				}), e.name && e.name !== q(e) ? /* @__PURE__ */ (0, K.jsx)("span", {
					"data-middle-truncate": !0,
					title: e.name,
					className: "block min-w-0 max-w-full text-caption-1-regular text-text-secondary",
					children: e.name
				}) : null]
			})
		},
		{
			id: "actions",
			label: V("manage:healthList.actions"),
			width: 128,
			min: 128,
			required: !0,
			render: (e) => /* @__PURE__ */ (0, K.jsx)(n, {
				size: "small",
				variant: "secondary",
				"data-health-ignore": e.id,
				"aria-label": V(f ? "manage:healthList.restoreRow" : "manage:healthList.ignoreRow", { name: q(e) }),
				disabled: x.isFetching || !!T.busy,
				onClick: () => I([e]),
				children: L
			})
		},
		{
			id: "code",
			label: V("manage:shared.code"),
			width: 144,
			value: (e) => e.code || "",
			render: (e) => /* @__PURE__ */ (0, K.jsx)("span", {
				className: "whitespace-nowrap",
				children: e.code || V("manage:shared.unrecognized")
			})
		},
		{
			id: "location",
			label: V("manage:shared.library"),
			width: 160,
			value: P,
			filter: {
				values: (e) => e.library_id || "none",
				option: (e) => w.get(e) ?? { label: e === "none" ? V("cleanup:shared.none") : e }
			},
			render: (e) => /* @__PURE__ */ (0, K.jsx)(h, {
				libraryId: e.library_id,
				location: e.location,
				fallback: V("manage:shared.notFound")
			})
		},
		{
			id: "path",
			label: V("manage:healthList.filePath"),
			width: 320,
			min: 180,
			value: (e) => e.path,
			render: (e) => /* @__PURE__ */ (0, K.jsx)("span", {
				"data-middle-truncate": !0,
				title: e.path,
				className: "block min-w-0 w-full text-body-2-regular text-text-secondary",
				children: e.path || V("manage:shared.notFound")
			})
		},
		{
			id: "duration",
			label: V("manage:shared.duration"),
			width: 112,
			value: (e) => e.duration ?? 0,
			filter: {
				range: "duration",
				value: (e) => e.duration || null
			},
			render: (e) => e.duration && e.duration > 0 ? ne(e.duration) : V("manage:shared.notFound")
		},
		{
			id: "size",
			label: V("manage:shared.size"),
			width: 112,
			value: (e) => e.size ?? 0,
			filter: {
				range: "size",
				value: (e) => e.size
			},
			render: (e) => e.size === null ? V("manage:shared.notFound") : re(e.size)
		}
	], z = f ? e.count : S.count;
	return /* @__PURE__ */ (0, K.jsx)(s, {
		summary: z === null ? `${E} · ${V("manage:shared.notFound")}` : V("manage:healthList.groupSummary", {
			label: E,
			count: z
		}),
		children: S.count === null ? /* @__PURE__ */ (0, K.jsx)(v, {
			tone: "neutral",
			children: V("manage:healthList.listNotFound")
		}) : /* @__PURE__ */ (0, K.jsxs)(C, { children: [
			e.ignored_count || f ? /* @__PURE__ */ (0, K.jsx)(n, {
				size: "small",
				variant: "secondary",
				className: "self-start",
				disabled: T.busy === "ignore",
				onClick: () => {
					m(!f), M([]), d({});
				},
				children: f ? V("manage:healthList.showActive") : V("manage:healthList.showIgnored", { count: e.ignored_count })
			}) : null,
			T.error ? /* @__PURE__ */ (0, K.jsx)(v, {
				tone: "error",
				children: T.error
			}) : null,
			x.isError ? /* @__PURE__ */ (0, K.jsx)(v, {
				tone: "error",
				children: String(x.error)
			}) : null,
			!S.items.length && !x.isFetching && b === "{}" && !x.isError ? /* @__PURE__ */ (0, K.jsx)(c, {
				icon: se,
				title: V(f ? "manage:healthList.noIgnored" : "manage:healthList.emptyTitle"),
				size: "compact",
				children: f ? null : V("manage:healthList.emptyBody")
			}) : /* @__PURE__ */ (0, K.jsxs)(K.Fragment, { children: [
				/* @__PURE__ */ (0, K.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [S.truncated ? /* @__PURE__ */ (0, K.jsx)("span", {
						className: "text-body-2-regular text-text-secondary",
						children: V("manage:healthList.loadedCount", {
							loaded: S.items.length,
							count: S.count
						})
					}) : null, /* @__PURE__ */ (0, K.jsx)(n, {
						size: "small",
						variant: "secondary",
						...k(T.busy === "copy"),
						onClick: () => F(S.items),
						children: V("manage:healthList.copyList")
					})]
				}),
				T.error ? /* @__PURE__ */ (0, K.jsx)(v, {
					tone: "error",
					children: T.error
				}) : null,
				x.isError ? /* @__PURE__ */ (0, K.jsx)(v, {
					tone: "error",
					children: String(x.error)
				}) : null,
				/* @__PURE__ */ (0, K.jsx)(o, {
					preferenceId: `diagnostics-health-${r}`,
					label: E,
					title: V("manage:healthList.tableTitle"),
					unit: V("manage:healthList.tableUnit"),
					panel: !1,
					busy: x.isFetching,
					filters: {
						values: u,
						facets: S.column_facets ?? {},
						onChange: d
					},
					items: S.items,
					columns: R,
					rowId: (e) => String(e.id),
					rowLabel: q,
					selected: A,
					onSelected: M,
					contextOperations: (e) => [
						{
							id: "open",
							label: V("catalog:mediaActions.open"),
							icon: p,
							run: () => i(e.id)
						},
						{
							id: "copy",
							label: V("manage:healthList.copyRow"),
							icon: t,
							disabled: T.busy === "copy",
							run: () => F([e])
						},
						{
							id: "ignore",
							label: L,
							icon: f ? ee : te,
							disabled: T.busy === "ignore" || x.isFetching,
							run: () => I([e])
						}
					],
					actions: () => [],
					controls: (e) => /* @__PURE__ */ (0, K.jsxs)(K.Fragment, { children: [/* @__PURE__ */ (0, K.jsx)(n, {
						size: "small",
						variant: "secondary",
						...k(T.busy === "copy"),
						onClick: () => F(e),
						children: V("manage:healthList.copySelected")
					}), /* @__PURE__ */ (0, K.jsx)(n, {
						size: "small",
						variant: "secondary",
						disabled: x.isFetching,
						...k(T.busy === "ignore"),
						onClick: () => I(e),
						children: L
					})] })
				})
			] })
		] })
	});
}
// src/react/diagnostics/scraping-export.tsx
var J = "/api/diagnostics/exports", Y = ["diagnostic-export"], ge = de((e) => ["running", "cancelling"].includes(e?.status || "") ? 1e3 : !1);
function X({ kind: t, codes: i = "", children: a }) {
	let o = H(), s = U({
		queryKey: Y,
		queryFn: ({ signal: e }) => D(J, e),
		refetchInterval: ge
	}), c = s.data, l = o.busy === "start", u = o.busy === "cancel", d = !l && c?.kind === t ? c : void 0, f = c?.status === "running" || c?.status === "cancelling", p = d?.status === "cancelling", m = p ? 0 : d?.total, h = V(t === "support" ? "manage:diagnosticsExport.downloadReport" : "manage:diagnosticsExport.exportFetchLog"), g = (e) => {
		z.setQueryData(Y, e);
	}, _ = () => void o.run("start", async (n) => {
		let r = await fetch(J, {
			method: "POST",
			signal: n,
			credentials: "same-origin",
			headers: {
				...await P(),
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				kind: t,
				codes: i
			})
		}), a = await r.json().catch(() => null);
		if (!r.ok) throw new e(a?.detail || a?.error || V("manage:diagnosticsExport.startFailed"), r.status, a);
		if (!a || !a.job_id) throw Error(V("manage:diagnosticsExport.statusNotFound"));
		return a;
	}, g), y = /* @__PURE__ */ (0, K.jsx)(n, {
		type: "button",
		variant: "secondary",
		disabled: !c || f,
		leadingIcon: l ? W : void 0,
		...k(l),
		onClick: _,
		children: h
	});
	return /* @__PURE__ */ (0, K.jsxs)("div", {
		className: "flex w-full min-w-0 flex-col gap-3",
		children: [
			/* @__PURE__ */ (0, K.jsxs)("div", {
				className: "flex flex-wrap justify-end gap-2",
				children: [
					t === "support" ? y : null,
					d && f ? /* @__PURE__ */ (0, K.jsx)(n, {
						type: "button",
						variant: "secondary",
						disabled: p,
						leadingIcon: u ? W : void 0,
						...k(u),
						onClick: () => void o.run("cancel", (e) => O(`${J}/${d.job_id}/cancel`, {}, "POST", e), g),
						children: V("manage:diagnosticsExport.cancelExport")
					}) : null,
					d?.status === "complete" && d.download_url ? /* @__PURE__ */ (0, K.jsx)(r, {
						variant: "secondary",
						href: d.download_url,
						children: V("manage:diagnosticsExport.downloadFile")
					}) : null,
					t === "scraping" ? y : null,
					a
				]
			}),
			d && f ? /* @__PURE__ */ (0, K.jsx)(w, {
				embedded: t === "scraping",
				kind: E("diagnostic-export", d.stage_code),
				value: d.done || 0,
				total: m,
				label: m ? V("manage:diagnosticsExport.progress", {
					stage: B(d),
					done: d.done || 0,
					count: m
				}) : [
					B(d) || V("manage:diagnosticsExport.preparing"),
					!p && d.rows ? V("manage:diagnosticsExport.candidateCount", { count: d.rows }) : "",
					!p && d.files ? V("manage:diagnosticsExport.fileCount", { count: d.files }) : ""
				].filter(Boolean).join(" · ")
			}) : null,
			d?.status === "complete" ? /* @__PURE__ */ (0, K.jsx)("p", {
				role: "status",
				className: "text-right text-body-2-regular text-text-secondary",
				children: V("manage:diagnosticsExport.completedSize", { size: ((d.bytes || 0) / 1024 / 1024).toFixed(2) })
			}) : null,
			d?.status === "cancelled" ? /* @__PURE__ */ (0, K.jsx)(v, {
				tone: "neutral",
				children: V("manage:diagnosticsExport.canceled")
			}) : null,
			s.isError ? /* @__PURE__ */ (0, K.jsx)(v, {
				tone: "error",
				title: V("manage:diagnosticsExport.progressNotFound"),
				action: /* @__PURE__ */ (0, K.jsx)(n, {
					type: "button",
					variant: "secondary",
					...k(s.isFetching),
					onClick: () => {
						s.refetch();
					},
					children: V("manage:diagnosticsExport.reload")
				}),
				children: I(s.error)
			}) : null,
			o.error || d?.status === "failed" ? /* @__PURE__ */ (0, K.jsx)(v, {
				tone: "error",
				children: o.error || d?.error
			}) : null
		]
	});
}
function _e() {
	let [e, t] = (0, G.useState)("");
	return /* @__PURE__ */ (0, K.jsx)(d, {
		layout: "stack",
		labelledBy: "scraping-export-title",
		footer: /* @__PURE__ */ (0, K.jsx)(X, {
			kind: "scraping",
			codes: e
		}),
		children: /* @__PURE__ */ (0, K.jsxs)("div", {
			className: "flex min-w-0 flex-col gap-4",
			"aria-label": V("manage:diagnosticsExport.exportFetchLog"),
			children: [
				/* @__PURE__ */ (0, K.jsx)(f, {
					id: "scraping-export-title",
					children: V("manage:diagnosticsExport.fetchLogTitle")
				}),
				/* @__PURE__ */ (0, K.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: V("manage:diagnosticsExport.fetchLogHint")
				}),
				/* @__PURE__ */ (0, K.jsx)(m, {
					label: V("manage:diagnosticsExport.codesLabel"),
					name: "scraping-codes",
					value: e,
					onChange: t,
					autoComplete: "off",
					spellCheck: "false",
					maxLength: 1300,
					placeholder: V("manage:diagnosticsExport.codesPlaceholder"),
					hint: V("manage:diagnosticsExport.codesHint")
				})
			]
		})
	});
}
// src/react/diagnostics/diagnostics-page.tsx
var ve = {
	ok: V("manage:diagnostics.statusOk"),
	warning: V("manage:diagnostics.statusWarning"),
	failed: V("manage:diagnostics.statusFailed"),
	unknown: V("manage:shared.notFound"),
	disabled: V("manage:diagnostics.statusDisabled"),
	stale: V("manage:diagnostics.statusStale"),
	unchecked: V("manage:diagnostics.statusUnchecked")
}, ye = { "/tasks": V("manage:diagnostics.viewTasks") }, be = [
	[V("manage:diagnostics.groupLibraries"), ["media_mounts", "data_root"]],
	[V("manage:diagnostics.groupDatabase"), ["database", "schema"]],
	[V("manage:diagnostics.groupTools"), ["ffmpeg"]],
	[V("manage:diagnostics.groupConfig"), [
		"configured",
		"security",
		"port",
		"version"
	]],
	[V("manage:diagnostics.groupTasks"), ["tasks"]]
], Z = (e) => new Date(e).toLocaleString(R), Q = /* @__PURE__ */ new Set([
	"warning",
	"failed",
	"unknown"
]);
function xe({ status: e }) {
	return /* @__PURE__ */ (0, K.jsx)(i, {
		variant: "caption",
		"data-diagnostic-status": e,
		color: e === "failed" ? "rose" : e === "ok" ? "lime" : e === "warning" || e === "stale" ? "yellow" : "neutral",
		children: ve[e] ?? V("manage:shared.notFound")
	});
}
function Se({ name: e, check: t, compact: n = !1 }) {
	let i = t.target === "/settings/library" && (e === "security" || e === "port") ? oe("network") : t.target, a = n ? "h4" : "h3", o = A(t);
	return /* @__PURE__ */ (0, K.jsxs)("div", {
		"data-diagnostic-check": e,
		className: N("flex flex-col gap-4 border-b border-separator-border pr-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between", n ? "py-3" : "py-5"),
		children: [/* @__PURE__ */ (0, K.jsxs)("div", {
			className: N("flex min-w-0 flex-1 flex-col", n ? "gap-1" : "gap-2"),
			children: [
				/* @__PURE__ */ (0, K.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3",
					children: [/* @__PURE__ */ (0, K.jsx)(a, {
						className: N("text-text-primary", n ? "text-body-2-medium" : "text-body-medium"),
						children: o.label
					}), /* @__PURE__ */ (0, K.jsx)(xe, { status: t.status })]
				}),
				/* @__PURE__ */ (0, K.jsx)("p", {
					"data-check-reason": !0,
					className: N("text-body-2-regular break-words", n ? "text-text-secondary" : "text-text-primary"),
					children: o.reason
				}),
				o.action ? /* @__PURE__ */ (0, K.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: V("manage:diagnostics.suggestedFixText", { action: o.action })
				}) : null
			]
		}), i ? /* @__PURE__ */ (0, K.jsx)("div", {
			className: "shrink-0 self-end sm:self-auto",
			children: /* @__PURE__ */ (0, K.jsx)(r, {
				size: "small",
				variant: "secondary",
				href: i,
				children: i.startsWith("/settings/") ? V("manage:diagnostics.openSection", { section: M(i) }) : ye[i] ?? V("manage:diagnostics.openRelated")
			})
		}) : null]
	});
}
function $({ source: e }) {
	return /* @__PURE__ */ (0, K.jsx)("article", {
		"data-diagnostic-source": e.source,
		children: /* @__PURE__ */ (0, K.jsx)(x, { children: /* @__PURE__ */ (0, K.jsxs)(C, { children: [
			/* @__PURE__ */ (0, K.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, K.jsxs)("h3", {
					className: "flex min-w-0 items-center gap-2 text-body-medium text-text-primary",
					children: [/* @__PURE__ */ (0, K.jsx)(S, { source: e.source }), e.label]
				}), /* @__PURE__ */ (0, K.jsx)(xe, { status: e.status })]
			}),
			/* @__PURE__ */ (0, K.jsx)(fe, {
				text: j(e, "reason"),
				className: "text-body-regular text-text-primary"
			}),
			/* @__PURE__ */ (0, K.jsx)(s, {
				summary: V("manage:diagnostics.sessionDetails"),
				children: /* @__PURE__ */ (0, K.jsxs)(u, { children: [
					/* @__PURE__ */ (0, K.jsx)(l, {
						term: V("manage:diagnostics.lastSuccess"),
						children: e.last_success_at ? Z(e.last_success_at) : V("manage:diagnostics.noSuccessYet")
					}),
					e.last_check_at ? /* @__PURE__ */ (0, K.jsxs)(l, {
						term: V("manage:diagnostics.lastChecked"),
						children: [Z(e.last_check_at), e.elapsed_s !== void 0 && e.elapsed_s !== null ? V("manage:diagnostics.checkDuration", { seconds: e.elapsed_s.toFixed(2) }) : ""]
					}) : null,
					/* @__PURE__ */ (0, K.jsx)(l, {
						term: V("manage:diagnostics.pausedUntil"),
						children: e.cooldown_until ? Z(e.cooldown_until) : V("manage:diagnostics.notPaused")
					})
				] })
			})
		] }) })
	});
}
function Ce({ sources: e }) {
	let t = e.filter((e) => e.status === "ok" || e.status === "unchecked" || e.status === "disabled"), n = e.filter((e) => !t.includes(e));
	return /* @__PURE__ */ (0, K.jsxs)("section", {
		id: "diagnostics-sessions",
		"data-guide-target": "sessions",
		"aria-label": V("manage:diagnostics.sourceSessions"),
		className: "flex min-w-0 flex-col gap-3",
		children: [
			/* @__PURE__ */ (0, K.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, K.jsx)("h2", {
					className: "px-3 text-title-3-medium text-text-primary",
					children: V("manage:diagnostics.sourceSessions")
				}), /* @__PURE__ */ (0, K.jsx)(r, {
					size: "small",
					variant: "secondary",
					href: "/sources",
					children: V("manage:diagnostics.openSources")
				})]
			}),
			n.map((e) => /* @__PURE__ */ (0, K.jsx)($, { source: e }, e.source)),
			t.length ? /* @__PURE__ */ (0, K.jsx)(s, {
				findable: !0,
				summary: V("manage:diagnostics.otherSources", { count: t.length }),
				contentClassName: "gap-3",
				children: t.map((e) => /* @__PURE__ */ (0, K.jsx)($, { source: e }, e.source))
			}) : null
		]
	});
}
function we(e) {
	let t = U({
		queryKey: a,
		queryFn: ({ signal: e }) => L(e),
		staleTime: 1e4
	}), r = H(), { checked: i, checkFailed: o } = pe(), [c, l] = (0, G.useState)(""), u = () => void r.run("refresh", async () => {
		let e = await t.refetch();
		if (e.error) throw e.error;
	}, () => {
		l(""), i(V("manage:diagnostics.reportRefreshed"));
	}, (e) => {
		let t = I(e);
		l(t), o(V("manage:diagnostics.checkAgain"), t);
	}), d = r.busy === "refresh", f = /* @__PURE__ */ (0, K.jsx)("div", {
		id: "diagnostics-report",
		"data-guide-target": "report",
		children: /* @__PURE__ */ (0, K.jsx)(X, {
			kind: "support",
			children: /* @__PURE__ */ (0, K.jsx)(n, {
				variant: "secondary",
				leadingIcon: d ? W : void 0,
				onClick: u,
				...k(d),
				children: V("manage:diagnostics.checkAgain")
			})
		})
	}), p = {
		id: "diagnostics-report",
		label: V("manage:diagnosticsExport.reportTitle")
	}, m = {
		id: "diagnostics-scraping",
		label: V("manage:diagnosticsExport.fetchLogTitle")
	}, h = /* @__PURE__ */ (0, K.jsx)("div", {
		id: m.id,
		children: /* @__PURE__ */ (0, K.jsx)(_e, {})
	}), g = t.data;
	if (!g && t.isPending) return /* @__PURE__ */ (0, K.jsx)("div", {
		role: "status",
		"aria-label": V("manage:diagnostics.loading"),
		dangerouslySetInnerHTML: { __html: F() }
	});
	if (!g) return /* @__PURE__ */ (0, K.jsxs)(b, {
		inline: !0,
		label: V("settings:configurationPage.contents"),
		entries: [p, m],
		children: [
			f,
			/* @__PURE__ */ (0, K.jsx)(v, {
				tone: "error",
				title: V("manage:diagnostics.loadFailed"),
				children: c || (t.error ? I(t.error) : V("manage:diagnostics.reportNotFound"))
			}),
			h
		]
	});
	let _ = Object.entries(g.checks).filter(([, e]) => Q.has(e.status)), S = Object.entries(g.checks).filter(([, e]) => !Q.has(e.status)), w = [
		p,
		..._.length ? [{
			id: "diagnostics-attention",
			label: V("manage:diagnostics.attention")
		}] : [],
		{
			id: "diagnostics-health",
			label: V("manage:diagnostics.collectionHealth")
		},
		...S.length ? [{
			id: "diagnostics-checks",
			label: V("manage:diagnostics.systemChecks")
		}] : [],
		m,
		{
			id: "diagnostics-sessions",
			label: V("manage:diagnostics.sourceSessions")
		}
	];
	return /* @__PURE__ */ (0, K.jsxs)(b, {
		inline: !0,
		label: V("settings:configurationPage.contents"),
		entries: w,
		children: [
			f,
			c ? /* @__PURE__ */ (0, K.jsx)(v, {
				tone: "error",
				children: c
			}) : null,
			_.length ? /* @__PURE__ */ (0, K.jsx)(y, {
				id: "diagnostics-attention",
				guide: "attention",
				title: V("manage:diagnostics.attentionTitle", { count: _.length }),
				children: _.map(([e, t]) => /* @__PURE__ */ (0, K.jsx)(Se, {
					name: e,
					check: t
				}, e))
			}) : null,
			/* @__PURE__ */ (0, K.jsx)(y, {
				id: "diagnostics-health",
				guide: "health",
				title: V("manage:diagnostics.collectionHealth"),
				children: /* @__PURE__ */ (0, K.jsxs)(C, { children: [g.library.issue_at ? /* @__PURE__ */ (0, K.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: V("manage:diagnostics.healthRecordedAtTime", { time: Z(g.library.issue_at) })
				}) : null, Object.entries(g.library.groups).map(([t, n]) => /* @__PURE__ */ (0, K.jsx)(he, {
					groupKey: t,
					group: n,
					...e
				}, t))] })
			}),
			S.length ? /* @__PURE__ */ (0, K.jsx)("section", {
				id: "diagnostics-checks",
				"aria-label": V("manage:diagnostics.systemChecks"),
				children: /* @__PURE__ */ (0, K.jsx)(s, {
					findable: !0,
					summary: V("manage:diagnostics.otherChecks", { count: S.length }),
					contentClassName: "gap-5",
					children: be.map(([e, t]) => {
						let n = S.filter(([e]) => t.some((t) => t === e));
						return n.length ? /* @__PURE__ */ (0, K.jsxs)("section", {
							"aria-label": e,
							"data-diagnostic-group": "",
							className: "flex min-w-0 flex-col gap-2",
							children: [/* @__PURE__ */ (0, K.jsxs)("h3", {
								className: "flex items-center gap-2 px-3 text-body-medium text-text-primary",
								children: [e, /* @__PURE__ */ (0, K.jsx)("span", {
									className: "text-caption-1-regular text-text-secondary",
									children: V("manage:diagnostics.groupCount", { count: n.length })
								})]
							}), /* @__PURE__ */ (0, K.jsx)(x, { children: n.map(([e, t]) => /* @__PURE__ */ (0, K.jsx)(Se, {
								name: e,
								check: t,
								compact: !0
							}, e)) })]
						}, e) : null;
					})
				})
			}) : null,
			h,
			/* @__PURE__ */ (0, K.jsx)(Ce, { sources: g.sources })
		]
	});
}
export { we as DiagnosticsPage };

//# debugId=b98f68cc-8a6d-4c40-8a2a-5251d9379625
(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "828d7783-2016-4d0a-a42d-63c8a1ce6ef2", e._sentryDebugIdIdentifier = "sentry-dbid-828d7783-2016-4d0a-a42d-63c8a1ce6ef2");
	} catch {}
})();
import { ApiError as e, BC as t, Button as n, ButtonLink as r, Chip as i, DIAGNOSTICS_KEY as a, Disclosure as o, EmptyState as s, Fact as c, FactList as l, Fieldset as u, FieldsetTitle as d, Gg as f, Input as p, ItemLibrary as m, LOC as ee, LinkButton as h, Note as g, Section as _, SettingsCard as v, SettingsSectionLabel as y, SiteMark as b, Stack as x, TaskProgress as S, __toESM as C, activityKind as w, apiGet as T, apiSend as E, busyProps as D, checkText$1 as O, codedText as k, configurationSection as te, cx as A, diagnosticHeaders as j, diagnosticsSkeleton as M, errorMessage as N, fetchDiagnostics as ne, fmtDur as re, fmtSize as ie, interfaceLanguage as ae, queryClient as oe, require_jsx_runtime as se, require_react as ce, settingsPath as le, stageText as P, t as F, tl as ue, useAction as I, useLibraryFilterOptions as de, useLibraryTints as L, useQuery as R, withBackoff as z } from "./peach-app.js";
import { ErrorExcerpt as B } from "./peach-app.error-excerpt-Ugft6I5o.js";
import { SectionToc as V } from "./peach-app.section-toc-DMaTjdd5.js";
import { DataTable as fe } from "./peach-app.data-table-CYTfz3fV.js";
// src/react/diagnostics/health-list.tsx
var H = /* @__PURE__ */ C(ce(), 1), U = se(), W = (e) => e.title || e.name || e.code || F("manage:healthList.videoFallback", { id: e.id }), pe = (e, t) => [[
	F("manage:shared.video"),
	F("manage:shared.code"),
	F("manage:shared.fileName"),
	F("manage:shared.library"),
	F("manage:shared.path"),
	F("manage:healthList.durationSeconds"),
	F("manage:healthList.sizeBytes")
], ...e.map((e) => [
	W(e),
	e.code ?? "",
	e.name,
	t(e),
	e.path,
	e.duration ?? "",
	e.size ?? ""
])].map((e) => e.map((e) => String(e ?? "").replace(/[\t\r\n]+/g, " ")).join("	")).join("\n");
function me({ group: e, groupKey: r, openItem: i, receipt: a }) {
	let [c, l] = (0, H.useState)({}), u = JSON.stringify(c), d = R({
		queryKey: [
			"diagnostics-library",
			r,
			u,
			e
		],
		enabled: u !== "{}",
		queryFn: ({ signal: e }) => T(`/api/diagnostics/library?${new URLSearchParams({
			group: r,
			column_filters: u
		})}`, e),
		placeholderData: (e) => e
	}), p = u === "{}" ? e : d.data ?? e, _ = de(), v = I(), y = k(p, "label"), [b, S] = (0, H.useState)([]), C = L({ names: !0 }), w = (e) => C.get(e.library_id || "")?.name || ee[e.location] || e.location, E = (e) => void v.run("copy", () => navigator.clipboard.writeText(pe(e, w)), () => a(F("manage:healthList.copied"))), O = [
		{
			id: "title",
			label: F("manage:shared.video"),
			value: W,
			render: (e) => /* @__PURE__ */ (0, U.jsxs)("span", {
				className: "flex min-w-0 flex-col gap-1",
				children: [/* @__PURE__ */ (0, U.jsx)(h, {
					variant: "primary",
					title: W(e),
					"data-health-title": "",
					className: "max-w-full justify-start whitespace-normal text-left",
					onClick: () => i(e.id),
					children: /* @__PURE__ */ (0, U.jsx)("span", {
						className: "line-clamp-2 wrap-anywhere",
						children: W(e)
					})
				}), e.name && e.name !== W(e) ? /* @__PURE__ */ (0, U.jsx)("span", {
					"data-middle-truncate": !0,
					title: e.name,
					className: "block min-w-0 text-caption-1-regular text-text-secondary",
					children: e.name
				}) : null]
			})
		},
		{
			id: "code",
			label: F("manage:shared.code"),
			width: 144,
			value: (e) => e.code || "",
			render: (e) => /* @__PURE__ */ (0, U.jsx)("span", {
				className: "whitespace-nowrap",
				children: e.code || F("manage:shared.unrecognized")
			})
		},
		{
			id: "location",
			label: F("manage:shared.library"),
			width: 160,
			value: w,
			filter: {
				values: (e) => e.library_id || "none",
				option: (e) => _.get(e) ?? { label: e === "none" ? F("cleanup:shared.none") : e }
			},
			render: (e) => /* @__PURE__ */ (0, U.jsx)(m, {
				libraryId: e.library_id,
				location: e.location,
				fallback: F("manage:shared.notFound")
			})
		},
		{
			id: "path",
			label: F("manage:healthList.filePath"),
			width: 320,
			min: 180,
			value: (e) => e.path,
			render: (e) => /* @__PURE__ */ (0, U.jsx)("span", {
				"data-middle-truncate": !0,
				title: e.path,
				className: "block min-w-0 w-full text-body-2-regular text-text-secondary",
				children: e.path || F("manage:shared.notFound")
			})
		},
		{
			id: "duration",
			label: F("manage:shared.duration"),
			width: 112,
			value: (e) => e.duration ?? 0,
			filter: {
				range: "duration",
				value: (e) => e.duration || null
			},
			render: (e) => e.duration && e.duration > 0 ? re(e.duration) : F("manage:shared.notFound")
		},
		{
			id: "size",
			label: F("manage:shared.size"),
			width: 112,
			value: (e) => e.size ?? 0,
			filter: {
				range: "size",
				value: (e) => e.size
			},
			render: (e) => e.size === null ? F("manage:shared.notFound") : ie(e.size)
		}
	];
	return /* @__PURE__ */ (0, U.jsx)(o, {
		summary: p.count === null ? `${y} · ${F("manage:shared.notFound")}` : F("manage:healthList.groupSummary", {
			label: y,
			count: p.count
		}),
		children: p.count === null ? /* @__PURE__ */ (0, U.jsx)(g, {
			tone: "neutral",
			children: F("manage:healthList.listNotFound")
		}) : e.items.length ? /* @__PURE__ */ (0, U.jsxs)(x, { children: [
			/* @__PURE__ */ (0, U.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [p.truncated ? /* @__PURE__ */ (0, U.jsx)("span", {
					className: "text-body-2-regular text-text-secondary",
					children: F("manage:healthList.loadedCount", {
						loaded: p.items.length,
						count: p.count
					})
				}) : null, /* @__PURE__ */ (0, U.jsx)(n, {
					size: "small",
					variant: "secondary",
					...D(v.busy === "copy"),
					onClick: () => E(p.items),
					children: F("manage:healthList.copyList")
				})]
			}),
			v.error ? /* @__PURE__ */ (0, U.jsx)(g, {
				tone: "error",
				children: v.error
			}) : null,
			d.isError ? /* @__PURE__ */ (0, U.jsx)(g, {
				tone: "error",
				children: String(d.error)
			}) : null,
			/* @__PURE__ */ (0, U.jsx)(fe, {
				label: y,
				title: F("manage:healthList.tableTitle"),
				unit: F("manage:healthList.tableUnit"),
				panel: !1,
				busy: d.isFetching,
				filters: {
					values: c,
					facets: p.column_facets ?? {},
					onChange: l
				},
				items: p.items,
				columns: O,
				rowId: (e) => String(e.id),
				rowLabel: W,
				selected: b,
				onSelected: S,
				contextOperations: (e) => [{
					id: "open",
					label: F("catalog:mediaActions.open"),
					icon: f,
					run: () => i(e.id)
				}, {
					id: "copy",
					label: F("manage:healthList.copyRow"),
					icon: t,
					disabled: v.busy === "copy",
					run: () => E([e])
				}],
				actions: () => [],
				controls: (e) => /* @__PURE__ */ (0, U.jsx)(n, {
					size: "small",
					variant: "secondary",
					...D(v.busy === "copy"),
					onClick: () => E(e),
					children: F("manage:healthList.copySelected")
				})
			})
		] }) : /* @__PURE__ */ (0, U.jsx)(s, {
			icon: ue,
			title: F("manage:healthList.emptyTitle"),
			size: "compact",
			children: F("manage:healthList.emptyBody")
		})
	});
}
// src/react/diagnostics/scraping-export.tsx
var G = "/api/diagnostics/exports", K = ["diagnostic-export"], he = z((e) => ["running", "cancelling"].includes(e?.status || "") ? 1e3 : !1);
function q({ kind: t, codes: i = "", children: a }) {
	let o = I(), s = R({
		queryKey: K,
		queryFn: ({ signal: e }) => T(G, e),
		refetchInterval: he
	}), c = s.data, l = c?.kind === t, u = c?.status === "running" || c?.status === "cancelling", d = F(t === "support" ? "manage:diagnosticsExport.downloadReport" : "manage:diagnosticsExport.exportFetchLog"), f = (e) => {
		oe.setQueryData(K, e);
	}, p = () => void o.run("start", async (n) => {
		let r = await fetch(G, {
			method: "POST",
			signal: n,
			credentials: "same-origin",
			headers: {
				...await j(),
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				kind: t,
				codes: i
			})
		}), a = await r.json().catch(() => null);
		if (!r.ok) throw new e(a?.detail || a?.error || F("manage:diagnosticsExport.startFailed"), r.status, a);
		if (!a || !a.job_id) throw Error(F("manage:diagnosticsExport.statusNotFound"));
		return a;
	}, f), m = () => void o.run("cancel", (e) => E(`${G}/${c.job_id}/cancel`, {}, "POST", e), f);
	return /* @__PURE__ */ (0, U.jsxs)("div", {
		className: "flex min-w-0 flex-col gap-3",
		children: [
			/* @__PURE__ */ (0, U.jsxs)("div", {
				className: t === "support" ? "flex flex-wrap justify-end gap-2" : "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, U.jsx)(n, {
						type: "button",
						variant: "secondary",
						disabled: u,
						...D(o.busy === "start"),
						onClick: p,
						children: d
					}),
					l && u ? /* @__PURE__ */ (0, U.jsx)(n, {
						type: "button",
						variant: "secondary",
						disabled: c.status === "cancelling",
						...D(o.busy === "cancel"),
						onClick: m,
						children: F("manage:diagnosticsExport.cancelExport")
					}) : null,
					l && c.status === "complete" && c.download_url ? /* @__PURE__ */ (0, U.jsx)(r, {
						variant: "secondary",
						href: c.download_url,
						children: F("manage:diagnosticsExport.downloadFile")
					}) : null,
					a
				]
			}),
			l && u ? /* @__PURE__ */ (0, U.jsx)(S, {
				embedded: t === "scraping",
				kind: w("diagnostic-export", c.stage_code),
				value: c.done || 0,
				total: c.total,
				label: c.total ? F("manage:diagnosticsExport.progress", {
					stage: P(c),
					done: c.done || 0,
					count: c.total
				}) : [
					P(c) || F("manage:diagnosticsExport.preparing"),
					c.rows ? F("manage:diagnosticsExport.candidateCount", { count: c.rows }) : "",
					c.files ? F("manage:diagnosticsExport.fileCount", { count: c.files }) : ""
				].filter(Boolean).join(" · ")
			}) : null,
			l && c.status === "complete" ? /* @__PURE__ */ (0, U.jsx)("p", {
				role: "status",
				className: "text-body-2-regular text-text-secondary",
				children: F("manage:diagnosticsExport.completedSize", { size: ((c.bytes || 0) / 1024 / 1024).toFixed(2) })
			}) : null,
			l && c.status === "cancelled" ? /* @__PURE__ */ (0, U.jsx)(g, {
				tone: "neutral",
				children: F("manage:diagnosticsExport.canceled")
			}) : null,
			s.isError ? /* @__PURE__ */ (0, U.jsx)(g, {
				tone: "error",
				action: /* @__PURE__ */ (0, U.jsx)(n, {
					type: "button",
					variant: "secondary",
					...D(s.isFetching),
					onClick: () => {
						s.refetch();
					},
					children: F("manage:diagnosticsExport.reload")
				}),
				children: F("manage:diagnosticsExport.progressNotFound")
			}) : null,
			o.error || l && c.status === "failed" ? /* @__PURE__ */ (0, U.jsx)(g, {
				tone: "error",
				children: o.error || c?.error
			}) : null
		]
	});
}
function J() {
	let [e, t] = (0, H.useState)("");
	return /* @__PURE__ */ (0, U.jsx)(u, {
		layout: "stack",
		labelledBy: "scraping-export-title",
		footer: /* @__PURE__ */ (0, U.jsx)(q, {
			kind: "scraping",
			codes: e
		}),
		children: /* @__PURE__ */ (0, U.jsxs)("div", {
			className: "flex min-w-0 flex-col gap-4",
			"aria-label": F("manage:diagnosticsExport.exportFetchLog"),
			children: [
				/* @__PURE__ */ (0, U.jsx)(d, {
					id: "scraping-export-title",
					children: F("manage:diagnosticsExport.fetchLogTitle")
				}),
				/* @__PURE__ */ (0, U.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: F("manage:diagnosticsExport.fetchLogHint")
				}),
				/* @__PURE__ */ (0, U.jsx)(p, {
					label: F("manage:diagnosticsExport.codesLabel"),
					name: "scraping-codes",
					value: e,
					onChange: t,
					autoComplete: "off",
					spellCheck: "false",
					maxLength: 1300,
					placeholder: F("manage:diagnosticsExport.codesPlaceholder"),
					hint: F("manage:diagnosticsExport.codesHint")
				})
			]
		})
	});
}
// src/react/diagnostics/diagnostics-page.tsx
var ge = {
	ok: F("manage:diagnostics.statusOk"),
	warning: F("manage:diagnostics.statusWarning"),
	failed: F("manage:diagnostics.statusFailed"),
	unknown: F("manage:shared.notFound"),
	disabled: F("manage:diagnostics.statusDisabled"),
	stale: F("manage:diagnostics.statusStale"),
	unchecked: F("manage:diagnostics.statusUnchecked")
}, _e = { "/tasks": F("manage:diagnostics.viewTasks") }, ve = [
	[F("manage:diagnostics.groupLibraries"), ["media_mounts", "data_root"]],
	[F("manage:diagnostics.groupDatabase"), ["database", "schema"]],
	[F("manage:diagnostics.groupTools"), ["ffmpeg"]],
	[F("manage:diagnostics.groupConfig"), [
		"configured",
		"security",
		"port",
		"version"
	]],
	[F("manage:diagnostics.groupTasks"), ["tasks"]]
], Y = (e) => new Date(e).toLocaleString(ae), X = /* @__PURE__ */ new Set([
	"warning",
	"failed",
	"unknown"
]);
function Z({ status: e }) {
	return /* @__PURE__ */ (0, U.jsx)(i, {
		variant: "caption",
		"data-diagnostic-status": e,
		color: e === "failed" ? "rose" : e === "ok" ? "lime" : e === "warning" || e === "stale" ? "yellow" : "neutral",
		children: ge[e] ?? F("manage:shared.notFound")
	});
}
function ye() {
	return /* @__PURE__ */ (0, U.jsx)(q, { kind: "support" });
}
function Q({ name: e, check: t, compact: n = !1 }) {
	let i = t.target === "/settings/library" && (e === "security" || e === "port") ? le("network") : t.target, a = n ? "h4" : "h3", o = O(t);
	return /* @__PURE__ */ (0, U.jsxs)("div", {
		"data-diagnostic-check": e,
		className: A("flex flex-col gap-4 border-b border-separator-border pr-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between", n ? "py-3" : "py-5"),
		children: [/* @__PURE__ */ (0, U.jsxs)("div", {
			className: A("flex min-w-0 flex-1 flex-col", n ? "gap-1" : "gap-2"),
			children: [
				/* @__PURE__ */ (0, U.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3",
					children: [/* @__PURE__ */ (0, U.jsx)(a, {
						className: A("text-text-primary", n ? "text-body-2-medium" : "text-body-medium"),
						children: o.label
					}), /* @__PURE__ */ (0, U.jsx)(Z, { status: t.status })]
				}),
				/* @__PURE__ */ (0, U.jsx)("p", {
					"data-check-reason": !0,
					className: A("text-body-2-regular break-words", n ? "text-text-secondary" : "text-text-primary"),
					children: o.reason
				}),
				o.action ? /* @__PURE__ */ (0, U.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: F("manage:diagnostics.suggestedFixText", { action: o.action })
				}) : null
			]
		}), i ? /* @__PURE__ */ (0, U.jsx)("div", {
			className: "shrink-0 self-end sm:self-auto",
			children: /* @__PURE__ */ (0, U.jsx)(r, {
				size: "small",
				variant: "secondary",
				href: i,
				children: i.startsWith("/settings/") ? F("manage:diagnostics.openSection", { section: te(i) }) : _e[i] ?? F("manage:diagnostics.openRelated")
			})
		}) : null]
	});
}
function $({ source: e }) {
	return /* @__PURE__ */ (0, U.jsx)("article", {
		"data-diagnostic-source": e.source,
		children: /* @__PURE__ */ (0, U.jsx)(v, { children: /* @__PURE__ */ (0, U.jsxs)(x, { children: [
			/* @__PURE__ */ (0, U.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, U.jsxs)("h3", {
					className: "flex min-w-0 items-center gap-2 text-body-medium text-text-primary",
					children: [/* @__PURE__ */ (0, U.jsx)(b, { source: e.source }), e.label]
				}), /* @__PURE__ */ (0, U.jsx)(Z, { status: e.status })]
			}),
			/* @__PURE__ */ (0, U.jsx)(B, {
				text: k(e, "reason"),
				className: "text-body-regular text-text-primary"
			}),
			/* @__PURE__ */ (0, U.jsxs)(l, { children: [
				/* @__PURE__ */ (0, U.jsx)(c, {
					term: F("manage:diagnostics.lastSuccess"),
					children: e.last_success_at ? Y(e.last_success_at) : F("manage:diagnostics.noSuccessYet")
				}),
				e.last_check_at ? /* @__PURE__ */ (0, U.jsxs)(c, {
					term: F("manage:diagnostics.lastChecked"),
					children: [Y(e.last_check_at), e.elapsed_s !== void 0 && e.elapsed_s !== null ? F("manage:diagnostics.checkDuration", { seconds: e.elapsed_s.toFixed(2) }) : ""]
				}) : null,
				/* @__PURE__ */ (0, U.jsx)(c, {
					term: F("manage:diagnostics.pausedUntil"),
					children: e.cooldown_until ? Y(e.cooldown_until) : F("manage:diagnostics.notPaused")
				})
			] })
		] }) })
	});
}
function be({ sources: e }) {
	let t = e.filter((e) => e.status === "ok" || e.status === "unchecked" || e.status === "disabled"), n = e.filter((e) => !t.includes(e));
	return /* @__PURE__ */ (0, U.jsxs)("section", {
		id: "diagnostics-sessions",
		"data-guide-target": "sessions",
		"aria-label": F("manage:diagnostics.sourceSessions"),
		className: "flex min-w-0 flex-col gap-3",
		children: [
			/* @__PURE__ */ (0, U.jsx)(y, { children: F("manage:diagnostics.sourceSessions") }),
			n.map((e) => /* @__PURE__ */ (0, U.jsx)($, { source: e }, e.source)),
			t.length ? /* @__PURE__ */ (0, U.jsx)(o, {
				summary: F("manage:diagnostics.otherSources", { count: t.length }),
				contentClassName: "gap-3",
				children: t.map((e) => /* @__PURE__ */ (0, U.jsx)($, { source: e }, e.source))
			}) : null,
			/* @__PURE__ */ (0, U.jsx)("div", { children: /* @__PURE__ */ (0, U.jsx)(r, {
				size: "small",
				variant: "secondary",
				href: "/sources",
				children: F("manage:diagnostics.openSources")
			}) })
		]
	});
}
function xe(e) {
	let t = R({
		queryKey: a,
		queryFn: ({ signal: e }) => ne(e),
		staleTime: 1e4
	}), r = I(), [i, s] = (0, H.useState)(""), c = () => void r.run("refresh", async () => {
		let e = await t.refetch();
		if (e.error) throw e.error;
		return e.data;
	}, () => s(""), (e) => s(N(e))), l = t.data;
	if (!l && t.isPending) return /* @__PURE__ */ (0, U.jsx)("div", {
		role: "status",
		"aria-label": F("manage:diagnostics.loading"),
		dangerouslySetInnerHTML: { __html: M() }
	});
	if (!l) return /* @__PURE__ */ (0, U.jsxs)("div", {
		className: "ui-configpage",
		children: [
			/* @__PURE__ */ (0, U.jsx)(ye, {}),
			/* @__PURE__ */ (0, U.jsx)(g, {
				tone: "error",
				title: F("manage:diagnostics.loadFailed"),
				action: /* @__PURE__ */ (0, U.jsx)(n, {
					variant: "secondary",
					onClick: c,
					...D(r.busy === "refresh"),
					children: F("manage:diagnostics.checkAgain")
				}),
				children: t.error ? N(t.error) : F("manage:diagnostics.reportNotFound")
			}),
			/* @__PURE__ */ (0, U.jsx)(J, {})
		]
	});
	let u = Object.entries(l.checks).filter(([, e]) => X.has(e.status)), d = Object.entries(l.checks).filter(([, e]) => !X.has(e.status)), f = [
		...u.length ? [{
			id: "diagnostics-attention",
			label: F("manage:diagnostics.attention")
		}] : [],
		{
			id: "diagnostics-health",
			label: F("manage:diagnostics.collectionHealth")
		},
		...d.length ? [{
			id: "diagnostics-checks",
			label: F("manage:diagnostics.systemChecks")
		}] : [],
		{
			id: "diagnostics-scraping",
			label: F("manage:diagnosticsExport.fetchLogTitle")
		},
		{
			id: "diagnostics-sessions",
			label: F("manage:diagnostics.sourceSessions")
		}
	];
	return /* @__PURE__ */ (0, U.jsxs)("div", {
		className: "flex min-w-0 flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, U.jsx)("div", {
				"data-guide-target": "report",
				children: /* @__PURE__ */ (0, U.jsx)(q, {
					kind: "support",
					children: /* @__PURE__ */ (0, U.jsx)(n, {
						variant: "secondary",
						onClick: c,
						...D(r.busy === "refresh"),
						children: F("manage:diagnostics.checkAgain")
					})
				})
			}),
			i ? /* @__PURE__ */ (0, U.jsx)(g, {
				tone: "error",
				children: i
			}) : null,
			/* @__PURE__ */ (0, U.jsxs)(V, {
				inline: !0,
				label: F("settings:configurationPage.contents"),
				entries: f,
				children: [
					u.length ? /* @__PURE__ */ (0, U.jsx)(_, {
						id: "diagnostics-attention",
						guide: "attention",
						title: F("manage:diagnostics.attentionTitle", { count: u.length }),
						children: u.map(([e, t]) => /* @__PURE__ */ (0, U.jsx)(Q, {
							name: e,
							check: t
						}, e))
					}) : null,
					/* @__PURE__ */ (0, U.jsx)(_, {
						id: "diagnostics-health",
						guide: "health",
						title: F("manage:diagnostics.collectionHealth"),
						children: /* @__PURE__ */ (0, U.jsxs)(x, { children: [l.library.issue_at ? /* @__PURE__ */ (0, U.jsx)("p", {
							className: "text-body-2-regular text-text-secondary",
							children: F("manage:diagnostics.healthRecordedAtTime", { time: Y(l.library.issue_at) })
						}) : null, Object.entries(l.library.groups).map(([t, n]) => /* @__PURE__ */ (0, U.jsx)(me, {
							groupKey: t,
							group: n,
							...e
						}, t))] })
					}),
					d.length ? /* @__PURE__ */ (0, U.jsx)("section", {
						id: "diagnostics-checks",
						"aria-label": F("manage:diagnostics.systemChecks"),
						children: /* @__PURE__ */ (0, U.jsx)(o, {
							summary: F("manage:diagnostics.otherChecks", { count: d.length }),
							contentClassName: "gap-5",
							children: ve.map(([e, t]) => {
								let n = d.filter(([e]) => t.some((t) => t === e));
								return n.length ? /* @__PURE__ */ (0, U.jsxs)("section", {
									"aria-label": e,
									"data-diagnostic-group": "",
									className: "flex min-w-0 flex-col gap-2",
									children: [/* @__PURE__ */ (0, U.jsxs)("h3", {
										className: "flex items-center gap-2 px-3 text-body-medium text-text-primary",
										children: [e, /* @__PURE__ */ (0, U.jsx)("span", {
											className: "text-caption-1-regular text-text-secondary",
											children: F("manage:diagnostics.groupCount", { count: n.length })
										})]
									}), /* @__PURE__ */ (0, U.jsx)(v, { children: n.map(([e, t]) => /* @__PURE__ */ (0, U.jsx)(Q, {
										name: e,
										check: t,
										compact: !0
									}, e)) })]
								}, e) : null;
							})
						})
					}) : null,
					/* @__PURE__ */ (0, U.jsx)("div", {
						id: "diagnostics-scraping",
						children: /* @__PURE__ */ (0, U.jsx)(J, {})
					}),
					/* @__PURE__ */ (0, U.jsx)(be, { sources: l.sources })
				]
			})
		]
	});
}
export { xe as DiagnosticsPage };

//# debugId=828d7783-2016-4d0a-a42d-63c8a1ce6ef2
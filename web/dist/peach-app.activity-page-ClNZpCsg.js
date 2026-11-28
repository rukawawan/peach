(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "aebf857f-9f83-4406-858b-daa24ef2c458", e._sentryDebugIdIdentifier = "sentry-dbid-aebf857f-9f83-4406-858b-daa24ef2c458");
	} catch {}
})();
import { AnimatedNumber as e, Button as t, Bx as n, Chip as r, DataTableFooter as i, Disclosure as a, DownloadsPanel as o, EmptyState as s, Gg as c, HN as l, IndexSearch as u, IssueRow as d, LinkButton as f, Lo as p, Ma as m, NameLink as h, Note as g, OV as _, Pf as v, ProcessingMode as y, RB as b, RUNNING_POLL_MS as x, Rk as S, Su as C, TASKS_KEY as w, TRIGGER_LABELS as T, TaskProgress as E, TaskStage as D, Xl as O, __toESM as k, activityKind as A, apiGet as j, apiSend as ee, busyProps as M, cardClass as te, codedText as N, confirmModal as ne, controlTask as re, cx as ie, elapsedText as ae, errorMessage as P, fetchTasks as oe, fmtSize as se, foldByKind as ce, foldRoutine as le, followupDetail as ue, followupTally as F, groupFollowups as de, hasResultProblems as I, i2 as fe, interfaceLanguage as pe, isActive as L, isRoutine as me, latestOfKind as he, momentText as R, oe as ge, pollInterval as _e, problemDestination as ve, progressLabel as ye, progressText as be, readableErrorHeadline as z, require_jsx_runtime as xe, require_react as Se, runError as B, setTaskSpeed as Ce, statusLabel as we, summaryItems as Te, t as V, taskIssues as Ee, taskName as H, taskSubject as De, um as Oe, uo as ke, useMutation as U, useMutationState as Ae, useQuery as W, useQueryClient as je, vl as Me, withBackoff as G } from "./peach-app.js";
import { CodeBlock as Ne } from "./peach-app.code-block-BdQewVJ0.js";
import { Page as Pe } from "./peach-app.page-QAncjzM1.js";
import { ErrorDetails as Fe, ErrorExcerpt as Ie } from "./peach-app.error-excerpt-Ugft6I5o.js";
// src/react/activity/background-issues.tsx
var K = /* @__PURE__ */ k(Se(), 1), q = xe(), Le = ["background-issues"], Re = G(() => 3e4);
function ze() {
	let e = (0, K.useId)(), t = W({
		queryKey: Le,
		queryFn: ({ signal: e }) => j("/api/background-issues", e),
		refetchInterval: Re
	}).data?.issues || [];
	return t.length ? /* @__PURE__ */ (0, q.jsxs)("section", {
		"aria-labelledby": e,
		className: "flex min-w-0 flex-col gap-3",
		children: [/* @__PURE__ */ (0, q.jsx)("h3", {
			id: e,
			className: "text-title-2-medium text-text-primary",
			children: V("manage:backgroundIssues.title")
		}), /* @__PURE__ */ (0, q.jsx)("ul", {
			className: "flex min-w-0 flex-col gap-3",
			children: t.map((e) => /* @__PURE__ */ (0, q.jsx)("li", { children: /* @__PURE__ */ (0, q.jsx)(Be, { issue: e }) }, e.key))
		})]
	}) : null;
}
function Be({ issue: e }) {
	let n = je(), r = U({
		mutationFn: () => ee(e.retry, {}),
		onSuccess: () => {
			n.invalidateQueries({ queryKey: Le });
		}
	}), i = e.since ? V("manage:backgroundIssues.since", { time: R(e.since) }) : V("manage:backgroundIssues.detectedAt", { time: R(e.noticed_at) });
	return /* @__PURE__ */ (0, q.jsx)(g, {
		tone: "error",
		title: N(e, "title"),
		action: /* @__PURE__ */ (0, q.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2",
			children: [/* @__PURE__ */ (0, q.jsx)(f, {
				href: e.href,
				size: "small",
				trailingIcon: fe,
				children: N(e, "link_label")
			}), e.retry ? /* @__PURE__ */ (0, q.jsx)(t, {
				variant: "secondary",
				size: "small",
				disabled: !e.retry_available,
				...M(r.isPending),
				onClick: () => r.mutate(),
				children: V("manage:shared.retryNow")
			}) : null]
		}),
		children: r.error ? V("manage:backgroundIssues.retryFailed", {
			moment: i,
			error: P(r.error)
		}) : i
	});
}
// src/react/activity/task-controls.tsx
var J = ["task-control"], Ve = {
	pause: _,
	resume: c,
	cancel: l
}, He = {
	pause: V("manage:shared.pause"),
	resume: V("manage:shared.resume"),
	cancel: V("manage:taskControls.cancelTask")
}, Ue = {
	pause: V("manage:taskControls.pauseFollowups"),
	resume: V("manage:taskControls.resumeFollowups"),
	cancel: V("manage:taskControls.cancelFollowups")
};
function We() {
	let e = Ae({
		filters: { mutationKey: J },
		select: (e) => ({
			id: e.mutationId,
			command: e.state.variables,
			status: e.state.status,
			error: e.state.error
		})
	}), t = /* @__PURE__ */ new Map();
	for (let n of e) {
		let e = n.command;
		if (!e) continue;
		let r = t.get(e.id);
		(!r || r.id < n.id) && t.set(e.id, {
			...n,
			command: e
		});
	}
	let n = [...t.values()].filter((e) => e.status === "error");
	return n.length ? /* @__PURE__ */ (0, q.jsx)("div", {
		"data-task-control-feedback": "",
		className: "flex min-w-0 flex-col gap-2",
		children: n.map(({ command: e, error: t }) => /* @__PURE__ */ (0, q.jsx)(g, {
			tone: "error",
			title: V("manage:taskControls.actionFailed", {
				task: e.label,
				action: (e.followups ? Ue : He)[e.action]
			}),
			children: P(t)
		}, e.id))
	}) : null;
}
function Ge({ run: e, runs: n = [e] }) {
	let r = je(), i = (0, K.useRef)({
		change: !1,
		cancel: !1,
		confirmation: !1
	}), a = () => {
		r.invalidateQueries({ queryKey: w });
	}, o = async (e) => {
		let t = null;
		for (let r of n) try {
			await re(r.id, e.action);
		} catch (e) {
			t ??= e;
		}
		if (t !== null) throw t;
	}, s = U({
		mutationKey: [
			...J,
			e.id,
			"change"
		],
		mutationFn: o,
		onSettled: () => {
			i.current.change = !1, a();
		}
	}), c = U({
		mutationKey: [
			...J,
			e.id,
			"cancel"
		],
		mutationFn: o,
		onSettled: () => {
			i.current.cancel = !1, a();
		}
	}), l = U({
		mutationFn: async (e) => {
			let t = (await Promise.allSettled(n.map((t) => Ce(t.id, e)))).find((e) => e.status === "rejected");
			if (t?.status === "rejected") throw t.reason;
		},
		onSettled: a
	}), u = (e.control?.actions || []).filter((e) => e !== "set_speed"), d = !!(e.control?.actions.includes("set_speed") && e.control.speed_mode), f = !L(e), p = c.isPending || c.isSuccess;
	if (!u.length && !d) return null;
	let m = (t) => {
		let r = {
			id: e.id,
			label: H(e),
			action: t,
			followups: f
		};
		if (t === "cancel") {
			if (i.current.cancel || i.current.confirmation || c.isSuccess) return;
			i.current.confirmation = !0, ne({
				title: V(f ? "manage:taskControls.cancelFollowupsTitle" : "manage:taskControls.cancelTaskTitle", { task: H(e) }),
				body: f ? n.length > 1 ? V("manage:taskControls.cancelBatchFollowupsBody", { count: n.length }) : V("manage:taskControls.cancelFollowupsBody") : V("manage:taskControls.cancelTaskBody"),
				confirmLabel: V(f ? "manage:taskControls.cancelFollowups" : "manage:shared.cancelTask"),
				danger: !0,
				onConfirm: async () => (i.current.cancel = !0, await c.mutateAsync(r))
			}).finally(() => {
				i.current.confirmation = !1;
			});
		} else {
			if (i.current.change || i.current.cancel || p) return;
			i.current.change = !0, s.mutate(r);
		}
	};
	return /* @__PURE__ */ (0, q.jsxs)("div", {
		className: "ml-auto min-w-0",
		"data-task-controls": e.id,
		children: [/* @__PURE__ */ (0, q.jsxs)("div", {
			role: "group",
			"aria-label": V(f ? "manage:taskControls.followupsGroupLabel" : "manage:taskControls.groupLabel", { task: H(e) }),
			className: "flex flex-wrap items-center justify-end gap-2",
			children: [d ? /* @__PURE__ */ (0, q.jsx)(y, {
				value: e.control.speed_mode,
				busy: l.isPending || p,
				animate: e.control?.state === "running",
				onChange: (e) => l.mutate(e)
			}) : null, u.map((e) => {
				let n = (f ? Ue : He)[e], r = e === "cancel" ? c.isPending : s.isPending && s.variables?.action === e, i = e === "cancel" ? p : s.isPending || p;
				return /* @__PURE__ */ (0, q.jsx)(t, {
					type: "button",
					variant: "secondary",
					size: "small",
					leadingIcon: Ve[e],
					"aria-label": n,
					title: n,
					...M(r),
					"aria-disabled": i || void 0,
					onClick: () => m(e),
					children: /* @__PURE__ */ (0, q.jsx)("span", {
						"data-copy-key": `tasks.control.action.${f ? "followups." : ""}${e}`,
						children: n
					})
				}, e);
			})]
		}), l.error ? /* @__PURE__ */ (0, q.jsx)(g, {
			tone: "error",
			children: P(l.error)
		}) : null]
	});
}
// src/react/activity/task-icon.tsx
var Ke = new Map([
	[n, [
		"follow-check",
		"follow-resolve",
		"follow-creator",
		"follow-evidence-reclaim",
		"follow-backfill",
		"feed-check",
		"feed-scrape",
		"feed-cover"
	]],
	[S, [
		"library-processing",
		"organize",
		"batch",
		"resource-scan",
		"resource-apply",
		"seed-import"
	]],
	[Me, [
		"scrape-codes",
		"jav-discovery-metadata",
		"want-scrape",
		"upgrade-library"
	]],
	[m, [
		"scraping-cover",
		"jav-covers",
		"code-samples",
		"timeline-thumbnails",
		"entity-avatar",
		"cover-artwork-repair"
	]],
	[v, [
		"performer-profile",
		"performer-alias",
		"creator-identity",
		"studio-mark"
	]],
	[O, ["media-repair", "mp4-header-repair"]],
	[Oe, [
		"link-check",
		"link-prune",
		"source-check"
	]],
	[ge, ["download-postprocess", "want-search"]],
	[p, ["taste-refresh"]],
	[b, [
		"upgrade-repairs",
		"diagnostic-export",
		"amane-bridge",
		"face-models",
		"ledger-backup",
		"ledger-restore"
	]]
].flatMap(([e, t]) => t.map((t) => [t, e])));
function qe({ taskKey: e, className: t }) {
	let n = Ke.get(e) ?? C;
	return /* @__PURE__ */ (0, q.jsx)(n, {
		className: t,
		"aria-hidden": !0
	});
}
// src/react/activity/resource-chip.tsx
var Je = {
	blue: "bg-status-blue-text text-background-primary-default",
	purple: "bg-status-purple-text text-background-primary-default",
	cyan: "bg-status-cyan-text text-background-primary-default"
};
function Ye({ color: e, high: t, ...n }) {
	return t ? /* @__PURE__ */ (0, q.jsx)("span", {
		...n,
		className: ie("inline-flex items-center justify-center rounded-md px-1.5 py-1 whitespace-nowrap text-caption-1-medium", Je[e])
	}) : /* @__PURE__ */ (0, q.jsx)(r, {
		variant: "caption",
		color: e,
		...n
	});
}
// src/react/activity/task-resources.tsx
var Xe = {
	cpu: {
		name: "CPU",
		color: "blue"
	},
	gpu: {
		name: "GPU",
		color: "purple"
	},
	network: {
		name: V("manage:taskResources.network"),
		color: "cyan"
	}
};
function Ze(e) {
	return e.state === "sampling" ? V("manage:taskResources.sampling") : e.via === "cloud" ? V("manage:taskResources.viaCloudDrive") : V("manage:taskResources.unavailable");
}
function Qe(e, t) {
	return t === 0 ? V("manage:taskResources.idle") : e === "network" ? `${se(t)}/s` : `${t.toLocaleString(pe, { maximumFractionDigits: 1 })}%`;
}
function $e({ run: t, active: n = L(t) || !!t.control }) {
	if (!n || !t.resources) return null;
	let r = t.resources;
	return /* @__PURE__ */ (0, q.jsx)("div", {
		"data-task-resources": t.id,
		className: "flex min-w-0 flex-wrap items-center gap-2",
		children: [
			"cpu",
			"gpu",
			"network"
		].map((t) => {
			let n = r[t], i = Xe[t], a = t === "network" ? r.network.bytes_per_second : r[t].percent, o = n.state === "ready" && a !== null, s = o && n.high, c = o ? Qe(t, a) : Ze(n), l = [n.reason ? N(n, "reason") : "", s ? V("manage:taskResources.highUsage") : ""].filter(Boolean).join("\n");
			return /* @__PURE__ */ (0, q.jsx)(Ye, {
				color: i.color,
				high: s,
				tabIndex: l ? 0 : void 0,
				title: l || void 0,
				"data-task-resource": t,
				"data-resource-state": n.state,
				"data-resource-via": n.via,
				"data-resource-high": s || void 0,
				"data-resource-idle": o && a === 0 || void 0,
				"data-copy-ignore": "",
				children: /* @__PURE__ */ (0, q.jsxs)("span", {
					className: "inline-flex items-baseline gap-1",
					children: [
						/* @__PURE__ */ (0, q.jsx)("span", { children: i.name }),
						" ",
						o && a !== 0 ? /* @__PURE__ */ (0, q.jsx)(e, { value: c }) : /* @__PURE__ */ (0, q.jsx)("span", { children: c })
					]
				})
			}, t);
		})
	});
}
// src/react/activity/activity-page.tsx
var et = G(_e), tt = (e) => G(() => e ? x : !1), nt = /* @__PURE__ */ new Set(["upgrade-repairs"]), rt = /* @__PURE__ */ new Set(["asset_id", "name"]), it = {
	succeeded: "lime",
	failed: "rose",
	cancelled: "rose",
	interrupted: "yellow",
	running: "blue",
	pending: "neutral"
}, at = {
	running: V("manage:taskStatus.running"),
	pausing: V("manage:taskStatus.pausing"),
	paused: V("manage:taskStatus.paused"),
	cancelling: V("manage:taskStatus.canceling")
};
function Y({ run: e }) {
	let t = e.control?.state;
	if (t && (t !== "running" || !L(e))) return /* @__PURE__ */ (0, q.jsx)(r, {
		color: t === "running" ? "blue" : "neutral",
		children: /* @__PURE__ */ (0, q.jsx)("span", {
			"data-copy-key": `tasks.control.state.${t}`,
			children: at[t]
		})
	});
	let n = e.status === "failed" && e.task_key === "library-processing" && e.result_summary?.outcome === "partial", i = n || e.status === "succeeded" && I(e);
	return /* @__PURE__ */ (0, q.jsx)(r, {
		color: i ? "yellow" : it[e.status] ?? "neutral",
		children: n ? V("manage:taskStatus.partial") : i ? V("manage:taskStatus.issuesFound") : we(e.status)
	});
}
function ot({ rows: e }) {
	let [t, n] = (0, K.useState)({
		pageIndex: 0,
		pageSize: 20
	}), { pageSize: r } = t, o = Math.min(t.pageIndex, Math.max(0, Math.ceil(e.length / r) - 1));
	return /* @__PURE__ */ (0, q.jsxs)(q.Fragment, { children: [/* @__PURE__ */ (0, q.jsx)("ul", {
		className: "-mr-5 flex min-w-0 flex-col",
		children: e.slice(o * r, (o + 1) * r).map((e) => {
			let t = ue(e);
			return /* @__PURE__ */ (0, q.jsxs)("li", {
				"data-status": e.status,
				"data-followup-key": e.followup_key,
				className: "flex min-w-0 flex-col gap-1 border-t border-separator-border py-2.5 pr-10 pl-5",
				children: [
					/* @__PURE__ */ (0, q.jsxs)("div", {
						className: "flex min-w-0 flex-wrap items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, q.jsxs)("div", {
							className: "flex min-w-0 flex-1 basis-40 flex-wrap items-center gap-x-2 gap-y-1",
							children: [
								/* @__PURE__ */ (0, q.jsx)(qe, {
									taskKey: e.task_key,
									className: "size-4 shrink-0 text-text-secondary"
								}),
								/* @__PURE__ */ (0, q.jsx)("span", {
									className: "min-w-0 break-words text-caption-1-regular text-text-primary",
									children: H(e)
								}),
								/* @__PURE__ */ (0, q.jsx)(Y, { run: e }),
								t ? /* @__PURE__ */ (0, q.jsx)("span", {
									className: "min-w-0 break-words text-caption-1-regular text-text-secondary",
									children: t
								}) : null
							]
						}), /* @__PURE__ */ (0, q.jsx)(Ge, { run: e })]
					}),
					/* @__PURE__ */ (0, q.jsx)($e, { run: e }),
					Object.keys(e.result_summary || {}).length ? /* @__PURE__ */ (0, q.jsx)("div", {
						className: "w-full min-w-0",
						children: /* @__PURE__ */ (0, q.jsx)(a, {
							findable: !0,
							summary: V("manage:taskCenter.technicalDetails"),
							contentClassName: "pb-2.5",
							children: /* @__PURE__ */ (0, q.jsx)(Ne, {
								code: JSON.stringify(e.result_summary, null, 2),
								language: "json",
								label: V("manage:taskCenter.taskTechnicalDetails", { task: H(e) })
							})
						})
					}) : null
				]
			}, e.id);
		})
	}), /* @__PURE__ */ (0, q.jsx)(i, {
		label: V("manage:taskCenter.taskDetails"),
		total: e.length,
		pagination: {
			...t,
			pageIndex: o
		},
		onChange: n
	})] });
}
function X({ run: e, meta: t, progress: n, children: r, error: i, issues: o, followups: s, followupTotal: c = 0, badge: l, resourceActive: u, controlled: d }) {
	let [f, p] = (0, K.useState)(!!s?.some(L)), m = (d || [e]).map((e) => e.id), _ = c > (s?.length || 0), v = W({
		queryKey: [
			...w,
			"followups",
			m
		],
		enabled: f && _,
		queryFn: async ({ signal: e }) => (await Promise.all(m.map((t) => j(`/api/tasks/${t}`, e)))).flatMap((e) => e.followups),
		refetchInterval: tt(u)
	}), y = (e) => e.status === "running" ? 3 : e.status === "pending" ? 2 : +(e.status === "failed" || e.status === "interrupted"), b = [...(_ ? v.data : void 0) || s || []].sort((e, t) => y(t) - y(e) || t.id - e.id), x = b.length, S = Math.max(s?.length || 0, c), C = De(e), T = String(i || "").trim(), E = z(T);
	return /* @__PURE__ */ (0, q.jsxs)("li", {
		id: `run-${e.id}`,
		"data-status": e.status,
		"data-task-key": e.task_key,
		"data-run-id": e.id,
		className: te({
			padding: "none",
			bordered: e.status === "failed" ? "error" : void 0,
			className: "flex flex-col"
		}),
		children: [
			/* @__PURE__ */ (0, q.jsxs)("div", {
				className: "flex flex-col gap-2 px-5 py-4",
				children: [
					/* @__PURE__ */ (0, q.jsxs)("div", {
						className: "flex min-w-0 flex-wrap items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, q.jsxs)("div", {
							className: "flex min-w-0 flex-1 basis-48 flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, q.jsx)(qe, {
									taskKey: e.task_key,
									className: "size-5 shrink-0 text-text-secondary"
								}),
								/* @__PURE__ */ (0, q.jsx)("strong", {
									className: "min-w-0 break-words text-title-3-medium text-text-primary",
									children: H(e)
								}),
								l ?? /* @__PURE__ */ (0, q.jsx)(Y, { run: e })
							]
						}), /* @__PURE__ */ (0, q.jsx)(Ge, {
							run: e,
							runs: d
						})]
					}),
					n,
					/* @__PURE__ */ (0, q.jsx)("p", {
						className: "text-caption-1-regular text-text-secondary",
						children: t
					}),
					/* @__PURE__ */ (0, q.jsx)($e, {
						run: e,
						active: u
					}),
					C ? /* @__PURE__ */ (0, q.jsx)(h, {
						href: C.href,
						"data-task-subject": e.id,
						title: C.label,
						className: "min-w-0 max-w-full self-start truncate text-text-primary",
						children: C.label
					}) : null,
					E ? /* @__PURE__ */ (0, q.jsx)("p", {
						"data-task-error": "",
						className: "text-caption-1-regular text-text-secondary wrap-anywhere",
						children: E
					}) : null,
					r
				]
			}),
			o ? /* @__PURE__ */ (0, q.jsx)("div", {
				className: "border-t border-separator-border",
				children: o
			}) : null,
			E && T !== E ? /* @__PURE__ */ (0, q.jsx)("div", {
				className: "border-t border-separator-border",
				children: /* @__PURE__ */ (0, q.jsx)(a, {
					row: !0,
					findable: !0,
					summary: V("manage:taskCenter.errorDetails"),
					contentClassName: "pb-5",
					children: /* @__PURE__ */ (0, q.jsx)(Fe, {
						label: V("manage:taskCenter.taskErrorDetails", { task: H(e) }),
						children: T
					})
				})
			}) : null,
			S ? /* @__PURE__ */ (0, q.jsx)("div", {
				className: "border-t border-separator-border",
				children: /* @__PURE__ */ (0, q.jsxs)(a, {
					row: !0,
					summary: V("manage:taskCenter.taskDetailsCount", { count: S }),
					contentClassName: "pb-5",
					isOpen: f,
					onOpenChange: p,
					children: [
						v.error ? /* @__PURE__ */ (0, q.jsx)(g, {
							tone: "error",
							children: P(v.error)
						}) : null,
						x < S ? /* @__PURE__ */ (0, q.jsx)("p", {
							className: "text-caption-1-regular text-text-secondary",
							children: V("manage:taskCenter.showingCount", { count: x })
						}) : null,
						/* @__PURE__ */ (0, q.jsx)(ot, { rows: b })
					]
				})
			}) : null,
			Object.keys(e.result_summary || {}).some((e) => !(C && rt.has(e))) ? /* @__PURE__ */ (0, q.jsx)("div", {
				className: "border-t border-separator-border",
				children: /* @__PURE__ */ (0, q.jsx)(a, {
					row: !0,
					findable: !0,
					summary: V("manage:taskCenter.technicalDetails"),
					contentClassName: "pb-5",
					children: /* @__PURE__ */ (0, q.jsx)(Ne, {
						code: JSON.stringify(e.result_summary, null, 2),
						language: "json",
						label: V("manage:taskCenter.taskTechnicalDetails", { task: H(e) })
					})
				})
			}) : null
		]
	});
}
function st({ run: t, followups: n, followupTotal: r }) {
	let i = t.progress_total || 0, a = t.progress_current || 0, o = t.control?.state, s = o && o !== "running", c = s ? at[o] : ye(t) || V("manage:taskCenter.inProgress"), l = i > 0 ? V("manage:taskCenter.progressItems", { progress: be(a, i) }) : "", u = `${o || t.status}:${t.progress_params?.stage || t.progress_code || ""}`, d = /* @__PURE__ */ (0, q.jsx)(D, {
		phase: u,
		children: c
	}), f = ae(t.elapsed_seconds), p = [T[t.trigger] || t.trigger, f && V("manage:taskCenter.runningFor", { elapsed: f })].filter(Boolean).join(" · ");
	return /* @__PURE__ */ (0, q.jsx)(X, {
		run: t,
		meta: p,
		followups: n,
		followupTotal: r,
		progress: s && !(i > 0) ? /* @__PURE__ */ (0, q.jsx)("p", {
			"data-copy-key": `tasks.control.state.${o}`,
			className: "text-caption-1-regular text-text-secondary",
			children: c
		}) : /* @__PURE__ */ (0, q.jsx)(E, {
			embedded: !0,
			kind: A(t.task_key, String(t.progress_params?.stage || "") || null),
			label: l ? `${c} · ${l}` : c,
			labelContent: l ? /* @__PURE__ */ (0, q.jsxs)(q.Fragment, { children: [
				d,
				" · ",
				/* @__PURE__ */ (0, q.jsx)(e, { value: l })
			] }) : d,
			value: Math.min(a, i),
			total: i
		})
	});
}
function Z({ run: e, followups: t, runs: n, latest: i, followupTotal: o, followupFailed: s = 0, followupCancelled: c = 0 }) {
	let l = !!(n && n.length > 1 && o), u = l ? [V("manage:taskCenter.processedTotal", { count: o }), s ? V("manage:taskCenter.failedCount", { count: s }) : ""].filter(Boolean) : Te(De(e) ? {
		...e.result_summary,
		name: ""
	} : e.result_summary).filter((t) => t !== B(e) && t !== z(B(e))), p = Ee(e), m = ve(e, i), h = ae(e.elapsed_seconds), g = n && n.length > 1 ? n[n.length - 1] : void 0, _ = (g ? [
		T[e.trigger] || e.trigger,
		V("manage:taskCenter.lastRuns", { count: n.length }),
		`${R(g.finished_at)} – ${R(e.finished_at)}`
	] : [
		T[e.trigger] || e.trigger,
		R(e.finished_at),
		h && V("manage:taskCenter.took", { elapsed: h })
	]).filter(Boolean).join(" · ");
	return /* @__PURE__ */ (0, q.jsxs)(X, {
		run: e,
		meta: _,
		error: B(e),
		followups: t,
		followupTotal: o,
		controlled: n,
		issues: p.length ? /* @__PURE__ */ (0, q.jsx)(a, {
			row: !0,
			findable: !0,
			summary: V("manage:taskCenter.issueDetailsCount", { count: p.length }),
			contentClassName: "pb-5",
			children: /* @__PURE__ */ (0, q.jsx)(Fe, {
				label: V("manage:taskCenter.issueDetails"),
				children: /* @__PURE__ */ (0, q.jsx)("ul", {
					className: "flex min-w-0 flex-col whitespace-normal",
					"data-task-issues": "",
					children: p.map((e, t) => /* @__PURE__ */ (0, q.jsx)(d, {
						title: /* @__PURE__ */ (0, q.jsxs)(q.Fragment, { children: [e.label, e.provider || e.kind ? /* @__PURE__ */ (0, q.jsxs)("span", {
							className: "text-body-2-regular text-text-secondary",
							children: [" · ", [e.provider, e.kind].filter(Boolean).join(" · ")]
						}) : null] }),
						children: /* @__PURE__ */ (0, q.jsx)(Ie, {
							text: e.error,
							className: "text-caption-1-regular text-text-secondary"
						})
					}, `${e.source}-${t}`))
				})
			})
		}) : void 0,
		badge: c && e.status === "succeeded" ? /* @__PURE__ */ (0, q.jsx)(r, {
			color: "rose",
			children: /* @__PURE__ */ (0, q.jsx)("span", {
				"data-copy-key": `tasks.followups.cancelled.${c === o ? "all" : "partial"}`,
				children: V(c === o ? "manage:taskCenter.followupsCanceled" : "manage:taskCenter.someFollowupsCanceled")
			})
		}) : l && s ? /* @__PURE__ */ (0, q.jsx)(r, {
			color: "yellow",
			children: V("manage:taskStatus.issuesFound")
		}) : void 0,
		children: [
			c ? /* @__PURE__ */ (0, q.jsx)("p", {
				className: "text-caption-1-regular text-text-secondary",
				children: V("manage:taskCenter.followupsCanceledCount", { count: c })
			}) : null,
			u.length === 1 ? /* @__PURE__ */ (0, q.jsx)("p", {
				className: "text-caption-1-regular text-text-secondary wrap-anywhere",
				children: u[0]
			}) : u.length ? /* @__PURE__ */ (0, q.jsx)("ul", {
				className: "flex list-disc flex-col gap-1 pl-5 text-caption-1-regular text-text-secondary wrap-anywhere",
				children: u.map((e, t) => /* @__PURE__ */ (0, q.jsx)("li", { children: e }, t))
			}) : null,
			!p.length && I(e) && ["follow-check", "feed-check"].includes(e.task_key) ? /* @__PURE__ */ (0, q.jsx)("p", {
				className: "text-body-2-regular text-text-secondary",
				children: V("manage:taskCenter.noIssueDetails")
			}) : null,
			m ? /* @__PURE__ */ (0, q.jsx)(f, {
				href: m.href,
				size: "small",
				trailingIcon: fe,
				className: "self-start",
				children: m.label
			}) : null
		]
	});
}
function ct({ runs: t, followups: n, counts: i }) {
	let a = t[0], o = t[t.length - 1], s = F(i, t), c = Math.max(s.total, n.length), l = s.total ? s.settled : n.filter((e) => !L(e)).length, u = s.total ? s.failed : n.filter((e) => e.status === "failed" || e.status === "interrupted").length, d = V("manage:taskCenter.processedProgress", { progress: be(l, c) }), f = u ? V("manage:taskCenter.failedSuffix", { count: u }) : "", p = [
		T[a.trigger] || a.trigger,
		t.length > 1 ? V("manage:taskCenter.batches", { count: t.length }) : "",
		V("manage:taskCenter.startedAt", { time: R(o.started_at || o.finished_at) })
	].filter(Boolean).join(" · ");
	return /* @__PURE__ */ (0, q.jsx)(X, {
		run: a,
		meta: p,
		followups: n,
		followupTotal: c,
		resourceActive: !0,
		controlled: t,
		badge: a.control ? /* @__PURE__ */ (0, q.jsx)(Y, { run: a }) : /* @__PURE__ */ (0, q.jsx)(r, {
			color: "blue",
			children: V("manage:taskStatus.running")
		}),
		progress: /* @__PURE__ */ (0, q.jsx)(E, {
			embedded: !0,
			kind: A(a.task_key),
			value: l,
			total: c,
			label: d + f,
			labelContent: /* @__PURE__ */ (0, q.jsxs)(q.Fragment, { children: [/* @__PURE__ */ (0, q.jsx)(e, { value: d }), f] })
		})
	});
}
function Q({ title: e, action: t, children: n }) {
	let r = (0, K.useId)();
	return /* @__PURE__ */ (0, q.jsxs)("section", {
		"aria-labelledby": r,
		className: "flex min-w-0 flex-col gap-3",
		children: [t ? /* @__PURE__ */ (0, q.jsxs)("div", {
			className: "flex min-w-0 flex-wrap items-center gap-3",
			children: [/* @__PURE__ */ (0, q.jsx)("h3", {
				id: r,
				className: "text-title-2-medium text-text-primary",
				children: e
			}), t]
		}) : /* @__PURE__ */ (0, q.jsx)("h3", {
			id: r,
			className: "text-title-2-medium text-text-primary",
			children: e
		}), n]
	});
}
function $({ live: e = !1, paginate: t = !0, children: n }) {
	let [r, a] = (0, K.useState)({
		pageIndex: 0,
		pageSize: 20
	}), o = K.Children.toArray(n), { pageSize: s } = r, c = Math.min(r.pageIndex, Math.max(0, Math.ceil(o.length / s) - 1));
	return /* @__PURE__ */ (0, q.jsxs)(q.Fragment, { children: [/* @__PURE__ */ (0, q.jsx)("ul", {
		"aria-live": e ? "polite" : void 0,
		className: "flex min-w-0 flex-col gap-3",
		children: t ? o.slice(c * s, (c + 1) * s) : o
	}), t ? /* @__PURE__ */ (0, q.jsx)(i, {
		label: V("manage:taskCenter.taskList"),
		total: o.length,
		pagination: {
			...r,
			pageIndex: c
		},
		onChange: a
	}) : null] });
}
function lt() {
	let [e, t] = (0, K.useState)(1), [n, r] = (0, K.useState)(20), [a, c] = (0, K.useState)(""), l = W({
		queryKey: e === 1 && n === 20 && !a ? w : [
			...w,
			"page",
			e,
			n,
			a
		],
		queryFn: ({ signal: t }) => oe(t, e, n, a),
		refetchInterval: et,
		placeholderData: (e) => e
	}), [d, f] = (0, K.useState)(l.data);
	l.data && l.data !== d && f(l.data);
	let p = l.data || d, m = l.error ? P(l.error) : "";
	if (!p) return /* @__PURE__ */ (0, q.jsx)(Pe, { children: /* @__PURE__ */ (0, q.jsx)(g, {
		tone: "error",
		children: m || V("manage:taskCenter.loadFailed")
	}) });
	let h = p.finished || [], _ = p.working_parents || [], v = [
		...p.running || [],
		...p.skipped || [],
		...h,
		..._
	], y = de(v), b = new Set(v.map((e) => e.id)), x = (e) => e.filter((e) => !(e.followup_key && e.parent_run_id != null && b.has(e.parent_run_id))), S = x(h), C = p.followup_counts || {}, T = (e) => e.flatMap((e) => y.get(e.id) || []), E = [...S, ...x(_)].filter((e) => F(C, [e]).active > 0 || y.get(e.id)?.some(L)).sort((e, t) => t.id - e.id), D = x(p.running || []), O = x(p.skipped || []), k = S.filter((e) => !E.includes(e) && !O.some((t) => t.id === e.id)), A = (e) => (y.get(e.id) || []).every((e) => e.status === "succeeded" && !I(e)) && F(C, [e]).failed === 0, j = le(k, (e) => me(e) && (A(e) || nt.has(e.task_key))), ee = ce(E, (e) => e.control?.state || "").sort((e, t) => t.run.id - e.run.id), M = he(v), te = !D.length && !E.length && !O.length && !k.length && !a;
	return /* @__PURE__ */ (0, q.jsxs)(Pe, { children: [
		m ? /* @__PURE__ */ (0, q.jsx)(g, {
			tone: "error",
			children: m
		}) : null,
		/* @__PURE__ */ (0, q.jsx)(We, {}),
		p.available === !1 ? /* @__PURE__ */ (0, q.jsx)(g, {
			tone: "warning",
			children: p.message || V("manage:taskCenter.tableNotReady")
		}) : null,
		/* @__PURE__ */ (0, q.jsx)(ze, {}),
		te ? /* @__PURE__ */ (0, q.jsx)(s, {
			icon: ke,
			title: V("manage:taskCenter.emptyTitle"),
			children: V("manage:taskCenter.emptyText")
		}) : /* @__PURE__ */ (0, q.jsxs)(q.Fragment, { children: [
			/* @__PURE__ */ (0, q.jsx)(Q, {
				title: V("manage:taskCenter.inProgress"),
				children: D.length || E.length ? /* @__PURE__ */ (0, q.jsxs)($, {
					live: !0,
					children: [D.map((e) => /* @__PURE__ */ (0, q.jsx)(st, {
						run: e,
						followups: y.get(e.id),
						followupTotal: F(C, [e]).total
					}, e.id)), ee.map(({ run: e, runs: t }) => /* @__PURE__ */ (0, q.jsx)(ct, {
						runs: t,
						followups: T(t),
						counts: C
					}, e.id))]
				}) : /* @__PURE__ */ (0, q.jsx)(g, {
					tone: "neutral",
					children: V("manage:taskCenter.noneRunning")
				})
			}),
			O.length ? /* @__PURE__ */ (0, q.jsx)(Q, {
				title: V("manage:taskCenter.skipped"),
				children: /* @__PURE__ */ (0, q.jsx)($, { children: O.map((e) => /* @__PURE__ */ (0, q.jsx)(Z, {
					run: e,
					latest: M.has(e.id),
					followups: y.get(e.id)
				}, e.id)) })
			}) : null,
			k.length || p.finished_total || a ? /* @__PURE__ */ (0, q.jsxs)(Q, {
				title: V("manage:taskCenter.recentlyCompleted"),
				action: /* @__PURE__ */ (0, q.jsx)(u, {
					label: V("manage:taskCenter.search"),
					value: a,
					onQuery: (e) => {
						c(e), t(1);
					}
				}),
				children: [
					a && !p.finished_total ? /* @__PURE__ */ (0, q.jsx)(g, {
						tone: "neutral",
						children: V("manage:taskCenter.noMatches")
					}) : null,
					k.length ? /* @__PURE__ */ (0, q.jsx)($, {
						paginate: !1,
						children: j.map(({ run: e, runs: t }) => {
							let n = F(C, t);
							return /* @__PURE__ */ (0, q.jsx)(Z, {
								run: e,
								runs: t,
								latest: M.has(e.id),
								followups: T(t),
								followupTotal: n.total,
								followupFailed: n.failed,
								followupCancelled: n.cancelled
							}, e.id);
						})
					}) : null,
					/* @__PURE__ */ (0, q.jsx)(i, {
						label: V("manage:taskCenter.recentlyCompleted"),
						total: p.finished_total ?? S.length,
						unit: V("manage:taskCenter.footerUnit"),
						pageUnit: V("manage:taskCenter.footerPageUnit"),
						pagination: {
							pageIndex: (p.finished_page || e) - 1,
							pageSize: n
						},
						onChange: (i) => {
							i.pageIndex + 1 === e && i.pageSize === n ? l.refetch() : (t(i.pageIndex + 1), r(i.pageSize));
						}
					})
				]
			}) : null
		] }),
		/* @__PURE__ */ (0, q.jsx)(o, {})
	] });
}
export { lt as ActivityPage };

//# debugId=aebf857f-9f83-4406-858b-daa24ef2c458
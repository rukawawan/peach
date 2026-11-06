(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "c340d080-bcb7-491e-ad8c-d22bae151d9c", e._sentryDebugIdIdentifier = "sentry-dbid-c340d080-bcb7-491e-ad8c-d22bae151d9c");
	} catch {}
})();
import { Button as e, Bx as t, Chip as n, Disclosure as r, DownloadsPanel as i, EmptyState as a, Gg as o, HN as s, IssueRow as c, LinkButton as l, Lo as u, LoadingDots as d, Ma as f, NameLink as p, Note as m, OV as h, Pf as g, Progress as _, RB as v, Rk as y, Su as b, TASKS_KEY as x, TRIGGER_LABELS as S, Xl as C, __toESM as w, apiGet as T, apiSend as E, busyProps as D, cardClass as O, confirmModal as k, controlTask as A, cx as j, elapsedText as M, errorMessage as N, f1 as ee, fetchEarlier as te, fetchTasks as ne, fmtSize as P, foldByKind as re, foldRoutine as ie, followupDetail as F, followupTally as I, groupFollowups as ae, hasResultProblems as L, i2 as R, isActive as z, isRoutine as oe, latestOfKind as se, mergeFinished as B, momentText as V, notifyManager as H, oe as U, pollInterval as ce, problemDestination as W, progressText as le, readableErrorHeadline as ue, replaceEqualDeep as de, require_jsx_runtime as fe, require_react as pe, statusLabel as me, summaryItems as he, taskIssues as ge, taskSubject as _e, um as ve, uo as ye, useMutation as G, useQuery as be, useQueryClient as K, vl as xe } from "./peach-app.js";
import { CodeBlock as Se } from "./peach-app.code-block-CyDva4Ms.js";
import { Page as Ce } from "./peach-app.page-QAncjzM1.js";
import { ErrorDetails as we, ErrorExcerpt as Te } from "./peach-app.error-excerpt-B8v2xEIP.js";
// node_modules/@tanstack/react-query/build/modern/useMutationState.js
var q = /* @__PURE__ */ w(pe(), 1);
function Ee() {
	let e;
	return (t, n) => {
		let r = [], i;
		return () => {
			let a = t.findAll(n.filters), o = a.flatMap((e) => [e, e.state]);
			return (!i || o.length !== r.length || o.some((e, t) => !Object.is(e, r[t]))) && (r = o, i = de(e, a.map((e) => n.select ? n.select(e) : e.state)), e = i), i;
		};
	};
}
function De(e = {}, t) {
	let n = K(t).getMutationCache(), [r] = q.useState(() => Ee()), i = r(n, e);
	return q.useSyncExternalStore(q.useCallback((e) => n.subscribe(H.batchCalls(e)), [n]), i, i);
}
// src/react/activity/background-issues.tsx
var J = fe(), Oe = ["background-issues"];
function ke() {
	let e = (0, q.useId)(), t = be({
		queryKey: Oe,
		queryFn: ({ signal: e }) => T("/api/background-issues", e),
		refetchInterval: 3e4
	}).data?.issues || [];
	return t.length ? /* @__PURE__ */ (0, J.jsxs)("section", {
		"aria-labelledby": e,
		className: "flex min-w-0 flex-col gap-3",
		children: [/* @__PURE__ */ (0, J.jsx)("h3", {
			id: e,
			className: "text-title-2-medium text-text-primary",
			children: "需要处理"
		}), /* @__PURE__ */ (0, J.jsx)("ul", {
			className: "flex min-w-0 flex-col gap-3",
			children: t.map((e) => /* @__PURE__ */ (0, J.jsx)("li", { children: /* @__PURE__ */ (0, J.jsx)(Ae, { issue: e }) }, e.key))
		})]
	}) : null;
}
function Ae({ issue: t }) {
	let n = K(), r = G({
		mutationFn: () => E(t.retry, {}),
		onSuccess: () => {
			n.invalidateQueries({ queryKey: Oe });
		}
	}), i = t.since ? `自 ${V(t.since)} 起` : `发现于 ${V(t.noticed_at)}`;
	return /* @__PURE__ */ (0, J.jsx)(m, {
		tone: "error",
		title: t.title,
		action: /* @__PURE__ */ (0, J.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2",
			children: [/* @__PURE__ */ (0, J.jsx)(l, {
				href: t.href,
				size: "small",
				trailingIcon: R,
				children: t.link_label
			}), t.retry ? /* @__PURE__ */ (0, J.jsx)(e, {
				variant: "secondary",
				size: "small",
				disabled: !t.retry_available,
				...D(r.isPending),
				onClick: () => r.mutate(),
				children: "立即重试"
			}) : null]
		}),
		children: r.error ? `${i}\n没有重试：${N(r.error)}` : i
	});
}
// src/react/activity/task-controls.tsx
var Y = ["task-control"], je = {
	pause: h,
	resume: o,
	cancel: s
}, Me = {
	pause: "暂停",
	resume: "继续",
	cancel: "取消"
}, Ne = {
	pause: "暂停后续任务",
	resume: "继续后续任务",
	cancel: "取消后续任务"
};
function Pe() {
	let e = De({
		filters: { mutationKey: Y },
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
	return n.length ? /* @__PURE__ */ (0, J.jsx)("div", {
		"data-task-control-feedback": "",
		className: "flex min-w-0 flex-col gap-2",
		children: n.map(({ command: e, error: t }) => /* @__PURE__ */ (0, J.jsx)(m, {
			tone: "error",
			title: `${e.label}：${(e.followups ? Ne : Me)[e.action]}未完成`,
			children: N(t)
		}, e.id))
	}) : null;
}
function Fe({ run: t, runs: n = [t] }) {
	let r = K(), i = (0, q.useRef)({
		change: !1,
		cancel: !1,
		confirmation: !1
	}), a = () => {
		r.invalidateQueries({ queryKey: x });
	}, o = async (e) => {
		let t = null;
		for (let r of n) try {
			await A(r.id, e.action);
		} catch (e) {
			t ??= e;
		}
		if (t !== null) throw t;
	}, s = n.length > 1 ? `这 ${n.length} 批` : "这轮", c = G({
		mutationKey: [
			...Y,
			t.id,
			"change"
		],
		mutationFn: o,
		onSettled: () => {
			i.current.change = !1, a();
		}
	}), l = G({
		mutationKey: [
			...Y,
			t.id,
			"cancel"
		],
		mutationFn: o,
		onSettled: () => {
			i.current.cancel = !1, a();
		}
	}), u = t.control?.actions || [], d = !z(t), f = l.isPending || l.isSuccess;
	if (!u.length) return null;
	let p = (e) => {
		let n = {
			id: t.id,
			label: t.task_label,
			action: e,
			followups: d
		};
		if (e === "cancel") {
			if (i.current.cancel || i.current.confirmation || l.isSuccess) return;
			i.current.confirmation = !0, k({
				title: d ? `取消「${t.task_label}」的全部后续任务` : `取消任务「${t.task_label}」`,
				body: d ? `将停止${s}已派出的全部后续任务，包括正在处理和排队的项目。已保存的资料和结果会保留。这些后续任务取消后不能继续，需要时重新发起。` : "将停止这轮剩余的处理及其后续任务。已保存的资料和结果会保留。这轮任务取消后不能继续，需要时重新发起。",
				confirmLabel: d ? "取消后续任务" : "取消任务",
				danger: !0,
				onConfirm: async () => (i.current.cancel = !0, await l.mutateAsync(n))
			}).finally(() => {
				i.current.confirmation = !1;
			});
		} else {
			if (i.current.change || i.current.cancel || f) return;
			i.current.change = !0, c.mutate(n);
		}
	};
	return /* @__PURE__ */ (0, J.jsx)("div", {
		className: "ml-auto shrink-0",
		"data-task-controls": t.id,
		children: /* @__PURE__ */ (0, J.jsx)("div", {
			role: "group",
			"aria-label": `${t.task_label}${d ? "后续任务" : "任务"}控制`,
			className: "flex items-center justify-end gap-2",
			children: u.map((t) => {
				let n = (d ? Ne : Me)[t], r = t === "cancel" ? l.isPending : c.isPending && c.variables?.action === t, i = t === "cancel" ? f : c.isPending || f;
				return /* @__PURE__ */ (0, J.jsx)(e, {
					type: "button",
					variant: "secondary",
					size: "small",
					iconOnly: !0,
					leadingIcon: je[t],
					"aria-label": n,
					title: n,
					...D(r),
					"aria-disabled": i || void 0,
					onClick: () => p(t),
					"data-tooltip-copy-key": `tasks.control.action.${d ? "followups." : ""}${t}`
				}, t);
			})
		})
	});
}
// src/react/activity/task-icon.tsx
var Ie = new Map([
	[t, [
		"follow-check",
		"follow-resolve",
		"follow-creator",
		"feed-check",
		"feed-scrape",
		"feed-cover"
	]],
	[y, [
		"library-processing",
		"organize",
		"batch",
		"resource-scan",
		"resource-apply",
		"seed-import"
	]],
	[xe, [
		"scrape-codes",
		"jav-discovery-metadata",
		"want-scrape",
		"upgrade-library"
	]],
	[f, [
		"scraping-cover",
		"jav-covers",
		"code-samples",
		"timeline-thumbnails",
		"entity-avatar"
	]],
	[g, [
		"performer-profile",
		"performer-alias",
		"creator-identity",
		"studio-mark"
	]],
	[C, ["media-repair", "mp4-header-repair"]],
	[ve, [
		"link-check",
		"link-prune",
		"source-check"
	]],
	[U, ["download-postprocess"]],
	[u, ["taste-refresh"]],
	[v, [
		"upgrade-repairs",
		"diagnostic-export",
		"amane-bridge",
		"face-models",
		"ledger-backup",
		"ledger-restore"
	]]
].flatMap(([e, t]) => t.map((t) => [t, e])));
function Le({ taskKey: e, className: t }) {
	let n = Ie.get(e) ?? b;
	return /* @__PURE__ */ (0, J.jsx)(n, {
		className: t,
		"aria-hidden": !0
	});
}
// src/react/activity/resource-chip.tsx
var Re = {
	blue: "bg-status-blue-text text-background-primary-default",
	purple: "bg-status-purple-text text-background-primary-default",
	cyan: "bg-status-cyan-text text-background-primary-default"
};
function ze({ color: e, high: t, ...r }) {
	return t ? /* @__PURE__ */ (0, J.jsx)("span", {
		...r,
		className: j("inline-flex items-center justify-center rounded-md px-1.5 py-1 whitespace-nowrap text-caption-1-medium", Re[e])
	}) : /* @__PURE__ */ (0, J.jsx)(n, {
		variant: "caption",
		color: e,
		...r
	});
}
// src/react/activity/task-resources.tsx
var Be = {
	cpu: {
		name: "CPU",
		color: "blue",
		description: "CPU 使用率以执行端可用容量为 100%，容器按可见 CPU 配额计算。达到 50% 时加深显示。"
	},
	gpu: {
		name: "GPU",
		color: "purple",
		description: "GPU 使用率显示该任务最忙的 GPU 引擎。达到 50% 时加深显示。"
	},
	network: {
		name: "网络",
		color: "cyan",
		description: "网络速率显示该任务已观测的下载速度，达到 10 MiB/s 时加深显示。从网盘挂载读取时显示网盘读取，SMB 或无法准确归属的传输显示未取得。"
	}
};
function Ve(e) {
	return e.state === "sampling" ? "采样中" : e.via === "cloud" ? "网盘读取" : "未取得";
}
function He(e, t) {
	return t === 0 ? "未使用" : e === "network" ? `${P(t)}/s` : `${t.toLocaleString(void 0, { maximumFractionDigits: 1 })}%`;
}
function Ue({ run: e, active: t = z(e) || !!e.control }) {
	if (!t || !e.resources) return null;
	let n = e.resources;
	return /* @__PURE__ */ (0, J.jsx)("div", {
		"data-task-resources": e.id,
		className: "flex min-w-0 flex-wrap items-center gap-2",
		children: [
			"cpu",
			"gpu",
			"network"
		].map((e) => {
			let t = n[e], r = Be[e], i = e === "network" ? n.network.bytes_per_second : n[e].percent, a = t.state === "ready" && i !== null, o = a && t.high, s = a ? He(e, i) : Ve(t), c = [
				t.reason,
				o ? "当前为高占用。" : "",
				r.description,
				n.detail
			].filter(Boolean).join("\n");
			return /* @__PURE__ */ (0, J.jsxs)(ze, {
				color: r.color,
				high: o,
				tabIndex: 0,
				title: c,
				"data-task-resource": e,
				"data-resource-state": t.state,
				"data-resource-via": t.via,
				"data-resource-high": o || void 0,
				"data-resource-idle": a && i === 0 || void 0,
				"data-copy-ignore": "",
				"data-tooltip-copy-key": !t.reason && !n.detail && !o ? `tasks.resources.${e}.description` : void 0,
				children: [
					r.name,
					" ",
					s
				]
			}, e);
		})
	});
}
// src/react/activity/activity-page.tsx
var We = 50, Ge = /* @__PURE__ */ new Set(["upgrade-repairs"]), Ke = /* @__PURE__ */ new Set(["asset_id", "name"]), qe = {
	succeeded: "lime",
	failed: "rose",
	cancelled: "rose",
	interrupted: "yellow",
	running: "blue",
	pending: "neutral"
}, Je = {
	running: "进行中",
	pausing: "正在暂停",
	paused: "已暂停",
	cancelling: "正在取消"
};
function X({ run: e }) {
	let t = e.control?.state;
	if (t && (t !== "running" || !z(e))) return /* @__PURE__ */ (0, J.jsx)(n, {
		color: t === "running" ? "blue" : "neutral",
		children: /* @__PURE__ */ (0, J.jsx)("span", {
			"data-copy-key": `tasks.control.state.${t}`,
			children: Je[t]
		})
	});
	let r = e.status === "failed" && e.task_key === "library-processing" && e.result_summary?.outcome === "partial", i = r || e.status === "succeeded" && L(e);
	return /* @__PURE__ */ (0, J.jsx)(n, {
		color: i ? "yellow" : qe[e.status] ?? "neutral",
		children: r ? "部分项目需处理" : i ? "发现问题" : me(e.status)
	});
}
function Ye({ rows: e }) {
	return /* @__PURE__ */ (0, J.jsx)("ul", {
		className: "-mr-5 flex min-w-0 flex-col",
		children: e.map((e) => {
			let t = F(e);
			return /* @__PURE__ */ (0, J.jsxs)("li", {
				"data-status": e.status,
				"data-followup-key": e.followup_key,
				className: "flex min-w-0 flex-col gap-1 border-t border-separator-border py-2.5 pr-10 pl-5",
				children: [
					/* @__PURE__ */ (0, J.jsxs)("div", {
						className: "flex min-w-0 items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, J.jsxs)("div", {
							className: "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1",
							children: [
								/* @__PURE__ */ (0, J.jsx)(Le, {
									taskKey: e.task_key,
									className: "size-4 shrink-0 text-text-secondary"
								}),
								/* @__PURE__ */ (0, J.jsx)("span", {
									className: "min-w-0 break-words text-caption-1-regular text-text-primary",
									children: e.task_label
								}),
								/* @__PURE__ */ (0, J.jsx)(X, { run: e }),
								t ? /* @__PURE__ */ (0, J.jsx)("span", {
									className: "min-w-0 break-words text-caption-1-regular text-text-secondary",
									children: t
								}) : null
							]
						}), /* @__PURE__ */ (0, J.jsx)(Fe, { run: e })]
					}),
					/* @__PURE__ */ (0, J.jsx)(Ue, { run: e }),
					Object.keys(e.result_summary || {}).length ? /* @__PURE__ */ (0, J.jsx)("div", {
						className: "w-full min-w-0",
						children: /* @__PURE__ */ (0, J.jsx)(r, {
							summary: "技术详情",
							contentClassName: "pb-2.5",
							children: /* @__PURE__ */ (0, J.jsx)(Se, {
								code: JSON.stringify(e.result_summary, null, 2),
								language: "json",
								label: `${e.task_label}技术详情`
							})
						})
					}) : null
				]
			}, e.id);
		})
	});
}
function Z({ run: e, meta: t, children: n, error: i, issues: a, followups: o, followupTotal: s = 0, badge: c, resourceActive: l, controlled: u }) {
	let d = (e) => e.status === "running" ? 3 : e.status === "pending" ? 2 : +(e.status === "failed" || e.status === "interrupted"), f = o ? [...o].sort((e, t) => d(t) - d(e) || t.id - e.id).slice(0, We) : [], m = f.length, h = Math.max(o?.length || 0, s), g = _e(e), _ = String(i || "").trim(), v = ue(_);
	return /* @__PURE__ */ (0, J.jsxs)("li", {
		id: `run-${e.id}`,
		"data-status": e.status,
		"data-task-key": e.task_key,
		"data-run-id": e.id,
		className: O({
			padding: "none",
			bordered: e.status === "failed" ? "error" : void 0,
			className: "flex flex-col"
		}),
		children: [
			/* @__PURE__ */ (0, J.jsxs)("div", {
				className: "flex flex-col gap-2 px-5 py-4",
				children: [
					/* @__PURE__ */ (0, J.jsxs)("div", {
						className: "flex min-w-0 items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, J.jsxs)("div", {
							className: "flex min-w-0 flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, J.jsx)(Le, {
									taskKey: e.task_key,
									className: "size-5 shrink-0 text-text-secondary"
								}),
								/* @__PURE__ */ (0, J.jsx)("strong", {
									className: "min-w-0 break-words text-title-3-medium text-text-primary",
									children: e.task_label
								}),
								c ?? /* @__PURE__ */ (0, J.jsx)(X, { run: e })
							]
						}), /* @__PURE__ */ (0, J.jsx)(Fe, {
							run: e,
							runs: u
						})]
					}),
					/* @__PURE__ */ (0, J.jsx)("p", {
						className: "text-caption-1-regular text-text-secondary",
						children: t
					}),
					/* @__PURE__ */ (0, J.jsx)(Ue, {
						run: e,
						active: l
					}),
					g ? /* @__PURE__ */ (0, J.jsx)(p, {
						href: g.href,
						"data-task-subject": e.id,
						title: g.label,
						className: "min-w-0 max-w-full self-start truncate text-text-primary",
						children: g.label
					}) : null,
					v ? /* @__PURE__ */ (0, J.jsx)("p", {
						"data-task-error": "",
						className: "text-caption-1-regular text-text-secondary wrap-anywhere",
						children: v
					}) : null,
					n
				]
			}),
			a ? /* @__PURE__ */ (0, J.jsx)("div", {
				className: "border-t border-separator-border px-5 py-2.5",
				children: a
			}) : null,
			v && _ !== v ? /* @__PURE__ */ (0, J.jsx)("div", {
				className: "border-t border-separator-border px-5 py-2.5",
				children: /* @__PURE__ */ (0, J.jsx)(r, {
					summary: "错误详情",
					contentClassName: "pb-2.5",
					children: /* @__PURE__ */ (0, J.jsx)(we, {
						label: `${e.task_label}错误详情`,
						children: _
					})
				})
			}) : null,
			m ? /* @__PURE__ */ (0, J.jsx)("div", {
				className: "border-t border-separator-border px-5 py-2.5",
				children: /* @__PURE__ */ (0, J.jsxs)(r, {
					summary: `任务明细 · ${h.toLocaleString()} 项`,
					contentClassName: "pb-2.5",
					defaultOpen: f.some((e) => z(e)),
					children: [m < h ? /* @__PURE__ */ (0, J.jsxs)("p", {
						className: "text-caption-1-regular text-text-secondary",
						children: [
							"列出其中 ",
							m.toLocaleString(),
							" 项，正在处理的排在前面"
						]
					}) : null, /* @__PURE__ */ (0, J.jsx)(Ye, { rows: f })]
				})
			}) : null,
			Object.keys(e.result_summary || {}).some((e) => !(g && Ke.has(e))) ? /* @__PURE__ */ (0, J.jsx)("div", {
				className: "border-t border-separator-border px-5 py-2.5",
				children: /* @__PURE__ */ (0, J.jsx)(r, {
					summary: "技术详情",
					contentClassName: "pb-2.5",
					children: /* @__PURE__ */ (0, J.jsx)(Se, {
						code: JSON.stringify(e.result_summary, null, 2),
						language: "json",
						label: `${e.task_label}技术详情`
					})
				})
			}) : null
		]
	});
}
function Xe({ run: e, followups: t }) {
	let n = e.progress_total || 0, r = e.progress_current || 0, i = e.control?.state, a = i && i !== "running", o = a ? Je[i] : e.progress_label || "正在进行", s = M(e.elapsed_seconds), c = [S[e.trigger] || e.trigger, s && `已跑 ${s}`].filter(Boolean).join(" · ");
	return /* @__PURE__ */ (0, J.jsx)(Z, {
		run: e,
		meta: c,
		followups: t,
		children: n > 0 ? /* @__PURE__ */ (0, J.jsxs)("div", {
			className: "flex flex-col gap-1.5",
			children: [/* @__PURE__ */ (0, J.jsx)(_, {
				label: o,
				value: Math.min(r, n),
				max: n
			}), /* @__PURE__ */ (0, J.jsxs)("p", {
				className: "text-caption-1-regular text-text-secondary wrap-anywhere",
				children: [
					o,
					" · ",
					le(r, n),
					" 项"
				]
			})]
		}) : a ? /* @__PURE__ */ (0, J.jsx)("p", {
			"data-copy-key": `tasks.control.state.${i}`,
			className: "text-caption-1-regular text-text-secondary",
			children: o
		}) : /* @__PURE__ */ (0, J.jsx)(d, { label: o })
	});
}
function Ze({ run: e, followups: t, runs: i, latest: a, followupTotal: o, followupFailed: s = 0, followupCancelled: u = 0 }) {
	let d = !!(i && i.length > 1 && o), f = d ? [`共处理 ${o.toLocaleString()} 项`, s ? `其中 ${s.toLocaleString()} 项失败` : ""].filter(Boolean) : he(_e(e) ? {
		...e.result_summary,
		name: ""
	} : e.result_summary).filter((t) => t !== e.error && t !== ue(e.error)), p = ge(e), m = W(e, a), h = M(e.elapsed_seconds), g = i && i.length > 1 ? i[i.length - 1] : void 0, _ = (g ? [
		S[e.trigger] || e.trigger,
		`近 ${i.length} 轮`,
		`${V(g.finished_at)} – ${V(e.finished_at)}`
	] : [
		S[e.trigger] || e.trigger,
		V(e.finished_at),
		h && `用时 ${h}`
	]).filter(Boolean).join(" · ");
	return /* @__PURE__ */ (0, J.jsxs)(Z, {
		run: e,
		meta: _,
		error: e.error,
		followups: t,
		followupTotal: o,
		issues: p.length ? /* @__PURE__ */ (0, J.jsx)(r, {
			summary: `问题详情 · ${p.length} 项`,
			contentClassName: "pb-2.5",
			children: /* @__PURE__ */ (0, J.jsx)(we, {
				label: "任务问题详情",
				children: /* @__PURE__ */ (0, J.jsx)("ul", {
					className: "flex min-w-0 flex-col whitespace-normal",
					"data-task-issues": "",
					children: p.map((e, t) => /* @__PURE__ */ (0, J.jsx)(c, {
						title: /* @__PURE__ */ (0, J.jsxs)(J.Fragment, { children: [e.label, e.provider || e.kind ? /* @__PURE__ */ (0, J.jsxs)("span", {
							className: "text-body-2-regular text-text-secondary",
							children: [" · ", [e.provider, e.kind].filter(Boolean).join(" · ")]
						}) : null] }),
						children: /* @__PURE__ */ (0, J.jsx)(Te, {
							text: e.error,
							className: "text-caption-1-regular text-text-secondary"
						})
					}, `${e.source}-${t}`))
				})
			})
		}) : void 0,
		badge: u && e.status === "succeeded" ? /* @__PURE__ */ (0, J.jsx)(n, {
			color: "rose",
			children: /* @__PURE__ */ (0, J.jsx)("span", {
				"data-copy-key": `tasks.followups.cancelled.${u === o ? "all" : "partial"}`,
				children: u === o ? "后续任务已取消" : "部分后续任务已取消"
			})
		}) : d && s ? /* @__PURE__ */ (0, J.jsx)(n, {
			color: "yellow",
			children: "发现问题"
		}) : void 0,
		children: [
			u ? /* @__PURE__ */ (0, J.jsxs)("p", {
				className: "text-caption-1-regular text-text-secondary",
				children: [
					"后续任务已取消 ",
					u.toLocaleString(),
					" 项"
				]
			}) : null,
			f.length === 1 ? /* @__PURE__ */ (0, J.jsx)("p", {
				className: "text-caption-1-regular text-text-secondary wrap-anywhere",
				children: f[0]
			}) : f.length ? /* @__PURE__ */ (0, J.jsx)("ul", {
				className: "flex list-disc flex-col gap-1 pl-5 text-caption-1-regular text-text-secondary wrap-anywhere",
				children: f.map((e, t) => /* @__PURE__ */ (0, J.jsx)("li", { children: e }, t))
			}) : null,
			!p.length && L(e) && ["follow-check", "feed-check"].includes(e.task_key) ? /* @__PURE__ */ (0, J.jsx)("p", {
				className: "text-body-2-regular text-text-secondary",
				children: "未取得本轮逐项详情，可到来源列表查看检查结果。"
			}) : null,
			m ? /* @__PURE__ */ (0, J.jsx)(l, {
				href: m.href,
				size: "small",
				trailingIcon: R,
				className: "self-start",
				children: m.label
			}) : null
		]
	});
}
function Qe({ runs: e, followups: t, counts: r }) {
	let i = e[0], a = e[e.length - 1], o = I(r, e), s = Math.max(o.total, t.length), c = o.total ? o.settled : t.filter((e) => !z(e)).length, l = o.total ? o.failed : t.filter((e) => e.status === "failed" || e.status === "interrupted").length, u = [
		S[i.trigger] || i.trigger,
		e.length > 1 ? `${e.length} 批` : "",
		`${V(a.started_at || a.finished_at)} 开始`
	].filter(Boolean).join(" · ");
	return /* @__PURE__ */ (0, J.jsx)(Z, {
		run: i,
		meta: u,
		followups: t,
		followupTotal: s,
		resourceActive: !0,
		controlled: e,
		badge: i.control ? /* @__PURE__ */ (0, J.jsx)(X, { run: i }) : /* @__PURE__ */ (0, J.jsx)(n, {
			color: "blue",
			children: "进行中"
		}),
		children: /* @__PURE__ */ (0, J.jsxs)("div", {
			className: "flex flex-col gap-1.5",
			children: [/* @__PURE__ */ (0, J.jsx)(_, {
				label: `${i.task_label}进度`,
				value: c,
				max: s
			}), /* @__PURE__ */ (0, J.jsxs)("p", {
				className: "text-caption-1-regular text-text-secondary",
				children: [
					"已处理 ",
					le(c, s),
					" 项",
					l ? ` · 其中 ${l.toLocaleString()} 项失败` : ""
				]
			})]
		})
	});
}
function Q({ title: e, children: t }) {
	let n = (0, q.useId)();
	return /* @__PURE__ */ (0, J.jsxs)("section", {
		"aria-labelledby": n,
		className: "flex min-w-0 flex-col gap-3",
		children: [/* @__PURE__ */ (0, J.jsx)("h3", {
			id: n,
			className: "text-title-2-medium text-text-primary",
			children: e
		}), t]
	});
}
function $({ live: e = !1, children: t }) {
	return /* @__PURE__ */ (0, J.jsx)("ul", {
		"aria-live": e ? "polite" : void 0,
		className: "flex min-w-0 flex-col gap-3",
		children: t
	});
}
function $e() {
	let t = be({
		queryKey: x,
		queryFn: ({ signal: e }) => ne(e),
		refetchInterval: (e) => ce(e.state.data)
	}), n = t.data, r = n?.finished, [o, s] = (0, q.useState)([]), [c, l] = (0, q.useState)(!1), [u, d] = (0, q.useState)({}), [f, p] = (0, q.useState)(r);
	r !== f && (p(r), o.length && f && s(B(o, f)));
	let h = G({
		mutationFn: ({ oldest: e }) => te(e),
		onSuccess: (e, { shown: t }) => {
			s((n) => B(n, t, e.finished || [])), l(!!e.finished_has_more), d((t) => ({
				...t,
				...e.followup_counts
			}));
		}
	}), g = t.error ? N(t.error) : "";
	if (!n) return /* @__PURE__ */ (0, J.jsx)(Ce, { children: /* @__PURE__ */ (0, J.jsx)(m, {
		tone: "error",
		children: g || "读取任务中心失败"
	}) });
	let _ = B(n.finished || [], o), v = n.working_parents || [], y = [
		...n.running || [],
		...n.skipped || [],
		..._,
		...v
	], b = ae(y), S = new Set(y.map((e) => e.id)), C = (e) => e.filter((e) => !(e.followup_key && e.parent_run_id != null && S.has(e.parent_run_id))), w = C(_), T = w[w.length - 1], E = !!T && (o.length ? c : !!n.finished_has_more), O = () => {
		!h.isPending && T && h.mutate({
			oldest: T,
			shown: _
		});
	}, k = {
		...u,
		...n.followup_counts
	}, A = (e) => e.flatMap((e) => b.get(e.id) || []), j = [...w, ...C(v)].filter((e) => I(k, [e]).active > 0 || b.get(e.id)?.some(z)).sort((e, t) => t.id - e.id), M = C(n.running || []), P = C(n.skipped || []), F = w.filter((e) => !j.includes(e) && !P.some((t) => t.id === e.id)), R = (e) => (b.get(e.id) || []).every((e) => e.status === "succeeded" && !L(e)) && I(k, [e]).failed === 0, V = ie(F, (e) => oe(e) && (R(e) || Ge.has(e.task_key))), H = re(j, (e) => e.control?.state || "").sort((e, t) => t.run.id - e.run.id), U = se(y), W = !M.length && !j.length && !P.length && !F.length;
	return /* @__PURE__ */ (0, J.jsxs)(Ce, { children: [
		g ? /* @__PURE__ */ (0, J.jsx)(m, {
			tone: "error",
			children: g
		}) : null,
		/* @__PURE__ */ (0, J.jsx)(Pe, {}),
		n.available === !1 ? /* @__PURE__ */ (0, J.jsx)(m, {
			tone: "warning",
			children: n.message || "数据库尚未准备好任务记录表"
		}) : null,
		/* @__PURE__ */ (0, J.jsx)(ke, {}),
		W ? /* @__PURE__ */ (0, J.jsx)(a, {
			icon: ye,
			title: "还没有任务记录",
			children: "扫描、追更检查、批量操作和命令行批处理跑起来之后，这里会显示它们的进度与结果。"
		}) : /* @__PURE__ */ (0, J.jsxs)(J.Fragment, { children: [
			/* @__PURE__ */ (0, J.jsx)(Q, {
				title: "正在进行",
				children: M.length || j.length ? /* @__PURE__ */ (0, J.jsxs)($, {
					live: !0,
					children: [M.map((e) => /* @__PURE__ */ (0, J.jsx)(Xe, {
						run: e,
						followups: b.get(e.id)
					}, e.id)), H.map(({ run: e, runs: t }) => /* @__PURE__ */ (0, J.jsx)(Qe, {
						runs: t,
						followups: A(t),
						counts: k
					}, e.id))]
				}) : /* @__PURE__ */ (0, J.jsx)(m, {
					tone: "neutral",
					children: "没有任务在跑。"
				})
			}),
			P.length ? /* @__PURE__ */ (0, J.jsx)(Q, {
				title: "本次未执行",
				children: /* @__PURE__ */ (0, J.jsx)($, { children: P.map((e) => /* @__PURE__ */ (0, J.jsx)(Ze, {
					run: e,
					latest: U.has(e.id),
					followups: b.get(e.id)
				}, e.id)) })
			}) : null,
			F.length || E ? /* @__PURE__ */ (0, J.jsxs)(Q, {
				title: "最近完成",
				children: [
					F.length ? /* @__PURE__ */ (0, J.jsx)($, { children: V.map(({ run: e, runs: t }) => {
						let n = I(k, t);
						return /* @__PURE__ */ (0, J.jsx)(Ze, {
							run: e,
							runs: t,
							latest: U.has(e.id),
							followups: A(t),
							followupTotal: n.total,
							followupFailed: n.failed,
							followupCancelled: n.cancelled
						}, e.id);
					}) }) : null,
					h.error ? /* @__PURE__ */ (0, J.jsx)(m, {
						tone: "error",
						children: N(h.error)
					}) : null,
					E ? /* @__PURE__ */ (0, J.jsx)(e, {
						variant: "secondary",
						size: "small",
						leadingIcon: ee,
						className: "self-start",
						...D(h.isPending),
						onClick: O,
						children: "加载更早"
					}) : null
				]
			}) : null
		] }),
		/* @__PURE__ */ (0, J.jsx)(i, {})
	] });
}
export { $e as ActivityPage };

//# debugId=c340d080-bcb7-491e-ad8c-d22bae151d9c
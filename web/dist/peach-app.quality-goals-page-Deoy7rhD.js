(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "9c50bc5f-e0a2-484d-8a35-9e958c3ba539", e._sentryDebugIdIdentifier = "sentry-dbid-9c50bc5f-e0a2-484d-8a35-9e958c3ba539");
	} catch {}
})();
import { Button as e, CloudDownloadDialog as t, CollectionSummary as n, EmptyState as r, LOC as i, Note as a, OA as o, QUALITY_GOALS_KEY as s, __toESM as c, cardClass as l, errorMessage as u, fetchQualityGoals as d, fmtDur as f, fmtSize as p, previewUrl as m, require_jsx_runtime as h, require_react as g, useQuery as _ } from "./peach-app.js";
import { Page as v } from "./peach-app.page-QAncjzM1.js";
// src/react/quality-goals/quality-goals-page.tsx
var y = /* @__PURE__ */ c(g(), 1), b = h();
function x({ item: t, openItem: n, searchResources: r, javTitleHtml: a, javDisplayName: o, srcBadge: s }) {
	let c = () => n(t.id);
	return /* @__PURE__ */ (0, b.jsxs)("li", {
		"data-goal-id": t.id,
		className: l({
			padding: "none",
			className: "flex flex-col gap-3 p-3"
		}),
		children: [/* @__PURE__ */ (0, b.jsxs)("div", {
			className: "flex min-w-0 gap-4",
			children: [/* @__PURE__ */ (0, b.jsxs)("button", {
				type: "button",
				onClick: c,
				"aria-label": `打开 ${o(t)}`,
				className: "relative inline-grid w-card-cover shrink-0 self-start aspect-card-cover cursor-pointer place-items-center overflow-hidden rounded-2lg bg-background-tertiary-default",
				children: [/* @__PURE__ */ (0, b.jsx)("span", {
					className: "text-caption-1-regular text-text-secondary",
					children: "暂无预览"
				}), /* @__PURE__ */ (0, b.jsx)("img", {
					src: m(t),
					alt: "",
					loading: "lazy",
					onError: (e) => e.currentTarget.remove(),
					className: "absolute inset-0 size-full object-contain"
				})]
			}), /* @__PURE__ */ (0, b.jsxs)("div", {
				className: "flex min-w-0 flex-col gap-1.5",
				children: [
					/* @__PURE__ */ (0, b.jsx)("h3", {
						className: "text-headline-medium text-text-primary",
						children: /* @__PURE__ */ (0, b.jsx)("button", {
							type: "button",
							onClick: c,
							title: o(t),
							className: "line-clamp-2 w-full cursor-pointer text-left wrap-anywhere",
							dangerouslySetInnerHTML: { __html: a(t) }
						})
					}),
					/* @__PURE__ */ (0, b.jsxs)("p", {
						className: "flex flex-wrap items-center gap-2 text-body-2-regular text-text-secondary",
						children: [
							/* @__PURE__ */ (0, b.jsx)("span", {
								className: "contents",
								dangerouslySetInnerHTML: { __html: s(t.location, t.cost) }
							}),
							/* @__PURE__ */ (0, b.jsx)("span", { children: i[t.location] ?? t.location }),
							/* @__PURE__ */ (0, b.jsx)("span", { children: f(t.duration) }),
							/* @__PURE__ */ (0, b.jsx)("span", { children: Number(t.size) > 0 ? p(Number(t.size)) : "大小未知" })
						]
					}),
					t.reason ? /* @__PURE__ */ (0, b.jsx)("p", {
						className: "border-t border-separator-border pt-3 text-body-2-regular text-text-secondary wrap-anywhere",
						children: t.reason
					}) : null
				]
			})]
		}), /* @__PURE__ */ (0, b.jsxs)("footer", {
			className: "flex flex-wrap justify-end gap-2",
			children: [t.code ? /* @__PURE__ */ (0, b.jsx)(e, {
				variant: "secondary",
				size: "small",
				onClick: () => r({
					code: t.code,
					title: o(t),
					origin: `asset:${t.id}`,
					searchReason: t.reason || "",
					duration: t.duration,
					cover: m(t)
				}),
				children: "查找资源"
			}) : null, /* @__PURE__ */ (0, b.jsx)(e, {
				variant: "secondary",
				size: "small",
				onClick: c,
				children: "查看版本"
			})]
		})]
	});
}
function S({ toast: e, ...i }) {
	let [c, l] = (0, y.useState)(null), f = _({
		queryKey: s,
		queryFn: ({ signal: e }) => d(e)
	}), p = f.data;
	if (!p) return /* @__PURE__ */ (0, b.jsx)(v, { children: /* @__PURE__ */ (0, b.jsx)(a, {
		tone: "error",
		title: "高清版目标读取失败",
		children: f.error ? u(f.error) : "未取得高清版目标，请刷新页面重试。"
	}) });
	let m = p.items || [];
	return m.length ? /* @__PURE__ */ (0, b.jsxs)(v, { children: [
		/* @__PURE__ */ (0, b.jsx)(n, {
			label: "待升级",
			figure: `${Number(p.total || 0).toLocaleString()} 部作品`,
			flush: !0
		}),
		/* @__PURE__ */ (0, b.jsx)("ul", {
			className: "card-grid-cover gap-5",
			children: m.map((e) => /* @__PURE__ */ (0, b.jsx)(x, {
				item: e,
				...i,
				searchResources: l
			}, e.id))
		}),
		Number(p.total || 0) > m.length ? /* @__PURE__ */ (0, b.jsx)("p", {
			className: "mt-6 text-center text-caption-1-regular text-text-secondary",
			children: `显示前 ${m.length.toLocaleString()} 部，共 ${Number(p.total).toLocaleString()} 部。`
		}) : null,
		/* @__PURE__ */ (0, b.jsx)(t, {
			prefill: c,
			close: () => l(null),
			receipt: e
		})
	] }) : /* @__PURE__ */ (0, b.jsx)(v, { children: /* @__PURE__ */ (0, b.jsx)(r, {
		icon: o,
		title: "没有标记中的高清版目标",
		children: "现有版本都已满足条件，或还没有加入追踪。"
	}) });
}
export { S as QualityGoalsPage };

//# debugId=9c50bc5f-e0a2-484d-8a35-9e958c3ba539
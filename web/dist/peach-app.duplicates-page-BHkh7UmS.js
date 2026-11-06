(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "29f77252-37e1-43ad-aebd-9097d9469dab", e._sentryDebugIdIdentifier = "sentry-dbid-29f77252-37e1-43ad-aebd-9097d9469dab");
	} catch {}
})();
import { Button as e, CollectionSummary as t, DUPLICATES_KEY as n, EmptyState as r, FilterGlass as i, GlassPill as a, KEEP_LABELS as o, LOC as s, MEDIA_SOURCES_KEY as c, MEDIA_SOURCE_ICONS as l, Note as u, SourceLabel as d, SourceMark as f, TRASH_KEY as p, __toESM as m, batchOperate as h, bulkCloudPreferences as g, busyProps as _, cardClass as v, cloudLocations as y, confirmModal as b, distinctName as x, duplicateVictims as S, errorMessage as C, fetchDuplicates as w, fetchMediaSources as T, fmtDur as E, fmtSize as D, keepGroup as O, mixedCloudPreferences as k, queryClient as A, require_jsx_runtime as j, require_react as M, sharedNamePrefix as N, spriteGlyph as P, useMutation as F, useQuery as I, victimBytes as L } from "./peach-app.js";
// src/react/duplicates/duplicates-page.tsx
var R = /* @__PURE__ */ m(M(), 1), z = j(), B = P("play"), V = P("file-stack"), H = v({
	padding: "none",
	radius: "surface",
	className: "mb-6 overflow-hidden dark:bg-background-primary-default"
}), U = "rounded-sm px-1.5 py-px text-caption-1-regular leading-5", W = "rounded-sm px-2 py-0.5 text-caption-1-regular leading-5", G = "font-mono text-caption-1-regular leading-5 text-text-secondary", K = () => {
	A.invalidateQueries({
		queryKey: n,
		exact: !0
	}), A.invalidateQueries({
		queryKey: p,
		exact: !0
	});
};
function q(e) {
	return e.identical ? /* @__PURE__ */ (0, z.jsx)("span", {
		className: `${W} text-(--keep)`,
		children: "sha1 一致"
	}) : /* @__PURE__ */ (0, z.jsx)("span", {
		className: `${W} text-text-secondary`,
		children: e.evidence === "same_code_short_copy" ? "同番号短版本" : "时长推断"
	});
}
function J({ file: e, prefix: t, openItem: n }) {
	let r = () => n(e.id), i = s[e.location] || e.location || e.drive;
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "duplicate-row items-center gap-3 border-t border-separator-border px-5 py-4 max-compact:p-4",
		children: [
			/* @__PURE__ */ (0, z.jsxs)("button", {
				type: "button",
				onClick: r,
				"aria-label": `预览 ${e.name}`,
				className: "relative row-span-2 inline-grid aspect-16/10 w-full cursor-pointer place-items-center overflow-hidden rounded-2lg bg-background-tertiary-default text-text-secondary",
				children: [/* @__PURE__ */ (0, z.jsx)(B, {
					"aria-hidden": !0,
					className: "size-6"
				}), /* @__PURE__ */ (0, z.jsx)("img", {
					src: `/thumb?id=${e.id}&c=4`,
					alt: "",
					loading: "lazy",
					onError: (e) => e.currentTarget.remove(),
					className: "absolute inset-0 size-full object-contain"
				})]
			}),
			/* @__PURE__ */ (0, z.jsxs)("span", {
				className: "flex min-w-0 items-center gap-2 max-duplicate-narrow:col-start-2 max-duplicate-narrow:-col-end-1",
				children: [/* @__PURE__ */ (0, z.jsx)("button", {
					type: "button",
					onClick: r,
					title: e.name,
					"data-middle-truncate": !0,
					"data-middle-truncate-within": !0,
					className: "min-w-0 shrink cursor-pointer truncate text-left text-body-regular hover:text-text-secondary",
					children: x(e.name, t)
				}), e.is_largest || e.is_longest ? /* @__PURE__ */ (0, z.jsxs)("span", {
					className: "flex flex-none gap-1",
					children: [e.is_largest ? /* @__PURE__ */ (0, z.jsx)("i", {
						className: `${U} not-italic bg-background-primary-hover text-text-secondary`,
						children: "最大"
					}) : null, e.is_longest ? /* @__PURE__ */ (0, z.jsx)("i", {
						className: `${U} not-italic bg-(--keep)/22 text-(--keep)`,
						children: "最长"
					}) : null]
				}) : null]
			}),
			/* @__PURE__ */ (0, z.jsxs)("span", {
				className: `${G} flex min-w-0 items-center gap-1.5`,
				children: [/* @__PURE__ */ (0, z.jsx)(f, { mark: l[e.location] || "database" }), /* @__PURE__ */ (0, z.jsx)("span", {
					title: i,
					className: "min-w-0 truncate",
					children: i
				})]
			}),
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: G,
				children: D(e.size || 0)
			}),
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: G,
				children: E(e.duration)
			}),
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: `${G} col-start-2 -col-end-1 min-w-0 pt-0.5 wrap-anywhere max-duplicate-narrow:col-span-full`,
				children: e.path ?? ""
			})
		]
	});
}
function Y({ openItem: l, toast: f, failure: p }) {
	let m = I({
		queryKey: n,
		queryFn: ({ signal: e }) => w(e)
	}), v = I({
		queryKey: c,
		queryFn: ({ signal: e }) => T(e)
	}), [x, E] = (0, R.useState)(""), A = F({
		mutationFn: (e) => h(e, "dispose"),
		onSuccess: (e, t) => {
			K(), f(`已把 ${t.length} 项移入回收站`, { undo: async () => {
				try {
					await h(t, "restore");
				} catch (e) {
					p("撤销移入回收站", e);
				} finally {
					K();
				}
			} });
		},
		onSettled: () => E("")
	}), j = F({
		mutationFn: (e) => O(e.files.map((e) => e.id), !0),
		onSuccess: (e, t) => {
			K(), f(`${t.code} 这组都保留，不再列出`, { undo: async () => {
				try {
					await O(t.files.map((e) => e.id), !1);
				} catch (e) {
					p("撤销都保留", e);
				} finally {
					K();
				}
			} });
		},
		onError: (e) => p("标记都保留", e),
		onSettled: () => E("")
	}), M = m.data;
	if (!M) return /* @__PURE__ */ (0, z.jsx)("div", {
		className: "mx-auto w-full max-w-board",
		children: /* @__PURE__ */ (0, z.jsx)(u, {
			tone: "error",
			title: "重复文件读取失败",
			children: m.error ? C(m.error) : "未取得重复文件列表，请刷新页面重试。"
		})
	});
	let P = M.groups ?? [], B = y(v.data), U = ({ groups: e, keep: t, key: n }) => {
		if (A.isPending) return;
		let r = S(e, t);
		r.length && b({
			title: "移入回收站",
			body: `将把 ${r.length} 个重复文件的馆藏记录移入回收站，每组保留${o[t] ?? o.largest}。文件共 ${D(L(e, r))}，记录可从回收站还原。`,
			confirmLabel: "移入回收站",
			onConfirm: () => (E(n), A.mutateAsync(r))
		});
	}, G = (e) => _(x === e && (A.isPending || j.isPending)), Y = (e, t) => {
		j.isPending || A.isPending || (E(t), j.mutate(e));
	};
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "mx-auto w-full max-w-board pb-10.5",
		children: [
			/* @__PURE__ */ (0, z.jsx)(t, {
				label: "重复内容",
				figure: `${Number(M.total || 0).toLocaleString()} 组`,
				detail: `${Number(M.files || 0).toLocaleString()} 个文件 · 可回收 ${D(M.reclaimable)}`
			}),
			P.length ? /* @__PURE__ */ (0, z.jsxs)(i, {
				title: "批量保留",
				children: [
					/* @__PURE__ */ (0, z.jsx)(a, {
						busy: x === "all:largest",
						onPress: () => U({
							groups: P,
							keep: "largest",
							key: "all:largest"
						}),
						children: "全部保留最大"
					}),
					/* @__PURE__ */ (0, z.jsx)(a, {
						busy: x === "all:longest",
						onPress: () => U({
							groups: P,
							keep: "longest",
							key: "all:longest"
						}),
						children: "全部保留最长"
					}),
					g(P, B).map((e) => /* @__PURE__ */ (0, z.jsx)(a, {
						busy: x === `all:${e}`,
						onPress: () => U({
							groups: P,
							keep: e,
							key: `all:${e}`
						}),
						children: /* @__PURE__ */ (0, z.jsx)(d, {
							source: e,
							label: `全部优先 ${s[e] || e}`
						})
					}, e))
				]
			}) : null,
			A.isError ? /* @__PURE__ */ (0, z.jsx)("div", {
				className: "mb-5",
				children: /* @__PURE__ */ (0, z.jsx)(u, {
					tone: "error",
					title: "移入回收站失败",
					children: C(A.error)
				})
			}) : null,
			P.length ? P.map((t, n) => {
				let r = [t], i = N(t.files.map((e) => e.name)), a = (e) => `${n}:${e}`;
				return /* @__PURE__ */ (0, z.jsxs)("section", {
					"aria-label": t.code,
					className: H,
					children: [/* @__PURE__ */ (0, z.jsxs)("div", {
						className: "flex flex-wrap items-center gap-3 bg-background-tertiary-default p-5 max-compact:p-4 dark:bg-background-secondary-default",
						children: [
							/* @__PURE__ */ (0, z.jsx)("b", {
								className: "text-title-2-medium text-text-primary",
								children: t.code
							}),
							/* @__PURE__ */ (0, z.jsx)("span", {
								className: "font-mono text-caption-1-regular leading-5 text-text-primary",
								children: `${Number(t.count || 0).toLocaleString()} 个 · 可回收 ${D(t.reclaimable)}`
							}),
							q(t),
							t.cross_drive ? /* @__PURE__ */ (0, z.jsx)("span", {
								className: `${W} text-text-secondary`,
								children: `跨盘 ${t.drives.join(" ")}`
							}) : null,
							/* @__PURE__ */ (0, z.jsxs)("span", {
								className: "ml-auto flex flex-wrap gap-2 max-compact:ml-0 max-compact:w-full",
								children: [
									/* @__PURE__ */ (0, z.jsx)(e, {
										variant: "secondary",
										size: "small",
										...G(a("largest")),
										onClick: () => U({
											groups: r,
											keep: "largest",
											key: a("largest")
										}),
										children: "留最大"
									}),
									/* @__PURE__ */ (0, z.jsx)(e, {
										variant: "secondary",
										size: "small",
										...G(a("longest")),
										onClick: () => U({
											groups: r,
											keep: "longest",
											key: a("longest")
										}),
										children: "留最长"
									}),
									k(t.files, B).map((t) => /* @__PURE__ */ (0, z.jsx)(e, {
										variant: "secondary",
										size: "small",
										...G(a(t)),
										onClick: () => U({
											groups: r,
											keep: t,
											key: a(t)
										}),
										children: /* @__PURE__ */ (0, z.jsx)(d, {
											source: t,
											label: `留 ${s[t] || t}`
										})
									}, t)),
									/* @__PURE__ */ (0, z.jsx)(e, {
										variant: "secondary",
										size: "small",
										...G(a("keep")),
										onClick: () => Y(t, a("keep")),
										children: "都保留"
									}),
									/* @__PURE__ */ (0, z.jsx)(e, {
										variant: "danger",
										size: "small",
										...G(a("all")),
										onClick: () => U({
											groups: r,
											keep: "all",
											key: a("all")
										}),
										children: "整组回收"
									})
								]
							})
						]
					}), /* @__PURE__ */ (0, z.jsx)("div", { children: t.files.map((e) => /* @__PURE__ */ (0, z.jsx)(J, {
						file: e,
						prefix: i,
						openItem: l
					}, e.id)) })]
				}, `${t.code}-${n}`);
			}) : /* @__PURE__ */ (0, z.jsx)(r, {
				icon: V,
				title: "没有找到重复文件",
				children: "所有来源之间没有检测到内容相同的文件。扫描新来源后，这里会自动更新。"
			}),
			P.length > 0 && M.total > P.length ? /* @__PURE__ */ (0, z.jsx)("p", {
				className: "text-center text-caption-1-regular text-text-secondary",
				children: `显示可回收最多的前 ${P.length.toLocaleString()} 组，共 ${Number(M.total).toLocaleString()} 组；处理掉这些后，其余的会补上来。`
			}) : null,
			M.kept ? /* @__PURE__ */ (0, z.jsx)("p", {
				className: "mt-2 text-center text-caption-1-regular text-text-secondary",
				children: `另有 ${M.kept.toLocaleString()} 组标记了都保留，不再列出；组里文件有增减时会重新列出。`
			}) : null
		]
	});
}
export { Y as DuplicatesPage };

//# debugId=29f77252-37e1-43ad-aebd-9097d9469dab
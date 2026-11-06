(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "7e0eae8a-7640-4624-9521-07ab40b59a7e", e._sentryDebugIdIdentifier = "sentry-dbid-7e0eae8a-7640-4624-9521-07ab40b59a7e");
	} catch {}
})();
import { $76d00c5a4edb230a$export$76ccd210b9029917 as e, $76d00c5a4edb230a$export$816b5d811295e6bc as t, $76d00c5a4edb230a$export$b59bdbef9ce70de2 as n, $76d00c5a4edb230a$export$f6f0c3fe4ec306ea as r, $76d00c5a4edb230a$export$f850895b287ef28e as i, $fe21c36db05242bb$export$d7b12c4107be0d61 as a, ArtSlot as o, Button as s, ButtonLink as c, Bx as l, COVER_STATE_TITLE as u, CatalogViewToggle as d, ChevronSortDown as f, Chip as p, CloudDownloadDialog as m, CoverQueue as h, DISCOVERY_SORTS as g, DOWNLOADS_KEY as _, DOWNLOADS_URL as v, DataTableFrame as y, E3 as b, EmptyFocusButton as x, EmptyState as S, FilterGlassRows as C, FilterIconButton as w, FilterPill as T, GlassPill as E, Help as D, IndexSearch as O, Input as k, JAV_LAYOUTS as ee, JAV_RECOMMENDATION_GRID as te, JavHeader as A, LibraryShortcuts as j, M6 as M, Note as N, PHASES as P, Pagination as ne, RELEASE_COLUMN_VISIBILITY_KEY as F, RELEASE_COLUMN_WIDTHS_KEY as I, RELEASE_SORTS as L, RELEASE_SORT_COLUMNS as R, SEGMENT as z, SEGMENTED_TRACK as B, SegmentedRadioGroup as V, Segments as re, Shuffle as ie, SortKeys as ae, SourceAvatar as H, Table as oe, TableColumnControls as U, TableColumnResizer as W, TaskProgress as se, WANTS_KEY as ce, WantMagnets as le, Wt as ue, __toESM as de, addWant as fe, apiGet as pe, appSettingsStore as me, avatarInner as he, busyProps as G, cachedMagnetStates as ge, cardClass as _e, cardRatio as ve, catalogListSkeletonCellHtml as ye, composingKey as be, coverArrived as xe, coverFetching as Se, coverFetchingHtml as Ce, coverStateAction as we, coverUrl as Te, discoveryArtwork as Ee, discoveryKey as De, discoveryScore as Oe, entityDisplayName as K, entityFaceImg as ke, entityPath as Ae, errorMessage as q, esc as je, facePos as Me, fetchCoverNow as Ne, fetchDiscoveries as Pe, fetchReleases as Fe, fetchWants as Ie, firstGrapheme as Le, fmtDur as Re, gridLayout as ze, invalidateWants as J, javContentSkeleton as Be, javLayout as Ve, javTagSkeleton as He, keepPreviousData as Ue, leadingGraphemes as We, logoUrl as Ge, pageWindow as Ke, qE as qe, recommendationScore as Je, relayoutCovers as Ye, releaseColumns as Xe, releaseFilters as Ze, releaseKey as Qe, removeWants as $e, require_jsx_runtime as et, require_react as tt, resetWants as nt, searchNote as rt, spriteGlyph as it, storeJavLayout as at, textLang as ot, tierPlaceholdersHtml as st, useAction as Y, useCatalogView as ct, useEntityNames as lt, useQuery as ut, useTablePreferences as dt, wantName as X, wireHorizontalScroller as ft, writeJavQuery as Z } from "./peach-app.js";
import { ErrorLine as pt } from "./peach-app.source-view-DalWfDkm.js";
import "./peach-app.source-list-ri5fRK2E.js";
// src/react/wants/want-list.tsx
var Q = /* @__PURE__ */ de(tt(), 1), $ = et(), mt = {
	code: "手动添加",
	feed: "订阅新作",
	follow: "关注"
}, ht = [
	["all", "全部"],
	["available", "有磁链"],
	["missing", "没磁链"]
], gt = (e) => [
	e.release_date,
	e.studio,
	e.performers,
	mt[e.origin]
].filter(Boolean).join(" · ");
function _t({ want: e }) {
	return /* @__PURE__ */ (0, $.jsxs)("span", {
		className: "relative inline-grid w-card-cover shrink-0 aspect-card-cover place-items-center overflow-hidden rounded-2lg bg-background-tertiary-default max-sm:w-24",
		children: [/* @__PURE__ */ (0, $.jsx)("span", {
			className: "text-caption-1-regular text-text-secondary",
			children: "无封面"
		}), e.cover ? /* @__PURE__ */ (0, $.jsx)("img", {
			src: e.cover,
			alt: "",
			loading: "lazy",
			referrerPolicy: e.remote_cover ? "no-referrer" : void 0,
			onError: (e) => e.currentTarget.remove(),
			className: "absolute inset-0 size-full object-cover"
		}) : null]
	});
}
function vt({ want: e, readOnly: t, busy: n, onReset: r, onRemove: i, onCloudDownload: a, downloads: o, provider: l, toast: u }) {
	let [d, f] = (0, Q.useState)(""), p = e.link || d || (e.code ? `https://javdb.com/search?q=${encodeURIComponent(e.code)}&f=all` : "");
	return /* @__PURE__ */ (0, $.jsxs)("li", {
		"data-want-id": e.id,
		className: _e({ className: "flex flex-col gap-4 max-sm:p-4" }),
		children: [/* @__PURE__ */ (0, $.jsxs)("div", {
			className: "flex min-w-0 items-start gap-4 max-sm:gap-3",
			children: [/* @__PURE__ */ (0, $.jsx)(_t, { want: e }), /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "flex min-w-0 flex-1 flex-col gap-1",
				children: [
					/* @__PURE__ */ (0, $.jsxs)("p", {
						className: "flex min-w-0 flex-wrap items-baseline gap-x-2",
						children: [/* @__PURE__ */ (0, $.jsx)("b", {
							className: "min-w-0 text-headline-medium wrap-anywhere text-text-primary",
							children: X(e)
						}), e.code && e.title ? /* @__PURE__ */ (0, $.jsx)("span", {
							className: "min-w-0 truncate text-body-2-regular text-text-secondary",
							children: e.title
						}) : null]
					}),
					gt(e) ? /* @__PURE__ */ (0, $.jsx)("p", {
						className: "text-body-2-regular text-text-secondary",
						children: gt(e)
					}) : null,
					!e.code || e.phase === "unreleased" || e.phase === "acquired" ? /* @__PURE__ */ (0, $.jsx)("p", {
						"data-want-note": "",
						className: "text-caption-1-regular text-text-secondary",
						children: rt(e)
					}) : null,
					e.scrape_error ? /* @__PURE__ */ (0, $.jsx)(pt, {
						text: e.scrape_error,
						prefix: "资料未取得：",
						tone: "muted"
					}) : null,
					/* @__PURE__ */ (0, $.jsxs)("div", {
						className: "mt-1 flex flex-wrap items-center gap-2",
						children: [
							p ? /* @__PURE__ */ (0, $.jsx)(c, {
								"data-button-link": "",
								variant: "secondary",
								size: "small",
								trailingIcon: ue,
								href: p,
								target: "_blank",
								rel: "noopener noreferrer",
								children: "来源页"
							}) : null,
							/* @__PURE__ */ (0, $.jsx)(s, {
								variant: "secondary",
								size: "small",
								leadingIcon: M,
								disabled: t,
								...G(n === `remove:${e.id}`),
								onClick: i,
								children: "移除"
							}),
							e.phase === "given_up" ? /* @__PURE__ */ (0, $.jsx)(s, {
								variant: "secondary",
								size: "small",
								disabled: t,
								...G(n === `reset:${e.id}`),
								onClick: r,
								children: "重新查找"
							}) : null,
							e.phase === "searching" || e.phase === "given_up" ? /* @__PURE__ */ (0, $.jsx)(s, {
								variant: "secondary",
								size: "small",
								onClick: a,
								children: "查找资源"
							}) : null
						]
					})
				]
			})]
		}), e.code && (e.phase === "searching" || e.phase === "given_up") ? /* @__PURE__ */ (0, $.jsx)(le, {
			want: e,
			readOnly: t,
			downloads: o,
			provider: l,
			toast: u,
			onSource: f
		}) : null]
	});
}
function yt({ phase: e, label: t, rows: n, row: r }) {
	let [i, o] = (0, Q.useState)(1), [c, l] = (0, Q.useState)("all"), u = ge(n), d = (e) => e.has_magnets ?? u.get(e.code || "") ?? !1, f = n.filter(d), p = e !== "searching" || c === "all" ? n : n.filter((e) => d(e) === (c === "available")), m = Ke(p.length, 20, i);
	return /* @__PURE__ */ (0, $.jsxs)("section", {
		"aria-label": t,
		"data-want-phase": e,
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, $.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, $.jsxs)("h3", {
					className: "flex items-baseline gap-2 text-title-2-medium text-text-primary",
					children: [t, /* @__PURE__ */ (0, $.jsx)("span", {
						className: "text-body-2-regular tabular-nums text-text-secondary",
						children: n.length.toLocaleString()
					})]
				}), e === "searching" ? /* @__PURE__ */ (0, $.jsx)(V, {
					name: "want-magnet-filter",
					"aria-label": "待找磁链筛选",
					orientation: "horizontal",
					value: c,
					className: B,
					onChange: (e) => {
						l(e), o(1);
					},
					children: ht.map(([e, t]) => /* @__PURE__ */ (0, $.jsxs)(a, {
						value: e,
						"aria-label": t,
						className: z,
						children: [t, /* @__PURE__ */ (0, $.jsx)("span", {
							className: "text-caption-1-regular tabular-nums text-text-tertiary",
							children: (e === "all" ? n.length : e === "available" ? f.length : n.length - f.length).toLocaleString()
						})]
					}, e))
				}) : null]
			}),
			p.length ? null : /* @__PURE__ */ (0, $.jsx)(S, {
				size: "compact",
				icon: qe,
				title: "暂无符合条件的作品",
				actions: /* @__PURE__ */ (0, $.jsx)(s, {
					size: "small",
					onClick: () => {
						l("all"), o(1);
					},
					children: "查看全部"
				}),
				children: null
			}),
			/* @__PURE__ */ (0, $.jsx)("ul", {
				className: "flex flex-col gap-4",
				children: p.slice(m.start, m.end).map(r)
			}),
			m.pages > 1 ? /* @__PURE__ */ (0, $.jsxs)("div", {
				"data-want-pager": "",
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, $.jsx)("span", {
					className: "text-body-2-regular tabular-nums text-text-secondary",
					children: `${(m.start + 1).toLocaleString()}–${m.end.toLocaleString()} / ${m.total.toLocaleString()} 条`
				}), /* @__PURE__ */ (0, $.jsx)(ne, {
					label: `${t}分页`,
					page: m.page,
					pages: m.pages,
					onPage: o
				})]
			}) : null
		]
	});
}
function bt({ readOnly: e, toast: t, query: n = "", clearQuery: r }) {
	let [i, a] = (0, Q.useState)(""), [o, c] = (0, Q.useState)(null), l = Y(), u = ut({
		queryKey: ce,
		queryFn: ({ signal: e }) => Ie(e),
		staleTime: 3e4,
		refetchInterval: (e) => e.state.data?.scraping ? 3e3 : !1
	}), d = () => {
		let n = i.trim();
		n && !e && l.run("add", (e) => fe({ code: n }, e), (e) => {
			t(e.created ? `已加入想要：${X(e.want)}` : `${X(e.want)} 已经在想要里`), a(""), J();
		});
	}, f = (e) => {
		e.key === "Enter" && !be(e.nativeEvent) && (e.preventDefault(), d());
	}, p = (e) => {
		l.run(`remove:${e.id}`, (t) => $e([e.id], t), () => {
			t(`已移除：${X(e)}`), J();
		});
	}, h = (e) => {
		l.run(`reset:${e.id}`, (t) => nt([e.id], t), () => {
			t(`${X(e)} 回到待找`), J();
		});
	}, g = u.data, y = (g?.items || []).filter((e) => !n || [
		e.code,
		e.title,
		e.performers
	].join(" ").toLocaleLowerCase().includes(n.toLocaleLowerCase())), b = ut({
		queryKey: _,
		queryFn: ({ signal: e }) => pe(`${v}?limit=100`, e),
		enabled: y.some((e) => e.code && (e.phase === "searching" || e.phase === "given_up"))
	}), C = b.data?.providers.filter((e) => e.configured) || [], w = C[0]?.key || "";
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		"aria-busy": u.isPending,
		className: "flex flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, $.jsxs)("div", {
				className: _e({
					padding: "none",
					className: "flex flex-col gap-4 px-6 py-5 max-sm:px-4"
				}),
				children: [
					/* @__PURE__ */ (0, $.jsx)("h3", {
						className: "text-title-2-medium text-text-primary",
						children: "按番号添加"
					}),
					/* @__PURE__ */ (0, $.jsxs)("div", {
						className: "flex flex-wrap items-end gap-2",
						children: [/* @__PURE__ */ (0, $.jsx)("div", {
							className: "min-w-64 grow max-sm:min-w-0",
							children: /* @__PURE__ */ (0, $.jsx)(k, {
								"aria-label": "番号",
								placeholder: "输入番号，例如 SSIS-950",
								value: i,
								isDisabled: e,
								onChange: a,
								onKeyDown: f
							})
						}), /* @__PURE__ */ (0, $.jsx)(s, {
							variant: "primary",
							disabled: e || !i.trim(),
							...G(l.busy === "add"),
							onClick: d,
							children: "添加"
						})]
					}),
					l.error ? /* @__PURE__ */ (0, $.jsx)(N, {
						tone: "error",
						title: "这一次没有完成",
						children: l.error
					}) : null
				]
			}),
			u.error ? /* @__PURE__ */ (0, $.jsx)(N, {
				tone: "error",
				title: "想要清单读取失败",
				children: q(u.error)
			}) : null,
			u.isPending ? /* @__PURE__ */ (0, $.jsx)("div", {
				role: "status",
				"aria-label": "正在读取想要",
				dangerouslySetInnerHTML: { __html: Be("wants") }
			}) : null,
			g?.scraping ? /* @__PURE__ */ (0, $.jsx)(D, {
				role: "status",
				children: "正在给刚加入的番号取资料与封面。"
			}) : null,
			b.error ? /* @__PURE__ */ (0, $.jsx)(N, {
				tone: "error",
				title: "下载配置未取得",
				children: q(b.error)
			}) : null,
			b.data && !C.length ? /* @__PURE__ */ (0, $.jsxs)(N, {
				tone: "neutral",
				children: ["尚未配置下载渠道。", /* @__PURE__ */ (0, $.jsx)("a", {
					href: "/settings/library?section=%E4%B8%8B%E8%BD%BD%E6%B8%A0%E9%81%93",
					children: "下载渠道设置"
				})]
			}) : null,
			b.data && !b.data.available ? /* @__PURE__ */ (0, $.jsx)(N, {
				tone: "neutral",
				children: "云下载只在允许修改数据库的设备上可用。"
			}) : null,
			g && !y.length ? /* @__PURE__ */ (0, $.jsx)(S, {
				size: "compact",
				icon: qe,
				title: n ? "没有符合条件的作品" : "还没有想要的作品",
				actions: n && r ? /* @__PURE__ */ (0, $.jsx)(s, {
					size: "small",
					onClick: r,
					children: "清除搜索"
				}) : !n && !e ? /* @__PURE__ */ (0, $.jsx)(x, {
					target: "input[aria-label=\"番号\"]",
					children: "添加作品"
				}) : void 0,
				children: n ? "试试其他番号、女优或标题。" : "输入番号，添加想看的作品。"
			}) : null,
			P.map(([n, r]) => {
				let i = y.filter((e) => e.phase === n);
				return i.length ? /* @__PURE__ */ (0, $.jsx)(yt, {
					phase: n,
					label: r,
					rows: i,
					row: (n) => /* @__PURE__ */ (0, $.jsx)(vt, {
						want: n,
						readOnly: e,
						busy: l.busy,
						downloads: b.data,
						provider: w,
						toast: t,
						onReset: () => h(n),
						onRemove: () => p(n),
						onCloudDownload: () => c({
							code: n.code || "",
							title: n.title || "",
							origin: `wishlist:${n.id}`,
							cover: n.cover || "",
							performers: n.performers || "",
							release_date: n.release_date || "",
							studio: n.studio || ""
						})
					}, n.id)
				}, n) : null;
			}),
			/* @__PURE__ */ (0, $.jsx)(m, {
				prefill: o,
				close: () => c(null),
				receipt: t,
				provider: w
			})
		]
	});
}
// src/react/jav/discovery-faces.tsx
function xt({ item: e }) {
	lt();
	let t = e.performer_refs?.length ? e.performer_refs : [...new Set(e.performers.split(/[,，、;/]/).filter(Boolean))].map((e) => ({ name: e })), n = t.slice(0, 5).map((t, n) => {
		let r = { "--media-avatar-index": n }, i = t.source_avatar && t.source_actor_id && !t.has_image ? { children: /* @__PURE__ */ (0, $.jsx)(H, {
			code: e.code,
			person: t
		}) } : { dangerouslySetInnerHTML: { __html: he(t.name, t, null) } };
		return t.id ? /* @__PURE__ */ (0, $.jsx)("a", {
			"data-media-avatar": "",
			style: r,
			href: Ae("performer", t.name, t.id),
			"aria-label": `打开女优页：${K("performer", t.name, t.id)}`,
			...i
		}, t.name) : /* @__PURE__ */ (0, $.jsx)("span", {
			"data-media-avatar": "",
			style: r,
			title: K("performer", t.name),
			...i
		}, t.name);
	});
	return t.length > 1 ? /* @__PURE__ */ (0, $.jsx)("div", {
		"data-media-avatars": "",
		style: { "--media-avatar-count": Math.min(5, t.length) },
		children: n
	}) : n[0] || null;
}
// src/react/jav/discovery-card.tsx
var St = (e) => ({
	...e,
	cover: e.has_cover ? Te(e, !0) : e.cover_url,
	origin: `${e.asset_id ? "asset" : "feed"}:${e.id}`
}), Ct = "relative inline-grid place-items-center overflow-hidden rounded-2lg bg-background-tertiary-default";
function wt({ item: e, readOnly: t }) {
	let n = Y(), [r, i] = (0, Q.useState)("");
	(0, Q.useSyncExternalStore)(Se.subscribe, Se.revision);
	let a = e.cover_state;
	if (!a) return /* @__PURE__ */ (0, $.jsx)("span", {
		"data-media-nopic": "",
		children: "无封面"
	});
	if (a === "fetching" || Se.has(e.code)) return /* @__PURE__ */ (0, $.jsx)("span", { dangerouslySetInnerHTML: { __html: Ce() } });
	let o = () => {
		n.run("cover", (t) => Ne(e.code, t), (t) => {
			t.has_cover ? xe(e.code, t) : i(t.message || "没有找到可用的官方封面");
		});
	}, c = r || n.error ? "missing" : a, l = n.error || r || e.cover_reason;
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		"data-cover-state": c,
		className: "flex max-w-full flex-col items-center gap-1.5 px-4 text-center",
		children: [
			/* @__PURE__ */ (0, $.jsx)("span", {
				"data-media-nopic": "",
				children: u[c]
			}),
			l ? /* @__PURE__ */ (0, $.jsx)("span", {
				className: "line-clamp-3 text-caption-1-regular text-text-secondary",
				title: l,
				children: l
			}) : null,
			t ? null : /* @__PURE__ */ (0, $.jsx)(s, {
				size: "small",
				variant: "secondary",
				className: "mt-1",
				onClick: o,
				children: we(c)
			})
		]
	});
}
function Tt({ item: e, layout: t, javImage: n, readOnly: r, navigate: i, tag: a, onTag: l, wanting: u, onWant: d, onResource: f, badge: p }) {
	let m = e.performer_refs?.length ? e.performer_refs.map((e) => e.name).join("、") : e.performers, h = Ee(e, t, n), g = e.asset_id ? `/assets/${e.asset_id}` : `/works/${encodeURIComponent(e.code)}`;
	return /* @__PURE__ */ (0, $.jsxs)("article", {
		"data-media-card": "",
		"data-jav-card": "",
		onClick: (e) => {
			e.target.closest("a,button,input") || i(g);
		},
		children: [
			h ? /* @__PURE__ */ (0, $.jsx)("a", {
				href: g,
				"aria-label": `查看 ${e.code} 详情`,
				onClick: (e) => {
					e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0 || (e.preventDefault(), i(g));
				},
				"data-media-pic": "",
				"data-jav-cover-box": "",
				className: Ct,
				children: /* @__PURE__ */ (0, $.jsx)(o, {
					artwork: {
						kind: "cover",
						html: h
					},
					identity: Ee(e, "small", n),
					relayout: (e) => Ye(e, t)
				})
			}) : /* @__PURE__ */ (0, $.jsx)("div", {
				"data-media-pic": "",
				"data-jav-cover-box": "",
				className: Ct,
				children: /* @__PURE__ */ (0, $.jsx)(wt, {
					item: e,
					readOnly: r
				})
			}),
			/* @__PURE__ */ (0, $.jsxs)("div", {
				"data-media-meta": "",
				children: [/* @__PURE__ */ (0, $.jsx)(xt, { item: e }), /* @__PURE__ */ (0, $.jsxs)("div", {
					"data-media-text": "",
					children: [
						/* @__PURE__ */ (0, $.jsxs)("h3", {
							"data-jav-title": "",
							"data-media-title": "",
							title: `${e.code} · ${e.title || "标题未取得"}`,
							children: [
								/* @__PURE__ */ (0, $.jsx)("b", { children: e.code }),
								" ",
								e.title ? /* @__PURE__ */ (0, $.jsx)("span", {
									lang: ot(e.title),
									children: e.title
								}) : "标题未取得"
							]
						}),
						/* @__PURE__ */ (0, $.jsxs)("div", {
							"data-media-byline": "",
							children: [
								e.performer_refs?.[0]?.id ? /* @__PURE__ */ (0, $.jsxs)("a", {
									"data-media-who": "",
									href: Ae("performer", e.performer_refs[0].name),
									title: m,
									children: [/* @__PURE__ */ (0, $.jsx)("svg", {
										viewBox: "0 0 24 24",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, $.jsx)("use", { href: "#i-user-round" })
									}), /* @__PURE__ */ (0, $.jsx)("span", { children: e.performer_refs[0].name })]
								}) : /* @__PURE__ */ (0, $.jsxs)("span", {
									"data-media-who": "",
									title: m,
									children: [/* @__PURE__ */ (0, $.jsx)("svg", {
										viewBox: "0 0 24 24",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, $.jsx)("use", { href: "#i-user-round" })
									}), /* @__PURE__ */ (0, $.jsx)("span", { children: e.performer_refs?.[0]?.name || m })]
								}),
								(e.performer_refs?.length || 0) > 1 ? /* @__PURE__ */ (0, $.jsxs)("span", {
									"data-media-who-more": "",
									children: [
										"等 ",
										e.performer_refs.length,
										" 人"
									]
								}) : null,
								e.release_date ? /* @__PURE__ */ (0, $.jsxs)("time", {
									"data-media-release": "",
									dateTime: e.release_date,
									children: [/* @__PURE__ */ (0, $.jsx)("svg", {
										viewBox: "0 0 24 24",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, $.jsx)("use", { href: "#i-calendar" })
									}), e.release_date]
								}) : null
							]
						}),
						/* @__PURE__ */ (0, $.jsxs)("div", {
							"data-jav-tags": "",
							"data-media-tags": "",
							children: [p, (e.tags || []).slice(0, 4).map((e) => /* @__PURE__ */ (0, $.jsx)("button", {
								type: "button",
								"data-media-tag": "",
								"aria-pressed": a === e,
								onClick: () => l(a === e ? "" : e),
								children: e
							}, e))]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, $.jsxs)("div", {
				"data-jav-actions": "",
				className: "flex flex-wrap gap-2",
				children: [
					e.link ? /* @__PURE__ */ (0, $.jsx)(c, {
						"data-button-link": "",
						variant: "secondary",
						trailingIcon: ue,
						href: e.link,
						target: "_blank",
						rel: "noopener noreferrer",
						children: "作品来源"
					}) : null,
					/* @__PURE__ */ (0, $.jsx)(s, {
						variant: "ghost",
						disabled: r || e.wanted || !!e.asset_id,
						...G(u),
						onClick: d,
						children: e.asset_id ? "已入库" : e.wanted ? "已加入想要" : "想要"
					}),
					/* @__PURE__ */ (0, $.jsx)(s, {
						variant: "secondary",
						onClick: f,
						children: "查找资源"
					})
				]
			})
		]
	});
}
// src/react/jav/jav-release-table.tsx
var Et = {
	widths: I,
	visibility: F
};
function Dt({ studio: e }) {
	let [t, n] = (0, Q.useState)(!1);
	return e?.has_logo && !t ? /* @__PURE__ */ (0, $.jsx)("img", {
		"data-list-studio-mark": "",
		src: Ge(e.name, "icon", e.logo_version),
		alt: "",
		width: 16,
		height: 16,
		loading: "lazy",
		decoding: "async",
		onError: () => n(!0)
	}) : /* @__PURE__ */ (0, $.jsx)("span", {
		"data-list-studio-mark": "",
		"aria-hidden": "true",
		children: We(e?.name || "", 1)
	});
}
function Ot({ items: a, waiting: c, filters: l, studios: d, javImage: p, readOnly: m, navigate: h, onTag: g, onSort: _, wanting: v, onWant: b, onResource: x }) {
	let S = dt("jav-releases", Xe, Et), C = Xe.filter((e) => e.required || S.visibility[e.id] !== !1), w = Object.entries(R).find(([, e]) => e === l.sort)?.[0], T = new Map(d.map((e) => [e.name, e])), E = (e) => (t) => {
		t.preventDefault(), h(`/works/${encodeURIComponent(e.code)}`);
	}, D = (e, t) => {
		let n = t.performer_refs?.[0]?.name || t.performers.split(/[,，、;/]/)[0] || "";
		switch (e) {
			case "name": {
				let e = Ee(t, "small", p);
				return /* @__PURE__ */ (0, $.jsxs)("div", {
					"data-list-identity": "",
					children: [/* @__PURE__ */ (0, $.jsx)("button", {
						type: "button",
						"data-list-open": "",
						tabIndex: -1,
						"aria-hidden": "true",
						onClick: E(t),
						children: /* @__PURE__ */ (0, $.jsx)("span", {
							"data-list-picture": "",
							children: e ? /* @__PURE__ */ (0, $.jsx)(o, {
								artwork: {
									kind: "cover",
									html: e
								},
								relayout: (e) => Ye(e, "small")
							}) : /* @__PURE__ */ (0, $.jsx)("span", {
								title: t.cover_reason || void 0,
								children: t.cover_state ? u[t.cover_state] : "无封面"
							})
						})
					}), /* @__PURE__ */ (0, $.jsx)("span", {
						"data-list-text": "",
						children: /* @__PURE__ */ (0, $.jsxs)("button", {
							type: "button",
							"data-list-name": "",
							title: `${t.code} · ${t.title || "标题未取得"}`,
							"aria-label": `查看 ${t.code} 详情`,
							onClick: E(t),
							children: [
								/* @__PURE__ */ (0, $.jsx)("b", { children: t.code }),
								" ",
								t.title ? /* @__PURE__ */ (0, $.jsx)("span", {
									lang: ot(t.title),
									children: t.title
								}) : "标题未取得"
							]
						})
					})]
				});
			}
			case "people": return n ? /* @__PURE__ */ (0, $.jsxs)("div", {
				"data-list-people": "",
				children: [
					/* @__PURE__ */ (0, $.jsx)(xt, { item: t }),
					t.performer_refs?.[0]?.id ? /* @__PURE__ */ (0, $.jsx)("a", {
						"data-media-who": "",
						href: Ae("performer", n),
						children: /* @__PURE__ */ (0, $.jsx)("span", { children: n })
					}) : /* @__PURE__ */ (0, $.jsx)("span", {
						"data-media-who": "",
						children: /* @__PURE__ */ (0, $.jsx)("span", { children: n })
					}),
					(t.performer_refs?.length || 0) > 1 ? /* @__PURE__ */ (0, $.jsxs)("span", {
						"data-media-who-more": "",
						children: [
							"等 ",
							t.performer_refs.length,
							" 人"
						]
					}) : null
				]
			}) : "—";
			case "studio": return t.studio ? /* @__PURE__ */ (0, $.jsxs)("span", {
				"data-list-library": "",
				title: t.studio,
				children: [/* @__PURE__ */ (0, $.jsx)(Dt, { studio: T.get(t.studio) }), /* @__PURE__ */ (0, $.jsx)("span", { children: t.studio })]
			}) : "—";
			case "tags": return t.tags?.length ? /* @__PURE__ */ (0, $.jsx)("div", {
				"data-media-tags": "",
				"data-list-tags": "",
				children: t.tags.map((e) => /* @__PURE__ */ (0, $.jsx)("button", {
					type: "button",
					"data-media-tag": "",
					"aria-pressed": l.tag === e,
					onClick: () => g(l.tag === e ? "" : e),
					children: e
				}, e))
			}) : "—";
			case "code": return t.code;
			case "dur": return Re(t.duration) || "—";
			case "score": return t.source_score == null ? "—" : `${t.source_score.toFixed(2)} / 5`;
			case "release": return t.release_date || "—";
			default: return /* @__PURE__ */ (0, $.jsxs)("div", {
				"data-release-actions": "",
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, $.jsx)(s, {
					size: "small",
					variant: "ghost",
					disabled: m || t.wanted || !!t.asset_id,
					...G(v(t)),
					onClick: () => b(t),
					children: t.wanted ? "已想要" : "想要"
				}), /* @__PURE__ */ (0, $.jsx)(s, {
					size: "small",
					variant: "secondary",
					onClick: () => x(t),
					children: "查找资源"
				})]
			});
		}
	};
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		"data-catalog-table": "",
		"data-release-table": "",
		className: "flex min-w-0 flex-col gap-4",
		children: [/* @__PURE__ */ (0, $.jsx)("div", {
			className: "flex flex-wrap justify-end gap-2",
			role: "toolbar",
			"aria-label": "新作列表工具栏",
			children: /* @__PURE__ */ (0, $.jsx)("div", {
				"data-toolbar-actions": "",
				children: /* @__PURE__ */ (0, $.jsx)(U, {
					preferences: S,
					label: "新作列表"
				})
			})
		}), /* @__PURE__ */ (0, $.jsx)(y, {
			follow: !0,
			preferences: S,
			children: /* @__PURE__ */ (0, $.jsxs)(oe, {
				"aria-label": "新作列表",
				size: "sm",
				sortDescriptor: w ? {
					column: w,
					direction: l.dir === "asc" ? "ascending" : "descending"
				} : void 0,
				onSortChange: (e) => {
					let t = R[String(e.column)];
					t && _(t, e.direction === "ascending" ? "asc" : "desc");
				},
				children: [/* @__PURE__ */ (0, $.jsxs)(i, { children: [C.map((e) => /* @__PURE__ */ (0, $.jsx)(t, {
					id: e.id,
					isRowHeader: e.id === "name",
					allowsSorting: e.id in R,
					...S.columnProps(e.id),
					children: ({ sortDirection: t }) => /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsxs)("span", {
						className: "flex items-center gap-0.5",
						children: [e.label, e.id in R ? /* @__PURE__ */ (0, $.jsx)("span", {
							"data-sort-indicator": !0,
							"data-direction": t || void 0,
							children: /* @__PURE__ */ (0, $.jsx)(f, {})
						}) : null]
					}), /* @__PURE__ */ (0, $.jsx)(W, {
						preferences: S,
						id: e.id
					})] })
				}, e.id)), /* @__PURE__ */ (0, $.jsx)(t, {
					id: "remaining-space",
					"aria-label": "行空白区域",
					"data-table-space": "",
					width: S.spaceWidth,
					minWidth: 0
				})] }), /* @__PURE__ */ (0, $.jsx)(e, {
					renderEmptyState: () => "没有符合条件的新作",
					children: c ? Array.from({ length: 6 }, (e, t) => /* @__PURE__ */ (0, $.jsxs)(n, {
						id: `skeleton-${t}`,
						"data-list-skeleton-row": "",
						"aria-hidden": "true",
						children: [C.map((e) => /* @__PURE__ */ (0, $.jsx)(r, { children: /* @__PURE__ */ (0, $.jsx)("span", { dangerouslySetInnerHTML: { __html: ye(e.id) } }) }, e.id)), /* @__PURE__ */ (0, $.jsx)(r, { "data-table-space": "" })]
					}, `skeleton-${t}`)) : a.map((e) => /* @__PURE__ */ (0, $.jsxs)(n, {
						id: String(e.id),
						"data-catalog-row": "",
						"data-release-row": "",
						children: [C.map((t) => /* @__PURE__ */ (0, $.jsx)(r, { children: D(t.id, e) }, t.id)), /* @__PURE__ */ (0, $.jsx)(r, { "data-table-space": "" })]
					}, e.id))
				})]
			})
		})]
	});
}
// src/react/jav/jav-releases.tsx
var kt = `<div data-catalog-tier="performers" data-skeleton="tiers">${st("performer")}</div><div data-catalog-tier="studios">${st("studio")}</div>`, At = (e) => `<span data-tier-initial>${je(Le(K("performer", e.name, e.id)))}</span>${ke({
	id: e.id,
	hasImage: e.has_image,
	version: e.image_version,
	style: Me(e.avatar_focus),
	focus: e.avatar_focus,
	standIn: e.avatar_stand_in
})}`;
function jt({ value: e }) {
	let t = Je(e);
	return /* @__PURE__ */ (0, $.jsx)("span", {
		"data-jav-taste-score": "",
		title: `口味 ${t.score}`,
		children: /* @__PURE__ */ (0, $.jsx)(p, {
			color: t.color,
			children: t.label
		})
	});
}
function Mt({ studio: e }) {
	let [t, n] = (0, Q.useState)(!1);
	return /* @__PURE__ */ (0, $.jsx)("span", {
		"data-tier-mark": "",
		children: e.has_logo && !t ? /* @__PURE__ */ (0, $.jsx)("img", {
			src: Ge(e.name, "icon", e.logo_version),
			alt: "",
			width: 28,
			height: 28,
			loading: "lazy",
			decoding: "async",
			onError: () => n(!0)
		}) : We(e.name, 2)
	});
}
var Nt = (e) => Ne(e).then((t) => (t.has_cover && xe(e, t), t.has_cover));
function Pt({ readOnly: e, receipt: t, resource: n, query: r, navigate: i, clearText: a }) {
	lt();
	let [o, u] = (0, Q.useState)(() => Ze(location.search));
	(0, Q.useEffect)(() => {
		r !== o.q && (u((e) => ({
			...e,
			q: r,
			page: 1
		})), Z({ page: "" }));
	}, [r, o.q]);
	let f = (e, t) => {
		let n = o[e] === t ? "" : t;
		u((t) => ({
			...t,
			[e]: n,
			page: 1
		})), Z({
			[e]: n,
			page: ""
		});
	}, p = (0, Q.useRef)(null), m = (e) => {
		u((t) => ({
			...t,
			page: e
		})), Z({ page: e > 1 ? String(e) : "" }), p.current?.scrollIntoView({ block: "start" });
	}, g = () => {
		u((e) => ({
			...e,
			performer: "",
			studio: "",
			tag: "",
			q: "",
			page: 1
		})), Z({
			performer: "",
			studio: "",
			tag: "",
			page: ""
		}), a();
	}, _ = (e) => v(e, e === o.sort ? o.dir === "asc" ? "desc" : "asc" : e === "code" ? "asc" : "desc"), v = (e, t) => {
		u((n) => ({
			...n,
			sort: e,
			dir: t,
			seed: "",
			page: 1
		})), Z({
			sort: e === "release_date" ? "" : e,
			dir: t === "asc" ? "asc" : "",
			seed: "",
			page: ""
		});
	}, y = () => {
		let e = Math.random().toString(36).slice(2, 10);
		u((t) => ({
			...t,
			sort: "random",
			dir: "desc",
			seed: e,
			page: 1
		})), Z({
			sort: "random",
			dir: "",
			seed: e,
			page: ""
		});
	};
	(0, Q.useEffect)(() => {
		let e = [...p.current?.querySelectorAll("[data-catalog-tier],[data-catalog-tags],[data-filter-row=\"bottom\"]") || []].map((e) => ft(e, { drag: !0 }));
		return () => e.forEach((e) => e.destroy());
	}, []);
	let b = me();
	(0, Q.useSyncExternalStore)(b.subscribe, b.version, b.version);
	let x = Ve(), w = ct(), D = ve(ze({
		active: !0,
		home: !1,
		portrait: !1
	})), O = (0, Q.useRef)(""), k = ut({
		queryKey: Qe(o),
		queryFn: ({ signal: e }) => Fe(o, e, O.current),
		placeholderData: Ue,
		retry: !1,
		refetchOnWindowFocus: !1,
		refetchInterval: (e) => e.state.data?.metadata_job?.status === "running" && Math.max(1e3, e.state.data.poll_after_ms || 3e3)
	}), A = k.data?.metadata_job, j = A?.status === "running", M = (0, Q.useRef)(!1);
	(0, Q.useEffect)(() => {
		A?.job_id && (O.current = A.job_id);
	}, [A?.job_id]), (0, Q.useEffect)(() => {
		M.current && !j && k.refetch(), M.current = j;
	}, [j, k]);
	let P = Y(), F = (e) => {
		P.run(String(e.id), (t) => fe({ code: e.code }, t), () => {
			t("已加入想要"), J(), k.refetch();
		});
	}, I = k.data, R = k.isPending, z = !!(o.performer || o.studio || o.tag || o.q), B = Math.max(1, Math.ceil((I?.total || 0) / 24));
	return /* @__PURE__ */ (0, $.jsxs)("section", {
		ref: p,
		"aria-label": "订阅新作",
		"aria-busy": R || k.isFetching,
		className: "flex min-w-0 scroll-mt-24 flex-col gap-4",
		children: [
			R ? /* @__PURE__ */ (0, $.jsx)("div", {
				"data-catalog-tiers": "",
				"aria-busy": "true",
				dangerouslySetInnerHTML: { __html: kt }
			}) : null,
			I && (I.facets.performers.length || I.facets.studios.length) ? /* @__PURE__ */ (0, $.jsxs)("div", {
				"data-catalog-tiers": "",
				"data-release-tiers": "",
				children: [I.facets.performers.length ? /* @__PURE__ */ (0, $.jsx)("div", {
					"data-catalog-tier": "performers",
					role: "group",
					"aria-label": "按女优筛选",
					children: I.facets.performers.map((e) => /* @__PURE__ */ (0, $.jsxs)("button", {
						type: "button",
						"data-tier-performer": "",
						"aria-pressed": o.performer === e.name,
						title: `${K("performer", e.name, e.id)} · ${e.count} 部`,
						onClick: () => f("performer", e.name),
						children: [/* @__PURE__ */ (0, $.jsx)("span", {
							"data-tier-ring": "",
							dangerouslySetInnerHTML: { __html: At(e) }
						}), /* @__PURE__ */ (0, $.jsx)("span", {
							"data-tier-name": "",
							children: K("performer", e.name, e.id)
						})]
					}, e.name))
				}) : null, I.facets.studios.length ? /* @__PURE__ */ (0, $.jsx)("div", {
					"data-catalog-tier": "studios",
					role: "group",
					"aria-label": "按厂牌筛选",
					children: I.facets.studios.map((e) => /* @__PURE__ */ (0, $.jsxs)("button", {
						type: "button",
						"data-tier-studio": "",
						"aria-pressed": o.studio === e.name,
						title: `${e.name} · ${e.count} 部`,
						onClick: () => f("studio", e.name),
						children: [
							/* @__PURE__ */ (0, $.jsx)(Mt, { studio: e }),
							e.name,
							/* @__PURE__ */ (0, $.jsx)("span", {
								"data-count-badge": "",
								children: e.count
							})
						]
					}, e.name))
				}) : null]
			}) : null,
			/* @__PURE__ */ (0, $.jsx)(C, {
				label: "新作筛选",
				topLabel: "新作标签",
				attrs: {
					"data-filter-frame": "",
					"data-jav-filter": "",
					"data-catalog-frame": ""
				},
				busy: R,
				topClassName: "gap-1.5 overflow-visible",
				bottomClassName: "min-h-12",
				top: /* @__PURE__ */ (0, $.jsx)("div", {
					"data-catalog-scroll": "",
					children: /* @__PURE__ */ (0, $.jsx)("div", {
						"data-catalog-tags": "",
						dangerouslySetInnerHTML: R ? { __html: He() } : void 0,
						children: R ? null : I?.facets.tags.map((e) => /* @__PURE__ */ (0, $.jsxs)(T, {
							"data-catalog-tag": e.name,
							"data-entity-press": "",
							pressed: o.tag === e.name,
							onPress: () => f("tag", e.name),
							children: [e.name, /* @__PURE__ */ (0, $.jsx)("span", {
								"data-count-badge": "",
								children: e.count
							})]
						}, e.name))
					})
				}),
				bottom: /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [
					/* @__PURE__ */ (0, $.jsx)("span", {
						"data-catalog-readout": "",
						children: R ? /* @__PURE__ */ (0, $.jsx)("span", {
							"data-skeleton": "count",
							"aria-hidden": !0,
							className: "relative inline-block h-3.5 w-37.5 rounded-md align-middle skeleton-sheen"
						}) : z ? `${I?.total || 0} / ${I?.candidate_total || 0} 部` : `${I?.total || 0} 部`
					}),
					z ? /* @__PURE__ */ (0, $.jsx)(E, {
						onPress: g,
						children: "清除筛选"
					}) : null,
					/* @__PURE__ */ (0, $.jsxs)("span", {
						"data-entity-sorts": "",
						children: [
							/* @__PURE__ */ (0, $.jsx)(ie, {
								onPress: y,
								busy: o.sort === "random" && k.isFetching
							}),
							w === "cards" ? /* @__PURE__ */ (0, $.jsx)(re, {
								label: "JAV 卡片版式",
								value: x,
								options: ee,
								onChange: at
							}) : null,
							/* @__PURE__ */ (0, $.jsx)(d, {}),
							/* @__PURE__ */ (0, $.jsx)(ae, {
								sorts: L.map(([e, t, n]) => ({
									key: e,
									label: t,
									ariaLabel: n,
									pressed: e === o.sort,
									dir: o.dir
								})),
								onSort: (e) => _(e)
							})
						]
					})
				] })
			}),
			R && w === "cards" ? /* @__PURE__ */ (0, $.jsx)("div", {
				role: "status",
				"aria-label": "正在读取新作",
				dangerouslySetInnerHTML: { __html: Be("discover", x) }
			}) : null,
			k.error ? /* @__PURE__ */ (0, $.jsx)(N, {
				tone: "error",
				title: "新作未取得",
				children: q(k.error)
			}) : null,
			j && A ? /* @__PURE__ */ (0, $.jsx)("div", {
				"data-jav-metadata": "",
				className: "min-w-0",
				children: /* @__PURE__ */ (0, $.jsx)(se, {
					label: `正在读取作品资料 · ${A.completed} / ${A.total} 部`,
					value: A.completed,
					total: A.total
				})
			}) : null,
			e ? null : /* @__PURE__ */ (0, $.jsx)(h, {
				scope: "本页",
				fetchOne: Nt,
				codes: (I?.items || []).filter((e) => e.cover_state === "queued" && !e.cover_url).map((e) => e.code),
				settled: (e, n) => {
					t(e === n ? `已取到 ${n} 部封面` : `已取到 ${e} / ${n} 部封面，没取到的在卡上写了原因`), k.refetch();
				}
			}),
			!R && !k.error && !I?.items.length ? /* @__PURE__ */ (0, $.jsx)(S, {
				icon: l,
				title: z ? "没有符合条件的新作" : "暂无未入库的新作",
				actions: z ? /* @__PURE__ */ (0, $.jsx)(s, {
					size: "small",
					onClick: g,
					children: "清除筛选"
				}) : /* @__PURE__ */ (0, $.jsx)(c, {
					size: "small",
					href: "/subscriptions?tab=add",
					children: "添加订阅"
				}),
				children: z ? "清除筛选后查看全部新作。" : "订阅女优或厂牌后，还没入库的新作会出现在这里。"
			}) : null,
			P.error ? /* @__PURE__ */ (0, $.jsx)(N, {
				tone: "error",
				children: P.error
			}) : null,
			w === "list" ? R || I?.items.length ? /* @__PURE__ */ (0, $.jsx)(Ot, {
				items: I?.items || [],
				waiting: R,
				filters: o,
				studios: I?.facets.studios || [],
				javImage: b.value.javImage,
				readOnly: e,
				navigate: i,
				onTag: (e) => f("tag", e || o.tag),
				onSort: v,
				wanting: (e) => P.busy === String(e.id),
				onWant: F,
				onResource: (e) => n(St(e))
			}) : null : /* @__PURE__ */ (0, $.jsx)("div", {
				"data-media-grid": "",
				className: te,
				style: { "--card-ratio": D },
				children: (I?.items || []).map((t) => /* @__PURE__ */ (0, $.jsx)(Tt, {
					item: t,
					layout: x,
					javImage: b.value.javImage,
					readOnly: e,
					navigate: i,
					tag: o.tag,
					onTag: (e) => f("tag", e || o.tag),
					wanting: P.busy === String(t.id),
					onWant: () => F(t),
					onResource: () => n(St(t)),
					badge: o.sort === "taste" ? /* @__PURE__ */ (0, $.jsx)(jt, { value: t.taste_score }) : void 0
				}, t.id))
			}),
			/* @__PURE__ */ (0, $.jsx)("div", {
				className: "flex justify-center",
				children: /* @__PURE__ */ (0, $.jsx)(ne, {
					page: o.page,
					pages: B,
					onPage: m,
					label: "新作分页"
				})
			})
		]
	});
}
// src/react/jav/jav-page.tsx
var Ft = it("x"), It = it("refresh-cw"), Lt = {
	releases: "筛选新作",
	discover: "筛选推荐",
	wants: "筛选想要"
};
function Rt({ tab: e, readOnly: t, navigate: n, receipt: r }) {
	let [i, a] = (0, Q.useState)(null), [o, s] = (0, Q.useState)(() => new URLSearchParams(location.search).get("q") || ""), c = (e) => {
		s(e), Z({ q: e });
	};
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "flex w-full flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, $.jsx)(A, {
				tab: e,
				navigate: n,
				find: () => a({}),
				search: /* @__PURE__ */ (0, $.jsx)(O, {
					label: Lt[e] || "筛选",
					value: o,
					onQuery: c
				})
			}),
			e === "releases" ? /* @__PURE__ */ (0, $.jsx)(Pt, {
				readOnly: t,
				receipt: r,
				resource: a,
				query: o.trim(),
				navigate: n,
				clearText: () => c("")
			}) : e === "discover" ? /* @__PURE__ */ (0, $.jsx)(zt, {
				readOnly: t,
				receipt: r,
				resource: a,
				query: o.trim(),
				navigate: n,
				clearText: () => c("")
			}) : /* @__PURE__ */ (0, $.jsx)(bt, {
				readOnly: t,
				toast: r,
				query: o.trim(),
				clearQuery: () => c("")
			}),
			/* @__PURE__ */ (0, $.jsx)(m, {
				prefill: i,
				close: () => a(null),
				receipt: r
			})
		]
	});
}
function zt({ readOnly: e, receipt: t, resource: n, query: r, navigate: i, clearText: a }) {
	let o = new URLSearchParams(location.search), [l, u] = (0, Q.useState)(() => o.get("scope") === "library" ? "library" : "external"), [d, f] = (0, Q.useState)(() => o.get("tag") || ""), [m, h] = (0, Q.useState)(() => g.some(([e]) => e === o.get("sort")) ? o.get("sort") : "taste"), [_, v] = (0, Q.useState)(() => o.get("dir") === "asc"), y = (e) => {
		u(e), Z({ scope: e === "external" ? "" : e });
	}, x = (e) => {
		f(e), Z({ tag: e });
	}, D = (e) => {
		h(e), Z({ sort: e === "taste" ? "" : e });
	}, O = (e) => {
		v(e), Z({ dir: e ? "asc" : "" });
	}, k = (0, Q.useRef)(null);
	(0, Q.useEffect)(() => {
		let e = [...k.current?.querySelectorAll("[data-catalog-scroll],[data-catalog-tags],[data-filter-row=\"bottom\"]") || []].map((e) => ft(e, { drag: !0 }));
		return () => e.forEach((e) => e.destroy());
	}, []);
	let A = me();
	(0, Q.useSyncExternalStore)(A.subscribe, A.version, A.version);
	let M = Ve(), P = ve(ze({
		active: !0,
		home: !1,
		portrait: !1
	})), ne = (0, Q.useRef)({}), F = (0, Q.useRef)(!1), I = (0, Q.useRef)(!1), L = _ ? "asc" : "desc", R = ut({
		queryKey: De(l, m, L),
		retry: !1,
		refetchOnWindowFocus: !1,
		queryFn: ({ signal: e }) => {
			let t = F.current, n = I.current;
			return F.current = !1, I.current = !1, Pe(l, e, {
				sort: m,
				direction: L,
				jobId: t ? void 0 : ne.current[l],
				refreshMetadata: t,
				cancelMetadata: n
			});
		},
		refetchInterval: (e) => e.state.data?.metadata_job?.status === "running" && Math.max(1e3, e.state.data.poll_after_ms || 3e3)
	}), z = R.data?.metadata_job;
	(0, Q.useEffect)(() => {
		z?.job_id && (ne.current[l] = z.job_id);
	}, [l, z?.job_id]);
	let B = Y(), V = Y(), ie = (e) => {
		V.run(e, async () => (I.current = e === "stop", F.current = e !== "stop", R.refetch({
			cancelRefetch: !0,
			throwOnError: !0
		})), () => {});
	}, H = R.data?.items || [], oe = [...new Set(H.flatMap((e) => e.tags || []))], U = H.filter((e) => (!d || e.tags?.includes(d)) && (!r || [
		e.code,
		e.title,
		e.performers,
		e.studio,
		...e.tags || [],
		...(e.performer_refs || []).map((e) => e.name)
	].join(" ").toLocaleLowerCase().includes(r.toLocaleLowerCase()))), W = R.isPending;
	return /* @__PURE__ */ (0, $.jsxs)("section", {
		ref: k,
		"aria-label": "为你推荐",
		"aria-busy": W,
		className: "flex min-w-0 flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, $.jsx)(C, {
				label: "发现筛选与排序",
				topLabel: "发现范围与标签",
				attrs: {
					"data-filter-frame": "",
					"data-jav-filter": "",
					"data-catalog-frame": ""
				},
				busy: W,
				topClassName: "gap-1.5 overflow-visible",
				bottomClassName: "min-h-12",
				top: /* @__PURE__ */ (0, $.jsxs)("div", {
					"data-catalog-scroll": "",
					children: [/* @__PURE__ */ (0, $.jsxs)("div", {
						"data-catalog-views": "",
						children: [[["external", "库外发现"], ["library", "馆藏探索"]].map(([e, t]) => /* @__PURE__ */ (0, $.jsx)(T, {
							"data-entity-tag": e,
							"data-entity-press": "",
							pressed: l === e,
							onPress: () => {
								y(e), x("");
							},
							children: t
						}, e)), /* @__PURE__ */ (0, $.jsx)("span", {
							"data-entity-sep": "",
							"aria-hidden": "true"
						})]
					}), /* @__PURE__ */ (0, $.jsx)("div", {
						"data-catalog-tags": "",
						dangerouslySetInnerHTML: W ? { __html: He() } : void 0,
						children: W ? null : oe.map((e) => /* @__PURE__ */ (0, $.jsxs)(T, {
							"data-catalog-tag": e,
							"data-entity-press": "",
							pressed: d === e,
							onPress: () => x(d === e ? "" : e),
							children: [e, /* @__PURE__ */ (0, $.jsx)("span", {
								"data-count-badge": "",
								children: H.filter((t) => t.tags?.includes(e)).length
							})]
						}, e))
					})]
				}),
				bottom: /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [
					/* @__PURE__ */ (0, $.jsx)("span", {
						"data-catalog-readout": "",
						children: W ? /* @__PURE__ */ (0, $.jsx)("span", {
							"data-skeleton": "count",
							"aria-hidden": !0,
							className: "relative inline-block h-3.5 w-37.5 rounded-md align-middle skeleton-sheen"
						}) : `${U.length} 部`
					}),
					/* @__PURE__ */ (0, $.jsx)(j, { currentHref: () => location.pathname + location.search }),
					r || d ? /* @__PURE__ */ (0, $.jsx)(E, {
						onPress: () => {
							x(""), a();
						},
						children: "清除筛选"
					}) : null,
					/* @__PURE__ */ (0, $.jsxs)("span", {
						"data-entity-sorts": "",
						children: [
							l === "external" ? /* @__PURE__ */ (0, $.jsx)(w, {
								"data-entity-batch": "",
								"data-jav-metadata-update": "",
								label: z?.status === "running" ? "停止读取" : "更新资料",
								disabled: W,
								"data-skeleton-action": W ? "" : void 0,
								busy: !!V.busy,
								icon: z?.status === "running" ? Ft : It,
								onPress: () => ie(z?.status === "running" ? "stop" : "update")
							}) : null,
							/* @__PURE__ */ (0, $.jsx)(re, {
								label: "JAV 卡片版式",
								value: M,
								options: ee,
								onChange: at
							}),
							/* @__PURE__ */ (0, $.jsx)(ae, {
								sorts: g.map(([e, t, n]) => ({
									key: e,
									label: t,
									ariaLabel: n,
									pressed: e === m,
									dir: L
								})),
								onSort: (e) => {
									e === m ? O(!_) : (D(e), O(e === "code"));
								}
							})
						]
					})
				] })
			}),
			W ? /* @__PURE__ */ (0, $.jsx)("div", {
				role: "status",
				"aria-label": "正在读取推荐",
				dangerouslySetInnerHTML: { __html: Be("discover", M) }
			}) : null,
			R.error ? /* @__PURE__ */ (0, $.jsx)(N, {
				tone: "error",
				title: "推荐未取得",
				children: q(R.error)
			}) : null,
			l === "external" && z?.status === "running" ? /* @__PURE__ */ (0, $.jsx)("div", {
				"data-jav-metadata": "",
				className: "min-w-0",
				children: /* @__PURE__ */ (0, $.jsx)(se, {
					label: `正在读取作品资料 · ${z.completed} / ${z.total} 部`,
					value: z.completed,
					total: z.total
				})
			}) : null,
			z && z.status !== "running" && (z.status !== "complete" || z.failed > 0) ? /* @__PURE__ */ (0, $.jsx)(N, {
				tone: "neutral",
				action: /* @__PURE__ */ (0, $.jsx)(s, {
					variant: "secondary",
					...G(V.busy === "retry"),
					"aria-label": "立即重试读取作品资料",
					onClick: () => ie("retry"),
					children: "立即重试"
				}),
				children: z.message || `作品资料 ${z.completed} / ${z.total} 部`
			}) : null,
			V.error ? /* @__PURE__ */ (0, $.jsx)(N, {
				tone: "error",
				children: V.error
			}) : null,
			!W && !R.error && !U.length ? /* @__PURE__ */ (0, $.jsx)(S, {
				icon: b,
				title: r || d ? "没有符合条件的推荐" : "暂无匹配口味的作品",
				actions: /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)(c, {
					size: "small",
					href: "/taste",
					variant: "secondary",
					children: "查看口味"
				}), r || d ? /* @__PURE__ */ (0, $.jsx)(s, {
					variant: "primary",
					size: "small",
					onClick: () => {
						a(), f(""), Z({
							q: "",
							tag: ""
						});
					},
					children: "清除筛选"
				}) : l === "library" ? /* @__PURE__ */ (0, $.jsx)(c, {
					variant: "primary",
					size: "small",
					href: "/",
					children: "浏览馆藏"
				}) : /* @__PURE__ */ (0, $.jsx)(s, {
					variant: "primary",
					size: "small",
					onClick: () => n({}),
					children: "查找作品"
				})] }),
				children: r || d ? "清除筛选后查看其他作品。" : l === "library" ? "观看或标记作品后，可以探索少看的馆藏。" : "可以查找番号，或更新关注来源。"
			}) : null,
			B.error ? /* @__PURE__ */ (0, $.jsx)(N, {
				tone: "error",
				children: B.error
			}) : null,
			/* @__PURE__ */ (0, $.jsx)("div", {
				"data-media-grid": "",
				className: te,
				style: { "--card-ratio": P },
				children: U.map((r) => {
					let a = Je(r.taste_score ?? r.score), o = [
						a.label,
						`口味 ${Oe(r.taste_score ?? r.score)}`,
						R.data?.ranking_method === "mmr" && r.ranking_score != null ? `排序 ${Oe(r.ranking_score)}` : "",
						r.source_score == null ? "" : `来源评分 ${r.source_score.toFixed(1)} / 5`,
						...r.reasons || []
					].filter(Boolean).join(" · ");
					return /* @__PURE__ */ (0, $.jsx)(Tt, {
						item: r,
						layout: M,
						javImage: A.value.javImage,
						readOnly: e,
						navigate: i,
						tag: d,
						onTag: x,
						wanting: B.busy === String(r.id),
						onWant: () => {
							B.run(String(r.id), (e) => fe({ code: r.code }, e), () => {
								t("已加入想要"), J(), R.refetch();
							});
						},
						onResource: () => n(St(r)),
						badge: /* @__PURE__ */ (0, $.jsx)("button", {
							"data-jav-taste-score": "",
							type: "button",
							title: o,
							"aria-label": `推荐分 ${a.score}，${a.label}`,
							className: "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
							children: /* @__PURE__ */ (0, $.jsx)(p, {
								color: a.color,
								children: a.label
							})
						})
					}, r.id);
				})
			})
		]
	});
}
export { Rt as JavPage };

//# debugId=7e0eae8a-7640-4624-9521-07ab40b59a7e
(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "92a7117d-6e3e-40db-8e19-24fe164f3c5b", e._sentryDebugIdIdentifier = "sentry-dbid-92a7117d-6e3e-40db-8e19-24fe164f3c5b");
	} catch {}
})();
import { Button as e, CardTags as t, CatalogViewToggle as n, CloudDownloadDialog as r, EmptyState as i, FilterGlassRows as a, FilterSearch as o, Gg as s, H7 as c, Icon as l, LOC as u, ListLibrary as d, Note as f, OA as p, QUALITY_GOALS_KEY as m, QueueFilterChips as h, QueueIdentity as g, QueuePicture as _, QueueTable as v, SelectAllButton as y, SelectionDock as b, SortKeys as x, __toESM as S, enterPageSelection as C, errorMessage as w, exitPageSelection as ee, fetchQualityGoals as te, fmtDur as T, fmtSize as E, hasSelectionModifier as D, previewUrl as O, providerIcon as ne, pv as k, queueContentSkeletonHtml as re, require_jsx_runtime as A, require_react as j, t as M, useCatalogView as ie, useDense as N, useLibraryTints as P, usePageSelection as ae, useQuery as oe, useQueueSort as se, useRectangleSelection as ce, useWorkContextMenu as F } from "./peach-app.js";
import { Page as I } from "./peach-app.page-QAncjzM1.js";
import { JavBatchResources as le } from "./peach-app.jav-batch-resources-B1BkGgyg.js";
// src/react/quality-goals/quality-goals-page.tsx
var L = /* @__PURE__ */ S(j(), 1), R = A(), z = (e) => (e || "").split(/\s*\/\s*/).map((e) => e.trim()).filter(Boolean);
function B(e, t) {
	return {
		code: e.code,
		title: t,
		origin: `asset:${e.id}`,
		searchReason: e.reason || "",
		duration: e.duration,
		cover: O(e)
	};
}
function V(e, t, n, r, i) {
	let a = [{
		id: "open",
		label: M("manage:hdUpgrades.viewEditions"),
		icon: s,
		run: n
	}, {
		id: "select",
		label: M(t ? "catalog:mediaActions.deselect" : "catalog:mediaActions.select"),
		icon: c,
		run: i
	}];
	return e.code && a.splice(1, 0, {
		id: "search",
		label: M("manage:resourceSearch.searchTorrents"),
		icon: k,
		run: r
	}), a;
}
function ue({ item: n, openItem: r, searchResources: i, javTitleHtml: a, javDisplayName: o, srcBadge: s, picked: c, onPick: f, selecting: p }) {
	let m = F(), h = N(), [g, _] = (0, L.useState)(!1), v = () => r(n.id), y = o(n), b = () => i(B(n, y)), x = {
		key: n.id,
		operations: V(n, c, v, b, () => f(!c))
	}, S = P(), C = n.library_id && S.get(n.library_id)?.color ? n.library_id : void 0;
	return /* @__PURE__ */ (0, R.jsxs)("article", {
		"data-media-card": "",
		"data-jav-card": "",
		"data-queue-card": "",
		"data-goal-id": n.id,
		"data-rectangle-key": n.id,
		"data-library": C,
		"data-selected": c ? "" : void 0,
		onContextMenu: (e) => m.onContextMenu(e, x),
		onKeyDown: (e) => m.onKeyDown(e, x),
		onClickCapture: (e) => {
			e.target.closest("[data-work-context-menu]") || (p || D(e)) && (e.preventDefault(), e.stopPropagation(), f(!c));
		},
		children: [
			m.menu,
			/* @__PURE__ */ (0, R.jsxs)("button", {
				type: "button",
				"data-media-pic": "",
				onClick: v,
				"aria-label": M("manage:hdUpgrades.openVideo", { title: y }),
				style: { "--card-ratio": "1.7777777777777777" },
				children: [
					g ? /* @__PURE__ */ (0, R.jsx)("span", {
						"data-media-nopic": "",
						children: M("manage:hdUpgrades.noPreview")
					}) : /* @__PURE__ */ (0, R.jsx)("span", {
						"data-media-art": "thumb",
						children: /* @__PURE__ */ (0, R.jsx)("img", {
							className: "absolute inset-0 size-full object-contain",
							src: O(n),
							alt: "",
							loading: "lazy",
							"data-goal-cover": "",
							onError: () => _(!0)
						})
					}),
					/* @__PURE__ */ (0, R.jsx)("span", {
						"data-media-badge": "",
						dangerouslySetInnerHTML: { __html: s(n.location, n.cost) }
					}),
					Number(n.duration) > 0 ? /* @__PURE__ */ (0, R.jsx)("span", {
						"data-media-duration": "",
						children: T(n.duration)
					}) : null,
					/* @__PURE__ */ (0, R.jsx)("span", {
						"data-media-check": "",
						children: /* @__PURE__ */ (0, R.jsx)(l, { name: "check" })
					})
				]
			}),
			/* @__PURE__ */ (0, R.jsx)("div", {
				"data-media-meta": "",
				children: /* @__PURE__ */ (0, R.jsxs)("div", {
					"data-media-text": "",
					children: [
						/* @__PURE__ */ (0, R.jsx)("button", {
							type: "button",
							"data-media-title": "",
							onClick: v,
							title: y,
							dangerouslySetInnerHTML: { __html: a(n) }
						}),
						/* @__PURE__ */ (0, R.jsxs)("div", {
							"data-media-byline": "",
							children: [/* @__PURE__ */ (0, R.jsx)("span", {
								"data-media-who": "",
								children: n.library_id ? /* @__PURE__ */ (0, R.jsx)(d, { item: n }) : u[n.location] ?? n.location
							}), /* @__PURE__ */ (0, R.jsx)("span", {
								"data-media-facts": "",
								children: /* @__PURE__ */ (0, R.jsxs)("span", {
									"data-media-size": "",
									children: [/* @__PURE__ */ (0, R.jsx)(l, { name: "hard-drive" }), Number(n.size) > 0 ? E(Number(n.size)) : M("manage:hdUpgrades.unknownSize")]
								})
							})]
						}),
						/* @__PURE__ */ (0, R.jsx)(t, {
							tags: z(n.reason),
							label: (e) => e,
							readOnly: !0,
							title: n.reason || void 0
						})
					]
				})
			}),
			/* @__PURE__ */ (0, R.jsxs)("div", {
				"data-jav-actions": "",
				className: "flex flex-wrap gap-2",
				children: [n.code ? /* @__PURE__ */ (0, R.jsx)(e, {
					variant: "secondary",
					size: h ? "small" : "medium",
					onClick: b,
					children: M("manage:resourceSearch.searchTorrents")
				}) : null, /* @__PURE__ */ (0, R.jsx)(e, {
					variant: "secondary",
					size: h ? "small" : "medium",
					onClick: v,
					children: M("manage:hdUpgrades.viewEditions")
				})]
			})
		]
	});
}
function H({ toast: t, ...s }) {
	let [c, l] = (0, L.useState)(null), [S, D] = (0, L.useState)(/* @__PURE__ */ new Map()), k = ae(() => D(/* @__PURE__ */ new Map())), [A, j] = (0, L.useState)(null), N = ie(), [P, F] = (0, L.useState)({}), H = JSON.stringify(P), U = H !== "{}", [W, de] = (0, L.useState)(""), G = oe({
		queryKey: U || W ? [
			...m,
			H,
			W
		] : m,
		queryFn: ({ signal: e }) => te(e, U ? P : void 0, W),
		placeholderData: (e) => e
	}), K = se("quality-goals", {
		size: (e) => Number(e.size || 0),
		dur: (e) => Number(e.duration || 0),
		new: (e) => e.id
	}), q = G.data, J = K.sort(q?.items || []), Y = (e, t) => {
		e.length && C();
		let n = new Set(e);
		D((e) => new Map([...t ? e : [], ...J.filter((e) => n.has(e.id)).map((e) => [e.id, e])]));
	}, fe = ce(!G.isFetching && !G.isError ? (e, t) => Y(e.map(Number), t) : void 0, { selecting: k });
	if (G.isPending) return /* @__PURE__ */ (0, R.jsx)(I, { children: /* @__PURE__ */ (0, R.jsx)("div", { dangerouslySetInnerHTML: { __html: re("quality-goals", M("shell:spinner.loading"), ["w-20", "w-24"]) } }) });
	if (!q) return /* @__PURE__ */ (0, R.jsx)(I, { children: /* @__PURE__ */ (0, R.jsx)(f, {
		tone: "error",
		title: M("manage:hdUpgrades.loadFailed"),
		children: G.error ? w(G.error) : M("manage:hdUpgrades.notFound")
	}) });
	if (!J.length && N !== "list" && !U && !W) return /* @__PURE__ */ (0, R.jsx)(I, { children: /* @__PURE__ */ (0, R.jsx)(i, {
		icon: p,
		title: M("manage:hdUpgrades.emptyTitle"),
		children: M("manage:hdUpgrades.emptyBody")
	}) });
	let X = [...S.values()], Z = X.filter((e) => e.code), Q = (e) => {
		G.isFetching || G.isError || (e && C(), D((t) => {
			let n = new Map(t);
			for (let t of J) e ? n.set(t.id, t) : n.delete(t.id);
			return n;
		}));
	}, $ = (e, t) => {
		t && C(), D((n) => {
			let r = new Map(n), i = J.find((t) => t.id === e);
			return t && i ? r.set(e, i) : r.delete(e), r;
		});
	};
	return /* @__PURE__ */ (0, R.jsxs)("div", {
		"data-quality-goals": "",
		className: "mx-auto w-full max-w-board",
		children: [
			/* @__PURE__ */ (0, R.jsx)(a, {
				label: M("manage:hdUpgrades.summaryLabel"),
				topLabel: M("manage:hdUpgrades.summaryLabel"),
				top: null,
				attrs: {
					"data-catalog-frame": "",
					"data-filter-frame": ""
				},
				bottomClassName: "min-h-12",
				bottom: /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsxs)("span", {
					"data-catalog-summary": "",
					children: [
						/* @__PURE__ */ (0, R.jsxs)("span", {
							"data-catalog-readout": "",
							role: "status",
							children: [
								M("manage:hdUpgrades.summaryLabel"),
								" · ",
								M("manage:hdUpgrades.videoCount", { count: Number(q.total || 0) })
							]
						}),
						/* @__PURE__ */ (0, R.jsx)(o, {
							label: M("manage:hdUpgrades.search"),
							value: W,
							onQuery: (e) => {
								de(e), D(/* @__PURE__ */ new Map());
							}
						}),
						/* @__PURE__ */ (0, R.jsx)(y, {
							label: M("manage:hdUpgrades.selectAll"),
							picked: J.filter((e) => S.has(e.id)).length,
							total: J.length,
							onChange: Q
						})
					]
				}), /* @__PURE__ */ (0, R.jsxs)("span", {
					"data-entity-sorts": "",
					children: [/* @__PURE__ */ (0, R.jsx)(n, {}), /* @__PURE__ */ (0, R.jsx)(x, {
						sorts: K.sorts,
						onSort: K.onSort
					})]
				})] })
			}),
			N === "cards" && U ? /* @__PURE__ */ (0, R.jsx)("div", {
				className: "mb-4",
				children: /* @__PURE__ */ (0, R.jsx)(h, {
					table: "quality-goals",
					filters: P,
					onChange: F,
					valueLabel: (e, t) => e === "source" ? u[t] ?? t : t
				})
			}) : null,
			N === "list" ? /* @__PURE__ */ (0, R.jsx)(v, {
				table: "quality-goals",
				label: M("manage:hdUpgrades.summaryLabel"),
				items: J,
				selected: new Set(S.keys()),
				selecting: k,
				contextOperations: (e) => V(e, S.has(e.id), () => s.openItem(e.id), () => l(B(e, s.javDisplayName(e))), () => $(e.id, !S.has(e.id))),
				busy: G.isFetching,
				filters: {
					values: P,
					facets: q.column_facets ?? {},
					onChange: F
				},
				filterColumns: {
					size: {
						range: "size",
						value: (e) => e.size
					},
					dur: {
						range: "duration",
						value: (e) => e.duration || null
					},
					source: {
						values: (e) => e.location,
						option: (e) => {
							let t = ne(e);
							return {
								label: u[e] || e,
								leading: /* @__PURE__ */ (0, R.jsx)(t, {})
							};
						}
					},
					reason: {
						values: (e) => z(e.reason),
						option: (e) => ({ label: e === "none" ? M("cleanup:shared.none") : e })
					}
				},
				sort: {
					options: K.sorts.map(({ key: e, label: t }) => ({
						id: e,
						label: t
					})),
					sorting: K.sorting,
					onChange: K.setSorting
				},
				rowLabel: (e) => M("manage:hdUpgrades.selectVideo", { title: s.javDisplayName(e) }),
				onPick: (e, t) => $(e.id, t),
				onPickAll: Q,
				onRectangle: Y,
				cells: {
					name: (e) => /* @__PURE__ */ (0, R.jsx)(g, {
						name: s.javDisplayName(e),
						onOpen: () => s.openItem(e.id),
						picture: /* @__PURE__ */ (0, R.jsx)(_, {
							src: O(e),
							glyph: "film"
						})
					}),
					library: (e) => /* @__PURE__ */ (0, R.jsx)(d, { item: e }),
					source: (e) => /* @__PURE__ */ (0, R.jsxs)("span", {
						className: "inline-flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, R.jsx)("span", {
							className: "contents",
							dangerouslySetInnerHTML: { __html: s.srcBadge(e.location, e.cost) }
						}), u[e.location] ?? e.location]
					}),
					dur: (e) => T(e.duration) || "—",
					size: (e) => Number(e.size) > 0 ? E(Number(e.size)) : "—",
					reason: (e) => e.reason || "—",
					actions: (t) => /* @__PURE__ */ (0, R.jsxs)("span", {
						className: "flex gap-2",
						children: [t.code ? /* @__PURE__ */ (0, R.jsx)(e, {
							variant: "secondary",
							size: "small",
							onClick: () => l(B(t, s.javDisplayName(t))),
							children: M("manage:resourceSearch.searchTorrents")
						}) : null, /* @__PURE__ */ (0, R.jsx)(e, {
							variant: "secondary",
							size: "small",
							onClick: () => s.openItem(t.id),
							children: M("manage:hdUpgrades.viewEditions")
						})]
					})
				}
			}) : J.length ? /* @__PURE__ */ (0, R.jsx)("div", {
				"data-media-grid": "",
				"data-select-mode": k ? "" : void 0,
				...fe,
				children: J.map((e) => /* @__PURE__ */ (0, R.jsx)(ue, {
					item: e,
					...s,
					searchResources: l,
					picked: S.has(e.id),
					onPick: (t) => $(e.id, t),
					selecting: k
				}, e.id))
			}) : /* @__PURE__ */ (0, R.jsx)(i, {
				icon: p,
				title: M("shell:dataTable.empty"),
				children: null
			}),
			/* @__PURE__ */ (0, R.jsxs)(b, {
				visible: X.length > 0,
				label: M("manage:hdUpgrades.dockLabel"),
				count: M("manage:hdUpgrades.selectedCount", { count: X.length }),
				actions: [],
				children: [/* @__PURE__ */ (0, R.jsx)(e, {
					size: "small",
					variant: "secondary",
					disabled: !Z.length,
					onClick: () => j(Z.map((e) => ({
						id: e.id,
						code: e.code,
						title: s.javDisplayName(e),
						release_date: void 0
					}))),
					children: M("manage:resourceSearch.searchTorrents")
				}), /* @__PURE__ */ (0, R.jsx)(e, {
					size: "small",
					variant: "ghost",
					onClick: ee,
					children: M("manage:hdUpgrades.clearSelection")
				})]
			}),
			/* @__PURE__ */ (0, R.jsx)(le, {
				items: A,
				close: () => j(null),
				readOnly: !1,
				receipt: t
			}),
			G.isError ? /* @__PURE__ */ (0, R.jsx)(f, {
				tone: "error",
				children: w(G.error)
			}) : null,
			Number(q.total || 0) > J.length ? /* @__PURE__ */ (0, R.jsx)("p", {
				className: "mt-6 text-center text-caption-1-regular text-text-secondary",
				children: M("manage:hdUpgrades.showingFirst", {
					shown: J.length.toLocaleString(),
					count: Number(q.total)
				})
			}) : null,
			/* @__PURE__ */ (0, R.jsx)(r, {
				prefill: c,
				close: () => l(null),
				receipt: t
			})
		]
	});
}
export { H as QualityGoalsPage };

//# debugId=92a7117d-6e3e-40db-8e19-24fe164f3c5b
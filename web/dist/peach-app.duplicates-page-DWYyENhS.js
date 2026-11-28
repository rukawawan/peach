(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "11d2b264-c108-4a7e-adca-4ef1a270b502", e._sentryDebugIdIdentifier = "sentry-dbid-11d2b264-c108-4a7e-adca-4ef1a270b502");
	} catch {}
})();
import { Button as e, Checkbox as t, DUPLICATES_KEY as n, EmptyState as r, FilterActionButton as i, FilterGlassRows as a, FilterSearch as o, Gg as ee, H7 as te, JZ as ne, KEEP_LABELS as s, KEPT_DUPLICATES_KEY as c, LOC as l, M6 as re, MEDIA_SOURCES_KEY as u, MEDIA_SOURCE_ICONS as d, Note as f, SelectAllButton as p, SelectionDock as m, SortKeys as ie, SourceLabel as ae, SourceMark as h, TRASH_KEY as g, __toESM as oe, batchOperate as _, bulkCloudPreferences as se, busyProps as ce, cardClass as le, cloudLocations as ue, confirmModal as de, coverUrl as v, duplicateVictims as y, duplicatesSkeleton as fe, enterPageSelection as b, errorMessage as pe, exitPageSelection as me, fetchDuplicates as he, fetchKeptDuplicates as ge, fetchMediaSources as _e, fmtDur as ve, fmtSize as x, groupKey as S, keepGroup as ye, keepGroups as C, mixedCloudPreferences as be, queryClient as w, qx as xe, require_jsx_runtime as Se, require_react as T, runBulkAction as Ce, spriteGlyph as E, t as D, useMutation as we, usePageSelection as Te, useQuery as O, useQueueSort as Ee, useRectangleSelection as De, useWorkContextMenu as Oe, victimBytes as k } from "./peach-app.js";
import { ComparisonText as A } from "./peach-app.comparison-text-CyF--PA8.js";
// src/react/components/filename-comparison.tsx
var j = /* @__PURE__ */ oe(T(), 1), M = Se();
function N({ value: e, reference: t, onOpen: n }) {
	return /* @__PURE__ */ (0, M.jsx)("button", {
		type: "button",
		onClick: n,
		title: e,
		"aria-label": e,
		"data-duplicate-filename": "",
		onCopy: (t) => {
			t.clipboardData.setData("text/plain", e), t.preventDefault();
		},
		className: "min-w-0 cursor-pointer wrap-anywhere text-left text-body-regular hover:text-text-secondary",
		children: /* @__PURE__ */ (0, M.jsx)(A, {
			value: e,
			reference: t
		})
	});
}
// src/react/duplicates/duplicates-page.tsx
var P = E("play"), F = E("file-stack"), ke = le({
	padding: "none",
	radius: "surface",
	className: "mb-6 overflow-hidden dark:bg-background-primary-default"
}), I = "rounded-sm px-1.5 py-px text-caption-1-regular leading-5", L = "rounded-sm px-2 py-0.5 text-caption-1-regular leading-5", R = "font-mono text-caption-1-regular leading-5 text-text-secondary", z = () => {
	w.invalidateQueries({ queryKey: n }), w.invalidateQueries({
		queryKey: g,
		exact: !0
	});
}, Ae = (e) => e.reduce((e, t) => e + t.files.length, 0);
function B(e, t) {
	let n = [];
	return {
		key: `keep-${e}`,
		label: t,
		reversal: "undo",
		danger: e === "all",
		holdToConfirm: !0,
		confirm: (t) => {
			let n = y(t, e);
			return {
				title: D("cleanup:duplicates.moveToTrash"),
				danger: e === "all",
				body: D("cleanup:duplicates.trashBody", {
					count: n.length,
					groups: t.length,
					keep: s[e] ?? s.largest,
					size: x(k(t, n))
				})
			};
		},
		run: async (t) => (n = y(t, e), await _(n, "dispose"), z(), async () => {
			await _(n, "restore"), z();
		}),
		receipt: () => D("cleanup:duplicates.movedToTrash", { count: n.length })
	};
}
var je = (e) => ({
	key: "keep-all",
	label: e,
	reversal: "undo",
	confirm: (e) => ({
		title: D("cleanup:duplicates.markKeepAll"),
		body: D("cleanup:duplicates.keepAllBody", {
			count: e.length,
			files: Ae(e)
		}),
		recovery: D("cleanup:duplicates.keepAllRecovery")
	}),
	run: async (e) => (await C(e, !0), z(), async () => {
		await C(e, !1), z();
	}),
	receipt: (e) => D("cleanup:duplicates.keptGroups", { count: e.length })
}), Me = (e) => ({
	key: "unkeep",
	label: e,
	reversal: "undo",
	confirm: (e) => ({
		title: D("cleanup:duplicates.unkeep"),
		body: D("cleanup:duplicates.unkeepBody", { count: e.length })
	}),
	run: async (e) => (await C(e, !1), z(), async () => {
		await C(e, !0), z();
	}),
	receipt: (e) => D("cleanup:duplicates.unkeptGroups", { count: e.length })
});
function Ne(e) {
	return e.identical ? /* @__PURE__ */ (0, M.jsx)("span", {
		className: `${L} text-(--keep)`,
		children: D("cleanup:duplicates.sha1Match")
	}) : /* @__PURE__ */ (0, M.jsx)("span", {
		className: `${L} text-text-secondary`,
		children: e.evidence === "same_code_short_copy" ? D("cleanup:duplicates.sameCodeShorter") : D("cleanup:duplicates.byDuration")
	});
}
function Pe({ file: e, reference: n, openItem: r, selected: i, onSelect: a, onTrash: o, busy: ne }) {
	let s = Oe(), c = () => r(e.id), u = [{
		id: "open",
		label: D("catalog:mediaActions.open"),
		icon: ee,
		run: c
	}];
	a && u.push({
		id: "select",
		label: D(i ? "catalog:mediaActions.deselect" : "catalog:mediaActions.select"),
		icon: te,
		run: () => a(!i)
	}), o && u.push({
		id: "trash",
		label: D("cleanup:duplicates.moveToTrash"),
		icon: re,
		danger: !0,
		disabled: ne,
		run: o
	});
	let f = {
		key: e.id,
		operations: u
	}, p = l[e.location] || e.location || e.drive, m = `/thumb?id=${e.id}&c=4`;
	return /* @__PURE__ */ (0, M.jsxs)("div", {
		"data-duplicate-file": e.id,
		"data-rectangle-key": e.id,
		className: "duplicate-row items-center gap-3 border-t border-separator-border px-5 py-4 max-compact:p-4",
		onContextMenu: (e) => s.onContextMenu(e, f),
		onKeyDown: (e) => s.onKeyDown(e, f),
		children: [
			s.menu,
			/* @__PURE__ */ (0, M.jsxs)("button", {
				type: "button",
				onClick: c,
				"aria-label": D("cleanup:duplicates.previewFile", { name: e.name }),
				className: "relative row-span-2 inline-grid aspect-16/10 w-full cursor-pointer place-items-center overflow-hidden rounded-2lg bg-media-placeholder text-text-secondary",
				children: [/* @__PURE__ */ (0, M.jsx)(P, {
					"aria-hidden": !0,
					className: "size-6"
				}), /* @__PURE__ */ (0, M.jsx)("img", {
					src: e.has_cover ? v(e, 2) : m,
					alt: "",
					loading: "lazy",
					"data-drop": "self",
					"data-fallbacks": e.has_cover ? m : void 0,
					className: "absolute inset-0 size-full object-contain"
				}, e.cover_version || m)]
			}),
			/* @__PURE__ */ (0, M.jsxs)("span", {
				className: "flex min-w-0 items-start gap-2 max-duplicate-narrow:col-start-2 max-duplicate-narrow:-col-end-1",
				children: [a ? /* @__PURE__ */ (0, M.jsx)(t, {
					slot: null,
					"aria-label": D("cleanup:duplicates.selectFile", { name: e.name }),
					isSelected: i,
					onChange: a
				}) : null, /* @__PURE__ */ (0, M.jsxs)("span", {
					className: "flex min-w-0 flex-1 flex-wrap items-start gap-x-2 gap-y-1",
					children: [/* @__PURE__ */ (0, M.jsx)(N, {
						value: e.name,
						reference: n?.name,
						onOpen: c
					}), e.is_largest || e.is_longest || e.is_new ? /* @__PURE__ */ (0, M.jsxs)("span", {
						className: "flex max-w-full flex-wrap gap-1",
						children: [
							e.is_new ? /* @__PURE__ */ (0, M.jsx)("i", {
								className: `${I} not-italic bg-background-primary-hover text-text-primary`,
								children: D("cleanup:duplicates.newCopy")
							}) : null,
							e.is_largest ? /* @__PURE__ */ (0, M.jsx)("i", {
								className: `${I} not-italic bg-background-primary-hover text-text-secondary`,
								children: D("cleanup:duplicates.largest")
							}) : null,
							e.is_longest ? /* @__PURE__ */ (0, M.jsx)("i", {
								className: `${I} not-italic bg-(--keep)/22 text-(--keep)`,
								children: D("cleanup:duplicates.longest")
							}) : null
						]
					}) : null]
				})]
			}),
			/* @__PURE__ */ (0, M.jsxs)("span", {
				className: `${R} flex min-w-0 items-center gap-1.5`,
				children: [/* @__PURE__ */ (0, M.jsx)(h, { mark: d[e.location] || "database" }), /* @__PURE__ */ (0, M.jsx)("span", {
					title: p,
					className: "min-w-0 truncate",
					children: p
				})]
			}),
			/* @__PURE__ */ (0, M.jsx)("span", {
				className: R,
				children: x(e.size || 0)
			}),
			/* @__PURE__ */ (0, M.jsx)("span", {
				className: R,
				children: ve(e.duration)
			}),
			/* @__PURE__ */ (0, M.jsx)("span", {
				className: `${R} col-start-2 -col-end-1 min-w-0 pt-0.5 wrap-anywhere max-duplicate-narrow:col-span-full`,
				children: /* @__PURE__ */ (0, M.jsx)(A, {
					value: e.path ?? "",
					reference: n?.path ?? void 0
				})
			})
		]
	});
}
function Fe({ children: e, commit: t, selecting: n }) {
	let r = De(t, {
		selecting: n,
		items: "[data-duplicate-file][data-rectangle-key]"
	});
	return /* @__PURE__ */ (0, M.jsx)("div", {
		...r,
		children: e
	});
}
function V({ openItem: ee, toast: d, failure: h }) {
	let g = Oe(), [oe, le] = (0, j.useState)("pending"), [v, ve] = (0, j.useState)(""), C = O({
		queryKey: v ? [...n, v] : n,
		queryFn: ({ signal: e }) => he(e, v),
		placeholderData: (e) => e
	}), w = O({
		queryKey: v ? [...c, v] : c,
		queryFn: ({ signal: e }) => ge(e, v),
		enabled: oe === "kept",
		placeholderData: (e) => e
	}), Se = O({
		queryKey: u,
		queryFn: ({ signal: e }) => _e(e)
	}), [T, E] = (0, j.useState)(""), [A, N] = (0, j.useState)(/* @__PURE__ */ new Set()), [P, I] = (0, j.useState)(/* @__PURE__ */ new Set()), R = Te(() => {
		N(/* @__PURE__ */ new Set()), I(/* @__PURE__ */ new Set());
	}), Ae = De(T ? void 0 : (e, t) => N((n) => /* @__PURE__ */ new Set([...t ? n : [], ...e])), {
		selecting: R,
		items: "[data-duplicate-group-tools][data-rectangle-key]"
	}), V = {
		receipt: d,
		failure: (e) => h(D("cleanup:duplicates.bulkFailed"), e)
	}, H = we({
		mutationFn: (e) => _(e, "dispose"),
		onSuccess: (e, t) => {
			I((e) => new Set([...e].filter((e) => !t.includes(e)))), z(), d(D("cleanup:duplicates.movedToTrash", { count: t.length }), { undo: async () => {
				try {
					await _(t, "restore");
				} catch (e) {
					h(D("cleanup:duplicates.undoTrash"), e);
				} finally {
					z();
				}
			} });
		},
		onSettled: () => E("")
	}), U = we({
		mutationFn: ({ group: e, on: t }) => ye(e.files.map((e) => e.id), t),
		onSuccess: (e, { group: t, on: n }) => {
			z(), d(D(n ? "cleanup:duplicates.keptAll" : "cleanup:duplicates.unkeptOne", { code: t.code }), { undo: async () => {
				try {
					await ye(t.files.map((e) => e.id), !n);
				} catch (e) {
					h(D("cleanup:duplicates.undoKeepAll"), e);
				} finally {
					z();
				}
			} });
		},
		onError: (e) => h(D("cleanup:duplicates.markKeepAll"), e),
		onSettled: () => E("")
	}), W = Ee("duplicates", { size: (e) => Number(e.reclaimable || 0) }), G = oe === "kept", K = G ? w.data : C.data, Ie = G ? w.error : C.error;
	if (!K) return G && w.isPending ? /* @__PURE__ */ (0, M.jsx)("div", {
		role: "status",
		"aria-label": D("shell:spinner.loading"),
		"aria-busy": "true",
		children: /* @__PURE__ */ (0, M.jsx)("div", {
			"aria-hidden": "true",
			inert: !0,
			dangerouslySetInnerHTML: { __html: fe() }
		})
	}) : /* @__PURE__ */ (0, M.jsx)("div", {
		className: "mx-auto w-full max-w-board",
		children: /* @__PURE__ */ (0, M.jsx)(f, {
			tone: "error",
			title: D("cleanup:duplicates.loadFailed"),
			children: Ie ? pe(Ie) : D("cleanup:duplicates.listUnavailable")
		})
	});
	let q = W.sort(K.groups ?? []), Le = Number(C.data?.kept ?? K.kept ?? 0), J = ue(Se.data), Y = q.filter((e) => A.has(S(e))), Re = (e) => {
		N(/* @__PURE__ */ new Set()), I(/* @__PURE__ */ new Set()), le(e);
	}, ze = (e, t) => {
		t && b(), N((n) => {
			let r = new Set(n);
			return t ? r.add(S(e)) : r.delete(S(e)), r;
		});
	}, X = (e, t) => {
		T || (E(t), Ce(e, q, V).catch(V.failure).finally(() => E("")));
	}, Z = ({ groups: e, keep: t, key: n }) => {
		if (H.isPending) return;
		let r = y(e, t);
		r.length && de({
			title: D("cleanup:duplicates.moveToTrash"),
			body: D("cleanup:duplicates.trashBody", {
				count: r.length,
				groups: e.length,
				keep: s[t] ?? s.largest,
				size: x(k(e, r))
			}) + D("shell:bulkAction.canUndo"),
			confirmLabel: D("cleanup:duplicates.moveToTrash"),
			holdToConfirm: !0,
			onConfirm: () => (E(n), H.mutateAsync(r))
		});
	}, Be = (e, t) => {
		t && b(), I((n) => {
			let r = new Set(n);
			return t ? r.add(e) : r.delete(e), r;
		});
	}, Ve = (e, t, n = P) => {
		if (T) return;
		let r = e.files.filter((e) => n.has(e.id)).map((e) => e.id);
		r.length && de({
			title: D("cleanup:duplicates.moveToTrash"),
			body: D("cleanup:duplicates.selectedTrashBody", {
				count: r.length,
				remaining: e.files.length - r.length,
				size: x(k([e], r))
			}) + D("shell:bulkAction.canUndo"),
			confirmLabel: D("cleanup:duplicates.moveToTrash"),
			holdToConfirm: !0,
			onConfirm: () => (E(t), H.mutateAsync(r))
		});
	}, Q = (e) => ce(T === e && (H.isPending || U.isPending)), $ = (e, t, n) => {
		U.isPending || H.isPending || (E(t), U.mutate({
			group: e,
			on: n
		}));
	}, He = /* @__PURE__ */ (0, M.jsx)(p, {
		label: D("cleanup:duplicates.selectPage"),
		picked: Y.length,
		total: q.length,
		onChange: (e) => {
			e && b(), N(e ? new Set(q.map(S)) : /* @__PURE__ */ new Set());
		}
	}), Ue = G ? [Me(D("cleanup:duplicates.unkeep"))] : [
		B("largest", D("cleanup:duplicates.keepLargest")),
		B("longest", D("cleanup:duplicates.keepLongest")),
		...se(Y, J).map((e) => B(e, D("cleanup:duplicates.keepStorage", { storage: l[e] || e }))),
		je(D("cleanup:duplicates.keepAll")),
		B("all", D("cleanup:duplicates.trashGroup"))
	];
	return /* @__PURE__ */ (0, M.jsxs)("div", {
		className: "mx-auto w-full max-w-board pb-10.5",
		children: [
			g.menu,
			/* @__PURE__ */ (0, M.jsx)(a, {
				label: D(G ? "cleanup:duplicates.keptLabel" : "cleanup:duplicates.bulkKeep"),
				topLabel: D(G ? "cleanup:duplicates.keptLabel" : "cleanup:duplicates.bulkKeep"),
				attrs: {
					"data-catalog-frame": "",
					"data-filter-frame": "",
					"data-duplicates-frame": ""
				},
				bottomClassName: "min-h-12",
				top: G ? /* @__PURE__ */ (0, M.jsxs)(M.Fragment, { children: [
					q.length ? /* @__PURE__ */ (0, M.jsx)(i, {
						busy: T === "all:unkeep",
						onPress: () => X(Me(D("cleanup:duplicates.allUnkeep")), "all:unkeep"),
						children: D("cleanup:duplicates.allUnkeep")
					}) : null,
					/* @__PURE__ */ (0, M.jsx)("span", { className: "ml-auto" }),
					/* @__PURE__ */ (0, M.jsx)(i, {
						onPress: () => Re("pending"),
						children: D("cleanup:duplicates.backToPending")
					})
				] }) : /* @__PURE__ */ (0, M.jsxs)(M.Fragment, { children: [
					q.length ? /* @__PURE__ */ (0, M.jsxs)(M.Fragment, { children: [
						/* @__PURE__ */ (0, M.jsx)(i, {
							busy: T === "all:largest",
							onPress: () => X(B("largest", ""), "all:largest"),
							children: D("cleanup:duplicates.allKeepLargest")
						}),
						/* @__PURE__ */ (0, M.jsx)(i, {
							busy: T === "all:longest",
							onPress: () => X(B("longest", ""), "all:longest"),
							children: D("cleanup:duplicates.allKeepLongest")
						}),
						se(q, J).map((e) => /* @__PURE__ */ (0, M.jsx)(i, {
							busy: T === `all:${e}`,
							onPress: () => X(B(e, ""), `all:${e}`),
							children: /* @__PURE__ */ (0, M.jsx)(ae, {
								source: e,
								label: D("cleanup:duplicates.allPreferStorage", { storage: l[e] || e })
							})
						}, e)),
						/* @__PURE__ */ (0, M.jsx)(i, {
							busy: T === "all:keep",
							onPress: () => X(je(""), "all:keep"),
							children: D("cleanup:duplicates.allKeepAll")
						})
					] }) : null,
					/* @__PURE__ */ (0, M.jsx)("span", { className: "ml-auto" }),
					/* @__PURE__ */ (0, M.jsx)(i, {
						onPress: () => Re("kept"),
						children: D("cleanup:duplicates.viewKept", { count: Le })
					})
				] }),
				bottom: /* @__PURE__ */ (0, M.jsxs)(M.Fragment, { children: [/* @__PURE__ */ (0, M.jsxs)("span", {
					"data-catalog-summary": "",
					children: [
						/* @__PURE__ */ (0, M.jsxs)("span", {
							"data-catalog-readout": "",
							role: "status",
							children: [
								D(G ? "cleanup:duplicates.keptLabel" : "cleanup:duplicates.summaryLabel"),
								" · ",
								D("cleanup:duplicates.groupCount", { count: Number(K.total || 0) }),
								" · ",
								G ? D("cleanup:duplicates.keptDetail", { count: Number(K.files || 0) }) : D("cleanup:duplicates.summaryDetail", {
									count: Number(K.files || 0),
									size: x(K.reclaimable)
								})
							]
						}),
						/* @__PURE__ */ (0, M.jsx)(o, {
							label: D("cleanup:duplicates.search"),
							value: v,
							onQuery: (e) => {
								ve(e), N(/* @__PURE__ */ new Set()), I(/* @__PURE__ */ new Set());
							}
						}),
						q.length ? He : null
					]
				}), /* @__PURE__ */ (0, M.jsx)("span", {
					"data-entity-sorts": "",
					children: /* @__PURE__ */ (0, M.jsx)(ie, {
						sorts: W.sorts,
						onSort: W.onSort
					})
				})] })
			}),
			/* @__PURE__ */ (0, M.jsx)(m, {
				label: D("cleanup:duplicates.dockLabel"),
				visible: Y.length > 0,
				count: D("cleanup:duplicates.selectedGroups", { count: Y.length }),
				actions: Ue.map((e) => ({
					action: e,
					items: Y,
					host: V,
					done: () => N(/* @__PURE__ */ new Set())
				})),
				children: /* @__PURE__ */ (0, M.jsx)(e, {
					variant: "ghost",
					size: "small",
					onClick: me,
					children: D("cleanup:duplicates.clearSelection")
				})
			}),
			H.isError ? /* @__PURE__ */ (0, M.jsx)("div", {
				className: "mb-5",
				children: /* @__PURE__ */ (0, M.jsx)(f, {
					tone: "error",
					title: D("cleanup:duplicates.trashFailed"),
					children: pe(H.error)
				})
			}) : null,
			q.length ? /* @__PURE__ */ (0, M.jsx)("div", {
				"data-rectangle-gutter": "",
				className: "flow-root",
				...Ae,
				children: q.map((n, r) => {
					let i = [n], a = (e) => `${r}:${e}`, o = A.has(S(n)), s = () => {
						let e = [{
							id: "select",
							label: o ? D("catalog:mediaActions.deselect") : D("cleanup:duplicates.selectGroup", { code: n.code }),
							icon: te,
							run: () => ze(n, !o)
						}, {
							id: "keep",
							label: D(G ? "cleanup:duplicates.unkeep" : "cleanup:duplicates.keepAll"),
							icon: G ? ne : xe,
							disabled: !!T,
							run: () => $(n, a("keep"), !G)
						}];
						if (!G) {
							let t = [
								["largest", D("cleanup:duplicates.keepLargest")],
								["longest", D("cleanup:duplicates.keepLongest")],
								...be(n.files, J).map((e) => [e, D("cleanup:duplicates.keepStorage", { storage: l[e] || e })]),
								["all", D("cleanup:duplicates.trashGroup")]
							];
							for (let [n, r] of t) e.push({
								id: n,
								label: r,
								icon: n === "all" ? re : xe,
								danger: n === "all",
								disabled: !!T,
								run: () => Z({
									groups: i,
									keep: n,
									key: a(n)
								})
							});
						}
						return {
							key: S(n),
							operations: e
						};
					};
					return /* @__PURE__ */ (0, M.jsxs)("section", {
						"aria-label": n.code,
						className: ke,
						"data-board-selected": A.has(S(n)) || void 0,
						children: [/* @__PURE__ */ (0, M.jsxs)("div", {
							"data-duplicate-group-tools": "",
							"data-rectangle-key": S(n),
							className: "flex flex-wrap items-center gap-3 bg-background-tertiary-default p-5 max-compact:p-4 dark:bg-background-secondary-default",
							onContextMenu: (e) => g.onContextMenu(e, s()),
							onKeyDown: (e) => {
								(e.key === "ContextMenu" || e.shiftKey && e.key === "F10") && g.onKeyDown(e, s());
							},
							children: [
								/* @__PURE__ */ (0, M.jsx)(t, {
									slot: null,
									"aria-label": D("cleanup:duplicates.selectGroup", { code: n.code }),
									isSelected: A.has(S(n)),
									onChange: (e) => ze(n, e)
								}),
								/* @__PURE__ */ (0, M.jsx)("b", {
									className: "text-title-2-medium text-text-primary",
									children: n.code
								}),
								/* @__PURE__ */ (0, M.jsx)("span", {
									className: "font-mono text-caption-1-regular leading-5 text-text-primary",
									children: D("cleanup:duplicates.groupDetail", {
										count: Number(n.count || 0),
										size: x(n.reclaimable)
									})
								}),
								Ne(n),
								n.new_files ? /* @__PURE__ */ (0, M.jsx)("span", {
									className: `${L} text-text-primary`,
									children: D("cleanup:duplicates.newFiles", { count: n.new_files })
								}) : null,
								n.cross_drive ? /* @__PURE__ */ (0, M.jsx)("span", {
									className: `${L} text-text-secondary`,
									children: D("cleanup:duplicates.crossDrive", { drives: n.drives.join(" ") })
								}) : null,
								/* @__PURE__ */ (0, M.jsx)("span", {
									className: "ml-auto flex flex-wrap gap-2 max-compact:ml-0 max-compact:w-full",
									children: G ? /* @__PURE__ */ (0, M.jsx)(e, {
										variant: "secondary",
										size: "small",
										...Q(a("unkeep")),
										onClick: () => $(n, a("unkeep"), !1),
										children: D("cleanup:duplicates.unkeep")
									}) : /* @__PURE__ */ (0, M.jsxs)(M.Fragment, { children: [
										/* @__PURE__ */ (0, M.jsx)(e, {
											variant: "danger",
											size: "small",
											...Q(a("files")),
											disabled: T !== "" || !n.files.some((e) => P.has(e.id)),
											onClick: () => Ve(n, a("files")),
											children: D("cleanup:duplicates.trashSelectedFiles", { count: n.files.filter((e) => P.has(e.id)).length })
										}),
										/* @__PURE__ */ (0, M.jsx)(e, {
											variant: "secondary",
											size: "small",
											...Q(a("largest")),
											onClick: () => Z({
												groups: i,
												keep: "largest",
												key: a("largest")
											}),
											children: D("cleanup:duplicates.keepLargest")
										}),
										/* @__PURE__ */ (0, M.jsx)(e, {
											variant: "secondary",
											size: "small",
											...Q(a("longest")),
											onClick: () => Z({
												groups: i,
												keep: "longest",
												key: a("longest")
											}),
											children: D("cleanup:duplicates.keepLongest")
										}),
										be(n.files, J).map((t) => /* @__PURE__ */ (0, M.jsx)(e, {
											variant: "secondary",
											size: "small",
											...Q(a(t)),
											onClick: () => Z({
												groups: i,
												keep: t,
												key: a(t)
											}),
											children: /* @__PURE__ */ (0, M.jsx)(ae, {
												source: t,
												label: D("cleanup:duplicates.keepStorage", { storage: l[t] || t })
											})
										}, t)),
										/* @__PURE__ */ (0, M.jsx)(e, {
											variant: "secondary",
											size: "small",
											...Q(a("keep")),
											onClick: () => $(n, a("keep"), !0),
											children: D("cleanup:duplicates.keepAll")
										}),
										/* @__PURE__ */ (0, M.jsx)(e, {
											variant: "danger",
											size: "small",
											...Q(a("all")),
											onClick: () => Z({
												groups: i,
												keep: "all",
												key: a("all")
											}),
											children: D("cleanup:duplicates.trashGroup")
										})
									] })
								})
							]
						}), /* @__PURE__ */ (0, M.jsx)(Fe, {
							selecting: R,
							commit: !T && !G ? (e, t) => I((n) => /* @__PURE__ */ new Set([...t ? n : [], ...e.map(Number)])) : void 0,
							children: n.files.map((e) => /* @__PURE__ */ (0, M.jsx)(Pe, {
								file: e,
								reference: n.files.find((t) => t.id !== e.id),
								openItem: ee,
								selected: P.has(e.id),
								onSelect: G ? void 0 : (t) => Be(e.id, t),
								busy: !!T,
								onTrash: G ? void 0 : () => Ve(n, a("files"), /* @__PURE__ */ new Set([e.id]))
							}, e.id))
						})]
					}, S(n));
				})
			}) : v ? /* @__PURE__ */ (0, M.jsx)(r, {
				icon: F,
				title: D("cleanup:duplicates.noMatches"),
				actions: /* @__PURE__ */ (0, M.jsx)(e, {
					size: "small",
					onClick: () => ve(""),
					children: D("catalog:shared.clearFilters")
				}),
				children: null
			}) : G ? /* @__PURE__ */ (0, M.jsx)(r, {
				icon: F,
				title: D("cleanup:duplicates.keptEmptyTitle"),
				children: D("cleanup:duplicates.keptEmptyBody")
			}) : /* @__PURE__ */ (0, M.jsx)(r, {
				icon: F,
				title: D("cleanup:duplicates.emptyTitle"),
				children: D("cleanup:duplicates.emptyBody")
			}),
			q.length > 0 && K.total > q.length ? /* @__PURE__ */ (0, M.jsx)("p", {
				className: "text-center text-caption-1-regular text-text-secondary",
				children: D("cleanup:duplicates.topGroups", {
					shown: q.length.toLocaleString(),
					count: Number(K.total)
				})
			}) : null
		]
	});
}
export { V as DuplicatesPage };

//# debugId=11d2b264-c108-4a7e-adca-4ef1a270b502
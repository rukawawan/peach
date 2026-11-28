(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "b676a1b2-30d8-4aea-ad61-31d0f2ec8b60", e._sentryDebugIdIdentifier = "sentry-dbid-b676a1b2-30d8-4aea-ad61-31d0f2ec8b60");
	} catch {}
})();
import { $2ec61d1d4f780267$export$a8a3e93435678ff9 as e, $542a13ca2fa5b484$export$5b6b19405a83ff9d as t, Button as n, EmptyFocusButton as r, EmptyState as i, IndexSearch as a, Input as o, MENU_ITEM as s, MENU_ITEM_INTERACTIVE as c, MENU_POPOVER_SURFACE as l, MenuDialog as u, MixCard as d, ModalFrame as f, ObjectOrderDialog as p, PLAYLISTS_KEY as m, RetryNote as h, __toESM as g, busyProps as _, confirmModal as v, createPlaylist as y, cx as b, deletePlaylist as x, errorMessage as S, fetchPlaylist as C, fetchPlaylists as w, keepPlaylist as T, posterUrl as E, recreatePlaylist as D, refreshPlaylists as O, renamePlaylist as k, reorderPlaylist as A, require_jsx_runtime as j, require_react as M, resumeAssetId as N, spriteGlyph as P, t as F, useMutation as I, useQuery as L } from "./peach-app.js";
// src/react/playlists/playlists-page.tsx
var R = /* @__PURE__ */ g(M(), 1), z = j(), B = P("ellipsis"), V = P("pencil"), H = P("trash"), U = P("playlist"), W = b(s, c, "text-body-2-medium"), G = F("catalog:playlistsPage.nameRequired"), K = (e) => async () => {
	try {
		await e();
	} finally {
		O();
	}
};
function q({ toast: e }) {
	let [t, r] = (0, R.useState)(""), [i, a] = (0, R.useState)(""), s = I({
		mutationFn: (e) => y(e),
		onSuccess: (t) => {
			r(""), a(""), O(), e(F("catalog:playlistsPage.created"), { undo: K(() => x(t.playlist.id)) });
		},
		onError: (e) => a(S(e) || F("catalog:playlistsPage.createFailed"))
	});
	return /* @__PURE__ */ (0, z.jsxs)("form", {
		"data-playlist-create": "",
		"aria-label": F("catalog:playlistsPage.create"),
		onSubmit: (e) => {
			e.preventDefault(), s.isPending || (t.trim() ? s.mutate(t) : a(G));
		},
		className: "flex flex-wrap items-end gap-2",
		children: [/* @__PURE__ */ (0, z.jsx)("div", {
			className: "min-w-50 max-w-80 flex-1 basis-50 max-board-narrow:min-w-0 max-board-narrow:max-w-none",
			children: /* @__PURE__ */ (0, z.jsx)(o, {
				label: F("catalog:playlistsPage.newPlaylistLabel"),
				placeholder: F("catalog:playlistsPage.enterName"),
				maxLength: 80,
				value: t,
				onChange: (e) => {
					r(e), a("");
				},
				validationBehavior: "aria",
				isInvalid: !!i,
				hint: i || void 0
			})
		}), /* @__PURE__ */ (0, z.jsx)(n, {
			type: "submit",
			..._(s.isPending),
			children: F("catalog:playlistsPage.createButton")
		})]
	});
}
function J({ target: t, close: r, toast: i }) {
	let [a, s] = (0, R.useState)(""), [c, l] = (0, R.useState)(""), u = (0, R.useRef)(null);
	(0, R.useEffect)(() => {
		if (!t) return;
		s(t.name), l("");
		let e = requestAnimationFrame(() => {
			u.current?.focus(), u.current?.select();
		});
		return () => cancelAnimationFrame(e);
	}, [t]);
	let d = I({
		mutationFn: ({ row: e, value: t }) => k(e.id, t),
		onSuccess: (e, { row: t }) => {
			r(), O(), i(F("catalog:playlistsPage.renamed"), { undo: K(() => k(t.id, t.name)) });
		},
		onError: (e) => l(S(e))
	});
	return /* @__PURE__ */ (0, z.jsx)(f, {
		isOpen: !!t,
		onOpenChange: (e) => {
			e || r();
		},
		width: "form",
		children: /* @__PURE__ */ (0, z.jsxs)("form", {
			"data-playlist-rename": "",
			onSubmit: (e) => {
				if (e.preventDefault(), !t || d.isPending) return;
				let n = a.trim();
				n ? d.mutate({
					row: t,
					value: n
				}) : l(G);
			},
			className: "flex min-h-0 flex-col",
			children: [/* @__PURE__ */ (0, z.jsxs)("div", {
				className: "flex flex-col gap-4 p-5",
				children: [/* @__PURE__ */ (0, z.jsx)(e, {
					slot: "title",
					className: "text-title-2-semibold text-text-primary",
					children: F("catalog:playlistsPage.editName")
				}), /* @__PURE__ */ (0, z.jsx)(o, {
					ref: u,
					label: F("catalog:catalogList.sortName"),
					placeholder: F("catalog:playlistsPage.enterName"),
					maxLength: 80,
					value: a,
					onChange: (e) => {
						s(e), l("");
					},
					validationBehavior: "aria",
					isInvalid: !!c,
					hint: c || void 0
				})]
			}), /* @__PURE__ */ (0, z.jsxs)("div", {
				className: "flex justify-between gap-4 p-3",
				children: [/* @__PURE__ */ (0, z.jsx)(n, {
					variant: "secondary",
					onClick: r,
					children: F("catalog:shared.cancel")
				}), /* @__PURE__ */ (0, z.jsx)(n, {
					type: "submit",
					..._(d.isPending),
					children: F("catalog:playlistsPage.saveName")
				})]
			})]
		})
	});
}
function Y({ name: e, onRename: n, onDelete: r, onSort: i }) {
	let a = (0, R.useRef)(null), [o, s] = (0, R.useState)(!1), c = (e) => {
		s(!1), e();
	};
	return /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("button", {
		ref: a,
		type: "button",
		title: F("catalog:playlistsPage.moreActions"),
		"aria-label": F("catalog:playlistsPage.menuLabel", { name: e }),
		"aria-haspopup": "dialog",
		"aria-expanded": o,
		"data-playlist-menu": "",
		onClick: () => s(!0),
		className: "flex size-7.5 flex-none cursor-pointer items-center justify-center rounded-2lg text-foreground-icon-secondary outline-none transition-colors hover:bg-background-primary-hover hover:text-foreground-icon-primary aria-expanded:bg-background-primary-hover aria-expanded:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring",
		children: /* @__PURE__ */ (0, z.jsx)(B, {
			"aria-hidden": !0,
			className: "size-4.5"
		})
	}), /* @__PURE__ */ (0, z.jsx)(t, {
		triggerRef: a,
		isOpen: o,
		onOpenChange: s,
		placement: "bottom end",
		offset: 4,
		className: l,
		children: /* @__PURE__ */ (0, z.jsxs)(u, {
			"aria-label": F("catalog:playlistsPage.menuLabel", { name: e }),
			className: "flex w-37.5 flex-col gap-0.5 outline-none",
			children: [
				/* @__PURE__ */ (0, z.jsxs)("button", {
					type: "button",
					className: W,
					onClick: () => c(n),
					children: [/* @__PURE__ */ (0, z.jsx)(V, {
						"aria-hidden": !0,
						className: "size-(--icon-inline) shrink-0"
					}), F("catalog:playlistsPage.editName")]
				}),
				/* @__PURE__ */ (0, z.jsxs)("button", {
					type: "button",
					className: W,
					onClick: () => c(i),
					children: [/* @__PURE__ */ (0, z.jsx)(U, {
						"aria-hidden": !0,
						className: "size-(--icon-inline) shrink-0"
					}), F("catalog:playlistOrder.reorder")]
				}),
				/* @__PURE__ */ (0, z.jsxs)("button", {
					type: "button",
					className: W,
					onClick: () => c(r),
					children: [/* @__PURE__ */ (0, z.jsx)(H, {
						"aria-hidden": !0,
						className: "size-(--icon-inline) shrink-0"
					}), F("catalog:playlistsPage.delete")]
				})
			]
		})
	})] });
}
function X({ openPlaylist: e, openEntity: t, canFlip: o, toast: s, revision: c }) {
	let l = L({
		queryKey: m,
		queryFn: ({ signal: e }) => w(e)
	}), [u, f] = (0, R.useState)(null), [p, g] = (0, R.useState)(null), _ = (0, R.useRef)(c);
	(0, R.useEffect)(() => {
		_.current !== c && (_.current = c, O());
	}, [c]);
	let y = l.data, b = y?.items ?? [], [C, k] = (0, R.useState)(""), A = C ? b.filter((e) => e.name.toLocaleLowerCase().includes(C.toLocaleLowerCase())) : b, j = (e) => {
		v({
			title: F("catalog:playlistsPage.delete"),
			body: F("catalog:playlistsPage.deleteConfirmBody"),
			confirmLabel: F("catalog:playlistsPage.delete"),
			danger: !0,
			holdToConfirm: !0,
			onConfirm: async () => {
				let t = await T(e.id);
				await x(e.id), O(), s(F("catalog:playlistsPage.deleted"), t ? { undo: K(() => D(t)) } : void 0);
			}
		});
	};
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "w-full pt-1 pb-10.5",
		children: [
			/* @__PURE__ */ (0, z.jsxs)("header", {
				className: "mb-4 flex items-start justify-between gap-4.5 max-board-narrow:flex-col max-board-narrow:items-stretch",
				children: [/* @__PURE__ */ (0, z.jsxs)("div", { children: [/* @__PURE__ */ (0, z.jsx)("h2", {
					className: "mb-1 text-display-4-medium! text-text-primary",
					children: F("catalog:shared.playlists")
				}), /* @__PURE__ */ (0, z.jsx)("p", {
					className: "text-body-2-regular text-text-secondary",
					children: F("catalog:playlistsPage.description")
				})] }), /* @__PURE__ */ (0, z.jsx)(q, { toast: s })]
			}),
			/* @__PURE__ */ (0, z.jsx)("div", {
				className: "mx-auto w-full max-w-board",
				children: y ? b.length ? /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
					/* @__PURE__ */ (0, z.jsx)("div", {
						className: "mb-4 flex",
						children: /* @__PURE__ */ (0, z.jsx)(a, {
							label: F("catalog:playlistsPage.search"),
							value: C,
							onQuery: k
						})
					}),
					A.length ? null : /* @__PURE__ */ (0, z.jsx)(i, {
						size: "compact",
						icon: U,
						title: F("catalog:playlistsPage.noMatches"),
						actions: /* @__PURE__ */ (0, z.jsx)(n, {
							size: "small",
							onClick: () => k(""),
							children: F("catalog:shared.clearFilters")
						}),
						children: null
					}),
					/* @__PURE__ */ (0, z.jsx)("div", {
						"data-playlist-grid": "",
						className: "card-grid-cover gap-4.5",
						children: A.map((n) => {
							let r = N(n), i = n.name.trim() || F("catalog:playlistsPage.untitled"), a = () => f(n), s = () => g(n), c = () => j(n), l = [
								{
									id: "rename",
									label: F("catalog:playlistsPage.editName"),
									icon: V,
									run: a
								},
								{
									id: "sort",
									label: F("catalog:playlistOrder.reorder"),
									icon: U,
									run: s
								},
								{
									id: "delete",
									label: F("catalog:playlistsPage.delete"),
									icon: H,
									danger: !0,
									run: c
								}
							];
							return r && l.unshift({
								id: "open",
								label: F("catalog:mediaActions.open"),
								icon: P("play"),
								run: () => e(n.id, r)
							}), /* @__PURE__ */ (0, z.jsx)(d, {
								"data-playlist-card": String(n.id),
								name: i,
								caption: n.source_kind === "mix" ? F("catalog:playlistsPage.savedFromMix") : F("catalog:playlistsPage.manual"),
								count: n.item_count,
								poster: n.preview_asset_id ? E(n.preview_asset_id) : null,
								flipImages: async () => (n.preview_ids || []).map(E),
								canFlip: o,
								faces: n.faces || [],
								onOpenEntity: t,
								...r ? { onOpen: () => e(n.id, r) } : {},
								openLabel: F("catalog:playlistsPage.open", { name: i }),
								contextOperations: l,
								menu: /* @__PURE__ */ (0, z.jsx)(Y, {
									name: i,
									onRename: a,
									onDelete: c,
									onSort: s
								})
							}, n.id);
						})
					})
				] }) : /* @__PURE__ */ (0, z.jsx)(i, {
					icon: U,
					title: F("catalog:playlistsPage.emptyTitle"),
					actions: /* @__PURE__ */ (0, z.jsx)(r, {
						target: "[data-playlist-create] input",
						children: F("catalog:playlistsPage.create")
					}),
					children: F("catalog:playlistsPage.emptyHint")
				}) : l.isError ? /* @__PURE__ */ (0, z.jsx)(h, {
					message: S(l.error) || F("catalog:playlistsPage.loadFailed"),
					onRetry: () => void l.refetch()
				}) : null
			}),
			/* @__PURE__ */ (0, z.jsx)(J, {
				target: u,
				close: () => f(null),
				toast: s
			}),
			p ? /* @__PURE__ */ (0, z.jsx)(Z, {
				row: p,
				close: () => g(null),
				toast: s
			}, p.id) : null
		]
	});
}
function Z({ row: e, close: t, toast: r }) {
	let i = L({
		queryKey: ["playlist-order", e.id],
		queryFn: ({ signal: t }) => C(e.id, t),
		staleTime: 0,
		refetchOnWindowFocus: !1,
		refetchOnReconnect: !1
	}), a = i.data;
	return !a || i.isFetching ? /* @__PURE__ */ (0, z.jsx)(f, {
		isOpen: !0,
		onOpenChange: (e) => {
			e || t();
		},
		width: "form",
		label: F("catalog:playlistOrder.reorder"),
		children: /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "p-5",
			children: [i.isError ? /* @__PURE__ */ (0, z.jsx)(h, {
				message: S(i.error),
				onRetry: () => void i.refetch()
			}) : /* @__PURE__ */ (0, z.jsx)("p", {
				role: "status",
				children: F("catalog:playlistOrder.loading")
			}), /* @__PURE__ */ (0, z.jsx)(n, {
				variant: "secondary",
				onClick: t,
				children: F("catalog:shared.cancel")
			})]
		})
	}) : /* @__PURE__ */ (0, z.jsx)(p, {
		dropOnRow: !0,
		title: F("catalog:playlistOrder.dialogTitle", { name: e.name }),
		close: t,
		items: a.items.map((e) => ({
			id: String(e.id),
			name: e.title || e.name || F("catalog:playlistOrder.fallbackName", { id: e.id })
		})),
		save: async (t) => {
			await A(e.id, t.map(Number)), O(), r(F("catalog:playlistOrder.saved"), { undo: K(() => A(e.id, a.items.map((e) => e.id))) });
		}
	});
}
export { X as PlaylistsPage };

//# debugId=b676a1b2-30d8-4aea-ad61-31d0f2ec8b60
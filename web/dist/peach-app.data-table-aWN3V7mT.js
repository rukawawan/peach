(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "08049a4d-1354-4ab2-aae6-7fd0d8120a10", e._sentryDebugIdIdentifier = "sentry-dbid-08049a4d-1354-4ab2-aae6-7fd0d8120a10");
	} catch {}
})();
import { createPaginatedRowModel as e } from "./peach-app.createPaginatedRowModel-ClHnhG_T.js";
import { createSortedRowModel as t, useTableSelection as n } from "./peach-app.use-table-selection-BSdXI_Nc.js";
import { $76d00c5a4edb230a$export$76ccd210b9029917 as r, $76d00c5a4edb230a$export$816b5d811295e6bc as i, $76d00c5a4edb230a$export$b59bdbef9ce70de2 as a, $76d00c5a4edb230a$export$f6f0c3fe4ec306ea as o, $76d00c5a4edb230a$export$f850895b287ef28e as s, Button as c, Checkbox as l, ChevronSortDown as u, DataTableFooter as d, DataTableFrame as f, DataTableSort as p, SelectionDock as m, Table as h, TableColumnControls as g, TableColumnResizer as _, TableSelectionHeader as v, __toESM as y, cardClass as b, columnVisibilityFeature as x, createColumnHelper as S, flexRender as C, require_jsx_runtime as w, require_react as T, rowPaginationFeature as E, rowSelectionFeature as D, rowSortingFeature as O, tableFeatures as k, useTable as A, useTablePreferences as j } from "./peach-app.js";
// src/react/components/data-table.tsx
var M = /* @__PURE__ */ y(T(), 1), N = w(), P = k({
	rowSortingFeature: O,
	rowSelectionFeature: D,
	rowPaginationFeature: E,
	columnVisibilityFeature: x,
	sortedRowModel: t(),
	paginatedRowModel: e()
});
function F({ label: e, items: t, columns: y, rowId: x, rowLabel: w, selected: T, onSelected: E, actions: D, title: O = e, titleId: k, description: F, footerActions: I, toolbarActions: L, panel: R = !0, unit: z = "条记录" }) {
	let [B, V] = (0, M.useState)([]), H = (0, M.useMemo)(() => [{
		id: "select",
		label: "选择",
		width: 48,
		min: 48,
		max: 48,
		required: !0
	}, ...y.map((e, t) => ({
		...e,
		width: e.width ?? (t === 0 ? 320 : 160),
		min: e.min ?? (t === 0 ? 320 : 96),
		flex: e.flex ?? t === 0,
		required: t === 0
	}))], [y]), U = j(`data:${e}`, H), [W, G] = (0, M.useState)({
		pageIndex: 0,
		pageSize: 20
	}), K = n(() => E([])), q = Math.max(1, Math.ceil(t.length / W.pageSize)), J = Math.min(W.pageIndex, q - 1), Y = Object.fromEntries(T.map((e) => [e, !0])), X = (0, M.useMemo)(() => {
		let t = S();
		return t.columns([t.display({
			id: "select",
			header: ({ table: t }) => /* @__PURE__ */ (0, N.jsx)(v, {
				table: t,
				label: `全选${e}`
			}),
			cell: ({ row: e }) => /* @__PURE__ */ (0, N.jsx)(l, {
				slot: null,
				"aria-label": `选择 ${w(e.original)}`,
				isSelected: e.getIsSelected(),
				onChange: (t) => e.toggleSelected(t)
			})
		}), ...y.map((e) => t.accessor((t) => e.value?.(t) ?? "", {
			id: e.id,
			header: e.label,
			enableSorting: !!e.value,
			sortFn: (t, n) => {
				let r = e.value(t.original), i = e.value(n.original);
				return typeof r == "number" && typeof i == "number" ? r - i : String(r).localeCompare(String(i), "zh-CN", { numeric: !0 });
			},
			cell: ({ row: t }) => e.render(t.original)
		}))]);
	}, [
		y,
		e,
		w
	]), Z = A({
		features: P,
		data: t,
		columns: X,
		getRowId: x,
		state: {
			sorting: B,
			rowSelection: Y,
			pagination: {
				...W,
				pageIndex: J
			},
			columnVisibility: U.visibility
		},
		onColumnVisibilityChange: U.change,
		onSortingChange: (e) => {
			V(e), G((e) => ({
				...e,
				pageIndex: 0
			}));
		},
		onPaginationChange: G,
		enableRowSelection: !0,
		onRowSelectionChange: (e) => {
			let n = typeof e == "function" ? e(Y) : e;
			Object.values(n).some(Boolean) && K(), E(t.filter((e) => n[x(e)]).map(x));
		}
	}), Q = Z.getSelectedRowModel().rows.map((e) => e.original);
	return /* @__PURE__ */ (0, N.jsxs)("div", {
		"data-data-table-panel": R || void 0,
		className: R ? b({
			padding: "none",
			className: "flex flex-col gap-4 px-6 py-5 max-sm:px-4"
		}) : "flex min-w-0 flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, N.jsxs)("div", {
				"data-responsive-toolbar": "",
				role: "toolbar",
				"aria-label": `${e}工具栏`,
				children: [/* @__PURE__ */ (0, N.jsxs)("div", {
					"data-toolbar-heading": "",
					children: [/* @__PURE__ */ (0, N.jsx)("h3", {
						id: k,
						className: "text-title-2-medium text-text-primary",
						children: O
					}), /* @__PURE__ */ (0, N.jsx)("span", {
						className: "text-body-2-regular tabular-nums text-text-secondary",
						children: `${t.length.toLocaleString()} ${z}`
					})]
				}), /* @__PURE__ */ (0, N.jsxs)("div", {
					"data-toolbar-actions": "",
					children: [
						L,
						/* @__PURE__ */ (0, N.jsx)(g, {
							preferences: U,
							label: e
						}),
						/* @__PURE__ */ (0, N.jsx)(p, {
							label: e,
							options: y.filter((e) => e.value).map((e) => ({
								id: e.id,
								label: e.label
							})),
							sorting: B,
							onChange: (e) => {
								V(e), G((e) => ({
									...e,
									pageIndex: 0
								}));
							}
						})
					]
				})]
			}),
			F ? /* @__PURE__ */ (0, N.jsx)("p", {
				className: "text-body-2-regular text-text-secondary",
				children: F
			}) : null,
			/* @__PURE__ */ (0, N.jsxs)(m, {
				label: `${e}批量操作`,
				visible: Q.length > 0,
				count: `已选 ${Q.length.toLocaleString()} ${z}`,
				children: [D(Q, () => E([])), /* @__PURE__ */ (0, N.jsx)(c, {
					variant: "ghost",
					size: "small",
					onClick: () => E([]),
					children: "取消选择"
				})]
			}),
			/* @__PURE__ */ (0, N.jsx)(f, {
				follow: !0,
				preferences: U,
				onRowClick: (e) => Z.getRow(e)?.toggleSelected(),
				children: /* @__PURE__ */ (0, N.jsxs)(h, {
					"aria-label": e,
					size: "sm",
					sortDescriptor: B[0] ? {
						column: B[0].id,
						direction: B[0].desc ? "descending" : "ascending"
					} : void 0,
					onSortChange: (e) => Z.getColumn(String(e.column))?.toggleSorting(e.direction === "descending"),
					children: [/* @__PURE__ */ (0, N.jsxs)(s, { children: [Z.getHeaderGroups()[0].headers.map((e) => /* @__PURE__ */ (0, N.jsx)(i, {
						id: e.id,
						isRowHeader: e.id === y[0].id,
						allowsSorting: e.column.getCanSort(),
						...U.columnProps(e.id),
						children: ({ sortDirection: t }) => /* @__PURE__ */ (0, N.jsxs)(N.Fragment, { children: [/* @__PURE__ */ (0, N.jsxs)("span", {
							className: "flex items-center gap-0.5",
							children: [C(e.column.columnDef.header, e.getContext()), e.column.getCanSort() ? /* @__PURE__ */ (0, N.jsx)("span", {
								"data-sort-indicator": !0,
								"data-direction": t || void 0,
								children: /* @__PURE__ */ (0, N.jsx)(u, {})
							}) : null]
						}), /* @__PURE__ */ (0, N.jsx)(_, {
							preferences: U,
							id: e.id
						})] })
					}, e.id)), /* @__PURE__ */ (0, N.jsx)(i, {
						id: "remaining-space",
						"aria-label": "行空白区域",
						"data-table-space": "",
						width: U.spaceWidth,
						minWidth: 0
					})] }), /* @__PURE__ */ (0, N.jsx)(r, {
						renderEmptyState: () => "没有记录",
						children: Z.getRowModel().rows.map((e) => /* @__PURE__ */ (0, N.jsxs)(a, {
							id: e.id,
							"data-board-selected": e.getIsSelected() || void 0,
							children: [e.getVisibleCells().map((e) => /* @__PURE__ */ (0, N.jsx)(o, { children: C(e.column.columnDef.cell, e.getContext()) }, e.id)), /* @__PURE__ */ (0, N.jsx)(o, { "data-table-space": "" })]
						}, e.id))
					})]
				})
			}),
			/* @__PURE__ */ (0, N.jsx)(d, {
				label: e,
				total: t.length,
				pagination: {
					...W,
					pageIndex: J
				},
				onChange: G,
				unit: z
			}),
			I ? /* @__PURE__ */ (0, N.jsx)("div", {
				className: "flex flex-wrap items-center justify-end gap-2 border-t border-separator-border pt-4",
				children: I
			}) : null
		]
	});
}
export { F as DataTable };

//# debugId=08049a4d-1354-4ab2-aae6-7fd0d8120a10
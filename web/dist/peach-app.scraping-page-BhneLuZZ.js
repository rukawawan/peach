(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "a14baf38-8d0b-4ead-bc9d-efac637d3634", e._sentryDebugIdIdentifier = "sentry-dbid-a14baf38-8d0b-4ead-bc9d-efac637d3634");
	} catch {}
})();
import { $fe21c36db05242bb$export$d7b12c4107be0d61 as e, AMANE_BRIDGE_CHECK_URL as t, AMANE_BRIDGE_KEY as n, AMANE_BRIDGE_REBUILD_URL as r, Button as i, CHECK_ALL_KEY as a, COVER_JOB_KEY as o, CUSTOM_SOURCES_KEY as s, CUSTOM_SOURCES_URL as c, Checkbox as l, Disclosure as u, ErrorText as d, ExternalLink as f, Fact as p, FactList as m, FieldLabel as h, Footer as g, Help as _, Input as v, IssueRow as y, LinkButton as ee, LoadingDots as b, Note as x, Progress as S, Rows as te, SCRAPING_CHECK_ALL_URL as C, SCRAPING_CHECK_URL as ne, SCRAPING_COVER_URL as w, SCRAPING_KEY as T, SCRAPING_SETTINGS_URL as re, SEGMENT as ie, SEGMENTED_TRACK as ae, Section as E, SegmentedRadioGroup as oe, Select$1 as se, SelectField as D, SelectItem as ce, SettingsRow as le, Stack as O, StatusLabel as k, __toESM as A, apiSend as j, busyProps as M, checkText as ue, composingKey as N, confirmModal as de, errorMessage as P, esc as F, fetchAmaneBridge as I, fetchCheckAllJob as L, fetchCoverJob as R, fetchCustomSources as z, fetchSources as fe, i2 as pe, momentText as me, queryClient as B, require_jsx_runtime as he, require_react as ge, spinnerHtml as _e, useAction as V, useBackgroundJob as H, useMutation as U, useQuery as W } from "./peach-app.js";
import { ConnectionStatus as ve } from "./peach-app.connection-status-DI6kgn3i.js";
import { Page as G } from "./peach-app.page-QAncjzM1.js";
import { SiteMark as K } from "./peach-app.site-mark-D_VlIyJz.js";
import { CodeBlock as ye } from "./peach-app.code-block-5D8eSV-F.js";
// src/react/scraping/custom-sources.tsx
var q = /* @__PURE__ */ A(ge(), 1), J = he(), be = [
	["code", "番号"],
	["title", "标题"],
	["studio", "厂牌"],
	["series", "系列"],
	["release_date", "发行日期"],
	["performers", "演员（文本数组）"],
	["tags", "标签（文本数组）"]
], xe = [
	["censored", "有码"],
	["amateur", "素人"],
	["uncensored", "无码"],
	["fc2", "FC2"],
	["kmib", "韩国 MIB"],
	["other", "其他"],
	["unsure", "待核番号"],
	["unknown", "未知"]
], Se = () => ({
	name: "",
	endpoint: "",
	enabled: !1,
	fields: {
		code: "id",
		title: "title"
	},
	content_types: ["censored"]
});
function Ce({ receipt: e }) {
	let [t, n] = (0, q.useState)(null), r = W({
		queryKey: s,
		queryFn: ({ signal: e }) => z(e)
	}), a = V(), o = (e) => B.setQueryData(s, e), l = !!(r.isPending || r.error || r.data?.items.length || a.error), u = /* @__PURE__ */ (0, J.jsx)(i, {
		variant: "secondary",
		onClick: () => n(Se()),
		children: "添加来源"
	});
	return /* @__PURE__ */ (0, J.jsxs)(E, {
		title: "自定义元数据来源",
		children: [
			l ? /* @__PURE__ */ (0, J.jsxs)(O, { children: [
				r.isPending ? /* @__PURE__ */ (0, J.jsx)("div", {
					"aria-busy": "true",
					"data-skeleton": "",
					"aria-label": "读取自定义来源"
				}) : null,
				r.error ? /* @__PURE__ */ (0, J.jsx)(d, { children: P(r.error) }) : null,
				r.data?.items.map((t) => /* @__PURE__ */ (0, J.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3",
					children: [
						/* @__PURE__ */ (0, J.jsx)("span", {
							className: "min-w-0 flex-1",
							children: t.name
						}),
						/* @__PURE__ */ (0, J.jsx)(k, {
							tone: t.enabled ? "success" : "neutral",
							children: t.enabled ? "已启用" : "已停用"
						}),
						/* @__PURE__ */ (0, J.jsx)(i, {
							variant: "secondary",
							onClick: () => n(t),
							children: "编辑"
						}),
						/* @__PURE__ */ (0, J.jsx)(i, {
							variant: "secondary",
							...M(a.busy === t.id),
							onClick: () => void a.run(t.id, (e) => j(c, {
								...t,
								enabled: !t.enabled
							}, "POST", e), (n) => {
								o(n), e(t.enabled ? "已停用来源" : "已启用来源");
							}),
							children: t.enabled ? "停用" : "启用"
						}),
						/* @__PURE__ */ (0, J.jsx)(i, {
							variant: "danger",
							onClick: () => de({
								title: "删除自定义来源",
								body: `删除「${F(t.name)}」后，采集将不再查询这个来源。`,
								confirmLabel: "删除来源",
								danger: !0,
								onConfirm: async () => {
									o(await j(c, {
										action: "delete",
										id: t.id
									})), n(null), e("已删除来源");
								}
							}),
							children: "删除"
						})
					]
				}, t.id)),
				a.error ? /* @__PURE__ */ (0, J.jsx)(d, { children: a.error }) : null
			] }) : null,
			t ? null : l ? /* @__PURE__ */ (0, J.jsx)(g, { children: u }) : /* @__PURE__ */ (0, J.jsx)(O, { children: /* @__PURE__ */ (0, J.jsx)("div", {
				className: "flex justify-end",
				children: u
			}) }),
			t ? /* @__PURE__ */ (0, J.jsx)(we, {
				initial: t,
				cancel: () => n(null),
				saved: (t) => {
					o(t), n(null), e("已保存来源");
				}
			}, t.id || "new") : null
		]
	});
}
function we({ initial: e, cancel: t, saved: n }) {
	let [r, a] = (0, q.useState)(e), [o, s] = (0, q.useState)(""), [u, f] = (0, q.useState)(""), p = (0, q.useRef)(0), m = V(), y = (e) => {
		p.current++, a((t) => ({
			...t,
			...e
		})), f("");
	};
	return /* @__PURE__ */ (0, J.jsxs)("form", {
		"aria-label": "元数据来源配置",
		"aria-busy": m.busy === "preview",
		onSubmit: (e) => {
			e.preventDefault(), m.run("save", (e) => j(c, r, "POST", e), n);
		},
		children: [/* @__PURE__ */ (0, J.jsxs)(O, { children: [
			/* @__PURE__ */ (0, J.jsx)(v, {
				label: "来源名称",
				value: r.name,
				maxLength: 80,
				onChange: (e) => y({ name: e })
			}),
			/* @__PURE__ */ (0, J.jsx)(v, {
				label: "JSON 接口地址",
				value: r.endpoint,
				maxLength: 2048,
				placeholder: "https://example.com/api/movies/{code}",
				onChange: (e) => y({ endpoint: e })
			}),
			/* @__PURE__ */ (0, J.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, J.jsx)(h, { children: "来源连接方式" }), /* @__PURE__ */ (0, J.jsx)(D, {
					id: "custom-source-network",
					label: "来源连接方式",
					epoch: 0,
					value: r.network || "direct",
					options: [["direct", "直连"], ["peach_proxy", "Peach 代理"]],
					onPick: (e) => y({ network: e })
				})]
			}),
			/* @__PURE__ */ (0, J.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, J.jsx)(h, { children: "接口番号格式" }), /* @__PURE__ */ (0, J.jsx)(D, {
					id: "custom-source-code-format",
					label: "接口番号格式",
					epoch: 0,
					value: r.code_format || "original",
					options: [
						["original", "原样"],
						["lowercase", "小写"],
						["compact", "去掉连字符"],
						["underscore", "连字符转下划线"]
					],
					onPick: (e) => y({ code_format: e })
				})]
			}),
			/* @__PURE__ */ (0, J.jsx)(_, { children: "填写公开 JSON 接口和响应字段路径，例如 data.title。番号字段用于核对作品身份。" }),
			be.map(([e, t]) => /* @__PURE__ */ (0, J.jsx)(v, {
				label: `${t}字段路径`,
				value: r.fields[e] || "",
				onChange: (t) => {
					let n = { ...r.fields };
					t ? n[e] = t : delete n[e], y({ fields: n });
				}
			}, e)),
			/* @__PURE__ */ (0, J.jsx)("div", {
				className: "flex flex-wrap gap-3",
				role: "group",
				"aria-label": "适用内容类型",
				children: xe.map(([e, t]) => /* @__PURE__ */ (0, J.jsx)(l, {
					isSelected: r.content_types.includes(e),
					onChange: (t) => y({ content_types: t ? [...r.content_types, e] : r.content_types.filter((t) => t !== e) }),
					children: t
				}, e))
			}),
			/* @__PURE__ */ (0, J.jsx)(l, {
				isSelected: r.enabled,
				onChange: (e) => y({ enabled: e }),
				children: "启用来源"
			}),
			/* @__PURE__ */ (0, J.jsx)(v, {
				label: "试查番号（回车查询）",
				value: o,
				onChange: (e) => {
					p.current++, s(e), f("");
				},
				onKeyDown: (e) => {
					if (e.key !== "Enter" || N(e.nativeEvent)) return;
					e.preventDefault();
					let t = p.current;
					m.run("preview", (e) => j(c, {
						...r,
						code: o,
						action: "preview"
					}, "POST", e), (e) => {
						t === p.current && f(JSON.stringify(e.record, null, 2));
					}, (e) => {
						t === p.current && m.setError(P(e));
					});
				}
			}),
			m.busy === "preview" ? /* @__PURE__ */ (0, J.jsxs)(_, {
				role: "status",
				children: [/* @__PURE__ */ (0, J.jsx)("span", { dangerouslySetInnerHTML: { __html: _e("正在试查来源") } }), "正在试查来源"]
			}) : null,
			u ? /* @__PURE__ */ (0, J.jsx)(ye, {
				code: u,
				language: "json",
				label: "元数据接口返回"
			}) : null,
			m.error ? /* @__PURE__ */ (0, J.jsx)(d, { children: m.error }) : null
		] }), /* @__PURE__ */ (0, J.jsxs)(g, { children: [/* @__PURE__ */ (0, J.jsx)(i, {
			variant: "secondary",
			type: "button",
			onClick: t,
			children: "取消"
		}), /* @__PURE__ */ (0, J.jsx)(i, {
			type: "submit",
			...M(m.busy === "save"),
			children: "保存来源"
		})] })]
	});
}
// src/react/scraping/scraping-page.tsx
var Y = [["peach", "Peach 代理"], ["direct", "直接连接"]];
function X(e) {
	return Y.some(([t]) => t === e) || !e ? [...Y] : [...Y, [e, e]];
}
function Z(e) {
	try {
		return new URL(e).host || e;
	} catch {
		return e;
	}
}
var Q = [["paste", "粘贴 Cookie"], ["file", "导入文件"]];
function Te() {
	return /* @__PURE__ */ (0, J.jsx)(K, { source: "github" });
}
function Ee({ source: t, toast: n }) {
	let [r, a] = (0, q.useState)(t.network), [o, s] = (0, q.useState)(""), [c, l] = (0, q.useState)(""), [u, p] = (0, q.useState)(Q[0][0]), [m, _] = (0, q.useState)(""), [y, b] = (0, q.useState)(""), S = (0, q.useRef)(null);
	function C() {
		s(""), l(""), _(""), b(""), S.current && (S.current.value = "");
	}
	let w = U({
		mutationFn: (e) => j(re, {
			source: t.source,
			network: r,
			cookie: o,
			cookies_text: c,
			revoke: e
		}),
		onSuccess: (e, t) => {
			B.setQueryData(T, (t) => t && {
				...t,
				sources: t.sources.map((t) => t.source === e.saved.source ? e.saved : t)
			}), C(), n(t ? "Cookie 已撤销" : "来源设置已保存");
		}
	}), D = U({ mutationFn: () => j(ne, { source: t.source }) }), A = w.isPending || D.isPending, N = (e) => {
		e.preventDefault(), A || (D.reset(), w.mutate(!1));
	}, de = () => {
		A || (D.reset(), w.mutate(!0));
	}, F = () => {
		A || (w.reset(), D.mutate());
	};
	async function I(e) {
		let t = e.currentTarget, n = t.files?.[0];
		if (l(""), b(""), !n) _("");
		else if (n.size > 262144) t.value = "", _(""), b("Cookie 文本超过 256 KiB");
		else try {
			let e = await n.text();
			l(e), _(n.name);
		} catch {
			b("Cookie 文件未读取，请重新选择");
		}
	}
	let L = y || (w.error ? P(w.error) : "") || (D.error ? P(D.error) : ""), R = D.data?.results ?? [], z = r === "peach" || t.accepts_cookie || t.browser || !!L || R.length > 0;
	return /* @__PURE__ */ (0, J.jsxs)(E, {
		title: t.label,
		onSubmit: N,
		aside: /* @__PURE__ */ (0, J.jsxs)("span", {
			className: "flex min-w-0 items-center gap-1",
			children: [/* @__PURE__ */ (0, J.jsx)(K, { source: t.source }), t.login ? /* @__PURE__ */ (0, J.jsx)(f, {
				href: t.login,
				children: Z(t.login)
			}) : null]
		}),
		children: [
			/* @__PURE__ */ (0, J.jsx)(te, { children: /* @__PURE__ */ (0, J.jsx)(le, {
				label: "连接方式",
				children: /* @__PURE__ */ (0, J.jsx)(se, {
					"aria-label": "连接方式",
					className: "w-44 min-w-0",
					selectedKey: r,
					onSelectionChange: (e) => {
						e !== null && a(String(e));
					},
					children: X(r).map(([e, t]) => /* @__PURE__ */ (0, J.jsx)(ce, {
						id: e,
						children: t
					}, e))
				})
			}) }),
			t.cooldown_until && t.cooldown_until > Date.now() / 1e3 ? /* @__PURE__ */ (0, J.jsx)(x, {
				tone: "warning",
				children: /* @__PURE__ */ (0, J.jsxs)("span", {
					className: "inline-flex flex-wrap items-center gap-2",
					children: [/* @__PURE__ */ (0, J.jsx)(k, {
						tone: "warning",
						children: "冷却中"
					}), /* @__PURE__ */ (0, J.jsxs)("span", { children: [
						"可在 ",
						(/* @__PURE__ */ new Date(t.cooldown_until * 1e3)).toLocaleString("zh-CN"),
						" 后重试。"
					] })]
				})
			}) : null,
			z ? /* @__PURE__ */ (0, J.jsxs)(O, {
				divided: !0,
				children: [
					r === "peach" ? /* @__PURE__ */ (0, J.jsx)("span", {
						className: "self-start",
						children: /* @__PURE__ */ (0, J.jsx)(ee, {
							href: "/settings/library#peachProxy",
							size: "small",
							trailingIcon: pe,
							children: "配置 Peach 代理"
						})
					}) : null,
					t.browser ? /* @__PURE__ */ (0, J.jsx)("p", {
						className: "text-body-2-regular text-text-secondary",
						children: "人机验证由本机浏览器自动完成；需要点击时窗口会弹出。这台机器上不需要 Cookie。"
					}) : null,
					t.accepts_cookie && !t.browser ? /* @__PURE__ */ (0, J.jsxs)(J.Fragment, { children: [
						/* @__PURE__ */ (0, J.jsxs)("div", {
							className: "flex flex-col gap-2",
							children: [/* @__PURE__ */ (0, J.jsx)("span", {
								className: "self-start",
								children: /* @__PURE__ */ (0, J.jsx)(k, {
									tone: t.cookie_saved ? "success" : "neutral",
									children: t.cookie_saved ? "Cookie 已保存" : "Cookie 未配置"
								})
							}), /* @__PURE__ */ (0, J.jsx)("p", {
								className: "text-body-2-regular text-text-secondary",
								children: t.cookie_saved ? "登录有效性待验证。" : "需要登录时，任选一种方式提供 Cookie。"
							})]
						}),
						/* @__PURE__ */ (0, J.jsx)(oe, {
							"aria-label": "提供 Cookie 的方式（二选一）",
							value: u,
							onChange: (e) => {
								p(e), C();
							},
							className: ae,
							children: Q.map(([t, n]) => /* @__PURE__ */ (0, J.jsx)(e, {
								value: t,
								className: ie,
								children: n
							}, t))
						}),
						u === "paste" ? /* @__PURE__ */ (0, J.jsx)(v, {
							type: "password",
							label: "Cookie",
							autoComplete: "off",
							value: o,
							onChange: s
						}) : /* @__PURE__ */ (0, J.jsxs)("div", {
							className: "flex flex-col gap-2",
							children: [
								/* @__PURE__ */ (0, J.jsx)(h, { children: "Netscape Cookie 文件（.txt）" }),
								/* @__PURE__ */ (0, J.jsxs)("div", {
									className: "flex flex-wrap items-center gap-3",
									children: [/* @__PURE__ */ (0, J.jsx)(i, {
										variant: "secondary",
										onClick: () => S.current?.click(),
										children: "选择文件"
									}), /* @__PURE__ */ (0, J.jsx)("span", {
										className: "min-w-0 text-body-2-regular break-all text-text-secondary",
										children: m || "未选择文件"
									})]
								}),
								/* @__PURE__ */ (0, J.jsx)("input", {
									ref: S,
									type: "file",
									accept: ".txt",
									tabIndex: -1,
									"aria-hidden": !0,
									className: "hidden",
									onChange: (e) => {
										I(e);
									}
								})
							]
						})
					] }) : null,
					L ? /* @__PURE__ */ (0, J.jsx)(d, { children: L }) : null,
					R.map((e) => /* @__PURE__ */ (0, J.jsx)(x, {
						tone: e.ok ? "success" : "error",
						children: /* @__PURE__ */ (0, J.jsxs)("span", {
							className: "flex flex-col items-start gap-1",
							children: [/* @__PURE__ */ (0, J.jsx)(ve, {
								tone: e.ok ? "success" : "error",
								children: e.ok ? "可访问" : "连接失败"
							}), /* @__PURE__ */ (0, J.jsx)("span", { children: ue(e, t.label) })]
						})
					}, e.label))
				]
			}) : null,
			/* @__PURE__ */ (0, J.jsxs)(g, { children: [
				t.accepts_cookie && t.cookie_saved ? /* @__PURE__ */ (0, J.jsx)(i, {
					variant: "secondary",
					onClick: de,
					...M(A),
					children: "撤销 Cookie"
				}) : null,
				/* @__PURE__ */ (0, J.jsx)(i, {
					variant: "secondary",
					onClick: F,
					...M(A),
					children: "检查连接"
				}),
				/* @__PURE__ */ (0, J.jsx)(i, {
					type: "submit",
					...M(A),
					children: "保存"
				})
			] })
		]
	});
}
var De = {
	ok: "success",
	auth: "warning",
	http: "error",
	cooldown: "warning",
	network: "error",
	skipped: "neutral"
}, $ = [
	"ok",
	"auth",
	"cooldown",
	"http",
	"network",
	"skipped"
];
function Oe(e, t) {
	return t.label === "来源页面" ? e.label : `${e.label} 高清图片`;
}
function ke({ toast: e }) {
	let { job: t, running: n, start: r, query: o } = H({
		queryKey: a,
		queryFn: ({ signal: e }) => L(e),
		start: () => j(C, {}),
		onFinish: (t) => {
			B.invalidateQueries({
				queryKey: T,
				exact: !0
			}), t.status === "complete" && e(t.failed ? `检查完成，${t.failed} 项未通过` : "检查完成，全部可连接");
		}
	}), s = (e) => {
		e.preventDefault(), !o.data || n || r.isPending || r.mutate();
	}, c = (t?.results ?? []).flatMap((e) => e.results.map((t) => ({
		source: e.source,
		name: Oe(e, t),
		check: t
	}))), l = (e, t) => /* @__PURE__ */ (0, J.jsxs)("span", {
		className: "inline-flex min-w-0 items-center gap-1.5",
		children: [/* @__PURE__ */ (0, J.jsx)(K, { source: e }), t]
	}), d = c.filter(({ check: e }) => e.outcome === "ok"), f = c.filter(({ check: e }) => e.outcome !== "ok").sort((e, t) => $.indexOf(e.check.outcome) - $.indexOf(t.check.outcome)), h = r.error ? P(r.error) : o.error ? P(o.error) : t?.status === "failed" ? t.error || "检查未完成" : "", v = t?.status === "complete" && t.completed_at ? [me((/* @__PURE__ */ new Date(t.completed_at * 1e3)).toISOString()), t.elapsed_s === void 0 ? "" : `用时 ${t.elapsed_s.toFixed(1)} 秒`].filter(Boolean).join(" · ") : "";
	return /* @__PURE__ */ (0, J.jsxs)(E, {
		id: "check-all",
		title: "连接检查",
		onSubmit: s,
		children: [/* @__PURE__ */ (0, J.jsxs)(O, { children: [
			o.isPending ? /* @__PURE__ */ (0, J.jsx)("div", {
				role: "status",
				"aria-label": "正在读取连接检查状态",
				"data-skeleton": "",
				className: "skeleton-sheen h-6 rounded-md"
			}) : null,
			/* @__PURE__ */ (0, J.jsx)(_, { children: "检查各来源页面与 DMM 高清图片服务器。可连接只说明检查地址可达，不代表登录有效。" }),
			n ? /* @__PURE__ */ (0, J.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, J.jsx)(S, {
					label: "连接检查进度",
					value: t?.checked ?? 0,
					max: t?.total ?? 0
				}), /* @__PURE__ */ (0, J.jsxs)(_, {
					role: "status",
					children: [
						"已检查 ",
						t?.checked ?? 0,
						" / ",
						t?.total ?? 0,
						" 个来源"
					]
				})]
			}) : null,
			h ? /* @__PURE__ */ (0, J.jsx)(x, {
				tone: "error",
				children: h
			}) : null,
			c.length ? /* @__PURE__ */ (0, J.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: $.map((e) => {
					let t = c.filter(({ check: t }) => t.outcome === e).length;
					return t ? /* @__PURE__ */ (0, J.jsxs)(k, {
						tone: De[e],
						children: [
							c.find(({ check: t }) => t.outcome === e)?.check.outcome_label,
							" ",
							t
						]
					}, e) : null;
				})
			}) : null,
			f.length ? /* @__PURE__ */ (0, J.jsx)("ul", {
				className: "flex min-w-0 flex-col",
				children: f.map(({ source: e, name: t, check: n }) => /* @__PURE__ */ (0, J.jsx)(y, {
					title: l(e, t),
					children: /* @__PURE__ */ (0, J.jsxs)("span", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, J.jsx)(k, {
							tone: De[n.outcome],
							children: n.outcome_label
						}), n.message ? /* @__PURE__ */ (0, J.jsx)("span", {
							className: "text-body-2-regular text-text-secondary",
							children: n.message
						}) : null]
					})
				}, t))
			}) : null,
			d.length ? /* @__PURE__ */ (0, J.jsx)(u, {
				summary: `可连接的 ${d.length} 项`,
				children: /* @__PURE__ */ (0, J.jsx)(m, { children: d.map(({ source: e, name: t, check: n }) => /* @__PURE__ */ (0, J.jsx)(p, {
					term: l(e, t),
					children: [n.width ? `${n.width} × ${n.height}` : "", n.elapsed_s === void 0 ? "" : `${n.elapsed_s.toFixed(2)} 秒`].filter(Boolean).join(" · ")
				}, t)) })
			}) : null
		] }), /* @__PURE__ */ (0, J.jsx)(g, {
			status: v ? `上次检查 ${v}` : void 0,
			children: /* @__PURE__ */ (0, J.jsx)(i, {
				type: "submit",
				disabled: !o.data,
				...M(n || r.isPending),
				children: "全部检查"
			})
		})]
	});
}
function Ae({ toast: e }) {
	let [t, n] = (0, q.useState)(""), { running: r, outcome: a, start: s, query: c } = H({
		queryKey: o,
		queryFn: ({ signal: e }) => R(e),
		start: () => j(w, { code: t }),
		onFinish: (t) => {
			t.status === "complete" && e(t.result || "封面采集完成");
		}
	}), l = (e) => {
		e.preventDefault(), c.data && !r && !s.isPending && t.trim() && s.mutate();
	}, u = s.error ? P(s.error) : c.error ? P(c.error) : a?.status === "failed" ? a.error || "采集未取得" : "";
	return /* @__PURE__ */ (0, J.jsx)(E, {
		title: "高清封面",
		onSubmit: l,
		children: /* @__PURE__ */ (0, J.jsxs)(O, { children: [
			c.isPending ? /* @__PURE__ */ (0, J.jsx)("div", {
				role: "status",
				"aria-label": "正在读取封面任务状态",
				"data-skeleton": "",
				className: "skeleton-sheen h-6 rounded-md"
			}) : null,
			/* @__PURE__ */ (0, J.jsxs)("div", {
				className: "flex flex-wrap items-end gap-2",
				children: [/* @__PURE__ */ (0, J.jsx)("div", {
					className: "min-w-0 flex-1",
					children: /* @__PURE__ */ (0, J.jsx)(v, {
						"aria-label": "馆藏番号",
						isRequired: !0,
						isDisabled: r,
						value: t,
						onChange: n,
						placeholder: "输入馆藏番号，如 ABW-232"
					})
				}), /* @__PURE__ */ (0, J.jsx)(i, {
					type: "submit",
					disabled: !c.data || !t.trim(),
					...M(r || s.isPending),
					children: "抓取封面"
				})]
			}),
			r ? /* @__PURE__ */ (0, J.jsx)(b, { label: "正在抓取封面" }) : null,
			u ? /* @__PURE__ */ (0, J.jsx)(x, {
				tone: "error",
				children: u
			}) : null,
			a?.status === "complete" ? /* @__PURE__ */ (0, J.jsx)(x, {
				tone: "success",
				children: a.result || "封面采集完成"
			}) : null
		] })
	});
}
function je({ toast: e }) {
	let { query: a, running: o, outcome: s, start: c } = H({
		queryKey: n,
		queryFn: ({ signal: e }) => I(e),
		start: () => j(r, {}),
		jobOf: (e) => e.job,
		withJob: (e, t) => e && {
			...e,
			job: t
		},
		onFinish: (t) => {
			t.status === "complete" && e(t.result || "amane 桥已重建");
		}
	}), l = U({ mutationFn: () => j(t, {}) }), d = a.data;
	if (!d) return a.error ? /* @__PURE__ */ (0, J.jsx)(E, {
		id: "amane",
		title: "amane",
		children: /* @__PURE__ */ (0, J.jsx)(O, { children: /* @__PURE__ */ (0, J.jsx)(x, {
			tone: "error",
			children: P(a.error)
		}) })
	}) : null;
	let h = o || c.isPending || l.isPending, v = c.error ? P(c.error) : l.error ? P(l.error) : s?.status === "failed" ? s.error || "重建未完成" : "";
	return /* @__PURE__ */ (0, J.jsxs)(E, {
		id: "amane",
		title: "amane",
		aside: /* @__PURE__ */ (0, J.jsx)(f, {
			href: d.repository,
			leadingIcon: Te,
			children: d.repository
		}),
		children: [
			/* @__PURE__ */ (0, J.jsxs)(m, { children: [
				/* @__PURE__ */ (0, J.jsx)(p, {
					term: "已安装版本",
					children: d.installed_version || "未安装"
				}),
				/* @__PURE__ */ (0, J.jsx)(p, {
					term: "上游最新版本",
					children: l.data?.latest ?? "尚未检查"
				}),
				/* @__PURE__ */ (0, J.jsx)(p, {
					term: "运行环境",
					children: d.installed ? "已安装" : "未安装"
				}),
				/* @__PURE__ */ (0, J.jsxs)(p, {
					term: "内置站点",
					children: [d.sites.length.toLocaleString(), " 个"]
				})
			] }),
			/* @__PURE__ */ (0, J.jsxs)(O, {
				divided: !0,
				children: [
					d.sites.length ? /* @__PURE__ */ (0, J.jsx)(u, {
						summary: "查看内置站点",
						children: /* @__PURE__ */ (0, J.jsx)("p", {
							className: "text-body-2-regular text-text-secondary",
							children: d.sites.map((e) => e.label).join("、")
						})
					}) : null,
					d.problem ? /* @__PURE__ */ (0, J.jsx)(x, {
						tone: "error",
						children: d.problem
					}) : /* @__PURE__ */ (0, J.jsxs)(_, { children: [
						"amane（",
						d.license,
						"）提供这些内置站点的解析能力。首次需要时，Peach 会自动准备锁定的 ",
						d.version,
						" 版本；安装包内已有可用环境时直接使用。 手动安装也使用此版本，不随上游自动升级。"
					] }),
					o ? /* @__PURE__ */ (0, J.jsx)(b, { label: "正在重建运行环境" }) : null,
					v ? /* @__PURE__ */ (0, J.jsx)(x, {
						tone: "error",
						children: v
					}) : null,
					s?.status === "complete" ? /* @__PURE__ */ (0, J.jsx)(x, {
						tone: "success",
						children: s.result || "amane 桥已重建"
					}) : null
				]
			}),
			/* @__PURE__ */ (0, J.jsxs)(g, { children: [/* @__PURE__ */ (0, J.jsx)(i, {
				variant: "secondary",
				onClick: () => {
					h || l.mutate();
				},
				...M(l.isPending),
				children: "检查上游版本"
			}), /* @__PURE__ */ (0, J.jsx)(i, {
				disabled: !!d.problem,
				onClick: () => {
					h || c.mutate();
				},
				...M(o || c.isPending),
				children: d.installed ? "重新安装" : "安装"
			})] })
		]
	});
}
function Me({ toast: e }) {
	let t = W({
		queryKey: T,
		queryFn: ({ signal: e }) => fe(e)
	}), n = t.data;
	return n ? /* @__PURE__ */ (0, J.jsxs)(G, { children: [
		/* @__PURE__ */ (0, J.jsx)("p", {
			className: "text-body-2-regular text-text-secondary",
			children: "高清图片可能要经代理才能下载，先检查连接。"
		}),
		/* @__PURE__ */ (0, J.jsx)(ke, { toast: e }),
		/* @__PURE__ */ (0, J.jsx)(Ae, { toast: e }),
		/* @__PURE__ */ (0, J.jsx)(Ce, { receipt: e }),
		(n.sources || []).map((t) => /* @__PURE__ */ (0, J.jsx)(Ee, {
			source: t,
			toast: e
		}, t.source)),
		/* @__PURE__ */ (0, J.jsx)(je, { toast: e })
	] }) : /* @__PURE__ */ (0, J.jsx)(G, { children: /* @__PURE__ */ (0, J.jsx)(x, {
		tone: "error",
		title: "采集来源读取失败",
		children: t.error ? P(t.error) : "读取采集来源失败"
	}) });
}
export { Me as ScrapingPage, Z as linkHost, X as networkOptions };

//# debugId=a14baf38-8d0b-4ead-bc9d-efac637d3634
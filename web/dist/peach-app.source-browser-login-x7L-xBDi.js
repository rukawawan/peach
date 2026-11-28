(function() {
	try {
		var e = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, t = new e.Error().stack;
		t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "ab7eeb4c-96d4-4299-ab96-f15ed9d375d4", e._sentryDebugIdIdentifier = "sentry-dbid-ab7eeb4c-96d4-4299-ab96-f15ed9d375d4");
	} catch {}
})();
import { Button as e, Note as t, __toESM as n, apiGet as r, apiSend as i, busyProps as a, errorMessage as o, jobText as s, queryClient as c, require_jsx_runtime as l, require_react as u, t as d, useMutation as f, useQuery as p } from "./peach-app.js";
// src/react/components/source-browser-login.tsx
var m = /* @__PURE__ */ n(u(), 1), h = l();
function g(e) {
	return `/api/source-browser-login/${encodeURIComponent(e)}`;
}
function _(e, t, n) {
	let a = ["source-browser-login", e], s = p({
		queryKey: a,
		queryFn: ({ signal: t }) => r(e, t),
		enabled: t,
		staleTime: 0,
		refetchInterval: (e) => e.state.data?.state === "waiting" && 2e3
	}), l = f({
		mutationFn: (t) => i(t ? `${e}/cancel` : e, {}),
		onSuccess: async (e) => {
			await c.cancelQueries({
				queryKey: a,
				exact: !0
			}), c.setQueryData(a, e);
		}
	}), u = t ? s.data : void 0, d = u?.state === "waiting";
	return (0, m.useEffect)(() => {
		if (u?.state === "done") for (let e of n) c.invalidateQueries({
			queryKey: e,
			exact: !0
		});
	}, [u?.state, n]), {
		data: u,
		waiting: d,
		busy: l.isPending || d,
		pending: l.isPending,
		error: l.error ? o(l.error) : "",
		send: l.mutate
	};
}
function v({ login: t, disabled: n, onStart: r }) {
	return t.data?.available ? t.waiting ? /* @__PURE__ */ (0, h.jsx)(e, {
		type: "button",
		variant: "secondary",
		...a(t.pending),
		onClick: () => {
			t.pending || t.send(!0);
		},
		children: d("settings:shared.cancel")
	}) : /* @__PURE__ */ (0, h.jsx)(e, {
		type: "button",
		variant: "secondary",
		...a(t.pending || !!n),
		onClick: () => {
			t.pending || n || (r?.(), t.send(!1));
		},
		children: d("manage:sourceSettings.browserSignIn")
	}) : null;
}
function y({ login: e, saved: n }) {
	let r = e.data;
	if (!r || r.state === "idle" || r.state === "done" && !n) return null;
	let i = r.state === "done" ? "success" : r.state === "waiting" ? "info" : r.state === "failed" || r.state === "timeout" ? "warning" : "neutral";
	return /* @__PURE__ */ (0, h.jsx)(t, {
		tone: i,
		children: s(r)
	});
}
export { v as SourceBrowserLoginButton, y as SourceBrowserLoginStatus, g as sourceBrowserLoginUrl, _ as useSourceBrowserLogin };

//# debugId=ab7eeb4c-96d4-4299-ab96-f15ed9d375d4
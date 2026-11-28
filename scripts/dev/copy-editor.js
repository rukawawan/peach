/* Peach 应用的原位改字适配器。 */
(() => {
  const source = document.body.dataset.peachCopyMode === 'source', key = 'peach.copy-edits.v1';
  const core = globalThis.PeachCopyEditorCore;
  let edits = {}, active = true, saving = false, editor;
  try { edits = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
  const originals = new WeakMap();
  const tools = core.createTools({
    reactModalHost(nativeHost) {
      return [...nativeHost.querySelectorAll('.peach-feedback-surface [role="dialog"], [data-modal-surface] [role="dialog"]')].reverse()
        .find(dialog => dialog.getClientRects().length && !dialog.closest('[inert], [aria-hidden="true"]'));
    },
    onToggle(value) { editor.commit(); active = value; editor.hideHighlight(); },
    onExport() {
      const url = URL.createObjectURL(new Blob([JSON.stringify(edits, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'peach-copy-edits.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onExit() { editor.commit(true); const url = new URL(location.href); url.searchParams.delete('edit'); location.href = url; },
  });
  const say = tools.say;
  const pendingKey = 'peach.copy-apply.v1';
  const recovery = tools.setRecovery;
  async function watchApply(job) {
    tools.setRecovery();
    sessionStorage.setItem(pendingKey, JSON.stringify(job));
    saving = true; tools.setBusy(true);
    const deadline = Date.now() + 300000;
    try {
      while (Date.now() < deadline) {
        say(job.message || '已保存，等待生效…');
        if (job.state === 'ready') {
          sessionStorage.removeItem(pendingKey);
          sessionStorage.setItem('peach.copy-scroll', String(scrollY));
          location.reload(); return;
        }
        if (job.state === 'error') {
          say('已保存，未生效：' + job.message);
          recovery('重试生效', async () => {
            try {
              const response = await fetch('/dev/copy-apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: job.id }) });
              const result = await core.readJson(response);
              watchApply(result.apply);
            } catch (error) { say('已保存，未生效：' + error.message); recovery('继续等待', () => watchApply(job)); }
          });
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          const response = await fetch('/dev/copy-apply', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
          if (!response.ok) continue;
          const next = await core.readJson(response);
          if (next.id !== job.id) { say('已保存，生效任务已更新'); sessionStorage.removeItem(pendingKey); return; }
          job = next;
        } catch { /* 服务重载期间保留等待状态。 */ }
      }
      say('已保存，生效仍在处理中');
      recovery('继续等待', () => watchApply(job));
    } finally { saving = false; tools.setBusy(false); }
  }
  if (source) {
    const position = sessionStorage.getItem('peach.copy-scroll');
    if (position !== null) { sessionStorage.removeItem('peach.copy-scroll'); requestAnimationFrame(() => scrollTo(0, Number(position))); }
    try {
      const pending = JSON.parse(sessionStorage.getItem(pendingKey) || 'null');
      if (pending) fetch('/dev/copy-apply', { cache: 'no-store' }).then(core.readJson)
        .then(job => { if (job.id === pending.id) watchApply(job); else sessionStorage.removeItem(pendingKey); })
        .catch(() => recovery('继续等待', () => watchApply(pending)));
    } catch { sessionStorage.removeItem(pendingKey); }
  }
  function apply() {
    if (editor?.editing || saving) return;
    core.applyDrafts(document.body, edits, originals);
  }
  new MutationObserver(apply).observe(document.body, { childList: true, subtree: true, characterData: true }); apply();
  if (source) fetch('/dev/copy-edits').then(r => r.ok ? r.json() : {}).then(saved => { edits = { ...edits, ...saved }; apply(); }).catch(() => say('暂时无法读取修改记录'));
  editor = core.create({
    highlight: tools.highlight, isActive: () => active, isBusy: () => saving,
    resolve: node => ({ original: originals.get(node) ?? node.data.trim() }),
    onStatus: say,
    onBusy(value) {
      saving = value;
      tools.setBusy(value);
      if (!value) apply();
    },
    async prepare(ed) {
      if (!source) return {};
      say('查找文案来源…');
      const response = await fetch('/dev/copy-candidates?text=' + encodeURIComponent(ed.originalText));
      const candidates = await core.readJson(response);
      if (!Array.isArray(candidates) || !candidates.length) throw Error('这段文字尚无可编辑的文案来源');
      const range = document.createRange(); range.selectNodeContents(ed.node);
      const scope = ed.node.parentElement?.closest('[data-copy-choice-host]');
      const candidate = candidates.length === 1 ? candidates[0] : await choose(candidates, range.getBoundingClientRect(), scope);
      return candidate ? { candidate, core: candidate.template || ed.originalText } : null;
    },
    async save(ed, replacement) {
      if (source) {
        const response = await fetch('/dev/copy-save', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ original: ed.originalText, replacement, candidate: ed.candidate }) });
        return { ...await core.readJson(response), message: '已保存修改' };
      }
      const next = { ...edits, [ed.original]: replacement };
      localStorage.setItem(key, JSON.stringify(next)); edits = next;
      return { text: replacement, message: '已保存草稿' };
    },
    async onSaved(ed, result) {
      edits = { ...edits, [ed.original]: result.text }; originals.set(ed.node, ed.original);
      try { localStorage.setItem(key, JSON.stringify(edits)); }
      catch { say('已保存修改，本机草稿记录未写入'); }
      if (result.apply) await watchApply(result.apply);
    },
  });
  async function choose(candidates, rect, scope) {
    return tools.choose(candidates.map(candidate => ({ label: `${candidate.file}:${candidate.line}`, value: candidate })), rect,
      { label: '文案来源', message: '这段文案有多个来源，请选择要修改的位置', scope });
  }
})();

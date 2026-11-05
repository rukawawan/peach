"""AI 字幕：本机 Faster-Whisper-XXL 听写日语，再用 DeepSeek 翻成中文，字幕放在影片旁边。

听写程序是独立安装的 Windows 免安装版（https://github.com/Purfview/whisper-standalone-win），
Peach 只调用它的命令行。一次处理一部：先在数据目录的工作区听写出 SRT，存成影片旁的
`<原文件名>.ja.srt`，再逐批交给 DeepSeek 翻译，写成 `<原文件名>.zh.srt`（可选中日双语）。
播放器按文件名自动配对同目录字幕，不写账本。DeepSeek 的 API Key 只存在本机数据目录的 secrets。
"""
from __future__ import annotations

import json
import re
import shutil
import threading
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

from .config import SECRETS_DIR, STATE_DIR
from .fsutil import atomic_write_text

TASK_KEY = 'ai-subtitles'
TASK_LABEL = 'AI 字幕'
CONFIG_FILE = 'ai-subtitles.json'
STATE_FILE = 'ai-subtitles-jobs.json'
KEY_FILE = 'deepseek.json'
EXE_NAMES = frozenset({'faster-whisper-xxl.exe', 'faster-whisper-xxl'})
MODELS = ('large-v3', 'large-v3-turbo', 'medium')
API = 'https://api.deepseek.com/chat/completions'
CHAT_MODEL = 'deepseek-chat'
BATCH = 40
CONTEXT = 6
TIMEOUT = 180
MAX_BYTES = 4 * 1024 * 1024
_STATE_LOCK = threading.RLock()
_TIMING = re.compile(r'^\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}')

PROMPT = (
    '你是成人影片的字幕翻译。用户会给出一组按编号排列的日语字幕，请逐条翻译成自然、口语化的简体中文。'
    '要求：保持原意和语气，台词要像真人说话；呻吟、喘息、语气词用简短的中文拟声表达；'
    '人名保留日文汉字或用常见中文译名；不省略、不合并、不审查、不加解释。'
    '只输出一个 JSON 对象，键是输入里的编号（字符串），值是对应的中文译文；'
    '“前文”部分只用来理解上下文，不要翻译也不要输出。'
)


# ---------------------------------------------------------------- 设置与记录

def read_config(state_root: Path = STATE_DIR) -> dict:
    try:
        value = json.loads((Path(state_root) / CONFIG_FILE).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        value = {}
    if not isinstance(value, dict):
        value = {}
    return {'exe': str(value.get('exe') or ''),
            'model': value.get('model') if value.get('model') in MODELS else 'large-v3',
            'vocal': bool(value.get('vocal', True)),
            'bilingual': bool(value.get('bilingual', False)),
            'extra': str(value.get('extra') or '')}


def check_exe(exe: str) -> Path:
    """只接受名为 faster-whisper-xxl.exe 且确实存在的文件。"""
    path = Path(str(exe or '').strip().strip('"'))
    if not str(path) or path.name.casefold() not in EXE_NAMES:
        raise ValueError('还没设置听写程序：到「管理 → 数据管理 → AI 字幕」填写 faster-whisper-xxl.exe 的完整路径')
    if not path.is_file():
        raise ValueError(f'找不到 {path}，请确认 Faster-Whisper-XXL 已解压到这个位置')
    return path


def save_config(values: dict, state_root: Path = STATE_DIR) -> dict:
    from .jasna_restore import extra_args
    exe = check_exe(values.get('exe', ''))
    model = values.get('model') or 'large-v3'
    if model not in MODELS:
        raise ValueError('不支持的听写模型')
    extra = str(values.get('extra') or '').strip()
    extra_args(extra)
    config = {'exe': str(exe), 'model': model, 'vocal': bool(values.get('vocal', True)),
              'bilingual': bool(values.get('bilingual', False)), 'extra': extra}
    root = Path(state_root)
    root.mkdir(parents=True, exist_ok=True)
    atomic_write_text(root / CONFIG_FILE, json.dumps(config, ensure_ascii=False, indent=2))
    return config


def read_key(secrets_root: Path = SECRETS_DIR) -> str:
    try:
        value = json.loads((Path(secrets_root) / KEY_FILE).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return ''
    return str(value.get('api_key') or '').strip() if isinstance(value, dict) else ''


def save_key(key: str, secrets_root: Path = SECRETS_DIR) -> None:
    root = Path(secrets_root)
    key = str(key or '').strip()
    target = root / KEY_FILE
    if not key:
        target.unlink(missing_ok=True)
        return
    root.mkdir(parents=True, exist_ok=True)
    atomic_write_text(target, json.dumps({'api_key': key}))


def load_state(state_root: Path = STATE_DIR) -> dict:
    try:
        value = json.loads((Path(state_root) / STATE_FILE).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}
    return value if isinstance(value, dict) else {}


def update_record(asset_id: int, values: dict, state_root: Path = STATE_DIR) -> None:
    with _STATE_LOCK:
        state = load_state(state_root)
        state[str(asset_id)] = {**state.get(str(asset_id), {}), **values,
                                'at': datetime.now(timezone.utc).isoformat()}
        root = Path(state_root)
        root.mkdir(parents=True, exist_ok=True)
        atomic_write_text(root / STATE_FILE, json.dumps(state, ensure_ascii=False, indent=2))


def subtitle_paths(video: Path) -> tuple[Path, Path]:
    """`ABP-327.mp4` → `ABP-327.ja.srt`、`ABP-327.zh.srt`：播放器按这个形状自动配对。"""
    stem = video.with_suffix('')
    return stem.with_name(stem.name + '.ja.srt'), stem.with_name(stem.name + '.zh.srt')


# ---------------------------------------------------------------- SRT

def parse_srt(text: str) -> list[dict]:
    cues = []
    for block in re.split(r'\r?\n\s*\r?\n', text.replace('﻿', '').strip()):
        lines = [line.rstrip() for line in block.splitlines() if line.strip()]
        timing = next((index for index, line in enumerate(lines) if _TIMING.match(line.strip())), None)
        if timing is None:
            continue
        body = ' '.join(line.strip() for line in lines[timing + 1:]).strip()
        cues.append({'timing': lines[timing].strip(), 'text': body})
    return cues


def render_srt(cues: list[dict]) -> str:
    return '\n'.join(f"{index}\n{cue['timing']}\n{cue['text']}\n"
                     for index, cue in enumerate(cues, 1))


# ---------------------------------------------------------------- 翻译

class TranslateError(ValueError):
    pass


class DeepSeek:
    def __init__(self, key: str, transport=None):
        from .http import HttpxTransport
        if not key:
            raise TranslateError('还没有填写 DeepSeek 的 API Key')
        self.key = key
        self.transport = transport or HttpxTransport()

    def chat(self, messages: list[dict], *, json_mode: bool = True) -> str:
        from .http import HttpRequest
        payload = {'model': CHAT_MODEL, 'messages': messages, 'temperature': 1.3, 'stream': False}
        if json_mode:
            payload['response_format'] = {'type': 'json_object'}
        request = HttpRequest('POST', API, {'Authorization': f'Bearer {self.key}',
                                            'Content-Type': 'application/json',
                                            'Accept': 'application/json'},
                              json.dumps(payload, ensure_ascii=False).encode('utf-8'))
        try:
            response = self.transport(request, TIMEOUT, MAX_BYTES)
        except Exception as error:  # noqa: BLE001 — 网络层什么都可能抛
            raise TranslateError(f'连不上 DeepSeek：{error}') from error
        if response.status == 401:
            raise TranslateError('DeepSeek 拒绝了这个 API Key，请检查是否填写正确')
        if response.status == 402:
            raise TranslateError('DeepSeek 账户余额不足')
        if response.status == 429:
            raise TranslateError('DeepSeek 请求过于频繁，稍后再试')
        if response.status != 200:
            raise TranslateError(f'DeepSeek 返回 HTTP {response.status}')
        try:
            data = json.loads(response.body.decode('utf-8'))
            return str(data['choices'][0]['message']['content'] or '')
        except (UnicodeError, ValueError, KeyError, IndexError, TypeError) as error:
            raise TranslateError('DeepSeek 返回的内容读不懂') from error

    def check(self) -> None:
        self.chat([{'role': 'user', 'content': '只回复 JSON：{"ok": true}'}])

    def translate(self, lines: list[str], context: list[str]) -> list[str]:
        numbered = {str(index): line for index, line in enumerate(lines, 1)}
        prompt = ''
        if context:
            prompt += '前文（不用翻译）：\n' + '\n'.join(context) + '\n\n'
        prompt += '要翻译的字幕：\n' + json.dumps(numbered, ensure_ascii=False)
        content = self.chat([{'role': 'system', 'content': PROMPT}, {'role': 'user', 'content': prompt}])
        try:
            result = json.loads(content)
        except ValueError as error:
            raise TranslateError('DeepSeek 没有按格式返回译文') from error
        if not isinstance(result, dict):
            raise TranslateError('DeepSeek 没有按格式返回译文')
        return [str(result.get(str(index)) or '').strip() for index in range(1, len(lines) + 1)]


def translate_cues(client: DeepSeek, cues: list[dict], *, bilingual: bool, report=lambda done, total: None,
                   checkpoint=lambda: None) -> tuple[list[dict], int]:
    """逐批翻译；一批失败重试两次，仍失败就保留日文原句。返回译好的字幕和没译成的条数。"""
    out, missed = [], 0
    for start in range(0, len(cues), BATCH):
        checkpoint()
        batch = cues[start:start + BATCH]
        lines = [cue['text'] for cue in batch]
        context = [cue['text'] for cue in cues[max(0, start - CONTEXT):start]]
        translated = None
        for attempt in range(3):
            try:
                translated = client.translate(lines, context)
                break
            except TranslateError as error:
                # Key 错或没钱，再试也没用；别的错误（超时、格式）重试，三次都不行就留原句。
                if 'API Key' in str(error) or '余额' in str(error):
                    raise
        for cue, zh in zip(batch, translated or [''] * len(batch)):
            if not zh:
                missed += 1
                zh = cue['text']
            text = f"{zh}\n{cue['text']}" if bilingual and zh != cue['text'] else zh
            out.append({'timing': cue['timing'], 'text': text})
        report(min(start + BATCH, len(cues)), len(cues))
    return out, missed


# ---------------------------------------------------------------- 队列与执行

class SubtitleQueue:
    def __init__(self):
        self._lock = threading.Lock()
        self._queue: deque[int] = deque()
        self._thread: threading.Thread | None = None
        self.current: dict = {}

    def snapshot(self) -> dict:
        with self._lock:
            return {'queue': list(self._queue), 'current': dict(self.current)}

    def enqueue(self, contract, asset_id: int, *, state_root: Path = STATE_DIR,
                secrets_root: Path = SECRETS_DIR) -> dict:
        check_exe(read_config(state_root)['exe'])
        if not read_key(secrets_root):
            raise ValueError('还没有填写 DeepSeek 的 API Key：到「管理 → 数据管理 → AI 字幕」填写')
        with contract.database.read_connection() as connection:
            row = connection.execute("SELECT id,name,medium,disposal FROM asset WHERE id=?",
                                     (asset_id,)).fetchone()
        if row is None or row['medium'] != 'video':
            raise ValueError('只能给视频生成字幕')
        if row['disposal']:
            raise ValueError('这部影片在回收站里')
        with self._lock:
            if asset_id in self._queue or self.current.get('asset_id') == asset_id:
                raise ValueError('这部影片已经在字幕队列里')
            self._queue.append(asset_id)
            update_record(asset_id, {'status': 'queued', 'name': row['name'], 'error': '', 'output': ''},
                          state_root)
            if self._thread is None or not self._thread.is_alive():
                self._thread = threading.Thread(target=self._work, args=(contract, state_root, secrets_root),
                                                name='peach-ai-subtitles', daemon=True)
                self._thread.start()
        return self.snapshot()

    def _work(self, contract, state_root: Path, secrets_root: Path) -> None:
        while True:
            with self._lock:
                if not self._queue:
                    self.current = {}
                    return
                asset_id = self._queue.popleft()
                self.current = {'asset_id': asset_id, 'stage': '听写'}
            outcome = run_one(contract, asset_id, state_root=state_root, secrets_root=secrets_root,
                              report=lambda stage: self._report(asset_id, stage))
            update_record(asset_id, outcome, state_root)

    def _report(self, asset_id: int, stage: str) -> None:
        with self._lock:
            if self.current.get('asset_id') == asset_id:
                self.current['stage'] = stage


def run_one(contract, asset_id: int, *, state_root: Path = STATE_DIR, secrets_root: Path = SECRETS_DIR,
            report=lambda stage: None) -> dict:
    from .task_control import Cancelled, bind
    from .task_runs import TaskRunHandle
    with contract.database.read_connection() as connection:
        row = connection.execute("SELECT id,name,path FROM asset WHERE id=?", (asset_id,)).fetchone()
    name = (row['name'] if row else '') or f'影片 {asset_id}'
    run = contract.task_runs.start(TASK_KEY, trigger='manual', total=100, label=f'{TASK_LABEL} · {name}')
    handle = TaskRunHandle(contract.task_runs, run.id if run else None)
    update_record(asset_id, {'status': 'running', 'name': name}, state_root)
    try:
        with bind(contract.task_runs, handle.run_id) as control:
            if row is None:
                raise ValueError('影片已不在馆藏里')
            result = _subtitle(row, read_config(state_root), read_key(secrets_root), state_root,
                               control, handle, report)
        handle.finish('succeeded', summary={'outcome': f'已生成 {result["output"]}', **result})
        return {'status': 'succeeded', **result}
    except Cancelled:
        handle.finish('cancelled', error='已取消')
        return {'status': 'cancelled'}
    except Exception as error:  # noqa: BLE001 — 写进任务中心与记录，队列继续
        handle.finish('failed', error=str(error))
        return {'status': 'failed', 'error': str(error)}


def _subtitle(row, config: dict, key: str, state_root: Path, control, handle, report) -> dict:
    from .jasna_restore import _execute, extra_args
    from .platform import translate_ledger_path
    exe = check_exe(config['exe'])
    video = translate_ledger_path(row['path'])
    if not video.is_file():
        raise ValueError(f'找不到原文件：{video}')
    ja_path, zh_path = subtitle_paths(video)
    if zh_path.exists():
        raise ValueError(f'已经有中文字幕：{zh_path.name}')
    label = f'{TASK_LABEL} · 听写'
    if ja_path.exists():
        cues = parse_srt(ja_path.read_text(encoding='utf-8', errors='replace'))
    else:
        work = Path(state_root) / 'ai-subtitles-work' / str(row['id'])
        shutil.rmtree(work, ignore_errors=True)
        work.mkdir(parents=True, exist_ok=True)
        command = [str(exe), str(video), '--language', 'ja', '--model', config['model'],
                   '--output_dir', str(work), '--output_format', 'srt', '--standard', '-pp']
        if config['vocal']:
            command += ['--ff_vocal_extract', 'mdx_kim2']
        command += extra_args(config['extra'])
        report('听写')
        handle.progress(current=0, total=100, label=f'{label}（首次使用会先下载模型）')
        try:
            try:
                _execute(command, cwd=exe.parent, log=work / 'whisper.log', control=control, handle=handle,
                         report=lambda value: None, name=row['name'] or video.name, label=label,
                         tool='Faster-Whisper-XXL')
            except RuntimeError:
                # Faster-Whisper-XXL 在部分显卡上写完字幕、退出时崩溃（退出码 0xC0000409）；字幕已写出就照常用。
                if not any(work.glob('*.srt')):
                    raise
            produced = sorted(work.glob('*.srt'))
            if not produced:
                raise RuntimeError('听写结束了，但没有生成字幕文件')
            cues = parse_srt(produced[0].read_text(encoding='utf-8', errors='replace'))
            if not cues:
                raise RuntimeError('听写没有识别出任何台词')
            atomic_write_text(ja_path, render_srt(cues))
        finally:
            shutil.rmtree(work, ignore_errors=True)
    report('翻译')
    client = DeepSeek(key)

    def translated(done, total):
        handle.progress(current=done, total=total, label=f'{TASK_LABEL} · 翻译 {done}/{total} 条')

    out, missed = translate_cues(client, cues, bilingual=config['bilingual'], report=translated,
                                 checkpoint=control.checkpoint if control is not None else (lambda: None))
    atomic_write_text(zh_path, render_srt(out))
    return {'output': zh_path.name, 'lines': len(out), 'untranslated': missed}


QUEUE = SubtitleQueue()


def summary(contract, *, state_root: Path = STATE_DIR, secrets_root: Path = SECRETS_DIR) -> dict:
    live = QUEUE.snapshot()
    active = set(live['queue']) | ({live['current']['asset_id']} if live['current'] else set())
    jobs = []
    for key, value in load_state(state_root).items():
        if not key.isdigit():
            continue
        item = {**value, 'id': int(key)}
        if item.get('status') in ('queued', 'running') and int(key) not in active:
            item['status'] = 'interrupted'
        jobs.append(item)
    jobs = sorted(jobs, key=lambda item: item.get('at') or '', reverse=True)[:30]
    config = read_config(state_root)
    return {'config': config, 'models': list(MODELS), 'configured': bool(config['exe']),
            'key_saved': bool(read_key(secrets_root)), 'jobs': jobs, **live}

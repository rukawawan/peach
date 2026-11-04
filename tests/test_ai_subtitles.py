"""AI 字幕：SRT 读写、字幕命名、DeepSeek 请求与逐批翻译的兜底。"""
import json
import tempfile
import unittest
from pathlib import Path

from peach import ai_subtitles as subs
from peach.http import HttpResponse

SRT = """1
00:00:01,000 --> 00:00:02,500
こんにちは

2
00:00:03,000 --> 00:00:04,000
気持ちいい
"""


class FakeClient:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def translate(self, lines, context):
        self.calls.append((list(lines), list(context)))
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


class SrtTests(unittest.TestCase):
    def test_round_trip_keeps_timings_and_text(self):
        cues = subs.parse_srt(SRT)
        self.assertEqual([cue['text'] for cue in cues], ['こんにちは', '気持ちいい'])
        self.assertEqual(subs.parse_srt(subs.render_srt(cues)), cues)

    def test_subtitles_sit_beside_the_video_with_language_suffixes(self):
        ja, zh = subs.subtitle_paths(Path('/media/ABP-327.mp4'))
        self.assertEqual((ja.name, zh.name), ('ABP-327.ja.srt', 'ABP-327.zh.srt'))


class TranslateTests(unittest.TestCase):
    def test_batches_are_translated_and_bilingual_keeps_the_original(self):
        cues = subs.parse_srt(SRT)
        out, missed = subs.translate_cues(FakeClient([['你好', '好舒服']]), cues, bilingual=True)
        self.assertEqual([cue['text'] for cue in out], ['你好\nこんにちは', '好舒服\n気持ちいい'])
        self.assertEqual(missed, 0)

    def test_a_failing_batch_keeps_japanese_after_retries(self):
        cues = subs.parse_srt(SRT)
        error = subs.TranslateError('DeepSeek 返回 HTTP 500')
        client = FakeClient([error, error, error])
        out, missed = subs.translate_cues(client, cues, bilingual=False)
        self.assertEqual([cue['text'] for cue in out], ['こんにちは', '気持ちいい'])
        self.assertEqual((missed, len(client.calls)), (2, 3))

    def test_a_rejected_key_stops_the_job(self):
        cues = subs.parse_srt(SRT)
        with self.assertRaisesRegex(subs.TranslateError, 'API Key'):
            subs.translate_cues(FakeClient([subs.TranslateError('DeepSeek 拒绝了这个 API Key')]), cues,
                                bilingual=False)


class DeepSeekTests(unittest.TestCase):
    def test_request_carries_the_key_and_numbered_lines(self):
        seen = []

        def transport(request, timeout, max_bytes):
            seen.append(request)
            body = {'choices': [{'message': {'content': json.dumps({'1': '你好'})}}]}
            return HttpResponse(200, {}, json.dumps(body).encode())
        result = subs.DeepSeek('sk-test', transport).translate(['こんにちは'], [])
        self.assertEqual(result, ['你好'])
        self.assertEqual(seen[0].headers['Authorization'], 'Bearer sk-test')
        payload = json.loads(seen[0].body)
        self.assertEqual(payload['response_format'], {'type': 'json_object'})
        self.assertIn('こんにちは', payload['messages'][-1]['content'])

    def test_rejected_key_is_reported(self):
        client = subs.DeepSeek('bad', lambda *args: HttpResponse(401, {}, b'{}'))
        with self.assertRaisesRegex(subs.TranslateError, 'API Key'):
            client.check()


class SettingsTests(unittest.TestCase):
    def test_only_the_whisper_program_is_accepted_and_keys_stay_in_secrets(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            other = root / 'calc.exe'
            other.write_bytes(b'')
            with self.assertRaisesRegex(ValueError, 'faster-whisper-xxl'):
                subs.check_exe(str(other))
            subs.save_key(' sk-1 ', root)
            self.assertEqual(subs.read_key(root), 'sk-1')
            subs.save_key('', root)
            self.assertEqual(subs.read_key(root), '')


if __name__ == '__main__':
    unittest.main()

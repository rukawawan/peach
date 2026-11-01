"""欧美资料刮削：ThePornDB 搜索结果的身份判定、文件指纹与候选范围。"""
import json
import struct
import tempfile
import unittest
from pathlib import Path

from peach import western_tpdb as tpdb
from peach.http import HttpResponse


def scene(title='Hot Afternoon', date='2024-05-07', site='Vixen', performers=('Lena Anderson',), **extra):
    return {'id': 'abc', 'title': title, 'date': date, 'site': {'name': site, 'short_name': site.lower()},
            'performers': [{'name': name, 'parent': {'name': name, 'extras': {'gender': 'Female'}}}
                           for name in performers], 'tags': [{'name': 'Blonde'}], **extra}


class MatchTests(unittest.TestCase):
    def test_site_and_date_from_filename_identify_the_scene(self):
        self.assertGreater(tpdb.match_score(scene(), 'Vixen.24.05.07.Lena.Anderson.XXX.1080p.mp4'), 0)

    def test_a_different_release_date_is_not_the_same_scene(self):
        self.assertEqual(tpdb.match_score(scene(date='2024-05-08'), 'Vixen.24.05.07.Lena.Anderson.XXX.mp4'), 0)

    def test_site_missing_from_filename_is_rejected(self):
        self.assertEqual(tpdb.match_score(scene(site='Blacked'), 'Vixen.24.05.07.Lena.Anderson.mp4'), 0)

    def test_slug_filenames_need_a_performer_or_title(self):
        self.assertGreater(tpdb.match_score(scene(date=''), 'vixen-lena-anderson-hot-afternoon.mp4'), 0)
        self.assertEqual(tpdb.match_score(scene(date='', performers=('Someone Else',), title='Other'),
                                          'vixen-lena-anderson-scene.mp4'), 0)

    def test_tied_best_matches_are_not_chosen(self):
        name = 'Vixen.24.05.07.Lena.Anderson.mp4'
        self.assertIsNone(tpdb.choose([scene(), scene(title='Second')], name))
        self.assertEqual(tpdb.choose([scene(), scene(site='Blacked')], name)['site']['name'], 'Vixen')

    def test_male_performers_are_not_linked(self):
        item = scene(performers=('Lena Anderson',))
        item['performers'].append({'name': 'Mick', 'parent': {'name': 'Mick Blue', 'extras': {'gender': 'Male'}}})
        self.assertEqual(tpdb.performer_names(item), ['Lena Anderson'])

    def test_query_text_drops_release_noise(self):
        self.assertEqual(tpdb.query_text('Vixen.24.05.07.Lena.Anderson.XXX.1080p.MP4-KTR[rarbg].mp4'),
                         'Vixen.24.05.07.Lena.Anderson')
        self.assertEqual(tpdb.query_text('wankzvr-elena-koshka-gfe_180.mp4'), 'wankzvr.elena.koshka.gfe.180')


class FileTests(unittest.TestCase):
    def test_oshash_sums_size_and_both_ends(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'clip.mp4'
            data = bytes(range(256)) * 1024
            path.write_bytes(data)
            expected = len(data)
            for chunk in (data[:65536], data[-65536:]):
                for (word,) in struct.iter_unpack('<Q', chunk):
                    expected = (expected + word) & 0xFFFFFFFFFFFFFFFF
            self.assertEqual(tpdb.oshash(path), f'{expected:016x}')

    def test_western_names(self):
        self.assertTrue(tpdb.is_western_name('DorcelClub.24.12.02.Christy.White.XXX.1080p.mp4'))
        self.assertTrue(tpdb.is_western_name('wankzvr-elena-koshka-GFE-180.mp4'))
        self.assertFalse(tpdb.is_western_name('MIDV-001.mp4'))

    def test_token_round_trip_stays_in_secrets(self):
        with tempfile.TemporaryDirectory() as folder:
            tpdb.save_token(' abc123 ', Path(folder))
            self.assertEqual(json.loads((Path(folder) / tpdb.TOKEN_FILE).read_text())['token'], 'abc123')
            self.assertEqual(tpdb.read_token(Path(folder)), 'abc123')
            tpdb.save_token('', Path(folder))
            self.assertEqual(tpdb.read_token(Path(folder)), '')


class ClientTests(unittest.TestCase):
    def test_rejected_token_is_reported(self):
        client = tpdb.TpdbClient('bad', lambda *args: HttpResponse(401, {}, b'{}'), interval=0)
        with self.assertRaisesRegex(tpdb.TpdbError, 'Token'):
            client.check()

    def test_hash_lookup_sends_bearer_token(self):
        calls = []

        def transport(request, timeout, max_bytes):
            calls.append(request)
            return HttpResponse(200, {}, json.dumps({'data': [scene()]}).encode())
        hits = tpdb.TpdbClient('tok', transport, interval=0).by_hash('0123456789abcdef')
        self.assertEqual(len(hits), 1)
        self.assertEqual(calls[0].headers['Authorization'], 'Bearer tok')
        self.assertIn('hashType=OSHASH', calls[0].url)


if __name__ == '__main__':
    unittest.main()

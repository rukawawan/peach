"""西方官方图片的身份绑定、唯一作品匹配、头像比脸与按批撤回的无番号封面。"""
import contextlib
import io
import json
import sqlite3
import tempfile
import unittest
from contextlib import closing
from types import SimpleNamespace
from unittest import mock
from unittest.mock import Mock
from pathlib import Path

from PIL import Image, ImageDraw

from peach import avatar_cover_face, avatar_picker, western_artwork as artwork, western_catalog, western_tpdb
from peach.http import HttpResponse
from peach.web_catalog import attach_artwork_fields
from peach.web_state import WebContract
from scripts import harvest_western_artwork, revert_auto_landing
from tests.support.ledger import fresh_ledger


def node(name='Lena Anderson', released='2019-08-14T17:30:00Z', slug='cam-to-me'):
    return {'title': 'Cam To Me', 'slug': slug, 'releaseDate': released,
            'models': [{'name': name}, {'name': 'Kai Taylor'}],
            'images': {'poster': [{'src': 'https://cdn.tushy.com/small.jpg', 'width': 640},
                                  {'src': 'https://cdn.tushy.com/full.jpg', 'width': 1920}]}}


class WesternCatalogTests(unittest.TestCase):
    def setUp(self):
        self.identity = artwork.scene_identity({'name': 'North.Star.25.02.03.Example.Scene.1080p.mp4'})
        self.scene = {'id': 'acda6af1-3a18-4588-9d07-4942d8d1601f', 'date': '2025-02-03',
                      'title': 'Example Scene', 'studio': {'name': 'North Star'},
                      'performers': [{'performer': {'name': 'Example Artist'}}],
                      'tags': [{'name': 'Example Category'}], 'images': []}

    def transport(self, rows, *, total=None, detail=None):
        def request(call, timeout, max_bytes):
            self.assertEqual(call.url, western_catalog.ENDPOINT)
            self.assertEqual(call.headers['ApiKey'], 'fixture-key')
            body = json.loads(call.body)
            if 'term' in body['variables']:
                data = {'searchScenes': {'count': len(rows) if total is None else total, 'scenes': rows}}
            else:
                data = {'findScene': self.scene if detail is None else detail}
            return HttpResponse(200, {}, json.dumps({'data': data}).encode())
        return Mock(side_effect=request)

    def test_unlisted_publisher_is_matched_without_a_poster(self):
        wrong = {**self.scene, 'id': 'another-scene', 'studio': {'name': 'Different Studio'}}
        document = western_catalog.collect(self.transport([wrong, self.scene]), 'fixture-key', self.identity)
        self.assertEqual(document['maker'], 'North Star')
        self.assertEqual(document['content_id'], self.scene['id'])
        self.assertEqual(document['actresses'], ['Example Artist'])
        self.assertEqual(document['genres'], ['Example Category'])
        self.assertEqual(document['image_url'], '')

    def test_truncated_results_and_changed_detail_do_not_bind(self):
        truncated = self.transport([self.scene], total=26)
        self.assertIsNone(western_catalog.collect(truncated, 'fixture-key', self.identity))
        self.assertEqual(truncated.call_count, 1)
        wrong = {**self.scene, 'id': '8b55fd5b-4c10-454d-807c-42a775c70065'}
        self.assertIsNone(western_catalog.collect(self.transport([self.scene], detail=wrong),
                                                'fixture-key', self.identity))

    def test_existing_metadata_can_identify_a_differently_named_file(self):
        identity = artwork.scene_identity({'name': '0001.mp4', 'studio': 'North Star',
                                           'release_date': '2025-02-03', 'catalog_title': 'Example Scene'})
        self.assertEqual(identity, self.identity.__class__('northstar', '2025-02-03', ('example', 'scene'), ('example', 'scene')))

    def test_rejected_credentials_are_distinct_from_missing_metadata(self):
        http = Mock(return_value=HttpResponse(200, {}, b'{"errors":[{"message":"not authorized"}]}'))
        with self.assertRaises(western_catalog.CredentialsRejected):
            western_catalog.collect(http, 'fixture-key', self.identity)
        http.assert_called_once()


class ThePornDBTests(unittest.TestCase):
    def setUp(self):
        self.identity = artwork.scene_identity({'name': 'North Star - Example Film (1994).mp4'})
        self.movie = {'id': 'acda6af1-3a18-4588-9d07-4942d8d1601f', 'date': '1994-07-08',
                      'title': 'Example Film', 'site': {'name': 'North Star'},
                      'poster': 'https://images.theporndb.net/example.jpg',
                      'performers': [{'parent': {'name': 'Example Artist'}}]}

    def response(self, *, rows=None, detail=None, next_page=None, path='movies'):
        def request(call, timeout, max_bytes):
            from urllib.parse import parse_qs, urlsplit

            self.assertEqual(call.headers['Authorization'], 'Bearer fixture-token')
            parsed = urlsplit(call.url)
            self.assertEqual(parsed.hostname, 'api.theporndb.net')
            if parsed.path in ('/scenes', '/movies'):
                expected = {'parse': ['example film'], 'year': ['1994']} if path == 'movies' else {
                    'parse': ['working alias'], 'year': ['1994']}
                self.assertEqual(parse_qs(parsed.query), expected)
                entries = ([self.movie] if rows is None else rows) if parsed.path == '/' + path else []
                payload = {'data': entries, 'links': {'next': next_page}, 'meta': {'total': len(entries)}}
            else:
                self.assertEqual(parsed.path, f"/{path}/{self.movie['id']}")
                payload = {'data': self.movie if detail is None else detail}
            return HttpResponse(200, {}, json.dumps(payload).encode())
        return Mock(side_effect=request)

    def test_year_only_movie_uses_the_complete_movie_search_and_rechecks_detail(self):
        http = self.response()
        document = western_tpdb.collect(http, 'fixture-token', self.identity)
        self.assertEqual(document['content_id'], f"movies:{self.movie['id']}")
        self.assertEqual(document['actresses'], ['Example Artist'])
        self.assertEqual(document['image_url'], self.movie['poster'])
        self.assertEqual(http.call_count, 2)

    def test_truncated_movies_and_different_detail_are_left_unbound(self):
        capped = self.response(next_page='https://api.theporndb.net/movies?page=2')
        self.assertIsNone(western_tpdb.collect(capped, 'fixture-token', self.identity))
        capped.assert_called_once()
        wrong = {**self.movie, 'date': '1995-07-08'}
        self.assertIsNone(western_tpdb.collect(self.response(detail=wrong), 'fixture-token', self.identity))

    def test_scene_matches_site_cast_alias_and_uses_an_available_poster_size(self):
        identity = artwork.scene_identity({'name': 'North Star 1994-07-08 Working Alias.mp4'})
        scene = {**self.movie, 'title': 'Different Title', 'poster': 'https://unrelated.test/poster.jpg',
                 'posters': {'medium': 'https://images.theporndb.net/medium.jpg'},
                 'performers': [{'name': 'Working Alias', 'parent': {'name': 'Canonical Name'}}]}
        http = self.response(rows=[scene], detail=scene, path='scenes')
        document = western_tpdb.collect(http, 'fixture-token', identity)
        self.assertEqual(document['actresses'], ['Canonical Name'])
        self.assertEqual(document['image_url'], scene['posters']['medium'])


class WesternSourceTests(unittest.TestCase):
    def test_gallery_urls_encode_spaces_and_keep_the_public_provider_port(self):
        page = b'<h1 id="babename">Melody Marks</h1><div id="profbox2"><a class="img" href="/pics/Melody Marks2.jpg"></a><a class="img" href="https://www.babepedia.com:123/pics/Other.jpg"></a><a class="img" href="https://localhost/pics/Other.jpg"></a></div>'
        found = artwork.babepedia_portraits(lambda *a: HttpResponse(200,{},page), 'Melody Marks')
        self.assertEqual([r['upstream_url'] for r in found],
                         ['https://www.babepedia.com/pics/Melody%20Marks2.jpg'])

    def http(self, nodes, detail=None):
        self.calls = []
        def call(request, timeout, max_bytes):
            self.calls.append(request)
            body = json.loads(request.body)
            data = ({'searchVideos': {'edges': [{'node': n} for n in nodes]}}
                    if 'query' in body['variables'] else {'findOneVideo': detail or nodes[0]})
            return HttpResponse(200, {}, json.dumps({'data': data}).encode())
        return call

    def test_exact_name_and_date_select_the_official_full_image(self):
        result = artwork.official_scene(self.http([node('Lena Paul'), node()], detail=node()),
                                        'tushy', 'Lena Anderson', '2019-08-14')
        self.assertEqual(result['image_url'], 'https://cdn.tushy.com/full.jpg')
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(json.loads(self.calls[0].body)['variables']['site'], 'TUSHY')

    def test_wrong_date_or_shared_first_name_do_not_bind_a_scene(self):
        for wrong in (node('Lena Paul'), node(released='2019-08-15')):
            self.assertIsNone(artwork.official_scene(self.http([wrong]), 'tushy', 'Lena Anderson', '2019-08-14'))
            self.assertEqual(len(self.calls), 1)

    def test_two_exact_scenes_require_review(self):
        self.assertIsNone(artwork.official_scene(self.http([node(), node(slug='other')]),
                                                'tushy', 'Lena Anderson', '2019-08-14'))

    def test_work_identity_rejects_a_similar_title_and_keeps_metadata_without_poster(self):
        identity = artwork.scene_identity({'name': 'Tushy.19.08.14.Lena.Anderson.Cam.To.Me.1080p.mp4'})
        correct = node()
        wrong = {**node(slug='cam-to-someone'), 'title': 'Cam To Someone'}
        detail = {**correct, 'images': {}}
        result = artwork.collect_scene(self.http([wrong, correct], detail), identity)
        self.assertEqual(result['scene_id'], 'tushy:cam-to-me')
        self.assertEqual(result['performers'], ['Lena Anderson', 'Kai Taylor'])
        self.assertEqual(result['image_url'], '')
        self.assertIsNone(artwork.collect_scene(self.http([correct, node(slug='other')]), identity))
        self.assertIsNone(artwork.collect_scene(self.http([correct], wrong), identity))

    def test_details_must_retain_the_matching_identity(self):
        self.assertIsNone(artwork.official_scene(self.http([node()], node('Someone Else')),
                                                'tushy', 'Lena Anderson', '2019-08-14'))
        self.assertIsNone(artwork.official_scene(self.http([node()], node(slug='different')),
                                                'tushy', 'Lena Anderson', '2019-08-14'))

    def test_one_match_in_a_capped_search_does_not_bind_a_scene(self):
        edges = [node(), *[node('Different Person', slug=f'other-{i}') for i in range(artwork.SEARCH_LIMIT - 1)]]
        self.assertIsNone(artwork.official_scene(self.http(edges), 'tushy', 'Lena Anderson', '2019-08-14'))
        self.assertEqual(len(self.calls), 1)

    def test_an_image_from_another_host_is_not_an_official_cover(self):
        detail = node()
        detail['images']['poster'] = [{'src': 'https://evil-tushy.com/pic.jpg', 'width': 3000}]
        self.assertIsNone(artwork.official_scene(self.http([node()], detail),
                                                'tushy', 'Lena Anderson', '2019-08-14'))

    def test_graphql_errors_are_unavailable(self):
        def error(*args): return HttpResponse(200, {}, b'{"errors":[{"message":"blocked"}]}')
        with self.assertRaisesRegex(ValueError, '未取得'):
            artwork.official_scene(error, 'tushy', 'Lena Anderson', '2019-08-14')

    def test_malformed_search_and_detail_are_failures_not_missing_scenes(self):
        identity = artwork.scene_identity({'name': 'Tushy.19.08.14.Lena.Anderson.Cam.To.Me.1080p.mp4'})
        malformed = ({}, {'searchVideos': None}, {'searchVideos': {}},
                     {'searchVideos': {'edges': None}}, {'searchVideos': {'edges': [None]}},
                     {'searchVideos': {'edges': [{'node': {'slug': 'cam-to-me'}}]}},
                     {'searchVideos': {'edges': [{'node': {**node(), 'models': None}}]}},
                     {'searchVideos': {'edges': [{'node': {**node(), 'releaseDate': 'invalid'}}]}})
        for data in malformed:
            with self.subTest(data=data), self.assertRaises(ValueError):
                artwork.collect_scene(lambda *args, data=data: HttpResponse(
                    200, {}, json.dumps({'data': data}).encode()), identity)
        for detail in ({'slug': 'cam-to-me'}, {**node(), 'models': None}):
            with self.subTest(detail=detail), self.assertRaises(ValueError):
                artwork.collect_scene(self.http([node()], detail), identity)

    def test_malformed_response_can_be_retried_without_clearing_absence_cache(self):
        from peach.library_processing import _MissCache, _RemoteSession, misses_path
        from peach.settings_file import PeachConfig

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            config = PeachConfig(root, root / 'config.toml', present=True)
            row = {'id': 1, 'name': 'Tushy.19.08.14.Lena.Anderson.Cam.To.Me.1080p.mp4'}
            key = artwork.scene_identity(row).cache_key
            provider = SimpleNamespace(transport=lambda *args: HttpResponse(200, {}, b'{"data":{}}'))
            misses = _MissCache(misses_path(config))
            session = _RemoteSession(config, lambda: provider, misses, retrying=False)
            issue = Mock()
            options = dict(update=Mock(), issue=issue, fetch_cover=False)
            self.assertEqual(session.collect(row, '', ['title'], root / 'covers', **options), ([], 0))
            self.assertFalse(misses.fresh(artwork.SCENE_SOURCE, key))
            self.assertTrue(issue.call_args.kwargs['retryable'])
            provider.transport = self.http([node()])
            entries, covers = session.collect(row, '', ['title'], root / 'covers', **options)
            self.assertEqual((len(entries), covers), (1, 0))
            self.assertEqual(entries[0][1]['content_id'], 'tushy:cam-to-me')

    def test_valid_empty_search_remains_a_missing_scene(self):
        identity = artwork.scene_identity({'name': 'Tushy.19.08.14.Lena.Anderson.Cam.To.Me.1080p.mp4'})
        self.assertIsNone(artwork.collect_scene(self.http([]), identity))

    def test_upgrade_releases_only_old_western_misses_and_preserves_current_results(self):
        from peach.library_processing import _MissCache

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory).resolve() / 'misses.json'
            cache = _MissCache(path)
            cache.record(artwork.SCENE_SOURCE, 'western-example')
            cache.record('javdb', 'ABW-001')
            current = _MissCache(path)
            self.assertTrue(current.fresh(artwork.SCENE_SOURCE, 'western-example'))
            old = json.loads(path.read_text(encoding='utf-8'))
            old.pop('western_scene_rules')
            path.write_text(json.dumps(old), encoding='utf-8')
            upgraded = _MissCache(path)
            self.assertFalse(upgraded.fresh(artwork.SCENE_SOURCE, 'western-example'))
            self.assertTrue(upgraded.fresh('javdb', 'ABW-001'))
            upgraded.record(artwork.SCENE_SOURCE, 'western-example')
            self.assertTrue(_MissCache(path).fresh(artwork.SCENE_SOURCE, 'western-example'))

    def test_main_portraits_exclude_related_people_and_user_uploads(self):
        page = b'<h1 id="babename">Melody Marks</h1><div id="profbox2"><a class="img" href="/pics/Melody.jpg"></a><a class="img" href="https://other.com/a.jpg"></a></div><div class="useruploads2"><a class="img" href="/pics/unverified.jpg"></a></div>'
        calls = []
        def http(request, *args):
            calls.append(request.url)
            return HttpResponse(200, {}, page)
        portraits = artwork.babepedia_portraits(http, 'Melody Marks')
        self.assertEqual([p['upstream_url'] for p in portraits], ['https://www.babepedia.com/pics/Melody.jpg'])
        self.assertEqual(calls, ['https://www.babepedia.com/babe/Melody_Marks'])

    def test_a_different_profile_or_challenge_page_is_unavailable(self):
        for page in (b'<h1 id="babename">Melody Other</h1>', b'<title>Just a moment</title>'):
            with self.assertRaisesRegex(ValueError, '未取得'):
                artwork.babepedia_portraits(lambda *a, body=page: HttpResponse(200, {}, body), 'Melody Marks')

    def test_explicit_profile_alias_binds_a_different_stage_name(self):
        page = b'<h1 id="babename">Blaire Ivory</h1><h2 id="aka"><small>Also known as:</small> Lena Anderson - Lena - Blair<img id="aliasinfobtn" alt="More info on her aliases"></h2><div id="profbox2"><a class="img" href="/pics/Blaire.jpg"></a></div>'
        calls = []
        def http(request, *args):
            calls.append(request.url)
            return HttpResponse(200, {}, page)
        result = artwork.babepedia_portraits(http, 'Lena Anderson',
                                            profile_url='https://www.babepedia.com/babe/Blaire_Ivory')
        self.assertEqual(result[0]['matched_name'], 'Blaire Ivory')
        self.assertEqual(calls, ['https://www.babepedia.com/babe/Blaire_Ivory'])

    def test_a_profile_url_from_another_site_is_rejected_before_request(self):
        calls = []
        with self.assertRaisesRegex(ValueError, '档案地址'):
            artwork.babepedia_portraits(lambda *a: calls.append(a), 'Lena Anderson',
                                        profile_url='https://other.com/babe/Blaire_Ivory')
        self.assertEqual(calls, [])

    def test_filename_date_requires_the_publisher_and_valid_calendar_date(self):
        self.assertEqual(artwork.filename_date('tushy.19.08.14.lena.anderson.4k.mp4', 'tushy'), '2019-08-14')
        self.assertEqual(artwork.filename_date('vixen.19.08.14.lena.mp4', 'tushy'), '')
        self.assertEqual(artwork.filename_date('tushy.19.02.31.lena.mp4', 'tushy'), '')


def portrait(colour) -> tuple:
    image = Image.new('RGB', (600, 800), colour)
    buffer = io.BytesIO(); image.save(buffer, 'JPEG')
    body = buffer.getvalue()
    origin = {'upstream_url': f'https://www.babepedia.com/pics/{colour}.jpg', 'automatic_install': True}
    return origin, body, avatar_picker.accept_image(body)


class Matcher:
    """按图中心的颜色给特征：红色是她，蓝色是别人，封面截图记作她。"""
    unavailable = ''

    def embedding(self, body):
        if body == b'cover':
            return [1.0, 0.0]
        pixel = Image.open(io.BytesIO(body)).convert('RGB').getpixel((300, 400))
        return [1.0, 0.0] if pixel[0] > pixel[2] else [0.0, 1.0]


class WesternPortraitGateTests(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.object(avatar_cover_face, 'cut', return_value=(b'cover', {}))
        patcher.start()
        self.addCleanup(patcher.stop)
        self.covers = [SimpleNamespace(code='', asset_id=1), SimpleNamespace(code='', asset_id=2)]

    def test_the_portrait_that_matches_her_single_work_covers_is_chosen(self):
        winner, evidence, reason = artwork.face_matched_portrait([portrait('blue'), portrait('red')],
                                                                 self.covers, Matcher())
        self.assertEqual(winner.origin['upstream_url'], 'https://www.babepedia.com/pics/red.jpg')
        self.assertEqual([cover['asset_id'] for cover in evidence['covers']], [1, 2])
        self.assertEqual(reason, '')

    def test_without_covers_or_a_matching_face_nothing_is_installed(self):
        self.assertEqual(artwork.face_matched_portrait([portrait('red')], [], Matcher())[0], None)
        winner, evidence, reason = artwork.face_matched_portrait([portrait('blue')], self.covers, Matcher())
        self.assertIsNone(winner)
        self.assertEqual(evidence, {})
        self.assertEqual(reason, '图库 1 张认不准')

    def test_an_unavailable_model_installs_nothing(self):
        matcher = Matcher()
        matcher.unavailable = '模型未下载'
        winner, _evidence, reason = artwork.face_matched_portrait([portrait('red')], self.covers, matcher)
        self.assertIsNone(winner)
        self.assertIn('模型未下载', reason)


class WesternArtworkBatchTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name).resolve()

    def test_profile_addresses_come_only_from_confirmed_candidate_rows(self):
        db = fresh_ledger(self.root)
        with closing(sqlite3.connect(db)) as connection:
            kept, unsure = (connection.execute(
                "INSERT INTO entity(kind,canonical_name,normalized_name,created_at,updated_at) "
                "VALUES('creator',?,?,'','')", (name, name.lower())).lastrowid for name in ('Kept', 'Unsure'))
            connection.commit()
            table = self.root / 'babepedia-candidates.csv'
            table.write_text('entity_id,verdict,profile_url\n'
                             f'{kept},matched,https://www.babepedia.com/babe/Kept\n'
                             f'{unsure},needs-review,https://www.babepedia.com/babe/Someone\n', encoding='utf-8')
            self.assertEqual(harvest_western_artwork.profile_urls(connection, table, [kept, unsure]),
                             {kept: 'https://www.babepedia.com/babe/Kept'})
            # 旧版候选表写的中文判词照样认。
            table.write_text('entity_id,verdict,profile_url\n'
                             f'{kept},命中,https://www.babepedia.com/babe/Kept\n'
                             f'{unsure},需人工确认,https://www.babepedia.com/babe/Someone\n', encoding='utf-8')
            self.assertEqual(harvest_western_artwork.profile_urls(connection, table, [kept, unsure]),
                             {kept: 'https://www.babepedia.com/babe/Kept'})

    def test_revert_removes_one_batch_of_covers_with_their_sidecars(self):
        covers = self.root / 'covers'
        covers.mkdir()
        for asset_id, record in ((1, {'source': artwork.SOURCE, 'batch': artwork.SOURCE + '@one'}),
                                 (2, {'source': artwork.SOURCE, 'batch': artwork.SOURCE + '@two'}),
                                 (3, {'provider': 'western-official'})):
            (covers / f'ASSET-ID-{asset_id}.jpg').write_bytes(b'jpeg')
            (covers / f'ASSET-ID-{asset_id}.face.json').write_text('{}', encoding='utf8')
            (covers / f'ASSET-ID-{asset_id}.scraping.json').write_text(json.dumps(record), encoding='utf8')
        self.assertEqual([path.name for path in artwork.planned_covers(covers, artwork.SOURCE, '')],
                         ['ASSET-ID-1.jpg', 'ASSET-ID-2.jpg'])
        db = fresh_ledger(self.root)
        with contextlib.redirect_stdout(io.StringIO()):
            revert_auto_landing.main(['--db', str(db), '--apply', '--backup', str(self.root / 'backup.db'),
                                      '--source', artwork.SOURCE, '--batch', artwork.SOURCE + '@one',
                                      '--cover-root', str(covers), '--logo-root', str(self.root / 'logos')])
        self.assertEqual(sorted(path.name for path in covers.iterdir()),
                         ['ASSET-ID-2.face.json', 'ASSET-ID-2.jpg', 'ASSET-ID-2.scraping.json',
                          'ASSET-ID-3.face.json', 'ASSET-ID-3.jpg', 'ASSET-ID-3.scraping.json'])


class WesternLocalArtworkTests(unittest.TestCase):
    def test_cover_projection_and_picker_use_an_asset_key_without_changing_code(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            image = Image.new('RGB', (640, 360), 'red')
            ImageDraw.Draw(image).rectangle((20, 20, 200, 200), fill='black')
            buffer = io.BytesIO(); image.save(buffer, 'JPEG')
            (root / 'ASSET-ID-1.jpg').write_bytes(buffer.getvalue())
            con = sqlite3.connect(':memory:')
            con.executescript("CREATE TABLE asset(id,code,catalog_title,name,snapshot_path,medium,size);"
                             "CREATE TABLE asset_entity(asset_id,entity_id,role);"
                             "CREATE TABLE entity(id,kind);"
                             "INSERT INTO entity VALUES(5,'performer');"
                             "INSERT INTO asset VALUES(1,NULL,NULL,'Tushy',NULL,'video',1);"
                             "INSERT INTO asset_entity VALUES(1,5,'performer');")
            choices = avatar_picker.asset_artwork(con, root, 5)
            self.assertEqual(choices[0].ref, 'asset:1:cover')
            self.assertEqual(choices[0].cast, 1)
            source = avatar_picker.ArtworkSource(root, lambda *a: None)
            body, origin = avatar_picker.resolve('asset:1:cover', con, root, 5, None, artwork=source)
            self.assertEqual(body, buffer.getvalue())
            self.assertEqual(origin['asset_code'], '')
            contract = WebContract(root / 'ledger.db', cover_root=root)
            item = {'id': 1, 'code': None}
            attach_artwork_fields(contract, item)
            self.assertEqual(item['cover_key'], 'ASSET-ID-1')
            self.assertIsNone(item['code'])
            self.assertTrue(item['has_cover'])
            self.assertEqual(avatar_picker.asset_artwork(con, root, 6), [])
            (root / 'ASSET-ID-1.scraping.json').write_text(json.dumps({
                'provider': 'western-official', 'performers': ['Lena Anderson', 'Kai Taylor']}), encoding='utf8')
            choice = avatar_picker.asset_artwork(con, root, 5)[0]
            self.assertEqual(choice.cast, 2)
            self.assertIsNone(choice.focus)
            con.execute('ALTER TABLE asset ADD COLUMN disposal')
            probe = Mock()
            self.assertEqual(avatar_cover_face.faces(con, root, 5, probe), [])
            probe.on_bytes.assert_not_called()
            con.close()

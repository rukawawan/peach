"""缺 `ctts` 的 MP4 重建头。

用例不跑解码器：显示顺序那一步换成已知的置换，剩下的全是头里的算术，可以逐字节断言。
"""
from __future__ import annotations

import struct
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from peach import mp4repair
from peach.ffmpeg import BinaryChoice
from peach.mp4index import _find, _iter_boxes, _video_stbl
from peach.mp4repair import (
    HeaderRepairStore, RepairUnavailable, RepairedHeader, read_sidecar,
    repaired_header, write_sidecar,
)

from support.mp4 import SAMPLE_SIZE, minimal_mp4, sample_bytes

#: 解码序 I P B B P B B …，显示序 I B B P B B P …；每组三帧里 P 要等两帧才显示。
DECODE_TO_DISPLAY = (0, 3, 1, 2, 6, 4, 5, 9, 7, 8, 12, 10, 11)


def moov_of(blob: bytes) -> bytes:
    for kind, body, stop in _iter_boxes(blob, 0, len(blob)):
        if kind == b"moov":
            return blob[body:stop]
    raise AssertionError("没有 moov")


def table(moov: bytes, kind: bytes) -> bytes | None:
    found = _video_stbl(moov, 0, len(moov))
    assert found is not None
    span = _find(moov, *found[1], kind)
    return None if span is None else moov[span[0]:span[1]]


def entries(payload: bytes, layout: str) -> list[tuple[int, ...]]:
    width = struct.calcsize(layout)
    count = struct.unpack_from(">I", payload, 4)[0]
    return [struct.unpack_from(layout, payload, 8 + index * width) for index in range(count)]


def composition_times(moov: bytes, sample_delta: int) -> list[int]:
    """每个样本的显示时刻：解码时刻加上 `ctts` 里的偏移。"""
    offsets: list[int] = []
    for run, offset in entries(table(moov, b"ctts"), ">Ii"):
        offsets.extend([offset] * run)
    return [index * sample_delta + offset for index, offset in enumerate(offsets)]


def edit_list_of(header: RepairedHeader) -> bytes:
    moov = moov_of(header.prefix)
    trak = _find(moov, 0, len(moov), b"trak")
    assert trak is not None
    edts = _find(moov, *trak, b"edts")
    assert edts is not None
    elst = _find(moov, *edts, b"elst")
    assert elst is not None
    return moov[elst[0]:elst[1]]


def legacy_sidecar(path: Path, rows: list[tuple[int, int, int]], *, version=0) -> RepairedHeader:
    """旧版本实际生成的 ctts 与明确存储起点；不依赖新 retimer 来构造旧错误。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    source = path.with_suffix(".mp4")
    source.write_bytes(minimal_mp4(timescale=1000, sample_delta=400,
                                  samples=len(DECODE_TO_DISPLAY), keyframe_every=6))
    layout = ">QqI" if version == 1 else ">IiI"
    elst = struct.pack(">II", version << 24, len(rows)) + b"".join(
        struct.pack(layout, *row) for row in rows)
    with patch.object(mp4repair, "_display_order", return_value=list(DECODE_TO_DISPLAY)), \
            patch.object(mp4repair, "_retimed_edit_list", return_value=elst):
        header = repaired_header(source, Path("ffprobe"))
    path.write_bytes(b"PEACHMP4\x01" + struct.pack(">QQQQ", len(header.prefix), len(header.suffix),
                                               header.payload_start, header.payload_end)
                     + header.prefix + header.suffix)
    return header


def tail_mp4(**options) -> bytes:
    """把正常布局里的 moov 搬到媒体后，并把块偏移改到新的媒体起点。"""
    blob = minimal_mp4(timescale=1000, sample_delta=400, samples=len(DECODE_TO_DISPLAY),
                       keyframe_every=6, **options)
    moov_span = next((body - 8, stop) for kind, body, stop in _iter_boxes(blob, 0, len(blob))
                     if kind == b"moov")
    start, stop = moov_span
    moov = blob[start:stop]
    tree = mp4repair._parse(moov, 8, len(moov))
    root = mp4repair._Box(b"moov", None, tree)
    mp4repair._shift_chunk_offsets(root, -len(moov))
    return blob[:start] + blob[stop:] + root.serialize()


class Mp4HeaderRepairTests(unittest.TestCase):
    def setUp(self) -> None:
        self._temporary = TemporaryDirectory()
        self.root = Path(self._temporary.name)
        self.addCleanup(self._temporary.cleanup)

    def broken_mp4(self, path: Path, **options) -> Path:
        path.write_bytes(minimal_mp4(
            timescale=1000, sample_delta=400, samples=len(DECODE_TO_DISPLAY),
            keyframe_every=6, **options))
        return path

    def repair(self, path: Path, order=DECODE_TO_DISPLAY) -> RepairedHeader:
        """把「解一遍片子问显示顺序」换成已知答案，只验头里的算术。"""
        with patch.object(mp4repair, "_display_order",
                          lambda ffprobe, source, times: list(order)):
            return repaired_header(path, Path("ffprobe"))

    def test_a_rebuilt_header_puts_every_frame_back_in_display_order(self):
        source = self.broken_mp4(self.root / "broken.mp4")
        header = self.repair(source)
        times = composition_times(moov_of(header.prefix), 400)

        self.assertEqual(sorted(times), sorted(set(times)), "两帧显示在同一时刻")
        self.assertEqual([index for index, _ in sorted(enumerate(times), key=lambda pair: pair[1])],
                         [DECODE_TO_DISPLAY.index(rank) for rank in range(len(DECODE_TO_DISPLAY))])
        self.assertTrue(all(time >= index * 400 for index, time in enumerate(times)),
                        "有帧的显示时刻早于它的解码时刻")

    def test_the_spliced_file_keeps_the_original_media_bytes(self):
        source = self.broken_mp4(self.root / "broken.mp4")
        header = self.repair(source)
        blob = source.read_bytes()

        self.assertEqual(blob[header.payload_start:header.payload_end],
                         sample_bytes(len(DECODE_TO_DISPLAY)))
        self.assertEqual(header.size, len(header.prefix) + len(sample_bytes(len(DECODE_TO_DISPLAY))))

    def test_chunk_offsets_move_with_the_longer_header(self):
        source = self.broken_mp4(self.root / "broken.mp4")
        header = self.repair(source)
        delta = len(header.prefix) - header.payload_start
        before = entries(table(moov_of(source.read_bytes()), b"stco"), ">I")
        after = entries(table(moov_of(header.prefix), b"stco"), ">I")

        self.assertGreater(delta, 0)
        self.assertEqual([value + delta for (value,) in before], [value for (value,) in after])
        self.assertEqual(after[0][0], len(header.prefix))
        self.assertEqual(after[-1][0],
                         header.size - SAMPLE_SIZE, "最后一个块没落在文件末尾那一段上")

    def test_a_tail_moov_is_moved_ahead_of_the_media_without_rewriting_samples(self):
        source = self.root / "tail.mp4"
        source.write_bytes(tail_mp4())
        header = self.repair(source)
        blob = source.read_bytes()

        self.assertEqual(blob[header.payload_start:header.payload_end],
                         sample_bytes(len(DECODE_TO_DISPLAY)))
        self.assertEqual(header.suffix, b"")
        moov = moov_of(header.prefix)
        self.assertEqual(next(_iter_boxes(moov, 0, len(moov)))[0], b"mvhd")

    def test_tail_layout_chunk_offsets_point_into_the_spliced_media(self):
        source = self.root / "tail.mp4"
        source.write_bytes(tail_mp4())
        header = self.repair(source)
        after = entries(table(moov_of(header.prefix), b"stco"), ">I")

        self.assertEqual(after[0][0], len(header.prefix))
        self.assertEqual(after[-1][0], header.size - SAMPLE_SIZE)

    def test_other_tail_boxes_stay_after_the_media_when_moov_moves(self):
        source = self.root / "tail.mp4"
        media = tail_mp4()
        moov_start = media.rfind(b"moov") - 4
        source.write_bytes(media[:moov_start] + b"\x00\x00\x00\x10freeABCDEFGH" + media[moov_start:])
        header = self.repair(source)

        self.assertEqual(header.suffix, b"\x00\x00\x00\x10freeABCDEFGH")

    def test_tail_layout_moves_64_bit_chunk_offsets_with_the_media(self):
        blob = tail_mp4()
        start = blob.rfind(b'moov') - 4
        root = mp4repair._Box(b'moov', None, mp4repair._parse(blob[start:], 8, len(blob) - start))
        video = next(child for child in root.children if child.kind == b'trak')
        stco = mp4repair._sample_table(video).find(b'stco')
        offsets = entries(stco.payload, '>I')
        stco.kind = b'co64'
        stco.payload = stco.payload[:8] + b''.join(struct.pack('>Q', value) for value, in offsets)
        source = self.root / 'co64.mp4'
        source.write_bytes(blob[:start] + root.serialize())

        header = self.repair(source)

        self.assertEqual(entries(table(moov_of(header.prefix), b'co64'), '>Q'),
                         [(len(header.prefix) + index * SAMPLE_SIZE,)
                          for index in range(len(DECODE_TO_DISPLAY))])

    def test_extended_size_tail_moov_uses_its_actual_payload_start(self):
        blob = tail_mp4()
        start = blob.rfind(b'moov') - 4
        moov = blob[start:]
        source = self.root / 'extended.mp4'
        source.write_bytes(blob[:start] + struct.pack('>I4sQ', 1, b'moov', len(moov) + 8) + moov[8:])
        header = self.repair(source)
        self.assertEqual(entries(table(moov_of(header.prefix), b'stco'), '>I')[0][0], len(header.prefix))
        normal = self.broken_mp4(self.root / 'normal.mp4')
        self.assertEqual(composition_times(moov_of(header.prefix), 400),
                         composition_times(moov_of(self.repair(normal).prefix), 400))

    def test_tail_layout_requires_one_media_box_and_bounded_metadata(self):
        source = self.root / 'tail.mp4'
        source.write_bytes(tail_mp4() + b'\x00\x00\x00\x0cmdatDATA')
        with self.assertRaisesRegex(RepairUnavailable, '各有一个'):
            self.repair(source)
        source.write_bytes(tail_mp4())
        with patch.object(mp4repair, 'HEADER_LIMIT', 24):
            with self.assertRaises(RepairUnavailable):
                self.repair(source)

    def test_ambiguous_tail_edit_start_keeps_the_transcode_fallback(self):
        source = self.root / 'tail.mp4'
        source.write_bytes(tail_mp4(edit_list=(5200, 800)))
        with self.assertRaisesRegex(RepairUnavailable, '预卷与裁剪'):
            self.repair(source)
        for start in (0, 400):
            with self.subTest(start=start):
                source.write_bytes(tail_mp4(edit_list=(5200, start)))
                self.assertEqual(entries(edit_list_of(self.repair(source)), '>IiI'),
                                 [(5200, 400, 1 << 16)])

    def test_an_edit_list_that_already_compensates_the_shift_is_left_alone(self):
        """封装器为 ctts 补过的那一刀要原样留着，再补一次会真的切掉开头那两帧。"""
        source = self.broken_mp4(self.root / "broken.mp4", edit_list=(5200, 400))
        header = self.repair(source)

        self.assertEqual(entries(self.edit_list(header), ">IiI"), [(5200, 400, 1 << 16)])

    def test_an_edit_list_with_rounding_error_is_not_shifted_twice(self):
        source = self.broken_mp4(self.root / "broken.mp4", edit_list=(5200, 398))
        header = self.repair(source)

        self.assertEqual(entries(self.edit_list(header), ">IiI"), [(5200, 398, 1 << 16)])

    def test_a_real_trim_keeps_its_own_start_and_takes_the_shift_on_top(self):
        source = self.broken_mp4(self.root / "broken.mp4", edit_list=(4000, 2000))
        header = self.repair(source)

        self.assertEqual(entries(self.edit_list(header), ">IiI"), [(4000, 2400, 1 << 16)])

    def test_the_half_frame_boundary_preserves_compensation_and_shifts_other_trims(self):
        for start, expected in ((0, 400), (199, 599), (200, 200), (600, 600),
                                (601, 1001), (2000, 2400)):
            with self.subTest(start=start):
                source = self.broken_mp4(self.root / "broken.mp4", edit_list=(5200, start))
                header = self.repair(source)
                self.assertEqual(entries(self.edit_list(header), ">IiI"), [(5200, expected, 1 << 16)])

    def test_variable_frame_rounding_keeps_empty_edits_and_64_bit_segments(self):
        elst = struct.pack(">II", 1 << 24, 3) + b"".join(struct.pack(">QqI", *row) for row in (
            (200, -1, 1 << 16), (1 << 35, 40039, 1 << 16), (100, 200000, 1 << 15)))
        payload = mp4repair._retimed_edit_list(elst, 40041, 0,
                                              mp4repair._half_frame([0, 40040, 80081]))

        self.assertEqual(entries(payload, ">QqI"), [
            (200, -1, 1 << 16), (1 << 35, 40039, 1 << 16), (100, 240041, 1 << 15)])

    def test_a_file_without_an_edit_list_gets_one_that_starts_at_the_shift(self):
        source = self.broken_mp4(self.root / "broken.mp4")
        header = self.repair(source)

        self.assertEqual(entries(self.edit_list(header), ">IiI"), [(5200, 400, 1 << 16)])

    def edit_list(self, header: RepairedHeader) -> bytes:
        return edit_list_of(header)

    def test_a_file_that_already_has_composition_offsets_is_refused(self):
        source = self.broken_mp4(self.root / "fine.mp4", composition_offsets=True)

        with self.assertRaises(RepairUnavailable):
            self.repair(source)

    def test_a_display_order_equal_to_the_decode_order_is_refused(self):
        source = self.broken_mp4(self.root / "fine.mp4")

        with self.assertRaises(RepairUnavailable):
            self.repair(source, order=range(len(DECODE_TO_DISPLAY)))

    def test_the_display_order_is_the_order_the_decoder_hands_frames_back(self):
        """解码器按显示顺序出帧，每帧的时间戳原样来自它那个样本，所以置换是读出来的。"""
        with patch.object(mp4repair.subprocess, "run",
                          lambda *args, **options: _Probe(b"0\n800\n1200\n400\n")):
            order = mp4repair._display_order(Path("ffprobe"), Path("movie.mp4"),
                                             [0, 400, 800, 1200])

        self.assertEqual(order, [0, 3, 1, 2])

    def test_a_decode_that_loses_frames_is_refused_instead_of_guessed(self):
        """少一帧就说明这份表和码流对不上，宁可不修，也不能写一张错的 ctts。"""
        with patch.object(mp4repair.subprocess, "run",
                          lambda *args, **options: _Probe(b"0\n800\n")):
            with self.assertRaises(RepairUnavailable):
                mp4repair._display_order(Path("ffprobe"), Path("movie.mp4"), [0, 400, 800])


class SidecarTests(unittest.TestCase):
    def setUp(self) -> None:
        self._temporary = TemporaryDirectory()
        self.root = Path(self._temporary.name)
        self.addCleanup(self._temporary.cleanup)

    def test_a_sidecar_reads_back_exactly_what_was_written(self):
        header = RepairedHeader(prefix=b"head", payload_start=7, payload_end=99, suffix=b"tail")
        path = self.root / "9-1-2.mp4hdr"
        write_sidecar(path, header)

        self.assertEqual(read_sidecar(path), header)

    def test_a_truncated_sidecar_reads_as_missing(self):
        path = self.root / "9-1-2.mp4hdr"
        write_sidecar(path, RepairedHeader(prefix=b"head", payload_start=7, payload_end=99))
        path.write_bytes(path.read_bytes()[:-1])

        self.assertIsNone(read_sidecar(path))

    def test_a_missing_sidecar_reads_as_missing(self):
        self.assertIsNone(read_sidecar(self.root / "nothing.mp4hdr"))

    def test_legacy_rounding_is_corrected_without_reading_or_decoding_the_source(self):
        for version in (0, 1):
            with self.subTest(version=version):
                path = self.root / "legacy.mp4hdr"
                old = legacy_sidecar(path, [(200, -1, 1 << 16), (5200, 798, 1 << 16),
                                            (4000, 2400, 1 << 15)], version=version)
                original = path.read_bytes()
                path.with_suffix(".mp4").unlink()
                with patch.object(mp4repair, "repaired_header", side_effect=AssertionError("不重新解码")):
                    header = read_sidecar(path)
                self.assertIsNotNone(header)
                self.assertEqual(entries(edit_list_of(header), ">QqI" if version else ">IiI"), [
                    (200, -1, 1 << 16), (5200, 398, 1 << 16), (4000, 2400, 1 << 15)])
                self.assertEqual((header.payload_start, header.payload_end, header.suffix),
                                 (old.payload_start, old.payload_end, old.suffix))
                self.assertEqual(len(header.prefix), len(old.prefix))
                self.assertEqual(table(moov_of(header.prefix), b"stco"), table(moov_of(old.prefix), b"stco"))
                self.assertEqual(table(moov_of(header.prefix), b"ctts"), table(moov_of(old.prefix), b"ctts"))
                self.assertEqual(path.read_bytes(), original)
                self.assertEqual(read_sidecar(path), header)

    def test_unaffected_legacy_compensation_and_trims_are_reused_byte_for_byte(self):
        for start in (400, 599, 1001, 2400):
            with self.subTest(start=start):
                path = self.root / "legacy.mp4hdr"
                old = legacy_sidecar(path, [(5200, start, 1 << 16)])
                self.assertEqual(read_sidecar(path), old)

    def test_legacy_correction_uses_the_same_inclusive_half_frame_boundary(self):
        for stored, expected in ((600, 200), (798, 398), (802, 402), (1000, 600)):
            with self.subTest(stored=stored):
                path = self.root / "legacy.mp4hdr"
                legacy_sidecar(path, [(5200, stored, 1 << 16)])
                self.assertEqual(entries(edit_list_of(read_sidecar(path)), ">IiI"),
                                 [(5200, expected, 1 << 16)])

    def test_new_headers_close_to_twice_the_shift_are_not_legacy_adjusted(self):
        path = self.root / "current.mp4hdr"
        header = legacy_sidecar(path, [(5200, 900, 1 << 16)])
        write_sidecar(path, header)

        self.assertEqual(read_sidecar(path), header)
        self.assertTrue(path.read_bytes().startswith(b"PEACHMP4\x02"))

    def test_legacy_headers_with_incomplete_time_tables_read_as_missing(self):
        path = self.root / "invalid.mp4hdr"
        header = RepairedHeader(b"head", 8, 64)
        path.write_bytes(b"PEACHMP4\x01" + struct.pack(">QQQQ", 4, 0, 8, 64) + header.prefix)

        self.assertIsNone(read_sidecar(path))


class HeaderRepairStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self._temporary = TemporaryDirectory()
        self.root = Path(self._temporary.name)
        self.addCleanup(self._temporary.cleanup)
        self.source = self.root / "movie.mp4"
        self.source.write_bytes(b"x" * 64)
        self.store = HeaderRepairStore(self.root / "cache", _Resolver())
        self.header = RepairedHeader(prefix=b"head", payload_start=8, payload_end=64)

    def sidecar(self) -> Path:
        stat = self.source.stat()
        return self.store.root / f"6297-{stat.st_size}-{stat.st_mtime_ns}.mp4hdr"

    def test_a_stored_header_is_found_again_for_the_same_file(self):
        write_sidecar(self.sidecar(), self.header)

        self.assertEqual(self.store.lookup(6297, self.source), self.header)

    def test_a_changed_source_file_invalidates_the_stored_header(self):
        write_sidecar(self.sidecar(), self.header)
        self.source.write_bytes(b"y" * 65)

        self.assertIsNone(self.store.lookup(6297, self.source))

    def test_a_missing_source_file_answers_none_instead_of_raising(self):
        self.assertIsNone(self.store.lookup(6297, self.root / "gone.mp4"))

    def test_a_looked_up_header_is_kept_for_the_next_range_request(self):
        """一份头有几 MB，拖动一次进度条就是十几个 Range，不能每个都回去读文件。"""
        sidecar = self.sidecar()
        write_sidecar(sidecar, self.header)
        self.assertEqual(self.store.lookup(6297, self.source), self.header)
        sidecar.unlink()

        self.assertEqual(self.store.lookup(6297, self.source), self.header)

    def test_the_probe_that_gets_run_is_the_one_the_resolver_points_at(self):
        """定位器答的是 `BinaryChoice`，解码那一步要的是它里面那条路径。"""
        seen: list[Path] = []

        def build(source: Path, ffprobe: Path):
            seen.append(ffprobe)
            return self.header

        with patch.object(mp4repair, "repaired_header", build):
            self.assertTrue(self.store.repair_now(6297, self.source))

        self.assertEqual(seen, [Path("ffprobe")])

    def test_playback_header_repair_is_registered_before_it_reads_media(self):
        import threading
        from support.ledger import fresh_ledger
        from peach.task_runs import TaskRunStore
        from peach import task_control

        ledger = self.root / 'ledger'
        ledger.mkdir()
        store = TaskRunStore(fresh_ledger(ledger))
        repairs = HeaderRepairStore(self.root / 'managed-cache', _Resolver(), runs=store)
        entered, release = threading.Event(), threading.Event()
        def build(source, ffprobe):
            entered.set()
            release.wait(5)
            task_control.checkpoint()
            return self.header
        with patch.object(mp4repair, 'repaired_header', build):
            try:
                repairs.request(6297, self.source)
                self.assertTrue(entered.wait(5))
                run = store.query(task_key='mp4-header-repair')[0]
                self.assertEqual(run.status, 'running')
                # 任务卡在跑的时候就要能链接到正在修的那部作品。
                self.assertEqual(run.result_summary, {'asset_id': 6297, 'name': 'movie.mp4'})
                task_control.request(store, run.id, 'cancel')
                release.set()
                worker = next(iter(repairs._jobs.values())).thread
                worker.join(5)
                self.assertFalse(worker.is_alive())
                self.assertEqual(store.get(run.id).status, 'cancelled')
                self.assertFalse(self.sidecar().exists())
            finally:
                release.set()
                repairs.stop()

    def test_a_source_that_cannot_be_repaired_is_not_tried_again(self):
        """修不了的片子每次播放都重解一遍，就是把一分多钟的整片读白扔一次。"""
        attempts: list[Path] = []

        def build(source: Path, ffprobe: Path):
            attempts.append(source)
            raise RepairUnavailable("测试用：这个片源修不了")

        with patch.object(mp4repair, "repaired_header", build):
            outcomes = [self.store.repair_now(6297, self.source) for _ in range(3)]

        self.assertEqual(outcomes, [False, False, False])
        self.assertEqual(len(attempts), 1)
        self.assertIsNone(self.store.lookup(6297, self.source))

    def test_a_stored_header_is_not_computed_a_second_time(self):
        write_sidecar(self.sidecar(), self.header)

        with patch.object(mp4repair, "repaired_header", _never_called):
            self.assertFalse(self.store.repair_now(6297, self.source))

    def test_an_unreadable_existing_sidecar_can_be_rebuilt(self):
        self.sidecar().parent.mkdir(parents=True)
        self.sidecar().write_bytes(b"PEACHMP4\x01truncated")

        with patch.object(mp4repair, "repaired_header", return_value=self.header) as build:
            self.assertTrue(self.store.repair_now(6297, self.source))
            build.assert_called_once()
        self.assertEqual(self.store.lookup(6297, self.source), self.header)

    def test_a_legacy_rounding_header_is_reused_without_a_second_probe(self):
        legacy_sidecar(self.sidecar(), [(5200, 798, 1 << 16)])

        with patch.object(mp4repair, "repaired_header", side_effect=AssertionError("不重新解码")):
            self.assertFalse(self.store.repair_now(6297, self.source))
            header = self.store.lookup(6297, self.source)
        self.assertEqual(entries(edit_list_of(header), ">IiI"), [(5200, 398, 1 << 16)])

    def test_a_fresh_header_replaces_the_one_left_by_an_older_copy(self):
        stale = self.store.root / "6297-1-1.mp4hdr"
        write_sidecar(stale, self.header)

        with patch.object(mp4repair, "repaired_header", lambda source, ffprobe: self.header):
            self.assertTrue(self.store.repair_now(6297, self.source))

        self.assertFalse(stale.exists())
        self.assertEqual(self.store.lookup(6297, self.source), self.header)


def _never_called(source: Path, ffprobe: Path):
    raise AssertionError("不该再算一遍")


class _Probe:
    """`subprocess.run` 的返回值里，`_display_order` 只看这两样。"""

    def __init__(self, stdout: bytes, returncode: int = 0) -> None:
        self.stdout = stdout
        self.returncode = returncode


class _Resolver:
    """够 `HeaderRepairStore` 用的 FFmpeg 定位器：答案和生产里一样是 `BinaryChoice`。"""

    def ffprobe(self) -> BinaryChoice:
        return BinaryChoice(Path("ffprobe"), "test")


if __name__ == "__main__":
    unittest.main()

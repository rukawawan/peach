"""SMB 读写传输的隔离行为与请求期限。"""

import errno
import io
import logging
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch

from peach.smb_transport import (
    SmbConnection, SmbTransport, _DeadlineConnection, _SmbReader,
)
from smbprotocol.exceptions import NoMoreFiles, ObjectNameNotFound, AccessDenied, SMBAuthenticationError
from smbprotocol.file_info import FileAttributes
from smbprotocol.header import NtStatus, SMB2HeaderResponse
from smbprotocol.open import (
    CreateDisposition, CreateOptions, Open, ShareAccess, SMB2ReadResponse,
)


def field(value):
    return SimpleNamespace(get_value=lambda: value)


class SmbTransportTests(unittest.TestCase):
    def setUp(self):
        self.config = SmbConnection("files.invalid", "media", "reader", "secret", timeout=.1)
        self.conn = Mock()
        self.conn.transport.connected = True
        self.conn.max_read_size = 4
        self.conn.sequence_window = {"high": 20, "low": 0}
        self.conn.send.return_value = object()
        self.conn.disconnect.side_effect = self.disconnect
        self.tree = Mock()
        self.tree.is_dfs_share = False
        self.tree.session.session_id = 1
        self.tree.tree_connect_id = 2
        self.patches = [
            patch("peach.smb_transport._DeadlineConnection", return_value=self.conn),
            patch("peach.smb_transport.smbclient.register_session", return_value=self.tree.session),
            patch("peach.smb_transport.TreeConnect", return_value=self.tree),
            patch("peach.smb_transport.Open", side_effect=self.fd),
        ]
        self.mocks = [p.start() for p in self.patches]
        self.addCleanup(lambda: [p.stop() for p in reversed(self.patches)])
        self.transport = SmbTransport(self.config)
        self.addCleanup(self.transport.close)
        self.fds = []
        self.attrs = {}

    def disconnect(self, **_):
        self.conn.transport.connected = False

    def fd(self, tree, name):
        fd = Mock()
        fd.connection = self.conn
        fd.tree_connect = tree
        fd.file_name = name
        fd.connected = True
        fd.end_of_file = 10
        fd.file_attributes = self.attrs.get(name, 0)
        fd.last_write_time = datetime(2026, 1, 2, 3, 4, 5, 123456, tzinfo=timezone.utc)
        fd.close.side_effect = lambda: setattr(fd, "connected", False)
        fd.read.side_effect = lambda offset, length, send: (object(), lambda _: b"0123456789"[offset:offset+length])
        self.fds.append(fd)
        return fd

    def test_credentials_are_not_in_connection_repr(self):
        self.assertNotIn("reader", repr(self.config))
        self.assertNotIn("secret", repr(self.config))

    def test_write_uses_explicit_offsets_and_handles_partial_responses(self):
        self.conn.max_write_size = 4
        with patch.object(self.transport, '_set_info') as set_information:
            writer = self.transport.open_write('folder/new.mp4')
            fd = self.fds[-1]
            fd.write.side_effect = lambda data, offset, send: (object(), lambda _: min(2, len(data)))
            self.assertEqual(writer.write(b'abcdef'), 6)
            self.assertEqual([call.args[1] for call in fd.write.call_args_list], [0, 2, 4])
            self.assertEqual(writer.stat().st_size, 6)
            writer.flush()
            fd.flush.assert_called_once()
            writer.close()
            self.assertEqual(set_information.call_args.args[1]['end_of_file'].get_value(), 0)
        self.assertTrue(all(not fd.connected for fd in self.fds))

    def test_rename_keeps_both_parent_chains_and_refuses_replacement(self):
        with patch.object(self.transport, '_set_info') as set_information:
            self.transport.rename('a/source.mp4', 'b/target.mp4')
            fd, information = set_information.call_args.args
            self.assertEqual(fd.file_name, 'a\\source.mp4')
            self.assertFalse(information['replace_if_exists'].get_value())
            self.assertEqual(information['file_name'].get_value(), 'b\\target.mp4')
        self.assertTrue(all(not fd.connected for fd in self.fds))

    def test_write_refuses_reparse_before_truncation(self):
        self.attrs['link.mp4'] = FileAttributes.FILE_ATTRIBUTE_REPARSE_POINT
        with patch.object(self.transport, '_set_info') as set_information:
            with self.assertRaises(PermissionError):
                self.transport.open_write('link.mp4')
            set_information.assert_not_called()

    def test_write_permission_failure_and_root_protection(self):
        for action in (lambda: self.transport.unlink(()), lambda: self.transport.mkdir(()),
                       lambda: self.transport.rename('a', ())):
            with self.assertRaises(PermissionError):
                action()
        with patch.object(self.transport, '_set_info', side_effect=AccessDenied()):
            with self.assertRaises(PermissionError):
                self.transport.unlink('movie.mp4')
        self.assertTrue(all(not fd.connected for fd in self.fds))

    def test_open_handle_exposes_its_own_size_and_timestamp(self):
        with self.transport.open('movie.mp4') as reader:
            info = reader.stat()
            self.assertEqual(info.st_size, 10)
            self.assertGreater(info.st_mtime_ns, 0)
            reader.seek(4)
            self.assertEqual(reader.stat(), info)
        self.assertTrue(all(not fd.connected for fd in self.fds))

    def test_invalid_paths_never_connect(self):
        for path in ("../x", "/x", "\\x", "C:x", "x/../y", "x//y", "x:stream", "x/", ("a/b",), ("..",), ("x.",)):
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.transport.open(path)
        self.conn.connect.assert_not_called()

    def test_stat_preserves_size_time_and_read_sharing(self):
        result = self.transport.stat(("folder", "film.mp4"))
        self.assertEqual(result.name, "film.mp4")
        self.assertEqual(result.st_size, 10)
        self.assertEqual(result.mtime_ns % 1_000_000_000, 123456000)
        self.assertEqual(result.st_mtime, result.mtime)
        self.assertFalse(result.is_dir)
        parent, file = self.fds
        self.assertEqual(file.create.call_args.args[3], ShareAccess.FILE_SHARE_READ)
        self.assertEqual(file.create.call_args.args[4], CreateDisposition.FILE_OPEN)
        self.assertTrue(file.create.call_args.args[5] & CreateOptions.FILE_OPEN_REPARSE_POINT)
        parent.close.assert_called_once()
        file.close.assert_called_once()

    def test_parent_reparse_is_rejected_before_child_open(self):
        self.attrs["folder"] = FileAttributes.FILE_ATTRIBUTE_REPARSE_POINT
        with self.assertRaises(PermissionError):
            self.transport.open("folder/film.mp4")
        self.assertEqual(len(self.fds), 1)
        self.fds[0].close.assert_called_once()

    def test_final_reparse_is_rejected(self):
        self.attrs["film.mp4"] = FileAttributes.FILE_ATTRIBUTE_REPARSE_POINT
        with self.assertRaises(PermissionError):
            self.transport.open("film.mp4")

    def test_directory_uses_enumeration_metadata_without_per_entry_open(self):
        def entries(*_):
            def entry(name, attributes=0):
                return {key: field(value) for key, value in {
                    "file_name": name.encode("utf-16-le"), "file_attributes": attributes,
                    "last_write_time": datetime(2026, 1, 1, tzinfo=timezone.utc), "end_of_file": 12,
                }.items()}
            return [entry("."), entry("movie.mp4"), entry("folder", FileAttributes.FILE_ATTRIBUTE_DIRECTORY),
                    entry("link", FileAttributes.FILE_ATTRIBUTE_REPARSE_POINT)]
        original = self.mocks[3].side_effect
        def directory(tree, name):
            fd = original(tree, name)
            fd.query_directory.side_effect = [entries(), NoMoreFiles()]
            return fd
        self.mocks[3].side_effect = directory
        result = self.transport.scandir(())
        self.assertEqual([x.name for x in result], ["movie.mp4", "folder", "link"])
        self.assertEqual(result[0].size, 12)
        self.assertTrue(result[1].is_dir)
        self.assertTrue(result[2].is_symlink)
        self.assertEqual(len(self.fds), 1)
        self.assertEqual(self.fds[0].query_directory.call_count, 2)

    def test_connection_cache_is_private_and_dfs_is_rejected(self):
        self.tree.is_dfs_share = True
        with self.assertRaises(PermissionError):
            self.transport.stat(())
        self.assertTrue(self.transport._closed)
        self.assertEqual(self.transport._cache, {})
        self.conn.disconnect.assert_called_with(close=False)

    def test_missing_and_permission_failures_have_distinct_errno(self):
        """打开失败带共享内路径：诊断要靠文件名把「文件被移走」认成输入缺失，而不是代码缺陷。"""
        for exception, expected, filename in ((ObjectNameNotFound(), errno.ENOENT, "missing"),
                                              (AccessDenied(), errno.EACCES, "missing"),
                                              (SMBAuthenticationError("credential error"), errno.EACCES, None)):
            with self.subTest(expected=expected, filename=filename):
                original = self.fd
                def bad_fd(tree, name, original=original, exception=exception):
                    fd = original(tree, name)
                    fd.create.side_effect = exception
                    return fd
                self.mocks[3].side_effect = bad_fd
                with self.assertRaises(OSError) as caught:
                    self.transport.stat("missing")
                self.assertEqual(caught.exception.errno, expected)
                self.assertEqual(caught.exception.filename, filename)

    def test_seek_short_reads_and_eof(self):
        with self.transport.open("film.mp4") as reader:
            reader._fd.read.side_effect = lambda offset, length, send: (object(), lambda _: b"0123456789"[offset:offset+min(2, length)])
            self.assertEqual(reader.read(5), b"01234")
            self.assertEqual(reader.tell(), 5)
            self.assertEqual(reader.seek(-2, io.SEEK_CUR), 3)
            self.assertEqual(reader.read(2), b"34")
            self.assertEqual(reader.seek(-2, io.SEEK_END), 8)
            self.assertEqual(reader.read(), b"89")
            self.assertEqual(reader.read(), b"")
            self.assertEqual(reader.seek(100), 100)
            self.assertEqual(reader.read(), b"")
            for offset, whence in ((-1, 0), (0, 8)):
                with self.assertRaises(ValueError):
                    reader.seek(offset, whence)
        with self.assertRaises(ValueError):
            reader.read()

    def test_independent_handles_keep_offsets_and_parent_locks(self):
        first = self.transport.open("folder/film.mp4")
        second = self.transport.open("folder/film.mp4")
        self.assertIsNot(first._fd, second._fd)
        self.assertEqual(first.read(3), b"012")
        self.assertEqual(second.read(2), b"01")
        first.close()
        self.assertEqual(second.read(2), b"23")
        second.close()
        self.assertTrue(all(not fd.connected for fd in self.fds))

    def test_parallel_handles_read_separate_offsets(self):
        first = self.transport.open("film.mp4")
        second = self.transport.open("film.mp4")
        second.seek(5)
        barrier = threading.Barrier(2, timeout=2)
        def read_fd(offset, length, send):
            def receive(_):
                barrier.wait()
                return b"0123456789"[offset:offset+length]
            return object(), receive
        first._fd.read.side_effect = second._fd.read.side_effect = read_fd
        with ThreadPoolExecutor() as executor:
            a = executor.submit(first.read, 3)
            b = executor.submit(second.read, 3)
            self.assertEqual(a.result(), b"012")
            self.assertEqual(b.result(), b"567")
        self.assertEqual((first.tell(), second.tell()), (3, 8))
        first.close()
        second.close()

    def test_premature_empty_read_is_failure_and_disconnects(self):
        reader = self.transport.open("film.mp4")
        reader._fd.read.side_effect = lambda *args, **kwargs: (object(), lambda _: b"")
        with self.assertRaises(OSError) as caught:
            reader.read(1)
        self.assertEqual(caught.exception.errno, errno.EIO)
        self.assertTrue(self.transport._closed)

    def test_close_during_read_aborts_connection(self):
        reader = self.transport.open("film.mp4")
        reader._lock.acquire()
        reader.close()
        reader._lock.release()
        self.assertTrue(reader.closed)
        self.conn.disconnect.assert_called_with(close=False)

    def test_transport_close_does_not_reconnect(self):
        self.transport.stat(())
        self.transport.close()
        with self.assertRaises(OSError):
            self.transport.stat(())
        self.conn.connect.assert_called_once()


class SmbDeadlineTests(unittest.TestCase):
    def connection(self):
        conn = _DeadlineConnection(SmbConnection("files.invalid", "media", timeout=.05))
        conn._check_worker_running = Mock()
        conn.disconnect = Mock()
        return conn

    def request(self, status=NtStatus.STATUS_SUCCESS):
        response = SMB2HeaderResponse()
        response["status"] = status
        request = Mock()
        request.message = {"message_id": field(1)}
        request.response = response
        request.response_event = threading.Event()
        request.response_event_lock = threading.Lock()
        return request

    def test_timeout_cancels_and_disconnects_without_background_read(self):
        conn, request = self.connection(), self.request()
        with self.assertRaises(TimeoutError):
            conn.receive(request)
        request.cancel.assert_called_once()
        conn.disconnect.assert_called_once_with(close=False)

    def test_continuous_pending_does_not_extend_deadline(self):
        conn, request = self.connection(), self.request(NtStatus.STATUS_PENDING)
        request.response_event = Mock()
        request.response_event.wait.return_value = True
        with patch("peach.smb_transport.time.monotonic", side_effect=[10, 10.01, 10.03, 10.06]):
            with self.assertRaises(TimeoutError):
                conn.receive(request)
        waits = [call.args[0] for call in request.response_event.wait.call_args_list]
        self.assertLess(waits[1], waits[0])
        request.cancel.assert_called_once()
        conn.disconnect.assert_called_once_with(close=False)

    def test_cancel_failure_still_disconnects(self):
        conn, request = self.connection(), self.request()
        request.cancel.side_effect = OSError("offline")
        with self.assertRaises(TimeoutError):
            conn.receive(request)
        conn.disconnect.assert_called_once_with(close=False)

    def test_receive_uses_deadline_set_before_send(self):
        conn, request = self.connection(), self.request()
        request._peach_deadline = 9
        with patch("peach.smb_transport.time.monotonic", return_value=10):
            with self.assertRaises(TimeoutError):
                conn.receive(request)
        request.cancel.assert_called_once()
        conn.disconnect.assert_called_once_with(close=False)

    def test_authentication_uses_deadline_before_tree_connect(self):
        conn, request = self.connection(), self.request()
        conn.transport = SimpleNamespace(connected=True)
        config = SmbConnection("files.invalid", "media", "reader", "secret", timeout=.05)
        transport = SmbTransport(config)
        with patch("peach.smb_transport._DeadlineConnection", return_value=conn), \
                patch.object(conn, "connect"), \
                patch("smbclient._pool.Session.connect", autospec=True,
                      side_effect=lambda session: session.connection.receive(request)), \
                patch("peach.smb_transport.TreeConnect") as tree:
            with self.assertRaises(TimeoutError):
                transport.stat(())
        request.cancel.assert_called_once()
        tree.assert_not_called()
        self.assertTrue(transport._closed)
        self.assertEqual(transport._cache, {})

    def test_sdk_authentication_details_are_below_logging_threshold(self):
        for namespace in ("smbprotocol.session", "smbprotocol.connection", "smbclient._pool"):
            with self.subTest(namespace=namespace):
                self.assertFalse(logging.getLogger(namespace).isEnabledFor(logging.INFO))
                self.assertFalse(logging.getLogger(namespace).isEnabledFor(logging.DEBUG))

    def test_response_parser_never_resolves_symlinks(self):
        conn, request = self.connection(), self.request()
        request.response_event.set()
        conn.outstanding_requests[request.message["message_id"].get_value()] = request
        # 复用真实库的接收解析路径，只隔离网络事件与线程状态。
        self.assertIs(conn.receive(request, resolve_symlinks=True), request.response)

    def test_real_open_read_parser_receives_explicit_offset(self):
        conn = Mock()
        conn.transport.connected = True
        conn.max_read_size = 65536
        conn.sequence_window = {"high": 10, "low": 0}
        tree = SimpleNamespace(session=SimpleNamespace(connection=conn, session_id=7, username="reader"),
                               tree_connect_id=9, share_name="media")
        fd = Open(tree, "film.mp4")
        fd.end_of_file = 6
        fd.file_id = b"f" * 16
        packet = SMB2ReadResponse()
        packet["buffer"] = b"def"
        response = SMB2HeaderResponse()
        response["data"] = packet.pack()
        conn.receive.return_value = response
        transport = SimpleNamespace(_closed=False, close=Mock())
        reader = _SmbReader(transport, fd, [])
        reader.seek(3)
        self.assertEqual(reader.read(3), b"def")
        message = conn.send.call_args.args[0]
        self.assertEqual(message["offset"].get_value(), 3)
        self.assertEqual(message["length"].get_value(), 3)
        self.assertEqual(reader.tell(), 6)


if __name__ == "__main__":
    unittest.main()

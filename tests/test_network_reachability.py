import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx

from peach import network_reachability, peach_proxy
from peach.network_reachability import NetworkReachability


class NetworkReachabilityTests(unittest.TestCase):
    def monitor(self, *results):
        calls = list(results)

        def check():
            value = calls.pop(0)
            if isinstance(value, Exception):
                raise value
            return value
        monitor = NetworkReachability(check=check, wall_clock=lambda: 1700000000.0, retry_delay=0)
        self.addCleanup(monitor.stop)
        return monitor, calls

    def test_snapshot_starts_as_checking(self):
        monitor, _ = self.monitor()
        self.assertEqual(monitor.summary(), {"state": "checking", "checked_at": None})

    def test_one_success_is_online(self):
        monitor, calls = self.monitor(True)
        self.assertEqual(monitor.tick(), "online")
        self.assertEqual(monitor.summary(), {"state": "online", "checked_at": 1700000000.0})
        self.assertEqual(calls, [])

    def test_offline_needs_two_failures(self):
        monitor, _ = self.monitor(False, True)
        self.assertEqual(monitor.tick(), "online")
        monitor, _ = self.monitor(False, False)
        self.assertEqual(monitor.tick(), "offline")

    def test_recovery_from_offline_fires_once(self):
        monitor, calls = self.monitor(True, False, False, None, True, True)
        recovered = []
        monitor.on_recovered = lambda: recovered.append(monitor.summary()["state"])
        self.assertEqual(monitor.tick(), "online")
        self.assertEqual(monitor.tick(), "offline")
        self.assertEqual(monitor.tick(), "unknown")
        self.assertEqual(recovered, [])
        self.assertEqual(monitor.tick(), "online")
        self.assertEqual(monitor.tick(), "online")
        self.assertEqual(recovered, ["online"])
        self.assertEqual(calls, [])

    def test_a_declined_recovery_is_offered_again_on_the_next_online(self):
        monitor, _ = self.monitor(False, False, True, True, True)
        answers = [False, None]
        monitor.on_recovered = lambda: answers.pop(0)
        self.assertEqual([monitor.tick() for _ in range(4)], ["offline", "online", "online", "online"])
        self.assertEqual(answers, [])

    def test_undecidable_settings_and_errors_are_unknown(self):
        monitor, _ = self.monitor(None)
        self.assertEqual(monitor.tick(), "unknown")
        monitor, _ = self.monitor(RuntimeError("boom"))
        self.assertEqual(monitor.tick(), "unknown")


class ProbeTests(unittest.TestCase):
    def probe_with(self, handler):
        seen = []

        def client(**kwargs):
            def record(request):
                seen.append(str(request.url))
                return handler(request)
            return httpx.Client(transport=httpx.MockTransport(record), **kwargs)
        with patch.object(peach_proxy, "http_client", side_effect=client):
            return network_reachability.probe(timeout=1), seen

    def test_matching_body_is_online(self):
        result, seen = self.probe_with(lambda request: httpx.Response(200, content=b"Microsoft Connect Test"))
        self.assertIs(result, True)
        self.assertEqual(len(seen), 1)

    def test_captive_portal_body_falls_through_to_next_target(self):
        def handler(request):
            if request.url.host == "captive.apple.com":
                return httpx.Response(200, content=b"<HTML><BODY>Success</BODY></HTML>")
            return httpx.Response(200, content=b"<html>login</html>")
        result, seen = self.probe_with(handler)
        self.assertIs(result, True)
        self.assertEqual(len(seen), 2)

    def test_unreachable_targets_are_offline(self):
        def handler(request):
            raise httpx.ConnectError("refused", request=request)
        result, seen = self.probe_with(handler)
        self.assertIs(result, False)
        self.assertEqual(len(seen), len(network_reachability.TARGETS))

    def test_probe_uses_the_saved_peach_proxy(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            peach_proxy.save(root, {"mode": "proxy", "proxy": "http://127.0.0.1:1"})
            with patch.object(peach_proxy, "secrets_root", return_value=root), \
                    patch.object(httpx, "Client", wraps=httpx.Client) as client:
                self.assertIs(network_reachability.probe(timeout=0.5), False)
        options = client.call_args.kwargs
        self.assertEqual((options["proxy"], options["trust_env"]), ("http://127.0.0.1:1", False))

    def test_conflicting_proxy_settings_are_undecided(self):
        with patch.object(peach_proxy, "http_client", side_effect=ValueError("conflict")):
            self.assertIsNone(network_reachability.probe())


if __name__ == "__main__":
    unittest.main()

"""发布摘要签名：客户端校验与发布脚本，密钥都在测试里临时生成（ADR-0137）。"""
import base64
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat

from peach import release_signing
from scripts import sign_release

SUMS = (b"%s  ./Peach-1.0.0-windows-x64.zip\n%s  ./Peach-1.0.0-windows-x64-update.zip\n"
        % (b"a" * 64, b"b" * 64))


def keypair() -> tuple[str, str]:
    seed = Ed25519PrivateKey.generate().private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    private = base64.b64encode(seed).decode("ascii")
    return private, release_signing.public_key(private)


class VerifyTests(unittest.TestCase):
    def setUp(self):
        self.private, self.public = keypair()

    def test_signed_sums_yield_the_listed_digests(self):
        signature = release_signing.sign(SUMS, self.private).encode()
        self.assertEqual(release_signing.verify(SUMS, signature, (self.public,)),
                         {"Peach-1.0.0-windows-x64.zip": "a" * 64, "Peach-1.0.0-windows-x64-update.zip": "b" * 64})

    def test_one_changed_byte_is_rejected(self):
        signature = release_signing.sign(SUMS, self.private).encode()
        tampered = SUMS.replace(b"a" * 64, b"c" + b"a" * 63, 1)
        with self.assertRaisesRegex(ValueError, "签名校验未通过"):
            release_signing.verify(tampered, signature, (self.public,))
        broken = bytearray(signature)
        broken[50] ^= 1
        with self.assertRaisesRegex(ValueError, "签名校验未通过"):
            release_signing.verify(SUMS, bytes(broken), (self.public,))

    def test_a_key_the_client_does_not_trust_is_rejected(self):
        other, other_public = keypair()
        signature = release_signing.sign(SUMS, other).encode()
        with self.assertRaisesRegex(ValueError, "签名校验未通过"):
            release_signing.verify(SUMS, signature, (self.public,))
        # 把信任的公钥写进签名行、签名却出自另一把私钥，同样过不了。
        forged = signature.replace(other_public.encode(), self.public.encode())
        with self.assertRaisesRegex(ValueError, "签名校验未通过"):
            release_signing.verify(SUMS, forged, (self.public,))

    def test_missing_or_empty_signature_is_rejected(self):
        for signature in (b"", b"\n", b"not a signature\n"):
            with self.subTest(signature=signature), self.assertRaisesRegex(ValueError, "签名校验未通过"):
                release_signing.verify(SUMS, signature, (self.public,))

    def test_rotation_accepts_either_trusted_key(self):
        new, new_public = keypair()
        both = (release_signing.sign(SUMS, self.private) + release_signing.sign(SUMS, new)).encode()
        for trusted in ((self.public,), (new_public,), (self.public, new_public)):
            with self.subTest(trusted=trusted):
                self.assertIn("Peach-1.0.0-windows-x64.zip", release_signing.verify(SUMS, both, trusted))
        # 换签名私钥之后，新旧公钥并存的客户端照样认。
        only_new = release_signing.sign(SUMS, new).encode()
        self.assertTrue(release_signing.verify(SUMS, only_new, (self.public, new_public)))
        with self.assertRaisesRegex(ValueError, "签名校验未通过"):
            release_signing.verify(SUMS, only_new, (self.public,))

    def test_sums_must_be_well_formed_once_the_signature_holds(self):
        for sums in (b"", b"%s  Peach.zip\n%s  Peach.zip\n" % (b"a" * 64, b"b" * 64), b"zz  ../Peach.zip\n"):
            with self.subTest(sums=sums), self.assertRaises(ValueError):
                release_signing.verify(sums, release_signing.sign(sums, self.private).encode(), (self.public,))

    def test_published_public_keys_are_well_formed(self):
        # 写入正式公钥时多了空格或截断，在这里红，而不是让每次在线更新都验不过。
        for key in release_signing.PUBLIC_KEYS:
            with self.subTest(key=key):
                self.assertEqual(len(release_signing._key_bytes(key)), 32)

    def test_an_empty_trust_set_never_verifies(self):
        with self.assertRaisesRegex(ValueError, "签名校验未通过"):
            release_signing.verify(SUMS, release_signing.sign(SUMS, self.private).encode(), ())


class SignScriptTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.sums = Path(folder.name) / release_signing.SUMS
        self.sums.write_bytes(SUMS)
        self.signature = self.sums.with_name(release_signing.SIGNATURE)
        self.private, self.public = keypair()

    def test_release_rehearsal_signs_with_a_test_key_the_client_accepts(self):
        result = sign_release.sign(self.sums, [self.private], (self.public,))
        self.assertTrue(result["signed"] and result["trusted_by_source"], result)
        self.assertNotIn(b"\r", self.signature.read_bytes())
        with patch.object(release_signing, "PUBLIC_KEYS", (self.public,)):
            self.assertEqual(len(release_signing.verify(SUMS, self.signature.read_bytes())), 2)

    def test_without_source_keys_or_private_key_signing_is_skipped(self):
        self.assertFalse(sign_release.sign(self.sums, [], ())["signed"])
        self.assertFalse(self.signature.exists())

    def test_published_public_keys_require_a_private_key(self):
        with self.assertRaisesRegex(ValueError, "缺少签名私钥"):
            sign_release.sign(self.sums, [], (self.public,))
        self.assertFalse(self.signature.exists())

    def test_a_private_key_outside_the_source_keys_is_refused(self):
        other, _ = keypair()
        with self.assertRaisesRegex(ValueError, "不在源码的 PUBLIC_KEYS"):
            sign_release.sign(self.sums, [other], (self.public,))
        self.assertFalse(self.signature.exists())

    def test_first_signed_release_can_precede_the_source_keys(self):
        result = sign_release.sign(self.sums, [self.private], ())
        self.assertEqual((result["signed"], result["trusted_by_source"]), (True, False))
        self.assertTrue(release_signing.verify(SUMS, self.signature.read_bytes(), (self.public,)))

    def test_rotation_writes_one_line_per_private_key(self):
        new, new_public = keypair()
        sign_release.sign(self.sums, [self.private, new], (self.public, new_public))
        self.assertEqual([line.split()[0] for line in self.signature.read_text().splitlines()],
                         [self.public, new_public])

    def test_generated_key_stays_in_its_file_and_signs_for_the_printed_public_key(self):
        path = self.sums.with_name("signing.key")
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(sign_release.main(["--generate-key", str(path)]), 0)
        result = json.loads(output.getvalue())
        private = path.read_text(encoding="ascii").strip()
        self.assertNotIn(private, output.getvalue())
        self.assertEqual(release_signing.public_key(private), result["public_key"])
        sign_release.sign(self.sums, [private], (result["public_key"],))
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(sign_release.main(["--generate-key", str(path)]), 1)
        self.assertEqual(path.read_text(encoding="ascii").strip(), private)

    def test_cli_reads_keys_from_stdin_and_reports_failures(self):
        output = io.StringIO()
        with patch.object(release_signing, "PUBLIC_KEYS", (self.public,)), patch(
                "sys.stdin", io.StringIO(self.private + "\n")), contextlib.redirect_stdout(output):
            self.assertEqual(sign_release.main(["--sums", str(self.sums)]), 0)
        self.assertTrue(json.loads(output.getvalue())["signed"])
        output = io.StringIO()
        with patch.object(release_signing, "PUBLIC_KEYS", (self.public,)), patch(
                "sys.stdin", io.StringIO("")), contextlib.redirect_stdout(output):
            self.assertEqual(sign_release.main(["--sums", str(self.sums)]), 1)
        self.assertIn("缺少签名私钥", output.getvalue())


if __name__ == "__main__":
    unittest.main()

"""AI API keys are protected by the Windows user account or a private local file."""
from __future__ import annotations

import base64
import os
import re

from .follow_secrets import CredentialStore

_CUSTOM_ID = re.compile(r"custom-[0-9a-f]{32}")


def is_custom(provider) -> bool:
    return isinstance(provider, str) and bool(_CUSTOM_ID.fullmatch(provider))


def custom_ids(store: CredentialStore) -> list[str]:
    return sorted(path.stem for path in store.root.glob("custom-*.json") if is_custom(path.stem))


def store_for(state):
    return CredentialStore(state.settings.secrets_root / "ai")


def _dpapi(data: bytes, *, protect: bool) -> bytes:
    # DPAPI 当前用户保护。CRYPTPROTECT_UI_FORBIDDEN 让后台服务在无法解密时直接失败。
    import ctypes
    from ctypes import wintypes

    class Blob(ctypes.Structure):
        _fields_ = [("size", wintypes.DWORD), ("data", ctypes.POINTER(ctypes.c_ubyte))]

    library = ctypes.WinDLL("crypt32.dll", use_last_error=True)
    transform = library.CryptProtectData if protect else library.CryptUnprotectData
    transform.argtypes = (ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                          ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob))
    transform.restype = wintypes.BOOL
    source = (ctypes.c_ubyte * len(data)).from_buffer_copy(data)
    result = Blob()
    if not transform(ctypes.byref(Blob(len(data), source)), None, None, None, None, 1, ctypes.byref(result)):
        raise ctypes.WinError(ctypes.get_last_error())
    free = ctypes.WinDLL("kernel32.dll").LocalFree
    free.argtypes, free.restype = (ctypes.c_void_p,), ctypes.c_void_p
    try:
        return ctypes.string_at(result.data, result.size)
    finally:
        free(result.data)


def protected_fields(model: str, key: str) -> dict[str, str]:
    if os.name == "nt":
        return {"model": model, "dpapi": base64.b64encode(_dpapi(key.encode("ascii"), protect=True)).decode("ascii")}
    return {"model": model, "api_key": key}


def is_configured(values) -> bool:
    return bool(values.get("dpapi" if os.name == "nt" else "api_key"))


def read_key(values) -> str:
    if not is_configured(values):
        return ""
    if os.name == "nt":
        return _dpapi(base64.b64decode(values["dpapi"], validate=True), protect=False).decode("ascii")
    return values["api_key"]

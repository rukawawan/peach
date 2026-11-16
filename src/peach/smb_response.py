"""受 Peach 鉴权与播放会话管理的 SMB 字节范围响应。"""
from __future__ import annotations

import asyncio
import mimetypes

from starlette.responses import Response, StreamingResponse

from .smb_media import byte_range
from .streaming import _send_until_disconnect


class SmbResponse(Response):
    def __init__(self, resource, *, session='', registry=None, media_type=None):
        super().__init__(b'')
        self.resource, self.session, self.registry = resource, session, registry
        self.content_type = media_type or mimetypes.guess_type(resource.name)[0] or 'application/octet-stream'

    async def __call__(self, scope, receive, send):
        task = asyncio.current_task()
        tracked = self.session and self.registry is not None
        if tracked and not self.registry.register(self.session, task):
            await Response(status_code=410)(scope, receive, send)
            return
        try:
            await _send_until_disconnect(self._respond, scope, receive, send)
        finally:
            if tracked:
                self.registry.unregister(self.session, task)

    async def _respond(self, scope, receive, send):
        from .smb_media import SmbResource
        transport = self.resource._transport() if isinstance(self.resource, SmbResource) else None
        handle = None
        try:
            try:
                if scope.get('method') != 'HEAD':
                    handle = (await asyncio.to_thread(transport.open, self.resource.remote_parts) if transport
                              else await asyncio.to_thread(self.resource.open))
                if transport is not None and handle is None:
                    info = await asyncio.to_thread(transport.stat, self.resource.remote_parts)
                else:
                    info = await asyncio.to_thread(handle.stat if handle is not None and hasattr(handle, 'stat')
                                                   else self.resource.stat)
            except OSError:
                await Response(status_code=503, headers={'Cache-Control': 'no-store'})(scope, receive, send)
                return
            size = info.st_size
            raw = next((value.decode('latin-1') for key, value in scope.get('headers', ()) if key.lower() == b'range'), None)
            try:
                start, end, status = byte_range(raw, size)
            except ValueError:
                await Response(status_code=416, headers={'Content-Range': f'bytes */{size}'})(scope, receive, send)
                return
            headers = {'Accept-Ranges': 'bytes', 'Content-Length': str(max(0, end - start + 1)),
                       'Cache-Control': 'no-store'}
            if status == 206:
                headers['Content-Range'] = f'bytes {start}-{end}/{size}'
            if scope.get('method') == 'HEAD':
                await Response(status_code=status, headers=headers, media_type=self.content_type)(scope, receive, send)
                return

            async def body():
                await asyncio.to_thread(handle.seek, start)
                remaining = end - start + 1
                while remaining > 0:
                    block = await asyncio.to_thread(handle.read, min(1 << 20, remaining))
                    if not block:
                        raise OSError('SMB file changed while streaming')
                    remaining -= len(block)
                    yield block
            await StreamingResponse(body(), status_code=status, headers=headers,
                                    media_type=self.content_type)(scope, receive, send)
        finally:
            if transport is not None:
                transport.close()
            if handle is not None:
                # 所属连接已断开，句柄清理不再发网络请求；避免断连取消抢在关闭之前生效。
                handle.close()

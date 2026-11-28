"""macOS 菜单栏打开本机 Peach，并由 WKWebView 截取当前页面。"""
from __future__ import annotations

import json
import logging
from urllib.parse import urlsplit
from uuid import UUID

import AppKit
import Foundation
import WebKit
import objc

_LOGGER = logging.getLogger(__name__)
_HANDLER = "peachFeedbackCapture"
_REQUEST = "peach:feedback-capture:"
_REPLY = "peach:feedback-capture-reply"


def _origin(url: str) -> tuple[str, str, int] | None:
    try:
        parsed = urlsplit(url)
        if parsed.scheme in {"http", "https"} and parsed.hostname and parsed.username is None:
            port = parsed.port
            return parsed.scheme, parsed.hostname, port if port is not None else (443 if parsed.scheme == "https" else 80)
    except ValueError:
        return None
    return None


def _url(native_url) -> str:
    return str(native_url.absoluteString()) if native_url is not None else ""


class _PeachWebViewDelegate(AppKit.NSObject):
    # Selector inference uses PyObjC's WebKit metadata, including the signatures
    # of the navigation decision and file picker completion blocks.
    def initWithOwner_(self, owner):
        self = objc.super(_PeachWebViewDelegate, self).init()
        if self is not None:
            self.owner = owner
        return self

    def windowWillClose_(self, notification):
        if notification.object() == self.owner.window:
            self.owner.drop_window()

    def webView_decidePolicyForNavigationAction_decisionHandler_(self, view, action, decision):
        frame = action.targetFrame()
        request = action.request()
        address = _url(request.URL())
        same_origin = _origin(address) == self.owner.origin
        if frame is not None and (not frame.isMainFrame() or same_origin):
            decision(WebKit.WKNavigationActionPolicyAllow)
            return
        decision(WebKit.WKNavigationActionPolicyCancel)
        if action.navigationType() == WebKit.WKNavigationTypeLinkActivated:
            if same_origin:
                view.loadRequest_(request)
            elif _origin(address) is not None:
                self.owner.open_browser(address)

    def webView_didStartProvisionalNavigation_(self, view, navigation):
        if view == self.owner.view:
            self.owner.navigation += 1

    def webView_didFinishNavigation_(self, view, navigation):
        if view == self.owner.view and not self.owner.ready:
            self.owner.ready = True
            self.owner.show_window()

    def webView_didFailProvisionalNavigation_withError_(self, view, navigation, error):
        if view == self.owner.view and not self.owner.ready and navigation == self.owner.initial_navigation:
            self.owner.fallback(error)

    def webView_didFailNavigation_withError_(self, view, navigation, error):
        if view == self.owner.view and not self.owner.ready:
            self.owner.fallback(error)

    def userContentController_didReceiveScriptMessage_(self, controller, message):
        frame = message.frameInfo()
        request = message.body()
        view = message.webView()
        if (view != self.owner.view or not frame.isMainFrame() or not isinstance(request, str)
                or not request.startswith(_REQUEST) or _origin(_url(frame.request().URL())) != self.owner.origin):
            return
        try:
            request_id = request[len(_REQUEST):]
            if str(UUID(request_id)) != request_id:
                return
        except ValueError:
            return
        self.owner.capture(view, request)

    def webView_runOpenPanelWithParameters_initiatedByFrame_completionHandler_(self, view, parameters, frame, done):
        if view != self.owner.view or _origin(_url(frame.request().URL())) != self.owner.origin:
            done(None)
            return
        panel = AppKit.NSOpenPanel.openPanel()
        directories = bool(parameters.allowsDirectories())
        panel.setCanChooseDirectories_(directories)
        panel.setCanChooseFiles_(not directories)
        panel.setAllowsMultipleSelection_(parameters.allowsMultipleSelection())
        panel.beginSheetModalForWindow_completionHandler_(
            self.owner.window, lambda reply: done(panel.URLs() if reply == AppKit.NSModalResponseOK else None))


class MacWindow:
    """复用菜单栏进程的 AppKit 主线程和同一个 WebView。"""

    def __init__(self, open_browser):
        self.open_browser = open_browser
        self.delegate = _PeachWebViewDelegate.alloc().initWithOwner_(self)
        self.window = self.view = None
        self.initial_navigation = None
        self.origin = None
        self.navigation = 0
        self.ready = False
        self.entry = ""

    def open(self, url: str) -> None:
        origin = _origin(url)
        if origin is None:
            raise ValueError("Expected a Peach HTTP(S) address")
        if self.window is not None:
            if self.origin == origin:
                if self.ready:
                    self.show_window()
                return
            self.window.close()
        self.origin, self.entry = origin, url
        try:
            screen = AppKit.NSScreen.mainScreen().visibleFrame().size
            frame = AppKit.NSMakeRect(0, 0, min(screen.width, 1280), min(screen.height - 32, 850))
            masks = (AppKit.NSWindowStyleMaskTitled | AppKit.NSWindowStyleMaskClosable |
                     AppKit.NSWindowStyleMaskMiniaturizable | AppKit.NSWindowStyleMaskResizable)
            self.window = AppKit.NSWindow.alloc().initWithContentRect_styleMask_backing_defer_(
                frame, masks, AppKit.NSBackingStoreBuffered, False)
            self.window.setReleasedWhenClosed_(False)
            self.window.setTitle_("Peach")
            self.window.setDelegate_(self.delegate)
            self.window.center()

            config = WebKit.WKWebViewConfiguration.alloc().init()
            controller = config.userContentController()
            script = WebKit.WKUserScript.alloc().initWithSource_injectionTime_forMainFrameOnly_(
                "Object.defineProperty(window, 'peachDesktopFeedbackCapture', { value: true });",
                WebKit.WKUserScriptInjectionTimeAtDocumentStart, True)
            controller.addUserScript_(script)
            controller.addScriptMessageHandler_name_(self.delegate, _HANDLER)
            self.view = WebKit.WKWebView.alloc().initWithFrame_configuration_(frame, config)
            self.view.setNavigationDelegate_(self.delegate)
            self.view.setUIDelegate_(self.delegate)
            self.window.setContentView_(self.view)
            request = Foundation.NSURLRequest.requestWithURL_(Foundation.NSURL.URLWithString_(url))
            self.initial_navigation = self.view.loadRequest_(request)
        except Exception:
            if self.window is not None:
                self.window.close()
            raise

    def show_window(self) -> None:
        self.window.deminiaturize_(None)
        self.window.makeKeyAndOrderFront_(None)
        AppKit.NSApplication.sharedApplication().activateIgnoringOtherApps_(True)

    def drop_window(self) -> None:
        if self.view is not None:
            self.view.configuration().userContentController().removeScriptMessageHandlerForName_(_HANDLER)
            self.view.setNavigationDelegate_(None)
            self.view.setUIDelegate_(None)
        self.initial_navigation = None
        self.window = self.view = None
        self.ready = False
        self.navigation += 1

    def fallback(self, error) -> None:
        _LOGGER.warning("Peach WebKit window did not load: %s", error.localizedDescription())
        self.window.close()
        self.open_browser(self.entry)

    def capture(self, view, request: str) -> None:
        navigation = self.navigation

        def send_capture(payload: str) -> None:
            reply = json.dumps(request + ":" + payload)
            view.evaluateJavaScript_completionHandler_(
                f"window.dispatchEvent(new CustomEvent('{_REPLY}', {{ detail: {reply} }}));", None)

        def captured(image, error):
            if self.view != view or navigation != self.navigation or _origin(_url(view.URL())) != self.origin:
                return
            if image is not None and error is None:
                send_capture("frame")
            encoded = ""
            try:
                if image is not None and error is None:
                    bitmap = AppKit.NSBitmapImageRep.imageRepWithData_(image.TIFFRepresentation())
                    if bitmap is not None:
                        png = bitmap.representationUsingType_properties_(AppKit.NSBitmapImageFileTypePNG, {})
                        if png is not None:
                            encoded = str(png.base64EncodedStringWithOptions_(0))
            except Exception:
                _LOGGER.exception("Peach WebKit screenshot encoding failed")
            send_capture(encoded)

        try:
            config = WebKit.WKSnapshotConfiguration.alloc().init()
            config.setAfterScreenUpdates_(False)
            view.takeSnapshotWithConfiguration_completionHandler_(config, captured)
        except Exception:
            _LOGGER.exception("Peach WebKit screenshot failed")
            captured(None, None)

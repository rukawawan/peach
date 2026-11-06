"""站点解析器：契约在 `base`，一个站一个模块，全部登记在 `SITE_SOURCES`，各站说明见 `docs/SOURCING.md`。"""
from __future__ import annotations

from .avbase import AVBASE, AVBaseSource
from .base import (COOLDOWN_ACTIONS, PERMANENT_REASONS, REASON_KINDS, FailureReason, Page, Session,
                   SiteConfig, SiteRecord, SiteSource, SourceFailure, http_failure)
from .dmm import DMM, DmmSource
from .fc2 import FC2, Fc2Source
from .fc2cmadb import FC2CMADB, Fc2cmadbSource
from .fc2ppvdb import FC2PPVDB, Fc2ppvdbSource
from .javarchive import JAVARCHIVE, JavArchiveSource
from .javbus import JAVBUS, JavBusSource
from .javdb import JAVDB, JavDBPublicSource, JavDBSource
from .javten import JAVTEN, JavtenSource
from .onepondo import ONEPONDO, OnePondoSource
from .r18dev import R18DEV, R18DevSource
from .seesaa import SEESAA, WIKI_SOURCES, SeesaaSource

#: 来源名 → 站的类。`LibraryMetadataProvider` 与 `scripts/scrape_codes.py` 按它取站，
#: 测试按它核配置与 `SOURCE_SPECS` 等表的一致。Seesaa 的几个 Wiki（`seesaa.WIKI_SOURCES`）会话的传输
#: 是它们自己的 `seesaa.WikiPages`；其中两个在素人链上（`metadata_routes.WIKI_STAGE`，经
#: `LibraryMetadataProvider.wiki` 问），av_name 只由 `scrape_codes` 点名。
SITE_SOURCES: dict[str, type[SiteSource]] = {
    R18DEV.name: R18DevSource,
    DMM.name: DmmSource,
    ONEPONDO.name: OnePondoSource,
    FC2.name: Fc2Source,
    FC2CMADB.name: Fc2cmadbSource,
    FC2PPVDB.name: Fc2ppvdbSource,
    JAVTEN.name: JavtenSource,
    JAVARCHIVE.name: JavArchiveSource,
    AVBASE.name: AVBaseSource,
    JAVBUS.name: JavBusSource,
    # 刮削走匿名接口（ADR-0144）；详情页那一路的 `JavDBSource` 由视频预览直接取。
    JAVDB.name: JavDBPublicSource,
    **WIKI_SOURCES,
}

__all__ = ["COOLDOWN_ACTIONS", "PERMANENT_REASONS", "REASON_KINDS", "SITE_SOURCES", "FailureReason", "Page",
           "Session", "SiteConfig", "SiteRecord", "SiteSource", "SourceFailure", "http_failure",
           "AVBASE", "DMM", "FC2", "FC2CMADB", "FC2PPVDB", "JAVARCHIVE", "JAVBUS", "JAVDB", "JAVTEN", "ONEPONDO",
           "R18DEV", "SEESAA",
           "AVBaseSource", "DmmSource", "Fc2Source", "Fc2cmadbSource", "Fc2ppvdbSource", "JavArchiveSource",
           "JavBusSource", "JavDBPublicSource", "JavDBSource", "JavtenSource", "OnePondoSource", "R18DevSource", "SeesaaSource"]

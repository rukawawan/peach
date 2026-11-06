"""持久结果的处理规则版本；各能力只失效自己拥有的派生结果。"""

CATALOG = "catalog-v4"
PREVIEWS = "previews-v2"
LOCAL_POSTERS = PREVIEWS + ':local'
PROCESSING = "processing-v2"
PUBLIC_SNAPSHOTS = 2
PROVIDER_EVIDENCE = 2
PROVIDER_TEXT = 3
OFFICIAL_COVER_CATALOG_MISSES = 1
#: 核查差异按确定判据结算（ADR-0139）。判据改了就加一，升级时对存量候选再结算一遍。
VERIFICATION_SETTLEMENT = 1

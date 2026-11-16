"""厂牌官网、标识与公司资料判据认的原词与固定取值（ADR-0159 第四条，内容数据）。

这里是要在上游页面里**认出来**的日文、中文原词（停放页、不可用页、成人站自述、公司资料栏名、
法人后缀与年号），复核件与边车里按原样写、按原样排序的判词取值，以及按账本厂牌名索引的取图来源表。
它们不是界面文字，所以整份列入 `scripts/check_backend_copy.py` 的 `CONTENT_FILES`；判据逻辑留在
`studio_sites.py`、`studio_icons.py`、`company_profiles.py`。
"""
from __future__ import annotations

import re

# 抢注页与停放页的自述。它们同样会 200，也同样会在标题里回显域名，
# 只有这些词能把它们和真站区分开。
#
# 标题单独判，而且判得更松。实测两次漏判都出在这上面：`kawaii.com - domain for sale`
# 的关键词在正文第 81683 字节，早已超出任何合理的正文扫描窗口，可它就写在标题里；
# `Attackers - The Domain Name Attackers.com is Now For Sale.` 则是中间插了词，
# 逐字匹配「domain for sale」全文都对不上。标题只有几十个字符，真站的标题不会说
# 自己在出售，所以这里可以放心用最宽的判据。
PARKED_TITLE = re.compile(
    r"for sale|domain name|buy this domain|このドメイン|ドメイン(?:の)?販売", re.I)

# 站点自述打不开的标题。实测 `bangbus.com` 与 `monstersofcock.com` 都返回 200、82 KB、
# 正文里成人词一应俱全，标题却只有 `Site Unavailable`——「域名由厂牌名推出且是成人站」
# 那条因此把它们判成 ok。一页自己说自己不可用，就不能拿来当官网证据；这类页面还常常
# 是 CDN 或地区封锁的产物，换个出口再取才有意义，写成 ok 只会把它固化成结论。
BROKEN_TITLE = re.compile(
    r"site unavailable|service unavailable|temporarily unavailable|access denied"
    r"|forbidden|not found|bad gateway|under construction|coming soon"
    r"|maintenance|メンテナンス|工事中|しばらく(?:お待ち|お待たせ)", re.I)

PARKED = re.compile(
    r"domain (?:is )?for sale|buy this domain|parked (?:free )?at|このドメイン(?:は|を)"
    r"|ドメイン(?:の)?販売|sedo\.com|afternic|godaddy\.com/domain|hugedomains",
    re.I)

#: 标识复核件与边车 `*.provenance.json` 里的判词（`studio_icons`，ADR-0162 的英文 id）：同一次运行里分拣与装图，
#: `scripts/harvest_studio_icons.py` 按它排序；不从文件读回。取证失败的 `MISSING` 与官网判词共用。
#: 仍是字标、只有小图标。
WORDMARK, TOOSMALL = "still-wordmark", "small-icon-only"
#: 没有官网链接，没查。
SKIP = "no-site-link"
#: 方标没有，装的是补白过的字标（字标补白）。可以装，但复核件上要能看出装的是哪一类。
PADDED = "padded-wordmark"
#: 取到了、也够清楚，但那是整个主机共用的一枚（平台通用图标），代表不了这个实体。
SHARED = "shared-icon"
#: 取回来的是一张照片（人像不是标识）。站点自己声明它是图标也不算数——那一位要的是标识。
PORTRAIT = "portrait-not-mark"

#: 取证失败（未取得）的判词，复核件按它排序与筛选。
MISSING = "missed"

# 「标题里有厂牌名」证明不了这是**这个**厂牌的站——同名的无关公司照样通过。实测四例：
# `madonna.com` 是歌手麦当娜、`hunter.com` 是 Hunter Engineering（四轮定位）、
# `bazooka.com` 是车载音响、`marrion.com` 是一个 Google Sites 页面。它们都 200、
# 都不是停放页、标题里都有厂牌名。
#
# 缺的那一半是「这一页是不是 AV 厂牌站」。这不是补丁：我们要找的就是 AV 厂牌官网，
# 成人语境本来就是判据的一部分。日站首页普遍带年龄门，这些词因此极稳；同时留下英文
# 写法，免得把西方厂牌一律打成待复核。
#
# `アダルト動画` 与 `無修正` 是无码站那一头补上的：`www.1pondo.tv` 实测 200、标题正是
# `一本道 | 美を追求する高画質アダルト動画サイト`，厂牌名自述得清清楚楚，却因为站上写的是
# 「動画」而不是「ビデオ」被判成 weak。这两个词同样不会出现在 Hunter Engineering、
# Bazooka、麦当娜那三个同名站上，判据的分辨力没有变松。
ADULT = re.compile(
    r"年齢認証|年齢チェック|AVメーカー|アダルトビデオ|アダルトDVD|アダルト動画|無修正"
    r"|18歳未満|成人向|adult video|adult dvd|porn|18\+|over 18", re.I)

#: 用户当场确认的厂牌官网。**这不是放宽通用判据，是补一条页面上没有的信息。**
#:
#: 适用的形状是「账本这边的名字和站上那个牌子对不起来，而对应关系只有人知道」：厂牌属于
#: 哪家公司（`SOD Create` → Soft On Demand）。账本记的是番号站转写的罗马音、站上只用日文
#: 原名的，不进这张表：那是账本名字错了，按 `apply_studio_name_localization.py` 换回日文名，
#: 旧写法降为别名，页面自述就对得上。有别名的同样走 `site_verdict` 的 `aliases`，那是页面上
#: 能查证的路，不该拿白名单顶掉（`东京热` 就是这样自证的）。
#:
#: `SOD Create` 是 Soft On Demand 的厂牌。母公司官网 `www.sod.co.jp` 实测 200、是成人站，
#: 标题却是 `SOFT ON DEMAND（ソフト・オン・デマンド）`——标题和正文里都不会出现
#: `SOD Create` 这个串，所以「标题自述厂牌名」和「正文提到厂牌名」两条都不成立，通用
#: 判据只能判未取得。缺的那一条是「这个厂牌属于哪家公司」，它本来就不在页面上，只有人知道。
#:
#: 因此走显式白名单，不去放宽通用判据：把「标题没有厂牌名也算」松开，`hunter.com`
#: （四轮定位）、`bazooka.com`（车载音响）、`madonna.com`（歌手）那一整类同名站会跟着
#: 一起被确认成官网。白名单只影响列出来的这几行，每行写清谁确认的、为什么通用路径不成立。
CONFIRMED_SITES: dict[str, tuple[str, str]] = {
    "SOD Create": (
        "https://www.sod.co.jp/",
        "用户 2026-09-03 确认：SOD Create 是 Soft On Demand 的厂牌，"
        "sod.co.jp 是母公司官网",
    ),
}

#: 发行平台不找官网（不适用）：一个请求都不发。
PLATFORM_VERDICT = "platform"

#: `logo` 位的指定来源，按 canonical_name。`icon` 位的覆盖在
#: `site_icons.HOST_OVERRIDES`，两张表不能合并：那一张是「按主机发现图标」的例外，
#: 这一张是「这个厂牌的大字标在哪」，键的含义和取用位置都不同。
#:
#: FC2-PPV：用户 2026-09-03 指定 seeklogo 的 429409 这一份，600×600 P 模式、独角兽 +
#: 「FC2」文字、sha256 `6911574c…f1b7`（8916 B，2026-09-03 实测）。同站还有一份
#: 2000×662 的横向字标，那是字标不装这里。FC2 站上自己的大资产只有 189×68、690×68 两条
#: 横向字标，缩到 160 px 认不出。
#:
#: 剩下 22 条来自 jae.tokyo（Japan Adult Expo 2014／2015／2017 的参展厂牌名录），
#: 用户 2026-09-04 指定的来源。名录每届各带一套片商 logo：2017 是 320×320，2015 是
#: 188×188，2014 是 270×180，同一家出现在多届时取像素最多的那一届。键一律写账本
#: canonical_name，名录上厂牌自称的写法只用来认人：名录写 `ムーディーズ`、账本写
#: `MOODYZ`，落盘名跟账本走。2016 那届只有图没有名字，认不出是谁家的，不取。
#: 这些厂牌在账本里一张图都没有，且绝大多数连一条 official／catalog 链接都没有——
#: favicon 那条路走不到它们，所以小位也从这一张烤（见 `icon_from_logo`）。
#: 展会名录只是权宜之计：厂牌自己的名录交的是同一枚标识的当期版本，两边都有的按
#: `WORDMARK_SOURCES` 走。`シロウトTV` 的大位在这里，小位另有指定（`ICON_SOURCES`）。
LOGO_SOURCES: dict[str, str] = {
    "FC2-PPV": "https://images.seeklogo.com/logo-png/42/1/fc2-logo-png_seeklogo-429409.png",
    "JET映像": "http://www.jae.tokyo/jae2017/images/maker/maker_image/042.png",
    "MOODYZ": "http://www.jae.tokyo/jae2017/images/maker/maker_image/054.png",
    "MARRION": "http://www.jae.tokyo/jae2017/images/maker/maker_image/050.png",
    "V&R PRODUCE": "http://www.jae.tokyo/jae2014/exhibitor/images/logo/vr_logo.jpg",
    "S1 NO.1 STYLE": "http://www.jae.tokyo/jae2017/images/maker/maker_image/053.png",
    "センタービレッジ": "http://www.jae.tokyo/jae2015/images/maker/08_center@vllage.png",
    "DOC": "http://www.jae.tokyo/jae2017/images/maker/maker_image/025.png",
    "MAXING": "http://www.jae.tokyo/jae2014/exhibitor/images/logo/MAXING_logo.jpg",
    "SOD Create": "http://www.jae.tokyo/jae2015/images/maker/11_sod.png",
    "Baltan": "http://www.jae.tokyo/jae2014/exhibitor/images/logo/baltan_logo.jpg",
    "BeFree": "http://www.jae.tokyo/jae2015/images/maker/17_befree.png",
    "Dogma": "http://www.jae.tokyo/jae2015/images/maker/34_dogma.png",
    "桃太郎映像出版": "http://www.jae.tokyo/jae2017/images/maker/maker_image/022.png",
    "乱丸": "http://www.jae.tokyo/jae2015/images/maker/21_ran.png",
    "TEPPAN": "http://www.jae.tokyo/jae2014/exhibitor/images/logo/teppan_logo.jpg",
    "kira*kira": "http://www.jae.tokyo/jae2014/exhibitor/images/logo/kirakira_logo.jpg",
    "ゲッツ！！ボンボン/妄想族": "http://www.jae.tokyo/jae2017/images/maker/maker_image/029.png",
    "シロウトTV": "http://www.jae.tokyo/jae2017/images/maker/maker_image/034.png",
    "PREMIUM": "http://www.jae.tokyo/jae2015/images/maker/27_premium.png",
    # 妄想族自家发行目录 `mousouzoku-av.com/maker/list/<50音>/`（用户 2026-09-04 指定），
    # 213 家一律 `contents/maker/id<N>/logo_l.jpg`、200×200 真方标——这一位要的正是方的，
    # 不必烤。目录里 173 家挂 妄想族、39 家挂 エマニエル，都是同人／独立厂牌，
    # 和账本对上 8 家：`ゲッツ！！ボンボン/妄想族` 已有 jae.tokyo 的图，其余七家在这里。
    # 名录写的日文名就是账本 canonical_name（`Asia/妄想族`），按整名对；后四家的
    # catalog 链接指向同一个 maker id（用户 2026-09-23 授权）。
    "ABC/妄想族": "https://www.mousouzoku-av.com/contents/maker/id001/logo_l.jpg",
    "Asia/妄想族": "https://www.mousouzoku-av.com/contents/maker/id003/logo_l.jpg",
    "ティーチャー/妄想族": "https://www.mousouzoku-av.com/contents/maker/id360/logo_l.jpg",
    "下半身タイガース/妄想族": "https://www.mousouzoku-av.com/contents/maker/id367/logo_l.jpg",
    "ゆりえっち/妄想族": "https://www.mousouzoku-av.com/contents/maker/id403/logo_l.jpg",
    "山と空/妄想族": "https://www.mousouzoku-av.com/contents/maker/id416/logo_l.jpg",
    # 直撇号是账本 canonical_name 的写法；弯撇号那一份是别名，过 `safe_name` 同样落到
    # `AVS_collector_s`，按哪一种写都取得到同一个文件。
    "AVS collector's": "https://www.mousouzoku-av.com/contents/maker/id358/logo_l.jpg",
    # 素人ホイホイ是妄想族与旗下 power、sweet！ 等配信品牌之间的那一级（ADR-0051），
    # 自己没有作品；名录里 `素人ホイホイ/妄想族` 那一格的方标（2026-09-24 实测 200×200）。
    "素人ホイホイ": "https://www.mousouzoku-av.com/contents/maker/id379/logo_l.jpg",
    # 官网 `ks-p.com` 上的 120×120 方标。同站另有一张 376×82 的横版字标 `ks_logo.jpg`，
    # 烤成方图后字只占中间一窄条；X 头像只有 96 px（2026-09-23 实测）。
    "OFFICE K'S": "https://ks-p.com/wp-content/uploads/2019/10/label001.jpg",
}

#: 指定的**字标**来源，按 canonical_name。和 `LOGO_SOURCES` 的区别是形状不是画质：
#: 这一张里的图一律宽扁，只能烤成方图再用，两个位置装的都是那张方图。
#:
#: 为什么不并进 `LOGO_SOURCES`：`logo_row` 把指定来源原样装进大位，而大位是
#: `.entityportrait` 那个 `aspect-ratio:1` + `object-fit:cover` 的 160 px 方框，
#: 宽扁图进去只剩正中间那几个字母。`MIN_LOGO_SHORT_EDGE` 拦下 406×86 拦得对——
#: 问题不在 96 这个数，在于宽扁字标根本不该走那条原样装的路。
#:
#: 来源是 `harvest_maker_directories.py` 那三个厂牌名录（用户 2026-09-04 与 09-22 指定），
#: 对账后人工确认。MGStage `/ppv/makers.php` 十一页 351 家，站上有两种规格
#: （2026-09-04 量过）：通用的 `pc/<slug>.gif` 是 180×54 白底纯字标，首页轮播位另有
#: `pc/top/<slug>.jpg` 400×80／406×86。取的一律是前者，理由见下面 Jackson 那条。
#: Prestige `/api/maker` 的 `api/media/maker/banner-<slug>.jpg` 一律 200×55；KMP `/label`
#: 的 `img2018/label/<slug>/logo.svg` 是矢量，栅格到多大都清晰。
#:
#: **收已有图的厂牌要逐张比过。** 名录版未必更大：jae.tokyo 那批展会图是 320×320 的
#: 真方标，换成 180×54 的字标是降级。用户 2026-09-22 逐张看过对比图后点名换的五家在
#: 下面各自带一条判词，其余已有图的厂牌不收。
#:
#: `きらきらワイフ` 与 `おっぱいちゃん` 不在表里：对账时它们只走到「前缀候选」，撞上的
#: `kira*kira` 和 `OPPAI` 是另外两家真实厂牌，而这两家都已经有图，收进来只有装错的风险。
WORDMARK_SOURCES: dict[str, str] = {
    "Flower": "https://static.mgstage.com/mgs/img/pc/flower.gif",
    "ヒビノ": "https://static.mgstage.com/mgs/img/pc/hibino.gif",
    "HMJM": "https://static.mgstage.com/mgs/img/pc/hmjm.gif",
    "Ienergy": "https://static.mgstage.com/mgs/img/pc/ienergy.gif",
    "いんすた": "https://static.mgstage.com/mgs/img/pc/insta.gif",
    # Jackson 是 Prestige 旗下 label，母公司名录那份 `banner-jackson.jpg` 是 1024×346、
    # 白底的纯字标，烤成方图落地 1024×1024（2026-09-22 实测）。MGStage 同一家有两份：
    # `pc/jackson.gif` 180×54，首页轮播位 `pc/top/jackson.jpg` 400×80 带洋红底，烤方后
    # 上下补出两大块洋红。三份里只有母公司这一份既是白底纯字标又够大。
    "Jackson": "https://www.prestige-av.com/api/media/maker/banner-jackson.jpg",
    "まんまんランド": "https://static.mgstage.com/mgs/img/pc/manmanland.gif",
    "Planet Plus": "https://static.mgstage.com/mgs/img/pc/planetplus.gif",
    # Prestige 旗下只在 MGStage 发行的 label（ADR-0049），母公司 `/api/maker` 那 11 家里没有它。
    "PRESTIGE PREMIUM": "https://static.mgstage.com/mgs/img/pc/prestigepremium.gif",
    "Radix": "https://static.mgstage.com/mgs/img/pc/radix.gif",
    "S-Cute": "https://static.mgstage.com/mgs/img/pc/scute.gif",
    "VIP": "https://static.mgstage.com/mgs/img/pc/vip.gif",
    "Waap Entertainment": "https://static.mgstage.com/mgs/img/pc/waap.gif",
    # 这一条不来自 MGStage 名录，是厂牌官网 `mko-labo.net` header 里那张 391×143 的
    # 字标（2026-09-22 实测）。指定它是为了挡住自动发现给小位挑的那一枚：页面上挂的
    # X 账号头像是一张项圈的照片，400×400、内容比 1.04，够大也够方，人像闸也过——
    # 里面没有脸——装上去厂牌页顶着一条项圈。照片不是标识，这一点闸门判不出来。
    "えむっ娘ラボ":
        "https://cdn.up-timely.com/image/16/site_design/base/logo_image"
        "/agm4a2ESultyKGcW2F3tWNjLS0VTjbjzXuueyhai.png",
    # ナンパTV 是 Prestige 旗下 label，自己没有站，账本里也一条链接都没有——自动发现
    # 那四条链都是从链接出发的，对它一条都启动不了。母公司名录 `/api/maker` 里有它
    # 200×55 的白底字标（2026-09-22 实测），番号 `200GANA` 与账本那 9 部对得上。
    "ナンパTV": "https://www.prestige-av.com/api/media/maker/banner-nanpa.jpg",
    # ラグジュTV 同属 Prestige。这一条是这五家里唯一的降分辨率：名录版 200×55 烤方后
    # 落地 200×200，展会那份是 413×413。用户 2026-09-22 看过两版后仍指定名录版——
    # 展会图是 2017 年那一届交的，名录版是厂牌现在挂在自己站上的那一枚。
    "ラグジュTV": "https://www.prestige-av.com/api/media/maker/banner-lux.jpg",
    # 下面五家是 KMP 旗下 label，`/label` 名录给的是 SVG。矢量没有固有像素，栅格到
    # `link_marks.VECTOR_RASTER_SIZE` 就是 512×192，烤方落地 512×512，比展会那批
    # 416～421 的位图大且是矢量源（2026-09-22 实测）。白字标由 `bake_square` 配深底。
    # 后两家此前没有图，账本 catalog 链接即名录的 `?works=sq`／`?works=real`。
    "million": "https://www.km-produce.com/img2018/label/million/logo.svg",
    "BAZOOKA": "https://www.km-produce.com/img2018/label/bazooka/logo.svg",
    "俺の素人": "https://www.km-produce.com/img2018/label/oreshiro/logo.svg",
    "S級素人": "https://www.km-produce.com/img2018/label/sq/logo.svg",
    "Real Works": "https://www.km-produce.com/img2018/label/real/logo.svg",
    # 母公司自己那一枚：官网 header 的矢量字标（viewBox 135×56，栅格 512×213，内容比 2.46）。
    # 原装的是 X 头像 400×400 位图；用户 2026-09-25 点名换官网 SVG。
    "K M Produce": "https://www.km-produce.com/wp-content/themes/km-produce-v4/img/logo.svg",
    # 官网 `to-satsu.com` header 与 og:image 同一张 240×120 透明底字标，内容比 2.03
    # （2026-09-25 实测）。官网 09-23 才登记，此前盘上一张图都没有；用户同日点名。
    "変態紳士倶楽部": "https://cdn.up-timely.com/image/22/site_design/base/logo_image"
                "/0dwpajZ71cySRqLuIcHX4o4BkKaNRzYSx50Yrk1n.png",
    # 下面六家是 2026-09-25 全库审计后用户按推荐换的官网 header 字标，能用矢量的用矢量。
    # Prestige 原装展会名录 413×413 位图、一本道原装红底方块，都是同一枚标识的位图版；
    # Deep's 原装的 X 头像是一张卡车照片。三家官网 header 都是 SVG。
    "Prestige": "https://www.prestige-av.com/_nuxt/img/logo.e232877.svg",
    "一本道": "https://www.1pondo.tv/img/common/logo-1pondo.svg",
    "Deep's": "https://deeps.net/img/common/logo.svg",
    # 这三家官网只有位图，同目录猜 `.svg` 都是 404（2026-09-25 实测）。アロマ企画 原装 X 头像
    # 200×200，官网同一枚 521×257；本中 原装 64×64 只有一个「本」字；E-BODY 原装 X 头像
    # 只有一个「E」图形。后两家的站在 up-timely 上，平台只收位图。
    "アロマ企画": "https://www.aroma-p.com/pc/images/common/logo.png",
    "本中": "https://cdn.up-timely.com/image/25/site_design/base/logo_image"
          "/MTbIeAhJDw6XIrhHyXhmQkVaVlTdS4xs1GVZ2ulz.png",
    "E-BODY": "https://cdn.up-timely.com/image/6/site_design/base/logo_image"
              "/zFSBseqj7KtWPX3CmRWkqGcY05jt3wRtPQimobuo.png",
    # 妄想族是片商实体，作品全挂在旗下 label 上（ADR-0049），没有展会图也没有名录那一格。
    # 自家站 header 的字标 332×187（2026-09-23 实测），就是它现在挂在门面上的那一枚。
    "妄想族": "https://www.mousouzoku-av.com/pc/images/pages/common/logo_mousouzoku.png",
    # 下面两家官网只剩 Wayback 快照，名录里也没有它们。取快照 header 的字标 `id_` 原件：
    # アキノリ 142×81、Janes 200×60（2026-09-24 实测，用户看过候选拼图后按推荐指定）。
    "アキノリ": "https://web.archive.org/web/20170426023131id_/"
               "http://www.aknr.com/wp/wp-content/images/post/1/logo.png",
    "Janes": "https://web.archive.org/web/20131222105818id_/http://www.jns-grp.net/images/jns-logo.gif",
}

#: 指定的**方标**来源，按 canonical_name。只管 `icon` 位，大位仍由 `LOGO_SOURCES`
#: 或发现流程出——这是它和另外两张表的全部区别：那两张都是一张图管两位。
#:
#: 存在的理由只有一个形态：厂牌交出来的那张图里，方标和字标是并排的两块，而两个位置
#: 要的是不同的那一块。`シロウトTV` 是实测样本——名录版 200×55 里左边是黑框「素」方标
#: （主体 41×49，内容比 1.20），右边是「シロウトTV」横排字标。`bake_square` 的
#: `refit_plate` 按内容裁一遍，落地 64×64 正好是那枚「素」（2026-09-22 实测），顶
#: 28 px 的筛选片和 32 px 的圆片够用；而展会那份 414×414 的横条字标缩到 28 px 只剩
#: 一团糊，它该待的位置是 160 px 的大位。
#:
#: 键可以和 `LOGO_SOURCES` 重合——两位各取各的正是这张表的用途；和
#: `WORDMARK_SOURCES` 不能重合，那一张已经把两位都占了。
ICON_SOURCES: dict[str, str] = {
    "シロウトTV": "https://www.prestige-av.com/api/media/maker/banner-shiroutotv.jpg",
}

#: 事务所的指定**字标**来源，按 canonical_name，用法同 `WORDMARK_SOURCES`。
#:
#: 单列一张而不并进厂牌那张：`--kind agency` 那一趟只查这一张，厂牌表一条都不看。
#: 两种实体共用 `logo_key` 落盘名，同名的事务所去查厂牌表，就会装上那家厂牌指好的图。
#:
#: `Diaz Group`：名录只给了招募站 `diaz-recruit.com`，那是 STUDIO 建站、JS 渲染的
#: 页面，静态 HTML 不链集团官网，站点图标是建站平台的「/S」。集团官网 `diaz-g.com`
#: header 里是一张 147×27 的矢量字标（用户 2026-09-23 指定）。
#:
#: `Luminous Promotion`：2022 年由 BELLTECH 改屋号，账本 official 里旧站
#: `belltech-pro.com` 排在前面，自动发现取到的是旧屋号字标。新站 header 是 1741×532
#: 的透明底字标（2026-09-23 实测）。
#:
#: `ONE'S DOUBLE`：现站 SSL 连不上，官网只剩 Wayback 快照。字标是快照页脚那张 216×30
#: 的黑色 SVG，取 `id_` 原件，不带存档站注入的工具栏（2026-09-24 实测）。
#:
#: `ONE'S DOUBLE` 之后那 11 家同样只剩快照（链接见复核表
#: `entity-archive-links-20260924.csv`）。每家在各自快照里取了一到三张候选，用户看过
#: 拼图后按推荐指定，尺寸是 2026-09-24 实测的原件。GRANZPRO、Office Old Crew、
#: Zerosum Production 不在表里：它们已装 X 头像，存档那张要么缺字、要么只有
#: 186×32，并排比过不如现装的。
AGENCY_WORDMARK_SOURCES: dict[str, str] = {
    "Diaz Group": "https://diaz-g.com/assets/img/diaz_logo.svg",
    "Luminous Promotion": "https://luminous-pro.tokyo/img/logo.png",
    "ONE'S DOUBLE": "https://web.archive.org/web/20220130000436id_/"
                    "https://ones-double.com/wp/assets/img/footer-logo.svg",
    # 450×450 站点图标
    "ALL PROMOTION": "https://web.archive.org/web/20221014110606id_/"
                     "https://all-p.jp/wp-content/themes/allpro/common/img/icon.png",
    # 300×300，站内上传的 X 头像
    "ARROWS": "https://web.archive.org/web/20211123045707id_/"
              "https://arrowsweb.net/wp-content/uploads/2020/08/HQ60jaia_400x400-300x300.jpg",
    # 180×180 apple-touch-icon
    "Wish": "https://web.archive.org/web/20220814134735id_/"
            "https://wish-promotion.jp/favicon/apple-touch-icon-180x180.png",
    # 883×568
    "Fourty Four Management":
        "https://web.archive.org/web/20220313105746id_/https://i0.wp.com/management.ffgh.jp"
        "/wp/wp-content/uploads/2017/01/e136d1b4d7acb7fa49e166d6012814e6.png?fit=883%2C568",
    # 154×50 字标
    "Five Promotion": "https://web.archive.org/web/20160117041833id_/"
                      "http://5promotion.com/img/menu-company2-logo_sp.png",
    # 216×60 字标
    "AINA": "https://web.archive.org/web/20130421093131id_/http://www.aina.co.jp/img/rogo-2.png",
    # 270×270 站点图标
    "AI Production": "https://web.archive.org/web/20180903004018id_/"
                     "http://ai-p.love/wp/wp-content/uploads/2018/03/cropped-ai_R-270x270.png",
    # 250×145 字标
    "Ys Promotion": "https://web.archive.org/web/20130423061648id_/"
                    "http://www.ys-promotion.jp/images/base/top.jpg",
    # 145×90
    "Sun Production": "https://web.archive.org/web/20150101194914id_/http://sunpro.tv/media/43.png",
    # 600×611
    "New Gate": "https://web.archive.org/web/20150416061609id_/"
                "http://newgate.ne.jp/images/newgate_logo2.jpg",
    # 274×112 字标
    "Z-Earth Entertainment": "https://web.archive.org/web/20160308205119id_/"
                             "http://z-earth2.crusegroup.net/images/logo.gif",
}

#: 公司资料页上的栏名（日文与英文写法，去空白、冒号后小写）→ 资料字段。
COMPANY_PROFILE_LABELS = {
    '会社名': 'legal_name', '社名': 'legal_name', '商号': 'legal_name',
    '法人名': 'legal_name', 'companyname': 'legal_name',
    '設立': 'founded', '設立年月日': 'founded', '設立年月': 'founded',
    '創立': 'founded', '創業': 'founded', 'founded': 'founded',
    'ブランド設立': 'launched', 'レーベル設立': 'launched', 'ブランド開始': 'launched',
    '所在地': 'location', '本社所在地': 'location', '本店所在地': 'location',
    '住所': 'location', '本社': 'location', 'address': 'location', 'headquarters': 'location',
    '運営会社': 'operator', '運営法人': 'operator', 'operatedby': 'operator',
    '親会社': 'parent', 'parentcompany': 'parent',
    '国': 'country', 'country': 'country',
}

#: 法人名里的公司形态词：比名字时剥掉，`SODクリエイト株式会社` 与别名 `SODクリエイト` 同键。
CORPORATE_FORM = re.compile(r'株式会社|有限会社|合同会社|合資会社|合名会社|[（(]\s*[株有]\s*[)）]'
                            r'|\b(?:inc|llc|ltd|corp|co|kft|gmbh)\b\.?', re.I)

COMPANY_LINK = re.compile(r'会社概要|企業情報|会社案内|特定商取引|about\s*(?:us)?|company\s*(?:profile)?|terms\s*(?:of|and|&)?\s*(?:service|use|conditions)|privacy\s*policy', re.I)
#: 年号写法：`平成元年4月` → 1989 年 4 月。`ERA_OFFSETS` 是年号元年的前一年。
ERA_DATE = r'(昭和|平成|令和)(元|\d{1,2})年(.*)'
ERA_OFFSETS = {'昭和': 1925, '平成': 1988, '令和': 2018}
ERA_FIRST_YEAR = '元'
YEAR_MARK = '年'
#: 公司资料里的日期：`2004年3月1日`、`2004/03`、`2004年`。
COMPANY_DATE = r'(18\d{2}|19\d{2}|20\d{2})(?:[年/.-](\d{1,2})(?:[月/.-](\d{1,2})日?)?月?)?(?:年)?'
#: 所在地一格后面跟着的电话、传真与交通说明，从这里截断。
LOCATION_TAIL = r'\s*(?:TEL\s*[:：]|FAX\s*[:：]|■|丸ノ内線)'

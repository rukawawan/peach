# ADR-0136：avbase 女优页给补女优资料后继补位

- 状态：Accepted
- 日期：2026-11-04
- 关系：扩展 [ADR-0067](0067-performer-profiles-land-in-their-own-table.md) 的来源链；落库口径照 [ADR-0052](0052-entity-results-land-when-evidence-is-sufficient.md)

## 背景

补女优资料后继（ADR-0067）的资料只来自 minnano-av。账本里 939 位有 JAV 目录站编号的女优中，有 104 位
带作品却没有资料行，其中多数在 minnano-av 上检索不到，页头的生日、身材那几项因此空着。

OpenAver 0.17.13（[ae7fc235](https://github.com/slive777/OpenAver/commit/ae7fc235)，MIT）把 avbase 的
女优页当成女优资料的备援。2026-11-04 实测：

- `https://www.avbase.net/talents/<名字>` 按名字进，是 Next.js 页。`__NEXT_DATA__` 的 `props.pageProps.talent`
  里，`actors[]` 是站上归到这位名下的全部名义，`meta.basic_info` 是社区编辑的资料（生日、身高、三围、罩杯、
  出身地、趣味、血型）。名字站上没有时回 HTTP 404。
- Peach 现有的 `SourceTransport`（Chrome UA、httpx）直接拿到 200；OpenAver 改用 curl_cffi 绕 403 的做法这里用不上。
  每 4 秒一页、共 32 页，没有出现 403、429 或验证页。
- 一页 650～750 KB，大部分是嵌在里面的作品表。
- 从真实账本只读抽 30 位：没有资料的 20 位命中 13 位（3 位靠别名命中），已有 minnano-av 资料的 10 位命中 9 位。
  命中的那 13 位，生日、身高、三围、罩杯都有值。已有资料的 9 位里，生日 8 位与 minnano-av 一致。

## 决策

**一、avbase 接在 minnano-av 后面、avwikidb 前面。** avbase 写下的资料，avwikidb 照样拿来交叉核对。

**二、身份按名字核对，同名不挑。** 名字链里收得下的写法（`performer_alias_followup.search_keys`）至多问三个，
404 就换下一个写法。页上 `actors[]` 的名义里要有账本里她的名字（`match_key` 折叠后相等，`rejection` 不收的写法
不作锚点），`pageProps.talents` 里只能有一位。满足这两条，就把 talent 编号绑成
`entity_external_ref(provider='avbase', external_kind='performer')`。编号已属另一条实体时只记「占用」，资料也不写。

**三、只填空。** 资料表里没有她，或者那一行原本就是 avbase 写的，才按这页整行写 `performer_profile`；
`source_url` 记女优页地址。minnano-av 写的行和人写的行都不动，生日或身高与 avbase 不一致时，两边的值记进这条编号的
`metadata_json.conflicts`。

**四、不挡 minnano-av。** avbase 写的那一行不算 minnano-av 的「未过期」：下一轮照问 minnano-av，取到就整行换掉。
avbase 自己按编号的 `last_synced_at` 计 30 天。

**五、只取 `basic_info`。** 同一页的 `actors[].meta.fanza` 另有一份官方资料，两份可能对不上（三上悠亜：`basic_info` 是
B90/H，FANZA 是 B84/F 的旧值）。那份不拿来补空格，原样留进 `raw`。站上没有出道年、活动期、出道作、博客和官网，
这几列留空。`primary.image_url` 是 DMM `actjpgs` 的 125×125，和 avwikidb 是同一张图，不当头像候选（ADR-0067 第六条）。

**六、缓存裁剪，限流与作品采集共用。** 这一站单独按 3 秒间隔，一条后继至多发三次请求。冷却记在 `avbase` 那一份里，
和作品采集共用：撞上 403、429 或验证页，两边在冷却期内都不再问。200 的页先经 `avbase.compact_talent_page` 裁成
`talent` 和同名列表两项再进缓存，单页从约 750 KB 降到约 2 KB。认不出结构的 200 页不进缓存，也不算问到了；
一个写法都没问到时记「未取得」，按 24 小时重试。

**七、判据版本加一。** `RULE` 升到 3，avbase 编号也进指纹，存量女优按每轮 16 条的名额各再问一次。落库与撤回照
ADR-0067：批次号仍是 `auto:performer-profile@<任务行 id>`，`revert_auto_landing.py --source auto:performer-profile`
会把资料行连同 avbase 编号一起撤回。

## 后果

- 绑了 avbase 编号的女优算 JAV 女优（`entry_links.JAV_DIRECTORIES` 本来就列了 `avbase`）。原先在哪个 JAV 目录站都
  没有编号的，绑上之后人物页会多出 MISSAV 入口，同一轮后继也会去 javdb 搜她，搜到才多出 JavDB 入口。
- 每位存量女优在重派时多出一到三次 avbase 请求。
- 判词写进 `generated/performer-profile-landing.csv`，`site` 列为 `avbase`。

## 未决

- `actors[]` 名义和 `meta.sns`（X、Instagram、TikTok 帐号，命中的 13 位里有 12 位给了）都只留在 `raw` 与编号的
  `metadata_json` 里，还没接到别名（ADR-0055 要两站互证）和本人链接。
- `talent.frozen` 的含义未取得，现在不作判据。
- 女优页的作品表只给第一页的 30 部，没有用作身份证据。

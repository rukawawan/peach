// ==UserScript==
// @name         Peach Userscript
// @name:zh-CN   Peach 用户脚本
// @name:zh-TW   Peach 使用者腳本
// @name:en      Peach Userscript
// @namespace    https://github.com/peach-mitao/peach-userscript
// @author       longmeidao
// @icon         https://raw.githubusercontent.com/peach-mitao/peach-userscript/main/assets/peach-logo-64.png
// @source       https://github.com/peach-mitao/peach-userscript
// @supportURL   https://github.com/peach-mitao/peach-userscript/issues
// @homepageURL  https://github.com/peach-mitao/peach-userscript
// @updateURL    https://update.sleazyfork.org/scripts/600821/Peach%20%C2%B7%20JAV%20%E5%85%A5%E5%BA%93.meta.js
// @downloadURL  https://update.sleazyfork.org/scripts/600821/Peach%20%C2%B7%20JAV%20%E5%85%A5%E5%BA%93.user.js
// @license      AGPL-3.0-or-later
// @version      0.7.4
// @description  Detect video codes on web pages, select titles, and send them to Peach for download and library import.
// @description:zh-CN 识别网页中的番号，选择影片并交给 Peach 下载入库。
// @description:zh-TW 識別網頁中的番號，選擇影片並交給 Peach 下載入庫。
// @description:en Detect video codes on web pages, select titles, and send them to Peach for download and library import.
// @match        https://missav.ws/*
// @match        https://*.missav.ws/*
// @match        https://missav.ai/*
// @match        https://*.missav.ai/*
// @match        https://missav.com/*
// @match        https://*.missav.com/*
// @match        https://missav123.com/*
// @match        https://*.missav123.com/*
// @match        https://missav.live/*
// @match        https://*.missav.live/*
// @match        https://missav.fans/*
// @match        https://*.missav.fans/*
// @match        https://missav.media/*
// @match        https://*.missav.media/*
// @match        https://jable.tv/*
// @match        https://*.jable.tv/*
// @match        https://supjav.com/*
// @match        https://*.supjav.com/*
// @match        https://jav.guru/*
// @match        https://*.jav.guru/*
// @match        https://njav.tv/*
// @match        https://*.njav.tv/*
// @match        https://njavtv.com/*
// @match        https://*.njavtv.com/*
// @match        https://123av.com/*
// @match        https://*.123av.com/*
// @match        https://javgo.to/*
// @match        https://*.javgo.to/*
// @match        https://javtiful.com/*
// @match        https://*.javtiful.com/*
// @match        https://javmost.com/*
// @match        https://*.javmost.com/*
// @match        https://javmost.ws/*
// @match        https://*.javmost.ws/*
// @match        https://javmost.cx/*
// @match        https://*.javmost.cx/*
// @match        https://javgg.net/*
// @match        https://*.javgg.net/*
// @match        https://7mmtv.sx/*
// @match        https://*.7mmtv.sx/*
// @match        https://hpjav.tv/*
// @match        https://*.hpjav.tv/*
// @match        https://thisav.com/*
// @match        https://*.thisav.com/*
// @match        https://javhd.com/*
// @match        https://*.javhd.com/*
// @match        https://javdb.com/*
// @match        https://*.javdb.com/*
// @match        https://javbus.com/*
// @match        https://*.javbus.com/*
// @match        https://dmmsee.casa/*
// @match        https://*.dmmsee.casa/*
// @match        https://busfan.casa/*
// @match        https://*.busfan.casa/*
// @match        https://busdmm.casa/*
// @match        https://*.busdmm.casa/*
// @match        https://javlibrary.com/*
// @match        https://*.javlibrary.com/*
// @match        https://javlib.com/*
// @match        https://*.javlib.com/*
// @match        https://r86m.com/*
// @match        https://*.r86m.com/*
// @match        https://f101w.com/*
// @match        https://*.f101w.com/*
// @match        https://c99i.com/*
// @match        https://*.c99i.com/*
// @match        https://e100k.com/*
// @match        https://*.e100k.com/*
// @match        https://jav321.com/*
// @match        https://*.jav321.com/*
// @match        https://avbase.net/*
// @match        https://*.avbase.net/*
// @match        https://javdatabase.com/*
// @match        https://*.javdatabase.com/*
// @match        https://jav.land/*
// @match        https://*.jav.land/*
// @match        https://avmoo.com/*
// @match        https://*.avmoo.com/*
// @match        https://avsox.com/*
// @match        https://*.avsox.com/*
// @match        https://avsox.click/*
// @match        https://*.avsox.click/*
// @match        https://av-wiki.net/*
// @match        https://*.av-wiki.net/*
// @match        https://fc2ppv-db.com/*
// @match        https://*.fc2ppv-db.com/*
// @match        https://fc2cmadb.com/*
// @match        https://*.fc2cmadb.com/*
// @match        https://javtrailers.com/*
// @match        https://*.javtrailers.com/*
// @match        https://javarchive.com/*
// @match        https://*.javarchive.com/*
// @match        https://javten.com/*
// @match        https://*.javten.com/*
// @match        https://r18.dev/*
// @match        https://*.r18.dev/*
// @match        https://dmm.co.jp/*
// @match        https://*.dmm.co.jp/*
// @match        https://mgstage.com/*
// @match        https://*.mgstage.com/*
// @match        https://duga.jp/*
// @match        https://*.duga.jp/*
// @match        https://prestige-av.com/*
// @match        https://*.prestige-av.com/*
// @match        https://sod.co.jp/*
// @match        https://*.sod.co.jp/*
// @match        https://faleno.jp/*
// @match        https://*.faleno.jp/*
// @match        https://adult.contents.fc2.com/*
// @match        https://*.adult.contents.fc2.com/*
// @match        https://s1s1s1.com/*
// @match        https://*.s1s1s1.com/*
// @match        https://moodyz.com/*
// @match        https://*.moodyz.com/*
// @match        https://ideapocket.com/*
// @match        https://*.ideapocket.com/*
// @match        https://madonna-av.com/*
// @match        https://*.madonna-av.com/*
// @match        https://attackers.net/*
// @match        https://*.attackers.net/*
// @match        https://premium-beauty.com/*
// @match        https://*.premium-beauty.com/*
// @match        https://kawaiikawaii.jp/*
// @match        https://*.kawaiikawaii.jp/*
// @match        https://max-a.co.jp/*
// @match        https://*.max-a.co.jp/*
// @match        https://maxing.jp/*
// @match        https://*.maxing.jp/*
// @match        https://1pondo.tv/*
// @match        https://*.1pondo.tv/*
// @match        https://caribbeancom.com/*
// @match        https://*.caribbeancom.com/*
// @match        https://10musume.com/*
// @match        https://*.10musume.com/*
// @match        https://pacopacomama.com/*
// @match        https://*.pacopacomama.com/*
// @match        https://heyzo.com/*
// @match        https://*.heyzo.com/*
// @match        https://tokyo-hot.com/*
// @match        https://*.tokyo-hot.com/*
// @match        https://manko.fun/*
// @match        https://*.manko.fun/*
// @match        https://sukebei.nyaa.si/*
// @match        https://*.sukebei.nyaa.si/*
// @match        https://onejav.com/*
// @match        https://*.onejav.com/*
// @match        https://freejavtorrent.com/*
// @match        https://*.freejavtorrent.com/*
// @match        https://16mag.com/*
// @match        https://*.16mag.com/*
// @match        https://netflav5.com/*
// @match        https://*.netflav5.com/*
// @match        https://netflav.com/*
// @match        https://*.netflav.com/*
// @match        https://bestjavporn.com/*
// @match        https://*.bestjavporn.com/*
// @match        https://javmenu.com/*
// @match        https://*.javmenu.com/*
// @match        https://avjoy.me/*
// @match        https://*.avjoy.me/*
// @match        https://ggjav.com/*
// @match        https://*.ggjav.com/*
// @match        https://av01.tv/*
// @match        https://*.av01.tv/*
// @match        https://av01.media/*
// @match        https://*.av01.media/*
// @match        https://highporn.net/*
// @match        https://*.highporn.net/*
// @match        https://evojav.pro/*
// @match        https://*.evojav.pro/*
// @match        https://hayav.com/*
// @match        https://*.hayav.com/*
// @match        https://javhub.net/*
// @match        https://*.javhub.net/*
// @match        https://141jav.com/*
// @match        https://*.141jav.com/*
// @match        https://141ppv.com/*
// @match        https://*.141ppv.com/*
// @match        https://freejavbt.com/*
// @match        https://*.freejavbt.com/*
// @match        https://freejavbt.xyz/*
// @match        https://*.freejavbt.xyz/*
// @match        https://javrate.com/*
// @match        https://*.javrate.com/*
// @match        https://sehuatang.net/*
// @match        https://*.sehuatang.net/*
// @match        https://sehuatang.org/*
// @match        https://*.sehuatang.org/*
// @match        https://169bbs.com/*
// @match        https://*.169bbs.com/*
// @match        https://hjd2048.com/*
// @match        https://*.hjd2048.com/*
// @match        https://airav.wiki/*
// @match        https://*.airav.wiki/*
// @match        https://airav.fun/*
// @match        https://*.airav.fun/*
// @match        https://airav.io/*
// @match        https://*.airav.io/*
// @match        https://javbooks.com/*
// @match        https://*.javbooks.com/*
// @match        https://jmvbt.com/*
// @match        https://*.jmvbt.com/*
// @match        https://javhd.today/*
// @match        https://*.javhd.today/*
// @match        https://javfree.me/*
// @match        https://*.javfree.me/*
// @match        https://javcv.com/*
// @match        https://*.javcv.com/*
// @match        https://projectjav.com/*
// @match        https://*.projectjav.com/*
// @match        https://paipancon.com/*
// @match        https://*.paipancon.com/*
// @match        *://*/*
// @match        https://*/integrations/peach-userscript-bridge
// @match        http://localhost/integrations/peach-userscript-bridge
// @match        http://127.0.0.1/integrations/peach-userscript-bridge
// @include      /^http:\/\/\[::1\](?::\d+)?\/integrations\/peach-userscript-bridge$/
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        window.onurlchange
// @connect      *
// @connect      update.sleazyfork.org
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  /* Settings icon: lucide-static 1.57.0, ISC License.
   * Copyright (c) 2026 Lucide Icons and Contributors
   * Permission to use, copy, modify, and/or distribute this software for any
   * purpose with or without fee is hereby granted, provided that the above
   * copyright notice and this permission notice appear in all copies.
   * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
   * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
   * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
   * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
   * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
   * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
   * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   */

  /* loading-dev 0.3.6, MIT License. Copyright (c) 2026 Jakub Krehel.
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  const SITE_RULES = {"version":1,"sites":[{"id":"missav","label":"MissAV","kind":"在线播放","domains":["missav.ws","missav.ai","missav.com","missav123.com","missav.live","missav.fans","missav.media"],"mode":"automatic","detail_pattern":"^/(?:dm[0-9]+/)?(?:(?:en|ja|zh|cn|tw)/)?([^/]+)/?$","selectors":["h1","[data-video-code]","dt",".video-info p",".video-detail p"]},{"id":"jable","label":"Jable","kind":"在线播放","domains":["jable.tv"],"mode":"automatic","detail_pattern":"^/videos/([^/]+)/?$","selectors":["h1",".video-info h4","[data-video-code]","dt",".video-info p"]},{"id":"supjav","label":"SupJAV","kind":"在线播放","domains":["supjav.com"],"mode":"selection"},{"id":"jav-guru","label":"JAV.guru","kind":"在线播放","domains":["jav.guru"],"mode":"automatic","detail_pattern":"^/[0-9]+/([^/]+)/?$","selectors":["h1.entry-title","h1"]},{"id":"njav","label":"NJAV / 123AV","kind":"在线播放","domains":["njav.tv","njavtv.com","123av.com","javgo.to"],"mode":"automatic","detail_pattern":"^/(?:en|ja|zh|cn|tw)/v/([^/]+)/?$","selectors":["h1","dt"]},{"id":"javtiful","label":"JAVtiful","kind":"在线播放","domains":["javtiful.com"],"mode":"automatic","detail_pattern":"^/(?:[a-z]{2}/)?video/[0-9]+/([^/]+)/?$","selectors":["h1","[data-video-code]"]},{"id":"javmost","label":"JAVMost","kind":"在线播放","domains":["javmost.com","javmost.ws","javmost.cx"],"mode":"selection"},{"id":"javgg","label":"JAVGG","kind":"在线播放","domains":["javgg.net"],"mode":"selection"},{"id":"7mmtv","label":"7mmtv","kind":"在线播放","domains":["7mmtv.sx"],"mode":"automatic","detail_pattern":"^/(?:ja|en|zh|cn|tw)/(?:censored|uncensored)_content/[0-9]+/([^/]+)\\.html$","selectors":["h1"]},{"id":"hpjav","label":"HPJAV","kind":"在线播放","domains":["hpjav.tv"],"mode":"selection"},{"id":"thisav","label":"ThisAV","kind":"在线播放","domains":["thisav.com"],"mode":"selection"},{"id":"javhd","label":"JAVHD","kind":"在线播放","domains":["javhd.com"],"mode":"selection"},{"id":"javdb","label":"JavDB","kind":"数据库","domains":["javdb.com"],"mode":"automatic","detail_pattern":"^/v/[A-Za-z0-9]+/?$","selectors":["h2.title",".panel-block strong"]},{"id":"javbus","label":"JavBus","kind":"数据库","domains":["javbus.com","dmmsee.casa","busfan.casa","busdmm.casa"],"mode":"automatic","detail_pattern":"^/(?:[a-z]{2}/)?([^/]+)/?$","selectors":["h3",".info p .header"]},{"id":"javlibrary","label":"JavLibrary","kind":"数据库","domains":["javlibrary.com","javlib.com","r86m.com","f101w.com","c99i.com","e100k.com"],"mode":"automatic","detail_pattern":"^/(?:cn|tw|en|ja)/?$","selectors":["#video_id .text","#video_title"],"query_keys":["v"]},{"id":"jav321","label":"Jav321","kind":"数据库","domains":["jav321.com"],"mode":"automatic","detail_pattern":"^/video/[A-Za-z0-9]+/?$","selectors":["h3",".panel-body b"]},{"id":"avbase","label":"AVBase","kind":"数据库","domains":["avbase.net"],"mode":"automatic","detail_pattern":"^/works/(?:[^/:]+:)?([^/:]+)/?$","selectors":["h1","#__NEXT_DATA__"]},{"id":"javdatabase","label":"JAVDatabase","kind":"数据库","domains":["javdatabase.com"],"mode":"automatic","detail_pattern":"^/movies/([^/]+)/?$","selectors":["h1",".movie-code"]},{"id":"jav-land","label":"JAV.land","kind":"数据库","domains":["jav.land"],"mode":"selection"},{"id":"avmoo","label":"AVMOO","kind":"数据库","domains":["avmoo.com"],"mode":"selection"},{"id":"avsox","label":"AVSOX","kind":"数据库","domains":["avsox.com","avsox.click"],"mode":"selection"},{"id":"av-wiki","label":"AV-Wiki","kind":"数据库","domains":["av-wiki.net"],"mode":"selection"},{"id":"fc2ppvdb","label":"FC2PPVDB","kind":"数据库","domains":["fc2ppv-db.com"],"mode":"selection"},{"id":"fc2cmadb","label":"FC2CmaDB","kind":"数据库","domains":["fc2cmadb.com"],"mode":"selection"},{"id":"javtrailers","label":"JAVTrailers","kind":"数据库","domains":["javtrailers.com"],"mode":"selection"},{"id":"javarchive","label":"JavArchive","kind":"数据库","domains":["javarchive.com"],"mode":"selection"},{"id":"javten","label":"JAVten","kind":"数据库","domains":["javten.com"],"mode":"selection"},{"id":"r18dev","label":"r18.dev","kind":"数据库","domains":["r18.dev"],"mode":"selection"},{"id":"dmm","label":"FANZA / DMM","kind":"发行平台","domains":["dmm.co.jp"],"mode":"automatic","identity":"peach","query_keys":["id"],"selectors":["th","dt","[data-video-code]"],"detail_pattern":"^/(?:(?:av|amateur)/content/?|(?:digital/(?:videoa|videoc)|mono/dvd)/-/detail/=/cid=([A-Za-z0-9_]+)/?)$"},{"id":"mgs","label":"MGS","kind":"发行平台","domains":["mgstage.com"],"mode":"automatic","identity":"peach","selectors":["th","dt","[data-video-code]"],"detail_pattern":"^/product/product_detail/([A-Za-z0-9_-]+)/?$"},{"id":"duga","label":"DUGA","kind":"发行平台","domains":["duga.jp"],"mode":"selection"},{"id":"prestige","label":"Prestige","kind":"发行平台","domains":["prestige-av.com"],"mode":"selection"},{"id":"sod","label":"SOD / SODprime","kind":"发行平台","domains":["sod.co.jp"],"mode":"selection"},{"id":"faleno","label":"FALENO","kind":"发行平台","domains":["faleno.jp"],"mode":"selection"},{"id":"fc2-market","label":"FC2 内容市场","kind":"发行平台","domains":["adult.contents.fc2.com"],"mode":"automatic","identity":"peach","detail_pattern":"^/article/([0-9]{1,10})/?$"},{"id":"s1","label":"S1","kind":"片商","domains":["s1s1s1.com"],"mode":"selection"},{"id":"moodyz","label":"MOODYZ","kind":"片商","domains":["moodyz.com"],"mode":"selection"},{"id":"ideapocket","label":"IdeaPocket","kind":"片商","domains":["ideapocket.com"],"mode":"selection"},{"id":"madonna","label":"Madonna","kind":"片商","domains":["madonna-av.com"],"mode":"selection"},{"id":"attackers","label":"Attackers","kind":"片商","domains":["attackers.net"],"mode":"selection"},{"id":"premium","label":"Premium","kind":"片商","domains":["premium-beauty.com"],"mode":"selection"},{"id":"kawaii","label":"Kawaii","kind":"片商","domains":["kawaiikawaii.jp"],"mode":"selection"},{"id":"max-a","label":"MAX-A","kind":"片商","domains":["max-a.co.jp"],"mode":"selection"},{"id":"maxing","label":"MAXING","kind":"片商","domains":["maxing.jp"],"mode":"selection"},{"id":"1pondo","label":"一本道","kind":"无码","domains":["1pondo.tv"],"mode":"selection"},{"id":"caribbeancom","label":"加勒比","kind":"无码","domains":["caribbeancom.com"],"mode":"selection"},{"id":"10musume","label":"天然むすめ","kind":"无码","domains":["10musume.com"],"mode":"selection"},{"id":"pacopacomama","label":"Pacopacomama","kind":"无码","domains":["pacopacomama.com"],"mode":"selection"},{"id":"heyzo","label":"HEYZO","kind":"无码","domains":["heyzo.com"],"mode":"selection"},{"id":"tokyo-hot","label":"Tokyo-Hot","kind":"无码","domains":["tokyo-hot.com"],"mode":"selection"},{"id":"manko","label":"manko.fun","kind":"资源","domains":["manko.fun"],"mode":"selection"},{"id":"sukebei","label":"Sukebei","kind":"资源","domains":["sukebei.nyaa.si"],"mode":"selection"},{"id":"onejav","label":"OneJAV","kind":"资源","domains":["onejav.com"],"mode":"selection"},{"id":"freejavtorrent","label":"Free JAV Torrent","kind":"资源","domains":["freejavtorrent.com"],"mode":"selection"},{"id":"16mag","label":"16mag","kind":"资源","domains":["16mag.com"],"mode":"selection"},{"id":"netflav","label":"NETFLAV","kind":"在线播放","domains":["netflav5.com","netflav.com"],"mode":"selection"},{"id":"bestjavporn","label":"BestJavPorn","kind":"在线播放","domains":["bestjavporn.com"],"mode":"selection"},{"id":"javmenu","label":"JAVMenu","kind":"数据库","domains":["javmenu.com"],"mode":"selection"},{"id":"avjoy","label":"AVJOY","kind":"在线播放","domains":["avjoy.me"],"mode":"selection"},{"id":"ggjav","label":"GGJAV","kind":"在线播放","domains":["ggjav.com"],"mode":"selection"},{"id":"av01","label":"AV01","kind":"在线播放","domains":["av01.tv","av01.media"],"mode":"selection"},{"id":"highporn","label":"HighPorn","kind":"在线播放","domains":["highporn.net"],"mode":"selection"},{"id":"evojav","label":"EvoJAV","kind":"在线播放","domains":["evojav.pro"],"mode":"selection"},{"id":"hayav","label":"HayAV","kind":"在线播放","domains":["hayav.com"],"mode":"selection"},{"id":"javhub","label":"JAVHub","kind":"在线播放","domains":["javhub.net"],"mode":"selection"},{"id":"141jav","label":"141JAV","kind":"资源","domains":["141jav.com"],"mode":"selection"},{"id":"141ppv","label":"141PPV","kind":"资源","domains":["141ppv.com"],"mode":"selection"},{"id":"freejavbt","label":"FreeJavBT","kind":"资源","domains":["freejavbt.com","freejavbt.xyz"],"mode":"selection"},{"id":"javrate","label":"JAVRate","kind":"在线播放","domains":["javrate.com"],"mode":"selection"},{"id":"sehuatang","label":"色花堂","kind":"资源","domains":["sehuatang.net","sehuatang.org"],"mode":"selection","query_keys":["tid"]},{"id":"169bbs","label":"SEX169","kind":"资源","domains":["169bbs.com"],"mode":"selection"},{"id":"hjd2048","label":"2048论坛","kind":"资源","domains":["hjd2048.com"],"mode":"selection"},{"id":"airav","label":"AirAV","kind":"数据库","domains":["airav.wiki","airav.fun","airav.io"],"mode":"selection"},{"id":"javbooks","label":"JavBooks","kind":"资源","domains":["javbooks.com","jmvbt.com"],"mode":"selection"},{"id":"javhd-today","label":"JavHD.today","kind":"在线播放","domains":["javhd.today"],"mode":"selection"},{"id":"javfree","label":"JavFree","kind":"资源","domains":["javfree.me"],"mode":"selection"},{"id":"javcv","label":"JavCV","kind":"数据库","domains":["javcv.com"],"mode":"selection"},{"id":"projectjav","label":"ProjectJav","kind":"资源","domains":["projectjav.com"],"mode":"selection"},{"id":"paipancon","label":"Paipancon","kind":"在线播放","domains":["paipancon.com"],"mode":"selection"}]};
  const STORAGE_BASE = 'peach.jav.base';
  const STORAGE_TOKEN = 'peach.jav.token';
  const STORAGE_ERRORS = 'peach.jav.errors';
  const STORAGE_DISPLAY = 'peach.jav.display';
  const STORAGE_ENABLED = 'peach.jav.enabled';
  const STORAGE_POSITION = 'peach.jav.position';
  const STORAGE_APPEARANCE = 'peach.jav.appearance';
  const ROOT_ID = 'peach-jav-action';
  const SCRIPT_VERSION = "0.7.4";
  // 0.6.3 起默认名改为英文；发布页切换前仍返回原名。
  const PUBLISHED_NAMES = ['Peach Userscript', 'Peach · JAV 入库'];
  const PEACH_LOGO = "data:image/png;base64,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";
  const STORAGE_SOUND = 'peach.jav.success-sound';
  const STORAGE_INSTALLED = 'peach.jav.installed-version';
  const STORAGE_UPDATES = 'peach.jav.updates';
  const STORAGE_CHECKED = 'peach.jav.update-attempted-at';
  // 各窗口共享的任务进度：持锁窗口向 Peach 查询进行中任务，结果写入快照，其余窗口只读快照。
  const STORAGE_TASKS = 'peach.jav.tasks';
  const STORAGE_POLLER = 'peach.jav.poller';
  const STORAGE_CHIMED = 'peach.jav.chimed';
  const WINDOW_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  // 更新入口直接打开 Sleazy 的安装文件，与 @downloadURL 相同，脚本管理器随即弹出更新确认。
  const RELEASE_INSTALL = 'https://update.sleazyfork.org/scripts/600821/Peach%20%C2%B7%20JAV%20%E5%85%A5%E5%BA%93.user.js';
  const RELEASE_META = 'https://update.sleazyfork.org/scripts/600821/Peach%20%C2%B7%20JAV%20%E5%85%A5%E5%BA%93.meta.js';
  const infoVersion = typeof GM_info === 'object' && validVersion(GM_info?.script?.version) ? GM_info.script.version : SCRIPT_VERSION;
  const RUNNING_VERSION = compareVersion(SCRIPT_VERSION, infoVersion) <= 0 ? SCRIPT_VERSION : infoVersion;
  // 新实例在同页去重及桥接返回之前登记安装版本，正在运行的实例可收到变化。
  recordInstalledVersion();
  if (location.pathname === '/integrations/peach-userscript-bridge') {
    let origin;
    try { origin = settings(location.origin, 'bridge-only').base; } catch { return; }
    if (window.parent === window || !document.querySelector('meta[name="peach-userscript-bridge"][content="1"]')) return;
    addEventListener('message', event => {
      if (event.source !== window.parent || event.origin !== origin || event.data?.type !== 'peach-userscript:probe'
        || typeof event.data.nonce !== 'string' || !/^[a-f0-9-]{36}$/.test(event.data.nonce)) return;
      window.parent.postMessage({ type: 'peach-userscript:ready', protocol: 1, nonce: event.data.nonce,
        version: SCRIPT_VERSION, paired: configuration()?.base === origin }, origin);
    });
    return;
  }
  if (window.top !== window.self) return;
  if (globalThis.__peachJavUserscriptActive) return;
  globalThis.__peachJavUserscriptActive = true;
  if (configuration()?.base === location.origin) watchPeachAppearance();
  const ACTIVE = new Set(['queued', 'searching', 'submitted']);
  const STATES = new Set([...ACTIVE, 'ingested', 'owned', 'failed', 'no_match', 'idle']);
  const LABELS = {
    queued: '已排队', searching: '正在搜磁力', submitted: '云下载中',
    ingested: '已加入 Peach 馆藏', owned: '馆藏已有该番号影片', failed: '任务失败', no_match: '未找到资源', idle: '可以加入 Peach 馆藏',
  };
  // 本页番号的行状态：短标签与 BoardUI Chip 颜色，配色沿用 Peach 活动页 StatusBadge
  // （完成绿、失败红、进行中蓝、需留意黄）。表格行底色与 neutral Chip 同为三级背景，排队改用 soft；
  // 未提交的「待加入」不是任务状态，只用次级文字。完整说明放在悬停提示。
  const ROW_STATES = {
    pending: ['待加入', 'plain'], checking: ['查询中', 'plain'], sending: ['提交中', 'blue'],
    queued: ['排队中', 'soft'], searching: ['搜索中', 'blue'], submitted: ['下载中', 'blue'],
    importing: ['入库中', 'blue'], organizing: ['整理中', 'blue'],
    ingested: ['已入库', 'lime'], owned: ['已有', 'lime'], no_match: ['无资源', 'yellow'], failed: ['失败', 'rose'],
  };
  // 提示音沿用 Peach `ui-kit/sounds.ts` 的配方，Web Audio 当场合成、不带音频文件：点加入用 toggle-on
  // 的一声上扬表示开始，一部影片入库并整理完成后用 success 的大三度两音。默认开启，与 Peach 界面音效一致，可在设置中关闭。
  const SOUNDS = {
    start: [{from:550, to:650, duration:0.08, volume:0.15, start:0}],
    success: [{from:523, duration:0.12, volume:0.18, start:0}, {from:523 * 1.25, duration:0.12, volume:0.18, start:0.2}],
  };
  let soundContext = null;
  function playSound(name) {
    if (GM_getValue(STORAGE_SOUND, true) === false) return;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return;
    try {
      soundContext ||= new Context();
      if (soundContext.state === 'suspended') soundContext.resume()?.catch?.(() => {});
      const now = soundContext.currentTime;
      for (const {from, to = from, duration, volume, start} of SOUNDS[name]) {
        const osc = soundContext.createOscillator(), gain = soundContext.createGain(), at = now + start;
        osc.type = 'sine'; osc.frequency.setValueAtTime(from, at);
        if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + duration);
        gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
        osc.connect(gain); gain.connect(soundContext.destination);
        osc.start(at); osc.stop(at + duration + 0.01);
      }
    } catch { /* 浏览器不允许出声时静默跳过。 */ }
  }

  // 云下载可能要几十分钟：前 1 分钟每 2 秒查一次，之后每 15 秒一次，最长跟踪 1 小时；页面在后台时暂停。
  const POLL_LIMIT = 60 * 60_000;
  async function pollWait(count) {
    await new Promise(resolve => setTimeout(resolve, count < 30 ? 2000 : 15_000));
    while (document.hidden) await new Promise(resolve => document.addEventListener('visibilitychange', resolve, {once:true}));
  }
  // 失败原因来自 Peach 下载任务：磁力本身的问题换一个磁力，网盘一侧的问题修好后重试。
  function failureText(body) {
    const detail = typeof body.message === 'string' ? body.message.slice(0, 120) : LABELS[body.state];
    return body.cause === 'magnet' ? `磁力问题：${detail}。可以换一个磁力。`
      : body.cause === 'cloud' ? `网盘问题：${detail}。请在 Peach 检查网盘后重试。` : detail;
  }
  function errorLabel(error) {
    if (error?.kind === 'http') return [401, 403].includes(error.status) ? '令牌无效' : error.status >= 500 ? '服务不可用'
      : error.status === 429 ? '请求过多' : '请求失败';
    return {invalid_response:'返回无效', network:'连接失败', client_exception:'连接失败', timeout:'请求超时', abort:'已中止'}[error?.kind] || '失败';
  }
  function setRowState(item, state, detail = '', label = '') {
    const [text, color] = ROW_STATES[state] || ROW_STATES.failed;
    item.row.dataset.state = state; item.status.dataset.chip = color;
    item.status.textContent = label || text; item.status.title = detail || label || text;
  }
  const attempts = new Set();
  let generation = 0;
  let current = null;
  let pageKey = '';
  let refreshTimer;
  let selected = null;
  let settingsView = null;
  let batchView = null;
  let panelMode = 'expanded';
  let updateEntry = null;
  let updateCache = readUpdateCache();
  let updateError = '';
  let updateChecking = false;
  let updateInstallVersion = '';
  let updateDismissed = '';
  // 没有单部作品浮卡的页面，图标展开的是入口面板；本页番号返回时回到这里。
  let entryOpen = false;
  // 女优页：入口面板顶部那一块的状态，以及用户在这一页收起过面板（收起后不再自动展开）。
  let performerView = null;
  let performerDismissed = '';
  // 入口面板折叠成只剩标题栏；从图标重新展开时复原。
  let entryCollapsed = false;
  let updateGeneration = 0;
  let updateTimer;
  let updateDisposed = false;
  let automaticUpdatesAvailable = true;
  const updateRequests = new Set();
  const updateContainers = new Set();
  const updateListeners = [];
  const surfaces = new Set();

  function pageInterfaceAllowed() {
    return GM_getValue(STORAGE_ENABLED,true) !== false && configuration()?.base !== location.origin
      && (Boolean(siteFor(new URL(location.href))) || GM_getValue(STORAGE_DISPLAY,'jav') === 'always');
  }

  function applyDisplayPreference() {
    if (!pageInterfaceAllowed()) {
      pageKey='';
      generation++;
      clearTimeout(refreshTimer);clearTimeout(updateTimer);
      updateGeneration++;updateChecking=false;
      for(const request of updateRequests)request.abort?.();
      updateRequests.clear();
      batchView?.dialog.close();
      current?.presentation?.cancel();current?.root.remove();current=null;
      updateEntry?.root.remove();updateEntry=null;
      document.getElementById('peach-jav-notice')?.remove();
      return;
    }
    refresh();scheduleUpdateCheck();
  }

  function activateInterface() {
    settingsView?.dialog.close();
    panelMode='expanded';
    GM_setValue(STORAGE_ENABLED,true);
    if (!pageInterfaceAllowed()) return;
    if (String(getSelection() || '').trim() && siteFor(new URL(location.href))) {
      selectCode();return;
    }
    refresh();
    if(current)present(current,'expanded',true);else openPageActions();
  }

  const DARK_STYLE = `color-scheme:dark;--field-ring-hover:rgba(255,255,255,.24);
      --color-status-lime-background:color-mix(in srgb,oklch(27.4% .072 132.109) 60%,transparent);--color-status-lime-text:oklch(76.8% .233 130.85);
      --color-status-yellow-background:color-mix(in srgb,oklch(28.6% .066 53.813) 60%,transparent);--color-status-yellow-text:oklch(79.5% .184 86.047);
      --color-status-rose-background:color-mix(in srgb,oklch(27.1% .105 12.094) 60%,transparent);--color-status-rose-text:oklch(64.5% .246 16.439);
      --color-status-blue-background:color-mix(in srgb,oklch(28.2% .091 267.935) 60%,transparent);--color-status-blue-text:oklch(80.9% .105 251.813);--color-text-primary:oklch(98.5% 0 0);--color-text-secondary:oklch(70.8% 0 0);--color-text-tertiary:oklch(43.9% 0 0);
      --color-border-checkbox-default:oklch(43.9% 0 0);--color-border-checkbox-hover:oklch(55.6% 0 0);
      --color-background-full:#121212;--color-background-primary-default:oklch(26.9% 0 0);--color-background-primary-hover:#40404099;
      --color-background-secondary-default:oklch(20.5% 0 0);--color-background-tertiary-default:oklch(26.9% 0 0);
      --color-border-button-default:oklch(37.1% 0 0);--color-border-button-hover:oklch(55.6% 0 0);--color-border-button-active:oklch(43.9% 0 0);
      --color-separator-border:oklch(37.1% 0 0);--color-text-error:oklch(70.4% .191 22.216);
      --update-script-foreground:#3392ff;--update-peach-foreground:oklch(82.8% .189 84.429);
      --elevation-xs:0 1px 2px 0 rgb(0 0 0 / .18);--elevation-dropdown:0 1px 1px 0 rgb(0 0 0 / .14),0 4px 4px 0 rgb(0 0 0 / .10);`;
  // Peach BoardUI DOM 控件快照：来源与适配范围见 docs/REUSE.md。
  const UI_STYLE = `
    :host{all:initial;--color-text-primary:oklch(14.5% 0 0);--color-text-secondary:oklch(55.6% 0 0);--color-text-tertiary:oklch(70.8% 0 0);
      --color-border-checkbox-default:oklch(87% 0 0);--color-border-checkbox-hover:oklch(70.8% 0 0);
      --color-background-full:#fff;--color-background-primary-default:#fff;--color-background-primary-hover:#f7f7f7;
      --color-background-secondary-default:#f7f7f7;--color-background-tertiary-default:#ebebeb;
      --color-border-button-default:#ebebeb;--color-border-button-hover:oklch(87% 0 0);--color-border-button-active:oklch(70.8% 0 0);
      --color-accent-400:#3392ff;--color-accent-500:oklch(62.3% .214 259.815);--color-accent-600:oklch(54.6% .245 262.881);--color-accent-700:oklch(48.8% .243 264.376);
      --color-text-white:#fff;--color-text-error:oklch(57.7% .245 27.325);--color-separator-border:#ebebeb;
      --update-script-foreground:oklch(54.6% .245 262.881);--update-peach-foreground:oklch(55.5% .163 48.998);
      --elevation-xs:0 1px 2px 0 rgb(0 0 0 / .05);--elevation-dropdown:0 1px 1px 0 rgb(0 0 0 / .04),0 4px 4px 0 rgb(0 0 0 / .02);
      --ground:var(--color-background-full);--surface:var(--color-background-secondary-default);--sunk:var(--color-background-tertiary-default);
      --ink:var(--color-text-primary);--ink-2:var(--color-text-secondary);--muted:var(--color-text-secondary);
      --line:var(--color-border-button-default);--line-soft:var(--color-separator-border);--tungsten:var(--color-accent-500);--drop:var(--color-text-error);
      --color-avatar-neutral-background:color-mix(in srgb,var(--color-text-primary) 10%,var(--color-background-primary-default));
      --task-accent:var(--color-accent-500);--task-muted:var(--color-text-tertiary);--icon-inline:1.2em;
      --board-font:'Inter Variable','Inter','Segoe UI','Microsoft YaHei UI','Microsoft YaHei','PingFang SC','Hiragino Sans GB','Noto Sans CJK SC','Noto Sans SC','Source Han Sans SC',sans-serif;
      --board-body:400 14px/20px var(--board-font);--board-body-medium:500 14px/20px var(--board-font);--board-caption:400 12px/16px var(--board-font);--board-caption-semibold:600 12px/16px var(--board-font);--board-heading:500 20px/26px var(--board-font);
      --board-blue:linear-gradient(180deg,var(--color-accent-500),var(--color-accent-600));--board-blue-hover:linear-gradient(180deg,var(--color-accent-400),var(--color-accent-500));--board-blue-active:linear-gradient(180deg,var(--color-accent-600),var(--color-accent-700));
      --board-motion:.3s cubic-bezier(.4,0,.2,1);--board-dialog-motion:.3s cubic-bezier(.32,.72,0,1);--spring-press-ms:208;
      --spring-press:linear(0,0.1659,0.4268,0.6816,0.8795,1.0066,1.084,1.0861,1.069,1.0457,1.0241,1.0079,0.998,0.9933,0.9923,0.9934,0.9954,0.9973,0.9995,1.0003,1.0006,1.0007,1.0005,1.0004,1);
      --field-ring-hover:rgba(0,0,0,.21);
      --color-status-lime-background:oklch(93.8% .127 124.321);--color-status-lime-text:oklch(45.3% .124 130.933);
      --color-status-yellow-background:oklch(94.5% .129 101.54);--color-status-yellow-text:oklch(47.6% .114 61.907);
      --color-status-rose-background:oklch(89.2% .058 10.001);--color-status-rose-text:oklch(45.5% .188 13.697);
      --color-status-blue-background:oklch(88.2% .059 254.128);--color-status-blue-text:oklch(42.4% .199 265.638);--pill-radius:999px;--control-radius:10px;--surface-radius:16px;--floating-radius:20px;--control-h:36px;
      --fs-sm:13px;--fs-md:14px;--fs-lg:16px;--fs-xl:20px;--fieldset-bar-h:52px;
      position:fixed;inset:auto max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) auto;
      z-index:2147483647;width:min(320px,calc(100% - 32px));font:var(--board-body);color:var(--ink);color-scheme:light;text-align:left;-webkit-font-smoothing:antialiased}
    @media(prefers-color-scheme:dark){:host(:not([data-theme=light])){${DARK_STYLE}}}
    :host([data-theme=dark]){${DARK_STYLE}}
    *,*::before,*::after{box-sizing:border-box} [hidden]{display:none!important}
    :host([data-panel-mode="minimized"]){width:48px}
    /* 浮卡与子页同在右下角，切换时同时播 Peach 设置面板的进出场（web/board.css 的
       board-dialog-in／out，BoardUI 设置弹层动效）：子页进场时浮卡退场，子页退场时浮卡进场。
       先隐藏再让子页从 0 进场会露出两层都看不见的空档，读起来就是一闪。缩放原点按
       BoardUI 下拉菜单随停靠位置取的规则，右下停靠取右下角。 */
    :host{transform-origin:bottom right}
    :host([data-settings-open]){visibility:hidden;pointer-events:none;transition:visibility 0s .3s;animation:board-dialog-out var(--board-dialog-motion) both}
    :host([data-subpage-return]){animation:board-dialog-in var(--board-dialog-motion) backwards}
    @keyframes board-dialog-in{from{opacity:0;transform:scale(.85);filter:blur(4px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
    @keyframes board-dialog-out{from{opacity:1;transform:scale(1);filter:blur(0)}to{opacity:0;transform:scale(.85);filter:blur(4px)}}
    @keyframes settings-backdrop-in{from{opacity:0}to{opacity:1}}
    @keyframes settings-backdrop-out{from{opacity:1}to{opacity:0}}
    h2,p{margin:0} h2{font:var(--board-heading)}
    .panel{background:var(--ground);border:1px solid var(--line);border-radius:var(--floating-radius);overflow:hidden}
    .task-progress{display:block;width:100%;height:6px;overflow:hidden;border-radius:9999px}
    .task-progress .track{fill:var(--color-background-tertiary-default)}.task-progress .fill{fill:var(--task-accent)}
    .task-progress .stop{fill:var(--ground)}
    .flow{display:grid;gap:12px}.flow-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}
    .flow-step{display:grid;grid-template-rows:18px 20px;justify-items:center;align-items:center;gap:4px;min-width:0;color:var(--task-muted);font:var(--board-body)}
    .flow-step[data-state="complete"] .flow-label{text-decoration:line-through}.flow-step[data-state="current"]{color:var(--ink)}
    .flow-step[data-state="error"]{color:var(--drop)}.flow-mark{width:18px;height:18px;display:grid;place-items:center;line-height:1}
    .flow-mark svg{display:block;width:100%;height:100%;fill:currentColor}
    .flow-step[data-state="current"] .flow-mark{color:var(--task-accent)}
    .flow-step:not([data-state=current]) [data-stage-animation]{display:none}
    .flow-step[data-state=current]> .flow-mark>svg{display:none}
    .flow-step:not([data-state=current]) [data-stage-animation] *{animation-play-state:paused}
    [data-stage-animation]{display:block;width:18px;height:18px;color:currentColor}
    .stage-spin{transform-origin:8px 8px;animation:stage-rotate 1200ms linear infinite}
    .stage-radar .stage-spin{animation-duration:1500ms}
    @keyframes stage-rotate{to{transform:rotate(360deg)}}
    .stage-linear{display:flex;align-items:center;justify-content:center;gap:3.375px}
    .stage-linear i{width:3.375px;height:3.375px;border-radius:9999px;background:currentColor;animation:stage-fade 900ms linear infinite;animation-delay:calc(900ms * (var(--ld-step) - 3) / 3)}
    @keyframes stage-fade{0%,100%{opacity:1}66.67%{opacity:.5}}
    .stage-gather{display:grid;grid-template-columns:1fr 1fr;gap:24%;animation:stage-turn 1600ms ease-in-out infinite}
    .stage-gather i{background:currentColor;border-radius:2.52px;animation:stage-pull 1600ms ease-in-out infinite}
    @keyframes stage-pull{0%,100%{transform:translate(0,0)}30%,60%{transform:translate(calc(var(--ld-x) * 21.1%),calc(var(--ld-y) * 21.1%))}}
    @keyframes stage-turn{0%,30%{transform:rotate(0)}60%,100%{transform:rotate(90deg)}}
    .stage-blocks{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:1.8px}
    .stage-blocks i{background:currentColor;border-radius:1.125px;animation:stage-block 1300ms ease-in-out infinite;animation-delay:calc(1300ms * (var(--ld-step) - 5) / 5)}
    @keyframes stage-block{0%,70%,100%{transform:scale(1)}35%{transform:scale(0)}}
    .bar{min-height:var(--fieldset-bar-h);padding:8px 16px 8px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
    .bar.subpage-bar{justify-content:flex-start;gap:8px}.task-page .bar-title{flex:1}
    .bar strong{font-weight:500;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
    .bar-heading{display:grid;min-width:0;gap:2px}.bar-title{display:flex;align-items:center;gap:8px;min-width:0}.bar-summary{font:var(--board-caption);color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bar-actions{display:flex;gap:4px;flex:none}
    .bar-actions [data-collapse-chevron]{transition:transform .2s ease-in-out}
    .bar-actions [aria-expanded="false"] [data-collapse-chevron]{transform:rotate(180deg)}
    .geist-button.launcher{width:48px;height:48px;padding:6px;border-radius:50%;background:var(--ground);transform-origin:bottom right}
    .launcher img{display:block;width:34px;height:34px;object-fit:contain;user-select:none;-webkit-user-drag:none;pointer-events:none}
    .geist-button.launcher{touch-action:none;cursor:grab}.geist-button.launcher:active{cursor:grabbing}
    .geist-button.launcher[data-count]{position:relative;overflow:visible}
    .geist-button.launcher[data-count]::after{content:attr(data-count);position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;
      display:grid;place-items:center;background:var(--color-status-blue-background);color:var(--color-status-blue-text);font:var(--board-caption-semibold);box-shadow:0 0 0 2px var(--ground);pointer-events:none}
    .geist-button.launcher[data-count-tone=ended]::after{background:var(--color-status-lime-background);color:var(--color-status-lime-text)}
    .shared-note{margin:8px 0 0}.shared-foot{display:flex;justify-content:flex-end;gap:16px;margin-top:8px}.shared-foot:not(:has(>:not([hidden]))){display:none}
    .performer-follow{display:grid;gap:8px;min-width:0}.performer-head{display:flex;align-items:center;gap:8px;min-width:0}
    .performer-head strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:var(--board-body-medium)}
    .shared-tasks{min-width:0}.shared-heading,.shared-action{display:flex;align-items:center;gap:4px;width:fit-content;margin:0;padding:0;border:0;background:transparent;
      font:var(--board-caption-semibold);color:var(--muted);cursor:pointer}.shared-heading:hover,.shared-action:hover{color:var(--ink)}.shared-action:disabled{opacity:.5;cursor:default}
    .shared-heading:focus-visible,.shared-action:focus-visible{outline:2px solid var(--tungsten);outline-offset:2px;border-radius:4px}
    .shared-fold{width:14px;height:14px;flex:none;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .15s ease}
    .shared-heading[aria-expanded=false] .shared-fold{transform:rotate(-90deg)}
    /* 折叠沿用 Peach Collapse（frontend/src/ui-kit/collapse.css）：过渡时裁边，展开停稳后摘掉，行的悬停底色才不被切。 */
    .shared-body{position:relative;display:flow-root;overflow:hidden;transition:height .2s ease-in-out}.shared-body.fold-settled{overflow:visible}
    .shared-list{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:4px;max-height:172px;overflow:auto;overscroll-behavior:contain;scrollbar-width:none}
    /* 滚动条用 Peach 的悬浮轨道（overlayScrollbar）；能滚动时右侧留出轨道位置，不压住行尾的关闭键。 */
    .shared-list::-webkit-scrollbar{display:none}.shared-list[data-overflowing]{padding-right:12px}
    .shared-list li{min-width:0}.shared-row{display:flex;align-items:center;gap:8px;width:calc(100% + 16px);min-width:0;min-height:32px;margin:0 -8px;padding:4px 8px;border:0;border-radius:6px;
      background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background-color .15s ease}.shared-row:hover{background:var(--surface)}
    .shared-row:focus-visible{outline:2px solid var(--tungsten);outline-offset:-2px}
    .shared-item{display:flex;align-items:center;gap:4px}.shared-item .shared-row{flex:1;width:auto;margin-right:0}
    .shared-item .geist-button.icon{width:28px;height:28px;color:var(--muted)}.shared-item .geist-button.icon:hover{color:var(--ink)}
    .shared-code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:var(--board-body-medium)}
    .shared-chevron{width:16px;height:16px;flex:none;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;color:var(--muted)}
    .task-page .bar strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .panel.draggable{cursor:grab}:host([data-dragging]) .panel{cursor:grabbing;user-select:none}
    .body{padding:0 20px 20px;display:grid;gap:16px;min-width:0}.footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-height:var(--fieldset-bar-h);padding:8px 16px;border-top:1px solid var(--line);background:var(--surface)}
    .geist-button{height:var(--control-h);padding:8px 12px;border:1px solid var(--color-border-button-default);border-radius:var(--control-radius);background:var(--color-background-primary-default);color:var(--ink);display:inline-flex;
      align-items:center;justify-content:center;gap:4px;font:var(--board-body-medium);white-space:nowrap;cursor:pointer;box-shadow:var(--elevation-xs);touch-action:manipulation;transition:background-color .15s ease,border-color .15s ease,color .15s ease}
    .geist-button.primary{position:relative;isolation:isolate;background:var(--board-blue);border:0;color:var(--color-text-white)}
    .geist-button.primary::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;background:var(--board-blue-hover);opacity:0;transition:opacity .15s ease}
    .geist-button.icon{padding:0;width:var(--control-h);flex:none;border:0;background:transparent;box-shadow:none}
    .geist-button svg{width:16px;height:16px;flex:none;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .geist-button:focus-visible{outline:2px solid var(--tungsten);outline-offset:2px}
    @media(hover:hover) and (pointer:fine){.geist-button:not(:disabled,[aria-disabled=true]):hover{background-color:var(--color-background-primary-hover);border-color:var(--color-border-button-hover)}
      .geist-button.primary:not(:disabled,[aria-disabled=true]):hover::before{opacity:1}}
    .geist-button.primary:not(:disabled,[aria-disabled=true]):active{background:var(--board-blue-active)}.geist-button.primary:not(:disabled,[aria-disabled=true]):active::before{opacity:0}
    .geist-button:disabled,.geist-button[aria-disabled=true]{background:var(--surface);color:var(--color-text-tertiary);box-shadow:none;cursor:default;transition:none}
    .geist-button:disabled::before,.geist-button[aria-disabled=true]::before{display:none}
    .geist-button[aria-busy=true]:not(:disabled){cursor:wait}.ui-geist-spinner{position:relative;display:inline-block;flex:none;width:16px;height:16px;color:currentColor}
    .ui-geist-spinner>i{position:absolute;top:1px;left:7px;width:2px;height:4px;border-radius:999px;background:currentColor;transform-origin:1px 7px;transform:rotate(var(--spinner-angle));animation:geist-spinner-opacity 1s linear var(--spinner-delay) infinite}
    @keyframes geist-spinner-opacity{0%{opacity:1}100%{opacity:.15}}
    .geist-input{width:100%;min-width:0;height:var(--control-h);border:1px solid var(--color-border-button-default);border-radius:var(--control-radius);
      background:var(--color-background-tertiary-default);color:var(--ink);padding:0 12px;font:var(--board-body);transition:background-color .15s ease,box-shadow .15s ease}
    .geist-input::placeholder{color:var(--color-text-tertiary)}.geist-input:hover{box-shadow:inset 0 0 0 2px var(--color-border-button-hover)}
    .geist-input:focus{outline:0;box-shadow:inset 0 0 0 2px var(--color-border-button-active)}.geist-input[aria-invalid=true]{border-color:var(--drop)}
    .field{display:grid;gap:4px;min-width:0}.field label{font:var(--board-body-medium)}.hint{font:var(--board-caption);color:var(--muted);overflow-wrap:anywhere}
    .secret{display:flex;align-items:center;gap:8px}.secret .geist-button{flex:none}
    fieldset.display-scope{margin:0;padding:0;border:0;display:grid;gap:8px;min-width:0}
    .display-scope legend{font:var(--board-body-medium);margin-bottom:8px}.display-scope label{display:flex;align-items:center;gap:8px;cursor:pointer}
    .display-scope input{accent-color:var(--color-accent-500);width:16px;height:16px;margin:0;flex:none}
    .batch-frame{position:relative;min-width:0}
    .batch-list{position:relative;border:1px solid var(--line);border-radius:var(--control-radius);overflow:auto;overscroll-behavior:contain;
      max-height:min(480px,calc(100dvh - 320px));min-height:97px;scrollbar-width:none;background:var(--color-background-primary-default)}
    .batch-list::-webkit-scrollbar{display:none}
    .ovtrack{position:absolute;z-index:2;pointer-events:none}.ovtrack[hidden]{display:none}
    @media (pointer:fine){.ovtrack{pointer-events:auto}}
    .ovtrack.ov-y{right:0;top:8px;bottom:8px;width:12px}
    .ovthumb{position:absolute;border-radius:var(--pill-radius);background:var(--field-ring-hover);cursor:default;transition:width .15s cubic-bezier(.4,0,.2,1)}
    .ov-y .ovthumb{right:0;top:0;width:3px}.ov-y:hover .ovthumb,.ov-y.dragging .ovthumb{width:6px}
    .ui-ov-edges{position:absolute;pointer-events:none;z-index:1;overflow:hidden;border-radius:0 0 calc(var(--control-radius) - 1px) calc(var(--control-radius) - 1px)}.ui-ov-edges[hidden]{display:none}
    .ui-ov-edges>span{position:absolute;left:0;right:0;height:16px;visibility:hidden;backdrop-filter:blur(2px)}
    .ui-ov-edge-top{top:0;mask-image:linear-gradient(#000,transparent)}.ui-ov-edge-bottom{bottom:0;mask-image:linear-gradient(transparent,#000)}
    .ui-ov-edges.ui-can-scroll-top>.ui-ov-edge-top,.ui-ov-edges.ui-can-scroll-bottom>.ui-ov-edge-bottom{visibility:visible}
    .batch-list thead th{position:sticky;top:0;z-index:1;border-bottom:0;box-shadow:inset 0 -1px 0 var(--line)}
    .bui-table{width:100%;border-collapse:collapse;text-align:left;table-layout:fixed}.bui-table col:first-child{width:40px}.bui-table col:last-child{width:108px}
    .bui-table th,.bui-table td{height:48px;padding:10px 12px;vertical-align:middle;font:var(--board-body-medium);white-space:nowrap;text-align:left}
    .bui-table th{color:var(--ink);background:var(--surface);border-bottom:1px solid var(--line)}.bui-table td{color:var(--ink)}
    .bui-table .batch-row:not(:last-child){border-bottom:1px solid var(--line)}.batch-row{height:48px;cursor:pointer;transition:background-color .15s ease}
    @media(hover:hover) and (pointer:fine){.batch-row:not([aria-disabled=true]):hover{background:var(--color-background-primary-hover)}}
    .batch-row[data-board-selected]{background:var(--surface)}.batch-row[aria-disabled=true]{cursor:default}
    .ui-pcheck{position:relative;display:grid;place-items:center;width:20px;height:20px;flex:none;cursor:pointer}
    .ui-pcheck input{position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;cursor:inherit}
    .ui-pcheck>span{position:relative;display:grid;place-items:center;width:16px;height:16px;border:1px solid var(--color-border-checkbox-default);border-radius:4px;background:var(--color-background-primary-default);box-shadow:var(--elevation-xs);pointer-events:none;transition:background .15s,border-color .15s,box-shadow .15s}
    .ui-pcheck>span svg{display:block;width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;visibility:hidden}
    .ui-pcheck input:is(:checked,:indeterminate)+span{border-color:transparent;background:var(--board-blue);box-shadow:inset 0 1px 0 #ffffff40,0 1px 2px #0450e229}
    .ui-pcheck input:checked+span svg{visibility:visible}.ui-pcheck input:indeterminate+span svg{visibility:hidden}
    .ui-pcheck input:indeterminate+span::after{content:'';position:absolute;top:6px;left:3px;width:8px;height:2px;border-radius:1px;background:#fff}
    .ui-pcheck input:focus-visible+span{outline:2px solid var(--tungsten);outline-offset:2px}.ui-pcheck:has(input:disabled){cursor:default}.ui-pcheck input:disabled+span{opacity:.5}
    @media(hover:hover) and (pointer:fine){.ui-pcheck:hover input:not(:disabled)+span{border-color:var(--color-border-checkbox-hover)}.ui-pcheck:hover input:is(:checked,:indeterminate):not(:disabled)+span{border-color:transparent;background:var(--board-blue-hover)}}
    .batch-row-main{display:flex;align-items:center;gap:8px;min-width:0;flex:1;container:identity/inline-size}
    /* 叠放头像沿用 Peach 作品卡 .mavstack（web/css/12-cards.css、25-motion.css），按 24px 头像等比换算：
       常态步长 10px，指到的一枚抬起放大，右侧邻座逐枚让开；窄单元格只留两枚，与播放队列的窄场景一致。 */
    .batch-people{--ring:var(--row-bg,var(--ground));--lift-motion:calc(var(--spring-press-ms) * 1ms) var(--spring-press)}
    .batch-people:has(:hover){--lift-motion:var(--board-motion)}
    .batch-people>.batch-person{box-shadow:0 0 0 2px var(--ring);transform:translate(var(--lift-x,0),var(--lift-y,0)) scale(var(--lift-scale,1));transition:transform var(--lift-motion)}
    .batch-people>.batch-person+.batch-person{margin-left:-14px}
    .batch-people>.batch-person:nth-child(1){z-index:5}.batch-people>.batch-person:nth-child(2){z-index:4}.batch-people>.batch-person:nth-child(3){z-index:3}
    .batch-people>.batch-person:nth-child(4){z-index:2}.batch-people>.batch-person:nth-child(5){z-index:1}
    .batch-people:has(>.batch-person:nth-child(2))>.batch-person:hover{z-index:6;--lift-y:-2.5px;--lift-scale:1.05}
    .batch-people>.batch-person:hover+.batch-person{--lift-y:-1.1px;--lift-x:6px}
    .batch-people>.batch-person:hover+.batch-person+.batch-person{--lift-y:-.5px;--lift-x:12px}
    .batch-people>.batch-person:hover+.batch-person+.batch-person+.batch-person{--lift-x:18px}
    .batch-people>.batch-person:hover+.batch-person+.batch-person+.batch-person+.batch-person{--lift-x:24px}
    @container identity (max-width:179px){.batch-people>.batch-person:nth-child(n+3){display:none}.batch-row-code{--cap:2}}
    /* 头像右侧紧跟番号：展开时番号随最后一枚头像同步右移，距离为 6px ×（显示枚数 − 指到的序号）。 */
    :is(.batch-row-code,.bar-title>strong){transition:transform calc(var(--spring-press-ms) * 1ms) var(--spring-press)}
    :is(.batch-row-main,.bar-title):has(.batch-person:hover) :is(.batch-row-code,.bar-title>strong){transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.3s;transform:translateX(calc(6px * (min(var(--count,1),var(--cap,5)) - var(--hovered,1))))}
    :is(.batch-row-main,.bar-title):has(>.batch-people>.batch-person:nth-child(2)) :is(.batch-row-code,.bar-title>strong){--count:2}
    :is(.batch-row-main,.bar-title):has(>.batch-people>.batch-person:nth-child(3)) :is(.batch-row-code,.bar-title>strong){--count:3}
    :is(.batch-row-main,.bar-title):has(>.batch-people>.batch-person:nth-child(4)) :is(.batch-row-code,.bar-title>strong){--count:4}
    :is(.batch-row-main,.bar-title):has(>.batch-people>.batch-person:nth-child(5)) :is(.batch-row-code,.bar-title>strong){--count:5}
    :is(.batch-row-main,.bar-title):has(>.batch-people>.batch-person:nth-child(1):hover) :is(.batch-row-code,.bar-title>strong){--hovered:1}
    :is(.batch-row-main,.bar-title):has(>.batch-people>.batch-person:nth-child(2):hover) :is(.batch-row-code,.bar-title>strong){--hovered:2}
    :is(.batch-row-main,.bar-title):has(>.batch-people>.batch-person:nth-child(3):hover) :is(.batch-row-code,.bar-title>strong){--hovered:3}
    :is(.batch-row-main,.bar-title):has(>.batch-people>.batch-person:nth-child(4):hover) :is(.batch-row-code,.bar-title>strong){--hovered:4}
    :is(.batch-row-main,.bar-title):has(>.batch-people>.batch-person:nth-child(5):hover) :is(.batch-row-code,.bar-title>strong){--hovered:5}
    .batch-row{--row-bg:var(--color-background-primary-default)}.batch-row[data-board-selected]{--row-bg:var(--surface)}
    @media(hover:hover) and (pointer:fine){.batch-row:not([aria-disabled=true]):hover{--row-bg:var(--color-background-primary-hover)}}.batch-row-code{font:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.batch-row-status{min-width:0}
    .batch-footer{flex-wrap:nowrap;gap:8px}.batch-footer .geist-button.icon{padding:0;border:1px solid var(--color-border-button-default);background:var(--color-background-primary-default);box-shadow:var(--elevation-xs)}
    .batch-footer [data-spinning] svg{animation:peach-jav-spin .7s linear infinite}@keyframes peach-jav-spin{to{transform:rotate(1turn)}}
    .batch-footer .geist-button.primary:disabled{border:1px solid var(--color-border-button-default);background:var(--color-background-primary-default)}
    .chip{display:inline-flex;align-items:center;justify-content:center;border-radius:6px;padding:2px 6px;font:var(--board-body-medium);white-space:nowrap}
    .chip[data-chip=plain]{color:var(--color-text-secondary)}
    .chip[data-chip=soft]{background:var(--color-background-secondary-default);color:var(--color-text-secondary)}
    .chip[data-chip=lime]{background:var(--color-status-lime-background);color:var(--color-status-lime-text)}
    .chip[data-chip=yellow]{background:var(--color-status-yellow-background);color:var(--color-status-yellow-text)}
    .chip[data-chip=rose]{background:var(--color-status-rose-background);color:var(--color-status-rose-text)}
    .chip[data-chip=blue]{background:var(--color-status-blue-background);color:var(--color-status-blue-text)}
    .batch-people{display:flex;align-items:center;gap:0;flex:none;min-width:24px;isolation:isolate}.batch-person{position:relative;display:grid;place-items:center;width:24px;height:24px;flex:none;border-radius:50%;overflow:hidden;background:var(--color-avatar-neutral-background);color:var(--color-text-primary);font:var(--board-caption-semibold)}.batch-person img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .batch-person>svg{width:16px;height:16px;fill:currentColor}
    .batch-empty{font:var(--board-body);color:var(--muted)}
    .geist-note{font:var(--board-body);color:var(--ink-2);overflow-wrap:anywhere}
    .geist-note[data-variant=error]{color:var(--drop)}
    .update-section{display:grid;gap:8px;min-width:0;border-top:1px solid var(--line);padding-top:12px}
    .update-actions{display:flex;flex-wrap:wrap;gap:8px}.update-actions a{text-decoration:none}
    .update-actions .geist-button{height:32px;padding-inline:10px}
    [data-update-kind=script],[data-update-kind=install],[data-update-kind=refresh]{--update-foreground:var(--update-script-foreground)}
    [data-update-kind=peach]{--update-foreground:var(--update-peach-foreground)}
    .geist-note[data-update-kind]:not([data-update-kind=current]){color:var(--update-foreground)}
    .geist-button[data-update-kind]{color:var(--update-foreground);border-color:color-mix(in srgb,var(--update-foreground) 35%,var(--line));background:color-mix(in srgb,var(--update-foreground) 10%,var(--ground));box-shadow:none}
    @media(hover:hover) and (pointer:fine){.geist-button[data-update-kind]:hover{color:var(--update-foreground);border-color:var(--update-foreground);background:color-mix(in srgb,var(--update-foreground) 18%,var(--ground))}}
    dialog{position:fixed;inset:auto var(--panel-right,max(16px,env(safe-area-inset-right))) var(--panel-bottom,max(16px,env(safe-area-inset-bottom))) auto;margin:0;
      width:min(400px,calc(100% - 32px));max-width:calc(100% - 32px);max-height:calc(100dvh - 32px);padding:0;
      background:var(--ground);color:var(--ink);border:1px solid var(--line);border-radius:var(--floating-radius);overflow:hidden;box-shadow:var(--elevation-dropdown);
      transform-origin:bottom right}
    /* 子页进出场与 Peach 设置面板同一对关键帧，遮罩取设置面板的 settings-backdrop。
       进场用 backwards：终点就是自然状态，不留一个 filter:blur(0)。
       data-switch：从另一个子页直接换过来，遮罩一直在，不再从 0 淡入。 */
    dialog::backdrop{background:#000b}
    dialog[open]{animation:board-dialog-in var(--board-dialog-motion) backwards}
    dialog[open]:not([data-switch])::backdrop{animation:settings-backdrop-in .35s cubic-bezier(.4,0,.2,1) both}
    dialog[open][data-closing]{animation:board-dialog-out var(--board-dialog-motion) both}
    dialog[open][data-closing]::backdrop{animation:settings-backdrop-out .35s cubic-bezier(.4,0,.2,1) both}
    form{display:flex;flex-direction:column;max-height:calc(100dvh - 34px);margin:0}dialog>form,dialog>div{position:relative}
    dialog .bar{border-bottom:1px solid var(--line);flex:none}dialog .body{padding-top:20px;overflow:auto;overscroll-behavior:contain;scrollbar-width:none}dialog .body::-webkit-scrollbar{display:none}dialog .footer{flex:none}
    @media(max-width:760px){.geist-input{font-size:var(--fs-lg)}}
    @media(prefers-reduced-motion:reduce){:host,*,*::before,*::after{animation:none!important;transition:none!important}}
  `;

  function element(tag, className = '', text = '') {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  // Peach 任务列表的 Remix Icon 4.9.0 图形；Copyright (c) 2017–2026 Remix Design。
  // 图形遵循 Remix Icon License v1.0：https://github.com/Remix-Design/RemixIcon/blob/master/License。
  const STEP_ICON_PATHS = {
    check: 'M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z',
    circle: 'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z',
    error: 'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z',
    skipped: 'M5 11V13H19V11H5Z',
  };

  const STAGE_ICON_PATHS = [
    'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM13 12H17V14H11V7H13V12Z',
    'M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z',
    'M13 10H18L12 16L6 10H11V3H13V10ZM4 19H20V12H22V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V12H4V19Z',
    'M20 3L22 7V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V7.00353L4 3H20ZM20 9H4V19H20V9ZM13 10V14H16L12 18L8 14H11V10H13ZM18.7639 5H5.23656L4.23744 7H19.7639L18.7639 5Z',
    'M21 3C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM11 13H4V19H11V13ZM20 13H13V19H20V13ZM11 5H4V11H11V5ZM20 5H13V11H20V5Z',
  ];

  function stepMark(index = 0) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', STAGE_ICON_PATHS[index]);
    svg.append(path);
    return svg;
  }

  function control(label, { primary = false, icon = '' } = {}) {
    const node = element('button', `geist-button${primary ? ' primary' : ''}${icon ? ' icon' : ''}`, icon ? '' : label);
    node.type = 'button';
    if (icon) {
      node.setAttribute('aria-label', label);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(svg.namespaceURI, 'path');
      path.setAttribute('d', icon === 'close' ? 'M6 6l12 12M6 18L18 6' : icon === 'collapse' ? 'm6 9 6 6 6-6' : icon === 'refresh' ? 'M5.46257 4.43262C7.21556 2.91688 9.5007 2 12 2C17.5228 2 22 6.47715 22 12C22 14.1361 21.3302 16.1158 20.1892 17.7406L17 12H20C20 7.58172 16.4183 4 12 4C9.84982 4 7.89777 4.84827 6.46023 6.22842L5.46257 4.43262ZM18.5374 19.5674C16.7844 21.0831 14.4993 22 12 22C6.47715 22 2 17.5228 2 12C2 9.86386 2.66979 7.88416 3.8108 6.25944L7 12H4C4 16.4183 7.58172 20 12 20C14.1502 20 16.1022 19.1517 17.5398 17.7716L18.5374 19.5674Z'
        : 'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915');
      svg.append(path);
      if (icon === 'back') path.setAttribute('d','M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3638L11.7782 19.778L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z');
      if (icon === 'back') { svg.style.fill='currentColor'; svg.style.stroke='none'; }
      if (icon === 'refresh') { svg.style.fill='currentColor'; svg.style.stroke='none'; }
      if (icon === 'collapse') svg.setAttribute('data-collapse-chevron', '');
      if (icon === 'settings') {
        const circle = document.createElementNS(svg.namespaceURI, 'circle');
        for (const [name, value] of Object.entries({ cx: '12', cy: '12', r: '3' })) circle.setAttribute(name, value);
        svg.append(circle);
      }
      node.append(svg);
    }
    return node;
  }

  function appearance() {
    try {
      const value = JSON.parse(GM_getValue(STORAGE_APPEARANCE, '{}'));
      if (value.base !== configuration()?.base || !['system', 'light', 'dark'].includes(value.theme)
          || typeof value.accent !== 'string' || value.accent.length > 40 || !value.colors
          || ![400, 500, 600, 700].every(step => typeof value.colors[step] === 'string'
            && value.colors[step].length <= 100 && CSS.supports('color', value.colors[step]))) return null;
      return value;
    } catch { return null; }
  }

  function watchPeachAppearance() {
    const publish = () => {
      if (configuration()?.base !== location.origin) return;
      try {
        const settings = JSON.parse(localStorage.getItem('peach.settings.v1') || '{}');
        const theme = ['system', 'light', 'dark'].includes(settings.theme) ? settings.theme : 'system';
        const style = getComputedStyle(document.documentElement);
        const colors = Object.fromEntries([400, 500, 600, 700].map(step => [step, style.getPropertyValue(`--color-accent-${step}`).trim()]));
        if (!Object.values(colors).every(value => value && value.length <= 100 && CSS.supports('color', value))) return;
        const snapshot = JSON.stringify({base:location.origin, theme, accent:String(settings.accent || 'blue').slice(0, 40), colors});
        if (snapshot !== GM_getValue(STORAGE_APPEARANCE, '')) GM_setValue(STORAGE_APPEARANCE, snapshot);
      } catch { /* 页面偏好未取得时保留上次同步的外观。 */ }
    };
    new MutationObserver(publish).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme','data-accent','class','style']});
    addEventListener('storage', event => { if (event.key === 'peach.settings.v1') publish(); });
    addEventListener('load', publish, {once:true});
    publish();
  }

  function applyAppearance(root) {
    const value = appearance();
    root.toggleAttribute('data-peach-appearance', Boolean(value));
    if (value && value.theme !== 'system') root.dataset.theme = value.theme; else delete root.dataset.theme;
    for (const step of [400, 500, 600, 700]) {
      if (value) root.style.setProperty(`--color-accent-${step}`, value.colors[step]);
      else root.style.removeProperty(`--color-accent-${step}`);
    }
  }

  function savedPosition() {
    try {
      const value = JSON.parse(GM_getValue(STORAGE_POSITION, '{}'));
      return value.version === 1 && ['right','bottom'].every(key => typeof value[key] === 'number'
        && Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 1) ? value : null;
    } catch { return null; }
  }

  function placeSurface(root) {
    const value = savedPosition();
    if (!value) return;
    const viewportWidth=document.documentElement.clientWidth;
    const width = root.id === 'peach-jav-settings' || root.id === 'peach-jav-batch' ? Math.min(400, viewportWidth - 32)
      : root.dataset.panelMode === 'minimized' ? 48 : Math.min(320, viewportWidth - 32);
    const dialog = (root.shadowRoot || root).querySelector('dialog[open]');
    const height = Math.min((dialog || root).getBoundingClientRect().height || 48, innerHeight - 32);
    const right = Math.max(16, Math.min(16 + value.right * Math.max(0, viewportWidth - 80), viewportWidth - width - 16));
    const bottom = Math.max(16, Math.min(16 + value.bottom * Math.max(0, innerHeight - 80), innerHeight - height - 16));
    root.style.right = `${right}px`; root.style.bottom = `${bottom}px`;
    root.style.setProperty('--panel-right', `${right}px`); root.style.setProperty('--panel-bottom', `${bottom}px`);
  }

  // 收成图标时拖图标；展开或折叠时按住面板空白处拖，按钮、链接与表单控件照常点击。
  const DRAG_EXEMPT = 'button,a,input,select,textarea,label,summary,[role=button],[contenteditable],.ov-y';

  function wireDrag(root, launcher, panel) {
    let drag = null, suppressClickUntil = 0;
    const begin = (handle, event) => {
      const box = root.getBoundingClientRect();
      drag = {handle, id:event.pointerId, x:event.clientX, y:event.clientY, width:box.width, height:box.height,
        right:document.documentElement.clientWidth-box.right, bottom:innerHeight-box.bottom, moved:false};
      handle.setPointerCapture(event.pointerId);
    };
    launcher.addEventListener('pointerdown', event => {
      if (event.button !== 0 || root.dataset.panelMode !== 'minimized') return;
      event.preventDefault(); launcher.focus({preventScroll:true});
      begin(launcher, event);
    });
    panel.classList.add('draggable');
    panel.addEventListener('pointerdown', event => {
      if (event.button !== 0 || root.dataset.panelMode === 'minimized' || event.target.closest?.(DRAG_EXEMPT)) return;
      begin(panel, event);
    });
    const move = event => {
      if (!drag || event.pointerId !== drag.id) return;
      const x = event.clientX-drag.x, y = event.clientY-drag.y;
      if (!drag.moved && Math.hypot(x, y) < 4) return;
      if (!drag.moved) { root.setAttribute('data-dragging', ''); document.getSelection()?.removeAllRanges(); }
      drag.moved = true;
      root.style.right = `${Math.max(16, Math.min(document.documentElement.clientWidth-drag.width-16, drag.right-x))}px`;
      root.style.bottom = `${Math.max(16, Math.min(innerHeight-drag.height-16, drag.bottom-y))}px`;
    };
    const finish = event => {
      if (!drag || event.pointerId !== drag.id) return;
      if (drag.moved && event.type === 'pointerup') {
        const box = root.getBoundingClientRect();
        GM_setValue(STORAGE_POSITION, JSON.stringify({version:1,
          right:Math.max(0, Math.min(1, (document.documentElement.clientWidth-box.right-16)/Math.max(1, document.documentElement.clientWidth-80))),
          bottom:Math.max(0, Math.min(1, (innerHeight-box.bottom-16)/Math.max(1, innerHeight-80)))}));
        suppressClickUntil = performance.now()+250;
      }
      if (drag.handle.hasPointerCapture(event.pointerId)) drag.handle.releasePointerCapture(event.pointerId);
      root.removeAttribute('data-dragging');
      drag = null; placeSurface(root);
    };
    for (const handle of [launcher, panel]) {
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', finish);
      handle.addEventListener('pointercancel', finish);
      handle.addEventListener('click', event => {
        if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
      }, true);
    }
  }

  function tableCheckbox(label) {
    const wrapper=element('label','ui-pcheck');wrapper.title=label;
    const input=element('input');input.type='checkbox';input.setAttribute('aria-label',label);
    const glyph=element('span');glyph.setAttribute('aria-hidden','true');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 16 16');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M4 7.7002L6.64645 10.3466C6.84171 10.5419 7.15829 10.5419 7.35355 10.3466L12 5.7002');
    svg.append(path);glyph.append(svg);wrapper.append(input,glyph);
    return {wrapper,input};
  }

  function defaultPersonAvatar() {
    const avatar=element('span','batch-person');avatar.title='默认头像';avatar.setAttribute('role','img');avatar.setAttribute('aria-label','默认头像');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('d','M4 22C4 17.5817 7.58172 14 12 14C16.4183 14 20 17.5817 20 22H18C18 18.6863 15.3137 16 12 16C8.68629 16 6 18.6863 6 22H4ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z');
    svg.append(path);avatar.append(svg);return avatar;
  }

  let motionId = 0;
  // loading-dev 0.3.6 的原生 DOM 适配；固定源码与 MIT 许可见 assets/loading-dev-source.json。
  function stageAnimation(index) {
    const node = element('span');
    node.dataset.stageAnimation = ['clock','radar','linear-dots','gather','blocks'][index];
    node.setAttribute('aria-hidden', 'true');
    if (index === 0) node.innerHTML = '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="currentColor" opacity=".1"/><path class="stage-spin" fill="currentColor" d="M11.1937 2.92061C10.5206 2.49739 9.77304 2.21397 8.9954 2.08314C8.45076 1.99151 8 2.44772 8 3V7.20324C8 7.49211 8.12492 7.76686 8.34259 7.95677L11.8999 11.0603C12.3287 11.4344 12.9913 11.378 13.2643 10.8787C13.6356 10.1998 13.8736 9.45248 13.9617 8.67713C14.0892 7.55433 13.8971 6.41834 13.4074 5.39993C12.9177 4.38152 12.1503 3.5221 11.1937 2.92061Z"/></svg>';
    else if (index === 1) {
      const id = `peach-radar-${++motionId}`;
      node.className = 'stage-radar';
      node.innerHTML = `<svg viewBox="0 0 16 16" fill="none"><defs><radialGradient id="${id}" cx="8" cy="8" r="8" gradientUnits="userSpaceOnUse"><stop offset=".3334" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs><circle cx="8" cy="8" r="8" fill="currentColor" opacity=".2"/><circle cx="8" cy="8" r="5.5" stroke="currentColor" opacity=".2"/><path class="stage-spin" fill="url(#${id})" d="M8 0C9.50657 0 10.9824 0.425672 12.2578 1.22754C13.5333 2.02953 14.557 3.17533 15.21 4.5332C15.8629 5.89107 16.1193 7.40626 15.9492 8.90332C15.7791 10.4001 15.1896 11.8184 14.249 12.9951L10.4707 9.69922C10.8037 9.21598 11 8.63123 11 8C11 6.34315 9.65685 5 8 5V0Z"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>`;
    } else {
      node.className = ['','','stage-linear','stage-gather','stage-blocks'][index];
      const count = index === 2 ? 3 : index === 3 ? 4 : 9;
      for (let n=0; n<count; n++) {
        const part = element('i');
        part.style.setProperty('--ld-step', String(index === 4 ? n%3+Math.floor(n/3) : n));
        if (index === 3) { part.style.setProperty('--ld-x', String(n%2 ? -1 : 1)); part.style.setProperty('--ld-y', String(n<2 ? 1 : -1)); }
        node.append(part);
      }
    }
    return node;
  }

  function surface(id, label) {
    const root = element('aside');
    root.id = id;
    root.setAttribute('aria-label', label);
    const shadow = root.attachShadow({ mode: 'open' });
    shadow.append(element('style', '', UI_STYLE));
    document.body.append(root);
    surfaces.add(root); applyAppearance(root); placeSurface(root);
    return { root, shadow };
  }

  function showNotice(message) {
    document.getElementById('peach-jav-notice')?.remove();
    const { root, shadow } = surface('peach-jav-notice', 'Peach 提示');
    const panel = element('section', 'panel');
    const bar = element('div', 'bar');
    const dismiss = control('关闭 Peach 提示', { icon: 'close' });
    dismiss.addEventListener('click', () => root.remove());
    bar.append(element('strong', '', 'Peach'), dismiss);
    const body = element('div', 'body');
    const note = element('p', 'geist-note');
    note.setAttribute('role', 'status');
    body.append(note);
    panel.append(bar, body);
    shadow.append(panel);
    note.textContent = message;
  }

  // 只做粗提取；合法番号由 Peach 校验。separated 用于整页文本：与 Peach 的 is_jav_code 一致，
  // 只收原文带连字符的厂牌与素人番号，用户名、导航、域名里的「字母+数字」不补分隔符。
  // 评论署名也会写成带连字符的形状（mgstage 的「qwert-02さんのレビュー」），后面紧跟敬称的不算番号。
  function candidates(value, maxLength = 800, separated = false) {
    const found = new Set();
    const bounded = String(value || '').slice(0, maxLength).toUpperCase();
    let rest = bounded.replace(/\bFC2(?:[-_ ]?PPV)?[-_ ]?(\d{4,9})\b/g, (_, digits) => {
      found.add(`FC2-PPV-${digits}`);
      return ' ';
    });
    rest = rest.replace(/\b([NK])(\d{4})\b/g, (_, prefix, digits) => {
      found.add(prefix.toLowerCase() + digits);
      return ' ';
    });
    rest = rest.replace(/\b(MKB?D)-S(\d{2,4})(?=$|[^A-Z0-9])/g, (_, prefix, digits) => {
      found.add(`${prefix}-S${digits}`);
      return ' ';
    });
    const shape = separated ? /\b((?:\d{3})?[A-Z]{2,8})-(\d{2,5})([A-Z]{0,2})(?=$|[^A-Z0-9])(?!\s*(?:さん|さま|様|氏|くん|君|ちゃん))/g
      : /\b((?:\d{1,5})?[A-Z]{2,12})[-_]?(\d{1,8})([A-Z]{0,2})(?=$|[^A-Z0-9])/g;
    for (const match of rest.matchAll(shape)) found.add(`${match[1]}-${match[2]}${match[3]}`);
    for (const match of rest.matchAll(/\b\d{6}[-_]\d{2,4}\b/g)) found.add(match[0]);
    return found;
  }

  // 纵向覆盖滚动条：沿用 Peach `ui-kit/overlay-scrollbar.ts` 的轨道、滑块、边缘渐隐与拖动规则；
  // 吸顶表头不参与滚动，轨道与上边缘渐隐从表头下沿算起。
  function overlayScrollbar(container, { square = false } = {}) {
    const host = container.parentElement;
    const edges = element('div', 'ui-ov-edges'); edges.hidden = true; edges.setAttribute('aria-hidden', 'true');
    // 表格框底部是圆角；弹窗主体上下接标题栏和底栏，渐隐不带圆角。
    if (square) edges.style.borderRadius = '0';
    edges.append(element('span', 'ui-ov-edge-top'), element('span', 'ui-ov-edge-bottom'));
    const track = element('div', 'ovtrack ov-y'); track.hidden = true; track.setAttribute('aria-hidden', 'true');
    const thumb = element('div', 'ovthumb'); track.append(thumb); host.append(edges, track);
    let range = 0, travel = 0, frame = null;
    const paint = () => {
      const top = container.scrollTop, above = range > 1 && top > 1, below = range > 1 && top < range - 1;
      edges.hidden = !above && !below;
      edges.classList.toggle('ui-can-scroll-top', above); edges.classList.toggle('ui-can-scroll-bottom', below);
      if (range > 1) thumb.style.transform = `translateY(${travel > 0 ? Math.max(0, Math.min(1, top / range)) * travel : 0}px)`;
    };
    const sync = () => {
      const head = container.querySelector(':scope>table>thead')?.offsetHeight ?? 0;
      const left = container.offsetLeft, top = container.offsetTop + container.clientTop + head, width = container.clientWidth;
      const height = container.clientHeight - head, content = container.scrollHeight - head;
      range = content - height; travel = 0;
      container.toggleAttribute('data-overflowing', range > 1);
      Object.assign(edges.style, {left:`${left + container.clientLeft}px`, top:`${top}px`, width:`${width}px`, height:`${height}px`});
      if (range <= 1) { track.hidden = true; paint(); return; }
      track.hidden = false;
      const trackSize = Math.max(0, height - 16);
      Object.assign(track.style, {top:`${top + 8}px`, height:`${trackSize}px`,
        right:`${host.clientWidth - left - container.clientLeft - width}px`});
      // 内容很长时滑块保留 24px 下限，保证仍可拖动。
      const thumbSize = Math.min(trackSize, Math.max(24, height / content * trackSize));
      travel = trackSize - thumbSize; thumb.style.height = `${thumbSize}px`; paint();
    };
    container.addEventListener('scroll', () => { if (frame === null) frame = requestAnimationFrame(() => { frame = null; paint(); }); }, {passive:true});
    const resize = new ResizeObserver(sync); resize.observe(container);
    new MutationObserver(() => { for (const child of container.children) resize.observe(child); requestAnimationFrame(sync); })
      .observe(container, {childList:true, subtree:true});
    track.addEventListener('pointerdown', event => {
      const trackRect = track.getBoundingClientRect(), thumbRect = thumb.getBoundingClientRect();
      const distance = trackRect.height - thumbRect.height, scrollRange = container.scrollHeight - container.clientHeight;
      if (distance <= 0 || scrollRange <= 0) return;
      // 按在滑块上保持按住的那一点，按在轨道空白处则把滑块中心挪过来。
      const grab = event.clientY >= thumbRect.top && event.clientY <= thumbRect.bottom ? event.clientY - thumbRect.top : thumbRect.height / 2;
      const to = moved => { container.scrollTop = Math.max(0, Math.min(scrollRange, (moved.clientY - trackRect.top - grab) / distance * scrollRange)); };
      const stop = () => { track.classList.remove('dragging'); track.removeEventListener('pointermove', to);
        track.removeEventListener('pointerup', stop); track.removeEventListener('pointercancel', stop); };
      track.classList.add('dragging'); track.setPointerCapture(event.pointerId);
      track.addEventListener('pointermove', to); track.addEventListener('pointerup', stop); track.addEventListener('pointercancel', stop);
      to(event); event.preventDefault();
    });
    return sync;
  }

  function comparisonKey(code) {
    if (code.startsWith('FC2-PPV-')) return code;
    return code.toUpperCase().replace(/^((?:\d+)?[A-Z]+)-0*(\d+)([A-Z]{0,2})$/, '$1-$2$3');
  }

  // Peach 可把发行平台的店铺前缀归一成账本番号（MGS `107STZY-019` → `STZY-019`），对照表只在 Peach 维护。
  function samePeachCode(answer, asked) {
    const key = comparisonKey(answer), wanted = comparisonKey(asked);
    return key === wanted || wanted.replace(/^\d+(?=[A-Z])/, '') === key;
  }

  function siteFor(url) {
    if (url.protocol !== 'https:') return null;
    return SITE_RULES.sites.find(site => site.domains.some(domain =>
      url.hostname === domain || url.hostname.endsWith(`.${domain}`))) || null;
  }

  function sourcePage(url, site) {
    const source = new URL(url.origin + url.pathname);
    for (const key of site.query_keys || []) {
      const values = url.searchParams.getAll(key);
      if (values.length === 1 && /^[A-Za-z0-9_-]{1,100}$/.test(values[0])) {
        source.searchParams.set(key, values[0]);
      }
    }
    return source.href;
  }

  function fieldText(field) {
    if (field.hasAttribute('data-video-code')) return field.getAttribute('data-video-code');
    if (field.id === '__NEXT_DATA__') {
      const raw = field.textContent || '';
      if (raw.length > 1_000_000) return '';
      try {
        const props = JSON.parse(raw).props?.pageProps;
        const work = props?.work || (props?.works?.length === 1 ? props.works[0] : null);
        return String(work?.work_id || '');
      } catch { return ''; }
    }
    const text = (field.textContent || '').slice(0, 800);
    if (field.matches('th, dt, strong, b, .header, p')) {
      const label = text.trim().split(/[:：]/, 1)[0].trim().toLowerCase();
      const labelled = ['番号', '番號', '品番', 'メーカー品番', '識別碼', '识别码', 'id', 'code'].includes(label)
        || /^(メーカー品番|番号|番號|品番|識別碼|识别码|ID|Code)\s*[:：]/i.test(text.trim());
      if (!labelled) return '';
      if (field.tagName === 'TH') return field.nextElementSibling?.tagName === 'TD' ? field.nextElementSibling.textContent : '';
      if (field.tagName === 'DT') return field.nextElementSibling?.tagName === 'DD' ? field.nextElementSibling.textContent : '';
      if (field.tagName === 'P') return text;
      let value = text;
      let next = field.nextSibling;
      for (let index = 0; next && index < 4; index++, next = next.nextSibling) {
        if (next.nodeType === Node.ELEMENT_NODE && next.matches('br, b, strong, .header')) break;
        value += ` ${(next.textContent || '').slice(0, 800)}`;
      }
      return value.slice(0, 800);
    }
    return text;
  }

  const PERFORMER_LABELS = new Set(['出演者', '出演', '演員', '演员', '女優', '女优', 'actress', 'actresses', 'cast', 'performer', 'performers', 'stars']);
  // 详情页出演者：按字段标签读取，优先取链接文字。JavDB 在名字后用 ♀/♂ 标性别，原样带给 Peach 判别。
  function performerNames(url = new URL(location.href)) {
    const site = siteFor(url), names = [];
    for (const selector of site?.selectors || []) {
      for (const field of [...document.querySelectorAll(selector)].slice(0, 40)) {
        if (!field.matches('th, dt, strong, b, .header')) continue;
        const label = (field.textContent || '').trim().split(/[:：]/, 1)[0].trim().toLowerCase();
        if (!PERFORMER_LABELS.has(label)) continue;
        const holders = ['TH', 'DT'].includes(field.tagName) ? [field.nextElementSibling]
          : [field.parentElement, field.parentElement?.nextElementSibling];
        for (const holder of holders) {
          const links = [...(holder?.querySelectorAll('a') || [])].filter(link => !link.contains(field));
          for (const link of links) {
            const mark = link.nextElementSibling?.textContent?.trim();
            names.push(`${link.textContent.trim()}${mark === '♂' || mark === '♀' ? mark : ''}`);
          }
          if (links.length) break;
        }
      }
    }
    return [...new Set(names.filter(name => name && name.length <= 60))].slice(0, 10);
  }

  function automaticIdentity(url, site) {
    if (site.mode !== 'automatic' || !site.detail_pattern) return null;
    const match = new RegExp(site.detail_pattern, 'i').exec(url.pathname);
    if (!match) return null;
    // 发行平台的商品号交给 Peach 编目规则识别。
    if (site.identity === 'peach') {
      if (!match[1] && site.query_keys?.some(key => url.searchParams.getAll(key).length !== 1
        || !/^[A-Za-z0-9_-]{1,100}$/.test(url.searchParams.get(key)))) return null;
      const codes = new Map();
      for (const selector of site.selectors || []) {
        for (const field of [...document.querySelectorAll(selector)].slice(0, 40)) {
          for (const code of candidates(fieldText(field))) codes.set(comparisonKey(code), code);
        }
      }
      return { code: codes.size === 1 ? [...codes.values()][0] : '', conflict: codes.size > 1,
        source: sourcePage(url, site), resolve: true };
    }
    if (site.query_keys?.length && !site.query_keys.every(key => url.searchParams.getAll(key).length === 1
      && /^[A-Za-z0-9_-]{1,100}$/.test(url.searchParams.get(key)))) return null;
    let decoded = '';
    try { decoded = decodeURIComponent(match[1] || ''); } catch { return null; }
    const pathCodes = candidates(decoded);
    if (match[1] && !pathCodes.size) return null;
    const codes = new Map([...pathCodes].map(code => [comparisonKey(code), code]));
    const brand = site.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const title = document.title.replace(new RegExp(`(^|[^A-Z0-9])${brand}(?=$|[^A-Z0-9])`, 'gi'), '$1 ');
    const fields = [title];
    const seen = new Set();
    for (const selector of site.selectors || []) {
      const nodes = [...document.querySelectorAll(selector)].slice(0, 40);
      for (const field of nodes) {
        if (seen.has(field)) continue;
        seen.add(field);
        fields.push(fieldText(field));
        if (field.matches('h1,h2,h3,h4')) break;
      }
    }
    let foundField = false;
    for (const field of fields) for (const code of candidates(field)) {
      foundField = true;
      if (!codes.has(comparisonKey(code))) codes.set(comparisonKey(code), code);
    }
    if (!foundField) return null;
    return {
      code: codes.size === 1 ? [...codes.values()][0] : '',
      conflict: codes.size !== 1,
      source: sourcePage(url, site),
    };
  }

  function identity() {
    const url = new URL(location.href);
    const site = siteFor(url);
    if (!site) return null;
    if (selected?.url !== location.href) selected = null;
    return selected || automaticIdentity(url, site);
  }

  function selectCode() {
    const url = new URL(location.href);
    const site = siteFor(url);
    if (!site) return;
    const raw = String(getSelection() || '').trim();
    const shortCode = /^(?:FC2(?:[-_ ]?PPV)?[-_ ]?\d{4,9}|[NK]\d{4}|MKB?D-S\d{2,4}|(?:\d{1,5})?[A-Z]{2,12}[-_]?\d{1,8}[A-Z]{0,2}|\d{6}[-_]\d{2,4})$/i;
    const extracted = candidates(raw);
    if (raw.length > 80 || !shortCode.test(raw) || extracted.size !== 1) {
      showNotice('请只选中一个完整的短番号，再在脚本菜单选择「开启」。');
      return;
    }
    selected = { url: location.href, code: [...extracted][0], conflict: false, source: sourcePage(url, site) };
    pageKey = '';
    refresh();
  }

  function settings(rawBase, rawToken) {
    const base = new URL(String(rawBase).trim());
    const token = String(rawToken).trim();
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
    if (!(base.protocol === 'https:' || (base.protocol === 'http:' && loopback))
      || base.username || base.password || base.search || base.hash || base.pathname !== '/'
      || !token || token.length > 256 || /[\r\n]/.test(String(rawToken))) throw new Error();
    return { base: base.origin, token };
  }

  function configuration() {
    try {
      return settings(GM_getValue(STORAGE_BASE, ''), GM_getValue(STORAGE_TOKEN, ''));
    } catch { return null; }
  }

  function validVersion(value) { return typeof value === 'string' && /^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(value); }

  function compareVersion(left, right) {
    if (!validVersion(left) || !validVersion(right)) return 0;
    const a = left.split('.').map(Number), b = right.split('.').map(Number);
    for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
    return 0;
  }

  function readUpdateCache() {
    try {
      const saved = JSON.parse(GM_getValue(STORAGE_UPDATES, '{}'));
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch { return {}; }
  }

  function recordInstalledVersion() {
    try {
      const metadata = typeof GM_info === 'object' && validVersion(GM_info?.script?.version) ? GM_info.script.version : SCRIPT_VERSION;
      const installed = compareVersion(SCRIPT_VERSION, metadata) >= 0 ? SCRIPT_VERSION : metadata;
      if (compareVersion(installed, GM_getValue(STORAGE_INSTALLED, '0.0.0')) > 0) GM_setValue(STORAGE_INSTALLED, installed);
    } catch { /* 安装检测不阻断原有入口。 */ }
  }

  function installedVersion() {
    try { return GM_getValue(STORAGE_INSTALLED, RUNNING_VERSION); } catch { return RUNNING_VERSION; }
  }

  function updateModel() {
    const installed = installedVersion();
    if (compareVersion(installed, RUNNING_VERSION) > 0) return {
      key: `refresh:${installed}`, kind: 'refresh', message: `用户脚本已更新至 v${installed}，刷新本页即可使用。`,
    };
    const config = configuration();
    const local = config && updateCache.peach?.base === config.base ? updateCache.peach : null;
    const remote = validVersion(updateCache.script?.version) ? updateCache.script.version : '';
    const bundled = local?.userscript?.version;
    const fromPeach = compareVersion(bundled, remote || '0.0.0') > 0;
    const version = fromPeach ? bundled : remote;
    if (compareVersion(version, RUNNING_VERSION) > 0) return {
      key: `${updateInstallVersion === version ? 'install' : 'script'}:${version}`,
      kind: updateInstallVersion === version ? 'install' : 'script', version,
      message: updateInstallVersion === version ? '在脚本管理器完成更新后，刷新本页即可使用。' : `用户脚本 v${version} 可更新。`,
      href: fromPeach && config ? `${config.base}/integrations/peach-jav.user.js` : RELEASE_INSTALL,
    };
    if (local?.release?.state === 'available' && typeof local.release.latest_version === 'string') return {
      key: `peach:${config.base}:${local.release.latest_version}`, kind: 'peach',
      message: `Peach ${local.release.latest_version} 可更新。`, href: `${config.base}/settings/maintenance#releaseUpdates`,
    };
    return { key: '', kind: 'current', message: `当前用户脚本 v${RUNNING_VERSION}` };
  }

  function updateSection({ availableOnly = false } = {}) {
    for (const previous of updateContainers) if (!previous.isConnected) updateContainers.delete(previous);
    const node = element('section', 'update-section');
    node.dataset.availableOnly = String(availableOnly);
    node.setAttribute('aria-label', '检查更新');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    updateContainers.add(node);
    paintUpdates(node);
    return node;
  }

  function paintUpdates(node) {
    const model = updateModel();
    node.dataset.updateKey = model.key;
    const availableOnly = node.dataset.availableOnly === 'true';
    node.hidden = availableOnly && model.kind === 'current';
    if (node.hidden) { node.replaceChildren(); return; }
    const checking = updateChecking && model.kind === 'current';
    const note = element('p', 'geist-note', checking ? '正在检查更新。' : model.message);
    note.dataset.updateKind = model.kind;
    note.dataset.copyKey = `userscript.updates.${checking ? 'checking' : model.kind}.message`;
    note.setAttribute('aria-label', '用户脚本更新状态');
    const actions = element('div', 'update-actions');
    if (model.kind === 'refresh' || model.kind === 'install') {
      const reload = control('刷新本页');
      reload.dataset.updateKind = 'refresh';
      reload.dataset.copyKey = 'userscript.updates.refresh.action';
      reload.addEventListener('click', () => location.reload());
      actions.append(reload);
    }
    if (model.href) {
      const install = element('a', 'geist-button', model.kind === 'script' || model.kind === 'install' ? '更新用户脚本' : '查看 Peach 更新');
      install.dataset.updateKind = model.kind;
      Object.assign(install, { href: model.href, target: '_blank', rel: 'noopener noreferrer' });
      install.dataset.copyKey = `userscript.updates.${model.kind}.action`;
      if (model.kind === 'script' || model.kind === 'install') install.addEventListener('click', () => {
        updateInstallVersion = model.version;
        setTimeout(paintAllUpdates, 0);
      });
      actions.append(install);
    }
    const check = control('检查更新');
    check.dataset.copyKey = 'userscript.updates.check.action';
    check.setAttribute('aria-busy', String(updateChecking));
    check.setAttribute('aria-disabled', String(updateChecking));
    check.disabled = updateChecking;
    check.addEventListener('click', () => { if (!updateChecking) void checkUpdates(true); });
    if (!availableOnly) actions.append(check);
    node.replaceChildren(note);
    if (updateError && !updateChecking) {
      const error = element('p', 'geist-note', updateError);
      error.dataset.variant = 'error'; error.setAttribute('role', 'alert');
      error.dataset.copyKey = 'userscript.updates.error.message';
      node.append(error);
    }
    node.append(actions);
    const config = configuration();
    const peach = config && updateCache.peach?.base === config.base ? updateCache.peach : null;
    if (model.kind !== 'peach' && peach?.release?.state === 'available' && typeof peach.release.latest_version === 'string') {
      const app = element('p', 'geist-note', `Peach ${peach.release.latest_version} 可更新。`);
      app.dataset.updateKind = 'peach';
      app.dataset.copyKey = 'userscript.updates.peach.message';
      const open = element('a', 'geist-button', '查看 Peach 更新');
      open.dataset.updateKind = 'peach';
      Object.assign(open, { href: `${config.base}/settings/maintenance#releaseUpdates`, target: '_blank', rel: 'noopener noreferrer' });
      open.dataset.copyKey = 'userscript.updates.peach.action';
      const appActions = element('div', 'update-actions'); appActions.append(open);
      node.append(app, appActions);
    }
  }

  function paintAllUpdates() {
    if (updateDisposed) return;
    for (const node of updateContainers) {
      if (node.isConnected) paintUpdates(node); else updateContainers.delete(node);
    }
    refreshUpdateEntry();
    for (const root of surfaces) if (root.isConnected) placeSurface(root); else surfaces.delete(root);
  }

  // 女优页：JavDB 演员页与 DMM 女优片单带站内编号，MISSAV 女优页只有名字（Peach 端规则见 ADR-0143）。
  // JavDB 标题栏把几种写法用逗号连成一串，原样交给 Peach 拆。
  function performerPage(url = new URL(location.href)) {
    const site = siteFor(url);
    if (!site) return null;
    const path = url.pathname;
    if (site.id === 'javdb' && /^\/actors\/[A-Za-z0-9]{1,16}\/?$/.test(path)) {
      const name = (document.querySelector('.actor-section-name')?.textContent || '').trim().slice(0, 200);
      return { source: url.origin + path.replace(/\/$/, ''), names: name ? [name] : [], byId: true };
    }
    if (site.id === 'dmm') {
      const listed = path.replace(/\/$/, '') === '/av/list' ? url.searchParams.get('actress') || '' : '';
      if (/^\d{1,12}$/.test(listed)) return { source: `${url.origin}/av/list/?actress=${listed}`, names: [], byId: true };
      if (/\/article=actress\/id=\d{1,12}\//.test(`${path}/`)) return { source: url.origin + path, names: [], byId: true };
    }
    if (site.id === 'missav' && /^\/(?:dm\d+\/)?(?:(?:en|ja|zh|cn|tw|ko)\/)?actresses\/[^/]+\/?$/.test(path)) {
      return { source: url.origin + path, names: [], byId: false };
    }
    return null;
  }

  // 查或改这位女优的「订阅新作」；返回 Peach 认出的名字、是否已订与头像。旧版 Peach 没有这个接口。
  function requestPerformer(config, page, enabled = null) {
    const query = [`source_url=${encodeURIComponent(page.source)}`, ...page.names.map(name => `names=${encodeURIComponent(name)}`)].join('&');
    return new Promise((resolve, reject) => {
      try {
        GM_xmlhttpRequest({ method: enabled === null ? 'GET' : 'POST', anonymous: true, timeout: 60_000,
          url: `${config.base}/api/jav-browser/performer${enabled === null ? `?${query}` : ''}`,
          headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/json',
            ...(enabled === null ? {} : { 'Content-Type': 'application/json' }) },
          ...(enabled === null ? {} : { data: JSON.stringify({ source_url: page.source, names: page.names, enabled }) }),
          onload(response) {
            let detail = '';
            try { const value = JSON.parse(response.responseText).detail; if (typeof value === 'string' && value.length <= 200) detail = value; } catch { /* 非 JSON 错误按状态提示。 */ }
            if ([404, 405].includes(response.status)) { reject(Object.assign(new Error('Peach 尚不支持在女优页订阅新作，请更新 Peach。'), { unsupported: true })); return; }
            if (response.status === 401 || response.status === 403) { reject(new Error('令牌无效或无权限，请重新配置。')); return; }
            if (response.status !== 200) { reject(new Error(detail || '这一次没有完成，请稍后重试。')); return; }
            try {
              const body = JSON.parse(response.responseText);
              if (body.ok !== true || typeof body.name !== 'string' || body.name.length > 200 || typeof body.following !== 'boolean'
                || !(body.entity_id === null || Number.isInteger(body.entity_id))) throw new Error();
              resolve(body);
            } catch { reject(new Error('Peach 返回的女优信息无效。')); }
          },
          onerror: () => reject(new Error('无法连接 Peach，请稍后重试。')), ontimeout: () => reject(new Error('Peach 请求超时，请稍后重试。')),
          onabort: () => reject(new Error('Peach 请求已中止。')),
        });
      } catch { reject(new Error('无法连接 Peach，请稍后重试。')); }
    });
  }

  // 入口面板顶部的女优订阅：头像、名字、状态说明和一枚开关按钮。
  function performerSection() {
    const node = element('section', 'performer-follow');
    node.setAttribute('aria-label', '女优新作订阅');
    node.hidden = true;
    const head = element('div', 'performer-head'), people = element('span', 'batch-people'), label = element('strong');
    people.append(defaultPersonAvatar());
    head.append(people, label);
    const note = element('p', 'geist-note');
    note.setAttribute('role', 'status'); note.setAttribute('aria-live', 'polite');
    const button = control('订阅新作', { primary: true });
    button.addEventListener('click', () => void togglePerformer());
    node.append(head, note, button);
    performerView = { node, people, label, note, button, key: '', page: null, body: null, busy: false, error: '', unsupported: false };
    return node;
  }

  function paintPerformer(page) {
    const view = performerView;
    if (!view?.node.isConnected) return;
    const config = configuration();
    view.node.hidden = !page || !config || view.unsupported;
    if (view.node.hidden) return;
    const key = `${config.base}|${page.source}|${page.names.join(',')}`;
    if (key !== view.key) {
      Object.assign(view, { key, page, body: null, error: '' });
      view.busy = true;
      // Peach 认出这一页之后入口面板才自动展开；旧版 Peach 没有这个接口时面板保持原样。
      requestPerformer(config, page).then(body => { if (view.key === key) view.body = body; })
        .catch(error => { if (view.key === key) { view.error = error.message; view.unsupported = Boolean(error.unsupported); } })
        .finally(() => { if (view.key === key) { view.busy = false; refreshUpdateEntry(); } });
    }
    const body = view.body, name = body?.name || page.names[0]?.split(/[,，、]/)[0]?.trim() || '';
    view.label.textContent = name || '女优页';
    try { if (body?.name) renderPeople(view.people, [{ name: body.name, ...(body.avatar ? { avatar: body.avatar } : {}) }]); } catch { /* 保留默认人像。 */ }
    view.note.dataset.variant = view.error ? 'error' : 'secondary';
    view.note.textContent = view.error || (!body ? '正在向 Peach 查询这位女优'
      : body.following ? '已订阅新作，Peach 会定期查她的新作。'
      : body.entity_id !== null ? '订阅后，Peach 会定期查她的新作。'
      : page.byId ? 'Peach 里还没有这位女优，订阅时会新建她。'
      : 'Peach 里还没有这位女优，订阅时会到 JavDB 确认是同一个人。');
    view.button.textContent = view.busy ? '正在处理' : body?.following ? '取消订阅新作' : '订阅新作';
    view.button.classList.toggle('primary', !body?.following);
    view.button.disabled = view.busy || (!body && !view.error);
    view.button.setAttribute('aria-busy', String(view.busy));
  }

  async function togglePerformer() {
    const view = performerView, config = configuration();
    if (!view || !config || view.busy || !view.page) return;
    const { key, page } = view, enabled = !view.body?.following;
    view.busy = true; view.error = ''; paintPerformer(page);
    try {
      const body = await requestPerformer(config, page, enabled);
      if (view.key === key) view.body = body;
    } catch (error) {
      if (view.key === key) { view.error = error.message; view.unsupported = Boolean(error.unsupported); }
    } finally {
      if (view.key === key) { view.busy = false; paintPerformer(performerPage()); placeSurface(view.node.getRootNode().host); }
    }
  }

  function refreshUpdateEntry() {
    if (!document.body || updateDisposed) return;
    if (!pageInterfaceAllowed()) {updateEntry?.root.remove();updateEntry=null;return;}
    if (current) { updateEntry?.root.remove(); updateEntry = null; return; }
    const model = updateModel(), performer = performerPage();
    const expanded = document.visibilityState !== 'hidden' && (entryOpen || model.kind !== 'current' && updateDismissed !== model.key
      || Boolean(performer && performerView?.body && performerView.page?.source === performer.source
        && performerDismissed !== performer.source));
    if (!updateEntry?.root.isConnected) {
      const entry = surface('peach-jav-updates', 'Peach');
      const launcher = control('Peach 设置与更新');
      launcher.setAttribute('aria-label', 'Peach 设置与更新');
      launcher.classList.add('launcher');
      const logo = element('img'); logo.src = PEACH_LOGO; logo.alt = ''; logo.draggable=false;
      launcher.replaceChildren(logo);
      const panel = element('section', 'panel');
      wireDrag(entry.root, launcher, panel);
      // 右上角与作品浮卡同一组：设置、折叠、隐藏。
      const bar = element('header', 'bar'), actions = element('div', 'bar-actions');
      const settings = control('Peach 设置', { icon: 'settings' }); settings.addEventListener('click', configure);
      const collapse = control('折叠 Peach 详情', { icon: 'collapse' });
      collapse.addEventListener('click', () => { closeTaskPage(panel); entryCollapsed = !entryCollapsed; refreshUpdateEntry(); collapse.focus(); });
      const later = control('隐藏 Peach 面板', { icon: 'close' });
      later.addEventListener('click', () => {
        const shown = updateModel();
        if (shown.kind !== 'current') updateDismissed = shown.key;
        performerDismissed = performerPage()?.source || performerDismissed;
        closeTaskPage(panel); entryOpen = false; refreshUpdateEntry(); updateEntry?.launcher.focus();
      });
      actions.append(settings, collapse, later);
      bar.append(element('strong', '', 'Peach'), actions);
      const scan = control('识别本页全部番号', { primary: true }); scan.addEventListener('click', openPageActions);
      const body = element('div', 'body'); body.append(performerSection(), updateSection({ availableOnly: true }), sharedSection(), scan);
      launcher.addEventListener('click', () => { entryOpen = true; entryCollapsed = false; refreshUpdateEntry(); later.focus(); });
      panel.append(bar, body); entry.shadow.append(panel, launcher);
      updateEntry = { ...entry, launcher, panel, body, collapse, scan };
    }
    // 女优页上「订阅新作」是这张面板的主操作，识别本页番号退成次要按钮。
    updateEntry.scan.classList.toggle('primary', !performer);
    paintPerformer(performer);
    const folded = expanded && entryCollapsed;
    updateEntry.root.dataset.panelMode = !expanded ? 'minimized' : folded ? 'collapsed' : 'expanded';
    updateEntry.body.hidden = folded; updateEntry.body.inert = folded;
    updateEntry.collapse.setAttribute('aria-expanded', String(!folded));
    updateEntry.collapse.setAttribute('aria-label', folded ? '展开 Peach 详情' : '折叠 Peach 详情');
    placeSurface(updateEntry.root);
    updateEntry.launcher.hidden = expanded; updateEntry.panel.hidden = !expanded;
    updateEntry.root.toggleAttribute('data-settings-open', subpageOpen());
  }

  function updateRequest(url, config = null) {
    return new Promise((resolve, reject) => {
      let handle;
      let finished = false;
      let watchdog;
      let ticket;
      const finish = (error, value) => {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        if (ticket) updateRequests.delete(ticket);
        if (error) reject(error); else resolve(value);
      };
      const failed = () => finish(new Error(config ? 'Peach 更新状态未取得，请检查连接和令牌后重试。' : '脚本发行状态未取得，请稍后重试。'));
      ticket = { abort() { failed(); handle?.abort?.(); } };
      // anonymous 使用的 fetch 模式在 Chrome 中不保证 GM timeout 生效。
      watchdog = setTimeout(() => ticket.abort(), 15_000);
      try {
        handle = GM_xmlhttpRequest({ method: 'GET', url, anonymous: true, timeout: 15_000, redirect: 'error',
          headers: config ? { Accept: 'application/json', Authorization: `Bearer ${config.token}` } : { Accept: 'text/plain' },
          onload(response) {
            if (finished) return;
            if (response.status < 200 || response.status >= 300 || response.responseText?.length > 128_000
              || (response.finalUrl && response.finalUrl !== url)) { failed(); return; }
            try {
              if (!config) {
                const metadata = /^\s*\/\/ ==UserScript==\r?\n([\s\S]*?)\/\/ ==\/UserScript==/.exec(response.responseText)?.[1];
                const entries = key => [...(metadata || '').matchAll(new RegExp(`^// @${key}\\s+(.+)$`, 'gm'))].map(match => match[1].trim());
                const version = entries('version');
                if (!metadata || version.length !== 1 || !validVersion(version[0])
                  || entries('namespace').length !== 1 || entries('namespace')[0] !== 'https://github.com/peach-mitao/peach-userscript'
                  || entries('name').length !== 1 || !PUBLISHED_NAMES.includes(entries('name')[0])) throw new Error();
                finish(null, { version: version[0] });
              } else {
                const body = JSON.parse(response.responseText);
                if (!validVersion(body.userscript?.version) || !validVersion(body.userscript?.minimum_version)
                  || typeof body.runtime?.version !== 'string' || typeof body.runtime?.build_id !== 'string'
                  || typeof body.release?.state !== 'string') throw new Error();
                // 安装链接只由当前配置地址和固定路径组成。
                finish(null, { base: config.base, runtime: body.runtime, release: body.release,
                  userscript: { version: body.userscript.version, minimum_version: body.userscript.minimum_version } });
              }
            } catch { failed(); }
          }, onerror: failed, ontimeout: failed, onabort: failed,
        });
        if (!finished) updateRequests.add(ticket);
      } catch { failed(); }
    });
  }

  async function checkUpdates(manual = false) {
    if (updateDisposed || updateChecking || (!manual && (!pageInterfaceAllowed() || document.visibilityState === 'hidden'))) return;
    const run = ++updateGeneration;
    updateChecking = true; updateError = '';
    try { GM_setValue(STORAGE_CHECKED, String(Date.now())); } catch { automaticUpdatesAvailable = false; }
    paintAllUpdates();
    const config = configuration();
    const results = await Promise.allSettled([updateRequest(RELEASE_META),
      ...(config ? [updateRequest(`${config.base}/api/jav-browser/updates`, config)] : [])]);
    if (updateDisposed || run !== updateGeneration) return;
    updateChecking = false;
    const latest = readUpdateCache();
    if (results[0].status === 'fulfilled') latest.script = results[0].value;
    if (config && results[1]?.status === 'fulfilled' && configuration()?.base === config.base) latest.peach = results[1].value;
    const errors = results.filter(result => result.status === 'rejected');
    if (manual && errors.length) updateError = errors.map(result => result.reason.message).join(' ');
    updateCache = latest;
    try { GM_setValue(STORAGE_UPDATES, JSON.stringify(latest)); } catch { /* 页面内保留本次结果。 */ }
    paintAllUpdates(); scheduleUpdateCheck();
  }

  function scheduleUpdateCheck() {
    clearTimeout(updateTimer);
    if (updateDisposed || !automaticUpdatesAvailable || !pageInterfaceAllowed() || document.visibilityState === 'hidden') return;
    let last;
    try { last = Number(GM_getValue(STORAGE_CHECKED, '0')); } catch { return; }
    const delay = Number.isFinite(last) ? Math.max(0, last + 86400_000 - Date.now()) : 0;
    if (delay === 0) void checkUpdates();
    else updateTimer = setTimeout(scheduleUpdateCheck, Math.min(delay, 86400_000));
  }

  function updateVisibility() {
    clearTimeout(updateTimer);
    if (document.visibilityState === 'hidden') {
      updateGeneration++; updateChecking = false;
      for (const request of updateRequests) request.abort?.();
      updateRequests.clear();
    } else { refreshInstalledVersion(); scheduleUpdateCheck(); }
  }

  function refreshInstalledVersion() {
    if (updateDisposed) return;
    recordInstalledVersion();
    const saved = readUpdateCache(), changed = JSON.stringify(saved) !== JSON.stringify(updateCache);
    updateCache = saved;
    if (changed || [...updateContainers].some(node => node.isConnected && node.dataset.updateKey !== updateModel().key)) paintAllUpdates();
  }

  function disposeUpdates() {
    updateDisposed = true; updateGeneration++;
    clearTimeout(updateTimer);
    for (const request of updateRequests) request.abort?.();
    updateRequests.clear(); updateContainers.clear();
    document.removeEventListener('visibilitychange', updateVisibility);
    removeEventListener('focus', refreshInstalledVersion);
    if (typeof GM_removeValueChangeListener === 'function') for (const listener of updateListeners) GM_removeValueChangeListener(listener);
  }

  async function scanPage(view) {
    const codes = new Map();
    // 详情已取得的规范身份优先，避免 DMM 商品号的补零写法覆盖它。
    let detail = current?.url === location.href ? current.identity : identity();
    const asked = detail?.pageCode || (detail?.resolve && !detail.conflict ? detail.code : '');
    if (detail?.resolve && !detail.conflict && configuration()) {
      try {
        const result = await request(configuration(), detail.code, detail.source, 'GET', true);
        detail = {...detail, code:result.code, resolve:false};
      } catch (error) {
        view.peopleNote.hidden=false;view.peopleNote.textContent=`${error.message}，列表保留页面候选。`;
      }
    }
    if (!view.root.isConnected) return;
    view.detailCode = detail?.code && !detail.resolve && !detail.conflict ? detail.code : '';
    if (view.detailCode) codes.set(comparisonKey(view.detailCode), view.detailCode);
    // 页面商品号已由 Peach 归一成详情番号时，原写法不再单列一行。
    const folded = asked && view.detailCode ? comparisonKey(asked) : '';
    // 整页文本只收原文带分隔符的番号；PS4、TOP250、jay925 这类设备名、导航与用户名不作为候选。
    const add = text => { for (const code of candidates(text, text.length, true)) if (!codes.has(comparisonKey(code)) && comparisonKey(code) !== folded) codes.set(comparisonKey(code), code); };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {acceptNode(node) {
      const parent = node.parentElement;
      return !parent || parent.closest('script,style,noscript,textarea,input,select,[contenteditable],aside[id^="peach-jav-"]')
        || !parent.getClientRects().length ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }});
    let node, count = 0;
    while ((node = walker.nextNode())) {
      if (!view.root.isConnected) return;
      add(node.data);
      if (++count % 200 === 0) await new Promise(resolve => requestAnimationFrame(resolve));
    }
    for (const item of document.querySelectorAll('img[alt],a[title],[data-video-code]')) {
      if (item.closest('aside[id^="peach-jav-"]') || !item.getClientRects().length) continue;
      add(item.getAttribute('data-video-code') || item.getAttribute('alt') || item.getAttribute('title') || '');
    }
    if (!view.root.isConnected) return;
    view.rows = [...codes.values()].map(code => {
      const row = element('tr', 'batch-row');
      row.setAttribute('data-copy-interact','');
      const {wrapper,input}=tableCheckbox(`选择 ${code}`);
      const selection=element('td');selection.append(wrapper);
      const identity=element('td');
      const main = element('span', 'batch-row-main');
      const people = element('span', 'batch-people');
      people.append(defaultPersonAvatar());
      const status = element('span', 'batch-row-status chip');
      status.dataset.chip='plain';status.textContent='查询中';status.title='正在查询 Peach 状态';
      const result=element('td');result.append(status);
      const codeLabel=element('span','batch-row-code',code);codeLabel.title=code;
      main.append(people,codeLabel);identity.append(main);row.append(selection,identity,result);
      input.addEventListener('change', view.paint);
      row.addEventListener('click',event=>{if(input.disabled||event.target.closest('label,input,button,a'))return;input.checked=!input.checked;view.paint();});
      return {code, row, input, status, people};
    });
    view.list.replaceChildren(...view.rows.map(item => item.row));
    view.tableFrame.hidden = !view.rows.length;
    view.note.textContent = view.rows.length ? `识别到 ${view.rows.length} 个候选番号，重复番号已合并。`
      : '本页未识别到完整番号。可以选中一个番号后使用脚本菜单，或切换到作品列表页。';
    view.paint();
    void loadPagePeople(view);
    const config = configuration(), rows = view.rows;
    for (const item of rows) {
      if (!view.root.isConnected || view.rows !== rows) return;
      try {
        const body = await request(config, item.code, '', 'GET');
        if (!view.root.isConnected || view.rows !== rows) return;
        applyRowStatus(item, body);
      } catch (error) {
        if (!view.root.isConnected || view.rows !== rows) return;
        setRowState(item, 'failed', error.message, '未取得');
      }
    }
    view.busy = false; view.paint();
    void trackRows(view);
  }

  // 只读 Peach 本地人物资料；setAbort 收到可中止当前请求的函数，结束时收到 null。
  function requestPeople(config, codes, setAbort = () => {}, performers = []) {
    return new Promise((resolve,reject)=>{
      let handle, timer, finished=false;
      const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);setAbort(null);error?reject(error):resolve(value);};
      const abort=()=>{finish(new Error('本地女优资料未取得'));handle?.abort?.();};
      setAbort(abort); timer=setTimeout(abort,5000);
      const names=codes.length===1?performers.map(name=>`&performers=${encodeURIComponent(name)}`).join(''):'';
      handle=GM_xmlhttpRequest({method:'GET',url:`${config.base}/api/jav-browser/people?codes=${encodeURIComponent(codes.join(','))}${names}`,anonymous:true,redirect:'error',timeout:5000,
        headers:{Accept:'application/json',Authorization:`Bearer ${config.token}`},
        onload(response){try{if(response.status!==200||response.responseText.length>2*1024*1024)throw new Error();
          const data=JSON.parse(response.responseText);if(data.ok!==true||data.source!=='local-cache'||!data.items)throw new Error();finish(null,data);
        }catch{finish(new Error('本地女优资料未取得'));}},onerror:()=>finish(new Error('本地女优资料未取得')),ontimeout:()=>finish(new Error('本地女优资料未取得')),onabort:()=>finish(new Error('本地女优资料未取得'))});
    });
  }

  // 人物头像按 Peach 作品卡的叠放头像排列，最多五位；无人物资料显示默认人像。
  function renderPeople(target, people) {
    if (!Array.isArray(people) || people.some(person=>!person||typeof person.name!=='string'||!person.name.trim()||person.name.length>200)) throw new Error('本地女优资料格式无效');
    target.replaceChildren(...(people.length ? [] : [defaultPersonAvatar()]));
    target.title = people.map(person => person.name).join('、');
    for (const person of people.slice(0,5)) {
      const avatar=element('span','batch-person',Array.from(person.name.trim())[0].toLocaleUpperCase());
      avatar.title=person.name;avatar.setAttribute('role','img');avatar.setAttribute('aria-label',person.name);
      if (typeof person.avatar==='string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(person.avatar) && person.avatar.length<32000) {
        const image=element('img');image.alt='';image.src=person.avatar;image.addEventListener('error',()=>image.remove(),{once:true});avatar.append(image);
      }
      target.append(avatar);
    }
  }

  // 行状态、悬停说明与短标签；本页番号列表与浮卡里的其他任务共用。
  function rowState(body) {
    const download = body.download;
    if (body.state === 'idle') return ['pending'];
    if (body.state === 'failed') return ['failed', failureText(body), {magnet:'磁力失效', cloud:'网盘问题'}[body.cause] || '失败'];
    if (body.state === 'no_match') return ['no_match', failureText(body)];
    if (body.state === 'submitted' && ['remote_done', 'landed'].includes(download?.state)) return ['importing', download.label || '入库中'];
    if (body.state === 'submitted' && download?.state === 'submit_pending') return ['submitted', '等待自动重新提交', '待重新提交'];
    if (body.state === 'submitted' && download?.state === 'remote_running' && typeof download.progress === 'number' && Number.isFinite(download.progress)) {
      const percent = Math.round(Math.min(1, Math.max(0, download.progress)) * 100);
      return ['submitted', `网盘下载中 ${percent}%`, `下载中 ${percent}%`];
    }
    if (tracking(body) && body.state === 'ingested') return ['organizing', download?.postprocess_label || '整理中'];
    return [body.state, LABELS[body.state]];
  }

  function applyRowStatus(item, body) {
    // 只在本次跟踪中由进行中走到整理完成时响；提交即返回已入库（早已加过）不响。共享进度由写快照的窗口统一响。
    if (!sharedMode() && finished(body) && ['queued', 'searching', 'submitted', 'importing', 'organizing'].includes(item.row.dataset.state)) playSound('success');
    item.cause = body.state === 'failed' ? body.cause || '' : '';
    item.tracking = tracking(body);
    item.done = !['idle', 'failed', 'no_match'].includes(body.state);
    setRowState(item, ...rowState(body));
  }

  // 提交后自动查询仍在进行的行；再次提交会让上一轮跟踪退出。
  async function trackRows(view) {
    const config = configuration(), generation = (view.trackGeneration = (view.trackGeneration || 0) + 1);
    if (!config) return;
    const url = new URL(location.href), site = siteFor(url), source = site ? sourcePage(url, site) : '';
    const started = Date.now();
    for (let count = 0; Date.now() - started < POLL_LIMIT; count++) {
      if (!view.rows.some(item => item.tracking)) return;
      await pollWait(count);
      // 共享进度可用时由快照更新各行，不再逐个查询，也没有一小时上限。
      if (sharedMode()) return;
      for (const item of view.rows.filter(row => row.tracking)) {
        if (!view.root.isConnected || view.trackGeneration !== generation) return;
        try { applyRowStatus(item, await request(config, item.code, source, 'GET')); }
        catch { /* 连接异常时保留最近一次确认的状态，下一轮再查。 */ }
      }
      if (view.root.isConnected && view.trackGeneration === generation && !view.busy) view.paint();
    }
  }

  async function loadPagePeople(view) {
    const config=configuration(), rows=view.rows;
    if (!config || !rows.length) return;
    for (let start=0; start<rows.length; start+=50) {
      if (!view.root.isConnected || view.rows !== rows) return;
      const chunk=rows.slice(start,start+50), codes=chunk.map(item=>item.code);
      try {
        const body=await requestPeople(config, codes, abort => { view.peopleAbort = abort; });
        if (!view.root.isConnected || view.rows !== rows) return;
        // Peach 按账本写法作键，会补零（`ABC-12` → `ABC-012`）；按比较键回查，没有条目就是没有人物资料。
        const keyed = new Map(Object.entries(body.items).map(([code, people]) => [comparisonKey(code), people]));
        for (const item of chunk) renderPeople(item.people, body.items[item.code] ?? keyed.get(comparisonKey(item.code)) ?? []);
      } catch(error) { if(view.root.isConnected && view.rows===rows){view.peopleNote.hidden=false;view.peopleNote.textContent=`${error.message}，仍可选择番号加入。`;} return; }
    }
    // 不在馆藏的作品只能靠详情页的出演者名字找到本地人物。
    const names=performerNames(), item=view.detailCode && rows.find(row=>comparisonKey(row.code)===comparisonKey(view.detailCode));
    if (!item || !names.length) return;
    try {
      const body=await requestPeople(config, [item.code], abort => { view.peopleAbort = abort; }, names);
      if (view.root.isConnected && view.rows === rows) renderPeople(item.people, Object.values(body.items)[0]);
    } catch { /* 保留按番号取得的结果。 */ }
  }

  // 子页正在退场时浮卡已经开始进场，不再算作打开。
  function subpageOpen() {
    return [settingsView, batchView].some(view => view?.dialog.open && !view.dialog.hasAttribute('data-closing'));
  }

  // 子页打开期间浮卡退场并停用；子页一开始退场浮卡就进场，可交互要等子页真正关闭。
  function coverPanels() {
    for (const root of [current?.root, updateEntry?.root]) {
      root?.removeAttribute('data-subpage-return'); root?.setAttribute('data-settings-open', '');
    }
    if (current) current.root.inert = true;
  }

  function uncoverPanels() {
    if (subpageOpen()) return;
    for (const root of [current?.root, updateEntry?.root]) {
      if (!root?.hasAttribute('data-settings-open')) continue;
      root.removeAttribute('data-settings-open'); root.setAttribute('data-subpage-return', '');
      root.addEventListener('animationend', () => root.removeAttribute('data-subpage-return'), {once:true});
    }
  }

  // dialog 与遮罩退场，同时让浮卡进场；动画结束或超时后由调用方关闭。
  async function fadeOut(dialog) {
    dialog.setAttribute('data-closing', '');
    uncoverPanels();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    dialog.getBoundingClientRect();
    const animations = dialog.getAnimations();
    if (!animations.length) return;
    let timer;
    await Promise.race([Promise.allSettled(animations.map(animation => animation.finished)),
      new Promise(resolve => { timer = setTimeout(resolve, 340); })]);
    clearTimeout(timer);
  }

  function openPageActions() {
    if (!configuration()) { configure(); return; }
    if (batchView?.dialog.open) { batchView.dialog.focus(); return; }
    const switching = Boolean(settingsView?.dialog.open);
    if (switching) settingsView.dialog.close();
    if (!current) entryOpen = true;
    const previousFocus=current?.root.shadowRoot?.activeElement || updateEntry?.root.shadowRoot?.activeElement || document.activeElement;
    const {root, shadow} = surface('peach-jav-batch', 'Peach 页面番号');
    const dialog = element('dialog'); dialog.setAttribute('aria-label', '本页番号');
    const form = element('div'); form.style.display='flex'; form.style.flexDirection='column'; form.style.maxHeight='calc(100dvh - 34px)';
    const bar = element('header', 'bar subpage-bar');
    const close = control('返回 Peach 主界面', {icon:'back'});
    bar.append(close,element('h2', '', '本页番号'));
    const body = element('div', 'body');
    const note = element('p', 'geist-note', '正在识别本页番号…'); note.setAttribute('role', 'status');
    const tip = element('p', 'hint', '候选番号由 Peach 校验。返回后停止继续提交，已提交的任务继续处理。');
    const tableFrame=element('div','batch-list');tableFrame.hidden=true;tableFrame.setAttribute('data-board-data-table','');
    const table=element('table','bui-table');table.setAttribute('aria-label','本页番号列表');
    const columns=element('colgroup');for(let i=0;i<3;i++)columns.append(element('col'));
    const head=element('thead'),header=element('tr'),selection=element('th');selection.scope='col';
    const {wrapper:selectLabel,input:selectAll}=tableCheckbox('全选本页番号');selection.append(selectLabel);
    const numberHeader=element('th','','番号');numberHeader.scope='col';
    const statusHeader=element('th','','状态');statusHeader.scope='col';
    header.append(selection,numberHeader,statusHeader);head.append(header);
    const list=element('tbody');table.append(columns,head,list);tableFrame.append(table);
    const peopleNote=element('p','hint');peopleNote.hidden=true;peopleNote.setAttribute('role','status');
    const tableHost=element('div','batch-frame');tableHost.append(tableFrame);
    body.append(note, tip, tableHost, peopleNote);overlayScrollbar(tableFrame);
    const footer = element('footer', 'footer batch-footer');
    const rescan = control('重新识别', {icon:'refresh'}); rescan.title='重新识别';
    const addSelected = control('加入所选', {primary:true});
    const addAll = control('全部加入');
    footer.append(rescan, addAll, addSelected);
    form.append(bar, body, footer); dialog.append(form); shadow.append(dialog); overlayScrollbar(body, {square:true});
    const view = {root, dialog, note, list, tableFrame, peopleNote, rows:[], busy:true, paint() {
      const available = view.rows.filter(item => !item.done);
      const chosen = available.filter(item => item.input.checked);
      addSelected.textContent = `加入所选${chosen.length ? `（${chosen.length}）` : ''}`;
      addAll.textContent = `全部加入${available.length ? `（${available.length}）` : ''}`;
      addSelected.disabled = view.busy || !chosen.length; addAll.disabled = view.busy || !available.length;
      rescan.disabled = view.busy; selectAll.disabled = view.busy || !available.length;
      selectAll.checked = available.length > 0 && chosen.length === available.length;
      selectAll.indeterminate = chosen.length > 0 && chosen.length < available.length;
      for (const item of view.rows) {
        item.input.disabled = view.busy || Boolean(item.done);
        item.row.toggleAttribute('data-board-selected',item.input.checked);
        item.row.setAttribute('aria-disabled',String(item.input.disabled));
      }
    }};
    batchView = view;
    selectAll.addEventListener('change', () => { for (const item of view.rows) if (!item.done) item.input.checked = selectAll.checked; view.paint(); });
    const submit = async all => {
      if (view.busy) return;
      const chosen = view.rows.filter(item => !item.done && (all || item.input.checked));
      if (!chosen.length) return;
      const config = configuration();
      if (!config) { note.textContent='配对信息已失效，请重新设置。'; return; }
      playSound('start');
      view.busy=true; view.paint();
      const url = new URL(location.href), site = siteFor(url);
      const source = site ? sourcePage(url, site) : '';
      let handled=0, failed=0;
      for (const item of chosen) {
        if (!root.isConnected || !dialog.open) break;
        const switching = item.cause === 'magnet';
        setRowState(item, 'sending', switching ? '正在换一个磁力…' : '正在交给 Peach…');
        try {
          const result = await request(config, item.code, source, 'POST', false, switching ? {switch:true} : {});
          if (!root.isConnected) break;
          applyRowStatus(item, result);
          if (!item.done) failed++;
        } catch (error) {
          if (!root.isConnected) break;
          setRowState(item, 'failed', error.message, errorLabel(error)); failed++;
        }
        // 已处理的行取消勾选：完成项不再可选，未完成项留待重新勾选或全部加入。
        item.input.checked=false;
        handled++; note.textContent=`已处理 ${handled}/${chosen.length} 项${failed ? `，${failed} 项未完成` : ''}。`;
      }
      const magnets = view.rows.filter(item => item.cause === 'magnet').length;
      if (magnets && root.isConnected) note.textContent += `${magnets} 项磁力失效，再次加入会换一个磁力。`;
      view.busy=false; view.paint();
      void sharedTick(true); void trackRows(view);
    };
    addSelected.addEventListener('click', () => { void submit(false); });
    addAll.addEventListener('click', () => { void submit(true); });
    // 识别通常很快，图标至少转满一圈，识别结束后转完当前这一圈再停。
    rescan.addEventListener('animationiteration', () => { if (!view.busy) delete rescan.dataset.spinning; });
    rescan.addEventListener('click', () => { rescan.dataset.spinning = ''; view.peopleAbort?.();peopleNote.hidden=true;view.busy=true; view.paint(); note.textContent='正在识别本页番号…'; void scanPage(view); });
    // 返回与 Escape 都走淡出，和设置子页的退场一致。
    const dismiss = async () => {
      if (!dialog.open || dialog.hasAttribute('data-closing')) return;
      await fadeOut(dialog);
      if (dialog.open) dialog.close();
    };
    close.addEventListener('click', () => { void dismiss(); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); void dismiss(); });
    dialog.addEventListener('close', () => {
      view.peopleAbort?.();
      root.remove(); if (batchView===view) batchView=null;
      if (current && !subpageOpen()) { current.root.removeAttribute('data-settings-open'); current.root.inert=false; }
      refreshUpdateEntry();
      if(previousFocus?.isConnected)previousFocus.focus();
    }, {once:true});
    coverPanels();
    if (switching) dialog.setAttribute('data-switch', '');
    view.paint(); dialog.showModal(); placeSurface(root); void scanPage(view);
  }

  function configure() {
    const switching = Boolean(batchView?.dialog.open);
    if (switching) batchView.dialog.close();
    if (settingsView?.dialog.open) { settingsView.reopen(); return; }
    const previousFocus = current?.root.shadowRoot?.activeElement || updateEntry?.root.shadowRoot?.activeElement || document.activeElement;
    const saved = configuration();
    const { root, shadow } = surface('peach-jav-settings', 'Peach 设置');
    const dialog = element('dialog');
    dialog.setAttribute('aria-labelledby', 'peach-settings-title');
    const form = element('form');
    form.noValidate = true;
    const bar = element('header', 'bar subpage-bar');
    const heading = element('h2', '', 'Peach 设置');
    heading.id = 'peach-settings-title';
    const close = control('返回 Peach 主界面', { icon: 'back' });
    const cancel = control('取消');
    const body = element('div', 'body');
    function field(id, label, hint, type = 'text') {
      const wrapper = element('div', 'field');
      const title = element('label', '', label);
      title.htmlFor = id;
      const input = element('input', 'geist-input');
      Object.assign(input, { id, type, autocomplete: 'off', spellcheck: false });
      const help = element('p', 'hint', hint);
      help.id = `${id}-hint`;
      input.setAttribute('aria-describedby', help.id);
      wrapper.append(title, input, help);
      body.append(wrapper);
      return { wrapper, input, help };
    }
    const address = field('peach-base', 'Peach 地址', '可粘贴配对信息，一并填好令牌。', 'url');
    address.input.placeholder = 'https://peach.example.com';
    address.input.value = String(GM_getValue(STORAGE_BASE, '') || '');
    address.input.autofocus = true;
    const secret = field('peach-token', '专用令牌', '在 Peach 配置 → 下载渠道 → 浏览器添加 JAV 生成。', 'password');
    secret.input.placeholder = saved ? '已保存，留空保留' : '粘贴专用令牌';
    const secretRow = element('div', 'secret');
    secret.input.replaceWith(secretRow);
    const reveal = control('显示');
    reveal.setAttribute('aria-label', '显示专用令牌');
    reveal.setAttribute('aria-pressed', 'false');
    reveal.addEventListener('click', () => {
      const visible = secret.input.type === 'password';
      secret.input.type = visible ? 'text' : 'password';
      reveal.textContent = visible ? '隐藏' : '显示';
      reveal.setAttribute('aria-label', visible ? '隐藏专用令牌' : '显示专用令牌');
      reveal.setAttribute('aria-pressed', String(visible));
    });
    secretRow.append(secret.input, reveal);
    const display = element('fieldset', 'display-scope');
    display.append(element('legend', '', '按钮显示范围'));
    const displayValue=GM_getValue(STORAGE_ENABLED,true) === false ? 'off' : GM_getValue(STORAGE_DISPLAY,'jav') === 'always' ? 'always' : 'jav';
    for (const [value, title] of [['jav', '仅在 JAV 网站显示'], ['always', '在所有网页常驻显示'], ['off','彻底关闭图标']]) {
      const option = element('label');
      const radio = element('input');
      Object.assign(radio, {type:'radio', name:'peach-display', value, checked:displayValue === value});
      option.append(radio, document.createTextNode(title)); display.append(option);
    }
    display.append(element('p','hint','关闭后从篡改猴菜单「开启」恢复。'));
    body.append(display);
    const sound = element('fieldset', 'display-scope');
    sound.append(element('legend', '', '提示音'));
    const soundOption = element('label'), soundInput = element('input');
    Object.assign(soundInput, {type:'checkbox', name:'peach-success-sound', checked:GM_getValue(STORAGE_SOUND, true) !== false});
    soundOption.append(soundInput, document.createTextNode('点加入和影片完成入库时播放提示音'));
    sound.append(soundOption);
    body.append(sound);
    const error = element('p', 'geist-note');
    error.id = 'peach-settings-error';
    error.dataset.variant = 'error';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    body.append(error);
    body.append(updateSection());
    address.input.addEventListener('paste', event => {
      const text = event.clipboardData?.getData('text/plain')?.trim() || '';
      if (!text.startsWith('{')) return;
      event.preventDefault();
      try {
        if (text.length > 4096) throw new Error();
        const pair = JSON.parse(text);
        if (pair.peach_pairing !== 1 || typeof pair.base !== 'string' || typeof pair.token !== 'string') throw new Error();
        const config = settings(pair.base, pair.token);
        address.input.value = config.base;
        secret.input.type = 'password';
        secret.input.value = config.token;
        reveal.textContent = '显示';
        reveal.setAttribute('aria-label', '显示专用令牌');
        reveal.setAttribute('aria-pressed', 'false');
        error.hidden = true;
        for (const input of [address.input, secret.input]) input.removeAttribute('aria-invalid');
        save.focus();
      } catch {
        error.textContent = '配对信息无效，请在 Peach 重新复制，或分别填写地址与令牌。';
        error.hidden = false;
      }
    });
    const footer = element('footer', 'footer');
    const save = control('保存设置', { primary: true });
    save.type = 'submit';
    footer.append(cancel, save);
    bar.append(close, heading);
    form.append(bar, body, footer);
    dialog.append(form);
    shadow.append(dialog);
    overlayScrollbar(body, {square:true});
    let closing = false;
    let closeGeneration = 0;
    settingsView = { root, dialog, base: address.input, reopen() {
      closeGeneration++;
      closing = false;
      dialog.removeAttribute('data-closing');
      coverPanels();
      address.input.focus();
    } };
    coverPanels();
    const cleanup = () => {
      if (!root.isConnected) return;
      closeGeneration++;
      closing = false;
      secret.input.value = '';
      if (settingsView?.root === root) settingsView = null;
      root.remove();
      if (current && !subpageOpen()) {
        current.root.removeAttribute('data-settings-open');
        current.root.inert = false;
      }
      refreshUpdateEntry();
      if (previousFocus?.isConnected) previousFocus.focus();
      else current?.settings.focus();
    };
    const dismiss = async () => {
      if (closing || !dialog.open) return;
      closing = true;
      const run = ++closeGeneration;
      await fadeOut(dialog);
      if (run !== closeGeneration || !closing) return;
      dialog.close();
      cleanup();
    };
    close.addEventListener('click', dismiss);
    cancel.addEventListener('click', dismiss);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (!event.isComposing && !composing) dismiss();
    });
    dialog.addEventListener('close', () => { if (root.isConnected) cleanup(); });
    let composing = false;
    form.addEventListener('compositionstart', () => { composing = true; });
    form.addEventListener('compositionend', () => { composing = false; });
    form.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
        event.preventDefault();
        if (!event.isComposing && !composing) form.requestSubmit();
      }
      if (event.key === 'Escape' && (event.isComposing || composing)) { event.preventDefault(); event.stopPropagation(); }
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (composing || closing) return;
      const range=display.querySelector('input:checked').value;
      if(range==='off' && !saved && !address.input.value.trim() && !secret.input.value.trim()) {
        try{GM_setValue(STORAGE_ENABLED,false);}catch{
          error.textContent='设置未能保存，请检查脚本管理器的存储权限后重试。';error.hidden=false;return;
        }
        dismiss();applyDisplayPreference();return;
      }
      for (const input of [address.input, secret.input]) input.removeAttribute('aria-invalid');
      let config;
      let invalid = address.input;
      try {
        // 换地址时必须重新输入令牌，避免把已存令牌交给另一个服务。
        const base = settings(address.input.value, 'validation-only').base;
        invalid = secret.input;
        const token = secret.input.value || (base === saved?.base ? saved.token : '');
        config = settings(base, token);
      } catch {
        invalid.setAttribute('aria-invalid', 'true');
        invalid.setAttribute('aria-describedby', `${invalid.id}-hint ${error.id}`);
        error.textContent = invalid === address.input
          ? '请输入有效的 Peach 地址，不含路径、查询参数或账号密码。HTTP 仅支持本机地址。'
          : '请输入专用令牌；更换 Peach 地址时需要重新填写令牌。';
        error.hidden = false;
        invalid.focus();
        return;
      }
      try {
        GM_setValue(STORAGE_TOKEN, config.token);
        GM_setValue(STORAGE_BASE, config.base);
        if(range !== 'off')GM_setValue(STORAGE_DISPLAY,range);
        GM_setValue(STORAGE_ENABLED,range !== 'off');
        GM_setValue(STORAGE_SOUND,soundInput.checked);
      } catch {
        error.textContent = '设置未能保存，请检查脚本管理器的存储权限后重试。';
        error.hidden = false;
        return;
      }
      dismiss();
      panelMode = 'minimized'; entryOpen = false;
      pageKey = '';
      refresh();
      paintAllUpdates();
      for (const node of surfaces) if (node.isConnected) applyAppearance(node);
      if (current) present(current, 'minimized', true);
      else updateEntry?.launcher.focus();
    });
    if (switching) dialog.setAttribute('data-switch', '');
    dialog.showModal();
    placeSurface(root);
  }

  GM_registerMenuCommand('开启', activateInterface);
  GM_registerMenuCommand('检测更新', () => { configure(); void checkUpdates(true); });
  GM_registerMenuCommand('设置', configure);

  let reporting = false;
  let reportAfter = 0;
  function pendingErrors() {
    try {
      const rows = JSON.parse(GM_getValue(STORAGE_ERRORS, '[]'));
      return Array.isArray(rows) ? rows.filter(row => row && typeof row.base === 'string' && row.event
        && typeof row.event.id === 'string' && Date.now() - Date.parse(row.event.at) < 7 * 86400_000).slice(-20) : [];
    } catch { return []; }
  }

  function flushErrors(config) {
    if (reporting || Date.now() < reportAfter) return;
    const rows = pendingErrors().filter(row => row.base === config.base).slice(0, 10);
    if (!rows.length) return;
    reporting = true;
    reportAfter = Date.now() + 60_000;
    const done = () => { reporting = false; };
    try {
      GM_xmlhttpRequest({ method: 'POST', url: `${config.base}/api/jav-browser/errors`, anonymous: true,
        headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' }, timeout: 5000,
        data: JSON.stringify({ events: rows.map(row => row.event) }),
        onload(response) {
          try {
            if (response.status >= 200 && response.status < 300 && Number.isInteger(JSON.parse(response.responseText).recorded)) {
              const ids = new Set(rows.map(row => row.event.id));
              GM_setValue(STORAGE_ERRORS, JSON.stringify(pendingErrors().filter(row => !ids.has(row.event.id))));
            }
          } catch { /* 错误取证不影响添加和状态查询。 */ }
          done();
        }, onerror: done, ontimeout: done, onabort: done,
      });
    } catch { done(); }
  }

  function rememberError(config, code, source, operation, kind, elapsed, status) {
    try {
      const site = siteFor(new URL(source));
      if (!site) return;
      const event = { id: crypto.randomUUID(), at: new Date().toISOString(), kind, operation, site: site.id,
        code, elapsed_ms: Math.min(3_600_000, Math.max(0, Math.round(elapsed))), status, script_version: SCRIPT_VERSION };
      GM_setValue(STORAGE_ERRORS, JSON.stringify([...pendingErrors(), { base: config.base, event }].slice(-20)));
      flushErrors(config);
    } catch { /* GM 存储不可用时保留原操作的错误反馈。 */ }
  }

  function request(config, code, source, method, resolveIdentity = false, extra = {}) {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      const fail = (kind, message, status = 0) => {
        rememberError(config, resolveIdentity ? '' : code, source, resolveIdentity ? 'IDENTIFY' : method,
          kind, performance.now() - started, status);
        reject(Object.assign(new Error(message), { kind, status }));
      };
      const headers = { Authorization: `Bearer ${config.token}`, Accept: 'application/json' };
      if (method === 'POST') headers['Content-Type'] = 'application/json';
      try {
        GM_xmlhttpRequest({
          method,
          url: resolveIdentity ? `${config.base}/api/jav-browser/identify?source_url=${encodeURIComponent(source)}${code ? `&code=${encodeURIComponent(code)}` : ''}`
            : `${config.base}/api/jav-browser${method === 'GET' ? `?code=${encodeURIComponent(code)}` : ''}`,
          headers,
          ...(method === 'POST' ? { data: JSON.stringify({...(source ? {code, source_url:source} : {code, manual:true}), ...extra}) } : {}),
          anonymous: true,
          timeout: 60_000,
          onload(response) {
            if (response.status < 200 || response.status >= 300) {
              let detail = '';
              try { const value = JSON.parse(response.responseText).detail; if (typeof value === 'string' && value.length <= 200) detail = value; } catch { /* 非 JSON 错误使用 HTTP 状态提示。 */ }
              fail('http', response.status === 401 || response.status === 403 ? '令牌无效或无权限，请重新配置。'
                : response.status >= 500 ? 'Peach 服务暂时不可用，请稍后查询状态。'
                : response.status === 429 ? 'Peach 请求过于频繁，请稍后查询。'
                : resolveIdentity && [404, 405].includes(response.status) ? 'Peach 尚不支持商品号识别，请更新 Peach。'
                : response.status === 400 && detail ? detail
                : resolveIdentity ? '未识别到作品番号，请选中页面的完整番号后加入 Peach。' : 'Peach 请求失败，请查询状态。', response.status);
              return;
            }
            try {
              const body = JSON.parse(response.responseText);
              if (body.ok !== true || !STATES.has(body.state) || typeof body.code !== 'string'
                || candidates(body.code).size !== 1
                || ((!resolveIdentity || code) && ![...candidates(body.code)].some(candidate => samePeachCode(candidate, code)))) throw new Error();
              resolve(body);
              flushErrors(config);
            } catch { fail('invalid_response', 'Peach 返回的状态无效，请查询状态。', response.status); }
          },
          onerror: () => fail('network', '无法连接 Peach，请查询状态。'),
          ontimeout: () => fail('timeout', 'Peach 请求超时，请查询状态。'),
          onabort: () => fail('abort', 'Peach 请求已中止，请查询状态。'),
        });
      } catch { fail('client_exception', '无法连接 Peach，请查询状态。'); }
    });
  }

  function alive(view) { return current === view && generation === view.generation && view.url === location.href; }

  function present(view, mode, focus = false) {
    if (!alive(view)) return;
    closeTaskPage(view.panel);
    panelMode = mode;
    view.presentation?.cancel();
    const minimized = mode === 'minimized';
    const expanded = mode === 'expanded';
    view.root.dataset.panelMode = mode;
    view.panel.hidden = minimized;
    view.launcher.hidden = !minimized;
    view.body.hidden = !expanded;
    view.body.inert = !expanded;
    view.summary.hidden = expanded;
    view.summary.textContent = mode === 'collapsed' ? view.note.textContent : '';
    view.collapse.setAttribute('aria-expanded', String(expanded));
    view.collapse.setAttribute('aria-label', expanded ? '折叠 Peach 详情' : '展开 Peach 详情');
    placeSurface(view.root);
    if (focus) {
      (minimized ? view.launcher : view.collapse).focus();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const target = minimized ? view.launcher : view.panel;
        view.presentation = target.animate([{opacity:0, transform:'translateY(4px) scale(.97)'}, {opacity:1, transform:'translateY(0) scale(1)'}],
          {duration:200, easing:'ease-in-out'});
      }
    }
  }

  // Peach 里这部作品的详情页；只在馆藏已有或已入库、Peach 带回作品编号时有。
  function libraryLink(view) {
    const config = configuration();
    return config && view.assetId && ['ingested', 'owned'].includes(view.state) ? `${config.base}/assets/${view.assetId}` : '';
  }

  function render(view) {
    if (!alive(view)) return;
    view.summary.textContent = panelMode === 'collapsed' ? view.note.textContent : '';
    const terminalSuccess = ['ingested', 'owned'].includes(view.state) && !view.tracking && !view.organizeFailed;
    const opens = Boolean(terminalSuccess && libraryLink(view));
    view.button.disabled = view.busy || view.identity.conflict || terminalSuccess && !opens;
    view.button.setAttribute('aria-busy', String(view.busy));
    view.button.setAttribute('aria-disabled', String(view.busy || view.button.disabled));
    view.button.textContent = view.identity.conflict ? '番号存在冲突'
      : !configuration() ? '配置 Peach'
      : view.organizeFailed && !view.busy ? '重试整理'
      : opens ? '在 Peach 中打开'
      : terminalSuccess ? '已有该影片'
      : view.busy ? '正在查询 Peach'
      : view.queryOnly || ACTIVE.has(view.state) ? '查询 Peach 状态'
      : view.state === 'failed' && view.cause === 'magnet' ? '换一个磁力'
      : ['failed', 'no_match'].includes(view.state) ? '重试加入 Peach 馆藏' : '加入 Peach 馆藏';
    if (view.busy) {
      const spinner = element('span', 'ui-geist-spinner');
      spinner.setAttribute('aria-hidden', 'true');
      for (let index = 0; index < 12; index++) {
        const segment = element('i');
        segment.style.setProperty('--spinner-angle', `${index * 30}deg`);
        segment.style.setProperty('--spinner-delay', `${index / 12 - 1}s`);
        spinner.append(segment);
      }
      view.button.prepend(spinner);
    }
    placeSurface(view.root);
  }

  function tracking(body) {
    return ACTIVE.has(body.state) || (body.state === 'ingested'
      && ['pending', 'queued', 'running'].includes(body.download?.postprocess_state));
  }

  function organizeFailed(body) {
    return body.state === 'ingested' && body.download?.postprocess_state === 'failed';
  }

  // 重试入库后失败的整理，与 Peach 任务中心的「重试整理」同一入口；旧版 Peach 没有这个接口。
  function requestRetryOrganize(config, code) {
    return new Promise((resolve, reject) => {
      try {
        GM_xmlhttpRequest({ method: 'POST', url: `${config.base}/api/jav-browser/postprocess`, anonymous: true, timeout: 60_000,
          headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
          data: JSON.stringify({ code }),
          onload(response) {
            let detail = '';
            try { const value = JSON.parse(response.responseText).detail; if (typeof value === 'string' && value.length <= 200) detail = value; } catch { /* 非 JSON 错误按状态提示。 */ }
            if ([404, 405].includes(response.status)) { reject(new Error('Peach 尚不支持在脚本里重试整理，请在 Peach 任务中心重试或更新 Peach。')); return; }
            if (response.status === 401 || response.status === 403) { reject(new Error('令牌无效或无权限，请重新配置。')); return; }
            if (response.status !== 200) { reject(new Error(detail || '重试整理未成功，请在 Peach 任务中心查看。')); return; }
            try {
              const body = JSON.parse(response.responseText);
              if (body.ok !== true || !STATES.has(body.state) || typeof body.code !== 'string' || !samePeachCode(body.code, code)) throw new Error();
              resolve(body);
            } catch { reject(new Error('Peach 返回的状态无效，请查询状态。')); }
          },
          onerror: () => reject(new Error('无法连接 Peach，请稍后重试。')), ontimeout: () => reject(new Error('Peach 请求超时，请查询状态。')),
          onabort: () => reject(new Error('Peach 请求已中止。')),
        });
      } catch { reject(new Error('无法连接 Peach，请稍后重试。')); }
    });
  }

  async function retryOrganize(view) {
    const config = configuration();
    if (!config) { configure(); return; }
    view.busy = true; render(view);
    try {
      const body = await requestRetryOrganize(config, view.identity.code);
      if (!alive(view)) return;
      applyState(view, body);
      void sharedTick(true);
    } catch (error) {
      if (alive(view)) { view.note.textContent = error.message; view.note.hidden = false; view.note.dataset.variant = 'error'; }
    } finally {
      if (alive(view)) {
        view.busy = false; render(view);
        // 没有共享进度时由本页接着查询整理进度。
        if (!sharedMode() && view.tracking) void query(view);
      }
    }
  }

  // 整个流程走完：已入库且整理不再进行，整理失败不算完成。
  function finished(body) {
    return body.state === 'ingested' && !tracking(body) && body.download?.postprocess_state !== 'failed';
  }

  // 跨窗口共享进度：持锁窗口查 Peach 的进行中任务列表，有任务时每 4 秒、没有时每 30 秒一次，结果写入快照；
  // 其余窗口只读快照。锁 45 秒过期；后台页的定时器会被浏览器放慢，可见窗口发现锁在后台页手里就接管。
  // Peach 没有列表接口时快照记为不可用，各窗口退回自己逐个查询。
  const SHARED_BUSY_MS = 4000, SHARED_IDLE_MS = 30_000, LEASE_MS = 45_000;
  const sharedLists = new Set();
  let sharedSnapshot = readShared(), sharedTimer, sharedFetching = false, sharedFetchedAt = 0;

  function readShared() {
    try {
      const value = JSON.parse(GM_getValue(STORAGE_TASKS, '{}'));
      return value.version === 1 && typeof value.base === 'string' && Array.isArray(value.items) ? value : null;
    } catch { return null; }
  }

  function sharedMode() {
    return sharedSnapshot?.available === true && sharedSnapshot.base === configuration()?.base;
  }

  function requestActive(config) {
    return new Promise((resolve, reject) => {
      try {
        GM_xmlhttpRequest({ method: 'GET', url: `${config.base}/api/jav-browser/active`, anonymous: true, timeout: 30_000,
          headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/json' },
          onload(response) {
            if ([404, 405].includes(response.status)) { resolve(null); return; }
            try {
              if (response.status !== 200 || response.responseText.length > 2 * 1024 * 1024) throw new Error();
              resolve(activeItems(JSON.parse(response.responseText)));
            } catch { reject(new Error('Peach 返回的任务列表无效')); }
          },
          onerror: () => reject(new Error('无法连接 Peach')), ontimeout: () => reject(new Error('Peach 请求超时')),
          onabort: () => reject(new Error('Peach 请求已中止')),
        });
      } catch { reject(new Error('无法连接 Peach')); }
    });
  }

  function activeItems(data) {
    if (data?.ok !== true || !Array.isArray(data.items)) throw new Error();
    return data.items.filter(body => body?.ok === true && STATES.has(body.state) && typeof body.code === 'string'
      && candidates(body.code).size === 1).slice(0, 200);
  }

  // 确认已结束的任务，返回 Peach 的新任务列表；旧版 Peach 没有这个接口。
  function requestDismiss(config, request) {
    return new Promise((resolve, reject) => {
      try {
        GM_xmlhttpRequest({ method: 'POST', url: `${config.base}/api/jav-browser/dismiss`, anonymous: true, timeout: 30_000,
          headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
          data: JSON.stringify(request),
          onload(response) {
            if ([404, 405].includes(response.status)) { reject(new Error('Peach 尚不支持确认已结束的任务，请更新 Peach。')); return; }
            if (response.status === 401 || response.status === 403) { reject(new Error('令牌无效或无权限，请重新配置。')); return; }
            try {
              if (response.status !== 200 || response.responseText.length > 2 * 1024 * 1024) throw new Error();
              resolve(activeItems(JSON.parse(response.responseText)));
            } catch { reject(new Error('没有确认成功，请稍后重试。')); }
          },
          onerror: () => reject(new Error('无法连接 Peach，请稍后重试。')), ontimeout: () => reject(new Error('Peach 请求超时，请稍后重试。')),
          onabort: () => reject(new Error('Peach 请求已中止。')),
        });
      } catch { reject(new Error('无法连接 Peach，请稍后重试。')); }
    });
  }

  // 写快照的窗口在任务由进行中走到整理完成时响一次；响过的任务记入共享存储，别的窗口不再响。
  function chimeTransitions(previous, items) {
    const before = new Map(previous.map(body => [comparisonKey(body.code), body]));
    let chimed = {};
    try { chimed = JSON.parse(GM_getValue(STORAGE_CHIMED, '{}')) || {}; } catch { /* 记录损坏时从空开始。 */ }
    const now = Date.now();
    let play = false;
    for (const body of items) {
      const key = `${comparisonKey(body.code)}:${body.task_id ?? ''}`, old = before.get(comparisonKey(body.code));
      if (finished(body) && old && tracking(old) && !chimed[key]) { chimed[key] = now; play = true; }
    }
    if (!play) return;
    GM_setValue(STORAGE_CHIMED, JSON.stringify(Object.fromEntries(Object.entries(chimed).filter(([, at]) => now - at < 86_400_000))));
    playSound('success');
  }

  // force：本窗口刚提交任务，立刻刷新一次快照并接过轮询。
  async function sharedTick(force = false) {
    clearTimeout(sharedTimer);
    sharedTimer = setTimeout(() => void sharedTick(), SHARED_BUSY_MS);
    const config = configuration();
    if (!config || sharedFetching || updateDisposed || !pageInterfaceAllowed()) return;
    let lease = null;
    try { lease = JSON.parse(GM_getValue(STORAGE_POLLER, 'null')); } catch { /* 损坏的锁视为空闲。 */ }
    const now = Date.now(), visible = document.visibilityState === 'visible', mine = lease?.owner === WINDOW_ID;
    if (!force && !mine && lease && lease.until > now && (lease.visible || !visible)) return;
    GM_setValue(STORAGE_POLLER, JSON.stringify({ owner: WINDOW_ID, until: now + LEASE_MS, visible }));
    const interval = sharedSnapshot?.items.some(tracking) ? SHARED_BUSY_MS : SHARED_IDLE_MS;
    if (!force && mine && now - sharedFetchedAt < interval - 500) return;
    sharedFetching = true; sharedFetchedAt = now;
    try {
      const items = await requestActive(config);
      if (configuration()?.base !== config.base) return;
      const previous = readShared();
      if (items) chimeTransitions(previous?.base === config.base ? previous.items : [], items);
      const snapshot = { version: 1, base: config.base, at: Date.now(), available: items !== null, items: items || [] };
      GM_setValue(STORAGE_TASKS, JSON.stringify(snapshot));
      applyShared(snapshot);
    } catch { /* 连接异常保留上一份快照，下一轮再查。 */ }
    finally { sharedFetching = false; }
  }

  // 快照里有本页番号或本页番号列表里的番号时，按快照更新；提交或查询中的不打断。
  function applyShared(snapshot) {
    sharedSnapshot = snapshot;
    if (sharedMode()) {
      const items = new Map(snapshot.items.map(body => [comparisonKey(body.code), body]));
      const view = current;
      if (view && alive(view) && !view.busy && !view.identity.resolve && !view.identity.conflict) {
        const body = items.get(comparisonKey(view.identity.code)), signature = body && JSON.stringify(body);
        if (body && signature !== view.sharedSignature) { view.sharedSignature = signature; applyState(view, body); }
      }
      if (batchView?.root.isConnected) {
        let changed = false;
        for (const item of batchView.rows) {
          const body = items.get(comparisonKey(item.code));
          if (!body || !item.row.dataset.state || item.row.dataset.state === 'sending') continue;
          const signature = JSON.stringify(body);
          if (signature !== item.sharedSignature) { item.sharedSignature = signature; applyRowStatus(item, body); changed = true; }
        }
        if (changed && !batchView.busy) batchView.paint();
      }
    }
    paintShared();
  }

  function sharedSection() {
    const node = element('section', 'shared-tasks');
    node.setAttribute('aria-label', '其他 Peach 任务');
    sharedLists.add(node);
    paintSharedList(node);
    return node;
  }

  function paintShared() {
    for (const node of sharedLists) {
      if (!node.isConnected) { sharedLists.delete(node); continue; }
      paintSharedList(node); paintTaskPage(node.closest('.panel'));
    }
    // 角标：有进行中的显示进行中数量；都结束了还有没确认的，换成已结束的数量。
    const running = sharedMode() ? sharedSnapshot.items.filter(tracking).length : 0;
    const ended = running ? 0 : otherTasks().filter(awaitingAck).length;
    for (const launcher of [current?.launcher, updateEntry?.launcher]) {
      if (!launcher) continue;
      const count = running || ended;
      if (count) launcher.dataset.count = count > 99 ? '99+' : String(count); else delete launcher.dataset.count;
      if (ended) launcher.dataset.countTone = 'ended'; else delete launcher.dataset.countTone;
      launcher.title = running ? `Peach 有 ${running} 项任务进行中` : ended ? `Peach 有 ${ended} 项任务已结束，待确认` : '';
    }
    for (const root of surfaces) if (root.isConnected) placeSurface(root);
  }

  function chevronIcon(className, d) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', className);
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', d); svg.append(path);
    return svg;
  }

  // 其他任务的人物头像按番号与状态缓存：入库后账本可能认出人物，状态变化时重新取一次。
  const sharedPeople = new Map();
  let sharedPeopleLoading = false;
  const peopleKey = body => `${comparisonKey(body.code)}:${body.state}`;

  function loadSharedPeople(items) {
    const config = configuration();
    if (!config || sharedPeopleLoading) return;
    const missing = items.filter(body => !sharedPeople.has(peopleKey(body))).slice(0, 50);
    if (!missing.length) return;
    sharedPeopleLoading = true;
    requestPeople(config, [...new Set(missing.map(body => body.code))]).then(result => {
      const keyed = new Map(Object.entries(result.items).map(([code, people]) => [comparisonKey(code), people]));
      for (const body of missing) sharedPeople.set(peopleKey(body), result.items[body.code] ?? keyed.get(comparisonKey(body.code)) ?? []);
    }).catch(() => {
      for (const body of missing) sharedPeople.set(peopleKey(body), []);
    }).finally(() => { sharedPeopleLoading = false; paintShared(); });
  }

  function sharedAvatars(body) {
    const node = element('span', 'batch-people');
    try { renderPeople(node, sharedPeople.get(peopleKey(body)) || []); } catch { node.replaceChildren(defaultPersonAvatar()); }
    return node;
  }

  // 其他任务超过 3 项，或本页番号正在抓取时，列表自动折叠；手动展开或折叠一直有效，直到自动条件变化。
  const SHARED_FOLD_LIMIT = 3;

  // 其他番号：本页番号已有整体进度，不在这里列。确认过的已结束任务不再列出。
  const ownKey = () => current && alive(current) && !current.identity.conflict ? comparisonKey(current.identity.code) : '';
  function otherTasks() {
    const own = ownKey();
    return sharedMode() ? sharedSnapshot.items.filter(body => comparisonKey(body.code) !== own && body.dismissed !== true) : [];
  }

  // 结束后等用户确认的任务：Peach 给了确认键的才能确认；旧版 Peach 没有，照旧 10 分钟后自行离开列表。
  const awaitingAck = body => !tracking(body) && typeof body.ended_key === 'string' && body.dismissed !== true;

  // 进行中的在前，已结束的在后；每项一行，点开进入该番号的进度页，已结束的行尾可以标为已读。
  // 标题与列表跨重绘保留，开合状态变了（点标题或自动条件变化）才播高度过渡。
  function paintSharedList(node) {
    const items = otherTasks();
    node.hidden = !items.length;
    const focused = node.getRootNode().activeElement?.closest?.('.shared-row');
    // 列表空了只藏起整段，标题、提示与开合状态留着，确认失败时提示仍有处可写。
    if (!items.length) return;
    loadSharedPeople(items);
    const auto = items.length > SHARED_FOLD_LIMIT || Boolean(ownKey() && (current.tracking || current.busy));
    if (node.foldChoice && node.foldChoice.auto !== auto) node.foldChoice = null;
    const open = node.foldChoice ? node.foldChoice.open : !auto;
    const running = items.filter(tracking), ended = items.filter(body => !tracking(body));
    if (!node.parts) {
      const heading = element('button', 'shared-heading'), label = element('span');
      heading.type = 'button';
      heading.append(label, chevronIcon('shared-fold', 'm6 9 6 6 6-6'));
      heading.addEventListener('click', () => {
        node.foldChoice = { auto: node.parts.auto, open: !node.parts.open };
        paintSharedList(node);
      });
      const retryAll = element('button', 'shared-action', '重试失败项');
      retryAll.type = 'button';
      retryAll.addEventListener('click', () => void retryFailed(node));
      const clear = element('button', 'shared-action', '全部标为已读');
      clear.type = 'button';
      clear.addEventListener('click', () => void acknowledgeEnded(node, { all: true }));
      const foot = element('div', 'shared-foot'); foot.append(retryAll, clear);
      const note = element('p', 'geist-note shared-note');
      note.dataset.variant = 'error'; note.setAttribute('role', 'alert'); note.hidden = true;
      const body = element('div', 'shared-body fold-settled'), list = element('ul', 'shared-list');
      body.hidden = !open;
      body.append(list, foot);
      node.replaceChildren(heading, note, body);
      overlayScrollbar(list, { square: true });
      node.parts = { heading, label, retryAll, clear, note, body, list, open };
    }
    const { heading, label, retryAll, clear, body: fold, list } = node.parts;
    label.textContent = ['其他任务', running.length ? `进行中 ${running.length} 项` : '', ended.length ? `已结束 ${ended.length} 项` : '']
      .filter(Boolean).join(' · ');
    clear.hidden = !ended.some(awaitingAck);
    retryAll.hidden = !ended.some(retryableTask);
    heading.setAttribute('aria-expanded', String(open));
    if (open !== node.parts.open) setFoldOpen(fold, open, () => placeSurface(node.getRootNode().host));
    Object.assign(node.parts, { auto, open });
    const rows = [];
    for (const body of [...running, ...ended].slice(0, 20)) {
      const row = element('button', 'shared-row'), status = element('span', 'chip');
      row.type = 'button'; row.dataset.code = body.code;
      row.append(sharedAvatars(body), element('span', 'shared-code', body.code), status, chevronIcon('shared-chevron', 'm9 6 6 6-6 6'));
      setRowState({ row, status }, ...rowState(body));
      row.setAttribute('aria-label', `${body.code}，${status.textContent}，查看进度`);
      row.addEventListener('click', () => openTaskPage(node.closest('.panel'), body.code));
      const item = element('li', 'shared-item'); item.append(row);
      if (awaitingAck(body)) {
        const dismiss = control(`将 ${body.code} 标为已读`, { icon: 'close' });
        dismiss.addEventListener('click', () => {
          // 标为已读后焦点交给下一行，最后一行交给上一行，列表空了交给标题。
          const next = (item.nextElementSibling || item.previousElementSibling)?.querySelector('.shared-row')?.dataset.code;
          void acknowledgeEnded(node, { keys: [body.ended_key] });
          ([...list.querySelectorAll('.shared-row')].find(row => row.dataset.code === next) || heading).focus();
        });
        item.append(dismiss);
      }
      rows.push(item);
    }
    list.replaceChildren(...rows);
    if (focused) [...list.querySelectorAll('.shared-row')].find(row => row.dataset.code === focused.dataset.code)?.focus();
  }

  // 失败的其他任务可以重试：入库后整理失败的走「重试整理」，其余按原来源重新加入，磁力本身的问题换一个磁力。
  const retryableTask = body => !tracking(body) && (['failed', 'no_match'].includes(body.state) || organizeFailed(body));
  const switchesMagnet = body => body.state === 'failed' && body.cause === 'magnet';
  const retryLabel = body => organizeFailed(body) ? '重试整理' : switchesMagnet(body) ? '换一个磁力' : '重试加入';
  function retryTask(config, body) {
    if (organizeFailed(body)) return requestRetryOrganize(config, body.code);
    return request(config, body.code, typeof body.source_url === 'string' ? body.source_url : '', 'POST', false,
      switchesMagnet(body) ? { switch: true } : {});
  }

  // 列表底部「重试失败项」：逐项重试列出的失败任务，一项出错不影响其余，最后取一次新列表。
  async function retryFailed(node) {
    const config = configuration(), parts = node.parts;
    if (!config || !parts || parts.retryAll.disabled) return;
    const failed = otherTasks().filter(retryableTask).slice(0, 20);
    parts.retryAll.disabled = true; parts.note.hidden = true;
    let errors = 0, reason = '';
    for (const body of failed) {
      try { await retryTask(config, body); } catch (error) { errors++; reason = error.message; }
    }
    parts.retryAll.disabled = false;
    await sharedTick(true);
    if (errors && parts.note.isConnected) {
      parts.note.textContent = `${errors} 项没有重试成功：${reason}`; parts.note.hidden = false;
      placeSurface(parts.note.getRootNode().host);
    }
  }

  // 确认已结束的任务。先在本地标为已确认并写进共享快照，各窗口立刻收起；Peach 返回的列表再作为新快照。
  async function acknowledgeEnded(node, request) {
    const config = configuration();
    if (!config || !sharedMode()) return;
    if (node?.parts) node.parts.note.hidden = true;
    const keys = new Set(request.keys || []);
    const marked = sharedSnapshot.items.map(body => awaitingAck(body) && (request.all || keys.has(body.ended_key)) ? { ...body, dismissed: true } : body);
    const local = { ...sharedSnapshot, at: Date.now(), items: marked };
    GM_setValue(STORAGE_TASKS, JSON.stringify(local)); applyShared(local);
    try {
      const items = await requestDismiss(config, request.all ? { all: true } : { keys: [...keys] });
      if (configuration()?.base !== config.base) return;
      const snapshot = { version: 1, base: config.base, at: Date.now(), available: true, items };
      GM_setValue(STORAGE_TASKS, JSON.stringify(snapshot)); applyShared(snapshot);
    } catch (error) {
      void sharedTick(true);
      const note = node?.parts?.note;
      if (note?.isConnected) { note.textContent = error.message; note.hidden = false; placeSurface(note.getRootNode().host); }
    }
  }

  // 折叠正文的高度过渡，与 Peach frontend/src/ui-kit/collapse.ts 的 setCollapseRegionOpen 同一做法：
  // 量出起止高度写进 inline height，跑完交回自然高度；过渡途中又被反向点按时，前一次的收尾不再做。
  const foldRuns = new WeakMap();
  function setFoldOpen(body, open, place) {
    const run = (foldRuns.get(body) || 0) + 1;
    foldRuns.set(body, run);
    const finish = done => {
      let finished = false;
      const end = event => {
        if ((event && event.propertyName !== 'height') || finished) return;
        finished = true; body.removeEventListener('transitionend', end); clearTimeout(timer);
        if (foldRuns.get(body) === run) { done(); place(); }
      };
      body.addEventListener('transitionend', end);
      // 减少动效时没有 transitionend，260ms 兜底。
      const timer = setTimeout(end, 260);
    };
    body.classList.remove('fold-settled');
    if (open) {
      const start = body.hidden ? 0 : body.getBoundingClientRect().height;
      body.hidden = false; body.inert = false;
      body.style.height = `${start}px`; body.getBoundingClientRect();
      body.style.height = `${body.scrollHeight}px`;
      finish(() => { body.style.height = ''; body.classList.add('fold-settled'); });
    } else {
      body.inert = true;
      body.style.height = `${body.getBoundingClientRect().height}px`; body.getBoundingClientRect();
      body.style.height = '0px';
      finish(() => { body.hidden = true; body.inert = false; body.style.height = ''; });
    }
    place();
  }

  // 其他任务的进度页：在同一张浮卡里替换主页，显示该番号的五段整体进度与状态说明；返回回到主页。
  function openTaskPage(panel, code) {
    if (!panel) return;
    closeTaskPage(panel);
    const page = element('section', 'task-page');
    page.setAttribute('aria-label', `${code} 的任务进度`);
    const bar = element('header', 'bar subpage-bar');
    const back = control('返回 Peach 主页', { icon: 'back' });
    const title = element('div', 'bar-title'), people = element('span', 'batch-people');
    people.append(defaultPersonAvatar());
    title.append(people, element('strong', '', code));
    // 右上角与主页同一组：设置、折叠、隐藏，点了交给主页标题栏上的那一枚。
    const actions = element('div', 'bar-actions');
    for (const [label, icon] of [['Peach 设置', 'settings'], ['折叠 Peach 详情', 'collapse'], ['隐藏 Peach 面板', 'close']]) {
      const proxy = control(label, { icon });
      if (icon === 'collapse') proxy.setAttribute('aria-expanded', 'true');
      proxy.addEventListener('click', () => panel.querySelector(`:scope > .bar [aria-label="${label}"]`)?.click());
      actions.append(proxy);
    }
    bar.append(back, title, actions);
    const body = element('div', 'body');
    const note = element('p', 'geist-note');
    note.setAttribute('role', 'status'); note.setAttribute('aria-live', 'polite'); note.setAttribute('aria-label', `${code} 的任务状态`);
    const parts = buildFlow();
    // 失败的番号在进度页直接重试，按钮文字随失败原因变：重试整理、换一个磁力或重试加入。
    const retry = control('重试加入');
    retry.hidden = true;
    retry.addEventListener('click', async () => {
      const config = configuration(), body = panel.taskPage?.body;
      if (!config || !body || retry.disabled) return;
      retry.disabled = true;
      try {
        const result = await retryTask(config, body);
        if (panel.taskPage?.page === page) { panel.taskPage.body = result; paintTaskPage(panel); }
        void sharedTick(true);
      } catch (error) {
        if (panel.taskPage?.page === page) { note.textContent = error.message; note.dataset.variant = 'error'; }
      } finally { retry.disabled = false; }
    });
    // 已结束、等确认的番号：标为已读并回到主页。
    const ack = control('标为已读');
    ack.hidden = true;
    ack.addEventListener('click', () => {
      const key = panel.taskPage?.body?.ended_key;
      if (!key) return;
      void acknowledgeEnded(panel.querySelector('.shared-tasks'), { keys: [key] });
      closeTaskPage(panel, true);
    });
    body.append(note, parts.flow, retry, ack);
    page.append(bar, body);
    switchPanel(panel, () => {
      for (const child of panel.children) if (!child.hidden) { child.hidden = true; child.dataset.taskHidden = ''; }
      panel.append(page);
      panel.taskPage = { page, code, note, people, retry, ack, body: null, ...parts };
      paintTaskPage(panel);
      return [page];
    });
    back.addEventListener('click', () => closeTaskPage(panel, true));
    back.focus();
  }

  // focus：用户点了返回，回到主页并播返回动效；切换面板模式时直接收起。
  function closeTaskPage(panel, focus = false) {
    const open = panel?.taskPage;
    if (!open) return;
    const restore = () => {
      open.page.remove(); panel.taskPage = null;
      const shown = [...panel.querySelectorAll(':scope > [data-task-hidden]')];
      for (const child of shown) { child.hidden = false; delete child.dataset.taskHidden; }
      return shown;
    };
    if (focus) switchPanel(panel, restore);
    else { panel.motion?.forEach(animation => animation.cancel()); restore(); }
    // 回到这一行；这一行已确认收起时回到「其他任务」标题。
    if (focus) ([...panel.querySelectorAll('.shared-row')].find(row => row.dataset.code === open.code)
      || panel.querySelector('.shared-heading'))?.focus();
    for (const root of surfaces) if (root.isConnected) placeSurface(root);
  }

  // 主页与进度页在同一张浮卡里切换：浮卡高度从旧值过渡到新值，进来的一层播 Peach 设置面板的
  // board-dialog-in（缩放、模糊、淡入），时长与缓动同 --board-dialog-motion。浮卡按底边定位，高度变化向上长，不会跳位。
  function switchPanel(panel, change) {
    const from = panel.getBoundingClientRect().height;
    panel.motion?.forEach(animation => animation.cancel());
    const entering = change();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !from) return;
    const to = panel.getBoundingClientRect().height, timing = { duration: 300, easing: 'cubic-bezier(.32,.72,0,1)' };
    panel.motion = [panel.animate([{ height: `${from}px` }, { height: `${to}px` }], timing),
      ...entering.map(node => node.animate([{ opacity: 0, transform: 'scale(.85)', filter: 'blur(4px)' },
        { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }], timing))];
  }

  // 番号确认过或由旧版 Peach 列出时，结束 10 分钟后离开快照，进度页保留最后一次看到的状态。
  function paintTaskPage(panel) {
    const open = panel?.taskPage;
    if (!open) return;
    const key = comparisonKey(open.code);
    open.body = (sharedMode() && sharedSnapshot.items.find(body => comparisonKey(body.code) === key)) || open.body;
    if (!open.body) return;
    renderFlow(open, open.body);
    if (sharedPeople.has(peopleKey(open.body))) {
      const people = sharedAvatars(open.body);
      open.people.replaceWith(people); open.people = people;
    }
    open.note.textContent = statusLabel(open.body);
    open.note.dataset.variant = statusVariant(open.body);
    open.retry.hidden = !retryableTask(open.body);
    open.retry.textContent = retryLabel(open.body);
    open.ack.hidden = !awaitingAck(open.body);
    for (const root of surfaces) if (root.isConnected) placeSurface(root);
  }

  function renderFlow(view, body) {
    const download = body?.download;
    let current = -1;
    let completed = 0;
    let fraction = 0;
    const failed = ['failed', 'no_match'].includes(body?.state) || download?.postprocess_state === 'failed';
    if (body?.state === 'queued') current = 0;
    else if (body?.state === 'searching') current = body.stage === 'submitting' ? 2 : 1;
    else if (body?.state === 'submitted' || body?.state === 'ingested' || failed) {
      if (download?.state === 'ingested' || body.state === 'ingested') {
        if (['complete', 'not_requested'].includes(download?.postprocess_state)) completed = 5;
        else if (download?.postprocess_state) current = 4;
        else completed = 4;
      } else if (download?.phase === 'ingest' || ['remote_done', 'landed'].includes(download?.state)) current = 3;
      else if (download || body.state === 'submitted') current = 2;
      else current = 1;
    }
    if (current >= 0) completed = current;
    if (current === 2 && !failed && download?.state === 'remote_running'
        && typeof download.progress === 'number' && Number.isFinite(download.progress)) fraction = Math.min(1, Math.max(0, download.progress));
    view.flow.toggleAttribute('hidden', !body || ['idle', 'owned'].includes(body.state));
    view.progress.setAttribute('aria-valuenow', String(Math.round((completed + fraction) * 1000) / 1000));
    view.progress.setAttribute('aria-valuetext', download?.state === 'ingested' && download.postprocess_state === 'not_requested'
      ? '流程完成，整理未请求' : `${completed} 个阶段已完成${current >= 0 ? `，${failed ? '未完成' : '当前'}：${['排队', '搜索', '下载', '入库', '整理'][current]}` : ''}`);
    view.progressFill.setAttribute('width', String((completed + fraction) * 20));
    view.steps.forEach((step, index) => {
      const skipped = download?.state === 'ingested' && download.postprocess_state === 'not_requested' && index === 4;
      const state = skipped ? 'skipped' : index < completed ? 'complete' : index === current ? failed ? 'error' : 'current' : 'pending';
      step.dataset.state = state;
      if (index === current) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
      step.querySelector('.flow-mark path').setAttribute('d', state === 'complete' ? STEP_ICON_PATHS.check : state === 'error' ? STEP_ICON_PATHS.error : state === 'skipped' ? STEP_ICON_PATHS.skipped : STAGE_ICON_PATHS[index]);
      step.setAttribute('aria-label', `${['排队', '搜索', '下载', '入库', '整理'][index]}，${{complete:'已完成',current:'当前阶段',error:'未完成',skipped:'未请求',pending:'待处理'}[state]}`);
    });
  }

  function applyState(view, body) {
    if (view.identity.resolve) {
      view.identity.pageCode = view.identity.code;
      view.identity.code = body.code;
      view.identity.resolve = false;
      view.heading.textContent = body.code;
      view.loadPeople(body.code);
    }
    // 整理期间 view.state 已是 ingested，前态按上一轮是否仍在跟踪判断。共享进度由写快照的窗口统一响。
    if (!sharedMode() && finished(body) && view.tracking) playSound('success');
    view.state = body.state;
    view.cause = body.state === 'failed' ? body.cause || '' : '';
    view.tracking = tracking(body);
    view.organizeFailed = organizeFailed(body);
    // 馆藏已有或已入库时 Peach 带回作品编号，主按钮改成直达 Peach 里的这部作品。
    view.assetId = Number.isSafeInteger(body.asset_id) && body.asset_id > 0 ? body.asset_id : null;
    view.queryOnly = view.tracking;
    if (!view.queryOnly) attempts.delete(comparisonKey(view.identity.code));
    renderFlow(view, body);
    const label = statusLabel(body);
    view.statusText = label;
    view.note.textContent = label;
    // 可以加入时按钮自己说明；不能加入时按钮会变成不可用并给出原因，这行只在其他状态显示。
    view.note.hidden = body.state === 'idle' && body.stage !== 'submitting';
    view.note.dataset.variant = statusVariant(body);
    render(view);
    // 本页番号开始或结束抓取时，其他任务列表随之自动折叠或展开。
    paintShared();
  }

  // 状态说明：下载任务的具体阶段、整理状态与百分比，失败时给出原因；浮卡与其他任务的进度页共用。
  function statusLabel(body) {
    const download = body.download;
    const known = download && ['submit_pending', 'submitted', 'remote_running', 'remote_done', 'landed', 'ingested', 'failed', 'cancelled', 'stalled'].includes(download.state);
    let label = body.stage === 'submitting' ? '正在提交网盘' : LABELS[body.state];
    if (known && typeof download.label === 'string') {
      label = download.label.slice(0, 80);
      if (download.state === 'ingested' && download.postprocess_state !== 'not_requested'
          && typeof download.postprocess_label === 'string') label += ` · ${download.postprocess_label.slice(0, 80)}`;
      if (download.state === 'remote_running' && typeof download.progress === 'number' && Number.isFinite(download.progress)) {
        const percent = Math.round(Math.min(1, Math.max(0, download.progress)) * 100);
        label += ` · ${percent}%`;
      }
    }
    if (['failed', 'no_match'].includes(body.state) && body.stage !== 'submitting') label = failureText(body);
    return label;
  }

  // 五段整体进度；结构与尺寸复用 Peach 生产 Progress 的 SVG 快照。
  function buildFlow() {
    const progress = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [name, value] of Object.entries({ role: 'progressbar', 'aria-label': '整体任务进度',
      'aria-valuemin': '0', 'aria-valuemax': '5', viewBox: '0 0 100 1', preserveAspectRatio: 'none', class: 'task-progress' })) progress.setAttribute(name, value);
    const progressFill = document.createElementNS(progress.namespaceURI, 'rect');
    const progressTrack = document.createElementNS(progress.namespaceURI, 'rect');
    for (const [rect, width, style] of [[progressTrack, '100', 'track'], [progressFill, '0', 'fill']]) {
      rect.setAttribute('width', width); rect.setAttribute('height', '1'); rect.setAttribute('class', style);
    }
    progress.append(progressTrack, progressFill);
    for (const point of [20, 40, 60, 80]) {
      const stop = document.createElementNS(progress.namespaceURI, 'rect');
      stop.setAttribute('x', String(point - .4)); stop.setAttribute('width', '.4'); stop.setAttribute('height', '1'); stop.setAttribute('class', 'stop');
      progress.append(stop);
    }
    const flow = element('div', 'flow');
    flow.hidden = true;
    const stepList = element('ol', 'flow-steps');
    stepList.setAttribute('aria-label', '整体任务阶段');
    const steps = ['排队', '搜索', '下载', '入库', '整理'].map((label, index) => {
      const step = element('li', 'flow-step');
      const mark = element('span', 'flow-mark'); mark.setAttribute('aria-hidden', 'true'); mark.append(stepMark(index), stageAnimation(index));
      step.append(mark, element('span', 'flow-label', label)); stepList.append(step); return step;
    });
    flow.append(progress, stepList);
    return { flow, progress, progressFill, steps };
  }

  function statusVariant(body) {
    return body.state === 'failed' || body.download?.postprocess_state === 'failed' ? 'error' : 'secondary';
  }

  async function query(view, method = 'GET') {
    if (!alive(view) || view.busy) return;
    const config = configuration();
    if (!config) { configure(); return; }
    view.busy = true;
    view.note.dataset.variant = 'secondary';
    if (method === 'POST') {
      playSound('start');
      attempts.add(comparisonKey(view.identity.code));
      view.queryOnly = true;
      view.note.textContent = '正在交给 Peach'; view.note.hidden = false;
      renderFlow(view, { state: 'pending' });
      view.progress.removeAttribute('aria-valuenow');
      view.progress.setAttribute('aria-valuetext', '等待 Peach 确认任务状态');
    }
    render(view);
    const deadline = Date.now() + POLL_LIMIT;
    try {
      let body = await request(config, view.identity.code, view.identity.source, method, Boolean(view.identity.resolve),
        method === 'POST' && view.cause === 'magnet' ? {switch:true} : {});
      if (!alive(view)) return;
      applyState(view, body);
      if (method === 'POST') void sharedTick(true);
      let shared = false;
      for (let count = 0; tracking(body) && Date.now() < deadline; count++) {
        await pollWait(count);
        if (!alive(view)) return;
        // 共享进度可用时由快照更新，不再逐个查询，也没有一小时上限。
        if ((shared = sharedMode())) break;
        body = await request(config, view.identity.code, view.identity.source, 'GET');
        if (!alive(view)) return;
        applyState(view, body);
      }
      if (tracking(body) && !shared) view.note.textContent = `${view.statusText}，可查询状态。`;
    } catch (error) {
      if (alive(view)) {
        view.queryOnly = true;
        if (view.flow.hasAttribute('hidden')) {
          renderFlow(view, { state: 'pending' });
          view.progress.removeAttribute('aria-valuenow');
          view.progress.setAttribute('aria-valuetext', '连接异常，任务状态待确认');
        } else view.progress.setAttribute('aria-valuetext', view.progress.hasAttribute('aria-valuenow')
          ? '连接异常，显示最近一次确认的阶段' : '连接异常，任务状态待确认');
        view.note.textContent = error.message; view.note.hidden = false;
        view.note.dataset.variant = 'error';
      }
    } finally {
      if (alive(view)) {
        view.busy = false; render(view);
        // 查询期间到达的快照被跳过了，结束后立刻按当前快照补上，不等下一次变化。
        if (sharedMode()) applyShared(sharedSnapshot);
      }
    }
  }

  function refresh() {
    if(!pageInterfaceAllowed()) {
      if(current){generation++;current.root.remove();current=null;}
      updateEntry?.root.remove();updateEntry=null;pageKey='';return;
    }
    const item = identity();
    const key = `${location.href}|${item?.code || ''}|${Boolean(item?.conflict)}`;
    // 地址没变也要重画女优那一块：JavDB 标题栏的名字可能晚于地址出现。
    if (key === pageKey && (!item || current?.root.isConnected)) { if (!item) paintPerformer(performerPage()); return; }
    pageKey = key;
    generation++;
    current?.root.remove();
    current = null;
    if (!item || !document.body) { refreshUpdateEntry(); return; }
    // Shadow DOM 隔离宿主样式。
    document.getElementById(ROOT_ID)?.remove();
    const { root, shadow } = surface(ROOT_ID, 'Peach 入库');
    const panel = element('section', 'panel');
    panel.id = `${ROOT_ID}-panel`;
    const bar = element('header', 'bar');
    const label = element('strong', '', item.conflict ? '番号待核对' : item.code || '作品番号');
    const summary = element('span', 'bar-summary');
    summary.hidden = true;
    const heading = element('div', 'bar-heading');
    const title = element('div', 'bar-title');
    // 与本页番号列表相同的人物头像；资料未取得时保留默认人像。商品号要等 Peach 解析出番号后再查。
    let titlePeople = null;
    const loadTitlePeople = code => {
      const config = configuration();
      if (!titlePeople || !code || !config) return;
      requestPeople(config, [code], undefined, performerNames()).then(body => { if (root.isConnected) renderPeople(titlePeople, Object.values(body.items)[0]); }).catch(() => {});
    };
    if (!item.conflict && (item.code || item.resolve)) {
      titlePeople = element('span', 'batch-people');
      titlePeople.append(defaultPersonAvatar());
      title.append(titlePeople);
      if (!item.resolve) loadTitlePeople(item.code);
    }
    title.append(label);
    heading.append(title, summary);
    const actions = element('div', 'bar-actions');
    const settingsButton = control('Peach 设置', { icon: 'settings' });
    settingsButton.addEventListener('click', configure);
    const collapse = control('折叠 Peach 详情', { icon: 'collapse' });
    collapse.setAttribute('aria-expanded', 'true');
    collapse.setAttribute('aria-controls', `${ROOT_ID}-body`);
    const hide = control('隐藏 Peach 面板', { icon: 'close' });
    actions.append(settingsButton, collapse, hide);
    bar.append(heading, actions);
    const body = element('div', 'body');
    body.id = `${ROOT_ID}-body`;
    const button = control('加入 Peach 馆藏', { primary: true });
    button.dataset.action = 'add';
    const note = element('p', 'geist-note');
    note.setAttribute('role', 'status');
    note.setAttribute('aria-label', 'Peach 任务状态');
    note.setAttribute('aria-live', 'polite');
    const { flow, progress, progressFill, steps } = buildFlow();
    const scan = control('识别本页全部番号'); scan.addEventListener('click', openPageActions);
    body.append(note, flow, button, scan, sharedSection(), updateSection({ availableOnly: true }));
    panel.append(bar, body);
    const launcher = control('展开 Peach 面板');
    launcher.classList.add('launcher');
    launcher.setAttribute('aria-label', '展开 Peach 面板');
    launcher.setAttribute('aria-controls', panel.id);
    launcher.setAttribute('aria-expanded', 'false');
    const logo = document.createElement('img');
    logo.draggable=false;
    logo.src = PEACH_LOGO;
    logo.alt = '';
    logo.setAttribute('aria-hidden', 'true');
    launcher.replaceChildren(logo);
    wireDrag(root, launcher, panel);
    launcher.hidden = true;
    shadow.append(panel, launcher);
    const view = { root, panel, body, launcher, collapse, summary, button, note, flow, steps, progress, progressFill, heading: label, loadPeople: loadTitlePeople, settings: settingsButton, identity: item, url: location.href, generation, state: 'idle', busy: false, tracking: false, queryOnly: attempts.has(comparisonKey(item.code)) };
    current = view;
    refreshUpdateEntry();
    paintShared();
    if (subpageOpen()) {
      root.setAttribute('data-settings-open', '');
      root.inert = true;
    }
    collapse.addEventListener('click', () => present(view, panelMode === 'collapsed' ? 'expanded' : 'collapsed', true));
    hide.addEventListener('click', () => present(view, 'minimized', true));
    launcher.addEventListener('click', () => {
      present(view, 'expanded', true);
      if (!view.identity.conflict && configuration() && !view.busy) void query(view);
    });
    note.textContent = item.conflict ? '页面身份不一致，请核对番号。' : configuration() ? '正在查询 Peach 馆藏' : '配置地址与令牌后，即可加入 Peach 馆藏。';
    button.addEventListener('click', () => {
      if (!alive(view) || view.busy || view.button.disabled) return;
      if (!configuration()) { configure(); return; }
      if (view.organizeFailed) { void retryOrganize(view); return; }
      const link = libraryLink(view);
      if (link && !view.tracking) { window.open(link, '_blank', 'noopener'); return; }
      void query(view, view.queryOnly || ACTIVE.has(view.state) ? 'GET' : 'POST');
    });
    render(view);
    present(view, panelMode);
    if (!item.conflict && configuration()) void query(view);
  }

  const schedule = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 100);
  };
  new MutationObserver(schedule).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  addEventListener('popstate', schedule);
  addEventListener('hashchange', schedule);
  const navigated = () => {
    if (batchView?.dialog.open) batchView.dialog.close();
    generation++;
    pageKey = '';
    selected = null;
    schedule();
  };
  addEventListener('urlchange', navigated);
  globalThis.navigation?.addEventListener('navigate', navigated);
  // 用户脚本沙箱无需替换页面的 History API。
  setInterval(refresh, 750);
  refresh();
  if (typeof GM_addValueChangeListener === 'function') {
    for (const key of [STORAGE_INSTALLED, STORAGE_UPDATES, STORAGE_APPEARANCE, STORAGE_POSITION, STORAGE_DISPLAY]) updateListeners.push(GM_addValueChangeListener(key, () => {
      updateCache = readUpdateCache(); paintAllUpdates();
      for (const root of surfaces) if (root.isConnected) applyAppearance(root);
    }));
    for(const key of [STORAGE_ENABLED,STORAGE_DISPLAY])updateListeners.push(GM_addValueChangeListener(key,(_key,before,after)=>{if(before!==after)applyDisplayPreference();}));
    updateListeners.push(GM_addValueChangeListener(STORAGE_TASKS, (_key, _before, _after, remote) => { if (remote) applyShared(readShared()); }));
  }
  void sharedTick();
  addEventListener('resize', () => { for (const root of surfaces) if (root.isConnected) placeSurface(root); });
  document.addEventListener('visibilitychange', updateVisibility);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void sharedTick(); });
  addEventListener('focus', refreshInstalledVersion);
  // 关闭时交出轮询锁，别的窗口下一轮就接手。
  addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposeUpdates(); clearTimeout(sharedTimer);
    try { if (JSON.parse(GM_getValue(STORAGE_POLLER, 'null'))?.owner === WINDOW_ID) GM_setValue(STORAGE_POLLER, 'null'); } catch { /* 锁会自行过期。 */ }
  });
  scheduleUpdateCheck();
})();

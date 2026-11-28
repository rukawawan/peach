# Records 唱片墙取证

本页记录人工取证。参考仓库在 2026-11-21 核对，源码固定于提交 `b35cb2a9788b01c8d6db6229e734015ea78a0872`。[参考网站](https://records.charliegleason.com/) · [源码版本](https://github.com/superhighfives/records.charliegleason.com/tree/b35cb2a9788b01c8d6db6229e734015ea78a0872)

页面由多份源码和人工交互记录整理，无法从单一 URL 获取同一份内容，因此无需登记到 `reference-sources.json` 的自动重抓清单。

## 证据

- 实测：公开首页返回 HTTP 200。画布开场结束后，首页以浅色背景、中央说明和留有间距的唱片封套构成墙面，左下角显示年代筛选。首次截图因导航超时，改用 Chromium 取得画面。
- 实测（源码）：唱片封套按网格陈列。指针悬停时，封套抬离墙面，片名通过独立提示显示。触屏以靠近视口中心的唱片为浏览目标，在筛选控件上方显示片名和艺人。[场景](https://github.com/superhighfives/records.charliegleason.com/blob/b35cb2a9788b01c8d6db6229e734015ea78a0872/apps/web/src/components/wall/wall-scene.tsx) · [说明](https://github.com/superhighfives/records.charliegleason.com/blob/b35cb2a9788b01c8d6db6229e734015ea78a0872/apps/web/src/components/wall/wall-grid.tsx)
- 实测（源码）：镜头和封套使用同一三维投影。封套在曲面上调整深度及倾角，缩放使用单一系数。两层微粒以不同速度移动。自定义鼠标在墙面上显示圆环，悬停显示指向封套的箭头，拖动显示手势，选中封套可用关闭指针收起。[场景](https://github.com/superhighfives/records.charliegleason.com/blob/b35cb2a9788b01c8d6db6229e734015ea78a0872/apps/web/src/components/wall/wall-scene.tsx#L1477) · [微粒](https://github.com/superhighfives/records.charliegleason.com/blob/b35cb2a9788b01c8d6db6229e734015ea78a0872/apps/web/src/components/wall/dust.tsx) · [鼠标](https://github.com/superhighfives/records.charliegleason.com/blob/b35cb2a9788b01c8d6db6229e734015ea78a0872/apps/web/src/components/wall/wall-cursor.tsx#L151)

## Peach 播放墙

默认墙面先按封面的宽高比排列每块区域，再一起显示。同行封面等高，纵向余量分摊到各行，避免在分块交界积出整条空带。慢图和续页会填入既定位置，拖动时已显示的封面跟随镜头投影。墙面和展开卡按比例完整显示封面或缩略图，有独立正封的作品可在窄位使用正封。观看进度在展开后的播放器中查看。鼠标悬停时，封套抬起并投下阴影，盘面滑出并转动，作品名、演职人员和时长显示在指针附近。键盘聚焦时，说明位于视口底部。触屏点按可原位展开作品。

中央封面在更深的位置，四周封面沿曲面逐渐展开。横封和竖封都作为保持原比例的刚性平面，用共同视点投影。拖动和缩放把屏幕上的落点反算成镜头坐标。鼠标在浏览墙面时使用圆环、指向箭头和拖动手势，已展开的封面可点击收起。系统启用减少动态效果时，曲面保留，光斑、微粒和悬停倾斜暂停。

2026-11-25 实测参考站桌面展开，左侧放大并抬起选中封套，盘面持续旋转。右侧浮层从顶部留距，标题区有封面色调和跨边缘的小封面，参数用独立方格与横线分隔。Peach 在暗色墙面上使用浅暖色资料面板，保留实际作品字段和播放控件。光盘使用通用 DVD 盘面或根据版次标识使用蓝光样式，减少动态效果时静止。详情展开期间固定背景封面的布局并统一去色，播放时左侧使用同一播放器实例。[封套与唱片](https://github.com/superhighfives/records.charliegleason.com/blob/b35cb2a9788b01c8d6db6229e734015ea78a0872/apps/web/src/components/wall/wall-scene.tsx#L1495) · [资料面板](https://github.com/superhighfives/records.charliegleason.com/blob/b35cb2a9788b01c8d6db6229e734015ea78a0872/apps/web/src/components/record-panel.tsx)

顶部页码和左右方向键按墙面作品顺序翻阅，封套与资料同步切换，保持浏览状态。播放器的队列用于选择要播的作品、分卷或版本。墙面悬浮阴影跟随封套与盘面的轮廓。

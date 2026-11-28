interface Lane { axis: 'x' | 'y'; track: HTMLDivElement; thumb: HTMLDivElement; range: number; travel: number }
export interface OverlayScrollbar { (): void; destroy(): void; repair(): void }
const controls = new Map<HTMLElement, OverlayScrollbar>();

export function detachOverlayScrollbar(container:HTMLElement):void{controls.get(container)?.destroy()}

/** 移出文档的滚动区释放监听、尺寸观察器及轨道。 */
export function pruneOverlayScrollbars(): void {
  for (const [container, control] of controls) {
    if (!container.isConnected) control.destroy();
    else control.repair();
  }
}

export function releaseOverlayScrollbars(root:HTMLElement):void{
  for(const [container,control] of controls)if(container===root||root.contains(container))control.destroy();
}

/** 布局模式改变时，display:contents 子树可能改变内容长度而不触发容器尺寸观察。 */
export function refreshOverlayScrollbars(root:HTMLElement):void{
  for(const [container,control] of controls)if(container===root||root.contains(container))control();
}

/**
 * 覆盖式滚动条：滑块浮在内容上，一列宽度都不占。
 *
 * 已有的 `.geist-scroller` 解决的是另一半问题——它用两端渐隐说明「还能往下」，
 * 但没有滑块，读不出这一列有多长、自己停在哪儿，而且要求内容套进它自己的包装层。
 * 这里只往既有滚动容器的父元素上挂轨道，不动内容结构，两者可以叠加使用。
 *
 * 普通内容区的轨道与容器同级。浮层的轨道留在浮层内部，并补偿内容的滚动位移，
 * 保持在同一层级及可视边缘。宿主因此得是定位祖先，
 * 而且不一定和容器一样大（设置面板的卡片还含着标题栏），所以轨道的位置每次都按
 * 两个 rect 量出来，不假设它们同框。两条轴各一条轨道，谁溢出谁显示——同一个容器
 * 可能在不同版式下换轴（队列列表 `[data-mix-list]` 在带队列的详情格里就是横滚）。
 * 整页那一条是唯一的例外：`html` 没有元素父级，轨道挂进 body 并由 `.page` 改成
 * fixed，位置只认视口，不用量。
 * 几何按 2026-09-05 实测 vercel.com 侧栏：
 * 滑块长 = 可视长 / 内容长 × 轨道长，位移 = 滚动进度 × (轨道长 − 滑块长)。
 * 返回一个手动重算函数，给那些既不改容器尺寸也不改子树的情形（例如换字体后重排）。
 */
export function attachOverlayScrollbar(
  container: HTMLElement | null, { variant = '', axes: requestedAxes }: { variant?: string; axes?: readonly Lane['axis'][] } = {},
): OverlayScrollbar | null {
  if(!container)return null;
  if(container.dataset.overlayScrollbar){
    if(!requestedAxes||container.dataset.overlayAxes===requestedAxes.join(''))return null;
    detachOverlayScrollbar(container);
  }
  const root=container===document.documentElement;
  const axes=root?['y'] as const:requestedAxes??['y','x'] as const;
  const style=getComputedStyle(container);
  const internal=!root&&(style.position==='absolute'||style.position==='fixed'||container.matches('dialog,[popover]'));
  const host=root?document.body:internal?container:container.parentElement;
  if(!host)return null;
  container.dataset.overlayScrollbar='true';
  container.dataset.overlayAxes=axes.join('');
  const originalPosition=host.style.position;
  const events=new AbortController();
  let changedPosition=false;
  // 局部纵向滚动统一显示边缘提示，整页使用粘性导航层次。
  const edges=root?null:document.createElement('div');
  if(edges){
    edges.className='ui-ov-edges';
    edges.hidden=true;
    edges.setAttribute('aria-hidden','true');
    edges.innerHTML='<span class="ui-ov-edge-top"></span><span class="ui-ov-edge-bottom"></span>';
    host.append(edges);
  }
  const lanes=axes.map((axis):Lane=>{
    const track=document.createElement('div');
    // 两个类名写全，别拼 `ov-${axis}`：样式表的选择器要能在源码里查到消费者。
    track.className=`ovtrack ${axis==='y'?'ov-y':'ov-x'}${variant?` ${variant}`:''}`;
    track.dataset.overlayScrollbarAxis=axis;
    track.dataset.overlayTrack=axis;
    track.hidden=true;
    const thumb=document.createElement('div');
    thumb.className='ovthumb';
    thumb.dataset.overlayThumb='';
    track.append(thumb);
    host.append(track);
    return {axis,track,thumb,range:0,travel:0};
  });
  /* 容器在宿主里的偏移，只能按布局盒子量。`getBoundingClientRect()` 给的是变换后的
     几何，而下面要拿它跟 `clientWidth` 这类布局值相减——弹层开合动画正把卡片按
     `scale(.85)` 缩着的那 300ms 里，两者不在同一个坐标系，算出来的轨道位置会落进
     容器内部。实测设置弹层首帧右边距 41px（应为 0），直到滚一下触发重算才跳回右
     边缘，看着像「滚动条从左边跑到右边」。`offsetLeft`/`offsetTop` 不受变换影响，
     沿 offsetParent 链累加到宿主为止；走不到宿主（宿主不是定位祖先）才退回量 rect。 */
  const offsetWithin=()=>{
    let left=0,top=0,node:Element|null=container;
    while(node&&node!==host){
      const box=node as HTMLElement;left+=box.offsetLeft;top+=box.offsetTop;node=box.offsetParent}
    if(node===host)return {left,top};
    const hostRect=host.getBoundingClientRect(),rect=container.getBoundingClientRect();
    return {left:rect.left-hostRect.left-host.clientLeft,
      top:rect.top-hostRect.top-host.clientTop};
  };
  /* 一次重算分两段：先把要用的几何全部量完，再统一写轨道、滑块和边缘提示。边量边写的话，
     每写一次样式，下一次读布局就把整份文档当场重排一遍；详情页一开就有好几条滚动区同时
     挂上，实测这一段占掉进出详情时强制重算的大半。 */
  interface Geometry { left:number; top:number; hostWidth:number; hostHeight:number;
    width:number; height:number; contentWidth:number; contentHeight:number; scrollTop:number; scrollLeft:number }
  // 轨道按宿主的内边距框定位，static 的宿主会把它甩到更外层某个祖先上去。第一次量的时候补上。
  let positioned=root;
  let destroyed=false;
  const measure=():Geometry=>{
    if(!positioned){positioned=true;if(getComputedStyle(host).position==='static'){host.style.position='relative';changedPosition=true}}
    const {left,top}=root||internal?{left:0,top:0}:offsetWithin();
    return {left,top,hostWidth:root?0:host.clientWidth,hostHeight:root?0:host.clientHeight,
      width:container.clientWidth,height:container.clientHeight,
      contentWidth:container.scrollWidth,contentHeight:container.scrollHeight,
      scrollTop:container.scrollTop,scrollLeft:container.scrollLeft};
  };
  const place=({axis,track}:Lane,g:Geometry)=>{
    if(root)return;
    if(axis==='y'){
      track.style.top=`${g.top+8}px`;
      track.style.height=`${Math.max(0,g.height-16)}px`;
      track.style.right=`${g.hostWidth-g.left-g.width}px`;
    }else{
      track.style.left=`${g.left+8}px`;
      track.style.width=`${Math.max(0,g.width-16)}px`;
      track.style.bottom=`${g.hostHeight-g.top-g.height}px`;
    }
  };
  let verticalRange=0,edgeState='';
  // 滚动只读取位置；容器与轨道尺寸由尺寸、内容变化和手动重算刷新。
  const paintPosition=(top=container.scrollTop,left=container.scrollLeft)=>{
    if(internal){
      const transform=`translate(${left}px,${top}px)`;
      lanes.forEach(({track})=>{track.style.transform=transform});
      if(edges)edges.style.transform=transform;
    }
    if(edges){
      const above=verticalRange>1&&top>1;
      const below=verticalRange>1&&top<verticalRange-1;
      const state=`${above}:${below}`;
      if(state!==edgeState){
        edgeState=state;
        edges.hidden=!above&&!below;
        edges.classList.toggle('ui-can-scroll-top',above);
        edges.classList.toggle('ui-can-scroll-bottom',below);
        if(above||below){
          container.style.setProperty('--scroll-edge-top',above?'16px':'0px');
          container.style.setProperty('--scroll-edge-bottom',below?'16px':'0px');
        }else{
          container.style.removeProperty('--scroll-edge-top');
          container.style.removeProperty('--scroll-edge-bottom');
        }
        container.toggleAttribute('data-scroll-edges',!internal&&(above||below));
      }
    }
    lanes.forEach(({axis,thumb,range,travel})=>{
      if(range<=1)return;
      const offset=travel>0?Math.max(0,Math.min(1,(axis==='y'?top:left)/range))*travel:0;
      thumb.style.transform=`translate${axis==='y'?'Y':'X'}(${offset}px)`;
    });
  };
  let pendingFrame:number|null=null;
  const schedulePosition=()=>{
    if(pendingFrame!==null)return;
    pendingFrame=requestAnimationFrame(()=>{pendingFrame=null;paintPosition()});
  };
  const sync=()=>{
    if(destroyed)return;
    if(pendingSync!==null){cancelAnimationFrame(pendingSync);pendingSync=null}
    const g=measure();
    verticalRange=g.contentHeight-g.height;
    if(edges){
      edges.style.left=`${g.left}px`;
      edges.style.top=`${g.top}px`;
      edges.style.width=`${g.width}px`;
      edges.style.height=`${g.height}px`;
    }
    lanes.forEach(lane=>{
      const {axis,track,thumb}=lane,vertical=axis==='y';
      const size=vertical?g.height:g.width;
      const content=vertical?g.contentHeight:g.contentWidth;
      const range=content-size;
      lane.range=range;
      lane.travel=0;
      if(range<=1){track.hidden=true;return}
      track.hidden=false;
      place(lane,g);
      /* 局部轨道的长度就是上面写进去的那个数，不必回读；整页那一条由样式表钉在视口上，
         先显再量：藏起来的轨道长度是 0，拿它当「量不到」会把自己永久锁在隐藏态。 */
      const trackSize=root?(vertical?track.clientHeight:track.clientWidth):Math.max(0,size-16);
      if(!trackSize)return;
      // 短到抓不住的滑块等于没有滑块：内容特别长时给它一个下限，代价是滑块位置与
      // 滚动进度不再严格线性，但可拖动比可换算重要。
      const thumbSize=Math.min(trackSize,Math.max(24,size/content*trackSize));
      lane.travel=trackSize-thumbSize;
      thumb.style[vertical?'height':'width']=`${thumbSize}px`;
    });
    paintPosition(g.scrollTop,g.scrollLeft);
  };
  /* 尺寸观察器的回调落在本帧布局之后，量的时候不必提前重排；内容增删、图片到手
     这些零散的触发合到下一帧算一次。挂上时不当场量：第一次回调就在同一帧
     绘制之前，轨道在那之前藏着。 */
  let pendingSync:number|null=null;
  const scheduleSync=()=>{if(pendingSync===null)pendingSync=requestAnimationFrame(()=>{pendingSync=null;sync()})};
  const scroller:EventTarget=root?document:container;
  scroller.addEventListener('scroll',schedulePosition,{passive:true,signal:events.signal});
  const resize=new ResizeObserver(sync);
  resize.observe(container);
  if(!root)container.addEventListener('load',scheduleSync,{capture:true,signal:events.signal});
  let contents:MutationObserver|undefined;
  // 内容长短变了但容器盒子没变（抽屉重建、分区展开），容器自己的 ResizeObserver 一声不响。
  // 整页那一条改看 body：它的高度就是内容高度，而在 documentElement 上挂 subtree 的
  // MutationObserver 等于每渲染一张卡都强制一次重排。
  if(root)resize.observe(document.body);
  else{
    const observed=new Set<Element>();
    const contentChanged=()=>{
      const children=new Set([...container.children].filter(child=>!child.matches('.ovtrack,.ui-ov-edges')));
      observed.forEach(child=>{if(!children.has(child)){resize.unobserve(child);observed.delete(child)}});
      children.forEach(child=>{if(!observed.has(child)){resize.observe(child);observed.add(child)}});
    };
    /* 内容自身的高度变化也刷新几何，折叠过渡与字体重排无需等待滚动：直接子元素都在尺寸观察器
       里，过渡逐帧改高度时它每帧都会回调。`transitionend` 不在这里听：侧栏开合时一列按钮的文字
       过渡一结束就冒泡上来十几个，每个都要在下一帧重量一遍。 */
    contentChanged();
    contents=new MutationObserver(()=>{contentChanged();scheduleSync()});
    contents.observe(container,{childList:true});
  }
  lanes.forEach(({axis,track,thumb})=>track.addEventListener('pointerdown',event=>{
    const vertical=axis==='y';
    const trackRect=track.getBoundingClientRect(),thumbRect=thumb.getBoundingClientRect();
    const travel=(vertical?trackRect.height-thumbRect.height:trackRect.width-thumbRect.width);
    const range=vertical?container.scrollHeight-container.clientHeight
      :container.scrollWidth-container.clientWidth;
    if(travel<=0||range<=0)return;
    const point=(moved:PointerEvent)=>vertical?moved.clientY:moved.clientX;
    const head=vertical?thumbRect.top:thumbRect.left,tail=vertical?thumbRect.bottom:thumbRect.right;
    // 按在滑块上就保持按住的那一点，按在轨道空白处则把滑块中心挪过来。
    const grab=point(event)>=head&&point(event)<=tail?point(event)-head
      :(vertical?thumbRect.height:thumbRect.width)/2;
    const origin=vertical?trackRect.top:trackRect.left;
    const to=(moved:PointerEvent)=>{const at=Math.max(0,Math.min(range,(point(moved)-origin-grab)/travel*range));
      if(vertical)container.scrollTop=at;else container.scrollLeft=at};
    const stop=()=>{track.classList.remove('dragging');
      track.removeEventListener('pointermove',to);track.removeEventListener('pointerup',stop);
      track.removeEventListener('pointercancel',stop)};
    track.classList.add('dragging');
    track.setPointerCapture(event.pointerId);
    track.addEventListener('pointermove',to,{signal:events.signal});
    track.addEventListener('pointerup',stop,{signal:events.signal});
    track.addEventListener('pointercancel',stop,{signal:events.signal});
    to(event);
    event.preventDefault();
  },{signal:events.signal}));
  const control=Object.assign(sync,{repair(){
    let changed=false;
    for(const decoration of [...lanes.map(({track})=>track),...(edges?[edges]:[])]){
      if(decoration.parentElement!==host){host.append(decoration);changed=true}
    }
    if(changed)scheduleSync();
  },destroy(){
    if(controls.get(container)!==control)return;
    destroyed=true;
    controls.delete(container);
    events.abort();resize.disconnect();contents?.disconnect();
    if(pendingFrame!==null)cancelAnimationFrame(pendingFrame);
    if(pendingSync!==null)cancelAnimationFrame(pendingSync);
    lanes.forEach(({track})=>track.remove());edges?.remove();
    delete container.dataset.overlayScrollbar;
    delete container.dataset.overlayAxes;
    delete container.dataset.scrollEdges;
    container.style.removeProperty('--scroll-edge-top');container.style.removeProperty('--scroll-edge-bottom');
    if(changedPosition&&host.style.position==='relative'
      &&![...controls.keys()].some(node=>node.parentElement===host))host.style.position=originalPosition;
  }});
  controls.set(container,control);
  return control;
}

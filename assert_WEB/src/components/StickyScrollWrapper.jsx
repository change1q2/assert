import { useEffect, useRef, useState } from 'react';

/**
 * StickyScrollWrapper
 * 始终显示一个「悬浮在视口底部」的水平滚动条，内容同步到内部的 overflow-x 容器。
 *
 * - 当原生滚动条已经出现在视口内可见时，隐藏悬浮条，避免重复。
 * - 悬浮条和原生滚动条双向实时同步。
 * - 页面滚动、窗口 resize、内部内容尺寸变化均触发重新计算。
 */
export default function StickyScrollWrapper({
  children,
  className = '',
  // 视口底部偏移 (例如移动端底部导航或全局 footer 高度)
  offsetBottom = 0,
  // 原生滚动条距离视口底部 < Npx 时认为"已可见"，隐藏悬浮条
  visibleThreshold = 16,
}) {
  const scrollRef = useRef(null);       // 原生 overflow-x 容器
  const floatRef = useRef(null);        // 悬浮滚动条
  const outerWrapRef = useRef(null);    // 外层包装（用于定位悬浮条）
  const syncFromRef = useRef('native'); // 正在由哪一侧发起同步
  const tickRaf = useRef(null);
  const rafCount = useRef(0);

  const [showFloat, setShowFloat] = useState(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  const recompute = () => {
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    // 原生水平滚动条(元素底部边框)是否在视口可见区域内
    const nativeVisible = rect.bottom <= (vh - offsetBottom + visibleThreshold);
    const needsFloat = !nativeVisible && el.scrollWidth > el.clientWidth + 1;
    setShowFloat(needsFloat);
    setScrollWidth(el.scrollWidth);
    setClientWidth(el.clientWidth);
  };

  // 初始化 + 监听
  useEffect(() => {
    recompute();

    const onEvent = () => {
      if (tickRaf.current) cancelAnimationFrame(tickRaf.current);
      tickRaf.current = requestAnimationFrame(() => {
        recompute();
        // 对齐悬浮条和原生的位置
        if (floatRef.current && scrollRef.current) {
          if (floatRef.current.scrollLeft !== scrollRef.current.scrollLeft) {
            floatRef.current.scrollLeft = scrollRef.current.scrollLeft;
          }
        }
      });
    };

    window.addEventListener('scroll', onEvent, { passive: true });
    window.addEventListener('resize', onEvent);

    let ro;
    try {
      if (window.ResizeObserver) {
        ro = new ResizeObserver(onEvent);
        if (scrollRef.current) ro.observe(scrollRef.current);
        if (scrollRef.current?.firstElementChild) ro.observe(scrollRef.current.firstElementChild);
      }
    } catch (_) {}

    // MutationObserver 兜底（动态加列等场景）
    let mo;
    try {
      if (window.MutationObserver && scrollRef.current) {
        mo = new MutationObserver(onEvent);
        mo.observe(scrollRef.current, { childList: true, subtree: true, attributes: true });
      }
    } catch (_) {}

    return () => {
      window.removeEventListener('scroll', onEvent);
      window.removeEventListener('resize', onEvent);
      if (tickRaf.current) cancelAnimationFrame(tickRaf.current);
      if (ro) ro.disconnect();
      if (mo) mo.disconnect();
    };
  }, []);

  const onNativeScroll = (e) => {
    if (syncFromRef.current === 'float') {
      // 避免循环
      if (++rafCount.current > 5) { syncFromRef.current = 'native'; rafCount.current = 0; }
      return;
    }
    syncFromRef.current = 'native';
    if (floatRef.current) floatRef.current.scrollLeft = e.target.scrollLeft;
    if (tickRaf.current) cancelAnimationFrame(tickRaf.current);
    tickRaf.current = requestAnimationFrame(() => { syncFromRef.current = 'native'; rafCount.current = 0; });
  };

  const onFloatScroll = (e) => {
    syncFromRef.current = 'float';
    if (scrollRef.current) scrollRef.current.scrollLeft = e.target.scrollLeft;
    if (tickRaf.current) cancelAnimationFrame(tickRaf.current);
    tickRaf.current = requestAnimationFrame(() => { syncFromRef.current = 'native'; rafCount.current = 0; });
  };

  return (
    <div className="sticky-scroll-wrapper relative" ref={outerWrapRef}>
      {/* 原生滚动容器 */}
      <div ref={scrollRef} onScroll={onNativeScroll} className={className}>
        {children}
      </div>

      {/* 悬浮滚动条 */}
      {showFloat && (
        <StickyFloatScroller
          scrollWidth={scrollWidth}
          outerWidth={clientWidth}
          targetRect={() => scrollRef.current?.getBoundingClientRect()}
          onScroll={onFloatScroll}
          floatRef={floatRef}
          initialScrollLeft={scrollRef.current?.scrollLeft || 0}
          offsetBottom={offsetBottom}
        />
      )}
    </div>
  );
}

/* 单独的悬浮条组件 (Portal-free: 使用 fixed 定位 + 对齐到滚动容器的水平位置) */
function StickyFloatScroller({
  scrollWidth,
  outerWidth,
  targetRect,
  onScroll,
  floatRef,
  initialScrollLeft,
  offsetBottom,
}) {
  const trackRef = useRef(null);
  const [left, setLeft] = useState(0);
  const [width, setWidth] = useState(0);

  // 对齐到目标滚动容器
  useEffect(() => {
    const align = () => {
      const r = targetRect();
      if (!r) return;
      // 悬浮条的宽度 = 滚动容器的视口宽度，水平位置 = 容器的左侧 + 页面水平滚动
      const newLeft = r.left + window.scrollX;
      const newWidth = Math.min(r.width, window.innerWidth);
      setLeft(newLeft);
      setWidth(newWidth);
    };
    align();
    const onMove = () => {
      if (tick) cancelAnimationFrame(tick);
      tick = requestAnimationFrame(align);
    };
    let tick;
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
      if (tick) cancelAnimationFrame(tick);
    };
  }, [targetRect]);

  useEffect(() => {
    if (floatRef.current && initialScrollLeft != null) {
      floatRef.current.scrollLeft = initialScrollLeft;
    }
  }, [floatRef, initialScrollLeft, scrollWidth, outerWidth]);

  return (
    <div
      ref={trackRef}
      className="fixed z-40"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        bottom: `${offsetBottom}px`,
      }}
    >
      <div
        className="overflow-x-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm
                   border-x border-t border-gray-200 dark:border-slate-600 rounded-t-lg
                   shadow-[0_-4px_16px_rgba(0,0,0,0.18)]"
        ref={floatRef}
        onScroll={onScroll}
        style={{
          // 强制显式水平滚动条高度
          height: '18px',
          maxHeight: '18px',
          minHeight: '18px',
        }}
      >
        <div style={{ width: `${scrollWidth}px`, height: '1px' }} />
      </div>
    </div>
  );
}

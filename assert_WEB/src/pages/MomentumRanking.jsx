import { useState, useRef, useEffect } from 'react';
import { RefreshCw, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

export default function MomentumRanking({ onBack }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [reloadKey]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadKey(k => k + 1);
  };

  const handleFullscreen = () => setFullscreen(f => !f);

  const openExternal = () => {
    window.open('https://zhibeiquant.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900 p-3' : 'p-4 md:p-6'}`}>
      {!fullscreen && (
        <div className="max-w-7xl mx-auto w-full mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <span className="text-xl text-gray-600 dark:text-gray-300">‹</span>
              </button>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">辅助工具 / 动量排名</p>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ETF动量排名看板</h1>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">数据来源：zhibeiquant.com · 已隐藏实盘更新板块</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleRefresh} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{loading ? '加载中...' : '刷新'}</span>
              </button>
              <button onClick={openExternal} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">新窗口打开</span>
              </button>
              <button onClick={handleFullscreen} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">全屏</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {fullscreen && (
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">ETF动量排名看板</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? '加载中...' : '刷新'}</span>
            </button>
            <button onClick={openExternal} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
              <ExternalLink className="w-4 h-4" />
            </button>
            <button onClick={handleFullscreen} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
              <Minimize2 className="w-4 h-4" />
              <span>退出全屏</span>
            </button>
          </div>
        </div>
      )}

      <div className={`relative flex-1 ${fullscreen ? '' : 'max-w-7xl mx-auto w-full'} rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-soft bg-white dark:bg-slate-800`}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-800 z-20">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">正在加载动量排名数据...</p>
            </div>
          </div>
        )}
        {/* 底部覆盖层：隐藏 zhibeiquant.com 页面下方的"实盘更新"推广板块
            该板块位于页面 669~930px（高 261px），其下为"风险提示"声明。
            配合 iframe scrolling="no" 锁定视口，使板块折叠线以下部分被容器 overflow-hidden 裁剪，
            覆盖层仅遮挡残留于视口底部可见的部分：
            - 非全屏（iframe≈810px）：板块可见 669~810（约 141px），h-40(160px) 足够覆盖
            - 全屏（iframe≈1000px）：板块 669~930 完整可见，需 ≥331px 覆盖 */}
        <div
          className={`absolute bottom-0 left-0 right-0 ${fullscreen ? 'h-[340px]' : 'h-40'} bg-white dark:bg-slate-800 z-10 pointer-events-none border-t border-gray-100 dark:border-slate-700`}
          aria-hidden="true"
        />
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src="https://zhibeiquant.com/"
          title="ETF动量排名看板"
          className="w-full h-full"
          style={{ minHeight: fullscreen ? 'calc(100vh - 80px)' : '75vh', border: 'none' }}
          onLoad={() => setLoading(false)}
          scrolling="no"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}

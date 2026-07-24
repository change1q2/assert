import { useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

export default function HkipoCalculator({ onBack }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleOpenExternal = () => {
    window.open('https://hkipo.net/', '_blank');
  };

  const handleRefresh = () => {
    setIsLoading(true);
    const iframe = document.querySelector('#hkipo-iframe');
    if (iframe) {
      iframe.src = 'https://hkipo.net/';
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-gray-50 dark:bg-slate-900 flex flex-col`}>
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="返回"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                港股打新计算器
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  内置工具
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                来源: hkipo.net
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="刷新"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenExternal}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="在新窗口打开"
            >
              <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Iframe Container */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-slate-900 z-10">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
          </div>
        )}
        <iframe
          id="hkipo-iframe"
          src="https://hkipo.net/"
          className="w-full h-full border-0"
          style={{ minHeight: isFullscreen ? '100%' : 'calc(100vh - 140px)' }}
          title="港股打新计算器"
          onLoad={() => setIsLoading(false)}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
        />
      </div>

      {/* Footer Notice */}
      {!isFullscreen && (
        <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-4 py-2 shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            此工具由 hkipo.net 提供，内容仅供参考，不构成投资建议
          </p>
        </footer>
      )}
    </div>
  );
}
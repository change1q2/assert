import { useState, useEffect } from 'react';
import { fetchState } from '../api';
import {
  Download,
  RefreshCw,
  Monitor,
  Smartphone,
  Apple,
  FileDown,
  ExternalLink,
} from 'lucide-react';

export default function Downloads() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      setStateData(data);
    } catch (err) {
      console.error('Failed to load downloads data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const downloads = [
    {
      id: 1,
      platform: 'Windows',
      version: 'V1.0.0',
      size: '45 MB',
      icon: Monitor,
      description: 'Windows 桌面客户端',
    },
    {
      id: 2,
      platform: 'macOS',
      version: 'V1.0.0',
      size: '42 MB',
      icon: Apple,
      description: 'macOS 桌面客户端',
    },
    {
      id: 3,
      platform: 'iOS',
      version: 'V1.0.0',
      size: '28 MB',
      icon: Smartphone,
      description: 'iPhone / iPad 移动端',
    },
    {
      id: 4,
      platform: 'Android',
      version: 'V1.0.0',
      size: '32 MB',
      icon: Smartphone,
      description: 'Android 移动端',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <section
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">产品下载</h1>
              <p className="text-sm text-gray-600 mt-1">下载 Wealth OS 各平台客户端</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary-500 text-primary-500 text-sm font-medium hover:bg-primary-500 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Download className="w-5 h-5 text-primary-500" />
            客户端下载
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {downloads.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all text-center group"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                    <Icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {item.platform}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {item.description}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    {item.version} · {item.size}
                  </p>
                  <button className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors">
                    <FileDown className="w-4 h-4" />
                    下载
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Download className="w-8 h-8 text-primary-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              产品下载页
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
              更多平台版本正在开发中，敬请期待。如需帮助，请联系技术支持。
            </p>
            <a
              href="#"
              className="inline-flex items-center gap-1 text-primary-500 hover:text-primary-600 text-sm font-medium"
            >
              访问官网
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

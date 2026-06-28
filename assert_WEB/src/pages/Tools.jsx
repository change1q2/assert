import { useState, useEffect } from 'react';
import { fetchState, saveState } from '../api';
import {
  Wrench,
  Settings,
  ExternalLink,
  RefreshCw,
  X,
  Plus,
  Trash2,
  TrendingUp,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Zap,
  Globe,
} from 'lucide-react';

const builtInTools = [
  { id: 'premium-check', name: '溢价查询', icon: TrendingUp, description: '查询可转债、封闭式基金等溢价率', color: 'purple' },
  { id: 'hk-ipo', name: '港股打新分析', icon: BarChart3, description: '分析港股新股认购价值', color: 'green' },
];

const defaultExternalTools = [
  { id: 'bmg', name: '白毛股神追踪', url: 'https://example.com/bmg', icon: Activity, color: 'blue' },
  { id: 'industry', name: '产业链图谱', url: 'https://example.com/industry', icon: PieChart, color: 'orange' },
  { id: 'btc', name: 'BTC指标', url: 'https://example.com/btc', icon: LineChart, color: 'yellow' },
];

const iconMap = {
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Zap,
  Globe,
};

const colorMap = {
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
};

function formatColor(color) {
  return colorMap[color] || colorMap.purple;
}

function getIcon(iconName) {
  return iconMap[iconName] || Globe;
}

export default function Tools() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [externalTools, setExternalTools] = useState(defaultExternalTools);
  const [newToolForm, setNewToolForm] = useState({
    name: '',
    url: '',
    icon: 'Globe',
    color: 'purple',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      setStateData(data);
      if (data.externalTools && data.externalTools.length > 0) {
        setExternalTools(data.externalTools);
      }
    } catch (err) {
      console.error('Failed to load tools data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTools = async () => {
    try {
      const newState = {
        ...stateData,
        externalTools,
      };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
        setShowConfigModal(false);
      }
    } catch (err) {
      console.error('Failed to save tools:', err);
    }
  };

  const handleAddTool = () => {
    if (!newToolForm.name.trim() || !newToolForm.url.trim()) return;

    const newTool = {
      id: Date.now().toString(),
      name: newToolForm.name.trim(),
      url: newToolForm.url.trim(),
      icon: newToolForm.icon,
      color: newToolForm.color,
    };

    setExternalTools([...externalTools, newTool]);
    setNewToolForm({ name: '', url: '', icon: 'Globe', color: 'purple' });
  };

  const handleDeleteTool = (id) => {
    setExternalTools(externalTools.filter(t => t.id !== id));
  };

  const openExternalTool = (url) => {
    window.open(url, '_blank');
  };

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
              <h1 className="text-2xl font-bold text-gray-900">辅助工具</h1>
              <p className="text-sm text-gray-600 mt-1">内置工具与外部实用工具集合</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary-500 text-primary-500 text-sm font-medium hover:bg-primary-500 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
                配置
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary-500" />
            内置工具
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {builtInTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-xl p-3 ${formatColor(tool.color)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {tool.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-primary-500" />
            外部工具
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {externalTools.map((tool) => {
              const Icon = getIcon(tool.icon);
              return (
                <div
                  key={tool.id}
                  onClick={() => openExternalTool(tool.url)}
                  className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-xl p-3 ${formatColor(tool.color)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1">
                        {tool.name}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {tool.url}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {externalTools.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>暂无外部工具，点击右上角配置添加</p>
            </div>
          )}
        </section>

        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">外部工具配置</h3>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">添加新工具</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">名称</label>
                      <input
                        type="text"
                        value={newToolForm.name}
                        onChange={(e) => setNewToolForm({ ...newToolForm, name: e.target.value })}
                        placeholder="工具名称"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">图标</label>
                      <select
                        value={newToolForm.icon}
                        onChange={(e) => setNewToolForm({ ...newToolForm, icon: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {Object.keys(iconMap).map((iconName) => (
                          <option key={iconName} value={iconName}>{iconName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">URL</label>
                      <input
                        type="url"
                        value={newToolForm.url}
                        onChange={(e) => setNewToolForm({ ...newToolForm, url: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">颜色</label>
                      <select
                        value={newToolForm.color}
                        onChange={(e) => setNewToolForm({ ...newToolForm, color: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {Object.keys(colorMap).map((color) => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddTool}
                        disabled={!newToolForm.name.trim() || !newToolForm.url.trim()}
                        className="w-full px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        添加
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">已有工具 ({externalTools.length})</h4>
                  <div className="space-y-2">
                    {externalTools.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50"
                      >
                        <div className={`rounded-lg p-2 ${formatColor(tool.color)}`}>
                          {(() => {
                            const Icon = getIcon(tool.icon);
                            return <Icon className="w-4 h-4" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{tool.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{tool.url}</div>
                        </div>
                        <button
                          onClick={() => handleDeleteTool(tool.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveTools}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

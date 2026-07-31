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
  Pencil,
  TrendingUp,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Zap,
  Globe,
  Users,
} from 'lucide-react';

const builtInTools = [
  { id: 'premium-check', name: '溢价查询', icon: TrendingUp, description: '查询可转债、封闭式基金等溢价率', color: 'purple' },
  { id: 'hk-ipo', name: '港股打新分析', icon: BarChart3, description: '分析港股新股认购价值', color: 'green' },
  { id: 'hkipo-calculator', name: '港股打新计算器', icon: Activity, description: '港股打新溢价计算与收益分析', color: 'blue' },
  { id: 'value-investing-tool', name: '四大价值投资', icon: Zap, description: '四大师视角AI投资分析、价值评分与深度报告', color: 'purple' },
];

const defaultGroups = [
  { id: 'celebrity', name: '名人追踪', description: '集中查看重点投资人物与持仓风格追踪工具', isDefault: true },
  { id: 'ai', name: 'AI追踪', description: 'AI产业链与深度报告类工具', isDefault: true },
  { id: 'other', name: '其他工具', description: '', isDefault: true, isDefaultGroup: true },
];

const defaultExternalTools = [
  { id: 'serenity', name: '白毛股神追踪', url: 'https://aichainmap.com/serenity/', icon: Activity, color: 'blue', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=anime%20style%20portrait%20of%20beautiful%20young%20woman%20with%20white%20hair%20bob%20cut%20blue%20eyes%20elegant%20mysterious%20serene%20expression%20round%20avatar%20style&image_size=square', groupId: 'celebrity' },
  { id: 'buffett', name: '巴菲特知识库', url: 'https://learnbuffett.com/', icon: Globe, color: 'green', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20Warren%20Buffett%20style%20elderly%20investor%20wearing%20glasses%20business%20suit%20confident%20smile&image_size=square', groupId: 'celebrity' },
  { id: 'munger', name: '芒格思维模型', url: 'https://mungermodels.com/', icon: Zap, color: 'yellow', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20Charlie%20Munger%20style%20elderly%20businessman%20wearing%20glasses%20bow%20tie%20wise%20expression&image_size=square', groupId: 'celebrity' },
  { id: 'ark-tracker', name: '木头姐ARK追踪', url: 'https://arktracker.com/all-ark-holdings/', icon: TrendingUp, color: 'pink', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20Cathie%20Wood%20style%20female%20investor%20confident%20business%20woman%20modern%20style&image_size=square', groupId: 'celebrity' },
  { id: 'atlas', name: '产业链图谱', url: 'https://aichainmap.com/atlas', icon: PieChart, color: 'orange', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=futuristic%20AI%20technology%20network%20diagram%20with%20connected%20nodes%20and%20data%20flow%20visualization%20blue%20glow&image_size=square', groupId: 'ai' },
  { id: 'reports', name: 'AI深度报告解析', url: 'https://aichainmap.com/reports/', icon: BarChart3, color: 'purple', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=AI%20data%20analytics%20dashboard%20with%20charts%20and%20graphs%20professional%20business%20intelligence%20visualization&image_size=square', groupId: 'ai' },
  { id: 'btc-indicator', name: 'BTC指标', url: 'https://www.coinglass.com/zh/pro/i/ahr999-escape', icon: LineChart, color: 'yellow', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20bitcoin%20cryptocurrency%20coin%20stacked%20coins%20stock%20market%20chart%20background%20financial%20investment%20professional%20style&image_size=square', groupId: 'other' },
  { id: 'housing-trend', name: '房产趋势追踪', url: 'https://wxaurl.cn/jJh2iE8xOjt', icon: Activity, color: 'blue', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20real%20estate%20property%20building%20skyline%20housing%20market%20graph%20professional%20business%20style&image_size=square', groupId: 'other' },
];

const iconMap = {
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Zap,
  Globe,
  Users,
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

export default function Tools({ onNavigate }) {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [externalTools, setExternalTools] = useState(defaultExternalTools);
  const [groups, setGroups] = useState(defaultGroups);
  const [toast, setToast] = useState(null);
  const [newToolForm, setNewToolForm] = useState({
    name: '',
    url: '',
    avatar: '',
    groupId: defaultGroups[0]?.id || '',
  });
  const [editingTool, setEditingTool] = useState(null);
  const [editToolForm, setEditToolForm] = useState({
    name: '',
    url: '',
    avatar: '',
    groupId: '',
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

      const localState = localStorage.getItem('state');
      let localTools = [];
      let localGroups = [];
      
      if (localState) {
        try {
          const state = JSON.parse(localState);
          localTools = state.externalTools || [];
          localGroups = state.externalToolGroups || [];
        } catch (e) {
          console.error('Failed to parse local state');
        }
      }

      if (data && data.externalTools && data.externalTools.length > 0) {
        setExternalTools(data.externalTools);
      } else if (localTools.length > 0) {
        setExternalTools(localTools);
      } else {
        setExternalTools(defaultExternalTools);
      }

      if (data && data.externalToolGroups && data.externalToolGroups.length > 0) {
        setGroups(data.externalToolGroups);
      } else if (localGroups.length > 0) {
        setGroups(localGroups);
      } else {
        setGroups(defaultGroups);
      }
    } catch (err) {
      console.error('Failed to load tools data:', err);
      const localState = localStorage.getItem('state');
      if (localState) {
        try {
          const state = JSON.parse(localState);
          if (state.externalTools && state.externalTools.length > 0) {
            setExternalTools(state.externalTools);
          }
          if (state.externalToolGroups && state.externalToolGroups.length > 0) {
            setGroups(state.externalToolGroups);
          }
        } catch (e) {
          console.error('Failed to parse local state');
        }
      }
      setError('加载数据失败，已使用本地缓存');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTools = async () => {
    try {
      const newState = {
        ...stateData,
        externalTools,
        externalToolGroups: groups,
      };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
        localStorage.setItem('state', JSON.stringify(newState));
        setShowConfigModal(false);
      }
    } catch (err) {
      console.error('Failed to save tools:', err);
      localStorage.setItem('state', JSON.stringify({
        ...stateData,
        externalTools,
        externalToolGroups: groups,
      }));
      setShowConfigModal(false);
    }
  };

  const handleAddTool = () => {
    if (!newToolForm.name.trim() || !newToolForm.url.trim()) return;

    const newTool = {
      id: Date.now().toString(),
      name: newToolForm.name.trim(),
      url: newToolForm.url.trim(),
      icon: 'Globe',
      color: 'purple',
      avatar: newToolForm.avatar || '',
      groupId: newToolForm.groupId,
    };

    setExternalTools([...externalTools, newTool]);
    setNewToolForm({ name: '', url: '', avatar: '', groupId: groups[0]?.id || '' });
  };

  const handleDeleteTool = (id) => {
    setExternalTools(externalTools.filter(t => t.id !== id));
  };

  const handleEditTool = (tool) => {
    setEditingTool(tool);
    setEditToolForm({
      name: tool.name,
      url: tool.url,
      avatar: tool.avatar || '',
      groupId: tool.groupId || defaultGroups[0]?.id || '',
    });
  };

  const handleSaveEditTool = () => {
    if (!editToolForm.name.trim() || !editToolForm.url.trim()) return;

    setExternalTools(externalTools.map(t =>
      t.id === editingTool.id
        ? {
            ...t,
            name: editToolForm.name.trim(),
            url: editToolForm.url.trim(),
            avatar: editToolForm.avatar,
            groupId: editToolForm.groupId,
          }
        : t
    ));
    setEditingTool(null);
    setEditToolForm({ name: '', url: '', avatar: '', groupId: '' });
  };

  const handleCancelEdit = () => {
    setEditingTool(null);
    setEditToolForm({ name: '', url: '', avatar: '', groupId: '' });
  };

  const handleAddGroup = (name, description) => {
    const newGroup = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      isDefault: false,
    };
    setGroups([...groups, newGroup]);
  };

  const handleEditGroup = (id, name, description) => {
    setGroups(groups.map(g => 
      g.id === id ? { ...g, name: name.trim(), description: description.trim() } : g
    ));
  };

  const handleDeleteGroup = (id) => {
    const group = groups.find(g => g.id === id);
    if (!group || group.isDefaultGroup) return;
    
    const defaultGroup = groups.find(g => g.isDefaultGroup);
    setExternalTools(externalTools.map(t => 
      t.groupId === id ? { ...t, groupId: defaultGroup?.id } : t
    ));
    setGroups(groups.filter(g => g.id !== id));
  };

  const openExternalTool = (url, toolId) => {
    if (toolId === 'housing-trend') {
      navigator.clipboard.writeText(url).then(() => {
        setToast({ message: '已复制链接，请在微信中打开查看小程序', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      }).catch(() => {
        setToast({ message: '复制失败，请手动复制链接', type: 'error' });
        setTimeout(() => setToast(null), 3000);
      });
      return;
    }
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
                  onClick={() => onNavigate && onNavigate(tool.id)}
                  className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formatColor(tool.color)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1">
                        {tool.name}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {groups.map((group) => {
          const groupTools = externalTools.filter(t => t.groupId === group.id);
          if (groupTools.length === 0) return null;
          return (
            <section key={group.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary-500" />
                {group.name}
              </h3>
              {group.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{group.description}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupTools.map((tool) => {
                  const Icon = getIcon(tool.icon);
                  return (
                    <div
                      key={tool.id}
                      onClick={() => openExternalTool(tool.url, tool.id)}
                      className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        {tool.avatar ? (
                          <img
                            src={tool.avatar}
                            alt={tool.name}
                            className="w-10 h-10 rounded-xl object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `<div class="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-600 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M20.84 13.13a1 1 0 0 0 0-1.41l-.99-.99a1 1 0 0 0-1.41 0l-.49.49a1 1 0 0 0 1.41 1.41l.99-.99z"/></svg></div>`;
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
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
            </section>
          );
        })}{showConfigModal && (
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
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">头像图片</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={newToolForm.avatar}
                          onChange={(e) => setNewToolForm({ ...newToolForm, avatar: e.target.value })}
                          placeholder="图片URL"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert('图片大小不能超过2MB');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setNewToolForm({ ...newToolForm, avatar: event.target.result });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">分组</label>
                      <select
                        value={newToolForm.groupId}
                        onChange={(e) => setNewToolForm({ ...newToolForm, groupId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
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
                  {newToolForm.avatar && (
                    <div className="mt-3">
                      <img
                        src={newToolForm.avatar}
                        alt="预览"
                        className="w-16 h-16 rounded-lg object-cover border border-gray-300 dark:border-slate-600"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">已有工具 ({externalTools.length})</h4>
                  <div className="space-y-2">
                    {externalTools.map((tool) => (
                      editingTool?.id === tool.id ? (
                        <div
                          key={tool.id}
                          className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                        >
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">名称</label>
                              <input
                                type="text"
                                value={editToolForm.name}
                                onChange={(e) => setEditToolForm({ ...editToolForm, name: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">头像图片</label>
                              <input
                                type="text"
                                value={editToolForm.avatar}
                                onChange={(e) => setEditToolForm({ ...editToolForm, avatar: e.target.value })}
                                placeholder="图片URL"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">URL</label>
                              <input
                                type="url"
                                value={editToolForm.url}
                                onChange={(e) => setEditToolForm({ ...editToolForm, url: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">分组</label>
                              <select
                                value={editToolForm.groupId}
                                onChange={(e) => setEditToolForm({ ...editToolForm, groupId: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              >
                                {groups.map((group) => (
                                  <option key={group.id} value={group.id}>
                                    {group.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-end gap-2">
                              <button
                                onClick={handleCancelEdit}
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                              >
                                取消
                              </button>
                              <button
                                onClick={handleSaveEditTool}
                                disabled={!editToolForm.name.trim() || !editToolForm.url.trim()}
                                className="flex-1 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                保存
                              </button>
                            </div>
                          </div>
                          {editToolForm.avatar && (
                            <div className="mt-3">
                              <img
                                src={editToolForm.avatar}
                                alt="预览"
                                className="w-12 h-12 rounded-lg object-cover border border-gray-300 dark:border-slate-600"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          key={tool.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50"
                        >
                          {tool.avatar ? (
                            <img
                              src={tool.avatar}
                              alt={tool.name}
                              className="w-10 h-10 rounded-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `<div class="bg-gray-200 dark:bg-slate-600 rounded-lg w-10 h-10 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M20.84 13.13a1 1 0 0 0 0-1.41l-.99-.99a1 1 0 0 0-1.41 0l-.49.49a1 1 0 0 0 1.41 1.41l.99-.99z"/></svg></div>`;
                              }}
                            />
                          ) : (
                            <div className="bg-gray-200 dark:bg-slate-600 rounded-lg w-10 h-10 flex items-center justify-center">
                              {(() => {
                                const Icon = getIcon(tool.icon);
                                return <Icon className="w-5 h-5 text-gray-500" />;
                              })()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{tool.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{tool.url}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditTool(tool)}
                              className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTool(tool.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
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

        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}

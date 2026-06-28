import { useState, useEffect } from 'react';
import { fetchState } from '../api';
import {
  Lightbulb,
  RefreshCw,
  Rocket,
  Target,
  Zap,
  TrendingUp,
} from 'lucide-react';

export default function Strategies() {
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
      console.error('Failed to load strategies data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const strategies = [
    { id: 1, title: '价值投资策略', description: '长期持有优质公司，赚取企业成长收益', icon: Target, color: 'purple' },
    { id: 2, title: '指数基金定投', description: '定期定额投资宽基指数，分享市场平均收益', icon: TrendingUp, color: 'green' },
    { id: 3, title: '可转债套利', description: '利用可转债的债性和股性进行套利交易', icon: Zap, color: 'orange' },
    { id: 4, title: '港股打新', description: '参与港股IPO认购，获取新股上市收益', icon: Rocket, color: 'blue' },
  ];

  const colorMap = {
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
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
              <h1 className="text-2xl font-bold text-gray-900">业务设计</h1>
              <p className="text-sm text-gray-600 mt-1">投资策略与业务规划</p>
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
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary-500" />
            投资策略
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strategies.map((strategy) => {
              const Icon = strategy.icon;
              return (
                <div
                  key={strategy.id}
                  className="p-5 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-3 ${colorMap[strategy.color]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {strategy.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {strategy.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Lightbulb className="w-8 h-8 text-primary-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              业务设计模块
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              该模块正在规划中，后续将支持更多投资策略分析、资产配置建议等功能。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, Download, ChevronDown, ChevronUp, Plus, Trash2, Save, RotateCcw, Edit3, X } from 'lucide-react';
import { fetchHkIpo, saveHkIpoRules, exportHkIpo } from '../api/index.js';

const HK_IPO_ALL_COLS = [
  ['code', '代码'],
  ['companyName', '公司名称'],
  ['status', '状态'],
  ['offerPrice', '发行价格'],
  ['boardLot', '1手股数'],
  ['entryAmount', '1手入场金额'],
  ['totalMarketCap', '总市值'],
  ['hMarketCap', 'H股市值'],
  ['connectMarketCap', '入通市值（亿）'],
  ['connectRise', '入通涨幅'],
  ['oneLotExpectedProfit', '一手预计收益'],
  ['publicShares', '公开股数(万股)'],
  ['publicTotalHands', '公开总手数'],
  ['actualMultiple', '实际认购倍数'],
  ['allotmentRate', '中签率'],
  ['cornerstoneShare', '基石占比'],
  ['sponsor', '保荐人'],
  ['greenshoe', '绿鞋'],
  ['allocationOption', '发行调配权'],
  ['mechanism', '机制'],
  ['ahType', '是否AH/UH'],
  ['discountRate', '折价率'],
  ['subscriptionTime', '申购时间'],
  ['resultDate', '资金锁定期'],
  ['greyDate', '暗盘时间'],
  ['listingDate', '上市日期'],
  ['greyChange', '暗盘涨幅'],
  ['firstDayChange', '首日涨幅'],
  ['cumulativeChange', '累计涨跌幅'],
  ['latestVsOffer', '最新价/发行价'],
  ['fundamentals', '基本面'],
  ['industry', '行业'],
  ['score', '得分'],
  ['attitude', '申购态度'],
  ['shouldApply', '是否打'],
  ['strategy', '策略'],
  ['tailFunds', '甲尾乙头资金'],
  ['summary', '总结'],
];

const HK_IPO_LOCKED_COLS = new Set(['code', 'companyName']);

const HK_IPO_FILTER_FIELDS = [
  { key: 'hMarketCap', label: 'H股市值', type: 'range' },
  { key: 'connectRise', label: '入通涨幅', type: 'text' },
  { key: 'oneLotExpectedProfit', label: '一手预计收益', type: 'range' },
  { key: 'publicTotalHands', label: '公开总手数', type: 'range' },
  { key: 'actualMultiple', label: '实际认购倍数', type: 'range' },
  { key: 'sponsor', label: '保荐人', type: 'text' },
  { key: 'cornerstoneShare', label: '基石占比', type: 'text' },
  { key: 'greenshoe', label: '绿鞋', type: 'text' },
];

const HK_IPO_STATUS_MAP = {
  '招股中': { text: '招股中', class: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  '待上市': { text: '待上市', class: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
  '暗盘': { text: '暗盘', class: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
  '已上市': { text: '已上市', class: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
};

const HK_IPO_ATTITUDE_MAP = {
  '可以梭哈': { class: 'text-red-600 dark:text-red-400' },
  '谨慎': { class: 'text-yellow-600 dark:text-yellow-400' },
  '观察': { class: 'text-blue-600 dark:text-blue-400' },
  '不打': { class: 'text-gray-500 dark:text-gray-400' },
};

function hkIpoNum(value) {
  const parsed = Number(String(value ?? '').replace(/[,%亿万港元元]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', { hour12: false });
}

function StatCard({ label, value, hint }) {
  return (
    <article className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
      {hint && <small className="text-xs text-gray-400">{hint}</small>}
    </article>
  );
}

function BarChart({ title, rows, valueKey = 'count' }) {
  const max = Math.max(1, ...rows.map(row => Number(row[valueKey]) || 0));
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <span className="text-sm text-gray-500">{rows.length} 项</span>
      </div>
      <div className="space-y-2">
        {rows.map(row => {
          const value = Number(row[valueKey]) || 0;
          const height = Math.max(6, (value / max) * 100);
          return (
            <div key={row.label || row.companyName} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {row.label || row.companyName || row.status || '-'}
                  </span>
                  {row.tag && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                      {row.tag}
                    </span>
                  )}
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${height}%` }} />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[60px] text-right">
                {Number(value).toFixed(3).replace(/\.?0+$/, '')}
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">暂无图表数据</p>
        )}
      </div>
    </section>
  );
}

function StatusChart({ counts = {} }) {
  const rows = ['招股中', '待上市', '暗盘', '已上市'].map(status => ({ label: status, count: counts[status] || 0 }));
  return BarChart({ title: '状态占比', rows });
}

function hkIpoRowKey(row) {
  return `${row.code || ''}|${row.offerPrice || ''}|${row.publicTotalHands || ''}|${row.companyName || ''}`;
}

function recomputeStats(rows) {
  const recommended = rows.filter(row => row.shouldApply === '是');
  const recommendedCompanyCount = new Set(recommended.map(row => row.companyName || row.code).filter(Boolean)).size;
  const bestScore = rows.reduce((best, row) => (hkIpoNum(row.score) > hkIpoNum(best?.score) ? row : best), null);
  const bestProfit = rows.reduce((best, row) => (hkIpoNum(row.oneLotExpectedProfit) > hkIpoNum(best?.oneLotExpectedProfit) ? row : best), null);
  const statusCounts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const avgScore = rows.length ? rows.reduce((sum, row) => sum + hkIpoNum(row.score), 0) / rows.length : 0;
  return {
    total: rows.length,
    recommended: recommendedCompanyCount,
    averageScore: Number(avgScore.toFixed(3)),
    bestScoreProject: bestScore ? `${bestScore.companyName} ${bestScore.score}` : '',
    bestProfitProject: bestProfit ? `${bestProfit.companyName} ${bestProfit.oneLotExpectedProfit}` : '',
    statusCounts,
    scoreDistribution: [0, 3, 6, 9, 12].map((min, index, list) => {
      const max = list[index + 1] ?? Infinity;
      return {
        label: max === Infinity ? `${min}+` : `${min}-${max}`,
        count: rows.filter(row => hkIpoNum(row.score) >= min && hkIpoNum(row.score) < max).length,
      };
    }),
    profitRanking: [...rows]
      .filter(row => row.status === '招股中')
      .sort((a, b) => hkIpoNum(b.oneLotExpectedProfit) - hkIpoNum(a.oneLotExpectedProfit))
      .map(row => ({
        companyName: row.companyName,
        value: hkIpoNum(row.oneLotExpectedProfit),
        priceTag: (Array.isArray(row.scenarioTags) ? row.scenarioTags : []).find(tag => ['高', '低'].includes(tag)) || '',
      })),
  };
}

function hkIpoDedupByCompany(rows, sorter) {
  const sorted = [...rows].sort(sorter);
  const seen = new Set();
  return sorted.filter(row => {
    const key = row.companyName || row.code;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function StrategyCard({ rows, showAll, onToggleShowAll, strategyEdits, onEditStrategy, onDeleteStrategy }) {
  const baseRows = showAll ? rows : rows.filter(row => row.shouldApply === '是');
  
  const scoreRows = hkIpoDedupByCompany(
    baseRows,
    (a, b) => hkIpoNum(b.score) - hkIpoNum(a.score) || hkIpoNum(b.oneLotExpectedProfit) - hkIpoNum(a.oneLotExpectedProfit)
  );
  
  const stockRows = hkIpoDedupByCompany(
    baseRows.filter(row => showAll || hkIpoNum(row.score) > 6),
    (a, b) => Number(hkIpoNum(b.score) > 6) - Number(hkIpoNum(a.score) > 6)
      || hkIpoNum(b.publicTotalHands) - hkIpoNum(a.publicTotalHands)
      || hkIpoNum(b.score) - hkIpoNum(a.score)
  );

  const renderStrategyRow = (row, type, index) => {
    const key = `${type}:${row.companyName || row.code}`;
    if (strategyEdits.deleted[key]) return null;
    const override = strategyEdits.overrides[key] || {};
    return (
      <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 min-w-[24px]">
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <strong className="text-gray-900 dark:text-white">{row.companyName}</strong>
            <span className="text-xs text-gray-500">{row.code}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            得分 {row.score} · 手数 {row.publicTotalHands} · {row.shouldApply}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {override.strategy ?? row.strategy ?? row.summary ?? '-'}
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEditStrategy(key, row)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200">
            编辑
          </button>
          <button onClick={() => onDeleteStrategy(key)} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200">
            删除
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">策略排序</h3>
        <button
          onClick={onToggleShowAll}
          className={`text-sm px-3 py-1 rounded-lg transition-colors ${showAll ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
        >
          {showAll ? '只看要打' : '全部'}
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <strong className="text-sm text-gray-700 dark:text-gray-300">分数排行策略</strong>
            <span className="text-xs text-gray-500">{scoreRows.length} 项</span>
          </div>
          <div className="space-y-2">
            {scoreRows.map((row, index) => renderStrategyRow(row, 'score', index))}
            {scoreRows.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-2">暂无满足条件的策略</p>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <strong className="text-sm text-gray-700 dark:text-gray-300">拿货策略</strong>
            <span className="text-xs text-gray-500">{stockRows.length} 项</span>
          </div>
          <div className="space-y-2">
            {stockRows.map((row, index) => renderStrategyRow(row, 'stock', index))}
            {stockRows.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-2">暂无满足条件的策略</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MainTable({ rows, visibleCols, rowEdits, onEditRow, onDeleteRow }) {
  const cols = HK_IPO_ALL_COLS.filter(([key]) => !visibleCols || visibleCols[key] !== false).concat([['actions', '操作']]);
  
  const displayRows = rows.map(row => ({
    ...row,
    ...(rowEdits.overrides[hkIpoRowKey(row)] || {}),
  })).filter(row => !rowEdits.deleted[hkIpoRowKey(row)]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            {cols.map(([, label]) => (
              <th key={label} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map(row => (
            <tr key={row.id || row.code} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              {cols.map(([key]) => {
                if (key === 'companyName') {
                  const tags = Array.isArray(row.scenarioTags) ? row.scenarioTags : [];
                  return (
                    <td key={key} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <strong className="text-gray-900 dark:text-white">{row.companyName || '-'}</strong>
                        {tags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  );
                }
                if (key === 'status') {
                  const statusMap = HK_IPO_STATUS_MAP[row.status];
                  return (
                    <td key={key} className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap?.class || 'bg-gray-100 text-gray-600'}`}>
                        {row.status}
                      </span>
                    </td>
                  );
                }
                if (key === 'score') {
                  return (
                    <td key={key} className="px-4 py-3">
                      <span className={`font-semibold ${Number(row.score) >= 8 ? 'text-red-600 dark:text-red-400' :
                        Number(row.score) >= 6 ? 'text-yellow-600 dark:text-yellow-400' :
                        Number(row.score) >= 4 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                        {row.score}
                      </span>
                    </td>
                  );
                }
                if (key === 'shouldApply') {
                  return (
                    <td key={key} className="px-4 py-3">
                      <span className={`font-semibold ${row.shouldApply === '是' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                        {row.shouldApply}
                      </span>
                    </td>
                  );
                }
                if (key === 'attitude') {
                  const map = HK_IPO_ATTITUDE_MAP[row.attitude];
                  return (
                    <td key={key} className={`px-4 py-3 font-medium ${map?.class || 'text-gray-500'}`}>
                      {row.attitude}
                    </td>
                  );
                }
                if (key === 'actualMultiple') {
                  return (
                    <td key={key} className={`px-4 py-3 ${row.actualMultipleIncreased ? 'text-red-600 dark:text-red-400' : ''}`}>
                      <span className={`font-semibold ${Number(row.actualMultiple) > 100 ? 'text-red-600 dark:text-red-400' :
                        Number(row.actualMultiple) > 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                        {row.actualMultiple || '-'}
                      </span>
                      {row.actualMultipleIncreased && (
                        <span className="text-xs text-red-500 ml-1">捷利更新 ↑</span>
                      )}
                    </td>
                  );
                }
                if (key === 'actions') {
                  return (
                    <td key={key} className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => onEditRow(row)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200">
                          编辑
                        </button>
                        <button onClick={() => onDeleteRow(row)} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200">
                          删除
                        </button>
                      </div>
                    </td>
                  );
                }
                return (
                  <td key={key} className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {row[key] ?? '-'}
                  </td>
                );
              })}
            </tr>
          ))}
          {displayRows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                当前筛选条件下暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecommendationTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="px-4 py-3 text-left font-medium">排序</th>
            <th className="px-4 py-3 text-left font-medium">代码</th>
            <th className="px-4 py-3 text-left font-medium">公司</th>
            <th className="px-4 py-3 text-left font-medium">状态</th>
            <th className="px-4 py-3 text-left font-medium">得分</th>
            <th className="px-4 py-3 text-left font-medium">是否打</th>
            <th className="px-4 py-3 text-left font-medium">一手预计收益</th>
            <th className="px-4 py-3 text-left font-medium">公开总手数</th>
            <th className="px-4 py-3 text-left font-medium">策略</th>
            <th className="px-4 py-3 text-left font-medium">理由</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.rank} className="border-b border-gray-100 dark:border-gray-700">
              <td className="px-4 py-3 font-semibold">{row.rank}</td>
              <td className="px-4 py-3">{row.code}</td>
              <td className="px-4 py-3 font-medium">{row.companyName}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${HK_IPO_STATUS_MAP[row.status]?.class || 'bg-gray-100 text-gray-600'}`}>
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`font-semibold ${Number(row.score) >= 8 ? 'text-red-600 dark:text-red-400' :
                  Number(row.score) >= 6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {row.score}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`font-semibold ${row.shouldApply === '是' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                  {row.shouldApply}
                </span>
              </td>
              <td className="px-4 py-3">{row.oneLotExpectedProfit}</td>
              <td className="px-4 py-3">{row.publicTotalHands}</td>
              <td className="px-4 py-3">{row.strategy}</td>
              <td className="px-4 py-3 text-gray-500">{row.reason}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                暂无推荐排序
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BigVTable({ rows, onAddBigV, onDeleteBigV }) {
  const [formData, setFormData] = useState({
    code: '',
    companyName: '',
    bigVName: '',
    reason: '谨慎',
    positiveCount: '',
    sampleCount: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.bigVName) return;
    onAddBigV(formData);
    setFormData({ code: '', companyName: '', bigVName: '', reason: '谨慎', positiveCount: '', sampleCount: '' });
  };

  const scoreText = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(3).replace(/\.?0+$/, '') : String(value || 0);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <input
          type="text"
          placeholder="代码"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        />
        <input
          type="text"
          placeholder="公司名称"
          value={formData.companyName}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        />
        <input
          type="text"
          placeholder="大V名称"
          required
          value={formData.bigVName}
          onChange={(e) => setFormData({ ...formData, bigVName: e.target.value })}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        />
        <select
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        >
          <option value="梭哈">申购意见：梭哈</option>
          <option value="小仓位参与">申购意见：小仓位参与</option>
          <option value="谨慎">申购意见：谨慎</option>
          <option value="放弃">申购意见：放弃</option>
        </select>
        <input
          type="number"
          min="0"
          placeholder="支持数量"
          value={formData.positiveCount}
          onChange={(e) => setFormData({ ...formData, positiveCount: e.target.value })}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        />
        <input
          type="number"
          min="0"
          placeholder="总数量"
          value={formData.sampleCount}
          onChange={(e) => setFormData({ ...formData, sampleCount: e.target.value })}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
        />
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          添加大V
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="px-4 py-3 text-left font-medium">代码</th>
              <th className="px-4 py-3 text-left font-medium">公司</th>
              <th className="px-4 py-3 text-left font-medium">大V</th>
              <th className="px-4 py-3 text-left font-medium">大V名称</th>
              <th className="px-4 py-3 text-left font-medium">意向占比</th>
              <th className="px-4 py-3 text-left font-medium">申购意见</th>
              <th className="px-4 py-3 text-left font-medium">评分</th>
              <th className="px-4 py-3 text-left font-medium">置信度</th>
              <th className="px-4 py-3 text-left font-medium">样本说明</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700">
                <td className="px-4 py-3">{row.code}</td>
                <td className="px-4 py-3">{row.companyName}</td>
                <td className="px-4 py-3">{row.bigV}</td>
                <td className="px-4 py-3 font-medium">{row.bigVName}</td>
                <td className="px-4 py-3">{row.intention}</td>
                <td className="px-4 py-3">申购意见：{row.reason}</td>
                <td className="px-4 py-3 font-semibold">{scoreText(row.score)}</td>
                <td className="px-4 py-3">{row.confidence}</td>
                <td className="px-4 py-3 text-gray-500">{row.note}</td>
                <td className="px-4 py-3">
                  {row.manual ? (
                    <button onClick={() => onDeleteBigV(row.id)} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200">
                      删除
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">自动</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  暂无大V意向数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RulesTable({ rules, threshold, onThresholdChange, onAddRule, onSaveRules, onResetRules, onInsertRule, onDeleteRule, editingRuleId, onEditRule, rulesDirty }) {
  const [localRules, setLocalRules] = useState(rules);

  useEffect(() => {
    setLocalRules(rules);
  }, [rules]);

  const handleRuleChange = (ruleId, field, value) => {
    setLocalRules(prev => prev.map(rule => rule.id === ruleId ? { ...rule, [field]: field === 'score' ? Number(value) || 0 : value } : rule));
  };

  const handleSave = () => {
    onSaveRules({ rules: localRules, threshold });
  };

  const visibleRules = localRules.filter(rule => !rule.deleted);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">可打阈值</span>
          <input
            type="number"
            step="0.5"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-24"
          />
        </label>
        <div className="flex gap-2">
          <button onClick={onAddRule} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
            <Plus className="w-4 h-4 inline mr-1" />
            新增规则
          </button>
          <button onClick={onResetRules} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
            <RotateCcw className="w-4 h-4 inline mr-1" />
            重置默认
          </button>
          <button onClick={handleSave} disabled={rulesDirty === false} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
            <Save className="w-4 h-4 inline mr-1" />
            保存并重算
          </button>
          {rulesDirty && (
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 text-xs rounded">有未保存修改</span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="px-4 py-3 text-left font-medium">分类</th>
              <th className="px-4 py-3 text-left font-medium">评分项</th>
              <th className="px-4 py-3 text-left font-medium">判定文本</th>
              <th className="px-4 py-3 text-left font-medium">默认分</th>
              <th className="px-4 py-3 text-left font-medium">分数</th>
              <th className="px-4 py-3 text-left font-medium">类型</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {visibleRules.map(rule => {
              const editing = editingRuleId === rule.id;
              return (
                <tr key={rule.id} className={`border-b border-gray-100 dark:border-gray-700 ${editing ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <td className="px-4 py-3">
                    {editing ? (
                      <input
                        value={rule.category}
                        onChange={(e) => handleRuleChange(rule.id, 'category', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      <span>{rule.category}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <input
                        value={rule.item}
                        onChange={(e) => handleRuleChange(rule.id, 'item', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      <span>{rule.item}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <textarea
                        value={rule.condition}
                        onChange={(e) => handleRuleChange(rule.id, 'condition', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                        rows={2}
                      />
                    ) : (
                      <span className="text-gray-500">{rule.condition}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{rule.defaultScore}</td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <input
                        type="number"
                        step="0.5"
                        value={rule.score}
                        onChange={(e) => handleRuleChange(rule.id, 'score', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      <span className="font-semibold">{rule.score}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${rule.custom ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}>
                      {rule.custom ? '自定义' : '默认规则'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => onEditRule(editing ? '' : rule.id)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                        <Edit3 className="w-3 h-3 inline" />
                        {editing ? '完成' : '编辑'}
                      </button>
                      <button onClick={() => onInsertRule(rule.id)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                        <Plus className="w-3 h-3 inline" />
                        插入
                      </button>
                      <button onClick={() => onDeleteRule(rule.id)} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                        <Trash2 className="w-3 h-3 inline" />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleRules.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  暂无评分规则
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="px-4 py-3 text-left font-medium">代码</th>
            <th className="px-4 py-3 text-left font-medium">公司</th>
            <th className="px-4 py-3 text-left font-medium">得分</th>
            <th className="px-4 py-3 text-left font-medium">是否打</th>
            <th className="px-4 py-3 text-left font-medium">评分明细</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700">
              <td className="px-4 py-3">{row.code}</td>
              <td className="px-4 py-3 font-medium">{row.companyName}</td>
              <td className="px-4 py-3">
                <span className={`font-semibold ${Number(row.score) >= 8 ? 'text-red-600 dark:text-red-400' :
                  Number(row.score) >= 6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {row.score}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`font-semibold ${row.shouldApply === '是' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                  {row.shouldApply}
                </span>
              </td>
              <td className="px-4 py-3">
                {Array.isArray(row.components) && row.components.map((item, idx) => (
                  <span key={idx} className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs mr-1">
                    {item.item} {item.score}
                  </span>
                ))}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                暂无评分明细
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ValidationTable({ rows }) {
  const sourceRows = rows.filter(row => row.sourceName || row.sourceUrl);
  const issueRows = rows.filter(row => !row.sourceName && !row.sourceUrl);

  return (
    <div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="px-4 py-3 text-left font-medium">数据源</th>
              <th className="px-4 py-3 text-left font-medium">类型</th>
              <th className="px-4 py-3 text-left font-medium">可校验字段</th>
              <th className="px-4 py-3 text-left font-medium">用途/自动化状态</th>
              <th className="px-4 py-3 text-left font-medium">链接</th>
            </tr>
          </thead>
          <tbody>
            {sourceRows.map(row => (
              <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700">
                <td className="px-4 py-3 font-medium">{row.sourceName || row.issue}</td>
                <td className="px-4 py-3">{row.sourceTier || row.level}</td>
                <td className="px-4 py-3">{row.sourceFields || row.field}</td>
                <td className="px-4 py-3 text-gray-500">
                  {row.sourceUsage || ''}
                  {row.sourceAutoCheck && `；${row.sourceAutoCheck}`}
                </td>
                <td className="px-4 py-3">
                  {row.sourceUrl && /^https?:\/\//.test(row.sourceUrl) ? (
                    <a href={row.sourceUrl} target="_blank" rel="noopener" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      打开
                    </a>
                  ) : (
                    <span>{row.sourceUrl || row.sourceAccess || '-'}</span>
                  )}
                </td>
              </tr>
            ))}
            {sourceRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  暂无数据源配置
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="px-4 py-3 text-left font-medium">字段</th>
              <th className="px-4 py-3 text-left font-medium">问题</th>
              <th className="px-4 py-3 text-left font-medium">级别</th>
              <th className="px-4 py-3 text-left font-medium">建议</th>
            </tr>
          </thead>
          <tbody>
            {issueRows.map(row => (
              <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700">
                <td className="px-4 py-3">{row.field}</td>
                <td className="px-4 py-3">{row.issue}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${row.level === '警告' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                    row.level === '错误' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}>
                    {row.level}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{row.suggestion}</td>
              </tr>
            ))}
            {issueRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  暂无校验问题
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalysisTimeArea({ periodMode, period, onModeChange, onPeriodChange }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let periodOptions = [];
  if (periodMode === 'day') {
    periodOptions = [{ value: `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, label: `${year}年${month + 1}月${now.getDate()}日` }];
  } else if (periodMode === 'month') {
    periodOptions = Array.from({ length: month + 1 }, (_, index) => {
      const targetMonth = month - index;
      const value = `${year}-${String(targetMonth + 1).padStart(2, '0')}`;
      const label = index === 0 ? '本月' : index === 1 ? '上月' : `${targetMonth + 1}月`;
      return { value, label };
    });
  } else if (periodMode === 'year') {
    periodOptions = [];
    for (let y = year; y >= Math.min(year, 2020); y -= 1) {
      periodOptions.push({ value: String(y), label: y === year ? '今年' : y === year - 1 ? '去年' : `${y}年` });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex gap-1">
        {[
          { mode: 'day', label: '日常' },
          { mode: 'month', label: '月统计' },
          { mode: 'year', label: '年统计' },
          { mode: 'custom', label: '自定义' },
        ].map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${periodMode === mode ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {periodMode !== 'custom' && periodOptions.length > 0 && (
        <div className="flex gap-1">
          {periodOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onPeriodChange(value)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${period === value ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function hkIpoAdvFilterRows(rows, filters) {
  if (!filters || !Object.keys(filters).length) return rows;
  return rows.filter(row => {
    for (const fd of HK_IPO_FILTER_FIELDS) {
      const val = filters[fd.key];
      if (!val) continue;
      const raw = row[fd.key];
      if (fd.type === 'range') {
        const num = Number(raw) || 0;
        if (val.min !== undefined && val.min !== '' && num < Number(val.min)) return false;
        if (val.max !== undefined && val.max !== '' && num > Number(val.max)) return false;
      } else if (fd.type === 'select') {
        if (val && String(raw).trim() !== val) return false;
      } else {
        const q = String(val).trim().toLowerCase();
        if (q && !String(raw || '').toLowerCase().includes(q)) return false;
      }
    }
    return true;
  });
}

export default function HkIpo({ onBack }) {
  const [payload, setPayload] = useState({
    rows: [],
    recommendations: [],
    bigVRows: [],
    scoreRows: [],
    rules: [],
    validationRows: [],
    dataSources: [],
    stats: null,
    fetchedAt: '',
    source: '',
    threshold: 6,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeView, setActiveView] = useState('main');
  const [showAdvFilter, setShowAdvFilter] = useState(false);
  const [advFilters, setAdvFilters] = useState({});
  const [visibleCols, setVisibleCols] = useState({});
  const [editingRuleId, setEditingRuleId] = useState('');
  const [strategyShowAll, setStrategyShowAll] = useState(false);
  const [rulesDirty, setRulesDirty] = useState(false);
  const [periodMode, setPeriodMode] = useState('day');
  const [period, setPeriod] = useState('');

  const [manualBigVRows, setManualBigVRows] = useState([]);
  const [strategyEdits, setStrategyEdits] = useState({ overrides: {}, deleted: {} });
  const [rowEdits, setRowEdits] = useState({ overrides: {}, deleted: {} });
  const [editingRowKey, setEditingRowKey] = useState('');
  const [editingRowData, setEditingRowData] = useState({});
  const [editingStrategyKey, setEditingStrategyKey] = useState('');
  const [editingStrategyText, setEditingStrategyText] = useState('');

  useEffect(() => {
    const savedBigV = localStorage.getItem('hk_ipo_manual_bigv');
    if (savedBigV) {
      try {
        setManualBigVRows(JSON.parse(savedBigV));
      } catch (e) {
        setManualBigVRows([]);
      }
    }

    const savedStrategy = localStorage.getItem('hk_ipo_strategy_edits');
    if (savedStrategy) {
      try {
        setStrategyEdits(JSON.parse(savedStrategy));
      } catch (e) {
        setStrategyEdits({ overrides: {}, deleted: {} });
      }
    }

    const savedRowEdits = localStorage.getItem('hk_ipo_row_edits');
    if (savedRowEdits) {
      try {
        setRowEdits(JSON.parse(savedRowEdits));
      } catch (e) {
        setRowEdits({ overrides: {}, deleted: {} });
      }
    }
  }, []);

  const saveManualBigVRows = (rows) => {
    localStorage.setItem('hk_ipo_manual_bigv', JSON.stringify(rows));
    setManualBigVRows(rows);
  };

  const saveStrategyEdits = (edits) => {
    localStorage.setItem('hk_ipo_strategy_edits', JSON.stringify(edits));
    setStrategyEdits(edits);
  };

  const saveRowEdits = (edits) => {
    localStorage.setItem('hk_ipo_row_edits', JSON.stringify(edits));
    setRowEdits(edits);
  };

  const hkIpoBigVManualScore = (total, positive) => {
    const sampleCount = Math.max(0, Number(total) || 0);
    const positiveCount = Math.max(0, Number(positive) || 0);
    if (!sampleCount || !positiveCount) return 0;
    const ratio = Math.min(1, positiveCount / sampleCount);
    if (ratio >= 1) return 4;
    const quantityWeight = 0.75 + Math.min(sampleCount, 4) * 0.0625;
    return Number(Math.min(3.999, ratio * 4 * quantityWeight).toFixed(3));
  };

  const loadHkIpo = useCallback(async (force = false) => {
    setLoading(true);
    setError('');
    try {
      const params = force ? { refresh: '1' } : {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.query = searchQuery;
      const data = await fetchHkIpo(params);

      const mergedBigVRows = [...(data.bigVRows || []), ...manualBigVRows.map((row, idx) => ({
        id: row.id || `manual-${Date.now()}-${idx}`,
        code: row.code,
        companyName: row.companyName,
        bigV: `${row.positiveCount || 0}/${row.sampleCount || 0}`,
        bigVName: row.bigVName || '手动录入',
        intention: row.sampleCount ? `${((Number(row.positiveCount) || 0) / Number(row.sampleCount) * 100).toFixed(1)}%` : '未获取',
        reason: row.reason || '谨慎',
        score: hkIpoBigVManualScore(row.sampleCount, row.positiveCount),
        confidence: '手动',
        note: row.note || '手动增加',
        manual: true,
        sampleCount: Number(row.sampleCount) || 0,
        positiveCount: Number(row.positiveCount) || 0,
      }))].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

      const rowsWithEdits = (data.rows || []).map(row => ({
        ...row,
        ...(rowEdits.overrides[hkIpoRowKey(row)] || {}),
      })).filter(row => !rowEdits.deleted[hkIpoRowKey(row)]);

      const updatedPayload = {
        ...data,
        bigVRows: mergedBigVRows,
        rows: rowsWithEdits,
        stats: recomputeStats(rowsWithEdits),
      };

      setPayload(updatedPayload);
    } catch (err) {
      setError('港股打新数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, manualBigVRows, rowEdits]);

  useEffect(() => {
    loadHkIpo();
  }, []);

  const handleRefresh = () => loadHkIpo(true);

  const handleSearch = (e) => {
    e.preventDefault();
    loadHkIpo();
  };

  const handleResetFilter = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setAdvFilters({});
    loadHkIpo();
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.query = searchQuery;
      const blob = await exportHkIpo(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `港股打新分析_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败');
    }
  };

  const handleSaveRules = async (data) => {
    setLoading(true);
    try {
      await saveHkIpoRules(data);
      setEditingRuleId('');
      setRulesDirty(false);
      await loadHkIpo(true);
    } catch (err) {
      setError('保存规则失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRules = async () => {
    if (!confirm('确认恢复默认评分规则？当前账号自定义分数会被清空。')) return;
    setLoading(true);
    try {
      await saveHkIpoRules({ reset: true });
      setEditingRuleId('');
      setRulesDirty(false);
      await loadHkIpo(true);
    } catch (err) {
      setError('重置规则失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBigV = (data) => {
    const newRow = { ...data, id: `manual-${Date.now()}` };
    saveManualBigVRows([...manualBigVRows, newRow]);
    loadHkIpo();
  };

  const handleDeleteBigV = (id) => {
    const newRows = manualBigVRows.filter(row => row.id !== id);
    saveManualBigVRows(newRows);
    loadHkIpo();
  };

  const handleEditStrategy = (key, row) => {
    setEditingStrategyKey(key);
    setEditingStrategyText(strategyEdits.overrides[key]?.strategy ?? row.strategy ?? row.summary ?? '');
  };

  const handleSaveStrategy = (key) => {
    saveStrategyEdits({
      ...strategyEdits,
      overrides: {
        ...strategyEdits.overrides,
        [key]: { strategy: editingStrategyText },
      },
    });
    setEditingStrategyKey('');
    setEditingStrategyText('');
  };

  const handleDeleteStrategy = (key) => {
    if (!confirm('确认删除此策略？')) return;
    saveStrategyEdits({
      ...strategyEdits,
      deleted: {
        ...strategyEdits.deleted,
        [key]: true,
      },
    });
  };

  const handleEditRow = (row) => {
    const key = hkIpoRowKey(row);
    setEditingRowKey(key);
    setEditingRowData({ ...row });
  };

  const handleSaveRow = (key) => {
    saveRowEdits({
      ...rowEdits,
      overrides: {
        ...rowEdits.overrides,
        [key]: editingRowData,
      },
    });
    setEditingRowKey('');
    setEditingRowData({});
    loadHkIpo();
  };

  const handleDeleteRow = (row) => {
    if (!confirm('确认删除此行？')) return;
    const key = hkIpoRowKey(row);
    saveRowEdits({
      ...rowEdits,
      deleted: {
        ...rowEdits.deleted,
        [key]: true,
      },
    });
    loadHkIpo();
  };

  const handleAddRule = () => {
    const newRule = {
      id: `custom-${Date.now()}`,
      category: '自定义',
      item: '自定义评分项',
      condition: '',
      score: 0,
      defaultScore: 0,
      system: false,
      custom: true,
    };
    setPayload(prev => ({ ...prev, rules: [...prev.rules, newRule] }));
    setRulesDirty(true);
    setEditingRuleId(newRule.id);
  };

  const handleInsertRule = (afterId) => {
    const newRule = {
      id: `custom-${Date.now()}`,
      category: '自定义',
      item: '自定义评分项',
      condition: '',
      score: 0,
      defaultScore: 0,
      system: false,
      custom: true,
    };
    setPayload(prev => {
      const rules = [...prev.rules];
      const index = rules.findIndex(r => r.id === afterId);
      if (index >= 0) {
        rules.splice(index + 1, 0, newRule);
      } else {
        rules.push(newRule);
      }
      return { ...prev, rules };
    });
    setRulesDirty(true);
    setEditingRuleId(newRule.id);
  };

  const handleDeleteRule = (ruleId) => {
    if (!confirm('确认删除此规则？')) return;
    setPayload(prev => ({
      ...prev,
      rules: prev.rules.map(rule => rule.id === ruleId ? { ...rule, deleted: true } : rule),
    }));
    setRulesDirty(true);
    setEditingRuleId('');
  };

  const handleAdvFilterChange = (key, type, value) => {
    setAdvFilters(prev => {
      const current = prev[key] || (type === 'range' ? { min: '', max: '' } : '');
      if (type === 'range') {
        return { ...prev, [key]: { ...current, [value.range]: value.value } };
      }
      return { ...prev, [key]: value };
    });
  };

  const filteredRows = hkIpoAdvFilterRows(payload.rows, advFilters);
  const stats = payload.stats || recomputeStats(filteredRows);

  const tabs = [
    { id: 'main', label: '主表', count: filteredRows.length },
    { id: 'recommendations', label: '推荐排序', count: payload.recommendations.length },
    { id: 'bigv', label: '大V意向', count: payload.bigVRows.length },
    { id: 'rules', label: '评分规则', count: payload.rules.filter(r => !r.deleted).length },
    { id: 'scores', label: '评分明细', count: payload.scoreRows.length },
    { id: 'validation', label: '数据校验', count: payload.validationRows.length },
  ];

  const getActiveTable = () => {
    switch (activeView) {
      case 'recommendations':
        return { title: '推荐排序', badge: '动态重算', component: <RecommendationTable rows={payload.recommendations} /> };
      case 'bigv':
        return { title: '大V意向', badge: '联动筛选', component: <BigVTable rows={payload.bigVRows} onAddBigV={handleAddBigV} onDeleteBigV={handleDeleteBigV} /> };
      case 'rules':
        return {
          title: '评分规则',
          badge: '当前账号保存',
          component: (
            <RulesTable
              rules={payload.rules}
              threshold={payload.threshold}
              onThresholdChange={(t) => {
                setPayload(prev => ({ ...prev, threshold: t }));
                setRulesDirty(true);
              }}
              onAddRule={handleAddRule}
              onSaveRules={handleSaveRules}
              onResetRules={handleResetRules}
              onInsertRule={handleInsertRule}
              onDeleteRule={handleDeleteRule}
              editingRuleId={editingRuleId}
              onEditRule={setEditingRuleId}
              rulesDirty={rulesDirty}
            />
          )};
      case 'scores':
        return { title: '评分明细', badge: `${payload.scoreRows.length} 条`, component: <ScoreTable rows={payload.scoreRows} /> };
      case 'validation':
        return { title: '数据校验', badge: `${payload.validationRows.length} 条`, component: <ValidationTable rows={payload.validationRows} /> };
      default:
        return {
          title: '主表',
          badge: `${filteredRows.length} 条`,
          component: (
            <MainTable
              rows={filteredRows}
              visibleCols={visibleCols}
              rowEdits={rowEdits}
              onEditRow={handleEditRow}
              onDeleteRow={handleDeleteRow}
            />
          )
        };
    }
  };

  const activeTable = getActiveTable();

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700">
              <span className="text-xl">‹</span>
            </button>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">辅助工具 / 港股打新</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">港股打新分析</h1>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 dark:text-gray-400">更新时间：{formatDateTime(payload.fetchedAt) || '尚未加载'}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${payload.cached ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                  {payload.cached ? '缓存数据' : '实时数据'}
                </span>
                {payload.refreshing && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    后台刷新中
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadHkIpo(true)} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '加载中...' : '刷新'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard label="总项目数" value={stats.total || 0} hint="当前筛选结果" />
          <StatCard label="建议打新数" value={stats.recommended || 0} hint="是否打 = 是" />
          <StatCard label="平均分" value={stats.averageScore || 0} hint={`阈值 ${payload.threshold}`} />
          <StatCard label="最高分项目" value={stats.bestScoreProject || '-'} hint="按重算得分" />
          <StatCard label="最高一手预计收益" value={stats.bestProfitProject || '-'} hint="按当前筛选" />
          <StatCard label="当前状态数量" value={Object.entries(stats.statusCounts || {}).map(([k, v]) => `${k}${v}`).join(' / ') || '-'} hint="招股中/待上市/暗盘/已上市" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <StrategyCard
            rows={filteredRows}
            showAll={strategyShowAll}
            onToggleShowAll={() => setStrategyShowAll(!strategyShowAll)}
            strategyEdits={strategyEdits}
            onEditStrategy={handleEditStrategy}
            onDeleteStrategy={handleDeleteStrategy}
          />
          <BarChart title="一手预计收益排行" rows={(stats.profitRanking || []).map(row => ({
            label: row.companyName,
            count: row.value,
            tag: row.priceTag,
          }))} />
          <StatusChart counts={stats.statusCounts || {}} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeTable.title}</h2>
              <div className="flex gap-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${activeView === tab.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                  >
                    {tab.label}
                    <span className="ml-1 text-xs opacity-70">{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>

          <AnalysisTimeArea
            periodMode={periodMode}
            period={period}
            onModeChange={setPeriodMode}
            onPeriodChange={setPeriod}
          />

          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-4">
            <div className="flex gap-1">
              {['all', '招股中', '待上市', '暗盘', '已上市'].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                >
                  {status === 'all' ? '全部' : status}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索代码、公司名称"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
              查询
            </button>
            <button type="button" onClick={handleResetFilter} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
              还原
            </button>
            <button type="button" onClick={() => setShowAdvFilter(!showAdvFilter)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${showAdvFilter
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
              高级筛选
            </button>
          </form>

          {showAdvFilter && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white">高级筛选</h3>
                <button onClick={() => setAdvFilters({})} className="text-sm text-gray-500 hover:text-gray-700">
                  清除筛选
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {HK_IPO_FILTER_FIELDS.map(fd => {
                  const val = advFilters[fd.key];
                  if (fd.type === 'range') {
                    return (
                      <label key={fd.key} className="flex flex-col">
                        <span className="text-xs text-gray-500 mb-1">{fd.label}</span>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            step="any"
                            placeholder="最小"
                            value={val?.min || ''}
                            onChange={(e) => handleAdvFilterChange(fd.key, 'range', { range: 'min', value: e.target.value })}
                            className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm"
                          />
                          <span className="self-center text-gray-400">~</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="最大"
                            value={val?.max || ''}
                            onChange={(e) => handleAdvFilterChange(fd.key, 'range', { range: 'max', value: e.target.value })}
                            className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm"
                          />
                        </div>
                      </label>
                    );
                  }
                  return (
                    <label key={fd.key} className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">{fd.label}</span>
                      <input
                        type="text"
                        placeholder="包含..."
                        value={val || ''}
                        onChange={(e) => handleAdvFilterChange(fd.key, 'text', e.target.value)}
                        className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm"
                      />
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium mb-2">显示列</h4>
                <div className="flex flex-wrap gap-3">
                  {HK_IPO_ALL_COLS.map(([key, label]) => {
                    const locked = HK_IPO_LOCKED_COLS.has(key);
                    const checked = !visibleCols || visibleCols[key] !== false;
                    return (
                      <label key={key} className={`flex items-center gap-2 ${locked ? 'opacity-60' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={(e) => setVisibleCols(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTable.component}

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-500">{activeTable.title}：{activeTable.badge}</span>
          </div>
        </div>

        {editingStrategyKey && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">编辑策略</h3>
              <textarea
                value={editingStrategyText}
                onChange={(e) => setEditingStrategyText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mb-4"
                rows={4}
                placeholder="输入策略内容..."
              />
              <div className="flex gap-2">
                <button onClick={() => { setEditingStrategyKey(''); setEditingStrategyText(''); }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                  取消
                </button>
                <button onClick={() => handleSaveStrategy(editingStrategyKey)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {editingRowKey && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">编辑行数据</h3>
              <div className="grid grid-cols-2 gap-4">
                {HK_IPO_ALL_COLS.filter(([key]) => !HK_IPO_LOCKED_COLS.has(key)).map(([key, label]) => (
                  <label key={key} className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">{label}</span>
                    <input
                      type="text"
                      value={editingRowData[key] || ''}
                      onChange={(e) => setEditingRowData(prev => ({ ...prev, [key]: e.target.value }))}
                      className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm"
                    />
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setEditingRowKey(''); setEditingRowData({}); }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                  取消
                </button>
                <button onClick={() => handleSaveRow(editingRowKey)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
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
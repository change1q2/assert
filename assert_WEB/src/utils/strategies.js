export const DEFAULT_STRATEGIES = [
  {
    id: 'value-investing',
    title: '价值投资策略',
    description: '长期持有优质公司，赚取企业成长收益',
    icon: 'Target',
    color: 'purple',
    preset: true,
    philosophies: [
      {
        id: 'vi-1',
        title: '长期持有',
        description: '以合理价格买入优质公司，陪伴企业成长，赚取长期复利收益。不为短期波动所动。',
        icon: 'Target',
        color: 'purple',
      },
      {
        id: 'vi-2',
        title: '安全边际',
        description: '只在价格显著低于内在价值时买入，预留充足的安全边际以应对不确定性。',
        icon: 'Shield',
        color: 'blue',
      },
      {
        id: 'vi-3',
        title: '能力圈原则',
        description: '只投资自己能理解的生意，不懂不做。在熟悉的领域中寻找确定性机会。',
        icon: 'CircleDollarSign',
        color: 'green',
      },
    ],
  },
  {
    id: 'index-fund',
    title: '指数基金定投',
    description: '定期定额投资宽基指数，分享市场平均收益',
    icon: 'TrendingUp',
    color: 'green',
    preset: true,
    philosophies: [
      {
        id: 'if-1',
        title: '分散投资',
        description: '通过指数基金分散投资一篮子股票，降低个股风险，获取市场平均收益。',
        icon: 'PieChart',
        color: 'green',
      },
      {
        id: 'if-2',
        title: '长期定投',
        description: '每月固定时间定额投入，利用时间和复利效应平滑市场波动，积累长期财富。',
        icon: 'TrendingUp',
        color: 'green',
      },
    ],
  },
  {
    id: 'convertible-bond',
    title: '可转债套利',
    description: '利用可转债的债性和股性进行套利交易',
    icon: 'Zap',
    color: 'orange',
    preset: true,
    philosophies: [
      {
        id: 'cb-1',
        title: '下有保底',
        description: '可转债具有债券属性，到期可保本付息，下跌空间有限，适合风险厌恶型投资者。',
        icon: 'Shield',
        color: 'orange',
      },
      {
        id: 'cb-2',
        title: '上不封顶',
        description: '可转债具有股票属性，正股上涨时可享受上涨收益，进攻性十足。',
        icon: 'Rocket',
        color: 'orange',
      },
    ],
  },
  {
    id: 'hk-ipo',
    title: '港股打新',
    description: '参与港股IPO认购，获取新股上市收益',
    icon: 'Rocket',
    color: 'blue',
    preset: true,
    philosophies: [
      {
        id: 'hk-1',
        title: '现金为王',
        description: '港股打新需要充足现金支持多票申购，提高中签概率，分散风险。',
        icon: 'CircleDollarSign',
        color: 'blue',
      },
      {
        id: 'hk-2',
        title: '分散申购',
        description: '同时申购多只新股，分散单一新股破发风险，提高整体胜率。',
        icon: 'PieChart',
        color: 'blue',
      },
    ],
  },
];

const PRESET_IDS = new Set(DEFAULT_STRATEGIES.map((s) => s.id));

export function migrateStrategies(oldState) {
  const oldStrategies = oldState?.strategies;

  if (oldStrategies && oldStrategies.list) {
    return oldStrategies;
  }

  const pools = {};
  const list = DEFAULT_STRATEGIES.map((s) => ({
    ...s,
    philosophies: s.philosophies.map((p) => ({ ...p })),
  }));

  if (oldStrategies && !Array.isArray(oldStrategies)) {
    if (oldStrategies.valueInvestingPool) {
      pools['value-investing'] = [...oldStrategies.valueInvestingPool];
    }

    Object.entries(oldStrategies).forEach(([key, value]) => {
      if (key !== 'valueInvestingPool' && key !== 'list' && key !== 'pools' && Array.isArray(value)) {
        pools[key] = [...value];
      }
    });

    const customStrategies = Object.entries(oldStrategies)
      .filter(
        ([key]) =>
          key !== 'valueInvestingPool' &&
          key !== 'list' &&
          key !== 'pools' &&
          !key.endsWith('Pool')
      )
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return value;
        }
        return null;
      })
      .filter(Boolean);

    customStrategies.forEach((cs) => {
      if (cs.id && !PRESET_IDS.has(cs.id)) {
        list.push({
          id: cs.id,
          title: cs.title || cs.name || cs.id,
          description: cs.description || '',
          icon: cs.icon || 'Lightbulb',
          color: cs.color || 'gray',
          preset: false,
          philosophies: Array.isArray(cs.philosophies) ? cs.philosophies : [],
        });
      }
    });
  }

  DEFAULT_STRATEGIES.forEach((s) => {
    if (!pools[s.id]) {
      pools[s.id] = [];
    }
  });

  return { list, pools };
}

export function getAssetPool(strategiesState, strategyId) {
  if (!strategiesState || !strategiesState.pools) return [];
  return strategiesState.pools[strategyId] || [];
}

export function getStrategyById(strategiesState, strategyId) {
  if (!strategiesState || !strategiesState.list) return null;
  return strategiesState.list.find((s) => s.id === strategyId) || null;
}

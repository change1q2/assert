# 收益分析页面重设计 - 任务计划

- [ ] Task 1: 勾选区重构为单选互斥 + 删除资产分析
  - [ ] 修改 analysisFeatures state：position/extreme/drawdown 改为字符串类型 `selectedAnalysis: '' | 'position' | 'extreme' | 'drawdown'`
  - [ ] 删除 `auxFeatures.assetAnalysis` state 及勾选框
  - [ ] 修改 onChange 逻辑：选中一项时其他项自动取消（互斥）
  - [ ] 删除资产分析渲染区域（原约1974行附近"资产分析（一级分类）"区块）
  - [ ] 修改条件渲染：用 `selectedAnalysis === 'position'` 替代 `analysisFeatures.position`

- [ ] Task 2: 仓位分析改为饼图（真实数据）
  - [ ] 新增 `positionPieData` useMemo：从 `financeAssets` 按 `categoryL1` 分组，统计 `currentValue` 总和
  - [ ] 计算每个分类的占比百分比
  - [ ] 删除原热力图 SVG 渲染逻辑
  - [ ] 新增 SVG 饼图渲染：使用 `<path>` 绘制扇形，按占比分配角度
  - [ ] 饼图右侧显示图例（分类名称 + 占比 + 市值）
  - [ ] 支持鼠标悬停高亮扇形

- [ ] Task 3: 极值分析独立走势图
  - [ ] 复用主走势图的 `displayData` / `userData` 计算逻辑
  - [ ] 在选中区域上方显示标题"最大收益率: +X.XX%"
  - [ ] 绘制用户收益率曲线（简化版 SVG）
  - [ ] 标注最大收益点位（绿色圆点 + 标签）
  - [ ] 移除原收益率曲线上的极值标注（避免重复）

- [ ] Task 4: 最大回撤独立走势图
  - [ ] 复用主走势图数据
  - [ ] 在选中区域上方显示标题"最大回撤: -X.XX%"
  - [ ] 绘制用户收益率曲线
  - [ ] 标注回撤区间：从峰值到谷值的红色阴影区域
  - [ ] 移除原收益率曲线上的回撤标注

- [ ] Task 5: 资产类型分析增强
  - [ ] 复用现有的 `assetTypeData` 计算逻辑（约1907行）
  - [ ] 增强数据：除 `value`/`pnl`/`count` 外，增加收益率计算（需要获取成本数据）
  - [ ] 显示格式：类型名称 | 市值 | 占比% | 收益额 | 收益率%
  - [ ] 使用表格或卡片列表展示

- [ ] Task 6: 指数区间涨跌幅计算
  - [ ] 新增 `getIndexPeriodReturn(history, timeRange)` 函数：
    - 从 `indexHistoryData.history` 中根据 timeRange 找到区间起始和结束数据点
    - 计算 `(endClose - startClose) / startClose * 100`
    - 支持 day/month/quarter/halfyear/year/all/custom
  - [ ] 修改"指数对比"卡片：
    - 用区间涨跌幅替代 `allIndexData[selectedIndex].changeRate`
    - 所有指数（allIndexOptions）都计算各自的区间涨跌幅
    - 对比条的百分比宽度基于区间涨跌幅
  - [ ] 修改"本月跑赢/跑输"差异计算：使用区间涨跌幅

- [ ] Task 7: 构建验证与浏览器测试
  - [ ] npm run build 成功无报错
  - [ ] 测试单选互斥：选仓位后极值自动取消
  - [ ] 测试仓位分析饼图显示正确占比
  - [ ] 测试极值/回撤走势图正确显示
  - [ ] 测试资产类型列表显示收益率和占比
  - [ ] 测试指数对比卡片：切换时间区间后涨跌幅变化（如本月上证应显示约-6%）

# Task Dependencies
- Task 2 依赖 Task 1（需要先重构 state）
- Task 3 依赖 Task 1
- Task 4 依赖 Task 1
- Task 5 独立可并行
- Task 6 独立可并行
- Task 7 依赖所有前置任务

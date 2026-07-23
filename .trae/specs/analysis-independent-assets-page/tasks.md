# Tasks

- [x] Task 1: Analysis.jsx 修改 Tab 点击逻辑
  - [x] SubTask 1.1: 修改 `independent-assets` Tab 不调用 onNavigate
  - [x] SubTask 1.2: 在 analysisTab === 'independent-assets' 时渲染 IndependentAssetAnalysis 组件

- [x] Task 2: 创建 IndependentAssetAnalysis 组件
  - [x] SubTask 2.1: 接收 independentAssets props
  - [x] SubTask 2.2: 计算独立总资金、收益额、收益率
  - [x] SubTask 2.3: 实现核心指标卡片渲染
  - [x] SubTask 2.4: 实现资产类别占比饼图（保险、房产、车辆、固定投资、股权、定期资产）

- [x] Task 3: 独立资产走势图
  - [x] SubTask 3.1: 基于独立资产记录的创建时间构建月度时间序列
  - [x] SubTask 3.2: 渲染总市值折线图（X 轴：月份，Y 轴：金额）

- [x] Task 4: 月度现金流图
  - [x] SubTask 4.1: 收集各资产的投入和回报事件
  - [x] SubTask 4.2: 渲染月度现金流柱状图（区分正负）

- [x] Task 5: 构建验证
  - [x] SubTask 5.1: `npm run build` 成功无报错
  - [x] SubTask 5.2: 页面切换和数据展示正常

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3、Task 4 依赖 Task 2
- Task 5 依赖所有前置任务

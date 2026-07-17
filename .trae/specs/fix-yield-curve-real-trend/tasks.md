# 收益率曲线真实趋势与时间轴倒序 - 任务计划

- [x] Task 1: 修改指数收益率计算为真实涨跌幅度
  - [x] 在 AssetPenetration.jsx 的 SVG 曲线图渲染逻辑中，找到指数数据点计算代码（约第 1250-1300 行附近）
  - [x] 修改为：取 `displayData` 第一个有效 `close` 作为 `firstClose`
  - [x] 每个数据点的指数收益率 `idxRate = (close - firstClose) / firstClose * 100`
  - [x] 不再使用 `indexTotalRate` 缩放逻辑，直接用真实收益率序列
  - [x] 用户收益线保持原有逻辑：从 0% 到 `currentPnlRate` 线性缩放

- [x] Task 2: 修复时间轴 MM-DD 格式与顺序
  - [x] 确认 `getYieldCurveData` 函数返回的数据已按时间升序排列（最早的日期在 `displayData[0]`）
  - [x] 检查 SVG X轴标签渲染逻辑：`timeLabels.map((label, i) => ...)` 显示 `MM-DD` 格式
  - [x] 若数据顺序不对，在传入 SVG 前调用 `.reverse()` 确保从左到右时间递增

- [x] Task 3: 验证 Y轴刻度与指数涨跌一致
  - [x] 检查 `yMin` / `yMax` 的计算逻辑：应包含用户收益率和指数收益率的最值
  - [x] 确认 Y轴刻度从下到上递增（负值在下，正值在上）
  - [x] 验证 `indexData?.changeRate` 与曲线图右端点的指数收益率一致

- [x] Task 4: 构建验证与浏览器测试
  - [x] npm run build 成功无报错
  - [x] 浏览器测试：切换指数后曲线图显示真实涨跌幅度（如指数下跌 1.6%，曲线图 Y轴刻度包含 -1.6%）
  - [x] 浏览器测试：X轴时间标签显示 MM-DD 格式，从左到右时间递增（07-01、07-02、...）
  - [x] 浏览器测试：用户收益线从 0% 到当前总收益率正确显示

# Task Dependencies
- Task 2 依赖 Task 1（需要正确的数据顺序）
- Task 3 依赖 Task 1
- Task 4 依赖 Task 1-3
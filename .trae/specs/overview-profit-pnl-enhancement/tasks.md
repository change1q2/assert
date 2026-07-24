# 资产总览收益与盈亏增强 - 实现计划

## [x] Task 1: 计算理财总盈亏和独立资产总盈亏
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 Overview.jsx 中，在现有 financeTotalValue 计算后，增加理财总成本和理财总盈亏计算
  - 理财总成本 = sum(financeAssets 的 cost)
  - 理财总盈亏 = financeTotalValue - 理财总成本（货币汇率折算与市值计算保持一致）
  - 在现有 independentTotalValue 计算后，增加独立资产总成本和总盈亏计算
  - 独立资产总成本按各类型分别计算（保险=保费总额，房产=购买价，车辆=购买价，固定投资=投资成本，股权=投资成本，定期=金额）
  - 独立资产总盈亏 = independentTotalValue - independentTotalCost
- **Acceptance Criteria Addressed**: AC-1（理财总资产卡片显示总盈亏）、AC-2（独立总资产卡片显示总盈亏）

## [x] Task 2: 在理财总资产和独立总资产卡片上显示盈亏
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在理财总资产卡片（PiggyBank 图标卡片）的总资产金额下方新增一行
  - 显示格式：盈亏金额（收益率），盈利绿色、亏损红色
  - 在独立总资产卡片（Landmark 图标卡片）的总资产金额下方新增一行
  - 显示格式：盈亏金额（收益率），盈利绿色、亏损红色
- **Acceptance Criteria Addressed**: AC-1、AC-2

## [x] Task 3: 重构收益与盈亏卡片为综合现金流展示
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 重构"收益与盈亏"卡片内容：
    - 移除"当年收益率"大数字和"市值/投入"进度条
    - 顶部改为三个指标并排：总流入、总流出、综合现金流
    - 总流入 = totalIncome + max(理财总盈亏, 0) + max(独立资产总盈亏, 0)
    - 总流出 = totalExpense + max(-理财总盈亏, 0) + max(-独立资产总盈亏, 0) - liabilities.total
    - 综合现金流 = 总流入 - 总流出
    - 综合现金流为正绿色、为负红色
  - 下方保留"分类盈亏"列表（现有逻辑不变）
- **Acceptance Criteria Addressed**: AC-3（收益与盈亏卡片展示综合现金流）

## [x] Task 4: 新增流入构成饼图卡片
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 在收益与盈亏区域下方新增一行网格布局
  - 左侧新增"流入构成"饼图卡片
  - 数据：总收入、理财正盈亏、独立资产正盈亏
  - 使用 Recharts PieChart，显示名称、金额和占比
  - 饼图颜色：总收入=蓝色，理财正盈亏=绿色，独立资产正盈亏=紫色
- **Acceptance Criteria Addressed**: AC-4（新增流入构成饼图卡片）

## [x] Task 5: 新增流出构成饼图卡片
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 在流入构成饼图旁边新增"流出构成"饼图卡片
  - 数据：总支出、理财负盈亏绝对值、独立资产负盈亏绝对值、总负债
  - 使用 Recharts PieChart，显示名称、金额和占比
  - 饼图颜色：总支出=橙色，理财负盈亏=红色，独立资产负盈亏=深红，总负债=灰色
- **Acceptance Criteria Addressed**: AC-5（新增流出构成饼图卡片）

## [x] Task 6: 总负债卡片新增资产负债图标
- **Priority**: low
- **Depends On**: None
- **Description**:
  - 在总负债卡片标题右侧（CreditCard 旁边或替换为）新增 Scale 图标
  - 图标颜色保持红色系
  - 从 lucide-react 导入 Scale 图标
- **Acceptance Criteria Addressed**: AC-6（新增资产负债图标）

## [x] Task 7: 资产配置拆分为三张饼图
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 将原"资产配置"标题改为"理财资产配置"
  - 修改 assetAllocationData 函数，仅使用 financeAssets 数据生成配置数据
  - 移除独立资产数据混入理财资产配置的逻辑
  - 在该区域旁边新增"独立资产配置"饼图卡片
    - 数据来自 independentAssets，按类型分组（保险、房产、车辆、固定投资、股权、定期资产）
    - 使用 Recharts PieChart
  - 新增"综合资产配置"饼图卡片
    - 数据仅两项：理财资产（financeTotalValue）、独立资产（independentTotalValue）
    - 使用 Recharts PieChart
  - 三张饼图在同一行（grid-cols-1 md:grid-cols-3）
- **Acceptance Criteria Addressed**: AC-7（理财资产配置）、AC-8（独立资产配置）、AC-9（综合资产配置）

## [x] Task 8: 构建验证
- **Priority**: high
- **Depends On**: Task 2, Task 3, Task 4, Task 5, Task 7
- **Description**:
  - 运行 npm run build 确保无编译错误
  - 检查所有 Recharts 组件导入正确
  - 检查 lucide-react 图标导入正确
- **Acceptance Criteria Addressed**: 所有 AC

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 3]
- [Task 8] depends on [Task 2, Task 3, Task 4, Task 5, Task 7]

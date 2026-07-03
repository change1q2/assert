# 分类详情页图表增强 - Implementation Plan

## [x] Task 1: 修复详情页空白问题（已修复）
- **Priority**: high
- **Depends On**: None
- **Description**: 添加缺失的 ArrowLeft 导入
- **Test Requirements**:
  - `programmatic`: 页面能正常渲染

## [ ] Task 2: 详情页右上角新增按钮
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 在详情页顶部右侧添加"+ 新增"按钮，与返回按钮并排
- **Test Requirements**:
  - `human-judgment`: 按钮显示在右上角
  - `programmatic`: 点击按钮打开添加资产类型弹窗

## [ ] Task 3: 资产类型占比饼图
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 在详情页第一行左侧添加饼图，展示该分类下各资产类型占比
- **Test Requirements**:
  - `human-judgment`: 饼图显示正确，图例清晰
  - `programmatic`: 各类型占比之和为100%

## [ ] Task 4: 资产类型金额柱状图
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 在详情页第一行右侧添加柱状图，展示各资产类型金额
- **Test Requirements**:
  - `human-judgment`: 柱状图显示正确，数值清晰
  - `programmatic`: 柱状图数据与列表数据一致

## [ ] Task 5: 海内外对比图
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 在详情页第二行添加海内外资产对比饼图
- **Test Requirements**:
  - `human-judgment`: 对比图显示正确，国内/海外标签清晰
  - `programmatic`: 占比之和为100%

## [ ] Task 6: 货币切换功能
- **Priority**: high
- **Depends On**: Task 3, Task 4, Task 5
- **Description**: 添加CNY/USD切换按钮，切换后海外资产按汇率换算
- **Test Requirements**:
  - `programmatic`: 切换CNY时显示人民币金额
  - `programmatic`: 切换USD时海外资产按7.2汇率换算显示
  - `human-judgment`: 切换流畅，无卡顿

## [ ] Task 7: 整体联调测试
- **Priority**: medium
- **Depends On**: All previous tasks
- **Description**: 测试所有功能联动，修复边界情况
- **Test Requirements**:
  - `human-judgment`: 整体布局协调，视觉统一
  - `human-judgment`: 响应式布局正常

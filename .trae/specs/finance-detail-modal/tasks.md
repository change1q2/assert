# 持仓详情弹窗功能 - 实现计划

## [ ] Task 1: 新增详情按钮组件
- **Priority**: high
- **Depends On**: None
- **Description**: 在 CategoryTable 组件操作列的编辑按钮后增加详情按钮，使用 Eye 图标，点击触发详情弹窗
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 操作列显示编辑、详情、删除三个按钮
  - `human-judgement` TR-1.2: 点击详情按钮弹出详情弹窗

## [ ] Task 2: 创建详情弹窗组件
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 创建 DetailModal 组件，包含以下区域：
  - 头部：持仓名称和代码
  - 盈亏数据区域：浮动盈亏、浮动盈亏率、当日参考盈亏、当日盈亏率
  - 统计数据区域：持仓天数、交易税费、个股仓位占比、分红收益
  - 买卖点区域（BS点）：图表占位
  - 交易记录区域：交易记录列表
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-2.1: 弹窗显示所有要求的字段
  - `human-judgement` TR-2.2: 字段映射正确（浮动盈亏=持仓盈亏等）
  - `human-judgement` TR-2.3: 买卖点区域显示图表占位

## [ ] Task 3: 实现交易记录图片识别上传
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 在交易记录区域增加图片上传按钮，支持选择图片文件，展示上传的图片预览
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 交易记录区域显示图片上传按钮
  - `human-judgement` TR-3.2: 点击上传按钮可选择图片文件
  - `human-judgement` TR-3.3: 上传后显示图片预览

## [ ] Task 4: 实现弹窗关闭逻辑
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 实现点击弹窗外部或关闭按钮关闭弹窗的功能
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: 点击弹窗外部关闭弹窗
  - `human-judgement` TR-4.2: 点击关闭按钮关闭弹窗

## [ ] Task 5: 构建验证
- **Priority**: medium
- **Depends On**: Tasks 1-4
- **Description**: 运行构建命令确保代码无语法错误
- **Acceptance Criteria Addressed**: 所有
- **Test Requirements**:
  - `programmatic` TR-5.1: `npm run build` 成功完成
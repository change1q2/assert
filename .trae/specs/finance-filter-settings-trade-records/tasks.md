# 财务页面筛选设置与交易记录优化 - 实现计划

## [ ] Task 1: 扩展筛选设置面板包含所有字段
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 DEFAULT_FILTERS 常量，添加三级分类、四级分类、货币、资产类型等字段
  - 确保所有筛选字段都能在设置面板中控制显示/隐藏
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 筛选设置面板显示所有10个字段的勾选框
  - `human-judgment` TR-1.2: 勾选/取消勾选能正确控制筛选栏显示

## [ ] Task 2: 实现图片识别人工校验导入流程
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改图片上传逻辑，模拟识别出交易记录数据
  - 创建识别结果校验表单，显示解析出的交易记录
  - 添加确认导入按钮，将校验通过的记录导入交易列表
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: 上传图片后显示识别结果校验表单
  - `human-judgment` TR-2.2: 用户可编辑每条识别记录的字段
  - `human-judgment` TR-2.3: 点击确认后记录导入交易列表

## [ ] Task 3: 删除BS买卖点功能
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 删除详情弹窗中的BS买卖点开关和K线图占位区域
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-3.1: 详情弹窗中不再显示BS买卖点相关内容

## [ ] Task 4: 交易记录增加类型筛选功能
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 
  - 在交易记录区域添加类型筛选下拉框（全部、买入、卖出、分红）
  - 修改分页逻辑，支持筛选后的分页
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-4.1: 交易记录区域显示类型筛选下拉框
  - `human-judgment` TR-4.2: 选择类型后只显示对应类型的记录

## [ ] Task 5: 构建验证
- **Priority**: medium
- **Depends On**: All previous tasks
- **Description**: 
  - 运行 npm run build 验证代码正确性
- **Acceptance Criteria Addressed**: All
- **Test Requirements**:
  - `programmatic` TR-5.1: 构建成功无错误

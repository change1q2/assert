# 分类详情独立页面与多货币支持 - Implementation Plan

## [x] Task 1: 创建独立的分类详情页面组件
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建 CategoryDetail.jsx 组件
  - 复制 AssetClasses.jsx 中的详情页代码
  - 接收分类名称作为参数
- **Test Requirements**:
  - `programmatic`: 组件能正常渲染
  - `human-judgment`: 布局与原详情页一致

## [/] Task 2: 注册新页面到 App.jsx
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 App.jsx 中导入 CategoryDetail
  - 添加到 menuItems（隐藏菜单项）
  - 添加到 renderContent
- **Test Requirements**:
  - `programmatic`: 页面能通过状态切换显示

## [ ] Task 3: 修改点击卡片跳转逻辑
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改 AssetClasses.jsx 中点击卡片的逻辑
  - 改为切换到 CategoryDetail 页面，传递分类名称参数
- **Test Requirements**:
  - `programmatic`: 点击卡片跳转到详情页面
  - `human-judgment`: 返回按钮能回到资产分类页面

## [ ] Task 4: 货币改为下拉选择，支持多种货币
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 货币切换按钮改为下拉选择框
  - 支持 5 种货币：CNY、USD、EUR、JPY、GBP
  - 添加汇率常量和换算逻辑
- **Test Requirements**:
  - `human-judgment`: 下拉框显示 5 种货币
  - `programmatic`: 切换货币后数据正确换算

## [ ] Task 5: 新增资产类型支持货币选择
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 在添加资产类型弹窗中添加货币下拉选择框
  - 保存时记录货币类型
- **Test Requirements**:
  - `human-judgment`: 弹窗中显示货币选择框
  - `programmatic`: 新增资产类型包含货币信息

## [ ] Task 6: 整体联调测试
- **Priority**: medium
- **Depends On**: All previous tasks
- **Description**: 测试所有功能联动，修复边界情况
- **Test Requirements**:
  - `human-judgment`: 页面切换流畅
  - `human-judgment`: 货币切换正确

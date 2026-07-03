# 统计分析页面重构V2 - 实现计划

## [x] Task 1: 创建时间周期切换组件（日常/月统计/年统计/自定义）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在页面顶部添加日常/月统计/年统计/自定义四个切换按钮，样式与设计图片一致
  - 右上角添加更多操作按钮（三个点）
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 四个切换按钮显示在页面顶部，样式与设计图片一致
  - `human-judgement` TR-1.2: 点击不同按钮切换到对应模式页面
- **Notes**: 参考设计图片中顶部导航的样式

## [x] Task 2: 实现日常模式页面（本周统计 + 资产汇总 + 预算占比 + 标签数据）
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 本周统计卡片：柱状图显示周一到周日支出，支持支出/收入切换，显示总支出、日均支出、总收入、日均收入
  - 资产汇总卡片：环形图显示各账户资产分布，显示资产金额，有"过滤占比小于1%的资产"复选框，"查看资产分布"链接
  - 预算占比卡片：环形图显示各分类预算分配，"查看详情"链接
  - 标签数据卡片：列表显示标签，包含笔数、支出金额、收入金额
- **Acceptance Criteria Addressed**: [AC-1, AC-5]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 日常模式显示4个卡片，样式与16.jpg一致
  - `human-judgement` TR-2.2: 本周统计柱状图显示周一到周日的数据
  - `human-judgement` TR-2.3: 资产汇总环形图显示各账户资产分布
  - `human-judgement` TR-2.4: 预算占比环形图显示各分类预算分配
  - `human-judgement` TR-2.5: 标签数据列表显示标签统计信息
- **Notes**: 参考16.jpg的设计样式

## [x] Task 3: 实现月统计模式页面（年月选择器 + 月度收支卡片 + 收支统计柱状图）
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 年份选择器 + 月份选择器（本月、上月、具体月份）
  - 月支出/月收入/月结余统计卡片（蓝色背景）
  - 收支统计柱状图（按日统计，支持支出/收入/结余切换）
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 年月选择器显示年份和月份选项
  - `human-judgement` TR-3.2: 月度收支卡片显示月支出、月收入、月结余
  - `human-judgement` TR-3.3: 收支统计柱状图按日显示数据
- **Notes**: 参考15.jpg的设计样式

## [x] Task 4: 实现月统计模式页面（资产走势 + 收支对比 + 支出占比）
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 资产走势面积图
  - 收支对比桑基图（流向图，支持一级分类/全部切换）
  - 支出占比环形图（支持一级分类/全部切换）
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 资产走势面积图显示资产变化趋势
  - `human-judgement` TR-4.2: 收支对比桑基图显示支出流向
  - `human-judgement` TR-4.3: 支出占比环形图显示支出分类占比
- **Notes**: 参考15.jpg的设计样式

## [x] Task 5: 实现月统计模式页面（支出数据 + 报表统计 + 标签占比 + 标签数据 + 本月总结）
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 支出数据列表（显示分类、笔数、金额、占比、同比上月变化）
  - 报表统计表（日期、收入、支出、结余）
  - 标签占比环形图
  - 标签数据列表
  - 本月总结输入区域
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 支出数据列表显示分类统计信息
  - `human-judgement` TR-5.2: 报表统计表显示日期、收入、支出、结余
  - `human-judgement` TR-5.3: 标签占比环形图和标签数据列表正常显示
  - `human-judgement` TR-5.4: 本月总结区域可点击填写
- **Notes**: 参考15.jpg的设计样式

## [x] Task 6: 实现年统计模式页面（年份选择器 + 年度收支卡片 + 收支统计柱状图 + 收支热力日历）
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 年份选择器（今年、去年、更早年份）
  - 年支出/年收入/年结余统计卡片（蓝色背景）
  - 收支统计柱状图（按月统计）
  - 收支热力日历图（显示每月收支热度）
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-6.1: 年份选择器显示年份选项
  - `human-judgement` TR-6.2: 年度收支卡片显示年支出、年收入、年结余
  - `human-judgement` TR-6.3: 收支统计柱状图按月显示数据
  - `human-judgement` TR-6.4: 收支热力日历图显示每月收支热度
- **Notes**: 参考14.jpg的设计样式

## [x] Task 7: 实现年统计模式页面（资产走势 + 收支对比 + 支出占比 + 支出数据 + 报表统计 + 标签占比 + 标签数据 + 年度总结）
- **Priority**: high
- **Depends On**: Task 6
- **Description**: 
  - 资产走势面积图
  - 收支对比桑基图
  - 支出占比环形图
  - 支出数据列表
  - 报表统计表（月份、收入、支出、结余）
  - 标签占比环形图
  - 标签数据列表
  - 年度总结输入区域
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-7.1: 所有卡片样式与14.jpg一致
  - `human-judgement` TR-7.2: 年度总结区域可点击填写
- **Notes**: 参考14.jpg的设计样式

## [x] Task 8: 实现自定义模式页面（日期范围选择器 + 总收支卡片 + 收支走势折线图 + 资产走势 + 收支对比 + 支出占比 + 支出数据 + 标签占比 + 标签数据）
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 日期范围选择器（显示格式：YYYY-MM-DD — YYYY-MM-DD）
  - 总支出/总收入/总结余统计卡片（蓝色背景）
  - 收支走势折线图（支出红色、收入绿色）
  - 资产走势面积图
  - 收支对比桑基图
  - 支出占比环形图
  - 支出数据列表（显示分类、笔数、金额、占比）
  - 标签占比环形图
  - 标签数据列表
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgement` TR-8.1: 日期范围选择器显示正确格式
  - `human-judgement` TR-8.2: 收支走势折线图显示支出和收入双线
  - `human-judgement` TR-8.3: 所有卡片样式与12.jpg一致
- **Notes**: 参考12.jpg的设计样式

## [x] Task 9: 实现账本下拉多选和模块设置功能
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 将账本多选改为下拉多选样式，显示已选数量，支持全选/取消全选
  - 模块设置功能，支持勾选/取消勾选显示卡片，保存到localStorage
- **Acceptance Criteria Addressed**: [AC-6, AC-7]
- **Test Requirements**:
  - `human-judgement` TR-9.1: 账本下拉多选功能正常
  - `human-judgement` TR-9.2: 模块设置面板可调整显示卡片
  - `human-judgement` TR-9.3: 设置保存到localStorage，刷新页面保持配置
- **Notes**: 参考设计图片中的下拉样式

## [x] Task 10: 验证构建和运行
- **Priority**: high
- **Depends On**: Task 2, Task 5, Task 7, Task 8, Task 9
- **Description**: 运行npm run build验证项目构建成功，启动开发服务器验证页面效果
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7]
- **Test Requirements**:
  - `programmatic` TR-10.1: npm run build构建成功，exit code 0
  - `human-judgement` TR-10.2: 开发服务器启动成功，页面可正常访问
- **Notes**: 构建成功后启动开发服务器
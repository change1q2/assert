# 修复统计分析图表和导入功能 - 实施计划

## [x] Task 1: 修复收支统计图表Tooltip动态显示
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改Analysis.jsx中的Tooltip内容，根据chartType动态显示数据
  - 当chartType='expense'时只显示支出，'income'时只显示收入，'balance'时只显示结余
- **Acceptance Criteria Addressed**: 收支统计Tooltip动态显示
- **Test Requirements**:
  - `human-judgement` TR-1.1: 点击支出标签，Tooltip只显示支出数据
  - `human-judgement` TR-1.2: 点击收入标签，Tooltip只显示收入数据
- **Notes**: 修改getChartData函数和Tooltip组件

## [x] Task 2: 修复饼图文字居中显示
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改Analysis.jsx中饼图的label位置，显示在中心
  - 使用recharts的Cell和自定义标签
- **Acceptance Criteria Addressed**: 饼图文字居中显示
- **Test Requirements**:
  - `human-judgement` TR-2.1: 饼图中心显示分类名称和占比
- **Notes**: 使用recharts的Pie组件，设置label为null，添加自定义中心文字

## [x] Task 3: 收支对比改为流量图
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 将收支对比的桑基图改为流量图
  - 使用recharts的Sankey组件
- **Acceptance Criteria Addressed**: 收支对比流量图
- **Test Requirements**:
  - `human-judgement` TR-3.1: 显示收支对比的流量图
- **Notes**: 使用recharts的Sankey

## [x] Task 4: 增加Excel导入加载动画和字段映射
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在Records.jsx中增加Excel导入的加载进度动画
  - 增加字段映射界面，让用户选择Excel字段与系统字段的对应关系
  - 字段包括：日期、收支类型、金额、类别、二级分类、所属账本、收支账户、备注、标签
- **Acceptance Criteria Addressed**: Excel导入字段映射
- **Test Requirements**:
  - `human-judgement` TR-4.1: 显示加载进度动画
  - `human-judgement` TR-4.2: 显示字段映射界面
- **Notes**: 修改handleFileUpload函数和导入模态框

## [x] Task 5: 验证构建和运行
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 运行npm run build验证构建成功
- **Acceptance Criteria Addressed**: 全部
- **Test Requirements**:
  - `programmatic` TR-5.1: npm run build构建成功
  - `human-judgement` TR-5.2: 开发服务器可访问
# 收支分析表单字段调整与Excel导入功能 - 实施计划

## [ ] Task 1: 调整新增收支记录表单字段顺序
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改新增收支记录表单的字段顺序为：日期、收支类型、金额、类别、二级分类、所属账本、收支账户、备注、标签
  - 添加"收支账户"字段（对应currency）
  - 修改字段标签名称：类型→收支类型，一级分类→类别，二级分类保持，账本→所属账本，currency→收支账户
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 新增表单字段顺序正确
  - `human-judgement` TR-1.2: 字段标签名称正确
- **Notes**: 需要调整1690-1834行的表单代码

## [ ] Task 2: 调整列表显示字段名称和顺序
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 修改列表表头字段名称：类型→收支类型，一级分类→类别，账本→所属账本，currency→收支账户
  - 调整列表显示顺序与表单一致
  - 修改visibleColumns默认配置
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 列表表头字段名称正确
  - `human-judgement` TR-2.2: 列表显示顺序正确
- **Notes**: 需要调整1560-1631行的表格代码

## [ ] Task 3: 调整筛选字段名称和顺序
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改筛选面板字段名称和顺序
  - 修改高级列表设置中的字段名称
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 筛选字段名称正确
  - `human-judgement` TR-3.2: 筛选字段顺序正确
- **Notes**: 需要调整1481-1558行的筛选代码和1917-2004行的高级设置代码

## [ ] Task 4: 添加Excel导入功能
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 安装xlsx库
  - 添加Excel导入按钮
  - 实现Excel文件解析功能
  - 实现数据验证和导入逻辑
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: Excel导入按钮显示正确
  - `human-judgement` TR-4.2: 导入功能正常工作
  - `human-judgement` TR-4.3: 数据验证错误提示正确
- **Notes**: 需要安装依赖并添加新的导入处理函数

## [ ] Task 5: 添加Excel模板下载功能
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 添加模板下载按钮
  - 生成包含正确表头的Excel模板文件
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-5.1: 模板下载按钮显示正确
  - `human-judgement` TR-5.2: 下载的模板包含正确表头
- **Notes**: 需要实现模板生成和下载逻辑

## [ ] Task 6: 构建验证和测试
- **Priority**: medium
- **Depends On**: Task 1-5
- **Description**: 
  - 运行npm run build确保代码无编译错误
  - 手动测试所有修复的功能
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-6.1: npm run build成功
  - `human-judgement` TR-6.2: 所有功能正常工作
- **Notes**: 确保构建成功，无警告或错误

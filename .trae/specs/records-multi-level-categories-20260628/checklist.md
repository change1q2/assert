# Checklist

## 数据层
- [x] fetchBooks, createBook, deleteBook API 函数已添加
- [x] fetchCategories, saveCategories API 函数已添加
- [x] 后端 /api/state 支持 books 和 categories 字段

## 状态管理
- [x] Records.jsx 包含 books 状态
- [x] Records.jsx 包含 categories 状态
- [x] filterByBook 函数实现正确
- [x] getSubCategories 函数实现正确

## UI组件
- [x] 账本选择器显示在页面右上角
- [x] 账本选择器包含"全部账本"选项
- [x] 一级分类下拉框包含默认分类选项
- [x] 一级分类下拉框支持新增自定义分类
- [x] 二级分类下拉框根据一级分类联动
- [x] 二级分类下拉框支持新增自定义分类
- [x] 账户下拉框正确显示所有账户

## 新增弹窗
- [x] 新增收支弹窗包含一级分类选择
- [x] 新增收支弹窗包含二级分类联动选择
- [x] 新增收支弹窗包含账户下拉选择
- [x] 支出类型下金额自动存储为负数

## 列表功能
- [x] 收支记录列表包含账本名称列
- [x] 选择"全部账本"时显示汇总数据
- [x] 选择特定账本时筛选对应记录

## 构建测试
- [x] npm run build 成功
- [x] 开发服务器启动成功

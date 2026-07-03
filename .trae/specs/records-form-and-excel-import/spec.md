# 收支分析表单字段调整与Excel导入功能 - 产品需求文档

## Overview
- **Summary**: 修改收支分析页面的新增记录表单字段顺序，调整列表显示和筛选字段，并添加Excel导入功能
- **Purpose**: 优化用户录入体验，统一字段命名，支持批量导入收支记录
- **Target Users**: 所有系统用户

## Goals
- 调整新增收支记录表单字段顺序为：日期、收支类型、金额、类别、二级分类、所属账本、收支账户、备注、标签
- 调整列表显示字段名称和顺序
- 调整筛选字段名称和顺序
- 添加Excel导入功能，支持下载默认模板

## Non-Goals (Out of Scope)
- 不修改后端API接口
- 不添加新的数据结构
- 不修改其他页面的功能

## Background & Context
- 当前新增表单字段顺序：日期、类型、账本、一级分类、二级分类、金额、备注、标签
- 用户要求的顺序：日期、收支类型、金额、类别、二级分类、所属账本、收支账户、备注、标签
- 需要添加"收支账户"字段（对应currency）
- 需要添加Excel导入功能

## Functional Requirements
- **FR-1**: 新增收支记录表单字段顺序调整为：日期、收支类型、金额、类别、二级分类、所属账本、收支账户、备注、标签
- **FR-2**: 列表显示字段名称调整为：日期、收支类型、金额、类别、二级分类、所属账本、收支账户、备注、标签
- **FR-3**: 筛选字段名称和顺序同步调整
- **FR-4**: 添加Excel导入按钮和功能
- **FR-5**: 提供默认Excel模板下载

## Non-Functional Requirements
- **NFR-1**: Excel导入支持常见格式（.xls, .xlsx）
- **NFR-2**: 导入时进行数据验证和错误提示
- **NFR-3**: 导入性能良好，支持批量导入

## Constraints
- **Technical**: React, localStorage, Vite构建
- **Dependencies**: 需要引入xlsx库用于Excel解析

## Assumptions
- 用户需要导入的Excel格式与模板一致
- 收支账户对应currency字段
- 类别对应category字段

## Acceptance Criteria

### AC-1: 新增表单字段顺序调整
- **Given**: 用户点击新增收支记录按钮
- **When**: 表单打开
- **Then**: 字段顺序为：日期、收支类型、金额、类别、二级分类、所属账本、收支账户、备注、标签
- **Verification**: `human-judgment`

### AC-2: 列表字段名称调整
- **Given**: 用户查看收支记录列表
- **When**: 页面加载完成
- **Then**: 列表表头显示：日期、收支类型、金额、类别、二级分类、所属账本、收支账户、备注、标签
- **Verification**: `human-judgment`

### AC-3: 筛选字段调整
- **Given**: 用户使用筛选功能
- **When**: 打开筛选面板
- **Then**: 筛选字段名称和顺序与表单一致
- **Verification**: `human-judgment`

### AC-4: Excel模板下载
- **Given**: 用户点击下载模板按钮
- **When**: 下载触发
- **Then**: 下载的Excel文件包含正确的表头：日期、收支类型、金额、类别、二级分类、所属账本、收支账户、备注、标签
- **Verification**: `human-judgment`

### AC-5: Excel导入功能
- **Given**: 用户上传符合模板格式的Excel文件
- **When**: 点击导入按钮
- **Then**: 数据成功导入并显示在列表中
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否需要支持CSV格式导入？
- [ ] Excel导入失败时的错误处理方式？

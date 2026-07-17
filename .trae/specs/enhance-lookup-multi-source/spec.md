# 搜索增强-多数据源全网匹配 Spec

## Why
用户在场内穿透页面搜索自定义指数时，当前仅使用东方财富搜索 API，部分 ETF（如 159943 深证成指ETF大成）搜索不到。需要增加同花顺、腾讯等多数据源全网匹配，提高搜索覆盖率和成功率。

## What Changes
- 后端 `lookupSecurities` 增加多数据源聚合：东方财富（已有）+ 腾讯直接查询（新增）+ 同花顺搜索（新增）
- 对于纯数字 6 位代码输入，新增腾讯直接查询验证逻辑，直接获取名称
- 前端：搜索无结果但输入格式有效时，允许直接按代码添加（去除 Index 类型过滤限制）
- 优化添加逻辑：允许 sz/sh 前缀代码直接输入

## Impact
- Affected code:
  - `assert_PLATFORM/server/services/finance-service.js`（后端 lookup 增强）
  - `assert_WEB/src/pages/AssetPenetration.jsx`（前端搜索过滤优化）

## ADDED Requirements

### Requirement: 多数据源搜索聚合
系统 SHALL 聚合多个数据源的搜索结果，优先返回匹配项。

#### Scenario: 东方财富搜索有结果
- **WHEN** 用户输入代码或名称
- **THEN** 先调用东方财富搜索 API
- **AND** 返回 ETF、AStock、Index 等类型结果

#### Scenario: 东方财富搜索无结果但输入是纯数字代码
- **WHEN** 用户输入 6 位数字代码（如 159943）
- **AND** 东方财富搜索返回空
- **THEN** 调用腾讯接口 `http://qt.gtimg.cn/q=sz159943` 直接查询
- **AND** 如果返回有效名称，将其加入搜索结果

#### Scenario: 同花顺搜索补充
- **WHEN** 用户输入代码或名称
- **THEN** 同时调用同花顺搜索 API
- **AND** 合并去重后返回

### Requirement: 前端搜索过滤优化
系统 SHALL 允许用户直接输入确切代码添加，无需搜索结果。

#### Scenario: 搜索无结果但输入有效
- **WHEN** 用户输入 6 位数字或 sh/sz 前缀代码
- **AND** 搜索接口返回空
- **THEN** "添加"按钮保持可用
- **AND** 点击添加后直接使用该代码（自动补 sh/sz 前缀）

#### Scenario: 前端不过滤 Index 类型
- **WHEN** 搜索返回 Index 类型结果
- **THEN** 前端不过滤，展示给用户

# Wealth OS 架构优化重构 - Product Requirement Document

## Overview
- **Summary**: 对Wealth OS（Assert）个人资产管理平台进行渐进式模块化架构重构，将单文件后端（3000+行server.js）和单文件前端（数千行app.js）拆分为职责清晰的模块结构，同时保持API接口完全兼容、不引入新框架、保持项目轻量特性。
- **Purpose**: 解决当前代码架构问题：
  1. 后端单文件3000+行，难以维护和理解
  2. 前端单文件app.js逻辑混杂，模块边界不清
  3. 缺少代码规范和工程化配置
  4. 配置硬编码，环境管理不规范
  5. 缺少基础的测试和开发工具配置
- **Target Users**: 项目开发者、维护者、未来贡献者

## Goals
- 将后端server.js按职责拆分为配置、数据库、中间件、路由、服务、工具等模块
- 将前端app.js拆分为ES模块，包括状态管理、API层、各功能模块、UI组件
- 统一代码规范，添加ESLint + Prettier配置
- 添加环境变量示例文件和Docker Compose开发配置
- 保持所有现有API接口完全兼容，不改变任何外部行为
- 保持前端无构建步骤，直接使用浏览器原生ES模块
- 完善项目文档，说明新的目录结构和开发方式

## Non-Goals (Out of Scope)
- **不**引入TypeScript（保持纯JavaScript）
- **不**引入React/Vue/Angular等前端框架（保持Vanilla JS）
- **不**引入Express/Koa/Fastify等后端框架（保持Node.js原生http模块）
- **不**修改数据库Schema（只优化代码结构）
- **不**改变API路径、请求/响应格式
- **不**添加新功能（只重构现有代码）
- **不**重构移动端（Android/iOS/HarmonyOS）和Electron PC端的现有逻辑
- **不**进行大规模样式重构

## Background & Context
- 当前后端：单文件 [server.js](file:///f:/code_x/assert/assert_PLATFORM/server/server.js) 约3000行，包含HTTP服务器、数据库、认证、业务逻辑、工具函数、所有API路由
- 当前前端：单文件 [app.js](file:///f:/code_x/assert/assert_WEB/app.js) 约数千行，包含状态管理、所有模块渲染、API调用、事件处理
- 项目已使用ESM（type: "module"），为模块化拆分奠定基础
- 前端已在index.html中引用styles.css，需要调整为ES模块导入方式
- Node.js >= 22.5.0，支持最新ES特性和原生测试运行器

## Functional Requirements
- **FR-1**: 后端配置从环境变量统一管理，提供.env.example文件
- **FR-2**: 后端数据库连接、Schema初始化逻辑独立为模块
- **FR-3**: 后端认证逻辑（密码哈希、Token、短信验证码）独立为模块
- **FR-4**: 后端HTTP中间件（CORS、Body解析、认证检查、错误处理）独立
- **FR-5**: 后端API路由按领域拆分为独立文件（auth、bootstrap/state、finance、tools、admin、releases、sync、feedback）
- **FR-6**: 后端业务逻辑（溢价行情、港股打新、用户状态保存/加载）独立为服务层
- **FR-7**: 后端通用工具函数（响应格式化、日期处理、数据校验）独立
- **FR-8**: 前端入口精简为模块加载器和初始化逻辑
- **FR-9**: 前端状态管理独立模块
- **FR-10**: 前端API请求封装独立模块，统一处理认证、错误
- **FR-11**: 前端10个功能模块各自独立（overview、records、finance、debts、classes、analysis、tools、strategies、accounts、downloads）
- **FR-12**: 前端通用UI组件和工具函数独立
- **FR-13**: 添加ESLint配置，统一代码风格
- **FR-14**: 添加Prettier配置，统一格式化
- **FR-15**: 添加Docker Compose配置（MySQL + API + Web静态服务）用于快速开发环境搭建
- **FR-16**: 添加基础的API健康检查和冒烟测试脚本
- **FR-17**: 更新README.md和CODE_WIKI.md反映新的目录结构

## Non-Functional Requirements
- **NFR-1**: 所有现有API接口保持100%兼容，路径、请求方法、请求/响应格式不变
- **NFR-2**: 重构后启动方式不变（npm run api / npm run web）
- **NFR-3**: 后端性能不下降，API响应时间无明显退化
- **NFR-4**: 前端页面加载时间不增加（ES模块按需加载可能更快）
- **NFR-5**: 代码可读性显著提升，单个文件不超过500行
- **NFR-6**: 模块间依赖清晰，避免循环依赖
- **NFR-7**: 开发时无需额外构建步骤，保存即刷新生效

## Constraints
- **Technical**:
  - 必须使用纯JavaScript（无TypeScript）
  - 必须使用Node.js原生http模块（无Web框架）
  - 前端必须使用Vanilla JS + 浏览器原生ES模块（无打包工具）
  - 保持ESM模块系统（type: "module"）
  - Node.js版本 >= 22.5.0
- **Business**:
  - 不破坏现有用户数据和API
  - 生产环境可平滑升级
- **Dependencies**:
  - 保持现有依赖（mysql2、xlsx、electron等）不升级大版本
  - 开发依赖可添加：eslint、prettier

## Assumptions
- 当前代码没有外部贡献者，重构不会影响第三方集成
- 开发环境已有Node.js 22+和MySQL 8+
- 所有API都通过HTTP请求调用，没有内部直接调用函数的情况
- 前端全局变量可以通过ES模块export/import重构，不会有浏览器兼容性问题（支持现代浏览器）

## Acceptance Criteria

### AC-1: 后端模块化拆分完成
- **Given**: 重构完成
- **When**: 查看assert_PLATFORM/server/目录
- **Then**: 存在清晰的子目录结构（config、db、middleware、routes、services、utils），server.js作为入口文件不超过300行
- **Verification**: `human-judgment`
- **Notes**: 目录结构见设计文档

### AC-2: 前端模块化拆分完成
- **Given**: 重构完成
- **When**: 查看assert_WEB/目录
- **Then**: 存在js/子目录，包含state.js、api.js、modules/、components/、utils/等，app.js入口文件不超过200行
- **Verification**: `human-judgment`

### AC-3: API接口完全兼容
- **Given**: 重构后的服务运行
- **When**: 对比重构前后的所有API（使用相同请求参数）
- **Then**: 所有接口返回相同的状态码和响应结构（时间戳等动态字段除外）
- **Verification**: `programmatic`
- **Notes**: 包括公共接口、认证接口、管理员接口共约37个API

### AC-4: 本地开发启动正常
- **Given**: 依赖已安装，MySQL运行
- **When**: 执行npm run api和npm run web
- **Then**: API服务在3000端口启动成功，Web服务在4173端口启动成功，无报错
- **Verification**: `programmatic`

### AC-5: 用户可以正常登录和使用功能
- **Given**: 服务运行
- **When**: 使用浏览器访问http://127.0.0.1:4173，进行登录、查看资产总览、添加记录、查看理财模块等核心操作
- **Then**: 所有核心功能正常工作，无JavaScript错误
- **Verification**: `human-judgment`

### AC-6: 代码规范配置生效
- **Given**: ESLint和Prettier配置存在
- **When**: 运行ESLint检查
- **Then**: 代码符合规范（或只有可接受的警告）
- **Verification**: `programmatic`

### AC-7: 单文件代码行数限制
- **Given**: 重构完成
- **When**: 统计所有源代码文件行数
- **Then**: 没有单个.js文件超过500行（工具函数和数据文件除外）
- **Verification**: `programmatic`

### AC-8: 模块间无循环依赖
- **Given**: 重构完成
- **When**: 分析模块import/require关系
- **Then**: 不存在循环依赖
- **Verification**: `programmatic`

### AC-9: Docker Compose快速启动
- **Given**: Docker和Docker Compose已安装
- **When**: 执行docker-compose up
- **Then**: MySQL、API、Web三个服务启动成功，可以正常访问
- **Verification**: `programmatic`

### AC-10: 环境变量文档完整
- **Given**: 重构完成
- **When**: 查看.env.example
- **Then**: 包含所有可配置项及说明
- **Verification**: `human-judgment`

## Open Questions
- [ ] 前端OCR功能（Tesseract.js）是否需要重构？当前是vendor文件直接引入，建议保持不变
- [ ] 港股打新数据解析的大量工具函数是否需要单独拆分为多个文件？
- [ ] 管理员后台页面（admin.html）是否需要同步重构？

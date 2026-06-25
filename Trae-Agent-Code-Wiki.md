# Trae Agent Code Wiki

## 目录

1. [项目概述](#1-项目概述)
2. [整体架构](#2-整体架构)
3. [目录结构](#3-目录结构)
4. [核心模块详解](#4-核心模块详解)
5. [关键类与函数](#5-关键类与函数)
6. [依赖关系](#6-依赖关系)
7. [配置系统](#7-配置系统)
8. [运行方式](#8-运行方式)
9. [测试与评估](#9-测试与评估)
10. [开发指南](#10-开发指南)

---

## 1. 项目概述

### 1.1 项目简介

**Trae Agent** 是字节跳动团队开发的基于大语言模型（LLM）的通用软件工程智能体。它提供了强大的 CLI 接口，能够理解自然语言指令，并使用各种工具和 LLM 提供商执行复杂的软件工程工作流。

- **项目名称**: trae-agent
- **版本**: 0.1.0
- **语言**: Python 3.12+
- **许可证**: MIT
- **技术报告**: [arXiv:2507.23370](https://arxiv.org/abs/2507.23370)

### 1.2 核心特性

- 🌊 **Lakeview**: 为智能体步骤提供简短精炼的摘要
- 🤖 **多 LLM 支持**: 支持 OpenAI、Anthropic、Doubao、Azure、OpenRouter、Ollama 和 Google Gemini API
- 🛠️ **丰富的工具生态系统**: 文件编辑、Bash 执行、顺序思考等
- 🎯 **交互模式**: 用于迭代开发的对话式界面
- 📊 **轨迹记录**: 详细记录所有智能体操作，用于调试和分析
- ⚙️ **灵活配置**: 基于 YAML 的配置，支持环境变量
- 🐳 **Docker 支持**: 可在 Docker 容器中运行任务，隔离环境

### 1.3 设计理念

Trae Agent 提供了透明、模块化的架构，研究人员和开发者可以轻松修改、扩展和分析。这使其成为**研究 AI 智能体架构、进行消融研究和开发新型智能体能力**的理想平台。这种**研究友好的设计**使学术界和开源社区能够为基础智能体框架做出贡献并在此基础上构建，促进 AI 智能体快速发展领域的创新。

---

## 2. 整体架构

### 2.1 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                        CLI Layer                         │
│  (cli.py - Click-based command-line interface)          │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                      Agent Layer                         │
│  ┌─────────────┐    ┌──────────────────┐                │
│  │  BaseAgent  │◄───│   TraeAgent      │                │
│  │  (Abstract) │    │  (Implementation)│                │
│  └─────────────┘    └──────────────────┘                │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                      Tools Layer                         │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  │
│  │  Bash   │  │  Edit    │  │  JSON   │  │Sequential│  │
│  │  Tool   │  │  Tool    │  │  Edit   │  │ Thinking │  │
│  └─────────┘  └──────────┘  └─────────┘  └──────────┘  │
│  ┌──────────┐  ┌─────────┐  ┌───────────────────┐      │
│  │ TaskDone │  │  CKG    │  │   MCP Tools       │      │
│  │   Tool   │  │  Tool   │  │  (Dynamic)        │      │
│  └──────────┘  └─────────┘  └───────────────────┘      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                      LLM Client Layer                    │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  │
│  │ OpenAI  │  │Anthropic │  │ Google  │  │  Ollama  │  │
│  │ Client  │  │ Client   │  │ Client  │  │  Client  │  │
│  └─────────┘  └──────────┘  └─────────┘  └──────────┘  │
│  ┌──────────┐  ┌─────────┐  ┌───────────────────┐      │
│  │  Doubao  │  │  Azure  │  │   OpenRouter      │      │
│  │  Client  │  │ Client  │  │   Client          │      │
│  └──────────┘  └─────────┘  └───────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心执行流程

1. **用户输入**: 通过 CLI 接收任务指令
2. **配置加载**: 读取 YAML 配置文件，解析模型提供商、模型配置和智能体配置
3. **智能体初始化**: 创建 TraeAgent 实例，初始化工具集和 LLM 客户端
4. **任务设置**: 构建系统提示和初始消息
5. **执行循环**:
   - LLM 思考并生成响应
   - 解析工具调用
   - 执行工具（支持并行/顺序执行）
   - 反思结果（可选）
   - 将结果反馈给 LLM
6. **任务完成**: 检测完成信号，输出最终结果
7. **轨迹记录**: 保存完整的执行轨迹用于分析

---

## 3. 目录结构

### 3.1 根目录

```
trae-agent/
├── .github/                    # GitHub 工作流和配置
├── .vscode/                    # VS Code 编辑器配置
├── docs/                       # 项目文档
│   ├── TRAJECTORY_RECORDING.md # 轨迹记录文档
│   ├── legacy_config.md        # 旧版 JSON 配置文档
│   ├── roadmap.md              # 项目路线图
│   └── tools.md                # 工具说明文档
├── evaluation/                 # 评估相关代码
│   ├── patch_selection/        # Patch 选择模块
│   ├── run_evaluation.py       # 评估运行脚本
│   ├── utils.py                # 评估工具函数
│   └── setup.sh                # 环境设置脚本
├── server/                     # 服务端代码（待实现）
├── tests/                      # 测试代码
│   ├── agent/                  # 智能体测试
│   ├── tools/                  # 工具测试
│   ├── utils/                  # 工具函数测试
│   └── test_cli.py             # CLI 测试
├── trae_agent/                 # 主代码包
│   ├── agent/                  # 智能体模块
│   ├── dist/                   # 编译后的工具二进制文件
│   ├── prompt/                 # 提示词模板
│   ├── tools/                  # 工具模块
│   ├── utils/                  # 工具函数模块
│   ├── __init__.py
│   └── cli.py                  # CLI 入口
├── .gitignore
├── .pre-commit-config.yaml     # pre-commit 配置
├── .python-version             # Python 版本
├── CONTRIBUTING.md             # 贡献指南
├── LICENSE                     # MIT 许可证
├── Makefile                    # 构建命令
├── README.md                   # 项目说明
├── pyproject.toml              # 项目配置
├── uv.lock                     # 依赖锁定文件
├── trae_config.json.example    # JSON 配置示例
└── trae_config.yaml.example    # YAML 配置示例（推荐）
```

---

## 4. 核心模块详解

### 4.1 Agent 模块 (`trae_agent/agent/`)

智能体模块是 Trae Agent 的核心，负责协调整个任务执行流程。

#### 文件列表

| 文件 | 大小 | 说明 |
|------|------|------|
| `__init__.py` | 314B | 模块初始化，导出 Agent 工厂类 |
| `agent.py` | ~3.5KB | Agent 工厂类，根据类型创建不同的智能体实例 |
| `agent_basics.py` | ~2.6KB | 基础数据类和枚举定义 |
| `base_agent.py` | ~13.6KB | 智能体基类，实现核心执行循环 |
| `docker_manager.py` | ~10.8KB | Docker 环境管理器 |
| `trae_agent.py` | ~10.2KB | TraeAgent 具体实现，面向软件工程任务 |

#### 核心职责

- 管理 LLM 客户端和工具集
- 维护对话历史和执行状态
- 驱动思考-行动循环
- 处理 Docker 容器化执行
- 记录执行轨迹

### 4.2 Tools 模块 (`trae_agent/tools/`)

工具模块提供了智能体可以使用的各种工具。

#### 文件列表

| 文件 | 大小 | 说明 |
|------|------|------|
| `__init__.py` | ~1KB | 模块初始化，导出工具类和注册表 |
| `base.py` | ~7.7KB | 工具基类和执行器定义 |
| `bash_tool.py` | ~9.9KB | Bash 命令执行工具 |
| `edit_tool.py` | ~16.8KB | 文本编辑工具（基于字符串替换） |
| `edit_tool_cli.py` | ~21KB | 编辑工具的 CLI 版本（用于 PyInstaller 打包） |
| `json_edit_tool.py` | ~13.4KB | JSON 编辑工具 |
| `json_edit_tool_cli.py` | ~10.8KB | JSON 编辑工具的 CLI 版本 |
| `sequential_thinking_tool.py` | ~13KB | 顺序思考工具，用于深度推理 |
| `task_done_tool.py` | ~1KB | 任务完成工具，用于标记任务结束 |
| `ckg_tool.py` | ~8.4KB | 代码知识图谱工具 |
| `mcp_tool.py` | ~2KB | MCP 工具包装器 |
| `docker_tool_executor.py` | ~7.3KB | Docker 环境下的工具执行器 |
| `run.py` | ~2KB | 工具运行辅助 |
| `ckg/` | - | 代码知识图谱子模块 |

#### 工具注册表

工具通过 `tools_registry` 字典进行注册和查找：

```python
tools_registry: dict[str, type[Tool]] = {
    "bash": BashTool,
    "str_replace_based_edit_tool": TextEditorTool,
    "json_edit_tool": JSONEditTool,
    "sequentialthinking": SequentialThinkingTool,
    "task_done": TaskDoneTool,
    "ckg": CKGTool,
}
```

### 4.3 Utils 模块 (`trae_agent/utils/`)

工具函数模块提供了配置管理、LLM 客户端、轨迹记录等通用功能。

#### 子模块

| 子模块/文件 | 说明 |
|------------|------|
| `config.py` | 配置系统，支持 YAML/JSON 配置 |
| `constants.py` | 常量定义 |
| `lake_view.py` | Lakeview 摘要功能 |
| `legacy_config.py` | 旧版 JSON 配置兼容 |
| `mcp_client.py` | MCP 协议客户端 |
| `trajectory_recorder.py` | 轨迹记录器 |
| `cli/` | CLI 界面组件（Simple/Rich/Interactive） |
| `llm_clients/` | 各 LLM 提供商客户端 |

#### LLM Clients (`trae_agent/utils/llm_clients/`)

| 文件 | 说明 |
|------|------|
| `base_client.py` | LLM 客户端基类 |
| `llm_basics.py` | LLM 消息和响应的基础数据类 |
| `llm_client.py` | LLM 客户端工厂，统一接口 |
| `openai_client.py` | OpenAI API 客户端 |
| `openai_compatible_base.py` | OpenAI 兼容 API 基类 |
| `anthropic_client.py` | Anthropic API 客户端 |
| `google_client.py` | Google Gemini API 客户端 |
| `ollama_client.py` | Ollama 本地模型客户端 |
| `doubao_client.py` | 豆包（字节跳动）API 客户端 |
| `azure_client.py` | Azure OpenAI 客户端 |
| `openrouter_client.py` | OpenRouter 客户端 |
| `retry_utils.py` | 重试工具函数 |
| `readme.md` | LLM 客户端文档 |

### 4.4 Prompt 模块 (`trae_agent/prompt/`)

提示词模块管理智能体使用的系统提示词。

| 文件 | 说明 |
|------|------|
| `agent_prompt.py` | TraeAgent 的系统提示词模板 |

#### 系统提示词要点

TraeAgent 的系统提示词包含以下关键指导：

1. **文件路径规则**: 所有使用 `file_path` 参数的工具必须使用**绝对路径**
2. **工作流程**: 理解问题 → 探索定位 → 复现 Bug → 调试诊断 → 开发修复 → 验证测试 → 总结工作
3. **顺序思考工具使用指南**: 鼓励深度思考，设置至少 5 个思考步骤
4. **指导原则**: 像高级软件工程师一样行动，优先考虑正确性、安全性和高质量的测试驱动开发

### 4.5 CLI 模块 (`trae_agent/cli.py`)

CLI 模块提供了命令行接口，是用户与 Trae Agent 交互的主要方式。

#### 主要命令

| 命令 | 说明 |
|------|------|
| `trae-cli run <task>` | 执行单个任务 |
| `trae-cli interactive` | 启动交互模式 |
| `trae-cli show-config` | 显示当前配置 |

#### 关键功能

- Click 框架实现的命令行参数解析
- 配置文件加载和解析
- Docker 环境检测和工具构建
- 控制台输出（Simple/Rich 两种模式）
- 错误处理和轨迹文件保存

---

## 5. 关键类与函数

### 5.1 Agent 相关类

#### `BaseAgent` (base_agent.py)

智能体基类，定义了核心执行循环的抽象实现。

**关键属性**:
- `_llm_client`: LLM 客户端实例
- `_tools`: 可用工具列表
- `_tool_caller`: 工具执行器（普通或 Docker）
- `_max_steps`: 最大执行步数
- `_initial_messages`: 初始消息列表
- `_trajectory_recorder`: 轨迹记录器
- `docker_manager`: Docker 管理器（可选）

**关键方法**:

| 方法 | 说明 |
|------|------|
| `__init__(agent_config, docker_config, docker_keep)` | 初始化智能体，设置 LLM 客户端、工具、Docker 环境等 |
| `execute_task() -> AgentExecution` | **核心方法**，执行完整的任务，驱动思考-行动循环 |
| `_run_llm_step(step, messages, execution)` | 执行单步 LLM 交互，包括调用 LLM 和处理工具调用 |
| `_tool_call_handler(tool_calls, step)` | 处理工具调用，支持并行和顺序执行 |
| `reflect_on_result(tool_results)` | 对工具执行结果进行反思，可由子类覆盖 |
| `llm_indicates_task_completed(llm_response)` | 检查 LLM 是否指示任务完成 |
| `new_task(task, extra_args, tool_names)` | 抽象方法，创建新任务，由子类实现 |
| `cleanup_mcp_clients()` | 抽象方法，清理 MCP 客户端 |

**执行流程**:
```
execute_task()
    ↓
while step_number <= max_steps:
    _run_llm_step()
        ↓
    LLM 生成响应
        ↓
    检测是否完成? ──是──→ 完成
        ↓否
    _tool_call_handler()
        ↓
    执行工具调用
        ↓
    反思结果（可选）
        ↓
    继续循环
```

#### `TraeAgent` (trae_agent.py)

TraeAgent 是 BaseAgent 的具体实现，专门面向软件工程任务。

**关键属性**:
- `project_path`: 项目路径
- `base_commit`: 基准提交（用于生成 diff）
- `must_patch`: 是否必须生成代码修改
- `patch_path`: Patch 文件输出路径
- `mcp_servers_config`: MCP 服务器配置
- `mcp_tools`: 动态发现的 MCP 工具
- `mcp_clients`: MCP 客户端列表

**关键方法**:

| 方法 | 说明 |
|------|------|
| `__init__(trae_agent_config, docker_config, docker_keep)` | 初始化 TraeAgent |
| `initialise_mcp()` | 异步初始化 MCP 工具 |
| `discover_mcp_tools()` | 发现并注册 MCP 服务器提供的工具 |
| `new_task(task, extra_args, tool_names)` | 创建新的软件工程任务，构建初始消息 |
| `execute_task() -> AgentExecution` | 执行任务，完成后保存轨迹和 patch |
| `get_system_prompt() -> str` | 获取系统提示词 |
| `get_git_diff() -> str` | 获取当前项目的 git diff |
| `remove_patches_to_tests(model_patch) -> str` | 从 patch 中移除测试相关的修改 |
| `llm_indicates_task_completed(llm_response)` | 检查是否调用了 `task_done` 工具 |
| `_is_task_completed(llm_response)` | 增强的任务完成检测，验证 patch 非空 |
| `cleanup_mcp_clients()` | 清理所有 MCP 客户端 |

#### `AgentExecution` (agent_basics.py)

封装智能体任务的完整执行结果。

```python
@dataclass
class AgentExecution:
    task: str                          # 任务描述
    steps: list[AgentStep]             # 所有执行步骤
    final_result: str | None = None    # 最终结果
    success: bool = False              # 是否成功
    total_tokens: LLMUsage | None = None  # 总 token 使用量
    execution_time: float = 0.0        # 执行时间（秒）
    agent_state: AgentState = AgentState.IDLE  # 智能体状态
```

#### `AgentStep` (agent_basics.py)

表示智能体执行过程中的单个步骤。

```python
@dataclass
class AgentStep:
    step_number: int                        # 步骤编号
    state: AgentStepState                   # 步骤状态
    thought: str | None = None              # 思考内容
    tool_calls: list[ToolCall] | None = None # 工具调用列表
    tool_results: list[ToolResult] | None = None  # 工具结果列表
    llm_response: LLMResponse | None = None # LLM 响应
    reflection: str | None = None           # 反思内容
    error: str | None = None                # 错误信息
    extra: dict[str, object] | None = None  # 额外数据
    llm_usage: LLMUsage | None = None       # Token 使用量
```

#### `AgentStepState` (agent_basics.py)

步骤状态枚举。

```python
class AgentStepState(Enum):
    THINKING = "thinking"       # 思考中
    CALLING_TOOL = "calling_tool"  # 调用工具中
    REFLECTING = "reflecting"   # 反思中
    COMPLETED = "completed"     # 已完成
    ERROR = "error"             # 错误
```

### 5.2 Tool 相关类

#### `Tool` (base.py)

所有工具的抽象基类。

**关键属性**:
- `name`: 工具名称（缓存属性）
- `description`: 工具描述（缓存属性）
- `parameters`: 工具参数列表（缓存属性）
- `model_provider`: 模型提供商

**关键方法**:

| 方法 | 说明 |
|------|------|
| `get_name() -> str` | 抽象方法，获取工具名称 |
| `get_description() -> str` | 抽象方法，获取工具描述 |
| `get_parameters() -> list[ToolParameter]` | 抽象方法，获取参数定义 |
| `execute(arguments) -> ToolExecResult` | 抽象方法，执行工具 |
| `json_definition() -> dict` | 获取工具的 JSON 定义（用于 LLM 函数调用） |
| `get_input_schema() -> dict` | 获取输入参数的 JSON Schema |
| `close()` | 释放工具资源 |

**OpenAI 兼容性处理**:
- 所有参数都放入 `required` 数组
- 可选参数设置为 `nullable`（类型为 `[type, "null"]`）
- 对象类型添加 `additionalProperties: false`
- 顶层 schema 添加 `additionalProperties: false`

#### `ToolExecutor` (base.py)

工具执行器，管理工具的查找和执行。

**关键方法**:

| 方法 | 说明 |
|------|------|
| `execute_tool_call(tool_call) -> ToolResult` | 执行单个工具调用 |
| `parallel_tool_call(tool_calls) -> list[ToolResult]` | 并行执行多个工具调用 |
| `sequential_tool_call(tool_calls) -> list[ToolResult]` | 顺序执行多个工具调用 |
| `close_tools()` | 关闭所有工具，释放资源 |

#### `ToolCall` (base.py)

表示解析后的工具调用。

```python
@dataclass
class ToolCall:
    name: str                                   # 工具名称
    call_id: str                                # 调用 ID
    arguments: ToolCallArguments = field(default_factory=dict)  # 参数
    id: str | None = None                       # OpenAI 专用字段
```

#### `ToolResult` (base.py)

工具执行结果。

```python
@dataclass
class ToolResult:
    call_id: str           # 调用 ID
    name: str              # 工具名称（Gemini 专用）
    success: bool          # 是否成功
    result: str | None = None   # 成功时的结果
    error: str | None = None    # 失败时的错误信息
    id: str | None = None       # OpenAI 专用字段
```

#### 主要工具类

| 工具类 | 注册名 | 说明 |
|--------|--------|------|
| `BashTool` | `bash` | 执行 Bash 命令 |
| `TextEditorTool` | `str_replace_based_edit_tool` | 基于字符串替换的文件编辑 |
| `JSONEditTool` | `json_edit_tool` | JSON 文件编辑 |
| `SequentialThinkingTool` | `sequentialthinking` | 顺序深度思考 |
| `TaskDoneTool` | `task_done` | 标记任务完成 |
| `CKGTool` | `ckg` | 代码知识图谱工具 |

### 5.3 配置相关类

#### `Config` (config.py)

顶层配置类，包含所有配置信息。

```python
@dataclass
class Config:
    lakeview: LakeviewConfig | None = None
    model_providers: dict[str, ModelProvider] | None = None
    models: dict[str, ModelConfig] | None = None
    trae_agent: TraeAgentConfig | None = None
```

**关键方法**:
- `create(config_file, config_string) -> Config`: 从 YAML/JSON 文件或字符串创建配置
- `create_from_legacy_config(...)`: 从旧版 JSON 配置创建
- `resolve_config_values(...)`: 解析配置值，应用 CLI/环境变量覆盖

#### `ModelProvider` (config.py)

模型提供商配置。

```python
@dataclass
class ModelProvider:
    api_key: str                    # API 密钥
    provider: str                   # 提供商名称
    base_url: str | None = None     # 基础 URL（可选）
    api_version: str | None = None  # API 版本（Azure 需要）
```

#### `ModelConfig` (config.py)

模型配置。

```python
@dataclass
class ModelConfig:
    model: str                                  # 模型名称
    model_provider: ModelProvider               # 模型提供商
    temperature: float                          # 温度参数
    top_p: float                                # Top-p 参数
    top_k: int                                  # Top-k 参数
    parallel_tool_calls: bool                   # 是否支持并行工具调用
    max_retries: int                            # 最大重试次数
    max_tokens: int | None = None               # 最大 token 数（旧版）
    supports_tool_calling: bool = True          # 是否支持工具调用
    candidate_count: int | None = None          # 候选数量（Gemini）
    stop_sequences: list[str] | None = None     # 停止序列
    max_completion_tokens: int | None = None    # 最大完成 token（Azure）
```

#### `TraeAgentConfig` (config.py)

TraeAgent 配置，继承自 `AgentConfig`。

```python
@dataclass
class TraeAgentConfig(AgentConfig):
    enable_lakeview: bool = True
    tools: list[str] = field(default_factory=lambda: [
        "bash",
        "str_replace_based_edit_tool",
        "sequentialthinking",
        "task_done",
    ])
```

#### `MCPServerConfig` (config.py)

MCP 服务器配置，支持多种传输方式。

```python
@dataclass
class MCPServerConfig:
    # Stdio 传输
    command: str | None = None
    args: list[str] | None = None
    env: dict[str, str] | None = None
    cwd: str | None = None
    
    # SSE 传输
    url: str | None = None
    
    # HTTP 传输
    http_url: str | None = None
    headers: dict[str, str] | None = None
    
    # WebSocket 传输
    tcp: str | None = None
    
    # 通用配置
    timeout: int | None = None
    trust: bool | None = None
    description: str | None = None
```

### 5.4 LLM 客户端相关类

#### `LLMClient` (llm_client.py)

LLM 客户端工厂类，根据模型提供商创建对应的客户端实例。

**关键方法**:
- `chat(messages, model_config, tools) -> LLMResponse`: 发送聊天请求
- `set_trajectory_recorder(recorder)`: 设置轨迹记录器

#### `LLMMessage` (llm_basics.py)

LLM 消息数据类。

```python
@dataclass
class LLMMessage:
    role: str               # 角色：system/user/assistant
    content: str | None = None  # 消息内容
    tool_calls: list | None = None  # 工具调用
    tool_result: ToolResult | None = None  # 工具结果
```

#### `LLMResponse` (llm_basics.py)

LLM 响应数据类。

```python
@dataclass
class LLMResponse:
    content: str                            # 响应内容
    tool_calls: list[ToolCall] | None = None  # 工具调用列表
    usage: LLMUsage | None = None           # Token 使用量
    raw_response: object | None = None      # 原始响应
```

### 5.5 其他关键类

#### `TrajectoryRecorder` (trajectory_recorder.py)

轨迹记录器，用于记录和保存智能体的完整执行轨迹。

**关键功能**:
- 记录每个步骤的 LLM 消息、响应、工具调用、结果等
- 支持 JSON 格式输出
- 自动生成带时间戳的文件名

#### `DockerManager` (docker_manager.py)

Docker 环境管理器，负责容器的创建、启动和停止。

**关键功能**:
- 支持多种 Docker 配置方式（镜像、容器 ID、Dockerfile、镜像文件）
- 管理工作目录和工具目录的挂载
- 容器生命周期管理

#### `MCPClient` (mcp_client.py)

MCP（Model Context Protocol）客户端，用于与 MCP 服务器通信。

**关键功能**:
- 连接 MCP 服务器
- 发现可用工具
- 执行工具调用
- 清理资源

---

## 6. 依赖关系

### 6.1 核心依赖

| 依赖包 | 版本要求 | 用途 |
|--------|----------|------|
| `openai` | >=1.86.0 | OpenAI API 客户端 |
| `anthropic` | >=0.54.0, <=0.60.0 | Anthropic API 客户端 |
| `click` | >=8.0.0 | CLI 框架 |
| `google-genai` | >=1.24.0 | Google Gemini API 客户端 |
| `jsonpath-ng` | >=1.7.0 | JSONPath 解析（用于 JSON 编辑工具） |
| `pydantic` | >=2.0.0 | 数据验证（MCP 相关） |
| `python-dotenv` | >=1.0.0 | 环境变量加载 |
| `rich` | >=13.0.0 | 富文本终端输出 |
| `typing-extensions` | >=4.0.0 | 类型扩展 |
| `ollama` | >=0.5.1 | Ollama 本地模型客户端 |
| `socksio` | >=1.0.0 | SOCKS 代理支持 |
| `tree-sitter` | 0.21.3 | 代码解析（Tree-sitter） |
| `tree-sitter-languages` | 1.10.2 | Tree-sitter 语言包 |
| `ruff` | >=0.12.4 | Python 代码检查和格式化 |
| `mcp` | 1.12.2 | Model Context Protocol |
| `asyncclick` | >=8.0.0 | 异步 Click |
| `pyyaml` | >=6.0.2 | YAML 解析 |
| `textual` | >=0.50.0 | 终端 UI 框架（Rich 交互模式） |
| `pyinstaller` | 6.15.0 | 打包为二进制（Docker 模式工具） |

### 6.2 可选依赖

#### 测试依赖 (`test`)

| 依赖包 | 版本要求 | 用途 |
|--------|----------|------|
| `pytest` | >=8.0.0 | 测试框架 |
| `pytest-asyncio` | >=0.23.0 | 异步测试支持 |
| `pytest-mock` | >=3.12.0 | Mock 支持 |
| `pytest-cov` | >=4.0.0 | 测试覆盖率 |
| `pre-commit` | >=4.2.0 | Git 钩子 |

#### 评估依赖 (`evaluation`)

| 依赖包 | 版本要求 | 用途 |
|--------|----------|------|
| `datasets` | >=3.6.0 | 数据集加载 |
| `docker` | >=7.1.0 | Docker SDK |
| `pexpect` | >=4.9.0 | 终端交互 |
| `unidiff` | >=0.7.5 | Unified diff 解析 |

### 6.3 模块依赖图

```
trae_agent.cli
    ├── trae_agent.agent.Agent (工厂)
    ├── trae_agent.utils.config
    └── trae_agent.utils.cli (控制台)

trae_agent.agent
    ├── trae_agent.tools (工具注册表)
    ├── trae_agent.utils.config
    ├── trae_agent.utils.llm_clients
    ├── trae_agent.utils.trajectory_recorder
    └── trae_agent.prompt

trae_agent.tools
    └── trae_agent.utils (部分工具)

trae_agent.utils.llm_clients
    └── trae_agent.tools.base (ToolCall 等数据类)

trae_agent.prompt
    └── (无内部依赖)
```

---

## 7. 配置系统

### 7.1 配置优先级

配置值的优先级从高到低为：

```
命令行参数 > 配置文件 > 环境变量 > 默认值
```

### 7.2 YAML 配置格式（推荐）

```yaml
# 模型提供商配置
model_providers:
  anthropic:
    api_key: your_anthropic_api_key
    provider: anthropic
  openai:
    api_key: your_openai_api_key
    provider: openai
    base_url: https://api.openai.com/v1  # 可选

# 模型配置
models:
  trae_agent_model:
    model_provider: anthropic
    model: claude-sonnet-4-20250514
    max_tokens: 4096
    temperature: 0.5
    top_p: 1.0
    top_k: 0
    parallel_tool_calls: true
    max_retries: 3

# MCP 服务器配置（可选）
mcp_servers:
  playwright:
    command: npx
    args:
      - "@playwright/mcp@0.0.27"

allow_mcp_servers:
  - playwright

# 智能体配置
agents:
  trae_agent:
    enable_lakeview: true
    model: trae_agent_model
    max_steps: 200
    tools:
      - bash
      - str_replace_based_edit_tool
      - sequentialthinking
      - task_done

# Lakeview 配置（可选）
lakeview:
  model: trae_agent_model
```

### 7.3 环境变量配置

各提供商对应的环境变量：

| 提供商 | API Key 环境变量 | Base URL 环境变量 |
|--------|------------------|-------------------|
| OpenAI | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| Anthropic | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| Google | `GOOGLE_API_KEY` | `GOOGLE_BASE_URL` |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_BASE_URL` |
| Doubao | `DOUBAO_API_KEY` | `DOUBAO_BASE_URL` |

### 7.4 配置加载流程

1. 读取配置文件（YAML 或 JSON）
2. 解析模型提供商配置
3. 解析模型配置，关联对应的提供商
4. 解析 MCP 服务器配置
5. 解析智能体配置，关联对应的模型
6. 应用 CLI 参数覆盖
7. 应用环境变量覆盖
8. 返回完整的 Config 对象

---

## 8. 运行方式

### 8.1 环境要求

- Python 3.12+
- UV 包管理器 (https://docs.astral.sh/uv/)
- 所选 LLM 提供商的 API 密钥
- （可选）Docker（用于 Docker 模式）

### 8.2 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/bytedance/trae-agent.git
cd trae-agent

# 2. 安装依赖（包含所有额外依赖）
uv sync --all-extras

# 3. 激活虚拟环境
source .venv/bin/activate  # Linux/Mac
# 或
.venv\Scripts\activate     # Windows

# 4. 创建配置文件
cp trae_config.yaml.example trae_config.yaml
# 编辑 trae_config.yaml，填入你的 API 密钥
```

### 8.3 基本使用

#### 执行单个任务

```bash
# 简单任务执行
trae-cli run "Create a hello world Python script"

# 指定提供商和模型
trae-cli run "Fix the bug in main.py" --provider openai --model gpt-4o

# Anthropic
trae-cli run "Add unit tests" --provider anthropic --model claude-sonnet-4-20250514

# Google Gemini
trae-cli run "Optimize this algorithm" --provider google --model gemini-2.5-flash

# OpenRouter
trae-cli run "Review this code" --provider openrouter --model "anthropic/claude-3-5-sonnet"

# 豆包
trae-cli run "Refactor the database module" --provider doubao --model doubao-seed-1.6

# Ollama（本地模型）
trae-cli run "Comment this code" --provider ollama --model qwen3
```

#### 交互模式

```bash
# 启动交互模式
trae-cli interactive

# 交互模式中可用的命令：
# - 输入任意任务描述来执行
# - status - 显示智能体信息
# - help - 显示可用命令
# - clear - 清屏
# - exit / quit - 结束会话
```

#### 查看配置

```bash
trae-cli show-config
```

### 8.4 高级选项

```bash
# 自定义工作目录
trae-cli run "Add tests for utils module" --working-dir /path/to/project

# 保存执行轨迹
trae-cli run "Debug authentication" --trajectory-file debug_session.json

# 强制生成 patch
trae-cli run "Update API endpoints" --must-patch

# 指定配置文件
trae-cli run "Task description" --config-file /path/to/config.yaml

# 自定义控制台类型（simple/rich）
trae-cli run "Task description" --console-type rich
```

### 8.5 Docker 模式

Docker 模式允许在隔离的容器环境中执行任务，确保安全性和可重复性。

#### 准备工作

确保 Docker 已安装并运行：
```bash
docker --version
```

#### Docker 模式命令

```bash
# 使用 Docker 镜像
trae-cli run "Add tests for utils module" --docker-image python:3.11

# 使用 Docker 镜像并挂载工作目录
trae-cli run "write a script to print helloworld" --docker-image python:3.12 --working-dir test_workdir/

# 附加到已有的 Docker 容器
trae-cli run "Update API endpoints" --docker-container-id 91998a56056c

# 使用 Dockerfile 构建环境
trae-cli run "Debug authentication" --dockerfile-path test_workspace/Dockerfile

# 从本地镜像文件加载
trae-cli run "Fix the bug in main.py" --docker-image-file test_workspace/trae_agent_custom.tar

# 任务完成后删除容器（默认保留）
trae-cli run "Add tests for utils module" --docker-image python:3.11 --docker-keep false
```

**注意**: 首次使用 Docker 模式时，系统会自动使用 PyInstaller 构建编辑工具的二进制文件，这可能需要一些时间。

### 8.6 Makefile 命令

| 命令 | 说明 |
|------|------|
| `make install-dev` | 创建虚拟环境并安装所有依赖（推荐用于开发） |
| `make uv-venv` | 使用 uv 创建 Python 虚拟环境 |
| `make uv-sync` | 安装所有依赖（包括测试/评估） |
| `make uv-test` | 运行所有测试（跳过部分外部服务测试） |
| `make test` | 运行所有测试 |
| `make uv-pre-commit` | 在所有文件上运行 pre-commit 钩子 |
| `make pre-commit-install` | 安装 pre-commit 钩子 |
| `make pre-commit-run` | 在所有文件上运行 pre-commit 钩子 |
| `make pre-commit` | 安装并运行 pre-commit 钩子 |
| `make fix-format` | 修复格式化错误 |
| `make clean` | 清理构建产物和缓存 |

---

## 9. 测试与评估

### 9.1 测试框架

- **测试框架**: pytest
- **异步测试**: pytest-asyncio
- **Mock**: pytest-mock
- **覆盖率**: pytest-cov

### 9.2 测试目录结构

```
tests/
├── agent/          # 智能体相关测试
├── tools/          # 工具相关测试
├── utils/          # 工具函数测试
└── test_cli.py     # CLI 测试
```

### 9.3 运行测试

```bash
# 运行所有测试（跳过需要外部服务的测试）
SKIP_OLLAMA_TEST=true SKIP_OPENROUTER_TEST=true SKIP_GOOGLE_TEST=true uv run pytest

# 或使用 Makefile
make test

# 运行特定测试文件
uv run pytest tests/test_cli.py -v

# 显示详细输出
uv run pytest -v --tb=short

# 生成覆盖率报告
uv run pytest --cov=trae_agent --cov-report=html
```

### 9.4 评估模块

评估模块位于 `evaluation/` 目录，用于对智能体进行基准测试。

#### 主要文件

| 文件 | 说明 |
|------|------|
| `run_evaluation.py` | 评估运行主脚本 |
| `utils.py` | 评估工具函数 |
| `setup.sh` | 评估环境设置脚本 |
| `patch_selection/` | Patch 选择模块 |

#### 评估功能

- 支持在 Docker 容器中运行评估任务
- 支持 SWE-bench 等基准测试
- Patch 选择和验证
- 执行结果统计和分析

---

## 10. 开发指南

### 10.1 项目结构约定

- 核心代码位于 `trae_agent/` 目录
- 测试代码位于 `tests/` 目录，与源代码结构对应
- 文档位于 `docs/` 目录
- 使用 Python 3.12+ 的类型注解

### 10.2 代码风格

- **行长度**: 100 字符
- **格式化工具**: ruff
- **Linting**: ruff
- **类型检查**: pyright（推荐）

Ruff 规则配置：
```toml
[tool.ruff.lint]
select = [
    "B",      # flake8-bugbear
    "SIM",    # flake8-simplify
    "C4",     # flake8-comprehensions
    "E4", "E9", "E7", "F",  # pycodestyle / pyflakes
    "I"       # isort
]
```

### 10.3 添加新工具

要添加新的工具，遵循以下步骤：

1. 在 `trae_agent/tools/` 中创建新的工具类，继承自 `Tool` 基类
2. 实现抽象方法：`get_name()`, `get_description()`, `get_parameters()`, `execute()`
3. 在 `trae_agent/tools/__init__.py` 中导入并注册到 `tools_registry`
4. 在配置文件的 `tools` 列表中添加工具名称
5. 添加相应的测试

#### 工具类模板

```python
from trae_agent.tools.base import Tool, ToolParameter, ToolExecResult, ToolCallArguments

class MyTool(Tool):
    def get_name(self) -> str:
        return "my_tool"
    
    def get_description(self) -> str:
        return "Description of my tool"
    
    def get_parameters(self) -> list[ToolParameter]:
        return [
            ToolParameter(
                name="param1",
                type="string",
                description="Description of param1",
                required=True,
            ),
        ]
    
    async def execute(self, arguments: ToolCallArguments) -> ToolExecResult:
        # 实现工具逻辑
        param1 = arguments.get("param1")
        try:
            result = do_something(param1)
            return ToolExecResult(output=result)
        except Exception as e:
            return ToolExecResult(error=str(e), error_code=1)
```

### 10.4 添加新的 LLM 提供商

要添加新的 LLM 提供商，遵循以下步骤：

1. 在 `trae_agent/utils/llm_clients/` 中创建新的客户端类
2. 继承自 `BaseLLMClient`（如果是 OpenAI 兼容的，继承自 `OpenAICompatibleBase`）
3. 实现 `chat()` 方法
4. 在 `LLMClient` 工厂类中注册新的提供商
5. 添加相应的测试

### 10.5 Pre-commit 钩子

项目使用 pre-commit 钩子来确保代码质量：

```bash
# 安装 pre-commit 钩子
make pre-commit-install

# 手动运行所有钩子
make pre-commit-run

# 修复格式化错误
make fix-format
```

### 10.6 贡献指南

参见 `CONTRIBUTING.md` 文件了解详细的贡献流程。

---

## 附录

### A. 参考链接

- [项目仓库](https://github.com/bytedance/trae-agent)
- [技术报告](https://arxiv.org/abs/2507.23370)
- [Discord 社区](https://discord.gg/VwaQ4ZBHvC)

### B. 相关文档

- `README.md` - 项目主文档
- `docs/tools.md` - 工具说明
- `docs/TRAJECTORY_RECORDING.md` - 轨迹记录文档
- `docs/roadmap.md` - 项目路线图
- `docs/legacy_config.md` - 旧版 JSON 配置文档
- `CONTRIBUTING.md` - 贡献指南
- `evaluation/README.md` - 评估模块文档

### C. 术语表

| 术语 | 说明 |
|------|------|
| LLM | Large Language Model，大语言模型 |
| Agent | 智能体，能够自主执行任务的 AI 系统 |
| Tool | 工具，智能体可以调用的外部功能 |
| Tool Call | 工具调用，LLM 发起的工具执行请求 |
| MCP | Model Context Protocol，模型上下文协议 |
| Trajectory | 轨迹，智能体执行任务的完整记录 |
| Lakeview | Trae Agent 的步骤摘要功能 |
| CKG | Code Knowledge Graph，代码知识图谱 |
| SWE-bench | 软件工程基准测试数据集 |

---

*本文档基于 Trae Agent v0.1.0 版本生成*

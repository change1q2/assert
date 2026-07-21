# mattpocock/skills 项目级安装说明

## 当前状态

⚠️ **本目录目前只包含安装骨架，没有真实 skill 内容。**

由于本机网络无法直连 `github.com:443`（`git clone`/`curl`/`Invoke-WebRequest` 均失败），
无法在此会话内完成 `git clone` 完整仓库。已准备好的文件：

- `README.md` — 仓库说明
- `install.cmd` — Windows 一键安装脚本（双击或 `.\install.cmd`）
- `install.sh` — *nix/macOS 一键安装脚本（`bash install.sh`）

## 如何完成真实安装

### 方案 1：直接 git clone（推荐）

```bash
cd f:\code_x\assert
git clone --depth 1 https://github.com/mattpocock/skills.git .claude-plugin
```

如果 `f:\code_x\assert\.claude-plugin` 已存在，可把它挪走再 clone。

### 方案 2：双击 install.cmd

在文件资源管理器双击 `install.cmd`，脚本会：

1. 检测是否已 clone，是则 `git pull`
2. 否则 `git clone --depth 1` 到当前目录
3. 失败时给出可执行的诊断提示

### 方案 3：进入 Cursor / Claude Code / Codex 后

这些 IDE 自带的代理可以直接 `git clone` 或通过 GitHub MCP 拉取。
在 Cursor 终端里跑上面的 `git clone` 命令即可。

## 这个仓库是什么

mattpocock/skills 是 Matt Pocock 维护的"代理技能包"，每个 skill 是一个
`SKILL.md` 入口文件 + 可选的子资源（references/、agents/、scripts/）。
它本身**就是一个 Claude Code 插件**，目录结构：

```
.claude-plugin/
  plugin.json       # 插件清单（22 个 skill）
  marketplace.json
skills/
  engineering/      # 17 个工程类 skill
  productivity/     # 5 个生产力类 skill
  misc/             # 4 个杂项 skill
  deprecated/       # 弃用，不安装
  in-progress/      # 进行中，不安装
  personal/         # 个人，不安装
docs/               # 给 README 引用的人类可读说明
.agents/            # ADR、设计记录
```

## 安装后怎么用

### Claude Code

```bash
/plugin marketplace add /f:/code_x/assert/.claude-plugin
/plugin install mattpocock-skills@mattpocock
/setup-matt-pocock-skills   # 一次性配置（issue tracker、triage labels 等）
```

启用后可用的命令包括：

- `/grill-me` — 反复追问设计
- `/grill-with-docs` — 追问 + 维护项目术语
- `/tdd` — 红绿重构
- `/diagnosing-bugs` — 修 bug 循环
- `/to-spec` — 把对话转 spec
- `/to-tickets` — 把 spec 转工单
- `/implement` — 实施
- `/code-review` — 双向 code review
- `/improve-codebase-architecture` — 架构梳理
- `/triage` — 工单流转
- ……等共 22 个

### Cursor / Codex

直接用 `SKILL.md` 作为参考。或者把这些文件软链到
`~/.cursor/skills/`、`~/.codex/skills/` 之类的位置（具体看官方文档）。

## 为什么不直接落到 .trae/skills/

TRAE 自身的 skills 系统（`.trae/skills/<name>/SKILL.md` + scripts/ + data/）
与 Claude Code 插件格式**不兼容**。如果硬塞过去：

- TRAE 不会激活这些 skill
- 反而会让 `.trae/skills/` 目录变得混乱
- `.claude-plugin` 是更标准的承载位置

如确需在 TRAE 中使用，思路是：

1. 选定一个 skill（如 `/tdd` 或 `/diagnosing-bugs`）
2. 把它的核心流程**手写**成 TRAE skill 格式：
   - `.trae/skills/<name>/SKILL.md`（描述 + 触发规则）
   - `.trae/skills/<name>/scripts/core.py`（具体执行脚本）
   - `.trae/skills/<name>/data/*.csv`（知识库）
3. 用 `skill-creator` 这个 TRAE skill 来创建

不要尝试把 22 个 skill 全部桥接——选 3-5 个最常用的做迁移即可。

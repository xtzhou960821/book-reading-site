# Claude Code Skills 完全指南

> 原文：https://code.claude.com/docs/en/skills  
> 翻译时间：2026-02-18

---

## 简介

**Skills（技能）** 扩展了 Claude 的能力。创建一个包含指令的 `SKILL.md` 文件，Claude 就会将其添加到工具库中。Claude 会在相关场景自动使用技能，你也可以通过 `/skill-name` 直接调用。

Claude Code 的 Skills 遵循 [Agent Skills](https://agentskills.io) 开放标准，该标准适用于多种 AI 工具。Claude Code 还通过以下功能扩展了标准：
- [调用控制](#控制谁可以调用技能)
- [子代理执行](#在子代理中运行技能)
- [动态上下文注入](#注入动态上下文)

---

## 快速开始

### 创建你的第一个 Skill

以下示例创建一个 Skill，教会 Claude 使用可视化图表和类比来解释代码。由于使用了默认的 frontmatter，Claude 可以在你询问工作原理时自动加载它，或者你可以通过 `/explain-code` 直接调用。

**文件结构：**
```
.claude/skills/
└── explain-code/
    └── SKILL.md
```

**SKILL.md 内容示例：**
```markdown
---
name: explain-code
description: 使用可视化图表和类比解释代码工作原理
---

解释代码时：
- 使用 mermaid 图表展示数据流
- 提供现实世界的类比
- 将复杂逻辑分解为简单的步骤
```

---

## Skill 的存放位置

Skill 的存放位置决定了谁可以使用它：

| 位置 | 路径 | 适用范围 |
|------|------|----------|
| 企业级 | 参见 [托管设置](/docs/en/permissions#managed-settings) | 组织内所有用户 |
| 个人级 | `~/.claude/skills/<skill-name>/SKILL.md` | 你的所有项目 |
| 项目级 | `.claude/skills/<skill-name>/SKILL.md` | 仅当前项目 |
| 插件级 | `<plugin>/skills/<skill-name>/SKILL.md` | 插件启用的地方 |

当不同层级存在同名 Skill 时，优先级为：企业 > 个人 > 项目。插件 Skill 使用 `plugin-name:skill-name` 命名空间，不会与其他层级冲突。

### 自动发现嵌套目录

当你在子目录中工作时，Claude Code 会自动发现嵌套的 `.claude/skills/` 目录。例如，如果你在 `packages/frontend/` 中编辑文件，Claude Code 也会查找 `packages/frontend/.claude/skills/` 中的 Skill。这支持 monorepo 设置，让各个包可以有自己的 Skill。

### Skill 目录结构

每个 Skill 是一个以 `SKILL.md` 为入口的目录：

```
my-skill/
├── SKILL.md          # 主指令（必需）
├── template.md       # Claude 填写的模板
├── examples/
│   └── sample.md     # 示例输出，展示预期格式
└── scripts/
    └── validate.sh   # Claude 可以执行的脚本
```

`SKILL.md` 包含主指令，是必需的。其他文件可选，可构建更强大的 Skill：模板、示例、脚本或详细参考文档。在 `SKILL.md` 中引用这些文件，让 Claude 知道它们的内容和加载时机。

---

## 配置 Skills

Skills 通过 `SKILL.md` 顶部的 YAML frontmatter 和随后的 Markdown 内容配置。

### Skill 内容类型

Skill 文件可包含任何指令，但思考调用方式有助于指导内容编写：

**参考内容**：添加 Claude 应用于当前工作的知识。惯例、模式、风格指南、领域知识。此类内容内联运行，Claude 可结合对话上下文使用。

```markdown
---
name: api-conventions
description: 本代码库的 API 设计模式
---

编写 API 端点时：
- 使用 RESTful 命名惯例
- 返回一致的错误格式
- 包含请求验证
```

**任务内容**：给 Claude 执行特定操作的逐步指令，如部署、提交或代码生成。通常希望用 `/skill-name` 直接调用，而非让 Claude 自动运行。添加 `disable-model-invocation: true` 防止 Claude 自动触发。

```markdown
---
name: deploy
description: 部署应用到生产环境
context: fork
disable-model-invocation: true
---

部署应用：
1. 运行测试套件
2. 构建应用
3. 推送到部署目标
```

### Frontmatter 参考

除 Markdown 内容外，可使用 YAML frontmatter 配置 Skill 行为：

```markdown
---
name: my-skill
description: 这个 Skill 的作用和使用时机
disable-model-invocation: true
allowed-tools: Read, Grep
---

你的 Skill 指令...
```

所有字段可选。建议至少添加 `description`，让 Claude 知道何时使用该 Skill。

| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | 否 | Skill 的显示名称。省略则使用目录名。仅限小写字母、数字和连字符（最多64字符）。 |
| `description` | 建议 | Skill 的作用和使用时机。Claude 用此决定是否应用该 Skill。省略则使用 Markdown 内容的第一段。 |
| `argument-hint` | 否 | 自动完成时的提示，指示预期参数。示例：`[issue-number]` 或 `[filename] [format]`。 |
| `disable-model-invocation` | 否 | 设为 `true` 阻止 Claude 自动加载此 Skill。用于希望手动通过 `/name` 触发的工作流。默认：`false`。 |
| `user-invocable` | 否 | 设为 `false` 在 `/` 菜单中隐藏。用于用户不应直接调用的背景知识。默认：`true`。 |
| `allowed-tools` | 否 | 此 Skill 激活时 Claude 可无需询问权限使用的工具。 |
| `model` | 否 | 此 Skill 激活时使用的模型。 |
| `context` | 否 | 设为 `fork` 在 fork 的子代理上下文中运行。 |
| `agent` | 否 | 设置 `context: fork` 时使用的子代理类型。 |
| `hooks` | 否 | 限定于此 Skill 生命周期的 Hooks。参见 [Skills 和 Agents 中的 Hooks](/docs/en/hooks#hooks-in-skills-and-agents)。 |

#### 可用的字符串替换

Skills 支持调用时传入的动态值的字符串替换：

| 变量 | 说明 |
|------|------|
| `$ARGUMENTS` | 调用 Skill 时传递的所有参数。如果内容中未出现 `$ARGUMENTS`，参数将以 `ARGUMENTS: <value>` 形式追加。 |
| `$ARGUMENTS[N]` | 通过0-based索引访问特定参数，如 `$ARGUMENTS[0]` 表示第一个参数。 |
| `$N` | `$ARGUMENTS[N]` 的简写，如 `$0` 表示第一个参数，`$1` 表示第二个。 |
| `${CLAUDE_SESSION_ID}` | 当前会话ID。用于日志记录、创建会话特定文件或将 Skill 输出与会话关联。 |

使用替换的示例：
```markdown
---
name: session-logger
description: 记录本次会话的活动
---

将以下内容记录到 logs/${CLAUDE_SESSION_ID}.log：

$ARGUMENTS
```

---

## 添加支持文件

Skills 可包含目录中的多个文件。这让 `SKILL.md` 保持核心内容聚焦，同时让 Claude 仅在需要时访问详细参考材料。大型参考文档、API 规范或示例集合无需每次运行 Skill 都加载到上下文中。

```
my-skill/
├── SKILL.md (必需 - 概览和导航)
├── reference.md (详细 API 参考)
├── examples/ (示例集合)
└── templates/ (可重用模板)
```

从 `SKILL.md` 链接到这些文件，让 Claude 知道它们包含什么以及何时加载。

---

## 总结

Claude Code Skills 是扩展 Claude 能力的强大方式。通过创建结构化的 `SKILL.md` 文件，你可以：

1. **自动化重复任务** - 让 Claude 按照你的标准流程执行操作
2. **保持一致性** - 确保代码风格、API 设计等符合团队规范
3. **共享知识** - 将最佳实践编码为可重用的 Skill
4. **提高效率** - 通过简单的 `/skill-name` 命令触发复杂工作流

开始使用 Skills，让你的 Claude Code 体验更加强大！

---

## 参考链接

- [Agent Skills 开放标准](https://agentskills.io)
- [Claude Code 官方文档](https://code.claude.com/docs)
- [创建子代理](/docs/en/sub-agents)
- [运行代理团队](/docs/en/agent-teams)
- [创建插件](/docs/en/plugins)
- [Hooks 指南](/docs/en/hooks-guide)
- [模型上下文协议 (MCP)](/docs/en/mcp)

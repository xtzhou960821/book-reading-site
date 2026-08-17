# 书籍脚手架工具

`add-book.js` 是一键生成新书全套页面的 Node 工具（零依赖，只需 Node.js ≥ 16）。

## 添加一本书

```bash
node tools/add-book.js add \
  --id mybook \
  --title "我的书" \
  --subtitle "My Book" \
  --desc "一句话介绍" \
  --pages "概览|index-mybook.html,导入中心|index-mybook.html#import-hub,第一章|chapter-1.html,第二章|chapter-2.html"
```

会生成：

- `index-mybook.html` — 概览页（含导入中心、统计位、章节导航卡片）
- 每个章节页面（导航高亮当前页、前后页 pager）
- 自动更新 `books.js`：`BOOKS` 新增条目 + `getCurrentBookId` 识别新页面
- 书籍切换器为动态渲染，**全站所有页面**自动出现新书入口

### 参数

| 参数 | 说明 |
|------|------|
| `--id` | 必填，小写字母/数字/连字符，如 `mybook`（将生成 `index-mybook.html`） |
| `--title` | 必填，书名 |
| `--subtitle` | 可选，副标题，默认同书名 |
| `--desc` | 可选，概览页 hero 描述 |
| `--pages` | 可选，逗号分隔的「标签\|文件」列表；第一项应为指向 index 页的概览（缺省自动补）。不传时使用默认结构（概览 + 导入中心 + 第一章/第二章/第三章） |
| `--force` | 覆盖已存在的同名文件 |

### 页面格式约定

- `标签|文件.html` 之间用 `|` 分隔，条目之间用 `,` 分隔
- 支持锚点链接：`导入中心|index-mybook.html#import-hub`
- 生成页面为**骨架**：统计位（`data-count`）、卡片、图表均为占位，可按 `revolutions.html` 等示例页风格自由编辑

## 移除一本书

```bash
node tools/add-book.js remove --id mybook
```

删除该书全部页面，并把 `books.js` 还原（与添加前逐字节一致）。

## 校验

- 添加/移除后均自动校验 `books.js` 语法
- 工具内置检查：id 非法、id 重复、目标文件已存在（需 `--force`）都会明确报错

## 关联解析内容（导入内容实时上页）

生成的书页自带 `book-content-renderer.js`，与「导入中心」联动：

1. 在概览页导入 PDF / 网址（真实解析，见导入中心功能）
2. 概览页出现选择器，点击某本已解析书（仅一本时自动关联）
3. 真实内容直接渲染到书页上：**原文摘录、章节结构、高频关键词、解析字数/页数/阅读时长、三组真实统计柱状图**
4. 关联记忆存于 localStorage（`book-scope:linked-content:<bookId>`），**概览页选一次，全书章节页自动同步**

页面钩子约定（可手工加到任意页面）：

| 钩子 | 作用 |
|------|------|
| `data-book-id`（main 上） | 当前书 id（缺省用 `getCurrentBookId`） |
| `data-content-block` | 区块存在才初始化渲染器 |
| `data-content-picker` / `-picker-empty` | 内容选择器（仅需交互的页面放） |
| `data-content-scope` | 渲染结果容器（初始 `hidden`） |
| `data-content-excerpt` / `-note` | 摘录 / 备注 |
| `data-content-headings` 等 | 章节结构 |
| `data-content-keywords` | 高频关键词 chips |
| `data-auto-stat="words\|pages\|minutes"` | 统计位 |
| `data-content-chart` | 3-tab 柱状图（自管，不与 app.js 图表冲突） |

## 常见问题

- **页面导航高亮规则**：当前页面文件与链接 href 完全相等才高亮（`index.html#import-hub` 这类锚点链接不会误高亮）
- 如需在某一页不放导入中心，可手动删除对应 section（不影响其他功能）

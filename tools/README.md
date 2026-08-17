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

## 常见问题

- **页面导航高亮规则**：当前页面文件与链接 href 完全相等才高亮（`index.html#import-hub` 这类锚点链接不会误高亮）
- 如需在某一页不放导入中心，可手动删除对应 section（不影响其他功能）

# 书籍阅读管理网站 📚

一个**纯前端、零依赖**的书籍视觉化阅读整理工具。导入一本书（PDF / 网页 / 纯书名），即可自动生成一套结构化的阅读导览页面：概念图表、高频关键词、章节结构、统计数据、阅读进度追踪——全部在浏览器本地运行，无需后端。

## ✨ 特性

- **多书籍系统**：内置多本书，左上角切换器一键切换，每本书拥有独立的导航与阅读进度
- **通用导入中心**：三种方式创建书籍
  - **方式 A** — 输入网址，自动抓取并解析正文
  - **方式 B** — 上传 PDF，用本地 [pdf.js](https://mozilla.github.io/pdf.js/) 解析文本
  - **方式 C** — 仅输入书名，生成骨架模板
- **真实内容分析**：导入后自动统计——字数 / 页数 / 预计阅读时长、章节结构、高频关键词、三组数据化图表（结构词汇、句法节奏、文本特征）
- **内容关联渲染**：一次选择关联内容，全书的概览页与章节页自动同步展示摘录、关键词与真实统计
- **章节阅读追踪**：侧边栏章节导航，包含阅读进度条、已读章节计数、按阅读速度估算剩余时长（按书籍隔离偏好）
- **数据可视化**：环形结构图、tab 切换柱状图、可交互折线图（图例点击显隐）、滚动动画统计位
- **脚手架工具**：`tools/add-book.js` 一条命令生成新书全套页面

## 🚀 快速开始

项目为静态网站，无需安装任何依赖，直接用浏览器打开即可（建议通过本地服务器运行，方便 PDF 解析与网页抓取）。

```bash
# 任选一种方式启动本地静态服务器
npx serve .
# 或
python3 -m http.server 8000
```

然后访问 `http://localhost:8000` 即可。

## 📂 项目结构

```
.
├── index.html                 # 《人类简史》概览首页
├── index-100years.html        # 《百年孤独》概览首页
├── index-wealth.html          # 《国富论》概览首页
├── index-little-prince.html   # 《小王子》概览首页
├── revolutions.html 等        # 各书的章节导览页
├── book-template.html/.js     # 通用导入模板页（打开任意导入的书）
├── styles.css                 # 全局样式（冷调克制高定，单一青玉强调色）
│
├── books.js                   # 书籍注册表：导航映射 + 当前页识别
├── library.js                 # 导入中心：URL / PDF / 书名 三种导入方式
├── content-extract.js         # 文本提取与分析（PDF/网页 → 关键词/章节/图表数据）
├── book-content-renderer.js   # 把解析内容渲染到书页
├── book-switcher.js           # 多书切换下拉菜单（动态渲染）
├── app.js                     # 全局交互：滚动进度、tooltip、图表、章节阅读导航
│
├── vendor/                    # 第三方库（pdf.js）
├── tools/
│   ├── add-book.js            # 脚手架工具：一键生成 / 移除一本书
│   └── README.md              # 脚手架工具说明
└── README.md
```

## 🛠 添加一本新书

使用内置脚手架工具，一条命令生成新书的整套页面：

```bash
node tools/add-book.js add \
  --id mybook \
  --title "我的书" \
  --subtitle "My Book" \
  --desc "一句话介绍这本书" \
  --pages "概览|index-mybook.html,导入中心|index-mybook.html#import-hub,第一章|chapter-1.html,第二章|chapter-2.html"
```

会自动：

- 生成 `index-mybook.html` 概览页与各章节页面
- 自动更新 `books.js`（注册新书 + 页面识别）
- 书籍切换器动态渲染，**全站所有页面**自动出现新书入口

移除一本书：

```bash
node tools/add-book.js remove --id mybook
```

> 更详细的参数与约定见 [tools/README.md](tools/README.md)。

## 💾 数据存储

所有数据保存在浏览器 **localStorage**，无需后端：

| 存储键 | 作用 |
|--------|------|
| `book-template:library:v1` | 导入书籍库（含解析出的内容） |
| `book-scope:linked-content:<bookId>` | 每本书关联的解析内容 |
| `<bookId>:chapter:*` | 每本书的章节阅读进度偏好 |

## 🧩 技术栈

- **纯 HTML + CSS + 原生 JavaScript**，无框架、无构建步骤、无 npm 依赖
- **pdf.js**（`vendor/`）— 本地 PDF 文本解析
- 图标与图表均为内联 SVG / CSS 绘制

## 📄 License

本项目为个人阅读整理工具，暂未指定开源协议。如有需要请自行添加 LICENSE 文件。
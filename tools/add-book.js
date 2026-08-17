#!/usr/bin/env node
/**
 * add-book.js — 一键生成新书的全套页面（无第三方依赖，纯 Node）
 *
 * 用法：
 *   node tools/add-book.js add \
 *     --id mybook --title "我的书" --subtitle "My Book" \
 *     --desc "一句话介绍这本书" \
 *     --pages "概览|index-mybook.html,导入中心|index-mybook.html#import-hub,第一章|chapter-1.html,第二章|chapter-2.html,第三章|chapter-3.html"
 *
 *   node tools/add-book.js remove --id mybook
 *
 * 说明：
 *   - --id 必须是小写字母/数字/连字符，且不与现有书籍重复
 *   - --pages 为逗号分隔的「标签|文件」列表；第一项应为概览（指向 index 页）
 *   - 不传 --pages 时使用默认章节结构（概览 + 导入中心 + 三章）
 *   - 生成的书会自动写入 books.js（BOOKS 配置 + getCurrentBookId 识别）
 *   - remove 会删除该书的全部页面并从 books.js 中移除
 */

const fs = require("fs");
const path = require("path");

const SITE_ROOT = path.resolve(__dirname, "..");
const BOOKS_FILE = path.join(SITE_ROOT, "books.js");

// ---------------------------------------------------------------------------
// 参数解析
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { mode: "add", pages: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--id") args.id = next();
    else if (arg === "--title") args.title = next();
    else if (arg === "--subtitle") args.subtitle = next();
    else if (arg === "--desc") args.desc = next();
    else if (arg === "--pages") args.pages = next();
    else if (arg === "--force") args.force = true;
    else if (arg === "add") args.mode = "add";
    else if (arg === "remove") args.mode = "remove";
    else if (arg === "-h" || arg === "--help") args.help = true;
  }
  return args;
}

function fail(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// books.js 读写
// ---------------------------------------------------------------------------
function readBooksJs() {
  return fs.readFileSync(BOOKS_FILE, "utf8");
}

function writeBooksJs(src) {
  fs.writeFileSync(BOOKS_FILE, src);
}

function listBookIds(src) {
  const ids = [];
  const re = /^\s{2}['"]?([a-z0-9-]+)['"]?:\s*\{/gm;
  let m;
  while ((m = re.exec(src)) !== null) ids.push(m[1]);
  return ids;
}

function buildBookEntry(id, title, subtitle, pages, indexFile) {
  const q = (s) => String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const pageLines = pages
    .map((p) => `      { label: '${q(p.label)}', href: '${q(p.href)}' },`)
    .join("\n");
  return (
    `  '${q(id)}': {\n` +
    `    id: '${q(id)}',\n` +
    `    title: '${q(title)}',\n` +
    `    subtitle: '${q(subtitle)}',\n` +
    `    indexUrl: '${q(indexFile)}',\n` +
    `    pages: [\n${pageLines}\n    ],\n` +
    `  },`
  );
}

function buildPathCheck(id, files) {
  const cond = files.map((f) => `path === '${f}'`).join(" || ");
  return `  if (${cond}) {\n    return '${id}';\n  }`;
}

// ---------------------------------------------------------------------------
// 页面渲染
// ---------------------------------------------------------------------------
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function renderNav(pages, currentFile, title) {
  const links = pages
    .map((p) => {
      // 完全匹配（忽略 hash），仅当前页面对应条目高亮
      const active = p.href === currentFile;
      return `<a class="nav-link${active ? " active" : ""}" href="${esc(p.href)}">${esc(p.label)}</a>`;
    })
    .join("\n          ");
  return `<div class="brand-area">
          <div class="book-switcher" data-book-switcher>
            <button class="book-switcher-btn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="切换书籍">
              <span class="book-switcher-current">${esc(title)}</span>
              <span class="book-switcher-arrow">▾</span>
            </button>
            <ul class="book-switcher-list" role="listbox" hidden></ul>
          </div>
        </div>
        <div class="nav-links">
          ${links}
        </div>`;
}

const PAGE_HEAD = (title, bookId) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <div class="orb one"></div>
  <div class="orb two"></div>
  <div class="orb three"></div>

  <main class="page" data-book-id="${bookId}">
    <header class="topbar reveal">
      <nav class="nav">
`;

const SCRIPTS_CORE = `  <script src="./books.js"></script>
  <script src="./app.js"></script>
  <script src="./book-switcher.js"></script>
  <script src="./book-content-renderer.js"></script>
</body>
</html>
`;

const SCRIPTS_WITH_HUB = `  <script src="./books.js"></script>
  <script src="./vendor/pdf.min.js"></script>
  <script src="./content-extract.js"></script>
  <script src="./library.js"></script>
  <script src="./app.js"></script>
  <script src="./book-switcher.js"></script>
  <script src="./book-content-renderer.js"></script>
</body>
</html>
`;

function renderIndex(book) {
  const { id, title, subtitle, desc, pages, indexFile } = book;
  const chapterLinks = pages
    .filter((p) => p.href !== indexFile && !p.href.includes("#"))
    .map(
      (p) =>
        `        <a class="nav-card reveal" href="${esc(p.href)}">\n` +
        `          <h3>${esc(p.label)}</h3>\n` +
        `          <span>章节页面：${esc(p.label)} 的阅读导览</span>\n` +
        `        </a>`
    )
    .join("\n");
  const fallbackDesc =
    desc ||
    `本书以「${esc(pages[0].label)}」为入口展开：通过结构化卡片、概念图表与章节导航，帮助你快速建立对《${esc(title)}》的完整理解。`;

  return (
    PAGE_HEAD(`《${title}》视觉导览`, id) +
    renderNav(pages, indexFile, title) +
    `
      </nav>
    </header>

    <section class="hero reveal">
      <div class="glass-title">《${esc(title)}》</div>
      <p>${fallbackDesc}</p>
      <div class="badges">
        <span class="badge">结构化阅读</span>
        <span class="badge">概念图表</span>
        <span class="badge">${esc(subtitle)}</span>
      </div>
    </section>

    <section class="section" id="import-hub">
      <div class="section-head reveal">
        <h2>通用书籍导入入口</h2>
        <span class="section-meta">输入网址或上传 PDF，自动套用当前模板</span>
      </div>
      <div class="card reveal">
        <p class="note" data-import-feedback data-tone="info">导入后会生成一条书籍入口，可打开对应模板页继续阅读整理。</p>
      </div>
      <div class="grid-2">
        <div class="card reveal">
          <h3>方式 A：指定书籍网址</h3>
          <form class="import-form" data-url-import-form>
            <label class="field">
              <span>书籍网址</span>
              <input class="control" type="url" name="book_url" placeholder="https://example.com/book" required />
            </label>
            <label class="field">
              <span>书名（可选）</span>
              <input class="control" type="text" name="book_url_title" placeholder="不填则自动推断" />
            </label>
            <button class="primary-btn" type="submit">从网址创建模板</button>
          </form>
        </div>
        <div class="card reveal">
          <h3>方式 B：上传 PDF 文件</h3>
          <form class="import-form" data-pdf-import-form>
            <label class="field">
              <span>选择 PDF</span>
              <input class="control" type="file" name="book_pdf" accept=".pdf,application/pdf" required />
            </label>
            <label class="field">
              <span>书名（可选）</span>
              <input class="control" type="text" name="book_pdf_title" placeholder="不填则使用文件名" />
            </label>
            <button class="primary-btn" type="submit">从 PDF 创建模板</button>
          </form>
        </div>
      </div>
      <div class="card reveal">
        <div class="section-head">
          <h3>已导入书籍库</h3>
          <span class="section-meta" data-library-count>0 本</span>
        </div>
        <div class="library-list" data-library-list></div>
        <p class="note" data-library-empty>还没有导入书籍。你可以先从网址或 PDF 创建一本。</p>
      </div>
    </section>

    <section class="section" data-content-block>
      <div class="section-head reveal">
        <h2>关联解析内容</h2>
        <span class="section-meta" data-content-meta>从下方选择已解析的 PDF/网页</span>
      </div>
      <div class="card reveal">
        <p class="note" data-content-picker-empty>还没有可关联的解析内容：先在上方「通用书籍导入入口」导入 PDF 或网址，即可把解析出的真实文本、章节、关键词与统计展示在本页。</p>
        <div class="kw-chips" data-content-picker></div>
      </div>
      <div class="card reveal" data-content-scope hidden>
        <p class="quote" data-content-excerpt></p>
        <p class="note" data-content-note hidden></p>
        <div class="grid-3" style="margin-top: 18px">
          <div class="stat">
            <strong data-auto-stat="words" data-suffix="字">--</strong>
            <span>解析字数</span>
          </div>
          <div class="stat">
            <strong data-auto-stat="pages" data-suffix="页">--</strong>
            <span>页数 / 章节</span>
          </div>
          <div class="stat">
            <strong data-auto-stat="minutes" data-suffix="分钟">--</strong>
            <span>预计阅读</span>
          </div>
        </div>
      </div>
      <div class="card reveal" data-content-scope hidden>
        <div class="section-head">
          <h3>章节结构</h3>
          <span class="section-meta" data-content-headings-count></span>
        </div>
        <ol class="heading-list" data-content-headings></ol>
        <p class="note" data-content-headings-empty hidden>未检测到清晰的章节标题。</p>
      </div>
      <div class="card reveal" data-content-scope hidden>
        <div class="section-head">
          <h3>高频关键词</h3>
          <span class="section-meta">来自全文词频统计</span>
        </div>
        <div class="kw-chips" data-content-keywords></div>
      </div>
      <div class="card chart-animate reveal" data-content-chart hidden>
        <div class="tabs">
          <button class="tab-button active" data-tab="population">结构词汇</button>
          <button class="tab-button" data-tab="wellbeing">句法节奏</button>
          <button class="tab-button" data-tab="ecology">文本特征</button>
        </div>
        <div class="chart-title"><span data-chart-label>结构与词汇指数（0-100）</span></div>
        <div class="bar-grid" data-chart-bars>
          <div>
            <div class="bar-value" data-bar-value>--</div>
            <div class="bar-vertical"><span style="height: 4%; background: #7ad3ff;"></span></div>
            <div class="bar-caption">章节密度</div>
          </div>
          <div>
            <div class="bar-value" data-bar-value>--</div>
            <div class="bar-vertical"><span style="height: 4%; background: #b4ffb2;"></span></div>
            <div class="bar-caption">词汇丰富度</div>
          </div>
          <div>
            <div class="bar-value" data-bar-value>--</div>
            <div class="bar-vertical"><span style="height: 4%; background: #ffd087;"></span></div>
            <div class="bar-caption">概念集中度</div>
          </div>
          <div>
            <div class="bar-value" data-bar-value>--</div>
            <div class="bar-vertical"><span style="height: 4%; background: #ff8ec7;"></span></div>
            <div class="bar-caption">语义跨度</div>
          </div>
        </div>
        <p class="note" data-chart-note>选择关联内容后显示真实统计。</p>
      </div>
    </section>

    <section class="section">
      <div class="section-head reveal">
        <h2>关键节点速读</h2>
        <span class="section-meta">为后续编辑预留的统计位</span>
      </div>
      <div class="grid-3">
        <div class="stat reveal">
          <strong data-count="1" data-suffix="号">0</strong>
          <span>关键节点一：待补充</span>
        </div>
        <div class="stat reveal">
          <strong data-count="2" data-suffix="号">0</strong>
          <span>关键节点二：待补充</span>
        </div>
        <div class="stat reveal">
          <strong data-count="3" data-suffix="号">0</strong>
          <span>关键节点三：待补充</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head reveal">
        <h2>全书结构地图</h2>
        <span class="section-meta">骨架占位，可编辑</span>
      </div>
      <div class="grid-2">
        <div class="card reveal">
          <h3>章节结构</h3>
          <p>本书包含 ${pages.length - 1} 个章节页面，从「${esc(pages[0].label)}」开始浏览。</p>
          <div class="matrix">
            <div class="pill">概览 → 章节 → 回看</div>
            <div class="pill">卡片速读</div>
            <div class="pill">图表导读</div>
          </div>
        </div>
        <div class="card reveal">
          <h3>阅读路径建议</h3>
          <p>先用概览页建立全局印象，再按章节顺序深入；每个章节页都提供前后页导航。</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head reveal">
        <h2>深入阅读导航</h2>
        <span class="section-meta">进入章节页面</span>
      </div>
      <div class="nav-cards">
${chapterLinks}
      </div>
    </section>

    <div class="footer">建议从「${esc(pages[0].label)}」开始浏览。此页面为生成的骨架，内容可自由编辑。</div>
  </main>
` +
    SCRIPTS_WITH_HUB
  );
}

function renderSubpage(book, page, prevPage, nextPage) {
  const { title, subtitle, pages } = book;
  const prevLink = prevPage
    ? `<a href="${esc(prevPage.href)}">← ${esc(prevPage.label)}</a>`
    : `<a href="${book.indexFile}">← 返回概览</a>`;
  const nextLink = nextPage
    ? `<a href="${esc(nextPage.href)}">${esc(nextPage.label)} →</a>`
    : `<a href="${book.indexFile}">查看概览 →</a>`;

  return (
    PAGE_HEAD(`《${title}》${page.label}`, book.id) +
    renderNav(pages, page.href.split("#")[0], title) +
    `
      </nav>
    </header>

    <section class="hero reveal">
      <div class="glass-title">${esc(page.label)}</div>
      <p>
        本页为「${esc(page.label)}」的阅读骨架：章节要点、结构图表与前后导航均已就位，
        具体内容可在编辑时补充。
      </p>
      <div class="badges">
        <span class="badge">章节骨架</span>
        <span class="badge">待填充</span>
        <span class="badge">${esc(subtitle)}</span>
      </div>
    </section>

    <section class="section">
      <div class="section-head reveal">
        <h2>章节要点</h2>
        <span class="section-meta">占位内容，可编辑</span>
      </div>
      <div class="grid-2">
        <div class="card reveal">
          <h3>要点一</h3>
          <p>在此填写本章的第一个核心观点或关键事件。</p>
        </div>
        <div class="card reveal">
          <h3>要点二</h3>
          <p>在此填写本章的第二个核心观点或关键事件。</p>
        </div>
        <div class="card reveal">
          <h3>要点三</h3>
          <p>在此填写本章的第三个核心观点或关键事件。</p>
        </div>
        <div class="card reveal">
          <h3>本章小结</h3>
          <p>在此总结本章的阅读收获与前后关联。</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head reveal">
        <h2>概念速览</h2>
        <span class="section-meta">图表占位，可替换为自定义图表</span>
      </div>
      <div class="card chart-animate reveal">
        <div class="chart-title"><span>章节结构示意</span></div>
        <div class="matrix">
          <div class="pill">引入</div>
          <div class="pill">展开</div>
          <div class="pill">对比</div>
          <div class="pill">总结</div>
        </div>
        <p class="note">可参考 revolutions.html 等示例页替换为 SVG 图表。</p>
      </div>
    </section>

    <section class="section" data-content-block>
      <div class="section-head reveal">
        <h2>关联解析内容</h2>
        <span class="section-meta" data-content-meta>自动跟随概览页选择</span>
      </div>
      <div class="card reveal" data-content-scope hidden>
        <p class="quote" data-content-excerpt></p>
        <div class="kw-chips" style="margin-top: 14px" data-content-keywords></div>
      </div>
      <p class="note" data-content-empty hidden>尚未关联解析内容：可在概览页「通用书籍导入入口」导入 PDF/网址并选择关联。</p>
    </section>

    <div class="pager reveal">
      ${prevLink}
      ${nextLink}
    </div>

    <div class="footer">《${esc(title)}》章节页 · 骨架模板。</div>
  </main>
` +
    SCRIPTS_CORE
  );
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
function getIndexFile(id) {
  return `index-${id}.html`;
}

function normalizePages(args, id) {
  const indexFile = getIndexFile(id);
  if (!args.pages) {
    return [
      { label: "概览", href: indexFile },
      { label: "导入中心", href: `${indexFile}#import-hub` },
      { label: "第一章", href: "chapter-1.html" },
      { label: "第二章", href: "chapter-2.html" },
      { label: "第三章", href: "chapter-3.html" },
    ];
  }
  const pages = args.pages.split(",").map((part) => {
    const [label, href] = part.split("|").map((s) => s.trim());
    if (!label || !href) fail(`页面格式错误：「${part}」应为「标签|文件」`);
    return { label, href };
  });
  // 确保第一项是概览并指向 index 页
  if (pages[0].href !== indexFile) {
    pages.unshift({ label: "概览", href: indexFile });
  }
  return pages;
}

function pageFiles(pages, indexFile) {
  const files = [];
  pages.forEach((p) => {
    const f = p.href.split("#")[0];
    if (f && f.endsWith(".html") && f !== indexFile && !files.includes(f)) files.push(f);
  });
  return files;
}

function cmdAdd(args) {
  const id = args.id;
  if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    fail("--id 必须为小写字母/数字/连字符（如 mybook）");
  }
  const title = args.title;
  if (!title) fail("--title 必填");
  const subtitle = args.subtitle || title;

  const src = readBooksJs();
  if (listBookIds(src).includes(id)) fail(`书籍「${id}」已存在于 books.js`);

  const indexFile = getIndexFile(id);
  const pages = normalizePages(args, id);
  const files = pageFiles(pages, indexFile);
  const allFiles = [indexFile, ...files];

  if (!args.force) {
    const existing = allFiles.filter((f) => fs.existsSync(path.join(SITE_ROOT, f)));
    if (existing.length) {
      fail(`以下文件已存在，请先处理或使用 --force 覆盖：${existing.join(", ")}`);
    }
  }

  const book = { id, title, subtitle, desc: args.desc || "", pages, indexFile };

  // 1. 生成页面
  fs.writeFileSync(path.join(SITE_ROOT, indexFile), renderIndex(book));
  const ordered = pages.filter((p) => p.href !== indexFile && !p.href.includes("#"));
  ordered.forEach((p, i) => {
    const prev = i > 0 ? ordered[i - 1] : null;
    const next = i < ordered.length - 1 ? ordered[i + 1] : null;
    fs.writeFileSync(path.join(SITE_ROOT, p.href), renderSubpage(book, p, prev, next));
  });

  // 2. 写入 books.js（BOOKS 条目）
  const entry = buildBookEntry(id, title, subtitle, pages, indexFile);
  const booksStart = src.indexOf("const BOOKS = {");
  const booksClose = src.indexOf("\n};", booksStart);
  if (booksStart === -1 || booksClose === -1) fail("books.js 结构异常：找不到 BOOKS 定义");
  let next = src.slice(0, booksClose) + "\n" + entry + src.slice(booksClose);

  // 3. 写入 books.js（getCurrentBookId 识别）
  const marker = "  return 'sapiens';";
  const idx = next.indexOf(marker);
  if (idx === -1) fail("books.js 结构异常：找不到 getCurrentBookId 的默认返回");
  const pathCheck = buildPathCheck(id, allFiles);
  next = next.slice(0, idx) + pathCheck + "\n" + next.slice(idx);

  writeBooksJs(next);

  console.log("✓ 已生成新书：「" + title + "」（id=" + id + "）");
  allFiles.forEach((f) => console.log("  - " + f));
  console.log("✓ 已更新 books.js（BOOKS 配置 + 页面识别）");
  console.log("提示：书籍切换器为动态渲染，所有页面会自动出现该书入口。");
}

function cmdRemove(args) {
  const id = args.id;
  if (!id) fail("remove 模式需要 --id");
  const src = readBooksJs();
  if (!listBookIds(src).includes(id)) fail(`书籍「${id}」不存在`);

  // 从 BOOKS 中移除条目（条目为扁平对象，缩进 2 空格）
  const entryRe = new RegExp("^  ['\"]?" + id + "['\"]?: \\{[\\s\\S]*?\\n  \\},$", "m");
  if (!entryRe.test(src)) fail(`无法定位 BOOKS 中的「${id}」条目`);
  let next = src
    .replace(entryRe, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n\n\};/g, "\n};"); // 还原 BOOKS 结尾的换行（仅此一处出现列首 "};"）

  // 从 getCurrentBookId 中移除识别块
  const blockRe = new RegExp("\\n  if \\(path === 'index-" + id + "\\.html'[\\s\\S]*?return '" + id + "';\\n  \\}\\n");
  if (blockRe.test(next)) {
    next = next.replace(blockRe, "\n");
  }

  writeBooksJs(next);

  // 删除页面文件
  const indexFile = getIndexFile(id);
  const toDelete = [indexFile];
  // 读取该书的页面列表（从已移除前的 src 中解析）
  const entryBody = src.match(entryRe)[0];
  const hrefRe = /href: '([^']+\.html)'/g;
  let m;
  while ((m = hrefRe.exec(entryBody)) !== null) {
    const f = m[1].split("#")[0];
    if (f !== indexFile && !toDelete.includes(f)) toDelete.push(f);
  }
  toDelete.forEach((f) => {
    const full = path.join(SITE_ROOT, f);
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
      console.log("  - 已删除 " + f);
    }
  });

  console.log("✓ 已移除书籍「" + id + "」及其页面，books.js 已还原。");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "用法：\n" +
        "  node tools/add-book.js add --id <id> --title <标题> [--subtitle <副标题>] [--desc <描述>] [--pages '标签|文件,标签|文件']\n" +
        "  node tools/add-book.js remove --id <id>\n" +
        "  node tools/add-book.js --help"
    );
    return;
  }
  if (args.mode === "remove") cmdRemove(args);
  else cmdAdd(args);
}

main();

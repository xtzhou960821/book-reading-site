/**
 * book-reader.js — 动态书籍阅读器
 *
 * 为「方式 C：输入书名」在浏览器里创建的动态注册书籍提供完整的
 * 「概览 + 导入中心 + 关联内容 + 关键节点 + 全书结构 + 阅读地图 + 读后清单」
 * 多视图阅读页。
 *
 * 页面：book.html?book=<id>
 * 书籍来源：books.js 中的动态注册表（localStorage `book-template:registry:v1`）
 * 内容解析：content-extract.js（BookExtract）
 */
(function (global) {
  "use strict";

  const VIEWS = [
    { key: "overview", label: "概览" },
    { key: "import", label: "导入中心" },
    { key: "content", label: "关联内容" },
    { key: "chapters", label: "关键节点" },
    { key: "structure", label: "全书结构" },
    { key: "map", label: "阅读地图" },
    { key: "questions", label: "读后清单" },
  ];

  const VIEW_LINKS = {
    overview: { desc: "建立对本书的整体印象", label: "本书概览" },
    import: { desc: "为本书导入 PDF / 网页并解析", label: "导入中心" },
    content: { desc: "展示导入的真实内容", label: "关联内容" },
    chapters: { desc: "核心阅读要点", label: "关键节点" },
    structure: { desc: "章节与阅读路径", label: "全书结构" },
    map: { desc: "本书所有视图的总览", label: "阅读地图" },
    questions: { desc: "复盘与迁移", label: "读后问题清单" },
  };

  function currentBook() {
    if (typeof getAllBooks !== "function") return null;
    const id = new URLSearchParams(global.location.search).get("book");
    if (!id) return null;
    return getAllBooks()[id] || null;
  }

  function esc(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildHref(view) {
    const id = new URLSearchParams(global.location.search).get("book") || "";
    const base = global.location.pathname.split("/").pop() || "book.html";
    return `${base}?book=${encodeURIComponent(id)}&view=${view}`;
  }

  // ---- 顶部导航 ----
  function renderNav(activeView) {
    const root = document.querySelector("[data-reader-nav]");
    if (!root) return;
    root.innerHTML = "";
    VIEWS.forEach((view) => {
      const a = document.createElement("a");
      a.className = "nav-link" + (view.key === activeView ? " active" : "");
      a.href = buildHref(view.key);
      a.textContent = view.label;
      root.appendChild(a);
    });
  }

  // ---- 概览页 ----
  function renderOverview(book) {
    const meta = document.querySelector("[data-overview-meta]");
    if (meta) meta.textContent = `${book.title} · 动态生成的阅读页`;
  }

  // ---- 章节页（关键节点）----
  function renderChapters() {
    const root = document.querySelector("[data-chapter-grid]");
    if (!root) return;
    root.innerHTML = "";
    const defaults = [
      { title: "要点一", body: "在此填写本书的第一个核心观点或关键事件。" },
      { title: "要点二", body: "在此填写本书的第二个核心观点或关键事件。" },
      { title: "要点三", body: "在此填写本书的第三个核心观点或关键事件。" },
      { title: "本章小结", body: "在此总结本书的阅读收获与前后关联。" },
    ];
    defaults.forEach((d) => {
      const card = document.createElement("div");
      card.className = "card reveal";
      card.innerHTML = `<h3>${esc(d.title)}</h3><p>${esc(d.body)}</p>`;
      root.appendChild(card);
    });
  }

  // ---- 全书结构 ----
  function renderStructure(book) {
    const desc = document.querySelector("[data-structure-desc]");
    if (desc) {
      desc.textContent = `本书《${book.title}》为动态注册书籍，通过「概览、导入中心、关联内容、关键节点、全书结构、阅读地图、读后清单」等视图组织阅读。`;
    }
  }

  // ---- 阅读地图 ----
  function renderMap() {
    const root = document.querySelector("[data-view-links]");
    if (!root) return;
    root.innerHTML = "";
    VIEWS.forEach((view) => {
      const meta = VIEW_LINKS[view.key];
      const a = document.createElement("a");
      a.className = "nav-card reveal";
      a.href = buildHref(view.key);
      a.innerHTML =
        `<h3>${esc(meta ? meta.label : view.label)}</h3>` +
        `<span>${esc(meta ? meta.desc : "")}</span>`;
      root.appendChild(a);
    });
  }

  // ---- 底部翻页 ----
  function renderPager(activeView) {
    const root = document.querySelector("[data-reader-pager]");
    if (!root) return;
    const idx = VIEWS.findIndex((v) => v.key === activeView);
    const prev = idx > 0 ? VIEWS[idx - 1] : null;
    const next = idx < VIEWS.length - 1 ? VIEWS[idx + 1] : null;
    root.innerHTML =
      (prev ? `<a href="${buildHref(prev.key)}">← ${esc(prev.label)}</a>` : `<span></span>`) +
      (next ? `<a href="${buildHref(next.key)}">${esc(next.label)} →</a>` : `<a href="index.html">返回首页 →</a>`);
  }

  // ---- 真实内容渲染 ----
  function renderContent(book) {
    const c = book.content;
    document.querySelectorAll("[data-content-scope], [data-content-chart]").forEach((s) => {
      s.hidden = !c;
    });

    const excerpt = document.querySelector("[data-content-excerpt]");
    if (excerpt) excerpt.textContent = c ? c.excerpt || "（无摘录）" : "";

    const note = document.querySelector("[data-content-note]");
    if (note) {
      const parts = [];
      if (c && c.note) parts.push(c.note);
      if (c && c.quotaTrimmed) parts.push("存储空间有限，样本已截短");
      note.hidden = parts.length === 0;
      note.textContent = parts.length ? "备注：" + parts.join("；") : "";
    }

    const headingsRoot = document.querySelector("[data-content-headings]");
    const headingsEmpty = document.querySelector("[data-content-headings-empty]");
    const headingsCount = document.querySelector("[data-content-headings-count]");
    if (headingsRoot) {
      headingsRoot.innerHTML = "";
      (c ? c.headings : []).forEach((h) => {
        const li = document.createElement("li");
        li.textContent = h;
        headingsRoot.appendChild(li);
      });
      if (headingsEmpty) headingsEmpty.hidden = c && c.headings.length > 0;
      if (headingsCount) headingsCount.textContent = `检测到 ${c ? c.headings.length : 0} 个标题`;
    }

    const kwRoot = document.querySelector("[data-content-keywords]");
    if (kwRoot) {
      kwRoot.innerHTML = "";
      if (!c || !c.keywords || !c.keywords.length) {
        const p = document.createElement("p");
        p.className = "note";
        p.textContent = c ? "文本过短，未统计出高频关键词。" : "尚未导入内容。";
        kwRoot.appendChild(p);
      } else {
        c.keywords.forEach((k) => {
          const span = document.createElement("span");
          span.className = "kw-chip";
          span.innerHTML = esc(k.word) + "<b>×" + k.count + "</b>";
          span.dataset.tip = "出现 " + k.count + " 次";
          kwRoot.appendChild(span);
        });
      }
    }

    const stats = {
      words: { value: c ? c.wordCount : 0, suffix: "字" },
      pages: { value: c ? c.pages || (c.headings || []).length : 0, suffix: c && c.pages ? "页" : "章" },
      minutes: { value: c ? c.readingMinutes : 0, suffix: "分钟" },
    };
    document.querySelectorAll("[data-auto-stat]").forEach((el) => {
      const def = stats[el.dataset.autoStat];
      if (!def) return;
      el.textContent = Number(def.value || 0).toLocaleString() + (el.dataset.suffix || def.suffix || "");
    });

    const chartRoot = document.querySelector("[data-content-chart]");
    if (chartRoot) {
      if (c && c.chartBars) initContentChart(chartRoot, c.chartBars);
      else chartRoot.hidden = true;
    }

    const meta = document.querySelector("[data-content-meta]");
    if (meta) {
      meta.textContent = c
        ? `已导入：${Number(c.wordCount).toLocaleString()} 字、${c.headings.length} 章节、约 ${c.readingMinutes} 分钟`
        : "尚未导入内容";
    }
  }

  // ---- 柱状图（自管 tab，不依赖 app.js 的 tab 机制）----
  function initContentChart(root, chartBars) {
    const panel = (chartBars && chartBars.impact) || chartBars;
    if (!panel) return;
    const tabs = Array.from(root.querySelectorAll("[data-tab]"));
    if (!tabs.length) return;

    const setTab = (tab) => {
      const dataSet = panel[tab];
      if (!dataSet) return;
      tabs.forEach((btn) => {
        const on = btn.dataset.tab === tab;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
      const bars = root.querySelectorAll("[data-chart-bars] .bar-vertical span");
      const values = root.querySelectorAll("[data-chart-bars] [data-bar-value]");
      bars.forEach((bar, i) => {
        const v = dataSet.values[i] ?? 0;
        bar.style.height = v + "%";
        if (dataSet.colors && dataSet.colors[i]) bar.style.background = dataSet.colors[i];
        const capEl = bar.closest("div") && bar.closest("div").querySelector(".bar-caption");
        const capText = (dataSet.captions && dataSet.captions[i]) || (capEl ? capEl.textContent : "");
        bar.dataset.tip = capText + " · " + v;
        if (capEl) capEl.textContent = capText;
        if (values[i]) values[i].textContent = v;
      });
      const label = root.querySelector("[data-chart-label]");
      if (label) label.textContent = dataSet.label || "";
      const note = root.querySelector("[data-chart-note]");
      if (note) note.textContent = dataSet.note || "";
    };

    tabs.forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
    setTab(tabs[0].dataset.tab);
  }

  // ---- 导入中心 ----
  function bindImportForms(book) {
    const feedback = document.querySelector("[data-import-feedback]");
    const show = (msg, tone) => {
      if (!feedback) return;
      feedback.textContent = msg;
      feedback.dataset.tone = tone || "info";
    };

    const saveContent = (content, sourceLabel) => {
      const updated = Object.assign({}, book, {
        content,
        sourceLabel,
        sourceType: content.engine === "pdf" ? "pdf" : "url",
        updatedAt: new Date().toISOString(),
      });
      // 更新动态注册表（books.js）
      if (typeof global.registerBook === "function") global.registerBook(updated);
      // 同步更新当前对象，供后续渲染
      Object.keys(updated).forEach((k) => (book[k] = updated[k]));
      show(
        `导入成功：解析 ${Number(content.wordCount).toLocaleString()} 字、${content.headings.length} 个章节，预计阅读 ${content.readingMinutes} 分钟。`,
        "success"
      );
      renderImportStatus(book);
      // 跳到关联内容视图展示
      global.location.hash = "";
      activateView(book, "content");
    };

    const urlForm = document.querySelector("[data-url-import-form]");
    if (urlForm) {
      urlForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = urlForm.querySelector("[name='book_url']");
        const rawUrl = input && input.value.trim();
        if (!rawUrl) return show("请先输入书籍网址。", "error");
        let parsed;
        try {
          parsed = new URL(rawUrl);
          if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
        } catch (_) {
          return show("网址格式无效，请检查。", "error");
        }
        if (typeof BookExtract === "undefined") return show("解析引擎未加载。", "error");
        show("正在抓取页面正文…", "info");
        try {
          const content = await BookExtract.extractUrlContent(parsed.toString(), (stage) => {
            show(`正在抓取页面正文…（${stage === "直连" ? "直连" : "经代理"}）`, "info");
          });
          saveContent(content, parsed.toString());
        } catch (_) {
          show("网页抓取失败（跨域或网络限制），仅能保存书名与来源。", "error");
        }
        urlForm.reset();
      });
    }

    const pdfForm = document.querySelector("[data-pdf-import-form]");
    if (pdfForm) {
      pdfForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const file = pdfForm.querySelector("[name='book_pdf']").files[0];
        if (!file) return show("请先选择 PDF 文件。", "error");
        if (!/\.pdf$/i.test(file.name)) return show("仅支持 PDF 文件导入。", "error");
        if (typeof BookExtract === "undefined") return show("PDF 解析引擎未加载。", "error");
        show("正在解析 PDF…", "info");
        try {
          const content = await BookExtract.extractPdfFromFile(file, (page, total) => {
            show(`正在解析 PDF… 第 ${page}/${total} 页`, "info");
          });
          saveContent(content, `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`);
        } catch (e) {
          const code = e && e.code;
          if (code === "no-text") show("未检测到文字层（可能是扫描件），仅保存书名。", "error");
          else if (e && e.message === "pdfjs-not-loaded") show("PDF 解析引擎未加载。", "error");
          else show("PDF 解析失败（建议通过本地服务器打开后重试）。", "error");
        }
        pdfForm.reset();
      });
    }
  }

  function renderImportStatus(book) {
    const status = document.querySelector("[data-import-status]");
    const empty = document.querySelector("[data-import-empty]");
    const titleEl = document.querySelector("[data-import-book-title]");
    if (titleEl) titleEl.textContent = book.title;
    if (book.content) {
      const c = book.content;
      if (status) status.textContent = `已导入：${Number(c.wordCount).toLocaleString()} 字、${c.headings.length} 章节`;
      if (empty) empty.hidden = true;
    } else {
      if (status) status.textContent = "尚未导入内容";
      if (empty) empty.hidden = false;
    }
  }

  // ---- 书籍管理（重命名 / 删除）----
  function bindManageForms(book) {
    const badge = document.querySelector("[data-book-manage-badge]");
    const panel = document.querySelector("[data-book-manage-panel]");
    const manageTitle = document.querySelector("[data-manage-title]");
    const deleteTitle = document.querySelector("[data-delete-title]");
    const renameTitle = document.querySelector("[data-rename-title]");
    const renameSubtitle = document.querySelector("[data-rename-subtitle]");

    const setTitles = () => {
      if (manageTitle) manageTitle.textContent = book.title;
      if (deleteTitle) deleteTitle.textContent = book.title;
      if (renameTitle) renameTitle.value = book.title;
      if (renameSubtitle) renameSubtitle.value = book.subtitle && book.subtitle !== book.title ? book.subtitle : "";
    };
    setTitles();

    if (badge && panel) {
      badge.hidden = false;
      badge.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
      });
    }

    const renameForm = document.querySelector("[data-rename-form]");
    if (renameForm) {
      renameForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newTitle = renameTitle.value.trim();
        if (!newTitle) {
          alert("请输入新书名。");
          return;
        }
        const ok =
          typeof global.renameBook === "function"
            ? global.renameBook(book.id, newTitle, renameSubtitle.value.trim())
            : false;
        if (!ok) {
          alert("重命名失败，请稍后重试。");
          return;
        }
        book.title = newTitle;
        book.subtitle = renameSubtitle.value.trim() || newTitle;
        setTitles();
        // 刷新页面显示（标题、导航、badge 等随 currentBook 重新读取）
        global.location.reload();
      });
    }

    const deleteBtn = document.querySelector("[data-delete-book]");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (!confirm(`确定要删除《${book.title}》吗？此操作不可恢复。`)) return;
        if (typeof global.unregisterBook === "function") global.unregisterBook(book.id);
        // 同步删除「导入库」记录
        try {
          const libRaw = global.localStorage.getItem("book-template:library:v1");
          if (libRaw) {
            const lib = JSON.parse(libRaw);
            if (Array.isArray(lib)) {
              global.localStorage.setItem(
                "book-template:library:v1",
                JSON.stringify(lib.filter((b) => b.id !== book.id))
              );
            }
          }
        } catch (_) {
          /* ignore */
        }
        if (typeof global.dispatchEvent === "function") {
          global.dispatchEvent(new CustomEvent("books:changed"));
        }
        // 删除后回到首页
        global.location.href = "index.html";
      });
    }
  }

  // ---- 视图切换 ----
  function activateView(book, activeView) {
    const valid = VIEWS.some((v) => v.key === activeView) ? activeView : "overview";
    document.querySelectorAll("[data-view]").forEach((section) => {
      section.style.display = section.dataset.view === valid ? "" : "none";
    });
    document.querySelectorAll(`[data-view="${valid}"] .reveal`).forEach((el) => {
      if (!el.classList.contains("in-view")) el.classList.add("in-view");
    });

    renderNav(valid);
    renderPager(valid);
    if (valid === "overview") renderOverview(book);
    else if (valid === "chapters") renderChapters();
    else if (valid === "structure") renderStructure(book);
    else if (valid === "map") renderMap();
    else if (valid === "import") renderImportStatus(book);
    else if (valid === "content") renderContent(book);
  }

  // ---- 主入口 ----
  function init() {
    const root = document.querySelector("[data-book-reader]");
    if (!root) return;

    const book = currentBook();
    if (!book) {
      const title = document.querySelector("[data-book-title]");
      const summary = document.querySelector("[data-book-summary]");
      if (title) title.textContent = "未找到这本书";
      if (summary) {
        summary.textContent =
          "该书籍不存在或已被移除。请回到首页，通过「方式 C：输入书名」创建一本，或从书籍选择器选择其他书籍。";
      }
      const badge = document.querySelector("[data-book-badge-status]");
      if (badge) badge.textContent = "未找到书籍";
      return;
    }

    const titleEl = document.querySelector("[data-book-title]");
    const summary = document.querySelector("[data-book-summary]");
    if (titleEl) titleEl.textContent = `《${book.title}》`;
    if (summary) {
      summary.textContent = `「${book.title}」的动态阅读页面。可用顶部导航切换视图，或通过「导入中心」导入 PDF / 网页填充真实内容。`;
    }
    const badge = document.querySelector("[data-book-badge-status]");
    if (badge) badge.textContent = book.content ? "已关联内容" : book.dynamic ? "动态书籍" : "阅读书籍";
    const src = document.querySelector("[data-book-badge-source]");
    if (src) src.textContent = `来源：${book.subtitle || "本地创建"}`;

    bindImportForms(book);
    renderImportStatus(book);
    bindManageForms(book);

    const activeView = new URLSearchParams(global.location.search).get("view") || "overview";
    activateView(book, activeView);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  global.BookReader = { init, activateView };
})(typeof globalThis !== "undefined" ? globalThis : window);
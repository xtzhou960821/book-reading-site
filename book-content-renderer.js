/**
 * book-content-renderer.js — 把「导入库」中已解析的 PDF/网页内容渲染到书页上
 *
 * 页面约定（由 add-book.js 生成，也可手工添加到任意页面）：
 *   <main class="page" data-book-id="little-prince">     → 当前书 id（缺省用 books.js 的 getCurrentBookId）
 *   [data-content-block]                                  → 关联解析内容区块（存在才初始化）
 *   [data-content-picker] / [data-content-picker-empty]   → 选择器容器（仅需交互的页面放）
 *   [data-content-scope]                                  → 渲染结果容器（初始 hidden）
 *   [data-content-excerpt] [data-content-note]            → 摘录 / 备注
 *   [data-content-headings] [data-content-headings-empty] [data-content-headings-count] → 章节结构
 *   [data-content-keywords]                               → 高频关键词 chips
 *   [data-auto-stat="words|pages|minutes"]                → 统计位（字数/页数·章节/阅读分钟）
 *   [data-content-chart]                                  → 3-tab 柱状图（自管 tab，不与 app.js 冲突）
 *
 * 关联记忆：localStorage key `book-scope:linked-content:<bookId>` = 导入书 id，
 * 一次选择，该书的全部页面（含章节页）自动同步渲染。
 */
(function (global) {
  "use strict";

  const LIB_KEY = "book-template:library:v1";
  const LINK_PREFIX = "book-scope:linked-content:";

  // ---- 工具 ---------------------------------------------------------------
  function lsGet(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function lsSet(key, value) {
    try {
      global.localStorage.setItem(key, String(value));
    } catch (_) {
      /* ignore */
    }
  }

  function readLib() {
    try {
      const raw = lsGet(LIB_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function currentBookId() {
    const el = document.querySelector("[data-book-id]");
    if (el && el.dataset.bookId) return el.dataset.bookId;
    const path = (global.location.pathname || "").split("/").pop() || "";
    if (typeof global.getCurrentBookId === "function") {
      try {
        return global.getCurrentBookId(path) || "sapiens";
      } catch (_) {
        /* ignore */
      }
    }
    return "sapiens";
  }

  function esc(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString();
  }

  // ---- 柱状图（自管，不依赖 app.js 的 tab 机制）----------------------------
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

  // ---- 渲染 ---------------------------------------------------------------
  function renderContent(book) {
    const c = book && book.content;
    if (!c) return;

    document.querySelectorAll("[data-content-scope], [data-content-chart]").forEach((s) => {
      s.hidden = false;
    });

    const excerpt = document.querySelector("[data-content-excerpt]");
    if (excerpt) excerpt.textContent = c.excerpt || "（无摘录）";

    const note = document.querySelector("[data-content-note]");
    if (note) {
      const parts = [];
      if (c.note) parts.push(c.note);
      if (c.quotaTrimmed) parts.push("存储空间有限，样本已截短");
      note.hidden = parts.length === 0;
      note.textContent = parts.length ? "备注：" + parts.join("；") : "";
    }

    const headingsRoot = document.querySelector("[data-content-headings]");
    const headingsEmpty = document.querySelector("[data-content-headings-empty]");
    const headingsCount = document.querySelector("[data-content-headings-count]");
    if (headingsRoot) {
      headingsRoot.innerHTML = "";
      (c.headings || []).forEach((h) => {
        const li = document.createElement("li");
        li.textContent = h;
        headingsRoot.appendChild(li);
      });
      if (headingsEmpty) headingsEmpty.hidden = (c.headings || []).length > 0;
      if (headingsCount) headingsCount.textContent = `检测到 ${(c.headings || []).length} 个标题`;
    }

    const kwRoot = document.querySelector("[data-content-keywords]");
    if (kwRoot) {
      kwRoot.innerHTML = "";
      if (!(c.keywords || []).length) {
        const p = document.createElement("p");
        p.className = "note";
        p.textContent = "文本过短，未统计出高频关键词。";
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
      words: { value: c.wordCount, suffix: "字" },
      pages: { value: c.pages || (c.headings || []).length, suffix: c.pages ? "页" : "章" },
      minutes: { value: c.readingMinutes, suffix: "分钟" },
    };
    document.querySelectorAll("[data-auto-stat]").forEach((el) => {
      const def = stats[el.dataset.autoStat];
      if (!def) return;
      el.textContent = fmt(def.value) + (el.dataset.suffix || def.suffix || "");
    });

    const chartRoot = document.querySelector("[data-content-chart]");
    if (chartRoot && c.chartBars) initContentChart(chartRoot, c.chartBars);

    const meta = document.querySelector("[data-content-meta]");
    if (meta) meta.textContent = "已关联：" + book.title;
  }

  // ---- 选择器 -------------------------------------------------------------
  function renderPicker(books, linkedId, onSelect) {
    const root = document.querySelector("[data-content-picker]");
    const empty = document.querySelector("[data-content-picker-empty]");
    if (!root) return;

    if (!books.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    const makeChip = (text, selected, onClick) => {
      const span = document.createElement("span");
      span.className = "kw-chip" + (selected ? " is-selected" : "") + (onClick ? "" : " is-muted");
      span.setAttribute("role", "button");
      span.tabIndex = 0;
      span.textContent = text;
      if (onClick) {
        span.addEventListener("click", onClick);
        span.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        });
      }
      return span;
    };

    const chips = [];
    books.forEach((b) => {
      const select = () => onSelect(b);
      chips.push(makeChip(`${b.title}（${fmt(b.content.wordCount)} 字）`, b.id === linkedId, select));
    });
    if (linkedId) {
      chips.push(
        makeChip("清除关联", false, () => onSelect(null))
      );
    }
    root.innerHTML = "";
    chips.forEach((c) => root.appendChild(c));
  }

  // ---- 初始化 -------------------------------------------------------------
  function init() {
    const block = document.querySelector("[data-content-block]");
    if (!block) return;

    const bookId = currentBookId();
    const books = readLib().filter((b) => b && b.content && b.content.excerpt);
    const linkKey = LINK_PREFIX + bookId;
    let linked = lsGet(linkKey);

    const apply = (b) => {
      if (!b) {
        lsSet(linkKey, "");
        document.querySelectorAll("[data-content-scope], [data-content-chart]").forEach((s) => {
          s.hidden = true;
        });
        const meta = document.querySelector("[data-content-meta]");
        if (meta) meta.textContent = "尚未关联解析内容";
        const empty = document.querySelector("[data-content-empty]");
        if (empty) empty.hidden = false;
        renderPicker(books, null, onSelect);
        return;
      }
      lsSet(linkKey, b.id);
      linked = b.id;
      const empty = document.querySelector("[data-content-empty]");
      if (empty) empty.hidden = true;
      renderContent(b);
      renderPicker(books, linked, onSelect);
    };

    const onSelect = (b) => apply(b);
    renderPicker(books, linked, onSelect);

    if (linked) {
      const found = books.find((b) => b.id === linked);
      if (found) {
        apply(found);
      } else {
        apply(null);
      }
    } else if (books.length === 1) {
      // 仅一本已解析内容时自动关联，减少一步操作
      apply(books[0]);
    } else {
      const meta = document.querySelector("[data-content-meta]");
      if (meta) meta.textContent = "从上方选择已解析内容以填充本页";
      const empty = document.querySelector("[data-content-empty]");
      if (empty) empty.hidden = false;
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  global.BookContentLayer = { init, renderContent };
})(typeof globalThis !== "undefined" ? globalThis : window);
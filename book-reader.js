/**
 * book-reader.js — 动态书籍阅读器
 *
 * 为「方式 C：输入书名」在浏览器里创建的动态注册书籍提供完整的
 * 「概览 + 关键节点 + 全书结构 + 阅读地图 + 读后清单」多视图阅读页。
 *
 * 页面：book.html?book=<id>
 * 书籍来源：books.js 中的动态注册表（localStorage `book-template:registry:v1`）
 */
(function (global) {
  "use strict";

  const VIEWS = [
    { key: "overview", label: "概览" },
    { key: "chapters", label: "关键节点" },
    { key: "structure", label: "全书结构" },
    { key: "map", label: "阅读地图" },
    { key: "questions", label: "读后清单" },
  ];

  const VIEW_LINKS = {
    overview: {
      desc: "建立对本书的整体印象",
      view: "overview",
      label: "本书概览",
    },
    chapters: {
      desc: "核心阅读要点",
      view: "chapters",
      label: "关键节点",
    },
    structure: {
      desc: "章节与阅读路径",
      view: "structure",
      label: "全书结构",
    },
    map: {
      desc: "本书所有视图的总览",
      view: "map",
      label: "阅读地图",
    },
    questions: {
      desc: "复盘与迁移",
      view: "questions",
      label: "读后问题清单",
    },
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
  function renderChapters(book) {
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
      desc.textContent = `本书《${book.title}》为动态注册书籍，通过「概览、关键节点、全书结构、阅读地图、读后清单」五个视图组织阅读。`;
    }
  }

  // ---- 阅读地图 ----
  function renderMap(book) {
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
  function renderPager(activeView, book) {
    const root = document.querySelector("[data-reader-pager]");
    if (!root) return;
    const idx = VIEWS.findIndex((v) => v.key === activeView);
    const prev = idx > 0 ? VIEWS[idx - 1] : null;
    const next = idx < VIEWS.length - 1 ? VIEWS[idx + 1] : null;
    const id = new URLSearchParams(global.location.search).get("book") || "";
    root.innerHTML =
      (prev ? `<a href="${buildHref(prev.key)}">← ${esc(prev.label)}</a>` : `<span></span>`) +
      (next ? `<a href="${buildHref(next.key)}">${esc(next.label)} →</a>` : `<a href="index.html">返回首页 →</a>`);
  }

  // ---- 视图切换 ----
  function activateView(book, activeView) {
    const valid = VIEWS.some((v) => v.key === activeView) ? activeView : "overview";
    document.querySelectorAll("[data-view]").forEach((section) => {
      section.style.display = section.dataset.view === valid ? "" : "none";
    });
    // 已进入视野的元素触发一次 reveal 动画
    document.querySelectorAll(`[data-view="${valid}"] .reveal`).forEach((el) => {
      if (!el.classList.contains("in-view")) el.classList.add("in-view");
    });

    renderNav(valid);
    renderPager(valid, book);
    if (valid === "overview") renderOverview(book);
    else if (valid === "chapters") renderChapters(book);
    else if (valid === "structure") renderStructure(book);
    else if (valid === "map") renderMap(book);
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
      summary.textContent = `「${book.title}」的动态阅读页面。可用顶部导航切换视图，或通过左上角选择器切换书籍。`;
    }
    const badge = document.querySelector("[data-book-badge-status]");
    if (badge) badge.textContent = book.dynamic ? "动态书籍" : "阅读书籍";
    const src = document.querySelector("[data-book-badge-source]");
    if (src) src.textContent = `来源：${book.subtitle || "本地创建"}`;

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
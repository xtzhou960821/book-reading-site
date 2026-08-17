(function () {
  const STORAGE_KEY = "book-template:library:v1";
  const MAX_BOOKS = 60;

  const urlForm = document.querySelector("[data-url-import-form]");
  const pdfForm = document.querySelector("[data-pdf-import-form]");
  const titleForm = document.querySelector("[data-title-import-form]");
  const listRoot = document.querySelector("[data-library-list]");
  const countRoot = document.querySelector("[data-library-count]");
  const emptyRoot = document.querySelector("[data-library-empty]");
  const feedbackRoot = document.querySelector("[data-import-feedback]");

  if (!urlForm || !pdfForm || !titleForm || !listRoot) {
    return;
  }

  function readLibrary() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (_) {
      return [];
    }
  }

  function writeLibrary(list) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_BOOKS)));
      return true;
    } catch (_) {
      return false;
    }
  }

  function toTitleCaseFromSlug(text) {
    return text
      .replace(/[\-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function inferTitleFromUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      const segments = parsed.pathname.split("/").filter(Boolean);
      const tail = decodeURIComponent(segments[segments.length - 1] || "");
      if (tail) {
        return toTitleCaseFromSlug(tail);
      }
      return parsed.hostname.replace(/^www\./, "");
    } catch (_) {
      return "未命名书籍";
    }
  }

  function inferTitleFromPdfName(fileName) {
    return toTitleCaseFromSlug(fileName.replace(/\.pdf$/i, "")) || "未命名书籍";
  }

  function createId(title) {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 26);
    const stamp = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    return `${base || "book"}-${stamp}-${rand}`;
  }

  function showFeedback(message, tone) {
    if (!feedbackRoot) return;
    feedbackRoot.textContent = message;
    feedbackRoot.dataset.tone = tone || "info";
  }

  function addBook(item) {
    const list = readLibrary();
    const next = [item, ...list.filter((book) => book.id !== item.id)];
    if (!writeLibrary(next) && item.content) {
      // 配额不足：缩短存储样本后重试一次
      item.content.sample = (item.content.sample || "").slice(0, 2000);
      item.content.excerpt = (item.content.excerpt || "").slice(0, 300);
      item.content.quotaTrimmed = true;
      writeLibrary([item, ...list.filter((book) => book.id !== item.id)]);
    }
    renderLibrary();
  }

  function removeBook(id) {
    const list = readLibrary().filter((book) => book.id !== id);
    writeLibrary(list);
    if (typeof window.unregisterBook === "function") {
      window.unregisterBook(id);
    }
    if (typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("books:changed"));
    }
    renderLibrary();
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return "--";
    }
  }

  function contentMetaHtml(book) {
    const c = book.content;
    if (!c) return "";
    const parts = [`解析 ${Number(c.wordCount).toLocaleString()} 字`];
    if (c.pages) parts.push(`${c.pages} 页`);
    if (c.headings && c.headings.length) parts.push(`${c.headings.length} 个章节`);
    parts.push(`约 ${c.readingMinutes} 分钟`);
    const kw = (c.keywords || []).slice(0, 3).map((k) => k.word).join(" / ");
    return (
      `<p class="library-meta">已解析：${parts.join(" · ")}` +
      (kw ? ` ｜ 高频词：${escapeHtml(kw)}` : "") +
      (c.note ? ` ｜ 备注：${escapeHtml(c.note)}` : "") +
      "</p>"
    );
  }

  function sourceNameOf(type) {
    if (type === "url") return "网址";
    if (type === "pdf") return "PDF";
    if (type === "title") return "书名";
    return "导入";
  }

  function renderLibrary() {
    const books = readLibrary();
    listRoot.innerHTML = "";

    if (countRoot) {
      countRoot.textContent = `${books.length} 本`;
    }

    if (!books.length) {
      if (emptyRoot) emptyRoot.hidden = false;
      return;
    }

    if (emptyRoot) emptyRoot.hidden = true;

    books.forEach((book) => {
      const card = document.createElement("article");
      card.className = "library-card";
      card.innerHTML =
        `<h3>${escapeHtml(book.title)}</h3>` +
        `<p class="library-meta">来源：${sourceNameOf(book.sourceType)} · 导入于 ${formatDate(
          book.createdAt
        )}</p>` +
        contentMetaHtml(book) +
        `<p class="library-sub">${escapeHtml(book.sourceLabel || "")}</p>` +
        '<div class="library-actions">' +
        `<a class="primary-btn" href="${escapeHtml(book.indexUrl || `book-template.html?book=${encodeURIComponent(book.id)}`)}">打开模板页</a>` +
        `<button type="button" class="ghost-btn danger" data-remove-book="${book.id}">删除</button>` +
        "</div>";
      listRoot.appendChild(card);
    });
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  urlForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const urlInput = urlForm.querySelector("[name='book_url']");
    const titleInput = urlForm.querySelector("[name='book_url_title']");
    const rawUrl = urlInput?.value?.trim();
    const customTitle = titleInput?.value?.trim();

    if (!rawUrl) {
      showFeedback("请先输入书籍网址。", "error");
      return;
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        showFeedback("请输入 http(s) 网址。", "error");
        return;
      }
    } catch (_) {
      showFeedback("网址格式无效，请检查。", "error");
      return;
    }

    const title = customTitle || inferTitleFromUrl(parsed.toString());
    const book = {
      id: createId(title),
      title,
      sourceType: "url",
      sourceLabel: parsed.toString(),
      createdAt: new Date().toISOString(),
    };

    let content = null;
    if (typeof BookExtract !== "undefined") {
      showFeedback("正在抓取页面正文…", "info");
      try {
        content = await BookExtract.extractUrlContent(parsed.toString(), (stage) => {
          showFeedback(`正在抓取页面正文…（${stage === "直连" ? "直连" : "经代理"}）`, "info");
        });
      } catch (_) {
        showFeedback("网页抓取失败（跨域或网络限制），仅保存书名与来源。", "error");
      }
    }

    book.content = content;
    addBook(book);
    if (content) {
      showFeedback(
        `导入成功：抓取 ${Number(content.wordCount).toLocaleString()} 字、${content.headings.length} 个章节，预计阅读 ${content.readingMinutes} 分钟。`,
        "success"
      );
    }
    urlForm.reset();
  });

  titleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const titleInput = titleForm.querySelector("[name='book_title']");
    const subtitleInput = titleForm.querySelector("[name='book_subtitle']");
    const rawTitle = titleInput?.value?.trim();

    if (!rawTitle) {
      showFeedback("请先输入书名。", "error");
      return;
    }

    const id = createId(rawTitle);
    const subtitle = subtitleInput?.value?.trim() || "新建阅读模板";
    const indexUrl = `book.html?book=${encodeURIComponent(id)}`;
    const label = rawTitle;

    // 方式 C：生成「注册型」书籍 —— 写入动态书籍库，成为一等公民。
    // 它会：
    //   - 立即出现在左上角书籍切换器（getAllBooks() 读取）
    //   - 拥有自己的动态「概览 + 章节」阅读页（book.html?book=<id>）
    //   - 刷新 / 切换书籍后依然保留（books.js 启动时从 localStorage 并入 BOOKS）
    const registered = {
      id,
      title: rawTitle,
      subtitle,
      indexUrl,
      dynamic: true,
      pages: [
        { label: "概览", href: indexUrl },
        { label: "关键节点", href: `${indexUrl}&view=chapters` },
        { label: "全书结构", href: `${indexUrl}&view=structure` },
        { label: "阅读地图", href: `${indexUrl}&view=map` },
        { label: "读后清单", href: `${indexUrl}&view=questions` },
      ],
    };

    if (typeof window.registerBook === "function") {
      window.registerBook(registered);
    }

    // 同时保留一份到「导入库」（含来源与创建时间，用于库列表展示）
    const book = {
      id,
      title: rawTitle,
      subtitle,
      sourceType: "title",
      sourceLabel: subtitleInput?.value?.trim() || "手动创建模板",
      createdAt: new Date().toISOString(),
      registered: true,
      indexUrl,
    };

    addBook(book);

    // 通知书籍切换器刷新（若当前页面已挂载）
    if (typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("books:changed"));
    }

    showFeedback(
      `已生成《${rawTitle}》整套模板：已加入左上角书籍选择器，可打开「${label}」阅读页。`,
      "success"
    );
    titleForm.reset();
  });

  pdfForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fileInput = pdfForm.querySelector("[name='book_pdf']");
    const titleInput = pdfForm.querySelector("[name='book_pdf_title']");
    const file = fileInput?.files?.[0];
    const customTitle = titleInput?.value?.trim();

    if (!file) {
      showFeedback("请先选择 PDF 文件。", "error");
      return;
    }

    if (!/\.pdf$/i.test(file.name)) {
      showFeedback("仅支持 PDF 文件导入。", "error");
      return;
    }

    const title = customTitle || inferTitleFromPdfName(file.name);
    const book = {
      id: createId(title),
      title,
      sourceType: "pdf",
      sourceLabel: `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`,
      createdAt: new Date().toISOString(),
    };

    let content = null;
    if (typeof BookExtract !== "undefined") {
      showFeedback("正在解析 PDF…", "info");
      try {
        content = await BookExtract.extractPdfFromFile(file, (page, total) => {
          showFeedback(`正在解析 PDF… 第 ${page}/${total} 页`, "info");
        });
      } catch (e) {
        const code = e && e.code;
        if (code === "no-text") {
          showFeedback("未检测到文字层（可能是扫描件），仅保存书名与来源。", "error");
        } else if (e && e.message === "pdfjs-not-loaded") {
          showFeedback("PDF 解析引擎未加载，仅保存书名。", "error");
        } else {
          showFeedback("PDF 解析失败，仅保存书名（建议通过本地服务器打开本网站后重试）。", "error");
        }
      }
    }

    book.content = content;
    addBook(book);
    if (content) {
      showFeedback(
        `导入成功：解析 ${Number(content.wordCount).toLocaleString()} 字、${content.pages} 页，预计阅读 ${content.readingMinutes} 分钟。`,
        "success"
      );
    }
    pdfForm.reset();
  });

  listRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-book]");
    if (!button) return;
    const id = button.dataset.removeBook;
    if (!id) return;
    removeBook(id);
    showFeedback("已删除该书籍入口。", "info");
  });

  renderLibrary();
})();

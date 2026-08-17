(function () {
  const STORAGE_KEY = "book-template:library:v1";
  const MAX_BOOKS = 60;

  const urlForm = document.querySelector("[data-url-import-form]");
  const pdfForm = document.querySelector("[data-pdf-import-form]");
  const listRoot = document.querySelector("[data-library-list]");
  const countRoot = document.querySelector("[data-library-count]");
  const emptyRoot = document.querySelector("[data-library-empty]");
  const feedbackRoot = document.querySelector("[data-import-feedback]");

  if (!urlForm || !pdfForm || !listRoot) {
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
    } catch (_) {
      // Ignore quota or restricted storage failures.
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
    writeLibrary(next);
    renderLibrary();
  }

  function removeBook(id) {
    const list = readLibrary().filter((book) => book.id !== id);
    writeLibrary(list);
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
        `<p class="library-meta">来源：${book.sourceType === "url" ? "网址" : "PDF"} · 导入于 ${formatDate(
          book.createdAt
        )}</p>` +
        `<p class="library-sub">${escapeHtml(book.sourceLabel || "")}</p>` +
        '<div class="library-actions">' +
        `<a class="primary-btn" href="book-template.html?book=${encodeURIComponent(book.id)}">打开模板页</a>` +
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

  urlForm.addEventListener("submit", (event) => {
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

    addBook(book);
    showFeedback("已从网址创建模板书籍，可在下方列表打开。", "success");
    urlForm.reset();
  });

  pdfForm.addEventListener("submit", (event) => {
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

    addBook(book);
    showFeedback("已从 PDF 创建模板书籍，可在下方列表打开。", "success");
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

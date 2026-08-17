(function () {
  const STORAGE_KEY = "book-template:library:v1";

  function readLibrary() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function readBook() {
    const id = new URLSearchParams(window.location.search).get("book");
    const books = readLibrary();
    if (!id) return books[0] || null;
    return books.find((book) => book.id === id) || null;
  }

  function hashString(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return hash >>> 0;
  }

  function createRng(seedValue) {
    let seed = seedValue >>> 0;
    return function next() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function randomInRange(rng, min, max) {
    return Math.round(min + rng() * (max - min));
  }

  function text(el, value) {
    if (el) el.textContent = value;
  }

  function fillStats(book, rng) {
    const scoreA = randomInRange(rng, 68, 96);
    const scoreB = randomInRange(rng, 55, 88);
    const scoreC = randomInRange(rng, 42, 82);

    const defs = [
      { value: scoreA, suffix: "分", label: "主题覆盖强度" },
      { value: scoreB, suffix: "分", label: "论证深度" },
      { value: scoreC, suffix: "%", label: "争议张力" },
    ];

    defs.forEach((def, index) => {
      const num = document.querySelector(`[data-stat-value='${index}']`);
      const label = document.querySelector(`[data-stat-label='${index}']`);
      if (num) {
        num.dataset.count = String(def.value);
        num.dataset.suffix = def.suffix;
        num.textContent = "0";
      }
      text(label, def.label);
    });
  }

  function fillTimeline(book) {
    const stages = [
      {
        title: "问题提出",
        body: `《${book.title}》试图回答“这个主题为何重要”。`,
      },
      {
        title: "论证展开",
        body: "通过案例、概念和结构化推理建立主干论点。",
      },
      {
        title: "现实映射",
        body: "把书中观点映射到当下问题与行动策略。",
      },
    ];

    stages.forEach((stage, index) => {
      text(document.querySelector(`[data-stage-title='${index}']`), stage.title);
      text(document.querySelector(`[data-stage-body='${index}']`), stage.body);
    });
  }

  function fillPoints(book) {
    const points = [
      {
        title: "核心命题",
        body: `围绕《${book.title}》的中心问题，提炼一句可验证的主张。`,
      },
      {
        title: "关键证据",
        body: "识别最能支撑作者观点的案例与数据来源。",
      },
      {
        title: "反方视角",
        body: "对照不同学派观点，评估论证边界与盲区。",
      },
      {
        title: "实践建议",
        body: "将抽象观点转化为可执行清单与优先级。",
      },
    ];

    points.forEach((point, index) => {
      text(document.querySelector(`[data-point-title='${index}']`), point.title);
      text(document.querySelector(`[data-point-body='${index}']`), point.body);
    });
  }

  function fillQuestions(book) {
    const questions = [
      {
        title: "这本书最强的解释力在哪里？",
        body: "定位哪些章节最能解释现实问题，并记录理由。",
      },
      {
        title: "有哪些假设需要二次验证？",
        body: "列出作者默认前提，再找外部资料交叉核验。",
      },
      {
        title: "哪些观点对你有可执行价值？",
        body: "筛选可转化为行动的观点，形成 7 天实验计划。",
      },
      {
        title: "哪些内容仍有争议？",
        body: "保留分歧点，作为下一本书的延伸阅读入口。",
      },
    ];

    questions.forEach((question, index) => {
      text(document.querySelector(`[data-question-title='${index}']`), question.title);
      text(document.querySelector(`[data-question-body='${index}']`), question.body);
    });
  }

  function buildChartData(book, rng) {
    const valuesA = [
      randomInRange(rng, 40, 60),
      randomInRange(rng, 55, 78),
      randomInRange(rng, 68, 90),
      randomInRange(rng, 75, 96),
    ];
    const valuesB = [
      randomInRange(rng, 35, 55),
      randomInRange(rng, 45, 65),
      randomInRange(rng, 56, 78),
      randomInRange(rng, 62, 84),
    ];
    const valuesC = [
      randomInRange(rng, 28, 45),
      randomInRange(rng, 36, 56),
      randomInRange(rng, 52, 74),
      randomInRange(rng, 60, 88),
    ];

    window.bookChartData = {
      impact: {
        population: {
          label: "结构清晰度指数（0-100）",
          note: "示意：章节组织与主线清晰度。",
          values: valuesA,
          colors: ["#7ad3ff", "#b4ffb2", "#ffd087", "#ff8ec7"],
        },
        wellbeing: {
          label: "论证严谨度指数（0-100）",
          note: "示意：证据链完整度与逻辑一致性。",
          values: valuesB,
          colors: ["#7ad3ff", "#ffd087", "#b4ffb2", "#a6a8ff"],
        },
        ecology: {
          label: "现实关联度指数（0-100）",
          note: "示意：观点映射现实问题的能力。",
          values: valuesC,
          colors: ["#b4ffb2", "#ffd087", "#ff8ec7", "#7ad3ff"],
        },
      },
    };

    window.bookLineChartData = {
      "book-trends": {
        labels: ["起点", "展开", "深化", "整合", "延伸"],
        series: {
          theory: {
            name: "理论密度",
            color: "#7ad3ff",
            values: [
              randomInRange(rng, 28, 42),
              randomInRange(rng, 40, 58),
              randomInRange(rng, 54, 76),
              randomInRange(rng, 66, 88),
              randomInRange(rng, 74, 96),
            ],
          },
          method: {
            name: "方法可用性",
            color: "#b4ffb2",
            values: [
              randomInRange(rng, 22, 36),
              randomInRange(rng, 34, 50),
              randomInRange(rng, 48, 66),
              randomInRange(rng, 58, 80),
              randomInRange(rng, 66, 86),
            ],
          },
          practice: {
            name: "实践转化",
            color: "#ffd087",
            values: [
              randomInRange(rng, 16, 28),
              randomInRange(rng, 24, 40),
              randomInRange(rng, 34, 52),
              randomInRange(rng, 46, 66),
              randomInRange(rng, 52, 74),
            ],
          },
        },
      },
    };
  }

  function fillRealContent(book) {
    const c = book.content;
    const esc = (t) =>
      String(t)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const sourceName = book.sourceType === "url" ? "网址" : "PDF";

    document.title = `${book.title} · 内容解析`;
    text(document.querySelector("[data-book-title]"), `《${book.title}》· 内容解析`);
    text(
      document.querySelector("[data-book-summary]"),
      `已从${sourceName}解析真实内容：约 ${Number(c.wordCount).toLocaleString()} 字、${c.sentenceCount} 句，` +
        `${c.pages ? `共 ${c.pages} 页，` : ""}检测到 ${c.headings.length} 个章节标题，预计阅读 ${c.readingMinutes} 分钟。`
    );
    text(document.querySelector("[data-book-source]"), `来源：${sourceName}`);
    text(document.querySelector("[data-book-source-label]"), book.sourceLabel || "-");
    text(
      document.querySelector("[data-mode-badge]"),
      c.engine === "pdf" ? "PDF 文字层解析" : "网页正文抓取"
    );

    // 关键指标：真实统计值
    const statDefs = [
      { value: c.wordCount, suffix: "字", label: "总字数（中文字 + 英文词）" },
      { value: c.pages || c.headings.length, suffix: c.pages ? "页" : "章", label: c.pages ? "文档页数" : "章节标题数" },
      { value: c.readingMinutes, suffix: "分钟", label: "预计阅读时长" },
    ];
    statDefs.forEach((def, index) => {
      const num = document.querySelector(`[data-stat-value='${index}']`);
      const label = document.querySelector(`[data-stat-label='${index}']`);
      if (num) {
        num.dataset.count = String(def.value);
        num.dataset.suffix = def.suffix;
        num.textContent = "0";
      }
      text(label, def.label);
    });
    text(document.querySelector("[data-stats-mode-note]"), "解析自导入原文，非示意值");

    // 阅读主线：原文开篇 / 中段 / 收尾
    const s = c.sample || "";
    const third = Math.floor(s.length / 3);
    const slice = (from, len) =>
      (s.slice(from, from + len) || "（样本过短）").replace(/\s+/g, " ");
    text(document.querySelector("[data-stage-title='0']"), "开篇");
    text(document.querySelector("[data-stage-body='0']"), slice(0, 90));
    text(document.querySelector("[data-stage-title='1']"), "中段");
    text(document.querySelector("[data-stage-body='1']"), slice(third, 90));
    text(document.querySelector("[data-stage-title='2']"), "收尾");
    text(document.querySelector("[data-stage-body='2']"), slice(Math.max(0, s.length - 90), 90));

    // 核心观点卡片：基于词频统计
    const kwWords = c.keywords.map((k) => k.word);
    text(document.querySelector("[data-point-title='0']"), "核心命题");
    text(
      document.querySelector("[data-point-body='0']"),
      kwWords.length
        ? `全文高频概念集中在：${kwWords.slice(0, 6).join("、")}。`
        : "全文较短，未形成显著高频概念。"
    );
    text(document.querySelector("[data-point-title='1']"), "关键证据");
    text(
      document.querySelector("[data-point-body='1']"),
      `样本统计：${c.sentenceCount} 句、平均句长 ${c.avgSentenceLen} 字，用于支撑以上概念分布。`
    );
    text(document.querySelector("[data-point-title='2']"), "反方视角");
    text(
      document.querySelector("[data-point-body='2']"),
      "词频统计只反映文本表层结构，需通读原文以识别作者未展开的反面论证。"
    );
    text(document.querySelector("[data-point-title='3']"), "实践建议");
    text(
      document.querySelector("[data-point-body='3']"),
      `预计阅读 ${c.readingMinutes} 分钟。建议先读「${c.headings[0] || "开篇"}」建立框架，再按章节结构精读。`
    );

    // 章节结构
    const headingsRoot = document.querySelector("[data-headings-root]");
    const headingsEmpty = document.querySelector("[data-headings-empty]");
    const headingsCount = document.querySelector("[data-headings-count]");
    if (c.headings.length) {
      headingsRoot.innerHTML = "";
      c.headings.forEach((h) => {
        const li = document.createElement("li");
        li.textContent = h;
        headingsRoot.appendChild(li);
      });
      if (headingsEmpty) headingsEmpty.hidden = true;
      if (headingsCount) headingsCount.textContent = `检测到 ${c.headings.length} 个标题`;
    } else {
      if (headingsRoot) headingsRoot.innerHTML = "";
      if (headingsEmpty) headingsEmpty.hidden = false;
      if (headingsCount) headingsCount.textContent = "未检测到章节标题";
    }

    // 高频关键词
    const kwRoot = document.querySelector("[data-keywords-root]");
    if (kwRoot) {
      kwRoot.innerHTML = "";
      if (!c.keywords.length) {
        const p = document.createElement("p");
        p.className = "note";
        p.textContent = "文本过短，未统计出高频关键词。";
        kwRoot.appendChild(p);
      } else {
        c.keywords.forEach((k) => {
          const span = document.createElement("span");
          span.className = "kw-chip";
          span.innerHTML = `${esc(k.word)}<b>×${k.count}</b>`;
          span.dataset.tip = `出现 ${k.count} 次`;
          kwRoot.appendChild(span);
        });
      }
    }

    // 原文摘录
    text(document.querySelector("[data-excerpt]"), c.excerpt || "（无摘录）");
    const noteEl = document.querySelector("[data-content-note]");
    const noteParts = [];
    if (c.note) noteParts.push(c.note);
    if (c.quotaTrimmed) noteParts.push("存储空间有限，样本已截短");
    if (noteEl) {
      if (noteParts.length) {
        noteEl.hidden = false;
        noteEl.textContent = "备注：" + noteParts.join("；");
      } else {
        noteEl.hidden = true;
      }
    }

    // 展示真实内容区块
    document.querySelectorAll("[data-real-section]").forEach((section) => {
      section.hidden = false;
    });

    // 图表数据
    window.bookChartData = c.chartBars;
    window.bookLineChartData = c.chart;

    // 柱状图 tab 文案
    const tabGroup = document.querySelector("[data-tab-group='impact']");
    if (tabGroup) {
      const tabLabels = { population: "结构词汇", wellbeing: "句法节奏", ecology: "文本特征" };
      tabGroup.querySelectorAll("[data-tab]").forEach((btn) => {
        const label = tabLabels[btn.dataset.tab];
        if (label) btn.textContent = label;
      });
    }

    // 折线图图例文案
    const lineSeries = c.chart["book-trends"].series;
    document.querySelectorAll("[data-line-chart-key] [data-series]").forEach((btn) => {
      const meta = lineSeries[btn.dataset.series];
      if (!meta) return;
      const icon = btn.querySelector("i");
      if (icon && icon.nextSibling) icon.nextSibling.nodeValue = " " + meta.name;
    });
    const lineNote = document.querySelector("[data-line-chart-key] .note");
    if (lineNote) {
      lineNote.textContent = "展示导入原文在五个阅读阶段的真实指标变化（可点击图例显隐）。";
    }
  }

  function fillBook(book) {
    if (book.content) {
      fillRealContent(book);
      return;
    }
    document.title = `${book.title} · 通用导读模板`;
    text(document.querySelector("[data-book-title]"), `《${book.title}》· 通用导读模板`);
    text(
      document.querySelector("[data-book-summary]"),
      `该页面基于你导入的${book.sourceType === "url" ? "网址" : "PDF"}生成，沿用现有图表与结构化阅读模板，帮助你快速建立“主线-论证-争议-行动”四层理解。`
    );
    text(
      document.querySelector("[data-book-source]"),
      `来源：${book.sourceType === "url" ? "网址" : "PDF"}`
    );
    text(document.querySelector("[data-book-source-label]"), book.sourceLabel || "-");

    const seed = hashString(book.title + (book.sourceLabel || ""));
    const rng = createRng(seed);

    fillStats(book, rng);
    fillTimeline(book);
    fillPoints(book);
    fillQuestions(book);
    buildChartData(book, rng);
  }

  function showMissingState() {
    document.title = "通用导读模板";
    text(document.querySelector("[data-book-title]"), "未找到书籍数据");
    text(
      document.querySelector("[data-book-summary]"),
      "请先回到首页导入一本书（网址或 PDF），再打开模板页。"
    );
    text(document.querySelector("[data-book-source]"), "来源：无");
    text(document.querySelector("[data-book-source-label]"), "- ");
  }

  const book = readBook();
  if (!book) {
    showMissingState();
    return;
  }

  fillBook(book);
})();

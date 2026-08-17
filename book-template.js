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

  function fillBook(book) {
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

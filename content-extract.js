/**
 * content-extract.js — 导入中心文本提取与分析
 *
 * 对外暴露 window.BookExtract：
 *  - extractPdfFromFile(file, onProgress)  -> content 对象（失败时抛出异常）
 *  - extractUrlContent(url, onProgress)    -> content 对象（失败时抛出异常）
 *  - escapeHtml(text)
 *
 * content 对象（存储于 book.content）：
 * {
 *   engine: 'pdf' | 'url',
 *   pages: number | null,
 *   charCount, wordCount, sentenceCount, avgSentenceLen, readingMinutes,
 *   headings: string[],
 *   keywords: [{ word, count }],
 *   excerpt: string,
 *   sample: string,
 *   chartBars: { population, wellbeing, ecology }, // 3 个 tab × 4 根柱
 *   chart: { 'book-trends': { labels, series } },  // 折线图
 *   note: string | null
 * }
 */
(function (global) {
  "use strict";

  const CJK_CHAR_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
  const CJK_RUN_SRC = "[\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff]";
  const LATIN_WORD_SRC = "[A-Za-z][A-Za-z'’\\-]{1,}";

  // ---- 停用词 --------------------------------------------------------------
  const EN_STOPS = new Set((
    "a about after again against all also an and any are as at be because been before being " +
    "below between both but by can cannot could did do does doing done down during each even " +
    "few for from further had has have having he her here hers herself him himself his how i if " +
    "in into is it its itself just like made make many may me might more most much must my myself " +
    "no nor not now of off on once one only or other our ours ourselves out over own per s she " +
    "should so some still such than that the their theirs them themselves then there these they " +
    "this those through thus to too under until up upon us very was we were what when where which " +
    "while who whom why will with within without would you your yours yourself yourselves its " +
    "don ll re ve t m im ain d o y " +
    "the about page chapter book article author however therefore moreover furthermore " +
    "because instead although though despite unless moreover therefore"
  ).split(/\s+/));

  const CJK_CHAR_STOPS = new Set((
    "的了是在和或与其这那就都而把被让向从对为以于并也很更最要会能可应该怎哪吗呢吧啊呀哦嗯与等之乎者也因由及" +
    "的了吗呢吧啊呀哦嗯是在和或与其这那就都而把被让向从对为以于并也还更最要会能可应该怎哪呢与等之乎者也因由及"
  ).split(""));

  const CJK_TRI_STOP_CHARS = new Set(
    "的了吗呢吧啊呀哦嗯是在和或与其这那就都而把被让向从对为以于并也还更最要会能可应该怎哪呢与等之乎者也因由及但".split("")
  );

  const CJK_BIGRAM_STOPS = new Set((
    "我们 你们 他们 她们 它们 这个 那个 这些 那些 一个 一种 一些 自己 因为 所以 但是 而且 或者 如果 虽然 然而 " +
    "就是 还是 没有 不是 可以 什么 怎么 这样 那样 现在 然后 时候 东西 知道 觉得 认为 应该 需要 可能 已经 只是 " +
    "以及 对于 关于 通过 根据 由于 尽管 因此 于是 往往 逐渐 不断 始终 仍然 依然 即使 哪怕 只要 只有 无论 不管 " +
    "除了 例如 比如 首先 其次 最后 同时 另外 此外 从而 进而 甚至 尤其 特别 主要 重要 基本 一般 一定 非常 " +
    "比较 相当 更加 其他 其它 所有 任何 每一 每个 大家 之后 之前 之中 之间 之内 方面 问题 部分 内容 程度 " +
    "影响 作用 存在 发展 变化 关系 情况 时候 时代 社会 人类 世界 人们 这种 这样 这些 那些 那个 这个 其中 其它"
  ).split(/\s+/).filter(Boolean));

  // ---- 文本分析 ------------------------------------------------------------
  function tokenize(text) {
    const tokens = [];
    const re = new RegExp(CJK_RUN_SRC + "+|" + LATIN_WORD_SRC, "g");
    let m;
    while ((m = re.exec(text)) !== null) {
      if (CJK_CHAR_RE.test(m[0])) {
        for (const ch of m[0]) tokens.push(ch);
      } else {
        tokens.push(m[0].toLowerCase());
      }
    }
    return tokens;
  }

  function countOccurrences(haystack, needle) {
    if (!needle || !haystack) return 0;
    if (CJK_CHAR_RE.test(needle)) {
      let n = 0;
      let idx = haystack.indexOf(needle);
      while (idx !== -1) {
        n += 1;
        idx = haystack.indexOf(needle, idx + needle.length);
      }
      return n;
    }
    let n = 0;
    const re = new RegExp("\\b" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
    let m;
    while ((m = re.exec(haystack)) !== null) {
      n += 1;
      if (m.index + m[0].length === re.lastIndex) re.lastIndex += 1;
    }
    return n;
  }

  function extractKeywords(text, topN) {
    const freq = new Map();
    let run;
    const runRe = new RegExp(CJK_RUN_SRC + "{2,}", "g");
    while ((run = runRe.exec(text)) !== null) {
      const s = run[0];
      for (let i = 0; i + 2 <= s.length; i += 1) {
        const g2 = s.slice(i, i + 2);
        if (CJK_BIGRAM_STOPS.has(g2)) continue;
        if (CJK_CHAR_STOPS.has(g2[0]) && CJK_CHAR_STOPS.has(g2[1])) continue;
        freq.set(g2, (freq.get(g2) || 0) + 1);
      }
      for (let i = 0; i + 3 <= s.length; i += 1) {
        const g3 = s.slice(i, i + 3);
        if ([...g3].some((ch) => CJK_TRI_STOP_CHARS.has(ch))) continue;
        freq.set(g3, (freq.get(g3) || 0) + 1);
      }
    }
    let wm;
    const wordRe = new RegExp(LATIN_WORD_SRC, "gi");
    while ((wm = wordRe.exec(text)) !== null) {
      const w = wm[0].toLowerCase();
      if (EN_STOPS.has(w) || w.length < 3) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
    const minCount = Math.max(2, Math.round(freq.size * 0.01));
    return [...freq.entries()]
      .filter(([, c]) => c >= minCount)
      .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
      .slice(0, topN)
      .map(([word, count]) => ({ word, count }));
  }

  function std(arr) {
    if (!arr.length) return 0;
    const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
    const v = arr.reduce((s, x) => s + (x - mean) * (x - mean), 0) / arr.length;
    return Math.sqrt(v);
  }

  function analyzeText(text) {
    const charCount = text.replace(/\s/g, "").length;
    const tokens = tokenize(text);
    const totalTokens = tokens.length;
    const uniqueTokens = new Set(tokens).size;
    const cjkChars = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
    const digitCount = (text.match(/\d/g) || []).length;

    // 句子统计（按标点/换行切分）
    const sentenceLens = [];
    const reSent = /[。！？!?；;\n]+/g;
    let last = 0;
    let m;
    while ((m = reSent.exec(text)) !== null) {
      const seg = text.slice(last, m.index);
      last = reSent.lastIndex;
      const clean = seg.replace(/[，、,.\s：:；“”"''!？?]/g, "");
      if (clean.length >= 4) sentenceLens.push(seg.length);
    }
    const segTail = text.slice(last);
    if (segTail.replace(/[，、,.\s：:；“”"''!？?]/g, "").length >= 4) {
      sentenceLens.push(segTail.length);
    }
    const sentenceCount = sentenceLens.length;
    const avgSentenceLen = sentenceCount
      ? sentenceLens.reduce((s, x) => s + x, 0) / sentenceCount
      : 0;

    // 五段划分指标
    const L = Math.max(1, text.length);
    const sentLenPart = [0, 0, 0, 0, 0];
    const sentCntPart = [0, 0, 0, 0, 0];
    const novelty = [0, 0, 0, 0, 0];
    const noveltyTotal = [0, 0, 0, 0, 0];
    const seen = new Set();

    // 句子按位置归属段落
    reSent.lastIndex = 0;
    last = 0;
    const lensByPart = [[], [], [], [], []];
    while ((m = reSent.exec(text)) !== null) {
      const seg = text.slice(last, m.index);
      last = reSent.lastIndex;
      const clean = seg.replace(/[，、,.\s：:；“”"''!？?]/g, "");
      if (clean.length >= 4) {
        const pos = last - seg.length / 2;
        const part = Math.min(4, Math.floor((pos / L) * 5));
        sentLenPart[part] += seg.length;
        sentCntPart[part] += 1;
        lensByPart[part].push(seg.length);
      }
    }
    const tailClean = segTail.replace(/[，、,.\s：:；“”"''!？?]/g, "");
    if (tailClean.length >= 4) {
      const pos = L - tailClean.length / 2;
      const part = Math.min(4, Math.floor((pos / L) * 5));
      sentLenPart[part] += segTail.length;
      sentCntPart[part] += 1;
      lensByPart[part].push(segTail.length);
    }

    // 词条新鲜度（按 token 位置）
    const tokRe = new RegExp(CJK_RUN_SRC + "+|" + LATIN_WORD_SRC, "g");
    let tm;
    while ((tm = tokRe.exec(text)) !== null) {
      const tok = CJK_CHAR_RE.test(tm[0])
        ? tm[0][0]
        : tm[0].toLowerCase();
      const part = Math.min(4, Math.floor((tm.index / L) * 5));
      noveltyTotal[part] += 1;
      if (!seen.has(tok)) {
        seen.add(tok);
        novelty[part] += 1;
      }
    }
    for (let i = 0; i < 5; i += 1) {
      novelty[i] = noveltyTotal[i] ? (novelty[i] / noveltyTotal[i]) * 100 : 0;
    }
    const sentMeanByPart = lensByPart.map((arr, i) =>
      arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0
    );

    const keywords = extractKeywords(text, 12);
    const kwWords = keywords.map((k) => k.word);
    const focus = [0, 0, 0, 0, 0];
    kwWords.forEach((w) => {
      for (let i = 0; i < 5; i += 1) {
        const slice = text.slice(Math.floor((i * L) / 5), Math.floor(((i + 1) * L) / 5));
        focus[i] += countOccurrences(slice, w);
      }
    });

    const longShare = sentenceLens.filter((l) => l > 60).length / Math.max(1, sentenceCount);
    const shortShare = sentenceLens.filter((l) => l < 15).length / Math.max(1, sentenceCount);
    const cv = avgSentenceLen ? std(sentenceLens) / avgSentenceLen : 0;
    const meanSentPart = sentMeanByPart.filter((v) => v > 0);
    const wave = meanSentPart.length
      ? (std(meanSentPart) / (meanSentPart.reduce((s, x) => s + x, 0) / meanSentPart.length)) * 100
      : 0;

    return {
      charCount,
      wordCount: totalTokens,
      totalTokens,
      uniqueTokens,
      ttr: totalTokens ? uniqueTokens / totalTokens : 0,
      cjkChars,
      cjkRatio: charCount ? cjkChars / charCount : 0,
      digitCount,
      sentenceCount,
      avgSentenceLen,
      keywords,
      parts: { novelty, sentMean: sentMeanByPart, focus },
      rhythm: { cv, longShare, shortShare, wave },
    };
  }

  // ---- 图表数据 ------------------------------------------------------------
  function clamp(v) {
    return Math.max(2, Math.min(100, Math.round(v)));
  }
  function norm01(arr) {
    const max = Math.max(...arr);
    if (!max) return arr.map(() => 3);
    return arr.map((v) => Math.max(3, Math.round((v / max) * 100)));
  }

  function buildChartBars(a, headingCount) {
    const K = a.keywords;
    const topShare = a.totalTokens
      ? (K.reduce((s, k) => s + k.count, 0) / a.totalTokens) * 100
      : 0;
    const top1 = K.length ? K[0].count : 0;
    const span = a.parts.novelty.length
      ? Math.max(...a.parts.novelty) - Math.min(...a.parts.novelty)
      : 0;
    const colors = ["#3ecf9d", "#8fe8c4", "#2aa07c", "#6f84a8"];
    // 与 app.js 的 chartData 约定一致：外层用 "impact" 作为图表键
    return {
      impact: {
        population: {
          label: "结构与词汇指数（0-100）",
          note: "由导入原文实际统计生成。",
          captions: ["章节密度", "词汇丰富度", "概念集中度", "语义跨度"],
          values: [clamp(headingCount * 15), clamp(a.ttr * 100), clamp(topShare * 10), clamp(span)],
          colors,
        },
        wellbeing: {
          label: "句法节奏指数（0-100）",
          note: "由导入原文实际统计生成。",
          captions: ["句长均衡", "长句占比", "短句占比", "节奏波动"],
          values: [
            clamp(Math.max(0, 100 - a.rhythm.cv * 100)),
            clamp(a.rhythm.longShare * 100),
            clamp(a.rhythm.shortShare * 100),
            clamp(a.rhythm.wave),
          ],
          colors,
        },
        ecology: {
          label: "文本特征指数（0-100）",
          note: "由导入原文实际统计生成。",
          captions: ["中文占比", "数字密度", "主题重复度", "标题信息量"],
          values: [
            clamp(a.cjkRatio * 100),
            clamp((a.digitCount / Math.max(1, a.charCount)) * 500),
            clamp(top1 * 2),
            clamp(a.avgSentenceLen * 2),
          ],
          colors,
        },
      },
    };
  }

  function buildLineChart(a) {
    return {
      "book-trends": {
        labels: ["起点", "展开", "深化", "整合", "延伸"],
        series: {
          theory: { name: "平均句长", color: "#3ecf9d", values: norm01(a.parts.sentMean) },
          method: { name: "词汇新鲜度", color: "#8fe8c4", values: a.parts.novelty.map((v) => Math.round(v)) },
          practice: { name: "主题聚焦", color: "#2aa07c", values: norm01(a.parts.focus) },
        },
      },
    };
  }

  // ---- PDF 提取 ------------------------------------------------------------
  function getPdfjs() {
    if (typeof global.pdfjsLib !== "undefined") return global.pdfjsLib;
    if (typeof window !== "undefined" && window.pdfjsLib) return window.pdfjsLib;
    return null;
  }

  function itemsToLines(items) {
    const lines = new Map();
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y).push(it);
    }
    return [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, its]) => {
        its.sort((p, q) => p.transform[4] - q.transform[4]);
        let text = "";
        let prevEnd = null;
        let size = 0;
        for (const it of its) {
          const x = it.transform[4];
          if (prevEnd !== null && x - prevEnd > 1.5) text += " ";
          text += it.str;
          prevEnd = x + (it.width || 0);
          size = Math.max(size, it.height || Math.hypot(it.transform[2], it.transform[3]) || 0);
        }
        return { text: text.replace(/\s+/g, " ").trim(), size };
      })
      .filter((l) => l.text.length > 0);
  }

  function detectHeadings(lines) {
    if (!lines.length) return [];
    const sizeCounts = new Map();
    lines.forEach((l) => {
      if (!l.size) return;
      const key = Math.round(l.size);
      sizeCounts.set(key, (sizeCounts.get(key) || 0) + 1);
    });
    if (!sizeCounts.size) return [];
    const sorted = [...sizeCounts.entries()].sort((a, b) => b[1] - a[1]);
    const bodySize = sorted[0][0];
    const threshold = bodySize + 1.5;
    const out = [];
    for (const l of lines) {
      if (l.size < threshold) continue;
      const t = l.text;
      if (t.length < 2 || t.length > 40) continue;
      if (/^\d+$/.test(t)) continue;
      if (!/[A-Za-z\u3400-\u9fff]/.test(t)) continue;
      const last = out[out.length - 1];
      if (last === t) continue;
      out.push(t);
      if (out.length >= 24) break;
    }
    return out;
  }

  async function extractPdfFromBuffer(buffer, onProgress) {
    const pdfjs = getPdfjs();
    if (!pdfjs) throw new Error("pdfjs-not-loaded");
    const MAX_PAGES = 300;
    const MAX_SCAN = 400000;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const numPages = doc.numPages;
    const scanPages = Math.min(numPages, MAX_PAGES);
    let text = "";
    let stopped = false;
    const allLines = [];
    try {
      for (let p = 1; p <= scanPages; p += 1) {
        const page = await doc.getPage(p);
        const tc = await page.getTextContent();
        const lines = itemsToLines(tc.items);
        allLines.push(...lines);
        lines.forEach((l) => {
          text += l.text + "\n";
        });
        if (onProgress) onProgress(p, scanPages);
        if (text.length > MAX_SCAN) {
          stopped = true;
          break;
        }
      }
    } finally {
      await doc.destroy();
    }
    const note = [];
    if (numPages > scanPages) note.push(`大文件仅扫描前 ${scanPages} 页`);
    if (stopped) note.push("文本量较大，已截断");
    return buildContent({
      engine: "pdf",
      pages: numPages,
      text,
      headings: detectHeadings(allLines),
      note: note.join("；") || null,
    });
  }

  // ---- 网页抓取 ------------------------------------------------------------
  const CORS_PROXIES = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  async function fetchHtml(url, onProgress) {
    const attempts = [url, ...CORS_PROXIES.map((f) => f(url))];
    let lastErr = null;
    for (let i = 0; i < attempts.length; i += 1) {
      try {
        if (onProgress) onProgress(i === 0 ? "直连" : "代理");
        const res = await fetch(attempts[i], { redirect: "follow" });
        if (!res.ok) {
          lastErr = new Error("HTTP " + res.status);
          continue;
        }
        const html = await res.text();
        if (html.length > 300 && /<(html|body|article|main|div|p|h1)\b/i.test(html)) {
          return html;
        }
        lastErr = new Error("non-html-response");
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("fetch-failed");
  }

  function extractTextFromHtml(html) {
    if (typeof DOMParser === "undefined") throw new Error("no-domparser");
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll(
      "script,style,noscript,iframe,svg,form,button,nav,footer,aside,.ad,.ads,.adsbygoogle,[class*=cookie],[class*=banner]"
    ).forEach((el) => el.remove());
    const root = doc.querySelector("article") || doc.querySelector("main") || doc.body || doc.documentElement;
    const h1 = root.querySelector("h1");
    const title = (
      (h1 ? h1.textContent : doc.querySelector("title") ? doc.querySelector("title").textContent : "") || ""
    ).replace(/\s+/g, " ").trim().slice(0, 120);
    const headings = [];
    Array.from(root.querySelectorAll("h2,h3")).forEach((h) => {
      const t = h.textContent.replace(/\s+/g, " ").trim();
      if (t.length >= 2 && t.length <= 60) headings.push(t);
    });
    const blocks = [];
    const blockEls = root.querySelectorAll("p,li,h1,h2,h3,h4,blockquote,pre");
    if (blockEls.length >= 5) {
      blockEls.forEach((el) => {
        const t = el.textContent.replace(/\s+/g, " ").trim();
        if (t.length >= 12) blocks.push(t);
      });
    } else {
      const t = (root.textContent || "").replace(/\s+/g, " ").trim();
      if (t) blocks.push(t);
    }
    const text = blocks.join("\n");
    return { title, headings: dedupe(headings).slice(0, 24), text };
  }

  async function extractUrlContent(url, onProgress) {
    const html = await fetchHtml(url, onProgress);
    const { title, headings, text } = extractTextFromHtml(html);
    if (!title && !text) throw new Error("no-content");
    return buildContent({ engine: "url", pages: null, text, headings, note: null });
  }

  // ---- 组装 ----------------------------------------------------------------
  function dedupe(arr) {
    const seenSet = new Set();
    const out = [];
    for (const item of arr) {
      const key = String(item).toLowerCase();
      if (seenSet.has(key)) continue;
      seenSet.add(key);
      out.push(item);
    }
    return out;
  }

  const MAX_SAMPLE = 12000;

  function buildContent({ engine, pages = null, text, headings = [], note = null }) {
    if (!text || !text.trim()) {
      const err = new Error("no-text");
      err.code = "no-text";
      throw err;
    }
    const a = analyzeText(text);
    const headingList = dedupe(headings).slice(0, 24);
    return {
      engine,
      pages,
      charCount: a.charCount,
      wordCount: a.wordCount,
      sentenceCount: a.sentenceCount,
      avgSentenceLen: Math.round(a.avgSentenceLen * 10) / 10,
      readingMinutes: Math.max(1, Math.round(a.charCount / 380)),
      headings: headingList,
      keywords: a.keywords,
      excerpt: text.replace(/\s+/g, " ").slice(0, 500),
      sample: text.replace(/\n{3,}/g, "\n\n").slice(0, MAX_SAMPLE),
      chartBars: buildChartBars(a, headingList.length),
      chart: buildLineChart(a),
      note: note || null,
    };
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const api = {
    extractPdfFromFile: async function (file, onProgress) {
      const buffer = await file.arrayBuffer();
      return extractPdfFromBuffer(buffer, onProgress);
    },
    extractPdfFromBuffer,
    extractUrlContent,
    extractTextFromHtml,
    analyzeText,
    buildContent,
    escapeHtml,
    _internal: { itemsToLines, detectHeadings, tokenize, extractKeywords },
  };

  // 浏览器环境下设置 PDF.js worker
  try {
    const pdfjs = getPdfjs();
    if (pdfjs && typeof document !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
    }
  } catch (_) {
    /* ignore */
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.BookExtract = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
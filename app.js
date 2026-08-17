const mainContent = document.querySelector("main.page") || document.querySelector("main");
if (mainContent) {
  mainContent.id ||= "main-content";
  mainContent.setAttribute("tabindex", "-1");

  const skipLink = document.createElement("a");
  skipLink.className = "skip-link";
  skipLink.href = `#${mainContent.id}`;
  skipLink.textContent = "跳到主要内容";
  document.body.prepend(skipLink);
}

const importFeedback = document.querySelector("[data-import-feedback]");
if (importFeedback) {
  importFeedback.setAttribute("role", "status");
  importFeedback.setAttribute("aria-live", "polite");
}

const observer = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in-view");
      if (entry.target.dataset.count) {
        animateCount(entry.target);
      }
      obs.unobserve(entry.target);
    });
  },
  { threshold: 0.25 }
);

const targets = document.querySelectorAll(".reveal, .chart-animate, [data-count]");
targets.forEach((target) => observer.observe(target));

const progressRoot = document.createElement("div");
progressRoot.className = "scroll-progress";
progressRoot.innerHTML = "<span></span>";
progressRoot.setAttribute("aria-hidden", "true");
document.body.appendChild(progressRoot);
const progressBar = progressRoot.querySelector("span");

function updateScrollProgress() {
  if (!progressBar) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? (window.scrollY / max) * 100 : 0;
  progressBar.style.width = `${Math.max(0, Math.min(100, ratio))}%`;
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("resize", updateScrollProgress);
updateScrollProgress();

const tooltip = document.createElement("div");
tooltip.className = "tooltip";
document.body.appendChild(tooltip);

let tooltipTarget = null;

function isNaturallyFocusable(el) {
  return el.matches("a, button, input, textarea, select, [tabindex]");
}

function ensureTipFocusable(scope = document) {
  scope.querySelectorAll("[data-tip]").forEach((el) => {
    if (!isNaturallyFocusable(el)) {
      el.setAttribute("tabindex", "0");
    }
  });
}

function moveTooltip(event) {
  if (!tooltipTarget) return;
  const offset = 14;
  const maxX = window.innerWidth - 16;
  const maxY = window.innerHeight - 16;
  let x = event.clientX + offset;
  let y = event.clientY + offset;

  const rect = tooltip.getBoundingClientRect();
  if (x + rect.width > maxX) {
    x = Math.max(8, event.clientX - rect.width - offset);
  }
  if (y + rect.height > maxY) {
    y = Math.max(8, event.clientY - rect.height - offset);
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function showTooltip(target, event) {
  const text = target.dataset.tip;
  if (!text) return;
  tooltip.textContent = text;
  tooltip.classList.add("show");
  tooltipTarget = target;
  moveTooltip(event);
}

function hideTooltip() {
  tooltip.classList.remove("show");
  tooltipTarget = null;
}

document.addEventListener("pointerover", (event) => {
  const target = event.target.closest("[data-tip]");
  if (!target) return;
  showTooltip(target, event);
});

document.addEventListener("pointerout", (event) => {
  if (!tooltipTarget) return;
  const leaveTarget = event.target.closest("[data-tip]");
  const enterTarget = event.relatedTarget?.closest?.("[data-tip]");
  if (leaveTarget && leaveTarget !== enterTarget) {
    hideTooltip();
  }
});

document.addEventListener("pointermove", moveTooltip);

document.addEventListener("focusin", (event) => {
  const target = event.target.closest("[data-tip]");
  if (!target) return;
  const rect = target.getBoundingClientRect();
  showTooltip(target, {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + 10,
  });
});

document.addEventListener("focusout", (event) => {
  if (!tooltipTarget) return;
  const leaveTarget = event.target.closest("[data-tip]");
  const enterTarget = event.relatedTarget?.closest?.("[data-tip]");
  if (leaveTarget && leaveTarget !== enterTarget) {
    hideTooltip();
  }
});

ensureTipFocusable();

const defaultChartData = {
  impact: {
    population: {
      label: "人口规模指数（0-100）",
      note: "示意：农业与科学革命推动人口快速攀升。",
      values: [28, 68, 92, 100],
      colors: ["#7ad3ff", "#b4ffb2", "#ffd087", "#ff8ec7"],
    },
    wellbeing: {
      label: "个体生活质量指数（0-100）",
      note: "示意：生活质量并非线性提升。",
      values: [60, 45, 55, 70],
      colors: ["#7ad3ff", "#ffd087", "#b4ffb2", "#a6a8ff"],
    },
    ecology: {
      label: "生态压力指数（0-100）",
      note: "示意：工业化与数字化带来更高的生态压力。",
      values: [18, 46, 78, 90],
      colors: ["#b4ffb2", "#ffd087", "#ff8ec7", "#7ad3ff"],
    },
  },
};

const chartData = {
  ...defaultChartData,
  ...(window.bookChartData || {}),
};

const defaultLineChartData = {
  "future-trends": {
    labels: ["现在", "短期", "中期", "中远期", "长期"],
    series: {
      ai: {
        name: "AI",
        color: "#7ad3ff",
        values: [32, 49, 64, 79, 95],
      },
      bio: {
        name: "Bio",
        color: "#b4ffb2",
        values: [24, 38, 52, 66, 78],
      },
      data: {
        name: "Data",
        color: "#ffd087",
        values: [20, 31, 43, 57, 69],
      },
    },
  },
};

const lineChartData = {
  ...defaultLineChartData,
  ...(window.bookLineChartData || {}),
};

const tabGroups = document.querySelectorAll("[data-tab-group]");
tabGroups.forEach((group) => {
  const buttons = Array.from(group.querySelectorAll("[data-tab]"));
  if (!buttons.length) return;
  const panels = Array.from(group.querySelectorAll("[data-panel]"));
  const defaultTab =
    group.querySelector("[data-tab].active")?.dataset.tab || buttons[0].dataset.tab;

  const activate = (tab, skipAnimation = false) => {
    buttons.forEach((btn) => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    if (panels.length) {
      panels.forEach((panel) => {
        const isActive = panel.dataset.panel === tab;
        panel.classList.toggle("active", isActive);
        panel.setAttribute("aria-hidden", isActive ? "false" : "true");
      });
    }

    if (group.dataset.chart) {
      updateChart(group, tab, skipAnimation);
    }
  };

  group.setAttribute("role", "tablist");
  buttons.forEach((btn) => {
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.setAttribute("tabindex", "-1");

    btn.addEventListener("click", () => activate(btn.dataset.tab));
    btn.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const index = buttons.indexOf(btn);

      if (event.key === "Home") {
        activate(buttons[0].dataset.tab);
        buttons[0].focus();
        return;
      }

      if (event.key === "End") {
        const last = buttons[buttons.length - 1];
        activate(last.dataset.tab);
        last.focus();
        return;
      }

      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = (index + delta + buttons.length) % buttons.length;
      activate(buttons[next].dataset.tab);
      buttons[next].focus();
    });
  });

  panels.forEach((panel) => {
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-hidden", "true");
  });

  activate(defaultTab, true);
});

const filterGroups = document.querySelectorAll("[data-filter-group]");
filterGroups.forEach((group) => {
  const buttons = Array.from(group.querySelectorAll("[data-filter]"));
  const items = Array.from(group.querySelectorAll("[data-tags]"));
  if (!buttons.length || !items.length) return;

  const applyFilters = () => {
    const active = buttons
      .filter((btn) => btn.classList.contains("active"))
      .map((btn) => btn.dataset.filter);

    let visibleCount = 0;
    items.forEach((item) => {
      let visible = true;
      const tags = (item.dataset.tags || "")
        .split(",")
        .map((tag) => tag.trim());

      if (active.length) {
        visible = active.some((tag) => tags.includes(tag));
      }

      item.style.display = visible ? "" : "none";
      if (visible) visibleCount += 1;
    });

    const total = items.length;
    const summary = group.querySelector("[data-filter-count]");
    if (summary) {
      summary.textContent =
        active.length > 0
          ? `已筛选 ${visibleCount} / ${total} 条观点`
          : `当前显示全部 ${total} 条观点`;
    }

    const emptyState = group.querySelector("[data-empty-state]");
    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }
  };

  buttons.forEach((btn) => {
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      btn.setAttribute("aria-pressed", btn.classList.contains("active"));
      applyFilters();
    });
  });

  applyFilters();
});

function animateCount(el) {
  const target = parseFloat(el.dataset.count || "0");
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const suffix = el.dataset.suffix || "";
  const prefix = el.dataset.prefix || "";
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = target * progress;
    el.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function updateChart(chartEl, tab, skipAnimation) {
  const dataSet = chartData[chartEl.dataset.chart]?.[tab];
  if (!dataSet) return;

  const bars = chartEl.querySelectorAll("[data-chart-bars] .bar-vertical span");
  const values = chartEl.querySelectorAll("[data-chart-bars] [data-bar-value]");

  bars.forEach((bar, index) => {
    const value = dataSet.values[index] ?? 0;
    bar.style.height = `${value}%`;
    if (dataSet.colors?.[index]) {
      bar.style.background = dataSet.colors[index];
    }
    const caption = bar.closest("div")?.querySelector(".bar-caption");
    if (caption) {
      bar.dataset.tip = `${caption.textContent} · ${value}`;
    }
    if (values[index]) {
      values[index].textContent = value;
    }
  });

  const label = chartEl.querySelector("[data-chart-label]");
  if (label) label.textContent = dataSet.label;

  const note = chartEl.querySelector("[data-chart-note]");
  if (note) note.textContent = dataSet.note;

  if (!skipAnimation && chartEl.classList.contains("in-view")) {
    bars.forEach((bar) => {
      bar.style.transform = "scaleY(0)";
    });
    requestAnimationFrame(() => {
      bars.forEach((bar) => {
        bar.style.transform = "scaleY(1)";
      });
    });
  }
}

const scrollySections = document.querySelectorAll("[data-scrolly]");
scrollySections.forEach((section) => {
  const chart = section.querySelector(".scrolly-chart");
  const steps = Array.from(section.querySelectorAll(".story-step"));
  if (!chart || !steps.length) return;

  const storyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        setStoryStep(entry.target);
      });
    },
    { threshold: 0.55 }
  );

  function setStoryStep(step) {
    const key = step.dataset.step;
    steps.forEach((item) => item.classList.toggle("active", item === step));
    if (key) chart.dataset.active = key;
  }

  steps.forEach((step, index) => {
    step.setAttribute("tabindex", "0");
    step.addEventListener("focus", () => setStoryStep(step));
    step.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = (index + delta + steps.length) % steps.length;
      steps[next].focus();
      setStoryStep(steps[next]);
    });
  });

  steps.forEach((step) => storyObserver.observe(step));
});

function initLineCharts() {
  const charts = document.querySelectorAll("[data-line-chart-key]");
  charts.forEach((chartEl) => {
    const key = chartEl.dataset.lineChartKey;
    const config = lineChartData[key];
    if (!config) return;

    const svg = chartEl.querySelector("[data-line-canvas]");
    const axisLayer = chartEl.querySelector("[data-line-axis]");
    const gridLayer = chartEl.querySelector("[data-line-grid]");
    const buttons = Array.from(chartEl.querySelectorAll("[data-series]"));
    if (!svg || !buttons.length) return;

    const viewBox = svg.viewBox.baseVal;
    const width = viewBox.width;
    const height = viewBox.height;
    const padding = { top: 18, right: 20, bottom: 30, left: 36 };

    const seriesIds = Object.keys(config.series);
    const activeSeries = new Set(
      buttons
        .filter((btn) => btn.classList.contains("active"))
        .map((btn) => btn.dataset.series)
    );
    if (!activeSeries.size) {
      seriesIds.forEach((id) => activeSeries.add(id));
    }

    const pathMap = new Map();
    const pointGroupMap = new Map();
    let currentPoints = null;
    let frameId = null;

    function getX(index) {
      const usable = width - padding.left - padding.right;
      if (config.labels.length <= 1) return padding.left;
      return padding.left + (index / (config.labels.length - 1)) * usable;
    }

    function getY(value, maxValue) {
      const usable = height - padding.top - padding.bottom;
      return padding.top + usable * (1 - value / maxValue);
    }

    function pathFromPoints(points) {
      return points
        .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
        .join(" ");
    }

    function clonePoints(pointsMap) {
      const clone = {};
      seriesIds.forEach((id) => {
        clone[id] = pointsMap[id].map((point) => ({ x: point.x, y: point.y }));
      });
      return clone;
    }

    function drawAxisAndGrid() {
      if (gridLayer) {
        gridLayer.innerHTML = "";
        const rows = 4;
        for (let i = 0; i <= rows; i += 1) {
          const y = padding.top + ((height - padding.top - padding.bottom) / rows) * i;
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", String(padding.left));
          line.setAttribute("x2", String(width - padding.right));
          line.setAttribute("y1", String(y));
          line.setAttribute("y2", String(y));
          gridLayer.appendChild(line);
        }
      }

      if (axisLayer) {
        axisLayer.innerHTML = "";
        config.labels.forEach((label, index) => {
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("x", String(getX(index)));
          text.setAttribute("y", String(height - 8));
          text.setAttribute("text-anchor", "middle");
          text.textContent = label;
          axisLayer.appendChild(text);
        });
      }
    }

    function computeTargetPoints() {
      const visibleIds = seriesIds.filter((id) => activeSeries.has(id));
      const visibleValues = visibleIds.flatMap((id) => config.series[id].values);
      const maxValue = Math.max(10, ...visibleValues);

      const target = {};
      seriesIds.forEach((id) => {
        target[id] = config.series[id].values.map((value, index) => ({
          x: getX(index),
          y: getY(value, maxValue),
        }));
      });
      return target;
    }

    function render(pointsMap) {
      seriesIds.forEach((id) => {
        const meta = config.series[id];
        const points = pointsMap[id];
        const visible = activeSeries.has(id);

        let path = pathMap.get(id);
        if (!path) {
          path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.classList.add("line-series");
          path.setAttribute("stroke", meta.color);
          path.setAttribute("fill", "none");
          svg.insertBefore(path, axisLayer || null);
          pathMap.set(id, path);
        }

        path.setAttribute("d", pathFromPoints(points));
        path.classList.toggle("hidden", !visible);

        let group = pointGroupMap.get(id);
        if (!group) {
          group = document.createElementNS("http://www.w3.org/2000/svg", "g");
          group.classList.add("line-points");
          svg.insertBefore(group, axisLayer || null);
          pointGroupMap.set(id, group);
        }

        while (group.children.length < points.length) {
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("r", "4");
          group.appendChild(circle);
        }

        while (group.children.length > points.length) {
          group.removeChild(group.lastChild);
        }

        points.forEach((point, index) => {
          const circle = group.children[index];
          const value = meta.values[index];
          const label = config.labels[index];
          circle.setAttribute("cx", String(point.x));
          circle.setAttribute("cy", String(point.y));
          circle.setAttribute("fill", meta.color);
          circle.dataset.tip = `${meta.name} · ${label}: ${value}`;
          circle.setAttribute("tabindex", visible ? "0" : "-1");
        });

        group.classList.toggle("hidden", !visible);
      });

      ensureTipFocusable(chartEl);
    }

    function animateTo(target, immediate = false) {
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }

      if (!currentPoints || immediate) {
        currentPoints = clonePoints(target);
        render(currentPoints);
        return;
      }

      const start = clonePoints(currentPoints);
      const duration = 320;
      const startTime = performance.now();

      function frame(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = t * t * (3 - 2 * t);
        const next = {};

        seriesIds.forEach((id) => {
          next[id] = target[id].map((targetPoint, index) => {
            const from = start[id][index];
            return {
              x: from.x + (targetPoint.x - from.x) * eased,
              y: from.y + (targetPoint.y - from.y) * eased,
            };
          });
        });

        render(next);

        if (t < 1) {
          frameId = requestAnimationFrame(frame);
        } else {
          frameId = null;
          currentPoints = clonePoints(target);
          render(currentPoints);
        }
      }

      frameId = requestAnimationFrame(frame);
    }

    function syncLegendState() {
      buttons.forEach((button) => {
        const id = button.dataset.series;
        const active = activeSeries.has(id);
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function update(immediate = false) {
      syncLegendState();
      const target = computeTargetPoints();
      animateTo(target, immediate);
    }

    buttons.forEach((button) => {
      const id = button.dataset.series;
      button.setAttribute("aria-pressed", activeSeries.has(id) ? "true" : "false");
      button.addEventListener("click", () => {
        if (activeSeries.has(id) && activeSeries.size === 1) return;
        if (activeSeries.has(id)) {
          activeSeries.delete(id);
        } else {
          activeSeries.add(id);
        }
        update(false);
      });
    });

    drawAxisAndGrid();
    update(true);
  });
}

function initChapterNavigation() {
  const page = document.querySelector("main.page");
  if (!page) return;

  const sections = Array.from(page.querySelectorAll(".section")).filter((section) =>
    section.querySelector("h2")
  );
  if (sections.length < 2) return;

  const nav = document.createElement("aside");
  nav.className = "chapter-nav";
  nav.innerHTML =
    '<strong>章节导航</strong>' +
    '<div class="chapter-meta">' +
    '<div class="chapter-meta-row"><span>总进度</span><b data-reading-progress>0%</b></div>' +
    '<div class="chapter-track"><span data-reading-bar></span></div>' +
    '<div class="chapter-meta-row"><span>已读章节</span><b data-completed-count>0/0</b></div>' +
    '<div class="chapter-meta-row"><span>当前章节</span><b data-reading-time>--</b></div>' +
    '<div class="chapter-meta-row"><span>判定模式</span></div>' +
    '<div class="chapter-mode-toggle">' +
    '<button type="button" class="chapter-mode-btn active" data-complete-mode="top">滚过顶部</button>' +
    '<button type="button" class="chapter-mode-btn" data-complete-mode="full">整章读完</button>' +
    "</div>" +
    '<label class="chapter-speed">' +
    "<span>阅读速度</span>" +
    '<select data-reading-speed>' +
    '<option value="300">慢速 (300 字/分)</option>' +
    '<option value="380" selected>标准 (380 字/分)</option>' +
    '<option value="500">快速 (500 字/分)</option>' +
    "</select>" +
    "</label>" +
    "</div>" +
    '<div class="chapter-links"></div>';
  const linksRoot = nav.querySelector(".chapter-links");
  const readingProgressEl = nav.querySelector("[data-reading-progress]");
  const readingBarEl = nav.querySelector("[data-reading-bar]");
  const completedCountEl = nav.querySelector("[data-completed-count]");
  const readingTimeEl = nav.querySelector("[data-reading-time]");
  const modeButtons = Array.from(nav.querySelectorAll("[data-complete-mode]"));
  const speedSelect = nav.querySelector("[data-reading-speed]");

  const storageKeys = {
    completionMode: "sapiens:chapter:completion-mode",
    readingSpeed: "sapiens:chapter:reading-speed",
  };

  let completionMode = "top";
  let readingSpeed = Number(speedSelect?.value || 380);

  function readPreference(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function writePreference(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (_) {
      // localStorage may be unavailable in private/restricted contexts.
    }
  }

  const savedMode = readPreference(storageKeys.completionMode);
  if (savedMode === "top" || savedMode === "full") {
    completionMode = savedMode;
  }

  if (speedSelect) {
    const allowedSpeeds = new Set(
      Array.from(speedSelect.options).map((option) => option.value)
    );
    const savedSpeed = readPreference(storageKeys.readingSpeed);
    if (savedSpeed && allowedSpeeds.has(savedSpeed)) {
      speedSelect.value = savedSpeed;
    }
    readingSpeed = Number(speedSelect.value || 380);
  }

  function estimateReadingSeconds(charCount) {
    return Math.max(20, Math.ceil((charCount / readingSpeed) * 60));
  }

  function formatReadingDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) {
      return `约 ${seconds} 秒`;
    }
    if (seconds === 0) {
      return `约 ${minutes} 分钟`;
    }
    return `约 ${minutes}分${seconds}秒`;
  }

  function getScrollPercent() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((window.scrollY / max) * 100)));
  }

  const chapterItems = sections.map((section, index) => {
    if (!section.id) {
      section.id = `section-${index + 1}`;
    }

    const title = section.querySelector("h2")?.textContent?.trim() || `章节 ${index + 1}`;
    const link = document.createElement("a");
    link.className = "chapter-link";
    link.href = `#${section.id}`;
    link.textContent = title;
    linksRoot.appendChild(link);
    const charCount = (section.textContent || "").replace(/\s+/g, "").length;
    return { section, link, charCount };
  });

  document.body.appendChild(nav);

  function syncModeButtons() {
    modeButtons.forEach((button) => {
      const active = button.dataset.completeMode === completionMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function isCompleted(rect, marker) {
    if (completionMode === "full") {
      return rect.bottom <= marker;
    }
    return rect.top <= marker;
  }

  function setActive(activeSection) {
    chapterItems.forEach((item) => {
      item.link.classList.toggle("active", item.section === activeSection);
    });

    const activeItem = chapterItems.find((item) => item.section === activeSection);
    if (activeItem && readingTimeEl) {
      readingTimeEl.textContent = formatReadingDuration(
        estimateReadingSeconds(activeItem.charCount)
      );
    }
  }

  function updateActiveByScroll() {
    const marker = 180;
    let active = chapterItems[0].section;
    let completedCount = 0;

    chapterItems.forEach((item) => {
      const rect = item.section.getBoundingClientRect();
      if (rect.top <= marker) {
        active = item.section;
      }
      const completed = isCompleted(rect, marker);
      item.link.classList.toggle("completed", completed);
      if (completed) {
        completedCount += 1;
      }
    });

    setActive(active);

    const progress = getScrollPercent();
    if (readingProgressEl) {
      readingProgressEl.textContent = `${progress}%`;
    }
    if (readingBarEl) {
      readingBarEl.style.width = `${progress}%`;
    }
    if (completedCountEl) {
      completedCountEl.textContent = `${completedCount}/${chapterItems.length}`;
    }
  }

  modeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", button.classList.contains("active") ? "true" : "false");
    button.addEventListener("click", () => {
      completionMode = button.dataset.completeMode || "top";
      writePreference(storageKeys.completionMode, completionMode);
      syncModeButtons();
      updateActiveByScroll();
    });
  });

  if (speedSelect) {
    speedSelect.addEventListener("change", () => {
      readingSpeed = Number(speedSelect.value || 380);
      writePreference(storageKeys.readingSpeed, readingSpeed);
      updateActiveByScroll();
    });
  }

  chapterItems.forEach((item) => {
    item.link.addEventListener("click", () => {
      setActive(item.section);
    });
  });

  syncModeButtons();
  window.addEventListener("scroll", updateActiveByScroll, { passive: true });
  window.addEventListener("resize", updateActiveByScroll);
  updateActiveByScroll();
}

function initBackTopButton() {
  const button = document.createElement("button");
  button.className = "back-top";
  button.type = "button";
  button.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<path d="M12 19V5m0 0-6 6m6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
    "</svg>";
  button.dataset.tip = "返回顶部";
  button.setAttribute("aria-label", "返回顶部");

  button.addEventListener("click", () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  function sync() {
    button.classList.toggle("show", window.scrollY > 360);
  }

  document.body.appendChild(button);
  ensureTipFocusable(button);

  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  sync();
}

initLineCharts();
initChapterNavigation();
initBackTopButton();

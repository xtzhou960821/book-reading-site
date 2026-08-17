/**
 * 书籍配置：多本书籍的导航与页面映射
 * @module books
 */

const BOOKS = {
  sapiens: {
    id: 'sapiens',
    title: '人类简史',
    subtitle: 'Sapiens',
    indexUrl: 'index.html',
    pages: [
      { label: '概览', href: 'index.html' },
      { label: '导入中心', href: 'index.html#import-hub' },
      { label: '三次革命', href: 'revolutions.html' },
      { label: '想象秩序', href: 'orders.html' },
      { label: '未来议题', href: 'future.html' },
      { label: '争议', href: 'controversy.html' },
    ],
  },
  '100years': {
    id: '100years',
    title: '百年孤独',
    subtitle: 'Cien años de soledad',
    indexUrl: 'index-100years.html',
    pages: [
      { label: '概览', href: 'index-100years.html' },
      { label: '导入中心', href: 'index-100years.html#import-hub' },
      { label: '布恩迪亚家族', href: 'family.html' },
      { label: '魔幻现实主义', href: 'magic-realism.html' },
      { label: '循环与宿命', href: 'cycles.html' },
      { label: '孤独主题', href: 'solitude.html' },
      { label: '争议与解读', href: 'controversy-100years.html' },
    ],
  },
  wealth: {
    id: 'wealth',
    title: '国富论',
    subtitle: 'The Wealth of Nations',
    indexUrl: 'index-wealth.html',
    pages: [
      { label: '概览', href: 'index-wealth.html' },
      { label: '分工与交换', href: 'index-wealth.html#division' },
      { label: '价值与价格', href: 'index-wealth.html#value' },
      { label: '资本与增长', href: 'index-wealth.html#capital' },
      { label: '政府职责', href: 'index-wealth.html#government' },
    ],
  },
  'little-prince': {
    id: 'little-prince',
    title: '小王子',
    subtitle: 'The Little Prince',
    indexUrl: 'index-little-prince.html',
    pages: [
      { label: '概览', href: 'index-little-prince.html' },
      { label: '导入中心', href: 'index-little-prince.html#import-hub' },
      { label: '玫瑰与驯服', href: 'rose.html' },
      { label: '星球之旅', href: 'planets.html' },
      { label: '狐狸与本质', href: 'fox.html' },
    ],
  },
  'thinking-fast-slow': {
    id: 'thinking-fast-slow',
    title: '思考，快与慢',
    subtitle: 'Thinking, Fast and Slow',
    indexUrl: 'index-thinking-fast-slow.html',
    pages: [
      { label: '概览', href: 'index-thinking-fast-slow.html' },
      { label: '导入中心', href: 'index-thinking-fast-slow.html#import-hub' },
      { label: '双系统', href: 'system12.html' },
      { label: '启发式与偏差', href: 'heuristics.html' },
      { label: '前景理论', href: 'prospect.html' },
      { label: '记忆自我', href: 'memory.html' },
      { label: '决策与生活', href: 'decisions.html' },
    ],
  },
  'win-friends': {
    id: 'win-friends',
    title: '人性的弱点',
    subtitle: 'How to Win Friends and Influence People',
    indexUrl: 'index-win-friends.html',
    pages: [
      { label: '概览', href: 'index-win-friends.html' },
      { label: '导入中心', href: 'index-win-friends.html#import-hub' },
      { label: '人际处世', href: 'human-relations.html' },
      { label: '受人欢迎', href: 'likeability.html' },
      { label: '赢得认同', href: 'agreement.html' },
      { label: '成为领袖', href: 'leadership.html' },
      { label: '幸福家庭', href: 'happy-home.html' },
    ],
  },
};

/**
 * 根据当前页面路径获取当前书籍 ID
 * @param {string} pathname - 当前页面路径
 * @returns {string} 书籍 ID
 */
function getCurrentBookId(pathname) {
  const path = pathname.split('/').pop() || '';
  if (path.startsWith('index-wealth')) {
    return 'wealth';
  }
  if (path.startsWith('index-100years') || path === 'family.html' || path === 'magic-realism.html' ||
      path === 'cycles.html' || path === 'solitude.html' || path === 'controversy-100years.html') {
    return '100years';
  }
  if (path === 'index-little-prince.html' || path === 'rose.html' || path === 'planets.html' || path === 'fox.html') {
    return 'little-prince';
  }
  if (path === 'book.html') {
    // book.html 的书籍 id 由 URL 查询参数 ?book=<id> 决定
    try {
      const id = new URLSearchParams(window.location.search).get('book');
      if (id) return id;
    } catch (_) {
      /* ignore */
    }
  }
  if (path === 'index-thinking-fast-slow.html' || path === 'system12.html' || path === 'heuristics.html' || path === 'prospect.html' || path === 'memory.html' || path === 'decisions.html') {
    return 'thinking-fast-slow';
  }
  if (path === 'index-win-friends.html' || path === 'human-relations.html' || path === 'likeability.html' || path === 'agreement.html' || path === 'leadership.html' || path === 'happy-home.html') {
    return 'win-friends';
  }
  return 'sapiens';
}

// ---------------------------------------------------------------------------
// 动态书籍注册（方式 C 生成的书籍）
//
// 内置书籍（BOOKS）是静态注册的；通过「方式 C：输入书名」在浏览器里创建的书
// 保存在 localStorage，由下面的 registry 在运行时并入全局 BOOKS。
// 这样创建的新书会：
//   - 立即出现在左上角的书籍切换器里
//   - 在切换书籍 / 刷新页面后依然保留
//   - 拥有自己的动态「概览 + 章节」阅读页面（book.html?book=<id>）
// ---------------------------------------------------------------------------

var BOOK_REGISTRY_KEY = 'book-template:registry:v1';

/**
 * 读取动态注册的书籍。返回一个按 id 索引的对象（其结构与 BOOKS 条目一致）。
 * @returns {Object<string, object>}
 */
function getRegisteredBooks() {
  try {
    var raw = window.localStorage.getItem(BOOK_REGISTRY_KEY);
    if (!raw) return {};
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch (_) {
    return {};
  }
}

/**
 * 写入动态注册的书籍。
 * @param {Object<string, object>} books - 按 id 索引的书籍对象
 */
function setRegisteredBooks(books) {
  try {
    window.localStorage.setItem(BOOK_REGISTRY_KEY, JSON.stringify(books || {}));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * 注册（或更新）一本书到动态书籍库。
 * 返回是否成功写入（localStorage 可能因空间/隐私限制而失败）。
 * @param {object} book - 书籍对象（至少需含 id/title/pages）
 * @returns {boolean}
 */
function registerBook(book) {
  if (!book || !book.id) return false;
  var books = getRegisteredBooks();
  books[book.id] = book;
  return setRegisteredBooks(books);
}

/**
 * 取消注册一本书。
 * @param {string} id - 书籍 id
 */
function unregisterBook(id) {
  if (!id) return;
  var books = getRegisteredBooks();
  if (!books[id]) return;
  delete books[id];
  setRegisteredBooks(books);
}

/**
 * 返回包含内置书籍与动态注册书籍在内的完整书籍表。
 * 动态书优先（同 id 时以动态注册为准，便于覆盖/更新）。
 * @returns {Object<string, object>}
 */
function getAllBooks() {
  return Object.assign({}, BOOKS, getRegisteredBooks());
}

/**
 * 重命名一本动态注册的书（保留 id，避免破坏已关联内容与收藏的链接）。
 * 同时会尝试同步「导入库」（library.js 的 book-template:library:v1）。
 * @param {string} id - 要重命名的书籍 id
 * @param {string} newTitle - 新书名
 * @param {string} [newSubtitle] - 新副标题（可选）
 * @returns {boolean} 是否成功
 */
function renameBook(id, newTitle, newSubtitle) {
  if (!id || !newTitle || !newTitle.trim()) return false;
  var books = getRegisteredBooks();
  if (!books[id]) return false;
  var book = books[id];
  book.title = newTitle.trim();
  if (newSubtitle) book.subtitle = newSubtitle.trim();
  var ok = setRegisteredBooks(books);

  // 同步「导入库」中的同名记录（若存在）
  try {
    var libRaw = window.localStorage.getItem("book-template:library:v1");
    if (libRaw) {
      var lib = JSON.parse(libRaw);
      if (Array.isArray(lib)) {
        var hit = lib.filter(function (b) { return b.id === id; });
        if (hit.length) {
          hit[0].title = newTitle.trim();
          if (newSubtitle) hit[0].subtitle = newSubtitle.trim();
          window.localStorage.setItem("book-template:library:v1", JSON.stringify(lib));
        }
      }
    }
  } catch (_) {
    /* ignore */
  }
  return ok;
}

// 初始：把当前已注册的动态书籍并入全局 BOOKS，供 book-switcher 等同步使用。
(function mergeRegisteredIntoBooks() {
  try {
    var registered = getRegisteredBooks();
    Object.keys(registered).forEach(function (id) {
      BOOKS[id] = registered[id];
    });
  } catch (_) {
    /* ignore */
  }
})();

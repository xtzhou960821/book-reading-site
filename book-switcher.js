/**
 * 书籍切换器：左上角下拉菜单，用于在不同书籍间切换
 * @module book-switcher
 */

(function () {
  const switcher = document.querySelector('[data-book-switcher]');
  if (!switcher) return;

  const btn = switcher.querySelector('.book-switcher-btn');
  const list = switcher.querySelector('.book-switcher-list');
  const currentLabel = switcher.querySelector('.book-switcher-current');

  if (!btn || !list) return;

  /**
   * 使用统一书籍配置生成菜单，避免每个页面分别维护选项。
   */
  function renderOptions() {
    if (typeof BOOKS === 'undefined') return;
    list.innerHTML = '';
    Object.values(BOOKS).forEach((book) => {
      const item = document.createElement('li');
      item.setAttribute('role', 'option');
      item.dataset.book = book.id;

      const link = document.createElement('a');
      link.href = book.indexUrl;
      link.textContent = `${book.title} · ${book.subtitle}`;
      item.appendChild(link);
      list.appendChild(item);
    });
  }

  /**
   * 根据当前页面更新显示的当前书籍名称
   */
  function syncCurrentBook() {
    const path = window.location.pathname.split('/').pop() || '';
    const bookId = typeof getCurrentBookId === 'function'
      ? getCurrentBookId(path)
      : 'sapiens';
    const currentBook = typeof BOOKS !== 'undefined' ? BOOKS[bookId] : null;
    const label = currentBook?.title || '选择书籍';
    if (currentLabel) currentLabel.textContent = label;
    const options = list.querySelectorAll('[role="option"]');
    options.forEach((opt) => {
      const selected = opt.dataset.book === bookId;
      opt.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  /**
   * 切换下拉列表显示状态
   */
  function toggle() {
    const isClosed = list.hasAttribute('hidden');
    if (isClosed) {
      list.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      switcher.setAttribute('data-open', '');
    } else {
      close();
    }
  }

  /**
   * 关闭下拉列表
   */
  function close() {
    list.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
    switcher.removeAttribute('data-open');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  renderOptions();

  list.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      close();
    });
  });

  document.addEventListener('click', () => {
    if (!list.hidden) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !list.hidden) {
      close();
    }
  });

  /** 初始化时若列表无 hidden 则关闭 */
  if (!list.hasAttribute('hidden')) {
    list.setAttribute('hidden', '');
  }
  syncCurrentBook();
})();

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
  return 'sapiens';
}

/**
 * 获取当前书籍的导航链接（用于其他页面）
 * @param {string} bookId - 书籍 ID
 * @param {string} currentPage - 当前页面标识
 * @returns {Array<{label: string, href: string, active?: boolean}>}
 */
function getNavLinks(bookId, currentPage) {
  const book = BOOKS[bookId];
  if (!book) return [];
  return book.pages.map((p) => ({
    ...p,
    active: p.href === currentPage || (currentPage && p.href.startsWith(currentPage)),
  }));
}

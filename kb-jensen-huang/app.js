/* ========== 黄仁勋知识库 V2.0 ========== */
document.addEventListener('DOMContentLoaded', () => {

  // ========== 1. 折叠/展开交互 ==========
  document.querySelectorAll('.card-header[data-toggle]').forEach(header => {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = header.closest('.timeline-item, .concept-card, .company-card, .person-card, .speech-card, .timeline-card');
      if (!card) return;
      const wasExpanded = card.classList.contains('expanded');
      // 同类型卡片手风琴模式（可选：取消注释以下行实现）
      // const type = header.dataset.toggle;
      // document.querySelectorAll(`.card-header[data-toggle="${type}"]`).forEach(h => {
      //   h.closest('.timeline-item, .concept-card, .company-card, .person-card, .speech-card, .timeline-card')?.classList.remove('expanded');
      // });
      card.classList.toggle('expanded', !wasExpanded);
    });
  });

  // ========== 2. 导航卡片平滑滚动 ==========
  document.querySelectorAll('.nav-card, .footer-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ========== 3. 搜索过滤 ==========
  const searchInput = document.getElementById('searchInput');
  const searchCount = document.getElementById('searchCount');
  const allSearchableCards = document.querySelectorAll('.searchable [data-keywords]');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;

      allSearchableCards.forEach(card => {
        const keywords = (card.dataset.keywords || '').toLowerCase();
        const textContent = card.textContent.toLowerCase();
        const match = !query || keywords.includes(query) || textContent.includes(query);
        card.classList.toggle('search-hidden', !match);
        if (match) visibleCount++;
      });

      // 更新计数
      if (query) {
        searchCount.textContent = `${visibleCount} 条结果`;
      } else {
        searchCount.textContent = '';
      }

      // 自动展开匹配项（如果只有少量结果）
      if (query && visibleCount <= 5) {
        allSearchableCards.forEach(card => {
          const isHidden = card.classList.contains('search-hidden');
          if (!isHidden) {
            const parent = card.closest('.timeline-item') || card;
            parent.classList.add('expanded');
          }
        });
      }
    });

    // Ctrl+K / Cmd+K 快捷键聚焦搜索
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.blur();
      }
    });
  }

  // ========== 4. 语录卡片点击复制 ==========
  document.querySelectorAll('.quote-card').forEach(card => {
    card.addEventListener('click', () => {
      const text = card.querySelector('p').textContent.trim();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板'));
      } else {
        showToast(text.substring(0, 30) + '…');
      }
    });
  });

  // ========== 5. AI 问答按钮 ==========
  const aiBtn = document.getElementById('aiChatBtn');
  if (aiBtn) {
    aiBtn.addEventListener('click', () => showToast('AI 问答功能即将上线，敬请期待！'));
  }

  // ========== 6. Toast 提示 ==========
  function showToast(msg) {
    let toast = document.querySelector('.kb-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'kb-toast';
      toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: #1a1a1a; color: #fff; padding: 10px 24px; border-radius: 8px;
        font-size: 0.85rem; z-index: 9999; opacity: 0; transition: opacity 0.3s;
        pointer-events: none; white-space: nowrap; max-width: 90vw; text-align: center;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
  }

  // ========== 7. 回到顶部按钮 ==========
  const backToTop = document.createElement('button');
  backToTop.innerHTML = '↑';
  backToTop.title = '回到顶部';
  backToTop.style.cssText = `
    position: fixed; bottom: 30px; right: 20px; width: 38px; height: 38px;
    border-radius: 50%; background: #2d6a4f; color: #fff;
    border: none; font-size: 1.1rem; cursor: pointer; opacity: 0;
    transition: opacity 0.3s, transform 0.3s; z-index: 999;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', () => {
    const show = window.scrollY > 400;
    backToTop.style.opacity = show ? '1' : '0';
    backToTop.style.transform = show ? 'scale(1)' : 'scale(0.8)';
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ========== 8. 滚动渐入动画 ==========
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });

  document.querySelectorAll('.content-section, .about-section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(16px)';
    section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(section);
  });
});

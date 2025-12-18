/**
 * Virtual List for rendering large account lists efficiently
 * Optimized for smooth scrolling and minimal re-renders
 */

export interface VirtualListConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number;
  threshold: number; // Min items to enable virtualization
}

export interface VirtualListState {
  scrollTop: number;
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
}

const DEFAULT_CONFIG: VirtualListConfig = {
  itemHeight: 54, // Optimized card height
  containerHeight: 400,
  overscan: 5, // Increased for smoother scrolling
  threshold: 200, // Disabled for grouped lists - enable only for very large lists
};

export function calculateVirtualList(
  totalItems: number,
  scrollTop: number,
  config: Partial<VirtualListConfig> = {}
): VirtualListState {
  const { itemHeight, containerHeight, overscan } = { ...DEFAULT_CONFIG, ...config };

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(totalItems, startIndex + visibleCount + overscan * 2);
  const offsetY = startIndex * itemHeight;
  const totalHeight = totalItems * itemHeight;

  return { scrollTop, startIndex, endIndex, offsetY, totalHeight };
}

export function generateVirtualListScript(): string {
  return `
    const VIRTUAL_CONFIG = {
      itemHeight: 54,
      containerHeight: 400,
      overscan: 5,
      threshold: 30,
      enabled: false,
      rafId: null,
      lastScrollTop: -1,
    };
    
    let virtualState = { scrollTop: 0, startIndex: 0, endIndex: 50, offsetY: 0, totalHeight: 0 };
    
    function initVirtualList(totalItems) {
      VIRTUAL_CONFIG.enabled = totalItems >= VIRTUAL_CONFIG.threshold;
      if (!VIRTUAL_CONFIG.enabled) return;
      
      const list = document.getElementById('accountList');
      if (!list) return;
      
      // Setup virtual container
      list.classList.add('virtual-list-viewport');
      list.style.height = VIRTUAL_CONFIG.containerHeight + 'px';
      list.style.overflow = 'auto';
      list.style.position = 'relative';
      
      // Create spacer for total height
      const spacer = document.createElement('div');
      spacer.className = 'virtual-list-spacer';
      spacer.style.height = (totalItems * VIRTUAL_CONFIG.itemHeight) + 'px';
      spacer.style.position = 'absolute';
      spacer.style.top = '0';
      spacer.style.left = '0';
      spacer.style.right = '0';
      spacer.style.pointerEvents = 'none';
      list.insertBefore(spacer, list.firstChild);
      
      // Wrap cards in content container
      const content = document.createElement('div');
      content.className = 'virtual-list-content';
      content.style.position = 'relative';
      content.style.willChange = 'transform';
      
      const cards = Array.from(list.querySelectorAll('.card'));
      cards.forEach(card => content.appendChild(card));
      list.appendChild(content);
      
      // Throttled scroll handler
      list.addEventListener('scroll', () => {
        if (VIRTUAL_CONFIG.rafId) return;
        VIRTUAL_CONFIG.rafId = requestAnimationFrame(() => {
          updateVirtualList(list, totalItems);
          VIRTUAL_CONFIG.rafId = null;
        });
      }, { passive: true });
      
      updateVirtualList(list, totalItems);
    }
    
    function updateVirtualList(container, totalItems) {
      const scrollTop = container.scrollTop;
      
      // Skip if scroll position hasn't changed significantly
      if (Math.abs(scrollTop - VIRTUAL_CONFIG.lastScrollTop) < 5) return;
      VIRTUAL_CONFIG.lastScrollTop = scrollTop;
      
      const visibleCount = Math.ceil(VIRTUAL_CONFIG.containerHeight / VIRTUAL_CONFIG.itemHeight);
      const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_CONFIG.itemHeight) - VIRTUAL_CONFIG.overscan);
      const endIndex = Math.min(totalItems, startIndex + visibleCount + VIRTUAL_CONFIG.overscan * 2);
      
      // Skip if range hasn't changed
      if (startIndex === virtualState.startIndex && endIndex === virtualState.endIndex) return;
      
      virtualState = { 
        scrollTop, 
        startIndex, 
        endIndex, 
        offsetY: startIndex * VIRTUAL_CONFIG.itemHeight,
        totalHeight: totalItems * VIRTUAL_CONFIG.itemHeight
      };
      
      // Batch DOM updates
      const content = container.querySelector('.virtual-list-content');
      if (!content) return;
      
      const cards = content.querySelectorAll('.card');
      const fragment = document.createDocumentFragment();
      
      cards.forEach((card, i) => {
        const visible = i >= startIndex && i < endIndex;
        if (visible !== (card.style.display !== 'none')) {
          card.style.display = visible ? '' : 'none';
        }
      });
      
      // Use transform for GPU acceleration
      content.style.transform = 'translate3d(0, ' + virtualState.offsetY + 'px, 0)';
    }
    
    // Lazy load usage data for visible cards
    function lazyLoadUsage() {
      if (!VIRTUAL_CONFIG.enabled) return;
      
      const content = document.querySelector('.virtual-list-content');
      if (!content) return;
      
      const visibleCards = Array.from(content.querySelectorAll('.card'))
        .filter((card, i) => i >= virtualState.startIndex && i < virtualState.endIndex);
      
      visibleCards.forEach(card => {
        const email = card.dataset.email;
        if (email && !card.dataset.usageLoaded) {
          card.dataset.usageLoaded = 'pending';
          vscode.postMessage({ command: 'loadUsage', account: email });
        }
      });
    }
  `;
}

/**
 * Virtual List for rendering large account lists efficiently
 */

export interface VirtualListConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number; // Extra items to render above/below viewport
}

export interface VirtualListState {
  scrollTop: number;
  startIndex: number;
  endIndex: number;
  offsetY: number;
}

const DEFAULT_CONFIG: VirtualListConfig = {
  itemHeight: 60, // Card height + margin
  containerHeight: 400,
  overscan: 3,
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

  return { scrollTop, startIndex, endIndex, offsetY };
}

export function generateVirtualListScript(): string {
  return `
    const VIRTUAL_CONFIG = {
      itemHeight: 60,
      containerHeight: 400,
      overscan: 3,
      enabled: false, // Enable when > 50 items
    };
    
    let virtualState = { scrollTop: 0, startIndex: 0, endIndex: 50, offsetY: 0 };
    
    function initVirtualList(totalItems) {
      VIRTUAL_CONFIG.enabled = totalItems > 50;
      if (!VIRTUAL_CONFIG.enabled) return;
      
      const list = document.getElementById('accountList');
      if (!list) return;
      
      // Wrap in virtual container
      list.classList.add('virtual-list-viewport');
      list.style.height = VIRTUAL_CONFIG.containerHeight + 'px';
      
      list.addEventListener('scroll', () => {
        requestAnimationFrame(() => updateVirtualList(list, totalItems));
      });
      
      updateVirtualList(list, totalItems);
    }
    
    function updateVirtualList(container, totalItems) {
      const scrollTop = container.scrollTop;
      const visibleCount = Math.ceil(VIRTUAL_CONFIG.containerHeight / VIRTUAL_CONFIG.itemHeight);
      const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_CONFIG.itemHeight) - VIRTUAL_CONFIG.overscan);
      const endIndex = Math.min(totalItems, startIndex + visibleCount + VIRTUAL_CONFIG.overscan * 2);
      
      virtualState = { scrollTop, startIndex, endIndex, offsetY: startIndex * VIRTUAL_CONFIG.itemHeight };
      
      // Update visibility of cards
      const cards = container.querySelectorAll('.card');
      cards.forEach((card, i) => {
        card.style.display = (i >= startIndex && i < endIndex) ? '' : 'none';
      });
      
      // Update content offset
      const content = container.querySelector('.virtual-list-content');
      if (content) {
        content.style.transform = 'translateY(' + virtualState.offsetY + 'px)';
      }
    }
  `;
}

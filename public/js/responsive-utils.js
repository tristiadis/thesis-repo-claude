/**
 * Responsive Utilities
 * Helper functions for responsive behavior
 */

// Detect device type
function isMobile() {
  return window.innerWidth < 640;
}

function isTablet() {
  return window.innerWidth >= 640 && window.innerWidth < 1024;
}

function isDesktop() {
  return window.innerWidth >= 1024;
}

// Get current breakpoint
function getCurrentBreakpoint() {
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
}

// Debounce function for resize events
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Handle responsive behavior on window resize
let currentBreakpoint = getCurrentBreakpoint();

const handleResize = debounce(() => {
  const newBreakpoint = getCurrentBreakpoint();

  if (newBreakpoint !== currentBreakpoint) {
    currentBreakpoint = newBreakpoint;

    // Dispatch custom event for breakpoint change
    window.dispatchEvent(new CustomEvent('breakpointChange', {
      detail: { breakpoint: newBreakpoint }
    }));

    // Log for debugging (can be removed in production)
    console.log('Breakpoint changed:', newBreakpoint);
  }
}, 300);

window.addEventListener('resize', handleResize);

// Close mobile menu on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isMobile()) {
    // Dispatch event to close mobile menu
    window.dispatchEvent(new CustomEvent('closeMobileMenu'));
  }
});

// Handle viewport height fix for mobile browsers
function setVH() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setVH();
window.addEventListener('resize', debounce(setVH, 100));

// Smooth scroll polyfill for older browsers
if (!('scrollBehavior' in document.documentElement.style)) {
  const scrollTo = (element, to, duration) => {
    const start = element.scrollTop;
    const change = to - start;
    let currentTime = 0;
    const increment = 20;

    const animateScroll = () => {
      currentTime += increment;
      const val = Math.easeInOutQuad(currentTime, start, change, duration);
      element.scrollTop = val;
      if (currentTime < duration) {
        setTimeout(animateScroll, increment);
      }
    };
    animateScroll();
  };

  Math.easeInOutQuad = function (t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  };
}

// Touch-friendly table scroll indicator
function initTableScrollIndicators() {
  const tables = document.querySelectorAll('.table-responsive');

  tables.forEach(table => {
    // Check if table is scrollable
    if (table.scrollWidth > table.clientWidth) {
      table.classList.add('has-scroll');

      // Add scroll indicator
      const indicator = document.createElement('div');
      indicator.className = 'scroll-indicator';
      indicator.innerHTML = '<i class="fas fa-chevron-right"></i> Scroll';
      indicator.style.cssText = `
        position: absolute;
        right: 10px;
        top: 10px;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10;
        transition: opacity 0.3s;
      `;

      table.style.position = 'relative';
      table.appendChild(indicator);

      // Hide indicator on scroll
      table.addEventListener('scroll', () => {
        if (table.scrollLeft > 10) {
          indicator.style.opacity = '0';
        } else {
          indicator.style.opacity = '1';
        }
      });
    }
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTableScrollIndicators);
} else {
  initTableScrollIndicators();
}

// Lazy loading images
function initLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  } else {
    // Fallback for browsers without IntersectionObserver
    images.forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}

// Initialize lazy loading
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLazyLoading);
} else {
  initLazyLoading();
}

// Handle orientation change
window.addEventListener('orientationchange', () => {
  // Force layout recalculation
  document.body.style.display = 'none';
  document.body.offsetHeight; // Force reflow
  document.body.style.display = '';

  // Recalculate viewport height
  setVH();
});

// Export utilities for use in other scripts
window.ResponsiveUtils = {
  isMobile,
  isTablet,
  isDesktop,
  getCurrentBreakpoint,
  debounce,
};

console.log('Responsive utilities loaded. Current breakpoint:', currentBreakpoint);

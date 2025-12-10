// Element Picker - Highlights elements on hover and selects on click

let isPickerActive = false;
let highlightOverlay = null;
let currentElement = null;

function startPicker() {
  if (isPickerActive) return;
  isPickerActive = true;
  
  // Create highlight overlay
  highlightOverlay = document.createElement('div');
  highlightOverlay.id = 'element-picker-overlay';
  highlightOverlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    background: rgba(0, 212, 255, 0.3);
    border: 2px solid #00d4ff;
    border-radius: 3px;
    z-index: 2147483647;
    transition: all 0.1s ease;
    display: none;
  `;
  document.body.appendChild(highlightOverlay);
  
  // Create label for selector
  const label = document.createElement('div');
  label.id = 'element-picker-label';
  label.style.cssText = `
    position: fixed;
    background: #1a1a2e;
    color: #00d4ff;
    padding: 4px 8px;
    font-size: 12px;
    font-family: monospace;
    border-radius: 3px;
    z-index: 2147483647;
    pointer-events: none;
    display: none;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  document.body.appendChild(label);
  
  // Add event listeners
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onElementClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  
  // Show instruction toast
  showPickerToast('🎯 Hover over an element and click to select. Press ESC to cancel.');
}

function stopPicker(selectedSelector = null) {
  if (!isPickerActive) return;
  isPickerActive = false;
  
  // Remove event listeners
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('click', onElementClick, true);
  document.removeEventListener('keydown', onKeyDown, true);
  
  // Remove overlay elements
  const overlay = document.getElementById('element-picker-overlay');
  const label = document.getElementById('element-picker-label');
  const toast = document.getElementById('element-picker-toast');
  
  if (overlay) overlay.remove();
  if (label) label.remove();
  if (toast) toast.remove();
  
  highlightOverlay = null;
  currentElement = null;
  
  // Save result to storage and notify
  if (selectedSelector) {
    // Save directly to storage so popup can read it
    chrome.storage.local.set({ selector: selectedSelector });
    
    // Also send message (for background script)
    chrome.runtime.sendMessage({ 
      action: 'elementSelected', 
      selector: selectedSelector 
    });
    
    // Show confirmation
    showSelectedToast(selectedSelector);
  }
}

function showSelectedToast(selector) {
  const toast = document.createElement('div');
  toast.id = 'element-picker-selected-toast';
  toast.innerHTML = `<div>✅ Element selected!</div><div style="font-size:11px;margin-top:4px;opacity:0.8;word-break:break-all;">${selector}</div>`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2ed573;
    color: #1a1a2e;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: bold;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 300px;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function onMouseMove(e) {
  const element = document.elementFromPoint(e.clientX, e.clientY);
  
  // Ignore our own overlay elements
  if (!element || element.id?.startsWith('element-picker')) return;
  
  currentElement = element;
  
  const rect = element.getBoundingClientRect();
  const overlay = document.getElementById('element-picker-overlay');
  const label = document.getElementById('element-picker-label');
  
  if (overlay) {
    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }
  
  if (label) {
    const selector = generateSelector(element);
    label.textContent = selector;
    label.style.display = 'block';
    
    // Position label above or below element
    let labelTop = rect.top - 25;
    if (labelTop < 5) labelTop = rect.bottom + 5;
    
    label.style.top = labelTop + 'px';
    label.style.left = Math.max(5, rect.left) + 'px';
  }
}

function onElementClick(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  if (currentElement) {
    const selector = generateSelector(currentElement);
    stopPicker(selector);
  }
  
  return false;
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    stopPicker(null);
  }
}

function generateSelector(element) {
  // Try ID first
  if (element.id) {
    return '#' + CSS.escape(element.id);
  }
  
  // Try unique class combination
  if (element.classList.length > 0) {
    const classes = Array.from(element.classList)
      .filter(c => !c.startsWith('element-picker'))
      .map(c => '.' + CSS.escape(c))
      .join('');
    
    if (classes && document.querySelectorAll(classes).length === 1) {
      return classes;
    }
  }
  
  // Try data attributes
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-') && attr.value) {
      const selector = `[${attr.name}="${CSS.escape(attr.value)}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }
  
  // Build path selector
  const path = [];
  let el = element;
  
  while (el && el !== document.body && path.length < 4) {
    let selector = el.tagName.toLowerCase();
    
    if (el.id) {
      selector = '#' + CSS.escape(el.id);
      path.unshift(selector);
      break;
    }
    
    if (el.classList.length > 0) {
      const mainClass = Array.from(el.classList)
        .filter(c => !c.startsWith('element-picker'))[0];
      if (mainClass) {
        selector += '.' + CSS.escape(mainClass);
      }
    }
    
    // Add nth-child if needed for uniqueness
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    el = el.parentElement;
  }
  
  return path.join(' > ');
}

function showPickerToast(message) {
  const toast = document.createElement('div');
  toast.id = 'element-picker-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a2e;
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    border: 1px solid #00d4ff;
  `;
  document.body.appendChild(toast);
}

// Make startPicker globally available
window.startPicker = startPicker;

// Listen for picker activation from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startPicker') {
    startPicker();
  } else if (message.action === 'stopPicker') {
    stopPicker(null);
  }
});

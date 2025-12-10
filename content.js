let refreshTimer = null;
let isThisTabMonitored = false;

// Check storage on page load to resume monitoring if active (only on correct URL)
chrome.storage.local.get(['isActive', 'selector', 'mode', 'searchText', 'interval', 'conditionMet', 'initialContent', 'monitoringUrl'], (data) => {
  // Only run on the URL that was being monitored
  if (data.isActive && !data.conditionMet && data.selector && data.monitoringUrl) {
    if (window.location.href === data.monitoringUrl || window.location.href.startsWith(data.monitoringUrl.split('?')[0])) {
      isThisTabMonitored = true;
      
      // Check for 403 only on monitored tab
      checkFor403Error();
      
      startMonitoring(data.selector, data.mode, data.searchText, data.interval || 10, data.initialContent);
    }
  }
});

function checkFor403Error() {
  // Check if page shows 403 error
  const is403 = document.title.toLowerCase().includes('403') ||
                document.title.toLowerCase().includes('forbidden') ||
                document.body?.innerText?.toLowerCase().includes('403 forbidden') ||
                document.body?.innerText?.toLowerCase().includes('access denied');
  
  if (is403) {
    console.log('[Auto Refresh] 403 Forbidden detected! Clearing cookies and cache...');
    show403Notification();
    
    // Ask background script to clear cookies and cache for this site
    chrome.runtime.sendMessage({ 
      action: 'clear403', 
      url: window.location.origin 
    });
  }
}

function show403Notification() {
  const notification = document.createElement('div');
  notification.id = 'refresh-403-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #ff4757, #ff6b81);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      text-align: center;
    ">
      ⚠️ 403 Forbidden Detected<br>
      <span style="font-weight:normal;font-size:12px;">Opening in incognito window in 10s...</span>
    </div>
  `;
  document.body.appendChild(notification);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start') {
    isThisTabMonitored = true;
    startMonitoring(message.selector, message.mode, message.searchText, message.interval, message.initialContent);
  } else if (message.action === 'stop') {
    stopMonitoring();
    isThisTabMonitored = false;
  }
});

function startMonitoring(selector, mode, searchText, interval, initialContent) {
  // Clear any existing timer
  stopMonitoring();
  
  // Check immediately
  if (checkCondition(selector, mode, searchText, initialContent)) {
    conditionMet();
    return;
  }
  
  // Set up refresh timer
  refreshTimer = setTimeout(() => {
    location.reload();
  }, interval * 1000);
  
  console.log(`[Auto Refresh] Monitoring "${selector}" (mode: ${mode}), refreshing in ${interval}s`);
}

function stopMonitoring() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  console.log('[Auto Refresh] Monitoring stopped');
}

function checkCondition(selector, mode, searchText, initialContent) {
  const element = document.querySelector(selector);
  
  if (!element) {
    console.log(`[Auto Refresh] Element not found: ${selector}`);
    return false;
  }
  
  const currentContent = element.innerText || element.textContent;
  
  switch (mode) {
    case 'change':
      const changed = currentContent !== initialContent;
      console.log(`[Auto Refresh] Checking for change: ${changed ? 'CHANGED!' : 'no change'}`);
      if (changed) {
        console.log(`[Auto Refresh] Initial: "${initialContent.substring(0, 100)}..."`);
        console.log(`[Auto Refresh] Current: "${currentContent.substring(0, 100)}..."`);
      }
      return changed;
      
    case 'contains':
      const contains = currentContent.toLowerCase().includes(searchText.toLowerCase());
      console.log(`[Auto Refresh] Checking for "${searchText}": ${contains ? 'FOUND!' : 'not found'}`);
      return contains;
      
    case 'notContains':
      const notContains = !currentContent.toLowerCase().includes(searchText.toLowerCase());
      console.log(`[Auto Refresh] Checking "${searchText}" disappeared: ${notContains ? 'GONE!' : 'still there'}`);
      return notContains;
      
    default:
      return false;
  }
}

function conditionMet() {
  stopMonitoring();
  
  // Update storage
  chrome.storage.local.set({ isActive: false, conditionMet: true });
  
  // Play sound via background script
  chrome.runtime.sendMessage({ action: 'playSound' });
  
  // Visual notification
  showNotification();
  
  console.log('[Auto Refresh] Condition met! Stopped monitoring.');
}

function showNotification() {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #00d4ff, #6c5ce7);
      color: white;
      padding: 20px 30px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      animation: slideIn 0.5s ease;
    ">
      ✅ Condition Met!
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;
  document.body.appendChild(notification);
  
  // Remove after 10 seconds
  setTimeout(() => notification.remove(), 10000);
}

// Background service worker for playing sounds

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'playSound') {
    playAlertSound();
  } else if (message.action === 'elementSelected') {
    // Store the selected selector so popup can retrieve it
    chrome.storage.local.set({ selector: message.selector });
  } else if (message.action === 'clear403') {
    // Clear cookies and cache for the site, then refresh
    handle403Error(message.url, sender.tab?.id);
  } else if (message.action === 'getCurrentTabId') {
    // Return the tab ID of the sender
    sendResponse({ tabId: sender.tab?.id });
    return true;  // Keep channel open for async response
  }
});

async function handle403Error(originUrl, tabId) {
  console.log('[Auto Refresh] Handling 403 for:', originUrl);
  
  try {
    const url = new URL(originUrl);
    
    // Clear ALL cookies (not just this domain - they may track across domains)
    const allCookies = await chrome.cookies.getAll({});
    for (const cookie of allCookies) {
      const cookieUrl = `http${cookie.secure ? 's' : ''}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
      await chrome.cookies.remove({ url: cookieUrl, name: cookie.name });
    }
    console.log(`[Auto Refresh] Cleared ${allCookies.length} cookies`);
    
    // Clear EVERYTHING for this origin
    await chrome.browsingData.remove(
      { origins: [originUrl] },
      {
        cache: true,
        cacheStorage: true,
        cookies: true,
        indexedDB: true,
        localStorage: true,
        serviceWorkers: true,
        webSQL: true
      }
    );
    
    // Also clear site data globally that might be used for fingerprinting
    await chrome.browsingData.remove(
      {},
      {
        cache: true,
        cacheStorage: true,
        indexedDB: true,
        localStorage: true,
        serviceWorkers: true
      }
    );
    console.log('[Auto Refresh] Cleared all browsing data');
    
    // Clear localStorage, sessionStorage, and IndexedDB via content script
    if (tabId) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            try {
              // Clear all storage
              localStorage.clear();
              sessionStorage.clear();
              
              // Clear IndexedDB databases
              if (indexedDB && indexedDB.databases) {
                indexedDB.databases().then(dbs => {
                  dbs.forEach(db => {
                    indexedDB.deleteDatabase(db.name);
                  });
                });
              }
              
              // Unregister all service workers
              if (navigator.serviceWorker) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                  registrations.forEach(reg => reg.unregister());
                });
              }
              
              console.log('[Auto Refresh] Cleared all client-side storage');
            } catch (e) {
              console.log('[Auto Refresh] Could not clear storage:', e);
            }
          }
        });
      } catch (e) {
        console.log('[Auto Refresh] Script injection failed:', e);
      }
      
      // Open in incognito window after 10 seconds
      setTimeout(async () => {
        try {
          // Create incognito window with the URL
          await chrome.windows.create({
            url: originUrl,
            incognito: true
          });
          // Close the old tab
          await chrome.tabs.remove(tabId);
        } catch (e) {
          // Fallback to regular reload if incognito fails
          console.log('[Auto Refresh] Could not open incognito, reloading:', e);
          chrome.tabs.reload(tabId, { bypassCache: true });
        }
      }, 10000);
    }
  } catch (error) {
    console.error('[Auto Refresh] Error clearing data:', error);
    if (tabId) {
      setTimeout(() => {
        chrome.tabs.reload(tabId, { bypassCache: true });
      }, 3000);
    }
  }
}

async function playAlertSound() {
  try {
    // Create an offscreen document to play audio (required in Manifest V3)
    await createOffscreenDocument();
    
    // Send message to offscreen document to play sound
    chrome.runtime.sendMessage({ action: 'playAudioOffscreen' });
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

async function createOffscreenDocument() {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (existingContexts.length > 0) {
    return;
  }
  
  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Playing alert sound when text is found'
  });
}

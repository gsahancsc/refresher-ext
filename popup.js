document.addEventListener('DOMContentLoaded', async () => {
  const selectorInput = document.getElementById('selector');
  const pickBtn = document.getElementById('pickBtn');
  const modeSelect = document.getElementById('mode');
  const textGroup = document.getElementById('textGroup');
  const searchTextInput = document.getElementById('searchText');
  const intervalInput = document.getElementById('interval');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const testSoundBtn = document.getElementById('testSound');
  const statusDiv = document.getElementById('status');

  // Element picker button
  pickBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject picker script and start it
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['picker.js']
    });
    
    // Small delay to ensure script is loaded
    setTimeout(async () => {
      await chrome.tabs.sendMessage(tab.id, { action: 'startPicker' });
      window.close(); // Close popup so user can interact with page
    }, 100);
  });

  // Listen for selected element from picker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'elementSelected' && message.selector) {
      selectorInput.value = message.selector;
      chrome.storage.local.set({ selector: message.selector });
    }
  });

  // Show/hide text input based on mode
  modeSelect.addEventListener('change', () => {
    textGroup.style.display = modeSelect.value === 'change' ? 'none' : 'block';
  });

  // Load saved settings
  const data = await chrome.storage.local.get(['selector', 'mode', 'searchText', 'interval', 'isActive', 'conditionMet']);
  if (data.selector) selectorInput.value = data.selector;
  if (data.mode) {
    modeSelect.value = data.mode;
    textGroup.style.display = data.mode === 'change' ? 'none' : 'block';
  }
  if (data.searchText) searchTextInput.value = data.searchText;
  if (data.interval) intervalInput.value = data.interval;
  
  updateUI(data.isActive, data.conditionMet);

  startBtn.addEventListener('click', async () => {
    const selector = selectorInput.value.trim();
    const mode = modeSelect.value;
    const searchText = searchTextInput.value.trim();
    const interval = parseInt(intervalInput.value) || 10;
    
    if (!selector) {
      alert('Please enter a CSS selector');
      return;
    }

    if (mode !== 'change' && !searchText) {
      alert('Please enter text to search for');
      return;
    }

    // Get current tab and capture initial content
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // First, get the initial content of the element
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (sel) => {
        const el = document.querySelector(sel);
        return el ? el.innerText || el.textContent : null;
      },
      args: [selector]
    });

    if (result.result === null) {
      alert('Element not found with selector: ' + selector);
      return;
    }

    await chrome.storage.local.set({
      selector,
      mode,
      searchText,
      interval,
      isActive: true,
      conditionMet: false,
      initialContent: result.result,
      monitoringUrl: tab.url  // Save which URL is being monitored
    });

    chrome.tabs.sendMessage(tab.id, { 
      action: 'start', 
      selector,
      mode,
      searchText, 
      interval,
      initialContent: result.result
    });

    updateUI(true, false);
  });

  stopBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({ isActive: false, conditionMet: false });
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'stop' });

    updateUI(false, false);
  });

  testSoundBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'playSound' });
  });

  function updateUI(isActive, conditionMet) {
    if (conditionMet) {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      statusDiv.className = 'status found';
      statusDiv.textContent = '✅ Condition met! Monitoring stopped.';
    } else if (isActive) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      statusDiv.className = 'status active';
      statusDiv.textContent = '🔄 Monitoring active...';
    } else {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      statusDiv.className = 'status inactive';
      statusDiv.textContent = 'Not monitoring';
    }
  }
});

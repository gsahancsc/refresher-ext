chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'playAudioOffscreen') {
    playSound();
  }
});

function playSound() {
  const audio = document.getElementById('alertSound');
  audio.currentTime = 0;
  audio.play().catch(err => console.error('Audio play error:', err));
}

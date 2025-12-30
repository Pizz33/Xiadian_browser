// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('自动点击助手已安装')
})

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 页面加载完成后，检查是否需要恢复运行状态
    chrome.storage.local.get(['isRunning'], (result) => {
      if (result.isRunning) {
        // 重新注入 content script
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        })
      }
    })
  }
})


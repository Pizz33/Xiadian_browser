document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn')
  const stopBtn = document.getElementById('stopBtn')
  const statusDiv = document.getElementById('status')
  const inputValue = document.getElementById('inputValue')
  const clickedCountDiv = document.getElementById('clickedCount')
  const filledCountDiv = document.getElementById('filledCount')
  
  // 更新状态显示
  function updateStatus(isRunning) {
    if (isRunning) {
      statusDiv.textContent = '运行中...'
      statusDiv.className = 'status running'
      startBtn.disabled = true
      stopBtn.disabled = false
    } else {
      statusDiv.textContent = '已停止'
      statusDiv.className = 'status stopped'
      startBtn.disabled = false
      stopBtn.disabled = true
    }
  }
  
  // 更新统计信息
  function updateStats(clicked = 0, filled = 0) {
    if (clickedCountDiv) {
      clickedCountDiv.textContent = clicked
    }
    if (filledCountDiv) {
      filledCountDiv.textContent = filled
    }
  }
  
  // 初始化统计
  updateStats(0, 0)
  
  // 获取当前标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      console.error('[Popup] 无法获取当前标签页')
      return
    }
    
    const tabId = tabs[0].id
    
    // 检查是否正在运行
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['isRunning', 'inputValue'], (result) => {
        if (result.isRunning) {
          updateStatus(true)
        }
        if (result.inputValue) {
          inputValue.value = result.inputValue
        }
      })
    } else {
      console.warn('[Popup] chrome.storage 不可用')
    }
    
    // 开始按钮
    startBtn.addEventListener('click', async () => {
      const value = parseInt(inputValue.value) || 1
      console.log('[Popup] 开始按钮被点击，输入值:', value)
      
      // 重置统计
      updateStats(0, 0)
      
      // 保存状态
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          isRunning: true,
          inputValue: value
        })
      }
      
      try {
        // 先确保 content script 已注入
        console.log('[Popup] 开始注入 content script...')
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        })
        console.log('[Popup] Content script 注入成功')
        
        // 等待一小段时间确保脚本加载完成
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 发送消息到 content script
        console.log('[Popup] 发送开始消息到 content script...')
        chrome.tabs.sendMessage(tabId, {
          action: 'start',
          inputValue: value
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Popup] 发送消息失败:', chrome.runtime.lastError.message)
            // 再试一次
            setTimeout(() => {
              console.log('[Popup] 重试发送消息...')
              chrome.tabs.sendMessage(tabId, {
                action: 'start',
                inputValue: value
              }, (retryResponse) => {
                if (chrome.runtime.lastError) {
                  console.error('[Popup] 重试也失败:', chrome.runtime.lastError.message)
                  alert('启动失败，请刷新页面后重试')
                } else {
                  console.log('[Popup] 重试成功')
                  updateStatus(true)
                }
              })
            }, 500)
          } else {
            console.log('[Popup] 消息发送成功，响应:', response)
            updateStatus(true)
          }
        })
      } catch (error) {
        console.error('[Popup] 注入脚本失败:', error)
        alert('启动失败: ' + error.message + '\n请刷新页面后重试')
      }
    })
    
    // 停止按钮
    stopBtn.addEventListener('click', () => {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ isRunning: false })
      }
      
      chrome.tabs.sendMessage(tabId, {
        action: 'stop'
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error:', chrome.runtime.lastError)
        }
        updateStatus(false)
      })
    })
  })
  
  // 监听来自 content script 的状态更新
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'statusUpdate') {
      updateStatus(message.isRunning)
    } else if (message.action === 'statsUpdate') {
      updateStats(message.clickedCount, message.filledCount)
    }
  })
})


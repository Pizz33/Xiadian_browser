// 自动点击助手 Content Script
let isRunning = false
let inputValue = 1
let clickInterval = null
let processedElements = new Set()
let clickedCount = 0  // 已点击的元素数量
let filledCount = 0   // 已填充的输入框数量

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[自动点击助手] 收到消息:', message)
  
  if (message.action === 'start') {
    console.log('[自动点击助手] 开始启动，输入值:', message.inputValue)
    startAutoClick(message.inputValue || 1)
    sendResponse({ success: true, message: '已开始' })
  } else if (message.action === 'stop') {
    console.log('[自动点击助手] 收到停止消息')
    stopAutoClick()
    sendResponse({ success: true, message: '已停止' })
  } else if (message.action === 'getStats') {
    // 获取统计信息
    sendResponse({ 
      clickedCount: clickedCount, 
      filledCount: filledCount 
    })
  }
  
  // 返回 true 表示异步响应
  return true
})

// 从存储中恢复状态
if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['isRunning', 'inputValue'], (result) => {
    if (result.isRunning) {
      startAutoClick(result.inputValue || 1)
    }
  })
}

// 开始自动点击
function startAutoClick(value) {
  if (isRunning) {
    console.log('[自动点击助手] 已经在运行中，重新启动')
    stopAutoClick()
  }
  
  console.log('[自动点击助手] 初始化，输入值:', value)
  isRunning = true
  inputValue = value
  
  // 清空已处理元素集合和统计
  processedElements.clear()
  clickedCount = 0
  filledCount = 0
  
  // 通知 popup 更新状态和统计
  updateStats()
  
  // 通知 popup 更新状态
  try {
    chrome.runtime.sendMessage({
      action: 'statusUpdate',
      isRunning: true
    })
  } catch (e) {
    console.warn('[自动点击助手] 发送状态更新失败:', e)
  }
  
  console.log('[自动点击助手] 开始运行，输入值:', inputValue)
  console.log('[自动点击助手] 当前页面 URL:', window.location.href)
  
  // 立即执行一次
  setTimeout(() => {
    console.log('[自动点击助手] 执行第一次处理...')
    processPage()
  }, 1000)
  
  // 每 2 秒执行一次（加快速度）
  clickInterval = setInterval(() => {
    if (isRunning) {
      processPage()
    }
  }, 2000)
  
  console.log('[自动点击助手] 定时器已启动，间隔 2 秒')
}

// 停止自动点击
function stopAutoClick() {
  if (!isRunning) return
  
  isRunning = false
  
  if (clickInterval) {
    clearInterval(clickInterval)
    clickInterval = null
  }
  
  processedElements.clear()
  
  // 通知 popup 更新状态
  chrome.runtime.sendMessage({
    action: 'statusUpdate',
    isRunning: false
  })
  
  console.log('[自动点击助手] 已停止')
  console.log(`[自动点击助手] 统计: 点击了 ${clickedCount} 个元素，填充了 ${filledCount} 个输入框`)
}

// 更新统计信息
function updateStats() {
  try {
    chrome.runtime.sendMessage({
      action: 'statsUpdate',
      clickedCount: clickedCount,
      filledCount: filledCount
    })
  } catch (e) {
    console.warn('[自动点击助手] 发送统计更新失败:', e)
  }
}

// 处理页面元素
function processPage() {
  if (!isRunning) {
    console.log('[自动点击助手] 未运行，跳过处理')
    return
  }
  
  console.log('[自动点击助手] 开始处理页面元素...')
  
  // 查找所有可点击的元素
  const clickableElements = findClickableElements()
  console.log('[自动点击助手] 找到可点击元素:', clickableElements.length, '个')
  
  // 查找所有输入框
  const inputElements = findInputElements()
  console.log('[自动点击助手] 找到输入框:', inputElements.length, '个')
  
  // 处理输入框
  inputElements.forEach((input, index) => {
    if (!processedElements.has(input)) {
      console.log(`[自动点击助手] 处理输入框 ${index + 1}:`, input)
      fillInput(input)
      processedElements.add(input)
      filledCount++
      updateStats()
    }
  })
  
  // 处理可点击元素（每次只点击一个，避免过快）
  if (clickableElements.length > 0) {
    const unprocessedElements = clickableElements.filter(el => !processedElements.has(el))
    if (unprocessedElements.length > 0) {
      const element = unprocessedElements[0]
      console.log('[自动点击助手] 准备点击元素:', element)
      clickElement(element)
      processedElements.add(element)
      clickedCount++
      updateStats()
    }
  }
}

// 查找可点击的元素
function findClickableElements() {
  const selectors = [
    'button:not([disabled])',
    'a[href]:not([href="#"]):not([href="javascript:void(0)"])',
    'input[type="submit"]:not([disabled])',
    'input[type="button"]:not([disabled])',
    '[role="button"]:not([disabled])',
    '[onclick]',
    '.btn:not([disabled])',
    '.button:not([disabled])',
    '[class*="button"]:not([disabled])',
    '[class*="btn"]:not([disabled])'
  ]
  
  const elements = []
  const seen = new Set() // 避免重复
  
  selectors.forEach(selector => {
    try {
      const found = document.querySelectorAll(selector)
      found.forEach(el => {
        // 检查元素是否可见且未处理过
        if (isElementVisible(el) && !seen.has(el)) {
          elements.push(el)
          seen.add(el)
        }
      })
    } catch (e) {
      console.warn('[自动点击助手] Selector 错误:', selector, e)
    }
  })
  
  console.log(`[自动点击助手] 找到 ${elements.length} 个可点击元素`)
  return elements
}

// 查找输入框元素
function findInputElements() {
  const selectors = [
    'input[type="text"]',
    'input[type="number"]',
    'input[type="email"]',
    'input[type="password"]',
    'input[type="tel"]',
    'input[type="search"]',
    'input:not([type])',
    'textarea'
  ]
  
  const elements = []
  selectors.forEach(selector => {
    try {
      const found = document.querySelectorAll(selector)
      found.forEach(el => {
        // 检查元素是否可见且未禁用
        if (isElementVisible(el) && !el.disabled && !el.readOnly) {
          elements.push(el)
        }
      })
    } catch (e) {
      console.warn('Selector error:', selector, e)
    }
  })
  
  return elements
}

// 检查元素是否可见
function isElementVisible(element) {
  if (!element) return false
  
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }
  
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

// 填充输入框
function fillInput(input) {
  try {
    // 如果输入框已经有值，跳过
    if (input.value && input.value.trim() !== '') {
      return
    }
    
    // 设置值
    input.value = inputValue
    
    // 触发输入事件
    const events = ['input', 'change', 'keyup', 'keydown']
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true })
      input.dispatchEvent(event)
    })
    
    console.log('[自动点击助手] 已填充输入框:', input, '值:', inputValue)
    
    // 如果是密码框，也填充
    if (input.type === 'password') {
      input.value = inputValue
    }
    
    // 尝试自动提交（查找提交按钮或表单）
    setTimeout(() => {
      tryAutoSubmit(input)
    }, 500)
    
  } catch (e) {
    console.error('[自动点击助手] 填充输入框失败:', e)
  }
}

// 尝试自动提交
function tryAutoSubmit(input) {
  try {
    // 查找表单
    const form = input.closest('form')
    if (form) {
      // 查找提交按钮
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]')
      if (submitBtn && isElementVisible(submitBtn)) {
        clickElement(submitBtn)
        return
      }
      
      // 如果没有提交按钮，尝试提交表单
      if (form.onsubmit || form.submit) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
        if (form.dispatchEvent(submitEvent)) {
          form.submit()
        }
        return
      }
    }
    
    // 查找附近的提交按钮
    const nearbySubmit = input.parentElement?.querySelector('button[type="submit"], input[type="submit"]')
    if (nearbySubmit && isElementVisible(nearbySubmit)) {
      clickElement(nearbySubmit)
    }
  } catch (e) {
    console.error('[自动点击助手] 自动提交失败:', e)
  }
}

// 点击元素
function clickElement(element) {
  try {
    // 检查元素是否仍然存在且可见
    if (!element) {
      console.log('[自动点击助手] 元素为空')
      return false
    }
    
    if (!document.contains(element)) {
      console.log('[自动点击助手] 元素不在 DOM 中')
      return false
    }
    
    if (!isElementVisible(element)) {
      console.log('[自动点击助手] 元素不可见，跳过')
      return false
    }
    
    const elementInfo = {
      tag: element.tagName,
      id: element.id || '',
      class: element.className || '',
      text: (element.textContent || '').substring(0, 30).trim()
    }
    
    console.log('[自动点击助手] 准备点击元素:', elementInfo)
    
    // 滚动到元素位置
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    } catch (e) {
      console.warn('[自动点击助手] 滚动失败:', e)
    }
    
    // 等待滚动完成
    setTimeout(() => {
      try {
        // 先尝试直接点击（最可靠的方式）
        if (typeof element.click === 'function') {
          element.focus() // 先聚焦
          element.click()
          console.log('[自动点击助手] ✓ 使用 click() 方法点击成功:', elementInfo.text || elementInfo.id || elementInfo.class)
          return true
        } else {
          // 如果 click() 不可用，使用事件
          const events = [
            new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, button: 0 }),
            new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, button: 0 }),
            new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 })
          ]
          
          events.forEach(event => {
            element.dispatchEvent(event)
          })
          console.log('[自动点击助手] ✓ 使用事件点击:', elementInfo.text || elementInfo.id || elementInfo.class)
          return true
        }
      } catch (e) {
        console.error('[自动点击助手] ✗ 点击过程中出错:', e, elementInfo)
        return false
      }
    }, 800)
    
    return true
    
  } catch (e) {
    console.error('[自动点击助手] ✗ 点击元素失败:', e)
    return false
  }
}

// 监听页面变化（动态加载的内容）
const observer = new MutationObserver(() => {
  if (isRunning) {
    // 重置已处理元素集合，允许处理新元素
    // processedElements.clear()
  }
})

observer.observe(document.body, {
  childList: true,
  subtree: true
})

console.log('[自动点击助手] Content Script 已加载')


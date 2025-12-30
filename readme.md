## 一、项目概述

本项目开发了一款基于 Chrome Manifest V3 的浏览器扩展，实现了页面元素的自动点击与表单自动填充功能。扩展采用多模块架构设计，通过 Chrome Extensions API 实现模块间通信，支持智能元素识别、自动化交互和动态内容监听等核心功能。

## 二、技术架构

### 2.1 架构设计

- **Manifest V3**：采用最新扩展规范，使用 Service Worker 替代 Background Page
- **多模块架构**：
   - Popup UI（用户界面层）
   - Content Script（页面交互层）
   - Background Service Worker（后台服务层）
- **消息传递机制**：使用 Chrome Runtime Message API 实现模块间通信

### 2.2 核心技术栈

- JavaScript ES6+
- Chrome Extensions API：
   - `chrome.scripting`：动态脚本注入
   - `chrome.storage`：状态持久化
   - `chrome.tabs`：标签页管理
   - `chrome.runtime`：消息传递
 
## 应用场景

1. **自动化测试**：快速遍历页面功能点
2. **数据采集**：自动填写表单并提交
3. **功能探索**：自动点击发现页面功能
4. **回归测试**：批量验证页面交互

## 效果展示
<img width="1407" height="338" alt="image" src="https://github.com/user-attachments/assets/74b46e05-5c8c-4715-bbcc-1f5eea986cca" />

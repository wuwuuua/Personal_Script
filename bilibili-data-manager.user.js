// ==UserScript==
// @name         B站数据管理器
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  自动获取并保存B站数据，在指定页面查询
// @author       You
// @match        *://*.bilibili.com/*
// @match        http://192.168.31.173:12345/*
// @grant        GM_cookie
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'bilibili_saved_data';
    const isBilibiliSite = window.location.hostname.includes('bilibili.com');

    // 保存数据到GM存储
    function saveData(data) {
        const saveData = {
            data: data,
            timestamp: Date.now(),
            url: window.location.href
        };
        GM_setValue(STORAGE_KEY, saveData);
        console.log('✅ 数据已保存到GM存储');
    }

    // 从GM存储读取数据
    function loadData() {
        return GM_getValue(STORAGE_KEY, null);
    }

    // 删除保存的数据
    function deleteData() {
        GM_deleteValue(STORAGE_KEY);
    }

    // ===== B站页面专用功能 =====

    // 目标Cookie列表
    const targetCookies = ['SESSDATA', 'bili_jct', 'buvid3', 'DedeUserID'];

    // 防止重复保存
    let lastSavedData = null;

    // 检查数据是否完整
    function isDataComplete(data) {
        // 检查所有必需的cookie是否存在
        const hasAllCookies = targetCookies.every(key => data.cookies[key]);

        // 检查 localStorage 数据
        const hasLocalStorage = data.localStorage.ac_time_value;

        return hasAllCookies && hasLocalStorage;
    }
    function getCookies() {
        return new Promise((resolve, reject) => {
            GM_cookie.list({
                url: window.location.href
            }, (cookies, error) => {
                if (error) {
                    reject(error);
                    return;
                }

                const result = {};
                targetCookies.forEach(name => {
                    const cookie = cookies.find(c => c.name === name);
                    if (cookie) {
                        result[name] = cookie.value;
                    }
                });

                resolve(result);
            });
        });
    }

    // 获取LocalStorage数据
    function getLocalStorage() {
        const acTimeValue = localStorage.getItem('ac_time_value');
        return {
            ac_time_value: acTimeValue
        };
    }

    // 格式化并输出数据
    function displayData() {
        getCookies().then(cookies => {
            const localStorageData = getLocalStorage();

            const allData = {
                cookies: cookies,
                localStorage: localStorageData
            };

            // 控制台输出
            console.log('=== B站数据获取 ===');
            console.log('Cookie数据:', cookies);
            console.log('LocalStorage数据:', localStorageData);
            console.log('完整JSON:', JSON.stringify(allData, null, 2));

            // 检查数据是否完整
            if (!isDataComplete(allData)) {
                console.log('⚠️ 数据不完整，跳过保存');
                console.log('缺少的Cookie:', targetCookies.filter(key => !allData.cookies[key]));
                console.log('ac_time_value:', allData.localStorage.ac_time_value);
                return allData;
            }

            // 检查是否与上次保存的数据相同
            const dataStr = JSON.stringify(allData);
            if (lastSavedData === dataStr) {
                console.log('ℹ️ 数据未变化，跳过保存');
                return allData;
            }

            // 自动保存数据
            saveData(allData);
            lastSavedData = dataStr;

            // 显示通知
            GM_notification({
                title: 'B站数据已保存',
                text: '数据已自动保存，可在 http://192.168.31.173:12345/ 查看',
                timeout: 3000
            });

            return allData;
        }).catch(error => {
            console.error('获取Cookie失败:', error);
            GM_notification({
                title: '获取失败',
                text: '获取Cookie数据失败: ' + error.message,
                timeout: 5000
            });
        });
    }

    // ===== 查询页面专用功能 =====

    // 格式化时间为几分钟前
    function formatTimeAgo(timestamp) {
        if (!timestamp) return '未知';
        const timeDiff = Date.now() - timestamp;
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        if (minutesAgo < 1) return '刚刚';
        return `${minutesAgo}分钟前`;
    }

    // 显示已保存的数据
    function showSavedData() {
        const savedData = loadData();

        // 调试：在控制台输出完整数据
        console.log('=== 从GM存储读取的数据 ===');
        console.log('完整对象:', savedData);
        if (savedData && savedData.data) {
            console.log('Cookie数据:', savedData.data.cookies);
            console.log('LocalStorage数据:', savedData.data.localStorage);
            console.log('ac_time_value:', savedData.data.localStorage.ac_time_value);
        }

        // 移除已存在的面板
        const existingPanel = document.getElementById('bilibili-viewer-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // 创建面板
        const panel = document.createElement('div');
        panel.id = 'bilibili-viewer-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            background: #fff;
            border: 2px solid #23ade5;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 999999;
            font-family: Arial, sans-serif;
            animation: slideIn 0.3s ease;
        `;

        // 添加动画样式
        if (!document.getElementById('bilibili-viewer-style')) {
            const style = document.createElement('style');
            style.id = 'bilibili-viewer-style';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        let content = '';
        const timeStr = savedData ? formatTimeAgo(savedData.timestamp) : '';

        if (!savedData) {
            content = `
                <div style="padding: 12px 16px; background: linear-gradient(135deg, #23ade5, #00a1d6); color: white; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 14px;">🔍 B站数据查询器</strong>
                    <button id="close-panel" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 18px; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
                <div style="padding: 30px 16px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 12px;">📭</div>
                    <p style="color: #666; font-size: 14px; margin: 0;">暂无保存的数据</p>
                </div>
                <div style="padding: 16px; border-top: 1px solid #f0f0f0;">
                    <button id="refresh-btn" style="width: 100%; padding: 10px; background: linear-gradient(135deg, #23ade5, #00a1d6); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold;">
                        🔄 刷新查询
                    </button>
                </div>
            `;
        } else {
            const cookies = savedData.data.cookies;
            const localStorage = savedData.data.localStorage;

            content = `
                <div style="padding: 10px 14px; background: linear-gradient(135deg, #23ade5, #00a1d6); color: white; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 13px;">🔍 B站数据查询器 · ${timeStr}</strong>
                    <button id="close-panel" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 18px; cursor: pointer; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
                <div style="padding: 12px 14px; font-size: 12px;">
                    <div style="margin: 6px 0; padding: 8px 10px; background: #f5f5f5; border-radius: 4px; border-left: 3px solid #23ade5; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="flex: 1; min-width: 0;">
                            <strong style="color: #23ade5;">SESSDATA</strong>
                            <code style="color: #333; font-size: 10px; word-break: break-all;">${cookies.SESSDATA || '未找到'}</code>
                        </div>
                        <button class="copy-row" data-value="${cookies.SESSDATA || ''}" style="flex-shrink: 0; padding: 4px 8px; background: #23ade5; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📋</button>
                    </div>
                    <div style="margin: 6px 0; padding: 8px 10px; background: #f5f5f5; border-radius: 4px; border-left: 3px solid #23ade5; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="flex: 1; min-width: 0;">
                            <strong style="color: #23ade5;">bili_jct</strong>
                            <code style="color: #333; font-size: 10px; word-break: break-all;">${cookies.bili_jct || '未找到'}</code>
                        </div>
                        <button class="copy-row" data-value="${cookies.bili_jct || ''}" style="flex-shrink: 0; padding: 4px 8px; background: #23ade5; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📋</button>
                    </div>
                    <div style="margin: 6px 0; padding: 8px 10px; background: #f5f5f5; border-radius: 4px; border-left: 3px solid #23ade5; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="flex: 1; min-width: 0;">
                            <strong style="color: #23ade5;">buvid3</strong>
                            <code style="color: #333; font-size: 10px; word-break: break-all;">${cookies.buvid3 || '未找到'}</code>
                        </div>
                        <button class="copy-row" data-value="${cookies.buvid3 || ''}" style="flex-shrink: 0; padding: 4px 8px; background: #23ade5; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📋</button>
                    </div>
                    <div style="margin: 6px 0; padding: 8px 10px; background: #f5f5f5; border-radius: 4px; border-left: 3px solid #23ade5; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="flex: 1; min-width: 0;">
                            <strong style="color: #23ade5;">DedeUserID</strong>
                            <code style="color: #333; font-size: 10px; word-break: break-all;">${cookies.DedeUserID || '未找到'}</code>
                        </div>
                        <button class="copy-row" data-value="${cookies.DedeUserID || ''}" style="flex-shrink: 0; padding: 4px 8px; background: #23ade5; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📋</button>
                    </div>
                    <div style="margin: 6px 0; padding: 8px 10px; background: #f5f5f5; border-radius: 4px; border-left: 3px solid #23ade5; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="flex: 1; min-width: 0;">
                            <strong style="color: #23ade5;">ac_time_value</strong>
                            <code style="color: #333; font-size: 10px; word-break: break-all;">${localStorage.ac_time_value || '未找到'}</code>
                        </div>
                        <button class="copy-row" data-value="${localStorage.ac_time_value || ''}" style="flex-shrink: 0; padding: 4px 8px; background: #23ade5; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📋</button>
                    </div>
                </div>
            `;
        }

        panel.innerHTML = content;
        document.body.appendChild(panel);

        // 关闭按钮
        const closeBtn = document.getElementById('close-panel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                panel.style.animation = 'slideIn 0.2s ease reverse';
                setTimeout(() => panel.remove(), 200);
            });
        }

        // 刷新按钮（仅无数据时显示）
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                panel.remove();
                showSavedData();
            });
        }

        // 单行复制按钮
        const copyButtons = panel.querySelectorAll('.copy-row');
        copyButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const value = this.getAttribute('data-value');
                console.log('复制按钮被点击，值:', value);

                if (!value || value === '未找到') {
                    GM_notification({
                        title: '复制失败',
                        text: '该数据为空',
                        timeout: 2000
                    });
                    return;
                }

                // 使用传统的复制方法（兼容非HTTPS环境）
                const textarea = document.createElement('textarea');
                textarea.value = value;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                textarea.style.top = '0';
                textarea.style.left = '0';
                document.body.appendChild(textarea);

                // 选中并复制
                textarea.select();
                textarea.setSelectionRange(0, 99999); // 兼容移动设备

                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textarea);

                    if (successful) {
                        const originalText = this.textContent;
                        this.textContent = '✅';
                        this.style.background = '#52c41a';
                        GM_notification({
                            title: '复制成功',
                            text: '数据已复制到剪贴板',
                            timeout: 2000
                        });
                        setTimeout(() => {
                            this.textContent = originalText;
                            this.style.background = '#23ade5';
                        }, 1500);
                    } else {
                        throw new Error('execCommand failed');
                    }
                } catch (err) {
                    console.error('复制失败:', err);
                    document.body.removeChild(textarea);
                    GM_notification({
                        title: '复制失败',
                        text: '无法复制到剪贴板',
                        timeout: 3000
                    });
                }
            });
        });

        // 点击面板外部关闭
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                panel.style.animation = 'slideIn 0.2s ease reverse';
                setTimeout(() => panel.remove(), 200);
            }
        });
    }

    // 创建查询页面的悬浮按钮
    function createViewerFloatButton() {
        const floatBtn = document.createElement('div');
        floatBtn.id = 'bilibili-viewer-btn';
        floatBtn.innerHTML = '🔍';
        floatBtn.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #23ade5, #00a1d6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(35, 173, 229, 0.4);
            z-index: 999999;
            user-select: none;
            transition: transform 0.2s, box-shadow 0.2s;
        `;

        floatBtn.addEventListener('mouseenter', () => {
            floatBtn.style.transform = 'scale(1.1)';
            floatBtn.style.boxShadow = '0 6px 16px rgba(35, 173, 229, 0.6)';
        });

        floatBtn.addEventListener('mouseleave', () => {
            floatBtn.style.transform = 'scale(1)';
            floatBtn.style.boxShadow = '0 4px 12px rgba(35, 173, 229, 0.4)';
        });

        floatBtn.addEventListener('click', () => {
            showSavedData();
        });

        // 拖动功能
        let isDragging = false;
        let startX, startY, initialX, initialY;

        floatBtn.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = floatBtn.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            floatBtn.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            floatBtn.style.left = (initialX + dx) + 'px';
            floatBtn.style.top = (initialY + dy) + 'px';
            floatBtn.style.right = 'auto';
            floatBtn.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                floatBtn.style.cursor = 'pointer';
            }
        });

        document.body.appendChild(floatBtn);
    }

    // ===== 初始化逻辑 =====

    // 添加快捷键
    document.addEventListener('keydown', (e) => {
        if (isBilibiliSite) {
            // B站页面：Alt + B 获取数据
            if (e.altKey && e.key === 'b') {
                e.preventDefault();
                displayData();
            }
        } else {
            // 查询页面：Alt + V 查看数据
            if (e.altKey && e.key === 'v') {
                e.preventDefault();
                showSavedData();
            }
        }
    });

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (isBilibiliSite) {
                    // B站页面：自动获取并保存数据
                    displayData();
                    console.log('B站数据管理器已加载（自动获取模式）');
                    console.log('- 数据已自动获取并保存');
                    console.log('- 按快捷键 Alt+B 手动获取数据');
                    console.log('- 或在控制台调用 window.getBilibiliData()');
                    window.getBilibiliData = displayData;
                } else {
                    // 查询页面：显示悬浮按钮
                    createViewerFloatButton();
                    console.log('B站数据管理器已加载（查询模式）');
                    console.log('- 点击右下角悬浮按钮查询数据');
                    console.log('- 按快捷键 Alt+V 查询数据');
                    console.log('- 或在控制台调用 window.viewBilibiliData()');
                    window.viewBilibiliData = showSavedData;
                }
            }, 1000);
        });
    } else {
        setTimeout(() => {
            if (isBilibiliSite) {
                // B站页面：自动获取并保存数据
                displayData();
                console.log('B站数据管理器已加载（自动获取模式）');
                console.log('- 数据已自动获取并保存');
                console.log('- 按快捷键 Alt+B 手动获取数据');
                console.log('- 或在控制台调用 window.getBilibiliData()');
                window.getBilibiliData = displayData;
            } else {
                // 查询页面：显示悬浮按钮
                createViewerFloatButton();
                console.log('B站数据管理器已加载（查询模式）');
                console.log('- 点击右下角悬浮按钮查询数据');
                console.log('- 按快捷键 Alt+V 查询数据');
                console.log('- 或在控制台调用 window.viewBilibiliData()');
                window.viewBilibiliData = showSavedData;
            }
        }, 1000);
    }
})();

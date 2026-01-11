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

        // 添加全局样式
        if (!document.getElementById('bilibili-viewer-style')) {
            const style = document.createElement('style');
            style.id = 'bilibili-viewer-style';
            style.textContent = `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

                @keyframes panelFadeIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }

                @keyframes cardSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes statusPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .bilibili-card {
                    transition: all 0.2s ease;
                }

                .bilibili-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                }

                .copy-btn {
                    transition: all 0.15s ease;
                    font-family: 'Inter', -apple-system, sans-serif;
                }

                .copy-btn:hover {
                    transform: translateY(-1px);
                }

                .copy-btn:active {
                    transform: translateY(0);
                }

                .close-btn {
                    transition: all 0.15s ease;
                }

                .close-btn:hover {
                    background: rgba(0, 0, 0, 0.08) !important;
                    transform: rotate(90deg);
                }

                .action-btn {
                    transition: all 0.2s ease;
                    font-family: 'Inter', -apple-system, sans-serif;
                }

                .action-btn:hover {
                    transform: translateY(-1px);
                }

                .data-label {
                    font-family: 'Inter', -apple-system, sans-serif;
                    font-weight: 600;
                }

                .code-display {
                    font-family: 'JetBrains Mono', 'Monaco', 'Courier New', monospace;
                }

                /* 自定义滚动条 */
                .bilibili-content-area::-webkit-scrollbar {
                    width: 6px;
                }

                .bilibili-content-area::-webkit-scrollbar-track {
                    background: transparent;
                }

                .bilibili-content-area::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.15);
                    border-radius: 3px;
                }

                .bilibili-content-area::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.25);
                }
            `;
            document.head.appendChild(style);
        }

        // 创建面板
        const panel = document.createElement('div');
        panel.id = 'bilibili-viewer-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 520px;
            max-width: 90vw;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1);
            z-index: 999999;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            animation: panelFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
        `;

        let content = '';
        const timeStr = savedData ? formatTimeAgo(savedData.timestamp) : '';

        if (!savedData) {
            content = `
                <div style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #fafafa;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #fb7299, #e85d88); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">📊</div>
                        <div>
                            <h2 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0; font-family: 'Inter', sans-serif;">B站数据查询器</h2>
                            <p style="font-size: 12px; color: #6b7280; margin: 0; font-family: 'Inter', sans-serif;">Bilibili Data Viewer</p>
                        </div>
                    </div>
                    <button id="close-panel" class="close-btn" style="background: transparent; border: none; color: #6b7280; font-size: 22px; cursor: pointer; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">×</button>
                </div>
                <div style="padding: 48px 24px; text-align: center;">
                    <div style="width: 64px; height: 64px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                            <line x1="16" y1="8" x2="2" y2="22"></line>
                            <line x1="17.5" y1="15" x2="9" y2="15"></line>
                        </svg>
                    </div>
                    <p style="color: #1f2937; font-size: 15px; margin: 0 0 8px 0; font-weight: 500; font-family: 'Inter', sans-serif;">暂无数据</p>
                    <p style="color: #6b7280; font-size: 13px; margin: 0; font-family: 'Inter', sans-serif;">请先在B站页面保存数据</p>
                </div>
                <div style="padding: 20px 24px; border-top: 1px solid #e5e7eb; background: #fafafa;">
                    <button id="refresh-btn" class="action-btn" style="width: 100%; padding: 12px 20px; background: #fb7299; border: none; color: #ffffff; cursor: pointer; font-size: 14px; font-weight: 600; border-radius: 8px;">
                        刷新数据
                    </button>
                </div>
            `;
        } else {
            const cookies = savedData.data.cookies;
            const localStorage = savedData.data.localStorage;
            const dataFields = [
                { key: 'SESSDATA', value: cookies.SESSDATA, icon: '🔑', color: '#fb7299' },
                { key: 'bili_jct', value: cookies.bili_jct, icon: '🛡️', color: '#23ade5' },
                { key: 'buvid3', value: cookies.buvid3, icon: '📍', color: '#9966ff' },
                { key: 'DedeUserID', value: cookies.DedeUserID, icon: '👤', color: '#ff9500' },
                { key: 'ac_time_value', value: localStorage.ac_time_value, icon: '⏰', color: '#34c759' }
            ];

            // 检查数据新鲜度
            const ageMinutes = Math.floor((Date.now() - savedData.timestamp) / (1000 * 60));
            let statusBadge = '';
            if (ageMinutes < 30) {
                statusBadge = '<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: #d1fae5; color: #065f46; border-radius: 12px; font-size: 11px; font-weight: 500;"><span style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span>新鲜</span>';
            } else if (ageMinutes < 120) {
                statusBadge = '<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: #fef3c7; color: #92400e; border-radius: 12px; font-size: 11px; font-weight: 500;"><span style="width: 6px; height: 6px; background: #f59e0b; border-radius: 50%;"></span>较新</span>';
            } else {
                statusBadge = '<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: #fee2e2; color: #991b1b; border-radius: 12px; font-size: 11px; font-weight: 500;"><span style="width: 6px; height: 6px; background: #ef4444; border-radius: 50%;"></span>过期</span>';
            }

            content = `
                <div style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #fafafa;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #fb7299, #e85d88); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">📊</div>
                        <div>
                            <h2 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0; font-family: 'Inter', sans-serif;">B站数据查询器</h2>
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                                <span style="font-size: 12px; color: #6b7280; font-family: 'Inter', sans-serif;">更新于 ${timeStr}</span>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                    <button id="close-panel" class="close-btn" style="background: transparent; border: none; color: #6b7280; font-size: 22px; cursor: pointer; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">×</button>
                </div>
                <div class="bilibili-content-area" style="padding: 20px 24px; max-height: 420px; overflow-y: auto;">
                    ${dataFields.map((field, index) => `
                        <div class="bilibili-card" style="margin: 0 0 16px 0; padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; animation: cardSlideIn 0.3s ease ${index * 0.06}s both;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 18px;">${field.icon}</span>
                                    <div>
                                        <div class="data-label" style="font-size: 13px; color: #374151;">${field.key}</div>
                                        <div style="font-size: 11px; color: #9ca3af;">${field.value ? field.value.length + ' 字符' : '空值'}</div>
                                    </div>
                                </div>
                                <button class="copy-row copy-btn" data-value="${field.value || ''}" style="flex-shrink: 0; padding: 6px 12px; background: #ffffff; border: 1px solid #e5e7eb; color: #374151; cursor: pointer; font-size: 12px; font-weight: 500; border-radius: 6px;">
                                    复制
                                </button>
                            </div>
                            <code class="code-display" style="display: block; color: #4b5563; font-size: 12px; word-break: break-all; line-height: 1.6; background: #ffffff; padding: 10px 12px; border-radius: 6px; border: 1px solid #e5e7eb;">${field.value || '暂无数据'}</code>
                        </div>
                    `).join('')}
                </div>
                <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb; background: #fafafa; display: flex; gap: 12px;">
                    <button id="copy-all-btn" class="action-btn" style="flex: 1; padding: 12px 16px; background: #fb7299; border: none; color: #ffffff; cursor: pointer; font-size: 14px; font-weight: 600; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        复制全部
                    </button>
                    <button id="export-json-btn" class="action-btn" style="flex: 1; padding: 12px 16px; background: #ffffff; border: 1px solid #e5e7eb; color: #374151; cursor: pointer; font-size: 14px; font-weight: 600; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        导出JSON
                    </button>
                </div>
            `;
        }

        panel.innerHTML = content;
        document.body.appendChild(panel);

        // 关闭按钮
        const closeBtn = document.getElementById('close-panel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                panel.style.animation = 'panelFadeIn 0.2s ease reverse';
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

                if (!value || value === 'NULL') {
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
                        const originalBg = this.style.background;
                        const originalBorder = this.style.borderColor;
                        this.textContent = '✓ 已复制';
                        this.style.background = '#d1fae5';
                        this.style.borderColor = '#10b981';
                        this.style.color = '#065f46';
                        GM_notification({
                            title: '复制成功',
                            text: '数据已复制到剪贴板',
                            timeout: 2000
                        });
                        setTimeout(() => {
                            this.textContent = originalText;
                            this.style.background = originalBg;
                            this.style.borderColor = originalBorder;
                            this.style.color = '#374151';
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

        // 复制全部按钮
        const copyAllBtn = document.getElementById('copy-all-btn');
        if (copyAllBtn) {
            copyAllBtn.addEventListener('click', () => {
                if (!savedData || !savedData.data) return;

                const allData = savedData.data;
                const textToCopy = Object.entries(allData.cookies)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('\n') + `\nac_time_value=${allData.localStorage.ac_time_value}`;

                const textarea = document.createElement('textarea');
                textarea.value = textToCopy;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                textarea.setSelectionRange(0, 99999);

                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textarea);

                    if (successful) {
                        const originalHTML = copyAllBtn.innerHTML;
                        copyAllBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> 已复制';
                        copyAllBtn.style.background = '#10b981';
                        GM_notification({
                            title: '复制成功',
                            text: '全部数据已复制到剪贴板',
                            timeout: 2000
                        });
                        setTimeout(() => {
                            copyAllBtn.innerHTML = originalHTML;
                            copyAllBtn.style.background = '#fb7299';
                        }, 1500);
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
        }

        // 导出JSON按钮
        const exportJsonBtn = document.getElementById('export-json-btn');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => {
                if (!savedData || !savedData.data) return;

                const jsonStr = JSON.stringify(savedData.data, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bilibili-data-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                const originalHTML = exportJsonBtn.innerHTML;
                exportJsonBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> 已导出';
                exportJsonBtn.style.background = '#d1fae5';
                exportJsonBtn.style.borderColor = '#10b981';
                exportJsonBtn.style.color = '#065f46';
                GM_notification({
                    title: '导出成功',
                    text: 'JSON文件已下载',
                    timeout: 2000
                });
                setTimeout(() => {
                    exportJsonBtn.innerHTML = originalHTML;
                    exportJsonBtn.style.background = '#ffffff';
                    exportJsonBtn.style.borderColor = '#e5e7eb';
                    exportJsonBtn.style.color = '#374151';
                }, 1500);
            });
        }

        // 点击面板外部关闭
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                panel.style.animation = 'panelFadeIn 0.2s ease reverse';
                setTimeout(() => panel.remove(), 200);
            }
        });
    }

    // 创建查询页面的悬浮按钮
    function createViewerFloatButton() {
        const floatBtn = document.createElement('div');
        floatBtn.id = 'bilibili-viewer-btn';
        floatBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ffffff;">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
        `;
        floatBtn.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 24px;
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #fb7299, #e85d88);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(251, 114, 153, 0.35);
            z-index: 999999;
            user-select: none;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        floatBtn.addEventListener('mouseenter', () => {
            floatBtn.style.transform = 'scale(1.08) translateY(-2px)';
            floatBtn.style.boxShadow = '0 8px 24px rgba(251, 114, 153, 0.45)';
        });

        floatBtn.addEventListener('mouseleave', () => {
            floatBtn.style.transform = 'scale(1) translateY(0)';
            floatBtn.style.boxShadow = '0 4px 16px rgba(251, 114, 153, 0.35)';
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
            floatBtn.style.transition = 'none';
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
                floatBtn.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            }
        });

        document.body.appendChild(floatBtn);
    }

    // ===== 初始化逻辑 =====

    // 统一的初始化函数
    function init() {
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
    }

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
            setTimeout(init, 1000);
        });
    } else {
        setTimeout(init, 1000);
    }
})();

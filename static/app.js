// 应用配置和状态管理
class FamilyFinanceApp {
    constructor() {
        this.currentPage = 'upload';
        this.images = [];
        this.settings = this.loadSettings();
        this.detailsData = [];
        this.activeCategory = 'all';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.drawScoreCircle();
        this.initCharts();
    }

    loadSettings() {
        const saved = localStorage.getItem('familySettings');
        return saved ? JSON.parse(saved) : {
            backendUrl: window.location.origin,
            monthlyBudget: 5000,
            monthlyIncome: 10000,
            familyMembers: 4,
            city: '北京'
        };
    }

    getBackendUrl() {
        const configuredUrl = (this.settings.backendUrl || '').trim();
        return configuredUrl || window.location.origin;
    }

    saveSettings() {
        localStorage.setItem('familySettings', JSON.stringify(this.settings));
        this.showToast('设置已保存');
    }

    loadSettingsToUI() {
        document.getElementById('backendUrl').value = this.settings.backendUrl || window.location.origin;
        document.getElementById('monthlyBudget').value = this.settings.monthlyBudget;
        document.getElementById('monthlyIncome').value = this.settings.monthlyIncome;
        document.getElementById('familyMembers').value = this.settings.familyMembers;
        document.getElementById('city').value = this.settings.city;
    }

    setupEventListeners() {
        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchPage(e.target.closest('[data-page]').dataset.page));
        });

        // 上传功能
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => e.preventDefault());
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // 提交按钮
        document.getElementById('submitBtn').addEventListener('click', () => this.submitImages());

        // 报表标签
        document.querySelectorAll('.report-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchReport(e.target.dataset.report));
        });

        // 筛选按钮
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterDetails(e.target.dataset.category));
        });

        // 设置页面
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.settings.backendUrl = document.getElementById('backendUrl').value;
            this.settings.monthlyBudget = parseInt(document.getElementById('monthlyBudget').value);
            this.settings.monthlyIncome = parseInt(document.getElementById('monthlyIncome').value);
            this.settings.familyMembers = parseInt(document.getElementById('familyMembers').value);
            this.settings.city = document.getElementById('city').value;
            this.saveSettings();
        });

        // 复制推荐
        document.getElementById('copyRecommendBtn').addEventListener('click', () => {
            const text = document.getElementById('aiRecommendation').textContent;
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('已复制到剪贴板');
            });
        });

        // AI对话
        document.getElementById('aiBtn').addEventListener('click', () => {
            document.getElementById('aiDialog').classList.add('active');
        });

        document.getElementById('aiCloseBtn').addEventListener('click', () => {
            document.getElementById('aiDialog').classList.remove('active');
        });

        document.getElementById('aiSendBtn').addEventListener('click', () => this.sendAIMessage());
        document.getElementById('aiInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendAIMessage();
        });

        document.querySelectorAll('.quick-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('aiInput').value = e.target.textContent;
                this.sendAIMessage();
            });
        });
    }

    switchPage(page) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        // 显示选中的页面
        document.querySelector(`.page-${page}`).classList.add('active');
        // 更新导航
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        this.currentPage = page;

        if (page === 'settings') {
            this.loadSettingsToUI();
        } else if (page === 'overview') {
            this.updateCharts();
        } else if (page === 'details') {
            this.renderDetailsList();
        }
    }

    async handleFiles(files) {
        const imageSet = new Set();

        // 获取现有图片的哈希，用于去重
        this.images.forEach(img => {
            if (img.hash) imageSet.add(img.hash);
        });

        for (const file of files) {
            const entry = await this.prepareImageEntry(file, imageSet);
            if (entry) {
                this.images.push(entry);
                imageSet.add(entry.hash);
            }
        }

        this.renderPreview();
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < Math.min(str.length, 1000); i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('读取图片失败'));
            reader.readAsDataURL(file);
        });
    }

    compressImageDataUrl(dataUrl, maxSize = 1280, quality = 0.78) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
                const targetWidth = Math.round(image.width * ratio);
                const targetHeight = Math.round(image.height * ratio);

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, targetWidth, targetHeight);
                ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            image.onerror = () => reject(new Error('图片加载失败'));
            image.src = dataUrl;
        });
    }

    async prepareImageEntry(file, imageSet) {
        if (!file.type.startsWith('image/')) return null;

        const originalDataUrl = await this.readFileAsDataUrl(file);
        const hash = this.simpleHash(originalDataUrl);
        if (imageSet.has(hash)) return null;

        const compressedDataUrl = await this.compressImageDataUrl(originalDataUrl);

        return {
            file,
            src: compressedDataUrl,
            uploadSrc: compressedDataUrl,
            hash
        };
    }

    normalizeCategory(rawCategory) {
        const text = String(rawCategory || '').toLowerCase();

        if (['食', '餐饮', '美食', '外卖', '饭', 'food', 'dining'].some(key => text.includes(key))) {
            return 'food';
        }

        if (['出行', '交通', '地铁', '公交', '打车', 'transport', 'travel'].some(key => text.includes(key))) {
            return 'transport';
        }

        if (['购物', '商超', '超市', '便利', 'shopping', 'store', 'mall'].some(key => text.includes(key))) {
            return 'shopping';
        }

        if (['娱乐', '休闲', '电影', '游戏', 'entertain', 'game'].some(key => text.includes(key))) {
            return 'entertainment';
        }

        return 'other';
    }

    getCategoryMeta(rawCategory, categoryKey) {
        const key = categoryKey || this.normalizeCategory(rawCategory);
        const metaMap = {
            food: { label: '餐饮', icon: '🍽️' },
            transport: { label: '出行', icon: '🚌' },
            shopping: { label: '购物', icon: '🛍️' },
            entertainment: { label: '娱乐', icon: '🎬' },
            other: { label: '其他', icon: '📌' }
        };

        return { key, ...(metaMap[key] || metaMap.other) };
    }

    enrichExpense(item) {
        const meta = this.getCategoryMeta(item?.category, item?.categoryKey);
        return {
            ...item,
            amount: Number(item?.amount || 0),
            categoryKey: meta.key,
            categoryLabel: meta.label,
            categoryIcon: meta.icon
        };
    }

    renderPreview() {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';

        this.images.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${img.src}" alt="preview-${index}">
                <button class="delete-btn">×</button>
            `;
            div.querySelector('.delete-btn').addEventListener('click', () => {
                this.images.splice(index, 1);
                this.renderPreview();
            });
            preview.appendChild(div);
        });
    }

    async submitImages() {
        if (this.images.length === 0) {
            this.showToast('请先选择图片');
            return;
        }

        this.showToast('正在识别...');

        const backendUrl = this.getBackendUrl();

        try {
            const payload = {
                images: this.images.map(img => img.uploadSrc || img.src),
                mode: 'ocr'
            };

            const response = await fetch(`${backendUrl}/api/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const rawText = await response.text();
            let result = null;
            try {
                result = rawText ? JSON.parse(rawText) : null;
            } catch (error) {
                throw new Error('后端返回不是 JSON');
            }

            if (!response.ok) {
                throw new Error(result?.error || `识别失败(${response.status})`);
            }

            if (result?.success) {
                const expenses = Array.isArray(result.expenses) ? result.expenses : [];
                this.detailsData.push(...expenses.map(item => this.enrichExpense(item)));
                this.images = [];
                this.renderPreview();
                this.updateCharts();
                this.showToast('识别成功！');
                this.switchPage('overview');
            } else {
                this.showToast(result?.error || '识别失败');
            }
        } catch (error) {
            console.error('错误:', error);
            this.showToast(error.message || '网络错误，请检查后端地址');
        }
    }

    drawScoreCircle() {
        const canvas = document.getElementById('scoreCanvas');
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 2 - 5;

        // 背景圆
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f5f5f5';
        ctx.fill();

        // 进度圆（85分）
        const percentage = 85 / 100;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * percentage);
        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 6;
        ctx.stroke();
    }

    initCharts() {
        this.drawPieChart();
        this.drawLineChart();
    }

    drawPieChart() {
        const canvas = document.getElementById('pieChart');
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const categoryMap = {};
        this.detailsData.forEach(item => {
            const meta = this.getCategoryMeta(item.category, item.categoryKey);
            const cat = item.categoryLabel || meta.label;
            categoryMap[cat] = (categoryMap[cat] || 0) + item.amount;
        });

        const total = Object.values(categoryMap).reduce((a, b) => a + b, 1);
        const data = Object.entries(categoryMap).map(([label, amount], idx) => ({
            label,
            value: Math.round((amount / total) * 100),
            color: ['#d4a574', '#e8b8a0', '#f5d5b8', '#f0e6d2'][idx % 4]
        }));

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 2 - 10;

        let startAngle = 0;
        data.forEach(item => {
            const sliceAngle = (item.value / 100) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            startAngle += sliceAngle;
        });

        // 图例
        let legendY = 15;
        data.forEach(item => {
            ctx.fillStyle = item.color;
            ctx.fillRect(10, legendY, 12, 12);
            ctx.fillStyle = '#333';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${item.label} ${item.value}%`, 30, legendY + 10);
            legendY += 20;
        });
    }

    drawLineChart() {
        const canvas = document.getElementById('lineChart');
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const dayMap = {};
        this.detailsData.forEach(item => {
            const dateStr = (item.date || '').split(' ')[0];
            dayMap[dateStr] = (dayMap[dateStr] || 0) + item.amount;
        });

        const dates = Object.keys(dayMap).sort();
        const data = dates.length > 0 ? dates.map(d => dayMap[d]) : [0];
        const maxValue = Math.max(...data, 1);
        const padding = 30;
        const graphWidth = canvas.width - padding * 2;
        const graphHeight = canvas.height - padding * 2;
        const pointSpacing = data.length > 1 ? graphWidth / (data.length - 1) : graphWidth / 2;

        // 绘制坐标轴
        ctx.strokeStyle = '#e0d4c4';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        // 绘制主线
        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((value, index) => {
            const x = padding + index * pointSpacing;
            const y = canvas.height - padding - (value / maxValue) * graphHeight;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // 绘制数据点
        data.forEach((value, index) => {
            const x = padding + index * pointSpacing;
            const y = canvas.height - padding - (value / maxValue) * graphHeight;
            ctx.fillStyle = '#d4a574';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.fillStyle = '#999';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        const displayDates = dates.length > 0 ? dates : ['暂无'];
        displayDates.slice(0, 7).forEach((dateStr, index) => {
            const x = padding + index * (graphWidth / Math.max(displayDates.length - 1, 1));
            ctx.fillText(dateStr.slice(5), x, canvas.height - padding + 15);
        });
    }

    generateReportContent(reportType) {
        const totalExpense = this.detailsData.reduce((sum, item) => sum + item.amount, 0);
        const budget = this.settings.monthlyBudget || 5000;
        const remaining = budget - totalExpense;
        const completion = totalExpense > 0 ? Math.round((totalExpense / budget) * 100) : 0;

        const safeRate = Math.max(0, 100 - completion);
        const savingsTarget = this.settings.monthlyIncome * 0.2 || 2000;
        const savings = Math.max(0, this.settings.monthlyIncome - totalExpense);

        const contents = {
            budget: `
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">预算额度</span>
                        <span class="report-value">${budget} 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">已用</span>
                        <span class="report-value">${totalExpense.toFixed(2)} 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">剩余</span>
                        <span class="report-value">${remaining.toFixed(2)} 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">完成率</span>
                        <span class="report-value">${completion}%</span>
                    </div>
                </div>
            `,
            monthly: `
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">本月支出</span>
                        <span class="report-value">${totalExpense.toFixed(2)} 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">预算对比</span>
                        <span class="report-value">${completion}% 完成</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">记录条数</span>
                        <span class="report-value">${this.detailsData.length} 条</span>
                    </div>
                </div>
            `,
            forecast: `
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">日均支出</span>
                        <span class="report-value">${this.detailsData.length > 0 ? (totalExpense / this.detailsData.length).toFixed(2) : '0'} 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">预测月底支出</span>
                        <span class="report-value">${this.detailsData.length > 0 ? (totalExpense / this.detailsData.length * 30).toFixed(2) : '0'} 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">风险评级</span>
                        <span class="report-value">${safeRate >= 20 ? '安全 ✓' : '紧张 ！'}</span>
                    </div>
                </div>
            `,
            savings: `
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">建议储蓄率</span>
                        <span class="report-value">20%</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">月储蓄目标</span>
                        <span class="report-value">${savingsTarget.toFixed(2)} 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">预计本月储蓄</span>
                        <span class="report-value">${savings.toFixed(2)} 元</span>
                    </div>
                </div>
            `,
            category: `
                <div class="report-item">
                    ${this.detailsData.length > 0 ? 
                        Object.entries(
                            this.detailsData.reduce((m, item) => {
                                const cat = item.category || '其他';
                                m[cat] = (m[cat] || 0) + item.amount;
                                return m;
                            }, {})
                        ).map(([cat, amount]) => `
                        <div class="report-row">
                            <span class="report-label">${cat}</span>
                            <span class="report-value">${amount.toFixed(2)} 元</span>
                        </div>
                        `).join('') 
                    : '<p style="color:#999;">暂无数据</p>'}
                </div>
            `
        };

        return contents[reportType] || contents.budget;
    }

    switchReport(reportType) {
        document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-report="${reportType}"]`).classList.add('active');
        document.getElementById('reportContent').innerHTML = this.generateReportContent(reportType);
    }

    filterDetails(category) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        this.activeCategory = category;
        this.renderDetailsList();
    }

    updateCharts() {
        this.drawScoreCircle();
        this.drawPieChart();
        this.drawLineChart();
    }

    renderDetailsList() {
        const detailsContainer = document.getElementById('detailsList');
        if (!detailsContainer) return;

        const filteredData = this.activeCategory === 'all'
            ? this.detailsData
            : this.detailsData.filter(item => {
                const key = item.categoryKey || this.normalizeCategory(item.category);
                return key === this.activeCategory;
            });

        if (filteredData.length === 0) {
            detailsContainer.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无消费记录</p>';
            return;
        }

        detailsContainer.innerHTML = filteredData
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
            .map(item => {
                const meta = this.getCategoryMeta(item.category, item.categoryKey);
                return `
                <div class="detail-item">
                    <div class="detail-header">
                        <span class="detail-category">${meta.icon} ${item.categoryLabel || meta.label}</span>
                        <span class="detail-amount">¥${Number(item.amount || 0).toFixed(2)}</span>
                    </div>
                    <div class="detail-meta">
                        <div>${item.merchant || item.name || '未知商家'}</div>
                        <div>${item.date || '未知日期'}</div>
                        ${item.details ? `<div>${item.details}</div>` : ''}
                    </div>
                </div>
            `;
            }).join('');
    }

    async sendAIMessage() {
        const input = document.getElementById('aiInput');
        const message = input.value.trim();

        if (!message) return;

        // 添加用户消息
        const messagesContainer = document.getElementById('aiMessages');
        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'ai-message user';
        userMsgDiv.textContent = message;
        messagesContainer.appendChild(userMsgDiv);

        input.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // 调用AI API
        try {
            const backendUrl = this.getBackendUrl();

            const response = await fetch(`${backendUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: message,
                    context: {
                        monthlyBudget: this.settings.monthlyBudget,
                        monthlyIncome: this.settings.monthlyIncome,
                        familyMembers: this.settings.familyMembers,
                        city: this.settings.city
                    }
                })
            });

            const result = await response.json();
            this.showAIMessage(result.answer || '抱歉，暂无回答');
        } catch (error) {
            console.error('错误:', error);
            this.showAIMessage('网络连接失败，请检查后端地址');
        }
    }

    showAIMessage(text) {
        const messagesContainer = document.getElementById('aiMessages');
        const assistantMsgDiv = document.createElement('div');
        assistantMsgDiv.className = 'ai-message assistant';
        assistantMsgDiv.textContent = text;
        messagesContainer.appendChild(assistantMsgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FamilyFinanceApp();
});
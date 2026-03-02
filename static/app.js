// 应用配置和状态管理
class FamilyFinanceApp {
    constructor() {
        this.currentPage = 'upload';
        this.images = [];
        this.settings = this.loadSettings();
        this.detailsData = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.drawScoreCircle();
        this.initCharts();
        this.loadMockData();
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
        }
    }

    handleFiles(files) {
        const imageSet = new Set();

        // 获取现有图片的哈希，用于去重
        this.images.forEach(img => {
            if (img.hash) imageSet.add(img.hash);
        });

        for (let file of files) {
            if (!file.type.startsWith('image/')) continue;

            const reader = new FileReader();
            reader.onload = (e) => {
                const hash = this.simpleHash(e.target.result);
                if (!imageSet.has(hash)) {
                    this.images.push({
                        file,
                        src: e.target.result,
                        hash
                    });
                    imageSet.add(hash);
                    this.renderPreview();
                }
            };
            reader.readAsDataURL(file);
        }
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
            // 使用 FormData 上传多张图片
            const formData = new FormData();
            this.images.forEach((img, index) => {
                formData.append('images', img.file);
            });
            formData.append('mode', 'ocr');

            const response = await fetch(`${backendUrl}/api/process`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.detailsData.push(...result.expenses);
                this.images = [];
                this.renderPreview();
                this.showToast('识别成功！');
                this.switchPage('overview');
            } else {
                this.showToast(result.error || '识别失败');
            }
        } catch (error) {
            console.error('错误:', error);
            this.showToast('网络错误，请检查后端地址');
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

        const data = [
            { label: '餐饮', value: 40, color: '#d4a574' },
            { label: '出行', value: 25, color: '#e8b8a0' },
            { label: '购物', value: 20, color: '#f5d5b8' },
            { label: '娱乐', value: 15, color: '#f0e6d2' }
        ];

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

        // 模拟数据：7天的消费额
        const data = [150, 180, 120, 200, 160, 140, 190];
        const maxValue = Math.max(...data);
        const padding = 30;
        const graphWidth = canvas.width - padding * 2;
        const graphHeight = canvas.height - padding * 2;
        const pointSpacing = graphWidth / (data.length - 1);

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

        // 绘制日期标签
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        ctx.fillStyle = '#999';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        days.forEach((day, index) => {
            const x = padding + index * pointSpacing;
            ctx.fillText(day, x, canvas.height - padding + 15);
        });
    }

    switchReport(reportType) {
        document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-report="${reportType}"]`).classList.add('active');

        const contents = {
            budget: `
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">预算额度</span>
                        <span class="report-value">5000 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">已用</span>
                        <span class="report-value">3200 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">剩余</span>
                        <span class="report-value">1800 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">完成率</span>
                        <span class="report-value">64%</span>
                    </div>
                </div>
            `,
            weekly: `
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">第1周</span>
                        <span class="report-value">1200 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">第2周</span>
                        <span class="report-value">850 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">第3周</span>
                        <span class="report-value">980 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">第4周</span>
                        <span class="report-value">170 元</span>
                    </div>
                </div>
            `,
            monthly: `
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">1月</span>
                        <span class="report-value">4800 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">2月</span>
                        <span class="report-value">5200 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">3月</span>
                        <span class="report-value">4500 元（本月）</span>
                    </div>
                </div>
            `,
            forecast: `
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">下周预计</span>
                        <span class="report-value">950 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">下月预计</span>
                        <span class="report-value">5100 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">预测趋势</span>
                        <span class="report-value">📈 上升</span>
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
                        <span class="report-value">2000 元</span>
                    </div>
                </div>
                <div class="report-item">
                    <div class="report-row">
                        <span class="report-label">本月储蓄</span>
                        <span class="report-value">1500 元</span>
                    </div>
                </div>
            `
        };

        document.getElementById('reportContent').innerHTML = contents[reportType];
    }

    filterDetails(category) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // 实际应用中应根据分类过滤
        // 这里仅为演示
    }

    loadMockData() {
        this.detailsData = [
            { category: '食', amount: 85.50, name: '某火锅店', time: '2026-03-01 19:30' },
            { category: '行', amount: 45.00, name: '滴滴出行', time: '2026-03-01 15:20' },
            { category: '食', amount: 32.00, name: '咖啡馆', time: '2026-02-28 14:15' },
        ];
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
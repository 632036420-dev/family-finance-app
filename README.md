# 家庭财务管理应用

一个现代化的家庭财务管理系统，集成了账单自动识别和AI财务顾问功能。

## ✨ 主要功能

### 前端应用
- **📤 上传页**：支持多张截图上传，自动去重处理
- **📊 总览页**：
  - 消费健康评分（0-100分环形进度条）
  - 支出分布饼图、日均趋势折线图
  - AI文字分析结论
  - 一键复制财务摘要到剪贴板
- **📈 报表页**：5个子报表
  - 预算追踪
  - 按周/按月统计
  - 趋势预测
  - 储蓄建议
- **📋 明细页**：完整消费记录，支持按类别筛选
- **⚙️ 设置页**：
  - 后端地址配置
  - 月度预算、家庭信息（收入/人数/城市）
- **💬 AI对话**：悬浮按钮弹出全屏对话，支持快捷问题和多轮对话

### 后端云函数
- **图片识别**：使用通义千问 `qwen-vl-plus` 识别账单截图
- **AI对话**：通过 `qwen-turbo` 提供财务咨询
- **API密钥保护**：Key存储在服务器环境变量，用户无法访问

## 🛠️ 技术栈

### 前端
- 纯HTML5 + CSS3 + Vanilla JavaScript
- 移动优先响应式设计
- Canvas 图表绘制

### 后端
- Node.js 云函数
- 阿里云通义千问 API 集成

## 📦 项目结构

```
family/
├── static/
│   ├── index.html          # 前端主页面
│   └── app.js              # 前端应用逻辑
├── cloudfunctions/
│   └── api/
│       └── index.js        # 后端云函数入口
├── package.json            # 项目依赖配置
└── README.md               # 项目文档
```

## 🚀 快速开始

### 1. 前端部署

前端是静态文件，可以直接在浏览器中打开或部署到任何静态托管服务（如 GitHub Pages、OSS、CloudFront 等）。

```bash
# 简单方式：使用 Python 启动本地服务器
python -m http.server 8080

# 或使用 Node.js http-server
npx http-server static -p 8080
```

然后访问：`http://localhost:8080`

### 2. 后端部署

#### 本地开发

```bash
# 安装依赖（如需要）
npm install

# 设置 API Key 并启动服务
set DASHSCOPE_API_KEY=sk-xxx...
npm start
```

#### 云函数部署（阿里云/腾讯云/AWS Lambda）

1. 使用 `cloudfunctions/api/index.js` 作为入口文件
2. 在云函数平台设置环境变量 `DASHSCOPE_API_KEY`
3. 配置触发器：HTTP 触发

#### Docker 部署

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY . .
ENV DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. 配置连接

在前端"设置"页面配置后端地址：
- 如果后端部署在 `https://api.example.com`
- 在设置中填入完整 URL
- 应用会自动调用 `/api/process` 和 `/api/chat` 端点

## 📝 API接口

### 图片识别接口

**请求**
```
POST /api/process
Content-Type: multipart/form-data

images: File[]  # 多张图片文件
mode: "ocr"     # 处理模式
```

**响应**
```json
{
  "success": true,
  "expenses": [
    {
      "merchant": "某火锅店",
      "amount": 85.50,
      "category": "食",
      "date": "2026-03-01 19:30",
      "details": "火锅消费"
    }
  ],
  "message": "成功识别 N 条消费记录"
}
```

### AI对话接口

**请求**
```
POST /api/chat
Content-Type: application/json

{
  "question": "如何节省开支？",
  "context": {
    "monthlyBudget": 5000,
    "monthlyIncome": 10000,
    "familyMembers": 4,
    "city": "北京"
  }
}
```

**响应**
```json
{
  "success": true,
  "answer": "根据你的消费数据，建议...",
  "context": { /* 返回的上下文信息 */ }
}
```

## 🔐 安全注意事项

1. **API Key 管理**
   - ✅ 仅在服务器端存储和使用
   - ✅ 通过环境变量配置，不要硬编码
   - ✅ 前端无法访问 API Key

2. **跨域请求**
   - 后端已配置 CORS，允许来自任何源的请求
   - 生产环境建议限制具体的前端域名

3. **数据隐私**
   - 敏感信息（收入、人数等）仅在用户本地存储
   - 建议启用 HTTPS 加密传输

## 🎨 UI 特点

- **白底小清新风格**：暖色调配色，舒适阅读体验
- **向日葵装饰**：背景中的向日葵元素增添温暖感
- **手机优先**：底部5标签导航，优化移动设备体验
- **响应式设计**：支持平板和桌面浏览

## 📱 移动适配

应用已针对以下设备优化：
- iPhone/Android 手机（375px - 667px）
- iPad 平板（768px - 1024px）
- 桌面浏览器（1200px+）

## 🔄 数据流向

```
用户上传截图
    ↓
前端压缩 & 预处理
    ↓
POST 到后端 /api/process
    ↓
通义千问 qwen-vl-plus 模型识别
    ↓
返回结构化消费数据
    ↓
前端更新总览和明细页
    ↓
用户可以查看分析和对话
```

## 🤖 AI 功能

### 账单识别
- 支持各类电子账单截图
- 自动提取：商家、金额、日期、分类
- 去重机制防止重复识别

### 财务顾问
- 快捷问题：节省建议、预算制定、增收方案、投资建议
- 上下文感知：以用户的收入、预算、家庭状况作为前提
- 多轮对话：支持追问和澄清

## 🐛 故障排查

**页面加载缓慢**
- 检查网络连接
- 确认后端服务正常运行

**上传失败**
- 确保后端地址配置正确
- 检查浏览器控制台错误信息
- 确保选择的是图片文件

**AI对话无响应**
- 确认后端 API 被正确配置
- 检查 DASHSCOPE_API_KEY 环境变量是否设置
- 查看后端服务日志

## 📄 环境变量

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `DASHSCOPE_API_KEY` | 通义千问 API 认证密钥 | `sk-xxx...` |
| `PORT` | 服务器监听端口 | `3000` |

## 📞 支持

如有问题或建议，欢迎反馈或提交 Issue。

## 📄 许可证

MIT License

---

**最后更新**：2026年3月1日

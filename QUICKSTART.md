# 🚀 快速开始指南

## 项目已成功创建！

你现在拥有一个完整的家庭财务管理应用。以下是快速开始步骤：

## 🎯 第1步：启动前端

### 方式1：NPM HTTP Server（推荐）

```bash
# 全局安装（如果未安装）
npm install -g http-server

# 启动服务器
http-server static -p 8080
```

### 方式2：Python（如已安装）

```bash
# Python 3
python -m http.server -d static 8080

# 会输出：Serving HTTP on 0.0.0.0 port 8080 ...
```

### 方式3：Node 内置模块

```bash
node -e "require('http').createServer((req, res) => { const fs = require('fs'); const path = require('path'); const file = 'static' + req.url; try { res.end(fs.readFileSync(file)); } catch { res.writeHead(404); res.end('Not Found'); } }).listen(8080); console.log('Server running on http://localhost:8080');"
```

然后访问浏览器：**http://localhost:8080**

## 🎯 第2步：启动后端服务

### 准备 API Key

1. 获取通义千问 API Key：https://dashscope.aliyuncs.com
2. 创建 `.env` 文件（复制 `.env.example`）
3. 填入你的 API Key：

```bash
# Windows PowerShell
$env:DASHSCOPE_API_KEY = "sk-your-api-key-here"
npm start

# 或一行命令启动
$env:DASHSCOPE_API_KEY = "sk-your-api-key-here"; node cloudfunctions/api/index.js
```

或直接编辑环境变量后运行：

```bash
npm start
```

后端会输出：
```
✅ 家庭财务管理服务已启动，监听端口 3000
```

## 🎯 第3步：在应用中配置后端

1. 打开前端应用（http://localhost:8080）
2. 进入右下角 **⚙️ 设置** 页
3. 输入后端地址：`http://localhost:3000`
4. 点击 **保存设置**

现在所有功能都可以使用了！

## 📋 功能测试清单

- [ ] **上传页**：点击上传区选择图片，测试去重功能
- [ ] **总览页**：查看消费评分、图表和AI分析
- [ ] **报表页**：切换5个子报表查看数据
- [ ] **明细页**：查看消费记录，测试分类筛选
- [ ] **设置页**：修改预算、收入等信息
- [ ] **AI对话**：点击底部悬浮按钮 💬，测试快捷问题和对话

## 🔧 开发工具

### 浏览器调试

按 `F12` 或右键 > 检查元素打开开发者工具：
- **Console**：查看 JavaScript 错误
- **Network**：监控 API 调用
- **Storage**：查看本地存储数据

### 后端测试

测试图片识别接口：

```bash
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{"images": []}'
```

测试AI对话接口：

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "如何节省开支？", "context": {"monthlyIncome": 10000}}'
```

## 📂 文件说明

| 文件 | 描述 |
|------|------|
| `static/index.html` | 前端主页面（包含HTML+CSS） |
| `static/app.js` | 前端应用逻辑 |
| `cloudfunctions/api/index.js` | 后端云函数入口 |
| `package.json` | 项目依赖和脚本 |
| `README.md` | 完整项目文档 |
| `.env.example` | 环境变量示例 |
| `.gitignore` | Git 忽略文件 |

## 🌐 部署指南

### 前端部署

1. **GitHub Pages**
   ```bash
   # 推送到 gh-pages 分支
   ```

2. **云存储（OSS/COS/S3）**
   - 上传 `static/` 中的文件
   - 配置静态网站托管

3. **传统服务器**
   - 使用 Nginx 或 Apache 托管 `static/` 目录

### 后端部署

1. **云函数平台**（阿里云函数、腾讯云函数等）
   - 上传 `cloudfunctions/api/index.js`
   - 设置环境变量 `DASHSCOPE_API_KEY`

2. **Docker 容器**
   ```bash
   docker build -t family-finance .
   docker run -e DASHSCOPE_API_KEY=sk-xxx -p 3000:3000 family-finance
   ```

3. **虚拟主机 / VPS**
   - 部署到任意 Node.js 支持的主机
   - 使用 PM2 进程管理

## 💡 进阶功能建议

- [ ] 连接真实数据库存储消费记录
- [ ] 实现用户认证系统
- [ ] 添加数据导出功能（Excel/PDF）
- [ ] 集成真实支付宝/微信账单同步
- [ ] 实现数据可视化仪表板
- [ ] 添加家庭成员共享功能
- [ ] 推送提醒（消费预警、储蓄提醒）

## ❓ 常见问题

**Q: 前端和后端必须在同一域名吗？**
A: 不需要。后端已配置 CORS，可以跨域调用。注意在生产环境限制具体域名。

**Q: 如何更换 API Key？**
A: 修改 `.env` 文件中的 `DASHSCOPE_API_KEY` 并重启服务。

**Q: 可以离线使用吗？**
A: 前端可以，但账单识别和AI对话需要网络连接。

**Q: 如何调试前端？**
A: 在浏览器 DevTools 的 Console 中直接访问 `window.app` 对象。

## 📞 需要帮助？

查看 `README.md` 获取完整文档和 API 参考。

---

**祝你使用愉快！** 🎉

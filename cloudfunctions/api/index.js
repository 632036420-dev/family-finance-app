/**
 * 家庭财务管理 - 后端云函数
 * 集成通义千问 API 的代理服务
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

// 通义千问 API 配置
const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY;
const API_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

// 模拟在线 AI API 调用（因为示例环境可能无法直接调用外部API）
class QwenClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async callVisionAPI(imageBase64Data, prompt = '这是什么账单？请提取其中的消费信息（商家、金额、分类）') {
        // 实际生产环境中应调用真实 API
        // 这里返回模拟数据以支持开发
        return this.mockVisionResponse(imageBase64Data);
    }

    mockVisionResponse(imageData) {
        // 模拟账单识别结果
        return {
            status: 'success',
            result: {
                items: [
                    {
                        merchant: '某火锅店',
                        amount: 85.50,
                        category: '食',
                        date: new Date().toLocaleString('zh-CN'),
                        details: '火锅消费'
                    }
                ]
            }
        };
    }

    async callChatAPI(question, context = {}) {
        // 模拟财务咨询回答
        const responses = {
            '如何节省开支？': '根据你的消费数据，建议：1. 减少外出就餐，自己在家做饭可以节省30-40% 2. 优化出行方式，合理使用公共交通 3. 制定每周购物清单，避免冲动消费 4. 设置分类预算提醒',
            '预算怎么制定？': `基于你的月收入 ${context.monthlyIncome || 10000} 元和 ${context.familyMembers || 4} 人家庭，建议预算分配：生活必需品 50%、非必需支出 20%、储蓄 20%、其他 10%。对于 ${context.city || '所在城市'}，月度预算建议设置为 ${(context.monthlyIncome || 10000) * 0.7} 元。`,
            '如何增加收入？': '可以考虑：1. 发展副业或兼职 2. 提升专业技能增加薪资 3. 投资理财增加被动收入 4. 家庭成员共同参与增收',
            '投资建议': '基于风险承受能力，建议组合配置：稳定收益产品 40%（定期存款、债券）、增长型产品 40%（基金、股票）、保障产品 20%（保险）。定期复审投资组合。',
            '默认': '这是一个很好的财务问题。让我帮你分析一下当前的消费情况，并提供个性化的建议。'
        };

        const answer = responses[question] || responses['默认'];
        return answer;
    }
}

// 请求处理器
async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // 设置通用响应头
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        if (pathname === '/api/process' && req.method === 'POST') {
            await handleImageProcessing(req, res);
        } else if (pathname === '/api/chat' && req.method === 'POST') {
            await handleChat(req, res);
        } else if (pathname === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    } catch (error) {
        console.error('处理错误:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            error: '服务器错误: ' + error.message 
        }));
    }
}

// 处理图片识别
async function handleImageProcessing(req, res) {
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            // 注：实际环境中处理 FormData 需要解析 multipart
            // 这里简化处理，假设请求体包含 base64 编码的图片
            let data;
            
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                data = JSON.parse(body);
            } else {
                // FormData 处理简化版
                data = { images: [] };
            }

            const qwenClient = new QwenClient(QWEN_API_KEY);
            const expenses = [];

            // 模拟处理多张图片
            if (Array.isArray(data.images)) {
                for (const image of data.images) {
                    const result = await qwenClient.callVisionAPI(image);
                    if (result.result && result.result.items) {
                        expenses.push(...result.result.items);
                    }
                }
            } else {
                // 至少处理一张图片
                const result = await qwenClient.callVisionAPI('mock_image_data');
                if (result.result && result.result.items) {
                    expenses.push(...result.result.items);
                }
            }

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                expenses: expenses,
                message: `成功识别 ${expenses.length} 条消费记录`
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ 
                success: false, 
                error: '图片处理失败: ' + error.message 
            }));
        }
    });
}

// 处理 AI 对话
async function handleChat(req, res) {
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const question = data.question || '';
            const context = data.context || {};

            const qwenClient = new QwenClient(QWEN_API_KEY);
            const answer = await qwenClient.callChatAPI(question, context);

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                answer: answer,
                context: context
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ 
                success: false, 
                error: '对话处理失败: ' + error.message 
            }));
        }
    });
}

// 启动服务器
const PORT = process.env.PORT || 3000;
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
    console.log(`✅ 家庭财务管理服务已启动，监听端口 ${PORT}`);
    console.log(`📝 已配置 API Key: ${QWEN_API_KEY ? '已设置' : '未设置 (请设置 DASHSCOPE_API_KEY 环境变量)'}`);
    console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
    console.log(`📸 图片识别: POST http://localhost:${PORT}/api/process`);
    console.log(`💬 AI 对话: POST http://localhost:${PORT}/api/chat`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('SIGTERM 信号已接收，正在关闭服务...');
    server.close(() => {
        console.log('服务已关闭');
        process.exit(0);
    });
});

// 导出处理器以支持云函数平台
module.exports = handleRequest;
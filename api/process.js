/**
 * Vercel Serverless Function - 图片识别 API
 */

const querystring = require('querystring');

// 模拟 Qwen API
class QwenClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async callVisionAPI(imageBase64Data, prompt = '这是什么账单？请提取其中的消费信息（商家、金额、分类）') {
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
}

export default async function handler(req, res) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const data = req.body;
        const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY;
        
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

        return res.status(200).json({
            success: true,
            expenses: expenses,
            message: `成功识别 ${expenses.length} 条消费记录`
        });
    } catch (error) {
        console.error('处理错误:', error);
        return res.status(500).json({ 
            success: false, 
            error: '图片处理失败: ' + error.message 
        });
    }
}

/**
 * Vercel Serverless Function - AI 对话 API
 */

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

function getContentText(content) {
    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        return content
            .map(item => (typeof item === 'string' ? item : item?.text || ''))
            .join('')
            .trim();
    }

    return '';
}

async function callQwenChat({ apiKey, model, question, context }) {
    const userContent = `用户问题：${question}\n\n用户上下文（JSON）：${JSON.stringify(context || {}, null, 2)}`;

    const response = await fetch(DASHSCOPE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            temperature: 0.4,
            messages: [
                {
                    role: 'system',
                    content: '你是家庭财务顾问，请结合用户上下文给出简洁、可执行的建议。'
                },
                {
                    role: 'user',
                    content: userContent
                }
            ]
        })
    });

    const rawText = await response.text();
    let payload = null;

    try {
        payload = rawText ? JSON.parse(rawText) : null;
    } catch (error) {
        if (!response.ok) {
            throw new Error(`大模型调用失败(${response.status})：${rawText || '无响应内容'}`);
        }
        throw new Error('大模型返回了非 JSON 响应');
    }

    if (!response.ok) {
        const message = payload?.error?.message || payload?.message || rawText || '未知错误';
        throw new Error(`大模型调用失败(${response.status})：${message}`);
    }

    const answer = getContentText(payload?.choices?.[0]?.message?.content);
    if (!answer) {
        throw new Error('大模型返回为空');
    }

    return {
        answer,
        usage: payload?.usage || null
    };
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
        const { question, context } = req.body || {};
        const apiKey = process.env.DASHSCOPE_API_KEY;
        const model = process.env.DASHSCOPE_CHAT_MODEL || process.env.QWEN_CHAT_MODEL || 'qwen-plus';

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: '服务器未配置 DASHSCOPE_API_KEY'
            });
        }

        if (!question || !String(question).trim()) {
            return res.status(400).json({
                success: false,
                error: 'question 不能为空'
            });
        }

        const result = await callQwenChat({
            apiKey,
            model,
            question: String(question).trim(),
            context: context || {}
        });

        return res.status(200).json({
            success: true,
            answer: result.answer,
            context: context || {},
            model,
            usage: result.usage
        });
    } catch (error) {
        console.error('处理错误:', error);
        return res.status(500).json({ 
            success: false, 
            error: '对话处理失败: ' + error.message 
        });
    }
}

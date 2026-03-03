/**
 * Vercel Serverless Function - 图片识别 API
 */

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

function ensureDataUrl(imageText) {
    if (typeof imageText !== 'string') {
        return null;
    }

    const trimmed = imageText.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith('data:image/')) {
        return trimmed;
    }

    return `data:image/jpeg;base64,${trimmed}`;
}

function extractJsonBlock(text) {
    if (!text || typeof text !== 'string') {
        return null;
    }

    const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
        return fenced[1].trim();
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return text.slice(firstBrace, lastBrace + 1).trim();
    }

    return null;
}

function normalizeExpense(item) {
    return {
        merchant: String(item?.merchant || item?.shop || item?.store || '未知商家'),
        amount: Number(item?.amount || item?.money || 0),
        category: String(item?.category || '其他'),
        date: String(item?.date || item?.time || new Date().toLocaleString('zh-CN')),
        details: String(item?.details || item?.note || '')
    };
}

async function recognizeExpenses({ apiKey, model, images }) {
    const imageParts = images
        .map(ensureDataUrl)
        .filter(Boolean)
        .map(url => ({ type: 'image_url', image_url: { url } }));

    if (imageParts.length === 0) {
        throw new Error('未检测到可识别的图片数据');
    }

    const instruction = '仅返回 JSON：{"expenses":[{"merchant":"","amount":0,"category":"","date":"","details":""}]}; 无记录则 {"expenses":[]}';

    const response = await fetch(DASHSCOPE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            temperature: 0,
            max_tokens: 300,
            messages: [
                {
                    role: 'system',
                    content: '你是OCR结构化提取器，只输出JSON。'
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: instruction },
                        ...imageParts
                    ]
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
            throw new Error(`图像识别调用失败(${response.status})：${rawText || '无响应内容'}`);
        }
        throw new Error('图像识别接口返回了非 JSON 响应');
    }

    if (!response.ok) {
        const message = payload?.error?.message || payload?.message || rawText || '未知错误';
        throw new Error(`图像识别调用失败(${response.status})：${message}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    const contentText = typeof content === 'string'
        ? content
        : Array.isArray(content)
            ? content.map(item => item?.text || '').join('')
            : '';

    const jsonText = extractJsonBlock(contentText);
    if (!jsonText) {
        throw new Error('模型返回中未找到可解析的 JSON');
    }

    let recognized = null;
    try {
        recognized = JSON.parse(jsonText);
    } catch (error) {
        throw new Error('模型返回 JSON 解析失败');
    }

    const expenses = Array.isArray(recognized?.expenses)
        ? recognized.expenses.map(normalizeExpense)
        : [];

    return {
        expenses,
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
        const data = req.body || {};
        const apiKey = process.env.DASHSCOPE_API_KEY;
        const model = process.env.DASHSCOPE_VL_MODEL || process.env.QWEN_VL_MODEL || 'qwen-vl-plus';

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: '服务器未配置 DASHSCOPE_API_KEY'
            });
        }

        if (!Array.isArray(data.images) || data.images.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'images 不能为空'
            });
        }

        const result = await recognizeExpenses({
            apiKey,
            model,
            images: data.images
        });

        return res.status(200).json({
            success: true,
            expenses: result.expenses,
            message: `成功识别 ${result.expenses.length} 条消费记录`,
            model,
            usage: result.usage
        });
    } catch (error) {
        console.error('处理错误:', error);
        return res.status(500).json({ 
            success: false, 
            error: '图片处理失败: ' + error.message 
        });
    }
}

/**
 * Vercel Serverless Function - AI 对话 API
 */

class QwenClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
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
        const { question, context } = req.body;
        const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY;
        
        const qwenClient = new QwenClient(QWEN_API_KEY);
        const answer = await qwenClient.callChatAPI(question, context || {});

        return res.status(200).json({
            success: true,
            answer: answer,
            context: context || {}
        });
    } catch (error) {
        console.error('处理错误:', error);
        return res.status(500).json({ 
            success: false, 
            error: '对话处理失败: ' + error.message 
        });
    }
}

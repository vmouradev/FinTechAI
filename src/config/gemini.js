const axios = require('axios');

class GeminiAIClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }

    async analyzeMarketData(marketData) {
        try {
            const response = await axios.post(
                `${this.baseUrl}?key=${this.apiKey}`,
                {
                    contents: [{
                        parts: [{
                            text: `Analyze the following market OHLCV data and provide trading suggestions based on technical analysis: ${JSON.stringify(marketData)}`
                        }]
                    }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error calling Gemini API:', error.message);
            throw new Error('Failed to analyze market data');
        }
    }
}

module.exports = GeminiAIClient;
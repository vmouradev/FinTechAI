class MarketAnalysisController {
    constructor(technicalAnalysisService) {
        this.technicalAnalysisService = technicalAnalysisService;
    }

    async analyzeMarket(req, res) {
        try {
            const { symbol, timeframe, data } = req.body;

            // Validar entrada
            const marketData = new MarketData(symbol, timeframe, data);
            marketData.validate();

            // Gerar sinais de negociação
            const analysis = await this.technicalAnalysisService.generateTradingSignals(marketData);

            return res.status(200).json(analysis);
        } catch (error) {
            console.error('Error in market analysis:', error);
            return res.status(400).json({
                error: true,
                message: error.message
            });
        }
    }
}
// src/api/controllers/marketAnalysisController.js

class MarketAnalysisController {
    constructor(technicalAnalysisService, tradingSignalRepository, marketDataRepository) {
        this.technicalAnalysisService = technicalAnalysisService;
        this.tradingSignalRepository = tradingSignalRepository;
        this.marketDataRepository = marketDataRepository;
    }

    async analyzeMarket(req, res) {
        try {
            const { symbol, timeframe, data } = req.body;

            if (!symbol || !timeframe || !data) {
                return res.status(400).json({
                    error: true,
                    message: 'Dados incompletos. Symbol, timeframe e data são obrigatórios.'
                });
            }

            // Validar dados de entrada
            const MarketData = require('../../domain/models/MarketData');
            const marketData = new MarketData(symbol, timeframe, data);

            try {
                marketData.validate();
            } catch (validationError) {
                return res.status(400).json({
                    error: true,
                    message: validationError.message
                });
            }

            // Salvar dados de mercado (opcional, para histórico)
            try {
                if (this.marketDataRepository) {
                    await this.marketDataRepository.saveMarketData(marketData);
                }
            } catch (storageError) {
                console.error('Erro ao salvar dados de mercado:', storageError);
                // Continua mesmo com erro de armazenamento
            }

            // Gerar sinais de negociação
            const analysis = await this.technicalAnalysisService.generateTradingSignals(marketData);

            // Salvar a análise no repositório de sinais
            let analysisId = null;
            try {
                if (this.tradingSignalRepository) {
                    analysisId = await this.tradingSignalRepository.saveAnalysis(analysis);
                    // Adiciona o ID ao resultado
                    analysis.id = analysisId;
                }
            } catch (saveError) {
                console.error('Erro ao salvar análise:', saveError);
                // Continua mesmo com erro de salvamento
            }

            return res.status(200).json(analysis);
        } catch (error) {
            console.error('Erro na análise de mercado:', error);
            return res.status(500).json({
                error: true,
                message: error.message || 'Erro interno no servidor'
            });
        }
    }
}

module.exports = MarketAnalysisController;
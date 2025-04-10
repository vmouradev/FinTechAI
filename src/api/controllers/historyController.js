class HistoryController {
    constructor(marketDataRepository, tradingSignalRepository) {
        this.marketDataRepository = marketDataRepository;
        this.tradingSignalRepository = tradingSignalRepository;
    }

    /**
     * Busca histórico de análises para um símbolo
     */
    async getAnalysisHistory(req, res) {
        try {
            const { symbol, limit } = req.params;
            const analyses = await this.marketDataRepository.getAnalysesBySymbol(
                symbol,
                parseInt(limit, 10) || 10
            );

            return res.status(200).json({
                success: true,
                data: analyses
            });
        } catch (error) {
            console.error('Erro ao buscar histórico de análises:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Busca estatísticas de sinais para um símbolo
     */
    async getSignalStats(req, res) {
        try {
            const { symbol, days } = req.params;
            const stats = await this.tradingSignalRepository.getAnalyticsStats(
                symbol,
                parseInt(days, 10) || 30
            );

            return res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas de sinais:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Registra feedback sobre um sinal
     */
    async submitSignalFeedback(req, res) {
        try {
            const { signalId } = req.params;
            const { wasCorrect, notes } = req.body;

            if (wasCorrect === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'O campo wasCorrect é obrigatório'
                });
            }

            await this.tradingSignalRepository.recordSignalFeedback(
                signalId,
                wasCorrect,
                notes || ''
            );

            return res.status(200).json({
                success: true,
                message: 'Feedback registrado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao registrar feedback:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = HistoryController;
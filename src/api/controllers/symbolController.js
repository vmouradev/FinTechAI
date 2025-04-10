class SymbolController {
    constructor(marketDataService) {
        this.marketDataService = marketDataService;
    }

    /**
     * Busca símbolos disponíveis
     */
    async searchSymbols(req, res) {
        try {
            const { query, provider } = req.query;

            if (!query || query.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'A consulta deve ter pelo menos 2 caracteres'
                });
            }

            const symbols = await this.marketDataService.searchSymbols(query, provider);

            return res.status(200).json({
                success: true,
                data: symbols
            });
        } catch (error) {
            console.error('Erro ao buscar símbolos:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Obtém dados OHLCV para um símbolo
     */
    async getMarketData(req, res) {
        try {
            const { symbol, timeframe, limit, provider } = req.query;

            if (!symbol) {
                return res.status(400).json({
                    success: false,
                    error: 'Símbolo é obrigatório'
                });
            }

            const parsedLimit = limit ? parseInt(limit, 10) : 100;

            // Se provider for especificado, usa esse provedor, senão tenta todos com fallback
            let data;
            if (provider) {
                data = await this.marketDataService.getOHLCV(symbol, timeframe || '1d', parsedLimit, provider);
            } else {
                data = await this.marketDataService.getOHLCVWithFallback(symbol, timeframe || '1d', parsedLimit);
            }

            return res.status(200).json({
                success: true,
                symbol,
                timeframe: timeframe || '1d',
                data
            });
        } catch (error) {
            console.error('Erro ao obter dados de mercado:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = SymbolController;
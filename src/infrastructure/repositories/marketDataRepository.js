const FirestoreRepository = require('./firestoreRepository');

class MarketDataRepository extends FirestoreRepository {
    constructor() {
        super('market_analyses');
    }

    /**
     * Salva histórico de dados de mercado
     * @param {Object} marketData - Dados de mercado
     * @returns {Promise<string>} - ID do documento
     */
    async saveMarketData(marketData) {
        try {
            // Extract essentials to avoid storing full OHLCV data
            // which could be very large
            const dataToStore = {
                symbol: marketData.symbol,
                timeframe: marketData.timeframe,
                timestamp: marketData.timestamp || new Date().toISOString(),
                firstCandleTime: marketData.data[0].timestamp,
                lastCandleTime: marketData.data[marketData.data.length - 1].timestamp,
                candleCount: marketData.data.length,
                // Store only last few candles as sample
                sampleData: marketData.data.slice(-5)
            };

            return await this.saveAnalysis(dataToStore);
        } catch (error) {
            console.error('Erro ao salvar dados de mercado:', error);
            throw new Error('Falha ao persistir dados de mercado');
        }
    }
}

module.exports = MarketDataRepository;
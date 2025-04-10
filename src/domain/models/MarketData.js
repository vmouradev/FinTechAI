class MarketData {
    constructor(symbol, timeframe, data) {
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.data = data;
        this.timestamp = new Date();
    }

    validate() {
        if (!this.symbol) {
            throw new Error('Symbol is required');
        }

        if (!this.timeframe) {
            throw new Error('Timeframe is required');
        }

        if (!Array.isArray(this.data) || this.data.length === 0) {
            throw new Error('Market data must be a non-empty array');
        }

        // Validar estrutura OHLCV
        for (const candle of this.data) {
            if (!candle.timestamp ||
                candle.open === undefined ||
                candle.high === undefined ||
                candle.low === undefined ||
                candle.close === undefined ||
                candle.volume === undefined) {
                throw new Error('Invalid OHLCV data structure');
            }
        }

        return true;
    }
}

module.exports = MarketData;
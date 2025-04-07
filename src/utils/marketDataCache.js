/**
 * Cache em memória para dados de mercado para reduzir chamadas à API
 */
class MarketDataCache {
    constructor(ttlMinutes = 15) {
        this.cache = new Map();
        this.ttlMs = ttlMinutes * 60 * 1000;
    }

    /**
     * Gera uma chave de cache
     * @param {string} symbol - Símbolo do ativo
     * @param {string} timeframe - Timeframe
     * @param {number} limit - Limite de registros
     * @param {string} provider - Nome do provedor
     * @returns {string} - Chave de cache
     */
    generateKey(symbol, timeframe, limit, provider) {
        return `${symbol}_${timeframe}_${limit}_${provider || 'default'}`;
    }

    /**
     * Armazena dados no cache
     * @param {string} symbol - Símbolo do ativo
     * @param {string} timeframe - Timeframe
     * @param {number} limit - Limite de registros
     * @param {string} provider - Nome do provedor
     * @param {Array} data - Dados a serem armazenados
     */
    set(symbol, timeframe, limit, provider, data) {
        const key = this.generateKey(symbol, timeframe, limit, provider);
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Recupera dados do cache
     * @param {string} symbol - Símbolo do ativo
     * @param {string} timeframe - Timeframe
     * @param {number} limit - Limite de registros
     * @param {string} provider - Nome do provedor
     * @returns {Array|null} - Dados ou null se não encontrado ou expirado
     */
    get(symbol, timeframe, limit, provider) {
        const key = this.generateKey(symbol, timeframe, limit, provider);
        const cachedItem = this.cache.get(key);

        if (!cachedItem) {
            return null;
        }

        // Verificar se expirou
        if (Date.now() - cachedItem.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }

        return cachedItem.data;
    }

    /**
     * Limpa o cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Remove itens expirados do cache
     */
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.ttlMs) {
                this.cache.delete(key);
            }
        }
    }
}
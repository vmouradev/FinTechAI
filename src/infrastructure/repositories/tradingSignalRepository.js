class TradingSignalRepository extends FirestoreRepository {
    constructor() {
        super('trading_signals');
    }

    /**
     * Busca sinais de trading por símbolo e força do sinal
     * @param {string} symbol - Símbolo do ativo
     * @param {string} signal - Tipo de sinal (buy, sell, neutral)
     * @param {number} minStrength - Força mínima do sinal
     * @returns {Promise<Array>} - Lista de sinais
     */
    async getSignalsByStrength(symbol, signal, minStrength = 0) {
        try {
            const snapshot = await this.collection
                .where('symbol', '==', symbol)
                .where('trading_signal.signal', '==', signal)
                .where('trading_signal.strength', '>=', minStrength)
                .orderBy('trading_signal.strength', 'desc')
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();

            if (snapshot.empty) {
                return [];
            }

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erro ao buscar sinais por força:', error);
            throw new Error('Falha ao recuperar sinais de trading');
        }
    }

    /**
     * Recupera os sinais mais recentes para um conjunto de símbolos
     * @param {Array<string>} symbols - Lista de símbolos
     * @param {number} limit - Limite por símbolo
     * @returns {Promise<Object>} - Mapa de símbolos para seus sinais
     */
    async getLatestSignalsForSymbols(symbols, limit = 1) {
        try {
            const results = {};

            // Para cada símbolo, busca os sinais mais recentes
            for (const symbol of symbols) {
                const snapshot = await this.collection
                    .where('symbol', '==', symbol)
                    .orderBy('timestamp', 'desc')
                    .limit(limit)
                    .get();

                if (!snapshot.empty) {
                    results[symbol] = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                } else {
                    results[symbol] = [];
                }
            }

            return results;
        } catch (error) {
            console.error('Erro ao buscar sinais recentes:', error);
            throw new Error('Falha ao recuperar sinais de trading recentes');
        }
    }

    /**
     * Registra um feedback sobre a precisão de um sinal
     * @param {string} signalId - ID do sinal
     * @param {boolean} wasCorrect - Se o sinal se confirmou
     * @param {string} notes - Notas adicionais
     * @returns {Promise<boolean>} - Sucesso da operação
     */
    async recordSignalFeedback(signalId, wasCorrect, notes = '') {
        try {
            await this.collection.doc(signalId).update({
                feedback: {
                    wasCorrect,
                    notes,
                    timestamp: new Date().toISOString()
                }
            });

            return true;
        } catch (error) {
            console.error('Erro ao registrar feedback do sinal:', error);
            throw new Error('Falha ao atualizar feedback do sinal');
        }
    }
}

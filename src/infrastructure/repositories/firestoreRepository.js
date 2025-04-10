const { Firestore } = require('@google-cloud/firestore');

class FirestoreRepository {
    constructor(collectionName) {
        // Inicializa o Firestore
        this.firestore = new Firestore({
            projectId: process.env.FIREBASE_PROJECT_ID,
            keyFilename: process.env.FIREBASE_KEY_PATH,
        });
        this.collection = this.firestore.collection(collectionName);
    }

    /**
     * Salva uma análise de mercado no Firestore
     * @param {Object} analysis - Objeto contendo a análise de mercado
     * @returns {Promise<string>} - ID do documento criado
     */
    async saveAnalysis(analysis) {
        try {
            // Adiciona timestamp se não existir
            if (!analysis.timestamp) {
                analysis.timestamp = new Date().toISOString();
            }

            // Adiciona o documento e retorna a referência
            const docRef = await this.collection.add(analysis);
            console.log(`Análise salva com ID: ${docRef.id}`);
            return docRef.id;
        } catch (error) {
            console.error('Erro ao salvar análise no Firestore:', error);
            throw new Error('Falha ao persistir análise no banco de dados');
        }
    }

    /**
     * Busca análises por símbolo
     * @param {string} symbol - Símbolo do ativo financeiro
     * @param {number} limit - Número máximo de resultados (padrão: 10)
     * @returns {Promise<Array>} - Lista de análises encontradas
     */
    async getAnalysesBySymbol(symbol, limit = 10) {
        try {
            const snapshot = await this.collection
                .where('symbol', '==', symbol)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            if (snapshot.empty) {
                return [];
            }

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erro ao buscar análises por símbolo:', error);
            throw new Error('Falha ao recuperar análises do banco de dados');
        }
    }

    /**
     * Busca análises por intervalo de tempo
     * @param {string} symbol - Símbolo do ativo financeiro
     * @param {string} timeframe - Intervalo de tempo (1h, 4h, 1d, etc)
     * @param {string} startDate - Data inicial (ISO string)
     * @param {string} endDate - Data final (ISO string)
     * @returns {Promise<Array>} - Lista de análises encontradas
     */
    async getAnalysesByTimeRange(symbol, timeframe, startDate, endDate) {
        try {
            let query = this.collection
                .where('symbol', '==', symbol);

            if (timeframe) {
                query = query.where('timeframe', '==', timeframe);
            }

            query = query
                .where('timestamp', '>=', startDate)
                .where('timestamp', '<=', endDate)
                .orderBy('timestamp', 'desc');

            const snapshot = await query.get();

            if (snapshot.empty) {
                return [];
            }

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erro ao buscar análises por intervalo de tempo:', error);
            throw new Error('Falha ao recuperar análises do banco de dados');
        }
    }

    /**
     * Recupera análise por ID
     * @param {string} id - ID do documento
     * @returns {Promise<Object|null>} - Análise encontrada ou null
     */
    async getAnalysisById(id) {
        try {
            const doc = await this.collection.doc(id).get();

            if (!doc.exists) {
                return null;
            }

            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error('Erro ao buscar análise por ID:', error);
            throw new Error('Falha ao recuperar análise do banco de dados');
        }
    }

    /**
     * Atualiza uma análise existente
     * @param {string} id - ID do documento
     * @param {Object} updates - Campos a serem atualizados
     * @returns {Promise<boolean>} - Sucesso da operação
     */
    async updateAnalysis(id, updates) {
        try {
            await this.collection.doc(id).update({
                ...updates,
                updatedAt: new Date().toISOString()
            });

            console.log(`Análise ${id} atualizada com sucesso`);
            return true;
        } catch (error) {
            console.error('Erro ao atualizar análise:', error);
            throw new Error('Falha ao atualizar análise no banco de dados');
        }
    }

    /**
     * Remove uma análise
     * @param {string} id - ID do documento
     * @returns {Promise<boolean>} - Sucesso da operação
     */
    async deleteAnalysis(id) {
        try {
            await this.collection.doc(id).delete();
            console.log(`Análise ${id} removida com sucesso`);
            return true;
        } catch (error) {
            console.error('Erro ao remover análise:', error);
            throw new Error('Falha ao remover análise do banco de dados');
        }
    }

    /**
     * Recupera estatísticas agregadas de análises
     * @param {string} symbol - Símbolo do ativo financeiro
     * @param {number} days - Número de dias a considerar
     * @returns {Promise<Object>} - Estatísticas agregadas
     */
    async getAnalyticsStats(symbol, days = 30) {
        try {
            // Calcula a data limite baseada no número de dias
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - days);
            const limitDateStr = limitDate.toISOString();

            const snapshot = await this.collection
                .where('symbol', '==', symbol)
                .where('timestamp', '>=', limitDateStr)
                .get();

            if (snapshot.empty) {
                return {
                    totalAnalyses: 0,
                    signals: {
                        buy: 0,
                        sell: 0,
                        neutral: 0
                    },
                    averageConfidence: 0
                };
            }

            // Processa os resultados para gerar estatísticas
            const analyses = snapshot.docs.map(doc => doc.data());
            const totalAnalyses = analyses.length;

            // Contagem de sinais
            const signals = {
                buy: 0,
                strong_buy: 0,
                sell: 0,
                strong_sell: 0,
                neutral: 0
            };

            let confidenceSum = 0;

            analyses.forEach(analysis => {
                // Incrementa contador de sinal
                const signal = analysis.trading_signal.signal;
                signals[signal] = (signals[signal] || 0) + 1;

                // Soma confiança
                confidenceSum += analysis.trading_signal.confidence || 0;
            });

            // Calcula média de confiança
            const averageConfidence = totalAnalyses > 0
                ? (confidenceSum / totalAnalyses).toFixed(2)
                : 0;

            // Agrupa buy e strong_buy, sell e strong_sell para simplificar
            const simplifiedSignals = {
                buy: signals.buy + signals.strong_buy,
                sell: signals.sell + signals.strong_sell,
                neutral: signals.neutral
            };

            return {
                totalAnalyses,
                signals: simplifiedSignals,
                averageConfidence: parseFloat(averageConfidence),
                timeframe: days + ' dias'
            };
        } catch (error) {
            console.error('Erro ao recuperar estatísticas de análises:', error);
            throw new Error('Falha ao gerar estatísticas');
        }
    }
}

module.exports = FirestoreRepository;
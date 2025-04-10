const cron = require('node-cron');

class MarketDataScheduler {
    constructor(marketDataService, marketAnalysisService, tradingSignalRepository) {
        this.marketDataService = marketDataService;
        this.marketAnalysisService = marketAnalysisService;
        this.tradingSignalRepository = tradingSignalRepository;
        this.watchlist = [];
        this.isRunning = false;
    }

    /**
     * Adiciona um ativo à watchlist
     * @param {Object} item - Item a ser monitorado
     */
    addToWatchlist(item) {
        // Verificar se já existe
        const exists = this.watchlist.find(i =>
            i.symbol === item.symbol && i.timeframe === item.timeframe
        );

        if (!exists) {
            this.watchlist.push({
                symbol: item.symbol,
                timeframe: item.timeframe,
                provider: item.provider,
                lastUpdate: null
            });
        }
    }

    /**
     * Remove um ativo da watchlist
     * @param {string} symbol - Símbolo do ativo
     * @param {string} timeframe - Timeframe
     */
    removeFromWatchlist(symbol, timeframe) {
        this.watchlist = this.watchlist.filter(item =>
            !(item.symbol === symbol && item.timeframe === timeframe)
        );
    }

    /**
     * Inicia o agendador para atualizar os dados periodicamente
     * @param {string} schedule - Expressão cron
     */
    start(schedule = '*/15 * * * *') { // A cada 15 minutos por padrão
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        // Executar imediatamente na inicialização
        this.updateAllData();

        // Agendar execuções periódicas
        this.cronJob = cron.schedule(schedule, () => {
            this.updateAllData();
        });

        console.log(`Agendador de dados de mercado iniciado. Próxima execução: ${schedule}`);
    }

    /**
     * Para o agendador
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.isRunning = false;
            console.log('Agendador de dados de mercado parado');
        }
    }

    /**
     * Atualiza todos os dados da watchlist
     */
    async updateAllData() {
        console.log(`Iniciando atualização agendada para ${this.watchlist.length} ativos...`);

        for (const item of this.watchlist) {
            try {
                console.log(`Atualizando dados para ${item.symbol} (${item.timeframe})...`);

                // Obter dados atualizados
                const data = await this.marketDataService.getOHLCV(
                    item.symbol,
                    item.timeframe,
                    100,
                    item.provider
                ).catch(err => {
                    console.error(`Erro ao obter dados para ${item.symbol}:`, err.message);
                    return null;
                });

                // Verificar se temos dados válidos
                if (!data || !Array.isArray(data) || data.length === 0) {
                    console.error(`Não foi possível obter dados válidos para ${item.symbol}`);
                    continue; // Pula para o próximo item
                }

                // Realizar análise
                const analysis = await this.marketAnalysisService.generateTradingSignals({
                    symbol: item.symbol,
                    timeframe: item.timeframe,
                    data: data
                }).catch(err => {
                    console.error(`Erro na análise para ${item.symbol}:`, err.message);
                    return null;
                });

                // Verificar se temos análise válida
                if (!analysis) {
                    console.error(`Análise inválida para ${item.symbol}`);
                    continue; // Pula para o próximo item
                }

                // Salvar no repositório
                if (this.tradingSignalRepository) {
                    await this.tradingSignalRepository.saveAnalysis(analysis)
                        .catch(err => console.error(`Erro ao salvar análise para ${item.symbol}:`, err.message));
                }

                // Atualizar timestamp da última atualização
                item.lastUpdate = new Date().toISOString();

                console.log(`Dados de ${item.symbol} atualizados com sucesso`);
            } catch (error) {
                console.error(`Erro ao atualizar dados para ${item.symbol}: ${error.message}`);
            }

            // Pausa entre requisições para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        console.log('Atualização agendada concluída');
    }
}

module.exports = MarketDataScheduler;
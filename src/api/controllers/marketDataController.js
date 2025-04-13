/**
 * Controlador para lidar com captação automática de dados de mercado
 */
class MarketDataController {
    constructor(marketDataService, marketAnalysisController) {
        this.marketDataService = marketDataService;
        this.marketAnalysisController = marketAnalysisController;
    }

    /**
     * Coleta e analisa dados de mercado em uma única etapa
     */
    async fetchAndAnalyze(req, res) {
        try {
            const { symbol, timeframe, limit, provider, useTestData } = req.body;

            if (!symbol) {
                return res.status(400).json({
                    success: false,
                    error: 'Símbolo é obrigatório'
                });
            }

            // Usar dados de teste se solicitado
            if (useTestData === true) {
                console.log("Usando dados simulados para teste");
                const testData = this.generateTestData(symbol, timeframe || '1d');

                // Análise usando dados de teste
                const analysisReq = {
                    body: {
                        symbol,
                        timeframe: timeframe || '1d',
                        data: testData
                    }
                };

                const analysisRes = {
                    status: function (code) {
                        this.statusCode = code;
                        return this;
                    },
                    json: function (data) {
                        this.data = data;
                        return this;
                    }
                };

                await this.marketAnalysisController.analyzeMarket(analysisReq, analysisRes);

                return res.status(200).json({
                    success: true,
                    source: 'simulated_data',
                    dataPoints: testData.length,
                    analysis: analysisRes.data,
                    note: "Dados simulados para desenvolvimento e teste"
                });
            }


            // DADOS REAIS

            const parsedLimit = limit ? parseInt(limit, 10) : 100;

            // Obter dados do provedor
            console.log(`Obtendo dados de mercado para ${symbol}...`);
            let data;
            if (provider) {
                data = await this.marketDataService.getOHLCV(symbol, timeframe || '1d', parsedLimit, provider);
            } else {
                data = await this.marketDataService.getOHLCVWithFallback(symbol, timeframe || '1d', parsedLimit);
            }

            if (!data || data.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: `Não foi possível obter dados para ${symbol}`
                });
            }

            console.log(`Dados obtidos com sucesso: ${data.length} registros. Realizando análise...`);

            // Criar objeto simulando um request para o controlador de análise
            const analysisReq = {
                body: {
                    symbol,
                    timeframe: timeframe || '1d',
                    data
                }
            };

            // Criar objeto simulando um response para capturar o resultado da análise
            const analysisRes = {
                status: function (code) {
                    this.statusCode = code;
                    return this;
                },
                json: function (data) {
                    this.data = data;
                    return this;
                }
            };

            // Executar a análise
            await this.marketAnalysisController.analyzeMarket(analysisReq, analysisRes);

            // Verificar se a análise foi bem-sucedida
            if (analysisRes.statusCode !== 200) {
                return res.status(analysisRes.statusCode).json({
                    success: false,
                    error: 'Falha na análise dos dados',
                    details: analysisRes.data
                });
            }

            // Retornar o resultado da análise
            return res.status(200).json({
                success: true,
                source: provider || 'auto',
                dataPoints: data.length,
                analysis: analysisRes.data
            });
        } catch (error) {
            console.error('Erro ao buscar e analisar dados:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Método para gerar dados simulados para testes
    generateTestData(symbol, timeframe) {
        const numCandles = 100;
        const data = [];
        let basePrice = symbol === 'BTC' ? 50000 : (symbol === 'AAPL' ? 180 : 350);
        let volatility = symbol === 'BTC' ? 500 : 3;

        const now = new Date().getTime();
        let timestamp = now - (numCandles * 24 * 60 * 60 * 1000); // Dias para trás

        if (timeframe === '1h') {
            timestamp = now - (numCandles * 60 * 60 * 1000); // Horas para trás
        } else if (timeframe === '4h') {
            timestamp = now - (numCandles * 4 * 60 * 60 * 1000); // 4 horas para trás
        }

        for (let i = 0; i < numCandles; i++) {
            const change = (Math.random() - 0.5) * volatility;
            const open = basePrice;
            const close = basePrice + change;
            const high = Math.max(open, close) + Math.random() * volatility * 0.5;
            const low = Math.min(open, close) - Math.random() * volatility * 0.5;
            const volume = Math.floor(Math.random() * 10000) + 1000;

            data.push({
                timestamp: timestamp + (i * (timeframe === '1h' ? 60 * 60 * 1000 : (timeframe === '4h' ? 4 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000))),
                open,
                high,
                low,
                close,
                volume
            });

            basePrice = close; // O preço do próximo dia começa onde o anterior terminou
        }

        return data;
    }


    /**
     * Coleta e armazena dados históricos para um símbolo
     */
    async fetchHistoricalData(req, res) {
        try {
            const { symbol, timeframe, days, provider } = req.body;

            if (!symbol) {
                return res.status(400).json({
                    success: false,
                    error: 'Símbolo é obrigatório'
                });
            }

            // Determinar o número de registros a coletar com base nos dias
            const parsedDays = parseInt(days, 10) || 30;
            let limit = parsedDays;

            // Ajustar limite com base no timeframe
            if (timeframe === '1h') limit = parsedDays * 24;
            if (timeframe === '4h') limit = parsedDays * 6;
            if (timeframe === '1w') limit = Math.ceil(parsedDays / 7);
            if (timeframe === '1M') limit = Math.ceil(parsedDays / 30);

            // Obter dados do provedor
            console.log(`Obtendo dados históricos para ${symbol} (${parsedDays} dias)...`);
            let data;
            if (provider) {
                data = await this.marketDataService.getOHLCV(symbol, timeframe || '1d', limit, provider);
            } else {
                data = await this.marketDataService.getOHLCVWithFallback(symbol, timeframe || '1d', limit);
            }

            if (!data || data.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: `Não foi possível obter dados históricos para ${symbol}`
                });
            }

            // Retornar os dados coletados
            return res.status(200).json({
                success: true,
                symbol,
                timeframe: timeframe || '1d',
                dataPoints: data.length,
                periodDays: parsedDays,
                source: provider || 'auto',
                data
            });
        } catch (error) {
            console.error('Erro ao buscar dados históricos:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Lista todos os provedores disponíveis e seu status
     */
    async getProvidersStatus(req, res) {
        try {
            const providers = {};

            // Listar todos os provedores registrados
            for (const [name, provider] of Object.entries(this.marketDataService.providers)) {
                providers[name] = {
                    available: true,
                    isDefault: this.marketDataService.defaultProvider === name
                };
            }

            return res.status(200).json({
                success: true,
                providers,
                defaultProvider: this.marketDataService.defaultProvider
            });
        } catch (error) {
            console.error('Erro ao obter status dos provedores:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

// Exportar o controlador
module.exports = MarketDataController;
const axios = require('axios');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

/**
 * Interface para provedores de dados de mercado
 */
class MarketDataProvider {
    async getOHLCV(symbol, timeframe, limit) {
        throw new Error("Método não implementado");
    }

    async getSymbols() {
        throw new Error("Método não implementado");
    }
}

/**
 * Implementação para Alpha Vantage API (gratuita com limites)
 * https://www.alphavantage.co/ - 5 requisições por minuto, 500 por dia no plano gratuito
 */
class AlphaVantageProvider extends MarketDataProvider {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.baseUrl = 'https://www.alphavantage.co/query';
    }

    /**
     * Mapeia timeframes para intervalos compatíveis com a API
     * @param {string} timeframe - Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
     * @returns {string} - Intervalo para a API
     */
    mapTimeframe(timeframe) {
        const mapping = {
            '1m': '1min',
            '5m': '5min',
            '15m': '15min',
            '30m': '30min',
            '1h': '60min',
            '4h': 'daily', // A Alpha Vantage não tem 4h nativo
            '1d': 'daily',
            '1w': 'weekly',
            '1M': 'monthly'
        };

        return mapping[timeframe] || 'daily';
    }

    /**
     * Converte dados da Alpha Vantage para formato OHLCV padrão
     * @param {Object} data - Dados da API
     * @param {string} timeframe - Timeframe solicitado
     * @returns {Array} - Dados OHLCV formatados
     */
    formatData(data, timeframe) {
        let timeSeriesKey;

        // Determinar a chave da série temporal com base no timeframe
        if (timeframe === '1d') {
            timeSeriesKey = 'Time Series (Daily)';
        } else if (timeframe === '1w') {
            timeSeriesKey = 'Weekly Time Series';
        } else if (timeframe === '1M') {
            timeSeriesKey = 'Monthly Time Series';
        } else {
            timeSeriesKey = `Time Series (${this.mapTimeframe(timeframe)})`;
        }

        const timeSeries = data[timeSeriesKey];
        if (!timeSeries) {
            throw new Error(`Dados não encontrados para o timeframe ${timeframe}`);
        }

        // Converter para array e formatar
        return Object.entries(timeSeries).map(([date, values]) => {
            // Para timeframes intraday, a data vem com hora
            const timestamp = new Date(date).getTime();

            return {
                timestamp,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseFloat(values['5. volume'])
            };
        }).sort((a, b) => a.timestamp - b.timestamp); // Ordenar por timestamp crescente
    }

    /**
     * Obtém dados OHLCV da Alpha Vantage
     * @param {string} symbol - Símbolo do ativo (ex: IBM, MSFT)
     * @param {string} timeframe - Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
     * @param {number} limit - Limite de registros (max 100 para plano gratuito)
     * @returns {Promise<Array>} - Dados OHLCV
     */
    async getOHLCV(symbol, timeframe, limit = 100) {
        try {
            let functionName;
            const interval = this.mapTimeframe(timeframe);

            // Selecionar a função correta com base no timeframe
            if (['1min', '5min', '15min', '30min', '60min'].includes(interval)) {
                functionName = 'TIME_SERIES_INTRADAY';
            } else if (interval === 'daily') {
                functionName = 'TIME_SERIES_DAILY';
            } else if (interval === 'weekly') {
                functionName = 'TIME_SERIES_WEEKLY';
            } else if (interval === 'monthly') {
                functionName = 'TIME_SERIES_MONTHLY';
            }

            // Parâmetros da requisição
            const params = {
                function: functionName,
                symbol: symbol,
                apikey: this.apiKey,
                outputsize: limit > 100 ? 'full' : 'compact'
            };

            // Adicionar intervalo apenas para intraday
            if (functionName === 'TIME_SERIES_INTRADAY') {
                params.interval = interval;
            }

            const response = await axios.get(this.baseUrl, { params });

            // Verificar se a resposta contém mensagem de erro
            if (response.data['Error Message']) {
                throw new Error(response.data['Error Message']);
            }

            // Verificar se atingiu o limite de requisições
            if (response.data['Note'] && response.data['Note'].includes('Thank you for using Alpha Vantage')) {
                console.warn('Aviso: Limite de requisições da Alpha Vantage atingido');
            }

            // Formatar e limitar os dados
            let formattedData = this.formatData(response.data, timeframe);
            if (limit && formattedData.length > limit) {
                formattedData = formattedData.slice(-limit);
            }

            return formattedData;
        } catch (error) {
            console.error(`Erro ao obter dados OHLCV da Alpha Vantage: ${error.message}`);
            throw new Error(`Falha ao obter dados de mercado: ${error.message}`);
        }
    }

    /**
     * Busca símbolos disponíveis com base em uma pesquisa
     * @param {string} keywords - Palavras-chave para pesquisa
     * @returns {Promise<Array>} - Lista de símbolos encontrados
     */
    async getSymbols(keywords) {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    function: 'SYMBOL_SEARCH',
                    keywords,
                    apikey: this.apiKey
                }
            });

            if (response.data['Error Message']) {
                throw new Error(response.data['Error Message']);
            }

            return response.data.bestMatches ? response.data.bestMatches.map(match => ({
                symbol: match['1. symbol'],
                name: match['2. name'],
                type: match['3. type'],
                region: match['4. region'],
                currency: match['8. currency']
            })) : [];
        } catch (error) {
            console.error(`Erro ao buscar símbolos da Alpha Vantage: ${error.message}`);
            throw new Error(`Falha ao buscar símbolos: ${error.message}`);
        }
    }
}

/**
 * Implementação para CoinGecko API (gratuita com limites)
 * https://www.coingecko.com/en/api - 10-50 requisições por minuto no plano gratuito
 */
class CoinGeckoProvider extends MarketDataProvider {
    constructor() {
        super();
        this.baseUrl = 'https://api.coingecko.com/api/v3';
        this.rateLimitDelay = 12000; // 12 segundos para respeitar limite de 5 req/min
        this.lastRequestTime = 0;
    }

    /**
     * Garante respeito ao rate limiting
     */
    async respectRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.rateLimitDelay) {
            const delayNeeded = this.rateLimitDelay - timeSinceLastRequest;
            await sleep(delayNeeded);
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Mapeia timeframes para intervalos compatíveis com a API
     * @param {string} timeframe - Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
     * @returns {string} - Intervalo para a API
     */
    mapTimeframe(timeframe) {
        const mapping = {
            '1m': 'minutely',
            '5m': 'minutely',
            '15m': 'minutely',
            '30m': 'minutely',
            '1h': 'hourly',
            '4h': 'hourly',
            '1d': 'daily',
            '1w': 'weekly',
            '1M': 'monthly'
        };

        return mapping[timeframe] || 'daily';
    }

    /**
     * Converte nome de moeda para ID do CoinGecko
     * @param {string} symbol - Símbolo da moeda (ex: BTC, ETH)
     * @returns {Promise<string>} - ID da moeda no CoinGecko
     */
    async getIdFromSymbol(symbol) {
        await this.respectRateLimit();

        try {
            // Remove sufixos comuns em pares de criptomoedas
            const cleanSymbol = symbol.replace(/USD$|USDT$|BTC$/, '').toLowerCase();

            const response = await axios.get(`${this.baseUrl}/coins/list`);
            const coin = response.data.find(c =>
                c.symbol.toLowerCase() === cleanSymbol ||
                c.id.toLowerCase() === cleanSymbol
            );

            if (!coin) {
                throw new Error(`Símbolo não encontrado: ${symbol}`);
            }

            return coin.id;
        } catch (error) {
            console.error(`Erro ao buscar ID da moeda no CoinGecko: ${error.message}`);
            throw error;
        }
    }

    /**
     * Obtém dados OHLCV do CoinGecko
     * @param {string} symbol - Símbolo da criptomoeda (ex: BTC, ETH)
     * @param {string} timeframe - Timeframe (1d, 1w, 1M)
     * @param {number} limit - Limite de registros
     * @returns {Promise<Array>} - Dados OHLCV
     */
    async getOHLCV(symbol, timeframe = '1d', limit = 90) {
        try {
            // CoinGecko só suporta daily, weekly e monthly na API gratuita
            if (!['1d', '1w', '1M'].includes(timeframe)) {
                throw new Error(`Timeframe ${timeframe} não suportado pela API gratuita do CoinGecko. Use 1d, 1w ou 1M.`);
            }

            // Obter ID da moeda
            const coinId = await this.getIdFromSymbol(symbol);

            // Determinar dias e intervalo
            let days = 30;
            if (timeframe === '1w') days = Math.min(limit * 7, 365);
            if (timeframe === '1d') days = Math.min(limit, 365);
            if (timeframe === '1M') days = Math.min(limit * 30, 365);

            await this.respectRateLimit();

            const response = await axios.get(`${this.baseUrl}/coins/${coinId}/ohlc`, {
                params: {
                    vs_currency: 'usd',
                    days
                }
            });

            // Dados retornados como [timestamp, open, high, low, close]
            return response.data.map(entry => ({
                timestamp: entry[0], // timestamp em milisegundos
                open: entry[1],
                high: entry[2],
                low: entry[3],
                close: entry[4],
                volume: 0 // CoinGecko não fornece volume na API gratuita de OHLC
            })).slice(-limit);
        } catch (error) {
            console.error(`Erro ao obter dados OHLCV do CoinGecko: ${error.message}`);
            throw new Error(`Falha ao obter dados de mercado: ${error.message}`);
        }
    }

    /**
     * Busca símbolos disponíveis com base em uma pesquisa
     * @param {string} query - Termo de pesquisa
     * @returns {Promise<Array>} - Lista de moedas encontradas
     */
    async getSymbols(query = '') {
        await this.respectRateLimit();

        try {
            const response = await axios.get(`${this.baseUrl}/coins/list`);

            let coins = response.data;

            // Filtrar por query se fornecida
            if (query) {
                const lowercaseQuery = query.toLowerCase();
                coins = coins.filter(coin =>
                    coin.name.toLowerCase().includes(lowercaseQuery) ||
                    coin.symbol.toLowerCase().includes(lowercaseQuery) ||
                    coin.id.toLowerCase().includes(lowercaseQuery)
                );
            }

            // Limitar a 100 resultados
            return coins.slice(0, 100).map(coin => ({
                symbol: coin.symbol.toUpperCase(),
                name: coin.name,
                id: coin.id
            }));
        } catch (error) {
            console.error(`Erro ao buscar símbolos do CoinGecko: ${error.message}`);
            throw new Error(`Falha ao buscar símbolos: ${error.message}`);
        }
    }
}

/**
 * Implementação para Finnhub API (gratuita com limites)
 * https://finnhub.io/ - 60 chamadas de API por minuto no plano gratuito
 */
class FinnhubProvider extends MarketDataProvider {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.baseUrl = 'https://finnhub.io/api/v1';
    }

    /**
     * Mapeia timeframes para resolução compatível com a API
     * @param {string} timeframe - Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
     * @returns {string} - Resolução para a API
     */
    mapTimeframe(timeframe) {
        const mapping = {
            '1m': '1',
            '5m': '5',
            '15m': '15',
            '30m': '30',
            '1h': '60',
            '4h': '240',
            '1d': 'D',
            '1w': 'W',
            '1M': 'M'
        };

        return mapping[timeframe] || 'D';
    }

    /**
     * Formata timestamps para a API
     * @param {number} days - Dias para retroceder
     * @returns {number} - Timestamp Unix em segundos
     */
    getFromTimestamp(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return Math.floor(date.getTime() / 1000);
    }

    /**
     * Obtém dados OHLCV do Finnhub
     * @param {string} symbol - Símbolo do ativo (ex: AAPL, MSFT)
     * @param {string} timeframe - Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
     * @param {number} limit - Número de candles desejados
     * @returns {Promise<Array>} - Dados OHLCV
     */
    async getOHLCV(symbol, timeframe = '1d', limit = 100) {
        try {
            const resolution = this.mapTimeframe(timeframe);

            // Determinar período com base no timeframe e limite
            let fromDays = 30;
            if (['D', 'W', 'M'].includes(resolution)) {
                fromDays = limit * (['D', 'W', 'M'].indexOf(resolution) + 1) * 2; // Multiplica por 2 para garantir dados suficientes
            } else {
                // Para timeframes em minutos, calcular dias adequadamente
                fromDays = Math.ceil((limit * parseInt(resolution)) / (60 * 24)) + 1;
            }

            const from = this.getFromTimestamp(fromDays);
            const to = Math.floor(Date.now() / 1000);

            const response = await axios.get(`${this.baseUrl}/stock/candle`, {
                params: {
                    symbol,
                    resolution,
                    from,
                    to,
                    token: this.apiKey
                }
            });

            // Verificar se há dados válidos
            if (response.data.s === 'no_data') {
                throw new Error(`Sem dados disponíveis para o símbolo ${symbol} com o timeframe ${timeframe}`);
            }

            // Formatar dados
            const { t, o, h, l, c, v } = response.data;
            const formattedData = t.map((timestamp, index) => ({
                timestamp: timestamp * 1000, // Converter para milissegundos
                open: o[index],
                high: h[index],
                low: l[index],
                close: c[index],
                volume: v[index]
            }));

            // Limitar ao número solicitado
            return formattedData.slice(-limit);
        } catch (error) {
            console.error(`Erro ao obter dados OHLCV do Finnhub: ${error.message}`);
            throw new Error(`Falha ao obter dados de mercado: ${error.message}`);
        }
    }

    /**
     * Busca símbolos disponíveis
     * @param {string} query - Termo para busca
     * @returns {Promise<Array>} - Lista de símbolos
     */
    async getSymbols(query) {
        try {
            const response = await axios.get(`${this.baseUrl}/search`, {
                params: {
                    q: query,
                    token: this.apiKey
                }
            });

            return response.data.result.map(item => ({
                symbol: item.symbol,
                description: item.description,
                type: item.type,
                displaySymbol: item.displaySymbol
            }));
        } catch (error) {
            console.error(`Erro ao buscar símbolos do Finnhub: ${error.message}`);
            throw new Error(`Falha ao buscar símbolos: ${error.message}`);
        }
    }
}

/**
 * Implementação para Twelve Data API (gratuita com limites)
 * https://twelvedata.com/ - 800 req/dia, 8 req/min no plano gratuito
 */
class TwelveDataProvider extends MarketDataProvider {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.twelvedata.com';
        this.rateLimitDelay = 8000; // 8 segundos para respeitar limite de 8 req/min
        this.lastRequestTime = 0;
    }

    /**
     * Garante respeito ao rate limiting
     */
    async respectRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.rateLimitDelay) {
            const delayNeeded = this.rateLimitDelay - timeSinceLastRequest;
            await sleep(delayNeeded);
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Mapeia timeframes para intervalos da API
     * @param {string} timeframe - Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
     * @returns {string} - Intervalo para a API
     */
    mapTimeframe(timeframe) {
        const mapping = {
            '1m': '1min',
            '5m': '5min',
            '15m': '15min',
            '30m': '30min',
            '1h': '1h',
            '4h': '4h',
            '1d': '1day',
            '1w': '1week',
            '1M': '1month'
        };

        return mapping[timeframe] || '1day';
    }

    /**
     * Obtém dados OHLCV da Twelve Data
     * @param {string} symbol - Símbolo do ativo
     * @param {string} timeframe - Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
     * @param {number} limit - Número de candles (max 5000)
     * @returns {Promise<Array>} - Dados OHLCV
     */
    async getOHLCV(symbol, timeframe = '1d', limit = 100) {
        try {
            await this.respectRateLimit();

            const interval = this.mapTimeframe(timeframe);

            const response = await axios.get(`${this.baseUrl}/time_series`, {
                params: {
                    symbol,
                    interval,
                    outputsize: Math.min(limit, 5000),
                    apikey: this.apiKey
                }
            });

            // Verificar por erros
            if (response.data.status === 'error') {
                throw new Error(response.data.message || 'Erro na API Twelve Data');
            }

            // Formatar dados
            const values = response.data.values || [];
            return values.map(item => ({
                timestamp: new Date(item.datetime).getTime(),
                open: parseFloat(item.open),
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                close: parseFloat(item.close),
                volume: parseFloat(item.volume || 0)
            })).reverse(); // Inverter para ordem cronológica
        } catch (error) {
            console.error(`Erro ao obter dados OHLCV da Twelve Data: ${error.message}`);
            throw new Error(`Falha ao obter dados de mercado: ${error.message}`);
        }
    }

    /**
     * Busca símbolos disponíveis
     * @param {string} symbol - Símbolo parcial para busca
     * @returns {Promise<Array>} - Lista de símbolos
     */
    async getSymbols(symbol) {
        try {
            await this.respectRateLimit();

            const response = await axios.get(`${this.baseUrl}/symbol_search`, {
                params: {
                    symbol,
                    outputsize: 30,
                    apikey: this.apiKey
                }
            });

            if (response.data.status === 'error') {
                throw new Error(response.data.message || 'Erro na API Twelve Data');
            }

            return response.data.data.map(item => ({
                symbol: item.symbol,
                name: item.instrument_name,
                exchange: item.exchange,
                country: item.country,
                type: item.type
            }));
        } catch (error) {
            console.error(`Erro ao buscar símbolos da Twelve Data: ${error.message}`);
            throw new Error(`Falha ao buscar símbolos: ${error.message}`);
        }
    }

    /**
 * Tenta obter dados de vários provedores até ter sucesso
 * @param {string} symbol - Símbolo do ativo
 * @param {string} timeframe - Timeframe
 * @param {number} limit - Limite de candles
 * @returns {Promise<Array>} - Dados OHLCV
 */
    async getOHLCVWithFallback(symbol, timeframe, limit) {
        const providerNames = Object.keys(this.providers);

        for (const providerName of providerNames) {
            try {
                console.log(`Tentando obter dados de ${symbol} com o provedor ${providerName}...`);
                const data = await this.providers[providerName].getOHLCV(symbol, timeframe, limit);
                console.log(`Dados obtidos com sucesso de ${providerName}`);
                return data;
            } catch (error) {
                console.error(`Falha ao obter dados de ${providerName}: ${error.message}`);
                // Continua para o próximo provedor
            }
        }

        throw new Error(`Não foi possível obter dados para ${symbol} de nenhum provedor`);
    }
}

/**
 * Serviço agregador de dados de mercado que utiliza múltiplos provedores
 */
class MarketDataService {
    constructor() {
        this.providers = {};
        this.defaultProvider = null;
    }

    /**
     * Registra um provedor de dados
     * @param {string} name - Nome do provedor
     * @param {MarketDataProvider} provider - Instância do provedor
     * @param {boolean} isDefault - Se é o provedor padrão
     */
    registerProvider(name, provider, isDefault = false) {
        this.providers[name] = provider;

        if (isDefault || !this.defaultProvider) {
            this.defaultProvider = name;
        }
    }

    /**
     * Obtém dados OHLCV de um provedor específico ou do padrão
     * @param {string} symbol - Símbolo do ativo
     * @param {string} timeframe - Timeframe
     * @param {number} limit - Limite de candles
     * @param {string} providerName - Nome do provedor (opcional)
     * @returns {Promise<Array>} - Dados OHLCV
     */
    async getOHLCV(symbol, timeframe, limit, providerName = null) {
        const provider = providerName ? this.providers[providerName] : this.providers[this.defaultProvider];

        if (!provider) {
            throw new Error(`Provedor de dados "${providerName || this.defaultProvider}" não encontrado`);
        }

        return await provider.getOHLCV(symbol, timeframe, limit);
    }

    /**
     * Versão com cache para obter dados OHLCV
     * @param {string} symbol - Símbolo do ativo
     * @param {string} timeframe - Timeframe
     * @param {number} limit - Limite de candles
     * @param {string} providerName - Nome do provedor (opcional)
     * @param {boolean} useCache - Se deve usar o cache
     * @returns {Promise<Array>} - Dados OHLCV
     */
    async getOHLCVWithCache(symbol, timeframe, limit, providerName = null, useCache = true) {
        // Normalizar parâmetros
        const normalizedTimeframe = timeframe || '1d';
        const normalizedLimit = limit || 100;
        const provider = providerName || this.defaultProvider;

        // Verificar no cache
        if (useCache) {
            const cachedData = this.cache.get(symbol, normalizedTimeframe, normalizedLimit, provider);
            if (cachedData) {
                console.log(`Usando dados em cache para ${symbol}`);
                return cachedData;
            }
        }

        // Buscar dados da API
        const data = await this.getOHLCV(symbol, normalizedTimeframe, normalizedLimit, provider);

        // Armazenar no cache
        if (useCache && data) {
            this.cache.set(symbol, normalizedTimeframe, normalizedLimit, provider, data);
        }

        return data;
    }

    /**
     * Busca símbolos em um provedor específico ou no padrão
     * @param {string} query - Termo de busca
     * @param {string} providerName - Nome do provedor (opcional)
     * @returns {Promise<Array>} - Lista de símbolos
     */
    async searchSymbols(query, providerName = null) {
        const provider = providerName ? this.providers[providerName] : this.providers[this.defaultProvider];

        if (!provider) {
            throw new Error(`Provedor de dados "${providerName || this.defaultProvider}" não encontrado`);
        }

        return await provider.getSymbols(query);
    }
}

// Exportar todas as classes
module.exports = {
    MarketDataProvider,
    AlphaVantageProvider,
    CoinGeckoProvider,
    FinnhubProvider,
    TwelveDataProvider,
    MarketDataService
};
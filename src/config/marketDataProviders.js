const {
    AlphaVantageProvider,
    CoinGeckoProvider,
    FinnhubProvider,
    TwelveDataProvider,
    MarketDataService
} = require('../infrastructure/services/marketDataService');

/**
 * Configura e inicializa os provedores de dados de mercado
 * @returns {MarketDataService} - Serviço configurado
 */
function initializeMarketDataProviders() {
    const marketDataService = new MarketDataService();

    // Inicializar Alpha Vantage se a chave estiver configurada
    if (process.env.ALPHA_VANTAGE_API_KEY) {
        const alphaVantageProvider = new AlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY);
        marketDataService.registerProvider('alphavantage', alphaVantageProvider);
    }

    // Inicializar CoinGecko (não requer API key para uso básico)
    const coinGeckoProvider = new CoinGeckoProvider();
    marketDataService.registerProvider('coingecko', coinGeckoProvider);

    // Inicializar Finnhub se a chave estiver configurada
    if (process.env.FINNHUB_API_KEY) {
        const finnhubProvider = new FinnhubProvider(process.env.FINNHUB_API_KEY);
        marketDataService.registerProvider('finnhub', finnhubProvider);
    }

    // Inicializar TwelveData se a chave estiver configurada
    if (process.env.TWELVEDATA_API_KEY) {
        const twelveDataProvider = new TwelveDataProvider(process.env.TWELVEDATA_API_KEY);
        marketDataService.registerProvider('twelvedata', twelveDataProvider);

        // Definir TwelveData como provedor padrão se disponível
        marketDataService.registerProvider('twelvedata', twelveDataProvider, true);
    }

    // Se nenhum provedor específico for definido como padrão, priorizar na seguinte ordem
    if (!marketDataService.defaultProvider) {
        if (marketDataService.providers['alphavantage']) {
            marketDataService.defaultProvider = 'alphavantage';
        } else if (marketDataService.providers['finnhub']) {
            marketDataService.defaultProvider = 'finnhub';
        } else if (marketDataService.providers['coingecko']) {
            marketDataService.defaultProvider = 'coingecko';
        }
    }

    return marketDataService;
}

module.exports = { initializeMarketDataProviders };
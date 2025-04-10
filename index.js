// Importar repositórios diretamente
const MarketDataRepository = require('./src/infrastructure/repositories/marketDataRepository');
const TradingSignalRepository = require('./src/infrastructure/repositories/tradingSignalRepository');
const FirebaseStorageService = require('./src/infrastructure/services/firebaseStorageService');

// Instanciar repositórios (use let em vez de const)
let marketDataRepository;
let tradingSignalRepository;
let storageService;

try {
    marketDataRepository = new MarketDataRepository();
    console.log("MarketDataRepository instanciado com sucesso");
} catch (error) {
    console.error("Erro ao instanciar MarketDataRepository:", error);
    marketDataRepository = null;
}

try {
    tradingSignalRepository = new TradingSignalRepository();
    console.log("TradingSignalRepository instanciado com sucesso");
} catch (error) {
    console.error("Erro ao instanciar TradingSignalRepository:", error);
    tradingSignalRepository = null;
}

try {
    storageService = new FirebaseStorageService();
    console.log("FirebaseStorageService instanciado com sucesso");
} catch (error) {
    console.error("Erro ao instanciar FirebaseStorageService:", error);
    storageService = null;
}

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Inicialização do Firebase - deve vir logo no início
const { initializeFirebase } = require('./src/config/firebase');
initializeFirebase();

// Configuração do servidor Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança e configuração
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite por IP
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Middlewares personalizados
const { logRequest } = require('./src/api/middleware/logger');
const { validateRequest } = require('./src/api/middleware/validation');
app.use(logRequest);

// Importar modelo de dados
const MarketData = require('./src/domain/models/MarketData');


// Inicializar serviços
const GeminiAIClient = require('./src/config/gemini');
const geminiClient = new GeminiAIClient(process.env.GEMINI_API_KEY);

const TechnicalAnalysisService = require('./src/services/technicalAnalysisService');
const technicalAnalysisService = new TechnicalAnalysisService(geminiClient);

// Inicializar provedores de dados de mercado
const { initializeMarketDataProviders } = require('./src/config/marketDataProviders');
const marketDataService = initializeMarketDataProviders();

// Inicializar controladores
const MarketAnalysisController = require('./src/api/controllers/marketAnalysisController');
const HistoryController = require('./src/api/controllers/historyController');
const SymbolController = require('./src/api/controllers/symbolController');
const MarketDataController = require('./src/api/controllers/marketDataController');

const marketAnalysisController = new MarketAnalysisController(
    technicalAnalysisService,
    tradingSignalRepository,
    marketDataRepository
);
const historyController = new HistoryController(
    marketDataRepository,
    tradingSignalRepository
);
const symbolController = new SymbolController(marketDataService);
const marketDataController = new MarketDataController(
    marketDataService,
    marketAnalysisController
);

// Importar rotas
const marketRoutes = require('./src/api/routes/marketRoutes');
const historyRoutes = require('./src/api/routes/historyRoutes');
const symbolRoutes = require('./src/api/routes/symbolRoutes');
const marketDataRoutes = require('./src/api/routes/marketDataRoutes');

// Configurar rotas
app.use('/api/market', validateRequest, marketRoutes(marketAnalysisController));
app.use('/api/history', historyRoutes(historyController));
app.use('/api/symbols', symbolRoutes(symbolController));
app.use('/api/market-data', marketDataRoutes(marketDataController));

// Rota de status
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        application: 'FinTechAI-Analyzer',
        version: '1.0.0'
    });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: true,
        message: 'Internal server error'
    });
});

// Inicializar o agendador de dados de mercado
const MarketDataScheduler = require('./src/utils/marketDataScheduler');
const scheduler = new MarketDataScheduler(
    marketDataService,
    technicalAnalysisService,
    tradingSignalRepository
);

// Adicionar alguns ativos de exemplo à watchlist
scheduler.addToWatchlist({ symbol: 'AAPL', timeframe: '1d' });
scheduler.addToWatchlist({ symbol: 'MSFT', timeframe: '1d' });
scheduler.addToWatchlist({ symbol: 'BTC/USD', timeframe: '1d', provider: 'coingecko' });

// Iniciar o agendador (a cada 15 minutos)
scheduler.start('*/15 * * * *');

// Iniciar servidor - deve ser o último passo
app.listen(PORT, () => {
    console.log(`FinTechAI-Analyzer API running on port ${PORT}`);
});
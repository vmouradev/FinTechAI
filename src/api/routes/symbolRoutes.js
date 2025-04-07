const express = require('express');
const router = express.Router();

module.exports = (controller) => {
    // Rota para buscar símbolos
    router.get('/search', controller.searchSymbols.bind(controller));

    // Rota para obter dados OHLCV
    router.get('/market-data', controller.getMarketData.bind(controller));

    return router;
};

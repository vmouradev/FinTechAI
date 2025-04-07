const express = require('express');
const router = express.Router();

module.exports = (controller) => {
    // Rota para buscar e analisar dados em uma etapa
    router.post('/fetch-and-analyze', controller.fetchAndAnalyze.bind(controller));

    // Rota para buscar dados históricos
    router.post('/historical', controller.fetchHistoricalData.bind(controller));

    // Rota para listar provedores disponíveis
    router.get('/providers', controller.getProvidersStatus.bind(controller));

    return router;
};
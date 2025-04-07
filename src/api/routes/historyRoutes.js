const express = require('express');
const router = express.Router();

module.exports = (controller) => {
    // Rotas para histórico de análises
    router.get('/analyses/:symbol/:limit?', controller.getAnalysisHistory.bind(controller));

    // Rotas para estatísticas de sinais
    router.get('/stats/:symbol/:days?', controller.getSignalStats.bind(controller));

    // Rota para feedback de sinais
    router.post('/feedback/:signalId', controller.submitSignalFeedback.bind(controller));

    return router;
};
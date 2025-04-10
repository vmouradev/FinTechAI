// src/api/routes/historyRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (controller) => {
    // Rotas para histórico de análises (parâmetro opcional definido corretamente)
    router.get('/analyses/:symbol/:limit?', controller.getAnalysisHistory.bind(controller));

    // Rotas para estatísticas de sinais (parâmetro opcional definido corretamente)
    router.get('/stats/:symbol/:days?', controller.getSignalStats.bind(controller));

    // Rota para feedback de sinais
    router.post('/feedback/:signalId', controller.submitSignalFeedback.bind(controller));

    return router;
};
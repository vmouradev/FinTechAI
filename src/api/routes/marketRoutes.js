// src/api/routes/marketRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (controller) => {
    // Rota para análise de mercado
    router.post('/analyze', controller.analyzeMarket.bind(controller));

    return router;
};
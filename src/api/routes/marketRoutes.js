const express = require('express');
const router = express.Router();

module.exports = (controller) => {
    router.post('/analyze', controller.analyzeMarket.bind(controller));
    return router;
};

// 7. Middleware de validação - api/middleware/validation.js
const validateRequest = (req, res, next) => {
    const { symbol, timeframe, data } = req.body;

    if (!symbol || !timeframe || !data) {
        return res.status(400).json({
            error: true,
            message: 'Missing required fields: symbol, timeframe, and data'
        });
    }

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
            error: true,
            message: 'Market data must be a non-empty array'
        });
    }

    next();
};
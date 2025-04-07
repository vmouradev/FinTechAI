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

module.exports = { validateRequest };
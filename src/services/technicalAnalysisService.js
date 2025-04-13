const TechnicalIndicators = require('technicalindicators');

class TechnicalAnalysisService {
    constructor(geminiClient) {
        this.geminiClient = geminiClient;
    }

    extractOHLCV(data) {
        // Verificação defensiva
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.error('Dados OHLCV inválidos ou vazios');
            return {
                timestamp: [],
                open: [],
                high: [],
                low: [],
                close: [],
                volume: []
            };
        }

        const timestamp = data.map(candle => candle?.timestamp || 0);
        const open = data.map(candle => candle?.open || 0);
        const high = data.map(candle => candle?.high || 0);
        const low = data.map(candle => candle?.low || 0);
        const close = data.map(candle => candle?.close || 0);
        const volume = data.map(candle => candle?.volume || 0);

        return { timestamp, open, high, low, close, volume };
    }

    async analyzeCandlestickPatterns(data) {
        try {
            const patterns = {};
            const { open, high, low, close } = this.extractOHLCV(data);

            // Verificar se temos dados suficientes
            if (!open || !high || !low || !close || open.length < 3) {
                console.warn('Dados insuficientes para análise de padrões de candlestick');
                return {}; // Retorna objeto vazio
            }

            // Usar apenas os padrões que sabemos que estão disponíveis
            try {
                patterns.bullishEngulfing = TechnicalIndicators.bullishengulfingpattern({ open, high, low, close });
            } catch (e) {
                console.warn('Erro ao calcular bullishEngulfing:', e.message);
            }

            try {
                patterns.bearishEngulfing = TechnicalIndicators.bearishengulfingpattern({ open, high, low, close });
            } catch (e) {
                console.warn('Erro ao calcular bearishEngulfing:', e.message);
            }

            try {
                if (TechnicalIndicators.hammerpattern) {
                    patterns.hammer = TechnicalIndicators.hammerpattern({ open, high, low, close });
                }
            } catch (e) {
                console.warn('Erro ao calcular hammer:', e.message);
            }

            return patterns;
        } catch (error) {
            console.error('Erro ao analisar padrões de candlestick:', error);
            return {}; // Retorna objeto vazio em caso de erro
        }
    }


    async analyzeTrend(data) {
        try {
            const { close } = this.extractOHLCV(data);

            // Verificar se temos dados suficientes
            if (!close || close.length < 20) {
                console.warn('Dados insuficientes para análise de tendência');
                return {
                    trend: 'neutral',
                    strength: 'weak',
                    indicators: {
                        sma20: 0,
                        sma50: 0,
                        sma200: 0
                    }
                };
            }

            // Médias móveis
            const sma20 = TechnicalIndicators.SMA.calculate({ period: 20, values: close });
            const sma50 = close.length >= 50 ?
                TechnicalIndicators.SMA.calculate({ period: 50, values: close }) :
                [close[close.length - 1]];
            const sma200 = close.length >= 200 ?
                TechnicalIndicators.SMA.calculate({ period: 200, values: close }) :
                [close[close.length - 1]];

            // Verificar se as médias móveis foram calculadas
            if (!sma20 || sma20.length === 0) {
                console.warn('Falha ao calcular SMA20');
                return {
                    trend: 'neutral',
                    strength: 'weak',
                    indicators: {
                        sma20: close[close.length - 1],
                        sma50: close[close.length - 1],
                        sma200: close[close.length - 1]
                    }
                };
            }

            // Determinar a tendência
            const currentPrice = close[close.length - 1];
            const currentSMA20 = sma20[sma20.length - 1];
            const currentSMA50 = sma50[sma50.length - 1];
            const currentSMA200 = sma200[sma200.length - 1];

            let trend = 'neutral';
            let strength = 'weak';

            // Tendência de alta
            if (currentPrice > currentSMA20 && currentSMA20 > currentSMA50 && currentSMA50 > currentSMA200) {
                trend = 'uptrend';
                strength = 'strong';
            }
            // Tendência de alta moderada
            else if (currentPrice > currentSMA20 && currentPrice > currentSMA50) {
                trend = 'uptrend';
                strength = 'moderate';
            }
            // Tendência de baixa
            else if (currentPrice < currentSMA20 && currentSMA20 < currentSMA50 && currentSMA50 < currentSMA200) {
                trend = 'downtrend';
                strength = 'strong';
            }
            // Tendência de baixa moderada
            else if (currentPrice < currentSMA20 && currentPrice < currentSMA50) {
                trend = 'downtrend';
                strength = 'moderate';
            }

            return {
                trend,
                strength,
                indicators: {
                    sma20: currentSMA20,
                    sma50: currentSMA50,
                    sma200: currentSMA200
                }
            };
        } catch (error) {
            console.error('Erro ao analisar tendência:', error);
            return {
                trend: 'neutral',
                strength: 'weak',
                indicators: {
                    sma20: 0,
                    sma50: 0,
                    sma200: 0
                }
            };
        }
    }

    async calculateIndicators(data) {
        try {
            const { close, high, low, volume } = this.extractOHLCV(data);

            // Verificar se temos dados suficientes
            if (!close || close.length < 14) {
                console.warn('Dados insuficientes para cálculo de indicadores');
                return {
                    rsi: 50,
                    macd: {
                        MACD: 0,
                        signal: 0,
                        histogram: 0
                    },
                    bollingerBands: {
                        upper: close ? close[close.length - 1] + 10 : 0,
                        middle: close ? close[close.length - 1] : 0,
                        lower: close ? close[close.length - 1] - 10 : 0
                    }
                };
            }

            // RSI
            let rsi = 50;
            try {
                const rsiValues = TechnicalIndicators.RSI.calculate({
                    values: close,
                    period: 14
                });
                rsi = rsiValues && rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 50;
            } catch (e) {
                console.warn('Erro ao calcular RSI:', e.message);
            }

            // MACD
            let macd = { MACD: 0, signal: 0, histogram: 0 };
            try {
                if (close.length >= 26) {
                    const macdValues = TechnicalIndicators.MACD.calculate({
                        values: close,
                        fastPeriod: 12,
                        slowPeriod: 26,
                        signalPeriod: 9,
                        SimpleMAOscillator: false,
                        SimpleMASignal: false
                    });

                    if (macdValues && macdValues.length > 0) {
                        macd = macdValues[macdValues.length - 1];
                    }
                }
            } catch (e) {
                console.warn('Erro ao calcular MACD:', e.message);
            }

            // Bollinger Bands
            let bb = {
                upper: close[close.length - 1] + 10,
                middle: close[close.length - 1],
                lower: close[close.length - 1] - 10
            };

            try {
                if (close.length >= 20) {
                    const bbValues = TechnicalIndicators.BollingerBands.calculate({
                        values: close,
                        period: 20,
                        stdDev: 2
                    });

                    if (bbValues && bbValues.length > 0) {
                        bb = bbValues[bbValues.length - 1];
                    }
                }
            } catch (e) {
                console.warn('Erro ao calcular Bollinger Bands:', e.message);
            }

            // Stochastic
            let stochastic = { k: 50, d: 50 };
            try {
                if (high && low && high.length >= 14) {
                    const stochasticValues = TechnicalIndicators.Stochastic.calculate({
                        high,
                        low,
                        close,
                        period: 14,
                        signalPeriod: 3
                    });

                    if (stochasticValues && stochasticValues.length > 0) {
                        stochastic = stochasticValues[stochasticValues.length - 1];
                    }
                }
            } catch (e) {
                console.warn('Erro ao calcular Stochastic:', e.message);
            }

            // ADX
            let adx = 25;
            try {
                if (high && low && high.length >= 14) {
                    const adxValues = TechnicalIndicators.ADX.calculate({
                        high,
                        low,
                        close,
                        period: 14
                    });

                    if (adxValues && adxValues.length > 0) {
                        adx = adxValues[adxValues.length - 1];
                    }
                }
            } catch (e) {
                console.warn('Erro ao calcular ADX:', e.message);
            }

            return {
                rsi,
                macd,
                bollingerBands: bb,
                stochastic,
                adx
            };
        } catch (error) {
            console.error('Erro ao calcular indicadores:', error);
            return {
                rsi: 50,
                macd: {
                    MACD: 0,
                    signal: 0,
                    histogram: 0
                },
                bollingerBands: {
                    upper: 0,
                    middle: 0,
                    lower: 0
                },
                stochastic: {
                    k: 50,
                    d: 50
                },
                adx: 25
            };
        }
    }

    async generateTradingSignals(marketData) {
        try {
            // Análise técnica usando biblioteca
            const candlestickPatterns = await this.analyzeCandlestickPatterns(marketData.data);
            const trendAnalysis = await this.analyzeTrend(marketData.data);
            const indicators = await this.calculateIndicators(marketData.data);

            // Análise avançada usando Gemini AI
            console.log("Enviando dados para análise pela IA Gemini...");
            let aiAnalysis = null;
            try {
                // Preparar dados para análise da IA
                const aiData = {
                    symbol: marketData.symbol,
                    timeframe: marketData.timeframe,
                    technicalIndicators: indicators,
                    trend: trendAnalysis,
                    patterns: candlestickPatterns,
                    // Enviar apenas os últimos 10 candles para a IA para evitar sobrecarga
                    lastCandles: marketData.data.slice(-10)
                };

                aiAnalysis = await this.geminiClient.analyzeMarketData(aiData);
                console.log("Análise da IA Gemini recebida com sucesso");
            } catch (error) {
                console.error('Erro na análise da IA Gemini:', error);
                // Continue mesmo com erro na IA
            }

            // Consolidar resultados
            return this.consolidateAnalysis(
                marketData.symbol,
                marketData.timeframe,
                candlestickPatterns,
                trendAnalysis,
                indicators,
                aiAnalysis
            );
        } catch (error) {
            console.error('Erro ao gerar sinais de trading:', error);
            throw new Error('Falha ao gerar sinais de trading');
        }
    }
    async consolidateAnalysis(symbol, timeframe, patterns, trend, indicators, aiAnalysis) {
        // Extrair texto da resposta da AI
        let aiRecommendation = '';
        if (aiAnalysis && aiAnalysis.candidates && aiAnalysis.candidates.length > 0) {
            aiRecommendation = aiAnalysis.candidates[0].content.parts[0].text;
        }

        // Determinar sinal de negociação com base nos indicadores técnicos
        let signalStrength = 0;
        let signal = 'neutral';

        // RSI - Sobrecomprado/Sobrevendido
        if (indicators && indicators.rsi) {
            if (indicators.rsi > 70) {
                signalStrength -= 2; // Sobrecomprado (sinal de venda)
            } else if (indicators.rsi < 30) {
                signalStrength += 2; // Sobrevendido (sinal de compra)
            }
        }

        // MACD
        if (indicators && indicators.macd && indicators.macd.MACD !== undefined && indicators.macd.signal !== undefined) {
            if (indicators.macd.MACD > indicators.macd.signal) {
                signalStrength += 1; // Linha MACD acima da linha de sinal (compra)
            } else {
                signalStrength -= 1; // Linha MACD abaixo da linha de sinal (venda)
            }
        }

        // Bollinger Bands - Removido por enquanto para evitar o erro

        // Força da tendência
        if (trend && trend.trend) {
            if (trend.trend === 'uptrend') {
                signalStrength += (trend.strength === 'strong' ? 2 : 1);
            } else if (trend.trend === 'downtrend') {
                signalStrength -= (trend.strength === 'strong' ? 2 : 1);
            }
        }

        // Padrões de Candlestick (verificar os mais recentes)
        const recentPatterns = {};
        if (patterns && typeof patterns === 'object') {
            Object.keys(patterns).forEach(pattern => {
                const values = patterns[pattern];
                if (values && Array.isArray(values) && values.length > 0) {
                    // Verificar os últimos 3 candles para padrões
                    const recentValues = values.slice(-3);
                    if (recentValues.some(value => value)) {
                        recentPatterns[pattern] = true;

                        // Ajustar sinal com base no padrão
                        if (pattern.startsWith('bullish')) {
                            signalStrength += 1;
                        } else if (pattern.startsWith('bearish')) {
                            signalStrength -= 1;
                        }
                    }
                }
            });
        }

        // Determinar sinal final
        if (signalStrength >= 3) {
            signal = 'strong_buy';
        } else if (signalStrength > 0) {
            signal = 'buy';
        } else if (signalStrength <= -3) {
            signal = 'strong_sell';
        } else if (signalStrength < 0) {
            signal = 'sell';
        }

        return {
            symbol,
            timeframe,
            timestamp: new Date().toISOString(),
            technical_analysis: {
                trend: trend ? trend.trend : 'neutral',
                trend_strength: trend ? trend.strength : 'weak',
                indicators: indicators ? {
                    rsi: indicators.rsi,
                    macd: indicators.macd ? {
                        macd: indicators.macd.MACD,
                        signal: indicators.macd.signal,
                        histogram: indicators.macd.histogram
                    } : null,
                    bollinger_bands: indicators.bollingerBands ? {
                        upper: indicators.bollingerBands.upper,
                        middle: indicators.bollingerBands.middle,
                        lower: indicators.bollingerBands.lower
                    } : null,
                    stochastic: indicators.stochastic ? {
                        k: indicators.stochastic.k,
                        d: indicators.stochastic.d
                    } : null,
                    adx: indicators.adx
                } : {},
                patterns: recentPatterns
            },
            trading_signal: {
                signal,
                strength: Math.abs(signalStrength),
                confidence: Math.min(100, Math.abs(signalStrength) * 20)
            },
            ai_analysis: {
                recommendation: aiRecommendation
            }
        };
    }
}

module.exports = TechnicalAnalysisService;
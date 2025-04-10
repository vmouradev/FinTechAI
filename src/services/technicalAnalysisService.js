const TechnicalIndicators = require('technicalindicators');

class TechnicalAnalysisService {
    constructor(geminiClient) {
        this.geminiClient = geminiClient;
    }

    extractOHLCV(data) {
        const timestamp = data.map(candle => candle.timestamp);
        const open = data.map(candle => candle.open);
        const high = data.map(candle => candle.high);
        const low = data.map(candle => candle.low);
        const close = data.map(candle => candle.close);
        const volume = data.map(candle => candle.volume);

        return { timestamp, open, high, low, close, volume };
    }

    async analyzeCandlestickPatterns(data) {
        const patterns = {};
        const { open, high, low, close } = this.extractOHLCV(data);

        // Bullish patterns
        patterns.bullishEngulfing = TechnicalIndicators.bullishengulfingpattern({ open, high, low, close });
        patterns.bullishHarami = TechnicalIndicators.bullishharamipattern({ open, high, low, close });
        patterns.morningstar = TechnicalIndicators.morningstar({ open, high, low, close });

        // Bearish patterns
        patterns.bearishEngulfing = TechnicalIndicators.bearishengulfingpattern({ open, high, low, close });
        patterns.bearishHarami = TechnicalIndicators.bearishharamipattern({ open, high, low, close });
        patterns.eveningstar = TechnicalIndicators.eveningstar({ open, high, low, close });

        return patterns;
    }

    async analyzeTrend(data) {
        const { close } = this.extractOHLCV(data);

        // Médias móveis
        const sma20 = TechnicalIndicators.SMA.calculate({ period: 20, values: close });
        const sma50 = TechnicalIndicators.SMA.calculate({ period: 50, values: close });
        const sma200 = TechnicalIndicators.SMA.calculate({ period: 200, values: close });

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
    }

    async calculateIndicators(data) {
        const { close, high, low, volume } = this.extractOHLCV(data);

        // RSI
        const rsi = TechnicalIndicators.RSI.calculate({
            values: close,
            period: 14
        });

        // MACD
        const macd = TechnicalIndicators.MACD.calculate({
            values: close,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });

        // Bollinger Bands
        const bb = TechnicalIndicators.BollingerBands.calculate({
            values: close,
            period: 20,
            stdDev: 2
        });

        // Stochastic
        const stochastic = TechnicalIndicators.Stochastic.calculate({
            high,
            low,
            close,
            period: 14,
            signalPeriod: 3
        });

        // ADX (Average Directional Index)
        const adx = TechnicalIndicators.ADX.calculate({
            high,
            low,
            close,
            period: 14
        });

        // OBV (On Balance Volume)
        const obv = TechnicalIndicators.OBV.calculate({
            close,
            volume
        });

        return {
            rsi: rsi[rsi.length - 1],
            macd: macd[macd.length - 1],
            bollingerBands: bb[bb.length - 1],
            stochastic: stochastic[stochastic.length - 1],
            adx: adx[adx.length - 1],
            obv: obv[obv.length - 1]
        };
    }

    async generateTradingSignals(marketData) {
        try {
            // Análise técnica usando biblioteca
            const candlestickPatterns = await this.analyzeCandlestickPatterns(marketData.data);
            const trendAnalysis = await this.analyzeTrend(marketData.data);
            const indicators = await this.calculateIndicators(marketData.data);

            // Análise avançada usando Gemini AI
            const aiAnalysis = await this.geminiClient.analyzeMarketData({
                symbol: marketData.symbol,
                timeframe: marketData.timeframe,
                technicalIndicators: indicators,
                trend: trendAnalysis,
                patterns: candlestickPatterns,
                lastCandles: marketData.data.slice(-10) // Enviar apenas os últimos 10 candles para a AI
            });

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
            console.error('Error generating trading signals:', error);
            throw new Error('Failed to generate trading signals');
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
        if (indicators.rsi > 70) {
            signalStrength -= 2; // Sobrecomprado (sinal de venda)
        } else if (indicators.rsi < 30) {
            signalStrength += 2; // Sobrevendido (sinal de compra)
        }

        // MACD
        if (indicators.macd.MACD > indicators.macd.signal) {
            signalStrength += 1; // Linha MACD acima da linha de sinal (compra)
        } else {
            signalStrength -= 1; // Linha MACD abaixo da linha de sinal (venda)
        }

        // Bollinger Bands
        const lastClose = patterns.close[patterns.close.length - 1];
        if (lastClose > indicators.bollingerBands.upper) {
            signalStrength -= 1; // Preço acima da banda superior (potencial sobrecompra)
        } else if (lastClose < indicators.bollingerBands.lower) {
            signalStrength += 1; // Preço abaixo da banda inferior (potencial sobrevenda)
        }

        // Força da tendência
        if (trend.trend === 'uptrend') {
            signalStrength += (trend.strength === 'strong' ? 2 : 1);
        } else if (trend.trend === 'downtrend') {
            signalStrength -= (trend.strength === 'strong' ? 2 : 1);
        }

        // Padrões de Candlestick (verificar os mais recentes)
        const recentPatterns = {};
        Object.keys(patterns).forEach(pattern => {
            const values = patterns[pattern];
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
        });

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
                trend: trend.trend,
                trend_strength: trend.strength,
                indicators: {
                    rsi: indicators.rsi,
                    macd: {
                        macd: indicators.macd.MACD,
                        signal: indicators.macd.signal,
                        histogram: indicators.macd.histogram
                    },
                    bollinger_bands: {
                        upper: indicators.bollingerBands.upper,
                        middle: indicators.bollingerBands.middle,
                        lower: indicators.bollingerBands.lower
                    },
                    stochastic: {
                        k: indicators.stochastic.k,
                        d: indicators.stochastic.d
                    },
                    adx: indicators.adx
                },
                patterns: recentPatterns
            },
            trading_signal: {
                signal,
                strength: Math.abs(signalStrength),
                confidence: Math.min(100, Math.abs(signalStrength) * 20) // Converter força para porcentagem
            },
            ai_analysis: {
                recommendation: aiRecommendation
            }
        };
    }
}

module.exports = TechnicalAnalysisService;
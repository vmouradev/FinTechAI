# 💹 FinTechAI

**FinTechAI** é uma API robusta para análise técnica de mercados financeiros potencializada por inteligência artificial.  
Desenvolvida com **arquitetura limpa** e **princípios sólidos de design**, esta API combina **análise técnica tradicional** com **IA avançada** para gerar sinais de trading de alta qualidade.

---

## 🚀 Recursos

- **Análise Técnica Avançada**: Implementação de mais de 15 indicadores e padrões de mercado.
- **Integração com IA**: Utiliza o modelo **Gemini 2.0 da Google** para análise avançada de padrões.
- **Arquitetura Limpa**: Separação clara de responsabilidades e uso de padrões de design.
- **Alta Performance**: Otimizada para responder rapidamente mesmo com grandes volumes de dados.
- **Segurança Robusta**: Proteções contra ataques comuns e limitação de requisições.
- **Documentação Completa**: API totalmente documentada com exemplos práticos de uso.

---

## 📊 Indicadores e Análises Suportados

### 🔥 Análise de Candlestick
- **Padrões Bullish**: Engulfing, Harami, Morning Star
- **Padrões Bearish**: Engulfing, Harami, Evening Star

### 📈 Análise de Tendências
- Médias Móveis (SMA 20, 50, 200)
- Identificação de força de tendência

### 🧠 Indicadores Técnicos
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- Estocásticos
- ADX (Average Directional Index)
- OBV (On Balance Volume)

### 🤖 IA Avançada
- Análise de congruência entre indicadores
- Previsão de movimentos baseada em padrões históricos
- Recomendações contextuais de trading

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js + Express.js  
- **Análise Técnica**: [technicalindicators](https://www.npmjs.com/package/technicalindicators)  
- **IA**: API Google Gemini 2.0  
- **Segurança**: Helmet, Express Rate Limit, CORS  
- **Logging**: Winston  
- **HTTP Client**: Axios  
- **Validação**: Validação robusta personalizada

---

## 📋 Pré-requisitos

Certifique-se de ter os seguintes requisitos instalados em seu ambiente:

- **Node.js** >= 14.0.0  
- **NPM** >= 6.0.0  
- **Chave de API** do Google Gemini

---

## 📦 Instalação

```bash
git clone https://github.com/vmouradev/FinTechAI.git
cd FinTechAI
npm install

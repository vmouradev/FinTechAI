const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Configurações de segurança
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Limitar taxa de requisições
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite por IP
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

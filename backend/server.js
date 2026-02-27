require('dotenv').config();

const express = require('express');
const cors = require('cors');

const creditRoutes = require('./routes/credit');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow localhost:3000 and any origin (for Vercel deploy)
    if (origin === 'http://localhost:3000' || origin) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// JSON body parsing
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount routes
app.use('/api/credit', creditRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`CredLink ZK Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

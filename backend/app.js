import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import jobRequestRoutes from './routes/jobRequestRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import upgradeRequestRoutes from './routes/upgradeRequestRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import adRoutes from './routes/adRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import { requestLogger, errorLogger, performanceLogger, securityLogger } from './middlewares/logging.middleware.js';

const app = express();

// Middleware
// app.use(morgan('dev')); // HTTP request logging
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
})); // Enable CORS
// Parse JSON for all routes except webhook
app.use((req, res, next) => {
  if (
    req.path === '/api/payment/webhook' ||
    req.path === '/api/subscriptions/webhook'
  ) {
    // For Stripe webhooks, we need raw body
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    // For all other routes, parse JSON
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Custom logging middleware
app.use(requestLogger); // Request/response logging
// app.use(performanceLogger); // Performance monitoring
app.use(securityLogger); // Security logging

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/requests', jobRequestRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upgrade-requests', upgradeRequestRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/schedule', scheduleRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test payment endpoint
app.get('/api/payment/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment routes are working',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    },
    timestamp: new Date().toISOString()
  });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    },
    timestamp: new Date().toISOString()
  });
});

export default app;

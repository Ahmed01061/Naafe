import dotenv from 'dotenv';
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import socketService from './services/socketService.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
socketService.initialize(server);

console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.slice(0,4) + '...' + process.env.OPENROUTER_API_KEY.slice(-4) : 'undefined');

// Immediately-invoked async function for better error handling
(async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO server ready`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1); // Exit process with failure
  }
})();

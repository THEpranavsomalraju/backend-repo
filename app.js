// app.js - Main server file for Shiplet backend
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Improved CORS configuration for deployment
app.use(cors({
  // In production, specify your domains instead of '*'
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://shiplet.my', 'https://www.shiplet.my', 'https://shiplet.netlify.app', 'https://fastidious-youtiao-5b1c11.netlify.app'] 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'API-Key']
}));

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB connection with better error handling
const connectDB = async () => {
  try {
    // For Render deployment, ensure you have MONGODB_URI set in environment variables
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Define schemas
const businessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  website: String,
  orderVolume: String,
  notes: String,
  timestamp: { type: Date, default: Date.now },
  userType: { type: String, default: 'business' }
});

const providerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  spaceSize: { type: Number, required: true },
  spaceType: { type: String, required: true },
  availability: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  userType: { type: String, default: 'provider' }
});

// Create models
const Business = mongoose.model('Business', businessSchema);
const Provider = mongoose.model('Provider', providerSchema);

// API key middleware for basic security
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['api-key'];
  
  if (!process.env.API_KEY) {
    console.error('API_KEY environment variable is not set');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error'
    });
  }
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    console.log('Invalid API key received:', apiKey);
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized: Invalid API key' 
    });
  }
  
  next();
};

// Routes
app.post('/api/signup', apiKeyAuth, async (req, res) => {
  try {
    const { userType, ...data } = req.body;
    console.log('Received signup data:', JSON.stringify(req.body));
    let result;
    
    if (userType === 'business') {
      console.log('Creating business document');
      const business = new Business(data);
      console.log('Business model created');
      try {
        result = await business.save();
        console.log('Business saved successfully with ID:', result._id);
      } catch (saveError) {
        console.error('Error saving business:', saveError.message);
        throw saveError;
      }
    } else if (userType === 'provider') {
      console.log('Creating provider document');
      const provider = new Provider(data);
      console.log('Provider model created');
      try {
        result = await provider.save();
        console.log('Provider saved successfully with ID:', result._id);
      } catch (saveError) {
        console.error('Error saving provider:', saveError.message);
        throw saveError;
      }
    } else {
      console.error('Invalid user type:', userType);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user type specified' 
      });
    }
    
    res.status(201).json({
      success: true,
      message: `${userType} signup successful`,
      id: result._id
    });
  } catch (error) {
    console.error('Error in signup route:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error processing signup',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Route to get all businesses
app.get('/api/businesses', apiKeyAuth, async (req, res) => {
  try {
    const businesses = await Business.find().sort({ timestamp: -1 });
    console.log(`Retrieved ${businesses.length} businesses`);
    res.status(200).json({
      success: true,
      count: businesses.length,
      data: businesses
    });
  } catch (error) {
    console.error('Error fetching businesses:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching businesses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Route to get all providers
app.get('/api/providers', apiKeyAuth, async (req, res) => {
  try {
    const providers = await Provider.find().sort({ timestamp: -1 });
    console.log(`Retrieved ${providers.length} providers`);
    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching providers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Simple test route - public route for checking if server is up
app.get('/', (req, res) => {
  res.send('Shiplet API is running');
});

// Placeholder image API
app.get('/api/placeholder/:width/:height', (req, res) => {
  const width = req.params.width;
  const height = req.params.height;
  
  // Create an SVG placeholder with the requested dimensions
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e0e0e0"/>
      <text x="50%" y="50%" font-family="Arial" font-size="16" text-anchor="middle" dominant-baseline="middle" fill="#666">
        ${width}x${height}
      </text>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server with improved error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Shiplet backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API key required for protected endpoints: ${process.env.API_KEY ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'NOT CONFIGURED'}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
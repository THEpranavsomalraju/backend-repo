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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

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
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
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
    console.log('Received signup data:', req.body);
    let result;
    
    if (userType === 'business') {
      console.log('Creating business document');
      const business = new Business(data);
      console.log('Business model created:', business);
      try {
        result = await business.save();
        console.log('Business saved successfully:', result);
      } catch (saveError) {
        console.error('Error saving business:', saveError);
        throw saveError;
      }
    } else if (userType === 'provider') {
      console.log('Creating provider document');
      const provider = new Provider(data);
      console.log('Provider model created:', provider);
      try {
        result = await provider.save();
        console.log('Provider saved successfully:', result);
      } catch (saveError) {
        console.error('Error saving provider:', saveError);
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
    console.error('Error in signup route:', error);
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
    res.status(200).json({
      success: true,
      count: businesses.length,
      data: businesses
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
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
    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching providers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shiplet backend server running on port ${PORT}`);
    console.log(`Access it from other devices at http://10.50.55.158:${PORT}`);
  });

module.exports = app;
const mongoose = require('mongoose');

const ConversionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileId: {
    type: String,
    unique: true
  },
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadPath: {
    type: String,
    required: true
  },
  outputPath: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  result: {
    depthMap: String,
    pointCloud: String,
    mesh: String,
    webData: String,
    thumbnail: String
  },
  // NEW: Store the actual 3D model JSON data directly in MongoDB
  modelData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // NEW: Store thumbnail as base64 string
  thumbnailBase64: {
    type: String,
    default: null
  },
  stats: {
    points: Number,
    triangles: Number,
    vertices: Number
  },
  processingTime: {
    type: Number,
    default: 0
  },
  startedAt: Date,
  completedAt: Date,
  error: String,
  isPublic: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Conversion', ConversionSchema);
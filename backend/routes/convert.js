const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const Conversion = require('../models/Conversion');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Background conversion function
async function runConversionInBackground(conversion) {
  const startTime = Date.now();
  
  try {
    console.log(`[Conversion ${conversion._id}] Starting conversion...`);
    
    const pythonCmd = process.env.PYTHON_PATH || 'python';
    const pythonScript = path.join(__dirname, '../python/depth_estimator.py');
    const useHighQuality = true;  // ← CHANGED: Use HIGH quality for better results
    
    console.log(`[Conversion ${conversion._id}] Using Python: ${pythonCmd}`);
    console.log(`[Conversion ${conversion._id}] Script: ${pythonScript}`);
    console.log(`[Conversion ${conversion._id}] Quality mode: ${useHighQuality ? 'high' : 'medium'}`);
    console.log(`[Conversion ${conversion._id}] Input: ${conversion.uploadPath}`);
    console.log(`[Conversion ${conversion._id}] Output: ${conversion.outputPath}`);
    
    const args = [pythonScript, conversion.uploadPath, conversion.outputPath];
    if (useHighQuality) {
      args.push('--high');
    } else {
      args.push('--medium');
    }
    
    const pythonProcess = spawn(pythonCmd, args, {
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        OMP_NUM_THREADS: '4',
        TF_ENABLE_ONEDNN_OPTS: '0'
      }
    });
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      const str = data.toString();
      outputData += str;
      console.log(`[Python stdout]: ${str.trim()}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const str = data.toString();
      errorData += str;
      console.log(`[Python stderr]: ${str.trim()}`);
    });
    
    pythonProcess.on('error', async (err) => {
      console.error(`[Conversion ${conversion._id}] Python process error:`, err);
      conversion.status = 'failed';
      conversion.error = `Python error: ${err.message}`;
      conversion.processingTime = (Date.now() - startTime) / 1000;
      await conversion.save();
    });
    
    pythonProcess.on('close', async (code) => {
      const processingTime = (Date.now() - startTime) / 1000;
      console.log(`[Conversion ${conversion._id}] Python process exited with code ${code} in ${processingTime}s`);
      
      if (code !== 0) {
        conversion.status = 'failed';
        conversion.error = errorData || 'Conversion failed with unknown error';
        conversion.processingTime = processingTime;
        await conversion.save();
        return;
      }
      
      try {
        let jsonString = outputData;
        const jsonStart = outputData.lastIndexOf('{"success"');
        if (jsonStart !== -1) {
          jsonString = outputData.substring(jsonStart).trim();
        }
        
        const result = JSON.parse(jsonString);
        
        if (!result.success) {
          conversion.status = 'failed';
          conversion.error = result.error || 'Conversion failed';
          conversion.processingTime = processingTime;
          await conversion.save();
          return;
        }
        
        const modelDataPath = path.join(conversion.outputPath, 'model_data.json');
        const depthMapPath = path.join(conversion.outputPath, 'depth_map.png');
        
        let modelData = null;
        let thumbnailBase64 = null;
        
        // FIXED: Better JSON reading for large files
        if (fs.existsSync(modelDataPath)) {
          try {
            const fileContent = await fs.readFile(modelDataPath, 'utf8');
            modelData = JSON.parse(fileContent);
            const fileSizeMB = (fileContent.length / 1024 / 1024).toFixed(2);
            console.log(`[Conversion ${conversion._id}] Model data loaded (${fileSizeMB} MB)`);
          } catch (parseErr) {
            console.error(`[Conversion ${conversion._id}] JSON parse error:`, parseErr.message);
            // Create minimal valid data structure
            modelData = {
              points: [],
              point_colors: [],
              mesh_vertices: [],
              mesh_faces: [],
              mesh_colors: [],
              metadata: { point_count: 0, triangle_count: 0, vertex_count: 0 }
            };
          }
        }
        
        if (fs.existsSync(depthMapPath)) {
          const thumbnailBuffer = await fs.readFile(depthMapPath);
          thumbnailBase64 = `data:image/png;base64,${thumbnailBuffer.toString('base64')}`;
          console.log(`[Conversion ${conversion._id}] Thumbnail converted to base64`);
        }
        
        conversion.status = 'completed';
        conversion.processingTime = result.processing_time || processingTime;
        conversion.completedAt = new Date();
        
        conversion.result = {
          depthMap: path.relative(path.join(__dirname, '..'), result.depth_map).replace(/\\/g, '/'),
          pointCloud: path.relative(path.join(__dirname, '..'), result.point_cloud).replace(/\\/g, '/'),
          mesh: path.relative(path.join(__dirname, '..'), result.mesh).replace(/\\/g, '/'),
          webData: path.relative(path.join(__dirname, '..'), result.web_ready).replace(/\\/g, '/'),
          thumbnail: path.relative(path.join(__dirname, '..'), result.depth_map).replace(/\\/g, '/')
        };
        
        conversion.modelData = modelData;
        conversion.thumbnailBase64 = thumbnailBase64;
        
        if (result.stats) {
          conversion.stats = {
            points: result.stats.points || 0,
            triangles: result.stats.triangles || 0,
            vertices: result.stats.vertices || 0
          };
        }
        
        await conversion.save();
        console.log(`[Conversion ${conversion._id}] ✅ Completed successfully with MongoDB storage!`);
        console.log(`[Conversion ${conversion._id}] Stats: ${conversion.stats?.points || 0} points, ${conversion.stats?.triangles || 0} triangles`);
        
        // Clean up temp files after 1 hour
        setTimeout(async () => {
          try {
            if (fs.existsSync(conversion.uploadPath)) {
              await fs.remove(path.dirname(conversion.uploadPath));
            }
            if (fs.existsSync(conversion.outputPath)) {
              await fs.remove(conversion.outputPath);
            }
            console.log(`[Conversion ${conversion._id}] Temp files cleaned up`);
          } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr);
          }
        }, 60 * 60 * 1000);
        
      } catch (error) {
        console.error(`[Conversion ${conversion._id}] Error processing result:`, error);
        conversion.status = 'failed';
        conversion.error = `Failed to process result: ${error.message}`;
        conversion.processingTime = processingTime;
        await conversion.save();
      }
    });
    
  } catch (err) {
    console.error(`[Conversion ${conversion._id}] Background conversion error:`, err);
    conversion.status = 'failed';
    conversion.error = err.message;
    conversion.processingTime = (Date.now() - startTime) / 1000;
    await conversion.save();
  }
}

// @route   POST /api/convert/upload
router.post('/upload', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload an image'
      });
    }

    const userId = req.user.id;
    const fileId = uuidv4();
    const outputDir = path.join(__dirname, '../outputs', userId, fileId);
    await fs.ensureDir(outputDir);

    const conversion = await Conversion.create({
      user: userId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      fileSize: req.file.size,
      uploadPath: req.file.path,
      outputPath: outputDir,
      status: 'pending',
      fileId: fileId
    });

    await User.findByIdAndUpdate(userId, {
      $push: { conversions: conversion._id },
      $inc: { totalConversions: 1 }
    });

    res.json({
      success: true,
      data: {
        id: conversion._id,
        fileId: fileId,
        filename: req.file.originalname,
        status: conversion.status,
        size: req.file.size
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({
      success: false,
      error: 'Upload failed: ' + err.message
    });
  }
});

// @route   POST /api/convert/start/:id
router.post('/start/:id', protect, async (req, res) => {
  try {
    const conversion = await Conversion.findById(req.params.id);
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found'
      });
    }

    if (conversion.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to start this conversion'
      });
    }

    if (conversion.status === 'completed') {
      return res.json({
        success: true,
        message: 'Conversion already completed',
        data: { id: conversion._id, status: 'completed' }
      });
    }

    if (conversion.status === 'processing') {
      return res.json({
        success: true,
        message: 'Conversion already in progress',
        data: { id: conversion._id, status: 'processing' }
      });
    }

    if (!fs.existsSync(conversion.uploadPath)) {
      conversion.status = 'failed';
      conversion.error = 'Uploaded file not found';
      await conversion.save();
      return res.status(404).json({
        success: false,
        error: 'Uploaded file not found'
      });
    }

    conversion.status = 'processing';
    conversion.startedAt = new Date();
    await conversion.save();

    res.json({
      success: true,
      message: 'Conversion started successfully',
      data: {
        id: conversion._id,
        status: 'processing',
        startedAt: conversion.startedAt
      }
    });

    runConversionInBackground(conversion);

  } catch (err) {
    console.error('Start conversion error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to start conversion: ' + err.message
    });
  }
});

// @route   GET /api/convert/status/:id
router.get('/status/:id', protect, async (req, res) => {
  try {
    const conversion = await Conversion.findById(req.params.id).select('-__v');
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found'
      });
    }

    if (conversion.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    res.json({
      success: true,
      data: {
        id: conversion._id,
        status: conversion.status,
        result: conversion.result,
        stats: conversion.stats,
        processingTime: conversion.processingTime,
        createdAt: conversion.createdAt,
        startedAt: conversion.startedAt,
        completedAt: conversion.completedAt,
        error: conversion.error,
        isPublic: conversion.isPublic,
        thumbnailBase64: conversion.thumbnailBase64
      }
    });
  } catch (err) {
    console.error('Status check error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get status'
    });
  }
});

// @route   GET /api/convert/model/:id
router.get('/model/:id', async (req, res) => {
  try {
    const conversion = await Conversion.findById(req.params.id);
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    let token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    let isAdmin = false;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        
        const User = require('../models/User');
        const user = await User.findById(userId);
        isAdmin = user?.role === 'admin';
      } catch (e) {
        // Invalid token - treat as public access
      }
    }
    
    const isOwner = userId && conversion.user.toString() === userId;
    
    if (!conversion.isPublic && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'This model is private. Ask the owner to make it public.'
      });
    }

    if (conversion.status !== 'completed') {
      return res.status(404).json({
        success: false,
        error: 'Model is still processing or failed'
      });
    }

    let modelData = conversion.modelData;
    
    if (!modelData && conversion.result?.webData) {
      const modelDataPath = path.join(__dirname, '..', conversion.result.webData);
      if (fs.existsSync(modelDataPath)) {
        try {
          const fileContent = await fs.readFile(modelDataPath, 'utf8');
          modelData = JSON.parse(fileContent);
        } catch (e) {
          console.error('Error reading model data file:', e);
        }
      }
    }
    
    if (!modelData) {
      return res.status(404).json({
        success: false,
        error: 'Model data not found'
      });
    }
    
    conversion.views = (conversion.views || 0) + 1;
    await conversion.save();

    res.json({
      success: true,
      data: modelData,
      meta: {
        id: conversion._id,
        name: conversion.originalName,
        views: conversion.views,
        isPublic: conversion.isPublic,
        thumbnail: conversion.thumbnailBase64
      }
    });
  } catch (err) {
    console.error('Error fetching model data:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch model data'
    });
  }
});

// @route   GET /api/convert/download/:id/:format
router.get('/download/:id/:format', protect, async (req, res) => {
  try {
    const { id, format } = req.params;
    const conversion = await Conversion.findById(id);
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found'
      });
    }

    if (conversion.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    if (conversion.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Model is not ready for download yet'
      });
    }

    let filePath;
    let fileName;
    
    if (format === 'ply') {
      filePath = path.join(__dirname, '..', conversion.result.mesh);
      fileName = `${conversion.originalName.replace(/\.[^/.]+$/, '')}_3d.ply`;
    } else if (format === 'obj') {
      filePath = path.join(__dirname, '..', conversion.result.mesh);
      fileName = `${conversion.originalName.replace(/\.[^/.]+$/, '')}_3d.obj`;
    } else if (format === 'json') {
      filePath = path.join(__dirname, '..', conversion.result.webData);
      fileName = `${conversion.originalName.replace(/\.[^/.]+$/, '')}_model.json`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Supported: ply, obj, json'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found. It may have been cleaned up.'
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    conversion.downloads = (conversion.downloads || 0) + 1;
    await conversion.save();
    
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

// @route   GET /api/convert/history
router.get('/history', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const status = req.query.status;
    const sort = req.query.sort || '-createdAt';
    const search = req.query.search;
    const skip = (page - 1) * limit;

    const query = { user: req.user.id };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.originalName = { $regex: search, $options: 'i' };
    }

    const conversions = await Conversion.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v -modelData');

    const total = await Conversion.countDocuments(query);

    res.json({
      success: true,
      data: conversions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get history'
    });
  }
});

// @route   DELETE /api/convert/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const conversion = await Conversion.findById(req.params.id);
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found'
      });
    }

    if (conversion.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    try {
      if (conversion.uploadPath && fs.existsSync(path.dirname(conversion.uploadPath))) {
        await fs.remove(path.dirname(conversion.uploadPath));
      }
      if (conversion.outputPath && fs.existsSync(conversion.outputPath)) {
        await fs.remove(conversion.outputPath);
      }
    } catch (fileErr) {
      console.error('Error deleting files:', fileErr);
    }

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { conversions: conversion._id }
    });

    await conversion.deleteOne();

    res.json({
      success: true,
      message: 'Conversion deleted successfully',
      data: {}
    });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversion'
    });
  }
});

// @route   PUT /api/convert/:id/visibility
router.put('/:id/visibility', protect, async (req, res) => {
  try {
    const conversion = await Conversion.findById(req.params.id);
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found'
      });
    }

    if (conversion.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    conversion.isPublic = !conversion.isPublic;
    await conversion.save();

    res.json({
      success: true,
      data: {
        id: conversion._id,
        isPublic: conversion.isPublic
      }
    });
  } catch (err) {
    console.error('Toggle visibility error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update visibility'
    });
  }
});

// @route   GET /api/convert/:id/share
router.get('/:id/share', protect, async (req, res) => {
  try {
    const conversion = await Conversion.findById(req.params.id);
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found'
      });
    }

    if (conversion.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/view/${conversion._id}`;

    res.json({
      success: true,
      data: {
        shareUrl,
        isPublic: conversion.isPublic
      }
    });
  } catch (err) {
    console.error('Share link error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate share link'
    });
  }
});

module.exports = router;
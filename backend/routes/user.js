const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Conversion = require('../models/Conversion');
const { protect, authorize } = require('../middleware/auth');
const fs = require('fs-extra');
const path = require('path');

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-__v')
      .populate({
        path: 'conversions',
        options: { 
          sort: { createdAt: -1 },
          limit: 5 
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get conversion statistics
    const stats = await Conversion.aggregate([
      { $match: { user: user._id } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);

    const conversionStats = {
      total: user.totalConversions,
      completed: stats.find(s => s._id === 'completed')?.count || 0,
      processing: stats.find(s => s._id === 'processing')?.count || 0,
      failed: stats.find(s => s._id === 'failed')?.count || 0
    };

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        stats: conversionStats
      }
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  protect,
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please include a valid email')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    const { name, email } = req.body;
    const updateFields = {};
    
    if (name) updateFields.name = name;
    if (email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use'
        });
      }
      updateFields.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-__v');

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   PUT /api/user/password
// @desc    Update password
// @access  Private
router.put('/password', [
  protect,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   PUT /api/user/avatar
// @desc    Update user avatar
// @access  Private
router.put('/avatar', protect, async (req, res) => {
  try {
    const { avatar } = req.body;
    
    if (!avatar) {
      return res.status(400).json({
        success: false,
        error: 'Avatar data is required'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar },
      { new: true }
    );

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Avatar update error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   GET /api/user/conversions
// @desc    Get user's conversion history with pagination
// @access  Private
router.get('/conversions', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const status = req.query.status;
    const sort = req.query.sort || '-createdAt';
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.user.id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const conversions = await Conversion.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v');

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
    console.error('Conversions fetch error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   GET /api/user/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    // Get overall stats
    const overallStats = await Conversion.aggregate([
      { $match: { user: req.user._id } },
      { $group: {
        _id: null,
        totalConversions: { $sum: 1 },
        totalProcessingTime: { $sum: '$processingTime' },
        avgProcessingTime: { $avg: '$processingTime' },
        totalFileSize: { $sum: '$fileSize' }
      }}
    ]);

    // Get monthly stats for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await Conversion.aggregate([
      { 
        $match: { 
          user: req.user._id,
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get status distribution
    const statusDistribution = await Conversion.aggregate([
      { $match: { user: req.user._id } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);

    res.json({
      success: true,
      data: {
        overall: overallStats[0] || {
          totalConversions: 0,
          totalProcessingTime: 0,
          avgProcessingTime: 0,
          totalFileSize: 0
        },
        monthly: monthlyStats,
        statusDistribution: statusDistribution.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      }
    });
  } catch (err) {
    console.error('Stats fetch error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   DELETE /api/user/account
// @desc    Delete user account and all data
// @access  Private
router.delete('/account', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify password before deletion
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to delete account'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Password is incorrect'
      });
    }

    // Delete all user's conversions and files
    const conversions = await Conversion.find({ user: user._id });
    
    for (const conversion of conversions) {
      // Delete uploaded files
      if (conversion.uploadPath) {
        const uploadDir = path.dirname(conversion.uploadPath);
        await fs.remove(uploadDir).catch(() => {});
      }
      
      // Delete output files
      if (conversion.outputPath) {
        await fs.remove(conversion.outputPath).catch(() => {});
      }
    }

    // Delete all conversions from database
    await Conversion.deleteMany({ user: user._id });

    // Delete user
    await user.deleteOne();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   GET /api/user/dashboard
// @desc    Get dashboard data
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Get recent conversions
    const recentConversions = await Conversion.find({ user: req.user.id })
      .sort('-createdAt')
      .limit(5)
      .select('originalName status result createdAt processingTime');

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await Conversion.aggregate([
      { 
        $match: { 
          user: req.user._id,
          createdAt: { $gte: today }
        } 
      },
      { 
        $group: {
          _id: null,
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get storage usage
    const storageStats = await Conversion.aggregate([
      { $match: { user: req.user._id } },
      { $group: {
        _id: null,
        totalSize: { $sum: '$fileSize' }
      }}
    ]);

    res.json({
      success: true,
      data: {
        recentConversions,
        todayStats: todayStats[0] || { count: 0, completed: 0 },
        storageUsed: storageStats[0]?.totalSize || 0,
        totalConversions: req.user.totalConversions
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   PUT /api/user/conversion/:id/visibility
// @desc    Toggle conversion public/private
// @access  Private
router.put('/conversion/:id/visibility', protect, async (req, res) => {
  try {
    const conversion = await Conversion.findById(req.params.id);
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found'
      });
    }

    // Check ownership
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
      error: 'Server error'
    });
  }
});

// @route   GET /api/user/conversion/:id/share
// @desc    Get shareable link for conversion
// @access  Private
router.get('/conversion/:id/share', protect, async (req, res) => {
  try {
    const conversion = await Conversion.findById(req.params.id);
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found'
      });
    }

    // Check ownership
    if (conversion.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Generate share link
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/view/${conversion._id}`;

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
      error: 'Server error'
    });
  }
});

module.exports = router;
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  FiImage,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiTrendingUp,
  FiCalendar,
  FiDownload,
  FiEye,
  FiTrash2,
  FiPlus,
  FiBarChart2,
  FiPieChart,
  FiActivity,
  FiHardDrive,
  FiGrid,
  FiList,
  FiShare2,
  FiCopy,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiX,
  FiUser,
  FiSettings,
  FiArrowUp,
  FiArrowDown,
  FiRefreshCw,
  FiMoreVertical
} from 'react-icons/fi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { format, formatDistance } from 'date-fns';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedConversion, setSelectedConversion] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversionToDelete, setConversionToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 1
  });

  const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiGrid },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart2 },
    { id: 'history', label: 'History', icon: FiList },
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ];

  useEffect(() => {
    fetchDashboardData();
    fetchConversions();
  }, [pagination.page, filterStatus, sortBy]);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, statsRes] = await Promise.all([
        api.get('/api/user/dashboard'),
        api.get('/api/user/stats')
      ]);
      
      setStats({
        ...dashboardRes.data.data,
        monthly: statsRes.data.data.monthly,
        statusDistribution: statsRes.data.data.statusDistribution,
        overall: statsRes.data.data.overall
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const fetchConversions = async () => {
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      if (sortBy) {
        params.sort = sortBy === 'newest' ? '-createdAt' : 'createdAt';
      }
      
      const response = await api.get('/api/user/conversions', { params });
      
      setConversions(response.data.data);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error) {
      console.error('Error fetching conversions:', error);
      toast.error('Failed to load conversions');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchConversions()]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/convert/${id}`);
      toast.success('Conversion deleted successfully');
      setShowDeleteModal(false);
      setConversionToDelete(null);
      fetchConversions();
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting conversion:', error);
      toast.error('Failed to delete conversion');
    }
  };

  const confirmDelete = (id) => {
    setConversionToDelete(id);
    setShowDeleteModal(true);
  };

  const handleShare = async (id) => {
    try {
      const response = await api.get(`/api/user/conversion/${id}/share`);
      await navigator.clipboard.writeText(response.data.data.shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to generate share link');
    }
  };

  const handleDownload = async (id, format) => {
    try {
      const response = await api.get(`/api/convert/download/${id}/${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `model.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Model downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Download failed. Please try again.');
    }
  };

  const handleView = (id) => {
    window.open(`/view/${id}`, '_blank');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="text-green-500" />;
      case 'processing':
        return <FiClock className="text-yellow-500 animate-spin" />;
      case 'failed':
        return <FiAlertCircle className="text-red-500" />;
      default:
        return <FiClock className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return badges[status] || badges.pending;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredConversions = conversions.filter(conv => 
    conv.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearFilters = () => {
    setFilterStatus('all');
    setSearchTerm('');
    setSortBy('newest');
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
      {trend !== undefined && (
        <div className="flex items-center mt-2 text-xs">
          {trend > 0 ? (
            <FiArrowUp className="text-green-500 mr-1" />
          ) : trend < 0 ? (
            <FiArrowDown className="text-red-500 mr-1" />
          ) : null}
          <span className={trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}>
            {trend !== 0 ? `${Math.abs(trend)}% from last week` : 'No change'}
          </span>
        </div>
      )}
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, <span className="font-medium">{user?.name}</span>!
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <FiRefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                to="/converter"
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <FiPlus className="w-5 h-5" />
                <span>New Conversion</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Welcome Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Ready to create? 👋</h2>
                  <p className="text-blue-100">Transform your 2D images into stunning 3D models in seconds.</p>
                </div>
                <Link
                  to="/converter"
                  className="flex items-center space-x-2 px-5 py-2.5 bg-white text-blue-600 rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  <FiPlus className="w-5 h-5" />
                  <span>Start Converting</span>
                </Link>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                title="Total Conversions"
                value={stats?.totalConversions || 0}
                icon={FiImage}
                color="blue"
                trend={12}
                subtitle="All time"
              />
              <StatCard
                title="Completed"
                value={stats?.statusDistribution?.completed || 0}
                icon={FiCheckCircle}
                color="green"
                trend={8}
                subtitle={`${stats?.totalConversions ? Math.round((stats.statusDistribution?.completed / stats.totalConversions) * 100) : 0}% success rate`}
              />
              <StatCard
                title="Today's Activity"
                value={stats?.todayStats?.count || 0}
                icon={FiActivity}
                color="yellow"
                trend={5}
                subtitle={`${stats?.todayStats?.completed || 0} completed today`}
              />
              <StatCard
                title="Storage Used"
                value={formatFileSize(stats?.storageUsed || 0)}
                icon={FiHardDrive}
                color="purple"
                subtitle="Unlimited storage"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Monthly Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Activity</h3>
                  <FiBarChart2 className="w-5 h-5 text-gray-400" />
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats?.monthly || []}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="_id" 
                      tickFormatter={(value) => `${value?.month}/${value?.year}`}
                      stroke="#9ca3af"
                      fontSize={11}
                    />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      fill="url(#colorCount)" 
                      name="Total"
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#10b981" 
                      fill="url(#colorCompleted)" 
                      name="Completed"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Status Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Status Distribution</h3>
                  <FiPieChart className="w-5 h-5 text-gray-400" />
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={Object.entries(stats?.statusDistribution || {}).map(([name, value]) => ({
                        name: name.charAt(0).toUpperCase() + name.slice(1),
                        value
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(stats?.statusDistribution || {}).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Recent Conversions Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Conversions</h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All →
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {conversions.slice(0, 5).map((conversion) => (
                  <div key={conversion._id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {conversion.result?.thumbnail ? (
                            <img 
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${conversion.result.thumbnail}`} 
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FiImage className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">
                            {conversion.originalName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistance(new Date(conversion.createdAt), new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadge(conversion.status)}`}>
                          {conversion.status}
                        </span>
                        {conversion.status === 'completed' && (
                          <button
                            onClick={() => handleView(conversion._id)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Processing Statistics */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <p className="text-sm text-blue-600 mb-1 font-medium">Average Processing Time</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {stats?.overall?.avgProcessingTime?.toFixed(1) || 0}s
                  </p>
                </div>
                <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <p className="text-sm text-green-600 mb-1 font-medium">Total Processing Time</p>
                  <p className="text-3xl font-bold text-green-900">
                    {Math.round((stats?.overall?.totalProcessingTime || 0) / 60)} min
                  </p>
                </div>
                <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <p className="text-sm text-purple-600 mb-1 font-medium">Total Data Processed</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {formatFileSize(stats?.overall?.totalFileSize || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Hourly Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversions by Hour</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.hourly || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Grid View"
                  >
                    <FiGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="List View"
                  >
                    <FiList className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FiFilter className="w-4 h-4" />
                  <span className="text-sm">Filter</span>
                  {(filterStatus !== 'all' || searchTerm) && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                  {showFilters ? (
                    <FiChevronUp className="w-4 h-4" />
                  ) : (
                    <FiChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Status</option>
                          <option value="completed">Completed</option>
                          <option value="processing">Processing</option>
                          <option value="failed">Failed</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sort By</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Count */}
            <div className="text-sm text-gray-500">
              Showing {filteredConversions.length} of {pagination.total} conversions
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <>
                {filteredConversions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredConversions.map((conversion, index) => (
                      <motion.div
                        key={conversion._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group"
                      >
                        <div className="relative h-40 bg-gray-100">
                          {conversion.result?.thumbnail ? (
                            <img 
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${conversion.result.thumbnail}`} 
                              alt={conversion.originalName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                              <FiImage className="w-12 h-12 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(conversion.status)}`}>
                              {conversion.status}
                            </span>
                          </div>
                          {conversion.status === 'completed' && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <button
                                onClick={() => handleView(conversion._id)}
                                className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
                              >
                                View 3D Model
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <p className="font-medium text-gray-900 truncate mb-1" title={conversion.originalName}>
                            {conversion.originalName}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 mb-3">
                            <FiCalendar className="w-3 h-3 mr-1" />
                            <span>{formatDistance(new Date(conversion.createdAt), new Date(), { addSuffix: true })}</span>
                            <span className="mx-2">•</span>
                            <span>{formatFileSize(conversion.fileSize)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(conversion.status)}
                            </div>
                            <div className="flex items-center space-x-1">
                              {conversion.status === 'completed' && (
                                <>
                                  <button
                                    onClick={() => handleView(conversion._id)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View"
                                  >
                                    <FiEye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDownload(conversion._id, 'ply')}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Download"
                                  >
                                    <FiDownload className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleShare(conversion._id)}
                                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Share"
                                  >
                                    <FiShare2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => confirmDelete(conversion._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                    <FiImage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No conversions found</p>
                    <p className="text-gray-400 mb-6">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'Start by converting your first 2D image to 3D!'
                      }
                    </p>
                    {(searchTerm || filterStatus !== 'all') ? (
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                      >
                        Clear Filters
                      </button>
                    ) : (
                      <Link
                        to="/converter"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        <FiPlus className="mr-2" />
                        Start Your First Conversion
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <>
                {filteredConversions.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Ago</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredConversions.map((conversion) => (
                            <tr key={conversion._id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                    {conversion.result?.thumbnail ? (
                                      <img 
                                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${conversion.result.thumbnail}`} 
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <FiImage className="w-5 h-5 text-gray-400" />
                                    )}
                                  </div>
                                  <span className="ml-3 text-sm text-gray-900 truncate max-w-[200px]">
                                    {conversion.originalName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(conversion.status)}
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadge(conversion.status)}`}>
                                    {conversion.status}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {format(new Date(conversion.createdAt), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {formatDistance(new Date(conversion.createdAt), new Date(), { addSuffix: true })}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {formatFileSize(conversion.fileSize)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end space-x-1">
                                  {conversion.status === 'completed' && (
                                    <>
                                      <button
                                        onClick={() => handleView(conversion._id)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="View"
                                      >
                                        <FiEye className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDownload(conversion._id, 'ply')}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Download"
                                      >
                                        <FiDownload className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleShare(conversion._id)}
                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                        title="Share"
                                      >
                                        <FiShare2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => confirmDelete(conversion._id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                    <FiImage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No conversions found</p>
                    <p className="text-gray-400 mb-6">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'Start by converting your first 2D image to 3D!'
                      }
                    </p>
                    {(searchTerm || filterStatus !== 'all') ? (
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                      >
                        Clear Filters
                      </button>
                    ) : (
                      <Link
                        to="/converter"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        <FiPlus className="mr-2" />
                        Start Your First Conversion
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && filteredConversions.length > 0 && (
              <div className="flex justify-center pt-4">
                <nav className="flex items-center space-x-1">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Previous
                  </button>
                  
                  {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        className={`w-9 h-9 rounded-lg transition-colors text-sm ${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {pagination.pages > 5 && pagination.page < pagination.pages - 2 && (
                    <>
                      <span className="px-2 text-gray-400">...</span>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: pagination.pages }))}
                        className="w-9 h-9 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                      >
                        {pagination.pages}
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </motion.div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm p-8 border border-gray-100"
          >
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-3xl font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-gray-600">{user?.email}</p>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Member Since</p>
                  <p className="font-medium text-gray-900">
                    {user?.createdAt ? format(new Date(user.createdAt), 'MMMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Account Type</p>
                  <p className="font-medium text-gray-900 capitalize">{user?.role || 'User'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Conversions</p>
                  <p className="font-medium text-gray-900">{user?.totalConversions || 0}</p>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <p className="text-gray-400 text-sm">Profile editing coming soon...</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm p-8 border border-gray-100"
          >
            <div className="max-w-2xl mx-auto text-center">
              <FiSettings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Settings</h3>
              <p className="text-gray-500">Settings panel coming soon...</p>
            </div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiAlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Conversion</h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to delete this conversion? This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(conversionToDelete)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DashboardPage;
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import {
  FiImage,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiCalendar,
  FiEye,
  FiTrash2,
  FiShare2,
  FiDownload,
  FiGrid,
  FiList,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiX
} from 'react-icons/fi';
import { format, formatDistance } from 'date-fns';
import toast from 'react-hot-toast';

const ConversionHistory = () => {
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConversion, setSelectedConversion] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    fetchConversions();
  }, [pagination.page, filterStatus, sortBy]);

  const fetchConversions = async () => {
    setLoading(true);
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
      toast.error('Failed to load conversion history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this conversion? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/api/convert/${id}`);
      toast.success('Conversion deleted successfully');
      fetchConversions();
    } catch (error) {
      console.error('Error deleting conversion:', error);
      toast.error('Failed to delete conversion');
    }
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

  const ConversionCard = ({ conversion, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gray-100">
        {conversion.result?.thumbnail ? (
          <img 
            src={`${import.meta.env.VITE_API_URL}/${conversion.result.thumbnail}`} 
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
      
      {/* Info */}
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
        
        {/* Actions */}
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
              onClick={() => handleDelete(conversion._id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const ConversionRow = ({ conversion }) => (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {conversion.result?.thumbnail ? (
              <img 
                src={`${import.meta.env.VITE_API_URL}/${conversion.result.thumbnail}`} 
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
                title="Download PLY"
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
            onClick={() => handleDelete(conversion._id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
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

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading conversions...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredConversions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <FiImage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No conversions found</p>
          <p className="text-gray-400 mb-6">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your filters'
              : 'Start by converting your first 2D image to 3D!'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
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

      {/* Grid View */}
      {!loading && viewMode === 'grid' && filteredConversions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredConversions.map((conversion, index) => (
            <ConversionCard key={conversion._id} conversion={conversion} index={index} />
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && filteredConversions.length > 0 && (
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
                  <ConversionRow key={conversion._id} conversion={conversion} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
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
    </div>
  );
};

export default ConversionHistory;
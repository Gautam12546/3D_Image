import React, { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  Center,
  Stats
} from '@react-three/drei';
import { motion } from 'framer-motion';
import {
  FiDownload,
  FiRotateCw,
  FiMaximize,
  FiMinimize,
  FiGrid as FiGridIcon,
  FiCamera,
  FiShare2,
  FiX,
  FiAlertCircle
} from 'react-icons/fi';
import * as THREE from 'three';
import toast from 'react-hot-toast';
import api from '../../utils/api';

// Point Cloud Component
function PointCloudMesh({ data, viewMode }) {
  const meshRef = useRef();
  const pointsRef = useRef();

  const geometry = useMemo(() => {
    if (viewMode === 'mesh' && data?.mesh_vertices && data?.mesh_faces) {
      try {
        const geom = new THREE.BufferGeometry();
        
        // Flatten vertices
        const vertices = data.mesh_vertices.flat();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        
        // Flatten faces (indices)
        const indices = data.mesh_faces.flat();
        geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
        
        // Add colors if available
        if (data.mesh_colors) {
          const colors = data.mesh_colors.flat();
          geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
        }
        
        geom.computeVertexNormals();
        return geom;
      } catch (err) {
        console.error('Error creating mesh geometry:', err);
        return null;
      }
    }
    return null;
  }, [data, viewMode]);

  const pointsGeometry = useMemo(() => {
    if (viewMode === 'points' && data?.points && data?.point_colors) {
      try {
        const geom = new THREE.BufferGeometry();
        const positions = data.points.flat();
        const colors = data.point_colors.flat();
        
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
        
        return geom;
      } catch (err) {
        console.error('Error creating points geometry:', err);
        return null;
      }
    }
    return null;
  }, [data, viewMode]);

  if (viewMode === 'mesh' && geometry) {
    return (
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial 
          vertexColors={!!data.mesh_colors}
          side={THREE.DoubleSide}
          roughness={0.5}
          metalness={0.1}
          wireframe={false}
          flatShading={false}
          color={data.mesh_colors ? undefined : '#7c3aed'}
        />
      </mesh>
    );
  }

  if (viewMode === 'points' && pointsGeometry) {
    return (
      <points ref={pointsRef} geometry={pointsGeometry}>
        <pointsMaterial
          size={0.008}
          vertexColors
          sizeAttenuation
          transparent
        />
      </points>
    );
  }

  return null;
}

function Scene({ modelData, viewMode, showGrid, autoRotate }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      <pointLight position={[0, 5, 5]} intensity={0.8} />
      <pointLight position={[0, -5, 5]} intensity={0.3} />
      
      <Center>
        <Suspense fallback={null}>
          <PointCloudMesh data={modelData} viewMode={viewMode} />
        </Suspense>
      </Center>
      
      {showGrid && <Grid infiniteGrid cellSize={0.5} sectionSize={2} fadeDistance={50} />}
      <Environment preset="city" />
      
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={autoRotate}
        autoRotateSpeed={1.5}
        makeDefault
      />
      
      <Stats className="stats-panel" />
    </>
  );
}

const ThreeDViewer = ({ modelData, conversionId, onReset }) => {
  const [viewMode, setViewMode] = useState('mesh');
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [hasValidData, setHasValidData] = useState(false);
  const containerRef = useRef(null);

  // Debug and validate model data
  useEffect(() => {
    console.log('ThreeDViewer - modelData received:', modelData);
    
    if (modelData) {
      const hasMesh = modelData.mesh_vertices && modelData.mesh_vertices.length > 0;
      const hasPoints = modelData.points && modelData.points.length > 0;
      
      console.log('Has mesh vertices:', hasMesh);
      console.log('Has points:', hasPoints);
      console.log('Mesh vertices count:', modelData.mesh_vertices?.length);
      console.log('Points count:', modelData.points?.length);
      console.log('Metadata:', modelData.metadata);
      
      setHasValidData(hasMesh || hasPoints);
      
      if (!hasMesh && !hasPoints) {
        console.warn('No valid 3D data found in modelData');
      }
    }
  }, [modelData]);

  const handleDownload = async (format) => {
    setDownloading(true);
    try {
      const response = await api.get(`/api/convert/download/${conversionId}/${format}`, {
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
      console.error('Download error:', err);
      toast.error('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      const response = await api.get(`/api/convert/${conversionId}/share`);
      setShareUrl(response.data.data.shareUrl);
      setShowShareModal(true);
    } catch (err) {
      console.error('Share error:', err);
      toast.error('Failed to generate share link');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard?.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const resetCamera = () => {
    window.dispatchEvent(new Event('resize'));
  };

  // Show error state if no valid data
  if (!hasValidData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center">
          <FiAlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">3D Model Data Not Available</h3>
          <p className="text-gray-600 mb-6">
            The conversion completed but the 3D data could not be loaded.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700 mb-2"><strong>Debug Info:</strong></p>
            <p className="text-xs text-gray-500">Points: {modelData?.points?.length || 0}</p>
            <p className="text-xs text-gray-500">Mesh vertices: {modelData?.mesh_vertices?.length || 0}</p>
            <p className="text-xs text-gray-500">Mesh faces: {modelData?.mesh_faces?.length || 0}</p>
          </div>
          <button
            onClick={onReset}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            Try Another Image
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">3D Model Viewer</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('mesh')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'mesh'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mesh
            </button>
            <button
              onClick={() => setViewMode('points')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'points'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Point Cloud
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2 rounded-lg transition-colors ${
              autoRotate ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Auto Rotate"
          >
            <FiRotateCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${
              showGrid ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Toggle Grid"
          >
            <FiGridIcon className="w-5 h-5" />
          </button>
          <button
            onClick={resetCamera}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Reset Camera"
          >
            <FiCamera className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Fullscreen"
          >
            {isFullscreen ? (
              <FiMinimize className="w-5 h-5" />
            ) : (
              <FiMaximize className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleShare}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Share"
          >
            <FiShare2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative h-[500px] md:h-[600px] bg-gray-900">
        <Canvas
          camera={{ position: [0, 0, 3], fov: 50 }}
          style={{ background: '#1a1a1a' }}
          shadows
        >
          <Scene 
            modelData={modelData} 
            viewMode={viewMode} 
            showGrid={showGrid}
            autoRotate={autoRotate}
          />
        </Canvas>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>📊 Points: {modelData?.metadata?.point_count?.toLocaleString() || modelData?.points?.length?.toLocaleString() || 'N/A'}</span>
            <span>🔺 Triangles: {modelData?.metadata?.triangle_count?.toLocaleString() || modelData?.mesh_faces?.length?.toLocaleString() || 'N/A'}</span>
            <span>🔷 Vertices: {modelData?.metadata?.vertex_count?.toLocaleString() || modelData?.mesh_vertices?.length?.toLocaleString() || 'N/A'}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleDownload('ply')}
              disabled={downloading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FiDownload className="w-4 h-4" />
              <span>Download PLY</span>
            </button>
            <button
              onClick={() => handleDownload('obj')}
              disabled={downloading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <FiDownload className="w-4 h-4" />
              <span>Download OBJ</span>
            </button>
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              New Conversion
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Share Model</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Share this link with others to let them view your 3D model:
            </p>
            
            <div className="flex mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
              />
              <button
                onClick={copyShareLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors"
              >
                Copy
              </button>
            </div>
            
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default ThreeDViewer;
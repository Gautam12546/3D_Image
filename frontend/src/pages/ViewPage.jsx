import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Center } from '@react-three/drei';
import { FiRotateCw, FiGrid as FiGridIcon } from 'react-icons/fi';
import * as THREE from 'three';
import api from '../utils/api';

function ModelViewer({ modelData }) {
  const [viewMode, setViewMode] = useState('mesh');
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  const geometry = useMemo(() => {
    if (!modelData) return null;
    
    if (viewMode === 'mesh' && modelData.mesh_vertices && modelData.mesh_faces) {
      const geom = new THREE.BufferGeometry();
      const vertices = new Float32Array(modelData.mesh_vertices.flat());
      const indices = new Uint32Array(modelData.mesh_faces.flat());
      
      geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geom.setIndex(new THREE.BufferAttribute(indices, 1));
      
      if (modelData.mesh_colors) {
        const colors = new Float32Array(modelData.mesh_colors.flat());
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      
      geom.computeVertexNormals();
      return geom;
    }
    
    if (viewMode === 'points' && modelData.points) {
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(modelData.points.flat());
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      if (modelData.point_colors) {
        const colors = new Float32Array(modelData.point_colors.flat());
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      
      return geom;
    }
    
    return null;
  }, [modelData, viewMode]);

  if (!geometry) return null;

  return (
    <>
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setViewMode('mesh')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            viewMode === 'mesh' ? 'bg-blue-600 text-white' : 'bg-white/80 text-gray-700'
          }`}
        >
          Mesh
        </button>
        <button
          onClick={() => setViewMode('points')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            viewMode === 'points' ? 'bg-blue-600 text-white' : 'bg-white/80 text-gray-700'
          }`}
        >
          Points
        </button>
      </div>
      
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2 rounded-lg transition-colors ${
            autoRotate ? 'bg-blue-600 text-white' : 'bg-white/80 text-gray-700'
          }`}
          title="Auto Rotate"
        >
          <FiRotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-lg transition-colors ${
            showGrid ? 'bg-blue-600 text-white' : 'bg-white/80 text-gray-700'
          }`}
          title="Toggle Grid"
        >
          <FiGridIcon className="w-4 h-4" />
        </button>
      </div>
      
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }} style={{ background: '#1a1a1a' }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        
        <Center>
          {viewMode === 'mesh' ? (
            <mesh geometry={geometry}>
              <meshStandardMaterial 
                vertexColors={!!modelData.mesh_colors} 
                roughness={0.5} 
                metalness={0.1}
                color={modelData.mesh_colors ? undefined : '#7c3aed'}
              />
            </mesh>
          ) : (
            <points geometry={geometry}>
              <pointsMaterial size={0.008} vertexColors sizeAttenuation />
            </points>
          )}
        </Center>
        
        {showGrid && <Grid infiniteGrid cellSize={0.5} sectionSize={2} fadeDistance={50} />}
        <Environment preset="city" />
        
        <OrbitControls 
          autoRotate={autoRotate} 
          autoRotateSpeed={1.5} 
          enablePan 
          enableZoom 
          enableRotate 
        />
      </Canvas>
    </>
  );
}

const ViewPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    fetchModel();
  }, [id]);

  const fetchModel = async () => {
    try {
      const response = await api.get(`/api/convert/model/${id}`);
      setModelData(response.data.data);
      setMeta(response.data.meta);
    } catch (err) {
      console.error('Error fetching model:', err);
      setError(err.response?.data?.error || 'Failed to load 3D model');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading 3D model...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-white mb-2">Model Not Available</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative bg-gray-900">
      <ModelViewer modelData={modelData} />
      
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="bg-black/50 backdrop-blur-md rounded-xl p-4 flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">
                {meta?.name || '3D Model'}
              </h2>
              <p className="text-gray-400 text-sm">
                👁️ {meta?.views || 0} views • 
                📊 {modelData?.metadata?.point_count || 0} points • 
                🔺 {modelData?.metadata?.triangle_count || 0} triangles
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
              >
                Try 3D Converter
              </Link>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPage;
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ImageUploader from '../components/converter/ImageUploader';
import ConversionProgress from '../components/converter/ConversionProgress';
import ThreeDViewer from '../components/converter/ThreeDViewer';
import { FiInfo } from 'react-icons/fi';

const ConverterPage = () => {
  const [currentConversion, setCurrentConversion] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleUploadComplete = (data) => {
    console.log('Upload complete, data:', data); // Debug
    setCurrentConversion(data);
  };

  const handleStartConversion = () => {
    console.log('Starting conversion with ID:', currentConversion?.id); // Debug
    setIsConverting(true);
  };

  const handleConversionComplete = (data) => {
    console.log('Conversion complete, model data:', data); // Debug
    setModelData(data);
    setIsConverting(false);
  };

  const handleReset = () => {
    setModelData(null);
    setCurrentConversion(null);
    setIsConverting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            2D to 3D Converter
          </h1>
          <p className="text-lg text-gray-600">
            Upload your image and let AI transform it into a 3D model
          </p>
        </motion.div>

        <div className="space-y-6">
          {!modelData ? (
            <>
              <ImageUploader 
                onUploadComplete={handleUploadComplete}
                onStartConversion={handleStartConversion}
              />
              
              {currentConversion && isConverting && (
                <ConversionProgress
                  conversionId={currentConversion.id}
                  onComplete={handleConversionComplete}
                />
              )}
            </>
          ) : (
            <ThreeDViewer 
              modelData={modelData}
              conversionId={currentConversion?.id}
              onReset={handleReset}
            />
          )}
        </div>

        {/* Info Banner */}
        {!modelData && !isConverting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3"
          >
            <FiInfo className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Tips for best results:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Use images with clear subjects and good contrast</li>
                <li>Front-facing or slightly angled photos work best</li>
                <li>Maximum file size: 50MB</li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ConverterPage;
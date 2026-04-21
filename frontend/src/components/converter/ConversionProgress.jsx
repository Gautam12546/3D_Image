import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiClock
} from 'react-icons/fi';
import api from '../../utils/api';

const steps = [
  { id: 'upload', label: 'Uploading Image', icon: FiLoader },
  { id: 'depth', label: 'Generating Depth Map', icon: FiLoader },
  { id: 'pointcloud', label: 'Creating Point Cloud', icon: FiLoader },
  { id: 'mesh', label: 'Building 3D Mesh', icon: FiLoader },
  { id: 'complete', label: 'Complete', icon: FiCheckCircle }
];

const ConversionProgress = ({ conversionId, onComplete }) => {
  const [status, setStatus] = useState('processing');
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const pollInterval = useRef(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (conversionId) {
      startConversion();
    }
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [conversionId]);

  const startConversion = async () => {
    try {
      console.log(`Starting conversion for ID: ${conversionId}`);
      const response = await api.post(`/api/convert/start/${conversionId}`);
      console.log('Start conversion response:', response.data);
      
      if (response.data.success) {
        pollStatus();
      } else {
        setError(response.data.error || 'Failed to start conversion');
      }
    } catch (err) {
      console.error('Start conversion error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to start conversion');
    }
  };

  const pollStatus = () => {
    pollInterval.current = setInterval(async () => {
      try {
        const response = await api.get(`/api/convert/status/${conversionId}`);
        console.log('Status response:', response.data);
        
        const { status: currentStatus, error: statusError } = response.data.data;

        setStatus(currentStatus);

        if (currentStatus === 'processing') {
          const elapsed = (Date.now() - startTime.current) / 1000;
          
          if (elapsed < 2) {
            setCurrentStep(1);
            setProgress(20);
            setEstimatedTime(5);
          } else if (elapsed < 4) {
            setCurrentStep(2);
            setProgress(50);
            setEstimatedTime(3);
          } else if (elapsed < 6) {
            setCurrentStep(3);
            setProgress(75);
            setEstimatedTime(1);
          } else {
            setCurrentStep(4);
            setProgress(90);
            setEstimatedTime(1);
          }
        } else if (currentStatus === 'completed') {
          setCurrentStep(5);
          setProgress(100);
          setEstimatedTime(0);
          
          clearInterval(pollInterval.current);
          
          // Fetch model data
          try {
            const modelResponse = await api.get(`/api/convert/model/${conversionId}`);
            console.log('Model data received');
            onComplete(modelResponse.data.data);
          } catch (modelErr) {
            console.error('Model fetch error:', modelErr);
            setError('Failed to load 3D model');
          }
        } else if (currentStatus === 'failed') {
          setError(statusError || 'Conversion failed');
          clearInterval(pollInterval.current);
        }
      } catch (err) {
        console.error('Status check error:', err);
        // Don't stop polling on network errors, only on 404
        if (err.response?.status === 404) {
          setError('Conversion not found');
          clearInterval(pollInterval.current);
        }
        // For 429 (rate limit), just continue polling
        if (err.response?.status === 429) {
          console.log('Rate limited, continuing to poll...');
        }
      }
    }, 2000);
  };

  const formatTime = (seconds) => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds} seconds`;
    return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Converting to 3D Model
      </h2>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Progress</span>
          <span className="text-gray-900 font-medium">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4 mb-6">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-center space-x-4 p-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-50' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isCompleted
                  ? 'bg-green-100 text-green-600'
                  : isActive
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {isCompleted ? (
                  <FiCheckCircle className="w-5 h-5" />
                ) : isActive ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <FiLoader className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${
                  isCompleted
                    ? 'text-green-700'
                    : isActive
                    ? 'text-blue-700'
                    : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
                {isActive && step.id !== 'complete' && (
                  <p className="text-sm text-gray-500">Processing...</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Info */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          {status === 'processing' && (
            <>
              <FiClock className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">
                Estimated time remaining: {formatTime(estimatedTime)}
              </span>
            </>
          )}
          {status === 'completed' && (
            <>
              <FiCheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700">Conversion complete!</span>
            </>
          )}
          {status === 'failed' && (
            <>
              <FiAlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">Conversion failed</span>
            </>
          )}
        </div>
        {error && (
          <div className="flex items-center space-x-2 text-red-600">
            <FiAlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Tips */}
      {status === 'processing' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Larger images may take longer to process. 
            For best results, use images with clear subjects and good lighting.
          </p>
        </div>
      )}

      {/* Retry Button for Failed */}
      {status === 'failed' && (
        <div className="mt-6">
          <button
            onClick={() => {
              setError(null);
              setCurrentStep(0);
              setProgress(0);
              startTime.current = Date.now();
              startConversion();
            }}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Conversion
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default ConversionProgress;
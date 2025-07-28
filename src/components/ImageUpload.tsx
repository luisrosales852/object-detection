'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import ObjectSelection from './ObjectSelection';
import DetectionResults from './DetectionResults';

interface ImageData {
  file: File;
  preview: string;
  dimensions: {
    width: number;
    height: number;
  };
}

interface DetectionOptions {
  objects: string[];
  includeSimilar: boolean;
  confidence: number;
  fallbackEnabled: boolean;
}

interface DetectionResult {
  detections: Array<{
    id: number;
    class_name: string;
    confidence: number;
    bbox: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
    vertices: {
      top_left: { x: number; y: number };
      top_right: { x: number; y: number };
      bottom_left: { x: number; y: number };
      bottom_right: { x: number; y: number };
    };
    center_point: { x: number; y: number };
    area: number;
    dimensions: { width: number; height: number };
    matched_request: boolean;
  }>;
  used_fallback: boolean;
  fallback_message?: string;
  image_dimensions: { width: number; height: number };
  total_objects_found: number;
  matching_objects_found: number;
  annotated_image_base64?: string;
}

const ImageUpload: React.FC = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState<DetectionResult | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  // Detection options state
  const [detectionOptions, setDetectionOptions] = useState<DetectionOptions>({
    objects: [],
    includeSimilar: true,
    confidence: 0.3,
    fallbackEnabled: true,
  });

  // Accepted file types
  const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return 'Please select a JPG, JPEG, or PNG image file.';
    }
    if (file.size > maxFileSize) {
      return 'File size must be less than 10MB.';
    }
    return null;
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const processFile = async (file: File) => {
        setIsLoading(true);
        setError(null);
        // Clear any previous detection results when new image is uploaded
        setDetectionResults(null);
        setDetectionError(null);

        try {
          const validationError = validateFile(file);
          if (validationError) {
            setError(validationError);
            return;
          }

          const preview = URL.createObjectURL(file);
          const dimensions = await getImageDimensions(file);

          setImageData({
            file,
            preview,
            dimensions,
          });
        } catch (err) {
          setError('Failed to process image. Please try again.');
          console.error('Error processing file:', err);
        } finally {
          setIsLoading(false);
        }
      };
      
      processFile(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    if (imageData?.preview) {
      URL.revokeObjectURL(imageData.preview);
    }
    setImageData(null);
    setError(null);
    setDetectionResults(null);
    setDetectionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDetectObjects = async () => {
    if (!imageData || detectionOptions.objects.length === 0) {
      return;
    }

    setIsDetecting(true);
    setDetectionError(null);
    setDetectionResults(null);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('file', imageData.file);
      formData.append('objects', detectionOptions.objects.join(','));
      formData.append('include_similar', detectionOptions.includeSimilar.toString());
      formData.append('confidence', detectionOptions.confidence.toString());
      formData.append('fallback_to_all', detectionOptions.fallbackEnabled.toString());

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/detect`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Detection failed: ${response.status} ${response.statusText}`);
      }

      const results: DetectionResult = await response.json();
      
      if ('error' in results) {
        throw new Error((results as { error: string }).error);
      }

      setDetectionResults(results);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect objects';
      setDetectionError(errorMessage);
      console.error('Detection error:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canDetect = imageData && detectionOptions.objects.length > 0 && !isDetecting;

  return (
    <div className="w-full space-y-8">
      {/* Image Upload Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Upload Image
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Select an image to analyze. Supported formats: JPG, JPEG, PNG (max 10MB)
          </p>
        </div>

        {!imageData ? (
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragOver 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }
              ${isLoading ? 'pointer-events-none opacity-50' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              disabled={isLoading}
            />

            {isLoading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">Processing image...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg
                  className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isDragOver ? 'Drop image here' : 'Upload an image'}
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Drag and drop your image here, or click to browse
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                >
                  Choose File
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Image Preview
                </h3>
                <button
                  onClick={handleRemoveImage}
                  className="px-3 py-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm transition-colors"
                  disabled={isDetecting}
                >
                  Remove
                </button>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Image */}
                <div className="flex-1">
                  <div className="relative bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <Image
                      src={detectionResults?.annotated_image_base64 
                        ? `data:image/jpeg;base64,${detectionResults.annotated_image_base64}`
                        : imageData.preview
                      }
                      alt="Preview"
                      width={500}
                      height={300}
                      className="max-w-full h-auto rounded object-contain mx-auto"
                      style={{ maxHeight: '400px' }}
                    />
                    {detectionResults && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                          Detections: {detectionResults.matching_objects_found}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Image Info */}
                <div className="lg:w-80">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Image Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Name:</span>
                        <span className="text-gray-900 dark:text-white font-medium truncate ml-2">
                          {imageData.file.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Size:</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {formatFileSize(imageData.file.size)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Dimensions:</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {imageData.dimensions.width} × {imageData.dimensions.height}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Type:</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {imageData.file.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-red-800 dark:text-red-200 font-medium text-sm">
                {error}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Object Selection Section */}
      {imageData && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
          <ObjectSelection
            selectedObjects={detectionOptions.objects}
            onObjectsChange={(objects) => 
              setDetectionOptions(prev => ({ ...prev, objects }))
            }
            includeSimilar={detectionOptions.includeSimilar}
            onIncludeSimilarChange={(includeSimilar) => 
              setDetectionOptions(prev => ({ ...prev, includeSimilar }))
            }
            confidence={detectionOptions.confidence}
            onConfidenceChange={(confidence) => 
              setDetectionOptions(prev => ({ ...prev, confidence }))
            }
            fallbackEnabled={detectionOptions.fallbackEnabled}
            onFallbackChange={(fallbackEnabled) => 
              setDetectionOptions(prev => ({ ...prev, fallbackEnabled }))
            }
          />
        </div>
      )}

      {/* Detection Button and Status */}
      {imageData && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
          <div className="text-center">
            {/* Detection Button */}
            <button
              type="button"
              onClick={handleDetectObjects}
              disabled={!canDetect}
              className={`
                px-8 py-4 rounded-lg font-medium text-lg transition-colors
                ${canDetect 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isDetecting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Detecting Objects...
                </div>
              ) : (
                'Detect Objects'
              )}
            </button>

            {/* Help text */}
            {!canDetect && imageData && detectionOptions.objects.length === 0 && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Please select objects to detect before starting detection
              </p>
            )}
          </div>

          {/* Detection Error */}
          {detectionError && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-red-800 dark:text-red-200 font-medium text-sm">
                  Detection failed: {detectionError}
                </span>
              </div>
            </div>
          )}

          {/* Detection Results */}
          {detectionResults && (
            <div className="mt-6">
              <DetectionResults 
                results={detectionResults} 
                originalImageName={imageData.file.name}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload; 
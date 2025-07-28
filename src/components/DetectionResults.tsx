'use client';

import React, { useState } from 'react';
import InteractiveImageOverlay from './InteractiveImageOverlay';

interface DetectionData {
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
}

interface DetectionResult {
  detections: DetectionData[];
  used_fallback: boolean;
  fallback_message?: string;
  image_dimensions: { width: number; height: number };
  total_objects_found: number;
  matching_objects_found: number;
  annotated_image_base64?: string;
  requested_objects?: string[];
  searched_classes?: string[];
}

interface DetectionResultsProps {
  results: DetectionResult;
  originalImageName: string;
}

const DetectionResults: React.FC<DetectionResultsProps> = ({ results, originalImageName }) => {
  const [copiedCoordinate, setCopiedCoordinate] = useState<string | null>(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState<number | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCoordinate(label);
      setTimeout(() => setCopiedCoordinate(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadAnnotatedImage = () => {
    if (!results.annotated_image_base64) return;

    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${results.annotated_image_base64}`;
    link.download = `detected_${originalImageName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const exportData = {
      summary: {
        total_objects_found: results.total_objects_found,
        matching_objects_found: results.matching_objects_found,
        used_fallback: results.used_fallback,
        image_dimensions: results.image_dimensions,
        requested_objects: results.requested_objects,
        searched_classes: results.searched_classes,
      },
      detections: results.detections.map(detection => ({
        id: detection.id,
        class_name: detection.class_name,
        confidence: detection.confidence,
        matched_request: detection.matched_request,
        coordinates: {
          bounding_box: detection.bbox,
          vertices: detection.vertices,
          center_point: detection.center_point,
          dimensions: detection.dimensions,
          area: detection.area,
        },
      })),
      export_timestamp: new Date().toISOString(),
      original_image: originalImageName,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detection_data_${originalImageName.replace(/\.[^/.]+$/, '')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const csvHeader = [
      'ID',
      'Class Name',
      'Confidence',
      'Matched Request',
      'Center X',
      'Center Y',
      'Top Left X',
      'Top Left Y',
      'Top Right X',
      'Top Right Y',
      'Bottom Left X',
      'Bottom Left Y',
      'Bottom Right X',
      'Bottom Right Y',
      'Width',
      'Height',
      'Area',
      'Bbox X1',
      'Bbox Y1',
      'Bbox X2',
      'Bbox Y2'
    ].join(',');

    const csvRows = results.detections.map(detection => [
      detection.id,
      `"${detection.class_name}"`,
      detection.confidence.toFixed(3),
      detection.matched_request,
      detection.center_point.x,
      detection.center_point.y,
      detection.vertices.top_left.x,
      detection.vertices.top_left.y,
      detection.vertices.top_right.x,
      detection.vertices.top_right.y,
      detection.vertices.bottom_left.x,
      detection.vertices.bottom_left.y,
      detection.vertices.bottom_right.x,
      detection.vertices.bottom_right.y,
      detection.dimensions.width,
      detection.dimensions.height,
      detection.area,
      detection.bbox.x1,
      detection.bbox.y1,
      detection.bbox.x2,
      detection.bbox.y2
    ].join(','));

    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detection_coordinates_${originalImageName.replace(/\.[^/.]+$/, '')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const CoordinateButton: React.FC<{ 
    coordinate: { x: number; y: number } | string; 
    label: string; 
    className?: string 
  }> = ({ coordinate, label, className = "" }) => {
    const displayText = typeof coordinate === 'string' 
      ? coordinate 
      : `(${coordinate.x}, ${coordinate.y})`;
    const copyText = typeof coordinate === 'string' 
      ? coordinate 
      : `${coordinate.x},${coordinate.y}`;

    return (
      <button
        onClick={() => copyToClipboard(copyText, label)}
        className={`inline-flex items-center px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors ${className}`}
        title="Click to copy coordinates"
      >
        {displayText}
        {copiedCoordinate === label && (
          <span className="ml-1 text-green-600 dark:text-green-400">✓</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Coordinate System Help
              </h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Coordinate Formats</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Pixels (px):</strong> Standard pixel coordinates from top-left corner (0,0)</li>
                  <li><strong>Percentage (%):</strong> Coordinates as percentage of image dimensions</li>
                  <li><strong>Normalized (0-1):</strong> Coordinates normalized to 0-1 range</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bounding Box Structure</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Vertices:</strong> Four corner points of the bounding box</li>
                  <li><strong>Center Point:</strong> Calculated center of the bounding box</li>
                  <li><strong>Dimensions:</strong> Width and height of the bounding box</li>
                  <li><strong>Area:</strong> Total area in square pixels</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Interactive Features</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Hover:</strong> See object info and coordinates</li>
                  <li><strong>Click:</strong> Select objects and view detailed coordinates</li>
                  <li><strong>Ruler Tool:</strong> Measure distances between any two points</li>
                  <li><strong>Copy Coordinates:</strong> Click any coordinate to copy to clipboard</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Export Options</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Download Image:</strong> Save annotated image with bounding boxes</li>
                  <li><strong>Export JSON:</strong> Complete detection data in JSON format</li>
                  <li><strong>Export CSV:</strong> Coordinate data in spreadsheet format</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Warning Banner */}
      {results.used_fallback && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-200">
                Fallback Detection Used
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {results.fallback_message || "No requested objects found. Showing all detected objects instead."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Image */}
      {results.annotated_image_base64 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Interactive Detection Results
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={downloadAnnotatedImage}
                className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                Download Image
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <InteractiveImageOverlay
              imageSrc={`data:image/jpeg;base64,${results.annotated_image_base64}`}
              imageWidth={results.image_dimensions.width}
              imageHeight={results.image_dimensions.height}
              detections={results.detections}
              selectedDetectionId={selectedDetectionId}
              onDetectionSelect={setSelectedDetectionId}
            />
          </div>

          {/* Interactive Instructions */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <div className="font-medium mb-1">Interactive Features:</div>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Hover</strong> over bounding boxes to see object info</li>
                <li>• <strong>Click</strong> boxes to view detailed coordinates and highlight cards</li>
                <li>• Use <strong>Ruler tool</strong> to measure distances between points</li>
                <li>• Toggle coordinate format between decimal and integer</li>
                <li>• All coordinates are copyable with one click</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Detection Summary
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowHelpModal(true)}
              className="inline-flex items-center px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Help
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </button>
            <button
              onClick={exportJSON}
              className="inline-flex items-center px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
              Export JSON
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {results.matching_objects_found}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              Matching Objects
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">
              {results.total_objects_found}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Total Objects
            </div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {results.image_dimensions.width}×{results.image_dimensions.height}
            </div>
            <div className="text-sm text-purple-800 dark:text-purple-200">
              Image Size
            </div>
          </div>
          
          <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {results.detections.length}
            </div>
            <div className="text-sm text-indigo-800 dark:text-indigo-200">
              Detection Cards
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Detection Cards */}
      {results.detections.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
            Detailed Detection Information
          </h3>
          
          <div className="space-y-4">
            {results.detections.map((detection) => (
              <div
                key={detection.id}
                className={`
                  p-5 rounded-lg border-2 transition-all duration-200 cursor-pointer
                  ${detection.matched_request 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                  }
                  ${selectedDetectionId === detection.id 
                    ? 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-lg' 
                    : 'hover:shadow-md'
                  }
                `}
                onClick={() => setSelectedDetectionId(
                  selectedDetectionId === detection.id ? null : detection.id
                )}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white capitalize flex items-center">
                      {detection.class_name}
                      {selectedDetectionId === detection.id && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400">👁️</span>
                      )}
                    </h4>
                    <div className="flex items-center mt-1">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${detection.matched_request
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                          : 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200'
                        }
                      `}>
                        {detection.matched_request ? 'Requested Match' : 'Fallback Detection'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(detection.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Confidence
                    </div>
                  </div>
                </div>

                {/* Coordinate Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Center Point */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">Center Point</h5>
                    <CoordinateButton 
                      coordinate={detection.center_point} 
                      label={`center-${detection.id}`}
                    />
                  </div>

                  {/* Bounding Box Vertices */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">Bounding Box Vertices</h5>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Top-left:</span>
                        <br />
                        <CoordinateButton 
                          coordinate={detection.vertices.top_left} 
                          label={`tl-${detection.id}`}
                        />
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Top-right:</span>
                        <br />
                        <CoordinateButton 
                          coordinate={detection.vertices.top_right} 
                          label={`tr-${detection.id}`}
                        />
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Bottom-left:</span>
                        <br />
                        <CoordinateButton 
                          coordinate={detection.vertices.bottom_left} 
                          label={`bl-${detection.id}`}
                        />
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Bottom-right:</span>
                        <br />
                        <CoordinateButton 
                          coordinate={detection.vertices.bottom_right} 
                          label={`br-${detection.id}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dimensions and Area */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">Measurements</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Width:</span>
                        <CoordinateButton 
                          coordinate={`${detection.dimensions.width}px`} 
                          label={`width-${detection.id}`}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Height:</span>
                        <CoordinateButton 
                          coordinate={`${detection.dimensions.height}px`} 
                          label={`height-${detection.id}`}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Area:</span>
                        <CoordinateButton 
                          coordinate={`${detection.area.toFixed(0)}px²`} 
                          label={`area-${detection.id}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raw Bounding Box Coordinates */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">Raw Bounding Box</h5>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-300">x1:</span>
                    <CoordinateButton 
                      coordinate={`${detection.bbox.x1}`} 
                      label={`x1-${detection.id}`}
                    />
                    <span className="text-gray-600 dark:text-gray-300">y1:</span>
                    <CoordinateButton 
                      coordinate={`${detection.bbox.y1}`} 
                      label={`y1-${detection.id}`}
                    />
                    <span className="text-gray-600 dark:text-gray-300">x2:</span>
                    <CoordinateButton 
                      coordinate={`${detection.bbox.x2}`} 
                      label={`x2-${detection.id}`}
                    />
                    <span className="text-gray-600 dark:text-gray-300">y2:</span>
                    <CoordinateButton 
                      coordinate={`${detection.bbox.y2}`} 
                      label={`y2-${detection.id}`}
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Tip: Click any coordinate to copy it to clipboard
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Coordinates are copied in comma-separated format (x,y) for easy use in other applications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetectionResults; 
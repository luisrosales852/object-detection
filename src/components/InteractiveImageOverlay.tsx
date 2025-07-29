'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

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

interface CoordinatePopupData {
  detection: DetectionData;
  x: number;
  y: number;
}

interface RulerPoint {
  x: number;
  y: number;
  imageX: number;
  imageY: number;
}

type CoordinateFormat = 'pixels' | 'percentage' | 'normalized';

interface InteractiveImageOverlayProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  detections: DetectionData[];
  selectedDetectionId: number | null;
  onDetectionSelect: (id: number | null) => void;
  exactDimensions?: boolean; // New prop to control exact sizing
}

const InteractiveImageOverlay: React.FC<InteractiveImageOverlayProps> = ({
  imageSrc,
  imageWidth,
  imageHeight,
  detections,
  selectedDetectionId,
  onDetectionSelect,
  exactDimensions = false, // Default to false for backward compatibility
}) => {
  const [hoveredDetection, setHoveredDetection] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<{ detection: DetectionData; x: number; y: number } | null>(null);
  const [coordinatePopup, setCoordinatePopup] = useState<CoordinatePopupData | null>(null);
  const [coordinateFormat, setCoordinateFormat] = useState<CoordinateFormat>('pixels');
  const [rulerMode, setRulerMode] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<RulerPoint[]>([]);
  const [copiedCoordinate, setCopiedCoordinate] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });
  const [scaleFactors, setScaleFactors] = useState({ x: 1, y: 1 });

  // Calculate scaled dimensions that maintain aspect ratio
  const getScaledDimensions = () => {
    if (exactDimensions) {
      return { width: imageWidth, height: imageHeight };
    }
    
    // Calculate scaled dimensions maintaining aspect ratio with max height of 600px
    const maxHeight = 600;
    const aspectRatio = imageWidth / imageHeight;
    
    if (imageHeight <= maxHeight) {
      // Image is already small enough
      return { width: imageWidth, height: imageHeight };
    }
    
    // Scale down maintaining aspect ratio
    const scaledHeight = maxHeight;
    const scaledWidth = Math.round(scaledHeight * aspectRatio);
    
    return { width: scaledWidth, height: scaledHeight };
  };

  const scaledDimensions = getScaledDimensions();

  // Update display dimensions and scale factors when dimensions change
  useEffect(() => {
    const updateDimensions = () => {
      if (exactDimensions) {
        setDisplayDimensions({ width: imageWidth, height: imageHeight });
        setScaleFactors({ x: 1, y: 1 });
      } else {
        setDisplayDimensions({ width: scaledDimensions.width, height: scaledDimensions.height });
        setScaleFactors({
          x: scaledDimensions.width / imageWidth,
          y: scaledDimensions.height / imageHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [imageWidth, imageHeight, exactDimensions, scaledDimensions.width, scaledDimensions.height]);

  const formatCoordinate = (value: number, axis?: 'x' | 'y'): string => {
    switch (coordinateFormat) {
      case 'percentage':
        const maxValue = axis === 'x' ? imageWidth : axis === 'y' ? imageHeight : Math.max(imageWidth, imageHeight);
        return ((value / maxValue) * 100).toFixed(1) + '%';
      case 'normalized':
        const normalizedMax = axis === 'x' ? imageWidth : axis === 'y' ? imageHeight : Math.max(imageWidth, imageHeight);
        return (value / normalizedMax).toFixed(3);
      default: // pixels
        return Math.round(value).toString();
    }
  };

  const formatCoordinatePair = (point: { x: number; y: number }): string => {
    switch (coordinateFormat) {
      case 'percentage':
        return `${((point.x / imageWidth) * 100).toFixed(1)}%, ${((point.y / imageHeight) * 100).toFixed(1)}%`;
      case 'normalized':
        return `${(point.x / imageWidth).toFixed(3)}, ${(point.y / imageHeight).toFixed(3)}`;
      default: // pixels
        return `${Math.round(point.x)}, ${Math.round(point.y)}`;
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCoordinate(label);
      setTimeout(() => setCopiedCoordinate(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getImageCoordinates = (clientX: number, clientY: number): { x: number; y: number } => {
    if (!imageRef.current) return { x: 0, y: 0 };
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * imageWidth;
    const y = ((clientY - rect.top) / rect.height) * imageHeight;
    
    return { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update mouse position
    const imageCoords = getImageCoordinates(e.clientX, e.clientY);
    setMousePosition(imageCoords);

    if (hoveredDetection !== null) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipData({
          detection: detections.find(d => d.id === hoveredDetection)!,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredDetection(null);
    setTooltipData(null);
    setMousePosition(null);
  };

  const handleBoxClick = (detection: DetectionData, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (rulerMode) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoordinatePopup({
        detection,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      onDetectionSelect(detection.id);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (rulerMode) {
      const imageCoords = getImageCoordinates(e.clientX, e.clientY);
      const rect = containerRef.current?.getBoundingClientRect();
      
      if (rect) {
        const newPoint: RulerPoint = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          imageX: imageCoords.x,
          imageY: imageCoords.y,
        };
        
        setRulerPoints(prev => {
          if (prev.length >= 2) {
            return [newPoint];
          }
          return [...prev, newPoint];
        });
      }
    } else {
      setCoordinatePopup(null);
      onDetectionSelect(null);
    }
  };

  const calculateDistance = (p1: RulerPoint, p2: RulerPoint): number => {
    const dx = p2.imageX - p1.imageX;
    const dy = p2.imageY - p1.imageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const clearRuler = () => {
    setRulerPoints([]);
  };

  const renderBoundingBox = (detection: DetectionData) => {
    const { vertices } = detection;
    const isSelected = selectedDetectionId === detection.id;
    const isHovered = hoveredDetection === detection.id;
    
    // Scale coordinates to display size
    const scaledVertices = {
      top_left: { 
        x: vertices.top_left.x * scaleFactors.x, 
        y: vertices.top_left.y * scaleFactors.y 
      },
      top_right: { 
        x: vertices.top_right.x * scaleFactors.x, 
        y: vertices.top_right.y * scaleFactors.y 
      },
      bottom_left: { 
        x: vertices.bottom_left.x * scaleFactors.x, 
        y: vertices.bottom_left.y * scaleFactors.y 
      },
      bottom_right: { 
        x: vertices.bottom_right.x * scaleFactors.x, 
        y: vertices.bottom_right.y * scaleFactors.y 
      },
    };

    const pathData = `
      M ${scaledVertices.top_left.x} ${scaledVertices.top_left.y}
      L ${scaledVertices.top_right.x} ${scaledVertices.top_right.y}
      L ${scaledVertices.bottom_right.x} ${scaledVertices.bottom_right.y}
      L ${scaledVertices.bottom_left.x} ${scaledVertices.bottom_left.y}
      Z
    `;

    const color = detection.matched_request ? '#22c55e' : '#f97316'; // green or orange
    const strokeWidth = isSelected ? 3 : isHovered ? 2.5 : 2;
    const opacity = isHovered ? 0.8 : 0.6;

    return (
      <g key={detection.id}>
        {/* Bounding box */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={isSelected ? "5,5" : "none"}
          opacity={opacity}
          className="cursor-pointer transition-all duration-200"
          onMouseEnter={() => setHoveredDetection(detection.id)}
          onClick={(e) => handleBoxClick(detection, e)}
        />
        
        {/* Corner dots */}
        {Object.values(scaledVertices).map((vertex, index) => (
          <circle
            key={index}
            cx={vertex.x}
            cy={vertex.y}
            r={isSelected ? 4 : 3}
            fill={color}
            opacity={isHovered || isSelected ? 1 : 0.7}
            className="cursor-pointer"
            onMouseEnter={() => setHoveredDetection(detection.id)}
            onClick={(e) => handleBoxClick(detection, e)}
          />
        ))}

        {/* Center point crosshair for selected detection */}
        {isSelected && (
          <g>
            <line
              x1={detection.center_point.x * scaleFactors.x - 8}
              y1={detection.center_point.y * scaleFactors.y}
              x2={detection.center_point.x * scaleFactors.x + 8}
              y2={detection.center_point.y * scaleFactors.y}
              stroke={color}
              strokeWidth={2}
              opacity={0.8}
            />
            <line
              x1={detection.center_point.x * scaleFactors.x}
              y1={detection.center_point.y * scaleFactors.y - 8}
              x2={detection.center_point.x * scaleFactors.x}
              y2={detection.center_point.y * scaleFactors.y + 8}
              stroke={color}
              strokeWidth={2}
              opacity={0.8}
            />
          </g>
        )}

        {/* Label */}
        <text
          x={scaledVertices.top_left.x}
          y={scaledVertices.top_left.y - 8}
          fill={color}
          fontSize="12"
          fontWeight="bold"
          className="pointer-events-none select-none"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        >
          {detection.class_name} ({(detection.confidence * 100).toFixed(0)}%)
        </text>
      </g>
    );
  };

  return (
    <div ref={containerRef} className="relative" onMouseLeave={handleMouseLeave}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg space-y-3">
          {/* Coordinate Format Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Coordinate Format:
            </label>
            <div className="flex space-x-1">
              {(['pixels', 'percentage', 'normalized'] as CoordinateFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => setCoordinateFormat(format)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    coordinateFormat === format
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {format === 'pixels' ? 'px' : format === 'percentage' ? '%' : '0-1'}
                </button>
              ))}
            </div>
          </div>

          {/* Ruler Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setRulerMode(!rulerMode);
                if (!rulerMode) clearRuler();
              }}
              className={`px-3 py-2 text-xs rounded transition-colors ${
                rulerMode
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              📏 Ruler {rulerMode ? 'ON' : 'OFF'}
            </button>
            {rulerPoints.length > 0 && (
              <button
                onClick={clearRuler}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Mouse Position Display */}
        {mousePosition && (
          <div className="bg-gray-800 text-white rounded-lg p-2 shadow-lg text-xs font-mono">
            <div>Mouse: {formatCoordinatePair(mousePosition)}</div>
          </div>
        )}

        {/* Ruler Distance Display */}
        {rulerPoints.length === 2 && (
          <div className="bg-orange-100 dark:bg-orange-900/20 rounded-lg p-3 shadow-lg">
            <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Distance: {formatCoordinate(calculateDistance(rulerPoints[0], rulerPoints[1]))} 
              {coordinateFormat === 'pixels' ? 'px' : coordinateFormat === 'percentage' ? '%' : 'units'}
            </div>
          </div>
        )}
      </div>

      {/* Image with overlay */}
      <div className="relative">
        <Image
          ref={imageRef}
          src={imageSrc}
          alt="Detection Results"
          width={scaledDimensions.width}
          height={scaledDimensions.height}
          className="rounded"
          style={exactDimensions ? {
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
            minWidth: `${imageWidth}px`,
            minHeight: `${imageHeight}px`
          } : {
            width: `${scaledDimensions.width}px`,
            height: `${scaledDimensions.height}px`
          }}
          unoptimized={exactDimensions}
          onLoad={() => {
            // Set dimensions and scale factors based on exact or scaled mode
            if (exactDimensions) {
              setDisplayDimensions({ width: imageWidth, height: imageHeight });
              setScaleFactors({ x: 1, y: 1 });
            } else {
              setDisplayDimensions({ width: scaledDimensions.width, height: scaledDimensions.height });
              setScaleFactors({
                x: scaledDimensions.width / imageWidth,
                y: scaledDimensions.height / imageHeight,
              });
            }
          }}
        />

        {/* SVG Overlay */}
        <svg
          className="absolute top-0 left-0 cursor-crosshair"
          width={exactDimensions ? displayDimensions.width : scaledDimensions.width}
          height={exactDimensions ? displayDimensions.height : scaledDimensions.height}
          style={{
            width: exactDimensions ? `${displayDimensions.width}px` : `${scaledDimensions.width}px`,
            height: exactDimensions ? `${displayDimensions.height}px` : `${scaledDimensions.height}px`
          }}
          onMouseMove={handleMouseMove}
          onClick={handleImageClick}
        >
          {/* Bounding boxes */}
          {detections.map(renderBoundingBox)}

          {/* Ruler lines and points */}
          {rulerPoints.map((point, index) => (
            <circle
              key={`ruler-${index}`}
              cx={point.x}
              cy={point.y}
              r={6}
              fill="#f97316"
              stroke="white"
              strokeWidth={2}
              className="drop-shadow-sm"
            />
          ))}

          {rulerPoints.length === 2 && (
            <line
              x1={rulerPoints[0].x}
              y1={rulerPoints[0].y}
              x2={rulerPoints[1].x}
              y2={rulerPoints[1].y}
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5,5"
              className="drop-shadow-sm"
            />
          )}
        </svg>
      </div>

      {/* Hover Tooltip */}
      {tooltipData && (
        <div
          className="absolute z-20 bg-black text-white px-3 py-2 rounded-lg text-sm pointer-events-none"
          style={{
            left: tooltipData.x + 10,
            top: tooltipData.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="font-semibold">{tooltipData.detection.class_name}</div>
          <div>Confidence: {(tooltipData.detection.confidence * 100).toFixed(1)}%</div>
          <div>
            Center: {formatCoordinatePair(tooltipData.detection.center_point)}
          </div>
          <div>
            Size: {formatCoordinate(tooltipData.detection.dimensions.width)} × {formatCoordinate(tooltipData.detection.dimensions.height)}
          </div>
        </div>
      )}

      {/* Coordinate Popup */}
      {coordinatePopup && (
        <div
          className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-4 min-w-80"
          style={{
            left: Math.min(coordinatePopup.x, displayDimensions.width - 320),
            top: Math.max(10, coordinatePopup.y - 150),
          }}
        >
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {coordinatePopup.detection.class_name}
            </h4>
            <button
              onClick={() => setCoordinatePopup(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-sm">
            {/* Vertices */}
            <div>
              <div className="font-medium text-gray-900 dark:text-white mb-2">Vertices ({coordinateFormat}):</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(coordinatePopup.detection.vertices).map(([key, vertex]) => (
                  <button
                    key={key}
                    onClick={() => copyToClipboard(formatCoordinatePair(vertex), `popup-${key}`)}
                    className="text-left p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="font-mono text-xs">
                      {key.replace('_', '-')}: {formatCoordinatePair(vertex)}
                      {copiedCoordinate === `popup-${key}` && (
                        <span className="ml-1 text-green-600">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Center and Dimensions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => copyToClipboard(
                  formatCoordinatePair(coordinatePopup.detection.center_point),
                  'popup-center'
                )}
                className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  Center: {formatCoordinatePair(coordinatePopup.detection.center_point)}
                  {copiedCoordinate === 'popup-center' && (
                    <span className="ml-1 text-green-600">✓</span>
                  )}
                </div>
              </button>

              <button
                onClick={() => copyToClipboard(
                  `${formatCoordinate(coordinatePopup.detection.dimensions.width)}x${formatCoordinate(coordinatePopup.detection.dimensions.height)}`,
                  'popup-dimensions'
                )}
                className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <div className="text-xs text-purple-800 dark:text-purple-200">
                  Size: {formatCoordinate(coordinatePopup.detection.dimensions.width)} × {formatCoordinate(coordinatePopup.detection.dimensions.height)}
                  {copiedCoordinate === 'popup-dimensions' && (
                    <span className="ml-1 text-green-600">✓</span>
                  )}
                </div>
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Click any coordinate to copy • Format: {coordinateFormat}
            </div>
          </div>
        </div>
      )}

      {/* Ruler Instructions */}
      {rulerMode && rulerPoints.length < 2 && (
        <div className="absolute bottom-4 left-4 bg-orange-100 dark:bg-orange-900/20 rounded-lg p-3 shadow-lg">
          <div className="text-sm text-orange-800 dark:text-orange-200">
            📏 Click {rulerPoints.length === 0 ? 'two points' : 'one more point'} to measure distance
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveImageOverlay; 
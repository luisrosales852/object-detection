'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ObjectSelectionProps {
  selectedObjects: string[];
  onObjectsChange: (objects: string[]) => void;
  includeSimilar: boolean;
  onIncludeSimilarChange: (include: boolean) => void;
  confidence: number;
  onConfidenceChange: (confidence: number) => void;
  fallbackEnabled: boolean;
  onFallbackChange: (enabled: boolean) => void;
}

interface YOLOClass {
  classes: string[];
  categories: Record<string, string[]>;
  total_classes: number;
}

const ObjectSelection: React.FC<ObjectSelectionProps> = ({
  selectedObjects,
  onObjectsChange,
  includeSimilar,
  onIncludeSimilarChange,
  confidence,
  onConfidenceChange,
  fallbackEnabled,
  onFallbackChange,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('objectDetectionRecentSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load recent searches:', err);
    }
  }, []);

  // Save search to recent searches
  const saveToRecentSearches = useCallback((objects: string[]) => {
    if (objects.length === 0) return;
    
    try {
      const searchString = objects.join(', ');
      const updated = [searchString, ...recentSearches.filter(s => s !== searchString)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('objectDetectionRecentSearches', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save recent search:', err);
    }
  }, [recentSearches]);

  // Fetch available YOLO classes on component mount
  useEffect(() => {
    const fetchAvailableClasses = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/available_classes`);
        if (!response.ok) {
          throw new Error('Failed to fetch available classes');
        }
        
        const data: YOLOClass = await response.json();
        setAvailableClasses(data.classes);
      } catch (err) {
        setError('Failed to load available object classes. Make sure the API server is running.');
        console.error('Error fetching classes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableClasses();
  }, []);

  // Update input value when selected objects change
  useEffect(() => {
    setInputValue(selectedObjects.join(', '));
  }, [selectedObjects]);

  // Generate suggestions based on input
  const generateSuggestions = useCallback((input: string) => {
    if (!input.trim() || availableClasses.length === 0) {
      return [];
    }

    const searchTerm = input.toLowerCase().trim();
    const currentObjects = selectedObjects.map(obj => obj.toLowerCase().trim());
    
    return availableClasses
      .filter(className => 
        className.toLowerCase().includes(searchTerm) && 
        !currentObjects.includes(className.toLowerCase())
      )
      .slice(0, 8); // Limit to 8 suggestions
  }, [availableClasses, selectedObjects]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Get the current word being typed (after the last comma)
    const words = value.split(',');
    const currentWord = words[words.length - 1].trim();
    
    const newSuggestions = generateSuggestions(currentWord);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0 && currentWord.length > 0);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowSuggestions(false);
      setShowRecentSearches(false);
    }, 150);
    
    // Parse and update objects
    const objects = inputValue
      .split(',')
      .map(obj => obj.trim())
      .filter(obj => obj.length > 0);
    
    onObjectsChange(objects);
    
    // Save to recent searches if objects were added
    if (objects.length > 0) {
      saveToRecentSearches(objects);
    }
  };

  const handleInputFocus = () => {
    if (inputValue.trim() === '' && recentSearches.length > 0) {
      setShowRecentSearches(true);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const words = inputValue.split(',');
    words[words.length - 1] = ` ${suggestion}`;
    const newValue = words.join(',');
    
    setInputValue(newValue);
    setShowSuggestions(false);
    
    // Update objects immediately
    const objects = newValue
      .split(',')
      .map(obj => obj.trim())
      .filter(obj => obj.length > 0);
    
    onObjectsChange(objects);
    inputRef.current?.focus();
  };

  const handleRecentSearchClick = (searchString: string) => {
    setInputValue(searchString);
    setShowRecentSearches(false);
    
    const objects = searchString
      .split(',')
      .map(obj => obj.trim())
      .filter(obj => obj.length > 0);
    
    onObjectsChange(objects);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputBlur();
    }
  };

  const removeObject = (indexToRemove: number) => {
    const newObjects = selectedObjects.filter((_, index) => index !== indexToRemove);
    onObjectsChange(newObjects);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('objectDetectionRecentSearches');
    setShowRecentSearches(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Object Selection
        </h3>
        
        {/* Object Input */}
        <div className="space-y-3">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Objects to Detect
            </label>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder="Enter objects separated by commas (e.g., car, person, dog)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
            />
            
            {/* Recent Searches Dropdown */}
            {showRecentSearches && recentSearches.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                <div className="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Recent Searches</span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleRecentSearchClick(search)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none text-gray-900 dark:text-white text-sm"
                  >
                    <span className="text-blue-600 dark:text-blue-400 mr-1">🕐</span>
                    {search}
                  </button>
                ))}
              </div>
            )}
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div 
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none text-gray-900 dark:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Selected Objects Tags */}
          {selectedObjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedObjects.map((object, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                >
                  {object}
                  <button
                    type="button"
                    onClick={() => removeObject(index)}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Loading/Error States */}
          {isLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading available object classes...
            </p>
          )}
          
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Detection Options */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-white">
          Detection Options
        </h4>
        
        {/* Include Similar Objects Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Include Similar Objects
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Expand search to include related object types (e.g., "vehicle" includes car, truck, bus)
            </p>
          </div>
          <button
            type="button"
            onClick={() => onIncludeSimilarChange(!includeSimilar)}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${includeSimilar ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${includeSimilar ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Confidence Threshold
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={confidence}
            onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Enable Fallback Detection Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Fallback Detection
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Show all detected objects if none of the specified objects are found
            </p>
          </div>
          <button
            type="button"
            onClick={() => onFallbackChange(!fallbackEnabled)}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${fallbackEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${fallbackEnabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Summary */}
      {selectedObjects.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Detection Summary
          </h5>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• Looking for: {selectedObjects.join(', ')}</p>
            <p>• Confidence: {(confidence * 100).toFixed(0)}% minimum</p>
            <p>• Similar objects: {includeSimilar ? 'Included' : 'Excluded'}</p>
            <p>• Fallback: {fallbackEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectSelection; 
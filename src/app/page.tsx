'use client';

import ImageUpload from '@/components/ImageUpload';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Object Detection with YOLO
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Upload an image to detect objects using AI
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <ImageUpload />
        </div>
      </main>
    </div>
  );
}

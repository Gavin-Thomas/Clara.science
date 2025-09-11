import React, { useState, useEffect } from 'react';
import { Loader } from './Loader';
import { KeyIcon, DownloadIcon } from './icons';

interface ImageCanvasProps {
  imageData: string | null;
  explanation: string | null;
  isLoading: boolean;
  error: string | null;
}

const loadingMessages = [
    "Consulting clinical textbooks...",
    "Sketching mnemonic symbols...",
    "Composing the visual narrative...",
    "Reviewing high-yield facts...",
    "Finalizing the artwork..."
];

const ExplanationRenderer: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return null;

    const title = lines.shift(); 
    const points = lines.map(line => line.replace(/^\* /, ''));

    return (
        <div className="w-full max-w-4xl bg-yellow-50 border border-yellow-200 text-yellow-900 p-4 rounded-lg">
            <div className="flex items-start gap-3">
                <KeyIcon className="h-6 w-6 text-[#ffcd00] flex-shrink-0 mt-1" />
                <div>
                    <h3 className="font-bold text-lg mb-2 text-gray-900">{title}</h3>
                    <ul className="list-disc list-inside text-sm space-y-1.5 text-gray-800">
                        {points.map((point, index) => (
                            <li key={index}>{point}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};


export const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageData, explanation, isLoading, error }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleDownload = () => {
    if (!imageData) return;

    let title = 'clara-ai-mnemonic';
    if (explanation) {
      const firstLine = explanation.split('\n')[0].trim();
      if (firstLine) {
        // Sanitize the title for use as a filename
        title = firstLine
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-')       // Replace spaces with hyphens
          .slice(0, 50);              // Limit length
      }
    }
    const filename = `${title}.jpeg`;

    const link = document.createElement('a');
    link.href = imageData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative min-h-[400px] lg:min-h-[600px]">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-10 rounded-xl transition-opacity duration-300">
          <Loader />
          <p className="mt-4 text-lg font-semibold text-gray-800">Generating MCCQE Mnemonic...</p>
          <p className="mt-1 text-sm text-gray-500 text-center transition-opacity duration-500 ease-in-out">{loadingMessages[currentMessageIndex]}</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center text-red-600">
          <h3 className="text-xl font-bold mb-2">An Error Occurred</h3>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && imageData && (
        <div className="w-full h-full flex flex-col items-center gap-4">
          <div className="flex-1 w-full max-w-4xl flex items-center justify-center">
             <img src={imageData} alt="Generated medical mnemonic for MCCQE" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
          </div>
          <div className="w-full max-w-4xl">
            <div className="flex justify-end mb-2">
                <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-semibold text-sm py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    aria-label="Download image"
                >
                    <DownloadIcon className="h-4 w-4" />
                    <span>Download</span>
                </button>
            </div>
            {explanation && (
                <ExplanationRenderer text={explanation} />
            )}
          </div>
        </div>
      )}

      {!isLoading && !error && !imageData && (
        <div className="text-center text-gray-500 p-8 border-2 border-dashed border-gray-300 rounded-lg">
          <h2 className="text-2xl font-semibold mb-2 text-gray-700">Welcome to CLARA-AI</h2>
          <p className="max-w-md mx-auto">Enter a medical topic on the left and click "Generate Scene" to create a visual mnemonic for the MCCQE.</p>
        </div>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { ImageCanvas } from './components/ImageCanvas';
import { generateScene, editScene } from './services/geminiService';
import { ExplanationData } from './types';

const App: React.FC = () => {
  const [medicalText, setMedicalText] = useState('');
  const [editText, setEditText] = useState('');
  const [style, setStyle] = useState('Cartoon');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [explanationData, setExplanationData] = useState<ExplanationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!medicalText.trim()) return;

    setIsLoading(true);
    setError(null);
    setExplanationData(null);
    setGeneratedImage(null);

    try {
      const result = await generateScene(medicalText, style);
      const { imageData, ...explanationInfo } = result;
      setGeneratedImage(imageData);
      setExplanationData(explanationInfo);
      setEditText(''); // Clear edit text on new generation
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during generation.');
      setGeneratedImage(null); // Clear image on error
      setExplanationData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editText.trim() || !generatedImage || !explanationData) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await editScene(generatedImage, editText, explanationData);
      setGeneratedImage(result.imageData);

      // Append the new, LLM-generated explanation point.
      setExplanationData(prevData => {
        if (!prevData) return null;
        return {
          ...prevData,
          explanationPoints: [...prevData.explanationPoints, result.newExplanationPoint]
        };
      });

      // Optional: display model's text response from edit if available
      if(result.text){
        console.log("Model edit response:", result.text)
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during editing.');
    } finally {
      setIsLoading(false);
      setEditText('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ControlPanel
              medicalText={medicalText}
              setMedicalText={setMedicalText}
              editText={editText}
              setEditText={setEditText}
              style={style}
              setStyle={setStyle}
              onGenerate={handleGenerate}
              onEdit={handleEdit}
              isLoading={isLoading}
              hasImage={!!generatedImage}
            />
          </div>
          <div className="lg:col-span-2">
            <ImageCanvas 
              imageData={generatedImage}
              explanationData={explanationData}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
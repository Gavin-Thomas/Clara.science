import React, { useState } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { ImageCanvas } from './components/ImageCanvas';
import { generateScene, editScene } from './services/geminiService';

const App: React.FC = () => {
  const [medicalText, setMedicalText] = useState('');
  const [editText, setEditText] = useState('');
  const [style, setStyle] = useState('Cartoon');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!medicalText.trim()) return;

    setIsLoading(true);
    setError(null);
    setExplanation(null);
    setGeneratedImage(null);

    try {
      const result = await generateScene(medicalText, style);
      setGeneratedImage(result.imageData);
      setExplanation(result.explanation);
      setEditText(''); // Clear edit text on new generation
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during generation.');
      setGeneratedImage(null); // Clear image on error
      setExplanation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editText.trim() || !generatedImage) return;

    setIsLoading(true);
    setError(null);
    setExplanation(null); // Clear explanation on edit, as it will be out of sync

    try {
      const result = await editScene(generatedImage, editText);
      setGeneratedImage(result.imageData);
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
    <div className="min-h-screen bg-gray-50 font-sans">
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
              explanation={explanation}
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

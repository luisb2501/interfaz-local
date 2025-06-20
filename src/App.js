import React from 'react';
import ImageCoordinateEditor from './components/ImageCoordinateEditor';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Editor de Coordenadas de Imagen</h1>
        <ImageCoordinateEditor />
      </div>
    </div>
  );
}

export default App;


// DONE
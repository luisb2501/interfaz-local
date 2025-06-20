import React, { useState, useRef, useEffect } from 'react';

const ImageCoordinateEditor = () => {
  const [image, setImage] = useState(null);
  const [coordinates, setCoordinates] = useState({ labels: [], bounding_boxes: [] });
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
  const [circleScale, setCircleScale] = useState(1); // Nuevo estado para el tamaño
  const [imageFileName, setImageFileName] = useState('coordinates_updated.json'); // nuevo estado
  const canvasRef = useRef(null);

  // Cargar imagen
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFileName(file.name.replace(/\.[^.]+$/, '.json')); // cambia extensión a .json
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Cargar JSON
  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          setCoordinates(jsonData);
          setJsonText(JSON.stringify(jsonData, null, 2));
        } catch (error) {
          alert("Error al cargar JSON: " + error.message);
        }
      };  
      reader.readAsText(file);
    }
  };

  // Actualizar coordenadas desde el editor de texto
  const handleJsonChange = (e) => {
    const newText = e.target.value;
    setJsonText(newText);
    try {
      const parsed = JSON.parse(newText);
      setCoordinates(parsed);
    } catch (error) {
      // No actualizamos si el JSON es inválido
    }
  };

  // Sincronizar JSON cuando cambian las coordenadas
  useEffect(() => {
    setJsonText(JSON.stringify(coordinates, null, 2));
    // eslint-disable-next-line
  }, [coordinates]);

  // Ajustar tamaño del canvas al de la imagen
  useEffect(() => {
    if (!image) return;
    const img = new window.Image();
    img.onload = () => {
      setCanvasSize({ width: img.width, height: img.height });
    };
    img.src = image;
  }, [image]);

  // Calcula el radio de los puntos según el tamaño de la imagen y el slider
  const getCircleRadius = () => {
    // 0.7% del ancho, mínimo 4px, máximo 12px, multiplicado por el slider
    if (!canvasRef.current) return 6 * circleScale;
    const w = canvasRef.current.width || 500;
    return Math.max(4, Math.min(12, w * 0.007)) * circleScale;
  };

  // Redibujar los puntos cuando cambie el circleScale
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Calcula el radio de los puntos para este tamaño de imagen
      const CIRCLE_RADIUS = getCircleRadius();

      // Dibujar bounding box
      if (coordinates.bounding_boxes?.length === 4) {
        const [x1, y1, x2, y2] = coordinates.bounding_boxes;
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      }
      // Dibujar puntos (radio proporcional)
      coordinates.labels.forEach(([x, y], index) => {
        ctx.beginPath();
        ctx.arc(x, y, CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.round(CIRCLE_RADIUS * 2.5)}px Arial`;
        ctx.fillText(index, x + CIRCLE_RADIUS + 2, y + CIRCLE_RADIUS / 2);
      });
      // Resaltar punto seleccionado (radio proporcional)
      if (selectedPoint !== null && coordinates.labels[selectedPoint]) {
        const [x, y] = coordinates.labels[selectedPoint];
        ctx.beginPath();
        ctx.arc(x, y, CIRCLE_RADIUS * 1.7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
    img.src = image;
  }, [image, coordinates, selectedPoint, circleScale]); // <--- circleScale agregado aquí

  // Manejar inicio de arrastre
  const handleMouseDown = (e) => {
    if (!image) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    // Solo seleccionar si el click está dentro del círculo (radio exacto)
    const CIRCLE_RADIUS = getCircleRadius();
    const pointIndex = coordinates.labels.findIndex(point => {
      return Math.hypot(point[0] - x, point[1] - y) <= CIRCLE_RADIUS;
    });
    if (pointIndex !== -1) {
      setSelectedPoint(pointIndex);
      setIsDragging(true);
    }
  };

  // Mover punto durante el arrastre
  const handleMouseMove = (e) => {
    if (!isDragging || selectedPoint === null || !image) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.max(0, Math.min((e.clientX - rect.left) * scaleX, canvas.width));
    const y = Math.max(0, Math.min((e.clientY - rect.top) * scaleY, canvas.height));
    setCoordinates((prev) => ({
      ...prev,
      labels: prev.labels.map((point, idx) =>
        idx === selectedPoint ? [x, y] : point
      ),
    }));
  };

  // Finalizar arrastre
  const handleMouseUp = () => {
    setIsDragging(false);
    setSelectedPoint(null);
  };

  // Dibujar canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Calcula el radio de los puntos para este tamaño de imagen
      const CIRCLE_RADIUS = getCircleRadius();

      // Dibujar bounding box
      if (coordinates.bounding_boxes?.length === 4) {
        const [x1, y1, x2, y2] = coordinates.bounding_boxes;
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      }
      // Dibujar puntos (radio proporcional)
      coordinates.labels.forEach(([x, y], index) => {
        ctx.beginPath();
        ctx.arc(x, y, CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.round(CIRCLE_RADIUS * 2.5)}px Arial`;
        ctx.fillText(index, x + CIRCLE_RADIUS + 2, y + CIRCLE_RADIUS / 2);
      });
      // Resaltar punto seleccionado (radio proporcional)
      if (selectedPoint !== null && coordinates.labels[selectedPoint]) {
        const [x, y] = coordinates.labels[selectedPoint];
        ctx.beginPath();
        ctx.arc(x, y, CIRCLE_RADIUS * 1.7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
    img.src = image;
  }, [image, coordinates, selectedPoint]);

  // Descargar JSON actualizado
  const downloadJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = imageFileName || 'coordinates_updated.json';
    link.click();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 h-full">
      {/* Panel izquierdo - Controles */}
      <div className="w-full lg:w-1/3 space-y-4">
        <div className="card bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold mb-3">Cargar Archivos</h3>
          <div className="space-y-3">
            <div>
              <label className="block mb-1">Imagen:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input file-input-bordered w-full"
              />
            </div>
            <div>
              <label className="block mb-1">JSON de coordenadas:</label>
              <input
                type="file"
                accept=".json"
                onChange={handleJsonUpload}
                className="file-input file-input-bordered w-full"
              />
            </div>
          </div>
        </div>
        <div className="card bg-white p-4 rounded-lg shadow flex-grow">
          <h3 className="font-bold mb-3">Editor de JSON</h3>
          <textarea
            value={jsonText}
            onChange={handleJsonChange}
            className="textarea textarea-bordered w-full h-64 font-mono text-sm"
            spellCheck="false"
          />
        </div>
        <button
          onClick={downloadJson}
          className="btn btn-primary w-full"
        >
          Descargar JSON Actualizado
        </button>
      </div>
      {/* Panel derecho - Canvas */}
      <div className="w-full lg:w-2/3">
        <div className="mb-2 flex items-center gap-2">
          <label htmlFor="circle-size-slider" className="text-xs text-gray-700">Tamaño de puntos</label>
          <input
            id="circle-size-slider"
            type="range"
            min={0.5}
            max={3}
            step={0.05}
            value={circleScale}
            onChange={e => setCircleScale(Number(e.target.value))}
            style={{ width: 120 }}
          />
          <span className="text-xs text-gray-500">{circleScale.toFixed(2)}x</span>
        </div>
        <div className="border rounded-lg overflow-hidden bg-gray-100 h-full">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{ width: '100%', height: 'auto', minHeight: 500, cursor: 'pointer', display: image ? 'block' : 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {!image && (
            <div className="flex items-center justify-center h-[500px] text-gray-400">
              Sube una imagen para comenzar
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageCoordinateEditor;
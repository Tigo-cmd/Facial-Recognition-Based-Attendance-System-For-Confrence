import { useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

export const useFaceAPI = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        
        setIsLoaded(true);
      } catch (err) {
        setError('Failed to load face detection models');
        console.error('Error loading face-api models:', err);
      }
    };

    loadModels();
  }, []);

  return { isLoaded, error };
};
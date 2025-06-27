import React, { useState } from 'react';
import { User } from '../types';
import { FaceService } from '../services/faceService';
import { useCamera } from '../hooks/useCamera';
import { UserPlus, Camera, Check, X } from 'lucide-react';

interface RegistrationFormProps {
  onRegister: (user: User) => void;
  existingUsers: User[];
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister, existingUsers }) => {
  const [name, setName] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { videoRef, isActive, error, startCamera, stopCamera } = useCamera();

  const handleRegisterFace = async () => {
    if (!name.trim() || !uniqueId.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    // Check if unique ID already exists
    if (existingUsers.some(user => user.uniqueId === uniqueId)) {
      setMessage({ type: 'error', text: 'Unique ID already exists' });
      return;
    }

    setIsCapturing(true);
    setMessage(null);
    
    try {
      await startCamera();
      
      // Wait for video to be ready
      if (videoRef.current) {
        await new Promise(resolve => {
          videoRef.current!.onloadedmetadata = resolve;
        });
        
        // Give user time to position their face
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const faceDescriptor = await FaceService.extractFaceDescriptor(videoRef.current);
        
        if (!faceDescriptor) {
          throw new Error('No face detected. Please ensure your face is clearly visible.');
        }

        const newUser: User = {
          id: Date.now().toString(),
          name: name.trim(),
          uniqueId: uniqueId.trim(),
          faceDescriptor,
          registeredAt: new Date()
        };

        onRegister(newUser);
        setMessage({ type: 'success', text: `Face registered for ${name}!` });
        setName('');
        setUniqueId('');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Registration failed' });
    } finally {
      stopCamera();
      setIsCapturing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Register New User</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter full name"
            disabled={isCapturing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unique ID
          </label>
          <input
            type="text"
            value={uniqueId}
            onChange={(e) => setUniqueId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter unique ID (e.g., employee ID)"
            disabled={isCapturing}
          />
        </div>

        <button
          onClick={handleRegisterFace}
          disabled={isCapturing || !name.trim() || !uniqueId.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Camera className="w-5 h-5" />
          {isCapturing ? 'Capturing Face...' : 'Register Face'}
        </button>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
            <X className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}
      </div>

      {isActive && (
        <div className="mt-4">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-64 bg-black rounded-lg object-cover"
          />
          <p className="text-sm text-gray-600 mt-2 text-center">
            Position your face in the camera and wait for capture...
          </p>
        </div>
      )}
    </div>
  );
};
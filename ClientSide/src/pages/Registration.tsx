// Registration.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConference } from '../context/ConferenceContext';
import { useCamera } from '../hooks/useCamera';
import { Attendee } from '../types';
import * as faceapi from 'face-api.js';
import { Camera, Check, X, ArrowRight, Loader } from 'lucide-react';

export const Registration: React.FC = () => {
  const navigate = useNavigate();
  const { attendees, addAttendee } = useConference();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', organization: '', jobTitle: '' });
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStep, setCaptureStep] = useState<'idle' | 'starting' | 'positioning' | 'capturing' | 'processing'>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { videoRef, isActive, error, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Load face-api models on component mount
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isFormValid = () =>
    Object.values(formData).every(v => v.trim() !== '') &&
    modelsLoaded;

  const getCaptureStepMessage = () => {
    switch (captureStep) {
      case 'starting': return 'Starting camera...';
      case 'positioning': return 'Position your face in different angles...';
      case 'capturing': return 'Capturing multiple frames...';
      case 'processing': return 'Processing and averaging descriptors...';
      default: return '';
    }
  };

  // Monitor video readiness
  useEffect(() => {
    if (!isActive) {
      setVideoReady(false);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    const checkReady = () => {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoReady(true);
      }
    };
    video.addEventListener('loadeddata', checkReady);
    video.addEventListener('canplay', checkReady);
    checkReady();
    return () => {
      video.removeEventListener('loadeddata', checkReady);
      video.removeEventListener('canplay', checkReady);
    };
  }, [isActive]);

  // Draw overlay
  useEffect(() => {
    if (!isActive || !videoReady || !modelsLoaded) return;
    let animationId: number;
    const drawLoop = async () => {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();
      const resized = faceapi.resizeResults(detections, {
        width: video.videoWidth,
        height: video.videoHeight
      });
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceLandmarks(canvas, resized);
      animationId = requestAnimationFrame(drawLoop);
    };
    drawLoop();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, videoReady, modelsLoaded]);

  // Enhanced registration handler
  const handleRegister = async () => {
    if (!isFormValid()) {
      return setMessage({ type: 'error', text: 'Fill all fields & wait models to load.' });
    }
    if (attendees.some(a => a.email === formData.email.trim())) {
      return setMessage({ type: 'error', text: 'Email already registered.' });
    }

    setIsCapturing(true);
    setCaptureStep('starting');
    setMessage(null);

    try {
      await startCamera();

      // Positioning
      setCaptureStep('positioning');
      await new Promise(res => setTimeout(res, 5000));

      // Capturing multiple frames
      setCaptureStep('capturing');
      const samples: number[][] = [];
      for (let i = 0; i < 3; i++) {
        const video = videoRef.current!;
        const det = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (det) {
          samples.push(Array.from(det.descriptor));
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      if (!samples.length) {
        throw new Error('No face detected during registration.');
      }

      // Processing & averaging
      setCaptureStep('processing');
      const len = samples[0].length;
      const averaged = Array<number>(len).fill(0);
      samples.forEach(arr => {
        arr.forEach((v, idx) => averaged[idx] += v);
      });
      averaged.forEach((sum, idx) => averaged[idx] = sum / samples.length);

      const newAttendee: Attendee = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        organization: formData.organization.trim(),
        jobTitle: formData.jobTitle.trim(),
        faceDescriptor: averaged,
        registeredAt: new Date()
      };
      await addAttendee(newAttendee);

      setMessage({ type: 'success', text: `Registration successful for ${newAttendee.name}!` });
      setFormData({ name: '', email: '', phone: '', organization: '', jobTitle: '' });
      setTimeout(() => navigate('/attendance'), 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      stopCamera();
      setIsCapturing(false);
      setCaptureStep('idle');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Conference Registration
        </h2>
        <p className="text-lg text-gray-600">
          Register for the conference with your details and facial recognition
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">
              Personal Information
            </h3>
          </div>
          <div className="space-y-4">
            {['name', 'email', 'phone', 'organization', 'jobTitle'].map(
              field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {{
                      name: 'Full Name *',
                      email: 'Email Address *',
                      phone: 'Phone Number *',
                      organization: 'Organization *',
                      jobTitle: 'Job Title *'
                    }[field as keyof typeof formData]}
                  </label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    name={field}
                    value={(formData as any)[field]}
                    onChange={handleInputChange}
                    disabled={isCapturing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder={`Enter your ${field}`}
                  />
                </div>
              )
            )}
          </div>
        </div>

        {/* Face Capture */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">
              Face Registration
            </h3>
          </div>
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={
                isActive
                  ? 'w-full h-80 bg-black rounded-lg object-cover'
                  : 'w-0 h-0 invisible'
              }
            />
            {isActive && (
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: videoRef.current?.clientWidth,
                  height: videoRef.current?.clientHeight
                }}
                className="rounded-lg pointer-events-none"
              />
            )}
          </div>

          {!isActive ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                {isCapturing ? (
                  <Loader className="w-12 h-12 text-blue-600 animate-spin" />
                ) : (
                  <Camera className="w-12 h-12 text-blue-600" />
                )}
              </div>
              <p className="text-gray-600 mb-6">
                {isCapturing
                  ? getCaptureStepMessage()
                  : 'Complete the form and capture your face for registration'}
              </p>
              <button
                onClick={handleRegister}
                disabled={!isFormValid() || isCapturing}
                className={`bg-gradient-to-r ${
                  !isFormValid() || isCapturing
                    ? 'from-gray-400 to-gray-400 cursor-not-allowed'
                    : 'from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                } text-white px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105`}
              >
                {isCapturing
                  ? getCaptureStepMessage()
                  : 'Register & Capture Face'}
              </button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="relative">
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  {getCaptureStepMessage()}
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                {getCaptureStepMessage()}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg mt-4">
              <X className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {message && (
            <div
              className={`flex items-center gap-2 p-4 rounded-lg mt-4 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
              {message.type === 'success' && (
                <ArrowRight className="w-4 h-4 ml-auto" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 mb-4">Already registered?</p>
        <button
          onClick={() => navigate('/attendance')}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          Go to Attendance
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

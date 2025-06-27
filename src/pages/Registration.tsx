// Registration.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConference } from '../context/ConferenceContext';
import { FaceService } from '../services/faceService';
import { useCamera } from '../hooks/useCamera';
import { Attendee } from '../types';
import { UserPlus, Camera, Check, X, ArrowRight, Loader } from 'lucide-react';

export const Registration: React.FC = () => {
  const navigate = useNavigate();
  const { attendees, addAttendee } = useConference();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    jobTitle: ''
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStep, setCaptureStep] = useState<'idle' | 'starting' | 'positioning' | 'capturing' | 'processing'>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // useCamera provides videoRef, isActive, error, startCamera, stopCamera
  const { videoRef, isActive, error, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const isFormValid = () => {
    return Object.values(formData).every(value => value.trim() !== '');
  };

  const getCaptureStepMessage = () => {
    switch (captureStep) {
      case 'starting':
        return 'Starting camera...';
      case 'positioning':
        return 'Position your face in the camera frame...';
      case 'capturing':
        return 'Capturing your face...';
      case 'processing':
        return 'Processing face data...';
      default:
        return '';
    }
  };

  // Helper: wait for video to be ready (readyState>=2 and dimensions>0), up to timeout ms
  const waitForVideoReady = (timeout = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) {
        reject(new Error('No video element'));
        return;
      }
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        resolve();
        return;
      }
      let settled = false;
      const onReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          cleanup();
          settled = true;
          resolve();
        }
      };
      const cleanup = () => {
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
      };
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('canplay', onReady);
      const timer = setTimeout(() => {
        if (!settled) {
          cleanup();
          reject(new Error('Camera did not start in time.'));
        }
      }, timeout);
    });
  };

  // When camera becomes active, watch for readyState to set videoReady
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
    // Also check immediately
    checkReady();
    return () => {
      video.removeEventListener('loadeddata', checkReady);
      video.removeEventListener('canplay', checkReady);
    };
  }, [isActive]);

  // Live overlay drawing when active & ready
  useEffect(() => {
    if (!isActive || !videoReady) {
      // clear canvas if present
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    let animationId: number;
    const drawLoop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && videoReady) {
        // Ensure canvas matches video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const detection = await FaceService.detectFace(video);
        FaceService.drawDetection(canvas, video, detection);
      }
      animationId = requestAnimationFrame(drawLoop);
    };
    drawLoop();
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, videoReady]);

  const handleRegister = async () => {
    if (!isFormValid()) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }
    if (attendees.some(a => a.email === formData.email.trim())) {
      setMessage({ type: 'error', text: 'Email already registered' });
      return;
    }

    setIsCapturing(true);
    setCaptureStep('starting');
    setMessage(null);

    try {
      // Start camera via useCamera
      await startCamera();

      // Wait until videoRef is ready
      await waitForVideoReady(5000);
      // small delay to ensure first frame painted
      await new Promise(res => setTimeout(res, 200));

      setCaptureStep('positioning');
      // Allow user to position; 3s
      await new Promise(res => setTimeout(res, 3000));

      setCaptureStep('capturing');
      // brief pause before capture
      await new Promise(res => setTimeout(res, 1000));

      setCaptureStep('processing');
      const video = videoRef.current;
      if (!video) throw new Error('Camera not ready. Please try again.');

      // Extract descriptor (FaceService.wait internally ensures ready)
      const faceDescriptor = await FaceService.extractFaceDescriptor(video);
      // Create new attendee
      const newAttendee: Attendee = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        organization: formData.organization.trim(),
        jobTitle: formData.jobTitle.trim(),
        faceDescriptor,
        registeredAt: new Date()
      };
      addAttendee(newAttendee);
      setMessage({ type: 'success', text: `Registration successful for ${formData.name.trim()}!` });

      // Reset form data
      setFormData({
        name: '',
        email: '',
        phone: '',
        organization: '',
        jobTitle: ''
      });

      // After short delay, navigate
      setTimeout(() => {
        navigate('/attendance');
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Registration failed' });
    } finally {
      // Stop camera and reset states
      stopCamera();
      setIsCapturing(false);
      setCaptureStep('idle');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Conference Registration</h2>
        <p className="text-lg text-gray-600">
          Register for the conference with your details and facial recognition
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">Personal Information</h3>
          </div>
          <div className="space-y-4">
            {['name', 'email', 'phone', 'organization', 'jobTitle'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(() => {
                    switch (field) {
                      case 'name': return 'Full Name *';
                      case 'email': return 'Email Address *';
                      case 'phone': return 'Phone Number *';
                      case 'organization': return 'Organization *';
                      case 'jobTitle': return 'Job Title *';
                      default: return field;
                    }
                  })()}
                </label>
                <input
                  type={field === 'email' ? 'email' : 'text'}
                  name={field}
                  value={(formData as any)[field]}
                  onChange={handleInputChange}
                  disabled={isCapturing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder={`Enter your ${field === 'jobTitle' ? 'job title' : field}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Face Capture */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">Face Registration</h3>
          </div>

          {/* Single video element: hidden when inactive, shown when active */}
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={isActive ? 'w-full h-80 bg-black rounded-lg object-cover' : 'w-0 h-0 invisible'}
            />
            {/* Canvas overlay */}
            {isActive && (
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: videoRef.current ? videoRef.current.clientWidth : undefined,
                  height: videoRef.current ? videoRef.current.clientHeight : undefined
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
                {isCapturing ? getCaptureStepMessage() : 'Complete the form and capture your face for registration'}
              </p>
              <button
                onClick={handleRegister}
                disabled={!isFormValid() || isCapturing}
                className={`bg-gradient-to-r ${
                  (!isFormValid() || isCapturing)
                    ? 'from-gray-400 to-gray-400 cursor-not-allowed'
                    : 'from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                } text-white px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105`}
              >
                {isCapturing ? getCaptureStepMessage() : 'Register & Capture Face'}
              </button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="relative">
                {/* Video shown above */}
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  {getCaptureStepMessage() || 'Recording'}
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                {getCaptureStepMessage() || 'Position your face in the camera and wait for automatic capture...'}
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
            <div className={`flex items-center gap-2 p-4 rounded-lg mt-4 ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
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

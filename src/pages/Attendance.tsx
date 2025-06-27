import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConference } from '../context/ConferenceContext';
import { FaceService } from '../services/faceService';
import { useCamera } from '../hooks/useCamera';
import { AttendanceRecord, RecognitionResult } from '../types';
import { Camera, CheckCircle, XCircle, Clock, Users, UserPlus, ArrowLeft } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001';

export const Attendance: React.FC = () => {
  const navigate = useNavigate();
  const { attendees, markAttendance, getTodayAttendance } = useConference();
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const { videoRef, isActive, error, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRecognitionRef = useRef<string | null>(null);

  useEffect(() => {
    const todayAttendance = getTodayAttendance();
    setRecentAttendance(todayAttendance.slice(-10).reverse());
  }, [getTodayAttendance]);

  const waitForVideoReady = () =>
    new Promise<void>((resolve, reject) => {
      const video = videoRef.current;
      if (!video) return reject(new Error('No video element'));
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        return resolve();
      }
      const onReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('canplay', onReady);
          resolve();
        }
      };
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('canplay', onReady);
      setTimeout(() => {
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        reject(new Error('Camera did not start in time.'));
      }, 5000);
    });

  const startAttendance = async () => {
    if (attendees.length === 0) {
      navigate('/register');
      return;
    }
    setIsRecognizing(true);
    setLastResult(null);
    await startCamera();
    try {
      await waitForVideoReady();
      recognitionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && canvasRef.current) {
          try {
            const result = await FaceService.recognizeFace(videoRef.current, attendees);
            setLastResult(result);
            const detection = await FaceService.detectFace(videoRef.current);
            if (detection) {
              FaceService.drawDetection(canvasRef.current, videoRef.current, detection);
            }
            if (result.isMatch && result.attendee) {
              const attendeeId = result.attendee.id;
              const now = Date.now();
              if (!lastRecognitionRef.current || !lastRecognitionRef.current.startsWith(attendeeId) || (lastRecognitionRef.current.startsWith(attendeeId) && now - parseInt(lastRecognitionRef.current.split('_')[1] || '0') > 5000)) {
                const today = new Date().toDateString();
                const hasAttendanceToday = getTodayAttendance().some(record => record.attendeeId === attendeeId && new Date(record.timestamp).toDateString() === today);
                if (!hasAttendanceToday) {
                  const attendanceRecord: AttendanceRecord = {
                    id: Date.now().toString(),
                    attendeeId: result.attendee.id,
                    attendeeName: result.attendee.name,
                    timestamp: new Date(),
                    confidence: result.confidence,
                    sessionType: 'check-in'
                  };
                  markAttendance(attendanceRecord);
                  setRecentAttendance(prev => [attendanceRecord, ...prev.slice(0, 9)]);
                  fetch(`${BACKEND_URL}/api/attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: attendanceRecord.id,
                      attendeeId: attendanceRecord.attendeeId,
                      attendeeName: attendanceRecord.attendeeName,
                      timestamp: attendanceRecord.timestamp.toISOString()
                    })
                  }).catch(err => console.error('Failed to send attendance to backend:', err));
                }
                lastRecognitionRef.current = `${attendeeId}_${now}`;
              }
            }
          } catch (err) {
            console.error('Recognition error:', err);
          }
        }
      }, 1500);
    } catch (err) {
      console.error('Camera initialization error:', err);
      stopAttendance();
    }
  };

  const stopAttendance = () => {
    setIsRecognizing(false);
    stopCamera();
    setLastResult(null);
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const handleUnknownUser = () => navigate('/register');
  const todayAttendance = getTodayAttendance();

  return (
    <div className="max-w-6xl mx-auto">
      <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none' }} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Registered</p>
              <p className="text-2xl font-bold text-gray-900">{attendees.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Today's Attendance</p>
              <p className="text-2xl font-bold text-gray-900">{todayAttendance.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{attendees.length > 0 ? Math.round((todayAttendance.length / attendees.length) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Camera className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Conference Attendance</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{attendees.length} registered</span>
            </div>
          </div>
          {!isRecognizing ? (
            <div className="text-center py-16">
              <div className="w-32 h-32 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera className="w-16 h-16 text-blue-600" />
              </div>
              {attendees.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-red-600 font-medium">No attendees registered yet</p>
                  <button onClick={() => navigate('/register')} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                    <UserPlus className="w-5 h-5" />
                    Register First
                  </button>
                </div>
              ) : (
                <button onClick={startAttendance} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 text-lg font-medium">Start Attendance</button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <video ref={videoRef} autoPlay muted className="w-full h-80 bg-black rounded-lg object-cover" />
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ transform: 'scaleX(-1)' }} />
                <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Recognition Active
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Looking for registered faces...</p>
                <button onClick={stopAttendance} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">Stop Recognition</button>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg mt-4">
              <XCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
        <div className="space-y-6">
          {lastResult && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recognition Result</h3>
              {lastResult.isMatch && lastResult.attendee ? (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-8 h-8 text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-800 text-lg">Welcome, {lastResult.attendee.name}!</p>
                      <p className="text-sm text-green-700 mt-1">{lastResult.attendee.organization} • {lastResult.attendee.jobTitle}</p>
                      <p className="text-sm text-green-600 mt-2">Confidence: {(lastResult.confidence * 100).toFixed(1)}% • {formatTime(new Date())}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-8 h-8 text-red-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-800 text-lg">Face Not Recognized</p>
                      <p className="text-sm text-red-700 mt-1">Please register first to attend the conference</p>
                      <button onClick={handleUnknownUser} className="mt-3 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
                        <UserPlus className="w-4 h-4" />
                        Register Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Recent Attendance</h3>
            </div>
            {recentAttendance.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No attendance records yet today</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentAttendance.map(record => (
                  <div key={record.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{record.attendeeName}</p>
                        <p className="text-sm text-gray-600">{formatDate(record.timestamp)} at {formatTime(record.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Present</span>
                      <p className="text-xs text-gray-500 mt-1">{(record.confidence * 100).toFixed(1)}% match</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-center gap-4">
        <button onClick={() => navigate('/register')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to Registration
        </button>
        <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium">
          View Dashboard
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
      </div>
    </div>
  );
};

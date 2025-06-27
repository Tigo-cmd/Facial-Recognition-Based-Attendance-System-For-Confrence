import React, { useState, useEffect, useRef } from 'react';
import { User, AttendanceRecord, RecognitionResult } from '../types';
import { FaceService } from '../services/faceService';
import { useCamera } from '../hooks/useCamera';
import { Camera, CheckCircle, XCircle, Clock, Users } from 'lucide-react';

interface RecognitionPanelProps {
  users: User[];
  onAttendanceMarked: (record: AttendanceRecord) => void;
  attendanceRecords: AttendanceRecord[];
}

export const RecognitionPanel: React.FC<RecognitionPanelProps> = ({
  users,
  onAttendanceMarked,
  attendanceRecords
}) => {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const { videoRef, isActive, error, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Show recent attendance records (last 10)
    setRecentAttendance(attendanceRecords.slice(-10).reverse());
  }, [attendanceRecords]);

  const startRecognition = async () => {
    if (users.length === 0) {
      alert('No registered users found. Please register users first.');
      return;
    }

    setIsRecognizing(true);
    await startCamera();
    
    // Start continuous recognition
    recognitionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current) {
        try {
          const result = await FaceService.recognizeFace(videoRef.current, users);
          setLastResult(result);

          // Draw detection overlay
          const detection = await FaceService.detectFace(videoRef.current);
          if (detection) {
            FaceService.drawDetection(canvasRef.current, videoRef.current, detection);
          }

          // Mark attendance if user is recognized
          if (result.isMatch && result.user) {
            const userId = result.user.id;
            const today = new Date().toDateString();
            
            // Check if user already marked attendance today
            const hasAttendanceToday = attendanceRecords.some(
              record => record.userId === userId && 
              new Date(record.timestamp).toDateString() === today
            );

            if (!hasAttendanceToday) {
              const attendanceRecord: AttendanceRecord = {
                id: Date.now().toString(),
                userId: result.user.id,
                userName: result.user.name,
                timestamp: new Date(),
                confidence: result.confidence
              };
              onAttendanceMarked(attendanceRecord);
            }
          }
        } catch (err) {
          console.error('Recognition error:', err);
        }
      }
    }, 1000); // Check every second
  };

  const stopRecognition = () => {
    setIsRecognizing(false);
    stopCamera();
    setLastResult(null);
    
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Camera Feed */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Face Recognition</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{users.length} registered</span>
          </div>
        </div>

        {!isActive ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-6">Start the camera to begin face recognition</p>
            <button
              onClick={startRecognition}
              disabled={users.length === 0}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Start Recognition
            </button>
            {users.length === 0 && (
              <p className="text-sm text-red-600 mt-2">Register users first to enable recognition</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-80 bg-black rounded-lg object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Recognition Active</span>
              </div>
              <button
                onClick={stopRecognition}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop Recognition
              </button>
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

      {/* Recognition Results */}
      {lastResult && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recognition Result</h3>
          
          {lastResult.isMatch && lastResult.user ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  ✅ Recognized: {lastResult.user.name}
                </p>
                <p className="text-sm text-green-600">
                  ID: {lastResult.user.uniqueId} • Confidence: {(lastResult.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-green-600">
                  Time: {formatTime(new Date())}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="font-medium text-red-800">
                  ❌ Unknown user detected
                </p>
                <p className="text-sm text-red-600">
                  Please register first or try again
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Attendance */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Recent Attendance</h3>
        </div>

        {recentAttendance.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No attendance records yet
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentAttendance.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{record.userName}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(record.timestamp)} at {formatTime(record.timestamp)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Present
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {(record.confidence * 100).toFixed(1)}% match
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
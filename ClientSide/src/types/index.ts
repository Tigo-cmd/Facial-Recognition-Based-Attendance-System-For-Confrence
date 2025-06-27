export interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  faceDescriptor: Float32Array;
  registeredAt: Date;
}

export interface AttendanceRecord {
  id: string;
  attendeeId: string;
  attendeeName: string;
  timestamp: Date;
  confidence: number;
  sessionType: 'check-in' | 'session' | 'break' | 'check-out';
}

export interface RecognitionResult {
  attendee?: Attendee;
  confidence: number;
  isMatch: boolean;
}

export interface ConferenceSession {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Attendee, AttendanceRecord, ConferenceSession } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ConferenceContextType {
  attendees: Attendee[];
  attendanceRecords: AttendanceRecord[];
  currentSession: ConferenceSession | null;
  addAttendee: (attendee: Attendee) => void;
  markAttendance: (record: AttendanceRecord) => void;
  setCurrentSession: (session: ConferenceSession | null) => void;
  getTodayAttendance: () => AttendanceRecord[];
  getAttendeeById: (id: string) => Attendee | undefined;
}

const ConferenceContext = createContext<ConferenceContextType | undefined>(undefined);

export const useConference = () => {
  const context = useContext(ConferenceContext);
  if (!context) {
    throw new Error('useConference must be used within a ConferenceProvider');
  }
  return context;
};

export const ConferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [attendees, setAttendees] = useLocalStorage<Attendee[]>('conference_attendees', []);
  const [attendanceRecords, setAttendanceRecords] = useLocalStorage<AttendanceRecord[]>('conference_attendance', []);
  const [currentSession, setCurrentSession] = useState<ConferenceSession | null>({
    id: 'main-conference',
    name: 'Main Conference',
    startTime: '09:00',
    endTime: '17:00',
    isActive: true
  });

  // Convert stored dates back to Date objects
  useEffect(() => {
    setAttendees(prevAttendees => prevAttendees.map(attendee => ({
      ...attendee,
      registeredAt: new Date(attendee.registeredAt),
      faceDescriptor: new Float32Array(attendee.faceDescriptor)
    })));
    
    setAttendanceRecords(prevRecords => prevRecords.map(record => ({
      ...record,
      timestamp: new Date(record.timestamp)
    })));
  }, []);

  const addAttendee = (attendee: Attendee) => {
    setAttendees(prev => [...prev, attendee]);
  };

  const markAttendance = (record: AttendanceRecord) => {
    setAttendanceRecords(prev => [...prev, record]);
  };

  const getTodayAttendance = () => {
    const today = new Date().toDateString();
    return attendanceRecords.filter(
      record => new Date(record.timestamp).toDateString() === today
    );
  };

  const getAttendeeById = (id: string) => {
    return attendees.find(attendee => attendee.id === id);
  };

  return (
    <ConferenceContext.Provider value={{
      attendees,
      attendanceRecords,
      currentSession,
      addAttendee,
      markAttendance,
      setCurrentSession,
      getTodayAttendance,
      getAttendeeById
    }}>
      {children}
    </ConferenceContext.Provider>
  );
};
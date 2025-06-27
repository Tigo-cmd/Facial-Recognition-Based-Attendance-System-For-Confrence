import React from 'react';
import { useConference } from '../context/ConferenceContext';
import { BarChart3, Users, Clock, TrendingUp, Calendar, MapPin } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { attendees, getTodayAttendance } = useConference();
  const todayAttendance = getTodayAttendance();

  const getAttendanceByHour = () => {
    const hourlyData: { [key: number]: number } = {};
    
    todayAttendance.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });

    return Object.entries(hourlyData).map(([hour, count]) => ({
      hour: parseInt(hour),
      count,
      time: `${hour.padStart(2, '0')}:00`
    }));
  };

  const getTopOrganizations = () => {
    const orgCount: { [key: string]: number } = {};
    
    attendees.forEach(attendee => {
      orgCount[attendee.organization] = (orgCount[attendee.organization] || 0) + 1;
    });

    return Object.entries(orgCount)
      .map(([org, count]) => ({ organization: org, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const hourlyData = getAttendanceByHour();
  const topOrganizations = getTopOrganizations();
  const attendanceRate = attendees.length > 0 ? (todayAttendance.length / attendees.length) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Conference Dashboard</h2>
        <p className="text-lg text-gray-600">
          Real-time insights and analytics for your conference
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Present Today</p>
              <p className="text-2xl font-bold text-gray-900">{todayAttendance.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Organizations</p>
              <p className="text-2xl font-bold text-gray-900">{topOrganizations.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hourly Attendance Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">Hourly Attendance</h3>
          </div>

          {hourlyData.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No attendance data for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hourlyData.map((data) => (
                <div key={data.hour} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-12">
                    {data.time}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(data.count / Math.max(...hourlyData.map(d => d.count))) * 100}%` }}
                    >
                      <span className="text-white text-xs font-medium">
                        {data.count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Organizations */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-800">Top Organizations</h3>
          </div>

          {topOrganizations.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No organizations registered yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topOrganizations.map((org, index) => (
                <div key={org.organization} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-purple-600">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{org.organization}</p>
                    <p className="text-sm text-gray-600">{org.count} attendees</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">{org.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Registrations */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-semibold text-gray-800">Recent Registrations</h3>
        </div>

        {attendees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No registrations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Organization</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Job Title</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Registered</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendees.slice(-10).reverse().map((attendee) => {
                  const hasAttended = todayAttendance.some(record => record.attendeeId === attendee.id);
                  return (
                    <tr key={attendee.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{attendee.name}</p>
                          <p className="text-sm text-gray-600">{attendee.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{attendee.organization}</td>
                      <td className="py-3 px-4 text-gray-700">{attendee.jobTitle}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(attendee.registeredAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          hasAttended 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {hasAttended ? 'Present' : 'Registered'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
import React from 'react';
import { User } from '../types';
import { Users, Trash2, Calendar } from 'lucide-react';

interface UsersListProps {
  users: User[];
  onDeleteUser: (userId: string) => void;
}

export const UsersList: React.FC<UsersListProps> = ({ users, onDeleteUser }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">
          Registered Users ({users.length})
        </h2>
      </div>

      {users.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No users registered yet. Add your first user above.
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-600">ID: {user.uniqueId}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>Registered {formatDate(user.registeredAt)}</span>
                </div>
              </div>
              <button
                onClick={() => onDeleteUser(user.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete user"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
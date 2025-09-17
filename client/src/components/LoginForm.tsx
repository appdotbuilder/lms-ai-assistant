import { useState } from 'react';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { User } from '../../../server/src/schema';

interface LoginFormProps {
  users: User[];
  onLogin: (user: User) => void;
}

export function LoginForm({ users, onLogin }: LoginFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUserId) {
      setError('Please select a user to continue');
      return;
    }

    const user = users.find((u: User) => u.id.toString() === selectedUserId);
    if (user) {
      onLogin(user);
    } else {
      setError('User not found');
    }
  };

  const getUsersByRole = (role: string) => {
    return users.filter((user: User) => user.role === role);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user-select">Select User (Demo Mode)</Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a user to demo..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem disabled value="placeholder">Choose a user...</SelectItem>
            
            {getUsersByRole('administrator').length > 0 && (
              <>
                <SelectItem disabled value="admin-header" className="font-semibold text-red-600">
                  👑 Administrators
                </SelectItem>
                {getUsersByRole('administrator').map((user: User) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.first_name} {user.last_name} ({user.email})
                  </SelectItem>
                ))}
              </>
            )}

            {getUsersByRole('teacher').length > 0 && (
              <>
                <SelectItem disabled value="teacher-header" className="font-semibold text-blue-600">
                  👨‍🏫 Teachers
                </SelectItem>
                {getUsersByRole('teacher').map((user: User) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.first_name} {user.last_name} ({user.email})
                  </SelectItem>
                ))}
              </>
            )}

            {getUsersByRole('student').length > 0 && (
              <>
                <SelectItem disabled value="student-header" className="font-semibold text-green-600">
                  🎓 Students
                </SelectItem>
                {getUsersByRole('student').map((user: User) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.first_name} {user.last_name} ({user.email})
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={!selectedUserId}>
        Sign In
      </Button>

      <div className="text-center text-sm text-gray-500">
        <p>Demo Mode: No password required</p>
        <p className="mt-1">Select any user to explore their role features</p>
      </div>
    </form>
  );
}
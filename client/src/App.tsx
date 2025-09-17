import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, GraduationCap, UserCheck, Brain } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Course } from '../../server/src/schema';

// Import components
import { LoginForm } from '@/components/LoginForm';
import { StudentDashboard } from '@/components/StudentDashboard';
import { TeacherDashboard } from '@/components/TeacherDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { CourseView } from '@/components/CourseView';
import { DataSeeder } from '@/components/DataSeeder';
import { FeatureShowcase } from '@/components/FeatureShowcase';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersData, coursesData] = await Promise.all([
        trpc.getUsers.query(),
        trpc.getCourses.query()
      ]);
      setUsers(usersData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedCourse(null);
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
  };

  const handleBackToDashboard = () => {
    setSelectedCourse(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading EduFlow...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <BookOpen className="h-12 w-12 text-blue-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-900">EduFlow</h1>
            </div>
            <p className="text-xl text-gray-600">Your Intelligent Learning Management System</p>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center">
                <GraduationCap className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm text-gray-600">Interactive Learning</span>
              </div>
              <div className="flex items-center">
                <Brain className="h-5 w-5 text-purple-500 mr-2" />
                <span className="text-sm text-gray-600">AI Assistant</span>
              </div>
              <div className="flex items-center">
                <UserCheck className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">Progress Tracking</span>
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <DataSeeder 
              users={users} 
              setUsers={setUsers} 
              courses={courses} 
              setCourses={setCourses} 
            />
            
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome Back</CardTitle>
                <CardDescription>Sign in to access your courses</CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm users={users} onLogin={handleLogin} />
              </CardContent>
            </Card>
          </div>
        </div>
        
        <FeatureShowcase />
      </div>
    );
  }

  if (selectedCourse) {
    return (
      <CourseView 
        course={selectedCourse} 
        currentUser={currentUser} 
        onBack={handleBackToDashboard}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">EduFlow</h1>
                <p className="text-sm text-gray-500">Learning Management System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {currentUser.first_name} {currentUser.last_name}
                </p>
                <Badge variant={
                  currentUser.role === 'administrator' ? 'destructive' :
                  currentUser.role === 'teacher' ? 'default' : 'secondary'
                }>
                  {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                </Badge>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {currentUser.role === 'student' && (
          <StudentDashboard 
            currentUser={currentUser}
            courses={courses}
            onCourseSelect={handleCourseSelect}
          />
        )}
        
        {currentUser.role === 'teacher' && (
          <TeacherDashboard 
            currentUser={currentUser}
            courses={courses}
            setCourses={setCourses}
            onCourseSelect={handleCourseSelect}
          />
        )}
        
        {currentUser.role === 'administrator' && (
          <AdminDashboard 
            currentUser={currentUser}
            users={users}
            setUsers={setUsers}
            courses={courses}
            onCourseSelect={handleCourseSelect}
          />
        )}
      </main>
    </div>
  );
}

export default App;
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Clock, Brain, MessageSquare, TrendingUp } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Course, StudentProgress, CourseEnrollment, AiInteraction } from '../../../server/src/schema';

interface StudentDashboardProps {
  currentUser: User;
  courses: Course[];
  onCourseSelect: (course: Course) => void;
}

export function StudentDashboard({ currentUser, courses, onCourseSelect }: StudentDashboardProps) {
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [aiInteractions, setAiInteractions] = useState<AiInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStudentData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [enrollmentsData, progressData, aiData] = await Promise.all([
        trpc.getStudentEnrollments.query(currentUser.id),
        trpc.getStudentProgress.query({ studentId: currentUser.id }),
        trpc.getAiInteractions.query({ studentId: currentUser.id })
      ]);

      // Get enrolled courses
      const enrolledCourseIds = enrollmentsData.map((enrollment: CourseEnrollment) => enrollment.course_id);
      const enrolled = courses.filter((course: Course) => enrolledCourseIds.includes(course.id));
      setEnrolledCourses(enrolled);
      
      setProgress(progressData);
      setAiInteractions(aiData);
    } catch (error) {
      console.error('Failed to load student data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, courses]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  const getProgressForCourse = () => {
    // Calculate progress based on available data
    // Note: In a real implementation, this would join content with course data
    if (progress.length === 0) return 0;
    const completed = progress.filter((p: StudentProgress) => p.completed).length;
    return Math.round((completed / progress.length) * 100);
  };

  const getRecentAiInteractions = () => {
    return aiInteractions
      .sort((a: AiInteraction, b: AiInteraction) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {currentUser.first_name}! 🎓
          </h2>
          <p className="text-gray-600">Ready to continue your learning journey?</p>
        </div>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <span className="text-sm text-gray-600">AI Assistant Available</span>
        </div>
      </div>

      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            My Courses
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="ai-help" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">No Courses Yet</h3>
                  <p className="text-gray-600">You're not enrolled in any courses yet.</p>
                  <p className="text-sm text-gray-500 mt-2">Contact your teacher or administrator to get enrolled.</p>
                </CardContent>
              </Card>
            ) : (
              enrolledCourses.map((course: Course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="line-clamp-1">{course.title}</span>
                      <Badge variant="secondary">
                        {getProgressForCourse()}%
                      </Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Progress value={getProgressForCourse()} className="w-full" />
                      <Button 
                        onClick={() => onCourseSelect(course)}
                        className="w-full"
                      >
                        Continue Learning
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Overall Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {enrolledCourses.map((course: Course) => (
                  <div key={course.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{course.title}</span>
                      <span>{getProgressForCourse()}%</span>
                    </div>
                    <Progress value={getProgressForCourse()} />
                  </div>
                ))}
                {enrolledCourses.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No progress data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Study Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {progress.filter((p: StudentProgress) => p.completed).length}
                    </div>
                    <div className="text-sm text-blue-600">Completed</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(progress.reduce((sum: number, p: StudentProgress) => sum + p.time_spent_minutes, 0) / 60)}h
                    </div>
                    <div className="text-sm text-green-600">Total Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-help">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  AI Learning Assistant
                </CardTitle>
                <CardDescription>
                  Get instant help and practice quizzes from your AI tutor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-auto p-4 flex-col">
                    <MessageSquare className="h-6 w-6 mb-2 text-blue-500" />
                    <span>Ask Questions</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto p-4 flex-col">
                    <Brain className="h-6 w-6 mb-2 text-purple-500" />
                    <span>Practice Quiz</span>
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  💡 The AI assistant is available within each course to help you understand concepts and test your knowledge.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent AI Interactions</CardTitle>
              </CardHeader>
              <CardContent>
                {getRecentAiInteractions().length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No AI interactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {getRecentAiInteractions().map((interaction: AiInteraction) => (
                      <div key={interaction.id} className="border-l-4 border-purple-200 pl-3 py-2">
                        <p className="font-medium text-sm line-clamp-2">{interaction.question}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(interaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
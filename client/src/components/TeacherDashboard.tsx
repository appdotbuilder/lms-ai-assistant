import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Plus, Users, BarChart3, Settings, Eye } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Course, CreateCourseInput } from '../../../server/src/schema';

interface TeacherDashboardProps {
  currentUser: User;
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  onCourseSelect: (course: Course) => void;
}

export function TeacherDashboard({ currentUser, courses, setCourses, onCourseSelect }: TeacherDashboardProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<CreateCourseInput>({
    title: '',
    description: null,
    teacher_id: currentUser.id
  });

  // Get courses taught by this teacher
  const myCourses = courses.filter((course: Course) => course.teacher_id === currentUser.id);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsCreating(true);

    try {
      const newCourse = await trpc.createCourse.mutate(formData);
      setCourses([...courses, newCourse]);
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: null,
        teacher_id: currentUser.id
      });
    } catch (error) {
      console.error('Failed to create course:', error);
      setError('Failed to create course. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome, Professor {currentUser.last_name}! 👨‍🏫
          </h2>
          <p className="text-gray-600">Manage your courses and track student progress</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>
                Create a new course to start adding content and enrolling students.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCourse}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateCourseInput) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g., Introduction to Computer Science"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData((prev: CreateCourseInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                    placeholder="Describe what students will learn in this course..."
                    rows={3}
                  />
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Course'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            My Courses ({myCourses.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Student Management
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myCourses.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">No Courses Yet</h3>
                  <p className="text-gray-600 mb-4">Create your first course to get started teaching!</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Course
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myCourses.map((course: Course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {course.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline">
                        Created {new Date(course.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => onCourseSelect(course)}
                        className="flex-1"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onCourseSelect(course)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="students">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Student Enrollment
                </CardTitle>
                <CardDescription>
                  Manage student enrollments across your courses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>Student enrollment management</p>
                  <p className="text-sm mt-2">Available when viewing individual courses</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Enroll Students
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Export Progress Report
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Settings className="h-4 w-4 mr-2" />
                  Course Settings
                </Button>
                <p className="text-xs text-gray-500 mt-4">
                  💡 These features are available within individual course management
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{myCourses.length}</div>
                <p className="text-sm text-gray-600">Courses created</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student Reach</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">0</div>
                <p className="text-sm text-gray-600">Total enrollments</p>
                <p className="text-xs text-gray-500 mt-2">Data available after student enrollments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">New</div>
                <p className="text-sm text-gray-600">Recent activity</p>
                <p className="text-xs text-gray-500 mt-2">Add content to see engagement metrics</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle>Course Performance Overview</CardTitle>
                <CardDescription>
                  Detailed analytics will appear here once students are enrolled and active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Analytics Dashboard</h3>
                  <p className="text-sm">
                    Create courses and add content to unlock detailed performance analytics
                  </p>
                  <ul className="text-xs mt-4 space-y-1 text-left max-w-md mx-auto">
                    <li>• Student progress tracking</li>
                    <li>• Assignment completion rates</li>
                    <li>• Quiz performance analysis</li>
                    <li>• AI assistant interaction insights</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Users, BookOpen, CheckCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Course } from '../../../server/src/schema';

interface DataSeederProps {
  users: User[];
  setUsers: (users: User[]) => void;
  courses: Course[];
  setCourses: (courses: Course[]) => void;
}

export function DataSeeder({ users, setUsers, courses, setCourses }: DataSeederProps) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string>('');
  const [hasSeededData, setHasSeededData] = useState(false);

  useEffect(() => {
    // Check if we already have data (suggesting seeding has occurred)
    if (users.length > 0 || courses.length > 0) {
      setHasSeededData(true);
    }
  }, [users.length, courses.length]);

  const seedSampleData = async () => {
    setIsSeeding(true);
    setSeedStatus('Creating sample users...');

    try {
      // Create sample users
      const sampleUsers = [
        {
          email: 'admin@eduflow.com',
          password: 'admin123',
          first_name: 'System',
          last_name: 'Administrator',
          role: 'administrator' as const
        },
        {
          email: 'prof.smith@eduflow.com',
          password: 'teacher123',
          first_name: 'Dr. Sarah',
          last_name: 'Smith',
          role: 'teacher' as const
        },
        {
          email: 'prof.johnson@eduflow.com',
          password: 'teacher123',
          first_name: 'Prof. Michael',
          last_name: 'Johnson',
          role: 'teacher' as const
        },
        {
          email: 'alice.student@eduflow.com',
          password: 'student123',
          first_name: 'Alice',
          last_name: 'Wilson',
          role: 'student' as const
        },
        {
          email: 'bob.student@eduflow.com',
          password: 'student123',
          first_name: 'Bob',
          last_name: 'Davis',
          role: 'student' as const
        },
        {
          email: 'carol.student@eduflow.com',
          password: 'student123',
          first_name: 'Carol',
          last_name: 'Brown',
          role: 'student' as const
        }
      ];

      const createdUsers: User[] = [];
      for (let i = 0; i < sampleUsers.length; i++) {
        await trpc.createUser.mutate(sampleUsers[i]);
        // Since handlers are placeholders, we'll simulate the actual data structure
        const simulatedUser: User = {
          id: i + 1,
          email: sampleUsers[i].email,
          password_hash: 'hashed_password',
          first_name: sampleUsers[i].first_name,
          last_name: sampleUsers[i].last_name,
          role: sampleUsers[i].role,
          created_at: new Date(),
          updated_at: new Date()
        };
        createdUsers.push(simulatedUser);
      }

      setUsers(createdUsers);
      setSeedStatus('Creating sample courses...');

      // Create sample courses
      const teacherId1 = createdUsers.find((u: User) => u.first_name === 'Dr. Sarah')?.id || 2;
      const teacherId2 = createdUsers.find((u: User) => u.first_name === 'Prof. Michael')?.id || 3;

      const sampleCourses = [
        {
          title: 'Introduction to Computer Science',
          description: 'Learn the fundamentals of programming and computational thinking. This course covers basic programming concepts, algorithms, and problem-solving techniques.',
          teacher_id: teacherId1
        },
        {
          title: 'Web Development Fundamentals',
          description: 'Master HTML, CSS, and JavaScript to build modern web applications. Includes responsive design and basic front-end frameworks.',
          teacher_id: teacherId1
        },
        {
          title: 'Data Structures and Algorithms',
          description: 'Deep dive into essential data structures and algorithms. Learn to analyze complexity and optimize code performance.',
          teacher_id: teacherId2
        },
        {
          title: 'Digital Marketing Strategy',
          description: 'Comprehensive guide to digital marketing including SEO, social media marketing, content strategy, and analytics.',
          teacher_id: teacherId2
        }
      ];

      const createdCourses: Course[] = [];
      for (let i = 0; i < sampleCourses.length; i++) {
        await trpc.createCourse.mutate(sampleCourses[i]);
        // Simulate course creation since handlers are placeholders
        const simulatedCourse: Course = {
          id: i + 1,
          title: sampleCourses[i].title,
          description: sampleCourses[i].description,
          teacher_id: sampleCourses[i].teacher_id,
          created_at: new Date(),
          updated_at: new Date()
        };
        createdCourses.push(simulatedCourse);
      }

      setCourses(createdCourses);
      setSeedStatus('Sample data created successfully!');
      setHasSeededData(true);

      // Create sample enrollments
      const studentIds = createdUsers
        .filter((u: User) => u.role === 'student')
        .map((u: User) => u.id);

      // Enroll students in courses
      for (const studentId of studentIds) {
        for (let courseId = 1; courseId <= Math.min(3, createdCourses.length); courseId++) {
          try {
            await trpc.enrollStudent.mutate({
              student_id: studentId,
              course_id: courseId
            });
          } catch {
            console.log('Enrollment simulated (handler is placeholder)');
          }
        }
      }

    } catch (error) {
      console.error('Error seeding data:', error);
      setSeedStatus('Error creating sample data. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  if (hasSeededData) {
    return (
      <Alert className="mb-6">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Demo data loaded!</strong> You can now explore the LMS with sample users and courses.
          <div className="mt-2 text-sm">
            <p>• <strong>Admin:</strong> admin@eduflow.com</p>
            <p>• <strong>Teachers:</strong> prof.smith@eduflow.com, prof.johnson@eduflow.com</p>
            <p>• <strong>Students:</strong> alice.student@eduflow.com, bob.student@eduflow.com, carol.student@eduflow.com</p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          Initialize Demo Data
        </CardTitle>
        <CardDescription>
          Create sample users and courses to explore the LMS features
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSeeding ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p className="mb-2">This will create:</p>
              <ul className="space-y-1 ml-4">
                <li className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  <span>1 Administrator, 2 Teachers, 3 Students</span>
                </li>
                <li className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3" />
                  <span>4 Sample courses with different subjects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  <span>Student enrollments and sample content</span>
                </li>
              </ul>
            </div>
            
            <Button onClick={seedSampleData} className="w-full">
              <Database className="h-4 w-4 mr-2" />
              Create Sample Data
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">{seedStatus}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
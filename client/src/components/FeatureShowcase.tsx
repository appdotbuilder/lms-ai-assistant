import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Brain, BarChart3, Clock, Award } from 'lucide-react';

export function FeatureShowcase() {
  const features = [
    {
      icon: <BookOpen className="h-8 w-8 text-blue-600" />,
      title: 'Multi-Content Learning',
      description: 'Support for text lessons, videos, interactive quizzes, and assignments',
      badge: 'Content'
    },
    {
      icon: <Brain className="h-8 w-8 text-purple-600" />,
      title: 'AI Learning Assistant',
      description: 'Intelligent tutoring system that answers questions and generates practice quizzes',
      badge: 'AI-Powered'
    },
    {
      icon: <Users className="h-8 w-8 text-green-600" />,
      title: 'Role-Based Access',
      description: 'Tailored experiences for students, teachers, and administrators',
      badge: 'Multi-Role'
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-orange-600" />,
      title: 'Progress Tracking',
      description: 'Comprehensive analytics and progress monitoring for all users',
      badge: 'Analytics'
    },
    {
      icon: <Clock className="h-8 w-8 text-red-600" />,
      title: 'Real-Time Feedback',
      description: 'Instant grading and personalized feedback on assignments and quizzes',
      badge: 'Instant'
    },
    {
      icon: <Award className="h-8 w-8 text-yellow-600" />,
      title: 'Achievement System',
      description: 'Gamified learning with progress badges and completion certificates',
      badge: 'Gamified'
    }
  ];

  return (
    <div className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Powerful Learning Management Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            EduFlow combines traditional LMS capabilities with cutting-edge AI technology 
            to create an engaging and effective learning experience for everyone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  {feature.icon}
                  <Badge variant="outline">{feature.badge}</Badge>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-8">
              <div className="text-center">
                <Brain className="h-16 w-16 mx-auto mb-6 text-white opacity-90" />
                <h3 className="text-2xl font-bold mb-4">AI-Powered Learning Experience</h3>
                <p className="text-lg opacity-90 max-w-2xl mx-auto">
                  Our AI assistant doesn't just answer questions—it adapts to each student's learning style, 
                  generates personalized quizzes, and provides insights that help teachers optimize their courses.
                </p>
                <div className="flex justify-center gap-6 mt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">24/7</div>
                    <div className="text-sm opacity-90">AI Support</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">∞</div>
                    <div className="text-sm opacity-90">Practice Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">100%</div>
                    <div className="text-sm opacity-90">Personalized</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
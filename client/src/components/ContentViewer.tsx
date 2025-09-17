import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Play, FileText, HelpCircle, ClipboardList, CheckCircle, Clock } from 'lucide-react';
import type { Content, ContentType, User } from '../../../server/src/schema';

interface ContentViewerProps {
  content: Content;
  currentUser: User;
  onMarkComplete?: () => void;
}

export function ContentViewer({ content, currentUser, onMarkComplete }: ContentViewerProps) {
  const [isCompleted, setIsCompleted] = useState(false);

  const getContentIcon = (contentType: ContentType) => {
    switch (contentType) {
      case 'text_lesson':
        return <FileText className="h-5 w-5" />;
      case 'video':
        return <Play className="h-5 w-5" />;
      case 'quiz':
        return <HelpCircle className="h-5 w-5" />;
      case 'assignment':
        return <ClipboardList className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getContentTypeColor = (contentType: ContentType) => {
    switch (contentType) {
      case 'text_lesson':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'video':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'quiz':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assignment':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleMarkComplete = () => {
    setIsCompleted(true);
    onMarkComplete?.();
  };

  const renderContent = () => {
    switch (content.content_type) {
      case 'text_lesson':
        return (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap">
              {content.content_data}
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Play className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Video Player</p>
                <p className="text-sm text-gray-500">{content.content_data}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p><strong>Video URL:</strong> {content.content_data}</p>
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-yellow-200 bg-yellow-50 p-6 rounded-lg text-center">
              <HelpCircle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold text-yellow-800 mb-2">Interactive Quiz</h3>
              <p className="text-yellow-700 text-sm mb-4">
                This quiz would be rendered with interactive questions and answers.
              </p>
              <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-600">
                Start Quiz
              </Button>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Quiz Data:</strong> {content.content_data}
            </div>
          </div>
        );

      case 'assignment':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-green-200 bg-green-50 p-6 rounded-lg">
              <ClipboardList className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-green-800 mb-2">Assignment Submission</h3>
              <div className="prose prose-sm max-w-none text-green-700">
                <div className="whitespace-pre-wrap">{content.content_data}</div>
              </div>
              {currentUser.role === 'student' && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    Submit Assignment
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap">
              {content.content_data}
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${getContentTypeColor(content.content_type)}`}>
              {getContentIcon(content.content_type)}
            </div>
            <div>
              <CardTitle className="text-xl">{content.title}</CardTitle>
              {content.description && (
                <CardDescription className="mt-1">
                  {content.description}
                </CardDescription>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getContentTypeColor(content.content_type)}>
              {content.content_type.replace('_', ' ')}
            </Badge>
            {isCompleted && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Separator />
        
        {/* Content Display */}
        <div className="min-h-[200px]">
          {renderContent()}
        </div>

        {/* Student Actions */}
        {currentUser.role === 'student' && (
          <div className="space-y-4">
            <Separator />
            
            {!isCompleted ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Mark as complete when finished</span>
                </div>
                <Button onClick={handleMarkComplete} variant="outline">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Content Completed!</p>
                  <p className="text-sm text-green-600">Great job! You can review this content anytime.</p>
                </div>
              </div>
            )}

            {/* Student Progress Display */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Course Progress</span>
                <span>75%</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
          </div>
        )}

        {/* Teacher/Admin View */}
        {(currentUser.role === 'teacher' || currentUser.role === 'administrator') && (
          <div className="space-y-4">
            <Separator />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-blue-600">Views</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-green-600">Completed</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-purple-600">Avg. Time</div>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Analytics will populate once students engage with this content
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
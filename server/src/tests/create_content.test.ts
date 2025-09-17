import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { contentTable, coursesTable, usersTable } from '../db/schema';
import { type CreateContentInput } from '../schema';
import { createContent } from '../handlers/create_content';
import { eq } from 'drizzle-orm';

// Test course and user data
const testTeacher = {
  email: 'teacher@example.com',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Doe',
  role: 'teacher' as const
};

const testCourse = {
  title: 'Test Course',
  description: 'A course for testing content creation',
  teacher_id: 1 // Will be set after creating teacher
};

// Test input for different content types
const testTextLessonInput: CreateContentInput = {
  course_id: 1,
  title: 'Introduction to Programming',
  description: 'Basic programming concepts',
  content_type: 'text_lesson',
  content_data: JSON.stringify({
    text: 'This is a lesson about programming fundamentals.',
    duration_minutes: 30
  }),
  order_index: 1
};

const testVideoInput: CreateContentInput = {
  course_id: 1,
  title: 'Programming Video Tutorial',
  description: 'Video explaining variables',
  content_type: 'video',
  content_data: JSON.stringify({
    video_url: 'https://example.com/video.mp4',
    duration_minutes: 45,
    transcript: 'Video transcript here...'
  }),
  order_index: 2
};

const testQuizInput: CreateContentInput = {
  course_id: 1,
  title: 'Programming Quiz',
  description: null,
  content_type: 'quiz',
  content_data: JSON.stringify({
    questions: [
      {
        question: 'What is a variable?',
        type: 'multiple_choice',
        options: ['A container for data', 'A function', 'A loop'],
        correct: 0
      }
    ]
  }),
  order_index: 3
};

const testAssignmentInput: CreateContentInput = {
  course_id: 1,
  title: 'Programming Assignment',
  description: 'Complete the coding exercises',
  content_type: 'assignment',
  content_data: JSON.stringify({
    instructions: 'Write a program that prints Hello World',
    rubric: ['Correctness', 'Style', 'Documentation'],
    max_points: 100
  }),
  order_index: 4
};

describe('createContent', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test teacher
    await db.insert(usersTable)
      .values(testTeacher)
      .execute();
    
    // Create test course
    await db.insert(coursesTable)
      .values(testCourse)
      .execute();
  });
  
  afterEach(resetDB);

  it('should create text lesson content', async () => {
    const result = await createContent(testTextLessonInput);

    // Basic field validation
    expect(result.course_id).toEqual(1);
    expect(result.title).toEqual('Introduction to Programming');
    expect(result.description).toEqual('Basic programming concepts');
    expect(result.content_type).toEqual('text_lesson');
    expect(result.content_data).toEqual(testTextLessonInput.content_data);
    expect(result.order_index).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create video content', async () => {
    const result = await createContent(testVideoInput);

    expect(result.title).toEqual('Programming Video Tutorial');
    expect(result.content_type).toEqual('video');
    expect(result.order_index).toEqual(2);
    expect(result.description).toEqual('Video explaining variables');
    
    // Verify content data is properly stored
    const contentData = JSON.parse(result.content_data);
    expect(contentData.video_url).toEqual('https://example.com/video.mp4');
    expect(contentData.duration_minutes).toEqual(45);
  });

  it('should create quiz content with null description', async () => {
    const result = await createContent(testQuizInput);

    expect(result.title).toEqual('Programming Quiz');
    expect(result.content_type).toEqual('quiz');
    expect(result.description).toBeNull();
    expect(result.order_index).toEqual(3);
    
    // Verify quiz data structure
    const contentData = JSON.parse(result.content_data);
    expect(contentData.questions).toBeDefined();
    expect(contentData.questions[0].question).toEqual('What is a variable?');
  });

  it('should create assignment content', async () => {
    const result = await createContent(testAssignmentInput);

    expect(result.title).toEqual('Programming Assignment');
    expect(result.content_type).toEqual('assignment');
    expect(result.order_index).toEqual(4);
    
    // Verify assignment data
    const contentData = JSON.parse(result.content_data);
    expect(contentData.instructions).toEqual('Write a program that prints Hello World');
    expect(contentData.max_points).toEqual(100);
  });

  it('should save content to database', async () => {
    const result = await createContent(testTextLessonInput);

    // Query using proper drizzle syntax
    const content = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, result.id))
      .execute();

    expect(content).toHaveLength(1);
    expect(content[0].title).toEqual('Introduction to Programming');
    expect(content[0].course_id).toEqual(1);
    expect(content[0].content_type).toEqual('text_lesson');
    expect(content[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple content items with different order indices', async () => {
    // Create multiple content items
    const content1 = await createContent(testTextLessonInput);
    const content2 = await createContent(testVideoInput);
    const content3 = await createContent(testQuizInput);

    expect(content1.order_index).toEqual(1);
    expect(content2.order_index).toEqual(2);
    expect(content3.order_index).toEqual(3);

    // Verify all content exists in database
    const allContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.course_id, 1))
      .execute();

    expect(allContent).toHaveLength(3);
    
    // Verify order indices are correctly stored
    const sortedContent = allContent.sort((a, b) => a.order_index - b.order_index);
    expect(sortedContent[0].content_type).toEqual('text_lesson');
    expect(sortedContent[1].content_type).toEqual('video');
    expect(sortedContent[2].content_type).toEqual('quiz');
  });

  it('should throw error when course does not exist', async () => {
    const invalidInput: CreateContentInput = {
      ...testTextLessonInput,
      course_id: 999 // Non-existent course
    };

    expect(createContent(invalidInput)).rejects.toThrow(/Course with ID 999 not found/i);
  });

  it('should validate content data structure for different types', async () => {
    // Test that complex JSON content data is properly stored and retrieved
    const complexAssignmentInput: CreateContentInput = {
      course_id: 1,
      title: 'Complex Assignment',
      description: 'Multi-part assignment',
      content_type: 'assignment',
      content_data: JSON.stringify({
        parts: [
          { title: 'Part 1', instructions: 'Do this', points: 25 },
          { title: 'Part 2', instructions: 'Do that', points: 25 }
        ],
        resources: [
          { name: 'Reference Guide', url: 'https://example.com/guide.pdf' }
        ],
        submission_format: 'pdf',
        late_penalty: 0.1
      }),
      order_index: 1
    };

    const result = await createContent(complexAssignmentInput);
    
    // Parse and verify complex structure
    const contentData = JSON.parse(result.content_data);
    expect(contentData.parts).toHaveLength(2);
    expect(contentData.parts[0].title).toEqual('Part 1');
    expect(contentData.resources[0].name).toEqual('Reference Guide');
    expect(contentData.late_penalty).toEqual(0.1);
  });
});
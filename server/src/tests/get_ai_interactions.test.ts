import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable, aiInteractionsTable } from '../db/schema';
import { getAiInteractions } from '../handlers/get_ai_interactions';
import { eq } from 'drizzle-orm';

describe('getAiInteractions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testStudentId: number;
  let testTeacherId: number;
  let testCourseId: number;
  let testContentId: number;

  beforeEach(async () => {
    // Create test users
    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    testStudentId = student.id;

    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    testTeacherId = teacher.id;

    // Create test course
    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Test Description',
        teacher_id: testTeacherId
      })
      .returning()
      .execute();
    testCourseId = course.id;

    // Create test content
    const [content] = await db.insert(contentTable)
      .values({
        course_id: testCourseId,
        title: 'Test Content',
        description: 'Test Content Description',
        content_type: 'text_lesson',
        content_data: '{"text": "Sample lesson content"}',
        order_index: 1
      })
      .returning()
      .execute();
    testContentId = content.id;
  });

  it('should return AI interactions for a student', async () => {
    // Create first interaction
    await db.insert(aiInteractionsTable)
      .values({
        student_id: testStudentId,
        course_id: testCourseId,
        content_id: testContentId,
        question: 'What is machine learning?',
        response: 'Machine learning is a subset of artificial intelligence...',
        interaction_type: 'question_answer'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second interaction
    await db.insert(aiInteractionsTable)
      .values({
        student_id: testStudentId,
        course_id: testCourseId,
        content_id: null,
        question: 'Can you explain neural networks?',
        response: 'Neural networks are computing systems inspired by biological neural networks...',
        interaction_type: 'question_answer'
      })
      .execute();

    const result = await getAiInteractions(testStudentId);

    expect(result).toHaveLength(2);
    expect(result[0].question).toEqual('Can you explain neural networks?'); // Most recent first
    expect(result[0].student_id).toEqual(testStudentId);
    expect(result[0].course_id).toEqual(testCourseId);
    expect(result[0].content_id).toBeNull();
    expect(result[0].interaction_type).toEqual('question_answer');
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].question).toEqual('What is machine learning?');
    expect(result[1].student_id).toEqual(testStudentId);
    expect(result[1].content_id).toEqual(testContentId);
  });

  it('should filter AI interactions by course when courseId is provided', async () => {
    // Create second course and teacher
    const [secondTeacher] = await db.insert(usersTable)
      .values({
        email: 'teacher2@test.com',
        password_hash: 'hashed_password',
        first_name: 'Second',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const [secondCourse] = await db.insert(coursesTable)
      .values({
        title: 'Second Course',
        description: 'Second Course Description',
        teacher_id: secondTeacher.id
      })
      .returning()
      .execute();

    // Create AI interactions in different courses
    await db.insert(aiInteractionsTable)
      .values({
        student_id: testStudentId,
        course_id: testCourseId,
        content_id: testContentId,
        question: 'Question in first course',
        response: 'Response in first course',
        interaction_type: 'question_answer'
      })
      .execute();

    await db.insert(aiInteractionsTable)
      .values({
        student_id: testStudentId,
        course_id: secondCourse.id,
        content_id: null,
        question: 'Question in second course',
        response: 'Response in second course',
        interaction_type: 'knowledge_recall'
      })
      .execute();

    // Get interactions for specific course
    const result = await getAiInteractions(testStudentId, testCourseId);

    expect(result).toHaveLength(1);
    expect(result[0].question).toEqual('Question in first course');
    expect(result[0].course_id).toEqual(testCourseId);
  });

  it('should return empty array when student has no AI interactions', async () => {
    const result = await getAiInteractions(testStudentId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when filtering by courseId with no matching interactions', async () => {
    // Create AI interaction in different course
    const [secondTeacher] = await db.insert(usersTable)
      .values({
        email: 'teacher2@test.com',
        password_hash: 'hashed_password',
        first_name: 'Second',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const [secondCourse] = await db.insert(coursesTable)
      .values({
        title: 'Second Course',
        description: 'Second Course Description',
        teacher_id: secondTeacher.id
      })
      .returning()
      .execute();

    await db.insert(aiInteractionsTable)
      .values({
        student_id: testStudentId,
        course_id: secondCourse.id,
        content_id: null,
        question: 'Question in different course',
        response: 'Response in different course',
        interaction_type: 'question_answer'
      })
      .execute();

    const result = await getAiInteractions(testStudentId, testCourseId);

    expect(result).toHaveLength(0);
  });

  it('should order interactions by created_at in descending order (most recent first)', async () => {
    // Create interactions with different timestamps by inserting them sequentially
    const [interaction1] = await db.insert(aiInteractionsTable)
      .values({
        student_id: testStudentId,
        course_id: testCourseId,
        content_id: testContentId,
        question: 'First question',
        response: 'First response',
        interaction_type: 'question_answer'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [interaction2] = await db.insert(aiInteractionsTable)
      .values({
        student_id: testStudentId,
        course_id: testCourseId,
        content_id: null,
        question: 'Second question',
        response: 'Second response',
        interaction_type: 'knowledge_recall'
      })
      .returning()
      .execute();

    const result = await getAiInteractions(testStudentId);

    expect(result).toHaveLength(2);
    // Most recent should be first
    expect(result[0].question).toEqual('Second question');
    expect(result[1].question).toEqual('First question');
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
  });

  it('should include all interaction types', async () => {
    // Create interactions with different types
    await db.insert(aiInteractionsTable)
      .values([
        {
          student_id: testStudentId,
          course_id: testCourseId,
          content_id: testContentId,
          question: 'Question for answer',
          response: 'Direct answer response',
          interaction_type: 'question_answer'
        },
        {
          student_id: testStudentId,
          course_id: testCourseId,
          content_id: testContentId,
          question: 'Recall previous topic',
          response: 'Recalled knowledge response',
          interaction_type: 'knowledge_recall'
        },
        {
          student_id: testStudentId,
          course_id: testCourseId,
          content_id: testContentId,
          question: 'Generate quiz questions',
          response: 'Generated quiz questions',
          interaction_type: 'quiz_generation'
        }
      ])
      .execute();

    const result = await getAiInteractions(testStudentId);

    expect(result).toHaveLength(3);
    
    const interactionTypes = result.map(interaction => interaction.interaction_type);
    expect(interactionTypes).toContain('question_answer');
    expect(interactionTypes).toContain('knowledge_recall');
    expect(interactionTypes).toContain('quiz_generation');
  });

  it('should handle interactions with and without content_id', async () => {
    await db.insert(aiInteractionsTable)
      .values([
        {
          student_id: testStudentId,
          course_id: testCourseId,
          content_id: testContentId,
          question: 'Content-specific question',
          response: 'Content-specific response',
          interaction_type: 'question_answer'
        },
        {
          student_id: testStudentId,
          course_id: testCourseId,
          content_id: null,
          question: 'General course question',
          response: 'General course response',
          interaction_type: 'question_answer'
        }
      ])
      .execute();

    const result = await getAiInteractions(testStudentId);

    expect(result).toHaveLength(2);
    
    const withContentId = result.find(r => r.content_id !== null);
    const withoutContentId = result.find(r => r.content_id === null);
    
    expect(withContentId).toBeDefined();
    expect(withContentId!.content_id).toEqual(testContentId);
    expect(withContentId!.question).toEqual('Content-specific question');
    
    expect(withoutContentId).toBeDefined();
    expect(withoutContentId!.content_id).toBeNull();
    expect(withoutContentId!.question).toEqual('General course question');
  });

  it('should not return interactions for other students', async () => {
    // Create another student
    const [anotherStudent] = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        password_hash: 'hashed_password',
        first_name: 'Other',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    // Create interactions for both students
    await db.insert(aiInteractionsTable)
      .values([
        {
          student_id: testStudentId,
          course_id: testCourseId,
          content_id: testContentId,
          question: 'My question',
          response: 'My response',
          interaction_type: 'question_answer'
        },
        {
          student_id: anotherStudent.id,
          course_id: testCourseId,
          content_id: testContentId,
          question: 'Other student question',
          response: 'Other student response',
          interaction_type: 'question_answer'
        }
      ])
      .execute();

    const result = await getAiInteractions(testStudentId);

    expect(result).toHaveLength(1);
    expect(result[0].question).toEqual('My question');
    expect(result[0].student_id).toEqual(testStudentId);
  });
});
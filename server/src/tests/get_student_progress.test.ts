import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable, studentProgressTable } from '../db/schema';
import { getStudentProgress } from '../handlers/get_student_progress';

describe('getStudentProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helper
  async function setupTestData() {
    // Create student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      })
      .returning()
      .execute();
    const student = studentResult[0];

    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      })
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create courses
    const course1Result = await db.insert(coursesTable)
      .values({
        title: 'Course 1',
        description: 'First course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();
    const course1 = course1Result[0];

    const course2Result = await db.insert(coursesTable)
      .values({
        title: 'Course 2',
        description: 'Second course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();
    const course2 = course2Result[0];

    // Create content for both courses
    const content1Result = await db.insert(contentTable)
      .values({
        course_id: course1.id,
        title: 'Lesson 1',
        description: 'First lesson',
        content_type: 'text_lesson',
        content_data: '{"text": "Lesson content"}',
        order_index: 1
      })
      .returning()
      .execute();
    const content1 = content1Result[0];

    const content2Result = await db.insert(contentTable)
      .values({
        course_id: course1.id,
        title: 'Lesson 2',
        description: 'Second lesson',
        content_type: 'video',
        content_data: '{"url": "video.mp4"}',
        order_index: 2
      })
      .returning()
      .execute();
    const content2 = content2Result[0];

    const content3Result = await db.insert(contentTable)
      .values({
        course_id: course2.id,
        title: 'Lesson 3',
        description: 'Third lesson',
        content_type: 'text_lesson',
        content_data: '{"text": "Another lesson"}',
        order_index: 1
      })
      .returning()
      .execute();
    const content3 = content3Result[0];

    // Create progress records
    const progress1Result = await db.insert(studentProgressTable)
      .values({
        student_id: student.id,
        content_id: content1.id,
        completed: true,
        completion_date: new Date('2024-01-15'),
        time_spent_minutes: 30
      })
      .returning()
      .execute();

    const progress2Result = await db.insert(studentProgressTable)
      .values({
        student_id: student.id,
        content_id: content2.id,
        completed: false,
        completion_date: null,
        time_spent_minutes: 15
      })
      .returning()
      .execute();

    const progress3Result = await db.insert(studentProgressTable)
      .values({
        student_id: student.id,
        content_id: content3.id,
        completed: true,
        completion_date: new Date('2024-01-20'),
        time_spent_minutes: 45
      })
      .returning()
      .execute();

    return {
      student,
      teacher,
      course1,
      course2,
      content1,
      content2,
      content3,
      progress1: progress1Result[0],
      progress2: progress2Result[0],
      progress3: progress3Result[0]
    };
  }

  it('should get all progress records for a student', async () => {
    const testData = await setupTestData();

    const results = await getStudentProgress(testData.student.id);

    expect(results).toHaveLength(3);
    
    // Verify all progress records are returned
    const progressIds = results.map(p => p.id).sort();
    const expectedIds = [testData.progress1.id, testData.progress2.id, testData.progress3.id].sort();
    expect(progressIds).toEqual(expectedIds);

    // Verify data structure and types
    results.forEach(progress => {
      expect(progress.student_id).toBe(testData.student.id);
      expect(progress.content_id).toBeNumber();
      expect(typeof progress.completed).toBe('boolean');
      expect(progress.time_spent_minutes).toBeNumber();
      expect(progress.created_at).toBeInstanceOf(Date);
      expect(progress.updated_at).toBeInstanceOf(Date);
      
      if (progress.completion_date) {
        expect(progress.completion_date).toBeInstanceOf(Date);
      }
    });
  });

  it('should filter progress records by course when courseId provided', async () => {
    const testData = await setupTestData();

    const results = await getStudentProgress(testData.student.id, testData.course1.id);

    expect(results).toHaveLength(2);
    
    // Verify only course1 progress records are returned
    const progressIds = results.map(p => p.id).sort();
    const expectedIds = [testData.progress1.id, testData.progress2.id].sort();
    expect(progressIds).toEqual(expectedIds);

    // Verify content belongs to the correct course
    results.forEach(progress => {
      expect(progress.student_id).toBe(testData.student.id);
      expect([testData.content1.id, testData.content2.id]).toContain(progress.content_id);
    });
  });

  it('should return empty array when student has no progress records', async () => {
    const testData = await setupTestData();
    
    // Create another student with no progress
    const anotherStudentResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        password_hash: 'hashed_password',
        first_name: 'Another',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    const anotherStudent = anotherStudentResult[0];

    const results = await getStudentProgress(anotherStudent.id);

    expect(results).toHaveLength(0);
  });

  it('should return empty array when filtering by course with no progress', async () => {
    const testData = await setupTestData();

    // Create another course with no progress
    const emptyCourseResult = await db.insert(coursesTable)
      .values({
        title: 'Empty Course',
        description: 'No progress here',
        teacher_id: testData.teacher.id
      })
      .returning()
      .execute();
    const emptyCourse = emptyCourseResult[0];

    const results = await getStudentProgress(testData.student.id, emptyCourse.id);

    expect(results).toHaveLength(0);
  });

  it('should handle completed and incomplete progress correctly', async () => {
    const testData = await setupTestData();

    const results = await getStudentProgress(testData.student.id);

    const completedProgress = results.filter(p => p.completed);
    const incompleteProgress = results.filter(p => !p.completed);

    expect(completedProgress).toHaveLength(2);
    expect(incompleteProgress).toHaveLength(1);

    // Verify completed progress has completion dates
    completedProgress.forEach(progress => {
      expect(progress.completed).toBe(true);
      expect(progress.completion_date).toBeInstanceOf(Date);
    });

    // Verify incomplete progress has no completion date
    incompleteProgress.forEach(progress => {
      expect(progress.completed).toBe(false);
      expect(progress.completion_date).toBeNull();
    });
  });

  it('should preserve time spent data correctly', async () => {
    const testData = await setupTestData();

    const results = await getStudentProgress(testData.student.id);

    const timeSpentValues = results.map(p => p.time_spent_minutes).sort();
    expect(timeSpentValues).toEqual([15, 30, 45]);
  });

  it('should handle non-existent student gracefully', async () => {
    await setupTestData();

    const results = await getStudentProgress(99999); // Non-existent student ID

    expect(results).toHaveLength(0);
  });

  it('should handle non-existent course gracefully', async () => {
    const testData = await setupTestData();

    const results = await getStudentProgress(testData.student.id, 99999); // Non-existent course ID

    expect(results).toHaveLength(0);
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  lessonsTable, 
  assignmentsTable, 
  assignmentSubmissionsTable 
} from '../db/schema';
import { 
  getAssignmentSubmissionsByAssignment, 
  getAssignmentSubmissionsByStudent 
} from '../handlers/get_assignment_submissions';

describe('getAssignmentSubmissions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let student1Id: number;
  let student2Id: number;
  let courseId: number;
  let lessonId: number;
  let assignment1Id: number;
  let assignment2Id: number;

  beforeEach(async () => {
    // Create test users
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teacher[0].id;

    const student1 = await db.insert(usersTable)
      .values({
        email: 'student1@example.com',
        password_hash: 'hashed_password',
        first_name: 'Alice',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    student1Id = student1[0].id;

    const student2 = await db.insert(usersTable)
      .values({
        email: 'student2@example.com',
        password_hash: 'hashed_password',
        first_name: 'Bob',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    student2Id = student2[0].id;

    // Create test course
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    courseId = course[0].id;

    // Create test lesson
    const lesson = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();
    lessonId = lesson[0].id;

    // Create test assignments
    const assignment1 = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonId,
        title: 'Assignment 1',
        description: 'First assignment',
        max_points: 100,
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();
    assignment1Id = assignment1[0].id;

    const assignment2 = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonId,
        title: 'Assignment 2',
        description: 'Second assignment',
        max_points: 50
      })
      .returning()
      .execute();
    assignment2Id = assignment2[0].id;
  });

  describe('getAssignmentSubmissionsByAssignment', () => {
    it('should return all submissions for a specific assignment', async () => {
      // Create multiple submissions for assignment1
      await db.insert(assignmentSubmissionsTable)
        .values([
          {
            assignment_id: assignment1Id,
            student_id: student1Id,
            content: 'Student 1 submission',
            grade: 85,
            feedback: 'Good work'
          },
          {
            assignment_id: assignment1Id,
            student_id: student2Id,
            content: 'Student 2 submission',
            grade: 90,
            feedback: 'Excellent'
          }
        ])
        .execute();

      // Create submission for assignment2 (should not be included)
      await db.insert(assignmentSubmissionsTable)
        .values({
          assignment_id: assignment2Id,
          student_id: student1Id,
          content: 'Student 1 assignment 2 submission'
        })
        .execute();

      const submissions = await getAssignmentSubmissionsByAssignment(assignment1Id);

      expect(submissions).toHaveLength(2);
      
      // Check that all submissions belong to the correct assignment
      submissions.forEach(submission => {
        expect(submission.assignment_id).toBe(assignment1Id);
      });

      // Check that we have submissions from both students
      const studentIds = submissions.map(s => s.student_id).sort();
      expect(studentIds).toEqual([student1Id, student2Id].sort());

      // Verify content and grades
      const student1Submission = submissions.find(s => s.student_id === student1Id);
      const student2Submission = submissions.find(s => s.student_id === student2Id);

      expect(student1Submission?.content).toBe('Student 1 submission');
      expect(student1Submission?.grade).toBe(85);
      expect(student1Submission?.feedback).toBe('Good work');

      expect(student2Submission?.content).toBe('Student 2 submission');
      expect(student2Submission?.grade).toBe(90);
      expect(student2Submission?.feedback).toBe('Excellent');
    });

    it('should return empty array when assignment has no submissions', async () => {
      const submissions = await getAssignmentSubmissionsByAssignment(assignment1Id);
      expect(submissions).toHaveLength(0);
    });

    it('should return empty array for non-existent assignment', async () => {
      const submissions = await getAssignmentSubmissionsByAssignment(99999);
      expect(submissions).toHaveLength(0);
    });

    it('should include all submission fields correctly', async () => {
      await db.insert(assignmentSubmissionsTable)
        .values({
          assignment_id: assignment1Id,
          student_id: student1Id,
          content: 'Complete submission',
          file_path: '/uploads/assignment.pdf',
          grade: 95,
          feedback: 'Outstanding work!',
          graded_at: new Date('2024-01-15')
        })
        .execute();

      const submissions = await getAssignmentSubmissionsByAssignment(assignment1Id);

      expect(submissions).toHaveLength(1);
      const submission = submissions[0];

      expect(submission.id).toBeDefined();
      expect(submission.assignment_id).toBe(assignment1Id);
      expect(submission.student_id).toBe(student1Id);
      expect(submission.content).toBe('Complete submission');
      expect(submission.file_path).toBe('/uploads/assignment.pdf');
      expect(submission.grade).toBe(95);
      expect(submission.feedback).toBe('Outstanding work!');
      expect(submission.submitted_at).toBeInstanceOf(Date);
      expect(submission.graded_at).toBeInstanceOf(Date);
    });
  });

  describe('getAssignmentSubmissionsByStudent', () => {
    it('should return all submissions for a specific student', async () => {
      // Create submissions for student1 across multiple assignments
      await db.insert(assignmentSubmissionsTable)
        .values([
          {
            assignment_id: assignment1Id,
            student_id: student1Id,
            content: 'Student 1 assignment 1 submission',
            grade: 85
          },
          {
            assignment_id: assignment2Id,
            student_id: student1Id,
            content: 'Student 1 assignment 2 submission',
            grade: 92
          }
        ])
        .execute();

      // Create submission for student2 (should not be included)
      await db.insert(assignmentSubmissionsTable)
        .values({
          assignment_id: assignment1Id,
          student_id: student2Id,
          content: 'Student 2 submission'
        })
        .execute();

      const submissions = await getAssignmentSubmissionsByStudent(student1Id);

      expect(submissions).toHaveLength(2);
      
      // Check that all submissions belong to the correct student
      submissions.forEach(submission => {
        expect(submission.student_id).toBe(student1Id);
      });

      // Check that we have submissions for both assignments
      const assignmentIds = submissions.map(s => s.assignment_id).sort();
      expect(assignmentIds).toEqual([assignment1Id, assignment2Id].sort());

      // Verify content and grades
      const assignment1Submission = submissions.find(s => s.assignment_id === assignment1Id);
      const assignment2Submission = submissions.find(s => s.assignment_id === assignment2Id);

      expect(assignment1Submission?.content).toBe('Student 1 assignment 1 submission');
      expect(assignment1Submission?.grade).toBe(85);

      expect(assignment2Submission?.content).toBe('Student 1 assignment 2 submission');
      expect(assignment2Submission?.grade).toBe(92);
    });

    it('should return empty array when student has no submissions', async () => {
      const submissions = await getAssignmentSubmissionsByStudent(student1Id);
      expect(submissions).toHaveLength(0);
    });

    it('should return empty array for non-existent student', async () => {
      const submissions = await getAssignmentSubmissionsByStudent(99999);
      expect(submissions).toHaveLength(0);
    });

    it('should handle submissions with null values correctly', async () => {
      await db.insert(assignmentSubmissionsTable)
        .values({
          assignment_id: assignment1Id,
          student_id: student1Id,
          content: null,
          file_path: null,
          grade: null,
          feedback: null,
          graded_at: null
        })
        .execute();

      const submissions = await getAssignmentSubmissionsByStudent(student1Id);

      expect(submissions).toHaveLength(1);
      const submission = submissions[0];

      expect(submission.content).toBeNull();
      expect(submission.file_path).toBeNull();
      expect(submission.grade).toBeNull();
      expect(submission.feedback).toBeNull();
      expect(submission.graded_at).toBeNull();
      expect(submission.submitted_at).toBeInstanceOf(Date);
    });

    it('should include file submissions correctly', async () => {
      await db.insert(assignmentSubmissionsTable)
        .values({
          assignment_id: assignment1Id,
          student_id: student1Id,
          content: 'Text submission content',
          file_path: '/uploads/student1/assignment.pdf'
        })
        .execute();

      const submissions = await getAssignmentSubmissionsByStudent(student1Id);

      expect(submissions).toHaveLength(1);
      expect(submissions[0].content).toBe('Text submission content');
      expect(submissions[0].file_path).toBe('/uploads/student1/assignment.pdf');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully for getAssignmentSubmissionsByAssignment', async () => {
      // Force a database error by dropping the table
      await db.execute('DROP TABLE assignment_submissions CASCADE');

      await expect(getAssignmentSubmissionsByAssignment(assignment1Id))
        .rejects.toThrow(/relation "assignment_submissions" does not exist/i);
    });

    it('should handle database errors gracefully for getAssignmentSubmissionsByStudent', async () => {
      // Force a database error by dropping the table
      await db.execute('DROP TABLE assignment_submissions CASCADE');

      await expect(getAssignmentSubmissionsByStudent(student1Id))
        .rejects.toThrow(/relation "assignment_submissions" does not exist/i);
    });
  });
});
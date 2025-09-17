import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, quizzesTable, quizQuestionsTable } from '../db/schema';
import { updateQuizQuestion } from '../handlers/update_quiz_question';
import { eq } from 'drizzle-orm';

describe('updateQuizQuestion', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    let teacherId: number;
    let courseId: number;
    let lessonId: number;
    let quizId: number;
    let questionId: number;

    beforeEach(async () => {
        // Create test teacher
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

        // Create test course
        const course = await db.insert(coursesTable)
            .values({
                title: 'Test Course',
                description: 'A course for testing',
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

        // Create test quiz
        const quiz = await db.insert(quizzesTable)
            .values({
                lesson_id: lessonId,
                title: 'Test Quiz',
                description: 'Quiz description',
                time_limit: 60
            })
            .returning()
            .execute();
        quizId = quiz[0].id;

        // Create test quiz question
        const question = await db.insert(quizQuestionsTable)
            .values({
                quiz_id: quizId,
                question_text: 'Original question text?',
                question_type: 'multiple_choice',
                options: ['Option A', 'Option B', 'Option C'],
                correct_answer: 'Option A',
                points: 10,
                order_index: 1
            })
            .returning()
            .execute();
        questionId = question[0].id;
    });

    it('should update question text', async () => {
        const result = await updateQuizQuestion(questionId, {
            question_text: 'Updated question text?'
        });

        expect(result.question_text).toEqual('Updated question text?');
        expect(result.id).toEqual(questionId);
        expect(result.quiz_id).toEqual(quizId);

        // Verify in database
        const dbQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        expect(dbQuestion[0].question_text).toEqual('Updated question text?');
    });

    it('should update question type', async () => {
        const result = await updateQuizQuestion(questionId, {
            question_type: 'true_false'
        });

        expect(result.question_type).toEqual('true_false');
        expect(result.id).toEqual(questionId);

        // Verify in database
        const dbQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        expect(dbQuestion[0].question_type).toEqual('true_false');
    });

    it('should update options array', async () => {
        const newOptions = ['True', 'False'];
        const result = await updateQuizQuestion(questionId, {
            options: newOptions
        });

        expect(result.options).toEqual(newOptions);
        expect(result.id).toEqual(questionId);

        // Verify in database
        const dbQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        expect(dbQuestion[0].options).toEqual(newOptions);
    });

    it('should update correct answer', async () => {
        const result = await updateQuizQuestion(questionId, {
            correct_answer: 'Option B'
        });

        expect(result.correct_answer).toEqual('Option B');
        expect(result.id).toEqual(questionId);

        // Verify in database
        const dbQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        expect(dbQuestion[0].correct_answer).toEqual('Option B');
    });

    it('should update points value', async () => {
        const result = await updateQuizQuestion(questionId, {
            points: 15
        });

        expect(result.points).toEqual(15);
        expect(result.id).toEqual(questionId);

        // Verify in database
        const dbQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        expect(dbQuestion[0].points).toEqual(15);
    });

    it('should update order index', async () => {
        const result = await updateQuizQuestion(questionId, {
            order_index: 5
        });

        expect(result.order_index).toEqual(5);
        expect(result.id).toEqual(questionId);

        // Verify in database
        const dbQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        expect(dbQuestion[0].order_index).toEqual(5);
    });

    it('should update multiple fields at once', async () => {
        const updates = {
            question_text: 'Is this statement true?',
            question_type: 'true_false' as const,
            options: ['True', 'False'],
            correct_answer: 'True',
            points: 5,
            order_index: 3
        };

        const result = await updateQuizQuestion(questionId, updates);

        expect(result.question_text).toEqual(updates.question_text);
        expect(result.question_type).toEqual(updates.question_type);
        expect(result.options).toEqual(updates.options);
        expect(result.correct_answer).toEqual(updates.correct_answer);
        expect(result.points).toEqual(updates.points);
        expect(result.order_index).toEqual(updates.order_index);

        // Verify in database
        const dbQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        expect(dbQuestion[0].question_text).toEqual(updates.question_text);
        expect(dbQuestion[0].question_type).toEqual(updates.question_type);
        expect(dbQuestion[0].options).toEqual(updates.options);
        expect(dbQuestion[0].correct_answer).toEqual(updates.correct_answer);
        expect(dbQuestion[0].points).toEqual(updates.points);
        expect(dbQuestion[0].order_index).toEqual(updates.order_index);
    });

    it('should return original question when no updates provided', async () => {
        const result = await updateQuizQuestion(questionId, {});

        expect(result.question_text).toEqual('Original question text?');
        expect(result.question_type).toEqual('multiple_choice');
        expect(result.options).toEqual(['Option A', 'Option B', 'Option C']);
        expect(result.correct_answer).toEqual('Option A');
        expect(result.points).toEqual(10);
        expect(result.order_index).toEqual(1);
    });

    it('should preserve unchanged fields when updating others', async () => {
        const result = await updateQuizQuestion(questionId, {
            question_text: 'New question text?'
        });

        // Updated field
        expect(result.question_text).toEqual('New question text?');
        
        // Unchanged fields
        expect(result.question_type).toEqual('multiple_choice');
        expect(result.options).toEqual(['Option A', 'Option B', 'Option C']);
        expect(result.correct_answer).toEqual('Option A');
        expect(result.points).toEqual(10);
        expect(result.order_index).toEqual(1);
        expect(result.quiz_id).toEqual(quizId);
    });

    it('should throw error when question does not exist', async () => {
        const nonExistentId = 99999;

        await expect(
            updateQuizQuestion(nonExistentId, {
                question_text: 'Updated text'
            })
        ).rejects.toThrow(/Quiz question with id 99999 not found/i);
    });

    it('should handle empty options array', async () => {
        const result = await updateQuizQuestion(questionId, {
            options: []
        });

        expect(result.options).toEqual([]);

        // Verify in database
        const dbQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        expect(dbQuestion[0].options).toEqual([]);
    });

    it('should handle zero points value', async () => {
        const result = await updateQuizQuestion(questionId, {
            points: 0
        });

        expect(result.points).toEqual(0);

        // Verify in database
        const dbQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        expect(dbQuestion[0].points).toEqual(0);
    });

    it('should handle negative order index', async () => {
        const result = await updateQuizQuestion(questionId, {
            order_index: -1
        });

        expect(result.order_index).toEqual(-1);

        // Verify in database
        const dbQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        expect(dbQuestion[0].order_index).toEqual(-1);
    });
});
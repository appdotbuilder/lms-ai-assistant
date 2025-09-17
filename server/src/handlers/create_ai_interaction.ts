import { db } from '../db';
import { aiInteractionsTable, usersTable, coursesTable, contentTable, courseEnrollmentsTable } from '../db/schema';
import { type CreateAiInteractionInput, type AiInteraction } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createAiInteraction = async (input: CreateAiInteractionInput): Promise<AiInteraction> => {
  try {
    // Verify that the student exists and has the student role
    const student = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, input.student_id),
        eq(usersTable.role, 'student')
      ))
      .execute();

    if (student.length === 0) {
      throw new Error('Student not found or user is not a student');
    }

    // Verify that the course exists
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    // Verify that the student is enrolled in the course
    const enrollment = await db.select()
      .from(courseEnrollmentsTable)
      .where(and(
        eq(courseEnrollmentsTable.student_id, input.student_id),
        eq(courseEnrollmentsTable.course_id, input.course_id)
      ))
      .execute();

    if (enrollment.length === 0) {
      throw new Error('Student is not enrolled in this course');
    }

    // If content_id is provided, verify that the content exists and belongs to the course
    if (input.content_id !== null) {
      const content = await db.select()
        .from(contentTable)
        .where(and(
          eq(contentTable.id, input.content_id),
          eq(contentTable.course_id, input.course_id)
        ))
        .execute();

      if (content.length === 0) {
        throw new Error('Content not found or does not belong to this course');
      }
    }

    // Generate AI response based on interaction type
    let response = '';
    switch (input.interaction_type) {
      case 'question_answer':
        response = `Thank you for your question: "${input.question}". This is a contextual AI response that would normally be generated based on the course content and your specific question. In a full implementation, this would integrate with an AI service to provide detailed, relevant answers.`;
        break;
      case 'knowledge_recall':
        response = `Based on your request for knowledge recall: "${input.question}", here are some practice questions to test your understanding: 1) What are the key concepts from this topic? 2) How would you apply these principles in practice? 3) What are the main takeaways you should remember?`;
        break;
      case 'quiz_generation':
        response = `Quiz questions generated based on your request: "${input.question}". 1) Multiple Choice: Which of the following best describes the main concept? A) Option A B) Option B C) Option C D) Option D. 2) True/False: The key principle discussed is fundamental to understanding this topic. 3) Short Answer: Explain how you would apply this knowledge in a real-world scenario.`;
        break;
    }

    // Insert the AI interaction record
    const result = await db.insert(aiInteractionsTable)
      .values({
        student_id: input.student_id,
        course_id: input.course_id,
        content_id: input.content_id,
        question: input.question,
        response: response,
        interaction_type: input.interaction_type
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('AI interaction creation failed:', error);
    throw error;
  }
};
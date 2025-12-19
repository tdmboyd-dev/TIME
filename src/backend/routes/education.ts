/**
 * Education API Routes
 *
 * Admin Academy, Bot University, and Learning Path courses.
 */

import { Router, Request, Response } from 'express';
import { educationService } from '../services/EducationService';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('EducationRoutes');

// Get all courses
router.get('/courses', (_req: Request, res: Response) => {
  try {
    const courses = educationService.getAllCourses().map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      targetAudience: c.targetAudience,
      estimatedTime: c.estimatedTime,
      lessonCount: c.lessons.length,
    }));

    res.json({
      success: true,
      courses,
    });
  } catch (error) {
    logger.error('Error getting courses', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// Get courses for user type
router.get('/courses/:userType', (req: Request, res: Response) => {
  try {
    const { userType } = req.params;

    if (!['admin', 'power_user', 'beginner'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    const courses = educationService.getCoursesForUser(userType as any).map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      estimatedTime: c.estimatedTime,
      lessonCount: c.lessons.length,
      lessons: c.lessons.map(l => ({
        id: l.id,
        title: l.title,
        duration: l.duration,
        difficulty: l.difficulty,
      })),
    }));

    res.json({
      success: true,
      courses,
    });
  } catch (error) {
    logger.error('Error getting courses', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// Get specific course
router.get('/course/:courseId', (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = educationService.getCourse(courseId);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        targetAudience: course.targetAudience,
        estimatedTime: course.estimatedTime,
        lessons: course.lessons.map(l => ({
          id: l.id,
          title: l.title,
          description: l.description,
          duration: l.duration,
          difficulty: l.difficulty,
          category: l.category,
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting course', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get course' });
  }
});

// Get specific lesson
router.get('/course/:courseId/lesson/:lessonId', (req: Request, res: Response) => {
  try {
    const { courseId, lessonId } = req.params;
    const lesson = educationService.getLesson(courseId, lessonId);

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json({
      success: true,
      lesson,
    });
  } catch (error) {
    logger.error('Error getting lesson', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get lesson' });
  }
});

// Mark lesson complete
router.post('/progress/complete', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const { lessonId } = req.body;

    if (!lessonId) {
      return res.status(400).json({ error: 'Lesson ID is required' });
    }

    educationService.markLessonComplete(userId, lessonId);

    res.json({
      success: true,
      message: 'Lesson marked as complete',
    });
  } catch (error) {
    logger.error('Error marking complete', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to mark complete' });
  }
});

// Get user progress
router.get('/progress', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const progress = educationService.getUserProgress(userId);

    res.json({
      success: true,
      progress: progress || {
        userId,
        completedLessons: [],
        quizScores: {},
        certificates: [],
      },
    });
  } catch (error) {
    logger.error('Error getting progress', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Get next recommended lesson
router.get('/next/:courseId', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const { courseId } = req.params;

    const nextLesson = educationService.getNextLesson(userId, courseId);

    res.json({
      success: true,
      nextLesson: nextLesson ? {
        id: nextLesson.id,
        title: nextLesson.title,
        description: nextLesson.description,
        duration: nextLesson.duration,
      } : null,
      completed: nextLesson === null,
    });
  } catch (error) {
    logger.error('Error getting next lesson', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get next lesson' });
  }
});

// Check course completion
router.get('/completed/:courseId', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const { courseId } = req.params;

    const completed = educationService.hasCompletedCourse(userId, courseId);

    res.json({
      success: true,
      completed,
    });
  } catch (error) {
    logger.error('Error checking completion', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to check completion' });
  }
});

export default router;

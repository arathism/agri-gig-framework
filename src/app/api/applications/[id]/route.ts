import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, users, tasks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_STATUSES = ['pending', 'accepted', 'rejected', 'started', 'completed'] as const;
type ApplicationStatus = typeof VALID_STATUSES[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const applicationId = parseInt(id);

    // Fetch application with laborer and task details using joins
    const result = await db
      .select({
        application: applications,
        laborer: users,
        task: tasks,
      })
      .from(applications)
      .innerJoin(users, eq(applications.laborerId, users.id))
      .innerJoin(tasks, eq(applications.taskId, tasks.id))
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Application not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const { application, laborer, task } = result[0];

    return NextResponse.json({
      application,
      laborer,
      task,
    });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const applicationId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required', code: 'MISSING_STATUS' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status as ApplicationStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    // Check if application exists
    const existingApplication = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (existingApplication.length === 0) {
      return NextResponse.json(
        { error: 'Application not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentApplication = existingApplication[0];
    const now = new Date().toISOString();

    // Prepare update data
    const updateData: {
      status: string;
      startedAt?: string;
      completedAt?: string;
    } = {
      status,
    };

    // Auto-update timestamps based on status
    if (status === 'started' && !currentApplication.startedAt) {
      updateData.startedAt = now;
    }

    if (status === 'completed' && !currentApplication.completedAt) {
      updateData.completedAt = now;
      if (!currentApplication.startedAt) {
        updateData.startedAt = now;
      }
    }

    // Update application
    const updatedApplication = await db
      .update(applications)
      .set(updateData)
      .where(eq(applications.id, applicationId))
      .returning();

    // Update related task status based on application status
    const taskId = currentApplication.taskId;

    if (status === 'accepted') {
      // When application is accepted, task moves to in progress
      await db
        .update(tasks)
        .set({ status: 'inProgress' })
        .where(eq(tasks.id, taskId));
    } else if (status === 'started') {
      // Ensure task is in progress when work starts
      await db
        .update(tasks)
        .set({ status: 'inProgress' })
        .where(eq(tasks.id, taskId));
    } else if (status === 'completed') {
      // When application is completed, task moves to completed
      await db
        .update(tasks)
        .set({ status: 'completed' })
        .where(eq(tasks.id, taskId));
    } else if (status === 'rejected') {
      // Check if there are other pending/accepted applications
      const otherApplications = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.taskId, taskId),
            eq(applications.status, 'accepted')
          )
        );

      // If no other accepted applications, reopen the task
      if (otherApplications.length === 0) {
        await db
          .update(tasks)
          .set({ status: 'open' })
          .where(eq(tasks.id, taskId));
      }
    }

    return NextResponse.json(updatedApplication[0]);
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
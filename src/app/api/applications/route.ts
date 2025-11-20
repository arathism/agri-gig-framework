import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, users, tasks } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, laborerId } = body;

    // Validate required fields
    if (!taskId) {
      return NextResponse.json({ 
        error: "Task ID is required",
        code: "MISSING_TASK_ID" 
      }, { status: 400 });
    }

    if (!laborerId) {
      return NextResponse.json({ 
        error: "Laborer ID is required",
        code: "MISSING_LABORER_ID" 
      }, { status: 400 });
    }

    // Validate taskId is a valid integer
    const parsedTaskId = parseInt(taskId);
    if (isNaN(parsedTaskId)) {
      return NextResponse.json({ 
        error: "Task ID must be a valid integer",
        code: "INVALID_TASK_ID" 
      }, { status: 400 });
    }

    // Validate laborerId is a valid integer
    const parsedLaborerId = parseInt(laborerId);
    if (isNaN(parsedLaborerId)) {
      return NextResponse.json({ 
        error: "Laborer ID must be a valid integer",
        code: "INVALID_LABORER_ID" 
      }, { status: 400 });
    }

    // Check if task exists
    const taskExists = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parsedTaskId))
      .limit(1);

    if (taskExists.length === 0) {
      return NextResponse.json({ 
        error: "Task not found",
        code: "TASK_NOT_FOUND" 
      }, { status: 400 });
    }

    // Check if laborer exists
    const laborerExists = await db.select()
      .from(users)
      .where(eq(users.id, parsedLaborerId))
      .limit(1);

    if (laborerExists.length === 0) {
      return NextResponse.json({ 
        error: "Laborer not found",
        code: "LABORER_NOT_FOUND" 
      }, { status: 400 });
    }

    // Check for duplicate application (same laborer + task)
    const duplicateApplication = await db.select()
      .from(applications)
      .where(
        and(
          eq(applications.taskId, parsedTaskId),
          eq(applications.laborerId, parsedLaborerId)
        )
      )
      .limit(1);

    if (duplicateApplication.length > 0) {
      return NextResponse.json({ 
        error: "Application already exists for this task",
        code: "DUPLICATE_APPLICATION" 
      }, { status: 400 });
    }

    // Create new application
    const newApplication = await db.insert(applications)
      .values({
        taskId: parsedTaskId,
        laborerId: parsedLaborerId,
        status: 'pending',
        appliedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null
      })
      .returning();

    return NextResponse.json(newApplication[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const taskId = searchParams.get('task_id');
    const laborerId = searchParams.get('laborer_id');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Single application by ID with JOINs
    if (id) {
      const parsedId = parseInt(id);
      if (isNaN(parsedId)) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const application = await db.select({
        id: applications.id,
        taskId: applications.taskId,
        laborerId: applications.laborerId,
        status: applications.status,
        appliedAt: applications.appliedAt,
        startedAt: applications.startedAt,
        completedAt: applications.completedAt,
        laborer: {
          id: users.id,
          name: users.name,
          phone: users.phone,
          location: users.location,
          email: users.email
        },
        task: {
          id: tasks.id,
          taskName: tasks.taskName,
          category: tasks.category,
          reward: tasks.reward,
          duration: tasks.duration,
          location: tasks.location,
          description: tasks.description,
          status: tasks.status
        }
      })
        .from(applications)
        .leftJoin(users, eq(applications.laborerId, users.id))
        .leftJoin(tasks, eq(applications.taskId, tasks.id))
        .where(eq(applications.id, parsedId))
        .limit(1);

      if (application.length === 0) {
        return NextResponse.json({ 
          error: 'Application not found',
          code: 'NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(application[0]);
    }

    // List applications with optional filters and JOINs
    let conditions = [];

    if (taskId) {
      const parsedTaskId = parseInt(taskId);
      if (!isNaN(parsedTaskId)) {
        conditions.push(eq(applications.taskId, parsedTaskId));
      }
    }

    if (laborerId) {
      const parsedLaborerId = parseInt(laborerId);
      if (!isNaN(parsedLaborerId)) {
        conditions.push(eq(applications.laborerId, parsedLaborerId));
      }
    }

    if (status) {
      const validStatuses = ['pending', 'accepted', 'rejected', 'started', 'completed'];
      if (validStatuses.includes(status)) {
        conditions.push(eq(applications.status, status));
      }
    }

    let query = db.select({
      id: applications.id,
      taskId: applications.taskId,
      laborerId: applications.laborerId,
      status: applications.status,
      appliedAt: applications.appliedAt,
      startedAt: applications.startedAt,
      completedAt: applications.completedAt,
      laborer: {
        id: users.id,
        name: users.name,
        phone: users.phone,
        location: users.location,
        email: users.email
      },
      task: {
        id: tasks.id,
        taskName: tasks.taskName,
        category: tasks.category,
        reward: tasks.reward,
        duration: tasks.duration,
        location: tasks.location,
        description: tasks.description,
        status: tasks.status
      }
    })
      .from(applications)
      .leftJoin(users, eq(applications.laborerId, users.id))
      .leftJoin(tasks, eq(applications.taskId, tasks.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by appliedAt descending (newest first)
    const results = await query
      .orderBy(desc(applications.appliedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: "Application ID is required",
        code: "MISSING_ID" 
      }, { status: 400 });
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    // Validate status field
    if (!status) {
      return NextResponse.json({ 
        error: "Status is required",
        code: "MISSING_STATUS" 
      }, { status: 400 });
    }

    const validStatuses = ['pending', 'accepted', 'rejected', 'started', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be one of: pending, accepted, rejected, started, completed",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Check if application exists
    const existingApplication = await db.select()
      .from(applications)
      .where(eq(applications.id, parsedId))
      .limit(1);

    if (existingApplication.length === 0) {
      return NextResponse.json({ 
        error: 'Application not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const currentApplication = existingApplication[0];

    // Prepare update data
    const updateData: any = {
      status
    };

    // Auto-set startedAt when status changes to 'started'
    if (status === 'started' && !currentApplication.startedAt) {
      updateData.startedAt = new Date().toISOString();
    }

    // Auto-set completedAt when status changes to 'completed'
    if (status === 'completed' && !currentApplication.completedAt) {
      updateData.completedAt = new Date().toISOString();
    }

    // Update application
    const updated = await db.update(applications)
      .set(updateData)
      .where(eq(applications.id, parsedId))
      .returning();

    // Update related task status
    if (status === 'accepted') {
      await db.update(tasks)
        .set({ status: 'inProgress' })
        .where(eq(tasks.id, currentApplication.taskId));
    } else if (status === 'completed') {
      await db.update(tasks)
        .set({ status: 'completed' })
        .where(eq(tasks.id, currentApplication.taskId));
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}
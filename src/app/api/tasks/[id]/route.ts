import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_CATEGORIES = ['soilPrep', 'planting', 'weeding', 'harvesting', 'irrigation', 'fertilizing', 'pestControl', 'other'];
const VALID_STATUSES = ['open', 'inProgress', 'completed', 'verified'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid task ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const result = await db
      .select({
        taskId: tasks.id,
        farmerId: tasks.farmerId,
        taskName: tasks.taskName,
        description: tasks.description,
        category: tasks.category,
        taskLocation: tasks.location,
        reward: tasks.reward,
        duration: tasks.duration,
        requirements: tasks.requirements,
        status: tasks.status,
        createdAt: tasks.createdAt,
        farmerName: users.name,
        farmerEmail: users.email,
        farmerPhone: users.phone,
        farmerLocation: users.location,
        farmerRole: users.role,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.farmerId, users.id))
      .where(eq(tasks.id, parseInt(id)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 }
      );
    }

    const data = result[0];

    const response = {
      task: {
        id: data.taskId,
        farmerId: data.farmerId,
        taskName: data.taskName,
        description: data.description,
        category: data.category,
        location: data.taskLocation,
        reward: data.reward,
        duration: data.duration,
        requirements: data.requirements,
        status: data.status,
        createdAt: data.createdAt,
      },
      farmer: {
        id: data.farmerId,
        name: data.farmerName,
        email: data.farmerEmail,
        phone: data.farmerPhone,
        location: data.farmerLocation,
        role: data.farmerRole,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid task ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      taskName,
      description,
      category,
      location,
      reward,
      duration,
      requirements,
      status,
    } = body;

    // Validate category if provided
    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
          code: 'INVALID_CATEGORY',
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    // Validate reward if provided
    if (reward !== undefined && (typeof reward !== 'number' || reward <= 0)) {
      return NextResponse.json(
        { error: 'Reward must be a positive number', code: 'INVALID_REWARD' },
        { status: 400 }
      );
    }

    // Validate duration if provided
    if (duration !== undefined && (typeof duration !== 'number' || duration <= 0)) {
      return NextResponse.json(
        { error: 'Duration must be a positive number', code: 'INVALID_DURATION' },
        { status: 400 }
      );
    }

    // Check if task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(id)))
      .limit(1);

    if (existingTask.length === 0) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (taskName !== undefined) updates.taskName = taskName.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category;
    if (location !== undefined) updates.location = location.trim();
    if (reward !== undefined) updates.reward = reward;
    if (duration !== undefined) updates.duration = duration;
    if (requirements !== undefined) updates.requirements = requirements ? requirements.trim() : requirements;
    if (status !== undefined) updates.status = status;

    const updatedTask = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, parseInt(id)))
      .returning();

    if (updatedTask.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update task', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedTask[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid task ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(id)))
      .limit(1);

    if (existingTask.length === 0) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(tasks)
      .where(eq(tasks.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete task', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Task deleted successfully',
        task: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
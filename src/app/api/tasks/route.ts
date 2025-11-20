import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, users, applications } from '@/db/schema';
import { eq, like, or, and, inArray, desc } from 'drizzle-orm';

const VALID_CATEGORIES = [
  'soilPrep',
  'planting',
  'weeding',
  'irrigation',
  'fertilizing',
  'pestControl',
  'harvesting',
  'composting'
];

const VALID_STATUSES = ['open', 'inProgress', 'completed', 'verified'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      farmerId,
      taskName,
      description,
      category,
      location,
      reward,
      duration,
      requirements
    } = body;

    // Validate required fields
    if (!farmerId) {
      return NextResponse.json(
        { error: 'Farmer ID is required', code: 'MISSING_FARMER_ID' },
        { status: 400 }
      );
    }

    if (!taskName || !taskName.trim()) {
      return NextResponse.json(
        { error: 'Task name is required', code: 'MISSING_TASK_NAME' },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Description is required', code: 'MISSING_DESCRIPTION' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required', code: 'MISSING_CATEGORY' },
        { status: 400 }
      );
    }

    if (!location || !location.trim()) {
      return NextResponse.json(
        { error: 'Location is required', code: 'MISSING_LOCATION' },
        { status: 400 }
      );
    }

    if (reward === undefined || reward === null) {
      return NextResponse.json(
        { error: 'Reward is required', code: 'MISSING_REWARD' },
        { status: 400 }
      );
    }

    if (duration === undefined || duration === null) {
      return NextResponse.json(
        { error: 'Duration is required', code: 'MISSING_DURATION' },
        { status: 400 }
      );
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
          code: 'INVALID_CATEGORY'
        },
        { status: 400 }
      );
    }

    // Validate positive numbers
    const rewardNum = parseFloat(reward);
    const durationNum = parseFloat(duration);

    if (isNaN(rewardNum) || rewardNum <= 0) {
      return NextResponse.json(
        { error: 'Reward must be a positive number', code: 'INVALID_REWARD' },
        { status: 400 }
      );
    }

    if (isNaN(durationNum) || durationNum <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive number', code: 'INVALID_DURATION' },
        { status: 400 }
      );
    }

    // Verify farmer exists
    const farmer = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(farmerId)))
      .limit(1);

    if (farmer.length === 0) {
      return NextResponse.json(
        { error: 'Farmer not found', code: 'FARMER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Create new task
    const newTask = await db
      .insert(tasks)
      .values({
        farmerId: parseInt(farmerId),
        taskName: taskName.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        reward: rewardNum,
        duration: durationNum,
        requirements: requirements ? requirements.trim() : null,
        status: 'open',
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newTask[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const farmerId = searchParams.get('farmer_id');
    const laborerId = searchParams.get('laborer_id');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Get single task with farmer details
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const task = await db
        .select({
          id: tasks.id,
          farmerId: tasks.farmerId,
          taskName: tasks.taskName,
          description: tasks.description,
          category: tasks.category,
          location: tasks.location,
          reward: tasks.reward,
          duration: tasks.duration,
          requirements: tasks.requirements,
          status: tasks.status,
          createdAt: tasks.createdAt,
          farmer: {
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            location: users.location
          }
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.farmerId, users.id))
        .where(eq(tasks.id, parseInt(id)))
        .limit(1);

      if (task.length === 0) {
        return NextResponse.json(
          { error: 'Task not found', code: 'TASK_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(task[0]);
    }

    // List tasks with filtering
    let query = db.select().from(tasks);
    const conditions = [];

    // Filter by laborer_id (tasks where laborer has applied)
    if (laborerId) {
      const laborerApplications = await db
        .select({ taskId: applications.taskId })
        .from(applications)
        .where(eq(applications.laborerId, parseInt(laborerId)));

      const taskIds = laborerApplications.map((app) => app.taskId);

      if (taskIds.length === 0) {
        return NextResponse.json([]);
      }

      conditions.push(inArray(tasks.id, taskIds));
    }

    // Filter by status
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
            code: 'INVALID_STATUS'
          },
          { status: 400 }
        );
      }
      conditions.push(eq(tasks.status, status));
    }

    // Filter by category
    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          {
            error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
            code: 'INVALID_CATEGORY'
          },
          { status: 400 }
        );
      }
      conditions.push(eq(tasks.category, category));
    }

    // Filter by farmer
    if (farmerId) {
      conditions.push(eq(tasks.farmerId, parseInt(farmerId)));
    }

    // Search in taskName and description
    if (search) {
      const searchCondition = or(
        like(tasks.taskName, `%${search}%`),
        like(tasks.description, `%${search}%`)
      );

      if (conditions.length > 0) {
        conditions.push(searchCondition!);
      } else {
        conditions.push(searchCondition!);
      }
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by createdAt descending (newest first)
    const results = await query
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required', code: 'MISSING_STATUS' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        },
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

    // Update task status
    const updated = await db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
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

    // Delete task
    const deleted = await db
      .delete(tasks)
      .where(eq(tasks.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Task deleted successfully',
      task: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
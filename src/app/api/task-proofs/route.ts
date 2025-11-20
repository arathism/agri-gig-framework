import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taskProofs, users, tasks, applications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, taskId, laborerId, photos, notes, locationLat, locationLng } = body;

    // Validate required fields
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required', code: 'MISSING_APPLICATION_ID' },
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required', code: 'MISSING_TASK_ID' },
        { status: 400 }
      );
    }

    if (!laborerId) {
      return NextResponse.json(
        { error: 'Laborer ID is required', code: 'MISSING_LABORER_ID' },
        { status: 400 }
      );
    }

    // Validate photos is an array if provided
    if (photos !== undefined && photos !== null && !Array.isArray(photos)) {
      return NextResponse.json(
        { error: 'Photos must be an array', code: 'INVALID_PHOTOS_FORMAT' },
        { status: 400 }
      );
    }

    // Validate coordinates if provided
    if (locationLat !== undefined && locationLat !== null) {
      const lat = parseFloat(locationLat);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return NextResponse.json(
          { error: 'Invalid latitude value. Must be between -90 and 90', code: 'INVALID_LATITUDE' },
          { status: 400 }
        );
      }
    }

    if (locationLng !== undefined && locationLng !== null) {
      const lng = parseFloat(locationLng);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: 'Invalid longitude value. Must be between -180 and 180', code: 'INVALID_LONGITUDE' },
          { status: 400 }
        );
      }
    }

    // Verify application exists
    const existingApplication = await db
      .select()
      .from(applications)
      .where(eq(applications.id, parseInt(applicationId)))
      .limit(1);

    if (existingApplication.length === 0) {
      return NextResponse.json(
        { error: 'Application not found', code: 'APPLICATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)))
      .limit(1);

    if (existingTask.length === 0) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify laborer exists
    const existingLaborer = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(laborerId)))
      .limit(1);

    if (existingLaborer.length === 0) {
      return NextResponse.json(
        { error: 'Laborer not found', code: 'LABORER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const submittedAt = new Date().toISOString();

    // Create task proof (photos optional, defaults to empty array)
    const newProof = await db
      .insert(taskProofs)
      .values({
        applicationId: parseInt(applicationId),
        taskId: parseInt(taskId),
        laborerId: parseInt(laborerId),
        photos: photos || [],
        notes: notes || null,
        locationLat: locationLat ? parseFloat(locationLat) : null,
        locationLng: locationLng ? parseFloat(locationLng) : null,
        submittedAt,
      })
      .returning();

    // Update application status to completed
    const completedAt = new Date().toISOString();
    await db
      .update(applications)
      .set({
        status: 'completed',
        completedAt,
      })
      .where(eq(applications.id, parseInt(applicationId)));

    // Update task status to completed
    await db
      .update(tasks)
      .set({ status: 'completed' })
      .where(eq(tasks.id, parseInt(taskId)));

    return NextResponse.json(newProof[0], { status: 201 });
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
    const taskId = searchParams.get('task_id');
    const laborerId = searchParams.get('laborer_id');
    const applicationId = searchParams.get('application_id');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Single record by ID with JOINs
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const proof = await db
        .select({
          id: taskProofs.id,
          applicationId: taskProofs.applicationId,
          taskId: taskProofs.taskId,
          laborerId: taskProofs.laborerId,
          photos: taskProofs.photos,
          notes: taskProofs.notes,
          locationLat: taskProofs.locationLat,
          locationLng: taskProofs.locationLng,
          submittedAt: taskProofs.submittedAt,
          laborer: {
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            location: users.location,
          },
          task: {
            id: tasks.id,
            taskName: tasks.taskName,
            description: tasks.description,
            category: tasks.category,
            location: tasks.location,
            reward: tasks.reward,
            status: tasks.status,
          },
        })
        .from(taskProofs)
        .leftJoin(users, eq(taskProofs.laborerId, users.id))
        .leftJoin(tasks, eq(taskProofs.taskId, tasks.id))
        .where(eq(taskProofs.id, parseInt(id)))
        .limit(1);

      if (proof.length === 0) {
        return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
      }

      return NextResponse.json(proof[0], { status: 200 });
    }

    // List with filters and JOINs
    let query = db
      .select({
        id: taskProofs.id,
        applicationId: taskProofs.applicationId,
        taskId: taskProofs.taskId,
        laborerId: taskProofs.laborerId,
        photos: taskProofs.photos,
        notes: taskProofs.notes,
        locationLat: taskProofs.locationLat,
        locationLng: taskProofs.locationLng,
        submittedAt: taskProofs.submittedAt,
        laborer: {
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          location: users.location,
        },
        task: {
          id: tasks.id,
          taskName: tasks.taskName,
          description: tasks.description,
          category: tasks.category,
          location: tasks.location,
          reward: tasks.reward,
          status: tasks.status,
        },
      })
      .from(taskProofs)
      .leftJoin(users, eq(taskProofs.laborerId, users.id))
      .leftJoin(tasks, eq(taskProofs.taskId, tasks.id));

    // Apply filters
    const conditions = [];

    if (taskId) {
      if (isNaN(parseInt(taskId))) {
        return NextResponse.json(
          { error: 'Valid task ID is required', code: 'INVALID_TASK_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(taskProofs.taskId, parseInt(taskId)));
    }

    if (laborerId) {
      if (isNaN(parseInt(laborerId))) {
        return NextResponse.json(
          { error: 'Valid laborer ID is required', code: 'INVALID_LABORER_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(taskProofs.laborerId, parseInt(laborerId)));
    }

    if (applicationId) {
      if (isNaN(parseInt(applicationId))) {
        return NextResponse.json(
          { error: 'Valid application ID is required', code: 'INVALID_APPLICATION_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(taskProofs.applicationId, parseInt(applicationId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Order by submittedAt descending (newest first)
    const proofs = await query
      .orderBy(desc(taskProofs.submittedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(proofs, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
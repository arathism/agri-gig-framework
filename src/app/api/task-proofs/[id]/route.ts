import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taskProofs, users, tasks, applications } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        },
        { status: 400 }
      );
    }

    const proofId = parseInt(id);

    // Query with JOINs to get enriched proof data
    const result = await db
      .select({
        proof: taskProofs,
        laborer: users,
        task: tasks,
        application: applications
      })
      .from(taskProofs)
      .innerJoin(users, eq(taskProofs.laborerId, users.id))
      .innerJoin(tasks, eq(taskProofs.taskId, tasks.id))
      .innerJoin(applications, eq(taskProofs.applicationId, applications.id))
      .where(eq(taskProofs.id, proofId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { 
          error: 'Task proof not found',
          code: 'PROOF_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const { proof, laborer, task, application } = result[0];

    return NextResponse.json({
      proof,
      laborer,
      task,
      application
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taskProofs, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
    const body = await request.json();
    const { verified } = body;

    if (typeof verified !== 'boolean') {
      return NextResponse.json(
        { 
          error: "Verified must be a boolean value",
          code: "INVALID_VERIFIED" 
        },
        { status: 400 }
      );
    }

    // Check if proof exists
    const existingProof = await db
      .select()
      .from(taskProofs)
      .where(eq(taskProofs.id, proofId))
      .limit(1);

    if (existingProof.length === 0) {
      return NextResponse.json(
        { 
          error: 'Task proof not found',
          code: 'PROOF_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const proof = existingProof[0];

    // If verified, update task status to 'verified'
    if (verified) {
      await db
        .update(tasks)
        .set({ status: 'verified' })
        .where(eq(tasks.id, proof.taskId));
    }

    return NextResponse.json({ 
      success: true,
      message: 'Task verified successfully',
      taskId: proof.taskId
    }, { status: 200 });

  } catch (error) {
    console.error('PATCH verify error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}
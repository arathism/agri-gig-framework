import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { withdrawalRequests, users, transactions } from '@/db/schema';
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
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Fetch withdrawal with laborer details using JOIN
    const result = await db
      .select({
        withdrawal: withdrawalRequests,
        laborer: users,
      })
      .from(withdrawalRequests)
      .leftJoin(users, eq(withdrawalRequests.laborerId, users.id))
      .where(eq(withdrawalRequests.id, parseInt(id)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Withdrawal request not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0], { status: 200 });
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

    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required', code: 'MISSING_STATUS' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'processing', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    // Check if withdrawal exists
    const existingWithdrawal = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, parseInt(id)))
      .limit(1);

    if (existingWithdrawal.length === 0) {
      return NextResponse.json(
        { error: 'Withdrawal request not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const withdrawal = existingWithdrawal[0];

    // Prepare update data
    const updateData: {
      status: string;
      processedAt?: string;
    } = {
      status,
    };

    // Auto-update processedAt when status changes to completed or rejected
    if (status === 'completed' || status === 'rejected') {
      updateData.processedAt = new Date().toISOString();
    }

    // Update withdrawal request
    const updated = await db
      .update(withdrawalRequests)
      .set(updateData)
      .where(eq(withdrawalRequests.id, parseInt(id)))
      .returning();

    // Create transaction record when withdrawal is completed
    if (status === 'completed') {
      await db.insert(transactions).values({
        taskId: 0, // No specific task for withdrawal
        farmerId: withdrawal.laborerId, // Using laborerId as a placeholder
        laborerId: withdrawal.laborerId,
        amount: withdrawal.amount,
        type: 'withdrawal',
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
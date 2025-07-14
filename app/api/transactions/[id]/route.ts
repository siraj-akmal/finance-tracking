import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('API: Updating transaction with ID:', params.id);
    const body = await request.json();
    console.log('API: Request body:', body);
    
    const { description, category, amount, edited } = body;

    const sql = `
      UPDATE transactions 
      SET description = ?, category = ?, amount = ?, edited = ?
      WHERE id = ?
    `;

    console.log('API: SQL:', sql);
    console.log('API: Params:', [description, category, amount, edited, params.id]);

    const result = await query(sql, [description, category, amount, edited, params.id]);
    console.log('API: Update result:', result);

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = 'DELETE FROM transactions WHERE id = ?';
    await query(sql, [params.id]);

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
} 
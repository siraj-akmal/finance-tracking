import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching transactions...');
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const category = searchParams.get('category');
    const limit = searchParams.get('limit') || '100';

    console.log('API: Params:', { month, category, limit });

    let sql = 'SELECT * FROM transactions';
    const params: any[] = [];
    const conditions: string[] = [];

    if (month) {
      conditions.push('month = ?');
      params.push(month);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Inline the limit value directly in the SQL string
    sql += ` ORDER BY date DESC LIMIT ${parseInt(limit)}`;

    console.log('API: SQL:', sql);
    console.log('API: Params:', params);

    const transactions = await query(sql, params);
    console.log('API: Found', Array.isArray(transactions) ? transactions.length : 'unknown', 'transactions');

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, description, amount, category, bank, month } = body;

    // Ensure amount is negative for expenses
    let finalAmount = Number(amount);
    if (finalAmount > 0) {
      finalAmount = -Math.abs(finalAmount);
    }

    const sql = `
      INSERT INTO transactions (date, description, amount, category, bank, month)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [date, description, finalAmount, category, bank, month]);

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction added successfully',
      id: (result as any).insertId 
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    return NextResponse.json(
      { error: 'Failed to add transaction' },
      { status: 500 }
    );
  }
} 
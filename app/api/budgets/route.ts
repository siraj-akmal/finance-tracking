import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    let sql = 'SELECT * FROM budgets';
    const params: any[] = [];

    if (month) {
      sql += ' WHERE month = ?';
      params.push(month);
    }

    sql += ' ORDER BY budgeted DESC';

    const budgets = await query(sql, params);

    return NextResponse.json({ budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, category, budgeted, spent, remaining } = body;

    const sql = `
      INSERT INTO budgets (month, category, budgeted, spent, remaining)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      budgeted = VALUES(budgeted),
      spent = VALUES(spent),
      remaining = VALUES(remaining)
    `;

    await query(sql, [month, category, budgeted, spent, remaining]);

    return NextResponse.json({ 
      success: true, 
      message: 'Budget saved successfully'
    });
  } catch (error) {
    console.error('Error saving budget:', error);
    return NextResponse.json(
      { error: 'Failed to save budget' },
      { status: 500 }
    );
  }
} 
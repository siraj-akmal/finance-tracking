import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Global budgets are rows where month = '' (not tied to a specific month).
    const sql = `
      SELECT DISTINCT category, budgeted
      FROM budgets
      WHERE month = ''
      ORDER BY budgeted DESC
    `;
    const budgets = await query(sql);
    return NextResponse.json({ budgets });
  } catch (error) {
    console.error('Error fetching global budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch global budgets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, budgeted } = body;

    // Upsert: update if a global budget for this category already exists,
    // otherwise insert. The budgets table only stores (category, budgeted, month).
    // 'spent' and 'remaining' are computed at read time — never stored.
    const existing = await query<{ id: number }[]>(
      'SELECT id FROM budgets WHERE category = ? AND month = ""',
      [category],
    );

    if (Array.isArray(existing) && existing.length > 0) {
      await query(
        'UPDATE budgets SET budgeted = ? WHERE category = ? AND month = ""',
        [budgeted, category],
      );
    } else {
      await query(
        'INSERT INTO budgets (category, budgeted, month) VALUES (?, ?, "")',
        [category, budgeted],
      );
    }

    return NextResponse.json({ success: true, message: 'Global budget saved successfully' });
  } catch (error) {
    console.error('Error saving global budget:', error);
    return NextResponse.json({ error: 'Failed to save global budget' }, { status: 500 });
  }
}

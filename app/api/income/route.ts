import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    let sql = 'SELECT * FROM income';
    const params: any[] = [];

    if (month) {
      sql += ' WHERE month = ?';
      params.push(month);
    }

    sql += ' ORDER BY month DESC, type';

    const income = await query(sql, params);

    return NextResponse.json({ income });
  } catch (error) {
    console.error('Error fetching income:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, type, description, amount } = body;

    const sql = `
      INSERT INTO income (month, type, description, amount)
      VALUES (?, ?, ?, ?)
    `;

    const result = await query(sql, [month, type, description, amount]);

    return NextResponse.json({ 
      success: true, 
      message: 'Income added successfully',
      id: (result as any).insertId 
    });
  } catch (error) {
    console.error('Error adding income:', error);
    return NextResponse.json(
      { error: 'Failed to add income' },
      { status: 500 }
    );
  }
} 
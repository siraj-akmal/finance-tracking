import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Get global budget settings (not tied to specific months)
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
    return NextResponse.json(
      { error: 'Failed to fetch global budgets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, budgeted } = body;

    // Check if global budget for this category already exists
    const checkSql = 'SELECT id FROM budgets WHERE category = ? AND month = ""';
    const existing = await query(checkSql, [category]);

    if (existing && Array.isArray(existing) && existing.length > 0) {
      // Update existing global budget
      const updateSql = 'UPDATE budgets SET budgeted = ? WHERE category = ? AND month = ""';
      await query(updateSql, [budgeted, category]);
    } else {
      // Insert new global budget
      const insertSql = 'INSERT INTO budgets (category, budgeted, month, spent, remaining) VALUES (?, ?, "", 0, ?)';
      await query(insertSql, [category, budgeted, budgeted]);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Global budget saved successfully'
    });
  } catch (error) {
    console.error('Error saving global budget:', error);
    return NextResponse.json(
      { error: 'Failed to save global budget' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get all unique months from transactions, income, and savings tables
    const [transactionMonths, incomeMonths, savingsMonths] = await Promise.all([
      query('SELECT DISTINCT month FROM transactions WHERE month IS NOT NULL AND month != "" ORDER BY month DESC'),
      query('SELECT DISTINCT month FROM income WHERE month IS NOT NULL AND month != "" ORDER BY month DESC'),
      query('SELECT DISTINCT month FROM savings WHERE month IS NOT NULL AND month != "" ORDER BY month DESC')
    ]);

    // Combine all months and remove duplicates
    const allMonths = new Set<string>();
    
    (transactionMonths as any[]).forEach((row: any) => allMonths.add(row.month));
    (incomeMonths as any[]).forEach((row: any) => allMonths.add(row.month));
    (savingsMonths as any[]).forEach((row: any) => allMonths.add(row.month));

    // Convert to array and sort in descending order (newest first)
    const months = Array.from(allMonths).sort((a, b) => b.localeCompare(a));

    // Format months for display
    const formattedMonths = months.map(month => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
      return {
        value: month,
        label: `${monthName} ${year}`
      };
    });

    return NextResponse.json({ months: formattedMonths });
  } catch (error) {
    console.error('Error fetching months:', error);
    return NextResponse.json(
      { error: 'Failed to fetch months' },
      { status: 500 }
    );
  }
} 
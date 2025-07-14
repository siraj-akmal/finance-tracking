import { NextRequest, NextResponse } from 'next/server';
import { query, convertDecimalToNumber } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '2024-06';

    // Get total spending for the month
    const spendingResult = await query(`
      SELECT SUM(ABS(amount)) as totalSpend 
      FROM transactions 
      WHERE month = ? AND amount < 0
    `, [month]);

    // Get total income for the month
    const incomeResult = await query(`
      SELECT SUM(amount) as totalIncome 
      FROM income 
      WHERE month = ?
    `, [month]);

    // Get total savings for the month
    const savingsResult = await query(`
      SELECT SUM(amount) as totalSavings 
      FROM savings 
      WHERE month = ?
    `, [month]);

    // Get total investments for the month (treating investments as budget deductions)
    const investmentsResult = await query(`
      SELECT SUM(amount) as totalInvestments 
      FROM savings 
      WHERE month = ? AND type IN ('investment', 'stocks', 'bonds', 'crypto', 'etf', 'mutual-fund', 'real-estate', '401k', 'ira', 'roth-ira')
    `, [month]);

    // Get global budget settings (not tied to specific months)
    const globalBudgets = await query(`
      SELECT category, budgeted
      FROM budgets 
      WHERE month = ''
      ORDER BY budgeted DESC
    `);

    // Get spending by category for the month
    const categorySpending = await query(`
      SELECT 
        category,
        SUM(ABS(amount)) as total
      FROM transactions 
      WHERE month = ? AND amount < 0
      GROUP BY category
      ORDER BY total DESC
    `, [month]);

    // Calculate budget vs actual by combining global budgets with current month's spending
    const budgetVsActual = (globalBudgets as any[]).map(budget => {
      const categorySpent = (categorySpending as any[]).find(spending => spending.category === budget.category);
      const spent = categorySpent ? convertDecimalToNumber(categorySpent.total) : 0;
      const budgeted = convertDecimalToNumber(budget.budgeted);
      
      return {
        category: budget.category,
        budgeted: budgeted,
        spent: spent,
        remaining: budgeted - spent
      };
    });

    // Calculate total budget variance
    const totalBudgeted = (globalBudgets as any[]).reduce((sum, budget) => sum + convertDecimalToNumber(budget.budgeted), 0);
    const totalSpent = (categorySpending as any[]).reduce((sum, spending) => sum + convertDecimalToNumber(spending.total), 0);
    const totalInvestments = convertDecimalToNumber((investmentsResult as any)[0]?.totalInvestments);
    
    // Budget variance now includes investments as deductions
    const budgetVariance = totalBudgeted - totalSpent - totalInvestments;

    // Convert to numbers and handle null values using the utility function
    const totalSpend = convertDecimalToNumber((spendingResult as any)[0]?.totalSpend);
    const totalIncome = convertDecimalToNumber((incomeResult as any)[0]?.totalIncome);
    const totalSavings = convertDecimalToNumber((savingsResult as any)[0]?.totalSavings);

    // Convert category spending to proper format
    const formattedCategorySpending = (categorySpending as any[]).map(item => ({
      category: item.category,
      total: convertDecimalToNumber(item.total)
    }));

    // Budget vs actual is already formatted from the calculation above
    const formattedBudgetVsActual = budgetVsActual;

    return NextResponse.json({
      metrics: {
        totalSpend,
        totalIncome,
        totalSavings,
        totalInvestments,
        budgetVariance,
      },
      categorySpending: formattedCategorySpending,
      budgetVsActual: formattedBudgetVsActual,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 
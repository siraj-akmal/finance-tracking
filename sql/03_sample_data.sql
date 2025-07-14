-- Sample data for Personal Finance Tracker
-- Run this script after creating tables to populate with test data

USE finance_tracker;

-- Sample transactions for testing
INSERT INTO transactions (date, description, amount, category, bank, month, llmCategorized) VALUES
('2024-01-15', 'Starbucks Coffee', -5.75, 'Food & Drink', 'AMEX', '2024-01', TRUE),
('2024-01-16', 'Whole Foods Market', -45.20, 'Groceries', 'AMEX', '2024-01', TRUE),
('2024-01-17', 'Uber Ride', -12.50, 'Transportation', 'AMEX', '2024-01', TRUE),
('2024-01-18', 'Netflix Subscription', -15.99, 'Subscriptions', 'AMEX', '2024-01', TRUE),
('2024-01-19', 'Amazon.com', -89.99, 'Shopping', 'AMEX', '2024-01', TRUE),
('2024-01-20', 'Gym Membership', -29.99, 'Health & Wellness', 'AMEX', '2024-01', TRUE),
('2024-01-21', 'Restaurant Dinner', -65.00, 'Food & Drink', 'AMEX', '2024-01', TRUE),
('2024-01-22', 'Gas Station', -45.00, 'Transportation', 'AMEX', '2024-01', TRUE),
('2024-01-23', 'Movie Theater', -24.00, 'Lifestyle & Entertainment', 'AMEX', '2024-01', TRUE),
('2024-01-24', 'Pharmacy', -12.50, 'Health & Wellness', 'AMEX', '2024-01', TRUE);

-- Sample income for testing
INSERT INTO income (month, amount, type, description) VALUES
('2024-01', 5000.00, 'salary', 'Monthly Salary'),
('2024-01', 500.00, 'freelance', 'Freelance Project');

-- Sample savings for testing
INSERT INTO savings (month, amount, type, description) VALUES
('2024-01', 1000.00, 'savings', 'Emergency Fund'),
('2024-01', 500.00, 'investment', '401k Contribution');

-- Sample budget allocations
UPDATE budgets SET budgeted = 2000.00 WHERE category = 'Housing';
UPDATE budgets SET budgeted = 400.00 WHERE category = 'Food & Drink';
UPDATE budgets SET budgeted = 300.00 WHERE category = 'Groceries';
UPDATE budgets SET budgeted = 200.00 WHERE category = 'Transportation';
UPDATE budgets SET budgeted = 150.00 WHERE category = 'Lifestyle & Entertainment';
UPDATE budgets SET budgeted = 300.00 WHERE category = 'Shopping';
UPDATE budgets SET budgeted = 100.00 WHERE category = 'Subscriptions';
UPDATE budgets SET budgeted = 150.00 WHERE category = 'Health & Wellness';
UPDATE budgets SET budgeted = 100.00 WHERE category = 'Gifts & Donations';
UPDATE budgets SET budgeted = 200.00 WHERE category = 'Travel';
UPDATE budgets SET budgeted = 100.00 WHERE category = 'Miscellaneous'; 
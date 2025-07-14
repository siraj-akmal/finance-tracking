-- Create tables for Personal Finance Tracker
-- Run this script after creating the database

USE finance_tracker;

-- Transactions table - stores all credit card transactions
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  bank VARCHAR(50),
  month VARCHAR(7),
  llmCategorized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_month (month),
  INDEX idx_category (category),
  INDEX idx_date (date)
);

-- Budgets table - stores monthly budget allocations by category
CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  budgeted DECIMAL(10,2) NOT NULL,
  month VARCHAR(7) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_month (month)
);

-- Income table - tracks monthly income sources
CREATE TABLE IF NOT EXISTS income (
  id INT AUTO_INCREMENT PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) DEFAULT 'salary',
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_month (month),
  INDEX idx_type (type)
);

-- Savings table - tracks monthly savings and investments
CREATE TABLE IF NOT EXISTS savings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) DEFAULT 'savings',
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_month (month),
  INDEX idx_type (type)
);

-- Insert default budget categories
INSERT IGNORE INTO budgets (category, budgeted, month) VALUES
('Housing', 0.00, ''),
('Food & Drink', 0.00, ''),
('Groceries', 0.00, ''),
('Transportation', 0.00, ''),
('Lifestyle & Entertainment', 0.00, ''),
('Shopping', 0.00, ''),
('Subscriptions', 0.00, ''),
('Health & Wellness', 0.00, ''),
('Gifts & Donations', 0.00, ''),
('Travel', 0.00, ''),
('Miscellaneous', 0.00, ''); 
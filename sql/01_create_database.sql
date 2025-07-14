-- Create database and user for Personal Finance Tracker
-- Run this script as MySQL root user

-- Create the database
CREATE DATABASE IF NOT EXISTS finance_tracker;

-- Create a dedicated user for the application
CREATE USER IF NOT EXISTS 'finance_user'@'localhost' IDENTIFIED BY 'your_password';

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON finance_tracker.* TO 'finance_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Switch to the database
USE finance_tracker; 
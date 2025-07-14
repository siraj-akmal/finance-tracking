# SQL Scripts for Personal Finance Tracker

This folder contains SQL scripts to set up the database for the Personal Finance Tracker application.

## Script Execution Order

Run these scripts in the following order:

### 1. `01_create_database.sql`
- Creates the `finance_tracker` database
- Creates a dedicated user `finance_user` with appropriate privileges
- **Run as MySQL root user**

### 2. `02_create_tables.sql`
- Creates all necessary tables with proper indexes
- Sets up the database schema
- Inserts default budget categories
- **Run as `finance_user` or root user**

### 3. `03_sample_data.sql` (Optional)
- Populates the database with sample data for testing
- Includes sample transactions, income, savings, and budget allocations
- **Run as `finance_user` or root user**

## Database Schema

### Tables

- **`transactions`**: Stores credit card transactions with AI categorization
- **`budgets`**: Monthly budget allocations by category
- **`income`**: Monthly income sources
- **`savings`**: Monthly savings and investments

### Key Features

- All tables include proper indexes for performance
- Timestamps for audit trails
- Support for AI-categorized transactions
- Flexible category system

## Running the Scripts

```bash
# As MySQL root user
mysql -u root -p < sql/01_create_database.sql

# As finance_user (after updating password in the script)
mysql -u finance_user -p < sql/02_create_tables.sql

# Optional: Add sample data
mysql -u finance_user -p < sql/03_sample_data.sql
```

## Security Notes

- Update the password in `01_create_database.sql` before running
- The `finance_user` has minimal required privileges
- All financial data is stored locally 
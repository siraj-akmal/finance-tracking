## Project Overview

This application transforms your credit card statements into actionable financial insights. Simply upload your CSV statements from AMEX, and the AI will automatically categorize your transactions, track your spending patterns, and help you stay on budget.

### Key Features

- **🤖 AI-Powered Categorization**: Automatically categorizes transactions using local AI (Ollama)
- **📊 Interactive Dashboard**: Visual charts and metrics showing spending trends, category breakdowns, and budget vs. actual comparisons
- **💰 Budget Management**: Set monthly budgets by category and track your progress
- **📈 Monthly Trends**: See how your spending patterns change over time
- **📱 Modern UI**: interface built with Next.js and Tailwind CSS
- **🔒 Local Processing**: Your financial data stays on your machine - no cloud processing required

## Tools & Technologies

### Required Software

- **Node.js** (v18 or higher)
- **MySQL** (v8.0 or higher)
- **Ollama** (for AI-powered transaction categorization)
- **pnpm** (recommended) or npm

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Charts**: Recharts
- **Database**: MySQL
- **AI**: Ollama with Mistral model
- **Package Manager**: pnpm

## Local Setup

### Prerequisites

1. **Install Node.js**: Download and install from [nodejs.org](https://nodejs.org/)
2. **Install MySQL**: 
   - **macOS**: `brew install mysql` or download from [mysql.com](https://dev.mysql.com/downloads/mysql/)
   - **Windows**: Download from [mysql.com](https://dev.mysql.com/downloads/mysql/)
   - **Linux**: `sudo apt install mysql-server` (Ubuntu/Debian)
3. **Install Ollama**: Follow instructions at [ollama.ai](https://ollama.ai/)
4. **Install pnpm**: `npm install -g pnpm`

### Database Setup

1. **Start MySQL service**:
   ```bash
   # macOS
   brew services start mysql
   
   # Windows/Linux
   sudo systemctl start mysql
   ```

2. **Set up the database** using the provided SQL scripts:
   ```bash
   # Create database and user (run as MySQL root)
   mysql -u root -p < sql/01_create_database.sql
   
   # Create tables and schema (run as finance_user)
   mysql -u finance_user -p < sql/02_create_tables.sql
   
   # Optional: Add sample data for testing
   mysql -u finance_user -p < sql/03_sample_data.sql
   ```
   
   **Note**: Update the password in `sql/01_create_database.sql` before running the scripts.

### Ollama Setup

1. **Install Ollama** following the instructions at [ollama.ai](https://ollama.ai/)

2. **Pull the Mistral model**:
   ```bash
   ollama pull mistral:latest
   ```

3. **Start Ollama service**:
   ```bash
   ollama serve
   ```

### Application Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd finance-tracker
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DB_HOST=localhost
   DB_NAME=finance_tracker
   DB_USER=finance_user
   DB_PASSWORD=your_password
   ```

4. **Start the development server**:
   ```bash
   pnpm dev
   ```

5. **Open your browser** and navigate to `http://localhost:3000`

## 📁 Project Structure

```
finance-tracker/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── *.tsx             # Feature components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and database
├── scripts/              # Node.js scripts for data processing
├── sql/                  # Database setup scripts
│   ├── 01_create_database.sql
│   ├── 02_create_tables.sql
│   ├── 03_sample_data.sql
│   └── README.md
└── uploads/              # Temporary file uploads
```

## How to Use

### 1. Upload Your Statements

1. Go to the "Upload CSV" tab
3. Choose your CSV file
4. The AI will automatically categorize your transactions

### 2. Set Your Budgets

1. Go to the "Budget" tab
2. Set monthly budgets for each spending category
3. Track your progress throughout the month

### 3. Track Income & Savings

1. Go to the "Income & Savings" tab
2. Add your monthly income and savings
3. Monitor your financial health

### 4. Analyze Your Spending

1. Use the Dashboard to see spending trends
2. Click on categories in charts to drill down
3. Compare actual spending vs. budgets

## 🔧 Configuration


### AI Categorization

The app uses Ollama with the Mistral model to categorize transactions into these categories:
- Food & Drink
- Groceries
- Transportation
- Lifestyle & Entertainment
- Shopping
- Subscriptions
- Health & Wellness
- Gifts & Donations
- Travel
- Miscellaneous

**Happy budgeting! 💰** 

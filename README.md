# Kira RUL System

Kira RUL System is a full-stack SaaS asset management platform with integrated AI capabilities to predict the **Remaining Useful Life (RUL)** of assets and classify the severity of maintenance tasks.

## 🚀 Features

- **Asset Management Dashboard:** Track and manage all your assets in one centralized interface.
- **RUL Prediction:** Utilize AI models to simulate and predict the remaining useful life of assets based on maintenance records and usage.
- **Maintenance Severity Classification:** Automatically classify the severity of maintenance tasks based on underlying causes.
- **Modern UI:** Built with Next.js, Tailwind CSS, and Recharts for dynamic and interactive data visualization.
- **Robust Backend:** Powered by Node.js, Express, and Prisma ORM connecting to a PostgreSQL database.

## 🛠️ Technology Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Recharts, Lucide React
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL (via Prisma)
- **AI/ML Engine:** Custom AI prediction module (`kira-ai-engine`)
- **Workflow:** Concurrently runs both frontend and backend for seamless development.

## 📂 Project Structure

This project is a monorepo containing the following workspaces:

```text
kira-rul-system/
├── kira-frontend/     # Next.js frontend application
├── kira-backend/      # Express.js REST API and Prisma ORM
├── kira-ai-engine/    # AI/ML services for RUL prediction
└── package.json       # Root configuration for running concurrent scripts
```

## 💻 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/syhenn1/kira-rul-system.git
   cd kira-rul-system
   ```

2. **Install Root Dependencies:**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies:**
   ```bash
   cd kira-backend
   npm install
   ```

4. **Install Frontend Dependencies:**
   ```bash
   cd ../kira-frontend
   npm install
   ```

### Database Setup

1. Navigate to the `kira-backend` directory.
2. Create a `.env` file and configure your `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/kira_db?schema=public"
   ```
3. Run Prisma migrations to set up the database schema:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

### Running the Application (Development Mode)

From the **root directory** (`kira-rul-system`), you can start both the frontend and backend simultaneously:

```bash
npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000 (or as configured in your backend)

## 📄 License

This project is licensed under the ISC License.

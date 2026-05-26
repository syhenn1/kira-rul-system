# Kira RUL System

Kira RUL System is a full-stack asset management platform with integrated AI capabilities to predict the **Remaining Useful Life (RUL)** of assets and classify the severity of maintenance tasks.

## Technology Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **AI Engine:** FastAPI (Python), scikit-learn, Gradient Boosting model

## Project Structure

```
kira-rul-system/
├── kira-frontend/      # Next.js frontend (port 3000)
├── kira-backend/       # Express REST API + Prisma ORM (port 3001)
├── kira-ai-engine/     # FastAPI RUL prediction service (port 8000)
└── package.json        # Root scripts — runs all three concurrently
```

## Prerequisites

- Node.js v18 or higher
- Python 3.10 or higher
- PostgreSQL

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/syhenn1/kira-rul-system.git
cd kira-rul-system
```

### 2. Install Node.js dependencies

```bash
# Root (concurrently)
npm install

# Backend
cd kira-backend && npm install && cd ..

# Frontend
cd kira-frontend && npm install && cd ..
```

### 3. Set up Python virtual environment (AI Engine)

```bash
cd kira-ai-engine
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
cd ..
```

> On macOS/Linux: use `source venv/bin/activate` and `pip install -r requirements.txt` instead.

### 4. Configure environment variables

**Backend** — copy `.env.example` to `.env` inside `kira-backend/`:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
AI_ENGINE_URL=http://localhost:8000

DATABASE_URL=postgresql://postgres:password@localhost:5010/my_asset_db?schema=public

JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

**Frontend** — copy `.env.local.example` to `.env.local` inside `kira-frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Set up the database

```bash
cd kira-backend
npx prisma migrate dev
npx prisma generate
```

To seed initial data:

```bash
npm run seed
```

## Running in Development

From the **root directory**, run all three services at once:

```bash
npm run dev
```

| Service    | URL                   |
|------------|-----------------------|
| Frontend   | http://localhost:3000 |
| Backend    | http://localhost:3001 |
| AI Engine  | http://localhost:8000 |

Individual scripts are also available:

```bash
npm run dev:frontend   # Next.js only
npm run dev:backend    # Express only
npm run dev:ai         # FastAPI only
```

## AI Engine Notes

The AI engine uses a pre-trained Gradient Boosting model stored as a `.joblib` file in `kira-ai-engine/`. If the model file is missing, the engine falls back to a mock predictor that returns simulated RUL values for testing purposes.

The model file expected: `v2_gradient_boosting_model_retrained_new_data.joblib`

Prediction endpoint: `POST http://localhost:8000/predict`

## License

ISC

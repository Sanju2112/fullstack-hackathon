# Wellnest — Personal Wellness Planner

A private, lifestyle-focused planner for water, movement, sleep, and mindfulness habits. It is not a medical diagnosis or advice tool.

## Run locally

1. Copy `.env.example` to `.env.local` and set a MongoDB connection string plus a long `JWT_SECRET`.
2. Run `npm install`.
3. Run `npm run dev`, then open `http://localhost:3000`.

## Included

- JWT authentication in an HTTP-only cookie
- MongoDB-backed users, daily entries, and personalized goals
- Daily progress controls, completion score, streaks, and a seven-day trend chart
- Responsive dashboard and goal editor

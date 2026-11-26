# UCU Campus Lost and Found System

A responsive React + Express + MySQL application for reporting lost/found campus items, searching reports, submitting private ownership claims, and administering collection/returns.

## Technology
- React and Vite (frontend)
- Node.js and Express (REST API)
- MySQL 8+ (persistent database)
- bcryptjs (password hashing), JWT (authentication), Multer (optional item photographs)

## Requirements
Install Node.js LTS, MySQL Server, Git, and Visual Studio Code.

## 1. Create the database
Open MySQL Workbench or the MySQL command line and run `database/schema.sql`.
Then optionally run `database/sample-data.sql` for fictional campus locations/categories. It does not create accounts.

## 2. Configure the backend
Open `server/.env.example`, copy it to `server/.env`, and set your own MySQL username/password and a long random JWT secret.

Example:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ucu_lost_found
JWT_SECRET=replace_with_a_long_random_secret
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```
Never commit `.env` or real credentials to GitHub.

## 3. Install dependencies
From the project root in the VS Code terminal:
```
npm install
npm --prefix server install
npm --prefix client install
```

## 4. Create the first administrator
After configuring `server/.env`, run:
```
npm --prefix server run create-admin
```
Enter the administrator name, email and password when prompted. Keep these credentials private.

## 5. Start the application
From the project root:
```
npm run dev
```
Open http://localhost:5173. The API runs at http://localhost:5000/api.

## Main workflow
1. Register a student account and log in.
2. Submit a lost or found report.
3. Search and filter reports from the Browse Items page.
4. A student can submit a private claim on an open found report (not their own found report).
5. Log in as the administrator to review claims and approve/reject them with a reason.
6. After the student collects the item, the administrator confirms return.

## Security notes
- Passwords are hashed using bcryptjs.
- JWT authentication is required for private actions.
- Student ownership checks and administrator role checks are enforced by the API, not just the interface.
- Public report responses omit private identifying details and reporter contact information.
- Claim evidence is returned only to the claimant and administrator.
- The application uses fictional data for demonstration. Do not use real student personal information in sample data.
- For production deployment, use HTTPS, secure cookie/token handling, rate limiting, backups, stricter upload validation and a production secret manager.

## Useful folders
- `client/src`: React pages and styles
- `server/src`: Express API, middleware and database access
- `database`: schema and fictional reference data

## Manual test checklist
See `docs/TEST-PLAN.md`. Record actual results and screenshots during your own testing; do not mark tests as passed until you have run them.

## Examination reminder
This starter project supports the assignment requirements but you must understand, test, adapt, document and demonstrate your own work. Add your own milestone evidence, Git commits, deployed URL, final commit ID, report and presentation slides. Acknowledge permitted external/AI assistance according to your lecturer's rules.

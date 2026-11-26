# Manual test plan

Record the date, tester, actual result, pass/fail and screenshot/evidence for every test after running the application.

| ID | Test | Expected result |
|---|---|---|
| T01 | Register with valid name, email and 8+ character password | Student account is created and logged in |
| T02 | Register using an email already in use | Clear duplicate-email error |
| T03 | Log in with incorrect password | Access denied with a clear message |
| T04 | Submit a report with a required field missing | API rejects it and explains the missing information |
| T05 | Submit a found report with private details | Public browse response does not contain private details |
| T06 | Search by keyword, type, category and location | Only matching reports appear |
| T07 | Student edits their own open report | Report is updated |
| T08 | Student attempts to edit another user's report | API denies the action |
| T09 | Student claims an open found item with evidence | Claim is created and visible to claimant/admin only |
| T10 | Student tries to claim their own found report | API denies the claim |
| T11 | Student tries to claim a lost or returned item | API denies the claim |
| T12 | Administrator approves a pending claim with a reason | Claim becomes approved |
| T13 | Administrator attempts to approve a competing claim | API prevents a second approved claim |
| T14 | Administrator confirms physical collection after approval | Report status becomes returned |
| T15 | Student tries to access admin claim-review endpoint | API returns 403 |
| T16 | View app at mobile width and navigate by keyboard | Layout remains usable and focus is visible |

Important: this is a test plan, not proof that tests have already passed. Execute each test and record real results.

const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.post('/:reportId', authenticate, async (req, res, next) => {
  try {
    const { evidence } = req.body;
    if (!evidence?.trim()) return res.status(400).json({ message: 'Explain a private detail that helps prove ownership.' });
    const [reports] = await db.execute(
      "SELECT id,user_id,report_type,status FROM reports WHERE id=?",
      [req.params.reportId]
    );
    if (!reports.length || reports[0].report_type !== 'found' || reports[0].status !== 'open') {
      return res.status(400).json({ message: 'This found item is unavailable for claims.' });
    }
    if (reports[0].user_id === req.user.id) return res.status(403).json({ message: 'You cannot claim an item you reported as found.' });
    const [approved] = await db.execute("SELECT id FROM claims WHERE report_id=? AND status='approved'", [req.params.reportId]);
    if (approved.length) return res.status(409).json({ message: 'This item already has an approved claim.' });
    const [result] = await db.execute(
      'INSERT INTO claims (report_id,claimant_id,evidence) VALUES (?,?,?)',
      [req.params.reportId, req.user.id, evidence.trim()]
    );
    res.status(201).json({ message: 'Your private claim has been submitted.', claimId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'You have already submitted a claim for this item.' });
    next(err);
  }
});

router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT c.id,c.report_id,c.evidence,c.status,c.admin_response,c.created_at,
       r.title AS item_title,r.campus_location
       FROM claims c JOIN reports r ON r.id=c.report_id
       WHERE c.claimant_id=? ORDER BY c.created_at DESC`, [req.user.id]
    );
    res.json({ claims: rows });
  } catch (err) { next(err); }
});

router.get('/admin/all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT c.id,c.report_id,c.claimant_id,c.evidence,c.status,c.admin_response,c.created_at,
       r.title AS item_title,r.private_details,r.status AS item_status,
       u.full_name AS claimant_name,u.email AS claimant_email
       FROM claims c JOIN reports r ON r.id=c.report_id
       JOIN users u ON u.id=c.claimant_id ORDER BY c.created_at DESC`
    );
    res.json({ claims: rows });
  } catch (err) { next(err); }
});

router.patch('/:id/review', authenticate, requireAdmin, async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { decision, response } = req.body;
    if (!['approved','rejected'].includes(decision) || !response?.trim()) {
      return res.status(400).json({ message: 'Choose approve or reject and provide a reason.' });
    }
    await connection.beginTransaction();
    const [claims] = await connection.execute(
      `SELECT c.id,c.report_id,c.status,r.status AS item_status
       FROM claims c JOIN reports r ON r.id=c.report_id WHERE c.id=? FOR UPDATE`, [req.params.id]
    );
    if (!claims.length) { await connection.rollback(); return res.status(404).json({ message: 'Claim not found.' }); }
    const claim = claims[0];
    if (claim.status !== 'pending' || claim.item_status !== 'open') {
      await connection.rollback(); return res.status(409).json({ message: 'This claim is no longer pending or the item is no longer open.' });
    }
    if (decision === 'approved') {
      const [other] = await connection.execute(
        "SELECT id FROM claims WHERE report_id=? AND status='approved' AND id<>? FOR UPDATE",
        [claim.report_id, claim.id]
      );
      if (other.length) { await connection.rollback(); return res.status(409).json({ message: 'Another claim has already been approved for this item.' }); }
    }
    await connection.execute(
      `UPDATE claims SET status=?,admin_response=?,reviewed_by=?,reviewed_at=NOW() WHERE id=?`,
      [decision, response.trim(), req.user.id, claim.id]
    );
    await connection.commit();
    res.json({ message: `Claim ${decision}. Collection must still be confirmed before the item is marked returned.` });
  } catch (err) {
    await connection.rollback(); next(err);
  } finally { connection.release(); }
});

router.patch('/report/:reportId/return', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [approved] = await db.execute(
      "SELECT id FROM claims WHERE report_id=? AND status='approved'", [req.params.reportId]
    );
    if (!approved.length) return res.status(400).json({ message: 'Approve an ownership claim before confirming return.' });
    const [result] = await db.execute(
      "UPDATE reports SET status='returned' WHERE id=? AND report_type='found' AND status='open'",
      [req.params.reportId]
    );
    if (!result.affectedRows) return res.status(409).json({ message: 'Item is already returned or unavailable.' });
    res.json({ message: 'Collection confirmed. The item is now marked as returned.' });
  } catch (err) { next(err); }
});

module.exports = router;

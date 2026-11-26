const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const publicFields = `r.id,r.report_type,r.title,r.category,r.public_description,r.item_date,
 r.campus_location,r.photo_path,r.status,r.created_at,u.full_name AS reporter_name`;

router.get('/', async (req, res, next) => {
  try {
    const { q, type, category, location, date, status } = req.query;
    let sql = `SELECT ${publicFields} FROM reports r JOIN users u ON u.id=r.user_id WHERE 1=1`;
    const values = [];
    if (q) { sql += ' AND (r.title LIKE ? OR r.public_description LIKE ?)'; values.push(`%${q}%`, `%${q}%`); }
    if (type && ['lost','found'].includes(type)) { sql += ' AND r.report_type=?'; values.push(type); }
    if (category) { sql += ' AND r.category=?'; values.push(category); }
    if (location) { sql += ' AND r.campus_location LIKE ?'; values.push(`%${location}%`); }
    if (date) { sql += ' AND r.item_date=?'; values.push(date); }
    if (status && ['open','returned'].includes(status)) { sql += ' AND r.status=?'; values.push(status); }
    sql += ' ORDER BY r.created_at DESC';
    const [rows] = await db.execute(sql, values);
    res.json({ reports: rows });
  } catch (err) { next(err); }
});

router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT ${publicFields} FROM reports r JOIN users u ON u.id=r.user_id WHERE r.user_id=? ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ reports: rows });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { reportType, title, category, description, privateDetails, itemDate, campusLocation, photoPath } = req.body;
    if (!['lost','found'].includes(reportType) || !title?.trim() || !category?.trim() ||
        !description?.trim() || !itemDate || !campusLocation?.trim()) {
      return res.status(400).json({ message: 'Complete all required report fields.' });
    }
    if (reportType === 'lost' && privateDetails?.trim()) {
      return res.status(400).json({ message: 'Private identifying details are only for found-item reports.' });
    }
    const [result] = await db.execute(
      `INSERT INTO reports (user_id,report_type,title,category,public_description,private_details,item_date,campus_location,photo_path)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [req.user.id, reportType, title.trim(), category.trim(), description.trim(),
       reportType === 'found' ? (privateDetails || null) : null, itemDate, campusLocation.trim(), photoPath || null]
    );
    res.status(201).json({ message: 'Your report has been submitted.', reportId: result.insertId });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { title, category, description, itemDate, campusLocation } = req.body;
    if (!title?.trim() || !category?.trim() || !description?.trim() || !itemDate || !campusLocation?.trim()) {
      return res.status(400).json({ message: 'Complete all required report fields.' });
    }
    const [result] = await db.execute(
      `UPDATE reports SET title=?,category=?,public_description=?,item_date=?,campus_location=?
       WHERE id=? AND user_id=? AND status='open'`,
      [title.trim(), category.trim(), description.trim(), itemDate, campusLocation.trim(), req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Report not found, not yours, or no longer editable.' });
    res.json({ message: 'Report updated.' });
  } catch (err) { next(err); }
});

module.exports = router;

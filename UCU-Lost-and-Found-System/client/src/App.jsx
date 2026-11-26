import { useEffect, useMemo, useState } from 'react';
import { request, uploadPhoto } from './api';

const today = new Date().toISOString().slice(0, 10);
const emptyReport = { reportType: 'lost', title: '', category: 'Electronics', description: '', privateDetails: '', itemDate: today, campusLocation: '' };

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('browse');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState([]);
  const [claims, setClaims] = useState([]);
  const [filters, setFilters] = useState({ q: '', type: '', category: '', location: '', status: 'open' });
  const [authMode, setAuthMode] = useState('login');
  const [auth, setAuth] = useState({ fullName: '', email: '', password: '' });
  const [report, setReport] = useState(emptyReport);
  const [claimEvidence, setClaimEvidence] = useState({});
  const [reviewText, setReviewText] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k,v]) => { if (v) params.set(k,v); });
    return params.toString();
  }, [filters]);

  async function loadReports() {
    try { const data = await request(`/reports?${query}`); setReports(data.reports || []); }
    catch (e) { setError(e.message); }
  }
  async function loadMine() {
    try {
      const [r,c] = await Promise.all([request('/reports/mine'), request('/claims/mine')]);
      setReports(r.reports || []); setClaims(c.claims || []);
    } catch (e) { setError(e.message); }
  }
  async function loadAdmin() {
    try { const data = await request('/claims/admin/all'); setClaims(data.claims || []); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { loadReports(); }, [query]);
  useEffect(() => {
    const token = localStorage.getItem('ucu_token');
    if (token) request('/auth/me').then(d => setUser(d.user)).catch(() => localStorage.removeItem('ucu_token'));
  }, []);
  useEffect(() => { if (page === 'mine' && user) loadMine(); if (page === 'admin' && user?.role === 'admin') loadAdmin(); }, [page, user]);

  function notify(text) { setMessage(text); setError(''); }
  function fail(text) { setError(text); setMessage(''); }

  async function submitAuth(e) {
    e.preventDefault(); setBusy(true); fail('');
    try {
      const path = authMode === 'register' ? '/auth/register' : '/auth/login';
      const data = await request(path, { method: 'POST', body: JSON.stringify(auth) });
      localStorage.setItem('ucu_token', data.token); setUser(data.user); setAuth({ fullName:'', email:'', password:'' });
      setPage('browse'); notify(`Welcome, ${data.user.fullName}. You are logged in.`);
    } catch (e) { fail(e.message); } finally { setBusy(false); }
  }

  function logout() {
    localStorage.removeItem('ucu_token'); setUser(null); setPage('browse'); setClaims([]);
    notify('You have logged out.');
  }

  async function submitReport(e) {
    e.preventDefault(); setBusy(true); fail('');
    try {
      if (editingId) {
        await request(`/reports/${editingId}`, { method:'PUT', body:JSON.stringify({
          title:report.title, category:report.category, description:report.description,
          itemDate:report.itemDate, campusLocation:report.campusLocation
        }) });
        notify('Your report has been updated.');
      } else {
        let photoPath = null;
        if (selectedPhoto) photoPath = (await uploadPhoto(selectedPhoto)).photoPath;
        await request('/reports', { method:'POST', body:JSON.stringify({ ...report, photoPath }) });
        notify('Your report has been submitted.');
      }
      setReport(emptyReport); setSelectedPhoto(null); setEditingId(null); setPage('mine'); loadMine();
    } catch (e) { fail(e.message); } finally { setBusy(false); }
  }

  async function submitClaim(id) {
    try {
      await request(`/claims/${id}`, { method:'POST', body:JSON.stringify({ evidence:claimEvidence[id] || '' }) });
      setClaimEvidence({...claimEvidence, [id]:''}); notify('Your private ownership claim has been submitted.');
      if (page === 'mine') loadMine();
    } catch (e) { fail(e.message); }
  }

  async function reviewClaim(id, decision) {
    try {
      await request(`/claims/${id}/review`, { method:'PATCH', body:JSON.stringify({ decision, response:reviewText[id] || '' }) });
      notify(`Claim ${decision}.`); loadAdmin();
    } catch (e) { fail(e.message); }
  }

  async function confirmReturn(reportId) {
    if (!window.confirm('Confirm that the student has physically collected this item?')) return;
    try {
      const data = await request(`/claims/report/${reportId}/return`, { method:'PATCH', body:JSON.stringify({}) });
      notify(data.message); loadAdmin();
    } catch (e) { fail(e.message); }
  }

  function editReport(item) {
    setEditingId(item.id);
    setReport({ ...emptyReport, reportType:item.report_type, title:item.title, category:item.category,
      description:item.public_description, itemDate:String(item.item_date).slice(0,10), campusLocation:item.campus_location });
    setPage('report');
  }

  const nav = [
    ['browse','Browse items'], ['report','Report an item'],
    ...(user ? [['mine','My activity']] : []),
    ...(user?.role === 'admin' ? [['admin','Admin dashboard']] : [])
  ];

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setPage('browse')}}>
        <span className="brand-mark">U</span><span>UCU <b>Lost & Found</b><small>Campus item recovery</small></span>
      </a>
      <div className="account">
        {user ? <><span className="welcome">Hello, {user.fullName}</span><button className="btn btn-outline btn-small" onClick={logout}>Log out</button></>
          : <button className="btn btn-primary btn-small" onClick={()=>setPage('account')}>Student login</button>}
      </div>
    </header>

    <main className="container">
      <section className="hero">
        <div><p className="eyebrow">UGANDA CHRISTIAN UNIVERSITY</p><h1>Lost something?<br/><em>Find your way back to it.</em></h1>
          <p className="hero-copy">A shared place for the UCU community to report, search and safely recover lost belongings.</p></div>
        <div className="hero-art" aria-hidden="true"><span className="hero-circle">⌕</span><span className="float-card">✓ Item returned</span></div>
      </section>

      <nav className="tabs" aria-label="Main navigation">
        {nav.map(([key,label])=><button key={key} className={page===key?'tab active':'tab'} onClick={()=>{setPage(key);setMessage('');setError('')}}>{label}</button>)}
        {!user && <button className={page==='account'?'tab active':'tab'} onClick={()=>setPage('account')}>Sign in / Register</button>}
      </nav>

      {message && <div className="notice success" role="status">{message}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}

      {page==='browse' && <section>
        <div className="section-heading"><div><p className="eyebrow">COMMUNITY LISTINGS</p><h2>Browse reported items</h2><p>Search public descriptions. Private ownership details are never shown here.</p></div>
          <button className="btn btn-primary" onClick={()=>{if(!user){setPage('account');return;}setEditingId(null);setReport(emptyReport);setPage('report')}}>＋ Report an item</button></div>
        <div className="filter-panel">
          <input aria-label="Search keywords" placeholder="Search item or description..." value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})}/>
          <select aria-label="Report type" value={filters.type} onChange={e=>setFilters({...filters,type:e.target.value})}><option value="">Lost and found</option><option value="lost">Lost</option><option value="found">Found</option></select>
          <select aria-label="Category" value={filters.category} onChange={e=>setFilters({...filters,category:e.target.value})}><option value="">All categories</option>{['Electronics','Documents','Keys','Bags','Clothing','Accessories','Other'].map(x=><option key={x}>{x}</option>)}</select>
          <input aria-label="Campus location" placeholder="Campus location" value={filters.location} onChange={e=>setFilters({...filters,location:e.target.value})}/>
          <select aria-label="Status" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All statuses</option><option value="open">Open</option><option value="returned">Returned</option></select>
        </div>
        <div className="results-line">{reports.length} report(s) found</div>
        <div className="item-grid">{reports.map(item=><article className="item-card" key={item.id}>
          <div className="item-top"><span className={`type-pill ${item.report_type}`}>{item.report_type==='lost'?'Lost item':'Found item'}</span><span className={`status ${item.status}`}>{item.status}</span></div>
          {item.photo_path ? <img className="item-photo" src={`http://localhost:5000${item.photo_path}`} alt={`Photograph of ${item.title}`} /> : <div className="item-icon">{({Electronics:'▣',Documents:'▤',Keys:'⚿',Bags:'▱',Clothing:'◇',Accessories:'✧'})[item.category] || '◈'}</div>
          <h3>{item.title}</h3><span className="category">{item.category}</span>
          <p className="description">{item.public_description}</p>
          <div className="item-meta"><span>⌖ {item.campus_location}</span><span>◷ {String(item.item_date).slice(0,10)}</span></div>
          {item.report_type==='found' && item.status==='open' && user?.role==='student' && <div className="claim-box">
            <label htmlFor={`claim-${item.id}`}>Think this belongs to you? Submit private evidence.</label>
            <textarea id={`claim-${item.id}`} rows="2" placeholder="Describe a detail only the owner would know..." value={claimEvidence[item.id]||''} onChange={e=>setClaimEvidence({...claimEvidence,[item.id]:e.target.value})}/>
            <button className="btn btn-primary btn-small" onClick={()=>submitClaim(item.id)}>Submit ownership claim</button>
          </div>}
        </article>)}</div>
        {reports.length===0 && <div className="empty"><span>⌕</span><h3>No matching reports</h3><p>Try changing your search or filters.</p></div>}
      </section>}

      {page==='account' && <section className="form-wrap"><div className="form-card">
        <p className="eyebrow">STUDENT ACCESS</p><h2>{authMode==='login'?'Welcome back':'Create a student account'}</h2>
        <p className="muted">Use your account to report items and follow your claims.</p>
        <form onSubmit={submitAuth} className="stack">
          {authMode==='register' && <label>Full name<input required minLength="2" value={auth.fullName} onChange={e=>setAuth({...auth,fullName:e.target.value})}/></label>}
          <label>Email address<input type="email" required value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})}/></label>
          <label>Password<input type="password" required minLength="8" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})}/><small>At least 8 characters.</small></label>
          <button disabled={busy} className="btn btn-primary">{busy?'Please wait...':authMode==='login'?'Log in':'Create account'}</button>
        </form>
        <p className="switch-text">{authMode==='login'?'New student?':'Already registered?'} <button className="text-button" onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>{authMode==='login'?'Create an account':'Log in'}</button></p>
      </div></section>}

      {page==='report' && <section className="form-wrap wide"><div className="form-card">
        <p className="eyebrow">ITEM REPORT</p><h2>{editingId?'Edit your report':'Tell the campus what happened'}</h2>
        {!user && <div className="notice warning">Please log in before submitting a report. <button className="text-button" onClick={()=>setPage('account')}>Log in</button></div>}
        <form onSubmit={submitReport} className="form-grid">
          <label>Report type<select disabled={!!editingId} value={report.reportType} onChange={e=>setReport({...report,reportType:e.target.value})}><option value="lost">I lost an item</option><option value="found">I found an item</option></select></label>
          <label>Item title<input required maxLength="150" placeholder="e.g. Black laptop charger" value={report.title} onChange={e=>setReport({...report,title:e.target.value})}/></label>
          <label>Category<select value={report.category} onChange={e=>setReport({...report,category:e.target.value})}>{['Electronics','Documents','Keys','Bags','Clothing','Accessories','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Date lost/found<input type="date" required value={report.itemDate} onChange={e=>setReport({...report,itemDate:e.target.value})}/></label>
          <label className="full">Campus location<input required placeholder="e.g. Hamu Mukasa Library, N5B" value={report.campusLocation} onChange={e=>setReport({...report,campusLocation:e.target.value})}/></label>
          <label className="full">Public description<textarea required rows="4" placeholder="Describe the item without revealing private proof of ownership." value={report.description} onChange={e=>setReport({...report,description:e.target.value})}/><small>This description is visible to all users. Do not include phone numbers or secret identifying details.</small></label>
          {!editingId && <label className="full">Optional item photograph<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setSelectedPhoto(e.target.files?.[0] || null)}/><small>JPG, PNG or WEBP, maximum 4 MB. Do not include private ownership clues in the public photograph.</small></label>}
          {report.reportType==='found' && !editingId && <label className="full">Private identifying details<textarea rows="3" placeholder="Details visible only to you and the administrator, not in public listings." value={report.privateDetails} onChange={e=>setReport({...report,privateDetails:e.target.value})}/><small>Keep this information out of the public description and photographs.</small></label>}
          <div className="full form-actions"><button disabled={busy||!user} className="btn btn-primary">{busy?'Saving...':editingId?'Save changes':'Submit report'}</button><button type="button" className="btn btn-outline" onClick={()=>{setPage('browse');setEditingId(null)}}>Cancel</button></div>
        </form>
      </div></section>}

      {page==='mine' && <section><div className="section-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h2>My activity</h2><p>Your reports and private ownership claim updates.</p></div></div>
        <h3 className="subheading">My reports</h3><div className="simple-list">{reports.map(r=><div className="list-row" key={r.id}><div><b>{r.title}</b><p>{r.report_type} · {r.campus_location} · {r.status}</p></div>{r.status==='open'&&<button className="btn btn-outline btn-small" onClick={()=>editReport(r)}>Edit</button>}</div>)}</div>
        <h3 className="subheading">My ownership claims</h3><div className="simple-list">{claims.map(c=><div className="list-row" key={c.id}><div><b>{c.item_title}</b><p>Your claim: {c.status} {c.admin_response?`· Administrator: ${c.admin_response}`:''}</p></div><span className={`status ${c.status}`}>{c.status}</span></div>)}</div>
        {!reports.length&&!claims.length&&<div className="empty"><h3>No activity yet</h3><p>Submit a report or claim a found item to see it here.</p></div>}
      </section>}

      {page==='admin' && user?.role==='admin' && <section><div className="section-heading"><div><p className="eyebrow">RESTRICTED AREA</p><h2>Administrator dashboard</h2><p>Review private claims and manage the return process.</p></div><span className="admin-label">Administrator</span></div>
        <div className="notice warning">Verify ownership carefully before approving a claim. Approval authorizes collection; it does not itself confirm return.</div>
        <div className="admin-list">{claims.map(c=><article className="admin-card" key={c.id}>
          <div className="admin-card-head"><div><span className="status">{c.status}</span><h3>{c.item_title}</h3><p>Claimant: {c.claimant_name} · {c.claimant_email}</p></div></div>
          <div className="private-evidence"><b>Private claim evidence</b><p>{c.evidence}</p>{c.private_details&&<><b>Found reporter's private details</b><p>{c.private_details}</p></>}</div>
          {c.status==='pending' && <><textarea rows="2" placeholder="Enter the reason for your decision..." value={reviewText[c.id]||''} onChange={e=>setReviewText({...reviewText,[c.id]:e.target.value})}/><div className="button-row"><button className="btn btn-primary btn-small" onClick={()=>reviewClaim(c.id,'approved')}>Approve claim</button><button className="btn btn-danger btn-small" onClick={()=>reviewClaim(c.id,'rejected')}>Reject claim</button></div></>}
          {c.status==='approved' && c.item_status==='open' && <button className="btn btn-primary btn-small" onClick={()=>confirmReturn(c.report_id)}>Confirm physical collection / return</button>}
          {c.admin_response&&<p className="muted">Decision reason: {c.admin_response}</p>}
        </article>)}</div>
        {!claims.length&&<div className="empty"><h3>No claims to review</h3><p>Submitted ownership claims will appear here.</p></div>}
      </section>}

      {page==='admin' && user?.role!=='admin' && <div className="empty"><h3>Administrator access only</h3><p>This page is restricted to an administrator account.</p></div>}
    </main>
    <footer><b>UCU Campus Lost & Found</b><span>Helping campus belongings find their way home.</span><small>Academic project · Use fictional demonstration records</small></footer>
  </div>;
}

export default App;

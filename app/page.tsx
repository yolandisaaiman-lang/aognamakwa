"use client";

import { useState, useEffect, useCallback } from "react";

const roles = [
  { name: "Church Administrator", short: "Admin", icon: "*", text: "Full oversight across ministries, members and reporting.", scope: "Full access" },
  { name: "Pastoral Leader", short: "Pastor", icon: "+", text: "Pastoral care, prayer ministry and assembly oversight.", scope: "All areas" },
  { name: "Area Leader", short: "Areas", icon: "~", text: "Outreach, Bible studies and community activity by area.", scope: "Assigned area" },
  { name: "Youth", short: "Youth", icon: "Y", text: "Friday youth services, activities and attendance.", scope: "Youth ministry" },
  { name: "Transport", short: "Transport", icon: "T", text: "Sunday routes, taxi bookings, fares and fuel records.", scope: "Transport" },
  { name: "Usher Leader", short: "Ushers", icon: "U", text: "Sunday teams, service duties, attendance and vehicles.", scope: "Ushering" },
  { name: "Finance", short: "Finance", icon: "R", text: "Offerings, expenses and ministry financial summaries.", scope: "Finance" },
  { name: "Worship Team", short: "Worship", icon: "W", text: "Schedules, set lists and musician coordination.", scope: "Worship" },
  { name: "Media & Sound", short: "Media", icon: "M", text: "Service production, equipment and media schedules.", scope: "Media & sound" },
  { name: "Hospital Ministry", short: "Hospital", icon: "H", text: "Hospital visits, care notes and prayer follow-up.", scope: "Hospital care" },
];

const areas = ["Nababeep", "Concordia", "Okiep", "Springbok", "Aggeneys"];

function roleSlug(roleName: string) {
  return roleName.toLowerCase().replace(" & ", "_").replaceAll(" ", "_");
}

export default function Home() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [signedIn, setSignedIn] = useState(false);

  const openLogin = (role = selectedRole) => {
    setSelectedRole(role);
    setLoginOpen(true);
  };

  function signOut() {
    sessionStorage.removeItem("namakwa-token");
    setSignedIn(false);
  }

  if (signedIn) return <Dashboard role={selectedRole} signOut={signOut} />;

  return (
    <main>
      <nav className="nav shell">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>NAMAKWA <em>AOG</em></button>
        <div className="nav-links"><a href="#ministries">Ministries</a><a href="#areas">Areas</a><a href="#about">Our purpose</a></div>
        <button className="sign-in" onClick={() => openLogin()}>Sign in <span>-&gt;</span></button>
      </nav>

      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">ASSEMBLY OF GOD - NAMAQUALAND</p>
          <h1>One assembly.<br /><i>Five towns.</i><br />Every ministry <br className="mobile-break" />in step.</h1>
          <p className="hero-text">A connected home for every ministry to serve, record and grow together, from Sunday services to weekday care across Namaqualand.</p>
          <div className="hero-actions"><button className="primary" onClick={() => openLogin()}>Enter your dashboard <b>-&gt;</b></button><a href="#ministries">Explore ministries</a></div>
        </div>
        <div className="ministry-panel">
          <div className="panel-glow"></div>
          <p className="panel-label">SERVING AREAS</p>
          <div className="area-chips">{areas.map((area) => <span key={area}>{area}</span>)}</div>
          <div className="panel-rule" />
          <p className="panel-label">MINISTRY PORTAL</p>
          <div className="portal-list">
            <span>Sunday service reporting</span><span>Weekly ministry activities</span><span>Care and community follow-up</span>
          </div>
          <div className="panel-footer"><span className="live-dot" /> Connected to every area</div>
        </div>
      </section>

      <section id="about" className="purpose"><div className="shell purpose-inner"><p className="eyebrow">OUR PURPOSE</p><p>Making the work of the church <i>visible, shared</i> and beautifully simple.</p><div className="purpose-count"><strong>10</strong><span>ministry<br />portals</span></div></div></section>

      <section id="ministries" className="ministries shell">
        <div className="section-heading"><div><p className="eyebrow">ONE HOME, MANY HANDS</p><h2>Ministry portals</h2></div><p>Each team gets the tools and information they need, with clear access and a shared view for leadership.</p></div>
        <div className="role-grid">{roles.map((role, index) => <button className="role-card" onClick={() => openLogin(role)} key={role.name}><span className="role-number">0{index + 1}</span><span className="role-icon">{role.icon}</span><h3>{role.name}</h3><p>{role.text}</p><div><small>{role.scope}</small><b>-&gt;</b></div></button>)}</div>
      </section>

      <section id="areas" className="areas"><div className="shell"><p className="eyebrow">ACROSS NAMAQUALAND</p><h2>Rooted in every town.</h2><div className="area-grid">{areas.map((area, index) => <article key={area}><span>0{index + 1}</span><h3>{area}</h3><p>Local ministry - One assembly</p><b>-&gt;</b></article>)}</div></div></section>
      <footer className="shell"><button className="brand">NAMAKWA <em>AOG</em></button><span>Namakwa Assembly of God - Church Management</span><button onClick={() => openLogin()}>Member sign in -&gt;</button></footer>

      {loginOpen && <Login role={selectedRole} selectRole={setSelectedRole} close={() => setLoginOpen(false)} enter={() => { setLoginOpen(false); setSignedIn(true); }} />}
    </main>
  );
}

function Login({ role, selectRole, close, enter }: { role: typeof roles[number], selectRole: (r: typeof roles[number]) => void, close: () => void, enter: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState(areas[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }
      setLoading(false);
      if (!response.ok) return setError(data.error || `Unable to sign in (${response.status}).`);
      const userRoleSlug = data.profile?.role || data.user?.user_metadata?.role;
      const authenticatedRole = roles.find((item) => roleSlug(item.name) === userRoleSlug) || role;
      if (!authenticatedRole) return setError("Your user profile has no valid Namakwa AOG role. Ask the Church Administrator to assign one.");
      selectRole(authenticatedRole);
      sessionStorage.setItem("namakwa-token", data.accessToken);
      enter();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Connection error. Please try again.");
    }
  }

  async function signUp() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, role: roleSlug(role.name), area }),
      });
      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }
      setLoading(false);
      if (!response.ok) return setError(data.error || `Unable to create account (${response.status}).`);
      if (data.accessToken) {
        const userRoleSlug = data.profile?.role || data.user?.user_metadata?.role || roleSlug(role.name);
        const authenticatedRole = roles.find((item) => roleSlug(item.name) === userRoleSlug) || role;
        selectRole(authenticatedRole);
        sessionStorage.setItem("namakwa-token", data.accessToken);
        enter();
        return;
      }
      setMessage(data.message || "Account created. Please confirm your email, then sign in.");
      setMode("signin");
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Connection error. Please try again.");
    }
  }

  return (
    <div className="modal-wrap" onMouseDown={close}>
      <section className="login-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close" onClick={close}>x</button>
        <div className="auth-tabs">
          <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
        </div>
        <p className="eyebrow">{mode === "signin" ? "WELCOME BACK" : "NEW MINISTRY USER"}</p>
        <h2>{mode === "signin" ? "Enter your ministry" : "Create your ministry"}<br /><i>space.</i></h2>
        {mode === "signup" && <label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" /></label>}
        <label>Your service role<select value={role.name} onChange={(event) => selectRole(roles.find((item) => item.name === event.target.value) || roles[0])}>{roles.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
        {mode === "signup" && <label>Area<select value={area} onChange={(event) => setArea(event.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select></label>}
        <label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@namakwaaog.org" type="email" /></label>
        <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" type="password" /></label>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-message">{message}</p>}
        <button className="primary wide" disabled={loading} onClick={mode === "signin" ? signIn : signUp}>{loading ? "Please wait..." : mode === "signin" ? "Sign in to dashboard" : "Create account"} <b>-&gt;</b></button>
        <p className="login-help">{mode === "signin" ? "New here? Use Create account above." : "Your role controls which dashboard you can open."}</p>
      </section>
    </div>
  );
}

interface ReportItem {
  id: string;
  title: string;
  attendance: number;
  amount: number;
  area: string;
  ministry_role: string;
  service_date: string;
  notes?: string;
  created_at?: string;
}

function Dashboard({ role, signOut }: { role: typeof roles[number], signOut: () => void }) {
  const isLeader = role.name === "Church Administrator" || role.name === "Pastoral Leader";
  const [activeTab, setActiveTab] = useState<"Overview" | "Reports" | "Calendar" | "Members">("Overview");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = sessionStorage.getItem("namakwa-token");
    try {
      const response = await fetch("/api/reports", {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        cache: "no-store",
      });
      const text = await response.text();
      let data: any = [];
      try {
        data = text ? JSON.parse(text) : [];
      } catch {
        data = [];
      }
      if (response.ok && Array.isArray(data)) {
        setReports(data);
      } else {
        setReports([]);
        if (!response.ok) setError(data?.error || "Could not load reports.");
      }
    } catch {
      setError("Network connection issue while fetching live reports.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function deleteReport(id: string) {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const token = sessionStorage.getItem("namakwa-token");
    try {
      const response = await fetch(`/api/reports?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (response.ok) {
        fetchReports();
      } else {
        alert("Unable to delete report.");
      }
    } catch {
      alert("Error deleting report.");
    }
  }

  // Live calculated statistics from real Supabase data
  const totalAttendance = reports.reduce((acc, r) => acc + (Number(r.attendance) || 0), 0);
  const uniqueAreasCount = new Set(reports.map((r) => r.area).filter(Boolean)).size;
  const reportCount = reports.length;
  const totalSpend = reports.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  const filteredReports = reports.filter((r) => {
    const matchesSearch = !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesArea = areaFilter === "All" || r.area === areaFilter;
    const matchesRole = roleFilter === "All" || r.ministry_role === roleFilter;
    return matchesSearch && matchesArea && matchesRole;
  });

  return (
    <main className="dashboard">
      <nav className="dash-nav">
        <button className="brand" onClick={() => setActiveTab("Overview")}>NAMAKWA <em>AOG</em></button>
        <div className="dash-tabs">
          <span className={activeTab === "Overview" ? "active" : ""} onClick={() => setActiveTab("Overview")}>Overview</span>
          <span className={activeTab === "Reports" ? "active" : ""} onClick={() => setActiveTab("Reports")}>Reports ({reports.length})</span>
          <span className={activeTab === "Calendar" ? "active" : ""} onClick={() => setActiveTab("Calendar")}>Calendar</span>
          {isLeader && <span className={activeTab === "Members" ? "active" : ""} onClick={() => setActiveTab("Members")}>Members</span>}
        </div>
        <button className="profile" onClick={signOut}>
          <i>{role.short.slice(0, 1)}</i>
          <span>{role.short}</span> -&gt;
        </button>
      </nav>

      <div className="dash-body">
        <div className="dash-intro">
          <div>
            <p className="eyebrow">{role.name.toUpperCase()}</p>
            <h1>Good morning, <i>servant leader.</i></h1>
            <p>Real-time live data for <b>{role.name}</b> portal across Namaqualand.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="sign-in" onClick={fetchReports} title="Fetch latest data from Supabase">Refresh live data</button>
            <button className="primary" onClick={() => setNewModalOpen(true)}>+ New report</button>
          </div>
        </div>

        {/* Live Computed Stats Grid */}
        <div className="stats">
          <Stat n={totalAttendance.toLocaleString()} label="Total attendance" change={reportCount > 0 ? `From ${reportCount} live report(s)` : "No attendance recorded"} />
          <Stat n={`${uniqueAreasCount} / ${areas.length}`} label="Active areas" change={uniqueAreasCount > 0 ? `${uniqueAreasCount} area(s) reporting` : "Awaiting first report"} />
          <Stat n={reportCount.toString()} label="Ministry reports" change={reportCount > 0 ? "Active records" : "0 records"} />
          <Stat n={`R ${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} label="Community spend" change={totalSpend > 0 ? "Logged financial records" : "R 0.00 recorded"} />
        </div>

        {/* Main Tab Content */}
        {activeTab === "Overview" && (
          <div className="dash-columns">
            <section className="report-card">
              <div className="card-top">
                <div>
                  <p className="eyebrow">RECENT ACTIVITY</p>
                  <h2>Ministry reports ({reports.length})</h2>
                </div>
                {reports.length > 5 && <button onClick={() => setActiveTab("Reports")}>View all ({reports.length}) -&gt;</button>}
              </div>

              {loading ? (
                <p style={{ fontSize: "13px", color: "#877f78", padding: "20px 0" }}>Loading live reports...</p>
              ) : error ? (
                <p style={{ fontSize: "13px", color: "#b42318", padding: "20px 0" }}>{error}</p>
              ) : reports.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">+</div>
                  <p>No live ministry reports recorded yet for <b>{role.name}</b>.<br />Click below to log your first report.</p>
                  <button className="primary" onClick={() => setNewModalOpen(true)}>+ Create First Report</button>
                </div>
              ) : (
                <div className="activity">
                  {reports.slice(0, 5).map((rep) => (
                    <div key={rep.id} className="activity-item">
                      <i className="orange">{(rep.ministry_role || role.short).slice(0, 2).toUpperCase()}</i>
                      <p>
                        <b>{rep.title}</b>
                        <span className="activity-meta">
                          <span className="area-badge">{rep.area}</span>
                          <span className="area-badge" style={{ background: "#eef2ff", color: "#3730a3", textTransform: "capitalize" }}>
                            {rep.ministry_role ? rep.ministry_role.replace("_", " ") : "ministry"}
                          </span>
                          <span className="metric-tag">Attendance: <strong>{rep.attendance || 0}</strong></span>
                          {rep.amount > 0 && <span className="metric-tag">Spend: <strong>R {rep.amount}</strong></span>}
                        </span>
                        {rep.notes && <span className="notes-preview">{rep.notes}</span>}
                      </p>
                      <time>{rep.service_date ? rep.service_date.slice(5) : "TODAY"}</time>
                      <button className="delete-report-btn" title="Delete report" onClick={() => deleteReport(rep.id)}>x</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <aside className="next-card">
              <p className="eyebrow">REAL-TIME PORTAL</p>
              <h3>{role.name}</h3>
              <p>{role.text}</p>
              <div className="next-line" />
              <span>Scope: {role.scope}</span>
              <button onClick={() => setNewModalOpen(true)}>+ Submit new report -&gt;</button>
            </aside>
          </div>
        )}

        {activeTab === "Reports" && (
          <section className="reports-list-tab">
            <div className="card-top">
              <div>
                <p className="eyebrow">ALL RECORDS</p>
                <h2>All ministry reports ({filteredReports.length})</h2>
              </div>
              <button className="primary" onClick={() => setNewModalOpen(true)}>+ New report</button>
            </div>

            <div className="filter-bar">
              <input
                placeholder="Search reports by title or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                <option value="All">All Areas ({areas.length})</option>
                {areas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="All">All Ministry Roles ({roles.length})</option>
                {roles.map((r) => <option key={roleSlug(r.name)} value={roleSlug(r.name)}>{r.name}</option>)}
              </select>
            </div>

            {loading ? (
              <p style={{ fontSize: "13px", color: "#877f78", padding: "20px 0" }}>Loading records...</p>
            ) : filteredReports.length === 0 ? (
              <div className="empty-state">
                <p>No matching reports found.</p>
              </div>
            ) : (
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title & Notes</th>
                    <th>Role</th>
                    <th>Area</th>
                    <th>Attendance</th>
                    <th>Amount (R)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((rep) => (
                    <tr key={rep.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{rep.service_date}</td>
                      <td>
                        <strong>{rep.title}</strong>
                        {rep.notes && <div className="notes-preview">{rep.notes}</div>}
                      </td>
                      <td>
                        <span className="area-badge" style={{ background: "#eef2ff", color: "#3730a3", textTransform: "capitalize" }}>
                          {rep.ministry_role ? rep.ministry_role.replace("_", " ") : "ministry"}
                        </span>
                      </td>
                      <td><span className="area-badge">{rep.area}</span></td>
                      <td>{rep.attendance || 0}</td>
                      <td>{rep.amount ? `R ${rep.amount}` : "-"}</td>
                      <td>
                        <button className="delete-report-btn" onClick={() => deleteReport(rep.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === "Calendar" && (
          <section className="reports-list-tab">
            <p className="eyebrow">MINISTRY SCHEDULE</p>
            <h2>Assembly Calendar — Namaqualand</h2>
            <div className="calendar-grid">
              {areas.map((a) => (
                <div key={a} className="calendar-card">
                  <span className="area-badge">{a}</span>
                  <h3>Sunday Worship Service</h3>
                  <p>Weekly at 09:00 AM</p>
                  <p>Sunday School & Youth Ministry at 10:30 AM</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "Members" && isLeader && (
          <section className="reports-list-tab">
            <p className="eyebrow">LEADERSHIP OVERSIGHT</p>
            <h2>Namaqualand Assembly Portals</h2>
            <div className="members-grid">
              {roles.map((r) => (
                <div key={r.name} className="member-card">
                  <span className="role-icon" style={{ margin: "0 0 10px" }}>{r.icon}</span>
                  <h3>{r.name}</h3>
                  <p>{r.text}</p>
                  <span className="area-badge" style={{ marginTop: "8px", display: "inline-block" }}>{r.scope}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Real-time New Report Modal */}
      {newModalOpen && (
        <NewReportModal
          role={role}
          close={() => setNewModalOpen(false)}
          onSuccess={() => {
            setNewModalOpen(false);
            fetchReports();
          }}
        />
      )}
    </main>
  );
}

function Stat({ n, label, change }: { n: string, label: string, change: string }) {
  return (
    <article className="stat">
      <p>{label}</p>
      <strong>{n}</strong>
      <span>{change}</span>
    </article>
  );
}

function NewReportModal({ role, close, onSuccess }: { role: typeof roles[number], close: () => void, onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [area, setArea] = useState(areas[0]);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState("0");
  const [amount, setAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Please enter a report title.");
    setLoading(true);
    setError("");

    const token = sessionStorage.getItem("namakwa-token");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          title: title.trim(),
          area,
          service_date: serviceDate,
          attendance: Number(attendance || 0),
          amount: Number(amount || 0),
          ministry_role: roleSlug(role.name),
          notes: notes.trim() || null,
        }),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      setLoading(false);
      if (!response.ok) {
        return setError(data.error || `Failed to save report (${response.status}).`);
      }

      onSuccess();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Connection error while saving report.");
    }
  }

  return (
    <div className="modal-wrap" onMouseDown={close}>
      <section className="login-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
        <button className="close" onClick={close}>x</button>
        <p className="eyebrow">NEW REAL-TIME REPORT</p>
        <h2>Log {role.name}<br /><i>activity.</i></h2>

        <form onSubmit={handleSubmit}>
          <label>
            Report Title *
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Friday Youth Gathering / Sunday Offering"
            />
          </label>

          <div className="form-grid">
            <label>
              Serving Area
              <select value={area} onChange={(e) => setArea(e.target.value)}>
                {areas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label>
              Service Date
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Attendance Count
              <input
                type="number"
                min="0"
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
              />
            </label>
            <label>
              Amount / Spend (R)
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          </div>

          <label>
            Ministry Activity Notes
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter ministry details, usher duties, taxi fares, or care notes..."
              style={{ display: "block", width: "100%", marginTop: "7px", padding: "12px", border: "1px solid #d8d4ce", font: "13px Manrope", borderRadius: "4px" }}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary wide" disabled={loading} type="submit" style={{ marginTop: "24px" }}>
            {loading ? "Saving report..." : "Save Report"} <b>-&gt;</b>
          </button>
        </form>
      </section>
    </div>
  );
}

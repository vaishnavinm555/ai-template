import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const API = "http://localhost:8000";

/* ── Custom Dropdown ─────────────────────────────────────────────────────── */
const Dropdown = ({ value, onChange, options, placeholder }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = options.find(o => String(o.value) === String(value));

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} style={dd.wrap}>
            <button type="button" onClick={() => setOpen(o => !o)} style={dd.trigger}>
                <span style={selected ? dd.selected : dd.placeholder}>
                    {selected ? selected.label : placeholder}
                </span>
                <span style={{ ...dd.arrow, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </button>
            {open && (
                <div style={dd.menu}>
                    {options.map(o => (
                        <div key={o.value}
                            onClick={() => { onChange(o.value); setOpen(false); }}
                            style={{ ...dd.item, ...(String(value) === String(o.value) ? dd.itemActive : {}) }}>
                            {o.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const dd = {
    wrap: { position: "relative", flex: 1, minWidth: "220px" },
    trigger: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", color: "#fff", fontSize: "14px", cursor: "pointer", textAlign: "left" },
    selected: { color: "#fff", fontWeight: 600 },
    placeholder: { color: "rgba(255,255,255,0.35)" },
    arrow: { color: "#a78bfa", fontSize: "16px", transition: "transform 0.2s" },
    menu: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#1e1b4b", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "12px", zIndex: 999, overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.5)" },
    item: { padding: "12px 16px", color: "rgba(255,255,255,0.8)", fontSize: "14px", cursor: "pointer", transition: "background 0.15s" },
    itemActive: { background: "rgba(124,58,237,0.35)", color: "#c4b5fd", fontWeight: 700 },
};

/* ── Main Component ──────────────────────────────────────────────────────── */
const AdminAttendanceReport = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const headers = { Authorization: `Bearer ${token}` };

    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [report, setReport] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        if (!token || role !== "admin") { navigate("/login"); return; }
        const h = { Authorization: `Bearer ${token}` };
        axios.get(`${API}/admin/classes`, { headers: h })
            .then(r => setClasses(r.data))
            .catch(() => setError("Failed to load classes"));
    }, [token, role, navigate]);

    const fetchReport = async () => {
        if (!selectedClass) { setError("Please select a class first."); return; }
        setLoading(true); setError(""); setReport([]); setFetched(false);
        try {
            const url = `${API}/admin/attendance?class_id=${selectedClass}${selectedDate ? `&date=${selectedDate}` : ""}`;
            const r = await axios.get(url, { headers });
            setReport(r.data);
        } catch { setError("Failed to fetch attendance report."); }
        setLoading(false);
        setFetched(true);
    };

    const classOptions = classes.map(c => ({ value: c.id, label: c.name }));
    const totalPresent = report.reduce((a, s) => a + s.present_count, 0);
    const totalAbsent = report.reduce((a, s) => a + s.absent_count, 0);

    return (
        <div style={s.page}>
            {/* Header */}
            <header style={s.header}>
                <Link to="/faculty" style={s.back}>← Faculty Portal</Link>
                <div style={s.headerCenter}>
                    <h2 style={s.title}>📊 Attendance Reports</h2>
                    <span style={s.subtitle}>Admin View</span>
                </div>
                <span style={s.adminBadge}>ADMIN</span>
            </header>

            <main style={s.main}>
                {/* Filter Card */}
                <div style={s.filterCard}>
                    <h3 style={s.filterTitle}>🔍 Filter Attendance</h3>
                    <div style={s.filterRow}>
                        <div style={s.filterGroup}>
                            <label style={s.label}>Class *</label>
                            <Dropdown
                                value={selectedClass}
                                onChange={setSelectedClass}
                                options={classOptions}
                                placeholder="— Select a class —"
                            />
                        </div>
                        <div style={s.filterGroup}>
                            <label style={s.label}>Date (optional)</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                style={s.dateInput}
                            />
                        </div>
                        <div style={s.filterGroup}>
                            <label style={s.label}>&nbsp;</label>
                            <button onClick={fetchReport} disabled={loading} style={s.fetchBtn}>
                                {loading ? "⏳ Loading..." : "🔍 Get Report"}
                            </button>
                        </div>
                    </div>
                    {error && <p style={s.error}>⚠️ {error}</p>}
                </div>

                {/* Summary Stats */}
                {report.length > 0 && (
                    <>
                        <div style={s.summaryRow}>
                            {[
                                { num: report.length, label: "Sessions", color: "#a78bfa" },
                                { num: totalPresent, label: "Total Present", color: "#22c55e" },
                                { num: totalAbsent, label: "Total Absent", color: "#ef4444" },
                                { num: report[0]?.total || 0, label: "Students / Session", color: "#38bdf8" },
                            ].map((item, i) => (
                                <div key={i} style={{ ...s.statCard, borderColor: item.color + "44" }}>
                                    <span style={{ ...s.statNum, color: item.color }}>{item.num}</span>
                                    <span style={s.statLabel}>{item.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Session cards */}
                        {report.map(sess => {
                            const pct = sess.total > 0 ? Math.round((sess.present_count / sess.total) * 100) : 0;
                            return (
                                <div key={sess.session_id} style={s.sessionCard}>
                                    <div style={s.sessionHeader}>
                                        <div>
                                            <h3 style={s.sessionDate}>📅 {sess.date}</h3>
                                            <span style={s.sessionClass}>{sess.class_name}</span>
                                        </div>
                                        <div style={s.sessionRight}>
                                            <div style={s.pctCircle}>
                                                <span style={s.pctNum}>{pct}%</span>
                                                <span style={s.pctLabel}>Present</span>
                                            </div>
                                            <div style={s.sessionCounts}>
                                                <span style={s.presentCount}>✓ {sess.present_count} Present</span>
                                                <span style={s.absentCount}>✗ {sess.absent_count} Absent</span>
                                                <span style={s.totalCount}>Total: {sess.total}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div style={s.barBg}>
                                        <div style={{ ...s.barFill, width: `${pct}%` }} />
                                    </div>

                                    {/* Student chips */}
                                    <div style={s.chipsWrap}>
                                        {sess.details.map(d => (
                                            <div key={d.student_id}
                                                style={{
                                                    ...s.chip,
                                                    background: d.status === "present" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                                                    border: `1px solid ${d.status === "present" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
                                                }}>
                                                <span style={{ color: d.status === "present" ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: "13px" }}>
                                                    {d.status === "present" ? "✓" : "✗"}
                                                </span>
                                                <span style={s.chipName}>{d.student_name || d.username}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}

                {/* Empty state */}
                {!loading && fetched && report.length === 0 && (
                    <div style={s.empty}>
                        <div style={{ fontSize: "52px", marginBottom: "16px" }}>📭</div>
                        <h3 style={{ color: "rgba(255,255,255,0.5)", margin: 0 }}>No attendance records found</h3>
                        <p style={{ color: "rgba(255,255,255,0.3)", marginTop: "8px" }}>
                            Try selecting a different class or removing the date filter.
                        </p>
                    </div>
                )}

                {/* Placeholder before first search */}
                {!fetched && !loading && (
                    <div style={s.placeholder}>
                        <div style={{ fontSize: "52px", marginBottom: "16px" }}>🎓</div>
                        <p style={{ color: "rgba(255,255,255,0.3)" }}>Select a class above and click Get Report</p>
                    </div>
                )}
            </main>
        </div>
    );
};

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s = {
    page: { minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", fontFamily: "'Inter', sans-serif", color: "#fff" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" },
    back: { color: "#a78bfa", textDecoration: "none", fontWeight: 600, fontSize: "14px" },
    headerCenter: { textAlign: "center" },
    title: { margin: "0 0 2px", fontSize: "20px", fontWeight: 700 },
    subtitle: { color: "rgba(255,255,255,0.35)", fontSize: "12px" },
    adminBadge: { background: "linear-gradient(90deg,#7c3aed,#2563eb)", color: "#fff", padding: "4px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, letterSpacing: "1px" },
    main: { padding: "32px 40px", maxWidth: "1100px", margin: "0 auto" },

    filterCard: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px", padding: "28px", marginBottom: "28px" },
    filterTitle: { margin: "0 0 20px", fontSize: "17px", fontWeight: 700 },
    filterRow: { display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" },
    filterGroup: { display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: "180px" },
    label: { fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.8px" },
    dateInput: { padding: "12px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", color: "#fff", fontSize: "14px", outline: "none", colorScheme: "dark" },
    fetchBtn: { padding: "12px 28px", background: "linear-gradient(90deg,#7c3aed,#2563eb)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer", whiteSpace: "nowrap" },
    error: { color: "#fca5a5", marginTop: "14px", fontSize: "14px", background: "rgba(239,68,68,0.1)", padding: "10px 14px", borderRadius: "8px" },

    summaryRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" },
    statCard: { background: "rgba(255,255,255,0.05)", border: "1px solid", borderRadius: "14px", padding: "20px", textAlign: "center" },
    statNum: { display: "block", fontSize: "34px", fontWeight: 800, marginBottom: "4px" },
    statLabel: { color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" },

    sessionCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", marginBottom: "18px" },
    sessionHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" },
    sessionDate: { margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: "#e2e8f0" },
    sessionClass: { color: "#a78bfa", fontSize: "13px", fontWeight: 600 },
    sessionRight: { display: "flex", alignItems: "center", gap: "24px" },
    pctCircle: { textAlign: "center", background: "rgba(124,58,237,0.15)", border: "2px solid rgba(124,58,237,0.4)", borderRadius: "50%", width: "70px", height: "70px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
    pctNum: { fontSize: "18px", fontWeight: 800, color: "#c4b5fd" },
    pctLabel: { fontSize: "10px", color: "rgba(255,255,255,0.4)" },
    sessionCounts: { display: "flex", flexDirection: "column", gap: "6px" },
    presentCount: { color: "#4ade80", fontWeight: 700, fontSize: "14px" },
    absentCount: { color: "#f87171", fontWeight: 700, fontSize: "14px" },
    totalCount: { color: "rgba(255,255,255,0.35)", fontSize: "13px" },
    barBg: { height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "6px", overflow: "hidden", marginBottom: "16px" },
    barFill: { height: "100%", background: "linear-gradient(90deg,#22c55e,#16a34a)", borderRadius: "6px", transition: "width 0.6s ease" },
    chipsWrap: { display: "flex", flexWrap: "wrap", gap: "8px" },
    chip: { display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "20px", fontSize: "13px" },
    chipName: { color: "#e2e8f0", fontWeight: 500 },

    empty: { textAlign: "center", padding: "60px 20px" },
    placeholder: { textAlign: "center", padding: "60px 20px" },
};

export default AdminAttendanceReport;

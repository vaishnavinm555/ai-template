import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { HiChartBar, HiViewGrid, HiCog, HiClipboardList } from "react-icons/hi";

const API = "http://localhost:8000";

const FacultyDashboard = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fullName] = useState(localStorage.getItem("full_name") || localStorage.getItem("username"));
    const [role] = useState(localStorage.getItem("role"));
    const navigate = useNavigate();

    const fetchClasses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/faculty/classes`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            setClasses(res.data);
        } catch (e) {
            if (e.response?.status === 401) { localStorage.clear(); navigate("/login"); }
        } finally { setLoading(false); }
    }, [navigate]);

    useEffect(() => {
        if (!localStorage.getItem("token")) { navigate("/login"); return; }
        fetchClasses();
    }, [navigate, fetchClasses]);

    const handleLogout = () => { localStorage.clear(); navigate("/login"); };

    return (
        <div style={s.page}>
            {/* Header */}
            <header style={s.header}>
                <div style={s.headerLeft}>
                    <span style={s.logo}>🎓</span>
                    <div>
                        <h2 style={s.headerTitle}>Faculty Portal</h2>
                        <span style={s.role}>{role?.toUpperCase()}</span>
                    </div>
                </div>
                <div style={s.headerRight}>
                    <span style={s.userName}>👤 {fullName}</span>
                    <Link to="/dashboard" style={s.dashLink}>Main Dashboard</Link>
                    <button onClick={handleLogout} style={s.logoutBtn}>Logout</button>
                </div>
            </header>

            <main style={s.main}>
                {/* Welcome Banner — Faculty only */}
                {role !== "admin" && (
                    <div style={s.banner}>
                        <div>
                            <h1 style={s.bannerTitle}>My Classes</h1>
                            <p style={s.bannerSub}>Classes assigned to you for this semester</p>
                        </div>
                        <div style={s.bannerStats}>
                            <div style={s.stat}>
                                <span style={s.statNum}>{classes.length}</span>
                                <span style={s.statLabel}>Classes</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin extras */}
                {role === "admin" && (
                    <div style={s.adminBar}>
                        <Link to="/admin/programs" style={{ ...s.adminBtn, background: "rgba(99,179,237,0.15)", borderColor: "#63b3ed", color: "#63b3ed" }}><HiChartBar size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />Program Explorer</Link>
                        <Link to="/admin/university" style={{ ...s.adminBtn, background: "rgba(64,138,113,0.15)", borderColor: "#408A71", color: "#408A71" }}><HiViewGrid size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />Curriculum Builder</Link>
                        <Link to="/admin/panel" style={s.adminBtn}><HiCog size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />Admin Panel</Link>
                        <Link to="/admin/attendance-report" style={s.adminBtn}><HiClipboardList size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />Attendance Reports</Link>
                    </div>
                )}

                {/* Class Cards — Faculty only; Admin uses Program Explorer */}
                {role === "admin" ? (
                    <div style={s.adminRedirect}>
                        <div style={s.adminRedirectIcon}>📊</div>
                        <h3 style={s.adminRedirectTitle}>Use Program Explorer to manage classes</h3>
                        <p style={s.adminRedirectSub}>Browse programs → semesters → classes with full detail, faculty assignments, and enrollment counts.</p>
                        <Link to="/admin/programs" style={s.adminRedirectBtn}>Open Program Explorer →</Link>
                    </div>
                ) : loading ? (
                    <div style={s.loadWrap}>
                        <div style={s.spinner} />
                        <p style={s.loadText}>Loading your classes...</p>
                    </div>
                ) : classes.length === 0 ? (
                    <div style={s.empty}>
                        <div style={s.emptyIcon}>📚</div>
                        <h3>No classes assigned</h3>
                        <p>Contact your administrator to get classes assigned to you.</p>
                    </div>
                ) : (
                    <div style={s.grid}>
                        {classes.map(cls => (
                            <Link key={cls.id} to={`/faculty/class/${cls.id}`} style={s.cardLink}>
                                <div style={s.card}>
                                    <div style={s.cardAccent} />
                                    <div style={s.cardBody}>
                                        <div style={s.cardHeader}>
                                            <span style={s.classIdBadge}>ID #{cls.id}</span>
                                        </div>
                                        <h3 style={s.className}>{cls.course_name || cls.name || `Class ${cls.id}`}</h3>
                                        <p style={s.progSem}>{cls.program_name || "General"} · Semester {cls.semester_number || "—"}</p>
                                        <p style={s.instructorName}>{cls.instructor_name || "No faculty assigned"}</p>
                                        {cls.description && <p style={s.classDesc}>{cls.description}</p>}
                                        <div style={s.cardFooter}>
                                            <span style={s.cardDate}>
                                                {new Date(cls.date).toLocaleDateString("en-IN", {
                                                    day: "numeric", month: "short", year: "numeric"
                                                })}
                                            </span>
                                            <span style={s.openBtn}>Open →</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

const s = {
    page: { minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", fontFamily: "'Inter', sans-serif" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.1)" },
    headerLeft: { display: "flex", alignItems: "center", gap: "14px" },
    logo: { fontSize: "32px" },
    headerTitle: { margin: 0, color: "#fff", fontSize: "20px", fontWeight: 700 },
    role: { background: "linear-gradient(90deg, #7c3aed, #2563eb)", color: "#fff", padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, letterSpacing: "1px" },
    headerRight: { display: "flex", alignItems: "center", gap: "16px" },
    userName: { color: "rgba(255,255,255,0.8)", fontSize: "14px" },
    dashLink: { color: "#a78bfa", textDecoration: "none", fontSize: "14px", fontWeight: 600 },
    logoutBtn: { background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
    main: { padding: "40px" },
    banner: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "40px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    bannerTitle: { margin: "0 0 8px", color: "#fff", fontSize: "32px", fontWeight: 800 },
    bannerSub: { margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "15px" },
    bannerStats: { display: "flex", gap: "30px" },
    stat: { textAlign: "center" },
    statNum: { display: "block", fontSize: "36px", fontWeight: 800, color: "#a78bfa" },
    statLabel: { color: "rgba(255,255,255,0.5)", fontSize: "13px" },
    adminBar: { display: "flex", gap: "12px", marginBottom: "24px" },
    adminBtn: { background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", padding: "10px 20px", borderRadius: "10px", textDecoration: "none", fontWeight: 600, fontSize: "14px" },
    loadWrap: { textAlign: "center", padding: "80px" },
    spinner: { width: "48px", height: "48px", border: "4px solid rgba(167,139,250,0.2)", borderTop: "4px solid #a78bfa", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" },
    loadText: { color: "rgba(255,255,255,0.5)" },
    empty: { textAlign: "center", padding: "80px", color: "rgba(255,255,255,0.5)" },
    emptyIcon: { fontSize: "64px", marginBottom: "20px" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" },
    cardLink: { textDecoration: "none" },
    card: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" },
    cardAccent: { height: "4px", background: "linear-gradient(90deg, #7c3aed, #2563eb)" },
    cardBody: { padding: "24px" },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
    classIcon: { fontSize: "28px" },
    classIdBadge: { background: "rgba(167,139,250,0.2)", color: "#a78bfa", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 },
    className: { margin: "0 0 4px", color: "#fff", fontSize: "18px", fontWeight: 700 },
    progSem: { margin: "0 0 8px", color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" },
    instructorName: { margin: "0 0 12px", color: "#a78bfa", fontSize: "13px", fontWeight: 600 },
    classDesc: { color: "rgba(255,255,255,0.5)", fontSize: "14px", margin: "0 0 16px" },
    cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" },
    cardDate: { color: "rgba(255,255,255,0.4)", fontSize: "13px" },
    openBtn: { color: "#a78bfa", fontWeight: 700, fontSize: "14px" },
    adminRedirect: { textAlign: "center", padding: "80px 40px", background: "rgba(99,179,237,0.04)", border: "1px dashed rgba(99,179,237,0.2)", borderRadius: "24px", marginTop: "8px" },
    adminRedirectIcon: { fontSize: "56px", marginBottom: "20px" },
    adminRedirectTitle: { margin: "0 0 10px", color: "#f7fafc", fontSize: "22px", fontWeight: 800 },
    adminRedirectSub: { margin: "0 0 28px", color: "rgba(255,255,255,0.4)", fontSize: "15px", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" },
    adminRedirectBtn: { display: "inline-block", background: "linear-gradient(90deg, #63b3ed, #4299e1)", color: "#fff", textDecoration: "none", padding: "14px 32px", borderRadius: "14px", fontWeight: 700, fontSize: "15px" },
};

export default FacultyDashboard;

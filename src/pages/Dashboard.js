import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const API = "http://localhost:8000";

const Dashboard = () => {
    const navigate = useNavigate();
    const [user] = useState({
        username: localStorage.getItem("username") || "Student",
        fullName: localStorage.getItem("full_name"),
        role: localStorage.getItem("role")
    });
    const [classes, setClasses] = useState([]);
    const [dashData, setDashData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchData = useCallback(async (token) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/student/dashboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClasses(res.data.profile?.enrollments?.map(e => e.class_) || []);
            setDashData(res.data);
        } catch (err) {
            console.error(err);
            setError("Failed to load your academic data.");
            if (err.response?.status === 401) {
                localStorage.clear();
                navigate("/login");
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/login"); return; }
        
        // If faculty or admin accidentally lands here, redirect them to their portal
        if (user.role === "faculty" || user.role === "admin") {
            navigate("/faculty");
            return;
        }

        fetchData(token);
    }, [user.role, navigate, fetchData]);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div style={s.page}>
            {/* Header */}
            <header style={s.header}>
                <div style={s.logoArea}>
                    <div style={s.logoIcon}>🎓</div>
                    <div>
                        <h2 style={s.logoText}>Student Portal</h2>
                        <span style={s.subText}>Academic & Feedback System</span>
                    </div>
                </div>
                <div style={s.userArea}>
                    <div style={s.userInfo}>
                        <span style={s.userName}>{user.fullName || user.username}</span>
                        <span style={s.userRole}>Student</span>
                    </div>
                    <button onClick={handleLogout} style={s.logoutBtn}>Logout</button>
                </div>
            </header>

            <main style={s.main}>
                {/* Welcome Hero */}
                <section style={s.hero}>
                    <div style={s.heroContent}>
                        <h1 style={s.heroTitle}>Welcome back, {user.fullName || user.username}! 👋</h1>
                        <p style={s.heroSub}>Track your attendance, view class materials, and share your feedback with faculty.</p>
                    </div>
                    <div style={s.heroStats}>
                        <div style={s.miniStat}>
                            <span style={s.statVal}>{classes.length}</span>
                            <span style={s.statLab}>Active Classes</span>
                        </div>
                    </div>
                </section>

                {/* Content Grid */}
                <div style={s.contentArea}>
                    <div style={s.sectionHeader}>
                        <h3 style={s.sectionTitle}>📚 My Classes</h3>
                        <button onClick={() => fetchData(localStorage.getItem("token"))} style={s.refreshBtn}>
                            {loading ? "⌛ Updating..." : "🔄 Refresh"}
                        </button>
                    </div>

                    {loading ? (
                        <div style={s.loader}>
                            <div style={s.spinner}></div>
                            <p>Fetching your academic schedule...</p>
                        </div>
                    ) : error ? (
                        <div style={s.errorBox}>{error}</div>
                    ) : classes.length === 0 ? (
                        <div style={s.emptyBox}>
                            <div style={{ fontSize: "50px", marginBottom: "15px" }}>📁</div>
                            <h3>No classes enrolled yet</h3>
                            <p>Contact your administrator to be added to your academic sessions.</p>
                        </div>
                    ) : (
                        <div style={s.grid}>
                            {classes.map((cls, i) => {
                                // Logic for feedback deadline (48h)
                                const classDate = new Date(cls.date || new Date());
                                const deadline = new Date(classDate.getTime() + 48 * 60 * 60 * 1000);
                                const isExpired = new Date() > deadline;

                                return (
                                    <div key={cls.id || i} style={s.card}>
                                        <div style={s.cardHeader}>
                                            <h4 style={s.className}>{cls.course_name || cls.name || `Class ${cls.id}`}</h4>
                                            <div style={{
                                                ...s.statusBadge,
                                                background: cls.feedback_submitted ? "rgba(34,197,94,0.2)" : 
                                                            isExpired ? "rgba(239,68,68,0.2)" : "rgba(124,58,237,0.2)",
                                                color: cls.feedback_submitted ? "#4ade80" : 
                                                       isExpired ? "#f87171" : "#a78bfa"
                                            }}>
                                                {cls.feedback_submitted ? "COMPLETED" : isExpired ? "EXPIRED" : "PENDING"}
                                            </div>
                                        </div>
                                        
                                        <div style={s.cardInfo}>
                                            <div style={s.infoItem}>
                                                <span style={s.infoLabel}>Program:</span>
                                                <span style={s.infoVal}>{cls.program_name || "General"} (Sem {cls.semester_number || "—"})</span>
                                            </div>
                                            <div style={s.infoItem}>
                                                <span style={s.infoLabel}>Date:</span>
                                                <span style={s.infoVal}>{new Date(cls.date || new Date()).toLocaleDateString()}</span>
                                            </div>
                                            <div style={s.infoItem}>
                                                <span style={s.infoLabel}>Faculty:</span>
                                                <span style={s.infoVal}>{cls.instructor_name || cls.faculty_name || "Assigned Faculty"}</span>
                                            </div>
                                        </div>

                                        <div style={s.cardFooter}>
                                            {cls.feedback_submitted ? (
                                                <div style={s.doneMsg}>✅ Feedback Submitted</div>
                                            ) : isExpired ? (
                                                <div style={s.expiredMsg}>⌛ Submission Window Closed</div>
                                            ) : (
                                                <Link 
                                                    to={`/feedback/${cls.id}`} 
                                                    state={{ className: cls.name }}
                                                    style={s.feedbackBtn}
                                                >
                                                    ✍️ Give Feedback
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {dashData && (
                        <div style={s.extraGrid}>
                            <div style={s.dashSection}>
                                <h3 style={s.sectionTitle}>📅 Upcoming Assignments</h3>
                                <div style={s.list}>
                                    {dashData.upcoming_assignments.length === 0 ? <p style={s.muted}>No pending assignments.</p> :
                                        dashData.upcoming_assignments.map(as => (
                                            <div key={as.id} style={s.dashItem}>
                                                <span style={s.bold}>{as.title}</span>
                                                <span style={s.badge}>Due: {new Date(as.deadline).toLocaleDateString()}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div style={s.dashSection}>
                                <h3 style={s.sectionTitle}>📁 Recent Materials</h3>
                                <div style={s.list}>
                                    {dashData.recent_materials.length === 0 ? <p style={s.muted}>No materials uploaded.</p> :
                                        dashData.recent_materials.map(m => (
                                            <div key={m.id} style={s.dashItem}>
                                                <span style={s.bold}>📄 {m.title}</span>
                                                <span style={s.muted}>{new Date(m.timestamp).toLocaleDateString()}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div style={s.dashSection}>
                                <h3 style={s.sectionTitle}>📢 Announcements</h3>
                                <div style={s.list}>
                                    {dashData.announcements.length === 0 ? <p style={s.muted}>No announcements.</p> :
                                        dashData.announcements.map(a => (
                                            <div key={a.id} style={s.dashItem}>
                                                <p style={s.bold}>{a.content || a.message}</p>
                                                <span style={s.muted}>{new Date(a.timestamp).toLocaleString()}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s = {
    page: { minHeight: "100vh", background: "#091413", fontFamily: "'Inter', sans-serif", color: "#fff" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 40px", background: "rgba(18,33,29,0.7)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 },
    logoArea: { display: "flex", alignItems: "center", gap: "15px" },
    logoIcon: { fontSize: "28px", background: "rgba(64,138,113,0.2)", padding: "8px", borderRadius: "12px" },
    logoText: { margin: 0, fontSize: "18px", fontWeight: 800, letterSpacing: "-0.5px" },
    subText: { fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 500 },
    userArea: { display: "flex", alignItems: "center", gap: "25px" },
    userInfo: { textAlign: "right" },
    userName: { display: "block", fontSize: "14px", fontWeight: 700 },
    userRole: { fontSize: "11px", color: "#408A71", fontWeight: 800, textTransform: "uppercase" },
    logoutBtn: { padding: "8px 18px", background: "transparent", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" },

    main: { padding: "40px", maxWidth: "1200px", margin: "0 auto" },
    hero: { background: "linear-gradient(135deg, #12211D, #091413)", border: "1px solid rgba(64,138,113,0.15)", borderRadius: "24px", padding: "40px", marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
    heroTitle: { margin: "0 0 10px", fontSize: "32px", fontWeight: 800 },
    heroSub: { margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "16px", maxWidth: "500px", lineHeight: 1.6 },
    heroStats: { display: "flex", gap: "20px" },
    miniStat: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "15px 25px", borderRadius: "16px", textAlign: "center" },
    statVal: { display: "block", fontSize: "24px", fontWeight: 800, color: "#408A71" },
    statLab: { fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase" },

    contentArea: { position: "relative" },
    sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" },
    sectionTitle: { margin: 0, fontSize: "20px", fontWeight: 700 },
    refreshBtn: { background: "none", border: "none", color: "#408A71", fontWeight: 700, cursor: "pointer", fontSize: "14px" },

    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" },
    card: { background: "#12211D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "24px", transition: "transform 0.2s, border-color 0.2s" },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
    className: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#fff", flex: 1, paddingRight: "10px" },
    statusBadge: { fontSize: "10px", fontWeight: 900, padding: "4px 10px", borderRadius: "20px", letterSpacing: "0.5px" },
    
    cardInfo: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" },
    infoItem: { display: "flex", justifyContent: "space-between", fontSize: "13px" },
    infoLabel: { color: "rgba(255,255,255,0.35)", fontWeight: 500 },
    infoVal: { color: "rgba(255,255,255,0.8)", fontWeight: 600 },

    cardFooter: { borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px" },
    feedbackBtn: { display: "block", textAlign: "center", background: "linear-gradient(90deg, #408A71, #285A48)", color: "#fff", textDecoration: "none", padding: "12px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", boxShadow: "0 10px 20px rgba(64,138,113,0.15)" },
    doneMsg: { textAlign: "center", color: "#4ade80", fontSize: "14px", fontWeight: 700, padding: "10px", background: "rgba(34,197,94,0.05)", borderRadius: "10px" },
    expiredMsg: { textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: "13px", fontWeight: 600 },

    empty: { textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" },
    extraGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginTop: "40px" },
    dashSection: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px" },
    dashItem: { padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" },
    list: { display: "flex", flexDirection: "column", gap: "4px" },
    bold: { fontWeight: 600, fontSize: "14px" },
    muted: { fontSize: "12px", color: "rgba(255,255,255,0.4)" },
    badge: { fontSize: "10px", background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: "6px" },

    loader: { textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.3)" },
    spinner: { width: "40px", height: "40px", border: "3px solid rgba(64,138,113,0.1)", borderTopColor: "#408A71", borderRadius: "50%", margin: "0 auto 15px", animation: "spin 1s linear infinite" },
    errorBox: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", padding: "20px", borderRadius: "16px", textAlign: "center" },
    emptyBox: { textAlign: "center", padding: "80px 20px", background: "rgba(255,255,255,0.02)", borderRadius: "30px", border: "2px dashed rgba(255,255,255,0.05)" },
};

export default Dashboard;

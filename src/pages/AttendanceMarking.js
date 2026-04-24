import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, useParams, Link } from "react-router-dom";

const API = "http://localhost:8000";

const AttendanceMarking = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({}); // { studentId: isPresent }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [msg, setMsg] = useState("");

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/faculty/class/${classId}/students`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudents(res.data);
            // Default: ALL present
            const initial = {};
            res.data.forEach(s => initial[s.student_id] = true);
            setAttendance(initial);
        } catch (err) {
            console.error(err);
            setMsg("❌ Failed to load students");
        } finally {
            setLoading(false);
        }
    }, [classId, token]);

    useEffect(() => {
        if (!token) { navigate("/login"); return; }
        fetchStudents();
    }, [token, navigate, fetchStudents]);

    const toggle = (id) => {
        setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const submit = async () => {
        setSaving(true);
        try {
            const records = Object.entries(attendance).map(([id, present]) => ({
                student_id: parseInt(id),
                status: present ? "present" : "absent"
            }));

            await axios.post(`${API}/faculty/attendance/session`, {
                class_id: parseInt(classId),
                date: date,
                records: records
            }, { headers: { Authorization: `Bearer ${token}` } });

            setMsg("✅ Attendance submitted successfully!");
            setTimeout(() => navigate(-1), 1500);
        } catch (err) {
            setMsg("❌ " + (err.response?.data?.detail || "Failed to save"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={s.page}>
            <header style={s.header}>
                <Link to="/faculty" style={s.back}>← Back</Link>
                <h2 style={s.title}>📝 Mark Attendance</h2>
                <div style={{ width: "60px" }} />
            </header>

            <main style={s.main}>
                <div style={s.card}>
                    <div style={s.cardHeader}>
                        <div>
                            <h3 style={s.cardTitle}>Student List</h3>
                            <p style={s.cardSub}>Default status is set to 'Present'. Uncheck students who are absent.</p>
                        </div>
                        <div style={s.dateGroup}>
                            <label style={s.dateLabel}>Session Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={s.dateInput} />
                        </div>
                    </div>

                    {msg && <div style={{ ...s.flash, background: msg.startsWith("✅") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: msg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{msg}</div>}

                    {loading ? (
                        <p style={s.empty}>Loading class roster...</p>
                    ) : (
                        <div style={s.list}>
                            <table style={s.table}>
                                <thead>
                                    <tr>
                                        <th style={s.th}>Student Name</th>
                                        <th style={s.th}>Username</th>
                                        <th style={{ ...s.th, textAlign: "center" }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(s => (
                                        <tr key={s.student_id} style={s.tr} onClick={() => toggle(s.student_id)}>
                                            <td style={s.td}>{s.full_name || "N/A"}</td>
                                            <td style={s.td}>@{s.username}</td>
                                            <td style={{ ...s.td, textAlign: "center" }}>
                                                <div style={{ ...s.check, background: attendance[s.student_id] ? "#408A71" : "rgba(255,255,255,0.1)" }}>
                                                    {attendance[s.student_id] ? "✓" : "✗"}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={s.footer}>
                        <button onClick={submit} disabled={saving || loading} style={s.submitBtn}>
                            {saving ? "Saving..." : "Submit Attendance Session"}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

const s = {
    page: { minHeight: "100vh", background: "#091413", fontFamily: "'Inter', sans-serif", color: "#fff" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", background: "rgba(18,33,29,0.7)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" },
    back: { color: "#408A71", textDecoration: "none", fontWeight: 700, fontSize: "14px" },
    title: { margin: 0, fontSize: "20px", fontWeight: 800 },
    main: { padding: "40px", maxWidth: "900px", margin: "0 auto" },
    card: { background: "#12211D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "24px", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" },
    cardTitle: { margin: "0 0 6px", fontSize: "20px", fontWeight: 800 },
    cardSub: { margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.4)" },
    dateGroup: { textAlign: "right" },
    dateLabel: { display: "block", fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase" },
    dateInput: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "10px 14px", color: "#fff", outline: "none", colorScheme: "dark" },
    flash: { padding: "12px", borderRadius: "12px", marginBottom: "20px", textAlign: "center", fontWeight: 600, fontSize: "14px" },
    list: { marginBottom: "30px" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", padding: "12px", fontSize: "12px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)" },
    tr: { cursor: "pointer", transition: "background 0.2s" },
    td: { padding: "16px 12px", fontSize: "15px", borderBottom: "1px solid rgba(255,255,255,0.03)" },
    check: { width: "24px", height: "24px", borderRadius: "6px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px", transition: "all 0.2s" },
    footer: { display: "flex", justifyContent: "center" },
    submitBtn: { padding: "16px 40px", background: "linear-gradient(90deg, #408A71, #285A48)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 10px 20px rgba(64,138,113,0.2)" },
    empty: { textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)" }
};

export default AttendanceMarking;

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, useParams, Link } from "react-router-dom";

const API = "http://localhost:8000";
const TABS = ["Students", "Attendance", "Assignments", "Exams", "Study Materials", "Announcements"];
const TAB_ICONS = ["👥", "📋", "📅", "📝", "📁", "📢"];

const ClassDetail = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const [activeTab, setActiveTab] = useState(0);
    const [cls, setCls] = useState(null);

    // Per-tab data
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [attDates, setAttDates] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [submissions, setSubmissions] = useState([]);

    // Forms
    const [examForm, setExamForm] = useState({ title: "", date: "" });
    const [asgnForm, setAsgnForm] = useState({ title: "", description: "", deadline: "" });
    const [annForm, setAnnForm] = useState({ message: "", type: "normal", poll_question: "", poll_options: ["Yes", "No"] });
    const [matFile, setMatFile] = useState(null);
    const [matTitle, setMatTitle] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState("");
    const [assignFacultyId, setAssignFacultyId] = useState("");
    const userRole = localStorage.getItem("role");

    const loadClass = useCallback(async () => {
        const h = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.get(`${API}/faculty/classes`, { headers: h });
            const found = res.data.find(c => c.id === parseInt(classId));
            if (!found) { navigate("/faculty"); return; }
            setCls(found);
        } catch (e) {
            if (e.response?.status === 401) { localStorage.clear(); navigate("/login"); }
            else if (e.response?.status === 403) navigate("/faculty");
        }
    }, [classId, token, navigate]);

    const loadFaculties = useCallback(async () => {
        if (localStorage.getItem("role") !== "admin") return;
        const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
        try {
            const res = await axios.get(`${API}/admin/faculties`, { headers: h });
            setFaculties(res.data);
        } catch { setFaculties([]); }
    }, []); // no external deps — reads from localStorage directly

    useEffect(() => {
        if (!token) { navigate("/login"); return; }
        loadClass();
        if (localStorage.getItem("role") === "admin") loadFaculties();
    }, [token, navigate, loadClass, loadFaculties]);

    const loadStudents = useCallback(async () => {
        const h = { Authorization: `Bearer ${token}` };
        try { const r = await axios.get(`${API}/class/${classId}/students`, { headers: h }); setStudents(r.data); }
        catch { setStudents([]); }
    }, [classId, token]);

    const loadAttDates = useCallback(async () => {
        const h = { Authorization: `Bearer ${token}` };
        try { const r = await axios.get(`${API}/class/${classId}/attendance-dates`, { headers: h }); setAttDates(r.data); }
        catch { setAttDates([]); }
    }, [classId, token]);

    const loadExams = useCallback(async () => {
        const h = { Authorization: `Bearer ${token}` };
        try { const r = await axios.get(`${API}/class/${classId}/exams`, { headers: h }); setExams(r.data); }
        catch { setExams([]); }
    }, [classId, token]);

    const loadMaterials = useCallback(async () => {
        const h = { Authorization: `Bearer ${token}` };
        try { const r = await axios.get(`${API}/class/${classId}/materials`, { headers: h }); setMaterials(r.data); }
        catch { setMaterials([]); }
    }, [classId, token]);

    const loadAnnouncements = useCallback(async () => {
        const h = { Authorization: `Bearer ${token}` };
        try { const r = await axios.get(`${API}/class/${classId}/announcements`, { headers: h }); setAnnouncements(r.data); }
        catch { setAnnouncements([]); }
    }, [classId, token]);

    const loadAssignments = useCallback(async () => {
        const h = { Authorization: `Bearer ${token}` };
        try { 
            const r = await axios.get(`${API}/interaction/class/${classId}/assignments`, { headers: h }); 
            setAssignments(r.data); 
            // Also load my submissions if student
            if (localStorage.getItem("role") === "student") {
                const s = await axios.get(`${API}/interaction/student/submissions`, { headers: h });
                setSubmissions(s.data);
            }
        } catch { setAssignments([]); }
    }, [classId, token]);

    useEffect(() => {
        if (!cls) return;
        if (activeTab === 0) loadStudents();
        else if (activeTab === 1) loadAttDates();
        else if (activeTab === 2) loadAssignments();
        else if (activeTab === 3) loadExams();
        else if (activeTab === 4) loadMaterials();
        else if (activeTab === 5) loadAnnouncements();
    }, [activeTab, cls, loadStudents, loadAttDates, loadAssignments, loadExams, loadMaterials, loadAnnouncements]);

    const flash = (text) => { setMsg(text); setTimeout(() => setMsg(""), 3000); };

    const submitExam = async (e) => {
        e.preventDefault(); setSubmitting(true);
        try {
            await axios.post(`${API}/exams`, { ...examForm, class_id: parseInt(classId) }, { headers });
            setExamForm({ title: "", date: "" });
            loadExams(); flash("✅ Exam created!");
        } catch { flash("❌ Failed to create exam."); }
        setSubmitting(false);
    };

    const submitAnn = async (e) => {
        e.preventDefault(); setSubmitting(true);
        try {
            const data = { 
                class_id: parseInt(classId), 
                title: "Announcement", 
                content: annForm.message,
                type: annForm.type
            };
            if (annForm.type === "poll") {
                data.poll = { 
                    question: annForm.poll_question, 
                    options: annForm.poll_options.map(o => ({ option_text: o })) 
                };
            }
            await axios.post(`${API}/announcements`, data, { headers });
            setAnnForm({ message: "", type: "normal", poll_question: "", poll_options: ["Yes", "No"] }); 
            loadAnnouncements(); flash("✅ Posted!");
        } catch { flash("❌ Failed to post."); }
        setSubmitting(false);
    };

    const submitAssignment = async (e) => {
        e.preventDefault(); setSubmitting(true);
        try {
            await axios.post(`${API}/assignments`, { ...asgnForm, class_id: parseInt(classId) }, { headers });
            setAsgnForm({ title: "", description: "", deadline: "" });
            loadAssignments(); flash("✅ Assignment created!");
        } catch { flash("❌ Failed."); }
        setSubmitting(false);
    };

    const submitMaterial = async (e) => {
        e.preventDefault(); if (!matFile) return; setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("class_id", classId); fd.append("title", matTitle); fd.append("file", matFile);
            await axios.post(`${API}/materials`, fd, { headers });
            setMatFile(null); setMatTitle(""); loadMaterials(); flash("✅ Material uploaded!");
        } catch { flash("❌ Upload failed."); }
        setSubmitting(false);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 0: return <StudentsTab students={students} />;
            case 1: return <AttendanceTab classId={classId} attDates={attDates} students={students} onLoad={loadStudents} headers={headers} flash={flash} />;
            case 2: return <AssignmentsTab assignments={assignments} submissions={submissions} asgnForm={asgnForm} setAsgnForm={setAsgnForm} onSubmit={submitAssignment} role={userRole} classId={classId} flash={flash} refresh={loadAssignments} headers={headers} />;
            case 3: return <ExamsTab exams={exams} examForm={examForm} setExamForm={setExamForm} onSubmit={submitExam} submitting={submitting} />;
            case 4: return <MaterialsTab materials={materials} matTitle={matTitle} setMatTitle={setMatTitle} matFile={matFile} setMatFile={setMatFile} onSubmit={submitMaterial} submitting={submitting} />;
            case 5: return <AnnouncementsTab announcements={announcements} annForm={annForm} setAnnForm={setAnnForm} onSubmit={submitAnn} role={userRole} flash={flash} refresh={loadAnnouncements} headers={headers} />;
            default: return null;
        }
    };

    return (
        <div style={s.page}>
            <header style={s.header}>
                <Link to="/faculty" style={s.back}>← My Classes</Link>
                <div style={s.headerCenter}>
                    <h2 style={s.headerTitle}>{cls ? (cls.course_name || cls.name) : "Loading..."}</h2>
                    <span style={s.classId}>ID #{classId} {cls?.program_name ? `· ${cls.program_name} (Sem ${cls.semester_number})` : ""}</span>
                </div>
                <button onClick={() => { localStorage.clear(); navigate("/login"); }} style={s.logoutBtn}>Logout</button>
            </header>

            {msg && <div style={s.flashMsg}>{msg}</div>}

            {userRole === "admin" && (
                <div style={s.adminSection}>
                    <div style={s.adminLabel}>🛠️ Admin: Assign Faculty</div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <select 
                            value={assignFacultyId} 
                            onChange={e => setAssignFacultyId(e.target.value)} 
                            style={s.adminSelect}
                        >
                            <option value="">— Select Faculty —</option>
                            {faculties.map(f => (
                                <option key={f.id} value={f.id}>{f.full_name || f.username}</option>
                            ))}
                        </select>
                        <button 
                            onClick={async () => {
                                if (!assignFacultyId) return;
                                try {
                                    await axios.post(`${API}/admin/assign-faculty`, {
                                        class_id: parseInt(classId),
                                        faculty_id: parseInt(assignFacultyId)
                                    }, { headers });
                                    flash("✅ Faculty assigned!");
                                    loadClass();
                                } catch { flash("❌ Assignment failed."); }
                            }}
                            style={s.adminBtn}
                        >
                            Assign
                        </button>
                    </div>
                    {cls?.instructor_name && (
                        <div style={{ marginTop: "8px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                            Current: <strong>{cls.instructor_name}</strong>
                        </div>
                    )}
                </div>
            )}

            <div style={s.tabs}>
                {TABS.map((tab, i) => (
                    <button key={i} onClick={() => setActiveTab(i)}
                        style={{ ...s.tab, ...(activeTab === i ? s.activeTab : {}) }}>
                        {TAB_ICONS[i]} {tab}
                    </button>
                ))}
            </div>

            <main style={s.main}>{renderTabContent()}</main>
        </div>
    );
};

/* ── Sub-components ─────────────────────────────────────────────────────── */

const StudentsTab = ({ students }) => (
    <div style={s.section}>
        <h3 style={s.sectionTitle}>👥 Enrolled Students <span style={s.badge}>{students.length}</span></h3>
        {students.length === 0 ? <p style={s.empty}>No students enrolled yet.</p> : (
            <div style={s.table}>
                <div style={s.thead}>
                    <span>Name</span><span>Username</span><span>Email</span><span>Dept</span>
                </div>
                {students.map(st => (
                    <div key={st.id} style={s.trow}>
                        <span style={s.bold}>{st.full_name || "—"}</span>
                        <span style={s.muted}>@{st.username}</span>
                        <span style={s.muted}>{st.email || "—"}</span>
                        <span style={s.muted}>{st.department || "—"}</span>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const AttendanceTab = ({ classId, attDates, students, onLoad, headers, flash }) => {
    const [mode, setMode] = useState("take"); // 'take' | 'history'
    const [records, setRecords] = useState({});
    const [today] = useState(new Date().toISOString().split("T")[0]);
    const [submitting, setSubmitting] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [selectedDate, setSelectedDate] = useState("");

    useEffect(() => {
        if (students.length > 0) {
            const init = {};
            students.forEach(st => { init[st.id] = "present"; });
            setRecords(init);
        }
        // NOTE: do NOT call onLoad here — it causes an infinite loop
    }, [students]);

    const toggle = (id) => setRecords(prev => ({ ...prev, [id]: prev[id] === "present" ? "absent" : "present" }));

    const submit = async () => {
        setSubmitting(true);
        const payload = {
            class_id: parseInt(classId),
            date: today,
            records: Object.entries(records).map(([sid, status]) => ({ student_id: parseInt(sid), status }))
        };
        try {
            await axios.post(`${API}/attendance`, payload, { headers });
            flash("✅ Attendance saved successfully!");
        } catch { flash("❌ Failed to save attendance."); }
        setSubmitting(false);
    };

    const loadHistory = async () => {
        try {
            const r = await axios.get(`${API}/attendance?class_id=${classId}${selectedDate ? `&date=${selectedDate}` : ""}`, { headers });
            setHistoryData(r.data);
        } catch { flash("❌ Could not load history."); }
    };

    return (
        <div style={s.section}>
            <div style={s.tabToggle}>
                <button onClick={() => setMode("take")} style={mode === "take" ? s.toggleActive : s.toggleInactive}>📋 Take Attendance</button>
                <button onClick={() => { setMode("history"); loadHistory(); }} style={mode === "history" ? s.toggleActive : s.toggleInactive}>📅 View History</button>
            </div>

            {mode === "take" ? (
                <>
                    <div style={s.attHeader}>
                        <h3 style={s.sectionTitle}>Today: {today}</h3>
                        <span style={s.badge}>{Object.values(records).filter(v => v === "present").length} Present / {students.length} Total</span>
                    </div>
                    <p style={s.muted}>All students are marked Present by default. Uncheck to mark Absent.</p>
                    {students.length === 0 ? <p style={s.empty}>No students enrolled.</p> : (
                        <div style={s.checkList}>
                            {students.map(st => (
                                <div key={st.id} style={{ ...s.checkRow, borderColor: records[st.id] === "absent" ? "#ef4444" : "#22c55e" }}>
                                    <label style={s.checkLabel}>
                                        <input type="checkbox" checked={records[st.id] === "present"} onChange={() => toggle(st.id)} style={s.checkbox} />
                                        <span style={s.bold}>{st.full_name || st.username}</span>
                                        <span style={s.muted}>@{st.username}</span>
                                    </label>
                                    <span style={{ ...s.statusBadge, background: records[st.id] === "present" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: records[st.id] === "present" ? "#22c55e" : "#ef4444" }}>
                                        {records[st.id] === "present" ? "✓ Present" : "✗ Absent"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={submit} disabled={submitting || students.length === 0} style={s.submitBtn}>
                        {submitting ? "Saving..." : "💾 Submit Attendance"}
                    </button>
                </>
            ) : (
                <>
                    <div style={s.histFilter}>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={s.dateInput} />
                        <button onClick={loadHistory} style={s.filterBtn}>🔍 Filter</button>
                    </div>
                    {historyData.length === 0 ? <p style={s.empty}>No attendance records found.</p> :
                        historyData.map(sess => (
                            <div key={sess.session_id} style={s.histCard}>
                                <div style={s.histHeader}>
                                    <strong style={s.bold}>📅 {sess.date}</strong>
                                    <span style={s.badge}>{sess.details.filter(d => d.status === "present").length} Present</span>
                                </div>
                                <div style={s.histGrid}>
                                    {sess.details.map(d => (
                                        <span key={d.student_id} style={{ ...s.histStudentChip, background: d.status === "present" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: d.status === "present" ? "#22c55e" : "#ef4444" }}>
                                            {d.student_name || d.student_username} — {d.status}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))
                    }
                </>
            )}
        </div>
    );
};

const ExamsTab = ({ exams, examForm, setExamForm, onSubmit, submitting }) => (
    <div style={s.section}>
        <h3 style={s.sectionTitle}>📝 Exams</h3>
        <form onSubmit={onSubmit} style={s.form}>
            <input placeholder="Exam title" value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} style={s.input} required />
            <input type="datetime-local" value={examForm.date} onChange={e => setExamForm({ ...examForm, date: e.target.value })} style={s.input} required />
            <button type="submit" disabled={submitting} style={s.submitBtn}>{submitting ? "Creating..." : "➕ Create Exam"}</button>
        </form>
        <div style={s.list}>
            {exams.length === 0 ? <p style={s.empty}>No exams scheduled.</p> : exams.map(ex => (
                <div key={ex.id} style={s.listItem}>
                    <span style={s.bold}>📝 {ex.title}</span>
                    <span style={s.muted}>{new Date(ex.date).toLocaleString("en-IN")}</span>
                </div>
            ))}
        </div>
    </div>
);

const MaterialsTab = ({ materials, matTitle, setMatTitle, matFile, setMatFile, onSubmit, submitting }) => (
    <div style={s.section}>
        <h3 style={s.sectionTitle}>📁 Study Materials</h3>
        <form onSubmit={onSubmit} style={s.form}>
            <input placeholder="Material title" value={matTitle} onChange={e => setMatTitle(e.target.value)} style={s.input} required />
            <input type="file" onChange={e => setMatFile(e.target.files[0])} style={s.input} required />
            <button type="submit" disabled={submitting} style={s.submitBtn}>{submitting ? "Uploading..." : "📤 Upload"}</button>
        </form>
        <div style={s.list}>
            {materials.length === 0 ? <p style={s.empty}>No materials uploaded yet.</p> : materials.map(m => (
                <div key={m.id} style={s.listItem}>
                    <span style={s.bold}>📄 {m.title}</span>
                    <span style={s.muted}>{new Date(m.timestamp).toLocaleDateString("en-IN")}</span>
                </div>
            ))}
        </div>
    </div>
);

const AssignmentsTab = ({ assignments, submissions, asgnForm, setAsgnForm, onSubmit, role, classId, flash, refresh, headers }) => {
    const handleFile = async (id, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append("assignment_id", id);
        formData.append("file", file);
        try {
            await axios.post(`${API}/interaction/submissions`, formData, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
            refresh();
            flash("✅ Submitted!");
        } catch (err) { flash("❌ " + (err.response?.data?.detail || "Failed"), false); }
    };

    return (
        <div style={s.section}>
            <h3 style={s.sectionTitle}>📅 Assignments</h3>
            {role === "admin" || role === "faculty" ? (
                <form onSubmit={onSubmit} style={s.form}>
                    <input placeholder="Assignment title" value={asgnForm.title} onChange={e => setAsgnForm({ ...asgnForm, title: e.target.value })} style={s.input} required />
                    <textarea placeholder="Description" value={asgnForm.description} onChange={e => setAsgnForm({ ...asgnForm, description: e.target.value })} style={{ ...s.input, minHeight: "60px" }} required />
                    <input type="datetime-local" value={asgnForm.deadline} onChange={e => setAsgnForm({ ...asgnForm, deadline: e.target.value })} style={s.input} required />
                    <button type="submit" style={s.submitBtn}>➕ Create Assignment</button>
                </form>
            ) : null}
            <div style={s.list}>
                {assignments.length === 0 ? <p style={s.empty}>No assignments found.</p> : assignments.map(as => {
                    const sub = submissions.find(s => s.assignment_id === as.id);
                    return (
                        <div key={as.id} style={s.listItem}>
                            <div>
                                <strong style={s.bold}>{as.title}</strong>
                                <p style={s.muted}>{as.description}</p>
                                <span style={s.badge}>Due: {new Date(as.deadline).toLocaleString()}</span>
                            </div>
                            {role === "student" && (
                                sub ? <span style={{ ...s.statusBadge, background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>✓ Submitted</span> :
                                <input type="file" onChange={e => handleFile(as.id, e.target.files[0])} style={{ fontSize: "12px", maxWidth: "150px" }} />
                            )}
                            {(role === "admin" || role === "faculty") && (
                                <Link to={`/admin/submissions/${as.id}`} style={s.back}>View Subs</Link>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AnnouncementsTab = ({ announcements, annForm, setAnnForm, onSubmit, role, flash, refresh, headers }) => {
    const vote = async (pollId, optId) => {
        try {
            await axios.post(`${API}/interaction/poll-responses`, { poll_id: pollId, selected_option_id: optId }, { headers });
            refresh();
            flash("✅ Vote recorded!");
        } catch (err) { flash("❌ " + (err.response?.data?.detail || "Failed"), false); }
    };

    return (
        <div style={s.section}>
            <h3 style={s.sectionTitle}>📢 Announcements & Polls</h3>
            {role === "admin" || role === "faculty" ? (
                <form onSubmit={onSubmit} style={s.form}>
                    <textarea placeholder="Message..." value={annForm.message} onChange={e => setAnnForm({ ...annForm, message: e.target.value })} style={{ ...s.input, minHeight: "60px" }} required />
                    <div style={{ display: "flex", gap: "10px", margin: "10px 0" }}>
                        <button type="button" onClick={() => setAnnForm({ ...annForm, type: "normal" })} style={annForm.type === "normal" ? s.toggleActive : s.toggleInactive}>Normal</button>
                        <button type="button" onClick={() => setAnnForm({ ...annForm, type: "poll" })} style={annForm.type === "poll" ? s.toggleActive : s.toggleInactive}>Poll</button>
                    </div>
                    {annForm.type === "poll" && (
                        <div style={{ padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", marginBottom: "10px" }}>
                            <input placeholder="Poll Question" value={annForm.poll_question} onChange={e => setAnnForm({ ...annForm, poll_question: e.target.value })} style={s.input} />
                            <p style={{ ...s.muted, margin: "10px 0 5px" }}>Options (comma separated)</p>
                            <input placeholder="Yes, No, Maybe" value={annForm.poll_options.join(", ")} onChange={e => setAnnForm({ ...annForm, poll_options: e.target.value.split(",").map(x => x.trim()) })} style={s.input} />
                        </div>
                    )}
                    <button type="submit" style={s.submitBtn}>Post Announcement</button>
                </form>
            ) : null}
            <div style={s.list}>
                {announcements.length === 0 ? <p style={s.empty}>No announcements yet.</p> : announcements.map(a => (
                    <div key={a.id} style={s.annCard}>
                        <p style={s.annText}>{a.content || a.message}</p>
                        {a.type === "poll" && a.poll && (
                            <div style={s.pollBox}>
                                <strong style={{ display: "block", marginBottom: "10px" }}>📊 {a.poll.question}</strong>
                                {a.poll.options.map(opt => {
                                    const count = a.poll.responses?.filter(r => r.selected_option_id === opt.id).length || 0;
                                    const total = a.poll.responses?.length || 1;
                                    const pct = (count / total) * 100;
                                    return (
                                        <div key={opt.id} onClick={() => role === "student" && vote(a.poll.id, opt.id)} style={{ ...s.pollOpt, cursor: role === "student" ? "pointer" : "default" }}>
                                            <div style={{ ...s.pollFill, width: `${pct}%` }} />
                                            <span style={s.pollLabel}>{opt.option_text}</span>
                                            <span style={s.pollCount}>{count} votes</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <span style={s.muted}>{new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s = {
    page: { minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", fontFamily: "'Inter', sans-serif", color: "#fff" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" },
    back: { color: "#a78bfa", textDecoration: "none", fontWeight: 600, fontSize: "14px" },
    headerCenter: { textAlign: "center" },
    headerTitle: { margin: 0, fontSize: "20px", fontWeight: 700 },
    classId: { color: "rgba(255,255,255,0.4)", fontSize: "13px" },
    logoutBtn: { background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" },
    flashMsg: { background: "#22c55e", color: "#fff", textAlign: "center", padding: "10px", fontWeight: 600 },
    adminSection: { margin: "20px 32px", padding: "15px 20px", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "12px" },
    adminLabel: { fontSize: "11px", fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "1px" },
    adminSelect: { padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", outline: "none", flex: 1 },
    adminBtn: { padding: "8px 20px", background: "#7c3aed", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 700, cursor: "pointer" },
    tabs: { display: "flex", gap: "4px", padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", overflowX: "auto" },
    tab: { padding: "10px 20px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap" },
    activeTab: { background: "rgba(124,58,237,0.3)", border: "1px solid #7c3aed", color: "#a78bfa" },
    main: { padding: "32px" },
    section: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "28px" },
    sectionTitle: { margin: "0 0 20px", fontSize: "18px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" },
    badge: { background: "rgba(167,139,250,0.2)", color: "#a78bfa", padding: "3px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 600 },
    empty: { color: "rgba(255,255,255,0.3)", fontStyle: "italic" },
    table: { display: "flex", flexDirection: "column", gap: "2px" },
    thead: { display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr 1fr", padding: "10px 16px", color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" },
    trow: { display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr 1fr", padding: "14px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", alignItems: "center" },
    bold: { fontWeight: 600, color: "#fff" },
    muted: { color: "rgba(255,255,255,0.4)", fontSize: "14px" },
    form: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px", padding: "20px", background: "rgba(255,255,255,0.04)", borderRadius: "12px" },
    input: { padding: "12px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#fff", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box" },
    submitBtn: { padding: "12px 24px", background: "linear-gradient(90deg, #7c3aed, #2563eb)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer", alignSelf: "flex-start" },
    list: { display: "flex", flexDirection: "column", gap: "10px" },
    listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "10px" },
    annCard: { padding: "16px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", borderLeft: "3px solid #7c3aed" },
    annText: { margin: "0 0 8px", lineHeight: 1.6 },
    tabToggle: { display: "flex", gap: "8px", marginBottom: "24px" },
    toggleActive: { padding: "9px 20px", background: "rgba(124,58,237,0.3)", border: "1px solid #7c3aed", borderRadius: "10px", color: "#a78bfa", fontWeight: 700, cursor: "pointer" },
    toggleInactive: { padding: "9px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "rgba(255,255,255,0.5)", fontWeight: 600, cursor: "pointer" },
    attHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
    checkList: { display: "flex", flexDirection: "column", gap: "8px", margin: "16px 0 24px" },
    checkRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", border: "1px solid" },
    checkLabel: { display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" },
    checkbox: { width: "18px", height: "18px", cursor: "pointer", accentColor: "#7c3aed" },
    statusBadge: { padding: "4px 12px", borderRadius: "20px", fontWeight: 700, fontSize: "13px" },
    histFilter: { display: "flex", gap: "10px", marginBottom: "20px" },
    dateInput: { padding: "10px 14px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#fff", fontSize: "14px" },
    filterBtn: { padding: "10px 20px", background: "rgba(124,58,237,0.3)", border: "1px solid #7c3aed", borderRadius: "10px", color: "#a78bfa", fontWeight: 700, cursor: "pointer" },
    histCard: { background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "16px", marginBottom: "12px" },
    histHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
    histGrid: { display: "flex", flexWrap: "wrap", gap: "8px" },
    histStudentChip: { padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 600 },
    pollBox: { margin: "15px 0", padding: "15px", background: "rgba(0,0,0,0.2)", borderRadius: "12px" },
    pollOpt: { position: "relative", padding: "10px 15px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", marginBottom: "8px", overflow: "hidden", display: "flex", justifyContent: "space-between", alignItems: "center" },
    pollFill: { position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(124,58,237,0.2)", zIndex: 0, transition: "width 0.5s ease" },
    pollLabel: { position: "relative", zIndex: 1, fontWeight: 600 },
    pollCount: { position: "relative", zIndex: 1, fontSize: "12px", opacity: 0.7 },
};

export default ClassDetail;

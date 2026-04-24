import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const API = "http://localhost:8000";

/* ── Custom Dropdown ────────────────────────────────────────────────────── */
const Dropdown = ({ value, onChange, options, placeholder }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = options.find(o => String(o.value) === String(value));
    useEffect(() => {
        const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);
    return (
        <div ref={ref} style={dd.wrap}>
            <button type="button" onClick={() => setOpen(o => !o)} style={dd.trigger}>
                <span style={selected ? dd.sel : dd.ph}>{selected ? selected.label : placeholder}</span>
                <span style={{ ...dd.arrow, transform: open ? "rotate(180deg)" : "none" }}>▾</span>
            </button>
            {open && (
                <div style={dd.menu}>
                    {options.map(o => (
                        <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                            style={{ ...dd.item, ...(String(value) === String(o.value) ? dd.active : {}) }}>
                            {o.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
const dd = {
    wrap: { position: "relative" },
    trigger: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#fff", fontSize: "14px", cursor: "pointer", textAlign: "left", boxSizing: "border-box" },
    sel: { color: "#fff", fontWeight: 600 },
    ph: { color: "rgba(255,255,255,0.35)" },
    arrow: { color: "#a78bfa", fontSize: "16px", transition: "transform 0.2s", flexShrink: 0 },
    menu: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#1e1b4b", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "12px", zIndex: 999, overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.6)", maxHeight: "220px", overflowY: "auto" },
    item: { padding: "11px 14px", color: "rgba(255,255,255,0.85)", fontSize: "14px", cursor: "pointer" },
    active: { background: "rgba(124,58,237,0.3)", color: "#c4b5fd", fontWeight: 700 },
};

/* ── Admin Panel ────────────────────────────────────────────────────────── */
const AdminPanel = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const headers = { Authorization: `Bearer ${token}` };

    const [step, setStep] = useState(1);
    const [classes, setClasses] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [students, setStudents] = useState([]);
    const [msg, setMsg] = useState({ text: "", ok: true });

    // Step 1 — Add Faculty
    const [facultyForm, setFacultyForm] = useState({ full_name: "", username: "", email: "", department: "", password: "" });

    // Step 2 — Create Class
    const [classForm, setClassForm] = useState({ name: "", description: "", faculty_id: "", program_id: "", semester_id: "" });

    // Programs & semesters for Step 2
    const [programs, setPrograms] = useState([]);
    const [semestersForProg, setSemestersForProg] = useState([]);
    const [classSearch, setClassSearch] = useState("");

    // Step 3 — Add Student
    const [studentForm, setStudentForm] = useState({ full_name: "", username: "", email: "", department: "", year: "", password: "" });

    // Step 4 — Enroll
    const [enrollForm, setEnrollForm] = useState({ class_id: "", student_id: "" });

    // New: Assign Faculty to existing class
    const [assignForm, setAssignForm] = useState({ class_id: "", faculty_id: "" });

    const loadAll = useCallback(async () => {
        const h = { Authorization: `Bearer ${token}` };
        try {
            const [c, f, s, p] = await Promise.all([
                axios.get(`${API}/admin/classes`, { headers: h }),
                axios.get(`${API}/admin/faculties`, { headers: h }),
                axios.get(`${API}/admin/students`, { headers: h }),
                axios.get(`${API}/admin/programs`, { headers: h }),
            ]);
            setClasses(c.data); setFaculties(f.data); setStudents(s.data); setPrograms(p.data);
        } catch { flash("Failed to load data", false); }
    }, [token]);

    useEffect(() => {
        if (!token || role !== "admin") { navigate("/login"); return; }
        loadAll();
    }, [token, role, navigate, loadAll]);

    const flash = (text, ok = true) => {
        setMsg({ text, ok });
        setTimeout(() => setMsg({ text: "", ok: true }), 3500);
    };

    /* ── Handlers ── */
    const handleAddFaculty = async e => {
        e.preventDefault();
        try {
            await axios.post(`${API}/register`, { ...facultyForm, role: "faculty" }, { headers });
            setFacultyForm({ full_name: "", username: "", email: "", department: "", password: "" });
            loadAll();
            flash("✅ Faculty member added! Now create a class → Step 2");
        } catch (err) { flash("❌ " + (err.response?.data?.detail || "Failed"), false); }
    };

    const handleCreateClass = async e => {
        e.preventDefault();
        if (!classForm.faculty_id) { flash("Please select a faculty member", false); return; }
        try {
            const payload = {
                name: classForm.name,
                description: classForm.description,
                faculty_id: parseInt(classForm.faculty_id),
                ...(classForm.semester_id ? { semester_id: parseInt(classForm.semester_id) } : {}),
            };
            await axios.post(`${API}/admin/classes`, payload, { headers });
            setClassForm({ name: "", description: "", faculty_id: "", program_id: "", semester_id: "" });
            setSemestersForProg([]);
            loadAll();
            flash("✅ Class created and faculty assigned!");
        } catch (err) { flash("❌ " + (err.response?.data?.detail || "Failed"), false); }
    };

    const handleProgramChange = async (progId) => {
        setClassForm(f => ({ ...f, program_id: progId, semester_id: "" }));
        if (!progId) { setSemestersForProg([]); return; }
        try {
            const res = await axios.get(`${API}/admin/semesters?program_id=${progId}`, { headers });
            setSemestersForProg(res.data);
        } catch { setSemestersForProg([]); }
    };

    const handleAssignFaculty = async e => {
        e.preventDefault();
        if (!assignForm.class_id || !assignForm.faculty_id) { flash("Select both a class and faculty", false); return; }
        try {
            await axios.post(`${API}/admin/assign-faculty`, 
                { class_id: parseInt(assignForm.class_id), faculty_id: parseInt(assignForm.faculty_id) },
                { headers });
            setAssignForm({ class_id: "", faculty_id: "" });
            loadAll();
            flash("✅ Faculty assigned to class!");
        } catch (err) { flash("❌ " + (err.response?.data?.detail || "Failed"), false); }
    };

    const handleAddStudent = async e => {
        e.preventDefault();
        try {
            await axios.post(`${API}/register`, { ...studentForm, role: "student" }, { headers });
            setStudentForm({ full_name: "", username: "", email: "", department: "", year: "", password: "" });
            loadAll();
            flash("✅ Student account created! Now enroll them in a class → Step 4");
        } catch (err) { flash("❌ " + (err.response?.data?.detail || "Failed"), false); }
    };

    const handleEnroll = async e => {
        e.preventDefault();
        if (!enrollForm.class_id || !enrollForm.student_id) { flash("Select both a class and a student", false); return; }
        try {
            await axios.post(`${API}/admin/enroll`,
                { class_id: parseInt(enrollForm.class_id), student_id: parseInt(enrollForm.student_id) },
                { headers });
            setEnrollForm({ ...enrollForm, student_id: "" });
            flash("✅ Student enrolled into class!");
        } catch (err) { flash("❌ " + (err.response?.data?.detail || "Already enrolled / Failed"), false); }
    };

    const classOpts   = classes.map(c => ({ value: c.id, label: c.course_name || c.name || `Class ${c.id}` }));
    const facultyOpts = faculties.map(f => ({ value: f.id, label: `${f.full_name || f.username}${f.department ? " — " + f.department : ""}` }));
    const studentOpts = students.map(s => ({ value: s.id, label: `${s.full_name || s.username} (@${s.username})` }));
    const programOpts = programs.map(p => ({ value: p.id, label: p.name }));
    const semesterOpts = semestersForProg.map(sm => ({ value: sm.id, label: `Semester ${sm.semester_number}` }));

    const filteredClasses = classes.filter(c => {
        const q = classSearch.toLowerCase();
        return !q ||
            (c.course_name || c.name || "").toLowerCase().includes(q) ||
            (c.program_name || "").toLowerCase().includes(q) ||
            (c.instructor_name || "").toLowerCase().includes(q);
    });

    const STEPS = [
        { n: 1, icon: "🧑‍🏫", label: "Add Faculty" },
        { n: 2, icon: "📚", label: "Create Class" },
        { n: 3, icon: "👤", label: "Add Students" },
        { n: 4, icon: "📋", label: "Enroll" },
    ];

    return (
        <div style={s.page}>
            <header style={s.header}>
                <Link to="/faculty" style={s.back}>← Faculty Portal</Link>
                <div style={{ textAlign: "center" }}>
                    <h2 style={s.title}>⚙️ Admin Panel</h2>
                    <span style={s.sub}>{classes.length} classes · {students.length} students · {faculties.length} faculty</span>
                </div>
                <Link to="/admin/attendance-report" style={s.reportLink}>📊 Reports</Link>
            </header>

            {msg.text && (
                <div style={{ ...s.flash, background: msg.ok ? "rgba(22,163,74,0.92)" : "rgba(220,38,38,0.92)" }}>
                    {msg.text}
                </div>
            )}

            <div style={s.stepNav}>
                {STEPS.map(st => (
                    <button key={st.n} onClick={() => setStep(st.n)}
                        style={{ ...s.stepBtn, ...(step === st.n ? s.stepActive : {}) }}>
                        <span style={{ ...s.stepNum, ...(step === st.n ? s.stepNumActive : {}) }}>{st.n}</span>
                        <span>{st.icon} {st.label}</span>
                    </button>
                ))}
            </div>

            <main style={s.main}>

                {/* ══ STEP 1: Add Faculty ══ */}
                {step === 1 && (
                    <div style={s.grid}>
                        <div style={s.card}>
                            <div style={{ ...s.cardAccent, background: "linear-gradient(90deg,#7c3aed,#2563eb)" }} />
                            <div style={s.cardBody}>
                                <h3 style={s.cardTitle}>🧑‍🏫 Add Faculty Member</h3>
                                <p style={s.hint}>Register a new faculty member before creating a class.</p>
                                <form onSubmit={handleAddFaculty} style={s.form}>
                                    <div style={s.fieldRow}>
                                        <div style={s.field}>
                                            <label style={s.label}>Full Name *</label>
                                            <input placeholder="e.g. Mike Miller" value={facultyForm.full_name}
                                                onChange={e => setFacultyForm({ ...facultyForm, full_name: e.target.value })}
                                                style={s.input} required />
                                        </div>
                                        <div style={s.field}>
                                            <label style={s.label}>Username *</label>
                                            <input placeholder="e.g. mike" value={facultyForm.username}
                                                onChange={e => setFacultyForm({ ...facultyForm, username: e.target.value })}
                                                style={s.input} required />
                                        </div>
                                    </div>
                                    <div style={s.fieldRow}>
                                        <div style={s.field}>
                                            <label style={s.label}>Email</label>
                                            <input placeholder="mike@university.edu" value={facultyForm.email}
                                                onChange={e => setFacultyForm({ ...facultyForm, email: e.target.value })}
                                                style={s.input} type="email" />
                                        </div>
                                        <div style={s.field}>
                                            <label style={s.label}>Department</label>
                                            <input placeholder="e.g. Computer Science" value={facultyForm.department}
                                                onChange={e => setFacultyForm({ ...facultyForm, department: e.target.value })}
                                                style={s.input} />
                                        </div>
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Password *</label>
                                        <input placeholder="Set a password" value={facultyForm.password}
                                            onChange={e => setFacultyForm({ ...facultyForm, password: e.target.value })}
                                            style={s.input} type="password" required />
                                    </div>
                                    <button type="submit" style={s.btn}>🧑‍🏫 Add Faculty</button>
                                </form>
                            </div>
                        </div>
                        <div style={s.card}>
                            <div style={{ ...s.cardAccent, background: "linear-gradient(90deg,#7c3aed,#2563eb)" }} />
                            <div style={s.cardBody}>
                                <h3 style={s.cardTitle}>All Faculty <span style={s.badge}>{faculties.length}</span></h3>
                                <div style={s.list}>
                                    {faculties.length === 0 ? <p style={s.empty}>No faculty yet.</p> : faculties.map(f => (
                                        <div key={f.id} style={s.listItem}>
                                            <div>
                                                <strong style={s.itemName}>🧑‍🏫 {f.full_name || f.username}</strong>
                                                <p style={s.itemSub}>@{f.username}{f.department ? " · " + f.department : ""}</p>
                                            </div>
                                            <span style={s.idPill}>#{f.id}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setStep(2)} style={s.nextBtn}>Next: Create Class →</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ STEP 2: Create Class ══ */}
                {step === 2 && (
                    <div style={s.grid}>
                        <div style={s.card}>
                            <div style={{ ...s.cardAccent, background: "linear-gradient(90deg,#0ea5e9,#38bdf8)" }} />
                            <div style={s.cardBody}>
                                <h3 style={s.cardTitle}>📚 Create a New Class</h3>
                                <p style={s.hint}>A class needs a name, program, semester, and an assigned faculty member.</p>
                                <form onSubmit={handleCreateClass} style={s.form}>
                                    <div style={s.field}>
                                        <label style={s.label}>Class Name *</label>
                                        <input placeholder="e.g. Introduction to AI" value={classForm.name}
                                            onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                                            style={s.input} required />
                                    </div>
                                    <div style={s.fieldRow}>
                                        <div style={s.field}>
                                            <label style={s.label}>Program</label>
                                            <Dropdown value={classForm.program_id}
                                                onChange={v => handleProgramChange(v)}
                                                options={programOpts}
                                                placeholder="— Select Program —" />
                                        </div>
                                        <div style={s.field}>
                                            <label style={s.label}>Semester</label>
                                            <Dropdown value={classForm.semester_id}
                                                onChange={v => setClassForm(f => ({ ...f, semester_id: v }))}
                                                options={semesterOpts}
                                                placeholder={classForm.program_id ? "— Select Semester —" : "Select program first"} />
                                        </div>
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Assign Faculty *</label>
                                        <Dropdown value={classForm.faculty_id}
                                            onChange={v => setClassForm({ ...classForm, faculty_id: v })}
                                            options={facultyOpts}
                                            placeholder={faculties.length === 0 ? "No faculty yet — create one first" : "— Select faculty —"} />
                                    </div>
                                    <button type="submit" style={{ ...s.btn, background: "linear-gradient(90deg,#0ea5e9,#38bdf8)" }}>➕ Create Class</button>
                                </form>

                                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "28px", paddingTop: "24px" }} />

                                <h3 style={s.cardTitle}>🤝 Assign Faculty to Existing Class</h3>
                                <p style={s.hint}>Assign faculty to a class that was created without one.</p>
                                <form onSubmit={handleAssignFaculty} style={s.form}>
                                    <div style={s.field}>
                                        <label style={s.label}>Select Class *</label>
                                        <Dropdown value={assignForm.class_id}
                                            onChange={v => setAssignForm({ ...assignForm, class_id: v })}
                                            options={classOpts}
                                            placeholder="— Select class —" />
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Assign Faculty *</label>
                                        <Dropdown value={assignForm.faculty_id}
                                            onChange={v => setAssignForm({ ...assignForm, faculty_id: v })}
                                            options={facultyOpts}
                                            placeholder="— Select faculty —" />
                                    </div>
                                    <button type="submit" style={{ ...s.btn, background: "linear-gradient(90deg,#8b5cf6,#a78bfa)" }}>🤝 Assign Faculty</button>
                                </form>
                            </div>
                        </div>

                        {/* All Classes with search */}
                        <div style={s.card}>
                            <div style={{ ...s.cardAccent, background: "linear-gradient(90deg,#0ea5e9,#38bdf8)" }} />
                            <div style={s.cardBody}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                    <h3 style={{ ...s.cardTitle, margin: 0 }}>All Classes <span style={s.badge}>{classes.length}</span></h3>
                                </div>
                                {/* Search bar */}
                                <div style={s.searchBar}>
                                    <span style={s.searchIcon}>🔍</span>
                                    <input
                                        value={classSearch}
                                        onChange={e => setClassSearch(e.target.value)}
                                        placeholder="Search by name, program or faculty…"
                                        style={s.searchInput}
                                    />
                                    {classSearch && <button onClick={() => setClassSearch("")} style={s.clearBtn}>✕</button>}
                                </div>
                                <div style={s.list}>
                                    {filteredClasses.length === 0
                                        ? <p style={s.empty}>{classSearch ? "No matches found." : "No classes yet."}</p>
                                        : filteredClasses.map(c => (
                                            <div key={c.id} style={s.classRow}>
                                                <div style={{ flex: 1 }}>
                                                    <strong style={s.itemName}>{c.course_name || c.name || `Class ${c.id}`}</strong>
                                                    <div style={s.classMeta}>
                                                        {c.program_name && <span style={s.metaTag}>📊 {c.program_name}</span>}
                                                        {c.semester_number && <span style={s.metaTag}>Sem {c.semester_number}</span>}
                                                        <span style={c.instructor_name ? s.metaFaculty : s.metaNoFaculty}>
                                                            👨‍🏫 {c.instructor_name || "Not Assigned"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span style={s.idPill}>#{c.id}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                                <button onClick={() => setStep(3)} style={s.nextBtn}>Next: Add Students →</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ STEP 3: Add Students ══ */}
                {step === 3 && (
                    <div style={s.grid}>
                        <div style={s.card}>
                            <div style={{ ...s.cardAccent, background: "linear-gradient(90deg,#22c55e,#16a34a)" }} />
                            <div style={s.cardBody}>
                                <h3 style={s.cardTitle}>👤 Add a New Student</h3>
                                <form onSubmit={handleAddStudent} style={s.form}>
                                    <div style={s.fieldRow}>
                                        <div style={s.field}>
                                            <label style={s.label}>Full Name *</label>
                                            <input placeholder="e.g. John Doe" value={studentForm.full_name}
                                                onChange={e => setStudentForm({ ...studentForm, full_name: e.target.value })}
                                                style={s.input} required />
                                        </div>
                                        <div style={s.field}>
                                            <label style={s.label}>Username *</label>
                                            <input placeholder="e.g. john_doe" value={studentForm.username}
                                                onChange={e => setStudentForm({ ...studentForm, username: e.target.value })}
                                                style={s.input} required />
                                        </div>
                                    </div>
                                    <div style={s.fieldRow}>
                                        <div style={s.field}>
                                            <label style={s.label}>Email</label>
                                            <input placeholder="john@student.edu" value={studentForm.email}
                                                onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                                                style={s.input} type="email" />
                                        </div>
                                        <div style={s.field}>
                                            <label style={s.label}>Department</label>
                                            <input placeholder="e.g. Computer Science" value={studentForm.department}
                                                onChange={e => setStudentForm({ ...studentForm, department: e.target.value })}
                                                style={s.input} />
                                        </div>
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Password *</label>
                                        <input placeholder="Set a password" value={studentForm.password}
                                            onChange={e => setStudentForm({ ...studentForm, password: e.target.value })}
                                            style={s.input} type="password" required />
                                    </div>
                                    <button type="submit" style={{ ...s.btn, background: "linear-gradient(90deg,#22c55e,#16a34a)" }}>👤 Add Student</button>
                                </form>
                            </div>
                        </div>
                        <div style={s.card}>
                            <div style={{ ...s.cardAccent, background: "linear-gradient(90deg,#22c55e,#16a34a)" }} />
                            <div style={s.cardBody}>
                                <h3 style={s.cardTitle}>All Students <span style={s.badge}>{students.length}</span></h3>
                                <div style={s.list}>
                                    {students.length === 0 ? <p style={s.empty}>No students yet.</p> : students.map(st => (
                                        <div key={st.id} style={s.listItem}>
                                            <div>
                                                <strong style={s.itemName}>👤 {st.full_name || st.username}</strong>
                                                <p style={s.itemSub}>@{st.username}</p>
                                            </div>
                                            <span style={s.idPill}>#{st.id}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setStep(4)} style={s.nextBtn}>Next: Enroll →</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ STEP 4: Enroll ══ */}
                {step === 4 && (
                    <div style={s.grid}>
                        <div style={s.card}>
                            <div style={{ ...s.cardAccent, background: "linear-gradient(90deg,#f59e0b,#d97706)" }} />
                            <div style={s.cardBody}>
                                <h3 style={s.cardTitle}>📋 Enroll Student into Class</h3>
                                <form onSubmit={handleEnroll} style={s.form}>
                                    <div style={s.field}>
                                        <label style={s.label}>Class *</label>
                                        <Dropdown value={enrollForm.class_id} onChange={v => setEnrollForm({ ...enrollForm, class_id: v })}
                                            options={classOpts} placeholder="— Select a class —" />
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Student *</label>
                                        <Dropdown value={enrollForm.student_id} onChange={v => setEnrollForm({ ...enrollForm, student_id: v })}
                                            options={studentOpts} placeholder="— Select a student —" />
                                    </div>
                                    <button type="submit" style={{ ...s.btn, background: "linear-gradient(90deg,#f59e0b,#d97706)" }}>✅ Enroll Student</button>
                                </form>
                            </div>
                        </div>
                        <div style={s.card}>
                            <div style={{ ...s.cardAccent, background: "linear-gradient(90deg,#f59e0b,#d97706)" }} />
                            <div style={s.cardBody}>
                                <h3 style={s.cardTitle}>Summary</h3>
                                <div style={s.summaryGrid}>
                                    <div style={s.summaryTile}><span style={s.sumNum}>{classes.length}</span><span style={s.sumLabel}>Classes</span></div>
                                    <div style={s.summaryTile}><span style={{ ...s.sumNum, color: "#4ade80" }}>{students.length}</span><span style={s.sumLabel}>Students</span></div>
                                    <div style={s.summaryTile}><span style={{ ...s.sumNum, color: "#38bdf8" }}>{faculties.length}</span><span style={s.sumLabel}>Faculty</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const s = {
    page: { minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", fontFamily: "'Inter',sans-serif", color: "#fff" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" },
    back: { color: "#a78bfa", textDecoration: "none", fontWeight: 600, fontSize: "14px" },
    title: { margin: "0 0 2px", fontSize: "20px", fontWeight: 700 },
    sub: { color: "rgba(255,255,255,0.35)", fontSize: "12px" },
    reportLink: { color: "#a78bfa", textDecoration: "none", fontWeight: 600, fontSize: "14px" },
    flash: { textAlign: "center", padding: "11px 20px", color: "#fff", fontWeight: 600, fontSize: "14px" },
    stepNav: { display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.25)" },
    stepBtn: { flex: 1, display: "flex", alignItems: "center", gap: "10px", padding: "16px 24px", border: "none", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontWeight: 600, fontSize: "13px", borderBottom: "2px solid transparent" },
    stepActive: { color: "#fff", borderBottom: "2px solid #a78bfa", background: "rgba(124,58,237,0.1)" },
    stepNum: { width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800 },
    stepNumActive: { background: "#7c3aed", color: "#fff" },
    main: { padding: "32px 40px" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" },
    card: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px", overflow: "visible" },
    cardAccent: { height: "3px", background: "linear-gradient(90deg,#7c3aed,#2563eb)" },
    cardBody: { padding: "24px" },
    cardTitle: { margin: "0 0 6px", fontSize: "17px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" },
    hint: { color: "rgba(255,255,255,0.35)", fontSize: "13px", margin: "0 0 20px" },
    badge: { background: "rgba(167,139,250,0.2)", color: "#a78bfa", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 },
    form: { display: "flex", flexDirection: "column", gap: "14px" },
    field: { display: "flex", flexDirection: "column", gap: "6px" },
    fieldRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
    label: { fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" },
    input: { padding: "12px 14px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", color: "#fff", fontSize: "14px", outline: "none" },
    btn: { padding: "13px", background: "linear-gradient(90deg,#7c3aed,#2563eb)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "15px" },
    nextBtn: { marginTop: "16px", width: "100%", padding: "10px", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: "10px", color: "#a78bfa", cursor: "pointer" },
    list: { display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" },
    listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", background: "rgba(255,255,255,0.04)", borderRadius: "10px" },
    itemName: { display: "block", fontWeight: 600, color: "#fff", fontSize: "14px" },
    itemSub: { margin: "2px 0 0", color: "rgba(255,255,255,0.35)", fontSize: "12px" },
    idPill: { color: "#a78bfa", fontWeight: 700, fontSize: "12px" },
    empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "24px 0" },
    summaryGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" },
    summaryTile: { background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", textAlign: "center" },
    sumNum: { display: "block", fontSize: "28px", fontWeight: 800, color: "#a78bfa" },
    sumLabel: { color: "rgba(255,255,255,0.35)", fontSize: "12px" },
    // Search
    searchBar: { display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "9px 14px", marginBottom: "14px" },
    searchIcon: { fontSize: "13px", opacity: 0.5 },
    searchInput: { flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: "13px" },
    clearBtn: { background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "13px", padding: "0 4px" },
    // Class rows
    classRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", marginBottom: "8px" },
    classMeta: { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "5px" },
    metaTag: { background: "rgba(99,179,237,0.1)", color: "#63b3ed", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 },
    metaFaculty: { background: "rgba(52,211,153,0.1)", color: "#34d399", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 },
    metaNoFaculty: { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 },
};

export default AdminPanel;

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const API = "http://localhost:8000/admin";

const UniversityAdmin = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState("programs");
    const [msg, setMsg] = useState({ text: "", ok: true });

    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [courseTypes, setCourseTypes] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [classes, setClasses] = useState([]);
    const [allStudents, setAllStudents] = useState([]);

    const token = localStorage.getItem("token");

    const loadInitialData = useCallback(async () => {
        const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
        try {
            const [p, c, ct, f, cl, st] = await Promise.all([
                axios.get(`${API}/programs`, { headers: h }),
                axios.get(`${API}/courses`, { headers: h }),
                axios.get(`${API}/course-types`, { headers: h }),
                axios.get(`${API}/faculties`, { headers: h }),
                axios.get(`${API}/university/classes`, { headers: h }),
                axios.get(`${API}/students`, { headers: h })
            ]);
            setPrograms(p.data);
            setCourses(c.data);
            setCourseTypes(ct.data);
            setFaculties(f.data);
            setClasses(cl.data);
            setAllStudents(st.data);
        } catch (err) { flash("Failed to load data", false); }
    }, []);

    useEffect(() => {
        if (!token) navigate("/login");
        loadInitialData();
    }, [token, navigate, loadInitialData]);

    const flash = (text, ok = true) => {
        setMsg({ text, ok });
        setTimeout(() => setMsg({ text: "", ok: true }), 4000);
    };

    return (
        <div style={s.page}>
            <aside style={s.sidebar}>
                <div style={s.sideHeader}>
                    <div style={s.logoIcon}>🏛️</div>
                    <h2 style={s.logoText}>UniAdmin</h2>
                </div>
                <nav style={s.nav}>
                    <NavItem icon="📊" label="Programs" active={tab === "programs"} onClick={() => setTab("programs")} />
                    <NavItem icon="📚" label="Courses" active={tab === "courses"} onClick={() => setTab("courses")} />
                    <NavItem icon="🛠️" label="Curriculum" active={tab === "curriculum"} onClick={() => setTab("curriculum")} />
                    <NavItem icon="📅" label="Classes" active={tab === "classes"} onClick={() => setTab("classes")} />
                    <NavItem icon="👤" label="Students" active={tab === "students"} onClick={() => setTab("students")} />
                    <div style={{ height: "40px" }} />
                    <Link to="/admin/panel" style={s.backLink}>← Global Admin</Link>
                </nav>
            </aside>

            <main style={s.content}>
                <header style={s.header}>
                    <div>
                        <h1 style={s.headerTitle}>{tab.charAt(0).toUpperCase() + tab.slice(1)} Management</h1>
                        <p style={s.headerSub}>Manage your university structure and academic curriculum.</p>
                    </div>
                    {msg.text && <div style={{ ...s.flash, background: msg.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</div>}
                </header>

                <div style={s.tabContent}>
                    {tab === "programs" && <ProgramPanel programs={programs} refresh={loadInitialData} flash={flash} />}
                    {tab === "courses" && <CoursePanel courses={courses} types={courseTypes} refresh={loadInitialData} flash={flash} />}
                    {tab === "curriculum" && <CurriculumPanel programs={programs} courses={courses} faculties={faculties} flash={flash} />}
                    {tab === "classes" && <ClassPanel classes={classes} courses={courses} faculties={faculties} programs={programs} refresh={loadInitialData} flash={flash} />}
                    {tab === "students" && <StudentPanel students={allStudents} programs={programs} refresh={loadInitialData} flash={flash} />}
                </div>
            </main>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} style={{ ...s.navItem, ...(active ? s.navActive : {}) }}>
        <span style={s.navIcon}>{icon}</span>
        <span style={s.navLabel}>{label}</span>
    </button>
);

/* ── Panel Components ─────────────────────────────────────────────────────────── */

const ProgramPanel = ({ programs, refresh, flash }) => {
    const [form, setForm] = useState({ name: "", duration_years: 3, total_semesters: 6 });
    const [selectedId, setSelectedId] = useState(null);
    const [details, setDetails] = useState(null);

    const submit = async e => {
        e.preventDefault();
        try {
            await axios.post(`${API}/programs`, form, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            setForm({ name: "", duration_years: 3, total_semesters: 6 });
            refresh();
            flash("✅ Program created with auto-generated semesters!");
        } catch { flash("❌ Failed to create program", false); }
    };

    const viewDetails = async (id) => {
        setSelectedId(id);
        try {
            const res = await axios.get(`${API}/programs/${id}/full-structure`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            setDetails(res.data);
        } catch { flash("❌ Failed to load program structure", false); }
    };

    if (selectedId && details) {
        return (
            <div style={s.detailsWrap}>
                <header style={s.detailsHeader}>
                    <button onClick={() => { setSelectedId(null); setDetails(null); }} style={s.backBtn}>← Back to List</button>
                    <div>
                        <h2 style={s.detailsTitle}>{details.name}</h2>
                        <p style={s.detailsSub}>{details.duration_years} Years • {details.total_semesters} Semesters</p>
                    </div>
                </header>

                <div style={s.detailsGrid}>
                    {details.semesters.map(sem => (
                        <div key={sem.id} style={s.semCard}>
                            <div style={s.semHeader}>
                                <h3 style={s.semTitle}>Semester {sem.semester_number}</h3>
                                <span style={s.classCountBadge}>{sem.classes.length} Classes</span>
                            </div>
                            <div style={s.classList}>
                                {sem.classes.length === 0 ? (
                                    <p style={s.noClasses}>No active classes for this semester.</p>
                                ) : (
                                    sem.classes.map(cl => (
                                        <div key={cl.id} style={s.classCardMini}>
                                            <div style={s.classMain}>
                                                <span style={s.classNameMini}>{cl.course_name}</span>
                                                <span style={s.facultyNameMini}>👨‍🏫 {cl.instructor_name || "Unassigned"}</span>
                                            </div>
                                            <div style={s.studentCountMini}>
                                                <span style={s.studentNum}>{cl.student_count}</span>
                                                <span style={s.studentLabel}>Students</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={s.panelGrid}>
            <div style={s.card}>
                <h3 style={s.cardTitle}>Add New Program</h3>
                <form onSubmit={submit} style={s.form}>
                    <Field label="Program Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. BBA Entrepreneurship" />
                    <div style={s.fieldRow}>
                        <Field label="Duration (Years)" type="number" value={form.duration_years} onChange={v => setForm({ ...form, duration_years: v })} />
                        <Field label="Total Semesters" type="number" value={form.total_semesters} onChange={v => setForm({ ...form, total_semesters: v })} />
                    </div>
                    <button type="submit" style={s.btn}>Create Program</button>
                </form>
            </div>
            <div style={s.card}>
                <h3 style={s.cardTitle}>Existing Programs</h3>
                <p style={s.cardSub}>Click a program to view its semester structure and classes.</p>
                <div style={s.list}>
                    {programs.map(p => (
                        <div key={p.id} style={s.programCard} onClick={() => viewDetails(p.id)}>
                            <div style={s.programInfo}>
                                <span style={s.itemName}>{p.name}</span>
                                <span style={s.itemSub}>{p.duration_years} Years • {p.total_semesters} Semesters</span>
                            </div>
                            <div style={s.programArrow}>Open →</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CoursePanel = ({ courses, types, refresh, flash }) => {
    const [form, setForm] = useState({ name: "", course_type_id: "" });
    const submit = async e => {
        e.preventDefault();
        try {
            await axios.post(`${API}/courses`, { ...form, course_type_id: parseInt(form.course_type_id) }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            setForm({ name: "", course_type_id: "" });
            refresh();
            flash("✅ Course added successfully!");
        } catch { flash("❌ Failed to add course", false); }
    };

    return (
        <div style={s.panelGrid}>
            <div style={s.card}>
                <h3 style={s.cardTitle}>Add New Course</h3>
                <form onSubmit={submit} style={s.form}>
                    <Field label="Course Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Advanced Calculus" />
                    <div style={s.field}>
                        <label style={s.label}>Course Type</label>
                        <select value={form.course_type_id} onChange={e => setForm({ ...form, course_type_id: e.target.value })} style={s.input}>
                            <option value="">— Select Type —</option>
                            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <button type="submit" style={s.btn}>Create Course</button>
                </form>
            </div>
            <div style={s.card}>
                <h3 style={s.cardTitle}>Available Courses</h3>
                <div style={s.list}>
                    {courses.map(c => (
                        <div key={c.id} style={s.listItem}>
                            <div>
                                <span style={s.itemName}>{c.name}</span>
                                <span style={s.itemSub}>{c.course_type_name || "Course"}</span>
                            </div>
                            <span style={s.idPill}>ID: {c.id}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ── Curriculum Builder ──────────────────────────────────────────────────────── */

const CurriculumPanel = ({ programs, courses, faculties, flash }) => {
    const [progId, setProgId] = useState("");
    const [structure, setStructure] = useState(null);
    const [activeSemIdx, setActiveSemIdx] = useState(0);
    const [showAdd, setShowAdd] = useState(false);
    const [showGen, setShowGen] = useState(false); // for generation form
    const [genForm, setGenForm] = useState({ academic_year: "2024-25", sections: 1, instructor_id: "" });
    const [selectedCourses, setSelectedCourses] = useState([]); // for multi-select

    const loadStructure = useCallback(async (id) => {
        if (!id) return;
        try {
            const res = await axios.get(`${API}/programs/${id}/full-structure`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            setStructure(res.data);
        } catch { flash("Failed to load structure", false); }
    }, [flash]);

    useEffect(() => {
        if (progId) loadStructure(progId);
    }, [progId, loadStructure]);

    const handleAssign = async () => {
        if (selectedCourses.length === 0) return;
        const semId = structure.semesters[activeSemIdx].id;
        try {
            await axios.post(`${API}/assign-courses-to-semester?semester_id=${semId}`, selectedCourses, { 
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } 
            });
            setSelectedCourses([]);
            setShowAdd(false);
            loadStructure(progId);
            flash("✅ Courses assigned successfully!");
        } catch { flash("❌ Assignment failed", false); }
    };

    const handleGenerate = async () => {
        const semId = structure.semesters[activeSemIdx].id;
        const q = `semester_id=${semId}&academic_year=${genForm.academic_year}&sections=${genForm.sections}${genForm.instructor_id ? `&instructor_id=${genForm.instructor_id}` : ""}`;
        try {
            const res = await axios.post(`${API}/generate-classes?${q}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            setShowGen(false);
            flash(`🚀 ${res.data.message}`);
        } catch { flash("❌ Generation failed", false); }
    };

    const removeCourse = async (courseId) => {
        const semId = structure.semesters[activeSemIdx].id;
        try {
            await axios.delete(`${API}/semester-course?semester_id=${semId}&course_id=${courseId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            loadStructure(progId);
            flash("🗑️ Course removed");
        } catch { flash("❌ Remove failed", false); }
    };

    const currentSem = structure?.semesters[activeSemIdx];
    const available = courses.filter(c => !currentSem?.courses.some(sc => sc.id === c.id));

    return (
        <div style={s.card}>
            <div style={s.curToolbar}>
                <div style={s.field}>
                    <label style={s.label}>Select Program</label>
                    <select value={progId} onChange={e => setProgId(e.target.value)} style={s.input}>
                        <option value="">— Choose Program —</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            {structure && (
                <>
                    <div style={s.semTabs}>
                        {structure.semesters.map((sm, i) => (
                            <button key={sm.id} onClick={() => { setActiveSemIdx(i); setShowAdd(false); setShowGen(false); }}
                                style={{ ...s.semTab, ...(activeSemIdx === i ? s.semTabActive : {}) }}>
                                Sem {sm.semester_number}
                            </button>
                        ))}
                    </div>

                    <div style={s.curContent}>
                        <div style={s.curHeader}>
                            <h3 style={s.curTitle}>Curriculum: Semester {currentSem.semester_number}</h3>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button onClick={() => { setShowGen(!showGen); setShowAdd(false); }} style={{ ...s.addCourseBtn, background: "rgba(167,139,250,0.1)", borderColor: "#a78bfa", color: "#a78bfa" }}>
                                    ⚙️ Generate Classes
                                </button>
                                <button onClick={() => { setShowAdd(!showAdd); setShowGen(false); }} style={s.addCourseBtn}>
                                    {showAdd ? "✕ Close" : "➕ Add Course"}
                                </button>
                            </div>
                        </div>

                        {showGen && (
                            <div style={s.genForm}>
                                <h4 style={s.selTitle}>Auto-Generate Class Instances</h4>
                                <div style={s.fieldRow}>
                                    <div style={s.field}>
                                        <label style={s.label}>Academic Year</label>
                                        <input type="text" value={genForm.academic_year} onChange={e => setGenForm({ ...genForm, academic_year: e.target.value })} style={s.input} />
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Sections per Course</label>
                                        <select value={genForm.sections} onChange={e => setGenForm({ ...genForm, sections: parseInt(e.target.value) })} style={s.input}>
                                            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Section{n > 1 ? "s" : ""}</option>)}
                                        </select>
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Default Faculty (Optional)</label>
                                        <select value={genForm.instructor_id} onChange={e => setGenForm({ ...genForm, instructor_id: e.target.value })} style={s.input}>
                                            <option value="">— No faculty —</option>
                                            {faculties.map(f => <option key={f.id} value={f.id}>{f.full_name || f.username}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleGenerate} style={s.confirmBtn}>🚀 Start Generation</button>
                            </div>
                        )}

                        {showAdd && (
                            <div style={s.multiSelector}>
                                <h4 style={s.selTitle}>Select Courses to Add</h4>
                                <div style={s.selGrid}>
                                    {available.length === 0 ? <p style={s.muted}>No more courses available</p> : 
                                        available.map(c => (
                                            <label key={c.id} style={s.selLabel}>
                                                <input type="checkbox" checked={selectedCourses.includes(c.id)} 
                                                    onChange={e => {
                                                        if (e.target.checked) setSelectedCourses([...selectedCourses, c.id]);
                                                        else setSelectedCourses(selectedCourses.filter(id => id !== c.id));
                                                    }} />
                                                <span>{c.name}</span>
                                            </label>
                                        ))
                                    }
                                </div>
                                {selectedCourses.length > 0 && (
                                    <button onClick={handleAssign} style={s.confirmBtn}>Assign {selectedCourses.length} Courses</button>
                                )}
                            </div>
                        )}

                        <div style={s.assignedList}>
                            {currentSem.courses.length === 0 ? <p style={s.muted}>No courses assigned to this semester.</p> :
                                currentSem.courses.map(c => (
                                    <div key={c.id} style={s.curItem}>
                                        <div style={s.curItemInfo}>
                                            <span style={s.curItemName}>{c.name}</span>
                                            <span style={s.curItemType}>{c.course_type_name}</span>
                                        </div>
                                        <button onClick={() => removeCourse(c.id)} style={s.removeBtn}>Remove</button>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

/* ── Class Management ───────────────────────────────────────────────────────── */

const ClassPanel = ({ classes, courses, faculties, programs, refresh, flash }) => {
    const [form, setForm] = useState({ course_id: "", semester_id: "", instructor_id: "", section: "", schedule: "", academic_year: "2024-25" });
    const [selectedProgram, setSelectedProgram] = useState("");
    const [semesters, setSemesters] = useState([]);

    useEffect(() => {
        if (selectedProgram) {
            axios.get(`${API}/semesters?program_id=${selectedProgram}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(r => setSemesters(r.data));
        }
    }, [selectedProgram]);

    const submit = async e => {
        e.preventDefault();
        try {
            await axios.post(`${API}/university/classes`, { ...form, course_id: parseInt(form.course_id), semester_id: parseInt(form.semester_id), instructor_id: parseInt(form.instructor_id) }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            setForm({ course_id: "", semester_id: "", instructor_id: "", section: "", schedule: "", academic_year: "2024-25" });
            refresh();
            flash("✅ Class instance created!");
        } catch { flash("❌ Failed to create class", false); }
    };

    return (
        <div style={s.panelGrid}>
            <div style={s.card}>
                <h3 style={s.cardTitle}>Create Class Instance</h3>
                <form onSubmit={submit} style={s.form}>
                    <div style={s.fieldRow}>
                        <div style={s.field}>
                            <label style={s.label}>Program</label>
                            <select onChange={e => setSelectedProgram(e.target.value)} style={s.input}>
                                <option value="">— Select —</option>
                                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div style={s.field}>
                            <label style={s.label}>Semester</label>
                            <select value={form.semester_id} onChange={e => setForm({ ...form, semester_id: e.target.value })} style={s.input}>
                                <option value="">— Select —</option>
                                {semesters.map(sm => <option key={sm.id} value={sm.id}>Sem {sm.semester_number}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Course</label>
                        <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} style={s.input}>
                            <option value="">— Select —</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Instructor</label>
                        <select value={form.instructor_id} onChange={e => setForm({ ...form, instructor_id: e.target.value })} style={s.input}>
                            <option value="">— Select Faculty —</option>
                            {faculties.map(f => <option key={f.id} value={f.id}>{f.full_name || f.username}</option>)}
                        </select>
                    </div>
                    <div style={s.fieldRow}>
                        <Field label="Section" value={form.section} onChange={v => setForm({ ...form, section: v })} placeholder="e.g. A" />
                        <Field label="Schedule" value={form.schedule} onChange={v => setForm({ ...form, schedule: v })} placeholder="Mon 10am" />
                    </div>
                    <button type="submit" style={s.btn}>Deploy Class</button>
                </form>
            </div>
            <div style={s.card}>
                <h3 style={s.cardTitle}>Academic Classes</h3>
                <div style={s.list}>
                    {classes.map(cl => (
                        <div key={cl.id} style={s.listItem}>
                            <div>
                                <span style={s.itemName}>Class ID: {cl.id} — Sec {cl.section}</span>
                                <span style={s.itemSub}>{cl.schedule} • {cl.academic_year}</span>
                            </div>
                            <span style={s.idPill}>Active</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ── Student Management ─────────────────────────────────────────────────────── */

const StudentPanel = ({ students, programs, refresh, flash }) => {
    const [form, setForm] = useState({ user_id: "", name: "", email: "", program_id: "", current_semester: 1 });

    const submit = async e => {
        e.preventDefault();
        try {
            await axios.post(`${API}/students`, { ...form, user_id: parseInt(form.user_id), program_id: parseInt(form.program_id) }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            setForm({ user_id: "", name: "", email: "", program_id: "", current_semester: 1 });
            refresh();
            flash("✅ Student profile created!");
        } catch (err) { flash("❌ " + (err.response?.data?.detail || "Failed"), false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this student?")) return;
        try {
            await axios.delete(`${API}/students/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            refresh();
            flash("🗑️ Student removed");
        } catch { flash("❌ Delete failed", false); }
    };

    return (
        <div style={s.panelGrid}>
            <div style={s.card}>
                <h3 style={s.cardTitle}>Add New Student</h3>
                <form onSubmit={submit} style={s.form}>
                    <Field label="User ID (from Global Admin)" value={form.user_id} onChange={v => setForm({ ...form, user_id: v })} placeholder="e.g. 5" />
                    <Field label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. John Doe" />
                    <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="e.g. john@uni.edu" />
                    <div style={s.fieldRow}>
                        <div style={s.field}>
                            <label style={s.label}>Program</label>
                            <select value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })} style={s.input}>
                                <option value="">— Select —</option>
                                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <Field label="Current Sem" type="number" value={form.current_semester} onChange={v => setForm({ ...form, current_semester: v })} />
                    </div>
                    <button type="submit" style={s.btn}>Create Profile</button>
                </form>
            </div>
            <div style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h3 style={{ ...s.cardTitle, margin: 0 }}>Enrolled Students <span style={s.badge}>{students.length}</span></h3>
                    <button onClick={async () => {
                        try {
                            const res = await axios.post(`${API}/sync-enrollments`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
                            flash(`🔄 ${res.data.message}`);
                            refresh();
                        } catch { flash("❌ Sync failed", false); }
                    }} style={s.syncBtn}>
                        🔄 Auto-Assign All
                    </button>
                </div>
                <div style={s.list}>
                    {students.map(st => (
                        <div key={st.id} style={s.listItem}>
                            <div>
                                <span style={s.itemName}>{st.name}</span>
                                <span style={s.itemSub}>{st.email} • Sem {st.current_semester}</span>
                            </div>
                            <button onClick={() => handleDelete(st.id)} style={s.removeBtn}>Delete</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, type = "text", value, onChange, placeholder }) => (
    <div style={s.field}>
        <label style={s.label}>{label}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={s.input} placeholder={placeholder} required />
    </div>
);

/* ── Styles ────────────────────────────────────────────────────────────────── */
const s = {
    page: { display: "flex", minHeight: "100vh", background: "#091413", fontFamily: "'Inter', sans-serif", color: "#fff" },
    sidebar: { width: "260px", background: "#12211D", borderRight: "1px solid rgba(64,138,113,0.15)", padding: "24px" },
    sideHeader: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" },
    logoIcon: { fontSize: "28px" },
    logoText: { margin: 0, fontSize: "20px", fontWeight: 800, color: "#408A71" },
    nav: { display: "flex", flexDirection: "column", gap: "10px" },
    navItem: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", borderRadius: "12px", cursor: "pointer", textAlign: "left", transition: "0.2s" },
    navActive: { background: "rgba(64,138,113,0.1)", color: "#408A71" },
    navIcon: { fontSize: "18px" },
    navLabel: { fontWeight: 600, fontSize: "14px" },
    backLink: { padding: "14px 18px", color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: "13px", fontWeight: 600 },

    content: { flex: 1, padding: "40px", overflowY: "auto" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" },
    headerTitle: { margin: "0 0 4px", fontSize: "28px", fontWeight: 800 },
    headerSub: { margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "15px" },
    flash: { padding: "12px 24px", borderRadius: "12px", fontWeight: 700, fontSize: "14px" },
    
    detailsWrap: { animation: "fadeIn 0.3s ease-out" },
    detailsHeader: { display: "flex", alignItems: "center", gap: "24px", marginBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "24px" },
    backBtn: { padding: "8px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
    detailsTitle: { margin: "0 0 4px", fontSize: "24px", fontWeight: 800, color: "#408A71" },
    detailsSub: { margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "14px" },
    
    detailsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" },
    semCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" },
    semHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "12px" },
    semTitle: { margin: 0, fontSize: "16px", fontWeight: 800, color: "rgba(255,255,255,0.8)" },
    classCountBadge: { background: "rgba(64,138,113,0.15)", color: "#408A71", fontSize: "11px", fontWeight: 800, padding: "4px 10px", borderRadius: "20px", textTransform: "uppercase" },
    
    classList: { display: "flex", flexDirection: "column", gap: "10px" },
    classCardMini: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "0.2s" },
    classMain: { display: "flex", flexDirection: "column", gap: "2px" },
    classNameMini: { fontWeight: 700, fontSize: "14px", color: "#e2e8f0" },
    facultyNameMini: { fontSize: "12px", color: "rgba(255,255,255,0.3)", fontWeight: 600 },
    studentCountMini: { textAlign: "right", background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" },
    studentNum: { display: "block", fontSize: "16px", fontWeight: 800, color: "#408A71", lineHeight: 1 },
    studentLabel: { fontSize: "10px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", fontWeight: 700 },
    noClasses: { margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.2)", fontStyle: "italic", textAlign: "center", padding: "12px" },

    panelGrid: { display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "24px", alignItems: "start" },
    card: { background: "#12211D", border: "1px solid rgba(64,138,113,0.1)", borderRadius: "24px", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
    cardTitle: { margin: "0 0 24px", fontSize: "18px", fontWeight: 700 },
    form: { display: "flex", flexDirection: "column", gap: "20px" },
    field: { display: "flex", flexDirection: "column", gap: "8px" },
    fieldRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
    label: { fontSize: "11px", fontWeight: 800, color: "rgba(64,138,113,0.8)", textTransform: "uppercase", letterSpacing: "1px" },
    input: { padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#fff", fontSize: "14px", outline: "none", colorScheme: "dark" },
    btn: { marginTop: "10px", padding: "14px", background: "linear-gradient(90deg, #408A71, #285A48)", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "15px" },

    list: { display: "flex", flexDirection: "column", gap: "12px" },
    listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "rgba(255,255,255,0.03)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" },
    programCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", background: "rgba(64,138,113,0.05)", borderRadius: "18px", border: "1px solid rgba(64,138,113,0.15)", cursor: "pointer", transition: "0.2s" },
    programInfo: { display: "flex", flexDirection: "column", gap: "4px" },
    programArrow: { fontSize: "12px", fontWeight: 800, color: "#408A71", textTransform: "uppercase" },
    cardSub: { margin: "-16px 0 24px", fontSize: "13px", color: "rgba(255,255,255,0.3)" },
    itemName: { display: "block", fontSize: "15px", fontWeight: 700 },
    itemSub: { fontSize: "12px", color: "rgba(255,255,255,0.3)" },
    idPill: { fontSize: "11px", fontWeight: 800, color: "#408A71", background: "rgba(64,138,113,0.15)", padding: "4px 10px", borderRadius: "20px" },
    muted: { color: "rgba(255,255,255,0.2)", fontStyle: "italic" },

    curToolbar: { marginBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "24px" },
    semTabs: { display: "flex", gap: "8px", marginBottom: "24px", overflowX: "auto", paddingBottom: "8px" },
    semTab: { padding: "10px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontWeight: 700, fontSize: "13px", transition: "0.2s" },
    semTabActive: { background: "rgba(64,138,113,0.15)", border: "1px solid #408A71", color: "#408A71" },
    curContent: { background: "rgba(255,255,255,0.02)", borderRadius: "20px", padding: "28px", border: "1px solid rgba(255,255,255,0.04)" },
    curHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
    curTitle: { margin: 0, fontSize: "18px", fontWeight: 700 },
    addCourseBtn: { padding: "8px 16px", background: "rgba(64,138,113,0.2)", border: "1px solid #408A71", color: "#408A71", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "13px" },
    
    multiSelector: { background: "rgba(0,0,0,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "24px", border: "1px solid rgba(64,138,113,0.1)" },
    genForm: { background: "rgba(167,139,250,0.05)", borderRadius: "16px", padding: "20px", marginBottom: "24px", border: "1px solid rgba(167,139,250,0.2)" },
    selTitle: { margin: "0 0 16px", fontSize: "13px", color: "rgba(255,255,255,0.4)", fontWeight: 800, textTransform: "uppercase" },
    selGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" },
    selLabel: { display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" },
    confirmBtn: { padding: "10px 24px", background: "#408A71", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer" },

    assignedList: { display: "flex", flexDirection: "column", gap: "10px" },
    curItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "rgba(255,255,255,0.04)", borderRadius: "14px" },
    curItemInfo: { display: "flex", flexDirection: "column", gap: "2px" },
    curItemName: { fontWeight: 600, fontSize: "15px" },
    curItemType: { fontSize: "12px", color: "rgba(64,138,113,0.8)", fontWeight: 700, textTransform: "uppercase" },
    removeBtn: { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer" },
    syncBtn: { background: "rgba(64,138,113,0.15)", border: "1px solid #408A71", color: "#408A71", padding: "8px 16px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, cursor: "pointer" },
    badge: { background: "rgba(64,138,113,0.2)", padding: "2px 8px", borderRadius: "8px", marginLeft: "8px", fontSize: "14px" }
};

export default UniversityAdmin;

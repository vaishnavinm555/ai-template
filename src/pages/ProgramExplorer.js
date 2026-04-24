import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { HiAcademicCap, HiViewGrid, HiClipboardList, HiCog, HiChartBar, HiLogout, HiSearch, HiChevronRight, HiArrowLeft, HiUsers, HiBookOpen, HiOfficeBuilding } from "react-icons/hi";
import { MdSchool, MdClass, MdPerson, MdPersonOff } from "react-icons/md";

const API = "http://localhost:8000/admin";

/* ─── Main Component ─────────────────────────────────────────────────────── */

const ProgramExplorer = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem("role");
    const fullName = localStorage.getItem("full_name") || localStorage.getItem("username");

    // Navigation state: null = programs, {program} = semesters, {program, semester} = classes
    const [view, setView] = useState("programs"); // "programs" | "semesters" | "classes"
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState(null);

    // Data
    const [programs, setPrograms] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const h = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

    // ── Data Fetchers ──────────────────────────────────────────────────────
    const loadPrograms = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/programs`, { headers: h() });
            setPrograms(res.data);
        } catch (e) {
            if (e.response?.status === 401) { localStorage.clear(); navigate("/login"); }
        } finally { setLoading(false); }
    }, [navigate]);

    const loadSemesters = useCallback(async (program) => {
        setLoading(true);
        setSearch("");
        try {
            const res = await axios.get(`${API}/program/${program.id}/semesters`, { headers: h() });
            setSemesters(res.data);
            setSelectedProgram(program);
            setView("semesters");
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    const loadClasses = useCallback(async (semester) => {
        setLoading(true);
        setSearch("");
        try {
            const res = await axios.get(`${API}/semester/${semester.id}/classes`, { headers: h() });
            setClasses(res.data);
            setSelectedSemester(semester);
            setView("classes");
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (!localStorage.getItem("token")) { navigate("/login"); return; }
        loadPrograms();
    }, [navigate, loadPrograms]);

    // ── Navigation ─────────────────────────────────────────────────────────
    const goToPrograms = () => { setView("programs"); setSelectedProgram(null); setSelectedSemester(null); setSearch(""); };
    const goToSemesters = () => { setView("semesters"); setSelectedSemester(null); setSearch(""); };

    // ── Filtered Classes ───────────────────────────────────────────────────
    const filteredClasses = classes.filter(cl =>
        cl.course_name?.toLowerCase().includes(search.toLowerCase()) ||
        cl.faculty_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={s.page}>
            {/* ── Sidebar ────────────────────────────────────────────────── */}
            <aside style={s.sidebar}>
                <div style={s.sideHeader}>
                    <HiAcademicCap size={28} color="#63b3ed" />
                    <div>
                        <h2 style={s.sideName}>UniAdmin</h2>
                        <p style={s.sideRole}>{role?.toUpperCase()}</p>
                    </div>
                </div>
                <div style={s.sideUser}>
                    <span style={s.sideAvatar}>{fullName?.[0]?.toUpperCase()}</span>
                    <span style={s.sideUserName}>{fullName}</span>
                </div>
                <nav style={s.sideNav}>
                    <SideLink icon={<HiChartBar size={16} />} label="Programs" active={view === "programs"} onClick={goToPrograms} />
                    <SideLink icon={<HiViewGrid size={16} />} label="Curriculum" href="/admin/university" />
                    <SideLink icon={<HiClipboardList size={16} />} label="Attendance" href="/admin/attendance-report" />
                    <SideLink icon={<HiCog size={16} />} label="Admin Panel" href="/admin/panel" />
                    <SideLink icon={<MdSchool size={16} />} label="Faculty View" href="/faculty" />
                </nav>
                <button onClick={() => { localStorage.clear(); navigate("/login"); }} style={s.logoutBtn}>
                    <HiLogout size={15} style={{ marginRight: 6, verticalAlign: "middle" }} /> Logout
                </button>
            </aside>

            {/* ── Main Content ───────────────────────────────────────────── */}
            <main style={s.main}>
                {/* Breadcrumb */}
                <nav style={s.breadcrumb}>
                    <button onClick={goToPrograms} style={{ ...s.crumb, ...(view === "programs" ? s.crumbActive : {}) }}>
                        Programs
                    </button>
                    {selectedProgram && (
                        <>
                            <span style={s.crumbSep}>›</span>
                            <button onClick={goToSemesters} style={{ ...s.crumb, ...(view === "semesters" ? s.crumbActive : {}) }}>
                                {selectedProgram.name}
                            </button>
                        </>
                    )}
                    {selectedSemester && (
                        <>
                            <span style={s.crumbSep}>›</span>
                            <span style={{ ...s.crumb, ...s.crumbActive }}>
                                Semester {selectedSemester.semester_number}
                            </span>
                        </>
                    )}
                </nav>

                {/* ── LEVEL 1: Programs ───────────────────────────────────── */}
                {view === "programs" && (
                    <ProgramsView
                        programs={programs}
                        loading={loading}
                        onSelect={loadSemesters}
                    />
                )}

                {/* ── LEVEL 2: Semesters ──────────────────────────────────── */}
                {view === "semesters" && (
                    <SemestersView
                        program={selectedProgram}
                        semesters={semesters}
                        loading={loading}
                        onSelect={loadClasses}
                        onBack={goToPrograms}
                    />
                )}

                {/* ── LEVEL 3: Classes ────────────────────────────────────── */}
                {view === "classes" && (
                    <ClassesView
                        program={selectedProgram}
                        semester={selectedSemester}
                        classes={filteredClasses}
                        loading={loading}
                        search={search}
                        onSearch={setSearch}
                        onBack={goToSemesters}
                    />
                )}
            </main>
        </div>
    );
};

/* ─── Level 1 View: Programs ─────────────────────────────────────────────── */

const ProgramsView = ({ programs, loading, onSelect }) => (
    <section>
        <ViewHeader
            title="Programs"
            subtitle="Select a program to explore its semester structure and classes."
            icon={<HiAcademicCap size={36} color="#63b3ed" />}
        />
        {loading ? <Loader /> : (
            <div style={s.programGrid}>
                {programs.map((p, i) => (
                    <button key={p.id} onClick={() => onSelect(p)} style={{ ...s.programCard, animationDelay: `${i * 60}ms` }}>
                        <div style={s.programCardAccent} />
                        <div style={s.programCardBody}>
                            <div style={s.programEmoji}>{getProgramEmoji(p.name)}</div>
                            <h3 style={s.programName}>{p.name}</h3>
                            <div style={s.programMeta}>
                                <span style={s.metaTag}>{p.duration_years} Years</span>
                                <span style={s.metaTag}>{p.total_semesters} Semesters</span>
                            </div>
                        </div>
                        <div style={s.programArrow}>Open <HiChevronRight size={14} style={{ verticalAlign: "middle" }} /></div>
                    </button>
                ))}
                {programs.length === 0 && !loading && (
                    <div style={s.empty}>
                        <HiOfficeBuilding size={48} color="rgba(226,232,240,0.2)" style={{ marginBottom: 12 }} />
                        <p>No programs found. Add one via University Management.</p>
                    </div>
                )}
            </div>
        )}
    </section>
);

/* ─── Level 2 View: Semesters ───────────────────────────────────────────── */

const SemestersView = ({ program, semesters, loading, onSelect, onBack }) => (
    <section>
        <ViewHeader
            title={program?.name}
            subtitle="Select a semester to view its class schedule and assigned faculty."
            icon={<HiClipboardList size={36} color="#63b3ed" />}
            onBack={onBack}
            backLabel="All Programs"
        />
        {loading ? <Loader /> : (
            <div style={s.semesterGrid}>
                {semesters.map((sem, i) => (
                    <button key={sem.id} onClick={() => onSelect(sem)} style={{ ...s.semesterCard, animationDelay: `${i * 50}ms` }}>
                        <div style={s.semNumCircle}>
                            <span style={s.semNumText}>{sem.semester_number}</span>
                        </div>
                        <div style={s.semInfo}>
                            <h3 style={s.semTitle}>Semester {sem.semester_number}</h3>
                            <div style={s.semStats}>
                                <span style={s.semStat}><HiBookOpen size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />{sem.course_count} Courses</span>
                                <span style={s.semStat}><MdClass size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />{sem.class_count} Classes</span>
                            </div>
                        </div>
                        <HiChevronRight size={22} color="rgba(99,179,237,0.4)" />
                    </button>
                ))}
                {semesters.length === 0 && <p style={s.muted}>No semesters found for this program.</p>}
            </div>
        )}
    </section>
);

/* ─── Level 3 View: Classes ─────────────────────────────────────────────── */

const ClassesView = ({ program, semester, classes, loading, search, onSearch, onBack }) => (
    <section>
        <ViewHeader
            title={`Semester ${semester?.semester_number} — Classes`}
            subtitle={`${program?.name} · ${classes.length} class${classes.length !== 1 ? "es" : ""} found`}
            icon={<MdClass size={36} color="#63b3ed" />}
            onBack={onBack}
            backLabel={`${program?.name}`}
        >
            <div style={s.searchWrap}>
                <HiSearch size={14} color="rgba(226,232,240,0.4)" />
                <input
                    value={search}
                    onChange={e => onSearch(e.target.value)}
                    placeholder="Search by subject or faculty…"
                    style={s.searchInput}
                />
            </div>
        </ViewHeader>

        {loading ? <Loader /> : (
            <div style={s.classListWrap}>
                <div style={s.classTableHeader}>
                    <span style={{ flex: 3 }}>Subject</span>
                    <span style={{ flex: 2 }}>Faculty</span>
                    <span style={{ flex: 1, textAlign: "center" }}>Students</span>
                    <span style={{ flex: 1, textAlign: "center" }}>Section</span>
                    <span style={{ flex: 1, textAlign: "center" }}>Action</span>
                </div>

                {classes.length === 0 ? (
                    <div style={s.empty}>
                        <HiClipboardList size={48} color="rgba(226,232,240,0.2)" style={{ marginBottom: 12 }} />
                        <p>{search ? "No classes match your search." : "No classes have been generated for this semester yet."}</p>
                    </div>
                ) : (
                    classes.map((cl, i) => (
                        <ClassRow key={cl.id} cls={cl} index={i} />
                    ))
                )}
            </div>
        )}
    </section>
);

const ClassRow = ({ cls, index }) => (
    <div style={{ ...s.classRow, animationDelay: `${index * 30}ms` }}>
        <div style={{ flex: 3, display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={s.classSubject}>{cls.course_name}</span>
            {cls.schedule && <span style={s.classMeta}>{cls.schedule}</span>}
        </div>
        <div style={{ flex: 2, display: "flex", alignItems: "center", gap: "8px" }}>
            {cls.faculty_name === "Not Assigned"
                ? <><MdPersonOff size={14} color="rgba(226,232,240,0.25)" /><span style={s.facultyUnassigned}>Not Assigned</span></>
                : <><MdPerson size={14} color="#68d391" /><span style={s.facultyName}>{cls.faculty_name}</span></>}
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
            <span style={s.studentBadge}><HiUsers size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />{cls.student_count}</span>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
            <span style={s.sectionBadge}>{cls.section || "—"}</span>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
            <Link to={`/faculty/class/${cls.id}`} style={s.openBtn}>Open <HiChevronRight size={12} style={{ verticalAlign: "middle" }} /></Link>
        </div>
    </div>
);

/* ─── Shared Sub-components ─────────────────────────────────────────────── */

const ViewHeader = ({ title, subtitle, icon, onBack, backLabel, children }) => (
    <div style={s.viewHeader}>
        <div style={s.viewHeaderTop}>
            {onBack && (
                <button onClick={onBack} style={s.backBtn}>
                    <HiArrowLeft size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />{backLabel}
                </button>
            )}
            <div style={s.viewTitleWrap}>
                <div style={s.viewIcon}>{icon}</div>
                <div>
                    <h1 style={s.viewTitle}>{title}</h1>
                    <p style={s.viewSubtitle}>{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    </div>
);

const SideLink = ({ icon, label, active, onClick, href }) => {
    const style = { ...s.sideNavItem, ...(active ? s.sideNavActive : {}) };
    if (href) return <Link to={href} style={style}><span style={{ display: "flex", alignItems: "center" }}>{icon}</span><span>{label}</span></Link>;
    return <button onClick={onClick} style={style}><span style={{ display: "flex", alignItems: "center" }}>{icon}</span><span>{label}</span></button>;
};

const Loader = () => (
    <div style={s.loaderWrap}>
        <div style={s.spinner} />
        <p style={s.loaderText}>Loading…</p>
    </div>
);

const getProgramEmoji = (name = "") => {
    if (name.toLowerCase().includes("bba") || name.toLowerCase().includes("business")) return "💼";
    if (name.toLowerCase().includes("bca") || name.toLowerCase().includes("computer")) return "💻";
    if (name.toLowerCase().includes("mba")) return "🎩";
    if (name.toLowerCase().includes("law")) return "⚖️";
    return "🎓";
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const s = {
    page: { display: "flex", minHeight: "100vh", background: "#080f1a", fontFamily: "'Inter', sans-serif", color: "#e2e8f0" },

    // Sidebar
    sidebar: { width: "240px", background: "#0d1929", borderRight: "1px solid rgba(99,179,237,0.08)", display: "flex", flexDirection: "column", padding: "28px 20px", gap: "0", flexShrink: 0 },
    sideHeader: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" },
    sideIcon: { fontSize: "28px" },
    sideName: { margin: 0, fontSize: "18px", fontWeight: 800, color: "#63b3ed" },
    sideRole: { margin: 0, fontSize: "10px", fontWeight: 700, color: "rgba(99,179,237,0.5)", textTransform: "uppercase", letterSpacing: "1px" },
    sideUser: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", marginBottom: "24px" },
    sideAvatar: { width: "32px", height: "32px", background: "linear-gradient(135deg, #63b3ed, #4299e1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px", color: "#fff", flexShrink: 0 },
    sideUserName: { fontSize: "13px", fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    sideNav: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 },
    sideNavItem: { display: "flex", alignItems: "center", gap: "10px", padding: "11px 14px", borderRadius: "10px", background: "transparent", border: "none", color: "rgba(226,232,240,0.4)", fontSize: "13px", fontWeight: 600, cursor: "pointer", textDecoration: "none", transition: "all 0.15s" },
    sideNavActive: { background: "rgba(99,179,237,0.1)", color: "#63b3ed" },
    logoutBtn: { marginTop: "auto", padding: "11px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "10px", color: "#fc8181", fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "left" },

    // Main
    main: { flex: 1, padding: "40px 48px", overflowY: "auto", maxWidth: "1100px" },

    // Breadcrumb
    breadcrumb: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "36px" },
    crumb: { background: "none", border: "none", color: "rgba(226,232,240,0.4)", fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: "4px 0", transition: "color 0.15s" },
    crumbActive: { color: "#63b3ed" },
    crumbSep: { color: "rgba(226,232,240,0.2)", fontSize: "16px" },

    // View Header
    viewHeader: { marginBottom: "32px" },
    viewHeaderTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" },
    viewTitleWrap: { display: "flex", alignItems: "center", gap: "16px", flex: 1 },
    viewIcon: { fontSize: "36px", flexShrink: 0 },
    viewTitle: { margin: "0 0 4px", fontSize: "28px", fontWeight: 800, color: "#f7fafc" },
    viewSubtitle: { margin: 0, fontSize: "14px", color: "rgba(226,232,240,0.4)" },
    backBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(226,232,240,0.6)", padding: "8px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" },

    // Programs
    programGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", marginTop: "8px" },
    programCard: { background: "#0d1929", border: "1px solid rgba(99,179,237,0.1)", borderRadius: "20px", cursor: "pointer", textAlign: "left", overflow: "hidden", transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s", display: "flex", flexDirection: "column", animation: "fadeSlide 0.4s ease-out both" },
    programCardAccent: { height: "3px", background: "linear-gradient(90deg, #63b3ed, #4299e1, #667eea)" },
    programCardBody: { padding: "24px 24px 16px" },
    programEmoji: { fontSize: "36px", marginBottom: "16px" },
    programName: { margin: "0 0 12px", fontSize: "17px", fontWeight: 700, color: "#f7fafc" },
    programMeta: { display: "flex", gap: "8px" },
    metaTag: { background: "rgba(99,179,237,0.1)", color: "#63b3ed", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 },
    programArrow: { padding: "12px 24px", color: "#63b3ed", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", borderTop: "1px solid rgba(99,179,237,0.08)" },

    // Semesters
    semesterGrid: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" },
    semesterCard: { background: "#0d1929", border: "1px solid rgba(99,179,237,0.08)", borderRadius: "16px", padding: "20px 24px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "20px", transition: "border-color 0.2s, background 0.2s", animation: "fadeSlide 0.35s ease-out both" },
    semNumCircle: { width: "52px", height: "52px", background: "linear-gradient(135deg, rgba(99,179,237,0.15), rgba(66,153,225,0.1))", border: "2px solid rgba(99,179,237,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    semNumText: { fontSize: "20px", fontWeight: 800, color: "#63b3ed" },
    semInfo: { flex: 1 },
    semTitle: { margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "#f7fafc" },
    semStats: { display: "flex", gap: "16px" },
    semStat: { fontSize: "13px", color: "rgba(226,232,240,0.4)", fontWeight: 600 },
    semArrow: { fontSize: "22px", color: "rgba(99,179,237,0.4)", fontWeight: 300 },

    // Search
    searchWrap: { display: "flex", alignItems: "center", gap: "8px", background: "#0d1929", border: "1px solid rgba(99,179,237,0.12)", borderRadius: "12px", padding: "10px 16px", minWidth: "280px" },
    searchIcon: { fontSize: "14px", opacity: 0.5 },
    searchInput: { background: "none", border: "none", outline: "none", color: "#e2e8f0", fontSize: "14px", flex: 1, "::placeholder": { color: "rgba(226,232,240,0.3)" } },

    // Classes List
    classListWrap: { marginTop: "8px", background: "#0d1929", borderRadius: "20px", border: "1px solid rgba(99,179,237,0.08)", overflow: "hidden" },
    classTableHeader: { display: "flex", padding: "14px 24px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "11px", fontWeight: 800, color: "rgba(226,232,240,0.3)", textTransform: "uppercase", letterSpacing: "0.8px" },
    classRow: { display: "flex", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s", animation: "fadeSlide 0.3s ease-out both" },
    classSubject: { fontWeight: 700, fontSize: "15px", color: "#f7fafc" },
    classMeta: { fontSize: "12px", color: "rgba(226,232,240,0.3)", fontWeight: 600 },
    facultyName: { fontSize: "13px", fontWeight: 600, color: "#68d391" },
    facultyUnassigned: { fontSize: "13px", fontWeight: 600, color: "rgba(226,232,240,0.25)" },
    studentBadge: { display: "inline-block", background: "rgba(99,179,237,0.1)", color: "#63b3ed", fontWeight: 700, fontSize: "13px", padding: "4px 12px", borderRadius: "20px" },
    sectionBadge: { display: "inline-block", background: "rgba(255,255,255,0.05)", color: "rgba(226,232,240,0.5)", fontWeight: 700, fontSize: "12px", padding: "4px 12px", borderRadius: "20px" },
    openBtn: { display: "inline-block", background: "rgba(99,179,237,0.1)", color: "#63b3ed", textDecoration: "none", padding: "7px 16px", borderRadius: "10px", fontWeight: 700, fontSize: "13px", transition: "background 0.15s" },

    // Utility
    loaderWrap: { textAlign: "center", padding: "80px 0" },
    spinner: { width: "40px", height: "40px", border: "3px solid rgba(99,179,237,0.1)", borderTop: "3px solid #63b3ed", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" },
    loaderText: { color: "rgba(226,232,240,0.3)", fontSize: "14px" },
    empty: { textAlign: "center", padding: "60px 24px", color: "rgba(226,232,240,0.3)" },
    emptyIcon: { fontSize: "48px", marginBottom: "12px" },
    muted: { color: "rgba(226,232,240,0.3)", fontStyle: "italic", padding: "20px 0" },
};

/* ─── Global keyframe injection ──────────────────────────────────────────── */
if (!document.getElementById("program-explorer-styles")) {
    const style = document.createElement("style");
    style.id = "program-explorer-styles";
    style.textContent = `
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        [data-prog-card]:hover { transform: translateY(-3px) !important; border-color: rgba(99,179,237,0.3) !important; box-shadow: 0 12px 40px rgba(99,179,237,0.08) !important; }
        [data-sem-card]:hover { background: rgba(99,179,237,0.05) !important; border-color: rgba(99,179,237,0.2) !important; }
        [data-class-row]:hover { background: rgba(255,255,255,0.02) !important; }
    `;
    document.head.appendChild(style);
}

export default ProgramExplorer;

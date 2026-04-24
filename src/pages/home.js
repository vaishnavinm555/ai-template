import React, { useState } from "react";
import axios from "axios";
import UploadFile from "../components/UploadFile";
import TemplateSelector from "../components/TemplateSelector";
import ReportViewer from "../components/ReportViewer";

const API_BASE_URL = "http://localhost:8000";

const Home = () => {
    const [file, setFile] = useState(null);
    const [template, setTemplate] = useState("research_report");
    const [report, setReport] = useState("");
    const [downloadLinks, setDownloadLinks] = useState({
        pdf: "",
        docx: "",
        txt: ""
    });
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // --- State for all dynamic inputs ---
    // Common
    const [topic, setTopic] = useState("");

    // Lesson Plan Exclusive
    const [courseTitle, setCourseTitle] = useState("");
    const [courseDuration, setCourseDuration] = useState("");
    const [courseObjective, setCourseObjective] = useState("");
    const [topicsToCover, setTopicsToCover] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [teachingMethodology, setTeachingMethodology] = useState("");
    const [assessmentsEvaluation, setAssessmentsEvaluation] = useState("");
    const [additionalResources, setAdditionalResources] = useState("");

    useEffect(() => {
        const fetchClasses = async () => {
            const role = localStorage.getItem("role");
            const token = localStorage.getItem("token");
            if ((role === "faculty" || role === "admin") && token) {
                try {
                    const response = await axios.get(`${API_BASE_URL}/faculty/feedback`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    // Unique classes
                    const uniqueClasses = Array.from(new Set(response.data.map(f => f.class_name)))
                        .map(name => {
                            const found = response.data.find(f => f.class_name === name);
                            return { id: found.class_id || index++, name }; // Hack for id if not provided, but better to get from /student/classes style
                        });
                    // Actually, let's just use the data we have. 
                    // To be safe, let's add a proper /classes endpoint in backend if needed.
                } catch (e) { }
            }
        };
        // Simplified: Since I don't want to overcomplicate the fetch, I'll just add a text input for class ID for now or skip the dropdown if no easy list.
        // Actually, let's just add the Class ID field.
    }, []);

    const handleGenerateReport = async () => {
        // Validation logic
        if (template === "research_report" && !topic) {
            setErrorMessage("Please provide a topic for the Research Report.");
            return;
        }

        if (template === "lesson_plan" && !courseTitle) {
            setErrorMessage("Please provide a Course Title for the Lesson Plan.");
            return;
        }

        setIsLoading(true);
        setErrorMessage("");
        setReport("");
        setDownloadLinks({ pdf: "", docx: "", txt: "" });

        const formData = new FormData();
        if (file) {
            formData.append("file", file);
        } else {
            formData.append("file", "");
        }

        formData.append("template", template);
        formData.append("topic", template === "lesson_plan" ? courseTitle : topic);

        const extraData = {};
        if (template === "lesson_plan") {
            extraData.courseDuration = courseDuration;
            extraData.courseObjective = courseObjective;
            extraData.topicsToCover = topicsToCover;
            extraData.targetAudience = targetAudience;
            extraData.teachingMethodology = teachingMethodology;
            extraData.assessmentsEvaluation = assessmentsEvaluation;
            extraData.additionalResources = additionalResources;
        }
        extraData.class_id = selectedClassId;
        formData.append("extraData", JSON.stringify(extraData));

        try {
            const response = await axios.post(`${API_BASE_URL}/generate`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setReport(response.data.report);
            setDownloadLinks({
                pdf: response.data.pdf_url ? `${API_BASE_URL}${response.data.pdf_url}` : "",
                docx: response.data.docx_url ? `${API_BASE_URL}${response.data.docx_url}` : "",
                txt: response.data.txt_url ? `${API_BASE_URL}${response.data.txt_url}` : "",
            });
        } catch (error) {
            console.error("Generation failed:", error);
            setErrorMessage(error.response?.data?.detail || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderDynamicInputs = () => {
        if (template === "lesson_plan") {
            return (
                <div style={{ animation: "fadeIn 0.3s ease-out" }}>
                    <div style={{ marginBottom: "12px" }}>
                        <label style={labelStyle}>Course Title</label>
                        <input type="text" placeholder="e.g. Introduction to Physics" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={inlineInputContainer}>
                        <div style={{ flex: 1, marginRight: "10px" }}>
                            <label style={labelStyle}>Course Duration</label>
                            <input type="text" placeholder="e.g. 1 Month" value={courseDuration} onChange={(e) => setCourseDuration(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Target Audience</label>
                            <input type="text" placeholder="Undergraduate Students" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                    {[
                        { label: "Course Objectives", value: courseObjective, setter: setCourseObjective, placeholder: "Main goals..." },
                        { label: "Topics to Cover", value: topicsToCover, setter: setTopicsToCover, placeholder: "List topics..." }
                    ].map((idx) => (
                        <div key={idx.label} style={{ marginBottom: "12px" }}>
                            <label style={labelStyle}>{idx.label}</label>
                            <textarea placeholder={idx.placeholder} value={idx.value} onChange={(e) => idx.setter(e.target.value)} style={{ ...inputStyle, minHeight: "60px" }} />
                        </div>
                    ))}
                    {[
                        { label: "Teaching Methodology", value: teachingMethodology, setter: setTeachingMethodology, placeholder: "Lectures, hands-on, etc." },
                        { label: "Assessments & Evaluation", value: assessmentsEvaluation, setter: setAssessmentsEvaluation, placeholder: "Quizzes, exams, etc." },
                        { label: "Additional Resources", value: additionalResources, setter: setAdditionalResources, placeholder: "Links, books (optional)" }
                    ].map((idx) => (
                        <div key={idx.label} style={{ marginBottom: "12px" }}>
                            <label style={labelStyle}>{idx.label}</label>
                            <input type="text" placeholder={idx.placeholder} value={idx.value} onChange={(e) => idx.setter(e.target.value)} style={inputStyle} />
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
                <div style={{ marginBottom: "15px" }}>
                    <label style={labelStyle}>Report Topic</label>
                    <input type="text" placeholder="e.g. Analysis of Deep Learning Architecture" value={topic} onChange={(e) => setTopic(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: "15px" }}>
                    <label style={labelStyle}>Document (Optional)</label>
                    <UploadFile setFile={setFile} />
                    {file && <p style={{ color: "green", fontSize: "14px", marginTop: "5px" }}>Selected: {file.name}</p>}
                </div>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: "800px", margin: "20px auto", padding: "20px", textAlign: "center", minHeight: "100vh" }}>
            <h1 style={{ color: "#2c3e50" }}>🎓 AI Academic Report Generator</h1>
            <p style={{ color: "#7f8c8d" }}>Generate professional lesson plans and research summaries effortlessly.</p>

            <div style={{ textAlign: "left", padding: "20px", border: "1px solid #eee", borderRadius: "10px", background: "#ffffff", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
                <div style={{ marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid #eee" }}>
                    <TemplateSelector template={template} setTemplate={setTemplate} />
                </div>

                {renderDynamicInputs()}

                <div style={{ marginBottom: "15px", marginTop: "15px", textAlign: "left" }}>
                    <label style={labelStyle}>Include Student Feedback? (Optional Class ID)</label>
                    <input
                        type="text"
                        placeholder="e.g. 1"
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        style={inputStyle}
                    />
                    <small style={{ color: "#636e72" }}>Enter its Database ID to aggregate insights into the report.</small>
                </div>

                <button onClick={handleGenerateReport} disabled={isLoading} style={buttonStyle}>
                    {isLoading ? "⚙ Processing..." : "🚀 Generate"}
                </button>

                {(downloadLinks.pdf || downloadLinks.docx || downloadLinks.txt) && (
                    <div style={{ marginTop: "25px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
                        <p style={{ fontWeight: "bold", textAlign: "center", marginBottom: "15px" }}>Available Download Formats:</p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                            {downloadLinks.pdf && (
                                <a href={downloadLinks.pdf} target="_blank" rel="noopener noreferrer" style={{ ...downloadBtn, background: "#e74c3c" }}>📥 PDF</a>
                            )}
                            {downloadLinks.docx && (
                                <a href={downloadLinks.docx} target="_blank" rel="noopener noreferrer" style={{ ...downloadBtn, background: "#3498db" }}>📥 Word (.docx)</a>
                            )}
                            {downloadLinks.txt && (
                                <a href={downloadLinks.txt} target="_blank" rel="noopener noreferrer" style={{ ...downloadBtn, background: "#95a5a6" }}>📥 Plain Text</a>
                            )}
                        </div>
                    </div>
                )}

                {errorMessage && (
                    <p style={{ color: "#e74c3c", marginTop: "15px", fontWeight: "bold", textAlign: "center" }}>{errorMessage}</p>
                )}
            </div>

            <ReportViewer report={report} setReport={setReport} />
            <style>{` @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } `}</style>
        </div>
    );
};

// --- Embedded Styles ---
const inputStyle = { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #dcdde1", fontFamily: "inherit", boxSizing: "border-box", outline: "none", fontSize: "14px", marginBottom: "5px" };
const labelStyle = { fontWeight: "bold", display: "block", marginBottom: "5px", fontSize: "14px", color: "#34495e" };
const inlineInputContainer = { display: "flex", marginBottom: "12px", width: "100%" };
const buttonStyle = { width: "100%", padding: "14px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px", marginTop: "15px", transition: "all 0.3s" };
const downloadBtn = { padding: "10px 20px", color: "white", textDecoration: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", transition: "transform 0.2s" };

export default Home;

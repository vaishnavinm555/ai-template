import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const API = "http://localhost:8000";

const FeedbackForm = () => {
    const { classId } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();
    const className = state?.className || "the class";

    const [rating, setRating] = useState(5);
    const [comments, setComments] = useState("");
    const [suggestions, setSuggestions] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });
    const [hover, setHover] = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMsg({ type: "", text: "" });

        const token = localStorage.getItem("token");
        try {
            await axios.post(`${API}/feedback`, {
                class_id: parseInt(classId),
                rating,
                comments,
                suggestions
            }, { headers: { Authorization: `Bearer ${token}` } });

            setMsg({ type: "success", text: "✅ Thank you! Your feedback has been submitted." });
            setTimeout(() => navigate("/dashboard"), 2500);
        } catch (err) {
            console.error(err);
            setMsg({ type: "error", text: "❌ " + (err.response?.data?.detail || "Submission failed.") });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={s.page}>
            <div style={s.card}>
                <div style={s.cardAccent} />
                <div style={s.body}>
                    <h1 style={s.title}>📝 Share Feedback</h1>
                    <p style={s.subtitle}>Tell us about your experience in <strong style={{ color: "#408A71" }}>{className}</strong></p>

                    <form onSubmit={handleSubmit} style={s.form}>
                        {/* Rating */}
                        <div style={s.inputGroup}>
                            <label style={s.label}>How was the session? (1-5 Stars)</label>
                            <div style={s.stars} onMouseLeave={() => setHover(0)}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHover(star)}
                                        style={{
                                            ...s.starBtn,
                                            color: star <= (hover || rating) ? "#f1c40f" : "rgba(255,255,255,0.15)",
                                            transform: star <= hover ? "scale(1.2)" : "scale(1)"
                                        }}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comments */}
                        <div style={s.inputGroup}>
                            <label style={s.label}>What did you like / What could be better? *</label>
                            <textarea
                                placeholder="Write your thoughts here..."
                                value={comments}
                                onChange={e => setComments(e.target.value)}
                                style={s.textarea}
                                required
                            />
                        </div>

                        {/* Suggestions */}
                        <div style={s.inputGroup}>
                            <label style={s.label}>Suggestions for Improvement (Optional)</label>
                            <input
                                placeholder="e.g. More hands-on practice"
                                value={suggestions}
                                onChange={e => setSuggestions(e.target.value)}
                                style={s.input}
                            />
                        </div>

                        {msg.text && (
                            <div style={{ ...s.msg, color: msg.type === "success" ? "#4ade80" : "#f87171", background: msg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>
                                {msg.text}
                            </div>
                        )}

                        <div style={s.btnRow}>
                            <button type="button" onClick={() => navigate("/dashboard")} style={s.cancel}>Cancel</button>
                            <button type="submit" disabled={isSubmitting} style={s.submit}>
                                {isSubmitting ? "Submitting..." : "Send Feedback"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const s = {
    page: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#091413", padding: "20px", fontFamily: "'Inter', sans-serif" },
    card: { background: "#12211D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "28px", width: "100%", maxWidth: "500px", overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" },
    cardAccent: { height: "6px", background: "linear-gradient(90deg, #408A71, #285A48)" },
    body: { padding: "40px" },
    title: { margin: "0 0 8px", fontSize: "28px", fontWeight: 800, color: "#fff" },
    subtitle: { margin: "0 0 35px", fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 },
    form: { display: "flex", flexDirection: "column", gap: "25px" },
    inputGroup: { display: "flex", flexDirection: "column", gap: "10px" },
    label: { fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" },
    stars: { display: "flex", gap: "8px" },
    starBtn: { background: "none", border: "none", fontSize: "36px", cursor: "pointer", transition: "all 0.2s ease", padding: 0 },
    textarea: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "15px", color: "#fff", fontSize: "15px", minHeight: "120px", outline: "none", boxSizing: "border-box" },
    input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "15px", color: "#fff", fontSize: "15px", outline: "none", boxSizing: "border-box" },
    msg: { padding: "12px", borderRadius: "12px", textAlign: "center", fontWeight: 600, fontSize: "14px" },
    btnRow: { display: "flex", gap: "15px", marginTop: "10px" },
    submit: { flex: 2, padding: "15px", background: "linear-gradient(90deg, #408A71, #285A48)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 800, fontSize: "15px", cursor: "pointer", boxShadow: "0 10px 20px rgba(64,138,113,0.2)" },
    cancel: { flex: 1, padding: "15px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: "14px", cursor: "pointer" }
};

export default FeedbackForm;

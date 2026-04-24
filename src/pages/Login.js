import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:8000";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        
        try {
            const formData = new URLSearchParams();
            formData.append("username", username);
            formData.append("password", password);

            const response = await axios.post(`${API_BASE_URL}/token`, formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });

            const { access_token, role, username: user, full_name } = response.data;
            localStorage.setItem("token", access_token);
            localStorage.setItem("role", role);
            localStorage.setItem("username", user);
            localStorage.setItem("full_name", full_name || user);

            if (role === "faculty" || role === "admin") {
                navigate("/faculty");
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h1 style={titleStyle}>🎓 Academic Platform</h1>
                <p style={subtitleStyle}>Sign in to access your dashboard</p>
                
                <form onSubmit={handleLogin}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Username</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            style={inputStyle}
                            required
                        />
                    </div>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            style={inputStyle}
                            required
                        />
                    </div>
                    {error && <p style={errorStyle}>{error}</p>}
                    <button type="submit" disabled={isLoading} style={buttonStyle}>
                        {isLoading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
};

const containerStyle = { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "20px" };
const cardStyle = { background: "rgba(255, 255, 255, 0.95)", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", width: "100%", maxWidth: "400px", backdropFilter: "blur(10px)" };
const titleStyle = { margin: "0 0 10px", textAlign: "center", color: "#2d3436" };
const subtitleStyle = { margin: "0 0 30px", textAlign: "center", color: "#636e72" };
const inputGroupStyle = { marginBottom: "20px" };
const labelStyle = { display: "block", marginBottom: "8px", fontWeight: "bold", color: "#2d3436" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dfe6e9", fontSize: "16px", boxSizing: "border-box" };
const buttonStyle = { width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: "#6c5ce7", color: "white", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" };
const errorStyle = { color: "#d63031", textAlign: "center", marginBottom: "15px" };

export default Login;

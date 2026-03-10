import React from "react";

const UploadFile = ({ setFile }) => {
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div style={containerStyle}>
            <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                style={inputStyle}
                id="file-upload"
            />
            <label htmlFor="file-upload" style={labelStyle}>
                Choose File (PDF/DOCX)
            </label>
        </div>
    );
};

// --- Styles ---
const containerStyle = {
    marginTop: "5px",
};

const inputStyle = {
    display: "none", // Hide the ugly default file input
};

const labelStyle = {
    display: "inline-block",
    padding: "8px 16px",
    background: "#fff",
    border: "1px solid #007bff",
    color: "#007bff",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    transition: "all 0.2s",
};

export default UploadFile;

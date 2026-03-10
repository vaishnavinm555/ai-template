import React from "react";

const ReportViewer = ({ report, setReport }) => {
    if (!report) return null;

    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([report], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = "generated_report.txt";
        document.body.appendChild(element);
        element.click();
    };

    return (
        <div style={{ marginTop: "40px", textAlign: "left" }}>
            <h2>Generated Report (Editable)</h2>
            <textarea
                value={report}
                onChange={(e) => setReport(e.target.value)}
                rows="20"
                style={{
                    width: "100%",
                    padding: "15px",
                    fontFamily: "monospace",
                    fontSize: "14px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                }}
            />
            <br /><br />
            <button
                onClick={handleDownload}
                style={{
                    padding: "10px 20px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer"
                }}
            >
                Download (.txt)
            </button>
        </div>
    );
};

export default ReportViewer;

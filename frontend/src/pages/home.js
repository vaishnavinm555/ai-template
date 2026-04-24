import React, { useState } from "react";
import axios from "axios";
import UploadFile from "../components/UploadFile";
import TemplateSelector from "../components/TemplateSelector";
import ReportViewer from "../components/ReportViewer";

function Home() {

  const [file, setFile] = useState(null);
  const [template, setTemplate] = useState("research_paper");
  const [report, setReport] = useState("");
  import React, { useState } from "react";
  import axios from "axios";
  import UploadFile from "../components/UploadFile";
  import TemplateSelector from "../components/TemplateSelector";
  import ReportViewer from "../components/ReportViewer";

  function Home() {

    const [file, setFile] = useState(null);
    const [template, setTemplate] = useState("research_report");
    const [topic, setTopic] = useState("");
    const [report, setReport] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const generateReport = async () => {

      if (!file) {
        setError("Please upload a file first.");
        return;
      }

      try {

        setLoading(true);
        setError("");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("template", template);
        formData.append("topic", topic);

        const res = await axios.post(
          "http://localhost:8000/generate",
          formData
        );

        setReport(res.data.report);

      } catch (err) {

        setError("Error generating report");

      } finally {

        setLoading(false);

      }

    };

    return (
      <div style={{ padding: "40px" }}>

        <h1>AI Academic Report Generator</h1>

        <TemplateSelector
          template={template}
          setTemplate={setTemplate}
        />

        <br />

        <input
          type="text"
          placeholder="Enter Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ padding: "8px", width: "300px" }}
        />

        <br /><br />

        <UploadFile setFile={setFile} />

        <br />

        <button onClick={generateReport}>
          {loading ? "Generating..." : "Generate Report"}
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <br /><br />

        <ReportViewer
          report={report}
          setReport={setReport}
        />

      </div>
    );
  }

  export default Home;
  const generateReport = async () => {

    const formData = new FormData();
    formData.append("file", file);
    formData.append("template", template);

    const res = await axios.post(
      "http://localhost:8000/generate",
      formData
    );

    setReport(res.data.report);
  };

  return (
    <div>

      <h1>AI Academic Report Generator</h1>

      <UploadFile setFile={setFile} />

      <TemplateSelector
        template={template}
        setTemplate={setTemplate}
      />

      <button onClick={generateReport}>
        Generate Report
      </button>

      <ReportViewer report={report} />

    </div>
  );
}

export default Home;
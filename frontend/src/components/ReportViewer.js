import React from "react";

function ReportViewer({ report }) {

  return (
    <div>
      <h2>Generated Report</h2>
      <pre>{report}</pre>
    </div>
  );
}

export default ReportViewer;
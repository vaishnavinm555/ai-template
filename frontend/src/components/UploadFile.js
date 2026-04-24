import React from "react";

function UploadFile({ setFile }) {

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  return (
    <div>
      <h3>Upload Document</h3>
      <input type="file" onChange={handleFileChange} />
    </div>
  );
}

export default UploadFile;
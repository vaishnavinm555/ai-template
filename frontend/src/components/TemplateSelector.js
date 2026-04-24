import React from "react";

function TemplateSelector({ template, setTemplate }) {

  return (
    <div>
      <h3>Select Template</h3>
      <select value={template} onChange={(e) => setTemplate(e.target.value)}>
        <option value="research_paper">Research Paper</option>
        <option value="lesson_plan">Lesson Plan</option>
      </select>
    </div>
  );
}

export default TemplateSelector;
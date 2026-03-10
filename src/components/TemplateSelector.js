import React from "react";

const TemplateSelector = ({ template, setTemplate }) => {
    return (
        <div>
            <label>Select Report Template: </label>
            <select value={template} onChange={(e) => setTemplate(e.target.value)}>
                <option value="research_report">Research Report</option>
                <option value="lesson_plan">Lesson Plan</option>
                <option value="research_paper">Research Paper</option>
            </select>
        </div>
    );
};

export default TemplateSelector;

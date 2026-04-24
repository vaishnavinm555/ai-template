import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FeedbackForm from "./pages/FeedbackForm";
import AttendanceMarking from "./pages/AttendanceMarking";
import FacultyDashboard from "./pages/FacultyDashboard";
import ClassDetail from "./pages/ClassDetail";
import AdminAttendanceReport from "./pages/AdminAttendanceReport";
import AdminPanel from "./pages/AdminPanel";
import UniversityAdmin from "./pages/UniversityAdmin";
import ProgramExplorer from "./pages/ProgramExplorer";
import "./app.css";

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/feedback/:classId" element={<FeedbackForm />} />
                    <Route path="/attendance/:classId" element={<AttendanceMarking />} />
                    <Route path="/report-generator" element={<Home />} />

                    {/* Faculty Portal */}
                    <Route path="/faculty" element={<FacultyDashboard />} />
                    <Route path="/faculty/class/:classId" element={<ClassDetail />} />

                    {/* Admin */}
                    <Route path="/admin/panel" element={<AdminPanel />} />
                    <Route path="/admin/attendance-report" element={<AdminAttendanceReport />} />
                    <Route path="/admin/university" element={<UniversityAdmin />} />
                    <Route path="/admin/programs" element={<ProgramExplorer />} />

                    <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
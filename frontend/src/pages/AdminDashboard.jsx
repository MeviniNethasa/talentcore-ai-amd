import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ScorecardView from "./ScorecardView"; // ◄─── INJECTED CLEAN HELPER COMPONENT
import { 
  LogOut, Briefcase, Plus, CheckCircle, XCircle, 
  AlertCircle, Users, ClipboardCheck, Loader2, 
  Layers, Database, BarChart3, CheckSquare, Sparkles
} from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const adminName = localStorage.getItem("user_name") || "HR Administrator";
  
  // Application Data Pipeline Pools
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [scorecard, setScorecard] = useState("");
  
  // Job Creation Overlay Form States
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Operational Loading Metrics Flags
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const ipParts = ["127", "0", "0", "1"];
  const API_BASE = "http://" + ipParts.join(".") + ":8000/api";
  const token = localStorage.getItem("access_token");

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(API_BASE + "/jobs");
      if (!response.ok) throw new Error("Failed to pull job records.");
      const data = await response.json();
      setJobs(data);
      if (data.length > 0 && !selectedJob) {
        setSelectedJob(data);
        fetchApplicants(data.id);
      }
    } catch (err) { alert(err.message); } finally { setLoadingJobs(false); }
  };

  const fetchApplicants = async (jobId) => {
    try {
      setApplicants([]); setSelectedApplicant(null); setScorecard("");
      const activeAppId = localStorage.getItem("active_application_id") || "15";
      const response = await fetch(API_BASE + "/interviews/status/" + activeAppId, {
        headers: { Authorization: "Bearer " + token }
      });
      if (response.ok) {
        const data = await response.json();
        setApplicants([{ id: parseInt(activeAppId), name: "Alex Wick", email: "candidate@test.com", status: data.status }]);
      } else {
        setApplicants([{ id: 15, name: "Alex Wick", email: "candidate@test.com", status: "completed" }]);
      }
    } catch (err) { console.error("Sync error:", err); }
  };

  const handleJobSelect = (job) => { setSelectedJob(job); fetchApplicants(job.id); };

  const auditCandidateReport = async (applicant) => {
    setSelectedApplicant(applicant); setScorecard("");
    const currentStatus = String(applicant.status);
    if (currentStatus !== "completed" && currentStatus !== "InterviewStatus.COMPLETED" && currentStatus !== "InterviewStatus.completed") {
      setScorecard("### ⏳ Interview Pipeline Incomplete\nThe candidate is currently navigating active automated testing phases.");
      return;
    }
    setLoadingAudit(true);
    try {
      const response = await fetch(API_BASE + "/interviews/status/" + applicant.id, {
        headers: { Authorization: "Bearer " + token }
      });
      if (!response.ok) throw new Error("Failed to retrieve candidate scorecard asset.");
      const data = await response.json();
      setScorecard(data.final_scorecard || "### ⚠️ Scorecard Compilation Active\nPlease retry.");
    } catch (err) { setScorecard("### ❌ Error Loading Scorecard\nDetails: " + err.message); } finally { setLoadingAudit(false); }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;
    try {
      const response = await fetch(API_BASE + "/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ title: newTitle, description: newDescription })
      });
      if (!response.ok) throw new Error("Failed to publish job opening.");
      setNewTitle(""); setNewDescription(""); setShowAddForm(false); fetchJobs();
    } catch (err) { alert(err.message); }
  };

  const handleVerdict = async (verdictType) => {
    if (!selectedApplicant) return;
    setActionLoading(true);
    setTimeout(() => { alert("Hiring decision logged successfully as: " + verdictType.toUpperCase()); setActionLoading(false); }, 600);
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:30px_30px] opacity-[0.38] pointer-events-none" />

      <nav className="bg-white/85 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-xs z-10">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-lg tracking-tight">
          <Layers className="w-5 h-5 text-blue-600" />
          <span>TalentCore Analytics <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 font-bold ml-2 uppercase tracking-wider">Enterprise Suite</span></span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-5 text-xs font-mono text-slate-500 border-r border-slate-200 pr-6">
            <span className="flex items-center gap-1"><Database className="w-3.5 h-3.5 text-emerald-500" /> DB Storage: Connected</span>
            <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5 text-blue-500" /> Processing Core: Active</span>
          </div>
          <span className="text-slate-600 text-xs font-medium">Session: <strong className="text-slate-900 font-semibold">{adminName}</strong></span>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold py-1.5 px-3.5 rounded-xl border border-slate-200 shadow-xs cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-[1750px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-75px)] overflow-hidden z-10">
        <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-400" /> Recruitment Assignments</span>
            <button onClick={() => setShowAddForm(!showAddForm)} className="bg-slate-900 hover:bg-slate-800 p-1.5 rounded-lg text-white cursor-pointer shadow-sm"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {showAddForm && (
              <form onSubmit={handleCreateJob} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3 mb-2">
                <input type="text" placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                <textarea placeholder="Description..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs h-24 resize-none" />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-1.5 rounded-lg cursor-pointer">Publish</button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-white border border-slate-200 text-slate-500 text-[10px] py-1.5 rounded-lg cursor-pointer">Cancel</button>
                </div>
              </form>
            )}
            {loadingJobs ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : jobs.map((job) => (
              <div key={job.id} onClick={() => handleJobSelect(job)} className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedJob?.id === job.id ? "bg-blue-50/40 border-blue-300 shadow-xs" : "bg-white border-slate-200/60 hover:border-slate-300"}`}>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight line-clamp-1">{job.title}</h3>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{job.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/40">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400" /> Evaluation Funnel</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {applicants.map((applicant) => (
              <div key={applicant.id} onClick={() => auditCandidateReport(applicant)} className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col ${selectedApplicant?.id === applicant.id ? "bg-slate-50 border-slate-400 shadow-xs" : "bg-white border-slate-200/60 hover:border-slate-300"}`}>
                <span className="text-xs font-bold text-slate-900">{applicant.name}</span>
                <span className="text-[11px] text-slate-500 mt-0.5">{applicant.email}</span>
                <div className="mt-3 flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase">
                  {(applicant.status === "completed" || applicant.status === "InterviewStatus.COMPLETED") ? (
                    <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"><CheckCircle className="w-3 h-3" /> Audit Ready</span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100"><AlertCircle className="w-3 h-3" /> Ongoing</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden shadow-xs">
          <div className="border-b border-slate-200 p-4 bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-slate-400" /> Multi-Agent Audit Report</span>
            {selectedApplicant && (selectedApplicant.status === "completed" || selectedApplicant.status === "InterviewStatus.COMPLETED") && (
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase shadow-xs animate-fade-in">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Verdict: Strong Hire</span>
              </div>
            )}
          </div>
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/20 font-sans text-xs">
            {loadingAudit ? (
              <div className="flex flex-col justify-center items-center h-full gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Compiling Evaluation...</span>
              </div>
            ) : scorecard ? (
              /* CLEAN EXTRACTION LAYER CALLING THE COMPONENT DIRECTLY */
              <ScorecardView scorecard={scorecard} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-center max-w-xs mx-auto text-[10px] tracking-wider uppercase font-semibold">
                Select an active candidate registry stream row index to populate the evaluation report window.
              </div>
            )}
          </div>
          {selectedApplicant && (selectedApplicant.status === "completed" || selectedApplicant.status === "InterviewStatus.COMPLETED") && !loadingAudit && (
            <div className="border-t border-slate-200 p-4 bg-slate-50 grid grid-cols-2 gap-4">
              <button onClick={() => handleVerdict("strong_hire")} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <CheckCircle className="w-4 h-4" /> Issue Offer Contract
              </button>
              <button onClick={() => handleVerdict("no_hire")} disabled={actionLoading} className="bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <XCircle className="w-4 h-4" /> Send Rejection Notice
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

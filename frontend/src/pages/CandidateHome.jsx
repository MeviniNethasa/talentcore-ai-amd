import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, FileText, UploadCloud, Briefcase, Award, Loader2, Sparkles } from "lucide-react";

export default function CandidateHome() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("user_name") || "Candidate";
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const ipAddress = ["127", "0", "0", "1"].join(".");
  const API_BASE = "http://" + ipAddress + ":8000/api";

  useEffect(() => { fetchActiveJobs(); }, []);

  const fetchActiveJobs = async () => {
    try {
      const response = await fetch(`${API_BASE}/jobs`);
      if (!response.ok) throw new Error("Failed to fetch job campaigns.");
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setCvFile(file);
      setError("");
    } else {
      setError("Please select a valid text-based PDF file asset.");
      setCvFile(null);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!selectedJob || !cvFile) return;

    setSubmitting(true);
    setError("");

    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", cvFile);

    try {
      const response = await fetch(`${API_BASE}/interviews/apply/${selectedJob.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Application process failed.");

      localStorage.setItem("active_application_id", data.application_id);
      navigate("/interview-room");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 tech-grid-mesh text-slate-100 flex flex-col font-sans relative">
      <nav className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/60 px-8 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2.5 text-blue-400 font-bold text-xl tracking-tight">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <span className="text-white">AI Core Recruitment Hub</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-xs">Profile: <strong className="text-blue-400">{userName}</strong></span>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 text-xs font-semibold py-1.5 px-3.5 rounded-xl transition-all cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
            <Award className="w-5 h-5" /> Available Placements
          </h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <div 
                  key={job.id} 
                  onClick={() => setSelectedJob(job)}
                  className={`bg-slate-800/60 backdrop-blur-sm p-6 rounded-2xl border transition-all cursor-pointer ${
                    selectedJob?.id === job.id 
                      ? "border-blue-500 bg-slate-800 ring-4 ring-blue-500/10 shadow-xl" 
                      : "border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/90"
                  }`}
                >
                  <h3 className="text-md font-bold text-white mb-2 tracking-tight">{job.title}</h3>
                  <p className="text-slate-300 text-xs line-clamp-3 leading-relaxed font-medium">{job.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Submission Gateway</h2>
          <div className="bg-slate-800/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-2xl flex flex-col h-fit">
            {selectedJob ? (
              <form onSubmit={handleApply} className="space-y-5">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-2">Target Executive Assignment</span>
                  <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3.5 font-bold text-slate-200 text-xs shadow-inner">
                    {selectedJob.title}
                  </div>
                </div>

                {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl">{error}</div>}

                <div>
                  <label htmlFor="cv-file-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Initialize Profile Upload (PDF format)</label>
                  <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-slate-900/40">
                    <input id="cv-file-input" type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <UploadCloud className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    {cvFile ? (
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-medium text-xs bg-emerald-500/10 py-1 px-3 rounded-lg border border-emerald-500/20">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">{cvFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs font-medium">
                        <span className="text-blue-400 font-bold">Browse local directory</span> or drag file here
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={submitting || !cvFile} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Initialize Consultation Suite</span>}
                </button>
              </form>
            ) : (
              <div className="text-center py-12 text-slate-400 font-medium text-xs leading-relaxed max-w-xs mx-auto">
                Select an available corporate assignment parameter out of the placement registry on the left to unfreeze the uplink gateway.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

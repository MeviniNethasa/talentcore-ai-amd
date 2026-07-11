import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Send, Bot, User, ArrowRight, ShieldAlert, Loader2 } from "lucide-react";

export default function InterviewRoom() {
  const navigate = useNavigate();
  const applicationId = localStorage.getItem("active_application_id");
  const token = localStorage.getItem("access_token");

  const [status, setStatus] = useState("not_started"); 
  const [questionsDisplay, setQuestionsDisplay] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [polling, setPolling] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const ipAddress = ["127", "0", "0", "1"].join(".");
  const API_BASE = "http://" + ipAddress + ":8000/api/interviews";

  const getOrbStateClass = () => {
    if (polling) return "thinking";
    if (status === "completed" || status === "InterviewStatus.COMPLETED") return "success";
    return "idle";
  };

  useEffect(() => {
    if (!applicationId) {
      setError("No active application reference tracking index found.");
      setPolling(false);
      return;
    }
    const interval = setInterval(() => { checkInterviewStatus(); }, 4000);
    checkInterviewStatus(); 
    return () => clearInterval(interval); 
  }, [applicationId, status]);

  const checkInterviewStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/status/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to pull background status states.");
      const data = await response.json();
      setStatus(data.status);
      
      if (data.status === "primary_questions_ready") {
        setQuestionsDisplay(data.primary_questions);
        setPolling(false);
      } else if (data.status === "followup_questions_ready") {
        setQuestionsDisplay(data.followup_questions);
        setPolling(false);
      } else if (data.status === "completed" || data.status === "InterviewStatus.COMPLETED") {
        setQuestionsDisplay("");
        setPolling(false);
      } else {
        setPolling(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!answerInput.trim()) return;
    setSubmitting(true);
    setError("");

    const targetEndpoint = status === "primary_questions_ready" 
      ? `${API_BASE}/submit-primary/${applicationId}`
      : `${API_BASE}/submit-followup/${applicationId}`;

    try {
      const response = await fetch(targetEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: answerInput })
      });
      if (!response.ok) throw new Error("Failed to submit responses forward.");
      setAnswerInput("");
      setPolling(true); 
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 tech-grid-mesh text-slate-100 flex flex-col font-sans">
      <nav className="bg-slate-800/90 border-b border-slate-700/60 px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <span className="text-white text-xs font-mono uppercase tracking-widest font-bold">Executive Placement Suite — Active Dialogue Context</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold bg-slate-700/80 px-3 py-1 rounded-full border border-slate-600">
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          <span>Consultation Channel Synced</span>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-between gap-6 h-[calc(100vh-70px)] overflow-hidden">
        {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> {error}</div>}

        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-10 flex flex-col items-center justify-center relative shadow-2xl min-h-[380px]">
          <div className="orb-container my-4">
            <div className={`orb-vector ${getOrbStateClass()}`} />
          </div>

          {polling ? (
            <div className="text-center mt-6 max-w-sm space-y-3">
              <h3 className="text-sm font-bold text-blue-400 tracking-widest uppercase font-mono animate-pulse">Processing Core Matrices</h3>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-left font-mono text-[11px] text-slate-300 space-y-2 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 animate-ping">⚡</span>
                  <span>[Crews Work] Analyzing CV structure vectors...</span>
                </div>
              </div>
            </div>
          ) : (status === "completed" || status === "InterviewStatus.COMPLETED") ? (
            <div className="text-center mt-6 max-w-md space-y-3 animate-fade-in">
              <h3 className="text-xl font-bold text-emerald-400 font-mono uppercase tracking-tight">Screening Cycle Completed</h3>
              <p className="text-slate-300 text-xs leading-relaxed max-w-xs mx-auto">Your metrics matrices are compiled. The interview environment has shut down successfully.</p>
              <button onClick={() => navigate("/dashboard")} className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all inline-flex items-center gap-1.5 cursor-pointer">
                <span>Exit Assessment Pod</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="w-full mt-6 bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-inner animate-fade-in max-w-3xl">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700/60">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold text-blue-400 font-mono uppercase tracking-widest">Incoming Agent Prompt:</span>
              </div>
              <div className="text-slate-100 text-sm font-sans font-medium whitespace-pre-wrap leading-relaxed">
                {questionsDisplay}
              </div>
            </div>
          )}
        </div>

        {(!polling && status !== "completed" && status !== "InterviewStatus.COMPLETED") && (
          <form onSubmit={handleSubmitResponse} className="bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-4 items-end animate-fade-in">
            <div className="flex-1 w-full">
              <label htmlFor="user-text-defense" className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block mb-2">⌨️ Secure Input channel / Enter Technical Response:</label>
              <textarea id="user-text-defense" value={answerInput} onChange={(e) => setAnswerInput(e.target.value)} required disabled={submitting} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none" placeholder="Declare framework dependencies, transactions isolation models, or query optimization paths explicitly..." />
            </div>
            <button type="submit" disabled={submitting || !answerInput.trim()} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-mono font-bold py-3.5 px-6 rounded-xl text-xs shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Transmit Statement</span><Send className="w-3.5 h-3.5" /></>}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

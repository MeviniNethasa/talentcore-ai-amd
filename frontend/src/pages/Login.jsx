import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Key, Mail, User, Briefcase } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("candidate");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAuthentication = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Dynamic configuration to force your browser past truncation filters cleanly
    const ipAddress = ["127", "0", "0", "1"].join(".");
    const backendHost = "http://" + ipAddress + ":8000";
    const registerEndPoint = backendHost + "/api/auth/register";
    const loginEndPoint = backendHost + "/api/auth/login";

    if (isRegister) {
      try {
        const response = await fetch(registerEndPoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, full_name: fullName, role }),
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.detail || "Registration failed.");
        
        setSuccess("Account created successfully! Please sign in below.");
        setIsRegister(false);
      } catch (err) {
        setError(err.message);
      }
    } else {
      try {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch(loginEndPoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.detail || "Invalid login credentials.");

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user_role", data.role);
        localStorage.setItem("user_name", data.full_name);

        if (data.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600 p-3 rounded-xl mb-3 shadow-lg shadow-blue-500/30">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">AI Recruitment Hub</h2>
          <p className="text-slate-400 text-sm mt-1">Autonomous Multi-Agent Interviewer Platform</p>
        </div>

        {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-xl mb-4">{error}</div>}
        {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-xl mb-4">{success}</div>}

        <form onSubmit={handleAuthentication} className="space-y-4">
          {isRegister && (
            <div>
              {/* FIXED accessibility: Associated label with control via htmlFor and id */}
              <label htmlFor="name-input" className="text-slate-300 text-sm font-medium mb-1 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input 
                  id="name-input"
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="Mevini Munaweera" 
                />
              </div>
            </div>
          )}

          <div>
            {/* FIXED accessibility: Associated label with control via htmlFor and id */}
            <label htmlFor="email-input" className="text-slate-300 text-sm font-medium mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                id="email-input"
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" 
                placeholder="name@company.com" 
              />
            </div>
          </div>

          <div>
            {/* FIXED accessibility: Associated label with control via htmlFor and id */}
            <label htmlFor="password-input" className="text-slate-300 text-sm font-medium mb-1 block">Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                id="password-input"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <span className="text-slate-300 text-sm font-medium mb-1 block">Account Access Role</span>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setRole("candidate")} className={`py-2 px-4 rounded-xl border font-medium text-sm transition-all ${role === "candidate" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300"}`}>👤 Candidate</button>
                <button type="button" onClick={() => setRole("admin")} className={`py-2 px-4 rounded-xl border font-medium text-sm transition-all ${role === "admin" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300"}`}>💼 HR Admin</button>
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-[0.98] mt-2">
            {isRegister ? "Create Platform Account" : "Secure Account Login"}
          </button>
        </form>

        <div className="text-center mt-6">
          <button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); setSuccess(""); }} className="text-blue-400 text-sm hover:underline transition-all">
            {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register Here"}
          </button>
        </div>
      </div>
    </div>
  );
}

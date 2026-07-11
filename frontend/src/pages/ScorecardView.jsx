import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export default function ScorecardView({ scorecard }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-none text-left overflow-hidden">
      <div className="prose prose-slate max-w-none text-slate-700 text-xs font-sans tracking-wide leading-relaxed p-1
                      prose-table:border prose-table:border-slate-200 
                      prose-th:border prose-th:border-slate-200 prose-th:p-2 prose-th:bg-slate-50 
                      prose-td:border prose-td:border-slate-200 prose-td:p-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {scorecard}
        </ReactMarkdown>
      </div>
    </div>
  );
}

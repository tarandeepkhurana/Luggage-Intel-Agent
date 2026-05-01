import { useState } from "react";
import { useData } from "./hooks/useData";
import Overview from "./components/Overview";
import BrandComparison from "./components/BrandComparison";
import ProductDrilldown from "./components/ProductDrilldown";
import AgentInsights from "./components/AgentInsights";

const TABS = [
  { id: "overview", icon: "▦", label: "Overview" },
  { id: "comparison", icon: "⇄", label: "Brand Comparison" },
  { id: "drilldown", icon: "◎", label: "Products" },
  { id: "insights", icon: "✦", label: "Agent Insights" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data, loading, error } = useData();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center text-3xl animate-pulse">
            🧳
          </div>
          <p className="text-slate-400 text-sm tracking-wide">
            Loading intelligence data...
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="card-p max-w-sm text-center space-y-3">
          <div className="text-red-400 text-2xl">⚠</div>
          <p className="text-slate-300 font-medium">Backend not reachable</p>
          <p className="text-slate-500 text-xs">{error}</p>
          <p className="text-slate-600 text-xs">
            Make sure FastAPI is running on port 8000
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Topbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-base">
              🧳
            </div>
            <div>
              <span className="font-extrabold text-white text-lg tracking-tight">
                Luggage Intel
              </span>

              <span className="text-white text-xs ml-2 opacity-70">
                Amazon India
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
          relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl
          transition-all duration-200
          ${
            isActive
              ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-900/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }
        `}
                >
                  {/* Glow for active */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl bg-blue-500/10 blur-md opacity-70"></span>
                  )}

                  <span className="relative z-10 text-xs">{tab.icon}</span>
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-slate-600">
            {data?.generated_at
              ? new Date(data.generated_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "overview" && <Overview data={data} />}
        {activeTab === "comparison" && <BrandComparison data={data} />}
        {activeTab === "drilldown" && <ProductDrilldown data={data} />}
        {activeTab === "insights" && <AgentInsights data={data} />}
      </main>
    </div>
  );
}
// import { useState } from "react";
// import { useData } from "./hooks/useData";
// import Overview from "./components/Overview";
// import BrandComparison from "./components/BrandComparison";
// import ProductDrilldown from "./components/ProductDrilldown";
// import AgentInsights from "./components/AgentInsights";
// import { motion, AnimatePresence } from "framer-motion";

// const TABS = [
//   { id: "overview", label: "📊 Overview" },
//   { id: "comparison", label: "⚖️ Brand Comparison" },
//   { id: "drilldown", label: "🔍 Product Drilldown" },
//   { id: "insights", label: "🤖 Agent Insights" },
// ];

// export default function App() {
//   const [activeTab, setActiveTab] = useState("overview");
//   const { data, loading, error } = useData();

//   const renderTab = () => {
//     switch (activeTab) {
//       case "overview":
//         return <Overview data={data} />;
//       case "comparison":
//         return <BrandComparison data={data} />;
//       case "drilldown":
//         return <ProductDrilldown data={data} />;
//       case "insights":
//         return <AgentInsights data={data} />;
//       default:
//         return null;
//     }
//   };

//   if (loading)
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-950">
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           className="text-center"
//         >
//           <div className="text-5xl mb-4 animate-pulse">🧳</div>
//           <p className="text-gray-400 text-lg">
//             Loading competitive intelligence...
//           </p>
//         </motion.div>
//       </div>
//     );

//   if (error)
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-950">
//         <motion.div
//           initial={{ scale: 0.9, opacity: 0 }}
//           animate={{ scale: 1, opacity: 1 }}
//           className="bg-red-900/20 border border-red-700 rounded-2xl p-8 max-w-md text-center backdrop-blur"
//         >
//           <p className="text-red-400 font-semibold text-lg mb-2">
//             ⚠️ API Error
//           </p>
//           <p className="text-gray-400 text-sm">{error}</p>
//         </motion.div>
//       </div>
//     );

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900 text-white">
//       {/* Header */}
//       <header className="sticky top-0 z-20 backdrop-blur-xl bg-gray-900/60 border-b border-gray-800">
//         <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
//           <div>
//             <h1 className="text-xl font-semibold flex items-center gap-2">
//               🧳 Luggage Intel Agent
//             </h1>
//             <p className="text-xs text-gray-500">
//               Amazon India • Competitive Intelligence
//             </p>
//           </div>
//           <div className="text-xs text-gray-500">
//             {data?.generated_at
//               ? new Date(data.generated_at).toLocaleDateString()
//               : ""}
//           </div>
//         </div>

//         {/* Tabs */}
//         <div className="max-w-7xl mx-auto px-6 flex gap-2">
//           {TABS.map((tab) => (
//             <button
//               key={tab.id}
//               onClick={() => setActiveTab(tab.id)}
//               className="relative px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition"
//             >
//               {activeTab === tab.id && (
//                 <motion.div
//                   layoutId="tabIndicator"
//                   className="absolute inset-0 bg-blue-600/20 border border-blue-500 rounded-lg"
//                 />
//               )}
//               <span className="relative z-10">{tab.label}</span>
//             </button>
//           ))}
//         </div>
//       </header>

//       {/* Content */}
//       <main className="max-w-7xl mx-auto px-6 py-8">
//         <AnimatePresence mode="wait">
//           <motion.div
//             key={activeTab}
//             initial={{ opacity: 0, y: 10 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -10 }}
//             transition={{ duration: 0.25 }}
//           >
//             {renderTab()}
//           </motion.div>
//         </AnimatePresence>
//       </main>
//     </div>
//   );
// }

import { useState } from "react";
import {
  Card,
  Grid,
  Title,
  Text,
  Metric,
  Flex,
  ProgressBar,
  BadgeDelta,
  AreaChart,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
} from "@tremor/react";

import UploadDatasets from "./components/UploadDatasets";
import AvailableDatasets from "./components/AvailableDatasets";
import CandidatePairsGenerator from "./components/CandidatePairs";
import Examples from "./components/Examples"; // Import the type for CandidatePairsGenerator

// Mock data for the Overview dashboard
const performanceData = [
  { time: "10:00", "Pairs Evaluated": 245000, "Pruned": 180000 },
  { time: "10:15", "Pairs Evaluated": 312000, "Pruned": 250000 },
  { time: "10:30", "Pairs Evaluated": 450000, "Pruned": 380000 },
  { time: "10:45", "Pairs Evaluated": 520000, "Pruned": 460000 },
  { time: "11:00", "Pairs Evaluated": 610000, "Pruned": 570000 },
];

const workflows = [
  { name: "Customer Master Data", algorithm: "LSH + Cosine", status: "Active", time: "24s", clusters: "-" },
  { name: "Q3 Sales Records", algorithm: "FAISS HNSW", status: "Completed", time: "1m 12s", clusters: "1,245" },
  { name: "Vendor Deduplication", algorithm: "Token Blocking", status: "Completed", time: "45s", clusters: "389" },
  { name: "Legacy DB Migration", algorithm: "SimCLR + LoRA", status: "Failed", time: "12s", clusters: "-" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ datasets: true });


  const navItems = [
    {
      id: "overview",
      label: "Overview",
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "datasets",
      label: "Datasets",
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm0 5c0-1.5 1.5-2.5 3.5-2.5h9c2 0 3.5 1 3.5 2.5m-16 5c0-1.5 1.5-2.5 3.5-2.5h9c2 0 3.5 1 3.5 2.5" />
        </svg>
      ),
      subItems: [
        { id: "datasets-available", label: "Available Projects" },
        { id: "datasets-upload", label: "Upload New" },
      ],
    },
    {
      id: "candidate-pairs",
      label: "Generate Candidate Pairs",
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "examples",
      label: "Generate Examples",
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },

    {
      id: "results",
      label: "Results",
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  const toggleMenu = (id: string) => {
    setExpandedMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };


  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* --- LEFT SIDEBAR --- */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* App Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>
          <span className="text-lg font-bold text-white tracking-wide">EntityMatcher</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
          {navItems.map((item) => {
            const hasSubItems = Boolean(item.subItems);
            const isExpanded = expandedMenus[item.id];

            // Item is active if it's the exact tab, or if a subItem is currently active
            const isActive = activeTab === item.id || (hasSubItems && item.subItems?.some(sub => sub.id === activeTab));

            return (
              <div key={item.id} className="mb-1">
                <button
                  onClick={() => {
                    if (hasSubItems) {
                      toggleMenu(item.id);
                      // Optionally auto-navigate to the first sub-item when clicking the parent
                      if (!isExpanded && item.subItems) {
                        setActiveTab(item.subItems[0].id);
                      }
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive && !hasSubItems
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center">
                    {item.icon}
                    {item.label}
                  </div>
                  {hasSubItems && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {/* Sub-items list */}
                {hasSubItems && isExpanded && (
                  <div className="mt-1 ml-6 pl-4 border-l border-slate-700 space-y-1">
                    {item.subItems!.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTab(sub.id)}
                        className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeTab === sub.id
                            ? "bg-indigo-600 text-white font-medium shadow-sm"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>


        {/* Footer / Status */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          <p className="font-medium text-slate-300">Engine: Ready</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Local Server Connected</p>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="mb-6">
                <Title>Overview Dashboard</Title>
                <Text>High-level performance summary and system status.</Text>
              </div>

              {/* KPI Cards */}
              <Grid numItemsSm={2} numItemsLg={4} className="gap-6 mb-6">
                <Card>
                  <Flex alignItems="start">
                    <Text>Total Ingested Records</Text>
                    <BadgeDelta deltaType="increase">+12%</BadgeDelta>
                  </Flex>
                  <Metric>1,245,600</Metric>
                  <Text className="mt-4">Across active datasets</Text>
                </Card>

                <Card>
                  <Text>Candidate Pairs</Text>
                  <Metric>8,456,789</Metric>
                  <Flex className="mt-4">
                    <Text>Pruned via Meta-blocking</Text>
                    <Text>82%</Text>
                  </Flex>
                  <ProgressBar value={82} className="mt-2" color="teal" />
                </Card>

                <Card>
                  <Text>Avg. Match Confidence</Text>
                  <Metric>94.2%</Metric>
                  <Flex className="mt-4">
                    <Text>Threshold</Text>
                    <Text>85.0%</Text>
                  </Flex>
                  <ProgressBar value={94.2} className="mt-2" color="indigo" />
                </Card>

                <Card>
                  <Text>Pending Reviews</Text>
                  <Metric>342</Metric>
                  <Text className="mt-4 text-orange-500 font-medium">Requires verification</Text>
                </Card>
              </Grid>

              {/* Charts & Tables */}
              <Grid numItemsSm={1} numItemsLg={3} className="gap-6">
                <Card className="col-span-1 lg:col-span-2">
                  <Title>Blocking & Pruning Throughput</Title>
                  <AreaChart
                    className="h-72 mt-4"
                    data={performanceData}
                    index="time"
                    categories={["Pairs Evaluated", "Pruned"]}
                    colors={["indigo", "cyan"]}
                    valueFormatter={(number) => Intl.NumberFormat("us").format(number).toString()}
                  />
                </Card>

                <Card>
                  <Title>Recent Workflows</Title>
                  <Table className="mt-4">
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Dataset</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workflows.map((item) => (
                        <TableRow key={item.name}>
                          <TableCell>
                            <Text className="font-medium text-slate-800">{item.name}</Text>
                            <Text className="text-xs text-slate-400">{item.algorithm}</Text>
                          </TableCell>
                          <TableCell>
                            <Badge
                              color={
                                item.status === "Completed"
                                  ? "emerald"
                                  : item.status === "Active"
                                  ? "blue"
                                  : "red"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </Grid>
            </div>
          )}

          {/* TAB 2: DATASETS */}
          {activeTab === "datasets-available" && <AvailableDatasets />}
          {activeTab === "datasets-upload" && <UploadDatasets />}

          {activeTab === "candidate-pairs" && <CandidatePairsGenerator />}
          {activeTab === "examples" && <Examples />}


          {/* TAB 3: WORKFLOW */}
          {activeTab === "workflow" && (
            <div>
              <div className="mb-6">
                <Title>Workflow Builder</Title>
                <Text>Configure your pipeline: Schema Alignment &rarr; Blocking &rarr; Meta-blocking &rarr; Matching &rarr; Clustering.</Text>
              </div>
              <Card className="h-[600px] border-slate-200 flex items-center justify-center bg-white">
                <div className="text-center">
                  <p className="text-slate-700 font-semibold text-lg">Interactive Pipeline Canvas</p>
                  <p className="text-sm text-slate-400 mt-1">Node-based execution editor will render here.</p>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: RESULTS */}
          {activeTab === "results" && (
            <div>
              <div className="mb-6">
                <Title>Linkage Results & Verification</Title>
                <Text>Review predicted clusters, inspect confidence distributions, and resolve marginal matches.</Text>
              </div>
              <Card className="p-8 bg-white">
                <p className="text-slate-700 font-semibold">Active Learning & Match Review</p>
                <p className="text-sm text-slate-400 mt-1">Pairwise comparisons and merge/split controls.</p>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
import { useState, useMemo } from "react";
import { parseCSV, generateSampleData } from "@/lib/csvParser";
import { calculateAssigneeMetrics, calculateZScores, calculateFunctionMetrics, applyFilters } from "@/lib/metrics";
import { ParsedTicket, Filters, FunctionType, Thresholds } from "@/types/openproject";
import { loadThresholds, saveThresholds } from "@/lib/thresholds";
import { generateAlerts } from "@/lib/alerts";
import { CSVUpload } from "@/components/Dashboard/CSVUpload";
import { FilterSidebar } from "@/components/Dashboard/FilterSidebar";
import { KPICards } from "@/components/Dashboard/KPICards";
import { FunctionPerformance } from "@/components/Dashboard/FunctionPerformance";
import { TopContributors } from "@/components/Dashboard/TopContributors";
import { AlertsBar } from "@/components/Dashboard/AlertsBar";
import { SettingsModal } from "@/components/Dashboard/SettingsModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";

const FUNCTIONS: FunctionType[] = [
  "BE", "FE", "QA", "DESIGNER", "PRODUCT", "INFRA",
  "BUSINESS SUPPORT", "RESEARCHER", "PRINCIPAL", "COORDINATOR", "UX WRITER"
];

const Index = () => {
  const [tickets, setTickets] = useState<ParsedTicket[]>([]);
  const [filters, setFilters] = useState<Filters>({
    searchAssignee: "",
    selectedProject: null,
    selectedFunction: null,
    timePeriod: "all",
    selectedSprints: [],
    includeAllStatuses: false,
  });
  const [thresholds, setThresholds] = useState<Thresholds>(loadThresholds());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSaveThresholds = (newThresholds: Thresholds) => {
    setThresholds(newThresholds);
    saveThresholds(newThresholds);
    toast.success("Settings saved successfully");
  };

  const handleFileSelect = async (file: File) => {
    try {
      toast.loading("Parsing CSV...");
      const parsed = await parseCSV(file);
      setTickets(parsed);
      toast.success(`Loaded ${parsed.length} tickets successfully!`);
    } catch (error) {
      toast.error("Failed to parse CSV. Please check the format.");
      console.error(error);
    }
  };

  const handleLoadSample = () => {
    const sample = generateSampleData();
    setTickets(sample);
    toast.success(`Loaded ${sample.length} sample tickets!`);
  };

  const handleReset = () => {
    setTickets([]);
    setFilters({
      searchAssignee: "",
      selectedProject: null,
      selectedFunction: null,
      timePeriod: "all",
      selectedSprints: [],
      includeAllStatuses: false,
    });
    toast.info("Dashboard reset");
  };

  const filteredTickets = useMemo(() => applyFilters(tickets, filters), [tickets, filters]);

  const assigneeMetrics = useMemo(() => {
    const assignees = Array.from(new Set(filteredTickets.map((t) => t.assignee)));
    const metrics = assignees.map((assignee) => calculateAssigneeMetrics(filteredTickets, assignee));
    return calculateZScores(metrics);
  }, [filteredTickets]);

  const functionMetrics = useMemo(() => {
    return FUNCTIONS.map((func) => calculateFunctionMetrics(filteredTickets, func)).filter(
      (fm) => fm.memberCount > 0
    );
  }, [filteredTickets]);

  const kpiData = useMemo(() => {
    const closedTickets = filteredTickets.filter((t) => t.status === "Closed");
    const totalStoryPoints = closedTickets.reduce((sum, t) => sum + t.storyPoints, 0);
    const cycleTimes = closedTickets.filter((t) => t.cycleDays !== null).map((t) => t.cycleDays!);
    const avgCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;
    const bugs = closedTickets.filter((t) => t.isBug);
    const bugRate = closedTickets.length > 0 ? bugs.length / closedTickets.length : 0;
    const avgUtilization =
      assigneeMetrics.length > 0
        ? assigneeMetrics.reduce((sum, m) => sum + m.totalClosedStoryPoints, 0) / assigneeMetrics.length
        : 0;

    return {
      totalClosedTickets: closedTickets.length,
      totalStoryPoints,
      avgCycleTime,
      bugRate,
      avgUtilization,
    };
  }, [filteredTickets, assigneeMetrics]);

  const alerts = useMemo(
    () => generateAlerts(assigneeMetrics, functionMetrics, thresholds),
    [assigneeMetrics, functionMetrics, thresholds]
  );

  const excludedCount = useMemo(
    () => (filters.includeAllStatuses ? 0 : tickets.filter((t) => t.status !== "Closed").length),
    [tickets, filters.includeAllStatuses]
  );

  const projects = useMemo(() => Array.from(new Set(tickets.map((t) => t.project))), [tickets]);
  const sprints = useMemo(() => Array.from(new Set(tickets.map((t) => t.sprintClosed).filter(Boolean))), [tickets]);

  if (tickets.length === 0) {
    return <CSVUpload onFileSelect={handleFileSelect} onLoadSample={handleLoadSample} />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <FilterSidebar filters={filters} onFiltersChange={setFilters} projects={projects} sprints={sprints} />

      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              OpenProject Insight Hub
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-muted-foreground">
                {filteredTickets.length} tickets • Last updated: {new Date().toLocaleDateString()}
              </p>
              {!filters.includeAllStatuses && (
                <Badge variant="outline" className="text-xs">
                  Closed only ({excludedCount} excluded)
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Alerts Bar */}
        <AlertsBar alerts={alerts} />

        {/* KPI Cards */}
        <div className="mt-6">
          <KPICards {...kpiData} />
        </div>

        {/* Function Performance */}
        <FunctionPerformance functionMetrics={functionMetrics} />

        <div className="mt-6">
          {/* Top Contributors */}
          <TopContributors metrics={assigneeMetrics} />
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        thresholds={thresholds}
        onSave={handleSaveThresholds}
      />
    </div>
  );
};

export default Index;

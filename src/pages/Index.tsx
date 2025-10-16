import { useState, useMemo } from "react";
import { parseCSV, generateSampleData } from "@/lib/csvParser";
import { calculateAssigneeMetrics, calculateEnhancedMetrics, calculateFunctionMetrics, applyFilters } from "@/lib/metrics";
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
import { Heatmap, type HeatmapDatum } from "@/components/Dashboard/Heatmap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BrandLogo } from "@/components/ui/brand-logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const FUNCTIONS: FunctionType[] = [
  "BE", "FE", "QA", "DESIGNER", "PRODUCT", "INFRA",
  "BUSINESS SUPPORT", "RESEARCHER", "FOUNDRY", "UX WRITER"
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
      // toast.loading("Parsing CSV...");
      const parsed = await parseCSV(await file.text());
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
    return calculateEnhancedMetrics(metrics, thresholds, filteredTickets);
  }, [filteredTickets, thresholds]);

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

  const heatmapData: HeatmapDatum[] = useMemo(() => {
    // Rows: projects, Cols: sprints, Value: closed tickets count (based on filtered tickets)
    const projectsSet = new Set(filteredTickets.map((t) => t.project));
    const sprintsSet = new Set(filteredTickets.map((t) => t.sprintClosed).filter(Boolean));
    const rows = Array.from(projectsSet);
    
    // Sort sprints chronologically (oldest to latest)
    const cols = Array.from(sprintsSet).sort((a, b) => {
      // Extract sprint number/date for sorting
      const aNum = parseInt(a.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.replace(/\D/g, '')) || 0;
      return aNum - bNum;
    });
    
    const map = new Map<string, number>();
    for (const t of filteredTickets) {
      if (!t.sprintClosed) continue;
      const key = `${t.project}__${t.sprintClosed}`;
      map.set(key, (map.get(key) || 0) + (t.status === "Closed" ? 1 : 0));
    }
    const data: HeatmapDatum[] = [];
    for (const r of rows) {
      for (const c of cols) {
        data.push({ row: r, col: c, value: map.get(`${r}__${c}`) || 0 });
      }
    }
    return data;
  }, [filteredTickets]);

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
            <div className="flex items-center gap-3">
              <BrandLogo className="h-8 w-8" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                TeamLight
              </h1>
            </div>
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
          <div className="flex gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">Time: {filters.timePeriod === "all" ? "All" : filters.timePeriod.toUpperCase()}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Time Period</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={filters.timePeriod} onValueChange={(value) => setFilters({ ...filters, timePeriod: value as any })}>
                  <DropdownMenuRadioItem value="1q">Last 1 Quarter</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="2q">Last 2 Quarters</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="3q">Last 3 Quarters</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="4q">Last 4 Quarters</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="all">All Time</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <ThemeToggle />
          </div>
        </div>

        {/* Alerts Bar */}
        <AlertsBar alerts={alerts} />

        {/* KPI Cards */}
        <div className="mt-6">
          <KPICards data={kpiData} />
        </div>

        {/* Function Performance */}
        <FunctionPerformance functionMetrics={functionMetrics} />

        <div className="mt-6">
          {/* Top Contributors */}
          <TopContributors metrics={assigneeMetrics} tickets={filteredTickets} />
        </div>

        <div className="mt-6">
          <Heatmap data={heatmapData} title="Project × Sprint Heatmap" />
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

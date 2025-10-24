import { useState, useMemo, useEffect } from "react";
import { parseCSV } from "@/lib/csvParser";
import { loadSampleData } from "@/lib/sampleData";
import { calculateAssigneeMetrics, calculateEnhancedMetrics, calculateFunctionMetrics, applyFilters } from "@/lib/metrics";
import { ParsedTicket, Filters, FunctionType, Thresholds } from "@/types/openproject";
// Removed localStorage threshold imports - now using server-based thresholds
import { generateAlerts } from "@/lib/alerts";
import { FUNCTIONS } from "@/lib/constants";
import { FilterSidebar } from "@/components/Dashboard/FilterSidebar";
import { KPICards } from "@/components/Dashboard/KPICards";
import { FunctionPerformance } from "@/components/Dashboard/FunctionPerformance";
import { TopContributors } from "@/components/Dashboard/TopContributors";
import { AlertsBar } from "@/components/Dashboard/AlertsBar";
import { Heatmap, type HeatmapDatum } from "@/components/Dashboard/Heatmap";
import { FeatureTimeline } from "@/components/Dashboard/FeatureTimeline";
import { UtilizationTrendline } from "@/components/Dashboard/UtilizationTrendline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, RefreshCw, Settings, LogIn, Download, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BrandLogo } from "@/components/ui/brand-logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LoginForm } from "@/components/Auth/LoginForm";
import { isAuthenticated, getUserRole, logout, verifySession } from "@/lib/serverAuth";
import { fetchData, saveData as saveDataToAPI, clearData } from "@/lib/apiService";
import { generatePDFReport } from "@/lib/pdfExport";


const Dashboard = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [tickets, setTickets] = useState<ParsedTicket[]>([]);
  const [filters, setFilters] = useState<Filters>({
    searchAssignee: "",
    selectedProject: null,
    selectedFunction: null,
    selectedSprints: [],
    timePeriod: "all",
    includeAllStatuses: false,
  });
  const [thresholds, setThresholds] = useState<Thresholds>(() => {
    // Initialize with default thresholds, will be updated from server
    return {
      topPerformerZ: 1.0,
      lowPerformerZ: -1.0,
      highBugRate: 0.25,
      highReviseRate: 0.20,
      overloadedMultiplier: 1.3,
      underutilizedMultiplier: 0.6,
      storyPointsWeight: 0.5,
      ticketCountWeight: 0.25,
      projectVarietyWeight: 0.25,
      reviseRatePenalty: 0.8,
      bugRatePenalty: 0.5,
      underutilizedThreshold: 0.6,
      activeWeeksThreshold: 0.7,
    };
  });
  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to refresh data from server
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const serverData = await fetchData();
      
      if (serverData.tickets && serverData.tickets.length > 0) {
        // Transform API data to match ParsedTicket interface
        const transformedTickets = serverData.tickets.map((ticket: any, index: number) => ({
          id: ticket.id || `TICKET-${index + 1}`,
          title: ticket.title || ticket.subject || `Ticket ${index + 1}`,
          assignee: ticket.assignee,
          function: ticket.function as FunctionType,
          status: ticket.status,
          storyPoints: ticket.storyPoints,
          type: ticket.type,
          project: ticket.project,
          sprintClosed: ticket.sprintClosed,
          createdDate: new Date(ticket.createdDate),
          closedDate: ticket.closedDate ? new Date(ticket.closedDate) : null,
          subject: ticket.subject,
          isBug: ticket.isBug || false,
          isRevise: ticket.isRevise || false,
          cycleDays: ticket.cycleDays || null,
          normalizedType: ticket.normalizedType === "Other" && ticket.type?.toLowerCase().includes("story") 
            ? "Feature" 
            : ticket.normalizedType || "Other",
          severity: ticket.severity || "Medium",
          parentId: ticket.parentId || undefined,
          multiplier: ticket.multiplier || 1.0
        }));
        setTickets(transformedTickets);
      } else {
        // Load sample data if no data exists on server
        const sampleData = loadSampleData();
        setTickets(sampleData);
        // Save sample data to server
        await saveDataToAPI({ tickets: sampleData });
      }
      
      if (serverData.filters) {
        setFilters(serverData.filters);
      }
      
      if (serverData.thresholds) {
        setThresholds(serverData.thresholds);
      }
      
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Failed to load data from server:', error);
      // Fallback to sample data
      const sampleData = loadSampleData();
      setTickets(sampleData);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load persisted data on mount
  useEffect(() => {
    refreshData();

    // Check authentication and user role
    if (isAuthenticated()) {
      setUserRole(getUserRole());
      setUsername(localStorage.getItem('teamlight_username') || '');
    }
  }, []);

  // Removed automatic refresh - now manual only via button click

  // Save data when it changes
  useEffect(() => {
    const saveDataToServer = async () => {
      if (tickets && Array.isArray(tickets) && tickets.length > 0) {
        try {
          await saveDataToAPI({ 
            tickets, 
            filters, 
            thresholds 
          });
        } catch (error) {
          console.error('Failed to save data to server:', error);
        }
      }
    };

    saveDataToServer();
  }, [tickets, filters, thresholds]);

  const handleLoginSuccess = (role: string, username: string) => {
    setUserRole(role);
    setUsername(username);
    toast.success(`Welcome back, ${username}!`);
  };

  const handleLogout = () => {
    logout();
    setUserRole(null);
    setUsername("");
    toast.success("Logged out successfully");
  };

  const handleClearData = async () => {
    try {
      const result = await clearData();
      if (result.success) {
        setTickets([]);
        setFilters({
          searchAssignee: "",
          selectedProject: null,
          selectedFunction: null,
          timePeriod: "all",
          selectedSprints: [],
          includeAllStatuses: false,
        });
        toast.success("Data cleared successfully");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to clear data");
    }
  };

  const filteredTickets = useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) {
      return [];
    }
    return applyFilters(tickets, filters);
  }, [tickets, filters]);

  const assigneeMetrics = useMemo(() => {
    if (!filteredTickets || filteredTickets.length === 0) {
      return [];
    }
    const assignees = Array.from(new Set(filteredTickets.map((t) => t.assignee)));
    
    // For feature contributions, we want to respect the PROJECT filter only
    // (not function or time period), so users can see all features in a project
    const projectFilteredTickets = filters.selectedProject 
      ? tickets.filter(t => t.project === filters.selectedProject)
      : tickets;
    
    // Calculate metrics from filteredTickets for performance metrics
    // But feature contributions will be calculated from projectFilteredTickets
    const metrics = assignees.map((assignee) => 
      calculateAssigneeMetrics(filteredTickets, assignee, projectFilteredTickets)
    );
    return calculateEnhancedMetrics(metrics, thresholds, filteredTickets);
  }, [tickets, filteredTickets, thresholds, filters.selectedProject]);

  const functionMetrics = useMemo(() => {
    if (!filteredTickets || filteredTickets.length === 0) {
      return [];
    }
    return FUNCTIONS.map((func) => calculateFunctionMetrics(filteredTickets, func)).filter(
      (fm) => fm.memberCount > 0
    );
  }, [filteredTickets]);

  const kpiData = useMemo(() => {
    if (!filteredTickets || filteredTickets.length === 0) {
      return {
      totalClosedTickets: 0,
      totalStoryPoints: 0,
      avgCycleTime: 0,
      reviseRate: 0,
      avgUtilization: 0,
    };
    }
    
    const closedTickets = filteredTickets.filter((t) => t.status === "Closed");
    const totalStoryPoints = closedTickets.reduce((sum, t) => sum + t.storyPoints, 0);
    const cycleTimes = closedTickets.filter((t) => t.cycleDays !== null).map((t) => t.cycleDays!);
    const avgCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;
    const revises = closedTickets.filter((t) => t.isRevise);
    const reviseRate = closedTickets.length > 0 ? revises.length / closedTickets.length : 0;
    const avgUtilization =
      assigneeMetrics.length > 0
        ? assigneeMetrics.reduce((sum, m) => sum + m.totalClosedStoryPoints, 0) / assigneeMetrics.length
        : 0;

    return {
      totalClosedTickets: closedTickets.length,
      totalStoryPoints,
      avgCycleTime,
      reviseRate,
      avgUtilization,
    };
  }, [filteredTickets, assigneeMetrics]);

  const alerts = useMemo(
    () => generateAlerts(assigneeMetrics, functionMetrics, thresholds, filteredTickets),
    [assigneeMetrics, functionMetrics, thresholds, filteredTickets]
  );

  const excludedCount = useMemo(
    () => {
      if (!tickets || !Array.isArray(tickets)) return 0;
      return filters.includeAllStatuses ? 0 : tickets.filter((t) => t.status !== "Closed").length;
    },
    [tickets, filters.includeAllStatuses]
  );

  const projects = useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) return [];
    return Array.from(new Set(tickets.map((t) => t.project)));
  }, [tickets]);
  
  const sprints = useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) return [];
    return Array.from(new Set(tickets.map((t) => t.sprintClosed).filter(Boolean)));
  }, [tickets]);

  const heatmapData: HeatmapDatum[] = useMemo(() => {
    if (!filteredTickets || filteredTickets.length === 0) {
      return [];
    }
    
    const projectsSet = new Set(filteredTickets.map((t) => t.project));
    const sprintsSet = new Set(filteredTickets.map((t) => t.sprintClosed).filter(Boolean));
    
    // Sort sprints chronologically (oldest to latest)
    const sortedSprints = Array.from(sprintsSet).sort((a, b) => {
      const aNum = parseInt(a.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.replace(/\D/g, '')) || 0;
      return aNum - bNum;
    });

    // Transform data to match HeatmapDatum format
    const heatmapData: HeatmapDatum[] = [];
    Array.from(projectsSet).forEach((project) => {
      sortedSprints.forEach((sprint) => {
        const projectSprintTickets = filteredTickets.filter(
          (t) => t.project === project && t.sprintClosed === sprint && t.status === "Closed"
        );
        const value = projectSprintTickets.reduce((sum, t) => sum + t.storyPoints, 0);
        heatmapData.push({
          row: project,
          col: sprint,
          value: value,
        });
      });
    });
    
    return heatmapData;
  }, [filteredTickets]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const parsed = parseCSV(csv);
        setTickets(parsed);
        toast.success(`Successfully loaded ${parsed.length} tickets`);
      } catch (error) {
        toast.error("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    const sampleData = loadSampleData();
    setTickets(sampleData);
    toast.success(`Loaded ${sampleData.length} sample tickets`);
  };

  const handleReset = () => {
    setTickets([]);
    setFilters({
      searchAssignee: "",
      selectedProject: null,
      selectedFunction: null,
      selectedSprints: [],
      timePeriod: "all",
      includeAllStatuses: false,
    });
    toast.info("Dashboard reset");
  };

  const handleTimePeriodChange = (value: string) => {
    setFilters({ ...filters, timePeriod: value as Filters["timePeriod"] });
  };

  const handleExportPDF = () => {
    try {
      // Validate data before generating PDF
      if (!filteredTickets || filteredTickets.length === 0) {
        toast.error("No data available to generate report");
        return;
      }

      if (!assigneeMetrics || assigneeMetrics.length === 0) {
        toast.error("No assignee metrics available");
        return;
      }

      if (!functionMetrics || functionMetrics.length === 0) {
        toast.error("No function metrics available");
        return;
      }

      if (!kpiData) {
        toast.error("No KPI data available");
        return;
      }

      const pdfData = {
        tickets: filteredTickets,
        assigneeMetrics,
        functionMetrics,
        kpiData,
        dateRange: filters.timePeriod === "all" ? "All Time" : 
                  filters.timePeriod === "Q1" ? "Q1 (Jan - Mar)" :
                  filters.timePeriod === "Q2" ? "Q2 (Apr - Jun)" :
                  filters.timePeriod === "Q3" ? "Q3 (Jul - Sep)" :
                  filters.timePeriod === "Q4" ? "Q4 (Oct - Dec)" :
                  filters.timePeriod === "current_year" ? "Current Year" : "All Time"
      };
      
      console.log("PDF Data:", pdfData); // Debug log
      
      const pdf = generatePDFReport(pdfData);
      pdf.save(`teamlight-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF report generated successfully");
    } catch (error) {
      console.error("PDF Generation Error:", error); // Debug log
      toast.error(`Failed to generate PDF report: ${error.message || 'Unknown error'}`);
    }
  };

  // Show login form if not authenticated
  if (!userRole) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  TeamLight
                </h1>
                <p className="text-sm text-muted-foreground">
                  Team Performance Analytics
                  {lastRefresh && (
                    <span className="ml-2 text-xs">
                      • Last updated: {new Date(lastRefresh).toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={refreshData}
                className="gap-2"
                title="Refresh data from server"
                disabled={isRefreshing}
              >
                <RotateCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              
              <Button
                variant="outline"
                onClick={handleClearData}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
                Clear Data
              </Button>
              
              <ThemeToggle />
              
              {/* User info and logout */}
              <div className="flex items-center gap-2">
                <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                  {userRole === 'admin' ? 'Admin' : 'User'}
                </Badge>
                <span className="text-sm text-muted-foreground">{username}</span>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Logout
                </Button>
              </div>
              
              {/* Admin button - only show for admin users */}
              {userRole === 'admin' && (
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/admin'}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Admin
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <FilterSidebar
              projects={projects}
              sprints={sprints}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Time Period Filter */}
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileDown className="h-4 w-4" />
                    {filters.timePeriod === "all" ? "All Time" : 
                     filters.timePeriod === "Q1" ? "Q1 (Jan - Mar)" :
                     filters.timePeriod === "Q2" ? "Q2 (Apr - Jun)" :
                     filters.timePeriod === "Q3" ? "Q3 (Jul - Sep)" :
                     filters.timePeriod === "Q4" ? "Q4 (Oct - Dec)" :
                     filters.timePeriod === "current_year" ? "Current Year" : "All Time"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Time Period</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={filters.timePeriod}
                    onValueChange={handleTimePeriodChange}
                  >
                    <DropdownMenuRadioItem value="all">All Time</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="Q1">Q1 (Jan - Mar)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="Q2">Q2 (Apr - Jun)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="Q3">Q3 (Jul - Sep)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="Q4">Q4 (Oct - Dec)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="current_year">Current Year</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* KPI Cards */}
            <KPICards data={kpiData} excludedCount={excludedCount} />

            {/* Alerts */}
            <AlertsBar alerts={alerts} />

            {/* Function Performance */}
            <FunctionPerformance tickets={filteredTickets} selectedFunction={filters.selectedFunction} selectedProject={filters.selectedProject} />

            {/* Utilization Trendline */}
            <div className="mt-6">
              <UtilizationTrendline 
                tickets={filteredTickets} 
                selectedFunction={filters.selectedFunction}
                timePeriod={filters.timePeriod}
              />
            </div>

            <div className="mt-6">
              <Heatmap data={heatmapData} title="Project × Sprint Heatmap" />
            </div>
 
            {/* Feature Timeline */}
            <div className="mt-6">
              <FeatureTimeline tickets={tickets} filters={filters} />
            </div>

            {/* Top Contributors - Moved to bottom */}
            <div className="mt-6">
              <TopContributors metrics={assigneeMetrics} tickets={filteredTickets} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

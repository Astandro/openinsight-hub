import { useState, useMemo, useEffect } from "react";
import { parseCSV } from "@/lib/csvParser";
import { loadSampleData } from "@/lib/sampleData";
import { calculateAssigneeMetrics, calculateEnhancedMetrics, calculateFunctionMetrics, applyFilters } from "@/lib/metrics";
import { ParsedTicket, Filters, FunctionType, Thresholds } from "@/types/openproject";
import { loadThresholds, saveThresholds } from "@/lib/thresholds";
import { generateAlerts } from "@/lib/alerts";
import { FUNCTIONS } from "@/lib/constants";
import { FilterSidebar } from "@/components/Dashboard/FilterSidebar";
import { KPICards } from "@/components/Dashboard/KPICards";
import { FunctionPerformance } from "@/components/Dashboard/FunctionPerformance";
import { TopContributors } from "@/components/Dashboard/TopContributors";
import { AlertsBar } from "@/components/Dashboard/AlertsBar";
import { Heatmap, type HeatmapDatum } from "@/components/Dashboard/Heatmap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, RefreshCw, Settings, LogIn, Download, X } from "lucide-react";
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
    selectedFunctions: [],
    selectedProjects: [],
    selectedSprints: [],
    timePeriod: "all",
    includeAllStatuses: false,
  });
  const [thresholds, setThresholds] = useState<Thresholds>(loadThresholds());
  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    const loadDataFromServer = async () => {
      try {
        const serverData = await fetchData();
        
        if (serverData.tickets && serverData.tickets.length > 0) {
          setTickets(serverData.tickets);
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
      } catch (error) {
        console.error('Failed to load data from server:', error);
        // Fallback to sample data
        const sampleData = loadSampleData();
        setTickets(sampleData);
      }

      // Check authentication and user role
      if (isAuthenticated()) {
        setUserRole(getUserRole());
        setUsername(localStorage.getItem('teamlight_username') || '');
      }
    };

    loadDataFromServer();
  }, []);

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
    const metrics = assignees.map((assignee) => calculateAssigneeMetrics(filteredTickets, assignee));
    return calculateEnhancedMetrics(metrics, thresholds, filteredTickets);
  }, [filteredTickets, thresholds]);

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
        bugRate: 0,
        avgUtilization: 0,
      };
    }
    
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
      selectedFunctions: [],
      selectedProjects: [],
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
                  filters.timePeriod === "1q" ? "Last 1Q" :
                  filters.timePeriod === "2q" ? "Last 2Q" :
                  filters.timePeriod === "3q" ? "Last 3Q" :
                  filters.timePeriod === "4q" ? "Last 4Q" : "All Time"
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
                <p className="text-sm text-muted-foreground">Team Performance Analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
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
              functions={FUNCTIONS}
              projects={projects}
              sprints={sprints}
              filters={filters}
              onFiltersChange={setFilters}
              onFileUpload={handleFileUpload}
              onLoadSample={handleLoadSample}
              onReset={handleReset}
              isAdmin={isAdmin}
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
                     filters.timePeriod === "1q" ? "Last 1Q" :
                     filters.timePeriod === "2q" ? "Last 2Q" :
                     filters.timePeriod === "3q" ? "Last 3Q" :
                     filters.timePeriod === "4q" ? "Last 4Q" : "All Time"}
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
                    <DropdownMenuRadioItem value="1q">Last 1Q</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="2q">Last 2Q</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="3q">Last 3Q</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="4q">Last 4Q</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* KPI Cards */}
            <KPICards data={kpiData} excludedCount={excludedCount} />

            {/* Alerts */}
            <AlertsBar alerts={alerts} />

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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

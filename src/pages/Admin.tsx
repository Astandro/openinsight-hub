import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  Settings, 
  Save, 
  Download, 
  LogOut, 
  FileText, 
  Users, 
  BarChart3,
  Shield,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { parseCSV } from "@/lib/csvParser";
import { loadSampleData } from "@/lib/sampleData";
import { fetchData, saveData as saveDataToAPI, clearData } from "@/lib/apiService";
import { logout, isAuthenticated, getUserRole, verifySession } from "@/lib/serverAuth";
import { Thresholds } from "@/types/openproject";

export const Admin = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [settings, setSettings] = useState<Thresholds>({
    topPerformerZ: 1.0,
    lowPerformerZ: -1.0,
    highBugRate: 0.2,
    highReviseRate: 0.3,
    underutilizedThreshold: 0.6,
    activeWeeksThreshold: 0.7,
    storyPointsWeight: 0.5,
    ticketCountWeight: 0.25,
    projectVarietyWeight: 0.25,
    reviseRatePenalty: 0.8,
    bugRatePenalty: 0.5
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Check if user is authenticated and has admin role
    if (!isAuthenticated() || getUserRole() !== 'admin') {
      window.location.href = '/';
      return;
    }
    setIsAuthorized(true);

    // Load existing data from server
    const loadDataFromServer = async () => {
      try {
        const serverData = await fetchData();
        
        if (serverData.tickets && serverData.tickets.length > 0) {
          setTickets(serverData.tickets);
        }
        
        if (serverData.thresholds) {
          setSettings({ ...settings, ...serverData.thresholds });
        }
      } catch (error) {
        console.error('Failed to load data from server:', error);
      }
    };

    loadDataFromServer();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const parsedTickets = parseCSV(text);
      setTickets(parsedTickets);
      
      // Save to server
      const result = await saveDataToAPI({ tickets: parsedTickets });
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `🎉 Successfully uploaded ${parsedTickets.length} tickets to server!` 
        });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to parse CSV file' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setIsLoading(true);
    try {
      const sampleTickets = loadSampleData();
      setTickets(sampleTickets);
      
      // Save to server
      const result = await saveDataToAPI({ tickets: sampleTickets });
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `🎉 Loaded ${sampleTickets.length} sample tickets to server!` 
        });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load sample data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const result = await saveDataToAPI({ thresholds: settings });
      if (result.success) {
        setMessage({ type: 'success', text: '🎉 Settings saved to server successfully!' });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleClearData = async () => {
    try {
      const result = await clearData();
      if (result.success) {
        setTickets([]);
        setMessage({ type: 'success', text: '🎉 Data cleared from server successfully!' });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear data' });
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  TeamLight Admin
                </h1>
                <p className="text-sm text-muted-foreground">Data Management & Settings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => window.location.href = '/'} className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClearData} 
                className="gap-2 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
                Clear Data
              </Button>
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Management */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Upload CSV files or load sample data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-upload">Upload CSV File</Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Load Sample Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Use demo data for testing
                      </p>
                    </div>
                    <Button onClick={handleLoadSample} disabled={isLoading}>
                      <Download className="h-4 w-4 mr-2" />
                      Load Sample
                    </Button>
                  </div>
                </div>

                {tickets.length > 0 && (
                  <div className="p-4 bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">Data Status</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tickets.length} tickets loaded
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Performance Settings
                </CardTitle>
                <CardDescription>
                  Configure performance thresholds and weights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Performance Thresholds */}
                <div className="space-y-4">
                  <h4 className="font-medium">Performance Thresholds</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="topPerformer">Top Performer Z-Score</Label>
                      <Input
                        id="topPerformer"
                        type="number"
                        step="0.1"
                        value={settings.topPerformerZ}
                        onChange={(e) => setSettings({...settings, topPerformerZ: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lowPerformer">Low Performer Z-Score</Label>
                      <Input
                        id="lowPerformer"
                        type="number"
                        step="0.1"
                        value={settings.lowPerformerZ}
                        onChange={(e) => setSettings({...settings, lowPerformerZ: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Quality Thresholds */}
                <div className="space-y-4">
                  <h4 className="font-medium">Quality Thresholds</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="highBugRate">High Bug Rate</Label>
                      <Input
                        id="highBugRate"
                        type="number"
                        step="0.01"
                        value={settings.highBugRate}
                        onChange={(e) => setSettings({...settings, highBugRate: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="highReviseRate">High Revise Rate</Label>
                      <Input
                        id="highReviseRate"
                        type="number"
                        step="0.01"
                        value={settings.highReviseRate}
                        onChange={(e) => setSettings({...settings, highReviseRate: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Performance Weights */}
                <div className="space-y-4">
                  <h4 className="font-medium">Performance Weights</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="storyPointsWeight">Story Points</Label>
                      <Input
                        id="storyPointsWeight"
                        type="number"
                        step="0.01"
                        value={settings.storyPointsWeight}
                        onChange={(e) => setSettings({...settings, storyPointsWeight: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticketCountWeight">Ticket Count</Label>
                      <Input
                        id="ticketCountWeight"
                        type="number"
                        step="0.01"
                        value={settings.ticketCountWeight}
                        onChange={(e) => setSettings({...settings, ticketCountWeight: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="projectVarietyWeight">Project Variety</Label>
                      <Input
                        id="projectVarietyWeight"
                        type="number"
                        step="0.01"
                        value={settings.projectVarietyWeight}
                        onChange={(e) => setSettings({...settings, projectVarietyWeight: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveSettings} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Admin;

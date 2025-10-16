import { useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Filters, FunctionType } from "@/types/openproject";
import { motion } from "framer-motion";

interface FilterSidebarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  projects: string[];
  sprints: string[];
}

const FUNCTIONS: FunctionType[] = [
  "BE", "FE", "QA", "DESIGNER", "PRODUCT", "INFRA",
  "BUSINESS SUPPORT", "RESEARCHER", "FOUNDRY", "UX WRITER"
];

export const FilterSidebar = ({
  filters,
  onFiltersChange,
  projects,
  sprints,
}: FilterSidebarProps) => {
  const handleReset = () => {
    onFiltersChange({
      searchAssignee: "",
      selectedProject: null,
      selectedFunction: null,
      timePeriod: "all",
      selectedSprints: [],
      includeAllStatuses: false,
    });
  };

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-80 border-r border-border/60 bg-gradient-to-b from-card/90 to-card/70 backdrop-blur-sm h-screen sticky top-0 shadow-lg"
    >
      <div className="p-6 border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            <Filter className="h-5 w-5" />
            Filters
          </h2>
          <Button variant="ghost" size="sm" onClick={handleReset} className="hover:bg-destructive/10 hover:text-destructive transition-colors">
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-6 space-y-6">
          {/* Search Assignee */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground/90">Search Assignee</Label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Type name..."
                value={filters.searchAssignee}
                onChange={(e) =>
                  onFiltersChange({ ...filters, searchAssignee: e.target.value })
                }
                className="pl-9 border-border/60 focus:border-primary/60 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
          </div>

          <Separator className="bg-border/40" />

          {/* Status Mode */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/40 hover:bg-secondary/30 transition-colors">
            <Label htmlFor="status-mode" className="text-sm font-medium cursor-pointer">Include All Statuses</Label>
            <Switch
              id="status-mode"
              checked={filters.includeAllStatuses}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, includeAllStatuses: checked })
              }
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <Separator className="bg-border/40" />

          {/* Time Period moved to header dropdown */}

          <Separator />

          {/* Project */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground/90">Project</Label>
            <RadioGroup
              value={filters.selectedProject || ""}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  selectedProject: value === "" ? null : value,
                })
              }
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                  <RadioGroupItem value="" id="project-all" className="text-primary" />
                  <Label htmlFor="project-all" className="cursor-pointer text-sm font-medium">All Projects</Label>
                </div>
                {projects.map((project) => (
                  <div key={project} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                    <RadioGroupItem value={project} id={`project-${project}`} className="text-primary" />
                    <Label htmlFor={`project-${project}`} className="cursor-pointer text-sm">
                      {project}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Function */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground/90">Function</Label>
            <RadioGroup
              value={filters.selectedFunction || ""}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  selectedFunction: value === "" ? null : (value as FunctionType),
                })
              }
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                  <RadioGroupItem value="" id="func-all" className="text-primary" />
                  <Label htmlFor="func-all" className="cursor-pointer text-sm font-medium">All Functions</Label>
                </div>
                {FUNCTIONS.map((func) => (
                  <div key={func} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                    <RadioGroupItem value={func} id={`func-${func}`} className="text-primary" />
                    <Label htmlFor={`func-${func}`} className="cursor-pointer text-sm">
                      {func}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

        </div>
      </ScrollArea>
    </motion.div>
  );
};

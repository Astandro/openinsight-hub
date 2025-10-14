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
  "BUSINESS SUPPORT", "RESEARCHER", "PRINCIPAL", "COORDINATOR", "UX WRITER"
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
      className="w-80 border-r border-border bg-card/50 backdrop-blur h-screen sticky top-0"
    >
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </h2>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-6 space-y-6">
          {/* Search Assignee */}
          <div>
            <Label className="mb-2 block">Search Assignee</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type name..."
                value={filters.searchAssignee}
                onChange={(e) =>
                  onFiltersChange({ ...filters, searchAssignee: e.target.value })
                }
                className="pl-9"
              />
            </div>
          </div>

          <Separator />

          {/* Status Mode */}
          <div className="flex items-center justify-between">
            <Label htmlFor="status-mode">Include All Statuses</Label>
            <Switch
              id="status-mode"
              checked={filters.includeAllStatuses}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, includeAllStatuses: checked })
              }
            />
          </div>

          <Separator />

          {/* Time Period */}
          <div>
            <Label className="mb-3 block">Time Period</Label>
            <RadioGroup
              value={filters.timePeriod}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, timePeriod: value as any })
              }
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1q" id="1q" />
                  <Label htmlFor="1q" className="cursor-pointer">Last 1 Quarter</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2q" id="2q" />
                  <Label htmlFor="2q" className="cursor-pointer">Last 2 Quarters</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3q" id="3q" />
                  <Label htmlFor="3q" className="cursor-pointer">Last 3 Quarters</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="cursor-pointer">All Time</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Project */}
          <div>
            <Label className="mb-3 block">Project</Label>
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
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="" id="project-all" />
                  <Label htmlFor="project-all" className="cursor-pointer">All Projects</Label>
                </div>
                {projects.map((project) => (
                  <div key={project} className="flex items-center space-x-2">
                    <RadioGroupItem value={project} id={`project-${project}`} />
                    <Label htmlFor={`project-${project}`} className="cursor-pointer">
                      {project}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Function */}
          <div>
            <Label className="mb-3 block">Function</Label>
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
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="" id="func-all" />
                  <Label htmlFor="func-all" className="cursor-pointer">All Functions</Label>
                </div>
                {FUNCTIONS.map((func) => (
                  <div key={func} className="flex items-center space-x-2">
                    <RadioGroupItem value={func} id={`func-${func}`} />
                    <Label htmlFor={`func-${func}`} className="cursor-pointer text-sm">
                      {func}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Sprints */}
          <div>
            <Label className="mb-3 block">Sprints</Label>
            <div className="space-y-2">
              {sprints.map((sprint) => (
                <div key={sprint} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sprint-${sprint}`}
                    checked={filters.selectedSprints.includes(sprint)}
                    onCheckedChange={(checked) => {
                      const updated = checked
                        ? [...filters.selectedSprints, sprint]
                        : filters.selectedSprints.filter((s) => s !== sprint);
                      onFiltersChange({ ...filters, selectedSprints: updated });
                    }}
                  />
                  <Label htmlFor={`sprint-${sprint}`} className="cursor-pointer text-sm">
                    {sprint}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
};

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, Building, Target, Clock, CalendarIcon, Star } from "lucide-react";
import { ParsedTicket, Filters } from "@/types/openproject";
import { applyFilters } from "@/lib/metrics";

interface FeatureTimelineProps {
  tickets: ParsedTicket[];
  filters: Filters;
}

interface TimelineFeature {
  id: string;
  title: string;
  assignees: string[]; // Multiple assignees who worked on this feature
  assigneesByFunction: Record<string, string[]>; // Assignees grouped by function
  project: string;
  totalStoryPoints: number;
  startDate: Date;
  endDate: Date;
  duration: number; // in days
  ticketCount: number; // Number of tickets merged
}

const getFeatureColor = (index: number) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500", 
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-red-500"
  ];
  return colors[index % colors.length];
};

const getMonthName = (month: number) => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return months[month];
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getDaysBetween = (start: Date, end: Date) => {
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Memoized feature row component for better performance
const FeatureRow = React.memo(({ 
  feature, 
  index
}: { 
  feature: TimelineFeature; 
  index: number; 
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="h-12 flex items-center px-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors w-[400px]">
          <div className="flex flex-col gap-0.5 w-full overflow-hidden">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className={`w-3 h-3 rounded-full ${getFeatureColor(index)} flex-shrink-0`} />
              <span className="text-sm font-medium truncate" title={feature.title}>
                {feature.title}
              </span>
            </div>
            <span className="text-xs text-muted-foreground pl-5 truncate" title={`${feature.project} • ${Object.entries(feature.assigneesByFunction).map(([func, assignees]) => `${assignees.length} ${func}`).join(', ')}`}>
              {feature.project} • {Object.entries(feature.assigneesByFunction).map(([func, assignees]) => 
                `${assignees.length} ${func}`
              ).join(', ')}
            </span>
          </div>
        </div>
      </PopoverTrigger>
      
       <PopoverContent className="w-96" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-lg">{feature.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{feature.project}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Contributors</p>
                <p className="text-sm font-medium">{feature.assignees.length}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tickets</p>
                <p className="text-sm font-medium">{feature.ticketCount}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total SP</p>
                <p className="text-sm font-medium">{feature.totalStoryPoints} SP</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-medium">{feature.duration} days</p>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Timeline</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-medium">{feature.startDate.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-medium">{feature.endDate.toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          {/* Contributors List */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-2">All Contributors:</p>
            <div className="flex flex-wrap gap-1">
              {feature.assignees.map(assignee => (
                <Badge key={assignee} variant="secondary" className="text-xs">
                  {assignee}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

FeatureRow.displayName = 'FeatureRow';

// Memoized timeline bar component
const TimelineBar = React.memo(({ 
  feature, 
  index, 
  months, 
  startDate, 
  totalDays
}: { 
  feature: TimelineFeature; 
  index: number; 
  months: any[]; 
  startDate: Date; 
  totalDays: number;
}) => {
  const barStyle = useMemo(() => {
    // Calculate offset from timeline start
    let startOffset = getDaysBetween(startDate, feature.startDate);
    let endOffset = getDaysBetween(startDate, feature.endDate);
    
    // Clamp to timeline bounds
    startOffset = Math.max(0, Math.min(startOffset, totalDays));
    endOffset = Math.max(0, Math.min(endOffset, totalDays));
    
    const width = endOffset - startOffset;
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${Math.max(0, width / totalDays) * 100}%`,
    };
  }, [feature.startDate, feature.endDate, startDate, totalDays]);

  return (
    <div className="relative h-12">
      {/* Timeline Bar */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-8 overflow-visible">
        {/* Feature Bar */}
        <motion.div
          className={`absolute top-0 h-full ${getFeatureColor(index)} opacity-80 hover:opacity-100 transition-opacity rounded-sm`}
          style={{
            ...barStyle,
            transformOrigin: "left"
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: index * 0.05 + 0.1, duration: 0.3 }}
        />
        
        {/* Bar Label */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 text-xs font-medium text-white mix-blend-difference pointer-events-none"
          style={{
            left: barStyle.left,
            width: barStyle.width,
          }}
        >
          <div className="text-center truncate px-1">
            {feature.duration}d • {feature.totalStoryPoints}SP
          </div>
        </div>
      </div>
    </div>
  );
});

TimelineBar.displayName = 'TimelineBar';

export const FeatureTimeline = ({ tickets, filters }: FeatureTimelineProps) => {
  // State for pagination
  const [visibleCount, setVisibleCount] = useState(50);
  const ITEMS_PER_PAGE = 50;

  // Group features by name and merge them - memoized for performance
  const timelineFeatures: TimelineFeature[] = useMemo(() => {
    const featureMap = new Map<string, TimelineFeature>();
    
    // Step 1: Build a map of all Feature tickets by ID for efficient lookups
    // A Feature is identified by normalizedType === "Feature"
    // Note: Features might have parentId pointing to themselves in some export formats
    const allFeatureTickets = new Map<string, ParsedTicket>();
    tickets.forEach(t => {
      if (t.normalizedType === "Feature") {
        allFeatureTickets.set(t.id, t);
      }
    });
    
    // Step 2: Find ALL child tickets (tickets with parentId pointing to a Feature)
    // A ticket is a "child" if it has parentId AND that parentId points to a Feature
    const allChildTickets = tickets.filter(t => {
      if (!t.parentId || !t.closedDate) return false;
      // The parent should be a Feature ticket
      return allFeatureTickets.has(t.parentId);
    });
    const filteredChildTickets = applyFilters(allChildTickets, filters);
    
    // Step 3: Identify which FEATURES have at least one filtered child ticket
    const featuresWithFilteredChildren = new Set<string>();
    filteredChildTickets.forEach(child => {
      if (child.parentId) {
        featuresWithFilteredChildren.add(child.parentId);
      }
    });
    
    // Step 4: Get ALL FEATURE-level tickets that have filtered children
    // Also apply project filter to features if set
    const relevantFeatures = tickets.filter(t => {
      const isFeature = t.normalizedType === "Feature" && t.closedDate;
      const hasFilteredChildren = featuresWithFilteredChildren.has(t.id);
      const matchesProject = !filters.selectedProject || t.project === filters.selectedProject;
      return isFeature && hasFilteredChildren && matchesProject;
    });
    
    // Create feature entries grouped by TITLE (not ID)
    relevantFeatures.forEach(feature => {
      const featureName = feature.title.trim();
      
      if (featureMap.has(featureName)) {
        // Merge with existing feature with same name
        const existing = featureMap.get(featureName)!;
        // Update date range to earliest/latest
        if (feature.createdDate < existing.startDate) {
          existing.startDate = feature.createdDate;
        }
        if (feature.closedDate! > existing.endDate) {
          existing.endDate = feature.closedDate!;
        }
      } else {
        // Create new entry
        featureMap.set(featureName, {
          id: feature.id,
          title: featureName,
          assignees: [], // Will be populated from child tickets
          assigneesByFunction: {},
          project: feature.project,
          totalStoryPoints: 0, // Will calculate from children only
          startDate: feature.createdDate,
          endDate: feature.closedDate!,
          duration: 0,
          ticketCount: 0, // Will count children only
        });
      }
    });
    
    // Now aggregate child tickets to their parent features
    // Need to find the feature by looking up the parent and getting its name
    filteredChildTickets.forEach(ticket => {
      // Find the parent feature
      const parentFeature = tickets.find(t => t.id === ticket.parentId);
      if (!parentFeature) return;
      
      const featureName = parentFeature.title.trim();
      
      if (featureMap.has(featureName)) {
        const featureEntry = featureMap.get(featureName)!;
        
        // Add assignee if not already in list
        if (!featureEntry.assignees.includes(ticket.assignee)) {
          featureEntry.assignees.push(ticket.assignee);
        }
        
        // Track assignees by function
        if (!featureEntry.assigneesByFunction[ticket.function]) {
          featureEntry.assigneesByFunction[ticket.function] = [];
        }
        if (!featureEntry.assigneesByFunction[ticket.function].includes(ticket.assignee)) {
          featureEntry.assigneesByFunction[ticket.function].push(ticket.assignee);
        }
        
        // Add story points from child ticket (User Story, Bug, etc.)
        featureEntry.totalStoryPoints += ticket.storyPoints;
        
        // Increment ticket count
        featureEntry.ticketCount += 1;
        
        // Update date range: earliest createdDate, latest closedDate
        if (ticket.createdDate < featureEntry.startDate) {
          featureEntry.startDate = ticket.createdDate;
        }
        if (ticket.closedDate > featureEntry.endDate) {
          featureEntry.endDate = ticket.closedDate;
        }
      }
    });
    
    // Recalculate durations after merging
    const mergedFeatures = Array.from(featureMap.values());
    mergedFeatures.forEach(feature => {
      feature.duration = getDaysBetween(feature.startDate, feature.endDate);
    });
    
    return mergedFeatures.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [tickets, filters]);

  // Calculate timeline bounds based on timePeriod filter - memoized
  const { startDate, endDate, months, totalDays } = useMemo(() => {
    if (timelineFeatures.length === 0) {
      // Return default values when no features
      const now = new Date();
      return {
        startDate: now,
        endDate: now,
        months: [],
        totalDays: 0
      };
    }
    let calcStartDate: Date;
    let calcEndDate: Date;
    
    if (filters.timePeriod === "all") {
      // Use actual data bounds for "all"
      const allDates = timelineFeatures.flatMap(f => [f.startDate, f.endDate]);
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      calcStartDate = new Date(minDate);
      calcStartDate.setDate(calcStartDate.getDate() - 7);
      calcEndDate = new Date(maxDate);
      calcEndDate.setDate(calcEndDate.getDate() + 7);
    } else {
      // Use filter-based bounds
      // Get the year with the MOST features (not just max year)
      // This prevents issues when a few features spill into next year
      const yearCounts = new Map<number, number>();
      timelineFeatures.forEach(f => {
        // Count both start and end years
        const startYear = f.startDate.getFullYear();
        const endYear = f.endDate.getFullYear();
        yearCounts.set(startYear, (yearCounts.get(startYear) || 0) + 1);
        if (endYear !== startYear) {
          yearCounts.set(endYear, (yearCounts.get(endYear) || 0) + 1);
        }
      });
      
      // Find year with most features
      let dataYear = new Date().getFullYear();
      let maxCount = 0;
      yearCounts.forEach((count, year) => {
        if (count > maxCount) {
          maxCount = count;
          dataYear = year;
        }
      });
      
      if (filters.timePeriod === "current_year") {
        calcStartDate = new Date(dataYear, 0, 1); // January 1st
        calcEndDate = new Date(dataYear, 11, 31); // December 31st
      } else {
        // Quarterly filtering
        const quarterMap = {
          "Q1": { start: 0, end: 2 },   // Jan-Mar
          "Q2": { start: 3, end: 5 },   // Apr-Jun
          "Q3": { start: 6, end: 8 },   // Jul-Sep
          "Q4": { start: 9, end: 11 }   // Oct-Dec
        };
        
        const quarter = quarterMap[filters.timePeriod as keyof typeof quarterMap];
        if (quarter) {
          calcStartDate = new Date(dataYear, quarter.start, 1);
          calcEndDate = new Date(dataYear, quarter.end + 1, 0); // Last day of the quarter
        } else {
          // Fallback to data year
          calcStartDate = new Date(dataYear, 0, 1);
          calcEndDate = new Date(dataYear, 11, 31);
        }
      }
    }

    // Generate months for the timeline
    const calcMonths = [];
    const current = new Date(calcStartDate);
    current.setDate(1); // Start of month
    
    while (current <= calcEndDate) {
      calcMonths.push({
        year: current.getFullYear(),
        month: current.getMonth(),
        monthName: getMonthName(current.getMonth()),
        daysInMonth: getDaysInMonth(current.getFullYear(), current.getMonth())
      });
      current.setMonth(current.getMonth() + 1);
    }

    // Calculate total days in timeline
    const calcTotalDays = getDaysBetween(calcStartDate, calcEndDate);

    return {
      startDate: calcStartDate,
      endDate: calcEndDate,
      months: calcMonths,
      totalDays: calcTotalDays
    };
  }, [timelineFeatures, filters.timePeriod]);

  // Get visible features for performance
  const visibleFeatures = useMemo(() => {
    return timelineFeatures.slice(0, visibleCount);
  }, [timelineFeatures, visibleCount]);

  // Reset visible count when tickets or time period changes
  useEffect(() => {
    setVisibleCount(50);
  }, [tickets, filters]);

  const hasMore = visibleCount < timelineFeatures.length;
  
  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, timelineFeatures.length));
  };

  // Early return for no features - AFTER all hooks
  if (timelineFeatures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Feature Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No features found in the selected time period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Feature Timeline
          <Badge variant="secondary" className="ml-2">
            {visibleFeatures.length} of {timelineFeatures.length} features
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Timeline Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-muted-foreground">
              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {totalDays} days
            </div>
          </div>
          
          {/* Scrollable Timeline Container */}
          <div className="relative" key={`timeline-${filters.selectedFunction}-${filters.selectedProject}-${filters.timePeriod}`}>
            {/* Fixed Title Column */}
            <div className="absolute left-0 top-0 z-10 bg-background border-r border-border w-[400px]">
              <div className="h-8 flex items-center px-4 text-xs font-medium text-muted-foreground border-b border-border">
                Features
              </div>
              <div>
                {visibleFeatures.map((feature, index) => (
                  <FeatureRow
                    key={`${feature.title}-${index}`}
                    feature={feature}
                    index={index}
                  />
                ))}
              </div>
            </div>
            
            {/* Scrollable Timeline Area */}
            <div className="ml-[400px] overflow-x-auto">
              {/* Month Headers */}
              <div className="relative h-8 border-b border-border min-w-[600px]">
                {months.map((month, index) => {
                  const monthStart = new Date(month.year, month.month, 1);
                  const monthEnd = new Date(month.year, month.month + 1, 0);
                  const monthStartOffset = getDaysBetween(startDate, monthStart);
                  const monthWidth = getDaysBetween(monthStart, monthEnd);
                  
                  // Ensure we don't go beyond the timeline bounds
                  const adjustedStartOffset = Math.max(0, monthStartOffset);
                  const adjustedWidth = Math.min(monthWidth, totalDays - adjustedStartOffset);
                  
                  return (
                    <div
                      key={`${month.year}-${month.month}`}
                      className="absolute top-0 h-full border-r border-border/50 flex flex-col items-center justify-center"
                      style={{
                        left: `${(adjustedStartOffset / totalDays) * 100}%`,
                        width: `${(adjustedWidth / totalDays) * 100}%`,
                      }}
                    >
                      <div className="text-xs font-medium text-center">
                        {month.monthName}
                      </div>
                      <div className="text-xs text-muted-foreground text-center">
                        {month.year}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Timeline Bars */}
              <div className="min-w-[600px]">
                {visibleFeatures.map((feature, index) => (
                  <TimelineBar
                    key={`${feature.title}-${index}`}
                    feature={feature}
                    index={index}
                    months={months}
                    startDate={startDate}
                    totalDays={totalDays}
                  />
                ))}
              </div>
            </div>
          </div>


          {/* Legend and Load More */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Features</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>Duration in days</span>
              </div>
            </div>
            
            {hasMore && (
              <Button 
                onClick={loadMore} 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                Load More ({timelineFeatures.length - visibleCount} remaining)
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
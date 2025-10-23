import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, Building, Target, Clock, CalendarIcon, Star } from "lucide-react";
import { ParsedTicket } from "@/types/openproject";

interface FeatureTimelineProps {
  tickets: ParsedTicket[];
  timePeriod?: string;
}

interface TimelineFeature {
  id: string;
  title: string;
  assignee: string;
  project: string;
  storyPoints: number;
  startDate: Date;
  endDate: Date;
  duration: number; // in days
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
        <div className="h-12 flex items-center px-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getFeatureColor(index)}`} />
            <span className="text-sm font-medium truncate max-w-[200px]">
              {feature.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {feature.project}
            </span>
          </div>
        </div>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-lg">{feature.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{feature.project}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Assignee</p>
                <p className="text-sm font-medium">{feature.assignee}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Project</p>
                <p className="text-sm font-medium">{feature.project}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Story Points</p>
                <p className="text-sm font-medium">{feature.storyPoints} SP</p>
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
    const startOffset = getDaysBetween(startDate, feature.startDate);
    const width = getDaysBetween(feature.startDate, feature.endDate);
    
    const adjustedStartOffset = Math.max(0, startOffset);
    const adjustedWidth = Math.min(width, totalDays - adjustedStartOffset);
    
    return {
      left: `${(adjustedStartOffset / totalDays) * 100}%`,
      width: `${(adjustedWidth / totalDays) * 100}%`,
    };
  }, [feature.startDate, feature.endDate, startDate, totalDays]);

  return (
    <div className="relative h-12 border-b border-border/50">
      {/* Timeline Bar */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-6 rounded-md overflow-hidden">
        {/* Timeline Grid Background */}
        <div className="absolute inset-0 bg-muted/10">
          {months.map((month) => {
            const monthStart = new Date(month.year, month.month, 1);
            const monthStartOffset = getDaysBetween(startDate, monthStart);
            const monthWidth = getDaysInMonth(month.year, month.month);
            const monthWidthPercent = (monthWidth / totalDays) * 100;
            const monthStartPercent = (monthStartOffset / totalDays) * 100;
            
            return (
              <div
                key={`grid-${month.year}-${month.month}`}
                className="absolute top-0 h-full border-r border-border/30"
                style={{
                  left: `${monthStartPercent}%`,
                  width: `${monthWidthPercent}%`,
                }}
              />
            );
          })}
        </div>
        
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
            {feature.duration}d
          </div>
        </div>
      </div>
    </div>
  );
});

TimelineBar.displayName = 'TimelineBar';

export const FeatureTimeline = ({ tickets, timePeriod = "all" }: FeatureTimelineProps) => {
  // State for pagination
  const [visibleCount, setVisibleCount] = useState(50);
  const ITEMS_PER_PAGE = 50;
  
  // Filter for features only (type: "Feature") and exclude certain keywords
  const features = useMemo(() => tickets.filter(ticket => {
    if (ticket.type !== "Feature") return false;
    
    const title = ticket.title.toLowerCase();
    const subject = ticket.subject.toLowerCase();
    const excludeKeywords = ['bug', 'iteration', 'improvement', 'operation'];
    
    return !excludeKeywords.some(keyword => 
      title.includes(keyword) || subject.includes(keyword)
    );
  }), [tickets]);

  // Transform features to timeline format - memoized for performance
  const timelineFeatures: TimelineFeature[] = useMemo(() => features
    .filter(feature => feature.closedDate)
    .map(feature => ({
      id: feature.id,
      title: feature.title,
      assignee: feature.assignee,
      project: feature.project,
      storyPoints: feature.storyPoints,
      startDate: feature.createdDate,
      endDate: feature.closedDate!,
      duration: getDaysBetween(feature.createdDate, feature.closedDate!)
    }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime()), [features]);

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
    
    if (timePeriod === "all") {
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
      // Get the year from the actual data instead of current year
      const dataYear = timelineFeatures.length > 0 
        ? timelineFeatures[0].startDate.getFullYear() 
        : new Date().getFullYear();
      
      if (timePeriod === "current_year") {
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
        
        const quarter = quarterMap[timePeriod as keyof typeof quarterMap];
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
  }, [timelineFeatures, timePeriod]);

  // Get visible features for performance
  const visibleFeatures = useMemo(() => {
    return timelineFeatures.slice(0, visibleCount);
  }, [timelineFeatures, visibleCount]);

  // Reset visible count when tickets or time period changes
  useEffect(() => {
    setVisibleCount(50);
  }, [tickets, timePeriod]);

  const hasMore = visibleCount < timelineFeatures.length;
  
  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, timelineFeatures.length));
  };

  // Early return for no features - AFTER all hooks
  if (features.length === 0) {
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
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No features with valid dates found</p>
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
          <div className="relative">
            {/* Fixed Title Column */}
            <div className="absolute left-0 top-0 z-10 bg-background border-r border-border">
              <div className="h-8 flex items-center px-4 text-xs font-medium text-muted-foreground border-b border-border">
                Features
              </div>
              <div className="space-y-2">
                {visibleFeatures.map((feature, index) => (
                  <FeatureRow
                    key={feature.id}
                    feature={feature}
                    index={index}
                  />
                ))}
              </div>
            </div>
            
            {/* Scrollable Timeline Area */}
            <div className="ml-[300px] overflow-x-auto">
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
              <div className="space-y-2 min-w-[600px]">
                {visibleFeatures.map((feature, index) => (
                  <TimelineBar
                    key={feature.id}
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
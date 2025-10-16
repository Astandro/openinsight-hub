import jsPDF from 'jspdf';
import { AssigneeMetrics, FunctionMetrics, ParsedTicket } from '@/types/openproject';

interface PDFExportData {
  tickets: ParsedTicket[];
  assigneeMetrics: AssigneeMetrics[];
  functionMetrics: FunctionMetrics[];
  kpiData: {
    totalClosedTickets: number;
    totalStoryPoints: number;
    avgCycleTime: number;
    bugRate: number;
    avgUtilization: number;
  };
  dateRange: string;
}

export const generatePDFReport = (data: PDFExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Helper function to add page numbers
  const addPageNumber = (pageNum: number) => {
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 10);
  };

  // Helper function to add header
  const addHeader = (title: string) => {
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(title, 20, 30);
    doc.setLineWidth(0.5);
    doc.line(20, 35, pageWidth - 20, 35);
  };

  // Page 1: Cover Page
  doc.setFillColor(59, 130, 246); // Blue background
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Logo area
  doc.setFillColor(255, 255, 255);
  doc.rect(20, 50, 60, 60, 'F');
  doc.setFontSize(24);
  doc.setTextColor(59, 130, 246);
  doc.text('TeamLight', 30, 80);
  
  // Title
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text('Team Performance', 20, 150);
  doc.text('Analytics Report', 20, 170);
  
  // Subtitle
  doc.setFontSize(16);
  doc.text('Comprehensive Performance Analysis', 20, 200);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 220);
  doc.text(`Data Range: ${data.dateRange}`, 20, 240);
  
  // Stats summary
  doc.setFontSize(14);
  doc.text(`Total Tickets: ${data.kpiData.totalClosedTickets}`, 20, 280);
  doc.text(`Total Story Points: ${data.kpiData.totalStoryPoints}`, 20, 295);
  doc.text(`Average Cycle Time: ${data.kpiData.avgCycleTime.toFixed(1)} days`, 20, 310);
  
  addPageNumber(1);
  doc.addPage();

  // Page 2: Table of Contents
  addHeader('Table of Contents');
  
  doc.setFontSize(12);
  doc.text('1. Executive Summary', 20, 60);
  doc.text('2. Function Performance Analysis', 20, 80);
  doc.text('   - Backend Development (BE)', 30, 95);
  doc.text('   - Frontend Development (FE)', 30, 110);
  doc.text('   - Quality Assurance (QA)', 30, 125);
  doc.text('   - Other Functions', 30, 140);
  doc.text('3. Individual Contributor Analysis', 20, 160);
  doc.text('4. Project Distribution', 20, 180);
  doc.text('5. Recommendations', 20, 200);
  
  addPageNumber(2);
  doc.addPage();

  // Page 3: Executive Summary
  addHeader('Executive Summary');
  
  doc.setFontSize(12);
  doc.text('Key Performance Indicators:', 20, 60);
  
  // KPI Table
  const kpiY = 80;
  doc.setFontSize(10);
  doc.text('Metric', 20, kpiY);
  doc.text('Value', 120, kpiY);
  doc.line(20, kpiY + 5, 180, kpiY + 5);
  
  doc.text('Total Closed Tickets', 20, kpiY + 15);
  doc.text(data.kpiData.totalClosedTickets.toString(), 120, kpiY + 15);
  
  doc.text('Total Story Points', 20, kpiY + 25);
  doc.text(data.kpiData.totalStoryPoints.toString(), 120, kpiY + 25);
  
  doc.text('Average Cycle Time (days)', 20, kpiY + 35);
  doc.text(data.kpiData.avgCycleTime.toFixed(1), 120, kpiY + 35);
  
  doc.text('Bug Rate (%)', 20, kpiY + 45);
  doc.text((data.kpiData.bugRate * 100).toFixed(1), 120, kpiY + 45);
  
  doc.text('Average Utilization', 20, kpiY + 55);
  doc.text(data.kpiData.avgUtilization.toFixed(1), 120, kpiY + 55);
  
  // Summary insights
  doc.setFontSize(12);
  doc.text('Key Insights:', 20, kpiY + 80);
  
  const topPerformers = data.assigneeMetrics
    .filter(m => m.flags && m.flags.includes('top_performer'))
    .slice(0, 3);
  
  if (topPerformers.length > 0) {
    doc.setFontSize(10);
    doc.text(`• Top performers: ${topPerformers.map(p => p.assignee).join(', ')}`, 20, kpiY + 95);
  }
  
  const underutilized = data.assigneeMetrics
    .filter(m => m.flags && m.flags.includes('underutilized'));
  
  if (underutilized.length > 0) {
    doc.text(`• Underutilized team members: ${underutilized.length}`, 20, kpiY + 105);
  }
  
  addPageNumber(3);

  // Function-specific pages
  const functions = ['BE', 'FE', 'QA'];
  functions.forEach((func, index) => {
    doc.addPage();
    addHeader(`${func} Function Analysis`);
    
    const funcMetrics = data.functionMetrics.find(f => f.function === func);
    const funcAssignees = data.assigneeMetrics.filter(m => m.function === func);
    
    if (funcMetrics) {
      doc.setFontSize(12);
      doc.text('Function Overview:', 20, 60);
      
      doc.setFontSize(10);
      doc.text(`Team Size: ${funcMetrics.memberCount || 0}`, 20, 80);
      doc.text(`Total Story Points: ${funcMetrics.totalStoryPoints || 0}`, 20, 95);
      doc.text(`Average Cycle Time: ${(funcMetrics.avgCycleTimeDays || 0).toFixed(1)} days`, 20, 110);
      doc.text(`Bug Rate: ${((funcMetrics.bugRateClosed || 0) * 100).toFixed(1)}%`, 20, 125);
      doc.text(`Revise Rate: ${((funcMetrics.reviseRateClosed || 0) * 100).toFixed(1)}%`, 20, 140);
      
      // Top performers in this function
      const topInFunction = funcAssignees
        .filter(m => m.flags && m.flags.includes('top_performer'))
        .slice(0, 3);
      
      if (topInFunction.length > 0) {
        doc.setFontSize(12);
        doc.text('Top Performers:', 20, 170);
        doc.setFontSize(10);
        topInFunction.forEach((performer, i) => {
          doc.text(`${i + 1}. ${performer.assignee || 'Unknown'} (${(performer.effectiveStoryPoints || 0).toFixed(0)} SP)`, 30, 185 + (i * 10));
        });
      }
      
      // Performance distribution
      doc.setFontSize(12);
      doc.text('Performance Distribution:', 20, 220);
      doc.setFontSize(10);
      
      const topCount = funcAssignees.filter(m => m.flags && m.flags.includes('top_performer')).length;
      const lowCount = funcAssignees.filter(m => m.flags && m.flags.includes('low_performer')).length;
      const underutilizedCount = funcAssignees.filter(m => m.flags && m.flags.includes('underutilized')).length;
      
      doc.text(`Top Performers: ${topCount}`, 30, 235);
      doc.text(`Low Performers: ${lowCount}`, 30, 245);
      doc.text(`Underutilized: ${underutilizedCount}`, 30, 255);
    }
    
    addPageNumber(4 + index);
  });

  // Individual contributors page
  doc.addPage();
  addHeader('Individual Contributor Analysis');
  
  doc.setFontSize(12);
  doc.text('Top 10 Contributors:', 20, 60);
  
  const topContributors = data.assigneeMetrics
    .filter(m => m.performanceScore !== undefined && !isNaN(m.performanceScore))
    .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))
    .slice(0, 10);
  
  doc.setFontSize(10);
  doc.text('Rank', 20, 80);
  doc.text('Name', 40, 80);
  doc.text('Function', 100, 80);
  doc.text('Performance Score', 140, 80);
  doc.text('Effective SP', 180, 80);
  doc.line(20, 85, 200, 85);
  
  topContributors.forEach((contributor, index) => {
    const y = 95 + (index * 10);
    doc.text((index + 1).toString(), 20, y);
    doc.text(contributor.assignee || 'Unknown', 40, y);
    doc.text(contributor.function || 'Unknown', 100, y);
    doc.text((contributor.performanceScore || 0).toFixed(2), 140, y);
    doc.text((contributor.effectiveStoryPoints || 0).toFixed(0), 180, y);
  });
  
  addPageNumber(7);

  // Recommendations page
  doc.addPage();
  addHeader('Recommendations');
  
  doc.setFontSize(12);
  doc.text('Based on the analysis, here are our key recommendations:', 20, 60);
  
  doc.setFontSize(10);
  doc.text('1. Performance Optimization:', 20, 85);
  doc.text('   • Focus on reducing bug rates through better testing', 30, 100);
  doc.text('   • Implement code review processes to reduce revise rates', 30, 110);
  
  doc.text('2. Resource Allocation:', 20, 130);
  doc.text('   • Address underutilized team members with additional projects', 30, 145);
  doc.text('   • Provide training opportunities for low performers', 30, 155);
  
  doc.text('3. Process Improvements:', 20, 175);
  doc.text('   • Standardize sprint planning to improve cycle times', 30, 190);
  doc.text('   • Implement better project distribution strategies', 30, 200);
  
  doc.text('4. Team Development:', 20, 220);
  doc.text('   • Recognize and reward top performers', 30, 235);
  doc.text('   • Create mentorship programs for skill development', 30, 245);
  
  addPageNumber(8);

  return doc;
};

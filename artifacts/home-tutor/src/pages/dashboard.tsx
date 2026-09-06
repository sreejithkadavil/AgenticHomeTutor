import { useState } from "react";
import {
  useGetDashboard,
  getGetDashboardQueryKey
} from "@workspace/api-client-react";
import { useActiveStudent } from "@/hooks/use-active-student";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Flame, Target, Clock, Activity, ArrowRight, Lightbulb } from "lucide-react";
import { useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { student, isLoading: studentLoading } = useActiveStudent();
  const { data: dashboard, isLoading: dashboardLoading } = useGetDashboard({
    query: {
      enabled: !!student,
      queryKey: getGetDashboardQueryKey(),
    }
  });
  const [, setLocation] = useLocation();

  if (studentLoading || dashboardLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <Target className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome to Home Tutor</h2>
        <p className="text-muted-foreground mb-6">Set up your child's profile to get started with personalized learning.</p>
        <Button onClick={() => setLocation("/settings")}>Configure Profile</Button>
      </div>
    );
  }

  const handleFastStart = () => {
    const params = new URLSearchParams();
    if (dashboard?.weakArea) params.set("subject", dashboard.weakArea);
    setLocation(params.size ? `/study?${params}` : "/study");
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Overview</h1>
          <p className="text-muted-foreground mt-1">Here is how {student.name} is doing this week.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/10 text-secondary-foreground px-4 py-2 rounded-full font-medium shadow-sm">
            <Flame className="w-5 h-5 text-secondary" />
            {student.streak} Day Streak
          </div>
          <Button
            onClick={handleFastStart}
            className="rounded-full shadow-md gap-2 pl-4 pr-5 group"
          >
            <Brain className="w-4 h-4" />
            Start Session
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground border-transparent shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-primary-foreground/80 text-sm font-medium">Overall Mastery</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tighter">{Math.round((dashboard?.overallMastery ?? 0) * 100)}%</span>
                  <span className="text-sm font-medium text-accent">+{Math.round((dashboard?.masteryDelta ?? 0) * 100)}%</span>
                </div>
              </div>
              <div className="p-2 bg-primary-foreground/10 rounded-lg">
                <Target className="w-5 h-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">Study Time</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tighter">{dashboard?.studyMinutes}</span>
                  <span className="text-sm text-muted-foreground font-medium">min</span>
                </div>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">Sessions</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tighter">{dashboard?.sessionsThisWeek}</span>
                  <span className="text-sm text-muted-foreground font-medium">this week</span>
                </div>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-secondary/20 bg-secondary/5">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">Needs Review</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tighter text-secondary-foreground">{dashboard?.revisionDue}</span>
                  <span className="text-sm text-muted-foreground font-medium">topics</span>
                </div>
              </div>
              <div className="p-2 bg-background rounded-lg shadow-sm">
                <Lightbulb className="w-5 h-5 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Summary */}
        <Card className="lg:col-span-2 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Subject Mastery</CardTitle>
            <CardDescription>Progress across active curriculum areas</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            {dashboard?.subjectSummary.map(subject => (
              <div key={subject.subject} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="font-semibold">{subject.subject}</span>
                  <span className="text-sm font-medium text-muted-foreground">{Math.round(subject.mastery * 100)}%</span>
                </div>
                <Progress 
                  value={subject.mastery * 100} 
                  className="h-2.5 bg-muted" 
                  indicatorClassName="bg-primary rounded-full shadow-sm"
                  style={{ '--progress-color': subject.accent } as any}
                />
                <div className="flex gap-4 text-xs text-muted-foreground font-medium">
                  <span>{subject.objectiveCount} Objectives</span>
                  {subject.dueCount > 0 && <span className="text-secondary">{subject.dueCount} Due</span>}
                </div>
              </div>
            ))}
            {(!dashboard?.subjectSummary || dashboard.subjectSummary.length === 0) && (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
                No active subjects yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-1">
              {dashboard?.recentActivity.map((activity) => (
                <div key={activity.id} className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60">
                  <div className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-sm leading-5">{activity.title}</div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{activity.timeLabel}</span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{activity.detail}</div>
                  </div>
                </div>
              ))}
              {(!dashboard?.recentActivity || dashboard.recentActivity.length === 0) && (
                 <div className="text-center text-sm text-muted-foreground py-8">
                   No recent activity
                 </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

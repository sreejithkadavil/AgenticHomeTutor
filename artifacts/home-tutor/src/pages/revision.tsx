import { useActiveStudent } from "@/hooks/use-active-student";
import { getGetStudentRevisionQueryKey, useGetStudentRevision } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Brain, CalendarClock, Target, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Revision() {
  const { student } = useActiveStudent();
  const { data: revisions, isLoading } = useGetStudentRevision(student?.id || "", {
    query: {
      enabled: !!student,
      queryKey: getGetStudentRevisionQueryKey(student?.id || ""),
    }
  });
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const handleStartRevision = (subject: string, objectiveId: string) => {
    const params = new URLSearchParams({ subject, objectiveId });
    setLocation(`/study?${params}`);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Spaced Revision</h1>
        <p className="text-muted-foreground mt-1">Smart queue of topics needing reinforcement based on forgetting curves.</p>
      </div>

      <div className="space-y-4">
        {revisions && revisions.length > 0 ? (
          revisions.map((rev) => (
            <Card key={rev.id} className="shadow-sm border-l-4 overflow-hidden" style={{ borderLeftColor: 'hsl(var(--secondary))' }}>
              <CardContent className="p-0 flex flex-col md:flex-row items-stretch">
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={rev.daysUntil <= 0 ? "destructive" : "secondary"}>
                      {rev.dueLabel}
                    </Badge>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {rev.subject} • {rev.topic}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold leading-tight mb-2">{rev.objective}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                    <Target className="w-4 h-4 shrink-0 text-primary" />
                    <span>{rev.reason}</span>
                  </div>
                </div>
                <div className="bg-muted/30 p-6 flex flex-col justify-center border-t md:border-t-0 md:border-l border-border md:w-56 items-center text-center gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Current Mastery</div>
                    <div className="text-2xl font-bold tracking-tighter text-primary">{Math.round(rev.mastery * 100)}%</div>
                  </div>
                  <Button
                    className="w-full shadow-sm gap-2"
                    onClick={() => handleStartRevision(rev.subject, rev.objectiveId)}
                  >
                    <Brain className="w-4 h-4" />
                    Review Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 px-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
              <CalendarClock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">All caught up!</h3>
            <p className="text-muted-foreground max-w-sm">
              There are no topics scheduled for revision today. Great job keeping the mastery levels high.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

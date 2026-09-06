import { useActiveStudent } from "@/hooks/use-active-student";
import { getGetStudentMasteryQueryKey, useGetStudentMastery } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ProgressPage() {
  const { student } = useActiveStudent();
  const { data: masteryData, isLoading } = useGetStudentMastery(student?.id || "", {
    query: {
      enabled: !!student,
      queryKey: getGetStudentMasteryQueryKey(student?.id || ""),
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  // Group mastery by subject
  const subjects = masteryData?.reduce((acc, item) => {
    if (!acc[item.subject]) acc[item.subject] = [];
    acc[item.subject].push(item);
    return acc;
  }, {} as Record<string, typeof masteryData>) || {};

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Mastery Progress</h1>
        <p className="text-muted-foreground mt-1">Granular view of learning objectives.</p>
      </div>

      <div className="space-y-8">
        {Object.entries(subjects).map(([subject, items]) => (
          <div key={subject} className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight border-b border-border pb-2">{subject}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map(item => (
                <Card key={item.id} className="shadow-sm hover-elevate transition-all border-border overflow-hidden">
                  <div className="h-1.5 w-full" style={{ backgroundColor: item.color || "hsl(var(--primary))" }} />
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{item.topic}</div>
                        <h3 className="font-semibold leading-tight text-[15px]">{item.objective}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                        <span className="text-lg font-bold tracking-tighter">
                          {Math.round(item.mastery * 100)}%
                        </span>
                        {item.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {item.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                        {item.trend === 'steady' && <Minus className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                    
                    <Progress 
                      value={item.mastery * 100} 
                      className="h-2 mb-3 bg-muted"
                      indicatorClassName="rounded-full shadow-sm"
                      style={{ '--progress-color': item.color } as any} 
                    />
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      Last practiced {formatDistanceToNow(new Date(item.lastPracticed), { addSuffix: true })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {(!masteryData || masteryData.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            No mastery data available. Complete some study sessions first.
          </div>
        )}
      </div>
    </div>
  );
}

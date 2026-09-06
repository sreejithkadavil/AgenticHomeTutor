import { useState } from "react";
import { useActiveStudent } from "@/hooks/use-active-student";
import { getGetStudentMaterialsQueryKey, useGetStudentMaterials, useGetGmailStatus, useSyncGmail } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Inbox, RefreshCw, AlertCircle, CheckCircle2, FileStack } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Materials() {
  const { student } = useActiveStudent();
  const { data: materials, isLoading: materialsLoading } = useGetStudentMaterials(student?.id || "", {
    query: {
      enabled: !!student,
      queryKey: getGetStudentMaterialsQueryKey(student?.id || ""),
    }
  });
  
  const { data: gmailStatus, isLoading: gmailLoading } = useGetGmailStatus();
  const syncGmail = useSyncGmail();

  const handleSync = () => {
    syncGmail.mutate({
      data: { labels: ["INBOX", "School"] }
    });
  };

  if (materialsLoading || gmailLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const isConnected = gmailStatus?.connected;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">School Materials</h1>
          <p className="text-muted-foreground mt-1">Curriculum mapped directly from school emails and assignments.</p>
        </div>
      </div>

      {/* Gmail Integration Status */}
      <Card className={`border-2 ${isConnected ? 'border-primary/20 bg-primary/5' : 'border-dashed border-border'}`}>
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${isConnected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{isConnected ? 'School Emails Connected' : 'Connect School Emails'}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isConnected 
                  ? `Syncing from ${gmailStatus?.email}. Last synced ${gmailStatus?.lastSyncedAt ? formatDistanceToNow(new Date(gmailStatus.lastSyncedAt), { addSuffix: true }) : 'never'}.`
                  : 'Connect your parent email to automatically extract and map assignments, worksheets, and syllabus updates.'}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {isConnected ? (
              <Button 
                variant="outline" 
                onClick={handleSync}
                disabled={syncGmail.isPending || gmailStatus?.state === 'syncing'}
                className="gap-2 bg-background shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${syncGmail.isPending || gmailStatus?.state === 'syncing' ? 'animate-spin' : ''}`} />
                {gmailStatus?.state === 'syncing' ? 'Syncing...' : 'Sync Now'}
              </Button>
            ) : (
              <Button className="gap-2">
                Connect Gmail
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Materials List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Retrieved Materials</h2>
        
        {materials && materials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map(material => (
              <Card key={material.id} className="shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-tight group-hover:text-primary transition-colors">
                      {material.title}
                    </CardTitle>
                    <CardDescription className="text-xs font-medium">
                      Received {formatDistanceToNow(new Date(material.receivedAt), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <Badge variant={
                    material.status === 'mapped' ? 'default' : 
                    material.status === 'processing' ? 'secondary' : 'destructive'
                  } className="ml-2 shrink-0">
                    {material.status}
                  </Badge>
                </CardHeader>
                <CardContent className="pb-4 text-sm text-muted-foreground line-clamp-3 flex-1">
                  {material.preview}
                </CardContent>
                <CardFooter className="pt-0 flex items-center justify-between border-t border-border/50 bg-muted/20 px-6 py-3 mt-auto">
                  <div className="flex gap-2">
                    {material.subjects.map(sub => (
                      <Badge key={sub} variant="outline" className="text-[10px] bg-background">
                        {sub}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center text-xs font-medium text-muted-foreground gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {material.kind}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-muted/30 rounded-2xl border-2 border-dashed border-border flex flex-col items-center">
            <FileStack className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No materials found</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Once you connect your email, we'll automatically scan for school newsletters, homework PDFs, and reading materials.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

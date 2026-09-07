import { useState } from "react";
import { useListStudents, useCreateStudent } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Save, Mail } from "lucide-react";

export default function Settings() {
  const { data: students, isLoading } = useListStudents();
  const createStudent = useCreateStudent();
  const { toast } = useToast();

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: "", grade: "Grade 6", syllabus: "" });
  const [linkCode, setLinkCode] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createStudent.mutate({
      data: formData
    }, {
      onSuccess: () => {
        toast({ title: "Profile created", description: `${formData.name}'s profile is ready.` });
        setIsCreating(false);
        setFormData({ name: "", grade: "", syllabus: "" });
      }
    });
  };
  const generateLinkCode = async (studentId: string) => {
    const response = await fetch(`/api/students/${studentId}/link-code`, { method: "POST" });
    if (!response.ok) { toast({ title: "Could not create a link code", description: "Please try again.", variant: "destructive" }); return; }
    const data = await response.json() as { code: string };
    setLinkCode(data.code);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage family profiles and app connections.</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">Student Profiles</h2>
        
        <div className="grid gap-4">
          {students?.map(student => (
            <Card key={student.id} className="flex flex-row items-center p-6 gap-6 shadow-sm">
              <Avatar className="w-16 h-16 ring-4 ring-background shadow-md">
                <AvatarImage src={student.avatar} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">{student.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-bold">{student.name}</h3>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground font-medium">
                  <span>Grade {student.grade}</span>
                  <span>•</span>
                  <span>{student.syllabus}</span>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit Profile</Button>
              <Button variant="outline" size="sm" onClick={() => generateLinkCode(student.id)}>Generate Link Code</Button>
            </Card>
          ))}
          {linkCode && <Card className="border-primary/30 bg-primary/5 p-4"><CardTitle className="text-base">One-time student link code</CardTitle><p className="mt-2 font-mono text-lg tracking-wider text-primary">{linkCode}</p><CardDescription className="mt-2">Share this code privately. It is invalid immediately after one student redeems it or when you generate another code.</CardDescription></Card>}

          {!isCreating && (
            <Button 
              variant="outline" 
              className="h-20 border-dashed border-2 hover:border-primary/50 text-muted-foreground hover:text-foreground"
              onClick={() => setIsCreating(true)}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Add Student Profile
            </Button>
          )}

          {isCreating && (
            <Card className="border-primary/50 shadow-md">
              <form onSubmit={handleCreate}>
                <CardHeader>
                  <CardTitle className="text-lg">New Student Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">First Name</Label>
                    <Input id="name" required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="e.g. Leo" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grade">Grade Level</Label>
                      <Select value={formData.grade} onValueChange={value => setFormData(p => ({...p, grade: value}))}>
                        <SelectTrigger id="grade">
                          <SelectValue placeholder="Select a grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Grade 6">Grade 6</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Grade 6 is the only curriculum available right now.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="syllabus">Syllabus / Curriculum</Label>
                      <Input id="syllabus" required value={formData.syllabus} onChange={e => setFormData(p => ({...p, syllabus: e.target.value}))} placeholder="e.g. Common Core, IB" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                    <Button type="submit" disabled={createStudent.isPending} className="gap-2">
                      <Save className="w-4 h-4" />
                      Save Profile
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          )}
        </div>
      </div>
      
      <div className="pt-8 border-t border-border space-y-6">
        <h2 className="text-xl font-bold tracking-tight">Parent Account</h2>
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Parent Email</Label>
              <div className="flex gap-3">
                <Input value="parent@example.com" disabled />
                <Button variant="outline">Change</Button>
              </div>
              <p className="text-xs text-muted-foreground">Used for weekly reports and alerts.</p>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <div className="font-medium text-sm">Weekly Progress Report</div>
                  <div className="text-xs text-muted-foreground">Receive a summary of mastery every Friday.</div>
                </div>
                <div className="w-10 h-6 bg-primary rounded-full relative shadow-inner cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

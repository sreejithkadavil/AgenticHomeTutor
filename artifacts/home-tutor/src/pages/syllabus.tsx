import { useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetClass6Curriculum,
  useListCurriculumUploads,
  useCreateCurriculumUpload,
  useExtractCurriculumMaterialText,
  getListCurriculumUploadsQueryKey
} from "@workspace/api-client-react";
import { useActiveStudent } from "@/hooks/use-active-student";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Info, UploadCloud, FileText, CheckCircle2, AlertCircle, Library, BookOpen, Loader2, Brain } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function Syllabus() {
  const [activeTab, setActiveTab] = useState("curriculum");

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Syllabus & Curriculum</h1>
          <p className="text-muted-foreground mt-1">Browse school curriculum and import custom syllabi.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="curriculum">Browse Curriculum</TabsTrigger>
          <TabsTrigger value="import">Import Syllabus</TabsTrigger>
        </TabsList>
        <TabsContent value="curriculum" className="mt-0 outline-none">
          <CurriculumBrowser />
        </TabsContent>
        <TabsContent value="import" className="mt-0 outline-none">
          <SyllabusImport />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CurriculumBrowser() {
  const { data: curriculum, isLoading } = useGetClass6Curriculum();
  const { student } = useActiveStudent();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [selectedStrand, setSelectedStrand] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const handleStartSession = (subject: string, objectiveId: string) => {
    if (!student) {
      toast({
        title: "No student profile yet",
        description: "Set up a student profile in Settings before starting a session.",
        variant: "destructive",
      });
      return;
    }
    setLocation(`/study?${new URLSearchParams({ subject, objectiveId })}`);
  };

  const filteredObjectives = useMemo(() => {
    if (!curriculum) return [];
    return curriculum.objectives.filter(obj => {
      const matchSubject = selectedSubject === "All" || obj.subject === selectedSubject;
      const matchStrand = selectedStrand === "All" || obj.strand === selectedStrand;
      const matchSearch = obj.objective.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          obj.topic.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchStrand && matchSearch;
    });
  }, [curriculum, selectedSubject, selectedStrand, searchQuery]);

  // Handle subject change and reset strand
  const handleSubjectChange = (subjectName: string) => {
    setSelectedSubject(subjectName);
    setSelectedStrand("All");
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <div className="md:col-span-1 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="md:col-span-3 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load curriculum data.</AlertDescription>
      </Alert>
    );
  }

  const currentSubjectObj = curriculum.subjects.find(s => s.name === selectedSubject);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar Filters */}
      <div className="lg:col-span-1 space-y-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search objectives..." 
              className="pl-9 bg-card shadow-sm border-muted"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4 bg-card rounded-xl p-4 border border-card-border shadow-sm">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Subjects</h3>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => handleSubjectChange("All")}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                selectedSubject === "All" 
                  ? "bg-primary text-primary-foreground font-medium shadow-md" 
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <span>All Subjects</span>
              <Badge variant={selectedSubject === "All" ? "secondary" : "outline"} className="ml-2 font-mono text-xs">
                {curriculum.objectives.length}
              </Badge>
            </button>
            {curriculum.subjects.map(subject => (
              <button
                key={subject.name}
                onClick={() => handleSubjectChange(subject.name)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                  selectedSubject === subject.name 
                    ? "bg-primary text-primary-foreground font-medium shadow-md" 
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color || 'hsl(var(--primary))' }} />
                  <span>{subject.name}</span>
                </div>
                <Badge variant={selectedSubject === subject.name ? "secondary" : "outline"} className="ml-2 font-mono text-xs">
                  {subject.objectiveCount}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {currentSubjectObj && currentSubjectObj.strands.length > 0 && (
          <div className="space-y-4 bg-card rounded-xl p-4 border border-card-border shadow-sm">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Strands ({currentSubjectObj.name})</h3>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSelectedStrand("All")}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedStrand === "All" 
                    ? "bg-accent/20 text-accent-foreground font-medium" 
                    : "hover:bg-muted text-foreground"
                }`}
              >
                All Strands
              </button>
              {currentSubjectObj.strands.map(strand => (
                <button
                  key={strand}
                  onClick={() => setSelectedStrand(strand)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedStrand === strand 
                      ? "bg-accent/20 text-accent-foreground font-medium" 
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {strand}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 md:items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
              <Library className="w-4 h-4" />
              <span>{curriculum.school}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{curriculum.name}</h2>
            <div className="flex gap-4 text-sm text-muted-foreground mt-2">
              <span>{curriculum.grade}</span>
              <span>•</span>
              <span>{curriculum.academicYear}</span>
              <span>•</span>
              <span>{curriculum.pathway}</span>
            </div>
          </div>
        </div>

        {(curriculum.stageNote || curriculum.sourceNote) && (
          <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300">
            <Info className="h-5 w-5 !text-blue-600 dark:!text-blue-400" />
            <AlertTitle className="font-semibold text-blue-900 dark:text-blue-200">Curriculum Context</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              {curriculum.stageNote && <p>{curriculum.stageNote}</p>}
              {curriculum.sourceNote && <p className="text-sm opacity-90">{curriculum.sourceNote}</p>}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Learning Objectives</h3>
            <span className="text-sm text-muted-foreground font-medium">{filteredObjectives.length} results</span>
          </div>

          {filteredObjectives.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border shadow-sm">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground mb-3 opacity-50" />
              <h3 className="text-base font-semibold">No objectives found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredObjectives.map((obj) => (
                <Card key={obj.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-transparent">
                            {obj.subject}
                          </Badge>
                          {obj.strand && (
                            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                              {obj.strand}
                            </Badge>
                          )}
                          {obj.term && (
                            <span className="text-muted-foreground ml-auto sm:ml-0 text-xs flex items-center gap-1">
                               {obj.term}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-base leading-snug">{obj.topic}</h4>
                        <p className="text-sm text-foreground/90">{obj.objective}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold bg-muted/50 px-2 py-1 rounded">
                          Source: {obj.source}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8 text-xs"
                          onClick={() => handleStartSession(obj.subject, obj.id)}
                        >
                          <Brain className="w-3.5 h-3.5" />
                          Start Session
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PLAIN_TEXT_EXTENSIONS = [".txt", ".csv", ".json"];
const MAX_PDF_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function SyllabusImport() {
  const { data: uploads, isLoading: uploadsLoading } = useListCurriculumUploads();
  const createUpload = useCreateCurriculumUpload();
  const extractText = useExtractCurriculumMaterialText();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    school: "Phoenix Greens School of Learning",
    grade: "Grade 6",
    subject: "French",
    term: "Term 1",
    contentText: "",
    fileName: null as string | null,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    const isPlainText = PLAIN_TEXT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (isPlainText) {
      try {
        const text = await file.text();
        setFormData(prev => ({ ...prev, fileName: file.name, contentText: text }));
      } catch (err) {
        toast({
          title: "Error reading file",
          description: "Please ensure you upload a readable text file.",
          variant: "destructive"
        });
      }
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const maxBytes = isPdf ? MAX_PDF_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
    if (file.size > maxBytes) {
      toast({
        title: "File too large",
        description: isPdf ? "Please upload a PDF no larger than 50MB." : "Please upload a photo under 8MB.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isPdf) setIsExtractingPdf(true);
      const result = isPdf
        ? await fetch("/api/curricula/extract-file", {
            method: "POST",
            headers: { "Content-Type": "application/pdf" },
            body: file,
          }).then(async (response) => {
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "Could not read this PDF.");
            return payload as { text: string };
          })
        : await readFileAsBase64(file).then((contentBase64) =>
            extractText.mutateAsync({
              data: { fileName: file.name, mimeType: file.type || "application/octet-stream", contentBase64 },
            }),
          );
      setFormData(prev => ({ ...prev, fileName: file.name, contentText: result.text }));
      toast({
        title: "Text extracted",
        description: `Review the extracted content below before importing "${file.name}".`,
      });
    } catch (err) {
      toast({
        title: "Could not read this file",
        description: err instanceof Error ? err.message : "Please try a different file or paste the content directly.",
        variant: "destructive"
      });
    } finally {
      if (isPdf) setIsExtractingPdf(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.contentText) {
      toast({
        title: "Missing required fields",
        description: "Please provide at least a title and the syllabus content.",
        variant: "destructive"
      });
      return;
    }

    createUpload.mutate(
      { data: formData },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListCurriculumUploadsQueryKey() });
          toast({
            title: "Syllabus Imported Successfully",
            description: `Imported ${result.importedObjectives.length} objectives from "${result.upload.title}".`,
          });
          setFormData({
            title: "",
            school: "Phoenix Greens School of Learning",
            grade: "Grade 6",
            subject: "French",
            term: "Term 1",
            contentText: "",
            fileName: null
          });
        },
        onError: (error) => {
          toast({
            title: "Import Failed",
            description: error instanceof Error
              ? error.message
              : "There was an error processing your syllabus.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      <div className="lg:col-span-3 space-y-6">
        <Card className="shadow-md border-card-border overflow-hidden">
          <div className="bg-primary/5 p-6 border-b border-border">
            <CardTitle className="text-xl">Import Custom Syllabus</CardTitle>
            <CardDescription className="text-base mt-2">
              Add curriculum objectives from your child's school. You can type, paste, or upload a document — .txt, .csv, .json, a PDF, or a photo of the notes.
            </CardDescription>
          </div>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">Title <span className="text-destructive">*</span></Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. Science Term 1 Syllabus" 
                    required
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school" className="text-sm font-semibold">School <span className="text-destructive">*</span></Label>
                  <Input 
                    id="school" 
                    placeholder="e.g. Phoenix Greens" 
                    required
                    value={formData.school}
                    onChange={e => setFormData(p => ({ ...p, school: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade" className="text-sm font-semibold">Grade <span className="text-destructive">*</span></Label>
                  <Input 
                    id="grade" 
                    placeholder="e.g. 6" 
                    required
                    value={formData.grade}
                    onChange={e => setFormData(p => ({ ...p, grade: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-sm font-semibold">Subject <span className="text-destructive">*</span></Label>
                  <Input 
                    id="subject" 
                    placeholder="e.g. Science" 
                    required
                    value={formData.subject}
                    onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="term" className="text-sm font-semibold">Term <span className="text-destructive">*</span></Label>
                  <Input 
                    id="term" 
                    placeholder="e.g. Term 1" 
                    required
                    value={formData.term}
                    onChange={e => setFormData(p => ({ ...p, term: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Syllabus Content <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".txt,.csv,.json,.pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      disabled={extractText.isPending || isExtractingPdf}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium bg-muted/30"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={extractText.isPending || isExtractingPdf}
                    >
                      {extractText.isPending || isExtractingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {extractText.isPending || isExtractingPdf ? "Reading file…" : "Upload File"}
                    </Button>
                  </div>
                </div>
                
                {formData.fileName && (
                  <div className="bg-primary/5 border border-primary/20 text-primary-foreground/90 px-3 py-2 rounded-md flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <FileText className="w-4 h-4" />
                      {formData.fileName}
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 text-primary hover:bg-primary/10"
                      onClick={() => setFormData(p => ({ ...p, fileName: null, contentText: "" }))}
                    >
                      &times;
                    </Button>
                  </div>
                )}
                
                <Textarea 
                  placeholder="Paste objectives, topics, or syllabus text here..." 
                  className="min-h-[200px] resize-y font-mono text-sm leading-relaxed"
                  required
                  value={formData.contentText}
                  onChange={e => setFormData(p => ({ ...p, contentText: e.target.value, fileName: p.fileName ? null : p.fileName }))} // clear filename if they edit manually
                />
              </div>
            </CardContent>
            <CardFooter className="p-6 bg-muted/20 border-t border-border justify-end">
              <Button type="submit" disabled={createUpload.isPending} className="px-6 shadow-sm">
                {createUpload.isPending ? "Importing..." : "Process Syllabus"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-sm border-card-border">
          <CardHeader className="pb-3 border-b border-border bg-muted/10">
            <CardTitle className="text-lg">Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {uploadsLoading ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !uploads || uploads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
                <FileText className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No syllabi imported yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {uploads.map(upload => (
                  <div key={upload.id} className="p-4 hover:bg-muted/20 transition-colors flex items-start gap-3">
                    <div className="mt-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-1.5 rounded-full">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-semibold leading-tight">{upload.title}</h4>
                      <p className="text-xs text-muted-foreground">
                         {upload.subject} • {upload.grade}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium">
                          {upload.objectiveCount} objectives
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(upload.uploadedAt).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

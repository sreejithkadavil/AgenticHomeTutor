import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useActiveStudent } from "@/hooks/use-active-student";
import { useSubmitTutorTurn, useCompleteStudySession } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Mic, Send, BrainCircuit, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Study() {
  const { student } = useActiveStudent();
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Local state to hold the conversation flow since we don't have a GetSession endpoint
  const [history, setHistory] = useState<{ role: 'tutor' | 'student', content: string, type?: string }[]>([
    { role: 'tutor', content: "Hello! Let's review what we learned. What happens when you add 1/4 and 1/4?", type: "question" }
  ]);
  const [mastery, setMastery] = useState(0.4);
  
  const submitTurn = useSubmitTutorTurn();
  const completeSession = useCompleteStudySession();
  
  // Dummy session ID for the MVP
  const sessionId = "session-123";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  if (!student) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || submitTurn.isPending) return;

    const userMessage = input;
    setInput("");
    setHistory(prev => [...prev, { role: 'student', content: userMessage }]);

    submitTurn.mutate({
      sessionId,
      data: { answer: userMessage, inputMode: "text" }
    }, {
      onSuccess: (data) => {
        setHistory(prev => [...prev, { role: 'tutor', content: data.response, type: data.responseType }]);
        setMastery(data.mastery);
        
        if (data.responseType === "complete") {
          // Auto complete after short delay
          setTimeout(() => handleComplete(), 2000);
        }
      },
      onError: () => {
        // Fallback for demo without backend
        setTimeout(() => {
          setHistory(prev => [...prev, { 
            role: 'tutor', 
            content: "That's a great start! 1/4 + 1/4 is indeed 2/4, which simplifies to 1/2. Can you explain why we don't add the bottom numbers (denominators)?",
            type: "explain"
          }]);
          setMastery(0.6);
        }, 1000);
      }
    });
  };

  const handleComplete = () => {
    completeSession.mutate({ sessionId }, {
      onSettled: () => {
        setLocation("/dashboard");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Session Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-serif">Active Session</h1>
          <p className="text-sm text-muted-foreground mt-1">Goal: Improve understanding and correct misconceptions.</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex flex-col items-end gap-1">
            <span className="text-muted-foreground">Session Mastery</span>
            <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-1000 ease-out" 
                style={{ width: `${mastery * 100}%` }}
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleComplete} disabled={completeSession.isPending}>
            End Session
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col shadow-md overflow-hidden bg-background/50 border-border/50">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
        >
          {history.map((msg, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex max-w-[85%] animate-in fade-in slide-in-from-bottom-2",
                msg.role === 'tutor' ? "mr-auto" : "ml-auto"
              )}
            >
              {msg.role === 'tutor' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mr-3 shadow-sm mt-1">
                  <BrainCircuit className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              <div className={cn(
                "p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm font-serif",
                msg.role === 'tutor' 
                  ? "bg-card border border-border text-card-foreground rounded-tl-none" 
                  : "bg-primary text-primary-foreground rounded-tr-none"
              )}>
                {msg.content}
                
                {msg.role === 'tutor' && msg.type === 'explain' && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-sans font-medium text-accent bg-accent/10 px-2 py-1.5 rounded-md inline-flex">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Concept Check
                  </div>
                )}
                {msg.role === 'tutor' && msg.type === 'encourage' && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-sans font-medium text-green-600 bg-green-50 px-2 py-1.5 rounded-md inline-flex dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Great Job
                  </div>
                )}
              </div>
            </div>
          ))}
          {submitTurn.isPending && (
            <div className="flex max-w-[85%] mr-auto items-end animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mr-3 shadow-sm mb-2">
                <BrainCircuit className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border rounded-tl-none flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-card border-t border-border">
          <form 
            onSubmit={handleSubmit}
            className="flex items-end gap-3 max-w-4xl mx-auto relative"
          >
            <Button 
              type="button"
              variant={isRecording ? "destructive" : "outline"} 
              size="icon" 
              className={cn("shrink-0 rounded-full h-12 w-12", isRecording && "animate-pulse shadow-lg shadow-destructive/20")}
              onClick={() => setIsRecording(!isRecording)}
              title="Use Voice"
            >
              <Mic className="w-5 h-5" />
            </Button>
            
            <div className="relative flex-1">
              <Textarea 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Type your answer here..."
                className="min-h-[48px] h-12 py-3 resize-none rounded-2xl pr-12 text-base shadow-sm focus-visible:ring-primary/20"
                disabled={submitTurn.isPending}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || submitTurn.isPending}
                className="absolute right-1.5 bottom-1.5 h-9 w-9 rounded-xl"
              >
                {submitTurn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </form>
          <div className="text-center mt-3 text-xs text-muted-foreground font-medium">
            Shift + Enter for new line • Enter to send
          </div>
        </div>
      </Card>
    </div>
  );
}

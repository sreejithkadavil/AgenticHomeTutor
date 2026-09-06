import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useActiveStudent } from "@/hooks/use-active-student";
import { useSubmitTutorTurn, useCompleteStudySession, useStartStudySession, useCreateRealtimeClientSecret, useRecordRealtimeTurn } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Send, BrainCircuit, CheckCircle2, AlertCircle, Loader2, PhoneOff, VolumeX, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Study() {
  const { student } = useActiveStudent();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "listening" | "speaking" | "error">("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPrompt, setSessionPrompt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedCostUsd, setEstimatedCostUsd] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<{ student: string; assistant: string }>({ student: "", assistant: "" });
  const scrollRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const studentTranscriptRef = useRef("");
  const assistantTranscriptRef = useRef("");
  
  const [history, setHistory] = useState<{ role: 'tutor' | 'student', content: string, type?: string }[]>([]);
  const [mastery, setMastery] = useState(0.4);
  
  const submitTurn = useSubmitTutorTurn();
  const completeSession = useCompleteStudySession();
  const startSession = useStartStudySession();
  const realtimeSecret = useCreateRealtimeClientSecret();
  const recordRealtimeTurn = useRecordRealtimeTurn();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (!student || sessionId || startSession.isPending) return;
    const params = new URLSearchParams(search);
    const subject = params.get("subject") ?? undefined;
    const objectiveId = params.get("objectiveId") ?? undefined;
    startSession.mutate({ studentId: student.id, data: { subject, objectiveId } }, {
      onSuccess: (session) => {
        setSessionId(session.id); setSessionPrompt(session.objective);
        setHistory([{ role: "tutor", content: session.prompt, type: session.promptType }]);
      },
    });
  }, [student, sessionId, startSession, search]);

  useEffect(() => () => {
    peerRef.current?.close(); streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!sessionId || elapsedSeconds >= 3600) return;
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [sessionId, elapsedSeconds]);

  if (!student) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || submitTurn.isPending || !sessionId) return;

    const userMessage = input;
    setInput("");
    setHistory(prev => [...prev, { role: 'student', content: userMessage }]);

    submitTurn.mutate({
      sessionId,
      data: { answer: userMessage, inputMode: "text" }
    }, {
      onSuccess: (data) => {
        setHistory(prev => [
          ...prev,
          { role: 'tutor', content: data.response, type: data.responseType },
          ...(data.responseType !== "complete" && data.nextPrompt
            ? [{ role: 'tutor' as const, content: data.nextPrompt, type: data.nextPromptType }]
            : []),
        ]);
        setMastery(data.mastery);
        setSessionPrompt(data.objective);

        if (data.responseType === "complete") {
          // Auto complete after short delay
          setTimeout(() => handleComplete(), 2000);
        }
      },
      onError: (error) => setHistory(prev => [...prev, { role: "tutor", content: error.message || "Your answer could not be saved. Please try again.", type: "explain" }])
    });
  };

  const handleComplete = () => {
    if (!sessionId) return;
    completeSession.mutate({ sessionId }, {
      onSettled: () => {
        setLocation("/user-portal");
      }
    });
  };
  useEffect(() => {
    if (elapsedSeconds >= 3600 && sessionId) { disconnectVoice(); handleComplete(); }
  }, [elapsedSeconds, sessionId]);
  const disconnectVoice = () => {
    dataChannelRef.current?.close(); dataChannelRef.current = null;
    peerRef.current?.close(); peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    setIsRecording(false); setVoiceState("idle");
  };
  const toggleMute = () => {
    const next = !isMuted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setIsMuted(next);
  };
  const persistRealtimeExchange = (usage: Record<string, unknown>) => {
    if (!sessionId || !studentTranscriptRef.current.trim() || !assistantTranscriptRef.current.trim()) return;
    const studentTranscript = studentTranscriptRef.current.trim();
    const assistantTranscript = assistantTranscriptRef.current.trim();
    studentTranscriptRef.current = ""; assistantTranscriptRef.current = "";
    setLiveTranscript({ student: "", assistant: "" });
    setHistory((items) => [...items, { role: "student", content: studentTranscript }, { role: "tutor", content: assistantTranscript, type: "explain" }]);
    recordRealtimeTurn.mutate({ sessionId, data: { studentTranscript, assistantTranscript, usage } }, { onSuccess: (turn) => setMastery(turn.mastery), onError: (error) => setVoiceError(error.message || "Voice transcript could not be saved.") });
  };
  const updateEstimatedCost = (usage: Record<string, unknown>) => {
    const inputDetails = usage.input_token_details as Record<string, unknown> | undefined;
    const outputDetails = usage.output_token_details as Record<string, unknown> | undefined;
    const inputAudioTokens = typeof inputDetails?.audio_tokens === "number" ? inputDetails.audio_tokens : 0;
    const outputAudioTokens = typeof outputDetails?.audio_tokens === "number" ? outputDetails.audio_tokens : 0;
    setEstimatedCostUsd((current) => current + (inputAudioTokens * 10 + outputAudioTokens * 20) / 1_000_000);
  };
  const connectVoice = async () => {
    if (!student || !sessionId) return;
    try {
      setVoiceError(null); setVoiceState("connecting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const secret = await realtimeSecret.mutateAsync({ data: { studentId: student.id, sessionId } });
      const peer = new RTCPeerConnection(); peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const audio = new Audio(); audio.autoplay = true;
      peer.ontrack = (event) => { audio.srcObject = event.streams[0]; setVoiceState("speaking"); };
      const channel = peer.createDataChannel("oai-events"); dataChannelRef.current = channel;
      channel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as { type?: string; transcript?: string; response?: { usage?: Record<string, unknown> } };
          if (message.type === "conversation.item.input_audio_transcription.completed" && message.transcript) { studentTranscriptRef.current += `${studentTranscriptRef.current ? " " : ""}${message.transcript}`; setLiveTranscript((value) => ({ ...value, student: studentTranscriptRef.current })); }
          if (message.type === "response.output_audio_transcript.done" && message.transcript) { assistantTranscriptRef.current += `${assistantTranscriptRef.current ? " " : ""}${message.transcript}`; setLiveTranscript((value) => ({ ...value, assistant: assistantTranscriptRef.current })); }
          if (message.type === "input_audio_buffer.speech_started") { channel.send(JSON.stringify({ type: "response.cancel" })); setVoiceState("listening"); }
          if (message.type === "response.done") {
            const usage = message.response?.usage ?? {};
            setVoiceState("listening");
            updateEstimatedCost(usage);
            persistRealtimeExchange(usage);
          }
        } catch { setVoiceError("Received an unreadable voice event."); }
      };
      const offer = await peer.createOffer(); await peer.setLocalDescription(offer);
      const response = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", headers: { Authorization: `Bearer ${secret.value}`, "Content-Type": "application/sdp" }, body: offer.sdp });
      if (!response.ok) throw new Error("Voice connection was rejected");
      await peer.setRemoteDescription({ type: "answer", sdp: await response.text() });
      setVoiceState("listening"); setIsRecording(true);
    } catch (error) {
      disconnectVoice(); setVoiceState("error"); setVoiceError(error instanceof Error ? error.message : "Microphone or voice connection failed");
    }
  };
  const reconnectVoice = () => { disconnectVoice(); window.setTimeout(() => { void connectVoice(); }, 150); };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Session Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-serif">Active Session</h1>
          <p className="text-sm text-muted-foreground mt-1">Goal: {sessionPrompt ?? "Preparing your learning objective."}</p>
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
          <div className="text-right text-xs text-muted-foreground">
            <span className="block tabular-nums">{String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:{String(elapsedSeconds % 60).padStart(2, "0")}</span>
            <span className="block tabular-nums" title="Estimated from reported Realtime audio tokens">Est. ₹{(estimatedCostUsd * 96).toFixed(2)}</span>
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
                    New Concept
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
          {(liveTranscript.student || liveTranscript.assistant) && <div className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm"><p className="font-semibold text-primary">Live voice transcript</p>{liveTranscript.student && <p><span className="font-medium">You: </span>{liveTranscript.student}</p>}{liveTranscript.assistant && <p><span className="font-medium">Tutor: </span>{liveTranscript.assistant}</p>}</div>}
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
              onClick={isRecording ? disconnectVoice : connectVoice}
              disabled={!sessionId || voiceState === "connecting"}
              title={isRecording ? "Disconnect voice" : "Connect voice"}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : voiceState === "connecting" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
            </Button>
            {isRecording && <><Button type="button" variant="outline" size="icon" onClick={toggleMute} title={isMuted ? "Unmute microphone" : "Mute microphone"}>{isMuted ? <MicOff className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}</Button><Button type="button" variant="outline" size="icon" onClick={disconnectVoice} title="Disconnect voice"><PhoneOff className="w-4 h-4" /></Button></>}
            {voiceState === "error" && <Button type="button" variant="outline" size="icon" onClick={reconnectVoice} title="Reconnect voice"><RotateCcw className="w-4 h-4" /></Button>}
            
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
            {voiceError ? voiceError : voiceState === "listening" ? "Voice connected and listening. You can still type." : "Shift + Enter for new line • Enter to send"}
          </div>
        </div>
      </Card>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { ArrowUp, GitBranch, Loader2, Check, AlertCircle, Clock, ExternalLink, Square, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RalphtownInstance, ChatMessage } from "@/types/ralphtown";
import { cn } from "@/lib/utils";
import type { OutputLine } from "@/hooks/useWebSocket";

interface ConversationViewProps {
  instance: RalphtownInstance;
  onSendMessage: (instanceId: string, message: string) => void;
  outputLines?: OutputLine[];
  onCancel?: (instanceId: string) => void;
}

const statusConfig = {
  completed: { icon: Check, label: "Completed", className: "text-muted-foreground" },
  running: { icon: Loader2, label: "Running", className: "text-agent-running animate-spin" },
  error: { icon: AlertCircle, label: "Error", className: "text-agent-error" },
  pending: { icon: Clock, label: "Pending", className: "text-agent-pending" },
  idle: { icon: Clock, label: "Idle", className: "text-muted-foreground" },
  cancelled: { icon: AlertCircle, label: "Cancelled", className: "text-agent-error" },
};

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className="text-xs mt-2 opacity-60">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function OutputPanel({ lines }: { lines: OutputLine[] }) {
  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="border border-border rounded-lg bg-zinc-950 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-zinc-900">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Console Output</span>
      </div>
      <div className="max-h-64 overflow-y-auto p-3 font-mono text-xs">
        {lines.map((line, index) => (
          <div
            key={index}
            className={cn(
              "whitespace-pre-wrap break-all",
              line.stream === "stderr" ? "text-red-400" : "text-zinc-300"
            )}
          >
            {line.content}
          </div>
        ))}
        <div ref={outputEndRef} />
      </div>
    </div>
  );
}

export function ConversationView({ instance, onSendMessage, outputLines = [], onCancel }: ConversationViewProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const StatusIcon = statusConfig[instance.status].icon;
  const isRunning = instance.status === "running";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [instance.messages]);

  const handleSubmit = () => {
    if (input.trim()) {
      onSendMessage(instance.id, input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleCancel = () => {
    onCancel?.(instance.id);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <StatusIcon className={cn("h-5 w-5", statusConfig[instance.status].className)} />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-medium truncate">{instance.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" />
              <span>{instance.repo}</span>
              <span>·</span>
              <span>{instance.branch}</span>
              <span>·</span>
              <span>{instance.model}</span>
            </div>
          </div>
          {isRunning && onCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              className="flex items-center gap-1.5"
            >
              <Square className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
          <a
            href={`https://github.com/${instance.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View repo</span>
          </a>
        </div>
      </div>

      {/* Messages and Output */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {instance.messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))}
          {outputLines.length > 0 && <OutputPanel lines={outputLines} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Textarea
              placeholder="Send follow-up instructions..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] border-0 bg-transparent resize-none focus-visible:ring-0 text-sm px-4 py-3"
              disabled={instance.status === "error"}
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {instance.status === "running" ? "Agent is working..." : "Press ⌘+Enter to send"}
              </span>
              <Button
                size="icon"
                className="h-8 w-8 rounded-full bg-muted hover:bg-accent"
                onClick={handleSubmit}
                disabled={!input.trim() || instance.status === "error"}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

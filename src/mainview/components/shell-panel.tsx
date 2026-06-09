import { useState, useRef, useEffect } from "react";
import { electrobun } from "@/lib/electrobun";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Send, Trash2 } from "lucide-react";

interface ShellPanelProps {
  serial: string;
}

interface ShellLine {
  type: "command" | "output" | "error";
  content: string;
}

export function ShellPanel({ serial }: ShellPanelProps) {
  const [history, setHistory] = useState<ShellLine[]>([]);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = async () => {
    if (!serial || !command.trim()) return;
    const cmd = command.trim();
    setHistory((prev) => [...prev, { type: "command", content: `$ ${cmd}` }]);
    setCommand("");
    setLoading(true);

    try {
      const result = await electrobun.rpc?.request.executeShell({ serial, command: cmd });
      if (result) {
        if (result.stdout) {
          setHistory((prev) => [...prev, { type: "output", content: result.stdout }]);
        }
        if (result.stderr) {
          setHistory((prev) => [...prev, { type: "error", content: result.stderr }]);
        }
      }
    } catch (e) {
      setHistory((prev) => [...prev, { type: "error", content: String(e) }]);
    }
    setLoading(false);
  };

  const clearHistory = () => setHistory([]);

  if (!serial) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">请选择一个设备</div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Shell 终端
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={clearHistory}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
        <ScrollArea className="flex-1 border rounded-lg bg-black p-4">
          <div ref={scrollRef} className="space-y-1 font-mono text-sm">
            {history.length === 0 ? (
              <div className="text-gray-500">输入命令开始...</div>
            ) : (
              history.map((line, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap break-all ${
                    line.type === "command"
                      ? "text-green-400"
                      : line.type === "error"
                      ? "text-red-400"
                      : "text-gray-300"
                  }`}
                >
                  {line.content}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && executeCommand()}
            placeholder="输入 ADB shell 命令..."
            disabled={loading}
            className="font-mono"
          />
          <Button onClick={executeCommand} disabled={loading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { electrobun, registerLogcatCallback } from "@/lib/electrobun";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Trash2,
  ArrowDown,
  Search,
  Tag,
  X,
  Bookmark,
  BookmarkPlus,
} from "lucide-react";
import type { LogEntry } from "shared/rpc";

interface LogcatPanelProps {
  serial: string;
}

interface LogPreset {
  id: string;
  name: string;
  searchText: string;
  tagOnlySearch: boolean;
  selectedLevels: string[];
  selectedTags: string[];
}

const LOG_LEVELS = [
  { key: "V", label: "Verbose", color: "bg-gray-500" },
  { key: "D", label: "Debug", color: "bg-blue-500" },
  { key: "I", label: "Info", color: "bg-green-500" },
  { key: "W", label: "Warn", color: "bg-yellow-500" },
  { key: "E", label: "Error", color: "bg-red-500" },
  { key: "F", label: "Fatal", color: "bg-red-700" },
  { key: "?", label: "Other", color: "bg-gray-400" },
] as const;

const ITEM_HEIGHT = 20;
const BUFFER_ITEMS = 30;
const MAX_TAGS_SHOWN = 12;
const PRESETS_KEY = "adbvis-logcat-presets";

function getLevelColor(level: string) {
  switch (level) {
    case "V": return "text-gray-500";
    case "D": return "text-blue-400";
    case "I": return "text-green-400";
    case "W": return "text-yellow-400";
    case "E": return "text-red-400";
    case "F": return "text-red-500 font-bold";
    default: return "text-gray-400";
  }
}

function loadPresets(): LogPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: LogPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function LogcatPanel({ serial }: LogcatPanelProps) {
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [searchText, setSearchText] = useState("");
  const [tagOnlySearch, setTagOnlySearch] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set(["V", "D", "I", "W", "E", "F", "?"]));
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showAllTags, setShowAllTags] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [presets, setPresets] = useState<LogPreset[]>(loadPresets);
  const [presetName, setPresetName] = useState("");
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const grepRef = useRef("");
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollRef = useRef(true);

  // 容器尺寸
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    setContainerHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const handleNewLog = useCallback((log: LogEntry) => {
    setAllLogs((prev) => [...prev, log]);
  }, []);

  const startStream = useCallback(async (grep: string, tagOnly?: boolean) => {
    if (!serial) return;
    await electrobun.rpc?.request.stopLogcatStream({ serial });
    await electrobun.rpc?.request.startLogcatStream({ serial, grep: grep || undefined, tagOnly });
  }, [serial]);

  // 启动流
  useEffect(() => {
    if (!serial) return;
    startStream("");
    const unregister = registerLogcatCallback(serial, handleNewLog);
    return () => {
      unregister();
      electrobun.rpc?.request.stopLogcatStream({ serial });
    };
  }, [serial, handleNewLog, startStream]);

  // 搜索防抖重启流
  useEffect(() => {
    if (!serial) return;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      const nextGrep = searchText.trim();
      if (nextGrep !== grepRef.current) {
        grepRef.current = nextGrep;
        setAllLogs([]);
        startStream(nextGrep, tagOnlySearch);
      }
    }, 500);
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, [searchText, serial, startStream]);

  // 仅标签开关变化时立即重启流
  useEffect(() => {
    if (!serial) return;
    setAllLogs([]);
    startStream(searchText.trim(), tagOnlySearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagOnlySearch, serial]);

  // 提取标签频率
  const tagStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of allLogs) {
      map.set(log.tag, (map.get(log.tag) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allLogs]);

  const visibleTags = showAllTags ? tagStats : tagStats.slice(0, MAX_TAGS_SHOWN);
  const hasMoreTags = tagStats.length > MAX_TAGS_SHOWN;

  // 级别统计
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of allLogs) counts[log.level] = (counts[log.level] || 0) + 1;
    return counts;
  }, [allLogs]);

  // 筛选后的日志（级别 + 标签）
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (!selectedLevels.has(log.level)) return false;
      if (selectedTags.size > 0 && !selectedTags.has(log.tag)) return false;
      return true;
    });
  }, [allLogs, selectedLevels, selectedTags]);

  const totalCount = filteredLogs.length;

  // 虚拟列表
  const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + BUFFER_ITEMS * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_ITEMS);
  const endIndex = Math.min(totalCount, startIndex + visibleCount);
  const displayLogs = filteredLogs.slice(startIndex, endIndex);
  const topPadding = startIndex * ITEM_HEIGHT;
  const bottomPadding = (totalCount - endIndex) * ITEM_HEIGHT;

  // 自动滚动
  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = totalCount * ITEM_HEIGHT;
    }
  }, [totalCount]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const st = el.scrollTop;
    setScrollTop(st);
    const maxScroll = totalCount * ITEM_HEIGHT - el.clientHeight;
    const atBottom = st >= maxScroll - 30;
    setIsAtBottom(atBottom);
    autoScrollRef.current = atBottom;
  }, [totalCount]);

  const scrollToBottom = useCallback(() => {
    autoScrollRef.current = true;
    setIsAtBottom(true);
    if (containerRef.current) containerRef.current.scrollTop = totalCount * ITEM_HEIGHT;
  }, [totalCount]);

  const toggleLevel = (key: string) => {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const clearTagFilter = () => setSelectedTags(new Set());
  const clearLogs = () => setAllLogs([]);

  // 预设操作
  const applyPreset = (preset: LogPreset) => {
    setSearchText(preset.searchText);
    setTagOnlySearch(preset.tagOnlySearch);
    setSelectedLevels(new Set(preset.selectedLevels));
    setSelectedTags(new Set(preset.selectedTags));
  };

  const addPreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const newPreset: LogPreset = {
      id: crypto.randomUUID(),
      name,
      searchText,
      tagOnlySearch,
      selectedLevels: Array.from(selectedLevels),
      selectedTags: Array.from(selectedTags),
    };
    const next = [...presets, newPreset];
    setPresets(next);
    savePresets(next);
    setPresetName("");
    setPresetDialogOpen(false);
  };

  const deletePreset = (id: string) => {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    savePresets(next);
  };

  if (!serial) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">请选择一个设备</div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            日志查看器
            <Badge variant="secondary" className="text-xs">{totalCount}</Badge>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          </CardTitle>
          <div className="flex gap-1">
            {/* 保存预设 */}
            <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="保存当前筛选">
                  <BookmarkPlus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>保存筛选预设</DialogTitle>
                  <DialogDescription>将当前的搜索词、级别和标签筛选保存为快捷预设。</DialogDescription>
                </DialogHeader>
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="预设名称，例如：只看 Error..."
                  onKeyDown={(e) => e.key === "Enter" && addPreset()}
                />
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <div>搜索: {searchText || "(无)"} {tagOnlySearch ? "[仅标签]" : ""}</div>
                  <div>级别: {Array.from(selectedLevels).join(", ")}</div>
                  <div>标签: {selectedTags.size > 0 ? Array.from(selectedTags).join(", ") : "(全部)"}</div>
                </div>
                <DialogFooter>
                  <Button onClick={addPreset} disabled={!presetName.trim()}>保存</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="ghost" size="icon" onClick={clearLogs} title="清空">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 预设列表 */}
        {presets.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {presets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-0.5">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 text-[11px] px-2 rounded-r-none"
                  onClick={() => applyPreset(preset)}
                >
                  <Bookmark className="w-3 h-3 mr-1" />
                  {preset.name}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-l-none"
                  onClick={() => deletePreset(preset.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 搜索栏 */}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={tagOnlySearch ? "仅搜索标签名..." : "全局搜索（匹配标签/消息/PID）..."}
              className="pl-8"
            />
          </div>
          <Button
            variant={tagOnlySearch ? "default" : "outline"}
            size="sm"
            className="shrink-0"
            onClick={() => setTagOnlySearch(!tagOnlySearch)}
          >
            <Tag className="w-3.5 h-3.5 mr-1" />
            仅标签
          </Button>
        </div>

        {/* 级别筛选 */}
        <div className="flex gap-1 mt-2 flex-wrap">
          {LOG_LEVELS.map((level) => {
            const active = selectedLevels.has(level.key);
            const count = levelCounts[level.key] || 0;
            return (
              <Button
                key={level.key}
                variant={active ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs px-2 ${active ? "" : "opacity-50"}`}
                onClick={() => toggleLevel(level.key)}
              >
                <span className={`w-2 h-2 rounded-full mr-1 ${level.color}`} />
                {level.key}
                <span className="ml-1 text-[10px] opacity-70">({count})</span>
              </Button>
            );
          })}
        </div>

        {/* 标签筛选 */}
        {tagStats.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="w-3 h-3" />
                标签筛选
              </span>
              {selectedTags.size > 0 && (
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={clearTagFilter}>
                  <X className="w-3 h-3 mr-0.5" />
                  清除 ({selectedTags.size})
                </Button>
              )}
              {hasMoreTags && (
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => setShowAllTags(!showAllTags)}>
                  {showAllTags ? "收起" : `更多 (${tagStats.length})`}
                </Button>
              )}
            </div>
            <div className="flex gap-1 flex-wrap">
              {visibleTags.map(([tag, count]) => {
                const active = selectedTags.has(tag);
                return (
                  <Button
                    key={tag}
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className={`h-6 text-[11px] px-2 ${active ? "ring-1 ring-primary" : "opacity-70 hover:opacity-100"}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    <span className="ml-1 text-[10px] opacity-60">{count}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 min-h-0 relative p-0">
        <div
          ref={containerRef}
          className="h-full overflow-auto border rounded-lg bg-black font-mono text-xs"
          onScroll={handleScroll}
        >
          <div style={{ paddingTop: topPadding, paddingBottom: bottomPadding }}>
            {displayLogs.map((log, i) => {
              const actualIndex = startIndex + i;
              return (
                <div
                  key={actualIndex}
                  className="flex gap-2 hover:bg-white/5 px-3 rounded cursor-default items-start"
                  style={{ height: ITEM_HEIGHT }}
                >
                  <span className="text-gray-500 shrink-0 w-20 truncate" title={log.timestamp}>
                    {log.timestamp ? log.timestamp.slice(6, 18) : ""}
                  </span>
                  <span className={`shrink-0 w-4 text-center ${getLevelColor(log.level)} font-bold`}>
                    {log.level}
                  </span>
                  <span className="text-cyan-400 shrink-0 w-28 truncate" title={log.tag}>{log.tag}</span>
                  <span className="text-gray-500 shrink-0 w-10 text-right">{log.pid}</span>
                  <span className={`${getLevelColor(log.level)} break-all flex-1 truncate`} title={log.message}>
                    {log.message}
                  </span>
                </div>
              );
            })}
          </div>
          {totalCount === 0 && (
            <div className="text-gray-500 text-center py-12">等待日志流入...</div>
          )}
        </div>

        {!isAtBottom && (
          <Button size="sm" className="absolute bottom-4 right-4 shadow-lg" onClick={scrollToBottom}>
            <ArrowDown className="w-3 h-3 mr-1" />
            回到底部
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

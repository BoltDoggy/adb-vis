import { useState, useEffect } from "react";
import { electrobun } from "@/lib/electrobun";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Package, Search, Trash2, RefreshCw } from "lucide-react";
import type { AppInfo } from "shared/rpc";

interface AppsPanelProps {
  serial: string;
}

export function AppsPanel({ serial }: AppsPanelProps) {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [systemOnly, setSystemOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchApps = async () => {
    if (!serial) return;
    setLoading(true);
    try {
      const result = await electrobun.rpc?.request.listApps({ serial, systemOnly });
      if (result) {
        setApps(result.apps);
      }
    } catch (e) {
      console.error("Failed to list apps:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, [serial, systemOnly]);

  const uninstall = async (packageName: string) => {
    if (!confirm(`确定要卸载 ${packageName} 吗？`)) return;
    try {
      const result = await electrobun.rpc?.request.uninstallApp({ serial, packageName });
      if (result?.success) {
        fetchApps();
      } else {
        alert(`卸载失败: ${result?.output}`);
      }
    } catch (e) {
      alert(`卸载失败: ${e}`);
    }
  };

  const filteredApps = apps.filter((app) =>
    app.packageName.toLowerCase().includes(filter.toLowerCase())
  );

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
            <Package className="w-5 h-5" />
            应用管理
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchApps} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="搜索应用包名..."
              className="pl-8"
            />
          </div>
          <Button
            variant={systemOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setSystemOnly(!systemOnly)}
          >
            {systemOnly ? "系统应用" : "第三方应用"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-1">
            {filteredApps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">无应用</div>
            ) : (
              filteredApps.map((app) => (
                <div
                  key={app.packageName}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted group"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{app.appName || app.packageName}</div>
                    <div className="text-xs text-muted-foreground truncate">{app.packageName}</div>
                  </div>
                  {!app.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => uninstall(app.packageName)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                  {app.isSystem && (
                    <Badge variant="secondary" className="text-xs shrink-0">系统</Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

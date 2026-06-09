import { useEffect, useState } from "react";
import { electrobun } from "@/lib/electrobun";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, RefreshCw } from "lucide-react";
import type { DeviceInfo } from "shared/rpc";

interface DeviceListProps {
  onSelectDevice: (serial: string) => void;
  selectedDevice: string | null;
}

export function DeviceList({ onSelectDevice, selectedDevice }: DeviceListProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [adbPath, setAdbPath] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await electrobun.rpc?.request.getDevices({});
      if (result) {
        setDevices(result.devices as DeviceInfo[]);
        setAdbPath(result.adbPath);
      }
    } catch (e) {
      console.error("Failed to get devices:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            设备列表
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground truncate">{adbPath}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {devices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            未检测到设备
          </div>
        ) : (
          devices.map((device) => (
            <div
              key={device.serial}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedDevice === device.serial
                  ? "bg-primary/10 border-primary"
                  : "hover:bg-muted border-transparent"
              }`}
              onClick={() => onSelectDevice(device.serial)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm truncate">{device.model || device.serial}</span>
                <Badge variant={device.status === "device" ? "default" : "destructive"} className="text-xs">
                  {device.status === "device" ? "已连接" : device.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>序列号: {device.serial}</div>
                {device.product && <div>产品: {device.product}</div>}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

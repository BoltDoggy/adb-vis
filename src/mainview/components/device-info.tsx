import { useEffect, useState } from "react";
import { electrobun } from "@/lib/electrobun";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info, Battery, Monitor, Cpu } from "lucide-react";
import type { DeviceDetails } from "shared/rpc";

interface DeviceInfoProps {
  serial: string;
}

export function DeviceInfo({ serial }: DeviceInfoProps) {
  const [details, setDetails] = useState<DeviceDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serial) return;
    setLoading(true);
    electrobun.rpc?.request.getDeviceDetails({ serial }).then((result) => {
      setDetails(result);
      setLoading(false);
    });
  }, [serial]);

  if (!serial) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">请选择一个设备</div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </Card>
    );
  }

  if (!details) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">无法获取设备信息</div>
      </Card>
    );
  }

  const infoItems = [
    { icon: <Info className="w-4 h-4" />, label: "品牌", value: details.brand },
    { icon: <Info className="w-4 h-4" />, label: "型号", value: details.model },
    { icon: <Cpu className="w-4 h-4" />, label: "设备代号", value: details.device },
    { icon: <Cpu className="w-4 h-4" />, label: "制造商", value: details.manufacturer },
    { icon: <Cpu className="w-4 h-4" />, label: "主板", value: details.board },
    { icon: <Cpu className="w-4 h-4" />, label: "硬件", value: details.hardware },
    { icon: <Monitor className="w-4 h-4" />, label: "Android 版本", value: details.androidVersion },
    { icon: <Monitor className="w-4 h-4" />, label: "SDK 版本", value: details.sdkVersion },
    { icon: <Monitor className="w-4 h-4" />, label: "屏幕尺寸", value: details.displaySize },
    { icon: <Monitor className="w-4 h-4" />, label: "屏幕密度", value: details.density },
    { icon: <Battery className="w-4 h-4" />, label: "电池电量", value: details.batteryLevel },
    { icon: <Battery className="w-4 h-4" />, label: "电池状态", value: details.batteryStatus },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="w-5 h-5" />
          设备详情
          <Badge variant="outline" className="ml-auto text-xs">{serial}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-muted-foreground">{item.icon}</div>
              <div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-sm font-medium">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

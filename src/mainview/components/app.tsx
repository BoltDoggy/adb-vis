import { useState } from "react";
import { DeviceList } from "./device-list";
import { DeviceInfo } from "./device-info";
import { ScreenshotPanel } from "./screenshot-panel";
import { ShellPanel } from "./shell-panel";
import { LogcatPanel } from "./logcat-panel";
import { AppsPanel } from "./apps-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Smartphone,
  Camera,
  Terminal,
  FileText,
  Package,
  Activity,
} from "lucide-react";

export function App() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b flex items-center px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-lg">ADB Vis</h1>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {selectedDevice ? `当前设备: ${selectedDevice}` : "未选择设备"}
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar - Device List */}
        <aside className="w-72 border-r shrink-0 p-3 overflow-auto">
          <DeviceList
            onSelectDevice={setSelectedDevice}
            selectedDevice={selectedDevice}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-3 overflow-auto">
          <Tabs defaultValue="info" className="h-full flex flex-col">
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="info" className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">设备</span>
              </TabsTrigger>
              <TabsTrigger value="screenshot" className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">截图</span>
              </TabsTrigger>
              <TabsTrigger value="shell" className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Shell</span>
              </TabsTrigger>
              <TabsTrigger value="logcat" className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">日志</span>
              </TabsTrigger>
              <TabsTrigger value="apps" className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">应用</span>
              </TabsTrigger>
            </TabsList>

            <Separator className="my-3" />

            <TabsContent value="info" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
              <DeviceInfo serial={selectedDevice || ""} />
            </TabsContent>

            <TabsContent value="screenshot" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
              <ScreenshotPanel serial={selectedDevice || ""} />
            </TabsContent>

            <TabsContent value="shell" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
              <ShellPanel serial={selectedDevice || ""} />
            </TabsContent>

            <TabsContent value="logcat" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
              <LogcatPanel serial={selectedDevice || ""} />
            </TabsContent>

            <TabsContent value="apps" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
              <AppsPanel serial={selectedDevice || ""} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

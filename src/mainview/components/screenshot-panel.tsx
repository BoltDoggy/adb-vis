import { useState } from "react";
import { electrobun } from "@/lib/electrobun";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Download, RotateCcw } from "lucide-react";

interface ScreenshotPanelProps {
  serial: string;
}

export function ScreenshotPanel({ serial }: ScreenshotPanelProps) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const takeScreenshot = async () => {
    if (!serial) return;
    setLoading(true);
    try {
      const result = await electrobun.rpc?.request.takeScreenshot({ serial });
      if (result?.success && result.base64Image) {
        setImage(result.base64Image);
      }
    } catch (e) {
      console.error("Screenshot failed:", e);
    }
    setLoading(false);
  };

  const downloadImage = () => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image;
    link.download = `screenshot_${serial}_${Date.now()}.png`;
    link.click();
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5" />
            屏幕截图
          </CardTitle>
          <div className="flex gap-2">
            {image && (
              <Button variant="outline" size="sm" onClick={downloadImage}>
                <Download className="w-4 h-4 mr-1" />
                下载
              </Button>
            )}
            <Button size="sm" onClick={takeScreenshot} disabled={loading}>
              <Camera className={`w-4 h-4 mr-1 ${loading ? "animate-pulse" : ""}`} />
              {loading ? "截图中..." : "截图"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center overflow-auto">
        {image ? (
          <img
            src={image}
            alt="Screenshot"
            className="max-w-full max-h-full object-contain rounded-lg border"
          />
        ) : (
          <div className="text-center text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>点击"截图"按钮捕获设备屏幕</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

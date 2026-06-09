import { $ } from "bun";

function findAdbPath(): string {
  // 环境变量优先
  if (process.env.ADB_PATH) return process.env.ADB_PATH;

  // 常见路径
  const candidates = [
    "/Users/bolt/Library/Android/sdk/platform-tools/adb",
    "/opt/homebrew/bin/adb",
    "/usr/local/bin/adb",
    "/usr/bin/adb",
  ];

  for (const path of candidates) {
    try {
      const stat = Bun.file(path);
      if (stat.size > 0) return path;
    } catch {
      // ignore
    }
  }

  // 尝试从 PATH 中找
  try {
    const proc = Bun.spawn(["which", "adb"], { stdout: "pipe", stderr: "pipe" });
    const stdout = new Response(proc.stdout).text().then(t => t.trim()).catch(() => "");
    // 同步获取
    const path = new Response(proc.stdout).text().then(t => t.trim());
  } catch {
    // ignore
  }

  return "/Users/bolt/Library/Android/sdk/platform-tools/adb";
}

const ADB_PATH = findAdbPath();

async function runAdb(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const proc = Bun.spawn([ADB_PATH, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = proc.exitCode ?? 0;
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
  } catch (error) {
    return {
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
    };
  }
}

export async function getDevices() {
  const { stdout } = await runAdb(["devices", "-l"]);
  const lines = stdout.split("\n").slice(1);
  const devices = lines
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) return null;
      const serial = parts[0];
      const status = parts[1];
      const extras: Record<string, string> = {};
      for (let i = 2; i < parts.length; i++) {
        const [key, value] = parts[i].split(":");
        if (key && value) extras[key] = value;
      }
      return {
        serial,
        status,
        product: extras.product,
        model: extras.model,
        device: extras.device,
        transportId: extras.transport_id,
      };
    })
    .filter(Boolean);
  return { devices, adbPath: ADB_PATH };
}

export async function getDeviceDetails(serial: string) {
  const props = [
    "ro.product.brand",
    "ro.product.model",
    "ro.product.device",
    "ro.build.version.release",
    "ro.build.version.sdk",
    "ro.product.manufacturer",
    "ro.product.board",
    "ro.hardware",
  ];

  const details: Record<string, string> = {};
  for (const prop of props) {
    const { stdout } = await runAdb(["-s", serial, "shell", "getprop", prop]);
    details[prop] = stdout.trim();
  }

  const { stdout: displayOut } = await runAdb(["-s", serial, "shell", "wm", "size"]);
  const { stdout: densityOut } = await runAdb(["-s", serial, "shell", "wm", "density"]);
  const { stdout: batteryOut } = await runAdb(["-s", serial, "shell", "dumpsys", "battery"]);

  const batteryLevel = batteryOut.match(/level: (\d+)/)?.[1] ?? "?";
  const batteryStatus = batteryOut.match(/status: (\d+)/)?.[1] ?? "?";
  const statusMap: Record<string, string> = { "2": "Charging", "3": "Discharging", "5": "Full" };

  return {
    serial,
    brand: details["ro.product.brand"] || "Unknown",
    model: details["ro.product.model"] || "Unknown",
    device: details["ro.product.device"] || "Unknown",
    androidVersion: details["ro.build.version.release"] || "Unknown",
    sdkVersion: details["ro.build.version.sdk"] || "Unknown",
    manufacturer: details["ro.product.manufacturer"] || "Unknown",
    board: details["ro.product.board"] || "Unknown",
    hardware: details["ro.hardware"] || "Unknown",
    displaySize: displayOut.replace("Physical size:", "").trim() || "Unknown",
    density: densityOut.replace("Physical density:", "").trim() || "Unknown",
    batteryLevel: `${batteryLevel}%`,
    batteryStatus: statusMap[batteryStatus] || `Status ${batteryStatus}`,
  };
}

export async function executeShell(serial: string, command: string) {
  return await runAdb(["-s", serial, "shell", command]);
}

export async function takeScreenshot(serial: string) {
  const tmpPath = `/tmp/adb_screenshot_${serial}_${Date.now()}.png`;
  const { exitCode: screencapCode } = await runAdb(["-s", serial, "shell", "screencap", "-p", "/data/local/tmp/screenshot.png"]);
  if (screencapCode !== 0) {
    return { success: false, error: "Failed to capture screenshot" };
  }
  const { exitCode: pullCode } = await runAdb(["-s", serial, "pull", "/data/local/tmp/screenshot.png", tmpPath]);
  if (pullCode !== 0) {
    return { success: false, error: "Failed to pull screenshot" };
  }
  const file = Bun.file(tmpPath);
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  try { await Bun.write(tmpPath, ""); } catch {}
  return { success: true, base64Image: `data:image/png;base64,${base64}` };
}

export async function listApps(serial: string, systemOnly?: boolean) {
  const flag = systemOnly ? "-s" : "-3";
  const { stdout } = await runAdb(["-s", serial, "shell", "pm", "list", "packages", "-f", flag]);
  const lines = stdout.split("\n").filter((l) => l.startsWith("package:"));
  const apps = lines.map((line) => {
    const match = line.match(/package:([^=]+)=([^\s]+)/);
    if (!match) return null;
    const [, path, packageName] = match;
    return {
      packageName,
      appName: packageName.split(".").pop() || packageName,
      isSystem: systemOnly ?? false,
    };
  }).filter(Boolean);
  return { apps };
}

export async function installApp(serial: string, apkPath: string) {
  const { stdout, stderr, exitCode } = await runAdb(["-s", serial, "install", "-r", apkPath]);
  return { success: exitCode === 0, output: stdout || stderr };
}

export async function uninstallApp(serial: string, packageName: string) {
  const { stdout, stderr, exitCode } = await runAdb(["-s", serial, "uninstall", packageName]);
  return { success: exitCode === 0, output: stdout || stderr };
}

export async function pushFile(serial: string, localPath: string, remotePath: string) {
  const { stdout, stderr, exitCode } = await runAdb(["-s", serial, "push", localPath, remotePath]);
  return { success: exitCode === 0, output: stdout || stderr };
}

export async function pullFile(serial: string, remotePath: string, localPath: string) {
  const { stdout, stderr, exitCode } = await runAdb(["-s", serial, "pull", remotePath, localPath]);
  return { success: exitCode === 0, output: stdout || stderr };
}

export async function getLogcat(serial: string, lines = 200, filter?: string) {
  const args = ["-s", serial, "logcat", "-d", "-t", String(lines), "-v", "threadtime"];
  if (filter) {
    args.push(filter);
  }
  const { stdout, stderr, exitCode } = await runAdb(args);
  if (exitCode !== 0) {
    return { logs: [{ level: "E", tag: "ADB", pid: "0", tid: "", message: stderr || "Failed to fetch logcat" }] };
  }

  const logLines = stdout.split("\n").filter((l) => l.trim() && !l.startsWith("---") && !l.startsWith("beginning"));
  const logs = logLines.map((line) => {
    // brief format: D/Tag( 1234): message
    const briefMatch = line.match(/^(\w)\/(\S+)\s*\(\s*(\d+)\)\s*:\s*(.*)$/);
    if (briefMatch) {
      return {
        timestamp: "",
        level: briefMatch[1],
        tag: briefMatch[2],
        pid: briefMatch[3],
        tid: "",
        message: briefMatch[4],
      };
    }

    // threadtime format: 06-09 12:34:56.789  1234  5678 D Tag: message
    const threadtimeMatch = line.match(/(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+(\d+)\s+(\d+)\s+(\w)\s+(\S+)\s*:\s*(.*)/);
    if (threadtimeMatch) {
      return {
        timestamp: threadtimeMatch[1],
        level: threadtimeMatch[4],
        tag: threadtimeMatch[5],
        pid: threadtimeMatch[2],
        tid: threadtimeMatch[3],
        message: threadtimeMatch[6],
      };
    }

    // time format: 06-09 12:34:56.789 D/Tag( 1234): message
    const timeMatch = line.match(/(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+(\w)\/(\S+)\s*\(\s*(\d+)\)\s*:\s*(.*)/);
    if (timeMatch) {
      return {
        timestamp: timeMatch[1],
        level: timeMatch[2],
        tag: timeMatch[3],
        pid: timeMatch[4],
        tid: "",
        message: timeMatch[5],
      };
    }

    // raw format: just the message without metadata
    if (line.trim()) {
      return { level: "?", tag: "Raw", pid: "0", tid: "", message: line.trim() };
    }
    return { level: "?", tag: "?", pid: "?", tid: "", message: line };
  });
  return { logs };
}

export async function rebootDevice(serial: string, mode: "system" | "recovery" | "bootloader" = "system") {
  const args = mode === "system" ? ["-s", serial, "reboot"] : ["-s", serial, "reboot", mode];
  const { stdout, stderr, exitCode } = await runAdb(args);
  return { success: exitCode === 0, output: stdout || stderr };
}

export async function getScreenSize(serial: string) {
  const { stdout } = await runAdb(["-s", serial, "shell", "wm", "size"]);
  const match = stdout.match(/(\d+)x(\d+)/);
  if (match) {
    return { width: parseInt(match[1]), height: parseInt(match[2]) };
  }
  return { width: 0, height: 0 };
}

// ===== Logcat Stream Manager =====

type LogHandler = (log: { level: string; tag: string; pid: string; tid: string; message: string; timestamp?: string }) => void;

const activeStreams = new Map<string, { proc: ReturnType<typeof Bun.spawn<["inherit", "inherit", "inherit"]>>; abort: AbortController }>();

function parseLogLine(line: string): { level: string; tag: string; pid: string; tid: string; message: string; timestamp?: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("---") || trimmed.startsWith("beginning")) return null;

  // brief format: D/Tag( 1234): message
  const briefMatch = trimmed.match(/^(\w)\/(\S+)\s*\(\s*(\d+)\)\s*:\s*(.*)$/);
  if (briefMatch) {
    return { timestamp: "", level: briefMatch[1], tag: briefMatch[2], pid: briefMatch[3], tid: "", message: briefMatch[4] };
  }

  // threadtime format: 06-09 12:34:56.789  1234  5678 D Tag: message
  const threadtimeMatch = trimmed.match(/(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+(\d+)\s+(\d+)\s+(\w)\s+(\S+)\s*:\s*(.*)/);
  if (threadtimeMatch) {
    return { timestamp: threadtimeMatch[1], level: threadtimeMatch[4], tag: threadtimeMatch[5], pid: threadtimeMatch[2], tid: threadtimeMatch[3], message: threadtimeMatch[6] };
  }

  // time format: 06-09 12:34:56.789 D/Tag( 1234): message
  const timeMatch = trimmed.match(/(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+(\w)\/(\S+)\s*\(\s*(\d+)\)\s*:\s*(.*)/);
  if (timeMatch) {
    return { timestamp: timeMatch[1], level: timeMatch[2], tag: timeMatch[3], pid: timeMatch[4], tid: "", message: timeMatch[5] };
  }

  // raw
  return { level: "?", tag: "Raw", pid: "0", tid: "", message: trimmed };
}

export async function startLogcatStream(serial: string, onLog: LogHandler, grep?: string, tagOnly?: boolean) {
  // 停止已存在的流
  stopLogcatStream(serial);

  const grepLower = grep?.trim().toLowerCase();
  const args = ["-s", serial, "logcat", "-v", "threadtime"];

  const abort = new AbortController();
  const proc = Bun.spawn([ADB_PATH, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    signal: abort.signal,
  });

  activeStreams.set(serial, { proc, abort });

  // 读取 stdout
  const reader = proc.stdout.getReader();
  let buffer = "";

  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const log = parseLogLine(line);
          if (!log) continue;
          // grep 过滤
          if (grepLower) {
            if (tagOnly) {
              if (!log.tag.toLowerCase().includes(grepLower)) continue;
            } else {
              const haystack = `${log.tag} ${log.message} ${log.pid}`.toLowerCase();
              if (!haystack.includes(grepLower)) continue;
            }
          }
          onLog(log);
        }
      }
    } catch (e) {
      // Stream closed
    }
  })();

  // 读取 stderr
  const errReader = proc.stderr.getReader();
  (async () => {
    try {
      while (true) {
        const { done, value } = await errReader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (trimmed) onLog({ level: "E", tag: "ADB", pid: "0", tid: "", message: trimmed });
        }
      }
    } catch (e) {
      // Stream closed
    }
  })();

  return { success: true };
}

export function stopLogcatStream(serial: string) {
  const stream = activeStreams.get(serial);
  if (stream) {
    try { stream.abort.abort(); } catch {}
    try { stream.proc.kill(); } catch {}
    activeStreams.delete(serial);
  }
  return { success: true };
}

export function isLogcatStreaming(serial: string): boolean {
  return activeStreams.has(serial);
}

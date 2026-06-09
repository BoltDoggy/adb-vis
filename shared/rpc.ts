// RPC type definitions for main process <-> webview communication
// This file defines the contract for typed RPC between Electrobun main and webview

import type { RPCSchema } from "electrobun";

export type DeviceInfo = {
  serial: string;
  status: string;
  product?: string;
  model?: string;
  device?: string;
  transportId?: string;
};

export type DeviceDetails = {
  serial: string;
  brand: string;
  model: string;
  device: string;
  androidVersion: string;
  sdkVersion: string;
  manufacturer: string;
  board: string;
  hardware: string;
  displaySize: string;
  density: string;
  batteryLevel: string;
  batteryStatus: string;
};

export type AppInfo = {
  packageName: string;
  appName?: string;
  versionName?: string;
  versionCode?: string;
  isSystem: boolean;
};

export type LogEntry = {
  level: string;
  tag: string;
  pid: string;
  tid: string;
  message: string;
  timestamp?: string;
};

export type MainRPC = {
  bun: RPCSchema<{
    requests: {
      ping: {
        params: Record<string, never>;
        response: string;
      };
      getDevices: {
        params: Record<string, never>;
        response: { devices: DeviceInfo[]; adbPath: string };
      };
      getDeviceDetails: {
        params: { serial: string };
        response: DeviceDetails;
      };
      executeShell: {
        params: { serial: string; command: string };
        response: { stdout: string; stderr: string; exitCode: number };
      };
      takeScreenshot: {
        params: { serial: string };
        response: { success: boolean; base64Image?: string; error?: string };
      };
      listApps: {
        params: { serial: string; systemOnly?: boolean };
        response: { apps: AppInfo[] };
      };
      installApp: {
        params: { serial: string; apkPath: string };
        response: { success: boolean; output: string };
      };
      uninstallApp: {
        params: { serial: string; packageName: string };
        response: { success: boolean; output: string };
      };
      pushFile: {
        params: { serial: string; localPath: string; remotePath: string };
        response: { success: boolean; output: string };
      };
      pullFile: {
        params: { serial: string; remotePath: string; localPath: string };
        response: { success: boolean; output: string };
      };
      getLogcat: {
        params: { serial: string; lines?: number; filter?: string };
        response: { logs: LogEntry[] };
      };
      startLogcatStream: {
        params: { serial: string; grep?: string; tagOnly?: boolean };
        response: { success: boolean };
      };
      stopLogcatStream: {
        params: { serial: string };
        response: { success: boolean };
      };
      rebootDevice: {
        params: { serial: string; mode?: "system" | "recovery" | "bootloader" };
        response: { success: boolean; output: string };
      };
      getScreenSize: {
        params: { serial: string };
        response: { width: number; height: number };
      };
    };
    messages: {
      log: { msg: string };
      logcatStream: { serial: string; log: LogEntry };
    };
  }>;
  webview: RPCSchema<{
    requests: Record<string, never>;
    messages: Record<string, never>;
  }>;
};

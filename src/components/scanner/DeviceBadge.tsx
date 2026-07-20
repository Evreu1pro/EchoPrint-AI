"use client";

import { Smartphone, Tablet, Laptop, Tv, Gamepad2, Monitor } from "lucide-react";
import type { DeviceProfile } from "@/lib/fingerprint/device-detector";
import { getOSName } from "@/lib/fingerprint/device-detector";

interface DeviceBadgeProps {
  profile: DeviceProfile;
}

const deviceConfig = {
  mobile: {
    icon: Smartphone,
    color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
    label: "Mobile",
  },
  tablet: {
    icon: Tablet,
    color: "bg-sky-500/10 border-sky-500/30 text-sky-400",
    label: "Tablet",
  },
  desktop: {
    icon: Laptop,
    color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    label: "Desktop",
  },
  "smart-tv": {
    icon: Tv,
    color: "bg-orange-500/10 border-orange-500/30 text-orange-400",
    label: "Smart TV",
  },
  console: {
    icon: Gamepad2,
    color: "bg-violet-500/10 border-violet-500/30 text-violet-400",
    label: "Console",
  },
  unknown: {
    icon: Monitor,
    color: "bg-zinc-500/10 border-zinc-600 text-zinc-400",
    label: "Unknown device",
  },
};

export function DeviceBadge({ profile }: DeviceBadgeProps) {
  const config = deviceConfig[profile.type] || deviceConfig.unknown;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-3 rounded-xl border px-4 py-3 ${config.color}`}>
      <Icon className="h-6 w-6" />
      <div>
        <div className="text-sm font-medium">Detected: {config.label}</div>
        <div className="text-xs opacity-70">
          {profile.formFactor} · {getOSName(profile.os)} · {profile.screenClass.toUpperCase()}
        </div>
      </div>
      <div className="ml-4 rounded bg-black/30 px-2 py-1 font-mono text-xs">
        {profile.confidence}% conf.
      </div>
    </div>
  );
}

export function DeviceInfoCard({ profile }: DeviceBadgeProps) {
  const config = deviceConfig[profile.type] || deviceConfig.unknown;
  const Icon = config.icon;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${config.color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-100">{config.label}</h3>
          <p className="text-sm text-zinc-500">
            {getOSName(profile.os)} · {profile.formFactor}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Row label="Type" value={profile.type} />
        <Row label="OS" value={getOSName(profile.os)} />
        <Row label="Touch" value={profile.isTouch ? "Yes" : "No"} />
        <Row label="Battery" value={profile.hasBattery ? "Yes" : "No"} />
        <Row label="Cellular" value={profile.hasCellular ? "Yes" : "No"} />
        <Row label="Confidence" value={`${profile.confidence}%`} />
      </div>

      {profile.detectedVia.length > 0 && (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="mb-2 text-xs text-zinc-500">Detection methods</p>
          <div className="flex flex-wrap gap-1">
            {profile.detectedVia.slice(0, 5).map((method, i) => (
              <span key={i} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {method}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className="capitalize text-zinc-200">{value}</span>
    </div>
  );
}

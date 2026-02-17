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
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-400', 
    label: 'Мобильное устройство' 
  },
  tablet: { 
    icon: Tablet, 
    color: 'bg-purple-500/10 border-purple-500/30 text-purple-400', 
    label: 'Планшет' 
  },
  desktop: { 
    icon: Laptop, 
    color: 'bg-green-500/10 border-green-500/30 text-green-400', 
    label: 'Компьютер' 
  },
  'smart-tv': { 
    icon: Tv, 
    color: 'bg-orange-500/10 border-orange-500/30 text-orange-400', 
    label: 'Smart TV' 
  },
  console: { 
    icon: Gamepad2, 
    color: 'bg-pink-500/10 border-pink-500/30 text-pink-400', 
    label: 'Игровая консоль' 
  },
  unknown: { 
    icon: Monitor, 
    color: 'bg-muted/50 border-muted text-muted-foreground', 
    label: 'Неизвестное устройство' 
  }
};

export function DeviceBadge({ profile }: DeviceBadgeProps) {
  const config = deviceConfig[profile.type] || deviceConfig.unknown;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl border ${config.color}`}>
      <Icon className="w-6 h-6" />
      <div>
        <div className="text-sm font-medium">Обнаружено: {config.label}</div>
        <div className="text-xs opacity-70">
          {profile.formFactor} • {getOSName(profile.os)} • {profile.screenClass.toUpperCase()}
        </div>
      </div>
      <div className="ml-4 px-2 py-1 rounded bg-black/30 text-xs font-mono">
        {profile.confidence}% уверенность
      </div>
    </div>
  );
}

// Detailed device info component
export function DeviceInfoCard({ profile }: DeviceBadgeProps) {
  const config = deviceConfig[profile.type] || deviceConfig.unknown;
  const Icon = config.icon;

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${config.color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold">{config.label}</h3>
          <p className="text-sm text-muted-foreground">
            {getOSName(profile.os)} • {profile.formFactor}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Тип:</span>
          <span className="capitalize">{profile.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">ОС:</span>
          <span>{getOSName(profile.os)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Touch:</span>
          <span className={profile.isTouch ? 'text-green-500' : 'text-muted-foreground'}>
            {profile.isTouch ? 'Да' : 'Нет'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Battery:</span>
          <span className={profile.hasBattery ? 'text-green-500' : 'text-muted-foreground'}>
            {profile.hasBattery ? 'Да' : 'Нет'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cellular:</span>
          <span className={profile.hasCellular ? 'text-blue-500' : 'text-muted-foreground'}>
            {profile.hasCellular ? 'Да' : 'Нет'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Уверенность:</span>
          <span className="text-primary font-mono">{profile.confidence}%</span>
        </div>
      </div>

      {profile.detectedVia.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Методы определения:</p>
          <div className="flex flex-wrap gap-1">
            {profile.detectedVia.slice(0, 5).map((method, i) => (
              <span 
                key={i}
                className="px-2 py-0.5 bg-muted rounded text-xs"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

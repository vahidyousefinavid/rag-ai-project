import type { ComponentType } from 'react';
import {
  DropletIcon, CircleIcon, DiscIcon, FilterIcon, ZapIcon, SettingsIcon, LinkIcon,
  BatteryIcon, WrenchIcon, SnowflakeIcon, PaintbrushIcon, GaugeIcon, FileTextIcon,
} from './icons';

export type IconComp = ComponentType<{ size?: number }>;

export const SERVICE_META: Record<string, { color: string; icon: IconComp }> = {
  'تعویض روغن موتور': { color: '#FBBF24', icon: DropletIcon },
  'تعویض لاستیک':     { color: '#60A5FA', icon: CircleIcon },
  'تعمیر ترمز':       { color: '#F87171', icon: DiscIcon },
  'تعویض فیلتر هوا':  { color: '#34D399', icon: FilterIcon },
  'تعویض شمع':        { color: '#A78BFA', icon: ZapIcon },
  'سرویس گیربکس':     { color: '#818CF8', icon: SettingsIcon },
  'تعویض تایمینگ':    { color: '#F472B6', icon: LinkIcon },
  'تعویض باتری':      { color: '#FB923C', icon: BatteryIcon },
  'تنظیم موتور':      { color: '#2DD4BF', icon: WrenchIcon },
  'سرویس کولر':       { color: '#22D3EE', icon: SnowflakeIcon },
  'صافکاری و رنگ':    { color: '#C084FC', icon: PaintbrushIcon },
  'سرویس جلوبندی':    { color: '#A3E635', icon: GaugeIcon },
  'سایر':             { color: '#94A3B8', icon: FileTextIcon },
};

export function svcMeta(type: string) {
  return SERVICE_META[type] ?? { color: '#22C55E', icon: WrenchIcon };
}

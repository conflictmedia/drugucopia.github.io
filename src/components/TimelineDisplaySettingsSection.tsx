"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select } from "@/components/ui/select";
import {
  Layers,
  Eye,
  EyeOff,
  Grid,
  Braces,
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
  Activity,
} from "lucide-react";
import { useTimelineDisplayStore } from "@/store/timeline-display-store";
import { toast } from "@/hooks/use-toast";
import type { DisplayMode, RedoseCombining, SubstanceHeight, CurveStyle, OpacityValue } from "@/store/timeline-display-store";

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}

export function TimelineDisplaySettingsSection() {
  const {
    settings,
    updateSettings,
    initialize,
    resetToDefaults,
  } = useTimelineDisplayStore();

  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleUpdateSetting = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K],
  ) => {
    updateSettings({ [key]: value });
    toast({
      title: "Setting updated",
      description: `${key} set to ${String(value)}`,
    });
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    toast({ title: "Settings reset to defaults" });
  };

  return (
    <Card className="py-3 gap-2">
      <CardHeader className="pb-1">
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Timeline Display
        </CardTitle>
        <CardDescription>
          Configure how the intensity timeline visualizes substance data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Display Mode ── */}
        <div className="space-y-2">
          <Label className="text-sm font-medium block">Display Mode</Label>
          <p className="text-xs text-neutral-content">
            Choose how multiple substances are displayed on the timeline
          </p>
          <Select
            value={settings.displayMode}
            onChange={(e) => handleUpdateSetting("displayMode", e.target.value as DisplayMode)}
            className="w-full max-w-xs"
          >
            <option value="separate">Separate Cards — One chart per substance with independent Y-axes</option>
            <option value="overlay">Overlay — All substances on single chart, shared Y-axis</option>
            <option value="normalized">Normalized Overlay — Overlay + all curves normalized to common max</option>
          </Select>
        </div>

        {/* ── Overlay-Specific Options (only visible in overlay/normalized mode) ── */}
        {(settings.displayMode === "overlay" || settings.displayMode === "normalized") && (
          <div className="space-y-4 p-3 rounded-lg bg-base-200/50 border border-base-300">
            <h4 className="text-xs font-medium text-neutral-content uppercase tracking-wide mb-3">
              Overlay Options
            </h4>

            {/* Redose Combining */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium block">Redose Combining</Label>
                <p className="text-xs text-neutral-content">
                  How to display multiple doses of the same substance
                </p>
              </div>
              <Select
                value={settings.redoseCombining}
                onChange={(e) => handleUpdateSetting("redoseCombining", e.target.value as RedoseCombining)}
                className="w-full max-w-xs"
              >
                <option value="individual">Individual — Show each redose as separate curve</option>
                <option value="cumulative">Cumulative — Combine into single cumulative curve per substance</option>
              </Select>
            </div>

            {/* Substance Height */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium block">Substance Height</Label>
                <p className="text-xs text-neutral-content">
                  How to scale different substances vertically
                </p>
              </div>
              <Select
                value={settings.substanceHeight}
                onChange={(e) => handleUpdateSetting("substanceHeight", e.target.value as SubstanceHeight)}
                className="w-full max-w-xs"
              >
                <option value="independent">Independent — Each substance keeps its visual height (dose-scaled)</option>
                <option value="normalized">Normalized — All substances normalized to common max intensity</option>
              </Select>
            </div>

            {/* Toggle options */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <label className="flex items-center justify-between gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-200/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-neutral-content" />
                  <div>
                    <p className="text-sm font-medium">Phase Bands</p>
                    <p className="text-xs text-neutral-content">Onset/comeup/peak/offset backgrounds</p>
                  </div>
                </div>
                <Button
                  variant={settings.showPhaseBands ? "default" : "outline"}
                  size="sm"
                  className="gap-1 shrink-0"
                  onClick={() => handleUpdateSetting("showPhaseBands", !settings.showPhaseBands)}
                >
                  {settings.showPhaseBands ? "On" : "Off"}
                </Button>
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-200/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Grid className="h-4 w-4 text-neutral-content" />
                  <div>
                    <p className="text-sm font-medium">Night Bands</p>
                    <p className="text-xs text-neutral-content">10pm–6am shaded bands</p>
                  </div>
                </div>
                <Button
                  variant={settings.showNightBands ? "default" : "outline"}
                  size="sm"
                  className="gap-1 shrink-0"
                  onClick={() => handleUpdateSetting("showNightBands", !settings.showNightBands)}
                >
                  {settings.showNightBands ? "On" : "Off"}
                </Button>
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-200/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Now Indicator</p>
                    <p className="text-xs text-neutral-content">Pulsing red "now" line</p>
                  </div>
                </div>
                <Button
                  variant={settings.showNowIndicator ? "default" : "outline"}
                  size="sm"
                  className="gap-1 shrink-0"
                  onClick={() => handleUpdateSetting("showNowIndicator", !settings.showNowIndicator)}
                >
                  {settings.showNowIndicator ? "On" : "Off"}
                </Button>
              </label>
            </div>
          </div>
        )}

        <Separator className="my-1" />

        {/* ── Visual Style Options (Always Visible) ── */}
        <div className="space-y-4">
          <h4 className="text-xs font-medium text-neutral-content uppercase tracking-wide">
            Visual Style
          </h4>

          {/* Curve Style */}
          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium block">Curve Style</Label>
              <p className="text-xs text-neutral-content">
                How intensity curves are rendered
              </p>
            </div>
            <Select
              value={settings.curveStyle}
              onChange={(e) => handleUpdateSetting("curveStyle", e.target.value as CurveStyle)}
              className="w-full max-w-xs"
            >
              <option value="smooth">Smooth — Catmull-Rom smoothing</option>
              <option value="stepped">Stepped — Step-after line style</option>
            </Select>
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium block">Area Fill Opacity</Label>
              <p className="text-xs text-neutral-content">
                Opacity of the filled area under curves
              </p>
            </div>
            <Select
              value={settings.opacity}
              onChange={(e) => handleUpdateSetting("opacity", parseFloat(e.target.value) as OpacityValue)}
              className="w-full max-w-xs"
            >
              <option value={1.0}>100% — Full opacity</option>
              <option value={0.8}>80% — Slightly transparent</option>
              <option value={0.6}>60% — Moderately transparent</option>
              <option value={0.4}>40% — Mostly transparent</option>
            </Select>
          </div>

          {/* Grid Lines */}
          <label className="flex items-center justify-between gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-200/50 transition-colors">
            <div className="flex items-center gap-2">
              <Grid className="h-4 w-4 text-neutral-content" />
              <div>
                <p className="text-sm font-medium">Grid Lines</p>
                <p className="text-xs text-neutral-content">Horizontal grid lines on the chart</p>
              </div>
            </div>
            <Button
              variant={settings.showGridLines ? "default" : "outline"}
              size="sm"
              className="gap-1 shrink-0"
              onClick={() => handleUpdateSetting("showGridLines", !settings.showGridLines)}
            >
              {settings.showGridLines ? "On" : "Off"}
            </Button>
          </label>
        </div>

        <Separator className="my-1" />

        {/* ── Advanced / Collapsible ── */}
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-base-200/50 transition-colors">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-neutral-content group-open:rotate-180 transition-transform" />
              <span className="text-sm font-medium">Advanced Options</span>
            </div>
            <span className="text-xs text-neutral-content">Same-dose combos, combo tooltip behavior</span>
          </summary>
          <div className="space-y-3 pt-2 border-t border-base-300">
            <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-base-200/50">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-info" />
                <div className="text-xs text-base-content/80">
                  <p className="font-medium">Same-Dose Combination (2 min window)</p>
                  <p>Doses within 2 minutes of each other are automatically grouped into combo entries like "MDMA + Cannabis (100mg + 20mg)". Combined intensity uses soft log dampening.</p>
                </div>
              </div>
            </div>
          </div>
        </details>

        {/* ── Reset to defaults ── */}
        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-neutral-content hover:text-error"
            onClick={handleResetDefaults}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface WatcherWindowProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export default function WatcherWindow({
  children,
  title,
  subtitle,
  onRefresh,
}: WatcherWindowProps) {
  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">{title}</CardTitle>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Briefcase,
  FileText,
  GitPullRequest,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/supabase";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function DashboardPage() {
  const {
    data: metrics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["metrics-summary"],
    queryFn: () => db.getMetricsSummary(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">
            Failed to load metrics:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const successRate =
    metrics.total_jobs > 0
      ? ((metrics.completed_jobs / metrics.total_jobs) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of Cloud Vibecoder metrics
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={metrics.total_users}
          icon={Users}
          description="Registered users"
        />
        <StatCard
          title="Total Jobs"
          value={metrics.total_jobs}
          icon={Briefcase}
          description="Coding agent executions"
        />
        <StatCard
          title="Plans Generated"
          value={metrics.total_plans}
          icon={FileText}
          description="Implementation plans"
        />
        <StatCard
          title="Pull Requests"
          value={metrics.total_prs}
          icon={GitPullRequest}
          description="PRs created"
        />
      </div>

      {/* Job Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Completed Jobs"
          value={metrics.completed_jobs}
          icon={CheckCircle}
          description="Successfully finished"
        />
        <StatCard
          title="Failed Jobs"
          value={metrics.failed_jobs}
          icon={XCircle}
          description="Execution failures"
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={Zap}
          description="Job completion rate"
        />
        <StatCard
          title="Avg Execution Time"
          value={formatTime(metrics.avg_execution_time_seconds)}
          icon={Clock}
          description="Per job average"
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Total Tokens Used</span>
              <span className="font-semibold">
                {formatNumber(metrics.total_tokens_used)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">
                Total Execution Time
              </span>
              <span className="font-semibold">
                {formatTime(metrics.total_execution_time_seconds)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Total Files Changed</span>
              <span className="font-semibold">
                {formatNumber(metrics.total_files_changed)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/users"
              className="block p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center">
                <Users className="w-5 h-5 text-primary mr-3" />
                <span className="font-medium">View All Users</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 ml-8">
                Manage users and their permissions
              </p>
            </a>
            <a
              href="/jobs"
              className="block p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center">
                <Briefcase className="w-5 h-5 text-primary mr-3" />
                <span className="font-medium">View All Jobs</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 ml-8">
                Monitor job execution and status
              </p>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

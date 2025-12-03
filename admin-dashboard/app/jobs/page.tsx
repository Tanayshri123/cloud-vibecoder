"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { db, User } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard-layout";

export default function JobsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { auth } = await import("@/lib/supabase");
        const session = await auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          return;
        }
      } catch {}
      setIsAuthenticated(false);
    };
    checkAuth();
  }, []);

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => db.getJobs(),
    enabled: isAuthenticated === true,
  });

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    return null;
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "failed":
        return "destructive";
      case "cancelled":
        return "secondary";
      default:
        return "warning";
    }
  };

  return (
    <DashboardLayout onLogout={() => setIsAuthenticated(false)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">All coding agent job executions</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load jobs</p>
            </CardContent>
          </Card>
        )}

        {jobs && (
          <Card>
            <CardHeader>
              <CardTitle>All Jobs ({jobs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Job ID</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Repository</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Files</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tokens</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-sm">
                          {job.job_id.slice(0, 8)}...
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">{job.repo_url?.split("/").slice(-2).join("/") || "-"}</div>
                          <div className="text-xs text-muted-foreground">{job.branch}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getStatusVariant(job.status) as any}>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{job.files_changed}</td>
                        <td className="py-3 px-4">{job.tokens_used.toLocaleString()}</td>
                        <td className="py-3 px-4">{job.execution_time_seconds.toFixed(1)}s</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {format(new Date(job.created_at), "MMM d, HH:mm")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

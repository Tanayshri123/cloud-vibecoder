"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { db, User } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard-layout";

export default function PRsPage() {
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

  const { data: prs, isLoading, error } = useQuery({
    queryKey: ["prs"],
    queryFn: () => db.getPRs(),
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

  const getStateVariant = (state: string) => {
    switch (state) {
      case "open":
        return "success";
      case "merged":
        return "default";
      case "closed":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <DashboardLayout onLogout={() => setIsAuthenticated(false)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pull Requests</h1>
          <p className="text-muted-foreground">All created pull requests</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load pull requests</p>
            </CardContent>
          </Card>
        )}

        {prs && (
          <Card>
            <CardHeader>
              <CardTitle>All Pull Requests ({prs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">PR</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Repository</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Branch</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">State</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prs.map((pr) => (
                      <tr key={pr.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">#{pr.pr_number}</td>
                        <td className="py-3 px-4">{pr.repo_owner}/{pr.repo_name}</td>
                        <td className="py-3 px-4 max-w-xs truncate">{pr.title}</td>
                        <td className="py-3 px-4">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {pr.head_branch} → {pr.base_branch}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getStateVariant(pr.state) as any}>
                            {pr.state}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {format(new Date(pr.created_at), "MMM d, HH:mm")}
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={pr.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
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

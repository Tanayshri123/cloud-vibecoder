"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { db, User } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard-layout";

export default function PlansPage() {
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

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ["plans"],
    queryFn: () => db.getPlans(),
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

  const getComplexityVariant = (score: number) => {
    if (score <= 3) return "success";
    if (score <= 6) return "warning";
    return "destructive";
  };

  return (
    <DashboardLayout onLogout={() => setIsAuthenticated(false)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
          <p className="text-muted-foreground">All generated implementation plans</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load plans</p>
            </CardContent>
          </Card>
        )}

        {plans && (
          <Card>
            <CardHeader>
              <CardTitle>All Plans ({plans.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Complexity</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Confidence</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Steps</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Files</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Model</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr key={plan.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 max-w-xs truncate">{plan.plan_title}</td>
                        <td className="py-3 px-4">
                          <Badge variant={getComplexityVariant(plan.complexity_score) as any}>
                            {plan.complexity_score}/10
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{(plan.confidence_score * 100).toFixed(0)}%</td>
                        <td className="py-3 px-4">{plan.steps_count}</td>
                        <td className="py-3 px-4">{plan.files_to_change_count}</td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">{plan.model_used}</td>
                        <td className="py-3 px-4">{(plan.processing_time_ms / 1000).toFixed(1)}s</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {format(new Date(plan.created_at), "MMM d, HH:mm")}
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

"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import { db, User, auth } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DashboardLayout from "@/components/dashboard-layout";

export default function UsersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
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

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => db.getUsers(),
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

  return (
    <DashboardLayout onLogout={() => setIsAuthenticated(false)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage users and view their activity</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load users</p>
            </CardContent>
          </Card>
        )}

        {users && (
          <Card>
            <CardHeader>
              <CardTitle>All Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">User ID</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Login</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.github_avatar_url || undefined} />
                              <AvatarFallback>
                                {user.github_login.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.github_name || user.github_login}</div>
                              <div className="text-sm text-muted-foreground">@{user.github_login}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">{user.id}</td>
                        <td className="py-3 px-4 text-muted-foreground">{user.github_email || "-"}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {format(new Date(user.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {user.last_login_at ? format(new Date(user.last_login_at), "MMM d, HH:mm") : "-"}
                        </td>
                        <td className="py-3 px-4">
                          {user.is_admin ? (
                            <Badge variant="default" className="gap-1">
                              <Shield className="w-3 h-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <ShieldOff className="w-3 h-3" />
                              User
                            </Badge>
                          )}
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

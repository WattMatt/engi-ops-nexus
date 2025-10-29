import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Mail, Shield, User, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";
import { ManageUserDialog } from "@/components/users/ManageUserDialog";
import { UserActivityList } from "@/components/users/UserActivityList";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDistanceToNow } from "date-fns";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  status?: string;
  last_login_at?: string;
  login_count?: number;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Get all profiles with activity data
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, status, last_login_at, login_count")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Get roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.id)?.role || "user",
      })) || [];

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      active: { variant: "default" as const, icon: CheckCircle, text: "Active" },
      pending_verification: { variant: "secondary" as const, icon: AlertCircle, text: "Pending" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_verification;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and permissions
          </p>
        </div>
        <InviteUserDialog onInvited={loadUsers} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? 'user' : 'users'} registered
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
              <Collapsible
                key={user.id}
                open={expandedUserId === user.id}
                onOpenChange={(open) => setExpandedUserId(open ? user.id : null)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 rounded-full bg-primary/10">
                          {user.role === 'admin' ? (
                            <Shield className="h-5 w-5 text-primary" />
                          ) : user.role === 'moderator' ? (
                            <Users className="h-5 w-5 text-primary" />
                          ) : (
                            <User className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{user.full_name}</p>
                            <Badge variant={user.role === 'admin' ? 'default' : user.role === 'moderator' ? 'default' : 'secondary'}>
                              {user.role || 'user'}
                            </Badge>
                            {getStatusBadge(user.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                            {user.last_login_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last login: {formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })}
                              </div>
                            )}
                            {user.login_count !== undefined && user.login_count > 0 && (
                              <span className="text-xs">
                                {user.login_count} {user.login_count === 1 ? 'login' : 'logins'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ManageUserDialog user={user} onUpdated={loadUsers}>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </ManageUserDialog>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 border-t bg-muted/20">
                      <UserActivityList userId={user.id} userName={user.full_name} />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;

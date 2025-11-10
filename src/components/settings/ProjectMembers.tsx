import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Trash2, Users, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface ProjectMembersProps {
  projectId: string;
}

export function ProjectMembers({ projectId }: ProjectMembersProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [loading, setLoading] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    loadMembers();
    loadAvailableUsers();
  }, [projectId]);

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from("project_members")
      .select(`
        id,
        user_id,
        role,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq("project_id", projectId);

    if (error) {
      toast.error("Failed to load project members");
      return;
    }

    setMembers(data as any);
  };

  const loadAvailableUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    if (error) {
      toast.error("Failed to load users");
      return;
    }

    setAvailableUsers(data as User[]);
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    // Check if user is already a member
    const existing = members.find((m) => m.user_id === selectedUserId);
    if (existing) {
      toast.error("User is already a project member");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("project_members").insert({
        project_id: projectId,
        user_id: selectedUserId,
        role: selectedRole,
      });

      if (error) throw error;

      toast.success("Member added successfully");
      setSelectedUserId("");
      setSelectedRole("member");
      loadMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member removed successfully");
      loadMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("project_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Role updated successfully");
      loadMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "editor":
        return "secondary";
      default:
        return "outline";
    }
  };

  const nonMembers = availableUsers.filter(
    (user) => !members.some((m) => m.user_id === user.id)
  );

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);

  const filteredUsers = nonMembers.filter((user) =>
    user.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Project Team</h3>
        <Badge variant="secondary" className="ml-auto">
          {members.length} {members.length === 1 ? "member" : "members"}
        </Badge>
      </div>

      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Add team members for messaging and task collaboration
          </p>
          <div className="flex gap-2">
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userSearchOpen}
                  className="flex-1 justify-between"
                >
                  {selectedUser ? (
                    <span className="truncate">
                      {selectedUser.full_name} ({selectedUser.email})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Search and select user...
                    </span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search users by name or email..." 
                    value={userSearch}
                    onValueChange={setUserSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup heading="Available Users">
                      {filteredUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.id}
                          onSelect={() => {
                            setSelectedUserId(user.id);
                            setUserSearchOpen(false);
                            setUserSearch("");
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{user.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleAddMember}
              disabled={loading || !selectedUserId}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No members assigned to this project yet
            </CardContent>
          </Card>
        ) : (
          members.map((member) => (
            <Card key={member.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{member.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.profiles.email}
                    </p>
                  </div>

                  <Select
                    value={member.role}
                    onValueChange={(newRole) =>
                      handleUpdateRole(member.id, newRole)
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>

                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {member.role}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

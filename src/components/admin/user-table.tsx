"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES, DEPARTMENTS } from "@/lib/constants";

interface User {
  id: string;
  name: string;
  email: string;
  role: keyof typeof ROLES;
  department: keyof typeof DEPARTMENTS | null;
  isActive: boolean;
  createdAt: string;
}

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onToggleActive: (userId: string, isActive: boolean) => void;
  onDelete: (userId: string) => void;
  isLoading?: boolean;
}

const getRoleBadgeColor = (role: string) => {
  const colors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-800 border-red-200",
    MANAGER: "bg-purple-100 text-purple-800 border-purple-200",
    SECRETARIAL_STAFF: "bg-blue-100 text-blue-800 border-blue-200",
    ACCOUNTING_STAFF: "bg-green-100 text-green-800 border-green-200",
    TAX_STAFF: "bg-amber-100 text-amber-800 border-amber-200",
    AUDIT_STAFF: "bg-teal-100 text-teal-800 border-teal-200",
  };
  return colors[role] || colors.ADMIN;
};

const formatRoleLabel = (role: string) => {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDepartmentLabel = (dept: string | null) => {
  if (!dept) return "N/A";
  return dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export function UserTable({
  users,
  onEdit,
  onToggleActive,
  onDelete,
  isLoading,
}: UserTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">No users found</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={getRoleBadgeColor(user.role)}
                >
                  {formatRoleLabel(user.role)}
                </Badge>
              </TableCell>
              <TableCell>{formatDepartmentLabel(user.department)}</TableCell>
              <TableCell>
                <Badge
                  variant={user.isActive ? "secondary" : "outline"}
                  className={
                    user.isActive
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-gray-100 text-gray-800 border-gray-200"
                  }
                >
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="sm">
                      ⋮
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onToggleActive(user.id, !user.isActive)}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(user.id)}
                      className="text-destructive"
                    >
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

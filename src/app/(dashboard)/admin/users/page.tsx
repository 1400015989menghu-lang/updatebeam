"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserTable } from "@/components/admin/user-table";
import { UserForm } from "@/components/admin/user-form";
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, roleFilter, departmentFilter, searchQuery, statusFilter]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        // Show mock data if API not available
        setUsers(getMockUsers());
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      // Show mock data on error
      setUsers(getMockUsers());
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter((user) => user.department === departmentFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (user) => user.isActive === (statusFilter === "active")
      );
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormOpen(true);
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        loadUsers();
      } else {
        throw new Error("Failed to update user status");
      }
    } catch (error) {
      console.error("Failed to toggle user status:", error);
      alert("Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadUsers();
      } else {
        throw new Error("Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user");
    }
  };

  const handleFormSave = () => {
    loadUsers();
  };

  const formatRoleLabel = (role: string) => {
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDepartmentLabel = (dept: string) => {
    return dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div>
      <Header
        title="Users & Roles"
        description="Manage user accounts, roles, and permissions"
        action={<Button onClick={handleCreateUser}>Create User</Button>}
      />

      <div className="p-6 space-y-6">
        {/* Filter Bar */}
        <div className="bg-card border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Role Filter */}
            <div className="space-y-2">
              <Label htmlFor="role-filter" className="text-xs">
                Role
              </Label>
              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value || "all")}
              >
                <SelectTrigger id="role-filter">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.keys(ROLES).map((role) => (
                    <SelectItem key={role} value={role}>
                      {formatRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <Label htmlFor="department-filter" className="text-xs">
                Department
              </Label>
              <Select
                value={departmentFilter}
                onValueChange={(value) => setDepartmentFilter(value || "all")}
              >
                <SelectTrigger id="department-filter">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {Object.keys(DEPARTMENTS).map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {formatDepartmentLabel(dept)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status-filter" className="text-xs">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value || "all")}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-xs">
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </p>
          {(roleFilter !== "all" ||
            departmentFilter !== "all" ||
            statusFilter !== "all" ||
            searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRoleFilter("all");
                setDepartmentFilter("all");
                setStatusFilter("all");
                setSearchQuery("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* User Table */}
        <UserTable
          users={filteredUsers}
          onEdit={handleEditUser}
          onToggleActive={handleToggleActive}
          onDelete={handleDeleteUser}
          isLoading={isLoading}
        />
      </div>

      {/* User Form Dialog */}
      <UserForm
        user={selectedUser}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleFormSave}
      />
    </div>
  );
}

// Mock data for development
function getMockUsers(): User[] {
  return [
    {
      id: "user-001",
      name: "John Doe",
      email: "john.doe@example.com",
      role: "ADMIN",
      department: "MANAGEMENT",
      isActive: true,
      createdAt: new Date(2023, 0, 15).toISOString(),
    },
    {
      id: "user-002",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      role: "MANAGER",
      department: "SECRETARIAL",
      isActive: true,
      createdAt: new Date(2023, 1, 20).toISOString(),
    },
    {
      id: "user-003",
      name: "Mike Johnson",
      email: "mike.johnson@example.com",
      role: "SECRETARIAL_STAFF",
      department: "SECRETARIAL",
      isActive: true,
      createdAt: new Date(2023, 2, 10).toISOString(),
    },
    {
      id: "user-004",
      name: "Sarah Lee",
      email: "sarah.lee@example.com",
      role: "ACCOUNTING_STAFF",
      department: "ACCOUNTING",
      isActive: true,
      createdAt: new Date(2023, 3, 5).toISOString(),
    },
    {
      id: "user-005",
      name: "Tom Brown",
      email: "tom.brown@example.com",
      role: "TAX_STAFF",
      department: "TAX",
      isActive: false,
      createdAt: new Date(2023, 4, 18).toISOString(),
    },
    {
      id: "user-006",
      name: "Emily Davis",
      email: "emily.davis@example.com",
      role: "AUDIT_STAFF",
      department: "AUDIT",
      isActive: true,
      createdAt: new Date(2023, 5, 22).toISOString(),
    },
  ];
}

"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CASE_STATUS, CASE_STATUS_LABELS, DEPARTMENTS, DEPARTMENT_LABELS, PRIORITY } from "@/lib/constants";
import { Search } from "lucide-react";

interface CaseFiltersProps {
  filters: {
    department: string;
    status: string;
    priority: string;
    search: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

export function CaseFilters({ filters, onFilterChange }: CaseFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search cases..."
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={filters.department} onValueChange={(value) => onFilterChange("department", value || "ALL")}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Departments</SelectItem>
          {Object.values(DEPARTMENTS).map((dept) => (
            <SelectItem key={dept} value={dept}>
              {DEPARTMENT_LABELS[dept]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(value) => onFilterChange("status", value || "ALL")}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          {Object.values(CASE_STATUS).map((status) => (
            <SelectItem key={status} value={status}>
              {CASE_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(value) => onFilterChange("priority", value || "ALL")}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Priorities</SelectItem>
          {Object.values(PRIORITY).map((priority) => (
            <SelectItem key={priority} value={priority}>
              {priority.charAt(0) + priority.slice(1).toLowerCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

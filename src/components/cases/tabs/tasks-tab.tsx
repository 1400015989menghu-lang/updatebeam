"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils/case-utils";
import { Plus, Calendar } from "lucide-react";
import { useEffect, useState } from "react";

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
}

interface TasksTabProps {
  caseId: number;
  onUpdate?: () => void;
}

export function TasksTab({ caseId, onUpdate }: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    fetchTasks();
  }, [caseId]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const response = await fetch(`/api/cases/${caseId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchTasks();
        onUpdate?.();
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;

    try {
      const response = await fetch(`/api/cases/${caseId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTask }),
      });

      if (response.ok) {
        setNewTask("");
        await fetchTasks();
        onUpdate?.();
      }
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          />
          <Button onClick={handleAddTask}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tasks.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No tasks yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={task.status === "COMPLETED"}
                  onCheckedChange={() => handleToggleTask(task.id, task.status)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className={`font-medium ${task.status === "COMPLETED" ? "line-through text-gray-500" : ""}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    {task.assignedTo && <span>Assigned to: {task.assignedTo}</span>}
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {formatDate(task.dueDate)}
                      </span>
                    )}
                    <span>Created by {task.createdBy}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

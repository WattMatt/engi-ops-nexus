import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EisenhowerMatrix } from "@/components/tasks/EisenhowerMatrix";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { WeeklyReports } from "@/components/tasks/WeeklyReports";
import { TaskReminders } from "@/components/tasks/TaskReminders";

const TaskManager = () => {
  const projectId = localStorage.getItem("selectedProjectId");

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a project first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Task Manager</h1>
        <p className="text-muted-foreground">
          Organize tasks using the Eisenhower Matrix priority system
        </p>
      </div>

      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="matrix" className="text-base">Matrix</TabsTrigger>
          <TabsTrigger value="list" className="text-base">All Tasks</TabsTrigger>
          <TabsTrigger value="calendar" className="text-base">Calendar</TabsTrigger>
          <TabsTrigger value="reminders" className="text-base">Reminders</TabsTrigger>
          <TabsTrigger value="reports" className="text-base">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-6">
          <EisenhowerMatrix projectId={projectId} />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <TaskList projectId={projectId} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <TaskCalendar projectId={projectId} />
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <TaskReminders projectId={projectId} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <WeeklyReports projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaskManager;
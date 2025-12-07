"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { CalendarView } from "@/components/calendar/CalendarView";

export default function CalendarPage() {
  return (
    <DashboardLayout title="Calendar">
      <CalendarView />
    </DashboardLayout>
  );
}

import React, { useEffect } from "react";
import AvailabilityCalendar from "../../../components/availabilityComponents/availabilityCalendar";
import { useLocalSearchParams } from "expo-router";

export default function AvailabilityPage() {
  const { id } = useLocalSearchParams(); // Get the counselor ID from the route

  useEffect(() => {
    // Log when the component is mounted (i.e., page is navigated to)
    console.log(`User navigated to AvailabilityPage with ID: ${id}`);
  }, [id]); // Dependency on 'id' to log when the ID changes

  return <AvailabilityCalendar counselorId={id as string} />;
}

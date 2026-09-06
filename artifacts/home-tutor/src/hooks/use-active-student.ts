import { useListStudents } from "@workspace/api-client-react";

export function useActiveStudent() {
  const { data: students, isLoading, error } = useListStudents();
  return {
    student: students?.[0] ?? null,
    isLoading,
    error,
  };
}

---
name: react-logic
description: Use for component design, state handling, conditional rendering, decomposition, and readable frontend logic.
---

## react-logic

Apply this skill when working in React components, hooks, or UI state flows.

### Core rules:

- use function components
- keep components focused on one responsibility
- use state and effect hooks deliberately, not by default
- express conditional rendering clearly

### Preferred patterns:

- extract nested markup into child components when readability improves
- move repeated or stateful logic into focused helper functions or hooks
- keep event handlers short and descriptive
- prefer explicit variables over dense chained expressions

### Example:

```tsx
import { useEffect, useState } from "react";

type Student = {
  id: number;
  name: string;
  email: string;
};

function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadStudents() {
      try {
        const response = await fetch("/api/students");

        if (!response.ok) {
          throw new Error("Failed to load students.");
        }

        const data: Student[] = await response.json();
        setStudents(data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadStudents();
  }, []);

  if (isLoading) {
    return <p>Loading students...</p>;
  }

  if (errorMessage) {
    return <p>{errorMessage}</p>;
  }

  return (
    <section>
      <h2>Students</h2>
      <StudentItems students={students} />
    </section>
  );
}

function StudentItems({ students }: { students: Student[] }) {
  if (students.length === 0) {
    return <p>No students found.</p>;
  }

  return (
    <ul>
      {students.map((student) => (
        <li key={student.id}>
          <strong>{student.name}</strong>
          <span>{student.email}</span>
        </li>
      ))}
    </ul>
  );
}
```

Why this fits:

- the parent component handles loading and error state clearly
- conditional rendering is explicit
- list markup is extracted into a focused child component
- state transitions are easy to trace

### Avoid:

- deeply nested JSX branches
- large components that mix fetching, state orchestration, and presentation without boundaries
- class components unless the surrounding code already depends on them
- clever abstractions that make the render path harder to follow

### Definition of done:

- the owning component or hook is easy to identify
- state transitions are readable
- the smallest available validation has been run

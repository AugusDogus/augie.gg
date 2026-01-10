"use client";

import { useEffect, useState } from "react";

const BIRTHDAY = new Date("1998-11-19T00:00:00");

function calculateAge(): number {
  const now = new Date();
  const diffMs = now.getTime() - BIRTHDAY.getTime();
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  return diffMs / msPerYear;
}

export function AgeCounter() {
  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
    setAge(calculateAge());

    const interval = setInterval(() => {
      setAge(calculateAge());
    }, 50);

    return () => clearInterval(interval);
  }, []);

  if (age === null) {
    return (
      <span className="text-muted-foreground tabular-nums">Loading...</span>
    );
  }

  return (
    <span className="text-muted-foreground tabular-nums">
      {age.toFixed(9)} years old
    </span>
  );
}

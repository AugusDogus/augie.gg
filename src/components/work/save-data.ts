/** Save-Data, where the browser reports it. */
export function savesData(): boolean {
  if (!("connection" in navigator)) return false;
  const connection: unknown = navigator.connection;
  return (
    typeof connection === "object" &&
    connection !== null &&
    "saveData" in connection &&
    connection.saveData === true
  );
}

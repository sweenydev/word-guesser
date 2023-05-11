export function formatTime(timeInMs: number): string {
  const totalSecondsLeft = Math.floor(timeInMs / 1000);
  const minutes = Math.floor(totalSecondsLeft / 60);
  const seconds = totalSecondsLeft % 60;
  const millis = timeInMs % 1000 / 100;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis)}`;
};
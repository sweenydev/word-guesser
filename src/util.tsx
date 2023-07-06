export function formatTime(timeInMs: number, wholeNumber?: boolean): string {
  const totalSecondsLeft = Math.floor(timeInMs / 1000);
  const minutes = Math.floor(totalSecondsLeft / 60);
  const seconds = totalSecondsLeft % 60;
  const millis = Math.floor(timeInMs % 1000 / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}${wholeNumber ? `` : `.${String(millis)}`}`;
};
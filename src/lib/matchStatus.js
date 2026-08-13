export function statusVariant(status) {
  switch (status) {
    case "completed":
      return "green";
    case "live":
      return "amber";
    case "bye":
      return "slate";
    default:
      return "default";
  }
}

export function statusLabel(status) {
  switch (status) {
    case "completed":
      return "Completed";
    case "live":
      return "In progress";
    case "bye":
      return "Bye";
    default:
      return "Scheduled";
  }
}

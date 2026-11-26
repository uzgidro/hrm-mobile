// Sanatorium, mobile parity round: sanPlaces texts (journey, housekeeping, transfers, waitlist, broadcasts, territory, info, switches).
export default {
  journey: {
    keyHint: "Latin letters, digits and _ (cannot be changed)",
    triggerHint: "When the event happens, the guest moves to this stage",
    manualOnly: "Manual only",
  },
  hk: {
    oos: "Closed",
    auto: "auto",
    anyAssignee: "All assignees",
    assigneeHint: "Only staff with the housekeeper role",
    floorN: "Floor {{n}}",
    openN: "Tasks: {{n}}",
  },
  transfer: {
    carAndDriver: "Vehicle / driver",
    driverRequired: "Specify a vehicle or a driver name",
    peopleRange: "People: from 1 to 20",
    vehicleReadonly: "Vehicle and driver",
    notSet: "Not assigned",
    confirm: "Confirm",
    confirmed: "Transfer confirmed",
  },
  waitlist: {
    requestN: "Request #{{n}}",
    offersN: "Offers: {{n}}",
    phoneInvalid: "Phone must be +998 and 9 digits",
    convertTitle: "{{name}}: assign a place",
    convertHint: "Period: {{period}}. In the next step you check the guest and pick a room.",
    birthFuture: "Birth date cannot be in the future",
  },
  bc: {
    createdBy: "Sent by",
    noReachable: "No guests with Telegram: nothing to send",
    skippedHint: "Guests without Telegram are skipped",
    sentOf: "Sent: {{n}} / {{total}}",
    history: "Broadcast history",
    skippedN: "Skipped: {{n}}",
    failedN: "Failed: {{n}}",
  },
  territory: {
    floorInvalid: "Floor: a whole number from -5 to 100",
  },
  info: {
    bodyRequired: "Enter the Uzbek text",
    titleRequired: "Enter the Uzbek title",
  },
  feat: {
    lead: "A switched-off section disappears from the menu, the guest cabinet and the bot. The data is kept.",
    on: "On",
    off: "Off",
    group: {
      existing: "Main features",
      content: "Guest journey, map, content",
      catalog: "Catalog and payments",
      ops: "Operations",
      other: "Other",
    },
  },
};

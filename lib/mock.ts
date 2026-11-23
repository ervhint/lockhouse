// Prototype data. Every changing value is a {placeholder}, never a made-up name or number.
// The BFF routes under app/api serve the same objects, so P6 swaps the source, not the pages.
export const members = Array.from({ length: 3 }, (_, i) => ({
  id: String(i + 1),
  name: "{memberName}",
  address: "{qorAddress}",
}));

export const items = Array.from({ length: 3 }, (_, i) => ({
  id: String(i + 1),
  title: "{itemTitle}",
  sender: "{senderName}",
  date: "{date}",
  readers: "{readerCount}",
}));

export const house = { members, items };

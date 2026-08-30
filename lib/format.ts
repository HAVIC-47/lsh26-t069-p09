export const taka = (n: number) =>
  `Tk ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const km = (n: number) => `${n.toLocaleString("en-US")} km`;

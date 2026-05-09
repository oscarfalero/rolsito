export const CLASS_BASE_HP: Record<string, number> = {
  fighter: 10,
  wizard: 6,
  rogue: 8,
  cleric: 8,
  ranger: 10,
  paladin: 10,
  barbarian: 12,
  bard: 8,
};

export function calculateModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

export function calculateMaxHp(className: string, level: number, con: number): number {
  const baseHp = CLASS_BASE_HP[className.toLowerCase()] || 8;
  const conMod = calculateModifier(con);
  return Math.max(1, baseHp + conMod * level);
}

export function calculateAc(dex: number): number {
  return Math.max(0, 10 + calculateModifier(dex));
}

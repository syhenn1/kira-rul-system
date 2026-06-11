export type SummaryAsset = {
  id: string;
  name: string;
  brand: string;
  category: string;
  status: string;
  pred_rul: number | null;
};

export const criticalAsset = (overrides: Partial<SummaryAsset> = {}): SummaryAsset => ({
  id: 'asset-critical-1',
  name: 'AC Split Lobby Lt. 2',
  brand: 'Daikin',
  category: 'Mechanical',
  status: 'Active',
  pred_rul: 90,
  ...overrides,
});

export const healthyAsset = (overrides: Partial<SummaryAsset> = {}): SummaryAsset => ({
  id: 'asset-healthy-1',
  name: 'Genset Diesel Gedung A',
  brand: 'Perkins',
  category: 'Mechanical',
  status: 'Active',
  pred_rul: 540,
  ...overrides,
});

export const summarizeSuccessBody = (overrides: Partial<{ summary: string; assets: SummaryAsset[]; critical_count: number }> = {}) => {
  const assets = overrides.assets ?? [criticalAsset(), healthyAsset()];
  return {
    summary: 'Sebagian besar aset dalam kondisi baik, namun beberapa unit AC memerlukan perhatian dalam waktu dekat.',
    // Defaults to the number of assets at/under the 180-day "Aset Kritis" threshold,
    // matching how kira-backend derives critical_count from its dashboard aggregate —
    // override explicitly when a test needs a mismatched count.
    critical_count: assets.filter((a) => a.pred_rul != null && a.pred_rul <= 180).length,
    ...overrides,
    assets,
  };
};

export const FAKE_TOKEN = 'fake-jwt-token-for-tests';

export type Gedung = { id: string; nama: string; kode: string };
export type LookupItem = { id: string; kode: string; nama: string };

export const testGedung: Gedung[] = [
  { id: 'gedung-a', nama: 'Gedung A', kode: 'A' },
  { id: 'gedung-b', nama: 'Gedung B', kode: 'B' },
];

export const lookupItem = (nama: string, idPrefix: string): LookupItem => ({
  id: `${idPrefix}-${nama}`,
  kode: nama.slice(0, 3).toUpperCase(),
  nama,
});

export const testMerk: LookupItem[] = [
  lookupItem('Sharp', 'merk'),
  lookupItem('Daikin', 'merk'),
];

export const testKategori: LookupItem[] = [
  lookupItem('Mechanical', 'kategori'),
  lookupItem('Electrical', 'kategori'),
];

export const testSubKategori: LookupItem[] = [
  lookupItem('Tata Udara', 'subkat'),
  lookupItem('Genset', 'subkat'),
];

export const testTipe: LookupItem[] = [
  lookupItem('AC Split', 'tipe'),
  lookupItem('Genset Diesel', 'tipe'),
];

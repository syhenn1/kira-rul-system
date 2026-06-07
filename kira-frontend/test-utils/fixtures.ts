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

export const summarizeSuccessBody = (overrides: Partial<{ summary: string; assets: SummaryAsset[] }> = {}) => ({
  summary: 'Sebagian besar aset dalam kondisi baik, namun beberapa unit AC memerlukan perhatian dalam waktu dekat.',
  assets: [criticalAsset(), healthyAsset()],
  ...overrides,
});

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

/**
 * Lookup Hierarchy Mapping
 * Defines valid Kategori → SubKategori → Tipe relationships.
 *
 * Key: kode string (e.g. 'KAT-001')
 * Value: array of allowed child kodes
 *
 * If a SubKategori kode is absent from SUBKAT_TO_TIPE (or maps to []),
 * ALL tipe options remain visible (no restriction).
 */

/** Kategori kode → allowed SubKategori kodes */
export const KATEGORI_TO_SUBKAT: Record<string, string[]> = {
  // KAT-001 Mechanical
  'KAT-001': ['SKT-001', 'SKT-010', 'SKT-014', 'SKT-018', 'SKT-020'],

  // KAT-002 Electrical
  'KAT-002': [
    'SKT-002', 'SKT-011', 'SKT-014', 'SKT-016',
    'SKT-025', 'SKT-028', 'SKT-030', 'SKT-032',
    'SKT-038', 'SKT-039', 'SKT-041', 'SKT-043',
    'SKT-049', 'SKT-050',
  ],

  // KAT-003 Arsitektur
  'KAT-003': [
    'SKT-006', 'SKT-007', 'SKT-008', 'SKT-013',
    'SKT-015', 'SKT-022', 'SKT-026', 'SKT-035',
    'SKT-047', 'SKT-051',
  ],

  // KAT-004 Security Sistem
  'KAT-004': ['SKT-003', 'SKT-019', 'SKT-021'],

  // KAT-005 Civil
  'KAT-005': ['SKT-008', 'SKT-015', 'SKT-022', 'SKT-035', 'SKT-047', 'SKT-051'],

  // KAT-006 Plumbing
  'KAT-006': [
    'SKT-004', 'SKT-017', 'SKT-018', 'SKT-024',
    'SKT-031', 'SKT-033', 'SKT-040', 'SKT-046',
  ],

  // KAT-007 Sistem Pemadam Kebakaran
  'KAT-007': ['SKT-005', 'SKT-027', 'SKT-029', 'SKT-037', 'SKT-044'],

  // KAT-008 Sistem Telekomunikasi Gedung
  'KAT-008': ['SKT-009', 'SKT-021', 'SKT-034', 'SKT-048'],

  // KAT-009 Sistem Proteksi Kebakaran Aktif
  'KAT-009': ['SKT-012', 'SKT-023', 'SKT-027', 'SKT-029', 'SKT-037', 'SKT-044'],

  // KAT-010 Ventilasi Sistem
  'KAT-010': ['SKT-001', 'SKT-010'],

  // KAT-011 Distribusi Air
  'KAT-011': ['SKT-017', 'SKT-018', 'SKT-031', 'SKT-040', 'SKT-046'],

  // KAT-012 Pencatatan Meter
  'KAT-012': ['SKT-031', 'SKT-032', 'SKT-046'],

  // KAT-013 Latihan Balakar
  'KAT-013': ['SKT-045'],

  // KAT-014 Sistem Energi
  'KAT-014': ['SKT-020', 'SKT-028', 'SKT-030', 'SKT-041', 'SKT-050'],

  // KAT-015 Sistem Transportasi Gedung
  'KAT-015': ['SKT-036', 'SKT-042'],
};

/** SubKategori kode → allowed Tipe kodes.
 *  Missing key or empty array = show ALL tipes. */
export const SUBKAT_TO_TIPE: Record<string, string[]> = {
  // SKT-001 Tata Udara
  'SKT-001': ['TPE-001', 'TPE-003', 'TPE-025', 'TPE-045', 'TPE-061', 'TPE-062', 'TPE-065'],

  // SKT-002 Lampu Penerangan
  'SKT-002': ['TPE-007', 'TPE-016', 'TPE-023', 'TPE-026', 'TPE-027', 'TPE-036', 'TPE-076', 'TPE-077'],

  // SKT-003 Sistem Pengawasan
  'SKT-003': ['TPE-002', 'TPE-029', 'TPE-035', 'TPE-097'],

  // SKT-004 Sanitari Sistem
  'SKT-004': ['TPE-014', 'TPE-015', 'TPE-022', 'TPE-031', 'TPE-032', 'TPE-071'],

  // SKT-005 Alat Pemadam Api Portable
  'SKT-005': ['TPE-009', 'TPE-013', 'TPE-033', 'TPE-063'],

  // SKT-006 Pintu dan Jendela
  'SKT-006': ['TPE-006', 'TPE-018', 'TPE-056', 'TPE-059', 'TPE-073', 'TPE-074', 'TPE-087'],

  // SKT-007 Interior Gedung
  'SKT-007': ['TPE-008', 'TPE-017', 'TPE-039', 'TPE-051', 'TPE-088'],

  // SKT-008 Dinding Bangunan
  'SKT-008': ['TPE-004', 'TPE-020', 'TPE-048', 'TPE-070'],

  // SKT-009 Telephone System
  'SKT-009': ['TPE-010', 'TPE-024'],

  // SKT-010 Sistem Sirkulasi Udara
  'SKT-010': ['TPE-005', 'TPE-062'],

  // SKT-011 Panel Distribusi
  'SKT-011': ['TPE-041', 'TPE-052', 'TPE-067', 'TPE-081', 'TPE-085'],

  // SKT-012 Sistem Deteksi Kebakaran
  'SKT-012': ['TPE-011', 'TPE-034', 'TPE-072'],

  // SKT-013 Signage Gedung
  'SKT-013': ['TPE-028', 'TPE-037', 'TPE-076'],

  // SKT-014 Control Panel
  'SKT-014': ['TPE-045', 'TPE-046', 'TPE-058', 'TPE-069'],

  // SKT-015 Lantai Bangunan
  'SKT-015': ['TPE-038', 'TPE-053', 'TPE-078', 'TPE-079', 'TPE-080'],

  // SKT-016 Power Cable & Wiring System
  'SKT-016': ['TPE-012'],

  // SKT-017 Distributor Air Bersih
  'SKT-017': ['TPE-030', 'TPE-050', 'TPE-055', 'TPE-093', 'TPE-096'],

  // SKT-018 Pompa
  'SKT-018': ['TPE-057', 'TPE-089', 'TPE-090', 'TPE-091', 'TPE-092'],

  // SKT-019 Sistem Keamanan
  'SKT-019': ['TPE-002', 'TPE-049', 'TPE-064'],

  // SKT-020 Genset
  'SKT-020': ['TPE-021'],

  // SKT-021 Sistem Audio dan Video
  'SKT-021': ['TPE-060', 'TPE-084', 'TPE-097'],

  // SKT-022 Atap Bangunan
  'SKT-022': ['TPE-043', 'TPE-066'],

  // SKT-023 Sistem Alarm Kebakaran
  'SKT-023': ['TPE-011', 'TPE-034', 'TPE-072'],

  // SKT-024 Sistem Pemipaan gedung
  'SKT-024': ['TPE-055', 'TPE-086', 'TPE-096'],

  // SKT-025 Transformator (Trafo)
  'SKT-025': ['TPE-042'],

  // SKT-026 Exterior Gedung
  'SKT-026': ['TPE-054'],

  // SKT-027 Fire Pump System
  'SKT-027': ['TPE-047', 'TPE-069'],

  // SKT-028 Generator Panel
  'SKT-028': ['TPE-040', 'TPE-067'],

  // SKT-029 Hydrant System
  'SKT-029': ['TPE-047', 'TPE-094'],

  // SKT-030 Backup Power System
  'SKT-030': ['TPE-040', 'TPE-044', 'TPE-095'],

  // SKT-031 Meter Air Bersih
  'SKT-031': ['TPE-082'],

  // SKT-032 Meter KWH
  'SKT-032': ['TPE-083'],

  // SKT-033 Sewage Treatment Plant
  'SKT-033': ['TPE-068'],

  // SKT-034 Sistem Jaringan Internet
  'SKT-034': ['TPE-075'],

  // SKT-035 Tata Lingkungan
  'SKT-035': ['TPE-054'],

  // SKT-036 Alat Angkat Angkut → no specific tipe, show all (key absent)

  // SKT-037 Alat Pemadam Api Otomatis
  'SKT-037': ['TPE-019'],

  // SKT-038 Capasitor Bank
  'SKT-038': ['TPE-085'],

  // SKT-039 Change Over Switch
  'SKT-039': ['TPE-044'],

  // SKT-040 Distributor Air Olahan
  'SKT-040': ['TPE-055', 'TPE-082', 'TPE-096'],

  // SKT-041 EV Charging System → no specific tipe, show all (key absent)

  // SKT-042 Elevator (Lift) → no specific tipe, show all (key absent)

  // SKT-043 Facade Lighting
  'SKT-043': ['TPE-028', 'TPE-037', 'TPE-076'],

  // SKT-044 Fire Suppression System
  'SKT-044': ['TPE-019', 'TPE-063'],

  // SKT-045 Latihan Balakar → no specific tipe, show all (key absent)

  // SKT-046 Meter Air Recycle
  'SKT-046': ['TPE-082'],

  // SKT-047 Rangka Atap Bangunan
  'SKT-047': ['TPE-043', 'TPE-066'],

  // SKT-048 Sistem Antrean
  'SKT-048': ['TPE-084'],

  // SKT-049 Sistem Proteksi Kelistrikan
  'SKT-049': ['TPE-044', 'TPE-067', 'TPE-081'],

  // SKT-050 Solar Power System → no specific tipe, show all (key absent)

  // SKT-051 Struktur Bangunan → no specific tipe, show all (key absent)
};

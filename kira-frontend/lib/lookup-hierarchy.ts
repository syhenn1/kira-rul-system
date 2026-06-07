/**
 * Lookup Hierarchy — nama-based mappings derived from the training dataset.
 * Key: nama string  |  Value: array of allowed child nama strings
 * Missing key or empty array = show ALL options (no restriction).
 */

export const KATEGORI_TO_SUBKAT_NAMA: Record<string, string[]> = {
  'Mechanical': [
    'Tata Udara', 'Genset', 'Pompa',
  ],
  'Electrical': [
    'Lampu Penerangan', 'Signage Gedung', 'Panel Distribusi',
    'Control Panel', 'Generator Panel', 'Power Cable & Wiring System',
    'Capasitor Bank', 'Change Over Switch', 'EV Charging System',
    'Facade Lighting', 'Sistem Proteksi Kelistrikan', 'Transformator (Trafo)',
  ],
  'Arsitektur': [
    'Pintu dan Jendela', 'Interior Gedung', 'Dinding Bangunan',
    'Signage Gedung', 'Lantai Bangunan', 'Exterior Gedung',
    'Atap Bangunan', 'Rangka Atap Bangunan', 'Tata Lingkungan',
    'Struktur Bangunan',
  ],
  'Security Sistem': [
    'Sistem Pengawasan', 'Sistem Keamanan', 'Sistem Audio dan Video',
  ],
  'Civil': [
    'Dinding Bangunan', 'Lantai Bangunan', 'Atap Bangunan',
    'Rangka Atap Bangunan', 'Tata Lingkungan', 'Struktur Bangunan',
  ],
  'Plumbing': [
    'Sanitari Sistem', 'Pompa', 'Distributor Air Bersih',
    'Sistem Pemipaan gedung', 'Distributor Air Olahan',
    'Sewage Treatment Plant',
  ],
  'Sistem Pemadam Kebakaran': [
    'Alat Pemadam Api Portable', 'Fire Pump System',
    'Hydrant System', 'Alat Pemadam Api Otomatis',
    'Fire Suppression System', 'Latihan Balakar',
  ],
  'Sistem Telekomunikasi Gedung': [
    'Telephone System', 'Sistem Audio dan Video',
    'Sistem Jaringan Internet', 'Sistem Antrean',
  ],
  'Sistem Proteksi Kebakaran Aktif': [
    'Sistem Deteksi Kebakaran', 'Sistem Alarm Kebakaran',
    'Fire Pump System', 'Hydrant System',
    'Alat Pemadam Api Otomatis', 'Fire Suppression System',
  ],
  'Ventilasi Sistem': [
    'Tata Udara', 'Sistem Sirkulasi Udara',
  ],
  'Distribusi Air': [
    'Distributor Air Bersih', 'Distributor Air Olahan',
    'Meter Air Bersih', 'Meter Air Recycle',
  ],
  'Pencatatan Meter': [
    'Meter Air Bersih', 'Meter KWH', 'Meter Air Recycle',
  ],
  'Latihan Balakar': [
    'Latihan Balakar',
  ],
  'Sistem Energi': [
    'Genset', 'Generator Panel', 'Backup Power System',
    'EV Charging System', 'Solar Power System',
  ],
  'Sistem Transportasi Gedung': [
    'Alat Angkat Angkut', 'Elevator (Lift)',
  ],
};

export const SUBKAT_TO_TIPE_NAMA: Record<string, string[]> = {
  'Tata Udara': [
    'AC Split', 'AC Cassette', 'AC VRV', 'AHU', 'AC Sentral', 'FCU',
  ],
  'Genset': [
    'Genset Diesel',
  ],
  'Pompa': [
    'Pompa Transfer', 'Pompa Air Tanah', 'Pompa Boster',
  ],
  'Sistem Sirkulasi Udara': [
    'Exhaust Fan',
  ],
  'Lampu Penerangan': [
    'Lampu LED', 'Lampu Downlight', 'Lampu TL LED',
    'Lampu LED Downlight', 'Lampu Neon Sign',
  ],
  'Signage Gedung': [
    'Lampu Neon Sign', 'Lampu Backlit Sign', 'Lampu Pylon Sign',
  ],
  'Panel Distribusi': [
    'Panel UPS', 'LVMDP', 'SDP',
  ],
  'Control Panel': [
    'Control Panel Hydrant Diesel Pump', 'Control Panel AC',
    'Panel PP-ME', 'Control Panel Penerangan',
    'Control Panel IPAL', 'Control Panel Pompa',
  ],
  'Generator Panel': [
    'Automatic Transfer Switch (ATS Panel)',
  ],
  'Sistem Pengawasan': [
    'Kamera CCTV', 'DVR CCTV', 'Monitor CCTV', 'NVR CCTV',
  ],
  'Sistem Keamanan': [
    'Kick Bar', 'Access Control', 'Push Button', 'Magnetic Door Lock',
  ],
  'Sanitari Sistem': [
    'Urinal', 'Kloset', 'Floor Drain', 'Rooftank',
    'Kran Air', 'Jet Shower', 'Wastafel',
  ],
  'Sistem Pemipaan gedung': [
    'Pemipaan Air Kotor', 'Pemipaan Air Bersih', 'Pemipaan Air Panas',
  ],
  'Distributor Air Bersih': [
    'Roof Tank',
  ],
  'Sistem Deteksi Kebakaran': [
    'Smoke Detector', 'Heat Detector',
  ],
  'Sistem Alarm Kebakaran': [
    'Bell Alarm', 'MCFA',
  ],
  'Alat Pemadam Api Portable': [
    'APAR CO2', 'APAR Wet Chemical', 'APAB Dry Powder',
    'APAR Dry Powder Stored Pressure', 'APAR Dry Powder Cartridge',
  ],
  'Fire Pump System': [
    'Diesel Fire Pump',
  ],
  'Hydrant System': [
    'Valve Control',
  ],
  'Lantai Bangunan': [
    'Lantai Karpet', 'Lantai Granit', 'Lantai Keramik',
    'Lantai Vinyl', 'Lantai Parket',
  ],
  'Atap Bangunan': [
    'Atap Beton', 'Atap Spandek', 'Atap Genteng',
  ],
  'Rangka Atap Bangunan': [
    'Atap Beton', 'Atap Spandek',
  ],
  'Dinding Bangunan': [
    'Dinding Tembok/Mansonry', 'Dinding Batu Alam',
    'Dinding Partisi', 'Dinding Kaca',
  ],
  'Interior Gedung': [
    'Plafon Gypsum / GRC',
  ],
  'Pintu dan Jendela': [
    'Pintu Kayu/HPL', 'Pintu Kaca Frameless', 'Jendela Aluminium',
    'Pintu Besi', 'Pintu Aluminium',
  ],
  'Telephone System': [
    'Pesawat Telepon', 'PABX',
  ],
  'Sistem Audio dan Video': [
    'Monitor/Layar', 'Speaker', 'Amplifier',
  ],
  'Sistem Jaringan Internet': [
    'LAN (Local Area Network)', 'Router', 'Switch Hub',
  ],
};

/** @deprecated Use KATEGORI_TO_SUBKAT_NAMA instead */
export const KATEGORI_TO_SUBKAT: Record<string, string[]> = {};
/** @deprecated Use SUBKAT_TO_TIPE_NAMA instead */
export const SUBKAT_TO_TIPE: Record<string, string[]> = {};

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AddAssetModal from './AddAssetModal';
import { jsonResponse } from '../test-utils/mockApi';
import {
  FAKE_TOKEN, testGedung, testMerk, testKategori, testSubKategori, testTipe,
} from '../test-utils/fixtures';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  authApi: { getToken: vi.fn(() => FAKE_TOKEN) },
}));

import { apiFetch } from '@/lib/api';

const mockedApiFetch = vi.mocked(apiFetch);

function routeApiFetch(opts: { hasPin?: boolean; createStatus?: number; createError?: string } = {}) {
  const { hasPin = true, createStatus = 201, createError } = opts;
  mockedApiFetch.mockImplementation(async (path: any) => {
    if (path === '/api/gedung') return jsonResponse({ gedung: testGedung });
    if (path === '/api/auth/me') return jsonResponse({ has_pin: hasPin });
    if (path === '/api/lookup/merk') return jsonResponse({ data: testMerk });
    if (path === '/api/lookup/kategori') return jsonResponse({ data: testKategori });
    if (path === '/api/lookup/sub_kategori') return jsonResponse({ data: testSubKategori });
    if (path === '/api/lookup/tipe') return jsonResponse({ data: testTipe });
    if (path === '/api/assets') {
      if (createStatus >= 400) return jsonResponse({ error: createError ?? 'Server error' }, { ok: false, status: createStatus });
      return jsonResponse({ data: { predicted_rul: 365 } }, { status: createStatus });
    }
    if (path === '/api/auth/set-pin' || path === '/api/auth/verify-pin') {
      return jsonResponse({ message: 'ok' });
    }
    throw new Error(`Unexpected apiFetch call: ${path}`);
  });
}

function getDropdownTrigger(labelText: string) {
  const label = screen.getByText(labelText);
  return within(label.parentElement as HTMLElement).getByRole('button');
}

async function pickFromDropdown(user: ReturnType<typeof userEvent.setup>, labelText: string, optionNama: string) {
  await user.click(getDropdownTrigger(labelText));
  const option = await screen.findByRole('button', { name: new RegExp(optionNama) });
  await user.click(option);
}

async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getByText('Gedung A')).toBeInTheDocument());
  await user.click(screen.getByText('Gedung A'));
  await user.click(screen.getByRole('button', { name: /Lanjutkan/i }));
  await screen.findByText('Nama Aset');
}

function setPurchaseDate(value: string) {
  const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value } });
}

beforeEach(() => {
  mockedApiFetch.mockReset();
  routeApiFetch();
});

describe('AddAssetModal — visibility', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<AddAssetModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the gedung picker on open and gates "Lanjutkan" until one is selected', async () => {
    const user = userEvent.setup();
    render(<AddAssetModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Gedung A')).toBeInTheDocument());
    const lanjutkan = screen.getByRole('button', { name: /Lanjutkan/i });
    expect(lanjutkan).toBeDisabled();

    await user.click(screen.getByText('Gedung A'));
    expect(lanjutkan).toBeEnabled();
  });
});

describe('AddAssetModal — cascading classification dropdowns', () => {
  it('narrows Kategori/Sub Kategori/Tipe options based on the selected brand (BRAND_VALIDATION_MATRIX)', async () => {
    const user = userEvent.setup();
    render(<AddAssetModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await goToStep2(user);

    // Sharp only maps to Mechanical -> Tata Udara -> AC Split
    await pickFromDropdown(user, 'Merk / Brand', 'Sharp');

    await user.click(getDropdownTrigger('Kategori'));
    expect(screen.getByRole('button', { name: /Mechanical/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Electrical/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Mechanical/ }));

    await user.click(getDropdownTrigger('Sub Kategori'));
    expect(screen.getByText('Tata Udara')).toBeInTheDocument();
    expect(screen.queryByText('Genset')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tata Udara/ }));

    await user.click(getDropdownTrigger('Tipe'));
    expect(screen.getByRole('button', { name: /AC Split/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Genset Diesel/ })).not.toBeInTheDocument();
  });

  it('disables downstream dropdowns until their parent selection is made', async () => {
    const user = userEvent.setup();
    render(<AddAssetModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await goToStep2(user);

    expect(getDropdownTrigger('Kategori')).toBeDisabled();
    expect(getDropdownTrigger('Sub Kategori')).toBeDisabled();
    expect(getDropdownTrigger('Tipe')).toBeDisabled();

    await pickFromDropdown(user, 'Merk / Brand', 'Sharp');
    expect(getDropdownTrigger('Kategori')).toBeEnabled();
    expect(getDropdownTrigger('Sub Kategori')).toBeDisabled();
  });

  it('clears Kategori/Sub Kategori/Tipe selections when the brand changes (cascade clear)', async () => {
    const user = userEvent.setup();
    render(<AddAssetModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await goToStep2(user);

    await pickFromDropdown(user, 'Merk / Brand', 'Sharp');
    await pickFromDropdown(user, 'Kategori', 'Mechanical');
    await pickFromDropdown(user, 'Sub Kategori', 'Tata Udara');
    await pickFromDropdown(user, 'Tipe', 'AC Split');

    expect(within(getDropdownTrigger('Tipe')).getByText('AC Split')).toBeInTheDocument();

    // Switching brand must wipe everything downstream back to placeholders
    await pickFromDropdown(user, 'Merk / Brand', 'Daikin');

    expect(within(getDropdownTrigger('Kategori')).getByText('Pilih kategori')).toBeInTheDocument();
    expect(within(getDropdownTrigger('Sub Kategori')).getByText('Pilih Kategori terlebih dahulu')).toBeInTheDocument();
    expect(within(getDropdownTrigger('Tipe')).getByText('Pilih Sub Kategori terlebih dahulu')).toBeInTheDocument();
  });
});

describe('AddAssetModal — required-field validation before PIN step', () => {
  it('reports missing fields one at a time via handleSaveClick guards', async () => {
    const user = userEvent.setup();
    render(<AddAssetModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await goToStep2(user);

    const save = screen.getByRole('button', { name: /Simpan Aset/i });

    await user.click(save);
    expect(screen.getByText('Nama aset wajib diisi.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Masukkan nama aset'), 'AC Split Lobby');
    await user.click(save);
    expect(screen.getByText('Tanggal pembelian wajib diisi.')).toBeInTheDocument();
  });

  it('proceeds to the PIN overlay once every required field is filled', async () => {
    const user = userEvent.setup();
    render(<AddAssetModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await goToStep2(user);

    await user.type(screen.getByPlaceholderText('Masukkan nama aset'), 'AC Split Lobby');
    setPurchaseDate('2026-01-15');
    await user.selectOptions(screen.getByDisplayValue('Pilih Tingkat Kekritisan'), 'Major');

    await pickFromDropdown(user, 'Merk / Brand', 'Sharp');
    await pickFromDropdown(user, 'Kategori', 'Mechanical');
    await pickFromDropdown(user, 'Sub Kategori', 'Tata Udara');
    await pickFromDropdown(user, 'Tipe', 'AC Split');

    await user.click(screen.getByRole('button', { name: /Simpan Aset/i }));

    expect(await screen.findByText('Konfirmasi PIN')).toBeInTheDocument();
  });
});

describe('AddAssetModal — PIN flow and submission', () => {
  async function fillCompleteForm(user: ReturnType<typeof userEvent.setup>) {
    await goToStep2(user);
    await user.type(screen.getByPlaceholderText('Masukkan nama aset'), 'AC Split Lobby');
    setPurchaseDate('2026-01-15');
    await user.selectOptions(screen.getByDisplayValue('Pilih Tingkat Kekritisan'), 'Major');
    await pickFromDropdown(user, 'Merk / Brand', 'Sharp');
    await pickFromDropdown(user, 'Kategori', 'Mechanical');
    await pickFromDropdown(user, 'Sub Kategori', 'Tata Udara');
    await pickFromDropdown(user, 'Tipe', 'AC Split');
    await user.click(screen.getByRole('button', { name: /Simpan Aset/i }));
  }

  // PIN boxes are <input type="password">, which carries no implicit ARIA
  // textbox role — query them by type instead.
  async function typePin(user: ReturnType<typeof userEvent.setup>, digits: string) {
    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]'));
    for (let i = 0; i < digits.length; i++) {
      await user.type(boxes[i], digits[i]);
    }
  }

  it('shows a "Konfirmasi PIN" (verify) overlay when the user already has a PIN, then submits and reports success', async () => {
    routeApiFetch({ hasPin: true });
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AddAssetModal open={true} onClose={onClose} onSuccess={onSuccess} />);

    await fillCompleteForm(user);
    expect(await screen.findByText('Konfirmasi PIN')).toBeInTheDocument();

    await typePin(user, '123456');
    await user.click(screen.getByRole('button', { name: 'Konfirmasi' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalled();
    expect(mockedApiFetch).toHaveBeenCalledWith('/api/auth/verify-pin', expect.objectContaining({ method: 'POST' }));
    const [, createOptions] = mockedApiFetch.mock.calls.find(([p]) => p === '/api/assets')!;
    expect(JSON.parse((createOptions as RequestInit).body as string)).toMatchObject({
      asset_name: 'AC Split Lobby',
      criticality_level: 'Major',
    });
    expect(onSuccess.mock.calls[0][0]).toMatchObject({ asset_name: 'AC Split Lobby', predicted_rul: 365 });
  });

  it('walks a first-time user through set -> set-confirm before saving the PIN and submitting', async () => {
    routeApiFetch({ hasPin: false });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<AddAssetModal open={true} onClose={vi.fn()} onSuccess={onSuccess} />);

    await fillCompleteForm(user);
    expect(await screen.findByText('Buat PIN Baru')).toBeInTheDocument();

    await typePin(user, '654321');
    await user.click(screen.getByRole('button', { name: 'Lanjutkan' }));

    expect(await screen.findByText('Konfirmasi PIN Baru')).toBeInTheDocument();
    await typePin(user, '654321');
    await user.click(screen.getByRole('button', { name: /Simpan PIN & Lanjutkan/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockedApiFetch).toHaveBeenCalledWith('/api/auth/set-pin', expect.objectContaining({ method: 'POST' }));
    const [, setPinOptions] = mockedApiFetch.mock.calls.find(([p]) => p === '/api/auth/set-pin')!;
    expect(JSON.parse((setPinOptions as RequestInit).body as string)).toEqual({ pin: '654321' });
  });

  it('shows a mismatch error and stays on set-confirm when the confirmation PIN differs', async () => {
    routeApiFetch({ hasPin: false });
    const user = userEvent.setup();
    render(<AddAssetModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await fillCompleteForm(user);
    await screen.findByText('Buat PIN Baru');
    await typePin(user, '111111');
    await user.click(screen.getByRole('button', { name: 'Lanjutkan' }));

    await screen.findByText('Konfirmasi PIN Baru');
    await typePin(user, '222222');
    await user.click(screen.getByRole('button', { name: /Simpan PIN & Lanjutkan/i }));

    expect(await screen.findByText('Konfirmasi PIN tidak cocok')).toBeInTheDocument();
    expect(mockedApiFetch).not.toHaveBeenCalledWith('/api/auth/set-pin', expect.anything());
  });

  it('surfaces the backend error message in the form when asset creation fails (e.g. 400)', async () => {
    routeApiFetch({ hasPin: true, createStatus: 400, createError: 'Data aset tidak valid' });
    const user = userEvent.setup();
    render(<AddAssetModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await fillCompleteForm(user);
    await screen.findByText('Konfirmasi PIN');
    await typePin(user, '123456');
    await user.click(screen.getByRole('button', { name: 'Konfirmasi' }));

    expect(await screen.findByText('Data aset tidak valid')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import SummaryCard from './SummaryCard';
import { jsonResponse, textResponse } from '../test-utils/mockApi';
import { FAKE_TOKEN, criticalAsset, healthyAsset, summarizeSuccessBody } from '../test-utils/fixtures';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  authApi: { getToken: vi.fn(() => FAKE_TOKEN) },
}));

import { apiFetch } from '@/lib/api';

const mockedApiFetch = vi.mocked(apiFetch);

const LOADING_STATES = [
  'Tokenizing asset data...',
  'Extracting features...',
  'Analyzing maintenance history...',
  'Generating insights...',
];

/** Resolves the artificial 1500ms fetch delay + the 50ms post-load reveal timer. */
async function flushToLoaded() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1600);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mockedApiFetch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SummaryCard — loading state', () => {
  it('shows the first NLP loading message immediately on mount', () => {
    mockedApiFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<SummaryCard />);

    expect(screen.getByText(LOADING_STATES[0])).toBeInTheDocument();
    expect(screen.getByText('NLP Processing')).toBeInTheDocument();
  });

  it('cycles loadingStep through all four NLP pipeline messages every 800ms', async () => {
    mockedApiFetch.mockReturnValue(new Promise(() => {})); // keep isLoading=true throughout
    render(<SummaryCard />);

    expect(screen.getByText(LOADING_STATES[0])).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(screen.getByText(LOADING_STATES[1])).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(screen.getByText(LOADING_STATES[2])).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(screen.getByText(LOADING_STATES[3])).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(screen.getByText(LOADING_STATES[0])).toBeInTheDocument(); // wraps around
  });
});

describe('SummaryCard — successful generation', () => {
  it('renders the summary text and flips the badge from "NLP Processing" to "Generated"', async () => {
    const body = summarizeSuccessBody({ summary: 'Ringkasan kondisi aset terbaru.' });
    mockedApiFetch.mockResolvedValue(jsonResponse(body));

    render(<SummaryCard />);
    expect(screen.getByText('NLP Processing')).toBeInTheDocument();

    await flushToLoaded();

    expect(screen.getByText('Generated')).toBeInTheDocument();
    expect(screen.queryByText('NLP Processing')).not.toBeInTheDocument();
    expect(screen.getByText('Ringkasan kondisi aset terbaru.')).toBeInTheDocument();
  });

  it('shows a fallback message when the AI engine returns an empty summary', async () => {
    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody({ summary: '', assets: [] })));

    render(<SummaryCard />);
    await flushToLoaded();

    expect(screen.getByText('Tidak ada ringkasan yang tersedia.')).toBeInTheDocument();
  });

  it('sends the expected request: POST /api/summarize with bearer token and {limit, temperature} body', async () => {
    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody()));

    render(<SummaryCard />);
    await flushToLoaded();

    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockedApiFetch.mock.calls[0];
    expect(url).toBe('/api/summarize');
    expect(options).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FAKE_TOKEN}`,
      },
      body: JSON.stringify({ limit: 10, temperature: 0.2 }),
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('SummaryCard — "Aset Kritis" rail (pred_rul <= 180)', () => {
  it('renders only assets at or below the 180-day threshold, linking to their detail pages', async () => {
    const critical = criticalAsset({ id: 'a-crit', name: 'AC Split Kritis', pred_rul: 180 });
    const borderline = healthyAsset({ id: 'a-border', name: 'Pompa Sehat', pred_rul: 181 });
    const noPrediction = healthyAsset({ id: 'a-null', name: 'Tanpa Prediksi', pred_rul: null });

    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody({
      assets: [critical, borderline, noPrediction],
    })));

    render(<SummaryCard />);
    await flushToLoaded();

    expect(screen.getByText('AC Split Kritis')).toBeInTheDocument();
    expect(screen.queryByText('Pompa Sehat')).not.toBeInTheDocument();
    expect(screen.queryByText('Tanpa Prediksi')).not.toBeInTheDocument();

    const link = screen.getByText('AC Split Kritis').closest('a');
    expect(link).toHaveAttribute('href', '/assets/a-crit');
  });

  it('shows at most 5 critical assets even when more qualify', async () => {
    const critical = Array.from({ length: 7 }, (_, i) =>
      criticalAsset({ id: `crit-${i}`, name: `Aset Kritis ${i}`, pred_rul: 100 + i }));

    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody({ assets: critical })));

    render(<SummaryCard />);
    await flushToLoaded();

    expect(screen.getByText('Aset Kritis — Segera Ditangani (7)')).toBeInTheDocument();
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Aset Kritis ${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText('Aset Kritis 5')).not.toBeInTheDocument();
    expect(screen.queryByText('Aset Kritis 6')).not.toBeInTheDocument();
  });

  it('does not render the rail at all when no asset is at/under the threshold', async () => {
    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody({
      assets: [healthyAsset({ pred_rul: 400 }), healthyAsset({ pred_rul: null })],
    })));

    render(<SummaryCard />);
    await flushToLoaded();

    expect(screen.queryByText(/Aset Kritis/)).not.toBeInTheDocument();
  });

  it('badges Scrap/Maintenance assets in red and other statuses in orange', async () => {
    const scrapAsset = criticalAsset({ id: 'a-scrap', name: 'Aset Scrap', status: 'Scrap', pred_rul: 50 });
    const activeAsset = criticalAsset({ id: 'a-active', name: 'Aset Aktif', status: 'Active', pred_rul: 60 });

    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody({ assets: [scrapAsset, activeAsset] })));

    render(<SummaryCard />);
    await flushToLoaded();

    expect(screen.getByText('Scrap')).toHaveClass('bg-red-500/40', 'text-red-100');
    expect(screen.getByText('Active')).toHaveClass('bg-orange-500/30', 'text-orange-100');
  });
});

describe('SummaryCard — error handling', () => {
  it('shows an error banner when the response is not ok', async () => {
    mockedApiFetch.mockResolvedValue(textResponse('Internal Server Error', { ok: false, status: 500 }));

    render(<SummaryCard />);
    await flushToLoaded();

    expect(screen.getByText('Tidak dapat memuat ringkasan. Cek backend atau AI engine.')).toBeInTheDocument();
  });

  it('shows an error banner when the fetch itself rejects', async () => {
    mockedApiFetch.mockRejectedValue(new Error('network down'));

    render(<SummaryCard />);
    await flushToLoaded();

    expect(screen.getByText('Tidak dapat memuat ringkasan. Cek backend atau AI engine.')).toBeInTheDocument();
  });

  it('does not show an error banner for AbortError (request was cancelled, not failed)', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockedApiFetch.mockRejectedValue(abortError);

    render(<SummaryCard />);
    await flushToLoaded();

    expect(screen.queryByText('Tidak dapat memuat ringkasan. Cek backend atau AI engine.')).not.toBeInTheDocument();
  });
});

describe('SummaryCard — request cancellation on unmount', () => {
  it('aborts the in-flight request when the component unmounts', () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
    mockedApiFetch.mockReturnValue(new Promise(() => {}));

    const { unmount } = render(<SummaryCard />);
    unmount();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});

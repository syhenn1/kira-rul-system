import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

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

/** Clicks the idle-state "View Insights" CTA that kicks off summarization. */
function clickViewInsights() {
  fireEvent.click(screen.getByRole('button', { name: /View Insights/i }));
}

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

describe('SummaryCard — idle state (no auto-fetch on mount)', () => {
  it('shows a "View Insights" call-to-action and does NOT fetch a summary on mount', () => {
    mockedApiFetch.mockReturnValue(new Promise(() => {}));
    render(<SummaryCard />);

    expect(screen.getByRole('button', { name: /View Insights/i })).toBeInTheDocument();
    expect(screen.getByText('Belum Dianalisis')).toBeInTheDocument();
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it('stays idle and uncalled even after time passes without a click', async () => {
    mockedApiFetch.mockReturnValue(new Promise(() => {}));
    render(<SummaryCard />);

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(mockedApiFetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /View Insights/i })).toBeInTheDocument();
  });
});

describe('SummaryCard — loading state (triggered by clicking "View Insights")', () => {
  it('only starts fetching and shows the first NLP loading message after the button is clicked', () => {
    mockedApiFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<SummaryCard />);

    expect(mockedApiFetch).not.toHaveBeenCalled();
    clickViewInsights();

    expect(screen.getByText(LOADING_STATES[0])).toBeInTheDocument();
    expect(screen.getByText('NLP Processing')).toBeInTheDocument();
  });

  it('cycles loadingStep through all four NLP pipeline messages every 800ms', async () => {
    mockedApiFetch.mockReturnValue(new Promise(() => {})); // keep loading=true throughout
    render(<SummaryCard />);
    clickViewInsights();

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
    clickViewInsights();
    expect(screen.getByText('NLP Processing')).toBeInTheDocument();

    await flushToLoaded();

    expect(screen.getByText('Generated')).toBeInTheDocument();
    expect(screen.queryByText('NLP Processing')).not.toBeInTheDocument();
    expect(screen.getByText('Ringkasan kondisi aset terbaru.')).toBeInTheDocument();
  });

  it('shows a fallback message when the AI engine returns an empty summary', async () => {
    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody({ summary: '', assets: [] })));

    render(<SummaryCard />);
    clickViewInsights();
    await flushToLoaded();

    expect(screen.getByText('Tidak ada ringkasan yang tersedia.')).toBeInTheDocument();
  });

  it('sends the expected request: POST /api/summarize with bearer token and {limit, temperature} body', async () => {
    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody()));

    render(<SummaryCard />);
    clickViewInsights();
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
  it('renders only assets at or below the 180-day threshold, invoking onSelectAsset with their id when clicked', async () => {
    const onSelectAsset = vi.fn();
    const critical = criticalAsset({ id: 'a-crit', name: 'AC Split Kritis', pred_rul: 180 });
    const borderline = healthyAsset({ id: 'a-border', name: 'Pompa Sehat', pred_rul: 181 });
    const noPrediction = healthyAsset({ id: 'a-null', name: 'Tanpa Prediksi', pred_rul: null });

    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody({
      assets: [critical, borderline, noPrediction],
    })));

    render(<SummaryCard onSelectAsset={onSelectAsset} />);
    clickViewInsights();
    await flushToLoaded();

    expect(screen.getByText('AC Split Kritis')).toBeInTheDocument();
    expect(screen.queryByText('Pompa Sehat')).not.toBeInTheDocument();
    expect(screen.queryByText('Tanpa Prediksi')).not.toBeInTheDocument();

    const card = screen.getByText('AC Split Kritis').closest('button');
    expect(card).not.toBeNull();
    fireEvent.click(card!);
    expect(onSelectAsset).toHaveBeenCalledWith('a-crit');
  });

  it('shows every qualifying critical asset, not just a subset', async () => {
    const critical = Array.from({ length: 7 }, (_, i) =>
      criticalAsset({ id: `crit-${i}`, name: `Aset Kritis ${i}`, pred_rul: 100 + i }));

    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody({ assets: critical })));

    render(<SummaryCard />);
    clickViewInsights();
    await flushToLoaded();

    expect(screen.getByText('Aset Kritis — Segera Ditangani (7)')).toBeInTheDocument();
    for (let i = 0; i < 7; i++) {
      expect(screen.getByText(`Aset Kritis ${i}`)).toBeInTheDocument();
    }
  });

  it('does not render the rail at all when no asset is at/under the threshold', async () => {
    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody({
      assets: [healthyAsset({ pred_rul: 400 }), healthyAsset({ pred_rul: null })],
    })));

    render(<SummaryCard />);
    clickViewInsights();
    await flushToLoaded();

    expect(screen.queryByText(/Aset Kritis/)).not.toBeInTheDocument();
  });

  it('badges Scrap/Maintenance assets in red and other statuses in orange', async () => {
    const scrapAsset = criticalAsset({ id: 'a-scrap', name: 'Aset Scrap', status: 'Scrap', pred_rul: 50 });
    const activeAsset = criticalAsset({ id: 'a-active', name: 'Aset Aktif', status: 'Active', pred_rul: 60 });

    mockedApiFetch.mockResolvedValue(jsonResponse(summarizeSuccessBody({ assets: [scrapAsset, activeAsset] })));

    render(<SummaryCard />);
    clickViewInsights();
    await flushToLoaded();

    expect(screen.getByText('Scrap')).toHaveClass('bg-red-500/40', 'text-red-100');
    expect(screen.getByText('Active')).toHaveClass('bg-orange-500/30', 'text-orange-100');
  });
});

describe('SummaryCard — error handling', () => {
  it('shows an error banner with a retry action when the response is not ok', async () => {
    mockedApiFetch.mockResolvedValue(textResponse('Internal Server Error', { ok: false, status: 500 }));

    render(<SummaryCard />);
    clickViewInsights();
    await flushToLoaded();

    expect(screen.getByText('Tidak dapat memuat ringkasan. Cek backend atau AI engine.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba Lagi' })).toBeInTheDocument();
  });

  it('shows an error banner when the fetch itself rejects', async () => {
    mockedApiFetch.mockRejectedValue(new Error('network down'));

    render(<SummaryCard />);
    clickViewInsights();
    await flushToLoaded();

    expect(screen.getByText('Tidak dapat memuat ringkasan. Cek backend atau AI engine.')).toBeInTheDocument();
  });

  it('does not show an error banner for AbortError (request was cancelled, not failed)', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockedApiFetch.mockRejectedValue(abortError);

    render(<SummaryCard />);
    clickViewInsights();
    await flushToLoaded();

    expect(screen.queryByText('Tidak dapat memuat ringkasan. Cek backend atau AI engine.')).not.toBeInTheDocument();
  });

  it('lets the user retry by clicking "Coba Lagi" after a failure', async () => {
    mockedApiFetch
      .mockResolvedValueOnce(textResponse('Internal Server Error', { ok: false, status: 500 }))
      .mockResolvedValueOnce(jsonResponse(summarizeSuccessBody({ summary: 'Berhasil setelah dicoba ulang.' })));

    render(<SummaryCard />);
    clickViewInsights();
    await flushToLoaded();
    expect(screen.getByText('Tidak dapat memuat ringkasan. Cek backend atau AI engine.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    await flushToLoaded();

    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Berhasil setelah dicoba ulang.')).toBeInTheDocument();
  });
});

describe('SummaryCard — request cancellation on unmount', () => {
  it('aborts the in-flight request when the component unmounts mid-fetch', () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
    mockedApiFetch.mockReturnValue(new Promise(() => {}));

    const { unmount } = render(<SummaryCard />);
    clickViewInsights();
    unmount();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  it('does not abort anything on unmount if "View Insights" was never clicked', () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
    mockedApiFetch.mockReturnValue(new Promise(() => {}));

    const { unmount } = render(<SummaryCard />);
    unmount();

    expect(abortSpy).not.toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});

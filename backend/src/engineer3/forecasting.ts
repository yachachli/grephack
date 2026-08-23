import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

export type Confidence = 'high' | 'medium' | 'low';
export type ForecastStatus = 'ready' | 'watch' | 'urgent' | 'needs-sample' | 'missing-target' | 'harvested';

export interface BrixSample {
  blockCode: string;
  vineyard: string;
  variety: string;
  region: string | null;
  winery: string | null;
  season: number;
  date: string;
  brix: number;
  sourceFile: string;
  sheet: string;
  rowNumber: number;
}

export interface Forecast {
  blockCode: string;
  vineyard: string;
  variety: string;
  region: string | null;
  winery: string | null;
  acres: number | null;
  operationalStatus: 'pending' | 'in_progress' | 'harvested' | null;
  targetMin: number;
  targetMax: number | null;
  latestBrix: number;
  latestSampleDate: string;
  recentSlopePerDay: number | null;
  historicalSlopePerDay: number | null;
  slopeSource: string;
  estimatedSlopePerDay: number | null;
  projectedStart: string | null;
  projectedEnd: string | null;
  pointEstimate: string | null;
  confidence: Confidence;
  status: ForecastStatus;
  sampleCount: number;
  explanation: string;
}

export interface DataStatus {
  loadedAt: string;
  generatedAt: string | null;
  files: Array<{ file: string; loaded: boolean; records: number; message?: string }>;
  currentSeasonBlocks: number;
  currentSeasonSamples: number;
  historicalSamples: number;
  unmappedCurrentSamples: number;
  blocksWithoutTargets: number;
  warnings: string[];
}

interface ParentBlock {
  block_id: string;
  parent_code: string;
  region: string | null;
  variety_code: string | null;
  total_acres: number | null;
}

interface NormalizedBrixObservation {
  block_id: string | null;
  brix: number;
  sampled_at: string;
  season: number;
  source_code: string | null;
  vineyard_name: string;
  variety: string | null;
  winery_raw: string | null;
  source: { workbook: string; sheet: string; row: number };
}

interface BlockStatus {
  block_id: string | null;
  status: 'pending' | 'in_progress' | 'harvested';
}

interface QualityReport {
  generated_at?: string;
  known_source_risks?: string[];
}

interface TargetRange { min: number; max: number | null }

interface LoadedData {
  brix: NormalizedBrixObservation[];
  blocks: Map<string, ParentBlock>;
  targets: Map<string, TargetRange>;
  operationalStatus: Map<string, Forecast['operationalStatus']>;
  quality: QualityReport;
  files: DataStatus['files'];
  loadedAt: string;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const generatedDirectory = process.env.VINEFLOW_GENERATED_DIR ?? path.join(projectRoot, 'engineer_1', 'generated');
const dataDirectory = process.env.VINEFLOW_DATA_DIR ?? path.join(projectRoot, 'data');
const currentSeason = 2026;
const targetWorkbooks = [
  { season: 2023, file: '2023 SUGARS (1).xlsx', sheet: 'All Brix' },
  { season: 2024, file: '2024 SUGARS.xlsx', sheet: 'All Brix' },
  { season: 2026, file: '2026 SUGARS.xlsx', sheet: 'ALL Sugars' },
] as const;

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function headerText(value: unknown): string {
  return cleanText(value).toUpperCase().replace(/[.?]/g, '');
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = cleanText(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseRange(value: unknown): { min: number | null; max: number | null } {
  const values = cleanText(value).match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return { min: values[0] ?? null, max: values[1] ?? null };
}

function findColumn(headers: unknown[], candidates: string[]): number {
  const normalized = headers.map(headerText);
  return normalized.findIndex((value) => candidates.some((candidate) => value === candidate || value.includes(candidate)));
}

function findHeaderRow(rows: unknown[][]): number {
  return rows.findIndex((row) => {
    const values = row.map(headerText);
    return values.some((value) => value === 'CODE') && values.some((value) => value.includes('VINEYARD'));
  });
}

function normalizeVariety(value: string | null): string {
  const input = cleanText(value).toUpperCase().replace(/[^A-Z]/g, '');
  const aliases: Record<string, string> = {
    CABERNETSAUVIGNON: 'CS', CABERNETFRANC: 'CF', CHARDONNAY: 'CH', PINOTNOIR: 'PN',
    SAUVIGNONBLANC: 'SB', PETITESIRAH: 'PS', PETITESYRAH: 'PS', ZINFANDEL: 'ZN',
    ZINFANDELPRIMITIVO: 'ZN', MERLOT: 'ME', MALBEC: 'MA', SANGIOVESE: 'SA', VIOGNIER: 'VI',
    GRENACHE: 'GR', BARBERA: 'BA', ALBARINO: 'AL', AGLIANICO: 'AG', ANCELLOTTA: 'AN',
    CHENINBLANC: 'CB', PINOTGRIGIO: 'PG', GEWURZTRAMINER: 'GW', GRUNERVELTLINER: 'GV',
    PICPOULBLANC: 'PP',
  };
  return aliases[input] ?? input;
}

function daysBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
}

function linearSlope(samples: BrixSample[]): number | null {
  if (samples.length < 2) return null;
  const sorted = [...samples].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = sorted[0].date;
  const points = sorted.map((sample) => ({ x: daysBetween(firstDate, sample.date), y: sample.brix }));
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (!denominator) return null;
  return points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / denominator;
}

function readJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(generatedDirectory, filename), 'utf8')) as T;
}

/** Reads target configuration only. All observed Brix values come from Engineer 1's normalized data. */
function readTargetWorkbook(filename: string, season: number, sheetName: string, codeToId: Map<string, string>): Map<string, TargetRange> {
  const workbook = XLSX.readFile(path.join(dataDirectory, filename), { cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Worksheet ${sheetName} not found in ${filename}`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
  const headerRow = findHeaderRow(rows);
  if (headerRow < 0) throw new Error(`No block-target header found in ${filename}`);
  const headers = rows[headerRow];
  const codeColumn = findColumn(headers, ['CODE']);
  const minColumn = findColumn(headers, ['BRIX MIN', 'BRIX LOW', 'MIN BRIX']);
  const maxColumn = findColumn(headers, ['BRIX MAX']);
  const targetColumn = findColumn(headers, ['TARGET BRIX']);
  const targets = new Map<string, TargetRange>();
  for (const row of rows.slice(headerRow + 1)) {
    const blockId = codeToId.get(cleanText(row[codeColumn]));
    if (!blockId) continue;
    let min = minColumn >= 0 ? toNumber(row[minColumn]) : null;
    let max = maxColumn >= 0 ? toNumber(row[maxColumn]) : null;
    if (targetColumn >= 0) {
      const target = parseRange(row[targetColumn]);
      min ??= target.min;
      max ??= target.max;
    }
    if (min !== null && min >= 5 && min <= 35) targets.set(`${season}:${blockId}`, { min, max: max !== null && max >= min ? max : null });
  }
  return targets;
}

function deriveOperationalStatus(statuses: BlockStatus[]): Map<string, Forecast['operationalStatus']> {
  const grouped = new Map<string, Set<BlockStatus['status']>>();
  for (const status of statuses) {
    if (!status.block_id) continue;
    grouped.set(status.block_id, new Set([...(grouped.get(status.block_id) ?? []), status.status]));
  }
  const result = new Map<string, Forecast['operationalStatus']>();
  for (const [blockId, values] of grouped) result.set(blockId, values.has('in_progress') ? 'in_progress' : values.has('pending') ? 'pending' : 'harvested');
  return result;
}

function loadData(): LoadedData {
  const files: DataStatus['files'] = [];
  try {
    const parents = readJson<ParentBlock[]>('parent_blocks.json');
    const brix = readJson<NormalizedBrixObservation[]>('brix_observations.json');
    const statuses = readJson<BlockStatus[]>('block_status.json');
    const quality = readJson<QualityReport>('data_quality.json');
    files.push(
      { file: 'engineer_1/generated/parent_blocks.json', loaded: true, records: parents.length },
      { file: 'engineer_1/generated/brix_observations.json', loaded: true, records: brix.length },
      { file: 'engineer_1/generated/block_status.json', loaded: true, records: statuses.length },
      { file: 'engineer_1/generated/data_quality.json', loaded: true, records: quality.known_source_risks?.length ?? 0 },
    );
    const blocks = new Map(parents.map((block) => [block.block_id, block]));
    const codeToId = new Map(parents.map((block) => [block.parent_code, block.block_id]));
    const targets = new Map<string, TargetRange>();
    for (const source of targetWorkbooks) {
      try {
        const loadedTargets = readTargetWorkbook(source.file, source.season, source.sheet, codeToId);
        for (const [key, target] of loadedTargets) targets.set(key, target);
        files.push({ file: `data/${source.file} (target settings)`, loaded: true, records: loadedTargets.size });
      } catch (error) {
        files.push({ file: `data/${source.file} (target settings)`, loaded: false, records: 0, message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    return { brix, blocks, targets, operationalStatus: deriveOperationalStatus(statuses), quality, files, loadedAt: new Date().toISOString() };
  } catch (error) {
    files.push({ file: 'engineer_1/generated', loaded: false, records: 0, message: error instanceof Error ? error.message : 'Unknown error' });
    return { brix: [], blocks: new Map(), targets: new Map(), operationalStatus: new Map(), quality: {}, files, loadedAt: new Date().toISOString() };
  }
}

function toSamples(data: LoadedData): BrixSample[] {
  return data.brix.filter((observation) => observation.block_id !== null).map((observation) => {
    const metadata = data.blocks.get(observation.block_id!);
    return {
      blockCode: observation.block_id!, vineyard: observation.vineyard_name,
      variety: normalizeVariety(observation.variety), region: metadata?.region ?? null,
      winery: observation.winery_raw, season: observation.season, date: observation.sampled_at,
      brix: observation.brix, sourceFile: observation.source.workbook, sheet: observation.source.sheet,
      rowNumber: observation.source.row,
    };
  });
}

function historicalSlopes(samples: BrixSample[], profile: { blockCode: string; variety: string; region: string | null }): { slopes: number[]; source: string } {
  const historic = samples.filter((sample) => sample.season < currentSeason);
  const select = (predicate: (sample: BrixSample) => boolean) => {
    const groups = new Map<string, BrixSample[]>();
    for (const sample of historic.filter(predicate)) {
      const key = `${sample.season}:${sample.blockCode}`;
      groups.set(key, [...(groups.get(key) ?? []), sample]);
    }
    return [...groups.values()].map(linearSlope).filter((slope): slope is number => slope !== null && slope > 0.01 && slope < 0.5);
  };
  const exact = select((sample) => sample.blockCode === profile.blockCode);
  if (exact.length) return { slopes: exact, source: 'same block history' };
  const sameVarietyRegion = select((sample) => sample.variety === profile.variety && sample.region === profile.region);
  if (sameVarietyRegion.length) return { slopes: sameVarietyRegion, source: 'same variety and region history' };
  const sameVariety = select((sample) => sample.variety === profile.variety);
  if (sameVariety.length) return { slopes: sameVariety, source: 'same variety history' };
  return { slopes: select(() => true), source: 'portfolio history' };
}

function forecastBlock(blockId: string, data: LoadedData, samples: BrixSample[]): Forecast | null {
  const current = samples.filter((sample) => sample.season === currentSeason && sample.blockCode === blockId).sort((a, b) => a.date.localeCompare(b.date));
  if (!current.length) return null;
  const latest = current[current.length - 1];
  const metadata = data.blocks.get(blockId);
  const target = data.targets.get(`${currentSeason}:${blockId}`);
  const operationalStatus = data.operationalStatus.get(blockId) ?? null;
  const recent = current.filter((sample) => daysBetween(sample.date, latest.date) <= 28).slice(-5);
  const recentSlope = linearSlope(recent);
  const historical = historicalSlopes(samples, { blockCode: blockId, variety: normalizeVariety(latest.variety ?? metadata?.variety_code), region: metadata?.region ?? null });
  const historicalSlope = median(historical.slopes);
  const usableRecent = recentSlope !== null && recentSlope > 0.01 && recentSlope < 0.5;
  const usableHistory = historicalSlope !== null && historicalSlope > 0.01;
  const recentWeight = Math.min(0.75, 0.35 + recent.length * 0.1);
  const estimatedSlope = usableRecent && usableHistory ? recentWeight * recentSlope + (1 - recentWeight) * historicalSlope : usableRecent ? recentSlope : usableHistory ? historicalSlope : null;
  const staleDays = Math.max(0, daysBetween(latest.date, '2026-08-23'));
  const confidence: Confidence = recent.length >= 3 && usableRecent && historical.source === 'same block history' && staleDays <= 7 ? 'high' : recent.length >= 2 && estimatedSlope !== null && staleDays <= 14 ? 'medium' : 'low';
  const common = {
    blockCode: metadata?.parent_code ?? blockId.replace(/^block:/, ''), vineyard: latest.vineyard,
    variety: latest.variety, region: metadata?.region ?? latest.region, winery: latest.winery,
    acres: metadata?.total_acres ?? null, operationalStatus, targetMin: target?.min ?? 0, targetMax: target?.max ?? null,
    latestBrix: latest.brix, latestSampleDate: latest.date, recentSlopePerDay: recentSlope,
    historicalSlopePerDay: historicalSlope, slopeSource: historical.source, estimatedSlopePerDay: estimatedSlope,
    confidence, sampleCount: current.length,
  };
  if (operationalStatus === 'harvested') return { ...common, status: 'harvested', projectedStart: null, projectedEnd: null, pointEstimate: null, explanation: 'This block is marked harvested in the current Status workbook, so no new harvest-readiness action is recommended.' };
  if (!target) return { ...common, status: 'missing-target', projectedStart: null, projectedEnd: null, pointEstimate: null, explanation: 'No target-Brix range is configured for this block in the current Sugar workbook.' };
  if (latest.brix >= target.min && (target.max === null || latest.brix <= target.max)) return { ...common, status: 'ready', projectedStart: latest.date, projectedEnd: target.max === null || estimatedSlope === null ? null : addDays(latest.date, Math.max(0, Math.round((target.max - latest.brix) / estimatedSlope))), pointEstimate: latest.date, explanation: `Latest reading is ${latest.brix.toFixed(1)}° Brix, already within the ${target.min.toFixed(1)}${target.max ? `–${target.max.toFixed(1)}` : '+'}° target range.` };
  if (target.max !== null && latest.brix > target.max) return { ...common, status: 'urgent', projectedStart: latest.date, projectedEnd: latest.date, pointEstimate: latest.date, explanation: `Latest reading is ${latest.brix.toFixed(1)}° Brix, above the ${target.max.toFixed(1)}° maximum target; review this block urgently.` };
  if (estimatedSlope === null) return { ...common, status: 'needs-sample', projectedStart: null, projectedEnd: null, pointEstimate: null, explanation: 'A positive ripening rate cannot be estimated from the available observations; collect another sample.' };
  const daysToTarget = Math.max(0, (target.min - latest.brix) / estimatedSlope);
  const variation = historical.slopes.length > 1 && historicalSlope ? standardDeviation(historical.slopes) / historicalSlope : 0.2;
  const fallbackPenalty = historical.source === 'same block history' ? 0 : historical.source === 'same variety and region history' ? 1 : 2;
  const uncertaintyDays = Math.max(2, Math.min(14, Math.round(2 + fallbackPenalty + (current.length < 3 ? 3 : 0) + daysToTarget * variation * 0.25)));
  const pointEstimate = addDays(latest.date, Math.round(daysToTarget));
  return { ...common, status: 'watch', projectedStart: addDays(latest.date, Math.max(0, Math.round(daysToTarget - uncertaintyDays))), projectedEnd: addDays(latest.date, Math.round(daysToTarget + uncertaintyDays)), pointEstimate, explanation: `Latest reading: ${latest.brix.toFixed(1)}° on ${latest.date}. Recent linear slope: ${usableRecent ? `${recentSlope!.toFixed(3)}°/day` : 'not reliable'}. Using ${historical.source}, the blended slope is ${estimatedSlope.toFixed(3)}°/day; projected to reach ${target.min.toFixed(1)}° around ${pointEstimate}.` };
}

export class ForecastService {
  private data: LoadedData | null = null;

  refresh(): DataStatus { this.data = loadData(); return this.dataStatus(); }

  forecasts(filters: { region?: string; variety?: string; confidence?: string } = {}): Forecast[] {
    const data = this.ensureData();
    const samples = toSamples(data);
    const blockIds = new Set(samples.filter((sample) => sample.season === currentSeason).map((sample) => sample.blockCode));
    return [...blockIds].map((blockId) => forecastBlock(blockId, data, samples)).filter((forecast): forecast is Forecast => forecast !== null)
      .filter((forecast) => !filters.region || forecast.region?.toUpperCase() === filters.region.toUpperCase())
      .filter((forecast) => !filters.variety || normalizeVariety(forecast.variety) === normalizeVariety(filters.variety))
      .filter((forecast) => !filters.confidence || forecast.confidence === filters.confidence)
      .sort((a, b) => (a.projectedStart ?? '9999-12-31').localeCompare(b.projectedStart ?? '9999-12-31'));
  }

  forecast(blockCode: string): { forecast: Forecast; history: BrixSample[] } | null {
    const data = this.ensureData();
    const blockId = [...data.blocks.values()].find((block) => block.parent_code === blockCode)?.block_id ?? blockCode;
    const samples = toSamples(data);
    const forecast = forecastBlock(blockId, data, samples);
    return forecast ? { forecast, history: samples.filter((sample) => sample.blockCode === blockId).sort((a, b) => a.date.localeCompare(b.date)) } : null;
  }

  dataStatus(): DataStatus {
    const data = this.ensureData();
    const current = data.brix.filter((observation) => observation.season === currentSeason);
    const currentBlockIds = new Set(current.flatMap((observation) => observation.block_id ? [observation.block_id] : []));
    return {
      loadedAt: data.loadedAt, generatedAt: data.quality.generated_at ?? null, files: data.files,
      currentSeasonBlocks: currentBlockIds.size, currentSeasonSamples: current.filter((observation) => observation.block_id !== null).length,
      historicalSamples: data.brix.filter((observation) => observation.season < currentSeason).length,
      unmappedCurrentSamples: current.filter((observation) => observation.block_id === null).length,
      blocksWithoutTargets: [...currentBlockIds].filter((blockId) => !data.targets.has(`${currentSeason}:${blockId}`)).length,
      warnings: data.quality.known_source_risks ?? [],
    };
  }

  backtest(season = 2024): { season: number; predictions: number; meanAbsoluteErrorDays: number | null; medianAbsoluteErrorDays: number | null } {
    const data = this.ensureData();
    const samples = toSamples(data).filter((sample) => sample.season === season);
    const byBlock = new Map<string, BrixSample[]>();
    for (const sample of samples) byBlock.set(sample.blockCode, [...(byBlock.get(sample.blockCode) ?? []), sample]);
    const errors: number[] = [];
    for (const [blockId, observations] of byBlock) {
      const target = data.targets.get(`${season}:${blockId}`);
      if (!target) continue;
      const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
      const actual = sorted.find((sample) => sample.brix >= target.min);
      if (!actual) continue;
      for (let index = 1; index < sorted.length; index += 1) {
        const observed = sorted.slice(0, index + 1);
        const cutoff = observed[observed.length - 1];
        if (cutoff.date >= actual.date) break;
        const slope = linearSlope(observed);
        if (slope === null || slope <= 0.01) continue;
        errors.push(Math.abs(daysBetween(addDays(cutoff.date, Math.round((target.min - cutoff.brix) / slope)), actual.date)));
        break;
      }
    }
    return { season, predictions: errors.length, meanAbsoluteErrorDays: errors.length ? Math.round(errors.reduce((sum, value) => sum + value, 0) / errors.length * 10) / 10 : null, medianAbsoluteErrorDays: median(errors) };
  }

  private ensureData(): LoadedData { if (!this.data) this.refresh(); return this.data!; }
}

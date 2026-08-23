# Engineer 1: Data and Status

This folder owns the source-workbook ingestion, canonical vineyard identifiers,
derived harvest status, and shared contracts used by the planner and forecasting
workstreams.

## Run

```bash
python3 -m pip install -r engineer_1/requirements.txt
python3 engineer_1/pipeline.py
python3 -m unittest engineer_1/test_pipeline.py
```

The pipeline reads the workbooks in `data/` without modifying them and writes
normalized JSON to `engineer_1/generated/`.

## Outputs

- `parent_blocks.json`: one record per parent vineyard code.
- `blocks.json`: one record per Status sub-block.
- `harvest_events.json`: normalized observations from Status `Row Counts`.
- `block_status.json`: latest operational state and derived remaining tons/loads.
- `harvest_plan.json`: normalized rows from all Schedule snapshots.
- `brix_observations.json`: long-form readings from 2022, 2023, 2024, and 2026.
- `crop_estimates.json`: observation-level crop estimates with one selected estimate
  per code/block/variety series.
- `data_quality.json`: extraction counts, unresolved joins, and assumptions requiring
  operator confirmation.
- `backend_block_candidates.json`: parent-block payload candidates shaped for the
  current backend, with explicit blockers when required forecast fields are absent.
- `review_queue.json`: deduplicated identifiers/names that need a human crosswalk.
- `dashboard_summary.json`: compact frontend KPIs, region/variety rollups, and
  current tracked block status.

## Canonical identifier rules

- `block_id` identifies the parent Status vineyard code, for example
  `block:CLMO01BA`.
- `subblock_id` identifies the physical Status sub-block, for example
  `subblock:CLMO01BA-N`.
- Sugar, crop, and schedule records can be parent-level when their source does not
  provide a trustworthy sub-block key.
- Unresolved records retain their source identity. The pipeline never silently
  fuzzy-matches vineyard names.

## Grounded MVP assumptions

- The Status `Source List` is the acreage and block master.
- The most recent Status event is the current state for a sub-block.
- Rolling TPA uses up to the three most recent observations with positive acres
  and tons.
- Each truck has four nominal six-ton compartments but a confirmed practical
  payload of 23.5 tons.
- The MVP assumes one trip per truck per night. Therefore one required load equals
  one required truck. Return trips and owned-versus-outsourced fleet optimization
  are deferred.
- Trucks should ideally be ordered 24 hours ahead; 12 hours is the minimum lead
  time. Trailers are staged before the night pick.
- One harvester covers approximately 10 acres per night.
- Crop observations are grouped by code + normalized block name + variety; the
  most recent dated observation is selected.
- Schedule names are mapped only when they exactly match a normalized Sugar
  vineyard name with one unambiguous code.
- 2022 Sugar rows remain unmapped unless an exact reviewed alias becomes
  available because that workbook has no block-code column.

## Highest-value operator confirmations

The demo can proceed without these, but a short phone call would materially
improve the logistics recommendation:

1. Confirm which managed blocks are active in the 2026 harvest scope.
2. Confirm the schedule-name to Status-code crosswalk for unresolved rows.
3. Later, capture round-trip time and owned-versus-outsourced availability if the
   product will optimize return trips or sourcing. These are not MVP blockers.

## Current backend contract note

The backend currently requires `estimated_tons`, `harvest_window_start`, and
`harvest_window_end` on every canonical block. Those values are not present for
every block and should be nullable until the crop and forecasting workstreams fill
them. `backend_block_candidates.json` refuses to invent these fields and marks each
record's blockers.

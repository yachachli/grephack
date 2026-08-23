# Backend handoff

## Confirmed hauling assumptions

- Practical payload: **23.5 tons per truck**.
- Physical configuration: four nominal six-ton compartments.
- One scheduled load means one distinct truck for the MVP.
- Assume one trip per truck per night.
- Trucks may circle back in reality, but distance and timing make this unreliable.
- The fleet is a mix of owned and outsourced trucks; sourcing optimization is a
  later feature.

The MVP calculation is therefore:

```text
required_trucks = ceil(expected_tons / 23.5)
truck_gap = scheduled_trucks - required_trucks
```

If the source Schedule already gives an explicit planned-load count, use that as
the required truck count for the night and show the tonnage-derived count as a
cross-check.

## Required backend adjustment

The current backend uses 20 tons in three places:

- `nightly_truck_capacity.tons_per_load` database default
- `nightly_capacity` view fallbacks
- planner route validation default

Engineer 2 should change all three to **23.5**. The current README example should
also change: 240 tons requires `ceil(240 / 23.5) = 11` trucks, not 12. If the
operator explicitly plans 12 loads, the explicit plan should win.

Separately, canonical block fields `estimated_tons`, `harvest_window_start`, and
`harvest_window_end` should be nullable until crop estimation and forecasting have
produced them.

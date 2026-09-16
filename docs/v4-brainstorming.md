# Mapache v4 Architecture Brainstorming

## Executive summary

Mapache v3 proves the full telemetry loop: vehicle-specific adapters receive data, decode it, persist raw frames and normalized signals, expose historical queries, and stream recent values into purpose-built dashboards. The rewrite should preserve that product capability while replacing contracts that assume Gaucho Racing model years, CAN, MQTT, and separate live/historical user experiences.

The recommended v4 shape is a telemetry platform with five explicit layers:

1. **Adapter boundary:** independently deployed ingest adapters authenticate and submit canonical observations plus optional raw events.
2. **Control plane:** vehicles, platforms, signal definitions, adapter installations, credentials, sessions, dashboards, and authorization live in a transactional store.
3. **Data plane:** an append-oriented ingestion service validates, identifies, durably queues, stores, and publishes observations.
4. **Query and subscription engine:** one semantic query model serves bounded history, snapshot-plus-stream subscriptions, and replay.
5. **Dashboard runtime:** widgets declare data requirements and consume a shared timeline-aware data source instead of implementing transport and playback themselves.

The most important teardown is to remove direct storage and live-publication responsibilities from vehicle-specific adapters. An adapter should not create ClickHouse tables, know Mapache's internal broker topology, expose a parallel API, or own authentication against the vehicle service. It should translate a source protocol into a versioned ingestion contract. Mapache should own validation, idempotency, persistence, fan-out, and lifecycle policy.

The most important domain changes are:

- Replace the compiled `VehicleType` enum with data-driven platforms, vehicles, adapter installations, and capabilities.
- Split immutable signal definitions from high-volume signal observations.
- Give every observation event time, ingest time, quality, source identity, definition revision, and deterministic provenance.
- Treat sessions, laps, sectors, markers, and annotations as interval/event overlays rather than fields embedded in telemetry.
- Replace duplicated Python and TypeScript query parsers with a versioned AST contract and one authoritative parser/compiler.
- Unify history and live delivery around a resumable cursor and a deterministic snapshot-to-stream handoff.
- Make widgets portable specifications over semantic signal requirements, with custom code reserved for specialized visualizations.

## Current architecture and useful foundations

The current repository contains these major runtime concerns:

- `auth`: Sentinel integration and user lookup.
- `vehicle`: vehicle records, sessions, laps, markers, and configuration flags in Postgres.
- `gr26` and `p987`: source-specific MQTT consumers, decoders, ClickHouse writers, raw CAN APIs, upload-key validation, and live MQTT publishers.
- `live`: MQTT consumer, in-memory recent-value cache, subscription hub, and WebSocket/SSE APIs.
- `query`: ClickHouse query APIs, a small Mapache query language, signal alignment, and Postgres-backed signal definitions.
- `dashboard`: vehicle administration, session analysis, historical signal exploration, live diagnostics, and a hardcoded vehicle-type widget registry.
- `Foreman`: durable jobs used by the GR26 Shelter import path.
- `Kerbecs`: routing and response envelopes across the service fleet.

Several current choices are worth carrying forward:

- ClickHouse is a sensible store for high-rate analytical telemetry.
- Postgres is a sensible control-plane store.
- Keeping raw frames alongside decoded observations enables debugging and reprocessing.
- Distinguishing source event time from ingest time is essential.
- Server-side decimation and bounded result sizes are necessary.
- A small query language is safer and more usable than exposing SQL.
- The live service's subscribe-before-snapshot ordering recognizes the critical history/live race.
- Foreman-style durable work is appropriate for imports and reprocessing.

The rewrite should retain these principles while changing ownership and contracts.

## Design goals

V4 should support:

- Production vehicles, race cars, simulators, dynamometers, test benches, and one-off experiments without core code changes.
- Live telemetry, delayed uploads, bulk imports, corrected data, and re-decoding from raw source events.
- Multiple organizations and fleets with explicit authorization boundaries.
- Multiple adapters and sources on one vehicle at the same time.
- Signal definition evolution without silently changing historical meaning.
- Typed quality and provenance rather than dropped or unexplained values.
- The same dashboard and widget definitions in live, recent, session replay, and arbitrary historical modes.
- Stable APIs and SDKs that can evolve independently from storage implementation.
- Horizontal scaling, backpressure, replay, observability, and disaster recovery.

V4 does not need to be a universal event database. The core remains numerical and state-oriented vehicle telemetry. Logs, images, video, traces, and arbitrary blobs should be related resources with their own storage paths.

## Proposed system boundaries

### Start with a modular core

A rewrite does not require immediately deploying every domain as a microservice. The current fleet duplicates configuration, authentication, HTTP middleware, migrations, clients, and release workflows. It also turns local development and atomic changes into distributed-systems work.

A production-grade initial v4 can be:

- One control/query API deployment with clear internal modules.
- One ingestion gateway deployment optimized for writes.
- One subscription gateway deployment optimized for long-lived connections.
- One worker deployment for imports, reprocessing, retention, and materialization.
- Independently deployed ingest adapters.
- Postgres, ClickHouse, object storage, and a durable event backbone.

These boundaries may share a monorepo and generated contracts. Split them further only when scaling or ownership requires it.

### Control plane

The control plane owns relatively low-volume, transactional state:

- organizations and memberships
- fleets and projects
- vehicle platforms and vehicles
- data sources and adapter installations
- signal definitions and revisions
- credentials and policies
- sessions, laps, sectors, markers, and annotations
- dashboards, widget instances, and saved queries
- ingest runs and reprocessing jobs

Postgres should enforce foreign keys, uniqueness, lifecycle state, and optimistic concurrency. Use explicit migrations rather than application-startup `AutoMigrate` or `create_all`.

### Data plane

The data plane owns high-volume append paths:

- canonical observations
- raw source events or references to object storage
- ingestion errors and dead-letter records
- live fan-out
- query rollups and derived materializations

The critical path should be:

```text
adapter
  -> ingest gateway
  -> durable event log
  -> storage writer -> ClickHouse
  -> subscription fan-out -> connected clients
  -> optional processors -> derived observations / alerts
```

The gateway should acknowledge only after the configured durability boundary is reached. Direct asynchronous ClickHouse inserts followed by best-effort MQTT publication can lose one side, reorder them, or make live data disagree with history.

The durable event log can initially be a managed or operationally simple broker, but the contract must provide partition ordering, consumer offsets, retention, and replay. The choice between Kafka-compatible infrastructure, NATS JetStream, or another system should be benchmarked against expected throughput and team operations. MQTT may remain an edge transport; it should not be the canonical internal consistency mechanism.

### Adapter contract

An ingest adapter should:

- Connect to the source system.
- Preserve source identifiers and timestamps.
- Decode source-specific payloads when appropriate.
- Register or reference compatible signal definitions.
- Submit batches of canonical observations and optional raw events.
- Report health, lag, and decoding errors.

It should not:

- Write Mapache databases directly.
- Create source-specific tables in Mapache's database.
- Publish to private live topics.
- Implement a Mapache-facing query API.
- Embed Mapache database credentials.
- Decide retention or authorization policy.

Use a versioned ingestion API with generated SDKs. A streaming gRPC API is attractive for efficient long-lived ingestion, while an HTTP batch endpoint lowers the barrier for scripts and experimental adapters. Both should map to the same protocol schema.

A batch should carry an adapter installation ID, vehicle ID, ingest-run ID, schema version, observations, and optional raw-event references. Responses should report accepted, rejected, and retryable records individually enough to prevent poison records from blocking a batch.

## Vehicle domain redesign

### Problems in v3

The current `Vehicle` contains `id`, `name`, `description`, `type`, and a numeric upload key. The valid types are constants compiled into the vehicle service. This creates several constraints:

- Adding a platform requires a core deployment.
- `type` conflates platform, model year, decoder family, and dashboard selection.
- One upload key is both vehicle identity and adapter authorization.
- Secrets are returned and updated as normal vehicle fields.
- There is no organization, fleet, lifecycle, timezone, or capability model.
- Vehicle-type config flags assume all variation is inheritance from one string type.
- The dashboard selects hardcoded widget registries by the same type string.

### Proposed entities

#### Organization

```text
id
slug
name
created_at
```

Every vehicle, dashboard, credential, and query authorization decision should be scoped to an organization. Gaucho Racing can be the first organization without baking it into the schema.

#### Vehicle platform

```text
id
organization_id nullable for global platforms
slug
manufacturer
model
generation
model_year_start
model_year_end
description
metadata
created_at
updated_at
```

Examples are `gaucho-racing/gr26` and `porsche/987`. A platform describes a family and default semantic capabilities; it is not an adapter or an individual physical vehicle.

#### Vehicle

```text
id
organization_id
platform_id nullable
slug
display_name
description
vin nullable
serial_number nullable
timezone
status
commissioned_at nullable
decommissioned_at nullable
metadata
created_at
updated_at
version
```

`id` should be opaque and immutable. `slug` is the human-readable API identifier and can be unique within an organization. The vehicle should not contain plaintext ingest credentials.

`status` should distinguish at least `provisioning`, `active`, `inactive`, and `retired`. Deletion should normally be soft because telemetry and sessions reference the vehicle.

#### Data source

```text
id
vehicle_id
slug
kind
display_name
clock_domain
metadata
created_at
updated_at
```

A vehicle can have many sources: primary CAN, body CAN, GPS logger, simulator, dyno, manually imported CSV, or derived processor. A source is stable across adapter restarts and gives observations provenance without encoding `ecu_` or `pcan_` into every signal name.

#### Adapter installation

```text
id
organization_id
vehicle_id nullable
adapter_type
adapter_version
display_name
status
configuration_reference
last_seen_at
created_at
updated_at
```

This is one configured instance of `gr26-mapache-ingest`, `p987-mapache-ingest`, or a third-party adapter. Credentials belong to the installation and should use scoped service identities, rotation, expiration, revocation, and audit logs. Store only hashes or references to a secret manager.

#### Capability

Platform and vehicle behavior should be discovered from data, not compiled enums. Capabilities can be inferred from registered signal semantics and explicitly declared where needed:

```text
gps.position
vehicle.speed
battery.pack
combustion.engine
track.lap_timing
```

Widgets should target capabilities and required signal roles. A GR26 and Porsche widget can then share implementations when they expose equivalent semantics.

### Vehicle configuration

The current typed defaults plus per-vehicle overrides are a useful pattern. V4 should separate vehicle configuration from Mapache application settings and make it revisioned:

```text
configuration_schema
configuration_revision
vehicle_configuration_assignment
configuration_delivery
```

Each published revision should be immutable, validated against a JSON Schema or similarly expressive schema, attributable to a user, and auditable. A delivery record should distinguish requested, fetched, applied, rejected, and timed-out states. A GET request is not a reliable acknowledgment that firmware applied a configuration.

## Signal model redesign

### Terminology

Use distinct terms consistently:

- **Signal definition:** immutable semantics of one measurable quantity revision.
- **Signal binding:** how a platform/source maps a local source field to a definition.
- **Observation:** one value for one bound signal at one event time.
- **Raw event:** original transport record from which observations may be decoded.
- **Derived signal:** a definition whose observations are computed from other observations.

Calling both definitions and samples “signals” causes ambiguity in APIs and code.

### Problems in v3

The current observation row is:

```text
id, timestamp, vehicle_id, name, value, raw_value, produced_at, created_at
```

This assumes a numeric CAN-like source, uses a mutable name as identity, embeds source names into signal names, has no units or quality, and deduplicates on `(vehicle_id, timestamp, name)`. It cannot reliably distinguish two sources at the same timestamp, definition changes, clock uncertainty, replay, corrections, or derived values.

The existing Postgres signal definition contains only `id`, `vehicle_type`, `name`, and `description`; it is disconnected from observations and cannot define units, type, source, validity, or revisions.

### Signal definition

Definitions should have a stable conceptual identity and immutable revisions:

```text
signal_definition
  id
  organization_id nullable
  canonical_name
  display_name
  description
  quantity_kind
  created_at

signal_definition_revision
  id
  signal_definition_id
  revision
  value_type
  unit_code
  expected_min nullable
  expected_max nullable
  precision nullable
  enum_values nullable
  bitmask_values nullable
  tags
  effective_from nullable
  deprecated_at nullable
  replaced_by nullable
  created_by
  created_at
```

`canonical_name` should be semantic and stable, such as `vehicle.speed`, `powertrain.motor.speed`, or `battery.pack.voltage`. Use a documented namespace convention without pretending every source will map perfectly to a global ontology.

`unit_code` should use a machine-readable standard such as UCUM where practical. Store the canonical unit of the observation; display conversion is a query/UI concern. `quantity_kind` prevents dimensionally similar but semantically distinct values from being treated as interchangeable.

`value_type` should support at least `float`, `integer`, `boolean`, `enum`, and `bitmask`. The core analytical table can optimize these physically, but the API must preserve semantics. Arbitrary text and structured events belong in an event/log model rather than being coerced into numeric telemetry.

### Signal binding

The binding connects universal or organization-level semantics to a specific platform/source:

```text
id
platform_id nullable
vehicle_id nullable
source_id
local_name
signal_definition_revision_id
decoder_reference nullable
calibration_revision_id nullable
status
created_at
```

This lets `ecu_vehicle_speed`, `psm_rear_left_wheel_speed`, and a simulator field map to appropriate definitions without losing their local identities. Vehicle-specific overrides are possible without forking global definitions.

### Observation table

A logical observation should contain:

```text
observation_id optional
organization_id
vehicle_id
source_id
signal_binding_id
signal_definition_revision_id
event_time
ingest_time
value_float nullable
value_int nullable
quality_flags
raw_value_int nullable
raw_event_id nullable
ingest_run_id
source_sequence nullable
correction_version
```

Important decisions:

- Use `DateTime64(9, 'UTC')` or an explicit signed 64-bit epoch for event time. Never use platform-sized `int`.
- Keep ingest time separately and assign it inside the trusted ingestion boundary.
- Make raw integer values optional. They are useful for binary decoders but meaningless for many sources.
- Keep raw payloads out of the main observation table.
- Store a definition revision so historical interpretation cannot change underneath the data.
- Store a source and ingest run for provenance.
- Use quality flags for composable conditions such as `clock_unsynchronized`, `out_of_range`, `sensor_fault`, `stale`, `estimated`, `interpolated`, `derived`, and `replayed`.
- Preserve non-finite input behavior explicitly. Reject it with a reason or encode quality plus null; do not silently emit invalid JSON later.

A single `Float64 value` is operationally simple and may remain the first physical implementation. If so, `value_type` in the definition remains authoritative and integer precision limits must be documented. Do not add many nullable physical columns until real workloads justify them.

### Identity, idempotency, and corrections

`(vehicle, timestamp, name)` is not a safe natural key. An observation needs a deterministic source identity, preferably:

```text
adapter_installation_id + source_id + source_partition + source_sequence + signal_binding_id
```

For files, identity can include object version and row index. Where a source has no sequence, the adapter SDK can generate a stable record key from immutable source attributes. Content hashes alone cannot distinguish legitimate repeated equal readings.

Late retries with the same identity must be idempotent. Corrections should increment a version or supersede an observation rather than mutate history invisibly. ClickHouse may use a replacing engine, but the API needs explicit correction semantics and queries need deterministic latest-version behavior without relying casually on eventual background merges.

### Raw events

Raw events should be first-class because they enable decoder debugging and reprocessing:

```text
id
organization_id
vehicle_id
source_id
adapter_installation_id
event_time
ingest_time
content_type
payload_inline nullable
object_uri nullable
checksum
metadata
ingest_run_id
source_sequence nullable
```

Small CAN frames can live in a specialized ClickHouse table. Large files belong in object storage with checksums and immutable object versions. A raw event may produce zero, one, or many observations. Decode failures should be queryable records, not only logs or JSON notes hidden in adapter-specific CAN tables.

### ClickHouse physical design

Do not finalize the sort key from intuition alone. Benchmark representative workloads:

- one vehicle, tens of definitions, narrow time window
- one vehicle and one definition over months
- many vehicles sharing semantic definitions
- live catch-up over the last minutes
- session exports and multi-signal alignment
- quality/provenance filtering

A likely initial ordering is `(organization_id, vehicle_id, signal_binding_id, event_time, source_sequence)` with time-based partitions. The current `(vehicle_id, timestamp, name)` order favors scanning many names in a narrow window but is less efficient for long single-signal ranges. Projections or materialized views may support both patterns.

Add retention tiers and rollups deliberately:

- raw events: short or policy-driven hot retention, longer object-storage retention
- full-resolution observations: configurable by organization/source
- downsampled aggregates: longer retention with count, min, max, mean, first, last, and quality summaries

Use explicit schema migrations owned by the platform, not adapters.

### Is ClickHouse the right serving database?

ClickHouse is a strong fit for continuously ingested, high-cardinality telemetry and concurrent interactive queries, but it is not automatically the most economical fit for Mapache. The current infrastructure deliberately selects an `r8g.xlarge` with 4 vCPU and 32 GiB RAM because ClickHouse benefits from memory for indexes, caches, merges, and query execution. That is a production-oriented choice, not a hard minimum. A smaller node can run Mapache's current load, but reduced cache and query headroom will make concurrent scans, merges, and imports less predictable.

The v4 design should treat the analytical storage engine as an evaluated choice rather than a permanent architectural assumption.

#### ClickHouse with local storage

Strengths:

- Low and predictable latency for recent and repeated queries.
- Efficient continuous inserts, background compaction, compression, and time-series aggregation.
- Mature concurrency, workload controls, materialized views, and server-side query cancellation.
- One engine owns ingestion layout and query serving.

Costs and limits:

- Compute and memory remain provisioned while idle.
- Durable local block storage, backups, and replacement procedures remain Mapache's responsibility in a self-managed single-node deployment.
- A single node is a failure and maintenance boundary; replication increases the baseline cost substantially.
- Engine-specific table layouts make object-store data less portable to other tools.

For a small team with sporadic historical use, the always-on serving capacity can dominate the storage bill.

#### ClickHouse with S3-backed MergeTree storage

ClickHouse supports S3 as a MergeTree disk and supports a local cache in front of that disk. This separates durable capacity from compute and can remove the need for a large persistent data volume. It does not eliminate the ClickHouse server or its memory requirement.

Expected behavior:

- Hot cached ranges can approach local-disk behavior.
- Cold queries pay object-store metadata and range-request latency before useful scanning begins.
- Wide scans can use substantial network bandwidth and incur request/transfer costs.
- A small cache causes repeated dashboard queries to churn remote objects.
- Merges and mutations also interact with remote storage, so write amplification and S3 requests need measurement.
- ClickHouse still keeps local metadata; self-managed backup and recovery procedures must account for it.

This is the lowest-risk way to test object storage because it preserves the current query engine and API. It primarily saves durable storage cost and decouples capacity; it does not produce scale-to-zero compute. Official ClickHouse guidance specifically positions S3-backed storage for cases where cold-data performance is less critical and notes that self-managed separation of storage and compute is more complex than a standard deployment.

#### Iceberg on S3 with DuckDB query workers

Iceberg is a table format, not a serving database. It provides snapshots, schema and partition evolution, metadata-based file planning, and transactional table commits over Parquet files. DuckDB supplies vectorized SQL execution inside each query-service process.

This can fit Mapache well when most historical requests are:

- scoped to one vehicle
- bounded to a session or modest time range
- limited to a small set of signal bindings
- downsampled to a few thousand points
- issued by a relatively small number of concurrent users

DuckDB reads Parquet from S3 with HTTP range requests and can avoid unneeded columns and row groups when filters and file statistics permit. An Iceberg catalog gives query workers a consistent current snapshot and enables writes; direct metadata-file reads are read-only and require explicit version discovery.

Benefits:

- S3 becomes the inexpensive, durable source of truth.
- Stateless read-only query workers can start on demand and scale horizontally.
- Other engines and notebooks can read the same open table.
- DuckDB has excellent local analytical execution, including ASOF joins useful for multi-rate telemetry.
- Per-query memory can be capped and larger operations can spill to local temporary disk.

Costs and limits:

- Cold-start and cold-cache latency is materially higher than a warm serving database.
- Every worker has its own metadata/data cache unless Mapache builds a shared cache layer.
- DuckDB is embedded compute, not by itself a multi-tenant distributed query service. Mapache must implement admission control, process isolation, cancellation, timeouts, caching, and horizontal routing.
- Concurrent heavy dashboard queries multiply CPU, memory, temporary disk, and S3 bandwidth requirements across workers.
- Continuous small commits create small Parquet files and large Iceberg manifests. Iceberg documentation explicitly calls out file-open and metadata overhead and requires periodic compaction.
- A catalog, writer, snapshot expiration, orphan-file cleanup, compaction, and schema maintenance become production services or scheduled jobs.
- Newly ingested data is only historically queryable after a file is written and an Iceberg snapshot commits.

Iceberg therefore cannot be the complete live path. A durable event log and recent-observation buffer must serve the uncommitted tail. Historical queries read a known Iceberg snapshot, then the subscription layer merges observations after that snapshot watermark before entering live mode.

#### Approximate compute envelopes

These are planning ranges to benchmark, not guaranteed sizing. Query shape and concurrency matter more than total stored bytes.

| Architecture | Starting compute | Local disk | Idle behavior | Expected interactive behavior |
| --- | --- | --- | --- | --- |
| ClickHouse, local hot data | 4 vCPU, 16–32 GiB RAM | 100–200+ GiB durable SSD | Always running | Best and most predictable sub-second behavior when indexed and warm |
| ClickHouse, S3-backed with cache | 4 vCPU, 16–32 GiB RAM | 20–100 GiB cache/temp | Always running | Warm queries can be fast; cold queries may move into hundreds of milliseconds or seconds |
| DuckDB worker over Iceberg/S3 | 2–4 vCPU, 4–8 GiB RAM per light worker | 10–50 GiB ephemeral cache/temp | Can scale to zero | Good for pruned session queries; cold metadata and object reads commonly dominate first-query latency |
| DuckDB worker for broad joins/scans | 4–8 vCPU, 8–16+ GiB RAM | 50–200 GiB ephemeral temp/cache | Can be created per workload | Strong single-query throughput, but each concurrent broad query needs its own resource share |

DuckDB defaults its memory limit to 80% of host RAM, though that limit applies to its buffer manager rather than every allocation. A production query worker should set explicit memory and temporary-directory limits below the container limit. Running one 8 GiB worker does not mean the service can safely execute many simultaneous 8 GiB queries; use a bounded worker pool or one isolated process per admitted query class.

The current ClickHouse 32 GiB choice buys shared cache and concurrency headroom for every request. DuckDB reduces the idle floor, but compute cost becomes proportional to active queries and repeated S3 reads. At low concurrency that is likely cheaper. At sustained concurrency, a warm ClickHouse node can be both faster and cheaper than many isolated DuckDB workers.

#### File layout matters more with DuckDB

An Iceberg experiment will perform poorly if the ingestion path emits one tiny file per batch or partitions by high-cardinality identifiers without controlling file counts. The writer should buffer observations into moderately large, sorted Parquet files and expose bounded commit latency.

Candidate layout decisions to benchmark include:

- Iceberg partition transforms on event date/hour.
- Bucketing or clustering by organization, vehicle, and signal binding.
- Sorting within files by vehicle, signal binding, and event time.
- Target files in the approximate 64–256 MiB range for Mapache's interactive workload, rather than blindly choosing very large lakehouse defaults.
- Row-group sizing that lets a session query avoid downloading unrelated signals and time ranges.
- Commit intervals that balance freshness against file and snapshot count.

The exact values must come from Mapache traces. A layout optimized for querying one signal over a year differs from one optimized for replaying 200 signals over a 30-minute session.

#### Recommended architecture to evaluate

For v4, the most promising cost-oriented design is:

```text
adapters
  -> ingest gateway
  -> durable event log
      -> recent/live subscription path
      -> buffered Parquet/Iceberg writer -> S3

query API
  -> result cache
  -> DuckDB worker pool -> Iceberg snapshot on S3
  -> recent-tail merge when the requested range crosses the committed watermark
```

This makes Iceberg the durable analytical truth and DuckDB replaceable compute. Keep a hot serving tier optional rather than mandatory. If benchmarks show that recent interactive queries or concurrency miss their SLOs, add a small ClickHouse hot tier containing the most recent days or weeks while retaining Iceberg for durable history. The query planner can route ranges to hot ClickHouse, cold Iceberg, or both.

That hybrid provides excellent performance but doubles write paths and consistency work. It should only be introduced after the Iceberg/DuckDB baseline fails a measured requirement. Starting with both creates more operational burden than the current system.

#### Benchmark before selecting

Build the benchmark from real GR26 and Porsche data and include the full API transformation, not only `SELECT count(*)`:

1. Latest 10 seconds for 10, 100, and 500 signals.
2. Thirty-minute session replay for 20 and 200 signals, downsampled to dashboard width.
3. One signal across one day, one month, and one year.
4. GPS plus vehicle-state ASOF alignment.
5. Ten and fifty concurrent dashboard users with repeated and disjoint ranges.
6. Cold worker/cache, warm worker/cache, and worker restart.
7. Continuous ingest while compaction and queries run.
8. Snapshot commit freshness, historical-to-live handoff, and late-data visibility.
9. S3 GET/range bytes and request count per user action.
10. Failure recovery after a writer, catalog, query worker, or ClickHouse restart.

Record p50/p95/p99 latency, scanned and transferred bytes, peak memory, CPU-seconds, temporary disk, object-store requests, ingest-to-query freshness, and monthly idle/load cost.

#### Provisional recommendation

Do not assume the production system requires a permanent 32 GiB ClickHouse node. Prototype Iceberg on S3 with a bounded DuckDB worker pool as the primary historical engine. It is likely to be sufficient if Mapache remains session-oriented with low-to-moderate concurrency and accepts roughly sub-second-to-few-second cold queries.

Keep the live and uncommitted recent tail on the durable event/subscription path. Do not query Iceberg for individual live updates. If the benchmark requires consistently low sub-second historical latency or materially higher concurrency, use ClickHouse as a hot serving tier or retain it as the primary serving database. S3-backed ClickHouse is a useful intermediate experiment, but it saves storage more than compute and should not be mistaken for a serverless architecture.

## Sessions and motorsport overlays

Sessions are valuable but should not define the core storage model. A “session” may be a race outing, road trip, dyno pull, charging cycle, test procedure, or arbitrary investigation window.

Use a general interval model:

```text
activity
  id
  organization_id
  vehicle_id
  kind
  name
  description
  start_time
  end_time nullable
  status
  metadata
  created_by
  version

activity_interval
  id
  activity_id
  parent_id nullable
  kind
  ordinal nullable
  start_time
  end_time
  metadata

annotation
  id
  vehicle_id
  activity_id nullable
  event_time or start/end
  kind
  label
  payload
  created_by
```

Laps and sectors become typed nested intervals. Markers become point annotations. Analysis output should be versioned artifacts with algorithm identity, inputs, and creation time, not a mutable JSON blob on the session row. This supports rerunning analysis and comparing versions.

## Mapache Query Language v4

### What v3 does well

The current method-chain language is intentionally constrained, parameterized, and maps to a typed AST. It supports aggregation, name filters, grouping, rollups, outlier rejection, fill hints, and labels. Those are good foundations.

### Problems to remove

- The parser and AST validation are manually duplicated in Python and TypeScript.
- Queries operate on physical columns such as `signal.value`, `signal.raw_value`, and `name` instead of semantic definitions.
- Vehicle and timeframe are out-of-band request fields, making a query incomplete on its own and difficult to save or share.
- Each statement is sent as a separate HTTP request.
- Derived expressions run in the browser and align by array index, relying on every fetch producing exactly the same bucket axis.
- Pair queries use a separate endpoint and pandas `merge_asof`, with different semantics from time-series queries.
- Fill is partly a display concern and partly data transformation; current paths differ.
- Bucket axes are expanded in Python and capped to prevent memory exhaustion.
- The language has no explain/cost endpoint, metadata-aware autocomplete, unit checking, quality filtering, source filtering, joins, or explicit live eligibility.

### One canonical AST

Make the API's versioned AST the canonical contract. Text MQL is one syntax for creating it; the visual query builder edits the same AST.

```json
{
  "version": "v1",
  "scope": {"vehicle_ids": ["veh_..."]},
  "range": {"start": "...", "end": "..."},
  "select": [
    {
      "ref": "speed",
      "signal": {"definition": "vehicle.speed", "source": "primary"},
      "aggregate": "avg",
      "rollup": {"every": "100ms", "align": "epoch"},
      "quality": {"exclude": ["sensor_fault", "clock_unsynchronized"]}
    }
  ],
  "expressions": [
    {"ref": "speed_mph", "expression": "convert(speed, 'mi/h')"}
  ],
  "output": {"shape": "timeseries", "max_points": 5000}
}
```

Generate TypeScript, Go, and Python models from an API schema. Parse textual MQL only on the server, or compile a grammar to both targets from one source. The dashboard can optimistically edit an AST without maintaining an independent language implementation.

### Query capabilities

The first stable version should support:

- selectors by definition ID/canonical name, source, tags, platform, and vehicle
- event-time ranges and activity-relative ranges
- quality filters
- aggregation and explicit alignment
- bounded cardinality group-by
- fill/interpolation with maximum-gap limits
- unit conversion with dimensional validation
- server-side derived expressions
- aligned multi-signal tables for XY/XYZ plots
- raw/full-resolution access with strict limits and export jobs for large results
- query validation, explain, estimated cost, and cancellation

Do not make arbitrary SQL features available. Joins should be domain-specific: align observations by exact bucket, nearest event with tolerance, previous value, or interpolation. Each operation needs explicit semantics for gaps and quality.

### Unified result model

All chart paths should return a common typed frame:

```text
schema
  time column
  value columns with definition, unit, value type, and quality metadata

frames
  ordered columnar batches

cursor
  resume position / snapshot watermark

stats
  scanned rows, returned points, truncation, latency, warnings
```

Arrow IPC is worth evaluating for large historical and streaming frames because it preserves column types and reduces JSON overhead. JSON should remain available for simple SDK use.

The query compiler should own downsampling. For line charts, returning only an earliest sample per bucket can erase spikes. Use visualization-aware algorithms or aggregates that preserve min/max envelopes. The requested pixel width is often a better `max_points` input than a hardcoded interval list.

## Unified live, history, and replay

### Required semantics

Live is not a different data model. It is an open-ended event-time query. The same query should support:

- **history:** bounded `[start, end)` result
- **tail:** recent snapshot followed by updates
- **replay:** bounded history emitted according to a controllable virtual clock
- **catch-up:** historical data delivered quickly until a watermark, then live updates

### Snapshot-to-stream protocol

The current in-memory cache can bridge short ClickHouse visibility delays but cannot provide durable resume across replicas or outages. Created-at timestamps are not globally unique cursors, and silent per-client channel drops produce invisible gaps.

V4 subscriptions should use the durable log offset or another opaque monotonic cursor:

1. Authorize and validate the query.
2. Capture a subscription watermark/cursor.
3. Execute history through that watermark.
4. Buffer log events after the watermark while history runs.
5. Emit a snapshot-complete control frame.
6. Drain buffered events and continue tailing.
7. Include resumable cursors and periodic watermarks.

Deduplication should use observation identity/version, not a random ID plus timestamp heuristics. If a client falls behind, apply an explicit policy: coalesce with a gap notification, pause, or disconnect with a resumable cursor. Never silently drop without telling the consumer.

SSE is useful for simple one-way subscriptions; WebSocket or a streaming protocol is preferable when clients need to update queries, control replay speed, seek, pause, or acknowledge flow. V4 can support both over one subscription engine.

### Timeline controller

The dashboard needs one application-level timeline:

```text
mode: live | replay | paused
cursor_time
window_start
window_end
playback_rate
follow_live
watermark
```

Every widget reads this timeline and declares whether it needs a latest value, a rolling window, aligned series, aggregate, or event overlay. Seeking changes the query cursor; switching to live changes delivery mode, not widget implementation.

For replay, avoid loading entire sessions into every widget. Fetch shared window chunks around the cursor, prefetch ahead, cache by normalized query and range, and evict behind the playback window. Derived expressions should produce identical results in historical and live modes; stateful calculations need checkpoint or warm-up semantics.

## Dashboard and widget system

### Problems in v3

The registry imports every vehicle-specific widget and switches on hardcoded vehicle types. `LiveWidget` opens its own WebSocket while `SignalWidget` performs historical HTTP queries. Specialized widgets embed literal signal names and often reimplement buffering, nearest-value matching, freshness, and connection UI. The signal explorer has a richer query path than the vehicle dashboards, and widget state is largely local rather than a persisted, shareable dashboard definition.

This prevents reuse across vehicles and makes history/live fusion a widget-by-widget rewrite.

### Widget manifest

Separate a widget's visualization implementation from its instance configuration:

```text
widget_type
  id
  version
  name
  description
  visualization_kind
  configuration_schema
  data_contract
  capability_requirements

widget_instance
  id
  dashboard_id
  widget_type_id
  title
  layout
  query_ast
  bindings
  display_options
  version
```

Most widgets should be generic primitives:

- scalar/stat
- gauge
- state/enum
- time-series
- bar/pie
- XY/XYZ scatter
- map/path
- table/debug inspector
- battery-cell grid
- lap/sector comparison

A widget binds semantic roles to selectors, for example:

```text
role speed -> vehicle.speed
role latitude -> navigation.position.latitude
role longitude -> navigation.position.longitude
```

Custom React widgets remain possible for domain-heavy workflows such as endurance projections, but they should consume the same data-source interface and timeline controller.

### Shared data runtime

The dashboard should maintain a query planner and normalized cache above widgets:

- Collect widget query requirements.
- Deduplicate equivalent selectors and subscriptions.
- Combine compatible requests.
- Cache frames by tenant, vehicle, query hash, range, resolution, and definition revision.
- Merge history and stream updates once.
- Expose selectors/hooks for widgets.
- Track loading, stale, partial, gap, truncated, and error states explicitly.

One dashboard with twenty widgets should not open twenty independent streams or issue one request per MQL line. The server should accept multi-query plans, and the client should multiplex subscriptions.

Persist dashboards and saved queries in the control plane with ownership, sharing, revision history, and optimistic concurrency. Vehicle/platform templates can provide defaults without hardcoding them in the frontend bundle.

## API and authorization

### API contract

V4 should publish an OpenAPI and/or protobuf contract and generate clients. Use consistent response and error envelopes independent of gateway rewriting. Errors should include stable codes, human-readable messages, field paths, retryability, and correlation IDs.

Use cursor pagination rather than offset pagination for changing collections. Support idempotency keys on writes. Apply request deadlines, cancellation, rate limits, body limits, and query budgets at trusted boundaries.

### Authentication and authorization

Validate issuer, audience, expiration, signature algorithm, and key ID locally with a refreshing JWKS cache. Do not fall back to an arbitrary first key when an unknown `kid` is supplied. Avoid per-request calls to the identity provider for group checks.

Authorization must be resource-scoped:

- organization roles
- vehicle/fleet read and manage permissions
- ingest permission for a specific adapter installation and vehicle
- raw-event access, which may be more sensitive than decoded telemetry
- dashboard ownership and sharing
- export and administrative permissions

The vehicle service currently exposes mutation routes without an authentication middleware, and live streams accept browser connections with permissive origins. V4 should enforce policy in every service or at a trusted identity-aware gateway plus defense-in-depth checks. WebSocket origin checks and stream authentication need explicit handling. CORS must use configured origins; wildcard origins and credentials must not be combined.

Credentials should never be normal vehicle fields. Adapter credentials need hashing, rotation, expiration, revocation, last-used tracking, and audit events. Prefer short-lived workload identities where deployment infrastructure supports them.

## Reliability and operations

### Delivery guarantees

Define guarantees rather than implying them:

- adapter-to-gateway retry and idempotency behavior
- durability point for acknowledgment
- per-source ordering scope
- maximum accepted clock skew
- late-data policy
- correction policy
- storage visibility target
- subscription resume retention
- data-loss behavior during overload

At-least-once delivery plus deterministic idempotency is the pragmatic default. Exactly-once claims should be avoided unless the entire path can prove them.

### Backpressure and quotas

Bound all queues and make overload visible. Apply quotas per organization, adapter, vehicle, and subscription for:

- observations per second
- bytes per second
- active signal cardinality
- active subscriptions
- historical scan bytes
- output points and export size

Adapters should receive retryable throttling responses. Subscription clients should receive gap/coalescing notices. Dead-letter records should retain rejection reason, schema version, adapter identity, and a safe payload reference.

### Observability

Every component should emit structured logs, metrics, and traces with consistent IDs:

- organization, vehicle, source, adapter installation, ingest run
- batch and observation counts
- accepted/rejected/duplicate/corrected records
- source-to-ingest and ingest-to-visible latency
- broker lag and storage flush latency
- query scanned rows/bytes, result points, cache hit, and cancellation
- subscription clients, queue depth, dropped/coalesced points, resume success
- decoder coverage and failure cardinality

Avoid logging bearer tokens, upload credentials, raw sensitive payloads, or full user profiles. Add readiness checks that verify required dependencies and liveness checks that do not.

### Storage operations

Production readiness also requires:

- tested Postgres backups and point-in-time recovery
- ClickHouse replication/backups appropriate to deployment targets
- immutable object-storage retention and lifecycle policies
- migration rollback or forward-fix procedures
- restore drills
- capacity forecasts and retention budgets
- per-tenant deletion/export procedures
- disaster-recovery objectives

## Development and release model

Use one canonical contract package generated for Go, Python, and TypeScript rather than hand-maintained parallel structs. Keep adapters independently versioned, but publish an adapter conformance suite that verifies:

- authentication and registration
- batch validation and partial failure behavior
- idempotent retry
- timestamp and quality handling
- definition compatibility
- health reporting
- raw-event linkage

Use integration tests with real Postgres, ClickHouse, and the chosen event backbone for storage and handoff semantics. Unit tests should cover query parsing/planning and adapter decoding. Add load tests for ingest, historical queries, snapshot-to-stream handoff, reconnect storms, and slow clients.

Release APIs and schemas with compatibility rules. Database schema version, API version, adapter protocol version, and dashboard version should not be represented by one shared application version.

## Suggested v4 implementation sequence

### Phase 0: contracts and benchmarks

- Define vocabulary and invariants for vehicles, sources, definitions, observations, raw events, cursors, and activities.
- Capture representative GR26, Porsche 987, simulator, and file-import datasets.
- Benchmark ClickHouse layouts and serialization formats.
- Specify the ingestion protocol and query AST before implementing services.
- Define SLOs and expected throughput/cardinality.

### Phase 1: control plane

- Build organizations, platforms, vehicles, sources, adapter installations, and credentials.
- Build immutable signal definitions/revisions and bindings.
- Add resource-scoped authorization and audit logs.
- Replace hardcoded vehicle types with data-driven records and capabilities.

### Phase 2: ingestion data plane

- Build the ingestion gateway and durable event path.
- Build canonical ClickHouse writers and raw-event storage.
- Publish adapter SDKs and conformance tests.
- Port `gr26-mapache-ingest` and `p987-mapache-ingest` away from direct database/MQTT-internal writes.
- Verify replay, duplicate, correction, and partial-failure behavior.

### Phase 3: query engine

- Implement the canonical AST, validation, planner, and common frame result.
- Support metadata-aware selectors, quality filters, rollups, alignment, and unit conversion.
- Replace separate run/pairs/raw endpoints with one bounded query endpoint.
- Add explain, cancellation, budgets, and asynchronous exports.

### Phase 4: subscriptions and playback

- Implement durable cursor-based snapshot-plus-stream subscriptions.
- Build the shared timeline controller and client data runtime.
- Prove seamless history-to-live catch-up under concurrent ingestion.
- Implement pause, seek, replay rate, resume, gaps, and stateful-function warm-up.

### Phase 5: widget platform

- Build generic widget primitives and manifests.
- Persist dashboards, instances, bindings, and templates.
- Port current GR26 and Porsche widgets to semantic roles and the shared data runtime.
- Keep custom widget support but remove direct HTTP/WebSocket access from widget components.

### Phase 6: migration and cutover

- Dual-write or mirror selected v3 ingest into v4.
- Validate counts, values, timestamps, quality, and query outputs against known sessions.
- Backfill historical observations with explicit legacy definition revisions and provenance.
- Run v3 and v4 dashboards side by side.
- Cut over per vehicle/adapter, retaining raw inputs for reprocessing.

## Decisions to make before coding

1. What are the initial throughput, active signal cardinality, retention, and query SLO targets?
2. Is multi-organization hosting a first-release requirement or a schema-level future requirement?
3. Which durable event backbone best matches operational capacity and deployment environments?
4. Are observation values physically single-`Float64` in v4.0, or are typed value columns required immediately?
5. What definition namespace and unit standard will Mapache enforce?
6. How long must subscription cursors remain resumable?
7. Which derived functions must produce identical streaming and historical results in v4.0?
8. Are dashboards user-owned, team-owned, platform templates, or all three?
9. What raw-data retention and access restrictions apply to production vehicles?
10. Which v3 APIs or datasets require compatibility during migration?

## Recommended non-negotiable invariants

- Vehicle-specific adapters never write Mapache storage directly.
- Every observation is attributable to an organization, vehicle, source, adapter installation, definition revision, and ingest run.
- Event time and ingest time are distinct, explicit, and UTC-normalized.
- Retries are idempotent and corrections are versioned.
- Invalid or degraded data is retained with typed quality/provenance when safe, not silently discarded.
- Historical and live results use the same query semantics and result schema.
- Snapshot-to-stream handoff has a durable cursor and cannot silently lose an interval.
- Widgets do not own transport connections or implement independent timeline semantics.
- Vehicle platforms, capabilities, signal definitions, and widget templates are data-driven.
- Authorization is scoped to organization and resource at every trusted boundary.
- Schema changes use reviewed migrations, and recovery procedures are tested.

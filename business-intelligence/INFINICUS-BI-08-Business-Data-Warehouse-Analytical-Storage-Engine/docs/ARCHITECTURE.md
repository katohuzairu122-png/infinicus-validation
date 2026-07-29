# Architecture

## Processing Sequence

1. Register a governed warehouse dataset.
2. Declare fact, dimension, aggregate, or snapshot type.
3. Declare grain and primary key fields.
4. Declare partition fields.
5. Load BI-07 transformed records.
6. Validate grain uniqueness.
7. Plan partitions.
8. Execute append, replace, or upsert load.
9. Create warehouse load record and snapshot.
10. Publish a metric-definition handoff to BI-09.

## Production Note

The IndexedDB implementation is a demonstrator.

A production warehouse should use PostgreSQL, ClickHouse, BigQuery, Snowflake, Redshift, or another governed analytical database.

# Claude Instructions — ADI-09

- Treat triggers as observed signals, not conclusions or approved actions.
- Preserve tenant/business boundaries, source references, observation time and evidence IDs.
- Store every update as a new immutable version.
- Deduplicate repeated detector signals within the same tenant/business boundary.
- Validate linked goals when a goal resolver is available.
- Never silently promote severity or change a trigger's meaning.
- Publish open triggers to ADI-04 through the registered provider.
- Keep legacy import/export compatibility without editing the consolidated HTML.

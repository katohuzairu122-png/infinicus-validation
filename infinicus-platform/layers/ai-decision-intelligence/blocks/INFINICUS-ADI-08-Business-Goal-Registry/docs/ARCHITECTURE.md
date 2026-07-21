# Architecture

ADI-08 stores immutable goal versions. Create and update operations validate measurement fields and calculate direction-aware progress. The latest version is queryable while complete history remains available. A provider publishes active or explicitly referenced goals into ADI-04 context.

Legacy import/export helpers preserve the existing Goal Registry shape without editing its HTML or IndexedDB stores.

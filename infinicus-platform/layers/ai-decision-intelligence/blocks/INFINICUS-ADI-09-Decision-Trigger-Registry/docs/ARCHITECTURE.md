# Architecture

ADI-09 stores immutable trigger versions and controlled lifecycle transitions. Detector fingerprints and idempotency keys prevent repeated signals from creating duplicate triggers. A context provider exposes open or explicitly referenced triggers to ADI-04.

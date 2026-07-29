# Architecture

ADI-06 is a read-only anti-corruption layer around completed simulation outputs. Its injected reader queries the existing Simulation Engine or result repository. ADI-06 validates recorded run metadata and maps recorded values into ADI-04 fragments without recalculation.

No simulation command, model implementation or write operation exists in this package.

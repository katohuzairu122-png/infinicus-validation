import {
  BusinessRepository,
  SimulationModelRepository, SimulationScenarioRepository, SimulationRunRepository, SimulationResultRepository,
  DecisionQuestionRepository, DecisionCaseRepository, DecisionRecommendationRepository,
  type TenantContext, type SimulationRun,
} from '@infinicus/database';
import {
  runSimulation, type SimulationParams, type EngineRunResult,
  type IndustryCode, type EngineModeCode, type ExperienceCode, type CompetitionCode,
} from '@infinicus/simulation-engine';

/**
 * Matches the runtime convention every domain's errors.ts already uses
 * (see apps/api/src/errors.ts's own note): the base class sets `.name`
 * unconditionally, and apps/api's error handler maps by that name string,
 * not by `instanceof` — so this needs no export from @infinicus/database
 * to be handled identically to every other domain's ValidationError
 * (400, via the generic ValidationError entry in ERROR_STATUS_CODES).
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface StartSimulationInput {
  ideaText: string;
  capital: number;
  price: number;
  mktBud: number;
  team: number;
  industry: IndustryCode;
  loc?: string;
  mkt?: string;
  exp?: ExperienceCode;
  comp?: CompetitionCode;
  engMode?: EngineModeCode;
  extraDailyRev?: number;
}

/**
 * The full EngineRunResult (day-by-day array, discrete events, and the
 * complete 500-value Monte Carlo distribution — not just aggregates) is
 * returned here, matching what index.html's own pre-existing rendering
 * code (renderVerdict(), the dashboard charts, generateStaticAnalysis())
 * already expects from a local simulate()/monteCarlo() call — Phase 2
 * swaps the *source* of this data (a real backend run instead of
 * client-side computation), not the shape client-side rendering already
 * depends on. This is a single JSONB value on one row (simulation_result_
 * metrics), not per-iteration writes — no conflict with BUILD-27's own
 * per-iteration write-volume concern, which is specifically about
 * avoiding 500 separate INSERTs, not about the size of one JSON value.
 */
export type SimulationRunStatusResult = EngineRunResult;

export interface SimulationRunStatus {
  runId: string;
  status: string;
  failureMessage: string | null;
  result: SimulationRunStatusResult | null;
}

const RESULT_METRIC_CODE = 'engine_run_summary';

/**
 * Normalizes and validates a raw public-form submission into engine-ready
 * SimulationParams. This is Data Acquisition's contribution to this
 * pipeline: DA's own formal repositories (DataSourceRepository,
 * CollectionRunRepository, etc.) model *external system* connectors —
 * they don't fit "a person typed text into a form", so this step is
 * deliberately plain normalization/validation code rather than a forced
 * write into a repository designed for a different kind of intake.
 */
function normalizeInput(input: StartSimulationInput): SimulationParams {
  const idea = input.ideaText.trim();
  if (idea.length === 0) throw new ValidationError('idea text must not be empty');
  if (!Number.isFinite(input.capital) || input.capital <= 0) throw new ValidationError('capital must be a positive number');
  if (!Number.isFinite(input.price) || input.price <= 0) throw new ValidationError('price must be a positive number');
  if (!Number.isFinite(input.mktBud) || input.mktBud < 0) throw new ValidationError('mktBud must be a non-negative number');
  if (!Number.isInteger(input.team) || input.team < 1) throw new ValidationError('team must be a positive integer');
  if (input.extraDailyRev !== undefined && (!Number.isFinite(input.extraDailyRev) || input.extraDailyRev < 0)) {
    throw new ValidationError('extraDailyRev must be a non-negative number');
  }
  return {
    idea, capital: input.capital, price: input.price, mktBud: input.mktBud, team: input.team,
    industry: input.industry, loc: input.loc, mkt: input.mkt, exp: input.exp, comp: input.comp, engMode: input.engMode,
    extraDailyRev: input.extraDailyRev,
  };
}

/**
 * Runs a business idea through the real Simulation → AI Decision
 * Intelligence pipeline: Data Acquisition (normalization, above) →
 * Simulation (packages/simulation-engine, persisted through
 * SimulationModel/Scenario/Run/Result) → ADI (a DecisionRecommendation
 * carrying the verdict). Business Operations, Business Intelligence,
 * Digital Twin, Approved Business Action, and Continuous Learning are
 * deliberately not exercised here — they all presuppose an existing,
 * operating business with historical data, which a first-time idea
 * evaluation doesn't have yet.
 *
 * No job-runner infrastructure exists in this codebase (see BUILD-30's
 * known-limitations doc), so "async" here means: the route handler
 * returns immediately after the run is created in `queued` status, and
 * the actual work is scheduled via setImmediate — a real run is fast
 * (the engine itself is pure in-memory computation; only aggregate
 * iteration summaries/percentiles are persisted, not all 500 individual
 * iterations, to avoid BUILD-27's own flagged per-iteration write-volume
 * concern), but the shape (queued → running → completed/failed, polled
 * via getRunStatus) is kept for real robustness against slow requests.
 */
export class SimulationOrchestrationService {
  constructor(
    private readonly businesses: BusinessRepository = new BusinessRepository(),
    private readonly models: SimulationModelRepository = new SimulationModelRepository(),
    private readonly scenarios: SimulationScenarioRepository = new SimulationScenarioRepository(),
    private readonly runs: SimulationRunRepository = new SimulationRunRepository(),
    private readonly results: SimulationResultRepository = new SimulationResultRepository(),
    private readonly questions: DecisionQuestionRepository = new DecisionQuestionRepository(),
    private readonly cases: DecisionCaseRepository = new DecisionCaseRepository(),
    private readonly recommendations: DecisionRecommendationRepository = new DecisionRecommendationRepository()
  ) {}

  async startRun(ctx: TenantContext, businessId: string, rawInput: StartSimulationInput): Promise<{ runId: string }> {
    await this.businesses.getById(ctx, businessId); // 404s cleanly if the business doesn't exist/isn't in this tenant
    const params = normalizeInput(rawInput);

    const stamp = Date.now().toString(36);

    const model = await this.models.createModel(ctx, businessId, `engine-${stamp}`, 'Ported public-demo Monte Carlo engine');
    const modelVersion = await this.models.createVersion(ctx, model.id, businessId, 'window.INFINICUS.SIMULATION@1.0.0-ported');
    await this.models.validateVersion(ctx, modelVersion.id);
    await this.models.activateVersion(ctx, modelVersion.id);

    const scenario = await this.scenarios.createScenario(ctx, businessId, model.id, `scenario-${stamp}`, params.idea.slice(0, 120));
    const scenarioVersion = await this.scenarios.createVersion(ctx, scenario.id, businessId);
    for (const [parameterCode, value] of Object.entries(params)) {
      if (value === undefined) continue;
      await this.scenarios.addInput(ctx, scenarioVersion.id, businessId, parameterCode, value);
    }
    await this.scenarios.validateVersion(ctx, scenarioVersion.id);
    await this.scenarios.activateVersion(ctx, scenarioVersion.id);

    const { request } = await this.runs.createRequest(ctx, businessId, scenarioVersion.id, `request-${stamp}`, `idem-${businessId}-${stamp}`);
    const run = await this.runs.createRun(ctx, businessId, request.id, modelVersion.id, `run-${stamp}`, { sampleSize: 500, horizonDays: 90 });
    await this.runs.recordInput(ctx, run.id, businessId, 'form_submission', params);
    await this.runs.transitionRun(ctx, run.id, 'running');

    setImmediate(() => {
      this.executeRun(ctx, businessId, run.id, params).catch(() => {
        // executeRun already transitions the run to 'failed' with a
        // recorded failure reason on any error it catches; a rejection
        // escaping that itself means the failure-transition call also
        // failed — nothing further to do from a detached setImmediate
        // callback (no request/response to report back to).
      });
    });

    return { runId: run.id };
  }

  private async executeRun(ctx: TenantContext, businessId: string, runId: string, params: SimulationParams): Promise<void> {
    try {
      const outcome = runSimulation(params);

      await this.runs.recordIterationSummary(ctx, runId, businessId, 'final_cash', {
        sampleSize: outcome.mc.runs.length,
        meanValue: outcome.mc.runs.reduce((s, v) => s + v, 0) / outcome.mc.runs.length,
        minValue: outcome.mc.runs[0],
        maxValue: outcome.mc.runs[outcome.mc.runs.length - 1],
      });
      await this.runs.recordPercentiles(ctx, runId, businessId, 'final_cash', {
        p10: outcome.mc.p10, p25: outcome.mc.p25, p50: outcome.mc.p50, p75: outcome.mc.p75, p90: outcome.mc.p90,
      });

      const { result, version } = await this.results.createResult(
        ctx, businessId, runId, `result-${runId.slice(0, 8)}`,
        `Verdict: ${outcome.verdict.toUpperCase()} — survival ${(outcome.mc.survivalRate * 100).toFixed(0)}%`
      );
      await this.results.addMetric(ctx, version.id, RESULT_METRIC_CODE, outcome);
      await this.results.validateResult(ctx, result.id, version.id);
      await this.results.publishResult(ctx, result.id, version.id);

      await this.recordRecommendation(ctx, businessId, outcome);

      await this.runs.transitionRun(ctx, runId, 'completed', { engineVersion: outcome.engineVersion });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.runs.transitionRun(ctx, runId, 'failed', { failureCode: 'engine_error', failureMessage: message });
    }
  }

  /** ADI's contribution: a recommendation carrying the verdict — never an approved/executed action (that authority stays with ABA, per AD-021). */
  private async recordRecommendation(ctx: TenantContext, businessId: string, outcome: EngineRunResult): Promise<void> {
    const stamp = Date.now().toString(36);
    const question = await this.questions.createQuestion(
      ctx, businessId, `question-${stamp}`,
      `Should this idea proceed: "${outcome.params.idea.slice(0, 200)}"?`
    );
    const decisionCase = await this.cases.createCase(ctx, businessId, question.id, `case-${stamp}`);
    await this.cases.createVersion(ctx, decisionCase.id, businessId, `Simulated 90-day outcome: ${outcome.verdict.toUpperCase()}`);
    await this.cases.transitionStatus(ctx, decisionCase.id, 'recommended', 'simulation completed, verdict computed');

    const { recommendation, version } = await this.recommendations.createRecommendation(
      ctx, businessId, decisionCase.id, `recommendation-${stamp}`,
      `${outcome.verdict.toUpperCase()} — viability ${outcome.scores.VIABILITY}, survival rate ${(outcome.mc.survivalRate * 100).toFixed(0)}%`
    );
    await this.recommendations.addRationale(
      ctx, version.id, businessId, 'simulation_evidence',
      `500-run Monte Carlo over 90 days: p50 cash $${Math.round(outcome.mc.p50)}, survival rate ${(outcome.mc.survivalRate * 100).toFixed(0)}%, capital-adequacy ratio ${outcome.capRatio.toFixed(2)}.`
    );
    await this.recommendations.validateRecommendation(ctx, recommendation.id, version.id);
    await this.recommendations.publishRecommendation(ctx, recommendation.id, version.id);
  }

  async getRunStatus(ctx: TenantContext, runId: string): Promise<SimulationRunStatus> {
    const run: SimulationRun = await this.runs.getRun(ctx, runId);
    if (run.status !== 'completed') {
      return { runId: run.id, status: run.status, failureMessage: run.failureMessage, result: null };
    }
    const published = await this.results.getPublishedForRun(ctx, run.id);
    const latest = published[0];
    if (!latest) return { runId: run.id, status: run.status, failureMessage: null, result: null };
    const metrics = await this.results.getMetricsForPublishedResult(ctx, latest.id);
    const summaryMetric = metrics.find((m) => m.metricCode === RESULT_METRIC_CODE);
    return {
      runId: run.id,
      status: run.status,
      failureMessage: null,
      result: (summaryMetric?.valueJson as SimulationRunStatusResult | undefined) ?? null,
    };
  }
}

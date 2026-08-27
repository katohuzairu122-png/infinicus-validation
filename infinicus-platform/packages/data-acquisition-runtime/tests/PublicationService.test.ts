import { describe, it, expect } from 'vitest';
import {
  PublicationService,
  SUPPORTED_TARGET_LAYERS,
  MINIMUM_QUALITY_SCORE_FOR_PUBLICATION,
} from '../src/publication/PublicationService.js';
import { PublicationNotReadyError, QualityThresholdError } from '../src/errors.js';

describe('PublicationService.assertReadyForPreparation', () => {
  const svc = new PublicationService();

  const validInput = {
    runState: 'validated',
    targetLayer: 'business_operations',
    targetBlock: 'bo-01',
    qualityScoreExists: true,
    provenanceCount: 5,
    acceptedRecordCount: 5,
  };

  it('accepts a fully-ready input without throwing', () => {
    expect(() => svc.assertReadyForPreparation(validInput)).not.toThrow();
  });

  it('rejects a run that is not validated', () => {
    expect(() => svc.assertReadyForPreparation({ ...validInput, runState: 'collected' }))
      .toThrow(PublicationNotReadyError);
  });

  it('rejects an unsupported target layer', () => {
    expect(() => svc.assertReadyForPreparation({ ...validInput, targetLayer: 'business_intelligence' }))
      .toThrow(PublicationNotReadyError);
  });

  it('rejects a missing target block', () => {
    expect(() => svc.assertReadyForPreparation({ ...validInput, targetBlock: undefined }))
      .toThrow(PublicationNotReadyError);
    expect(() => svc.assertReadyForPreparation({ ...validInput, targetBlock: '  ' }))
      .toThrow(PublicationNotReadyError);
  });

  it('rejects when no quality score exists', () => {
    expect(() => svc.assertReadyForPreparation({ ...validInput, qualityScoreExists: false }))
      .toThrow(PublicationNotReadyError);
  });

  it('rejects when provenance count does not match accepted record count', () => {
    expect(() => svc.assertReadyForPreparation({ ...validInput, provenanceCount: 3 }))
      .toThrow(PublicationNotReadyError);
  });
});

describe('PublicationService.assertReadyForPublish', () => {
  const svc = new PublicationService();

  const validInput = {
    packageStatus: 'ready',
    targetLayer: 'business_operations',
    qualityScore: 80,
  };

  it('accepts a fully-ready package without throwing', () => {
    expect(() => svc.assertReadyForPublish(validInput)).not.toThrow();
  });

  it('rejects a package not in ready status', () => {
    expect(() => svc.assertReadyForPublish({ ...validInput, packageStatus: 'draft' }))
      .toThrow(PublicationNotReadyError);
    expect(() => svc.assertReadyForPublish({ ...validInput, packageStatus: 'published' }))
      .toThrow(PublicationNotReadyError);
  });

  it('rejects an unsupported target layer', () => {
    expect(() => svc.assertReadyForPublish({ ...validInput, targetLayer: 'outcome_monitoring' }))
      .toThrow(PublicationNotReadyError);
  });

  it('rejects a null quality score', () => {
    expect(() => svc.assertReadyForPublish({ ...validInput, qualityScore: null }))
      .toThrow(QualityThresholdError);
  });

  it('rejects a quality score below the minimum threshold', () => {
    expect(() => svc.assertReadyForPublish({ ...validInput, qualityScore: MINIMUM_QUALITY_SCORE_FOR_PUBLICATION - 1 }))
      .toThrow(QualityThresholdError);
  });

  it('accepts a quality score exactly at the minimum threshold', () => {
    expect(() => svc.assertReadyForPublish({ ...validInput, qualityScore: MINIMUM_QUALITY_SCORE_FOR_PUBLICATION }))
      .not.toThrow();
  });
});

describe('SUPPORTED_TARGET_LAYERS', () => {
  it('restricts BUILD-31\'s first slice to business_operations only', () => {
    expect(SUPPORTED_TARGET_LAYERS).toEqual(['business_operations']);
  });
});

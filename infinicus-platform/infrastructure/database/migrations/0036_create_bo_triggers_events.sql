-- Migration: 0036_create_bo_triggers_events
-- Stage 2C — updated_at triggers for mutable BO tables
--            + SQL outbox event helper + 16 per-event wrappers

BEGIN;

-- ── updated_at triggers ────────────────────────────────────────────────────────
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql).
-- NOT applied to append-only tables (opportunity_activities, order_events,
--   payment_allocations, purchase_receipts, supplier_performance_scores,
--   inventory_movements, delivery_notes, maintenance_records, asset_inspections,
--   case_activities, incident_escalations, operational_performance_records,
--   bo_handoff_records, bo_layer_assemblies, bo_layer_deployments).

CREATE TRIGGER set_updated_at_business_profile_extensions
  BEFORE UPDATE ON business_operations.business_profile_extensions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_department_responsibilities
  BEFORE UPDATE ON business_operations.department_responsibilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_role_assignments
  BEFORE UPDATE ON business_operations.role_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_leads
  BEFORE UPDATE ON business_operations.leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_opportunities
  BEFORE UPDATE ON business_operations.opportunities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_customer_accounts
  BEFORE UPDATE ON business_operations.customer_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_quotations
  BEFORE UPDATE ON business_operations.quotations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_quotation_line_items
  BEFORE UPDATE ON business_operations.quotation_line_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_order_line_items
  BEFORE UPDATE ON business_operations.order_line_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_invoice_line_items
  BEFORE UPDATE ON business_operations.invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_credit_notes
  BEFORE UPDATE ON business_operations.credit_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_purchase_orders
  BEFORE UPDATE ON business_operations.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_purchase_order_line_items
  BEFORE UPDATE ON business_operations.purchase_order_line_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_supplier_agreements
  BEFORE UPDATE ON business_operations.supplier_agreements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_inventory_balances
  BEFORE UPDATE ON business_operations.inventory_balances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_warehouse_zones
  BEFORE UPDATE ON business_operations.warehouse_zones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_storage_locations
  BEFORE UPDATE ON business_operations.storage_locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_fulfilment_orders
  BEFORE UPDATE ON business_operations.fulfilment_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_fulfilment_items
  BEFORE UPDATE ON business_operations.fulfilment_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_employee_assignments
  BEFORE UPDATE ON business_operations.employee_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_work_schedules
  BEFORE UPDATE ON business_operations.work_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON business_operations.tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_task_assignments
  BEFORE UPDATE ON business_operations.task_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_workflow_instances
  BEFORE UPDATE ON business_operations.workflow_instances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_resource_bookings
  BEFORE UPDATE ON business_operations.resource_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_maintenance_schedules
  BEFORE UPDATE ON business_operations.maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_expense_claims
  BEFORE UPDATE ON business_operations.expense_claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_expense_items
  BEFORE UPDATE ON business_operations.expense_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_support_cases
  BEFORE UPDATE ON business_operations.support_cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_compliance_controls
  BEFORE UPDATE ON business_operations.compliance_controls
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_risk_assessments
  BEFORE UPDATE ON business_operations.risk_assessments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_incidents
  BEFORE UPDATE ON business_operations.incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_bo_publication_packages
  BEFORE UPDATE ON business_operations.bo_publication_packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── outbox event base function ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION business_operations.emit_outbox_event(
  p_tenant_id       uuid,
  p_workspace_id    uuid,
  p_event_type      text,
  p_event_version   text,
  p_correlation_id  uuid,
  p_causation_id    uuid,
  p_payload         jsonb,
  p_aggregate_type  text DEFAULT NULL,
  p_aggregate_id    uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO events.outbox_events (
    id, tenant_id, workspace_id, event_type, event_version,
    payload, correlation_id, causation_id,
    aggregate_type, aggregate_id, status, created_at
  ) VALUES (
    gen_random_uuid(),
    p_tenant_id, p_workspace_id,
    p_event_type, p_event_version,
    p_payload, p_correlation_id, p_causation_id,
    COALESCE(p_aggregate_type, split_part(p_event_type, '.', 2)),
    COALESCE(p_aggregate_id, gen_random_uuid()),
    'pending', now()
  )
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$;

-- ── Event 1: bo.lead.created ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_lead_created(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_lead_id        uuid, p_lead_code    text, p_lead_source text,
  p_correlation_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.lead.created', '1.0',
    p_correlation_id, NULL,
    jsonb_build_object('leadId', p_lead_id, 'leadCode', p_lead_code, 'leadSource', p_lead_source),
    'lead', p_lead_id
  );
END; $$;

-- ── Event 2: bo.lead.converted ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_lead_converted(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_lead_id        uuid, p_customer_id  uuid,
  p_correlation_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.lead.converted', '1.0',
    p_correlation_id, NULL,
    jsonb_build_object('leadId', p_lead_id, 'customerId', p_customer_id),
    'lead', p_lead_id
  );
END; $$;

-- ── Event 3: bo.opportunity.stage_changed ────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_opportunity_stage_changed(
  p_tenant_id        uuid, p_workspace_id   uuid,
  p_opportunity_id   uuid, p_previous_stage text, p_new_stage text,
  p_correlation_id   uuid, p_causation_id   uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.opportunity.stage_changed', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'opportunityId', p_opportunity_id,
      'previousStage', p_previous_stage,
      'newStage',      p_new_stage
    ),
    'opportunity', p_opportunity_id
  );
END; $$;

-- ── Event 4: bo.quotation.sent ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_quotation_sent(
  p_tenant_id      uuid, p_workspace_id   uuid,
  p_quotation_id   uuid, p_customer_id    uuid, p_total_amount numeric,
  p_correlation_id uuid, p_causation_id   uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.quotation.sent', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'quotationId',  p_quotation_id,
      'customerId',   p_customer_id,
      'totalAmount',  p_total_amount
    ),
    'quotation', p_quotation_id
  );
END; $$;

-- ── Event 5: bo.order.authorized ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_order_authorized(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_order_id       uuid, p_customer_id  uuid, p_total_amount numeric,
  p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.order.authorized', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'orderId',      p_order_id,
      'customerId',   p_customer_id,
      'totalAmount',  p_total_amount
    ),
    'order', p_order_id
  );
END; $$;

-- ── Event 6: bo.order.completed ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_order_completed(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_order_id       uuid, p_customer_id  uuid,
  p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.order.completed', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object('orderId', p_order_id, 'customerId', p_customer_id),
    'order', p_order_id
  );
END; $$;

-- ── Event 7: bo.invoice.issued ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_invoice_issued(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_invoice_id     uuid, p_customer_id  uuid, p_total_amount  numeric,
  p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.invoice.issued', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'invoiceId',   p_invoice_id,
      'customerId',  p_customer_id,
      'totalAmount', p_total_amount
    ),
    'invoice', p_invoice_id
  );
END; $$;

-- ── Event 8: bo.payment.received ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_payment_received(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_payment_id     uuid, p_customer_id  uuid, p_amount       numeric,
  p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.payment.received', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'paymentId',  p_payment_id,
      'customerId', p_customer_id,
      'amount',     p_amount
    ),
    'payment', p_payment_id
  );
END; $$;

-- ── Event 9: bo.purchase_order.approved ──────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_purchase_order_approved(
  p_tenant_id        uuid, p_workspace_id uuid,
  p_purchase_order_id uuid, p_supplier_id uuid, p_total_amount numeric,
  p_correlation_id   uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.purchase_order.approved', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'purchaseOrderId', p_purchase_order_id,
      'supplierId',      p_supplier_id,
      'totalAmount',     p_total_amount
    ),
    'purchase_order', p_purchase_order_id
  );
END; $$;

-- ── Event 10: bo.inventory.movement_recorded ─────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_inventory_movement_recorded(
  p_tenant_id         uuid, p_workspace_id     uuid,
  p_movement_id       uuid, p_inventory_item_id uuid,
  p_movement_type     text, p_quantity          numeric,
  p_correlation_id    uuid, p_causation_id      uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.inventory.movement_recorded', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'movementId',      p_movement_id,
      'inventoryItemId', p_inventory_item_id,
      'movementType',    p_movement_type,
      'quantity',        p_quantity
    ),
    'inventory_movement', p_movement_id
  );
END; $$;

-- ── Event 11: bo.fulfilment.dispatched ───────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_fulfilment_dispatched(
  p_tenant_id           uuid, p_workspace_id       uuid,
  p_fulfilment_order_id uuid, p_order_id           uuid,
  p_tracking_reference  text,
  p_correlation_id      uuid, p_causation_id       uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.fulfilment.dispatched', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'fulfilmentOrderId', p_fulfilment_order_id,
      'orderId',           p_order_id,
      'trackingReference', p_tracking_reference
    ),
    'fulfilment_order', p_fulfilment_order_id
  );
END; $$;

-- ── Event 12: bo.support_case.opened ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_support_case_opened(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_case_id        uuid, p_customer_id  uuid,
  p_category       text, p_priority     text,
  p_correlation_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.support_case.opened', '1.0',
    p_correlation_id, NULL,
    jsonb_build_object(
      'caseId',     p_case_id,
      'customerId', p_customer_id,
      'category',   p_category,
      'priority',   p_priority
    ),
    'support_case', p_case_id
  );
END; $$;

-- ── Event 13: bo.support_case.resolved ───────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_support_case_resolved(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_case_id        uuid, p_customer_id  uuid,
  p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.support_case.resolved', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object('caseId', p_case_id, 'customerId', p_customer_id),
    'support_case', p_case_id
  );
END; $$;

-- ── Event 14: bo.incident.raised ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_incident_raised(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_incident_id    uuid, p_incident_type text, p_severity text,
  p_correlation_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.incident.raised', '1.0',
    p_correlation_id, NULL,
    jsonb_build_object(
      'incidentId',   p_incident_id,
      'incidentType', p_incident_type,
      'severity',     p_severity
    ),
    'incident', p_incident_id
  );
END; $$;

-- ── Event 15: bo.incident.resolved ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_incident_resolved(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_incident_id    uuid,
  p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.incident.resolved', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object('incidentId', p_incident_id),
    'incident', p_incident_id
  );
END; $$;

-- ── Event 16: bo.data.published ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION business_operations.emit_bo_data_published(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_package_id     uuid, p_target_layer text, p_target_block text,
  p_record_count   integer,
  p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_operations.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bo.data.published', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'packageId',   p_package_id,
      'targetLayer', p_target_layer,
      'targetBlock', p_target_block,
      'recordCount', p_record_count
    ),
    'bo_publication_package', p_package_id
  );
END; $$;

INSERT INTO _migrations (filename) VALUES ('0036_create_bo_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;

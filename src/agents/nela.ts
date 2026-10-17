// Nela — PR Manager agent actions
import { logDecision } from '../lib/db.js';
import { submitApproval } from '../lib/approval.js';

export interface QaCheckResult {
    brandVoiceConsistent: boolean;
    complete:             boolean;
    noSensitiveIssue:     boolean;
    notes?:               string;
}

// ── 1. QA proposal Joce ───────────────────────────────────────────────────────
export async function qaProposal(params: {
    leadId:    string;
    clientName: string;
    draft:     string;
    check:     QaCheckResult;
}): Promise<'pass' | 'revise'> {
    const passed = params.check.brandVoiceConsistent && params.check.complete && params.check.noSensitiveIssue;

    await logDecision({
        agent:      'nela',
        action:     passed ? 'approved' : 'revised',
        entityType: 'lead',
        entityId:   params.leadId,
        summary:    `QA proposal Joce untuk ${params.clientName}: ${passed ? 'PASS' : 'REVISI'}`,
        reason:     params.check.notes ?? `brandVoice=${params.check.brandVoiceConsistent} lengkap=${params.check.complete} noSensitif=${params.check.noSensitiveIssue}`,
        priority:   'routine',
    });

    return passed ? 'pass' : 'revise';
}

// ── 2. QA respons Ale (non hot-lead) ──────────────────────────────────────────
export async function qaAleResponse(params: {
    leadId:   string;
    draft:    string;
    check:    QaCheckResult;
}): Promise<'pass' | 'revise'> {
    const passed = params.check.brandVoiceConsistent && params.check.complete;

    await logDecision({
        agent:      'nela',
        action:     passed ? 'approved' : 'revised',
        entityType: 'lead',
        entityId:   params.leadId,
        summary:    `QA respons Ale: ${passed ? 'PASS' : 'REVISI'}`,
        reason:     params.check.notes,
        priority:   'routine',
    });

    return passed ? 'pass' : 'revise';
}

// ── 3. Submit ke approval Owner setelah QA pass ───────────────────────────────
export async function submitToOwnerAfterQa(params: {
    leadId:    string;
    clientName: string;
    content:   string;  // proposal atau respons
    isProposal: boolean;
}): Promise<string> {
    return submitApproval({
        agent:           'nela',
        title:           params.isProposal
            ? `Kirim Proposal: ${params.clientName}`
            : `Kirim Respons: ${params.clientName}`,
        description:     params.content.slice(0, 500),
        actionRequested: `Approve pengiriman ke ${params.clientName}`,
        priority:        'routine',
        entityType:      'lead',
        entityId:        params.leadId,
    });
}

// ── 4. Eskalasi krisis PR ke Owner ────────────────────────────────────────────
export async function escalatePrCrisis(params: {
    description: string;
    severity:    'medium' | 'high';
    recommendation: string;
}): Promise<string> {
    await logDecision({
        agent:      'nela',
        action:     'escalated',
        entityType: 'other',
        summary:    `KRISIS PR (${params.severity}): ${params.description.slice(0, 100)}`,
        priority:   'crisis',
    });

    return submitApproval({
        agent:           'nela',
        title:           `🚨 KRISIS PR: ${params.description.slice(0, 60)}`,
        description:     `Severity: ${params.severity}\n\n${params.description}\n\nRekomendasi Nela: ${params.recommendation}`,
        actionRequested: 'Approve respons krisis PR',
        priority:        'crisis',
    });
}

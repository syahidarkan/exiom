// Ale — Client Relations agent actions
import { agentInsert, agentUpdate, logDecision } from '../lib/db.js';
import { submitApproval } from '../lib/approval.js';

export interface InboundMessage {
    channel:      'whatsapp' | 'email' | 'instagram_dm' | 'other';
    senderName:   string;
    senderContact: string;  // WA number, email, atau IG handle
    message:      string;
    receivedAt:   Date;
}

export interface LeadClassification {
    type:        'hot' | 'warm' | 'cold';
    reasoning:   string;
    bantBudget?:  string;
    bantAuthority?: string;
    bantNeed?:   string;
    bantTimeline?: string;
}

// ── 1. Proses pesan inbound baru ──────────────────────────────────────────────
export async function processInbound(msg: InboundMessage): Promise<string> {
    const lead = await agentInsert('ale', 'leads', {
        company_name:    msg.senderName,
        contact_name:    msg.senderName,
        contact_wa:      msg.channel === 'whatsapp' ? msg.senderContact : null,
        contact_email:   msg.channel === 'email' ? msg.senderContact : null,
        type:            'inbound',
        priority:        'cold',   // akan diupdate setelah qualify
        status:          'new',
        source_channel:  msg.channel === 'whatsapp' ? 'whatsapp' : 'email',
        notes:           `Pesan pertama: ${msg.message.slice(0, 500)}`,
        last_contacted:  msg.receivedAt.toISOString(),
        agent_owner:     'ale',
        agent_created:   'ale',
    }) as { id: string };

    await logDecision({
        agent:      'ale',
        action:     'noted',
        entityType: 'lead',
        entityId:   lead.id,
        summary:    `Inbound baru via ${msg.channel}: ${msg.senderName}`,
        priority:   'routine',
    });

    return lead.id;
}

// ── 2. Klasifikasi lead ───────────────────────────────────────────────────────
export async function classifyLead(leadId: string, classification: LeadClassification): Promise<void> {
    const priority = classification.type === 'hot' ? 'hot' : classification.type === 'warm' ? 'warm' : 'cold';
    const status   = priority === 'hot' ? 'qualified' : 'contacted';

    await agentUpdate('ale', 'leads', leadId, {
        priority:         priority,
        status:           status,
        budget_estimate:  classification.bantBudget ?? null,
        authority:        classification.bantAuthority ?? null,
        need_summary:     classification.bantNeed ?? null,
        timeline:         classification.bantTimeline ?? null,
        agent_updated:    'ale',
    });

    await logDecision({
        agent:      'ale',
        action:     'noted',
        entityType: 'lead',
        entityId:   leadId,
        summary:    `Lead diklasifikasi: ${classification.type.toUpperCase()} — ${classification.reasoning}`,
        priority:   priority === 'hot' ? 'hot_lead' : 'routine',
    });
}

// ── 3. Hot lead → langsung ke approval Owner (skip QA Nela) ──────────────────
export async function submitHotLeadToOwner(params: {
    leadId:       string;
    clientName:   string;
    need:         string;
    budget:       string;
    timeline:     string;
    draftResponse: string;
}): Promise<string> {
    const approvalId = await submitApproval({
        agent:           'ale',
        title:           `🔥 HOT LEAD: ${params.clientName}`,
        description: [
            `Kebutuhan: ${params.need}`,
            `Budget: ${params.budget}`,
            `Timeline: ${params.timeline}`,
            ``,
            `Draft respons Ale:`,
            params.draftResponse,
        ].join('\n'),
        actionRequested: 'Approve respons ke hot lead (SKIP QA Nela)',
        priority:        'hot_lead',
        entityType:      'lead',
        entityId:        params.leadId,
    });

    await logDecision({
        agent:      'ale',
        action:     'escalated',
        entityType: 'lead',
        entityId:   params.leadId,
        summary:    `HOT LEAD: ${params.clientName} — langsung ke Owner (skip Nela)`,
        priority:   'hot_lead',
    });

    return approvalId;
}

// ── 4. Lead biasa → ke Nela QA dulu ──────────────────────────────────────────
export async function submitToNelaQa(params: {
    leadId:       string;
    clientName:   string;
    draftResponse: string;
}): Promise<void> {
    await logDecision({
        agent:      'ale',
        action:     'escalated',
        entityType: 'lead',
        entityId:   params.leadId,
        summary:    `Respons untuk ${params.clientName} dikirim ke Nela untuk QA`,
        reason:     `Draft: ${params.draftResponse.slice(0, 200)}`,
        priority:   'routine',
    });
    // Di implementasi penuh: kirim via Hermes A2A ke profile nela
}

// ── 5. Update leads setelah respons dikirim ───────────────────────────────────
export async function markContacted(leadId: string): Promise<void> {
    await agentUpdate('ale', 'leads', leadId, {
        status:         'contacted',
        last_contacted: new Date().toISOString(),
        agent_updated:  'ale',
    });
}

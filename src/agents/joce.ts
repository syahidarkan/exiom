// Joce — Client Acquisition agent actions
// Outbound sales proaktif, kirim proposal harian setelah approval Owner
import { agentInsert, agentUpdate, logDecision } from '../lib/db.js';
import { submitApproval } from '../lib/approval.js';

export interface Prospect {
    companyName:  string;
    contactName?: string;
    contactEmail?: string;
    contactWa?:   string;
    website?:     string;
    industry?:    string;
    companySize?: string;
    source:       string;     // dari mana ditemukan
    needSummary:  string;     // kenapa cocok dengan ICP Exiom
    icpMatch:     string[];   // segmen ICP yang match
}

// ── 1. Riset prospek dan simpan ke leads ──────────────────────────────────────
export async function addProspect(prospect: Prospect): Promise<string> {
    const lead = await agentInsert('ale', 'leads', {
        company_name:  prospect.companyName,
        contact_name:  prospect.contactName ?? null,
        contact_email: prospect.contactEmail ?? null,
        contact_wa:    prospect.contactWa ?? null,
        website:       prospect.website ?? null,
        industry:      prospect.industry ?? null,
        company_size:  prospect.companySize ?? null,
        type:          'outbound',
        priority:      'cold',
        status:        'new',
        need_summary:  prospect.needSummary,
        source_detail: prospect.source,
        notes:         `ICP match: ${prospect.icpMatch.join(', ')}`,
        agent_owner:   'ale',
        agent_created: 'joce',   // Joce yang riset, tapi lead owner tetap Ale
    }) as { id: string };

    await logDecision({
        agent:      'joce',
        action:     'noted',
        entityType: 'lead',
        entityId:   lead.id,
        summary:    `Prospek baru: ${prospect.companyName} (${prospect.industry ?? '-'}) via ${prospect.source}`,
        priority:   'routine',
    });

    return lead.id;
}

// ── 2. Buat proposal personalisasi ────────────────────────────────────────────
export interface ProposalContent {
    leadId:       string;
    clientName:   string;
    subject:      string;
    body:         string;     // full proposal text
    serviceType:  string;
    estimateIdr?: number;
    channel:      'email' | 'whatsapp';
}

export async function draftProposal(params: ProposalContent): Promise<void> {
    await agentUpdate('ale', 'leads', params.leadId, {
        status:        'proposal_sent',  // akan diupdate ke ini setelah benar-benar dikirim
        agent_updated: 'joce',
    });

    await logDecision({
        agent:      'joce',
        action:     'noted',
        entityType: 'lead',
        entityId:   params.leadId,
        summary:    `Draft proposal dibuat untuk ${params.clientName}: "${params.subject}" via ${params.channel}`,
        reason:     `Service: ${params.serviceType}${params.estimateIdr ? ` | Estimasi: Rp ${params.estimateIdr.toLocaleString('id-ID')}` : ''}`,
        priority:   'routine',
    });
}

// ── 3. Submit ke Nela untuk QA ────────────────────────────────────────────────
export async function submitProposalToNela(params: {
    leadId:    string;
    clientName: string;
    subject:   string;
    body:      string;
}): Promise<void> {
    await logDecision({
        agent:      'joce',
        action:     'escalated',
        entityType: 'lead',
        entityId:   params.leadId,
        summary:    `Proposal untuk ${params.clientName} dikirim ke Nela untuk QA`,
        priority:   'routine',
    });
    // Di implementasi penuh: kirim via Hermes A2A ke profile nela
}

// ── 4. Submit ke approval Owner setelah lolos QA Nela ────────────────────────
export async function submitProposalForOwnerApproval(params: {
    leadId:    string;
    clientName: string;
    subject:   string;
    body:      string;
    channel:   'email' | 'whatsapp';
    recipientContact: string;
}): Promise<string> {
    const approvalId = await submitApproval({
        agent:           'joce',
        title:           `Kirim Proposal: ${params.clientName}`,
        description: [
            `Channel: ${params.channel}`,
            `Ke: ${params.recipientContact}`,
            `Subject: ${params.subject}`,
            ``,
            params.body.slice(0, 400),
            params.body.length > 400 ? '...' : '',
        ].join('\n'),
        actionRequested: `Approve pengiriman proposal ke ${params.clientName} via ${params.channel}`,
        priority:        'proposal',
        entityType:      'lead',
        entityId:        params.leadId,
    });

    return approvalId;
}

// ── 5. Kirim proposal setelah Owner approve ───────────────────────────────────
export async function sendProposalAfterApproval(params: {
    leadId:          string;
    channel:         'email' | 'whatsapp';
    recipientContact: string;
    subject:         string;
    body:            string;
}): Promise<{ success: boolean; error?: string }> {
    if (params.channel === 'email') {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            return { success: false, error: 'RESEND_API_KEY belum diset' };
        }

        try {
            const res = await fetch('https://api.resend.com/emails', {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type':  'application/json',
                },
                body: JSON.stringify({
                    from:    'Joce dari Exiom <joce@exiom.id>',
                    to:      [params.recipientContact],
                    subject: params.subject,
                    text:    params.body,
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                await logDecision({ agent: 'joce', action: 'noted', entityType: 'lead', entityId: params.leadId, summary: `Email GAGAL: ${err}`, priority: 'routine' });
                return { success: false, error: err };
            }
        } catch (e) {
            return { success: false, error: String(e) };
        }
    } else {
        // WhatsApp via WAHA
        const waUrl = process.env.EXIOM_WA_API_URL;
        if (!waUrl) {
            return { success: false, error: 'EXIOM_WA_API_URL belum diset' };
        }

        try {
            const res = await fetch(`${waUrl}/api/sendText`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId:  params.recipientContact,
                    text:    `*${params.subject}*\n\n${params.body}`,
                    session: process.env.EXIOM_WA_SESSION ?? 'default',
                }),
            });
            if (!res.ok) return { success: false, error: await res.text() };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    await agentUpdate('ale', 'leads', params.leadId, {
        status:         'proposal_sent',
        last_contacted: new Date().toISOString(),
        agent_updated:  'joce',
    });

    await logDecision({
        agent:      'joce',
        action:     'approved',
        entityType: 'lead',
        entityId:   params.leadId,
        summary:    `Proposal terkirim via ${params.channel} ke ${params.recipientContact}`,
        priority:   'routine',
    });

    return { success: true };
}

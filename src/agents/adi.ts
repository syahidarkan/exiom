// Adi — Developer agent actions
import { logDecision } from '../lib/db.js';
import { submitApproval } from '../lib/approval.js';

export interface TaskSubmission {
    projectId:    string;
    taskTitle:    string;
    changedFiles: string[];
    testResults:  string;
    prUrl?:       string;
    notes?:       string;
    stuckCount?:  number; // jumlah kali stuck berturut-turut
}

// ── 1. Submit task ke Kenzie untuk QA ────────────────────────────────────────
export async function submitTaskForQa(params: TaskSubmission): Promise<void> {
    await logDecision({
        agent:      'adi',
        action:     'noted',
        entityType: 'project',
        entityId:   params.projectId,
        summary:    `Task selesai, submit QA ke Kenzie: ${params.taskTitle}`,
        reason:     [
            `Files: ${params.changedFiles.join(', ')}`,
            `Test: ${params.testResults}`,
            params.prUrl ? `PR: ${params.prUrl}` : '',
            params.notes ?? '',
        ].filter(Boolean).join(' | '),
        priority: 'routine',
    });
}

// ── 2. Eskalasi ke Opus kalau stuck 2x (perlu approval Owner dulu) ────────────
export async function requestOpusEscalation(params: {
    projectId: string;
    taskTitle: string;
    stuckCount: number;
    problemDescription: string;
}): Promise<string> {
    if (params.stuckCount < 2) {
        throw new Error(`Opus escalation hanya boleh diminta setelah stuck 2x. Saat ini: ${params.stuckCount}x`);
    }

    const approvalId = await submitApproval({
        agent:           'adi',
        title:           `Request escalation ke Opus: ${params.taskTitle}`,
        description:     `Stuck ${params.stuckCount}x berturut-turut.\n\nMasalah:\n${params.problemDescription}`,
        actionRequested: 'Approve penggunaan model Claude Opus untuk task ini (biaya lebih tinggi)',
        priority:        'routine',
        entityType:      'project',
        entityId:        params.projectId,
    });

    await logDecision({
        agent:      'adi',
        action:     'escalated',
        entityType: 'project',
        entityId:   params.projectId,
        summary:    `Stuck ${params.stuckCount}x — request Opus escalation disubmit ke Owner (approval_id: ${approvalId})`,
        priority:   'routine',
    });

    return approvalId;
}

// ── 3. Requirement tidak jelas → lapor ke Kenzie ─────────────────────────────
export async function reportUnclearRequirement(params: {
    projectId: string;
    taskTitle: string;
    question:  string;
}): Promise<void> {
    await logDecision({
        agent:      'adi',
        action:     'escalated',
        entityType: 'project',
        entityId:   params.projectId,
        summary:    `Requirement tidak jelas pada task "${params.taskTitle}" — dilaporkan ke Kenzie`,
        reason:     params.question,
        priority:   'routine',
    });
    // Kenzie akan menerima ini via decisions_log dan merespons
}

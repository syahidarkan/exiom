// Kenzie — IT Manager agent actions
// Semua action dicatat ke decisions_log
import { agentInsert, agentUpdate, logDecision, pool } from '../lib/db.js';
import { submitApproval } from '../lib/approval.js';

export interface ProjectBrief {
    name:        string;
    clientName?: string;
    leadId?:     string;
    serviceType: string;
    requirements: string;
    deadline?:   string;
}

export interface Task {
    projectId: string;
    title:     string;
    detail:    string;
    milestone?: string;
}

// ── 1. Terima brief, buat project, breakdown ke tasks ────────────────────────
export async function createProjectFromBrief(brief: ProjectBrief): Promise<string> {
    const project = await agentInsert('kenzie', 'projects', {
        name:          brief.name,
        client_name:   brief.clientName ?? null,
        lead_id:       brief.leadId ?? null,
        service_type:  brief.serviceType,
        requirements:  brief.requirements,
        status:        'scoping',
        deadline:      brief.deadline ?? null,
        agent_owner:   'kenzie',
        agent_created: 'kenzie',
    }) as { id: string };

    await logDecision({
        agent:      'kenzie',
        action:     'noted',
        entityType: 'project',
        entityId:   project.id,
        summary:    `Project baru dibuat: ${brief.name}. Status: scoping.`,
        priority:   'routine',
    });

    return project.id;
}

// ── 2. Assign task ke Adi lewat Kanban ───────────────────────────────────────
// Catatan: Hermes Kanban task dibuat via CLI `hermes task create -p kenzie`
// Fungsi ini menyimpan task reference ke decisions_log
export async function assignTaskToAdi(task: Task): Promise<void> {
    await logDecision({
        agent:      'kenzie',
        action:     'noted',
        entityType: 'project',
        entityId:   task.projectId,
        summary:    `Task assigned ke Adi: ${task.title}`,
        reason:     task.detail,
        priority:   'routine',
    });
}

// ── 3. QA struktural hasil Adi ────────────────────────────────────────────────
export interface QaResult {
    projectId:  string;
    taskTitle:  string;
    lintPassed: boolean;
    testPassed: boolean;
    meetsRequirements: boolean;
    notes?:     string;
}

export async function performQa(qa: QaResult): Promise<'pass' | 'revise'> {
    const passed = qa.lintPassed && qa.testPassed && qa.meetsRequirements;
    const action = passed ? 'approved' : 'revised';

    await logDecision({
        agent:      'kenzie',
        action,
        entityType: 'project',
        entityId:   qa.projectId,
        summary:    `QA ${passed ? 'PASS' : 'FAIL'}: ${qa.taskTitle}`,
        reason:     qa.notes ?? (passed
            ? 'Lint pass, test pass, sesuai requirement'
            : `Perlu revisi — lint:${qa.lintPassed} test:${qa.testPassed} req:${qa.meetsRequirements}`),
        priority:   'routine',
    });

    return passed ? 'pass' : 'revise';
}

// ── 4. Submit milestone ke approval queue Owner ───────────────────────────────
export async function submitMilestoneApproval(params: {
    projectId: string;
    projectName: string;
    milestone: string;
    description: string;
    evidenceUrls?: string[];
}): Promise<string> {
    const approvalId = await submitApproval({
        agent:           'kenzie',
        title:           `Deploy milestone: ${params.projectName} — ${params.milestone}`,
        description:     params.description,
        actionRequested: 'Approve deploy ke production / milestone besar',
        priority:        'routine',
        entityType:      'project',
        entityId:        params.projectId,
        attachmentUrls:  params.evidenceUrls,
    });

    await agentUpdate('kenzie', 'projects', params.projectId, {
        status:            'awaiting_approval',
        milestone_current: params.milestone,
        agent_updated:     'kenzie',
    });

    await logDecision({
        agent:      'kenzie',
        action:     'escalated',
        entityType: 'project',
        entityId:   params.projectId,
        summary:    `Milestone "${params.milestone}" disubmit ke approval Owner (approval_id: ${approvalId})`,
        priority:   'routine',
    });

    return approvalId;
}

// ── 5. Update status project setelah Owner approve ────────────────────────────
export async function markProjectDeployed(projectId: string): Promise<void> {
    await agentUpdate('kenzie', 'projects', projectId, {
        status:        'deployed',
        delivered_at:  new Date().toISOString(),
        agent_updated: 'kenzie',
    });

    await logDecision({
        agent:      'kenzie',
        action:     'approved',
        entityType: 'project',
        entityId:   projectId,
        summary:    'Project ditandai deployed setelah approval Owner',
    });
}

// ── 6. Eskalasi teknis blocking ke Owner ─────────────────────────────────────
export async function escalateTechnicalBlocker(params: {
    projectId?: string;
    what:       string;
    why:        string;
    nextStep:   string;
}): Promise<string> {
    const title = `BUTUH DARI OWNER: ${params.what}`;
    const approvalId = await submitApproval({
        agent:           'kenzie',
        title,
        description:     `Alasan: ${params.why}\n\nBuat lanjut ke: ${params.nextStep}`,
        actionRequested: params.what,
        priority:        'routine',
        entityType:      params.projectId ? 'project' : 'other',
        entityId:        params.projectId,
    });

    return approvalId;
}

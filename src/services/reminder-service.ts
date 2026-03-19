import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-logger";
import { REMINDER_STATUS, PAYMENT_STATUS } from "@/lib/constants";

interface CadenceRule {
  daysBefore?: number;
  daysAfter?: number;
  reminderType: string;
  channel: string;
  templateId?: string;
  escalationLevel?: number;
}

interface ReminderContext {
  clientName: string;
  contactName: string;
  registrationNo: string;
  dueDate: string;
  financialYearEnd: string;
  amount: string;
  staffName: string;
  invoiceRef: string;
}

/**
 * Generate reminder schedule for a case based on matching ReminderPolicy
 */
export async function generateReminderSchedule(caseId: string): Promise<string[]> {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      client: true,
      owner: true,
    },
  });

  if (!caseData) {
    throw new Error("Case not found");
  }

  // Find matching reminder policy
  const policy = await prisma.reminderPolicy.findFirst({
    where: {
      caseType: caseData.caseType,
      department: caseData.department,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!policy) {
    throw new Error(`No active reminder policy found for case type ${caseData.caseType} in ${caseData.department} department`);
  }

  // Parse cadence rules
  let cadenceRules: CadenceRule[];
  try {
    cadenceRules = JSON.parse(policy.cadence) as CadenceRule[];
  } catch (error) {
    throw new Error("Invalid cadence format in reminder policy");
  }

  // Determine reference date (dueDate or anniversaryDate)
  const referenceDate = caseData.dueDate || caseData.anniversaryDate;
  if (!referenceDate) {
    throw new Error("Case must have either dueDate or anniversaryDate for reminder scheduling");
  }

  const reminderIds: string[] = [];

  // Generate reminder events based on cadence rules
  for (const rule of cadenceRules) {
    const scheduledAt = new Date(referenceDate);

    if (rule.daysBefore !== undefined) {
      scheduledAt.setDate(scheduledAt.getDate() - rule.daysBefore);
    } else if (rule.daysAfter !== undefined) {
      scheduledAt.setDate(scheduledAt.getDate() + rule.daysAfter);
    }

    // Get primary contact for recipient info
    const primaryContact = await prisma.clientContact.findFirst({
      where: {
        clientId: caseData.clientId,
        isPrimary: true,
      },
    });

    // Build context and render template if templateId provided
    let subject: string | null = null;
    let body: string | null = null;
    let templateId: string | null = rule.templateId || null;

    if (rule.templateId) {
      const template = await prisma.reminderTemplate.findUnique({
        where: { id: rule.templateId },
      });

      if (template) {
        const context = await buildReminderContext(caseId);
        subject = template.subject ? renderTemplate(template.subject, context) : null;
        body = renderTemplate(template.body, context);
      }
    }

    // Create reminder event
    const reminder = await prisma.reminderEvent.create({
      data: {
        caseId,
        templateId,
        channel: rule.channel,
        recipientEmail: primaryContact?.email || null,
        recipientPhone: primaryContact?.whatsapp || primaryContact?.phone || null,
        recipientName: primaryContact?.name || caseData.client.name,
        subject,
        body,
        reminderType: rule.reminderType,
        escalationLevel: rule.escalationLevel || 1,
        status: REMINDER_STATUS.SCHEDULED,
        scheduledAt,
      },
    });

    reminderIds.push(reminder.id);

    await logAuditEvent({
      caseId,
      action: "REMINDER_SCHEDULED",
      entityType: "ReminderEvent",
      entityId: reminder.id,
      details: {
        reminderType: rule.reminderType,
        scheduledAt: scheduledAt.toISOString(),
        channel: rule.channel,
      },
    });
  }

  return reminderIds;
}

/**
 * Render a template string by replacing {{placeholders}} with context values
 */
export function renderTemplate(template: string, context: ReminderContext | Record<string, string>): string {
  let rendered = template;

  for (const [key, value] of Object.entries(context)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
  }

  return rendered;
}

/**
 * Build template context from case data
 */
export async function buildReminderContext(caseId: string): Promise<ReminderContext> {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      client: true,
      owner: true,
    },
  });

  if (!caseData) {
    throw new Error("Case not found");
  }

  // Get primary contact
  const primaryContact = await prisma.clientContact.findFirst({
    where: {
      clientId: caseData.clientId,
      isPrimary: true,
    },
  });

  // Format dates
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return {
    clientName: caseData.client.name,
    contactName: primaryContact?.name || caseData.client.name,
    registrationNo: caseData.client.registrationNo || "N/A",
    dueDate: formatDate(caseData.dueDate),
    financialYearEnd: formatDate(caseData.financialYearEnd),
    amount: caseData.outstandingAmount ? `RM ${caseData.outstandingAmount.toFixed(2)}` : "N/A",
    staffName: caseData.owner.name,
    invoiceRef: caseData.caseNumber,
  };
}

/**
 * Check if case meets any stop conditions and stop future reminders if so
 */
export async function checkStopConditions(caseId: string): Promise<{
  shouldStop: boolean;
  reason?: string;
  stoppedCount?: number;
}> {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseData) {
    throw new Error("Case not found");
  }

  // Check if case is archived
  if (caseData.archivedAt) {
    const stoppedReminders = await prisma.reminderEvent.updateMany({
      where: {
        caseId,
        status: REMINDER_STATUS.SCHEDULED,
      },
      data: {
        status: REMINDER_STATUS.STOPPED,
        stoppedAt: new Date(),
        stopReason: "Case archived",
      },
    });

    return {
      shouldStop: true,
      reason: "Case archived",
      stoppedCount: stoppedReminders.count,
    };
  }

  // Check document-complete stop condition
  const documentsComplete = caseData.signedCopyReceived &&
                           caseData.originalSignedReceived &&
                           caseData.paymentStatus === PAYMENT_STATUS.PAID;

  if (documentsComplete) {
    const stoppedReminders = await prisma.reminderEvent.updateMany({
      where: {
        caseId,
        status: REMINDER_STATUS.SCHEDULED,
      },
      data: {
        status: REMINDER_STATUS.STOPPED,
        stoppedAt: new Date(),
        stopReason: "All documents received and payment confirmed",
      },
    });

    await logAuditEvent({
      caseId,
      action: "REMINDERS_AUTO_STOPPED",
      entityType: "Case",
      entityId: caseId,
      details: {
        reason: "Documents complete and payment confirmed",
        stoppedCount: stoppedReminders.count,
      },
    });

    return {
      shouldStop: true,
      reason: "All documents received and payment confirmed",
      stoppedCount: stoppedReminders.count,
    };
  }

  return {
    shouldStop: false,
  };
}

/**
 * Approve a reminder (change status from DRAFTED to APPROVED)
 */
export async function approveReminder(reminderId: string, userId: string): Promise<void> {
  const reminder = await prisma.reminderEvent.findUnique({
    where: { id: reminderId },
  });

  if (!reminder) {
    throw new Error("Reminder not found");
  }

  if (reminder.status !== REMINDER_STATUS.DRAFTED && reminder.status !== REMINDER_STATUS.SCHEDULED) {
    throw new Error(`Cannot approve reminder with status ${reminder.status}`);
  }

  await prisma.reminderEvent.update({
    where: { id: reminderId },
    data: {
      status: REMINDER_STATUS.APPROVED,
    },
  });

  await logAuditEvent({
    userId,
    caseId: reminder.caseId,
    action: "REMINDER_APPROVED",
    entityType: "ReminderEvent",
    entityId: reminderId,
    details: {
      reminderType: reminder.reminderType,
      scheduledAt: reminder.scheduledAt.toISOString(),
    },
  });
}

/**
 * Mark reminder as sent with timestamp
 */
export async function markReminderSent(reminderId: string, userId: string): Promise<void> {
  const reminder = await prisma.reminderEvent.findUnique({
    where: { id: reminderId },
  });

  if (!reminder) {
    throw new Error("Reminder not found");
  }

  if (reminder.status === REMINDER_STATUS.SENT || reminder.status === REMINDER_STATUS.DELIVERED) {
    throw new Error("Reminder already sent");
  }

  if (reminder.status === REMINDER_STATUS.STOPPED) {
    throw new Error("Cannot send a stopped reminder");
  }

  await prisma.reminderEvent.update({
    where: { id: reminderId },
    data: {
      status: REMINDER_STATUS.SENT,
      sentAt: new Date(),
      sentById: userId,
    },
  });

  await logAuditEvent({
    userId,
    caseId: reminder.caseId,
    action: "REMINDER_SENT",
    entityType: "ReminderEvent",
    entityId: reminderId,
    details: {
      reminderType: reminder.reminderType,
      channel: reminder.channel,
      recipient: reminder.recipientEmail || reminder.recipientPhone,
    },
  });
}

/**
 * Stop a reminder with reason
 */
export async function stopReminder(reminderId: string, userId: string, reason: string): Promise<void> {
  const reminder = await prisma.reminderEvent.findUnique({
    where: { id: reminderId },
  });

  if (!reminder) {
    throw new Error("Reminder not found");
  }

  if (reminder.status === REMINDER_STATUS.SENT || reminder.status === REMINDER_STATUS.DELIVERED) {
    throw new Error("Cannot stop a reminder that has already been sent");
  }

  if (reminder.status === REMINDER_STATUS.STOPPED) {
    throw new Error("Reminder is already stopped");
  }

  await prisma.reminderEvent.update({
    where: { id: reminderId },
    data: {
      status: REMINDER_STATUS.STOPPED,
      stoppedAt: new Date(),
      stopReason: reason,
    },
  });

  await logAuditEvent({
    userId,
    caseId: reminder.caseId,
    action: "REMINDER_STOPPED",
    entityType: "ReminderEvent",
    entityId: reminderId,
    details: {
      reminderType: reminder.reminderType,
      stopReason: reason,
    },
  });
}

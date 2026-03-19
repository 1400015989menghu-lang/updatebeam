// @ts-nocheck
const { PrismaClient } = require("../src/generated/prisma/internal/class.js");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcryptjs.hash("admin123", 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@openclaw.com" },
    update: {},
    create: {
      email: "admin@openclaw.com",
      name: "System Admin",
      password: passwordHash,
      role: "ADMIN",
      department: "MANAGEMENT",
    },
  });

  // Create department staff
  const secStaff = await prisma.user.upsert({
    where: { email: "sarah@openclaw.com" },
    update: {},
    create: {
      email: "sarah@openclaw.com",
      name: "Sarah Tan",
      password: passwordHash,
      role: "SECRETARIAL_STAFF",
      department: "SECRETARIAL",
    },
  });

  const accStaff = await prisma.user.upsert({
    where: { email: "alex@openclaw.com" },
    update: {},
    create: {
      email: "alex@openclaw.com",
      name: "Alex Wong",
      password: passwordHash,
      role: "ACCOUNTING_STAFF",
      department: "ACCOUNTING",
    },
  });

  const taxStaff = await prisma.user.upsert({
    where: { email: "tom@openclaw.com" },
    update: {},
    create: {
      email: "tom@openclaw.com",
      name: "Tom Lee",
      password: passwordHash,
      role: "TAX_STAFF",
      department: "TAX",
    },
  });

  const auditStaff = await prisma.user.upsert({
    where: { email: "lisa@openclaw.com" },
    update: {},
    create: {
      email: "lisa@openclaw.com",
      name: "Lisa Chen",
      password: passwordHash,
      role: "AUDIT_STAFF",
      department: "AUDIT",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "melissa@openclaw.com" },
    update: {},
    create: {
      email: "melissa@openclaw.com",
      name: "Melissa Yee",
      password: passwordHash,
      role: "MANAGER",
      department: "MANAGEMENT",
    },
  });

  // Create sample clients
  const client1 = await prisma.client.create({
    data: {
      name: "Acme Trading Sdn Bhd",
      businessType: "Private Limited",
      registrationNo: "202301012345",
      incorporationDate: new Date("2023-01-15"),
      anniversaryDate: new Date("2026-01-15"),
      financialYearEnd: new Date("2025-12-31"),
      contacts: {
        create: {
          name: "John Doe",
          email: "john@acmetrading.com",
          phone: "+60123456789",
          whatsapp: "+60123456789",
          role: "Director",
          isPrimary: true,
        },
      },
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "Bright Solutions Sdn Bhd",
      businessType: "Private Limited",
      registrationNo: "202201098765",
      incorporationDate: new Date("2022-06-01"),
      anniversaryDate: new Date("2026-06-01"),
      financialYearEnd: new Date("2025-06-30"),
      contacts: {
        create: {
          name: "Jane Smith",
          email: "jane@brightsolutions.com",
          phone: "+60198765432",
          whatsapp: "+60198765432",
          role: "Director",
          isPrimary: true,
        },
      },
    },
  });

  const client3 = await prisma.client.create({
    data: {
      name: "Golden Star Enterprise",
      businessType: "Sole Proprietor",
      registrationNo: "SA0012345-A",
      financialYearEnd: new Date("2025-12-31"),
      contacts: {
        create: {
          name: "Ahmad bin Hassan",
          email: "ahmad@goldenstar.com",
          phone: "+60112345678",
          role: "Owner",
          isPrimary: true,
        },
      },
    },
  });

  // Create engagements
  const eng1 = await prisma.engagement.create({
    data: {
      clientId: client1.id,
      type: "SECRETARIAL",
      fiscalYear: "2025",
      status: "ACTIVE",
    },
  });

  const eng2 = await prisma.engagement.create({
    data: {
      clientId: client1.id,
      type: "ACCOUNTING",
      fiscalYear: "2025",
      status: "ACTIVE",
    },
  });

  const eng3 = await prisma.engagement.create({
    data: {
      clientId: client2.id,
      type: "TAX",
      fiscalYear: "2025",
      status: "ACTIVE",
    },
  });

  // Create sample cases
  await prisma.case.create({
    data: {
      caseNumber: "SEC-AR-2026-001",
      clientId: client1.id,
      engagementId: eng1.id,
      ownerId: secStaff.id,
      title: "Acme Trading - Annual Return 2026",
      description: "Annual return submission for Acme Trading Sdn Bhd",
      department: "SECRETARIAL",
      caseType: "AR",
      status: "AWAITING_CLIENT",
      priority: "HIGH",
      dueDate: new Date("2026-01-15"),
      anniversaryDate: new Date("2026-01-15"),
      paymentStatus: "PENDING",
      outstandingAmount: 1500,
      signedCopyReceived: false,
      originalSignedReceived: false,
    },
  });

  await prisma.case.create({
    data: {
      caseNumber: "SEC-FS-2025-001",
      clientId: client2.id,
      ownerId: secStaff.id,
      title: "Bright Solutions - Financial Statements 2025",
      department: "SECRETARIAL",
      caseType: "FS",
      status: "ACTIVE",
      priority: "NORMAL",
      dueDate: new Date("2026-06-30"),
      financialYearEnd: new Date("2025-06-30"),
      paymentStatus: "NOT_APPLICABLE",
    },
  });

  await prisma.case.create({
    data: {
      caseNumber: "ACC-ENT-2025-001",
      clientId: client1.id,
      engagementId: eng2.id,
      ownerId: accStaff.id,
      title: "Acme Trading - Accounting FY2025",
      department: "ACCOUNTING",
      caseType: "ACCOUNTING",
      status: "ACTIVE",
      priority: "NORMAL",
      financialYearEnd: new Date("2025-12-31"),
      paymentStatus: "PENDING",
      outstandingAmount: 3000,
    },
  });

  await prisma.case.create({
    data: {
      caseNumber: "TAX-FIL-2025-001",
      clientId: client2.id,
      engagementId: eng3.id,
      ownerId: taxStaff.id,
      title: "Bright Solutions - Tax Filing 2025",
      department: "TAX",
      caseType: "TAX_FILING",
      status: "AWAITING_CLIENT",
      priority: "HIGH",
      dueDate: new Date("2026-07-31"),
      paymentStatus: "OVERDUE",
      outstandingAmount: 2500,
    },
  });

  await prisma.case.create({
    data: {
      caseNumber: "DEB-REC-2025-001",
      clientId: client3.id,
      ownerId: accStaff.id,
      title: "Golden Star - Outstanding Payment Recovery",
      department: "ACCOUNTING",
      caseType: "DEBT_RECOVERY",
      status: "ACTIVE",
      priority: "URGENT",
      paymentStatus: "OVERDUE",
      outstandingAmount: 8500,
    },
  });

  // Create reminder templates
  await prisma.reminderTemplate.create({
    data: {
      name: "AR 1st Reminder",
      department: "SECRETARIAL",
      channel: "EMAIL",
      subject: "Annual Return Reminder - {{clientName}}",
      body: "Dear {{contactName}},\n\nThis is a friendly reminder that the annual return for {{clientName}} (Reg. No: {{registrationNo}}) is due on {{dueDate}}.\n\nPlease ensure the following are submitted:\n- Signed Annual Return form\n- Outstanding payment of RM{{amount}}\n\nKindly arrange the above at your earliest convenience.\n\nBest regards,\n{{staffName}}",
      reminderType: "AR_1ST",
    },
  });

  await prisma.reminderTemplate.create({
    data: {
      name: "AR 2nd Reminder",
      department: "SECRETARIAL",
      channel: "EMAIL",
      subject: "URGENT: Annual Return Overdue - {{clientName}}",
      body: "Dear {{contactName}},\n\nWe note that the annual return for {{clientName}} (Reg. No: {{registrationNo}}) was due on {{dueDate}} and we have not received the required documents and/or payment.\n\nPlease take immediate action to avoid late filing penalties.\n\nItems outstanding:\n- Signed Annual Return form\n- Payment of RM{{amount}}\n\nBest regards,\n{{staffName}}",
      reminderType: "AR_2ND",
    },
  });

  await prisma.reminderTemplate.create({
    data: {
      name: "Payment Reminder",
      department: "ACCOUNTING",
      channel: "EMAIL",
      subject: "Payment Reminder - {{clientName}}",
      body: "Dear {{contactName}},\n\nWe wish to bring to your attention the outstanding balance of RM{{amount}} for services rendered.\n\nInvoice Reference: {{invoiceRef}}\n\nKindly arrange payment at your earliest convenience.\n\nBest regards,\n{{staffName}}",
      reminderType: "PAYMENT",
    },
  });

  await prisma.reminderTemplate.create({
    data: {
      name: "FS 1st Reminder",
      department: "SECRETARIAL",
      channel: "EMAIL",
      subject: "Financial Statements Reminder - {{clientName}}",
      body: "Dear {{contactName}},\n\nThe financial year end for {{clientName}} is {{financialYearEnd}}. Please arrange for the audited financial statements to be submitted.\n\nRequired documents:\n- Audited report (signed hardcopy)\n- MBRS zip file\n- Payment for filing fees\n\nBest regards,\n{{staffName}}",
      reminderType: "FS_1ST",
    },
  });

  // Create reminder policies
  await prisma.reminderPolicy.create({
    data: {
      name: "Standard AR Reminder Policy",
      department: "SECRETARIAL",
      caseType: "AR",
      cadence: JSON.stringify([
        { daysBefore: 30, reminderType: "AR_1ST", channel: "EMAIL" },
        { daysBefore: 0, reminderType: "AR_2ND", channel: "EMAIL" },
        { daysAfter: 30, reminderType: "AR_3RD", channel: "EMAIL" },
      ]),
      stopConditions: JSON.stringify([
        "DOCUMENTS_COMPLETE",
        "PAYMENT_CONFIRMED",
        "ORIGINAL_RECEIVED",
        "CASE_ARCHIVED",
      ]),
    },
  });

  await prisma.reminderPolicy.create({
    data: {
      name: "Standard FS Reminder Policy",
      department: "SECRETARIAL",
      caseType: "FS",
      cadence: JSON.stringify([
        { monthsBefore: 1, reminderType: "FS_1ST", channel: "EMAIL" },
        { daysAfter: 0, reminderType: "FS_2ND", channel: "EMAIL" },
        { daysAfter: 30, reminderType: "FS_3RD", channel: "EMAIL" },
      ]),
      stopConditions: JSON.stringify([
        "DOCUMENTS_COMPLETE",
        "PAYMENT_CONFIRMED",
        "ORIGINAL_RECEIVED",
        "CASE_ARCHIVED",
      ]),
    },
  });

  await prisma.reminderPolicy.create({
    data: {
      name: "Debt Recovery Reminder Policy",
      department: "ACCOUNTING",
      caseType: "DEBT_RECOVERY",
      cadence: JSON.stringify([
        { daysAfter: 7, reminderType: "DEBT_CURRENT", channel: "EMAIL" },
        { daysAfter: 30, reminderType: "DEBT_CURRENT", channel: "EMAIL" },
        { daysAfter: 60, reminderType: "DEBT_PRIOR", channel: "EMAIL" },
      ]),
      stopConditions: JSON.stringify(["PAYMENT_CONFIRMED", "MANAGER_OVERRIDE"]),
    },
  });

  console.log("Seed completed successfully.");
  console.log("Admin login: admin@openclaw.com / admin123");
  console.log("All staff accounts use the same password: admin123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

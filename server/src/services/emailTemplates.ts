export type MailEntryRow = {
  title: string;
  kind: string;
  category?: string | null;
  dueAt?: Date | string | null;
  remindAt?: Date | string | null;
  priority?: string | null;
};

export type DigestTemplateInput = {
  generatedAt: Date;
  leadDays: number;
  overdue: MailEntryRow[];
  dueSoon: MailEntryRow[];
  reminders: MailEntryRow[];
  panelUrl: string;
};

const KIND_TR: Record<string, string> = {
  TASK: "Görev",
  EVENT: "Olay",
  DEADLINE: "Son tarih",
  NOTE: "Not",
  REMINDER: "Hatırlatma",
  IDEA: "Fikir",
  OTHER: "Diğer",
};

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rowHtml(e: MailEntryRow): string {
  const kind = KIND_TR[e.kind] ?? e.kind;
  const when = e.dueAt ?? e.remindAt;
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #e8eee9;font-weight:600;color:#143528;">${escapeHtml(e.title)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e8eee9;color:#5c7a6b;">${escapeHtml(kind)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e8eee9;color:#5c7a6b;">${escapeHtml(e.category ?? "Genel")}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e8eee9;color:#1a4731;font-weight:600;">${escapeHtml(fmt(when))}</td>
  </tr>`;
}

function sectionHtml(title: string, rows: MailEntryRow[], empty: string): string {
  if (rows.length === 0) {
    return `<p style="margin:0 0 18px;color:#8aa399;font-size:14px;">${escapeHtml(empty)}</p>`;
  }
  return `
    <h2 style="margin:0 0 10px;font-size:16px;color:#1a4731;">${escapeHtml(title)} · ${rows.length}</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 22px;background:#fff;border:1px solid #dfe8e2;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#f3f7f4;">
          <th align="left" style="padding:10px 12px;font-size:12px;color:#5c7a6b;text-transform:uppercase;letter-spacing:.04em;">Başlık</th>
          <th align="left" style="padding:10px 12px;font-size:12px;color:#5c7a6b;text-transform:uppercase;letter-spacing:.04em;">Tür</th>
          <th align="left" style="padding:10px 12px;font-size:12px;color:#5c7a6b;text-transform:uppercase;letter-spacing:.04em;">Kategori</th>
          <th align="left" style="padding:10px 12px;font-size:12px;color:#5c7a6b;text-transform:uppercase;letter-spacing:.04em;">Tarih</th>
        </tr>
      </thead>
      <tbody>${rows.map(rowHtml).join("")}</tbody>
    </table>`;
}

function sectionText(title: string, rows: MailEntryRow[]): string {
  if (rows.length === 0) return `${title}\n  (yok)\n`;
  const lines = rows.map((e) => {
    const kind = KIND_TR[e.kind] ?? e.kind;
    return `  • ${e.title} [${kind}/${e.category ?? "Genel"}] — ${fmt(e.dueAt ?? e.remindAt)}`;
  });
  return `${title} (${rows.length})\n${lines.join("\n")}\n`;
}

/** Günlük özet / yaklaşan deadline şablonu */
export function buildDigestEmail(input: DigestTemplateInput): { subject: string; text: string; html: string } {
  const day = input.generatedAt.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const total = input.overdue.length + input.dueSoon.length + input.reminders.length;
  const subject =
    total === 0
      ? `EK Life · ${day} — sakin bir gün`
      : `EK Life · ${day} — ${total} hatırlatma`;

  const text = [
    `EK LifeTracker — Günlük özet`,
    day,
    ``,
    sectionText("Gecikenler", input.overdue),
    ``,
    sectionText(`Önümüzdeki ${input.leadDays} gün`, input.dueSoon),
    ``,
    sectionText("Hatırlatmalar", input.reminders),
    ``,
    `Panel: ${input.panelUrl}`,
    ``,
    `Bu mail otomatik üretildi. Ayarlar → E-posta bildirimleri.`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#eef3f0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#24332c;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f0;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:640px;background:#fbfdfb;border:1px solid #d5e0da;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 18px;background:linear-gradient(135deg,#1a4731,#2f6b4f);color:#fff;">
              <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">EK LifeTracker</div>
              <div style="font-size:26px;font-weight:700;margin-top:6px;">Günlük özet</div>
              <div style="margin-top:8px;opacity:.9;font-size:14px;">${escapeHtml(day)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#3d5348;">
                Açık kayıtlarından gecikenler, önümüzdeki <strong>${input.leadDays} gün</strong> içindeki
                son tarihler ve hatırlatmalar aşağıda.
              </p>
              ${sectionHtml("Gecikenler", input.overdue, "Geciken kayıt yok.")}
              ${sectionHtml(`Önümüzdeki ${input.leadDays} gün`, input.dueSoon, "Yaklaşan son tarih yok.")}
              ${sectionHtml("Hatırlatmalar", input.reminders, "Zamanı gelen hatırlatma yok.")}
              <a href="${escapeHtml(input.panelUrl)}" style="display:inline-block;margin:6px 0 18px;padding:12px 18px;background:#1a4731;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
                Panele git
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;font-size:12px;color:#8aa399;line-height:1.5;">
              Otomatik e-posta · Ayarlar → E-posta bildirimleri<br />
              Şablon: günlük özet (deadline + hatırlatma)
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export function buildTestEmail(panelUrl: string): { subject: string; text: string; html: string } {
  const digest = buildDigestEmail({
    generatedAt: new Date(),
    leadDays: 3,
    overdue: [],
    dueSoon: [
      {
        title: "Örnek: Proje teslimi",
        kind: "DEADLINE",
        category: "İş",
        dueAt: new Date(Date.now() + 2 * 86400000),
        priority: "HIGH",
      },
    ],
    reminders: [
      {
        title: "Örnek: Doktor hatırlatması",
        kind: "REMINDER",
        category: "Sağlık",
        remindAt: new Date(Date.now() + 3600000),
      },
    ],
    panelUrl,
  });
  return {
    subject: `EK Life · Test maili — ${digest.subject.replace(/^EK Life · /, "")}`,
    text: `Bu bir test mailidir.\n\n${digest.text}`,
    html: digest.html.replace("Günlük özet", "Test maili · Günlük özet şablonu"),
  };
}

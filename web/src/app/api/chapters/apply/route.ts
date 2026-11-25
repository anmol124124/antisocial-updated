import { NextResponse } from 'next/server';
import { createItem, uploadFile } from '@/lib/directus';
import { APPLICATIONS, PROPOSAL_UPLOAD, validateFields, type ApplicationType } from '@/lib/chapters';
import { sendMail, summarise, teamInbox } from '@/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/chapters/apply  (multipart/form-data)
 *
 * Organiser proposals, speaker pitches, local-team volunteers and chapter
 * partners. Every application lands in the CMS as "pending" — nothing is
 * published or approved here; the team reviews each one.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a form submission.' }, { status: 400 });
  }

  const type = String(form.get('type') || '') as ApplicationType;
  const config = APPLICATIONS[type];
  if (!config) return NextResponse.json({ error: 'Unknown application type.' }, { status: 400 });

  // Honeypot: real visitors never see this field.
  if (form.get('website')) return NextResponse.json({ ok: true, message: config.confirmation });

  const input = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'));
  const result = validateFields(config.fields, input);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  if (form.get('accepted_privacy') !== 'on') {
    return NextResponse.json({ error: 'Please accept the privacy notice.' }, { status: 400 });
  }
  if (config.reviewNote && form.get('accepted_review') !== 'on') {
    return NextResponse.json({ error: 'Please tick the confirmation box before sending.' }, { status: 400 });
  }

  // Optional proposal document (organisers only).
  let attachment: string | null = null;
  const file = form.get('attachment');
  if (config.allowsUpload && file instanceof File && file.size > 0) {
    if (file.size > PROPOSAL_UPLOAD.maxBytes) {
      return NextResponse.json({ error: 'The proposal file is larger than 10 MB.' }, { status: 400 });
    }
    if (!PROPOSAL_UPLOAD.types.includes(file.type)) {
      return NextResponse.json({ error: 'Please upload the proposal as a PDF, Word or PowerPoint file.' }, { status: 400 });
    }
    try {
      attachment = await uploadFile(file, `Proposal from ${result.values.full_name}`);
    } catch (err) {
      console.error('[chapters/apply] upload', err);
      return NextResponse.json({ error: 'We couldn’t upload that file. Try again, or submit without it.' }, { status: 502 });
    }
  }

  const values = result.values;
  try {
    await createItem('applications', {
      type,
      status: 'pending',
      ...values,
      attachment,
      accepted_privacy: true,
      marketing_opt_in: form.get('marketing_opt_in') === 'on',
    });
  } catch (err) {
    console.error('[chapters/apply]', err);
    return NextResponse.json({ error: 'We couldn’t record that just now. Please try again shortly.' }, { status: 502 });
  }

  await Promise.all([
    sendMail({
      to: String(values.email),
      subject: `We’ve received your application: ${config.title}`,
      text: `Hi ${values.full_name},\n\n${config.confirmation}\n\nThe AntiSocialTalks team`,
    }),
    teamInbox()
      ? sendMail({
          to: teamInbox()!,
          replyTo: String(values.email),
          subject: `New application: ${config.title}`,
          text:
            summarise(values, Object.fromEntries(config.fields.map((f) => [f.name, f.label]))) +
            (attachment ? '\n\nA proposal file is attached to the application in the CMS.' : ''),
        })
      : Promise.resolve(false),
  ]);

  return NextResponse.json({ ok: true, message: config.confirmation });
}

/**
 * Legal text, as supplied by the client: "AntiSocial Talks Terms of Use" and
 * "AntiSocial Talks Privacy Policy" (final versions, both effective 10 October
 * 2026). Reproduced word for word. Clauses are numbered on the page in this
 * order, and the text refers to them by number ("Clause 11"), so keep it.
 *
 * Markup: **bold**; email addresses and www. addresses become links.
 * Blocks: a paragraph, a bulleted list, or a list lettered a), b), c).
 */

export type LegalBlock = { p: string } | { ul: string[] } | { ol: string[] };
export type LegalSection = { heading: string; blocks: LegalBlock[] };
export type LegalDocument = { title: string; dates: string; sections: LegalSection[] };

export const LEGAL_EMAIL = 'legal@antisocialtalks.com';

const DATES = 'Effective Date: October 10, 2026 | Last Updated: October 10, 2026';

export const TERMS: LegalDocument = {
  title: 'AntiSocial Talks: Terms of Use',
  dates: DATES,
  sections: [
    {
      heading: 'Acceptance of These Terms',
      blocks: [
        {
          p: 'These Terms of Use (“**Terms**”) constitute a legally binding agreement between **AntiSocial Talks Inc.,** a corporation incorporated under the laws of **the Province of Alberta, Canada, with Alberta corporate access number 2028592125 and its registered office at 1020-330 5th Avenue SW, Calgary, Alberta, T2P 0L4** (“**AntiSocial Talks**,” “**Company**,” “**we**,” “**our**,” or “**us**”), and the individual or legal entity (“**you**” or “**your**”) accessing or using:',
        },
        {
          ul: [
            'The AntiSocial Talks website at www.antisocialtalks.com and its subdomains;',
            'The AntiSocial Talks podcast and talk-show episodes, in all editions, including on the Company’s website and through YouTube and Spotify (each, a “**Distribution Platform**”);',
            'The official AntiSocial Talks pages and accounts on social media platforms;',
            'AntiSocial Talks live events, including the flagship festival, roadshows and City Chapter events, and the ticketing for them, to the extent operated by or under license from the Company;',
            'Any comment, submission, subscription, or interaction feature made available in connection with the foregoing; and',
            'Any associated content, products or services provided by the Company (collectively, the “**Service**”).',
          ],
        },
        {
          p: 'By accessing, browsing, downloading, subscribing to, creating an account on, submitting information to, posting a comment on, or otherwise interacting with the Service (including AntiSocial Talks content made available on a Distribution Platform), you acknowledge that you have read, understood, and agree to be legally bound by these Terms and by any additional terms expressly incorporated into them by reference. Our Privacy Policy explains how we handle personal information. If you do not agree, you must not access or use the Service. Where the Service asks you to confirm your agreement (for example, by ticking a box when you create an account, buy a ticket or post a comment), your confirmation is your acceptance of these Terms.',
        },
        {
          p: 'If you are accepting these Terms on behalf of a company or other legal entity, you represent and warrant that you have full authority to bind that entity, and “you” refers to that entity.',
        },
        {
          p: 'Purchases of merchandise, event tickets and other paid products or services are also governed by the terms of sale presented at checkout, which prevail over these Terms for those transactions to the extent of any conflict. Attendance at live recordings, roadshows and City Chapter events is also subject to the applicable event terms.',
        },
      ],
    },
    {
      heading: 'About AntiSocial Talks',
      blocks: [
        {
          p: 'AntiSocial Talks is a media and live-events platform operated by the Company, which includes a podcast and talk-show format, featuring hosts and guests discussing a range of topics across episodes released through the Service and shared across Distribution Platforms and social media. The Service also includes live events (including a flagship festival and roadshows), the City Chapter network and, where offered, merchandise. Hosts appear under separate written agreements with the Company as independent contractors, and Guests appear under separate releases provided to the Company. Hosts and Guests are not employees, partners or agents of the Company and have no authority to make any promise, representation or commitment on the Company’s behalf. No statement or undertaking given to you by a Host or Guest binds the Company unless the Company confirms it in writing. The personal websites, social media accounts and channels of Hosts and Guests are not official channels of the Company, and the Company is not responsible for content posted on them.',
        },
        {
          p: 'Episode schedules, formats, languages, availability and publication are determined by the Company in its sole discretion, and the Company may add, remove, edit, re-edit or decline to publish any Content at any time, for any reason.',
        },
        {
          p: 'The Company may modify, suspend or discontinue all or any part of the Service, any feature of it or any Content, temporarily or permanently, at any time and without liability to you.',
        },
        {
          p: '“City Chapter” events are locally organized speaker events held under the AntiSocial Talks name, and are organized and operated by independent local organizers under license from the Company. Each organizer is solely responsible for its own events, venues, ticketing, staff, volunteers, attendee safety and compliance with applicable law, and is not the Company’s agent. The organizer of each City Chapter event, and the seller of its tickets, will be identified at the point of sale and in the event terms. Where a City Chapter event takes place outside Canada, the law of that place and the event terms will also apply to it. To the extent permitted by law and unless an event is expressly identified as organized by the Company, the Company is not responsible for any act or omission of a City Chapter organizer or for any City Chapter event.',
        },
        {
          p: 'AntiSocial Talks is an independent platform and is not affiliated with, endorsed by, sponsored by or licensed by any other conference, speaker-event or media organization or program. Any reference to other speaker or interview formats is descriptive only.',
        },
      ],
    },
    {
      heading: 'Modification to These Terms',
      blocks: [
        {
          p: 'The Company reserves the right to modify, amend, supplement, or replace these Terms at any time. Where changes are material, the Company will provide notice through one or more of the following: notice on the website, email communication (where we hold your email address), or other reasonable means, and will post the updated Terms with a revised Effective Date. Where applicable law requires advance notice of an amendment, the Company will give notice for the period the law requires, and the amendment will take effect only at the end of that period.',
        },
        {
          p: 'Continued use of the Service following the effective date of revised Terms constitutes your acceptance of the updated Terms. If you do not agree to the updated Terms, your sole remedy is to discontinue use of the Service.',
        },
      ],
    },
    {
      heading: 'Definitions',
      blocks: [
        { p: 'For the purpose of these Terms:' },
        {
          ol: [
            '“**Content**”: Means podcast episodes, recordings, show notes, clips, photographs, graphics, articles and related material produced by or on behalf of the Company, including content created by Hosts and Guests during recorded episodes.',
            '“**Guest**”: Means an individual who appears on an episode of the Service at the invitation of the Company or of a Host with the Company’s approval, under a separate release or agreement provided to the Company.',
            '“**Host**”: Means an individual engaged by the Company under a separate written agreement to host episodes of the Service.',
            '“**Roadshow**”: Means a touring live event organized by the Company in one or more cities, as distinct from a City Chapter event.',
            '“**User Submissions**”: Means comments, reviews, questions, messages, or other content that a User posts, uploads or submits in connection with the Service.',
            '“**User**”: Means any individual or entity that accesses or uses the Service, other than in their capacity as a Host or Guest.',
          ],
        },
      ],
    },
    {
      heading: 'Eligibility',
      blocks: [
        {
          p: 'You must be at least sixteen (16) years of age, or any higher minimum age that applies to you under the law of your place of residence, to use the Service. You represent and warrant that:',
        },
        {
          ol: [
            'You meet the age requirement above;',
            'You have the legal capacity to agree to these Terms or, if you have not reached the age of majority in your place of residence, your parent or legal guardian has reviewed these Terms and agrees to them on your behalf;',
            'You are not barred from using the Service under applicable law; and',
            'Any information you provide to the Company in connection with the Service is true, accurate, and not misleading.',
          ],
        },
        {
          p: 'If the Company learns or reasonably believes that a User does not meet these requirements, it may suspend or terminate that User’s access and delete any associated account and User Submissions. A parent or guardian who allows a minor to access the Service is responsible for that minor’s use of it.',
        },
        {
          p: 'A User who has not reached the age of majority in their place of residence may purchase tickets, merchandise or other paid products or services only with the consent of, or through, a parent or legal guardian, and may not apply to the Chapter Program or enter into any other agreement with the Company. Some Content may include strong language and mature themes, and a parent or guardian is responsible for deciding whether Content is suitable for a minor in their care.',
        },
      ],
    },
    {
      heading: 'Intellectual Property Rights',
      blocks: [
        {
          p: 'All Content made available through the Service, including recordings, Host performances, scripts, questions, photographs, graphics, logos, the AntiSocial Talks name and trademarks, and promotional material, is owned by or licensed to the Company and is protected by copyright, trademark and other intellectual property laws, including the Copyright Act (Canada). Nothing in these Terms transfers any ownership or license in that Content to you, except a limited, personal, non-exclusive, non-transferable and revocable license to access, stream and view it for your personal, non-commercial use, subject to these Terms.',
        },
        {
          p: 'You shall not reproduce, distribute, publicly perform, publicly display, modify, create derivative works from, sell, rent, lease, sublicense, or otherwise exploit any Content, in whole or in part, without the Company’s prior written consent. Limited sharing through the “share” or embed functions made available by the Company or a Distribution Platform is permitted, provided you do not remove any attribution, trademark or copyright notice.',
        },
        {
          p: 'Full episodes, raw or unreleased footage, and behind-the-scenes material may not be independently published, rebroadcast, or licensed by any User without the Company’s prior written permission.',
        },
        {
          p: 'You may not use the AntiSocial Talks name, logo, or other brand identifiers without the Company’s prior written consent, and you may not make any statement or design choice that could reasonably lead a third party to believe that your content, page or account is created, certified, or endorsed by the Company unless the Company has agreed in writing.',
        },
      ],
    },
    {
      heading: 'Names, Images and Voices of Hosts and Guests',
      blocks: [
        {
          p: 'Hosts and Guests who appear on AntiSocial Talks consent, under separate agreements with or releases provided to the Company, to the recording and use of their name, image, likeness and voice in connection with the Service.',
        },
        {
          p: 'Nothing in these Terms authorizes Users to use the name, image, likeness or voice of any Host or Guest for any purpose, including the creation of synthetic, “deepfake”, or voice-cloned content, without that person’s separate written consent and, where applicable, the Company’s consent.',
        },
        {
          p: 'If you attend a live recording, roadshow or other event of the Company, the event may be photographed, filmed and recorded, and you may appear in that material. Event notices and any event-specific terms will explain how attendees may be recorded and how the Company uses those recordings. Event notices will also say where to find, and how to raise concerns about, filming (for example, designated non-filmed areas). Where the law of the place of the event requires it, we will obtain your express consent before using your image or voice.',
        },
      ],
    },
    {
      heading: 'Comments and User Submissions',
      blocks: [
        {
          p: 'Where the Service allows you to post User Submissions, you grant the Company a worldwide, perpetual, irrevocable, royalty-free, non-exclusive, transferable and sublicensable license to host, store, reproduce, edit, adapt, publish, translate, communicate to the public and display such User Submissions, together with the name or username under which you post them, in connection with the Service, the Company’s business and their promotion, across any media now known or later developed. Nothing in this license limits any right you have under applicable privacy law, including any right to withdraw consent or ask for deletion as described in our Privacy Policy.',
        },
        {
          p: 'To the extent permitted by law, you irrevocably waive, in favour of the Company and its licensees, successors and assigns, all moral rights you have in your User Submissions, including under the Copyright Act (Canada), and you consent to the Company editing, abridging or using them without attribution. You retain any ownership you have in your User Submissions.',
        },
        {
          p: 'You are solely responsible for your User Submissions and confirm that you have all rights necessary to post them, and that they do not infringe or misappropriate the rights of any third party. The Company may remove any User Submission at its discretion and is not obligated to monitor User Submissions, though it may do so. User Submissions must not include the personal information of any other individual without that individual’s consent. The Company does not endorse any User Submission and is not responsible for any User Submission.',
        },
      ],
    },
    {
      heading: 'Unsolicited Ideas and Feedback',
      blocks: [
        {
          p: 'The Company receives many suggestions for episodes, topics, guests, formats and products, and develops its own Content independently. If you send the Company any idea, pitch, proposal, guest suggestion, format, script, feedback or other material that it has not requested in writing (“Unsolicited Material”), you agree that: (a) the Company has no obligation to review, keep confidential, use, return or pay for it; (b) the Company may already be developing, or may later develop, similar material independently; (c) you grant the Company, in respect of it, the license and waiver set out in the Comments and User Submissions Clause; and (d) you will make no claim against the Company or any Host or Guest arising from any similarity between your Unsolicited Material and any Content.',
        },
      ],
    },
    {
      heading: 'Sponsors and Commercial Relationships',
      blocks: [
        {
          p: 'Some Content, events and features may be supported by sponsors, advertisers or commercial partners. Where Content or an event is sponsored or includes paid promotion, the Company will identify the commercial relationship clearly, for example by a label or credit. Sponsors do not control editorial decisions, including the selection of Hosts, Guests, speakers or topics, and the Company does not sell guaranteed speaking slots. A reference by a Host or Guest to a product, service or organization is not an endorsement by the Company unless it is identified as one.',
        },
      ],
    },
    {
      heading: 'Chapter Partner Program',
      blocks: [
        {
          p: 'This clause sets out the terms on which the Company may permit Third Parties to organize, film and record events and content under the AntiSocial Talks name as part of its City Chapter vertical. By submitting an application to the Chapter Program, you agree to this Clause.',
        },
        {
          ol: [
            '**Scope and Precedence:** This Clause applies to any individual or organization that applies to organize, produce, film or record any event or content under the AntiSocial Talks name as part of the Company’s City Chapter vertical (the “Chapter Program”) (an “Applicant” and, once approved in writing, a “Chapter Partner”). It applies in addition to the rest of these Terms, to the standard operating procedures, brand guidelines and content standards issued by the Company for the Chapter Program as updated from time to time (the “SOP”), and to any written chapter agreement signed by the Company (a “Chapter Agreement”). If they conflict, the Chapter Agreement prevails, then this Clause, then the SOP. A Chapter Partner enters into this Clause in the course of its business and not as a consumer.',
            '**Application and Approval:** An Applicant must complete the Company’s application form truthfully and completely and must promptly provide any further information the Company requests. The Company may verify that information and carry out due diligence and background checks to the extent permitted by law. The Company may approve an application, approve it subject to conditions or reject it, in its sole discretion, without giving reasons and without liability. Submitting an application, paying any fee or receiving the SOP does not create any right, license, partnership or expectation of approval. No right to use the AntiSocial Talks name or to operate under the Chapter Program arises unless and until the Company confirms approval in writing and, where the Company requires it, the Applicant signs a Chapter Agreement. Approval is personal to the Chapter Partner and is limited to the events, formats, territory and term that the Company approves in writing (the “Territory” being the geographic area so approved).',
            '**Limited License:** Subject to the Chapter Partner’s continued compliance with this Clause, the SOP and any Chapter Agreement, the Company grants the Chapter Partner a limited, non-exclusive, non-transferable, non-sublicensable and revocable license to use the AntiSocial Talks name, trademarks, logos, formats and other brand assets supplied by the Company (the “Brand Assets”) solely as specified in the SOP, solely to organize, film and record approved Chapter events and content within the Territory, and solely for the approved term. No exclusivity in any Territory is granted unless a Chapter Agreement expressly grants it. All use of the Brand Assets, and all goodwill arising from that use, belongs to the Company. All rights not expressly granted are reserved.',
            '**Brand Protection:** The Chapter Partner will not alter the Brand Assets; create any sub-brand; sublicense or transfer any right; or register, apply for or use any trade mark, business name, domain name, social media account or handle that contains, or is confusingly similar to, any Brand Asset, except as the Company approves in writing. Any such registration, account or handle is held on trust for the Company and will be transferred to the Company on demand, at no cost. Any social media account or page operated for a Chapter is created only with the Company’s approval, is owned by the Company, and must give the Company full administrative access at all times.',
            '**Ownership of Chapter Content:** All recordings, footage, audio, photographs, transcripts, scripts, show notes, graphics and other material created by or for the Chapter Partner under the Chapter Program (the “Chapter Content”), and all intellectual property rights in it, are owned solely and exclusively by the Company from the moment of creation. The Chapter Partner hereby assigns to the Company, and will ensure that its personnel, contractors, hosts, speakers, guests, performers and crew assign to the Company, all right, title and interest in the Chapter Content, worldwide and for the full duration of those rights, and waives and will procure the waiver of all moral rights in it. To the extent any right cannot be assigned or waived, the Chapter Partner grants the Company an exclusive, perpetual, irrevocable, worldwide, royalty-free, transferable and sublicensable license to exercise it. Before any recording, the Chapter Partner will obtain a signed release, in the form required by the Company, from every individual who appears in or contributes to the Chapter Content, and will deliver all releases and all raw and edited files to the Company as the SOP requires.',
            '**Editorial Control and Publication:** The Company has sole and final editorial control over the Chapter Content. The Company may edit, adapt, publish, decline to publish, remove, license, monetise and otherwise exploit the Chapter Content in any manner, in any media and in any territory, in perpetuity, without any payment to the Chapter Partner beyond any amount expressly stated in a Chapter Agreement. The Chapter Partner may not publish, broadcast, license, sell or otherwise exploit any Chapter Content, or retain any copy of it, except as the Company authorizes in writing.',
            '**Confidentiality of the SOP:** The SOP, the application process, formats, playbooks, templates and all other non-public materials and information supplied by the Company are the Company’s confidential information and intellectual property. The Chapter Partner will use them only to operate under the Chapter Program, will not disclose, copy or adapt them for any other purpose, and will return or securely destroy them on request or on termination. These obligations continue after termination. The Company may amend the SOP at any time, and the Chapter Partner must comply with each amended version from the date the Company notifies it.',
            '**Chapter Partner’s Responsibilities:** The Chapter Partner is solely responsible, at its own cost and risk, for every aspect of its events and productions, including venues, permits and licenses (including any media, filming, event, broadcasting, music and performance licenses), health and safety, security, staffing, ticketing, payments, contracts with third parties, taxes and insurance. The Chapter Partner will comply with all laws of the Territory and of every other place where it operates, including laws on privacy and personal information, consumer protection, advertising, employment, anti-bribery and corruption, anti-money laundering and sanctions, and laws on filming or recording individuals and on media content, and will obtain every consent and approval those laws require. All Chapter Content and events must comply with the SOP and with the Acceptable Use; Prohibited Uses Clause. The Company’s review, approval, attendance or monitoring of any event, content or activity does not make the Company responsible for it and does not relieve the Chapter Partner of any obligation.',
            '**Personal Information:** The Chapter Partner is an independent organization and is responsible for all personal information it collects, uses or discloses in operating its Chapter. It will comply with applicable privacy law, publish its own privacy notice where required, and disclose personal information to the Company only as the SOP or a Chapter Agreement requires and only where it has a lawful basis to do so. The Chapter Partner will notify the Company in writing within forty-eight (48) hours after becoming aware of any loss of, or unauthorized access to, personal information connected with the Chapter Program.',
            '**Fees and Commercial Terms:** The Chapter Partner will pay all fees stated in the Company’s written approval or in a Chapter Agreement, when due, without set-off or deduction, and exclusive of applicable taxes. Fees are non-refundable unless a Chapter Agreement expressly provides otherwise. The Chapter Partner bears all of its own costs and expenses. Any sponsorship, ticket pricing, merchandise or other commercial arrangement that uses or refers to any Brand Asset requires the Company’s prior written approval, and every sponsorship must comply with the Sponsors and Commercial Relationships Clause. The Company does not guarantee any revenue, audience, attendance, publication or other result.',
            '**Independent Operation:** The Chapter Partner is an independent business and is not an employee, agent, partner, joint venturer or legal representative of the Company. It has no authority to bind the Company, to make any representation or commitment on the Company’s behalf, or to incur any liability for the Company. The Chapter Partner will identify itself in all event materials, tickets, contracts and communications as an independently operated chapter organized under license from AntiSocial Talks Inc., and will not represent that the Company organizes, sponsors or is responsible for its events.',
            '**Notification of Incidents and Grievances:** The Chapter Partner will handle complaints from attendees, guests, speakers and other third parties about its events in the first instance, in accordance with the SOP. It will notify the Company in writing within twenty-four (24) hours after becoming aware of any injury, safety incident, legal claim or threat of a claim, regulatory or police inquiry, media inquiry or other matter that could affect the Company or the Brand Assets, and will follow the Company’s instructions about it. The Chapter Partner will not make any public statement on behalf of AntiSocial Talks without the Company’s prior written approval.',
            '**Insurance:** The Chapter Partner will maintain, with reputable insurers, commercial general liability insurance and any other insurance required by the SOP, a Chapter Agreement or the law of the Territory, with limits not less than those stated in the SOP, naming the Company as an additional insured where that is available, and will provide certificates of insurance on request. Insurance does not limit the Chapter Partner’s liability.',
            '**Monitoring and Audit:** The Company or its representatives may attend, monitor and inspect any Chapter event or production and may request reports, records and information about the Chapter Partner’s activities under the Chapter Program. The Chapter Partner will cooperate promptly and provide the reports required by the SOP.',
            '**No Warranties:** The Chapter Program, the SOP and the Brand Assets are provided “as is”. The Company makes no representation or warranty about the commercial success of any Chapter, or that the SOP is sufficient to comply with the law of any Territory. The Chapter Partner relies on its own judgment and independent advice in deciding to participate.',
            '**Limitation of Liability:** To the maximum extent permitted by law, the Company Parties will not be liable to any Applicant or Chapter Partner for any loss, damage, claim or expense arising out of or relating to the Chapter Program, any Chapter event or Chapter Content, or the operations of any Chapter Partner, and will not in any case be liable for any indirect, incidental, special, consequential, exemplary or punitive damages or for any loss of profits, revenue, business, investment, goodwill or opportunity. The Company Parties’ total aggregate liability to an Applicant or Chapter Partner arising out of or relating to the Chapter Program shall not exceed the fees that Applicant or Chapter Partner actually paid to the Company in the twelve (12) months before the event giving rise to the claim.',
            '**Indemnity:** The Chapter Partner will indemnify, defend and hold harmless the Company Parties from and against all claims, demands, proceedings, liabilities, losses, damages, fines, penalties, costs and expenses, including legal fees, arising out of or relating to: (i) any Chapter event, Chapter Content or other activity of the Chapter Partner; (ii) any breach of this Clause, the SOP, a Chapter Agreement or any law; (iii) any claim by an attendee, guest, speaker, performer, venue, sponsor, supplier, employee, contractor or public authority; (iv) any death, personal injury or damage to property; (v) any material supplied by the Chapter Partner; and (vi) any tax, duty or levy arising from the Chapter Partner’s activities. The Company may control the defence and settlement of any such claim with counsel of its choice, and the Chapter Partner will cooperate fully.',
            '**Suspension and Termination:** The Company may suspend or terminate an approval, a license or a Chapter Partner’s participation in the Chapter Program at any time on written notice, with or without cause, and immediately if the Chapter Partner breaches this Clause, the SOP or any law, harms or threatens to harm the reputation of the Company or the Brand Assets, becomes insolvent or undergoes a change of control. On suspension or termination, the Chapter Partner will immediately stop using the Brand Assets and remove them from all materials, deliver to the Company all Chapter Content, releases and confidential information, and transfer to the Company every account, domain name and registration referred to in the Brand Protection sub-clause. To the extent permitted by law, the Company will not be liable for any compensation, refund, loss of investment, loss of goodwill or other amount arising from suspension or termination. Every provision of this Clause that by its nature is intended to survive, including those on ownership, confidentiality, liability, indemnity and governing law, survives termination.',
            '**Governing Law and Jurisdiction:** Wherever an Applicant or Chapter Partner is located and wherever a Chapter operates, this Clause, the SOP, the Chapter Program and every dispute between the Company and an Applicant or Chapter Partner arising out of or relating to them (including any dispute under a Chapter Agreement, unless it expressly provides otherwise) are governed by the laws of the Province of Alberta and the federal laws of Canada applicable in Alberta, without regard to conflict-of-laws principles. The Applicant or Chapter Partner irrevocably submits to the exclusive jurisdiction of the courts located in Calgary, Alberta, Canada, and waives any objection based on venue or inconvenient forum. The exceptions in the Governing Law; Dispute Resolution; Equitable Relief Clause for consumer-protection rules and for event terms do not apply to these disputes. Nothing in this sub-clause prevents the Company from seeking an injunction or other urgent or interim relief in any court of competent jurisdiction, including in the Territory, to protect the Brand Assets, the Chapter Content or its confidential information, and nothing in it relieves the Chapter Partner of its obligation to comply with the law of the Territory.',
          ],
        },
      ],
    },
    {
      heading: 'Third-Party Links, Platforms and Social Media Pages',
      blocks: [
        {
          p: 'The Service may contain links to, or be accessible through, third-party platforms including Distribution Platforms, social media platforms that are not owned or controlled by the Company. The Company is not responsible for the content, availability, privacy practices, or terms of any third-party platform, and your use of those platforms is governed by their own terms and policies.',
        },
        {
          p: 'AntiSocial Talks maintains official pages and accounts on various social media platforms and Distribution Platforms. Interactions on those pages (including comments, messages, ratings and reposts) are subject to this Clause and to the relevant platform’s own terms of use. The Company is not responsible for content posted by other users or third parties on those platforms and reserves the right to moderate, hide, report, or request removal of interactions that violate these Terms or applicable platform guidelines.',
        },
      ],
    },
    {
      heading: 'Copyright and Content Complaints',
      blocks: [
        {
          p: 'The Company respects intellectual-property rights and responds to notices of alleged infringement. If you believe Content available through the Service infringes your copyright, submit a written notice to the Company’s designated contact at legal@antisocialtalks.com containing:',
        },
        {
          ol: [
            'Identification of the work claimed to be infringed;',
            'Identification and location (such as a URL or episode reference) of the allegedly infringing material;',
            'Your contact information;',
            'A good-faith statement that the use is not authorized by the rights owner, its agent, or the law;',
            'A statement that the notice is accurate and that you are the owner of, or authorized to act for the owner of, the right claimed to be infringed; and',
            'Your physical or electronic signature.',
          ],
        },
        {
          p: 'The Company will review and, where appropriate, remove or disable access to material in response to a valid notice, may notify the affected person, and maintains a policy of taking appropriate action including removal of content and restriction of access against repeat infringers. Complaints regarding other unlawful content may be submitted to the same address and will be handled in accordance with applicable law. The Company is not required to act on any notice that is incomplete or that it reasonably considers unfounded, and any person who knowingly submits a false or misleading notice may be liable for the resulting loss. This Clause is intended to operate consistently with the notice-and-notice regime in the Copyright Act (Canada).',
        },
        {
          p: 'If you believe that any Content, including any statement made by a Host or Guest, is defamatory or infringes your privacy or other rights, you may submit a complaint to the same address identifying the Content, the statement complained of and the grounds for your complaint. The Company will review complaints in good faith and may, in its discretion, edit, annotate, restrict or remove Content. Any action the Company takes in response to a complaint is not an admission of liability, and submitting a complaint does not replace any notice required by law before legal proceedings are commenced. The Company keeps a documented corrections practice and, where appropriate, will publish a correction or give the affected person a reasonable opportunity to respond.',
        },
      ],
    },
    {
      heading: 'Acceptable Use; Prohibited Uses',
      blocks: [
        { p: 'You shall use the Service only for lawful purposes. When using the Service, you agree not to:' },
        {
          ul: [
            'Violate any applicable law or regulation, or facilitate criminal conduct;',
            'Create, request, store, or disseminate child sexual abuse material or any content that sexualizes minors, whether real or synthetic;',
            'Upload, post or transmit any content that is defamatory, obscene, harassing, hateful, threatening, or that incites violence against any person or group;',
            'Impersonate the Company, any Host, Guest, or other person, or misrepresent your affiliation with any person or entity;',
            'Create non-consensual intimate imagery, or generate deceptive synthetic or “deepfake” media of any identifiable individual without their consent;',
            'Edit, clip, re-caption or present any Content in a way that misrepresents what a Host or Guest said or the context in which it was said;',
            'Harass, threaten, stalk or dox any Host, Guest, User or member of the Company’s personnel, disclose their personal information, or contact any Host or Guest through the Service for unsolicited commercial purposes;',
            'Record, download, rip or re-upload any episode or other Content, except through features the Company or a Distribution Platform expressly provides for that purpose;',
            'Post spam, advertising, chain messages or unauthorized commercial solicitations, or submit false or abusive complaints or reports;',
            'Scrape, data-mine, reverse engineer, or use automated means to access, copy or bulk-extract the Service or Content or use the Service or any Content to train, fine-tune, test or improve any artificial-intelligence or machine-learning model, without the Company’s prior written authorization;',
            'Interfere with or disrupt the integrity, security or performance of the Service, including by introducing viruses or malicious code, or by conducting denial-of-service attacks;',
            'Attempt to circumvent any content-protection, access-control, or security feature of the Service;',
            'Use the Service to promote a competing podcast or service in a manner likely to confuse Users; or',
            'Infringe or misappropriate the intellectual-property, privacy, or other rights of any third party.',
          ],
        },
        {
          p: 'The Company may investigate and take appropriate action against anyone who, in the Company’s reasonable opinion, violates this Clause, including removing content, and suspending or terminating access to the Service.',
        },
      ],
    },
    {
      heading: 'Privacy',
      blocks: [
        {
          p: 'Our collection, use and disclosure of personal information in connection with the Service including information we collect from Users, Hosts and Guests is described in our Privacy Policy, which is a separate document from these Terms. We handle that information in accordance with applicable privacy law, including the Personal Information Protection Act (Alberta), the Personal Information Protection and Electronic Documents Act (Canada) where it applies, and any applicable provincial privacy legislation. The Privacy Policy explains what personal information we collect, why we collect it, how we obtain consent and how you can exercise your rights. Where the Company operates events or offers products to individuals outside Canada, it also complies with the privacy laws that apply to those activities, as described in the Privacy Policy.',
        },
      ],
    },
    {
      heading: 'Disclaimer of Warranties',
      blocks: [
        {
          p: 'The Service and all Content are provided “as is” and “as available”, without warranties or conditions of any kind, whether express, implied, statutory or otherwise, including any warranty or condition of merchantable quality, fitness for a particular purpose, title or non-infringement, or that the Service will be uninterrupted, timely, secure or error-free. Views expressed by Hosts, Guests and Users are their own and do not necessarily reflect the views of the Company, and the Company does not verify, adopt or endorse any statement made by a Host or Guest. The Company makes no warranty regarding the accuracy, reliability, currency or completeness of any Content.',
        },
        {
          p: 'Content is provided for general information and entertainment only. Nothing in the Service constitutes medical, health, financial, investment, tax, legal or other professional advice, and you should not act, or refrain from acting, on the basis of any Content without obtaining advice from a qualified professional about your own circumstances. Content may include strong language, mature themes and opinions that some people find offensive, and you access it at your own discretion. The Service is not offered by, and does not form part of, any investment, wealth-management or other regulated financial services business of the Company’s affiliates.',
        },
        {
          p: 'Nothing in these Terms excludes or limits any warranty or right that cannot lawfully be excluded or limited, including non-waivable rights under applicable consumer-protection law.',
        },
      ],
    },
    {
      heading: 'Limitation of Liability',
      blocks: [
        {
          p: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY, ITS AFFILIATES AND ITS AND THEIR SHAREHOLDERS, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS AND LICENSORS (THE “COMPANY PARTIES”) SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL OR OPPORTUNITY, ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR ACCESS TO, USE OF, OR INABILITY TO USE THE SERVICE OR ANY CONTENT, WHETHER BASED IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STATUTE OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. TO THE SAME EXTENT, THE COMPANY PARTIES SHALL NOT BE LIABLE FOR ANY STATEMENT MADE BY A HOST, GUEST OR USER, ANY USER SUBMISSION, ANY THIRD-PARTY PLATFORM, PRODUCT OR SERVICE, OR ANY CITY CHAPTER EVENT NOT ORGANIZED BY THE COMPANY. EXCEPT FOR LIABILITY THAT CANNOT BE EXCLUDED OR LIMITED UNDER APPLICABLE LAW, THE COMPANY PARTIES’ TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS, THE SERVICE OR ANY CONTENT SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO THE COMPANY, IF ANY, TO ACCESS THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, AND (B) ONE HUNDRED CANADIAN DOLLARS (CAD 100).',
        },
        {
          p: 'The foregoing limitations do not apply to liability arising from the Company’s fraud or willful misconduct, or to other liability that cannot lawfully be limited or excluded. Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law.',
        },
        {
          p: 'Each Company Party other than the Company is an intended beneficiary of this Clause and of the Disclaimer of Warranties and Indemnification Clauses, and may rely on and enforce them.',
        },
      ],
    },
    {
      heading: 'Indemnification',
      blocks: [
        {
          p: 'To the maximum extent permitted by applicable law, you agree to indemnify, defend and hold harmless the Company Parties from and against any claims, liabilities, damages, losses and expenses, including reasonable legal fees, arising out of or in any way connected with:',
        },
        {
          ol: [
            'Your unlawful or unauthorized use of the Service;',
            'Your User Submissions;',
            'Your violation of these Terms or applicable law; or',
            'Your infringement of any third party’s rights.',
          ],
        },
        { p: 'This Clause does not apply to consumers to the extent prohibited by applicable consumer-protection law.' },
        {
          p: 'The Company may assume the exclusive defence and control of any matter for which you are required to indemnify the Company Parties, and you will cooperate with that defence. You will not settle any such matter without the Company’s prior written consent.',
        },
      ],
    },
    {
      heading: 'Suspension and Termination',
      blocks: [
        {
          p: 'The Company may suspend or terminate your access to all or part of the Service, at any time and without notice, if it reasonably believes you have violated these Terms or applicable law, or for any operational, legal or security reason. You may stop using the Service at any time. The Company will not be liable to you or any third party for any suspension or termination of access, or for removing or disabling access to any User Submission or Content.',
        },
        {
          p: 'Clauses of these Terms that by their nature should survive termination, including Intellectual Property Rights, Comments and User Submissions, Unsolicited Ideas and Feedback, Chapter Partner Program, Copyright and Content Complaints, Disclaimer of Warranties, Limitation of Liability, Indemnification, and Governing Law, will survive.',
        },
      ],
    },
    {
      heading: 'Compliance with Laws',
      blocks: [
        {
          p: 'You shall use the Service in compliance with all laws applicable to you, including those relating to data protection and privacy, defamation, intellectual property, broadcasting standards, and consumer protection. You are solely responsible for determining whether your use of the Service satisfies your own legal obligations; nothing in these Terms constitutes legal advice.',
        },
      ],
    },
    {
      heading: 'Governing Law; Dispute Resolution; Equitable Relief',
      blocks: [
        {
          p: 'These Terms, and any dispute arising out of or relating to them or the Service, are governed by the laws of the Province of Alberta and the federal laws of Canada applicable in Alberta, without regard to conflict-of-laws principles.',
        },
        {
          p: 'The parties shall first attempt in good faith to resolve any dispute through informal negotiation by contacting the Company using the details in the final Clause of these Terms. Thereafter, the parties irrevocably submit to the exclusive jurisdiction of the courts located in Calgary, Alberta, Canada for any dispute arising out of or relating to these Terms, subject to any mandatory consumer-protection rules of your place of residence that cannot be waived by agreement, and subject to any different governing law or forum stated in the event terms for an event held outside Canada, and except as provided in Clause 11.',
        },
        {
          p: '**To the extent permitted by applicable law, any dispute will be brought and resolved only on an individual basis, and not as a plaintiff or class member in any class, collective or representative proceeding.**',
        },
        {
          p: 'You acknowledge that unauthorized use or disclosure of the Company’s Content or intellectual property would cause irreparable harm for which monetary damages would be inadequate, and that the Company shall be entitled to seek injunctive relief, in addition to all other remedies available at law or in equity.',
        },
      ],
    },
    {
      heading: 'General Provisions',
      blocks: [
        {
          p: '**Entire Agreement:** These Terms, together with any additional terms expressly incorporated into them by reference, constitute the entire agreement between you and the Company regarding the Service, and supersede all prior or contemporaneous understandings regarding its subject matter.',
        },
        {
          p: '**Severability:** If any provision of these Terms is found unenforceable, that provision will be enforced to the maximum extent permissible and the remaining provisions will remain in full force and effect.',
        },
        {
          p: '**No Waiver:** The Company’s failure to enforce any right or provision of these Terms will not be deemed a waiver of that right or provision.',
        },
        {
          p: '**Assignment:** You may not assign or transfer these Terms without the Company’s prior written consent. The Company may assign these Terms without restriction, including in connection with a merger, acquisition, or sale of assets.',
        },
        {
          p: '**Relationship:** Nothing in these Terms creates a partnership, joint venture, employment, or agency relationship between you and the Company.',
        },
        {
          p: '**Contracting Party:** The Service is operated by AntiSocial Talks Inc., which is the only party contracting with you under these Terms. No affiliate, shareholder, director or officer of the Company is a party to these Terms or has any obligation to you under them, but each of them is a Company Party for the purposes of the Disclaimer of Warranties, Limitation of Liability and Indemnification Clauses. “AntiSocial Talks” is the trade name and brand under which the Company operates the Service.',
        },
        {
          p: '**Force Majeure:** The Company is not liable for any delay or failure to perform resulting from events beyond its reasonable control, including natural disasters, pandemics, war, civil unrest, governmental action, or telecommunications or utility failures.',
        },
        {
          p: '**Notices; Electronic Communications:** Legal notices to the Company must be in writing and delivered to the address in the final Clause of these Terms. You consent to receiving notices and disclosures electronically, and, where permitted by law, electronic acceptance (including by continued use of the Service) has the same effect as a signature in writing.',
        },
        {
          p: '**Interpretation:** In these Terms, “including” means including without limitation, and all amounts are in Canadian dollars unless stated otherwise in these Terms or at checkout.',
        },
        {
          p: '**Language:** These Terms are drawn up in English. Where the Charter of the French Language (Quebec) applies to you, the Company will make a French version of these Terms available to you before you accept them, and you will be bound by the English version only if you expressly choose it after the French version has been made available to you.',
        },
        {
          p: '**Statutes:** A reference in these Terms to a statute includes the regulations made under it and that statute and those regulations as amended, consolidated or replaced from time to time.',
        },
        {
          p: '**Headings:** Clause headings are for convenience only and do not affect the interpretation of these Terms.',
        },
      ],
    },
    {
      heading: 'Grievances and Contact',
      blocks: [
        { p: 'Questions, complaints, or grievances regarding these Terms or the Service may be directed to:' },
        { p: '**AntiSocial Talks Inc.**' },
        { p: '**1020-330 5th Avenue SW, Calgary, Alberta, T2P 0L4, Canada**' },
        { p: '**Email:** legal@antisocialtalks.com' },
        {
          p: 'The Company’s person in charge of the protection of personal information, and the contact details for privacy requests and complaints, are identified in the Privacy Policy.',
        },
      ],
    },
  ],
};

export const PRIVACY: LegalDocument = {
  title: 'AntiSocial Talks: Privacy Policy',
  dates: DATES,
  sections: [
    {
      heading: 'Who We Are and What This Policy Covers',
      blocks: [
        {
          p: 'This Privacy Policy (“**Policy**”) explains how **AntiSocial Talks Inc.**, a corporation incorporated under the laws of the Province of Alberta, Canada, with Alberta corporate access number 2028592125 and its registered office at 1020-330 5th Avenue SW, Calgary, Alberta T2P 0L4 (“**AntiSocial Talks**,” “**Company**,” “**we**,” “**our**” or “**us**”), collects, uses, discloses, retains and protects personal information. “**Personal information**” means information about an identifiable individual.',
        },
        { p: 'This Policy applies to personal information we handle in connection with:' },
        {
          ul: [
            'The AntiSocial Talks website at www.antisocialtalks.com and its subdomains;',
            'The official AntiSocial Talks pages and accounts on social media platforms and on YouTube and Spotify (each, a “Distribution Platform”);',
            'Our newsletters, mailing lists and other communications (including by email, text message and messaging apps such as WhatsApp);',
            'Live recordings, roadshows and other events organized by the Company;',
            'The City Chapter Program, including applications to it;',
            'The sale of merchandise, tickets and other products and services; and',
            'Any other feature or service that links to or refers to this Policy (collectively, the “Service”).',
          ],
        },
        {
          p: 'This Policy is separate from, and does not form part of, our Terms of Use. Capitalized terms used but not defined in this Policy, including “Content,” “Host,” “Guest” and “User Submissions,” have the meanings given to them in the Terms of Use.',
        },
        { p: 'This Policy does not apply to:' },
        {
          ol: [
            'The handling of personal information by Distribution Platforms, social media platforms, payment processors or other third parties that operate under their own privacy policies, even when you use them to access our Content;',
            'City Chapter events organized by independent local organizers, who are responsible for the personal information they collect, except to the extent the Company itself collects, receives or controls personal information in connection with those events, including recordings of those events that the Company publishes and the release forms it holds; or',
            'Personal information of our employees and contractors, including Hosts, in their capacity as such, which is handled under separate notices given to them, except as described in the Recordings, Events and Public Content Clause.',
          ],
        },
        {
          p: 'We handle personal information in accordance with the Personal Information Protection Act (Alberta) (“PIPA”), the Personal Information Protection and Electronic Documents Act (Canada) (“PIPEDA”) where it applies, and any other privacy law that applies to a particular individual or activity.',
        },
      ],
    },
    {
      heading: 'Personal Information We Collect',
      blocks: [
        {
          p: 'We collect only the personal information that is reasonable for the purposes described in this Policy, which may include the following categories:',
        },
        {
          ol: [
            '**Contact and Account Information:** your name, email address, username, password (stored in hashed form), city and country, and communication preferences, which you give us when you subscribe, create an account or contact us;',
            '**User Submissions:** comments, reviews, questions, messages and ratings you post, and the name or username under which you post them;',
            '**Pitches and Unsolicited Material:** Guest suggestions, topic or format ideas, and any material and contact details you send with them;',
            '**Purchase and Ticketing Information:** items or tickets purchased, order history, billing and shipping address, telephone number, and the type and last four digits of your payment card, which we receive from you and from our payment processors and ticketing partners;',
            '**Event Information:** attendance and check-in records, any accessibility or seating requests you choose to give us, and images, video and audio of you captured at our events;',
            '**Correspondence and Complaints:** the contents of emails, messages, complaints, copyright notices and privacy requests you send us, and our replies;',
            '**Device and Usage Information:** IP address, browser and device type, operating system, language, referring page, pages viewed, episodes played, time and duration of visits, and approximate location derived from your IP address, which we collect automatically through our website, cookies and similar technologies;',
            '**Social Media and Distribution Platform Information:** your public profile name and picture and your interactions with our official pages and accounts, such as follows, likes, comments, shares and messages, which we receive from the relevant platform according to your settings on it;',
            '**Survey and Feedback Information:** your responses to audience, post-event and other surveys and feedback forms, and any related contact details;',
            '**Audience Analytics:** listener and viewer count, completion rates and audience demographics, which we receive from Distribution Platforms and social media platforms, generally in aggregated or de-identified form;',
            '**Host and Guest Information:** name, image, likeness, voice, biographical details, contact details and the contents of releases and agreements, which we receive from Hosts and Guests, including from Hosts who coordinate Guests on our behalf, and information about prospective Guests and speakers that we compile from publicly available sources or receive from nominators or Hosts, such as role, public profile and contact details; and',
            '**Chapter Program Applicant Information:** the name, contact details, organization, role, proposed territory and event plans that an applicant to the City Chapter Program gives us, information we obtain through due diligence and background checks on applicants and their key personnel, references, and the business, tax and payment details we need to administer the Chapter Program and collect fees.',
          ],
        },
        {
          p: 'We do not receive or store your full payment card number. Card payments are processed by third-party payment processors under their own security standards.',
        },
        {
          p: 'We do not ask for, and ask you not to send us, sensitive personal information such as health information, government identification numbers, or information about racial or ethnic origin, religious beliefs, sexual orientation or political opinions, except accessibility information you choose to give us for an event. If you include sensitive personal information in a User Submission, a pitch or correspondence, you do so by your own choice, and it may be visible to others as described in the Recordings, Events and Public Content Clause.',
        },
        {
          p: 'Where you give us personal information about another individual, such as when you suggest a Guest or buy a ticket for someone else, you represent that you are authorized to do so and that the individual has been told how we will handle that information.',
        },
        {
          p: 'When we first contact a prospective Guest or speaker whose personal information we obtained from publicly available sources, a nominator or a Host, we will tell that individual where we obtained it, why we hold it, and how to ask us to stop contacting them and to delete it.',
        },
        {
          p: 'We carry out due diligence and background checks on applicants to the City Chapter Program only to the extent the law permits, only where they are reasonable for assessing the application, and with the applicant’s consent where the law requires it. Where an applicant gives us personal information about its key personnel, references or other individuals, the applicant confirms that it is authorized to do so and that those individuals have been told how we will handle that information.',
        },
      ],
    },
    {
      heading: 'How We Use Personal Information',
      blocks: [
        { p: 'We use personal information for the following purposes:' },
        {
          ol: [
            'To provide, operate and maintain the Service, including streaming Content, managing accounts and displaying User Submissions;',
            'To process purchases, ticket sales, deliveries, cancellations, refunds and returns;',
            'To organize, admit attendees to and manage our events, including security, accessibility and safety;',
            'To produce, edit, publish and promote Content, including recordings of events;',
            'To respond to enquiries, complaints, copyright notices and privacy requests;',
            'To send you newsletters, event announcements and other marketing communications, where you have consented to receive them;',
            'To understand how the Service is used, measure audiences and improve our Content, features and programming;',
            'To moderate User Submissions and enforce our Terms of Use, including investigating abuse, fraud, harassment and infringement;',
            'To assess and verify applications to the City Chapter Program, carry out due diligence and background checks, and manage our relationship with Chapter Partners, including fees, compliance with our standard operating procedures and the protection of our brand;',
            'To protect the security and integrity of the Service and the safety of Hosts, Guests, attendees and personnel;',
            'To comply with legal, tax, accounting and regulatory obligations, and to establish, exercise or defend legal claims; and',
            'For any other purpose we identify to you when we collect the information, or that is permitted or required by law.',
          ],
        },
        {
          p: 'We will not use or disclose personal information for a new purpose without your consent, unless the law permits or requires us to do so.',
        },
        { p: '**No Sale of Personal Information:** We do not sell, rent or trade personal information.' },
        {
          p: '**No Automated Decisions:** We do not make decisions about you based exclusively on automated processing of your personal information that produce legal or similarly significant effects on you. We may use automated tools to help detect spam, abuse and security threats, with human review available on request.',
        },
      ],
    },
    {
      heading: 'Consent',
      blocks: [
        {
          p: '**Forms of Consent:** We obtain your consent to collect, use and disclose personal information, except where the law permits or requires us to proceed without it. The form of consent depends on the sensitivity of the information and your reasonable expectations. We obtain express consent where required, such as for marketing emails and for any optional collection of sensitive information. In other cases, your consent may be implied or deemed under PIPA, for example where you voluntarily give us information for an obvious purpose, such as a shipping address to receive an order.',
        },
        {
          p: '**Withdrawing Consent:** You may withdraw or change your consent at any time on reasonable notice, subject to legal or contractual restrictions. If you do, we may be unable to provide some or all of the Service to you, and we will explain the likely consequences when you ask. Withdrawing consent does not affect processing that took place before the withdrawal, and it does not require us to remove Content or User Submissions that have already been lawfully published, except as described in the Recordings, Events and Public Content Clause.',
        },
        {
          p: '**Marketing Messages:** We send commercial electronic messages only with your consent, or where Canada’s Anti-Spam Legislation otherwise permits. Every marketing message identifies the Company and contains a working unsubscribe mechanism, and we give effect to an unsubscribe request within ten (10) business days. Accepting our Terms of Use or this Policy is not consent to receive marketing messages. This applies to every channel we use, including email, text message and messaging apps such as WhatsApp, and we keep a record of your consent. Where we promote events in another country, we also follow that country’s rules on marketing messages.',
        },
      ],
    },
    {
      heading: 'Recordings, Events and Public Content',
      blocks: [
        {
          p: '**Event Recordings:** Our live recordings, roadshows and other events are photographed, filmed and recorded for publication as Content and for promotion. Notices at the venue and in the ticketing terms tell attendees this before they enter. By attending, you consent to being photographed, filmed and recorded and to the use of that material as Content, in all media and without payment, subject to applicable law. If you do not wish to be recorded, please tell event staff on arrival. Where reasonably practicable, we will seat you away from cameras, but we cannot guarantee that you will not appear in audience or crowd footage. Where an event is held outside Canada, local law may require different notices or consent, which we or the local organizer will provide.',
        },
        {
          p: '**Audience Participation:** If you ask a question, speak or otherwise take part from the audience, your contribution may be included in published Content. We may ask you to sign a separate release.',
        },
        {
          p: '**Public User Submissions:** User Submissions you post, and the name or username under which you post them, are visible to other users and the public. Do not include in a User Submission any personal information that you do not want to make public, including the personal information of any other individual.',
        },
        {
          p: '**Published Content:** Once Content or a User Submission is published, it may be downloaded, copied, shared or indexed by Distribution Platforms, search engines and other persons outside our control. If you ask us to remove material, we will consider your request in good faith and, where we agree, remove it from the channels we control. We cannot recall or delete copies held by others.',
        },
        {
          p: '**Hosts and Guests:** Hosts and Guests appear under separate agreements and releases that govern how their name, image, likeness, voice and biographical information are recorded, published and used. This Policy applies to any other personal information we hold about them.',
        },
      ],
    },
    {
      heading: 'Disclosure of Personal Information',
      blocks: [
        { p: 'We disclose personal information only as described below, or as otherwise permitted or required by law:' },
        {
          ol: [
            '**Service Providers:** We use third parties to host our website and data, send emails and newsletters, process payments, sell tickets, fulfil and ship orders, provide analytics, verify applicants to the City Chapter Program and carry out background checks, moderate content and support our operations. They may use personal information only to provide services to us, under contracts that require them to protect it;',
            '**Distribution Platforms and Social Media Platforms:** Content, and any personal information it contains, is published on those platforms, and your interactions with our pages on them are visible according to each platform’s rules;',
            '**City Chapter Organizers:** If you buy a ticket for, or register for, a City Chapter event through the Service, we share the information needed to admit you and run that event with its independent organizer (who may be located outside Canada), who handles it under its own legal obligations and its agreement with us;',
            '**Affiliates:** We may share personal information with companies under common control with the Company, for the purposes described in this Policy and subject to it, but we do not share personal information with, or use it to market the services of, any affiliate that provides financial, investment or wealth-management services without your separate express consent;',
            '**Professional Advisers and Insurers:** We may share personal information in confidence with our lawyers, accountants, auditors and insurers;',
            '**Legal Requirements and Protection of Rights:** We may disclose personal information to comply with a law, subpoena, warrant or court order; to respond to a lawful request from a public authority; to investigate or prevent fraud, harassment or a breach of an agreement or law; to establish, exercise or defend legal claims; or where we reasonably believe disclosure is necessary to protect the life, health or safety of any person;',
            '**Business Transactions:** If the Company is involved, or is considering being involved, in a sale, merger, financing, reorganization or other business transaction, we may disclose personal information to the other parties and their advisers, as PIPA and other applicable law permit. Those parties may use it only for the transaction and must protect it; and',
            '**De-identified and Aggregated Information:** We may share information that no longer identifies any individual, such as audience statistics, with sponsors, partners and others. We do not give sponsors or partners any information that identifies you unless you have separately consented.',
          ],
        },
      ],
    },
    {
      heading: 'Storage and Transfers Outside Canada',
      blocks: [
        {
          p: 'Some of our service providers, including those that host data, send email, process payments and provide analytics, are located outside Canada, including in the United States and, for events outside Canada, in the country where the event is held (for example, the United Arab Emirates, India or the United Kingdom), or store information outside Canada. Personal information may therefore be stored, accessed and processed outside Canada, where it is subject to the laws of that jurisdiction and may be accessible to its courts, law enforcement and national security authorities. We require these service providers, by contract, to protect personal information to a standard comparable to the one we apply.',
        },
        {
          p: 'You may obtain written information about our policies and practices for service providers outside Canada, and ask questions about how they collect, use, disclose or store personal information for us, by contacting our Privacy Officer at the contact details in the Privacy Officer and Contact Clause.',
        },
      ],
    },
    {
      heading: 'Cookies and Similar Technologies',
      blocks: [
        {
          p: 'Our website use cookies, pixels and similar technologies. We use strictly necessary cookies to run the Service, for example to keep you signed in and to process checkout. With your consent where the law requires it, we also use analytics cookies to understand how the Service is used, and advertising or social media cookies to measure and tailor our promotion. Where the law requires (including in Quebec), non-essential cookies are switched off until you opt in, and our cookie settings list the main analytics and advertising tools we use.',
        },
        {
          p: 'You can accept or refuse non-essential cookies through our cookie banner or settings, and you can block or delete cookies in your browser. Blocking cookies may stop some features from working. Embedded players from Distribution Platforms, such as YouTube or Spotify, may set their own cookies under their own policies.',
        },
      ],
    },
    {
      heading: 'Retention',
      blocks: [
        {
          p: 'We keep personal information only for as long as we need it for the purposes in this Policy, or as long as the law requires or permits. In particular:',
        },
        {
          ol: [
            'Account information is kept while your account is active and for a reasonable period afterwards;',
            'Newsletter information is kept until you unsubscribe, after which we keep a record of the unsubscribe request;',
            'Purchase, ticketing and tax records are kept for the period required by tax and accounting law, which is generally six (6) years from the end of the relevant tax year;',
            'Correspondence, complaints and privacy requests are kept for as long as needed to deal with them and any related claim;',
            'Information about prospective Guests and speakers is kept while we are considering an invitation and for a reasonable period afterwards, and is deleted on request unless we need to keep a record that you asked not to be contacted;',
            'Information about applicants to the City Chapter Program is kept while the application is under consideration and, for approved Chapter Partners, for as long as they participate in the City Chapter Program and for the period needed to deal with any related claim; information about unsuccessful applicants is deleted within a reasonable period after the decision, except for the record of the decision and the information we must keep under the rule that follows;',
            'Personal information used to make a decision about you is kept for at least one (1) year after that decision, so that you have a reasonable opportunity to request access to it; and',
            'Published Content and User Submissions are kept for as long as they remain published and as part of our archive.',
          ],
        },
        { p: 'When personal information is no longer needed, we securely destroy it, delete it or de-identify it.' },
      ],
    },
    {
      heading: 'Security and Breach Notification',
      blocks: [
        {
          p: '**Safeguards:** We protect personal information with physical, organizational and technical safeguards appropriate to its sensitivity, including access controls limited to personnel who need the information, encryption in transit, secure hosting and contractual obligations on our service providers. No method of transmission or storage is completely secure, and we cannot guarantee absolute security. You are responsible for keeping your password confidential and for telling us promptly if you believe your account has been compromised.',
        },
        {
          p: '**Breaches:** If personal information under our control is lost, or is accessed or disclosed without authorization, we will take reasonable steps to contain the incident and reduce harm. Where there is a real risk of significant harm to an individual, we will notify the Office of the Information and Privacy Commissioner of Alberta, the Office of the Privacy Commissioner of Canada or any other authority as required by law, and the affected individuals. We keep a record of every such incident.',
        },
      ],
    },
    {
      heading: 'Your Rights',
      blocks: [
        {
          p: '**Access and Correction:** Subject to the exceptions in applicable law, you may ask us whether we hold personal information about you, ask for access to it, ask how it has been used and to whom it has been disclosed, and ask us to correct any error or omission in it. Requests must be made in writing to our Privacy Officer at the contact details in the Privacy Officer and Contact Clause.',
        },
        {
          ol: [
            'We may need to verify your identity before acting on a request, and we will use the information you give for verification only for that purpose;',
            'We will respond within the time limit set by the law that applies to your request, which is generally forty-five (45) days under PIPA and thirty (30) days under PIPEDA, and we will tell you if we need to extend that time as the law allows;',
            'We do not charge for correcting your personal information. We may charge a reasonable fee for access where the law permits, and if so, we will give you a written estimate first, and you may withdraw your request;',
            'If we refuse a request in whole or in part, we will give you the reasons, unless the law prevents us from doing so, and tell you how you can challenge the refusal; and',
            'If we do not correct information as you request, we will annotate the information with the correction that was requested.',
          ],
        },
        {
          p: '**Other Choices:** You can unsubscribe from marketing emails using the link in any message, manage cookies as described in the Cookies and Similar Technologies Clause, update your account information in your account settings, and ask us to close your account and delete the associated personal information, subject to the Retention Clause and the Recordings, Events and Public Content Clause.',
        },
        {
          p: '**Complaints:** If you have a concern about how we handle personal information, please contact our Privacy Officer first, and we will investigate and respond. You also have the right to complain to the Office of the Information and Privacy Commissioner of Alberta or, where PIPEDA applies, to the Office of the Privacy Commissioner of Canada.',
        },
      ],
    },
    {
      heading: 'Regional Provisions',
      blocks: [
        {
          p: '**Residents of Quebec:** If you are a resident of Quebec, you also have the rights given by the Act respecting the protection of personal information in the private sector (Quebec), including, in the circumstances that Act provides, the right to receive computerized personal information you provided to us in a structured, commonly used technological format, and to ask us to stop disseminating your personal information or to de-index any hyperlink attached to your name. You may complain to the Commission d’accès à l’information du Québec. Our Privacy Officer is the person in charge of the protection of personal information.',
        },
        {
          p: '**Residents of Other Jurisdictions:** The Service is operated from Canada. If you access it from another jurisdiction, your personal information will be handled in Canada and in the other jurisdictions described in the Storage and Transfers Outside Canada Clause. Where the law of your place of residence gives you additional rights over your personal information that apply to us, we will respect those rights, and you may exercise them by contacting our Privacy Officer.',
        },
        {
          p: '**Events and Offers Outside Canada:** Where we or a local organizer sell tickets for, or run, events in another country (for example, the United Arab Emirates, India or the United Kingdom), or otherwise offer the Service to individuals there, we also comply with the privacy and electronic-marketing laws that apply to that activity, including requirements for notice, consent, cross-border transfers, individual rights and breach notification.',
        },
      ],
    },
    {
      heading: 'Minors',
      blocks: [
        {
          p: 'The Service is intended for individuals aged sixteen (16) and over, and it is not directed at children. We do not knowingly collect personal information from anyone under the age of sixteen (16), except a minor who appears as a Guest with the written consent of a parent or legal guardian. Where we collect personal information from users who are sixteen (16) or seventeen (17) years of age, or who are otherwise under the age of majority in their place of residence, we handle it with additional care, collect only what is needed to provide the Service to them, and do not use it for targeted or behavioral advertising. If we learn that we have collected personal information from anyone under the age of sixteen (16), or from a minor Guest without the required consent, we will delete it. A parent or guardian who believes their child has given us personal information may contact our Privacy Officer.',
        },
      ],
    },
    {
      heading: 'Third-Party Sites and Platforms',
      blocks: [
        {
          p: 'The Service links to, and is available through, websites and platforms we do not control, including Distribution Platforms, social media platforms, sponsors and the personal accounts of Hosts and Guests. Their privacy practices are governed by their own policies, and we are not responsible for them.',
        },
      ],
    },
    {
      heading: 'Changes to This Policy',
      blocks: [
        {
          p: 'We may update this Policy to reflect changes in our practices, the Service or the law. We will post the updated Policy on the Service with a revised “Last Updated” date. Where a change is material, we will also give notice through the Service or by email, where we hold your email address, before the change takes effect. If a change would allow us to use personal information we already hold for a new purpose, we will obtain your consent where the law requires it.',
        },
      ],
    },
    {
      heading: 'Privacy Officer and Contact',
      blocks: [
        {
          p: 'The Company has designated a Privacy Officer, who is responsible for the Company’s compliance with this Policy and with applicable privacy law and is the person in charge of the protection of personal information. Questions, requests and complaints about this Policy or our handling of personal information may be directed to:',
        },
        { p: '**Privacy Officer**' },
        { p: 'AntiSocial Talks Inc.' },
        { p: 'Name and Title: Viswateja, Privacy Officer' },
        { p: '1020-330 5th Avenue SW, Calgary, Alberta T2P 0L4, Canada' },
        { p: 'Email: legal@antisocialtalks.com' },
        {
          p: 'You may also contact the Office of the Information and Privacy Commissioner of Alberta (www.oipc.ab.ca), the Office of the Privacy Commissioner of Canada (www.priv.gc.ca) or, for residents of Quebec, the Commission d’accès à l’information du Québec (www.cai.gouv.qc.ca).',
        },
      ],
    },
  ],
};

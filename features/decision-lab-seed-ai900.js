/* DRAFT ai900 Decision Lab seed scenarios · answers NOT yet founder-verified. Review before ship. */
window.DECISION_LAB_SEED_AI900 = [
  // ========================================================================
  // ===== AI workloads & Responsible AI (~20%, ~10) ========================
  // ========================================================================
  {
    id: 'ai900-dl-rai-1', cert: 'ai900', objective: '1.3', topic: 'Responsible AI principles',
    title: 'Which principle does the loan model violate?',
    estMinutes: 3,
    scenario: 'A bank trains a loan-approval model on historical decisions. After launch, the model approves <mark>qualified applicants from one neighborhood far less often</mark> than equally qualified applicants elsewhere, tracking a protected characteristic. Pick the Responsible AI principle most directly violated.',
    pair: 'Fairness vs Reliability and safety',
    family: 'Responsible AI principles',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the Responsible AI principle most directly violated.',
        explanation: 'The tell: equally qualified people get systematically different outcomes that track a protected group. That is a disparate-treatment / bias problem, which is exactly the Fairness principle.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Fairness' },
            { id: 'l2', text: 'Reliability and safety', why: 'This principle covers a model performing consistently and failing safely under unexpected input; here the model works as built but produces biased outcomes.' },
            { id: 'l3', text: 'Privacy and security', why: 'This covers protecting personal data from exposure or misuse; nothing here describes data being leaked or accessed improperly.' },
            { id: 'l4', text: 'Transparency', why: 'This covers explaining how the system makes decisions; the problem is the biased outcome itself, not a lack of explanation.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-rai-2', cert: 'ai900', objective: '1.3', topic: 'Responsible AI principles',
    title: 'Map each situation to the violated principle',
    estMinutes: 4,
    scenario: 'Match each Responsible AI failure to the principle it most directly violates.',
    pair: 'Transparency vs Accountability',
    family: 'Responsible AI principles',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each situation with the principle it violates.',
        explanation: 'Transparency is about the user understanding how/why a decision was made; Accountability is about a human being answerable and in control; Inclusiveness is about serving people of all abilities; Privacy and security is about protecting personal data; Reliability and safety is about consistent, safe operation.',
        payload: {
          left: [
            { id: 'blackbox', label: 'A medical AI gives a diagnosis but cannot explain which factors drove it' },
            { id: 'noowner', label: 'An autonomous system causes harm and no person or process is responsible for it' },
            { id: 'novoice', label: 'A kiosk app cannot be used by people who rely on a screen reader' },
            { id: 'leak', label: 'Training data containing patient records is exposed to unauthorized staff' },
            { id: 'erratic', label: 'A self-checkout vision model behaves unpredictably under poor lighting' }
          ],
          right: [
            { id: 'transparency', label: 'Transparency' },
            { id: 'accountability', label: 'Accountability' },
            { id: 'inclusiveness', label: 'Inclusiveness' },
            { id: 'privacy', label: 'Privacy and security' },
            { id: 'reliability', label: 'Reliability and safety' }
          ]
        },
        answer: { pairs: { blackbox: 'transparency', noowner: 'accountability', novoice: 'inclusiveness', leak: 'privacy', erratic: 'reliability' } } }
    ]
  },

  {
    id: 'ai900-dl-rai-3', cert: 'ai900', objective: '1.3', topic: 'Responsible AI principles',
    title: 'Transparency or Accountability?',
    estMinutes: 3,
    scenario: 'A company deploys an AI hiring screener. A rejected candidate asks why they were filtered out, and the team realizes they <mark>cannot describe what data or logic produced the score</mark>. Pick the principle most directly violated.',
    pair: 'Transparency vs Accountability',
    family: 'Responsible AI principles',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the Responsible AI principle most directly violated.',
        explanation: 'The tell: the failure is the inability to explain how the decision was reached. Explainability of the system is Transparency, not Accountability.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Transparency' },
            { id: 'l2', text: 'Accountability', why: 'Accountability is about a human or process being answerable and in control of the system; here the gap is that no one can explain the decision, which is explainability.' },
            { id: 'l3', text: 'Fairness', why: 'Fairness would apply if the screener treated similar candidates differently by group; the stated problem is lack of explanation, not biased outcomes.' },
            { id: 'l4', text: 'Inclusiveness', why: 'Inclusiveness covers serving people of all abilities and backgrounds; nothing here describes an accessibility barrier.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-rai-4', cert: 'ai900', objective: '1.3', topic: 'Responsible AI principles',
    title: 'Who is accountable for the AI decision?',
    estMinutes: 3,
    scenario: 'An insurer fully automates claim denials with no human review and no defined owner to override or audit wrong denials. Regulators ask <mark>who is answerable</mark> when the system is wrong. Pick the principle most directly violated.',
    pair: 'Transparency vs Accountability',
    family: 'Responsible AI principles',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the Responsible AI principle most directly violated.',
        explanation: 'The tell: no human or process is answerable for, or in control of, the outcomes. That is Accountability, distinct from Transparency (which is about explaining the decision).',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Accountability' },
            { id: 'l2', text: 'Transparency', why: 'Transparency is about being able to explain how a decision was made; the gap here is that nobody is answerable for or in control of the system, not a missing explanation.' },
            { id: 'l3', text: 'Reliability and safety', why: 'This covers consistent, safe operation under varied conditions; the issue described is governance ownership, not erratic behavior.' },
            { id: 'l4', text: 'Fairness', why: 'Fairness concerns biased outcomes across groups; the described gap is the absence of a responsible human owner.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-rai-5', cert: 'ai900', objective: '1.3', topic: 'Responsible AI principles',
    title: 'Inclusiveness or Privacy?',
    estMinutes: 3,
    scenario: 'A voice assistant is trained mostly on one accent and <mark>fails to recognize speakers with regional accents or speech differences</mark>, leaving those users unable to use the product. Pick the principle most directly violated.',
    pair: 'Inclusiveness vs Privacy and security',
    family: 'Responsible AI principles',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the Responsible AI principle most directly violated.',
        explanation: 'The tell: a group of people cannot use the product because of who they are or how they speak. Serving people of all abilities and backgrounds is Inclusiveness.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Inclusiveness' },
            { id: 'l2', text: 'Privacy and security', why: 'This covers protecting personal data; nothing here involves data exposure, only some users being unable to use the product.' },
            { id: 'l3', text: 'Reliability and safety', why: 'This is about consistent, safe behavior under varied conditions; the issue is that a whole population is excluded, which is an inclusiveness gap.' },
            { id: 'l4', text: 'Transparency', why: 'Transparency is about explaining decisions; the failure here is exclusion of users, not a missing explanation.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-rai-6', cert: 'ai900', objective: '1.3', topic: 'Responsible AI principles',
    title: 'Privacy and security in training data',
    estMinutes: 3,
    scenario: 'A team builds a model and <mark>copies raw customer records, including names and card numbers, into an unsecured shared folder</mark> used for training. Pick the principle most directly violated.',
    pair: 'Privacy and security vs Reliability and safety',
    family: 'Responsible AI principles',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the Responsible AI principle most directly violated.',
        explanation: 'The tell: personal data is exposed and not protected. Safeguarding personal information through a model lifecycle is Privacy and security.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Privacy and security' },
            { id: 'l2', text: 'Reliability and safety', why: 'This covers the model behaving consistently and failing safely; the problem here is unprotected personal data, not model behavior.' },
            { id: 'l3', text: 'Fairness', why: 'Fairness is about biased outcomes across groups; exposing personal records is a data-protection issue.' },
            { id: 'l4', text: 'Accountability', why: 'Accountability is about a human owning and controlling the system; the specific failure is that sensitive data was left exposed.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-rai-7', cert: 'ai900', objective: '1.3', topic: 'Responsible AI principles',
    title: 'Which principle does the self-driving model violate?',
    estMinutes: 3,
    scenario: 'A self-driving prototype performs well in clear weather but <mark>behaves erratically and unpredictably in heavy rain and fog</mark>, swerving and braking at random instead of failing safely. Pick the Responsible AI principle most directly violated.',
    pair: 'Reliability and safety vs Fairness',
    family: 'Responsible AI principles',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the Responsible AI principle most directly violated.',
        explanation: 'The tell: the system fails to operate consistently and safely under unexpected or harsh conditions. Performing dependably and failing safely under varied conditions is the Reliability and safety principle.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Reliability and safety' },
            { id: 'l2', text: 'Fairness', why: 'Fairness concerns biased outcomes across groups of people; here the problem is unsafe, inconsistent behavior under poor conditions, not bias.' },
            { id: 'l3', text: 'Transparency', why: 'Transparency is about explaining how a decision was reached; the failure here is erratic, unsafe operation, not a missing explanation.' },
            { id: 'l4', text: 'Privacy and security', why: 'This covers protecting personal data; nothing here involves data being exposed or misused.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-workload-1', cert: 'ai900', objective: '1.1', topic: 'AI workloads',
    title: 'Match the AI workload to the scenario',
    estMinutes: 4,
    scenario: 'Match each business scenario to the AI workload category it best represents.',
    family: 'AI workload types',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each scenario with its AI workload type.',
        explanation: 'Computer vision interprets images and video; NLP works with written and spoken language; knowledge mining extracts information from large unstructured document stores; anomaly detection flags data points that deviate from normal; generative AI creates new content such as text or images.',
        payload: {
          left: [
            { id: 'count', label: 'Count vehicles in traffic-camera footage' },
            { id: 'sentiment', label: 'Gauge customer sentiment from support emails' },
            { id: 'search', label: 'Make thousands of scanned contracts searchable and queryable' },
            { id: 'fraud', label: 'Flag credit-card transactions that deviate from a cardholder pattern' },
            { id: 'draft', label: 'Produce a first-draft product description from a prompt' }
          ],
          right: [
            { id: 'vision', label: 'Computer vision' },
            { id: 'nlp', label: 'Natural language processing' },
            { id: 'mining', label: 'Knowledge mining' },
            { id: 'anomaly', label: 'Anomaly detection' },
            { id: 'genai', label: 'Generative AI' }
          ]
        },
        answer: { pairs: { count: 'vision', sentiment: 'nlp', search: 'mining', fraud: 'anomaly', draft: 'genai' } } }
    ]
  },

  {
    id: 'ai900-dl-workload-2', cert: 'ai900', objective: '1.1', topic: 'AI workloads',
    title: 'Classify the workload: anomaly detection',
    estMinutes: 3,
    scenario: 'A factory streams sensor readings from a pump and wants to be alerted when a reading is <mark>unlike anything the equipment normally produces</mark>, without labeling every possible fault in advance. Pick the AI workload type.',
    pair: 'Anomaly detection vs Classification',
    family: 'AI workload types',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the AI workload type that best fits.',
        explanation: 'The tell: flag readings that deviate from the normal pattern, with no predefined fault labels. Detecting unusual data points is anomaly detection.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Anomaly detection' },
            { id: 'l2', text: 'Classification', why: 'Classification assigns inputs to known, predefined categories; here there is no labeled set of fault classes, only a notion of normal vs unusual.' },
            { id: 'l3', text: 'Computer vision', why: 'Computer vision interprets images or video; the input here is numeric sensor telemetry, not pixels.' },
            { id: 'l4', text: 'Knowledge mining', why: 'Knowledge mining extracts information from unstructured documents; this is live numeric stream monitoring.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-workload-3', cert: 'ai900', objective: '1.2', topic: 'AI workloads',
    title: 'Pick the workload: knowledge mining',
    estMinutes: 3,
    scenario: 'A legal firm has <mark>decades of scanned PDFs and contracts</mark> and wants a search experience that surfaces clauses and entities buried across the whole archive. Pick the AI workload type that best describes this need.',
    pair: 'Knowledge mining vs NLP',
    family: 'AI workload types',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the AI workload type that best fits.',
        explanation: 'The tell: extract and index searchable information from a large store of unstructured documents. That is knowledge mining (the pattern Azure AI Search implements).',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Knowledge mining' },
            { id: 'l2', text: 'Natural language processing', why: 'NLP is the underlying capability for understanding language, but the end-to-end need of indexing a document archive for search is the knowledge-mining workload.' },
            { id: 'l3', text: 'Anomaly detection', why: 'Anomaly detection flags outlier data points; the goal here is search and extraction across documents, not finding outliers.' },
            { id: 'l4', text: 'Generative AI', why: 'Generative AI creates new content; the need is to find and surface existing content already in the archive.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  // ========================================================================
  // ===== Service-pick at overlapping boundaries (~40%, ~20) ===============
  // ========================================================================
  {
    id: 'ai900-dl-service-1', cert: 'ai900', objective: '2.1', topic: 'Azure AI services',
    title: 'Structured invoice extraction',
    estMinutes: 3,
    scenario: 'A finance team needs to <mark>extract line-item totals, dates, and tables from scanned supplier invoices</mark> as structured key-value fields. Pick the best Azure AI service.',
    pair: 'AI Vision vs Document Intelligence',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service.',
        explanation: 'The tell: structured fields and tables from forms/invoices, not just loose text. Azure AI Document Intelligence is purpose-built for structured document extraction; its prebuilt invoice model returns these fields directly.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Vision (OCR)', why: 'Vision OCR returns raw text and its positions, but it does not understand invoice structure or return typed key-value fields and tables.' },
            { id: 'l2', text: 'Azure AI Document Intelligence' },
            { id: 'l3', text: 'Azure AI Language', why: 'Language analyzes text you already have (sentiment, entities, key phrases); it does not read scanned documents into structured fields.' },
            { id: 'l4', text: 'Azure OpenAI', why: 'Azure OpenAI generates and reasons over text, but the prebuilt, deterministic path for invoice fields is Document Intelligence.' }
          ]
        },
        answer: { selected: ['l2'] } }
    ]
  },

  {
    id: 'ai900-dl-service-2', cert: 'ai900', objective: '2.1', topic: 'Azure AI services',
    title: 'Read text off a photographed sign',
    estMinutes: 3,
    scenario: 'A travel app needs to <mark>read printed text from a photo of a street sign</mark> and return the words. There is no form structure to extract. Pick the best Azure AI service.',
    pair: 'AI Vision vs Document Intelligence',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service.',
        explanation: 'The tell: plain text from a general image with no structured form. Azure AI Vision OCR (Read) extracts free text from images and is the right fit when there is no document schema.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Vision (OCR)' },
            { id: 'l2', text: 'Azure AI Document Intelligence', why: 'Document Intelligence shines when you need structured fields from forms or invoices; a street sign has no document structure to model.' },
            { id: 'l3', text: 'Azure AI Language', why: 'Language processes text you already have; it cannot read text out of an image.' },
            { id: 'l4', text: 'Azure AI Translator', why: 'Translator converts text between languages; you still need OCR first to get the text off the image.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-3', cert: 'ai900', objective: '2.2', topic: 'Azure AI services',
    title: 'Transcribe a recorded call',
    estMinutes: 3,
    scenario: 'A support team wants to <mark>convert recorded phone calls into text transcripts</mark> for later analysis. Pick the best Azure AI service for the transcription step.',
    pair: 'Speech vs Language',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service.',
        explanation: 'The tell: audio in, text out. Speech-to-text is the Azure AI Speech service capability; Language acts on the text only after it exists.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Speech' },
            { id: 'l2', text: 'Azure AI Language', why: 'Language analyzes text (sentiment, entities) but cannot turn an audio recording into text; that is the Speech service.' },
            { id: 'l3', text: 'Azure AI Translator', why: 'Translator converts text between languages; it does not transcribe audio.' },
            { id: 'l4', text: 'Azure AI Vision', why: 'Vision interprets images and video frames, not audio.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-4', cert: 'ai900', objective: '2.2', topic: 'Azure AI services',
    title: 'Translate written product reviews',
    estMinutes: 3,
    scenario: 'A retailer wants to <mark>translate written product reviews from French and German into English</mark> in bulk. The text is already in a database. Pick the best Azure AI service.',
    pair: 'Translator vs Speech',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service.',
        explanation: 'The tell: text-to-text language conversion of existing written content. Azure AI Translator handles machine translation of text. Speech translation is only needed when the source is audio.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Translator' },
            { id: 'l2', text: 'Azure AI Speech', why: 'The Speech service handles spoken-audio scenarios including speech translation; here the source is already written text, so the Translator is the direct fit.' },
            { id: 'l3', text: 'Azure AI Language', why: 'Language covers sentiment, entities, and key phrases; bulk text translation is the Translator service.' },
            { id: 'l4', text: 'Azure AI Document Intelligence', why: 'Document Intelligence extracts structured fields from documents; the text is already available and just needs translating.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-5', cert: 'ai900', objective: '2.2', topic: 'Azure AI services',
    title: 'Detect sentiment and key phrases',
    estMinutes: 3,
    scenario: 'A team has thousands of English survey responses and wants to <mark>score each one as positive or negative and pull out key phrases</mark>. Pick the best Azure AI service.',
    pair: 'Language vs OpenAI',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service.',
        explanation: 'The tell: prebuilt sentiment analysis and key-phrase extraction over text. These are first-class features of Azure AI Language, no custom prompting required.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Language' },
            { id: 'l2', text: 'Azure OpenAI', why: 'Azure OpenAI could do this with prompting, but sentiment and key-phrase extraction are turnkey, prebuilt features of Azure AI Language.' },
            { id: 'l3', text: 'Azure AI Speech', why: 'Speech handles audio; the input here is written survey text.' },
            { id: 'l4', text: 'Azure AI Vision', why: 'Vision interprets images; there are no images in this scenario.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-6', cert: 'ai900', objective: '2.3', topic: 'Azure AI services',
    title: 'Build a question-answering bot from a FAQ',
    estMinutes: 3,
    scenario: 'A company wants a chatbot that <mark>answers customer questions from an existing FAQ document</mark> with curated question-and-answer pairs. Pick the best Azure AI capability.',
    pair: 'Question answering vs OpenAI',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best capability.',
        explanation: 'The tell: turn an existing FAQ into a curated knowledge base of Q&A pairs. The question answering feature of Azure AI Language is built exactly for this.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Language question answering' },
            { id: 'l2', text: 'Azure OpenAI', why: 'Azure OpenAI generates free-form answers, but building a curated knowledge base from a FAQ is the dedicated question answering feature in Azure AI Language.' },
            { id: 'l3', text: 'Azure AI Translator', why: 'Translator converts languages; it does not build a Q&A knowledge base.' },
            { id: 'l4', text: 'Azure AI Document Intelligence', why: 'Document Intelligence extracts structured fields from forms; it does not serve curated FAQ answers.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-7', cert: 'ai900', objective: '2.3', topic: 'Azure AI services',
    title: 'Understand intent in a user utterance',
    estMinutes: 3,
    scenario: 'A smart-home app must <mark>interpret commands like "turn the kitchen lights off" into an intent plus entities</mark> (action, room). Pick the best Azure AI capability.',
    pair: 'Conversational language understanding vs Question answering',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best capability.',
        explanation: 'The tell: map an utterance to an intent and extract entities. Conversational language understanding (CLU) in Azure AI Language does intent and entity recognition.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Conversational language understanding (Azure AI Language)' },
            { id: 'l2', text: 'Question answering', why: 'Question answering returns curated answers from a knowledge base; it does not classify intents or extract action/room entities from a command.' },
            { id: 'l3', text: 'Azure AI Translator', why: 'Translator converts languages; it does not derive intent or entities.' },
            { id: 'l4', text: 'Azure AI Speech', why: 'Speech converts audio to text; understanding the intent of that text is a Language capability.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-8', cert: 'ai900', objective: '2.1', topic: 'Azure AI services',
    title: 'Recognize a specific product on shelves',
    estMinutes: 3,
    scenario: 'A retailer wants to <mark>train a model to recognize its own branded products in shelf photos</mark> using its own labeled images. Pick the best Azure AI capability.',
    pair: 'Vision image analysis vs Custom Vision',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best capability.',
        explanation: 'The tell: train on your own labeled images for categories the prebuilt model does not know. Azure AI Custom Vision is a distinct service for custom image classification and object detection, separate from prebuilt Azure AI Vision.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Custom Vision' },
            { id: 'l2', text: 'Prebuilt Azure AI Vision image analysis', why: 'Prebuilt Azure AI Vision is a separate service that tags general objects and scenes; it cannot recognize your specific branded SKUs without the custom training that the distinct Azure AI Custom Vision service provides.' },
            { id: 'l3', text: 'Azure AI Document Intelligence', why: 'Document Intelligence reads structured documents, not products on a shelf.' },
            { id: 'l4', text: 'Azure AI Language', why: 'Language works on text; this is an image-recognition task.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-9', cert: 'ai900', objective: '2.1', topic: 'Azure AI services',
    title: 'Detect and identify faces',
    estMinutes: 3,
    scenario: 'A building access system needs to <mark>detect faces in a camera feed and verify they match enrolled employees</mark>. Pick the best Azure AI service.',
    pair: 'Face vs Vision image analysis',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service.',
        explanation: 'The tell: detect faces and verify identity against enrolled people. The Azure AI Face service provides face detection and verification specifically.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Face' },
            { id: 'l2', text: 'Azure AI Vision image analysis', why: 'General image analysis can note that a face is present, but face verification against enrolled identities is the dedicated Face service.' },
            { id: 'l3', text: 'Azure AI Custom Vision', why: 'Custom Vision classifies images into your own categories; it is not designed for face detection or identity verification.' },
            { id: 'l4', text: 'Azure AI Document Intelligence', why: 'Document Intelligence reads documents, not faces in a camera feed.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-10', cert: 'ai900', objective: '2.2', topic: 'Azure AI services',
    title: 'Give a chatbot a spoken voice',
    estMinutes: 3,
    scenario: 'A kiosk assistant needs to <mark>speak its responses aloud in a natural voice</mark> from text the app already generated. Pick the best Azure AI capability.',
    pair: 'Text-to-speech vs Speech-to-text',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best capability.',
        explanation: 'The tell: text in, spoken audio out. Text-to-speech synthesis is an Azure AI Speech capability; speech-to-text is the reverse direction.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Text-to-speech (Azure AI Speech)' },
            { id: 'l2', text: 'Speech-to-text (Azure AI Speech)', why: 'Speech-to-text transcribes audio into text; here the app already has text and needs it spoken, which is the opposite direction.' },
            { id: 'l3', text: 'Azure AI Translator', why: 'Translator converts text between languages; it does not synthesize a voice.' },
            { id: 'l4', text: 'Azure AI Language', why: 'Language analyzes text content; it does not produce spoken audio.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-11', cert: 'ai900', objective: '2.1', topic: 'Azure AI services',
    title: 'Caption images for accessibility',
    estMinutes: 3,
    scenario: 'A news site wants to <mark>auto-generate a short descriptive caption of what is in each uploaded photo</mark> for alt text. Pick the best Azure AI service.',
    pair: 'Vision image analysis vs Custom Vision',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service.',
        explanation: 'The tell: a generic description/caption of arbitrary photo content. Prebuilt Azure AI Vision image analysis generates captions and tags out of the box.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Vision image analysis' },
            { id: 'l2', text: 'Azure AI Custom Vision', why: 'Custom Vision is for training your own narrow categories; generic captioning of any photo is a prebuilt Vision feature with no training needed.' },
            { id: 'l3', text: 'Azure AI Face', why: 'Face detects and verifies people; it does not caption general scene content.' },
            { id: 'l4', text: 'Azure AI Document Intelligence', why: 'Document Intelligence extracts fields from documents, not captions from photos.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-12', cert: 'ai900', objective: '2.3', topic: 'Azure AI services',
    title: 'Find named entities in legal text',
    estMinutes: 3,
    scenario: 'A team wants to <mark>extract people, organizations, dates, and locations from blocks of contract text</mark> already stored as text. Pick the best Azure AI capability.',
    pair: 'Language NER vs Document Intelligence',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best capability.',
        explanation: 'The tell: entity recognition over text that already exists. Named entity recognition is a prebuilt feature of Azure AI Language. Document Intelligence would be the pick only if you first had to read the entities off a scanned form.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Language named entity recognition' },
            { id: 'l2', text: 'Azure AI Document Intelligence', why: 'Document Intelligence is for pulling structured fields out of scanned forms/invoices; here the text is already extracted, so entity recognition is a Language task.' },
            { id: 'l3', text: 'Azure AI Translator', why: 'Translator converts languages; it does not tag entities.' },
            { id: 'l4', text: 'Azure AI Vision', why: 'Vision works on images; the input is already text.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-13', cert: 'ai900', objective: '2.1', topic: 'Azure AI services',
    title: 'Match the service to the input it consumes',
    estMinutes: 4,
    scenario: 'Match each Azure AI service to the primary kind of input it is designed to consume.',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each service with its primary input.',
        explanation: 'Azure AI Vision consumes images; Azure AI Speech consumes audio; Azure AI Language consumes text; Azure AI Document Intelligence consumes scanned forms and documents; Azure AI Translator consumes text to convert between languages.',
        payload: {
          left: [
            { id: 'vision', label: 'Azure AI Vision' },
            { id: 'speech', label: 'Azure AI Speech' },
            { id: 'language', label: 'Azure AI Language' },
            { id: 'docint', label: 'Azure AI Document Intelligence' },
            { id: 'translator', label: 'Azure AI Translator' }
          ],
          right: [
            { id: 'images', label: 'Images and video frames' },
            { id: 'audio', label: 'Spoken audio' },
            { id: 'text', label: 'Plain text for sentiment, entities, key phrases' },
            { id: 'forms', label: 'Scanned forms and invoices for structured fields' },
            { id: 'multilang', label: 'Text to convert between languages' }
          ]
        },
        answer: { pairs: { vision: 'images', speech: 'audio', language: 'text', docint: 'forms', translator: 'multilang' } } }
    ]
  },

  {
    id: 'ai900-dl-service-14', cert: 'ai900', objective: '2.2', topic: 'Azure AI services',
    title: 'Translate a spoken conversation live',
    estMinutes: 3,
    scenario: 'A conference app must <mark>take spoken speech in one language and produce translated text in another</mark> in near real time. Pick the best Azure AI service.',
    pair: 'Speech vs Translator',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service.',
        explanation: 'The tell: the source is spoken audio, not existing text. Speech translation is a capability of the Azure AI Speech service. The text Translator alone cannot ingest audio.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Speech (speech translation)' },
            { id: 'l2', text: 'Azure AI Translator', why: 'Translator converts text to text; it cannot ingest spoken audio, which is why the Speech service handles speech translation.' },
            { id: 'l3', text: 'Azure AI Language', why: 'Language analyzes existing text; it neither ingests audio nor translates.' },
            { id: 'l4', text: 'Azure AI Document Intelligence', why: 'Document Intelligence reads documents; this is a live-audio scenario.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-15', cert: 'ai900', objective: '2.1', topic: 'Azure AI services',
    title: 'Read handwriting from a paper form',
    estMinutes: 3,
    scenario: 'A clinic scans <mark>handwritten patient intake forms</mark> and wants the named fields (patient name, date, signature line) returned as structured data. Pick the best Azure AI service.',
    pair: 'AI Vision vs Document Intelligence',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service.',
        explanation: 'The tell: named fields from a form, including handwriting. Azure AI Document Intelligence reads handwriting and maps it to structured fields. Vision OCR could read the handwriting but would not return typed form fields.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Document Intelligence' },
            { id: 'l2', text: 'Azure AI Vision (OCR)', why: 'Vision OCR can read handwriting as loose text, but it does not return the form structure (which value is the patient name vs the date).' },
            { id: 'l3', text: 'Azure AI Language', why: 'Language processes text you already have; it cannot read a scanned form.' },
            { id: 'l4', text: 'Azure AI Face', why: 'Face detects and verifies people, not form fields.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-16', cert: 'ai900', objective: '2.3', topic: 'Azure AI services',
    title: 'Detect the language of incoming text',
    estMinutes: 3,
    scenario: 'A global helpdesk receives messages in mixed languages and must <mark>identify which language each message is written in</mark> before routing. Pick the best Azure AI capability.',
    pair: 'Language detection vs Translator',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best capability.',
        explanation: 'The tell: identify the language, not translate it. Language detection is a prebuilt feature of Azure AI Language.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Language (language detection)' },
            { id: 'l2', text: 'Azure AI Translator', why: 'Identifying a language without translating is the Language service language-detection feature; Translator detect step exists only to drive translation, which is not required here.' },
            { id: 'l3', text: 'Azure AI Speech', why: 'Speech handles audio; the input here is written text.' },
            { id: 'l4', text: 'Azure AI Vision', why: 'Vision interprets images, not the language of text.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-17', cert: 'ai900', objective: '2.1', topic: 'Azure AI services',
    title: 'One key for many AI services',
    estMinutes: 3,
    scenario: 'A developer wants to <mark>access vision, language, and speech capabilities through a single resource, endpoint, and key</mark> instead of provisioning each separately. Pick the best option.',
    pair: 'Azure AI services multi-service vs single-service',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best option.',
        explanation: 'The tell: one resource, one endpoint, one key, spanning multiple capabilities. A multi-service Azure AI services resource provides exactly that single billing and access point.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'A multi-service Azure AI services resource' },
            { id: 'l2', text: 'A separate single-service resource per capability', why: 'Single-service resources give you one key per service; the requirement is the opposite, a single shared key and endpoint across services.' },
            { id: 'l3', text: 'Azure Machine Learning workspace', why: 'Azure Machine Learning is for building and training custom models, not for fronting prebuilt vision/language/speech APIs under one key.' },
            { id: 'l4', text: 'Azure OpenAI resource', why: 'Azure OpenAI provides generative models; it does not bundle the vision, language, and speech APIs under one key.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-18', cert: 'ai900', objective: '2.1', topic: 'Azure AI services',
    title: 'Build a fully custom model on your data',
    estMinutes: 3,
    scenario: 'A data-science team wants to <mark>train, tune, and deploy their own regression model on proprietary tabular data</mark> with full control over the pipeline. Pick the best Azure offering.',
    pair: 'Azure Machine Learning vs prebuilt AI services',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best offering.',
        explanation: 'The tell: build and train your own model end to end on your own data. Azure Machine Learning is the platform for custom model training and deployment; prebuilt AI services are not trained from scratch by you.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Machine Learning' },
            { id: 'l2', text: 'Azure AI Language', why: 'Azure AI Language offers prebuilt and lightly-customizable text features; it is not a general platform for training an arbitrary regression model on tabular data.' },
            { id: 'l3', text: 'Azure AI Vision', why: 'Vision provides prebuilt image capabilities; it does not train custom tabular regression models.' },
            { id: 'l4', text: 'Azure OpenAI', why: 'Azure OpenAI serves large generative models; it is not the tool for training a custom regression model on your tabular data.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-19', cert: 'ai900', objective: '2.1', topic: 'Azure AI services',
    title: 'No-code custom training for non-experts',
    estMinutes: 3,
    scenario: 'A business analyst with <mark>no data-science background</mark> wants to train an image classifier by uploading and tagging photos in a visual portal, with no code. Pick the best Azure offering.',
    pair: 'Custom Vision vs Azure Machine Learning',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best offering.',
        explanation: 'The tell: custom image training with no code and no data-science skills. Azure AI Custom Vision provides a point-and-click portal for exactly this; full Azure Machine Learning assumes more expertise.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Custom Vision' },
            { id: 'l2', text: 'Azure Machine Learning', why: 'Azure Machine Learning gives full control but expects data-science skills; the constraint here is no-code training by a non-expert, which Custom Vision targets.' },
            { id: 'l3', text: 'Prebuilt Azure AI Vision', why: 'The prebuilt service cannot learn the analyst-specific categories; it only recognizes general objects.' },
            { id: 'l4', text: 'Azure OpenAI', why: 'Azure OpenAI is for generative language/vision tasks, not training a custom image classifier on tagged photos.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-service-20', cert: 'ai900', objective: '2.3', topic: 'Azure AI services',
    title: 'Summarize long support tickets',
    estMinutes: 3,
    scenario: 'A team wants to <mark>produce short abstractive summaries of long support-ticket threads</mark> to speed triage, using a prebuilt feature where possible. Pick the best Azure AI capability.',
    pair: 'Language summarization vs OpenAI',
    family: 'Azure AI services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best capability.',
        explanation: 'The tell: summarization of text as a prebuilt feature. Azure AI Language includes a built-in summarization capability for documents and conversations.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Language summarization' },
            { id: 'l2', text: 'Azure OpenAI', why: 'Azure OpenAI can summarize via prompting, but the requirement favors a prebuilt feature, and summarization is built into Azure AI Language.' },
            { id: 'l3', text: 'Azure AI Translator', why: 'Translator converts languages; it does not summarize.' },
            { id: 'l4', text: 'Azure AI Document Intelligence', why: 'Document Intelligence extracts structured fields; it is not a text-summarization service.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  // ========================================================================
  // ===== ML fundamentals vocab (~25%, ~12) ================================
  // ========================================================================
  {
    id: 'ai900-dl-ml-1', cert: 'ai900', objective: '3.1', topic: 'ML problem types',
    title: 'Predict a continuous house price',
    estMinutes: 3,
    scenario: 'A model must <mark>predict the dollar sale price of a house</mark> from features like size and location. The output is a continuous number. Pick the machine-learning problem type.',
    pair: 'Regression vs Classification',
    family: 'ML problem types',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the ML problem type.',
        explanation: 'The tell: the prediction is a continuous numeric value. Predicting a number is regression; predicting a category would be classification.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Regression' },
            { id: 'l2', text: 'Classification', why: 'Classification predicts a discrete category or label; a continuous dollar amount is a numeric prediction, which is regression.' },
            { id: 'l3', text: 'Clustering', why: 'Clustering groups unlabeled data by similarity; here there is a known target value to predict.' },
            { id: 'l4', text: 'Anomaly detection', why: 'Anomaly detection flags outliers; the goal is to predict a price, not to find unusual records.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-ml-2', cert: 'ai900', objective: '3.1', topic: 'ML problem types',
    title: 'Predict churn: yes or no',
    estMinutes: 3,
    scenario: 'A telecom wants to predict whether each customer <mark>will churn (yes) or stay (no)</mark> next month. The output is one of two labels. Pick the machine-learning problem type.',
    pair: 'Regression vs Classification',
    family: 'ML problem types',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the ML problem type.',
        explanation: 'The tell: the output is a discrete label (churn vs stay). Predicting a category is classification; a continuous number would be regression.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Classification' },
            { id: 'l2', text: 'Regression', why: 'Regression predicts a continuous number; here the output is one of two discrete classes, which is classification.' },
            { id: 'l3', text: 'Clustering', why: 'Clustering groups unlabeled data; this task has known yes/no labels to learn from.' },
            { id: 'l4', text: 'Anomaly detection', why: 'Anomaly detection flags outliers, not whether a labeled customer will churn.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-ml-3', cert: 'ai900', objective: '3.1', topic: 'ML problem types',
    title: 'Group customers with no labels',
    estMinutes: 3,
    scenario: 'A marketing team has customer data with <mark>no predefined groups and no labels</mark>, and wants the algorithm to discover natural segments by similarity. Pick the machine-learning problem type.',
    pair: 'Clustering vs Classification',
    family: 'ML problem types',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the ML problem type.',
        explanation: 'The tell: no labels and the goal is to discover groupings by similarity. Unsupervised grouping of unlabeled data is clustering.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Clustering' },
            { id: 'l2', text: 'Classification', why: 'Classification needs predefined labeled categories to learn from; this data has no labels, so the model must discover groups itself, which is clustering.' },
            { id: 'l3', text: 'Regression', why: 'Regression predicts a continuous number; there is no numeric target here.' },
            { id: 'l4', text: 'Anomaly detection', why: 'Anomaly detection finds outliers; the goal is to segment the whole population into groups.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-ml-4', cert: 'ai900', objective: '3.1', topic: 'ML vocabulary',
    title: 'Features vs labels',
    estMinutes: 3,
    scenario: 'In a dataset for predicting house price, columns include square footage, bedrooms, and the known sale price used for training. The <mark>known sale price the model learns to predict</mark> is which element?',
    pair: 'Features vs Labels',
    family: 'ML vocabulary',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the correct term.',
        explanation: 'The tell: the value the model is trained to predict. The known target column is the label; the input columns (square footage, bedrooms) are the features.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'The label' },
            { id: 'l2', text: 'A feature', why: 'Features are the input columns used to make a prediction (square footage, bedrooms); the value being predicted is the label.' },
            { id: 'l3', text: 'A hyperparameter', why: 'A hyperparameter is a training setting you choose (like learning rate), not a column of data.' },
            { id: 'l4', text: 'A validation split', why: 'A validation split is a portion of data held out to tune the model, not the target column.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-ml-5', cert: 'ai900', objective: '3.1', topic: 'ML vocabulary',
    title: 'Match the ML term to its meaning',
    estMinutes: 4,
    scenario: 'Match each machine-learning term to its correct meaning.',
    pair: 'Features vs Labels',
    family: 'ML vocabulary',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each term with its meaning.',
        explanation: 'Features are the input variables; the label is the value being predicted; the training set is data used to fit the model; the validation set tunes the model and choices; the test set gives a final unbiased performance estimate on unseen data.',
        payload: {
          left: [
            { id: 'feature', label: 'Feature' },
            { id: 'label', label: 'Label' },
            { id: 'train', label: 'Training set' },
            { id: 'val', label: 'Validation set' },
            { id: 'test', label: 'Test set' }
          ],
          right: [
            { id: 'dinput', label: 'An input variable used to make a prediction' },
            { id: 'dtarget', label: 'The value the model is trained to predict' },
            { id: 'dfit', label: 'Data the model learns its parameters from' },
            { id: 'dtune', label: 'Held-out data used to tune the model during training' },
            { id: 'dfinal', label: 'Unseen data for a final, unbiased performance estimate' }
          ]
        },
        answer: { pairs: { feature: 'dinput', label: 'dtarget', train: 'dfit', val: 'dtune', test: 'dfinal' } } }
    ]
  },

  {
    id: 'ai900-dl-ml-6', cert: 'ai900', objective: '3.2', topic: 'ML lifecycle',
    title: 'Order the supervised ML lifecycle',
    estMinutes: 4,
    scenario: 'Put the typical supervised machine-learning lifecycle steps in order, first step at the top.',
    family: 'ML lifecycle',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the ML lifecycle steps in order.',
        explanation: 'You first prepare and clean the data, then split it into training and test sets, then train the model on the training data, then evaluate it against the test set, and finally deploy the model once performance is acceptable.',
        payload: { items: [
          { id: 'prep', label: 'Prepare and clean the data' },
          { id: 'split', label: 'Split data into training and test sets' },
          { id: 'train', label: 'Train the model on the training data' },
          { id: 'eval', label: 'Evaluate the model on the test set' },
          { id: 'deploy', label: 'Deploy the model' }
        ] },
        answer: { correctOrder: ['prep', 'split', 'train', 'eval', 'deploy'] } }
    ]
  },

  {
    id: 'ai900-dl-ml-7', cert: 'ai900', objective: '3.1', topic: 'ML problem types',
    title: 'Match scenario to ML problem type',
    estMinutes: 4,
    scenario: 'Match each prediction scenario to the machine-learning problem type it represents.',
    pair: 'Regression vs Classification',
    family: 'ML problem types',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each scenario with its problem type.',
        explanation: 'Predicting a continuous number is regression; predicting a discrete category is classification; grouping unlabeled records by similarity is clustering; flagging records that deviate from the norm is anomaly detection.',
        payload: {
          left: [
            { id: 'temp', label: 'Predict tomorrow temperature in degrees' },
            { id: 'spam', label: 'Label an email as spam or not spam' },
            { id: 'segment', label: 'Group shoppers into unlabeled segments by behavior' },
            { id: 'fraud', label: 'Flag a transaction that is wildly unlike the norm' }
          ],
          right: [
            { id: 'regression', label: 'Regression' },
            { id: 'classification', label: 'Classification' },
            { id: 'clustering', label: 'Clustering' },
            { id: 'anomaly', label: 'Anomaly detection' }
          ]
        },
        answer: { pairs: { temp: 'regression', spam: 'classification', segment: 'clustering', fraud: 'anomaly' } } }
    ]
  },

  {
    id: 'ai900-dl-ml-8', cert: 'ai900', objective: '3.1', topic: 'ML vocabulary',
    title: 'What is the training set for?',
    estMinutes: 3,
    scenario: 'During model building, one portion of the labeled data is used so the algorithm can <mark>learn its parameters from examples</mark>. Pick the name of this portion.',
    pair: 'Training set vs Test set',
    family: 'ML vocabulary',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the correct term.',
        explanation: 'The tell: the data the algorithm learns from. That is the training set; the test set is reserved to measure performance on unseen data.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Training set' },
            { id: 'l2', text: 'Test set', why: 'The test set is held back and used only to measure final performance on unseen data; the model does not learn its parameters from it.' },
            { id: 'l3', text: 'Feature set', why: 'Feature set refers to the input columns, not the portion of rows used to fit the model.' },
            { id: 'l4', text: 'Label set', why: 'Labels are the target values; this question is about the data partition the model learns from, which is the training set.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-ml-9', cert: 'ai900', objective: '3.1', topic: 'ML problem types',
    title: 'Forecast next month sales volume',
    estMinutes: 3,
    scenario: 'A retailer wants to <mark>predict the number of units it will sell next month</mark> from past sales and seasonality. The output is a number. Pick the machine-learning problem type.',
    pair: 'Regression vs Classification',
    family: 'ML problem types',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the ML problem type.',
        explanation: 'The tell: predicting a continuous numeric quantity (unit count). That is regression, even when framed as forecasting.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Regression' },
            { id: 'l2', text: 'Classification', why: 'Classification outputs a category; a unit count is a continuous numeric prediction, which is regression.' },
            { id: 'l3', text: 'Clustering', why: 'Clustering groups unlabeled data; here there is a numeric target to predict.' },
            { id: 'l4', text: 'Anomaly detection', why: 'Anomaly detection flags outliers, not a forecasted quantity.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-ml-10', cert: 'ai900', objective: '3.1', topic: 'ML vocabulary',
    title: 'Why hold out a test set?',
    estMinutes: 3,
    scenario: 'A team trains a model and wants an honest estimate of how it will perform on <mark>data it has never seen</mark>. Which dataset gives that final unbiased estimate?',
    pair: 'Test set vs Validation set',
    family: 'ML vocabulary',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the correct term.',
        explanation: 'The tell: an unbiased estimate on unseen data after training is done. That role belongs to the test set; the validation set is used during training to tune choices.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Test set' },
            { id: 'l2', text: 'Validation set', why: 'The validation set is used during training to tune the model and compare options, so it influences choices and is not a clean final estimate; the test set is held for the final measure.' },
            { id: 'l3', text: 'Training set', why: 'The training set is what the model learns from, so measuring on it overstates performance.' },
            { id: 'l4', text: 'Feature set', why: 'Feature set refers to the input columns, not a data partition for evaluation.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-ml-11', cert: 'ai900', objective: '3.1', topic: 'ML problem types',
    title: 'Supervised or unsupervised?',
    estMinutes: 3,
    scenario: 'A team has a dataset where <mark>every record already has a correct labeled outcome</mark>, and they want to learn to predict that outcome on new records. Pick the learning category.',
    pair: 'Supervised vs Unsupervised',
    family: 'ML problem types',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the learning category.',
        explanation: 'The tell: labeled outcomes are available to learn from. Learning from labeled data is supervised learning; clustering with no labels is unsupervised.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Supervised learning' },
            { id: 'l2', text: 'Unsupervised learning', why: 'Unsupervised learning works on unlabeled data to find structure; here every record already has a known labeled outcome.' },
            { id: 'l3', text: 'Reinforcement learning', why: 'Reinforcement learning trains an agent through reward signals from actions; there is no agent or reward loop described here.' },
            { id: 'l4', text: 'Semi-supervised learning', why: 'Semi-supervised learning mixes a small amount of labeled data with a large pool of unlabeled data; here every record already has a correct label, so it is fully supervised.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-ml-12', cert: 'ai900', objective: '3.2', topic: 'ML evaluation',
    title: 'Read a model evaluation metric',
    estMinutes: 3,
    scenario: 'A classification model is evaluated and the team wants a single metric for <mark>the proportion of all predictions that were correct</mark>. Pick the metric.',
    pair: 'Accuracy vs Recall',
    family: 'ML evaluation',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the metric.',
        explanation: 'The tell: proportion of total predictions that were correct. That is accuracy; recall instead measures how many actual positives were found.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Accuracy' },
            { id: 'l2', text: 'Recall', why: 'Recall measures the share of actual positive cases the model correctly identified, not the overall fraction of correct predictions.' },
            { id: 'l3', text: 'Precision', why: 'Precision measures how many of the predicted positives were truly positive, not overall correctness.' },
            { id: 'l4', text: 'Mean squared error', why: 'Mean squared error is a regression metric for numeric error; this is a classification accuracy question.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  // ========================================================================
  // ===== Generative AI (~15%, ~8) =========================================
  // ========================================================================
  {
    id: 'ai900-dl-genai-1', cert: 'ai900', objective: '4.1', topic: 'Generative AI',
    title: 'Generate marketing copy from a prompt',
    estMinutes: 3,
    scenario: 'A team wants to <mark>generate original marketing copy and product descriptions from natural-language prompts</mark> using a large language model on Azure. Pick the best Azure service.',
    pair: 'Azure OpenAI vs Language',
    family: 'Generative AI',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service.',
        explanation: 'The tell: generate new content from prompts with a large language model. Azure OpenAI provides access to GPT-family generative models for exactly this.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure OpenAI' },
            { id: 'l2', text: 'Azure AI Language', why: 'Azure AI Language analyzes existing text (sentiment, entities, summarization); generating new long-form copy from a prompt is a generative LLM task in Azure OpenAI.' },
            { id: 'l3', text: 'Azure AI Translator', why: 'Translator converts existing text between languages; it does not author new content.' },
            { id: 'l4', text: 'Azure AI Document Intelligence', why: 'Document Intelligence extracts fields from documents; it does not generate marketing copy.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-genai-2', cert: 'ai900', objective: '4.1', topic: 'Generative AI',
    title: 'What is a prompt?',
    estMinutes: 3,
    scenario: 'In a generative AI app, a user types instructions and context that <mark>tell the model what to produce</mark>. Pick the term for that input.',
    pair: 'Prompt vs Completion',
    family: 'Generative AI',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the correct term.',
        explanation: 'The tell: the instructions/input you give the model. That is the prompt; the model output produced in response is the completion.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Prompt' },
            { id: 'l2', text: 'Completion', why: 'The completion is the text the model generates in response; the input instructions you provide are the prompt.' },
            { id: 'l3', text: 'Token', why: 'A token is a chunk of text the model processes; it is a unit of text, not the user instruction as a whole.' },
            { id: 'l4', text: 'Label', why: 'A label is the target value in supervised learning, unrelated to the input given to a generative model.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-genai-3', cert: 'ai900', objective: '4.1', topic: 'Generative AI',
    title: 'Generate an image from text',
    estMinutes: 3,
    scenario: 'A designer wants to <mark>create a brand-new image from a text description</mark> such as "a watercolor fox in a forest." Pick the best Azure capability.',
    pair: 'Azure OpenAI image generation vs Vision',
    family: 'Generative AI',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best capability.',
        explanation: 'The tell: create a new image from a text prompt. Image generation (DALL-E family) in Azure OpenAI produces images from text; Azure AI Vision only analyzes existing images.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure OpenAI image generation' },
            { id: 'l2', text: 'Azure AI Vision', why: 'Azure AI Vision interprets and describes existing images; it does not create new images from a text prompt.' },
            { id: 'l3', text: 'Azure AI Custom Vision', why: 'Custom Vision classifies images into your own categories; it does not generate images.' },
            { id: 'l4', text: 'Azure AI Document Intelligence', why: 'Document Intelligence reads documents; it has nothing to do with image generation.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-genai-4', cert: 'ai900', objective: '4.2', topic: 'Generative AI',
    title: 'Ground the model on your own documents',
    estMinutes: 3,
    scenario: 'A company wants its chatbot to <mark>answer using its own internal documents</mark> so responses are grounded in company data rather than only the model general knowledge. Pick the best approach.',
    pair: 'Retrieval augmentation vs Fine-tuning',
    family: 'Generative AI',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best approach.',
        explanation: 'The tell: ground answers in your own documents at query time. Retrieving relevant company documents and adding them to the prompt (the Azure OpenAI on your data / RAG pattern) injects current, source-grounded facts the way fine-tuning cannot.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Ground the model on your documents (retrieval augmentation)' },
            { id: 'l2', text: 'Fine-tune the model on the documents', why: 'Fine-tuning adjusts the model weights to shift its style, tone, and format, but it does not reliably inject current factual content; retrieval augmentation supplies the actual source documents at query time, which is what grounding needs.' },
            { id: 'l3', text: 'Use the model with no extra context', why: 'Without supplying company documents, the model can only answer from its general training data, which is exactly what the requirement rules out.' },
            { id: 'l4', text: 'Switch to a rule-based keyword search', why: 'Keyword search returns documents but does not produce a grounded natural-language answer the way retrieval-augmented generation does.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-genai-5', cert: 'ai900', objective: '4.1', topic: 'Generative AI',
    title: 'What does a large language model do?',
    estMinutes: 3,
    scenario: 'You must describe the core behavior of a large language model to a stakeholder. Pick the statement that <mark>best captures what an LLM fundamentally does</mark>.',
    pair: 'LLM vs Classifier',
    family: 'Generative AI',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best statement.',
        explanation: 'The tell: the fundamental behavior is generating language by predicting likely next tokens from context. That generative, next-token prediction framing is what an LLM does.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Generates natural-language text by predicting likely next tokens from the prompt context' },
            { id: 'l2', text: 'Sorts records into a fixed set of predefined labels', why: 'That describes a classification model; an LLM generates text rather than only assigning records to fixed categories.' },
            { id: 'l3', text: 'Groups unlabeled data points by similarity', why: 'That is clustering; an LLM is a generative language model, not an unsupervised grouping algorithm.' },
            { id: 'l4', text: 'Flags data points that deviate from a normal pattern', why: 'That is anomaly detection; it is unrelated to generating language.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-genai-6', cert: 'ai900', objective: '4.2', topic: 'Generative AI',
    title: 'Reduce harmful generated output',
    estMinutes: 3,
    scenario: 'A team deploying a generative chatbot wants to <mark>filter hateful, violent, and sexual content from both prompts and responses</mark>. Pick the best Azure capability.',
    pair: 'Content safety vs Document Intelligence',
    family: 'Generative AI',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best capability.',
        explanation: 'The tell: detect and filter harmful categories in prompts and completions. Azure AI Content Safety is purpose-built to moderate text and images across harm categories.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure AI Content Safety' },
            { id: 'l2', text: 'Azure AI Document Intelligence', why: 'Document Intelligence extracts structured fields from forms; it does not moderate harmful content.' },
            { id: 'l3', text: 'Azure AI Translator', why: 'Translator converts languages; it does not detect or filter harmful content.' },
            { id: 'l4', text: 'Azure AI Custom Vision', why: 'Custom Vision classifies images into your own categories; it is not a content-moderation service for generative output.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-genai-7', cert: 'ai900', objective: '4.1', topic: 'Generative AI',
    title: 'Why might an LLM be wrong?',
    estMinutes: 3,
    scenario: 'A stakeholder asks why a chatbot sometimes states a confident but <mark>factually false answer that sounds plausible</mark>. Pick the term that names this behavior.',
    pair: 'Hallucination vs Overfitting',
    family: 'Generative AI',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the correct term.',
        explanation: 'The tell: a confident but fabricated, plausible-sounding answer from a generative model. That is a hallucination.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Hallucination' },
            { id: 'l2', text: 'Overfitting', why: 'Overfitting is when a model memorizes training data and generalizes poorly; it describes a training problem, not a confidently fabricated generated answer.' },
            { id: 'l3', text: 'Underfitting', why: 'Underfitting is when a model is too simple to capture patterns; it does not describe fabricated but plausible output.' },
            { id: 'l4', text: 'Clustering', why: 'Clustering is an unsupervised grouping task, unrelated to a model generating false statements.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'ai900-dl-genai-8', cert: 'ai900', objective: '4.1', topic: 'Generative AI',
    title: 'Match the generative AI term',
    estMinutes: 4,
    scenario: 'Match each generative AI term to its meaning.',
    family: 'Generative AI',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each term with its meaning.',
        explanation: 'A prompt is the input instructions given to the model; a completion is the generated output; a token is a chunk of text the model processes; a large language model generates language from learned patterns; grounding supplies external data so answers reflect a specific source.',
        payload: {
          left: [
            { id: 'prompt', label: 'Prompt' },
            { id: 'completion', label: 'Completion' },
            { id: 'token', label: 'Token' },
            { id: 'llm', label: 'Large language model' },
            { id: 'grounding', label: 'Grounding' }
          ],
          right: [
            { id: 'dinput', label: 'The input instructions and context given to the model' },
            { id: 'doutput', label: 'The text the model generates in response' },
            { id: 'dchunk', label: 'A chunk of text the model processes as a unit' },
            { id: 'dgen', label: 'A model that generates language from learned patterns' },
            { id: 'dground', label: 'Supplying external data so answers reflect a specific source' }
          ]
        },
        answer: { pairs: { prompt: 'dinput', completion: 'doutput', token: 'dchunk', llm: 'dgen', grounding: 'dground' } } }
    ]
  }
];

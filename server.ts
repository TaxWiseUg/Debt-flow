import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Autonomous Function Declarations for NexTone Operations
const addToCatalogDeclaration: FunctionDeclaration = {
  name: 'add_to_catalog',
  description: 'Autonomously adds a new printing or branding product/service to the NexTone catalog with selling price and production cost.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Product or service name' },
      sku: { type: Type.STRING, description: 'Optional unique SKU or item code' },
      category: { type: Type.STRING, description: 'Category e.g. Banners & Signage, Apparels & Merchandise, Paper Printing, Large Format' },
      unit: { type: Type.STRING, description: 'Unit of measure e.g. pcs, box, pack, sqm, sheet, roll' },
      unitPrice: { type: Type.NUMBER, description: 'Selling price per unit in UGX' },
      costPrice: { type: Type.NUMBER, description: 'Raw material and production cost per unit in UGX' },
      description: { type: Type.STRING, description: 'Item specifications, paper weight, or print finishes' },
    },
    required: ['name', 'unitPrice'],
  },
};

const createOrderDeclaration: FunctionDeclaration = {
  name: 'create_order',
  description: 'Autonomously drafts or creates a new client job order in the NexTone production tracking system.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerId: { type: Type.STRING, description: 'ID of existing customer, or empty if new client' },
      customerName: { type: Type.STRING, description: 'Name of the client' },
      items: {
        type: Type.ARRAY,
        description: 'List of order specifications and quantities',
        items: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: 'Name or specification description' },
            quantity: { type: Type.NUMBER, description: 'Quantity required' },
            unit: { type: Type.STRING, description: 'Unit e.g. pcs' },
            unitPrice: { type: Type.NUMBER, description: 'Unit selling price in UGX' },
            costPrice: { type: Type.NUMBER, description: 'Production cost per unit in UGX' },
          },
          required: ['productName', 'quantity', 'unitPrice'],
        },
      },
      deliveryDate: { type: Type.STRING, description: 'Target delivery or completion date (YYYY-MM-DD)' },
      discountPercent: { type: Type.NUMBER, description: 'Discount percentage approved (0-100)' },
      notes: { type: Type.STRING, description: 'Special printing instructions or delivery notes' },
    },
    required: ['customerName', 'items'],
  },
};

const issueInvoiceDeclaration: FunctionDeclaration = {
  name: 'issue_invoice',
  description: 'Autonomously issues a formal billing invoice with payment terms and records customer debt.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerId: { type: Type.STRING, description: 'ID of the client' },
      customerName: { type: Type.STRING, description: 'Client name' },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: 'Item name' },
            quantity: { type: Type.NUMBER, description: 'Quantity' },
            unit: { type: Type.STRING, description: 'Unit e.g. pcs' },
            unitPrice: { type: Type.NUMBER, description: 'Rate in UGX' },
            costPrice: { type: Type.NUMBER, description: 'Cost price per unit' },
          },
          required: ['productName', 'quantity', 'unitPrice'],
        },
      },
      dueDate: { type: Type.STRING, description: 'Due date (YYYY-MM-DD)' },
      discountPercent: { type: Type.NUMBER, description: 'Discount percentage' },
      taxPercent: { type: Type.NUMBER, description: 'Tax percentage e.g. 18 for VAT or 0' },
      notes: { type: Type.STRING, description: 'Invoice payment terms and bank/MoMo details' },
    },
    required: ['customerName', 'items'],
  },
};

const evaluateDiscountDeclaration: FunctionDeclaration = {
  name: 'evaluate_discount_and_profit',
  description: 'Analyzes margins and customer debt history to formally approve, reject, or adjust a discount request.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerId: { type: Type.STRING, description: 'Client ID' },
      customerName: { type: Type.STRING, description: 'Client name' },
      orderValue: { type: Type.NUMBER, description: 'Gross order value before discount in UGX' },
      requestedDiscountPercent: { type: Type.NUMBER, description: 'Discount requested by client' },
      estimatedCost: { type: Type.NUMBER, description: 'Estimated production/material cost in UGX' },
      approvedDiscountPercent: { type: Type.NUMBER, description: 'Agent approved discount percent (or 0 if rejected)' },
      projectedProfitUGX: { type: Type.NUMBER, description: 'Net profit in UGX after discount' },
      projectedMarginPercent: { type: Type.NUMBER, description: 'Net profit margin percentage' },
      decisionRationale: { type: Type.STRING, description: 'Business justification for granting or declining discount' },
    },
    required: ['orderValue', 'approvedDiscountPercent', 'decisionRationale'],
  },
};

const agentTools = [
  {
    functionDeclarations: [
      addToCatalogDeclaration,
      createOrderDeclaration,
      issueInvoiceDeclaration,
      evaluateDiscountDeclaration,
    ],
  },
];

// Agent Chat API Route
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message, conversation, activeContext } = req.body;

    if (!message && (!conversation || conversation.length === 0)) {
      return res.status(400).json({ error: 'Message or conversation required' });
    }

    const {
      products = [],
      customers = [],
      invoices = [],
      orders = [],
      payments = [],
      profitSummary = {},
      businessProfile = {},
    } = activeContext || {};

    const userPrompt = (
      message || (conversation && conversation.length > 0 ? conversation[conversation.length - 1].content : '')
    ).trim();

    // Fast-path for simple greetings to provide instant sub-second response
    const isSimpleGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|yo|greetings)[!.]?$/i.test(userPrompt);

    // Build rich system instruction with real-time business facts
    const systemInstruction = `You are the executive Autonomous AI Operations & Decision-Making Agent for "NexTone" (Printing, Branding & Custom Media Solutions).
Strict Brand Rule: The brand name is strictly "NexTone" (capital N and T, never NextOne or next one). Keep conversational greetings concise and prompt.

You possess FULL ACCESS and deep real-time awareness of the entire business system:
- Business: ${businessProfile.name || 'NexTone'} · Products in catalog: ${products.length} · Customers: ${customers.length} · Invoices: ${invoices.length}
- Realized Cash Profit: UGX ${(profitSummary.realizedCashProfit || 0).toLocaleString()} (${profitSummary.realizedMarginPercent || 0}% margin)
- Total Cash Collected: UGX ${(profitSummary.totalCashCollected || 0).toLocaleString()} | Unpaid Customer Debt: UGX ${(profitSummary.lockedProfitInReceivables || 0).toLocaleString()}

Catalog overview:
${products.slice(0, 20).map((p: any) => `- ${p.name} (SKU: ${p.sku}, Cat: ${p.category}): Selling Price = UGX ${p.unitPrice?.toLocaleString()} / ${p.unit || 'pcs'} | Cost = UGX ${(p.costPrice || 0)?.toLocaleString()}`).join('\n') || 'Catalog empty'}

Recent Invoices:
${invoices.slice(0, 10).map((i: any) => `- ${i.invoiceNumber}: ${i.customerName} | Billed = UGX ${i.totalAmount?.toLocaleString()} | Paid = UGX ${i.paidAmount?.toLocaleString()} | Due = UGX ${i.balanceDue?.toLocaleString()}`).join('\n') || 'No invoices yet'}

OPERATIONS RULES:
1. Autonomously execute tools when asked:
   - "add_to_catalog" to add products with costPrice & unitPrice
   - "create_order" to draft client orders
   - "issue_invoice" to issue billing invoices
   - "evaluate_discount_and_profit" to evaluate discount requests against the 20% margin floor and debt history
2. When greeting or answering basic queries, respond directly and concisely.`;

    // Format chat history, filtering out synthetic initial greetings so history starts with a user turn
    const rawHistory = (conversation || [])
      .slice(0, -1)
      .filter((msg: any) => msg.role === 'user' || (msg.role === 'assistant' && msg.id !== 'welcome_1'));

    // Ensure valid turn alternation starting with 'user'
    const validHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    let expectedRole: 'user' | 'model' = 'user';

    for (const msg of rawHistory) {
      const currentRole = msg.role === 'assistant' ? 'model' : 'user';
      if (currentRole === expectedRole) {
        validHistory.push({
          role: currentRole,
          parts: [{ text: msg.content }],
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    }

    // Call Gemini with gemini-3.1-flash-lite for ultra-fast response (<1s) and timeout protection
    let result: any = null;
    let timedOut = false;

    try {
      const chat = ai.chats.create({
        model: 'gemini-3.1-flash-lite',
        config: {
          systemInstruction,
          tools: agentTools,
        },
        history: validHistory,
      });

      const callPromise = chat.sendMessage({ message: userPrompt });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          timedOut = true;
          reject(new Error('AI response timeout'));
        }, 7500)
      );

      result = await Promise.race([callPromise, timeoutPromise]);
    } catch (apiErr: any) {
      console.warn('Gemini API call warn/timeout:', apiErr?.message);
      // If simple greeting and API had a transient timeout/503 spike, answer instantly
      if (isSimpleGreeting) {
        return res.json({
          text: `Hello! I am your **NexTone Copilot**. I'm actively tracking your catalog (${products.length} items), ${customers.length} clients, and **UGX ${(profitSummary.realizedCashProfit || 0).toLocaleString()}** in realized cash profit.\n\nHow can I assist your operations right now?`,
          actions: [],
        });
      }
      throw apiErr;
    }

    // Extract tool calls / actions
    const candidate = result?.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall) || [];

    const actions = functionCalls.map((fc: any) => {
      const call = fc.functionCall;
      return {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: call.name,
        status: 'pending',
        title: call.name === 'add_to_catalog'
          ? `Add "${call.args.name}" to Catalog`
          : call.name === 'create_order'
          ? `Create Order for ${call.args.customerName || 'Client'}`
          : call.name === 'issue_invoice'
          ? `Issue Invoice for ${call.args.customerName || 'Client'}`
          : `Evaluate Discount for ${call.args.customerName || 'Job'}`,
        payload: call.args,
      };
    });

    // Extract response text
    let responseText = result?.text || '';
    if (!responseText && actions.length > 0) {
      if (actions[0].type === 'add_to_catalog') {
        responseText = `I have added **${actions[0].payload.name}** to the NexTone catalog at UGX ${actions[0].payload.unitPrice?.toLocaleString()} with a production cost basis of UGX ${(actions[0].payload.costPrice || 0)?.toLocaleString()}.`;
      } else if (actions[0].type === 'create_order') {
        responseText = `I have drafted the order for **${actions[0].payload.customerName}** with ${actions[0].payload.items?.length || 0} items. You can review the details below.`;
      } else if (actions[0].type === 'issue_invoice') {
        responseText = `I have prepared the invoice for **${actions[0].payload.customerName}**.`;
      } else if (actions[0].type === 'evaluate_discount_and_profit') {
        const p = actions[0].payload;
        responseText = `### Margin & Discount Analysis\n- **Order Value**: UGX ${p.orderValue?.toLocaleString()}\n- **Approved Discount**: ${p.approvedDiscountPercent}%\n- **Projected Net Profit**: UGX ${p.projectedProfitUGX?.toLocaleString()} (${p.projectedMarginPercent}% Margin)\n\n**Decision**: ${p.decisionRationale}`;
      }
    } else if (!responseText && isSimpleGreeting) {
      responseText = `Hello! How can I assist you with NexTone today?`;
    }

    return res.json({
      text: responseText,
      actions,
    });
  } catch (error: any) {
    console.error('Gemini Agent Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process agent request',
    });
  }
});

// Dev / Prod Vite server integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`NexTone server running on http://0.0.0.0:${port}`);
  });
}

startServer();
